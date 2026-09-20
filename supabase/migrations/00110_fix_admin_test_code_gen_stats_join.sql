DROP FUNCTION IF EXISTS admin_test_code_gen_stats();

CREATE OR REPLACE FUNCTION admin_test_code_gen_stats()
RETURNS TABLE(total bigint, unused bigint, used bigint, admin_id uuid, admin_email text, gen_count bigint, gen_unused bigint, gen_used bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  WITH agg AS (
    SELECT created_by AS aid,
           count(*) AS cnt,
           count(*) FILTER (WHERE status = 'unused') AS un,
           count(*) FILTER (WHERE status = 'used') AS cnt_used
      FROM test_codes
     GROUP BY created_by
  )
  SELECT (SELECT count(*) FROM test_codes),
         (SELECT count(*) FROM test_codes WHERE status = 'unused'),
         (SELECT count(*) FROM test_codes WHERE status = 'used'),
         au.id, au.email, agg.cnt, agg.un, agg.cnt_used
    FROM agg
    JOIN admin_users au ON au.user_id = agg.aid
   ORDER BY agg.cnt DESC
   LIMIT 20;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_test_code_gen_stats() TO authenticated;