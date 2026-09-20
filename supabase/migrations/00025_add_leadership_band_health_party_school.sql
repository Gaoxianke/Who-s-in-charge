-- =====================================================================
-- 领导班子表（各级NPC成员）
-- =====================================================================
CREATE TABLE IF NOT EXISTS leadership_band (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id         uuid NOT NULL REFERENCES player_saves(id) ON DELETE CASCADE,
  position_key    text NOT NULL,           -- 职位标识，如'party_sec','vice_mayor'
  position_label  text NOT NULL,           -- 职位名称，如'镇党委书记'
  rank_level      int NOT NULL,            -- 职级（与玩家同层）
  name            text NOT NULL,
  gender          text NOT NULL DEFAULT '男',
  age             int NOT NULL DEFAULT 45,
  faction         text NOT NULL DEFAULT 'neutral', -- reform/pragmatic/neutral
  ability         int NOT NULL DEFAULT 60,  -- 综合能力 0-100
  loyalty         int NOT NULL DEFAULT 50,  -- 忠诚度（对玩家好感） 0-100
  integrity       int NOT NULL DEFAULT 60,  -- 廉洁度 0-100
  career_history  jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{year_start,year_end,position,city}]
  is_retired      boolean NOT NULL DEFAULT false,
  retire_game_day int,                     -- 退休时游戏天数
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leadership_band_save_id ON leadership_band(save_id);

-- =====================================================================
-- 玩家健康/精力表
-- =====================================================================
CREATE TABLE IF NOT EXISTS player_health (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id     uuid NOT NULL UNIQUE REFERENCES player_saves(id) ON DELETE CASCADE,
  health      int NOT NULL DEFAULT 80 CHECK (health BETWEEN 0 AND 100),
  energy      int NOT NULL DEFAULT 100 CHECK (energy BETWEEN 0 AND 100),
  is_on_leave boolean NOT NULL DEFAULT false,   -- 是否因病休假
  leave_end_day int,                             -- 休假结束游戏天
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- =====================================================================
-- 党校培训名额表
-- =====================================================================
CREATE TABLE IF NOT EXISTS party_school_quota (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id     uuid NOT NULL REFERENCES player_saves(id) ON DELETE CASCADE,
  game_year   int NOT NULL,         -- 游戏年份
  used_count  int NOT NULL DEFAULT 0,
  quota_limit int NOT NULL DEFAULT 3,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(save_id, game_year)
);

-- =====================================================================
-- 党校培训记录表
-- =====================================================================
CREATE TABLE IF NOT EXISTS party_school_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id         uuid NOT NULL REFERENCES player_saves(id) ON DELETE CASCADE,
  target_type     text NOT NULL DEFAULT 'player',   -- 'player' | 'subordinate'
  target_id       text,                              -- 下属id（若培训下属）
  target_name     text NOT NULL,
  train_level     text NOT NULL,    -- 'basic'|'middle'|'advanced'
  start_game_day  int NOT NULL,
  end_game_day    int NOT NULL,
  is_complete     boolean NOT NULL DEFAULT false,
  ability_bonus   int NOT NULL DEFAULT 0,
  loyalty_bonus   int NOT NULL DEFAULT 0,
  promote_bonus   int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_party_school_save_id ON party_school_records(save_id);

-- =====================================================================
-- 国家政策运动记录（存储在 player_saves JSONB 字段不够灵活，单独建表）
-- =====================================================================
CREATE TABLE IF NOT EXISTS national_policies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id         uuid NOT NULL REFERENCES player_saves(id) ON DELETE CASCADE,
  policy_key      text NOT NULL,       -- 政策类型key
  policy_name     text NOT NULL,       -- 政策名称
  start_game_day  int NOT NULL,
  duration_days   int NOT NULL,        -- 持续天数
  is_active       boolean NOT NULL DEFAULT true,
  responded       boolean NOT NULL DEFAULT false,  -- 玩家是否已响应
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_national_policies_save_id ON national_policies(save_id);

-- =====================================================================
-- 城市指标联动表
-- =====================================================================
CREATE TABLE IF NOT EXISTS city_metrics (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id      uuid NOT NULL UNIQUE REFERENCES player_saves(id) ON DELETE CASCADE,
  gdp          int NOT NULL DEFAULT 60,         -- GDP增长率指数 0-100
  finance      int NOT NULL DEFAULT 60,         -- 财政收入指数
  ecology      int NOT NULL DEFAULT 60,         -- 环境质量指数
  stability    int NOT NULL DEFAULT 60,         -- 社会稳定指数
  education    int NOT NULL DEFAULT 60,         -- 教育投入指数
  healthcare   int NOT NULL DEFAULT 60,         -- 医疗投入指数
  invest_bonus int NOT NULL DEFAULT 0,          -- 招商引资加成%（联动计算）
  petition_reduction int NOT NULL DEFAULT 0,   -- 信访减少%
  talent_pool  int NOT NULL DEFAULT 0,          -- 人才积累分
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- =====================================================================
-- 仕途历史档案（玩家自己的）
-- =====================================================================
CREATE TABLE IF NOT EXISTS player_career_history (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id      uuid NOT NULL REFERENCES player_saves(id) ON DELETE CASCADE,
  position     text NOT NULL,
  city         text NOT NULL,
  rank_level   int NOT NULL,
  start_game_day int NOT NULL,
  end_game_day   int,           -- NULL表示当前在职
  start_year   int,             -- 换算为现实年份（基准2000年 + gameDays/365）
  end_year     int,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_player_career_save_id ON player_career_history(save_id);

-- =====================================================================
-- RLS 策略
-- =====================================================================
ALTER TABLE leadership_band ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_school_quota ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_school_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE national_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE city_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_career_history ENABLE ROW LEVEL SECURITY;

-- 通用：所有表只允许本人存档的数据访问
CREATE POLICY "leadership_band_owner" ON leadership_band FOR ALL TO authenticated
  USING (save_id IN (SELECT id FROM player_saves WHERE user_id = auth.uid()));

CREATE POLICY "player_health_owner" ON player_health FOR ALL TO authenticated
  USING (save_id IN (SELECT id FROM player_saves WHERE user_id = auth.uid()));

CREATE POLICY "party_school_quota_owner" ON party_school_quota FOR ALL TO authenticated
  USING (save_id IN (SELECT id FROM player_saves WHERE user_id = auth.uid()));

CREATE POLICY "party_school_records_owner" ON party_school_records FOR ALL TO authenticated
  USING (save_id IN (SELECT id FROM player_saves WHERE user_id = auth.uid()));

CREATE POLICY "national_policies_owner" ON national_policies FOR ALL TO authenticated
  USING (save_id IN (SELECT id FROM player_saves WHERE user_id = auth.uid()));

CREATE POLICY "city_metrics_owner" ON city_metrics FOR ALL TO authenticated
  USING (save_id IN (SELECT id FROM player_saves WHERE user_id = auth.uid()));

CREATE POLICY "player_career_history_owner" ON player_career_history FOR ALL TO authenticated
  USING (save_id IN (SELECT id FROM player_saves WHERE user_id = auth.uid()));