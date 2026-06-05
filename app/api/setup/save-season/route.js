// PATH: app/api/setup/save-season/route.js
import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function POST(request) {
  try {
    const { seasonName, teams, subs, weeks } = await request.json();

    if (!seasonName || !teams || teams.length === 0) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    // Delete existing season with this name.
    // CASCADE removes season_teams, season_roster, schedule, checkins,
    // game_results, progressive_pot, charity_fund — but NOT the permanent
    // bowlers or teams tables.
    const existing = await sql`SELECT id FROM seasons WHERE name = ${seasonName}`;
    if (existing.length > 0) {
      await sql`DELETE FROM seasons WHERE name = ${seasonName}`;
    }

    await sql`UPDATE seasons SET is_active = false WHERE is_active = true`;

    const [season] = await sql`
      INSERT INTO seasons (name, is_active)
      VALUES (${seasonName}, true)
      RETURNING id
    `;
    const seasonId = season.id;

    for (const team of teams) {
      // Find or create the permanent team record (matched by name)
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
          // Always insert a new VACANT row — never reuse an existing one.
          // A season can have multiple VACANT slots across different teams;
          // sharing one bowler_id would violate UNIQUE(season_id, bowler_id)
          // in season_roster.
          const [newBowler] = await sql`
            INSERT INTO bowlers (full_name, normalized_name, imported_name)
            VALUES ('VACANT', 'VACANT', 'VACANT')
            RETURNING id
          `;
          bowlerId = newBowler.id;
        } else {
          // Find or create permanent bowler record (matched by imported_name)
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
          const now = new Date();
          let year = now.getFullYear();
          if (mm < now.getMonth() + 1) year++;
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

    return NextResponse.json({ success: true, seasonId });
  } catch (err) {
    console.error('Save season error:', err);
    return NextResponse.json({ error: 'Failed to save season: ' + err.message }, { status: 500 });
  }
}
