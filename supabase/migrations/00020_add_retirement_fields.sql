-- 为 player_saves 增加退休系统字段
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS retirement_delay_years INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_retired BOOLEAN NOT NULL DEFAULT FALSE;