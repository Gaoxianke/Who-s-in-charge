-- 删除所有通过直接 INSERT 创建的管理员 auth.users（级联清理 identities + admin_users）
DELETE FROM auth.users
WHERE email IN (
  'admin_01@zhuchen.who','admin_02@zhuchen.who','admin_03@zhuchen.who','admin_04@zhuchen.who','admin_05@zhuchen.who',
  'admin_06@zhuchen.who','admin_07@zhuchen.who','admin_08@zhuchen.who','admin_09@zhuchen.who','admin_10@zhuchen.who',
  'admin_11@zhuchen.who','admin_12@zhuchen.who','admin_13@zhuchen.who','admin_14@zhuchen.who','admin_15@zhuchen.who',
  'admin_16@zhuchen.who','admin_17@zhuchen.who','admin_18@zhuchen.who','admin_19@zhuchen.who','admin_20@zhuchen.who',
  'W2794045093@hotmail.com'
);
SELECT count(*) AS remaining_admins FROM auth.users WHERE email LIKE 'admin_%@zhuchen.who' OR email = 'W2794045093@hotmail.com';