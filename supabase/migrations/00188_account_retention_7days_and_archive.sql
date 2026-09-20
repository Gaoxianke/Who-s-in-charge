-- 账号删除保留期 30天 → 7天，并新增「账号归档记录」加强记录保护

-- A. 归档表：彻底清除账号前保留关键记录，供管理员追溯（记录保护）
CREATE TABLE public.archived_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  player_name text,
  registered_at timestamptz,
  deleted_at timestamptz NOT NULL,
  deletion_reason text,
  audit_log_count integer NOT NULL DEFAULT 0,
  archived_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_archived_accounts_archived_at ON public.archived_accounts (archived_at DESC);
CREATE INDEX idx_archived_accounts_email ON public.archived_accounts (email);

ALTER TABLE public.archived_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "archived_accounts_admin_all" ON public.archived_accounts
  FOR ALL TO authenticated
  USING (is_current_admin())
  WITH CHECK (is_current_admin());
GRANT SELECT ON public.archived_accounts TO authenticated;

-- B. admin_delete_player_account：保留期改为 7 天
CREATE OR REPLACE FUNCTION public.admin_delete_player_account(p_target_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
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
                       'retention_until', (now() + interval '7 days')::text));
  RETURN true;
END;
$$;

-- C. admin_restore_account：恢复窗口改为 7 天
CREATE OR REPLACE FUNCTION public.admin_restore_account(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_email text;
  v_deleted_at timestamptz;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT email::text, deleted_at INTO v_email, v_deleted_at FROM auth.users WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'account_not_found'; END IF;
  IF v_deleted_at IS NULL THEN RAISE EXCEPTION 'account_not_deleted'; END IF;
  IF v_deleted_at < now() - interval '7 days' THEN RAISE EXCEPTION 'retention_expired'; END IF;

  UPDATE auth.users SET deleted_at = NULL WHERE id = p_user_id;
  UPDATE player_saves SET deleted_at = NULL, delete_reason = NULL WHERE user_id = p_user_id;

  PERFORM admin_log_action('restore_account', p_user_id::text,
    jsonb_build_object('email', v_email));
  RETURN jsonb_build_object('restored', true, 'email', v_email);
END;
$$;

-- D. admin_purge_expired_accounts：7天阈值 + 归档关键记录 + 保留审计日志（记录保护）
CREATE OR REPLACE FUNCTION public.admin_purge_expired_accounts()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_cnt int := 0;
  v_uid uuid;
  v_email text;
  v_player_name text;
  v_registered_at timestamptz;
  v_deleted_at timestamptz;
  v_reason text;
  v_audit_count int;
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RAISE EXCEPTION 'forbidden: super_admin only'; END IF;
  FOR v_uid, v_email, v_player_name, v_registered_at, v_deleted_at, v_reason, v_audit_count IN
    SELECT u.id, u.email::text, ps.player_name, u.created_at, u.deleted_at, ps.delete_reason,
           (SELECT count(*) FROM audit_log al WHERE al.target_user_id = u.id::text)
    FROM auth.users u
    LEFT JOIN player_saves ps ON ps.user_id = u.id
    WHERE u.deleted_at IS NOT NULL AND u.deleted_at < now() - interval '7 days'
      AND NOT EXISTS(SELECT 1 FROM admin_users WHERE user_id = u.id)
  LOOP
    -- 归档关键记录，确保账号记录可追溯（记录保护）
    INSERT INTO public.archived_accounts(user_id, email, player_name, registered_at, deleted_at, deletion_reason, audit_log_count)
    VALUES (v_uid, v_email, v_player_name, v_registered_at, v_deleted_at, v_reason, v_audit_count);

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
    -- 审计日志(audit_log)予以保留，作为账号记录保护，不再删除
    DELETE FROM auth.users          WHERE id = v_uid;
    v_cnt := v_cnt + 1;
  END LOOP;
  PERFORM admin_log_action('purge_expired_accounts', NULL, jsonb_build_object('purged', v_cnt, 'retention_days', 7));
  RETURN v_cnt;
END;
$$;

-- E. 查询归档记录（管理员）
CREATE OR REPLACE FUNCTION public.admin_list_archived_accounts(
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, user_id uuid, email text, player_name text,
  registered_at timestamptz, deleted_at timestamptz,
  deletion_reason text, audit_log_count integer, archived_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT a.id, a.user_id, a.email, a.player_name, a.registered_at, a.deleted_at,
         a.deletion_reason, a.audit_log_count, a.archived_at
  FROM archived_accounts a
  WHERE (p_search IS NULL OR p_search = ''
         OR a.email ILIKE '%'||p_search||'%'
         OR a.user_id::text ILIKE '%'||p_search||'%'
         OR COALESCE(a.player_name,'') ILIKE '%'||p_search||'%')
  ORDER BY a.archived_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_list_archived_accounts(text, integer, integer) TO authenticated;