// 封禁申诉 Tab：玩家提交的封禁申诉，超管审核（通过即解封）
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/client/supabase';
import {
  adminListBanAppeals, adminReviewBanAppeal,
  type BanAppealRow,
} from '@/lib/adminApi';
import { A, Badge, Btn, Empty } from './shared';

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending:  { label: '待审核', color: A.gold },
  approved: { label: '已通过', color: A.green },
  rejected: { label: '已驳回', color: A.red },
};
// 封禁类型中文标签
const BAN_TYPE_LABEL: Record<string, string> = {
  device: '设备封禁',
  ip: 'IP 封禁',
  email: '邮箱封禁',
};
type Filter = 'pending' | 'approved' | 'rejected' | 'all';

export function BanAppealsTab({ role }: { role: string }) {
  const isSuperAdmin = role === 'super_admin';
  const [records, setRecords] = useState<BanAppealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('pending');
  const [page, setPage] = useState(0);
  const PAGE = 30;
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [detail, setDetail] = useState<BanAppealRow | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const load = useCallback(async (p = 0, f: Filter = filter) => {
    setLoading(true);
    const data = await adminListBanAppeals(f === 'all' ? undefined : f, PAGE, p * PAGE);
    setRecords(data);
    setLoading(false);
  }, [filter]);

  useFocusEffect(useCallback(() => { load(0); setPage(0); }, [load]));

  // 实时订阅 ban_appeals 表变更，申诉列表实时刷新
  useEffect(() => {
    const channel = supabase
      .channel('ban-appeals-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ban_appeals' }, () => {
        load(page, filter);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load, page, filter]);

  const openDetail = (r: BanAppealRow) => {
    setDetail(r);
    setReviewNote(r.review_note ?? '');
  };

  const doReview = async (approve: boolean) => {
    if (!detail) return;
    setProcessing(true);
    const res = await adminReviewBanAppeal(detail.id, approve, reviewNote.trim() || undefined);
    setProcessing(false);
    if (res.ok) {
      flash(true, approve ? '已通过申诉并解封该账号' : '已驳回该申诉');
      setDetail(null);
      load(page, filter);
    } else {
      flash(false, res.err ?? '操作失败');
    }
  };

  const filters: Filter[] = ['pending', 'approved', 'rejected', 'all'];

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false}>
      <Text style={{ color: A.textSecond, fontSize: 11, letterSpacing: 0.5 }}>
        玩家被封禁后可通过登录页申诉入口提交申诉。超管审核通过后自动解封该账号。
      </Text>

      {msg ? (
        <View style={{ backgroundColor: msg.ok ? A.greenBg : A.redBg, borderLeftWidth: 2, borderLeftColor: msg.ok ? A.green : A.red, paddingHorizontal: 10, paddingVertical: 7 }}>
          <Text style={{ color: msg.ok ? '#7FE0A0' : '#FF7070', fontSize: 12 }}>{msg.text}</Text>
        </View>
      ) : null}

      {/* 状态筛选 */}
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
        <Empty text="暂无封禁申诉记录" />
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
                <Text style={{ color: A.textHint, fontSize: 10 }}>{new Date(r.created_at).toLocaleString('zh-CN')}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* 分页 */}
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
            <Text style={{ color: A.goldLight, fontSize: 14, fontWeight: '700' }}>封禁申诉详情</Text>
            <View style={{ gap: 4 }}>
              <Text style={{ color: A.textSecond, fontSize: 11 }}>账号：{detail?.email}</Text>
              <Text style={{ color: A.textSecond, fontSize: 11 }}>状态：{detail ? (STATUS_META[detail.status]?.label ?? detail.status) : ''}</Text>
              <Text style={{ color: A.textSecond, fontSize: 11 }}>
                封禁类型：{detail?.ban_type ? (BAN_TYPE_LABEL[detail.ban_type] ?? detail.ban_type) : '未知'}
              </Text>
              <Text style={{ color: A.textSecond, fontSize: 11 }}>
                封禁时间：{detail?.banned_at ? new Date(detail.banned_at).toLocaleString('zh-CN') : '—'}
              </Text>
              <Text style={{ color: A.textSecond, fontSize: 11 }}>提交时间：{detail ? new Date(detail.created_at).toLocaleString('zh-CN') : ''}</Text>
            </View>
            <View style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, padding: 10 }}>
              <Text style={{ color: A.textPrimary, fontSize: 12, lineHeight: 18 }}>{detail?.reason}</Text>
            </View>
            <Text style={{ color: A.textSecond, fontSize: 11 }}>审核备注</Text>
            <TextInput
              style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, paddingHorizontal: 10, paddingVertical: 8, color: A.textPrimary, fontSize: 12 }}
              placeholder="可选：填写审核备注"
              placeholderTextColor={A.textHint}
              value={reviewNote}
              onChangeText={setReviewNote}
              multiline
            />
            {isSuperAdmin && detail?.status === 'pending' ? (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <Btn label={processing ? '处理中...' : '通过并解封'} variant="green" disabled={processing} onPress={() => doReview(true)} style={{ flex: 1 }} />
                <Btn label="驳回" variant="red" disabled={processing} onPress={() => doReview(false)} style={{ flex: 1 }} />
              </View>
            ) : (
              <Text style={{ color: A.textHint, fontSize: 11 }}>
                {!isSuperAdmin ? '仅超级管理员可审核申诉' : '该申诉已处理'}
              </Text>
            )}
            <Btn label="关闭" variant="ghost" small onPress={() => setDetail(null)} />
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}