DO $$
DECLARE
  v_uid uuid := '22222222-2222-2222-2222-222222222222';
  v_uid2 uuid := '33333333-3333-3333-3333-333333333333';
  v_res text;
  v_log text := '';
  v_auto boolean;
BEGIN
  SELECT auto_approval_enabled INTO v_auto FROM admin_settings LIMIT 1;
  v_log := 'auto_approval_enabled=' || v_auto;

  INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
    (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dettest1@example.com'),
    (v_uid2,'00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dettest2@example.com');
  INSERT INTO test_codes (code, status) VALUES ('DET001','unused'),('DET002','unused'),('DET003','unused'),('DET004','unused');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  -- ① 全新提交（同设备dev1/IP1）
  SELECT register_with_test_code('DET001','dev1','1.2.3.4') INTO v_res;
  v_log := v_log || E'\n① 全新提交=' || v_res || ' (期望OK或AUTO_APPROVED)';

  -- ② 同用户重复输入（同设备/IP）→ 不应重复记录，应 ALREADY_PENDING 或重申OK
  SELECT register_with_test_code('DET002','dev1','1.2.3.4') INTO v_res;
  v_log := v_log || E'\n② 同用户重复=' || v_res || ' (期望ALREADY_PENDING)';

  -- 验证该用户只有一行 user_approvals（去重）
  v_log := v_log || ' | 该用户记录数=' || (SELECT count(*) FROM user_approvals WHERE user_id=v_uid);

  -- ③ 换用户用同设备dev1/IP1注册 → 若auto开启应被检测（DUP）走pending；否则pending
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid2, 'role', 'authenticated')::text, true);
  SELECT register_with_test_code('DET003','dev1','1.2.3.4') INTO v_res;
  v_log := v_log || E'\n③ 同设备/IP换用户=' || v_res || ' (期望OK，因dup走pending)';

  -- ④ 确认激活码阶段绝不创建存档
  v_log := v_log || ' | 测试期间player_saves新增数=' || (SELECT count(*) FROM player_saves WHERE user_id IN (v_uid,v_uid2));

  -- ⑤ 用户2有真实存档后重申 → SAVE_EXISTS
  INSERT INTO player_saves (user_id, needs_character_creation) VALUES (v_uid2, false);
  UPDATE user_approvals SET status='rejected' WHERE user_id=v_uid2;
  UPDATE test_codes SET status='unused', used_by_user_id=NULL WHERE code='DET003';
  SELECT register_with_test_code('DET004','dev2','5.6.7.8') INTO v_res;
  v_log := v_log || E'\n⑤ 真实档后重申=' || v_res || ' (期望SAVE_EXISTS)';

  RAISE EXCEPTION 'REGRESSION:%', E'\n' || v_log;
END $$;