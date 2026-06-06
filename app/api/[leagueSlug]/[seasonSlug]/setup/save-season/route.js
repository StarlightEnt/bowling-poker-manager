import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const leagueSlug = parts[1];

    const { seasonName, seasonSlug, startYear, teams, subs, weeks } = await request.json();

    if (!seasonName || !seasonSlug || !teams || teams.length === 0) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    const [league] = await sql`SELECT id FROM leagues WHERE slug = ${leagueSlug}`;
    if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 });

    // Delete existing season with this name under this league (re-import case)
    const existing = await sql`SELECT id FROM seasons WHERE name = ${seasonName} AND league_id = ${league.id}`;
    if (existing.length > 0) {
      await sql`DELETE FROM seasons WHERE name = ${seasonName} AND league_id = ${league.id}`;
    }

    await sql`UPDATE seasons SET is_active = false WHERE league_id = ${league.id} AND is_active = true`;

    const [season] = await sql`
      INSERT INTO seasons (name, slug, league_id, is_active, start_year)
      VALUES (${seasonName}, ${seasonSlug}, ${league.id}, true, ${startYear || new Date().getFullYear()})
      RETURNING id
    `;
    const seasonId = season.id;

    for (const team of teams) {
      let [dbTeam] = await sql`SELECT id FROM teams WHERE name = ${team.name}`;
      if (!dbTeam) {
        [dbTeam] = await sql`INSERT INTO teams (name) VALUES (${team.name}) RETURNING id`;
      }
      const teamId = dbTeam.id;

      await sql`
        INSERT INTO season_teams (season_id, team_id, team_number)
        VALUES (${seasonId}, ${teamId}, ${team.team_number})
      `;

      for (let i = 0; i < team.bowlers.length; i++) {
        const b = team.bowlers[i];
        let bowlerId;

        if (b.normalized_name === 'VACANT') {
          const [newBowler] = await sql`
            INSERT INTO bowlers (full_name, normalized_name, imported_name)
            VALUES ('VACANT', 'VACANT', 'VACANT')
            RETURNING id
          `;
          bowlerId = newBowler.id;
        } else {
          let [dbBowler] = await sql`SELECT id FROM bowlers WHERE imported_name = ${b.full_name}`;
          if (!dbBowler) {
            [dbBowler] = await sql`
              INSERT INTO bowlers (full_name, normalized_name, imported_name)
              VALUES (${b.full_name}, ${b.normalized_name}, ${b.full_name})
              RETURNING id
            `;
          }
          bowlerId = dbBowler.id;
        }

        await sql`
          INSERT INTO season_roster (season_id, bowler_id, team_id, position_order, book_average, is_sub)
          VALUES (${seasonId}, ${bowlerId}, ${teamId}, ${i + 1}, ${b.book_average || null}, false)
        `;
      }
    }

    for (let i = 0; i < subs.length; i++) {
      const s = subs[i];
      let [dbBowler] = await sql`SELECT id FROM bowlers WHERE imported_name = ${s.full_name}`;
      if (!dbBowler) {
        [dbBowler] = await sql`
          INSERT INTO bowlers (full_name, normalized_name, imported_name)
          VALUES (${s.full_name}, ${s.normalized_name}, ${s.full_name})
          RETURNING id
        `;
      }

      await sql`
        INSERT INTO season_roster (season_id, bowler_id, team_id, position_order, book_average, is_sub)
        VALUES (${seasonId}, ${dbBowler.id}, null, ${i + 1}, ${s.book_average || null}, true)
      `;
    }

    if (weeks && weeks.length > 0) {
      for (const week of weeks) {
        let bowlDate = null;
        if (week.bowl_date_str) {
          const [mm, dd] = week.bowl_date_str.split('/').map(Number);
          const baseYear = startYear || new Date().getFullYear();
          const firstMm = weeks.length > 0
            ? parseInt(weeks[0].bowl_date_str.split('/')[0])
            : mm;
          const year = mm >= firstMm ? baseYear : baseYear + 1;
          bowlDate = `${year}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
        }

        let lanePositions = null;
        if (!week.is_position_round && week.lane_pairs && week.lane_pairs.length > 0) {
          lanePositions = week.lane_pairs.flatMap(p => [p.home, p.away]);
        }

        await sql`
          INSERT INTO schedule (
            season_id, week_number, bowl_date,
            starting_lane, lane_positions,
            is_position_round, notes
          ) VALUES (
            ${seasonId},
            ${week.week_number},
            ${bowlDate},
            ${week.starting_lane || 1},
            ${lanePositions ? JSON.stringify(lanePositions) : null},
            ${week.is_position_round || false},
            ${week.notes || null}
          )
          ON CONFLICT (season_id, week_number) DO NOTHING
        `;
      }
    }

    // Auto-populate season start_date and end_date from schedule
    await sql`
      UPDATE seasons SET
        start_date = (SELECT MIN(bowl_date) FROM schedule WHERE season_id = ${seasonId}),
        end_date   = (SELECT MAX(bowl_date) FROM schedule WHERE season_id = ${seasonId})
      WHERE id = ${seasonId}
    `;

    return NextResponse.json({ success: true, seasonId, seasonSlug });
  } catch (err) {
    console.error('Save season error:', err);
    return NextResponse.json({ error: 'Failed to save season: ' + err.message }, { status: 500 });
  }
}
