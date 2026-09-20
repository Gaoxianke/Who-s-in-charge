CREATE OR REPLACE FUNCTION public.admin_today_system_rejected_count()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN (
    SELECT count(*)::int
      FROM account_appeals
     WHERE appeal_type = 'system_rejected'
       AND created_at >= date_trunc('day', now())
  );
END;
$$;