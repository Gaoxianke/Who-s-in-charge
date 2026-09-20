-- ═══════════════════════════════════════════════════════════
-- 修复1: admin_approve_user — 通过时，同邮箱的其他 pending 记录自动驳回
-- 修复2: admin_reject_user — 驳回时，同邮箱的其他 pending 记录也一并驳回
-- 修复3: admin_approval_list — 加强搜索（去空格、支持 user_id 前缀）
-- ═══════════════════════════════════════════════════════════

-- ── admin_approve_user ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_approve_user(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_reviewer uuid := auth.uid();
  v_email    text;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  -- 获取邮箱
  SELECT email INTO v_email FROM user_approvals WHERE user_id = p_user_id;
  -- 通过目标记录
  UPDATE user_approvals
     SET status = 'approved', reviewed_by = v_reviewer, reviewed_at = now()
   WHERE user_id = p_user_id AND status = 'pending';
  UPDATE player_saves SET approval_status = 'approved', updated_at = now()
   WHERE user_id = p_user_id;
  -- 同邮箱其他 pending 记录自动驳回（去重）
  IF v_email IS NOT NULL THEN
    UPDATE user_approvals
       SET status = 'rejected',
           reject_reason = '重复申请，同邮箱已有一条审批通过',
           reviewed_by = v_reviewer,
           reviewed_at = now()
     WHERE email = v_email
       AND user_id <> p_user_id
       AND status = 'pending';
  END IF;
  PERFORM admin_log_action('approve_user', p_user_id, NULL);
END;
$$;

-- ── admin_reject_user ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_reject_user(p_user_id uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_reviewer uuid := auth.uid();
  v_email    text;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT email INTO v_email FROM user_approvals WHERE user_id = p_user_id;
  UPDATE user_approvals
     SET status = 'rejected',
         reject_reason = COALESCE(NULLIF(p_reason,''), '未通过'),
         reviewed_by = v_reviewer,
         reviewed_at = now()
   WHERE user_id = p_user_id AND status = 'pending';
  UPDATE player_saves SET approval_status = 'rejected', updated_at = now()
   WHERE user_id = p_user_id;
  -- 同邮箱其他 pending 记录一并驳回
  IF v_email IS NOT NULL THEN
    UPDATE user_approvals
       SET status = 'rejected',
           reject_reason = COALESCE(NULLIF(p_reason,''), '未通过'),
           reviewed_by = v_reviewer,
           reviewed_at = now()
     WHERE email = v_email
       AND user_id <> p_user_id
       AND status = 'pending';
  END IF;
  PERFORM admin_log_action('reject_user', p_user_id, jsonb_build_object('reason', p_reason));
END;
$$;

-- ── admin_batch_approve_all_pending — 也处理邮箱重复 ──────────
CREATE OR REPLACE FUNCTION public.admin_batch_approve_all_pending()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_reviewer uuid := auth.uid();
  v_cnt      int  := 0;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  -- 每个邮箱只保留最新一条 pending 通过，其余驳回
  WITH ranked AS (
    SELECT id, user_id, email,
           ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) AS rn
      FROM user_approvals
     WHERE status = 'pending'
  ),
  to_approve AS (
    SELECT user_id FROM ranked WHERE rn = 1
  ),
  to_dedup AS (
    SELECT user_id FROM ranked WHERE rn > 1
  )
  UPDATE user_approvals ua
     SET status = CASE
           WHEN ua.user_id IN (SELECT user_id FROM to_approve) THEN 'approved'
           ELSE 'rejected'
         END,
         reject_reason = CASE
           WHEN ua.user_id IN (SELECT user_id FROM to_dedup) THEN '重复申请，同邮箱已有一条审批通过'
           ELSE NULL
         END,
         reviewed_by = v_reviewer,
         reviewed_at = now()
   WHERE ua.status = 'pending';
  GET DIAGNOSTICS v_cnt = ROW_COUNT;
  UPDATE player_saves ps SET approval_status = ua.status, updated_at = now()
    FROM user_approvals ua
   WHERE ps.user_id = ua.user_id
     AND ua.reviewed_at >= now() - interval '10 seconds';
  PERFORM admin_log_action('batch_approve_all', NULL, jsonb_build_object('count', v_cnt));
  RETURN v_cnt;
END;
$$;

-- ── admin_approval_list — 强化搜索 ────────────────────────
DROP FUNCTION IF EXISTS public.admin_approval_list(text, text, int, int);
CREATE OR REPLACE FUNCTION public.admin_approval_list(
  p_search text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_limit  int  DEFAULT 50,
  p_offset int  DEFAULT 0
)
RETURNS TABLE(
  id uuid, user_id uuid, email text, status text, test_code_id uuid,
  reject_reason text, reviewed_by uuid, reviewed_at timestamptz,
  created_at timestamptz, player_name text, rank_level int, rank_name text,
  dup_email_count bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_q text := NULLIF(TRIM(COALESCE(p_search, '')), '');
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  WITH dup_counts AS (
    -- 统计每个邮箱出现次数（用于前端高亮重复）
    SELECT email AS dc_email, COUNT(*)::bigint AS dc_cnt
      FROM user_approvals
     GROUP BY email
  )
  SELECT ua.id, ua.user_id, ua.email, ua.status, ua.test_code_id,
         ua.reject_reason, ua.reviewed_by, ua.reviewed_at, ua.created_at,
         ps.player_name, ps.rank_level, ps.rank_name,
         COALESCE(dc.dc_cnt, 1)::bigint AS dup_email_count
    FROM user_approvals ua
    LEFT JOIN player_saves ps ON ps.user_id = ua.user_id
    LEFT JOIN dup_counts dc ON dc.dc_email = ua.email
   WHERE (
     v_q IS NULL
     OR ua.email ILIKE '%' || v_q || '%'
     OR COALESCE(ps.player_name, '') ILIKE '%' || v_q || '%'
     OR ua.user_id::text ILIKE v_q || '%'
   )
   AND (p_status IS NULL OR p_status = 'all' OR ua.status = p_status)
   ORDER BY
     -- 重复邮箱排最前
     COALESCE(dc.dc_cnt, 1) DESC,
     ua.created_at DESC
   LIMIT p_limit OFFSET p_offset;
END;
$$;