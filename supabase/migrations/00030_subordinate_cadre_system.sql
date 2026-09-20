
-- ============ 下属管理系统扩展字段 ============
-- 干部特长（economy/social/legal/agriculture/tech/party/finance/military）
ALTER TABLE subordinates ADD COLUMN IF NOT EXISTS specialty TEXT DEFAULT 'economy';
-- 后备干部标记
ALTER TABLE subordinates ADD COLUMN IF NOT EXISTS is_reserve BOOLEAN NOT NULL DEFAULT FALSE;
-- 考察提名状态（idle / reviewing / approved / rejected）
ALTER TABLE subordinates ADD COLUMN IF NOT EXISTS nomination_status TEXT NOT NULL DEFAULT 'idle';
-- 提名目标部门
ALTER TABLE subordinates ADD COLUMN IF NOT EXISTS nomination_dept TEXT DEFAULT NULL;
-- 提名目标职位（head / deputy）
ALTER TABLE subordinates ADD COLUMN IF NOT EXISTS nomination_position TEXT DEFAULT NULL;
-- 提名开始游戏天（用于计算考察期）
ALTER TABLE subordinates ADD COLUMN IF NOT EXISTS nomination_start_day INTEGER DEFAULT NULL;
-- 干部随机事件类型（NULL=无事件 | transfer_request | corruption_risk | achievement | complaint | borrow）
ALTER TABLE subordinates ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT NULL;
-- 事件触发游戏天
ALTER TABLE subordinates ADD COLUMN IF NOT EXISTS event_day INTEGER DEFAULT NULL;
-- 事件是否已处理
ALTER TABLE subordinates ADD COLUMN IF NOT EXISTS event_handled BOOLEAN NOT NULL DEFAULT TRUE;
-- 干部满意度/职业诉求（0-100，影响自主离职概率）
ALTER TABLE subordinates ADD COLUMN IF NOT EXISTS satisfaction INTEGER NOT NULL DEFAULT 60;
-- 五维考核快照：德、能、勤、绩、廉（最近一次考核的分维度结果，json）
ALTER TABLE subordinates ADD COLUMN IF NOT EXISTS last_review_scores TEXT DEFAULT NULL;
-- 干部年龄字段（从名字哈希+subLevel计算，入库备用）
ALTER TABLE subordinates ADD COLUMN IF NOT EXISTS cadre_age INTEGER DEFAULT NULL;
-- 借调单位（非空时表示被借调，暂时脱离本地编制）
ALTER TABLE subordinates ADD COLUMN IF NOT EXISTS borrowed_to TEXT DEFAULT NULL;

-- 索引：查询待处理事件、待考察提名
CREATE INDEX IF NOT EXISTS idx_subordinates_nomination ON subordinates(save_id, nomination_status);
CREATE INDEX IF NOT EXISTS idx_subordinates_event ON subordinates(save_id, event_handled);
