CREATE OR REPLACE FUNCTION public.admin_delete_account(p_user_id uuid, p_reason text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_email text;
  v_dev text;
  v_ip text;
  v_ban_until timestamptz := now() + interval '100 years';
  v_is_admin boolean;
  v_actor text;
  v_uid uuid := auth.uid();
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_user_id = v_uid THEN RAISE EXCEPTION '不能删除自己'; END IF;
  v_is_admin := _is_admin_user(p_user_id);
  IF v_is_admin THEN
    RAISE EXCEPTION '管理员账号不可封禁或删除';
  END IF;
  SELECT email::text INTO v_email FROM auth.users WHERE id = p_user_id;
  SELECT device_id, ip_address INTO v_dev, v_ip FROM user_approvals WHERE user_id = p_user_id LIMIT 1;
  SELECT email INTO v_actor FROM admin_users WHERE user_id = v_uid;

  UPDATE auth.users SET banned_until = v_ban_until WHERE id = p_user_id;
  INSERT INTO banned_entities(user_id,email,entity_type,entity_value,ban_reason,banned_by_email,banned_until)
  VALUES
    (p_user_id,v_email,'user',p_user_id::text,COALESCE(p_reason,'管理员删除账号'),v_actor,v_ban_until),
    (p_user_id,v_email,'email',lower(trim(COALESCE(v_email,''))),COALESCE(p_reason,'管理员删除账号'),v_actor,v_ban_until)
  ON CONFLICT DO NOTHING;
  IF v_dev IS NOT NULL AND v_dev NOT IN ('unknown','web') AND NOT _is_private_ip(v_ip) THEN
    INSERT INTO banned_entities(user_id,email,entity_type,entity_value,ban_reason,banned_by_email,banned_until)
    VALUES
      (p_user_id,v_email,'device',v_dev,COALESCE(p_reason,'管理员删除账号'),v_actor,v_ban_until),
      (p_user_id,v_email,'ip',v_ip,COALESCE(p_reason,'管理员删除账号'),v_actor,v_ban_until)
    ON CONFLICT DO NOTHING;
  END IF;
  INSERT INTO audit_log(admin_user_id, admin_email, action, target_user_id, detail)
  VALUES(v_uid, v_actor, 'delete_account', p_user_id::text,
         jsonb_build_object('reason', p_reason, 'banned', true, 'device', v_dev, 'ip', v_ip, 'target_email', v_email));
  RETURN jsonb_build_object('ok', true);
END;
$$;