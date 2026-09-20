-- 移除 register_with_test_code 中的设备查重、IP查重，简化为纯码校验+申请状态
-- 同时去掉 p_ip 参数，函数签名更干净
DROP FUNCTION IF EXISTS public.register_with_test_code(text, text, text);

CREATE OR REPLACE FUNCTION public.register_with_test_code(
  p_test_code text,
  p_device_id text DEFAULT ''
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

  -- 已有真实存档 → 走临时申诉
  IF v_has_save THEN RETURN 'SAVE_EXISTS'; END IF;

  -- 已有申请记录
  IF v_has_app THEN
    IF v_app.status = 'approved' THEN RETURN 'ALREADY_APPROVED'; END IF;
    IF v_app.status = 'pending'  THEN RETURN 'ALREADY_PENDING'; END IF;
    -- 已驳回：先归还旧码
    IF v_app.test_code_id IS NOT NULL THEN
      UPDATE test_codes SET status='unused', used_by_user_id=NULL, used_by_email=NULL, used_at=NULL
        WHERE id = v_app.test_code_id AND status = 'used';
    END IF;
    -- 自动审核：直接通过
    IF v_auto THEN
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

  -- 全新用户
  IF v_auto THEN
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