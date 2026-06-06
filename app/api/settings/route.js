// PATH: app/api/settings/route.js
import sql from '@/lib/db';

export async function GET() {
  try {
    const [league] = await sql`
      SELECT id, name, venue_name, venue_city, venue_state, charity_name FROM leagues WHERE id = 1
    `;

    const settingsRows = await sql`
      SELECT key, value FROM settings WHERE league_id = 1
    `;
    const settings = {};
    for (const { key, value } of settingsRows) settings[key] = value;

    const progressiveNightly = parseFloat(settings.progressive_nightly ?? 3);

    const [season] = await sql`
      SELECT id, name, charity_seed, progressive_seed
      FROM seasons WHERE is_active = true AND league_id = 1 LIMIT 1
    `;

    // True charity balance: seed + SUM(historical weeks by season_name) + last live entry
    const [histCharityRow] = await sql`
      SELECT COALESCE(SUM(charity_amount), 0) AS total
      FROM historical_checkins
      WHERE season_name = ${season.name}
    `;
    const [liveCharityRow] = await sql`
      SELECT balance_after FROM charity_fund
      WHERE season_id = ${season.id}
      ORDER BY id DESC LIMIT 1
    `;
    const charityBalance =
      parseFloat(season.charity_seed) +
      parseFloat(histCharityRow.total) +
      (liveCharityRow ? parseFloat(liveCharityRow.balance_after) : 0);

    // True progressive balance: seed + COUNT(historical weeks)*nightly + last live entry
    const [histProgRow] = await sql`
      SELECT COUNT(*)::int AS weeks
      FROM historical_checkins
      WHERE season_name = ${season.name}
    `;
    const [liveProgRow] = await sql`
      SELECT balance_after FROM progressive_pot
      WHERE season_id = ${season.id}
      ORDER BY id DESC LIMIT 1
    `;
    const progressiveBalance =
      parseFloat(season.progressive_seed) +
      parseInt(histProgRow.weeks) * progressiveNightly +
      (liveProgRow ? parseFloat(liveProgRow.balance_after) : 0);

    return Response.json({
      league,
      charityName: league.charity_name || '',
      settings: {
        buyin_amount: parseFloat(settings.buyin_amount ?? 5),
        progressive_nightly: progressiveNightly,
      },
      season: {
        id: season.id,
        name: season.name,
        charity_seed: parseFloat(season.charity_seed),
        progressive_seed: parseFloat(season.progressive_seed),
      },
      balances: {
        charity: charityBalance,
        progressive: progressiveBalance,
      },
    });
  } catch (err) {
    console.error('Settings GET error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { league, settings, seeds } = body;

    if (league) {
      const { name, venue_name, venue_city, venue_state, charity_name } = league;
      await sql`
        UPDATE leagues
        SET name = ${name}, venue_name = ${venue_name},
            venue_city = ${venue_city}, venue_state = ${venue_state},
            charity_name = ${charity_name ?? null}
        WHERE id = 1
      `;
    }

    if (settings) {
      const { buyin_amount, progressive_nightly } = settings;

      if (progressive_nightly !== undefined) {
        const val = parseFloat(progressive_nightly);
        if (isNaN(val) || val < 3 || val % 3 !== 0) {
          return Response.json(
            { error: 'Progressive nightly must be a positive number divisible by 3, minimum $3' },
            { status: 400 }
          );
        }
      }

      if (buyin_amount !== undefined) {
        await sql`
          UPDATE settings SET value = ${String(buyin_amount)} WHERE league_id = 1 AND key = 'buyin_amount'
        `;
      }
      if (progressive_nightly !== undefined) {
        await sql`
          UPDATE settings SET value = ${String(progressive_nightly)} WHERE league_id = 1 AND key = 'progressive_nightly'
        `;
      }
    }

    if (seeds) {
      const { charity_seed, progressive_seed } = seeds;
      const [activeSeason] = await sql`SELECT id FROM seasons WHERE is_active = true AND league_id = 1 LIMIT 1`;
      if (charity_seed !== undefined) {
        await sql`UPDATE seasons SET charity_seed = ${parseFloat(charity_seed)} WHERE id = ${activeSeason.id}`;
      }
      if (progressive_seed !== undefined) {
        await sql`UPDATE seasons SET progressive_seed = ${parseFloat(progressive_seed)} WHERE id = ${activeSeason.id}`;
      }
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error('Settings POST error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
