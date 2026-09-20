// 管理员后台完整数据层（全部走 RPC / 受 RLS 保护的直查）
import { supabase } from '@/client/supabase';

// ───────── 类型 ─────────
export interface AdminStats { total_users: number; today_new: number; today_active: number; }
export interface CleanupLog { id: string; run_at: string; trigger_type: string; large_table_deleted: number; dead_cadres_deleted: number; dead_saves_deleted: number; mb_before: number; mb_after: number; mb_saved: number; }
export interface DatabaseNode { id: string; code: string; name: string; capacity_limit: number; player_count: number; online_count: number; is_full: boolean; is_active: boolean; sort_order: number; }
export interface CleanupResult { trigger: string; large_table_deleted: number; dead_cadres_deleted: number; dead_saves_deleted: number; mb_before: number; mb_after: number; mb_saved: number; }

export interface AccountRow {
  auth_deleted_at?: string | null;
  user_id: string; email: string; created_at: string; last_sign_in_at: string | null; banned: boolean;
  save_id: string | null; player_name: string | null; rank_level: number | null; rank_name: string | null;
  merit_points: number | null; is_admin: boolean; admin_role: string | null;
}
export interface AccountStats { total_users: number; has_character: number; active_saves: number; admin_count: number; }
export interface TrendPoint { d: string; cnt: number; }
export interface TopPlayer { player_name: string; rank_level: number; rank_name: string; merit_points: number; updated_at: string; }
export interface RankBucket { rank_level: number; cnt: number; }
export interface OnlinePlayer { player_name: string; rank_level: number; rank_name: string; updated_at: string; }
export interface RedeemCode { id: string; code: string; label: string; reward: Record<string, unknown>; created_at: string; is_used: boolean; used_by_email: string | null; used_at: string | null; }
export interface SaveData {
  id: string; user_id: string; player_name: string; rank_level: number; rank_name: string;
  merit_points: number; moral_value: number; city_gdp: number; city_livelihood: number;
  city_ecology: number; city_business: number; security_index: number; boss_favor: number;
  fund_balance: number; personal_savings: number; is_retired: boolean; game_over_type: string | null; updated_at: string;
}
export interface AuditLog { id: string; admin_email: string; action: string; target_user_id: string | null; detail: Record<string, unknown>; created_at: string; }
export interface FlaggedUser { id: string; user_id: string; username: string | null; rule_key: string; rule_name: string | null; reason: string; evidence: Record<string, unknown>; flagged_at: string; status: string; }
export interface DetectionRule { id: string; rule_key: string; name: string; description: string | null; threshold: number; enabled: boolean; }
export interface GameConfigItem { key: string; value: Record<string, unknown>; description: string | null; updated_at: string; }
export interface PushNotification { id: string; title: string; body: string; target_type: string; target_value: string | null; is_sent: boolean; created_at: string; sent_at: string | null; created_by_email: string | null; }
export interface Announcement { title: string; content: string; active: boolean; updated_at: string; updated_by_email: string | null; }
export interface IpCluster { ip_address: string; user_count: number; emails: string[]; player_names: string[]; user_ids: string[]; save_ids: (string | null)[]; last_at: string; }
export interface AppealRow {
  id: string; target_user_id: string | null; target_email: string;
  appeal_type: string; appeal_reason: string | null; status: string;
  reject_reason: string | null; submitted_by_email: string | null;
  reviewed_by_email: string | null; reviewed_at: string | null;
  expires_at: string | null; created_at: string;
}

export interface TestCodeRow {
  id: string; code: string; batch_name: string; status: string;
  used_by_user_id: string | null; used_by_email: string | null; used_at: string | null;
  expires_at: string | null; note: string | null; created_at: string; group_name: string;
}
export interface TestCodeGroup {
  group_name: string; total: number; used: number; available: number; created_at: string;
}
export interface TestCodeBatch {
  batch_name: string; total: number; used: number; disabled: number; available: number; created_at: string;
  copy_count: number; last_copied_email: string | null; last_copied_at: string | null;
  max_codes: number;
}
export interface ScheduleRequest {
  id: string; open_time: string; close_time: string; enabled: boolean; status: string;
  note: string | null; created_by_email: string | null; approved_by: string | null;
  reject_reason: string | null; created_at: string;
}
export interface ActiveSchedule {
  id: string; open_time: string; close_time: string; enabled: boolean; note: string | null;
}
export interface ApprovalRow {
  id: string; user_id: string; email: string; status: string; test_code_id: string | null;
  reject_reason: string | null; reviewed_by: string | null; reviewed_at: string | null; created_at: string;
  player_name: string | null; rank_level: number | null; rank_name: string | null;
  dup_email_count: number; // 同邮箱申请总数（>1 时为重复申请）
}
export interface ApprovalStats { pending: number; approved: number; rejected: number; total: number; }
export interface TestCodeStats { unused: number; used: number; disabled: number; total: number; }
export interface MyTestCodeStatus { approvalStatus: string; hasCode: boolean; testCode: string | null; }

// ───────── 角色 ─────────
export async function isCurrentAdmin(): Promise<boolean> {
  const { data } = await supabase.rpc('is_current_admin');
  return Boolean(data);
}
export async function currentAdminRole(): Promise<string | null> {
  const { data } = await supabase.rpc('current_admin_role');
  return (data as string | null) ?? null;
}

// ───────── 统计 ─────────
function num(v: unknown): number { return v == null ? 0 : Number(v); }
export async function adminStatsOverview(): Promise<AdminStats> {
  const { data, error } = await supabase.rpc('admin_stats_overview');
  if (error || !data || !Array.isArray(data) || data.length === 0) return { total_users: 0, today_new: 0, today_active: 0 };
  const r = data[0] as Record<string, unknown>;
  return { total_users: num(r.total_users), today_new: num(r.today_new), today_active: num(r.today_active) };
}
export async function adminAccountStats(): Promise<AccountStats> {
  const { data } = await supabase.rpc('admin_account_stats');
  if (!data || !Array.isArray(data) || data.length === 0) return { total_users: 0, has_character: 0, active_saves: 0, admin_count: 0 };
  const r = data[0] as Record<string, unknown>;
  return { total_users: num(r.total_users), has_character: num(r.has_character), active_saves: num(r.active_saves), admin_count: num(r.admin_count) };
}
export async function adminRegistrationTrend(days = 14): Promise<TrendPoint[]> {
  const { data } = await supabase.rpc('admin_registration_trend', { p_days: days });
  if (!data || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({ d: String(r.d), cnt: num(r.cnt) }));
}
export async function adminTopActive(limit = 20): Promise<TopPlayer[]> {
  const { data } = await supabase.rpc('admin_top_active', { p_limit: limit });
  if (!data || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    player_name: String(r.player_name ?? ''), rank_level: num(r.rank_level), rank_name: String(r.rank_name ?? ''),
    merit_points: num(r.merit_points), updated_at: String(r.updated_at ?? ''),
  }));
}
export async function adminRankDistribution(): Promise<RankBucket[]> {
  const { data } = await supabase.rpc('admin_rank_distribution');
  if (!data || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({ rank_level: num(r.rank_level), cnt: num(r.cnt) }));
}
export async function adminOnlinePlayers(minutes = 5): Promise<OnlinePlayer[]> {
  const { data } = await supabase.rpc('admin_online_players', { p_minutes: minutes });
  if (!data || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    player_name: String(r.player_name ?? ''), rank_level: num(r.rank_level), rank_name: String(r.rank_name ?? ''), updated_at: String(r.updated_at ?? ''),
  }));
}

