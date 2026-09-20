// 临时申诉 Tab：玩家提交的临时申诉（后台显示有存档但玩家端看不到存档）
// 管理员可同意或拒绝，拒绝须填写理由
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  adminListTempAppeals, adminReviewTempAppeal, adminApproveAllTempAppeals,
  type TempAppealRow,
} from '@/lib/adminApi';
import { A, Badge, Btn, Empty } from './shared';

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending:  { label: '待处理', color: A.gold },
  approved: { label: '已同意', color: A.green },
  rejected: { label: '已拒绝', color: A.red },
};
type Filter = 'pending' | 'approved' | 'rejected' | 'all';

function shortId(v: string | null): string {
  if (!v) return '—';
  return v.length > 12 ? `${v.slice(0, 8)}…${v.slice(-4)}` : v;
}

export function TempAppealsTab({ role }: { role: string }) {
  const canReview = role === 'admin' || role === 'super_admin';
  const [records, setRecords] = useState<TempAppealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('pending');
  const [page, setPage] = useState(0);
  const PAGE = 30;
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [detail, setDetail] = useState<TempAppealRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [confirmMode, setConfirmMode] = useState<'approve' | 'reject' | null>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const load = useCallback(async (p = 0, f: Filter = filter) => {
    setLoading(true);
    const data = await adminListTempAppeals(f === 'all' ? undefined : f, PAGE, p * PAGE);
    setRecords(data);
    setLoading(false);
  }, [filter]);

  useFocusEffect(useCallback(() => { load(0); setPage(0); }, [load]));

  const pendingCount = records.filter((r) => r.status === 'pending').length;

  const doBatchApprove = async () => {
    setShowBatchConfirm(false);
    setBatchProcessing(true);
    const res = await adminApproveAllTempAppeals();
    setBatchProcessing(false);
    if (res.ok) {
      flash(true, `已一键同意 ${res.count ?? 0} 条临时申诉`);
      setFilter('pending');
      setPage(0);
      load(0, 'pending');
    } else {
      flash(false, res.err ?? '操作失败');
    }
  };

  const openDetail = (r: TempAppealRow) => {
    setDetail(r);
    setRejectReason('');
    setConfirmMode(null);
  };

  const doReview = async () => {
    if (!detail || !confirmMode) return;
    if (confirmMode === 'reject' && rejectReason.trim().length < 2) {
      flash(false, '请填写拒绝理由（不少于 2 字）');
      return;
    }
    setProcessing(true);
    const res = await adminReviewTempAppeal(detail.id, confirmMode === 'approve', rejectReason.trim() || undefined);
    setProcessing(false);
    if (res.ok) {
      flash(true, confirmMode === 'approve' ? '已同意该临时申诉' : '已拒绝该临时申诉');
      setDetail(null);
      setConfirmMode(null);
      load(page, filter);
    } else {
      flash(false, res.err ?? '操作失败');
    }
  };

  const filters: Filter[] = ['pending', 'approved', 'rejected', 'all'];

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false}>
      <Text style={{ color: A.textSecond, fontSize: 11, letterSpacing: 0.5 }}>
        当后台显示账号已有存档、但玩家端看不到存档时，玩家可在档案审核页提交临时申诉。管理员可同意或拒绝，拒绝须填写理由。
      </Text>

      {msg ? (
        <View style={{ backgroundColor: msg.ok ? A.greenBg : A.redBg, borderLeftWidth: 2, borderLeftColor: msg.ok ? A.green : A.red, paddingHorizontal: 10, paddingVertical: 7 }}>
          <Text style={{ color: msg.ok ? '#7FE0A0' : '#FF7070', fontSize: 12 }}>{msg.text}</Text>
        </View>
      ) : null}

      {canReview && (filter === 'pending' || filter === 'all') && pendingCount > 0 ? (
        <View style={{ gap: 6 }}>
          <Btn
            label={batchProcessing ? '处理中...' : '✅ 一键同意当前所有临时申诉'}
            variant="green"
            small
            disabled={batchProcessing}
            onPress={() => setShowBatchConfirm(true)}
          />
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 6 }}>
        {filters.map((f) => (
          <Pressable key={f} onPress={() => { setFilter(f); setPage(0); load(0, f); }}
            style={{ flex: 1, paddingVertical: 7, alignItems: 'center', borderWidth: 1, borderColor: filter === f ? A.gold : A.divider, backgroundColor: filter === f ? A.goldBg : 'transparent' }}>
            <Text style={{ color: filter === f ? A.goldLight : A.textSecond, fontSize: 11, fontWeight: filter === f ? '700' : '400' }}>
              {f === 'all' ? '全部' : STATUS_META[f]?.label ?? f}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={A.gold} style={{ marginTop: 24 }} />
      ) : records.length === 0 ? (
        <Empty text="暂无临时申诉记录" />
      ) : (
        <View style={{ gap: 8 }}>
          {records.map((r) => {
            const meta = STATUS_META[r.status] ?? { label: r.status, color: A.textSecond };
            return (
              <Pressable key={r.id} onPress={() => openDetail(r)} cssInterop={false}
                style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, padding: 12, gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: A.textPrimary, fontSize: 13, fontWeight: '700' }}>{r.email}</Text>
                  <Badge text={meta.label} color={meta.color} />
                </View>
                <Text style={{ color: A.textSecond, fontSize: 11 }} numberOfLines={2}>{r.reason}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Text style={{ color: (r.same_fp_count) > 0 ? '#FF7070' : A.textHint, fontSize: 10 }}>
                    同设备 {r.same_fp_count}
                  </Text>
                  {r.admin_exempt ? <Text style={{ color: '#7FE0A0', fontSize: 10 }}>🛡管理员豁免</Text> : null}
                </View>
                <Text style={{ color: A.textHint, fontSize: 10 }}>{new Date(r.created_at).toLocaleString('zh-CN')}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {records.length > 0 ? (
        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 4 }}>
          <Btn label="上一页" variant="ghost" small disabled={page === 0} onPress={() => { const p = Math.max(0, page - 1); setPage(p); load(p, filter); }} />
          <Text style={{ color: A.textHint, fontSize: 11, alignSelf: 'center' }}>第 {page + 1} 页</Text>
          <Btn label="下一页" variant="ghost" small disabled={records.length < PAGE} onPress={() => { const p = page + 1; setPage(p); load(p, filter); }} />
        </View>
      ) : null}

      {/* 详情/审核弹窗 */}
      <Modal visible={!!detail} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', paddingHorizontal: 20 }} onPress={() => setDetail(null)}>
          <Pressable style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.gold, padding: 16, gap: 10 }} onPress={() => {}}>
            <Text style={{ color: A.goldLight, fontSize: 14, fontWeight: '700' }}>临时申诉详情</Text>
            <View style={{ gap: 4 }}>
              <Text style={{ color: A.textSecond, fontSize: 11 }}>账号：{detail?.email}</Text>
              <Text style={{ color: A.textSecond, fontSize: 11 }}>
                状态：{detail ? (STATUS_META[detail.status]?.label ?? detail.status) : ''}
              </Text>
              <Text style={{ color: A.textSecond, fontSize: 11 }}>提交时间：{detail ? new Date(detail.created_at).toLocaleString('zh-CN') : ''}</Text>
            </View>
            <View style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, padding: 10 }}>
              <Text style={{ color: A.textPrimary, fontSize: 12, lineHeight: 18 }}>{detail?.reason}</Text>
            </View>

            {/* 风控信息 */}
            <View style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.divider, padding: 10, gap: 4 }}>
              <Text style={{ color: A.goldLight, fontSize: 11, fontWeight: '700' }}>系统风控信息</Text>
              <Text style={{ color: A.textSecond, fontSize: 11, lineHeight: 18 }}>
                账号创建时间：{detail?.account_created_at ? new Date(detail.account_created_at).toLocaleString('zh-CN') : '未知'}
              </Text>
              <Text style={{ color: (detail?.same_fp_count ?? 0) > 0 ? '#FF7070' : A.textSecond, fontSize: 11, lineHeight: 18 }}>
                同设备其他账号：{detail?.same_fp_count ?? 0} 个{((detail?.same_fp_count ?? 0) > 0) ? '（疑似多开）' : ''}
              </Text>
              <Text style={{ color: A.textHint, fontSize: 10, lineHeight: 16 }}>设备指纹：{shortId(detail?.device_fingerprint ?? null)}</Text>
              {detail?.admin_exempt ? (
                <Text style={{ color: '#7FE0A0', fontSize: 11, fontWeight: '700' }}>🛡 管理员账号，已自动豁免多开审查</Text>
              ) : null}
            </View>

            {detail?.status === 'pending' ? (
              <>
                {confirmMode === 'reject' ? (
                  <>
                    <Text style={{ color: A.red, fontSize: 11, fontWeight: '700' }}>拒绝理由（必填）</Text>
                    <TextInput
                      style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, paddingHorizontal: 10, paddingVertical: 8, color: A.textPrimary, fontSize: 12 }}
                      placeholder="请填写拒绝理由"
                      placeholderTextColor={A.textHint}
                      value={rejectReason}
                      onChangeText={setRejectReason}
                      multiline
                    />
                  </>
                ) : null}

                {confirmMode === null ? (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <Btn label="同意" variant="green" onPress={() => setConfirmMode('approve')} style={{ flex: 1 }} />
                    <Btn label="拒绝" variant="red" onPress={() => setConfirmMode('reject')} style={{ flex: 1 }} />
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <Btn label="取消" variant="ghost" onPress={() => { setConfirmMode(null); setRejectReason(''); }} style={{ flex: 1 }} />
                    <Btn label={processing ? '处理中...' : (confirmMode === 'approve' ? '确认同意' : '确认拒绝')} variant={confirmMode === 'approve' ? 'green' : 'red'} disabled={processing} onPress={doReview} style={{ flex: 1 }} />
                  </View>
                )}
              </>
            ) : (
              <>
                {detail?.status === 'rejected' && detail.reject_reason ? (
                  <View style={{ backgroundColor: A.redBg, borderLeftWidth: 2, borderLeftColor: A.red, paddingHorizontal: 10, paddingVertical: 7 }}>
                    <Text style={{ color: '#FF7070', fontSize: 11, fontWeight: '700' }}>拒绝理由</Text>
                    <Text style={{ color: '#FF7070', fontSize: 12, lineHeight: 18 }}>{detail.reject_reason}</Text>
                  </View>
                ) : null}
                <Text style={{ color: A.textHint, fontSize: 11 }}>该申诉已处理</Text>
              </>
            )}
            <Btn label="关闭" variant="ghost" small onPress={() => { setDetail(null); setConfirmMode(null); }} />
          </Pressable>
        </Pressable>
      </Modal>

      {/* 一键同意确认弹窗 */}
      <Modal visible={showBatchConfirm} transparent animationType="fade" onRequestClose={() => setShowBatchConfirm(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', paddingHorizontal: 20 }} onPress={() => setShowBatchConfirm(false)}>
          <Pressable style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.green, padding: 16, gap: 10 }} onPress={() => {}}>
            <Text style={{ color: '#7FE0A0', fontSize: 14, fontWeight: '700' }}>一键同意确认</Text>
            <Text style={{ color: A.textSecond, fontSize: 12, lineHeight: 18 }}>
              将同意当前所有待处理的临时申诉（共 {pendingCount} 条），并删除对应玩家的旧存档。此操作不可撤销，确定继续吗？
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Btn label="取消" variant="ghost" onPress={() => setShowBatchConfirm(false)} style={{ flex: 1 }} />
              <Btn label={batchProcessing ? '处理中...' : '确认同意'} variant="green" disabled={batchProcessing} onPress={doBatchApprove} style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}