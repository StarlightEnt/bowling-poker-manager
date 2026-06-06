// Migration: Fix bowl_dates for Summer '26 weeks 1-6 (wrong year 2027 → 2026)
// Run date: 2026-06-06
// Cause: old save-season logic inferred year from today's date instead of
//        seasons.start_year, pushing April/May dates to 2027

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Fix weeks 1-6: subtract 1 year (2027 → 2026)
await sql`
  UPDATE schedule
  SET bowl_date = bowl_date - INTERVAL '1 year'
  WHERE season_id = 1
    AND week_number <= 6
`;

// Re-derive season start_date and end_date from corrected schedule
await sql`
  UPDATE seasons SET
    start_date = (SELECT MIN(bowl_date) FROM schedule WHERE season_id = 1),
    end_date   = (SELECT MAX(bowl_date) FROM schedule WHERE season_id = 1)
  WHERE id = 1
`;

// Verify
const weeks = await sql`
  SELECT week_number, bowl_date FROM schedule
  WHERE season_id = 1
  ORDER BY week_number ASC
`;
console.log('Schedule dates:');
weeks.forEach(w => console.log(` Wk${w.week_number}: ${w.bowl_date}`));

const season = await sql`SELECT id, name, start_date, end_date FROM seasons WHERE id = 1`;
console.log('Season:', season[0]);
console.log('Migration complete');
