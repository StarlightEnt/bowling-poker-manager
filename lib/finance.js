// lib/finance.js
// Single source of truth for all financial calculations.
// Import these functions in any API route that needs financial data.
// NEVER duplicate these calculations inline in route files.

import sql from '@/lib/db';

/**
 * Get the current progressive pot balance for a season.
 * Uses the last balance_after from progressive_pot as the authoritative value.
 * Falls back to seed + historical calculation only if no entries exist yet.
 */
export async function getProgressiveBalance(seasonId) {
  // Last balance_after is always the current balance — handles locks,
  // payouts, and Royal Flush resets automatically
  const [last] = await sql`
    SELECT balance_after, transaction_type
    FROM progressive_pot
    WHERE season_id = ${seasonId}
    ORDER BY id DESC LIMIT 1
  `;
  if (last) return parseFloat(last.balance_after);

  // No entries yet — calculate from seed + historical weeks
  return _progressiveFromSeed(seasonId);
}

export async function getCharityBalance(seasonId) {
  const [season] = await sql`
    SELECT charity_seed, name FROM seasons WHERE id = ${seasonId}
  `;
  const seed = parseFloat(season?.charity_seed ?? 0);

  // Check if a charity payout has ever occurred this season
  const [lastPayout] = await sql`
    SELECT id FROM charity_fund
    WHERE season_id = ${seasonId} AND entry_type = 'payout'
    ORDER BY id DESC LIMIT 1
  `;

  if (lastPayout) {
    // Pot was paid out — only count entries added after the payout
    const [live] = await sql`
      SELECT COALESCE(SUM(amount), 0)::float AS total
      FROM charity_fund
      WHERE season_id = ${seasonId} AND id > ${lastPayout.id}
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
 * Returns all financial components for a single night.
 */
export async function getPayoutSummary(seasonId, playerCount) {
  const settings = await sql`
    SELECT key, value FROM settings
    WHERE league_id = (SELECT league_id FROM seasons WHERE id = ${seasonId})
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
 * Get the progressive nightly amount from settings for a season.
 */
export async function getProgressiveNightly(seasonId) {
  const [row] = await sql`
    SELECT value FROM settings
    WHERE league_id = (SELECT league_id FROM seasons WHERE id = ${seasonId})
      AND key = 'progressive_nightly'
  `;
  return parseFloat(row?.value ?? 3);
}

/**
 * Get the buyin amount from settings for a season.
 */
export async function getBuyinAmount(seasonId) {
  const [row] = await sql`
    SELECT value FROM settings
    WHERE league_id = (SELECT league_id FROM seasons WHERE id = ${seasonId})
      AND key = 'buyin_amount'
  `;
  return parseFloat(row?.value ?? 5);
}

// ─── Private helpers ──────────────────────────────────────────────────────────

async function _progressiveFromSeed(seasonId) {
  const [season] = await sql`
    SELECT progressive_seed, name,
      (SELECT league_id FROM seasons WHERE id = ${seasonId}) as league_id
    FROM seasons WHERE id = ${seasonId}
  `;
  const seed = parseFloat(season?.progressive_seed ?? 0);

  const [hist] = await sql`
    SELECT COUNT(*)::int as cnt FROM historical_checkins
    WHERE season_name = ${season.name}
  `;
  const histCount = parseInt(hist?.cnt ?? 0);

  const [setting] = await sql`
    SELECT value FROM settings
    WHERE league_id = ${season.league_id} AND key = 'progressive_nightly'
  `;
  const nightly = parseFloat(setting?.value ?? 3);

  return seed + (histCount * nightly);
}

async function _charityFromSeed(seasonId) {
  const [season] = await sql`
    SELECT charity_seed, name FROM seasons WHERE id = ${seasonId}
  `;
  const seed = parseFloat(season?.charity_seed ?? 0);

  const [hist] = await sql`
    SELECT COALESCE(SUM(charity_amount), 0)::float as total
    FROM historical_checkins
    WHERE season_name = ${season.name}
  `;
  return seed + parseFloat(hist?.total ?? 0);
}
