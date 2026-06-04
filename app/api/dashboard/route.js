import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

// Same logic as checkin route — check today (if Wed), then next 3 Wednesdays,
// then fall back to next upcoming non-position-round week by date.
function getWeekCandidates() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const candidates = [];
  if (today.getDay() === 3) candidates.push(new Date(today));
  for (let i = 0; i <= 2; i++) {
    const d = new Date(today);
    const daysUntilWed = (3 - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + daysUntilWed + i * 7);
    candidates.push(d);
  }
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

export async function GET() {
  try {
    const seasons = await sql`
      SELECT id, name, start_date, end_date FROM seasons WHERE is_active = true LIMIT 1
    `;
    if (!seasons.length) {
      return Response.json({ season: null });
    }
    const season = seasons[0];
    const sid = season.id;

    // All schedule rows with status (for progress bar)
    const schedRows = await sql`
      SELECT
        s.week_number,
        s.bowl_date,
        s.starting_lane,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM game_results gr
            WHERE gr.season_id = s.season_id AND gr.week_number = s.week_number AND gr.game_number = 3
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

    // Use the same date-based detection as the check-in screen
    const weekNum = await detectWeek(sid);
    const currentWeek = schedRows.find(w => w.week_number === weekNum)
      || schedRows[schedRows.length - 1];

    // Checked-in count for current week
    const checkinRows = await sql`
      SELECT COUNT(*) AS cnt
      FROM checkins c
      JOIN bowlers b ON b.id = c.bowler_id
      WHERE c.season_id = ${sid}
        AND c.week_number = ${weekNum}
        AND b.normalized_name != 'VACANT'
    `;
    const checkedIn = parseInt(checkinRows[0]?.cnt ?? 0, 10);

    // Total bowlers (non-vacant, non-sub regulars)
    const bowlerRows = await sql`
      SELECT COUNT(*) AS cnt FROM bowlers
      WHERE season_id = ${sid} AND normalized_name != 'VACANT' AND is_sub = false
    `;
    const totalBowlers = parseInt(bowlerRows[0]?.cnt ?? 0, 10);

    // Games entered this week
    const gameRows = await sql`
      SELECT COUNT(DISTINCT game_number) AS cnt
      FROM game_results
      WHERE season_id = ${sid} AND week_number = ${weekNum}
    `;
    const gamesEntered = parseInt(gameRows[0]?.cnt ?? 0, 10);

    // Progressive pot balance
    const progRows = await sql`
      SELECT balance_after FROM progressive_pot
      WHERE season_id = ${sid}
      ORDER BY id DESC LIMIT 1
    `;
    const progressivePot = parseFloat(progRows[0]?.balance_after ?? 0);

    // Charity fund balance
    const charityRows = await sql`
      SELECT balance_after FROM charity_fund
      WHERE season_id = ${sid}
      ORDER BY id DESC LIMIT 1
    `;
    const charityFund = parseFloat(charityRows[0]?.balance_after ?? 0);

    // Weeks complete so far
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
    console.error('GET /api/dashboard error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
