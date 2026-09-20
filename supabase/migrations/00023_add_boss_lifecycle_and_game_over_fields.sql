
-- 上司生命周期字段
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS boss_tenure_start   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS boss_tenure_duration integer NOT NULL DEFAULT 1460,
  ADD COLUMN IF NOT EXISTS boss2_tenure_start   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS boss2_tenure_duration integer NOT NULL DEFAULT 1460,
  ADD COLUMN IF NOT EXISTS boss3_tenure_start   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS boss3_tenure_duration integer NOT NULL DEFAULT 1460;

-- 纪委风险追踪字段
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS last_discipline_warn_day integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_case_check_day      integer NOT NULL DEFAULT 0;

-- 重大事故风险追踪字段
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS consecutive_fail_events  integer NOT NULL DEFAULT 0;

-- Game Over 结局类型（null=正常游戏中）
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS game_over_type text;

-- 初始化现有存档的上司任期：随机3-5年（1095-1825天）
UPDATE player_saves
SET
  boss_tenure_start    = 0,
  boss_tenure_duration = 1095 + floor(random() * 731)::integer,
  boss2_tenure_start   = 0,
  boss2_tenure_duration= 1095 + floor(random() * 731)::integer,
  boss3_tenure_start   = 0,
  boss3_tenure_duration= 1095 + floor(random() * 731)::integer
WHERE boss_tenure_start = 0;
