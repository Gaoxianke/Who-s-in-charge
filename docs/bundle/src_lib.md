# src/lib

共 24 个文件。
<a id="srclibadminapits"></a>
## `src/lib/adminApi.ts`

```typescript
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
```

<a id="srclibapprovalgatets"></a>
## `src/lib/approvalGate.ts`

```typescript
// 门禁统一工具：根据当前用户身份与审批状态，解析应跳转的目标路由
import { supabase } from '@/client/supabase';

export type GateTarget =
  | 'admin'
  | 'home'
  | 'character-create'
  | 'pending-approval'
  | 'rejected-notice'
  | 'enter-code';

export async function resolveGateTarget(needsCharacterCreation: boolean): Promise<GateTarget> {
  try {
    // 管理员直接进入后台，阻断进入游戏
    const { data: isAdmin } = await supabase.rpc('is_current_admin');
    if (Boolean(isAdmin)) return 'admin';

    // 已有真实存档的老玩家：无论激活码制是否开启，一律直接进入游戏（熔断点①）
    const { data: hasSave } = await supabase.rpc('player_has_real_save');
    if (Boolean(hasSave)) return needsCharacterCreation ? 'character-create' : 'home';

    // 已通过的临时申诉：管理员已放行，直接进入游戏
    const { data: appealApproved } = await supabase.rpc('has_approved_temp_appeal');
    if (Boolean(appealApproved)) {
      return needsCharacterCreation ? 'character-create' : 'home';
    }

    // 激活码制状态：仅当明确为 true 时才视为开启；null/异常一律视为关闭（fail-open，熔断点②）
    const { data: codeEnabled } = await supabase.rpc('get_code_system_enabled');
    if (codeEnabled !== true) {
      return needsCharacterCreation ? 'character-create' : 'home';
    }

    // 激活码制开启：按测试码审批状态路由
    const { data } = await supabase.rpc('get_my_test_code_status');
    const status = (data as { approval_status?: string; has_code?: boolean } | null) ?? {};
    const approvalStatus = status.approval_status;

    if (approvalStatus === 'pending') return 'pending-approval';
    if (approvalStatus === 'rejected') return 'rejected-notice';
    if (approvalStatus === 'approved' && status.has_code) {
      return needsCharacterCreation ? 'character-create' : 'home';
    }

    return 'enter-code';
  } catch {
    // 任何异常都放行进入游戏，避免误跳测试码页（熔断点③）
    return needsCharacterCreation ? 'character-create' : 'home';
  }
}

export function gateTargetHref(target: GateTarget): string {
  switch (target) {
    case 'admin':
      return '/(app)/admin-panel';
    case 'home':
      return '/(app)/home';
    case 'character-create':
      return '/(app)/character-create';
    case 'pending-approval':
      return '/(app)/pending-approval';
    case 'rejected-notice':
      return '/(app)/rejected-notice';
    case 'enter-code':
      return '/(app)/enter-code';
  }
}
```

<a id="srclibdevicets"></a>
## `src/lib/device.ts`

```typescript
// 设备指纹工具：跨平台生成稳定的设备唯一标识
// - iOS：IDFV
// - Android：Android ID
// - Web：安全存储持久化的随机 UUID（避免所有 Web 用户共享同一标识）
import * as Application from 'expo-application';
import { secureStorage } from '@/client/storage';

const WEB_KEY = '_game_device_id';

export async function getDeviceId(): Promise<string> {
  try {
    if (process.env.EXPO_OS === 'ios') {
      return (await Application.getIosIdForVendorAsync()) ?? 'unknown';
    }
    if (process.env.EXPO_OS === 'android') {
      return Application.getAndroidId() ?? 'unknown';
    }
    // Web
    let id = await secureStorage.getItem(WEB_KEY);
    if (!id) {
      id =
        'web-' +
        (typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      await secureStorage.setItem(WEB_KEY, id);
    }
    return id;
  } catch {
    return 'unknown';
  }
}
```

<a id="srclibeventtemplatests"></a>
## `src/lib/eventTemplates.ts`

```typescript
// 突发事件模板数据库（按职级分层）
// isMajor=true 的事件触发领导班子集体决策投票
import type { EventTemplate } from '@/types/game';

// ─────────────────────────────────────────────
// 乡镇级（rank 1-3）
// ─────────────────────────────────────────────
const EVENTS_TOWN: EventTemplate[] = [
  {
    type: 'opinion',
    title: '村民纠纷激化',
    description: '辖区两户村民因宅基地边界问题发生激烈争吵，聚集村民约三十余人，情绪激动，存在械斗风险，已有人拨打信访热线。',
    choices: [
      { text: '亲赴现场调解，组织村委会共同协商', meritChange: 15, moralChange: 5, gdpChange: 0, livelihoodChange: 8, ecologyChange: 0, businessChange: 0, description: '当场化解矛盾，民心凝聚，树立良好形象。' },
      { text: '委托村委会按规章处理，保持观望', meritChange: 5, moralChange: 0, gdpChange: 0, livelihoodChange: 2, ecologyChange: 0, businessChange: 0, description: '事件缓慢平息，但民众感觉缺乏关怀。' },
      { text: '移交派出所处理，不参与介入', meritChange: -5, moralChange: -5, gdpChange: 0, livelihoodChange: -5, ecologyChange: 0, businessChange: 0, description: '村民认为领导推诿，信访投诉增多。' },
    ],
  },
  {
    type: 'opinion',
    title: '基层信访集中',
    description: '本月辖区信访量激增，有群众反映农村低保发放不公正，多人结伴前往县信访办投诉，已引起县委关注。',
    choices: [
      { text: '主动约谈信访群众，开展低保专项核查', meritChange: 20, moralChange: 8, gdpChange: 0, livelihoodChange: 10, ecologyChange: 0, businessChange: 0, description: '问题查实整改，群众满意度上升。' },
      { text: '安排专职干部接访，分类处理诉求', meritChange: 8, moralChange: 3, gdpChange: 0, livelihoodChange: 4, ecologyChange: 0, businessChange: 0, description: '部分诉求得到回应，信访量有所下降。' },
      { text: '要求村委会自行协调，劝阻群众上访', meritChange: -10, moralChange: -10, gdpChange: 0, livelihoodChange: -8, ecologyChange: 0, businessChange: 0, description: '群众情绪恶化，越级上访至市级。' },
    ],
  },
  {
    type: 'disaster',
    title: '农村道路塌方',
    description: '连日暴雨后，辖区一条通村主干道发生塌方，交通中断，数个村庄出行受阻，农产品滞销，村民怨声载道。',
    choices: [
      { text: '紧急申请修缮经费，组织机械抢修', meritChange: 18, moralChange: 4, gdpChange: -5, livelihoodChange: 12, ecologyChange: 0, businessChange: -3, description: '道路迅速恢复通行，群众拍手称快。' },
      { text: '上报灾情等待县级拨款，临时绕行方案', meritChange: 7, moralChange: 0, gdpChange: -8, livelihoodChange: 3, ecologyChange: 0, businessChange: -5, description: '等待期间农损较大，但流程规范。' },
      { text: '仅发布绕行通知，暂不修缮', meritChange: -5, moralChange: -5, gdpChange: -10, livelihoodChange: -8, ecologyChange: 0, businessChange: -8, description: '村民强烈不满，集体投诉。' },
    ],
  },
  {
    type: 'security',
    title: '乡镇企业安全事故',
    description: '辖区一家小型化工厂发生轻微泄漏事故，无人员伤亡，但周边居民恐慌，要求关停该厂，工厂主坚决反对，双方对峙。',
    choices: [
      { text: '立即启动安全核查，责令停产整改', meritChange: 15, moralChange: 6, gdpChange: -5, livelihoodChange: 5, ecologyChange: 8, businessChange: -8, description: '安全隐患消除，民众放心，厂主配合。' },
      { text: '组织第三方检测，依结果处理', meritChange: 10, moralChange: 3, gdpChange: -3, livelihoodChange: 3, ecologyChange: 3, businessChange: -3, description: '程序正当，双方接受结果。' },
      { text: '维持现状，以经济发展为由驳回诉求', meritChange: -8, moralChange: -10, gdpChange: 3, livelihoodChange: -10, ecologyChange: -8, businessChange: 5, description: '民众持续上访，媒体介入，舆情恶化。' },
    ],
  },
  {
    type: 'economic',
    title: '村级换届选举纠纷',
    description: '村委会换届选举过程中出现选票争议，落选候选人声称存在拉票行为，组织数十名村民聚集抗议，要求重新选举。',
    choices: [
      { text: '成立核查小组，重新核验全部选票', meritChange: 18, moralChange: 10, gdpChange: 0, livelihoodChange: 5, ecologyChange: 0, businessChange: 0, description: '选举公信力得到维护，群众信服。' },
      { text: '宣布选举结果有效，安抚落选方', meritChange: 5, moralChange: -3, gdpChange: 0, livelihoodChange: -3, ecologyChange: 0, businessChange: 0, description: '事件暂平息但留有隐患，双方存在隔阂。' },
      { text: '强行压制诉求，以扰乱秩序为由处置', meritChange: -12, moralChange: -15, gdpChange: 0, livelihoodChange: -10, ecologyChange: 0, businessChange: 0, description: '被上级纪委关注，涉嫌打压民主权利。' },
    ],
  },
  {
    type: 'disaster',
    title: '农田水利纠纷',
    description: '上游村庄截流导致下游农田干旱，双方村民爆发冲突，农业损失严重，需要协调用水分配。',
    isMajor: true,
    choices: [
      { text: '召集两村代表与水利部门联合协商，制定用水分配方案', meritChange: 35, moralChange: 8, gdpChange: 5, livelihoodChange: 15, ecologyChange: 5, businessChange: 0, description: '建立长效机制，两村矛盾彻底化解，农业生产恢复正常。' },
      { text: '依据水利法规强制执行均等分水', meritChange: 20, moralChange: 3, gdpChange: 0, livelihoodChange: 8, ecologyChange: 3, businessChange: 0, description: '冲突平息，但上游村不满，留有隐患。' },
      { text: '向上级推卸责任，要求县水利局处理', meritChange: -10, moralChange: -8, gdpChange: -5, livelihoodChange: -10, ecologyChange: -5, businessChange: 0, description: '被批评失职，农业损失持续扩大。' },
    ],
  },
];

// ─────────────────────────────────────────────
// 县处级（rank 4-6）
// ─────────────────────────────────────────────
const EVENTS_COUNTY: EventTemplate[] = [
  {
    type: 'economic',
    title: '招商引资项目流产',
    description: '一家承诺投资5亿元的企业突然宣布撤资，理由是营商环境不理想，相关报道被媒体转载，县委问责压力巨大。',
    choices: [
      { text: '主动约谈企业负责人，提供专项政策支持', meritChange: 20, moralChange: 3, gdpChange: 5, livelihoodChange: 3, ecologyChange: 0, businessChange: 15, description: '企业重新考量，达成意向协议。' },
      { text: '公开回应媒体，说明县域发展优势', meritChange: 8, moralChange: 0, gdpChange: 0, livelihoodChange: 0, ecologyChange: 0, businessChange: 5, description: '舆论压力缓解，但投资未能挽回。' },
      { text: '低调处理，暗中压制相关报道', meritChange: -10, moralChange: -12, gdpChange: -3, livelihoodChange: 0, ecologyChange: 0, businessChange: -5, description: '被更多媒体追问，舆情进一步恶化。' },
    ],
  },
  {
    type: 'security',
    title: '学校食品安全事故',
    description: '县城一所中学爆发集体食物中毒，共62名学生送医，家长聚集医院闹事，教育局和卫生局相互推诿，事态升级。',
    choices: [
      { text: '亲赴医院慰问并成立联合调查组，第一时间公开通报', meritChange: 25, moralChange: 10, gdpChange: 0, livelihoodChange: 10, ecologyChange: 0, businessChange: 0, description: '处置及时透明，家长情绪平稳，舆论正面。' },
      { text: '召开紧急会议协调各部门，对外低调处理', meritChange: 10, moralChange: 2, gdpChange: 0, livelihoodChange: 5, ecologyChange: 0, businessChange: 0, description: '事态平息但外界观感一般。' },
      { text: '要求教育局独立处理，保持距离', meritChange: -15, moralChange: -10, gdpChange: 0, livelihoodChange: -8, ecologyChange: 0, businessChange: 0, description: '被家长投诉不作为，省级媒体介入。' },
    ],
  },
  {
    type: 'corruption',
    title: '工厂排污举报',
    description: '辖区一家重点税源企业被群众举报长期偷排污水，环保部门核查属实，但该企业是县财政重要来源，县委内部意见分歧。',
    isMajor: true,
    choices: [
      { text: '召开常委会研究，依法依规责令停产整改', meritChange: 30, moralChange: 12, gdpChange: -8, livelihoodChange: 8, ecologyChange: 20, businessChange: -5, description: '法治形象确立，生态改善，长期营商环境受益。' },
      { text: '给予限期整改期限，暂不停产', meritChange: 12, moralChange: -3, gdpChange: 3, livelihoodChange: 0, ecologyChange: 5, businessChange: 5, description: '短期经济未受损，但环保问题未彻底解决。' },
      { text: '以经济利益为由压下不处理', meritChange: -20, moralChange: -20, gdpChange: 5, livelihoodChange: -5, ecologyChange: -15, businessChange: 3, description: '被省级环保督察组点名，面临问责。' },
    ],
  },
  {
    type: 'opinion',
    title: '旧城改造拆迁矛盾',
    description: '县城旧改项目拆迁工作中，有12户居民拒绝签约，声称补偿标准过低，引发网络关注，相关视频播放量过百万。',
    choices: [
      { text: '启动第三方评估，提高补偿标准，组织公开协商', meritChange: 22, moralChange: 8, gdpChange: 5, livelihoodChange: 8, ecologyChange: 0, businessChange: 8, description: '矛盾化解，项目推进，获民众认可。' },
      { text: '维持原方案，加强法律宣传耐心疏导', meritChange: 8, moralChange: -2, gdpChange: 3, livelihoodChange: 0, ecologyChange: 0, businessChange: 3, description: '部分居民接受，但舆论关注持续。' },
      { text: '强制推进拆迁，动用法律手段驱离', meritChange: -18, moralChange: -20, gdpChange: 8, livelihoodChange: -15, ecologyChange: 0, businessChange: 5, description: '引发大规模抗议，被媒体列为典型负面案例。' },
    ],
  },
  {
    type: 'corruption',
    title: '教育经费挪用举报',
    description: '县教育局一名科长被举报挪用上千万教育专项经费用于违规投资，相关证据已流出，家长群体情绪激愤。',
    isMajor: true,
    choices: [
      { text: '召开常委会，移送纪委立案，公开通报处理结果', meritChange: 40, moralChange: 15, gdpChange: 0, livelihoodChange: 10, ecologyChange: 0, businessChange: 0, description: '重拳反腐，赢得群众极大信任，上级通报表扬。' },
      { text: '内部核查，低调处理，避免舆论扩大', meritChange: 10, moralChange: -5, gdpChange: 0, livelihoodChange: 0, ecologyChange: 0, businessChange: 0, description: '短期平息，但被质疑包庇，留下隐患。' },
      { text: '以证据不足为由暂缓处理', meritChange: -25, moralChange: -25, gdpChange: 0, livelihoodChange: -8, ecologyChange: 0, businessChange: 0, description: '被上级纪委直接介入调查，连带问责。' },
    ],
  },
  {
    type: 'disaster',
    title: '县城内涝应急',
    description: '暴雨导致县城主城区严重内涝，多条主干道积水超1米，数百辆车被淹，群众强烈要求追责城市规划问题。',
    choices: [
      { text: '启动应急预案，亲赴现场统一指挥排涝', meritChange: 20, moralChange: 6, gdpChange: -5, livelihoodChange: 10, ecologyChange: -3, businessChange: -5, description: '处置高效，灾损降至最低，形象加分。' },
      { text: '协调城建局与气象局开展灾后评估', meritChange: 8, moralChange: 2, gdpChange: -8, livelihoodChange: 3, ecologyChange: -3, businessChange: -8, description: '处置平稳但缺乏担当形象。' },
      { text: '推责于规划局，要求追溯历史问题', meritChange: -8, moralChange: -8, gdpChange: -10, livelihoodChange: -8, ecologyChange: -5, businessChange: -10, description: '互相推诿，群众怒火高涨，媒体批评。' },
    ],
  },
];

// ─────────────────────────────────────────────
// 地厅级（rank 7-9）
// ─────────────────────────────────────────────
const EVENTS_CITY: EventTemplate[] = [
  {
    type: 'economic',
    title: 'GDP增速下滑',
    description: '本季度地区GDP增速跌破全省平均水平，排名落至倒数第三，省委主要领导点名要求市委书记赴省汇报情况。',
    choices: [
      { text: '召开经济分析会，推出针对性稳增长方案', meritChange: 25, moralChange: 3, gdpChange: 10, livelihoodChange: 5, ecologyChange: 0, businessChange: 8, description: '政策精准发力，下季度增速明显回升。' },
      { text: '赴省诚恳汇报，争取专项支持政策', meritChange: 12, moralChange: 0, gdpChange: 5, livelihoodChange: 0, ecologyChange: 0, businessChange: 5, description: '获得省级政策倾斜，形势逐步好转。' },
      { text: '以客观因素为由解释，请求延期考核', meritChange: -5, moralChange: -5, gdpChange: 0, livelihoodChange: 0, ecologyChange: 0, businessChange: 0, description: '省委对推责态度不满，问责压力持续。' },
    ],
  },
  {
    type: 'security',
    title: '跨县群体性事件',
    description: '两县交界处数百名农民因环境污染问题聚集抗议，人数持续增加，已有激进者冲击县政府大门，局势危急。',
    isMajor: true,
    choices: [
      { text: '召开市常委会研判形势，带队赴现场对话疏导，同步启动污染整治', meritChange: 40, moralChange: 10, gdpChange: -5, livelihoodChange: 12, ecologyChange: 15, businessChange: -5, description: '沉着应对，化解危机，省委批示表扬。' },
      { text: '启动应急预案，加派警力维稳，同步追责污染源', meritChange: 20, moralChange: 0, gdpChange: -3, livelihoodChange: 5, ecologyChange: 8, businessChange: -3, description: '局势控制，但被批评处置偏硬。' },
      { text: '等待省级介入，以超出权限为由推卸责任', meritChange: -30, moralChange: -15, gdpChange: -5, livelihoodChange: -10, ecologyChange: -5, businessChange: -5, description: '事态恶化，省委直接派工作组接管，严厉批评。' },
    ],
  },
  {
    type: 'security',
    title: '重大刑事案件',
    description: '市区发生一起持刀伤人案，造成3死5伤，案犯在逃，社会恐慌蔓延，媒体追问市委市政府的治安举措。',
    choices: [
      { text: '第一时间召开新闻发布会，宣布限期破案并强化巡逻部署', meritChange: 22, moralChange: 5, gdpChange: 0, livelihoodChange: 8, ecologyChange: 0, businessChange: -5, description: '48小时内告破，市民安心，形象大幅提升。' },
      { text: '全力配合公安侦破，对外保持低调', meritChange: 10, moralChange: 3, gdpChange: 0, livelihoodChange: 3, ecologyChange: 0, businessChange: -3, description: '案件告破，但社会安全感恢复慢。' },
      { text: '将压力完全转嫁给公安局，不予置评', meritChange: -10, moralChange: -8, gdpChange: 0, livelihoodChange: -8, ecologyChange: 0, businessChange: -8, description: '被批评推诿，公安系统士气受损。' },
    ],
  },
  {
    type: 'economic',
    title: '地区债务危机',
    description: '城投公司债务违约信号出现，评级机构下调地方信用评级，已有债权人登门催债，银行收紧授信，财政压力骤增。',
    isMajor: true,
    choices: [
      { text: '召开常委会研究化债方案，引入省级国有资本注资', meritChange: 35, moralChange: 5, gdpChange: -5, livelihoodChange: 3, ecologyChange: 0, businessChange: 5, description: '危机有序化解，信用评级恢复，省委给予充分肯定。' },
      { text: '组建化债工作组，争取债务展期协议', meritChange: 18, moralChange: 3, gdpChange: -8, livelihoodChange: 0, ecologyChange: 0, businessChange: -3, description: '短期风险缓释，但长期问题未解决。' },
      { text: '压制消息，避免债务问题公开扩散', meritChange: -25, moralChange: -18, gdpChange: -10, livelihoodChange: -5, ecologyChange: 0, businessChange: -10, description: '危机持续发酵，被省财政厅通报预警。' },
    ],
  },
  {
    type: 'corruption',
    title: '议政代表联名质询',
    description: '本市20名议政代表联名提出质询，指出市政工程建设存在系统性腐败嫌疑，相关质询材料已提交省议政院监督委。',
    isMajor: true,
    choices: [
      { text: '正式出席议政院会议作答，承诺启动独立核查并向省纪委汇报', meritChange: 38, moralChange: 15, gdpChange: 0, livelihoodChange: 8, ecologyChange: 0, businessChange: 0, description: '以负责任姿态回应监督，问题彻查，获省议政院肯定。' },
      { text: '组织内部审计，在议政院层面寻求解释', meritChange: 15, moralChange: 3, gdpChange: 0, livelihoodChange: 0, ecologyChange: 0, businessChange: 0, description: '代表暂时接受，但监督压力持续。' },
      { text: '以程序问题为由拖延答复时间', meritChange: -20, moralChange: -15, gdpChange: 0, livelihoodChange: -5, ecologyChange: 0, businessChange: 0, description: '被省议政院要求限时回应，舆论高度关注。' },
    ],
  },
  {
    type: 'economic',
    title: '省属重点企业亏损问责',
    description: '省政府直属一家在本市注册的国有企业连续三年亏损，省国资委要求市委协助展开问责，涉及市国资局官员多人。',
    choices: [
      { text: '积极配合省级调查，同步推动企业改革重组', meritChange: 18, moralChange: 8, gdpChange: -3, livelihoodChange: 3, ecologyChange: 0, businessChange: 3, description: '配合有力，省级肯定，企业走上正轨。' },
      { text: '配合调查的同时力争保留部分市级利益', meritChange: 8, moralChange: -3, gdpChange: 0, livelihoodChange: 0, ecologyChange: 0, businessChange: 0, description: '平稳过渡，但被批评立场不够坚定。' },
      { text: '以维稳为由拖延配合', meritChange: -15, moralChange: -12, gdpChange: -3, livelihoodChange: -3, ecologyChange: 0, businessChange: -5, description: '省国资委绕开市委直接处理，面子尽失。' },
    ],
  },
];

// ─────────────────────────────────────────────
// 副部省级（rank 10-11）
// ─────────────────────────────────────────────
const EVENTS_PROVINCE: EventTemplate[] = [
  {
    type: 'economic',
    title: '省级财政赤字警报',
    description: '本年度省级财政预计缺口达800亿元，土地财政收入大幅萎缩，社保资金压力骤增，国政院财政部已介入关注。',
    isMajor: true,
    choices: [
      { text: '召开省常委会研究压减非刚性支出，同步向财政部汇报化解方案', meritChange: 45, moralChange: 8, gdpChange: -5, livelihoodChange: -3, ecologyChange: 0, businessChange: 3, description: '方案获中央认可，财政压力有序化解，获通报表扬。' },
      { text: '向国政院申请专项转移支付缓解压力', meritChange: 22, moralChange: 2, gdpChange: -8, livelihoodChange: -5, ecologyChange: 0, businessChange: 0, description: '争取到部分支持，问题缓解但未根本解决。' },
      { text: '加快出让土地回笼资金，压缩民生支出', meritChange: -15, moralChange: -12, gdpChange: 5, livelihoodChange: -15, ecologyChange: -10, businessChange: 5, description: '被国政院发改委点名批评，社会矛盾加剧。' },
    ],
  },
  {
    type: 'disaster',
    title: '重大环境污染事故',
    description: '省内一条主要河流发生大规模工业污染，波及三个地级市，数百万人饮水受威胁，中央环保督察组已宣布进驻。',
    isMajor: true,
    choices: [
      { text: '省委紧急部署，启动省级应急预案，书记省长同赴现场', meritChange: 50, moralChange: 12, gdpChange: -8, livelihoodChange: 8, ecologyChange: 20, businessChange: -8, description: '处置有力，中央通报肯定，树立负责任省委形象。' },
      { text: '协调相关市县迅速处置，争取在督察进驻前自查整改', meritChange: 25, moralChange: 3, gdpChange: -5, livelihoodChange: 3, ecologyChange: 10, businessChange: -5, description: '整改态度积极，被督察组评为"边查边改"典型。' },
      { text: '延迟上报，试图在中央督察前掩盖污染规模', meritChange: -40, moralChange: -25, gdpChange: 0, livelihoodChange: -10, ecologyChange: -15, businessChange: -5, description: '督察组掌握证据，中央通报批评，主要领导被问责。' },
    ],
  },
  {
    type: 'corruption',
    title: '省内腐败窝案爆发',
    description: '省纪委查明，省内一个地级市多名官员涉及系统性腐败，案件牵涉人数超百人，中纪委已派驻调查组，社会震动极大。',
    isMajor: true,
    choices: [
      { text: '全力配合中纪委调查，省委主动向中央汇报，启动系统整治', meritChange: 55, moralChange: 20, gdpChange: -3, livelihoodChange: 5, ecologyChange: 0, businessChange: 0, description: '以零容忍态度赢得中央高度信任，成为全国廉政建设典范。' },
      { text: '配合调查同时稳定干部队伍，防止工作瘫痪', meritChange: 25, moralChange: 8, gdpChange: -3, livelihoodChange: 0, ecologyChange: 0, businessChange: 0, description: '处置稳妥，省级秩序维持，获中央肯定。' },
      { text: '以稳定大局为由要求调查组放缓节奏', meritChange: -35, moralChange: -25, gdpChange: 0, livelihoodChange: -5, ecologyChange: 0, businessChange: 0, description: '被中央认定妨碍调查，主要领导被约谈。' },
    ],
  },
  {
    type: 'security',
    title: '重大工程事故',
    description: '省重点基础设施项目发生坍塌事故，造成15人死亡，工程违规问题被曝光，国家安监局和住建部联合调查组进驻。',
    isMajor: true,
    choices: [
      { text: '立即停工全面排查，省级领导赴现场，追责违规参建方', meritChange: 40, moralChange: 10, gdpChange: -5, livelihoodChange: 5, ecologyChange: 0, businessChange: -5, description: '第一时间止损，调查组评价省委态度坚决，获通报肯定。' },
      { text: '配合调查，向遇难者家属充分赔偿，低调推进整改', meritChange: 20, moralChange: 5, gdpChange: -3, livelihoodChange: 3, ecologyChange: 0, businessChange: -3, description: '事态平稳处置，但省级监管漏洞被指出。' },
      { text: '优先推进工期，对外最小化事故定性', meritChange: -40, moralChange: -30, gdpChange: 3, livelihoodChange: -10, ecologyChange: 0, businessChange: 0, description: '被国家调查组定性为瞒报，主要领导被撤职处分。' },
    ],
  },
  {
    type: 'economic',
    title: '外资大规模撤离',
    description: '省内多家跨国企业宣布将生产基地迁往东南亚，涉及就业岗位超10万个，省内经济学家公开批评营商环境恶化。',
    isMajor: true,
    choices: [
      { text: '召开省营商环境紧急整治会，省长亲自约谈外资代表', meritChange: 38, moralChange: 5, gdpChange: 8, livelihoodChange: 5, ecologyChange: 0, businessChange: 20, description: '专项政策奏效，部分企业宣布暂缓撤离，营商信心回升。' },
      { text: '推出留商奖励政策，争取三年过渡期', meritChange: 18, moralChange: 0, gdpChange: 3, livelihoodChange: 0, ecologyChange: 0, businessChange: 10, description: '部分奏效，损失可控，但结构性问题未解决。' },
      { text: '以产业升级为名放任外资撤离', meritChange: -20, moralChange: -8, gdpChange: -10, livelihoodChange: -12, ecologyChange: 0, businessChange: -15, description: '就业大量流失，引发省内社会稳定问题。' },
    ],
  },
  {
    type: 'opinion',
    title: '省内重大群体性事件',
    description: '某市数千名工人因欠薪问题聚集，冲击市政府，现场警民对峙，事件在全国社交媒体引发广泛关注，中央高度重视。',
    isMajor: true,
    choices: [
      { text: '省委书记亲赴现场与工人代表对话，承诺7日内解决欠薪', meritChange: 50, moralChange: 15, gdpChange: -3, livelihoodChange: 15, ecologyChange: 0, businessChange: -3, description: '以担当化解危机，获中央高度评价，成全国样板。' },
      { text: '省政府迅速协调企业补发欠薪，同步维稳', meritChange: 22, moralChange: 5, gdpChange: -3, livelihoodChange: 8, ecologyChange: 0, businessChange: -3, description: '事件平息，舆论好转，但体制性问题待解。' },
      { text: '以警力强制清场，随后再谈赔偿', meritChange: -40, moralChange: -25, gdpChange: -3, livelihoodChange: -15, ecologyChange: 0, businessChange: -5, description: '激化矛盾，引发全国舆论强烈谴责，中央通报批评。' },
    ],
  },
];

// ─────────────────────────────────────────────
// 正部省级（rank 12-13）
// ─────────────────────────────────────────────
const EVENTS_MINISTRY: EventTemplate[] = [
  {
    type: 'economic',
    title: '部委政策执行重大争议',
    description: '主管部委推出一项新政策，引发全国多省市强烈反弹，数位省委书记联名致函国政院要求暂缓执行，政治风险极高。',
    isMajor: true,
    choices: [
      { text: '主动召集各省代表座谈，听取意见，提交国政院修订建议', meritChange: 50, moralChange: 10, gdpChange: 5, livelihoodChange: 8, ecologyChange: 0, businessChange: 10, description: '协调各方利益，政策优化后顺利推进，获总理批示表扬。' },
      { text: '坚持政策立场，选择性回应部分省份诉求', meritChange: 22, moralChange: 0, gdpChange: 3, livelihoodChange: 3, ecologyChange: 0, businessChange: 5, description: '政策推进，但地方摩擦持续。' },
      { text: '强势推行，压制异见声音', meritChange: -25, moralChange: -15, gdpChange: 0, livelihoodChange: -5, ecologyChange: 0, businessChange: -5, description: '被国政院叫停，主要领导被约谈批评。' },
    ],
  },
  {
    type: 'economic',
    title: '全国性行业系统性危机',
    description: '主管行业多家龙头企业同时陷入债务危机，牵涉数十万就业岗位和数千亿债务，国政院责成本部委提交三日内化解方案。',
    isMajor: true,
    choices: [
      { text: '组建跨部委应急专班，联合央行、发改委提出系统性化解方案', meritChange: 60, moralChange: 8, gdpChange: 8, livelihoodChange: 8, ecologyChange: 0, businessChange: 12, description: '方案获国政院批准，危机有序化解，部委获表彰。' },
      { text: '分批化解，优先保障就业，争取银行展期', meritChange: 30, moralChange: 3, gdpChange: 3, livelihoodChange: 5, ecologyChange: 0, businessChange: 5, description: '危机受控，国政院评价"处置合理"。' },
      { text: '寄希望于市场自我修复，延缓干预', meritChange: -40, moralChange: -15, gdpChange: -10, livelihoodChange: -10, ecologyChange: 0, businessChange: -12, description: '危机蔓延，国政院紧急派驻工作组，部委领导被问责。' },
    ],
  },
  {
    type: 'opinion',
    title: '重大外交摩擦',
    description: '主管部委发布的一份政策文件被多个国家解读为立场强硬，引发国际社会广泛争议，外交部向本部委施压要求澄清。',
    isMajor: true,
    choices: [
      { text: '主动与外交部协商，发布补充说明并开展外交沟通', meritChange: 45, moralChange: 8, gdpChange: 5, livelihoodChange: 3, ecologyChange: 0, businessChange: 8, description: '外交紧张消除，国际形象修复，获中央肯定。' },
      { text: '坚持政策解读，委托外交部处理国际舆论', meritChange: 15, moralChange: 0, gdpChange: 0, livelihoodChange: 0, ecologyChange: 0, businessChange: 0, description: '外交压力缓解，但摩擦未完全消除。' },
      { text: '拒绝修改立场，将责任推给对方国家误读', meritChange: -30, moralChange: -10, gdpChange: -5, livelihoodChange: -3, ecologyChange: 0, businessChange: -8, description: '外交局势升级，国政院被迫介入，本部委被批评处置不当。' },
    ],
  },
  {
    type: 'economic',
    title: '国有企业重组风波',
    description: '主管央企重组计划引发大规模员工抗议，工会发表公开声明，多家媒体追问重组是否存在国有资产流失，社会舆论沸腾。',
    isMajor: true,
    choices: [
      { text: '召开部委常委扩大会议，邀请职工代表参与讨论，公开透明推进重组', meritChange: 48, moralChange: 12, gdpChange: 5, livelihoodChange: 5, ecologyChange: 0, businessChange: 8, description: '重组方案优化，员工诉求吸纳，舆论转向正面，国政院通报表扬。' },
      { text: '加大安置补偿力度，快速推进重组', meritChange: 22, moralChange: 3, gdpChange: 5, livelihoodChange: -3, ecologyChange: 0, businessChange: 8, description: '效率优先，部分抗议平息，但舆论监督持续。' },
      { text: '强行推进，以维稳手段处理抗议', meritChange: -35, moralChange: -25, gdpChange: 3, livelihoodChange: -10, ecologyChange: 0, businessChange: 3, description: '引发全国性舆论批评，国政院介入处置，主要领导被约谈。' },
    ],
  },
  {
    type: 'opinion',
    title: '全国性社会舆论危机',
    description: '主管领域一起执法事件被拍摄并在网络广泛传播，质疑声浪迅速席卷全国，人民日报发表批评性评论，中枢宣传部约谈。',
    isMajor: true,
    choices: [
      { text: '第一时间认错，启动内部调查，责令违规人员停职', meritChange: 42, moralChange: 15, gdpChange: 0, livelihoodChange: 8, ecologyChange: 0, businessChange: 0, description: '坦诚担当，舆情快速平息，中央通报表扬处置得当。' },
      { text: '发表澄清声明，同步开展内部整顿', meritChange: 18, moralChange: 5, gdpChange: 0, livelihoodChange: 3, ecologyChange: 0, businessChange: 0, description: '危机可控，但外界对诚意存疑。' },
      { text: '以国家利益为由要求媒体撤稿，压制讨论', meritChange: -38, moralChange: -20, gdpChange: 0, livelihoodChange: -5, ecologyChange: 0, businessChange: 0, description: '引发更强烈反弹，中枢宣传部批评"处置失当"。' },
    ],
  },
  {
    type: 'economic',
    title: '科技领域国际封锁',
    description: '多国宣布联合封锁我国主管领域核心技术出口，涉及芯片、高端装备等关键环节，严重威胁产业链安全。',
    isMajor: true,
    choices: [
      { text: '召开部委紧急会议，启动国产替代攻关专项，联合发改委、财政部制定支持方案', meritChange: 55, moralChange: 8, gdpChange: -5, livelihoodChange: 3, ecologyChange: 0, businessChange: 8, description: '国产化攻关加速，中央高度肯定，部委获专项授权。' },
      { text: '通过外交和贸易谈判争取豁免，同步布局自主研发', meritChange: 28, moralChange: 3, gdpChange: 0, livelihoodChange: 0, ecologyChange: 0, businessChange: 5, description: '争取到部分缓冲时间，长期压力持续。' },
      { text: '以为时过早为由暂不启动国产替代，等待外交解决', meritChange: -28, moralChange: -10, gdpChange: -8, livelihoodChange: -5, ecologyChange: 0, businessChange: -10, description: '产业损失持续扩大，被国政院批评缺乏战略预判。' },
    ],
  },
];

// ─────────────────────────────────────────────
// 国家级（rank 14-15）
// ─────────────────────────────────────────────
const EVENTS_NATIONAL: EventTemplate[] = [
  {
    type: 'economic',
    title: '国际贸易战升级',
    description: '主要贸易伙伴宣布对我国商品加征高额关税，涉及金额超2万亿人民币，出口企业告急，就业冲击迅速显现，全球市场剧烈波动。',
    isMajor: true,
    choices: [
      { text: '召开中枢决策常委会紧急会议，发布反制清单同步启动多边磋商', meritChange: 60, moralChange: 8, gdpChange: 8, livelihoodChange: 5, ecologyChange: 0, businessChange: 15, description: '精准反制赢得主动，国际社会多方斡旋，危机有序化解，历史性外交胜利。' },
      { text: '先谈判争取缓冲期，同步扩大内需拉动增长', meritChange: 35, moralChange: 3, gdpChange: 3, livelihoodChange: 8, ecologyChange: 0, businessChange: 5, description: '损失可控，经济结构获得调整契机。' },
      { text: '保持克制，以静制动，寄望对方主动让步', meritChange: -25, moralChange: -8, gdpChange: -12, livelihoodChange: -8, ecologyChange: 0, businessChange: -15, description: '对方加大施压，经济损失持续扩大，国内批评声浪高涨。' },
    ],
  },
  {
    type: 'economic',
    title: '金融系统性风险',
    description: '国内多家大型商业银行同时出现流动性紧张，资本市场单日跌幅超8%，外资持续流出，央行向国政院紧急报告，触发系统性金融风险预警。',
    isMajor: true,
    choices: [
      { text: '召集央行、金融监管总局、财政部负责人联席研判，启动历史级别流动性注入', meritChange: 65, moralChange: 8, gdpChange: 10, livelihoodChange: 5, ecologyChange: 0, businessChange: 12, description: '危机48小时内受控，金融市场平稳，成功阻断系统性风险传导，载入政策史册。' },
      { text: '定向向问题机构注资，引导市场预期', meritChange: 35, moralChange: 3, gdpChange: 5, livelihoodChange: 3, ecologyChange: 0, businessChange: 8, description: '危机缓释，市场信心部分恢复。' },
      { text: '相信市场自我纠偏机制，暂不干预', meritChange: -45, moralChange: -15, gdpChange: -15, livelihoodChange: -10, ecologyChange: 0, businessChange: -18, description: '危机全面爆发，经济陷入衰退，历史性失职。' },
    ],
  },
  {
    type: 'disaster',
    title: '全国性重大自然灾害',
    description: '强烈地震波及五省，数百万人受灾，基础设施大规模受损，国际社会高度关注，救援物资和人力调配面临空前挑战。',
    isMajor: true,
    choices: [
      { text: '宣布进入国家紧急状态，统一调度全军及国家救援体系全力驰援', meritChange: 65, moralChange: 20, gdpChange: -5, livelihoodChange: 20, ecologyChange: -5, businessChange: -5, description: '救援创历史最快响应纪录，全国凝聚，国际高度赞誉，赢得史诗级政治信任。' },
      { text: '协调各省救援力量并行驰援，国政院成立前线指挥部', meritChange: 38, moralChange: 12, gdpChange: -8, livelihoodChange: 12, ecologyChange: -8, businessChange: -8, description: '救援有序，数十万人获救，获国际社会高度肯定。' },
      { text: '按常规程序逐级汇报处置，等待详细灾情评估', meritChange: -30, moralChange: -20, gdpChange: -10, livelihoodChange: -20, ecologyChange: -10, businessChange: -10, description: '救援黄金时间丧失，伤亡人数激增，成为历史性过失。' },
    ],
  },
  {
    type: 'security',
    title: '国家安全重大危机',
    description: '境外情报机构渗透国家核心机构的案件被证实，涉及国防与科技领域多个部门，国际舆论高度关注，内部整肃需要在维稳与效率间抉择。',
    isMajor: true,
    choices: [
      { text: '召集国家安全委员会全体会议，启动全面排查与系统性安全升级', meritChange: 58, moralChange: 12, gdpChange: -3, livelihoodChange: 3, ecologyChange: 0, businessChange: -5, description: '渗透网络彻底清除，安全体系系统升级，国家核心能力大幅强化。' },
      { text: '分步骤精准清查，将干扰降至最低', meritChange: 32, moralChange: 6, gdpChange: -3, livelihoodChange: 0, ecologyChange: 0, businessChange: -3, description: '威胁清除，运转稳定，但国际舆论持续施压。' },
      { text: '低调内部处置，对外否认危机存在', meritChange: -35, moralChange: -20, gdpChange: -3, livelihoodChange: -3, ecologyChange: 0, businessChange: -5, description: '信息泄露后引发更大信任危机，国家安全委员会要求问责。' },
    ],
  },
  {
    type: 'economic',
    title: '重大科技战略决策',
    description: '国家科学院提交报告：人工智能与量子计算领域中美差距持续拉大，建议实施"举国体制"专项攻关，需国政院拍板定向投入万亿级资源。',
    isMajor: true,
    choices: [
      { text: '常委会全体研究通过，发布国家科技战略新纲领，组建国家实验室集群', meritChange: 62, moralChange: 6, gdpChange: 8, livelihoodChange: 5, ecologyChange: 0, businessChange: 12, description: '举国科技攻关开局，十年后缩小关键差距，成为时代性战略决策。' },
      { text: '试点部分领域先行，评估后再全面推进', meritChange: 30, moralChange: 3, gdpChange: 3, livelihoodChange: 3, ecologyChange: 0, businessChange: 5, description: '稳健推进，但与最佳窗口期存在差距。' },
      { text: '以财政压力为由搁置，等待市场资本主导', meritChange: -30, moralChange: -8, gdpChange: -5, livelihoodChange: -3, ecologyChange: 0, businessChange: -8, description: '差距进一步扩大，被学界批评错失战略窗口期。' },
    ],
  },
  {
    type: 'opinion',
    title: '宪法修正草案重大争议',
    description: '全国议政院法律委员会提交宪法修正草案，涉及土地制度与公民数据权利章节引发社会广泛讨论，学界、媒体、地方代表意见高度分歧。',
    isMajor: true,
    choices: [
      { text: '召开多轮立法听证会，广泛听取各方意见，修订完善后提交全国议政院审议', meritChange: 58, moralChange: 15, gdpChange: 3, livelihoodChange: 8, ecologyChange: 0, businessChange: 3, description: '立法过程开放透明，草案质量大幅提升，全国议政院高票通过，成为宪政典范。' },
      { text: '小范围修改争议条款后提交审议', meritChange: 28, moralChange: 5, gdpChange: 0, livelihoodChange: 3, ecologyChange: 0, businessChange: 0, description: '顺利推进，但部分争议延续。' },
      { text: '坚持原稿，压制异见声音，强行推进审议', meritChange: -35, moralChange: -20, gdpChange: 0, livelihoodChange: -8, ecologyChange: 0, businessChange: 0, description: '引发全社会强烈反响，被认为破坏立法民主化进程，历史评价极差。' },
    ],
  },
];

/**
 * 按玩家职级返回事件模板池
 * rank 1-3  → 乡镇级
 * rank 4-6  → 县处级
 * rank 7-9  → 地厅级
 * rank 10-11→ 副部省级
 * rank 12-13→ 正部省级
 * rank 14-15→ 国家级
 */
function getPoolForRank(rankLevel: number): EventTemplate[] {
  if (rankLevel <= 3) return EVENTS_TOWN;
  if (rankLevel <= 6) return EVENTS_COUNTY;
  if (rankLevel <= 9) return EVENTS_CITY;
  if (rankLevel <= 11) return EVENTS_PROVINCE;
  if (rankLevel <= 13) return EVENTS_MINISTRY;
  return EVENTS_NATIONAL;
}

/** 按职级随机获取一个事件模板 */
export function getRandomEvent(rankLevel = 1): EventTemplate {
  const pool = getPoolForRank(rankLevel);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** 按职级随机获取一个重大事件（isMajor=true） */
export function getRandomMajorEvent(rankLevel = 1): EventTemplate {
  const pool = getPoolForRank(rankLevel).filter(e => e.isMajor);
  if (pool.length === 0) return getRandomEvent(rankLevel);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** 按职级随机获取一个普通事件（isMajor=false 或未设置） */
export function getRandomMinorEvent(rankLevel = 1): EventTemplate {
  const pool = getPoolForRank(rankLevel).filter(e => !e.isMajor);
  if (pool.length === 0) return getRandomEvent(rankLevel);
  return pool[Math.floor(Math.random() * pool.length)];
}
```

