ALTER TABLE player_saves
  ADD COLUMN province_attack_progress JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN contest_mode TEXT DEFAULT 'direct';