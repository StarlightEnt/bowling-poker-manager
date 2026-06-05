-- ================================================================
-- Bowling Poker Manager — Schema Refactor Migration
-- Run this entire script in the Neon SQL Editor in one paste.
-- It is wrapped in a transaction: if anything fails the DB is
-- left exactly as it was (original tables untouched).
-- ================================================================

BEGIN;

-- ----------------------------------------------------------------
-- STEP 0  Save existing schedule data before dropping anything
-- ----------------------------------------------------------------
DROP TABLE IF EXISTS _sched_bk;
CREATE TEMP TABLE _sched_bk AS
  SELECT week_number, bowl_date, starting_lane,
         lane_positions, is_position_round, notes
  FROM   schedule
  WHERE  season_id = 7;

-- Correct the Week 8 bowl_date (was null / wrong in old data)
UPDATE _sched_bk SET bowl_date = '2026-06-04' WHERE week_number = 8;


-- ----------------------------------------------------------------
-- STEP 1  Drop all existing tables (CASCADE handles FKs)
-- ----------------------------------------------------------------
DROP TABLE IF EXISTS game_results    CASCADE;
DROP TABLE IF EXISTS checkins        CASCADE;
DROP TABLE IF EXISTS progressive_pot CASCADE;
DROP TABLE IF EXISTS charity_fund    CASCADE;
DROP TABLE IF EXISTS schedule        CASCADE;
DROP TABLE IF EXISTS season_roster   CASCADE;
DROP TABLE IF EXISTS season_teams    CASCADE;
DROP TABLE IF EXISTS bowlers         CASCADE;
DROP TABLE IF EXISTS teams           CASCADE;
DROP TABLE IF EXISTS seasons         CASCADE;
DROP TABLE IF EXISTS settings        CASCADE;


-- ----------------------------------------------------------------
-- STEP 2  Create new tables
-- ----------------------------------------------------------------

