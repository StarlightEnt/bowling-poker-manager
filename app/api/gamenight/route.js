// PATH: app/api/gamenight/route.js
import { NextResponse } from 'next/server';
import sql from '@/lib/db';

async function detectWeek(seasonId) {
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
  for (const candidate of candidates) {
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

    const [scheduleRow] = await sql`SELECT week_number, bowl_date FROM schedule WHERE season_id = ${season.id} AND week_number = ${week}`;

    const checkedIn = await sql`
      SELECT b.id, b.normalized_name, b.full_name, sr.is_sub, t.name AS team_name
      FROM   checkins c
      JOIN   bowlers b      ON c.bowler_id = b.id
      JOIN   season_roster sr ON sr.bowler_id = b.id AND sr.season_id = ${season.id}
      LEFT JOIN teams t     ON t.id = sr.team_id
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

    const [progRow] = await sql`SELECT balance_after FROM progressive_pot WHERE season_id = ${season.id} ORDER BY id DESC LIMIT 1`;
    const progressiveBalance = progRow ? parseFloat(progRow.balance_after) : 0;

    const [charRow] = await sql`SELECT balance_after FROM charity_fund WHERE season_id = ${season.id} ORDER BY id DESC LIMIT 1`;
    const charityBalance = charRow ? parseFloat(charRow.balance_after) : 0;

    const results = await sql`
      SELECT gr.*, b.normalized_name, b.full_name
      FROM game_results gr
      JOIN bowlers b ON gr.bowler_id = b.id
      WHERE gr.season_id = ${season.id} AND gr.week_number = ${week}
      ORDER BY gr.game_number, gr.id
    `;

    const progressiveWonRow = await sql`SELECT id FROM game_results WHERE season_id = ${season.id} AND week_number = ${week} AND is_progressive_win = true LIMIT 1`;
    const progressiveAlreadyWon = progressiveWonRow.length > 0;

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
