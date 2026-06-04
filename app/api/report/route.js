// PATH: app/api/report/route.js
import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const weekParam = searchParams.get('week');

    const [season] = await sql`SELECT id, name FROM seasons WHERE is_active = true LIMIT 1`;
    if (!season) return NextResponse.json({ error: 'No active season' }, { status: 404 });

    const settings = await sql`SELECT key, value FROM settings`;
    const cfg = Object.fromEntries(settings.map(s => [s.key, parseFloat(s.value)]));
    const buyinAmount = cfg.buyin_amount || 5;
    const progressiveNightly = cfg.progressive_nightly || 3;

    // Find completed weeks (all 3 games recorded)
    const completedWeeks = await sql`
      SELECT gr.week_number, COUNT(DISTINCT gr.game_number) as game_count,
             s.bowl_date
      FROM game_results gr
      JOIN schedule s ON s.season_id = gr.season_id AND s.week_number = gr.week_number
      WHERE gr.season_id = ${season.id}
      GROUP BY gr.week_number, s.bowl_date
      HAVING COUNT(DISTINCT gr.game_number) = 3
      ORDER BY gr.week_number DESC
    `;

    if (completedWeeks.length === 0) {
      return NextResponse.json({ error: 'No completed weeks found. Enter all 3 game results first.' }, { status: 404 });
    }

    // Use requested week or default to most recent completed
    const week = weekParam ? parseInt(weekParam) : completedWeeks[0].week_number;

    const [scheduleRow] = await sql`
      SELECT week_number, bowl_date, starting_lane, lane_positions
      FROM schedule WHERE season_id = ${season.id} AND week_number = ${week}
    `;

    // Checked-in count and pool
    const [checkinCount] = await sql`
      SELECT COUNT(*) as cnt FROM checkins c
      JOIN bowlers b ON c.bowler_id = b.id
      WHERE c.season_id = ${season.id} AND c.week_number = ${week}
        AND b.normalized_name != 'VACANT'
    `;
    const playerCount = parseInt(checkinCount.cnt);
    const pool = playerCount * buyinAmount;
    const payoutTotal = Math.floor((pool - progressiveNightly) / 4) * 3;
    const charityNightly = pool - progressiveNightly - payoutTotal;
    const perGame = {
      pool: pool / 3,
      progressive: progressiveNightly / 3,
      payout: payoutTotal / 3,
      charity: charityNightly / 3,
    };

    // Game results
    const results = await sql`
      SELECT gr.*, b.normalized_name, b.full_name
      FROM game_results gr
      JOIN bowlers b ON gr.bowler_id = b.id
      WHERE gr.season_id = ${season.id} AND gr.week_number = ${week}
      ORDER BY gr.game_number, gr.id
    `;

    // Progressive pot balance as of this week
    const [progRow] = await sql`
      SELECT balance_after FROM progressive_pot
      WHERE season_id = ${season.id} AND week_number <= ${week}
      ORDER BY id DESC LIMIT 1
    `;
    const progressiveBalance = progRow ? parseFloat(progRow.balance_after) : 0;

    // Charity balance as of this week
    const [charRow] = await sql`
      SELECT balance_after FROM charity_fund
      WHERE season_id = ${season.id} AND week_number <= ${week}
      ORDER BY id DESC LIMIT 1
    `;
    const charityBalance = charRow ? parseFloat(charRow.balance_after) : 0;

    return NextResponse.json({
      seasonId: season.id,
      seasonName: season.name,
      weekNumber: week,
      scheduleRow,
      playerCount,
      pool,
      payoutTotal,
      charityNightly,
      progressiveNightly,
      perGame,
      progressiveBalance,
      charityBalance,
      results,
      completedWeeks,
      buyinAmount,
    });
  } catch (err) {
    console.error('Report GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
