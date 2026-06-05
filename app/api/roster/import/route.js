// PATH: app/api/roster/import/route.js
import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { parseRosterPDF, normalizeName } from '@/lib/pdfParser';

// POST ?preview=true  → returns diff, no DB writes
// POST ?preview=false → commits accepted changes from diff payload

export async function POST(request) {
  const { searchParams } = new URL(request.url);
  const isPreview = searchParams.get('preview') !== 'false';

  try {
    const [season] = await sql`SELECT id FROM seasons WHERE is_active = true LIMIT 1`;
    if (!season) return NextResponse.json({ error: 'No active season' }, { status: 404 });
    const seasonId = season.id;

    // ── COMMIT MODE ──────────────────────────────────────────────────────────
    if (!isPreview) {
      const { accepted } = await request.json();
      if (!accepted || !accepted.length) {
        return NextResponse.json({ success: true, applied: 0 });
      }

      let applied = 0;

      for (const change of accepted) {
        try {
          switch (change.type) {

            case 'team_name': {
              await sql`UPDATE teams SET name = ${change.newName} WHERE id = ${change.teamId}`;
              applied++;
              break;
            }

            case 'bowler_average': {
              await sql`UPDATE bowlers SET book_average = ${change.newAverage} WHERE id = ${change.bowlerId}`;
              applied++;
              break;
            }

            case 'new_bowler': {
              // Get team db id
              const [team] = await sql`SELECT id FROM teams WHERE season_id = ${seasonId} AND team_number = ${change.teamNumber}`;
              if (!team) break;
              const normalizedName = normalizeName(change.fullName);
              await sql`
                INSERT INTO bowlers (team_id, season_id, full_name, normalized_name, imported_name, is_sub, position_order, book_average)
                VALUES (${team.id}, ${seasonId}, ${change.fullName}, ${normalizedName}, ${change.fullName}, false, ${change.positionOrder}, ${change.bookAverage || null})
              `;
              applied++;
              break;
            }

            case 'delete_vacant': {
              // Safe — VACANT rows never have transactional data
              await sql`DELETE FROM bowlers WHERE id = ${change.bowlerId} AND normalized_name = 'VACANT'`;
              applied++;
              break;
            }

            case 'promote_sub': {
              // Sub becomes a team member — keep all history
              const [team] = await sql`SELECT id FROM teams WHERE season_id = ${seasonId} AND team_number = ${change.teamNumber}`;
              if (!team) break;
              await sql`
                UPDATE bowlers
                SET team_id = ${team.id}, is_sub = false, position_order = ${change.positionOrder}
                WHERE id = ${change.bowlerId}
              `;
              applied++;
              break;
            }

            case 'move_to_subs': {
              // Team member moves to sub list — keep all history
              await sql`
                UPDATE bowlers
                SET team_id = null, is_sub = true
                WHERE id = ${change.bowlerId}
              `;
              applied++;
              break;
            }

            case 'new_sub': {
              const normalizedName = normalizeName(change.fullName);
              await sql`
                INSERT INTO bowlers (team_id, season_id, full_name, normalized_name, imported_name, is_sub, position_order, book_average)
                VALUES (null, ${seasonId}, ${change.fullName}, ${normalizedName}, ${change.fullName}, true, 0, ${change.bookAverage || null})
              `;
              applied++;
              break;
            }
          }
        } catch (err) {
          console.error(`Failed applying change type=${change.type}:`, err);
        }
      }

      return NextResponse.json({ success: true, applied });
    }

    // ── PREVIEW MODE ─────────────────────────────────────────────────────────
    const formData = await request.formData();
    const file = formData.get('pdf');
    if (!file) return NextResponse.json({ error: 'No PDF uploaded' }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pdfParse = require('pdf-parse/lib/pdf-parse.js');
    const parsed = await pdfParse(buffer);
    const { teams: pdfTeams, subs: pdfSubs } = parseRosterPDF(parsed.text);

    // Load current DB state
    const dbTeams = await sql`
      SELECT id, team_number, name FROM teams WHERE season_id = ${seasonId} ORDER BY team_number ASC
    `;
    const dbBowlers = await sql`
      SELECT id, team_id, full_name, normalized_name, imported_name, is_sub, position_order, book_average
      FROM bowlers WHERE season_id = ${seasonId}
    `;

    const changes = [];

    // ── Team name changes ────────────────────────────────────────────────────
    for (const pdfTeam of pdfTeams) {
      const dbTeam = dbTeams.find(t => t.team_number === pdfTeam.team_number);
      if (!dbTeam) continue; // new team — not handled (rare, would require season reset)
      if (pdfTeam.name.trim() !== dbTeam.name.trim()) {
        changes.push({
          type: 'team_name',
          teamId: dbTeam.id,
          teamNumber: dbTeam.team_number,
          oldName: dbTeam.name,
          newName: pdfTeam.name.trim(),
          label: `Team ${dbTeam.team_number} name`,
          description: `"${dbTeam.name}" → "${pdfTeam.name.trim()}"`,
        });
      }
    }

    // ── Per-team bowler changes ──────────────────────────────────────────────
    for (const pdfTeam of pdfTeams) {
      const dbTeam = dbTeams.find(t => t.team_number === pdfTeam.team_number);
      if (!dbTeam) continue;

      const teamBowlers = dbBowlers.filter(b => b.team_id === dbTeam.id && !b.is_sub);
      const dbSubs = dbBowlers.filter(b => b.is_sub);

      // Track which DB bowlers on this team were matched
      const matchedDbIds = new Set();

      pdfTeam.bowlers.forEach((pdfBowler, posIdx) => {
        if (pdfBowler.normalized_name === 'VACANT') return;

        const positionOrder = posIdx + 1;
        const importedName = pdfBowler.full_name;

        // 1. Try match on this team by imported_name
        const teamMatch = teamBowlers.find(b => b.imported_name === importedName);
        if (teamMatch) {
          matchedDbIds.add(teamMatch.id);
          // Average update?
          const newAvg = pdfBowler.book_average || null;
          const oldAvg = teamMatch.book_average ? parseInt(teamMatch.book_average) : null;
          if (newAvg !== oldAvg) {
            changes.push({
              type: 'bowler_average',
              bowlerId: teamMatch.id,
              teamNumber: pdfTeam.team_number,
              bowlerName: teamMatch.full_name,
              oldAverage: oldAvg,
              newAverage: newAvg,
              label: `${teamMatch.full_name} average`,
              description: `${oldAvg ?? '—'} → ${newAvg ?? '—'}`,
            });
          }
          return;
        }

        // 2. Try match in subs by imported_name — promote to team
        const subMatch = dbSubs.find(b => b.imported_name === importedName);
        if (subMatch) {
          matchedDbIds.add(subMatch.id);

          // Is there a VACANT at this position to remove?
          const vacantAtPos = teamBowlers.find(b => b.normalized_name === 'VACANT' && b.position_order === positionOrder);
          if (vacantAtPos) {
            changes.push({
              type: 'delete_vacant',
              bowlerId: vacantAtPos.id,
              teamNumber: pdfTeam.team_number,
              label: `Remove VACANT slot`,
              description: `Team ${pdfTeam.team_number} position ${positionOrder}`,
            });
          }

          changes.push({
            type: 'promote_sub',
            bowlerId: subMatch.id,
            teamNumber: pdfTeam.team_number,
            positionOrder,
            bowlerName: subMatch.full_name,
            label: `${subMatch.full_name} promoted to team`,
            description: `Sub → Team ${pdfTeam.team_number} position ${positionOrder}`,
          });
          return;
        }

        // 3. Brand new bowler — check if VACANT at this position
        const vacantAtPos = teamBowlers.find(b => b.normalized_name === 'VACANT' && b.position_order === positionOrder);
        if (vacantAtPos) {
          changes.push({
            type: 'delete_vacant',
            bowlerId: vacantAtPos.id,
            teamNumber: pdfTeam.team_number,
            label: `Remove VACANT slot`,
            description: `Team ${pdfTeam.team_number} position ${positionOrder}`,
          });
        }

        changes.push({
          type: 'new_bowler',
          teamNumber: pdfTeam.team_number,
          fullName: importedName,
          positionOrder,
          bookAverage: pdfBowler.book_average || null,
          label: `New bowler: ${importedName}`,
          description: `Team ${pdfTeam.team_number} position ${positionOrder}`,
        });
      });

      // Bowlers on this team not matched by PDF → move to subs
      for (const dbBowler of teamBowlers) {
        if (matchedDbIds.has(dbBowler.id)) continue;
        if (dbBowler.normalized_name === 'VACANT') continue;
        changes.push({
          type: 'move_to_subs',
          bowlerId: dbBowler.id,
          teamNumber: pdfTeam.team_number,
          bowlerName: dbBowler.full_name,
          label: `${dbBowler.full_name} moved to subs`,
          description: `No longer on Team ${pdfTeam.team_number}`,
        });
      }
    }

    // ── Sub list changes ─────────────────────────────────────────────────────
    const dbSubs = dbBowlers.filter(b => b.is_sub);
    for (const pdfSub of pdfSubs) {
      const importedName = pdfSub.full_name;

      // Already exists as sub?
      const existingSub = dbSubs.find(b => b.imported_name === importedName);
      if (existingSub) {
        // Average update?
        const newAvg = pdfSub.book_average || null;
        const oldAvg = existingSub.book_average ? parseInt(existingSub.book_average) : null;
        if (newAvg !== oldAvg) {
          changes.push({
            type: 'bowler_average',
            bowlerId: existingSub.id,
            teamNumber: null,
            bowlerName: existingSub.full_name,
            oldAverage: oldAvg,
            newAverage: newAvg,
            label: `${existingSub.full_name} average`,
            description: `${oldAvg ?? '—'} → ${newAvg ?? '—'} (sub)`,
          });
        }
        continue;
      }

      // Already exists as team bowler? (handled above via promote logic — skip here)
      const existingTeamBowler = dbBowlers.find(b => !b.is_sub && b.imported_name === importedName);
      if (existingTeamBowler) continue;

      // Brand new sub
      changes.push({
        type: 'new_sub',
        fullName: importedName,
        bookAverage: pdfSub.book_average || null,
        label: `New sub: ${importedName}`,
        description: `Added to substitute list`,
      });
    }

    return NextResponse.json({
      preview: true,
      changeCount: changes.length,
      changes,
    });

  } catch (err) {
    console.error('Roster import error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
