DO $$
DECLARE
  v_uid uuid := '55555555-5555-5555-5555-555555555555';
  v_res text;
  v_cnt int;
  v_auto boolean;
  v_found boolean;
  v_app_status text;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
    (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'diag@example.com');
  INSERT INTO test_codes (code, status) VALUES ('DIAG01','unused');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  SELECT auto_approval_enabled INTO v_auto FROM admin_settings LIMIT 1;
  SELECT register_with_test_code('DIAG01','devX','9.9.9.9') INTO v_res;
  SELECT count(*), (SELECT status FROM user_approvals WHERE user_id=v_uid) INTO v_cnt, v_app_status FROM user_approvals WHERE user_id=v_uid;

  RAISE EXCEPTION 'DIAG: auto=% res=% cnt=% status=%', v_auto, v_res, v_cnt, v_app_status;
END $$;