// ───────── 账号 ─────────
export async function adminAccountList(search: string, limit = 50, offset = 0, includeDeleted = false): Promise<AccountRow[]> {
  const { data } = await supabase.rpc('admin_account_list', { p_search: search || null, p_limit: limit, p_offset: offset, p_include_deleted: includeDeleted });
  if (!data || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    user_id: String(r.user_id), email: String(r.email ?? ''), created_at: String(r.created_at ?? ''),
    last_sign_in_at: r.last_sign_in_at ? String(r.last_sign_in_at) : null, banned: Boolean(r.banned),
    save_id: r.save_id ? String(r.save_id) : null, player_name: r.player_name ? String(r.player_name) : null,
    rank_level: r.rank_level != null ? num(r.rank_level) : null, rank_name: r.rank_name ? String(r.rank_name) : null,
    merit_points: r.merit_points != null ? num(r.merit_points) : null, is_admin: Boolean(r.is_admin),
    admin_role: r.admin_role ? String(r.admin_role) : null,
    auth_deleted_at: r.auth_deleted_at ? String(r.auth_deleted_at) : null,
  }));
}
export async function adminPromoteRank(saveId: string, targetRank: number): Promise<{ ok: boolean; err?: string }> {
  const { error } = await supabase.rpc('admin_promote_rank', { p_save_id: saveId, p_target_rank: targetRank });
  return { ok: !error, err: error?.message };
}
export async function adminResetPassword(userId: string, newPassword: string): Promise<{ ok: boolean; err?: string }> {
  const { error } = await supabase.rpc('admin_reset_password', { p_user_id: userId, p_new_password: newPassword });
  return { ok: !error, err: error?.message };
}
export async function adminToggleBan(userId: string, ban: boolean): Promise<{ ok: boolean; err?: string }> {
  const { error } = await supabase.rpc('admin_toggle_ban', { p_user_id: userId, p_ban: ban });
  return { ok: !error, err: error?.message };
}
export async function adminPreviewInactive(days: number): Promise<{ user_id: string; email: string; last_active: string; has_save: boolean; player_name: string | null; rank_level: number | null }[]> {
  const { data } = await supabase.rpc('admin_preview_inactive', { p_days: days });
  if (!data || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    user_id: String(r.user_id), email: String(r.email ?? ''), last_active: String(r.last_active ?? ''),
    has_save: Boolean(r.has_save), player_name: r.player_name ? String(r.player_name) : null, rank_level: r.rank_level != null ? num(r.rank_level) : null,
  }));
}
export async function adminDeleteInactive(userIds: string[]): Promise<number> {
  const { data } = await supabase.rpc('admin_delete_inactive', { p_user_ids: userIds });
  return num(data);
}

// ───────── 密码重置申请（普通管理员发起 → 超级管理员审批）─────────
export interface PasswordResetRequest {
  id: string; target_user_id: string; target_email: string; target_player_name: string | null;
  requested_by: string; requested_by_email: string; reason: string | null; new_password: string | null;
  status: string; reviewed_by: string | null; reviewed_at: string | null; created_at: string;
}
export async function adminRequestPasswordReset(targetUserId: string, reason?: string): Promise<{ ok: boolean; err?: string }> {
  const { error } = await supabase.rpc('admin_request_password_reset', { p_target_user_id: targetUserId, p_reason: reason ?? null });
  return { ok: !error, err: error?.message };
}
export async function adminListPasswordResetRequests(status?: string, limit = 50): Promise<PasswordResetRequest[]> {
  const { data } = await supabase.rpc('admin_list_password_reset_requests', { p_status: status ?? null, p_limit: limit });
  if (!data || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    id: String(r.id), target_user_id: String(r.target_user_id), target_email: String(r.target_email ?? ''),
    target_player_name: r.target_player_name ? String(r.target_player_name) : null,
    requested_by: String(r.requested_by ?? ''), requested_by_email: String(r.requested_by_email ?? ''),
    reason: r.reason ? String(r.reason) : null, new_password: r.new_password ? String(r.new_password) : null,
    status: String(r.status ?? ''), reviewed_by: r.reviewed_by ? String(r.reviewed_by) : null,
    reviewed_at: r.reviewed_at ? String(r.reviewed_at) : null, created_at: String(r.created_at ?? ''),
  }));
}
export async function adminApprovePasswordReset(requestId: string, newPassword: string): Promise<{ ok: boolean; err?: string }> {
  const { error } = await supabase.rpc('admin_approve_password_reset', { p_request_id: requestId, p_new_password: newPassword });
  return { ok: !error, err: error?.message };
}
export async function adminRejectPasswordReset(requestId: string): Promise<{ ok: boolean; err?: string }> {
  const { error } = await supabase.rpc('admin_reject_password_reset', { p_request_id: requestId });
  return { ok: !error, err: error?.message };
}
// 超级管理员直接修改玩家密码（无条件）
export async function adminSetPlayerPassword(targetUserId: string, newPassword: string): Promise<{ ok: boolean; err?: string }> {
  const { error } = await supabase.rpc('admin_set_player_password', { p_target_user_id: targetUserId, p_new_password: newPassword });
  return { ok: !error, err: error?.message };
}
// 超级管理员删除玩家账号（无条件）
export async function adminDeletePlayerAccount(targetUserId: string): Promise<{ ok: boolean; err?: string }> {
  const { error } = await supabase.rpc('admin_delete_player_account', { p_target_user_id: targetUserId });
  return { ok: !error, err: error?.message };
}
// 超级管理员获取玩家账号标识（用于核对，Auth 密码为哈希不可逆）
export async function adminGetPlayerPassword(targetUserId: string): Promise<{ ok: boolean; email?: string; err?: string }> {
  const { data, error } = await supabase.rpc('admin_get_player_password', { p_target_user_id: targetUserId });
  if (error) return { ok: false, err: error.message };
  return { ok: true, email: String(data ?? '') };
}

// ───────── 存档 ─────────
export interface FoundAccount { save_id: string; user_id: string; email: string; player_name: string; rank_level: number | null; rank_name: string | null; }
export async function adminFindSaveByAccount(identifier: string): Promise<FoundAccount[]> {
  const { data } = await supabase.rpc('admin_find_save_by_account', { p_identifier: identifier });
  const arr = (data as Record<string, unknown>[] | null) ?? [];
  return arr.map((r) => ({
    save_id: String(r.save_id), user_id: String(r.user_id), email: String(r.email ?? ''),
    player_name: String(r.player_name ?? ''), rank_level: r.rank_level != null ? num(r.rank_level) : null,
    rank_name: r.rank_name ? String(r.rank_name) : null,
  }));
}

export async function adminDeleteAccount(userId: string): Promise<{ ok: boolean; err?: string }> {
  // 显式传入 reason 参数，避免与带默认值的重载产生候选歧义
  const { error } = await supabase.rpc('admin_delete_account', { p_user_id: userId, p_reason: '管理员删除账号' });
  return { ok: !error, err: error?.message };
}
// 封禁账号：保留账号与数据，封禁 100 年（与彻底删除区分）
export async function adminBanAccount(userId: string): Promise<{ ok: boolean; err?: string }> {
  const { error } = await supabase.rpc('admin_ban_account', { p_user_id: userId, p_reason: '管理员封禁账号' });
  return { ok: !error, err: error?.message };
}

