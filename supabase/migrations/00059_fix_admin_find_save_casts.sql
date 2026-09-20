CREATE OR REPLACE FUNCTION public.admin_find_save_by_account(p_identifier text)
RETURNS TABLE(save_id uuid, user_id uuid, email text, player_name text, rank_level integer, rank_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE v_key text := lower(trim(p_identifier));
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT ps.id AS save_id, ps.user_id, u.email::text AS email, ps.player_name::text AS player_name, ps.rank_level, ps.rank_name::text AS rank_name
  FROM player_saves ps
  JOIN auth.users u ON u.id = ps.user_id
  WHERE u.email = v_key
     OR ps.user_id::text = trim(p_identifier)
     OR ps.id::text = trim(p_identifier);
END;
$function$;