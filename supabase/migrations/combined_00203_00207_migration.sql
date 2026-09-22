-- 晋升系统全面改革 v1.0–v5.0 合并迁移脚本（00203–00207）
-- 建议：登录 Supabase Dashboard → SQL Editor → New Query → 全选粘贴 → Run

-- ═══════════════════════════════════════════════════════════════
-- 00203：晋升系统 v3 新字段 + 政治声望系统 v1.0 + 上司关系网系统 v1.0
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.player_saves
  ADD COLUMN prestige_stage integer NOT NULL DEFAULT 0,
  ADD COLUMN clique_exposed boolean NOT NULL DEFAULT false,
  ADD COLUMN obstruction_months integer NOT NULL DEFAULT 0,
  ADD COLUMN patron_extended_count integer NOT NULL DEFAULT 0,
  ADD COLUMN rival_ambush_count integer NOT NULL DEFAULT 0,
  ADD COLUMN merit_locked integer NOT NULL DEFAULT 0,
  ADD COLUMN break_tag_count integer NOT NULL DEFAULT 0,
  ADD COLUMN faction_rank integer NOT NULL DEFAULT 0,
  ADD COLUMN faction_switches integer NOT NULL DEFAULT 0,
  ADD COLUMN turncoat_tag boolean NOT NULL DEFAULT false,
  ADD COLUMN last_promotion_ceremony_day integer NOT NULL DEFAULT 0,
  ADD COLUMN promotion_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN promotion_system_version integer NOT NULL DEFAULT 2,
  ADD COLUMN reputation jsonb NOT NULL DEFAULT '{"merit":50,"network":45,"integrity":50,"publicity":40,"faction":45}'::jsonb,
  ADD COLUMN boss_profiles jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ═══════════════════════════════════════════════════════════════
-- 00204：政敌系统 v1.0 + 晋升时机系统 v1.0
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.player_saves
  ADD COLUMN rivals jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN momentum_active boolean NOT NULL DEFAULT false,
  ADD COLUMN waiting_state jsonb,
  ADD COLUMN last_window_waived_day integer NOT NULL DEFAULT 0,
  ADD COLUMN fire_promotion_debuff_days integer NOT NULL DEFAULT 0;

-- ═══════════════════════════════════════════════════════════════
-- 00205：权力交接仪式系统 v1.0 + 破格晋升系统 v2.0
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.player_saves
  ADD COLUMN ceremony_state jsonb,
  ADD COLUMN break_promotion_flow jsonb,
  ADD COLUMN break_promotion_tag jsonb,
  ADD COLUMN break_failure_tag jsonb;

-- ═══════════════════════════════════════════════════════════════
-- 00206：失败后软着陆系统 v1.0
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.player_saves
  ADD COLUMN soft_landing_state jsonb;

-- ═══════════════════════════════════════════════════════════════
-- 00207：晋升后权力感知系统 v1.0
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.player_saves
  ADD COLUMN IF NOT EXISTS power_perception_state jsonb;
