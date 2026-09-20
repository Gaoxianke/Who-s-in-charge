DO $$
DECLARE v_admin uuid := '11111111-2222-3333-4444-555555555555'; v_batch jsonb;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES (v_admin,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','batchadmin@example.com');
  INSERT INTO admin_users (user_id, email, role) VALUES (v_admin, 'batchadmin@example.com', 'super_admin');
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  SELECT admin_approve_all_temp_appeals() INTO v_batch;
  RAISE EXCEPTION 'BATCH=%', v_batch;
END $$;