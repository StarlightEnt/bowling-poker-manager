# Bowling Poker Manager — Project Summary
*As of June 5, 2026*

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
- **Active Season**: `Summer '26` (season id=1)
- **Season naming convention**: `Summer 'YY` or `Fall/Winter 'YY-'YY` (always abbreviated years with apostrophe)

---

## Schema — Current State

All tables live in Neon production. Schema refactor is COMPLETE.

### Core tables
```
bowlers          — permanent league-wide identity, one row per person forever
teams            — permanent league-wide identity, one row per org forever
seasons          — one row per season (charity_seed, progressive_seed columns added)
season_teams     — team membership per season with team_number
season_roster    — bowler membership per season (team_id, book_average, is_sub)
schedule         — 16-week lane assignments per season
checkins         — weekly player check-ins
game_results     — per-game winners, hands, payouts
progressive_pot  — progressive ledger (contribution/payout entries)
charity_fund     — charity ledger (contribution/payout entries)
settings         — buyin_amount, progressive_nightly
```

### History tables (added June 5, 2026)
```
historical_results   — game log from prior seasons (seeded from spreadsheet)
historical_checkins  — weekly player counts for Summer '26 weeks 1-6 (includes charity_amount)
charitable_donations — extra donations per week (season_id, week_number, amount, notes)
```

### Key schema additions (June 5, 2026)
- `seasons.charity_seed` — opening charity balance rolled over from prior seasons
- `seasons.progressive_seed` — opening progressive balance rolled over from prior seasons
- `historical_checkins.charity_amount` — actual charity collected per week (spreadsheet ground truth)

### Golden Rules (never violate)
- **A bowler is a bowler is a bowler** — one DB row per person, forever, never deleted
- **A team is a team is a team** — one DB row per org, forever, never deleted
- **VACANT rows have no transactional data** — safe to delete/replace
- **imported_name is the immutable identity key** — never modified after initial insert

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

### Seed Balances (Summer '26, season id=1)
- `charity_seed` = **$253.00** (verified: $429 total − $176 season = $253)
- `progressive_seed` = **$6.00** (verified: $27 total − $21 season = $6)
- Grand total charity as of end of Week 7: **$429.00**

---

## File Structure
```
bowling-poker-manager/
├── app/
│   ├── globals.css
│   ├── layout.js
│   ├── page.js                        ← Dashboard
│   ├── setup/page.js                  ← Season setup (access via Settings — destructive)
│   ├── checkin/page.js
│   ├── gamenight/page.js
│   ├── report/page.js
│   ├── schedule/page.js
│   ├── roster/page.js
│   ├── history/page.js                ← NEW (June 5, 2026)
│   └── api/
│       ├── checkin/route.js
│       ├── checkin/edit-name/route.js
│       ├── gamenight/route.js
│       ├── report/route.js
│       ├── dashboard/route.js
│       ├── schedule/route.js
│       ├── roster/route.js
│       ├── roster/import/route.js
│       ├── history/route.js           ← NEW (June 5, 2026)
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
- Week detection looks BACKWARD to last completed week (fixed June 5)
- Season progress bar (weeksComplete / totalWeeks)
- Nav cards: Check-In, Game Night, Report, Schedule, History, Settings
- Lane graphic: NOT YET BUILT

### Season Setup (`/setup`)
- Upload League Standings PDF → imports teams, bowlers, subs
- Upload Schedule PDF → imports 16-week lane assignments
- Access via Settings page (not main nav)
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
- Zero-player guard: all values show $0.00 when no check-ins (fixed June 5)
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

### History (`/history`) ← NEW June 5, 2026
- Season filter dropdown (newest first: Summer '26, Fall/Winter '25-'26, Summer '25, Fall/Winter '24-'25)
- Summary card:
  - Weeks played, total games, total paid out, progressive wins
  - Charity raised (clickable) → opens charity ledger drawer
  - Paid to charity
  - Winning hand breakdown with color-coded mini bars
  - Top 5 by game wins (expandable to all 40)
  - Top 5 by prize money (expandable to all 40)
- Charity ledger drawer (click Charity Raised to open):
  - Opening balance row (prior seasons rollover: $253)
  - One row per week for active season (weeks 1-6 from historical_checkins, week 7+ from charity_fund)
  - Completed seasons collapse to single summary row when is_active = false
  - Donation asterisk (*) with click tooltip showing amount + freehand notes
  - Running balance column
  - Total: $429.00 as of Week 7
- Game log table (220 results, date descending)
  - Color-coded hand type badges
  - Progressive wins highlighted in yellow

---

## Screens — Not Yet Built ❌

### Dashboard Lane Graphic
- Visual showing teams/bowlers assigned to lanes for current week

### Settings (`/settings`)
- Buy-in amount (configurable)
- Progressive nightly amount (configurable)
- Charity zero-out with confirmation + audit trail
- Season seed fields (charity_seed, progressive_seed) — auto-populated from prior season end balance, editable
- Charitable donation entry per week (free text notes + amount, single entry per week)
- Link/access to Season Setup (`/setup`)

---

## Historical Data — Seeded (June 5, 2026)

### Sources
- **WedStats sheet**: full game log for Fall/Winter '24-'25, Summer '25, Fall/Winter '25-'26
- **WedMatches sheet**: weeks 1-6 Summer '26 (game results + player counts + charity amounts)
- **Live DB**: Summer '26 week 7+ (game_results, checkins, charity_fund, progressive_pot)

### Data in historical_results (217 rows)
- All 4 seasons' game results normalized
- Hand types standardized: Royal Flush, Straight Flush, Four of a Kind, Full House, Straight
- Names normalized (trailing periods stripped)
- Tie rows split into individual winner rows with split pot amounts

### Data in historical_checkins (6 rows)
- Summer '26 weeks 1-6 only
- `charity_amount` = actual spreadsheet values (ground truth, NOT recalculated from formula)

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
9. **Season id=1**: After refactor, active season is id=1 (not id=7 as originally noted)
10. **Historical charity amounts**: Use `historical_checkins.charity_amount` directly — do NOT recalculate from pool formula (old formula differed from current)
11. **Neon sql fragments**: Cannot use dynamic `sql` fragments as interpolated values — use separate query branches instead
12. **New folders**: Always provide PowerShell `mkdir` command before presenting a file that goes in a new folder
13. **Season naming**: Always `Summer 'YY` or `Fall/Winter 'YY-'YY` — never `Summer 2026`

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
- **Report card**: Pride rainbow stripe + color-coded box borders

---

## What's Left — Final Push

### Priority 1: Settings Screen
- Buy-in amount
- Progressive nightly amount
- Charity zero-out with confirmation
- Season seed fields (charity_seed, progressive_seed)
- Charitable donation entry per week (amount + free text notes)
- Link to Setup

### Priority 2: Dashboard Lane Graphic
- Visual lane assignments for current week

### Priority 3: General Cleanup
- Vercel deploy verification
- Any remaining hardcoded strings audit
