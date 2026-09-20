DO $$
DECLARE
  v_uid uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  v_uid2 uuid := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  v_admin uuid := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  v_res text;
  v_log text := '';
  v_batch jsonb;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
    (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'flow1@example.com'),
    (v_uid2,'00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'flow2@example.com'),
    (v_admin,'00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'flowadmin@example.com');
  INSERT INTO admin_users (user_id, role) VALUES (v_admin, 'super_admin');
  INSERT INTO test_codes (code, status) VALUES ('FL01','unused'),('FL02','unused');

  -- ===== 阶段1: 注册（发测试码）=====
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
  SELECT register_with_test_code('FL01','devF','7.7.7.7') INTO v_res;
  v_log := v_log || '① 注册(玩家1,auto开启)=' || v_res || '(期望AUTO_APPROVED)';

  -- ===== 阶段2: 建存档 =====
  INSERT INTO player_saves (user_id, needs_character_creation) VALUES (v_uid, true);
  v_log := v_log || E'\n② 建占位档 player_saves数=' || (SELECT count(*) FROM player_saves WHERE user_id=v_uid) || '(期望1)';

  -- ===== 阶段3: 玩家2有真实存档后注册 → SAVE_EXISTS → 提交临时申诉 =====
  INSERT INTO player_saves (user_id, needs_character_creation) VALUES (v_uid2, false);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid2, 'role', 'authenticated')::text, true);
  SELECT register_with_test_code('FL02','devG','8.8.8.8') INTO v_res;
  v_log := v_log || E'\n③ 真实档玩家注册=' || v_res || '(期望SAVE_EXISTS)';

  INSERT INTO temp_appeals (user_id, email, reason) VALUES (v_uid2, 'flow2@example.com', '测试申诉');
  v_log := v_log || E'\n④ 提交临时申诉 pending数=' || (SELECT count(*) FROM temp_appeals WHERE status='pending' AND user_id=v_uid2) || '(期望1)';

  -- ===== 阶段4: 管理员一键同意所有临时申诉 =====
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  SELECT admin_approve_all_temp_appeals() INTO v_batch;
  v_log := v_log || E'\n⑤ 一键同意结果=' || v_batch::text || '(期望count>=1,ok=true)';

  -- 同意后该玩家旧存档应被删除
  v_log := v_log || E'\n⑥ 同意后玩家2存档数=' || (SELECT count(*) FROM player_saves WHERE user_id=v_uid2) || '(期望0)';

  RAISE EXCEPTION 'FLOW_REGRESSION:%', E'\n' || v_log;
END $$;