<a id="srclibfactionexpansionts"></a>
## `src/lib/factionExpansion.ts`

```typescript
// 派系系统 v6 扩展玩法：声望经济 / 暗线举报 / 周期功绩分红
// 全部为纯函数（无副作用），数值走配置对象，复用现有 factionInfluence / riskValue / factionIntelligence 等字段
import type { FactionId, PlayerSave } from '@/types/game';
import { getRelationFromSave } from '@/lib/factionSystem';
import { calcFactionPower } from '@/lib/provinceSeatSystem';

// ═══════════════════════════════════════════════════════════════
// §配置对象（唯一数值出口，禁止在业务函数硬编码）
// ═══════════════════════════════════════════════════════════════

/** A. 声望经济：用影响力兑换短期增益 */
export const PRESTIGE_ECONOMY = {
  // 兑换一次「失势豁免」：消耗影响力，获得 1 次豁免次数（使用时抵消一次失势冻结）
  immunity: {
    influenceCost: 25,   // 消耗影响力
    cooldownDays: 365,   // 冷却天数
    cooldownKey: 'prestige_immunity',
  },
  // 兑换「加速争夺冷却」：消耗影响力，把个人职位战冷却缩短指定天数
  accelerate: {
    influenceCost: 15,   // 消耗影响力
    shortenDays: 30,     // 缩短的天数
    cooldownDays: 180,   // 冷却天数
    cooldownKey: 'prestige_accelerate',
  },
} as const;

/** B. 暗线举报/纪检：削弱对手派系斗争力 */
export const INFORM_REPORT = {
  /** 对手派系斗争力达到此阈值才可发起举报（异常高） */
  powerThreshold: 70,
  /** 举报成功削弱对手派系实力的幅度（直接降低其关系值） */
  weakenRelation: -15,
  /** 举报成功后自身获得的情报增益 */
  intelGain: 8,
  /** 举报成功后获得的功绩奖励 */
  meritReward: 30,
  /** 举报暴露（失败）时的风险值增加 */
  exposureRiskAdd: 15,
  /** 举报暴露（失败）时本派关系损失 */
  exposureRelPenalty: -10,
  /** 举报基础暴露概率 */
  baseExposureProb: 0.35,
  /** 每点情报降低的暴露概率 */
  intelExposureReductionPerPoint: 0.004,
  /** 暴露概率下限 */
  minExposureProb: 0.1,
  /** 举报冷却天数 */
  cooldownDays: 365,
  cooldownKey: 'inform_report',
} as const;

/** D. 周期结算功绩分红 */
export const CYCLE_DIVIDEND = {
  /** 每赢下一次职位争夺的基础功绩分红 */
  perContestWinMerit: 40,
  /** 派系整体胜的额外功绩分红 */
  factionWinMeritBonus: 60,
  /** 派系整体胜的影响力分红 */
  factionWinInfluenceBonus: 10,
  /** 分红影响力上限 */
  maxInfluence: 100,
} as const;

// ═══════════════════════════════════════════════════════════════
// A. 声望经济
// ═══════════════════════════════════════════════════════════════

export interface PrestigeResult {
  ok: boolean;
  message: string;
  updates: Partial<PlayerSave>;
}

/** 兑换一次失势豁免 */
export function buySetbackImmunity(save: PlayerSave, day: number): PrestigeResult {
  const cfg = PRESTIGE_ECONOMY.immunity;
  const cd = save.factionCooldowns ?? {};
  if ((cd[cfg.cooldownKey] ?? 0) > day) {
    return { ok: false, message: `失势豁免冷却中（剩 ${(cd[cfg.cooldownKey] ?? 0) - day} 天）`, updates: {} };
  }
  if ((save.factionInfluence ?? 0) < cfg.influenceCost) {
    return { ok: false, message: `影响力不足（需 ${cfg.influenceCost}，当前 ${save.factionInfluence ?? 0}）`, updates: {} };
  }
  return {
    ok: true,
    message: `✓ 已兑换一次失势豁免（影响力−${cfg.influenceCost}），下次失势可抵消冻结`,
    updates: {
      factionInfluence: (save.factionInfluence ?? 0) - cfg.influenceCost,
      setbackImmunity: (save.setbackImmunity ?? 0) + 1,
      factionCooldowns: { ...cd, [cfg.cooldownKey]: day + cfg.cooldownDays },
    },
  };
}

/** 兑换加速争夺冷却（缩短个人职位战冷却） */
export function buyAccelerateContest(save: PlayerSave, day: number): PrestigeResult {
  const cfg = PRESTIGE_ECONOMY.accelerate;
  const cd = save.factionCooldowns ?? {};
  if ((cd[cfg.cooldownKey] ?? 0) > day) {
    return { ok: false, message: `加速冷却中（剩 ${(cd[cfg.cooldownKey] ?? 0) - day} 天）`, updates: {} };
  }
  if ((save.factionInfluence ?? 0) < cfg.influenceCost) {
    return { ok: false, message: `影响力不足（需 ${cfg.influenceCost}，当前 ${save.factionInfluence ?? 0}）`, updates: {} };
  }
  const cur = save.personalContestCooldownUntil ?? 0;
  // 仅当当前存在冷却时才有意义
  if (cur <= day) {
    return { ok: false, message: '当前无个人职位战冷却，无需加速', updates: {} };
  }
  return {
    ok: true,
    message: `✓ 争夺冷却已加速（缩短 ${cfg.shortenDays} 天），影响力−${cfg.influenceCost}`,
    updates: {
      factionInfluence: (save.factionInfluence ?? 0) - cfg.influenceCost,
      personalContestCooldownUntil: Math.max(day, cur - cfg.shortenDays),
      factionCooldowns: { ...cd, [cfg.cooldownKey]: day + cfg.cooldownDays },
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// B. 暗线举报/纪检
// ═══════════════════════════════════════════════════════════════

export interface InformResult {
  ok: boolean;
  message: string;
  updates: Partial<PlayerSave>;
}

/** 计算举报某对手派系的暴露概率 */
export function getInformExposureProb(save: PlayerSave): number {
  const intel = save.factionIntelligence ?? 0;
  const prob = INFORM_REPORT.baseExposureProb - intel * INFORM_REPORT.intelExposureReductionPerPoint;
  return Math.max(INFORM_REPORT.minExposureProb, prob);
}

/** 判断某派系斗争力是否异常高（可举报） */
export function isFactionReportable(save: PlayerSave, faction: FactionId): boolean {
  return calcFactionPower(save, faction) >= INFORM_REPORT.powerThreshold;
}

/**
 * 对指定对手派系发起暗线举报。
 * - 成功：削弱对方关系值、自身获得情报与功绩
 * - 暴露：风险值上升、本派关系受损
 * 使用确定性伪随机（day + faction hash），保证可复现。
 */
export function attemptInformReport(
  save: PlayerSave,
  targetFaction: FactionId,
  day: number,
): InformResult {
  const cfg = INFORM_REPORT;
  const cd = save.factionCooldowns ?? {};
  if ((cd[cfg.cooldownKey] ?? 0) > day) {
    return { ok: false, message: `举报冷却中（剩 ${(cd[cfg.cooldownKey] ?? 0) - day} 天）`, updates: {} };
  }
  if (!isFactionReportable(save, targetFaction)) {
    return { ok: false, message: '该派系斗争力未达异常阈值，暂无举报价值', updates: {} };
  }

  const prob = getInformExposureProb(save);
  // 确定性伪随机
  let seed = day;
  for (const c of targetFaction) seed = ((seed << 5) - seed + c.charCodeAt(0)) >>> 0;
  const rand = ((seed * 1664525 + 1013904223) >>> 0) / 0xffffffff;
  const exposed = rand < prob;

  const relations = getRelationFromSave(save);
  const baseUpdates: Partial<PlayerSave> = {
    factionCooldowns: { ...cd, [cfg.cooldownKey]: day + cfg.cooldownDays },
  };

  if (!exposed) {
    // 成功：削弱对手关系值
    const cur = relations[targetFaction] ?? 0;
    return {
      ok: true,
      message: `✓ 举报成功！削弱${targetFaction}派实力（关系${cfg.weakenRelation}），情报+${cfg.intelGain}，功绩+${cfg.meritReward}`,
      updates: {
        ...baseUpdates,
        [relField(targetFaction)]: Math.max(0, cur + cfg.weakenRelation),
        factionIntelligence: Math.min(100, (save.factionIntelligence ?? 0) + cfg.intelGain),
        meritPoints: (save.meritPoints ?? 0) + cfg.meritReward,
      },
    };
  }

  // 暴露
  const primary = save.primaryFaction as FactionId | '';
  const primaryCur = primary ? relations[primary] ?? 0 : 0;
  return {
    ok: false,
    message: `⚠ 举报暴露！风险值+${cfg.exposureRiskAdd}，本派关系${cfg.exposureRelPenalty}`,
    updates: {
      ...baseUpdates,
      riskValue: Math.min(100, (save.riskValue ?? 0) + cfg.exposureRiskAdd),
      ...(primary ? { [relField(primary)]: Math.max(0, primaryCur + cfg.exposureRelPenalty) } : {}),
    },
  };
}

/** relation 字段名映射（与 factionSystem.relFieldOf 一致，避免循环依赖） */
function relField(faction: FactionId): string {
  switch (faction) {
    case 'reform':    return 'reformFaction';
    case 'pragmatic': return 'pragmaticFaction';
    case 'cyl':       return 'cylRelation';
    case 'techno':    return 'technoRelation';
    default:          return 'localRelation';
  }
}

// ═══════════════════════════════════════════════════════════════
// D. 周期结算功绩分红
// ═══════════════════════════════════════════════════════════════

export interface DividendResult {
  merit: number;
  influence: number;
  message: string;
  updates: Partial<PlayerSave>;
}

/**
 * 周期结算时按本周期贡献发放功绩/声望分红。
 * @param factionWin 本周期派系是否整体胜出
 * @returns 分红结果与需写入的存档更新（含 cycleContestWins/cycleContribution 清零）
 */
export function settleCycleDividend(save: PlayerSave, factionWin: boolean): DividendResult {
  const cfg = CYCLE_DIVIDEND;
  const wins = save.cycleContestWins ?? 0;
  const merit = wins * cfg.perContestWinMerit + (factionWin ? cfg.factionWinMeritBonus : 0);
  const influence = factionWin ? cfg.factionWinInfluenceBonus : 0;
  const influenceCapped = Math.min(cfg.maxInfluence, (save.factionInfluence ?? 0) + influence);

  const parts: string[] = [];
  if (wins > 0) parts.push(`赢下 ${wins} 次争夺，功绩+${wins * cfg.perContestWinMerit}`);
  if (factionWin) parts.push(`派系整体胜，额外功绩+${cfg.factionWinMeritBonus}、影响力+${cfg.factionWinInfluenceBonus}`);
  const message = parts.length > 0
    ? `💰 周期功绩分红：${parts.join('；')}`
    : '💰 本周期无争夺贡献，无分红';

  return {
    merit,
    influence: influence,
    message,
    updates: {
      cycleContestWins: 0,
      cycleContribution: 0,
      meritPoints: (save.meritPoints ?? 0) + merit,
      factionInfluence: influenceCapped,
    },
  };
}

/** 记录一次职位争夺胜利（供 applyContestWin 调用方累加） */
export function bumpCycleContestWin(save: PlayerSave): Partial<PlayerSave> {
  return {
    cycleContestWins: (save.cycleContestWins ?? 0) + 1,
    cycleContribution: (save.cycleContribution ?? 0) + 1,
  };
}
```

<a id="srclibfactiongameplayts"></a>
## `src/lib/factionGameplay.ts`

