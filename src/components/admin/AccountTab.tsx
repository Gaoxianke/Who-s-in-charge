// 账号管理 Tab：
// - 查看所有玩家账号（邮箱、玩家、职级、注册时间）
// - 密码：超级管理员可查看账号标识并直接改密/删号；普通管理员密码显示 ***，仅能发起重置申请
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { A, Badge, Btn, Card, Empty, LabeledInput, Row } from './shared';
import { WheelPicker } from './WheelPicker';
import {
  adminAccountList, adminAccountStats, adminDeleteInactive, adminDeletePlayerAccount,
  adminGetPlayerPassword, adminPreviewInactive, adminPromoteRank, adminPurgeExpiredAccounts,
  adminRequestPasswordReset, adminRestoreAccount, adminSetPlayerPassword, adminToggleBan,
  listArchivedAccounts,
  type AccountRow, type AccountStats, type ArchivedAccount,
} from '@/lib/adminApi';

const DAYS_VALUES = Array.from({ length: 31 }, (_, i) => i + 1);

export function AccountTab({ role }: { role: string }) {
  const isSuperAdmin = role === 'super_admin';
  const canResetBan = role === 'admin' || role === 'super_admin';
  const canDeleteInactive = role === 'super_admin';

  const [rows, setRows] = useState<AccountRow[]>([]);
  const [st, setSt] = useState<AccountStats | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  // 选中的账号操作
  const [sel, setSel] = useState<AccountRow | null>(null);
  const [promoteRank, setPromoteRank] = useState('1');
  const [newPwd, setNewPwd] = useState('');
  // 不活跃清理
  const [inactiveDays, setInactiveDays] = useState(30);
  const [preview, setPreview] = useState<{ user_id: string; email: string; last_active: string; player_name: string | null }[]>([]);
  const [previewing, setPreviewing] = useState(false);
  // 密码查看（超管）：显示账号标识
  const [pwdEmail, setPwdEmail] = useState<string | null>(null);
  const [pwdLoading, setPwdLoading] = useState(false);
  // 重置申请原因
  const [resetReason, setResetReason] = useState('');
  // 删除账号确认
  const [confirmDelete, setConfirmDelete] = useState(false);
  // 软删除账号列表
  const [deletedRows, setDeletedRows] = useState<AccountRow[]>([]);
  const [deletedLoading, setDeletedLoading] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  // 归档记录（已彻底清除账号的历史记录保护）
  const [archivedRows, setArchivedRows] = useState<ArchivedAccount[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  // 导出明细
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [r, s] = await Promise.all([adminAccountList(search, 50, 0), adminAccountStats()]);
    setRows(r); setSt(s); setLoading(false);
  }, [search]);

  const doSearch = () => load();

  const flash = (text: string) => { setMsg(text); setTimeout(() => setMsg(''), 2500); };

  // 导出含注册时间的账号明细 CSV（复制到剪贴板）
  const onExport = async () => {
    setExporting(true);
    const list = await adminAccountList(search, 500, 0);
    const esc = (v: unknown) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const header = ['邮箱', '注册时间', '玩家昵称', '职级', '职级名', '功勋', '是否封禁', '是否管理员', '管理员角色', '最后登录'].map(esc).join(',');
    const lines = list.map((r) => [
      r.email, r.created_at, r.player_name ?? '', r.rank_level ?? '', r.rank_name ?? '',
      r.merit_points ?? '', r.banned ? '是' : '否', r.is_admin ? '是' : '否', r.admin_role ?? '', r.last_sign_in_at ?? '',
    ].map(esc).join(','));
    const csv = [header, ...lines].join('\n');
    await Clipboard.setStringAsync(csv);
    setExporting(false);
    flash(`✓ 已导出 ${list.length} 条账号明细，CSV 已复制到剪贴板`);
  };

  const onPromote = async (saveId: string) => {
    const r = await adminPromoteRank(saveId, Number(promoteRank));
    flash(r.ok ? `✓ 已晋升至 L${promoteRank}` : `✗ ${r.err}`);
    if (r.ok) load();
  };
  const onBan = async (row: AccountRow) => {
    const r = await adminToggleBan(row.user_id, !row.banned);
    flash(r.ok ? (row.banned ? '✓ 已解封' : '✓ 已封禁') : `✗ ${r.err}`);
    if (r.ok) load();
  };
  // 普通管理员：发起密码重置申请（提交超级管理员审批）
  const onRequestReset = async (userId: string) => {
    const r = await adminRequestPasswordReset(userId, resetReason.trim() || undefined);
    flash(r.ok ? '✓ 已提交密码重置申请，等待超级管理员审批' : `✗ ${r.err}`);
    if (r.ok) setResetReason('');
  };
  // 超级管理员：直接修改玩家密码
  const onSetPassword = async (userId: string) => {
    if (newPwd.length < 6) { flash('✗ 密码至少 6 位'); return; }
    const r = await adminSetPlayerPassword(userId, newPwd);
    flash(r.ok ? '✓ 密码已修改' : `✗ ${r.err}`);
    if (r.ok) setNewPwd('');
  };
  // 超级管理员：查看账号标识（Auth 密码为哈希不可逆，展示账号用于核对）
  const onViewPassword = async (userId: string) => {
    setPwdLoading(true);
    const r = await adminGetPlayerPassword(userId);
    setPwdLoading(false);
    if (r.ok) setPwdEmail(r.email ?? '未知');
    else flash(`✗ ${r.err}`);
  };
  // 超级管理员：删除玩家账号
  const onDeleteAccount = async (userId: string) => {
    const r = await adminDeletePlayerAccount(userId);
    setConfirmDelete(false);
    flash(r.ok ? '✓ 账号已标记删除（7天后自动清除）' : `✗ ${r.err}`);
    if (r.ok) { setSel(null); load(); }
  };

  // 加载软删除账号列表
  const loadDeleted = async () => {
    setDeletedLoading(true);
    const list = await adminAccountList('', 100, 0, true);
    setDeletedRows(list.filter((r) => r.auth_deleted_at));
    setDeletedLoading(false);
  };
  const onToggleDeleted = () => {
    if (!showDeleted) loadDeleted();
    setShowDeleted((v) => !v);
  };

  // 加载归档记录（已彻底清除账号的历史记录）
  const loadArchived = async () => {
    setArchivedLoading(true);
    const list = await listArchivedAccounts('', 100, 0);
    setArchivedRows(list);
    setArchivedLoading(false);
  };
  const onToggleArchived = () => {
    if (!showArchived) loadArchived();
    setShowArchived((v) => !v);
  };

  // 恢复账号
  const onRestoreAccount = async (row: AccountRow) => {
    const r = await adminRestoreAccount(row.user_id);
    flash(r.ok ? `✓ 账号「${row.email}」已恢复` : `✗ ${r.err}`);
    if (r.ok) loadDeleted();
  };

  // 超管：立即清除已过期的软删账号
  const onPurgeExpired = async () => {
    const r = await adminPurgeExpiredAccounts();
    flash(r.ok ? `✓ 已彻底清除 ${r.count ?? 0} 个已过期账号` : `✗ ${r.err}`);
    if (r.ok) loadDeleted();
  };

  const previewInactive = async () => {
    setPreviewing(true); setMsg('');
    const list = await adminPreviewInactive(inactiveDays);
    setPreview(list.map((r) => ({ user_id: r.user_id, email: r.email, last_active: r.last_active, player_name: r.player_name })));
    setPreviewing(false);
    flash(`找到 ${list.length} 个不活跃账号`);
  };
  const deleteInactive = async () => {
    if (preview.length === 0) { flash('请先预览'); return; }
    const cnt = await adminDeleteInactive(preview.map((p) => p.user_id));
    flash(`✓ 已清理 ${cnt} 个账号`);
    setPreview([]);
    load();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* 统计条 */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <MiniStat label="注册用户" value={st?.total_users ?? 0} />
        <MiniStat label="已建角色" value={st?.has_character ?? 0} />
        <MiniStat label="存档保留" value={st?.active_saves ?? 0} />
        <MiniStat label="管理员" value={st?.admin_count ?? 0} />
      </View>

      {/* 搜索 */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <LabeledInput label="搜索（邮箱 / 昵称）" value={search} onChange={setSearch} placeholder="留空查看全部" />
        </View>
        <View style={{ justifyContent: 'flex-end' }}>
          <Btn label="搜索" onPress={doSearch} small />
        </View>
        <View style={{ justifyContent: 'flex-end' }}>
          <Btn label={exporting ? '导出中...' : '导出明细'} onPress={onExport} small variant="blue" disabled={exporting} />
        </View>
      </View>

      {msg ? <Text style={{ color: A.goldLight, fontSize: 12, paddingHorizontal: 4 }}>{msg}</Text> : null}

      {/* 账号列表 */}
      <Card title={`账号列表（${rows.length}）`}>
        {loading ? <ActivityIndicator color={A.gold} /> :
          rows.length === 0 ? <Empty text="无匹配账号" /> :
          rows.map((row) => (
            <View key={row.user_id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: A.divider, gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: A.textPrimary, fontSize: 12, fontWeight: '600', flex: 1 }}>{row.email}</Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {row.is_admin ? <Badge text={row.admin_role ?? 'admin'} color={A.gold} /> : null}
                  {row.banned ? <Badge text="封禁" color={A.red} /> : null}
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Text style={{ color: A.textSecond, fontSize: 10 }}>注册 {new Date(row.created_at).toLocaleString('zh-CN')}</Text>
                {row.player_name ? <Text style={{ color: A.textSecond, fontSize: 10 }}>{row.player_name} L{row.rank_level} {row.rank_name}</Text> : null}
              </View>
              {/* 密码显示：超管显示账号标识入口，普通管理员显示 *** */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: A.textHint, fontSize: 10 }}>密码：</Text>
                {isSuperAdmin ? (
                  <Pressable cssInterop={false} onPress={() => onViewPassword(row.user_id)} hitSlop={6}>
                    <Text style={{ color: A.gold, fontSize: 10, fontWeight: '600' }}>{pwdLoading ? '查询中...' : '查看账号 ›'}</Text>
                  </Pressable>
                ) : (
                  <Text style={{ color: A.textHint, fontSize: 10 }}>********（仅超级管理员可查看）</Text>
                )}
              </View>
              <Btn label={sel?.user_id === row.user_id ? '收起操作' : '展开操作'} onPress={() => setSel(sel?.user_id === row.user_id ? null : row)} small variant="ghost" />
              {sel?.user_id === row.user_id ? (
                <View style={{ marginTop: 8, gap: 10, backgroundColor: A.bgInput, padding: 10, borderWidth: 1, borderColor: A.border }}>
                  <Text style={{ color: A.goldLight, fontSize: 11, fontWeight: '700' }}>账号操作</Text>
                  {/* 晋升（需存档） */}
                  {row.save_id ? (
                    <View style={{ gap: 6 }}>
                      <Text style={{ color: A.textSecond, fontSize: 10 }}>职务晋升（目标职级 1-15）</Text>
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                          <LabeledInput label="" value={promoteRank} onChange={setPromoteRank} placeholder="如 8" keyboardType="number-pad" />
                        </View>
                        <View style={{ justifyContent: 'flex-end' }}>
                          <Btn label="晋升" onPress={() => onPromote(row.save_id!)} small variant="gold" disabled={!canResetBan} />
                        </View>
                      </View>
                    </View>
                  ) : <Text style={{ color: A.textHint, fontSize: 10 }}>该用户尚未建角色</Text>}

                  {/* 封禁/解封 */}
                  {canResetBan ? (
                    <Btn label={row.banned ? '🔓 解封账号' : '🔒 封禁账号'} onPress={() => onBan(row)} small variant={row.banned ? 'green' : 'red'} />
                  ) : null}

                  {/* 密码：超管直接改密 / 普通管理员发起重置申请 */}
                  {isSuperAdmin ? (
                    <View style={{ gap: 6 }}>
                      <Text style={{ color: A.textSecond, fontSize: 10 }}>修改密码（≥6位，立即生效）</Text>
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
                        <View style={{ flex: 1 }}>
                          <LabeledInput label="" value={newPwd} onChange={setNewPwd} placeholder="新密码" />
                        </View>
                        <Btn label="修改密码" onPress={() => onSetPassword(row.user_id)} small variant="blue" />
                      </View>
                      {/* 删除账号 */}
                      {confirmDelete ? (
                        <View style={{ gap: 6, marginTop: 4 }}>
                          <Text style={{ color: A.red, fontSize: 11, fontWeight: '700' }}>确认删除账号 {row.email}？此操作不可恢复！</Text>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <Btn label="确认删除" onPress={() => onDeleteAccount(row.user_id)} variant="red" small style={{ flex: 1 }} />
                            <Btn label="取消" onPress={() => setConfirmDelete(false)} variant="ghost" small style={{ flex: 1 }} />
                          </View>
                        </View>
                      ) : (
                        <Btn label="🗑️ 删除该账号" onPress={() => setConfirmDelete(true)} variant="red" small />
                      )}
                    </View>
                  ) : (
                    <View style={{ gap: 6 }}>
                      <Text style={{ color: A.textHint, fontSize: 10 }}>普通管理员无法直接修改密码，需向超级管理员申请重置</Text>
                      <LabeledInput label="重置原因（可选）" value={resetReason} onChange={setResetReason} placeholder="如：玩家忘记密码" />
                      <Btn label="📝 提交密码重置申请" onPress={() => onRequestReset(row.user_id)} variant="blue" small />
                    </View>
                  )}
                </View>
              ) : null}
            </View>
          ))
        }
      </Card>

      {/* 不活跃清理（super_admin） */}
      {canDeleteInactive ? (
        <Card title="不活跃账号清理" accent={A.red}>
          <Text style={{ color: A.textSecond, fontSize: 11, lineHeight: 17, marginBottom: 8 }}>
            彻底删除超过指定天数未登录的账号（从数据库永久移除，不可恢复）
          </Text>
          {/* 天数滚轮选择器 */}
          <View style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, padding: 10, marginBottom: 10 }}>
            <Text style={{ color: A.textHint, fontSize: 10, marginBottom: 6, letterSpacing: 0.5 }}>选择清理天数（1–31 天）</Text>
            <WheelPicker values={DAYS_VALUES} selected={inactiveDays} onChange={setInactiveDays} unit="天未登录" />
          </View>
          <Btn label={previewing ? '查询中...' : `预览 ${inactiveDays} 天未登录账号`} onPress={previewInactive} variant="ghost" disabled={previewing} />
          {preview.length > 0 ? (
            <View style={{ marginTop: 10, gap: 6 }}>
              {preview.map((p) => (
                <Row key={p.user_id} label={p.email} value={`${p.player_name ?? '无存档'} · ${new Date(p.last_active).toLocaleDateString('zh-CN')}`} />
              ))}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Btn label={`确认删除 ${preview.length} 个`} onPress={deleteInactive} variant="red" />
                <Btn label="取消" onPress={() => setPreview([])} variant="ghost" small />
              </View>
            </View>
          ) : null}
        </Card>
      ) : null}

      {/* 软删除账号保留区（30天保留） */}
      <Card title="待删除账号（30天保留）" accent={A.red}>
        <View style={{ gap: 8 }}>
          {/* 说明条 */}
          <View style={{ backgroundColor: 'rgba(200,50,50,0.1)', borderLeftWidth: 2, borderLeftColor: A.red, paddingHorizontal: 10, paddingVertical: 7 }}>
            <Text style={{ color: A.textSecond, fontSize: 11, lineHeight: 17 }}>
              {'被删除的账号会在此保留 7 天，期间数据完整保留，超管可一键恢复。\n到期后可手动彻底清除，或由系统自动处理。'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn label={showDeleted ? '收起列表' : '查看待删除账号'} onPress={onToggleDeleted} small variant="ghost" />
            {isSuperAdmin && showDeleted && (
              <Btn label="清除已过期" onPress={onPurgeExpired} small variant="red" />
            )}
          </View>
          {showDeleted && (
            deletedLoading ? <ActivityIndicator color={A.red} style={{ marginTop: 8 }} /> :
            deletedRows.length === 0 ? (
              <Text style={{ color: A.textHint, fontSize: 12, textAlign: 'center', marginTop: 6 }}>暂无待删除账号</Text>
            ) : (
              <View style={{ gap: 8, marginTop: 4 }}>
                {deletedRows.map((row) => {
                  const deletedAt = row.auth_deleted_at ? new Date(row.auth_deleted_at) : null;
                  const purgeAt = deletedAt ? new Date(deletedAt.getTime() + 7 * 86400000) : null;
                  const daysLeft = purgeAt ? Math.max(0, Math.ceil((purgeAt.getTime() - Date.now()) / 86400000)) : 0;
                  const expired = daysLeft === 0;
                  return (
                    <View key={row.user_id} style={{ backgroundColor: A.bgMid, borderWidth: 1, borderColor: expired ? A.red : A.divider, padding: 10, gap: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ color: A.textPrimary, fontSize: 12, flex: 1 }}>{row.email}</Text>
                        <View style={{ backgroundColor: expired ? A.red : 'rgba(200,50,50,0.25)', paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ color: expired ? '#fff' : A.red, fontSize: 10, fontWeight: '700' }}>
                            {expired ? '已到期' : `${daysLeft}天后清除`}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: A.textHint, fontSize: 10 }}>
                        {row.player_name ? `角色：${row.player_name}` : '无存档'}
                        {deletedAt ? `　删除时间：${deletedAt.toLocaleDateString('zh-CN')}` : ''}
                      </Text>
                      {isSuperAdmin && !expired && (
                        <Btn label="恢复账号" onPress={() => onRestoreAccount(row)} small variant="green" />
                      )}
                    </View>
                  );
                })}
              </View>
            )
          )}
        </View>
      </Card>
    <Card title="🗄️ 账号归档记录" accent={A.gold}>
        <View style={{ gap: 8 }}>
          <Text style={{ color: A.textSecond, fontSize: 11, lineHeight: 17 }}>
            {'账号彻底清除后，其关键记录（邮箱、删除时间、原因、审计日志条数）会归档保留，确保账号记录可追溯、不被完全抹除。'}
          </Text>
          <Btn label={showArchived ? '收起归档' : '查看归档记录'} onPress={onToggleArchived} small variant="ghost" />
          {showArchived && (
            archivedLoading ? <ActivityIndicator color={A.gold} style={{ marginTop: 8 }} /> :
            archivedRows.length === 0 ? (
              <Text style={{ color: A.textHint, fontSize: 12, textAlign: 'center', marginTop: 6 }}>暂无归档记录</Text>
            ) : (
              <View style={{ gap: 8, marginTop: 4 }}>
                {archivedRows.map((a) => {
                  const delAt = a.deleted_at ? new Date(a.deleted_at) : null;
                  return (
                    <View key={a.id} style={{ backgroundColor: A.bgMid, borderWidth: 1, borderColor: A.divider, padding: 10, gap: 4 }}>
                      <Text style={{ color: A.textPrimary, fontSize: 12 }}>{a.email ?? '（无邮箱）'}</Text>
                      <Text style={{ color: A.textHint, fontSize: 10 }}>
                        {a.player_name ? `角色：${a.player_name}　` : ''}
                        {delAt ? `删除：${delAt.toLocaleDateString('zh-CN')}` : ''}
                      </Text>
                      <Text style={{ color: A.textHint, fontSize: 10 }}>原因：{a.deletion_reason ?? '—'}　审计日志：{a.audit_log_count} 条</Text>
                    </View>
                  );
                })}
              </View>
            )
          )}
        </View>
      </Card>
    </ScrollView>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flex: 1, backgroundColor: A.bgMid, borderWidth: 1, borderColor: A.divider, padding: 8, alignItems: 'center', gap: 2 }}>
      <Text style={{ color: A.gold, fontSize: 9 }}>{label}</Text>
      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>{value.toLocaleString()}</Text>
    </View>
  );
}
