DO $$
DECLARE v_uid uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc'; v_res text;
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES (v_uid,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','flow1@example.com');
  INSERT INTO test_codes (code, status) VALUES ('FL01','unused');
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
  SELECT register_with_test_code('FL01','devF','7.7.7.7') INTO v_res;
  RAISE EXCEPTION 'reg=%', v_res;
END $$;