// 派遣任务页面（R3）—— 派遣在任/待命下属执行巡查/招商/维稳/专案
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getSubordinatesByRank, dispatchSubordinate, computeDispatchFailRate } from '@/db/gameApi';
import type { Subordinate, DispatchType } from '@/types/game';
import { DISPATCH_CONFIG, getSubAvatarEmoji, getAvatarBgColor } from '@/types/game';

const TYPES: DispatchType[] = ['inspect', 'invest', 'stabilize', 'special'];

export default function DispatchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, refreshSave } = useGame();
  const [subs, setSubs] = useState<Subordinate[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<Subordinate | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    if (!save) return;
    setLoading(true);
    const list = await getSubordinatesByRank(save.id, save.rankLevel);
    setSubs(list);
    setLoading(false);
  }, [save]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const handleDispatch = async (type: DispatchType) => {
    if (!save || !target) return;
    setBusy(true);
    setMsg('');
    const res = await dispatchSubordinate(save.id, target.id, type, save.gameDays);
    setMsg(res.msg);
    setBusy(false);
    if (res.success) {
      setTarget(null);
      await refreshSave();
      await load();
    }
  };

  const dispatched = subs.filter(s => s.isDispatched);
  const available = subs.filter(s => !s.isDispatched);

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F2EC' }}>
      <StatusBar style="light" />
      {/* 顶部政务风标题栏 */}
      <View style={{ backgroundColor: '#1B3A6B', paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={{ color: '#fff', fontSize: 18 }}>‹</Text>
          </Pressable>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>📤 派遣任务</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={{ color: '#a9bdd6', fontSize: 11 }}>
            个人资金 {Math.round(save?.silver ?? 0)} · 人脉 {Math.round(save?.connections ?? 0)} · 政绩 {save?.meritPoints ?? 0}
          </Text>
          <Pressable onPress={() => router.push('/(app)/personal-wealth' as never)} style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 }}>
            <Text style={{ color: '#fff', fontSize: 10 }}>💰 调拨资金 ›</Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={[{ key: 'dispatched' }, { key: 'available' }]}
          keyExtractor={i => i.key}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          renderItem={({ item }) => {
            if (item.key === 'dispatched') {
              return (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1B3A6B', marginBottom: 8 }}>执行中（{dispatched.length}）</Text>
                  {dispatched.length === 0 ? (
                    <Text style={{ fontSize: 11, color: '#999' }}>暂无执行中的派遣任务</Text>
                  ) : (
                    dispatched.map(s => {
                      const cfg = DISPATCH_CONFIG[s.dispatchType ?? 'inspect'];
                      const remain = Math.max(0, (s.dispatchEndDay ?? 0) - (save?.gameDays ?? 0));
                      return (
                        <View key={s.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#1B3A6B', padding: 10, marginBottom: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{ fontSize: 18 }}>{getSubAvatarEmoji(s.avatarId, s.gender)}</Text>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#222', flex: 1 }}>{s.name}</Text>
                            <Text style={{ fontSize: 11, color: '#1B3A6B', fontWeight: '700' }}>{cfg?.icon} {cfg?.label}</Text>
                          </View>
                          <Text style={{ fontSize: 10, color: '#888', marginTop: 4 }}>预计还需 {remain} 天归来 · 收益：{cfg?.reward}</Text>
                        </View>
                      );
                    })
                  )}
                </View>
              );
            }
            return (
              <View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1B3A6B', marginBottom: 8 }}>可派遣下属（{available.length}）</Text>
                {available.length === 0 ? (
                  <Text style={{ fontSize: 11, color: '#999' }}>暂无可派遣下属</Text>
                ) : (
                  available.map(s => {
                    const failRate = computeDispatchFailRate(s.ability);
                    return (
                      <Pressable key={s.id} onPress={() => { setTarget(s); setMsg(''); }}
                        style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 10, marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: getAvatarBgColor(s.avatarId, s.faction), alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 18 }}>{getSubAvatarEmoji(s.avatarId, s.gender)}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{s.name}</Text>
                            <Text style={{ fontSize: 10, color: '#888' }}>能力{s.ability} · 忠诚{s.loyalty}</Text>
                          </View>
                          <Text style={{ fontSize: 10, color: '#999' }}>失败率{(failRate * 100).toFixed(0)}%</Text>
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </View>
            );
          }}
        />
      )}

      {/* 派遣选择弹层 */}
      <Modal visible={!!target} transparent animationType="slide" onRequestClose={() => setTarget(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: '#fff', paddingBottom: insets.bottom + 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1B3A6B' }}>派遣 {target?.name}</Text>
              <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>选择任务类型，派遣期间不可任命/调任/晋升</Text>
            </View>
            <ScrollView style={{ padding: 16 }}>
              {TYPES.map(type => {
                const cfg = DISPATCH_CONFIG[type];
                const ok = cfg.req.kind === 'ability' ? (target?.ability ?? 0) >= cfg.req.value : (target?.loyalty ?? 0) >= cfg.req.value;
                return (
                  <Pressable key={type} onPress={() => void handleDispatch(type)} disabled={busy || !ok}
                    style={{ borderWidth: 1, borderColor: ok ? '#1B3A6B' : '#DDD', backgroundColor: ok ? '#F0F4FA' : '#F5F5F5', padding: 12, marginBottom: 10, opacity: ok ? 1 : 0.6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 20 }}>{cfg.icon}</Text>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#1B3A6B', flex: 1 }}>{cfg.label}（{cfg.days}天）</Text>
                      {!ok && <Text style={{ fontSize: 10, color: '#C8161D' }}>不达标</Text>}
                    </View>
                    <Text style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{cfg.desc}</Text>
                    <Text style={{ fontSize: 10, color: '#7A5C00', marginTop: 2 }}>收益：{cfg.reward} · 需{cfg.req.kind === 'ability' ? '能力' : '忠诚'}≥{cfg.req.value}</Text>
                  </Pressable>
                );
              })}
              {busy && <ActivityIndicator style={{ marginTop: 8 }} />}
              {msg ? <Text style={{ fontSize: 11, color: '#C8161D', marginTop: 8 }}>{msg}</Text> : null}
            </ScrollView>
            <Pressable onPress={() => setTarget(null)} style={{ alignItems: 'center', paddingVertical: 12 }}>
              <Text style={{ color: '#888', fontSize: 13 }}>取消</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}