import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const leagueSlug = parts[1];
    const seasonSlug = parts[2];

    const [season] = await sql`
      SELECT s.id, s.name, s.slug, s.league_id
      FROM seasons s
      JOIN leagues l ON l.id = s.league_id
      WHERE l.slug = ${leagueSlug} AND s.slug = ${seasonSlug}
      LIMIT 1
    `;
    if (!season) return Response.json({ error: 'Season not found' }, { status: 404 });

    const { confirmName } = await request.json();
    if (confirmName !== season.name) {
      return Response.json({ error: 'Confirmation name does not match this season. Nothing was deleted.' }, { status: 400 });
    }

    const seasonId = season.id;

    const [
      gameResults,
      checkins,
      schedule,
      progressivePot,
      charityFund,
      charitableDonations,
      seasonRoster,
      seasonTeams,
      seasonsDeleted,
    ] = await sql.transaction([
      sql`DELETE FROM game_results WHERE season_id = ${seasonId} RETURNING id`,
      sql`DELETE FROM checkins WHERE season_id = ${seasonId} RETURNING id`,
      sql`DELETE FROM schedule WHERE season_id = ${seasonId} RETURNING id`,
      sql`DELETE FROM progressive_pot WHERE season_id = ${seasonId} RETURNING id`,
      sql`DELETE FROM charity_fund WHERE season_id = ${seasonId} RETURNING id`,
      sql`DELETE FROM charitable_donations WHERE season_id = ${seasonId} RETURNING id`,
      sql`DELETE FROM season_roster WHERE season_id = ${seasonId} RETURNING id`,
      sql`DELETE FROM season_teams WHERE season_id = ${seasonId} RETURNING id`,
      sql`DELETE FROM seasons WHERE id = ${seasonId} RETURNING id`,
    ]);

    return Response.json({
      ok: true,
      deleted: {
        seasonId,
        seasonName: season.name,
        seasonSlug: season.slug,
      },
      rowCounts: {
        game_results: gameResults.length,
        checkins: checkins.length,
        schedule: schedule.length,
        progressive_pot: progressivePot.length,
        charity_fund: charityFund.length,
        charitable_donations: charitableDonations.length,
        season_roster: seasonRoster.length,
        season_teams: seasonTeams.length,
        seasons: seasonsDeleted.length,
      },
    });
  } catch (err) {
    console.error('Delete season error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
