DO $$
DECLARE
  v_uid uuid := 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  v_admin uuid := '11111111-2222-3333-4444-555555555555';
  v_batch jsonb;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
    (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'batch1@example.com'),
    (v_admin,'00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'batchadmin@example.com');
  INSERT INTO admin_users (user_id, email, role) VALUES (v_admin, 'batchadmin@example.com', 'super_admin');
  INSERT INTO player_saves (user_id, needs_character_creation) VALUES (v_uid, false);
  INSERT INTO temp_appeals (user_id, email, reason) VALUES (v_uid, 'batch1@example.com', '批量测试');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  SELECT admin_approve_all_temp_appeals() INTO v_batch;
  RAISE EXCEPTION 'BATCH=% save_after=%', v_batch, (SELECT count(*) FROM player_saves WHERE user_id=v_uid);
END $$;