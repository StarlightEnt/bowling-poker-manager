// PATH: app/api/dashboard/route.js
import sql from '@/lib/db';

async function detectWeek(seasonId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  // 1. If today is a bowling day (Wednesday), use today's week
  if (today.getDay() === 3) {
    const [todayRow] = await sql`
      SELECT week_number FROM schedule
      WHERE season_id = ${seasonId} AND bowl_date = ${todayStr}
    `;
    if (todayRow) return todayRow.week_number;
  }

  // 2. Look backward — find the most recently completed or locked week
  const [lastWeek] = await sql`
    SELECT week_number FROM schedule
    WHERE season_id = ${seasonId}
      AND bowl_date < ${todayStr}
      AND is_position_round = false
    ORDER BY bowl_date DESC LIMIT 1
  `;
  if (lastWeek) return lastWeek.week_number;

  // 3. No past weeks — fall forward to next upcoming week
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
    const seasons = await sql`
      SELECT id, name, start_date, end_date FROM seasons WHERE is_active = true LIMIT 1
    `;
    if (!seasons.length) {
      return Response.json({ season: null });
    }
    const season = seasons[0];
    const sid = season.id;

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

    const gamesRow = await sql`
      SELECT COUNT(DISTINCT game_number) AS cnt
      FROM game_results
      WHERE season_id = ${sid} AND week_number = ${weekNum}
    `;
    const gamesEntered = parseInt(gamesRow[0]?.cnt ?? 0, 10);

    const [progRow] = await sql`
      SELECT balance_after FROM progressive_pot
      WHERE season_id = ${sid}
      ORDER BY id DESC LIMIT 1
    `;
    const progressivePot = progRow ? parseFloat(progRow.balance_after) : 0;

    const [charRow] = await sql`
      SELECT balance_after FROM charity_fund
      WHERE season_id = ${sid}
      ORDER BY id DESC LIMIT 1
    `;
    const charityFund = charRow ? parseFloat(charRow.balance_after) : 0;

    const weeksComplete = schedRows.filter(w => w.status === 'complete').length;
    const totalWeeks = schedRows.filter(w => !w.is_position_round).length;

    return Response.json({
      season,
      currentWeek,
      schedule: schedRows,
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
    console.error('Dashboard GET error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
