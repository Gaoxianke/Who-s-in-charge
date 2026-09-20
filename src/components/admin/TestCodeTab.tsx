// 测试码管理 Tab（admin+）：生成、批次筛选、使用者显示、过期置灰、批量禁用、CSV、分页
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { A, Badge, Btn, Card, Empty } from './shared';
import { supabase } from '@/client/supabase';
import {
  adminDeleteTestCodeBatch, adminGenerateTestCodes, adminListTestCodeBatches, adminListTestCodes,
  adminListTestCodeGroups, adminClearUnusedTestCodes, adminRenameTestCodeGroup, adminDeleteTestCodeGroup,
  adminLogBatchCopy, adminRenameTestCodeBatch, adminTestCodeStats,
  adminUpsertSchedule, adminListScheduleRequests, adminApproveSchedule, adminRejectSchedule,
  type ScheduleRequest, type TestCodeBatch, type TestCodeGroup, type TestCodeRow, type TestCodeStats,
} from '@/lib/adminApi';

const STATUS_LABEL: Record<string, string> = {
  unused: '未用', used: '已用', disabled: '已禁用', available: '可用', expired: '已过期',
};
const SCH_STATUS_LABEL: Record<string, string> = {
  active: '生效中', pending: '待审批', rejected: '已驳回', superseded: '已替换',
};
const SCH_STATUS_COLOR: Record<string, string> = {
  active: '#4CAF50', pending: '#C8A84B', rejected: '#C82829', superseded: '#5A5040',
};

const PAGE_SIZE = 50;

