ALTER TABLE public.player_saves
  ADD COLUMN faction_position text,
  ADD COLUMN faction_position_occupancy jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN last_confrontation_day integer NOT NULL DEFAULT 0,
  ADD COLUMN last_tenure_assess_day integer NOT NULL DEFAULT 0,
  ADD COLUMN demotion_cooldown_until integer NOT NULL DEFAULT 0,
  ADD COLUMN last_transfer_day integer NOT NULL DEFAULT 0;