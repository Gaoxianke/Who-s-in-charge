-- 1. player_saves 增加软删除列
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS delete_reason text;
CREATE INDEX IF NOT EXISTS idx_player_saves_deleted_at
  ON player_saves (deleted_at) WHERE deleted_at IS NOT NULL;

-- 2. admin_account_list：新增 p_include_deleted 参数 + 返回 deleted_at
CREATE OR REPLACE FUNCTION public.admin_account_list(
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_include_deleted boolean DEFAULT false
)
RETURNS TABLE(
  user_id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz,
  banned boolean, save_id uuid, player_name text, rank_level integer, rank_name text,
  merit_points integer, is_admin boolean, admin_role text, auth_deleted_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
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
  LEFT JOIN player_saves ps ON ps.user_id = u.id
  WHERE (p_include_deleted OR u.deleted_at IS NULL)
    AND (p_search IS NULL OR p_search = ''
         OR u.email ILIKE '%'||p_search||'%'
         OR ps.player_name ILIKE '%'||p_search||'%')
  ORDER BY u.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 3. admin_delete_account → 软删除（设 deleted_at，保留所有数据）
CREATE OR REPLACE FUNCTION public.admin_delete_account(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions','auth'
AS $$
DECLARE
  v_email text;
  v_already_deleted timestamptz;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'user_id required'; END IF;
  IF EXISTS(SELECT 1 FROM admin_users WHERE user_id = p_user_id) THEN RAISE EXCEPTION 'cannot delete admin account'; END IF;
  SELECT email::text, deleted_at INTO v_email, v_already_deleted FROM auth.users WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'account not found'; END IF;
  IF v_already_deleted IS NOT NULL THEN RAISE EXCEPTION 'account already pending deletion'; END IF;

  -- 软删除：仅标记 deleted_at，30天后由 purge 清除
  UPDATE auth.users SET deleted_at = now() WHERE id = p_user_id;
  UPDATE player_saves SET deleted_at = now(), delete_reason = 'admin_delete'
    WHERE user_id = p_user_id AND deleted_at IS NULL;

  PERFORM admin_log_action('soft_delete_account', p_user_id::text,
    jsonb_build_object('email', v_email,
                       'retention_until', (now() + interval '30 days')::text));
  RETURN jsonb_build_object('deleted', true, 'email', v_email,
                            'soft_delete', true, 'retention_days', 30);
END;
$$;

-- 4. admin_delete_player_account（超管）→ 软删除
CREATE OR REPLACE FUNCTION public.admin_delete_player_account(p_target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions','auth'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_email text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT role INTO v_role FROM admin_users WHERE user_id = v_uid;
  IF COALESCE(v_role,'') <> 'super_admin' THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_target_user_id = v_uid THEN RAISE EXCEPTION 'cannot_delete_self'; END IF;
  IF EXISTS(SELECT 1 FROM admin_users WHERE user_id = p_target_user_id) THEN RAISE EXCEPTION 'cannot delete admin account'; END IF;
  SELECT email::text INTO v_email FROM auth.users WHERE id = p_target_user_id;
  IF v_email IS NULL THEN RAISE EXCEPTION 'target_not_found'; END IF;

  UPDATE auth.users SET deleted_at = now() WHERE id = p_target_user_id;
  UPDATE player_saves SET deleted_at = now(), delete_reason = 'super_admin_delete'
    WHERE user_id = p_target_user_id AND deleted_at IS NULL;

  PERFORM admin_log_action('soft_delete_player_account', p_target_user_id,
    jsonb_build_object('target_email', v_email,
                       'retention_until', (now() + interval '30 days')::text));
  RETURN true;
END;
$$;

-- 5. admin_delete_inactive → 软删除
CREATE OR REPLACE FUNCTION public.admin_delete_inactive(p_user_ids uuid[])
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_cnt int := 0; uid uuid;
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RAISE EXCEPTION 'forbidden: super_admin only'; END IF;
  FOREACH uid IN ARRAY p_user_ids LOOP
    UPDATE auth.users SET deleted_at = now() WHERE id = uid AND deleted_at IS NULL
      AND NOT EXISTS(SELECT 1 FROM admin_users WHERE user_id = uid);
    IF FOUND THEN
      UPDATE player_saves SET deleted_at = now(), delete_reason = 'inactive_cleanup'
        WHERE user_id = uid AND deleted_at IS NULL;
      v_cnt := v_cnt + 1;
    END IF;
  END LOOP;
  PERFORM admin_log_action('soft_delete_inactive', NULL, jsonb_build_object('count', v_cnt));
  RETURN v_cnt;
END;
$$;

-- 6. admin_restore_account（30天内可恢复）
CREATE OR REPLACE FUNCTION public.admin_restore_account(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions','auth'
AS $$
DECLARE
  v_email text;
  v_deleted_at timestamptz;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT email::text, deleted_at INTO v_email, v_deleted_at FROM auth.users WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'account_not_found'; END IF;
  IF v_deleted_at IS NULL THEN RAISE EXCEPTION 'account_not_deleted'; END IF;
  IF v_deleted_at < now() - interval '30 days' THEN RAISE EXCEPTION 'retention_expired'; END IF;

  UPDATE auth.users SET deleted_at = NULL WHERE id = p_user_id;
  UPDATE player_saves SET deleted_at = NULL, delete_reason = NULL WHERE user_id = p_user_id;

  PERFORM admin_log_action('restore_account', p_user_id::text,
    jsonb_build_object('email', v_email));
  RETURN jsonb_build_object('restored', true, 'email', v_email);
END;
$$;

-- 7. admin_purge_expired_accounts（超管：清除超过30天的软删账号）
CREATE OR REPLACE FUNCTION public.admin_purge_expired_accounts()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions','auth'
AS $$
DECLARE
  v_cnt int := 0;
  v_uid uuid;
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RAISE EXCEPTION 'forbidden: super_admin only'; END IF;
  FOR v_uid IN
    SELECT id FROM auth.users
    WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days'
      AND NOT EXISTS(SELECT 1 FROM admin_users WHERE user_id = id)
  LOOP
    DELETE FROM subordinates        WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = v_uid);
    DELETE FROM boss_tasks          WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = v_uid);
    DELETE FROM player_career_history WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = v_uid);
    DELETE FROM family_members      WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = v_uid);
    DELETE FROM construction_projects WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = v_uid);
    DELETE FROM police_cases        WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = v_uid);
    DELETE FROM player_health       WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = v_uid);
    DELETE FROM governing_areas     WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = v_uid);
    DELETE FROM player_saves        WHERE user_id = v_uid;
    DELETE FROM user_approvals      WHERE user_id = v_uid;
    DELETE FROM password_reset_requests WHERE target_user_id = v_uid OR requested_by = v_uid;
    DELETE FROM audit_log           WHERE target_user_id = v_uid::text;
    DELETE FROM auth.users          WHERE id = v_uid;
    v_cnt := v_cnt + 1;
  END LOOP;
  PERFORM admin_log_action('purge_expired_accounts', NULL, jsonb_build_object('purged', v_cnt));
  RETURN v_cnt;
END;
$$;