export function TestCodeTab({ role }: { role: string }) {
  const isSuperAdmin = role === 'super_admin';
  const [codes, setCodes] = useState<TestCodeRow[]>([]);
  const [batches, setBatches] = useState<TestCodeBatch[]>([]);
  const [groups, setGroups] = useState<TestCodeGroup[]>([]);
  const [stats, setStats] = useState<TestCodeStats>({ unused: 0, used: 0, disabled: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [batchFilter, setBatchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // 分页
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // 生成弹窗
  const [genOpen, setGenOpen] = useState(false);
  const [genBatch, setGenBatch] = useState('');
  const [genCount, setGenCount] = useState('10');
  const [genNote, setGenNote] = useState('');
  const [genGroup, setGenGroup] = useState('');
  const [genMinutes, setGenMinutes] = useState(10);
  const [genSaving, setGenSaving] = useState(false);
  const [genResult, setGenResult] = useState<{ codes: string[]; batchName: string; note: string } | null>(null);
  const [genCopyFormat, setGenCopyFormat] = useState<'plain' | 'withNote'>('plain');

  // 多选
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // 批次删除 / 重命名
  const [delBatch, setDelBatch] = useState<string | null>(null);
  const [renameBatch, setRenameBatch] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [clearUnusedOpen, setClearUnusedOpen] = useState(false);
  const [renameGroup, setRenameGroup] = useState<string | null>(null);
  const [groupRenameValue, setGroupRenameValue] = useState('');
  const [delGroup, setDelGroup] = useState<string | null>(null);

  // 时间窗口 tab
  const [tab, setTab] = useState<'codes' | 'schedule'>('codes');
  const [schOpen, setSchOpen] = useState('09:00');
  const [schClose, setSchClose] = useState('23:00');
  const [schEnabled, setSchEnabled] = useState(true);
  const [schNote, setSchNote] = useState('');
  const [schSaving, setSchSaving] = useState(false);
  const [schRequests, setSchRequests] = useState<ScheduleRequest[]>([]);
  const [schLoading, setSchLoading] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // 批次详情 Modal
  const [batchDetail, setBatchDetail] = useState<{
    batch: TestCodeBatch;
    codes: TestCodeRow[];
    page: number;
    total: number;
    loading: boolean;
  } | null>(null);

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const hiddenIds = useRef<Set<string>>(new Set());
  const hideTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // load 不依赖 page 闭包，targetPage 参数显式传入，避免每次翻页都重建 load 引用
  const load = useCallback(async (targetPage: number) => {
    const offset = targetPage * PAGE_SIZE;
    const [list, b, s, g] = await Promise.all([
      adminListTestCodes(batchFilter, statusFilter, PAGE_SIZE, offset, groupFilter),
      adminListTestCodeBatches(),
      adminTestCodeStats(),
      adminListTestCodeGroups(),
    ]);
    setGroups(g);
    list.forEach((c) => {
      const isExpired = c.expires_at ? new Date(c.expires_at) < new Date() : false;
      const displayStatus = isExpired && c.status === 'unused' ? 'expired' : c.status;
      if ((displayStatus === 'used' || displayStatus === 'expired') && !hiddenIds.current.has(c.id) && !hideTimers.current.has(c.id)) {
        const t = setTimeout(() => {
          hiddenIds.current.add(c.id); hideTimers.current.delete(c.id);
          setCodes((prev) => prev.filter((x) => x.id !== c.id));
        }, 60000);
        hideTimers.current.set(c.id, t);
      }
    });
    // 精准分页总数：按当前批次+状态过滤组合计算
    const bd = batchFilter !== 'all' ? b.find((bb) => bb.batch_name === batchFilter) : null;
    const batchTotal = batchFilter === 'all'
      ? (statusFilter === 'unused' ? s.unused : statusFilter === 'used' ? s.used : statusFilter === 'disabled' ? s.disabled : s.total)
      : (!bd ? 0 : statusFilter === 'unused' ? bd.available : statusFilter === 'used' ? bd.used : statusFilter === 'disabled' ? bd.disabled : bd.total);
    setTotalCount(batchTotal);
    setCodes(list.filter((c) => !hiddenIds.current.has(c.id)));
    setBatches(b);
    setStats(s);
    setLoading(false);
  }, [batchFilter, statusFilter, groupFilter]);

  const loadSchedule = useCallback(async () => {
    setSchLoading(true);
    const reqs = await adminListScheduleRequests();
    setSchRequests(reqs);
    // 预填当前生效的时间窗口
    const active = reqs.find((r) => r.status === 'active');
    if (active) { setSchOpen(active.open_time); setSchClose(active.close_time); setSchEnabled(active.enabled); setSchNote(active.note ?? ''); }
    setSchLoading(false);
  }, []);

  const clearUsedExpired = () => {
    const now = new Date();
    let cnt = 0;
    setCodes((prev) =>
      prev.filter((c) => {
        const isExpired = c.expires_at ? new Date(c.expires_at) < now : false;
        const displayStatus = isExpired && c.status === 'unused' ? 'expired' : c.status;
        if (displayStatus === 'used' || displayStatus === 'expired') {
          hiddenIds.current.add(c.id);
          if (hideTimers.current.has(c.id)) { clearTimeout(hideTimers.current.get(c.id)!); hideTimers.current.delete(c.id); }
          cnt += 1; return false;
        }
        return true;
      }),
    );
    setMsg({ ok: true, text: cnt > 0 ? `✓ 已立即清除 ${cnt} 个已用/已过期码` : '当前无已用/已过期码可清除' });
  };

  useEffect(() => {
    setPage(0);
    load(0);
    timer.current = setInterval(() => load(0), 45000);
    return () => {
      if (timer.current) clearInterval(timer.current);
      hideTimers.current.forEach((t) => clearTimeout(t));
      hideTimers.current.clear();
    };
  }, [load]);

  useEffect(() => { if (tab === 'schedule') loadSchedule(); }, [tab, loadSchedule]);

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 5000);
  };

  const copyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    flash(true, `✓ 已复制：${code}`);
  };

  const goPage = (p: number) => { setPage(p); load(p); };

  const openGen = () => { setGenOpen(true); setGenBatch(''); setGenCount('10'); setGenNote(''); setGenGroup(''); setGenMinutes(10); setGenResult(null); };

  const submitGen = async () => {
    const count = parseInt(genCount, 10);
    if (!genBatch.trim()) { flash(false, '请选择或输入批次名'); return; }
    if (isNaN(count) || count < 1) { flash(false, '请输入有效数量'); return; }
    if (count > 5000) { flash(false, '单次最多生成 5000 个'); return; }
    setGenSaving(true);
    const expiresAt = new Date(Date.now() + genMinutes * 60000).toISOString();
    const codes = await adminGenerateTestCodes(genBatch.trim(), count, expiresAt, genNote.trim() || undefined, genGroup.trim() || undefined);
    setGenSaving(false);
    if (codes.length > 0) {
      setGenResult({ codes, batchName: genBatch.trim(), note: genNote.trim() });
      flash(true, `✓ 已生成 ${codes.length} 个测试码`);
      load(0);
    } else {
      flash(false, '生成失败：返回为空，请重试');
    }
  };

  // 生成结果一键复制：支持纯码 / 带批次备注两种格式
  const copyGenResult = async () => {
    if (!genResult) return;
    const text = genCopyFormat === 'withNote'
      ? genResult.codes.map((c) => `${c}\t${genResult.batchName}${genResult.note ? `\t${genResult.note}` : ''}`).join('\n')
      : genResult.codes.join('\n');
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
    } catch { /* ignore */ }
    await adminLogBatchCopy(genResult.batchName, genResult.codes.length).catch(() => {});
    flash(true, `✓ 已复制 ${genResult.codes.length} 个测试码（${genCopyFormat === 'plain' ? '纯码' : '带批次备注'}）`);
  };

  // 单条复制：复制生成结果中的单个测试码
  const copySingleCode = async (code: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(code);
      }
    } catch { /* ignore */ }
    flash(true, `✓ 已复制测试码 ${code}`);
  };

  const copyAllAndDoc = async () => {
    const batchName = batchFilter === 'all' ? '全部批次' : batchFilter;
    const lines = codes.map((c) => `${c.code}\t${c.batch_name}\t${STATUS_LABEL[c.status] ?? c.status}\t${c.used_by_email ?? ''}\t${c.note ?? ''}\t${c.created_at}`);
    const text = [`测试码\t批次\t状态\t使用者\t备注\t创建时间`, ...lines].join('\n');
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
    } catch { /* ignore clipboard error */ }
    // 记录复制日志
    if (batchFilter !== 'all') {
      await adminLogBatchCopy(batchFilter, codes.length).catch(() => {});
    }
    // 生成 xlsx
    try {
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.aoa_to_sheet([
        ['测试码', '批次', '状态', '使用者邮箱', '备注', '创建时间'],
        ...codes.map((c) => [c.code, c.batch_name, STATUS_LABEL[c.status] ?? c.status, c.used_by_email ?? '', c.note ?? '', c.created_at]),
      ]);
      ws['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 8 }, { wch: 26 }, { wch: 20 }, { wch: 22 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '测试码');
      if (process.env.EXPO_OS === 'web') {
        XLSX.writeFile(wb, `测试码_${batchName}.xlsx`);
      } else {
        const { default: FileSystem } = await import('expo-file-system/legacy');
        const { default: Sharing } = await import('expo-sharing');
        const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        const path = `${FileSystem.cacheDirectory}test_codes_${Date.now()}.xlsx`;
        await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
        await Sharing.shareAsync(path, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      }
      flash(true, `✓ 已复制并导出 ${codes.length} 个测试码（xlsx）`);
    } catch (e) {
      flash(false, `导出失败：${e instanceof Error ? e.message : String(e)}`);
    }
    load(page);
  };

  const copyBatchCodes = async (batchName: string) => {
    const all = await adminListTestCodes(batchName, 'all', 1000, 0);
    const text = all.map((c) => c.code).join('\n');
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
    } catch { /* ignore */ }
    if (all.length > 0) await adminLogBatchCopy(batchName, all.length).catch(() => {});
    flash(true, `✓ 已复制批次「${batchName}」全部 ${all.length} 个测试码`);
    load(page);
  };

  // 一键复制某编组下所有未使用的测试码
  const copyGroupUnusedCodes = async (groupName: string) => {
    const filterGroup = groupName === '未分组' ? '' : groupName;
    const unused = await adminListTestCodes(filterGroup, 'unused', 5000, 0);
    const valid = unused.filter((c) => {
      const isExpired = c.expires_at ? new Date(c.expires_at) < new Date() : false;
      return !isExpired;
    });
    const text = valid.map((c) => c.code).join('\n');
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
    } catch { /* ignore */ }
    if (valid.length > 0) await adminLogBatchCopy(groupName, valid.length).catch(() => {});
    flash(valid.length > 0 ? true : false, valid.length > 0
      ? `✓ 已复制编组「${groupName}」${valid.length} 个未用测试码`
      : `编组「${groupName}」暂无未用测试码`);
    load(page);
  };

  const DETAIL_PAGE = 30;

  const openBatchDetail = async (batch: TestCodeBatch) => {
    setBatchDetail({ batch, codes: [], page: 0, total: batch.total, loading: true });
    const list = await adminListTestCodes(batch.batch_name, 'all', DETAIL_PAGE, 0);
    setBatchDetail((prev) => prev ? { ...prev, codes: list, loading: false } : null);
  };

  const loadDetailPage = async (p: number) => {
    if (!batchDetail) return;
    setBatchDetail((prev) => prev ? { ...prev, loading: true } : null);
    const list = await adminListTestCodes(batchDetail.batch.batch_name, 'all', DETAIL_PAGE, p * DETAIL_PAGE);
    setBatchDetail((prev) => prev ? { ...prev, codes: list, page: p, loading: false } : null);
  };

  const copyDetailAll = async () => {
    if (!batchDetail) return;
    const all = await adminListTestCodes(batchDetail.batch.batch_name, 'all', 5000, 0);
    const text = all.map((c) => c.code).join('\n');
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) await navigator.clipboard.writeText(text);
    } catch { /* ignore */ }
    if (all.length > 0) await adminLogBatchCopy(batchDetail.batch.batch_name, all.length).catch(() => {});
    flash(true, `✓ 已复制批次「${batchDetail.batch.batch_name}」全部 ${all.length} 个码`);
  };

  const toggleSelect = (id: string) => setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const batchDisable = async () => {
    if (selected.size === 0) return;
    const ids = [...selected];
    const { error } = await supabase.rpc('admin_disable_test_codes', { p_ids: ids });
    if (!error) { flash(true, `✓ 已禁用 ${ids.length} 个测试码`); setSelectMode(false); setSelected(new Set()); load(page); }
    else flash(false, '批量禁用失败');
  };

  const confirmDeleteBatch = async () => {
    if (!delBatch) return;
    const res = await adminDeleteTestCodeBatch(delBatch);
    if (res.ok) { flash(true, `✓ 已删除批次「${delBatch}」（${res.count ?? 0} 个码）`); if (batchFilter === delBatch) setBatchFilter('all'); setDelBatch(null); load(0); }
    else { flash(false, '删除失败'); setDelBatch(null); }
  };

  const confirmClearUnused = async () => {
    const count = await adminClearUnusedTestCodes();
    setClearUnusedOpen(false);
    if (count >= 0) { flash(true, `✓ 已清除 ${count} 个未使用的测试码`); load(0); }
    else { flash(false, '清除失败'); }
  };

  const confirmRenameGroup = async () => {
    if (!renameGroup || !groupRenameValue.trim()) { flash(false, '请输入新编组名'); return; }
    const res = await adminRenameTestCodeGroup(renameGroup, groupRenameValue.trim());
    if (res.ok) {
      flash(true, `✓ 编组「${renameGroup}」已改名为「${groupRenameValue.trim()}」（更新 ${res.updated} 个码）`);
      if (groupFilter === renameGroup) setGroupFilter(groupRenameValue.trim());
      setRenameGroup(null);
      load(0);
    } else {
      flash(false, `改名失败：${res.err ?? ''}`);
    }
  };

  const confirmDeleteGroup = async () => {
    if (!delGroup) return;
    const res = await adminDeleteTestCodeGroup(delGroup);
    if (res.ok) {
      flash(true, `✓ 已删除编组「${delGroup}」的未使用测试码（${res.deleted} 个），已用码已保留`);
      if (groupFilter === delGroup) setGroupFilter('all');
      setDelGroup(null);
      load(0);
    } else {
      flash(false, `删除失败：${res.err ?? ''}`);
    }
  };

  const confirmRenameBatch = async () => {
    if (!renameBatch || !renameValue.trim()) return;
    const res = await adminRenameTestCodeBatch(renameBatch, renameValue.trim());
    if (res.ok) {
      flash(true, `✓ 批次已改名为「${renameValue.trim()}」（${res.count ?? 0} 个码）`);
      if (batchFilter === renameBatch) setBatchFilter(renameValue.trim());
      setRenameBatch(null); setRenameValue(''); load(page);
    } else {
      flash(false, res.err?.includes('duplicate') ? '批次名已存在' : '改名失败');
    }
  };

  const submitSchedule = async () => {
    if (!schOpen.match(/^\d{2}:\d{2}$/) || !schClose.match(/^\d{2}:\d{2}$/)) { flash(false, '时间格式错误，请用 HH:MM'); return; }
    setSchSaving(true);
    const res = await adminUpsertSchedule(schOpen, schClose, schEnabled, schNote.trim() || undefined);
    setSchSaving(false);
    if (res.ok) {
      const label = res.status === 'active' ? '已直接生效' : '申请已提交，等待超管审批';
      flash(true, `✓ 时间窗口设置成功（${label}）`);
      loadSchedule();
    } else { flash(false, `设置失败：${res.err ?? ''}`); }
  };

  const handleApproveSchedule = async (id: string) => {
    const res = await adminApproveSchedule(id);
    if (res.ok) { flash(true, '✓ 已审批通过'); loadSchedule(); }
    else flash(false, `审批失败：${res.err ?? ''}`);
  };

  const handleRejectSchedule = async () => {
    if (!rejectId) return;
    const res = await adminRejectSchedule(rejectId, rejectReason.trim() || undefined);
    if (res.ok) { flash(true, '✓ 已驳回'); setRejectId(null); setRejectReason(''); loadSchedule(); }
    else flash(false, `驳回失败：${res.err ?? ''}`);
  };

  const exportCSV = () => {
    const header = 'code,batch_name,status,used_by_email,note,created_at';
    const rows = codes.map((c) => [c.code, c.batch_name, c.status, c.used_by_email ?? '', c.note ?? '', c.created_at].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [header, ...rows].join('\n');
    try {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'test_codes.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch { flash(false, '导出失败（Web 环境）'); }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const statusColors: Record<string, string> = { unused: A.green, used: A.blue, available: A.green, disabled: A.textHint, expired: A.textHint };

  // ──────── 时间窗口 Tab ────────
  const activeSchedule = schRequests.find((r) => r.status === 'active');
  const pendingRequests = schRequests.filter((r) => r.status === 'pending');

  return (
    <>
    {/* ── Tab 切换 ── */}
    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: A.divider, backgroundColor: A.bgMid }}>
      {([['codes', '🎫 测试码'], ['schedule', '⏰ 申请时间窗口']] as const).map(([key, label]) => (
        <Pressable key={key} onPress={() => setTab(key)} style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: tab === key ? A.gold : 'transparent' }}>
          <Text style={{ color: tab === key ? A.goldLight : A.textSecond, fontSize: 12, fontWeight: tab === key ? '700' : '400' }}>{label}</Text>
        </Pressable>
      ))}
    </View>

    {msg ? (
      <View style={{ backgroundColor: msg.ok ? A.greenBg : A.redBg, borderLeftWidth: 2, borderLeftColor: msg.ok ? A.green : A.red, paddingHorizontal: 10, paddingVertical: 6, marginHorizontal: 12, marginTop: 8 }}>
        <Text style={{ color: msg.ok ? '#7FE0A0' : '#FF7070', fontSize: 12 }}>{msg.text}</Text>
      </View>
    ) : null}

    {/* ════════ 测试码 Tab ════════ */}
    {tab === 'codes' && (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false}>
      {/* 统计面板 */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[
          { l: '未用', v: stats.unused, c: A.green },
          { l: '已用', v: stats.used, c: A.blue },
          { l: '已禁用', v: stats.disabled, c: A.textHint },
          { l: '总计', v: stats.total, c: A.gold },
        ].map((s) => (
          <View key={s.l} style={{ flex: 1, backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, borderTopWidth: 2, borderTopColor: s.c, padding: 12, alignItems: 'center' }}>
            <Text style={{ color: s.c, fontSize: 20, fontWeight: '700' }}>{s.v}</Text>
            <Text style={{ color: A.textSecond, fontSize: 10, marginTop: 2 }}>{s.l}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2 }}>
        <Text style={{ color: A.gold, fontSize: 10 }}>⏱</Text>
        <Text style={{ color: A.textHint, fontSize: 10 }}>已用/已过期码将在展示 60 秒后自动清除</Text>
        <View style={{ flex: 1 }} />
        <Pressable cssInterop={false} onPress={clearUsedExpired} hitSlop={6} style={{ borderWidth: 1, borderColor: A.goldDim, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ color: A.gold, fontSize: 10, fontWeight: '600' }}>🧹 立即清除</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Btn label="刷新" onPress={() => load(page)} variant="ghost" small />
        <Btn label="生成测试码" onPress={openGen} variant="gold" small />
        <Btn label={selectMode ? '取消多选' : '多选'} onPress={() => { setSelectMode(!selectMode); setSelected(new Set()); }} variant="blue" small />
        <Btn label="清除未使用" onPress={() => setClearUnusedOpen(true)} variant="red" small />
        {selectMode ? <Btn label={`禁用(${selected.size})`} onPress={batchDisable} variant="red" small disabled={selected.size === 0} /> : null}
        <Btn label="复制并导出" onPress={copyAllAndDoc} variant="ghost" small />
        <Btn label="CSV 导出" onPress={exportCSV} variant="ghost" small />
      </View>

      {/* 编组列表 — 在生成测试码下方展示 */}
      {groups.length > 0 && (
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: A.goldLight, fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>📂 测试码编组</Text>
            <Text style={{ color: A.textHint, fontSize: 10 }}>共 {groups.length} 个组</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
            {groups.map((g) => {
              const isUngrouped = g.group_name === '未分组';
              return (
                <View key={g.group_name} style={{ borderWidth: 1, borderColor: A.divider, backgroundColor: A.bgCard, paddingHorizontal: 12, paddingVertical: 8, minWidth: 140 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <Text style={{ color: A.textPrimary, fontSize: 12, fontWeight: '700', flex: 1 }} numberOfLines={1}>{g.group_name}</Text>
                    {!isUngrouped && (
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        <Pressable cssInterop={false} onPress={() => { setRenameGroup(g.group_name); setGroupRenameValue(g.group_name); }} hitSlop={4} style={{ paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1, borderColor: A.goldDim }}>
                          <Text style={{ color: A.goldLight, fontSize: 9 }}>改名</Text>
                        </Pressable>
                        <Pressable cssInterop={false} onPress={() => setDelGroup(g.group_name)} hitSlop={4} style={{ paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1, borderColor: A.red }}>
                          <Text style={{ color: A.red, fontSize: 9 }}>删除</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <Text style={{ color: A.textSecond, fontSize: 10 }}>共 {g.total}</Text>
                    <Text style={{ color: A.green, fontSize: 10 }}>可用 {g.available}</Text>
                    <Text style={{ color: A.textHint, fontSize: 10 }}>已用 {g.used}</Text>
                  </View>
                  <Pressable
                    cssInterop={false}
                    onPress={() => copyGroupUnusedCodes(g.group_name)}
                    hitSlop={4}
                    disabled={g.available === 0}
                    style={{ marginTop: 6, borderWidth: 1, borderColor: g.available === 0 ? A.divider : A.green, backgroundColor: g.available === 0 ? 'transparent' : 'rgba(76,175,80,0.15)', paddingVertical: 5, alignItems: 'center' }}
                  >
                    <Text style={{ color: g.available === 0 ? A.textHint : '#7FE0A0', fontSize: 10, fontWeight: '700' }}>📋 复制未用测试码</Text>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* 按编组筛选 */}
      {groups.length > 0 && (
        <View style={{ gap: 4 }}>
          <Text style={{ color: A.textHint, fontSize: 10 }}>按编组筛选：</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
            <Pressable onPress={() => { setGroupFilter('all'); setPage(0); }} style={{ paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: groupFilter === 'all' ? A.gold : A.divider, backgroundColor: groupFilter === 'all' ? A.goldBg : 'transparent' }}>
              <Text style={{ color: groupFilter === 'all' ? A.goldLight : A.textSecond, fontSize: 11 }}>全部</Text>
            </Pressable>
            {groups.map((g) => {
              const key = g.group_name === '未分组' ? '' : g.group_name;
              const isSelected = groupFilter === key;
              return (
                <Pressable key={g.group_name} onPress={() => { setGroupFilter(key); setPage(0); }} style={{ paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: isSelected ? A.gold : A.divider, backgroundColor: isSelected ? A.goldBg : 'transparent' }}>
                  <Text style={{ color: isSelected ? A.goldLight : A.textSecond, fontSize: 11 }}>{g.group_name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* 批次列表 — 点击查看详情，小图标筛选/复制/改名/删除 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
        <Pressable onPress={() => { setBatchFilter('all'); setPage(0); }} style={{ paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: batchFilter === 'all' ? A.gold : A.divider, backgroundColor: batchFilter === 'all' ? A.goldBg : 'transparent' }}>
          <Text style={{ color: batchFilter === 'all' ? A.goldLight : A.textSecond, fontSize: 11 }}>全部</Text>
        </Pressable>
        {batches.map((b) => (
          <View key={b.batch_name} style={{ borderWidth: 1, borderColor: batchFilter === b.batch_name ? A.gold : A.divider, backgroundColor: batchFilter === b.batch_name ? A.goldBg : 'transparent' }}>
            {/* 点击批次名 → 打开详情 Modal */}
            <Pressable onPress={() => openBatchDetail(b)} style={{ paddingHorizontal: 10, paddingTop: 5, paddingBottom: 2 }}>
              <Text style={{ color: batchFilter === b.batch_name ? A.goldLight : A.textPrimary, fontSize: 11, fontWeight: '700' }}>{b.batch_name}</Text>
              <Text style={{ color: A.textSecond, fontSize: 9, marginTop: 1 }}>
                {b.available} 可用 / {b.total} 总计
              </Text>
              {/* 复制记录摘要 */}
              {b.copy_count > 0 ? (
                <Text style={{ color: A.textHint, fontSize: 9, marginTop: 2 }}>
                  📋 已被复制 {b.copy_count} 次
                  {b.last_copied_email ? `  最近：${b.last_copied_email.split('@')[0]}` : ''}
                </Text>
              ) : null}
            </Pressable>
            {/* 底部操作图标 */}
            <View style={{ flexDirection: 'row', paddingBottom: 3, paddingHorizontal: 6, gap: 4 }}>
              {/* 筛选主列表 */}
              <Pressable cssInterop={false} onPress={() => { setBatchFilter(b.batch_name); setPage(0); }} hitSlop={4} style={{ paddingHorizontal: 4 }}>
                <Text style={{ color: batchFilter === b.batch_name ? A.gold : A.textHint, fontSize: 11 }}>🔍</Text>
              </Pressable>
              <Pressable cssInterop={false} onPress={() => copyBatchCodes(b.batch_name)} hitSlop={4} style={{ paddingHorizontal: 4 }}>
                <Text style={{ color: A.blue, fontSize: 11 }}>📋</Text>
              </Pressable>
              <Pressable cssInterop={false} onPress={() => { setRenameBatch(b.batch_name); setRenameValue(b.batch_name); }} hitSlop={4} style={{ paddingHorizontal: 4 }}>
                <Text style={{ color: A.gold, fontSize: 11 }}>✏️</Text>
              </Pressable>
              <Pressable cssInterop={false} onPress={() => setDelBatch(b.batch_name)} hitSlop={4} style={{ paddingHorizontal: 4 }}>
                <Text style={{ color: A.red, fontSize: 12 }}>🗑</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* 状态筛选 */}
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        {['all', 'unused', 'used', 'disabled', 'expired'].map((s) => (
          <Pressable key={s} onPress={() => { setStatusFilter(s); setPage(0); }} style={{ paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: statusFilter === s ? A.gold : A.divider, backgroundColor: statusFilter === s ? A.goldBg : 'transparent' }}>
            <Text style={{ color: statusFilter === s ? A.goldLight : A.textSecond, fontSize: 10 }}>{s === 'all' ? '全部' : STATUS_LABEL[s]}</Text>
          </Pressable>
        ))}
      </View>

      {/* 分页控件 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
        <Btn label="◀ 上页" onPress={() => goPage(page - 1)} variant="ghost" small disabled={page === 0} />
        <Text style={{ color: A.textSecond, fontSize: 11 }}>第 {page + 1} / {totalPages} 页（{PAGE_SIZE} 条/页）</Text>
        <Btn label="下页 ▶" onPress={() => goPage(page + 1)} variant="ghost" small disabled={page >= totalPages - 1} />
      </View>

      {loading ? <ActivityIndicator color={A.gold} size="large" /> :
        codes.length === 0 ? <Empty text="暂无测试码" /> :
        codes.map((c) => {
          const isExpired = c.expires_at ? new Date(c.expires_at) < new Date() : false;
          const displayStatus = isExpired && c.status === 'unused' ? 'expired' : c.status;
          const dim = c.status === 'disabled' || displayStatus === 'expired';
          return (
            <Pressable key={c.id} onPress={() => selectMode && toggleSelect(c.id)} style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: selectMode && selected.has(c.id) ? A.gold : A.divider, padding: 12, opacity: dim ? 0.5 : 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: A.textPrimary, fontSize: 14, fontWeight: '700', letterSpacing: 1, flex: 1 }}>{c.code}</Text>
                <Pressable
                  cssInterop={false}
                  onPress={() => copyCode(c.code)}
                  hitSlop={6}
                  style={{ borderWidth: 1, borderColor: A.border, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: 'rgba(255,255,255,0.06)', marginRight: 8 }}
                >
                  <Text style={{ color: A.textSecond, fontSize: 10 }}>复制</Text>
                </Pressable>
                <Badge text={STATUS_LABEL[displayStatus] ?? displayStatus} color={statusColors[displayStatus] ?? A.gold} />
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                <Text style={{ color: A.textSecond, fontSize: 10 }}>批次 {c.batch_name}</Text>
                {c.used_by_email ? <Text style={{ color: A.textSecond, fontSize: 10 }}>使用者 {c.used_by_email}</Text> : null}
                {c.note ? <Text style={{ color: A.textSecond, fontSize: 10 }}>备注 {c.note}</Text> : null}
              </View>
            </Pressable>
          );
        })
      }

      {/* 底部分页 */}
      {codes.length > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingBottom: 8 }}>
          <Btn label="◀ 上页" onPress={() => goPage(page - 1)} variant="ghost" small disabled={page === 0} />
          <Text style={{ color: A.textSecond, fontSize: 11 }}>{page + 1} / {totalPages}</Text>
          <Btn label="下页 ▶" onPress={() => goPage(page + 1)} variant="ghost" small disabled={page >= totalPages - 1} />
        </View>
      )}

      {/* 生成弹窗 */}
      <Modal visible={genOpen} transparent animationType="fade" onRequestClose={() => setGenOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 }} onPress={() => setGenOpen(false)}>
          <Pressable style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, padding: 16, gap: 10 }} onPress={(e) => e.stopPropagation()}>
            <Text style={{ color: A.goldLight, fontSize: 14, fontWeight: '700', letterSpacing: 1 }}>生成测试码</Text>
            <Text style={{ color: A.textSecond, fontSize: 11 }}>选择批次（或直接输入新批次名）</Text>
            <TextInput
              value={genBatch}
              onChangeText={setGenBatch}
              placeholder="输入或选择批次名，如：管理员21"
              placeholderTextColor={A.textHint}
              style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }}
            />
            <Text style={{ color: A.textHint, fontSize: 10 }}>已有批次（点击快速选择）：</Text>
            <ScrollView style={{ maxHeight: 140 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
              <View style={{ gap: 3 }}>
                {batches.length === 0 ? (
                  <Text style={{ color: A.textHint, fontSize: 11, paddingVertical: 8 }}>暂无批次，请在上方输入新批次名</Text>
                ) : batches.map((b) => {
                  const isSelected = genBatch === b.batch_name;
                  return (
                    <Pressable
                      key={b.batch_name}
                      onPress={() => setGenBatch(b.batch_name)}
                      style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1,
                        borderColor: isSelected ? A.gold : A.divider,
                        backgroundColor: isSelected ? A.goldBg : 'transparent' }}
                    >
                      <Text style={{ color: isSelected ? A.goldLight : A.textPrimary, fontSize: 12 }}>{b.batch_name}</Text>
                      <Text style={{ color: A.textSecond, fontSize: 10 }}>{b.total} 个</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
            <Text style={{ color: A.textSecond, fontSize: 11 }}>编组（可选，选择已有组或输入新组名）</Text>
            <TextInput
              value={genGroup}
              onChangeText={setGenGroup}
              placeholder="输入新组名，如：内测A组"
              placeholderTextColor={A.textHint}
              style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }}
            />
            {groups.length > 0 ? (
              <>
                <Text style={{ color: A.textHint, fontSize: 10 }}>已有编组（点击快速选择）：</Text>
                <ScrollView style={{ maxHeight: 100 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                  <View style={{ gap: 3 }}>
                    {groups.map((g) => {
                      const isSelected = genGroup === g.group_name;
                      return (
                        <Pressable
                          key={g.group_name}
                          onPress={() => setGenGroup(g.group_name === '未分组' ? '' : g.group_name)}
                          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                            paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1,
                            borderColor: isSelected ? A.gold : A.divider,
                            backgroundColor: isSelected ? A.goldBg : 'transparent' }}
                        >
                          <Text style={{ color: isSelected ? A.goldLight : A.textPrimary, fontSize: 12 }}>{g.group_name}</Text>
                          <Text style={{ color: A.textSecond, fontSize: 10 }}>{g.total} 个</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </>
            ) : null}
            <Text style={{ color: A.textSecond, fontSize: 11 }}>数量（单次最多 5000）</Text>
            <TextInput value={genCount} onChangeText={setGenCount} placeholder="10" placeholderTextColor={A.textHint} keyboardType="number-pad" style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }} />
            <Text style={{ color: A.textSecond, fontSize: 11 }}>备注（可选）</Text>
            <TextInput value={genNote} onChangeText={setGenNote} placeholder="如：内测第一批" placeholderTextColor={A.textHint} style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }} />
            <Text style={{ color: A.textSecond, fontSize: 11 }}>生效时长（到期自动删除）</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {([1, 5, 10, 30, 60, 720, 1440] as const).map((m) => {
                const active = genMinutes === m;
                const label = m < 60 ? `${m}分钟` : m === 60 ? '1小时' : m === 720 ? '12小时' : '24小时';
                return (
                  <Pressable key={m} onPress={() => setGenMinutes(m)} style={{ paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', borderWidth: 1, borderColor: active ? A.gold : A.border, backgroundColor: active ? A.goldBg : A.bgInput }}>
                    <Text style={{ color: active ? A.goldLight : A.textSecond, fontSize: 12, fontWeight: active ? '700' : '400' }}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {genResult ? (
              <View style={{ backgroundColor: A.greenBg, borderWidth: 1, borderColor: A.green, padding: 8, gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: '#7FE0A0', fontSize: 11, fontWeight: '700' }}>✓ 已生成 {genResult.codes.length} 个测试码</Text>
                  <Pressable
                    cssInterop={false}
                    onPress={copyGenResult}
                    hitSlop={4}
                    style={{ borderWidth: 1, borderColor: A.green, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: 'rgba(76,175,80,0.15)' }}
                  >
                    <Text style={{ color: '#7FE0A0', fontSize: 10, fontWeight: '700' }}>📋 一键复制</Text>
                  </Pressable>
                </View>
                {/* 复制格式切换 */}
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {([['plain', '纯码'], ['withNote', '带批次备注']] as const).map(([val, label]) => {
                    const on = genCopyFormat === val;
                    return (
                      <Pressable
                        key={val}
                        cssInterop={false}
                        onPress={() => setGenCopyFormat(val)}
                        style={{ paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: on ? A.green : A.divider, backgroundColor: on ? 'rgba(76,175,80,0.2)' : 'transparent' }}
                      >
                        <Text style={{ color: on ? '#7FE0A0' : A.textSecond, fontSize: 10, fontWeight: on ? '700' : '400' }}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <ScrollView style={{ maxHeight: 120 }} showsVerticalScrollIndicator={false}>
                  {genResult.codes.map((code) => (
                    <View key={code} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 }}>
                      <Text style={{ color: '#7FE0A0', fontSize: 12, flex: 1 }}>{code}</Text>
                      <Pressable
                        cssInterop={false}
                        onPress={() => copySingleCode(code)}
                        hitSlop={4}
                        style={{ borderWidth: 1, borderColor: A.green, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: 'rgba(76,175,80,0.15)' }}
                      >
                        <Text style={{ color: '#7FE0A0', fontSize: 9, fontWeight: '700' }}>复制</Text>
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Btn label="取消" onPress={() => setGenOpen(false)} variant="ghost" small style={{ flex: 1 }} />
              <Btn label={genSaving ? '生成中...' : '确认生成'} onPress={submitGen} variant="gold" disabled={genSaving} small style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 批次删除确认 */}
      <Modal visible={!!delBatch} transparent animationType="fade" onRequestClose={() => setDelBatch(null)}>
        <Pressable cssInterop={false} onPress={() => setDelBatch(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.red, padding: 18, gap: 12 }}>
            <Text style={{ color: A.red, fontSize: 14, fontWeight: '700' }}>🗑 删除批次</Text>
            <Text style={{ color: A.textSecond, fontSize: 12, lineHeight: 18 }}>确认删除批次「{delBatch}」及其全部测试码？此操作不可撤销。</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Btn label="取消" onPress={() => setDelBatch(null)} variant="ghost" small style={{ flex: 1 }} />
              <Btn label="确认删除" onPress={confirmDeleteBatch} variant="red" small style={{ flex: 1 }} />
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* 清除未使用测试码确认 */}
      <Modal visible={clearUnusedOpen} transparent animationType="fade" onRequestClose={() => setClearUnusedOpen(false)}>
        <Pressable cssInterop={false} onPress={() => setClearUnusedOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.red, padding: 18, gap: 12 }}>
            <Text style={{ color: A.red, fontSize: 14, fontWeight: '700' }}>🧹 清除未使用测试码</Text>
            <Text style={{ color: A.textSecond, fontSize: 12, lineHeight: 18 }}>将删除所有状态为「未使用」的测试码，已使用/已禁用/已过期的码不受影响。此操作不可撤销。</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Btn label="取消" onPress={() => setClearUnusedOpen(false)} variant="ghost" small style={{ flex: 1 }} />
              <Btn label="确认清除" onPress={confirmClearUnused} variant="red" small style={{ flex: 1 }} />
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* 编组改名 */}
      <Modal visible={!!renameGroup} transparent animationType="fade" onRequestClose={() => setRenameGroup(null)}>
        <Pressable cssInterop={false} onPress={() => setRenameGroup(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 }}>
          <Pressable cssInterop={false} onPress={() => {}} style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.gold, padding: 18, gap: 12 }}>
            <Text style={{ color: A.goldLight, fontSize: 14, fontWeight: '700' }}>✏️ 编组改名</Text>
            <Text style={{ color: A.textHint, fontSize: 11 }}>原名：{renameGroup}</Text>
            <TextInput value={groupRenameValue} onChangeText={setGroupRenameValue} placeholder="输入新编组名" placeholderTextColor={A.textHint} style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Btn label="取消" onPress={() => setRenameGroup(null)} variant="ghost" small style={{ flex: 1 }} />
              <Btn label="确认改名" onPress={confirmRenameGroup} variant="gold" small style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 编组删除确认 */}
      <Modal visible={!!delGroup} transparent animationType="fade" onRequestClose={() => setDelGroup(null)}>
        <Pressable cssInterop={false} onPress={() => setDelGroup(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.red, padding: 18, gap: 12 }}>
            <Text style={{ color: A.red, fontSize: 14, fontWeight: '700' }}>🗑 删除编组</Text>
            <Text style={{ color: A.textSecond, fontSize: 12, lineHeight: 18 }}>将删除编组「{delGroup}」下所有未使用的测试码。已使用/已禁用/已过期的码将保留（其编组名不变）。此操作不可撤销。</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Btn label="取消" onPress={() => setDelGroup(null)} variant="ghost" small style={{ flex: 1 }} />
              <Btn label="确认删除" onPress={confirmDeleteGroup} variant="red" small style={{ flex: 1 }} />
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* 批次重命名 */}
      <Modal visible={!!renameBatch} transparent animationType="fade" onRequestClose={() => { setRenameBatch(null); setRenameValue(''); }}>
        <Pressable cssInterop={false} onPress={() => { setRenameBatch(null); setRenameValue(''); }} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 }}>
          <Pressable cssInterop={false} onPress={() => {}} style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.gold, padding: 18, gap: 12 }}>
            <Text style={{ color: A.goldLight, fontSize: 14, fontWeight: '700' }}>✏️ 批次改名</Text>
            <Text style={{ color: A.textHint, fontSize: 11 }}>原名：{renameBatch}</Text>
            <TextInput value={renameValue} onChangeText={setRenameValue} placeholder="输入新批次名" placeholderTextColor={A.textHint} style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Btn label="取消" onPress={() => { setRenameBatch(null); setRenameValue(''); }} variant="ghost" small style={{ flex: 1 }} />
              <Btn label="确认改名" onPress={confirmRenameBatch} variant="gold" small style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 批次详情 Modal */}
      <Modal visible={!!batchDetail} transparent animationType="slide" onRequestClose={() => setBatchDetail(null)}>
        <Pressable cssInterop={false} onPress={() => setBatchDetail(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
          <Pressable cssInterop={false} onPress={() => {}} style={{ backgroundColor: A.bgMid, borderTopWidth: 2, borderTopColor: A.gold, maxHeight: '85%' }}>
            {batchDetail ? (
              <>
                {/* 标题行 */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: A.divider }}>
                  <View style={{ gap: 2 }}>
                    <Text style={{ color: A.goldLight, fontSize: 15, fontWeight: '700' }}>📦 {batchDetail.batch.batch_name}</Text>
                    <Text style={{ color: A.textSecond, fontSize: 11 }}>
                      {batchDetail.batch.available} 可用 · {batchDetail.batch.total} 总计
                      {batchDetail.batch.copy_count > 0 ? `  · 已复制 ${batchDetail.batch.copy_count} 次` : ''}
                    </Text>
                  </View>
                  <Btn label="📋 复制全部" onPress={copyDetailAll} variant="blue" small />
                </View>

                {/* 分页控制 */}
                {(() => {
                  const totalDetailPages = Math.max(1, Math.ceil(batchDetail.total / DETAIL_PAGE));
                  return (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: A.divider }}>
                      <Btn label="◀" onPress={() => loadDetailPage(batchDetail.page - 1)} variant="ghost" small disabled={batchDetail.page === 0 || batchDetail.loading} />
                      <Text style={{ color: A.textSecond, fontSize: 11 }}>
                        第 {batchDetail.page + 1} / {totalDetailPages} 页（{DETAIL_PAGE} 条/页）
                      </Text>
                      <Btn label="▶" onPress={() => loadDetailPage(batchDetail.page + 1)} variant="ghost" small disabled={batchDetail.page >= totalDetailPages - 1 || batchDetail.loading} />
                    </View>
                  );
                })()}

                {/* 码列表 */}
                <ScrollView contentContainerStyle={{ padding: 12, gap: 6 }} showsVerticalScrollIndicator={false}>
                  {batchDetail.loading ? (
                    <ActivityIndicator color={A.gold} size="large" style={{ marginVertical: 32 }} />
                  ) : batchDetail.codes.length === 0 ? (
                    <Text style={{ color: A.textHint, textAlign: 'center', paddingVertical: 24 }}>暂无测试码</Text>
                  ) : batchDetail.codes.map((c) => {
                    const isExpired = c.expires_at ? new Date(c.expires_at) < new Date() : false;
                    const displayStatus = isExpired && c.status === 'unused' ? 'expired' : c.status;
                    const detailStatusColor: Record<string, string> = { unused: A.green, used: A.blue, disabled: A.textHint, expired: A.textHint };
                    return (
                      <View key={c.id} style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', opacity: displayStatus === 'disabled' || displayStatus === 'expired' ? 0.5 : 1 }}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={{ color: A.textPrimary, fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>{c.code}</Text>
                          {c.used_by_email ? <Text style={{ color: A.textHint, fontSize: 10 }}>使用者 {c.used_by_email}</Text> : null}
                        </View>
                        <Badge text={STATUS_LABEL[displayStatus] ?? displayStatus} color={detailStatusColor[displayStatus] ?? A.gold} />
                      </View>
                    );
                  })}
                </ScrollView>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
    )}

    {/* ════════ 时间窗口 Tab ════════ */}
    {tab === 'schedule' && (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false}>
      {/* 当前生效时间窗口 */}
      <Card title="当前生效时间窗口" accent={A.green}>
        {schLoading ? <ActivityIndicator color={A.green} /> :
         activeSchedule ? (
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ backgroundColor: activeSchedule.enabled ? A.greenBg : A.redBg, borderWidth: 1, borderColor: activeSchedule.enabled ? A.green : A.red, paddingHorizontal: 12, paddingVertical: 8, flex: 1, alignItems: 'center' }}>
                <Text style={{ color: activeSchedule.enabled ? A.green : A.red, fontSize: 18, fontWeight: '700' }}>
                  {activeSchedule.enabled ? `${activeSchedule.open_time} — ${activeSchedule.close_time}` : '申请通道已关闭'}
                </Text>
                <Text style={{ color: A.textSecond, fontSize: 10, marginTop: 4 }}>
                  {activeSchedule.enabled ? '每日此时间段内开放玩家申请测试码' : '当前关闭，玩家无法提交测试码申请'}
                </Text>
              </View>
            </View>
            {activeSchedule.note ? <Text style={{ color: A.textHint, fontSize: 11 }}>备注：{activeSchedule.note}</Text> : null}
          </View>
        ) : (
          <View style={{ backgroundColor: A.redBg, borderLeftWidth: 2, borderLeftColor: A.red, paddingHorizontal: 10, paddingVertical: 8 }}>
            <Text style={{ color: A.red, fontSize: 12 }}>⚠️ 未设置时间窗口，玩家可随时申请测试码</Text>
          </View>
        )}
      </Card>

      {/* 设置 / 申请时间窗口 */}
      <Card title={isSuperAdmin ? '⚙️ 直接设置时间窗口（超管）' : '📋 申请修改时间窗口（需超管审批）'} accent={A.gold}>
        <View style={{ gap: 10 }}>
          <View style={{ backgroundColor: A.bgInput, borderLeftWidth: 2, borderLeftColor: A.gold, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Text style={{ color: A.textHint, fontSize: 10, lineHeight: 16 }}>
              {isSuperAdmin
                ? '超管直接生效，旧设置自动替换'
                : '普通管理员提交申请，超管审批后生效'}
            </Text>
          </View>

          {/* 开启/关闭总开关 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ color: A.textSecond, fontSize: 12, flex: 1 }}>申请通道</Text>
            <Pressable onPress={() => setSchEnabled(!schEnabled)} style={{ paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: schEnabled ? A.green : A.red, backgroundColor: schEnabled ? A.greenBg : A.redBg }}>
              <Text style={{ color: schEnabled ? A.green : A.red, fontSize: 12, fontWeight: '700' }}>{schEnabled ? '开启中' : '已关闭'}</Text>
            </Pressable>
          </View>

          {schEnabled && (
            <>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: A.textSecond, fontSize: 11, marginBottom: 4 }}>开始时间（HH:MM）</Text>
                  <TextInput value={schOpen} onChangeText={setSchOpen} placeholder="09:00" placeholderTextColor={A.textHint} style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, textAlign: 'center' }} />
                </View>
                <Text style={{ color: A.textHint, fontSize: 14, marginTop: 18 }}>—</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: A.textSecond, fontSize: 11, marginBottom: 4 }}>结束时间（HH:MM）</Text>
                  <TextInput value={schClose} onChangeText={setSchClose} placeholder="23:00" placeholderTextColor={A.textHint} style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, textAlign: 'center' }} />
                </View>
              </View>
              {/* 快速预设 */}
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {[['09:00','18:00'],['10:00','22:00'],['00:00','23:59']].map(([o, c]) => (
                  <Pressable key={o} onPress={() => { setSchOpen(o); setSchClose(c); }} style={{ paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: schOpen === o && schClose === c ? A.gold : A.divider, backgroundColor: schOpen === o && schClose === c ? A.goldBg : 'transparent' }}>
                    <Text style={{ color: schOpen === o && schClose === c ? A.goldLight : A.textSecond, fontSize: 10 }}>{o}–{c}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <Text style={{ color: A.textSecond, fontSize: 11 }}>备注（可选）</Text>
          <TextInput value={schNote} onChangeText={setSchNote} placeholder="如：活动期间临时开放" placeholderTextColor={A.textHint} style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }} />

          <Btn
            label={schSaving ? '提交中...' : (isSuperAdmin ? '立即生效' : '提交申请')}
            onPress={submitSchedule} variant="gold" disabled={schSaving}
          />
        </View>
      </Card>

      {/* 申请记录列表（超管可审批；普通管理员仅看） */}
      <Card title="申请记录" accent={A.gold}>
        {schLoading ? <ActivityIndicator color={A.gold} /> :
         schRequests.length === 0 ? <Empty text="暂无申请记录" /> :
         schRequests.map((req) => (
          <View key={req.id} style={{ backgroundColor: A.bgMid, borderWidth: 1, borderColor: A.divider, padding: 10, gap: 6, marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: A.textPrimary, fontSize: 13, fontWeight: '700', flex: 1 }}>
                {req.enabled ? `${req.open_time} — ${req.close_time}` : '关闭申请通道'}
              </Text>
              <View style={{ backgroundColor: SCH_STATUS_COLOR[req.status] + '22', borderWidth: 1, borderColor: SCH_STATUS_COLOR[req.status], paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ color: SCH_STATUS_COLOR[req.status], fontSize: 10, fontWeight: '700' }}>{SCH_STATUS_LABEL[req.status] ?? req.status}</Text>
              </View>
            </View>
            <Text style={{ color: A.textHint, fontSize: 10 }}>
              申请人：{req.created_by_email ?? '未知'}  ·  {new Date(req.created_at).toLocaleString('zh-CN')}
            </Text>
            {req.note ? <Text style={{ color: A.textSecond, fontSize: 10 }}>备注：{req.note}</Text> : null}
            {req.reject_reason ? <Text style={{ color: A.red, fontSize: 10 }}>驳回原因：{req.reject_reason}</Text> : null}
            {/* 超管审批按钮 */}
            {isSuperAdmin && req.status === 'pending' && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <Btn label="✓ 通过" onPress={() => handleApproveSchedule(req.id)} variant="green" small style={{ flex: 1 }} />
                <Btn label="✗ 驳回" onPress={() => { setRejectId(req.id); setRejectReason(''); }} variant="red" small style={{ flex: 1 }} />
              </View>
            )}
          </View>
        ))}
      </Card>

      {/* 驳回原因弹窗 */}
      <Modal visible={!!rejectId} transparent animationType="fade" onRequestClose={() => setRejectId(null)}>
        <Pressable cssInterop={false} onPress={() => setRejectId(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 }}>
          <Pressable cssInterop={false} onPress={() => {}} style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.red, padding: 18, gap: 12 }}>
            <Text style={{ color: A.red, fontSize: 14, fontWeight: '700' }}>驳回申请</Text>
            <Text style={{ color: A.textSecond, fontSize: 11 }}>驳回原因（可选）</Text>
            <TextInput value={rejectReason} onChangeText={setRejectReason} placeholder="填写驳回原因" placeholderTextColor={A.textHint} style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Btn label="取消" onPress={() => setRejectId(null)} variant="ghost" small style={{ flex: 1 }} />
              <Btn label="确认驳回" onPress={handleRejectSchedule} variant="red" small style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
    )}
    </>
  );
}
