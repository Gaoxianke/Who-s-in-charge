DROP FUNCTION IF EXISTS admin_database_overview(); CREATE OR REPLACE FUNCTION admin_database_overview() RETURNS TABLE (
  id uuid,
  code text,
  name text,
  capacity_limit int,
  player_count bigint,
  is_full boolean,
  is_active boolean,
  sort_order int
) LANGUAGE sql SECURITY DEFINER SET search_path TO public AS $$
  SELECT g.id, g.code, g.name, g.capacity_limit, COALESCE(p.c,0), g.is_full, g.is_active, g.sort_order
  FROM game_databases g
  LEFT JOIN (SELECT database_id, count(*) c FROM player_saves WHERE database_id IS NOT NULL GROUP BY database_id) p ON p.database_id = g.id
  ORDER BY g.sort_order ASC;
$$; GRANT EXECUTE ON FUNCTION admin_database_overview() TO authenticated;