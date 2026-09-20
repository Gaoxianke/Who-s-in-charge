-- v4 派系玩法：省级席位控制 + 个人职位战
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS province_seat_control JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS personal_contest_cooldown_until INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS personal_contest_history JSONB DEFAULT '[]'::jsonb;