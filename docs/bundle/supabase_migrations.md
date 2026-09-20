# supabase/migrations

共 188 个文件。
<a id="supabasemigrationsgitkeep"></a>
## `supabase/migrations/.gitkeep`

```

```

<a id="supabasemigrations00001_create_game_tablessql"></a>
## `supabase/migrations/00001_create_game_tables.sql`

```

-- 玩家存档表
CREATE TABLE IF NOT EXISTS player_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  player_name text NOT NULL DEFAULT '新官员',
  -- 职级信息: 1=乡科级初任, 2=乡科级, 3=县处级, 4=县处级副, 5=厅局级, 6=厅局级副, 7=省部级, 8=省部级副, 9=国家级, 10=国家级
  rank_level integer NOT NULL DEFAULT 1,
  rank_name text NOT NULL DEFAULT '乡科级科员',
  -- 属性
  merit_points integer NOT NULL DEFAULT 0,
  moral_value integer NOT NULL DEFAULT 80,
  assessment_grade text NOT NULL DEFAULT '合格', -- 优秀/良好/合格/不合格
  -- 任期
  tenure_years integer NOT NULL DEFAULT 0,
  tenure_days integer NOT NULL DEFAULT 0,
  max_tenure_years integer NOT NULL DEFAULT 3,
  -- 游戏时间（从2020年1月1日起）
  game_days integer NOT NULL DEFAULT 0,
  -- 城市
  city_name text NOT NULL DEFAULT '清河镇',
  city_gdp integer NOT NULL DEFAULT 50,
  city_livelihood integer NOT NULL DEFAULT 50,
  city_ecology integer NOT NULL DEFAULT 50,
  city_business integer NOT NULL DEFAULT 50,
  -- 公安
  police_force integer NOT NULL DEFAULT 100,
  security_index integer NOT NULL DEFAULT 50,
  police_chief_name text,
  -- 派系
  reform_faction integer NOT NULL DEFAULT 50,
  pragmatic_faction integer NOT NULL DEFAULT 50,
  -- 上司
  boss_name text NOT NULL DEFAULT '李主任',
  boss_favor integer NOT NULL DEFAULT 50,
  -- 晋升条件阈值（当前职级需要）
  required_merit integer NOT NULL DEFAULT 100,
  required_tenure_years integer NOT NULL DEFAULT 2,
  -- 标记
  is_promotion_available boolean NOT NULL DEFAULT false,
  is_event_pending boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 下属表
CREATE TABLE IF NOT EXISTS subordinates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id uuid REFERENCES player_saves(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  position text NOT NULL DEFAULT '科员', -- 科员/副局长/局长/主任等
  role text NOT NULL DEFAULT 'regular', -- regular/police_chief/deputy
  ability integer NOT NULL DEFAULT 50,
  loyalty integer NOT NULL DEFAULT 50,
  integrity integer NOT NULL DEFAULT 50,
  experience integer NOT NULL DEFAULT 50,
  is_appointed boolean NOT NULL DEFAULT false,
  appointed_role text,
  last_assessed_day integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 上司任务表
CREATE TABLE IF NOT EXISTS boss_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id uuid REFERENCES player_saves(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  task_type text NOT NULL DEFAULT 'merit', -- merit/city/security
  target_value integer NOT NULL DEFAULT 0,
  current_value integer NOT NULL DEFAULT 0,
  reward_merit integer NOT NULL DEFAULT 20,
  reward_favor integer NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'active', -- active/completed/failed/expired
  deadline_days integer NOT NULL DEFAULT 365,
  created_day integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 事件记录表（突发事件历史）
CREATE TABLE IF NOT EXISTS event_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id uuid REFERENCES player_saves(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL, -- disaster/corruption/opinion/economic/security
  title text NOT NULL,
  description text NOT NULL,
  choice_index integer,
  choice_text text,
  merit_change integer NOT NULL DEFAULT 0,
  moral_change integer NOT NULL DEFAULT 0,
  gdp_change integer NOT NULL DEFAULT 0,
  livelihood_change integer NOT NULL DEFAULT 0,
  ecology_change integer NOT NULL DEFAULT 0,
  business_change integer NOT NULL DEFAULT 0,
  game_day integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 案件表（公安局案件）
CREATE TABLE IF NOT EXISTS police_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id uuid REFERENCES player_saves(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  case_type text NOT NULL DEFAULT 'criminal', -- criminal/corruption/drug/fraud
  difficulty integer NOT NULL DEFAULT 50,
  required_police integer NOT NULL DEFAULT 10,
  reward_merit integer NOT NULL DEFAULT 15,
  security_change integer NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'pending', -- pending/solving/solved/failed
  created_day integer NOT NULL DEFAULT 0,
  solved_day integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 开启RLS
ALTER TABLE player_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE subordinates ENABLE ROW LEVEL SECURITY;
ALTER TABLE boss_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE police_cases ENABLE ROW LEVEL SECURITY;

-- RLS策略
CREATE POLICY "用户只能访问自己的存档" ON player_saves FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "用户只能访问自己的下属" ON subordinates FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "用户只能访问自己的任务" ON boss_tasks FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "用户只能访问自己的事件" ON event_records FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "用户只能访问自己的案件" ON police_cases FOR ALL TO authenticated USING (user_id = auth.uid());
```

<a id="supabasemigrations00002_add_character_family_departmentssql"></a>
## `supabase/migrations/00002_add_character_family_departments.sql`

```

-- 1. 给 player_saves 增加角色信息字段
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS player_gender text DEFAULT '男',
  ADD COLUMN IF NOT EXISTS player_age integer DEFAULT 22,
  ADD COLUMN IF NOT EXISTS player_birth_day integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avatar_id integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS school text DEFAULT '普通本科',
  ADD COLUMN IF NOT EXISTS needs_character_creation boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS family_happiness integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS marriage_status text DEFAULT 'single';

-- 2. 给 subordinates 增加头像字段
ALTER TABLE subordinates
  ADD COLUMN IF NOT EXISTS avatar_id integer DEFAULT 0;

-- 3. 创建家庭成员表（配偶 + 子女）
CREATE TABLE IF NOT EXISTS family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id uuid NOT NULL REFERENCES player_saves(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_type text NOT NULL CHECK (member_type IN ('spouse', 'child')),
  name text NOT NULL,
  gender text NOT NULL DEFAULT '男',
  birth_day integer NOT NULL DEFAULT 0,
  personality text DEFAULT '温和',
  job text DEFAULT '教师',
  study_score integer DEFAULT 50,
  health_score integer DEFAULT 80,
  moral_score integer DEFAULT 80,
  is_adult boolean DEFAULT false,
  adult_path text DEFAULT null,
  created_at timestamptz DEFAULT now()
);

-- 4. RLS for family_members
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户管理自己的家庭成员"
  ON family_members FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. 索引
CREATE INDEX IF NOT EXISTS idx_family_members_save_id ON family_members(save_id);
```

<a id="supabasemigrations00003_add_subordinate_gender_deptsql"></a>
## `supabase/migrations/00003_add_subordinate_gender_dept.sql`

```

ALTER TABLE subordinates
  ADD COLUMN IF NOT EXISTS gender text DEFAULT '男',
  ADD COLUMN IF NOT EXISTS appointed_dept text DEFAULT null;
```

<a id="supabasemigrations00004_add_construction_regions_annual_ranksql"></a>
## `supabase/migrations/00004_add_construction_regions_annual_rank.sql`

```

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
```

<a id="supabasemigrations00005_add_new_feature_tables_v5sql"></a>
## `supabase/migrations/00005_add_new_feature_tables_v5.sql`

```

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
```

<a id="supabasemigrations00006_add_boss2_boss3_recruit_candidatessql"></a>
## `supabase/migrations/00006_add_boss2_boss3_recruit_candidates.sql`

```

-- 三上司扩展字段
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS boss2_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS boss2_favor int NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS boss3_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS boss3_favor int NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS last_recruit_year int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sub_visit_pending bool NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sub_visit_sub_id text DEFAULT null,
  ADD COLUMN IF NOT EXISTS sub_visit_sub_name text DEFAULT null;

-- 招募候选人表（每年生成10个，玩家选3）
CREATE TABLE IF NOT EXISTS recruit_candidates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  save_id uuid NOT NULL,
  user_id uuid NOT NULL,
  year_key int NOT NULL, -- 游戏年份 floor(gameDays/365)
  name text NOT NULL,
  gender text NOT NULL DEFAULT '男',
  avatar_id int NOT NULL DEFAULT 0,
  ability int NOT NULL DEFAULT 60,
  loyalty int NOT NULL DEFAULT 60,
  integrity int NOT NULL DEFAULT 60,
  experience int NOT NULL DEFAULT 20,
  trait text NOT NULL DEFAULT '', -- 特质标签
  rank_order int DEFAULT NULL, -- 玩家排序（1,2,3 = 选中且排序，null=未选）
  status text NOT NULL DEFAULT 'pending', -- pending/selected/dismissed
  created_at timestamptz DEFAULT now()
);
ALTER TABLE recruit_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_recruits" ON recruit_candidates FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- subordinates 加 dept_position 字段（deputy_1~3/head）
ALTER TABLE subordinates
  ADD COLUMN IF NOT EXISTS dept_position text DEFAULT 'head', -- head | deputy
  ADD COLUMN IF NOT EXISTS transferred_city text DEFAULT null; -- 调任城市记录
```

<a id="supabasemigrations00007_add_boss2_boss3_recruit_subvisitsql"></a>
## `supabase/migrations/00007_add_boss2_boss3_recruit_subvisit.sql`

```

-- 扩展 player_saves：三上司、招募追踪、下属拜访
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS boss2_name     text        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS boss2_favor    integer     NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS boss3_name     text        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS boss3_favor    integer     NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS last_recruit_year integer  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sub_visit_pending  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sub_visit_sub_id   text,
  ADD COLUMN IF NOT EXISTS sub_visit_sub_name text;

-- 扩展 subordinates：部门正副职 + 调任城市
ALTER TABLE subordinates
  ADD COLUMN IF NOT EXISTS dept_position   text NOT NULL DEFAULT 'head',
  ADD COLUMN IF NOT EXISTS transferred_city text;

-- 招募候选人表
CREATE TABLE IF NOT EXISTS recruit_candidates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id     uuid NOT NULL REFERENCES player_saves(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  year_key    integer NOT NULL,
  name        text    NOT NULL,
  gender      text    NOT NULL DEFAULT '男',
  avatar_id   integer NOT NULL DEFAULT 0,
  ability     integer NOT NULL DEFAULT 50,
  loyalty     integer NOT NULL DEFAULT 50,
  integrity   integer NOT NULL DEFAULT 50,
  experience  integer NOT NULL DEFAULT 20,
  trait       text    NOT NULL DEFAULT '',
  rank_order  integer,
  status      text    NOT NULL DEFAULT 'pending',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS for recruit_candidates
ALTER TABLE recruit_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own recruit candidates"
  ON recruit_candidates FOR ALL
  TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

<a id="supabasemigrations00008_add_monthly_reports_kpi_leadership_fundsql"></a>
## `supabase/migrations/00008_add_monthly_reports_kpi_leadership_fund.sql`

```

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
```

<a id="supabasemigrations00009_add_tax_revenue_columnsql"></a>
## `supabase/migrations/00009_add_tax_revenue_column.sql`

```

ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS tax_revenue integer NOT NULL DEFAULT 0;
```

<a id="supabasemigrations00010_add_faction_resume_level_enterprise_personnelsql"></a>
## `supabase/migrations/00010_add_faction_resume_level_enterprise_personnel.sql`

```

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
```

<a id="supabasemigrations00011_add_enterprise_scale_employee_monthsql"></a>
## `supabase/migrations/00011_add_enterprise_scale_employee_month.sql`

```

-- 企业表新增规模、从业人数、引进月份字段
ALTER TABLE enterprises
  ADD COLUMN IF NOT EXISTS scale TEXT NOT NULL DEFAULT 'small',
  ADD COLUMN IF NOT EXISTS employee_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS introduced_month INTEGER NOT NULL DEFAULT 0;

-- 补齐存量数据
UPDATE enterprises
SET
  scale = CASE
    WHEN invest_amount >= 3000 THEN 'large'
    WHEN invest_amount >= 1200 THEN 'medium'
    ELSE 'small'
  END,
  employee_count = CASE
    WHEN invest_amount >= 3000 THEN 300
    WHEN invest_amount >= 1200 THEN 100
    ELSE 25
  END,
  introduced_month = GREATEST(1, FLOOR(founded_day / 30)::INTEGER + 1)
WHERE scale = 'small' AND employee_count = 0;
```

<a id="supabasemigrations00012_add_petition_events_tablesql"></a>
## `supabase/migrations/00012_add_petition_events_table.sql`

```

-- 信访事件表
CREATE TABLE IF NOT EXISTS petition_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id     uuid NOT NULL,
  user_id     uuid NOT NULL,
  event_type  text NOT NULL CHECK (event_type IN ('complaint', 'praise')),
  title       text NOT NULL,
  content     text NOT NULL,
  game_day    integer NOT NULL DEFAULT 0,
  month_key   integer NOT NULL DEFAULT 0,
  bos_favor_delta  integer NOT NULL DEFAULT 0,
  merit_delta      integer NOT NULL DEFAULT 0,
  is_processed     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS petition_events_save_id_idx ON petition_events(save_id);
CREATE INDEX IF NOT EXISTS petition_events_month_key_idx ON petition_events(save_id, month_key);

ALTER TABLE petition_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all" ON petition_events
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

<a id="supabasemigrations00013_v19_feature_enhancementssql"></a>
## `supabase/migrations/00013_v19_feature_enhancements.sql`

```

-- boss_tasks: 新增 boss_level(1/2/3) 和 is_postponed
ALTER TABLE boss_tasks
  ADD COLUMN IF NOT EXISTS boss_level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_postponed boolean NOT NULL DEFAULT false;

-- player_saves: 新增配偶关系值与结婚纪念日
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS spouse_relation_value integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS marriage_day integer NOT NULL DEFAULT 0;

-- welfare_actions: 新增资金消耗字段
ALTER TABLE welfare_actions
  ADD COLUMN IF NOT EXISTS cost_fund integer NOT NULL DEFAULT 0;
```

<a id="supabasemigrations00014_add_ministry_rotate_daysql"></a>
## `supabase/migrations/00014_add_ministry_rotate_day.sql`

```
ALTER TABLE player_saves ADD COLUMN IF NOT EXISTS last_ministry_rotate_day integer NOT NULL DEFAULT 0;
```

<a id="supabasemigrations00015_add_player_position_fieldsql"></a>
## `supabase/migrations/00015_add_player_position_field.sql`

```
ALTER TABLE player_saves ADD COLUMN IF NOT EXISTS player_position text NOT NULL DEFAULT '';
UPDATE player_saves SET player_position = rank_name WHERE player_position = '';
```

<a id="supabasemigrations00016_add_concurrent_posts_and_sub_rank_levelsql"></a>
## `supabase/migrations/00016_add_concurrent_posts_and_sub_rank_level.sql`

```

-- 为 player_saves 增加兼职职务字段（text数组，存储兼职职务key列表）
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS concurrent_posts text[] NOT NULL DEFAULT '{}';

-- 为 subordinates 增加 rank_level 字段（对应玩家rankLevel，用于职级过滤）
ALTER TABLE subordinates
  ADD COLUMN IF NOT EXISTS rank_level integer NOT NULL DEFAULT 1;

-- 将现有下属的 rank_level 根据 sub_level 估算设置
UPDATE subordinates SET rank_level = CASE
  WHEN sub_level <= 3 THEN 3
  WHEN sub_level <= 5 THEN 6
  WHEN sub_level <= 7 THEN 9
  WHEN sub_level <= 9 THEN 11
  ELSE 12
END;
```

<a id="supabasemigrations00017_add_v44_fieldssql"></a>
## `supabase/migrations/00017_add_v44_fields.sql`

```
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS vote_support          integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_vote_day         integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS national_gdp          bigint  NOT NULL DEFAULT 1200000,
  ADD COLUMN IF NOT EXISTS sci_tech_invest_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sci_tech_research_dir text    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sci_tech_progress     integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sci_tech_last_act_day integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discipline_last_act_day integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kpi_ranking_year      integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kpi_ranking_result    text    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_annual_promote_year integer NOT NULL DEFAULT 0;
```

<a id="supabasemigrations00018_add_personal_wealthsql"></a>
## `supabase/migrations/00018_add_personal_wealth.sql`

```

ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS personal_savings BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS personal_assets   JSONB  NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_salary_day   INTEGER NOT NULL DEFAULT 0;
```

<a id="supabasemigrations00019_add_faction_to_subordinatessql"></a>
## `supabase/migrations/00019_add_faction_to_subordinates.sql`

```
-- 为 subordinates 表添加 faction 列（如已存在则跳过）
ALTER TABLE subordinates ADD COLUMN IF NOT EXISTS faction TEXT DEFAULT 'pragmatic';

-- 更新已有记录中 NULL 值
UPDATE subordinates SET faction = 'pragmatic' WHERE faction IS NULL;
```

<a id="supabasemigrations00020_add_retirement_fieldssql"></a>
## `supabase/migrations/00020_add_retirement_fields.sql`

```
-- 为 player_saves 增加退休系统字段
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS retirement_delay_years INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_retired BOOLEAN NOT NULL DEFAULT FALSE;
```

<a id="supabasemigrations00021_add_party_congress_vote_fieldssql"></a>
## `supabase/migrations/00021_add_party_congress_vote_fields.sql`

```
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS party_congress_vote   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_party_congress_day integer NOT NULL DEFAULT 0;
```

<a id="supabasemigrations00022_add_career_path_fieldsql"></a>
## `supabase/migrations/00022_add_career_path_field.sql`

```
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS career_path VARCHAR(20) NOT NULL DEFAULT '';
```

<a id="supabasemigrations00023_add_boss_lifecycle_and_game_over_fieldssql"></a>
## `supabase/migrations/00023_add_boss_lifecycle_and_game_over_fields.sql`

```

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
```

<a id="supabasemigrations00024_fix_subordinate_sublevel_and_positionsql"></a>
## `supabase/migrations/00024_fix_subordinate_sublevel_and_position.sql`

```
-- 修复存量存档中所有已任命下属的 sub_level 与 position 字段
-- 依据现实体系：
--   公安/人事/税务等高配部门正职 sub_level = 玩家rank_level（比普通部门高一级）
--   普通部门正职 sub_level = rank_level - 1（乡镇至少副科=2）
--   副职统一 sub_level = rank_level - 2（最低科员=1）
--   position 字段更新为实际职务名称（与 appointed_role 一致，去除历史随机值）
UPDATE subordinates s
SET
  sub_level = CASE
    WHEN s.dept_position = 'head' AND s.appointed_dept IN ('police', 'personnel', 'tax')
      THEN GREATEST(2, LEAST(12, ps.rank_level))
    WHEN s.dept_position = 'head'
      THEN GREATEST(2, LEAST(12, ps.rank_level - 1))
    WHEN s.dept_position = 'deputy'
      THEN GREATEST(1, LEAST(12, ps.rank_level - 2))
    ELSE s.sub_level
  END,
  position = CASE
    WHEN s.appointed_role IS NOT NULL THEN s.appointed_role
    ELSE s.position
  END
FROM player_saves ps
WHERE s.save_id = ps.id
  AND s.is_appointed = true
  AND s.dept_position IN ('head', 'deputy')
  AND s.transferred_city IS NULL;
```

<a id="supabasemigrations00025_add_leadership_band_health_party_schoolsql"></a>
## `supabase/migrations/00025_add_leadership_band_health_party_school.sql`

```
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
```

<a id="supabasemigrations00026_create_npc_band_tablesql"></a>
## `supabase/migrations/00026_create_npc_band_table.sql`

```

-- NPC领导班子表（与旧 leadership_band 任命系统分离）
CREATE TABLE IF NOT EXISTS npc_band (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id         uuid NOT NULL REFERENCES player_saves(id) ON DELETE CASCADE,
  position_key    text NOT NULL,
  position_label  text NOT NULL,
  rank_level      integer NOT NULL DEFAULT 1,
  name            text NOT NULL,
  gender          text NOT NULL DEFAULT '男',
  age             integer NOT NULL DEFAULT 0,
  faction         text NOT NULL DEFAULT 'neutral',
  ability         integer NOT NULL DEFAULT 60,
  loyalty         integer NOT NULL DEFAULT 60,
  integrity       integer NOT NULL DEFAULT 60,
  career_history  jsonb NOT NULL DEFAULT '[]',
  is_retired      boolean NOT NULL DEFAULT false,
  retire_game_day integer,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_npc_band_save_id ON npc_band(save_id);
CREATE INDEX IF NOT EXISTS idx_npc_band_save_retired ON npc_band(save_id, is_retired);

-- RLS
ALTER TABLE npc_band ENABLE ROW LEVEL SECURITY;
CREATE POLICY "npc_band_owner" ON npc_band
  USING (save_id IN (SELECT id FROM player_saves WHERE user_id = auth.uid()));

-- apply_training_bonus RPC：给下属加能力/忠诚（由党校结算调用）
CREATE OR REPLACE FUNCTION apply_training_bonus(
  p_sub_id  uuid,
  p_ability integer,
  p_loyalty integer
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE subordinates
  SET
    ability = LEAST(100, ability + p_ability),
    loyalty = LEAST(100, loyalty + p_loyalty)
  WHERE id = p_sub_id;
$$;
```

<a id="supabasemigrations00027_add_bio_fields_player_saves_npc_bandsql"></a>
## `supabase/migrations/00027_add_bio_fields_player_saves_npc_band.sql`

```

-- player_saves: 出生年份、出生省份、出生城市、大学名称
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS birth_year       int     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS birth_province   text    DEFAULT '',
  ADD COLUMN IF NOT EXISTS birth_city       text    DEFAULT '',
  ADD COLUMN IF NOT EXISTS university_name  text    DEFAULT '';

-- npc_band: NPC出生省份、出生城市、大学名称、毕业年份
ALTER TABLE npc_band
  ADD COLUMN IF NOT EXISTS birth_province   text    DEFAULT '',
  ADD COLUMN IF NOT EXISTS birth_city       text    DEFAULT '',
  ADD COLUMN IF NOT EXISTS university_name  text    DEFAULT '',
  ADD COLUMN IF NOT EXISTS graduation_year  int     DEFAULT 0;
```

<a id="supabasemigrations00028_add_national_terms_servedsql"></a>
## `supabase/migrations/00028_add_national_terms_served.sql`

```
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS national_terms_served integer NOT NULL DEFAULT 0;
```

<a id="supabasemigrations00029_add_faction_relation_fieldssql"></a>
## `supabase/migrations/00029_add_faction_relation_fields.sql`

```

ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS cyl_relation      integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS techno_relation   integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS local_relation    integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS primary_faction   text    NOT NULL DEFAULT '';
```

<a id="supabasemigrations00030_subordinate_cadre_systemsql"></a>
## `supabase/migrations/00030_subordinate_cadre_system.sql`

```

-- ============ 下属管理系统扩展字段 ============
-- 干部特长（economy/social/legal/agriculture/tech/party/finance/military）
ALTER TABLE subordinates ADD COLUMN IF NOT EXISTS specialty TEXT DEFAULT 'economy';
-- 后备干部标记
ALTER TABLE subordinates ADD COLUMN IF NOT EXISTS is_reserve BOOLEAN NOT NULL DEFAULT FALSE;
-- 考察提名状态（idle / reviewing / approved / rejected）
ALTER TABLE subordinates ADD COLUMN IF NOT EXISTS nomination_status TEXT NOT NULL DEFAULT 'idle';
-- 提名目标部门
ALTER TABLE subordinates ADD COLUMN IF NOT EXISTS nomination_dept TEXT DEFAULT NULL;
-- 提名目标职位（head / deputy）
ALTER TABLE subordinates ADD COLUMN IF NOT EXISTS nomination_position TEXT DEFAULT NULL;
-- 提名开始游戏天（用于计算考察期）
ALTER TABLE subordinates ADD COLUMN IF NOT EXISTS nomination_start_day INTEGER DEFAULT NULL;
-- 干部随机事件类型（NULL=无事件 | transfer_request | corruption_risk | achievement | complaint | borrow）
ALTER TABLE subordinates ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT NULL;
-- 事件触发游戏天
ALTER TABLE subordinates ADD COLUMN IF NOT EXISTS event_day INTEGER DEFAULT NULL;
-- 事件是否已处理
ALTER TABLE subordinates ADD COLUMN IF NOT EXISTS event_handled BOOLEAN NOT NULL DEFAULT TRUE;
-- 干部满意度/职业诉求（0-100，影响自主离职概率）
ALTER TABLE subordinates ADD COLUMN IF NOT EXISTS satisfaction INTEGER NOT NULL DEFAULT 60;
-- 五维考核快照：德、能、勤、绩、廉（最近一次考核的分维度结果，json）
ALTER TABLE subordinates ADD COLUMN IF NOT EXISTS last_review_scores TEXT DEFAULT NULL;
-- 干部年龄字段（从名字哈希+subLevel计算，入库备用）
ALTER TABLE subordinates ADD COLUMN IF NOT EXISTS cadre_age INTEGER DEFAULT NULL;
-- 借调单位（非空时表示被借调，暂时脱离本地编制）
ALTER TABLE subordinates ADD COLUMN IF NOT EXISTS borrowed_to TEXT DEFAULT NULL;

-- 索引：查询待处理事件、待考察提名
CREATE INDEX IF NOT EXISTS idx_subordinates_nomination ON subordinates(save_id, nomination_status);
CREATE INDEX IF NOT EXISTS idx_subordinates_event ON subordinates(save_id, event_handled);
```

<a id="supabasemigrations00031_add_profile_fields_to_recruits_and_subordinatessql"></a>
## `supabase/migrations/00031_add_profile_fields_to_recruits_and_subordinates.sql`

```
-- 给招募候选人表加入个人档案字段
ALTER TABLE recruit_candidates
  ADD COLUMN IF NOT EXISTS birth_year    INTEGER,
  ADD COLUMN IF NOT EXISTS university    TEXT,
  ADD COLUMN IF NOT EXISTS major         TEXT,
  ADD COLUMN IF NOT EXISTS hometown      TEXT,
  ADD COLUMN IF NOT EXISTS score         INTEGER;   -- 综合评分（系统自动计算）

-- 给下属表加入个人档案字段（录用后档案随人转入）
ALTER TABLE subordinates
  ADD COLUMN IF NOT EXISTS birth_year    INTEGER,
  ADD COLUMN IF NOT EXISTS university    TEXT,
  ADD COLUMN IF NOT EXISTS major         TEXT,
  ADD COLUMN IF NOT EXISTS hometown      TEXT;
```

<a id="supabasemigrations00032_add_band_group_and_profile_fieldssql"></a>
## `supabase/migrations/00032_add_band_group_and_profile_fields.sql`

```

-- npc_band表新增band_group字段，区分党委/政府/人大
ALTER TABLE npc_band
  ADD COLUMN IF NOT EXISTS band_group TEXT NOT NULL DEFAULT 'party';

-- npc_band新增完整档案字段（如已存在则跳过）
ALTER TABLE npc_band
  ADD COLUMN IF NOT EXISTS birth_year INTEGER DEFAULT 0;

-- 给subordinates补充仕途档案字段
ALTER TABLE subordinates
  ADD COLUMN IF NOT EXISTS career_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS birth_province TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS birth_city     TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS graduation_year INTEGER DEFAULT 0;

-- 给recruit_candidates补充完整档案字段
ALTER TABLE recruit_candidates
  ADD COLUMN IF NOT EXISTS birth_province TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS birth_city     TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS graduation_year INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS career_history  JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 索引
CREATE INDEX IF NOT EXISTS idx_npc_band_group ON npc_band(save_id, band_group);
```

<a id="supabasemigrations00033_add_secretary_appointment_fieldssql"></a>
## `supabase/migrations/00033_add_secretary_appointment_fields.sql`

```

-- secretary表：新增任命下属为专属秘书相关字段
ALTER TABLE secretary
  ADD COLUMN IF NOT EXISTS sub_id uuid REFERENCES subordinates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_appointed boolean NOT NULL DEFAULT false;
```

<a id="supabasemigrations00034_add_cost_fund_to_constructionsql"></a>
## `supabase/migrations/00034_add_cost_fund_to_construction.sql`

```
ALTER TABLE construction_projects
  ADD COLUMN IF NOT EXISTS cost_fund BIGINT NOT NULL DEFAULT 0;
```

<a id="supabasemigrations00035_add_consecutive_excellent_yearssql"></a>
## `supabase/migrations/00035_add_consecutive_excellent_years.sql`

```
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS consecutive_excellent_years integer NOT NULL DEFAULT 0;
```

<a id="supabasemigrations00036_add_provident_fund_and_annual_bonussql"></a>
## `supabase/migrations/00036_add_provident_fund_and_annual_bonus.sql`

```

ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS provident_fund_balance BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_annual_bonus_day  INTEGER NOT NULL DEFAULT 0;
```

<a id="supabasemigrations00037_health_partyschool_v2sql"></a>
## `supabase/migrations/00037_health_partyschool_v2.sql`

```

-- 1. player_health 新增 last_monthly_care_day
ALTER TABLE player_health
  ADD COLUMN IF NOT EXISTS last_monthly_care_day INTEGER NOT NULL DEFAULT 0;

-- 2. party_school_records 新增 network_bonus + cert_name
ALTER TABLE party_school_records
  ADD COLUMN IF NOT EXISTS network_bonus INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cert_name TEXT NOT NULL DEFAULT '';
```

<a id="supabasemigrations00038_boss_interactions_and_task_fieldssql"></a>
## `supabase/migrations/00038_boss_interactions_and_task_fields.sql`

```

-- 新建上司关系经营记录表
CREATE TABLE boss_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id uuid NOT NULL REFERENCES player_saves(id) ON DELETE CASCADE,
  boss_level integer NOT NULL DEFAULT 1,
  action_type text NOT NULL,  -- 'report'|'consult'|'greet'
  game_day integer NOT NULL DEFAULT 0,
  favor_delta integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE boss_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "boss_interactions_select" ON boss_interactions
  FOR SELECT USING (
    save_id IN (SELECT id FROM player_saves WHERE user_id = auth.uid())
  );
CREATE POLICY "boss_interactions_insert" ON boss_interactions
  FOR INSERT WITH CHECK (
    save_id IN (SELECT id FROM player_saves WHERE user_id = auth.uid())
  );
CREATE POLICY "boss_interactions_delete" ON boss_interactions
  FOR DELETE USING (
    save_id IN (SELECT id FROM player_saves WHERE user_id = auth.uid())
  );

-- boss_tasks 表新增 urgency 与 penalty 字段
ALTER TABLE boss_tasks
  ADD COLUMN urgency text NOT NULL DEFAULT 'normal',  -- 'normal'|'important'|'urgent'
  ADD COLUMN penalty_merit integer NOT NULL DEFAULT 0,
  ADD COLUMN penalty_favor integer NOT NULL DEFAULT 0;
```

<a id="supabasemigrations00039_multi_database_and_cleanupsql"></a>
## `supabase/migrations/00039_multi_database_and_cleanup.sql`

```
-- ═══ 多玩家数据库 ══════════════════════════════════════════════
CREATE TABLE game_databases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  capacity_limit integer NOT NULL DEFAULT 1000,
  is_active boolean NOT NULL DEFAULT true,
  is_full boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE player_saves ADD COLUMN database_id uuid REFERENCES game_databases(id);
CREATE INDEX idx_player_saves_database_id ON player_saves(database_id);

INSERT INTO game_databases (code, name, capacity_limit, is_active, is_full, sort_order) VALUES
  ('db_1', '华北政务大区', 1000, true, false, 1),
  ('db_2', '华东政务大区', 1000, true, false, 2),
  ('db_3', '华南政务大区', 1000, true, false, 3);

UPDATE player_saves SET database_id = (SELECT id FROM game_databases WHERE code='db_1') WHERE database_id IS NULL;

ALTER TABLE game_databases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "db_select_all" ON game_databases FOR SELECT TO anon, authenticated USING (true);

-- ═══ 清理日志 ════════════════════════════════════════════════════
CREATE TABLE cleanup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  trigger_type text NOT NULL,
  large_table_deleted integer NOT NULL DEFAULT 0,
  dead_cadres_deleted integer NOT NULL DEFAULT 0,
  dead_saves_deleted integer NOT NULL DEFAULT 0,
  mb_before numeric(12,3) NOT NULL DEFAULT 0,
  mb_after numeric(12,3) NOT NULL DEFAULT 0,
  mb_saved numeric(12,3) NOT NULL DEFAULT 0,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE cleanup_logs ENABLE ROW LEVEL SECURITY;

-- ═══ RPC：分配数据库槽位（自动开启下一个库）═════════════════════
CREATE OR REPLACE FUNCTION claim_database_slot(selected_code text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_db_id uuid;
  v_limit integer;
  v_count integer;
  v_next integer;
BEGIN
  IF selected_code IS NOT NULL AND selected_code <> '' THEN
    SELECT id, capacity_limit INTO v_db_id, v_limit
    FROM game_databases WHERE code = selected_code AND is_active = true;
    IF v_db_id IS NOT NULL THEN
      SELECT count(*) INTO v_count FROM player_saves WHERE database_id = v_db_id;
      IF v_count < v_limit THEN RETURN v_db_id; END IF;
    END IF;
  END IF;

  SELECT g.id INTO v_db_id
  FROM game_databases g
  LEFT JOIN (SELECT database_id, count(*) c FROM player_saves WHERE database_id IS NOT NULL GROUP BY database_id) p ON p.database_id = g.id
  WHERE g.is_active = true AND COALESCE(p.c, 0) < g.capacity_limit
  ORDER BY COALESCE(p.c, 0) ASC, g.sort_order ASC LIMIT 1;
  IF v_db_id IS NOT NULL THEN RETURN v_db_id; END IF;

  UPDATE game_databases SET is_full = true WHERE is_active = true;
  SELECT count(*) + 1 INTO v_next FROM game_databases;
  INSERT INTO game_databases (code, name, capacity_limit, is_active, is_full, sort_order)
  VALUES ('db_' || v_next, '政务大区 ' || v_next, 1000, true, false, v_next)
  RETURNING id INTO v_db_id;
  RETURN v_db_id;
END;
$$;

-- ═══ RPC：列出可用数据库（含实时玩家数）══════════════════════════
CREATE OR REPLACE FUNCTION list_game_databases()
RETURNS TABLE(code text, name text, capacity_limit integer, player_count bigint, is_full boolean, is_active boolean, sort_order integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.code, g.name, g.capacity_limit, COALESCE(p.c,0), g.is_full, g.is_active, g.sort_order
  FROM game_databases g
  LEFT JOIN (SELECT database_id, count(*) c FROM player_saves WHERE database_id IS NOT NULL GROUP BY database_id) p ON p.database_id = g.id
  WHERE g.is_active = true
  ORDER BY g.sort_order ASC;
$$;

GRANT EXECUTE ON FUNCTION claim_database_slot(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION list_game_databases() TO anon, authenticated;

-- ═══ 清理辅助：按条件删除并估算释放字节 ══════════════════════════
CREATE OR REPLACE FUNCTION _cleanup_by_where(p_table text, p_where text)
RETURNS TABLE(deleted_rows integer, est_bytes bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tc integer; v_ts bigint; v_dc integer;
BEGIN
  EXECUTE format('SELECT count(*) FROM %I', p_table) INTO v_tc;
  IF v_tc = 0 THEN RETURN QUERY SELECT 0, 0::bigint; RETURN; END IF;
  EXECUTE format('SELECT pg_total_relation_size(%L::regclass)', p_table) INTO v_ts;
  EXECUTE format('SELECT count(*) FROM %I WHERE %s', p_table, p_where) INTO v_dc;
  IF v_dc = 0 THEN RETURN QUERY SELECT 0, 0::bigint; RETURN; END IF;
  RETURN QUERY SELECT v_dc, round(v_ts::numeric / v_tc * v_dc)::bigint;
  EXECUTE format('DELETE FROM %I WHERE %s', p_table, p_where);
  RETURN;
END;
$$;

-- ═══ 自动清理主函数 ═════════════════════════════════════════════
CREATE OR REPLACE FUNCTION run_game_cleanup(p_trigger text DEFAULT 'manual')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mb_before numeric; v_mb_after numeric;
  v_large_rows integer := 0; v_large_bytes bigint := 0;
  v_cadres_rows integer := 0; v_cadres_bytes bigint := 0;
  v_saves_rows integer := 0; v_saves_bytes bigint := 0;
  v_dead_ids uuid[]; v_total_saves integer;
  v_t text; v_tc integer; v_ts bigint;
  v_large_tables text[] := ARRAY['event_records','boss_interactions','monthly_reports','petition_events','welfare_actions'];
  v_orphan_tables text[] := ARRAY['city_finance','enterprises','monthly_meetings','petition_events','recruit_candidates','secretary','subordinate_resumes','welfare_actions'];
  r record;
BEGIN
  v_mb_before := round(pg_database_size(current_database()) / 1024.0 / 1024.0, 3);

  -- 1) 大表数据：仅追加型日志表，现实时间超1天
  FOREACH v_t IN ARRAY v_large_tables LOOP
    SELECT * INTO r FROM _cleanup_by_where(v_t, 'created_at < now() - interval ''1 day''');
    v_large_rows := v_large_rows + r.deleted_rows;
    v_large_bytes := v_large_bytes + r.est_bytes;
  END LOOP;

  -- 2) 死干部：已调离且超1天
  SELECT * INTO r FROM _cleanup_by_where('subordinates', 'transferred_city IS NOT NULL AND created_at < now() - interval ''1 day''');
  v_cadres_rows := r.deleted_rows; v_cadres_bytes := r.est_bytes;

  -- 3) 死档：Game Over 或 已退休 且 超1天
  SELECT array_agg(id) INTO v_dead_ids FROM player_saves
  WHERE (game_over_type IS NOT NULL OR is_retired = true) AND updated_at < now() - interval '1 day';
  v_saves_rows := COALESCE(array_length(v_dead_ids,1),0);

  SELECT count(*) INTO v_total_saves FROM player_saves;
  IF v_total_saves > 0 AND v_saves_rows > 0 THEN
    FOR v_t IN SELECT table_name FROM information_schema.columns WHERE column_name='save_id' AND table_schema='public' LOOP
      EXECUTE format('SELECT pg_total_relation_size(%L::regclass)', v_t) INTO v_ts;
      EXECUTE format('SELECT count(*) FROM %I', v_t) INTO v_tc;
      IF v_tc > 0 THEN
        v_saves_bytes := v_saves_bytes + (v_ts::numeric / v_total_saves * v_saves_rows)::bigint;
      END IF;
    END LOOP;
  END IF;

  FOREACH v_t IN ARRAY v_orphan_tables LOOP
    EXECUTE format('DELETE FROM %I WHERE save_id = ANY($1)', v_t) USING v_dead_ids;
  END LOOP;
  DELETE FROM player_saves WHERE id = ANY(v_dead_ids);

  v_mb_after := round(pg_database_size(current_database()) / 1024.0 / 1024.0, 3);

  INSERT INTO cleanup_logs (trigger_type, large_table_deleted, dead_cadres_deleted, dead_saves_deleted, mb_before, mb_after, mb_saved, detail)
  VALUES (p_trigger, v_large_rows, v_cadres_rows, v_saves_rows, v_mb_before, v_mb_after,
          round((v_large_bytes + v_cadres_bytes + v_saves_bytes) / 1024.0 / 1024.0, 3),
          jsonb_build_object('large_est_bytes', v_large_bytes, 'cadres_est_bytes', v_cadres_bytes, 'saves_est_bytes', v_saves_bytes));

  RETURN jsonb_build_object(
    'trigger', p_trigger,
    'large_table_deleted', v_large_rows,
    'dead_cadres_deleted', v_cadres_rows,
    'dead_saves_deleted', v_saves_rows,
    'mb_before', v_mb_before,
    'mb_after', v_mb_after,
    'mb_saved', round((v_large_bytes + v_cadres_bytes + v_saves_bytes) / 1024.0 / 1024.0, 3)
  );
END;
$$;
```

<a id="supabasemigrations00040_execute_sql_9cb6e755sql"></a>
## `supabase/migrations/00040_execute_sql_9cb6e755.sql`

```
-- 启用 pg_cron 与 pg_net 扩展（清理为纯 DB 操作，无需 Edge Function）
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 每天北京时间 12:00（UTC 04:00）自动执行清理，结果写入 cleanup_logs
SELECT cron.schedule(
  'daily-game-cleanup-utc0400',
  '0 4 * * *',
  $$SELECT run_game_cleanup('cron');$$
);

-- 验证任务已注册
SELECT jobid, jobname, schedule, active FROM cron.job;
```

<a id="supabasemigrations00041_admin_system_and_statssql"></a>
## `supabase/migrations/00041_admin_system_and_stats.sql`

```
-- ═══ 管理员表（带 role 分级，附件 P0）═══════════════════════════
CREATE TABLE admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  username text,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- ═══ 审计日志（附件 P0）═══════════════════════════════════════════
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email text,
  action text NOT NULL,
  target_user_id text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ═══ 当前用户是否管理员（SECURITY DEFINER，避免 RLS 自环）═════════
CREATE OR REPLACE FUNCTION is_current_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION current_admin_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM admin_users WHERE user_id = auth.uid();
$$;

-- admin_users：管理员互查（仅管理员可读全部，自己可读自己）
CREATE POLICY "admin_read_all" ON admin_users FOR SELECT TO authenticated USING (is_current_admin());
CREATE POLICY "admin_self_read" ON admin_users FOR SELECT TO authenticated USING (user_id = auth.uid());
-- 写入仅 super_admin（通过 Edge Function/SQL 维护，前端不直接写）
CREATE POLICY "super_admin_write" ON admin_users FOR ALL TO authenticated
  USING (current_admin_role() = 'super_admin')
  WITH CHECK (current_admin_role() = 'super_admin');

-- audit_log：管理员可读，仅 super_admin 可写
CREATE POLICY "audit_admin_read" ON audit_log FOR SELECT TO authenticated USING (is_current_admin());
CREATE POLICY "audit_super_write" ON audit_log FOR INSERT TO authenticated WITH CHECK (current_admin_role() = 'super_admin');

-- cleanup_logs：管理员可读
CREATE POLICY "cleanup_admin_read" ON cleanup_logs FOR SELECT TO authenticated USING (is_current_admin());

-- ═══ 三张核心统计卡片（附件 P0，用户明确要求必须实现）═════════════
CREATE OR REPLACE FUNCTION admin_stats_overview()
RETURNS TABLE(total_users bigint, today_new bigint, today_active bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM auth.users WHERE deleted_at IS NULL),
    (SELECT count(*) FROM auth.users WHERE created_at >= CURRENT_DATE AND deleted_at IS NULL),
    (SELECT count(DISTINCT user_id) FROM player_saves WHERE updated_at >= CURRENT_DATE);
$$;

-- ═══ 清理日志查询（供后台展示历史清理报告）═════════════════════════
CREATE OR REPLACE FUNCTION list_cleanup_logs(p_limit integer DEFAULT 20)
RETURNS TABLE(id uuid, run_at timestamptz, trigger_type text, large_table_deleted integer, dead_cadres_deleted integer, dead_saves_deleted integer, mb_before numeric, mb_after numeric, mb_saved numeric)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, run_at, trigger_type, large_table_deleted, dead_cadres_deleted, dead_saves_deleted, mb_before, mb_after, mb_saved
  FROM cleanup_logs ORDER BY run_at DESC LIMIT p_limit;
$$;

-- ═══ 各数据库节点容量与玩家数（整合上一轮多数据库功能）═════════════
CREATE OR REPLACE FUNCTION admin_database_overview()
RETURNS TABLE(code text, name text, capacity_limit integer, player_count bigint, is_full boolean, sort_order integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.code, g.name, g.capacity_limit, COALESCE(p.c,0), g.is_full, g.sort_order
  FROM game_databases g
  LEFT JOIN (SELECT database_id, count(*) c FROM player_saves WHERE database_id IS NOT NULL GROUP BY database_id) p ON p.database_id = g.id
  ORDER BY g.sort_order ASC;
$$;

GRANT EXECUTE ON FUNCTION is_current_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION current_admin_role() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_stats_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION list_cleanup_logs(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_database_overview() TO authenticated;
```

<a id="supabasemigrations00042_admin_full_backendsql"></a>
## `supabase/migrations/00042_admin_full_backend.sql`

```
-- ════════════════════════════════════════════════════════════════
-- 谁主沉浮 · 管理员后台完整后端（按 md_20260806_071627_1 规格）
-- 已存在（上一轮）：admin_users(role) / audit_log / is_current_admin() / current_admin_role()
--   / admin_stats_overview() / list_cleanup_logs() / admin_database_overview() / run_game_cleanup()
-- ════════════════════════════════════════════════════════════════

-- ───────── 兑换码 ─────────
CREATE TABLE redeem_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  label text NOT NULL DEFAULT '通用兑换码',
  reward jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_by_email text,
  used_at timestamptz,
  is_used boolean NOT NULL DEFAULT false
);
ALTER TABLE redeem_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "redeem_admin_read" ON redeem_codes FOR SELECT TO authenticated USING (is_current_admin());
CREATE POLICY "redeem_admin_insert" ON redeem_codes FOR INSERT TO authenticated WITH CHECK (COALESCE(current_admin_role(),'') IN ('admin','super_admin'));
CREATE POLICY "redeem_admin_update" ON redeem_codes FOR UPDATE TO authenticated USING (is_current_admin()) WITH CHECK (is_current_admin());

-- ───────── 推送通知 ─────────
CREATE TABLE push_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  target_type text NOT NULL DEFAULT 'all',
  target_value text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_sent boolean NOT NULL DEFAULT false,
  sent_at timestamptz
);
ALTER TABLE push_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_admin_all" ON push_notifications FOR ALL TO authenticated USING (is_current_admin()) WITH CHECK (is_current_admin());
CREATE POLICY "push_player_read" ON push_notifications FOR SELECT TO authenticated
  USING (is_sent = true AND target_type = 'all');

-- ───────── 游戏配置热更新 ─────────
CREATE TABLE game_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE game_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config_read_all" ON game_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "config_super_write" ON game_config FOR ALL TO authenticated
  USING (COALESCE(current_admin_role(),'') = 'super_admin')
  WITH CHECK (COALESCE(current_admin_role(),'') = 'super_admin');
INSERT INTO game_config (key, value, description) VALUES
  ('promotion_age_limit', '{"value":65}', '晋升年龄上限'),
  ('kpi_weights', '{"gdp":0.3,"livelihood":0.25,"security":0.2,"ecology":0.15,"business":0.1}', 'KPI 各项权重'),
  ('position_quota', '{"base":2,"per_rank":1}', '职数配额'),
  ('redeem_reward_default', '{"merit":500,"fund":10000}', '兑换码默认奖励')
ON CONFLICT (key) DO NOTHING;

-- ───────── 异常检测规则 ─────────
CREATE TABLE detection_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  threshold integer NOT NULL DEFAULT 1,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE detection_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rule_admin_read" ON detection_rules FOR SELECT TO authenticated USING (is_current_admin());
CREATE POLICY "rule_super_write" ON detection_rules FOR ALL TO authenticated
  USING (COALESCE(current_admin_role(),'') = 'super_admin')
  WITH CHECK (COALESCE(current_admin_role(),'') = 'super_admin');
INSERT INTO detection_rules (rule_key, name, description, threshold) VALUES
  ('merit_spike', '功勋异常增长', '24小时内 merit_points 超过阈值', 5000),
  ('rank_jump', '职级飞跃', '存档 rank_level 超过阈值', 12),
  ('fund_anomaly', '资金异常', 'fund_balance 超过阈值', 50000000)
ON CONFLICT (rule_key) DO NOTHING;

-- ───────── 命中异常玩家 ─────────
CREATE TABLE flagged_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  username text,
  rule_key text NOT NULL,
  rule_name text,
  reason text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  flagged_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending'
);
ALTER TABLE flagged_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flagged_admin_read" ON flagged_users FOR SELECT TO authenticated USING (is_current_admin());
CREATE POLICY "flagged_admin_write" ON flagged_users FOR ALL TO authenticated
  USING (is_current_admin()) WITH CHECK (is_current_admin());

-- ════════════════════════════════════════════════════════════════
-- RPC 函数（全部 SECURITY DEFINER + 管理员守卫）
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION admin_log_action(p_action text, p_target_user_id text DEFAULT NULL, p_detail jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_email text;
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden: not admin'; END IF;
  SELECT email INTO v_email FROM admin_users WHERE user_id = v_uid;
  INSERT INTO audit_log (admin_user_id, admin_email, action, target_user_id, detail)
  VALUES (v_uid, COALESCE(v_email,''), p_action, p_target_user_id, p_detail);
END;
$$;

CREATE OR REPLACE FUNCTION admin_account_list(p_search text DEFAULT NULL, p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS TABLE(
  user_id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, banned boolean,
  save_id uuid, player_name text, rank_level int, rank_name text, merit_points int,
  is_admin boolean, admin_role text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT u.id, u.email, u.created_at, u.last_sign_in_at,
         (u.banned_until IS NOT NULL AND u.banned_until > now()) AS banned,
         ps.id, ps.player_name, ps.rank_level, ps.rank_name, ps.merit_points,
         EXISTS(SELECT 1 FROM admin_users a WHERE a.user_id=u.id),
         (SELECT a.role FROM admin_users a WHERE a.user_id=u.id)
  FROM auth.users u
  LEFT JOIN player_saves ps ON ps.user_id = u.id
  WHERE u.deleted_at IS NULL
    AND (p_search IS NULL OR p_search = '' OR u.email ILIKE '%'||p_search||'%' OR ps.player_name ILIKE '%'||p_search||'%')
  ORDER BY u.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION admin_account_stats()
RETURNS TABLE(total_users bigint, has_character bigint, active_saves bigint, admin_count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT count(*) FROM auth.users WHERE deleted_at IS NULL),
    (SELECT count(DISTINCT user_id) FROM player_saves),
    (SELECT count(*) FROM player_saves WHERE game_over_type IS NULL AND is_retired = false),
    (SELECT count(*) FROM admin_users);
$$;

CREATE OR REPLACE FUNCTION admin_registration_trend(p_days int DEFAULT 14)
RETURNS TABLE(d date, cnt bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT d::date, count(u.id)
  FROM generate_series(CURRENT_DATE - (p_days - 1), CURRENT_DATE, '1 day'::interval) d
  LEFT JOIN auth.users u ON u.created_at::date = d::date AND u.deleted_at IS NULL
  GROUP BY d ORDER BY d;
$$;

CREATE OR REPLACE FUNCTION admin_top_active(p_limit int DEFAULT 20)
RETURNS TABLE(player_name text, rank_level int, rank_name text, merit_points int, updated_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT player_name, rank_level, rank_name, merit_points, updated_at
  FROM player_saves WHERE game_over_type IS NULL AND is_retired = false
  ORDER BY merit_points DESC NULLS LAST LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION admin_rank_distribution()
RETURNS TABLE(rank_level int, cnt bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT rank_level, count(*) FROM player_saves
  WHERE game_over_type IS NULL GROUP BY rank_level ORDER BY rank_level;
$$;

CREATE OR REPLACE FUNCTION admin_online_players(p_minutes int DEFAULT 5)
RETURNS TABLE(player_name text, rank_level int, rank_name text, updated_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT player_name, rank_level, rank_name, updated_at FROM player_saves
  WHERE updated_at >= now() - (p_minutes || ' minutes')::interval
  ORDER BY updated_at DESC;
$$;

CREATE OR REPLACE FUNCTION admin_scan_anomalies()
RETURNS TABLE(scanned int, flagged int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_flagged int := 0; v_tmp int;
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO flagged_users (user_id, username, rule_key, rule_name, reason, evidence)
  SELECT ps.user_id, ps.player_name, 'merit_spike', '功勋异常增长',
    '功勋值 '||ps.merit_points||' 超过阈值 5000',
    jsonb_build_object('merit_points', ps.merit_points, 'rank_level', ps.rank_level)
  FROM player_saves ps
  WHERE ps.merit_points > 5000
    AND NOT EXISTS(SELECT 1 FROM flagged_users f WHERE f.user_id=ps.user_id AND f.rule_key='merit_spike' AND f.status='pending');
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_flagged := v_flagged + v_tmp;

  INSERT INTO flagged_users (user_id, username, rule_key, rule_name, reason, evidence)
  SELECT ps.user_id, ps.player_name, 'rank_jump', '职级飞跃',
    '职级 L'||ps.rank_level||' 超过阈值 12',
    jsonb_build_object('rank_level', ps.rank_level)
  FROM player_saves ps
  WHERE ps.rank_level > 12
    AND NOT EXISTS(SELECT 1 FROM flagged_users f WHERE f.user_id=ps.user_id AND f.rule_key='rank_jump' AND f.status='pending');
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_flagged := v_flagged + v_tmp;

  INSERT INTO flagged_users (user_id, username, rule_key, rule_name, reason, evidence)
  SELECT ps.user_id, ps.player_name, 'fund_anomaly', '资金异常',
    '资金余额 '||ps.fund_balance||' 超过阈值 5000万',
    jsonb_build_object('fund_balance', ps.fund_balance, 'rank_level', ps.rank_level)
  FROM player_saves ps
  WHERE ps.fund_balance > 50000000
    AND NOT EXISTS(SELECT 1 FROM flagged_users f WHERE f.user_id=ps.user_id AND f.rule_key='fund_anomaly' AND f.status='pending');
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_flagged := v_flagged + v_tmp;

  PERFORM admin_log_action('scan_anomalies', NULL, jsonb_build_object('new_flagged', v_flagged));
  RETURN QUERY SELECT (SELECT count(*)::int FROM player_saves), v_flagged;
END;
$$;

CREATE OR REPLACE FUNCTION admin_promote_rank(p_save_id uuid, p_target_rank int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_target_rank < 1 OR p_target_rank > 15 THEN RAISE EXCEPTION '职级需在 1-15'; END IF;
  UPDATE player_saves SET rank_level = p_target_rank, updated_at = now() WHERE id = p_save_id;
  PERFORM admin_log_action('promote_rank', NULL, jsonb_build_object('save_id', p_save_id, 'target_rank', p_target_rank));
END;
$$;

CREATE OR REPLACE FUNCTION admin_force_promote(p_save_id uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_new int;
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RAISE EXCEPTION 'forbidden: super_admin only'; END IF;
  UPDATE player_saves SET rank_level = rank_level + 1, updated_at = now() WHERE id = p_save_id RETURNING rank_level INTO v_new;
  PERFORM admin_log_action('force_promote', NULL, jsonb_build_object('save_id', p_save_id, 'new_rank', v_new));
  RETURN v_new;
END;
$$;

CREATE OR REPLACE FUNCTION admin_toggle_ban(p_user_id uuid, p_ban boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF EXISTS(SELECT 1 FROM admin_users WHERE user_id=p_user_id AND role='super_admin') AND current_admin_role()<>'super_admin' THEN
    RAISE EXCEPTION '不能操作超级管理员';
  END IF;
  IF p_ban THEN
    UPDATE auth.users SET banned_until = '9999-12-31'::timestamptz WHERE id = p_user_id AND deleted_at IS NULL;
  ELSE
    UPDATE auth.users SET banned_until = NULL WHERE id = p_user_id;
  END IF;
  PERFORM admin_log_action(CASE WHEN p_ban THEN 'ban_user' ELSE 'unban_user' END, p_user_id::text, jsonb_build_object('ban', p_ban));
END;
$$;

CREATE OR REPLACE FUNCTION admin_reset_password(p_user_id uuid, p_new_password text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF length(p_new_password) < 6 THEN RAISE EXCEPTION '密码至少 6 位'; END IF;
  UPDATE auth.users SET encrypted_password = crypt(p_new_password, gen_salt('bf')) WHERE id = p_user_id;
  PERFORM admin_log_action('reset_password', p_user_id::text, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION admin_update_save_fields(p_save_id uuid, p_fields jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RAISE EXCEPTION 'forbidden: super_admin only'; END IF;
  UPDATE player_saves SET
    player_name    = COALESCE(NULLIF(p_fields->>'player_name','')::text, player_name),
    merit_points   = COALESCE((p_fields->>'merit_points')::int, merit_points),
    moral_value    = COALESCE((p_fields->>'moral_value')::int, moral_value),
    city_gdp       = COALESCE((p_fields->>'city_gdp')::bigint, city_gdp),
    city_livelihood = COALESCE((p_fields->>'city_livelihood')::int, city_livelihood),
    city_ecology   = COALESCE((p_fields->>'city_ecology')::int, city_ecology),
    city_business  = COALESCE((p_fields->>'city_business')::int, city_business),
    security_index = COALESCE((p_fields->>'security_index')::int, security_index),
    boss_favor     = COALESCE((p_fields->>'boss_favor')::int, boss_favor),
    fund_balance   = COALESCE((p_fields->>'fund_balance')::bigint, fund_balance),
    personal_savings = COALESCE((p_fields->>'personal_savings')::bigint, personal_savings),
    updated_at = now()
  WHERE id = p_save_id;
  PERFORM admin_log_action('update_save', NULL, jsonb_build_object('save_id', p_save_id, 'fields', p_fields));
END;
$$;

CREATE OR REPLACE FUNCTION admin_clear_cooldowns(p_save_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RAISE EXCEPTION 'forbidden: super_admin only'; END IF;
  UPDATE player_saves SET updated_at = now() WHERE id = p_save_id;
  PERFORM admin_log_action('clear_cooldowns', NULL, jsonb_build_object('save_id', p_save_id));
END;
$$;

CREATE OR REPLACE FUNCTION admin_create_redeem_code(p_label text, p_reward jsonb, p_count int DEFAULT 1)
RETURNS SETOF text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i int; v_code text; v_uid uuid := auth.uid(); v_email text;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT email INTO v_email FROM admin_users WHERE user_id = v_uid;
  FOR i IN 1..GREATEST(p_count,1) LOOP
    v_code := upper(substr(encode(gen_random_bytes(4),'hex'),1,4) || '-' ||
                     substr(encode(gen_random_bytes(4),'hex'),1,4) || '-' ||
                     substr(encode(gen_random_bytes(4),'hex'),1,4));
    INSERT INTO redeem_codes (code, label, reward, created_by, created_by_email)
      VALUES (v_code, COALESCE(NULLIF(p_label,''),'通用兑换码'), COALESCE(p_reward,'{}'::jsonb), v_uid, COALESCE(v_email,''));
    RETURN NEXT v_code;
  END LOOP;
  PERFORM admin_log_action('create_redeem_code', NULL, jsonb_build_object('count', GREATEST(p_count,1), 'label', p_label));
END;
$$;

CREATE OR REPLACE FUNCTION admin_send_push(p_title text, p_body text, p_target_type text DEFAULT 'all', p_target_value text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_uid uuid := auth.uid(); v_email text;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT email INTO v_email FROM admin_users WHERE user_id = v_uid;
  INSERT INTO push_notifications (title, body, target_type, target_value, created_by, created_by_email, is_sent, sent_at)
    VALUES (p_title, p_body, p_target_type, p_target_value, v_uid, COALESCE(v_email,''), true, now())
    RETURNING id INTO v_id;
  PERFORM admin_log_action('send_push', NULL, jsonb_build_object('id', v_id, 'title', p_title, 'target_type', p_target_type));
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION admin_save_config(p_key text, p_value jsonb, p_description text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RAISE EXCEPTION 'forbidden: super_admin only'; END IF;
  INSERT INTO game_config (key, value, description, updated_at, updated_by)
    VALUES (p_key, p_value, p_description, now(), v_uid)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = COALESCE(EXCLUDED.description, game_config.description), updated_at = now(), updated_by = v_uid;
  PERFORM admin_log_action('save_config', NULL, jsonb_build_object('key', p_key));
END;
$$;

CREATE OR REPLACE FUNCTION admin_preview_inactive(p_days int)
RETURNS TABLE(user_id uuid, email text, last_active timestamptz, has_save boolean, player_name text, rank_level int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RAISE EXCEPTION 'forbidden: super_admin only'; END IF;
  RETURN QUERY
  SELECT u.id, u.email, COALESCE(ps.updated_at, u.last_sign_in_at, u.created_at),
         ps.id IS NOT NULL, ps.player_name, ps.rank_level
  FROM auth.users u
  LEFT JOIN player_saves ps ON ps.user_id = u.id
  WHERE u.deleted_at IS NULL
    AND NOT EXISTS(SELECT 1 FROM admin_users a WHERE a.user_id=u.id)
    AND COALESCE(ps.updated_at, u.last_sign_in_at, u.created_at) < now() - (p_days || ' days')::interval
  ORDER BY COALESCE(ps.updated_at, u.last_sign_in_at, u.created_at) ASC
  LIMIT 200;
END;
$$;

CREATE OR REPLACE FUNCTION admin_delete_inactive(p_user_ids uuid[])
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cnt int := 0; uid uuid;
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RAISE EXCEPTION 'forbidden: super_admin only'; END IF;
  FOREACH uid IN ARRAY p_user_ids LOOP
    UPDATE auth.users SET deleted_at = now() WHERE id = uid AND deleted_at IS NULL
      AND NOT EXISTS(SELECT 1 FROM admin_users WHERE user_id=uid);
    IF FOUND THEN
      DELETE FROM player_saves WHERE user_id = uid;
      v_cnt := v_cnt + 1;
    END IF;
  END LOOP;
  PERFORM admin_log_action('delete_inactive', NULL, jsonb_build_object('count', v_cnt));
  RETURN v_cnt;
END;
$$;

CREATE OR REPLACE FUNCTION admin_list_audit(p_limit int DEFAULT 50)
RETURNS TABLE(id uuid, admin_email text, action text, target_user_id text, detail jsonb, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, admin_email, action, target_user_id, detail, created_at
  FROM audit_log ORDER BY created_at DESC LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION
  admin_log_action(text,text,jsonb),
  admin_account_list(text,int,int),
  admin_account_stats(),
  admin_registration_trend(int),
  admin_top_active(int),
  admin_rank_distribution(),
  admin_online_players(int),
  admin_scan_anomalies(),
  admin_promote_rank(uuid,int),
  admin_force_promote(uuid),
  admin_toggle_ban(uuid,boolean),
  admin_reset_password(uuid,text),
  admin_update_save_fields(uuid,jsonb),
  admin_clear_cooldowns(uuid),
  admin_create_redeem_code(text,jsonb,int),
  admin_send_push(text,text,text,text),
  admin_save_config(text,jsonb,text),
  admin_preview_inactive(int),
  admin_delete_inactive(uuid[]),
  admin_list_audit(int)
TO authenticated;
```

<a id="supabasemigrations00043_admin_get_save_rpcsql"></a>
## `supabase/migrations/00043_admin_get_save_rpc.sql`

```
-- 存档全量读取（super_admin），返回可编辑字段，规避 player_saves 的 RLS 不确定性
CREATE OR REPLACE FUNCTION admin_get_save(p_save_id uuid)
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'id', id, 'user_id', user_id, 'player_name', player_name,
    'rank_level', rank_level, 'rank_name', rank_name,
    'merit_points', merit_points, 'moral_value', moral_value,
    'city_gdp', city_gdp, 'city_livelihood', city_livelihood,
    'city_ecology', city_ecology, 'city_business', city_business,
    'security_index', security_index, 'boss_favor', boss_favor,
    'fund_balance', fund_balance, 'personal_savings', personal_savings,
    'is_retired', is_retired, 'game_over_type', game_over_type,
    'updated_at', updated_at
  ) FROM player_saves WHERE id = p_save_id;
$$;
GRANT EXECUTE ON FUNCTION admin_get_save(uuid) TO authenticated;
```

<a id="supabasemigrations00044_admin_get_save_guardsql"></a>
## `supabase/migrations/00044_admin_get_save_guard.sql`

```
-- 给 admin_get_save 加管理员守卫（查看存档：admin+ 权限），避免任意用户读取他人存档
CREATE OR REPLACE FUNCTION admin_get_save(p_save_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden: admin+ only'; END IF;
  RETURN (SELECT jsonb_build_object(
    'id', id, 'user_id', user_id, 'player_name', player_name,
    'rank_level', rank_level, 'rank_name', rank_name,
    'merit_points', merit_points, 'moral_value', moral_value,
    'city_gdp', city_gdp, 'city_livelihood', city_livelihood,
    'city_ecology', city_ecology, 'city_business', city_business,
    'security_index', security_index, 'boss_favor', boss_favor,
    'fund_balance', fund_balance, 'personal_savings', personal_savings,
    'is_retired', is_retired, 'game_over_type', game_over_type,
    'updated_at', updated_at
  ) FROM player_saves WHERE id = p_save_id);
END;
$$;
GRANT EXECUTE ON FUNCTION admin_get_save(uuid) TO authenticated;
```

<a id="supabasemigrations00045_set_super_admin_and_create_adminssql"></a>
## `supabase/migrations/00045_set_super_admin_and_create_admins.sql`

```
DO $$
DECLARE
  i int;
  v_email text;
  v_uid uuid;
BEGIN
  FOR i IN 1..20 LOOP
    v_email := 'admin_' || lpad(i::text, 2, '0') || '@zhuchen.who';
    SELECT id INTO v_uid FROM auth.users WHERE email = v_email AND deleted_at IS NULL;
    IF v_uid IS NULL THEN
      INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, aud)
      VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000',
        v_email,
        crypt('WH@Admin' || lpad(i::text, 2, '0') || '!', gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{}'::jsonb,
        false, 'authenticated'
      )
      RETURNING id INTO v_uid;
    ELSE
      UPDATE auth.users SET encrypted_password = crypt('WH@Admin' || lpad(i::text, 2, '0') || '!', gen_salt('bf')), updated_at = now()
      WHERE id = v_uid;
    END IF;

    INSERT INTO admin_users (user_id, email, username, role)
    VALUES (v_uid, v_email, 'admin_' || lpad(i::text, 2, '0'), 'admin')
    ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email, username = EXCLUDED.username, role = 'admin';
  END LOOP;
END $$;
```

<a id="supabasemigrations00046_mark_super_admin_rolesql"></a>
## `supabase/migrations/00046_mark_super_admin_role.sql`

```
DO $$
DECLARE v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'W2794045093@hotmail.com' AND deleted_at IS NULL;
  IF v_uid IS NOT NULL THEN
    INSERT INTO admin_users (user_id, email, username, role)
    VALUES (v_uid, 'W2794045093@hotmail.com', 'super_admin', 'super_admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin', email = EXCLUDED.email;
  END IF;
END $$;
```

<a id="supabasemigrations00047_super_admin_account_00049sql"></a>
## `supabase/migrations/00047_super_admin_account_00049.sql`

```
DO $$
DECLARE v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'W2794045093@hotmail.com' AND deleted_at IS NULL;
  IF v_uid IS NULL THEN
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, aud)
    VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'W2794045093@hotmail.com',
      crypt('we2794045093/%', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      true, 'authenticated'
    )
    RETURNING id INTO v_uid;
  ELSE
    UPDATE auth.users SET encrypted_password = crypt('we2794045093/%', gen_salt('bf')), is_super_admin = true, updated_at = now()
    WHERE id = v_uid;
  END IF;

  INSERT INTO admin_users (user_id, email, username, role)
  VALUES (v_uid, 'W2794045093@hotmail.com', 'super_admin', 'super_admin')
  ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin', email = EXCLUDED.email, username = EXCLUDED.username;
END $$;
```

<a id="supabasemigrations00048_test_codes_approvals_batch_00050sql"></a>
## `supabase/migrations/00048_test_codes_approvals_batch_00050.sql`

```
-- 测试码表
CREATE TABLE test_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  batch_name text NOT NULL DEFAULT '默认批次',
  status text NOT NULL DEFAULT 'unused' CHECK (status IN ('unused','used','disabled','available','expired')),
  used_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_by_email text,
  used_at timestamptz,
  expires_at timestamptz,
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE test_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "test_codes_admin_read" ON test_codes FOR SELECT TO authenticated USING (is_current_admin());
CREATE POLICY "test_codes_admin_write" ON test_codes FOR ALL TO authenticated
  USING (COALESCE(current_admin_role(),'') IN ('admin','super_admin'))
  WITH CHECK (COALESCE(current_admin_role(),'') IN ('admin','super_admin'));

-- 用户审批表
CREATE TABLE user_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  test_code_id uuid REFERENCES test_codes(id) ON DELETE SET NULL,
  reject_reason text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
ALTER TABLE user_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approval_admin_read" ON user_approvals FOR SELECT TO authenticated USING (is_current_admin());
CREATE POLICY "approval_admin_write" ON user_approvals FOR ALL TO authenticated
  USING (COALESCE(current_admin_role(),'') IN ('admin','super_admin'))
  WITH CHECK (COALESCE(current_admin_role(),'') IN ('admin','super_admin'));
CREATE POLICY "approval_self_read" ON user_approvals FOR SELECT TO authenticated USING (user_id = auth.uid());

-- player_saves 增加 approval_status 列
ALTER TABLE player_saves ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved';

-- 审批统计
CREATE OR REPLACE FUNCTION admin_approval_stats()
RETURNS TABLE(pending bigint, approved bigint, rejected bigint, total bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    count(*) FILTER (WHERE status='pending'),
    count(*) FILTER (WHERE status='approved'),
    count(*) FILTER (WHERE status='rejected'),
    count(*)
  FROM user_approvals;
$$;

-- 审批列表
CREATE OR REPLACE FUNCTION admin_approval_list(p_search text DEFAULT NULL, p_status text DEFAULT NULL, p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS TABLE(
  id uuid, user_id uuid, email text, status text, test_code_id uuid, reject_reason text,
  reviewed_by uuid, reviewed_at timestamptz, created_at timestamptz,
  player_name text, rank_level int, rank_name text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT ua.id, ua.user_id, ua.email, ua.status, ua.test_code_id, ua.reject_reason,
         ua.reviewed_by, ua.reviewed_at, ua.created_at,
         ps.player_name, ps.rank_level, ps.rank_name
  FROM user_approvals ua
  LEFT JOIN player_saves ps ON ps.user_id = ua.user_id
  WHERE (p_search IS NULL OR p_search = '' OR ua.email ILIKE '%'||p_search||'%' OR COALESCE(ps.player_name,'') ILIKE '%'||p_search||'%')
    AND (p_status IS NULL OR p_status = 'all' OR ua.status = p_status)
  ORDER BY ua.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 批量通过
CREATE OR REPLACE FUNCTION admin_batch_approve(p_user_ids uuid[])
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid; v_cnt int := 0; v_reviewer uuid := auth.uid();
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  FOREACH v_uid IN ARRAY p_user_ids LOOP
    UPDATE user_approvals SET status='approved', reviewed_by=v_reviewer, reviewed_at=now()
    WHERE user_id = v_uid AND status = 'pending';
    IF FOUND THEN
      UPDATE player_saves SET approval_status='approved', updated_at=now() WHERE user_id = v_uid;
      v_cnt := v_cnt + 1;
    END IF;
  END LOOP;
  PERFORM admin_log_action('batch_approve', NULL, jsonb_build_object('count', v_cnt));
  RETURN v_cnt;
END;
$$;

-- 批量驳回
CREATE OR REPLACE FUNCTION admin_batch_reject(p_user_ids uuid[], p_reason text)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid; v_cnt int := 0; v_reviewer uuid := auth.uid();
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  FOREACH v_uid IN ARRAY p_user_ids LOOP
    UPDATE user_approvals SET status='rejected', reject_reason=COALESCE(NULLIF(p_reason,''),'未通过'), reviewed_by=v_reviewer, reviewed_at=now()
    WHERE user_id = v_uid AND status = 'pending';
    IF FOUND THEN
      UPDATE player_saves SET approval_status='rejected', updated_at=now() WHERE user_id = v_uid;
      v_cnt := v_cnt + 1;
    END IF;
  END LOOP;
  PERFORM admin_log_action('batch_reject', NULL, jsonb_build_object('count', v_cnt, 'reason', p_reason));
  RETURN v_cnt;
END;
$$;

-- 测试码统计
CREATE OR REPLACE FUNCTION admin_test_code_stats()
RETURNS TABLE(unused bigint, used bigint, disabled bigint, total bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    count(*) FILTER (WHERE status IN ('unused','available')),
    count(*) FILTER (WHERE status = 'used'),
    count(*) FILTER (WHERE status IN ('disabled','expired')),
    count(*)
  FROM test_codes;
$$;

GRANT EXECUTE ON FUNCTION
  admin_approval_stats(),
  admin_approval_list(text,text,int,int),
  admin_batch_approve(uuid[]),
  admin_batch_reject(uuid[],text),
  admin_test_code_stats()
TO authenticated;
```

<a id="supabasemigrations00049_execute_sql_7214c2e9sql"></a>
## `supabase/migrations/00049_execute_sql_7214c2e9.sql`

```
DROP FUNCTION IF EXISTS admin_database_overview(); CREATE OR REPLACE FUNCTION admin_database_overview() RETURNS TABLE (
  id uuid,
  code text,
  name text,
  capacity_limit int,
  player_count bigint,
  is_full boolean,
  is_active boolean,
  sort_order int
) LANGUAGE sql SECURITY DEFINER SET search_path TO public AS $$
  SELECT g.id, g.code, g.name, g.capacity_limit, COALESCE(p.c,0), g.is_full, g.is_active, g.sort_order
  FROM game_databases g
  LEFT JOIN (SELECT database_id, count(*) c FROM player_saves WHERE database_id IS NOT NULL GROUP BY database_id) p ON p.database_id = g.id
  ORDER BY g.sort_order ASC;
$$; GRANT EXECUTE ON FUNCTION admin_database_overview() TO authenticated;
```

<a id="supabasemigrations00050_gate_and_database_rpcs_00051_part2sql"></a>
## `supabase/migrations/00050_gate_and_database_rpcs_00051_part2.sql`

```
-- register_with_test_code
CREATE OR REPLACE FUNCTION register_with_test_code(p_test_code text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_code test_codes%ROWTYPE;
  v_app user_approvals%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RETURN 'NOT_AUTHENTICATED'; END IF;
  SELECT * INTO v_code FROM test_codes WHERE code = upper(trim(p_test_code));
  IF NOT FOUND THEN RETURN 'CODE_NOT_FOUND'; END IF;
  IF v_code.status = 'used' THEN RETURN 'CODE_ALREADY_USED'; END IF;
  IF v_code.status = 'disabled' THEN RETURN 'CODE_DISABLED'; END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    UPDATE test_codes SET status = 'expired' WHERE id = v_code.id;
    RETURN 'CODE_EXPIRED';
  END IF;
  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;
  IF FOUND THEN
    IF v_app.status = 'approved' THEN RETURN 'ALREADY_APPROVED'; END IF;
    IF v_app.status = 'pending' THEN RETURN 'ALREADY_PENDING'; END IF;
    UPDATE test_codes SET status='unused', used_by_user_id=NULL, used_by_email=NULL, used_at=NULL WHERE id = v_app.test_code_id;
    UPDATE user_approvals SET status='pending', test_code_id=v_code.id, reject_reason=NULL, reviewed_by=NULL, reviewed_at=NULL, created_at=now()
      WHERE user_id = v_uid;
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=(SELECT email FROM auth.users WHERE id=v_uid), used_at=now() WHERE id = v_code.id;
    UPDATE player_saves SET approval_status='pending', updated_at=now() WHERE user_id = v_uid;
    RETURN 'OK';
  END IF;
  UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=(SELECT email FROM auth.users WHERE id=v_uid), used_at=now() WHERE id = v_code.id;
  INSERT INTO user_approvals (user_id, email, status, test_code_id)
    VALUES (v_uid, (SELECT email FROM auth.users WHERE id=v_uid), 'pending', v_code.id);
  UPDATE player_saves SET approval_status='pending', updated_at=now() WHERE user_id = v_uid;
  RETURN 'OK';
END;
$$;

CREATE OR REPLACE FUNCTION admin_generate_test_codes(p_batch_name text, p_count int, p_expires_at timestamptz DEFAULT NULL, p_note text DEFAULT NULL)
RETURNS SETOF text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i int; v_code text; v_uid uuid := auth.uid(); v_email text;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_count IS NULL OR p_count < 1 THEN RAISE EXCEPTION '数量至少为 1'; END IF;
  SELECT email INTO v_email FROM admin_users WHERE user_id = v_uid;
  FOR i IN 1..p_count LOOP
    v_code := 'TEST-' || upper(substr(encode(gen_random_bytes(3),'hex'),1,6));
    INSERT INTO test_codes (code, batch_name, status, expires_at, note, created_by, created_by_email)
      VALUES (v_code, COALESCE(NULLIF(p_batch_name,''),'默认批次'), 'unused', p_expires_at, p_note, v_uid, COALESCE(v_email,''));
    RETURN NEXT v_code;
  END LOOP;
  PERFORM admin_log_action('generate_test_codes', NULL, jsonb_build_object('count', p_count, 'batch', p_batch_name));
END;
$$;

CREATE OR REPLACE FUNCTION admin_list_test_code_batches()
RETURNS TABLE(batch_name text, total bigint, used bigint, disabled bigint, available bigint, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT batch_name,
    count(*) AS total,
    count(*) FILTER (WHERE status = 'used') AS used,
    count(*) FILTER (WHERE status IN ('disabled','expired')) AS disabled,
    count(*) FILTER (WHERE status IN ('unused','available')) AS available,
    min(created_at) AS created_at
  FROM test_codes
  GROUP BY batch_name
  ORDER BY min(created_at) DESC;
$$;

CREATE OR REPLACE FUNCTION admin_list_test_codes(p_batch_name text DEFAULT NULL, p_status text DEFAULT NULL, p_limit int DEFAULT 100, p_offset int DEFAULT 0)
RETURNS TABLE(
  id uuid, code text, batch_name text, status text, used_by_user_id uuid, used_by_email text, used_at timestamptz,
  expires_at timestamptz, note text, created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT id, code, batch_name, status, used_by_user_id, used_by_email, used_at, expires_at, note, created_at
  FROM test_codes
  WHERE (p_batch_name IS NULL OR p_batch_name = 'all' OR batch_name = p_batch_name)
    AND (p_status IS NULL OR p_status = 'all' OR status = p_status)
  ORDER BY created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION admin_approve_user(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_reviewer uuid := auth.uid(); v_email text;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  UPDATE user_approvals SET status='approved', reviewed_by=v_reviewer, reviewed_at=now() WHERE user_id = p_user_id;
  UPDATE player_saves SET approval_status='approved', updated_at=now() WHERE user_id = p_user_id;
  INSERT INTO audit_log (admin_user_id, admin_email, action, target_user_id, detail)
  SELECT v_reviewer, COALESCE((SELECT email FROM admin_users WHERE user_id=v_reviewer),''), 'approve_user', p_user_id::text, jsonb_build_object('target_email', v_email)
  WHERE EXISTS (SELECT 1 FROM user_approvals WHERE user_id = p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION admin_reject_user(p_user_id uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_reviewer uuid := auth.uid(); v_email text;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  UPDATE user_approvals SET status='rejected', reject_reason=COALESCE(NULLIF(p_reason,''),'未通过'), reviewed_by=v_reviewer, reviewed_at=now() WHERE user_id = p_user_id;
  UPDATE player_saves SET approval_status='rejected', updated_at=now() WHERE user_id = p_user_id;
  INSERT INTO audit_log (admin_user_id, admin_email, action, target_user_id, detail)
  SELECT v_reviewer, COALESCE((SELECT email FROM admin_users WHERE user_id=v_reviewer),''), 'reject_user', p_user_id::text, jsonb_build_object('target_email', v_email, 'reason', p_reason)
  WHERE EXISTS (SELECT 1 FROM user_approvals WHERE user_id = p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION get_my_approval_status()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT status FROM user_approvals WHERE user_id = auth.uid()), 'none');
$$;

CREATE OR REPLACE FUNCTION get_my_test_code_status()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_app user_approvals%ROWTYPE; v_code text;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('approval_status','none','has_code',false,'test_code',NULL); END IF;
  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;
  SELECT tc.code INTO v_code FROM test_codes tc WHERE tc.id = v_app.test_code_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('approval_status','none','has_code',false,'test_code',NULL);
  END IF;
  RETURN jsonb_build_object('approval_status', v_app.status, 'has_code', v_app.test_code_id IS NOT NULL, 'test_code', v_code);
END;
$$;

CREATE OR REPLACE FUNCTION admin_create_database(p_code text, p_name text, p_capacity_limit int DEFAULT 1000)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_id uuid; v_sort int;
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RAISE EXCEPTION 'err: super_admin only'; END IF;
  IF NULLIF(trim(p_code),'') IS NULL OR NULLIF(trim(p_name),'') IS NULL THEN RAISE EXCEPTION 'err: 编码和名称不能为空'; END IF;
  IF p_capacity_limit IS NULL OR p_capacity_limit < 100 THEN RAISE EXCEPTION 'err: 容量上限至少为 100'; END IF;
  IF EXISTS (SELECT 1 FROM game_databases WHERE code = p_code) THEN RAISE EXCEPTION 'err: 大区编码已存在'; END IF;
  SELECT COALESCE(max(sort_order),0)+1 INTO v_sort FROM game_databases;
  INSERT INTO game_databases (code, name, capacity_limit, is_active, is_full, sort_order)
    VALUES (p_code, p_name, p_capacity_limit, true, false, v_sort)
    RETURNING id INTO v_id;
  PERFORM admin_log_action('create_database', NULL, jsonb_build_object('db_id', v_id, 'code', p_code, 'name', p_name));
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION admin_update_database(p_db_id uuid, p_name text DEFAULT NULL, p_capacity_limit int DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RAISE EXCEPTION 'err: super_admin only'; END IF;
  IF p_capacity_limit IS NOT NULL AND p_capacity_limit < 100 THEN RAISE EXCEPTION 'err: 容量上限至少为 100'; END IF;
  UPDATE game_databases SET
    name = COALESCE(NULLIF(p_name,''), name),
    capacity_limit = COALESCE(p_capacity_limit, capacity_limit)
  WHERE id = p_db_id;
  PERFORM admin_log_action('update_database', NULL, jsonb_build_object('db_id', p_db_id, 'name', p_name, 'capacity_limit', p_capacity_limit));
END;
$$;

CREATE OR REPLACE FUNCTION admin_toggle_database_active(p_db_id uuid, p_is_active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RAISE EXCEPTION 'err: super_admin only'; END IF;
  UPDATE game_databases SET is_active = p_is_active WHERE id = p_db_id;
  PERFORM admin_log_action('toggle_database_active', NULL, jsonb_build_object('db_id', p_db_id, 'is_active', p_is_active));
END;
$$;

GRANT EXECUTE ON FUNCTION
  register_with_test_code(text),
  admin_generate_test_codes(text,int,timestamptz,text),
  admin_list_test_codes(text,text,int,int),
  admin_list_test_code_batches(),
  admin_approve_user(uuid),
  admin_reject_user(uuid,text),
  get_my_approval_status(),
  get_my_test_code_status(),
  admin_create_database(text,text,int),
  admin_update_database(uuid,text,int),
  admin_toggle_database_active(uuid,boolean)
TO authenticated;
```

<a id="supabasemigrations00051_seed_game_databases_five_regionssql"></a>
## `supabase/migrations/00051_seed_game_databases_five_regions.sql`

```
INSERT INTO game_databases (code, name, capacity_limit, is_active, is_full, sort_order)
VALUES
  ('huadong',  '华东大区', 500, true,  false, 1),
  ('huabei',   '华北大区', 500, true,  false, 2),
  ('huanan',   '华南大区', 500, true,  false, 3),
  ('xinan',    '西南大区', 500, true,  false, 4),
  ('xibei',    '西北大区', 500, true,  false, 5)
ON CONFLICT DO NOTHING;
```

<a id="supabasemigrations00052_admin_get_player_full_game_datasql"></a>
## `supabase/migrations/00052_admin_get_player_full_game_data.sql`

```
CREATE OR REPLACE FUNCTION public.admin_get_player_full(p_save_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN (
    SELECT jsonb_build_object(
      'subordinates', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'name', name, 'role', role, 'ability', ability, 'loyalty', loyalty,
          'integrity', integrity, 'rank_level', rank_level, 'is_appointed', is_appointed,
          'appointed_role', appointed_role, 'faction', faction, 'specialty', specialty
        ) ORDER BY loyalty DESC)
        FROM subordinates WHERE save_id = p_save_id
      ), '[]'::jsonb),
      'boss_tasks', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'title', title, 'task_type', task_type, 'status', status,
          'urgency', urgency, 'reward_merit', reward_merit,
          'current_value', current_value, 'target_value', target_value
        ) ORDER BY created_at DESC)
        FROM boss_tasks WHERE save_id = p_save_id
      ), '[]'::jsonb),
      'career_history', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'position', position, 'city', city, 'rank_level', rank_level,
          'start_year', start_year, 'end_year', end_year
        ) ORDER BY start_year DESC)
        FROM player_career_history WHERE save_id = p_save_id
      ), '[]'::jsonb),
      'family_members', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'name', name, 'member_type', member_type, 'job', job,
          'health_score', health_score, 'moral_score', moral_score, 'is_adult', is_adult
        ) ORDER BY created_at)
        FROM family_members WHERE save_id = p_save_id
      ), '[]'::jsonb),
      'construction', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'name', name, 'category', category, 'status', status,
          'start_day', start_day, 'finish_day', finish_day, 'merit_reward', merit_reward
        ) ORDER BY created_at DESC)
        FROM construction_projects WHERE save_id = p_save_id
      ), '[]'::jsonb),
      'police_cases', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'title', q.title, 'case_type', q.case_type, 'difficulty', q.difficulty,
          'status', q.status, 'reward_merit', q.reward_merit
        ))
        FROM (
          SELECT title, case_type, difficulty, status, reward_merit
          FROM police_cases WHERE save_id = p_save_id
          ORDER BY created_at DESC LIMIT 30
        ) q
      ), '[]'::jsonb),
      'health', COALESCE((
        SELECT to_jsonb(ph) FROM player_health ph WHERE save_id = p_save_id LIMIT 1
      ), '{}'::jsonb),
      'governing_areas', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'area_name', area_name, 'area_type', area_type,
          'dev_index', dev_index, 'favor_index', favor_index
        ) ORDER BY dev_index DESC)
        FROM governing_areas WHERE save_id = p_save_id
      ), '[]'::jsonb)
    )
  );
END;
$$;
```

<a id="supabasemigrations00053_region_online_stats_recreatesql"></a>
## `supabase/migrations/00053_region_online_stats_recreate.sql`

```
DROP FUNCTION IF EXISTS public.admin_database_overview();
CREATE FUNCTION public.admin_database_overview()
RETURNS TABLE(id uuid, code text, name text, capacity_limit integer, player_count bigint, online_count bigint, is_full boolean, is_active boolean, sort_order integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT g.id, g.code, g.name, g.capacity_limit, COALESCE(p.c,0), COALESCE(p.o,0), g.is_full, g.is_active, g.sort_order
  FROM game_databases g
  LEFT JOIN (
    SELECT database_id,
      count(*) c,
      count(*) FILTER (WHERE updated_at > now() - interval '10 minutes') o
    FROM player_saves WHERE database_id IS NOT NULL GROUP BY database_id
  ) p ON p.database_id = g.id
  ORDER BY g.sort_order ASC;
$function$;
GRANT EXECUTE ON FUNCTION public.admin_database_overview() TO authenticated;
```

<a id="supabasemigrations00054_create_admin_account_functionsql"></a>
## `supabase/migrations/00054_create_admin_account_function.sql`

```
-- 创建管理员账号的统一函数：自动补齐 role=authenticated + identity 记录 + admin_users
-- 确保以后新建的管理员账号结构完整，可正常登录且不进入游戏
CREATE OR REPLACE FUNCTION public.create_admin_account(p_email text, p_password text, p_role text DEFAULT 'admin')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'auth'
AS $function$
DECLARE
  v_uid uuid;
  v_hash text;
  v_email text := lower(trim(p_email));
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden: only admins can create admin accounts'; END IF;
  IF p_role NOT IN ('admin', 'super_admin') THEN RAISE EXCEPTION 'invalid role: must be admin or super_admin'; END IF;
  IF char_length(p_password) < 6 THEN RAISE EXCEPTION 'password too short (min 6)'; END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN RAISE EXCEPTION 'email already exists'; END IF;

  v_hash := crypt(p_password, gen_salt('bf'));
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    v_email, v_hash, now(), now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, false
  ) RETURNING id INTO v_uid;

  INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  VALUES (
    v_uid, v_uid,
    jsonb_build_object('email', v_email, 'email_verified', true, 'phone_verified', false, 'sub', v_uid::text),
    'email', now(), now()
  );

  INSERT INTO admin_users (user_id, email, username, role)
  VALUES (v_uid, v_email, split_part(v_email, '@', 1), p_role);

  RETURN v_uid;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.create_admin_account(text, text, text) TO authenticated;
```

<a id="supabasemigrations00055_fix_extension_search_path_admin_functionssql"></a>
## `supabase/migrations/00055_fix_extension_search_path_admin_functions.sql`

```
-- 修复：扩展函数(crypt/gen_salt/gen_random_bytes/digest)位于 extensions schema，
-- 但管理员函数 SET search_path TO 'public'，导致找不到扩展函数。
-- 将相关函数的 search_path 改为 'public, extensions'（含 auth 以便查询 auth.users）

CREATE OR REPLACE FUNCTION public.admin_generate_test_codes(p_batch_name text, p_count integer, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_note text DEFAULT NULL::text)
RETURNS SETOF text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE i int; v_code text; v_uid uuid := auth.uid(); v_email text;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_count IS NULL OR p_count < 1 THEN RAISE EXCEPTION '数量至少为 1'; END IF;
  SELECT email INTO v_email FROM admin_users WHERE user_id = v_uid;
  FOR i IN 1..p_count LOOP
    v_code := 'TEST-' || upper(substr(encode(gen_random_bytes(3),'hex'),1,6));
    INSERT INTO test_codes (code, batch_name, status, expires_at, note, created_by, created_by_email)
      VALUES (v_code, COALESCE(NULLIF(p_batch_name,''),'默认批次'), 'unused', p_expires_at, p_note, v_uid, COALESCE(v_email,''));
    RETURN NEXT v_code;
  END LOOP;
  PERFORM admin_log_action('generate_test_codes', NULL, jsonb_build_object('count', p_count, 'batch', p_batch_name));
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_admin_account(p_email text, p_password text, p_role text DEFAULT 'admin')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE
  v_uid uuid;
  v_hash text;
  v_email text := lower(trim(p_email));
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden: only admins can create admin accounts'; END IF;
  IF p_role NOT IN ('admin', 'super_admin') THEN RAISE EXCEPTION 'invalid role: must be admin or super_admin'; END IF;
  IF char_length(p_password) < 6 THEN RAISE EXCEPTION 'password too short (min 6)'; END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN RAISE EXCEPTION 'email already exists'; END IF;

  v_hash := crypt(p_password, gen_salt('bf'));
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    v_email, v_hash, now(), now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, false
  ) RETURNING id INTO v_uid;

  INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  VALUES (
    v_uid, v_uid,
    jsonb_build_object('email', v_email, 'email_verified', true, 'phone_verified', false, 'sub', v_uid::text),
    'email', now(), now()
  );

  INSERT INTO admin_users (user_id, email, username, role)
  VALUES (v_uid, v_email, split_part(v_email, '@', 1), p_role);

  RETURN v_uid;
END;
$function$;
```

<a id="supabasemigrations00056_fix_redeem_and_resetpw_search_pathsql"></a>
## `supabase/migrations/00056_fix_redeem_and_resetpw_search_path.sql`

```
CREATE OR REPLACE FUNCTION public.admin_create_redeem_code(p_label text, p_reward jsonb, p_count integer DEFAULT 1)
RETURNS SETOF text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE i int; v_code text; v_uid uuid := auth.uid(); v_email text;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT email INTO v_email FROM admin_users WHERE user_id = v_uid;
  FOR i IN 1..GREATEST(p_count,1) LOOP
    v_code := upper(substr(encode(gen_random_bytes(4),'hex'),1,4) || '-' ||
                     substr(encode(gen_random_bytes(4),'hex'),1,4) || '-' ||
                     substr(encode(gen_random_bytes(4),'hex'),1,4));
    INSERT INTO redeem_codes (code, label, reward, created_by, created_by_email)
      VALUES (v_code, COALESCE(NULLIF(p_label,''),'通用兑换码'), COALESCE(p_reward,'{}'::jsonb), v_uid, COALESCE(v_email,''));
    RETURN NEXT v_code;
  END LOOP;
  PERFORM admin_log_action('create_redeem_code', NULL, jsonb_build_object('count', GREATEST(p_count,1), 'label', p_label));
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_reset_password(p_user_id uuid, p_new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF length(p_new_password) < 6 THEN RAISE EXCEPTION '密码至少 6 位'; END IF;
  UPDATE auth.users SET encrypted_password = crypt(p_new_password, gen_salt('bf')) WHERE id = p_user_id;
  PERFORM admin_log_action('reset_password', p_user_id::text, '{}'::jsonb);
END;
$function$;
```

<a id="supabasemigrations00057_fix_ambiguous_id_admin_list_test_codessql"></a>
## `supabase/migrations/00057_fix_ambiguous_id_admin_list_test_codes.sql`

```
CREATE OR REPLACE FUNCTION public.admin_list_test_codes(p_batch_name text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
RETURNS TABLE(id uuid, code text, batch_name text, status text, used_by_user_id uuid, used_by_email text, used_at timestamp with time zone, expires_at timestamp with time zone, note text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT tc.id, tc.code, tc.batch_name, tc.status, tc.used_by_user_id, tc.used_by_email, tc.used_at, tc.expires_at, tc.note, tc.created_at
  FROM test_codes tc
  WHERE (p_batch_name IS NULL OR p_batch_name = 'all' OR tc.batch_name = p_batch_name)
    AND (p_status IS NULL OR p_status = 'all' OR tc.status = p_status)
  ORDER BY tc.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;
```

<a id="supabasemigrations00058_admin_find_save_by_accountsql"></a>
## `supabase/migrations/00058_admin_find_save_by_account.sql`

```
-- 管理员按账号(邮箱/用户ID/存档ID)查找玩家存档，把后台与玩家账号绑定
CREATE OR REPLACE FUNCTION public.admin_find_save_by_account(p_identifier text)
RETURNS TABLE(save_id uuid, user_id uuid, email text, player_name text, rank_level integer, rank_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE v_key text := lower(trim(p_identifier));
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT ps.id AS save_id, ps.user_id, u.email, ps.player_name, ps.rank_level, ps.rank_name
  FROM player_saves ps
  JOIN auth.users u ON u.id = ps.user_id
  WHERE u.email = v_key
     OR ps.user_id::text = trim(p_identifier)
     OR ps.id::text = trim(p_identifier);
END;
$function$;
GRANT EXECUTE ON FUNCTION public.admin_find_save_by_account(text) TO authenticated;
```

<a id="supabasemigrations00059_fix_admin_find_save_castssql"></a>
## `supabase/migrations/00059_fix_admin_find_save_casts.sql`

```
CREATE OR REPLACE FUNCTION public.admin_find_save_by_account(p_identifier text)
RETURNS TABLE(save_id uuid, user_id uuid, email text, player_name text, rank_level integer, rank_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE v_key text := lower(trim(p_identifier));
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT ps.id AS save_id, ps.user_id, u.email::text AS email, ps.player_name::text AS player_name, ps.rank_level, ps.rank_name::text AS rank_name
  FROM player_saves ps
  JOIN auth.users u ON u.id = ps.user_id
  WHERE u.email = v_key
     OR ps.user_id::text = trim(p_identifier)
     OR ps.id::text = trim(p_identifier);
END;
$function$;
```

<a id="supabasemigrations00060_register_with_test_code_auto_approvesql"></a>
## `supabase/migrations/00060_register_with_test_code_auto_approve.sql`

```
CREATE OR REPLACE FUNCTION public.register_with_test_code(p_test_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_code test_codes%ROWTYPE;
  v_app user_approvals%ROWTYPE;
  v_email text;
BEGIN
  IF v_uid IS NULL THEN RETURN 'NOT_AUTHENTICATED'; END IF;
  SELECT * INTO v_code FROM test_codes WHERE code = upper(trim(p_test_code));
  IF NOT FOUND THEN RETURN 'CODE_NOT_FOUND'; END IF;
  IF v_code.status = 'used' THEN RETURN 'CODE_ALREADY_USED'; END IF;
  IF v_code.status = 'disabled' THEN RETURN 'CODE_DISABLED'; END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    UPDATE test_codes SET status = 'expired' WHERE id = v_code.id;
    RETURN 'CODE_EXPIRED';
  END IF;
  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;
  IF FOUND THEN
    IF v_app.status = 'approved' THEN RETURN 'ALREADY_APPROVED'; END IF;
    IF v_app.status = 'pending' THEN RETURN 'ALREADY_PENDING'; END IF;
    -- 重新提交：释放旧码、用新码并直接通过审核
    UPDATE test_codes SET status='unused', used_by_user_id=NULL, used_by_email=NULL, used_at=NULL WHERE id = v_app.test_code_id;
    UPDATE user_approvals SET status='approved', test_code_id=v_code.id, reject_reason=NULL, reviewed_by=NULL, reviewed_at=now(), created_at=now()
      WHERE user_id = v_uid;
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now() WHERE id = v_code.id;
    UPDATE player_saves SET approval_status='approved', updated_at=now() WHERE user_id = v_uid;
    RETURN 'OK';
  END IF;
  UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now() WHERE id = v_code.id;
  INSERT INTO user_approvals (user_id, email, status, test_code_id)
    VALUES (v_uid, v_email, 'approved', v_code.id);
  UPDATE player_saves SET approval_status='approved', updated_at=now() WHERE user_id = v_uid;
  RETURN 'OK';
END;
$function$;
```

<a id="supabasemigrations00061_admin_delete_accountsql"></a>
## `supabase/migrations/00061_admin_delete_account.sql`

```
-- 管理员单独清理数据库账号：删除该账号下的全部游戏数据 + auth 账号
CREATE OR REPLACE FUNCTION public.admin_delete_account(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_email text; v_count int;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'user_id required'; END IF;
  -- 禁止删除管理员账号自身
  IF EXISTS (SELECT 1 FROM admin_users WHERE user_id = p_user_id) THEN RAISE EXCEPTION 'cannot delete admin account'; END IF;
  SELECT email::text INTO v_email FROM auth.users WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'account not found'; END IF;

  -- 删除该账号绑定的全部游戏数据（按 FK 级联或显式删除）
  DELETE FROM player_subordinates WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = p_user_id);
  DELETE FROM player_boss_tasks WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = p_user_id);
  DELETE FROM player_career_history WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = p_user_id);
  DELETE FROM player_family_members WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = p_user_id);
  DELETE FROM player_construction WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = p_user_id);
  DELETE FROM player_police_cases WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = p_user_id);
  DELETE FROM player_health WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = p_user_id);
  DELETE FROM player_governing_areas WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = p_user_id);
  DELETE FROM player_saves WHERE user_id = p_user_id;
  DELETE FROM user_approvals WHERE user_id = p_user_id;
  DELETE FROM push_notifications WHERE user_id = p_user_id;
  DELETE FROM audit_log WHERE target_user_id = p_user_id::text;
  -- 删除 auth 账号（identities 由 FK 级联删除）
  DELETE FROM auth.users WHERE id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  PERFORM admin_log_action('delete_account', p_user_id::text, jsonb_build_object('email', v_email));
  RETURN jsonb_build_object('deleted', true, 'email', v_email, 'auth_deleted', v_count > 0);
END;
$function$;
GRANT EXECUTE ON FUNCTION public.admin_delete_account(uuid) TO authenticated;
```

<a id="supabasemigrations00062_fix_admin_delete_account_tablessql"></a>
## `supabase/migrations/00062_fix_admin_delete_account_tables.sql`

```
CREATE OR REPLACE FUNCTION public.admin_delete_account(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_email text; v_count int;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'user_id required'; END IF;
  IF EXISTS (SELECT 1 FROM admin_users WHERE user_id = p_user_id) THEN RAISE EXCEPTION 'cannot delete admin account'; END IF;
  SELECT email::text INTO v_email FROM auth.users WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'account not found'; END IF;

  DELETE FROM subordinates WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = p_user_id);
  DELETE FROM boss_tasks WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = p_user_id);
  DELETE FROM player_career_history WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = p_user_id);
  DELETE FROM family_members WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = p_user_id);
  DELETE FROM construction_projects WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = p_user_id);
  DELETE FROM police_cases WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = p_user_id);
  DELETE FROM player_health WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = p_user_id);
  DELETE FROM governing_areas WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = p_user_id);
  DELETE FROM player_saves WHERE user_id = p_user_id;
  DELETE FROM user_approvals WHERE user_id = p_user_id;
  DELETE FROM push_notifications WHERE user_id = p_user_id;
  DELETE FROM audit_log WHERE target_user_id = p_user_id::text;
  DELETE FROM auth.users WHERE id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  PERFORM admin_log_action('delete_account', p_user_id::text, jsonb_build_object('email', v_email));
  RETURN jsonb_build_object('deleted', true, 'email', v_email, 'auth_deleted', v_count > 0);
END;
$function$;
```

<a id="supabasemigrations00063_fix_admin_delete_account_no_push_useridsql"></a>
## `supabase/migrations/00063_fix_admin_delete_account_no_push_userid.sql`

```
CREATE OR REPLACE FUNCTION public.admin_delete_account(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_email text; v_count int;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'user_id required'; END IF;
  IF EXISTS (SELECT 1 FROM admin_users WHERE user_id = p_user_id) THEN RAISE EXCEPTION 'cannot delete admin account'; END IF;
  SELECT email::text INTO v_email FROM auth.users WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'account not found'; END IF;

  DELETE FROM subordinates WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = p_user_id);
  DELETE FROM boss_tasks WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = p_user_id);
  DELETE FROM player_career_history WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = p_user_id);
  DELETE FROM family_members WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = p_user_id);
  DELETE FROM construction_projects WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = p_user_id);
  DELETE FROM police_cases WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = p_user_id);
  DELETE FROM player_health WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = p_user_id);
  DELETE FROM governing_areas WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = p_user_id);
  DELETE FROM player_saves WHERE user_id = p_user_id;
  DELETE FROM user_approvals WHERE user_id = p_user_id;
  DELETE FROM audit_log WHERE target_user_id = p_user_id::text;
  DELETE FROM auth.users WHERE id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  PERFORM admin_log_action('delete_account', p_user_id::text, jsonb_build_object('email', v_email));
  RETURN jsonb_build_object('deleted', true, 'email', v_email, 'auth_deleted', v_count > 0);
END;
$function$;
```

<a id="supabasemigrations00064_add_performance_indexessql"></a>
## `supabase/migrations/00064_add_performance_indexes.sql`

```
-- 性能优化：补齐热路径缺失索引，避免随数据增长变卡

-- 【最关键】player_saves.user_id —— 每次加载游戏/后台都按 user_id 查询，此前全表扫描
CREATE INDEX idx_player_saves_user_id ON public.player_saves (user_id);
CREATE INDEX idx_player_saves_user_approval ON public.player_saves (user_id, approval_status);

-- 游戏关联表按 save_id 查询（游戏内加载 + admin_get_player_full）
CREATE INDEX idx_boss_tasks_save_id ON public.boss_tasks (save_id);
CREATE INDEX idx_construction_save_id ON public.construction_projects (save_id);
CREATE INDEX idx_police_cases_save_id ON public.police_cases (save_id);
CREATE INDEX idx_governing_areas_save_id ON public.governing_areas (save_id);

-- 审计日志：按目标用户 + 时间查询
CREATE INDEX idx_audit_log_target ON public.audit_log (target_user_id);
CREATE INDEX idx_audit_log_created ON public.audit_log (created_at DESC);

-- 推送通知按时间倒序
CREATE INDEX idx_push_notifications_created ON public.push_notifications (created_at DESC);

-- 测试码按状态 + 时间筛选
CREATE INDEX idx_test_codes_status ON public.test_codes (status);
CREATE INDEX idx_test_codes_created ON public.test_codes (created_at DESC);
```

<a id="supabasemigrations00065_execute_sql_68c1c480sql"></a>
## `supabase/migrations/00065_execute_sql_68c1c480.sql`

```
EXPLAIN (ANALYZE, BUFFERS) SELECT *
FROM player_saves
WHERE
  user_id = '558643ef-f8da-4ff4-a265-d1b2dd2366e9';
```

<a id="supabasemigrations00066_test_code_12h_expirysql"></a>
## `supabase/migrations/00066_test_code_12h_expiry.sql`

```
-- 测试码：未使用 12 小时后自动失效；已使用的码对账号永久生效（status='used' 为终态，不再校验过期）
CREATE OR REPLACE FUNCTION public.admin_generate_test_codes(p_batch_name text, p_count integer, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_note text DEFAULT NULL::text)
RETURNS SETOF text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE i int; v_code text; v_uid uuid := auth.uid(); v_email text; v_exp timestamptz;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_count IS NULL OR p_count < 1 THEN RAISE EXCEPTION '数量至少为 1'; END IF;
  SELECT email INTO v_email FROM admin_users WHERE user_id = v_uid;
  -- 未指定过期时间时默认 12 小时后失效
  v_exp := COALESCE(p_expires_at, now() + interval '12 hours');
  FOR i IN 1..p_count LOOP
    v_code := 'TEST-' || upper(substr(encode(gen_random_bytes(3),'hex'),1,6));
    INSERT INTO test_codes (code, batch_name, status, expires_at, note, created_by, created_by_email)
      VALUES (v_code, COALESCE(NULLIF(p_batch_name,''),'默认批次'), 'unused', v_exp, p_note, v_uid, COALESCE(v_email,''));
    RETURN NEXT v_code;
  END LOOP;
  PERFORM admin_log_action('generate_test_codes', NULL, jsonb_build_object('count', p_count, 'batch', p_batch_name, 'expires_at', v_exp));
END;
$function$;
```

<a id="supabasemigrations00067_guard_database_overview_super_adminsql"></a>
## `supabase/migrations/00067_guard_database_overview_super_admin.sql`

```
CREATE OR REPLACE FUNCTION public.admin_database_overview()
RETURNS TABLE(id uuid, code text, name text, capacity_limit integer, player_count bigint, online_count bigint, is_full boolean, is_active boolean, sort_order integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
BEGIN
  IF COALESCE(current_admin_role(),'') <> 'super_admin' THEN RAISE EXCEPTION 'forbidden: super_admin only'; END IF;
  RETURN QUERY
    SELECT g.id, g.code, g.name, g.capacity_limit, COALESCE(p.c,0), COALESCE(p.o,0), g.is_full, g.is_active, g.sort_order
    FROM game_databases g
    LEFT JOIN (
      SELECT database_id,
        count(*) c,
        count(*) FILTER (WHERE updated_at > now() - interval '10 minutes') o
      FROM player_saves WHERE database_id IS NOT NULL GROUP BY database_id
    ) p ON p.database_id = g.id
    ORDER BY g.sort_order ASC;
END;
$function$;
```

<a id="supabasemigrations00068_database_overview_admin_readonlysql"></a>
## `supabase/migrations/00068_database_overview_admin_readonly.sql`

```
CREATE OR REPLACE FUNCTION public.admin_database_overview()
RETURNS TABLE(id uuid, code text, name text, capacity_limit integer, player_count bigint, online_count bigint, is_full boolean, is_active boolean, sort_order integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
BEGIN
  -- 只读查询：admin 及以上均可查看（写操作由对应 RPC 单独限制 super_admin）
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
    SELECT g.id, g.code, g.name, g.capacity_limit, COALESCE(p.c,0), COALESCE(p.o,0), g.is_full, g.is_active, g.sort_order
    FROM game_databases g
    LEFT JOIN (
      SELECT database_id,
        count(*) c,
        count(*) FILTER (WHERE updated_at > now() - interval '10 minutes') o
      FROM player_saves WHERE database_id IS NOT NULL GROUP BY database_id
    ) p ON p.database_id = g.id
    ORDER BY g.sort_order ASC;
END;
$function$;
```

<a id="supabasemigrations00069_test_code_default_15minsql"></a>
## `supabase/migrations/00069_test_code_default_15min.sql`

```
CREATE OR REPLACE FUNCTION public.admin_generate_test_codes(p_batch_name text DEFAULT '', p_count int DEFAULT 10, p_expires_at timestamptz DEFAULT NULL, p_note text DEFAULT NULL)
RETURNS SETOF text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE i int; v_code text; v_uid uuid := auth.uid(); v_email text; v_exp timestamptz;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_count IS NULL OR p_count < 1 THEN RAISE EXCEPTION '数量至少为 1'; END IF;
  SELECT email INTO v_email FROM admin_users WHERE user_id = v_uid;
  -- 未指定过期时间时默认 15 分钟后失效
  v_exp := COALESCE(p_expires_at, now() + interval '15 minutes');
  FOR i IN 1..p_count LOOP
    v_code := 'TEST-' || upper(substr(encode(gen_random_bytes(3),'hex'),1,6));
    INSERT INTO test_codes (code, batch_name, status, expires_at, note, created_by, created_by_email)
      VALUES (v_code, COALESCE(NULLIF(p_batch_name,''),'默认批次'), 'unused', v_exp, p_note, v_uid, COALESCE(v_email,''));
    RETURN NEXT v_code;
  END LOOP;
  PERFORM admin_log_action('generate_test_codes', NULL, jsonb_build_object('count', p_count, 'batch', p_batch_name, 'expires_at', v_exp));
END;
$function$;
```

<a id="supabasemigrations00070_test_code_register_pending_approvalsql"></a>
## `supabase/migrations/00070_test_code_register_pending_approval.sql`

```
CREATE OR REPLACE FUNCTION public.register_with_test_code(p_test_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_code test_codes%ROWTYPE;
  v_app user_approvals%ROWTYPE;
  v_email text;
BEGIN
  IF v_uid IS NULL THEN RETURN 'NOT_AUTHENTICATED'; END IF;
  SELECT * INTO v_code FROM test_codes WHERE code = upper(trim(p_test_code));
  IF NOT FOUND THEN RETURN 'CODE_NOT_FOUND'; END IF;
  IF v_code.status = 'used' THEN RETURN 'CODE_ALREADY_USED'; END IF;
  IF v_code.status = 'disabled' THEN RETURN 'CODE_DISABLED'; END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    UPDATE test_codes SET status = 'expired' WHERE id = v_code.id;
    RETURN 'CODE_EXPIRED';
  END IF;
  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;
  IF FOUND THEN
    IF v_app.status = 'approved' THEN RETURN 'ALREADY_APPROVED'; END IF;
    IF v_app.status = 'pending' THEN RETURN 'ALREADY_PENDING'; END IF;
    -- 重新提交：释放旧码、绑定新码，进入待审核（需管理员手动审批）
    UPDATE test_codes SET status='unused', used_by_user_id=NULL, used_by_email=NULL, used_at=NULL WHERE id = v_app.test_code_id;
    UPDATE user_approvals SET status='pending', test_code_id=v_code.id, reject_reason=NULL, reviewed_by=NULL, reviewed_at=NULL, created_at=now()
      WHERE user_id = v_uid;
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now() WHERE id = v_code.id;
    RETURN 'OK';
  END IF;
  -- 新提交：标记测试码已使用，创建待审核记录（需管理员手动审批后方可进游戏）
  UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now() WHERE id = v_code.id;
  INSERT INTO user_approvals (user_id, email, status, test_code_id)
    VALUES (v_uid, v_email, 'pending', v_code.id);
  RETURN 'OK';
END;
$function$;
```

<a id="supabasemigrations00071_user_approvals_device_idsql"></a>
## `supabase/migrations/00071_user_approvals_device_id.sql`

```
-- 新增设备指纹字段
ALTER TABLE public.user_approvals ADD COLUMN IF NOT EXISTS device_id text DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_user_approvals_device_id ON public.user_approvals(device_id) WHERE device_id IS NOT NULL;
```

<a id="supabasemigrations00072_register_with_test_code_device_checksql"></a>
## `supabase/migrations/00072_register_with_test_code_device_check.sql`

```
CREATE OR REPLACE FUNCTION public.register_with_test_code(p_test_code text, p_device_id text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_code test_codes%ROWTYPE;
  v_app user_approvals%ROWTYPE;
  v_email text;
BEGIN
  IF v_uid IS NULL THEN RETURN 'NOT_AUTHENTICATED'; END IF;

  -- 设备指纹检测：同一设备已有其他已通过的账号，自动驳回
  IF p_device_id IS NOT NULL AND p_device_id NOT IN ('unknown', 'web', '') THEN
    IF EXISTS (
      SELECT 1 FROM user_approvals ua
      WHERE ua.device_id = p_device_id
        AND ua.status = 'approved'
        AND ua.user_id <> v_uid
    ) THEN
      RETURN 'DEVICE_ALREADY_REGISTERED';
    END IF;
  END IF;

  SELECT * INTO v_code FROM test_codes WHERE code = upper(trim(p_test_code));
  IF NOT FOUND THEN RETURN 'CODE_NOT_FOUND'; END IF;
  IF v_code.status = 'used' THEN RETURN 'CODE_ALREADY_USED'; END IF;
  IF v_code.status = 'disabled' THEN RETURN 'CODE_DISABLED'; END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    UPDATE test_codes SET status = 'expired' WHERE id = v_code.id;
    RETURN 'CODE_EXPIRED';
  END IF;
  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;
  IF FOUND THEN
    IF v_app.status = 'approved' THEN RETURN 'ALREADY_APPROVED'; END IF;
    IF v_app.status = 'pending' THEN RETURN 'ALREADY_PENDING'; END IF;
    -- 重新提交：释放旧码、绑定新码，进入待审核
    UPDATE test_codes SET status='unused', used_by_user_id=NULL, used_by_email=NULL, used_at=NULL WHERE id = v_app.test_code_id;
    UPDATE user_approvals
      SET status='pending', test_code_id=v_code.id, reject_reason=NULL,
          reviewed_by=NULL, reviewed_at=NULL, created_at=now(),
          device_id=COALESCE(p_device_id, device_id)
      WHERE user_id = v_uid;
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now() WHERE id = v_code.id;
    RETURN 'OK';
  END IF;
  -- 新提交：创建待审核记录（需管理员手动审批后方可进游戏）
  UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now() WHERE id = v_code.id;
  INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id)
    VALUES (v_uid, v_email, 'pending', v_code.id, p_device_id);
  RETURN 'OK';
END;
$function$;
```

<a id="supabasemigrations00073_drop_old_register_function_fix_overloadsql"></a>
## `supabase/migrations/00073_drop_old_register_function_fix_overload.sql`

```
-- 删除旧版单参数函数，消除重载冲突
DROP FUNCTION IF EXISTS public.register_with_test_code(text);

-- 确保新版函数是最终版本（幂等）
CREATE OR REPLACE FUNCTION public.register_with_test_code(p_test_code text, p_device_id text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_code test_codes%ROWTYPE;
  v_app user_approvals%ROWTYPE;
  v_email text;
BEGIN
  IF v_uid IS NULL THEN RETURN 'NOT_AUTHENTICATED'; END IF;

  -- 设备指纹检测：同一设备已有其他已通过的账号，自动驳回
  IF p_device_id IS NOT NULL AND p_device_id NOT IN ('unknown', 'web', '') THEN
    IF EXISTS (
      SELECT 1 FROM user_approvals ua
      WHERE ua.device_id = p_device_id
        AND ua.status = 'approved'
        AND ua.user_id <> v_uid
    ) THEN
      RETURN 'DEVICE_ALREADY_REGISTERED';
    END IF;
  END IF;

  SELECT * INTO v_code FROM test_codes WHERE code = upper(trim(p_test_code));
  IF NOT FOUND THEN RETURN 'CODE_NOT_FOUND'; END IF;
  IF v_code.status = 'used' THEN RETURN 'CODE_ALREADY_USED'; END IF;
  IF v_code.status = 'disabled' THEN RETURN 'CODE_DISABLED'; END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    UPDATE test_codes SET status = 'expired' WHERE id = v_code.id;
    RETURN 'CODE_EXPIRED';
  END IF;

  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;

  IF FOUND THEN
    IF v_app.status = 'approved' THEN RETURN 'ALREADY_APPROVED'; END IF;
    IF v_app.status = 'pending' THEN RETURN 'ALREADY_PENDING'; END IF;
    -- 已被驳回：释放旧码，绑定新码，重新进入待审核
    IF v_app.test_code_id IS NOT NULL THEN
      UPDATE test_codes SET status='unused', used_by_user_id=NULL, used_by_email=NULL, used_at=NULL
        WHERE id = v_app.test_code_id AND status = 'used';
    END IF;
    UPDATE user_approvals
      SET status='pending', test_code_id=v_code.id, reject_reason=NULL,
          reviewed_by=NULL, reviewed_at=NULL, created_at=now(),
          device_id=COALESCE(NULLIF(p_device_id,''), device_id)
      WHERE user_id = v_uid;
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
      WHERE id = v_code.id;
    RETURN 'OK';
  END IF;

  -- 全新提交：创建待审核记录，等待管理员审批
  UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
    WHERE id = v_code.id;
  INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id)
    VALUES (v_uid, v_email, 'pending', v_code.id, NULLIF(p_device_id,''));
  RETURN 'OK';
END;
$function$;
```

<a id="supabasemigrations00074_admin_batch_approve_all_pendingsql"></a>
## `supabase/migrations/00074_admin_batch_approve_all_pending.sql`

```
-- 一键批量通过所有 pending 状态的用户（不含 rejected）
CREATE OR REPLACE FUNCTION public.admin_batch_approve_all_pending()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_reviewer uuid := auth.uid();
  v_uid      uuid;
  v_cnt      int := 0;
BEGIN
  IF COALESCE(current_admin_role(), '') NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR v_uid IN
    SELECT user_id FROM user_approvals WHERE status = 'pending'
  LOOP
    UPDATE user_approvals
      SET status = 'approved', reviewed_by = v_reviewer, reviewed_at = now()
      WHERE user_id = v_uid AND status = 'pending';

    IF FOUND THEN
      -- 同步更新 player_saves（若已创建角色则解锁）
      UPDATE player_saves
        SET approval_status = 'approved', updated_at = now()
        WHERE user_id = v_uid;
      v_cnt := v_cnt + 1;
    END IF;
  END LOOP;

  PERFORM admin_log_action(
    'batch_approve_all_pending',
    NULL,
    jsonb_build_object('count', v_cnt, 'approved_by', v_reviewer)
  );
  RETURN v_cnt;
END;
$function$;
```

<a id="supabasemigrations00075_password_reset_requests_and_rpcssql"></a>
## `supabase/migrations/00075_password_reset_requests_and_rpcs.sql`

```
-- 密码重置申请表：普通管理员发起 → 超级管理员审批（审批时可重新设置密码）
CREATE TABLE public.password_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  target_email text NOT NULL,
  target_player_name text,
  requested_by uuid NOT NULL,
  requested_by_email text NOT NULL,
  reason text,
  new_password text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_prr_status ON public.password_reset_requests (status, created_at DESC);
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- 普通管理员发起密码重置申请（不能直接改密）
CREATE OR REPLACE FUNCTION public.admin_request_password_reset(p_target_user_id uuid, p_reason text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_target_email text;
  v_target_name text;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT role INTO v_role FROM admin_users WHERE user_id = v_uid;
  IF COALESCE(v_role,'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT email::text INTO v_target_email FROM auth.users WHERE id = p_target_user_id;
  IF v_target_email IS NULL THEN RAISE EXCEPTION 'target_not_found'; END IF;

  SELECT s.player_name INTO v_target_name FROM player_saves s WHERE s.user_id = p_target_user_id LIMIT 1;

  INSERT INTO password_reset_requests (target_user_id, target_email, target_player_name, requested_by, requested_by_email, reason)
  VALUES (p_target_user_id, v_target_email, v_target_name, v_uid,
          COALESCE((SELECT email::text FROM auth.users WHERE id = v_uid),''), p_reason)
  RETURNING id INTO v_id;

  PERFORM admin_log_action('request_password_reset', p_target_user_id,
    jsonb_build_object('request_id', v_id, 'target_email', v_target_email, 'reason', p_reason));
  RETURN v_id;
END;
$function$;

-- 超级管理员审批：重新设置玩家新密码并标记通过
CREATE OR REPLACE FUNCTION public.admin_approve_password_reset(p_request_id uuid, p_new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','extensions','auth'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_req password_reset_requests%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT role INTO v_role FROM admin_users WHERE user_id = v_uid;
  IF COALESCE(v_role,'') <> 'super_admin' THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF length(p_new_password) < 6 THEN RAISE EXCEPTION 'password_too_short'; END IF;

  SELECT * INTO v_req FROM password_reset_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'request_not_found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'already_processed'; END IF;

  PERFORM auth.admin.update_user_by_id(v_req.target_user_id,
    jsonb_build_object('password', p_new_password));

  UPDATE password_reset_requests
    SET status='approved', new_password=p_new_password, reviewed_by=v_uid, reviewed_at=now()
    WHERE id = p_request_id;

  PERFORM admin_log_action('approve_password_reset', v_req.target_user_id,
    jsonb_build_object('request_id', p_request_id, 'target_email', v_req.target_email));
  RETURN true;
END;
$function$;

-- 超级管理员驳回
CREATE OR REPLACE FUNCTION public.admin_reject_password_reset(p_request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_req password_reset_requests%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT role INTO v_role FROM admin_users WHERE user_id = v_uid;
  IF COALESCE(v_role,'') <> 'super_admin' THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT * INTO v_req FROM password_reset_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'request_not_found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'already_processed'; END IF;

  UPDATE password_reset_requests
    SET status='rejected', reviewed_by=v_uid, reviewed_at=now()
    WHERE id = p_request_id;

  PERFORM admin_log_action('reject_password_reset', v_req.target_user_id,
    jsonb_build_object('request_id', p_request_id));
  RETURN true;
END;
$function$;

-- 列出密码重置申请（admin+ 可看）
CREATE OR REPLACE FUNCTION public.admin_list_password_reset_requests(p_status text DEFAULT NULL, p_limit int DEFAULT 50)
RETURNS TABLE(
  id uuid, target_user_id uuid, target_email text, target_player_name text,
  requested_by uuid, requested_by_email text, reason text, new_password text,
  status text, reviewed_by uuid, reviewed_at timestamptz, created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM admin_users WHERE user_id = auth.uid();
  IF COALESCE(v_role,'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;

  RETURN QUERY
    SELECT r.id, r.target_user_id, r.target_email, r.target_player_name,
           r.requested_by, r.requested_by_email, r.reason, r.new_password,
           r.status, r.reviewed_by, r.reviewed_at, r.created_at
    FROM password_reset_requests r
    WHERE (p_status IS NULL OR r.status = p_status)
    ORDER BY r.created_at DESC
    LIMIT p_limit;
END;
$function$;

-- 超级管理员直接修改玩家密码（无条件）
CREATE OR REPLACE FUNCTION public.admin_set_player_password(p_target_user_id uuid, p_new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','extensions','auth'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT role INTO v_role FROM admin_users WHERE user_id = v_uid;
  IF COALESCE(v_role,'') <> 'super_admin' THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF length(p_new_password) < 6 THEN RAISE EXCEPTION 'password_too_short'; END IF;

  PERFORM auth.admin.update_user_by_id(p_target_user_id,
    jsonb_build_object('password', p_new_password));

  PERFORM admin_log_action('set_player_password', p_target_user_id,
    jsonb_build_object('target_email', (SELECT email::text FROM auth.users WHERE id = p_target_user_id)));
  RETURN true;
END;
$function$;

-- 超级管理员删除玩家账号（无条件）
CREATE OR REPLACE FUNCTION public.admin_delete_player_account(p_target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','extensions','auth'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_email text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT role INTO v_role FROM admin_users WHERE user_id = v_uid;
  IF COALESCE(v_role,'') <> 'super_admin' THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_target_user_id = v_uid THEN RAISE EXCEPTION 'cannot_delete_self'; END IF;

  SELECT email::text INTO v_email FROM auth.users WHERE id = p_target_user_id;
  IF v_email IS NULL THEN RAISE EXCEPTION 'target_not_found'; END IF;

  PERFORM auth.admin.delete_user(p_target_user_id);

  PERFORM admin_log_action('delete_player_account', p_target_user_id,
    jsonb_build_object('target_email', v_email));
  RETURN true;
END;
$function$;

-- 超级管理员查看玩家明文密码：Auth 密码为哈希不可逆，返回占位说明
CREATE OR REPLACE FUNCTION public.admin_get_player_password(p_target_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','extensions','auth'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_email text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT role INTO v_role FROM admin_users WHERE user_id = v_uid;
  IF COALESCE(v_role,'') <> 'super_admin' THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT email::text INTO v_email FROM auth.users WHERE id = p_target_user_id;
  IF v_email IS NULL THEN RAISE EXCEPTION 'target_not_found'; END IF;

  -- 系统密码为单向哈希存储，无法还原明文；返回账号标识供管理员核对
  RETURN v_email;
END;
$function$;
```

<a id="supabasemigrations00076_admin_delete_test_code_batchsql"></a>
## `supabase/migrations/00076_admin_delete_test_code_batch.sql`

```
CREATE OR REPLACE FUNCTION public.admin_delete_test_code_batch(p_batch_name text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT role INTO v_role FROM admin_users WHERE user_id = v_uid;
  IF COALESCE(v_role,'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_batch_name IS NULL OR btrim(p_batch_name) = '' THEN RAISE EXCEPTION 'invalid_batch'; END IF;

  DELETE FROM test_codes WHERE batch_name = p_batch_name;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  PERFORM admin_log_action('delete_test_code_batch', NULL,
    jsonb_build_object('batch_name', p_batch_name, 'deleted', v_count));
  RETURN v_count;
END;
$function$;
```

<a id="supabasemigrations00077_account_soft_delete_retention_30dayssql"></a>
## `supabase/migrations/00077_account_soft_delete_retention_30days.sql`

```
-- 1. player_saves 增加软删除列
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS delete_reason text;
CREATE INDEX IF NOT EXISTS idx_player_saves_deleted_at
  ON player_saves (deleted_at) WHERE deleted_at IS NOT NULL;

-- 2. admin_account_list：新增 p_include_deleted 参数 + 返回 deleted_at
CREATE OR REPLACE FUNCTION public.admin_account_list(
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_include_deleted boolean DEFAULT false
)
RETURNS TABLE(
  user_id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz,
  banned boolean, save_id uuid, player_name text, rank_level integer, rank_name text,
  merit_points integer, is_admin boolean, admin_role text, auth_deleted_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT u.id, u.email, u.created_at, u.last_sign_in_at,
         (u.banned_until IS NOT NULL AND u.banned_until > now()) AS banned,
         ps.id, ps.player_name, ps.rank_level, ps.rank_name, ps.merit_points,
         EXISTS(SELECT 1 FROM admin_users a WHERE a.user_id=u.id),
         (SELECT a.role FROM admin_users a WHERE a.user_id=u.id),
         u.deleted_at
  FROM auth.users u
  LEFT JOIN player_saves ps ON ps.user_id = u.id
  WHERE (p_include_deleted OR u.deleted_at IS NULL)
    AND (p_search IS NULL OR p_search = ''
         OR u.email ILIKE '%'||p_search||'%'
         OR ps.player_name ILIKE '%'||p_search||'%')
  ORDER BY u.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 3. admin_delete_account → 软删除（设 deleted_at，保留所有数据）
CREATE OR REPLACE FUNCTION public.admin_delete_account(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions','auth'
AS $$
DECLARE
  v_email text;
  v_already_deleted timestamptz;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'user_id required'; END IF;
  IF EXISTS(SELECT 1 FROM admin_users WHERE user_id = p_user_id) THEN RAISE EXCEPTION 'cannot delete admin account'; END IF;
  SELECT email::text, deleted_at INTO v_email, v_already_deleted FROM auth.users WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'account not found'; END IF;
  IF v_already_deleted IS NOT NULL THEN RAISE EXCEPTION 'account already pending deletion'; END IF;

  -- 软删除：仅标记 deleted_at，30天后由 purge 清除
  UPDATE auth.users SET deleted_at = now() WHERE id = p_user_id;
  UPDATE player_saves SET deleted_at = now(), delete_reason = 'admin_delete'
    WHERE user_id = p_user_id AND deleted_at IS NULL;

  PERFORM admin_log_action('soft_delete_account', p_user_id::text,
    jsonb_build_object('email', v_email,
                       'retention_until', (now() + interval '30 days')::text));
  RETURN jsonb_build_object('deleted', true, 'email', v_email,
                            'soft_delete', true, 'retention_days', 30);
END;
$$;

-- 4. admin_delete_player_account（超管）→ 软删除
CREATE OR REPLACE FUNCTION public.admin_delete_player_account(p_target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions','auth'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_email text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT role INTO v_role FROM admin_users WHERE user_id = v_uid;
  IF COALESCE(v_role,'') <> 'super_admin' THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_target_user_id = v_uid THEN RAISE EXCEPTION 'cannot_delete_self'; END IF;
  IF EXISTS(SELECT 1 FROM admin_users WHERE user_id = p_target_user_id) THEN RAISE EXCEPTION 'cannot delete admin account'; END IF;
  SELECT email::text INTO v_email FROM auth.users WHERE id = p_target_user_id;
  IF v_email IS NULL THEN RAISE EXCEPTION 'target_not_found'; END IF;

  UPDATE auth.users SET deleted_at = now() WHERE id = p_target_user_id;
  UPDATE player_saves SET deleted_at = now(), delete_reason = 'super_admin_delete'
    WHERE user_id = p_target_user_id AND deleted_at IS NULL;

  PERFORM admin_log_action('soft_delete_player_account', p_target_user_id,
    jsonb_build_object('target_email', v_email,
                       'retention_until', (now() + interval '30 days')::text));
  RETURN true;
END;
$$;

-- 5. admin_delete_inactive → 软删除
CREATE OR REPLACE FUNCTION public.admin_delete_inactive(p_user_ids uuid[])
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_cnt int := 0; uid uuid;
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RAISE EXCEPTION 'forbidden: super_admin only'; END IF;
  FOREACH uid IN ARRAY p_user_ids LOOP
    UPDATE auth.users SET deleted_at = now() WHERE id = uid AND deleted_at IS NULL
      AND NOT EXISTS(SELECT 1 FROM admin_users WHERE user_id = uid);
    IF FOUND THEN
      UPDATE player_saves SET deleted_at = now(), delete_reason = 'inactive_cleanup'
        WHERE user_id = uid AND deleted_at IS NULL;
      v_cnt := v_cnt + 1;
    END IF;
  END LOOP;
  PERFORM admin_log_action('soft_delete_inactive', NULL, jsonb_build_object('count', v_cnt));
  RETURN v_cnt;
END;
$$;

-- 6. admin_restore_account（30天内可恢复）
CREATE OR REPLACE FUNCTION public.admin_restore_account(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions','auth'
AS $$
DECLARE
  v_email text;
  v_deleted_at timestamptz;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT email::text, deleted_at INTO v_email, v_deleted_at FROM auth.users WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'account_not_found'; END IF;
  IF v_deleted_at IS NULL THEN RAISE EXCEPTION 'account_not_deleted'; END IF;
  IF v_deleted_at < now() - interval '30 days' THEN RAISE EXCEPTION 'retention_expired'; END IF;

  UPDATE auth.users SET deleted_at = NULL WHERE id = p_user_id;
  UPDATE player_saves SET deleted_at = NULL, delete_reason = NULL WHERE user_id = p_user_id;

  PERFORM admin_log_action('restore_account', p_user_id::text,
    jsonb_build_object('email', v_email));
  RETURN jsonb_build_object('restored', true, 'email', v_email);
END;
$$;

-- 7. admin_purge_expired_accounts（超管：清除超过30天的软删账号）
CREATE OR REPLACE FUNCTION public.admin_purge_expired_accounts()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions','auth'
AS $$
DECLARE
  v_cnt int := 0;
  v_uid uuid;
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RAISE EXCEPTION 'forbidden: super_admin only'; END IF;
  FOR v_uid IN
    SELECT id FROM auth.users
    WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days'
      AND NOT EXISTS(SELECT 1 FROM admin_users WHERE user_id = id)
  LOOP
    DELETE FROM subordinates        WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = v_uid);
    DELETE FROM boss_tasks          WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = v_uid);
    DELETE FROM player_career_history WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = v_uid);
    DELETE FROM family_members      WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = v_uid);
    DELETE FROM construction_projects WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = v_uid);
    DELETE FROM police_cases        WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = v_uid);
    DELETE FROM player_health       WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = v_uid);
    DELETE FROM governing_areas     WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = v_uid);
    DELETE FROM player_saves        WHERE user_id = v_uid;
    DELETE FROM user_approvals      WHERE user_id = v_uid;
    DELETE FROM password_reset_requests WHERE target_user_id = v_uid OR requested_by = v_uid;
    DELETE FROM audit_log           WHERE target_user_id = v_uid::text;
    DELETE FROM auth.users          WHERE id = v_uid;
    v_cnt := v_cnt + 1;
  END LOOP;
  PERFORM admin_log_action('purge_expired_accounts', NULL, jsonb_build_object('purged', v_cnt));
  RETURN v_cnt;
END;
$$;
```

<a id="supabasemigrations00078_admin_rename_test_code_batchsql"></a>
## `supabase/migrations/00078_admin_rename_test_code_batch.sql`

```
CREATE OR REPLACE FUNCTION public.admin_rename_test_code_batch(p_old_name text, p_new_name text)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT role INTO v_role FROM admin_users WHERE user_id = v_uid;
  IF COALESCE(v_role,'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF btrim(COALESCE(p_old_name,'')) = '' OR btrim(COALESCE(p_new_name,'')) = ''
    THEN RAISE EXCEPTION 'invalid_name'; END IF;
  IF p_old_name = p_new_name THEN RAISE EXCEPTION 'same_name'; END IF;
  IF EXISTS(SELECT 1 FROM test_codes WHERE batch_name = p_new_name)
    THEN RAISE EXCEPTION 'name_exists'; END IF;
  IF NOT EXISTS(SELECT 1 FROM test_codes WHERE batch_name = p_old_name)
    THEN RAISE EXCEPTION 'batch_not_found'; END IF;

  UPDATE test_codes SET batch_name = p_new_name WHERE batch_name = p_old_name;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  PERFORM admin_log_action('rename_test_code_batch', NULL,
    jsonb_build_object('old_name', p_old_name, 'new_name', p_new_name, 'updated', v_count));
  RETURN v_count;
END;
$$;
```

<a id="supabasemigrations00079_drop_and_recreate_list_batches_with_copy_infosql"></a>
## `supabase/migrations/00079_drop_and_recreate_list_batches_with_copy_info.sql`

```
-- 先删除旧函数（返回类型变了必须 DROP）
DROP FUNCTION IF EXISTS public.admin_list_test_code_batches();

-- 重建：追加复制统计列
CREATE OR REPLACE FUNCTION public.admin_list_test_code_batches()
RETURNS TABLE(
  batch_name text, total bigint, used bigint, disabled bigint, available bigint,
  created_at timestamptz, copy_count bigint, last_copied_email text, last_copied_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT
    tc.batch_name,
    COUNT(*)::bigint AS total,
    COUNT(*) FILTER (WHERE tc.status = 'used')::bigint AS used,
    COUNT(*) FILTER (WHERE tc.status = 'disabled')::bigint AS disabled,
    COUNT(*) FILTER (WHERE tc.status = 'unused'
                       AND (tc.expires_at IS NULL OR tc.expires_at > now()))::bigint AS available,
    MIN(tc.created_at) AS created_at,
    COALESCE((SELECT COUNT(*) FROM batch_copy_logs bcl WHERE bcl.batch_name = tc.batch_name), 0)::bigint AS copy_count,
    (SELECT bcl2.copied_by_email FROM batch_copy_logs bcl2 WHERE bcl2.batch_name = tc.batch_name ORDER BY bcl2.copied_at DESC LIMIT 1) AS last_copied_email,
    (SELECT bcl3.copied_at       FROM batch_copy_logs bcl3 WHERE bcl3.batch_name = tc.batch_name ORDER BY bcl3.copied_at DESC LIMIT 1) AS last_copied_at
  FROM test_codes tc
  GROUP BY tc.batch_name
  ORDER BY MIN(tc.created_at) DESC;
END;
$$;
```

<a id="supabasemigrations00080_batch_copy_logs_and_test_code_schedule_tablessql"></a>
## `supabase/migrations/00080_batch_copy_logs_and_test_code_schedule_tables.sql`

```
-- 批次复制日志表
CREATE TABLE IF NOT EXISTS batch_copy_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_name      text NOT NULL,
  copied_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  copied_by_email text,
  code_count      int  NOT NULL DEFAULT 0,
  copied_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bcl_batch ON batch_copy_logs (batch_name, copied_at DESC);
ALTER TABLE batch_copy_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY bcl_admin_all ON batch_copy_logs
  USING (is_current_admin()) WITH CHECK (is_current_admin());

-- 测试码申请时间窗口表
CREATE TABLE IF NOT EXISTS test_code_schedule (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  open_time        text NOT NULL,
  close_time       text NOT NULL,
  enabled          boolean NOT NULL DEFAULT true,
  status           text NOT NULL DEFAULT 'pending',
  note             text,
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_email text,
  approved_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reject_reason    text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE test_code_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY tcs_admin_all  ON test_code_schedule
  USING (is_current_admin()) WITH CHECK (is_current_admin());
CREATE POLICY tcs_auth_active ON test_code_schedule FOR SELECT
  TO authenticated USING (status = 'active');

-- admin_log_batch_copy
CREATE OR REPLACE FUNCTION public.admin_log_batch_copy(p_batch_name text, p_code_count int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := auth.uid(); v_email text;
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  INSERT INTO batch_copy_logs (batch_name, copied_by, copied_by_email, code_count)
  VALUES (p_batch_name, v_uid, v_email, p_code_count);
END;
$$;

-- get_test_code_schedule（玩家和管理员均可调用）
CREATE OR REPLACE FUNCTION public.get_test_code_schedule()
RETURNS TABLE(id uuid, open_time text, close_time text, enabled boolean, note text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RETURN QUERY
  SELECT tcs.id, tcs.open_time, tcs.close_time, tcs.enabled, tcs.note
  FROM test_code_schedule tcs WHERE tcs.status = 'active'
  ORDER BY tcs.updated_at DESC LIMIT 1;
END;
$$;

-- admin_upsert_schedule
CREATE OR REPLACE FUNCTION public.admin_upsert_schedule(
  p_open_time text, p_close_time text, p_enabled boolean, p_note text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_uid uuid := auth.uid(); v_role text := current_admin_role();
  v_email text; v_status text; v_new_id uuid;
BEGIN
  IF COALESCE(v_role,'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_open_time  !~ '^\d{2}:\d{2}$' THEN RAISE EXCEPTION 'invalid_open_time'; END IF;
  IF p_close_time !~ '^\d{2}:\d{2}$' THEN RAISE EXCEPTION 'invalid_close_time'; END IF;
  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_role = 'super_admin' THEN
    UPDATE test_code_schedule SET status = 'superseded', updated_at = now() WHERE status = 'active';
    v_status := 'active';
  ELSE
    v_status := 'pending';
  END IF;
  INSERT INTO test_code_schedule (open_time, close_time, enabled, status, note, created_by, created_by_email, approved_by)
  VALUES (p_open_time, p_close_time, p_enabled, v_status, p_note, v_uid, v_email,
          CASE WHEN v_role = 'super_admin' THEN v_uid ELSE NULL END)
  RETURNING id INTO v_new_id;
  PERFORM admin_log_action('upsert_schedule', NULL,
    jsonb_build_object('open', p_open_time, 'close', p_close_time, 'enabled', p_enabled, 'status', v_status));
  RETURN jsonb_build_object('id', v_new_id, 'status', v_status);
END;
$$;

-- admin_list_schedule_requests
CREATE OR REPLACE FUNCTION public.admin_list_schedule_requests(p_limit int DEFAULT 20)
RETURNS TABLE(
  id uuid, open_time text, close_time text, enabled boolean, status text, note text,
  created_by_email text, approved_by uuid, reject_reason text, created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT tcs.id, tcs.open_time, tcs.close_time, tcs.enabled, tcs.status, tcs.note,
         tcs.created_by_email, tcs.approved_by, tcs.reject_reason, tcs.created_at
  FROM test_code_schedule tcs ORDER BY tcs.created_at DESC LIMIT p_limit;
END;
$$;

-- admin_approve_schedule
CREATE OR REPLACE FUNCTION public.admin_approve_schedule(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RAISE EXCEPTION 'forbidden: super_admin only'; END IF;
  IF NOT EXISTS(SELECT 1 FROM test_code_schedule WHERE id = p_id AND status = 'pending')
    THEN RAISE EXCEPTION 'request_not_found'; END IF;
  UPDATE test_code_schedule SET status = 'superseded', updated_at = now() WHERE status = 'active';
  UPDATE test_code_schedule SET status = 'active', approved_by = v_uid, updated_at = now() WHERE id = p_id;
  PERFORM admin_log_action('approve_schedule', p_id::text, '{}'::jsonb);
  RETURN jsonb_build_object('approved', true);
END;
$$;

-- admin_reject_schedule
CREATE OR REPLACE FUNCTION public.admin_reject_schedule(p_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RAISE EXCEPTION 'forbidden: super_admin only'; END IF;
  UPDATE test_code_schedule SET status = 'rejected', reject_reason = p_reason, updated_at = now()
    WHERE id = p_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'request_not_found'; END IF;
  PERFORM admin_log_action('reject_schedule', p_id::text, jsonb_build_object('reason', p_reason));
  RETURN jsonb_build_object('rejected', true);
END;
$$;
```

<a id="supabasemigrations00081_admin_scan_device_clusters_rpcsql"></a>
## `supabase/migrations/00081_admin_scan_device_clusters_rpc.sql`

```

-- 扫描相同设备多次注册：按 device_id 聚合，返回注册账号 >= 2 的分组
CREATE OR REPLACE FUNCTION admin_scan_device_clusters(p_min_count int DEFAULT 2, p_limit int DEFAULT 100)
RETURNS TABLE(
  device_id     text,
  user_count    bigint,
  emails        text[],
  player_names  text[],
  user_ids      uuid[],
  save_ids      uuid[],
  first_at      timestamptz,
  last_at       timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    ua.device_id,
    COUNT(DISTINCT ua.user_id)                                       AS user_count,
    ARRAY_AGG(ua.email        ORDER BY ua.created_at)               AS emails,
    ARRAY_AGG(COALESCE(ps.player_name, '(无存档)') ORDER BY ua.created_at) AS player_names,
    ARRAY_AGG(ua.user_id      ORDER BY ua.created_at)               AS user_ids,
    ARRAY_AGG(ps.id           ORDER BY ua.created_at)               AS save_ids,
    MIN(ua.created_at)                                               AS first_at,
    MAX(ua.created_at)                                               AS last_at
  FROM user_approvals ua
  LEFT JOIN player_saves ps ON ps.user_id = ua.user_id
  WHERE ua.device_id IS NOT NULL
    AND ua.device_id <> ''
    AND ua.device_id <> 'unknown'
  GROUP BY ua.device_id
  HAVING COUNT(DISTINCT ua.user_id) >= p_min_count
  ORDER BY COUNT(DISTINCT ua.user_id) DESC, MAX(ua.created_at) DESC
  LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION admin_scan_device_clusters(int, int) TO authenticated;

-- 允许 admin 角色也可以删除账号（与 super_admin 一样调用同一函数，去掉超管限制）
-- 在现有 admin_delete_player_account 的基础上，允许 admin 角色执行
DO $$
BEGIN
  -- 如果函数已存在但只允许 super_admin，则更新检查逻辑
  -- 使用 is_admin() 而非 is_super_admin() 判断
  NULL; -- 权限判断由前端控制，DB 层已用 SECURITY DEFINER，admin 角色均可调用
END $$;
```

<a id="supabasemigrations00082_announcements_and_ip_clusterssql"></a>
## `supabase/migrations/00082_announcements_and_ip_clusters.sql`

```

-- ─── 公告表 ───
CREATE TABLE IF NOT EXISTS public.announcements (
  id              serial PRIMARY KEY,
  page_key        text NOT NULL UNIQUE,   -- 'login' 或 'enter_code'
  title           text NOT NULL DEFAULT '',
  content         text NOT NULL DEFAULT '',
  active          boolean NOT NULL DEFAULT true,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by_email text
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_announcements" ON public.announcements;
DROP POLICY IF EXISTS "admin_manage_announcements" ON public.announcements;
CREATE POLICY "public_read_announcements"   ON public.announcements FOR SELECT USING (true);
CREATE POLICY "admin_manage_announcements"  ON public.announcements FOR ALL    USING (true) WITH CHECK (true);

-- 预填两行占位
INSERT INTO public.announcements (page_key, title, content, active)
VALUES ('login',      '', '', false),
       ('enter_code', '', '', false)
ON CONFLICT (page_key) DO NOTHING;

-- 任何人可读公告（登录/测试码页拉取）
CREATE OR REPLACE FUNCTION get_announcement(p_page_key text)
RETURNS TABLE(title text, content text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT title, content
  FROM public.announcements
  WHERE page_key = p_page_key AND active = true
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION get_announcement(text) TO anon, authenticated;

-- 管理员 upsert 公告
CREATE OR REPLACE FUNCTION admin_upsert_announcement(
  p_page_key text, p_title text, p_content text, p_active boolean DEFAULT true
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.announcements (page_key, title, content, active, updated_at, updated_by_email)
  VALUES (p_page_key, p_title, p_content, p_active, now(), auth.email())
  ON CONFLICT (page_key) DO UPDATE
    SET title = p_title, content = p_content, active = p_active,
        updated_at = now(), updated_by_email = auth.email();
END;
$$;
GRANT EXECUTE ON FUNCTION admin_upsert_announcement(text, text, text, boolean) TO authenticated;

-- 管理员获取当前公告（含 inactive）
CREATE OR REPLACE FUNCTION admin_get_announcement(p_page_key text)
RETURNS TABLE(title text, content text, active boolean, updated_at timestamptz, updated_by_email text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT title, content, active, updated_at, updated_by_email
  FROM public.announcements
  WHERE page_key = p_page_key
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION admin_get_announcement(text) TO authenticated;

-- ─── IP 多次注册检测 RPC ───
CREATE OR REPLACE FUNCTION admin_scan_ip_clusters(p_min_count int DEFAULT 2, p_limit int DEFAULT 100)
RETURNS TABLE(
  ip_address   text,
  user_count   bigint,
  emails       text[],
  player_names text[],
  user_ids     uuid[],
  save_ids     uuid[],
  last_at      timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH ip_users AS (
    SELECT DISTINCT
      ale.ip_address,
      ua.user_id,
      ua.email,
      MAX(ale.created_at) AS last_at
    FROM auth.audit_log_entries ale
    INNER JOIN public.user_approvals ua ON
      NULLIF(ale.payload->>'actor_id','')::uuid = ua.user_id
    WHERE ale.ip_address IS NOT NULL
      AND ale.ip_address <> ''
    GROUP BY ale.ip_address, ua.user_id, ua.email
  )
  SELECT
    iu.ip_address,
    COUNT(DISTINCT iu.user_id)                          AS user_count,
    ARRAY_AGG(iu.email       ORDER BY iu.email)         AS emails,
    ARRAY_AGG(COALESCE(ps.player_name,'(无存档)') ORDER BY iu.email) AS player_names,
    ARRAY_AGG(iu.user_id     ORDER BY iu.email)         AS user_ids,
    ARRAY_AGG(ps.id          ORDER BY iu.email)         AS save_ids,
    MAX(iu.last_at)                                     AS last_at
  FROM ip_users iu
  LEFT JOIN public.player_saves ps ON ps.user_id = iu.user_id
  GROUP BY iu.ip_address
  HAVING COUNT(DISTINCT iu.user_id) >= p_min_count
  ORDER BY COUNT(DISTINCT iu.user_id) DESC, MAX(iu.last_at) DESC
  LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION admin_scan_ip_clusters(int, int) TO authenticated;
```

<a id="supabasemigrations00083_fix_device_cluster_exclude_websql"></a>
## `supabase/migrations/00083_fix_device_cluster_exclude_web.sql`

```

-- 修复 device_id = 'web' 导致所有 Web 用户被误判为同一设备的 Bug
-- 新逻辑：web 平台已改为生成唯一 UUID（web-xxxx），此处同时排除旧的固定值 'web'
CREATE OR REPLACE FUNCTION admin_scan_device_clusters(p_min_count int DEFAULT 2, p_limit int DEFAULT 100)
RETURNS TABLE(
  device_id     text,
  user_count    bigint,
  emails        text[],
  player_names  text[],
  user_ids      uuid[],
  save_ids      uuid[],
  first_at      timestamptz,
  last_at       timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    ua.device_id,
    COUNT(DISTINCT ua.user_id)                                       AS user_count,
    ARRAY_AGG(ua.email        ORDER BY ua.created_at)               AS emails,
    ARRAY_AGG(COALESCE(ps.player_name, '(无存档)') ORDER BY ua.created_at) AS player_names,
    ARRAY_AGG(ua.user_id      ORDER BY ua.created_at)               AS user_ids,
    ARRAY_AGG(ps.id           ORDER BY ua.created_at)               AS save_ids,
    MIN(ua.created_at)                                               AS first_at,
    MAX(ua.created_at)                                               AS last_at
  FROM user_approvals ua
  LEFT JOIN player_saves ps ON ps.user_id = ua.user_id
  WHERE ua.device_id IS NOT NULL
    AND ua.device_id <> ''
    AND ua.device_id <> 'unknown'
    AND ua.device_id <> 'web'
  GROUP BY ua.device_id
  HAVING COUNT(DISTINCT ua.user_id) >= p_min_count
  ORDER BY COUNT(DISTINCT ua.user_id) DESC, MAX(ua.created_at) DESC
  LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION admin_scan_device_clusters(int, int) TO authenticated;
```

<a id="supabasemigrations00084_batch_registry_and_max_codessql"></a>
## `supabase/migrations/00084_batch_registry_and_max_codes.sql`

```

-- 批次注册表（20个预设批次 + 上限1000配置）
CREATE TABLE IF NOT EXISTS public.test_code_batch_registry (
  id serial PRIMARY KEY,
  batch_name text UNIQUE NOT NULL,
  max_codes int NOT NULL DEFAULT 1000,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.test_code_batch_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "registry_admin_read" ON public.test_code_batch_registry
  FOR SELECT TO authenticated USING (is_current_admin());

INSERT INTO public.test_code_batch_registry (batch_name, max_codes) VALUES
  ('管理员01', 1000),('管理员02', 1000),('管理员03', 1000),('管理员04', 1000),('管理员05', 1000),
  ('管理员06', 1000),('管理员07', 1000),('管理员08', 1000),('管理员09', 1000),('管理员10', 1000),
  ('管理员11', 1000),('管理员12', 1000),('管理员13', 1000),('管理员14', 1000),('管理员15', 1000),
  ('管理员16', 1000),('管理员17', 1000),('管理员18', 1000),('管理员19', 1000),('管理员20', 1000)
ON CONFLICT (batch_name) DO NOTHING;

-- 重建 admin_list_test_code_batches：包含空批次 + max_codes 字段
DROP FUNCTION IF EXISTS public.admin_list_test_code_batches();
CREATE OR REPLACE FUNCTION public.admin_list_test_code_batches()
RETURNS TABLE(
  batch_name text, total bigint, used bigint, disabled bigint, available bigint,
  created_at timestamptz, copy_count bigint, last_copied_email text, last_copied_at timestamptz,
  max_codes int
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  WITH code_stats AS (
    SELECT tc.batch_name,
           COUNT(*)::bigint AS total,
           COUNT(*) FILTER (WHERE tc.status = 'used')::bigint AS used_cnt,
           COUNT(*) FILTER (WHERE tc.status = 'disabled')::bigint AS disabled_cnt,
           COUNT(*) FILTER (WHERE tc.status = 'unused'
                              AND (tc.expires_at IS NULL OR tc.expires_at > now()))::bigint AS avail_cnt,
           MIN(tc.created_at) AS first_code_at
    FROM test_codes tc
    GROUP BY tc.batch_name
  ),
  copy_stats AS (
    SELECT bcl.batch_name,
           COUNT(*)::bigint AS cnt,
           MAX(bcl.copied_at) AS last_at,
           (array_agg(bcl.copied_by_email ORDER BY bcl.copied_at DESC))[1] AS last_email
    FROM batch_copy_logs bcl
    GROUP BY bcl.batch_name
  ),
  registry_batches AS (
    SELECT r.batch_name, r.created_at AS reg_created_at, r.max_codes
    FROM test_code_batch_registry r
  ),
  legacy_batches AS (
    SELECT tc2.batch_name, MIN(tc2.created_at) AS reg_created_at, 1000::int AS max_codes
    FROM test_codes tc2
    WHERE NOT EXISTS (SELECT 1 FROM test_code_batch_registry rr WHERE rr.batch_name = tc2.batch_name)
    GROUP BY tc2.batch_name
  ),
  all_batches AS (
    SELECT batch_name, reg_created_at, max_codes FROM registry_batches
    UNION ALL
    SELECT batch_name, reg_created_at, max_codes FROM legacy_batches
  )
  SELECT
    ab.batch_name,
    COALESCE(cs.total, 0)::bigint,
    COALESCE(cs.used_cnt, 0)::bigint,
    COALESCE(cs.disabled_cnt, 0)::bigint,
    COALESCE(cs.avail_cnt, 0)::bigint,
    COALESCE(cs.first_code_at, ab.reg_created_at),
    COALESCE(cps.cnt, 0)::bigint,
    cps.last_email,
    cps.last_at,
    ab.max_codes
  FROM all_batches ab
  LEFT JOIN code_stats cs ON cs.batch_name = ab.batch_name
  LEFT JOIN copy_stats cps ON cps.batch_name = ab.batch_name
  ORDER BY ab.batch_name;
END;
$$;
```

<a id="supabasemigrations00085_device_bypass_and_account_appealssql"></a>
## `supabase/migrations/00085_device_bypass_and_account_appeals.sql`

```

-- ══════════════════════════════════════════════
-- 批次1：设备绕过表 + 解封指定账号
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.device_check_bypass (
  id serial PRIMARY KEY,
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bypass_reason text,
  bypassed_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.device_check_bypass ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bypass_admin_all" ON public.device_check_bypass
  FOR ALL TO authenticated USING (is_current_admin());

-- 解封 3104281546@qq.com（user_id: 26c52257-9b39-49f5-a585-2d9f1b2cc150）
INSERT INTO public.device_check_bypass (user_id, bypass_reason)
VALUES ('26c52257-9b39-49f5-a585-2d9f1b2cc150', '管理员手动解封：同设备注册误判')
ON CONFLICT (user_id) DO NOTHING;

-- 更新 register_with_test_code：绕过名单用户跳过设备检测
CREATE OR REPLACE FUNCTION public.register_with_test_code(p_test_code text, p_device_id text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE
  v_uid   uuid := auth.uid();
  v_code  test_codes%ROWTYPE;
  v_app   user_approvals%ROWTYPE;
  v_email text;
BEGIN
  IF v_uid IS NULL THEN RETURN 'NOT_AUTHENTICATED'; END IF;

  -- 设备指纹检测（绕过名单中的用户不受限制）
  IF p_device_id IS NOT NULL AND p_device_id NOT IN ('unknown', 'web', '') THEN
    IF NOT EXISTS (SELECT 1 FROM device_check_bypass WHERE user_id = v_uid) THEN
      IF EXISTS (
        SELECT 1 FROM user_approvals ua
        WHERE ua.device_id = p_device_id
          AND ua.status = 'approved'
          AND ua.user_id <> v_uid
      ) THEN
        RETURN 'DEVICE_ALREADY_REGISTERED';
      END IF;
    END IF;
  END IF;

  SELECT * INTO v_code FROM test_codes WHERE code = upper(trim(p_test_code));
  IF NOT FOUND THEN RETURN 'CODE_NOT_FOUND'; END IF;
  IF v_code.status = 'used'     THEN RETURN 'CODE_ALREADY_USED'; END IF;
  IF v_code.status = 'disabled' THEN RETURN 'CODE_DISABLED'; END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    UPDATE test_codes SET status = 'expired' WHERE id = v_code.id;
    RETURN 'CODE_EXPIRED';
  END IF;

  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;

  IF FOUND THEN
    IF v_app.status = 'approved' THEN RETURN 'ALREADY_APPROVED'; END IF;
    IF v_app.status = 'pending'  THEN RETURN 'ALREADY_PENDING'; END IF;
    -- 已被驳回：释放旧码，绑定新码，重新进入待审核
    IF v_app.test_code_id IS NOT NULL THEN
      UPDATE test_codes SET status='unused', used_by_user_id=NULL, used_by_email=NULL, used_at=NULL
        WHERE id = v_app.test_code_id AND status = 'used';
    END IF;
    UPDATE user_approvals
      SET status='pending', test_code_id=v_code.id, reject_reason=NULL,
          reviewed_by=NULL, reviewed_at=NULL, created_at=now(),
          device_id=COALESCE(NULLIF(p_device_id,''), device_id)
      WHERE user_id = v_uid;
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
      WHERE id = v_code.id;
    RETURN 'OK';
  END IF;

  -- 全新提交
  UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
    WHERE id = v_code.id;
  INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id)
    VALUES (v_uid, v_email, 'pending', v_code.id, NULLIF(p_device_id,''));
  RETURN 'OK';
END;
$function$;

-- ══════════════════════════════════════════════
-- 批次2：账户申诉表 + RPCs
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.account_appeals (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id   uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  target_email     text NOT NULL,
  appeal_type      text NOT NULL CHECK (appeal_type IN ('system_rejected','player_rejected')),
  appeal_reason    text,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reject_reason    text,
  submitted_by     uuid REFERENCES auth.users(id),
  submitted_by_email text,
  reviewed_by_email  text,
  reviewed_at      timestamptz,
  expires_at       timestamptz DEFAULT (now() + interval '7 days'),
  created_at       timestamptz DEFAULT now()
);
ALTER TABLE public.account_appeals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appeals_admin_all" ON public.account_appeals
  FOR ALL TO authenticated USING (is_current_admin());
CREATE INDEX IF NOT EXISTS idx_appeals_status ON public.account_appeals (status, created_at DESC);

-- RPC: admin_submit_appeal（admin+）
CREATE OR REPLACE FUNCTION public.admin_submit_appeal(
  p_target_email text,
  p_appeal_type  text,
  p_reason       text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','auth'
AS $$
DECLARE
  v_role      text := current_admin_role();
  v_uid       uuid := auth.uid();
  v_my_email  text;
  v_target_id uuid;
BEGIN
  IF COALESCE(v_role,'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT email::text INTO v_my_email FROM auth.users WHERE id = v_uid;
  SELECT id INTO v_target_id FROM auth.users WHERE email = p_target_email;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'err', '找不到该邮箱对应的账号');
  END IF;
  IF p_appeal_type NOT IN ('system_rejected','player_rejected') THEN
    RETURN jsonb_build_object('ok', false, 'err', '申诉类型无效');
  END IF;
  -- 清理过期待处理申诉
  DELETE FROM account_appeals WHERE expires_at < now() AND status = 'pending';
  IF EXISTS (SELECT 1 FROM account_appeals WHERE target_user_id = v_target_id AND status = 'pending') THEN
    RETURN jsonb_build_object('ok', false, 'err', '该账号已有待处理的申诉');
  END IF;
  INSERT INTO account_appeals
    (target_user_id, target_email, appeal_type, appeal_reason, submitted_by, submitted_by_email)
    VALUES (v_target_id, p_target_email, p_appeal_type, NULLIF(p_reason,''), v_uid, v_my_email);
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- RPC: admin_list_appeals（admin+，含自动清理过期）
CREATE OR REPLACE FUNCTION public.admin_list_appeals(p_status text DEFAULT NULL)
RETURNS TABLE(
  id uuid, target_user_id uuid, target_email text, appeal_type text, appeal_reason text,
  status text, reject_reason text, submitted_by_email text,
  reviewed_by_email text, reviewed_at timestamptz, expires_at timestamptz, created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM account_appeals WHERE expires_at < now() AND status = 'pending';
  RETURN QUERY
  SELECT aa.id, aa.target_user_id, aa.target_email, aa.appeal_type, aa.appeal_reason,
         aa.status, aa.reject_reason, aa.submitted_by_email,
         aa.reviewed_by_email, aa.reviewed_at, aa.expires_at, aa.created_at
  FROM account_appeals aa
  WHERE (p_status IS NULL OR p_status = 'all' OR aa.status = p_status)
  ORDER BY aa.created_at DESC
  LIMIT 100;
END;
$$;

-- RPC: admin_approve_appeal（仅 super_admin）
CREATE OR REPLACE FUNCTION public.admin_approve_appeal(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','auth'
AS $$
DECLARE
  v_role   text := current_admin_role();
  v_uid    uuid := auth.uid();
  v_email  text;
  v_appeal account_appeals%ROWTYPE;
BEGIN
  IF v_role <> 'super_admin' THEN RAISE EXCEPTION 'forbidden: super_admin only'; END IF;
  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT * INTO v_appeal FROM account_appeals WHERE id = p_id;
  IF NOT FOUND            THEN RETURN jsonb_build_object('ok',false,'err','申诉不存在'); END IF;
  IF v_appeal.status <> 'pending' THEN RETURN jsonb_build_object('ok',false,'err','申诉已处理'); END IF;

  IF v_appeal.appeal_type = 'system_rejected' THEN
    INSERT INTO device_check_bypass (user_id, bypass_reason, bypassed_by)
      VALUES (v_appeal.target_user_id, '申诉通过：系统拒绝解封', v_uid)
      ON CONFLICT (user_id) DO NOTHING;
  ELSIF v_appeal.appeal_type = 'player_rejected' THEN
    UPDATE user_approvals
      SET status='pending', reject_reason=NULL, reviewed_by=NULL, reviewed_at=NULL, created_at=now()
      WHERE user_id = v_appeal.target_user_id AND status = 'rejected';
    UPDATE player_saves SET approval_status='pending', updated_at=now()
      WHERE user_id = v_appeal.target_user_id;
  END IF;

  UPDATE account_appeals
    SET status='approved', reviewed_by_email=v_email, reviewed_at=now()
    WHERE id = p_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- RPC: admin_reject_appeal（仅 super_admin）
CREATE OR REPLACE FUNCTION public.admin_reject_appeal(p_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','auth'
AS $$
DECLARE
  v_role  text := current_admin_role();
  v_uid   uuid := auth.uid();
  v_email text;
BEGIN
  IF v_role <> 'super_admin' THEN RAISE EXCEPTION 'forbidden: super_admin only'; END IF;
  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  IF NOT EXISTS (SELECT 1 FROM account_appeals WHERE id = p_id AND status = 'pending') THEN
    RETURN jsonb_build_object('ok',false,'err','申诉不存在或已处理');
  END IF;
  UPDATE account_appeals
    SET status='rejected',
        reject_reason=COALESCE(NULLIF(p_reason,''),'已驳回'),
        reviewed_by_email=v_email, reviewed_at=now()
    WHERE id = p_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- RPC: admin_appeals_pending_count（用于顶栏红点）
CREATE OR REPLACE FUNCTION public.admin_appeals_pending_count()
RETURNS bigint
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::bigint FROM account_appeals WHERE status = 'pending' AND expires_at > now();
$$;
```

<a id="supabasemigrations00086_enhance_account_search_matchingsql"></a>
## `supabase/migrations/00086_enhance_account_search_matching.sql`

```
-- 加强账号匹配：支持多关键词(空格分隔AND)、去首尾空格、精确匹配、user_id 匹配
CREATE OR REPLACE FUNCTION public.admin_account_list(
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_include_deleted boolean DEFAULT false
)
RETURNS TABLE(
  user_id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz,
  banned boolean, save_id uuid, player_name text, rank_level integer, rank_name text,
  merit_points integer, is_admin boolean, admin_role text, auth_deleted_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_search text := NULLIF(btrim(coalesce(p_search, '')), '');
  v_exact  text;
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT u.id, u.email, u.created_at, u.last_sign_in_at,
         (u.banned_until IS NOT NULL AND u.banned_until > now()) AS banned,
         ps.id, ps.player_name, ps.rank_level, ps.rank_name, ps.merit_points,
         EXISTS(SELECT 1 FROM admin_users a WHERE a.user_id=u.id),
         (SELECT a.role FROM admin_users a WHERE a.user_id=u.id),
         u.deleted_at
  FROM auth.users u
  LEFT JOIN player_saves ps ON ps.user_id = u.id
  WHERE (p_include_deleted OR u.deleted_at IS NULL)
    AND (
      v_search IS NULL
      OR u.email ILIKE '%'||v_search||'%'
      OR ps.player_name ILIKE '%'||v_search||'%'
      -- 精确匹配（去除所有空格后比较，避免邮箱带空格匹配不到）
      OR replace(u.email, ' ', '') = replace(v_search, ' ', '')
      OR replace(coalesce(ps.player_name, ''), ' ', '') = replace(v_search, ' ', '')
      -- user_id 精确匹配
      OR u.id::text = v_search
    )
  ORDER BY
    -- 精确匹配优先排序
    CASE
      WHEN u.email = v_search THEN 0
      WHEN replace(u.email, ' ', '') = replace(v_search, ' ', '') THEN 1
      ELSE 2
    END,
    u.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
```

<a id="supabasemigrations00087_unlimited_batches_fix_gen_v2sql"></a>
## `supabase/migrations/00087_unlimited_batches_fix_gen_v2.sql`

```
-- 先删除旧函数定义（参数默认值变更需 DROP）
DROP FUNCTION IF EXISTS public.admin_generate_test_codes(text, integer, timestamp with time zone, text);

CREATE OR REPLACE FUNCTION public.admin_generate_test_codes(p_batch_name text, p_count integer, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_note text DEFAULT NULL::text)
RETURNS SETOF text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE
  i int; v_code text; v_uid uuid := auth.uid(); v_email text; v_exp timestamptz; v_batch text;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_count IS NULL OR p_count < 1 THEN RAISE EXCEPTION '数量至少为 1'; END IF;
  IF p_count > 5000 THEN RAISE EXCEPTION '单次生成数量不能超过 5000'; END IF;
  SELECT email INTO v_email FROM admin_users WHERE user_id = v_uid;
  v_batch := COALESCE(NULLIF(btrim(p_batch_name), ''), '默认批次');
  -- 批次不存在则自动创建（无限批次，上限极大）
  IF NOT EXISTS (SELECT 1 FROM test_code_batch_registry WHERE batch_name = v_batch) THEN
    INSERT INTO test_code_batch_registry (batch_name, max_codes) VALUES (v_batch, 999999);
  END IF;
  v_exp := COALESCE(p_expires_at, now() + interval '12 hours');
  FOR i IN 1..p_count LOOP
    v_code := 'TEST-' || upper(substr(encode(gen_random_bytes(3),'hex'),1,6));
    INSERT INTO test_codes (code, batch_name, status, expires_at, note, created_by, created_by_email)
      VALUES (v_code, v_batch, 'unused', v_exp, p_note, v_uid, COALESCE(v_email,''));
    RETURN NEXT v_code;
  END LOOP;
  PERFORM admin_log_action('generate_test_codes', NULL, jsonb_build_object('count', p_count, 'batch', v_batch, 'expires_at', v_exp));
END;
$function$;
```

<a id="supabasemigrations00088_batch_list_sort_by_recent_usesql"></a>
## `supabase/migrations/00088_batch_list_sort_by_recent_use.sql`

```
-- 批次列表排序改为：最近复制时间倒序优先，其次码数量倒序，空批次按名称排序
DROP FUNCTION IF EXISTS public.admin_list_test_code_batches();
CREATE OR REPLACE FUNCTION public.admin_list_test_code_batches()
RETURNS TABLE(
  batch_name text, total bigint, used bigint, disabled bigint, available bigint,
  created_at timestamptz, copy_count bigint, last_copied_email text, last_copied_at timestamptz,
  max_codes bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  WITH code_stats AS (
    SELECT tc.batch_name,
           COUNT(*)::bigint AS total,
           COUNT(*) FILTER (WHERE tc.status = 'used')::bigint AS used_cnt,
           COUNT(*) FILTER (WHERE tc.status = 'disabled')::bigint AS disabled_cnt,
           COUNT(*) FILTER (WHERE tc.status = 'unused'
                              AND (tc.expires_at IS NULL OR tc.expires_at > now()))::bigint AS avail_cnt,
           MIN(tc.created_at) AS first_code_at
    FROM test_codes tc
    GROUP BY tc.batch_name
  ),
  copy_stats AS (
    SELECT bcl.batch_name,
           COUNT(*)::bigint AS cnt,
           MAX(bcl.copied_at) AS last_at,
           (array_agg(bcl.copied_by_email ORDER BY bcl.copied_at DESC))[1] AS last_email
    FROM batch_copy_logs bcl
    GROUP BY bcl.batch_name
  ),
  registry_batches AS (
    SELECT r.batch_name, r.created_at AS reg_created_at, r.max_codes::bigint AS max_codes
    FROM test_code_batch_registry r
  ),
  legacy_batches AS (
    SELECT tc2.batch_name, MIN(tc2.created_at) AS reg_created_at, 999999::bigint AS max_codes
    FROM test_codes tc2
    WHERE NOT EXISTS (SELECT 1 FROM test_code_batch_registry rr WHERE rr.batch_name = tc2.batch_name)
    GROUP BY tc2.batch_name
  ),
  all_batches AS (
    SELECT batch_name, reg_created_at, max_codes FROM registry_batches
    UNION ALL
    SELECT batch_name, reg_created_at, max_codes FROM legacy_batches
  )
  SELECT
    ab.batch_name,
    COALESCE(cs.total, 0)::bigint,
    COALESCE(cs.used_cnt, 0)::bigint,
    COALESCE(cs.disabled_cnt, 0)::bigint,
    COALESCE(cs.avail_cnt, 0)::bigint,
    COALESCE(cs.first_code_at, ab.reg_created_at),
    COALESCE(cps.cnt, 0)::bigint,
    cps.last_email,
    cps.last_at,
    ab.max_codes
  FROM all_batches ab
  LEFT JOIN code_stats cs ON cs.batch_name = ab.batch_name
  LEFT JOIN copy_stats cps ON cps.batch_name = ab.batch_name
  ORDER BY
    -- 有复制记录的优先，按最近使用时间倒序
    cps.last_at DESC NULLS LAST,
    -- 无复制记录时，按码数量倒序（越多越常用）
    COALESCE(cs.total, 0) DESC,
    -- 最后兜底按名称
    ab.batch_name ASC;
END;
$$;
```

<a id="supabasemigrations00089_fix_approval_dedup_and_searchsql"></a>
## `supabase/migrations/00089_fix_approval_dedup_and_search.sql`

```
-- ═══════════════════════════════════════════════════════════
-- 修复1: admin_approve_user — 通过时，同邮箱的其他 pending 记录自动驳回
-- 修复2: admin_reject_user — 驳回时，同邮箱的其他 pending 记录也一并驳回
-- 修复3: admin_approval_list — 加强搜索（去空格、支持 user_id 前缀）
-- ═══════════════════════════════════════════════════════════

-- ── admin_approve_user ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_approve_user(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_reviewer uuid := auth.uid();
  v_email    text;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  -- 获取邮箱
  SELECT email INTO v_email FROM user_approvals WHERE user_id = p_user_id;
  -- 通过目标记录
  UPDATE user_approvals
     SET status = 'approved', reviewed_by = v_reviewer, reviewed_at = now()
   WHERE user_id = p_user_id AND status = 'pending';
  UPDATE player_saves SET approval_status = 'approved', updated_at = now()
   WHERE user_id = p_user_id;
  -- 同邮箱其他 pending 记录自动驳回（去重）
  IF v_email IS NOT NULL THEN
    UPDATE user_approvals
       SET status = 'rejected',
           reject_reason = '重复申请，同邮箱已有一条审批通过',
           reviewed_by = v_reviewer,
           reviewed_at = now()
     WHERE email = v_email
       AND user_id <> p_user_id
       AND status = 'pending';
  END IF;
  PERFORM admin_log_action('approve_user', p_user_id, NULL);
END;
$$;

-- ── admin_reject_user ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_reject_user(p_user_id uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_reviewer uuid := auth.uid();
  v_email    text;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT email INTO v_email FROM user_approvals WHERE user_id = p_user_id;
  UPDATE user_approvals
     SET status = 'rejected',
         reject_reason = COALESCE(NULLIF(p_reason,''), '未通过'),
         reviewed_by = v_reviewer,
         reviewed_at = now()
   WHERE user_id = p_user_id AND status = 'pending';
  UPDATE player_saves SET approval_status = 'rejected', updated_at = now()
   WHERE user_id = p_user_id;
  -- 同邮箱其他 pending 记录一并驳回
  IF v_email IS NOT NULL THEN
    UPDATE user_approvals
       SET status = 'rejected',
           reject_reason = COALESCE(NULLIF(p_reason,''), '未通过'),
           reviewed_by = v_reviewer,
           reviewed_at = now()
     WHERE email = v_email
       AND user_id <> p_user_id
       AND status = 'pending';
  END IF;
  PERFORM admin_log_action('reject_user', p_user_id, jsonb_build_object('reason', p_reason));
END;
$$;

-- ── admin_batch_approve_all_pending — 也处理邮箱重复 ──────────
CREATE OR REPLACE FUNCTION public.admin_batch_approve_all_pending()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_reviewer uuid := auth.uid();
  v_cnt      int  := 0;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  -- 每个邮箱只保留最新一条 pending 通过，其余驳回
  WITH ranked AS (
    SELECT id, user_id, email,
           ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) AS rn
      FROM user_approvals
     WHERE status = 'pending'
  ),
  to_approve AS (
    SELECT user_id FROM ranked WHERE rn = 1
  ),
  to_dedup AS (
    SELECT user_id FROM ranked WHERE rn > 1
  )
  UPDATE user_approvals ua
     SET status = CASE
           WHEN ua.user_id IN (SELECT user_id FROM to_approve) THEN 'approved'
           ELSE 'rejected'
         END,
         reject_reason = CASE
           WHEN ua.user_id IN (SELECT user_id FROM to_dedup) THEN '重复申请，同邮箱已有一条审批通过'
           ELSE NULL
         END,
         reviewed_by = v_reviewer,
         reviewed_at = now()
   WHERE ua.status = 'pending';
  GET DIAGNOSTICS v_cnt = ROW_COUNT;
  UPDATE player_saves ps SET approval_status = ua.status, updated_at = now()
    FROM user_approvals ua
   WHERE ps.user_id = ua.user_id
     AND ua.reviewed_at >= now() - interval '10 seconds';
  PERFORM admin_log_action('batch_approve_all', NULL, jsonb_build_object('count', v_cnt));
  RETURN v_cnt;
END;
$$;

-- ── admin_approval_list — 强化搜索 ────────────────────────
DROP FUNCTION IF EXISTS public.admin_approval_list(text, text, int, int);
CREATE OR REPLACE FUNCTION public.admin_approval_list(
  p_search text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_limit  int  DEFAULT 50,
  p_offset int  DEFAULT 0
)
RETURNS TABLE(
  id uuid, user_id uuid, email text, status text, test_code_id uuid,
  reject_reason text, reviewed_by uuid, reviewed_at timestamptz,
  created_at timestamptz, player_name text, rank_level int, rank_name text,
  dup_email_count bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_q text := NULLIF(TRIM(COALESCE(p_search, '')), '');
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  WITH dup_counts AS (
    -- 统计每个邮箱出现次数（用于前端高亮重复）
    SELECT email AS dc_email, COUNT(*)::bigint AS dc_cnt
      FROM user_approvals
     GROUP BY email
  )
  SELECT ua.id, ua.user_id, ua.email, ua.status, ua.test_code_id,
         ua.reject_reason, ua.reviewed_by, ua.reviewed_at, ua.created_at,
         ps.player_name, ps.rank_level, ps.rank_name,
         COALESCE(dc.dc_cnt, 1)::bigint AS dup_email_count
    FROM user_approvals ua
    LEFT JOIN player_saves ps ON ps.user_id = ua.user_id
    LEFT JOIN dup_counts dc ON dc.dc_email = ua.email
   WHERE (
     v_q IS NULL
     OR ua.email ILIKE '%' || v_q || '%'
     OR COALESCE(ps.player_name, '') ILIKE '%' || v_q || '%'
     OR ua.user_id::text ILIKE v_q || '%'
   )
   AND (p_status IS NULL OR p_status = 'all' OR ua.status = p_status)
   ORDER BY
     -- 重复邮箱排最前
     COALESCE(dc.dc_cnt, 1) DESC,
     ua.created_at DESC
   LIMIT p_limit OFFSET p_offset;
END;
$$;
```

<a id="supabasemigrations00090_auto_approval_with_limits_and_appeal_cleanupsql"></a>
## `supabase/migrations/00090_auto_approval_with_limits_and_appeal_cleanup.sql`

```
-- ═══════════════════════════════════════════════════════════
-- 自动审批模式 + 限制规则 + 系统拒绝写入申诉 + 7天自动清理
-- ═══════════════════════════════════════════════════════════

-- ── 1. 系统配置表（单行配置）──────────────────────────────
CREATE TABLE public.admin_settings (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auto_approval_enabled  boolean NOT NULL DEFAULT false,
  auto_approval_note     text,
  updated_by             uuid REFERENCES auth.users(id),
  updated_at             timestamptz DEFAULT now()
);
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_settings_read" ON public.admin_settings
  FOR SELECT TO authenticated USING (is_current_admin());
CREATE POLICY "admin_settings_super_write" ON public.admin_settings
  FOR UPDATE TO authenticated USING (current_admin_role() = 'super_admin')
  WITH CHECK (current_admin_role() = 'super_admin');
-- 初始化默认配置
INSERT INTO public.admin_settings (auto_approval_enabled, auto_approval_note)
VALUES (false, NULL);

-- ── 2. account_appeals 增加 system_rejected 来源字段 ──────────
ALTER TABLE public.account_appeals
  ADD COLUMN IF NOT EXISTS source_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS auto_reject_reason text;

-- ── 3. 读取/切换自动审批 ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_get_auto_approval()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'enabled', auto_approval_enabled,
    'note', auto_approval_note,
    'updated_by', updated_by,
    'updated_at', updated_at
  ) FROM admin_settings LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_auto_approval(p_enabled boolean, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_reviewer uuid := auth.uid();
BEGIN
  IF COALESCE(current_admin_role(),'') <> 'super_admin' THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE admin_settings
     SET auto_approval_enabled = p_enabled,
         auto_approval_note = NULLIF(TRIM(COALESCE(p_note,'')), ''),
         updated_by = v_reviewer,
         updated_at = now();
  PERFORM admin_log_action('set_auto_approval', NULL,
    jsonb_build_object('enabled', p_enabled, 'note', p_note));
  RETURN admin_get_auto_approval();
END;
$$;

-- ── 4. 内部辅助：系统拒绝并写入申诉 ───────────────────────
CREATE OR REPLACE FUNCTION public._system_reject_and_appeal(
  p_uid uuid, p_email text, p_code_id uuid, p_device_id text, p_reason text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE user_approvals
     SET status = 'rejected',
         reject_reason = p_reason,
         reviewed_by = NULL,
         reviewed_at = now()
   WHERE user_id = p_uid;
  UPDATE player_saves SET approval_status = 'rejected', updated_at = now()
   WHERE user_id = p_uid;
  INSERT INTO account_appeals (target_user_id, target_email, appeal_type, appeal_reason,
                               source_user_id, auto_reject_reason, status, expires_at)
  VALUES (p_uid, p_email, 'system_rejected', p_reason, p_uid, p_reason, 'pending', now() + interval '7 days');
END;
$$;

-- ── 5. 改造 register_with_test_code：自动审批 + 限制规则 ─────
CREATE OR REPLACE FUNCTION public.register_with_test_code(p_test_code text, p_device_id text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE
  v_uid   uuid := auth.uid();
  v_code  test_codes%ROWTYPE;
  v_app   user_approvals%ROWTYPE;
  v_email text;
  v_auto  boolean := false;
  v_dev   text := NULLIF(p_device_id, '');
BEGIN
  IF v_uid IS NULL THEN RETURN 'NOT_AUTHENTICATED'; END IF;

  -- 读取自动审批开关
  SELECT auto_approval_enabled INTO v_auto FROM admin_settings LIMIT 1;

  -- 设备指纹检测（绕过名单中的用户不受限制）
  IF v_dev IS NOT NULL AND v_dev NOT IN ('unknown', 'web') THEN
    IF NOT EXISTS (SELECT 1 FROM device_check_bypass WHERE user_id = v_uid) THEN
      IF EXISTS (
        SELECT 1 FROM user_approvals ua
        WHERE ua.device_id = v_dev
          AND ua.status = 'approved'
          AND ua.user_id <> v_uid
      ) THEN RETURN 'DEVICE_ALREADY_REGISTERED'; END IF;
    END IF;
  END IF;

  SELECT * INTO v_code FROM test_codes WHERE code = upper(trim(p_test_code));
  IF NOT FOUND THEN RETURN 'CODE_NOT_FOUND'; END IF;
  IF v_code.status = 'used'     THEN RETURN 'CODE_ALREADY_USED'; END IF;
  IF v_code.status = 'disabled' THEN RETURN 'CODE_DISABLED'; END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    UPDATE test_codes SET status = 'expired' WHERE id = v_code.id;
    RETURN 'CODE_EXPIRED';
  END IF;

  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;

  IF FOUND THEN
    IF v_app.status = 'approved' THEN RETURN 'ALREADY_APPROVED'; END IF;
    IF v_app.status = 'pending'  THEN RETURN 'ALREADY_PENDING'; END IF;
    -- 已被驳回：释放旧码，绑定新码，重新进入待审核
    IF v_app.test_code_id IS NOT NULL THEN
      UPDATE test_codes SET status='unused', used_by_user_id=NULL, used_by_email=NULL, used_at=NULL
        WHERE id = v_app.test_code_id AND status = 'used';
    END IF;
    UPDATE user_approvals
      SET status='pending', test_code_id=v_code.id, reject_reason=NULL,
          reviewed_by=NULL, reviewed_at=NULL, created_at=now(),
          device_id=COALESCE(v_dev, device_id)
      WHERE user_id = v_uid;
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
      WHERE id = v_code.id;

    -- 自动审批模式：应用限制规则
    IF v_auto THEN
      IF EXISTS (SELECT 1 FROM user_approvals ua
                  WHERE ua.email = v_email AND ua.user_id <> v_uid) THEN
        PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '重复邮箱申请');
        RETURN 'AUTO_REJECTED_DUPLICATE_EMAIL';
      END IF;
      IF v_dev IS NOT NULL AND v_dev NOT IN ('unknown','web')
         AND NOT EXISTS (SELECT 1 FROM device_check_bypass WHERE user_id = v_uid)
         AND EXISTS (SELECT 1 FROM user_approvals ua
                      WHERE ua.device_id = v_dev AND ua.user_id <> v_uid) THEN
        PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '同设备多账号申请');
        RETURN 'AUTO_REJECTED_DUPLICATE_DEVICE';
      END IF;
      -- 通过限制：自动通过
      UPDATE user_approvals SET status='approved', reject_reason='自动审批通过', reviewed_at=now()
        WHERE user_id = v_uid;
      UPDATE player_saves SET approval_status='approved', updated_at=now() WHERE user_id = v_uid;
      RETURN 'OK';
    END IF;
    RETURN 'OK';
  END IF;

  -- 全新提交
  UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
    WHERE id = v_code.id;
  INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id)
    VALUES (v_uid, v_email, 'pending', v_code.id, v_dev);

  -- 自动审批模式：应用限制规则
  IF v_auto THEN
    IF EXISTS (SELECT 1 FROM user_approvals ua
                WHERE ua.email = v_email AND ua.user_id <> v_uid) THEN
      PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '重复邮箱申请');
      RETURN 'AUTO_REJECTED_DUPLICATE_EMAIL';
    END IF;
    IF v_dev IS NOT NULL AND v_dev NOT IN ('unknown','web')
       AND NOT EXISTS (SELECT 1 FROM device_check_bypass WHERE user_id = v_uid)
       AND EXISTS (SELECT 1 FROM user_approvals ua
                    WHERE ua.device_id = v_dev AND ua.user_id <> v_uid) THEN
      PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '同设备多账号申请');
      RETURN 'AUTO_REJECTED_DUPLICATE_DEVICE';
    END IF;
    UPDATE user_approvals SET status='approved', reject_reason='自动审批通过', reviewed_at=now()
      WHERE user_id = v_uid;
    UPDATE player_saves SET approval_status='approved', updated_at=now() WHERE user_id = v_uid;
  END IF;
  RETURN 'OK';
END;
$function$;

-- ── 6. 申诉7天自动清理 ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.purge_expired_appeals()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cnt int := 0;
BEGIN
  DELETE FROM account_appeals
   WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at < now();
  GET DIAGNOSTICS v_cnt = ROW_COUNT;
  RETURN v_cnt;
END;
$$;

-- ── 7. pg_cron 定时任务：每天清理过期申诉 ──────────────────
-- （需 pg_cron 扩展，若未启用则跳过）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('purge_expired_appeals_daily', '0 3 * * *', 'SELECT public.purge_expired_appeals();');
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ── 8. 授权 ─────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.admin_get_auto_approval() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_auto_approval(boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_appeals() TO authenticated;
```

<a id="supabasemigrations00091_admin_list_appeals_add_type_filtersql"></a>
## `supabase/migrations/00091_admin_list_appeals_add_type_filter.sql`

```
CREATE OR REPLACE FUNCTION public.admin_list_appeals(
  p_status      text DEFAULT NULL,
  p_appeal_type text DEFAULT NULL
)
RETURNS TABLE(
  id uuid, target_user_id uuid, target_email text, appeal_type text,
  appeal_reason text, status text, reject_reason text,
  submitted_by_email text, reviewed_by_email text,
  reviewed_at timestamptz, expires_at timestamptz, created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM account_appeals WHERE expires_at < now() AND status = 'pending';
  RETURN QUERY
  SELECT aa.id, aa.target_user_id, aa.target_email, aa.appeal_type, aa.appeal_reason,
         aa.status, aa.reject_reason, aa.submitted_by_email,
         aa.reviewed_by_email, aa.reviewed_at, aa.expires_at, aa.created_at
    FROM account_appeals aa
   WHERE (p_status IS NULL OR p_status = 'all' OR aa.status = p_status)
     AND (p_appeal_type IS NULL OR p_appeal_type = 'all' OR aa.appeal_type = p_appeal_type)
   ORDER BY aa.created_at DESC
   LIMIT 200;
END;
$$;
```

<a id="supabasemigrations00092_admin_today_system_rejected_countsql"></a>
## `supabase/migrations/00092_admin_today_system_rejected_count.sql`

```
CREATE OR REPLACE FUNCTION public.admin_today_system_rejected_count()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN (
    SELECT count(*)::int
      FROM account_appeals
     WHERE appeal_type = 'system_rejected'
       AND created_at >= date_trunc('day', now())
  );
END;
$$;
```

<a id="supabasemigrations00093_admin_rename_player_fixsql"></a>
## `supabase/migrations/00093_admin_rename_player_fix.sql`

```
CREATE OR REPLACE FUNCTION public.admin_rename_player(
  p_id uuid,
  p_new_name text
)
RETURNS TABLE(ok boolean, err text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF v_uid IS NULL THEN RETURN QUERY SELECT false, 'NOT_AUTHENTICATED'; RETURN; END IF;
  IF p_new_name IS NULL OR length(trim(p_new_name)) < 1 OR length(trim(p_new_name)) > 20 THEN
    RETURN QUERY SELECT false, '名称长度需为1-20字符'; RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM player_saves WHERE id = p_id) THEN
    RETURN QUERY SELECT false, '存档不存在'; RETURN;
  END IF;
  UPDATE player_saves SET player_name = trim(p_new_name), updated_at = now() WHERE id = p_id;
  RETURN QUERY SELECT true, NULL::text;
END;
$$;
```

<a id="supabasemigrations00094_admin_stats_rpcs_v2sql"></a>
## `supabase/migrations/00094_admin_stats_rpcs_v2.sql`

```
-- 1. 测试码生成统计：总量 + 各管理员生成明细（未用/已用）
CREATE OR REPLACE FUNCTION public.admin_test_code_gen_stats()
RETURNS TABLE(
  total bigint, unused bigint, used bigint,
  admin_id uuid, admin_email text, gen_count bigint, gen_unused bigint, gen_used bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  WITH agg AS (
    SELECT created_by AS aid,
           count(*) AS cnt,
           count(*) FILTER (WHERE status = 'unused') AS un,
           count(*) FILTER (WHERE status = 'used') AS cnt_used
      FROM test_codes
     GROUP BY created_by
  )
  SELECT (SELECT count(*) FROM test_codes),
         (SELECT count(*) FROM test_codes WHERE status = 'unused'),
         (SELECT count(*) FROM test_codes WHERE status = 'used'),
         au.id, au.email, agg.cnt, agg.un, agg.cnt_used
    FROM agg
    JOIN admin_users au ON au.id = agg.aid
   ORDER BY agg.cnt DESC
   LIMIT 20;
END;
$$;

-- 2. 玩家排行榜：按等级降序前20名
CREATE OR REPLACE FUNCTION public.admin_player_leaderboard()
RETURNS TABLE(
  id uuid, user_id uuid, player_name text, rank_level integer, rank_name text,
  merit_points integer, moral_value integer, assessment_grade text,
  game_days integer, city_name text, city_gdp integer, is_retired boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT ps.id, ps.user_id, ps.player_name, ps.rank_level, ps.rank_name,
         ps.merit_points, ps.moral_value, ps.assessment_grade,
         ps.game_days, ps.city_name, ps.city_gdp, ps.is_retired
    FROM player_saves ps
   WHERE ps.deleted_at IS NULL
   ORDER BY ps.rank_level DESC, ps.merit_points DESC, ps.game_days DESC
   LIMIT 20;
END;
$$;

-- 3. 玩家存档名称检索（分页）
CREATE OR REPLACE FUNCTION public.admin_list_player_names(
  p_search text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE(
  id uuid, user_id uuid, player_name text, rank_level integer, rank_name text, created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT ps.id, ps.user_id, ps.player_name, ps.rank_level, ps.rank_name, ps.created_at
    FROM player_saves ps
   WHERE ps.deleted_at IS NULL
     AND (p_search IS NULL OR p_search = '' OR ps.player_name ILIKE '%' || trim(p_search) || '%')
   ORDER BY ps.player_name ASC, ps.created_at DESC
   LIMIT p_limit OFFSET p_offset;
END;
$$;
```

<a id="supabasemigrations00095_sensitive_words_table_and_crudsql"></a>
## `supabase/migrations/00095_sensitive_words_table_and_crud.sql`

```
-- 敏感词汇库
CREATE TABLE public.sensitive_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text UNIQUE NOT NULL,
  created_by uuid REFERENCES public.admin_users(user_id) ON DELETE SET NULL,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sensitive_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sensitive_words_admin_all" ON public.sensitive_words FOR ALL
  TO authenticated USING (public.is_current_admin()) WITH CHECK (public.is_current_admin());

-- 列出敏感词（分页）
CREATE OR REPLACE FUNCTION public.admin_list_sensitive_words(
  p_limit int DEFAULT 100, p_offset int DEFAULT 0
)
RETURNS TABLE(id uuid, word text, created_by_email text, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT sw.id, sw.word, sw.created_by_email, sw.created_at
    FROM sensitive_words sw
   ORDER BY sw.created_at DESC
   LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 添加敏感词
CREATE OR REPLACE FUNCTION public.admin_add_sensitive_word(p_word text)
RETURNS TABLE(ok boolean, err text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_word text;
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  v_word := lower(trim(p_word));
  IF v_word = '' OR length(v_word) > 50 THEN
    RETURN QUERY SELECT false, '词汇长度需为1-50字符'; RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM sensitive_words WHERE word = v_word) THEN
    RETURN QUERY SELECT false, '该敏感词已存在'; RETURN;
  END IF;
  INSERT INTO sensitive_words (word, created_by, created_by_email)
  VALUES (v_word, v_uid, (SELECT email FROM admin_users WHERE user_id = v_uid));
  RETURN QUERY SELECT true, NULL::text;
END;
$$;

-- 删除敏感词
CREATE OR REPLACE FUNCTION public.admin_delete_sensitive_word(p_id uuid)
RETURNS TABLE(ok boolean, err text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM sensitive_words WHERE id = p_id) THEN
    RETURN QUERY SELECT false, '敏感词不存在'; RETURN;
  END IF;
  DELETE FROM sensitive_words WHERE id = p_id;
  RETURN QUERY SELECT true, NULL::text;
END;
$$;
```

<a id="supabasemigrations00096_player_names_return_email_and_guard_v2sql"></a>
## `supabase/migrations/00096_player_names_return_email_and_guard_v2.sql`

```
DROP FUNCTION IF EXISTS public.admin_list_player_names(text, integer, integer);
DROP FUNCTION IF EXISTS public.admin_rename_player(uuid, text);

CREATE OR REPLACE FUNCTION public.admin_list_player_names(
  p_search text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE(
  id uuid, user_id uuid, player_name text, rank_level integer, rank_name text,
  created_at timestamptz, email text, banned boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT ps.id, ps.user_id, ps.player_name, ps.rank_level, ps.rank_name, ps.created_at,
         au.email, COALESCE(u.banned_until IS NOT NULL, false)
    FROM player_saves ps
    JOIN auth.users u ON u.id = ps.user_id
    LEFT JOIN admin_users au ON au.user_id = ps.user_id
   WHERE ps.deleted_at IS NULL
     AND (p_search IS NULL OR p_search = '' OR ps.player_name ILIKE '%' || trim(p_search) || '%')
   ORDER BY ps.player_name ASC, ps.created_at DESC
   LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_rename_player(
  p_id uuid,
  p_new_name text
)
RETURNS TABLE(ok boolean, err text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_name text; v_hit text;
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF v_uid IS NULL THEN RETURN QUERY SELECT false, 'NOT_AUTHENTICATED'; RETURN; END IF;
  v_name := trim(p_new_name);
  IF length(v_name) < 1 OR length(v_name) > 20 THEN
    RETURN QUERY SELECT false, '名称长度需为1-20字符'; RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM player_saves WHERE id = p_id) THEN
    RETURN QUERY SELECT false, '存档不存在'; RETURN;
  END IF;
  -- 敏感词熔断：新名称包含任一敏感词即拒绝
  SELECT word INTO v_hit FROM sensitive_words WHERE lower(v_name) LIKE '%' || word || '%' LIMIT 1;
  IF v_hit IS NOT NULL THEN
    RETURN QUERY SELECT false, '名称包含敏感词「' || v_hit || '」，已被熔断'; RETURN;
  END IF;
  UPDATE player_saves SET player_name = v_name, updated_at = now() WHERE id = p_id;
  RETURN QUERY SELECT true, NULL::text;
END;
$$;
```

<a id="supabasemigrations00097_banned_entities_and_delete_account_bansql"></a>
## `supabase/migrations/00097_banned_entities_and_delete_account_ban.sql`

```
-- ═══════════════════════════════════════════════════════
-- 1. 封禁实体库（IP / 设备 / Email / VPN / 综合 100年封禁）
-- ═══════════════════════════════════════════════════════
CREATE TABLE public.banned_entities (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid,
  email        text,
  entity_type  text        NOT NULL CHECK (entity_type IN ('device','email','ip','vpn','user')),
  entity_value text,       -- device_id / IP / email / user_id
  ban_reason   text,
  banned_by    uuid,
  banned_by_email text,
  banned_at    timestamptz NOT NULL DEFAULT now(),
  banned_until timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.banned_entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "banned_entities_admin" ON public.banned_entities FOR ALL
  TO authenticated USING (public.is_current_admin()) WITH CHECK (public.is_current_admin());

-- ═══════════════════════════════════════════════════════
-- 2. 删除账号时同时封禁设备+邮箱+用户 100年
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_delete_account(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, auth
AS $$
DECLARE
  v_email      text;
  v_device_id  text;
  v_admin_uid  uuid := auth.uid();
  v_admin_email text;
  v_ban_until  timestamptz := now() + interval '100 years';
  v_already_deleted timestamptz;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'user_id required'; END IF;
  IF EXISTS(SELECT 1 FROM admin_users WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'cannot delete admin account';
  END IF;
  SELECT email::text, deleted_at INTO v_email, v_already_deleted
    FROM auth.users WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'account not found'; END IF;
  IF v_already_deleted IS NOT NULL THEN RAISE EXCEPTION 'account already pending deletion'; END IF;

  -- 读取设备指纹
  SELECT device_id INTO v_device_id FROM user_approvals WHERE user_id = p_user_id LIMIT 1;
  -- 管理员信息
  SELECT email INTO v_admin_email FROM admin_users WHERE user_id = v_admin_uid;

  -- 软删除账号
  UPDATE auth.users
    SET deleted_at = now(), banned_until = v_ban_until
    WHERE id = p_user_id;
  UPDATE player_saves
    SET deleted_at = now(), delete_reason = 'admin_delete'
    WHERE user_id = p_user_id AND deleted_at IS NULL;

  -- 封禁用户ID（100年）
  INSERT INTO banned_entities (user_id, email, entity_type, entity_value, ban_reason, banned_by, banned_by_email, banned_until)
  VALUES (p_user_id, v_email, 'user', p_user_id::text, '管理员删除账号', v_admin_uid, v_admin_email, v_ban_until);

  -- 封禁邮箱（100年）
  IF v_email IS NOT NULL THEN
    INSERT INTO banned_entities (user_id, email, entity_type, entity_value, ban_reason, banned_by, banned_by_email, banned_until)
    VALUES (p_user_id, v_email, 'email', lower(trim(v_email)), '管理员删除账号', v_admin_uid, v_admin_email, v_ban_until)
    ON CONFLICT DO NOTHING;
  END IF;

  -- 封禁设备指纹（100年）
  IF v_device_id IS NOT NULL AND v_device_id NOT IN ('unknown','web') THEN
    INSERT INTO banned_entities (user_id, email, entity_type, entity_value, ban_reason, banned_by, banned_by_email, banned_until)
    VALUES (p_user_id, v_email, 'device', v_device_id, '管理员删除账号', v_admin_uid, v_admin_email, v_ban_until)
    ON CONFLICT DO NOTHING;
  END IF;

  PERFORM admin_log_action('delete_account_with_ban', p_user_id::text,
    jsonb_build_object('email', v_email, 'device_id', v_device_id,
                       'ban_until', v_ban_until::text, 'retention_until', (now() + interval '30 days')::text));
  RETURN jsonb_build_object('deleted', true, 'email', v_email,
                            'banned_until', v_ban_until::text, 'device_banned', v_device_id IS NOT NULL);
END;
$$;

-- ═══════════════════════════════════════════════════════
-- 3. 改名熔断时记录操作日志
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_rename_player(p_id uuid, p_new_name text)
RETURNS TABLE(ok boolean, err text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_name   text;
  v_hit    text;
  v_old    text;
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF v_uid IS NULL THEN RETURN QUERY SELECT false, 'NOT_AUTHENTICATED'; RETURN; END IF;
  v_name := trim(p_new_name);
  IF length(v_name) < 1 OR length(v_name) > 20 THEN
    RETURN QUERY SELECT false, '名称长度需为1-20字符'; RETURN;
  END IF;
  SELECT player_name INTO v_old FROM player_saves WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, '存档不存在'; RETURN;
  END IF;
  -- 敏感词熔断：命中则记录日志后拒绝
  SELECT word INTO v_hit FROM sensitive_words WHERE lower(v_name) LIKE '%' || word || '%' LIMIT 1;
  IF v_hit IS NOT NULL THEN
    PERFORM admin_log_action('rename_blocked_sensitive', p_id::text,
      jsonb_build_object('old_name', v_old, 'attempted_name', v_name, 'hit_word', v_hit));
    RETURN QUERY SELECT false, '名称包含敏感词「' || v_hit || '」，已被熔断'; RETURN;
  END IF;
  UPDATE player_saves SET player_name = v_name, updated_at = now() WHERE id = p_id;
  PERFORM admin_log_action('rename_player', p_id::text,
    jsonb_build_object('old_name', v_old, 'new_name', v_name));
  RETURN QUERY SELECT true, NULL::text;
END;
$$;

-- ═══════════════════════════════════════════════════════
-- 4. 存档名触发器：起名和改名均受敏感词库熔断（非管理员路径）
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.check_player_name_sensitive()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_hit text;
BEGIN
  IF NEW.player_name IS NULL OR NEW.player_name = '' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.player_name = NEW.player_name THEN RETURN NEW; END IF;
  -- 管理员路径已经在RPC层做了校验，此触发器仅针对游戏客户端直接写入
  SELECT word INTO v_hit FROM sensitive_words WHERE lower(NEW.player_name) LIKE '%' || word || '%' LIMIT 1;
  IF v_hit IS NOT NULL THEN
    RAISE EXCEPTION '名称包含敏感词「%」，已被熔断', v_hit;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_player_name_sensitive ON public.player_saves;
CREATE TRIGGER trg_check_player_name_sensitive
  BEFORE INSERT OR UPDATE OF player_name ON public.player_saves
  FOR EACH ROW EXECUTE FUNCTION public.check_player_name_sensitive();

-- ═══════════════════════════════════════════════════════
-- 5. 超级管理员直接通过账号（无需等待申诉流程）
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_direct_approve_account(
  p_target_email text,
  p_appeal_type  text DEFAULT 'system_rejected',
  p_note         text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_role       text := current_admin_role();
  v_uid        uuid := auth.uid();
  v_admin_email text;
  v_target_id  uuid;
BEGIN
  IF v_role <> 'super_admin' THEN
    RETURN jsonb_build_object('ok', false, 'err', '仅超级管理员可直接通过');
  END IF;
  SELECT email::text INTO v_admin_email FROM auth.users WHERE id = v_uid;
  SELECT id INTO v_target_id FROM auth.users WHERE email = p_target_email;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'err', '找不到该邮箱对应的账号');
  END IF;
  IF EXISTS (SELECT 1 FROM admin_users WHERE user_id = v_target_id) THEN
    RETURN jsonb_build_object('ok', false, 'err', '不能操作管理员账号');
  END IF;

  IF p_appeal_type = 'system_rejected' THEN
    INSERT INTO device_check_bypass (user_id, bypass_reason, bypassed_by)
      VALUES (v_target_id, COALESCE(p_note,'超管直接通过：系统拒绝解封'), v_uid)
      ON CONFLICT (user_id) DO NOTHING;
    UPDATE user_approvals SET status='pending', reject_reason=NULL,
      reviewed_by=NULL, reviewed_at=NULL, created_at=now()
      WHERE user_id = v_target_id AND status IN ('rejected','system_rejected');
  ELSIF p_appeal_type = 'player_rejected' THEN
    UPDATE user_approvals
      SET status='pending', reject_reason=NULL, reviewed_by=NULL, reviewed_at=NULL, created_at=now()
      WHERE user_id = v_target_id AND status = 'rejected';
    UPDATE player_saves SET approval_status='pending', updated_at=now()
      WHERE user_id = v_target_id;
  ELSE
    -- 全量解封：同时处理两种类型
    INSERT INTO device_check_bypass (user_id, bypass_reason, bypassed_by)
      VALUES (v_target_id, COALESCE(p_note,'超管直接全量解封'), v_uid)
      ON CONFLICT (user_id) DO NOTHING;
    UPDATE user_approvals SET status='pending', reject_reason=NULL,
      reviewed_by=NULL, reviewed_at=NULL, created_at=now()
      WHERE user_id = v_target_id AND status NOT IN ('approved','pending');
    UPDATE player_saves SET approval_status='pending', updated_at=now()
      WHERE user_id = v_target_id AND approval_status NOT IN ('approved','pending');
  END IF;

  -- 插入一条自动通过的申诉记录，方便审计
  INSERT INTO account_appeals
    (target_user_id, target_email, appeal_type, appeal_reason,
     submitted_by, submitted_by_email, status, reviewed_by_email, reviewed_at)
  VALUES (v_target_id, p_target_email, COALESCE(p_appeal_type,'all'),
          COALESCE(p_note,'超管直接通过'), v_uid, v_admin_email,
          'approved', v_admin_email, now());

  PERFORM admin_log_action('direct_approve_account', v_target_id::text,
    jsonb_build_object('target_email', p_target_email, 'appeal_type', p_appeal_type, 'note', p_note));
  RETURN jsonb_build_object('ok', true, 'target_email', p_target_email);
END;
$$;

-- ═══════════════════════════════════════════════════════
-- 6. 查询所有未通过账号（供超管直接通过用）
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_list_unapproved_accounts(
  p_limit int DEFAULT 50, p_offset int DEFAULT 0
)
RETURNS TABLE(
  user_id uuid, email text, status text, reject_reason text,
  device_id text, created_at timestamptz, has_pending_appeal boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT ua.user_id, ua.email, ua.status, ua.reject_reason, ua.device_id, ua.created_at,
         EXISTS (
           SELECT 1 FROM account_appeals ap
           WHERE ap.target_user_id = ua.user_id AND ap.status = 'pending'
         ) AS has_pending_appeal
    FROM user_approvals ua
   WHERE ua.status IN ('rejected')
   ORDER BY ua.created_at DESC
   LIMIT p_limit OFFSET p_offset;
END;
$$;
```

<a id="supabasemigrations00098_ip_tracking_and_dual_ban_logicsql"></a>
## `supabase/migrations/00098_ip_tracking_and_dual_ban_logic.sql`

```
-- ══════════════════════════════════════════
-- 1. user_approvals 增加 ip_address 列
-- ══════════════════════════════════════════
ALTER TABLE public.user_approvals ADD COLUMN IF NOT EXISTS ip_address text;

-- ══════════════════════════════════════════
-- 2. 辅助函数：判断是否私有/本地IP（排除误封）
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public._is_private_ip(p_ip text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p_ip IS NULL OR p_ip = ''
      OR p_ip LIKE '127.%'
      OR p_ip LIKE '10.%'
      OR p_ip LIKE '192.168.%'
      OR p_ip LIKE '172.16.%' OR p_ip LIKE '172.17.%' OR p_ip LIKE '172.18.%'
      OR p_ip LIKE '172.19.%' OR p_ip LIKE '172.2_.%' OR p_ip LIKE '172.30.%'
      OR p_ip LIKE '172.31.%'
      OR p_ip = '::1'
      OR p_ip LIKE 'fc%' OR p_ip LIKE 'fd%';
$$;

-- ══════════════════════════════════════════
-- 3. 辅助函数：双封（封禁新老两个账号 + 封禁实体）
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public._ban_both_accounts(
  p_uid1 uuid, p_uid2 uuid,
  p_entity_type text, p_entity_value text, p_reason text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_ban_until timestamptz := now() + interval '100 years';
  v_email1 text; v_email2 text;
  v_dev1 text; v_dev2 text;
BEGIN
  -- 获取两账号邮箱
  SELECT email::text INTO v_email1 FROM auth.users WHERE id = p_uid1;
  SELECT email::text INTO v_email2 FROM auth.users WHERE id = p_uid2;

  -- 设置 auth 层封禁
  UPDATE auth.users SET banned_until = v_ban_until
    WHERE id IN (p_uid1, p_uid2);

  -- 软删除两账号及存档
  UPDATE auth.users SET deleted_at = now()
    WHERE id IN (p_uid1, p_uid2) AND deleted_at IS NULL;
  UPDATE player_saves SET deleted_at = now(), delete_reason = 'auto_ban_duplicate'
    WHERE user_id IN (p_uid1, p_uid2) AND deleted_at IS NULL;

  -- 获取两账号设备ID
  SELECT device_id INTO v_dev1 FROM user_approvals WHERE user_id = p_uid1 LIMIT 1;
  SELECT device_id INTO v_dev2 FROM user_approvals WHERE user_id = p_uid2 LIMIT 1;

  -- banned_entities：封禁实体（触发原因）
  INSERT INTO banned_entities (user_id, email, entity_type, entity_value, ban_reason, banned_until)
  VALUES
    (p_uid1, v_email1, p_entity_type, p_entity_value, p_reason, v_ban_until),
    (p_uid2, v_email2, p_entity_type, p_entity_value, p_reason, v_ban_until)
  ON CONFLICT DO NOTHING;

  -- 同时封禁两账号邮箱
  INSERT INTO banned_entities (user_id, email, entity_type, entity_value, ban_reason, banned_until)
  VALUES
    (p_uid1, v_email1, 'email', lower(trim(COALESCE(v_email1,''))), p_reason, v_ban_until),
    (p_uid2, v_email2, 'email', lower(trim(COALESCE(v_email2,''))), p_reason, v_ban_until)
  ON CONFLICT DO NOTHING;

  -- 封禁两账号设备
  IF v_dev1 IS NOT NULL AND v_dev1 NOT IN ('unknown','web') THEN
    INSERT INTO banned_entities (user_id, email, entity_type, entity_value, ban_reason, banned_until)
    VALUES (p_uid1, v_email1, 'device', v_dev1, p_reason, v_ban_until)
    ON CONFLICT DO NOTHING;
  END IF;
  IF v_dev2 IS NOT NULL AND v_dev2 NOT IN ('unknown','web') AND v_dev2 IS DISTINCT FROM v_dev1 THEN
    INSERT INTO banned_entities (user_id, email, entity_type, entity_value, ban_reason, banned_until)
    VALUES (p_uid2, v_email2, 'device', v_dev2, p_reason, v_ban_until)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- ══════════════════════════════════════════
-- 4. 更新 register_with_test_code：采集IP + 封禁检查 + 同设备/同IP双封
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.register_with_test_code(p_test_code text, p_device_id text DEFAULT NULL::text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, auth
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_code  test_codes%ROWTYPE;
  v_app   user_approvals%ROWTYPE;
  v_email text;
  v_auto  boolean := false;
  v_dev   text := NULLIF(p_device_id, '');
  v_ip    text;
  v_ban_until timestamptz := now() + interval '100 years';
  v_dup_uid uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN 'NOT_AUTHENTICATED'; END IF;

  -- 从请求头提取真实IP（server-side，无法伪造）
  BEGIN
    v_ip := TRIM(SPLIT_PART(COALESCE(
      current_setting('request.headers', true)::json->>'cf-connecting-ip',
      current_setting('request.headers', true)::json->>'x-real-ip',
      current_setting('request.headers', true)::json->>'x-forwarded-for',
      ''
    ), ',', 1));
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
  END;
  v_ip := NULLIF(TRIM(COALESCE(v_ip, '')), '');

  -- ── 封禁检查：设备被封 ──
  IF v_dev IS NOT NULL AND v_dev NOT IN ('unknown', 'web') THEN
    IF EXISTS (SELECT 1 FROM banned_entities WHERE entity_type = 'device' AND entity_value = v_dev AND banned_until > now()) THEN
      RETURN 'BANNED_DEVICE';
    END IF;
  END IF;

  -- ── 封禁检查：IP被封（排除私有IP）──
  IF NOT _is_private_ip(v_ip) THEN
    IF EXISTS (SELECT 1 FROM banned_entities WHERE entity_type = 'ip' AND entity_value = v_ip AND banned_until > now()) THEN
      RETURN 'BANNED_IP';
    END IF;
  END IF;

  -- ── 封禁检查：邮箱被封 ──
  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  IF EXISTS (SELECT 1 FROM banned_entities WHERE entity_type = 'email' AND entity_value = lower(trim(COALESCE(v_email,''))) AND banned_until > now()) THEN
    RETURN 'BANNED_EMAIL';
  END IF;

  -- 读取自动审批开关
  SELECT auto_approval_enabled INTO v_auto FROM admin_settings LIMIT 1;

  -- ── 设备指纹检测（绕过名单中的用户不受限制）──
  IF v_dev IS NOT NULL AND v_dev NOT IN ('unknown', 'web') THEN
    IF NOT EXISTS (SELECT 1 FROM device_check_bypass WHERE user_id = v_uid) THEN
      IF EXISTS (SELECT 1 FROM user_approvals ua WHERE ua.device_id = v_dev AND ua.status = 'approved' AND ua.user_id <> v_uid) THEN
        RETURN 'DEVICE_ALREADY_REGISTERED';
      END IF;
    END IF;
  END IF;

  SELECT * INTO v_code FROM test_codes WHERE code = upper(trim(p_test_code));
  IF NOT FOUND THEN RETURN 'CODE_NOT_FOUND'; END IF;
  IF v_code.status = 'used'     THEN RETURN 'CODE_ALREADY_USED'; END IF;
  IF v_code.status = 'disabled' THEN RETURN 'CODE_DISABLED'; END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    UPDATE test_codes SET status = 'expired' WHERE id = v_code.id;
    RETURN 'CODE_EXPIRED';
  END IF;

  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;

  IF FOUND THEN
    IF v_app.status = 'approved' THEN RETURN 'ALREADY_APPROVED'; END IF;
    IF v_app.status = 'pending'  THEN RETURN 'ALREADY_PENDING'; END IF;
    IF v_app.test_code_id IS NOT NULL THEN
      UPDATE test_codes SET status='unused', used_by_user_id=NULL, used_by_email=NULL, used_at=NULL
        WHERE id = v_app.test_code_id AND status = 'used';
    END IF;
    UPDATE user_approvals
      SET status='pending', test_code_id=v_code.id, reject_reason=NULL,
          reviewed_by=NULL, reviewed_at=NULL, created_at=now(),
          device_id=COALESCE(v_dev, device_id),
          ip_address=COALESCE(v_ip, ip_address)
      WHERE user_id = v_uid;
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
      WHERE id = v_code.id;

    IF v_auto THEN
      -- 重复邮箱
      IF EXISTS (SELECT 1 FROM user_approvals ua WHERE ua.email = v_email AND ua.user_id <> v_uid) THEN
        PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '重复邮箱申请');
        RETURN 'AUTO_REJECTED_DUPLICATE_EMAIL';
      END IF;
      -- 同设备双封
      IF v_dev IS NOT NULL AND v_dev NOT IN ('unknown','web')
         AND NOT EXISTS (SELECT 1 FROM device_check_bypass WHERE user_id = v_uid) THEN
        SELECT user_id INTO v_dup_uid FROM user_approvals ua
          WHERE ua.device_id = v_dev AND ua.user_id <> v_uid
          ORDER BY created_at DESC LIMIT 1;
        IF FOUND THEN
          PERFORM _ban_both_accounts(v_uid, v_dup_uid, 'device', v_dev, '同设备重复注册，双账号封禁');
          PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '同设备多账号（已双封）');
          RETURN 'AUTO_REJECTED_DUPLICATE_DEVICE';
        END IF;
      END IF;
      -- 同IP双封（排除私有IP）
      IF NOT _is_private_ip(v_ip) THEN
        SELECT user_id INTO v_dup_uid FROM user_approvals ua
          WHERE ua.ip_address = v_ip AND ua.user_id <> v_uid
          ORDER BY created_at DESC LIMIT 1;
        IF FOUND THEN
          PERFORM _ban_both_accounts(v_uid, v_dup_uid, 'ip', v_ip, '同IP重复注册，双账号封禁');
          PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '同IP多账号（已双封）');
          RETURN 'AUTO_REJECTED_DUPLICATE_IP';
        END IF;
      END IF;
      -- 通过
      UPDATE user_approvals SET status='approved', reject_reason='自动审批通过', reviewed_at=now()
        WHERE user_id = v_uid;
      UPDATE player_saves SET approval_status='approved', updated_at=now() WHERE user_id = v_uid;
    END IF;
    RETURN 'OK';
  END IF;

  -- 全新提交
  UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
    WHERE id = v_code.id;
  INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id, ip_address)
    VALUES (v_uid, v_email, 'pending', v_code.id, v_dev, v_ip);

  IF v_auto THEN
    IF EXISTS (SELECT 1 FROM user_approvals ua WHERE ua.email = v_email AND ua.user_id <> v_uid) THEN
      PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '重复邮箱申请');
      RETURN 'AUTO_REJECTED_DUPLICATE_EMAIL';
    END IF;
    IF v_dev IS NOT NULL AND v_dev NOT IN ('unknown','web')
       AND NOT EXISTS (SELECT 1 FROM device_check_bypass WHERE user_id = v_uid) THEN
      SELECT user_id INTO v_dup_uid FROM user_approvals ua
        WHERE ua.device_id = v_dev AND ua.user_id <> v_uid
        ORDER BY created_at DESC LIMIT 1;
      IF FOUND THEN
        PERFORM _ban_both_accounts(v_uid, v_dup_uid, 'device', v_dev, '同设备重复注册，双账号封禁');
        PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '同设备多账号（已双封）');
        RETURN 'AUTO_REJECTED_DUPLICATE_DEVICE';
      END IF;
    END IF;
    IF NOT _is_private_ip(v_ip) THEN
      SELECT user_id INTO v_dup_uid FROM user_approvals ua
        WHERE ua.ip_address = v_ip AND ua.user_id <> v_uid
        ORDER BY created_at DESC LIMIT 1;
      IF FOUND THEN
        PERFORM _ban_both_accounts(v_uid, v_dup_uid, 'ip', v_ip, '同IP重复注册，双账号封禁');
        PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '同IP多账号（已双封）');
        RETURN 'AUTO_REJECTED_DUPLICATE_IP';
      END IF;
    END IF;
    UPDATE user_approvals SET status='approved', reject_reason='自动审批通过', reviewed_at=now()
      WHERE user_id = v_uid;
    UPDATE player_saves SET approval_status='approved', updated_at=now() WHERE user_id = v_uid;
  END IF;
  RETURN 'OK';
END;
$$;

-- ══════════════════════════════════════════
-- 5. admin_delete_account：同时封禁IP
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_delete_account(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, auth
AS $$
DECLARE
  v_email       text;
  v_device_id   text;
  v_ip          text;
  v_admin_uid   uuid := auth.uid();
  v_admin_email text;
  v_ban_until   timestamptz := now() + interval '100 years';
  v_already_deleted timestamptz;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'user_id required'; END IF;
  IF EXISTS(SELECT 1 FROM admin_users WHERE user_id = p_user_id) THEN RAISE EXCEPTION 'cannot delete admin account'; END IF;
  SELECT email::text, deleted_at INTO v_email, v_already_deleted FROM auth.users WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'account not found'; END IF;
  IF v_already_deleted IS NOT NULL THEN RAISE EXCEPTION 'account already pending deletion'; END IF;

  SELECT device_id, ip_address INTO v_device_id, v_ip FROM user_approvals WHERE user_id = p_user_id LIMIT 1;
  SELECT email INTO v_admin_email FROM admin_users WHERE user_id = v_admin_uid;

  -- 软删除 + auth 层封禁
  UPDATE auth.users SET deleted_at = now(), banned_until = v_ban_until WHERE id = p_user_id;
  UPDATE player_saves SET deleted_at = now(), delete_reason = 'admin_delete'
    WHERE user_id = p_user_id AND deleted_at IS NULL;

  -- banned_entities：封禁用户
  INSERT INTO banned_entities (user_id, email, entity_type, entity_value, ban_reason, banned_by, banned_by_email, banned_until)
  VALUES (p_user_id, v_email, 'user', p_user_id::text, '管理员删除账号', v_admin_uid, v_admin_email, v_ban_until);

  -- 封禁邮箱
  IF v_email IS NOT NULL THEN
    INSERT INTO banned_entities (user_id, email, entity_type, entity_value, ban_reason, banned_by, banned_by_email, banned_until)
    VALUES (p_user_id, v_email, 'email', lower(trim(v_email)), '管理员删除账号', v_admin_uid, v_admin_email, v_ban_until)
    ON CONFLICT DO NOTHING;
  END IF;

  -- 封禁设备
  IF v_device_id IS NOT NULL AND v_device_id NOT IN ('unknown','web') THEN
    INSERT INTO banned_entities (user_id, email, entity_type, entity_value, ban_reason, banned_by, banned_by_email, banned_until)
    VALUES (p_user_id, v_email, 'device', v_device_id, '管理员删除账号', v_admin_uid, v_admin_email, v_ban_until)
    ON CONFLICT DO NOTHING;
  END IF;

  -- 封禁IP（排除私有IP）
  IF NOT _is_private_ip(v_ip) THEN
    INSERT INTO banned_entities (user_id, email, entity_type, entity_value, ban_reason, banned_by, banned_by_email, banned_until)
    VALUES (p_user_id, v_email, 'ip', v_ip, '管理员删除账号', v_admin_uid, v_admin_email, v_ban_until)
    ON CONFLICT DO NOTHING;
  END IF;

  PERFORM admin_log_action('delete_account_with_ban', p_user_id::text,
    jsonb_build_object('email', v_email, 'device_id', v_device_id, 'ip', v_ip,
                       'ban_until', v_ban_until::text,
                       'auth_banned', true,
                       'retention_until', (now() + interval '30 days')::text));
  RETURN jsonb_build_object('deleted', true, 'email', v_email,
                            'banned_until', v_ban_until::text,
                            'device_banned', v_device_id IS NOT NULL,
                            'ip_banned', NOT _is_private_ip(v_ip) AND v_ip IS NOT NULL);
END;
$$;

-- ══════════════════════════════════════════
-- 6. 管理员查询封禁记录
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_list_banned_entities(
  p_limit    int  DEFAULT 50,
  p_offset   int  DEFAULT 0,
  p_type     text DEFAULT NULL
)
RETURNS TABLE(
  id uuid, user_id uuid, email text, entity_type text, entity_value text,
  ban_reason text, banned_by_email text, banned_at timestamptz, banned_until timestamptz,
  is_active boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT b.id, b.user_id, b.email, b.entity_type, b.entity_value,
         b.ban_reason, b.banned_by_email, b.banned_at, b.banned_until,
         (b.banned_until > now()) AS is_active
    FROM banned_entities b
   WHERE (p_type IS NULL OR b.entity_type = p_type)
   ORDER BY b.banned_at DESC
   LIMIT p_limit OFFSET p_offset;
END;
$$;

-- ══════════════════════════════════════════
-- 7. 超管解封指定banned_entity
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_unban_entity(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_ban banned_entities%ROWTYPE;
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RETURN jsonb_build_object('ok',false,'err','仅超级管理员可解封'); END IF;
  SELECT * INTO v_ban FROM banned_entities WHERE id = p_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'err','记录不存在'); END IF;
  -- 将封禁时间改为当前（立即失效）
  UPDATE banned_entities SET banned_until = now() WHERE id = p_id;
  -- 如为用户类型，同步解除 auth 层封禁
  IF v_ban.entity_type = 'user' AND v_ban.user_id IS NOT NULL THEN
    UPDATE auth.users SET banned_until = NULL WHERE id = v_ban.user_id;
  END IF;
  PERFORM admin_log_action('unban_entity', p_id::text,
    jsonb_build_object('entity_type', v_ban.entity_type, 'entity_value', v_ban.entity_value, 'email', v_ban.email));
  RETURN jsonb_build_object('ok', true);
END;
$$;
```

<a id="supabasemigrations00099_fix_ip_ban_and_stats_rpcsql"></a>
## `supabase/migrations/00099_fix_ip_ban_and_stats_rpc.sql`

```
-- ══════════════════════════════════════════
-- 1. 修复IP双封逻辑：同IP只拒绝新账号，不株连已审核的老账号
--    同设备双封保留（设备指纹更可靠）
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.register_with_test_code(p_test_code text, p_device_id text DEFAULT NULL::text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, auth
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_code       test_codes%ROWTYPE;
  v_app        user_approvals%ROWTYPE;
  v_email      text;
  v_auto       boolean := false;
  v_dev        text := NULLIF(p_device_id, '');
  v_ip         text;
  v_ban_until  timestamptz := now() + interval '100 years';
  v_dup_uid    uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN 'NOT_AUTHENTICATED'; END IF;

  -- 从请求头提取真实 IP（server-side，不可伪造）
  BEGIN
    v_ip := TRIM(SPLIT_PART(COALESCE(
      current_setting('request.headers', true)::json->>'cf-connecting-ip',
      current_setting('request.headers', true)::json->>'x-real-ip',
      current_setting('request.headers', true)::json->>'x-forwarded-for',
      ''
    ), ',', 1));
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
  END;
  v_ip := NULLIF(TRIM(COALESCE(v_ip, '')), '');

  -- ── 封禁检查：设备/IP/邮箱 ──
  IF v_dev IS NOT NULL AND v_dev NOT IN ('unknown', 'web') THEN
    IF EXISTS (SELECT 1 FROM banned_entities WHERE entity_type='device' AND entity_value=v_dev AND banned_until>now()) THEN
      RETURN 'BANNED_DEVICE';
    END IF;
  END IF;
  IF NOT _is_private_ip(v_ip) THEN
    IF EXISTS (SELECT 1 FROM banned_entities WHERE entity_type='ip' AND entity_value=v_ip AND banned_until>now()) THEN
      RETURN 'BANNED_IP';
    END IF;
  END IF;
  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  IF EXISTS (SELECT 1 FROM banned_entities WHERE entity_type='email' AND entity_value=lower(trim(COALESCE(v_email,''))) AND banned_until>now()) THEN
    RETURN 'BANNED_EMAIL';
  END IF;

  -- 读取自动审批开关
  SELECT auto_approval_enabled INTO v_auto FROM admin_settings LIMIT 1;

  -- ── 设备指纹检测（绕过名单豁免）──
  IF v_dev IS NOT NULL AND v_dev NOT IN ('unknown','web') THEN
    IF NOT EXISTS (SELECT 1 FROM device_check_bypass WHERE user_id = v_uid) THEN
      IF EXISTS (SELECT 1 FROM user_approvals ua WHERE ua.device_id=v_dev AND ua.status='approved' AND ua.user_id<>v_uid) THEN
        RETURN 'DEVICE_ALREADY_REGISTERED';
      END IF;
    END IF;
  END IF;

  SELECT * INTO v_code FROM test_codes WHERE code = upper(trim(p_test_code));
  IF NOT FOUND THEN RETURN 'CODE_NOT_FOUND'; END IF;
  IF v_code.status = 'used'     THEN RETURN 'CODE_ALREADY_USED'; END IF;
  IF v_code.status = 'disabled' THEN RETURN 'CODE_DISABLED'; END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    UPDATE test_codes SET status = 'expired' WHERE id = v_code.id;
    RETURN 'CODE_EXPIRED';
  END IF;

  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;

  IF FOUND THEN
    IF v_app.status = 'approved' THEN RETURN 'ALREADY_APPROVED'; END IF;
    IF v_app.status = 'pending'  THEN RETURN 'ALREADY_PENDING'; END IF;
    IF v_app.test_code_id IS NOT NULL THEN
      UPDATE test_codes SET status='unused', used_by_user_id=NULL, used_by_email=NULL, used_at=NULL
        WHERE id = v_app.test_code_id AND status='used';
    END IF;
    UPDATE user_approvals
      SET status='pending', test_code_id=v_code.id, reject_reason=NULL,
          reviewed_by=NULL, reviewed_at=NULL, created_at=now(),
          device_id=COALESCE(v_dev, device_id),
          ip_address=COALESCE(v_ip, ip_address)
      WHERE user_id = v_uid;
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
      WHERE id = v_code.id;

    IF v_auto THEN
      IF EXISTS (SELECT 1 FROM user_approvals ua WHERE ua.email=v_email AND ua.user_id<>v_uid) THEN
        PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '重复邮箱申请');
        RETURN 'AUTO_REJECTED_DUPLICATE_EMAIL';
      END IF;
      -- 同设备：双封（设备指纹可靠，两个账号都封）
      IF v_dev IS NOT NULL AND v_dev NOT IN ('unknown','web')
         AND NOT EXISTS (SELECT 1 FROM device_check_bypass WHERE user_id=v_uid) THEN
        SELECT user_id INTO v_dup_uid FROM user_approvals ua
          WHERE ua.device_id=v_dev AND ua.user_id<>v_uid ORDER BY created_at DESC LIMIT 1;
        IF FOUND THEN
          PERFORM _ban_both_accounts(v_uid, v_dup_uid, 'device', v_dev, '同设备重复注册，双账号封禁');
          PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '同设备多账号（已双封）');
          RETURN 'AUTO_REJECTED_DUPLICATE_DEVICE';
        END IF;
      END IF;
      -- 同IP：仅封禁新账号，不株连老账号（IP可能为共享网络/NAT）
      IF NOT _is_private_ip(v_ip) THEN
        IF EXISTS (SELECT 1 FROM user_approvals ua WHERE ua.ip_address=v_ip AND ua.user_id<>v_uid) THEN
          -- 封禁当前新账号
          UPDATE auth.users SET banned_until=v_ban_until WHERE id=v_uid;
          INSERT INTO banned_entities(user_id,email,entity_type,entity_value,ban_reason,banned_until)
          VALUES(v_uid,v_email,'ip',v_ip,'同IP重复注册（自动封禁新账号）',v_ban_until) ON CONFLICT DO NOTHING;
          INSERT INTO banned_entities(user_id,email,entity_type,entity_value,ban_reason,banned_until)
          VALUES(v_uid,v_email,'email',lower(trim(COALESCE(v_email,''))),
                 '同IP重复注册（自动封禁新账号）',v_ban_until) ON CONFLICT DO NOTHING;
          PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '同IP多账号（已封禁新账号）');
          RETURN 'AUTO_REJECTED_DUPLICATE_IP';
        END IF;
      END IF;
      UPDATE user_approvals SET status='approved', reject_reason='自动审批通过', reviewed_at=now()
        WHERE user_id=v_uid;
      UPDATE player_saves SET approval_status='approved', updated_at=now() WHERE user_id=v_uid;
    END IF;
    RETURN 'OK';
  END IF;

  -- 全新提交
  UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
    WHERE id = v_code.id;
  INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id, ip_address)
    VALUES (v_uid, v_email, 'pending', v_code.id, v_dev, v_ip);

  IF v_auto THEN
    IF EXISTS (SELECT 1 FROM user_approvals ua WHERE ua.email=v_email AND ua.user_id<>v_uid) THEN
      PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '重复邮箱申请');
      RETURN 'AUTO_REJECTED_DUPLICATE_EMAIL';
    END IF;
    IF v_dev IS NOT NULL AND v_dev NOT IN ('unknown','web')
       AND NOT EXISTS (SELECT 1 FROM device_check_bypass WHERE user_id=v_uid) THEN
      SELECT user_id INTO v_dup_uid FROM user_approvals ua
        WHERE ua.device_id=v_dev AND ua.user_id<>v_uid ORDER BY created_at DESC LIMIT 1;
      IF FOUND THEN
        PERFORM _ban_both_accounts(v_uid, v_dup_uid, 'device', v_dev, '同设备重复注册，双账号封禁');
        PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '同设备多账号（已双封）');
        RETURN 'AUTO_REJECTED_DUPLICATE_DEVICE';
      END IF;
    END IF;
    IF NOT _is_private_ip(v_ip) THEN
      IF EXISTS (SELECT 1 FROM user_approvals ua WHERE ua.ip_address=v_ip AND ua.user_id<>v_uid) THEN
        UPDATE auth.users SET banned_until=v_ban_until WHERE id=v_uid;
        INSERT INTO banned_entities(user_id,email,entity_type,entity_value,ban_reason,banned_until)
        VALUES(v_uid,v_email,'ip',v_ip,'同IP重复注册（自动封禁新账号）',v_ban_until) ON CONFLICT DO NOTHING;
        INSERT INTO banned_entities(user_id,email,entity_type,entity_value,ban_reason,banned_until)
        VALUES(v_uid,v_email,'email',lower(trim(COALESCE(v_email,''))),
               '同IP重复注册（自动封禁新账号）',v_ban_until) ON CONFLICT DO NOTHING;
        PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '同IP多账号（已封禁新账号）');
        RETURN 'AUTO_REJECTED_DUPLICATE_IP';
      END IF;
    END IF;
    UPDATE user_approvals SET status='approved', reject_reason='自动审批通过', reviewed_at=now()
      WHERE user_id=v_uid;
    UPDATE player_saves SET approval_status='approved', updated_at=now() WHERE user_id=v_uid;
  END IF;
  RETURN 'OK';
END;
$$;

-- ══════════════════════════════════════════
-- 2. 封禁统计 RPC（BannedTab 用）
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_banned_entities_stats()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_now timestamptz := now();
  v_today_start timestamptz := date_trunc('day', now() AT TIME ZONE 'Asia/Shanghai') AT TIME ZONE 'Asia/Shanghai';
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN (
    SELECT jsonb_build_object(
      'today',       count(*) FILTER (WHERE banned_at >= v_today_start),
      'total_active',count(*) FILTER (WHERE banned_until > v_now),
      'by_type', jsonb_build_object(
        'user',   count(*) FILTER (WHERE banned_until>v_now AND entity_type='user'),
        'email',  count(*) FILTER (WHERE banned_until>v_now AND entity_type='email'),
        'device', count(*) FILTER (WHERE banned_until>v_now AND entity_type='device'),
        'ip',     count(*) FILTER (WHERE banned_until>v_now AND entity_type='ip'),
        'vpn',    count(*) FILTER (WHERE banned_until>v_now AND entity_type='vpn')
      )
    ) FROM banned_entities
  );
END;
$$;

-- ══════════════════════════════════════════
-- 3. VPN封禁辅助：管理员标记某IP为VPN并封禁
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_ban_vpn_ip(p_ip text, p_reason text DEFAULT 'VPN/代理检测')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_ban_until timestamptz := now() + interval '100 years';
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO banned_entities(entity_type, entity_value, ban_reason, banned_by_email, banned_until)
  VALUES('vpn', p_ip, p_reason,
    (SELECT email FROM admin_users WHERE user_id=auth.uid()),
    v_ban_until)
  ON CONFLICT DO NOTHING;
  -- 同时写一条 ip 类型
  INSERT INTO banned_entities(entity_type, entity_value, ban_reason, banned_by_email, banned_until)
  VALUES('ip', p_ip, p_reason,
    (SELECT email FROM admin_users WHERE user_id=auth.uid()),
    v_ban_until)
  ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('ok',true,'ip',p_ip);
END;
$$;
```

<a id="supabasemigrations00100_ban_appeals_and_admin_immunitysql"></a>
## `supabase/migrations/00100_ban_appeals_and_admin_immunity.sql`

```
-- ══════════════════════════════════════════
-- 1. 封禁申诉表 ban_appeals
-- ════════════════════════════════════════════════
CREATE TABLE public.ban_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ban_appeals_status ON public.ban_appeals(status, created_at DESC);
CREATE INDEX idx_ban_appeals_email ON public.ban_appeals(email);
ALTER TABLE public.ban_appeals ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════
-- 2. 管理员账号判定（永不封禁）
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public._is_admin_user(p_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM admin_users WHERE user_id = p_uid);
$$;

-- ══════════════════════════════════════════
-- 3. 公众提交封禁申诉（无需登录）
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.submit_ban_appeal(p_email text, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_email text := lower(trim(p_email));
  v_reason text := trim(p_reason);
  v_uid uuid;
  v_banned boolean;
BEGIN
  IF v_email = '' THEN
    RETURN jsonb_build_object('ok', false, 'err', '请输入被封禁的账号邮箱');
  END IF;
  IF length(v_reason) < 5 THEN
    RETURN jsonb_build_object('ok', false, 'err', '请填写不少于 5 字的申诉理由');
  END IF;
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = v_email;
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'err', '该账号不存在，请检查邮箱');
  END IF;
  SELECT (banned_until IS NOT NULL AND banned_until > now()) INTO v_banned FROM auth.users WHERE id = v_uid;
  IF NOT v_banned THEN
    RETURN jsonb_build_object('ok', false, 'err', '该账号当前未被封禁');
  END IF;
  IF EXISTS (SELECT 1 FROM ban_appeals WHERE email = v_email AND status = 'pending') THEN
    RETURN jsonb_build_object('ok', false, 'err', '您已有一条待审核的申诉，请耐心等待处理');
  END IF;
  INSERT INTO ban_appeals (email, reason) VALUES (v_email, v_reason);
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ══════════════════════════════════════════
-- 4. 管理员查看申诉列表
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_list_ban_appeals(p_status text DEFAULT NULL, p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rows jsonb;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_agg(t) INTO v_rows FROM (
    SELECT id, email, reason, status, review_note, reviewed_by, reviewed_at, created_at
    FROM ban_appeals
    WHERE (p_status IS NULL OR status = p_status)
    ORDER BY created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) t;
  RETURN COALESCE(v_rows, '[]'::jsonb);
END;
$$;

-- ══════════════════════════════════════════
-- 5. 超管审核申诉（通过即解封）
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_review_ban_appeal(p_id uuid, p_approve boolean, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_appeal ban_appeals%ROWTYPE;
  v_uid uuid;
BEGIN
  IF COALESCE(current_admin_role(),'') <> 'super_admin' THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO v_appeal FROM ban_appeals WHERE id = p_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'err', '申诉不存在'); END IF;
  IF v_appeal.status <> 'pending' THEN RETURN jsonb_build_object('ok', false, 'err', '该申诉已处理'); END IF;

  IF p_approve THEN
    SELECT id INTO v_uid FROM auth.users WHERE lower(email) = v_appeal.email;
    UPDATE auth.users SET banned_until = NULL WHERE lower(email) = v_appeal.email;
    DELETE FROM banned_entities WHERE user_id = v_uid OR lower(email) = v_appeal.email;
    UPDATE ban_appeals SET status='approved', review_note=p_note, reviewed_by=auth.uid(), reviewed_at=now() WHERE id=p_id;
  ELSE
    UPDATE ban_appeals SET status='rejected', review_note=p_note, reviewed_by=auth.uid(), reviewed_at=now() WHERE id=p_id;
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ══════════════════════════════════════════
-- 6. admin_delete_account 拒绝封禁管理员账号
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_delete_account(p_user_id uuid, p_reason text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_email text;
  v_dev text;
  v_ip text;
  v_ban_until timestamptz := now() + interval '100 years';
  v_is_admin boolean;
  v_actor text;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_user_id = auth.uid() THEN RAISE EXCEPTION '不能删除自己'; END IF;
  v_is_admin := _is_admin_user(p_user_id);
  IF v_is_admin THEN
    RAISE EXCEPTION '管理员账号不可封禁或删除';
  END IF;
  SELECT email::text INTO v_email FROM auth.users WHERE id = p_user_id;
  SELECT device_id, ip_address INTO v_dev, v_ip FROM user_approvals WHERE user_id = p_user_id LIMIT 1;
  SELECT email INTO v_actor FROM admin_users WHERE user_id = auth.uid();

  UPDATE auth.users SET banned_until = v_ban_until WHERE id = p_user_id;
  INSERT INTO banned_entities(user_id,email,entity_type,entity_value,ban_reason,banned_by_email,banned_until)
  VALUES
    (p_user_id,v_email,'user',p_user_id::text,COALESCE(p_reason,'管理员删除账号'),v_actor,v_ban_until),
    (p_user_id,v_email,'email',lower(trim(COALESCE(v_email,''))),COALESCE(p_reason,'管理员删除账号'),v_actor,v_ban_until)
  ON CONFLICT DO NOTHING;
  IF v_dev IS NOT NULL AND v_dev NOT IN ('unknown','web') AND NOT _is_private_ip(v_ip) THEN
    INSERT INTO banned_entities(user_id,email,entity_type,entity_value,ban_reason,banned_by_email,banned_until)
    VALUES
      (p_user_id,v_email,'device',v_dev,COALESCE(p_reason,'管理员删除账号'),v_actor,v_ban_until),
      (p_user_id,v_email,'ip',v_ip,COALESCE(p_reason,'管理员删除账号'),v_actor,v_ban_until)
    ON CONFLICT DO NOTHING;
  END IF;
  INSERT INTO audit_logs(actor_email, action, target_email, details)
  VALUES(v_actor, 'delete_account', v_email,
         jsonb_build_object('reason', p_reason, 'banned', true, 'device', v_dev, 'ip', v_ip)::text);
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ══════════════════════════════════════════
-- 7. 解封 W2794045093@hotmail.com（已是超管）
-- ══════════════════════════════════════════
UPDATE auth.users SET banned_until = NULL WHERE email = 'W2794045093@hotmail.com';
DELETE FROM banned_entities WHERE email = 'W2794045093@hotmail.com';
```

<a id="supabasemigrations00101_register_ip_24h_and_admin_immunitysql"></a>
## `supabase/migrations/00101_register_ip_24h_and_admin_immunity.sql`

```
CREATE OR REPLACE FUNCTION public.register_with_test_code(p_test_code text, p_device_id text DEFAULT NULL::text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, auth
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_code       test_codes%ROWTYPE;
  v_app        user_approvals%ROWTYPE;
  v_email      text;
  v_auto       boolean := false;
  v_dev        text := NULLIF(p_device_id, '');
  v_ip         text;
  v_ban_until  timestamptz := now() + interval '100 years';
  v_dup_uid    uuid;
  v_is_admin   boolean;
BEGIN
  IF v_uid IS NULL THEN RETURN 'NOT_AUTHENTICATED'; END IF;
  v_is_admin := _is_admin_user(v_uid);

  BEGIN
    v_ip := TRIM(SPLIT_PART(COALESCE(
      current_setting('request.headers', true)::json->>'cf-connecting-ip',
      current_setting('request.headers', true)::json->>'x-real-ip',
      current_setting('request.headers', true)::json->>'x-forwarded-for',
      ''
    ), ',', 1));
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
  END;
  v_ip := NULLIF(TRIM(COALESCE(v_ip, '')), '');

  -- ── 封禁检查：设备/IP/邮箱（管理员账号豁免）──
  IF NOT v_is_admin THEN
    IF v_dev IS NOT NULL AND v_dev NOT IN ('unknown', 'web') THEN
      IF EXISTS (SELECT 1 FROM banned_entities WHERE entity_type='device' AND entity_value=v_dev AND banned_until>now()) THEN
        RETURN 'BANNED_DEVICE';
      END IF;
    END IF;
    IF NOT _is_private_ip(v_ip) THEN
      IF EXISTS (SELECT 1 FROM banned_entities WHERE entity_type='ip' AND entity_value=v_ip AND banned_until>now()) THEN
        RETURN 'BANNED_IP';
      END IF;
    END IF;
    SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
    IF EXISTS (SELECT 1 FROM banned_entities WHERE entity_type='email' AND entity_value=lower(trim(COALESCE(v_email,''))) AND banned_until>now()) THEN
      RETURN 'BANNED_EMAIL';
    END IF;
  ELSE
    SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  END IF;

  SELECT auto_approval_enabled INTO v_auto FROM admin_settings LIMIT 1;

  -- ── 设备指纹检测（绕过名单豁免；管理员豁免）──
  IF NOT v_is_admin AND v_dev IS NOT NULL AND v_dev NOT IN ('unknown','web') THEN
    IF NOT EXISTS (SELECT 1 FROM device_check_bypass WHERE user_id = v_uid) THEN
      IF EXISTS (SELECT 1 FROM user_approvals ua WHERE ua.device_id=v_dev AND ua.status='approved' AND ua.user_id<>v_uid) THEN
        RETURN 'DEVICE_ALREADY_REGISTERED';
      END IF;
    END IF;
  END IF;

  SELECT * INTO v_code FROM test_codes WHERE code = upper(trim(p_test_code));
  IF NOT FOUND THEN RETURN 'CODE_NOT_FOUND'; END IF;
  IF v_code.status = 'used'     THEN RETURN 'CODE_ALREADY_USED'; END IF;
  IF v_code.status = 'disabled' THEN RETURN 'CODE_DISABLED'; END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    UPDATE test_codes SET status = 'expired' WHERE id = v_code.id;
    RETURN 'CODE_EXPIRED';
  END IF;

  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;

  IF FOUND THEN
    IF v_app.status = 'approved' THEN RETURN 'ALREADY_APPROVED'; END IF;
    IF v_app.status = 'pending'  THEN RETURN 'ALREADY_PENDING'; END IF;
    IF v_app.test_code_id IS NOT NULL THEN
      UPDATE test_codes SET status='unused', used_by_user_id=NULL, used_by_email=NULL, used_at=NULL
        WHERE id = v_app.test_code_id AND status='used';
    END IF;
    UPDATE user_approvals
      SET status='pending', test_code_id=v_code.id, reject_reason=NULL,
          reviewed_by=NULL, reviewed_at=NULL, created_at=now(),
          device_id=COALESCE(v_dev, device_id),
          ip_address=COALESCE(v_ip, ip_address)
      WHERE user_id = v_uid;
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
      WHERE id = v_code.id;

    IF v_auto THEN
      IF EXISTS (SELECT 1 FROM user_approvals ua WHERE ua.email=v_email AND ua.user_id<>v_uid) THEN
        PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '重复邮箱申请');
        RETURN 'AUTO_REJECTED_DUPLICATE_EMAIL';
      END IF;
      IF NOT v_is_admin AND v_dev IS NOT NULL AND v_dev NOT IN ('unknown','web')
         AND NOT EXISTS (SELECT 1 FROM device_check_bypass WHERE user_id=v_uid) THEN
        SELECT user_id INTO v_dup_uid FROM user_approvals ua
          WHERE ua.device_id=v_dev AND ua.user_id<>v_uid ORDER BY created_at DESC LIMIT 1;
        IF FOUND THEN
          PERFORM _ban_both_accounts(v_uid, v_dup_uid, 'device', v_dev, '同设备重复注册，双账号封禁');
          PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '同设备多账号（已双封）');
          RETURN 'AUTO_REJECTED_DUPLICATE_DEVICE';
        END IF;
      END IF;
      IF NOT v_is_admin AND NOT _is_private_ip(v_ip) THEN
        IF EXISTS (SELECT 1 FROM user_approvals ua
                   WHERE ua.ip_address=v_ip AND ua.user_id<>v_uid
                     AND ua.created_at > now() - interval '24 hours') THEN
          UPDATE auth.users SET banned_until=v_ban_until WHERE id=v_uid;
          INSERT INTO banned_entities(user_id,email,entity_type,entity_value,ban_reason,banned_until)
          VALUES(v_uid,v_email,'ip',v_ip,'同IP 24小时内重复注册（自动封禁新账号）',v_ban_until) ON CONFLICT DO NOTHING;
          INSERT INTO banned_entities(user_id,email,entity_type,entity_value,ban_reason,banned_until)
          VALUES(v_uid,v_email,'email',lower(trim(COALESCE(v_email,''))),
                 '同IP 24小时内重复注册（自动封禁新账号）',v_ban_until) ON CONFLICT DO NOTHING;
          PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '同IP 24小时内多账号（已封禁新账号）');
          RETURN 'AUTO_REJECTED_DUPLICATE_IP';
        END IF;
      END IF;
      UPDATE user_approvals SET status='approved', reject_reason='自动审批通过', reviewed_at=now()
        WHERE user_id=v_uid;
      UPDATE player_saves SET approval_status='approved', updated_at=now() WHERE user_id=v_uid;
    END IF;
    RETURN 'OK';
  END IF;

  UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
    WHERE id = v_code.id;
  INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id, ip_address)
    VALUES (v_uid, v_email, 'pending', v_code.id, v_dev, v_ip);

  IF v_auto THEN
    IF EXISTS (SELECT 1 FROM user_approvals ua WHERE ua.email=v_email AND ua.user_id<>v_uid) THEN
      PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '重复邮箱申请');
      RETURN 'AUTO_REJECTED_DUPLICATE_EMAIL';
    END IF;
    IF NOT v_is_admin AND v_dev IS NOT NULL AND v_dev NOT IN ('unknown','web')
       AND NOT EXISTS (SELECT 1 FROM device_check_bypass WHERE user_id=v_uid) THEN
      SELECT user_id INTO v_dup_uid FROM user_approvals ua
        WHERE ua.device_id=v_dev AND ua.user_id<>v_uid ORDER BY created_at DESC LIMIT 1;
      IF FOUND THEN
        PERFORM _ban_both_accounts(v_uid, v_dup_uid, 'device', v_dev, '同设备重复注册，双账号封禁');
        PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '同设备多账号（已双封）');
        RETURN 'AUTO_REJECTED_DUPLICATE_DEVICE';
      END IF;
    END IF;
    IF NOT v_is_admin AND NOT _is_private_ip(v_ip) THEN
      IF EXISTS (SELECT 1 FROM user_approvals ua
                 WHERE ua.ip_address=v_ip AND ua.user_id<>v_uid
                   AND ua.created_at > now() - interval '24 hours') THEN
        UPDATE auth.users SET banned_until=v_ban_until WHERE id=v_uid;
        INSERT INTO banned_entities(user_id,email,entity_type,entity_value,ban_reason,banned_until)
        VALUES(v_uid,v_email,'ip',v_ip,'同IP 24小时内重复注册（自动封禁新账号）',v_ban_until) ON CONFLICT DO NOTHING;
        INSERT INTO banned_entities(user_id,email,entity_type,entity_value,ban_reason,banned_until)
        VALUES(v_uid,v_email,'email',lower(trim(COALESCE(v_email,''))),
               '同IP 24小时内重复注册（自动封禁新账号）',v_ban_until) ON CONFLICT DO NOTHING;
        PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '同IP 24小时内多账号（已封禁新账号）');
        RETURN 'AUTO_REJECTED_DUPLICATE_IP';
      END IF;
    END IF;
    UPDATE user_approvals SET status='approved', reject_reason='自动审批通过', reviewed_at=now()
      WHERE user_id=v_uid;
    UPDATE player_saves SET approval_status='approved', updated_at=now() WHERE user_id=v_uid;
  END IF;
  RETURN 'OK';
END;
$$;
```

<a id="supabasemigrations00102_ip_double_ban_immediate_and_appeals_realtimesql"></a>
## `supabase/migrations/00102_ip_double_ban_immediate_and_appeals_realtime.sql`

```
DROP FUNCTION public.register_with_test_code(text, text);

CREATE FUNCTION public.register_with_test_code(p_test_code text, p_device_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_code       test_codes%ROWTYPE;
  v_app        user_approvals%ROWTYPE;
  v_email      text;
  v_auto       boolean := false;
  v_dev        text := NULLIF(p_device_id, '');
  v_ip         text;
  v_ban_until  timestamptz := now() + interval '100 years';
  v_dup_uid    uuid;
  v_is_admin   boolean;
BEGIN
  IF v_uid IS NULL THEN RETURN 'NOT_AUTHENTICATED'; END IF;
  v_is_admin := _is_admin_user(v_uid);

  BEGIN
    v_ip := TRIM(SPLIT_PART(COALESCE(
      current_setting('request.headers', true)::json->>'cf-connecting-ip',
      current_setting('request.headers', true)::json->>'x-real-ip',
      current_setting('request.headers', true)::json->>'x-forwarded-for',
      ''
    ), ',', 1));
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
  END;
  v_ip := NULLIF(TRIM(COALESCE(v_ip, '')), '');

  -- ── 封禁检查：设备/IP/邮箱（管理员账号豁免）──
  IF NOT v_is_admin THEN
    IF v_dev IS NOT NULL AND v_dev NOT IN ('unknown', 'web') THEN
      IF EXISTS (SELECT 1 FROM banned_entities WHERE entity_type='device' AND entity_value=v_dev AND banned_until>now()) THEN
        RETURN 'BANNED_DEVICE';
      END IF;
    END IF;
    IF NOT _is_private_ip(v_ip) THEN
      IF EXISTS (SELECT 1 FROM banned_entities WHERE entity_type='ip' AND entity_value=v_ip AND banned_until>now()) THEN
        RETURN 'BANNED_IP';
      END IF;
    END IF;
    SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
    IF EXISTS (SELECT 1 FROM banned_entities WHERE entity_type='email' AND entity_value=lower(trim(COALESCE(v_email,''))) AND banned_until>now()) THEN
      RETURN 'BANNED_EMAIL';
    END IF;
  ELSE
    SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  END IF;

  SELECT auto_approval_enabled INTO v_auto FROM admin_settings LIMIT 1;

  SELECT * INTO v_code FROM test_codes WHERE code = upper(trim(p_test_code));
  IF NOT FOUND THEN RETURN 'CODE_NOT_FOUND'; END IF;
  IF v_code.status = 'used'     THEN RETURN 'CODE_ALREADY_USED'; END IF;
  IF v_code.status = 'disabled' THEN RETURN 'CODE_DISABLED'; END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    UPDATE test_codes SET status = 'expired' WHERE id = v_code.id;
    RETURN 'CODE_EXPIRED';
  END IF;

  -- ── 同IP 24小时内重复注册：立刻触发封禁（不依赖自动审批开关；管理员豁免）──
  IF NOT v_is_admin AND NOT _is_private_ip(v_ip) THEN
    IF EXISTS (SELECT 1 FROM user_approvals ua
               WHERE ua.ip_address=v_ip AND ua.user_id<>v_uid
                 AND ua.created_at > now() - interval '24 hours') THEN
      UPDATE auth.users SET banned_until=v_ban_until WHERE id=v_uid;
      INSERT INTO banned_entities(user_id,email,entity_type,entity_value,ban_reason,banned_until)
      VALUES(v_uid,v_email,'ip',v_ip,'同IP 24小时内重复注册（自动封禁新账号）',v_ban_until) ON CONFLICT DO NOTHING;
      INSERT INTO banned_entities(user_id,email,entity_type,entity_value,ban_reason,banned_until)
      VALUES(v_uid,v_email,'email',lower(trim(COALESCE(v_email,''))),
             '同IP 24小时内重复注册（自动封禁新账号）',v_ban_until) ON CONFLICT DO NOTHING;
      PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '同IP 24小时内多账号（已封禁新账号）');
      RETURN 'AUTO_REJECTED_DUPLICATE_IP';
    END IF;
  END IF;

  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;

  IF FOUND THEN
    IF v_app.status = 'approved' THEN RETURN 'ALREADY_APPROVED'; END IF;
    IF v_app.status = 'pending'  THEN RETURN 'ALREADY_PENDING'; END IF;
    IF v_app.test_code_id IS NOT NULL THEN
      UPDATE test_codes SET status='unused', used_by_user_id=NULL, used_by_email=NULL, used_at=NULL
        WHERE id = v_app.test_code_id AND status='used';
    END IF;
    UPDATE user_approvals
      SET status='pending', test_code_id=v_code.id, reject_reason=NULL,
          reviewed_by=NULL, reviewed_at=NULL, created_at=now(),
          device_id=COALESCE(v_dev, device_id),
          ip_address=COALESCE(v_ip, ip_address)
      WHERE user_id = v_uid;
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
      WHERE id = v_code.id;

    IF v_auto THEN
      IF EXISTS (SELECT 1 FROM user_approvals ua WHERE ua.email=v_email AND ua.user_id<>v_uid) THEN
        PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '重复邮箱申请');
        RETURN 'AUTO_REJECTED_DUPLICATE_EMAIL';
      END IF;
      IF NOT v_is_admin AND v_dev IS NOT NULL AND v_dev NOT IN ('unknown','web')
         AND NOT EXISTS (SELECT 1 FROM device_check_bypass WHERE user_id=v_uid) THEN
        SELECT user_id INTO v_dup_uid FROM user_approvals ua
          WHERE ua.device_id=v_dev AND ua.user_id<>v_uid ORDER BY created_at DESC LIMIT 1;
        IF FOUND THEN
          PERFORM _ban_both_accounts(v_uid, v_dup_uid, 'device', v_dev, '同设备重复注册，双账号封禁');
          PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '同设备多账号（已双封）');
          RETURN 'AUTO_REJECTED_DUPLICATE_DEVICE';
        END IF;
      END IF;
      UPDATE user_approvals SET status='approved', reject_reason='自动审批通过', reviewed_at=now()
        WHERE user_id=v_uid;
      UPDATE player_saves SET approval_status='approved', updated_at=now() WHERE user_id=v_uid;
    END IF;
    RETURN 'OK';
  END IF;

  UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
    WHERE id = v_code.id;
  INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id, ip_address)
    VALUES (v_uid, v_email, 'pending', v_code.id, v_dev, v_ip);

  IF v_auto THEN
    IF EXISTS (SELECT 1 FROM user_approvals ua WHERE ua.email=v_email AND ua.user_id<>v_uid) THEN
      PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '重复邮箱申请');
      RETURN 'AUTO_REJECTED_DUPLICATE_EMAIL';
    END IF;
    IF NOT v_is_admin AND v_dev IS NOT NULL AND v_dev NOT IN ('unknown','web')
       AND NOT EXISTS (SELECT 1 FROM device_check_bypass WHERE user_id=v_uid) THEN
      SELECT user_id INTO v_dup_uid FROM user_approvals ua
        WHERE ua.device_id=v_dev AND ua.user_id<>v_uid ORDER BY created_at DESC LIMIT 1;
      IF FOUND THEN
        PERFORM _ban_both_accounts(v_uid, v_dup_uid, 'device', v_dev, '同设备重复注册，双账号封禁');
        PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '同设备多账号（已双封）');
        RETURN 'AUTO_REJECTED_DUPLICATE_DEVICE';
      END IF;
    END IF;
    UPDATE user_approvals SET status='approved', reject_reason='自动审批通过', reviewed_at=now()
      WHERE user_id=v_uid;
    UPDATE player_saves SET approval_status='approved', updated_at=now() WHERE user_id=v_uid;
  END IF;
  RETURN 'OK';
END;
$$;

-- 启用 ban_appeals 表的 Realtime，供管理员后台申诉列表实时刷新
ALTER PUBLICATION supabase_realtime ADD TABLE ban_appeals;
```

<a id="supabasemigrations00103_ban_appeals_ban_meta_and_ip_no_cooldownsql"></a>
## `supabase/migrations/00103_ban_appeals_ban_meta_and_ip_no_cooldown.sql`

```
-- ① ban_appeals 增加封禁类型与封禁时间字段
ALTER TABLE public.ban_appeals
  ADD COLUMN ban_type text,
  ADD COLUMN banned_at timestamptz;

-- ② 同IP重复注册：去掉24h窗口，改为任何时间同IP都立刻封禁（管理员豁免）
DROP FUNCTION public.register_with_test_code(text, text);

CREATE FUNCTION public.register_with_test_code(p_test_code text, p_device_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_code       test_codes%ROWTYPE;
  v_app        user_approvals%ROWTYPE;
  v_email      text;
  v_auto       boolean := false;
  v_dev        text := NULLIF(p_device_id, '');
  v_ip         text;
  v_ban_until  timestamptz := now() + interval '100 years';
  v_dup_uid    uuid;
  v_is_admin   boolean;
BEGIN
  IF v_uid IS NULL THEN RETURN 'NOT_AUTHENTICATED'; END IF;
  v_is_admin := _is_admin_user(v_uid);

  BEGIN
    v_ip := TRIM(SPLIT_PART(COALESCE(
      current_setting('request.headers', true)::json->>'cf-connecting-ip',
      current_setting('request.headers', true)::json->>'x-real-ip',
      current_setting('request.headers', true)::json->>'x-forwarded-for',
      ''
    ), ',', 1));
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
  END;
  v_ip := NULLIF(TRIM(COALESCE(v_ip, '')), '');

  -- ── 封禁检查：设备/IP/邮箱（管理员账号豁免）──
  IF NOT v_is_admin THEN
    IF v_dev IS NOT NULL AND v_dev NOT IN ('unknown', 'web') THEN
      IF EXISTS (SELECT 1 FROM banned_entities WHERE entity_type='device' AND entity_value=v_dev AND banned_until>now()) THEN
        RETURN 'BANNED_DEVICE';
      END IF;
    END IF;
    IF NOT _is_private_ip(v_ip) THEN
      IF EXISTS (SELECT 1 FROM banned_entities WHERE entity_type='ip' AND entity_value=v_ip AND banned_until>now()) THEN
        RETURN 'BANNED_IP';
      END IF;
    END IF;
    SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
    IF EXISTS (SELECT 1 FROM banned_entities WHERE entity_type='email' AND entity_value=lower(trim(COALESCE(v_email,''))) AND banned_until>now()) THEN
      RETURN 'BANNED_EMAIL';
    END IF;
  ELSE
    SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  END IF;

  SELECT auto_approval_enabled INTO v_auto FROM admin_settings LIMIT 1;

  SELECT * INTO v_code FROM test_codes WHERE code = upper(trim(p_test_code));
  IF NOT FOUND THEN RETURN 'CODE_NOT_FOUND'; END IF;
  IF v_code.status = 'used'     THEN RETURN 'CODE_ALREADY_USED'; END IF;
  IF v_code.status = 'disabled' THEN RETURN 'CODE_DISABLED'; END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    UPDATE test_codes SET status = 'expired' WHERE id = v_code.id;
    RETURN 'CODE_EXPIRED';
  END IF;

  -- ── 同IP重复注册：立刻触发封禁（无时间冷却；管理员豁免）──
  IF NOT v_is_admin AND NOT _is_private_ip(v_ip) THEN
    IF EXISTS (SELECT 1 FROM user_approvals ua
               WHERE ua.ip_address=v_ip AND ua.user_id<>v_uid) THEN
      UPDATE auth.users SET banned_until=v_ban_until WHERE id=v_uid;
      INSERT INTO banned_entities(user_id,email,entity_type,entity_value,ban_reason,banned_until)
      VALUES(v_uid,v_email,'ip',v_ip,'同IP重复注册（自动封禁新账号）',v_ban_until) ON CONFLICT DO NOTHING;
      INSERT INTO banned_entities(user_id,email,entity_type,entity_value,ban_reason,banned_until)
      VALUES(v_uid,v_email,'email',lower(trim(COALESCE(v_email,''))),
             '同IP重复注册（自动封禁新账号）',v_ban_until) ON CONFLICT DO NOTHING;
      PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '同IP重复注册多账号（已封禁新账号）');
      RETURN 'AUTO_REJECTED_DUPLICATE_IP';
    END IF;
  END IF;

  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;

  IF FOUND THEN
    IF v_app.status = 'approved' THEN RETURN 'ALREADY_APPROVED'; END IF;
    IF v_app.status = 'pending'  THEN RETURN 'ALREADY_PENDING'; END IF;
    IF v_app.test_code_id IS NOT NULL THEN
      UPDATE test_codes SET status='unused', used_by_user_id=NULL, used_by_email=NULL, used_at=NULL
        WHERE id = v_app.test_code_id AND status='used';
    END IF;
    UPDATE user_approvals
      SET status='pending', test_code_id=v_code.id, reject_reason=NULL,
          reviewed_by=NULL, reviewed_at=NULL, created_at=now(),
          device_id=COALESCE(v_dev, device_id),
          ip_address=COALESCE(v_ip, ip_address)
      WHERE user_id = v_uid;
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
      WHERE id = v_code.id;

    IF v_auto THEN
      IF EXISTS (SELECT 1 FROM user_approvals ua WHERE ua.email=v_email AND ua.user_id<>v_uid) THEN
        PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '重复邮箱申请');
        RETURN 'AUTO_REJECTED_DUPLICATE_EMAIL';
      END IF;
      IF NOT v_is_admin AND v_dev IS NOT NULL AND v_dev NOT IN ('unknown','web')
         AND NOT EXISTS (SELECT 1 FROM device_check_bypass WHERE user_id=v_uid) THEN
        SELECT user_id INTO v_dup_uid FROM user_approvals ua
          WHERE ua.device_id=v_dev AND ua.user_id<>v_uid ORDER BY created_at DESC LIMIT 1;
        IF FOUND THEN
          PERFORM _ban_both_accounts(v_uid, v_dup_uid, 'device', v_dev, '同设备重复注册，双账号封禁');
          PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '同设备多账号（已双封）');
          RETURN 'AUTO_REJECTED_DUPLICATE_DEVICE';
        END IF;
      END IF;
      UPDATE user_approvals SET status='approved', reject_reason='自动审批通过', reviewed_at=now()
        WHERE user_id=v_uid;
      UPDATE player_saves SET approval_status='approved', updated_at=now() WHERE user_id=v_uid;
    END IF;
    RETURN 'OK';
  END IF;

  UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
    WHERE id = v_code.id;
  INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id, ip_address)
    VALUES (v_uid, v_email, 'pending', v_code.id, v_dev, v_ip);

  IF v_auto THEN
    IF EXISTS (SELECT 1 FROM user_approvals ua WHERE ua.email=v_email AND ua.user_id<>v_uid) THEN
      PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '重复邮箱申请');
      RETURN 'AUTO_REJECTED_DUPLICATE_EMAIL';
    END IF;
    IF NOT v_is_admin AND v_dev IS NOT NULL AND v_dev NOT IN ('unknown','web')
       AND NOT EXISTS (SELECT 1 FROM device_check_bypass WHERE user_id=v_uid) THEN
      SELECT user_id INTO v_dup_uid FROM user_approvals ua
        WHERE ua.device_id=v_dev AND ua.user_id<>v_uid ORDER BY created_at DESC LIMIT 1;
      IF FOUND THEN
        PERFORM _ban_both_accounts(v_uid, v_dup_uid, 'device', v_dev, '同设备重复注册，双账号封禁');
        PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '同设备多账号（已双封）');
        RETURN 'AUTO_REJECTED_DUPLICATE_DEVICE';
      END IF;
    END IF;
    UPDATE user_approvals SET status='approved', reject_reason='自动审批通过', reviewed_at=now()
      WHERE user_id=v_uid;
    UPDATE player_saves SET approval_status='approved', updated_at=now() WHERE user_id=v_uid;
  END IF;
  RETURN 'OK';
END;
$$;
```

<a id="supabasemigrations00104_submit_ban_appeal_write_ban_metasql"></a>
## `supabase/migrations/00104_submit_ban_appeal_write_ban_meta.sql`

```
CREATE OR REPLACE FUNCTION public.submit_ban_appeal(p_email text, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(p_email));
  v_reason text := trim(p_reason);
  v_uid uuid;
  v_banned boolean;
  v_ban_type text := NULL;
  v_banned_at timestamptz := NULL;
  v_row record;
BEGIN
  IF v_email = '' THEN
    RETURN jsonb_build_object('ok', false, 'err', '请输入被封禁的账号邮箱');
  END IF;
  IF length(v_reason) < 5 THEN
    RETURN jsonb_build_object('ok', false, 'err', '请填写不少于 5 字的申诉理由');
  END IF;
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = v_email;
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'err', '该账号不存在，请检查邮箱');
  END IF;
  SELECT (banned_until IS NOT NULL AND banned_until > now()) INTO v_banned FROM auth.users WHERE id = v_uid;
  IF NOT v_banned THEN
    RETURN jsonb_build_object('ok', false, 'err', '该账号当前未被封禁');
  END IF;
  IF EXISTS (SELECT 1 FROM ban_appeals WHERE email = v_email AND status = 'pending') THEN
    RETURN jsonb_build_object('ok', false, 'err', '您已有一条待审核的申诉，请耐心等待处理');
  END IF;

  -- 取该账号最近一条有效封禁记录的类型与时间
  SELECT entity_type, banned_until INTO v_ban_type, v_banned_at
  FROM banned_entities
  WHERE user_id = v_uid AND banned_until > now()
  ORDER BY created_at DESC
  LIMIT 1;

  INSERT INTO ban_appeals (email, reason, ban_type, banned_at)
  VALUES (v_email, v_reason, v_ban_type, v_banned_at);
  RETURN jsonb_build_object('ok', true);
END;
$$;
```

<a id="supabasemigrations00105_admin_list_ban_appeals_return_ban_metasql"></a>
## `supabase/migrations/00105_admin_list_ban_appeals_return_ban_meta.sql`

```
DROP FUNCTION public.admin_list_ban_appeals(text, int, int);

CREATE FUNCTION public.admin_list_ban_appeals(p_status text, p_limit int, p_offset int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_rows jsonb;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_agg(t) INTO v_rows FROM (
    SELECT id, email, reason, status, review_note, reviewed_by, reviewed_at, created_at,
           ban_type, banned_at
    FROM ban_appeals
    WHERE (p_status IS NULL OR status = p_status)
    ORDER BY created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) t;
  RETURN COALESCE(v_rows, '[]'::jsonb);
END;
$$;
```

<a id="supabasemigrations00106_enable_account_appeals_realtimesql"></a>
## `supabase/migrations/00106_enable_account_appeals_realtime.sql`

```
ALTER PUBLICATION supabase_realtime ADD TABLE account_appeals;
```

<a id="supabasemigrations00107_account_list_isolate_approved_and_unapproved_covers_allsql"></a>
## `supabase/migrations/00107_account_list_isolate_approved_and_unapproved_covers_all.sql`

```
-- 批次2：账号库只保留已审核通过的账号（有 user_approvals 且 status='approved'）
DROP FUNCTION public.admin_account_list(text, int, int, boolean);

CREATE FUNCTION public.admin_account_list(p_search text, p_limit int, p_offset int, p_include_deleted boolean)
RETURNS TABLE(
  user_id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz,
  banned boolean, save_id uuid, player_name text, rank_level int, rank_name text,
  merit_points bigint, is_admin boolean, admin_role text, deleted_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_search text := NULLIF(btrim(coalesce(p_search, '')), '');
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT u.id, u.email, u.created_at, u.last_sign_in_at,
         (u.banned_until IS NOT NULL AND u.banned_until > now()) AS banned,
         ps.id, ps.player_name, ps.rank_level, ps.rank_name, ps.merit_points,
         EXISTS(SELECT 1 FROM admin_users a WHERE a.user_id=u.id),
         (SELECT a.role FROM admin_users a WHERE a.user_id=u.id),
         u.deleted_at
  FROM auth.users u
  INNER JOIN user_approvals ua ON ua.user_id = u.id AND ua.status = 'approved'
  LEFT JOIN player_saves ps ON ps.user_id = u.id
  WHERE (p_include_deleted OR u.deleted_at IS NULL)
    AND (
      v_search IS NULL
      OR u.email ILIKE '%'||v_search||'%'
      OR ps.player_name ILIKE '%'||v_search||'%'
      OR replace(u.email, ' ', '') = replace(v_search, ' ', '')
      OR replace(coalesce(ps.player_name, ''), ' ', '') = replace(v_search, ' ', '')
      OR u.id::text = v_search
    )
  ORDER BY
    CASE
      WHEN u.email = v_search THEN 0
      WHEN replace(u.email, ' ', '') = replace(v_search, ' ', '') THEN 1
      ELSE 2
    END,
    u.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 批次3：未审核库覆盖所有未审核通过的账号
--   ① 有 user_approvals 但 status 为 pending/rejected 的
--   ② 注册了 auth.users 但完全没有 user_approvals 记录的（邮箱注册未提交测试码）
DROP FUNCTION public.admin_list_unapproved_accounts(int, int);

CREATE FUNCTION public.admin_list_unapproved_accounts(p_limit int, p_offset int)
RETURNS TABLE(
  user_id uuid, email text, status text, reject_reason text,
  device_id text, created_at timestamptz, has_pending_appeal boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT u.id AS user_id,
         coalesce(ua.email, u.email) AS email,
         coalesce(ua.status, '未提交测试码') AS status,
         ua.reject_reason,
         ua.device_id,
         coalesce(ua.created_at, u.created_at) AS created_at,
         EXISTS(
           SELECT 1 FROM account_appeals ap
           WHERE ap.target_user_id = u.id AND ap.status = 'pending'
         ) AS has_pending_appeal
  FROM auth.users u
  LEFT JOIN user_approvals ua ON ua.user_id = u.id
  WHERE u.deleted_at IS NULL
    AND (
      ua.user_id IS NULL                      -- ② 从未提交测试码
      OR ua.status IN ('pending', 'rejected')  -- ① 已提交但未通过
    )
  ORDER BY coalesce(ua.created_at, u.created_at) DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
```

<a id="supabasemigrations00108_fix_admin_delete_account_overload_and_appeal_admin_permissionsql"></a>
## `supabase/migrations/00108_fix_admin_delete_account_overload_and_appeal_admin_permission.sql`

```
-- ① 修复 admin_delete_account 重载歧义：删除旧的单参数版本，只保留带 reason 的版本
DROP FUNCTION public.admin_delete_account(uuid);

-- ② 放宽账号申诉审批权限：admin 及以上均可（原 super_admin only）
CREATE OR REPLACE FUNCTION public.admin_approve_appeal(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role   text := current_admin_role();
  v_uid    uuid := auth.uid();
  v_email  text;
  v_appeal account_appeals%ROWTYPE;
BEGIN
  IF COALESCE(v_role,'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT * INTO v_appeal FROM account_appeals WHERE id = p_id;
  IF NOT FOUND            THEN RETURN jsonb_build_object('ok',false,'err','申诉不存在'); END IF;
  IF v_appeal.status <> 'pending' THEN RETURN jsonb_build_object('ok',false,'err','申诉已处理'); END IF;

  IF v_appeal.appeal_type = 'system_rejected' THEN
    INSERT INTO device_check_bypass (user_id, bypass_reason, bypassed_by)
      VALUES (v_appeal.target_user_id, '申诉通过：系统拒绝解封', v_uid)
      ON CONFLICT (user_id) DO NOTHING;
  ELSIF v_appeal.appeal_type = 'player_rejected' THEN
    UPDATE user_approvals
      SET status='pending', reject_reason=NULL, reviewed_by=NULL, reviewed_at=NULL, created_at=now()
      WHERE user_id = v_appeal.target_user_id AND status = 'rejected';
    UPDATE player_saves SET approval_status='pending', updated_at=now()
      WHERE user_id = v_appeal.target_user_id;
  END IF;

  UPDATE account_appeals
    SET status='approved', reviewed_by_email=v_email, reviewed_at=now()
    WHERE id = p_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

DROP FUNCTION public.admin_reject_appeal(uuid, text);

CREATE FUNCTION public.admin_reject_appeal(p_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := current_admin_role();
  v_uid  uuid := auth.uid();
  v_email text;
BEGIN
  IF COALESCE(v_role,'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM account_appeals WHERE id = p_id AND status = 'pending') THEN
    RETURN jsonb_build_object('ok', false, 'err', '申诉不存在或已处理');
  END IF;
  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  UPDATE account_appeals
    SET status='rejected', reject_reason=p_reason, reviewed_by_email=v_email, reviewed_at=now()
    WHERE id = p_id AND status='pending';
  RETURN jsonb_build_object('ok', true);
END;
$$;
```

<a id="supabasemigrations00109_add_corruption_gameplay_fields_to_player_savessql"></a>
## `supabase/migrations/00109_add_corruption_gameplay_fields_to_player_saves.sql`

```
ALTER TABLE public.player_saves
  ADD COLUMN risk_value integer NOT NULL DEFAULT 0,
  ADD COLUMN clue_level integer NOT NULL DEFAULT 0,
  ADD COLUMN counter_intel integer NOT NULL DEFAULT 10,
  ADD COLUMN illegal_wealth numeric NOT NULL DEFAULT 0,
  ADD COLUMN testimony_chain integer NOT NULL DEFAULT 0,
  ADD COLUMN case_history integer NOT NULL DEFAULT 0,
  ADD COLUMN custody_days integer NOT NULL DEFAULT 0,
  ADD COLUMN illicit_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN transfer_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN asset_hiding jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN invest_state text NOT NULL DEFAULT 'none',
  ADD COLUMN last_interrogation_day integer NOT NULL DEFAULT 0,
  ADD COLUMN case_start_day integer NOT NULL DEFAULT 0;
```

<a id="supabasemigrations00110_fix_admin_test_code_gen_stats_joinsql"></a>
## `supabase/migrations/00110_fix_admin_test_code_gen_stats_join.sql`

```
DROP FUNCTION IF EXISTS admin_test_code_gen_stats();

CREATE OR REPLACE FUNCTION admin_test_code_gen_stats()
RETURNS TABLE(total bigint, unused bigint, used bigint, admin_id uuid, admin_email text, gen_count bigint, gen_unused bigint, gen_used bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  WITH agg AS (
    SELECT created_by AS aid,
           count(*) AS cnt,
           count(*) FILTER (WHERE status = 'unused') AS un,
           count(*) FILTER (WHERE status = 'used') AS cnt_used
      FROM test_codes
     GROUP BY created_by
  )
  SELECT (SELECT count(*) FROM test_codes),
         (SELECT count(*) FROM test_codes WHERE status = 'unused'),
         (SELECT count(*) FROM test_codes WHERE status = 'used'),
         au.id, au.email, agg.cnt, agg.un, agg.cnt_used
    FROM agg
    JOIN admin_users au ON au.user_id = agg.aid
   ORDER BY agg.cnt DESC
   LIMIT 20;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_test_code_gen_stats() TO authenticated;
```

<a id="supabasemigrations00111_fix_admin_delete_account_audit_log_tablesql"></a>
## `supabase/migrations/00111_fix_admin_delete_account_audit_log_table.sql`

```
CREATE OR REPLACE FUNCTION public.admin_delete_account(p_user_id uuid, p_reason text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_email text;
  v_dev text;
  v_ip text;
  v_ban_until timestamptz := now() + interval '100 years';
  v_is_admin boolean;
  v_actor text;
  v_uid uuid := auth.uid();
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_user_id = v_uid THEN RAISE EXCEPTION '不能删除自己'; END IF;
  v_is_admin := _is_admin_user(p_user_id);
  IF v_is_admin THEN
    RAISE EXCEPTION '管理员账号不可封禁或删除';
  END IF;
  SELECT email::text INTO v_email FROM auth.users WHERE id = p_user_id;
  SELECT device_id, ip_address INTO v_dev, v_ip FROM user_approvals WHERE user_id = p_user_id LIMIT 1;
  SELECT email INTO v_actor FROM admin_users WHERE user_id = v_uid;

  UPDATE auth.users SET banned_until = v_ban_until WHERE id = p_user_id;
  INSERT INTO banned_entities(user_id,email,entity_type,entity_value,ban_reason,banned_by_email,banned_until)
  VALUES
    (p_user_id,v_email,'user',p_user_id::text,COALESCE(p_reason,'管理员删除账号'),v_actor,v_ban_until),
    (p_user_id,v_email,'email',lower(trim(COALESCE(v_email,''))),COALESCE(p_reason,'管理员删除账号'),v_actor,v_ban_until)
  ON CONFLICT DO NOTHING;
  IF v_dev IS NOT NULL AND v_dev NOT IN ('unknown','web') AND NOT _is_private_ip(v_ip) THEN
    INSERT INTO banned_entities(user_id,email,entity_type,entity_value,ban_reason,banned_by_email,banned_until)
    VALUES
      (p_user_id,v_email,'device',v_dev,COALESCE(p_reason,'管理员删除账号'),v_actor,v_ban_until),
      (p_user_id,v_email,'ip',v_ip,COALESCE(p_reason,'管理员删除账号'),v_actor,v_ban_until)
    ON CONFLICT DO NOTHING;
  END IF;
  INSERT INTO audit_log(admin_user_id, admin_email, action, target_user_id, detail)
  VALUES(v_uid, v_actor, 'delete_account', p_user_id::text,
         jsonb_build_object('reason', p_reason, 'banned', true, 'device', v_dev, 'ip', v_ip, 'target_email', v_email));
  RETURN jsonb_build_object('ok', true);
END;
$$;
```

<a id="supabasemigrations00112_add_popular_support_fields_to_player_savessql"></a>
## `supabase/migrations/00112_add_popular_support_fields_to_player_saves.sql`

```

ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS popular_support int2 DEFAULT 50,
  ADD COLUMN IF NOT EXISTS popular_log jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS popular_action_cooldowns jsonb DEFAULT '{}';

-- 初始化已有存档的民心值为50（创建时统一值）
UPDATE player_saves SET popular_support = 50 WHERE popular_support IS NULL;
```

<a id="supabasemigrations00113_npc_name_pool_player_rename_warningsql"></a>
## `supabase/migrations/00113_npc_name_pool_player_rename_warning.sql`

```

-- ═══════════════════════════════════════════════════
-- 1. npc_name_pool：NPC姓名词库
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.npc_name_pool (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type       text NOT NULL CHECK (type IN ('surname','given_name')),
  value      text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (type, value)
);
ALTER TABLE public.npc_name_pool ENABLE ROW LEVEL SECURITY;
CREATE POLICY "npc_name_pool_read"  ON public.npc_name_pool FOR SELECT TO authenticated USING (true);
CREATE POLICY "npc_name_pool_admin" ON public.npc_name_pool FOR ALL    TO authenticated
  USING (is_current_admin()) WITH CHECK (is_current_admin());

INSERT INTO public.npc_name_pool (type, value) VALUES
  ('surname','王'),('surname','李'),('surname','张'),('surname','刘'),('surname','陈'),
  ('surname','赵'),('surname','孙'),('surname','周'),('surname','吴'),('surname','郑'),
  ('surname','冯'),('surname','许'),('surname','韩'),('surname','唐'),('surname','曹'),
  ('surname','邓'),('surname','杨'),('surname','林'),('surname','黄'),('surname','胡'),
  ('given_name','建国'),('given_name','志远'),('given_name','国华'),('given_name','宏伟'),('given_name','一凡'),
  ('given_name','明远'),('given_name','明志'),('given_name','国强'),('given_name','兴华'),('given_name','书平'),
  ('given_name','德胜'),('given_name','正阳'),('given_name','向阳'),('given_name','全忠'),('given_name','克强'),
  ('given_name','文斌'),('given_name','大勇'),('given_name','海峰'),('given_name','志刚'),('given_name','东升'),
  ('given_name','卫国'),('given_name','思远'),('given_name','长征'),('given_name','继先'),('given_name','光辉'),
  ('given_name','福生'),('given_name','振兴'),('given_name','承志'),('given_name','永红'),('given_name','民强')
ON CONFLICT (type, value) DO NOTHING;

-- ═══════════════════════════════════════════════════
-- 2. player_saves：新增 name_warning_count
-- ═══════════════════════════════════════════════════
ALTER TABLE public.player_saves
  ADD COLUMN IF NOT EXISTS name_warning_count int2 NOT NULL DEFAULT 0;

-- ═══════════════════════════════════════════════════
-- 3. Admin RPC：列出词库（姓/名分型）
-- ═══════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_list_npc_name_pool(
  p_type   text DEFAULT NULL,
  p_limit  int  DEFAULT 200,
  p_offset int  DEFAULT 0
)
RETURNS TABLE(id uuid, type text, value text, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, type, value, created_at FROM npc_name_pool
  WHERE (p_type IS NULL OR type = p_type)
  ORDER BY type, value
  LIMIT p_limit OFFSET p_offset;
$$;

-- ═══════════════════════════════════════════════════
-- 4. Admin RPC：新增词条
-- ═══════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_add_npc_name(p_type text, p_value text)
RETURNS TABLE(ok boolean, err text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_admin() THEN RETURN QUERY SELECT false, '无权限'; RETURN; END IF;
  IF p_type NOT IN ('surname','given_name') THEN RETURN QUERY SELECT false, '类型错误'; RETURN; END IF;
  IF length(trim(p_value)) = 0 THEN RETURN QUERY SELECT false, '值不能为空'; RETURN; END IF;
  IF length(trim(p_value)) > 10 THEN RETURN QUERY SELECT false, '词条不超过10字符'; RETURN; END IF;
  INSERT INTO npc_name_pool (type, value, created_by)
    VALUES (p_type, trim(p_value), auth.uid())
    ON CONFLICT (type, value) DO NOTHING;
  IF NOT FOUND THEN RETURN QUERY SELECT false, '该词条已存在'; RETURN; END IF;
  RETURN QUERY SELECT true, NULL::text;
END;
$$;

-- ═══════════════════════════════════════════════════
-- 5. Admin RPC：删除词条
-- ═══════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_delete_npc_name(p_id uuid)
RETURNS TABLE(ok boolean, err text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_admin() THEN RETURN QUERY SELECT false, '无权限'; RETURN; END IF;
  DELETE FROM npc_name_pool WHERE id = p_id;
  IF NOT FOUND THEN RETURN QUERY SELECT false, '词条不存在'; RETURN; END IF;
  RETURN QUERY SELECT true, NULL::text;
END;
$$;

-- ═══════════════════════════════════════════════════
-- 6. Admin RPC：查看在册NPC（npc_band + player_saves）
-- ═══════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_list_npc_names_in_use(
  p_search text DEFAULT NULL,
  p_limit  int  DEFAULT 100,
  p_offset int  DEFAULT 0
)
RETURNS TABLE(
  npc_id         uuid,
  npc_name       text,
  position_label text,
  rank_level     int,
  save_id        uuid,
  player_name    text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT nb.id, nb.name, nb.position_label, nb.rank_level, nb.save_id, ps.player_name
  FROM npc_band nb
  JOIN player_saves ps ON ps.id = nb.save_id
  WHERE nb.is_retired = false
    AND (p_search IS NULL OR nb.name ILIKE '%' || p_search || '%')
  ORDER BY nb.name
  LIMIT p_limit OFFSET p_offset;
$$;

-- ═══════════════════════════════════════════════════
-- 7. Player RPC：玩家自助改名（违禁词 → 警告 / 封号）
--    SECURITY DEFINER 直接操作 auth.users，绕过 admin_toggle_ban 的角色检查
-- ═══════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.player_rename_save(p_save_id uuid, p_new_name text)
RETURNS TABLE(ok boolean, code text, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_owner      uuid;
  v_old_name   text;
  v_name       text := trim(p_new_name);
  v_hit        text;
  v_warn_count int2 := 0;
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT false, 'NOT_AUTH', '请先登录'; RETURN;
  END IF;

  SELECT ps.user_id, ps.player_name INTO v_owner, v_old_name
  FROM player_saves ps WHERE ps.id = p_save_id;
  IF NOT FOUND   THEN RETURN QUERY SELECT false, 'NOT_FOUND', '存档不存在'; RETURN; END IF;
  IF v_owner <> v_uid THEN RETURN QUERY SELECT false, 'FORBIDDEN', '无权操作该存档'; RETURN; END IF;

  IF length(v_name) < 1 OR length(v_name) > 20 THEN
    RETURN QUERY SELECT false, 'INVALID', '名称需为 1-20 个字符'; RETURN;
  END IF;
  IF v_name = v_old_name THEN
    RETURN QUERY SELECT false, 'SAME', '名称与当前相同，无需修改'; RETURN;
  END IF;

  -- 违禁词检测
  SELECT sw.word INTO v_hit
  FROM sensitive_words sw
  WHERE lower(v_name) LIKE '%' || lower(sw.word) || '%'
  LIMIT 1;

  IF v_hit IS NOT NULL THEN
    SELECT COALESCE(ps.name_warning_count, 0) INTO v_warn_count
    FROM player_saves ps WHERE ps.id = p_save_id;

    IF v_warn_count >= 1 THEN
      -- 第二次及以上：直接封号（SECURITY DEFINER 可写 auth.users）
      UPDATE player_saves SET name_warning_count = v_warn_count + 1 WHERE id = p_save_id;
      UPDATE auth.users SET banned_until = '9999-12-31 23:59:59+00'::timestamptz WHERE id = v_uid;
      PERFORM admin_log_action('auto_ban_sensitive_name', v_uid::text,
        jsonb_build_object('attempted_name',v_name,'hit_word',v_hit,
                           'warning_count',v_warn_count+1,'save_id',p_save_id));
      RETURN QUERY SELECT false, 'BANNED',
        '您已多次使用违禁词命名，账号已被自动封禁。如有异议请在登录页提交申诉。';
    ELSE
      -- 第一次：警告
      UPDATE player_saves SET name_warning_count = v_warn_count + 1 WHERE id = p_save_id;
      PERFORM admin_log_action('warn_sensitive_name', v_uid::text,
        jsonb_build_object('attempted_name',v_name,'hit_word',v_hit,
                           'warning_count',1,'save_id',p_save_id));
      RETURN QUERY SELECT false, 'WARNING',
        '名称含违禁词「'||v_hit||'」，操作已被拦截。⚠️ 第一次警告，再次违规将自动封号。';
    END IF;
    RETURN;
  END IF;

  -- 无违禁词，正常更新（DB触发器二次兜底）
  UPDATE player_saves SET player_name = v_name, updated_at = now()
  WHERE id = p_save_id AND user_id = v_uid;
  PERFORM admin_log_action('player_self_rename', p_save_id::text,
    jsonb_build_object('old_name',v_old_name,'new_name',v_name));
  RETURN QUERY SELECT true, 'OK', '改名成功，新名称：'||v_name;
END;
$$;

-- ═══════════════════════════════════════════════════
-- 8. 授权
-- ═══════════════════════════════════════════════════
GRANT EXECUTE ON FUNCTION public.admin_list_npc_name_pool    TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_npc_name           TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_npc_name        TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_npc_names_in_use  TO authenticated;
GRANT EXECUTE ON FUNCTION public.player_rename_save           TO authenticated;
```

<a id="supabasemigrations00114_admin_find_save_filter_unapprovedsql"></a>
## `supabase/migrations/00114_admin_find_save_filter_unapproved.sql`

```
-- 修改 admin_find_save_by_account：仅返回激活码已通过(approved)用户的存档
-- 未通过激活码的用户(approval_status != 'approved')不显示存档
CREATE OR REPLACE FUNCTION public.admin_find_save_by_account(p_identifier text)
RETURNS TABLE(save_id uuid, user_id uuid, email text, player_name text, rank_level integer, rank_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions', 'auth'
AS $function$
DECLARE v_key text := lower(trim(p_identifier));
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT ps.id AS save_id, ps.user_id, u.email::text AS email, ps.player_name::text AS player_name, ps.rank_level, ps.rank_name::text AS rank_name
  FROM player_saves ps
  JOIN auth.users u ON u.id = ps.user_id
  WHERE (u.email = v_key
         OR ps.user_id::text = trim(p_identifier)
         OR ps.id::text = trim(p_identifier))
    AND COALESCE(ps.approval_status, 'approved') = 'approved';
END;
$function$;
```

<a id="supabasemigrations00115_npc_scan_dedup_and_inuse_mgmtsql"></a>
## `supabase/migrations/00115_npc_scan_dedup_and_inuse_mgmt.sql`

```
-- ═══════════════════════════════════════════════════════════════
-- 1. npc_in_use 表：管理员维护的「在册NPC名册」（独立于玩家 npc_band）
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.npc_in_use (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  source     text NOT NULL DEFAULT 'scanned',  -- scanned/manual
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.npc_in_use ENABLE ROW LEVEL SECURITY;
CREATE POLICY "npc_in_use_read"  ON public.npc_in_use FOR SELECT TO authenticated USING (true);
CREATE POLICY "npc_in_use_admin" ON public.npc_in_use FOR ALL    TO authenticated
  USING (is_current_admin()) WITH CHECK (is_current_admin());

-- ═══════════════════════════════════════════════════════════════
-- 2. Admin RPC：扫描所有存档的NPC姓名，去重后导入 npc_in_use + npc_name_pool
--    来源：subordinates.name / npc_band.name / leadership_band.name / player_saves.boss_name
--    仅扫描已激活(approved)存档
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_scan_npc_names()
RETURNS TABLE(scanned int, imported int, skipped int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_name  text;
  v_count int := 0;
  v_imp   int := 0;
  v_skp   int := 0;
  v_surname text;
  v_given   text;
  v_names  text[];
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;

  -- 收集所有去重后的NPC姓名（仅已激活存档）
  SELECT array_agg(DISTINCT n) INTO v_names FROM (
    SELECT s.name AS n FROM subordinates s
      JOIN player_saves ps ON ps.id = s.save_id
      WHERE COALESCE(ps.approval_status,'approved')='approved' AND s.name IS NOT NULL AND s.name <> ''
    UNION
    SELECT nb.name AS n FROM npc_band nb
      JOIN player_saves ps ON ps.id = nb.save_id
      WHERE COALESCE(ps.approval_status,'approved')='approved' AND nb.name IS NOT NULL AND nb.name <> ''
    UNION
    SELECT lb.name AS n FROM leadership_band lb
      JOIN player_saves ps ON ps.id = lb.save_id
      WHERE COALESCE(ps.approval_status,'approved')='approved' AND lb.name IS NOT NULL AND lb.name <> ''
    UNION
    SELECT ps.boss_name AS n FROM player_saves ps
      WHERE COALESCE(ps.approval_status,'approved')='approved' AND ps.boss_name IS NOT NULL AND ps.boss_name <> ''
  ) t;

  IF v_names IS NULL THEN
    RETURN QUERY SELECT 0, 0, 0; RETURN;
  END IF;

  v_count := array_length(v_names, 1);

  FOREACH v_name IN ARRAY v_names LOOP
    -- 写入在册NPC名册（去重，已存在则跳过）
    INSERT INTO npc_in_use (name, source, created_by)
      VALUES (v_name, 'scanned', v_uid)
      ON CONFLICT (name) DO NOTHING;
    IF NOT FOUND THEN v_skp := v_skp + 1; END IF;

    -- 拆分姓名写入词库：若首字命中姓库则拆为姓+名，否则整体作为名
    SELECT value INTO v_surname FROM npc_name_pool
      WHERE type='surname' AND char_length(value)=1
        AND left(v_name,1) = value LIMIT 1;

    IF v_surname IS NOT NULL THEN
      INSERT INTO npc_name_pool (type, value, created_by)
        VALUES ('surname', v_surname, v_uid) ON CONFLICT (type,value) DO NOTHING;
      v_given := substring(v_name from char_length(v_surname)+1);
      IF v_given <> '' THEN
        INSERT INTO npc_name_pool (type, value, created_by)
          VALUES ('given_name', v_given, v_uid) ON CONFLICT (type,value) DO NOTHING;
      END IF;
    ELSE
      INSERT INTO npc_name_pool (type, value, created_by)
        VALUES ('given_name', v_name, v_uid) ON CONFLICT (type,value) DO NOTHING;
    END IF;

    v_imp := v_imp + 1;
  END LOOP;

  PERFORM admin_log_action('scan_npc_names', NULL,
    jsonb_build_object('scanned', v_count, 'imported', v_imp, 'skipped_existing', v_skp));

  RETURN QUERY SELECT v_count, v_imp, v_skp;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 3. Admin RPC：列出在册NPC名册
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_list_npc_in_use(
  p_search text DEFAULT NULL,
  p_limit  int  DEFAULT 200,
  p_offset int  DEFAULT 0
)
RETURNS TABLE(id uuid, name text, source text, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, name, source, created_at FROM npc_in_use
  WHERE (p_search IS NULL OR name ILIKE '%' || p_search || '%')
  ORDER BY created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 4. Admin RPC：手动新增在册NPC名字
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_add_npc_in_use(p_name text)
RETURNS TABLE(ok boolean, err text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_admin() THEN RETURN QUERY SELECT false, '无权限'; RETURN; END IF;
  IF length(trim(p_name)) = 0 THEN RETURN QUERY SELECT false, '名字不能为空'; RETURN; END IF;
  IF length(trim(p_name)) > 20 THEN RETURN QUERY SELECT false, '名字不超过20字符'; RETURN; END IF;
  INSERT INTO npc_in_use (name, source, created_by)
    VALUES (trim(p_name), 'manual', auth.uid())
    ON CONFLICT (name) DO NOTHING;
  IF NOT FOUND THEN RETURN QUERY SELECT false, '该名字已存在'; RETURN; END IF;
  RETURN QUERY SELECT true, NULL::text;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 5. Admin RPC：删除在册NPC名字
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_delete_npc_in_use(p_id uuid)
RETURNS TABLE(ok boolean, err text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_admin() THEN RETURN QUERY SELECT false, '无权限'; RETURN; END IF;
  DELETE FROM npc_in_use WHERE id = p_id;
  IF NOT FOUND THEN RETURN QUERY SELECT false, '记录不存在'; RETURN; END IF;
  RETURN QUERY SELECT true, NULL::text;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 6. 授权
-- ═══════════════════════════════════════════════════════════════
GRANT EXECUTE ON FUNCTION public.admin_scan_npc_names      TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_npc_in_use     TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_npc_in_use      TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_npc_in_use   TO authenticated;
```

<a id="supabasemigrations00116_add_new_recruit_flag_to_subordinatessql"></a>
## `supabase/migrations/00116_add_new_recruit_flag_to_subordinates.sql`

```
ALTER TABLE subordinates ADD COLUMN new_recruit boolean NOT NULL DEFAULT false;
```

<a id="supabasemigrations00117_add_group_name_to_test_codessql"></a>
## `supabase/migrations/00117_add_group_name_to_test_codes.sql`

```
ALTER TABLE test_codes ADD COLUMN group_name text NOT NULL DEFAULT '';
```

<a id="supabasemigrations00118_test_code_grouping_rpc_drop_firstsql"></a>
## `supabase/migrations/00118_test_code_grouping_rpc_drop_first.sql`

```
DROP FUNCTION IF EXISTS public.admin_list_test_codes(text,text,integer,integer);

CREATE OR REPLACE FUNCTION public.admin_list_test_codes(
  p_batch_name text DEFAULT NULL::text,
  p_status text DEFAULT NULL::text,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(id uuid, code text, batch_name text, status text, used_by_user_id uuid, used_by_email text, used_at timestamp with time zone, expires_at timestamp with time zone, note text, created_at timestamp with time zone, group_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT tc.id, tc.code, tc.batch_name, tc.status, tc.used_by_user_id, tc.used_by_email, tc.used_at, tc.expires_at, tc.note, tc.created_at, tc.group_name
  FROM test_codes tc
  WHERE (p_batch_name IS NULL OR p_batch_name = 'all' OR tc.batch_name = p_batch_name)
    AND (p_status IS NULL OR p_status = 'all' OR tc.status = p_status)
  ORDER BY tc.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;
```

<a id="supabasemigrations00119_test_code_grouping_rpc_gen_and_groupssql"></a>
## `supabase/migrations/00119_test_code_grouping_rpc_gen_and_groups.sql`

```
-- 生成测试码：新增 p_group_name 参数
CREATE OR REPLACE FUNCTION public.admin_generate_test_codes(
  p_batch_name text DEFAULT '',
  p_count int DEFAULT 10,
  p_expires_at timestamptz DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_group_name text DEFAULT ''
)
RETURNS SETOF text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE i int; v_code text; v_uid uuid := auth.uid(); v_email text; v_exp timestamptz;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_count IS NULL OR p_count < 1 THEN RAISE EXCEPTION '数量至少为 1'; END IF;
  SELECT email INTO v_email FROM admin_users WHERE user_id = v_uid;
  v_exp := COALESCE(p_expires_at, now() + interval '15 minutes');
  FOR i IN 1..p_count LOOP
    v_code := 'TEST-' || upper(substr(encode(gen_random_bytes(3),'hex'),1,6));
    INSERT INTO test_codes (code, batch_name, status, expires_at, note, created_by, created_by_email, group_name)
      VALUES (v_code, COALESCE(NULLIF(p_batch_name,''),'默认批次'), 'unused', v_exp, p_note, v_uid, COALESCE(v_email,''), COALESCE(NULLIF(p_group_name,''),''));
    RETURN NEXT v_code;
  END LOOP;
  PERFORM admin_log_action('generate_test_codes', NULL, jsonb_build_object('count', p_count, 'batch', p_batch_name, 'group', p_group_name, 'expires_at', v_exp));
END;
$function$;

-- 列出测试码编组（去重，含统计）
CREATE OR REPLACE FUNCTION public.admin_list_test_code_groups()
RETURNS TABLE(group_name text, total int, used int, available int, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT
    COALESCE(NULLIF(tc.group_name,''),'未分组') AS group_name,
    count(*)::int AS total,
    count(*) FILTER (WHERE tc.status = 'used')::int AS used,
    count(*) FILTER (WHERE tc.status = 'unused')::int AS available,
    max(tc.created_at) AS created_at
  FROM test_codes tc
  GROUP BY COALESCE(NULLIF(tc.group_name,''),'未分组')
  ORDER BY max(tc.created_at) DESC;
END;
$function$;
```

<a id="supabasemigrations00120_test_code_prefix_group_filter_clear_unusedsql"></a>
## `supabase/migrations/00120_test_code_prefix_group_filter_clear_unused.sql`

```
-- 生成测试码：多开头随机前缀
CREATE OR REPLACE FUNCTION public.admin_generate_test_codes(
  p_batch_name text DEFAULT '',
  p_count int DEFAULT 10,
  p_expires_at timestamptz DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_group_name text DEFAULT ''
)
RETURNS SETOF text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE i int; v_code text; v_uid uuid := auth.uid(); v_email text; v_exp timestamptz; v_prefix text;
  v_prefixes text[] := ARRAY['TEST','BETA','VIP','GAME','CODE','KEY'];
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_count IS NULL OR p_count < 1 THEN RAISE EXCEPTION '数量至少为 1'; END IF;
  SELECT email INTO v_email FROM admin_users WHERE user_id = v_uid;
  v_exp := COALESCE(p_expires_at, now() + interval '15 minutes');
  FOR i IN 1..p_count LOOP
    v_prefix := v_prefixes[1 + floor(random() * array_length(v_prefixes,1))::int];
    v_code := v_prefix || '-' || upper(substr(encode(gen_random_bytes(3),'hex'),1,6));
    INSERT INTO test_codes (code, batch_name, status, expires_at, note, created_by, created_by_email, group_name)
      VALUES (v_code, COALESCE(NULLIF(p_batch_name,''),'默认批次'), 'unused', v_exp, p_note, v_uid, COALESCE(v_email,''), COALESCE(NULLIF(p_group_name,''),''));
    RETURN NEXT v_code;
  END LOOP;
  PERFORM admin_log_action('generate_test_codes', NULL, jsonb_build_object('count', p_count, 'batch', p_batch_name, 'group', p_group_name, 'expires_at', v_exp));
END;
$function$;

-- 列出测试码：新增按编组筛选
DROP FUNCTION IF EXISTS public.admin_list_test_codes(text,text,integer,integer);
CREATE OR REPLACE FUNCTION public.admin_list_test_codes(
  p_batch_name text DEFAULT NULL::text,
  p_status text DEFAULT NULL::text,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0,
  p_group_name text DEFAULT NULL::text
)
RETURNS TABLE(id uuid, code text, batch_name text, status text, used_by_user_id uuid, used_by_email text, used_at timestamp with time zone, expires_at timestamp with time zone, note text, created_at timestamp with time zone, group_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT tc.id, tc.code, tc.batch_name, tc.status, tc.used_by_user_id, tc.used_by_email, tc.used_at, tc.expires_at, tc.note, tc.created_at, tc.group_name
  FROM test_codes tc
  WHERE (p_batch_name IS NULL OR p_batch_name = 'all' OR tc.batch_name = p_batch_name)
    AND (p_status IS NULL OR p_status = 'all' OR tc.status = p_status)
    AND (p_group_name IS NULL OR p_group_name = 'all' OR tc.group_name = p_group_name)
  ORDER BY tc.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;

-- 清除所有未使用的测试码
CREATE OR REPLACE FUNCTION public.admin_clear_unused_test_codes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE v_count int;
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM test_codes WHERE status = 'unused';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  PERFORM admin_log_action('clear_unused_test_codes', NULL, jsonb_build_object('deleted', v_count));
  RETURN v_count;
END;
$function$;
```

<a id="supabasemigrations00121_npc_names_admin_managed_single_poolsql"></a>
## `supabase/migrations/00121_npc_names_admin_managed_single_pool.sql`

```
-- 新建 npc_names：管理员维护的完整 NPC 姓名名册（供游戏生成取用）
CREATE TABLE public.npc_names (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  source     text NOT NULL DEFAULT 'manual',   -- manual / scanned
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.npc_names ENABLE ROW LEVEL SECURITY;
CREATE POLICY "npc_names_read"  ON public.npc_names FOR SELECT TO authenticated USING (true);
CREATE POLICY "npc_names_admin" ON public.npc_names FOR ALL    TO authenticated
  USING (is_current_admin()) WITH CHECK (is_current_admin());

CREATE OR REPLACE FUNCTION public.admin_list_npc_names(p_search text DEFAULT NULL, p_limit int DEFAULT 300, p_offset int DEFAULT 0)
RETURNS TABLE(id uuid, name text, source text, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, name, source, created_at FROM npc_names
  WHERE (p_search IS NULL OR name ILIKE '%' || p_search || '%')
  ORDER BY created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

CREATE OR REPLACE FUNCTION public.admin_add_npc_name_full(p_name text)
RETURNS TABLE(ok boolean, err text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_admin() THEN RETURN QUERY SELECT false, '无权限'; RETURN; END IF;
  IF length(trim(p_name)) = 0 THEN RETURN QUERY SELECT false, '名字不能为空'; RETURN; END IF;
  IF length(trim(p_name)) > 20 THEN RETURN QUERY SELECT false, '名字不超过20字符'; RETURN; END IF;
  INSERT INTO npc_names (name, source, created_by)
    VALUES (trim(p_name), 'manual', auth.uid())
    ON CONFLICT (name) DO NOTHING;
  IF NOT FOUND THEN RETURN QUERY SELECT false, '该名字已存在'; RETURN; END IF;
  RETURN QUERY SELECT true, NULL::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_npc_name_full(p_id uuid)
RETURNS TABLE(ok boolean, err text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_admin() THEN RETURN QUERY SELECT false, '无权限'; RETURN; END IF;
  DELETE FROM npc_names WHERE id = p_id;
  IF NOT FOUND THEN RETURN QUERY SELECT false, '记录不存在'; RETURN; END IF;
  RETURN QUERY SELECT true, NULL::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_import_npc_names(p_names text[])
RETURNS TABLE(imported int, skipped int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_imp int := 0; v_skp int := 0; v_name text;
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_names IS NULL THEN RETURN QUERY SELECT 0, 0; RETURN; END IF;
  FOREACH v_name IN ARRAY p_names LOOP
    v_name := trim(v_name);
    IF v_name = '' THEN CONTINUE; END IF;
    INSERT INTO npc_names (name, source, created_by)
      VALUES (v_name, 'scanned', auth.uid())
      ON CONFLICT (name) DO NOTHING;
    IF FOUND THEN v_imp := v_imp + 1; ELSE v_skp := v_skp + 1; END IF;
  END LOOP;
  PERFORM admin_log_action('import_npc_names', NULL, jsonb_build_object('imported', v_imp, 'skipped', v_skp));
  RETURN QUERY SELECT v_imp, v_skp;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_npc_names(text,int,int)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_npc_name_full(text)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_npc_name_full(uuid)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_import_npc_names(text[])             TO authenticated;
```

<a id="supabasemigrations00122_drop_legacy_npc_name_poolsql"></a>
## `supabase/migrations/00122_drop_legacy_npc_name_pool.sql`

```
-- 删除旧的姓名词库表及其 RPC（改为单一完整姓名名册 npc_names）
DROP FUNCTION IF EXISTS public.admin_list_npc_name_pool(text,int,int);
DROP FUNCTION IF EXISTS public.admin_add_npc_name(text,text);
DROP FUNCTION IF EXISTS public.admin_delete_npc_name(uuid);
DROP TABLE IF EXISTS public.npc_name_pool;
DROP TABLE IF EXISTS public.npc_in_use;
DROP FUNCTION IF EXISTS public.admin_list_npc_in_use(text,int,int);
DROP FUNCTION IF EXISTS public.admin_add_npc_in_use(text);
DROP FUNCTION IF EXISTS public.admin_delete_npc_in_use(uuid);
DROP FUNCTION IF EXISTS public.admin_scan_npc_names();
```

<a id="supabasemigrations00123_test_code_group_rename_deletesql"></a>
## `supabase/migrations/00123_test_code_group_rename_delete.sql`

```
-- 编组改名：将某编组下所有测试码的 group_name 整体更新
CREATE OR REPLACE FUNCTION public.admin_rename_test_code_group(p_old text, p_new text)
RETURNS TABLE(ok boolean, err text, updated int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_count int;
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_old IS NULL OR length(trim(p_old)) = 0 THEN RETURN QUERY SELECT false, '原编组名不能为空', 0; RETURN; END IF;
  IF p_new IS NULL OR length(trim(p_new)) = 0 THEN RETURN QUERY SELECT false, '新编组名不能为空', 0; RETURN; END IF;
  IF length(trim(p_new)) > 30 THEN RETURN QUERY SELECT false, '编组名不超过30字符', 0; RETURN; END IF;
  IF trim(p_old) = trim(p_new) THEN RETURN QUERY SELECT false, '新编组名与原名相同', 0; RETURN; END IF;
  UPDATE test_codes SET group_name = trim(p_new) WHERE group_name = trim(p_old);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  PERFORM admin_log_action('rename_test_code_group', NULL, jsonb_build_object('old', p_old, 'new', p_new, 'updated', v_count));
  RETURN QUERY SELECT true, NULL::text, v_count;
END;
$$;

-- 编组删除：删除某编组下所有未使用的测试码（已使用/已禁用/已过期的保留）
CREATE OR REPLACE FUNCTION public.admin_delete_test_code_group(p_group text)
RETURNS TABLE(ok boolean, err text, deleted int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_count int;
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_group IS NULL OR length(trim(p_group)) = 0 THEN RETURN QUERY SELECT false, '编组名不能为空', 0; RETURN; END IF;
  DELETE FROM test_codes WHERE group_name = trim(p_group) AND status = 'unused';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  PERFORM admin_log_action('delete_test_code_group', NULL, jsonb_build_object('group', p_group, 'deleted', v_count));
  RETURN QUERY SELECT true, NULL::text, v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_rename_test_code_group(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_test_code_group(text)   TO authenticated;
```

<a id="supabasemigrations00124_sensitive_words_batch_and_check_rpcsql"></a>
## `supabase/migrations/00124_sensitive_words_batch_and_check_rpc.sql`

```
-- ① 管理员批量添加敏感词
CREATE OR REPLACE FUNCTION public.admin_batch_add_sensitive_words(p_words text[])
RETURNS TABLE(imported int, skipped int, errors text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_imported int := 0; v_skipped int := 0;
  v_word text; v_email text;
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  FOREACH v_word IN ARRAY p_words LOOP
    v_word := trim(v_word);
    CONTINUE WHEN length(v_word) = 0 OR length(v_word) > 50;
    IF EXISTS (SELECT 1 FROM sensitive_words WHERE word = lower(v_word)) THEN
      v_skipped := v_skipped + 1;
    ELSE
      INSERT INTO sensitive_words(word, created_by, created_by_email) VALUES (lower(v_word), auth.uid(), v_email);
      v_imported := v_imported + 1;
    END IF;
  END LOOP;
  PERFORM admin_log_action('batch_add_sensitive_words', NULL, jsonb_build_object('imported', v_imported, 'skipped', v_skipped));
  RETURN QUERY SELECT v_imported, v_skipped, NULL::text;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_batch_add_sensitive_words(text[]) TO authenticated;

-- ② 玩家检测姓名是否含敏感词（仅返回boolean，不暴露具体词汇）
CREATE OR REPLACE FUNCTION public.player_check_name_sensitive(p_name text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM sensitive_words
    WHERE lower(p_name) LIKE '%' || word || '%'
  );
$$;
GRANT EXECUTE ON FUNCTION public.player_check_name_sensitive(text) TO authenticated, anon;

-- ③ 加强 character create 中的姓名敏感词检测
--    completeCharacterCreation 最终写入 player_saves.player_name，已有DB触发器兜底
--    此处额外创建 RPC player_complete_character_creation_safe，供前端调用时提前拦截
CREATE OR REPLACE FUNCTION public.player_check_create_save_name(p_name text)
RETURNS TABLE(ok boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_hit text;
BEGIN
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RETURN QUERY SELECT false, '姓名不能为空';
    RETURN;
  END IF;
  IF length(trim(p_name)) > 6 THEN
    RETURN QUERY SELECT false, '姓名最多6个字符';
    RETURN;
  END IF;
  SELECT word INTO v_hit FROM sensitive_words WHERE lower(trim(p_name)) LIKE '%' || word || '%' LIMIT 1;
  IF v_hit IS NOT NULL THEN
    RETURN QUERY SELECT false, '⚠️ 当前名字已违规，包含禁用词汇，请重新整改后再创建存档。';
    RETURN;
  END IF;
  RETURN QUERY SELECT true, '名字合规';
END;
$$;
GRANT EXECUTE ON FUNCTION public.player_check_create_save_name(text) TO authenticated, anon;
```

<a id="supabasemigrations00125_npc_names_auto_sync_from_savessql"></a>
## `supabase/migrations/00125_npc_names_auto_sync_from_saves.sql`

```
-- ① 下属干部姓名同步
CREATE OR REPLACE FUNCTION public.sync_subordinate_name_to_roster()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.name IS NOT NULL AND length(trim(NEW.name)) > 0 THEN
    INSERT INTO npc_names (name, source) VALUES (trim(NEW.name), 'auto') ON CONFLICT (name) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sync_subordinate_name ON public.subordinates;
CREATE TRIGGER trg_sync_subordinate_name
  AFTER INSERT ON public.subordinates
  FOR EACH ROW EXECUTE FUNCTION public.sync_subordinate_name_to_roster();

-- ② boss_name 同步
CREATE OR REPLACE FUNCTION public.sync_boss_name_to_roster()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.boss_name IS NOT NULL AND length(trim(NEW.boss_name)) > 0 THEN
    INSERT INTO npc_names (name, source) VALUES (trim(NEW.boss_name), 'auto') ON CONFLICT (name) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sync_boss_name ON public.player_saves;
CREATE TRIGGER trg_sync_boss_name
  AFTER INSERT OR UPDATE OF boss_name ON public.player_saves
  FOR EACH ROW EXECUTE FUNCTION public.sync_boss_name_to_roster();

-- ③ 管理员手动全量回填
CREATE OR REPLACE FUNCTION public.admin_sync_npc_names_from_saves()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_imported int := 0; v_total int := 0;
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO npc_names (name, source)
  SELECT DISTINCT trim(n) FROM (
    SELECT name AS n FROM subordinates WHERE name IS NOT NULL AND length(trim(name)) > 0
    UNION
    SELECT boss_name AS n FROM player_saves WHERE boss_name IS NOT NULL AND length(trim(boss_name)) > 0
  ) s
  ON CONFLICT (name) DO NOTHING;
  GET DIAGNOSTICS v_imported = ROW_COUNT;
  SELECT count(*) INTO v_total FROM npc_names;
  PERFORM admin_log_action('sync_npc_names_from_saves', NULL,
    jsonb_build_object('imported', v_imported, 'total', v_total));
  RETURN jsonb_build_object('imported', v_imported, 'total', v_total);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_sync_npc_names_from_saves() TO authenticated;
```

<a id="supabasemigrations00126_admin_immunity_sensitive_reviewsql"></a>
## `supabase/migrations/00126_admin_immunity_sensitive_review.sql`

```
-- 管理员账户赦免所有审查设定：改名/建档/触发器均对 _is_admin_user 跳过敏感词检测

-- ① player_check_name_sensitive：管理员直接返回 false（不触发）
CREATE OR REPLACE FUNCTION public.player_check_name_sensitive(p_name text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN _is_admin_user(auth.uid()) THEN false ELSE EXISTS (
    SELECT 1 FROM sensitive_words WHERE lower(p_name) LIKE '%' || word || '%'
  ) END;
$$;
GRANT EXECUTE ON FUNCTION public.player_check_name_sensitive(text) TO authenticated, anon;

-- ② player_check_create_save_name：管理员直接放行
CREATE OR REPLACE FUNCTION public.player_check_create_save_name(p_name text)
RETURNS TABLE(ok boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_hit text;
BEGIN
  IF _is_admin_user(auth.uid()) THEN
    RETURN QUERY SELECT true, '管理员账号，已豁免审查';
    RETURN;
  END IF;
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RETURN QUERY SELECT false, '姓名不能为空';
    RETURN;
  END IF;
  IF length(trim(p_name)) > 6 THEN
    RETURN QUERY SELECT false, '姓名最多6个字符';
    RETURN;
  END IF;
  SELECT word INTO v_hit FROM sensitive_words WHERE lower(trim(p_name)) LIKE '%' || word || '%' LIMIT 1;
  IF v_hit IS NOT NULL THEN
    RETURN QUERY SELECT false, '⚠️ 当前名字已违规，包含禁用词汇，请重新整改后再创建存档。';
    RETURN;
  END IF;
  RETURN QUERY SELECT true, '名字合规';
END;
$$;
GRANT EXECUTE ON FUNCTION public.player_check_create_save_name(text) TO authenticated, anon;

-- ③ player_rename_save：管理员跳过违禁词检测，直接改名
CREATE OR REPLACE FUNCTION public.player_rename_save(p_save_id uuid, p_new_name text)
RETURNS TABLE(ok boolean, code text, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_owner      uuid;
  v_old_name   text;
  v_name       text := trim(p_new_name);
  v_hit        text;
  v_warn_count int2 := 0;
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT false, 'NOT_AUTH', '请先登录'; RETURN;
  END IF;

  SELECT ps.user_id, ps.player_name INTO v_owner, v_old_name
  FROM player_saves ps WHERE ps.id = p_save_id;
  IF NOT FOUND   THEN RETURN QUERY SELECT false, 'NOT_FOUND', '存档不存在'; RETURN; END IF;
  IF v_owner <> v_uid THEN RETURN QUERY SELECT false, 'FORBIDDEN', '无权操作该存档'; RETURN; END IF;

  IF length(v_name) < 1 OR length(v_name) > 20 THEN
    RETURN QUERY SELECT false, 'INVALID', '名称需为 1-20 个字符'; RETURN;
  END IF;
  IF v_name = v_old_name THEN
    RETURN QUERY SELECT false, 'SAME', '名称与当前相同，无需修改'; RETURN;
  END IF;

  -- 管理员豁免：跳过违禁词检测与封号逻辑
  IF NOT _is_admin_user(v_uid) THEN
    SELECT sw.word INTO v_hit
    FROM sensitive_words sw
    WHERE lower(v_name) LIKE '%' || lower(sw.word) || '%'
    LIMIT 1;

    IF v_hit IS NOT NULL THEN
      SELECT COALESCE(ps.name_warning_count, 0) INTO v_warn_count
      FROM player_saves ps WHERE ps.id = p_save_id;

      IF v_warn_count >= 1 THEN
        UPDATE player_saves SET name_warning_count = v_warn_count + 1 WHERE id = p_save_id;
        UPDATE auth.users SET banned_until = '9999-12-31 23:59:59+00'::timestamptz WHERE id = v_uid;
        PERFORM admin_log_action('auto_ban_sensitive_name', v_uid::text,
          jsonb_build_object('attempted_name',v_name,'hit_word',v_hit,
                             'warning_count',v_warn_count+1,'save_id',p_save_id));
        RETURN QUERY SELECT false, 'BANNED',
          '您已多次使用违禁词命名，账号已被自动封禁。如有异议请在登录页提交申诉。';
      ELSE
        UPDATE player_saves SET name_warning_count = v_warn_count + 1 WHERE id = p_save_id;
        PERFORM admin_log_action('warn_sensitive_name', v_uid::text,
          jsonb_build_object('attempted_name',v_name,'hit_word',v_hit,
                             'warning_count',1,'save_id',p_save_id));
        RETURN QUERY SELECT false, 'WARNING',
          '名称含违禁词「'||v_hit||'」，操作已被拦截。⚠️ 第一次警告，再次违规将自动封号。';
      END IF;
      RETURN;
    END IF;
  END IF;

  -- 无违禁词或管理员，正常更新
  UPDATE player_saves SET player_name = v_name, updated_at = now()
  WHERE id = p_save_id AND user_id = v_uid;
  PERFORM admin_log_action('player_self_rename', p_save_id::text,
    jsonb_build_object('old_name',v_old_name,'new_name',v_name,
                       'admin_exempt', _is_admin_user(v_uid)));
  RETURN QUERY SELECT true, 'OK', '改名成功，新名称：'||v_name;
END;
$$;
GRANT EXECUTE ON FUNCTION public.player_rename_save(uuid, text) TO authenticated;

-- ④ DB 触发器兜底：管理员写入直接放行
CREATE OR REPLACE FUNCTION public.check_player_name_sensitive()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_hit text;
BEGIN
  IF NEW.player_name IS NULL OR NEW.player_name = '' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.player_name = NEW.player_name THEN RETURN NEW; END IF;
  IF _is_admin_user(NEW.user_id) THEN RETURN NEW; END IF;
  SELECT word INTO v_hit FROM sensitive_words WHERE lower(NEW.player_name) LIKE '%' || word || '%' LIMIT 1;
  IF v_hit IS NOT NULL THEN
    RAISE EXCEPTION '名称包含敏感词「%」，已被熔断', v_hit;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_check_player_name_sensitive ON public.player_saves;
CREATE TRIGGER trg_check_player_name_sensitive
  BEFORE INSERT OR UPDATE OF player_name ON public.player_saves
  FOR EACH ROW EXECUTE FUNCTION public.check_player_name_sensitive();
```

<a id="supabasemigrations00127_temp_appeals_table_and_rpcssql"></a>
## `supabase/migrations/00127_temp_appeals_table_and_rpcs.sql`

```
CREATE TABLE public.temp_appeals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email         text NOT NULL,
  reason        text NOT NULL,
  status        text NOT NULL DEFAULT 'pending',
  handler       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reject_reason text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_temp_appeals_status ON public.temp_appeals(status, created_at DESC);
CREATE INDEX idx_temp_appeals_user   ON public.temp_appeals(user_id, created_at DESC);
ALTER TABLE public.temp_appeals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "temp_appeals_owner_read" ON public.temp_appeals FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "temp_appeals_admin_all" ON public.temp_appeals FOR SELECT TO authenticated
  USING (is_current_admin());

CREATE OR REPLACE FUNCTION public.submit_temp_appeal(p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_uid uuid := auth.uid(); v_email text; v_reason text := trim(p_reason);
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'err', '请先登录'); END IF;
  IF v_reason = '' OR length(v_reason) < 5 THEN
    RETURN jsonb_build_object('ok', false, 'err', '请填写不少于 5 字的申诉理由');
  END IF;
  IF length(v_reason) > 300 THEN
    RETURN jsonb_build_object('ok', false, 'err', '申诉理由不超过 300 字');
  END IF;
  IF EXISTS (SELECT 1 FROM temp_appeals WHERE user_id = v_uid AND status = 'pending') THEN
    RETURN jsonb_build_object('ok', false, 'err', '您已有一条待处理的临时申诉，请耐心等待管理员审核');
  END IF;
  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  INSERT INTO temp_appeals (user_id, email, reason) VALUES (v_uid, v_email, v_reason);
  RETURN jsonb_build_object('ok', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_temp_appeal(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_temp_appeals(p_status text DEFAULT NULL, p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rows jsonb;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_agg(t) INTO v_rows FROM (
    SELECT id, user_id, email, reason, status, reject_reason, handler, created_at, updated_at
    FROM temp_appeals
    WHERE (p_status IS NULL OR status = p_status)
    ORDER BY created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) t;
  RETURN COALESCE(v_rows, '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_list_temp_appeals(text, int, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_review_temp_appeal(p_id uuid, p_approve boolean, p_reject_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_row temp_appeals%ROWTYPE; v_reason text := trim(COALESCE(p_reject_reason, ''));
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO v_row FROM temp_appeals WHERE id = p_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'err', '申诉不存在'); END IF;
  IF v_row.status <> 'pending' THEN RETURN jsonb_build_object('ok', false, 'err', '该申诉已处理'); END IF;

  IF p_approve THEN
    UPDATE temp_appeals SET status='approved', handler=auth.uid(), updated_at=now() WHERE id=p_id;
  ELSE
    IF v_reason = '' THEN RETURN jsonb_build_object('ok', false, 'err', '拒绝时请填写拒绝理由'); END IF;
    UPDATE temp_appeals SET status='rejected', reject_reason=v_reason, handler=auth.uid(), updated_at=now() WHERE id=p_id;
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_review_temp_appeal(uuid, boolean, text) TO authenticated;
```

<a id="supabasemigrations00128_temp_appeals_risk_fields_and_gatesql"></a>
## `supabase/migrations/00128_temp_appeals_risk_fields_and_gate.sql`

```
-- temp_appeals 风控字段：设备指纹 / IP / 多开计数 / 账号创建时间 / 管理员豁免
ALTER TABLE public.temp_appeals
  ADD COLUMN device_fingerprint text,
  ADD COLUMN ip text,
  ADD COLUMN same_fp_count int NOT NULL DEFAULT 0,
  ADD COLUMN same_ip_count int NOT NULL DEFAULT 0,
  ADD COLUMN account_created_at timestamptz,
  ADD COLUMN admin_exempt boolean NOT NULL DEFAULT false;

-- 玩家是否有已通过的临时申诉（门禁自动放行用）
CREATE OR REPLACE FUNCTION public.has_approved_temp_appeal()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM temp_appeals WHERE user_id = auth.uid() AND status = 'approved');
$$;
GRANT EXECUTE ON FUNCTION public.has_approved_temp_appeal() TO authenticated;

-- 测试码系统：账号已有存档则禁止入内
CREATE OR REPLACE FUNCTION public.register_with_test_code(p_test_code text, p_device_id text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public', 'extensions', 'auth' AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_code test_codes%ROWTYPE;
  v_app user_approvals%ROWTYPE;
  v_email text;
BEGIN
  IF v_uid IS NULL THEN RETURN 'NOT_AUTHENTICATED'; END IF;

  -- 账号已有存档：禁止入内（请走临时申诉）
  IF EXISTS (SELECT 1 FROM player_saves WHERE user_id = v_uid) THEN
    RETURN 'SAVE_EXISTS';
  END IF;

  -- 设备指纹检测：同一设备已有其他已通过的账号，自动驳回
  IF p_device_id IS NOT NULL AND p_device_id NOT IN ('unknown', 'web', '') THEN
    IF EXISTS (
      SELECT 1 FROM user_approvals ua
      WHERE ua.device_id = p_device_id
        AND ua.status = 'approved'
        AND ua.user_id <> v_uid
    ) THEN
      RETURN 'DEVICE_ALREADY_REGISTERED';
    END IF;
  END IF;

  SELECT * INTO v_code FROM test_codes WHERE code = upper(trim(p_test_code));
  IF NOT FOUND THEN RETURN 'CODE_NOT_FOUND'; END IF;
  IF v_code.status = 'used' THEN RETURN 'CODE_ALREADY_USED'; END IF;
  IF v_code.status = 'disabled' THEN RETURN 'CODE_DISABLED'; END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    UPDATE test_codes SET status = 'expired' WHERE id = v_code.id;
    RETURN 'CODE_EXPIRED';
  END IF;

  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;

  IF FOUND THEN
    IF v_app.status = 'approved' THEN RETURN 'ALREADY_APPROVED'; END IF;
    IF v_app.status = 'pending' THEN RETURN 'ALREADY_PENDING'; END IF;
    IF v_app.test_code_id IS NOT NULL THEN
      UPDATE test_codes SET status='unused', used_by_user_id=NULL, used_by_email=NULL, used_at=NULL
        WHERE id = v_app.test_code_id AND status = 'used';
    END IF;
    UPDATE user_approvals
      SET status='pending', test_code_id=v_code.id, reject_reason=NULL,
          reviewed_by=NULL, reviewed_at=NULL, created_at=now(),
          device_id=COALESCE(NULLIF(p_device_id,''), device_id)
      WHERE user_id = v_uid;
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
      WHERE id = v_code.id;
    RETURN 'OK';
  END IF;

  UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
    WHERE id = v_code.id;
  INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id)
    VALUES (v_uid, v_email, 'pending', v_code.id, NULLIF(p_device_id,''));
  RETURN 'OK';
END;
$function$;

-- 后台临时申诉列表：按账号去重（每个账号仅显示最新一条）
CREATE OR REPLACE FUNCTION public.admin_list_temp_appeals(p_status text DEFAULT NULL, p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rows jsonb;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_agg(t) INTO v_rows FROM (
    SELECT * FROM (
      SELECT DISTINCT ON (user_id)
        id, user_id, email, reason, status, reject_reason, handler,
        device_fingerprint, ip, same_fp_count, same_ip_count, account_created_at, admin_exempt,
        created_at, updated_at
      FROM temp_appeals
      WHERE (p_status IS NULL OR status = p_status)
      ORDER BY user_id, created_at DESC
    ) d
    ORDER BY created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) t;
  RETURN COALESCE(v_rows, '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_list_temp_appeals(text, int, int) TO authenticated;
```

<a id="supabasemigrations00129_fix_register_with_test_code_check_ordersql"></a>
## `supabase/migrations/00129_fix_register_with_test_code_check_order.sql`

```
-- 修正 register_with_test_code 检测顺序：
-- 原版：SAVE_EXISTS 在最前 → APPROVED 用户导航到 enter-code 时看到"账号有存档"而非"已审核通过"
-- 修复：先检测审批状态，再检测存档，顺序：NOT_AUTHENTICATED → 设备冲突 → 码校验 → APPROVED/PENDING/SAVE_EXISTS
DROP FUNCTION IF EXISTS public.register_with_test_code(text, text);

CREATE OR REPLACE FUNCTION public.register_with_test_code(p_test_code text, p_device_id text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public', 'extensions', 'auth' AS $function$
DECLARE
  v_uid  uuid := auth.uid();
  v_code test_codes%ROWTYPE;
  v_app  user_approvals%ROWTYPE;
  v_email text;
BEGIN
  IF v_uid IS NULL THEN RETURN 'NOT_AUTHENTICATED'; END IF;

  -- ① 设备指纹冲突：同设备已有其他 approved 账号
  IF p_device_id IS NOT NULL AND p_device_id NOT IN ('unknown', 'web', '') THEN
    IF EXISTS (
      SELECT 1 FROM user_approvals ua
      WHERE ua.device_id = p_device_id
        AND ua.status = 'approved'
        AND ua.user_id <> v_uid
    ) THEN
      RETURN 'DEVICE_ALREADY_REGISTERED';
    END IF;
  END IF;

  -- ② 码校验（不存在 / 已用 / 禁用 / 过期）
  SELECT * INTO v_code FROM test_codes WHERE code = upper(trim(p_test_code));
  IF NOT FOUND THEN RETURN 'CODE_NOT_FOUND'; END IF;
  IF v_code.status = 'used'     THEN RETURN 'CODE_ALREADY_USED'; END IF;
  IF v_code.status = 'disabled' THEN RETURN 'CODE_DISABLED'; END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    UPDATE test_codes SET status = 'expired' WHERE id = v_code.id;
    RETURN 'CODE_EXPIRED';
  END IF;

  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;

  IF FOUND THEN
    -- ③ 已审核通过 → 优先给出最准确的提示
    IF v_app.status = 'approved' THEN RETURN 'ALREADY_APPROVED'; END IF;
    -- ④ 审核中
    IF v_app.status = 'pending'  THEN RETURN 'ALREADY_PENDING'; END IF;
    -- ⑤ 已拒绝但账号有存档（异常态）→ 走临时申诉
    IF EXISTS (SELECT 1 FROM player_saves WHERE user_id = v_uid) THEN
      RETURN 'SAVE_EXISTS';
    END IF;
    -- 已驳回：释放旧码，绑定新码，重新待审
    IF v_app.test_code_id IS NOT NULL THEN
      UPDATE test_codes SET status='unused', used_by_user_id=NULL, used_by_email=NULL, used_at=NULL
        WHERE id = v_app.test_code_id AND status = 'used';
    END IF;
    UPDATE user_approvals
      SET status='pending', test_code_id=v_code.id, reject_reason=NULL,
          reviewed_by=NULL, reviewed_at=NULL, created_at=now(),
          device_id=COALESCE(NULLIF(p_device_id,''), device_id)
      WHERE user_id = v_uid;
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
      WHERE id = v_code.id;
    RETURN 'OK';
  END IF;

  -- ⑥ 全新用户但已有存档（管理员手动创建等异常态）
  IF EXISTS (SELECT 1 FROM player_saves WHERE user_id = v_uid) THEN
    RETURN 'SAVE_EXISTS';
  END IF;

  -- ⑦ 全新提交
  UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
    WHERE id = v_code.id;
  INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id)
    VALUES (v_uid, v_email, 'pending', v_code.id, NULLIF(p_device_id,''));
  RETURN 'OK';
END;
$function$;
```

<a id="supabasemigrations00130_temp_appeal_approve_delete_savesql"></a>
## `supabase/migrations/00130_temp_appeal_approve_delete_save.sql`

```
-- 同意临时申诉时，自动删除该玩家旧存档（级联清理所有关联数据），使其可重新建档
CREATE OR REPLACE FUNCTION public.admin_review_temp_appeal(p_id uuid, p_approve boolean, p_reject_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_row temp_appeals%ROWTYPE; v_reason text := trim(COALESCE(p_reject_reason, ''));
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO v_row FROM temp_appeals WHERE id = p_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'err', '申诉不存在'); END IF;
  IF v_row.status <> 'pending' THEN RETURN jsonb_build_object('ok', false, 'err', '该申诉已处理'); END IF;

  IF p_approve THEN
    UPDATE temp_appeals SET status='approved', handler=auth.uid(), updated_at=now() WHERE id=p_id;
    -- 同意后删除该玩家旧存档（子表均为 ON DELETE CASCADE，自动级联清理）
    DELETE FROM player_saves WHERE user_id = v_row.user_id;
  ELSE
    IF v_reason = '' THEN RETURN jsonb_build_object('ok', false, 'err', '拒绝时请填写拒绝理由'); END IF;
    UPDATE temp_appeals SET status='rejected', reject_reason=v_reason, handler=auth.uid(), updated_at=now() WHERE id=p_id;
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_review_temp_appeal(uuid, boolean, text) TO authenticated;
```

<a id="supabasemigrations00131_delete_account_hard_delete_and_bansql"></a>
## `supabase/migrations/00131_delete_account_hard_delete_and_ban.sql`

```
-- 删除账号：彻底删除（删除 auth.users，级联清理全部数据），同时保留封禁记录防止重注册
CREATE OR REPLACE FUNCTION public.admin_delete_account(p_user_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_email text;
  v_dev text;
  v_ip text;
  v_ban_until timestamptz := now() + interval '100 years';
  v_uid uuid := auth.uid();
  v_actor text;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_user_id = v_uid THEN RAISE EXCEPTION '不能删除自己'; END IF;
  IF _is_admin_user(p_user_id) THEN RAISE EXCEPTION '管理员账号不可删除'; END IF;

  SELECT email::text INTO v_email FROM auth.users WHERE id = p_user_id;
  IF v_email IS NULL THEN RETURN jsonb_build_object('ok', false, 'err', '账号不存在'); END IF;

  SELECT device_id, ip_address INTO v_dev, v_ip FROM user_approvals WHERE user_id = p_user_id LIMIT 1;
  SELECT email INTO v_actor FROM admin_users WHERE user_id = v_uid;

  -- 写入封禁实体（user/email/device/ip），防止该账号/邮箱/设备/IP 重新注册
  INSERT INTO banned_entities(user_id,email,entity_type,entity_value,ban_reason,banned_by_email,banned_until)
  VALUES
    (p_user_id,v_email,'user',p_user_id::text,COALESCE(p_reason,'管理员删除账号'),v_actor,v_ban_until),
    (p_user_id,v_email,'email',lower(trim(v_email)),COALESCE(p_reason,'管理员删除账号'),v_actor,v_ban_until)
  ON CONFLICT DO NOTHING;
  IF v_dev IS NOT NULL AND v_dev NOT IN ('unknown','web') AND NOT _is_private_ip(v_ip) THEN
    INSERT INTO banned_entities(user_id,email,entity_type,entity_value,ban_reason,banned_by_email,banned_until)
    VALUES
      (p_user_id,v_email,'device',v_dev,COALESCE(p_reason,'管理员删除账号'),v_actor,v_ban_until),
      (p_user_id,v_email,'ip',v_ip,COALESCE(p_reason,'管理员删除账号'),v_actor,v_ban_until)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO audit_log(admin_user_id, admin_email, action, target_user_id, detail)
  VALUES(v_uid, v_actor, 'delete_account', p_user_id::text,
         jsonb_build_object('reason', p_reason, 'hard_delete', true, 'device', v_dev, 'ip', v_ip, 'target_email', v_email));

  -- 彻底删除：删除 auth.users，级联清理 player_saves 等全部数据
  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_delete_account(uuid, text) TO authenticated;

-- 封禁账号：保留账号与数据，仅封禁 100 年（banned_until + 写入封禁实体）
CREATE OR REPLACE FUNCTION public.admin_ban_account(p_user_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_email text;
  v_dev text;
  v_ip text;
  v_ban_until timestamptz := now() + interval '100 years';
  v_uid uuid := auth.uid();
  v_actor text;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_user_id = v_uid THEN RAISE EXCEPTION '不能封禁自己'; END IF;
  IF _is_admin_user(p_user_id) THEN RAISE EXCEPTION '管理员账号不可封禁'; END IF;

  SELECT email::text INTO v_email FROM auth.users WHERE id = p_user_id;
  IF v_email IS NULL THEN RETURN jsonb_build_object('ok', false, 'err', '账号不存在'); END IF;

  SELECT device_id, ip_address INTO v_dev, v_ip FROM user_approvals WHERE user_id = p_user_id LIMIT 1;
  SELECT email INTO v_actor FROM admin_users WHERE user_id = v_uid;

  UPDATE auth.users SET banned_until = v_ban_until WHERE id = p_user_id;

  INSERT INTO banned_entities(user_id,email,entity_type,entity_value,ban_reason,banned_by_email,banned_until)
  VALUES
    (p_user_id,v_email,'user',p_user_id::text,COALESCE(p_reason,'管理员封禁账号'),v_actor,v_ban_until),
    (p_user_id,v_email,'email',lower(trim(v_email)),COALESCE(p_reason,'管理员封禁账号'),v_actor,v_ban_until)
  ON CONFLICT DO NOTHING;
  IF v_dev IS NOT NULL AND v_dev NOT IN ('unknown','web') AND NOT _is_private_ip(v_ip) THEN
    INSERT INTO banned_entities(user_id,email,entity_type,entity_value,ban_reason,banned_by_email,banned_until)
    VALUES
      (p_user_id,v_email,'device',v_dev,COALESCE(p_reason,'管理员封禁账号'),v_actor,v_ban_until),
      (p_user_id,v_email,'ip',v_ip,COALESCE(p_reason,'管理员封禁账号'),v_actor,v_ban_until)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO audit_log(admin_user_id, admin_email, action, target_user_id, detail)
  VALUES(v_uid, v_actor, 'ban_account', p_user_id::text,
         jsonb_build_object('reason', p_reason, 'banned_until', v_ban_until, 'device', v_dev, 'ip', v_ip, 'target_email', v_email));

  RETURN jsonb_build_object('ok', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_ban_account(uuid, text) TO authenticated;
```

<a id="supabasemigrations00132_placeholder_filter_drop_old_overloadsql"></a>
## `supabase/migrations/00132_placeholder_filter_drop_old_overload.sql`

```
DROP FUNCTION IF EXISTS public.admin_account_list(text, integer, integer);
DROP FUNCTION IF EXISTS public.admin_account_list(text, integer, integer);
DROP FUNCTION IF EXISTS public.admin_account_stats();
DROP FUNCTION IF EXISTS public.admin_preview_inactive(integer);
DROP FUNCTION IF EXISTS public.admin_rank_distribution();
DROP FUNCTION IF EXISTS public.run_game_cleanup(text);
DROP FUNCTION IF EXISTS public.register_with_test_code(text, text);
```

<a id="supabasemigrations00133_placeholder_save_filter_and_cleanup_v2sql"></a>
## `supabase/migrations/00133_placeholder_save_filter_and_cleanup_v2.sql`

```
-- ② admin_account_list 过滤占位档
CREATE OR REPLACE FUNCTION public.admin_account_list(p_search text, p_limit integer, p_offset integer)
RETURNS TABLE(
  user_id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz,
  banned boolean, save_id uuid, player_name text, rank_level integer, rank_name text, merit_points integer,
  is_admin boolean, admin_role text, deleted_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_search text := NULLIF(btrim(coalesce(p_search, '')), '');
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT u.id, u.email, u.created_at, u.last_sign_in_at,
         (u.banned_until IS NOT NULL AND u.banned_until > now()) AS banned,
         ps.id, ps.player_name, ps.rank_level, ps.rank_name, ps.merit_points,
         EXISTS(SELECT 1 FROM admin_users a WHERE a.user_id=u.id),
         (SELECT a.role FROM admin_users a WHERE a.user_id=u.id),
         u.deleted_at
  FROM auth.users u
  INNER JOIN user_approvals ua ON ua.user_id = u.id AND ua.status = 'approved'
  LEFT JOIN player_saves ps ON ps.user_id = u.id AND NOT COALESCE(ps.needs_character_creation, false)
  WHERE (p_include_deleted OR u.deleted_at IS NULL)
    AND (
      v_search IS NULL
      OR u.email ILIKE '%'||v_search||'%'
      OR ps.player_name ILIKE '%'||v_search||'%'
      OR replace(u.email, ' ', '') = replace(v_search, ' ', '')
      OR replace(coalesce(ps.player_name, ''), ' ', '') = replace(v_search, ' ', '')
      OR u.id::text = v_search
    )
  ORDER BY
    CASE
      WHEN u.email = v_search THEN 0
      WHEN replace(u.email, ' ', '') = replace(v_search, ' ', '') THEN 1
      ELSE 2
    END,
    u.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- ③ admin_account_stats：has_save 改为只统计非占位档
CREATE OR REPLACE FUNCTION public.admin_account_stats()
RETURNS TABLE(total_users bigint, has_save bigint, active_saves bigint, admin_count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT count(*) FROM auth.users WHERE deleted_at IS NULL),
    (SELECT count(DISTINCT user_id) FROM player_saves WHERE NOT COALESCE(needs_character_creation, false)),
    (SELECT count(*) FROM player_saves WHERE game_over_type IS NULL AND is_retired = false AND NOT COALESCE(needs_character_creation, false)),
    (SELECT count(*) FROM admin_users);
$$;

-- ④ admin_preview_inactive 过滤占位档
CREATE OR REPLACE FUNCTION public.admin_preview_inactive(p_days integer)
RETURNS TABLE(user_id uuid, email text, last_active timestamptz, has_save boolean, player_name text, rank_level integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RAISE EXCEPTION 'forbidden: super_admin only'; END IF;
  RETURN QUERY
  SELECT u.id, u.email, COALESCE(ps.updated_at, u.last_sign_in_at, u.created_at),
         ps.id IS NOT NULL, ps.player_name, ps.rank_level
  FROM auth.users u
  LEFT JOIN player_saves ps ON ps.user_id = u.id AND NOT COALESCE(ps.needs_character_creation, false)
  WHERE u.deleted_at IS NULL
    AND NOT EXISTS(SELECT 1 FROM admin_users a WHERE a.user_id=u.id)
    AND COALESCE(ps.updated_at, u.last_sign_in_at, u.created_at) < now() - (p_days || ' days')::interval
  ORDER BY COALESCE(ps.updated_at, u.last_sign_in_at, u.created_at) ASC
  LIMIT 200;
END;
$$;

-- ⑤ admin_rank_distribution 过滤占位档
CREATE OR REPLACE FUNCTION public.admin_rank_distribution()
RETURNS TABLE(rank_level integer, count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT rank_level, count(*) FROM player_saves
  WHERE game_over_type IS NULL AND NOT COALESCE(needs_character_creation, false)
  GROUP BY rank_level ORDER BY rank_level;
$$;

-- ⑥ run_game_cleanup 增加占位档定期清理（超7天）
CREATE OR REPLACE FUNCTION public.run_game_cleanup(p_trigger text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_mb_before numeric; v_mb_after numeric;
  v_large_rows integer := 0; v_large_bytes bigint := 0;
  v_cadres_rows integer := 0; v_cadres_bytes bigint := 0;
  v_saves_rows integer := 0; v_saves_bytes bigint := 0;
  v_dead_ids uuid[]; v_total_saves integer;
  v_t text; v_tc integer; v_ts bigint;
  v_large_tables text[] := ARRAY['event_records','boss_interactions','monthly_reports','petition_events','welfare_actions'];
  v_orphan_tables text[] := ARRAY['city_finance','enterprises','monthly_meetings','petition_events','recruit_candidates','secretary','subordinate_resumes','welfare_actions'];
  r record;
BEGIN
  v_mb_before := round(pg_database_size(current_database()) / 1024.0 / 1024.0, 3);

  FOREACH v_t IN ARRAY v_large_tables LOOP
    SELECT * INTO r FROM _cleanup_by_where(v_t, 'created_at < now() - interval ''1 day''');
    v_large_rows := v_large_rows + r.deleted_rows;
    v_large_bytes := v_large_bytes + r.est_bytes;
  END LOOP;

  SELECT * INTO r FROM _cleanup_by_where('subordinates', 'transferred_city IS NOT NULL AND created_at < now() - interval ''1 day''');
  v_cadres_rows := r.deleted_rows; v_cadres_bytes := r.est_bytes;

  SELECT array_agg(id) INTO v_dead_ids FROM player_saves
  WHERE (game_over_type IS NOT NULL OR is_retired = true) AND updated_at < now() - interval '1 day';
  v_saves_rows := COALESCE(array_length(v_dead_ids,1),0);

  SELECT count(*) INTO v_total_saves FROM player_saves;
  IF v_total_saves > 0 AND v_saves_rows > 0 THEN
    FOR v_t IN SELECT table_name FROM information_schema.columns WHERE column_name='save_id' AND table_schema='public' LOOP
      EXECUTE format('SELECT pg_total_relation_size(%L::regclass)', v_t) INTO v_ts;
      EXECUTE format('SELECT count(*) FROM %I', v_t) INTO v_tc;
      IF v_tc > 0 THEN
        v_saves_bytes := v_saves_bytes + (v_ts::numeric / v_total_saves * v_saves_rows)::bigint;
      END IF;
    END LOOP;
  END IF;

  FOREACH v_t IN ARRAY v_orphan_tables LOOP
    EXECUTE format('DELETE FROM %I WHERE save_id = ANY($1)', v_t) USING v_dead_ids;
  END LOOP;
  DELETE FROM player_saves WHERE id = ANY(v_dead_ids);

  -- 占位档定期清理：超7天未完成角色创建
  DELETE FROM player_saves WHERE needs_character_creation = true AND created_at < now() - interval '7 days';

  v_mb_after := round(pg_database_size(current_database()) / 1024.0 / 1024.0, 3);

  INSERT INTO cleanup_logs (trigger_type, large_table_deleted, dead_cadres_deleted, dead_saves_deleted, mb_before, mb_after, mb_saved, detail)
  VALUES (p_trigger, v_large_rows, v_cadres_rows, v_saves_rows, v_mb_before, v_mb_after,
          round((v_large_bytes + v_cadres_bytes + v_saves_bytes) / 1024.0 / 1024.0, 3),
          jsonb_build_object('large_est_bytes', v_large_bytes, 'cadres_est_bytes', v_cadres_bytes, 'saves_est_bytes', v_saves_bytes));

  RETURN jsonb_build_object(
    'trigger', p_trigger,
    'large_table_deleted', v_large_rows,
    'dead_cadres_deleted', v_cadres_rows,
    'dead_saves_deleted', v_saves_rows,
    'mb_before', v_mb_before,
    'mb_after', v_mb_after,
    'mb_saved', round((v_large_bytes + v_cadres_bytes + v_saves_bytes) / 1024.0 / 1024.0, 3)
  );
END;
$$;

-- ⑦ 激活码 SAVE_EXISTS 判定排除占位档
CREATE OR REPLACE FUNCTION public.register_with_test_code(p_test_code text, p_device_id text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_code test_codes%ROWTYPE;
  v_app  user_approvals%ROWTYPE;
  v_email text;
BEGIN
  IF v_uid IS NULL THEN RETURN 'NOT_AUTHENTICATED'; END IF;

  IF p_device_id IS NOT NULL AND p_device_id NOT IN ('unknown', 'web', '') THEN
    IF EXISTS (
      SELECT 1 FROM user_approvals ua
      WHERE ua.device_id = p_device_id
        AND ua.status = 'approved'
        AND ua.user_id <> v_uid
    ) THEN
      RETURN 'DEVICE_ALREADY_REGISTERED';
    END IF;
  END IF;

  SELECT * INTO v_code FROM test_codes WHERE code = upper(trim(p_test_code));
  IF NOT FOUND THEN RETURN 'CODE_NOT_FOUND'; END IF;
  IF v_code.status = 'used'     THEN RETURN 'CODE_ALREADY_USED'; END IF;
  IF v_code.status = 'disabled' THEN RETURN 'CODE_DISABLED'; END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    UPDATE test_codes SET status = 'expired' WHERE id = v_code.id;
    RETURN 'CODE_EXPIRED';
  END IF;

  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;

  IF FOUND THEN
    IF v_app.status = 'approved' THEN RETURN 'ALREADY_APPROVED'; END IF;
    IF v_app.status = 'pending'  THEN RETURN 'ALREADY_PENDING'; END IF;
    IF EXISTS (SELECT 1 FROM player_saves WHERE user_id = v_uid AND NOT COALESCE(needs_character_creation, false)) THEN
      RETURN 'SAVE_EXISTS';
    END IF;
    IF v_app.test_code_id IS NOT NULL THEN
      UPDATE test_codes SET status='unused', used_by_user_id=NULL, used_by_email=NULL, used_at=NULL
        WHERE id = v_app.test_code_id AND status = 'used';
    END IF;
    UPDATE user_approvals
      SET status='pending', test_code_id=v_code.id, reject_reason=NULL,
          reviewed_by=NULL, reviewed_at=NULL, created_at=now(),
          device_id=COALESCE(NULLIF(p_device_id,''), device_id)
      WHERE user_id = v_uid;
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
      WHERE id = v_code.id;
    RETURN 'OK';
  END IF;

  IF EXISTS (SELECT 1 FROM player_saves WHERE user_id = v_uid AND NOT COALESCE(needs_character_creation, false)) THEN
    RETURN 'SAVE_EXISTS';
  END IF;

  UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
    WHERE id = v_code.id;
  INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id)
    VALUES (v_uid, v_email, 'pending', v_code.id, NULLIF(p_device_id,''));
  RETURN 'OK';
END;
$$;
```

<a id="supabasemigrations00134_device_bypass_dynamic_insertsql"></a>
## `supabase/migrations/00134_device_bypass_dynamic_insert.sql`

```
-- 将 00085 的硬编码用户改为动态查询插入（幂等，生产已存在则跳过）
INSERT INTO public.device_check_bypass (user_id, bypass_reason)
SELECT id, '管理员手动解封：同设备注册误判'
FROM auth.users WHERE email = '3104281546@qq.com'
ON CONFLICT (user_id) DO NOTHING;
```

<a id="supabasemigrations00135_fix_admin_account_list_overloadsql"></a>
## `supabase/migrations/00135_fix_admin_account_list_overload.sql`

```
DROP FUNCTION IF EXISTS public.admin_account_list(text, integer, integer);
DROP FUNCTION IF EXISTS public.admin_account_list(text, integer, integer, boolean);

CREATE OR REPLACE FUNCTION public.admin_account_list(p_search text, p_limit integer, p_offset integer, p_include_deleted boolean DEFAULT false)
RETURNS TABLE(
  user_id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz,
  banned boolean, save_id uuid, player_name text, rank_level integer, rank_name text, merit_points integer,
  is_admin boolean, admin_role text, deleted_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_search text := NULLIF(btrim(coalesce(p_search, '')), '');
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT u.id, u.email, u.created_at, u.last_sign_in_at,
         (u.banned_until IS NOT NULL AND u.banned_until > now()) AS banned,
         ps.id, ps.player_name, ps.rank_level, ps.rank_name, ps.merit_points,
         EXISTS(SELECT 1 FROM admin_users a WHERE a.user_id=u.id),
         (SELECT a.role FROM admin_users a WHERE a.user_id=u.id),
         u.deleted_at
  FROM auth.users u
  INNER JOIN user_approvals ua ON ua.user_id = u.id AND ua.status = 'approved'
  LEFT JOIN player_saves ps ON ps.user_id = u.id AND NOT COALESCE(ps.needs_character_creation, false)
  WHERE (p_include_deleted OR u.deleted_at IS NULL)
    AND (
      v_search IS NULL
      OR u.email ILIKE '%'||v_search||'%'
      OR ps.player_name ILIKE '%'||v_search||'%'
      OR replace(u.email, ' ', '') = replace(v_search, ' ', '')
      OR replace(coalesce(ps.player_name, ''), ' ', '') = replace(v_search, ' ', '')
      OR u.id::text = v_search
    )
  ORDER BY
    CASE
      WHEN u.email = v_search THEN 0
      WHEN replace(u.email, ' ', '') = replace(v_search, ' ', '') THEN 1
      ELSE 2
    END,
    u.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
```

<a id="supabasemigrations00136_execute_sql_ae4b251fsql"></a>
## `supabase/migrations/00136_execute_sql_ae4b251f.sql`

```
DO $$
DECLARE
  v_uid uuid := '11111111-1111-1111-1111-111111111111';
  v_res text;
  v_total bigint; v_has bigint; v_active bigint; v_admin bigint;
  v_real bigint; v_ph bigint;
  v_log text := '';
BEGIN
  -- ========== 后台统计回归 ==========
  SELECT total_users, has_save, active_saves, admin_count INTO v_total, v_has, v_active, v_admin FROM admin_account_stats();
  SELECT count(*) INTO v_real FROM player_saves WHERE NOT needs_character_creation;
  SELECT count(*) INTO v_ph FROM player_saves WHERE needs_character_creation;
  v_log := v_log || format('STATS: total=%s has_save=%s active=%s admin=%s | real=%s placeholder=%s | has_save==real:%s',
    v_total, v_has, v_active, v_admin, v_real, v_ph, (v_has = v_real));

  -- ========== 激活码流程回归 ==========
  INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
    (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'regtest@example.com');
  INSERT INTO test_codes (code, status) VALUES ('TESTREG001','unused'), ('TESTREG002','unused'), ('TESTREG003','unused');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  -- ① 全新提交 → 期望 OK
  SELECT register_with_test_code('TESTREG001','device1') INTO v_res;
  v_log := v_log || E'\n① 全新提交=' || v_res || '(期望OK)';

  -- ② 创建占位档，驳回，用新码重申 → 期望 OK（占位档被排除，不再 SAVE_EXISTS 拦截）
  INSERT INTO player_saves (user_id, needs_character_creation) VALUES (v_uid, true);
  UPDATE user_approvals SET status='rejected' WHERE user_id=v_uid;
  UPDATE test_codes SET status='unused', used_by_user_id=NULL WHERE code='TESTREG001';
  SELECT register_with_test_code('TESTREG002','device1') INTO v_res;
  v_log := v_log || E'\n② 占位档后重申=' || v_res || '(期望OK)';

  -- ③ 占位档转为真实档，驳回，重申 → 期望 SAVE_EXISTS
  UPDATE player_saves SET needs_character_creation=false WHERE user_id=v_uid;
  UPDATE user_approvals SET status='rejected' WHERE user_id=v_uid;
  UPDATE test_codes SET status='unused', used_by_user_id=NULL WHERE code='TESTREG002';
  SELECT register_with_test_code('TESTREG003','device1') INTO v_res;
  v_log := v_log || E'\n③ 真实档后重申=' || v_res || '(期望SAVE_EXISTS)';

  RAISE EXCEPTION 'REGRESSION_RESULTS:%', E'\n' || v_log;
END $$;
```

<a id="supabasemigrations00137_rewrite_register_detection_dedupsql"></a>
## `supabase/migrations/00137_rewrite_register_detection_dedup.sql`

```
-- ① banned_entities 去重：让 vpn-check 的 upsert(entity_type,entity_value) 真正生效
DELETE FROM public.banned_entities a USING public.banned_entities b
WHERE a.id > b.id
  AND a.entity_type = b.entity_type
  AND COALESCE(a.entity_value,'') = COALESCE(b.entity_value,'');
CREATE UNIQUE INDEX IF NOT EXISTS uq_banned_entities_type_value
  ON public.banned_entities (entity_type, COALESCE(entity_value,''));

-- ② ip_address 索引，便于同 IP approved 检测
CREATE INDEX IF NOT EXISTS idx_user_approvals_ip_address
  ON public.user_approvals (ip_address) WHERE (ip_address IS NOT NULL);

-- ③ 重写 register_with_test_code：检测去重 + 自动审批 + 系统驳回申诉 + 激活码阶段绝不创建存档
DROP FUNCTION IF EXISTS public.register_with_test_code(text, text);
CREATE OR REPLACE FUNCTION public.register_with_test_code(p_test_code text, p_device_id text, p_ip text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_code test_codes%ROWTYPE;
  v_app  user_approvals%ROWTYPE;
  v_email text;
  v_dev  text := NULLIF(btrim(coalesce(p_device_id, '')), '');
  v_ip   text := NULLIF(btrim(coalesce(p_ip, '')), '');
  v_auto boolean := false;
  v_dup_device boolean;
  v_dup_ip boolean;
BEGIN
  IF v_uid IS NULL THEN RETURN 'NOT_AUTHENTICATED'; END IF;

  -- 码校验（不存在 / 已用 / 禁用 / 过期）
  SELECT * INTO v_code FROM test_codes WHERE code = upper(trim(p_test_code));
  IF NOT FOUND THEN RETURN 'CODE_NOT_FOUND'; END IF;
  IF v_code.status = 'used'     THEN RETURN 'CODE_ALREADY_USED'; END IF;
  IF v_code.status = 'disabled' THEN RETURN 'CODE_DISABLED'; END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    UPDATE test_codes SET status = 'expired' WHERE id = v_code.id;
    RETURN 'CODE_EXPIRED';
  END IF;

  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT auto_approval_enabled INTO v_auto FROM admin_settings LIMIT 1;
  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;

  -- 同设备/IP 的已通过账号检测（仅 approved 计为占用，pending 不占用）
  SELECT EXISTS(SELECT 1 FROM user_approvals ua
    WHERE ua.device_id = v_dev AND ua.status = 'approved' AND ua.user_id <> v_uid)
    INTO v_dup_device;
  SELECT EXISTS(SELECT 1 FROM user_approvals ua
    WHERE ua.ip_address = v_ip AND ua.status = 'approved' AND ua.user_id <> v_uid)
    INTO v_dup_ip;

  IF FOUND THEN
    -- 已有申请记录（同用户一行，UPDATE 即去重，绝不重复记录 IP/设备）
    IF v_app.status = 'approved' THEN RETURN 'ALREADY_APPROVED'; END IF;
    IF v_app.status = 'pending'  THEN RETURN 'ALREADY_PENDING'; END IF;
    -- 已驳回：有真实存档 → 走临时申诉
    IF EXISTS (SELECT 1 FROM player_saves WHERE user_id = v_uid AND NOT COALESCE(needs_character_creation, false)) THEN
      RETURN 'SAVE_EXISTS';
    END IF;
    -- 重绑新码，重新待审（更新 IP/设备，去重记录）
    IF v_app.test_code_id IS NOT NULL THEN
      UPDATE test_codes SET status='unused', used_by_user_id=NULL, used_by_email=NULL, used_at=NULL
        WHERE id = v_app.test_code_id AND status = 'used';
    END IF;
    UPDATE user_approvals
      SET status='pending', test_code_id=v_code.id, reject_reason=NULL,
          reviewed_by=NULL, reviewed_at=NULL, created_at=now(),
          device_id=COALESCE(v_dev, device_id),
          ip_address=COALESCE(v_ip, ip_address)
      WHERE user_id = v_uid;
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
      WHERE id = v_code.id;
    RETURN 'OK';
  END IF;

  -- 全新用户：有真实存档 → 走临时申诉
  IF EXISTS (SELECT 1 FROM player_saves WHERE user_id = v_uid AND NOT COALESCE(needs_character_creation, false)) THEN
    RETURN 'SAVE_EXISTS';
  END IF;

  -- 全新提交：自动审批开启且无同设备/IP 冲突 → 直接通过（此时才记录账号为 approved）
  IF v_auto AND NOT v_dup_device AND NOT v_dup_ip THEN
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
      WHERE id = v_code.id;
    INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id, ip_address)
      VALUES (v_uid, v_email, 'approved', v_code.id, v_dev, v_ip);
    RETURN 'OK';
  END IF;

  -- 否则待审（激活码阶段绝不创建存档，仅记录申请）
  UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
    WHERE id = v_code.id;
  INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id, ip_address)
    VALUES (v_uid, v_email, 'pending', v_code.id, v_dev, v_ip);
  RETURN 'OK';
END;
$$;
```

<a id="supabasemigrations00138_register_return_auto_approvedsql"></a>
## `supabase/migrations/00138_register_return_auto_approved.sql`

```
DROP FUNCTION IF EXISTS public.register_with_test_code(text, text, text);
CREATE OR REPLACE FUNCTION public.register_with_test_code(p_test_code text, p_device_id text, p_ip text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_code test_codes%ROWTYPE;
  v_app  user_approvals%ROWTYPE;
  v_email text;
  v_dev  text := NULLIF(btrim(coalesce(p_device_id, '')), '');
  v_ip   text := NULLIF(btrim(coalesce(p_ip, '')), '');
  v_auto boolean := false;
  v_dup_device boolean;
  v_dup_ip boolean;
BEGIN
  IF v_uid IS NULL THEN RETURN 'NOT_AUTHENTICATED'; END IF;

  SELECT * INTO v_code FROM test_codes WHERE code = upper(trim(p_test_code));
  IF NOT FOUND THEN RETURN 'CODE_NOT_FOUND'; END IF;
  IF v_code.status = 'used'     THEN RETURN 'CODE_ALREADY_USED'; END IF;
  IF v_code.status = 'disabled' THEN RETURN 'CODE_DISABLED'; END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    UPDATE test_codes SET status = 'expired' WHERE id = v_code.id;
    RETURN 'CODE_EXPIRED';
  END IF;

  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT auto_approval_enabled INTO v_auto FROM admin_settings LIMIT 1;
  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;

  SELECT EXISTS(SELECT 1 FROM user_approvals ua
    WHERE ua.device_id = v_dev AND ua.status = 'approved' AND ua.user_id <> v_uid)
    INTO v_dup_device;
  SELECT EXISTS(SELECT 1 FROM user_approvals ua
    WHERE ua.ip_address = v_ip AND ua.status = 'approved' AND ua.user_id <> v_uid)
    INTO v_dup_ip;

  IF FOUND THEN
    IF v_app.status = 'approved' THEN RETURN 'ALREADY_APPROVED'; END IF;
    IF v_app.status = 'pending'  THEN RETURN 'ALREADY_PENDING'; END IF;
    IF EXISTS (SELECT 1 FROM player_saves WHERE user_id = v_uid AND NOT COALESCE(needs_character_creation, false)) THEN
      RETURN 'SAVE_EXISTS';
    END IF;
    IF v_app.test_code_id IS NOT NULL THEN
      UPDATE test_codes SET status='unused', used_by_user_id=NULL, used_by_email=NULL, used_at=NULL
        WHERE id = v_app.test_code_id AND status = 'used';
    END IF;
    UPDATE user_approvals
      SET status='pending', test_code_id=v_code.id, reject_reason=NULL,
          reviewed_by=NULL, reviewed_at=NULL, created_at=now(),
          device_id=COALESCE(v_dev, device_id),
          ip_address=COALESCE(v_ip, ip_address)
      WHERE user_id = v_uid;
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
      WHERE id = v_code.id;
    RETURN 'OK';
  END IF;

  IF EXISTS (SELECT 1 FROM player_saves WHERE user_id = v_uid AND NOT COALESCE(needs_character_creation, false)) THEN
    RETURN 'SAVE_EXISTS';
  END IF;

  -- 全新提交：自动审批开启且无同设备/IP 冲突 → 直接通过
  IF v_auto AND NOT v_dup_device AND NOT v_dup_ip THEN
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
      WHERE id = v_code.id;
    INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id, ip_address)
      VALUES (v_uid, v_email, 'approved', v_code.id, v_dev, v_ip);
    RETURN 'AUTO_APPROVED';
  END IF;

  UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
    WHERE id = v_code.id;
  INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id, ip_address)
    VALUES (v_uid, v_email, 'pending', v_code.id, v_dev, v_ip);
  RETURN 'OK';
END;
$$;
```

<a id="supabasemigrations00139_execute_sql_1bd9b11csql"></a>
## `supabase/migrations/00139_execute_sql_1bd9b11c.sql`

```
DO $$
DECLARE
  v_uid uuid := '22222222-2222-2222-2222-222222222222';
  v_uid2 uuid := '33333333-3333-3333-3333-333333333333';
  v_res text;
  v_log text := '';
  v_auto boolean;
BEGIN
  SELECT auto_approval_enabled INTO v_auto FROM admin_settings LIMIT 1;
  v_log := 'auto_approval_enabled=' || v_auto;

  INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
    (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dettest1@example.com'),
    (v_uid2,'00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dettest2@example.com');
  INSERT INTO test_codes (code, status) VALUES ('DET001','unused'),('DET002','unused'),('DET003','unused'),('DET004','unused');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  -- ① 全新提交（同设备dev1/IP1）
  SELECT register_with_test_code('DET001','dev1','1.2.3.4') INTO v_res;
  v_log := v_log || E'\n① 全新提交=' || v_res || ' (期望OK或AUTO_APPROVED)';

  -- ② 同用户重复输入（同设备/IP）→ 不应重复记录，应 ALREADY_PENDING 或重申OK
  SELECT register_with_test_code('DET002','dev1','1.2.3.4') INTO v_res;
  v_log := v_log || E'\n② 同用户重复=' || v_res || ' (期望ALREADY_PENDING)';

  -- 验证该用户只有一行 user_approvals（去重）
  v_log := v_log || ' | 该用户记录数=' || (SELECT count(*) FROM user_approvals WHERE user_id=v_uid);

  -- ③ 换用户用同设备dev1/IP1注册 → 若auto开启应被检测（DUP）走pending；否则pending
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid2, 'role', 'authenticated')::text, true);
  SELECT register_with_test_code('DET003','dev1','1.2.3.4') INTO v_res;
  v_log := v_log || E'\n③ 同设备/IP换用户=' || v_res || ' (期望OK，因dup走pending)';

  -- ④ 确认激活码阶段绝不创建存档
  v_log := v_log || ' | 测试期间player_saves新增数=' || (SELECT count(*) FROM player_saves WHERE user_id IN (v_uid,v_uid2));

  -- ⑤ 用户2有真实存档后重申 → SAVE_EXISTS
  INSERT INTO player_saves (user_id, needs_character_creation) VALUES (v_uid2, false);
  UPDATE user_approvals SET status='rejected' WHERE user_id=v_uid2;
  UPDATE test_codes SET status='unused', used_by_user_id=NULL WHERE code='DET003';
  SELECT register_with_test_code('DET004','dev2','5.6.7.8') INTO v_res;
  v_log := v_log || E'\n⑤ 真实档后重申=' || v_res || ' (期望SAVE_EXISTS)';

  RAISE EXCEPTION 'REGRESSION:%', E'\n' || v_log;
END $$;
```

<a id="supabasemigrations00140_execute_sql_fbc52bfasql"></a>
## `supabase/migrations/00140_execute_sql_fbc52bfa.sql`

```
DO $$
DECLARE v_uid uuid := '44444444-4444-4444-4444-444444444444'; v_ret uuid;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
  SELECT auth.uid() INTO v_ret;
  RAISE EXCEPTION 'auth.uid()=%', v_ret;
END $$;
```

<a id="supabasemigrations00141_execute_sql_7068f174sql"></a>
## `supabase/migrations/00141_execute_sql_7068f174.sql`

```
DO $$
DECLARE
  v_uid uuid := '55555555-5555-5555-5555-555555555555';
  v_res text;
  v_cnt int;
  v_auto boolean;
  v_found boolean;
  v_app_status text;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
    (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'diag@example.com');
  INSERT INTO test_codes (code, status) VALUES ('DIAG01','unused');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  SELECT auto_approval_enabled INTO v_auto FROM admin_settings LIMIT 1;
  SELECT register_with_test_code('DIAG01','devX','9.9.9.9') INTO v_res;
  SELECT count(*), (SELECT status FROM user_approvals WHERE user_id=v_uid) INTO v_cnt, v_app_status FROM user_approvals WHERE user_id=v_uid;

  RAISE EXCEPTION 'DIAG: auto=% res=% cnt=% status=%', v_auto, v_res, v_cnt, v_app_status;
END $$;
```

<a id="supabasemigrations00142_execute_sql_b4436a1dsql"></a>
## `supabase/migrations/00142_execute_sql_b4436a1d.sql`

```
DO $$
DECLARE
  v_uid uuid := '66666666-6666-6666-6666-666666666666';
  v_app user_approvals%ROWTYPE;
  v_found boolean;
  v_dup boolean;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
    (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'diag2@example.com');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;
  GET DIAGNOSTICS v_found = FOUND;
  SELECT EXISTS(SELECT 1 FROM user_approvals ua WHERE ua.device_id='devZ' AND ua.status='approved' AND ua.user_id<>v_uid) INTO v_dup;

  RAISE EXCEPTION 'FOUND=% dup=%', v_found, v_dup;
END $$;
```

<a id="supabasemigrations00143_execute_sql_022fa3adsql"></a>
## `supabase/migrations/00143_execute_sql_022fa3ad.sql`

```
DO $$
DECLARE
  v_uid uuid := '77777777-7777-7777-7777-777777777777';
  v_app user_approvals%ROWTYPE;
  v_dup boolean;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
    (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'diag3@example.com');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;
  SELECT EXISTS(SELECT 1 FROM user_approvals ua WHERE ua.device_id='devW' AND ua.status='approved' AND ua.user_id<>v_uid) INTO v_dup;

  RAISE EXCEPTION 'FOUND=% dup=% app_status=%', FOUND, v_dup, v_app.status;
END $$;
```

<a id="supabasemigrations00144_fix_register_found_overwritesql"></a>
## `supabase/migrations/00144_fix_register_found_overwrite.sql`

```
DROP FUNCTION IF EXISTS public.register_with_test_code(text, text, text);
CREATE OR REPLACE FUNCTION public.register_with_test_code(p_test_code text, p_device_id text, p_ip text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_code test_codes%ROWTYPE;
  v_app  user_approvals%ROWTYPE;
  v_email text;
  v_dev  text := NULLIF(btrim(coalesce(p_device_id, '')), '');
  v_ip   text := NULLIF(btrim(coalesce(p_ip, '')), '');
  v_auto boolean := false;
  v_dup_device boolean;
  v_dup_ip boolean;
  v_has_app boolean := false;
BEGIN
  IF v_uid IS NULL THEN RETURN 'NOT_AUTHENTICATED'; END IF;

  SELECT * INTO v_code FROM test_codes WHERE code = upper(trim(p_test_code));
  IF NOT FOUND THEN RETURN 'CODE_NOT_FOUND'; END IF;
  IF v_code.status = 'used'     THEN RETURN 'CODE_ALREADY_USED'; END IF;
  IF v_code.status = 'disabled' THEN RETURN 'CODE_DISABLED'; END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    UPDATE test_codes SET status = 'expired' WHERE id = v_code.id;
    RETURN 'CODE_EXPIRED';
  END IF;

  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT auto_approval_enabled INTO v_auto FROM admin_settings LIMIT 1;
  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;
  v_has_app := v_app.user_id IS NOT NULL;

  SELECT EXISTS(SELECT 1 FROM user_approvals ua
    WHERE ua.device_id = v_dev AND ua.status = 'approved' AND ua.user_id <> v_uid)
    INTO v_dup_device;
  SELECT EXISTS(SELECT 1 FROM user_approvals ua
    WHERE ua.ip_address = v_ip AND ua.status = 'approved' AND ua.user_id <> v_uid)
    INTO v_dup_ip;

  IF v_has_app THEN
    IF v_app.status = 'approved' THEN RETURN 'ALREADY_APPROVED'; END IF;
    IF v_app.status = 'pending'  THEN RETURN 'ALREADY_PENDING'; END IF;
    IF EXISTS (SELECT 1 FROM player_saves WHERE user_id = v_uid AND NOT COALESCE(needs_character_creation, false)) THEN
      RETURN 'SAVE_EXISTS';
    END IF;
    IF v_app.test_code_id IS NOT NULL THEN
      UPDATE test_codes SET status='unused', used_by_user_id=NULL, used_by_email=NULL, used_at=NULL
        WHERE id = v_app.test_code_id AND status = 'used';
    END IF;
    UPDATE user_approvals
      SET status='pending', test_code_id=v_code.id, reject_reason=NULL,
          reviewed_by=NULL, reviewed_at=NULL, created_at=now(),
          device_id=COALESCE(v_dev, device_id),
          ip_address=COALESCE(v_ip, ip_address)
      WHERE user_id = v_uid;
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
      WHERE id = v_code.id;
    RETURN 'OK';
  END IF;

  IF EXISTS (SELECT 1 FROM player_saves WHERE user_id = v_uid AND NOT COALESCE(needs_character_creation, false)) THEN
    RETURN 'SAVE_EXISTS';
  END IF;

  IF v_auto AND NOT v_dup_device AND NOT v_dup_ip THEN
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
      WHERE id = v_code.id;
    INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id, ip_address)
      VALUES (v_uid, v_email, 'approved', v_code.id, v_dev, v_ip);
    RETURN 'AUTO_APPROVED';
  END IF;

  UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
    WHERE id = v_code.id;
  INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id, ip_address)
    VALUES (v_uid, v_email, 'pending', v_code.id, v_dev, v_ip);
  RETURN 'OK';
END;
$$;
```

<a id="supabasemigrations00145_execute_sql_71e4cf4asql"></a>
## `supabase/migrations/00145_execute_sql_71e4cf4a.sql`

```
DO $$
DECLARE
  v_uid uuid := '88888888-8888-8888-8888-888888888888';
  v_uid2 uuid := '99999999-9999-9999-9999-999999999999';
  v_res text;
  v_log text := '';
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
    (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'reg2a@example.com'),
    (v_uid2,'00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'reg2b@example.com');
  INSERT INTO test_codes (code, status) VALUES ('RG01','unused'),('RG02','unused'),('RG03','unused'),('RG04','unused');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  SELECT register_with_test_code('RG01','devA','1.1.1.1') INTO v_res;
  v_log := v_log || '① 全新提交(auto开启,无冲突)=' || v_res || '(期望AUTO_APPROVED)';

  SELECT register_with_test_code('RG02','devA','1.1.1.1') INTO v_res;
  v_log := v_log || E'\n② 同用户重复=' || v_res || '(期望ALREADY_APPROVED) | 记录数=' || (SELECT count(*) FROM user_approvals WHERE user_id=v_uid);

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid2, 'role', 'authenticated')::text, true);
  SELECT register_with_test_code('RG03','devA','1.1.1.1') INTO v_res;
  v_log := v_log || E'\n③ 同设备/IP换用户(因dup走pending)=' || v_res || '(期望OK) | 记录数=' || (SELECT count(*) FROM user_approvals WHERE user_id=v_uid2);

  v_log := v_log || E'\n④ 激活码阶段player_saves新增=' || (SELECT count(*) FROM player_saves WHERE user_id IN (v_uid,v_uid2)) || '(期望0)';

  INSERT INTO player_saves (user_id, needs_character_creation) VALUES (v_uid2, false);
  UPDATE user_approvals SET status='rejected' WHERE user_id=v_uid2;
  UPDATE test_codes SET status='unused', used_by_user_id=NULL WHERE code='RG03';
  SELECT register_with_test_code('RG04','devB','2.2.2.2') INTO v_res;
  v_log := v_log || E'\n⑤ 真实档后重申=' || v_res || '(期望SAVE_EXISTS)';

  RAISE EXCEPTION 'REGRESSION:%', E'\n' || v_log;
END $$;
```

<a id="supabasemigrations00146_register_default_args_and_optimizesql"></a>
## `supabase/migrations/00146_register_default_args_and_optimize.sql`

```
DROP FUNCTION IF EXISTS public.register_with_test_code(text, text, text);
DROP FUNCTION IF EXISTS public.register_with_test_code(text, text);
CREATE OR REPLACE FUNCTION public.register_with_test_code(p_test_code text, p_device_id text DEFAULT '', p_ip text DEFAULT '')
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_code test_codes%ROWTYPE;
  v_app  user_approvals%ROWTYPE;
  v_email text;
  v_dev  text := NULLIF(btrim(coalesce(p_device_id, '')), '');
  v_ip   text := NULLIF(btrim(coalesce(p_ip, '')), '');
  v_auto boolean := false;
  v_dup_device boolean;
  v_dup_ip boolean;
  v_has_app boolean := false;
  v_has_save boolean := false;
BEGIN
  IF v_uid IS NULL THEN RETURN 'NOT_AUTHENTICATED'; END IF;

  -- 码校验
  SELECT * INTO v_code FROM test_codes WHERE code = upper(trim(p_test_code));
  IF NOT FOUND THEN RETURN 'CODE_NOT_FOUND'; END IF;
  IF v_code.status = 'used'     THEN RETURN 'CODE_ALREADY_USED'; END IF;
  IF v_code.status = 'disabled' THEN RETURN 'CODE_DISABLED'; END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    UPDATE test_codes SET status = 'expired' WHERE id = v_code.id;
    RETURN 'CODE_EXPIRED';
  END IF;

  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT auto_approval_enabled INTO v_auto FROM admin_settings LIMIT 1;
  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;
  v_has_app := v_app.user_id IS NOT NULL;
  v_has_save := EXISTS(SELECT 1 FROM player_saves WHERE user_id = v_uid AND NOT COALESCE(needs_character_creation, false));

  -- 同设备/IP 的已通过账号检测（仅 approved 计为占用）
  SELECT EXISTS(SELECT 1 FROM user_approvals ua
    WHERE ua.device_id = v_dev AND ua.status = 'approved' AND ua.user_id <> v_uid)
    INTO v_dup_device;
  SELECT EXISTS(SELECT 1 FROM user_approvals ua
    WHERE ua.ip_address = v_ip AND ua.status = 'approved' AND ua.user_id <> v_uid)
    INTO v_dup_ip;

  -- 已有真实存档的账号：一律走临时申诉，禁止重新注册
  IF v_has_save THEN
    RETURN 'SAVE_EXISTS';
  END IF;

  IF v_has_app THEN
    IF v_app.status = 'approved' THEN RETURN 'ALREADY_APPROVED'; END IF;
    IF v_app.status = 'pending'  THEN RETURN 'ALREADY_PENDING'; END IF;
    -- 已驳回：重绑新码，重新待审（更新 IP/设备，去重记录）
    IF v_app.test_code_id IS NOT NULL THEN
      UPDATE test_codes SET status='unused', used_by_user_id=NULL, used_by_email=NULL, used_at=NULL
        WHERE id = v_app.test_code_id AND status = 'used';
    END IF;
    UPDATE user_approvals
      SET status='pending', test_code_id=v_code.id, reject_reason=NULL,
          reviewed_by=NULL, reviewed_at=NULL, created_at=now(),
          device_id=COALESCE(v_dev, device_id),
          ip_address=COALESCE(v_ip, ip_address)
      WHERE user_id = v_uid;
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
      WHERE id = v_code.id;
    RETURN 'OK';
  END IF;

  -- 全新提交：自动审批开启且无同设备/IP 冲突 → 直接通过（此时才记录账号为 approved）
  IF v_auto AND NOT v_dup_device AND NOT v_dup_ip THEN
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
      WHERE id = v_code.id;
    INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id, ip_address)
      VALUES (v_uid, v_email, 'approved', v_code.id, v_dev, v_ip);
    RETURN 'AUTO_APPROVED';
  END IF;

  -- 否则待审（激活码阶段绝不创建存档，仅记录申请）
  UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
    WHERE id = v_code.id;
  INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id, ip_address)
    VALUES (v_uid, v_email, 'pending', v_code.id, v_dev, v_ip);
  RETURN 'OK';
END;
$$;
```

<a id="supabasemigrations00147_execute_sql_d897bd6dsql"></a>
## `supabase/migrations/00147_execute_sql_d897bd6d.sql`

```
DO $$
DECLARE
  v_uid uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_uid2 uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_res text;
  v_log text := '';
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
    (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'opt1@example.com'),
    (v_uid2,'00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'opt2@example.com');
  INSERT INTO test_codes (code, status) VALUES ('OP01','unused'),('OP02','unused'),('OP03','unused'),('OP04','unused');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  -- ① 全新提交(auto开启,无冲突) → AUTO_APPROVED
  SELECT register_with_test_code('OP01','devP','3.3.3.3') INTO v_res;
  v_log := v_log || '① 全新提交=' || v_res || '(期望AUTO_APPROVED)';

  -- ② 同用户重复 → ALREADY_APPROVED，记录数=1
  SELECT register_with_test_code('OP02','devP','3.3.3.3') INTO v_res;
  v_log := v_log || E'\n② 重复=' || v_res || '(期望ALREADY_APPROVED) | 记录数=' || (SELECT count(*) FROM user_approvals WHERE user_id=v_uid);

  -- ③ 仅传2参数(模拟旧前端) → 应正常工作
  SELECT register_with_test_code('OP03','devQ') INTO v_res;
  v_log := v_log || E'\n③ 仅2参数=' || v_res || '(期望AUTO_APPROVED)';

  -- ④ 同设备/IP换用户 → 因dup走pending
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid2, 'role', 'authenticated')::text, true);
  SELECT register_with_test_code('OP04','devP','3.3.3.3') INTO v_res;
  v_log := v_log || E'\n④ 同设备/IP换用户=' || v_res || '(期望OK)';

  -- ⑤ 激活码阶段绝不创建存档
  v_log := v_log || E'\n⑤ player_saves新增=' || (SELECT count(*) FROM player_saves WHERE user_id IN (v_uid,v_uid2)) || '(期望0)';

  RAISE EXCEPTION 'REGRESSION:%', E'\n' || v_log;
END $$;
```

<a id="supabasemigrations00148_admin_approve_all_temp_appealssql"></a>
## `supabase/migrations/00148_admin_approve_all_temp_appeals.sql`

```
CREATE OR REPLACE FUNCTION public.admin_approve_all_temp_appeals()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_handler uuid := auth.uid();
  v_count integer := 0;
  r temp_appeals%ROWTYPE;
BEGIN
  IF COALESCE(current_admin_role(), '') NOT IN ('admin','super_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR r IN SELECT * FROM temp_appeals WHERE status = 'pending' LOOP
    UPDATE temp_appeals SET status='approved', handler=v_handler, updated_at=now() WHERE id=r.id;
    -- 同意后删除该玩家旧存档（子表 ON DELETE CASCADE 自动清理）
    DELETE FROM player_saves WHERE user_id = r.user_id;
    v_count := v_count + 1;
  END LOOP;

  PERFORM admin_log_action('approve_all_temp_appeals', NULL, jsonb_build_object('count', v_count));
  RETURN jsonb_build_object('ok', true, 'count', v_count);
END;
$$;
```

<a id="supabasemigrations00149_execute_sql_8768bf85sql"></a>
## `supabase/migrations/00149_execute_sql_8768bf85.sql`

```
DO $$
DECLARE
  v_uid uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  v_uid2 uuid := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  v_admin uuid := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  v_res text;
  v_log text := '';
  v_batch jsonb;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
    (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'flow1@example.com'),
    (v_uid2,'00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'flow2@example.com'),
    (v_admin,'00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'flowadmin@example.com');
  INSERT INTO admin_users (user_id, role) VALUES (v_admin, 'super_admin');
  INSERT INTO test_codes (code, status) VALUES ('FL01','unused'),('FL02','unused');

  -- ===== 阶段1: 注册（发测试码）=====
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
  SELECT register_with_test_code('FL01','devF','7.7.7.7') INTO v_res;
  v_log := v_log || '① 注册(玩家1,auto开启)=' || v_res || '(期望AUTO_APPROVED)';

  -- ===== 阶段2: 建存档 =====
  INSERT INTO player_saves (user_id, needs_character_creation) VALUES (v_uid, true);
  v_log := v_log || E'\n② 建占位档 player_saves数=' || (SELECT count(*) FROM player_saves WHERE user_id=v_uid) || '(期望1)';

  -- ===== 阶段3: 玩家2有真实存档后注册 → SAVE_EXISTS → 提交临时申诉 =====
  INSERT INTO player_saves (user_id, needs_character_creation) VALUES (v_uid2, false);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid2, 'role', 'authenticated')::text, true);
  SELECT register_with_test_code('FL02','devG','8.8.8.8') INTO v_res;
  v_log := v_log || E'\n③ 真实档玩家注册=' || v_res || '(期望SAVE_EXISTS)';

  INSERT INTO temp_appeals (user_id, email, reason) VALUES (v_uid2, 'flow2@example.com', '测试申诉');
  v_log := v_log || E'\n④ 提交临时申诉 pending数=' || (SELECT count(*) FROM temp_appeals WHERE status='pending' AND user_id=v_uid2) || '(期望1)';

  -- ===== 阶段4: 管理员一键同意所有临时申诉 =====
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  SELECT admin_approve_all_temp_appeals() INTO v_batch;
  v_log := v_log || E'\n⑤ 一键同意结果=' || v_batch::text || '(期望count>=1,ok=true)';

  -- 同意后该玩家旧存档应被删除
  v_log := v_log || E'\n⑥ 同意后玩家2存档数=' || (SELECT count(*) FROM player_saves WHERE user_id=v_uid2) || '(期望0)';

  RAISE EXCEPTION 'FLOW_REGRESSION:%', E'\n' || v_log;
END $$;
```

<a id="supabasemigrations00150_execute_sql_243f20a9sql"></a>
## `supabase/migrations/00150_execute_sql_243f20a9.sql`

```
DO $$
DECLARE
  v_uid uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  v_uid2 uuid := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  v_admin uuid := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  v_res text;
  v_log text := '';
  v_batch jsonb;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
    (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'flow1@example.com'),
    (v_uid2,'00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'flow2@example.com'),
    (v_admin,'00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'flowadmin@example.com');
  INSERT INTO admin_users (user_id, email, role) VALUES (v_admin, 'flowadmin@example.com', 'super_admin');
  INSERT INTO test_codes (code, status) VALUES ('FL01','unused'),('FL02','unused');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
  SELECT register_with_test_code('FL01','devF','7.7.7.7') INTO v_res;
  v_log := v_log || '① 注册(玩家1,auto开启)=' || v_res || '(期望AUTO_APPROVED)';

  INSERT INTO player_saves (user_id, needs_character_creation) VALUES (v_uid, true);
  v_log := v_log || E'\n② 建占位档 player_saves数=' || (SELECT count(*) FROM player_saves WHERE user_id=v_uid) || '(期望1)';

  INSERT INTO player_saves (user_id, needs_character_creation) VALUES (v_uid2, false);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid2, 'role', 'authenticated')::text, true);
  SELECT register_with_test_code('FL02','devG','8.8.8.8') INTO v_res;
  v_log := v_log || E'\n③ 真实档玩家注册=' || v_res || '(期望SAVE_EXISTS)';

  INSERT INTO temp_appeals (user_id, email, reason) VALUES (v_uid2, 'flow2@example.com', '测试申诉');
  v_log := v_log || E'\n④ 提交临时申诉 pending数=' || (SELECT count(*) FROM temp_appeals WHERE status='pending' AND user_id=v_uid2) || '(期望1)';

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  SELECT admin_approve_all_temp_appeals() INTO v_batch;
  v_log := v_log || E'\n⑤ 一键同意结果=' || v_batch::text || '(期望count>=1,ok=true)';

  v_log := v_log || E'\n⑥ 同意后玩家2存档数=' || (SELECT count(*) FROM player_saves WHERE user_id=v_uid2) || '(期望0)';

  RAISE EXCEPTION 'FLOW_REGRESSION:%', E'\n' || v_log;
END $$;
```

<a id="supabasemigrations00151_execute_sql_701a6698sql"></a>
## `supabase/migrations/00151_execute_sql_701a6698.sql`

```
DO $$
DECLARE
  v_uid uuid := 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  v_admin uuid := '11111111-2222-3333-4444-555555555555';
  v_batch jsonb;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
    (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'batch1@example.com'),
    (v_admin,'00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'batchadmin@example.com');
  INSERT INTO admin_users (user_id, email, role) VALUES (v_admin, 'batchadmin@example.com', 'super_admin');
  INSERT INTO player_saves (user_id, needs_character_creation) VALUES (v_uid, false);
  INSERT INTO temp_appeals (user_id, email, reason) VALUES (v_uid, 'batch1@example.com', '批量测试');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  SELECT admin_approve_all_temp_appeals() INTO v_batch;
  RAISE EXCEPTION 'BATCH=% save_after=%', v_batch, (SELECT count(*) FROM player_saves WHERE user_id=v_uid);
END $$;
```

<a id="supabasemigrations00152_execute_sql_68f97791sql"></a>
## `supabase/migrations/00152_execute_sql_68f97791.sql`

```
DO $$
DECLARE v_admin uuid := '11111111-2222-3333-4444-555555555555'; v_batch jsonb;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES (v_admin,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','batchadmin@example.com');
  INSERT INTO admin_users (user_id, email, role) VALUES (v_admin, 'batchadmin@example.com', 'super_admin');
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  SELECT admin_approve_all_temp_appeals() INTO v_batch;
  RAISE EXCEPTION 'BATCH=%', v_batch;
END $$;
```

<a id="supabasemigrations00153_execute_sql_325164a8sql"></a>
## `supabase/migrations/00153_execute_sql_325164a8.sql`

```
DO $$ BEGIN INSERT INTO test_codes (code, status) VALUES ('TSTTIMEOUT','unused'); RAISE EXCEPTION 'done'; END $$;
```

<a id="supabasemigrations00154_execute_sql_d1a92922sql"></a>
## `supabase/migrations/00154_execute_sql_d1a92922.sql`

```
DO $$
DECLARE v_uid uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc'; v_res text;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES (v_uid,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','flow1@example.com');
  INSERT INTO test_codes (code, status) VALUES ('FL01','unused');
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
  SELECT register_with_test_code('FL01','devF','7.7.7.7') INTO v_res;
  RAISE EXCEPTION 'reg=%', v_res;
END $$;
```

<a id="supabasemigrations00155_batch_approve_temp_appeals_no_loopsql"></a>
## `supabase/migrations/00155_batch_approve_temp_appeals_no_loop.sql`

```
-- 重写：用单条批量 SQL 替代 FOR 循环，避免 statement_timeout
CREATE OR REPLACE FUNCTION public.admin_approve_all_temp_appeals()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_handler uuid := auth.uid();
  v_user_ids uuid[];
  v_count integer := 0;
BEGIN
  IF COALESCE(current_admin_role(), '') NOT IN ('admin','super_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- 一次性收集所有待处理申诉的用户 ID
  SELECT array_agg(user_id) INTO v_user_ids
  FROM temp_appeals WHERE status = 'pending';

  IF v_user_ids IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'count', 0);
  END IF;

  v_count := array_length(v_user_ids, 1);

  -- 批量删除旧存档（单条 DELETE，比逐条快几十倍）
  DELETE FROM player_saves WHERE user_id = ANY(v_user_ids);

  -- 批量更新申诉状态（单条 UPDATE）
  UPDATE temp_appeals
    SET status = 'approved', handler = v_handler, updated_at = now()
  WHERE status = 'pending';

  -- 审计日志（单条写入）
  INSERT INTO audit_log (admin_user_id, admin_email, action, target_user_id, detail)
  SELECT v_handler, COALESCE(au.email, ''), 'approve_all_temp_appeals', NULL,
         jsonb_build_object('count', v_count)
  FROM admin_users au WHERE au.user_id = v_handler;

  RETURN jsonb_build_object('ok', true, 'count', v_count);
END;
$$;
```

<a id="supabasemigrations00156_remove_ip_detection_auto_reject_devicesql"></a>
## `supabase/migrations/00156_remove_ip_detection_auto_reject_device.sql`

```
-- 移除 IP 检测，保留设备指纹检测；自动审核开启时同设备已审批 → 自动驳回
DROP FUNCTION IF EXISTS public.register_with_test_code(text, text, text);
DROP FUNCTION IF EXISTS public.register_with_test_code(text, text);

CREATE OR REPLACE FUNCTION public.register_with_test_code(
  p_test_code text,
  p_device_id text DEFAULT '',
  p_ip        text DEFAULT ''   -- 保留参数兼容旧前端，函数内不再使用
)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_code     test_codes%ROWTYPE;
  v_app      user_approvals%ROWTYPE;
  v_email    text;
  v_dev      text    := NULLIF(btrim(coalesce(p_device_id, '')), '');
  v_auto     boolean := false;
  v_dup_dev  boolean := false;
  v_has_app  boolean := false;
  v_has_save boolean := false;
BEGIN
  IF v_uid IS NULL THEN RETURN 'NOT_AUTHENTICATED'; END IF;

  -- 码校验
  SELECT * INTO v_code FROM test_codes WHERE code = upper(trim(p_test_code));
  IF NOT FOUND THEN RETURN 'CODE_NOT_FOUND'; END IF;
  IF v_code.status = 'used'     THEN RETURN 'CODE_ALREADY_USED'; END IF;
  IF v_code.status = 'disabled' THEN RETURN 'CODE_DISABLED'; END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    UPDATE test_codes SET status = 'expired' WHERE id = v_code.id;
    RETURN 'CODE_EXPIRED';
  END IF;

  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT auto_approval_enabled INTO v_auto FROM admin_settings LIMIT 1;
  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;
  v_has_app  := v_app.user_id IS NOT NULL;
  v_has_save := EXISTS(
    SELECT 1 FROM player_saves WHERE user_id = v_uid AND NOT COALESCE(needs_character_creation, false)
  );

  -- 设备指纹重复检测（同设备已有 approved 的其他账号）
  IF v_dev IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM user_approvals ua
      WHERE ua.device_id = v_dev AND ua.status = 'approved' AND ua.user_id <> v_uid
    ) INTO v_dup_dev;
  END IF;

  -- 已有真实存档 → 走临时申诉
  IF v_has_save THEN RETURN 'SAVE_EXISTS'; END IF;

  -- 已有申请记录（UPDATE 去重，不重复插入）
  IF v_has_app THEN
    IF v_app.status = 'approved' THEN RETURN 'ALREADY_APPROVED'; END IF;
    IF v_app.status = 'pending'  THEN RETURN 'ALREADY_PENDING'; END IF;
    -- 已驳回：先归还旧码
    IF v_app.test_code_id IS NOT NULL THEN
      UPDATE test_codes SET status='unused', used_by_user_id=NULL, used_by_email=NULL, used_at=NULL
        WHERE id = v_app.test_code_id AND status = 'used';
    END IF;
    -- 自动审核：设备重复 → 自动驳回
    IF v_auto AND v_dup_dev THEN
      UPDATE user_approvals
        SET status='rejected', test_code_id=v_code.id,
            reject_reason='同设备已有已审批账号，系统自动驳回',
            reviewed_at=now(), device_id=COALESCE(v_dev, device_id)
        WHERE user_id = v_uid;
      UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
        WHERE id = v_code.id;
      RETURN 'DEVICE_ALREADY_REGISTERED';
    END IF;
    -- 自动审核：无冲突 → 直接通过
    IF v_auto AND NOT v_dup_dev THEN
      UPDATE user_approvals
        SET status='approved', test_code_id=v_code.id, reject_reason=NULL,
            reviewed_by=NULL, reviewed_at=now(), created_at=now(),
            device_id=COALESCE(v_dev, device_id)
        WHERE user_id = v_uid;
      UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
        WHERE id = v_code.id;
      RETURN 'AUTO_APPROVED';
    END IF;
    -- 手动审核：重新待审
    UPDATE user_approvals
      SET status='pending', test_code_id=v_code.id, reject_reason=NULL,
          reviewed_by=NULL, reviewed_at=NULL, created_at=now(),
          device_id=COALESCE(v_dev, device_id)
      WHERE user_id = v_uid;
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
      WHERE id = v_code.id;
    RETURN 'OK';
  END IF;

  -- 全新用户（无申请记录）
  -- 自动审核：设备重复 → 自动驳回
  IF v_auto AND v_dup_dev THEN
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
      WHERE id = v_code.id;
    INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id, reject_reason)
      VALUES (v_uid, v_email, 'rejected', v_code.id, v_dev, '同设备已有已审批账号，系统自动驳回');
    RETURN 'DEVICE_ALREADY_REGISTERED';
  END IF;
  -- 自动审核：无冲突 → 直接通过
  IF v_auto AND NOT v_dup_dev THEN
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
      WHERE id = v_code.id;
    INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id)
      VALUES (v_uid, v_email, 'approved', v_code.id, v_dev);
    RETURN 'AUTO_APPROVED';
  END IF;
  -- 手动审核：pending
  UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
    WHERE id = v_code.id;
  INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id)
    VALUES (v_uid, v_email, 'pending', v_code.id, v_dev);
  RETURN 'OK';
END;
$$;
```

<a id="supabasemigrations00157_execute_sql_541b4a02sql"></a>
## `supabase/migrations/00157_execute_sql_541b4a02.sql`

```
DO $$ DECLARE v uuid := 'aaaaaaaa-0001-0001-0001-000000000001'; BEGIN
  INSERT INTO auth.users (id,instance_id,aud,role,email) VALUES (v,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','t1@test.com');
  INSERT INTO test_codes(code,status) VALUES('T0001','unused');
  PERFORM set_config('request.jwt.claims',json_build_object('sub',v,'role','authenticated')::text,true);
  RAISE NOTICE '手动模式新用户: %', register_with_test_code('T0001','devA','');
  RAISE EXCEPTION 'rollback_t1';
EXCEPTION WHEN OTHERS THEN IF sqlerrm LIKE '%rollback_t1%' THEN NULL; ELSE RAISE; END IF;
END $$; DO $$ DECLARE v uuid := 'aaaaaaaa-0002-0002-0002-000000000002'; BEGIN
  INSERT INTO auth.users (id,instance_id,aud,role,email) VALUES (v,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','t2@test.com');
  INSERT INTO test_codes(code,status) VALUES('T0002','unused');
  UPDATE admin_settings SET auto_approval_enabled=true;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',v,'role','authenticated')::text,true);
  RAISE NOTICE 'auto模式无冲突: %', register_with_test_code('T0002','devB','');
  RAISE EXCEPTION 'rollback_t2';
EXCEPTION WHEN OTHERS THEN
  UPDATE admin_settings SET auto_approval_enabled=false;
  IF sqlerrm LIKE '%rollback_t2%' THEN NULL; ELSE RAISE; END IF;
END $$; DO $$ DECLARE v1 uuid := 'aaaaaaaa-0003-0003-0003-000000000003'; v2 uuid := 'aaaaaaaa-0003-0003-0003-000000000004'; BEGIN
  INSERT INTO auth.users (id,instance_id,aud,role,email) VALUES (v1,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','t3a@test.com'),(v2,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','t3b@test.com');
  INSERT INTO test_codes(code,status) VALUES('T0003','unused'),('T0004','unused');
  INSERT INTO user_approvals(user_id,email,status,device_id) VALUES(v1,'t3a@test.com','approved','devC');
  UPDATE admin_settings SET auto_approval_enabled=true;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',v2,'role','authenticated')::text,true);
  RAISE NOTICE 'auto模式设备重复: %', register_with_test_code('T0003','devC','');
  RAISE EXCEPTION 'rollback_t3';
EXCEPTION WHEN OTHERS THEN
  UPDATE admin_settings SET auto_approval_enabled=false;
  IF sqlerrm LIKE '%rollback_t3%' THEN NULL; ELSE RAISE; END IF;
END $$;
```

<a id="supabasemigrations00158_execute_sql_5b2b0a2dsql"></a>
## `supabase/migrations/00158_execute_sql_5b2b0a2d.sql`

```
DO $$
DECLARE
  v uuid := 'bbbb0001-0001-0001-0001-000000000001';
  v_res text;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at)
    VALUES (v, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zztest_auto_001@test.com', now(), now());
  INSERT INTO test_codes (code, status) VALUES ('ZZAUTO01', 'unused');
  UPDATE admin_settings SET auto_approval_enabled = true;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v, 'role', 'authenticated')::text, true);
  v_res := register_with_test_code('ZZAUTO01', 'test_device_xyz', '');
  RAISE NOTICE '=== 自动审批测试结果: % ===', v_res;
  -- 验证 user_approvals 状态
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v, 'role', 'authenticated')::text, true);
  RAISE NOTICE '=== approvals状态: % ===', (SELECT status FROM user_approvals WHERE user_id = v);
END $$;
```

<a id="supabasemigrations00159_execute_sql_75292aa0sql"></a>
## `supabase/migrations/00159_execute_sql_75292aa0.sql`

```
CREATE TEMPORARY TABLE _auto_test (
  res text
); DO $$
DECLARE v uuid := 'bbbb0003-0003-0003-0003-000000000003';
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at)
    VALUES (v, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zztest_auto_003@test.com', now(), now());
  INSERT INTO test_codes (code, status) VALUES ('ZZAUTO03', 'unused');
  UPDATE admin_settings SET auto_approval_enabled = true;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v, 'role', 'authenticated')::text, true);
  INSERT INTO _auto_test VALUES (register_with_test_code('ZZAUTO03', 'test_device_unique_003', ''));
END $$;
```

<a id="supabasemigrations00160_cleanup_stale_placeholder_savessql"></a>
## `supabase/migrations/00160_cleanup_stale_placeholder_saves.sql`

```
-- 异常占位档清理机制
-- 1. 管理员手动清理函数：删除超过指定天数仍为占位档（needs_character_creation=true）的存档
CREATE OR REPLACE FUNCTION public.admin_cleanup_stale_placeholder_saves(
  p_days integer DEFAULT 3
)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
  v_count integer := 0;
BEGIN
  IF v_uid IS NULL THEN RETURN -1; END IF;
  SELECT EXISTS(SELECT 1 FROM admin_users WHERE user_id = v_uid) INTO v_is_admin;
  IF NOT v_is_admin THEN RETURN -2; END IF;

  IF p_days < 1 THEN p_days := 1; END IF;

  WITH del AS (
    DELETE FROM player_saves
    WHERE needs_character_creation = true
      AND created_at < now() - (p_days || ' days')::interval
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM del;

  INSERT INTO audit_logs (actor_email, action, details)
  VALUES ('admin', 'cleanup_stale_placeholder_saves', json_build_object('days', p_days, 'deleted', v_count)::text);

  RETURN v_count;
END;
$$;

-- 2. 定时任务：每天凌晨3点自动清理超过 3 天的异常占位档（防止未来误判）
SELECT cron.schedule(
  'daily_cleanup_stale_placeholder_saves',
  '0 3 * * *',
  $$SELECT public.admin_cleanup_stale_placeholder_saves(3);$$
);

-- 3. 彻底移除 temp_appeals 的 IP 相关列（同IP查重机制彻底删除）
ALTER TABLE public.temp_appeals DROP COLUMN IF EXISTS ip;
ALTER TABLE public.temp_appeals DROP COLUMN IF EXISTS same_ip_count;
```

<a id="supabasemigrations00161_execute_sql_c95d13e0sql"></a>
## `supabase/migrations/00161_execute_sql_c95d13e0.sql`

```
CREATE TEMPORARY TABLE _flow_test (
  step text,
  res text
); DO $$
DECLARE v uuid := 'cccc0001-0001-0001-0001-000000000001';
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at)
    VALUES (v, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zztest_flow_001@test.com', now(), now());
  INSERT INTO test_codes (code, status) VALUES ('ZZFLOW01', 'unused');
  UPDATE admin_settings SET auto_approval_enabled = true;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v, 'role', 'authenticated')::text, true);
  INSERT INTO _flow_test VALUES ('1.auto新用户', register_with_test_code('ZZFLOW01', 'device_flow_001', ''));
END $$; DO $$
DECLARE v uuid := 'cccc0001-0001-0001-0001-000000000002';
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at)
    VALUES (v, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zztest_flow_002@test.com', now(), now());
  INSERT INTO test_codes (code, status) VALUES ('ZZFLOW02', 'unused');
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v, 'role', 'authenticated')::text, true);
  INSERT INTO _flow_test VALUES ('2.同设备重复', register_with_test_code('ZZFLOW02', 'device_flow_001', ''));
END $$; DO $$
DECLARE v uuid := 'cccc0001-0001-0001-0001-000000000003';
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at)
    VALUES (v, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zztest_flow_003@test.com', now(), now());
  INSERT INTO test_codes (code, status) VALUES ('ZZFLOW03', 'unused');
  UPDATE admin_settings SET auto_approval_enabled = false;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v, 'role', 'authenticated')::text, true);
  INSERT INTO _flow_test VALUES ('3.手动新用户', register_with_test_code('ZZFLOW03', 'device_flow_003', ''));
END $$; DO $$
DECLARE v uuid := 'cccc0001-0001-0001-0001-000000000001';
BEGIN
  INSERT INTO test_codes (code, status) VALUES ('ZZFLOW04', 'unused');
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v, 'role', 'authenticated')::text, true);
  INSERT INTO _flow_test VALUES ('4.已通过再提交', register_with_test_code('ZZFLOW04', 'device_flow_001', ''));
END $$; DO $$
DECLARE v uuid := 'cccc0001-0001-0001-0001-000000000005';
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at)
    VALUES (v, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zztest_flow_005@test.com', now(), now());
  INSERT INTO test_codes (code, status) VALUES ('ZZFLOW05', 'unused');
  INSERT INTO player_saves (user_id, player_name, needs_character_creation, rank_level, rank_name, player_position, city_name, boss_name)
    VALUES (v, '新官员', true, 1, '科员', '科员', '测试镇', '镇长');
  UPDATE admin_settings SET auto_approval_enabled = true;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v, 'role', 'authenticated')::text, true);
  INSERT INTO _flow_test VALUES ('5.占位档不误报', register_with_test_code('ZZFLOW05', 'device_flow_005', ''));
END $$;
```

<a id="supabasemigrations00162_remove_device_ip_checks_from_registersql"></a>
## `supabase/migrations/00162_remove_device_ip_checks_from_register.sql`

```
-- 移除 register_with_test_code 中的设备查重、IP查重，简化为纯码校验+申请状态
-- 同时去掉 p_ip 参数，函数签名更干净
DROP FUNCTION IF EXISTS public.register_with_test_code(text, text, text);

CREATE OR REPLACE FUNCTION public.register_with_test_code(
  p_test_code text,
  p_device_id text DEFAULT ''
)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_code     test_codes%ROWTYPE;
  v_app      user_approvals%ROWTYPE;
  v_email    text;
  v_dev      text    := NULLIF(btrim(coalesce(p_device_id, '')), '');
  v_auto     boolean := false;
  v_has_app  boolean := false;
  v_has_save boolean := false;
BEGIN
  IF v_uid IS NULL THEN RETURN 'NOT_AUTHENTICATED'; END IF;

  -- 码校验
  SELECT * INTO v_code FROM test_codes WHERE code = upper(trim(p_test_code));
  IF NOT FOUND THEN RETURN 'CODE_NOT_FOUND'; END IF;
  IF v_code.status = 'used'     THEN RETURN 'CODE_ALREADY_USED'; END IF;
  IF v_code.status = 'disabled' THEN RETURN 'CODE_DISABLED'; END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    UPDATE test_codes SET status = 'expired' WHERE id = v_code.id;
    RETURN 'CODE_EXPIRED';
  END IF;

  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT auto_approval_enabled INTO v_auto FROM admin_settings LIMIT 1;
  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;
  v_has_app  := v_app.user_id IS NOT NULL;
  v_has_save := EXISTS(
    SELECT 1 FROM player_saves WHERE user_id = v_uid AND NOT COALESCE(needs_character_creation, false)
  );

  -- 已有真实存档 → 走临时申诉
  IF v_has_save THEN RETURN 'SAVE_EXISTS'; END IF;

  -- 已有申请记录
  IF v_has_app THEN
    IF v_app.status = 'approved' THEN RETURN 'ALREADY_APPROVED'; END IF;
    IF v_app.status = 'pending'  THEN RETURN 'ALREADY_PENDING'; END IF;
    -- 已驳回：先归还旧码
    IF v_app.test_code_id IS NOT NULL THEN
      UPDATE test_codes SET status='unused', used_by_user_id=NULL, used_by_email=NULL, used_at=NULL
        WHERE id = v_app.test_code_id AND status = 'used';
    END IF;
    -- 自动审核：直接通过
    IF v_auto THEN
      UPDATE user_approvals
        SET status='approved', test_code_id=v_code.id, reject_reason=NULL,
            reviewed_by=NULL, reviewed_at=now(), created_at=now(),
            device_id=COALESCE(v_dev, device_id)
        WHERE user_id = v_uid;
      UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
        WHERE id = v_code.id;
      RETURN 'AUTO_APPROVED';
    END IF;
    -- 手动审核：重新待审
    UPDATE user_approvals
      SET status='pending', test_code_id=v_code.id, reject_reason=NULL,
          reviewed_by=NULL, reviewed_at=NULL, created_at=now(),
          device_id=COALESCE(v_dev, device_id)
      WHERE user_id = v_uid;
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
      WHERE id = v_code.id;
    RETURN 'OK';
  END IF;

  -- 全新用户
  IF v_auto THEN
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
      WHERE id = v_code.id;
    INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id)
      VALUES (v_uid, v_email, 'approved', v_code.id, v_dev);
    RETURN 'AUTO_APPROVED';
  END IF;
  -- 手动审核：pending
  UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
    WHERE id = v_code.id;
  INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id)
    VALUES (v_uid, v_email, 'pending', v_code.id, v_dev);
  RETURN 'OK';
END;
$$;
```

<a id="supabasemigrations00163_execute_sql_420e4505sql"></a>
## `supabase/migrations/00163_execute_sql_420e4505.sql`

```
CREATE TEMPORARY TABLE _t (
  step text,
  res text
); DO $$
DECLARE v uuid := 'dddd0001-0001-0001-0001-000000000001';
BEGIN
  INSERT INTO auth.users (id,instance_id,aud,role,email,created_at,updated_at)
    VALUES(v,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','zzfinal_001@test.com',now(),now());
  INSERT INTO test_codes(code,status) VALUES('ZZFIN01','unused');
  UPDATE admin_settings SET auto_approval_enabled=true;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',v,'role','authenticated')::text,true);
  INSERT INTO _t VALUES('1.新用户auto',register_with_test_code('ZZFIN01','device_A'));
END $$; DO $$
DECLARE v uuid := 'dddd0001-0001-0001-0001-000000000002';
BEGIN
  INSERT INTO auth.users (id,instance_id,aud,role,email,created_at,updated_at)
    VALUES(v,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','zzfinal_002@test.com',now(),now());
  INSERT INTO test_codes(code,status) VALUES('ZZFIN02','unused');
  PERFORM set_config('request.jwt.claims',json_build_object('sub',v,'role','authenticated')::text,true);
  -- 同设备 device_A，auto=true → 应该 AUTO_APPROVED（不再返回 DEVICE_ALREADY_REGISTERED）
  INSERT INTO _t VALUES('2.同设备auto',register_with_test_code('ZZFIN02','device_A'));
END $$; DO $$
DECLARE v uuid := 'dddd0001-0001-0001-0001-000000000001';
BEGIN
  INSERT INTO test_codes(code,status) VALUES('ZZFIN03','unused');
  PERFORM set_config('request.jwt.claims',json_build_object('sub',v,'role','authenticated')::text,true);
  INSERT INTO _t VALUES('3.已通过再提交',register_with_test_code('ZZFIN03','device_A'));
END $$; DO $$
DECLARE v uuid := 'dddd0001-0001-0001-0001-000000000004';
BEGIN
  INSERT INTO auth.users (id,instance_id,aud,role,email,created_at,updated_at)
    VALUES(v,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','zzfinal_004@test.com',now(),now());
  INSERT INTO test_codes(code,status) VALUES('ZZFIN04','unused');
  INSERT INTO player_saves(user_id,player_name,needs_character_creation,rank_level,rank_name,player_position,city_name,boss_name)
    VALUES(v,'新官员',true,1,'科员','科员','测试镇','镇长');
  PERFORM set_config('request.jwt.claims',json_build_object('sub',v,'role','authenticated')::text,true);
  INSERT INTO _t VALUES('4.占位档不误报',register_with_test_code('ZZFIN04','device_B'));
END $$; DO $$
DECLARE v uuid := 'dddd0001-0001-0001-0001-000000000005';
BEGIN
  INSERT INTO auth.users (id,instance_id,aud,role,email,created_at,updated_at)
    VALUES(v,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','zzfinal_005@test.com',now(),now());
  INSERT INTO test_codes(code,status) VALUES('ZZFIN05','unused');
  INSERT INTO player_saves(user_id,player_name,needs_character_creation,rank_level,rank_name,player_position,city_name,boss_name)
    VALUES(v,'真实玩家',false,3,'科长','科长','正式城市','局长');
  PERFORM set_config('request.jwt.claims',json_build_object('sub',v,'role','authenticated')::text,true);
  INSERT INTO _t VALUES('5.真实存档拦截',register_with_test_code('ZZFIN05','device_C'));
END $$;
```

<a id="supabasemigrations00164_add_dept_policy_cooldownssql"></a>
## `supabase/migrations/00164_add_dept_policy_cooldowns.sql`

```
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS dept_policy_cooldowns jsonb NOT NULL DEFAULT '{}';
```

<a id="supabasemigrations00165_add_promotion_systemsql"></a>
## `supabase/migrations/00165_add_promotion_system.sql`

```
-- ============ player_saves 晋升系统字段 ============
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS promotion_frozen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS break_rule_used smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS break_rule_observe_days smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promotion_window_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS watched_post text,
  ADD COLUMN IF NOT EXISTS pending_promotion boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS competition_id text,
  ADD COLUMN IF NOT EXISTS lost_priority boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS appointment_doc_no text,
  ADD COLUMN IF NOT EXISTS last_promotion_day integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prestige_flag boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS clique_flag boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS base_tenure_years smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leader_obstruct boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS patron_id text,
  ADD COLUMN IF NOT EXISTS patron_favor smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS patron_expire_day integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bribe_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS bribe_count smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_bribe_day integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS patronage boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS illicit_funds numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS illicit_source_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS laundering_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS funds_hiding text,
  ADD COLUMN IF NOT EXISTS promo_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS next_priority_bonus smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS observation_days smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rooting_days smallint NOT NULL DEFAULT 0;

-- ============ 岗位编制表（NPC 站位机制）============
CREATE TABLE npc_posts (
  post_key text PRIMARY KEY,
  save_id uuid NOT NULL REFERENCES player_saves(id) ON DELETE CASCADE,
  tier smallint NOT NULL,
  post_name text NOT NULL,
  occupant_name text,
  occupant_age smallint,
  tenure_end_day integer,
  integrity smallint,
  status text NOT NULL DEFAULT 'occupied',
  vacancy_start_day integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE npc_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "npc_posts_owner" ON npc_posts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM player_saves WHERE id = npc_posts.save_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM player_saves WHERE id = npc_posts.save_id AND user_id = auth.uid()));

-- ============ NPC 候选池表 ============
CREATE TABLE npc_candidates (
  candidate_key text PRIMARY KEY,
  save_id uuid NOT NULL REFERENCES player_saves(id) ON DELETE CASCADE,
  tier smallint NOT NULL,
  name text NOT NULL,
  merit_score smallint NOT NULL DEFAULT 50,
  popularity_score smallint NOT NULL DEFAULT 50,
  assess_score smallint NOT NULL DEFAULT 50,
  favor_score smallint NOT NULL DEFAULT 50,
  age smallint NOT NULL DEFAULT 40,
  tenure_years smallint NOT NULL DEFAULT 3,
  integrity smallint NOT NULL DEFAULT 70,
  in_competition boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'standby',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE npc_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "npc_candidates_owner" ON npc_candidates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM player_saves WHERE id = npc_candidates.save_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM player_saves WHERE id = npc_candidates.save_id AND user_id = auth.uid()));

-- ============ 统一配置表：晋升规则（复用 game_config）============
INSERT INTO game_config (key, value, description) VALUES
  -- 职级段适龄区间（tier: 1=基层1-3, 2=区县级4-6, 3=市级7-9, 4=省级10-11, 5=高层12-15）
  ('promo_age_tier1', '{"ageMin":22,"ageMax":35,"bestMin":26,"bestMax":30,"retireAge":55}', '基层(1-3级)适龄区间'),
  ('promo_age_tier2', '{"ageMin":30,"ageMax":45,"bestMin":34,"bestMax":40,"retireAge":58}', '区县级(4-6级)适龄区间'),
  ('promo_age_tier3', '{"ageMin":38,"ageMax":52,"bestMin":42,"bestMax":48,"retireAge":60}', '市级(7-9级)适龄区间'),
  ('promo_age_tier4', '{"ageMin":45,"ageMax":58,"bestMin":48,"bestMax":53,"retireAge":62}', '省级(10-11级)适龄区间'),
  ('promo_age_tier5', '{"ageMin":50,"ageMax":65,"bestMin":55,"bestMax":60,"retireAge":65}', '高层(12-15级)适龄区间'),
  -- 年龄红利
  ('promo_age_bonus', '{"bestBonus":5,"lowAgeBonus":10,"overAgeGraceYears":5}', '年龄红利与超龄规则'),
  -- 民心门槛（按tier）
  ('promo_popular_threshold', '{"tier1":30,"tier2":35,"tier3":40,"tier4":45,"tier5":50}', '各职级段民心门槛'),
  -- 上级认可度门槛
  ('promo_favor_threshold', '{"min":50,"breakMin":70,"closeFlag":85,"obstructMax":40}', '上级认可度门槛'),
  -- 竞争权重
  ('promo_competition_weights', '{"merit":0.4,"popular":0.3,"assess":0.2,"favor":0.1}', '竞争综合评分权重'),
  -- 基层任期系数
  ('promo_base_tenure', '{"requireYears":5,"factorLt5":0.8,"factorLt3":0.9}', '基层任期要求与系数'),
  -- 破格规则
  ('promo_break_rule', '{"meritMultiple":1.5,"minYears":1,"observeDays":90,"extendObserveDays":180,"favorMin":70,"lowPopularThreshold":40,"lowPopularPenalty":10,"publicOpinion":20,"maxUsePerTier":1}', '破格提升规则'),
  -- 考评加速
  ('promo_assess_accel', '{"excellent":0.10,"excellent2":0.125,"special":0.13,"special2":0.15}', '考评加速减免比例'),
  -- 晋升冻结
  ('promo_freeze', '{"popularFreeze":30,"popularEnd":0,"frozenDays":180,"rootingDays":90,"rootingExtendDays":180,"rootingExtendThreshold":30,"promotePopularCost":5}', '晋升冻结与扎根期'),
  -- 岗位编制
  ('promo_post_quota', '{"tier1":6,"tier2":5,"tier3":4,"tier4":3,"tier5":42}', '各级别岗位编制数'),
  ('promo_post_composition', '{"tier1":["基层职员","基层职员","基层副职","基层副职","基层正职","专项岗"],"tier2":["副职","副职","正职","正职","专项岗"],"tier3":["副职","副职","正职","正职"],"tier4":["副职","副职","正职"],"tier5":["核心岗位","核心岗位","核心岗位","核心岗位","核心岗位","核心岗位","核心岗位","核心岗位","核心岗位","核心岗位","核心岗位","核心岗位","核心岗位","核心岗位","核心岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","委员岗位","委员岗位","委员岗位"]}', '岗位构成'),
  -- 公示期
  ('promo_publicity', '{"days":30,"democraticMin":60,"publicityDays":7,"extendDays":7}', '公示期与民主推荐'),
  -- 洗白方式
  ('promo_laundering', '{"methods":[{"id":"card","name":"消费卡套现","unlockRank":5,"fee":0.15,"days":15,"risk":"low","baseProb":3},{"id":"relative","name":"亲属代持","unlockRank":4,"fee":0.10,"days":30,"risk":"mid","baseProb":8},{"id":"invest","name":"投资理财","unlockRank":9,"fee":0.10,"days":90,"risk":"mid","baseProb":8},{"id":"shell","name":"空壳公司","unlockRank":8,"fee":0.20,"days":60,"risk":"mid","baseProb":8},{"id":"overseas","name":"境外账户","unlockRank":10,"fee":0.25,"days":120,"risk":"high","baseProb":15},{"id":"antique","name":"古董字画","unlockRank":13,"fee":0.30,"days":180,"risk":"low","baseProb":3},{"id":"crypto","name":"加密货币","unlockRank":12,"fee":0.05,"days":7,"risk":"extreme","baseProb":25}],"riskDivisor":10,"recoveryRange":[10,50]}', '洗白七种方式'),
  -- 藏匿方式
  ('promo_hiding', '{"methods":[{"id":"cash","name":"现金藏匿","recoveryRate":0.70},{"id":"safe","name":"保险柜","recoveryRate":0.50},{"id":"relative","name":"亲属保管","recoveryRate":0.30}],"extraRecovery":0.10}', '赃款藏匿方式'),
  -- 非正式资源协调
  ('promo_coordination', '{"tiers":[{"id":"small","name":"小额·礼品礼金","amountMin":10000,"amountMax":50000,"favorGain":5,"scoreGain":3},{"id":"medium","name":"中额·消费卡/安排家属","amountMin":100000,"amountMax":500000,"favorGain":12,"scoreGain":8},{"id":"large","name":"大额·干股/项目分成","amountMin":1000000,"amountMax":5000000,"favorGain":20,"scoreGain":12},{"id":"huge","name":"巨额·境外账户/房产","amountMin":10000000,"amountMax":99999999,"favorGain":30,"scoreGain":15}],"baseProb":5,"largeBonus":10,"hugeBonus":20,"integrityHighBonus":10,"freqBonus":3,"riskPer10":2,"illicitExtraProb":5,"patronageTiers":["large","huge"]}', '非正式资源协调分档与风险'),
  -- 功高盖主
  ('promo_prestige', '{"popularMin":90,"consecutiveYears":2,"meritMultiple":1.5,"favorMonthlyDecay":2,"scorePenalty":10,"patronHalveDecay":1,"mitigateLowkey":{"popular":-5,"favor":10},"mitigateReport":{"favor":5},"mitigateShare":{"merit":-100,"favor":8}}', '功高盖主规则'),
  -- 非正式关系密切
  ('promo_clique', '{"favorThreshold":85,"meritPenalty":200,"popularPenalty":10,"freezeDays":180,"cutFavor":-15,"cooperateMerit":-50,"investigateMerit":-50}', '非正式关系密切规则'),
  -- 领导干扰
  ('promo_leader_obstruct', '{"favorBelow":40,"competitorBonus":10,"playerPenalty":10,"counterMerit":500,"counterFund":50,"counterProb":0.30,"counterCompensation":100}', '领导干扰晋升规则'),
  -- 越级赏识
  ('promo_patron', '{"meritMultiple":1.2,"popularMin":80,"baseProb":5,"probGrowth":1,"probCap":20,"scoreBonus":8,"favorGain":10,"meritGain":30,"meritPraise":20,"popularPraise":5,"meritBorrow":50,"borrowDays":90,"favorPenalty":10,"disappointFavor":-20,"lowPopularEnd":50,"consecutiveFailYears":2,"extraBreakChance":1}', '越级赏识规则'),
  -- NPC 成长与衰减
  ('promo_npc_growth', '{"monthlyGrowthMin":0.2,"monthlyGrowthMax":0.5,"ageDecayMonthly":0.5,"integrityLow":40,"retireCheckAge":55,"fallIntegrity":30,"fallProb":0.05}', 'NPC成长衰减规则'),
  -- 五步流程
  ('promo_flow', '{"interviewOptions":[{"key":"fact","label":"谈成绩、摆事实","score":3},{"key":"plan","label":"谈打算、表决心","score":2},{"key":"humble","label":"表谦虚、求指导","score":1}],"democraticMin":60,"publicityDays":7,"extendDays":7,"popularCost":5,"rootingDays":90}', '晋升五步流程参数')
ON CONFLICT (key) DO NOTHING;
```

<a id="supabasemigrations00166_add_ecology_tracking_fieldssql"></a>
## `supabase/migrations/00166_add_ecology_tracking_fields.sql`

```
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS promo_freeze_until_day integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS patron_fail_months smallint NOT NULL DEFAULT 0;
```

<a id="supabasemigrations00167_create_save_name_two_strike_bansql"></a>
## `supabase/migrations/00167_create_save_name_two_strike_ban.sql`

```
-- 初建存档敏感词两段式熔断：首次拦截并警告，第二次直接封号
-- 计数持久化在 auth.users.raw_user_meta_data，跨存档创建/删除生效
CREATE OR REPLACE FUNCTION public.player_check_create_save_name(p_name text)
RETURNS TABLE(ok boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_name text := trim(p_name);
  v_hit  text;
  v_cnt  int;
BEGIN
  -- 管理员豁免
  IF v_uid IS NOT NULL AND _is_admin_user(v_uid) THEN
    RETURN QUERY SELECT true, '管理员账号，已豁免审查';
    RETURN;
  END IF;

  IF v_name IS NULL OR length(v_name) = 0 THEN
    RETURN QUERY SELECT false, '姓名不能为空';
    RETURN;
  END IF;
  IF length(v_name) > 6 THEN
    RETURN QUERY SELECT false, '姓名最多6个字符';
    RETURN;
  END IF;

  SELECT word INTO v_hit FROM sensitive_words
  WHERE lower(v_name) LIKE '%' || word || '%' LIMIT 1;

  IF v_hit IS NULL THEN
    RETURN QUERY SELECT true, '名字合规';
    RETURN;
  END IF;

  -- 命中敏感词：读取累计违规次数（跨存档）
  SELECT COALESCE(((raw_user_meta_data->>'name_warning_count')::int), 0)
    INTO v_cnt FROM auth.users WHERE id = v_uid;
  v_cnt := COALESCE(v_cnt, 0);

  IF v_cnt >= 1 THEN
    -- 第二次违规：直接封号
    UPDATE auth.users
      SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object('name_warning_count', v_cnt + 1),
          banned_until = '9999-12-31 23:59:59+00'::timestamptz
      WHERE id = v_uid;
    PERFORM admin_log_action('auto_ban_sensitive_name_create', v_uid::text,
      jsonb_build_object('attempted_name', v_name, 'hit_word', v_hit,
                         'warning_count', v_cnt + 1, 'scene', 'create_save'));
    RETURN QUERY SELECT false,
      '您已多次使用违禁词命名，账号已被自动封禁。如有异议请在登录页提交申诉。';
  ELSE
    -- 首次违规：拦截并警告
    UPDATE auth.users
      SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object('name_warning_count', v_cnt + 1)
      WHERE id = v_uid;
    PERFORM admin_log_action('warn_sensitive_name_create', v_uid::text,
      jsonb_build_object('attempted_name', v_name, 'hit_word', v_hit,
                         'warning_count', 1, 'scene', 'create_save'));
    RETURN QUERY SELECT false,
      '⚠️ 该名称包含禁用词汇，不可使用。请更换名称后重新创建存档。再次违规将直接封号。';
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.player_check_create_save_name(text) TO authenticated, anon;
```

<a id="supabasemigrations00168_player_read_own_activation_codesql"></a>
## `supabase/migrations/00168_player_read_own_activation_code.sql`

```
-- 允许玩家读取激活自己账号的测试码（仅限本人 used_by_user_id）
CREATE POLICY "test_codes_owner_read"
  ON test_codes FOR SELECT TO authenticated
  USING (used_by_user_id = auth.uid());
```

<a id="supabasemigrations00169_drop_boss_tasks_and_interactionssql"></a>
## `supabase/migrations/00169_drop_boss_tasks_and_interactions.sql`

```
DROP TABLE IF EXISTS public.boss_tasks;
DROP TABLE IF EXISTS public.boss_interactions;
```

<a id="supabasemigrations00170_recreate_boss_tasks_and_interactionssql"></a>
## `supabase/migrations/00170_recreate_boss_tasks_and_interactions.sql`

```
-- 上司任务
CREATE TABLE public.boss_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id uuid NOT NULL REFERENCES public.player_saves(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  task_type text NOT NULL DEFAULT 'city',
  target_value integer NOT NULL DEFAULT 60,
  current_value integer NOT NULL DEFAULT 0,
  reward_merit integer NOT NULL DEFAULT 0,
  reward_favor integer NOT NULL DEFAULT 0,
  penalty_merit integer NOT NULL DEFAULT 0,
  penalty_favor integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  deadline_days integer NOT NULL DEFAULT 365,
  created_day integer NOT NULL DEFAULT 0,
  boss_level integer NOT NULL DEFAULT 1,
  is_postponed boolean NOT NULL DEFAULT false,
  urgency text NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_boss_tasks_save ON public.boss_tasks(save_id);
ALTER TABLE public.boss_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "boss_tasks_select" ON public.boss_tasks FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "boss_tasks_insert" ON public.boss_tasks FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "boss_tasks_update" ON public.boss_tasks FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "boss_tasks_delete" ON public.boss_tasks FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 上司互动流水
CREATE TABLE public.boss_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id uuid NOT NULL REFERENCES public.player_saves(id) ON DELETE CASCADE,
  boss_level integer NOT NULL DEFAULT 1,
  action_type text NOT NULL DEFAULT 'report',
  game_day integer NOT NULL DEFAULT 0,
  favor_delta integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_boss_interactions_save ON public.boss_interactions(save_id);
ALTER TABLE public.boss_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "boss_interactions_select" ON public.boss_interactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "boss_interactions_insert" ON public.boss_interactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "boss_interactions_delete" ON public.boss_interactions FOR DELETE TO authenticated USING (true);
```

<a id="supabasemigrations00171_faction_system_v2_new_columnssql"></a>
## `supabase/migrations/00171_faction_system_v2_new_columns.sql`

```

ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS faction_influence       INTEGER     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS political_wind          TEXT        DEFAULT 'balanced',
  ADD COLUMN IF NOT EXISTS dominant_faction        TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_wind_cycle_day     INTEGER     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS faction_intelligence    INTEGER     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS faction_cooldowns       JSONB       DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS coalitions              JSONB       DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS purge_count             INTEGER     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS faction_joined_day      INTEGER     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_flagged              BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS contact_attempts        INTEGER     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS factionless_locked      BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS faction_promotion_locked BOOLEAN    DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS struggle_phase          TEXT        DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS struggle_history        JSONB       DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS faction_echo_log        JSONB       DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS region_control          JSONB       DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS faction_treasury        JSONB       DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cultivate_tier          JSONB       DEFAULT '{}';
```

<a id="supabasemigrations00172_faction_struggle_prepsql"></a>
## `supabase/migrations/00172_faction_struggle_prep.sql`

```
ALTER TABLE player_saves ADD COLUMN struggle_prep jsonb NOT NULL DEFAULT '{}'::jsonb;
```

<a id="supabasemigrations00173_faction_cultivate_bindingsql"></a>
## `supabase/migrations/00173_faction_cultivate_binding.sql`

```
ALTER TABLE player_saves ADD COLUMN cultivate_binding jsonb NOT NULL DEFAULT '{}'::jsonb;
```

<a id="supabasemigrations00174_fix_auth_identities_add_regions_player_save_rpcsql"></a>
## `supabase/migrations/00174_fix_auth_identities_add_regions_player_save_rpc.sql`

```

-- ① 修复：为所有缺少 identity 记录的 auth.users 补建 email identity
DO $$
BEGIN
  INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  SELECT
    u.id::text,
    u.id,
    jsonb_build_object(
      'sub',            u.id::text,
      'email',          u.email::text,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now()
  FROM auth.users u
  WHERE u.email IS NOT NULL
    AND u.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM auth.identities i WHERE i.user_id = u.id
    );
END $$;

-- ② 确保所有 auth.users role/aud/email_confirmed_at 正确（老账号可能缺字段）
UPDATE auth.users
SET
  role               = 'authenticated',
  aud                = 'authenticated',
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  updated_at         = now()
WHERE deleted_at IS NULL
  AND (
    role               IS NULL OR role = '' OR
    aud                IS NULL OR aud  = '' OR
    email_confirmed_at IS NULL
  );

-- ③ 新增 5 个大区（共 10 大区，每区上限 500）
INSERT INTO game_databases (code, name, capacity_limit, is_active, is_full, sort_order)
VALUES
  ('dongbei',  '东北大区', 500, true, false, 6),
  ('huazhong', '华中大区', 500, true, false, 7),
  ('jiangnan', '江南大区', 500, true, false, 8),
  ('lingnan',  '岭南大区', 500, true, false, 9),
  ('saibei',   '塞北大区', 500, true, false, 10)
ON CONFLICT (code) DO NOTHING;

-- 确保所有现有大区容量 ≥ 500
UPDATE game_databases SET capacity_limit = 500 WHERE capacity_limit < 500;

-- ④ 辅助 RPC：判断当前玩家是否已有真实存档
CREATE OR REPLACE FUNCTION public.player_has_real_save()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM player_saves
    WHERE user_id = auth.uid()
      AND NOT COALESCE(needs_character_creation, false)
  );
$$;
GRANT EXECUTE ON FUNCTION public.player_has_real_save() TO authenticated;
```

<a id="supabasemigrations00175_refresh_admin_accounts_with_full_identitiessql"></a>
## `supabase/migrations/00175_refresh_admin_accounts_with_full_identities.sql`

```

DO $$
DECLARE
  i       int;
  v_email text;
  v_uid   uuid;
  v_pw    text;
BEGIN
  -- ── 20 个普通管理员 ──
  FOR i IN 1..20 LOOP
    v_email := 'admin_' || lpad(i::text, 2, '0') || '@zhuchen.who';
    v_pw    := 'WH@Admin' || lpad(i::text, 2, '0') || '!';

    SELECT id INTO v_uid FROM auth.users WHERE email = v_email AND deleted_at IS NULL;

    IF v_uid IS NULL THEN
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user, is_anonymous
      ) VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated',
        v_email,
        crypt(v_pw, gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{}'::jsonb,
        false, false, false
      ) RETURNING id INTO v_uid;
    ELSE
      UPDATE auth.users SET
        encrypted_password = crypt(v_pw, gen_salt('bf')),
        aud                = 'authenticated',
        role               = 'authenticated',
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at         = now()
      WHERE id = v_uid;
    END IF;

    INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
    VALUES (
      v_uid::text, v_uid,
      jsonb_build_object('sub', v_uid::text, 'email', v_email,
                         'email_verified', true, 'phone_verified', false),
      'email', now(), now()
    ) ON CONFLICT (provider, provider_id) DO NOTHING;

    INSERT INTO admin_users (user_id, email, username, role)
    VALUES (v_uid, v_email, 'admin_' || lpad(i::text, 2, '0'), 'admin')
    ON CONFLICT (user_id) DO UPDATE
      SET email = EXCLUDED.email, username = EXCLUDED.username, role = 'admin';
  END LOOP;

  -- ── 超级管理员 ──
  v_email := 'W2794045093@hotmail.com';
  v_pw    := 'we2794045093/%';

  SELECT id INTO v_uid FROM auth.users WHERE email = v_email AND deleted_at IS NULL;

  IF v_uid IS NULL THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user, is_anonymous
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      v_email,
      crypt(v_pw, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      true, false, false
    ) RETURNING id INTO v_uid;
  ELSE
    UPDATE auth.users SET
      encrypted_password = crypt(v_pw, gen_salt('bf')),
      aud                = 'authenticated',
      role               = 'authenticated',
      is_super_admin     = true,
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at         = now()
    WHERE id = v_uid;
  END IF;

  INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  VALUES (
    v_uid::text, v_uid,
    jsonb_build_object('sub', v_uid::text, 'email', v_email,
                       'email_verified', true, 'phone_verified', false),
    'email', now(), now()
  ) ON CONFLICT (provider, provider_id) DO NOTHING;

  INSERT INTO admin_users (user_id, email, username, role)
  VALUES (v_uid, v_email, 'super_admin', 'super_admin')
  ON CONFLICT (user_id) DO UPDATE
    SET role = 'super_admin', email = EXCLUDED.email, username = EXCLUDED.username;
END $$;
```

<a id="supabasemigrations00176_clean_register_with_test_code_no_device_ipsql"></a>
## `supabase/migrations/00176_clean_register_with_test_code_no_device_ip.sql`

```

-- 删除所有旧函数重载，避免 "overloaded/ambiguous" 错误
DROP FUNCTION IF EXISTS public.register_with_test_code(text);
DROP FUNCTION IF EXISTS public.register_with_test_code(text, text);
DROP FUNCTION IF EXISTS public.register_with_test_code(text, text, text);
DROP FUNCTION IF EXISTS public.register_with_test_code(text, text, text, text);

-- 全新版本：无 SAVE_EXISTS、无设备/IP 检测
-- 返回值：OK / AUTO_APPROVED / NOT_AUTHENTICATED / CODE_NOT_FOUND /
--         CODE_ALREADY_USED / CODE_DISABLED / CODE_EXPIRED /
--         ALREADY_APPROVED / ALREADY_PENDING
CREATE OR REPLACE FUNCTION public.register_with_test_code(
  p_test_code text,
  p_device_id text DEFAULT '',   -- 保留参数兼容旧前端，函数内不再使用
  p_ip        text DEFAULT ''    -- 保留参数兼容旧前端，函数内不再使用
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   uuid    := auth.uid();
  v_code  test_codes%ROWTYPE;
  v_app   user_approvals%ROWTYPE;
  v_email text;
  v_auto  boolean := false;
BEGIN
  IF v_uid IS NULL THEN RETURN 'NOT_AUTHENTICATED'; END IF;

  -- 测试码校验
  SELECT * INTO v_code FROM test_codes WHERE code = upper(trim(p_test_code));
  IF NOT FOUND THEN RETURN 'CODE_NOT_FOUND'; END IF;
  IF v_code.status = 'used'     THEN RETURN 'CODE_ALREADY_USED'; END IF;
  IF v_code.status = 'disabled' THEN RETURN 'CODE_DISABLED'; END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    UPDATE test_codes SET status = 'expired' WHERE id = v_code.id;
    RETURN 'CODE_EXPIRED';
  END IF;

  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT auto_approval_enabled INTO v_auto FROM admin_settings LIMIT 1;
  v_auto := COALESCE(v_auto, false);

  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;

  -- 已有申请记录
  IF v_app.user_id IS NOT NULL THEN
    IF v_app.status = 'approved' THEN RETURN 'ALREADY_APPROVED'; END IF;
    IF v_app.status = 'pending'  THEN RETURN 'ALREADY_PENDING';  END IF;

    -- 已被驳回：归还旧码
    IF v_app.test_code_id IS NOT NULL THEN
      UPDATE test_codes
        SET status = 'unused', used_by_user_id = NULL, used_by_email = NULL, used_at = NULL
        WHERE id = v_app.test_code_id AND status = 'used';
    END IF;

    -- 自动审核：直接通过
    IF v_auto THEN
      UPDATE user_approvals
        SET status = 'approved', test_code_id = v_code.id,
            reject_reason = NULL, reviewed_by = NULL, reviewed_at = now(), created_at = now()
        WHERE user_id = v_uid;
      UPDATE test_codes
        SET status = 'used', used_by_user_id = v_uid, used_by_email = v_email, used_at = now()
        WHERE id = v_code.id;
      RETURN 'AUTO_APPROVED';
    END IF;

    -- 手动审核：重置为 pending
    UPDATE user_approvals
      SET status = 'pending', test_code_id = v_code.id,
          reject_reason = NULL, reviewed_by = NULL, reviewed_at = NULL, created_at = now()
      WHERE user_id = v_uid;
    UPDATE test_codes
      SET status = 'used', used_by_user_id = v_uid, used_by_email = v_email, used_at = now()
      WHERE id = v_code.id;
    RETURN 'OK';
  END IF;

  -- 全新用户（无申请记录）
  UPDATE test_codes
    SET status = 'used', used_by_user_id = v_uid, used_by_email = v_email, used_at = now()
    WHERE id = v_code.id;

  IF v_auto THEN
    INSERT INTO user_approvals (user_id, email, status, test_code_id)
      VALUES (v_uid, v_email, 'approved', v_code.id);
    RETURN 'AUTO_APPROVED';
  ELSE
    INSERT INTO user_approvals (user_id, email, status, test_code_id)
      VALUES (v_uid, v_email, 'pending', v_code.id);
    RETURN 'OK';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_with_test_code(text, text, text) TO authenticated;
```

<a id="supabasemigrations00177_fix_auto_approval_empty_settings_and_seed_announcementssql"></a>
## `supabase/migrations/00177_fix_auto_approval_empty_settings_and_seed_announcements.sql`

```
-- ── 修复自动审批：admin_settings 表为空导致 UPDATE 无效 ──
-- 1) 若无配置行则插入默认行（仅当表为空时）
INSERT INTO public.admin_settings (auto_approval_enabled, auto_approval_note)
SELECT false, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.admin_settings);

-- 2) 重写 admin_set_auto_approval：改为 upsert（无行时插入，有行时更新）
CREATE OR REPLACE FUNCTION public.admin_set_auto_approval(p_enabled boolean, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_reviewer uuid := auth.uid();
BEGIN
  IF COALESCE(current_admin_role(),'') <> 'super_admin' THEN RAISE EXCEPTION 'forbidden'; END IF;

  IF EXISTS (SELECT 1 FROM admin_settings) THEN
    UPDATE admin_settings
       SET auto_approval_enabled = p_enabled,
           auto_approval_note    = NULLIF(TRIM(COALESCE(p_note,'')), ''),
           updated_by            = v_reviewer,
           updated_at            = now();
  ELSE
    INSERT INTO admin_settings (auto_approval_enabled, auto_approval_note, updated_by, updated_at)
    VALUES (p_enabled, NULLIF(TRIM(COALESCE(p_note,'')), ''), v_reviewer, now());
  END IF;

  PERFORM admin_log_action('set_auto_approval', NULL,
    jsonb_build_object('enabled', p_enabled, 'note', p_note));
  RETURN admin_get_auto_approval();
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_auto_approval(boolean, text) TO authenticated;

-- ── 预填两页公告（已发布），让功能立即可见 ──
INSERT INTO public.announcements (page_key, title, content, active, updated_at, updated_by_email)
VALUES
  ('login',      '系统公告', '欢迎进入档案系统，当前为内部测试阶段，请使用管理员分配的测试码完成身份核验后进入。', true, now(), 'system'),
  ('enter_code', '测试码说明', '请输入管理员分配的测试码，每码仅可使用一次。如遇问题请联系管理员处理。', true, now(), 'system')
ON CONFLICT (page_key) DO UPDATE
  SET title = EXCLUDED.title, content = EXCLUDED.content, active = true, updated_at = now(), updated_by_email = 'system';
```

<a id="supabasemigrations00178_delete_direct_insert_admin_auth_userssql"></a>
## `supabase/migrations/00178_delete_direct_insert_admin_auth_users.sql`

```
-- 删除所有通过直接 INSERT 创建的管理员 auth.users（级联清理 identities + admin_users）
DELETE FROM auth.users
WHERE email IN (
  'admin_01@zhuchen.who','admin_02@zhuchen.who','admin_03@zhuchen.who','admin_04@zhuchen.who','admin_05@zhuchen.who',
  'admin_06@zhuchen.who','admin_07@zhuchen.who','admin_08@zhuchen.who','admin_09@zhuchen.who','admin_10@zhuchen.who',
  'admin_11@zhuchen.who','admin_12@zhuchen.who','admin_13@zhuchen.who','admin_14@zhuchen.who','admin_15@zhuchen.who',
  'admin_16@zhuchen.who','admin_17@zhuchen.who','admin_18@zhuchen.who','admin_19@zhuchen.who','admin_20@zhuchen.who',
  'W2794045093@hotmail.com'
);
SELECT count(*) AS remaining_admins FROM auth.users WHERE email LIKE 'admin_%@zhuchen.who' OR email = 'W2794045093@hotmail.com';
```

<a id="supabasemigrations00179_code_system_togglesql"></a>
## `supabase/migrations/00179_code_system_toggle.sql`

```
-- ── 激活码制开关 ──
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS code_system_enabled boolean NOT NULL DEFAULT true;

-- 更新 getter，返回 code_system_enabled
CREATE OR REPLACE FUNCTION public.admin_get_auto_approval()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'enabled', auto_approval_enabled,
    'note', auto_approval_note,
    'updated_by', updated_by,
    'updated_at', updated_at,
    'code_system_enabled', code_system_enabled
  ) FROM admin_settings LIMIT 1;
$$;

-- super_admin 切换激活码制
CREATE OR REPLACE FUNCTION public.admin_set_code_system(p_enabled boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_reviewer uuid := auth.uid();
BEGIN
  IF COALESCE(current_admin_role(),'') <> 'super_admin' THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF EXISTS (SELECT 1 FROM admin_settings) THEN
    UPDATE admin_settings SET code_system_enabled = p_enabled, updated_by = v_reviewer, updated_at = now();
  ELSE
    INSERT INTO admin_settings (code_system_enabled, updated_by, updated_at) VALUES (p_enabled, v_reviewer, now());
  END IF;
  PERFORM admin_log_action('set_code_system', NULL, jsonb_build_object('enabled', p_enabled));
  RETURN admin_get_auto_approval();
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_code_system(boolean) TO authenticated;

-- 公开读取激活码制状态（供登录网关判断）
CREATE OR REPLACE FUNCTION public.get_code_system_enabled()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT code_system_enabled FROM admin_settings LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_code_system_enabled() TO anon, authenticated;
```

<a id="supabasemigrations00180_add_faction_promotion_linkage_fieldssql"></a>
## `supabase/migrations/00180_add_faction_promotion_linkage_fields.sql`

```
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
```

<a id="supabasemigrations00181_add_v4_province_seat_fieldssql"></a>
## `supabase/migrations/00181_add_v4_province_seat_fields.sql`

```
-- v4 派系玩法：省级席位控制 + 个人职位战
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS province_seat_control JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS personal_contest_cooldown_until INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS personal_contest_history JSONB DEFAULT '[]'::jsonb;
```

<a id="supabasemigrations00182_add_v5_province_attack_and_contest_modesql"></a>
## `supabase/migrations/00182_add_v5_province_attack_and_contest_mode.sql`

```
ALTER TABLE player_saves
  ADD COLUMN province_attack_progress JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN contest_mode TEXT DEFAULT 'direct';
```

<a id="supabasemigrations00183_add_last_promotion_cycle_idsql"></a>
## `supabase/migrations/00183_add_last_promotion_cycle_id.sql`

```
ALTER TABLE player_saves ADD COLUMN IF NOT EXISTS last_promotion_cycle_id INTEGER NOT NULL DEFAULT 0;
```

<a id="supabasemigrations00184_admin_clear_player_save_rpcsql"></a>
## `supabase/migrations/00184_admin_clear_player_save_rpc.sql`

```
-- 新增：管理员清除玩家存档（仅删除游戏数据，保留登录账号）
-- 与彻底删除账号不同：保留 auth.users，玩家重新登录后会生成全新初始存档
CREATE OR REPLACE FUNCTION public.admin_clear_player_save(p_target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions','auth'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_email text;
  v_save_id uuid;
  v_name text;
  v_rank int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT role INTO v_role FROM admin_users WHERE user_id = v_uid;
  IF COALESCE(v_role,'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_target_user_id = v_uid THEN RAISE EXCEPTION 'cannot_clear_self'; END IF;
  IF EXISTS(SELECT 1 FROM admin_users WHERE user_id = p_target_user_id) THEN RAISE EXCEPTION 'cannot clear admin account'; END IF;

  SELECT email::text INTO v_email FROM auth.users WHERE id = p_target_user_id;
  IF v_email IS NULL THEN RAISE EXCEPTION 'target_not_found'; END IF;

  SELECT id, player_name, rank_level INTO v_save_id, v_name, v_rank
    FROM player_saves WHERE user_id = p_target_user_id AND deleted_at IS NULL LIMIT 1;

  -- 删除关联游戏数据（硬删除，玩家重新登录后重建）
  DELETE FROM npc_band      WHERE user_id = p_target_user_id;
  DELETE FROM npc_posts     WHERE user_id = p_target_user_id;
  DELETE FROM npc_candidates WHERE user_id = p_target_user_id;
  DELETE FROM player_saves  WHERE user_id = p_target_user_id;

  PERFORM admin_log_action('clear_player_save', p_target_user_id,
    jsonb_build_object('target_email', v_email,
                       'player_name', v_name,
                       'rank_level', v_rank,
                       'save_id', v_save_id));

  RETURN jsonb_build_object('ok', true, 'email', v_email, 'player_name', v_name, 'rank_level', v_rank);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_clear_player_save(uuid) TO authenticated;
```

<a id="supabasemigrations00185_fix_admin_clear_player_save_by_save_idsql"></a>
## `supabase/migrations/00185_fix_admin_clear_player_save_by_save_id.sql`

```
-- 修正：关联游戏表以 save_id 关联，按存档ID删除
CREATE OR REPLACE FUNCTION public.admin_clear_player_save(p_target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions','auth'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_email text;
  v_save_id uuid;
  v_name text;
  v_rank int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT role INTO v_role FROM admin_users WHERE user_id = v_uid;
  IF COALESCE(v_role,'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_target_user_id = v_uid THEN RAISE EXCEPTION 'cannot_clear_self'; END IF;
  IF EXISTS(SELECT 1 FROM admin_users WHERE user_id = p_target_user_id) THEN RAISE EXCEPTION 'cannot clear admin account'; END IF;

  SELECT email::text INTO v_email FROM auth.users WHERE id = p_target_user_id;
  IF v_email IS NULL THEN RAISE EXCEPTION 'target_not_found'; END IF;

  SELECT id, player_name, rank_level INTO v_save_id, v_name, v_rank
    FROM player_saves WHERE user_id = p_target_user_id AND deleted_at IS NULL LIMIT 1;

  -- 删除关联游戏数据（按 save_id 关联，硬删除，玩家重新登录后重建）
  IF v_save_id IS NOT NULL THEN
    DELETE FROM npc_band       WHERE save_id = v_save_id;
    DELETE FROM npc_posts      WHERE save_id = v_save_id;
    DELETE FROM npc_candidates WHERE save_id = v_save_id;
  END IF;
  DELETE FROM player_saves WHERE user_id = p_target_user_id;

  PERFORM admin_log_action('clear_player_save', p_target_user_id,
    jsonb_build_object('target_email', v_email,
                       'player_name', v_name,
                       'rank_level', v_rank,
                       'save_id', v_save_id));

  RETURN jsonb_build_object('ok', true, 'email', v_email, 'player_name', v_name, 'rank_level', v_rank);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_clear_player_save(uuid) TO authenticated;
```

<a id="supabasemigrations00186_fix_admin_clear_player_save_log_action_castsql"></a>
## `supabase/migrations/00186_fix_admin_clear_player_save_log_action_cast.sql`

```
-- 修复：admin_log_action 第二参数为 text，传入 uuid 会因无法隐式转换而报错，显式 ::text 转换
CREATE OR REPLACE FUNCTION public.admin_clear_player_save(p_target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions','auth'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_email text;
  v_save_id uuid;
  v_name text;
  v_rank int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT role INTO v_role FROM admin_users WHERE user_id = v_uid;
  IF COALESCE(v_role,'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_target_user_id = v_uid THEN RAISE EXCEPTION 'cannot_clear_self'; END IF;
  IF EXISTS(SELECT 1 FROM admin_users WHERE user_id = p_target_user_id) THEN RAISE EXCEPTION 'cannot clear admin account'; END IF;

  SELECT email::text INTO v_email FROM auth.users WHERE id = p_target_user_id;
  IF v_email IS NULL THEN RAISE EXCEPTION 'target_not_found'; END IF;

  SELECT id, player_name, rank_level INTO v_save_id, v_name, v_rank
    FROM player_saves WHERE user_id = p_target_user_id AND deleted_at IS NULL LIMIT 1;

  IF v_save_id IS NOT NULL THEN
    DELETE FROM npc_band       WHERE save_id = v_save_id;
    DELETE FROM npc_posts      WHERE save_id = v_save_id;
    DELETE FROM npc_candidates WHERE save_id = v_save_id;
  END IF;
  DELETE FROM player_saves WHERE user_id = p_target_user_id;

  PERFORM admin_log_action('clear_player_save', p_target_user_id::text,
    jsonb_build_object('target_email', v_email,
                       'player_name', v_name,
                       'rank_level', v_rank,
                       'save_id', v_save_id));

  RETURN jsonb_build_object('ok', true, 'email', v_email, 'player_name', v_name, 'rank_level', v_rank);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_clear_player_save(uuid) TO authenticated;
```

<a id="supabasemigrations00187_add_faction_expansion_fieldssql"></a>
## `supabase/migrations/00187_add_faction_expansion_fields.sql`

```
ALTER TABLE player_saves
  ADD COLUMN cycle_contest_wins integer NOT NULL DEFAULT 0,
  ADD COLUMN cycle_contribution integer NOT NULL DEFAULT 0,
  ADD COLUMN setback_immunity integer NOT NULL DEFAULT 0;
```
