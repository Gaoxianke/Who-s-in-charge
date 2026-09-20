// 晋升页·晋升记录 Tab（展示 promo_log）
import { ScrollView, Text, View } from 'react-native';
import { useGame } from '@/ctx/GameContext';

export function RecordsTab() {
  const { save } = useGame();
  if (!save) return null;
  const logs = save.promo_log ?? [];
  return (
    <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }}>
      <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 14 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D3B5E', letterSpacing: 2, marginBottom: 10 }}>晋升记录</Text>
        {logs.length === 0 ? (
          <Text style={{ fontSize: 12, color: '#aaa', textAlign: 'center', paddingVertical: 20 }}>暂无记录</Text>
        ) : (
          logs.map((log, i) => (
            <View key={i} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: log.type === 'lost' ? '#C82829' : '#2a7a3b' }}>
                  {log.type === 'promote' ? '晋升' : log.type === 'break' ? '破格晋升' : '落选'}
                </Text>
                <Text style={{ fontSize: 10, color: '#aaa' }}>{log.docNo}</Text>
              </View>
              <Text style={{ fontSize: 11, color: '#666', marginTop: 3 }}>
                {log.postName} · 第{log.fromRank}级 → 第{log.toRank}级
              </Text>
              {log.note ? <Text style={{ fontSize: 10, color: '#999', marginTop: 2 }}>{log.note}</Text> : null}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}