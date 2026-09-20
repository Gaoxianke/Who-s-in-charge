-- 修正 register_with_test_code 检测顺序：
-- 原版：SAVE_EXISTS 在最前 → APPROVED 用户导航到 enter-code 时看到"账号有存档"而非"已审核通过"
-- 修复：先检测审批状态，再检测存档，顺序：NOT_AUTHENTICATED → 设备冲突 → 码校验 → APPROVED/PENDING/SAVE_EXISTS
DROP FUNCTION IF EXISTS public.register_with_test_code(text, text);

CREATE OR REPLACE FUNCTION public.register_with_test_code(p_test_code text, p_device_id text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public', 'extensions', 'auth' AS $function$
DECLARE
  v_uid  uuid := auth.uid();
  v_code test_codes%ROWTYPE;
  v_app  user_approvals%ROWTYPE;
  v_email text;
BEGIN
  IF v_uid IS NULL THEN RETURN 'NOT_AUTHENTICATED'; END IF;

  -- ① 设备指纹冲突：同设备已有其他 approved 账号
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

  -- ② 码校验（不存在 / 已用 / 禁用 / 过期）
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
    -- ③ 已审核通过 → 优先给出最准确的提示
    IF v_app.status = 'approved' THEN RETURN 'ALREADY_APPROVED'; END IF;
    -- ④ 审核中
    IF v_app.status = 'pending'  THEN RETURN 'ALREADY_PENDING'; END IF;
    -- ⑤ 已拒绝但账号有存档（异常态）→ 走临时申诉
    IF EXISTS (SELECT 1 FROM player_saves WHERE user_id = v_uid) THEN
      RETURN 'SAVE_EXISTS';
    END IF;
    -- 已驳回：释放旧码，绑定新码，重新待审
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

  -- ⑥ 全新用户但已有存档（管理员手动创建等异常态）
  IF EXISTS (SELECT 1 FROM player_saves WHERE user_id = v_uid) THEN
    RETURN 'SAVE_EXISTS';
  END IF;

  -- ⑦ 全新提交
  UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
    WHERE id = v_code.id;
  INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id)
    VALUES (v_uid, v_email, 'pending', v_code.id, NULLIF(p_device_id,''));
  RETURN 'OK';
END;
$function$;