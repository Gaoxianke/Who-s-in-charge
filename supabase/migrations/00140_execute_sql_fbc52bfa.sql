DO $$
DECLARE v_uid uuid := '44444444-4444-4444-4444-444444444444'; v_ret uuid;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
  SELECT auth.uid() INTO v_ret;
  RAISE EXCEPTION 'auth.uid()=%', v_ret;
END $$;