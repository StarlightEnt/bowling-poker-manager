import sql from '@/lib/db';

function getWeekCandidates() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const candidates = [];
  if (today.getDay() === 3) candidates.push(new Date(today));
  const daysSinceLastWed = (today.getDay() - 3 + 7) % 7 || 7;
  const lastWed = new Date(today);
  lastWed.setDate(today.getDate() - daysSinceLastWed);
  candidates.push(lastWed);
  const daysUntilNextWed = (3 - today.getDay() + 7) % 7 || 7;
  const nextWed = new Date(today);
  nextWed.setDate(today.getDate() + daysUntilNextWed);
  candidates.push(nextWed);
  return candidates;
}

async function detectWeek(seasonId) {
  for (const candidate of getWeekCandidates()) {
    const dateStr = candidate.toISOString().split('T')[0];
    const rows = await sql`
      SELECT week_number FROM schedule
      WHERE season_id = ${seasonId} AND bowl_date = ${dateStr}
    `;
    if (rows.length > 0) return rows[0].week_number;
  }
  const [upcoming] = await sql`
    SELECT week_number FROM schedule
    WHERE season_id = ${seasonId}
      AND bowl_date >= CURRENT_DATE
      AND is_position_round = false
    ORDER BY bowl_date ASC LIMIT 1
  `;
  return upcoming?.week_number || null;
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
