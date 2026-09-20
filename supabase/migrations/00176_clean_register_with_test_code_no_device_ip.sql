
-- 删除所有旧函数重载，避免 "overloaded/ambiguous" 错误
DROP FUNCTION IF EXISTS public.register_with_test_code(text);
DROP FUNCTION IF EXISTS public.register_with_test_code(text, text);
DROP FUNCTION IF EXISTS public.register_with_test_code(text, text, text);
DROP FUNCTION IF EXISTS public.register_with_test_code(text, text, text, text);

-- 全新版本：无 SAVE_EXISTS、无设备/IP 检测
-- 返回值：OK / AUTO_APPROVED / NOT_AUTHENTICATED / CODE_NOT_FOUND /
--         CODE_ALREADY_USED / CODE_DISABLED / CODE_EXPIRED /
--         ALREADY_APPROVED / ALREADY_PENDING
CREATE OR REPLACE FUNCTION public.register_with_test_code(
  p_test_code text,
  p_device_id text DEFAULT '',   -- 保留参数兼容旧前端，函数内不再使用
  p_ip        text DEFAULT ''    -- 保留参数兼容旧前端，函数内不再使用
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   uuid    := auth.uid();
  v_code  test_codes%ROWTYPE;
  v_app   user_approvals%ROWTYPE;
  v_email text;
  v_auto  boolean := false;
BEGIN
  IF v_uid IS NULL THEN RETURN 'NOT_AUTHENTICATED'; END IF;

  -- 测试码校验
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
  v_auto := COALESCE(v_auto, false);

  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;

  -- 已有申请记录
  IF v_app.user_id IS NOT NULL THEN
    IF v_app.status = 'approved' THEN RETURN 'ALREADY_APPROVED'; END IF;
    IF v_app.status = 'pending'  THEN RETURN 'ALREADY_PENDING';  END IF;

    -- 已被驳回：归还旧码
    IF v_app.test_code_id IS NOT NULL THEN
      UPDATE test_codes
        SET status = 'unused', used_by_user_id = NULL, used_by_email = NULL, used_at = NULL
        WHERE id = v_app.test_code_id AND status = 'used';
    END IF;

    -- 自动审核：直接通过
    IF v_auto THEN
      UPDATE user_approvals
        SET status = 'approved', test_code_id = v_code.id,
            reject_reason = NULL, reviewed_by = NULL, reviewed_at = now(), created_at = now()
        WHERE user_id = v_uid;
      UPDATE test_codes
        SET status = 'used', used_by_user_id = v_uid, used_by_email = v_email, used_at = now()
        WHERE id = v_code.id;
      RETURN 'AUTO_APPROVED';
    END IF;

    -- 手动审核：重置为 pending
    UPDATE user_approvals
      SET status = 'pending', test_code_id = v_code.id,
          reject_reason = NULL, reviewed_by = NULL, reviewed_at = NULL, created_at = now()
      WHERE user_id = v_uid;
    UPDATE test_codes
      SET status = 'used', used_by_user_id = v_uid, used_by_email = v_email, used_at = now()
      WHERE id = v_code.id;
    RETURN 'OK';
  END IF;

  -- 全新用户（无申请记录）
  UPDATE test_codes
    SET status = 'used', used_by_user_id = v_uid, used_by_email = v_email, used_at = now()
    WHERE id = v_code.id;

  IF v_auto THEN
    INSERT INTO user_approvals (user_id, email, status, test_code_id)
      VALUES (v_uid, v_email, 'approved', v_code.id);
    RETURN 'AUTO_APPROVED';
  ELSE
    INSERT INTO user_approvals (user_id, email, status, test_code_id)
      VALUES (v_uid, v_email, 'pending', v_code.id);
    RETURN 'OK';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_with_test_code(text, text, text) TO authenticated;