// 清除玩家存档：仅删除游戏数据（存档/班子/岗位/候选人），保留登录账号
// 玩家重新登录后会生成全新初始存档；与彻底删除账号区分
export async function adminClearPlayerSave(targetUserId: string): Promise<{ ok: boolean; email?: string; player_name?: string; rank_level?: number | null; err?: string }> {
  const { data, error } = await supabase.rpc('admin_clear_player_save', { p_target_user_id: targetUserId });
  if (error) return { ok: false, err: error.message };
  const r = (data as Record<string, unknown>) ?? {};
  return {
    ok: true,
    email: r.email ? String(r.email) : undefined,
    player_name: r.player_name ? String(r.player_name) : undefined,
    rank_level: r.rank_level != null ? Number(r.rank_level) : null,
  };
}

export async function adminGetSave(saveId: string): Promise<SaveData | null> {
  const { data } = await supabase.rpc('admin_get_save', { p_save_id: saveId });
  if (!data) return null;
  const r = (data as Record<string, unknown>);
  return {
    id: String(r.id), user_id: String(r.user_id), player_name: String(r.player_name ?? ''),
    rank_level: num(r.rank_level), rank_name: String(r.rank_name ?? ''), merit_points: num(r.merit_points),
    moral_value: num(r.moral_value), city_gdp: num(r.city_gdp), city_livelihood: num(r.city_livelihood),
    city_ecology: num(r.city_ecology), city_business: num(r.city_business), security_index: num(r.security_index),
    boss_favor: num(r.boss_favor), fund_balance: num(r.fund_balance), personal_savings: num(r.personal_savings),
    is_retired: Boolean(r.is_retired), game_over_type: r.game_over_type ? String(r.game_over_type) : null, updated_at: String(r.updated_at ?? ''),
  };
}
export async function adminUpdateSaveFields(saveId: string, fields: Record<string, string>): Promise<{ ok: boolean; err?: string }> {
  const { error } = await supabase.rpc('admin_update_save_fields', { p_save_id: saveId, p_fields: fields });
  return { ok: !error, err: error?.message };
}
export async function adminClearCooldowns(saveId: string): Promise<{ ok: boolean; err?: string }> {
  const { error } = await supabase.rpc('admin_clear_cooldowns', { p_save_id: saveId });
  return { ok: !error, err: error?.message };
}

// ───────── 兑换码 ─────────
export async function adminCreateRedeemCode(label: string, reward: Record<string, unknown>, count = 1): Promise<string[]> {
  const { data } = await supabase.rpc('admin_create_redeem_code', { p_label: label, p_reward: reward, p_count: count });
  return Array.isArray(data) ? (data as string[]) : [];
}
export async function listRedeemCodes(filter: 'all' | 'unused' | 'used'): Promise<RedeemCode[]> {
  let q = supabase.from('redeem_codes').select('*').order('created_at', { ascending: false }).limit(100);
  if (filter === 'unused') q = q.eq('is_used', false);
  if (filter === 'used') q = q.eq('is_used', true);
  const { data, error } = await q;
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    id: String(r.id), code: String(r.code), label: String(r.label ?? ''), reward: (r.reward as Record<string, unknown>) ?? {},
    created_at: String(r.created_at ?? ''), is_used: Boolean(r.is_used),
    used_by_email: r.used_by_email ? String(r.used_by_email) : null, used_at: r.used_at ? String(r.used_at) : null,
  }));
}

// ───────── 推送 ─────────
export async function adminSendPush(title: string, body: string, targetType: string, targetValue: string): Promise<{ ok: boolean; err?: string }> {
  const { error } = await supabase.rpc('admin_send_push', { p_title: title, p_body: body, p_target_type: targetType, p_target_value: targetValue || null });
  return { ok: !error, err: error?.message };
}
export async function listPushNotifications(): Promise<PushNotification[]> {
  const { data, error } = await supabase.from('push_notifications').select('*').order('created_at', { ascending: false }).limit(50);
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    id: String(r.id), title: String(r.title ?? ''), body: String(r.body ?? ''), target_type: String(r.target_type ?? 'all'),
    target_value: r.target_value ? String(r.target_value) : null, is_sent: Boolean(r.is_sent), created_at: String(r.created_at ?? ''),
    sent_at: r.sent_at ? String(r.sent_at) : null, created_by_email: r.created_by_email ? String(r.created_by_email) : null,
  }));
}

// ───────── 配置 ─────────
export async function listGameConfig(): Promise<GameConfigItem[]> {
  const { data, error } = await supabase.from('game_config').select('*').order('key');
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    key: String(r.key), value: (r.value as Record<string, unknown>) ?? {}, description: r.description ? String(r.description) : null, updated_at: String(r.updated_at ?? ''),
  }));
}
export async function adminSaveConfig(key: string, value: Record<string, unknown>, description?: string): Promise<{ ok: boolean; err?: string }> {
  const { error } = await supabase.rpc('admin_save_config', { p_key: key, p_value: value, p_description: description ?? null });
  return { ok: !error, err: error?.message };
}

// ───────── 风险监控 / 多设备注册检测 ─────────
export interface DeviceCluster {
  device_id: string;
  user_count: number;
  emails: string[];
  player_names: string[];
  user_ids: string[];
  save_ids: (string | null)[];
  first_at: string;
  last_at: string;
}
export async function adminScanDeviceClusters(minCount = 2): Promise<DeviceCluster[]> {
  const { data } = await supabase.rpc('admin_scan_device_clusters', { p_min_count: minCount, p_limit: 100 });
  if (!data || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    device_id: String(r.device_id ?? ''),
    user_count: num(r.user_count),
    emails: Array.isArray(r.emails) ? (r.emails as string[]) : [],
    player_names: Array.isArray(r.player_names) ? (r.player_names as string[]) : [],
    user_ids: Array.isArray(r.user_ids) ? (r.user_ids as string[]) : [],
    save_ids: Array.isArray(r.save_ids) ? (r.save_ids as (string | null)[]) : [],
    first_at: String(r.first_at ?? ''), last_at: String(r.last_at ?? ''),
  }));
}
export async function adminScanAnomalies(): Promise<{ scanned: number; flagged: number }> {
  const { data } = await supabase.rpc('admin_scan_anomalies');
  if (!data || !Array.isArray(data) || data.length === 0) return { scanned: 0, flagged: 0 };
  const r = data[0] as Record<string, unknown>;
  return { scanned: num(r.scanned), flagged: num(r.flagged) };
}
export async function listDetectionRules(): Promise<DetectionRule[]> {
  const { data, error } = await supabase.from('detection_rules').select('*').order('created_at');
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    id: String(r.id), rule_key: String(r.rule_key), name: String(r.name ?? ''), description: r.description ? String(r.description) : null,
    threshold: num(r.threshold), enabled: Boolean(r.enabled),
  }));
}
export async function listFlaggedUsers(): Promise<FlaggedUser[]> {
  const { data, error } = await supabase.from('flagged_users').select('*').order('flagged_at', { ascending: false }).limit(100);
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    id: String(r.id), user_id: String(r.user_id), username: r.username ? String(r.username) : null, rule_key: String(r.rule_key ?? ''),
    rule_name: r.rule_name ? String(r.rule_name) : null, reason: String(r.reason ?? ''),
    evidence: (r.evidence as Record<string, unknown>) ?? {}, flagged_at: String(r.flagged_at ?? ''), status: String(r.status ?? 'pending'),
  }));
}
export async function updateFlaggedStatus(id: string, status: 'reviewed' | 'dismissed'): Promise<{ ok: boolean; err?: string }> {
  const { error } = await supabase.from('flagged_users').update({ status }).eq('id', id);
  return { ok: !error, err: error?.message };
}
export async function toggleDetectionRule(ruleKey: string, enabled: boolean): Promise<{ ok: boolean; err?: string }> {
  const { error } = await supabase.from('detection_rules').update({ enabled }).eq('rule_key', ruleKey);
  return { ok: !error, err: error?.message };
}

