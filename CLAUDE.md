# Bowling Poker Manager — Claude Code Standing Instructions

This file is PERMANENT. Never delete it. Task-specific instructions go in TASK.md
which self-deletes on completion.

---

## Project Overview
A Next.js 14 app managing a poker side-game for bowling leagues.
Multi-league, multi-season, slug-based routing.
GitHub: StarlightEnt/bowling-poker-manager
Hosting: Vercel (auto-deploy from main branch)

---

## Dev Environment
- Node: 24.16.0 (pinned via .nvmrc)
- Port: 3005 (`next dev -p 3005`)
- Package manager: npm
- Database: Neon (PostgreSQL) via DATABASE_URL in .env.local

---

## Database Migration Rules

### ALWAYS use Node scripts for schema changes — never ask the user to use the Neon console manually.

Migration script pattern:
```javascript
// migrations/YYYYMMDD-description.mjs
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

await sql`ALTER TABLE example ADD COLUMN IF NOT EXISTS new_col TEXT`;
await sql`UPDATE example SET new_col = 'default' WHERE new_col IS NULL`;

console.log('Migration complete');
```

Run with:
```powershell
node --use-system-ca --env-file=.env.local migrations/YYYYMMDD-description.mjs
```

### Migration rules:
- Always use `IF NOT EXISTS` on ALTER TABLE ADD COLUMN — makes scripts idempotent
- Always use `IF NOT EXISTS` on CREATE TABLE
- Never DROP or TRUNCATE without explicit user confirmation in the task spec
- Always include a verification SELECT after the migration to confirm it worked
- Save migration scripts to `migrations/` folder — never delete them after running
  (they serve as a permanent audit trail of schema changes)
- Always run migrations BEFORE writing application code that depends on them

---

## URL Structure
```
/                                    ← League picker
/new-league/                         ← New league setup
/[leagueSlug]/                       ← Season picker
/[leagueSlug]/[seasonSlug]/          ← Dashboard
/[leagueSlug]/[seasonSlug]/checkin
/[leagueSlug]/[seasonSlug]/gamenight
/[leagueSlug]/[seasonSlug]/report
/[leagueSlug]/[seasonSlug]/schedule
/[leagueSlug]/[seasonSlug]/roster
/[leagueSlug]/[seasonSlug]/history
/[leagueSlug]/[seasonSlug]/settings
/[leagueSlug]/[seasonSlug]/setup
```

---

## API Route Patterns

### Season resolution (use in every scoped API route):
```javascript
const url = new URL(request.url);
const parts = url.pathname.split('/').filter(Boolean);
const leagueSlug = parts[1];
const seasonSlug = parts[2];

const [season] = await sql`
  SELECT s.id, s.league_id FROM seasons s
  JOIN leagues l ON l.id = s.league_id
  WHERE l.slug = ${leagueSlug} AND s.slug = ${seasonSlug}
  LIMIT 1
`;
if (!season) return Response.json({ error: 'Season not found' }, { status: 404 });
const sid = season.id;
```

### Settings (always league-scoped, never season-scoped):
```javascript
const settings = await sql`
  SELECT key, value FROM settings WHERE league_id = ${season.league_id}
`;
```

### Week detection (day-agnostic — no hardcoded day of week):
```javascript
async function detectWeek(seasonId) {
  const today = new Date().toISOString().split('T')[0];

  // 1. Is today a bowling day?
  const [todayRow] = await sql`
    SELECT week_number FROM schedule
    WHERE season_id = ${seasonId} AND bowl_date::TEXT = ${today}
  `;
  if (todayRow) return todayRow.week_number;

  // 2. Most recent past week with activity
  const [recentRow] = await sql`
    SELECT s.week_number FROM schedule s
    WHERE s.season_id = ${seasonId}
      AND s.bowl_date::TEXT <= ${today}
      AND (
        EXISTS (SELECT 1 FROM checkins c
          WHERE c.season_id = s.season_id AND c.week_number = s.week_number)
        OR EXISTS (SELECT 1 FROM game_results g
          WHERE g.season_id = s.season_id AND g.week_number = s.week_number)
      )
    ORDER BY s.bowl_date DESC LIMIT 1
  `;
  if (recentRow) return recentRow.week_number;

  // 3. Next upcoming non-position-round week
  const [upcomingRow] = await sql`
    SELECT week_number FROM schedule
    WHERE season_id = ${seasonId}
      AND bowl_date::TEXT >= ${today}
      AND is_position_round = false
    ORDER BY bowl_date ASC LIMIT 1
  `;
  return upcomingRow?.week_number || null;
}
```

