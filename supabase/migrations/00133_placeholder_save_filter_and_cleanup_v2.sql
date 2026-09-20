-- ② admin_account_list 过滤占位档
CREATE OR REPLACE FUNCTION public.admin_account_list(p_search text, p_limit integer, p_offset integer)
RETURNS TABLE(
  user_id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz,
  banned boolean, save_id uuid, player_name text, rank_level integer, rank_name text, merit_points integer,
  is_admin boolean, admin_role text, deleted_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_search text := NULLIF(btrim(coalesce(p_search, '')), '');
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT u.id, u.email, u.created_at, u.last_sign_in_at,
         (u.banned_until IS NOT NULL AND u.banned_until > now()) AS banned,
         ps.id, ps.player_name, ps.rank_level, ps.rank_name, ps.merit_points,
         EXISTS(SELECT 1 FROM admin_users a WHERE a.user_id=u.id),
         (SELECT a.role FROM admin_users a WHERE a.user_id=u.id),
         u.deleted_at
  FROM auth.users u
  INNER JOIN user_approvals ua ON ua.user_id = u.id AND ua.status = 'approved'
  LEFT JOIN player_saves ps ON ps.user_id = u.id AND NOT COALESCE(ps.needs_character_creation, false)
  WHERE (p_include_deleted OR u.deleted_at IS NULL)
    AND (
      v_search IS NULL
      OR u.email ILIKE '%'||v_search||'%'
      OR ps.player_name ILIKE '%'||v_search||'%'
      OR replace(u.email, ' ', '') = replace(v_search, ' ', '')
      OR replace(coalesce(ps.player_name, ''), ' ', '') = replace(v_search, ' ', '')
      OR u.id::text = v_search
    )
  ORDER BY
    CASE
      WHEN u.email = v_search THEN 0
      WHEN replace(u.email, ' ', '') = replace(v_search, ' ', '') THEN 1
      ELSE 2
    END,
    u.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- ③ admin_account_stats：has_save 改为只统计非占位档
CREATE OR REPLACE FUNCTION public.admin_account_stats()
RETURNS TABLE(total_users bigint, has_save bigint, active_saves bigint, admin_count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT count(*) FROM auth.users WHERE deleted_at IS NULL),
    (SELECT count(DISTINCT user_id) FROM player_saves WHERE NOT COALESCE(needs_character_creation, false)),
    (SELECT count(*) FROM player_saves WHERE game_over_type IS NULL AND is_retired = false AND NOT COALESCE(needs_character_creation, false)),
    (SELECT count(*) FROM admin_users);
$$;

-- ④ admin_preview_inactive 过滤占位档
CREATE OR REPLACE FUNCTION public.admin_preview_inactive(p_days integer)
RETURNS TABLE(user_id uuid, email text, last_active timestamptz, has_save boolean, player_name text, rank_level integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RAISE EXCEPTION 'forbidden: super_admin only'; END IF;
  RETURN QUERY
  SELECT u.id, u.email, COALESCE(ps.updated_at, u.last_sign_in_at, u.created_at),
         ps.id IS NOT NULL, ps.player_name, ps.rank_level
  FROM auth.users u
  LEFT JOIN player_saves ps ON ps.user_id = u.id AND NOT COALESCE(ps.needs_character_creation, false)
  WHERE u.deleted_at IS NULL
    AND NOT EXISTS(SELECT 1 FROM admin_users a WHERE a.user_id=u.id)
    AND COALESCE(ps.updated_at, u.last_sign_in_at, u.created_at) < now() - (p_days || ' days')::interval
  ORDER BY COALESCE(ps.updated_at, u.last_sign_in_at, u.created_at) ASC
  LIMIT 200;
END;
$$;

-- ⑤ admin_rank_distribution 过滤占位档
CREATE OR REPLACE FUNCTION public.admin_rank_distribution()
RETURNS TABLE(rank_level integer, count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT rank_level, count(*) FROM player_saves
  WHERE game_over_type IS NULL AND NOT COALESCE(needs_character_creation, false)
  GROUP BY rank_level ORDER BY rank_level;
$$;

-- ⑥ run_game_cleanup 增加占位档定期清理（超7天）
CREATE OR REPLACE FUNCTION public.run_game_cleanup(p_trigger text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_mb_before numeric; v_mb_after numeric;
  v_large_rows integer := 0; v_large_bytes bigint := 0;
  v_cadres_rows integer := 0; v_cadres_bytes bigint := 0;
  v_saves_rows integer := 0; v_saves_bytes bigint := 0;
  v_dead_ids uuid[]; v_total_saves integer;
  v_t text; v_tc integer; v_ts bigint;
  v_large_tables text[] := ARRAY['event_records','boss_interactions','monthly_reports','petition_events','welfare_actions'];
  v_orphan_tables text[] := ARRAY['city_finance','enterprises','monthly_meetings','petition_events','recruit_candidates','secretary','subordinate_resumes','welfare_actions'];
  r record;
BEGIN
  v_mb_before := round(pg_database_size(current_database()) / 1024.0 / 1024.0, 3);

  FOREACH v_t IN ARRAY v_large_tables LOOP
    SELECT * INTO r FROM _cleanup_by_where(v_t, 'created_at < now() - interval ''1 day''');
    v_large_rows := v_large_rows + r.deleted_rows;
    v_large_bytes := v_large_bytes + r.est_bytes;
  END LOOP;

  SELECT * INTO r FROM _cleanup_by_where('subordinates', 'transferred_city IS NOT NULL AND created_at < now() - interval ''1 day''');
  v_cadres_rows := r.deleted_rows; v_cadres_bytes := r.est_bytes;

  SELECT array_agg(id) INTO v_dead_ids FROM player_saves
  WHERE (game_over_type IS NOT NULL OR is_retired = true) AND updated_at < now() - interval '1 day';
  v_saves_rows := COALESCE(array_length(v_dead_ids,1),0);

  SELECT count(*) INTO v_total_saves FROM player_saves;
  IF v_total_saves > 0 AND v_saves_rows > 0 THEN
    FOR v_t IN SELECT table_name FROM information_schema.columns WHERE column_name='save_id' AND table_schema='public' LOOP
      EXECUTE format('SELECT pg_total_relation_size(%L::regclass)', v_t) INTO v_ts;
      EXECUTE format('SELECT count(*) FROM %I', v_t) INTO v_tc;
      IF v_tc > 0 THEN
        v_saves_bytes := v_saves_bytes + (v_ts::numeric / v_total_saves * v_saves_rows)::bigint;
      END IF;
    END LOOP;
  END IF;

  FOREACH v_t IN ARRAY v_orphan_tables LOOP
    EXECUTE format('DELETE FROM %I WHERE save_id = ANY($1)', v_t) USING v_dead_ids;
  END LOOP;
  DELETE FROM player_saves WHERE id = ANY(v_dead_ids);

  -- 占位档定期清理：超7天未完成角色创建
  DELETE FROM player_saves WHERE needs_character_creation = true AND created_at < now() - interval '7 days';

  v_mb_after := round(pg_database_size(current_database()) / 1024.0 / 1024.0, 3);

  INSERT INTO cleanup_logs (trigger_type, large_table_deleted, dead_cadres_deleted, dead_saves_deleted, mb_before, mb_after, mb_saved, detail)
  VALUES (p_trigger, v_large_rows, v_cadres_rows, v_saves_rows, v_mb_before, v_mb_after,
          round((v_large_bytes + v_cadres_bytes + v_saves_bytes) / 1024.0 / 1024.0, 3),
          jsonb_build_object('large_est_bytes', v_large_bytes, 'cadres_est_bytes', v_cadres_bytes, 'saves_est_bytes', v_saves_bytes));

  RETURN jsonb_build_object(
    'trigger', p_trigger,
    'large_table_deleted', v_large_rows,
    'dead_cadres_deleted', v_cadres_rows,
    'dead_saves_deleted', v_saves_rows,
    'mb_before', v_mb_before,
    'mb_after', v_mb_after,
    'mb_saved', round((v_large_bytes + v_cadres_bytes + v_saves_bytes) / 1024.0 / 1024.0, 3)
  );
END;
$$;

-- ⑦ 激活码 SAVE_EXISTS 判定排除占位档
CREATE OR REPLACE FUNCTION public.register_with_test_code(p_test_code text, p_device_id text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_code test_codes%ROWTYPE;
  v_app  user_approvals%ROWTYPE;
  v_email text;
BEGIN
  IF v_uid IS NULL THEN RETURN 'NOT_AUTHENTICATED'; END IF;

  IF p_device_id IS NOT NULL AND p_device_id NOT IN ('unknown', 'web', '') THEN
    IF EXISTS (
      SELECT 1 FROM user_approvals ua
      WHERE ua.device_id = p_device_id
        AND ua.status = 'approved'
        AND ua.user_id <> v_uid
    ) THEN
      RETURN 'DEVICE_ALREADY_REGISTERED';
    END IF;
  END IF;

  SELECT * INTO v_code FROM test_codes WHERE code = upper(trim(p_test_code));
  IF NOT FOUND THEN RETURN 'CODE_NOT_FOUND'; END IF;
  IF v_code.status = 'used'     THEN RETURN 'CODE_ALREADY_USED'; END IF;
  IF v_code.status = 'disabled' THEN RETURN 'CODE_DISABLED'; END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    UPDATE test_codes SET status = 'expired' WHERE id = v_code.id;
    RETURN 'CODE_EXPIRED';
  END IF;

  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;

  IF FOUND THEN
    IF v_app.status = 'approved' THEN RETURN 'ALREADY_APPROVED'; END IF;
    IF v_app.status = 'pending'  THEN RETURN 'ALREADY_PENDING'; END IF;
    IF EXISTS (SELECT 1 FROM player_saves WHERE user_id = v_uid AND NOT COALESCE(needs_character_creation, false)) THEN
      RETURN 'SAVE_EXISTS';
    END IF;
    IF v_app.test_code_id IS NOT NULL THEN
      UPDATE test_codes SET status='unused', used_by_user_id=NULL, used_by_email=NULL, used_at=NULL
        WHERE id = v_app.test_code_id AND status = 'used';
    END IF;
    UPDATE user_approvals
      SET status='pending', test_code_id=v_code.id, reject_reason=NULL,
          reviewed_by=NULL, reviewed_at=NULL, created_at=now(),
          device_id=COALESCE(NULLIF(p_device_id,''), device_id)
      WHERE user_id = v_uid;
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
      WHERE id = v_code.id;
    RETURN 'OK';
  END IF;

  IF EXISTS (SELECT 1 FROM player_saves WHERE user_id = v_uid AND NOT COALESCE(needs_character_creation, false)) THEN
    RETURN 'SAVE_EXISTS';
  END IF;

  UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
    WHERE id = v_code.id;
  INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id)
    VALUES (v_uid, v_email, 'pending', v_code.id, NULLIF(p_device_id,''));
  RETURN 'OK';
END;
$$;