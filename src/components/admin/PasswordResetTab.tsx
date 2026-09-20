// 密码重置申请审批 Tab（仅超级管理员）
// 普通管理员发起的密码重置申请在此审批；审批时超级管理员可重新设置玩家新密码
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { A, Badge, Btn, Card, Empty, LabeledInput, Row } from './shared';
import {
  adminApprovePasswordReset, adminListPasswordResetRequests, adminRejectPasswordReset,
  type PasswordResetRequest,
} from '@/lib/adminApi';

export function PasswordResetTab({ role }: { role: string }) {
  const isSuperAdmin = role === 'super_admin';
  const [rows, setRows] = useState<PasswordResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('pending');
  const [msg, setMsg] = useState('');
  // 审批中的申请 + 新密码输入
  const [approving, setApproving] = useState<string | null>(null);
  const [newPwd, setNewPwd] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const list = await adminListPasswordResetRequests(filter === 'all' ? undefined : filter, 100);
    setRows(list);
    setLoading(false);
  }, [filter]);

  const flash = (text: string) => { setMsg(text); setTimeout(() => setMsg(''), 2500); };

  const onApprove = async (id: string) => {
    if (newPwd.length < 6) { flash('✗ 新密码至少 6 位'); return; }
    const r = await adminApprovePasswordReset(id, newPwd);
    flash(r.ok ? '✓ 已审批通过并重置玩家密码' : `✗ ${r.err}`);
    if (r.ok) { setApproving(null); setNewPwd(''); load(); }
  };
  const onReject = async (id: string) => {
    const r = await adminRejectPasswordReset(id);
    flash(r.ok ? '✓ 已驳回申请' : `✗ ${r.err}`);
    if (r.ok) load();
  };

  if (!isSuperAdmin) {
    return (
      <View style={{ padding: 16, alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <Text style={{ color: A.textHint, fontSize: 12 }}>仅超级管理员可审批密码重置申请</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* 筛选 */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
          <Btn key={f} label={f === 'pending' ? '待审批' : f === 'approved' ? '已通过' : f === 'rejected' ? '已驳回' : '全部'} onPress={() => setFilter(f)} small variant={filter === f ? 'gold' : 'ghost'} style={{ flex: 1 }} />
        ))}
      </View>

      {msg ? <Text style={{ color: A.goldLight, fontSize: 12, paddingHorizontal: 4 }}>{msg}</Text> : null}

      {loading ? <ActivityIndicator color={A.gold} size="large" /> :
        rows.length === 0 ? <Empty text="暂无密码重置申请" /> :
        rows.map((r) => (
          <Card key={r.id} title={`${r.target_email}`} accent={r.status === 'pending' ? A.gold : r.status === 'approved' ? A.green : A.textHint}>
            <Row label="玩家" value={r.target_player_name ?? '未建角色'} />
            <Row label="申请管理员" value={r.requested_by_email} />
            <Row label="申请原因" value={r.reason || '未填写'} />
            <Row label="申请时间" value={new Date(r.created_at).toLocaleString('zh-CN')} />
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
              <Badge text={r.status === 'pending' ? '待审批' : r.status === 'approved' ? '已通过' : '已驳回'} color={r.status === 'pending' ? A.gold : r.status === 'approved' ? A.green : A.textHint} />
              {r.reviewed_at ? <Text style={{ color: A.textHint, fontSize: 10 }}>审批于 {new Date(r.reviewed_at).toLocaleString('zh-CN')}</Text> : null}
            </View>

            {r.status === 'pending' && approving === r.id ? (
              <View style={{ marginTop: 10, gap: 8, backgroundColor: A.bgInput, padding: 10, borderWidth: 1, borderColor: A.border }}>
                <Text style={{ color: A.goldLight, fontSize: 11, fontWeight: '700' }}>重新设置玩家新密码（≥6位）</Text>
                <LabeledInput label="新密码" value={newPwd} onChange={setNewPwd} placeholder="输入新密码" />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Btn label="✓ 通过并重置" onPress={() => onApprove(r.id)} variant="green" small style={{ flex: 1 }} />
                  <Btn label="取消" onPress={() => { setApproving(null); setNewPwd(''); }} variant="ghost" small style={{ flex: 1 }} />
                </View>
              </View>
            ) : null}

            {r.status === 'pending' && approving !== r.id ? (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Btn label="✓ 审批通过" onPress={() => setApproving(r.id)} variant="green" small style={{ flex: 1 }} />
                <Btn label="✗ 驳回" onPress={() => onReject(r.id)} variant="red" small style={{ flex: 1 }} />
              </View>
            ) : null}
          </Card>
        ))
      }
    </ScrollView>
  );
}