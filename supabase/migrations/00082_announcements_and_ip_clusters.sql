
-- ─── 公告表 ───
CREATE TABLE IF NOT EXISTS public.announcements (
  id              serial PRIMARY KEY,
  page_key        text NOT NULL UNIQUE,   -- 'login' 或 'enter_code'
  title           text NOT NULL DEFAULT '',
  content         text NOT NULL DEFAULT '',
  active          boolean NOT NULL DEFAULT true,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by_email text
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_announcements" ON public.announcements;
DROP POLICY IF EXISTS "admin_manage_announcements" ON public.announcements;
CREATE POLICY "public_read_announcements"   ON public.announcements FOR SELECT USING (true);
CREATE POLICY "admin_manage_announcements"  ON public.announcements FOR ALL    USING (true) WITH CHECK (true);

-- 预填两行占位
INSERT INTO public.announcements (page_key, title, content, active)
VALUES ('login',      '', '', false),
       ('enter_code', '', '', false)
ON CONFLICT (page_key) DO NOTHING;

-- 任何人可读公告（登录/测试码页拉取）
CREATE OR REPLACE FUNCTION get_announcement(p_page_key text)
RETURNS TABLE(title text, content text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT title, content
  FROM public.announcements
  WHERE page_key = p_page_key AND active = true
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION get_announcement(text) TO anon, authenticated;

-- 管理员 upsert 公告
CREATE OR REPLACE FUNCTION admin_upsert_announcement(
  p_page_key text, p_title text, p_content text, p_active boolean DEFAULT true
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.announcements (page_key, title, content, active, updated_at, updated_by_email)
  VALUES (p_page_key, p_title, p_content, p_active, now(), auth.email())
  ON CONFLICT (page_key) DO UPDATE
    SET title = p_title, content = p_content, active = p_active,
        updated_at = now(), updated_by_email = auth.email();
END;
$$;
GRANT EXECUTE ON FUNCTION admin_upsert_announcement(text, text, text, boolean) TO authenticated;

-- 管理员获取当前公告（含 inactive）
CREATE OR REPLACE FUNCTION admin_get_announcement(p_page_key text)
RETURNS TABLE(title text, content text, active boolean, updated_at timestamptz, updated_by_email text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT title, content, active, updated_at, updated_by_email
  FROM public.announcements
  WHERE page_key = p_page_key
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION admin_get_announcement(text) TO authenticated;

-- ─── IP 多次注册检测 RPC ───
CREATE OR REPLACE FUNCTION admin_scan_ip_clusters(p_min_count int DEFAULT 2, p_limit int DEFAULT 100)
RETURNS TABLE(
  ip_address   text,
  user_count   bigint,
  emails       text[],
  player_names text[],
  user_ids     uuid[],
  save_ids     uuid[],
  last_at      timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH ip_users AS (
    SELECT DISTINCT
      ale.ip_address,
      ua.user_id,
      ua.email,
      MAX(ale.created_at) AS last_at
    FROM auth.audit_log_entries ale
    INNER JOIN public.user_approvals ua ON
      NULLIF(ale.payload->>'actor_id','')::uuid = ua.user_id
    WHERE ale.ip_address IS NOT NULL
      AND ale.ip_address <> ''
    GROUP BY ale.ip_address, ua.user_id, ua.email
  )
  SELECT
    iu.ip_address,
    COUNT(DISTINCT iu.user_id)                          AS user_count,
    ARRAY_AGG(iu.email       ORDER BY iu.email)         AS emails,
    ARRAY_AGG(COALESCE(ps.player_name,'(无存档)') ORDER BY iu.email) AS player_names,
    ARRAY_AGG(iu.user_id     ORDER BY iu.email)         AS user_ids,
    ARRAY_AGG(ps.id          ORDER BY iu.email)         AS save_ids,
    MAX(iu.last_at)                                     AS last_at
  FROM ip_users iu
  LEFT JOIN public.player_saves ps ON ps.user_id = iu.user_id
  GROUP BY iu.ip_address
  HAVING COUNT(DISTINCT iu.user_id) >= p_min_count
  ORDER BY COUNT(DISTINCT iu.user_id) DESC, MAX(iu.last_at) DESC
  LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION admin_scan_ip_clusters(int, int) TO authenticated;
