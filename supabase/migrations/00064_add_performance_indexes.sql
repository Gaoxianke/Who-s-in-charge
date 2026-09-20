-- 性能优化：补齐热路径缺失索引，避免随数据增长变卡

-- 【最关键】player_saves.user_id —— 每次加载游戏/后台都按 user_id 查询，此前全表扫描
CREATE INDEX idx_player_saves_user_id ON public.player_saves (user_id);
CREATE INDEX idx_player_saves_user_approval ON public.player_saves (user_id, approval_status);

-- 游戏关联表按 save_id 查询（游戏内加载 + admin_get_player_full）
CREATE INDEX idx_boss_tasks_save_id ON public.boss_tasks (save_id);
CREATE INDEX idx_construction_save_id ON public.construction_projects (save_id);
CREATE INDEX idx_police_cases_save_id ON public.police_cases (save_id);
CREATE INDEX idx_governing_areas_save_id ON public.governing_areas (save_id);

-- 审计日志：按目标用户 + 时间查询
CREATE INDEX idx_audit_log_target ON public.audit_log (target_user_id);
CREATE INDEX idx_audit_log_created ON public.audit_log (created_at DESC);

-- 推送通知按时间倒序
CREATE INDEX idx_push_notifications_created ON public.push_notifications (created_at DESC);

-- 测试码按状态 + 时间筛选
CREATE INDEX idx_test_codes_status ON public.test_codes (status);
CREATE INDEX idx_test_codes_created ON public.test_codes (created_at DESC);