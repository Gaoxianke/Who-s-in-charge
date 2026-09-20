// 用户审批 Tab（admin+）：统计、搜索、状态筛选、批量通过/驳回、详情、拒绝模板、30s 自动刷新
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { A, Badge, Btn, Card, Empty } from './shared';
import { adminApprovalList, adminApprovalStats, adminApproveUser, adminBatchApproveAll, adminBatchReject, adminGetAutoApproval, adminRejectUser, adminSetAutoApproval, adminSetCodeSystem, adminTodaySystemRejectedCount, type ApprovalRow, type ApprovalStats, type AutoApprovalConfig } from '@/lib/adminApi';

const REJECT_TEMPLATES = [
  '信息不完整，请补充真实资料后重新申请',
  '测试码已过期，请使用新的测试码申请',
  '注册信息与测试码不匹配',
  '不符合当前内测资格要求',
  '重复申请，已有一个有效账号',
  '⚠️ 系统检测：该设备已有账号登录，不允许重复注册',
  '内测资格已满，请等待下一批次开放',
  '账号信息异常，请联系管理员处理',
];

const STATUS_LABEL: Record<string, string> = { pending: '待审核', approved: '已通过', rejected: '已驳回' };
const STATUS_COLOR: Record<string, string> = { pending: A.gold, approved: A.green, rejected: A.red };

