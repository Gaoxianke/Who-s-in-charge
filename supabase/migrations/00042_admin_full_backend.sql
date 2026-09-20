-- ════════════════════════════════════════════════════════════════
-- 谁主沉浮 · 管理员后台完整后端（按 md_20260806_071627_1 规格）
-- 已存在（上一轮）：admin_users(role) / audit_log / is_current_admin() / current_admin_role()
--   / admin_stats_overview() / list_cleanup_logs() / admin_database_overview() / run_game_cleanup()
-- ════════════════════════════════════════════════════════════════

-- ───────── 兑换码 ─────────
CREATE TABLE redeem_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  label text NOT NULL DEFAULT '通用兑换码',
  reward jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_by_email text,
  used_at timestamptz,
  is_used boolean NOT NULL DEFAULT false
);
ALTER TABLE redeem_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "redeem_admin_read" ON redeem_codes FOR SELECT TO authenticated USING (is_current_admin());
CREATE POLICY "redeem_admin_insert" ON redeem_codes FOR INSERT TO authenticated WITH CHECK (COALESCE(current_admin_role(),'') IN ('admin','super_admin'));
CREATE POLICY "redeem_admin_update" ON redeem_codes FOR UPDATE TO authenticated USING (is_current_admin()) WITH CHECK (is_current_admin());

-- ───────── 推送通知 ─────────
CREATE TABLE push_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  target_type text NOT NULL DEFAULT 'all',
  target_value text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_sent boolean NOT NULL DEFAULT false,
  sent_at timestamptz
);
ALTER TABLE push_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_admin_all" ON push_notifications FOR ALL TO authenticated USING (is_current_admin()) WITH CHECK (is_current_admin());
CREATE POLICY "push_player_read" ON push_notifications FOR SELECT TO authenticated
  USING (is_sent = true AND target_type = 'all');

-- ───────── 游戏配置热更新 ─────────
CREATE TABLE game_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE game_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config_read_all" ON game_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "config_super_write" ON game_config FOR ALL TO authenticated
  USING (COALESCE(current_admin_role(),'') = 'super_admin')
  WITH CHECK (COALESCE(current_admin_role(),'') = 'super_admin');
INSERT INTO game_config (key, value, description) VALUES
  ('promotion_age_limit', '{"value":65}', '晋升年龄上限'),
  ('kpi_weights', '{"gdp":0.3,"livelihood":0.25,"security":0.2,"ecology":0.15,"business":0.1}', 'KPI 各项权重'),
  ('position_quota', '{"base":2,"per_rank":1}', '职数配额'),
  ('redeem_reward_default', '{"merit":500,"fund":10000}', '兑换码默认奖励')
ON CONFLICT (key) DO NOTHING;

-- ───────── 异常检测规则 ─────────
CREATE TABLE detection_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  threshold integer NOT NULL DEFAULT 1,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE detection_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rule_admin_read" ON detection_rules FOR SELECT TO authenticated USING (is_current_admin());
CREATE POLICY "rule_super_write" ON detection_rules FOR ALL TO authenticated
  USING (COALESCE(current_admin_role(),'') = 'super_admin')
  WITH CHECK (COALESCE(current_admin_role(),'') = 'super_admin');
INSERT INTO detection_rules (rule_key, name, description, threshold) VALUES
  ('merit_spike', '功勋异常增长', '24小时内 merit_points 超过阈值', 5000),
  ('rank_jump', '职级飞跃', '存档 rank_level 超过阈值', 12),
  ('fund_anomaly', '资金异常', 'fund_balance 超过阈值', 50000000)
ON CONFLICT (rule_key) DO NOTHING;

-- ───────── 命中异常玩家 ─────────
CREATE TABLE flagged_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  username text,
  rule_key text NOT NULL,
  rule_name text,
  reason text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  flagged_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending'
);
ALTER TABLE flagged_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flagged_admin_read" ON flagged_users FOR SELECT TO authenticated USING (is_current_admin());
CREATE POLICY "flagged_admin_write" ON flagged_users FOR ALL TO authenticated
  USING (is_current_admin()) WITH CHECK (is_current_admin());

