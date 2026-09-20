
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
