ALTER TABLE public.player_saves
  ADD COLUMN faction_contribution integer NOT NULL DEFAULT 0,
  ADD COLUMN position_occupancy jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN break_promotion_cycle_id integer NOT NULL DEFAULT 0;