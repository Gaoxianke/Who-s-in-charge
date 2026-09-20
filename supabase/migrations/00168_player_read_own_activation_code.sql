-- 允许玩家读取激活自己账号的测试码（仅限本人 used_by_user_id）
CREATE POLICY "test_codes_owner_read"
  ON test_codes FOR SELECT TO authenticated
  USING (used_by_user_id = auth.uid());