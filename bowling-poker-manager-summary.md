# Bowling Poker Manager — Project Summary
*As of June 6, 2026 (end of session)*

## How We Work Together
- Discuss and agree on approach BEFORE writing any code
- **Present the plan/summary first — STOP and wait for explicit "go ahead" confirmation before writing any code**
- Work one step at a time — wait for confirmation/acknowledgement before proceeding
- Always deliver complete downloadable files — NEVER ask the user to make surgical edits
- Always specify full file paths when providing files to update
- Be clear about whether a file is NEW or a REPLACEMENT
- Always remind to restart the server after ANY file changes
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
- **Frontend**: Next.js 14 (JavaScript, App Router)
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
- **Env file**: `.env.local` with `DATABASE_URL` (gitignored, never committed)

### Node Version Management
- **Node version**: 24.16.0 (pinned via `.nvmrc`) — all three machines match
- **Mac**: uses `nvm` — run `nvm use` in project folder to activate
- **Windows**: Node installed directly at 24.16.0

### Environment Setup (new machine checklist)
1. Clone repo: `git clone https://github.com/StarlightEnt/bowling-poker-manager.git`
2. Mac only: `nvm install 24`, `nvm use 24`
3. `npm install`
4. Create `.env.local` manually with `DATABASE_URL=<Neon connection string>`
5. `npm run dev` — starts on port 3005

---

## URL Structure (v2 — slug-based routing)

```
/                                    ← League picker
/new-league/                         ← New league setup form
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

Current live example:
- `/LGBTWedCom/Sum26/checkin`

### Slug Rules
- **League slug**: first 3 letters of each word — `LGBT Wednesday Community` → `LGBTWedCom`
- **Season slug**: abbreviation + year — `Summer '26` → `Sum26`, `Fall/Winter '26-'27` → `FW2627`
- Span seasons: `WS` (Winter/Spring), `SS` (Spring/Summer), `SF` (Summer/Fall), `FW` (Fall/Winter)
- Both auto-generated but user-editable before saving

---

## Database Schema (post-migration-v2)

```sql
leagues        (id, name, slug, venue_name, venue_city, venue_state,
                charity_name, accent_color, created_at)
seasons        (id, name, slug, league_id, start_date, end_date, is_active,
                created_at, charity_seed, progressive_seed)
teams          (id, name)                          ← league-wide permanent
season_teams   (id, season_id, team_id, team_number)
bowlers        (id, full_name, normalized_name, imported_name, email, is_sub)
season_roster  (id, season_id, team_id, bowler_id, position_order,
                book_average, is_sub)
schedule       (id, season_id, week_number, bowl_date, starting_lane,
                lane_positions JSONB, is_position_round, notes)
checkins       (id, season_id, week_number, bowler_id, paid_amount, checked_in_at)
game_results   (id, season_id, week_number, game_number, bowler_id, hand_type,
                hand_detail, is_progressive_win, total_payout, progressive_payout)
progressive_pot(id, season_id, week_number, entry_type, amount, balance_after, notes)
charity_fund   (id, season_id, week_number, entry_type, amount, balance_after, notes)
charitable_donations (id, season_id, week_number, amount, notes)
historical_checkins  (id, season_name TEXT, week_number, player_count,
                      charity_amount, bowl_date)
settings       (league_id, key, value)             ← composite PK
```

### Key Query Patterns
```sql
-- Resolve season from slugs (used in all API routes)
SELECT s.id, s.league_id FROM seasons s
JOIN leagues l ON l.id = s.league_id
WHERE l.slug = ${leagueSlug} AND s.slug = ${seasonSlug}

-- Settings (league-scoped)
SELECT key, value FROM settings WHERE league_id = ${leagueId}
```

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
2. **Optional: Add Donation** on Game Night before locking
3. **Lock Night** → writes combined charity (pool + donation) to `charity_fund`;
   writes progressive to `progressive_pot`
4. **Game Night** → record winners only; no ledger writes except Royal Flush
5. **Royal Flush** → zeroes progressive pot (payout entry in `progressive_pot`)
6. **Unlock** → reverses lock entries + clears game results (destructive)
7. **Donation Save/Clear on locked night** → silent relock

### Charity Running Total Formula
```
running_charity =
  seasons.charity_seed
  + SUM(historical_checkins.charity_amount WHERE season_name = season.name)
  + last charity_fund.balance_after (ORDER BY id DESC LIMIT 1)
```

