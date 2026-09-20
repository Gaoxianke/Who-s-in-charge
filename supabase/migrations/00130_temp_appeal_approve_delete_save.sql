-- 同意临时申诉时，自动删除该玩家旧存档（级联清理所有关联数据），使其可重新建档
CREATE OR REPLACE FUNCTION public.admin_review_temp_appeal(p_id uuid, p_approve boolean, p_reject_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_row temp_appeals%ROWTYPE; v_reason text := trim(COALESCE(p_reject_reason, ''));
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO v_row FROM temp_appeals WHERE id = p_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'err', '申诉不存在'); END IF;
  IF v_row.status <> 'pending' THEN RETURN jsonb_build_object('ok', false, 'err', '该申诉已处理'); END IF;

  IF p_approve THEN
    UPDATE temp_appeals SET status='approved', handler=auth.uid(), updated_at=now() WHERE id=p_id;
    -- 同意后删除该玩家旧存档（子表均为 ON DELETE CASCADE，自动级联清理）
    DELETE FROM player_saves WHERE user_id = v_row.user_id;
  ELSE
    IF v_reason = '' THEN RETURN jsonb_build_object('ok', false, 'err', '拒绝时请填写拒绝理由'); END IF;
    UPDATE temp_appeals SET status='rejected', reject_reason=v_reason, handler=auth.uid(), updated_at=now() WHERE id=p_id;
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_review_temp_appeal(uuid, boolean, text) TO authenticated;