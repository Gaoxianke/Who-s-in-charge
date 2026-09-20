// 数据统计 Tab：三张核心卡片 + 14天趋势 + 活跃TOP20 + 职级分布 + 当前在线
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { A, Card, Empty } from './shared';
import {
  adminOnlinePlayers, adminRankDistribution, adminRegistrationTrend, adminStatsOverview, adminTopActive,
  type AdminStats, type OnlinePlayer, type RankBucket, type TopPlayer, type TrendPoint,
} from '@/lib/adminApi';

export function StatsTab({ role: _role }: { role: string }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [top, setTop] = useState<TopPlayer[]>([]);
  const [ranks, setRanks] = useState<RankBucket[]>([]);
  const [online, setOnline] = useState<OnlinePlayer[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [s, t, tp, r, o] = await Promise.all([
      adminStatsOverview(), adminRegistrationTrend(14), adminTopActive(20), adminRankDistribution(), adminOnlinePlayers(5),
    ]);
    setStats(s); setTrend(t); setTop(tp); setRanks(r); setOnline(o);
    setLoading(false);
  }, []);

  // 60 秒自动刷新核心卡片（+在线）
  useEffect(() => {
    load();
    const id = setInterval(async () => {
      const [s, o] = await Promise.all([adminStatsOverview(), adminOnlinePlayers(5)]);
      setStats(s); setOnline(o);
    }, 60000);
    return () => clearInterval(id);
  }, [load]);

  if (loading) return <ActivityIndicator size="large" color={A.gold} style={{ padding: 40 }} />;

  const maxTrend = Math.max(1, ...trend.map((t) => t.cnt));
  const maxRank = Math.max(1, ...ranks.map((r) => r.cnt));

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false}>
      {/* 三张核心卡片 */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <StatCard label="总注册" value={stats?.total_users ?? 0} suffix="人" accent={A.gold} />
        <StatCard label="今日新增" value={stats?.today_new ?? 0} prefix="+" suffix="人" accent={A.green} />
        <StatCard label="今日活跃" value={stats?.today_active ?? 0} suffix="人" accent={A.goldLight} />
      </View>

      {/* 14天注册趋势 */}
      <Card title="近 14 天注册趋势" accent={A.blue}>
        {trend.length === 0 ? <Empty /> : (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 3 }}>
            {trend.map((t, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                <View style={{ width: '100%', height: Math.max(2, (t.cnt / maxTrend) * 60), backgroundColor: t.cnt > 0 ? A.blue : A.divider }} />
                <Text style={{ fontSize: 7, color: A.textHint }}>{String(t.d).slice(5)}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* 活跃 TOP20 */}
      <Card title="活跃玩家 TOP20" accent={A.gold}>
        {top.length === 0 ? <Empty text="暂无活跃玩家" /> : top.map((p, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: A.divider }}>
            <Text style={{ color: i < 3 ? A.gold : A.textHint, fontSize: 12, fontWeight: '700', width: 20 }}>{i + 1}</Text>
            <Text style={{ color: A.textPrimary, fontSize: 13, flex: 1 }}>{p.player_name || '匿名'}</Text>
            <Text style={{ color: A.textSecond, fontSize: 11 }}>L{p.rank_level} {p.rank_name}</Text>
            <Text style={{ color: A.goldLight, fontSize: 12, fontWeight: '600' }}>{p.merit_points}</Text>
          </View>
        ))}
      </Card>

      {/* 职级分布 */}
      <Card title="职级分布" accent={A.green}>
        {ranks.length === 0 ? <Empty text="暂无存档" /> : ranks.map((r) => (
          <View key={r.rank_level} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
            <Text style={{ color: A.textSecond, fontSize: 11, width: 28 }}>L{r.rank_level}</Text>
            <View style={{ flex: 1, height: 10, backgroundColor: A.divider }}>
              <View style={{ height: 10, width: `${Math.max(3, (r.cnt / maxRank) * 100)}%`, backgroundColor: A.green }} />
            </View>
            <Text style={{ color: A.textPrimary, fontSize: 11, width: 40, textAlign: 'right' }}>{r.cnt}</Text>
          </View>
        ))}
      </Card>

      {/* 当前在线 */}
      <Card title={`🟢 当前在线 · ${online.length} 人`} accent={A.green}>
        {online.length === 0 ? <Empty text="近 5 分钟无活跃" /> : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {online.map((p, i) => (
              <View key={i} style={{ backgroundColor: A.greenBg, borderWidth: 1, borderColor: A.green, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ color: A.textPrimary, fontSize: 11 }}>{p.player_name || '匿名'} (L{p.rank_level})</Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

function StatCard({ label, value, suffix, prefix, accent }: { label: string; value: number; suffix?: string; prefix?: string; accent: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: A.bgMid, borderWidth: 1, borderColor: A.divider, borderTopWidth: 2, borderTopColor: accent, padding: 12, gap: 4 }}>
      <Text style={{ color: accent, fontSize: 10, letterSpacing: 1 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>{prefix}{value.toLocaleString()}</Text>
        <Text style={{ color: A.textSecond, fontSize: 10 }}>{suffix}</Text>
      </View>
    </View>
  );
}
