ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS dept_policy_cooldowns jsonb NOT NULL DEFAULT '{}';