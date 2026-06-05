// PATH: app/api/roster/route.js
import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { normalizeName } from '@/lib/pdfParser';

export async function GET() {
  try {
    const [season] = await sql`SELECT id, name FROM seasons WHERE is_active = true LIMIT 1`;
    if (!season) return NextResponse.json({ error: 'No active season' }, { status: 404 });

    const teams = await sql`
      SELECT t.id, st.team_number, t.name
      FROM   teams t
      JOIN   season_teams st ON st.team_id = t.id
      WHERE  st.season_id = ${season.id}
      ORDER  BY st.team_number ASC
    `;

    const bowlers = await sql`
      SELECT b.id, sr.team_id, b.full_name, b.normalized_name,
             sr.is_sub, sr.book_average, b.email,
             b.normalized_name = 'VACANT' AS is_vacant
      FROM   bowlers b
      JOIN   season_roster sr ON sr.bowler_id = b.id
      WHERE  sr.season_id = ${season.id}
      ORDER  BY sr.is_sub ASC, b.normalized_name ASC
    `;

    const teamMap = teams.map(team => ({
      ...team,
      bowlers: bowlers.filter(b => b.team_id === team.id && !b.is_sub),
    }));

    const subs = bowlers.filter(b => b.is_sub);

    return NextResponse.json({
      seasonId: season.id,
      seasonName: season.name,
      teams: teamMap,
      subs,
    });
  } catch (err) {
    console.error('GET /api/roster error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { type, id, ...fields } = body;

    if (type === 'team') {
      const { name } = fields;
      if (!name?.trim()) return NextResponse.json({ error: 'Team name required' }, { status: 400 });
      await sql`UPDATE teams SET name = ${name.trim()} WHERE id = ${id}`;
      return NextResponse.json({ success: true });
    }

    if (type === 'bowler') {
      const { full_name, email } = fields;
      if (!full_name?.trim()) return NextResponse.json({ error: 'Full name required' }, { status: 400 });

      const normalizedName = full_name.trim().toUpperCase() === 'VACANT'
        ? 'VACANT'
        : normalizeName(full_name.trim());

      await sql`
        UPDATE bowlers
        SET full_name       = ${full_name.trim()},
            normalized_name = ${normalizedName},
            email           = ${email?.trim() || null}
        WHERE id = ${id}
      `;
      return NextResponse.json({ success: true, normalizedName });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (err) {
    console.error('PATCH /api/roster error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
