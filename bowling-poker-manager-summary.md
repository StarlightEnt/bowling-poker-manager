# Bowling Poker Manager — Technical Reference
*Last updated: June 11, 2026*

---

## Overview

A Next.js 14 web app managing a charitable poker side-game played during bowling league nights. Players pay a weekly buy-in, draw cards for spares and strikes across three games, and the best legal 5-card poker hand wins each game's payout. A portion of each pool goes to a designated charity — making this a charitable fundraising game, not gambling. Built for a local bowling league in the San Francisco Bay Area — architected for multi-league, multi-season licensing.

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
nvm use          # Mac/Linux only
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

teams          (id, name)

season_teams   (id, season_id, team_id, team_number)

bowlers        (id, full_name, normalized_name,
                imported_name, email, is_sub)

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

progressive_pot(id, season_id, week_number, transaction_type,
                amount, balance_after, notes, created_at)

charity_fund   (id, season_id, week_number, transaction_type,
                amount, balance_after, notes, created_at)

charitable_donations (id, season_id, week_number, amount, notes)

historical_checkins  (id, season_name TEXT, week_number,
                      player_count, pool_amount,
                      charity_amount, bowl_date, created_at)

settings       (league_id, key, value)  ← composite PK (league_id, key)
```

### Key Schema Notes
- `imported_name` on bowlers — immutable identity key, set once at insert, NEVER updated
- `historical_checkins` uses `season_name TEXT` not a foreign key — always query by name string
- `settings` composite PK is `(league_id, key)` — never query by key alone
- `lane_positions` is JSONB array of team_numbers e.g. `[5,7,4,12,2,10,1,9,6,8,3,11]`
- `bowl_date` must be cast `::TEXT` in queries — Neon driver format breaks `new Date()`
- All numeric columns from Neon return as strings — always wrap in `parseFloat()` / `parseInt()`
- `transaction_type` is the correct column name in both `progressive_pot` and `charity_fund`
- `historical_checkins` has NO progressive column — only `charity_amount` and `player_count`

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
3. **Lock Night** → writes ONE combined charity entry (pool + donation) to `charity_fund`; writes progressive to `progressive_pot`
4. **Game Night** → record winners only; no ledger writes except Royal Flush
5. **Royal Flush** → writes payout entry to `progressive_pot` with `balance_after = 0`
6. **Unlock** → reverses lock entries + clears game results (destructive)
7. **Donation edit on locked night** → silent relock

### Running Balance Formulas (single source of truth: `lib/finance.js`)

**Progressive Balance:**
```
IF last progressive_pot entry is transaction_type='payout' → return 0
ELSE: progressive_seed + (COUNT(historical_checkins) × progressive_nightly) + last balance_after
```

**Charity Balance:**
```
IF charity payout has occurred (transaction_type='payout' in charity_fund):
  → SUM(charity_fund.amount WHERE id > last payout id)
ELSE:
  → charity_seed + SUM(historical_checkins.charity_amount) + SUM(charity_fund.amount)
```

**CRITICAL:** All financial calculations MUST use `lib/finance.js` functions.
Never duplicate these calculations inline in route files.

---

## `lib/finance.js` — Shared Finance Library

Single source of truth for all financial math. Every API route imports from here.

```javascript
getProgressiveBalance(seasonId)  // current progressive pot
getCharityBalance(seasonId)      // current charity running total
getPayoutSummary(seasonId, playerCount)  // full payout breakdown
getProgressiveNightly(seasonId)  // setting value
getBuyinAmount(seasonId)         // setting value
```

**Never duplicate these calculations inline in route files.**

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

### Settings (league-scoped)
```javascript
const settings = await sql`
  SELECT key, value FROM settings WHERE league_id = ${season.league_id}
`;
```

### Week Detection (day-agnostic — no hardcoded day of week)
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

### Schedule Date Year Logic
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
│   ├── globals.css
│   ├── layout.js
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
│   ├── leagues/route.js
│   ├── leagues/[leagueSlug]/route.js
│   ├── leagues/new/route.js
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
│   ├── finance.js                         ← ALL financial calculations
│   └── pdfParser.js
├── migrations/                            ← DB migration scripts + README
├── CLAUDE.md                              ← Permanent Claude Code instructions
├── .nvmrc
├── next.config.js
├── vercel.json
└── package.json
```

---

## NavBar Component

Client Component (`'use client'`). Uses `usePathname()` to detect route context.

- **On `/` and `/new-league`:** app title only, no nav links
- **On `/[leagueSlug]`:** app title only, no nav links
- **On `/[leagueSlug]/[seasonSlug]/*`:** full nav + context bar

