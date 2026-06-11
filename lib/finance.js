// lib/finance.js
// Single source of truth for all financial calculations.
// Column names verified against live schema on 2026-06-11.

import sql from '@/lib/db';

/**
 * Get the current progressive pot balance for a season.
 *
 * Formula (no payout yet):
 *   progressive_seed
 *   + COUNT(historical_checkins WHERE season_name) × progressive_nightly
 *   + last progressive_pot.balance_after
 *
 * After a Royal Flush (transaction_type='payout' in progressive_pot):
 *   Returns 0 — pot was won and resets to zero.
 */
export async function getProgressiveBalance(seasonId) {
  const [season] = await sql`
    SELECT progressive_seed, name, league_id
    FROM seasons WHERE id = ${seasonId}
  `;
  if (!season) return 0;

  const seed = parseFloat(season.progressive_seed ?? 0);

  const [setting] = await sql`
    SELECT value FROM settings
    WHERE league_id = ${season.league_id}
      AND key = 'progressive_nightly'
  `;
  const nightly = parseFloat(setting?.value ?? 3);

  const [hist] = await sql`
    SELECT COUNT(*)::int AS cnt
    FROM historical_checkins
    WHERE season_name = ${season.name}
  `;
  const histCount = parseInt(hist?.cnt ?? 0);

  const [lastProg] = await sql`
    SELECT transaction_type, balance_after FROM progressive_pot
    WHERE season_id = ${seasonId}
    ORDER BY id DESC LIMIT 1
  `;

  if (lastProg) {
    if (lastProg.transaction_type === 'payout') {
      // Pot was won — starts fresh from 0
      return 0;
    }
    // Last entry is a lock — seed + historical + running live balance
    return seed + (histCount * nightly) + parseFloat(lastProg.balance_after);
  }

  // No entries yet — seed + historical only
  return seed + (histCount * nightly);
}

/**
 * Get the current charity fund balance for a season.
 *
 * Formula (no payout yet):
 *   charity_seed
 *   + SUM(historical_checkins.charity_amount WHERE season_name)
 *   + SUM(charity_fund.amount WHERE season_id)
 *
 * After a charity payout (transaction_type='payout' in charity_fund):
 *   Only sum charity_fund entries after the last payout id.
 *   Do NOT add seed or historical (those were already donated).
 */
export async function getCharityBalance(seasonId) {
  const [season] = await sql`
    SELECT charity_seed, name FROM seasons WHERE id = ${seasonId}
  `;
  if (!season) return 0;

  const seed = parseFloat(season.charity_seed ?? 0);

  // Check if a charity payout has occurred this season
  const [lastPayout] = await sql`
    SELECT id FROM charity_fund
    WHERE season_id = ${seasonId}
      AND transaction_type = 'payout'
    ORDER BY id DESC LIMIT 1
  `;

  if (lastPayout) {
    // Only sum entries after the payout — rebuilding from zero
    const [live] = await sql`
      SELECT COALESCE(SUM(amount), 0)::float AS total
      FROM charity_fund
      WHERE season_id = ${seasonId}
        AND id > ${lastPayout.id}
    `;
    return parseFloat(live.total);
  }

  // No payout yet — full running total: seed + historical + live
  const [hist] = await sql`
    SELECT COALESCE(SUM(charity_amount), 0)::float AS total
    FROM historical_checkins
    WHERE season_name = ${season.name}
  `;

  const [live] = await sql`
    SELECT COALESCE(SUM(amount), 0)::float AS total
    FROM charity_fund
    WHERE season_id = ${seasonId}
  `;

  return seed + parseFloat(hist.total) + parseFloat(live.total);
}

/**
 * Calculate payout summary for a given player count and season settings.
 */
export async function getPayoutSummary(seasonId, playerCount) {
  const [season] = await sql`
    SELECT league_id FROM seasons WHERE id = ${seasonId}
  `;
  const settings = await sql`
    SELECT key, value FROM settings
    WHERE league_id = ${season.league_id}
  `;

  const getSetting = (key, def) => {
    const row = settings.find(s => s.key === key);
    return row ? parseFloat(row.value) : def;
  };

  const buyinAmount = getSetting('buyin_amount', 5);
  const progressiveNightly = getSetting('progressive_nightly', 3);

  const pool = playerCount * buyinAmount;
  const payoutTotal = Math.floor((pool - progressiveNightly) / 4) * 3;
  const charityNightly = pool - progressiveNightly - payoutTotal;
  const perGame = payoutTotal / 3;

  return {
    pool,
    progressiveNightly,
    payoutTotal,
    charityNightly,
    perGame,
    buyinAmount,
  };
}

/**
 * Get progressive nightly amount from settings.
 */
export async function getProgressiveNightly(seasonId) {
  const [season] = await sql`
    SELECT league_id FROM seasons WHERE id = ${seasonId}
  `;
  const [row] = await sql`
    SELECT value FROM settings
    WHERE league_id = ${season.league_id}
      AND key = 'progressive_nightly'
  `;
  return parseFloat(row?.value ?? 3);
}

/**
 * Get buyin amount from settings.
 */
export async function getBuyinAmount(seasonId) {
  const [season] = await sql`
    SELECT league_id FROM seasons WHERE id = ${seasonId}
  `;
  const [row] = await sql`
    SELECT value FROM settings
    WHERE league_id = ${season.league_id}
      AND key = 'buyin_amount'
  `;
  return parseFloat(row?.value ?? 5);
}
