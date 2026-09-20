-- 测试码表
CREATE TABLE test_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  batch_name text NOT NULL DEFAULT '默认批次',
  status text NOT NULL DEFAULT 'unused' CHECK (status IN ('unused','used','disabled','available','expired')),
  used_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_by_email text,
  used_at timestamptz,
  expires_at timestamptz,
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE test_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "test_codes_admin_read" ON test_codes FOR SELECT TO authenticated USING (is_current_admin());
CREATE POLICY "test_codes_admin_write" ON test_codes FOR ALL TO authenticated
  USING (COALESCE(current_admin_role(),'') IN ('admin','super_admin'))
  WITH CHECK (COALESCE(current_admin_role(),'') IN ('admin','super_admin'));

-- 用户审批表
CREATE TABLE user_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  test_code_id uuid REFERENCES test_codes(id) ON DELETE SET NULL,
  reject_reason text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
ALTER TABLE user_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approval_admin_read" ON user_approvals FOR SELECT TO authenticated USING (is_current_admin());
CREATE POLICY "approval_admin_write" ON user_approvals FOR ALL TO authenticated
  USING (COALESCE(current_admin_role(),'') IN ('admin','super_admin'))
  WITH CHECK (COALESCE(current_admin_role(),'') IN ('admin','super_admin'));
CREATE POLICY "approval_self_read" ON user_approvals FOR SELECT TO authenticated USING (user_id = auth.uid());

-- player_saves 增加 approval_status 列
ALTER TABLE player_saves ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved';

-- 审批统计
CREATE OR REPLACE FUNCTION admin_approval_stats()
RETURNS TABLE(pending bigint, approved bigint, rejected bigint, total bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    count(*) FILTER (WHERE status='pending'),
    count(*) FILTER (WHERE status='approved'),
    count(*) FILTER (WHERE status='rejected'),
    count(*)
  FROM user_approvals;
$$;

-- 审批列表
CREATE OR REPLACE FUNCTION admin_approval_list(p_search text DEFAULT NULL, p_status text DEFAULT NULL, p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS TABLE(
  id uuid, user_id uuid, email text, status text, test_code_id uuid, reject_reason text,
  reviewed_by uuid, reviewed_at timestamptz, created_at timestamptz,
  player_name text, rank_level int, rank_name text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT ua.id, ua.user_id, ua.email, ua.status, ua.test_code_id, ua.reject_reason,
         ua.reviewed_by, ua.reviewed_at, ua.created_at,
         ps.player_name, ps.rank_level, ps.rank_name
  FROM user_approvals ua
  LEFT JOIN player_saves ps ON ps.user_id = ua.user_id
  WHERE (p_search IS NULL OR p_search = '' OR ua.email ILIKE '%'||p_search||'%' OR COALESCE(ps.player_name,'') ILIKE '%'||p_search||'%')
    AND (p_status IS NULL OR p_status = 'all' OR ua.status = p_status)
  ORDER BY ua.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 批量通过
CREATE OR REPLACE FUNCTION admin_batch_approve(p_user_ids uuid[])
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid; v_cnt int := 0; v_reviewer uuid := auth.uid();
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  FOREACH v_uid IN ARRAY p_user_ids LOOP
    UPDATE user_approvals SET status='approved', reviewed_by=v_reviewer, reviewed_at=now()
    WHERE user_id = v_uid AND status = 'pending';
    IF FOUND THEN
      UPDATE player_saves SET approval_status='approved', updated_at=now() WHERE user_id = v_uid;
      v_cnt := v_cnt + 1;
    END IF;
  END LOOP;
  PERFORM admin_log_action('batch_approve', NULL, jsonb_build_object('count', v_cnt));
  RETURN v_cnt;
END;
$$;

-- 批量驳回
CREATE OR REPLACE FUNCTION admin_batch_reject(p_user_ids uuid[], p_reason text)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid; v_cnt int := 0; v_reviewer uuid := auth.uid();
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  FOREACH v_uid IN ARRAY p_user_ids LOOP
    UPDATE user_approvals SET status='rejected', reject_reason=COALESCE(NULLIF(p_reason,''),'未通过'), reviewed_by=v_reviewer, reviewed_at=now()
    WHERE user_id = v_uid AND status = 'pending';
    IF FOUND THEN
      UPDATE player_saves SET approval_status='rejected', updated_at=now() WHERE user_id = v_uid;
      v_cnt := v_cnt + 1;
    END IF;
  END LOOP;
  PERFORM admin_log_action('batch_reject', NULL, jsonb_build_object('count', v_cnt, 'reason', p_reason));
  RETURN v_cnt;
END;
$$;

-- 测试码统计
CREATE OR REPLACE FUNCTION admin_test_code_stats()
RETURNS TABLE(unused bigint, used bigint, disabled bigint, total bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    count(*) FILTER (WHERE status IN ('unused','available')),
    count(*) FILTER (WHERE status = 'used'),
    count(*) FILTER (WHERE status IN ('disabled','expired')),
    count(*)
  FROM test_codes;
$$;

GRANT EXECUTE ON FUNCTION
  admin_approval_stats(),
  admin_approval_list(text,text,int,int),
  admin_batch_approve(uuid[]),
  admin_batch_reject(uuid[],text),
  admin_test_code_stats()
TO authenticated;