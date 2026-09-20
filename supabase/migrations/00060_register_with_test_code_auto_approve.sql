CREATE OR REPLACE FUNCTION public.register_with_test_code(p_test_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_code test_codes%ROWTYPE;
  v_app user_approvals%ROWTYPE;
  v_email text;
BEGIN
  IF v_uid IS NULL THEN RETURN 'NOT_AUTHENTICATED'; END IF;
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
    -- 重新提交：释放旧码、用新码并直接通过审核
    UPDATE test_codes SET status='unused', used_by_user_id=NULL, used_by_email=NULL, used_at=NULL WHERE id = v_app.test_code_id;
    UPDATE user_approvals SET status='approved', test_code_id=v_code.id, reject_reason=NULL, reviewed_by=NULL, reviewed_at=now(), created_at=now()
      WHERE user_id = v_uid;
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now() WHERE id = v_code.id;
    UPDATE player_saves SET approval_status='approved', updated_at=now() WHERE user_id = v_uid;
    RETURN 'OK';
  END IF;
  UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now() WHERE id = v_code.id;
  INSERT INTO user_approvals (user_id, email, status, test_code_id)
    VALUES (v_uid, v_email, 'approved', v_code.id);
  UPDATE player_saves SET approval_status='approved', updated_at=now() WHERE user_id = v_uid;
  RETURN 'OK';
END;
$function$;