// ───────── 公告管理 ─────────
export async function adminGetAnnouncement(pageKey: string): Promise<Announcement | null> {
  const { data } = await supabase.rpc('admin_get_announcement', { p_page_key: pageKey });
  if (!data || !Array.isArray(data) || data.length === 0) return null;
  const r = data[0] as Record<string, unknown>;
  return { title: String(r.title ?? ''), content: String(r.content ?? ''), active: Boolean(r.active), updated_at: String(r.updated_at ?? ''), updated_by_email: r.updated_by_email ? String(r.updated_by_email) : null };
}
export async function adminUpsertAnnouncement(pageKey: string, title: string, content: string, active: boolean): Promise<{ ok: boolean; err?: string }> {
  const { error } = await supabase.rpc('admin_upsert_announcement', { p_page_key: pageKey, p_title: title, p_content: content, p_active: active });
  return { ok: !error, err: error?.message };
}
// 任何已认证/匿名用户均可读取（登录/测试码页）
export async function getAnnouncement(pageKey: string): Promise<{ title: string; content: string } | null> {
  const { data } = await supabase.rpc('get_announcement', { p_page_key: pageKey });
  if (!data || !Array.isArray(data) || data.length === 0) return null;
  const r = data[0] as Record<string, unknown>;
  return { title: String(r.title ?? ''), content: String(r.content ?? '') };
}

// ───────── IP 多次注册检测 ─────────
export async function adminScanIpClusters(minCount = 2): Promise<IpCluster[]> {
  const { data } = await supabase.rpc('admin_scan_ip_clusters', { p_min_count: minCount, p_limit: 100 });
  if (!data || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    ip_address: String(r.ip_address ?? ''),
    user_count: num(r.user_count),
    emails: Array.isArray(r.emails) ? (r.emails as string[]) : [],
    player_names: Array.isArray(r.player_names) ? (r.player_names as string[]) : [],
    user_ids: Array.isArray(r.user_ids) ? (r.user_ids as string[]) : [],
    save_ids: Array.isArray(r.save_ids) ? (r.save_ids as (string | null)[]) : [],
    last_at: String(r.last_at ?? ''),
  }));
}

// ───────── 审计 ─────────
export async function adminListAudit(limit = 50): Promise<AuditLog[]> {
  const { data } = await supabase.rpc('admin_list_audit', { p_limit: limit });
  if (!data || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    id: String(r.id), admin_email: String(r.admin_email ?? ''), action: String(r.action ?? ''),
    target_user_id: r.target_user_id ? String(r.target_user_id) : null, detail: (r.detail as Record<string, unknown>) ?? {},
    created_at: String(r.created_at ?? ''),
  }));
}

