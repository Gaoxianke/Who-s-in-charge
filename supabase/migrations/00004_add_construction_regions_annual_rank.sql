
-- 1. 给 player_saves 增加新字段
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS events_this_year  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_rank_day     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS annual_rank_pct   INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS is_excellent_rank BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS merit_cost        INTEGER NOT NULL DEFAULT 0;

-- 2. 建设项目表
CREATE TABLE IF NOT EXISTS construction_projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id       UUID NOT NULL REFERENCES player_saves(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL,           -- 'town'|'county'|'city'
  cost_merit    INTEGER NOT NULL DEFAULT 0,
  duration_days INTEGER NOT NULL DEFAULT 30,
  start_day     INTEGER NOT NULL DEFAULT 0,
  finish_day    INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'building', -- 'building'|'done'
  effect_type   TEXT NOT NULL DEFAULT 'gdp',   -- 'gdp'|'livelihood'|'ecology'|'business'
  effect_value  INTEGER NOT NULL DEFAULT 5,
  merit_reward  INTEGER NOT NULL DEFAULT 20,
  created_at    TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE construction_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own projects" ON construction_projects
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. 管辖区域表
CREATE TABLE IF NOT EXISTS governing_areas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id         UUID NOT NULL REFERENCES player_saves(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL,
  area_name       TEXT NOT NULL,
  area_type       TEXT NOT NULL DEFAULT 'town',  -- 'town'|'district'
  dev_index       INTEGER NOT NULL DEFAULT 50,
  favor_index     INTEGER NOT NULL DEFAULT 50,
  last_visited_day INTEGER NOT NULL DEFAULT 0,
  last_invested_day INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE governing_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own areas" ON governing_areas
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