### Progressive Running Total Formula
```
running_progressive =
  seasons.progressive_seed
  + COUNT(historical_checkins rows WHERE season_name = season.name) × progressive_nightly
  + last progressive_pot.balance_after (ORDER BY id DESC LIMIT 1)
```

### Seed Balances (Summer '26, season id=1)
- `charity_seed` = **$253.00**
- `progressive_seed` = **$9.00**
- Verified totals end of Week 7: charity **$429.00**, progressive **$30.00**

---

## File Structure
```
bowling-poker-manager/
├── app/
│   ├── globals.css
│   ├── layout.js                          ← uses NavBar component
│   ├── page.js                            ← League picker
│   ├── new-league/page.js                 ← New league setup form
│   ├── components/
│   │   └── NavBar.js                      ← Context-aware nav (Client Component)
│   └── [leagueSlug]/
│       ├── page.js                        ← Season picker
│       └── [seasonSlug]/
│           ├── page.js                    ← Dashboard
│           ├── checkin/page.js
│           ├── gamenight/page.js
│           ├── report/page.js
│           ├── schedule/page.js
│           ├── roster/page.js
│           ├── history/page.js
│           ├── settings/page.js
│           └── setup/page.js
├── app/api/
│   ├── leagues/route.js                   ← GET all leagues
│   ├── leagues/[leagueSlug]/route.js      ← GET one league + seasons
│   ├── leagues/new/route.js               ← POST create league
│   └── [leagueSlug]/[seasonSlug]/
│       ├── dashboard/route.js
│       ├── dashboard/lanes/route.js
│       ├── checkin/route.js
│       ├── checkin/edit-name/route.js
│       ├── gamenight/route.js
│       ├── gamenight/donation/route.js
│       ├── gamenight/donation/relock-charity/route.js
│       ├── report/route.js
│       ├── schedule/route.js
│       ├── roster/route.js
│       ├── roster/import/route.js
│       ├── history/route.js
│       ├── settings/route.js
│       ├── settings/charity-payout/route.js
│       └── setup/
│           ├── parse-roster/route.js
│           ├── parse-schedule/route.js
│           └── save-season/route.js
├── lib/
│   ├── db.js
│   └── pdfParser.js
├── migration-v2.sql                       ← already run
├── migration-history.sql                  ← already run
├── .nvmrc
├── .npmrc
├── next.config.js
├── vercel.json
├── package.json                           ← dev port 3005
└── .env.local                             ← DATABASE_URL (gitignored)
```

---

## NavBar Component (`app/components/NavBar.js`)

Client Component. Uses `usePathname()` to detect route context.

- **On `/` and `/new-league`**: shows app title only, no nav links
- **On `/[leagueSlug]`**: shows app title only, no nav links
- **On `/[leagueSlug]/[seasonSlug]/*`**: shows full nav links + context bar

### Context bar (shown inside league+season):
```
         LGBT Wednesday Community · Summer '26        [LEAGUES]
```
- Centered text, 10px DM Mono, color #555
- `[LEAGUES]` button: position absolute right, 9px, border 1px solid #333,
  onClick → router.push('/')
- Fetches league/season names from `/api/leagues/[leagueSlug]`

### Session persistence (localStorage):
- **Writes** `lastLeagueSlug` + `lastSeasonSlug` whenever inside a league+season route
- **Read** on league picker page to show `● last session` badge on matching league card
- Badge color: league's accent_color, 9px DM Mono, above season count

### Nav links (scoped to current league+season):
```javascript
`/${leagueSlug}/${seasonSlug}`           // Dashboard
`/${leagueSlug}/${seasonSlug}/checkin`
`/${leagueSlug}/${seasonSlug}/gamenight`
`/${leagueSlug}/${seasonSlug}/report`
`/${leagueSlug}/${seasonSlug}/schedule`
`/${leagueSlug}/${seasonSlug}/roster`
`/${leagueSlug}/${seasonSlug}/history`
`/${leagueSlug}/${seasonSlug}/settings`
```

---

## Screens — Completed ✅

### League Picker (`/`)
- Full-width league cards: left accent border (league.accent_color), name + venue,
  season count right-justified
- `● last session` badge on last-used league card (from localStorage)
- Rainbow-border "Set Up New League" compact card
- Fetches from `GET /api/leagues`

### Season Picker (`/[leagueSlug]`)
- Breadcrumb showing league name + venue
- Full-width season cards: active gets accent border + yellow `● Active`,
  complete gets dim border + gray "Complete"