// ───────── 清理 / 数据库（沿用上一轮）─────────
export async function listCleanupLogs(limit = 20): Promise<CleanupLog[]> {
  const { data, error } = await supabase.rpc('list_cleanup_logs', { p_limit: limit });
  if (error || !data || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    id: String(r.id), run_at: String(r.run_at ?? ''), trigger_type: String(r.trigger_type ?? ''),
    large_table_deleted: num(r.large_table_deleted), dead_cadres_deleted: num(r.dead_cadres_deleted),
    dead_saves_deleted: num(r.dead_saves_deleted), mb_before: num(r.mb_before), mb_after: num(r.mb_after), mb_saved: num(r.mb_saved),
  }));
}
export async function adminDatabaseOverview(): Promise<DatabaseNode[]> {
  const { data, error } = await supabase.rpc('admin_database_overview');
  if (error || !data || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    id: String(r.id), code: String(r.code), name: String(r.name), capacity_limit: num(r.capacity_limit), player_count: num(r.player_count), online_count: num(r.online_count),
    is_full: Boolean(r.is_full), is_active: r.is_active == null ? true : Boolean(r.is_active), sort_order: num(r.sort_order),
  }));
}
export async function adminCreateDatabase(code: string, name: string, capacityLimit: number): Promise<{ ok: boolean; err?: string }> {
  const { error } = await supabase.rpc('admin_create_database', { p_code: code, p_name: name, p_capacity_limit: capacityLimit });
  return { ok: !error, err: error?.message };
}
export async function adminUpdateDatabase(dbId: string, name?: string, capacityLimit?: number): Promise<{ ok: boolean; err?: string }> {
  const { error } = await supabase.rpc('admin_update_database', { p_db_id: dbId, p_name: name ?? null, p_capacity_limit: capacityLimit ?? null });
  return { ok: !error, err: error?.message };
}
export async function adminToggleDatabaseActive(dbId: string, isActive: boolean): Promise<{ ok: boolean; err?: string }> {
  const { error } = await supabase.rpc('admin_toggle_database_active', { p_db_id: dbId, p_is_active: isActive });
  return { ok: !error, err: error?.message };
}
export async function getMyTestCodeStatus(): Promise<MyTestCodeStatus> {
  const { data } = await supabase.rpc('get_my_test_code_status');
  const d = (data as { approval_status?: string; has_code?: boolean; test_code?: string | null } | null) ?? {};
  return { approvalStatus: String(d.approval_status ?? 'none'), hasCode: Boolean(d.has_code), testCode: d.test_code ?? null };
}
export async function adminGenerateTestCodes(batchName: string, count: number, expiresAt?: string, note?: string, groupName?: string): Promise<string[]> {
  const { data } = await supabase.rpc('admin_generate_test_codes', { p_batch_name: batchName, p_count: count, p_expires_at: expiresAt ?? null, p_note: note ?? null, p_group_name: groupName ?? '' });
  return Array.isArray(data) ? (data as string[]) : [];
}
export async function adminListTestCodes(batchName?: string, status?: string, limit = 100, offset = 0, groupName?: string): Promise<TestCodeRow[]> {
  const { data } = await supabase.rpc('admin_list_test_codes', { p_batch_name: batchName ?? null, p_status: status ?? null, p_limit: limit, p_offset: offset, p_group_name: groupName ?? null });
  if (!data || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    id: String(r.id), code: String(r.code), batch_name: String(r.batch_name ?? ''), status: String(r.status ?? ''),
    used_by_user_id: r.used_by_user_id ? String(r.used_by_user_id) : null, used_by_email: r.used_by_email ? String(r.used_by_email) : null,
    used_at: r.used_at ? String(r.used_at) : null, expires_at: r.expires_at ? String(r.expires_at) : null,
    note: r.note ? String(r.note) : null, created_at: String(r.created_at ?? ''),
    group_name: String(r.group_name ?? ''),
  }));
}
export async function adminListTestCodeGroups(): Promise<TestCodeGroup[]> {
  const { data } = await supabase.rpc('admin_list_test_code_groups');
  if (!data || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    group_name: String(r.group_name ?? ''), total: num(r.total), used: num(r.used), available: num(r.available), created_at: String(r.created_at ?? ''),
  }));
}
export async function adminClearUnusedTestCodes(): Promise<number> {
  const { data } = await supabase.rpc('admin_clear_unused_test_codes');
  return num(data);
}
export async function adminRenameTestCodeGroup(oldName: string, newName: string): Promise<{ ok: boolean; err?: string; updated: number }> {
  const { data, error } = await supabase.rpc('admin_rename_test_code_group', { p_old: oldName, p_new: newName });
  if (error) return { ok: false, err: error.message, updated: 0 };
  const row = Array.isArray(data) ? data[0] : data;
  return { ok: Boolean(row?.ok), err: row?.err ?? undefined, updated: num(row?.updated) };
}
export async function adminDeleteTestCodeGroup(group: string): Promise<{ ok: boolean; err?: string; deleted: number }> {
  const { data, error } = await supabase.rpc('admin_delete_test_code_group', { p_group: group });
  if (error) return { ok: false, err: error.message, deleted: 0 };
  const row = Array.isArray(data) ? data[0] : data;
  return { ok: Boolean(row?.ok), err: row?.err ?? undefined, deleted: num(row?.deleted) };
}
export async function adminListTestCodeBatches(): Promise<TestCodeBatch[]> {
  const { data } = await supabase.rpc('admin_list_test_code_batches');
  if (!data || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    batch_name: String(r.batch_name ?? ''), total: num(r.total), used: num(r.used), disabled: num(r.disabled),
    available: num(r.available), created_at: String(r.created_at ?? ''),
    copy_count: num(r.copy_count), last_copied_email: r.last_copied_email ? String(r.last_copied_email) : null,
    last_copied_at: r.last_copied_at ? String(r.last_copied_at) : null,
    max_codes: num(r.max_codes) || 1000,
  }));
}
export async function adminLogBatchCopy(batchName: string, codeCount: number): Promise<void> {
  await supabase.rpc('admin_log_batch_copy', { p_batch_name: batchName, p_code_count: codeCount });
}
export async function getTestCodeSchedule(): Promise<ActiveSchedule | null> {
  const { data } = await supabase.rpc('get_test_code_schedule');
  if (!data || !Array.isArray(data) || data.length === 0) return null;
  const r = data[0] as Record<string, unknown>;
  return { id: String(r.id), open_time: String(r.open_time), close_time: String(r.close_time), enabled: Boolean(r.enabled), note: r.note ? String(r.note) : null };
}
export async function adminUpsertSchedule(openTime: string, closeTime: string, enabled: boolean, note?: string): Promise<{ ok: boolean; status?: string; err?: string }> {
  const { data, error } = await supabase.rpc('admin_upsert_schedule', { p_open_time: openTime, p_close_time: closeTime, p_enabled: enabled, p_note: note ?? null });
  if (error) return { ok: false, err: error.message };
  const d = data as Record<string, unknown> | null;
  return { ok: true, status: d ? String(d.status ?? '') : '' };
}
export async function adminListScheduleRequests(): Promise<ScheduleRequest[]> {
  const { data } = await supabase.rpc('admin_list_schedule_requests', { p_limit: 20 });
  if (!data || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    id: String(r.id), open_time: String(r.open_time), close_time: String(r.close_time), enabled: Boolean(r.enabled),
    status: String(r.status), note: r.note ? String(r.note) : null, created_by_email: r.created_by_email ? String(r.created_by_email) : null,
    approved_by: r.approved_by ? String(r.approved_by) : null, reject_reason: r.reject_reason ? String(r.reject_reason) : null, created_at: String(r.created_at ?? ''),
  }));
}
export async function adminApproveSchedule(id: string): Promise<{ ok: boolean; err?: string }> {
  const { error } = await supabase.rpc('admin_approve_schedule', { p_id: id });
  return { ok: !error, err: error?.message };
}
export async function adminRejectSchedule(id: string, reason?: string): Promise<{ ok: boolean; err?: string }> {
  const { error } = await supabase.rpc('admin_reject_schedule', { p_id: id, p_reason: reason ?? null });
  return { ok: !error, err: error?.message };
}
export async function adminDeleteTestCodeBatch(batchName: string): Promise<{ ok: boolean; count?: number; err?: string }> {
  const { data, error } = await supabase.rpc('admin_delete_test_code_batch', { p_batch_name: batchName });
  return { ok: !error, count: num(data), err: error?.message };
}
export async function adminRenameTestCodeBatch(oldName: string, newName: string): Promise<{ ok: boolean; count?: number; err?: string }> {
  const { data, error } = await supabase.rpc('admin_rename_test_code_batch', { p_old_name: oldName, p_new_name: newName });
  return { ok: !error, count: num(data), err: error?.message };
}
export async function adminRestoreAccount(userId: string): Promise<{ ok: boolean; email?: string; err?: string }> {
  const { data, error } = await supabase.rpc('admin_restore_account', { p_user_id: userId });
  if (error) return { ok: false, err: error.message };
  const d = data as Record<string, unknown> | null;
  return { ok: true, email: d ? String(d.email ?? '') : '' };
}
export async function adminPurgeExpiredAccounts(): Promise<{ ok: boolean; count?: number; err?: string }> {
  const { data, error } = await supabase.rpc('admin_purge_expired_accounts');
  return { ok: !error, count: num(data), err: error?.message };
}