```typescript
// 派系玩法扩展模块（§二：三类玩法 + 六限制）
// generateMandates / applyMandateComplete / applyMandateReject
// attemptCovertOp / canDefect / applyDefection
// 六条限制谓词：R1~R6
import {
  ALL_FACTIONS,
  type FactionId,
  type PlayerSave,
  type FactionMandate,
  type CovertOpRecord,
} from '@/types/game';
import {
  FACTION_RELATION_MATRIX,
  getRepLevel,
  applyRelDeltaToSave,
  getRelationFromSave,
} from '@/lib/factionSystem';
import { nanoid } from '@/lib/nanoid';

// ── 配置常量（统一导出，不在业务函数硬编码）─────────────────────
export const COVERT_MERIT_COST      = 50;    // 密谋每次花费政绩点
export const DEFECT_MERIT_COST      = 100;   // 叛逃花费政绩点
export const MANDATE_MERIT_REWARD_MIN = 25;  // 完成委托最低奖励
export const MANDATE_MERIT_REWARD_MAX = 35;  // 完成委托最高奖励
export const MANDATE_REJECT_COOLDOWN  = 90;  // 拒绝委托冷却天数
export const DEFECT_COOLDOWN_DAYS     = 365; // 叛逃冷却天数
export const EXPOSURE_CASE_THRESHOLD  = 3;   // 累计暴露次数触发立案
export const EXPOSURE_RISK_ADD        = 12;  // 暴露时风险值增加
export const EXPOSURE_RELATION_PENALTY = 8;  // 暴露时本派关系损失
export const COVERT_BASE_DISCOVERY    = 0.15; // 密谋基础暴露概率
export const DEFECT_NEW_BASE_RELATION = 40;  // 叛逃后新派基线关系
export const DEFECT_OLD_RELATION_FLOOR = 20; // 叛逃后旧派关系下限
export const DEFECT_INFLUENCE_PENALTY = 20;  // 叛逃影响力损失

// ── 任期轮岗限制（R5） ────────────────────────────────────────────
export const POSITION_TERM_LIMIT = 3; // 同职位连任超过此届数强制轮岗

// ──────────────────────────────────────────────────────────────────
// A. 派系委托
// ──────────────────────────────────────────────────────────────────

/** 按派系叙事底色的委托模板 */
const MANDATE_TEMPLATES: Record<FactionId, { title: string; desc: string; reward: FactionMandate['reward']; penalty: FactionMandate['penalty'] }[]> = {
  reform: [
    {
      title: '推进开发区改革',
      desc: '协助本派在辖区推行开发区体制改革试点，吸引外资企业落地。',
      reward: { relation: 5, influence: 8, treasury: 50, merit: 0 },
      penalty: { relation: -8 },
    },
    {
      title: '简政放权调研报告',
      desc: '撰写简政放权实施情况调研报告，为本派提供政策弹药。',
      reward: { relation: 3, influence: 5, treasury: 30, merit: 0 },
      penalty: { relation: -5 },
    },
  ],
  pragmatic: [
    {
      title: '意识形态教育专项',
      desc: '在辖区开展意识形态工作专项检查，强化党的集中统一领导。',
      reward: { relation: 6, influence: 7, treasury: 40, merit: 0 },
      penalty: { relation: -8 },
    },
    {
      title: '国企改革阻滞评估',
      desc: '评估本地国企改革中存在的"去国有化"倾向，提交本派内参。',
      reward: { relation: 4, influence: 6, treasury: 35, merit: 0 },
      penalty: { relation: -6 },
    },
  ],
  cyl: [
    {
      title: '青年干部培训营',
      desc: '组织辖区团干部参加本派主导的青年干部培训营，扩大团系基础。',
      reward: { relation: 5, influence: 6, treasury: 30, merit: 0 },
      penalty: { relation: -7 },
    },
    {
      title: '民生调研走基层',
      desc: '赴偏远乡镇走访调研，形成民生保障专项报告上报本派核心。',
      reward: { relation: 4, influence: 7, treasury: 25, merit: 0 },
      penalty: { relation: -5 },
    },
  ],
  techno: [
    {
      title: '数字政务试点',
      desc: '推动本辖区数字政务平台建设，为本派数字化治理议题提供示范。',
      reward: { relation: 5, influence: 8, treasury: 45, merit: 0 },
      penalty: { relation: -8 },
    },
    {
      title: '科创园区引进计划',
      desc: '主导引进两家以上高科技企业，完成本派产业升级战略部署。',
      reward: { relation: 6, influence: 7, treasury: 40, merit: 0 },
      penalty: { relation: -7 },
    },
  ],
  local: [
    {
      title: '土地资源协调',
      desc: '为本派关联企业协调土地指标，务必低调操作，不留书面痕迹。',
      reward: { relation: 7, influence: 6, treasury: 60, merit: 0 },
      penalty: { relation: -10 },
    },
    {
      title: '地方人事安排',
      desc: '在下一轮换届中为本派推荐人员创造有利条件，巩固地方基础。',
      reward: { relation: 5, influence: 5, treasury: 35, merit: 0 },
      penalty: { relation: -8 },
    },
  ],
};

/**
 * 生成本政治年的派系委托（每 365 天刷新 1~2 条）。
 * @returns Partial<PlayerSave> 可合并入 updateSave
 */
export function generateMandates(save: PlayerSave): Partial<PlayerSave> {
  const fid = save.primaryFaction as FactionId | '';
  if (!fid) return {};

  const currentYear = Math.floor(save.gameDays / 365);
  // 本年已生成则不重复
  if ((save.lastMandateYear ?? -1) >= currentYear) return {};

  const templates = MANDATE_TEMPLATES[fid as FactionId] ?? [];
  if (templates.length === 0) return {};

  // 生成 1~2 条（确定性：gameDays 末位奇偶决定数量）
  const count = currentYear % 2 === 0 ? 1 : 2;
  const newMandates: FactionMandate[] = [];
  for (let i = 0; i < Math.min(count, templates.length); i++) {
    const tpl = templates[i];
    newMandates.push({
      id:      nanoid(),
      faction: fid as FactionId,
      title:   tpl.title,
      desc:    tpl.desc,
      reward:  { ...tpl.reward, merit: 0 }, // merit 在完成时随机填入
      penalty: { ...tpl.penalty },
      status:  'active',
      year:    currentYear,
    });
  }

  // 保留未完成的旧委托 + 新委托（最多保留 4 条）
  const existing = (save.factionMandates ?? []).filter(m => m.status === 'active');
  const merged = [...existing, ...newMandates].slice(0, 4);

  return {
    factionMandates: merged,
    lastMandateYear: currentYear,
  };
}

/**
 * 完成委托：给本派关系/影响力/经费池/meritPoints 加成。
 * merit 奖励随机 25~35（根据 mandate id hash 确定性）
 */
export function applyMandateComplete(
  save: PlayerSave,
  mandateId: string,
): Partial<PlayerSave> {
  const mandates = save.factionMandates ?? [];
  const idx = mandates.findIndex(m => m.id === mandateId && m.status === 'active');
  if (idx < 0) return {};

  const m = mandates[idx];
  const fid = m.faction;

  // 确定性 merit 奖励
  let hash = 0;
  for (const c of mandateId) hash = ((hash << 5) - hash + c.charCodeAt(0)) >>> 0;
  const meritReward = MANDATE_MERIT_REWARD_MIN + (hash % (MANDATE_MERIT_REWARD_MAX - MANDATE_MERIT_REWARD_MIN + 1));

  // 更新委托列表
  const updated = [...mandates];
  updated[idx] = { ...m, reward: { ...m.reward, merit: meritReward }, status: 'done' };

  // 关系增量
  const relDelta = applyRelDeltaToSave(save, fid, m.reward.relation);

  // 经费池更新
  const treasury = { ...(save.factionTreasury ?? {}) } as Record<FactionId, number>;
  treasury[fid] = (treasury[fid] ?? 0) + m.reward.treasury;

  return {
    factionMandates:  updated,
    factionInfluence: Math.min(100, (save.factionInfluence ?? 0) + m.reward.influence),
    meritPoints:      Math.round((save.meritPoints ?? 0) + meritReward),
    factionTreasury:  treasury,
    ...relDelta,
  };
}

/**
 * 拒绝委托：仅关系惩罚 + 进入 90 天冷却。
 */
export function applyMandateReject(
  save: PlayerSave,
  mandateId: string,
  day: number,
): Partial<PlayerSave> {
  const mandates = save.factionMandates ?? [];
  const idx = mandates.findIndex(m => m.id === mandateId && m.status === 'active');
  if (idx < 0) return {};

  const m = mandates[idx];
  const updated = [...mandates];
  updated[idx] = { ...m, status: 'rejected' };

  const relDelta = applyRelDeltaToSave(save, m.faction, m.penalty.relation);

  return {
    factionMandates:               updated,
    mandateRejectCooldownUntilDay: day + MANDATE_REJECT_COOLDOWN,
    ...relDelta,
  };
}

// ──────────────────────────────────────────────────────────────────
// B. 密谋行动
// ──────────────────────────────────────────────────────────────────

/** 获取密谋暴露概率（isFlagged 时 ×1.5） */
function getDiscoveryProbability(save: PlayerSave): number {
  const base = COVERT_BASE_DISCOVERY + (save.covertExposedCount ?? 0) * 0.03;
  const flagged = save.isFlagged ? 1.5 : 1;
  return Math.min(0.95, base * flagged);
}

/**
 * 执行密谋行动。
 * @param type  行动类型
 * @param targetFaction 针对的目标派系
 * @param day  当前游戏天
 * @returns { updates: Partial<PlayerSave>; exposed: boolean; message: string }
 */
export function attemptCovertOp(
  save: PlayerSave,
  type: CovertOpRecord['type'],
  targetFaction: FactionId,
  day: number,
): { updates: Partial<PlayerSave>; exposed: boolean; message: string } {
  // 政绩点不足
  if ((save.meritPoints ?? 0) < COVERT_MERIT_COST) {
    return {
      updates: {},
      exposed: false,
      message: `政绩点不足（需 ${COVERT_MERIT_COST}，当前 ${save.meritPoints ?? 0}）`,
    };
  }

  const discoveryProb = getDiscoveryProbability(save);
  // 确定性伪随机（day + type hash）
  let seed = day;
  for (const c of type) seed = ((seed << 5) - seed + c.charCodeAt(0)) >>> 0;
  const rand = ((seed * 1664525 + 1013904223) >>> 0) / 0xffffffff;
  const exposed = rand < discoveryProb;

  const record: CovertOpRecord = { id: nanoid(), type, targetFaction, exposed, day };
  const baseUpdates: Partial<PlayerSave> = {
    meritPoints: Math.max(0, (save.meritPoints ?? 0) - COVERT_MERIT_COST),
  };

  if (!exposed) {
    // 成功：对目标派系施加轻微关系损伤（叙事层面）
    const relDelta = applyRelDeltaToSave(save, targetFaction, -3);
    return {
      updates: { ...baseUpdates, ...relDelta },
      exposed: false,
      message: `密谋（${type}）成功，对${targetFaction}派施加影响`,
    };
  } else {
    // 暴露处理
    const newExposed   = (save.covertExposedCount ?? 0) + 1;
    const triggerCase  = newExposed >= EXPOSURE_CASE_THRESHOLD;
    const relDelta     = applyRelDeltaToSave(save, save.primaryFaction as FactionId, -EXPOSURE_RELATION_PENALTY);

    return {
      updates: {
        ...baseUpdates,
        ...relDelta,
        riskValue:         Math.min(100, (save.riskValue ?? 0) + EXPOSURE_RISK_ADD),
        covertExposedCount: newExposed,
        isFlagged:          triggerCase ? true : save.isFlagged,
        caseStartDay:       triggerCase && !save.isFlagged ? day : save.caseStartDay,
      },
      exposed: true,
      message: triggerCase
        ? `⚠ 密谋曝光！累计暴露 ${newExposed} 次，纪委已启动立案审查`
        : `密谋暴露！风险值+${EXPOSURE_RISK_ADD}，本派关系-${EXPOSURE_RELATION_PENALTY}`,
    };
  }
}

// ──────────────────────────────────────────────────────────────────
// C. 叛逃换系
// ──────────────────────────────────────────────────────────────────

/** 叛逃前置校验，返回 null 表示可叛逃，否则返回阻止原因 */
export function canDefect(
  save: PlayerSave,
  targetFaction: FactionId,
  day: number,
): string | null {
  const currentFaction = save.primaryFaction as FactionId | '';

  // 无主派无法叛逃
  if (!currentFaction) return '尚未加入任何派系';

  // 不能叛逃到同一派
  if (currentFaction === targetFaction) return '目标派系即为当前主派';

  // R1 失势期
  if ((save.factionSetbackUntilDay ?? 0) > day) {
    const daysLeft = (save.factionSetbackUntilDay ?? 0) - day;
    return `失势期内禁止叛逃（还有 ${daysLeft} 天）`;
  }

  // 叛逃冷却
  if ((save.defectCooldownUntilDay ?? 0) > day) {
    const daysLeft = (save.defectCooldownUntilDay ?? 0) - day;
    return `叛逃冷却中（还有 ${daysLeft} 天）`;
  }

  // 立案期禁止
  if (save.isFlagged && (save.caseStartDay ?? 0) > 0) {
    return '正在接受纪委调查，禁止叛逃';
  }

  // 目标派声望需 ≥ L2
  const relations = getRelationFromSave(save);
  const targetRel = relations[targetFaction] ?? 0;
  if (getRepLevel(targetRel) < 2) {
    return `目标派声望不足（需 L2，当前 ${getRepLevel(targetRel)} 级，关系值 ${targetRel}）`;
  }

  // 不得投奔死敌（关系矩阵 <= -2）
  const matrixVal = FACTION_RELATION_MATRIX[currentFaction as FactionId]?.[targetFaction] ?? 0;
  if (matrixVal <= -2) {
    return `${currentFaction} 与 ${targetFaction} 为死敌，无法投奔`;
  }

  // 政绩点不足
  if ((save.meritPoints ?? 0) < DEFECT_MERIT_COST) {
    return `政绩点不足（需 ${DEFECT_MERIT_COST}，当前 ${save.meritPoints ?? 0}）`;
  }

  return null; // 可以叛逃
}

/**
 * 执行叛逃：旧派关系压底、新派基线设置、冷却开始。
 * @returns Partial<PlayerSave>
 */
export function applyDefection(
  save: PlayerSave,
  targetFaction: FactionId,
  day: number,
): Partial<PlayerSave> {
  const oldFaction = save.primaryFaction as FactionId;
  const relations  = getRelationFromSave(save);

  // 旧派关系压到下限 20
  const oldRelDelta = applyRelDeltaToSave(
    save,
    oldFaction,
    DEFECT_OLD_RELATION_FLOOR - (relations[oldFaction] ?? 0),
  );

  // 新派关系设为基线 40（仅提升，不降低）
  const currentTargetRel = relations[targetFaction] ?? 0;
  const newRelDelta = currentTargetRel < DEFECT_NEW_BASE_RELATION
    ? applyRelDeltaToSave(save, targetFaction, DEFECT_NEW_BASE_RELATION - currentTargetRel)
    : {};

  return {
    primaryFaction:         targetFaction,
    factionInfluence:       Math.max(0, (save.factionInfluence ?? 0) - DEFECT_INFLUENCE_PENALTY),
    meritPoints:            Math.max(0, (save.meritPoints ?? 0) - DEFECT_MERIT_COST),
    defectCooldownUntilDay: day + DEFECT_COOLDOWN_DAYS,
    factionPromotionLocked: true,           // 本周期冻结
    factionJoinedDay:       day,
    factionMandates:        [],             // 委托清零（换系后重新生成）
    lastMandateYear:        -1,
    ...oldRelDelta,
    ...newRelDelta,
  };
}

// ──────────────────────────────────────────────────────────────────
// D. 六条限制谓词（供 UI / 主循环门控）
// ──────────────────────────────────────────────────────────────────

/** R1：失势期软锁（返回 true = 当前处于失势期） */
export function isInSetback(save: PlayerSave): boolean {
  return (save.factionSetbackUntilDay ?? 0) > save.gameDays;
}

/** R2：被针对时禁止争枢纽席位（isFlagged = true 时禁争枢纽） */
export function canContestHub(save: PlayerSave): boolean {
  return !save.isFlagged;
}

/**
 * R3：声望门槛
 * - 争核心/枢纽席位需主派 L3
 * - 叛逃需目标派 L2
 */
export function meetsRepReq(save: PlayerSave, isHubContest: boolean): boolean {
  const fid = save.primaryFaction as FactionId | '';
  if (!fid) return false;
  const rel = getRelationFromSave(save)[fid as FactionId] ?? 0;
  const rep = getRepLevel(rel);
  if (isHubContest) return rep >= 3;
  return rep >= 1; // 普通席位无声望门槛
}

/**
 * R4：派系互斥班子（local + reform 不可共存）
 * 若玩家主派为 local 或 reform，进入另一方则违规。
 */
export function isExclusiveConflict(
  currentFaction: FactionId | string,
  targetFaction: FactionId,
): boolean {
  const exclusive: [FactionId, FactionId] = ['local', 'reform'];
  return (
    (currentFaction === exclusive[0] && targetFaction === exclusive[1]) ||
    (currentFaction === exclusive[1] && targetFaction === exclusive[0])
  );
}

/**
 * R5：任期轮岗（同职位连任 >= POSITION_TERM_LIMIT 届强制轮岗）
 * concurrentPosts 中包含同 key 记录数作为代理指标
 */
export function isMandatoryRotation(save: PlayerSave): boolean {
  const posts = save.concurrentPosts ?? [];
  const current = save.playerPosition ?? '';
  if (!current) return false;
  const sameCount = posts.filter(k => k === current).length;
  return sameCount >= POSITION_TERM_LIMIT;
}

/**
 * R6：暴露立案（行动效果 -50% + 降声望 + 长冷却）
 * 返回暴露立案状态下的行动效率系数（0.5 = 半效）
 */
export function getCovertEfficiency(save: PlayerSave): number {
  if (save.isFlagged && (save.caseStartDay ?? 0) > 0) return 0.5;
  return 1.0;
}

// ──────────────────────────────────────────────────────────────────
// nanoid shim（轻量 ID 生成）
// ──────────────────────────────────────────────────────────────────
```

<a id="srclibfactionsystemts"></a>
## `src/lib/factionSystem.ts`

```typescript
/**
 * factionSystem.ts — 派系系统 v2 核心逻辑层
 *
 * 本文件为纯函数库（无副作用、无 React 依赖），对应设计规格 §2–§4。
 * UI 层（factions.tsx）和全局接线（promotion / leadership / gameLoop）
 * 从这里导入工具函数，避免逻辑散落。
 *
 * 数值一律使用参数化常量，不硬编码，可灰度回退：
 *   默认系数为 1.0 时即原行为；缺字段时按旧逻辑兜底。
 */

import type {
  FactionId,
  PoliticalWind,
  StrugglePhase,
  FactionRepLevel,
  FactionStruggle,
  FactionCoalition,
} from '@/types/game';
import { ALL_FACTIONS } from '@/types/game';

// ═══════════════════════════════════════════════════════════
// §2.1  派系关系矩阵（叙事底色，正=友好/负=对立）
// ═══════════════════════════════════════════════════════════
export const FACTION_RELATION_MATRIX: Record<FactionId, Partial<Record<FactionId, number>>> = {
  reform:    { pragmatic: -2, cyl: 1,  techno: 2,  local: -1 },
  pragmatic: { reform: -2,   cyl: -2,             local: 1  },
  cyl:       { reform: 1,    pragmatic: -2                   },
  techno:    { reform: 2,    local: -1                       },
  local:     { reform: -1,   pragmatic: 1, techno: -1        },
};

// ═══════════════════════════════════════════════════════════
// §2.3  风向派生规则（dominantFaction / losingFaction）
// ═══════════════════════════════════════════════════════════
export const DOMINANT_FACTION_MAP: Record<PoliticalWind, FactionId | null> = {
  'reform-heavy':    'reform',
  'pragmatic-heavy': 'pragmatic',
  'techno-surge':    'techno',
  'local-crackdown': 'pragmatic',   // 纪律整肃方为国家系
  'balanced':         null,
};

export const LOSING_FACTION_MAP: Record<PoliticalWind, FactionId | null> = {
  'reform-heavy':    'local',
  'pragmatic-heavy': 'reform',
  'techno-surge':    'local',
  'local-crackdown': 'local',
  'balanced':         null,
};

export function getDominantFaction(wind: PoliticalWind): FactionId | null {
  return DOMINANT_FACTION_MAP[wind];
}

export function getLosingFaction(wind: PoliticalWind): FactionId | null {
  return LOSING_FACTION_MAP[wind];
}

// ═══════════════════════════════════════════════════════════
// §D2 修复  hashNameToFaction（统一 FactionId，废除旧别名）
// ═══════════════════════════════════════════════════════════
const FACTION_POOL: FactionId[] = ['reform', 'pragmatic', 'cyl', 'techno', 'local'];

export function hashNameToFaction(name: string): FactionId {
  if (!name) return 'pragmatic';
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return FACTION_POOL[h % 5];
}

// ═══════════════════════════════════════════════════════════
// §2.2  声望等级（Reputation Level，L0–L4）
// ═══════════════════════════════════════════════════════════
const REP_THRESHOLDS = [20, 40, 60, 80] as const;  // L1/L2/L3/L4 起点

export function getRepLevel(relation: number): FactionRepLevel {
  if (relation >= 80) return 4;
  if (relation >= 60) return 3;
  if (relation >= 40) return 2;
  if (relation >= 20) return 1;
  return 0;
}

export const REP_LABELS: Record<FactionRepLevel, string> = {
  0: '陌路',
  1: '相识',
  2: '同道',
  3: '心腹',
  4: '核心',
};

// ═══════════════════════════════════════════════════════════
// §3.3  行动得势倍率
// ═══════════════════════════════════════════════════════════
/** 当前风口下对某派做正向行动的效果倍率（§2.4 / §3.3）*/
export function getWindMultiplier(
  actionFaction: FactionId,
  dominantFaction: FactionId | null,
  losingFaction: FactionId | null,
): number {
  if (dominantFaction && actionFaction === dominantFaction) return 1.15;
  if (losingFaction  && actionFaction === losingFaction)   return 0.90;
  return 1.0;
}

// ═══════════════════════════════════════════════════════════
// §4.2  K_faction 晋升系数（clamp 0.4–1.8）
// ═══════════════════════════════════════════════════════════
export interface KFactionParams {
  primaryFaction: FactionId | null;
  relation: Record<FactionId, number>;
  dominantFaction: FactionId | null;
  losingFaction: FactionId | null;
  /** 班子 / 四大班子成员的派系归属数组 */
  bandFactions: FactionId[];
  isFlagged: boolean;
  factionlessLocked: boolean;
  /** 派系斗争交战期冻结（§3.22 / §4.2⑧） */
  factionPromotionLocked: boolean;
}

export interface KFactionResult {
  kFaction: number;
  promotable: boolean;
  reason: string;
}

export function calcKFaction(p: KFactionParams): KFactionResult {
  // ⑦ 无派系永久锁死
  if (p.factionlessLocked || !p.primaryFaction) {
    return { kFaction: 0, promotable: false, reason: '无派系·晋升锁死' };
  }
  // ⑧ 斗争交战期临时冻结
  if (p.factionPromotionLocked) {
    return { kFaction: 0, promotable: false, reason: '派系斗争中·晋升冻结' };
  }

  const total = p.bandFactions.length || 1;
  const primary = p.primaryFaction;

  // 同派评委占比
  const sameCount = p.bandFactions.filter(f => f === primary).length;
  const sameRatio = sameCount / total;

  // 对立派占比（矩阵值 ≤ -1）
  const oppCount = p.bandFactions.filter(f => {
    const v = FACTION_RELATION_MATRIX[primary]?.[f] ?? 0;
    return v <= -1;
  }).length;
  const oppRatio = oppCount / total;

  // 风口主流派加成（§4.2 明确要求：+0.20 / -0.15）
  let windBonus = 0;
  if (p.dominantFaction && primary === p.dominantFaction) windBonus = 0.20;
  else if (p.losingFaction && primary === p.losingFaction) windBonus = -0.15;

  // 声望等级项（L0–L4 对应 0–0.4，每级 +0.1）
  const repBonus = getRepLevel(p.relation[primary] ?? 0) * 0.1;

  let k = 1 + 0.4 * sameRatio - 0.3 * oppRatio + windBonus + repBonus;

  // ⑥ 被针对惩罚（§2.5③ / §4.2）
  if (p.isFlagged) k *= 0.6;

  const kClamped = Math.min(1.8, Math.max(0.4, k));
  return { kFaction: kClamped, promotable: true, reason: '' };
}

// ═══════════════════════════════════════════════════════════
// §3.4  班子派系合力（bandSynergy，0.85–1.15）
// ═══════════════════════════════════════════════════════════
export function calcBandSynergy(bandFactions: FactionId[]): number {
  if (bandFactions.length === 0) return 1.0;

  const counts: Partial<Record<FactionId, number>> = {};
  for (const f of bandFactions) counts[f] = (counts[f] ?? 0) + 1;

  const total = bandFactions.length;
  const maxPct = Math.max(...Object.values(counts as Record<string, number>)) / total;

  // 严重对立：两派均在班子且差值 >40%
  const facs = Object.keys(counts) as FactionId[];
  for (let i = 0; i < facs.length; i++) {
    for (let j = i + 1; j < facs.length; j++) {
      const rel = FACTION_RELATION_MATRIX[facs[i]]?.[facs[j]] ?? 0;
      if (rel <= -2) {
        const diff = Math.abs((counts[facs[i]] ?? 0) - (counts[facs[j]] ?? 0)) / total;
        if (diff > 0.4) return 0.85;
      }
    }
  }

  if (maxPct >= 0.6) return 1.15; // 高度一致但单一
  return 1.10;                     // 跨派均衡
}

// ═══════════════════════════════════════════════════════════
// §3.11  派系斗争力 S_you
// ═══════════════════════════════════════════════════════════
export interface SYouParams {
  relation: Record<FactionId, number>;
  supportFaction: FactionId;
  factionInfluence: number;
  bandSynergy: number;
  /** 本次下注投入的政绩（起步 500，见 §2.3） */
  meritInvested: number;
  factionIntelligence: number;
}

export function calcSYou(p: SYouParams): number {
  const rel = p.relation[p.supportFaction] ?? 0;
  // 政绩杠杆 = min(投入政绩 ÷ 500, 10)（§2.3 / §3.11③）
  const leverage = Math.min(p.meritInvested / 500, 10);
  return (
    rel * 0.5 +
    p.factionInfluence * 0.3 +
    p.bandSynergy * 20 +
    leverage * 0.2 +
    p.factionIntelligence * 0.1
  );
}

/**
 * §3.17–§3.21 战前部署折算进 S_you 的总加成。
 * 代理人×5 · 舆论×3 · 离间×4 · 先发制人×8 · 接班人×6
 */
export function prepBonus(prep: { proxy: number; media: number; discord: number; preempt: number; successor: number }): number {
  return (
    (prep.proxy ?? 0) * 5 +
    (prep.media ?? 0) * 3 +
    (prep.discord ?? 0) * 4 +
    (prep.preempt ?? 0) * 8 +
    (prep.successor ?? 0) * 6
  );
}

/** 含战前部署的 S_you 预估（供 Tab11 展示/结算使用） */
export function computeSYouWithPrep(
  relation: number,
  factionInfluence: number,
  factionIntelligence: number,
  prep: { proxy: number; media: number; discord: number; preempt: number; successor: number },
): number {
  return relation * 0.5 + factionInfluence * 0.3 + factionIntelligence * 0.1 + prepBonus(prep);
}

/**
 * §3.23 多方混战判定：取各派关系值（含主派影响力）排序，
 * 若前 3 名最大值与第 3 名差距 <15，视为多方混战格局（S_opp +20%）。
 */
export function isMultiFactionFreeForAll(
  relation: Record<FactionId, number>,
  primaryInfluence: number,
): boolean {
  const powers = ALL_FACTIONS.map(f => relation[f] + (f === 'reform' ? 0 : 0));
  powers.sort((a, b) => b - a);
  return powers.length >= 3 && powers[0] - powers[2] < 15 && primaryInfluence > 0;
}

/**
 * §4.8 派系结局判定（退休/终局时调用）。
 * 返回结局类型与展示文案。
 */
export type FactionEnding = {
  key: 'core' | 'balancer' | 'marginalized' | 'purged' | 'none';
  title: string;
  desc: string;
  color: string;
};

export function evaluateFactionEnding(
  influence: number,
  purgeCount: number,
  hasPrimary: boolean,
): FactionEnding {
  if (purgeCount >= 2) {
    return { key: 'purged', title: '被清算 · 落马', desc: '派系账目留痕累积，终被揪出，仕途以落马收场。', color: '#C82829' };
  }
  if (!hasPrimary) {
    return { key: 'none', title: '无派无系', desc: '始终未选边站队，左右逢源却也无人庇护。', color: '#888' };
  }
  if (influence >= 80) {
    return { key: 'core', title: '核心圈层 · 平安着陆', desc: '主派声望与影响力登顶，或斗争胜出主导风口，更上层楼。', color: '#C8A84B' };
  }
  if (influence < 30) {
    return { key: 'marginalized', title: '被边缘化', desc: '影响力不足，派系失势后被迫退居二线。', color: '#C87820' };
  }
  return { key: 'balancer', title: '平衡大师', desc: '五派关系均衡、无大清洗，各方都能接受，稳健终局。', color: '#2a7a3b' };
}

// ═══════════════════════════════════════════════════════════
// §3.7  情报增速（每旬）
// ═══════════════════════════════════════════════════════════
export function intelligenceGainPer10Days(technoRelation: number): number {
  return technoRelation / 20;
}

// ═══════════════════════════════════════════════════════════
// §2.5③  暴露率（discoveryRoll，随接触次数递增）
// ═══════════════════════════════════════════════════════════
const BASE_DISCOVERY = [0.15, 0.30, 0.55];

export function getDiscoveryProbability(
  contactAttempts: number,
  factionIntelligence: number,
  primaryRelation: number,
): number {
  const base =
    contactAttempts < BASE_DISCOVERY.length
      ? BASE_DISCOVERY[contactAttempts]
      : Math.min(0.90, 0.55 + (contactAttempts - 2) * 0.15);
  const intReduction = (factionIntelligence / 100) * 0.20;
  const relReduction = (primaryRelation / 100) * 0.10;
  return Math.max(0.05, base - intReduction - relReduction);
}

// ═══════════════════════════════════════════════════════════
// §3.10  清洗命中率
// ═══════════════════════════════════════════════════════════
export function getPurgeHitProbability(factionIntelligence: number): number {
  return 0.3 * (1 - factionIntelligence / 100);
}

// ═══════════════════════════════════════════════════════════
// §D1 修复  持久化冷却工具（读写 save.factionCooldowns）
// ═══════════════════════════════════════════════════════════
const COOL_PREFIX = 'fac_';

export function isCooldownActive(
  cooldowns: Record<string, number>,
  key: string,
  currentDay: number,
): boolean {
  return currentDay < (cooldowns[COOL_PREFIX + key] ?? 0);
}

export function setCooldown(
  cooldowns: Record<string, number>,
  key: string,
  currentDay: number,
  duration: number,
): Record<string, number> {
  return { ...cooldowns, [COOL_PREFIX + key]: currentDay + duration };
}

export function cooldownRemaining(
  cooldowns: Record<string, number>,
  key: string,
  currentDay: number,
): number {
  return Math.max(0, (cooldowns[COOL_PREFIX + key] ?? 0) - currentDay);
}

// ═══════════════════════════════════════════════════════════
// §3.3  风口周期 tick（5 游戏年 = 1825 天）
// ═══════════════════════════════════════════════════════════
export const WIND_CYCLE_DAYS = 1825; // 5 × 365，锚定 getGameYear

/**
 * 检查是否到达下一个风口周期边界。
 * 返回 true 时调用方应触发派系斗争（§3.11）并更新 lastWindCycleDay。
 */
export function shouldTriggerWindCycle(
  currentDay: number,
  lastWindCycleDay: number,
): boolean {
  return currentDay - lastWindCycleDay >= WIND_CYCLE_DAYS;
}

/**
 * 斗争准备期检测（§3.22①）：距周期边界 ≤60 天进入动员。
 */
export function isInMobilizationPeriod(
  currentDay: number,
  lastWindCycleDay: number,
): boolean {
  const remaining = WIND_CYCLE_DAYS - (currentDay - lastWindCycleDay);
  return remaining > 0 && remaining <= 60;
}

// ═══════════════════════════════════════════════════════════
// §4.1  政策触发偏置（respondToPolicy 回写系数）
// ═══════════════════════════════════════════════════════════
/** 响应政策时，若主派 == favoredFaction，meritBonus 乘 1.2；若是 disfavored，乘 0.85 */
export function getPolicyFactionMultiplier(
  primaryFaction: FactionId | null,
  favoredFaction: FactionId | null | undefined,
  disfavoredFaction: FactionId | null | undefined,
): number {
  if (!primaryFaction) return 1.0;
  if (favoredFaction   && primaryFaction === favoredFaction)   return 1.2;
  if (disfavoredFaction && primaryFaction === disfavoredFaction) return 0.85;
  return 1.0;
}

// ═══════════════════════════════════════════════════════════
// §6  迁移：旧五列 → 新 relation Record
// ═══════════════════════════════════════════════════════════
export function migrateLegacyRelation(save: {
  reformFaction?: number;
  pragmaticFaction?: number;
  cylRelation?: number;
  technoRelation?: number;
  localRelation?: number;
}): Record<FactionId, number> {
  return {
    reform:    save.reformFaction    ?? 50,
    pragmatic: save.pragmaticFaction ?? 50,
    cyl:       save.cylRelation      ?? 30,
    techno:    save.technoRelation   ?? 30,
    local:     save.localRelation    ?? 30,
  };
}

/**
 * 便捷工具：从 PlayerSave 读取统一 relation 对象。
 * 优先读 v2 字段（cylRelation 等），兼容旧存档。
 */
export function getRelationFromSave(save: {
  reformFaction: number;
  pragmaticFaction: number;
  cylRelation: number;
  technoRelation: number;
  localRelation: number;
}): Record<FactionId, number> {
  return migrateLegacyRelation(save);
}

/** relation 字段名映射（统一派系 ID → 存档字段） */
export function relFieldOf(faction: FactionId): string {
  switch (faction) {
    case 'reform':    return 'reformFaction';
    case 'pragmatic': return 'pragmaticFaction';
    case 'cyl':       return 'cylRelation';
    case 'techno':    return 'technoRelation';
    default:          return 'localRelation';
  }
}

/** 对某派关系施加增量，返回需写入存档的字段更新（0-100 封顶） */
export function applyRelDeltaToSave(
  save: { reformFaction: number; pragmaticFaction: number; cylRelation: number; technoRelation: number; localRelation: number },
  faction: FactionId,
  delta: number,
): Record<string, number> {
  const field = relFieldOf(faction);
  const cur = (save as Record<string, number>)[field] ?? 50;
  return { [field]: Math.max(0, Math.min(100, cur + delta)) };
}

// ═══════════════════════════════════════════════════════════
// §3.9  联盟有效性检查
// ═══════════════════════════════════════════════════════════
export function isCoalitionActive(c: FactionCoalition, currentDay: number): boolean {
  return currentDay < c.endDay;
}

export function getActiveCoalitions(
  coalitions: FactionCoalition[],
  currentDay: number,
): FactionCoalition[] {
  return coalitions.filter(c => isCoalitionActive(c, currentDay));
}

/** 两派是否可缔结联盟（互斥派 local-reform 不可联盟，§3.9）*/
export function canFormCoalition(a: FactionId, b: FactionId): boolean {
  if (a === b) return false;
  const relAtoB = FACTION_RELATION_MATRIX[a]?.[b] ?? 0;
  const relBtoA = FACTION_RELATION_MATRIX[b]?.[a] ?? 0;
  // 双方关系矩阵均为 -1（互斥，如 reform-local）需额外政绩 ×2
  // 此处仅判断是否"完全禁止"（-2 级相互）
  return !(relAtoB <= -2 && relBtoA <= -2);
}

// ═══════════════════════════════════════════════════════════
// §C  跨派系结契（v6 扩充玩法）
// ═══════════════════════════════════════════════════════════
/** 同盟期间个人职位战的 sYou 加成系数 */
export const COALITION_CONTEST_BONUS = 0.12;
/** 缔结联盟时双方的互惠关系增益 */
export const COALITION_FORM_RELATION_BOOST = 6;

/** 玩家主派是否与指定派系存在活跃同盟 */
export function hasActiveCoalitionWith(
  coalitions: FactionCoalition[],
  primary: FactionId,
  other: FactionId,
  day: number,
): boolean {
  return coalitions.some(
    c =>
      isCoalitionActive(c, day) &&
      ((c.a === primary && c.b === other) || (c.a === other && c.b === primary)),
  );
}

// ═══════════════════════════════════════════════════════════
// §4.7  城市指标派系偏置方向
// ═══════════════════════════════════════════════════════════
export const FACTION_METRIC_BIAS: Record<FactionId, string[]> = {
  reform:    ['gdp', 'investBonus'],
  pragmatic: ['stability'],
  cyl:       ['healthcare', 'education'],
  techno:    ['gdp', 'digital'],
  local:     ['finance'],  // 长期承压 integrity
};

// ═══════════════════════════════════════════════════════════
// §2.5④  上司好感倍率（§4.4）
// ═══════════════════════════════════════════════════════════
export function getBossFavorMultiplier(
  playerFaction: FactionId | null,
  bossFaction: FactionId | null,
  isFlagged: boolean,
): number {
  let mult = 1.0;
  if (playerFaction && bossFaction) {
    if (playerFaction === bossFaction) {
      mult = 1.3;
    } else {
      const rel = FACTION_RELATION_MATRIX[playerFaction]?.[bossFaction] ?? 0;
      if (rel <= -1) mult = 0.6;
    }
  }
  if (isFlagged) mult *= 0.7;
  return mult;
}

// ═══════════════════════════════════════════════════════════
// §4.1  政策 favoredFaction 表（NationalPolicyDef 扩展用）
// ═══════════════════════════════════════════════════════════
export const POLICY_FACTION_MAP: Record<string, {
  favored: FactionId | null;
  disfavored: FactionId | null;
}> = {
  '扫黑除恶':       { favored: 'pragmatic', disfavored: 'local' },
  '中央环保督查':   { favored: 'techno',    disfavored: 'local' },
  '反腐败专项':     { favored: 'reform',    disfavored: 'local' },
  '乡村振兴攻坚':   { favored: 'cyl',       disfavored: null    },
  '共同富裕示范':   { favored: 'cyl',       disfavored: 'reform'},
  '安全生产整治':   { favored: 'pragmatic', disfavored: null    },
  '教育质量提升':   { favored: 'cyl',       disfavored: null    },
  '经济高质量发展': { favored: 'reform',    disfavored: 'pragmatic' },
};

// ═══════════════════════════════════════════════════════════
// §2.3  派系影响力计算（factionInfluence 0-100）
// ═══════════════════════════════════════════════════════════
export function calcFactionInfluence(
  relation: Record<FactionId, number>,
  primaryFaction: FactionId | null,
): number {
  const all: FactionId[] = ['reform', 'pragmatic', 'cyl', 'techno', 'local'];
  const avg = all.reduce((s, f) => s + (relation[f] ?? 0), 0) / 5;
  const primaryLevel = primaryFaction ? getRepLevel(relation[primaryFaction] ?? 0) : 0;
  const raw = avg * 0.7 + primaryLevel * 5 * 0.3;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

// ═══════════════════════════════════════════════════════════
// §3.22  斗争阶段状态机
// ═══════════════════════════════════════════════════════════
export function resolveStrugglePhase(
  currentDay: number,
  lastWindCycleDay: number,
  currentPhase: StrugglePhase,
  activeStartDay: number | null,
  truceStartDay: number | null,
): StrugglePhase {
  if (currentPhase === 'truce' && truceStartDay !== null) {
    return (currentDay - truceStartDay) >= 60 ? 'idle' : 'truce';
  }
  if (currentPhase === 'active') return 'active'; // 由结算函数推进到 truce
  if (isInMobilizationPeriod(currentDay, lastWindCycleDay)) return 'mobilize';
  if (shouldTriggerWindCycle(currentDay, lastWindCycleDay)) return 'active';
  return 'idle';
}
```

