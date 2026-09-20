
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
