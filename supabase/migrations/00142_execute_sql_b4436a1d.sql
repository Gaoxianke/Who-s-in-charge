DO $$
DECLARE
  v_uid uuid := '66666666-6666-6666-6666-666666666666';
  v_app user_approvals%ROWTYPE;
  v_found boolean;
  v_dup boolean;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
    (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'diag2@example.com');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;
  GET DIAGNOSTICS v_found = FOUND;
  SELECT EXISTS(SELECT 1 FROM user_approvals ua WHERE ua.device_id='devZ' AND ua.status='approved' AND ua.user_id<>v_uid) INTO v_dup;

  RAISE EXCEPTION 'FOUND=% dup=%', v_found, v_dup;
END $$;