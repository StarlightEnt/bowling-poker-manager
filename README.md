# 🎳 Bowling Poker Manager

A web app for managing a poker side-game played during bowling league nights. Built for the LGBT Wednesday Community League in Daly City, CA — and designed to be licensed to any bowling league.

Players pay a weekly buy-in, draw cards for spares and strikes during three games of bowling, and the best legal 5-card poker hand wins each game. A portion of each week's pool is donated to a designated charity — making this a charitable fundraising game, not gambling. The app handles check-in, payouts, game recording, weekly reports, and season financials.

**Live app:** [bowling-poker-manager.vercel.app](https://bowling-poker-manager.vercel.app)

---

## Features

- **Multi-league, multi-season** — manage any number of leagues and seasons, each with their own roster, schedule, and financial history
- **Check-In** — mark players as paid each week, lock the night to calculate payouts
- **Game Night** — record poker hand winners across 3 games, track progressive pot and charity fund
- **Weekly Report** — generate and download a PNG summary card for sharing
- **Schedule** — import lane assignments from PDF, view and edit the full season schedule
- **Roster** — manage teams and bowlers, re-import updated PDFs without losing history
- **History** — full game log, leaderboard, and charity fund ledger across seasons
- **Settings** — configure league identity, game rules, and financial seeds
- **PDF Import** — parse BLS software League Standings and Schedule PDFs to set up a new season in seconds

---

## Tech Stack

- **Framework:** Next.js 14 (App Router, JavaScript)
- **Database:** Neon (PostgreSQL)
- **Hosting:** Vercel (auto-deploy from `main`)
- **PDF Parsing:** `pdf-parse`
- **Image Export:** `html-to-image`

---

## Local Development

### Prerequisites
- Node.js 24.16.0 (pinned via `.nvmrc`)
- A Neon database (free tier works fine)

### Setup

```bash
# Clone the repo
git clone https://github.com/StarlightEnt/bowling-poker-manager.git
cd bowling-poker-manager

# Mac: use nvm to activate correct Node version
nvm use

# Install dependencies
npm install

# Create environment file (never committed)
echo "DATABASE_URL=your_neon_connection_string" > .env.local

# Start dev server (runs on port 3005)
npm run dev
```

Open [http://localhost:3005](http://localhost:3005)

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |

---

## Database

The schema is documented in `migrations/`. Run migrations with:

```bash
node --use-system-ca --env-file=.env.local migrations/FILENAME.mjs
```

See `migrations/README.md` for the full migration history.

---

## Project Structure

```
app/
├── page.js                        # League picker
├── new-league/                    # New league setup
├── components/NavBar.js           # Context-aware navigation
└── [leagueSlug]/
    ├── page.js                    # Season picker
    └── [seasonSlug]/
        ├── page.js                # Dashboard
        ├── checkin/               # Weekly check-in
        ├── gamenight/             # Game recording
        ├── report/                # Weekly report + PNG export
        ├── schedule/              # Season schedule
        ├── roster/                # Team and bowler management
        ├── history/               # Past seasons and game log
        ├── settings/              # League and game configuration
        └── setup/                 # Season setup via PDF import

app/api/                           # API routes (mirror page structure)
lib/
├── db.js                          # Neon database connection
└── pdfParser.js                   # BLS PDF parsing logic
migrations/                        # Database migration scripts
```

---

## URL Structure

```
/                                  # League picker
/[leagueSlug]/                     # Season picker
/[leagueSlug]/[seasonSlug]/        # Dashboard
/[leagueSlug]/[seasonSlug]/checkin
/[leagueSlug]/[seasonSlug]/gamenight
# etc.
```

Example: `/LGBTWedCom/Sum26/checkin`

---

## How the Game Works

Each week players pay a **$5 buy-in**. The pot is split as follows:

- **$3** goes to the progressive pot (carries over until a Royal Flush is hit)
- The remaining pool is divided: **75% paid out** across 3 games, **25% donated to a designated charity** — this charitable component is what distinguishes the game from gambling
- During bowling, players draw cards for **spares** (1 card) and **strikes** (2 cards)
- At the end of each game, the best legal 5-card poker hand wins that game's payout

---

## Claude Code Integration

This project uses Claude Code for AI-assisted development. See `CLAUDE.md` for standing instructions including database migration patterns, API route conventions, and code style rules.

Task-specific instructions are passed via `TASK.md` (self-deletes on completion).

---

## License

Private — all rights reserved. Contact [StarlightEnt](https://github.com/StarlightEnt) for licensing inquiries.
