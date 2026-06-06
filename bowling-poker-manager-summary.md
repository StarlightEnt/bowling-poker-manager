# Bowling Poker Manager — Project Summary
*As of June 5, 2026 (end of session)*

## How We Work Together
- Discuss and agree on approach BEFORE writing any code
- **Present the plan/summary first — STOP and wait for explicit "go ahead" confirmation before writing any code**
- Work one step at a time — wait for confirmation/acknowledgement before proceeding to the next file or step
- Always deliver complete downloadable files — NEVER ask the user to make surgical edits
- Always specify full file paths when providing files to update
- Be clear about whether a file is NEW or a REPLACEMENT — never present ambiguous file deliveries
- Always remind to restart the server after ANY file changes (API or page)
- Before presenting any file that goes into a NEW folder, provide the PowerShell `mkdir` command first
- Be accurate — never claim something is done unless it is verified

## Security Rules
- NEVER suggest putting credentials, tokens, or secrets in chat or in git
- `.env.local` is always created manually on each machine, never committed
- If credentials are accidentally exposed, rotate them immediately in Neon console

---

## Project Overview
A web app replacing a manual Excel spreadsheet to manage a poker side-game during the
LGBT Wednesday Community bowling league at Classic Bowling Center, Daly City, CA.
Players pay $5 buy-in, draw cards for spares/strikes during 3 bowling games, and best
5-card poker hand wins each game.

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
- **Active Season**: `Summer '26` (season id=1)
- **Active League**: `LGBT Wednesday Community` (league id=1)
- **Season naming convention**: `Summer 'YY` or `Fall/Winter 'YY-'YY` (always abbreviated years with apostrophe)

---

## Schema — Current State

All tables live in Neon production. Schema is fully current as of June 5, 2026.

### Core tables
```
leagues          — league identity (name, venue, charity_name) — NEW June 5
bowlers          — permanent league-wide identity, one row per person forever
teams            — permanent league-wide identity, one row per org forever
seasons          — one row per season (league_id FK, charity_seed, progressive_seed)
season_teams     — team membership per season with team_number
season_roster    — bowler membership per season (team_id, book_average, is_sub)
schedule         — 16-week lane assignments per season
checkins         — weekly player check-ins (lock status tracked here)
game_results     — per-game winners, hands, payouts
progressive_pot  — progressive ledger (contribution/payout entries)
charity_fund     — charity ledger (combined pool + donation entries at lock time)
settings         — league-scoped key/value: buyin_amount, progressive_nightly
                   PRIMARY KEY is composite (league_id, key)
```

### History tables
```
historical_results   — game log from prior seasons (seeded from spreadsheet)
historical_checkins  — weekly player counts Summer '26 weeks 1-6 (includes charity_amount)
                       NOTE: uses season_name TEXT not season_id FK — always query by name
charitable_donations — extra donations per week (season_id, week_number, amount, notes)
                       one row per week max; baked into charity_fund at lock time
```

### leagues table columns
```
id, name, venue_name, venue_city, venue_state, charity_name, created_at
```
Current values: LGBT Wednesday Community | Classic Bowling Center | Daly City | CA | SFGGCI 2027

### Golden Rules (never violate)
- **A bowler is a bowler is a bowler** — one DB row per person, forever, never deleted
- **A team is a team is a team** — one DB row per org, forever, never deleted
- **VACANT rows have no transactional data** — safe to delete/replace
- **imported_name is the immutable identity key** — never modified after initial insert

---

## Financial Formula
```
Pool = playerCount × buyin_amount
Progressive set-aside = progressive_nightly (flat per night, from settings)
  → per game progressive = progressive_nightly / 3 (calculated in code, never stored)
Payout total = floor((Pool - progressive_nightly) / 4) × 3
Charity (from pool) = Pool - progressive_nightly - Payout total
Per game payout = payout total / 3
```

### Charitable Donations
- A player may donate extra cash any week (e.g. Joe K gives back $10 from winnings)
- Entered via the **Additional Donation card** on Game Night screen
- Stored in `charitable_donations` (season_id, week_number, amount, notes)
- **One row per week maximum**
- At lock time: `charity_fund` entry = pool formula charity + donation (combined as ONE entry)
- `charitable_donations` is the source of record for History asterisk/tooltip only
- NEVER add `charitable_donations` separately to running totals — it is already in `charity_fund`

### Financial Flow
1. **Check-in** → mark players paid
2. **Optional: Add Donation** on Game Night before locking
3. **Lock Night** → writes combined charity (pool + donation) to `charity_fund`; writes progressive to `progressive_pot`
4. **Game Night** → record winners only; no ledger writes except Royal Flush
5. **Royal Flush** → zeroes progressive pot (payout entry in `progressive_pot`)
6. **Unlock** → reverses lock entries + clears game results (destructive — use with care)
7. **Donation Save/Clear on locked night** → silent relock: replaces `charity_fund` entry for that week only, never touches game_results or progressive_pot

### Charity Running Total Formula (used everywhere)
```
running_charity =
  seasons.charity_seed
  + SUM(historical_checkins.charity_amount WHERE season_name = season.name)
  + last charity_fund.balance_after (ORDER BY id DESC LIMIT 1, default 0 if none)
```
Three terms only. charitable_donations is NOT a separate additive term.

