// Migration: Fix Week 8 Royal Flush progressive payout records
// The progressive payout was recorded as $6.00 (live balance only)
// but should be $33.00 (full running total: $9 seed + 6×$3 historical + 2×$3 live)
// Player was correctly paid $33.00 in real life — this fixes the DB records.

import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Fix game_results: Walter T, Week 8, Game 3
// progressive_payout: 6.00 → 33.00
// total_payout: 31.00 → 58.00 ($25 game payout + $33 progressive)
await sql`
  UPDATE game_results
  SET
    progressive_payout = 33.00,
    total_payout = 58.00
  WHERE season_id = 1
    AND week_number = 8
    AND game_number = 3
    AND is_progressive_win = true
`;

// Fix progressive_pot payout row (id=7)
// amount: 6.00 → 33.00 (balance_after stays 0.00 — already correct)
await sql`
  UPDATE progressive_pot
  SET amount = 33.00
  WHERE season_id = 1
    AND week_number = 8
    AND transaction_type = 'payout'
`;

// Verify
const gr = await sql`
  SELECT week_number, game_number, progressive_payout, total_payout
  FROM game_results
  WHERE season_id = 1 AND week_number = 8 AND game_number = 3
`;
console.log('game_results:', gr);

const pp = await sql`
  SELECT * FROM progressive_pot WHERE season_id = 1 ORDER BY id
`;
console.log('progressive_pot:', pp);

console.log('Migration complete');
