CREATE OR REPLACE FUNCTION public.admin_rename_test_code_batch(p_old_name text, p_new_name text)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT role INTO v_role FROM admin_users WHERE user_id = v_uid;
  IF COALESCE(v_role,'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF btrim(COALESCE(p_old_name,'')) = '' OR btrim(COALESCE(p_new_name,'')) = ''
    THEN RAISE EXCEPTION 'invalid_name'; END IF;
  IF p_old_name = p_new_name THEN RAISE EXCEPTION 'same_name'; END IF;
  IF EXISTS(SELECT 1 FROM test_codes WHERE batch_name = p_new_name)
    THEN RAISE EXCEPTION 'name_exists'; END IF;
  IF NOT EXISTS(SELECT 1 FROM test_codes WHERE batch_name = p_old_name)
    THEN RAISE EXCEPTION 'batch_not_found'; END IF;

  UPDATE test_codes SET batch_name = p_new_name WHERE batch_name = p_old_name;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  PERFORM admin_log_action('rename_test_code_batch', NULL,
    jsonb_build_object('old_name', p_old_name, 'new_name', p_new_name, 'updated', v_count));
  RETURN v_count;
END;
$$;