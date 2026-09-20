-- temp_appeals 风控字段：设备指纹 / IP / 多开计数 / 账号创建时间 / 管理员豁免
ALTER TABLE public.temp_appeals
  ADD COLUMN device_fingerprint text,
  ADD COLUMN ip text,
  ADD COLUMN same_fp_count int NOT NULL DEFAULT 0,
  ADD COLUMN same_ip_count int NOT NULL DEFAULT 0,
  ADD COLUMN account_created_at timestamptz,
  ADD COLUMN admin_exempt boolean NOT NULL DEFAULT false;

-- 玩家是否有已通过的临时申诉（门禁自动放行用）
CREATE OR REPLACE FUNCTION public.has_approved_temp_appeal()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM temp_appeals WHERE user_id = auth.uid() AND status = 'approved');
$$;
GRANT EXECUTE ON FUNCTION public.has_approved_temp_appeal() TO authenticated;

-- 测试码系统：账号已有存档则禁止入内
CREATE OR REPLACE FUNCTION public.register_with_test_code(p_test_code text, p_device_id text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public', 'extensions', 'auth' AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_code test_codes%ROWTYPE;
  v_app user_approvals%ROWTYPE;
  v_email text;
BEGIN
  IF v_uid IS NULL THEN RETURN 'NOT_AUTHENTICATED'; END IF;

  -- 账号已有存档：禁止入内（请走临时申诉）
  IF EXISTS (SELECT 1 FROM player_saves WHERE user_id = v_uid) THEN
    RETURN 'SAVE_EXISTS';
  END IF;

  -- 设备指纹检测：同一设备已有其他已通过的账号，自动驳回
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
  IF v_code.status = 'used' THEN RETURN 'CODE_ALREADY_USED'; END IF;
  IF v_code.status = 'disabled' THEN RETURN 'CODE_DISABLED'; END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    UPDATE test_codes SET status = 'expired' WHERE id = v_code.id;
    RETURN 'CODE_EXPIRED';
  END IF;

  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;

  IF FOUND THEN
    IF v_app.status = 'approved' THEN RETURN 'ALREADY_APPROVED'; END IF;
    IF v_app.status = 'pending' THEN RETURN 'ALREADY_PENDING'; END IF;
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

  UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
    WHERE id = v_code.id;
  INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id)
    VALUES (v_uid, v_email, 'pending', v_code.id, NULLIF(p_device_id,''));
  RETURN 'OK';
END;
$function$;

-- 后台临时申诉列表：按账号去重（每个账号仅显示最新一条）
CREATE OR REPLACE FUNCTION public.admin_list_temp_appeals(p_status text DEFAULT NULL, p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rows jsonb;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_agg(t) INTO v_rows FROM (
    SELECT * FROM (
      SELECT DISTINCT ON (user_id)
        id, user_id, email, reason, status, reject_reason, handler,
        device_fingerprint, ip, same_fp_count, same_ip_count, account_created_at, admin_exempt,
        created_at, updated_at
      FROM temp_appeals
      WHERE (p_status IS NULL OR status = p_status)
      ORDER BY user_id, created_at DESC
    ) d
    ORDER BY created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) t;
  RETURN COALESCE(v_rows, '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_list_temp_appeals(text, int, int) TO authenticated;