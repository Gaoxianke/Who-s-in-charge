ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS consecutive_excellent_years integer NOT NULL DEFAULT 0;