CREATE TABLE bowlers (
  id              SERIAL PRIMARY KEY,
  full_name       TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  imported_name   TEXT NOT NULL,
  email           TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE teams (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE seasons (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  start_date DATE,
  end_date   DATE,
  is_active  BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE season_teams (
  id          SERIAL PRIMARY KEY,
  season_id   INTEGER REFERENCES seasons(id) ON DELETE CASCADE,
  team_id     INTEGER REFERENCES teams(id),
  team_number INTEGER NOT NULL,
  UNIQUE (season_id, team_id),
  UNIQUE (season_id, team_number)
);

CREATE TABLE season_roster (
  id             SERIAL PRIMARY KEY,
  season_id      INTEGER REFERENCES seasons(id) ON DELETE CASCADE,
  team_id        INTEGER REFERENCES teams(id),
  bowler_id      INTEGER REFERENCES bowlers(id),
  position_order INTEGER,
  book_average   INTEGER,
  is_sub         BOOLEAN DEFAULT false,
  UNIQUE (season_id, bowler_id)
);

CREATE TABLE schedule (
  id                SERIAL PRIMARY KEY,
  season_id         INTEGER REFERENCES seasons(id) ON DELETE CASCADE,
  week_number       INTEGER NOT NULL,
  bowl_date         DATE,
  starting_lane     INTEGER DEFAULT 1,
  lane_positions    JSONB,
  is_position_round BOOLEAN DEFAULT false,
  notes             TEXT,
  UNIQUE (season_id, week_number)
);

CREATE TABLE checkins (
  id            SERIAL PRIMARY KEY,
  season_id     INTEGER REFERENCES seasons(id) ON DELETE CASCADE,
  week_number   INTEGER NOT NULL,
  bowler_id     INTEGER REFERENCES bowlers(id),
  paid_amount   NUMERIC(10,2) NOT NULL,
  checked_in_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (season_id, week_number, bowler_id)
);

CREATE TABLE game_results (
  id                 SERIAL PRIMARY KEY,
  season_id          INTEGER REFERENCES seasons(id) ON DELETE CASCADE,
  week_number        INTEGER NOT NULL,
  game_number        INTEGER NOT NULL CHECK (game_number IN (1,2,3)),
  bowler_id          INTEGER REFERENCES bowlers(id),
  hand_type          TEXT NOT NULL,
  hand_detail        TEXT,
  pot_amount         NUMERIC(10,2),
  is_progressive_win BOOLEAN DEFAULT false,
  progressive_payout NUMERIC(10,2) DEFAULT 0,
  total_payout       NUMERIC(10,2),
  created_at         TIMESTAMP DEFAULT NOW()
);

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

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);


-- ----------------------------------------------------------------
-- STEP 3  Settings
-- ----------------------------------------------------------------
INSERT INTO settings (key, value) VALUES
  ('buyin_amount',        '5'),
  ('progressive_nightly', '3');


-- ----------------------------------------------------------------
-- STEP 4  Season  (id = 1)
-- ----------------------------------------------------------------
INSERT INTO seasons (name, is_active)
VALUES ('Summer 2026', true);


-- ----------------------------------------------------------------
-- STEP 5  Teams  (ids 1–12, in team-number order)
-- ----------------------------------------------------------------
INSERT INTO teams (name) VALUES
  ('Snappy Backends'),        -- 1
  ('IB Profanes'),            -- 2
  ('Pilsner Penguins'),       -- 3
  ('Pick Up Artists'),        -- 4
  ('Sacurrity'),              -- 5
  ('Rocky Squirrels'),        -- 6
  ('Gutter Fillers'),         -- 7
  ('Frenchie Daddies'),       -- 8
  ('Taste The Rainbow'),      -- 9
  ('Wisteria Lanes'),         -- 10
  ('Dawg Pound'),             -- 11
  ('O''Malley & The Sallys'); -- 12


-- ----------------------------------------------------------------
-- STEP 6  Season teams  (season 1, team_number matches team id)
-- ----------------------------------------------------------------
INSERT INTO season_teams (season_id, team_id, team_number) VALUES
  (1,  1,  1),
  (1,  2,  2),
  (1,  3,  3),
  (1,  4,  4),
  (1,  5,  5),
  (1,  6,  6),
  (1,  7,  7),
  (1,  8,  8),
  (1,  9,  9),
  (1, 10, 10),
  (1, 11, 11),
  (1, 12, 12);


-- ----------------------------------------------------------------
-- STEP 7  Bowlers  (ids 1–77, permanent league-wide records)
--
-- Insertion order is deterministic so all id-based comments below
-- are correct.  imported_name is the immutable identity key and
-- is NEVER changed after this insert.
-- ----------------------------------------------------------------
INSERT INTO bowlers (full_name, normalized_name, imported_name, email) VALUES
  -- Team 1 – Snappy Backends
  ('Mark Bertelsen',     'Mark B',     'Mark Bertelsen',     NULL),  --  1
  ('Jonathan Chow',      'Jonathan C', 'Jonathan Chow',      NULL),  --  2
  ('Sean Pappas',        'Sean P',     'Sean Pappas',        NULL),  --  3
  ('Glenn Normandin',    'Glenn N',    'Glenn Normandin',    NULL),  --  4
  -- Team 2 – IB Profanes
  ('Robert Hughes',      'Robert H',   'Robert Hughes',      NULL),  --  5
  ('Rian Vandermaden',   'Rian V',     'Rian Vandermaden',   NULL),  --  6
  ('Cathy Patterson',    'Cathy P',    'Cathy Patterson',    NULL),  --  7
  ('Duane Flohra',       'Duane F',    'Duane Flohra',       NULL),  --  8
  -- Team 3 – Pilsner Penguins
  ('Brian Kneuker',      'Brian K',    'Brian Kneuker',      NULL),  --  9
  ('David Caldera',      'David C',    'David Caldera',      NULL),  -- 10
  ('Bryan Hoff',         'Bryan H',    'Bryan Hoff',         NULL),  -- 11
  ('Charles Reader',     'Charles R',  'Charles Reader',     NULL),  -- 12
  ('Darryl Lee',         'Darryl L',   'Darryl Lee',         NULL),  -- 13
  ('Samuel Kohler',      'Samuel K',   'Samuel Kohler',      NULL),  -- 14
  -- Team 4 – Pick Up Artists
  ('Chad Amsler',        'Chad A',     'Chad Amsler',        NULL),  -- 15
  ('Chewie Perez',       'Chewie P',   'Richard Perez',      NULL),  -- 16  (display name differs)
  ('Vince Wilson',       'Vince W',    'Vince Wilson',       NULL),  -- 17
  ('Henry Stockwell',    'Henry S',    'Henry Stockwell',    NULL),  -- 18
  -- Team 5 – Sacurrity
  ('Joseph Johnson',     'Joseph J',   'Joseph Johnson',     NULL),  -- 19
  ('Mark Parrott',       'Mark P',     'Mark Parrott',       NULL),  -- 20
  ('Walter Turner',      'Walter T',   'Walter Turner',      NULL),  -- 21
  ('Ken Mitchell-*Pres', 'Ken M',      'Ken Mitchell-*Pres', NULL),  -- 22
  -- Team 6 – Rocky Squirrels
  ('Peter Thomas',       'Peter T',    'Peter Thomas',       NULL),  -- 23
  ('JF Unson',           'JF U',       'John Francis Unson', NULL),  -- 24  (display name differs)
  ('Ron Jury',           'Ron J',      'Ron Jury',           NULL),  -- 25
  ('Robert Werner-*VP',  'Robert W',   'Robert Werner-*VP',  NULL),  -- 26
  -- Team 7 – Gutter Fillers
  ('Stephen Yu',         'Stephen Y',  'Stephen Yu',         NULL),  -- 27
  ('Ric Lewis',          'Ric L',      'Ric Lewis',          NULL),  -- 28
  ('Micah Castro',       'Micah C',    'Micah Castro',       NULL),  -- 29
  ('Jeremy Schrader',    'Jeremy S',   'Jeremy Schrader',    NULL),  -- 30
  -- Team 8 – Frenchie Daddies
  ('Dave Savoni',        'Dave S',     'Dave Savoni',        NULL),  -- 31
  ('Reagan Peralta',     'Reagan P',   'Reagan Peralta',     NULL),  -- 32
  ('Ray Aquino',         'Ray A',      'Ray Aquino',         NULL),  -- 33
  ('Alfredo Martinez',   'Alfredo M',  'Alfredo Martinez',   NULL),  -- 34
  -- Team 9 – Taste The Rainbow
  ('Raymond Evans',      'Raymond E',  'Raymond Evans',      NULL),  -- 35
  ('Don Corbiell',       'Don C',      'Don Corbiell',       NULL),  -- 36
  ('Douglas Litwin',     'Douglas L',  'Douglas Litwin',     NULL),  -- 37
  ('Allison Laureano',   'Allison L',  'Allison Laureano',   NULL),  -- 38
  ('Rich Martini',       'Rich M',     'Rich Martini',       NULL),  -- 39
  -- Team 10 – Wisteria Lanes
  ('Keith Myers',        'Keith M',    'Keith Myers',        NULL),  -- 40
  ('Andy LeClair',       'Andy L',     'Andy LeClair',       NULL),  -- 41
  ('Peter Grady',        'Peter G',    'Peter Grady',        NULL),  -- 42
  ('Kirk Smith',         'Kirk S',     'Kirk Smith',         NULL),  -- 43
  ('Robert Martin',      'Robert M',   'Robert Martin',      NULL),  -- 44
  -- Team 11 – Dawg Pound
  ('James Camarillo',    'James C',    'James Camarillo',    NULL),  -- 45
  ('VACANT',             'VACANT',     'VACANT',             NULL),  -- 46
  ('Joe Kelso',          'Joe K',      'Joe Kelso',          NULL),  -- 47
  ('Rob Whitman',        'Rob W',      'Robert Whitman',     NULL),  -- 48  (display name differs)
  -- Team 12 – O'Malley & The Sallys
  ('John Bernier',       'John B',     'John Bernier',       NULL),  -- 49
  ('Wade Crosson',       'Wade C',     'Wade Crosson',       NULL),  -- 50
  ('Patrick O''Connor',  'Patrick O',  'Patrick O''Connor',  NULL),  -- 51
  ('Saman Oun',          'Saman O',    'Saman Oun',          NULL),  -- 52
  -- Substitutes
  ('Kevin Ahart',        'Kevin A',    'Kevin Ahart',        NULL),  -- 53
  ('Bryn Barone',        'Bryn B',     'Bryn Barone',        NULL),  -- 54
  ('Ryan Behrens',       'Ryan B',     'Ryan Behrens',       NULL),  -- 55
  ('Paul Chung',         'Paul C',     'Paul Chung',         NULL),  -- 56
  ('Andrei Cobbs II',    'Andrei C',   'Andrei Cobbs II',    NULL),  -- 57
  ('Jerry Cox',          'Jerry C',    'Jerry Cox',          NULL),  -- 58
  ('Michael Cross',      'Michael C',  'Michael Cross',      NULL),  -- 59
  ('Alex Dohrmann',      'Alex D',     'Alex Dohrmann',      NULL),  -- 60
  ('Joe Dolen',          'Joe D',      'Joe Dolen',          NULL),  -- 61
  ('Rodney Duncan',      'Rodney D',   'Rodney Duncan',      NULL),  -- 62
  ('Charlie Esteban',    'Charlie E',  'Charlie Esteban',    NULL),  -- 63
  ('Allister Fong',      'Allister F', 'Allister Fong',      NULL),  -- 64
  ('Gregg Gaubatz',      'Gregg G',    'Gregg Gaubatz',      NULL),  -- 65
  ('Jeff Goldenberg',    'Jeff G',     'Jeff Goldenberg',    NULL),  -- 66
  ('Michael Harrington', 'Michael H',  'Michael Harrington', NULL),  -- 67
  ('Brandon Holroyd',    'Brandon H',  'Brandon Holroyd',    NULL),  -- 68
  ('David Marks',        'David M',    'David Marks',        NULL),  -- 69
  ('Michael Masterson',  'Michael M',  'Michael Masterson',  NULL),  -- 70
  ('Patrick Mebine',     'Patrick M',  'Patrick Mebine',     NULL),  -- 71
  ('Todd Nagengast',     'Todd N',     'Todd Nagengast',     NULL),  -- 72
  ('Jesse Pugach',       'Jesse P',    'Jesse Pugach',       NULL),  -- 73
  ('John Riccuito',      'John R',     'John Riccuito',      NULL),  -- 74
  ('YuPing Toh',         'YuPing T',   'YuPing Toh',         NULL),  -- 75
  ('Erric White',        'Erric W',    'Erric White',        NULL),  -- 76
  ('Linda Wright',       'Linda W',    'Linda Wright',       NULL);  -- 77


-- ----------------------------------------------------------------
-- STEP 8  Season roster  (season_id = 1)
--
-- All joins are done by imported_name / team name so IDs are
-- never hardcoded — the JOIN catches any insert-order mismatch.
-- ----------------------------------------------------------------

-- Regular bowlers (51 rows — VACANT handled separately)
INSERT INTO season_roster
  (season_id, bowler_id, team_id, position_order, book_average, is_sub)
SELECT 1, b.id, t.id, v.pos, v.avg, false
FROM (VALUES
  ('Mark Bertelsen'::TEXT,    'Snappy Backends'::TEXT,      1::INT, 171::INT),
  ('Jonathan Chow',           'Snappy Backends',            2,      152),
  ('Sean Pappas',             'Snappy Backends',            3,      179),
  ('Glenn Normandin',         'Snappy Backends',            4,      191),
  ('Robert Hughes',           'IB Profanes',                1,      183),
  ('Rian Vandermaden',        'IB Profanes',                2,      155),
  ('Cathy Patterson',         'IB Profanes',                3,      164),
  ('Duane Flohra',            'IB Profanes',                4,      198),
  ('Brian Kneuker',           'Pilsner Penguins',           1,      180),
  ('David Caldera',           'Pilsner Penguins',           2,      160),
  ('Bryan Hoff',              'Pilsner Penguins',           3,      196),
  ('Charles Reader',          'Pilsner Penguins',           4,      184),
  ('Darryl Lee',              'Pilsner Penguins',           5,      215),
  ('Samuel Kohler',           'Pilsner Penguins',           6,      129),
  ('Chad Amsler',             'Pick Up Artists',            1,      138),
  ('Richard Perez',           'Pick Up Artists',            2,      157),
  ('Vince Wilson',            'Pick Up Artists',            3,      201),
  ('Henry Stockwell',         'Pick Up Artists',            4,      201),
  ('Joseph Johnson',          'Sacurrity',                  1,      132),
  ('Mark Parrott',            'Sacurrity',                  2,      145),
  ('Walter Turner',           'Sacurrity',                  3,      181),
  ('Ken Mitchell-*Pres',      'Sacurrity',                  4,      160),
  ('Peter Thomas',            'Rocky Squirrels',            1,      132),
  ('John Francis Unson',      'Rocky Squirrels',            2,      166),
  ('Ron Jury',                'Rocky Squirrels',            3,      158),
  ('Robert Werner-*VP',       'Rocky Squirrels',            4,      155),
  ('Stephen Yu',              'Gutter Fillers',             1,      158),
  ('Ric Lewis',               'Gutter Fillers',             2,      184),
  ('Micah Castro',            'Gutter Fillers',             3,      171),
  ('Jeremy Schrader',         'Gutter Fillers',             4,      169),
  ('Dave Savoni',             'Frenchie Daddies',           1,      131),
  ('Reagan Peralta',          'Frenchie Daddies',           2,      107),
  ('Ray Aquino',              'Frenchie Daddies',           3,      138),
  ('Alfredo Martinez',        'Frenchie Daddies',           4,      152),
  ('Raymond Evans',           'Taste The Rainbow',          1,      143),
  ('Don Corbiell',            'Taste The Rainbow',          2,      133),
  ('Douglas Litwin',          'Taste The Rainbow',          3,      171),
  ('Allison Laureano',        'Taste The Rainbow',          4,      167),
  ('Rich Martini',            'Taste The Rainbow',          5,      170),
  ('Keith Myers',             'Wisteria Lanes',             1,      148),
  ('Andy LeClair',            'Wisteria Lanes',             2,      153),
  ('Peter Grady',             'Wisteria Lanes',             3,      158),
  ('Kirk Smith',              'Wisteria Lanes',             4,      163),
  ('Robert Martin',           'Wisteria Lanes',             5,      157),
  ('James Camarillo',         'Dawg Pound',                 1,      159),
  ('Joe Kelso',               'Dawg Pound',                 3,      163),
  ('Robert Whitman',          'Dawg Pound',                 4,      184),
  ('John Bernier',            'O''Malley & The Sallys',     1,      123),
  ('Wade Crosson',            'O''Malley & The Sallys',     2,      142),
  ('Patrick O''Connor',       'O''Malley & The Sallys',     3,      147),
  ('Saman Oun',               'O''Malley & The Sallys',     4,      184)
) AS v(imported_name, team_name, pos, avg)
JOIN bowlers b ON b.imported_name = v.imported_name
JOIN teams  t ON t.name           = v.team_name;

-- VACANT slot  (Dawg Pound position 2, no book average)
INSERT INTO season_roster
  (season_id, bowler_id, team_id, position_order, book_average, is_sub)
SELECT 1, b.id, t.id, 2, NULL, false
FROM   bowlers b, teams t
WHERE  b.imported_name = 'VACANT'
AND    t.name          = 'Dawg Pound';

-- Substitutes  (no team)
INSERT INTO season_roster
  (season_id, bowler_id, team_id, position_order, book_average, is_sub)
SELECT 1, b.id, NULL, v.pos, v.avg, true
FROM (VALUES
  ('Kevin Ahart'::TEXT,        1::INT, 179::INT),
  ('Bryn Barone',              2,      149),
  ('Ryan Behrens',             3,      167),
  ('Paul Chung',               4,      186),
  ('Andrei Cobbs II',          5,      179),
  ('Jerry Cox',                6,      105),
  ('Michael Cross',            7,      172),
  ('Alex Dohrmann',            8,      182),
  ('Joe Dolen',                9,      133),
  ('Rodney Duncan',           10,      144),
  ('Charlie Esteban',         11,      224),
  ('Allister Fong',           12,      134),
  ('Gregg Gaubatz',           13,      179),
  ('Jeff Goldenberg',         14,      209),
  ('Michael Harrington',      15,      154),
  ('Brandon Holroyd',         16,      179),
  ('David Marks',             17,      190),
  ('Michael Masterson',       18,      167),
  ('Patrick Mebine',          19,      147),
  ('Todd Nagengast',          20,      186),
  ('Jesse Pugach',            21,      179),
  ('John Riccuito',           22,      163),
  ('YuPing Toh',              23,      165),
  ('Erric White',             24,      166),
  ('Linda Wright',            25,      175)
) AS v(imported_name, pos, avg)
JOIN bowlers b ON b.imported_name = v.imported_name;


-- ----------------------------------------------------------------
-- STEP 9  Schedule  (restored from temp backup, new season_id = 1)
-- ----------------------------------------------------------------
INSERT INTO schedule
  (season_id, week_number, bowl_date, starting_lane,
   lane_positions, is_position_round, notes)
SELECT 1, week_number, bowl_date, starting_lane,
       lane_positions, is_position_round, notes
FROM   _sched_bk;


-- ----------------------------------------------------------------
-- STEP 10  Checkins  (Week 8, 25 players — looked up by imported_name)
-- ----------------------------------------------------------------
INSERT INTO checkins (season_id, week_number, bowler_id, paid_amount)
SELECT 1, 8, b.id, 5.00
FROM (VALUES
  ('Allison Laureano'::TEXT),
  ('Bryan Hoff'),
  ('Cathy Patterson'),
  ('Richard Perez'),
  ('David Marks'),
  ('Douglas Litwin'),
  ('Duane Flohra'),
  ('Glenn Normandin'),
  ('Gregg Gaubatz'),
  ('James Camarillo'),
  ('Joe Kelso'),
  ('John Bernier'),
  ('Jonathan Chow'),
  ('Keith Myers'),
  ('Kirk Smith'),
  ('Mark Bertelsen'),
  ('Patrick O''Connor'),
  ('Raymond Evans'),
  ('Ric Lewis'),
  ('Robert Whitman'),
  ('Saman Oun'),
  ('Sean Pappas'),
  ('Stephen Yu'),
  ('Vince Wilson'),
  ('Wade Crosson')
) AS v(imported_name)
JOIN bowlers b ON b.imported_name = v.imported_name;


-- ----------------------------------------------------------------
-- STEP 11  Game results  (Week 8, 3 games)
-- ----------------------------------------------------------------
INSERT INTO game_results
  (season_id, week_number, game_number, bowler_id,
   hand_type, hand_detail,
   pot_amount, is_progressive_win, progressive_payout, total_payout)
SELECT
  1, 8,
  v.game_num,
  b.id,
  v.hand_type,
  v.hand_detail,
  v.pot_amount,
  v.is_prog,
  v.prog_payout,
  v.total_payout
FROM (VALUES
  (1::INT, 'Duane Flohra'::TEXT, 'Four of a Kind'::TEXT, 'J''s'::TEXT,
   41.67::NUMERIC, false::BOOLEAN, 0.00::NUMERIC, 30.00::NUMERIC),
  (2,      'David Marks',        'Straight Flush',        '4-8, Hearts',
   41.67,          false,          0.00,          30.00),
  (3,      'Bryan Hoff',         'Full House',             'Q''s/A''s',
   41.67,          false,          0.00,          30.00)
) AS v(game_num, imported_name, hand_type, hand_detail,
       pot_amount, is_prog, prog_payout, total_payout)
JOIN bowlers b ON b.imported_name = v.imported_name;


-- ----------------------------------------------------------------
-- STEP 12  Progressive pot and charity fund  (Week 8 lock entry)
-- ----------------------------------------------------------------
INSERT INTO progressive_pot
  (season_id, week_number, transaction_type, amount, balance_after, notes)
VALUES (1, 8, 'lock', 3.00, 3.00, 'Night locked');

INSERT INTO charity_fund
  (season_id, week_number, transaction_type, amount, balance_after, notes)
VALUES (1, 8, 'lock', 32.00, 32.00, 'Night locked');


COMMIT;


-- ================================================================
-- VERIFICATION  (run after COMMIT to confirm row counts)
-- Expected: 1 / 12 / 12 / 77 / 77 / 16 / 25 / 3 / 1 / 1 / 2
-- ================================================================
SELECT 'seasons'        AS tbl, COUNT(*) FROM seasons
UNION ALL
SELECT 'teams',                  COUNT(*) FROM teams
UNION ALL
SELECT 'season_teams',           COUNT(*) FROM season_teams
UNION ALL
SELECT 'bowlers',                COUNT(*) FROM bowlers
UNION ALL
SELECT 'season_roster',          COUNT(*) FROM season_roster
UNION ALL
SELECT 'schedule',               COUNT(*) FROM schedule
UNION ALL
SELECT 'checkins',               COUNT(*) FROM checkins
UNION ALL
SELECT 'game_results',           COUNT(*) FROM game_results
UNION ALL
SELECT 'progressive_pot',        COUNT(*) FROM progressive_pot
UNION ALL
SELECT 'charity_fund',           COUNT(*) FROM charity_fund
UNION ALL
SELECT 'settings',               COUNT(*) FROM settings;
