import { NextResponse } from 'next/server';
import sql from '@/lib/db';

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
      AND is_position_round = false
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
      SELECT s.id, s.name, s.progressive_seed, s.charity_seed, s.league_id
      FROM seasons s
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

    const [scheduleRow] = await sql`SELECT week_number, bowl_date FROM schedule WHERE season_id = ${season.id} AND week_number = ${week}`;

    const checkedIn = await sql`
      SELECT b.id, b.normalized_name, b.full_name, sr.is_sub, t.name AS team_name
      FROM   checkins c
      JOIN   bowlers b        ON c.bowler_id = b.id
      JOIN   season_roster sr ON sr.bowler_id = b.id AND sr.season_id = ${season.id}
      LEFT JOIN teams t       ON t.id = sr.team_id
      WHERE  c.season_id = ${season.id} AND c.week_number = ${week}
        AND  b.normalized_name != 'VACANT'
      ORDER  BY b.normalized_name ASC
    `;

    const playerCount = checkedIn.length;
    const pool = playerCount * buyinAmount;
    const payoutTotal = playerCount === 0 ? 0 : Math.floor((pool - progressiveNightly) / 4) * 3;
    const charityTotal = playerCount === 0 ? 0 : pool - progressiveNightly - payoutTotal;
    const perGame = {
      pool:        playerCount === 0 ? 0 : pool / 3,
      progressive: playerCount === 0 ? 0 : progressiveNightly / 3,
      payout:      playerCount === 0 ? 0 : payoutTotal / 3,
      charity:     playerCount === 0 ? 0 : charityTotal / 3,
    };

    const lockRows = await sql`SELECT id FROM progressive_pot WHERE season_id = ${season.id} AND week_number = ${week} AND transaction_type = 'lock'`;
    const isLocked = lockRows.length > 0;

    const [histProgRow] = await sql`
      SELECT COUNT(*)::int AS weeks FROM historical_checkins WHERE season_name = ${season.name}
    `;
    const [liveProgRow] = await sql`
      SELECT balance_after FROM progressive_pot WHERE season_id = ${season.id} ORDER BY id DESC LIMIT 1
    `;
    const progressiveBalance =
      parseFloat(season.progressive_seed) +
      parseInt(histProgRow.weeks) * progressiveNightly +
      (liveProgRow ? parseFloat(liveProgRow.balance_after) : 0);

    const [histCharityRow] = await sql`
      SELECT COALESCE(SUM(charity_amount), 0) AS total FROM historical_checkins WHERE season_name = ${season.name}
    `;
    const [liveCharityRow] = await sql`
      SELECT balance_after FROM charity_fund WHERE season_id = ${season.id} ORDER BY id DESC LIMIT 1
    `;
    const charityBalance =
      parseFloat(season.charity_seed) +
      parseFloat(histCharityRow.total) +
      (liveCharityRow ? parseFloat(liveCharityRow.balance_after) : 0);

    const results = await sql`
      SELECT gr.*, b.normalized_name, b.full_name
      FROM game_results gr
      JOIN bowlers b ON gr.bowler_id = b.id
      WHERE gr.season_id = ${season.id} AND gr.week_number = ${week}
      ORDER BY gr.game_number, gr.id
    `;

    const progressiveWonRow = await sql`SELECT id FROM game_results WHERE season_id = ${season.id} AND week_number = ${week} AND is_progressive_win = true LIMIT 1`;
    const progressiveAlreadyWon = progressiveWonRow.length > 0;

    const [donationRow] = await sql`
      SELECT id, amount, notes FROM charitable_donations
      WHERE season_id = ${season.id} AND week_number = ${week}
    `;

    const weeks = await sql`SELECT week_number, bowl_date FROM schedule WHERE season_id = ${season.id} AND is_position_round = false ORDER BY week_number ASC`;

    return NextResponse.json({
      seasonId: season.id,
      week,
      scheduleRow,
      checkedIn,
      playerCount,
      pool,
      progressiveTotal: progressiveNightly,
      payoutTotal,
      charityTotal,
      perGame,
      progressiveBalance,
      charityBalance,
      isLocked,
      progressiveAlreadyWon,
      results,
      donation: donationRow ? { id: donationRow.id, amount: parseFloat(donationRow.amount), notes: donationRow.notes || '' } : null,
      weeks,
      cfg: { buyinAmount, progressiveNightly },
    });
  } catch (err) {
    console.error('Gamenight GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { seasonId, weekNumber, gameNumber, winners, handType, handDetail, perGame, isProgressiveWin } = await request.json();

    await sql`DELETE FROM game_results WHERE season_id = ${seasonId} AND week_number = ${weekNumber} AND game_number = ${gameNumber}`;
    await sql`DELETE FROM progressive_pot WHERE season_id = ${seasonId} AND week_number = ${weekNumber} AND transaction_type = 'payout'`;

    const [progRow] = await sql`SELECT balance_after FROM progressive_pot WHERE season_id = ${seasonId} ORDER BY id DESC LIMIT 1`;
    const progressiveBalance = progRow ? parseFloat(progRow.balance_after) : 0;

    const splitPayout = winners.length > 1 ? perGame.payout / winners.length : perGame.payout;
    const splitProgressive = isProgressiveWin ? progressiveBalance / winners.length : 0;

    for (const bowlerId of winners) {
      await sql`
        INSERT INTO game_results (season_id, week_number, game_number, bowler_id, hand_type, hand_detail, pot_amount, is_progressive_win, progressive_payout, total_payout)
        VALUES (${seasonId}, ${weekNumber}, ${gameNumber}, ${bowlerId}, ${handType}, ${handDetail || null}, ${perGame.pool}, ${isProgressiveWin}, ${splitProgressive}, ${splitPayout + splitProgressive})
      `;
    }

    let newProgressiveBalance = progressiveBalance;
    if (isProgressiveWin) {
      newProgressiveBalance = 0;
      await sql`
        INSERT INTO progressive_pot (season_id, week_number, transaction_type, amount, balance_after, notes)
        VALUES (${seasonId}, ${weekNumber}, 'payout', ${progressiveBalance}, 0, ${'Royal Flush - Game ' + gameNumber})
      `;
    }

    return NextResponse.json({ success: true, newProgressiveBalance });
  } catch (err) {
    console.error('Gamenight POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
