-- 1. 测试码生成统计：总量 + 各管理员生成明细（未用/已用）
CREATE OR REPLACE FUNCTION public.admin_test_code_gen_stats()
RETURNS TABLE(
  total bigint, unused bigint, used bigint,
  admin_id uuid, admin_email text, gen_count bigint, gen_unused bigint, gen_used bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    JOIN admin_users au ON au.id = agg.aid
   ORDER BY agg.cnt DESC
   LIMIT 20;
END;
$$;

-- 2. 玩家排行榜：按等级降序前20名
CREATE OR REPLACE FUNCTION public.admin_player_leaderboard()
RETURNS TABLE(
  id uuid, user_id uuid, player_name text, rank_level integer, rank_name text,
  merit_points integer, moral_value integer, assessment_grade text,
  game_days integer, city_name text, city_gdp integer, is_retired boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT ps.id, ps.user_id, ps.player_name, ps.rank_level, ps.rank_name,
         ps.merit_points, ps.moral_value, ps.assessment_grade,
         ps.game_days, ps.city_name, ps.city_gdp, ps.is_retired
    FROM player_saves ps
   WHERE ps.deleted_at IS NULL
   ORDER BY ps.rank_level DESC, ps.merit_points DESC, ps.game_days DESC
   LIMIT 20;
END;
$$;

-- 3. 玩家存档名称检索（分页）
CREATE OR REPLACE FUNCTION public.admin_list_player_names(
  p_search text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE(
  id uuid, user_id uuid, player_name text, rank_level integer, rank_name text, created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT ps.id, ps.user_id, ps.player_name, ps.rank_level, ps.rank_name, ps.created_at
    FROM player_saves ps
   WHERE ps.deleted_at IS NULL
     AND (p_search IS NULL OR p_search = '' OR ps.player_name ILIKE '%' || trim(p_search) || '%')
   ORDER BY ps.player_name ASC, ps.created_at DESC
   LIMIT p_limit OFFSET p_offset;
END;
$$;