
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
