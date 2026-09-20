-- 编组改名：将某编组下所有测试码的 group_name 整体更新
CREATE OR REPLACE FUNCTION public.admin_rename_test_code_group(p_old text, p_new text)
RETURNS TABLE(ok boolean, err text, updated int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_count int;
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_old IS NULL OR length(trim(p_old)) = 0 THEN RETURN QUERY SELECT false, '原编组名不能为空', 0; RETURN; END IF;
  IF p_new IS NULL OR length(trim(p_new)) = 0 THEN RETURN QUERY SELECT false, '新编组名不能为空', 0; RETURN; END IF;
  IF length(trim(p_new)) > 30 THEN RETURN QUERY SELECT false, '编组名不超过30字符', 0; RETURN; END IF;
  IF trim(p_old) = trim(p_new) THEN RETURN QUERY SELECT false, '新编组名与原名相同', 0; RETURN; END IF;
  UPDATE test_codes SET group_name = trim(p_new) WHERE group_name = trim(p_old);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  PERFORM admin_log_action('rename_test_code_group', NULL, jsonb_build_object('old', p_old, 'new', p_new, 'updated', v_count));
  RETURN QUERY SELECT true, NULL::text, v_count;
END;
$$;

-- 编组删除：删除某编组下所有未使用的测试码（已使用/已禁用/已过期的保留）
CREATE OR REPLACE FUNCTION public.admin_delete_test_code_group(p_group text)
RETURNS TABLE(ok boolean, err text, deleted int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_count int;
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_group IS NULL OR length(trim(p_group)) = 0 THEN RETURN QUERY SELECT false, '编组名不能为空', 0; RETURN; END IF;
  DELETE FROM test_codes WHERE group_name = trim(p_group) AND status = 'unused';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  PERFORM admin_log_action('delete_test_code_group', NULL, jsonb_build_object('group', p_group, 'deleted', v_count));
  RETURN QUERY SELECT true, NULL::text, v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_rename_test_code_group(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_test_code_group(text)   TO authenticated;