<a id="srclibgamedatabasets"></a>
## `src/lib/gameDatabase.ts`

```typescript
// 玩家数据库（政务大区）选择辅助
// 使用跨平台安全存储（原生 SecureStore / Web localStorage），避免 expo-sqlite polyfill 在
// iOS Safari、鸿蒙浏览器上初始化不稳定导致读取失败
import { supabase } from '@/client/supabase';
import { secureStorage } from '@/client/storage';

const SELECTED_KEY = 'selected_game_database_code';

export interface GameDatabaseInfo {
  code: string;
  name: string;
  capacity_limit: number;
  player_count: number;
  is_full: boolean;
  is_active: boolean;
  sort_order: number;
}

/** 读取玩家在注册页选定的大区 code（未选返回 null） */
export async function getSelectedDatabaseCode(): Promise<string | null> {
  try {
    const v = await secureStorage.getItem(SELECTED_KEY);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

/** 写入 / 清除玩家选定的大区 code */
export async function setSelectedDatabaseCode(code: string | null): Promise<void> {
  try {
    if (code && code.length > 0) await secureStorage.setItem(SELECTED_KEY, code);
    else await secureStorage.removeItem(SELECTED_KEY);
  } catch {
    // 忽略存储异常，不影响主流程
  }
}

/** 拉取可用政务大区列表（含实时玩家数与满载状态） */
export async function listGameDatabases(): Promise<GameDatabaseInfo[]> {
  const { data, error } = await supabase.rpc('list_game_databases');
  if (error || !data) return [];
  return (data as GameDatabaseInfo[]).map((d) => ({
    code: d.code,
    name: d.name,
    capacity_limit: d.capacity_limit,
    player_count: Number(d.player_count ?? 0),
    is_full: Boolean(d.is_full),
    is_active: Boolean(d.is_active),
    sort_order: d.sort_order,
  }));
}
```

<a id="srclibgameplayapits"></a>
## `src/lib/gameplayApi.ts`

```typescript
// 贪腐玩法：统一动作执行接口封装（调用 Edge Function，前端永不直接改数值）
import { supabase } from '@/client/supabase';
import type { GameplayConfig, GameplayActionResult } from '@/types/game';

export async function executeGameplayAction(
  saveId: string,
  config: GameplayConfig,
  amount?: number,
): Promise<GameplayActionResult> {
  const { data, error } = await supabase.functions.invoke('execute_gameplay_action', {
    body: { saveId, configId: config.id, amount },
  });
  if (error) {
    let message = '操作失败';
    try {
      const parsed = await error.context?.json?.();
      if (parsed?.error) message = parsed.error;
    } catch { /* ignore */ }
    return { success: false, message };
  }
  if (data?.error) {
    return { success: false, message: data.error };
  }
  return {
    success: !!data?.success,
    message: data?.message ?? '操作完成',
    roll: data?.roll,
    gain: data?.gain,
    gameOver: data?.gameOver ?? null,
  };
}

// 民心修行：动作执行接口（调用 execute_popular_action Edge Function）
export interface PopularActionResult {
  success: boolean;
  message: string;
  popularChange?: number;
  newPopularSupport?: number;
  sideEffects?: string[];
  changes?: {
    popularSupport?: number;
    cityLivelihood?: number;
    meritPoints?: number;
    riskValue?: number;
  };
}

export async function executePopularAction(
  saveId: string,
  actionId: string,
): Promise<PopularActionResult> {
  const { data, error } = await supabase.functions.invoke('execute_popular_action', {
    body: { saveId, actionId },
  });
  if (error) {
    let message = '操作失败';
    try {
      const parsed = await error.context?.json?.();
      if (parsed?.error) message = parsed.error;
    } catch { /* ignore */ }
    return { success: false, message };
  }
  if (data?.error) {
    return { success: false, message: data.error };
  }
  return {
    success: !!data?.success,
    message: data?.message ?? '操作完成',
    popularChange: data?.popularChange,
    newPopularSupport: data?.newPopularSupport,
    sideEffects: data?.sideEffects ?? [],
    changes: data?.changes ?? {},
  };
}
```

<a id="srclibgameplayconfigts"></a>
## `src/lib/gameplayConfig.ts`

```typescript
// 统一玩法配置表（JSON 数据，非硬编码逻辑）
// 新增玩法 = 在对应数组中插入一条配置；页面与后端接口零改动
import type { GameplayConfig } from '@/types/game';

// ── 玩法一·权钱交易：受贿渠道（严格按设计文档参数表）──
export const BRIBERY_CHANNELS: GameplayConfig[] = [
  { category: 'bribery_channel', id: 'gift', name: '收受礼品礼金', icon: '🎁', unlockRank: 3, sort: 1, enabled: true,
    params: { gainMin: 2000, gainMax: 8000, risk: 2, moral: 1, successRate: 0.95, cooldown: 15, desc: '逢年过节收受管理对象的礼品礼金。' } },
  { category: 'bribery_channel', id: 'banquet', name: '宴请与消费卡', icon: '🍽️', unlockRank: 4, sort: 2, enabled: true,
    params: { gainMin: 5000, gainMax: 20000, risk: 3, moral: 2, successRate: 0.90, cooldown: 20, desc: '接受企业宴请并收受消费卡。' } },
  { category: 'bribery_channel', id: 'redpacket', name: '企业红包', icon: '🧧', unlockRank: 5, sort: 3, enabled: true,
    params: { gainMin: 10000, gainMax: 50000, risk: 4, moral: 3, successRate: 0.85, cooldown: 30, desc: '收受企业以红包名义输送的利益。' } },
  { category: 'bribery_channel', id: 'kickback', name: '工程回扣', icon: '🏗️', unlockRank: 7, sort: 4, enabled: true,
    params: { gainMin: 50000, gainMax: 300000, risk: 8, moral: 5, successRate: 0.75, cooldown: 60, desc: '在工程项目中收取回扣。' } },
  { category: 'bribery_channel', id: 'finance_fee', name: '融资中介费', icon: '🏦', unlockRank: 8, sort: 5, enabled: true,
    params: { gainMin: 100000, gainMax: 500000, risk: 9, moral: 5, successRate: 0.70, cooldown: 60, desc: '为融资项目牵线并收取中介费。' } },
  { category: 'bribery_channel', id: 'land_rent', name: '土地指标寻租', icon: '🏞️', unlockRank: 8, sort: 6, enabled: true,
    params: { gainMin: 200000, gainMax: 800000, risk: 12, moral: 6, successRate: 0.65, cooldown: 90, desc: '利用土地审批权进行寻租。' } },
  { category: 'bribery_channel', id: 'personnel', name: '人事晋升交易', icon: '🎖️', unlockRank: 9, sort: 7, enabled: true,
    params: { gainMin: 300000, gainMax: 1000000, risk: 12, moral: 7, successRate: 0.60, cooldown: 90, desc: '在干部选拔中收钱卖官。' } },
  { category: 'bribery_channel', id: 'special_fund', name: '专项资金截留', icon: '📋', unlockRank: 10, sort: 8, enabled: true,
    params: { gainMin: 500000, gainMax: 2000000, risk: 15, moral: 8, successRate: 0.55, cooldown: 120, desc: '截留挪用专项资金中饱私囊。' } },
  { category: 'bribery_channel', id: 'overseas_share', name: '境外公司股份', icon: '🌐', unlockRank: 12, sort: 9, enabled: true,
    params: { gainMin: 1000000, gainMax: 5000000, risk: 18, moral: 9, successRate: 0.45, cooldown: 180, desc: '通过境外公司代持股份获取利益。' } },
  { category: 'bribery_channel', id: 'trust', name: '巨额信托洗钱', icon: '🏛️', unlockRank: 14, sort: 10, enabled: true,
    params: { gainMin: 5000000, gainMax: 20000000, risk: 25, moral: 12, successRate: 0.35, cooldown: 365, desc: '通过信托产品清洗巨额非法资金。' } },
];

// ── 玩法一·权钱交易：权力寻租（按文档表格，缺失数值合理推算）──
export const POWER_RENTS: GameplayConfig[] = [
  { category: 'power_rent', id: 'project_bid', name: '工程发包权', icon: '🏗️', unlockRank: 7, sort: 1, enabled: true,
    params: { gainMin: 30000, gainMax: 300000, risk: 10, moral: 5, successRate: 0.70, cooldown: 45, desc: '指定关系户中标工程，收取标的额提成。' } },
  { category: 'power_rent', id: 'bid_leak', name: '招投标干预', icon: '📑', unlockRank: 7, sort: 2, enabled: true,
    params: { gainMin: 50000, gainMax: 200000, risk: 8, moral: 4, successRate: 0.75, cooldown: 45, desc: '泄露标底为关系户谋利。' } },
  { category: 'power_rent', id: 'land_sale', name: '土地出让', icon: '🏞️', unlockRank: 8, sort: 3, enabled: true,
    params: { gainMin: 200000, gainMax: 1000000, risk: 12, moral: 6, successRate: 0.65, cooldown: 90, desc: '定向低价出让土地。' } },
  { category: 'power_rent', id: 'gov_purchase', name: '政府采购', icon: '🏪', unlockRank: 7, sort: 4, enabled: true,
    params: { gainMin: 20000, gainMax: 100000, risk: 6, moral: 3, successRate: 0.80, cooldown: 30, desc: '指定供应商获取采购回扣。' } },
  { category: 'power_rent', id: 'cadre_appoint', name: '干部任命', icon: '🎖️', unlockRank: 9, sort: 5, enabled: true,
    params: { gainMin: 300000, gainMax: 1000000, risk: 12, moral: 7, successRate: 0.60, cooldown: 90, desc: '卖官鬻爵，收钱提拔。' } },
  { category: 'power_rent', id: 'resource_approval', name: '资源审批', icon: '♻️', unlockRank: 8, sort: 6, enabled: true,
    params: { gainMin: 50000, gainMax: 300000, risk: 8, moral: 4, successRate: 0.72, cooldown: 60, desc: '环评放水、审批寻租。' } },
  { category: 'power_rent', id: 'finance_license', name: '金融牌照', icon: '🏦', unlockRank: 12, sort: 7, enabled: true,
    params: { gainMin: 500000, gainMax: 3000000, risk: 15, moral: 8, successRate: 0.55, cooldown: 180, desc: '审批金融牌照进行寻租。' } },
];

// ── 玩法一·权钱交易：贪污挪用（按文档表格）──
export const EMBEZZLEMENTS: GameplayConfig[] = [
  { category: 'embezzlement', id: 'fake_travel', name: '虚报差旅费', icon: '🧾', unlockRank: 3, sort: 1, enabled: true,
    params: { gainMin: 1000, gainMax: 3000, risk: 2, moral: 2, successRate: 0.90, cooldown: 20, desc: '虚报差旅费用报销套现。' } },
  { category: 'embezzlement', id: 'fake_invoice', name: '假发票报销', icon: '🧾', unlockRank: 4, sort: 2, enabled: true,
    params: { gainMin: 3000, gainMax: 10000, risk: 4, moral: 3, successRate: 0.85, cooldown: 25, desc: '使用虚假发票报销套取公款。' } },
  { category: 'embezzlement', id: 'agri_fund', name: '截留惠农资金', icon: '🌾', unlockRank: 5, sort: 3, enabled: true,
    params: { gainMin: 10000, gainMax: 50000, risk: 6, moral: 5, successRate: 0.78, cooldown: 40, desc: '截留挪用惠农补贴资金。' } },
  { category: 'embezzlement', id: 'slush_fund', name: '私设小金库', icon: '💰', unlockRank: 6, sort: 4, enabled: true,
    params: { gainMin: 20000, gainMax: 100000, risk: 7, moral: 5, successRate: 0.72, cooldown: 50, desc: '私设小金库截留单位资金。' } },
  { category: 'embezzlement', id: 'special_embezzle', name: '挪用专项资金', icon: '📋', unlockRank: 8, sort: 5, enabled: true,
    params: { gainMin: 100000, gainMax: 500000, risk: 10, moral: 7, successRate: 0.65, cooldown: 70, desc: '挪用专项资金用于个人用途。' } },
  { category: 'embezzlement', id: 'poverty_fund', name: '骗取扶贫资金', icon: '🤝', unlockRank: 9, sort: 6, enabled: true,
    params: { gainMin: 200000, gainMax: 800000, risk: 12, moral: 9, successRate: 0.58, cooldown: 90, desc: '骗取扶贫专项资金。' } },
  { category: 'embezzlement', id: 'social_fund', name: '社保基金挪用', icon: '🏥', unlockRank: 10, sort: 7, enabled: true,
    params: { gainMin: 500000, gainMax: 2000000, risk: 15, moral: 10, successRate: 0.50, cooldown: 120, desc: '挪用社保基金，风险极高。' } },
];

// ── 玩法一·权钱交易：涉案账户（藏匿方式，按文档表格）──
export const ASSET_HIDINGS: GameplayConfig[] = [
  { category: 'asset_hiding', id: 'cash', name: '现金藏匿（保险柜）', icon: '🗄️', unlockRank: 3, sort: 1, enabled: true,
    params: { safety: 2, recoveryRate: 0.60, risk: 2, moral: 0, desc: '将现金藏于家中保险柜，安全性中等。' } },
  { category: 'asset_hiding', id: 'relative', name: '亲属代持', icon: '👨‍👩‍👧', unlockRank: 5, sort: 2, enabled: true,
    params: { safety: 2, recoveryRate: 0.55, risk: 3, moral: 1, desc: '由亲属代持资产，牵连家人风险。' } },
  { category: 'asset_hiding', id: 'antique', name: '古董字画', icon: '🖼️', unlockRank: 6, sort: 3, enabled: true,
    params: { safety: 3, recoveryRate: 0.35, risk: 2, moral: 1, desc: '购置古董字画藏匿资金。' } },
  { category: 'asset_hiding', id: 'overseas_account', name: '境外账户', icon: '🌍', unlockRank: 8, sort: 4, enabled: true,
    params: { safety: 3, recoveryRate: 0.25, risk: 4, moral: 2, desc: '在境外开设账户转移资金。' } },
  { category: 'asset_hiding', id: 'shell_company', name: '空壳公司', icon: '🏢', unlockRank: 9, sort: 5, enabled: true,
    params: { safety: 3, recoveryRate: 0.40, risk: 3, moral: 2, desc: '通过空壳公司洗白资金。' } },
  { category: 'asset_hiding', id: 'crypto', name: '加密货币', icon: '🪙', unlockRank: 10, sort: 6, enabled: true,
    params: { safety: 4, recoveryRate: 0.15, risk: 4, moral: 2, desc: '兑换加密货币藏匿资金，追缴极难。' } },
  { category: 'asset_hiding', id: 'overseas_trust', name: '境外信托', icon: '🏛️', unlockRank: 14, sort: 7, enabled: true,
    params: { safety: 4, recoveryRate: 0.10, risk: 5, moral: 3, desc: '设立境外信托，追缴率极低。' } },
];

// ── 玩法二·纪检风云：举报线索来源（按文档表格，缺失数值合理推算）──
export const CLUE_SOURCES: GameplayConfig[] = [
  { category: 'clue_source', id: 'mass_report', name: '群众匿名举报', icon: '✉️', unlockRank: 0, sort: 1, enabled: true,
    params: { clueValue: 5, suppressCost: '政绩-5', desc: '风险≥30时随机产生，线索+5。' } },
  { category: 'clue_source', id: 'sub_report', name: '下属检举', icon: '👥', unlockRank: 0, sort: 2, enabled: true,
    params: { clueValue: 15, suppressCost: '政绩-8，下属流失', desc: '同案下属忠诚度<30时反水，线索+15。' } },
  { category: 'clue_source', id: 'inspection', name: '巡视组发现问题', icon: '🔍', unlockRank: 0, sort: 3, enabled: true,
    params: { clueValue: 20, suppressCost: '无法压盖', desc: '巡视组进驻期间发现，线索+20，无法压盖。' } },
  { category: 'clue_source', id: 'audit', name: '审计移交', icon: '📊', unlockRank: 0, sort: 4, enabled: true,
    params: { clueValue: 12, suppressCost: '存款-10万', desc: '专项资金动作被审计发现，线索+12。' } },
  { category: 'clue_source', id: 'public_opinion', name: '网络舆情', icon: '🌐', unlockRank: 0, sort: 5, enabled: true,
    params: { clueValue: 8, suppressCost: '政绩-6', desc: '民生相关贪腐引发舆情，线索+8。' } },
  { category: 'clue_source', id: 'business_expose', name: '商人揭发', icon: '💼', unlockRank: 0, sort: 6, enabled: true,
    params: { clueValue: 25, suppressCost: '无法压盖', desc: '行贿失败/翻脸后商人揭发，线索+25。' } },
];

// ── 玩法三·接受审查：审查阶段（按文档阈值表）──
export const INVESTIGATION_STAGES: GameplayConfig[] = [
  { category: 'investigation_stage', id: 'fuhan', name: '谈话函询', icon: '📋', unlockRank: 0, sort: 1, enabled: true,
    params: { stageThreshold: 55, desc: '风险≥55触发，30天窗口期。' } },
  { category: 'investigation_stage', id: 'chushi', name: '初步核实', icon: '🔎', unlockRank: 0, sort: 2, enabled: true,
    params: { stageThreshold: 70, desc: '风险≥70触发，60天窗口期。' } },
  { category: 'investigation_stage', id: 'liangan', name: '立案审查', icon: '⚖️', unlockRank: 0, sort: 3, enabled: true,
    params: { stageThreshold: 85, desc: '风险≥85或线索≥70触发，90天。' } },
  { category: 'investigation_stage', id: 'liuzhi', name: '留置调查', icon: '🔒', unlockRank: 0, sort: 4, enabled: true,
    params: { stageThreshold: 0, desc: '涉案≥500万或供述链≥80触发，剥夺行动自由。' } },
];

// ── 玩法四·涉案资产：转移销赃（按文档表格，缺失数值合理推算）──
export const ASSET_TRANSFERS: GameplayConfig[] = [
  { category: 'asset_transfer', id: 'cash_transfer', name: '现金转移', icon: '💵', unlockRank: 8, sort: 1, enabled: true,
    params: { recoveryRate: 0.10, risk: 3, moral: 1, successRate: 0.85, cooldown: 30, desc: '转移现金至亲友处，追缴率-10%。' } },
  { category: 'asset_transfer', id: 'overseas_property', name: '购买海外房产', icon: '🏠', unlockRank: 8, sort: 2, enabled: true,
    params: { recoveryRate: 0.15, risk: 4, moral: 2, successRate: 0.80, cooldown: 45, desc: '购置海外房产转移资金，追缴率-15%。' } },
  { category: 'asset_transfer', id: 'hard_currency', name: '兑换硬通货', icon: '🥇', unlockRank: 8, sort: 3, enabled: true,
    params: { recoveryRate: 0.10, risk: 3, moral: 1, successRate: 0.88, cooldown: 30, desc: '兑换黄金/外币，追缴率-10%。' } },
  { category: 'asset_transfer', id: 'gift_relative', name: '转赠亲属', icon: '👨‍👩‍👧', unlockRank: 8, sort: 4, enabled: true,
    params: { recoveryRate: 0.05, risk: 2, moral: 2, successRate: 0.90, cooldown: 30, desc: '家庭内部转移，牵连家属。' } },
  { category: 'asset_transfer', id: 'destroy_evidence', name: '销毁证据', icon: '🔥', unlockRank: 8, sort: 5, enabled: true,
    params: { clueGain: -10, risk: 5, moral: 2, successRate: 0.70, cooldown: 60, desc: '烧毁账本票据，线索完整度-10。' } },
];

// ── 民心修行：17个为民动作（严格按设计文档参数表）──
export const POPULAR_SUPPORT_ACTIONS: GameplayConfig[] = [
  // Tab 二：亲民为民（走动联系群众类）6个
  { category: 'popularity', id: 'popular_visit_poor', name: '走访困难群众', icon: '🏠', unlockRank: 1, sort: 1, enabled: true,
    params: { popularGain: 2, cooldown: 45, livelihoodGain: 2, desc: '深入困难群众家中开展走访慰问，了解民情民意。' } },
  { category: 'popularity', id: 'popular_grassroot_survey', name: '基层调研', icon: '📋', unlockRank: 2, sort: 2, enabled: true,
    params: { popularGain: 2, cooldown: 45, desc: '深入基层开展调查研究，掌握第一手民情信息。' } },
  { category: 'popularity', id: 'popular_reception_day', name: '群众接待日', icon: '🤝', unlockRank: 3, sort: 3, enabled: true,
    params: { popularGain: 3, cooldown: 60, opinionReduction: 10, desc: '定期开展领导接待日，现场受理群众诉求。' } },
  { category: 'popularity', id: 'popular_paired_aid', name: '结对帮扶', icon: '👥', unlockRank: 4, sort: 4, enabled: true,
    params: { popularGain: 3, cooldown: 90, desc: '与困难群众结对帮扶，精准服务弱势群体。' } },
  { category: 'popularity', id: 'popular_village_stay', name: '驻村蹲点', icon: '🌾', unlockRank: 5, sort: 5, enabled: true,
    params: { popularGain: 4, cooldown: 120, desc: '深入农村基层驻村蹲点，推动政策落地落实。' } },
  { category: 'popularity', id: 'popular_open_review', name: '开门搞评议', icon: '🗣️', unlockRank: 7, sort: 6, enabled: true,
    params: { popularGain: 4, cooldown: 180, opinionReduction: 5, desc: '开放评议渠道，广泛征求群众对工作的意见建议。' } },
  // Tab 三：民生实事（干事创业类）6个
  { category: 'popularity', id: 'popular_resolve_legacy', name: '化解历史遗留问题', icon: '🔧', unlockRank: 6, sort: 7, enabled: true,
    params: { popularGain: 5, cooldown: 180, opinionReduction: 10, desc: '集中力量化解长期积累的历史遗留矛盾与纠纷。' } },
  { category: 'popularity', id: 'popular_welfare_project', name: '推动惠民工程', icon: '🏗️', unlockRank: 8, sort: 8, enabled: true,
    params: { popularGain: 5, cooldown: 180, livelihoodGain: 5, desc: '主导推进民生基础设施建设，提升群众生活品质。' } },
  { category: 'popularity', id: 'popular_promote_jobs', name: '促进就业增收', icon: '💼', unlockRank: 8, sort: 9, enabled: true,
    params: { popularGain: 3, cooldown: 120, livelihoodGain: 3, desc: '出台就业创业扶持政策，拓宽群众增收渠道。' } },
  { category: 'popularity', id: 'popular_edu_health', name: '提升教育医疗', icon: '🏫', unlockRank: 9, sort: 10, enabled: true,
    params: { popularGain: 4, cooldown: 180, livelihoodGain: 4, desc: '加大教育医疗投入，切实改善群众就医就学条件。' } },
  { category: 'popularity', id: 'popular_gov_transparency', name: '政务公开透明', icon: '📢', unlockRank: 10, sort: 11, enabled: true,
    params: { popularGain: 4, cooldown: 365, riskReduction: 5, desc: '全面推行政务公开，主动接受社会监督。' } },
  { category: 'popularity', id: 'popular_major_promise', name: '重大民生承诺兑现', icon: '🏅', unlockRank: 12, sort: 12, enabled: true,
    params: { popularGain: 6, cooldown: 365, livelihoodGain: 8, desc: '全面落实向人民群众作出的重大民生承诺事项。' } },
  // Tab 四：顺应民意（正风肃纪类）5个
  { category: 'popularity', id: 'popular_rectify_local', name: '整治群众身边不正之风', icon: '⚖️', unlockRank: 5, sort: 13, enabled: true,
    params: { popularGain: 4, cooldown: 90, teamIntegrityGain: 3, desc: '专项整治发生在群众身边的不正之风和腐败问题。' } },
  { category: 'popularity', id: 'popular_respond_opinion', name: '回应舆情关切', icon: '📡', unlockRank: 6, sort: 14, enabled: true,
    params: { popularGain: 3, cooldown: 60, desc: '及时主动回应社会舆情热点，消除群众疑虑与误解。' } },
  { category: 'popularity', id: 'popular_special_inspect', name: '专项督查整改', icon: '🔍', unlockRank: 8, sort: 15, enabled: true,
    params: { popularGain: 5, cooldown: 180, desc: '开展专项督查，推动突出问题整改落实到位。' } },
  { category: 'popularity', id: 'popular_lead_discipline', name: '带头正风肃纪行动', icon: '🎯', unlockRank: 10, sort: 16, enabled: true,
    params: { popularGain: 6, cooldown: 180, meritGain: 15, desc: '以身作则带头推进正风肃纪，树立廉洁自律表率。' } },
  { category: 'popularity', id: 'popular_mass_discipline', name: '正风肃纪专项行动', icon: '🚩', unlockRank: 12, sort: 17, enabled: true,
    params: { popularGain: 8, cooldown: 365, meritGain: 30, desc: '在全辖范围内开展大规模正风肃纪专项行动。' } },
];

// 全量配置表（供通用模板按 category 过滤）
export const ALL_GAMEPLAY_CONFIGS: GameplayConfig[] = [
  ...BRIBERY_CHANNELS,
  ...POWER_RENTS,
  ...EMBEZZLEMENTS,
  ...ASSET_HIDINGS,
  ...ASSET_TRANSFERS,
  ...CLUE_SOURCES,
  ...INVESTIGATION_STAGES,
  ...POPULAR_SUPPORT_ACTIONS,
];

// 按 category 获取配置
export function getConfigsByCategory(category: GameplayConfig['category']): GameplayConfig[] {
  return ALL_GAMEPLAY_CONFIGS.filter((c) => c.category === category && c.enabled);
}

// 按 id 获取单条配置
export function getConfigById(id: string): GameplayConfig | undefined {
  return ALL_GAMEPLAY_CONFIGS.find((c) => c.id === id);
}

// 统一解锁判断函数（全站复用）
export function isGameplayUnlocked(unlockRank: number, currentRank: number): boolean {
  return currentRank >= unlockRank;
}
```

<a id="srclibkpienginets"></a>
## `src/lib/kpiEngine.ts`

