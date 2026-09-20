// 兑换码 Tab：生成码 + 列表筛选 + 复制
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { A, Badge, Btn, Card, Empty, LabeledInput } from './shared';
import { adminCreateRedeemCode, listRedeemCodes, type RedeemCode } from '@/lib/adminApi';

export function RedeemTab({ role }: { role: string }) {
  const canCreate = role === 'admin' || role === 'super_admin';
  const [label, setLabel] = useState('通用兑换码');
  const [rewardMerit, setRewardMerit] = useState('500');
  const [rewardFund, setRewardFund] = useState('10000');
  const [count, setCount] = useState('1');
  const [creating, setCreating] = useState(false);
  const [newCodes, setNewCodes] = useState<string[]>([]);
  const [msg, setMsg] = useState('');

  const [filter, setFilter] = useState<'all' | 'unused' | 'used'>('all');
  const [list, setList] = useState<RedeemCode[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setList(await listRedeemCodes(filter));
    setLoading(false);
  }, [filter]);

  const onGenerate = async () => {
    setCreating(true); setMsg('');
    const reward: Record<string, unknown> = { merit: Number(rewardMerit) || 0, fund: Number(rewardFund) || 0 };
    const codes = await adminCreateRedeemCode(label, reward, Number(count) || 1);
    setNewCodes(codes);
    setCreating(false);
    setMsg(codes.length > 0 ? `✓ 已生成 ${codes.length} 个兑换码` : '✗ 生成失败');
    load();
  };

  const copy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    setMsg('✓ 已复制：' + text);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* 生成 */}
      {canCreate ? (
        <Card title="生成兑换码" accent={A.gold}>
          <View style={{ gap: 8 }}>
            <LabeledInput label="码名称" value={label} onChange={setLabel} placeholder="通用兑换码" />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}><LabeledInput label="奖励·功勋" value={rewardMerit} onChange={setRewardMerit} keyboardType="number-pad" /></View>
              <View style={{ flex: 1 }}><LabeledInput label="奖励·资金" value={rewardFund} onChange={setRewardFund} keyboardType="number-pad" /></View>
              <View style={{ flex: 0.6 }}><LabeledInput label="数量" value={count} onChange={setCount} keyboardType="number-pad" /></View>
            </View>
            <Btn label={creating ? '生成中...' : '生成兑换码'} onPress={onGenerate} disabled={creating} />
          </View>
          {newCodes.length > 0 ? (
            <View style={{ marginTop: 10, gap: 6 }}>
              <Text style={{ color: A.goldLight, fontSize: 11 }}>新生成的码（点击复制）</Text>
              {newCodes.map((c) => (
                <Pressable key={c} cssInterop={false} onPress={() => copy(c)} style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.gold, padding: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: A.goldLight, fontSize: 14, fontWeight: '700', letterSpacing: 1 }}>{c}</Text>
                  <Text style={{ color: A.textHint, fontSize: 11 }}>复制</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Card>
      ) : null}

      {msg ? <Text style={{ color: A.goldLight, fontSize: 12, paddingHorizontal: 4 }}>{msg}</Text> : null}

      {/* 列表 */}
      <Card title="兑换码列表">
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
          {(['all', 'unused', 'used'] as const).map((f) => (
            <Pressable key={f} cssInterop={false} onPress={() => setFilter(f)} style={{ flex: 1, paddingVertical: 7, alignItems: 'center', backgroundColor: filter === f ? A.gold : A.bgInput, borderWidth: 1, borderColor: filter === f ? A.gold : A.border }}>
              <Text style={{ color: filter === f ? '#0D1B2A' : A.textSecond, fontSize: 11, fontWeight: '600' }}>{f === 'all' ? '全部' : f === 'unused' ? '未用' : '已用'}</Text>
            </Pressable>
          ))}
        </View>
        {loading ? <ActivityIndicator color={A.gold} /> :
          list.length === 0 ? <Empty text="无兑换码" /> :
          list.map((c) => (
            <View key={c.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: A.divider, gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Pressable cssInterop={false} onPress={() => copy(c.code)}>
                  <Text style={{ color: c.is_used ? A.textHint : A.goldLight, fontSize: 14, fontWeight: '700', letterSpacing: 1 }}>{c.code}</Text>
                </Pressable>
                <Badge text={c.is_used ? '已用' : '可用'} color={c.is_used ? A.textHint : A.green} />
              </View>
              <Text style={{ color: A.textSecond, fontSize: 10 }}>{c.label} · 功勋{String(c.reward?.merit ?? 0)} 资金{String(c.reward?.fund ?? 0)}</Text>
              <Text style={{ color: A.textHint, fontSize: 9 }}>{c.is_used ? `使用人 ${c.used_by_email ?? '-'} · ${c.used_at ? new Date(c.used_at).toLocaleString('zh-CN') : ''}` : `生成于 ${new Date(c.created_at).toLocaleString('zh-CN')}`}</Text>
            </View>
          ))
        }
      </Card>
    </ScrollView>
  );
}
