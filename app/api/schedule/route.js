// PATH: app/api/schedule/route.js
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function detectWeek(seasonId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  if (today.getDay() === 3) {
    const [todayRow] = await sql`
      SELECT week_number FROM schedule
      WHERE season_id = ${seasonId} AND bowl_date = ${todayStr}
    `;
    if (todayRow) return todayRow.week_number;
  }

  const [lastWeek] = await sql`
    SELECT week_number FROM schedule
    WHERE season_id = ${seasonId}
      AND bowl_date < ${todayStr}
      AND is_position_round = false
    ORDER BY bowl_date DESC LIMIT 1
  `;
  if (lastWeek) return lastWeek.week_number;

  const [upcoming] = await sql`
    SELECT week_number FROM schedule
    WHERE season_id = ${seasonId}
      AND bowl_date >= ${todayStr}
      AND is_position_round = false
    ORDER BY bowl_date ASC LIMIT 1
  `;
  return upcoming?.week_number || null;
}

export async function GET() {
  try {
    const season = await sql`
      SELECT id, name FROM seasons WHERE is_active = true LIMIT 1
    `;
    if (!season.length) {
      return Response.json({ error: 'No active season' }, { status: 404 });
    }
    const seasonId = season[0].id;
    const seasonName = season[0].name;

    const currentWeekNumber = await detectWeek(seasonId);

    const rows = await sql`
      SELECT
        s.id,
        s.week_number,
        s.bowl_date,
        s.starting_lane,
        s.lane_positions,
        s.is_position_round,
        s.notes,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM game_results gr
            WHERE gr.season_id = s.season_id
              AND gr.week_number = s.week_number
              AND gr.game_number = 3
          ) THEN 'complete'
          WHEN EXISTS (
            SELECT 1 FROM checkins c
            WHERE c.season_id = s.season_id
              AND c.week_number = s.week_number
          ) THEN 'locked'
          ELSE 'upcoming'
        END AS status
      FROM schedule s
      WHERE s.season_id = ${seasonId}
      ORDER BY s.week_number ASC
    `;

    return Response.json({ weeks: rows, seasonId, seasonName, currentWeekNumber });
  } catch (err) {
    console.error('GET /api/schedule error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { id, starting_lane, lane_positions, is_position_round } = await request.json();

    if (!id) {
      return Response.json({ error: 'Missing id' }, { status: 400 });
    }

    await sql`
      UPDATE schedule SET
        starting_lane     = ${starting_lane},
        lane_positions    = ${JSON.stringify(lane_positions)},
        is_position_round = ${is_position_round}
      WHERE id = ${id}
    `;

    return Response.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/schedule error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
