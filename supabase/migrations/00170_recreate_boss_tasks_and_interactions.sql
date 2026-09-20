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