NEVER use hardcoded day-of-week numbers (e.g. `today.getDay() === 3`).
NEVER use `daysUntilWed` or similar day-specific variable names.
The schedule table bowl_date IS the source of truth for bowling days.

---

## Neon / Database Gotchas

1. **Numeric columns** return as strings — always wrap in `parseFloat()` or
   `parseInt()` before math
2. **Date columns** — always cast: `bowl_date::TEXT` in queries.
   Raw Neon date format breaks `new Date()` comparisons
3. **pdf-parse** — must use `require('pdf-parse/lib/pdf-parse.js')` directly,
   NOT `require('pdf-parse')`
4. **historical_checkins** — uses `season_name TEXT`, NOT a foreign key.
   Always query by season name string, never by season_id
5. **settings** — composite PK: `(league_id, key)`. Never query by key alone
6. **imported_name** on bowlers — immutable identity key. Set once at insert,
   NEVER updated. Used for PDF re-import matching
7. **Windows SSL** — when running standalone Node scripts against Neon on Windows:
   `node --use-system-ca --env-file=.env.local script.mjs`

---

## Schedule Date Year Logic

When parsing schedule PDFs, dates are MM/DD format only. Use `seasons.start_year`
(integer) as the authoritative year source — NOT today's date.

```javascript
const baseYear = startYear || new Date().getFullYear();
const firstMm = parseInt(weeks[0].bowl_date_str.split('/')[0]);
const [mm, dd] = week.bowl_date_str.split('/').map(Number);
// If month is earlier than first week's month, season rolled into next year
const year = mm >= firstMm ? baseYear : baseYear + 1;
bowlDate = `${year}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
```

---

## Code Style Rules

1. **No hardcoded league/venue names** in page components — always pull from DB
2. **'use client'** required on any component using hooks:
   usePathname, useRouter, useParams, useState, useEffect
3. **Server Components** cannot use hooks — keep API fetching in Client Components
   or Route Handlers
4. **All fetch URLs** in page components must use slug params:
   `fetch(\`/api/\${leagueSlug}/\${seasonSlug}/endpoint\`)`
5. **Nav links** inside league+season must include slug prefix:
   `href={\`/\${leagueSlug}/\${seasonSlug}/checkin\`}`
6. **Rainbow border** — implemented as wrapper div with gradient background
   + 2px padding. Inner card has solid background. NOT a CSS border property

---

## Financial Formula
```
Pool = playerCount × buyin_amount
Progressive set-aside = progressive_nightly (default $3/night)
Payout total = floor((Pool - progressive_nightly) / 4) × 3
Charity = Pool - progressive_nightly - Payout total
Per game = totals / 3
```

- progressive_nightly MUST divide evenly by 3 — validate on input
- charity_fund entries at lock time include donations (one combined entry)
- Never add charitable_donations separately to charity running totals

---

## Slug Rules
- **League slug**: first 3 chars of each word — `LGBT Wednesday Community` → `LGBTWedCom`
- **Season slug**: abbreviation + year(s):
  - `Summer '26` → `Sum26`
  - `Fall '26` → `Fal26`
  - `Winter '26` → `Win26`
  - `Spring '26` → `Spr26`
  - `Winter/Spring '26` → `WS26`
  - `Spring/Summer '26` → `SS26`
  - `Summer/Fall '26` → `SF26`
  - `Fall/Winter '26-'27` → `FW2627`
- Both auto-generated but always user-editable before saving

---

## Design System
- Background: `#0d0d0f`
- Surface: `#141417`
- Surface2: `#1a1a1e`
- Accent yellow: `#e8ff47`
- Accent orange: `#ff6b35`
- Green: `#3dffa0`
- Blue: `#4fa3ff`
- Red: `#ff4444`
- Muted: `#555`
- Border: `#222`
- Fonts: Bebas Neue (headers), DM Mono (data/body)
- Form labels: `#e8ff47` bold uppercase 10px letterSpacing 1px
- Lane card bg: `#0d2a2a`, border: `#1a4040`
- Lane team accent: `#c084fc` (lavender — V2 configurable)
- Rainbow gradient: `linear-gradient(135deg, #FF0018 0%, #FFA52C 14%,
  #FFFF41 28%, #008018 42%, #0000F9 57%, #86007D 71%, #FF0018 85%, #FFA52C 100%)`

---

## Task File Convention
- **This file (CLAUDE.md)**: permanent, never deleted, always read on startup
- **TASK.md**: one-off task instructions, always ends with instruction to
  self-delete on successful completion
- When given a task, always check for TASK.md in the project root and
  execute it after reading this file
