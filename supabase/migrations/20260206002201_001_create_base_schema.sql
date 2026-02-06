/*
  # Football Prediction System - Base Schema

  1. New Tables
    - `teams` - Football teams
    - `matches` - Upcoming matches
    - `team_stats` - Historical team statistics
    - `predictions` - Generated predictions
    - `results` - Match results and prediction accuracy

  2. Security
    - Enable RLS on all tables
    - Public read access for matches and predictions
    - Admin-only write access

  3. Indexes
    - Indexes on dates for daily queries
    - Indexes on team IDs for joins
*/

CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE,
  country TEXT,
  league TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team_id uuid NOT NULL REFERENCES teams(id),
  away_team_id uuid NOT NULL REFERENCES teams(id),
  match_date TIMESTAMPTZ NOT NULL,
  league TEXT NOT NULL,
  status TEXT DEFAULT 'scheduled',
  home_score INTEGER,
  away_score INTEGER,
  external_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id),
  season INTEGER NOT NULL,
  games_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  expected_goals_for FLOAT DEFAULT 0,
  expected_goals_against FLOAT DEFAULT 0,
  possession_avg FLOAT DEFAULT 0,
  shots_per_game FLOAT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, season)
);

CREATE TABLE IF NOT EXISTS predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id),
  prediction_type TEXT NOT NULL,
  confidence FLOAT NOT NULL,
  probability_1 FLOAT,
  probability_x FLOAT,
  probability_2 FLOAT,
  recommended_bet TEXT,
  odds_1 FLOAT,
  odds_x FLOAT,
  odds_2 FLOAT,
  sent_to_telegram BOOLEAN DEFAULT false,
  daily_batch_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id uuid NOT NULL REFERENCES predictions(id),
  match_id uuid NOT NULL REFERENCES matches(id),
  predicted_outcome TEXT,
  actual_outcome TEXT,
  is_correct BOOLEAN,
  accuracy_score FLOAT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_date DATE NOT NULL UNIQUE,
  match_ids uuid[] NOT NULL,
  predictions_count INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_predictions_match ON predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_predictions_sent ON predictions(sent_to_telegram);
CREATE INDEX IF NOT EXISTS idx_team_stats_season ON team_stats(team_id, season);
CREATE INDEX IF NOT EXISTS idx_results_prediction ON results(prediction_id);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Anyone can view matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Anyone can view team stats" ON team_stats FOR SELECT USING (true);
CREATE POLICY "Anyone can view predictions" ON predictions FOR SELECT USING (true);
CREATE POLICY "Anyone can view results" ON results FOR SELECT USING (true);
CREATE POLICY "Anyone can view daily predictions" ON daily_predictions FOR SELECT USING (true);
