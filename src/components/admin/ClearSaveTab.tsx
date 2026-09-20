// 存档清除 Tab：按账号搜索玩家 → 展示存档信息 → 清除存档（仅删游戏数据，保留登录账号）
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { A, Badge, Btn, Card, Empty, LabeledInput, Row } from './shared';
import { adminFindSaveByAccount, adminClearPlayerSave, type FoundAccount } from '@/lib/adminApi';

export function ClearSaveTab() {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [found, setFound] = useState<FoundAccount | null>(null);
  const [msg, setMsg] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [acting, setActing] = useState(false);

  const search = async () => {
    if (!keyword.trim()) { setMsg('请输入账号邮箱 / 用户ID / 存档ID'); return; }
    setLoading(true); setMsg(''); setFound(null); setConfirm(false);
    const list = await adminFindSaveByAccount(keyword.trim());
    setLoading(false);
    if (!list.length) { setMsg('✗ 未找到该账号对应的存档'); return; }
    if (list.length > 1) { setMsg(`该账号有 ${list.length} 个存档，已显示第一个`); }
    setFound(list[0]);
  };

  const onClear = async () => {
    if (!found) return;
    setActing(true);
    const r = await adminClearPlayerSave(found.user_id);
    setConfirm(false);
    setActing(false);
    if (r.ok) {
      setMsg(`✓ 已清除存档（${r.player_name ?? '-'} · L${r.rank_level ?? '-'}）· 登录账号保留，玩家重新登录将生成新存档`);
      setFound(null);
    } else {
      setMsg(`✗ ${r.err}`);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Card title="搜索玩家账号" accent={A.blue}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <LabeledInput label="账号邮箱 / 用户ID / 存档ID" value={keyword} onChange={setKeyword} placeholder="输入玩家账号或存档ID" />
          </View>
          <Btn label={loading ? '...' : '搜索'} onPress={search} small disabled={loading} />
        </View>
        {msg ? <Text style={{ color: A.goldLight, fontSize: 12, marginTop: 8 }}>{msg}</Text> : null}
      </Card>

      {loading ? <ActivityIndicator color={A.gold} size="large" /> : null}

      {found ? (
        <Card title="存档信息" accent={A.gold}>
          <Row label="玩家姓名" value={found.player_name || '-'} />
          <Row label="账号邮箱" value={found.email || '-'} />
          <Row label="用户ID" value={found.user_id.slice(0, 8) + '...'} />
          <Row label="当前职级" value={`L${found.rank_level ?? '-'} ${found.rank_name ?? ''}`} />
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
            <Badge text="存档存在" color={A.green} />
            <Badge text="清除后保留登录账号" color={A.blue} />
          </View>

          {confirm ? (
            <View style={{ gap: 8, marginTop: 12 }}>
              <Text style={{ color: A.red, fontSize: 12, fontWeight: '700' }}>
                确认清除玩家「{found.player_name || found.email}」的存档？{'\n'}
                将删除该账号的全部游戏数据（存档/班子/岗位），登录账号保留；玩家重新登录后会生成全新初始存档。操作不可恢复。
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn label={acting ? '清除中...' : '确认清除存档'} onPress={onClear} variant="red" small disabled={acting} />
                <Btn label="取消" onPress={() => setConfirm(false)} small disabled={acting} />
              </View>
            </View>
          ) : (
            <View style={{ marginTop: 12 }}>
              <Btn label="🗑️ 清除存档（保留账号）" onPress={() => setConfirm(true)} variant="red" />
            </View>
          )}
        </Card>
      ) : (
        !loading ? <Empty text="输入玩家账号邮箱 / 用户ID / 存档ID 搜索存档" /> : null
      )}
    </ScrollView>
  );
}