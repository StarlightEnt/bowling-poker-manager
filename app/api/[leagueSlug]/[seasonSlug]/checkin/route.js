import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getProgressiveBalance, getCharityBalance } from '@/lib/finance';

export const dynamic = 'force-dynamic';

async function detectWeek(seasonId) {
  const today = new Date().toISOString().split('T')[0];

  const [todayRow] = await sql`
    SELECT week_number FROM schedule
    WHERE season_id = ${seasonId}
      AND bowl_date::TEXT = ${today}
  `;
  if (todayRow) return todayRow.week_number;

  const [recentRow] = await sql`
    SELECT s.week_number FROM schedule s
    WHERE s.season_id = ${seasonId}
      AND s.bowl_date::TEXT <= ${today}
      AND (
        EXISTS (
          SELECT 1 FROM checkins c
          WHERE c.season_id = s.season_id
            AND c.week_number = s.week_number
        )
        OR EXISTS (
          SELECT 1 FROM game_results g
          WHERE g.season_id = s.season_id
            AND g.week_number = s.week_number
        )
      )
    ORDER BY s.bowl_date DESC LIMIT 1
  `;
  if (recentRow) return recentRow.week_number;

  const [upcomingRow] = await sql`
    SELECT week_number FROM schedule
    WHERE season_id = ${seasonId}
      AND bowl_date::TEXT >= ${today}

    ORDER BY bowl_date ASC LIMIT 1
  `;
  return upcomingRow?.week_number || null;
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const { searchParams } = url;
    const weekNumber = searchParams.get('week');
    const parts = url.pathname.split('/').filter(Boolean);
    const leagueSlug = parts[1];
    const seasonSlug = parts[2];

    const [season] = await sql`
      SELECT s.id, s.league_id FROM seasons s
      JOIN leagues l ON l.id = s.league_id
      WHERE l.slug = ${leagueSlug} AND s.slug = ${seasonSlug}
      LIMIT 1
    `;
    if (!season) return NextResponse.json({ error: 'Season not found' }, { status: 404 });

    const settings = await sql`SELECT key, value FROM settings WHERE league_id = ${season.league_id}`;
    const cfg = Object.fromEntries(settings.map(s => [s.key, parseFloat(s.value)]));
    const buyinAmount = cfg.buyin_amount || 5;
    const progressiveNightly = cfg.progressive_nightly || 3;

    const week = weekNumber ? parseInt(weekNumber) : await detectWeek(season.id);
    if (!week) return NextResponse.json({ error: 'Could not determine current week' }, { status: 404 });

    const [scheduleRow] = await sql`SELECT week_number, bowl_date, starting_lane, lane_positions FROM schedule WHERE season_id = ${season.id} AND week_number = ${week}`;

    const bowlers = await sql`
      SELECT b.id, b.full_name, b.normalized_name, sr.is_sub, sr.book_average,
             t.name AS team_name, st.team_number
      FROM   bowlers b
      JOIN   season_roster sr ON sr.bowler_id = b.id AND sr.season_id = ${season.id}
      LEFT JOIN teams t        ON t.id = sr.team_id
      LEFT JOIN season_teams st ON st.team_id = t.id AND st.season_id = ${season.id}
      ORDER  BY b.normalized_name ASC
    `;

    const checkins = await sql`SELECT bowler_id, paid_amount FROM checkins WHERE season_id = ${season.id} AND week_number = ${week}`;
    const checkedInIds = new Set(checkins.map(c => c.bowler_id));

    const lockRows = await sql`SELECT id FROM progressive_pot WHERE season_id = ${season.id} AND week_number = ${week} AND transaction_type = 'lock'`;
    const isLocked = lockRows.length > 0;

    const [progressiveBalance, charityBalance] = await Promise.all([
      getProgressiveBalance(season.id),
      getCharityBalance(season.id),
    ]);

    const weeks = await sql`SELECT week_number, bowl_date FROM schedule WHERE season_id = ${season.id} ORDER BY week_number ASC`;

    const playerCount = checkedInIds.size;
    const pool = playerCount * buyinAmount;
    const payoutTotal = Math.floor((pool - progressiveNightly) / 4) * 3;
    const charityNightly = pool - progressiveNightly - payoutTotal;

    return NextResponse.json({
      seasonId: season.id,
      week,
      scheduleRow,
      bowlers: bowlers.map(b => ({ ...b, checked_in: checkedInIds.has(b.id) })),
      checkedInCount: checkedInIds.size,
      totalCollected: checkins.reduce((s, c) => s + parseFloat(c.paid_amount), 0),
      buyinAmount,
      isLocked,
      progressiveBalance,
      charityBalance,
      pool,
      payoutTotal,
      charityNightly,
      progressiveNightly,
      weeks,
    });
  } catch (err) {
    console.error('Checkin GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { seasonId, weekNumber, action, buyinAmount } = body;

    if (action === 'checkin') {
      const { bowlerId } = body;
      await sql`INSERT INTO checkins (season_id, week_number, bowler_id, paid_amount) VALUES (${seasonId}, ${weekNumber}, ${bowlerId}, ${buyinAmount}) ON CONFLICT (season_id, week_number, bowler_id) DO NOTHING`;

    } else if (action === 'uncheckout') {
      const { bowlerId } = body;
      await sql`DELETE FROM checkins WHERE season_id = ${seasonId} AND week_number = ${weekNumber} AND bowler_id = ${bowlerId}`;

    } else if (action === 'lock') {
      const checkins = await sql`SELECT COUNT(*) as cnt, SUM(paid_amount) as total FROM checkins WHERE season_id = ${seasonId} AND week_number = ${weekNumber}`;
      const playerCount = parseInt(checkins[0].cnt);
      const pool = playerCount * buyinAmount;

      const [seasonRow] = await sql`SELECT league_id FROM seasons WHERE id = ${seasonId}`;
      const settings = await sql`SELECT key, value FROM settings WHERE league_id = ${seasonRow.league_id}`;
      const cfg = Object.fromEntries(settings.map(s => [s.key, parseFloat(s.value)]));
      const progressiveNightly = cfg.progressive_nightly || 3;
      const payoutTotal = Math.floor((pool - progressiveNightly) / 4) * 3;
      const charityNightly = pool - progressiveNightly - payoutTotal;

      const [donationRow] = await sql`
        SELECT amount FROM charitable_donations
        WHERE season_id = ${seasonId} AND week_number = ${weekNumber}
      `;
      const donationAmount = donationRow ? parseFloat(donationRow.amount) : 0;
      const totalCharityAmount = charityNightly + donationAmount;

      const [progressiveBalance, charityBalance] = await Promise.all([
        getProgressiveBalance(seasonId),
        getCharityBalance(seasonId),
      ]);

      const newProgressiveBalance = progressiveBalance + progressiveNightly;
      await sql`INSERT INTO progressive_pot (season_id, week_number, transaction_type, amount, balance_after, notes) VALUES (${seasonId}, ${weekNumber}, 'lock', ${progressiveNightly}, ${newProgressiveBalance}, 'Night locked')`;

      const newCharityBalance = charityBalance + totalCharityAmount;
      await sql`INSERT INTO charity_fund (season_id, week_number, transaction_type, amount, balance_after, notes) VALUES (${seasonId}, ${weekNumber}, 'lock', ${totalCharityAmount}, ${newCharityBalance}, 'Night locked')`;

      return NextResponse.json({ success: true, isLocked: true, newProgressiveBalance, newCharityBalance, pool, payoutTotal, charityNightly: totalCharityAmount });

    } else if (action === 'unlock') {
      await sql`DELETE FROM progressive_pot WHERE season_id = ${seasonId} AND week_number = ${weekNumber} AND transaction_type = 'lock'`;
      await sql`DELETE FROM charity_fund WHERE season_id = ${seasonId} AND week_number = ${weekNumber} AND transaction_type = 'lock'`;
      await sql`DELETE FROM game_results WHERE season_id = ${seasonId} AND week_number = ${weekNumber}`;

      return NextResponse.json({ success: true, isLocked: false });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Checkin POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
