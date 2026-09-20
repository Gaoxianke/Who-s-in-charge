
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
