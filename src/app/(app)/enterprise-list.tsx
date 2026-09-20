// 招商局企业名单管理页
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getEnterprises, closeEnterprise } from '@/db/gameApi';
import type { Enterprise } from '@/types/game';

const STATUS_LABEL: Record<string, string> = {
  operating: '运营中',
  closed:    '已关闭',
  pending:   '洽谈中',
};
const STATUS_COLOR: Record<string, string> = {
  operating: '#1a4a2e',
  closed:    '#888',
  pending:   '#7a5c00',
};
const SCALE_LABEL: Record<string, string> = {
  small:  '小型',
  medium: '中型',
  large:  '大型',
};

export default function EnterpriseListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save } = useGame();
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'operating' | 'closed'>('all');
  const [toastMsg, setToastMsg] = useState('');

  const loadData = useCallback(async () => {
    if (!save) return;
    setLoading(true);
    const data = await getEnterprises(save.id);
    setEnterprises(data);
    setLoading(false);
  }, [save]);

  useFocusEffect(useCallback(() => { void loadData(); }, [loadData]));

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const handleClose = async (ent: Enterprise) => {
    await closeEnterprise(ent.id);
    showToast(`已关停企业：${ent.name}`);
    await loadData();
  };

  const filtered = enterprises.filter(e => {
    if (filter === 'operating') return e.status === 'operating';
    if (filter === 'closed') return e.status === 'closed';
    return true;
  });

  const totalTax = enterprises.filter(e => e.status === 'operating').reduce((s, e) => s + e.taxContribution, 0);

  const renderItem = ({ item }: { item: Enterprise }) => {
    const statusColor = STATUS_COLOR[item.status] ?? '#888';
    const statusLabel = STATUS_LABEL[item.status] ?? item.status;
    const scaleLabel = SCALE_LABEL[item.scale] ?? item.scale;
    return (
      <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1D1D1D' }}>{item.name}</Text>
              <View style={{ backgroundColor: statusColor + '22', borderWidth: 1, borderColor: statusColor, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ fontSize: 9, color: statusColor, fontWeight: '700' }}>{statusLabel}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, color: '#1D3B5E' }}>{item.industry}</Text>
              </View>
              <View style={{ backgroundColor: '#F5F0E8', paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, color: '#6a4a10' }}>{scaleLabel}企业</Text>
              </View>
              <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, color: '#1a4a2e' }}>月税 {item.taxContribution}万</Text>
              </View>
            </View>
          </View>
          {item.status === 'operating' && (
            <Pressable
              onPress={() => handleClose(item)}
              style={{ paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#C82829', marginLeft: 10 }}
            >
              <Text style={{ fontSize: 11, color: '#C82829' }}>关停</Text>
            </Pressable>
          )}
        </View>

        <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F0F0F0', flexDirection: 'row', gap: 16 }}>
          <View>
            <Text style={{ fontSize: 10, color: '#999' }}>投资金额</Text>
            <Text style={{ fontSize: 12, color: '#333', fontWeight: '600', marginTop: 2 }}>{item.investAmount}万元</Text>
          </View>
          <View>
            <Text style={{ fontSize: 10, color: '#999' }}>从业人数</Text>
            <Text style={{ fontSize: 12, color: '#333', fontWeight: '600', marginTop: 2 }}>{item.employeeCount}人</Text>
          </View>
          <View>
            <Text style={{ fontSize: 10, color: '#999' }}>引进月份</Text>
            <Text style={{ fontSize: 12, color: '#333', fontWeight: '600', marginTop: 2 }}>第{item.introducedMonth}月</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F7F7F5' }}>
      <StatusBar style="light" backgroundColor="#1D3B5E" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#1D3B5E', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>招商局</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>企业名单</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10 }}>共{enterprises.filter(e => e.status === 'operating').length}家运营</Text>
          <Text style={{ color: '#7eff9a', fontSize: 12, fontWeight: '700' }}>月税收 {totalTax}万</Text>
        </View>
      </View>

      {/* 筛选 Tab */}
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#DDD' }}>
        {([['all', '全部'], ['operating', '运营中'], ['closed', '已关停']] as ['all' | 'operating' | 'closed', string][]).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setFilter(key)}
            style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: filter === key ? '#1D3B5E' : 'transparent' }}
          >
            <Text style={{ fontSize: 13, color: filter === key ? '#1D3B5E' : '#888', fontWeight: filter === key ? '700' : '400' }}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#1D3B5E" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 14 }}
          contentInsetAdjustmentBehavior="automatic"
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Text style={{ fontSize: 32, marginBottom: 12 }}>🏢</Text>
              <Text style={{ fontSize: 14, color: '#888' }}>暂无企业</Text>
              <Text style={{ fontSize: 12, color: '#aaa', marginTop: 4, textAlign: 'center', paddingHorizontal: 24 }}>
                通过招商局的招商引资行动，每月自动引进企业
              </Text>
            </View>
          }
          ListHeaderComponent={
            enterprises.length > 0 ? (
              <View style={{ backgroundColor: '#FFF9E6', borderWidth: 1, borderColor: '#F0C050', padding: 12, marginBottom: 12 }}>
                <Text style={{ fontSize: 11, color: '#7A5C00', lineHeight: 18 }}>
                  📊 共引进企业 {enterprises.length} 家，其中运营中 {enterprises.filter(e => e.status === 'operating').length} 家。{'\n'}
                  月税收合计 {totalTax} 万元，每月自动入账城市资金。
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {toastMsg !== '' && (
        <View style={{ position: 'absolute', bottom: 48, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 6 }}>
          <Text style={{ color: '#fff', fontSize: 13 }}>{toastMsg}</Text>
        </View>
      )}
    </View>
  );
}
