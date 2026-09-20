DO $$
DECLARE
  v uuid := 'bbbb0001-0001-0001-0001-000000000001';
  v_res text;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at)
    VALUES (v, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zztest_auto_001@test.com', now(), now());
  INSERT INTO test_codes (code, status) VALUES ('ZZAUTO01', 'unused');
  UPDATE admin_settings SET auto_approval_enabled = true;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v, 'role', 'authenticated')::text, true);
  v_res := register_with_test_code('ZZAUTO01', 'test_device_xyz', '');
  RAISE NOTICE '=== 自动审批测试结果: % ===', v_res;
  -- 验证 user_approvals 状态
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v, 'role', 'authenticated')::text, true);
  RAISE NOTICE '=== approvals状态: % ===', (SELECT status FROM user_approvals WHERE user_id = v);
END $$;