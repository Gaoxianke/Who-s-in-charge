-- 资源：银两、人脉
ALTER TABLE public.player_saves ADD COLUMN silver numeric NOT NULL DEFAULT 0;
ALTER TABLE public.player_saves ADD COLUMN connections numeric NOT NULL DEFAULT 0;

-- 下属派遣字段（mentor_id 已存在，为 text）
ALTER TABLE public.subordinates ADD COLUMN is_dispatched boolean NOT NULL DEFAULT false;
ALTER TABLE public.subordinates ADD COLUMN dispatch_type text;
ALTER TABLE public.subordinates ADD COLUMN dispatch_start_day integer;
ALTER TABLE public.subordinates ADD COLUMN dispatch_end_day integer;

-- 私属门客/幕僚/亲信表（独立于体制编制，不占145）
CREATE TABLE public.retainers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id uuid NOT NULL REFERENCES public.player_saves(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  type text NOT NULL,            -- 'advisor' | 'spy' | 'guard'
  name text NOT NULL,
  avatar_id integer NOT NULL DEFAULT 0,
  ability integer NOT NULL DEFAULT 50,
  loyalty numeric NOT NULL DEFAULT 60,
  bonus text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_retainers_save ON public.retainers(save_id);

ALTER TABLE public.retainers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "用户只能访问自己的门客" ON public.retainers
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());