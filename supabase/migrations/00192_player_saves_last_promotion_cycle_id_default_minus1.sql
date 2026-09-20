-- P1：last_promotion_cycle_id 默认值由 0 改为 -1（从未晋升），解除开局周期死锁
ALTER TABLE public.player_saves ALTER COLUMN last_promotion_cycle_id SET DEFAULT -1;
-- 解锁存量中从未晋升（值为 0）的玩家，使其开局周期可发起晋升
UPDATE public.player_saves SET last_promotion_cycle_id = -1 WHERE last_promotion_cycle_id = 0;