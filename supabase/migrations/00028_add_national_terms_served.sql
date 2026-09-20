ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS national_terms_served integer NOT NULL DEFAULT 0;
