
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS tax_revenue integer NOT NULL DEFAULT 0;