### Progressive Running Total Formula (used everywhere)
```
running_progressive =
  seasons.progressive_seed
  + COUNT(historical_checkins rows WHERE season_name = season.name) × progressive_nightly
  + last progressive_pot.balance_after (ORDER BY id DESC LIMIT 1, default 0 if none)
```

### Seed Balances (Summer '26, season id=1)
- `charity_seed` = **$253.00**
- `progressive_seed` = **$9.00** (corrected June 5 — was incorrectly $6.00)
- Verified totals as of end of Week 7: charity **$429.00**, progressive **$30.00**

---

## File Structure
```
bowling-poker-manager/
├── app/
│   ├── globals.css                    ← light-mode stub added June 5
│   ├── layout.js                      ← suppressHydrationWarning + theme script
│   ├── page.js                        ← Dashboard
│   ├── setup/page.js                  ← Season setup (access via Settings — destructive)
│   ├── checkin/page.js
│   ├── gamenight/page.js              ← Donation card added June 5
│   ├── report/page.js
│   ├── schedule/page.js
│   ├── roster/page.js
│   ├── history/page.js
│   ├── settings/page.js               ← NEW June 5
│   └── api/
│       ├── checkin/route.js           ← lock writes combined charity+donation
│       ├── checkin/edit-name/route.js
│       ├── gamenight/route.js         ← returns isLocked + donation in GET
│       ├── gamenight/donation/route.js               ← NEW June 5
│       ├── gamenight/donation/relock-charity/route.js ← NEW June 5
│       ├── report/route.js            ← correct balance formulas + charityName
│       ├── dashboard/route.js
│       ├── schedule/route.js
│       ├── roster/route.js
│       ├── roster/import/route.js
│       ├── history/route.js           ← donation data in charity ledger rows
│       ├── settings/route.js          ← NEW June 5
│       ├── settings/charity-payout/route.js ← NEW June 5
│       └── setup/
│           ├── parse-roster/route.js
│           ├── parse-schedule/route.js
│           └── save-season/route.js
├── lib/
│   ├── db.js
│   └── pdfParser.js
├── migration-v2.sql                   ← schema refactor (already run)
├── migration-history.sql              ← history seed (already run)
├── .nvmrc
├── .npmrc
├── next.config.js
├── vercel.json
├── package.json                       ← dev port 3005
└── .env.local                         ← DATABASE_URL (gitignored)
```

---

## Screens — Completed ✅

### Dashboard (`/`)
- Season name pulled dynamically from DB
- Current week banner with financials
- Week detection looks BACKWARD to last completed week
- Season progress bar (weeksComplete / totalWeeks)
- Nav cards: Check-In, Game Night, Report, Schedule, History, Settings
- Lane graphic: NOT YET BUILT ❌

### Season Setup (`/setup`)
- Upload League Standings PDF → imports teams, bowlers, subs
- Upload Schedule PDF → imports 16-week lane assignments
- Access via Settings page (not main nav — destructive operation)
- Writes to `teams`, `season_teams`, `bowlers`, `season_roster`

### Check-In (`/checkin`)
- Auto-detects current week (looks backward)
- Week selector dropdown
- 4-column alphabetical grid, tap to toggle
- VACANT shown dimmed, non-tappable
- Subs section below, alphabetical
- Edit modal (✎) — edits full_name on permanent bowlers record
- Lock Night / Unlock Night

### Game Night (`/gamenight`)
- Auto-detects current week
- Zero-player guard: all values show $0.00 when no check-ins
- Payout Summary card
- **Additional Donation card** — amount + notes, Save/Clear ← NEW June 5
  - If night is locked: silent relock updates charity_fund immediately
  - Context-aware helper text (locked vs unlocked state)
- 3 game entry slots with winner autocomplete
- Hand type dropdown + detail field
- Progressive auto-ticks on Royal Flush
- Tie split support
- Running totals: Progressive Pot ($30), Charity Fund ($429 as of Wk 7)

### Weekly Report (`/report`)
- Auto-loads most recent completed week
- Week selector
- Dark/Light theme toggle
- Pride-themed card with rainbow stripe
- Charity name pulled dynamically from `leagues.charity_name` (e.g. SFGGCI 2027)
- Venue: Classic Bowling Center · Daly City, CA (dynamic from leagues table)
- Download PNG (2x resolution)

### Schedule (`/schedule`)
- Season name pulled dynamically from DB
- All 16 weeks with lane assignments
- Edit starting_lane per week
- Position round weeks editable
- Current week highlighted (looks backward)

### Roster (`/roster`)
- Season name pulled dynamically from DB
- All teams for active season, one card per team
- Columns: #, Full Name, Display Name, Avg, Email — all inline editable
- Click Team Name in header to edit
- VACANT rows dimmed but editable
- Subs section at bottom
- Collapsible Re-import PDF panel (non-destructive merge)

