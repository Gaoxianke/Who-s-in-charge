-- 第二批：政敌系统 v1.0 + 晋升时机系统 v1.0
-- 全部 NOT NULL DEFAULT（兼容既有存档，旧存档自动回退默认值）

ALTER TABLE public.player_saves
  -- ── 政敌系统 ──
  ADD COLUMN rivals jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- ── 晋升时机系统 ──
  ADD COLUMN momentum_active boolean NOT NULL DEFAULT false,
  ADD COLUMN waiting_state jsonb,
  ADD COLUMN last_window_waived_day integer NOT NULL DEFAULT 0,
  ADD COLUMN fire_promotion_debuff_days integer NOT NULL DEFAULT 0;
