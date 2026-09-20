// 人事中枢整合页（R4）—— 统一导航：招募 / 在任干部 / 私属门客 / 派遣任务 / 事件待办
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getRetainers, getSubordinatesByRank, getSubsWithEvents } from '@/db/gameApi';

type TabKey = 'recruit' | 'subordinates' | 'retainers' | 'dispatch' | 'events';

const TABS: { key: TabKey; label: string; icon: string; path: string }[] = [
  { key: 'recruit', label: '招募', icon: '🎓', path: '/(app)/recruit' },
  { key: 'subordinates', label: '在任干部', icon: '👥', path: '/(app)/subordinates' },
  { key: 'retainers', label: '私属门客', icon: '🧩', path: '/(app)/retainers' },
  { key: 'dispatch', label: '派遣任务', icon: '📤', path: '/(app)/dispatch' },
  { key: 'events', label: '事件待办', icon: '⚠️', path: '/(app)/events' },
];

export default function PersonnelHubScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save } = useGame();
  const [counts, setCounts] = useState({ subs: 0, retainers: 0, dispatched: 0, events: 0 });

  const load = useCallback(async () => {
    if (!save) return;
    const [subs, retainers, subEvents] = await Promise.all([
      getSubordinatesByRank(save.id, save.rankLevel),
      getRetainers(save.id),
      getSubsWithEvents(save.id),
    ]);
    setCounts({
      subs: subs.length,
      retainers: retainers.length,
      dispatched: subs.filter(s => s.isDispatched).length,
      events: subEvents.length,
    });
  }, [save]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const badge: Record<TabKey, number> = {
    recruit: 0,
    subordinates: counts.subs,
    retainers: counts.retainers,
    dispatch: counts.dispatched,
    events: counts.events,
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F2EC' }}>
      <StatusBar style="light" />
      <View style={{ backgroundColor: '#1B3A6B', paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Text style={{ color: '#fff', fontSize: 18 }}>‹</Text>
            </Pressable>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>🏛️ 人事中枢</Text>
          </View>
          <Pressable
            onPress={() => router.push('/(app)/ranking' as never)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 2 }}
          >
            <Text style={{ color: '#F5E6C8', fontSize: 12, fontWeight: '700' }}>🥇 排行榜</Text>
          </Pressable>
        </View>
        <Text style={{ color: '#a9bdd6', fontSize: 11, marginTop: 6 }}>
          统筹干部招募、在任管理、私属门客、派遣任务与事件待办
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
        {/* 资源概览 */}
        <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 12, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#1B3A6B' }}>资源概览</Text>
            <Pressable
              onPress={() => router.push('/(app)/personal-wealth' as never)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FCF9F2', paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#D8CDBA' }}
            >
              <Text style={{ fontSize: 10, color: '#7A5C00', fontWeight: '700' }}>💰 个人财富管理/划拨资金 ›</Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            <Pressable
              onPress={() => router.push('/(app)/personal-wealth' as never)}
              style={{ backgroundColor: '#FCF9F2', borderWidth: 1, borderColor: '#E8DFD0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 2 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 10, color: '#888' }}>个人资金</Text>
                <Text style={{ fontSize: 9, color: '#7A5C00', fontWeight: '700' }}>[去调拨]</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#7A5C00' }}>
                {Math.round(save?.silver ?? 0)}
              </Text>
            </Pressable>

            <View><Text style={{ fontSize: 10, color: '#888' }}>人脉</Text><Text style={{ fontSize: 15, fontWeight: '700', color: '#1B3A6B' }}>{Math.round(save?.connections ?? 0)}</Text></View>
            <View><Text style={{ fontSize: 10, color: '#888' }}>政绩</Text><Text style={{ fontSize: 15, fontWeight: '700', color: '#C8161D' }}>{save?.meritPoints ?? 0}</Text></View>
            <View><Text style={{ fontSize: 10, color: '#888' }}>派系贡献</Text><Text style={{ fontSize: 15, fontWeight: '700', color: '#2a7a3b' }}>{save?.factionContribution ?? 0}</Text></View>
          </View>

          {/* 提示条 */}
          {(save?.silver ?? 0) < 50 && (
            <Pressable
              onPress={() => router.push('/(app)/personal-wealth' as never)}
              style={{ marginTop: 10, backgroundColor: '#FFFBEA', borderWidth: 1, borderColor: '#F2E3A0', padding: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Text style={{ fontSize: 10, color: '#8A6D00', flex: 1 }}>
                💡 个人资金不足50，可前往「个人财富」将现金存款划拨为个人资金，用于招募门客与赏赐下属。
              </Text>
              <Text style={{ fontSize: 10, color: '#7A5C00', fontWeight: '700', marginLeft: 4 }}>去划拨 ›</Text>
            </Pressable>
          )}
        </View>

        {/* Tab 导航卡片 */}
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1B3A6B', marginBottom: 10 }}>功能模块</Text>
        {TABS.map(tab => (
          <Pressable key={tab.key} onPress={() => router.push(tab.path as never)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14, marginBottom: 10 }}>
            <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#F0F4FA', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20 }}>{tab.icon}</Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#222', flex: 1 }}>{tab.label}</Text>
            {badge[tab.key] > 0 && (
              <View style={{ backgroundColor: '#C8161D', minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{badge[tab.key]}</Text>
              </View>
            )}
            <Text style={{ color: '#1B3A6B', fontSize: 16 }}>›</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}