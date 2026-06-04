-- Settings
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO settings (key, value) VALUES
  ('buyin_amount', '5'),
  ('progressive_nightly', '3'),
  ('progressive_per_game', '1');

-- Seasons
CREATE TABLE seasons (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Teams
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  season_id INTEGER REFERENCES seasons(id),
  team_number INTEGER NOT NULL,
  name TEXT NOT NULL
);

-- Bowlers
CREATE TABLE bowlers (
  id SERIAL PRIMARY KEY,
  team_id INTEGER REFERENCES teams(id),
  season_id INTEGER REFERENCES seasons(id),
  full_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  is_sub BOOLEAN DEFAULT false,
  position_order INTEGER,
  book_average INTEGER
);

-- Schedule
CREATE TABLE schedule (
  id SERIAL PRIMARY KEY,
  season_id INTEGER REFERENCES seasons(id),
  week_number INTEGER NOT NULL,
  bowl_date DATE,
  lane_1_2_team1 INTEGER REFERENCES teams(id),
  lane_1_2_team2 INTEGER REFERENCES teams(id),
  lane_3_4_team1 INTEGER REFERENCES teams(id),
  lane_3_4_team2 INTEGER REFERENCES teams(id),
  lane_5_6_team1 INTEGER REFERENCES teams(id),
  lane_5_6_team2 INTEGER REFERENCES teams(id),
  lane_7_8_team1 INTEGER REFERENCES teams(id),
  lane_7_8_team2 INTEGER REFERENCES teams(id),
  lane_9_10_team1 INTEGER REFERENCES teams(id),
  lane_9_10_team2 INTEGER REFERENCES teams(id),
  lane_11_12_team1 INTEGER REFERENCES teams(id),
  lane_11_12_team2 INTEGER REFERENCES teams(id),
  is_position_round BOOLEAN DEFAULT false,
  notes TEXT
);

-- Check-ins
CREATE TABLE checkins (
  id SERIAL PRIMARY KEY,
  season_id INTEGER REFERENCES seasons(id),
  week_number INTEGER NOT NULL,
  bowler_id INTEGER REFERENCES bowlers(id),
  paid_amount NUMERIC(10,2) NOT NULL,
  checked_in_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(season_id, week_number, bowler_id)
);

-- Game results
CREATE TABLE game_results (
  id SERIAL PRIMARY KEY,
  season_id INTEGER REFERENCES seasons(id),
  week_number INTEGER NOT NULL,
  bowl_date DATE,
  game_number INTEGER NOT NULL CHECK (game_number IN (1,2,3)),
  bowler_id INTEGER REFERENCES bowlers(id),
  hand_type TEXT NOT NULL,
  hand_detail TEXT,
  pot_amount NUMERIC(10,2),
  is_progressive_win BOOLEAN DEFAULT false,
  progressive_payout NUMERIC(10,2) DEFAULT 0,
  total_payout NUMERIC(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Progressive pot ledger
CREATE TABLE progressive_pot (
  id SERIAL PRIMARY KEY,
  season_id INTEGER REFERENCES seasons(id),
  week_number INTEGER,
  transaction_type TEXT NOT NULL, -- 'contribution', 'payout', 'carryover'
  amount NUMERIC(10,2) NOT NULL,
  balance_after NUMERIC(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Charity fund ledger
CREATE TABLE charity_fund (
  id SERIAL PRIMARY KEY,
  season_id INTEGER REFERENCES seasons(id),
  week_number INTEGER,
  transaction_type TEXT NOT NULL, -- 'contribution', 'payout'
  amount NUMERIC(10,2) NOT NULL,
  balance_after NUMERIC(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);