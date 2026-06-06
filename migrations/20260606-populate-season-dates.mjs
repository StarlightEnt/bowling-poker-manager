// Migration: Populate start_date and end_date on seasons from schedule table
// Run date: 2026-06-06

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Update all seasons that have schedule rows but null start/end dates
await sql`
  UPDATE seasons s SET
    start_date = (SELECT MIN(bowl_date) FROM schedule WHERE season_id = s.id),
    end_date   = (SELECT MAX(bowl_date) FROM schedule WHERE season_id = s.id)
  WHERE (s.start_date IS NULL OR s.end_date IS NULL)
    AND EXISTS (SELECT 1 FROM schedule WHERE season_id = s.id)
`;

const result = await sql`SELECT id, name, start_date, end_date FROM seasons`;
console.log('Verified:', result);
console.log('Migration complete');
