
-- ============ 月度工作会议表 ============
CREATE TABLE IF NOT EXISTS monthly_meetings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  save_id uuid NOT NULL,
  user_id uuid NOT NULL,
  month_key text NOT NULL, -- 格式: "gameDays/30"取整，如"50"代表第50个月
  held_day int NOT NULL,
  tasks jsonb NOT NULL DEFAULT '[]', -- [{subordinateId, subordinateName, kpiType, targetValue, deadlineDay, status, completedDay}]
  created_at timestamptz DEFAULT now()
);
ALTER TABLE monthly_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_meetings" ON monthly_meetings FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ 秘书表 ============
CREATE TABLE IF NOT EXISTS secretary (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  save_id uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT '王秘书',
  avatar_id int NOT NULL DEFAULT 1,
  ability int NOT NULL DEFAULT 60,
  last_docwork_day int NOT NULL DEFAULT 0, -- 上次整理公文的游戏天
  daily_schedule text, -- 当日日程备注
  created_at timestamptz DEFAULT now()
);
ALTER TABLE secretary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_secretary" ON secretary FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ 城市金融表 ============
CREATE TABLE IF NOT EXISTS city_finance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  save_id uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  fund_balance numeric NOT NULL DEFAULT 0, -- 资金余额（万元）
  debt_total numeric NOT NULL DEFAULT 0,   -- 总贷款
  loans jsonb NOT NULL DEFAULT '[]',       -- [{id, amount, rate, startDay, dueDay, monthlyPay, status}]
  investments jsonb NOT NULL DEFAULT '[]', -- [{id, name, amount, startDay, endDay, effectType, effectValue, status}]
  invest_group_est_day int,               -- 投资集团成立游戏天，null=未成立
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE city_finance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_finance" ON city_finance FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ 民生操作记录表 ============
CREATE TABLE IF NOT EXISTS welfare_actions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  save_id uuid NOT NULL,
  user_id uuid NOT NULL,
  action_type text NOT NULL, -- 'welfare'(发放福利) | 'education' | 'healthcare' | 'housing'
  cost_merit int NOT NULL,
  effect_value int NOT NULL,
  done_day int NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE welfare_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_welfare" ON welfare_actions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ 扩展 player_saves 新字段 ============
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS city_population int NOT NULL DEFAULT 50000,
  ADD COLUMN IF NOT EXISTS resident_income int NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS edu_level int NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS healthcare_rate int NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS housing_rate int NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS fund_balance numeric NOT NULL DEFAULT 0;
