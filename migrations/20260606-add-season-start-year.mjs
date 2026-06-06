// Migration: Add start_year to seasons table
// Run date: 2026-06-06
// Status: ALREADY RUN — do not run again without checking first
//
// To run on a fresh database:
// node --use-system-ca --env-file=.env.local migrations/20260606-add-season-start-year.mjs

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

await sql`ALTER TABLE seasons ADD COLUMN IF NOT EXISTS start_year INTEGER`;
await sql`UPDATE seasons SET start_year = 2026 WHERE id = 1 AND start_year IS NULL`;

const result = await sql`SELECT id, name, start_year FROM seasons`;
console.log('Verified:', result);
console.log('Migration complete');
