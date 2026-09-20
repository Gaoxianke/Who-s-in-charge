CREATE OR REPLACE FUNCTION public.admin_rename_player(
  p_id uuid,
  p_new_name text
)
RETURNS TABLE(ok boolean, err text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF v_uid IS NULL THEN RETURN QUERY SELECT false, 'NOT_AUTHENTICATED'; RETURN; END IF;
  IF p_new_name IS NULL OR length(trim(p_new_name)) < 1 OR length(trim(p_new_name)) > 20 THEN
    RETURN QUERY SELECT false, '名称长度需为1-20字符'; RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM player_saves WHERE id = p_id) THEN
    RETURN QUERY SELECT false, '存档不存在'; RETURN;
  END IF;
  UPDATE player_saves SET player_name = trim(p_new_name), updated_at = now() WHERE id = p_id;
  RETURN QUERY SELECT true, NULL::text;
END;
$$;