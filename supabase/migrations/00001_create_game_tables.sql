
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
