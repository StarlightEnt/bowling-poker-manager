import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const leagues = await sql`
    SELECT l.*, COUNT(s.id)::int AS season_count
    FROM leagues l
    LEFT JOIN seasons s ON s.league_id = l.id
    GROUP BY l.id
    ORDER BY l.name ASC
  `;
  return Response.json({ leagues });
}