```typescript
/**
 * KPI 考核评分引擎
 *
 * 五层级差异化考核体系，符合真实政治逻辑：
 *   乡镇(1-3)  → 维稳、上级任务、农村工作为主，经济权重低
 *   县级(4-6)  → 经济+民生+稳定+政治可靠
 *   市级(7-9)  → 综合经济+城市建设+区域协调+政治稳定
 *   省级(10-11)→ 宏观经济+生态文明+共同富裕+政治可靠
 *   国家级(12+)→ 政治表现+战略执行+全局稳定
 *
 * 每层级设置：
 *   - 各维度权重（和为1）
 *   - 晋升所需综合得分门槛
 *   - 晋升所需同级排名（百分位）
 *   - 一票否决项（触发即失去晋升资格）
 */

// ─── 类型定义 ────────────────────────────────────────────────────────────────

/** 单个考核维度 */
export interface KpiDimension {
  /** 维度唯一key */
  key: string;
  /** 显示名称 */
  label: string;
  /** 副标题/说明 */
  desc: string;
  /** 权重 0-1 */
  weight: number;
  /** 原始分 0-100 */
  rawScore: number;
  /** 加权得分 */
  weightedScore: number;
  /** 是否接近预警线 */
  warning: boolean;
  /** 是否触发一票否决 */
  vetoed: boolean;
}

/** 一票否决项 */
export interface VetoItem {
  label: string;
  desc: string;
  triggered: boolean;
  value: number;
  threshold: number;
}

/** KPI 评估结果 */
export interface KpiResult {
  /** 综合得分 0-100 */
  totalScore: number;
  /** 各维度列表 */
  dimensions: KpiDimension[];
  /** 一票否决项列表 */
  vetoItems: VetoItem[];
  /** 是否存在一票否决 */
  hasVeto: boolean;
  /** 晋升所需综合分数门槛 */
  scoreThreshold: number;
  /** 当前排名百分位（越高越好，70=前30%，annualRankPct） */
  rankPct: number;
  /** 晋升所需最低排名百分位 */
  rankThreshold: number;
  /** 综合得分是否达标 */
  scoreReady: boolean;
  /** 排名是否达标 */
  rankReady: boolean;
  /** 是否具备晋升资格（分数+排名+无否决+任期） */
  eligible: boolean;
  /** 差距描述：未达标的核心原因 */
  gaps: string[];
  /** 层级标签（用于 UI 标题） */
  tierLabel: string;
}

// ─── 辅助：将0-100原始值线性映射，支持反向（值越低越好） ──────────────────
function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

// ─── 各层级考核定义 ──────────────────────────────────────────────────────────

interface TierConfig {
  label: string;
  /** 晋升所需综合分门槛 */
  scoreThreshold: number;
  /** 晋升所需 annualRankPct 最低值（越高代表排名越靠前） */
  rankThreshold: number;
  dims: {
    key: string;
    label: string;
    desc: string;
    weight: number;
    /** 从 save 字段计算 0-100 分值 */
    compute: (s: KpiSaveSnapshot) => number;
    /** 警告线（低于此值时标红） */
    warnLine: number;
  }[];
  vetoRules: {
    label: string;
    desc: string;
    /** 返回 true = 触发否决 */
    check: (s: KpiSaveSnapshot) => { triggered: boolean; value: number; threshold: number };
  }[];
}

/** 传入 KPI 引擎所需的存档字段快照 */
export interface KpiSaveSnapshot {
  rankLevel: number;
  popularSupport: number;          // 民心值 0-100
  securityIndex: number;
  cityGdp: number;
  cityLivelihood: number;
  cityEcology: number;
  cityBusiness: number;
  bossFavor: number;
  boss2Favor: number;
  boss3Favor: number;
  annualRankPct: number;
  taxRevenue: number;
  tenureYears: number;
  meritPoints: number;
}

// ── 乡镇级（rank 1-3） ──
const TIER_TOWN: TierConfig = {
  label: '乡镇基层',
  scoreThreshold: 72,
  rankThreshold: 55,
  dims: [
    {
      key: 'stability',
      label: '社会稳定',
      desc: '治安秩序、信访控制、群体事件防范',
      weight: 0.25,
      compute: s => clamp(s.securityIndex),
      warnLine: 30,
    },
    {
      key: 'task',
      label: '完成上级任务',
      desc: '上级交办硬指标完成度、上级认可度',
      weight: 0.20,
      compute: s => clamp(s.bossFavor),
      warnLine: 35,
    },
    {
      key: 'rural',
      label: '农村工作',
      desc: '农村环境整治、农田水利、村级管理',
      weight: 0.20,
      compute: s => clamp((s.cityLivelihood + s.cityEcology) / 2),
      warnLine: 25,
    },
    {
      key: 'popularity',
      label: '群众口碑',
      desc: '基层群众满意度、民心向背',
      weight: 0.10,
      compute: s => clamp(s.popularSupport),
      warnLine: 40,
    },
    {
      key: 'party_build',
      label: '基层党建',
      desc: '党风廉政、组织生活、党员发展',
      weight: 0.15,
      compute: s => clamp(s.popularSupport),
      warnLine: 40,
    },
    {
      key: 'livelihood',
      label: '民生保障',
      desc: '低保发放、困难救助、基础设施',
      weight: 0.10,
      compute: s => clamp(s.cityLivelihood),
      warnLine: 25,
    },
  ],
  vetoRules: [
    {
      label: '重大群体性事件',
      desc: '安全稳定指数过低，发生重大群体事件',
      check: s => ({ triggered: s.securityIndex < 20, value: s.securityIndex, threshold: 20 }),
    },
    {
      label: '民心严重流失',
      desc: '群众满意度极低，民心严重流失',
      check: s => ({ triggered: s.popularSupport < 25, value: s.popularSupport, threshold: 25 }),
    },
  ],
};

// ── 县级（rank 4-6） ──
const TIER_COUNTY: TierConfig = {
  label: '县处级',
  scoreThreshold: 75,
  rankThreshold: 60,
  dims: [
    {
      key: 'economy',
      label: '经济发展',
      desc: 'GDP增长、财政收入、招商引资',
      weight: 0.30,
      compute: s => clamp((s.cityGdp * 0.5 + Math.min(100, s.taxRevenue * 2) * 0.3 + s.cityBusiness * 0.2)),
      warnLine: 30,
    },
    {
      key: 'livelihood',
      label: '民生改善',
      desc: '教育医疗投入、就业率、居民收入',
      weight: 0.20,
      compute: s => clamp(s.cityLivelihood),
      warnLine: 30,
    },
    {
      key: 'popularity',
      label: '群众口碑',
      desc: '基层群众满意度、民心向背',
      weight: 0.05,
      compute: s => clamp(s.popularSupport),
      warnLine: 40,
    },
    {
      key: 'stability',
      label: '社会稳定',
      desc: '信访数量、治安案件、群体事件',
      weight: 0.20,
      compute: s => clamp(s.securityIndex),
      warnLine: 25,
    },
    {
      key: 'task',
      label: '完成上级任务',
      desc: '县域硬指标完成度、上级评价',
      weight: 0.15,
      compute: s => clamp(s.bossFavor),
      warnLine: 35,
    },
    {
      key: 'political',
      label: '政治可靠性',
      desc: '上级认可度、班子团结、政策执行',
      weight: 0.10,
      compute: s => clamp((s.boss2Favor + s.boss3Favor) / 2),
      warnLine: 30,
    },
  ],
  vetoRules: [
    {
      label: '重大群体性事件',
      desc: '社会稳定指数过低，发生重大群体事件',
      check: s => ({ triggered: s.securityIndex < 22, value: s.securityIndex, threshold: 22 }),
    },
    {
      label: 'GDP连续倒数',
      desc: '经济发展严重滞后，GDP指数过低',
      check: s => ({ triggered: s.cityGdp < 20, value: s.cityGdp, threshold: 20 }),
    },
    {
      label: '民心严重流失',
      desc: '群众满意度极低，民心严重流失',
      check: s => ({ triggered: s.popularSupport < 20, value: s.popularSupport, threshold: 20 }),
    },
  ],
};

// ── 市级（rank 7-9） ──
const TIER_CITY: TierConfig = {
  label: '地市级',
  scoreThreshold: 78,
  rankThreshold: 65,
  dims: [
    {
      key: 'economy',
      label: '综合经济',
      desc: 'GDP增长、财政收入、产业结构、营商环境',
      weight: 0.25,
      compute: s => clamp((s.cityGdp * 0.4 + s.cityBusiness * 0.35 + Math.min(100, s.taxRevenue * 1.5) * 0.25)),
      warnLine: 35,
    },
    {
      key: 'urban',
      label: '城市建设',
      desc: '城市规划、基础设施、环境质量',
      weight: 0.20,
      compute: s => clamp((s.cityEcology * 0.6 + s.cityBusiness * 0.4)),
      warnLine: 30,
    },
    {
      key: 'coordination',
      label: '区域协调',
      desc: '县域发展均衡度、跨县协调、同级排名',
      weight: 0.15,
      compute: s => clamp(s.annualRankPct),
      warnLine: 30,
    },
    {
      key: 'popularity',
      label: '群众口碑',
      desc: '基层群众满意度、民心向背',
      weight: 0.05,
      compute: s => clamp(s.popularSupport),
      warnLine: 40,
    },
    {
      key: 'stability',
      label: '政治稳定',
      desc: '信访管控、群体事件、社会治安',
      weight: 0.15,
      compute: s => clamp(s.securityIndex),
      warnLine: 28,
    },
    {
      key: 'political',
      label: '政治可靠性',
      desc: '上级信任、政策执行力、班子团结',
      weight: 0.10,
      compute: s => clamp(s.bossFavor),
      warnLine: 35,
    },
    {
      key: 'reputation',
      label: '干部口碑',
      desc: '班子评价、群众满意度',
      weight: 0.10,
      compute: s => clamp((s.boss2Favor + s.cityLivelihood) / 2),
      warnLine: 30,
    },
  ],
  vetoRules: [
    {
      label: '重大安全事故',
      desc: '社会稳定指数过低，发生重大安全事故',
      check: s => ({ triggered: s.securityIndex < 25, value: s.securityIndex, threshold: 25 }),
    },
    {
      label: '重大环境污染',
      desc: '生态环境指数过低，发生重大污染事件',
      check: s => ({ triggered: s.cityEcology < 15, value: s.cityEcology, threshold: 15 }),
    },
    {
      label: '班子严重分裂',
      desc: '上级关系极度恶化，班子无法正常运转',
      check: s => ({ triggered: s.boss2Favor < 25 && s.boss3Favor < 25, value: Math.min(s.boss2Favor, s.boss3Favor), threshold: 25 }),
    },
    {
      label: '民心严重流失',
      desc: '群众满意度极低，民心严重流失',
      check: s => ({ triggered: s.popularSupport < 15, value: s.popularSupport, threshold: 15 }),
    },
  ],
};

// ── 省级（rank 10-11） ──
const TIER_PROVINCE: TierConfig = {
  label: '省部级',
  scoreThreshold: 82,
  rankThreshold: 72,
  dims: [
    {
      key: 'macro_economy',
      label: '宏观经济',
      desc: 'GDP增速、财政收入、产业转型升级',
      weight: 0.25,
      compute: s => clamp((s.cityGdp * 0.5 + Math.min(100, s.taxRevenue * 1.2) * 0.3 + s.cityBusiness * 0.2)),
      warnLine: 40,
    },
    {
      key: 'ecology',
      label: '生态文明',
      desc: '环境质量、节能减排、生态保护红线',
      weight: 0.20,
      compute: s => clamp(s.cityEcology),
      warnLine: 35,
    },
    {
      key: 'common_wealth',
      label: '共同富裕',
      desc: '收入差距、民生保障、脱贫成果巩固',
      weight: 0.20,
      compute: s => clamp(s.cityLivelihood),
      warnLine: 35,
    },
    {
      key: 'political',
      label: '政治可靠性',
      desc: '中央认可度、重大政策执行、政治立场',
      weight: 0.20,
      compute: s => clamp((s.bossFavor * 0.6 + s.boss2Favor * 0.4)),
      warnLine: 40,
    },
    {
      key: 'stability',
      label: '全局稳定',
      desc: '省内治安、群体事件控制、信访管控',
      weight: 0.10,
      compute: s => clamp(s.securityIndex),
      warnLine: 35,
    },
    {
      key: 'popularity',
      label: '群众口碑',
      desc: '群众满意度、民心向背',
      weight: 0.05,
      compute: s => clamp(s.popularSupport),
      warnLine: 40,
    },
  ],
  vetoRules: [
    {
      label: '生态文明硬约束',
      desc: '生态指数过低，未完成环保约束性指标',
      check: s => ({ triggered: s.cityEcology < 20, value: s.cityEcology, threshold: 20 }),
    },
    {
      label: '共同富裕严重滞后',
      desc: '民生指数过低，脱贫攻坚/共同富裕任务未完成',
      check: s => ({ triggered: s.cityLivelihood < 20, value: s.cityLivelihood, threshold: 20 }),
    },
    {
      label: '重大稳定事件',
      desc: '省内发生重大群体性事件，社会稳定失控',
      check: s => ({ triggered: s.securityIndex < 28, value: s.securityIndex, threshold: 28 }),
    },
    {
      label: '民心严重流失',
      desc: '群众满意度极低，民心严重流失',
      check: s => ({ triggered: s.popularSupport < 10, value: s.popularSupport, threshold: 10 }),
    },
    {
      label: '中央信任危机',
      desc: '上级好感度极低，政治可靠性存疑',
      check: s => ({ triggered: s.bossFavor < 20, value: s.bossFavor, threshold: 20 }),
    },
  ],
};

// ── 国家级（rank 12+） ──
const TIER_NATIONAL: TierConfig = {
  label: '国家级',
  scoreThreshold: 88,
  rankThreshold: 80,
  dims: [
    {
      key: 'political_perf',
      label: '政治表现',
      desc: '政治忠诚、政治纪律、政治立场鲜明',
      weight: 0.35,
      compute: s => clamp((s.bossFavor * 0.5 + s.popularSupport * 0.5)),
      warnLine: 50,
    },
    {
      key: 'popularity',
      label: '群众口碑',
      desc: '全国群众满意度、民心向背',
      weight: 0.05,
      compute: s => clamp(s.popularSupport),
      warnLine: 40,
    },
    {
      key: 'strategy',
      label: '国家战略执行',
      desc: '重大战略任务完成度、中央部署落实',
      weight: 0.30,
      compute: s => clamp((s.boss2Favor * 0.5 + s.boss3Favor * 0.5)),
      warnLine: 45,
    },
    {
      key: 'stability',
      label: '全局稳定',
      desc: '国家安全、社会稳定、综合治理',
      weight: 0.20,
      compute: s => clamp((s.securityIndex * 0.5 + s.cityGdp * 0.3 + s.cityLivelihood * 0.2)),
      warnLine: 40,
    },
    {
      key: 'reputation',
      label: '干部口碑',
      desc: '班子评价、群众口碑、历史贡献',
      weight: 0.10,
      compute: s => clamp(s.annualRankPct),
      warnLine: 40,
    },
  ],
  vetoRules: [
    {
      label: '重大政治风险',
      desc: '政治可靠性严重不足，存在政治风险',
      check: s => ({ triggered: s.bossFavor < 25, value: s.bossFavor, threshold: 25 }),
    },
    {
      label: '民心严重流失',
      desc: '全国群众满意度极低，民心严重流失',
      check: s => ({ triggered: s.popularSupport < 8, value: s.popularSupport, threshold: 8 }),
    },
  ],
};

// ─── 按职级获取层级配置 ─────────────────────────────────────────────────────
function getTierConfig(rankLevel: number): TierConfig {
  if (rankLevel <= 3)  return TIER_TOWN;
  if (rankLevel <= 6)  return TIER_COUNTY;
  if (rankLevel <= 9)  return TIER_CITY;
  if (rankLevel <= 11) return TIER_PROVINCE;
  return TIER_NATIONAL;
}

// ─── 主入口：计算 KPI 评估结果 ───────────────────────────────────────────────
export function computeKpi(s: KpiSaveSnapshot): KpiResult {
  const cfg = getTierConfig(s.rankLevel);

  // 计算各维度
  const dimensions: KpiDimension[] = cfg.dims.map(d => {
    const rawScore = Math.round(d.compute(s));
    const weightedScore = Math.round(rawScore * d.weight);
    return {
      key: d.key,
      label: d.label,
      desc: d.desc,
      weight: d.weight,
      rawScore,
      weightedScore,
      warning: rawScore < d.warnLine,
      vetoed: false,
    };
  });

  // 综合得分
  const totalScore = Math.min(100, dimensions.reduce((sum, d) => sum + d.weightedScore, 0));

  // 一票否决判断
  const vetoItems: VetoItem[] = cfg.vetoRules.map(r => {
    const res = r.check(s);
    return { label: r.label, desc: r.desc, ...res };
  });
  const hasVeto = vetoItems.some(v => v.triggered);

  // 达标判断
  const scoreReady = totalScore >= cfg.scoreThreshold;
  const rankReady  = s.annualRankPct >= cfg.rankThreshold;
  const eligible   = scoreReady && rankReady && !hasVeto;

  // 差距描述
  const gaps: string[] = [];
  if (!scoreReady) {
    const diff = cfg.scoreThreshold - totalScore;
    gaps.push(`综合得分 ${totalScore}分，距门槛 ${cfg.scoreThreshold}分还差 ${diff}分`);
    // 找最弱维度
    const weakest = [...dimensions].sort((a, b) => a.rawScore - b.rawScore)[0];
    if (weakest && weakest.rawScore < 50) {
      gaps.push(`"${weakest.label}"得分偏低（${weakest.rawScore}分），建议重点提升`);
    }
  }
  if (!rankReady) {
    gaps.push(`同级排名 ${s.annualRankPct}%，需达到 ${cfg.rankThreshold}% 才具备晋升资格`);
  }
  vetoItems.filter(v => v.triggered).forEach(v => {
    gaps.push(`⛔ 一票否决：${v.label}（当前 ${v.value}，需 ≥${v.threshold}）`);
  });

  return {
    totalScore,
    dimensions,
    vetoItems,
    hasVeto,
    scoreThreshold: cfg.scoreThreshold,
    rankPct: s.annualRankPct,
    rankThreshold: cfg.rankThreshold,
    scoreReady,
    rankReady,
    eligible,
    gaps,
    tierLabel: cfg.label,
  };
}

// ─── 获取当前层级的核心考核指标（用于主界面面板） ─────────────────────────
export interface KpiPanelItem {
  key: string;
  label: string;
  desc: string;
  score: number;
  weight: number;
  warning: boolean;
  vetoed: boolean;
  isTop: boolean; // 是否为权重最大的核心指标（前3名）
}

export function getKpiPanel(s: KpiSaveSnapshot): KpiPanelItem[] {
  const result = computeKpi(s);
  const sorted = [...result.dimensions].sort((a, b) => b.weight - a.weight);
  return sorted.map((d, i) => ({
    key: d.key,
    label: d.label,
    desc: d.desc,
    score: d.rawScore,
    weight: d.weight,
    warning: d.warning,
    vetoed: d.vetoed,
    isTop: i < 3,
  }));
}

/** 获取晋升总结文字 */
export function getPromotionSummary(kpi: KpiResult, tenureYears: number, requiredTenureYears: number): string {
  if (kpi.hasVeto) return '⛔ 存在一票否决项，暂无晋升资格';
  if (tenureYears < requiredTenureYears) return `⏳ 任期未满（${tenureYears}/${requiredTenureYears}年）`;
  if (!kpi.scoreReady) return `📊 综合考核得分 ${kpi.totalScore}分（门槛 ${kpi.scoreThreshold}分）`;
  if (!kpi.rankReady)  return `📈 同级排名 ${kpi.rankPct}%（需 ≥${kpi.rankThreshold}%）`;
  return '✅ 已具备晋升条件，等待换届窗口期';
}
```

<a id="srclibleadersts"></a>
## `src/lib/leaders.ts`

```typescript
/**
 * 共享领导人名单工具
 * 基于存档ID生成稳定的领导人名字，全游戏统一使用此模块
 * 保证各功能（领导班子、专线电话、战区管理、省份管理、军委等）名字一致
 */

const MALE_NAMES = [
  '王建国', '李明志', '张伟华', '刘国强', '陈志远', '赵国栋', '孙建平', '周海龙',
  '马志刚', '吴国梁', '郑建军', '韩德政', '冯国庆', '朱建华', '沈志明', '徐国兴',
  '杨志刚', '曾建国', '林海清', '唐明远', '魏德志', '何建平', '高国兴', '谢志远',
  '宋明华', '萧建军', '陆志民', '许国庆', '江德平', '钱明志',
];
const FEMALE_NAMES = [
  '王秀兰', '李玉华', '张敏华', '刘淑华', '陈秀兰', '赵丽萍', '孙燕华', '周慧敏',
];

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = Math.imul(31, h) + s.charCodeAt(i) | 0; }
  return Math.abs(h);
}

function seededName(seed: string, female = false): string {
  const pool = female ? FEMALE_NAMES : MALE_NAMES;
  return pool[hashSeed(seed) % pool.length];
}

// ───────────────────────────────────────────────────
// 顶层核心领导（基于 saveId 生成，全局唯一）
// ───────────────────────────────────────────────────
export function getTopLeaders(saveId: string, playerName = '') {
  const n = (id: string, female = false) => seededName(saveId + id, female);
  return {
    // 七常委
    generalSecretary:   n('genSec'),        // 总执书记
    premier:            playerName || n('premier'),  // 国政院院理（可被玩家替换）
    npcChairman:        n('npcChair'),       // 全国议政院议政委员长
    ccdiBoss:           n('ccdi'),           // 中枢纪委书记
    cppccChair:         n('cppcc'),          // 全国参政院主席
    lawComm:            n('lawComm'),        // 中央政法委书记
    propDept:           n('propDept'),       // 中枢宣传部部长
    // 国政院副院理
    vp1:  n('vp1'),    // 常务副院理
    vp2:  n('vp2'),    // 第二副院理
    vp3:  n('vp3'),    // 第三副院理
    // 国政委员
    sc1:  n('sc1'),
    sc2:  n('sc2'),
    sg:   n('sg'),     // 国政院秘书长
    // 军委副主席
    cmcVp1: n('cmcVp1') + '上将',
    cmcVp2: n('cmcVp2') + '上将',
  };
}

// ───────────────────────────────────────────────────
// 国政院各部委部长（24个部委）
// ───────────────────────────────────────────────────
export const MINISTRY_LEADER_KEYS = [
  { id: 'min_fa',      title: '外交部部长',                  shortTitle: '外交部' },
  { id: 'min_def',     title: '国防部部长',                  shortTitle: '国防部' },
  { id: 'min_ndrc',    title: '国家发展改革委主任',          shortTitle: '发改委' },
  { id: 'min_edu',     title: '教育部部长',                  shortTitle: '教育部' },
  { id: 'min_sci',     title: '科学技术部部长',              shortTitle: '科技部' },
  { id: 'min_miit',    title: '工业和信息化部部长',          shortTitle: '工信部' },
  { id: 'min_mps',     title: '公安部部长',                  shortTitle: '公安部' },
  { id: 'min_mca',     title: '民政部部长',                  shortTitle: '民政部' },
  { id: 'min_moj',     title: '司法部部长',                  shortTitle: '司法部' },
  { id: 'min_mof',     title: '财政部部长',                  shortTitle: '财政部' },
  { id: 'min_mohrss',  title: '人力资源和社会保障部部长',    shortTitle: '人社部' },
  { id: 'min_mnr',     title: '自然资源部部长',              shortTitle: '自然资源部' },
  { id: 'min_mee',     title: '生态环境部部长',              shortTitle: '生态环境部' },
  { id: 'min_mohurd',  title: '住房和城乡建设部部长',        shortTitle: '住建部' },
  { id: 'min_mot',     title: '交通运输部部长',              shortTitle: '交通运输部' },
  { id: 'min_mwr',     title: '水利部部长',                  shortTitle: '水利部' },
  { id: 'min_moa',     title: '农业农村部部长',              shortTitle: '农业农村部' },
  { id: 'min_mofcom',  title: '商务部部长',                  shortTitle: '商务部' },
  { id: 'min_mct',     title: '文化和旅游部部长',            shortTitle: '文旅部' },
  { id: 'min_nhc',     title: '国家卫生健康委员会主任',      shortTitle: '卫健委' },
  { id: 'min_mem',     title: '应急管理部部长',              shortTitle: '应急管理部' },
  { id: 'min_audit',   title: '审计署审计长',                shortTitle: '审计署' },
  { id: 'min_org',     title: '中枢组织部部长',              shortTitle: '中枢组部' },
  { id: 'min_united',  title: '中枢统战部部长',              shortTitle: '统战部' },
] as const;

export function getMinistryLeaders(saveId: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const m of MINISTRY_LEADER_KEYS) {
    result[m.id] = seededName(saveId + m.id);
    result[m.shortTitle] = result[m.id];
    result[m.title] = result[m.id];
  }
  return result;
}

// ───────────────────────────────────────────────────
// 省委书记 & 省长（24个省/直辖市/自治区）
// ───────────────────────────────────────────────────
export const PROVINCE_LIST = [
  '北京', '天津', '上海', '重庆',
  '广东', '浙江', '江苏', '山东',
  '四川', '河南', '湖北', '湖南',
  '河北', '安徽', '福建', '陕西',
  '黑龙江', '吉林', '辽宁', '内蒙古',
  '广西', '云南', '贵州', '新疆',
] as const;

export type ProvinceName = typeof PROVINCE_LIST[number];

export function getProvinceLeaders(saveId: string): Record<string, { secretary: string; governor: string }> {
  const result: Record<string, { secretary: string; governor: string }> = {};
  PROVINCE_LIST.forEach((prov, i) => {
    result[prov] = {
      secretary: seededName(saveId + 'pbs_' + i),
      governor:  seededName(saveId + 'pgv_' + i),
    };
  });
  return result;
}

// ───────────────────────────────────────────────────
// 军委委员 & 各战区司令/政委
// ───────────────────────────────────────────────────
export const THEATER_LIST = [
  { id: 'east',   name: '东部战区',   location: '南京',   emoji: '⚔️' },
  { id: 'south',  name: '南部战区',   location: '广州',   emoji: '🌊' },
  { id: 'west',   name: '西部战区',   location: '成都',   emoji: '🏔️' },
  { id: 'north',  name: '北部战区',   location: '沈阳',   emoji: '❄️' },
  { id: 'center', name: '中部战区',   location: '北京',   emoji: '🏯' },
] as const;

export function getTheaterLeaders(saveId: string): Record<string, { commander: string; commissar: string }> {
  const result: Record<string, { commander: string; commissar: string }> = {};
  THEATER_LIST.forEach(t => {
    result[t.id] = {
      commander: seededName(saveId + 'tc_' + t.id) + '上将',
      commissar: seededName(saveId + 'tp_' + t.id) + '上将',
    };
  });
  return result;
}

// ───────────────────────────────────────────────────
// 快捷获取：专线电话对象（副院理/部长/省委书记）
// ───────────────────────────────────────────────────
export interface HotlineEntry {
  id: string;
  name: string;
  title: string;
  org: string;
  level: number;
  icon: string;
}

export function getHotlineTargets(saveId: string): HotlineEntry[] {
  const top = getTopLeaders(saveId);
  const prov = getProvinceLeaders(saveId);
  const mins = getMinistryLeaders(saveId);

  return [
    { id: 'vp1', name: top.vp1,  title: '国政院常务副院理', org: '国政院', level: 13, icon: '🏛️' },
    { id: 'vp2', name: top.vp2,  title: '国政院副院理（二）', org: '国政院', level: 13, icon: '🏛️' },
    { id: 'vp3', name: top.vp3,  title: '国政院副院理（三）', org: '国政院', level: 13, icon: '🏛️' },
    { id: 'm1',  name: mins['min_mof'],    title: '财政部部长',  org: '财政部', level: 12, icon: '💰' },
    { id: 'm2',  name: mins['min_fa'],     title: '外交部部长',  org: '外交部', level: 12, icon: '🌐' },
    { id: 'm3',  name: mins['min_miit'],   title: '工信部部长',  org: '工信部', level: 12, icon: '🏭' },
    { id: 'm4',  name: mins['min_mps'],    title: '公安部部长',  org: '公安部', level: 12, icon: '🛡️' },
    { id: 'm5',  name: mins['min_ndrc'],   title: '发改委主任',  org: '发改委', level: 12, icon: '📊' },
    { id: 'p1',  name: prov['广东'].secretary, title: '广东省委书记', org: '广东省', level: 11, icon: '🗺️' },
    { id: 'p2',  name: prov['浙江'].secretary, title: '浙江省委书记', org: '浙江省', level: 11, icon: '🗺️' },
    { id: 'p3',  name: prov['江苏'].secretary, title: '江苏省委书记', org: '江苏省', level: 11, icon: '🗺️' },
    { id: 'p4',  name: prov['北京'].secretary, title: '北京市委书记', org: '北京市', level: 11, icon: '🗺️' },
    { id: 'p5',  name: prov['上海'].secretary, title: '上海市委书记', org: '上海市', level: 11, icon: '🗺️' },
  ];
}
```

<a id="srclibleadershipteamts"></a>
## `src/lib/leadershipTeam.ts`

