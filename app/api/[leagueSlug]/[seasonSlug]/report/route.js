import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getProgressiveBalance, getCharityBalance } from '@/lib/finance';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const { searchParams } = url;
    const weekParam = searchParams.get('week');
    const parts = url.pathname.split('/').filter(Boolean);
    const leagueSlug = parts[1];
    const seasonSlug = parts[2];

    const [season] = await sql`
      SELECT s.id, s.name, s.charity_seed, s.progressive_seed, s.league_id
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

    const week = weekParam ? parseInt(weekParam) : completedWeeks[0].week_number;

    const [scheduleRow] = await sql`
      SELECT week_number, bowl_date, starting_lane, lane_positions
      FROM schedule WHERE season_id = ${season.id} AND week_number = ${week}
    `;

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

    const results = await sql`
      SELECT gr.*, b.normalized_name, b.full_name
      FROM game_results gr
      JOIN bowlers b ON gr.bowler_id = b.id
      WHERE gr.season_id = ${season.id} AND gr.week_number = ${week}
      ORDER BY gr.game_number, gr.id
    `;

    const [progressiveBalance, charityBalance] = await Promise.all([
      getProgressiveBalance(season.id),
      getCharityBalance(season.id),
    ]);

    const [leagueRow] = await sql`SELECT charity_name FROM leagues WHERE id = ${season.league_id}`;

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
      charityName: leagueRow?.charity_name || '',
      results,
      completedWeeks,
      buyinAmount,
    });
  } catch (err) {
    console.error('Report GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
