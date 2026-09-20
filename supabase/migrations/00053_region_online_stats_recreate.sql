DROP FUNCTION IF EXISTS public.admin_database_overview();
CREATE FUNCTION public.admin_database_overview()
RETURNS TABLE(id uuid, code text, name text, capacity_limit integer, player_count bigint, online_count bigint, is_full boolean, is_active boolean, sort_order integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT g.id, g.code, g.name, g.capacity_limit, COALESCE(p.c,0), COALESCE(p.o,0), g.is_full, g.is_active, g.sort_order
  FROM game_databases g
  LEFT JOIN (
    SELECT database_id,
      count(*) c,
      count(*) FILTER (WHERE updated_at > now() - interval '10 minutes') o
    FROM player_saves WHERE database_id IS NOT NULL GROUP BY database_id
  ) p ON p.database_id = g.id
  ORDER BY g.sort_order ASC;
$function$;
GRANT EXECUTE ON FUNCTION public.admin_database_overview() TO authenticated;