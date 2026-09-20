-- 重写：用单条批量 SQL 替代 FOR 循环，避免 statement_timeout
CREATE OR REPLACE FUNCTION public.admin_approve_all_temp_appeals()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_handler uuid := auth.uid();
  v_user_ids uuid[];
  v_count integer := 0;
BEGIN
  IF COALESCE(current_admin_role(), '') NOT IN ('admin','super_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- 一次性收集所有待处理申诉的用户 ID
  SELECT array_agg(user_id) INTO v_user_ids
  FROM temp_appeals WHERE status = 'pending';

  IF v_user_ids IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'count', 0);
  END IF;

  v_count := array_length(v_user_ids, 1);

  -- 批量删除旧存档（单条 DELETE，比逐条快几十倍）
  DELETE FROM player_saves WHERE user_id = ANY(v_user_ids);

  -- 批量更新申诉状态（单条 UPDATE）
  UPDATE temp_appeals
    SET status = 'approved', handler = v_handler, updated_at = now()
  WHERE status = 'pending';

  -- 审计日志（单条写入）
  INSERT INTO audit_log (admin_user_id, admin_email, action, target_user_id, detail)
  SELECT v_handler, COALESCE(au.email, ''), 'approve_all_temp_appeals', NULL,
         jsonb_build_object('count', v_count)
  FROM admin_users au WHERE au.user_id = v_handler;

  RETURN jsonb_build_object('ok', true, 'count', v_count);
END;
$$;