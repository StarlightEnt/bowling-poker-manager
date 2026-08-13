// lib/finance.js
// Single source of truth for all financial calculations.
// Column names verified against live schema on 2026-06-11.
// getProgressiveBalance() corrected 2026-08-12 to fix double-counting of
// seed+historical baseline after a payout (see migrations/20260812-*.mjs).

import sql from '@/lib/db';

/**
 * Get the current progressive pot balance for a season.
 *
 * If a payout has EVER occurred this season:
 *   balance = SUM of 'lock' amounts recorded AFTER the most recent payout.
 *   (The pre-app seed/historical baseline was already paid out and must
 *   never be re-added.)
 *
 * If no payout has occurred yet this season:
 *   balance = progressive_seed + (historical_checkins count × progressive_nightly)
 *             + SUM of all 'lock' amounts so far.
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

  const [lastPayout] = await sql`
    SELECT week_number FROM progressive_pot
    WHERE season_id = ${seasonId}
      AND transaction_type = 'payout'
    ORDER BY week_number DESC, id DESC LIMIT 1
  `;

  if (lastPayout) {
    const [liveSum] = await sql`
      SELECT COALESCE(SUM(amount), 0)::float AS total
      FROM progressive_pot
      WHERE season_id = ${seasonId}
        AND transaction_type = 'lock'
        AND week_number > ${lastPayout.week_number}
    `;
    return parseFloat(liveSum.total);
  }

  const [liveSum] = await sql`
    SELECT COALESCE(SUM(amount), 0)::float AS total
    FROM progressive_pot
    WHERE season_id = ${seasonId}
      AND transaction_type = 'lock'
  `;
  return seed + (histCount * nightly) + parseFloat(liveSum.total);
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

  const [lastPayout] = await sql`
    SELECT id FROM charity_fund
    WHERE season_id = ${seasonId}
      AND transaction_type = 'payout'
    ORDER BY id DESC LIMIT 1
  `;

  if (lastPayout) {
    const [live] = await sql`
      SELECT COALESCE(SUM(amount), 0)::float AS total
      FROM charity_fund
      WHERE season_id = ${seasonId}
        AND id > ${lastPayout.id}
    `;
    return parseFloat(live.total);
  }

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