// ───────── 账号归档记录（彻底清除后保留的关键记录，记录保护）─────────
export interface ArchivedAccount {
  id: string; user_id: string; email: string | null; player_name: string | null;
  registered_at: string | null; deleted_at: string; deletion_reason: string | null;
  audit_log_count: number; archived_at: string;
}
export async function listArchivedAccounts(search = '', limit = 50, offset = 0): Promise<ArchivedAccount[]> {
  const { data, error } = await supabase.rpc('admin_list_archived_accounts', { p_search: search || null, p_limit: limit, p_offset: offset });
  if (error || !data || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    id: String(r.id), user_id: String(r.user_id), email: r.email ? String(r.email) : null,
    player_name: r.player_name ? String(r.player_name) : null,
    registered_at: r.registered_at ? String(r.registered_at) : null,
    deleted_at: String(r.deleted_at ?? ''), deletion_reason: r.deletion_reason ? String(r.deletion_reason) : null,
    audit_log_count: num(r.audit_log_count), archived_at: String(r.archived_at ?? ''),
  }));
}
export async function adminTestCodeStats(): Promise<TestCodeStats> {
  const { data } = await supabase.rpc('admin_test_code_stats');
  if (!data || !Array.isArray(data) || data.length === 0) return { unused: 0, used: 0, disabled: 0, total: 0 };
  const r = data[0] as Record<string, unknown>;
  return { unused: num(r.unused), used: num(r.used), disabled: num(r.disabled), total: num(r.total) };
}
export async function adminApprovalStats(): Promise<ApprovalStats> {
  const { data } = await supabase.rpc('admin_approval_stats');
  if (!data || !Array.isArray(data) || data.length === 0) return { pending: 0, approved: 0, rejected: 0, total: 0 };
  const r = data[0] as Record<string, unknown>;
  return { pending: num(r.pending), approved: num(r.approved), rejected: num(r.rejected), total: num(r.total) };
}
export interface AutoApprovalConfig {
  enabled: boolean; note: string | null; updated_by: string | null; updated_at: string | null; code_system_enabled: boolean;
}
export async function adminGetAutoApproval(): Promise<AutoApprovalConfig> {
  const { data } = await supabase.rpc('admin_get_auto_approval');
  if (!data) return { enabled: false, note: null, updated_by: null, updated_at: null, code_system_enabled: true };
  const r = data as Record<string, unknown>;
  return {
    enabled: Boolean(r.enabled),
    note: r.note ? String(r.note) : null,
    updated_by: r.updated_by ? String(r.updated_by) : null,
    updated_at: r.updated_at ? String(r.updated_at) : null,
    code_system_enabled: r.code_system_enabled !== false,
  };
}
export async function adminTodaySystemRejectedCount(): Promise<number> {
  const { data, error } = await supabase.rpc('admin_today_system_rejected_count');
  if (error) return 0;
  return num(data);
}
export async function adminSetAutoApproval(enabled: boolean, note?: string): Promise<{ ok: boolean; err?: string }> {
  const { error } = await supabase.rpc('admin_set_auto_approval', { p_enabled: enabled, p_note: note ?? null });
  return { ok: !error, err: error?.message };
}
export async function adminSetCodeSystem(enabled: boolean): Promise<{ ok: boolean; err?: string }> {
  const { error } = await supabase.rpc('admin_set_code_system', { p_enabled: enabled });
  return { ok: !error, err: error?.message };
}
export async function adminApprovalList(search?: string, status?: string, limit = 50, offset = 0): Promise<ApprovalRow[]> {
  const { data } = await supabase.rpc('admin_approval_list', { p_search: search ?? null, p_status: status ?? null, p_limit: limit, p_offset: offset });
  if (!data || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    id: String(r.id), user_id: String(r.user_id), email: String(r.email ?? ''), status: String(r.status ?? ''),
    test_code_id: r.test_code_id ? String(r.test_code_id) : null, reject_reason: r.reject_reason ? String(r.reject_reason) : null,
    reviewed_by: r.reviewed_by ? String(r.reviewed_by) : null, reviewed_at: r.reviewed_at ? String(r.reviewed_at) : null,
    created_at: String(r.created_at ?? ''), player_name: r.player_name ? String(r.player_name) : null,
    rank_level: r.rank_level != null ? num(r.rank_level) : null, rank_name: r.rank_name ? String(r.rank_name) : null,
    dup_email_count: num(r.dup_email_count) || 1,
  }));
}
export async function adminApproveUser(userId: string): Promise<{ ok: boolean; err?: string }> {
  const { error } = await supabase.rpc('admin_approve_user', { p_user_id: userId });
  return { ok: !error, err: error?.message };
}
export async function adminRejectUser(userId: string, reason: string): Promise<{ ok: boolean; err?: string }> {
  const { error } = await supabase.rpc('admin_reject_user', { p_user_id: userId, p_reason: reason });
  return { ok: !error, err: error?.message };
}
export async function adminBatchApprove(userIds: string[]): Promise<number> {
  const { data } = await supabase.rpc('admin_batch_approve', { p_user_ids: userIds });
  return num(data);
}
export async function adminBatchReject(userIds: string[], reason: string): Promise<number> {
  const { data } = await supabase.rpc('admin_batch_reject', { p_user_ids: userIds, p_reason: reason });
  return num(data);
}
/** 一键批量通过所有 pending 用户（服务端全量，不受前端分页限制） */
export async function adminBatchApproveAll(): Promise<{ count: number; err?: string }> {
  const { data, error } = await supabase.rpc('admin_batch_approve_all_pending');
  return { count: num(data), err: error?.message };
}

/** 清理超过指定天数的异常占位档（needs_character_creation=true 且未建角色） */
export async function adminCleanupStalePlaceholderSaves(days: number): Promise<{ count: number; err?: string }> {
  const { data, error } = await supabase.rpc('admin_cleanup_stale_placeholder_saves', { p_days: days });
  return { count: num(data), err: error?.message };
}
// ───────── 玩家全量游戏数据 ─────────
export interface SubordinateItem { name: string; role: string; ability: number; loyalty: number; integrity: number; rank_level: number; is_appointed: boolean; appointed_role: string | null; faction: string | null; specialty: string | null; }
export interface BossTaskItem { title: string; task_type: string; status: string; urgency: string; reward_merit: number; current_value: number; target_value: number; }
export interface CareerHistoryItem { position: string; city: string; rank_level: number; start_year: number; end_year: number | null; }
export interface FamilyMemberItem { name: string; member_type: string; job: string | null; health_score: number; moral_score: number; is_adult: boolean; }
export interface ConstructionItem { name: string; category: string; status: string; start_day: number; finish_day: number; merit_reward: number; }
export interface PoliceCaseItem { title: string; case_type: string; difficulty: number; status: string; reward_merit: number; }
export interface PlayerHealthItem { health: number; energy: number; is_on_leave: boolean; leave_end_day: number | null; }
export interface GoverningAreaItem { area_name: string; area_type: string; dev_index: number; favor_index: number; }
export interface PlayerFullData {
  subordinates: SubordinateItem[];
  boss_tasks: BossTaskItem[];
  career_history: CareerHistoryItem[];
  family_members: FamilyMemberItem[];
  construction: ConstructionItem[];
  police_cases: PoliceCaseItem[];
  health: PlayerHealthItem | null;
  governing_areas: GoverningAreaItem[];
}
export async function adminGetPlayerFull(saveId: string): Promise<PlayerFullData | null> {
  const { data, error } = await supabase.rpc('admin_get_player_full', { p_save_id: saveId });
  if (error || !data) return null;
  const d = data as Record<string, unknown>;
  return {
    subordinates: (d.subordinates as SubordinateItem[]) ?? [],
    boss_tasks: (d.boss_tasks as BossTaskItem[]) ?? [],
    career_history: (d.career_history as CareerHistoryItem[]) ?? [],
    family_members: (d.family_members as FamilyMemberItem[]) ?? [],
    construction: (d.construction as ConstructionItem[]) ?? [],
    police_cases: (d.police_cases as PoliceCaseItem[]) ?? [],
    health: (d.health as PlayerHealthItem | null) ?? null,
    governing_areas: (d.governing_areas as GoverningAreaItem[]) ?? [],
  };
}

export async function triggerCleanup(): Promise<CleanupResult | null> {
  const { data, error } = await supabase.rpc('run_game_cleanup', { p_trigger: 'admin_manual' });
  if (error || !data) return null;
  const r = (data as Record<string, unknown>);
  return {
    trigger: String(r.trigger ?? 'admin_manual'), large_table_deleted: num(r.large_table_deleted),
    dead_cadres_deleted: num(r.dead_cadres_deleted), dead_saves_deleted: num(r.dead_saves_deleted),
    mb_before: num(r.mb_before), mb_after: num(r.mb_after), mb_saved: num(r.mb_saved),
  };
}

// ───────── 账户申诉 ─────────
export async function adminSubmitAppeal(
  targetEmail: string, appealType: string, reason?: string,
): Promise<{ ok: boolean; err?: string }> {
  const { data, error } = await supabase.rpc('admin_submit_appeal', {
    p_target_email: targetEmail, p_appeal_type: appealType, p_reason: reason ?? null,
  });
  if (error) return { ok: false, err: error.message };
  return data as { ok: boolean; err?: string };
}