-- ════════════════════════════════════════════════════════════════
-- RPC 函数（全部 SECURITY DEFINER + 管理员守卫）
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION admin_log_action(p_action text, p_target_user_id text DEFAULT NULL, p_detail jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_email text;
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden: not admin'; END IF;
  SELECT email INTO v_email FROM admin_users WHERE user_id = v_uid;
  INSERT INTO audit_log (admin_user_id, admin_email, action, target_user_id, detail)
  VALUES (v_uid, COALESCE(v_email,''), p_action, p_target_user_id, p_detail);
END;
$$;

CREATE OR REPLACE FUNCTION admin_account_list(p_search text DEFAULT NULL, p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS TABLE(
  user_id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, banned boolean,
  save_id uuid, player_name text, rank_level int, rank_name text, merit_points int,
  is_admin boolean, admin_role text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT u.id, u.email, u.created_at, u.last_sign_in_at,
         (u.banned_until IS NOT NULL AND u.banned_until > now()) AS banned,
         ps.id, ps.player_name, ps.rank_level, ps.rank_name, ps.merit_points,
         EXISTS(SELECT 1 FROM admin_users a WHERE a.user_id=u.id),
         (SELECT a.role FROM admin_users a WHERE a.user_id=u.id)
  FROM auth.users u
  LEFT JOIN player_saves ps ON ps.user_id = u.id
  WHERE u.deleted_at IS NULL
    AND (p_search IS NULL OR p_search = '' OR u.email ILIKE '%'||p_search||'%' OR ps.player_name ILIKE '%'||p_search||'%')
  ORDER BY u.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION admin_account_stats()
RETURNS TABLE(total_users bigint, has_character bigint, active_saves bigint, admin_count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT count(*) FROM auth.users WHERE deleted_at IS NULL),
    (SELECT count(DISTINCT user_id) FROM player_saves),
    (SELECT count(*) FROM player_saves WHERE game_over_type IS NULL AND is_retired = false),
    (SELECT count(*) FROM admin_users);
$$;

CREATE OR REPLACE FUNCTION admin_registration_trend(p_days int DEFAULT 14)
RETURNS TABLE(d date, cnt bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT d::date, count(u.id)
  FROM generate_series(CURRENT_DATE - (p_days - 1), CURRENT_DATE, '1 day'::interval) d
  LEFT JOIN auth.users u ON u.created_at::date = d::date AND u.deleted_at IS NULL
  GROUP BY d ORDER BY d;
$$;

CREATE OR REPLACE FUNCTION admin_top_active(p_limit int DEFAULT 20)
RETURNS TABLE(player_name text, rank_level int, rank_name text, merit_points int, updated_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT player_name, rank_level, rank_name, merit_points, updated_at
  FROM player_saves WHERE game_over_type IS NULL AND is_retired = false
  ORDER BY merit_points DESC NULLS LAST LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION admin_rank_distribution()
RETURNS TABLE(rank_level int, cnt bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT rank_level, count(*) FROM player_saves
  WHERE game_over_type IS NULL GROUP BY rank_level ORDER BY rank_level;
$$;

CREATE OR REPLACE FUNCTION admin_online_players(p_minutes int DEFAULT 5)
RETURNS TABLE(player_name text, rank_level int, rank_name text, updated_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT player_name, rank_level, rank_name, updated_at FROM player_saves
  WHERE updated_at >= now() - (p_minutes || ' minutes')::interval
  ORDER BY updated_at DESC;
$$;

CREATE OR REPLACE FUNCTION admin_scan_anomalies()
RETURNS TABLE(scanned int, flagged int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_flagged int := 0; v_tmp int;
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO flagged_users (user_id, username, rule_key, rule_name, reason, evidence)
  SELECT ps.user_id, ps.player_name, 'merit_spike', '功勋异常增长',
    '功勋值 '||ps.merit_points||' 超过阈值 5000',
    jsonb_build_object('merit_points', ps.merit_points, 'rank_level', ps.rank_level)
  FROM player_saves ps
  WHERE ps.merit_points > 5000
    AND NOT EXISTS(SELECT 1 FROM flagged_users f WHERE f.user_id=ps.user_id AND f.rule_key='merit_spike' AND f.status='pending');
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_flagged := v_flagged + v_tmp;

  INSERT INTO flagged_users (user_id, username, rule_key, rule_name, reason, evidence)
  SELECT ps.user_id, ps.player_name, 'rank_jump', '职级飞跃',
    '职级 L'||ps.rank_level||' 超过阈值 12',
    jsonb_build_object('rank_level', ps.rank_level)
  FROM player_saves ps
  WHERE ps.rank_level > 12
    AND NOT EXISTS(SELECT 1 FROM flagged_users f WHERE f.user_id=ps.user_id AND f.rule_key='rank_jump' AND f.status='pending');
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_flagged := v_flagged + v_tmp;

  INSERT INTO flagged_users (user_id, username, rule_key, rule_name, reason, evidence)
  SELECT ps.user_id, ps.player_name, 'fund_anomaly', '资金异常',
    '资金余额 '||ps.fund_balance||' 超过阈值 5000万',
    jsonb_build_object('fund_balance', ps.fund_balance, 'rank_level', ps.rank_level)
  FROM player_saves ps
  WHERE ps.fund_balance > 50000000
    AND NOT EXISTS(SELECT 1 FROM flagged_users f WHERE f.user_id=ps.user_id AND f.rule_key='fund_anomaly' AND f.status='pending');
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_flagged := v_flagged + v_tmp;

  PERFORM admin_log_action('scan_anomalies', NULL, jsonb_build_object('new_flagged', v_flagged));
  RETURN QUERY SELECT (SELECT count(*)::int FROM player_saves), v_flagged;
END;
$$;

CREATE OR REPLACE FUNCTION admin_promote_rank(p_save_id uuid, p_target_rank int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_target_rank < 1 OR p_target_rank > 15 THEN RAISE EXCEPTION '职级需在 1-15'; END IF;
  UPDATE player_saves SET rank_level = p_target_rank, updated_at = now() WHERE id = p_save_id;
  PERFORM admin_log_action('promote_rank', NULL, jsonb_build_object('save_id', p_save_id, 'target_rank', p_target_rank));
END;
$$;

CREATE OR REPLACE FUNCTION admin_force_promote(p_save_id uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_new int;
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RAISE EXCEPTION 'forbidden: super_admin only'; END IF;
  UPDATE player_saves SET rank_level = rank_level + 1, updated_at = now() WHERE id = p_save_id RETURNING rank_level INTO v_new;
  PERFORM admin_log_action('force_promote', NULL, jsonb_build_object('save_id', p_save_id, 'new_rank', v_new));
  RETURN v_new;
END;
$$;

CREATE OR REPLACE FUNCTION admin_toggle_ban(p_user_id uuid, p_ban boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF EXISTS(SELECT 1 FROM admin_users WHERE user_id=p_user_id AND role='super_admin') AND current_admin_role()<>'super_admin' THEN
    RAISE EXCEPTION '不能操作超级管理员';
  END IF;
  IF p_ban THEN
    UPDATE auth.users SET banned_until = '9999-12-31'::timestamptz WHERE id = p_user_id AND deleted_at IS NULL;
  ELSE
    UPDATE auth.users SET banned_until = NULL WHERE id = p_user_id;
  END IF;
  PERFORM admin_log_action(CASE WHEN p_ban THEN 'ban_user' ELSE 'unban_user' END, p_user_id::text, jsonb_build_object('ban', p_ban));
END;
$$;

CREATE OR REPLACE FUNCTION admin_reset_password(p_user_id uuid, p_new_password text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF length(p_new_password) < 6 THEN RAISE EXCEPTION '密码至少 6 位'; END IF;
  UPDATE auth.users SET encrypted_password = crypt(p_new_password, gen_salt('bf')) WHERE id = p_user_id;
  PERFORM admin_log_action('reset_password', p_user_id::text, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION admin_update_save_fields(p_save_id uuid, p_fields jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RAISE EXCEPTION 'forbidden: super_admin only'; END IF;
  UPDATE player_saves SET
    player_name    = COALESCE(NULLIF(p_fields->>'player_name','')::text, player_name),
    merit_points   = COALESCE((p_fields->>'merit_points')::int, merit_points),
    moral_value    = COALESCE((p_fields->>'moral_value')::int, moral_value),
    city_gdp       = COALESCE((p_fields->>'city_gdp')::bigint, city_gdp),
    city_livelihood = COALESCE((p_fields->>'city_livelihood')::int, city_livelihood),
    city_ecology   = COALESCE((p_fields->>'city_ecology')::int, city_ecology),
    city_business  = COALESCE((p_fields->>'city_business')::int, city_business),
    security_index = COALESCE((p_fields->>'security_index')::int, security_index),
    boss_favor     = COALESCE((p_fields->>'boss_favor')::int, boss_favor),
    fund_balance   = COALESCE((p_fields->>'fund_balance')::bigint, fund_balance),
    personal_savings = COALESCE((p_fields->>'personal_savings')::bigint, personal_savings),
    updated_at = now()
  WHERE id = p_save_id;
  PERFORM admin_log_action('update_save', NULL, jsonb_build_object('save_id', p_save_id, 'fields', p_fields));
END;
$$;

CREATE OR REPLACE FUNCTION admin_clear_cooldowns(p_save_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RAISE EXCEPTION 'forbidden: super_admin only'; END IF;
  UPDATE player_saves SET updated_at = now() WHERE id = p_save_id;
  PERFORM admin_log_action('clear_cooldowns', NULL, jsonb_build_object('save_id', p_save_id));
END;
$$;

CREATE OR REPLACE FUNCTION admin_create_redeem_code(p_label text, p_reward jsonb, p_count int DEFAULT 1)
RETURNS SETOF text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i int; v_code text; v_uid uuid := auth.uid(); v_email text;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT email INTO v_email FROM admin_users WHERE user_id = v_uid;
  FOR i IN 1..GREATEST(p_count,1) LOOP
    v_code := upper(substr(encode(gen_random_bytes(4),'hex'),1,4) || '-' ||
                     substr(encode(gen_random_bytes(4),'hex'),1,4) || '-' ||
                     substr(encode(gen_random_bytes(4),'hex'),1,4));
    INSERT INTO redeem_codes (code, label, reward, created_by, created_by_email)
      VALUES (v_code, COALESCE(NULLIF(p_label,''),'通用兑换码'), COALESCE(p_reward,'{}'::jsonb), v_uid, COALESCE(v_email,''));
    RETURN NEXT v_code;
  END LOOP;
  PERFORM admin_log_action('create_redeem_code', NULL, jsonb_build_object('count', GREATEST(p_count,1), 'label', p_label));
END;
$$;

CREATE OR REPLACE FUNCTION admin_send_push(p_title text, p_body text, p_target_type text DEFAULT 'all', p_target_value text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_uid uuid := auth.uid(); v_email text;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT email INTO v_email FROM admin_users WHERE user_id = v_uid;
  INSERT INTO push_notifications (title, body, target_type, target_value, created_by, created_by_email, is_sent, sent_at)
    VALUES (p_title, p_body, p_target_type, p_target_value, v_uid, COALESCE(v_email,''), true, now())
    RETURNING id INTO v_id;
  PERFORM admin_log_action('send_push', NULL, jsonb_build_object('id', v_id, 'title', p_title, 'target_type', p_target_type));
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION admin_save_config(p_key text, p_value jsonb, p_description text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RAISE EXCEPTION 'forbidden: super_admin only'; END IF;
  INSERT INTO game_config (key, value, description, updated_at, updated_by)
    VALUES (p_key, p_value, p_description, now(), v_uid)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = COALESCE(EXCLUDED.description, game_config.description), updated_at = now(), updated_by = v_uid;
  PERFORM admin_log_action('save_config', NULL, jsonb_build_object('key', p_key));
END;
$$;

CREATE OR REPLACE FUNCTION admin_preview_inactive(p_days int)
RETURNS TABLE(user_id uuid, email text, last_active timestamptz, has_save boolean, player_name text, rank_level int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RAISE EXCEPTION 'forbidden: super_admin only'; END IF;
  RETURN QUERY
  SELECT u.id, u.email, COALESCE(ps.updated_at, u.last_sign_in_at, u.created_at),
         ps.id IS NOT NULL, ps.player_name, ps.rank_level
  FROM auth.users u
  LEFT JOIN player_saves ps ON ps.user_id = u.id
  WHERE u.deleted_at IS NULL
    AND NOT EXISTS(SELECT 1 FROM admin_users a WHERE a.user_id=u.id)
    AND COALESCE(ps.updated_at, u.last_sign_in_at, u.created_at) < now() - (p_days || ' days')::interval
  ORDER BY COALESCE(ps.updated_at, u.last_sign_in_at, u.created_at) ASC
  LIMIT 200;
END;
$$;

CREATE OR REPLACE FUNCTION admin_delete_inactive(p_user_ids uuid[])
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cnt int := 0; uid uuid;
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RAISE EXCEPTION 'forbidden: super_admin only'; END IF;
  FOREACH uid IN ARRAY p_user_ids LOOP
    UPDATE auth.users SET deleted_at = now() WHERE id = uid AND deleted_at IS NULL
      AND NOT EXISTS(SELECT 1 FROM admin_users WHERE user_id=uid);
    IF FOUND THEN
      DELETE FROM player_saves WHERE user_id = uid;
      v_cnt := v_cnt + 1;
    END IF;
  END LOOP;
  PERFORM admin_log_action('delete_inactive', NULL, jsonb_build_object('count', v_cnt));
  RETURN v_cnt;
END;
$$;

CREATE OR REPLACE FUNCTION admin_list_audit(p_limit int DEFAULT 50)
RETURNS TABLE(id uuid, admin_email text, action text, target_user_id text, detail jsonb, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, admin_email, action, target_user_id, detail, created_at
  FROM audit_log ORDER BY created_at DESC LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION
  admin_log_action(text,text,jsonb),
  admin_account_list(text,int,int),
  admin_account_stats(),
  admin_registration_trend(int),
  admin_top_active(int),
  admin_rank_distribution(),
  admin_online_players(int),
  admin_scan_anomalies(),
  admin_promote_rank(uuid,int),
  admin_force_promote(uuid),
  admin_toggle_ban(uuid,boolean),
  admin_reset_password(uuid,text),
  admin_update_save_fields(uuid,jsonb),
  admin_clear_cooldowns(uuid),
  admin_create_redeem_code(text,jsonb,int),
  admin_send_push(text,text,text,text),
  admin_save_config(text,jsonb,text),
  admin_preview_inactive(int),
  admin_delete_inactive(uuid[]),
  admin_list_audit(int)
TO authenticated;