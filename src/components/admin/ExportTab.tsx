// 数据导出 Tab：选择类型 → 生成 CSV → 预览 + 复制
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { A, Btn, Card, Empty } from './shared';
import { adminAccountList, adminListAudit, listRedeemCodes } from '@/lib/adminApi';

type ExportType = 'players' | 'redeem' | 'audit';

function esc(v: unknown): string {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCSV(headers: string[], rows: unknown[][]): string {
  return [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
}

export function ExportTab({ role }: { role: string }) {
  const canExport = role === 'admin' || role === 'super_admin';
  const [type, setType] = useState<ExportType>('players');
  const [busy, setBusy] = useState(false);
  const [csv, setCsv] = useState('');
  const [msg, setMsg] = useState('');

  const onGen = async () => {
    setBusy(true); setMsg(''); setCsv('');
    if (type === 'players') {
      const list = await adminAccountList('', 200, 0);
      setCsv(toCSV(['邮箱', '昵称', '职级', '职级名', '功勋', '注册时间', '是否管理员'],
        list.map((r) => [r.email, r.player_name ?? '', r.rank_level ?? '', r.rank_name ?? '', r.merit_points ?? '', r.created_at, r.is_admin ? '是' : '否'])));
    } else if (type === 'redeem') {
      const list = await listRedeemCodes('all');
      setCsv(toCSV(['码值', '名称', '是否已用', '使用人', '使用时间', '生成时间', '奖励'],
        list.map((r) => [r.code, r.label, r.is_used ? '是' : '否', r.used_by_email ?? '', r.used_at ?? '', r.created_at, JSON.stringify(r.reward)])));
    } else {
      const list = await adminListAudit(200);
      setCsv(toCSV(['操作人', '动作', '目标', '时间', '详情'],
        list.map((r) => [r.admin_email, r.action, r.target_user_id ?? '', r.created_at, JSON.stringify(r.detail)])));
    }
    setBusy(false);
    setMsg('✓ 已生成 CSV');
  };

  const onCopy = async () => {
    await Clipboard.setStringAsync(csv);
    setMsg('✓ CSV 已复制到剪贴板');
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false}>
      <Card title="数据导出（CSV）" accent={A.blue}>
        <View style={{ gap: 8 }}>
          <Text style={{ color: A.textSecond, fontSize: 11 }}>选择导出类型</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {([['players', '玩家数据'], ['redeem', '兑换码记录'], ['audit', '审计日志']] as const).map(([v, l]) => (
              <Pressable key={v} cssInterop={false} onPress={() => setType(v)} style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: type === v ? A.gold : A.bgInput, borderWidth: 1, borderColor: type === v ? A.gold : A.border }}>
                <Text style={{ color: type === v ? '#0D1B2A' : A.textSecond, fontSize: 11, fontWeight: '600' }}>{l}</Text>
              </Pressable>
            ))}
          </View>
          <Btn label={busy ? '生成中...' : '生成 CSV'} onPress={onGen} disabled={!canExport || busy} />
          {!canExport ? <Text style={{ color: A.textHint, fontSize: 10 }}>需 admin 及以上权限</Text> : null}
        </View>
      </Card>

      {msg ? <Text style={{ color: A.goldLight, fontSize: 12, paddingHorizontal: 4 }}>{msg}</Text> : null}

      {busy ? <ActivityIndicator color={A.gold} /> : null}
      {csv ? (
        <Card title="CSV 预览（前 2000 字）" accent={A.gold}>
          <View style={{ gap: 8 }}>
            <Text style={{ color: A.textPrimary, fontSize: 10, fontFamily: 'monospace', lineHeight: 16 }}>{csv.slice(0, 2000)}{csv.length > 2000 ? '\n...(已截断)' : ''}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Btn label="复制全部" onPress={onCopy} small />
              <Text style={{ color: A.textHint, fontSize: 10, alignSelf: 'center' }}>共 {csv.length} 字符</Text>
            </View>
          </View>
        </Card>
      ) : (
        !busy ? <Empty text="选择类型并生成 CSV" /> : null
      )}
    </ScrollView>
  );
}
