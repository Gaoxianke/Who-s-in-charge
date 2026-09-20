
-- 1. 下属表：新增派系、12级职级、字段
ALTER TABLE subordinates
  ADD COLUMN IF NOT EXISTS faction TEXT NOT NULL DEFAULT 'reform',
  ADD COLUMN IF NOT EXISTS sub_level INTEGER NOT NULL DEFAULT 1;

-- 2. 下属履历表
CREATE TABLE IF NOT EXISTS subordinate_resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id UUID NOT NULL,
  sub_id UUID NOT NULL,
  position TEXT NOT NULL,
  dept_name TEXT NOT NULL DEFAULT '',
  start_day INTEGER NOT NULL DEFAULT 0,
  end_day INTEGER,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sub_resumes_sub_id ON subordinate_resumes(sub_id);
CREATE INDEX IF NOT EXISTS idx_sub_resumes_save_id ON subordinate_resumes(save_id);

-- 3. 招商引资企业表
CREATE TABLE IF NOT EXISTS enterprises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id UUID NOT NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT '制造业',
  invest_amount INTEGER NOT NULL DEFAULT 0,
  tax_contribution INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'operating',
  founded_day INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_enterprises_save_id ON enterprises(save_id);

-- RLS
ALTER TABLE subordinate_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_resumes" ON subordinate_resumes
  FOR ALL TO authenticated
  USING (save_id IN (SELECT id FROM player_saves WHERE user_id = auth.uid()))
  WITH CHECK (save_id IN (SELECT id FROM player_saves WHERE user_id = auth.uid()));

CREATE POLICY "users_own_enterprises" ON enterprises
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. 人事局年底评审追踪：player_saves中新增字段
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS last_personnel_year INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dept_report_day INTEGER NOT NULL DEFAULT 0;
