CREATE TEMPORARY TABLE _auto_test (
  res text
); DO $$
DECLARE v uuid := 'bbbb0003-0003-0003-0003-000000000003';
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at)
    VALUES (v, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zztest_auto_003@test.com', now(), now());
  INSERT INTO test_codes (code, status) VALUES ('ZZAUTO03', 'unused');
  UPDATE admin_settings SET auto_approval_enabled = true;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v, 'role', 'authenticated')::text, true);
  INSERT INTO _auto_test VALUES (register_with_test_code('ZZAUTO03', 'test_device_unique_003', ''));
END $$;