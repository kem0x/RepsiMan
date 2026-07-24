CREATE TABLE IF NOT EXISTS leaderboard_recoveries (
  player_id TEXT PRIMARY KEY,
  recovery_id TEXT NOT NULL UNIQUE,
  player_name TEXT NOT NULL,
  recovered_at INTEGER NOT NULL,
  entry_count INTEGER NOT NULL
);
