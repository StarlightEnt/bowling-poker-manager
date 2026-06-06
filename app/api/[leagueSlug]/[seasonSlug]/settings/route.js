import sql from '@/lib/db';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const leagueSlug = parts[1];
    const seasonSlug = parts[2];

    const [season] = await sql`
      SELECT s.id, s.name, s.charity_seed, s.progressive_seed, s.league_id
      FROM seasons s
      JOIN leagues l ON l.id = s.league_id
      WHERE l.slug = ${leagueSlug} AND s.slug = ${seasonSlug}
      LIMIT 1
    `;
    if (!season) return Response.json({ error: 'Season not found' }, { status: 404 });

    const [league] = await sql`
      SELECT id, name, venue_name, venue_city, venue_state, charity_name
      FROM leagues WHERE id = ${season.league_id}
    `;

    const settingsRows = await sql`SELECT key, value FROM settings WHERE league_id = ${season.league_id}`;
    const settings = {};
    for (const { key, value } of settingsRows) settings[key] = value;

    const progressiveNightly = parseFloat(settings.progressive_nightly ?? 3);

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
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const leagueSlug = parts[1];
    const seasonSlug = parts[2];

    const [season] = await sql`
      SELECT s.id, s.league_id FROM seasons s
      JOIN leagues l ON l.id = s.league_id
      WHERE l.slug = ${leagueSlug} AND s.slug = ${seasonSlug}
      LIMIT 1
    `;
    if (!season) return Response.json({ error: 'Season not found' }, { status: 404 });

    const body = await request.json();
    const { league, settings, seeds } = body;

    if (league) {
      const { name, venue_name, venue_city, venue_state, charity_name } = league;
      await sql`
        UPDATE leagues
        SET name = ${name}, venue_name = ${venue_name},
            venue_city = ${venue_city}, venue_state = ${venue_state},
            charity_name = ${charity_name ?? null}
        WHERE id = ${season.league_id}
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
          UPDATE settings SET value = ${String(buyin_amount)}
          WHERE league_id = ${season.league_id} AND key = 'buyin_amount'
        `;
      }
      if (progressive_nightly !== undefined) {
        await sql`
          UPDATE settings SET value = ${String(progressive_nightly)}
          WHERE league_id = ${season.league_id} AND key = 'progressive_nightly'
        `;
      }
    }

    if (seeds) {
      const { charity_seed, progressive_seed } = seeds;
      if (charity_seed !== undefined) {
        await sql`UPDATE seasons SET charity_seed = ${parseFloat(charity_seed)} WHERE id = ${season.id}`;
      }
      if (progressive_seed !== undefined) {
        await sql`UPDATE seasons SET progressive_seed = ${parseFloat(progressive_seed)} WHERE id = ${season.id}`;
      }
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error('Settings POST error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
