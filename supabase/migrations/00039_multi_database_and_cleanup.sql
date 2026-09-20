-- ═══ 多玩家数据库 ══════════════════════════════════════════════
CREATE TABLE game_databases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  capacity_limit integer NOT NULL DEFAULT 1000,
  is_active boolean NOT NULL DEFAULT true,
  is_full boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE player_saves ADD COLUMN database_id uuid REFERENCES game_databases(id);
CREATE INDEX idx_player_saves_database_id ON player_saves(database_id);

INSERT INTO game_databases (code, name, capacity_limit, is_active, is_full, sort_order) VALUES
  ('db_1', '华北政务大区', 1000, true, false, 1),
  ('db_2', '华东政务大区', 1000, true, false, 2),
  ('db_3', '华南政务大区', 1000, true, false, 3);

UPDATE player_saves SET database_id = (SELECT id FROM game_databases WHERE code='db_1') WHERE database_id IS NULL;

ALTER TABLE game_databases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "db_select_all" ON game_databases FOR SELECT TO anon, authenticated USING (true);

-- ═══ 清理日志 ════════════════════════════════════════════════════
CREATE TABLE cleanup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  trigger_type text NOT NULL,
  large_table_deleted integer NOT NULL DEFAULT 0,
  dead_cadres_deleted integer NOT NULL DEFAULT 0,
  dead_saves_deleted integer NOT NULL DEFAULT 0,
  mb_before numeric(12,3) NOT NULL DEFAULT 0,
  mb_after numeric(12,3) NOT NULL DEFAULT 0,
  mb_saved numeric(12,3) NOT NULL DEFAULT 0,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE cleanup_logs ENABLE ROW LEVEL SECURITY;

