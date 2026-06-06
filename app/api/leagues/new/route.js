import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { name, slug, venue_name, venue_city, venue_state,
          charity_name, accent_color, buyin_amount, progressive_nightly } = await request.json();
  const existing = await sql`SELECT id FROM leagues WHERE slug = ${slug}`;
  if (existing.length > 0) return Response.json({ error: 'Slug already in use' }, { status: 400 });
  const [league] = await sql`
    INSERT INTO leagues (name, slug, venue_name, venue_city, venue_state, charity_name, accent_color)
    VALUES (${name}, ${slug}, ${venue_name}, ${venue_city}, ${venue_state}, ${charity_name}, ${accent_color})
    RETURNING id
  `;
  await sql`
    INSERT INTO settings (league_id, key, value) VALUES
      (${league.id}, 'buyin_amount', ${String(buyin_amount)}),
      (${league.id}, 'progressive_nightly', ${String(progressive_nightly)})
  `;
  return Response.json({ ok: true, slug });
}