- Season name (Bebas Neue), weeks + date range underneath
- Rainbow-border "Set Up New Season" card → links to setup page
- Fetches from `GET /api/leagues/[leagueSlug]`

### New League Setup (`/new-league`)
- Two equal `1fr 1fr` cards: League Identity + Game Rules
- League Identity: name, slug (auto-generated, editable), venue, city, state,
  charity name, accent color swatches + hex input, live preview bar
- Game Rules: buy-in, progressive nightly (÷3 validated), live payout preview
- Full-width save row: yellow Save button + inline status box
- On save → POST `/api/leagues/new` → redirect to `/{slug}`
- Yellow bold labels (`#e8ff47`), dark inputs

### Dashboard (`/[leagueSlug]/[seasonSlug]`)
- Season name from DB
- Current week banner: week number, date, status, checked-in count, pool,
  progressive, charity, games entered
- Week detection looks BACKWARD (last Wed before next Wed)
- Season progress bar: counts `game_results` game 3 OR `historical_checkins` as complete
- Nav cards: Check-In, Game Night, Report, Schedule, History, Settings
- Lane Graphic (two sections: current week + upcoming week)
  - Responsive grid `repeat(auto-fill, minmax(150px, 1fr))`
  - Deep blue-green cards (`#0d2a2a`), team names lavender `#c084fc`
  - VACANT dimmed/italic, TBD placeholder if no lane_positions

### Check-In (`/[leagueSlug]/[seasonSlug]/checkin`)
- Auto-detects current week (backward-looking)
- Week selector dropdown
- 4-column alphabetical grid, tap to toggle
- VACANT dimmed, non-tappable
- Subs section below
- Edit modal (✎) — edits full_name on permanent bowlers record
- Lock Night / Unlock Night

### Game Night (`/[leagueSlug]/[seasonSlug]/gamenight`)
- Auto-detects current week
- Zero-player guard
- Payout Summary card
- Additional Donation card (silent relock if night locked)
- 3 game entry slots with winner autocomplete
- Hand type dropdown + detail field
- Progressive auto-ticks on Royal Flush
- Tie split support
- Running totals: Progressive Pot, Charity Fund

### Weekly Report (`/[leagueSlug]/[seasonSlug]/report`)
- Auto-loads most recent completed week
- Week selector
- Dark/Light theme toggle
- Pride-themed card with rainbow stripe
- Charity name from `leagues.charity_name`
- Download PNG (2x resolution)

### Schedule (`/[leagueSlug]/[seasonSlug]/schedule`)
- All 16 weeks with lane assignments
- Edit starting_lane per week
- Position round weeks editable
- Current week highlighted (backward-looking)

### Roster (`/[leagueSlug]/[seasonSlug]/roster`)
- All teams for active season, one card per team
- Columns: #, Full Name, Display Name, Avg, Email — all inline editable
- Click Team Name in header to edit
- VACANT rows dimmed but editable
- Subs section at bottom
- Collapsible Re-import PDF panel (non-destructive merge)

### History (`/[leagueSlug]/[seasonSlug]/history`)
- Season filter dropdown (newest first)
- Summary card: weeks played, total games, total paid out, progressive wins
- Charity raised → opens charity ledger drawer with running balance
- Game log table (date descending), color-coded hand type badges

### Settings (`/[leagueSlug]/[seasonSlug]/settings`)
- League Identity: name, venue, city, state, charity name — editable
- Game Rules: buy-in, progressive nightly (÷3 validated)
- Season Seeds: charity_seed + progressive_seed with warning
- Appearance: dark/light mode toggle (localStorage)
- Danger Zone: Charity Payout + Season Setup link

### Season Setup (`/[leagueSlug]/[seasonSlug]/setup`)
- Upload League Standings PDF → imports teams, bowlers, subs
- Upload Schedule PDF → imports 16-week lane assignments
- Step 3: Season Name + Short Name/Slug (auto-generated, editable)
- Access via Settings page (destructive operation)

---

## Screens — Not Yet Built ❌

None — all v1 screens complete. ✅

---

## What's Left

### Cleanup (v1)
- Full light mode CSS polish (stub exists in globals.css)
- Hardcoded strings audit (e.g. venue name in schedule/page.js)

### V2 Backlog
- Configurable team accent color in Settings
  (currently hardcoded `#c084fc` in dashboard lane graphic)
- Full light mode design pass

---

