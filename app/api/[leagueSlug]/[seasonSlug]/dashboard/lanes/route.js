import sql from '@/lib/db';

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
      AND is_position_round = false
    ORDER BY bowl_date ASC LIMIT 1
  `;
  return upcomingRow?.week_number || null;
}

async function fetchTeam(sid, teamNum) {
  const [stRow] = await sql`
    SELECT t.id AS team_id, t.name AS team_name
    FROM season_teams st
    JOIN teams t ON t.id = st.team_id
    WHERE st.season_id = ${sid} AND st.team_number = ${teamNum}
  `;
  if (!stRow) return { teamName: `Team ${teamNum}`, bowlers: [] };

  const bowlerRows = await sql`
    SELECT b.normalized_name
    FROM season_roster sr
    JOIN bowlers b ON b.id = sr.bowler_id
    WHERE sr.season_id = ${sid}
      AND sr.team_id = ${stRow.team_id}
      AND sr.is_sub = false
    ORDER BY sr.position_order ASC
  `;

  return {
    teamName: stRow.team_name,
    bowlers: bowlerRows.map(b => ({
      displayName: b.normalized_name,
      isVacant: b.normalized_name === 'VACANT',
    })),
  };
}

async function buildLanePairs(sid, lanePositions, startingLane) {
  const pairs = [];
  for (let i = 0; i < lanePositions.length; i += 2) {
    pairs.push(
      Promise.all([fetchTeam(sid, lanePositions[i]), fetchTeam(sid, lanePositions[i + 1])]).then(([teamA, teamB]) => ({
        laneA: startingLane + i,
        laneB: startingLane + i + 1,
        teamA,
        teamB,
      }))
    );
  }
  return Promise.all(pairs);
}

async function buildWeekPayload(sid, row) {
  const weekNumber = parseInt(row.week_number, 10);
  const bowlDate = row.bowl_date;
  const startingLane = parseInt(row.starting_lane, 10) || 1;
  const lanePositions = row.lane_positions;

  if (!lanePositions || lanePositions.length === 0) {
    return { weekNumber, bowlDate, hasPairs: false, lanePairs: [] };
  }

  const lanePairs = await buildLanePairs(sid, lanePositions, startingLane);
  return { weekNumber, bowlDate, startingLane, hasPairs: true, lanePairs };
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const leagueSlug = parts[1];
    const seasonSlug = parts[2];

    const [season] = await sql`
      SELECT s.id FROM seasons s
      JOIN leagues l ON l.id = s.league_id
      WHERE l.slug = ${leagueSlug} AND s.slug = ${seasonSlug}
      LIMIT 1
    `;
    if (!season) return Response.json({ hasPairs: false, lanePairs: [] });

    const sid = season.id;
    const weekNum = await detectWeek(sid);
    if (!weekNum) return Response.json({ hasPairs: false, lanePairs: [] });

    const [curRows, nextRows] = await Promise.all([
      sql`
        SELECT week_number, bowl_date::TEXT AS bowl_date, starting_lane, lane_positions
        FROM schedule
        WHERE season_id = ${sid} AND week_number = ${weekNum}
      `,
      sql`
        SELECT week_number, bowl_date::TEXT AS bowl_date, starting_lane, lane_positions
        FROM schedule
        WHERE season_id = ${sid}
          AND week_number > ${weekNum}
          AND is_position_round = false
        ORDER BY week_number ASC LIMIT 1
      `,
    ]);

    const schedRow = curRows[0];
    if (!schedRow) return Response.json({ hasPairs: false, lanePairs: [] });

    const [current, nextWeek] = await Promise.all([
      buildWeekPayload(sid, schedRow),
      nextRows[0] ? buildWeekPayload(sid, nextRows[0]) : Promise.resolve(null),
    ]);

    return Response.json({ ...current, nextWeek });
  } catch (err) {
    console.error('GET /api/[leagueSlug]/[seasonSlug]/dashboard/lanes error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
