// 年度综合排行报表详情页
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { supabase } from '@/client/supabase';
import type { MonthlyReport } from '@/types/game';

function rowToReport(row: Record<string, unknown>): MonthlyReport {
  return {
    id: row.id as string,
    saveId: row.save_id as string,
    monthKey: (row.month_key as number) ?? 0,
    yearKey: (row.year_key as number) ?? 0,
    deptKey: row.dept_key as string,
    title: row.title as string,
    content: row.content as string,
    gdpChange: (row.gdp_change as number) ?? 0,
    livelihoodChange: (row.livelihood_change as number) ?? 0,
    ecologyChange: (row.ecology_change as number) ?? 0,
    businessChange: (row.business_change as number) ?? 0,
    meritReward: (row.merit_reward as number) ?? 0,
    isRead: (row.is_read as boolean) ?? false,
    createdAt: row.created_at as string,
  };
}

export default function AnnualReportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save } = useGame();
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MonthlyReport | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!save) return;
      setLoading(true);
      supabase
        .from('monthly_reports')
        .select('*')
        .eq('save_id', save.id)
        .eq('dept_key', 'annual_rank')
        .order('year_key', { ascending: false })
        .limit(20)
        .then(({ data }) => {
          setReports((data ?? []).map(r => rowToReport(r as Record<string, unknown>)));
          setLoading(false);
        });
    }, [save])
  );

  const handleSelect = async (report: MonthlyReport) => {
    setSelected(report);
    // 标记已读
    if (!report.isRead) {
      await supabase.from('monthly_reports').update({ is_read: true }).eq('id', report.id);
      setReports(prev => prev.map(r => r.id === report.id ? { ...r, isRead: true } : r));
    }
  };

  const currentYear = save ? Math.floor(save.gameDays / 365) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      <StatusBar style="light" backgroundColor="#1D3B5E" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#2B4B6F', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => { if (selected) { setSelected(null); } else { router.back(); } }} style={{ marginRight: 12 }}>
            <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <Text style={{ fontSize: 24, marginRight: 8 }}>🏅</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>年度综合排行报表</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
              {selected ? selected.title : '历年报表档案'}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10 }}>{save?.rankName}</Text>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600', marginTop: 1 }}>{save?.cityName}</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#1D3B5E" />
        </View>
      ) : selected ? (
        // ===== 报表详情视图 =====
        <View style={{ flex: 1 }}>
          <FlatList
            data={[]}
            renderItem={() => null}
            ListHeaderComponent={
              <View style={{ padding: 16, gap: 14 }}>
                {/* 年度标题卡 */}
                <View style={{
                  backgroundColor: '#2B4B6F',
                  padding: 20,
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <Text style={{ color: '#a0b4cc', fontSize: 11, letterSpacing: 2 }}>
                    第 {selected.yearKey} 年度 · 综合政绩考核
                  </Text>
                  <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>{selected.title}</Text>
                  {selected.meritReward > 0 && (
                    <View style={{ backgroundColor: '#C9A227', paddingHorizontal: 12, paddingVertical: 4, marginTop: 4 }}>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                        🎖 优秀奖励 +{selected.meritReward} 政绩分
                      </Text>
                    </View>
                  )}
                </View>

                {/* 报表内容 */}
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 16 }}>
                  {selected.content.split('\n').map((line, idx) => {
                    const isSectionHeader = line.startsWith('【');
                    const isEmptyLine = line.trim() === '';
                    if (isEmptyLine) return <View key={idx} style={{ height: 8 }} />;
                    return (
                      <Text
                        key={idx}
                        style={{
                          fontSize: isSectionHeader ? 12 : 13,
                          color: isSectionHeader ? '#2B4B6F' : '#333',
                          fontWeight: isSectionHeader ? '700' : '400',
                          lineHeight: 22,
                          letterSpacing: isSectionHeader ? 1 : 0,
                          marginBottom: isSectionHeader ? 4 : 0,
                        }}
                      >
                        {line}
                      </Text>
                    );
                  })}
                </View>

                {/* 底部操作 */}
                <Pressable
                  onPress={() => setSelected(null)}
                  style={{ backgroundColor: '#2B4B6F', padding: 14, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>返回历年报表列表</Text>
                </Pressable>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 32 }}
          />
        </View>
      ) : (
        // ===== 报表列表视图 =====
        <FlatList
          data={reports}
          keyExtractor={item => item.id}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={{ paddingVertical: 60, alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 40 }}>🏅</Text>
              <Text style={{ fontSize: 15, color: '#555', fontWeight: '600' }}>尚无年度报表</Text>
              <Text style={{ fontSize: 12, color: '#999', textAlign: 'center', lineHeight: 18 }}>
                每自然年年底系统自动生成综合政绩排行报表{'\n'}当前处于第 {currentYear} 年，等待年底总结
              </Text>
            </View>
          }
          ListHeaderComponent={
            reports.length > 0 ? (
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14, marginBottom: 4 }}>
                <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '700', letterSpacing: 2, marginBottom: 8 }}>
                  历年排行档案
                </Text>
                <Text style={{ fontSize: 12, color: '#666', lineHeight: 18 }}>
                  共 {reports.length} 份年度报表。点击查看详细排名数据与施政总结。
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const grade =
              item.content.includes('特等') ? { label: '特等', color: '#C9A227', bg: '#FFF8E1' } :
              item.content.includes('优秀') ? { label: '优秀', color: '#2a7a3b', bg: '#F0FFF0' } :
              item.content.includes('良好') ? { label: '良好', color: '#2B4B6F', bg: '#F0F4F8' } :
              item.content.includes('合格') ? { label: '合格', color: '#666', bg: '#F5F5F5' } :
              { label: '待改进', color: '#c0392b', bg: '#FFF3F3' };

            return (
              <Pressable
                onPress={() => void handleSelect(item)}
                style={{
                  backgroundColor: '#fff',
                  borderWidth: 1,
                  borderColor: item.isRead ? '#E0E0E0' : '#2B4B6F',
                  padding: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                {/* 年份标识 */}
                <View style={{ backgroundColor: '#2B4B6F', width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#a0b4cc', fontSize: 9 }}>第</Text>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 22 }}>{item.yearKey}</Text>
                  <Text style={{ color: '#a0b4cc', fontSize: 9 }}>年</Text>
                </View>

                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: item.isRead ? '#555' : '#2B4B6F' }} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {!item.isRead && (
                      <View style={{ backgroundColor: '#c0392b', width: 6, height: 6, borderRadius: 3 }} />
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <View style={{ backgroundColor: grade.bg, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 11, color: grade.color, fontWeight: '700' }}>{grade.label}</Text>
                    </View>
                    {item.meritReward > 0 && (
                      <Text style={{ fontSize: 11, color: '#C9A227' }}>🎖 +{item.meritReward} 政绩</Text>
                    )}
                  </View>
                </View>

                <Text style={{ color: '#aaa', fontSize: 18 }}>›</Text>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
