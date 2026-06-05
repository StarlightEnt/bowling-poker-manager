// PATH: app/api/checkin/route.js
import { NextResponse } from 'next/server';
import sql from '@/lib/db';

function getWeekCandidates() {
  const today = new Date();
  today.setHours(0,0,0,0);
  const candidates = [];
  if (today.getDay() === 3) candidates.push(new Date(today));
  for (let i = 0; i <= 2; i++) {
    const d = new Date(today);
    const daysUntilWed = (3 - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + daysUntilWed + (i * 7));
    candidates.push(d);
  }
  return candidates;
}

async function detectWeek(seasonId) {
  for (const candidate of getWeekCandidates()) {
    const dateStr = candidate.toISOString().split('T')[0];
    const rows = await sql`SELECT week_number FROM schedule WHERE season_id = ${seasonId} AND bowl_date = ${dateStr}`;
    if (rows.length > 0) return rows[0].week_number;
  }
  const [upcoming] = await sql`SELECT week_number FROM schedule WHERE season_id = ${seasonId} AND bowl_date >= CURRENT_DATE AND is_position_round = false ORDER BY bowl_date ASC LIMIT 1`;
  return upcoming?.week_number || null;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const weekNumber = searchParams.get('week');

    const [season] = await sql`SELECT id FROM seasons WHERE is_active = true LIMIT 1`;
    if (!season) return NextResponse.json({ error: 'No active season' }, { status: 404 });

    const settings = await sql`SELECT key, value FROM settings`;
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

    const [progRow] = await sql`SELECT balance_after FROM progressive_pot WHERE season_id = ${season.id} ORDER BY id DESC LIMIT 1`;
    const progressiveBalance = progRow ? parseFloat(progRow.balance_after) : 0;
    const [charRow] = await sql`SELECT balance_after FROM charity_fund WHERE season_id = ${season.id} ORDER BY id DESC LIMIT 1`;
    const charityBalance = charRow ? parseFloat(charRow.balance_after) : 0;

    const weeks = await sql`SELECT week_number, bowl_date FROM schedule WHERE season_id = ${season.id} AND is_position_round = false ORDER BY week_number ASC`;

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
      const settings = await sql`SELECT key, value FROM settings`;
      const cfg = Object.fromEntries(settings.map(s => [s.key, parseFloat(s.value)]));
      const progressiveNightly = cfg.progressive_nightly || 3;
      const payoutTotal = Math.floor((pool - progressiveNightly) / 4) * 3;
      const charityNightly = pool - progressiveNightly - payoutTotal;

      const [progRow] = await sql`SELECT balance_after FROM progressive_pot WHERE season_id = ${seasonId} ORDER BY id DESC LIMIT 1`;
      const progressiveBalance = progRow ? parseFloat(progRow.balance_after) : 0;
      const [charRow] = await sql`SELECT balance_after FROM charity_fund WHERE season_id = ${seasonId} ORDER BY id DESC LIMIT 1`;
      const charityBalance = charRow ? parseFloat(charRow.balance_after) : 0;

      const newProgressiveBalance = progressiveBalance + progressiveNightly;
      await sql`INSERT INTO progressive_pot (season_id, week_number, transaction_type, amount, balance_after, notes) VALUES (${seasonId}, ${weekNumber}, 'lock', ${progressiveNightly}, ${newProgressiveBalance}, 'Night locked')`;

      const newCharityBalance = charityBalance + charityNightly;
      await sql`INSERT INTO charity_fund (season_id, week_number, transaction_type, amount, balance_after, notes) VALUES (${seasonId}, ${weekNumber}, 'lock', ${charityNightly}, ${newCharityBalance}, 'Night locked')`;

      return NextResponse.json({ success: true, isLocked: true, newProgressiveBalance, newCharityBalance, pool, payoutTotal, charityNightly });

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
