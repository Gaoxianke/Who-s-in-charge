-- register_with_test_code
CREATE OR REPLACE FUNCTION register_with_test_code(p_test_code text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_code test_codes%ROWTYPE;
  v_app user_approvals%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RETURN 'NOT_AUTHENTICATED'; END IF;
  SELECT * INTO v_code FROM test_codes WHERE code = upper(trim(p_test_code));
  IF NOT FOUND THEN RETURN 'CODE_NOT_FOUND'; END IF;
  IF v_code.status = 'used' THEN RETURN 'CODE_ALREADY_USED'; END IF;
  IF v_code.status = 'disabled' THEN RETURN 'CODE_DISABLED'; END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    UPDATE test_codes SET status = 'expired' WHERE id = v_code.id;
    RETURN 'CODE_EXPIRED';
  END IF;
  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;
  IF FOUND THEN
    IF v_app.status = 'approved' THEN RETURN 'ALREADY_APPROVED'; END IF;
    IF v_app.status = 'pending' THEN RETURN 'ALREADY_PENDING'; END IF;
    UPDATE test_codes SET status='unused', used_by_user_id=NULL, used_by_email=NULL, used_at=NULL WHERE id = v_app.test_code_id;
    UPDATE user_approvals SET status='pending', test_code_id=v_code.id, reject_reason=NULL, reviewed_by=NULL, reviewed_at=NULL, created_at=now()
      WHERE user_id = v_uid;
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=(SELECT email FROM auth.users WHERE id=v_uid), used_at=now() WHERE id = v_code.id;
    UPDATE player_saves SET approval_status='pending', updated_at=now() WHERE user_id = v_uid;
    RETURN 'OK';
  END IF;
  UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=(SELECT email FROM auth.users WHERE id=v_uid), used_at=now() WHERE id = v_code.id;
  INSERT INTO user_approvals (user_id, email, status, test_code_id)
    VALUES (v_uid, (SELECT email FROM auth.users WHERE id=v_uid), 'pending', v_code.id);
  UPDATE player_saves SET approval_status='pending', updated_at=now() WHERE user_id = v_uid;
  RETURN 'OK';
END;
$$;

CREATE OR REPLACE FUNCTION admin_generate_test_codes(p_batch_name text, p_count int, p_expires_at timestamptz DEFAULT NULL, p_note text DEFAULT NULL)
RETURNS SETOF text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i int; v_code text; v_uid uuid := auth.uid(); v_email text;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_count IS NULL OR p_count < 1 THEN RAISE EXCEPTION '数量至少为 1'; END IF;
  SELECT email INTO v_email FROM admin_users WHERE user_id = v_uid;
  FOR i IN 1..p_count LOOP
    v_code := 'TEST-' || upper(substr(encode(gen_random_bytes(3),'hex'),1,6));
    INSERT INTO test_codes (code, batch_name, status, expires_at, note, created_by, created_by_email)
      VALUES (v_code, COALESCE(NULLIF(p_batch_name,''),'默认批次'), 'unused', p_expires_at, p_note, v_uid, COALESCE(v_email,''));
    RETURN NEXT v_code;
  END LOOP;
  PERFORM admin_log_action('generate_test_codes', NULL, jsonb_build_object('count', p_count, 'batch', p_batch_name));
END;
$$;

CREATE OR REPLACE FUNCTION admin_list_test_code_batches()
RETURNS TABLE(batch_name text, total bigint, used bigint, disabled bigint, available bigint, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT batch_name,
    count(*) AS total,
    count(*) FILTER (WHERE status = 'used') AS used,
    count(*) FILTER (WHERE status IN ('disabled','expired')) AS disabled,
    count(*) FILTER (WHERE status IN ('unused','available')) AS available,
    min(created_at) AS created_at
  FROM test_codes
  GROUP BY batch_name
  ORDER BY min(created_at) DESC;
$$;

CREATE OR REPLACE FUNCTION admin_list_test_codes(p_batch_name text DEFAULT NULL, p_status text DEFAULT NULL, p_limit int DEFAULT 100, p_offset int DEFAULT 0)
RETURNS TABLE(
  id uuid, code text, batch_name text, status text, used_by_user_id uuid, used_by_email text, used_at timestamptz,
  expires_at timestamptz, note text, created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT id, code, batch_name, status, used_by_user_id, used_by_email, used_at, expires_at, note, created_at
  FROM test_codes
  WHERE (p_batch_name IS NULL OR p_batch_name = 'all' OR batch_name = p_batch_name)
    AND (p_status IS NULL OR p_status = 'all' OR status = p_status)
  ORDER BY created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION admin_approve_user(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_reviewer uuid := auth.uid(); v_email text;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  UPDATE user_approvals SET status='approved', reviewed_by=v_reviewer, reviewed_at=now() WHERE user_id = p_user_id;
  UPDATE player_saves SET approval_status='approved', updated_at=now() WHERE user_id = p_user_id;
  INSERT INTO audit_log (admin_user_id, admin_email, action, target_user_id, detail)
  SELECT v_reviewer, COALESCE((SELECT email FROM admin_users WHERE user_id=v_reviewer),''), 'approve_user', p_user_id::text, jsonb_build_object('target_email', v_email)
  WHERE EXISTS (SELECT 1 FROM user_approvals WHERE user_id = p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION admin_reject_user(p_user_id uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_reviewer uuid := auth.uid(); v_email text;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  UPDATE user_approvals SET status='rejected', reject_reason=COALESCE(NULLIF(p_reason,''),'未通过'), reviewed_by=v_reviewer, reviewed_at=now() WHERE user_id = p_user_id;
  UPDATE player_saves SET approval_status='rejected', updated_at=now() WHERE user_id = p_user_id;
  INSERT INTO audit_log (admin_user_id, admin_email, action, target_user_id, detail)
  SELECT v_reviewer, COALESCE((SELECT email FROM admin_users WHERE user_id=v_reviewer),''), 'reject_user', p_user_id::text, jsonb_build_object('target_email', v_email, 'reason', p_reason)
  WHERE EXISTS (SELECT 1 FROM user_approvals WHERE user_id = p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION get_my_approval_status()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT status FROM user_approvals WHERE user_id = auth.uid()), 'none');
$$;

CREATE OR REPLACE FUNCTION get_my_test_code_status()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_app user_approvals%ROWTYPE; v_code text;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('approval_status','none','has_code',false,'test_code',NULL); END IF;
  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;
  SELECT tc.code INTO v_code FROM test_codes tc WHERE tc.id = v_app.test_code_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('approval_status','none','has_code',false,'test_code',NULL);
  END IF;
  RETURN jsonb_build_object('approval_status', v_app.status, 'has_code', v_app.test_code_id IS NOT NULL, 'test_code', v_code);
END;
$$;

CREATE OR REPLACE FUNCTION admin_create_database(p_code text, p_name text, p_capacity_limit int DEFAULT 1000)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_id uuid; v_sort int;
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RAISE EXCEPTION 'err: super_admin only'; END IF;
  IF NULLIF(trim(p_code),'') IS NULL OR NULLIF(trim(p_name),'') IS NULL THEN RAISE EXCEPTION 'err: 编码和名称不能为空'; END IF;
  IF p_capacity_limit IS NULL OR p_capacity_limit < 100 THEN RAISE EXCEPTION 'err: 容量上限至少为 100'; END IF;
  IF EXISTS (SELECT 1 FROM game_databases WHERE code = p_code) THEN RAISE EXCEPTION 'err: 大区编码已存在'; END IF;
  SELECT COALESCE(max(sort_order),0)+1 INTO v_sort FROM game_databases;
  INSERT INTO game_databases (code, name, capacity_limit, is_active, is_full, sort_order)
    VALUES (p_code, p_name, p_capacity_limit, true, false, v_sort)
    RETURNING id INTO v_id;
  PERFORM admin_log_action('create_database', NULL, jsonb_build_object('db_id', v_id, 'code', p_code, 'name', p_name));
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION admin_update_database(p_db_id uuid, p_name text DEFAULT NULL, p_capacity_limit int DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RAISE EXCEPTION 'err: super_admin only'; END IF;
  IF p_capacity_limit IS NOT NULL AND p_capacity_limit < 100 THEN RAISE EXCEPTION 'err: 容量上限至少为 100'; END IF;
  UPDATE game_databases SET
    name = COALESCE(NULLIF(p_name,''), name),
    capacity_limit = COALESCE(p_capacity_limit, capacity_limit)
  WHERE id = p_db_id;
  PERFORM admin_log_action('update_database', NULL, jsonb_build_object('db_id', p_db_id, 'name', p_name, 'capacity_limit', p_capacity_limit));
END;
$$;

CREATE OR REPLACE FUNCTION admin_toggle_database_active(p_db_id uuid, p_is_active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RAISE EXCEPTION 'err: super_admin only'; END IF;
  UPDATE game_databases SET is_active = p_is_active WHERE id = p_db_id;
  PERFORM admin_log_action('toggle_database_active', NULL, jsonb_build_object('db_id', p_db_id, 'is_active', p_is_active));
END;
$$;

GRANT EXECUTE ON FUNCTION
  register_with_test_code(text),
  admin_generate_test_codes(text,int,timestamptz,text),
  admin_list_test_codes(text,text,int,int),
  admin_list_test_code_batches(),
  admin_approve_user(uuid),
  admin_reject_user(uuid,text),
  get_my_approval_status(),
  get_my_test_code_status(),
  admin_create_database(text,text,int),
  admin_update_database(uuid,text,int),
  admin_toggle_database_active(uuid,boolean)
TO authenticated;