CREATE TEMPORARY TABLE _flow_test (
  step text,
  res text
); DO $$
DECLARE v uuid := 'cccc0001-0001-0001-0001-000000000001';
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at)
    VALUES (v, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zztest_flow_001@test.com', now(), now());
  INSERT INTO test_codes (code, status) VALUES ('ZZFLOW01', 'unused');
  UPDATE admin_settings SET auto_approval_enabled = true;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v, 'role', 'authenticated')::text, true);
  INSERT INTO _flow_test VALUES ('1.auto新用户', register_with_test_code('ZZFLOW01', 'device_flow_001', ''));
END $$; DO $$
DECLARE v uuid := 'cccc0001-0001-0001-0001-000000000002';
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at)
    VALUES (v, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zztest_flow_002@test.com', now(), now());
  INSERT INTO test_codes (code, status) VALUES ('ZZFLOW02', 'unused');
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v, 'role', 'authenticated')::text, true);
  INSERT INTO _flow_test VALUES ('2.同设备重复', register_with_test_code('ZZFLOW02', 'device_flow_001', ''));
END $$; DO $$
DECLARE v uuid := 'cccc0001-0001-0001-0001-000000000003';
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at)
    VALUES (v, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zztest_flow_003@test.com', now(), now());
  INSERT INTO test_codes (code, status) VALUES ('ZZFLOW03', 'unused');
  UPDATE admin_settings SET auto_approval_enabled = false;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v, 'role', 'authenticated')::text, true);
  INSERT INTO _flow_test VALUES ('3.手动新用户', register_with_test_code('ZZFLOW03', 'device_flow_003', ''));
END $$; DO $$
DECLARE v uuid := 'cccc0001-0001-0001-0001-000000000001';
BEGIN
  INSERT INTO test_codes (code, status) VALUES ('ZZFLOW04', 'unused');
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v, 'role', 'authenticated')::text, true);
  INSERT INTO _flow_test VALUES ('4.已通过再提交', register_with_test_code('ZZFLOW04', 'device_flow_001', ''));
END $$; DO $$
DECLARE v uuid := 'cccc0001-0001-0001-0001-000000000005';
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at)
    VALUES (v, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zztest_flow_005@test.com', now(), now());
  INSERT INTO test_codes (code, status) VALUES ('ZZFLOW05', 'unused');
  INSERT INTO player_saves (user_id, player_name, needs_character_creation, rank_level, rank_name, player_position, city_name, boss_name)
    VALUES (v, '新官员', true, 1, '科员', '科员', '测试镇', '镇长');
  UPDATE admin_settings SET auto_approval_enabled = true;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v, 'role', 'authenticated')::text, true);
  INSERT INTO _flow_test VALUES ('5.占位档不误报', register_with_test_code('ZZFLOW05', 'device_flow_005', ''));
END $$;