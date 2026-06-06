import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { leagueSlug } = params;
  const [league] = await sql`SELECT * FROM leagues WHERE slug = ${leagueSlug}`;
  if (!league) return Response.json({ error: 'League not found' }, { status: 404 });
  const seasons = await sql`
    SELECT s.*, COUNT(sc.id)::int AS week_count
    FROM seasons s
    LEFT JOIN schedule sc ON sc.season_id = s.id
    WHERE s.league_id = ${league.id}
    GROUP BY s.id
    ORDER BY s.id DESC
  `;
  return Response.json({ league, seasons });
}
