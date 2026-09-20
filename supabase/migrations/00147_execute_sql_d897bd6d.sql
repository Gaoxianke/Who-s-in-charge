DO $$
DECLARE
  v_uid uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_uid2 uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_res text;
  v_log text := '';
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
    (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'opt1@example.com'),
    (v_uid2,'00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'opt2@example.com');
  INSERT INTO test_codes (code, status) VALUES ('OP01','unused'),('OP02','unused'),('OP03','unused'),('OP04','unused');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  -- ① 全新提交(auto开启,无冲突) → AUTO_APPROVED
  SELECT register_with_test_code('OP01','devP','3.3.3.3') INTO v_res;
  v_log := v_log || '① 全新提交=' || v_res || '(期望AUTO_APPROVED)';

  -- ② 同用户重复 → ALREADY_APPROVED，记录数=1
  SELECT register_with_test_code('OP02','devP','3.3.3.3') INTO v_res;
  v_log := v_log || E'\n② 重复=' || v_res || '(期望ALREADY_APPROVED) | 记录数=' || (SELECT count(*) FROM user_approvals WHERE user_id=v_uid);

  -- ③ 仅传2参数(模拟旧前端) → 应正常工作
  SELECT register_with_test_code('OP03','devQ') INTO v_res;
  v_log := v_log || E'\n③ 仅2参数=' || v_res || '(期望AUTO_APPROVED)';

  -- ④ 同设备/IP换用户 → 因dup走pending
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid2, 'role', 'authenticated')::text, true);
  SELECT register_with_test_code('OP04','devP','3.3.3.3') INTO v_res;
  v_log := v_log || E'\n④ 同设备/IP换用户=' || v_res || '(期望OK)';

  -- ⑤ 激活码阶段绝不创建存档
  v_log := v_log || E'\n⑤ player_saves新增=' || (SELECT count(*) FROM player_saves WHERE user_id IN (v_uid,v_uid2)) || '(期望0)';

  RAISE EXCEPTION 'REGRESSION:%', E'\n' || v_log;
END $$;