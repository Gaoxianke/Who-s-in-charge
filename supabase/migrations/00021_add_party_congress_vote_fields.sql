ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS party_congress_vote   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_party_congress_day integer NOT NULL DEFAULT 0;