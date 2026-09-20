DROP FUNCTION IF EXISTS public.admin_list_test_codes(text,text,integer,integer);

CREATE OR REPLACE FUNCTION public.admin_list_test_codes(
  p_batch_name text DEFAULT NULL::text,
  p_status text DEFAULT NULL::text,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(id uuid, code text, batch_name text, status text, used_by_user_id uuid, used_by_email text, used_at timestamp with time zone, expires_at timestamp with time zone, note text, created_at timestamp with time zone, group_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT tc.id, tc.code, tc.batch_name, tc.status, tc.used_by_user_id, tc.used_by_email, tc.used_at, tc.expires_at, tc.note, tc.created_at, tc.group_name
  FROM test_codes tc
  WHERE (p_batch_name IS NULL OR p_batch_name = 'all' OR tc.batch_name = p_batch_name)
    AND (p_status IS NULL OR p_status = 'all' OR tc.status = p_status)
  ORDER BY tc.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;