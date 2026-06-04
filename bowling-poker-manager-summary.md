# Bowling Poker Manager — Project Summary
*As of June 4, 2026*

## Project Overview
A web app replacing a manual Excel spreadsheet to manage a poker side-game during the LGBT Wednesday Community bowling league at Classic Bowling Center, San Francisco. Players pay $5 buy-in, draw cards for spares/strikes during 3 bowling games, and best 5-card poker hand wins each game.

---

## Tech Stack
- **Frontend**: Next.js 14 (JavaScript, App Router), Tailwind CSS
- **Database**: Neon (PostgreSQL) — project: `bowling-poker-manager`
- **Hosting**: Vercel — auto-deploy from GitHub
- **GitHub**: `StarlightEnt/bowling-poker-manager`
- **PDF Parsing**: `pdf-parse@1.1.1` (via `pdf-parse/lib/pdf-parse.js`)
- **Image Export**: `html-to-image`

## Dev Environments
- **Home Windows**: `C:\Users\allis\DevProjects\bowling-poker-manager`
- **Work Windows**: `D:\users\allis\DevProjects\bowling-poker-manager`
- **Mac**: Has routing issues with Next.js API routes — defer to Windows for dev
- **Port**: 3005 (`next dev -p 3005`)
- **Env file**: `.env.local` with `DATABASE_URL` (not in git)

## Database
- **Connection**: `postgresql://neondb_owner:npg_UzFa7I1EKvsS@ep-curly-queen-api9oapp-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require`
- **Branch**: production
- **Active Season**: "Summer 2026" (season_id = 5)

---

## Database Schema

### Tables
- **settings** — key/value config (buyin_amount=5, progressive_nightly=3, progressive_per_game=1)
- **seasons** — id, name, start_date, end_date, is_active
- **teams** — id, season_id, team_number, name
- **bowlers** — id, season_id, team_id, full_name, normalized_name, is_sub, position_order, book_average
- **schedule** — id, season_id, week_number, bowl_date, starting_lane, lane_positions (JSONB), is_position_round, notes
- **checkins** — id, season_id, week_number, bowler_id, paid_amount, checked_in_at
- **game_results** — id, season_id, week_number, game_number, bowler_id, hand_type, hand_detail, pot_amount, is_progressive_win, progressive_payout, total_payout
- **progressive_pot** — id, season_id, week_number, transaction_type (lock/payout), amount, balance_after, notes
- **charity_fund** — id, season_id, week_number, transaction_type (lock), amount, balance_after, notes

