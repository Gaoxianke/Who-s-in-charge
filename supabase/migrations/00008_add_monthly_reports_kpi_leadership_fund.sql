
-- 扩展 player_saves：季度招募追踪、初始资金、月度报告、领导班子KPI
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS last_recruit_quarter integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS city_tax_rate       numeric  NOT NULL DEFAULT 0.12,
  ADD COLUMN IF NOT EXISTS city_tax_income     numeric  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_month_day      integer  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kpi_gdp_target      integer  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kpi_livelihood_target integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kpi_ecology_target  integer  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kpi_business_target integer  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kpi_year            integer  NOT NULL DEFAULT 0;

-- 月度工作报告表
CREATE TABLE IF NOT EXISTS monthly_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id     uuid NOT NULL REFERENCES player_saves(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  month_key   integer NOT NULL,
  year_key    integer NOT NULL,
  dept_key    text    NOT NULL,
  title       text    NOT NULL,
  content     text    NOT NULL,
  gdp_change  numeric NOT NULL DEFAULT 0,
  livelihood_change numeric NOT NULL DEFAULT 0,
  ecology_change    numeric NOT NULL DEFAULT 0,
  business_change   numeric NOT NULL DEFAULT 0,
  merit_reward      numeric NOT NULL DEFAULT 0,
  is_read     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own reports"
  ON monthly_reports FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 领导班子表（副市长/县长等）
CREATE TABLE IF NOT EXISTS leadership_band (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id      uuid NOT NULL REFERENCES player_saves(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL,
  sub_id       uuid REFERENCES subordinates(id) ON DELETE SET NULL,
  role_key     text NOT NULL,
  role_label   text NOT NULL,
  sub_name     text NOT NULL DEFAULT '',
  sub_avatar   integer NOT NULL DEFAULT 0,
  sub_gender   text NOT NULL DEFAULT '男',
  assigned_day integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE leadership_band ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own leadership"
  ON leadership_band FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 确保初始存档资金不为0（更新已有存档）
UPDATE player_saves SET fund_balance = 500 WHERE fund_balance = 0 AND rank_level = 1;
UPDATE player_saves SET fund_balance = 2000 WHERE fund_balance = 0 AND rank_level = 2;
UPDATE player_saves SET fund_balance = 5000 WHERE fund_balance = 0 AND rank_level >= 3;
