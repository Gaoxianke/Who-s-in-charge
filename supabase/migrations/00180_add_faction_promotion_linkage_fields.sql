-- 派系晋升联动：双轨胜利 + 位置棋盘 + 委托 + 密谋 + 叛逃 新增字段
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS board_seats jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS promotion_contest jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS contest_history jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS faction_mandates jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS covert_exposed_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS defect_cooldown_until_day integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS faction_setback_until_day integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mandate_reject_cooldown_until_day integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_mandate_year integer NOT NULL DEFAULT -1;