// PATH: app/api/setup/save-season/route.js
import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function POST(request) {
  try {
    const { seasonName, teams, subs, weeks } = await request.json();

    if (!seasonName || !teams || teams.length === 0) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    // If a season with this name already exists, delete it
    // ON DELETE CASCADE handles teams, bowlers, schedule, checkins, game_results, etc.
    const existing = await sql`SELECT id FROM seasons WHERE name = ${seasonName}`;
    if (existing.length > 0) {
      await sql`DELETE FROM seasons WHERE name = ${seasonName}`;
    }

    // Deactivate any other active seasons
    await sql`UPDATE seasons SET is_active = false WHERE is_active = true`;

    // Create new season
    const [season] = await sql`
      INSERT INTO seasons (name, is_active)
      VALUES (${seasonName}, true)
      RETURNING id
    `;
    const seasonId = season.id;

    // Insert teams — build team_number → db_id map for schedule use
    const teamIdMap = {};
    for (const team of teams) {
      const [savedTeam] = await sql`
        INSERT INTO teams (season_id, team_number, name)
        VALUES (${seasonId}, ${team.team_number}, ${team.name})
        RETURNING id
      `;
      teamIdMap[team.team_number] = savedTeam.id;

      for (let i = 0; i < team.bowlers.length; i++) {
        const b = team.bowlers[i];
        await sql`
          INSERT INTO bowlers (team_id, season_id, full_name, normalized_name, is_sub, position_order, book_average)
          VALUES (${savedTeam.id}, ${seasonId}, ${b.full_name}, ${b.normalized_name}, false, ${i + 1}, ${b.book_average || null})
        `;
      }
    }

    // Insert substitutes (no team)
    for (let i = 0; i < subs.length; i++) {
      const s = subs[i];
      await sql`
        INSERT INTO bowlers (team_id, season_id, full_name, normalized_name, is_sub, position_order, book_average)
        VALUES (null, ${seasonId}, ${s.full_name}, ${s.normalized_name}, true, ${i + 1}, ${s.book_average || null})
      `;
    }

    // Insert schedule weeks
    if (weeks && weeks.length > 0) {
      for (const week of weeks) {
        // Parse date MM/DD — roll to next year if month already passed
        let bowlDate = null;
        if (week.bowl_date_str) {
          const [mm, dd] = week.bowl_date_str.split('/').map(Number);
          const now = new Date();
          let year = now.getFullYear();
          if (mm < now.getMonth() + 1) year++;
          bowlDate = `${year}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
        }

        // Build lane_positions: one entry per individual lane, left to right.
        // PDF gives pairs (9-3 = team 9 on one lane, team 3 on the next lane).
        // Flatten: [9, 3, 1, 10, ...] → 12 entries for 12 teams.
        // Index N = team at lane (starting_lane + N).
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
