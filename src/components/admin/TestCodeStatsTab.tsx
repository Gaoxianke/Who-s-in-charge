// 测试码生成统计（仅超级管理员可见）
// 顶部：生成总量（未用/已用）；下方：各管理员生成明细（最多20个账号）
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { adminTestCodeGenStats, type TestCodeGenStats } from '@/lib/adminApi';
import { A, Empty } from './shared';

export function TestCodeStatsTab() {
  const [stats, setStats] = useState<TestCodeGenStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await adminTestCodeGenStats();
    setStats(data);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      <Text style={{ color: A.gold, fontSize: 12, fontWeight: '700' }}>🎫 测试码生成统计</Text>

      {loading ? (
        <ActivityIndicator color={A.gold} size="large" style={{ marginTop: 24 }} />
      ) : (
        <>
          {/* 总量面板 */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { l: '生成总量', v: stats?.total ?? 0, c: A.gold },
              { l: '未使用', v: stats?.unused ?? 0, c: A.green },
              { l: '已使用', v: stats?.used ?? 0, c: A.blue },
            ].map((s) => (
              <View key={s.l} style={{ flex: 1, backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, borderTopWidth: 2, borderTopColor: s.c, padding: 12, alignItems: 'center' }}>
                <Text style={{ color: s.c, fontSize: 20, fontWeight: '700' }}>{s.v}</Text>
                <Text style={{ color: A.textSecond, fontSize: 10, marginTop: 2 }}>{s.l}</Text>
              </View>
            ))}
          </View>

          {/* 各管理员明细 */}
          <Text style={{ color: A.textSecond, fontSize: 11, marginTop: 4 }}>管理员生成明细（最多20个账号）</Text>
          {(!stats || stats.admins.length === 0) ? (
            <Empty text="暂无生成记录" />
          ) : (
            stats.admins.map((a, idx) => (
              <View key={a.admin_id} style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, padding: 12, gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: A.gold, fontSize: 12, fontWeight: '700' }}>#{idx + 1}</Text>
                    <Text style={{ color: A.textPrimary, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{a.admin_email}</Text>
                  </View>
                  <Text style={{ color: A.goldLight, fontSize: 14, fontWeight: '700' }}>{a.gen_count}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Text style={{ color: A.green, fontSize: 11 }}>未用 {a.gen_unused}</Text>
                  <Text style={{ color: A.blue, fontSize: 11 }}>已用 {a.gen_used}</Text>
                </View>
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}