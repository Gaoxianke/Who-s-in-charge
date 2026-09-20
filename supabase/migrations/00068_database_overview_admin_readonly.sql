CREATE OR REPLACE FUNCTION public.admin_database_overview()
RETURNS TABLE(id uuid, code text, name text, capacity_limit integer, player_count bigint, online_count bigint, is_full boolean, is_active boolean, sort_order integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
BEGIN
  -- 只读查询：admin 及以上均可查看（写操作由对应 RPC 单独限制 super_admin）
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
    SELECT g.id, g.code, g.name, g.capacity_limit, COALESCE(p.c,0), COALESCE(p.o,0), g.is_full, g.is_active, g.sort_order
    FROM game_databases g
    LEFT JOIN (
      SELECT database_id,
        count(*) c,
        count(*) FILTER (WHERE updated_at > now() - interval '10 minutes') o
      FROM player_saves WHERE database_id IS NOT NULL GROUP BY database_id
    ) p ON p.database_id = g.id
    ORDER BY g.sort_order ASC;
END;
$function$;