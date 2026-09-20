-- 批次2：账号库只保留已审核通过的账号（有 user_approvals 且 status='approved'）
DROP FUNCTION public.admin_account_list(text, int, int, boolean);

CREATE FUNCTION public.admin_account_list(p_search text, p_limit int, p_offset int, p_include_deleted boolean)
RETURNS TABLE(
  user_id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz,
  banned boolean, save_id uuid, player_name text, rank_level int, rank_name text,
  merit_points bigint, is_admin boolean, admin_role text, deleted_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_search text := NULLIF(btrim(coalesce(p_search, '')), '');
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
  INNER JOIN user_approvals ua ON ua.user_id = u.id AND ua.status = 'approved'
  LEFT JOIN player_saves ps ON ps.user_id = u.id
  WHERE (p_include_deleted OR u.deleted_at IS NULL)
    AND (
      v_search IS NULL
      OR u.email ILIKE '%'||v_search||'%'
      OR ps.player_name ILIKE '%'||v_search||'%'
      OR replace(u.email, ' ', '') = replace(v_search, ' ', '')
      OR replace(coalesce(ps.player_name, ''), ' ', '') = replace(v_search, ' ', '')
      OR u.id::text = v_search
    )
  ORDER BY
    CASE
      WHEN u.email = v_search THEN 0
      WHEN replace(u.email, ' ', '') = replace(v_search, ' ', '') THEN 1
      ELSE 2
    END,
    u.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 批次3：未审核库覆盖所有未审核通过的账号
--   ① 有 user_approvals 但 status 为 pending/rejected 的
--   ② 注册了 auth.users 但完全没有 user_approvals 记录的（邮箱注册未提交测试码）
DROP FUNCTION public.admin_list_unapproved_accounts(int, int);

CREATE FUNCTION public.admin_list_unapproved_accounts(p_limit int, p_offset int)
RETURNS TABLE(
  user_id uuid, email text, status text, reject_reason text,
  device_id text, created_at timestamptz, has_pending_appeal boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT u.id AS user_id,
         coalesce(ua.email, u.email) AS email,
         coalesce(ua.status, '未提交测试码') AS status,
         ua.reject_reason,
         ua.device_id,
         coalesce(ua.created_at, u.created_at) AS created_at,
         EXISTS(
           SELECT 1 FROM account_appeals ap
           WHERE ap.target_user_id = u.id AND ap.status = 'pending'
         ) AS has_pending_appeal
  FROM auth.users u
  LEFT JOIN user_approvals ua ON ua.user_id = u.id
  WHERE u.deleted_at IS NULL
    AND (
      ua.user_id IS NULL                      -- ② 从未提交测试码
      OR ua.status IN ('pending', 'rejected')  -- ① 已提交但未通过
    )
  ORDER BY coalesce(ua.created_at, u.created_at) DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;