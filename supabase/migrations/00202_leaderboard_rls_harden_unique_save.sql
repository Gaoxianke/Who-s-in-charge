-- 排行榜 RLS 加固：落实"仅本人可读、写入只走 RPC/Edge Function、每账号一份上榜存档"
-- 1) 堵伪造数据漏洞：日增量只允许经 record_daily_gain RPC（SECURITY DEFINER）写入
DROP POLICY daily_insert_own ON daily_scores;
DROP POLICY daily_update_own ON daily_scores;
-- 2) 领奖记录只允许经 claim-milestone Edge Function 写入
DROP POLICY milestone_insert_own ON milestone_rewards;
-- 3) 落实"仅本人可读"：移除匿名全表可读
DROP POLICY daily_select_anon ON daily_scores;
DROP POLICY milestone_select_anon ON milestone_rewards;
DROP POLICY profiles_select_anon ON player_profiles;
-- 4) 堵绕过 5 年冷却换榜漏洞：客户端不得直连修改上榜存档（唯一前端写路径 ensureLeaderboardSave 仅首次 INSERT，受 profiles_insert_own 保障）
DROP POLICY profiles_update_own ON player_profiles;
-- 5) 数据库层保证：一份存档至多被一个账号设为上榜（NULL 不受限，未设榜账号不受影响）
CREATE UNIQUE INDEX idx_player_profiles_leaderboard_save ON player_profiles (leaderboard_save_id);