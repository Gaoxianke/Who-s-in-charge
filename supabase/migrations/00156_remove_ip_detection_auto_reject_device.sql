-- 移除 IP 检测，保留设备指纹检测；自动审核开启时同设备已审批 → 自动驳回
DROP FUNCTION IF EXISTS public.register_with_test_code(text, text, text);
DROP FUNCTION IF EXISTS public.register_with_test_code(text, text);

CREATE OR REPLACE FUNCTION public.register_with_test_code(
  p_test_code text,
  p_device_id text DEFAULT '',
  p_ip        text DEFAULT ''   -- 保留参数兼容旧前端，函数内不再使用
)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_code     test_codes%ROWTYPE;
  v_app      user_approvals%ROWTYPE;
  v_email    text;
  v_dev      text    := NULLIF(btrim(coalesce(p_device_id, '')), '');
  v_auto     boolean := false;
  v_dup_dev  boolean := false;
  v_has_app  boolean := false;
  v_has_save boolean := false;
BEGIN
  IF v_uid IS NULL THEN RETURN 'NOT_AUTHENTICATED'; END IF;

  -- 码校验
  SELECT * INTO v_code FROM test_codes WHERE code = upper(trim(p_test_code));
  IF NOT FOUND THEN RETURN 'CODE_NOT_FOUND'; END IF;
  IF v_code.status = 'used'     THEN RETURN 'CODE_ALREADY_USED'; END IF;
  IF v_code.status = 'disabled' THEN RETURN 'CODE_DISABLED'; END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    UPDATE test_codes SET status = 'expired' WHERE id = v_code.id;
    RETURN 'CODE_EXPIRED';
  END IF;

  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT auto_approval_enabled INTO v_auto FROM admin_settings LIMIT 1;
  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;
  v_has_app  := v_app.user_id IS NOT NULL;
  v_has_save := EXISTS(
    SELECT 1 FROM player_saves WHERE user_id = v_uid AND NOT COALESCE(needs_character_creation, false)
  );

  -- 设备指纹重复检测（同设备已有 approved 的其他账号）
  IF v_dev IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM user_approvals ua
      WHERE ua.device_id = v_dev AND ua.status = 'approved' AND ua.user_id <> v_uid
    ) INTO v_dup_dev;
  END IF;

  -- 已有真实存档 → 走临时申诉
  IF v_has_save THEN RETURN 'SAVE_EXISTS'; END IF;

  -- 已有申请记录（UPDATE 去重，不重复插入）
  IF v_has_app THEN
    IF v_app.status = 'approved' THEN RETURN 'ALREADY_APPROVED'; END IF;
    IF v_app.status = 'pending'  THEN RETURN 'ALREADY_PENDING'; END IF;
    -- 已驳回：先归还旧码
    IF v_app.test_code_id IS NOT NULL THEN
      UPDATE test_codes SET status='unused', used_by_user_id=NULL, used_by_email=NULL, used_at=NULL
        WHERE id = v_app.test_code_id AND status = 'used';
    END IF;
    -- 自动审核：设备重复 → 自动驳回
    IF v_auto AND v_dup_dev THEN
      UPDATE user_approvals
        SET status='rejected', test_code_id=v_code.id,
            reject_reason='同设备已有已审批账号，系统自动驳回',
            reviewed_at=now(), device_id=COALESCE(v_dev, device_id)
        WHERE user_id = v_uid;
      UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
        WHERE id = v_code.id;
      RETURN 'DEVICE_ALREADY_REGISTERED';
    END IF;
    -- 自动审核：无冲突 → 直接通过
    IF v_auto AND NOT v_dup_dev THEN
      UPDATE user_approvals
        SET status='approved', test_code_id=v_code.id, reject_reason=NULL,
            reviewed_by=NULL, reviewed_at=now(), created_at=now(),
            device_id=COALESCE(v_dev, device_id)
        WHERE user_id = v_uid;
      UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
        WHERE id = v_code.id;
      RETURN 'AUTO_APPROVED';
    END IF;
    -- 手动审核：重新待审
    UPDATE user_approvals
      SET status='pending', test_code_id=v_code.id, reject_reason=NULL,
          reviewed_by=NULL, reviewed_at=NULL, created_at=now(),
          device_id=COALESCE(v_dev, device_id)
      WHERE user_id = v_uid;
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
      WHERE id = v_code.id;
    RETURN 'OK';
  END IF;

  -- 全新用户（无申请记录）
  -- 自动审核：设备重复 → 自动驳回
  IF v_auto AND v_dup_dev THEN
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
      WHERE id = v_code.id;
    INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id, reject_reason)
      VALUES (v_uid, v_email, 'rejected', v_code.id, v_dev, '同设备已有已审批账号，系统自动驳回');
    RETURN 'DEVICE_ALREADY_REGISTERED';
  END IF;
  -- 自动审核：无冲突 → 直接通过
  IF v_auto AND NOT v_dup_dev THEN
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
      WHERE id = v_code.id;
    INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id)
      VALUES (v_uid, v_email, 'approved', v_code.id, v_dev);
    RETURN 'AUTO_APPROVED';
  END IF;
  -- 手动审核：pending
  UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
    WHERE id = v_code.id;
  INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id)
    VALUES (v_uid, v_email, 'pending', v_code.id, v_dev);
  RETURN 'OK';
END;
$$;