DO $$
DECLARE
  v_uid uuid := '88888888-8888-8888-8888-888888888888';
  v_uid2 uuid := '99999999-9999-9999-9999-999999999999';
  v_res text;
  v_log text := '';
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
    (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'reg2a@example.com'),
    (v_uid2,'00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'reg2b@example.com');
  INSERT INTO test_codes (code, status) VALUES ('RG01','unused'),('RG02','unused'),('RG03','unused'),('RG04','unused');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  SELECT register_with_test_code('RG01','devA','1.1.1.1') INTO v_res;
  v_log := v_log || '① 全新提交(auto开启,无冲突)=' || v_res || '(期望AUTO_APPROVED)';

  SELECT register_with_test_code('RG02','devA','1.1.1.1') INTO v_res;
  v_log := v_log || E'\n② 同用户重复=' || v_res || '(期望ALREADY_APPROVED) | 记录数=' || (SELECT count(*) FROM user_approvals WHERE user_id=v_uid);

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid2, 'role', 'authenticated')::text, true);
  SELECT register_with_test_code('RG03','devA','1.1.1.1') INTO v_res;
  v_log := v_log || E'\n③ 同设备/IP换用户(因dup走pending)=' || v_res || '(期望OK) | 记录数=' || (SELECT count(*) FROM user_approvals WHERE user_id=v_uid2);

  v_log := v_log || E'\n④ 激活码阶段player_saves新增=' || (SELECT count(*) FROM player_saves WHERE user_id IN (v_uid,v_uid2)) || '(期望0)';

  INSERT INTO player_saves (user_id, needs_character_creation) VALUES (v_uid2, false);
  UPDATE user_approvals SET status='rejected' WHERE user_id=v_uid2;
  UPDATE test_codes SET status='unused', used_by_user_id=NULL WHERE code='RG03';
  SELECT register_with_test_code('RG04','devB','2.2.2.2') INTO v_res;
  v_log := v_log || E'\n⑤ 真实档后重申=' || v_res || '(期望SAVE_EXISTS)';

  RAISE EXCEPTION 'REGRESSION:%', E'\n' || v_log;
END $$;