export function ApprovalTab({ role: _role }: { role: string }) {
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [stats, setStats] = useState<ApprovalStats>({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // 隐藏已审批记录开关
  const [hideDone, setHideDone] = useState(false);
  // 自动审批配置
  const [autoCfg, setAutoCfg] = useState<AutoApprovalConfig>({ enabled: false, note: null, updated_by: null, updated_at: null, code_system_enabled: true });
  const [autoLoading, setAutoLoading] = useState(false);
  const [confirmAuto, setConfirmAuto] = useState(false);
  const [codeConfirm, setCodeConfirm] = useState(false);
  // 今日系统拒绝人数
  const [todayRejected, setTodayRejected] = useState(0);
  const isSuper = _role === 'super_admin';
  // 一键批量通过确认框
  const [confirmApproveAll, setConfirmApproveAll] = useState(false);
  const [approveAllLoading, setApproveAllLoading] = useState(false);

  const [detail, setDetail] = useState<ApprovalRow | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ userId: string; batch: boolean } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const [list, s, auto, today] = await Promise.all([
      adminApprovalList(search, statusFilter, 100),
      adminApprovalStats(),
      adminGetAutoApproval(),
      adminTodaySystemRejectedCount(),
    ]);
    setRows(list);
    setStats(s);
    setAutoCfg(auto);
    setTodayRejected(today);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    // 搜索输入做 400ms 防抖，避免每次按键都触发请求
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(load, 400);
    timer.current = setInterval(load, 30000);
    return () => {
      if (timer.current) clearInterval(timer.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [load]);

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 2500);
  };

  const approve = async (userId: string) => {
    const { ok, err } = await adminApproveUser(userId);
    if (!ok) { flash(false, err ?? '操作失败'); return; }
    flash(true, '✓ 已通过审批');
    load();
  };

  /** 一键通过全部 pending（服务端直接执行，不受前端分页限制） */
  const approveAll = async () => {
    setApproveAllLoading(true);
    const { count, err } = await adminBatchApproveAll();
    setApproveAllLoading(false);
    setConfirmApproveAll(false);
    if (err) { flash(false, `操作失败：${err}`); return; }
    flash(true, `✅ 已一键通过全部 ${count} 个待审核用户`);
    load();
  };

  const openReject = (userId: string, batch: boolean) => {
    setRejectTarget({ userId, batch });
    setRejectReason('');
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    const reason = rejectReason.trim() || '未通过';
    if (rejectTarget.batch) {
      const ids = Array.from(selected);
      const count = await adminBatchReject(ids, reason);
      flash(true, `✓ 已批量驳回 ${count} 条`);
      setSelected(new Set());
      setSelectMode(false);
    } else {
      const { ok, err } = await adminRejectUser(rejectTarget.userId, reason);
      if (!ok) { flash(false, err ?? '操作失败'); setRejectTarget(null); return; }
      flash(true, '✓ 已驳回');
    }
    setRejectTarget(null);
    load();
  };

  const toggleSelect = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  /** 切换自动审批模式（仅超级管理员） */
  const applyAutoApproval = async () => {
    setConfirmAuto(false);
    setAutoLoading(true);
    const next = !autoCfg.enabled;
    const { ok, err } = await adminSetAutoApproval(next, autoCfg.note ?? undefined);
    setAutoLoading(false);
    if (!ok) { flash(false, err ?? '操作失败'); return; }
    flash(true, next ? '🟢 已开启自动审批' : '⚪ 已关闭自动审批，恢复手动模式');
    load();
  };

  const applyCodeSystem = async () => {
    setCodeConfirm(false);
    setAutoLoading(true);
    const next = !autoCfg.code_system_enabled;
    const { ok, err } = await adminSetCodeSystem(next);
    setAutoLoading(false);
    if (!ok) { flash(false, err ?? '操作失败'); return; }
    flash(true, next ? '🔑 已开启激活码制' : '🔓 已关闭激活码制，用户可凭邮箱直接注册/登录');
    load();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false}>
      {/* 统计面板 */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[
          { l: '待审核', v: stats.pending, c: A.gold },
          { l: '已通过', v: stats.approved, c: A.green },
          { l: '已驳回', v: stats.rejected, c: A.red },
          { l: '总计', v: stats.total, c: A.blue },
        ].map((s) => (
          <View key={s.l} style={{ flex: 1, backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, padding: 10, alignItems: 'center' }}>
            <Text style={{ color: s.c, fontSize: 18, fontWeight: '700' }}>{s.v}</Text>
            <Text style={{ color: A.textSecond, fontSize: 10 }}>{s.l}</Text>
          </View>
        ))}
      </View>

      {/* 自动审批模式状态卡片 */}
      <View style={{
        backgroundColor: autoCfg.enabled ? 'rgba(76,175,80,0.12)' : A.bgCard,
        borderWidth: 1,
        borderColor: autoCfg.enabled ? A.green : A.divider,
        borderLeftWidth: autoCfg.enabled ? 3 : 1,
        borderLeftColor: autoCfg.enabled ? A.green : A.divider,
        padding: 12, gap: 8,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: autoCfg.enabled ? A.green : A.textHint }} />
            <Text style={{ color: autoCfg.enabled ? '#7FE0A0' : A.textPrimary, fontSize: 13, fontWeight: '700' }}>
              {autoCfg.enabled ? '自动审批已开启' : '手动审批模式'}
            </Text>
          </View>
          {isSuper ? (
            <Pressable
              onPress={() => setConfirmAuto(true)}
              disabled={autoLoading}
              style={{
                paddingHorizontal: 12, paddingVertical: 6,
                borderWidth: 1,
                borderColor: autoCfg.enabled ? A.red : A.green,
                backgroundColor: autoCfg.enabled ? 'rgba(255,100,100,0.15)' : 'rgba(76,175,80,0.15)',
                opacity: autoLoading ? 0.5 : 1,
              }}
            >
              <Text style={{ color: autoCfg.enabled ? '#FF7070' : '#7FE0A0', fontSize: 11, fontWeight: '700' }}>
                {autoLoading ? '处理中…' : autoCfg.enabled ? '关闭自动审批' : '开启自动审批'}
              </Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={{ color: A.textSecond, fontSize: 10 }}>
          {autoCfg.enabled
            ? '新申请将自动通过；重复邮箱、同设备多账号将被系统拒绝并进入申诉（7天未申诉自动清除）。'
            : '所有申请需管理员手动审批。开启后普通管理员无需手动操作。'}
        </Text>
        {/* 今日系统拒绝统计 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <Text style={{ color: todayRejected > 0 ? '#C8A84B' : A.textHint, fontSize: 11, fontWeight: '700' }}>
            🤖 今日系统拒绝：{todayRejected} 人
          </Text>
          {todayRejected > 0 ? (
            <Text style={{ color: A.textHint, fontSize: 9 }}>（可在「账号申诉」页查看详情）</Text>
          ) : null}
        </View>
        {autoCfg.updated_at ? (
          <Text style={{ color: A.textHint, fontSize: 9 }}>
            最近更新：{autoCfg.updated_at.slice(0, 16).replace('T', ' ')}
          </Text>
        ) : null}
      </View>

      {/* 激活码制开关卡片 */}
      <View style={{
        backgroundColor: autoCfg.code_system_enabled ? A.bgCard : 'rgba(76,175,80,0.12)',
        borderWidth: 1,
        borderColor: autoCfg.code_system_enabled ? A.divider : A.green,
        borderLeftWidth: autoCfg.code_system_enabled ? 1 : 3,
        borderLeftColor: autoCfg.code_system_enabled ? A.divider : A.green,
        padding: 12, gap: 8,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: autoCfg.code_system_enabled ? A.gold : A.green }} />
            <Text style={{ color: autoCfg.code_system_enabled ? A.textPrimary : '#7FE0A0', fontSize: 13, fontWeight: '700' }}>
              {autoCfg.code_system_enabled ? '激活码制已开启' : '激活码制已关闭'}
            </Text>
          </View>
          {isSuper ? (
            <Pressable
              onPress={() => setCodeConfirm(true)}
              disabled={autoLoading}
              style={{
                paddingHorizontal: 12, paddingVertical: 6,
                borderWidth: 1,
                borderColor: autoCfg.code_system_enabled ? A.green : A.red,
                backgroundColor: autoCfg.code_system_enabled ? 'rgba(76,175,80,0.15)' : 'rgba(255,100,100,0.15)',
                opacity: autoLoading ? 0.5 : 1,
              }}
            >
              <Text style={{ color: autoCfg.code_system_enabled ? '#7FE0A0' : '#FF7070', fontSize: 11, fontWeight: '700' }}>
                {autoLoading ? '处理中…' : autoCfg.code_system_enabled ? '关闭激活码制' : '开启激活码制'}
              </Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={{ color: A.textSecond, fontSize: 10 }}>
          {autoCfg.code_system_enabled
            ? '用户注册后需输入管理员分配的测试码并通过审批方可进入游戏。'
            : '用户可凭邮箱直接注册/登录，无需测试码即可进入游戏。'}
        </Text>
      </View>

      {msg ? (
        <View style={{ backgroundColor: msg.ok ? A.greenBg : A.redBg, borderLeftWidth: 2, borderLeftColor: msg.ok ? A.green : A.red, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ color: msg.ok ? '#7FE0A0' : '#FF7070', fontSize: 12 }}>{msg.text}</Text>
        </View>
      ) : null}

      {/* 搜索 */}
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="按邮箱或玩家名搜索"
        placeholderTextColor={A.textHint}
        style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13 }}
      />

      {/* 状态筛选 */}
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {['all', 'pending', 'approved', 'rejected'].map((s) => (
          <Pressable key={s} onPress={() => setStatusFilter(s)} style={{ paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: statusFilter === s ? A.gold : A.divider, backgroundColor: statusFilter === s ? A.goldBg : 'transparent' }}>
            <Text style={{ color: statusFilter === s ? A.goldLight : A.textSecond, fontSize: 11 }}>{s === 'all' ? '全部' : STATUS_LABEL[s]}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Btn label="刷新" onPress={load} variant="ghost" small />
        <Btn label={`🚀 一键全部通过${stats.pending > 0 ? `(${stats.pending})` : ''}`} onPress={() => { if (stats.pending === 0) { flash(false, '暂无待审核用户'); } else { setConfirmApproveAll(true); } }} variant="green" small disabled={stats.pending === 0} />
        <Btn label={selectMode ? '取消多选' : '多选'} onPress={() => { setSelectMode(!selectMode); setSelected(new Set()); }} variant="blue" small />
        <Btn label={hideDone ? '显示全部' : '隐藏已审批'} onPress={() => setHideDone(!hideDone)} variant="ghost" small />
        {selectMode ? <Btn label={`批量驳回(${selected.size})`} onPress={() => openReject('', true)} variant="red" small disabled={selected.size === 0} /> : null}
      </View>

      {loading ? <ActivityIndicator color={A.gold} size="large" /> :
        rows.length === 0 ? <Empty text="暂无审批记录" /> :
        (() => {
          const visible = hideDone ? rows.filter((r) => r.status === 'pending') : rows;
          if (visible.length === 0) return <Empty text={hideDone ? '暂无待审核记录' : '暂无审批记录'} />;
          return visible.map((r) => (
          <Pressable key={r.id} onPress={() => selectMode ? toggleSelect(r.user_id) : setDetail(r)} style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: selectMode && selected.has(r.user_id) ? A.gold : A.divider, padding: 12 }}>
            {/* 重复邮箱警示 */}
            {r.dup_email_count > 1 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, backgroundColor: 'rgba(255,160,0,0.12)', borderLeftWidth: 2, borderLeftColor: '#FFA000', paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ color: '#FFA000', fontSize: 10, fontWeight: '700' }}>⚠ 重复申请</Text>
                <Text style={{ color: '#FFA000', fontSize: 10 }}>同邮箱共 {r.dup_email_count} 条记录，通过/驳回本条将自动处理其余重复条目</Text>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: A.textPrimary, fontSize: 13, fontWeight: '600' }}>{r.email || '未知邮箱'}</Text>
              <Badge text={STATUS_LABEL[r.status] ?? r.status} color={STATUS_COLOR[r.status] ?? A.gold} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              {r.player_name ? <Text style={{ color: A.textSecond, fontSize: 10 }}>玩家 {r.player_name}</Text> : null}
              {r.rank_name ? <Text style={{ color: A.textSecond, fontSize: 10 }}>{r.rank_name}</Text> : null}
              <Text style={{ color: A.textHint, fontSize: 10 }}>{r.created_at?.slice(0, 10)}</Text>
            </View>
            {r.status === 'pending' ? (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Btn label="通过" onPress={() => approve(r.user_id)} variant="green" small style={{ flex: 1 }} />
                <Btn label="驳回" onPress={() => openReject(r.user_id, false)} variant="red" small style={{ flex: 1 }} />
              </View>
            ) : null}
          </Pressable>
          ));
        })()
      }

      {/* 详情弹窗 */}
      <Modal visible={!!detail} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 }} onPress={() => setDetail(null)}>
          <Pressable style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, padding: 16, gap: 8 }} onPress={(e) => e.stopPropagation()}>
            <Text style={{ color: A.goldLight, fontSize: 14, fontWeight: '700', letterSpacing: 1 }}>审批详情</Text>
            <Text style={{ color: A.textSecond, fontSize: 12 }}>邮箱：{detail?.email || '未知'}</Text>
            <Text style={{ color: A.textSecond, fontSize: 12 }}>玩家：{detail?.player_name || '未创建角色'}</Text>
            <Text style={{ color: A.textSecond, fontSize: 12 }}>职级：{detail?.rank_name ?? '—'}</Text>
            <Text style={{ color: A.textSecond, fontSize: 12 }}>状态：{detail ? STATUS_LABEL[detail.status] : ''}</Text>
            <Text style={{ color: A.textSecond, fontSize: 12 }}>提交时间：{detail?.created_at?.slice(0, 19).replace('T', ' ')}</Text>
            {detail?.reject_reason ? <Text style={{ color: '#FF9A9A', fontSize: 12 }}>驳回原因：{detail.reject_reason}</Text> : null}
            <Btn label="关闭" onPress={() => setDetail(null)} variant="ghost" small style={{ marginTop: 4 }} />
          </Pressable>
        </Pressable>
      </Modal>

      {/* 驳回弹窗 */}
      <Modal visible={!!rejectTarget} transparent animationType="fade" onRequestClose={() => setRejectTarget(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 }} onPress={() => setRejectTarget(null)}>
          <Pressable style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, padding: 16, gap: 10 }} onPress={(e) => e.stopPropagation()}>
            <Text style={{ color: A.goldLight, fontSize: 14, fontWeight: '700', letterSpacing: 1 }}>驳回原因</Text>
            <View style={{ gap: 6 }}>
              {REJECT_TEMPLATES.map((t) => (
                <Pressable key={t} onPress={() => setRejectReason(t)} style={{ borderWidth: 1, borderColor: rejectReason === t ? A.gold : A.divider, backgroundColor: rejectReason === t ? A.goldBg : 'transparent', paddingHorizontal: 10, paddingVertical: 8 }}>
                  <Text style={{ color: rejectReason === t ? A.goldLight : A.textSecond, fontSize: 11 }}>{t}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput value={rejectReason} onChangeText={setRejectReason} placeholder="或自定义输入原因" placeholderTextColor={A.textHint} multiline style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, minHeight: 60, textAlignVertical: 'top' }} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Btn label="取消" onPress={() => setRejectTarget(null)} variant="ghost" small style={{ flex: 1 }} />
              <Btn label="确认驳回" onPress={submitReject} variant="red" small style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 一键全部通过确认框 */}
      <Modal visible={confirmApproveAll} transparent animationType="fade" onRequestClose={() => setConfirmApproveAll(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 24 }} onPress={() => setConfirmApproveAll(false)}>
          <Pressable style={{ backgroundColor: A.bgCard, borderWidth: 2, borderColor: A.green, padding: 20, gap: 12 }} onPress={(e) => e.stopPropagation()}>
            <Text style={{ color: '#7FE0A0', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>🚀 一键通过全部</Text>
            <Text style={{ color: A.textSecond, fontSize: 13, lineHeight: 20 }}>
              即将批量通过 <Text style={{ color: A.goldLight, fontWeight: '700' }}>{stats.pending} 个</Text>待审核用户。{'\n'}
              已驳回用户不受影响。此操作不可撤销，请确认。
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <Btn label="取消" onPress={() => setConfirmApproveAll(false)} variant="ghost" small style={{ flex: 1 }} />
              <Btn
                label={approveAllLoading ? '处理中...' : `确认通过 ${stats.pending} 人`}
                onPress={approveAll}
                variant="green"
                small
                disabled={approveAllLoading}
                style={{ flex: 2 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 自动审批切换确认 */}
      <Modal visible={confirmAuto} transparent animationType="fade" onRequestClose={() => setConfirmAuto(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 24 }} onPress={() => setConfirmAuto(false)}>
          <Pressable style={{ backgroundColor: A.bgCard, borderWidth: 2, borderColor: autoCfg.enabled ? A.red : A.green, padding: 20, gap: 12 }} onPress={(e) => e.stopPropagation()}>
            <Text style={{ color: autoCfg.enabled ? '#FF7070' : '#7FE0A0', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>
              {autoCfg.enabled ? '关闭自动审批' : '开启自动审批'}
            </Text>
            <Text style={{ color: A.textSecond, fontSize: 13, lineHeight: 20 }}>
              {autoCfg.enabled
                ? '关闭后，所有新申请将恢复为手动审批模式，需管理员逐条处理。'
                : '开启后，新申请将自动通过；重复邮箱、同设备多账号将被系统拒绝并进入申诉（7天未申诉自动清除）。普通管理员无需手动操作。'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <Btn label="取消" onPress={() => setConfirmAuto(false)} variant="ghost" small style={{ flex: 1 }} />
              <Btn
                label={autoLoading ? '处理中...' : '确认'}
                onPress={applyAutoApproval}
                variant={autoCfg.enabled ? 'red' : 'green'}
                small
                disabled={autoLoading}
                style={{ flex: 2 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 激活码制切换确认 */}
      <Modal visible={codeConfirm} transparent animationType="fade" onRequestClose={() => setCodeConfirm(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 24 }} onPress={() => setCodeConfirm(false)}>
          <Pressable style={{ backgroundColor: A.bgCard, borderWidth: 2, borderColor: autoCfg.code_system_enabled ? A.red : A.green, padding: 20, gap: 12 }} onPress={(e) => e.stopPropagation()}>
            <Text style={{ color: autoCfg.code_system_enabled ? '#FF7070' : '#7FE0A0', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>
              {autoCfg.code_system_enabled ? '关闭激活码制' : '开启激活码制'}
            </Text>
            <Text style={{ color: A.textSecond, fontSize: 13, lineHeight: 20 }}>
              {autoCfg.code_system_enabled
                ? '关闭后，用户可凭邮箱直接注册/登录，无需测试码即可进入游戏。已通过审批的账号不受影响。'
                : '开启后，用户注册后需输入管理员分配的测试码并通过审批方可进入游戏。'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <Btn label="取消" onPress={() => setCodeConfirm(false)} variant="ghost" small style={{ flex: 1 }} />
              <Btn
                label={autoLoading ? '处理中...' : '确认'}
                onPress={applyCodeSystem}
                variant={autoCfg.code_system_enabled ? 'red' : 'green'}
                small
                disabled={autoLoading}
                style={{ flex: 2 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}