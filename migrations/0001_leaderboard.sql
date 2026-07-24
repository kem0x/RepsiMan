CREATE TABLE IF NOT EXISTS leaderboard_tokens (
  token TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  level TEXT NOT NULL,
  route TEXT NOT NULL,
  ruleset TEXT NOT NULL,
  issued_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);

CREATE INDEX IF NOT EXISTS leaderboard_tokens_player_issued
  ON leaderboard_tokens(player_id, issued_at);

CREATE TABLE IF NOT EXISTS leaderboard_submissions (
  token TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  level TEXT NOT NULL,
  route TEXT NOT NULL,
  ruleset TEXT NOT NULL,
  ticks INTEGER NOT NULL,
  flags INTEGER NOT NULL,
  build TEXT NOT NULL,
  submitted_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS leaderboard_runs (
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  level TEXT NOT NULL,
  route TEXT NOT NULL,
  ruleset TEXT NOT NULL,
  ticks INTEGER NOT NULL,
  flags INTEGER NOT NULL,
  build TEXT NOT NULL,
  achieved_at INTEGER NOT NULL,
  PRIMARY KEY (level, route, ruleset, player_id)
);

CREATE INDEX IF NOT EXISTS leaderboard_runs_ranking
  ON leaderboard_runs(level, route, ruleset, ticks, achieved_at);