```typescript
// 领导班子配置——按职级分层定义班子成员职位
// 班子成员的姓名在游戏存档中动态生成并持久化

export interface TeamMember {
  position: string;   // 职位
  name: string;       // 姓名（运行时生成）
  favorability: number; // 好感度 0-100
}

export interface LeadershipConfig {
  size: number;
  positions: string[];
  levelName: string;  // 班子所属层级名称
}

// ─────────────────────────────────────────────
// 各职级班子配置（符合中国现实党政体制）
// ─────────────────────────────────────────────
const LEADERSHIP_CONFIGS: Record<string, LeadershipConfig> = {
  // 乡镇党委常委会（9人）
  town: {
    levelName: '镇党委常委会',
    size: 9,
    positions: [
      '党委书记',
      '党委副书记、镇长',
      '专职党委副书记',
      '纪委书记',
      '组织委员',
      '宣传委员',
      '政法委员',
      '武装部长',
      '议政院主席',
    ],
  },
  // 县委常委会（11人）
  county: {
    levelName: '县委常委会',
    size: 11,
    positions: [
      '县委书记',
      '县委副书记、县长',
      '专职县委副书记',
      '县纪委书记',
      '县委组织部长',
      '县委宣传部长',
      '县委政法委书记',
      '县人武部部长',
      '常务副县长（县委常委）',
      '县委统战部长',
      '议政院主任',
    ],
  },
  // 市委常委会（13人）
  city: {
    levelName: '市委常委会',
    size: 13,
    positions: [
      '市委书记',
      '市委副书记、市长',
      '专职市委副书记',
      '市纪委书记',
      '市委组织部长',
      '市委宣传部长',
      '市委政法委书记',
      '常务副市长（市委常委）',
      '市委统战部长',
      '市人武部政委',
      '市委秘书长',
      '市委副书记（专职）',
      '议政院常委会主任',
    ],
  },
  // 省委常委会（13人）
  province: {
    levelName: '省委常委会',
    size: 13,
    positions: [
      '省委书记',
      '省委副书记、省长',
      '专职省委副书记',
      '省纪委书记',
      '省委组织部长',
      '省委宣传部长',
      '省委政法委书记',
      '常务副省长（省委常委）',
      '省委统战部长',
      '省委秘书长',
      '省军区政委',
      '省委副书记',
      '议政院常委会主任',
    ],
  },
  // 部党委常委会（9人）
  ministry: {
    levelName: '部党委常委会',
    size: 9,
    positions: [
      '部党委书记（部长）',
      '部党委副书记（常务副部长）',
      '副部长（党委委员）',
      '副部长（党委委员）',
      '纪检组长',
      '部长助理（党委委员）',
      '机关党委书记（党委委员）',
      '总工程师（党委委员）',
      '政策研究室主任（党委委员）',
    ],
  },
  // 中枢决策常委会（7人）
  national: {
    levelName: '中枢决策常委会',
    size: 7,
    positions: [
      '常委（总执书记）',
      '常委（国政院院理）',
      '常委（全国议政院常委会议政委员长）',
      '常委（全国参政院主席）',
      '常委（中枢纪委书记）',
      '常委（国政院常务副院理）',
      '常委（中枢书记处书记）',
    ],
  },
};

/** 根据职级数值返回班子配置 */
export function getLeadershipConfig(rankLevel: number): LeadershipConfig {
  if (rankLevel <= 3) return LEADERSHIP_CONFIGS.town;
  if (rankLevel <= 6) return LEADERSHIP_CONFIGS.county;
  if (rankLevel <= 9) return LEADERSHIP_CONFIGS.city;
  if (rankLevel <= 11) return LEADERSHIP_CONFIGS.province;
  if (rankLevel <= 13) return LEADERSHIP_CONFIGS.ministry;
  return LEADERSHIP_CONFIGS.national;
}

// ─────────────────────────────────────────────
// 姓名生成工具
// ─────────────────────────────────────────────
import { ensureNpcNamePoolLoaded, pickNpcName } from '@/lib/npcNamePool';

/** 生成一套完整的领导班子成员列表（玩家本人占第一位，其余为AI成员） */
export async function generateTeamMembers(rankLevel: number, playerName: string, playerPosition?: string): Promise<TeamMember[]> {
  await ensureNpcNamePoolLoaded();
  const config = getLeadershipConfig(rankLevel);
  const members: TeamMember[] = [];
  const usedNames: string[] = [playerName];

  for (let i = 0; i < config.size; i++) {
    if (i === 0) {
      // 第一位是玩家自己：优先使用传入的 playerPosition（当前实际职位），否则取班子第一职位
      members.push({
        position: playerPosition || config.positions[0],
        name: playerName,
        favorability: 100, // 玩家自己好感度固定100（不参与AI投票）
      });
    } else {
      const name = pickNpcName(usedNames);
      usedNames.push(name);
      members.push({
        position: config.positions[i] ?? `委员${i}`,
        name,
        favorability: 40 + Math.floor(Math.random() * 31), // 40-70随机好感度
      });
    }
  }
  return members;
}

// ─────────────────────────────────────────────
// AI 投票逻辑
// ─────────────────────────────────────────────
export type VoteResult = 'support' | 'oppose' | 'abstain';

/**
 * 根据好感度计算 AI 成员的投票结果
 * 好感度≥70：大概率支持（80%支持，15%弃权，5%反对）
 * 好感度40-69：中性判断（50%支持，30%弃权，20%反对）
 * 好感度<40：大概率反对（15%支持，15%弃权，70%反对）
 */
export function calcAiVote(favorability: number): VoteResult {
  const r = Math.random();
  if (favorability >= 70) {
    if (r < 0.80) return 'support';
    if (r < 0.95) return 'abstain';
    return 'oppose';
  }
  if (favorability >= 40) {
    if (r < 0.50) return 'support';
    if (r < 0.80) return 'abstain';
    return 'oppose';
  }
  if (r < 0.15) return 'support';
  if (r < 0.30) return 'abstain';
  return 'oppose';
}

/**
 * 计算投票通过后的效果倍率
 * 全票通过（100%支持）：1.2×
 * 绝对多数（≥80%）：1.1×
 * 简单多数（50-79%）：1.0×
 * 勉强过半（刚好过半，<55%）：0.9×
 * 未通过：0（否决，返回 null 表示使用否决逻辑）
 */
export function calcVoteMultiplier(supportCount: number, total: number): number | null {
  const ratio = supportCount / total;
  if (ratio < 0.5) return null; // 否决
  if (ratio === 1.0) return 1.2;
  if (ratio >= 0.8) return 1.1;
  if (ratio >= 0.55) return 1.0;
  return 0.9; // 勉强过半
}
```

<a id="srclibnanoidts"></a>
## `src/lib/nanoid.ts`

```typescript
// 轻量 ID 生成（无依赖，供游戏逻辑模块使用）
const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** 生成 12 位随机 ID */
export function nanoid(size = 12): string {
  let id = '';
  for (let i = 0; i < size; i++) {
    id += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return id;
}
```

<a id="srclibnpcnamepoolts"></a>
## `src/lib/npcNamePool.ts`

```typescript
// NPC 姓名名册（内存缓存）
// 所有 NPC 姓名取自管理员维护的 npc_names 名册（完整姓名）；
// 名册为空时自动熔断，按内置兜底词库生成，保证游戏不中断。
import { supabase } from '@/client/supabase';

let names: string[] = [];
let loaded = false;
let loadingPromise: Promise<void> | null = null;

// 熔断兜底词库：名册为空或加载失败时使用，避免硬编码散落各处
const FALLBACK_SURNAMES = ['王','李','张','刘','陈','赵','孙','周','吴','郑','冯','许','韩','唐','曹','邓','杨','林','黄','胡'];
const FALLBACK_GIVENS   = ['建国','志远','国华','宏伟','明远','国强','兴华','德胜','正阳','向阳','文斌','大勇','海峰','志刚','东升','卫国','思远','长征','光辉','振兴'];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 预加载名册到内存（幂等，可安全多次调用） */
export async function ensureNpcNamePoolLoaded(): Promise<void> {
  if (loaded) return;
  if (!loadingPromise) {
    loadingPromise = (async () => {
      try {
        const res = await supabase.from('npc_names').select('name').limit(2000);
        names = (res.data ?? []).map((r: { name: string }) => r.name);
      } catch {
        names = [];
      }
      loaded = true;
    })();
  }
  await loadingPromise;
}

/** 名册是否可用（用于展示熔断状态） */
export function npcNamesAvailable(): boolean {
  return names.length > 0;
}

/** 自动熔断：名册为空时按兜底词库生成一个姓名 */
function fallbackName(): string {
  return rand(FALLBACK_SURNAMES) + rand(FALLBACK_GIVENS);
}

/**
 * 从名册生成一个完整 NPC 姓名
 * @param exclude 需要避开的已用姓名（同套班子内去重）
 */
export function pickNpcName(exclude: string[] = []): string {
  const pool = names.length > 0 ? names : [];
  let name = '';
  let attempts = 0;
  if (pool.length > 0) {
    do {
      name = rand(pool);
      attempts++;
    } while (exclude.includes(name) && attempts < 50);
    if (!exclude.includes(name)) return name;
  }
  // 名册为空或全部命中 exclude → 熔断兜底
  do {
    name = fallbackName();
    attempts++;
  } while (exclude.includes(name) && attempts < 50);
  return name;
}

/** 仅取「名」（用于子女：家族姓 + 名）；名册为空时熔断兜底 */
export function pickGivenName(): string {
  if (names.length > 0) {
    // 从名册姓名中截取名（去掉首字姓氏）
    const full = rand(names);
    return full.length > 1 ? full.slice(1) : full;
  }
  return rand(FALLBACK_GIVENS);
}
```

<a id="srclibpositionboardts"></a>
## `src/lib/positionBoard.ts`

```typescript
// 位置棋盘模块（派系晋升联动 §一.2）
// 基于官职数组构建棋盘席位，按派系关系值确定性分配控制权
import {
  COUNTY_OFFICIAL_POSITIONS,
  CITY_OFFICIAL_POSITIONS,
  SUB_PROVINCE_CITY_POSITIONS,
  PROVINCE_OFFICIAL_POSITIONS,
  ALL_FACTIONS,
  type FactionId,
  type PositionSeat,
  type PlayerSave,
} from '@/types/game';
import { getRelationFromSave } from '@/lib/factionSystem';

// ── 席位 tier 数值映射（越高=越枢纽）──────────────────────────────
const TIER_VALUE: Record<string, number> = {
  '正部级': 70, '副部级': 60,
  '正厅级': 50, '副厅级': 40,
  '正处级': 30, '副处级': 20,
  '正科级': 10, '副科级': 5,
};

/** 将官职数组平铺为棋盘席位（原始列表，holderFaction 未分配） */
function collectSeats(): Omit<PositionSeat, 'holderFaction'>[] {
  const seats: Omit<PositionSeat, 'holderFaction'>[] = [];

  // 县级席位（正处/副处/正科/副科）
  for (const p of COUNTY_OFFICIAL_POSITIONS) {
    seats.push({ key: p.key, title: p.title, tier: p.tier, organ: p.organ, isHub: false });
  }
  // 市级席位
  for (const p of CITY_OFFICIAL_POSITIONS) {
    seats.push({ key: p.key, title: p.title, tier: p.tier, organ: p.organ, isHub: false });
  }
  // 副省级城市席位
  for (const p of SUB_PROVINCE_CITY_POSITIONS) {
    seats.push({ key: p.key, title: p.title, tier: p.tier, organ: p.organ, isHub: false });
  }
  // 省级席位
  for (const p of PROVINCE_OFFICIAL_POSITIONS) {
    seats.push({ key: p.key, title: p.title, tier: p.tier, organ: p.organ, isHub: false });
  }

  return seats;
}

/** 找到最高 tier 值对应的 tier 字符串（枢纽席位标记用） */
function findHubTier(seats: Omit<PositionSeat, 'holderFaction'>[]): string | null {
  let maxVal = -1;
  let hubTier: string | null = null;
  for (const s of seats) {
    const v = TIER_VALUE[s.tier] ?? 0;
    if (v > maxVal) { maxVal = v; hubTier = s.tier; }
  }
  return hubTier;
}

/**
 * 确定性分配某席位的控制派系。
 * 算法：以 gameDays + seat.key hash 为种子，按各派关系值加权轮盘。
 * 避免随机抖动（同 gameDays 同 key 恒定返回同一派）。
 */
function assignHolder(
  seatKey: string,
  gameDays: number,
  relWeights: Record<FactionId, number>,
): FactionId | null {
  // 字符串哈希（djb2）
  let seed = gameDays;
  for (let i = 0; i < seatKey.length; i++) {
    seed = ((seed << 5) - seed + seatKey.charCodeAt(i)) >>> 0;
  }

  const totalWeight = ALL_FACTIONS.reduce((s, f) => s + Math.max(0, relWeights[f] ?? 0), 0);
  if (totalWeight === 0) return null;

  // LCG 伪随机（deterministic）
  const rand = ((seed * 1664525 + 1013904223) >>> 0) / 0xffffffff;
  let threshold = rand * totalWeight;
  for (const f of ALL_FACTIONS) {
    threshold -= Math.max(0, relWeights[f] ?? 0);
    if (threshold <= 0) return f;
  }
  return ALL_FACTIONS[ALL_FACTIONS.length - 1];
}

/**
 * 构建位置棋盘。
 * 根据玩家当前派系关系值与 gameDays 确定性计算每个席位的控制派系。
 */
export function buildBoard(save: PlayerSave): PositionSeat[] {
  const rawSeats = collectSeats();
  const hubTier = findHubTier(rawSeats);
  const relations = getRelationFromSave(save);

  // 构造加权关系表（关系值 >= 0 才参与竞争）
  const relWeights: Record<FactionId, number> = {
    reform: Math.max(0, relations.reform ?? 0),
    pragmatic: Math.max(0, relations.pragmatic ?? 0),
    cyl: Math.max(0, relations.cyl ?? 0),
    techno: Math.max(0, relations.techno ?? 0),
    local: Math.max(0, relations.local ?? 0),
  };

  return rawSeats.map(s => ({
    ...s,
    isHub: s.tier === hubTier,
    holderFaction: assignHolder(s.key, save.gameDays, relWeights),
  }));
}

/**
 * 计算指定派系的控制度（0~1）。
 * = 该派控制席位数 / 总席位数
 */
export function computeFactionControl(seats: PositionSeat[], fid: FactionId): number {
  if (seats.length === 0) return 0;
  const controlled = seats.filter(s => s.holderFaction === fid).length;
  return controlled / seats.length;
}

/** 按派系返回各派控制席位数量 */
export function countFactionSeats(seats: PositionSeat[]): Record<FactionId, number> {
  const counts: Record<FactionId, number> = {
    reform: 0, pragmatic: 0, cyl: 0, techno: 0, local: 0,
  };
  for (const s of seats) {
    if (s.holderFaction) counts[s.holderFaction] = (counts[s.holderFaction] ?? 0) + 1;
  }
  return counts;
}

/** 判断某派是否已控制枢纽席位 */
export function controlsHub(seats: PositionSeat[], fid: FactionId): boolean {
  return seats.some(s => s.isHub && s.holderFaction === fid);
}

/** 获取枢纽席位列表 */
export function getHubSeats(seats: PositionSeat[]): PositionSeat[] {
  return seats.filter(s => s.isHub);
}
```

<a id="srclibpromotionconfigts"></a>
## `src/lib/promotionConfig.ts`

```typescript
// 晋升系统 v2 统一配置常量（参考《晋升机制设计文档》）
// 所有数值与规则集中于此，前端只读渲染，禁止硬编码

// ── 职级段划分（tier）──
export const TIER_BY_RANK: Record<number, number> = {
  1: 1, 2: 1, 3: 1,
  4: 2, 5: 2, 6: 2,
  7: 3, 8: 3, 9: 3,
  10: 4, 11: 4,
  12: 5, 13: 5, 14: 5, 15: 5,
};
export const TIER_NAMES: Record<number, string> = {
  1: '基层', 2: '区县级', 3: '市级', 4: '省级', 5: '高层',
};

export function getTier(rankLevel: number): number {
  return TIER_BY_RANK[rankLevel] ?? 1;
}

// ── 适龄区间 ──
export interface AgeRange {
  ageMin: number; ageMax: number; bestMin: number; bestMax: number; retireAge: number;
}
export const AGE_RANGES: Record<number, AgeRange> = {
  1: { ageMin: 22, ageMax: 35, bestMin: 26, bestMax: 30, retireAge: 55 },
  2: { ageMin: 30, ageMax: 45, bestMin: 34, bestMax: 40, retireAge: 58 },
  3: { ageMin: 38, ageMax: 52, bestMin: 42, bestMax: 48, retireAge: 60 },
  4: { ageMin: 45, ageMax: 58, bestMin: 48, bestMax: 53, retireAge: 62 },
  5: { ageMin: 50, ageMax: 65, bestMin: 55, bestMax: 60, retireAge: 65 },
};

// ── 年龄红利 ──
export const AGE_BONUS = { bestBonus: 5, lowAgeBonus: 10, overAgeGraceYears: 5 };

// ── 民心门槛（按 tier）──
export const POPULAR_THRESHOLD: Record<number, number> = {
  1: 30, 2: 35, 3: 40, 4: 45, 5: 50,
};

// ── 上级认可度门槛 ──
export const FAVOR_THRESHOLD = { min: 50, breakMin: 70, closeFlag: 85, obstructMax: 40 };

// ── 竞争综合评分权重 ──
export const COMPETITION_WEIGHTS = { merit: 0.4, popular: 0.3, assess: 0.2, favor: 0.1 };

// ── 基层任期要求 ──
export const BASE_TENURE = { requireYears: 5, factorLt5: 0.8, factorLt3: 0.9 };

// ── 破格规则 ──
export const BREAK_RULE = {
  meritMultiple: 1.5,
  minYears: 1,
  observeDays: 90,
  extendObserveDays: 180,
  favorMin: 70,
  lowPopularThreshold: 40,
  lowPopularPenalty: 10,
  publicOpinion: 20,
  maxUsePerTier: 1,
};

// ── 考评加速减免比例 ──
export const ASSESS_ACCEL = { excellent: 0.10, excellent2: 0.125, special: 0.13, special2: 0.15 };

// ── 晋升冻结与扎根期 ──
export const FREEZE_RULES = {
  popularFreeze: 30,
  popularEnd: 0,
  frozenDays: 180,
  rootingDays: 90,
  rootingExtendDays: 180,
  rootingExtendThreshold: 30,
  promotePopularCost: 5,
};

// ── 岗位编制 ──
export const POST_QUOTA: Record<number, number> = { 1: 6, 2: 5, 3: 4, 4: 3, 5: 42 };
export const POST_COMPOSITION: Record<number, string[]> = {
  1: ['基层职员', '基层职员', '基层副职', '基层副职', '基层正职', '专项岗'],
  2: ['副职', '副职', '正职', '正职', '专项岗'],
  3: ['副职', '副职', '正职', '正职'],
  4: ['副职', '副职', '正职'],
  5: Array(15).fill('核心岗位').concat(Array(24).fill('部级岗位')).concat(Array(3).fill('委员岗位')),
};

// ── 公示期 ──
export const PUBLICITY = { days: 30, democraticMin: 60, publicityDays: 7, extendDays: 7 };

// ── 洗白方式 ──
export interface LaunderMethod {
  id: string; name: string; unlockRank: number; fee: number; days: number;
  risk: 'low' | 'mid' | 'high' | 'extreme'; baseProb: number;
}
export const LAUNDER_METHODS: LaunderMethod[] = [
  { id: 'card', name: '消费卡套现', unlockRank: 5, fee: 0.15, days: 15, risk: 'low', baseProb: 3 },
  { id: 'relative', name: '亲属代持', unlockRank: 4, fee: 0.10, days: 30, risk: 'mid', baseProb: 8 },
  { id: 'invest', name: '投资理财', unlockRank: 9, fee: 0.10, days: 90, risk: 'mid', baseProb: 8 },
  { id: 'shell', name: '空壳公司', unlockRank: 8, fee: 0.20, days: 60, risk: 'mid', baseProb: 8 },
  { id: 'overseas', name: '境外账户', unlockRank: 10, fee: 0.25, days: 120, risk: 'high', baseProb: 15 },
  { id: 'antique', name: '古董字画', unlockRank: 13, fee: 0.30, days: 180, risk: 'low', baseProb: 3 },
  { id: 'crypto', name: '加密货币', unlockRank: 12, fee: 0.05, days: 7, risk: 'extreme', baseProb: 25 },
];
export const LAUNDER_RISK_DIVISOR = 10;
export const LAUNDER_RECOVERY_RANGE = [10, 50];

// ── 藏匿方式 ──
export interface HidingMethod { id: string; name: string; recoveryRate: number; }
export const HIDING_METHODS: HidingMethod[] = [
  { id: 'cash', name: '现金藏匿', recoveryRate: 0.70 },
  { id: 'safe', name: '保险柜', recoveryRate: 0.50 },
  { id: 'relative', name: '亲属保管', recoveryRate: 0.30 },
];
export const HIDING_EXTRA_RECOVERY = 0.10;

// ── 非正式资源协调分档 ──
export interface CoordTier {
  id: string; name: string; amountMin: number; amountMax: number;
  favorGain: number; scoreGain: number;
}
export const COORD_TIERS: CoordTier[] = [
  { id: 'small', name: '小额·礼品礼金', amountMin: 10000, amountMax: 50000, favorGain: 5, scoreGain: 3 },
  { id: 'medium', name: '中额·消费卡/安排家属', amountMin: 100000, amountMax: 500000, favorGain: 12, scoreGain: 8 },
  { id: 'large', name: '大额·干股/项目分成', amountMin: 1000000, amountMax: 5000000, favorGain: 20, scoreGain: 12 },
  { id: 'huge', name: '巨额·境外账户/房产', amountMin: 10000000, amountMax: 99999999, favorGain: 30, scoreGain: 15 },
];
export const COORD_RISK = {
  baseProb: 5, largeBonus: 10, hugeBonus: 20,
  integrityHighBonus: 10, freqBonus: 3, riskPer10: 2, illicitExtraProb: 5,
};
export const PATRONAGE_TIERS = ['large', 'huge'];

// ── 功高盖主 ──
export const PRESTIGE_RULE = {
  popularMin: 90, consecutiveYears: 2, meritMultiple: 1.5,
  favorMonthlyDecay: 2, scorePenalty: 10, patronHalveDecay: 1,
  mitigateLowkey: { popular: -5, favor: 10 },
  mitigateReport: { favor: 5 },
  mitigateShare: { merit: -100, favor: 8 },
};

// ── 非正式关系密切 ──
export const CLIQUE_RULE = {
  favorThreshold: 85, meritPenalty: 200, popularPenalty: 10, freezeDays: 180,
  cutFavor: -15, cooperateMerit: -50, investigateMerit: -50,
};

// ── 领导干扰 ──
export const LEADER_OBSTRUCT = {
  favorBelow: 40, competitorBonus: 10, playerPenalty: 10,
  counterMerit: 500, counterFund: 50, counterProb: 0.30, counterCompensation: 100,
};

// ── 越级赏识 ──
export const PATRON_RULE = {
  meritMultiple: 1.2, popularMin: 80, baseProb: 5, probGrowth: 1, probCap: 20,
  scoreBonus: 8, favorGain: 10, meritGain: 30, meritPraise: 20, popularPraise: 5,
  meritBorrow: 50, borrowDays: 90, favorPenalty: 10, disappointFavor: -20,
  lowPopularEnd: 50, consecutiveFailYears: 2, extraBreakChance: 1,
};

// ── NPC 成长与衰减 ──
export const NPC_GROWTH = {
  monthlyGrowthMin: 0.2, monthlyGrowthMax: 0.5,
  ageDecayMonthly: 0.5, integrityLow: 40,
  retireCheckAge: 55, fallIntegrity: 30, fallProb: 0.05,
};

// ── 五步流程 ──
export const INTERVIEW_OPTIONS = [
  { key: 'fact', label: '谈成绩、摆事实', score: 3 },
  { key: 'plan', label: '谈打算、表决心', score: 2 },
  { key: 'humble', label: '表谦虚、求指导', score: 1 },
];

// ── 考评等级归一化评分（0-100）──
export function assessToScore(grade: string): number {
  switch (grade) {
    case '特等': return 95;
    case '优秀': return 85;
    case '良好': return 70;
    case '合格': return 55;
    case '不合格': return 30;
    default: return 50;
  }
}

// ── 计算年龄红利（就高原则，互斥）──
export function computeAgeBonus(age: number, tier: number): number {
  const range = AGE_RANGES[tier];
  if (!range) return 0;
  if (age < range.ageMin) return AGE_BONUS.lowAgeBonus; // 低龄红利
  if (age >= range.bestMin && age <= range.bestMax) return AGE_BONUS.bestBonus; // 最佳年龄红利
  return 0;
}

// ── 计算基层任期系数 ──
export function computeBaseTenureFactor(baseTenureYears: number): number {
  let factor = 1;
  if (baseTenureYears < BASE_TENURE.requireYears) factor *= BASE_TENURE.factorLt5;
  if (baseTenureYears < 3) factor *= BASE_TENURE.factorLt3;
  return factor;
}
```

<a id="srclibpromotionenginets"></a>
## `src/lib/promotionEngine.ts`

```typescript
// 晋升系统 v2 核心逻辑引擎
// 六项硬门槛 / 竞争综合评分 / 政治生态规则 / 破格判定 / 洗白与协调
import type { PlayerSave, FactionId, PoliticalWind } from '@/types/game';
import { calcKFaction, getDominantFaction, getLosingFaction } from '@/lib/factionSystem';
import {
  AGE_RANGES, AGE_BONUS, POPULAR_THRESHOLD, FAVOR_THRESHOLD,
  COMPETITION_WEIGHTS, BASE_TENURE, BREAK_RULE, ASSESS_ACCEL,
  FREEZE_RULES, assessToScore, computeAgeBonus, computeBaseTenureFactor,
  LAUNDER_RISK_DIVISOR, COORD_RISK, PATRONAGE_TIERS,
} from '@/lib/promotionConfig';

// ── 门槛检查结果 ──
export interface GateResult {
  key: string;
  label: string;
  passed: boolean;
  detail: string;
}

/** 六项硬门槛检查（一票否决） */
export function checkHardGates(save: PlayerSave): GateResult[] {
  const tier = getTierOf(save.rankLevel);
  const range = AGE_RANGES[tier];
  const popularReq = POPULAR_THRESHOLD[tier] ?? 30;
  const favors = [save.bossFavor, save.boss2Favor, save.boss3Favor];
  const minFavor = Math.min(...favors);
  const accel = computeTenureAccel(save);
  const effectiveTenure = save.tenureYears * (1 + accel);

  return [
    {
      key: 'tenure',
      label: '任职年限',
      passed: effectiveTenure >= save.requiredTenureYears,
      detail: `已任职 ${save.tenureYears.toFixed(1)} 年（加速后 ${effectiveTenure.toFixed(1)} 年），要求 ${save.requiredTenureYears} 年`,
    },
    {
      key: 'merit',
      label: '功绩积累',
      passed: save.meritPoints >= save.requiredMerit,
      detail: `当前功绩 ${Math.round(save.meritPoints)}，要求 ${save.requiredMerit}`,
    },
    {
      key: 'assess',
      label: '考评等级',
      passed: save.assessmentGrade === '优秀' || save.assessmentGrade === '良好' || save.assessmentGrade === '特等',
      detail: `当前考评 ${save.assessmentGrade}，需达到良好及以上`,
    },
    {
      key: 'popular',
      label: '民心值',
      passed: save.popularSupport >= popularReq,
      detail: `当前民心值 ${save.popularSupport}，要求 ${popularReq}`,
    },
    {
      key: 'favor',
      label: '上级认可度',
      passed: minFavor >= FAVOR_THRESHOLD.min,
      detail: `三位上级最低认可度 ${minFavor}，要求均 ≥ ${FAVOR_THRESHOLD.min}`,
    },
    {
      key: 'age',
      label: '年龄条件',
      passed: save.playerAge >= range.ageMin && save.playerAge <= range.ageMax,
      detail: `当前年龄 ${save.playerAge} 岁，适龄区间 ${range.ageMin}-${range.ageMax} 岁`,
    },
  ];
}

export function getTierOf(rankLevel: number): number {
  if (rankLevel <= 3) return 1;
  if (rankLevel <= 6) return 2;
  if (rankLevel <= 9) return 3;
  if (rankLevel <= 11) return 4;
  return 5;
}

/** 考评加速减免比例 */
export function computeTenureAccel(save: PlayerSave): number {
  const g = save.assessmentGrade;
  const c = save.consecutiveExcellentYears;
  if (g === '特等') return c >= 2 ? ASSESS_ACCEL.special2 : ASSESS_ACCEL.special;
  if (g === '优秀') return c >= 2 ? ASSESS_ACCEL.excellent2 : ASSESS_ACCEL.excellent;
  return 0;
}

/** 是否晋升冻结（含 §3.22 派系斗争交战期锁定） */
export function isPromotionFrozen(save: PlayerSave): boolean {
  if (save.promotion_frozen) return true;
  // §4.2⑧ 派系斗争交战期：factionPromotionLocked=true → 一票否决
  if (save.factionPromotionLocked) return true;
  // §2.5⑦ 无派系永久锁死
  if (save.factionlessLocked) return true;
  if (save.popularSupport <= FREEZE_RULES.popularEnd) return true;
  return false;
}

/** 返回晋升冻结的具体原因（未冻结返回 null），用于在晋升页标明原因 */
export function getFreezeReason(save: PlayerSave): string | null {
  // §2.5⑦ 无派系永久锁死
  if (save.factionlessLocked) return '无派系：未加入任何派系，晋升被永久锁死';
  // §4.2⑧ 派系斗争交战期：factionPromotionLocked=true → 一票否决
  if (save.factionPromotionLocked) return '派系斗争交战期：当前处于派系斗争交战期，晋升被锁定';
  if (save.promotion_frozen) return '晋升冻结：系统已冻结当前晋升通道';
  if (save.popularSupport <= FREEZE_RULES.popularEnd) {
    return `民心不足：民心支持度 ${save.popularSupport} 低于冻结阈值 ${FREEZE_RULES.popularEnd}`;
  }
  return null;
}

/** 是否超龄窗口关闭 */
export function isWindowLocked(save: PlayerSave): boolean {
  const tier = getTierOf(save.rankLevel);
  const range = AGE_RANGES[tier];
  return save.playerAge > range.ageMax + AGE_BONUS.overAgeGraceYears;
}

/** 是否处于超龄过渡（超上限 5 年）*/
export function isOverAgeTransition(save: PlayerSave): boolean {
  const tier = getTierOf(save.rankLevel);
  const range = AGE_RANGES[tier];
  return save.playerAge > range.ageMax + AGE_BONUS.overAgeGraceYears;
}

/** 是否功高盖主（已取消，恒返回 false） */
export function isPrestigeHigh(_save: PlayerSave): boolean {
  return false;
}

/** 是否非正式关系密切（已取消，恒返回 false） */
export function isClique(_save: PlayerSave): boolean {
  return false;
}

/** 是否领导阻挠（已取消，恒返回 false） */
export function isLeaderObstruct(_save: PlayerSave): boolean {
  return false;
}

/** 玩家竞争综合评分（含年龄红利、基层系数、§4.2 K_faction） */
export function computePlayerScore(save: PlayerSave): number {
  const tier = getTierOf(save.rankLevel);
  const meritNorm = Math.min(100, (save.meritPoints / save.requiredMerit) * 60 + 40);
  const popularNorm = save.popularSupport;
  const assessNorm = assessToScore(save.assessmentGrade);
  const favorNorm = Math.min(100, (save.bossFavor + save.boss2Favor + save.boss3Favor) / 3);
  let score = meritNorm * COMPETITION_WEIGHTS.merit
    + popularNorm * COMPETITION_WEIGHTS.popular
    + assessNorm * COMPETITION_WEIGHTS.assess
    + favorNorm * COMPETITION_WEIGHTS.favor;
  // 年龄红利
  score += computeAgeBonus(save.playerAge, tier);
  // 基层任期系数
  score *= computeBaseTenureFactor(save.base_tenure_years);
  // 下次优先加分
  score += save.next_priority_bonus;

  // §4.2  K_faction 晋升派系系数（0.4–1.8，默认 1.0 即原行为）
  // factionlessLocked / factionPromotionLocked 已在 isPromotionFrozen 中一票否决，
  // 此处仅对 promotable=true 时应用系数缩放。
  const kResult = calcKFaction({
    primaryFaction: (save.primaryFaction as FactionId) || null,
    relation: {
      reform:    save.reformFaction    ?? 50,
      pragmatic: save.pragmaticFaction ?? 50,
      cyl:       save.cylRelation      ?? 30,
      techno:    save.technoRelation   ?? 30,
      local:     save.localRelation    ?? 30,
    },
    dominantFaction: (save.dominantFaction as FactionId | null) ?? null,
    losingFaction:   getLosingFaction((save.politicalWind ?? 'balanced') as PoliticalWind),
    bandFactions:    [],   // 同步调用无 band 数据；PostsTab 异步版可传入完整列表
    isFlagged:             save.isFlagged            ?? false,
    factionlessLocked:     save.factionlessLocked    ?? false,
    factionPromotionLocked: save.factionPromotionLocked ?? false,
  });
  // promotable=false 时得分归零（与 isPromotionFrozen 双重保险）
  if (!kResult.promotable) return 0;
  return Math.round(score * kResult.kFaction * 10) / 10;
}

/** NPC 候选人综合评分 */
export function computeNpcScore(c: {
  merit_score: number; popularity_score: number; assess_score: number; favor_score: number;
}): number {
  const score = c.merit_score * COMPETITION_WEIGHTS.merit
    + c.popularity_score * COMPETITION_WEIGHTS.popular
    + c.assess_score * COMPETITION_WEIGHTS.assess
    + c.favor_score * COMPETITION_WEIGHTS.favor;
  return Math.round(score * 10) / 10;
}

// ── 破格条件检查 ──
export interface BreakCondition {
  key: string;
  label: string;
  met: boolean;
  detail: string;
}
export function checkBreakConditions(save: PlayerSave): BreakCondition[] {
  return [
    {
      key: 'merit_special',
      label: '年度功绩特别突出',
      met: save.meritPoints >= save.requiredMerit * BREAK_RULE.meritMultiple && save.assessmentGrade === '特等',
      detail: `功绩达到要求值的 ${BREAK_RULE.meritMultiple} 倍且考评特等`,
    },
    {
      key: 'popular_solid',
      label: '民心基础扎实',
      met: save.popularSupport >= 90 && save.consecutiveExcellentYears >= 3,
      detail: `民心值 ≥90 且连续 3 年优秀`,
    },
    {
      key: 'major_task',
      label: '重大专项任务完成',
      met: false,
      detail: '完成重大攻坚专项并被上级通报表扬（事件触发）',
    },
    {
      key: 'major_contribution',
      label: '重大贡献',
      met: false,
      detail: '重大突发情况处置得力，获专项嘉奖（事件触发）',
    },
  ];
}

/** 破格是否可用 */
export function canBreak(save: PlayerSave): { ok: boolean; reason: string } {
  if (save.break_rule_used >= BREAK_RULE.maxUsePerTier) return { ok: false, reason: '本职级段破格机会已用完' };
  const favors = [save.bossFavor, save.boss2Favor, save.boss3Favor];
  if (Math.min(...favors) < BREAK_RULE.favorMin) return { ok: false, reason: `三位上级认可度需均 ≥ ${BREAK_RULE.favorMin}` };
  const met = checkBreakConditions(save).some(c => c.met);
  if (!met) return { ok: false, reason: '尚未满足任何破格触发条件' };
  return { ok: true, reason: '' };
}

/** 破格年限减免（减半，最低1年） */
export function breakTenureReduction(requiredYears: number): number {
  return Math.max(BREAK_RULE.minYears, requiredYears / 2);
}

// ── 洗白查获概率计算 ──
export function computeLaunderProb(baseProb: number, riskValue: number): number {
  const prob = baseProb + riskValue / LAUNDER_RISK_DIVISOR;
  return Math.round(prob * 10) / 10;
}

// ── 非正式协调查获概率计算 ──
export function computeCoordProb(
  tierId: string,
  targetIntegrity: number,
  bribeCount: number,
  riskValue: number,
  source: 'legal' | 'illicit',
): number {
  let prob = COORD_RISK.baseProb;
  if (tierId === 'large') prob += COORD_RISK.largeBonus;
  if (tierId === 'huge') prob += COORD_RISK.hugeBonus;
  if (targetIntegrity >= 80) prob += COORD_RISK.integrityHighBonus;
  prob += bribeCount * COORD_RISK.freqBonus;
  prob += (riskValue / 10) * COORD_RISK.riskPer10;
  if (source === 'illicit') prob += COORD_RISK.illicitExtraProb;
  return Math.round(prob * 10) / 10;
}

/** 是否获得庇护状态 */
export function hasPatronage(tierId: string): boolean {
  return PATRONAGE_TIERS.includes(tierId);
}

/** 生成任职文号 */
export function generateDocNo(gameDays: number): string {
  const year = 2020 + Math.floor(gameDays / 365);
  const seq = String(Math.floor(Math.random() * 900) + 100);
  return `任职〔${year}〕第 ${seq} 号`;
}

// ── 政治生态月度结算 ──
// 说明：功高盖主 / 非正式关系密切 / 领导阻挠 / 越级赏识 四类事件已按需求全部取消，
// 仅保留派系（faction）相关阻断逻辑（在 isPromotionFrozen 中处理）。此函数现仅处理
// 冻结到期解除，不再产生任何上述生态事件，彻底熔断两套系统。
export interface EcologyResult {
  bossFavorDelta: number;
  boss2FavorDelta: number;
  boss3FavorDelta: number;
  meritDelta: number;
  popularDelta: number;
  prestige_flag: boolean;
  clique_flag: boolean;
  leader_obstruct: boolean;
  promotion_frozen: boolean;
  promo_freeze_until_day: number;
  patron_id: string | null;
  patron_favor: number;
  patron_expire_day: number;
  patron_fail_months: number;
  investState?: 'liangan';
  caseStartDay?: number;
  events: string[];
}

/**
 * 每月结算政治生态（已熔断：仅处理冻结到期解除，不再产生功高盖主/非正式关系密切/领导阻挠/越级赏识事件）。
 * 返回增量与标记，由 GameContext 合并写入存档。
 */
export function settlePoliticalEcology(save: PlayerSave, gameDays: number): EcologyResult {
  const r: EcologyResult = {
    bossFavorDelta: 0, boss2FavorDelta: 0, boss3FavorDelta: 0,
    meritDelta: 0, popularDelta: 0,
    prestige_flag: false, clique_flag: false,
    leader_obstruct: false, promotion_frozen: save.promotion_frozen,
    promo_freeze_until_day: save.promo_freeze_until_day,
    patron_id: null, patron_favor: 0,
    patron_expire_day: 0, patron_fail_months: 0,
    events: [],
  };

  // 冻结到期解除（历史冻结仍可正常解除）
  if (save.promotion_frozen && save.promo_freeze_until_day > 0 && gameDays >= save.promo_freeze_until_day) {
    r.promotion_frozen = false;
    r.promo_freeze_until_day = 0;
    r.events.push('晋升冻结已解除');
  }

  // 清除历史遗留的功高盖主 / 非正式关系密切 / 越级赏识标记
  if (save.prestige_flag || save.clique_flag || save.patron_id) {
    r.events.push('已清理历史生态标记');
  }

  return r;
}
```