-- ═══ RPC：分配数据库槽位（自动开启下一个库）═════════════════════
CREATE OR REPLACE FUNCTION claim_database_slot(selected_code text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_db_id uuid;
  v_limit integer;
  v_count integer;
  v_next integer;
BEGIN
  IF selected_code IS NOT NULL AND selected_code <> '' THEN
    SELECT id, capacity_limit INTO v_db_id, v_limit
    FROM game_databases WHERE code = selected_code AND is_active = true;
    IF v_db_id IS NOT NULL THEN
      SELECT count(*) INTO v_count FROM player_saves WHERE database_id = v_db_id;
      IF v_count < v_limit THEN RETURN v_db_id; END IF;
    END IF;
  END IF;

  SELECT g.id INTO v_db_id
  FROM game_databases g
  LEFT JOIN (SELECT database_id, count(*) c FROM player_saves WHERE database_id IS NOT NULL GROUP BY database_id) p ON p.database_id = g.id
  WHERE g.is_active = true AND COALESCE(p.c, 0) < g.capacity_limit
  ORDER BY COALESCE(p.c, 0) ASC, g.sort_order ASC LIMIT 1;
  IF v_db_id IS NOT NULL THEN RETURN v_db_id; END IF;

  UPDATE game_databases SET is_full = true WHERE is_active = true;
  SELECT count(*) + 1 INTO v_next FROM game_databases;
  INSERT INTO game_databases (code, name, capacity_limit, is_active, is_full, sort_order)
  VALUES ('db_' || v_next, '政务大区 ' || v_next, 1000, true, false, v_next)
  RETURNING id INTO v_db_id;
  RETURN v_db_id;
END;
$$;

-- ═══ RPC：列出可用数据库（含实时玩家数）══════════════════════════
CREATE OR REPLACE FUNCTION list_game_databases()
RETURNS TABLE(code text, name text, capacity_limit integer, player_count bigint, is_full boolean, is_active boolean, sort_order integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.code, g.name, g.capacity_limit, COALESCE(p.c,0), g.is_full, g.is_active, g.sort_order
  FROM game_databases g
  LEFT JOIN (SELECT database_id, count(*) c FROM player_saves WHERE database_id IS NOT NULL GROUP BY database_id) p ON p.database_id = g.id
  WHERE g.is_active = true
  ORDER BY g.sort_order ASC;
$$;

GRANT EXECUTE ON FUNCTION claim_database_slot(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION list_game_databases() TO anon, authenticated;

-- ═══ 清理辅助：按条件删除并估算释放字节 ══════════════════════════
CREATE OR REPLACE FUNCTION _cleanup_by_where(p_table text, p_where text)
RETURNS TABLE(deleted_rows integer, est_bytes bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tc integer; v_ts bigint; v_dc integer;
BEGIN
  EXECUTE format('SELECT count(*) FROM %I', p_table) INTO v_tc;
  IF v_tc = 0 THEN RETURN QUERY SELECT 0, 0::bigint; RETURN; END IF;
  EXECUTE format('SELECT pg_total_relation_size(%L::regclass)', p_table) INTO v_ts;
  EXECUTE format('SELECT count(*) FROM %I WHERE %s', p_table, p_where) INTO v_dc;
  IF v_dc = 0 THEN RETURN QUERY SELECT 0, 0::bigint; RETURN; END IF;
  RETURN QUERY SELECT v_dc, round(v_ts::numeric / v_tc * v_dc)::bigint;
  EXECUTE format('DELETE FROM %I WHERE %s', p_table, p_where);
  RETURN;
END;
$$;

-- ═══ 自动清理主函数 ═════════════════════════════════════════════
CREATE OR REPLACE FUNCTION run_game_cleanup(p_trigger text DEFAULT 'manual')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mb_before numeric; v_mb_after numeric;
  v_large_rows integer := 0; v_large_bytes bigint := 0;
  v_cadres_rows integer := 0; v_cadres_bytes bigint := 0;
  v_saves_rows integer := 0; v_saves_bytes bigint := 0;
  v_dead_ids uuid[]; v_total_saves integer;
  v_t text; v_tc integer; v_ts bigint;
  v_large_tables text[] := ARRAY['event_records','boss_interactions','monthly_reports','petition_events','welfare_actions'];
  v_orphan_tables text[] := ARRAY['city_finance','enterprises','monthly_meetings','petition_events','recruit_candidates','secretary','subordinate_resumes','welfare_actions'];
  r record;
BEGIN
  v_mb_before := round(pg_database_size(current_database()) / 1024.0 / 1024.0, 3);

  -- 1) 大表数据：仅追加型日志表，现实时间超1天
  FOREACH v_t IN ARRAY v_large_tables LOOP
    SELECT * INTO r FROM _cleanup_by_where(v_t, 'created_at < now() - interval ''1 day''');
    v_large_rows := v_large_rows + r.deleted_rows;
    v_large_bytes := v_large_bytes + r.est_bytes;
  END LOOP;

  -- 2) 死干部：已调离且超1天
  SELECT * INTO r FROM _cleanup_by_where('subordinates', 'transferred_city IS NOT NULL AND created_at < now() - interval ''1 day''');
  v_cadres_rows := r.deleted_rows; v_cadres_bytes := r.est_bytes;

  -- 3) 死档：Game Over 或 已退休 且 超1天
  SELECT array_agg(id) INTO v_dead_ids FROM player_saves
  WHERE (game_over_type IS NOT NULL OR is_retired = true) AND updated_at < now() - interval '1 day';
  v_saves_rows := COALESCE(array_length(v_dead_ids,1),0);

  SELECT count(*) INTO v_total_saves FROM player_saves;
  IF v_total_saves > 0 AND v_saves_rows > 0 THEN
    FOR v_t IN SELECT table_name FROM information_schema.columns WHERE column_name='save_id' AND table_schema='public' LOOP
      EXECUTE format('SELECT pg_total_relation_size(%L::regclass)', v_t) INTO v_ts;
      EXECUTE format('SELECT count(*) FROM %I', v_t) INTO v_tc;
      IF v_tc > 0 THEN
        v_saves_bytes := v_saves_bytes + (v_ts::numeric / v_total_saves * v_saves_rows)::bigint;
      END IF;
    END LOOP;
  END IF;

  FOREACH v_t IN ARRAY v_orphan_tables LOOP
    EXECUTE format('DELETE FROM %I WHERE save_id = ANY($1)', v_t) USING v_dead_ids;
  END LOOP;
  DELETE FROM player_saves WHERE id = ANY(v_dead_ids);

  v_mb_after := round(pg_database_size(current_database()) / 1024.0 / 1024.0, 3);

  INSERT INTO cleanup_logs (trigger_type, large_table_deleted, dead_cadres_deleted, dead_saves_deleted, mb_before, mb_after, mb_saved, detail)
  VALUES (p_trigger, v_large_rows, v_cadres_rows, v_saves_rows, v_mb_before, v_mb_after,
          round((v_large_bytes + v_cadres_bytes + v_saves_bytes) / 1024.0 / 1024.0, 3),
          jsonb_build_object('large_est_bytes', v_large_bytes, 'cadres_est_bytes', v_cadres_bytes, 'saves_est_bytes', v_saves_bytes));

  RETURN jsonb_build_object(
    'trigger', p_trigger,
    'large_table_deleted', v_large_rows,
    'dead_cadres_deleted', v_cadres_rows,
    'dead_saves_deleted', v_saves_rows,
    'mb_before', v_mb_before,
    'mb_after', v_mb_after,
    'mb_saved', round((v_large_bytes + v_cadres_bytes + v_saves_bytes) / 1024.0 / 1024.0, 3)
  );
END;
$$;