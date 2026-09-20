ALTER TABLE player_saves
  ADD COLUMN cycle_contest_wins integer NOT NULL DEFAULT 0,
  ADD COLUMN cycle_contribution integer NOT NULL DEFAULT 0,
  ADD COLUMN setback_immunity integer NOT NULL DEFAULT 0;