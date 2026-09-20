-- 让 user_id 默认取当前会话用户，消除客户端 getUser 网络依赖导致的建档失败
ALTER TABLE public.player_saves ALTER COLUMN user_id SET DEFAULT auth.uid();