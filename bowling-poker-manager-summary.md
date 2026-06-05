# Bowling Poker Manager — Project Summary
*As of June 5, 2026*

## How We Work Together
- Discuss and agree on approach BEFORE writing any code
- **Present the plan/summary first — STOP and wait for explicit "go ahead" confirmation before writing any code**
- Work one step at a time — wait for confirmation/acknowledgement before proceeding to the next file or step
- Always deliver complete downloadable files — NEVER ask the user to make surgical edits
- Always specify full file paths when providing files to update
- Be clear about whether a file is NEW or a REPLACEMENT — never present ambiguous file deliveries
- Remind me to restart the server or redeploy after any file changes
- Be accurate — never claim something is done unless it is verified

## Security Rules
- NEVER suggest putting credentials, tokens, or secrets in chat or in git
- `.env.local` is always created manually on each machine, never committed
- If credentials are accidentally exposed, rotate them immediately in Neon console

---

## Project Overview
A web app replacing a manual Excel spreadsheet to manage a poker side-game during the LGBT Wednesday Community bowling league at Classic Bowling Center, San Francisco. Players pay $5 buy-in, draw cards for spares/strikes during 3 bowling games, and best 5-card poker hand wins each game.

Built to be sold/licensed to other leagues — must be robust, multi-season, multi-league capable.

---

## Tech Stack
- **Frontend**: Next.js 14 (JavaScript, App Router), Tailwind CSS
- **Database**: Neon (PostgreSQL) — project: `bowling-poker-manager`
- **Hosting**: Vercel — auto-deploy from GitHub
- **GitHub**: `StarlightEnt/bowling-poker-manager`
- **PDF Parsing**: `pdf-parse@1.1.1` (via `pdf-parse/lib/pdf-parse.js`)
- **Image Export**: `html-to-image`

## Dev Environments
- **Home Windows**: `C:\Users\allis\DevProjects\bowling-poker-manager` — Node 24.16.0 ✅
- **Work Windows**: `D:\users\allis\DevProjects\bowling-poker-manager` — Node 24.16.0 ✅
- **Mac (M2)**: `/Users/alaureano/DevProjects/bowling-poker-manager` — Node 24.16.0 via nvm ✅
- **Port**: 3005 (`next dev -p 3005`)
- **Env file**: `.env.local` with `DATABASE_URL` (gitignored, never committed, must be created manually on each machine)

### Node Version Management
- **Node version**: 24.16.0 (pinned via `.nvmrc`) — all three machines match
- **Mac**: uses `nvm` — run `nvm use` in project folder to activate correct version
- **Windows**: Node installed directly at 24.16.0
- **To verify**: run `node --version` before starting dev — must show v24.16.0

### Environment Setup (new machine checklist)
1. Clone repo: `git clone https://github.com/StarlightEnt/bowling-poker-manager.git`
2. Mac only: install nvm, run `nvm install 24`, `nvm use 24`
3. `npm install`
4. Create `.env.local` manually with `DATABASE_URL=<connection string from Neon console>`
5. `npm run dev` → http://localhost:3005

## Database
- **Connection string**: Get from Neon console (console.neon.tech) → Connect button → Show password
- **Branch**: production
- **Active Season**: "Summer 2026" (season_id = 7 after refactor)

---

## ✅ SCHEMA REFACTOR — COMPLETE (June 5, 2026)

### Background
The current schema treats bowlers and teams as season-scoped entities — every new season deletes and recreates all bowler and team records. This is architecturally wrong for a multi-season league management tool:

- Bowlers are real people who persist across seasons
- Teams are real organizations that persist across seasons (though they may sit out a season)
- Team numbers are re-seeded each season based on finish position — "Taste the Rainbow" may be Team 9 this season and Team 12 next season
- All historical data (checkins, game results) must remain tied to stable, permanent bowler and team identities
- The History screen (not yet built) depends entirely on this stable identity model

### The Golden Rules (never violate)
- **A bowler is a bowler is a bowler** — one DB row per person, forever, never deleted
- **A team is a team is a team** — one DB row per organization, forever, never deleted
- **VACANT rows have no transactional data** — safe to delete/replace when a real bowler fills the slot
- **Never delete a bowler record that could have historical data**
- **imported_name is the immutable identity key** — never modified after initial insert, used for PDF re-import matching

### New Schema Design

