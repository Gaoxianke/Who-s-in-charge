CREATE OR REPLACE FUNCTION public.admin_list_appeals(
  p_status      text DEFAULT NULL,
  p_appeal_type text DEFAULT NULL
)
RETURNS TABLE(
  id uuid, target_user_id uuid, target_email text, appeal_type text,
  appeal_reason text, status text, reject_reason text,
  submitted_by_email text, reviewed_by_email text,
  reviewed_at timestamptz, expires_at timestamptz, created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM account_appeals WHERE expires_at < now() AND status = 'pending';
  RETURN QUERY
  SELECT aa.id, aa.target_user_id, aa.target_email, aa.appeal_type, aa.appeal_reason,
         aa.status, aa.reject_reason, aa.submitted_by_email,
         aa.reviewed_by_email, aa.reviewed_at, aa.expires_at, aa.created_at
    FROM account_appeals aa
   WHERE (p_status IS NULL OR p_status = 'all' OR aa.status = p_status)
     AND (p_appeal_type IS NULL OR p_appeal_type = 'all' OR aa.appeal_type = p_appeal_type)
   ORDER BY aa.created_at DESC
   LIMIT 200;
END;
$$;