export async function adminListAppeals(status?: string, appealType?: string): Promise<AppealRow[]> {
  const { data, error } = await supabase.rpc('admin_list_appeals', {
    p_status: status ?? null,
    p_appeal_type: appealType ?? null,
  });
  if (error) return [];
  return (data as AppealRow[]) ?? [];
}

export async function adminApproveAppeal(id: string): Promise<{ ok: boolean; err?: string }> {
  const { data, error } = await supabase.rpc('admin_approve_appeal', { p_id: id });
  if (error) return { ok: false, err: error.message };
  return data as { ok: boolean; err?: string };
}

export async function adminRejectAppeal(id: string, reason?: string): Promise<{ ok: boolean; err?: string }> {
  const { data, error } = await supabase.rpc('admin_reject_appeal', {
    p_id: id, p_reason: reason ?? null,
  });
  if (error) return { ok: false, err: error.message };
  return data as { ok: boolean; err?: string };
}

export async function adminAppealsPendingCount(): Promise<number> {
  const { data, error } = await supabase.rpc('admin_appeals_pending_count');
  if (error) return 0;
  return Number(data ?? 0);
}

// 超管直接通过账号（无需等待申诉流程）
export async function adminDirectApproveAccount(
  targetEmail: string, appealType: string, note?: string,
): Promise<{ ok: boolean; err?: string }> {
  const { data, error } = await supabase.rpc('admin_direct_approve_account', {
    p_target_email: targetEmail, p_appeal_type: appealType, p_note: note ?? null,
  });
  if (error) return { ok: false, err: error.message };
  return data as { ok: boolean; err?: string };
}

export interface UnapprovedAccountRow {
  user_id: string; email: string; status: string;
  reject_reason: string | null; device_id: string | null;
  created_at: string; has_pending_appeal: boolean;
}
export async function adminListUnapprovedAccounts(limit = 50, offset = 0): Promise<UnapprovedAccountRow[]> {
  const { data, error } = await supabase.rpc('admin_list_unapproved_accounts', {
    p_limit: limit, p_offset: offset,
  });
  if (error) return [];
  return (data as UnapprovedAccountRow[]) ?? [];
}

// ───────── 测试码生成统计（超管专属）─────────
export interface TestCodeGenRow {
  admin_id: string; admin_email: string;
  gen_count: number; gen_unused: number; gen_used: number;
}
export interface TestCodeGenStats {
  total: number; unused: number; used: number; admins: TestCodeGenRow[];
}
export async function adminTestCodeGenStats(): Promise<TestCodeGenStats> {
  const { data, error } = await supabase.rpc('admin_test_code_gen_stats');
  if (error || !data || !Array.isArray(data) || data.length === 0) {
    return { total: 0, unused: 0, used: 0, admins: [] };
  }
  const first = data[0] as Record<string, unknown>;
  const admins: TestCodeGenRow[] = data.map((r: Record<string, unknown>) => ({
    admin_id: String(r.admin_id ?? ''),
    admin_email: String(r.admin_email ?? ''),
    gen_count: num(r.gen_count),
    gen_unused: num(r.gen_unused),
    gen_used: num(r.gen_used),
  }));
  return { total: num(first.total), unused: num(first.unused), used: num(first.used), admins };
}

// ───────── 玩家排行榜 ─────────
export interface PlayerLeaderRow {
  id: string; user_id: string; player_name: string;
  rank_level: number; rank_name: string;
  merit_points: number; moral_value: number; assessment_grade: string;
  game_days: number; city_name: string; city_gdp: number; is_retired: boolean;
}
export async function adminPlayerLeaderboard(): Promise<PlayerLeaderRow[]> {
  const { data, error } = await supabase.rpc('admin_player_leaderboard');
  if (error || !data) return [];
  return (data as PlayerLeaderRow[]) ?? [];
}

// ───────── 玩家存档名称检索 ─────────
export interface PlayerNameRow {
  id: string; user_id: string; player_name: string;
  rank_level: number; rank_name: string; created_at: string;
  email: string; banned: boolean;
}
export async function adminListPlayerNames(search?: string, limit = 50, offset = 0): Promise<PlayerNameRow[]> {
  const { data, error } = await supabase.rpc('admin_list_player_names', {
    p_search: search ?? null, p_limit: limit, p_offset: offset,
  });
  if (error || !data) return [];
  return (data as PlayerNameRow[]) ?? [];
}
export async function adminRenamePlayer(id: string, newName: string): Promise<{ ok: boolean; err?: string }> {
  const { data, error } = await supabase.rpc('admin_rename_player', { p_id: id, p_new_name: newName });
  if (error) return { ok: false, err: error.message };
  const r = Array.isArray(data) ? data[0] : data;
  return r as { ok: boolean; err?: string };
}

// ───────── 敏感词汇库 ─────────
export interface SensitiveWordRow {
  id: string; word: string; created_by_email: string | null; created_at: string;
}
export async function adminListSensitiveWords(limit = 100, offset = 0): Promise<SensitiveWordRow[]> {
  const { data, error } = await supabase.rpc('admin_list_sensitive_words', { p_limit: limit, p_offset: offset });
  if (error || !data) return [];
  return (data as SensitiveWordRow[]) ?? [];
}
export async function adminAddSensitiveWord(word: string): Promise<{ ok: boolean; err?: string }> {
  const { data, error } = await supabase.rpc('admin_add_sensitive_word', { p_word: word });
  if (error) return { ok: false, err: error.message };
  const r = Array.isArray(data) ? data[0] : data;
  return r as { ok: boolean; err?: string };
}
export async function adminDeleteSensitiveWord(id: string): Promise<{ ok: boolean; err?: string }> {
  const { data, error } = await supabase.rpc('admin_delete_sensitive_word', { p_id: id });
  if (error) return { ok: false, err: error.message };
  const r = Array.isArray(data) ? data[0] : data;
  return r as { ok: boolean; err?: string };
}

export async function adminBatchAddSensitiveWords(words: string[]): Promise<{ imported: number; skipped: number }> {
  const { data, error } = await supabase.rpc('admin_batch_add_sensitive_words', { p_words: words });
  if (error || !data) return { imported: 0, skipped: 0 };
  const r = Array.isArray(data) ? data[0] : data;
  return { imported: Number(r?.imported ?? 0), skipped: Number(r?.skipped ?? 0) };
}

// ───────── 封禁记录 ─────────
export interface BannedEntityRow {
  id: string; user_id: string | null; email: string | null;
  entity_type: string; entity_value: string | null;
  ban_reason: string | null; banned_by_email: string | null;
  banned_at: string; banned_until: string; is_active: boolean;
}
export async function adminListBannedEntities(limit = 50, offset = 0, type?: string): Promise<BannedEntityRow[]> {
  const { data, error } = await supabase.rpc('admin_list_banned_entities', {
    p_limit: limit, p_offset: offset, p_type: type ?? null,
  });
  if (error || !data) return [];
  return (data as BannedEntityRow[]) ?? [];
}
export async function adminUnbanEntity(id: string): Promise<{ ok: boolean; err?: string }> {
  const { data, error } = await supabase.rpc('admin_unban_entity', { p_id: id });
  if (error) return { ok: false, err: error.message };
  return data as { ok: boolean; err?: string };
}

