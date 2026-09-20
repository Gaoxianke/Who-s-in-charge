// 玩家排行榜（超管 + 普通管理员均可见）
// 按玩家等级降序，前20名
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { adminPlayerLeaderboard, type PlayerLeaderRow } from '@/lib/adminApi';
import { A, Badge, Empty } from './shared';

export function PlayerRankTab() {
  const [rows, setRows] = useState<PlayerLeaderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await adminPlayerLeaderboard();
    setRows(data);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      <Text style={{ color: A.gold, fontSize: 12, fontWeight: '700' }}>🏆 玩家排行榜 · 前20名</Text>

      {loading ? (
        <ActivityIndicator color={A.gold} size="large" style={{ marginTop: 24 }} />
      ) : rows.length === 0 ? (
        <Empty text="暂无玩家数据" />
      ) : (
        rows.map((p, idx) => (
          <View key={p.id} style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: idx < 3 ? A.gold : A.divider, padding: 12, gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Text style={{ color: idx < 3 ? A.goldLight : A.textSecond, fontSize: 14, fontWeight: '700' }}>
                  {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : `#${idx + 1}`}
                </Text>
                <Text style={{ color: A.textPrimary, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>{p.player_name}</Text>
              </View>
              <Badge text={p.rank_name} color={A.gold} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              <Text style={{ color: A.goldLight, fontSize: 11 }}>等级 Lv.{p.rank_level}</Text>
              <Text style={{ color: A.textSecond, fontSize: 11 }}>政绩 {p.merit_points}</Text>
              <Text style={{ color: A.textSecond, fontSize: 11 }}>民望 {p.moral_value}</Text>
              <Text style={{ color: A.textSecond, fontSize: 11 }}>任职 {p.game_days} 天</Text>
              {p.city_name ? <Text style={{ color: A.textSecond, fontSize: 11 }}>{p.city_name}</Text> : null}
              {p.is_retired ? <Text style={{ color: A.textHint, fontSize: 11 }}>已退休</Text> : null}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}