CREATE OR REPLACE FUNCTION public.admin_delete_test_code_batch(p_batch_name text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT role INTO v_role FROM admin_users WHERE user_id = v_uid;
  IF COALESCE(v_role,'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_batch_name IS NULL OR btrim(p_batch_name) = '' THEN RAISE EXCEPTION 'invalid_batch'; END IF;

  DELETE FROM test_codes WHERE batch_name = p_batch_name;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  PERFORM admin_log_action('delete_test_code_batch', NULL,
    jsonb_build_object('batch_name', p_batch_name, 'deleted', v_count));
  RETURN v_count;
END;
$function$;