<a id="srclibpromotionfactionts"></a>
## `src/lib/promotionFaction.ts`

```typescript
// 派系晋升联动模块（§一：双轨胜利）
// evaluateStruggle / resolveContest / applyContestWin / applyFactionLossPenalty
// v4：resolveContest 底层改调 provinceSeatSystem（calcFactionPower / resolvePersonalContest），
//     applyContestWin / applyFactionLossPenalty 保持不变
import {
  ALL_FACTIONS,
  RANK_CONFIG,
  getRandomCityForRank,
  type FactionId,
  type PlayerSave,
  type PositionSeat,
  type PromotionContest,
  type ContestRecord,
} from '@/types/game';
import {
  calcBandSynergy,
  applyRelDeltaToSave,
  getRelationFromSave,
  FACTION_RELATION_MATRIX,
  WIND_CYCLE_DAYS,
} from '@/lib/factionSystem';
import { buildBoard, computeFactionControl, controlsHub } from '@/lib/positionBoard';
import { resolvePersonalContest } from '@/lib/provinceSeatSystem';

// ── 配置常量（统一出口，不硬编码在业务函数内）────────────────────
export const FACTION_LOSS_INFLUENCE_PENALTY  = 15;  // 影响力损失
export const FACTION_LOSS_RELATION_PENALTY   = 12;  // 主派关系损失
export const FACTION_LOSS_SUPPORT_PENALTY    = 6;   // 民心损失
export const FACTION_LOSS_TAX_PENALTY        = 8;   // 税收指数损失
export const FACTION_LOSS_SETBACK_DAYS       = 180; // 失势冻结天数
export const FACTION_WIN_CONTROL_THRESHOLD   = 0.5; // 控制度过半阈值

// ──────────────────────────────────────────────────────────────────
// §一.1  evaluateStruggle：棋盘胜负判定
// ──────────────────────────────────────────────────────────────────

export interface StruggleEvaluation {
  /** 本派控制度（0~1） */
  controlRatio: number;
  /** 是否整体胜利（过半 OR 攻克枢纽） */
  factionWin: boolean;
  /** 是否通过控制度过半胜利 */
  winByMajority: boolean;
  /** 是否通过攻克枢纽席位胜利 */
  winByHub: boolean;
  /** 玩家个人职务是否胜利（sYou >= sOpp） */
  playerContestWin: boolean;
}

/**
 * 综合评估当前派系斗争结果。
 * @param save   玩家存档
 * @param boardSeats  当前棋盘席位（由 buildBoard 生成，或从 save.boardSeats 读取）
 */
export function evaluateStruggle(
  save: PlayerSave,
  boardSeats: PositionSeat[],
): StruggleEvaluation {
  const fid = save.primaryFaction as FactionId | '';
  if (!fid) {
    return { controlRatio: 0, factionWin: false, winByMajority: false, winByHub: false, playerContestWin: false };
  }

  const controlRatio   = computeFactionControl(boardSeats, fid as FactionId);
  const winByMajority  = controlRatio >= FACTION_WIN_CONTROL_THRESHOLD;
  const winByHub       = controlsHub(boardSeats, fid as FactionId);
  const factionWin     = winByMajority || winByHub;

  // 玩家个人职务胜利：当前进行中的争夺 sYou >= sOpp
  const contest = save.promotionContest;
  const playerContestWin = contest
    ? contest.status === 'active' && contest.sYou >= contest.sOpp
    : false;

  return { controlRatio, factionWin, winByMajority, winByHub, playerContestWin };
}

// ──────────────────────────────────────────────────────────────────
// §一.1  resolveContest：计算争夺力（sYou / sOpp）
// v4：底层改调 provinceSeatSystem.resolvePersonalContest（10% 派系 + 90% 个人）
// ──────────────────────────────────────────────────────────────────

/**
 * 计算玩家发起争夺时的 sYou / sOpp，返回可写入 PromotionContest 的数值。
 * v4 公式：sYou = 派系贡献(10%) + 个人战力(90%)；sOpp = 竞争派系实力均值。
 */
export function resolveContest(
  save: PlayerSave,
  bandFactions: FactionId[] = [],
  positionKey = '',
  positionTitle = '',
  toRank = 0,
): { sYou: number; sOpp: number } {
  const targetCity = save.cityName;
  const result = resolvePersonalContest(
    save,
    bandFactions,
    positionKey,
    positionTitle,
    toRank,
    targetCity,
  );
  return { sYou: result.sYou, sOpp: result.sOpp };
}

/**
 * resolveContest 的完整版：附带战力分解详情（供 UI 分解条/历史记录）。
 */
export function resolveContestDetailed(
  save: PlayerSave,
  bandFactions: FactionId[],
  positionKey: string,
  positionTitle: string,
  toRank: number,
  targetCity: string,
) {
  return resolvePersonalContest(save, bandFactions, positionKey, positionTitle, toRank, targetCity);
}

// ──────────────────────────────────────────────────────────────────
// §一.1  applyContestWin：玩家个人职务晋升落地
// ──────────────────────────────────────────────────────────────────

/**
 * 玩家个人职务赢得争夺后，更新存档字段。
 * 注意：此函数只处理玩家职务晋升，不结束派系斗争回合。
 * @returns Partial<PlayerSave> 可合并进 updateSave 的更新集合
 */
export function applyContestWin(
  save: PlayerSave,
  contest: PromotionContest,
  day: number,
): Partial<PlayerSave> {
  const newRank    = Math.max(contest.toRank, save.rankLevel + 1);
  const rankCfg    = RANK_CONFIG[newRank];
  const newRankName = rankCfg?.name ?? save.rankName;
  const shouldChangeCity = rankCfg?.randomCity ?? false;
  const newCity    = shouldChangeCity ? getRandomCityForRank(newRank) : save.cityName;

  // 结束当前争夺，写入历史
  const wonContest: PromotionContest = { ...contest, status: 'won' };
  const historyEntry: ContestRecord = {
    id:            contest.id,
    positionTitle: contest.positionTitle,
    toRank:        newRank,
    sYou:          contest.sYou,
    sOpp:          contest.sOpp,
    result:        'won',
    day,
  };

  return {
    rankLevel:        newRank,
    rankName:         newRankName,
    playerPosition:   contest.positionTitle,
    cityName:         newCity,
    promotionContest: wonContest,
    contestHistory:   [...(save.contestHistory ?? []), historyEntry],
    last_promotion_day: day,
    tenureDays:       0,
    tenureYears:      0,
    rooting_days:     90,
    popularSupport:   Math.max(0, (save.popularSupport ?? 50) - 5),
    lastPromotionCycleId: getContestCycleId(day),
  };
}

// ──────────────────────────────────────────────────────────────────
// §一.1  applyFactionLossPenalty：派系整体败时的惩罚
// ──────────────────────────────────────────────────────────────────

/**
 * 派系整体败时施加惩罚（与玩家个人职务胜负无关，必须触发）。
 * @returns Partial<PlayerSave> 可合并进 updateSave 的更新集合
 */
export function applyFactionLossPenalty(
  save: PlayerSave,
  day: number,
): Partial<PlayerSave> {
  const fid = save.primaryFaction as FactionId | '';
  const relDelta = fid
    ? applyRelDeltaToSave(save, fid as FactionId, -FACTION_LOSS_RELATION_PENALTY)
    : {};

  // 若当前有进行中的争夺，也写入 expired 历史
  const current = save.promotionContest;
  const expiredEntry: ContestRecord | null = current && current.status === 'active'
    ? {
        id:            current.id,
        positionTitle: current.positionTitle,
        toRank:        current.toRank,
        sYou:          current.sYou,
        sOpp:          current.sOpp,
        result:        'lost',
        day,
      }
    : null;

  // v6：若有声望经济兑换的失势豁免次数，消耗一次并豁免失势冻结
  const hasImmunity = (save.setbackImmunity ?? 0) > 0;
  const setbackUntil = hasImmunity ? 0 : day + FACTION_LOSS_SETBACK_DAYS;

  return {
    factionInfluence:       Math.max(0, (save.factionInfluence ?? 0) - FACTION_LOSS_INFLUENCE_PENALTY),
    popularSupport:         Math.max(0, (save.popularSupport ?? 50) - FACTION_LOSS_SUPPORT_PENALTY),
    taxRevenue:             Math.max(0, (save.taxRevenue ?? 0) - FACTION_LOSS_TAX_PENALTY),
    factionSetbackUntilDay: setbackUntil,
    factionPromotionLocked: true,
    promotionContest:       null,
    contestHistory: expiredEntry
      ? [...(save.contestHistory ?? []), expiredEntry]
      : save.contestHistory ?? [],
    // v6：派系整体败也标记本轮晋升机会已用，避免失败后立即在同一周期重新发起争夺
    lastPromotionCycleId:   getContestCycleId(day),
    ...(hasImmunity ? { setbackImmunity: (save.setbackImmunity ?? 0) - 1 } : {}),
    ...relDelta,
  };
}

// ──────────────────────────────────────────────────────────────────
// §一.4  周期边界：expire 过期争夺
// ──────────────────────────────────────────────────────────────────

/** 到达周期边界仍未赢的争夺置为 expired */
export function expireContest(
  save: PlayerSave,
  day: number,
): Partial<PlayerSave> {
  const current = save.promotionContest;
  if (!current || current.status !== 'active') return {};

  const expiredEntry: ContestRecord = {
    id:            current.id,
    positionTitle: current.positionTitle,
    toRank:        current.toRank,
    sYou:          current.sYou,
    sOpp:          current.sOpp,
    result:        'expired',
    day,
  };

  return {
    promotionContest: { ...current, status: 'expired' },
    contestHistory:   [...(save.contestHistory ?? []), expiredEntry],
  };
}

// ──────────────────────────────────────────────────────────────────
// §一.4  周期边界：派系整体胜后解锁
// ──────────────────────────────────────────────────────────────────

/** 派系整体胜后解锁晋升冻结，斗争阶段置 truce */
export function applyFactionWin(_save: PlayerSave): Partial<PlayerSave> {
  return {
    strugglePhase:          'truce',
    factionPromotionLocked: false,
  };
}

// ──────────────────────────────────────────────────────────────────
// 辅助：刷新棋盘（构建并写入 boardSeats）
// ──────────────────────────────────────────────────────────────────

/** 重新构建棋盘，返回可合并的存档更新 */
export function refreshBoard(save: PlayerSave): Partial<PlayerSave> {
  const seats = buildBoard(save);
  return { boardSeats: seats };
}

// ──────────────────────────────────────────────────────────────────
// §v5  晋升硬门控（checkPromotionGate）
// ──────────────────────────────────────────────────────────────────

/** v5 晋升附加条件配置（全部可覆盖，禁止在函数体内硬编码） */
export const PROMOTION_HARD_CONDITIONS = {
  minMeritPoints:    60,   // 最低功绩要求
  minPopularSupport: 45,   // 最低民心要求
  minFactionRelation: 35,  // 最低主派关系值
  requireNoCase:     true, // 是否要求无立案（isFlagged=false）
  requireNoSetback:  true, // 是否要求未处于失势冻结期
} as const;

export interface PromotionGateDetail {
  key: string;
  label: string;
  pass: boolean;
  current: number | boolean | string;
  required: number | boolean | string;
}

export interface PromotionGateResult {
  allowed: boolean;
  blockReason: string | null;
  details: PromotionGateDetail[];
}

/** v5：晋升/斗争周期 id（与斗争周期同源，每 WIND_CYCLE_DAYS 天一轮） */
export function getContestCycleId(gameDays: number): number {
  return Math.floor(gameDays / WIND_CYCLE_DAYS);
}

/**
 * v5 晋升硬门控。
 * - R-C: 本轮晋升机会已用（每 WIND_CYCLE_DAYS 天一轮，与斗争周期同源）
 * - R-A: contest.status === 'active'  → 争夺战期间禁止升级
 * - R-B: status === 'lost' | 'expired' → 未夺下，禁止升级
 * - R-D: 无 contest 或 status !== 'won' → 未赢下任何争夺，禁止升级
 * - R-E: 5 项附加条件（全部走 PROMOTION_HARD_CONDITIONS 配置）
 */
export function checkPromotionGate(save: PlayerSave): PromotionGateResult {
  const cond = PROMOTION_HARD_CONDITIONS;
  const contest = save.promotionContest;

  // R-C：本轮晋升机会已使用（每 WIND_CYCLE_DAYS 天一轮，下一周期自动开放）
  const currentCycleId = getContestCycleId(save.gameDays);
  if (save.lastPromotionCycleId === currentCycleId) {
    return { allowed: false, blockReason: '本轮（每 5 年）晋升机会已使用，下一周期自动开放', details: [] };
  }
  // R-A：争夺进行中
  if (contest && contest.status === 'active') {
    return { allowed: false, blockReason: '存在进行中的职位争夺战，等待周期结算', details: [] };
  }
  // R-B：争夺失败/过期
  if (contest && (contest.status === 'lost' || contest.status === 'expired')) {
    return { allowed: false, blockReason: `上次争夺未胜出（${contest.status === 'lost' ? '失败' : '已过期'}），需重新发起`, details: [] };
  }
  // R-C：未曾赢下任何争夺
  if (!contest || contest.status !== 'won') {
    return { allowed: false, blockReason: '尚未赢下任何职位争夺，晋升通道未开放', details: [] };
  }

  // R-D：5 项附加条件
  const primary = save.primaryFaction as import('@/types/game').FactionId | '';
  const relation = primary ? (save[`${primary}Faction` as keyof PlayerSave] as number ?? 0) : 0;
  const details: PromotionGateDetail[] = [
    {
      key: 'merit',
      label: '功绩点数',
      pass: (save.meritPoints ?? 0) >= cond.minMeritPoints,
      current: save.meritPoints ?? 0,
      required: cond.minMeritPoints,
    },
    {
      key: 'support',
      label: '民心支持率',
      pass: (save.popularSupport ?? 0) >= cond.minPopularSupport,
      current: save.popularSupport ?? 0,
      required: cond.minPopularSupport,
    },
    {
      key: 'relation',
      label: '主派关系值',
      pass: relation >= cond.minFactionRelation,
      current: relation,
      required: cond.minFactionRelation,
    },
    {
      key: 'noCase',
      label: '无立案',
      pass: !cond.requireNoCase || !save.isFlagged,
      current: save.isFlagged ? '已立案' : '无立案',
      required: cond.requireNoCase ? '无立案' : '不限',
    },
    {
      key: 'noSetback',
      label: '无失势冻结',
      pass: !cond.requireNoSetback || (save.gameDays > (save.factionSetbackUntilDay ?? 0)),
      current: save.gameDays <= (save.factionSetbackUntilDay ?? 0) ? '冻结中' : '正常',
      required: cond.requireNoSetback ? '无冻结' : '不限',
    },
  ];

  const failed = details.find(d => !d.pass);
  if (failed) {
    return { allowed: false, blockReason: `附加门控未满足：${failed.label}（当前 ${failed.current}，需 ${failed.required}）`, details };
  }
  return { allowed: true, blockReason: null, details };
}
```

<a id="srclibprovinceseatsystemts"></a>
## `src/lib/provinceSeatSystem.ts`