```sql
-- League-wide identity tables (permanent, never season-scoped)

-- Bowlers: one row per person, forever
CREATE TABLE bowlers (
  id             SERIAL PRIMARY KEY,
  full_name      TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  imported_name  TEXT NOT NULL,        -- immutable original PDF name, identity key
  email          TEXT,
  created_at     TIMESTAMP DEFAULT NOW()
);

-- Teams: one row per organization, forever
CREATE TABLE teams (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL
);

-- Season tables (scoped to a season)

CREATE TABLE seasons (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  start_date DATE,
  end_date   DATE,
  is_active  BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Season team membership: team participates in a season with a number
CREATE TABLE season_teams (
  id          SERIAL PRIMARY KEY,
  season_id   INTEGER REFERENCES seasons(id) ON DELETE CASCADE,
  team_id     INTEGER REFERENCES teams(id),
  team_number INTEGER NOT NULL,
  UNIQUE(season_id, team_id),
  UNIQUE(season_id, team_number)
);

-- Season roster: bowler's membership for a specific season
CREATE TABLE season_roster (
  id             SERIAL PRIMARY KEY,
  season_id      INTEGER REFERENCES seasons(id) ON DELETE CASCADE,
  team_id        INTEGER REFERENCES teams(id),   -- null = sub
  bowler_id      INTEGER REFERENCES bowlers(id),
  position_order INTEGER,
  book_average   INTEGER,
  is_sub         BOOLEAN DEFAULT false,
  UNIQUE(season_id, bowler_id)
);

-- Schedule: unchanged
CREATE TABLE schedule (
  id               SERIAL PRIMARY KEY,
  season_id        INTEGER REFERENCES seasons(id) ON DELETE CASCADE,
  week_number      INTEGER NOT NULL,
  bowl_date        DATE,
  starting_lane    INTEGER DEFAULT 1,
  lane_positions   JSONB,
  is_position_round BOOLEAN DEFAULT false,
  notes            TEXT,
  UNIQUE(season_id, week_number)
);

-- Checkins: bowler_id now references permanent bowlers table
CREATE TABLE checkins (
  id           SERIAL PRIMARY KEY,
  season_id    INTEGER REFERENCES seasons(id) ON DELETE CASCADE,
  week_number  INTEGER NOT NULL,
  bowler_id    INTEGER REFERENCES bowlers(id),
  paid_amount  NUMERIC(10,2) NOT NULL,
  checked_in_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(season_id, week_number, bowler_id)
);

-- Game results: bowler_id now references permanent bowlers table
CREATE TABLE game_results (
  id                  SERIAL PRIMARY KEY,
  season_id           INTEGER REFERENCES seasons(id) ON DELETE CASCADE,
  week_number         INTEGER NOT NULL,
  game_number         INTEGER NOT NULL CHECK (game_number IN (1,2,3)),
  bowler_id           INTEGER REFERENCES bowlers(id),
  hand_type           TEXT NOT NULL,
  hand_detail         TEXT,
  pot_amount          NUMERIC(10,2),
  is_progressive_win  BOOLEAN DEFAULT false,
  progressive_payout  NUMERIC(10,2) DEFAULT 0,
  total_payout        NUMERIC(10,2),
  created_at          TIMESTAMP DEFAULT NOW()
);

-- Progressive pot ledger: unchanged
CREATE TABLE progressive_pot (
  id               SERIAL PRIMARY KEY,
  season_id        INTEGER REFERENCES seasons(id) ON DELETE CASCADE,
  week_number      INTEGER,
  transaction_type TEXT NOT NULL,
  amount           NUMERIC(10,2) NOT NULL,
  balance_after    NUMERIC(10,2) NOT NULL,
  notes            TEXT,
  created_at       TIMESTAMP DEFAULT NOW()
);

-- Charity fund ledger: unchanged
CREATE TABLE charity_fund (
  id               SERIAL PRIMARY KEY,
  season_id        INTEGER REFERENCES seasons(id) ON DELETE CASCADE,
  week_number      INTEGER,
  transaction_type TEXT NOT NULL,
  amount           NUMERIC(10,2) NOT NULL,
  balance_after    NUMERIC(10,2) NOT NULL,
  notes            TEXT,
  created_at       TIMESTAMP DEFAULT NOW()
);

-- Settings: unchanged
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### Key Query Pattern Changes
Any query that previously joined `bowlers` via `season_id` must now join through `season_roster`:

```sql
-- OLD: get bowlers for a season
SELECT * FROM bowlers WHERE season_id = $1

-- NEW: get bowlers for a season
SELECT b.*, sr.position_order, sr.book_average, sr.is_sub, sr.team_id
FROM bowlers b
JOIN season_roster sr ON sr.bowler_id = b.id
WHERE sr.season_id = $1

-- OLD: get team for a bowler
SELECT t.name FROM teams t WHERE t.id = b.team_id

