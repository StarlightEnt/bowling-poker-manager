# Bowling Poker Manager — Technical Reference
*Last updated: June 6, 2026*

---

## Overview

A Next.js 14 web app managing a charitable poker side-game played during bowling league nights. Players pay a weekly buy-in, draw cards for spares and strikes across three games, and the best legal 5-card poker hand wins each game's payout. A portion of each pool goes to a designated charity. Built for a local bowling league in the San Francisco Bay Area — architected for multi-league, multi-season licensing.

**Live:** [bowling-poker-manager.vercel.app](https://bowling-poker-manager.vercel.app)

**GitHub:** [StarlightEnt/bowling-poker-manager](https://github.com/StarlightEnt/bowling-poker-manager)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14, App Router, JavaScript |
| Database | Neon (PostgreSQL) |
| Hosting | Vercel (auto-deploy from `main`) |
| PDF Parsing | `pdf-parse@1.1.1` via `pdf-parse/lib/pdf-parse.js` |
| Image Export | `html-to-image` |
| Fonts | Bebas Neue (headers), DM Mono (data/body) |

---

## Requirements & Local Setup

- **Node.js:** 24.16.0 (pinned via `.nvmrc` — use nvm on Mac/Linux)
- **Database:** Neon PostgreSQL (free tier sufficient)
- **Port:** 3005 (`next dev -p 3005`)

```bash
git clone https://github.com/StarlightEnt/bowling-poker-manager.git
cd bowling-poker-manager
nvm use          # Mac/Linux only — activates Node 24.16.0
npm install
echo "DATABASE_URL=your_neon_connection_string" > .env.local
npm run dev
```

---

## URL Structure

Slug-based routing — no numeric IDs in URLs.

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

**Current live example:** `/AcmBow/Sum26/checkin`

### Slug Rules
- **League:** first 3 chars of each word → `Acme Bowling League` → `AcmBowLea`
- **Season:** abbreviation + year(s):
  - Single: `Sum26`, `Fal26`, `Win26`, `Spr26`
  - Span: `WS26` (Winter/Spring), `SS26` (Spring/Summer), `SF26` (Summer/Fall), `FW2627` (Fall/Winter)
- Both auto-generated from name but user-editable before saving

---

## Database Schema

```sql
leagues        (id, name, slug, venue_name, venue_city, venue_state,
                charity_name, accent_color, created_at)

seasons        (id, name, slug, league_id, start_date, end_date,
                start_year, is_active, created_at,
                charity_seed, progressive_seed)

teams          (id, name)                        ← league-wide permanent

season_teams   (id, season_id, team_id, team_number)

bowlers        (id, full_name, normalized_name,
                imported_name, email, is_sub)    ← league-wide permanent

season_roster  (id, season_id, team_id, bowler_id,
                position_order, book_average, is_sub)

schedule       (id, season_id, week_number, bowl_date,
                starting_lane, lane_positions JSONB,
                is_position_round, notes)

checkins       (id, season_id, week_number, bowler_id,
                paid_amount, checked_in_at)

game_results   (id, season_id, week_number, game_number,
                bowler_id, hand_type, hand_detail,
                is_progressive_win, total_payout, progressive_payout)

progressive_pot(id, season_id, week_number, entry_type,
                amount, balance_after, notes)

charity_fund   (id, season_id, week_number, entry_type,
                amount, balance_after, notes)

charitable_donations (id, season_id, week_number, amount, notes)

historical_checkins  (id, season_name TEXT, week_number,
                      player_count, charity_amount, bowl_date)

settings       (league_id, key, value)           ← composite PK (league_id, key)
```

### Key Schema Notes
- `imported_name` on bowlers — immutable identity key, set once at insert, NEVER updated, used for PDF re-import matching
- `historical_checkins` uses `season_name TEXT` not a foreign key — always query by name string, never by season_id
- `settings` composite PK is `(league_id, key)` — never query by key alone
- `lane_positions` is JSONB array of team_numbers e.g. `[5,7,4,12,2,10,1,9,6,8,3,11]`
- `bowl_date` must be cast `::TEXT` in queries — Neon driver format breaks `new Date()`
- All numeric columns from Neon return as strings — always wrap in `parseFloat()` / `parseInt()`

---

## Financial Formula

```
Pool = playerCount × buyin_amount
Progressive set-aside = progressive_nightly ($3 default, must divide by 3)
Payout total = floor((Pool - progressive_nightly) / 4) × 3
Charity = Pool - progressive_nightly - Payout total
Per game = totals / 3
```

### Weekly Financial Flow
1. **Check-in** → mark players paid
2. **Optional donation** → add extra charity amount before locking
3. **Lock Night** → writes ONE combined charity entry (pool formula + donation) to `charity_fund`; writes progressive to `progressive_pot`
4. **Game Night** → record winners only; no ledger writes except Royal Flush
5. **Royal Flush** → zeroes progressive pot (payout entry in `progressive_pot`)
6. **Unlock** → reverses lock entries + clears game results (destructive)
7. **Donation edit on locked night** → silent relock — replaces `charity_fund` entry for that week

### Running Total Formulas
```javascript
// Charity
running_charity =
  seasons.charity_seed
  + SUM(historical_checkins.charity_amount WHERE season_name = season.name)
  + last(charity_fund.balance_after ORDER BY id DESC)

// Progressive
running_progressive =
  seasons.progressive_seed
  + COUNT(historical_checkins WHERE season_name = season.name) × progressive_nightly
  + last(progressive_pot.balance_after ORDER BY id DESC)
```

**Never** add `charitable_donations` separately to running totals — donations are already folded into `charity_fund` entries at lock time.

---

## API Patterns

### Season Resolution (all scoped routes)
```javascript
export const dynamic = 'force-dynamic';

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

### Settings (league-scoped, not season-scoped)
```javascript
const settings = await sql`
  SELECT key, value FROM settings WHERE league_id = ${season.league_id}
`;
```

### Week Detection (day-agnostic)
```javascript
async function detectWeek(seasonId) {
  const today = new Date().toISOString().split('T')[0];

  // 1. Is today a bowling day for this season?
  const [todayRow] = await sql`
    SELECT week_number FROM schedule
    WHERE season_id = ${seasonId} AND bowl_date::TEXT = ${today}
  `;
  if (todayRow) return todayRow.week_number;

  // 2. Most recent past week with checkin or game activity
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

Never hardcode day-of-week numbers. `bowl_date` in the schedule table is the source of truth for when a league bowls.

### Schedule Date Year Logic
PDF schedule dates are MM/DD only. Use `seasons.start_year` as authoritative year:
```javascript
const baseYear = startYear || new Date().getFullYear();
const firstMm = parseInt(weeks[0].bowl_date_str.split('/')[0]);
const [mm, dd] = week.bowl_date_str.split('/').map(Number);
const year = mm >= firstMm ? baseYear : baseYear + 1;
bowlDate = `${year}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
```

---

## File Structure

```
bowling-poker-manager/
├── app/
│   ├── globals.css                        ← CSS variables + light mode stub
│   ├── layout.js                          ← Root layout, uses NavBar
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
│   ├── leagues/[leagueSlug]/route.js      ← GET league + seasons
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
│   ├── db.js                              ← Neon connection
│   └── pdfParser.js                       ← parseRosterPDF(), parseSchedulePDF()
├── migrations/                            ← DB migration scripts + README
├── CLAUDE.md                              ← Permanent Claude Code instructions
├── .nvmrc                                 ← Node 24.16.0
├── .npmrc
├── next.config.js
├── vercel.json
└── package.json                           ← dev port 3005
```

---

## Screen Reference

### League Picker (`/`)
Full-width league cards with left accent border. `● last session` badge on last-used league (localStorage). Rainbow-border "Set Up New League" card. Fetches `GET /api/leagues`.

### Season Picker (`/[leagueSlug]`)
Breadcrumb showing league + venue. Season cards with active/complete status. Start/end dates derived from schedule on import. Rainbow-border "Set Up New Season" card. Fetches `GET /api/leagues/[leagueSlug]`.

### New League Setup (`/new-league`)
Two equal cards: League Identity (name, slug, venue, city, state, charity, accent color swatches + hex, live preview bar) + Game Rules (buy-in, progressive nightly with ÷3 validation, live payout preview). Full-width save row. POSTs to `/api/leagues/new`.

### Dashboard (`/[leagueSlug]/[seasonSlug]`)
Current week banner (week, date, status, checkins, pool, progressive, charity, games). Season progress bar — counts `game_results` game 3 OR `historical_checkins` as complete. Nav cards. Lane Graphic (current + upcoming week, responsive `repeat(auto-fill, minmax(150px, 1fr))`).

### Check-In (`/checkin`)
Auto-detects current week (backward-looking). Week selector dropdown. 4-column alpha grid, tap to toggle. VACANT dimmed/non-tappable. Subs section below. Edit modal (✎) edits `bowlers.full_name`. Lock/Unlock Night.

### Game Night (`/gamenight`)
Zero-player guard. Payout Summary card. Donation card (silent relock if night locked). 3 game slots with winner autocomplete, hand type dropdown, detail field. Progressive auto-ticks on Royal Flush. Tie split support.

### Report (`/report`)
Auto-loads most recent complete week. Week selector. Dark/Light toggle. Themed report card with rainbow stripe. Charity name from `leagues.charity_name`. Download PNG at 2x resolution.

### Schedule (`/schedule`)
All weeks with lane assignments. Edit starting_lane. Position round weeks editable. Current week highlighted.

### Roster (`/roster`)
Teams as cards. Inline editable: Full Name, Display Name, Avg, Email, Team Name. VACANT dimmed but editable. Subs section. Collapsible Re-import PDF panel (non-destructive merge, matched on `imported_name`).

### History (`/history`)
Season filter. Summary card. Charity ledger drawer (clickable, running balance). Game log table (date descending, color-coded hand badges, progressive wins highlighted).

### Settings (`/settings`)
League Identity, Game Rules, Season Seeds (with warning), Appearance (dark/light mode), Danger Zone (charity payout, season setup link).

### Season Setup (`/setup`)
Step 1: League Standings PDF → teams, bowlers, subs. Step 2: Schedule PDF → lane assignments. Step 3: Season Name, Short Name/Slug (auto-generated), Season Start Year (used for date math). Access via Settings only (destructive).

---

## NavBar Component

Client Component (`'use client'`). Uses `usePathname()` to detect route context.

- **On `/` and `/new-league`:** app title only, no nav links
- **On `/[leagueSlug]`:** app title only, no nav links
- **On `/[leagueSlug]/[seasonSlug]/*`:** full nav links + context bar

Context bar: `Acme Bowling League · Summer '26` (dynamically fetched from DB via `/api/leagues/[leagueSlug]`) centered, with `[LEAGUES]` button absolutely positioned right → `router.push('/')`.

**localStorage:**
- Writes `lastLeagueSlug` + `lastSeasonSlug` on every league+season page load
- League picker reads `lastLeagueSlug` to show `● last session` badge
- `theme` key stores light/dark mode preference

---

## PDF Parsing

### League Standings PDF (BLS software)
- Page 2: Team Rosters
  - Week 1 format: team header split across two lines
  - Week 2+ format: team header single line
- Page 3: Temporary Substitutes
- Page 4: Ignored
- VACANT rows included as placeholder bowlers
- Awards/birthday sections filtered out

### Schedule/Bylaws PDF
- Lane assignments on last page
- Format: `Wk01 04/22 5- 7 4- 12 2- 10 1- 9 6- 8 3- 11`
- Week 12 split line handled by continuation join
- Week 15 position round detection

### Name Normalization
- Format: `First LastInitial` e.g. `Mark B`
- Strips role suffixes: `-*`, `-Sec`, `-Tr`, `-Pres`, `-VP`
- Skips generational suffixes: II, III, Jr, Sr
- Subs segregated by `is_sub` flag — no prefix

---

## Lane Graphic API (`/api/[leagueSlug]/[seasonSlug]/dashboard/lanes`)

Returns current week + next upcoming week (skips position rounds) in one call.

- `lane_positions` JSONB array of team_numbers: pairs at indices [0,1], [2,3], [4,5]...
- team_number → `season_teams` → `teams` (name) → `season_roster` → `bowlers` (normalized_name, sorted by position_order)
- VACANT included, flagged `isVacant: true`
- `hasPairs: false` → TBD placeholder rendered on dashboard

---

## Database Migrations

Scripts live in `migrations/`. Always idempotent (`IF NOT EXISTS`). Run with:
```powershell
node --use-system-ca --env-file=.env.local migrations/FILENAME.mjs
```

| Date | File | Description |
|------|------|-------------|
| 2026-06-06 | 20260606-add-season-start-year.mjs | Add start_year to seasons |
| 2026-06-06 | 20260606-populate-season-dates.mjs | Derive start/end dates from schedule |
| 2026-06-06 | 20260606-fix-summer26-schedule-dates.mjs | Fix initial season bowl_dates incorrect year assignment |

---

## Design System

| Token | Value |
|-------|-------|
| Background | `#0d0d0f` |
| Surface | `#141417` |
| Surface2 | `#1a1a1e` |
| Accent yellow | `#e8ff47` |
| Accent orange | `#ff6b35` |
| Green | `#3dffa0` |
| Blue | `#4fa3ff` |
| Red | `#ff4444` |
| Muted | `#555` |
| Border | `#222` |
| Lane card bg | `#0d2a2a` |
| Lane card border | `#1a4040` |
| Lane team accent | `#c084fc` (lavender — V2 configurable) |

- Form labels: `#e8ff47` bold uppercase 10px letterSpacing 1px
- Rainbow gradient: `linear-gradient(135deg, #FF0018 0%, #FFA52C 14%, #FFFF41 28%, #008018 42%, #0000F9 57%, #86007D 71%, #FF0018 85%, #FFA52C 100%)`
- All styling via inline styles — no CSS framework
- Dark theme throughout; light mode stub in `globals.css` (V2)

---

## Known Limitations / V2 Backlog

- Light mode CSS is a stub only — full design pass needed
- Lane team accent color (`#c084fc`) hardcoded — should be configurable per league in Settings
- NavBar fetches league/season names on every page load — could be optimized with caching