### History (`/history`)
- Season filter dropdown (newest first)
- Summary card: weeks played, total games, total paid out, progressive wins
- Charity raised (clickable) → opens charity ledger drawer
- Charity ledger drawer:
  - Opening balance row (prior seasons rollover)
  - One row per week (weeks 1-6 from historical_checkins, week 7+ from charity_fund)
  - Donation asterisk (*) with click tooltip showing amount + notes
  - Running balance column
- Game log table (220+ results, date descending)
  - Color-coded hand type badges
  - Progressive wins highlighted in yellow

### Settings (`/settings`) ← NEW June 5
- **League Identity**: name, venue name, city, state, charity name — all editable
- **Game Rules**: buy-in amount, progressive nightly (÷3 validated, shows per-game calc)
- **Season Seeds**: charity_seed + progressive_seed for active season (with warning)
  - Shows current running totals (charity + progressive)
- **Appearance**: dark/light mode toggle (localStorage, device-local)
- **Danger Zone**:
  - Charity Payout — full balance zero-out with confirmation modal, writes audit entry to charity_fund
  - Season Setup link (with destructive warning)

---

## Screens — Not Yet Built ❌

### Dashboard Lane Graphic
- Visual showing teams/bowlers assigned to lanes for current week
- Data available via schedule.lane_positions JSONB + season_roster

---

## Historical Data — Seeded

### Sources
- **WedStats sheet**: full game log for Fall/Winter '24-'25, Summer '25, Fall/Winter '25-'26
- **WedMatches sheet**: weeks 1-6 Summer '26 (game results + player counts + charity amounts)
- **Live DB**: Summer '26 week 7+ (game_results, checkins, charity_fund, progressive_pot)

### Data in historical_results (217 rows)
- All 4 prior seasons' game results normalized
- Hand types standardized: Royal Flush, Straight Flush, Four of a Kind, Full House, Straight
- Names normalized (trailing periods stripped)
- Tie rows split into individual winner rows with split pot amounts

### Data in historical_checkins (6 rows)
- Summer '26 weeks 1-6 only
- `charity_amount` = actual spreadsheet values (ground truth, NOT recalculated from formula)
- Uses `season_name TEXT` column — NOT a foreign key to seasons.id

---

## PDF Parsing Details

### League Standings PDF (BLS software)
- Page 2: Team Rosters (Week 1 format differs from Week 2+)
- Page 3: Temporary Substitutes
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
- `imported_name` stores original PDF name, NEVER modified after insert

---

## Key Notes / Gotchas

1. **pdf-parse**: Must use `require('pdf-parse/lib/pdf-parse.js')` directly
2. **Neon numeric columns**: Returned as strings — always wrap in `parseFloat()` before math
3. **git**: `node_modules/`, `.next/`, `.env.local` all gitignored
4. **Lock before Game Night**: Financial amounts locked at check-in time
5. **Progressive pot**: Carries across weeks until Royal Flush
6. **Mac nvm**: Run `nvm use` in project folder after opening new Terminal
7. **imported_name**: Immutable identity key. Set once at insert, never updated
8. **Season setup is destructive**: `/setup` intentionally off main nav, accessed via Settings
9. **Season id=1**: Active season is id=1 (post-refactor)
10. **Historical charity amounts**: Use `historical_checkins.charity_amount` directly — do NOT recalculate from pool formula
11. **Neon sql fragments**: Cannot use dynamic `sql` fragments as interpolated values — use separate query branches instead
12. **New folders**: Always provide PowerShell `mkdir` command before presenting a file that goes in a new folder
13. **Season naming**: Always `Summer 'YY` or `Fall/Winter 'YY-'YY` — never `Summer 2026`
14. **historical_checkins uses season_name TEXT**: NOT a foreign key — always query by `season_name`, never by `season_id`
15. **settings primary key is composite**: `(league_id, key)` — not just `key`
16. **charity_fund entries include donations**: At lock time, pool formula + donation = one combined entry. Never add charitable_donations separately to running totals
17. **Windows SSL for Node scripts**: Use `node --use-system-ca script.mjs` when running standalone scripts against Neon on Windows
18. **Charity name**: `leagues.charity_name` = "SFGGCI 2027" — the year is part of the name (campaign year), not a mistake

---

## Design System
- **Background**: `#0d0d0f`
- **Surface**: `#141417`
- **Surface2**: `#1a1a1e`
- **Accent**: `#e8ff47` (yellow)
- **Accent2**: `#ff6b35` (orange)
- **Green**: `#3dffa0`
- **Blue**: `#4fa3ff`
- **Red**: `#ff4444`
- **Muted**: `#555`
- **Border**: `#222`
- **Fonts**: Bebas Neue (headers), DM Mono (data/body)
- **Dark theme** throughout app
- **Light mode**: stub CSS only (`html.light-mode`) — full polish is a future task
- **Report card**: Pride rainbow stripe + color-coded box borders

---

## What's Left

### Priority 1: Dashboard Lane Graphic
- Visual lane assignments for current week
- Data source: `schedule.lane_positions` JSONB + `season_roster` + `season_teams`

### Priority 2: General Cleanup
- Full light mode CSS polish (stub exists, needs design pass)
- Any remaining hardcoded strings audit
