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
