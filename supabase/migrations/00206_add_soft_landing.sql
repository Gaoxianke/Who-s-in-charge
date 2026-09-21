-- 第四批：失败后软着陆系统 v1.0
-- 兼容既有存档（旧档自动为 null）

ALTER TABLE public.player_saves
  ADD COLUMN soft_landing_state jsonb;
