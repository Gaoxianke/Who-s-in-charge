CREATE OR REPLACE FUNCTION public.admin_get_player_full(p_save_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN (
    SELECT jsonb_build_object(
      'subordinates', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'name', name, 'role', role, 'ability', ability, 'loyalty', loyalty,
          'integrity', integrity, 'rank_level', rank_level, 'is_appointed', is_appointed,
          'appointed_role', appointed_role, 'faction', faction, 'specialty', specialty
        ) ORDER BY loyalty DESC)
        FROM subordinates WHERE save_id = p_save_id
      ), '[]'::jsonb),
      'boss_tasks', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'title', title, 'task_type', task_type, 'status', status,
          'urgency', urgency, 'reward_merit', reward_merit,
          'current_value', current_value, 'target_value', target_value
        ) ORDER BY created_at DESC)
        FROM boss_tasks WHERE save_id = p_save_id
      ), '[]'::jsonb),
      'career_history', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'position', position, 'city', city, 'rank_level', rank_level,
          'start_year', start_year, 'end_year', end_year
        ) ORDER BY start_year DESC)
        FROM player_career_history WHERE save_id = p_save_id
      ), '[]'::jsonb),
      'family_members', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'name', name, 'member_type', member_type, 'job', job,
          'health_score', health_score, 'moral_score', moral_score, 'is_adult', is_adult
        ) ORDER BY created_at)
        FROM family_members WHERE save_id = p_save_id
      ), '[]'::jsonb),
      'construction', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'name', name, 'category', category, 'status', status,
          'start_day', start_day, 'finish_day', finish_day, 'merit_reward', merit_reward
        ) ORDER BY created_at DESC)
        FROM construction_projects WHERE save_id = p_save_id
      ), '[]'::jsonb),
      'police_cases', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'title', q.title, 'case_type', q.case_type, 'difficulty', q.difficulty,
          'status', q.status, 'reward_merit', q.reward_merit
        ))
        FROM (
          SELECT title, case_type, difficulty, status, reward_merit
          FROM police_cases WHERE save_id = p_save_id
          ORDER BY created_at DESC LIMIT 30
        ) q
      ), '[]'::jsonb),
      'health', COALESCE((
        SELECT to_jsonb(ph) FROM player_health ph WHERE save_id = p_save_id LIMIT 1
      ), '{}'::jsonb),
      'governing_areas', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'area_name', area_name, 'area_type', area_type,
          'dev_index', dev_index, 'favor_index', favor_index
        ) ORDER BY dev_index DESC)
        FROM governing_areas WHERE save_id = p_save_id
      ), '[]'::jsonb)
    )
  );
END;
$$;