### Key Design Decisions
- **lane_positions**: JSONB array of team_numbers, one per individual lane, left-to-right. Index N = team at lane (starting_lane + N). Open-ended — works for any number of teams.
- **starting_lane**: configurable per week (was 5 for weeks 1-2 this season, then 1)
- **VACANT**: stored as a real bowler row with normalized_name = 'VACANT'
- **Subs**: Z- prefix on normalized_name for alphabetic sort to end of list
- **Season replace**: saving same season name deletes and recreates all data (ON DELETE CASCADE)

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
│   ├── layout.js              ← nav: Dashboard, Check-In, Game Night, Report, Schedule, History, Settings
│   ├── page.js                ← Dashboard (placeholder)
│   ├── setup/page.js          ← Season setup, PDF import
│   ├── checkin/page.js        ← Check-in screen
│   ├── gamenight/page.js      ← Game Night screen
│   ├── report/page.js         ← Weekly Report (PNG export)
│   └── api/
│       ├── checkin/
│       │   ├── route.js       ← GET checkins, POST checkin/uncheckout/lock/unlock
│       │   └── edit-name/route.js
│       ├── gamenight/route.js
│       ├── report/route.js
│       └── setup/
│           ├── parse-roster/route.js
│           ├── parse-schedule/route.js
│           └── save-season/route.js
├── lib/
│   ├── db.js                  ← Neon connection
│   └── pdfParser.js           ← parseRosterPDF(), parseSchedulePDF(), normalizeName()
├── next.config.js             ← framework: nextjs, serverExternalPackages: pdf-parse
├── vercel.json                ← {"framework": "nextjs"}
├── package.json               ← dev port 3005
└── .env.local                 ← DATABASE_URL (gitignored)
```

---

## Screens — Completed ✅

### Season Setup (`/setup`)
- Upload League Standings PDF (BLS software output) → imports teams, bowlers, subs
- Upload Schedule/Bylaws PDF → imports 16-week lane assignments
- Handles Week 1 (mashed format) and Week 2+ (spaced format) PDF layouts
- VACANT rows parsed as placeholder bowlers
- Names editable inline (click display name)
- Season name → Save Season (replaces existing season with same name)
- Save blocked until both PDFs uploaded + name entered

### Check-In (`/checkin`)
- Auto-detects current week from schedule (nearest bowling Wednesday logic)
- Week selector dropdown
- Alphabetical by normalized_name, top-to-bottom in 4 columns
- Tap to toggle check-in (checkmark + highlight)
- VACANT shown dimmed, non-tappable
- Subs section below (Z- prefix sorts to end)
- Edit modal (✎) — edits full_name, derives normalized_name, re-sorts
- **Lock Night** button → records progressive + charity contributions, locks amounts
- **Unlock Night** → reverses contributions + clears game results
- Locked state: cards dimmed, no toggling, banner shows night's financials

### Game Night (`/gamenight`)
- Auto-detects current week
- Payout Summary card showing per-game amounts (pool, charity, progressive, payout)
- 3 game entry slots with winner autocomplete (checked-in players only)
- Hand type dropdown (Royal Flush → High Card) + detail field
- Progressive auto-ticks on Royal Flush, locked otherwise
- Add another winner button (tie split)
- Save per game, Edit to re-enter
- Progressive win column shows +$amount in summary
- Running totals: Progressive Pot, Charity Fund

### Weekly Report (`/report`)
- Auto-loads most recent fully completed week (all 3 games entered)
- Week selector (completed weeks only)
- Dark/Light theme toggle
- Pride-themed card: rainbow stripe, color-coded borders per box
- Game results table with winners, hands, payouts, progressive win indicator
- Charity Fund + Progressive Pot running totals
- **Download PNG** button (2x resolution via html-to-image)

---

## Screens — Not Yet Built ❌

### Dashboard (`/`)
- Lane graphic showing 6 lane pairs with teams/bowlers for current week
- Season stats hero

### Schedule (`/schedule`)
- View all 16 weeks with lane assignments
- Edit starting_lane per week
- Position round weeks editable

### History (`/history`)
- Past weeks selector
- Win leaderboard (who has won most games)
- Full game log by season

### Settings (`/settings`)
- Buy-in amount
- Progressive nightly amount
- Charity target info
- Charity zero-out (with confirmation + audit trail)

---

## PDF Parsing Details

### League Standings PDF (BLS software)
- Page 2: Team Rosters — two formats:
  - **Week 1**: `1 - Snappy Backends` / `Lane 13` (split lines), bowler data mashed: `Mark Bertelsen156347048...171`
  - **Week 2+**: `1 - Snappy BackendsLane 7` (single line), bowler data spaced: `Mark Bertelsen 156 3 470...171`
- Page 3: Temporary Substitutes
- Page 4: Ignored (Queer Bowling announcement)
- VACANT rows included as placeholder bowlers
- Awards section filtered out (USBC ID pattern `\d{3}-\d{5}`)
- Birthday section filtered out

### Schedule/Bylaws PDF (BLS-2026/PRO)
- Lane assignments on last page
- Format: `Wk07 06/03 5- 7 4- 12 2- 10 1- 9 6- 8 3- 11`
- Week 12 has split line — handled by continuation join
- Week 15: `{ Position Round- Start Lane - 5` — detected as position round
- `starting_lane` defaults to 1 (editable per week on Schedule screen)

### Name Normalization
- Format: `First LastInitial` (e.g. `Mark B`)
- Strips role suffixes: `-*`, `-Sec`, `-Tr`, `-Pres`, `-VP`
- Skips generational suffixes: II, III, Jr, Sr
- Subs get `Z-` prefix
- Edit via ✎ in Check-in: edits full_name → derives normalized_name server-side

---

## Key Notes / Gotchas

1. **Season ID**: Active season is id=5 (not 1 — multiple test saves created earlier IDs)
2. **$env:DATABASE_URL**: Home Windows machine had an old DATABASE_URL in the PowerShell session — always check `$env:DATABASE_URL` is null before running dev
3. **pdf-parse**: Must use `require('pdf-parse/lib/pdf-parse.js')` directly (not `require('pdf-parse')`) to avoid test file error
4. **Neon numeric columns**: Returned as strings — always wrap in `parseFloat()` before math
5. **git**: `core.autocrlf false` set on all machines. node_modules excluded via .gitignore. vercel.json required for Vercel to detect Next.js
6. **Lock before Game Night**: Financial amounts (pool, payout, charity, progressive) are locked at check-in time. Game Night only records winners.
7. **Progressive pot**: Carries across weeks/seasons until Royal Flush. First Royal Flush of the night wins everything. Subsequent Royal Flushes in same night get $0 progressive.

---

## Current DB State (Season 5 — Summer 2026)
- 12 teams, 77 bowlers (52 regular + 25 subs)
- Week 7 (Jun 3, 2026) tested and verified
- Progressive pot: $0 (won in Week 7 test)
- Charity fund: $32.00

---

## Design System
- **Background**: `#0d0d0f`
- **Surface**: `#141417`
- **Accent**: `#e8ff47` (yellow)
- **Accent2**: `#ff6b35` (orange)
- **Green**: `#3dffa0`
- **Fonts**: Bebas Neue (headers), DM Mono (data/body)
- **Dark theme** throughout app
- **Report card**: Pride rainbow stripe + color-coded box borders (red/orange/green/blue/purple/teal)
