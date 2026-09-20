-- 管理员单独清理数据库账号：删除该账号下的全部游戏数据 + auth 账号
CREATE OR REPLACE FUNCTION public.admin_delete_account(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_email text; v_count int;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'user_id required'; END IF;
  -- 禁止删除管理员账号自身
  IF EXISTS (SELECT 1 FROM admin_users WHERE user_id = p_user_id) THEN RAISE EXCEPTION 'cannot delete admin account'; END IF;
  SELECT email::text INTO v_email FROM auth.users WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'account not found'; END IF;

  -- 删除该账号绑定的全部游戏数据（按 FK 级联或显式删除）
  DELETE FROM player_subordinates WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = p_user_id);
  DELETE FROM player_boss_tasks WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = p_user_id);
  DELETE FROM player_career_history WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = p_user_id);
  DELETE FROM player_family_members WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = p_user_id);
  DELETE FROM player_construction WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = p_user_id);
  DELETE FROM player_police_cases WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = p_user_id);
  DELETE FROM player_health WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = p_user_id);
  DELETE FROM player_governing_areas WHERE save_id IN (SELECT id FROM player_saves WHERE user_id = p_user_id);
  DELETE FROM player_saves WHERE user_id = p_user_id;
  DELETE FROM user_approvals WHERE user_id = p_user_id;
  DELETE FROM push_notifications WHERE user_id = p_user_id;
  DELETE FROM audit_log WHERE target_user_id = p_user_id::text;
  -- 删除 auth 账号（identities 由 FK 级联删除）
  DELETE FROM auth.users WHERE id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  PERFORM admin_log_action('delete_account', p_user_id::text, jsonb_build_object('email', v_email));
  RETURN jsonb_build_object('deleted', true, 'email', v_email, 'auth_deleted', v_count > 0);
END;
$function$;
GRANT EXECUTE ON FUNCTION public.admin_delete_account(uuid) TO authenticated;