```typescript
// 省级席位系统（v4 派系玩法核心：全国棋盘 + 个人职位独立斗争）
// 硬性要求：所有权重/加成/阈值/成本一律走配置对象，业务函数内禁止硬编码数字
import {
  PROVINCE_LIST,
  PROVINCE_CITY_MAP,
  ALL_FACTIONS,
  FACTION_LABEL,
  type FactionId,
  type PlayerSave,
  type ProvinceSeat,
  type NationalSeatControl,
  type PersonalContest,
  type ContestDetail,
} from '@/types/game';
import { getRelationFromSave, hasActiveCoalitionWith, COALITION_CONTEST_BONUS } from '@/lib/factionSystem';

// ═══════════════════════════════════════════════════════════════
// §配置对象（唯一数值出口）
// ═══════════════════════════════════════════════════════════════

/** 派系实力构成权重（关系值/影响力/功绩/情报/经费池） */
export const FACTION_POWER_WEIGHTS = {
  relation:    0.30,  // 玩家对本派关系值
  influence:   0.25,  // 派系影响力
  merit:       0.15,  // 玩家功绩
  intelligence: 0.15, // 派系情报
  treasury:    0.15,  // 派系经费池
} as const;

/** 个人战力七维权重（全部来自 PlayerSave 真实字段） */
export const PERSONAL_POWER_WEIGHTS = {
  merit:    0.20,  // 政绩（meritPoints）
  support:  0.20,  // 民心（popularSupport）
  economy:  0.15,  // 经济（taxRevenue）
  integrity: 0.15, // 廉洁（integrity）
  events:   0.10,  // 事件处理（eventsThisYear）
  network:  0.10,  // 人脉（factionInfluence）
  tenure:   0.10,  // 任期稳定（rankLevel 折算稳定度）
} as const;

/** 地域类型：从省份名称派生（直辖市/沿海/边疆民族/文化大省/内陆） */
export type DomainType = 'municipality' | 'coastal' | 'frontier' | 'cultural' | 'inland';

/**
 * 竞争派系在不同地域类型的加成系数。
 * 派系在擅长地域竞争省级席位时实力乘以 (1 + bonus)。
 */
export const FACTION_DOMAIN_BONUS: Record<FactionId, Partial<Record<DomainType, number>>> = {
  // 改革开放系：直辖市 + 沿海省加成
  reform:    { municipality: 0.15, coastal: 0.12 },
  // 稳健国家系：直辖市 + 内陆（中枢与腹地）加成
  pragmatic: { municipality: 0.10, inland: 0.10 },
  // 共青团/民生系：文化大省加成
  cyl:       { cultural: 0.15 },
  // 技术官僚系：沿海（产业技术）加成
  techno:    { coastal: 0.15 },
  // 地方实力派：边疆/民族地区加成
  local:     { frontier: 0.20 },
};

/** 省级席位战获胜阈值（控制全国总席位比例） */
export const VICTORY_THRESHOLD = 0.6;

/** 个人职位战贡献配比（派系 10% + 个人 90%） */
export const CONTEST_BLEND = {
  faction:  0.1,
  personal: 0.9,
} as const;

/** 争夺成本配置 */
export const CONTEST_COSTS = {
  personalContest: { merit: 80, cooldownDays: 30 },  // 个人职位战：80 功绩 + 30 天冷却
  provinceSeat:    { cooldownDays: 90 },             // 省级席位争夺冷却
} as const;

/** v5：省级攻夺战成本与进度配置 */
export const PROVINCE_ATTACK_COST = {
  meritCost:        50,   // 每次攻夺消耗功绩
  cooldownDays:     60,   // 两次攻夺之间冷却天数
  progressPerAttack: 12,  // 每次攻夺增加的进度点数
  maxProgress:      100,  // 进度上限（满控制）
  /** 联合争夺模式：竞争派系得分系数（降低对手难度） */
  coalitionRivalFactor: 0.85,
  /** 联合争夺功绩成本倍率 */
  coalitionMeritMultiplier: 1.5,
} as const;

/** 席位数公式参数（round(地级市数 × 每市系数)，clamp [下限, 上限]） */
export const SEAT_FORMULA = {
  perCityMultiplier: 1.8,
  minSeats: 3,
  maxSeats: 18,
} as const;

/** 地域类型派生规则（按省份名称关键词，从 PROVINCE_CITY_MAP 派生） */
const DOMAIN_TYPE_RULES: { type: DomainType; keywords: string[] }[] = [
  { type: 'municipality', keywords: ['北京市', '天津市', '上海市', '重庆市'] },
  { type: 'frontier',     keywords: ['新疆', '西藏', '内蒙古', '广西', '宁夏', '云南', '贵州', '青海', '黑龙江', '吉林', '辽宁', '海南'] },
  { type: 'coastal',      keywords: ['河北', '江苏', '浙江', '福建', '山东', '广东'] },
  { type: 'cultural',     keywords: ['山西', '安徽', '江西', '河南', '湖南', '湖北', '四川', '陕西'] },
  { type: 'inland',       keywords: [] },  // 其余默认内陆
];

// ═══════════════════════════════════════════════════════════════
// §地域类型派生
// ═══════════════════════════════════════════════════════════════

/** 从省份名称派生地域类型 */
export function getDomainTypeOfProvince(province: string): DomainType {
  for (const rule of DOMAIN_TYPE_RULES) {
    if (rule.keywords.length > 0 && rule.keywords.some(k => province.includes(k))) {
      return rule.type;
    }
  }
  return 'inland';
}

// ═══════════════════════════════════════════════════════════════
// §省级席位计算
// ═══════════════════════════════════════════════════════════════

/** 计算某省席位数：round(下辖地级市数 × 1.8)，clamp [3, 18] */
export function calcProvinceSeatCount(province: string): number {
  const cityCount = (PROVINCE_CITY_MAP[province] ?? []).length;
  const raw = Math.round(cityCount * SEAT_FORMULA.perCityMultiplier);
  return Math.min(SEAT_FORMULA.maxSeats, Math.max(SEAT_FORMULA.minSeats, raw));
}

/** 构建全国省级席位列表（未分配归属） */
export function buildNationalSeats(): ProvinceSeat[] {
  return PROVINCE_LIST.map(province => ({
    province,
    seatCount: calcProvinceSeatCount(province),
    holderFaction: null,
  }));
}

// ═══════════════════════════════════════════════════════════════
// §派系实力计算（配置化加权）
// ═══════════════════════════════════════════════════════════════

/** 归一化工具：值/满值 clamp [0,1] */
function normalize(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(1, Math.max(0, value / max));
}

/**
 * 计算某派系实力分（0~100）。
 * 用 FACTION_POWER_WEIGHTS 加权：关系值/影响力/功绩/情报/经费池。
 */
export function calcFactionPower(save: PlayerSave, faction: FactionId): number {
  const relations = getRelationFromSave(save);
  const relation    = normalize(relations[faction] ?? 0, 100);
  const influence   = normalize(save.factionInfluence ?? 0, 100);
  const merit       = normalize(save.meritPoints ?? 0, 500);
  const intelligence = normalize(save.factionIntelligence ?? 0, 100);
  const treasury    = normalize(save.factionTreasury?.[faction] ?? 0, 100);

  const score =
    FACTION_POWER_WEIGHTS.relation     * relation +
    FACTION_POWER_WEIGHTS.influence    * influence +
    FACTION_POWER_WEIGHTS.merit        * merit +
    FACTION_POWER_WEIGHTS.intelligence * intelligence +
    FACTION_POWER_WEIGHTS.treasury     * treasury;

  return Math.round(score * 100) / 10;  // → 0~100
}

/**
 * 计算某派系在指定省份的实力分（含地域加成）。
 */
export function calcFactionPowerInProvince(
  save: PlayerSave,
  faction: FactionId,
  province: string,
): number {
  const base = calcFactionPower(save, faction);
  const domainType = getDomainTypeOfProvince(province);
  const bonus = FACTION_DOMAIN_BONUS[faction]?.[domainType] ?? 0;
  return base * (1 + bonus);
}

/**
 * 计算个人独立战力（0~100）。
 * 七维加权：政绩+民心+经济+廉洁+事件处理+人脉+任期稳定，权重从配置读。
 * 廉洁维度 = 100 - 贪腐风险值（riskValue 越高廉洁越差）。
 */
export function calcPersonalPower(save: PlayerSave): number {
  const w = PERSONAL_POWER_WEIGHTS;
  const merit     = normalize(save.meritPoints ?? 0, 500);
  const support   = normalize(save.popularSupport ?? 0, 100);
  const economy   = normalize(save.taxRevenue ?? 0, 100);
  const integrity = normalize(100 - (save.riskValue ?? 0), 100);
  const events    = normalize(save.eventsThisYear ?? 0, 12);
  const network   = normalize(save.factionInfluence ?? 0, 100);
  // 任期稳定度：扎根期越久越稳（rooting_days 从 180 倒数到 0 视为逐步稳固）
  const tenure    = normalize(save.rankLevel, 15) * 0.6 + normalize(180 - Math.min(180, save.rooting_days ?? 0), 180) * 0.4;

  const score =
    w.merit     * merit +
    w.support   * support +
    w.economy   * economy +
    w.integrity * integrity +
    w.events    * events +
    w.network   * network +
    w.tenure    * tenure;

  return Math.round(score * 100) / 10;
}

/** 个人战力七维分解（供 UI 分解条渲染） */
export function personalPowerBreakdown(save: PlayerSave): ContestDetail['breakdown'] {
  const w = PERSONAL_POWER_WEIGHTS;
  const round1 = (n: number) => Math.round(n * 10) / 10;
  return {
    merit:     round1(w.merit     * normalize(save.meritPoints ?? 0, 500) * 100),
    support:   round1(w.support   * normalize(save.popularSupport ?? 0, 100) * 100),
    economy:   round1(w.economy   * normalize(save.taxRevenue ?? 0, 100) * 100),
    integrity: round1(w.integrity * normalize(100 - (save.riskValue ?? 0), 100) * 100),
    events:    round1(w.events    * normalize(save.eventsThisYear ?? 0, 12) * 100),
    network:   round1(w.network   * normalize(save.factionInfluence ?? 0, 100) * 100),
    tenure:    round1(w.tenure    * (normalize(save.rankLevel, 15) * 0.6 + normalize(180 - Math.min(180, save.rooting_days ?? 0), 180) * 0.4) * 100),
  };
}

// ═══════════════════════════════════════════════════════════════
// §个人职位争夺判定
// ═══════════════════════════════════════════════════════════════

export interface PersonalContestResult {
  win: boolean;
  sYou: number;
  sOpp: number;
  detail: ContestDetail;
}

/**
 * 个人职位争夺判定（10% 派系 + 90% 个人）。
 * @param save          玩家存档
 * @param bandFactions  班子派系列表（竞争派系来源，通常为班子中非本派成员）
 * @param positionKey   目标职位 key
 * @param positionTitle 目标职位名称
 * @param toRank        目标职级
 */
export function resolvePersonalContest(
  save: PlayerSave,
  bandFactions: FactionId[],
  positionKey: string,
  positionTitle: string,
  toRank: number,
  targetCity: string,
): PersonalContestResult {
  const primary = (save.primaryFaction || 'reform') as FactionId;
  const playerFactionPower = calcFactionPower(save, primary);
  const personalPower = calcPersonalPower(save);

  // 我方总分 = 派系贡献 × 10% + 个人战力 × 90%
  const factionShareScore = CONTEST_BLEND.faction * playerFactionPower;
  const personalShareScore = CONTEST_BLEND.personal * personalPower;
  let sYou = Math.round((factionShareScore + personalShareScore) * 10) / 10;

  // 竞争派系实力：班子中的对立派系（去重），无则取全部对立派均值
  const competitors = [...new Set(bandFactions.filter(f => f !== primary))];
  const oppList: FactionId[] = competitors.length > 0
    ? competitors
    : ALL_FACTIONS.filter(f => f !== primary);

  // C. 跨派系结契：若与任一竞争派系存在活跃同盟，我方 sYou 获得加成
  const hasAlly = oppList.some(f => hasActiveCoalitionWith(save.coalitions ?? [], primary, f, save.gameDays));
  if (hasAlly) {
    sYou = Math.round(sYou * (1 + COALITION_CONTEST_BONUS) * 10) / 10;
  }

  const oppBreakdown = oppList.map(f => ({
    faction: f,
    power: calcFactionPower(save, f),
  }));
  // 联合争夺模式：竞争派系得分乘以配置系数（降低对手难度）
  const coalition = save.contestMode === 'coalition';
  const rivalFactor = coalition ? PROVINCE_ATTACK_COST.coalitionRivalFactor : 1;
  // 竞争派系实力 = 各竞争派实力均值 ×（联合模式系数）
  const sOpp = Math.round((oppBreakdown.reduce((s, o) => s + o.power, 0) / oppBreakdown.length) * rivalFactor * 10) / 10;

  const win = sYou >= sOpp;

  const detail: ContestDetail = {
    sYou,
    sOpp,
    factionShare: CONTEST_BLEND.faction,
    personalShare: CONTEST_BLEND.personal,
    breakdown: personalPowerBreakdown(save),
    oppBreakdown,
    win,
  };

  return { win, sYou, sOpp, detail };
}

/** 构建个人职位战记录（发起成功后写入历史） */
export function buildPersonalContestRecord(
  positionKey: string,
  positionTitle: string,
  toRank: number,
  targetCity: string,
  result: PersonalContestResult,
  day: number,
): PersonalContest {
  return {
    positionKey,
    positionTitle,
    toRank,
    targetCity,
    factionPower: Math.round(result.detail.factionShare * result.sYou * 10) / 10,
    personalPower: Math.round(result.detail.personalShare * result.sYou * 10) / 10,
    win: result.win,
    day,
  };
}

// ═══════════════════════════════════════════════════════════════
// §省级席位归属分配与全国结算
// ═══════════════════════════════════════════════════════════════

/** 确定性哈希（djb2）：同 seed 同 key 恒定 */
function hashSeed(seed: number, key: string): number {
  let h = seed;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) - h + key.charCodeAt(i)) >>> 0;
  }
  return h >>> 0;
}

/**
 * 分配各省席位归属派系。
 * 算法：各省按五派「该省实力分（含地域加成）」加权轮盘，以 gameDays+province hash 为种子（确定性）。
 * @returns Record<province, factionId | null>
 */
export function assignProvinceSeats(save: PlayerSave): Record<string, FactionId | null> {
  const result: Record<string, FactionId | null> = {};
  const seed = save.gameDays;

  for (const province of PROVINCE_LIST) {
    // 各派在该省的实力（含地域加成）
    const weights = ALL_FACTIONS.map(f => ({
      faction: f,
      power: Math.max(0, calcFactionPowerInProvince(save, f, province)),
    }));
    const totalWeight = weights.reduce((s, w) => s + w.power, 0);
    if (totalWeight <= 0) {
      result[province] = null;
      continue;
    }

    // LCG 伪随机（确定性）
    const rand = ((hashSeed(seed, province) * 1664525 + 1013904223) >>> 0) / 0xffffffff;
    let threshold = rand * totalWeight;
    let winner: FactionId | null = null;
    for (const w of weights) {
      threshold -= w.power;
      if (threshold <= 0) { winner = w.faction; break; }
    }
    result[province] = winner ?? weights[weights.length - 1].faction;
  }

  return result;
}

/**
 * 统计全国席位控制。
 * @param seatControl  各省控制派系（province → factionId | null）
 * @param seats        全国席位列表（含 seatCount）
 */
export function computeNationalControl(
  seatControl: Record<string, FactionId | null>,
  seats: ProvinceSeat[],
): NationalSeatControl {
  const factionSeats: Record<FactionId, number> = {
    reform: 0, pragmatic: 0, cyl: 0, techno: 0, local: 0,
  };
  let totalSeats = 0;

  for (const seat of seats) {
    totalSeats += seat.seatCount;
    const holder = seatControl[seat.province];
    if (holder) factionSeats[holder] += seat.seatCount;
  }

  const controlRatios = {} as Record<FactionId, number>;
  for (const f of ALL_FACTIONS) {
    controlRatios[f] = totalSeats > 0 ? factionSeats[f] / totalSeats : 0;
  }

  let dominantFaction: FactionId | null = null;
  let thresholdRatio = 0;
  for (const f of ALL_FACTIONS) {
    if (controlRatios[f] > thresholdRatio) {
      thresholdRatio = controlRatios[f];
      dominantFaction = f;
    }
  }

  return {
    totalSeats,
    factionSeats,
    controlRatios,
    dominantFaction,
    reachedThreshold: thresholdRatio >= VICTORY_THRESHOLD,
    thresholdRatio,
  };
}

/**
 * 省级席位战结算（周期边界调用）。
 * - 刷新各省归属 → 统计控制度
 * - 若本派 ≥ 80%：truce + 解冻（提前收官）
 * - 周期边界仍未达标：本轮争夺 expired，下一轮重选
 * @returns { control, updates }：control 供 UI 展示；updates 可合并进 updateSave
 */
export function resolveNationalSeatControl(
  save: PlayerSave,
): {
  control: NationalSeatControl;
  seats: ProvinceSeat[];
  updates: Partial<PlayerSave>;
} {
  // 1) 重新分配各省归属
  const seatControl = assignProvinceSeats(save);
  const seats = buildNationalSeats().map(s => ({
    ...s,
    holderFaction: seatControl[s.province] ?? null,
  }));

  // 2) 统计控制度
  const control = computeNationalControl(seatControl, seats);

  // 3) 本派是否达标
  const primary = (save.primaryFaction || '') as FactionId | '';
  const primaryRatio = primary ? control.controlRatios[primary] ?? 0 : 0;

  const updates: Partial<PlayerSave> = {
    provinceSeatControl: seatControl,
  };

  if (primary && primaryRatio >= VICTORY_THRESHOLD) {
    // 本派省级席位战获胜：本轮斗争提前收官
    Object.assign(updates, {
      strugglePhase: 'truce' as const,
      factionPromotionLocked: false,
    });
  }
  // 未达标：不在此置 expired（由 promotionFaction.expireContest 处理个人争夺过期）

  return { control, seats, updates };
}

/** 便捷：获取当前存档的全国控制统计（UI 渲染用，不落库） */
export function getNationalControl(save: PlayerSave): { control: NationalSeatControl; seats: ProvinceSeat[] } {
  const seats = buildNationalSeats().map(s => ({
    ...s,
    holderFaction: save.provinceSeatControl?.[s.province] ?? null,
  }));
  return { control: computeNationalControl(save.provinceSeatControl ?? {}, seats), seats };
}

/** 地域类型中文标签 */
export const DOMAIN_TYPE_LABEL: Record<DomainType, string> = {
  municipality: '直辖市',
  coastal:      '沿海省',
  frontier:     '边疆/民族地区',
  cultural:     '文化大省',
  inland:       '内陆省',
};

/** 渲染用：各派系地域加成描述列表 */
export function describeFactionDomainBonuses(): { faction: FactionId; label: string; lines: string[] }[] {
  return ALL_FACTIONS.map(f => ({
    faction: f,
    label: FACTION_LABEL[f],
    lines: Object.entries(FACTION_DOMAIN_BONUS[f] ?? {}).map(([dt, bonus]) =>
      `${DOMAIN_TYPE_LABEL[dt as DomainType]} +${Math.round((bonus as number) * 100)}%`
    ),
  }));
}

// ──────────────────────────────────────────────────────────────────
// §v5  省级攻夺战（本派对各省控制进度）
// ──────────────────────────────────────────────────────────────────

/** 读取各省份本派攻夺进度（0–maxProgress），未记录为 0 */
export function getProvinceAttackProgress(save: PlayerSave): Record<string, number> {
  return { ...(save.provinceAttackProgress ?? {}) };
}

/** 某省本派当前攻夺进度（0–maxProgress） */
export function getProvinceAttackProgressOf(save: PlayerSave, province: string): number {
  return Math.min(PROVINCE_ATTACK_COST.maxProgress, Math.max(0, save.provinceAttackProgress?.[province] ?? 0));
}

/**
 * 是否可对该省发起攻夺。
 * - 政绩足够（meritCost）
 * - 未满控制（progress < maxProgress）
 * - 冷却已过（factionCooldowns['provinceAttack_'+province]）
 */
export function canLaunchProvinceAttack(save: PlayerSave, province: string, day: number): { ok: boolean; reason?: string } {
  const cost = PROVINCE_ATTACK_COST;
  const progress = getProvinceAttackProgressOf(save, province);
  if (progress >= cost.maxProgress) return { ok: false, reason: '已满控制，无需继续攻夺' };
  if ((save.meritPoints ?? 0) < cost.meritCost) return { ok: false, reason: `功绩不足，需要 ${cost.meritCost} 点` };
  const cooldownUntil = save.factionCooldowns?.[`provinceAttack_${province}`] ?? 0;
  if (day < cooldownUntil) return { ok: false, reason: `冷却中，剩 ${cooldownUntil - day} 天` };
  return { ok: true };
}

/**
 * 发起一次省级攻夺：扣 meritCost 功绩、进度 +progressPerAttack、设冷却。
 * 返回可合并的存档更新（不直接写库）。
 */
export function launchProvinceAttack(save: PlayerSave, province: string, day: number): Partial<PlayerSave> {
  const cost = PROVINCE_ATTACK_COST;
  const current = getProvinceAttackProgressOf(save, province);
  const newProgress = Math.min(cost.maxProgress, current + cost.progressPerAttack);
  const progressMap: Record<string, number> = { ...(save.provinceAttackProgress ?? {}), [province]: newProgress };
  const cooldowns: Record<string, number> = { ...(save.factionCooldowns ?? {}), [`provinceAttack_${province}`]: day + cost.cooldownDays };
  return {
    provinceAttackProgress: progressMap,
    factionCooldowns: cooldowns,
    meritPoints: Math.max(0, (save.meritPoints ?? 0) - cost.meritCost),
  };
}
```

<a id="srclibrankthemets"></a>
## `src/lib/rankTheme.ts`

```typescript
/**
 * 职级主题系统
 * 根据 save.rankLevel 动态返回对应行政级别的视觉主题
 *
 * 乡镇级 (1-3)   — 泥土棕 / 稻田绿 / 青砖灰  朴素基层
 * 县处级 (4-7)   — 深藏蓝 / 行政白 / 印章红  公文严肃
 * 市厅级 (8-10)  — 深蓝   / 金线   / 大理石白 城市大气
 * 省部级 (11-13) — 正红   / 深金   / 纯白     威严肃穆
 * 国家级 (14+)   — 中国红 / 国旗金 / 墨黑     庄严神圣
 */
export interface RankTheme {
  // 背景
  pageBg: string;
  headerBg: string;
  headerText: string;
  headerSub: string;
  // 卡片
  cardBg: string;
  cardBorder: string;
  cardAccentBar: string;    // 卡片左侧竖条
  sectionHeaderBg: string;
  sectionHeaderText: string;
  sectionHeaderBorder: string;
  // 主色 & 强调
  primary: string;          // 按钮/高亮主色
  primaryText: string;
  accent: string;           // 强调/印章色
  accentSub: string;        // 强调辅助（金色线条等）
  // 文字
  labelText: string;
  valueText: string;
  mutedText: string;
  // 状态条
  quickStatBg: string;
  quickStatDivider: string;
  // 进度条
  progressBg: string;
  progressFill: string;
  // 数值颜色
  statHigh: string;
  statMid: string;
  statLow: string;
  // 徽章/标签
  badgeBg: string;
  badgeText: string;
  // 装饰
  decorLine: string;        // 红头文件横线 / 金色线条
  decorLineHeight: number;
  rankBanner: string;       // 顶部级别标语
  rankEmoji: string;        // 级别图标
  levelDesc: string;        // 级别描述
  // 特殊横幅（国旗红/公章/等）
  alertBg: string;
  alertBorder: string;
  alertText: string;
  accentBg: string;   // 选中/高亮背景（淡主色）
  // 导航卡片
  navCardBg: string;
  navCardBorder: string;
  navCardBottomBorder: string;
  navCardAccentBg: string;
  navCardAccentBorder: string;
  navCardAccentBottom: string;
  // 状态栏样式
  statusBarStyle: 'light' | 'dark';
}

// ─── 乡镇级 ─────────────────────────────────────────────
const TOWN: RankTheme = {
  pageBg:            '#F4F1EC',
  headerBg:          '#5C4A2A',
  headerText:        '#F5EDD8',
  headerSub:         '#D4C4A0',  // 加亮：原#C9B89A对比度不足
  cardBg:            '#FDFAF5',
  cardBorder:        '#D4C9B0',
  cardAccentBar:     '#9CAF88',
  sectionHeaderBg:   '#EDE6D6',
  sectionHeaderText: '#4A3A1E',  // 加深：原#5C4A2A在浅色背景上更深更清晰
  sectionHeaderBorder: '#C9B89A',
  primary:           '#5A7A4E',  // 加深：原#6B8F5E在浅背景上加深提升对比
  primaryText:       '#FFFFFF',
  accent:            '#C8102E',
  accentSub:         '#7A9E6A',
  labelText:         '#4A3A24',  // 加深：原#6B5A3E
  valueText:         '#2A1E0E',  // 加深：原#3A2E1E
  mutedText:         '#7A6A52',  // 加深：原#9C8B72，提升在浅色背景上的对比度
  quickStatBg:       '#4A3B20',
  quickStatDivider:  'rgba(255,255,255,0.15)',
  progressBg:        '#DDD4C0',
  progressFill:      '#9CAF88',
  statHigh:          '#3A6B2A',  // 加深绿色
  statMid:           '#8B6200',  // 加深黄色
  statLow:           '#C8102E',
  badgeBg:           '#9CAF88',
  badgeText:         '#FFFFFF',
  decorLine:         '#9CAF88',
  decorLineHeight:   2,
  rankBanner:        '乡镇基层干部',
  rankEmoji:         '🌾',
  levelDesc:         '扎根基层，服务人民',
  alertBg:           '#F4EFE4',
  alertBorder:       '#C9B89A',
  alertText:         '#5C4A2A',  // 加深
  accentBg:          '#EDF3E8',
  navCardBg:         '#FDFAF5',
  navCardBorder:     '#D4C9B0',
  navCardBottomBorder: '#9CAF88',
  navCardAccentBg:   '#6B8F5E',
  navCardAccentBorder: '#6B8F5E',
  navCardAccentBottom: '#4A6A40',
  statusBarStyle:    'light',
};

// ─── 县处级 ─────────────────────────────────────────────
const COUNTY: RankTheme = {
  pageBg:            '#F5F4F1',
  headerBg:          '#1E3A5F',
  headerText:        '#FFFFFF',
  headerSub:         '#C8D8EC',  // 加亮：原#A0B4CC在深蓝背景上对比度低
  cardBg:            '#FFFFFF',
  cardBorder:        '#D1D8E0',
  cardAccentBar:     '#1E3A5F',
  sectionHeaderBg:   '#EEF2F7',
  sectionHeaderText: '#0D2240',  // 加深：原#1E3A5F
  sectionHeaderBorder: '#C8102E',
  primary:           '#C8102E',
  primaryText:       '#FFFFFF',
  accent:            '#C8102E',
  accentSub:         '#1E3A5F',
  labelText:         '#2A3A4A',  // 加深：原#4A5568
  valueText:         '#0D1822',  // 加深：原#1A2B3C
  mutedText:         '#4A5E72',  // 加深：原#718096
  quickStatBg:       '#1E3A5F',
  quickStatDivider:  'rgba(255,255,255,0.15)',
  progressBg:        '#E2E8F0',
  progressFill:      '#1E3A5F',
  statHigh:          '#1a6b2a',  // 加深绿
  statMid:           '#A05C00',  // 加深橙
  statLow:           '#C8102E',
  badgeBg:           '#C8102E',
  badgeText:         '#FFFFFF',
  decorLine:         '#C8102E',
  decorLineHeight:   3,
  rankBanner:        '县处级领导干部',
  rankEmoji:         '📋',
  levelDesc:         '主政一县，胸怀全局',
  alertBg:           '#FEF2F2',
  alertBorder:       '#C8102E',
  alertText:         '#7B0C0C',  // 加深
  accentBg:          '#FEF2F2',
  navCardBg:         '#FFFFFF',
  navCardBorder:     '#D8D4CE',
  navCardBottomBorder: '#1E3A5F',
  navCardAccentBg:   '#C8102E',
  navCardAccentBorder: '#C8102E',
  navCardAccentBottom: '#9E1E1E',
  statusBarStyle:    'light',
};

// ─── 市厅级（厅局级，ranks 7-9：副市长/市长/市委书记） ─────────────────────
const CITY: RankTheme = {
  pageBg:            '#F2F4F8',
  headerBg:          '#003366',
  headerText:        '#FFFFFF',
  headerSub:         '#B8D0E8',  // 加亮：原#8AAFD4
  cardBg:            '#FFFFFF',
  cardBorder:        '#C8D8E8',
  cardAccentBar:     '#D4AF37',
  sectionHeaderBg:   '#EBF0F7',
  sectionHeaderText: '#002244',  // 加深：原#003366
  sectionHeaderBorder: '#D4AF37',
  primary:           '#003366',
  primaryText:       '#FFFFFF',
  accent:            '#D4AF37',
  accentSub:         '#003366',
  labelText:         '#2A3C50',  // 加深：原#4A5C70
  valueText:         '#051525',  // 加深：原#0D1F35
  mutedText:         '#3A5065',  // 加深：原#6B7E90
  quickStatBg:       '#012755',
  quickStatDivider:  'rgba(212,175,55,0.3)',
  progressBg:        '#D8E4F0',
  progressFill:      '#D4AF37',
  statHigh:          '#1a6b2a',  // 加深绿
  statMid:           '#8B6200',  // 加深黄
  statLow:           '#C8102E',
  badgeBg:           '#D4AF37',
  badgeText:         '#002244',  // 加深确保可读
  decorLine:         '#D4AF37',
  decorLineHeight:   2,
  rankBanner:        '厅局级领导干部',
  rankEmoji:         '🏙️',
  levelDesc:         '运筹帷幄，城市治理',
  alertBg:           '#FFFBEB',
  alertBorder:       '#D4AF37',
  alertText:         '#6B4000',  // 加深：原#92400E
  accentBg:          '#EBF0F7',
  navCardBg:         '#FFFFFF',
  navCardBorder:     '#C8D8E8',
  navCardBottomBorder: '#D4AF37',
  navCardAccentBg:   '#003366',
  navCardAccentBorder: '#003366',
  navCardAccentBottom: '#001A40',
  statusBarStyle:    'light',
};

// ─── 省部级 ─────────────────────────────────────────────
const PROVINCE: RankTheme = {
  pageBg:            '#FDF8F8',
  headerBg:          '#DE2910',
  headerText:        '#FFFFFF',
  headerSub:         '#FFDDE0',  // 加亮：原#FFCDD2
  cardBg:            '#FFFFFF',
  cardBorder:        '#E8C8C8',
  cardAccentBar:     '#B8860B',
  sectionHeaderBg:   '#FEF2F2',
  sectionHeaderText: '#7B0A0A',  // 加深：原#9B1C1C
  sectionHeaderBorder: '#B8860B',
  primary:           '#DE2910',
  primaryText:       '#FFFFFF',
  accent:            '#B8860B',
  accentSub:         '#DE2910',
  labelText:         '#5A1010',  // 加深：原#6B2020
  valueText:         '#2D0606',  // 加深：原#3D0C0C
  mutedText:         '#7A2A2A',  // 加深：原#9B4040
  quickStatBg:       '#B22000',
  quickStatDivider:  'rgba(255,255,255,0.2)',
  progressBg:        '#F8DCDC',
  progressFill:      '#B8860B',
  statHigh:          '#1a6b2a',
  statMid:           '#8B6200',
  statLow:           '#DE2910',
  badgeBg:           '#B8860B',
  badgeText:         '#FFFFFF',
  decorLine:         '#B8860B',
  decorLineHeight:   3,
  rankBanner:        '省部级领导干部',
  rankEmoji:         '⭐',
  levelDesc:         '一省之政，责任如山',
  alertBg:           '#FFF8E1',
  alertBorder:       '#B8860B',
  alertText:         '#5A3A00',  // 加深：原#7D5A00
  accentBg:          '#FEF2F2',
  navCardBg:         '#FFFFFF',
  navCardBorder:     '#E8C8C8',
  navCardBottomBorder: '#B8860B',
  navCardAccentBg:   '#DE2910',
  navCardAccentBorder: '#DE2910',
  navCardAccentBottom: '#A01F0A',
  statusBarStyle:    'light',
};

// ─── 国家级 ─────────────────────────────────────────────
const NATIONAL: RankTheme = {
  pageBg:            '#1A1A1A',
  headerBg:          '#0D0D0D',
  headerText:        '#FFE08A',
  headerSub:         '#FF8080',  // 加亮：原#CC4444在黑背景上偏暗
  cardBg:            '#242424',
  cardBorder:        '#3A2A0A',
  cardAccentBar:     '#FFDE00',
  sectionHeaderBg:   '#1E1008',
  sectionHeaderText: '#FFE08A',
  sectionHeaderBorder: '#DE2910',
  primary:           '#DE2910',
  primaryText:       '#FFE08A',
  accent:            '#FFDE00',
  accentSub:         '#DE2910',
  labelText:         '#DDB85A',  // 加亮：原#CC9944
  valueText:         '#FFE08A',
  mutedText:         '#B8922A',  // 加亮：原#8B6914在暗背景对比不足
  quickStatBg:       '#0D0D0D',
  quickStatDivider:  'rgba(255,222,0,0.2)',
  progressBg:        '#2A1A00',
  progressFill:      '#FFDE00',
  statHigh:          '#4CAF50',
  statMid:           '#FFDE00',
  statLow:           '#FF5252',  // 加亮：原#DE2910在暗背景上加亮
  badgeBg:           '#FFDE00',
  badgeText:         '#0D0D0D',
  decorLine:         '#FFDE00',
  decorLineHeight:   2,
  rankBanner:        '国家领导人',
  rankEmoji:         '🏛️',
  levelDesc:         '治国理政，人民重托',
  alertBg:           '#1E0800',
  alertBorder:       '#DE2910',
  alertText:         '#FF9A80',  // 加亮：原#FF8A80
  accentBg:          '#1E1008',
  navCardBg:         '#242424',
  navCardBorder:     '#3A2A0A',
  navCardBottomBorder: '#FFDE00',
  navCardAccentBg:   '#DE2910',
  navCardAccentBorder: '#DE2910',
  navCardAccentBottom: '#8B0000',
  statusBarStyle:    'light',
};

/** 根据 rankLevel 返回对应主题
 * 分层依据《公务员法》职级序列：
 *   TOWN     (1-3)  : 乡科级（科员~正科）
 *   COUNTY   (4-6)  : 县处级（副处~正处）
 *   CITY     (7-9)  : 厅局级（副厅~正厅）
 *   PROVINCE (10-12): 省部级（副部~正部）
 *   NATIONAL (13+)  : 国家级（副职/正职/最高）
 */
export function getRankTheme(rankLevel: number): RankTheme {
  if (rankLevel >= 13) return NATIONAL;
  if (rankLevel >= 10) return PROVINCE;
  if (rankLevel >= 7)  return CITY;
  if (rankLevel >= 4)  return COUNTY;
  return TOWN;
}

/** 根据职级返回级别标识色 */
export function getRankColor(rankLevel: number): string {
  if (rankLevel >= 13) return '#DE2910';
  if (rankLevel >= 10) return '#B8860B';
  if (rankLevel >= 7)  return '#D4AF37';
  if (rankLevel >= 4)  return '#1E3A5F';
  return '#6B8F5E';
}
```

<a id="srclibsensitivefilterts"></a>
## `src/lib/sensitiveFilter.ts`

```typescript
// 客户端敏感词审查工具
// 机制1: 调用 player_check_name_sensitive RPC（不暴露词汇列表，仅返回 boolean）
// 机制2: 本地缓存上一次检测结果，同名无需重复请求
// 机制3: 防抖调用，避免高频请求
import { supabase } from '@/client/supabase';

const cache = new Map<string, boolean>(); // name → isSensitive

/** 检测名字是否含敏感词（通过 RPC，结果本地缓存）。
 *  返回 true 表示含敏感词，false 表示合规，null 表示网络异常（不阻断）。 */
export async function checkNameSensitive(name: string): Promise<boolean | null> {
  const key = name.trim().toLowerCase();
  if (!key) return false;
  if (cache.has(key)) return cache.get(key)!;
  const { data, error } = await supabase.rpc('player_check_name_sensitive', { p_name: key });
  if (error) return null; // 网络异常不阻断
  const result = Boolean(data);
  cache.set(key, result);
  return result;
}

/** 检测存档创建姓名（通过专用 RPC，返回 ok + message）。 */
export async function checkCreateSaveName(name: string): Promise<{ ok: boolean; message: string }> {
  const { data, error } = await supabase.rpc('player_check_create_save_name', { p_name: name.trim() });
  if (error) return { ok: true, message: '' }; // 网络异常不阻断
  const r = Array.isArray(data) ? data[0] : data;
  return { ok: Boolean(r?.ok ?? true), message: String(r?.message ?? '') };
}

/** 清除缓存（敏感词库更新后调用）。 */
export function clearSensitiveCache() {
  cache.clear();
}

/** 简单防抖 hook 工具（在 React 组件中使用 useDebounceCheck） */
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
export function debounceCheckName(
  name: string,
  cb: (result: boolean | null) => void,
  delay = 400,
) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    void checkNameSensitive(name).then(cb);
  }, delay);
}
```

<a id="srclibthemets"></a>
## `src/lib/theme.ts`

```typescript
import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';

// Colors mirror global.css variables exactly
export const THEME = {
  light: {
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(0 0% 3.9%)',
    card: 'hsl(0 0% 100%)',
    cardForeground: 'hsl(0 0% 3.9%)',
    popover: 'hsl(0 0% 100%)',
    popoverForeground: 'hsl(0 0% 3.9%)',
    primary: 'hsl(0 0% 9%)',
    primaryForeground: 'hsl(0 0% 98%)',
    secondary: 'hsl(0 0% 96.1%)',
    secondaryForeground: 'hsl(0 0% 9%)',
    muted: 'hsl(0 0% 96.1%)',
    mutedForeground: 'hsl(0 0% 45.1%)',
    accent: 'hsl(0 0% 96.1%)',
    accentForeground: 'hsl(0 0% 9%)',
    destructive: 'hsl(0 84.2% 60.2%)',
    destructiveForeground: 'hsl(0 0% 98%)',
    border: 'hsl(0 0% 89.8%)',
    input: 'hsl(0 0% 89.8%)',
    ring: 'hsl(0 0% 3.9%)',
    radius: '0.5rem',
  },
  dark: {
    background: 'hsl(0 0% 3.9%)',
    foreground: 'hsl(0 0% 98%)',
    card: 'hsl(0 0% 3.9%)',
    cardForeground: 'hsl(0 0% 98%)',
    popover: 'hsl(0 0% 3.9%)',
    popoverForeground: 'hsl(0 0% 98%)',
    primary: 'hsl(0 0% 98%)',
    primaryForeground: 'hsl(0 0% 9%)',
    secondary: 'hsl(0 0% 14.9%)',
    secondaryForeground: 'hsl(0 0% 98%)',
    muted: 'hsl(0 0% 14.9%)',
    mutedForeground: 'hsl(0 0% 63.9%)',
    accent: 'hsl(0 0% 14.9%)',
    accentForeground: 'hsl(0 0% 98%)',
    destructive: 'hsl(0 84.2% 60.2%)',
    destructiveForeground: 'hsl(0 0% 98%)',
    border: 'hsl(0 0% 14.9%)',
    input: 'hsl(0 0% 14.9%)',
    ring: 'hsl(0 0% 83.1%)',
    radius: '0.5rem',
  },
};

export const NAV_THEME: Record<'light' | 'dark', Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
  },
};
```

<a id="srclibutilsts"></a>
## `src/lib/utils.ts`

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```
