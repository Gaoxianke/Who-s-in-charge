-- 第三批：权力交接仪式系统 v1.0 + 破格晋升系统 v2.0
-- 全部 NOT NULL DEFAULT（兼容既有存档）

ALTER TABLE public.player_saves
  -- ── 权力交接仪式系统 ──
  ADD COLUMN ceremony_state jsonb,
  -- ── 破格晋升系统 ──
  ADD COLUMN break_promotion_flow jsonb,
  ADD COLUMN break_promotion_tag jsonb,
  ADD COLUMN break_failure_tag jsonb;
