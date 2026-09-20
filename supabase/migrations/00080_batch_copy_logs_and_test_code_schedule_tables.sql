-- 批次复制日志表
CREATE TABLE IF NOT EXISTS batch_copy_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_name      text NOT NULL,
  copied_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  copied_by_email text,
  code_count      int  NOT NULL DEFAULT 0,
  copied_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bcl_batch ON batch_copy_logs (batch_name, copied_at DESC);
ALTER TABLE batch_copy_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY bcl_admin_all ON batch_copy_logs
  USING (is_current_admin()) WITH CHECK (is_current_admin());

-- 测试码申请时间窗口表
CREATE TABLE IF NOT EXISTS test_code_schedule (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  open_time        text NOT NULL,
  close_time       text NOT NULL,
  enabled          boolean NOT NULL DEFAULT true,
  status           text NOT NULL DEFAULT 'pending',
  note             text,
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_email text,
  approved_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reject_reason    text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE test_code_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY tcs_admin_all  ON test_code_schedule
  USING (is_current_admin()) WITH CHECK (is_current_admin());
CREATE POLICY tcs_auth_active ON test_code_schedule FOR SELECT
  TO authenticated USING (status = 'active');

-- admin_log_batch_copy
CREATE OR REPLACE FUNCTION public.admin_log_batch_copy(p_batch_name text, p_code_count int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := auth.uid(); v_email text;
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  INSERT INTO batch_copy_logs (batch_name, copied_by, copied_by_email, code_count)
  VALUES (p_batch_name, v_uid, v_email, p_code_count);
END;
$$;

-- get_test_code_schedule（玩家和管理员均可调用）
CREATE OR REPLACE FUNCTION public.get_test_code_schedule()
RETURNS TABLE(id uuid, open_time text, close_time text, enabled boolean, note text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RETURN QUERY
  SELECT tcs.id, tcs.open_time, tcs.close_time, tcs.enabled, tcs.note
  FROM test_code_schedule tcs WHERE tcs.status = 'active'
  ORDER BY tcs.updated_at DESC LIMIT 1;
END;
$$;

-- admin_upsert_schedule
CREATE OR REPLACE FUNCTION public.admin_upsert_schedule(
  p_open_time text, p_close_time text, p_enabled boolean, p_note text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_uid uuid := auth.uid(); v_role text := current_admin_role();
  v_email text; v_status text; v_new_id uuid;
BEGIN
  IF COALESCE(v_role,'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_open_time  !~ '^\d{2}:\d{2}$' THEN RAISE EXCEPTION 'invalid_open_time'; END IF;
  IF p_close_time !~ '^\d{2}:\d{2}$' THEN RAISE EXCEPTION 'invalid_close_time'; END IF;
  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_role = 'super_admin' THEN
    UPDATE test_code_schedule SET status = 'superseded', updated_at = now() WHERE status = 'active';
    v_status := 'active';
  ELSE
    v_status := 'pending';
  END IF;
  INSERT INTO test_code_schedule (open_time, close_time, enabled, status, note, created_by, created_by_email, approved_by)
  VALUES (p_open_time, p_close_time, p_enabled, v_status, p_note, v_uid, v_email,
          CASE WHEN v_role = 'super_admin' THEN v_uid ELSE NULL END)
  RETURNING id INTO v_new_id;
  PERFORM admin_log_action('upsert_schedule', NULL,
    jsonb_build_object('open', p_open_time, 'close', p_close_time, 'enabled', p_enabled, 'status', v_status));
  RETURN jsonb_build_object('id', v_new_id, 'status', v_status);
END;
$$;

-- admin_list_schedule_requests
CREATE OR REPLACE FUNCTION public.admin_list_schedule_requests(p_limit int DEFAULT 20)
RETURNS TABLE(
  id uuid, open_time text, close_time text, enabled boolean, status text, note text,
  created_by_email text, approved_by uuid, reject_reason text, created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT tcs.id, tcs.open_time, tcs.close_time, tcs.enabled, tcs.status, tcs.note,
         tcs.created_by_email, tcs.approved_by, tcs.reject_reason, tcs.created_at
  FROM test_code_schedule tcs ORDER BY tcs.created_at DESC LIMIT p_limit;
END;
$$;

-- admin_approve_schedule
CREATE OR REPLACE FUNCTION public.admin_approve_schedule(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RAISE EXCEPTION 'forbidden: super_admin only'; END IF;
  IF NOT EXISTS(SELECT 1 FROM test_code_schedule WHERE id = p_id AND status = 'pending')
    THEN RAISE EXCEPTION 'request_not_found'; END IF;
  UPDATE test_code_schedule SET status = 'superseded', updated_at = now() WHERE status = 'active';
  UPDATE test_code_schedule SET status = 'active', approved_by = v_uid, updated_at = now() WHERE id = p_id;
  PERFORM admin_log_action('approve_schedule', p_id::text, '{}'::jsonb);
  RETURN jsonb_build_object('approved', true);
END;
$$;

-- admin_reject_schedule
CREATE OR REPLACE FUNCTION public.admin_reject_schedule(p_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RAISE EXCEPTION 'forbidden: super_admin only'; END IF;
  UPDATE test_code_schedule SET status = 'rejected', reject_reason = p_reason, updated_at = now()
    WHERE id = p_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'request_not_found'; END IF;
  PERFORM admin_log_action('reject_schedule', p_id::text, jsonb_build_object('reason', p_reason));
  RETURN jsonb_build_object('rejected', true);
END;
$$;