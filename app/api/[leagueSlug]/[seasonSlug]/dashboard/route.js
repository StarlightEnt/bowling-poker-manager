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
    const parts = url.pathname.split('/').filter(Boolean);
    const leagueSlug = parts[1];
    const seasonSlug = parts[2];

    const [season] = await sql`
      SELECT s.id, s.name, s.start_date, s.end_date, s.league_id
      FROM seasons s
      JOIN leagues l ON l.id = s.league_id
      WHERE l.slug = ${leagueSlug} AND s.slug = ${seasonSlug}
      LIMIT 1
    `;
    if (!season) return Response.json({ season: null });
    const sid = season.id;

    const schedRows = await sql`
      SELECT
        s.week_number,
        s.bowl_date,
        s.starting_lane,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM game_results gr
            WHERE gr.season_id = s.season_id
              AND gr.week_number = s.week_number
              AND gr.game_number = 3
          ) THEN 'complete'
          WHEN EXISTS (
            SELECT 1 FROM historical_checkins hc
            WHERE hc.season_name = (SELECT name FROM seasons WHERE id = s.season_id)
              AND hc.week_number = s.week_number
          ) THEN 'complete'
          WHEN EXISTS (
            SELECT 1 FROM checkins c
            WHERE c.season_id = s.season_id AND c.week_number = s.week_number
          ) THEN 'locked'
          ELSE 'upcoming'
        END AS status
      FROM schedule s
      WHERE s.season_id = ${sid}
      ORDER BY s.week_number ASC
    `;

    const weekNum = await detectWeek(sid);
    const currentWeek = schedRows.find(w => w.week_number === weekNum)
      || schedRows[schedRows.length - 1];

    const checkinRows = await sql`
      SELECT COUNT(*) AS cnt
      FROM checkins c
      JOIN bowlers b ON b.id = c.bowler_id
      WHERE c.season_id = ${sid}
        AND c.week_number = ${weekNum}
        AND b.normalized_name != 'VACANT'
    `;
    const checkedIn = parseInt(checkinRows[0]?.cnt ?? 0, 10);

    const bowlerRows = await sql`
      SELECT COUNT(*) AS cnt
      FROM season_roster sr
      JOIN bowlers b ON b.id = sr.bowler_id
      WHERE sr.season_id = ${sid}
        AND b.normalized_name != 'VACANT'
        AND sr.is_sub = false
    `;
    const totalBowlers = parseInt(bowlerRows[0]?.cnt ?? 0, 10);

    const gameRows = await sql`
      SELECT COUNT(DISTINCT game_number) AS cnt
      FROM game_results
      WHERE season_id = ${sid} AND week_number = ${weekNum}
    `;
    const gamesEntered = parseInt(gameRows[0]?.cnt ?? 0, 10);

    const progRows = await sql`
      SELECT balance_after FROM progressive_pot
      WHERE season_id = ${sid}
      ORDER BY id DESC LIMIT 1
    `;
    const progressivePot = parseFloat(progRows[0]?.balance_after ?? 0);

    const charityRows = await sql`
      SELECT balance_after FROM charity_fund
      WHERE season_id = ${sid}
      ORDER BY id DESC LIMIT 1
    `;
    const charityFund = parseFloat(charityRows[0]?.balance_after ?? 0);

    const weeksComplete = schedRows.filter(w => w.status === 'complete').length;
    const totalWeeks = schedRows.length;

    return Response.json({
      season: {
        id: sid,
        name: season.name,
        start_date: season.start_date,
        end_date: season.end_date,
      },
      currentWeek: currentWeek ? {
        week_number: currentWeek.week_number,
        bowl_date: currentWeek.bowl_date,
        status: currentWeek.status,
      } : null,
      stats: {
        checkedIn,
        totalBowlers,
        gamesEntered,
        progressivePot,
        charityFund,
        weeksComplete,
        totalWeeks,
      },
    });
  } catch (err) {
    console.error('GET /api/[leagueSlug]/[seasonSlug]/dashboard error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
