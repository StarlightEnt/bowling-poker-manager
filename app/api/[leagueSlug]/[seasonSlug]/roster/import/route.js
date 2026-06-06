import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { parseRosterPDF, normalizeName } from '@/lib/pdfParser';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const url = new URL(request.url);
  const { searchParams } = url;
  const isPreview = searchParams.get('preview') !== 'false';
  const parts = url.pathname.split('/').filter(Boolean);
  const leagueSlug = parts[1];
  const seasonSlug = parts[2];

  try {
    const [season] = await sql`
      SELECT s.id FROM seasons s
      JOIN leagues l ON l.id = s.league_id
      WHERE l.slug = ${leagueSlug} AND s.slug = ${seasonSlug}
      LIMIT 1
    `;
    if (!season) return NextResponse.json({ error: 'Season not found' }, { status: 404 });
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
              await sql`
                UPDATE season_roster
                SET book_average = ${change.newAverage}
                WHERE bowler_id = ${change.bowlerId} AND season_id = ${seasonId}
              `;
              applied++;
              break;
            }

            case 'new_bowler': {
              const [team] = await sql`
                SELECT t.id FROM teams t
                JOIN season_teams st ON st.team_id = t.id
                WHERE st.season_id = ${seasonId} AND st.team_number = ${change.teamNumber}
              `;
              if (!team) break;

              let [dbBowler] = await sql`SELECT id FROM bowlers WHERE imported_name = ${change.fullName}`;
              if (!dbBowler) {
                const normalizedName = normalizeName(change.fullName);
                [dbBowler] = await sql`
                  INSERT INTO bowlers (full_name, normalized_name, imported_name)
                  VALUES (${change.fullName}, ${normalizedName}, ${change.fullName})
                  RETURNING id
                `;
              }

              await sql`
                INSERT INTO season_roster (season_id, bowler_id, team_id, position_order, book_average, is_sub)
                VALUES (${seasonId}, ${dbBowler.id}, ${team.id}, ${change.positionOrder}, ${change.bookAverage || null}, false)
              `;
              applied++;
              break;
            }

            case 'delete_vacant': {
              await sql`DELETE FROM season_roster WHERE bowler_id = ${change.bowlerId} AND season_id = ${seasonId}`;
              await sql`DELETE FROM bowlers WHERE id = ${change.bowlerId} AND normalized_name = 'VACANT'`;
              applied++;
              break;
            }

            case 'promote_sub': {
              const [team] = await sql`
                SELECT t.id FROM teams t
                JOIN season_teams st ON st.team_id = t.id
                WHERE st.season_id = ${seasonId} AND st.team_number = ${change.teamNumber}
              `;
              if (!team) break;
              await sql`
                UPDATE season_roster
                SET team_id = ${team.id}, is_sub = false, position_order = ${change.positionOrder}
                WHERE bowler_id = ${change.bowlerId} AND season_id = ${seasonId}
              `;
              applied++;
              break;
            }

            case 'move_to_subs': {
              await sql`
                UPDATE season_roster
                SET team_id = null, is_sub = true
                WHERE bowler_id = ${change.bowlerId} AND season_id = ${seasonId}
              `;
              applied++;
              break;
            }

            case 'new_sub': {
              let [dbBowler] = await sql`SELECT id FROM bowlers WHERE imported_name = ${change.fullName}`;
              if (!dbBowler) {
                const normalizedName = normalizeName(change.fullName);
                [dbBowler] = await sql`
                  INSERT INTO bowlers (full_name, normalized_name, imported_name)
                  VALUES (${change.fullName}, ${normalizedName}, ${change.fullName})
                  RETURNING id
                `;
              }

              await sql`
                INSERT INTO season_roster (season_id, bowler_id, team_id, position_order, book_average, is_sub)
                VALUES (${seasonId}, ${dbBowler.id}, null, 0, ${change.bookAverage || null}, true)
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

    const dbTeams = await sql`
      SELECT t.id, st.team_number, t.name
      FROM   teams t
      JOIN   season_teams st ON st.team_id = t.id
      WHERE  st.season_id = ${seasonId}
      ORDER  BY st.team_number ASC
    `;
    const dbBowlers = await sql`
      SELECT b.id, sr.team_id, b.full_name, b.normalized_name, b.imported_name,
             sr.is_sub, sr.position_order, sr.book_average
      FROM   bowlers b
      JOIN   season_roster sr ON sr.bowler_id = b.id
      WHERE  sr.season_id = ${seasonId}
    `;

    const changes = [];

    for (const pdfTeam of pdfTeams) {
      const dbTeam = dbTeams.find(t => t.team_number === pdfTeam.team_number);
      if (!dbTeam) continue;
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

    for (const pdfTeam of pdfTeams) {
      const dbTeam = dbTeams.find(t => t.team_number === pdfTeam.team_number);
      if (!dbTeam) continue;

      const teamBowlers = dbBowlers.filter(b => b.team_id === dbTeam.id && !b.is_sub);
      const dbSubs = dbBowlers.filter(b => b.is_sub);
      const matchedDbIds = new Set();

      pdfTeam.bowlers.forEach((pdfBowler, posIdx) => {
        if (pdfBowler.normalized_name === 'VACANT') return;

        const positionOrder = posIdx + 1;
        const importedName = pdfBowler.full_name;

        const teamMatch = teamBowlers.find(b => b.imported_name === importedName);
        if (teamMatch) {
          matchedDbIds.add(teamMatch.id);
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

        const subMatch = dbSubs.find(b => b.imported_name === importedName);
        if (subMatch) {
          matchedDbIds.add(subMatch.id);

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

    const dbSubs = dbBowlers.filter(b => b.is_sub);
    for (const pdfSub of pdfSubs) {
      const importedName = pdfSub.full_name;

      const existingSub = dbSubs.find(b => b.imported_name === importedName);
      if (existingSub) {
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

      const existingTeamBowler = dbBowlers.find(b => !b.is_sub && b.imported_name === importedName);
      if (existingTeamBowler) continue;

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
