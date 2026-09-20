
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
