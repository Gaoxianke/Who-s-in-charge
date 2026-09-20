CREATE OR REPLACE FUNCTION public.admin_approve_all_temp_appeals()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_handler uuid := auth.uid();
  v_count integer := 0;
  r temp_appeals%ROWTYPE;
BEGIN
  IF COALESCE(current_admin_role(), '') NOT IN ('admin','super_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR r IN SELECT * FROM temp_appeals WHERE status = 'pending' LOOP
    UPDATE temp_appeals SET status='approved', handler=v_handler, updated_at=now() WHERE id=r.id;
    -- 同意后删除该玩家旧存档（子表 ON DELETE CASCADE 自动清理）
    DELETE FROM player_saves WHERE user_id = r.user_id;
    v_count := v_count + 1;
  END LOOP;

  PERFORM admin_log_action('approve_all_temp_appeals', NULL, jsonb_build_object('count', v_count));
  RETURN jsonb_build_object('ok', true, 'count', v_count);
END;
$$;