-- NEW: get team for a bowler in a season
SELECT t.name, st.team_number
FROM teams t
JOIN season_teams st ON st.team_id = t.id
WHERE st.season_id = $1 AND t.id = sr.team_id
```

### Files That Need Updating (full list)

**Schema (run in Neon console):**
- Drop and recreate all tables per new schema above
- Reseed settings table

**API Routes — all need query updates:**
- `app/api/setup/save-season/route.js` — write to `teams`, `season_teams`, `bowlers`, `season_roster`
- `app/api/checkin/route.js` — join through `season_roster` for bowler lists
- `app/api/checkin/edit-name/route.js` — update `bowlers` table directly (no season scope)
- `app/api/gamenight/route.js` — join through `season_roster`
- `app/api/report/route.js` — join through `season_roster`
- `app/api/dashboard/route.js` — join through `season_roster`
- `app/api/schedule/route.js` — unchanged (no bowler joins)
- `app/api/roster/route.js` — join through `season_roster`, update both `bowlers` and `season_roster`
- `app/api/roster/import/route.js` — merge logic targets `season_roster`, identity matching via `bowlers.imported_name`

**No visual/UX changes** — all page.js files are unchanged. This is a pure backend/query refactor.

### Data Preservation
One week of real data (Week 7, Summer 2026) has been exported to JSON and saved locally:
- `seasons.json`, `teams.json`, `bowlers.json`, `checkins.json`
- `game_results.json`, `progressive_pot.json`, `charity_fund.json`

After the schema refactor, this data must be reimported into the new structure. The mapping is:
- Old `bowlers` rows → new `bowlers` (league-wide) + `season_roster` (season-scoped)
- Old `teams` rows → new `teams` (league-wide) + `season_teams` (season-scoped)
- `checkins` and `game_results` `bowler_id` values must map to new permanent `bowlers.id`
- Week 7 bowl_date needs to be corrected to `2026-06-04` (Wednesday June 4, 2026) — the stored date is wrong

---

## Financial Formula
```
Pool = playerCount × buyinAmount ($5)
Progressive set-aside = $3/night (configurable in settings)
Payout total = floor((Pool - 3) / 4) × 3
Charity = Pool - 3 - Payout total
Per game = totals / 3
```

### Financial Flow
1. **Check-in** → mark players paid
2. **Lock Night** → records progressive ($3) and charity contributions to ledgers ONCE
3. **Game Night** → record winners only; no ledger writes except Royal Flush
4. **Royal Flush** → zeroes progressive pot balance (payout entry in progressive_pot)
5. **Unlock** → reverses lock entries + clears game results (if corrections needed)

---

## File Structure
```
bowling-poker-manager/
├── app/
│   ├── globals.css
│   ├── layout.js              ← nav: Dashboard, Check-In, Game Night, Report, Schedule, Roster, History, Settings
│   ├── page.js                ← Dashboard
│   ├── setup/page.js          ← Season setup, PDF import (access via Settings nav — not in main nav)
│   ├── checkin/page.js        ← Check-in screen
│   ├── gamenight/page.js      ← Game Night screen
│   ├── report/page.js         ← Weekly Report (PNG export)
│   ├── schedule/page.js       ← Schedule screen
│   ├── roster/page.js         ← Roster management + re-import PDF
│   └── api/
│       ├── checkin/
│       │   ├── route.js
│       │   └── edit-name/route.js
│       ├── gamenight/route.js
│       ├── report/route.js
│       ├── dashboard/route.js
│       ├── schedule/route.js
│       ├── roster/
│       │   ├── route.js
│       │   └── import/route.js
│       └── setup/
│           ├── parse-roster/route.js
│           ├── parse-schedule/route.js
│           └── save-season/route.js
├── lib/
│   ├── db.js                  ← Neon connection
│   └── pdfParser.js           ← parseRosterPDF(), parseSchedulePDF(), normalizeName()
├── .nvmrc                     ← Node 24.16.0 pin
├── .npmrc                     ← engine-strict=false
├── next.config.js
├── vercel.json
├── package.json               ← dev port 3005
└── .env.local                 ← DATABASE_URL (gitignored)
```

---

## Screens — Completed ✅

### Season Setup (`/setup`)
- Upload League Standings PDF → imports teams, bowlers, subs
- Upload Schedule PDF → imports 16-week lane assignments
- Access via Settings page (not main nav — destructive operation)
- After refactor: writes to `teams`, `season_teams`, `bowlers`, `season_roster`

### Check-In (`/checkin`)
- Auto-detects current week
- Week selector dropdown
- 4-column alphabetical grid
- Tap to toggle check-in
- VACANT shown dimmed, non-tappable
- Subs section below, alphabetical, no Z- prefix
- Edit modal (✎) — edits full_name on permanent bowlers record
- Lock Night / Unlock Night

### Game Night (`/gamenight`)
- Auto-detects current week
- Payout Summary card
- 3 game entry slots with winner autocomplete
- Hand type dropdown + detail field
- Progressive auto-ticks on Royal Flush
- Tie split support
- Running totals: Progressive Pot, Charity Fund

### Weekly Report (`/report`)
- Auto-loads most recent completed week
- Week selector
- Dark/Light theme toggle
- Pride-themed card with rainbow stripe
- Download PNG (2x resolution)

### Schedule (`/schedule`)
- All 16 weeks with lane assignments
- Edit starting_lane per week
- Position round weeks editable
- Current week highlighted

### Roster (`/roster`)
- All teams for active season, one card per team
- Columns: #, Full Name, Display Name (auto-derived), Avg, Email
- Click Full Name or Email to edit inline — saves instantly
- Click Team Name in header to edit
- VACANT rows dimmed but editable
- Subs section at bottom
- Collapsible Re-import PDF panel at top
  - Non-destructive merge — never deletes bowlers with history
  - Preview diff with checkboxes before committing
  - Matches on imported_name (immutable identity key)

---

## Screens — Not Yet Built ❌

### Dashboard (`/`) — partial
- Current week banner and nav cards exist
- Lane graphic showing teams/bowlers for current week — not built

### History (`/history`)
- Past weeks selector
- Win leaderboard (lifetime and per-season)
- Full game log by season
- Depends on stable bowler identity — requires schema refactor first

### Settings (`/settings`)
- Buy-in amount
- Progressive nightly amount
- Charity zero-out (with confirmation + audit trail)
- Link/access to Season Setup (`/setup`)

---

## PDF Parsing Details

### League Standings PDF (BLS software)
- Page 2: Team Rosters
  - **Week 1 format**: team header split across two lines, bowler data mashed
  - **Week 2+ format**: team header single line, bowler data space-separated
- Page 3: Temporary Substitutes
- Page 4: Ignored
- VACANT rows included as placeholder bowlers
- Awards/birthday sections filtered out

### Schedule/Bylaws PDF
- Lane assignments on last page
- Format: `Wk07 06/03 5- 7 4- 12 2- 10 1- 9 6- 8 3- 11`
- Week 12 split line handled by continuation join
- Week 15 position round detection

### Name Normalization
- Format: `First LastInitial` (e.g. `Mark B`)
- Strips role suffixes: `-*`, `-Sec`, `-Tr`, `-Pres`, `-VP`
- Skips generational suffixes: II, III, Jr, Sr
- Subs get NO prefix — segregated by `is_sub` flag
- `imported_name` stores the original PDF name and is NEVER modified after insert

---

## Key Notes / Gotchas

1. **pdf-parse**: Must use `require('pdf-parse/lib/pdf-parse.js')` directly
2. **Neon numeric columns**: Returned as strings — always wrap in `parseFloat()` before math
3. **git**: `node_modules/`, `.next/`, `.env.local` all gitignored
4. **Lock before Game Night**: Financial amounts locked at check-in time
5. **Progressive pot**: Carries across weeks until Royal Flush
6. **Mac nvm**: Run `nvm use` in project folder after opening new Terminal
7. **Z- prefix REMOVED**: Subs no longer have Z- prefix. Live DB migrated with SUBSTRING query
8. **imported_name**: Immutable identity key on bowlers. Set once at insert, never updated. Used for PDF re-import matching. DO NOT update this field in any edit operation
9. **Season setup is destructive**: `/setup` is intentionally kept off the main nav. Will be accessed via Settings page (not yet built)
10. **Schema refactor pending**: Do not add features that depend on the old season-scoped bowlers/teams structure until the refactor is complete

---

## Current DB State
- Schema refactor COMPLETE (June 5, 2026)
- New schema live in Neon (season_id=1)
- 12 permanent teams, 77 permanent bowlers (52 regular + 25 subs)
- Week 7 data fully restored: 25 checkins, 3 game results, progressive pot ($3), charity fund ($32)
- Week 7 bowl_date = 2026-06-03 (June 3), Week 8 bowl_date = 2026-06-10 (June 10)
- JSON backup files still at: C:\Users\allis\Downloads\Bowling Poker Database Files\

---

## Design System
- **Background**: `#0d0d0f`
- **Surface**: `#141417`
- **Accent**: `#e8ff47` (yellow)
- **Accent2**: `#ff6b35` (orange)
- **Green**: `#3dffa0`
- **Blue**: `#4fa3ff`
- **Fonts**: Bebas Neue (headers), DM Mono (data/body)
- **Dark theme** throughout app
- **Report card**: Pride rainbow stripe + color-coded box borders (red/orange/green/blue/purple/teal)
