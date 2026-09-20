-- 启用 pg_cron 与 pg_net 扩展（清理为纯 DB 操作，无需 Edge Function）
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 每天北京时间 12:00（UTC 04:00）自动执行清理，结果写入 cleanup_logs
SELECT cron.schedule(
  'daily-game-cleanup-utc0400',
  '0 4 * * *',
  $$SELECT run_game_cleanup('cron');$$
);

-- 验证任务已注册
SELECT jobid, jobname, schedule, active FROM cron.job;