import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

const [season] = await sql`SELECT id FROM seasons WHERE slug = 'Sum26'`;
const seasonId = season.id;
console.log('Season ID:', seasonId);

await sql`UPDATE progressive_pot SET balance_after = 6.00  WHERE season_id = ${seasonId} AND week_number = 10 AND transaction_type = 'lock'`;
await sql`UPDATE progressive_pot SET balance_after = 9.00  WHERE season_id = ${seasonId} AND week_number = 11 AND transaction_type = 'lock'`;
await sql`UPDATE progressive_pot SET balance_after = 12.00 WHERE season_id = ${seasonId} AND week_number = 12 AND transaction_type = 'lock'`;
await sql`UPDATE progressive_pot SET balance_after = 15.00 WHERE season_id = ${seasonId} AND week_number = 13 AND transaction_type = 'lock'`;
await sql`UPDATE progressive_pot SET balance_after = 6.00  WHERE season_id = ${seasonId} AND week_number = 15 AND transaction_type = 'lock'`;

await sql`
  INSERT INTO progressive_pot (season_id, week_number, transaction_type, amount, balance_after, notes)
  VALUES (${seasonId}, 13, 'payout', 15.00, 0.00, 'Royal Flush - Game 1 (retroactively corrected)')
`;

await sql`
  INSERT INTO progressive_pot (season_id, week_number, transaction_type, amount, balance_after, notes)
  VALUES (${seasonId}, 14, 'lock', 3.00, 3.00, 'Night locked (backfilled - was missing)')
`;

await sql`
  UPDATE game_results
  SET progressive_payout = 15.00, total_payout = 39.00
  WHERE season_id = ${seasonId} AND week_number = 13 AND game_number = 1 AND bowler_id = 38
`;
await sql`
  UPDATE game_results
  SET progressive_payout = 0.00, total_payout = 24.00
  WHERE season_id = ${seasonId} AND week_number = 13 AND game_number = 2 AND bowler_id = 69
`;

const pot = await sql`SELECT id, week_number, transaction_type, amount, balance_after, notes FROM progressive_pot WHERE season_id = ${seasonId} ORDER BY id`;
console.log('progressive_pot (final):', JSON.stringify(pot, null, 2));

const gr = await sql`SELECT week_number, game_number, bowler_id, progressive_payout, total_payout FROM game_results WHERE season_id = ${seasonId} AND week_number = 13 ORDER BY game_number`;
console.log('game_results week 13 (final):', JSON.stringify(gr, null, 2));

console.log('Migration complete');