Context bar: league name · season name (dynamic from DB), centered, with `[LEAGUES]` button right → `router.push('/')`.

**localStorage keys:**
- `lastLeagueSlug` + `lastSeasonSlug` — written on every league+season page load
- `theme` — light/dark mode preference

---

## Screen Reference

### League Picker (`/`)
Full-width league cards, left accent border in league color. `● last session` badge on last-used league. Rainbow-border "Set Up New League" card. Fetches `GET /api/leagues`.

### Season Picker (`/[leagueSlug]`)
Breadcrumb, full-width season cards (active/complete), start/end dates from schedule. Rainbow-border "Set Up New Season" card. Fetches `GET /api/leagues/[leagueSlug]`.

### New League Setup (`/new-league`)
Two equal cards: League Identity + Game Rules. Color swatches, live preview bar, payout preview. Full-width save row. POSTs to `/api/leagues/new`.

### Dashboard (`/[leagueSlug]/[seasonSlug]`)
Week banner, season progress, nav cards, lane graphic (current + upcoming week).

### Check-In
Auto-detects week. 4-column alpha grid. Lock/Unlock Night.

### Game Night
Payout summary, donation card, 3 game slots, Royal Flush auto-progressive.

### Report
Weekly PNG export, dark/light toggle, rainbow stripe card, charity name from DB.

### Schedule
16 weeks, lane assignments, edit starting lane, position rounds.

### Roster
Team cards, inline editable, VACANT dimmed, subs section, re-import PDF.

### History
Season filter, charity ledger drawer, game log, leaderboard.

### Settings
League identity, game rules, season seeds, appearance, danger zone.

### Season Setup
PDF import: League Standings + Schedule. Season name, slug, start year. Access via Settings only.

---

## PDF Parsing

### League Standings (BLS software)
- Page 2: Team Rosters (Week 1 format differs from Week 2+)
- Page 3: Temporary Substitutes
- VACANT rows included, awards/birthday sections filtered

### Schedule PDF
- Format: `Wk01 04/22 5- 7 4- 12 2- 10 1- 9 6- 8 3- 11`
- Year derived from `seasons.start_year` (NOT today's date)
- Month rollover: if month < first week's month → year + 1

### Name Normalization
- Format: `First LastInitial` e.g. `Mark B`
- Strips role suffixes: `-*`, `-Sec`, `-Tr`, `-Pres`, `-VP`
- Skips: II, III, Jr, Sr

---

## Lane Graphic API

Returns current week + next upcoming week (skips position rounds).
- `lane_positions` JSONB pairs: [0,1], [2,3], [4,5]...
- team_number → `season_teams` → `teams` → `season_roster` → `bowlers.normalized_name`
- VACANT flagged `isVacant: true`, `hasPairs: false` → TBD placeholder

---

## Migrations

```
migrations/20260606-add-season-start-year.mjs
migrations/20260606-populate-season-dates.mjs
migrations/20260606-fix-summer26-schedule-dates.mjs
migrations/20260611-fix-week8-royal-flush-payout.mjs
```

Run with:
```bash
node --use-system-ca --env-file=.env.local migrations/FILENAME.mjs
```

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

- Form labels: `#e8ff47` bold uppercase 10px
- Rainbow gradient: `linear-gradient(135deg, #FF0018 0%, #FFA52C 14%, #FFFF41 28%, #008018 42%, #0000F9 57%, #86007D 71%, #FF0018 85%, #FFA52C 100%)`
- All styling via inline styles — no CSS framework
- Light mode: stub only in `globals.css` (V3)

---

## Known Issues / Lessons Learned

- **Always verify column names against live schema before writing any finance.js code**
- `transaction_type` is the correct column in both `charity_fund` and `progressive_pot` (NOT `entry_type`)
- `historical_checkins` has NO progressive column — use `COUNT(*)` × nightly for historical progressive
- Financial calculations MUST go through `lib/finance.js` — never inline in routes
- When writing TASK.md for financial changes, include schema verification step first

---

## V3 Backlog

- **Authentication** — Auth.js + Google OAuth, per-league admin access (most critical before licensing)
- **Mobile responsive** — hamburger nav, vertical card stacking, touch-optimized for phone use during bowling night
- **Light mode** — full CSS design pass (stub exists)
- **Configurable team accent color** — per-league in Settings (currently hardcoded `#c084fc`)
- **NavBar context fetch optimization** — currently fetches on every page load
- **Player-facing read-only view** — players check standings on their phones
- **Email/SMS report delivery** — auto-send weekly PNG
- **Multi-admin per league**
- **Progressive pot history ledger** — full view of contributions and payouts
