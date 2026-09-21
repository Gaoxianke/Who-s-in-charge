-- 晋升系统 v3 新字段 + 政治声望系统 v1.0 + 上司关系网系统 v1.0
-- 全部 NOT NULL DEFAULT，兼容既有存档（旧存档自动回退默认值）

ALTER TABLE public.player_saves
  -- ── 晋升系统 v3 新字段 ──
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
  -- ── 政治声望系统 v1.0（五维声望）──
  ADD COLUMN reputation jsonb NOT NULL DEFAULT '{"merit":50,"network":45,"integrity":50,"publicity":40,"faction":45}'::jsonb,
  -- ── 上司关系网系统 v1.0（三位上司档案）──
  ADD COLUMN boss_profiles jsonb NOT NULL DEFAULT '[]'::jsonb;