DO $$
DECLARE
  v_uid uuid := '11111111-1111-1111-1111-111111111111';
  v_res text;
  v_total bigint; v_has bigint; v_active bigint; v_admin bigint;
  v_real bigint; v_ph bigint;
  v_log text := '';
BEGIN
  -- ========== 后台统计回归 ==========
  SELECT total_users, has_save, active_saves, admin_count INTO v_total, v_has, v_active, v_admin FROM admin_account_stats();
  SELECT count(*) INTO v_real FROM player_saves WHERE NOT needs_character_creation;
  SELECT count(*) INTO v_ph FROM player_saves WHERE needs_character_creation;
  v_log := v_log || format('STATS: total=%s has_save=%s active=%s admin=%s | real=%s placeholder=%s | has_save==real:%s',
    v_total, v_has, v_active, v_admin, v_real, v_ph, (v_has = v_real));

  -- ========== 激活码流程回归 ==========
  INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
    (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'regtest@example.com');
  INSERT INTO test_codes (code, status) VALUES ('TESTREG001','unused'), ('TESTREG002','unused'), ('TESTREG003','unused');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  -- ① 全新提交 → 期望 OK
  SELECT register_with_test_code('TESTREG001','device1') INTO v_res;
  v_log := v_log || E'\n① 全新提交=' || v_res || '(期望OK)';

  -- ② 创建占位档，驳回，用新码重申 → 期望 OK（占位档被排除，不再 SAVE_EXISTS 拦截）
  INSERT INTO player_saves (user_id, needs_character_creation) VALUES (v_uid, true);
  UPDATE user_approvals SET status='rejected' WHERE user_id=v_uid;
  UPDATE test_codes SET status='unused', used_by_user_id=NULL WHERE code='TESTREG001';
  SELECT register_with_test_code('TESTREG002','device1') INTO v_res;
  v_log := v_log || E'\n② 占位档后重申=' || v_res || '(期望OK)';

  -- ③ 占位档转为真实档，驳回，重申 → 期望 SAVE_EXISTS
  UPDATE player_saves SET needs_character_creation=false WHERE user_id=v_uid;
  UPDATE user_approvals SET status='rejected' WHERE user_id=v_uid;
  UPDATE test_codes SET status='unused', used_by_user_id=NULL WHERE code='TESTREG002';
  SELECT register_with_test_code('TESTREG003','device1') INTO v_res;
  v_log := v_log || E'\n③ 真实档后重申=' || v_res || '(期望SAVE_EXISTS)';

  RAISE EXCEPTION 'REGRESSION_RESULTS:%', E'\n' || v_log;
END $$;