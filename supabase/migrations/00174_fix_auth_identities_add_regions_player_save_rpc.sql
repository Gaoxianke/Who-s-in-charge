
-- ① 修复：为所有缺少 identity 记录的 auth.users 补建 email identity
DO $$
BEGIN
  INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  SELECT
    u.id::text,
    u.id,
    jsonb_build_object(
      'sub',            u.id::text,
      'email',          u.email::text,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now()
  FROM auth.users u
  WHERE u.email IS NOT NULL
    AND u.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM auth.identities i WHERE i.user_id = u.id
    );
END $$;

-- ② 确保所有 auth.users role/aud/email_confirmed_at 正确（老账号可能缺字段）
UPDATE auth.users
SET
  role               = 'authenticated',
  aud                = 'authenticated',
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  updated_at         = now()
WHERE deleted_at IS NULL
  AND (
    role               IS NULL OR role = '' OR
    aud                IS NULL OR aud  = '' OR
    email_confirmed_at IS NULL
  );

-- ③ 新增 5 个大区（共 10 大区，每区上限 500）
INSERT INTO game_databases (code, name, capacity_limit, is_active, is_full, sort_order)
VALUES
  ('dongbei',  '东北大区', 500, true, false, 6),
  ('huazhong', '华中大区', 500, true, false, 7),
  ('jiangnan', '江南大区', 500, true, false, 8),
  ('lingnan',  '岭南大区', 500, true, false, 9),
  ('saibei',   '塞北大区', 500, true, false, 10)
ON CONFLICT (code) DO NOTHING;

-- 确保所有现有大区容量 ≥ 500
UPDATE game_databases SET capacity_limit = 500 WHERE capacity_limit < 500;

-- ④ 辅助 RPC：判断当前玩家是否已有真实存档
CREATE OR REPLACE FUNCTION public.player_has_real_save()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM player_saves
    WHERE user_id = auth.uid()
      AND NOT COALESCE(needs_character_creation, false)
  );
$$;
GRANT EXECUTE ON FUNCTION public.player_has_real_save() TO authenticated;
