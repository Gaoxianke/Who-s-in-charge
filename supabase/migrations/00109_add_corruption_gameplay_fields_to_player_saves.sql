ALTER TABLE public.player_saves
  ADD COLUMN risk_value integer NOT NULL DEFAULT 0,
  ADD COLUMN clue_level integer NOT NULL DEFAULT 0,
  ADD COLUMN counter_intel integer NOT NULL DEFAULT 10,
  ADD COLUMN illegal_wealth numeric NOT NULL DEFAULT 0,
  ADD COLUMN testimony_chain integer NOT NULL DEFAULT 0,
  ADD COLUMN case_history integer NOT NULL DEFAULT 0,
  ADD COLUMN custody_days integer NOT NULL DEFAULT 0,
  ADD COLUMN illicit_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN transfer_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN asset_hiding jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN invest_state text NOT NULL DEFAULT 'none',
  ADD COLUMN last_interrogation_day integer NOT NULL DEFAULT 0,
  ADD COLUMN case_start_day integer NOT NULL DEFAULT 0;