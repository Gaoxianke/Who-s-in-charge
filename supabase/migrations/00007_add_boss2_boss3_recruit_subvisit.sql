
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