export interface BannedEntitiesStats {
  today: number; total_active: number;
  by_type: { user: number; email: number; device: number; ip: number; vpn: number };
}
export async function adminBannedEntitiesStats(): Promise<BannedEntitiesStats | null> {
  const { data, error } = await supabase.rpc('admin_banned_entities_stats');
  if (error || !data) return null;
  return data as BannedEntitiesStats;
}

/* ── 封禁申诉 ── */
export async function submitBanAppeal(email: string, reason: string): Promise<{ ok: boolean; err?: string }> {
  const { data, error } = await supabase.rpc('submit_ban_appeal', { p_email: email, p_reason: reason });
  if (error) return { ok: false, err: error.message };
  return data as { ok: boolean; err?: string };
}

export interface BanAppealRow {
  id: string; email: string; reason: string; status: string;
  review_note: string | null; reviewed_by: string | null; reviewed_at: string | null; created_at: string;
  ban_type: string | null; banned_at: string | null;
}
export async function adminListBanAppeals(status?: string, limit = 50, offset = 0): Promise<BanAppealRow[]> {
  const { data, error } = await supabase.rpc('admin_list_ban_appeals', {
    p_status: status ?? null, p_limit: limit, p_offset: offset,
  });
  if (error || !Array.isArray(data)) return [];
  return data as BanAppealRow[];
}
export async function adminReviewBanAppeal(id: string, approve: boolean, note?: string): Promise<{ ok: boolean; err?: string }> {
  const { data, error } = await supabase.rpc('admin_review_ban_appeal', {
    p_id: id, p_approve: approve, p_note: note ?? null,
  });
  if (error) return { ok: false, err: error.message };
  return data as { ok: boolean; err?: string };
}

// ───────── NPC 名库管理 ─────────
// ───────── NPC 姓名名册（管理员维护，供游戏生成取用）─────────
export interface NpcNameRow {
  id: string; name: string; source: string; created_at: string;
}
export async function adminListNpcNames(search?: string, limit = 300, offset = 0): Promise<NpcNameRow[]> {
  const { data } = await supabase.rpc('admin_list_npc_names', { p_search: search ?? null, p_limit: limit, p_offset: offset });
  return (data as NpcNameRow[]) ?? [];
}
export async function adminAddNpcName(name: string): Promise<{ ok: boolean; err?: string }> {
  const { data, error } = await supabase.rpc('admin_add_npc_name_full', { p_name: name });
  if (error) return { ok: false, err: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  return { ok: Boolean(row?.ok), err: row?.err ?? undefined };
}
export async function adminDeleteNpcName(id: string): Promise<{ ok: boolean; err?: string }> {
  const { data, error } = await supabase.rpc('admin_delete_npc_name_full', { p_id: id });
  if (error) return { ok: false, err: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  return { ok: Boolean(row?.ok), err: row?.err ?? undefined };
}
export async function adminImportNpcNames(names: string[]): Promise<{ imported: number; skipped: number }> {
  const { data, error } = await supabase.rpc('admin_import_npc_names', { p_names: names });
  if (error) return { imported: 0, skipped: 0 };
  const row = Array.isArray(data) ? data[0] : data;
  return { imported: Number(row?.imported ?? 0), skipped: Number(row?.skipped ?? 0) };
}

export interface NpcNameInUseRow {
  npc_id: string; npc_name: string; position_label: string;
  rank_level: number; save_id: string; player_name: string;
}
export async function adminListNpcNamesInUse(search?: string, limit = 100, offset = 0): Promise<NpcNameInUseRow[]> {
  const { data } = await supabase.rpc('admin_list_npc_names_in_use', { p_search: search ?? null, p_limit: limit, p_offset: offset });
  return (data as NpcNameInUseRow[]) ?? [];
}

// ───────── 扫描存档 NPC 姓名并导入名册 ─────────
export async function adminScanNpcNames(): Promise<{ scanned: number; imported: number; skipped: number }> {
  // 收集所有已激活存档中的 NPC 姓名（subordinates / npc_band / leadership_band / player_saves）
  const { data: subs } = await supabase.from('subordinates').select('name, save_id').limit(5000);
  const { data: bands } = await supabase.from('npc_band').select('name, save_id').limit(5000);
  const { data: lbands } = await supabase.from('leadership_band').select('sub_name, save_id').limit(5000);
  const { data: saves } = await supabase.from('player_saves').select('boss_name, approval_status').limit(5000);
  const activeSaveIds = new Set((saves ?? []).filter(s => (s as { approval_status?: string }).approval_status !== 'pending').map(s => (s as { save_id?: string }).save_id ?? ''));
  const set = new Set<string>();
  (subs ?? []).forEach(r => { const n = (r as { name?: string }).name; if (n && n.trim()) set.add(n.trim()); });
  (bands ?? []).forEach(r => { const n = (r as { name?: string }).name; if (n && n.trim()) set.add(n.trim()); });
  (lbands ?? []).forEach(r => { const n = (r as { sub_name?: string }).sub_name; if (n && n.trim()) set.add(n.trim()); });
  (saves ?? []).forEach(r => { const n = (r as { boss_name?: string }).boss_name; if (n && n.trim()) set.add(n.trim()); });
  void activeSaveIds;
  const names = Array.from(set);
  const scanned = names.length;
  if (scanned === 0) return { scanned: 0, imported: 0, skipped: 0 };
  const res = await adminImportNpcNames(names);
  return { scanned, imported: res.imported, skipped: res.skipped };
}

// ───────── 服务端全量同步：扫描所有存档 NPC 姓名写入名册 ─────────
export async function adminSyncNpcNamesFromSaves(): Promise<{ imported: number; total: number }> {
  const { data, error } = await supabase.rpc('admin_sync_npc_names_from_saves');
  if (error) return { imported: 0, total: 0 };
  const row = Array.isArray(data) ? data[0] : data;
  return { imported: Number(row?.imported ?? 0), total: Number(row?.total ?? 0) };
}

// ───────── 临时申诉（后台显示有存档但玩家端看不到存档）─────────
export interface TempAppealRow {
  id: string; user_id: string; email: string; reason: string; status: string;
  reject_reason: string | null; handler: string | null; created_at: string; updated_at: string;
  device_fingerprint: string | null;
  same_fp_count: number;
  account_created_at: string | null; admin_exempt: boolean;
}
export async function adminListTempAppeals(status?: string, limit = 50, offset = 0): Promise<TempAppealRow[]> {
  const { data, error } = await supabase.rpc('admin_list_temp_appeals', {
    p_status: status ?? null, p_limit: limit, p_offset: offset,
  });
  if (error || !Array.isArray(data)) return [];
  return data as TempAppealRow[];
}
export async function adminReviewTempAppeal(id: string, approve: boolean, rejectReason?: string): Promise<{ ok: boolean; err?: string }> {
  const { data, error } = await supabase.rpc('admin_review_temp_appeal', {
    p_id: id, p_approve: approve, p_reject_reason: rejectReason ?? null,
  });
  if (error) return { ok: false, err: error.message };
  return data as { ok: boolean; err?: string };
}

// 一键同意当前所有待处理的临时申诉
export async function adminApproveAllTempAppeals(): Promise<{ ok: boolean; count?: number; err?: string }> {
  const { data, error } = await supabase.rpc('admin_approve_all_temp_appeals');
  if (error) return { ok: false, err: error.message };
  return data as { ok: boolean; count?: number; err?: string };
}
