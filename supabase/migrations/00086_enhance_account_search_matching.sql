-- 加强账号匹配：支持多关键词(空格分隔AND)、去首尾空格、精确匹配、user_id 匹配
CREATE OR REPLACE FUNCTION public.admin_account_list(
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_include_deleted boolean DEFAULT false
)
RETURNS TABLE(
  user_id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz,
  banned boolean, save_id uuid, player_name text, rank_level integer, rank_name text,
  merit_points integer, is_admin boolean, admin_role text, auth_deleted_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_search text := NULLIF(btrim(coalesce(p_search, '')), '');
  v_exact  text;
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT u.id, u.email, u.created_at, u.last_sign_in_at,
         (u.banned_until IS NOT NULL AND u.banned_until > now()) AS banned,
         ps.id, ps.player_name, ps.rank_level, ps.rank_name, ps.merit_points,
         EXISTS(SELECT 1 FROM admin_users a WHERE a.user_id=u.id),
         (SELECT a.role FROM admin_users a WHERE a.user_id=u.id),
         u.deleted_at
  FROM auth.users u
  LEFT JOIN player_saves ps ON ps.user_id = u.id
  WHERE (p_include_deleted OR u.deleted_at IS NULL)
    AND (
      v_search IS NULL
      OR u.email ILIKE '%'||v_search||'%'
      OR ps.player_name ILIKE '%'||v_search||'%'
      -- 精确匹配（去除所有空格后比较，避免邮箱带空格匹配不到）
      OR replace(u.email, ' ', '') = replace(v_search, ' ', '')
      OR replace(coalesce(ps.player_name, ''), ' ', '') = replace(v_search, ' ', '')
      -- user_id 精确匹配
      OR u.id::text = v_search
    )
  ORDER BY
    -- 精确匹配优先排序
    CASE
      WHEN u.email = v_search THEN 0
      WHEN replace(u.email, ' ', '') = replace(v_search, ' ', '') THEN 1
      ELSE 2
    END,
    u.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;