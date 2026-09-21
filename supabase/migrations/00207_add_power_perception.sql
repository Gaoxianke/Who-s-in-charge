-- 00207_add_power_perception.sql
-- 晋升后权力感知系统 v1.0：界面升级 + 专属事件 + 称谓变化

ALTER TABLE public.player_saves
ADD COLUMN IF NOT EXISTS power_perception_state jsonb;
