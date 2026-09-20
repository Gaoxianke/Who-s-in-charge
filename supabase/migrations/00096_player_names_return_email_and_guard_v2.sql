DROP FUNCTION IF EXISTS public.admin_list_player_names(text, integer, integer);
DROP FUNCTION IF EXISTS public.admin_rename_player(uuid, text);

CREATE OR REPLACE FUNCTION public.admin_list_player_names(
  p_search text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE(
  id uuid, user_id uuid, player_name text, rank_level integer, rank_name text,
  created_at timestamptz, email text, banned boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT ps.id, ps.user_id, ps.player_name, ps.rank_level, ps.rank_name, ps.created_at,
         au.email, COALESCE(u.banned_until IS NOT NULL, false)
    FROM player_saves ps
    JOIN auth.users u ON u.id = ps.user_id
    LEFT JOIN admin_users au ON au.user_id = ps.user_id
   WHERE ps.deleted_at IS NULL
     AND (p_search IS NULL OR p_search = '' OR ps.player_name ILIKE '%' || trim(p_search) || '%')
   ORDER BY ps.player_name ASC, ps.created_at DESC
   LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_rename_player(
  p_id uuid,
  p_new_name text
)
RETURNS TABLE(ok boolean, err text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_name text; v_hit text;
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF v_uid IS NULL THEN RETURN QUERY SELECT false, 'NOT_AUTHENTICATED'; RETURN; END IF;
  v_name := trim(p_new_name);
  IF length(v_name) < 1 OR length(v_name) > 20 THEN
    RETURN QUERY SELECT false, '名称长度需为1-20字符'; RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM player_saves WHERE id = p_id) THEN
    RETURN QUERY SELECT false, '存档不存在'; RETURN;
  END IF;
  -- 敏感词熔断：新名称包含任一敏感词即拒绝
  SELECT word INTO v_hit FROM sensitive_words WHERE lower(v_name) LIKE '%' || word || '%' LIMIT 1;
  IF v_hit IS NOT NULL THEN
    RETURN QUERY SELECT false, '名称包含敏感词「' || v_hit || '」，已被熔断'; RETURN;
  END IF;
  UPDATE player_saves SET player_name = v_name, updated_at = now() WHERE id = p_id;
  RETURN QUERY SELECT true, NULL::text;
END;
$$;