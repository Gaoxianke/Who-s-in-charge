DROP FUNCTION public.admin_list_ban_appeals(text, int, int);

CREATE FUNCTION public.admin_list_ban_appeals(p_status text, p_limit int, p_offset int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_rows jsonb;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_agg(t) INTO v_rows FROM (
    SELECT id, email, reason, status, review_note, reviewed_by, reviewed_at, created_at,
           ban_type, banned_at
    FROM ban_appeals
    WHERE (p_status IS NULL OR status = p_status)
    ORDER BY created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) t;
  RETURN COALESCE(v_rows, '[]'::jsonb);
END;
$$;