## Lane Graphic API (`/api/[leagueSlug]/[seasonSlug]/dashboard/lanes`)
- Returns current week + next upcoming week (skips position rounds) in one call
- `lane_positions` JSONB array of team_numbers `[5,7,4,12,...]`
- Pairs: indices [0,1], [2,3], [4,5], [6,7], [8,9], [10,11]
- team_number → `season_teams` → `teams` (name) → `season_roster` → `bowlers`
  (normalized_name, sorted by position_order)
- VACANT included, flagged `isVacant: true`
- `hasPairs: false` → TBD placeholder
- `bowl_date::TEXT` cast required — Neon driver breaks `new Date()` otherwise

---

## New League API Routes

### `GET /api/leagues`
Returns all leagues with season_count. Used by league picker.

### `GET /api/leagues/[leagueSlug]`
Returns league + seasons array (newest first) with week_count.
Used by season picker AND NavBar context fetch.

### `POST /api/leagues/new`
Creates league + settings rows. Validates slug uniqueness.
Body: `{ name, slug, venue_name, venue_city, venue_state, charity_name,
         accent_color, buyin_amount, progressive_nightly }`

---

## PDF Parsing Details

### League Standings PDF (BLS software)
- Page 2: Team Rosters
  - Week 1 format: team header split across two lines, bowler data mashed
  - Week 2+ format: team header single line, bowler data space-separated
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
- `imported_name` stores original PDF name, NEVER modified after insert

---

## Key Notes / Gotchas

1. **pdf-parse**: Must use `require('pdf-parse/lib/pdf-parse.js')` directly
2. **Neon numeric columns**: Returned as strings — wrap in `parseFloat()` before math
3. **Neon date columns**: Cast `bowl_date::TEXT` in queries
4. **git**: `node_modules/`, `.next/`, `.env.local` all gitignored
5. **Lock before Game Night**: Financial amounts locked at check-in time
6. **Progressive pot**: Carries across weeks until Royal Flush
7. **Mac nvm**: Run `nvm use` in project folder after opening new Terminal
8. **Z- prefix REMOVED**: Subs no longer have Z- prefix
9. **imported_name**: Immutable identity key — NEVER update after insert
10. **Season setup is destructive**: access via Settings only
11. **Schema refactor COMPLETE**: permanent bowler/team identity model is live
12. **New folders**: Always provide PowerShell `mkdir` before new folder files
13. **Season naming**: Always `Summer 'YY` — never `Summer 2026`
14. **historical_checkins uses season_name TEXT**: query by name, never season_id
15. **settings PK is composite**: `(league_id, key)` — not just `key`
16. **charity_fund includes donations**: pool + donation = one combined entry at lock
17. **Windows SSL for Node scripts**: `node --use-system-ca script.mjs`
18. **Charity name**: `leagues.charity_name` = "SFGGCI 2027" — year is campaign year
19. **API season resolution**: all routes use slug join pattern:
    `JOIN leagues l ON l.id = s.league_id WHERE l.slug = X AND s.slug = Y`
20. **NavBar is Client Component**: uses `usePathname()` — requires `'use client'`
21. **localStorage**: used for lastLeagueSlug + lastSeasonSlug session persistence
    and light/dark mode theme preference

---

## Known Bugs
- None outstanding as of June 6, 2026

---

## Current State (June 6, 2026 — end of session)
- **V2 routing refactor COMPLETE** ✅
- Slug-based URLs live: `/LGBTWedCom/Sum26/checkin` etc.
- League picker, season picker, new league setup all built
- Session persistence via localStorage (last session badge + LEAGUES button)
- All v1 screens working under new routing
- 1 league (id=1, slug=LGBTWedCom, accent=#3dffa0)
- 1 season (id=1, slug=Sum26, league_id=1)
- 12 permanent teams, 77 bowlers (52 regular + 25 subs)
- Week 7 complete, Week 8 upcoming (Jun 10, 2026)
- Build passes clean: `npm run build` ✅

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
- **Light mode**: stub CSS only — full polish is future task
- **Report card**: Pride rainbow stripe + color-coded box borders
- **Lane card bg**: `#0d2a2a` (deep blue-green)
- **Lane card border**: `#1a4040`
- **Lane team accent**: `#c084fc` (lavender — V2 configurable)
- **League card**: full-width, left border in league accent_color
- **Rainbow border**: gradient wrapper div `linear-gradient(135deg, #FF0018 0%,
  #FFA52C 14%, #FFFF41 28%, #008018 42%, #0000F9 57%, #86007D 71%,
  #FF0018 85%, #FFA52C 100%)` — used on setup cards
- **Form labels**: `#e8ff47` bold uppercase 10px (new league setup style)
