// PATH: lib/pdfParser.js

export function normalizeName(fullName) {
  const cleaned = fullName
    .replace(/-\*.*$/, '')
    .replace(/-[A-Za-z]+$/, '')
    .trim();
  const parts = cleaned.split(/\s+/);
  if (parts.length === 0) return cleaned;
  const first = parts[0];
  const skip = new Set(['II', 'III', 'IV', 'JR', 'SR', 'JR.', 'SR.']);
  let lastIdx = parts.length - 1;
  while (lastIdx > 0 && skip.has(parts[lastIdx].toUpperCase())) lastIdx--;
  const lastInitial = lastIdx > 0 ? parts[lastIdx][0].toUpperCase() : '';
  return lastInitial ? `${first} ${lastInitial}` : first;
}

function isBowlerLine(line) {
  if (/\d{3}-\d{5}/.test(line)) return false;
  if (/^(BLS-|--|Last Week|Div |Scratch|Handicap|Local|USBC|Upcoming|Name DOB|Real High|Name Average|RealHigh|NameAverage|NameID)/.test(line)) return false;
  return true;
}

function parseBowlerLine(line) {
  // Format A (space-separated): "Mark Bertelsen 156 3 470 48 ... 171"
  const parts = line.split(/\s+/);
  let nameEndIdx = 0;
  for (let j = 0; j < parts.length; j++) {
    if (/^\d+$/.test(parts[j])) { nameEndIdx = j; break; }
  }
  if (nameEndIdx > 0) {
    const rawName = parts.slice(0, nameEndIdx).join(' ');
    const bookAvg = parseInt(parts[parts.length - 1]) || 0;
    return { rawName, bookAvg };
  }

  // Format B (mashed): "Mark Bertelsen156347048200470248614124146200470171"
  // Also handles zero-game bowlers: "Robert Hughes-*003700a178a178a178534183"
  // Book avg = last 3 digits of the entire string
  const m = line.match(/^([A-Za-z][A-Za-z\s\.\'\-\*]+?)(\d[\d\sa]*)$/);
  if (m) {
    const rawName = m[1].trim();
    const numStr = m[2].replace(/[^0-9]/g, '');
    const bookAvg = parseInt(numStr.slice(-3)) || 0;
    return { rawName, bookAvg };
  }

  return null;
}

export function parseRosterPDF(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const teams = [];
  const subs = [];
  let currentTeam = null;
  let inRosters = false;
  let inSubs = false;
  let inBirthdays = false;
  let pendingTeamHeader = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Stop at page 4
    if (line === 'QUEER BOWLING' || /Page 4/.test(line)) break;

    // Track sections to skip
    if (line.startsWith('Upcoming') || line.startsWith('Local and')) { inBirthdays = true; continue; }
    if (inBirthdays && line.startsWith('Temporary Substitutes')) {
      inBirthdays = false; inSubs = true; inRosters = false; currentTeam = null; continue;
    }
    if (inBirthdays) continue;

    if (line === 'Team Rosters') { inRosters = true; continue; }
    if (line.startsWith('Temporary Substitutes')) { inSubs = true; inRosters = false; currentTeam = null; continue; }
    if (line.startsWith('Last Week')) { inRosters = false; continue; }

    if (!inRosters && !inSubs) continue;
    if (!isBowlerLine(line)) continue;

    if (inSubs) {
      const parsed = parseBowlerLine(line);
      if (!parsed || !parsed.rawName || parsed.rawName.length < 2) continue;
      if (/^(Name|Real|Book)/.test(parsed.rawName)) continue;
      subs.push({
        full_name: parsed.rawName,
        normalized_name: normalizeName(parsed.rawName),
        book_average: parsed.bookAvg,
        is_sub: true
      });
      continue;
    }

    if (inRosters) {
      // Format A (Week 2+): "1 - Snappy BackendsLane 7"
      const teamMatchA = line.match(/^(\d+)\s*-\s*(.+?)Lane\s+(\d+)$/);
      if (teamMatchA) {
        currentTeam = { team_number: parseInt(teamMatchA[1]), name: teamMatchA[2].trim(), lane: parseInt(teamMatchA[3]), bowlers: [] };
        teams.push(currentTeam);
        pendingTeamHeader = null;
        continue;
      }

      // Format B part 1 (Week 1): "1 - Snappy Backends"
      const teamMatchB = line.match(/^(\d+)\s*-\s*([A-Za-z].+)$/);
      if (teamMatchB && !/\d{3,}/.test(teamMatchB[2])) {
        pendingTeamHeader = { num: parseInt(teamMatchB[1]), name: teamMatchB[2].trim() };
        continue;
      }

      // Format B part 2: "Lane 13"
      if (pendingTeamHeader) {
        const laneMatch = line.match(/^Lane\s+(\d+)$/);
        if (laneMatch) {
          currentTeam = { team_number: pendingTeamHeader.num, name: pendingTeamHeader.name, lane: parseInt(laneMatch[1]), bowlers: [] };
          teams.push(currentTeam);
          pendingTeamHeader = null;
          continue;
        }
        pendingTeamHeader = null;
      }

      if (!currentTeam) continue;

      // VACANT is a legitimate placeholder — add as a bowler
      if (/^VACANT/.test(line)) {
        currentTeam.bowlers.push({
          full_name: 'VACANT',
          normalized_name: 'VACANT',
          book_average: null,
          is_sub: false
        });
        continue;
      }

      // Skip page header lines like "LGBT Wednesday Community Summer 2026..."
      if (/^LGBT\s+Wednesday/i.test(line)) continue;

      const parsed = parseBowlerLine(line);
      if (!parsed || !parsed.rawName || parsed.rawName.length < 2) continue;
      if (/^(Name|Real|Book|Last|Div|Scratch|Handicap)/.test(parsed.rawName)) continue;

      const fullName = parsed.rawName.replace(/-\*$/, '').replace(/-[A-Za-z]+$/, '').trim();
      currentTeam.bowlers.push({
        full_name: fullName,
        normalized_name: normalizeName(parsed.rawName),
        book_average: parsed.bookAvg,
        is_sub: false
      });
    }
  }

  return { teams, subs };
}

export function parseSchedulePDF(text) {
  // Pre-process: join continuation lines onto their Wk line.
  // Case 1 - Wk12: "Wk12 07/22 6- 5 2" / "-  1  12-11  4- 3..." (split mid-pair)
  // Case 2 - Wk15: "Wk15 08/12 " / "{" (position round indicator on next line)
  const rawLines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const lines = [];
  for (const line of rawLines) {
    const isWkLine = /^Wk\d{2}/.test(line);
    const prevIsWk = lines.length > 0 && /^Wk\d{2}/.test(lines[lines.length - 1]);
    const isContinuation = !isWkLine && prevIsWk && (
      /^-\s*\d/.test(line) || line === '{'
    );
    if (isContinuation) {
      lines[lines.length - 1] += ' ' + line;
    } else {
      lines.push(line);
    }
  }

  const weeks = [];

  for (const line of lines) {
    const wkMatch = line.match(/^Wk(\d{2})\s+(\d{2}\/\d{2})\s*(.*)$/);
    if (!wkMatch) continue;

    const weekNum = parseInt(wkMatch[1]);
    const dateStr = wkMatch[2];
    // Normalize "2 -  1" (digit space dash space digit from split lines) → "2-1"
    const rest = (wkMatch[3] || '').replace(/(\d)\s+-\s+(\d)/g, '$1-$2');
    const isPositionRound = /position\s*round/i.test(rest) || rest.trim() === '{';

    const pairMatches = [...rest.matchAll(/(\d+)-\s*(\d+)/g)];
    const lanePairs = pairMatches.map(m => ({
      home: parseInt(m[1]),
      away: parseInt(m[2])
    }));

    weeks.push({
      week_number: weekNum,
      bowl_date_str: dateStr,
      lane_pairs: lanePairs,
      is_position_round: isPositionRound,
      starting_lane: 1,
    });
  }

  return weeks;
}
