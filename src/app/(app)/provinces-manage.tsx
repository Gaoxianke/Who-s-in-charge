// 各省直辖市管理页 — rank14 国政院院理专属
// 功能：全国31个省/直辖市/自治区 GDP/税收/民生/人口/走访
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { formatMoney } from '@/types/game';

// 省级数据（参考2023年各省GDP/税收/民生现实数据，游戏单位：亿元）
interface Province {
  id: string;
  name: string;
  abbr: string;
  type: '省份' | '直辖市' | '自治区' | '特别行政区';
  gdp: number;        // GDP（亿元）
  taxRevenue: number; // 税收（亿元）
  livelihood: number; // 民生指数（0-100）
  population: number; // 人口（万人）
  secretary: string;  // 省委书记
  governor: string;   // 省长/市长
  icon: string;
}

const PROVINCES: Province[] = [
  { id: 'gd', name: '广东省', abbr: '粤', type: '省份', gdp: 135673, taxRevenue: 19823, livelihood: 78, population: 12709, secretary: '黄坤明', governor: '王伟中', icon: '🌺' },
  { id: 'js', name: '江苏省', abbr: '苏', type: '省份', gdp: 122875, taxRevenue: 16588, livelihood: 82, population: 8515,  secretary: '信长星', governor: '许昆林', icon: '🌾' },
  { id: 'sd', name: '山东省', abbr: '鲁', type: '省份', gdp: 92069,  taxRevenue: 10253, livelihood: 75, population: 10162, secretary: '林武',  governor: '周乃翔', icon: '⛵' },
  { id: 'zj', name: '浙江省', abbr: '浙', type: '省份', gdp: 82553,  taxRevenue: 12987, livelihood: 85, population: 6577,  secretary: '易炼红', governor: '王浩',   icon: '🍵' },
  { id: 'sh', name: '上海市', abbr: '沪', type: '直辖市', gdp: 47218, taxRevenue: 11233, livelihood: 90, population: 2489,  secretary: '陈吉宁', governor: '龚正',   icon: '🏙️' },
  { id: 'he', name: '河南省', abbr: '豫', type: '省份', gdp: 61345,  taxRevenue: 7821,  livelihood: 68, population: 9872,  secretary: '楼阳生', governor: '王凯',   icon: '🌽' },
  { id: 'sc', name: '四川省', abbr: '川', type: '省份', gdp: 60132,  taxRevenue: 8765,  livelihood: 73, population: 8374,  secretary: '王晓晖', governor: '黄强',   icon: '🐼' },
  { id: 'hb', name: '湖北省', abbr: '鄂', type: '省份', gdp: 55803,  taxRevenue: 7234,  livelihood: 74, population: 5775,  secretary: '王蒙徽', governor: '王忠林', icon: '🌸' },
  { id: 'fx', name: '福建省', abbr: '闽', type: '省份', gdp: 53109,  taxRevenue: 7123,  livelihood: 80, population: 4187,  secretary: '周祖翼', governor: '赵龙',   icon: '🌊' },
  { id: 'bj', name: '北京市', abbr: '京', type: '直辖市', gdp: 43760, taxRevenue: 13542, livelihood: 88, population: 2185,  secretary: '尹力',   governor: '殷勇',   icon: '🏯' },
  { id: 'hn', name: '湖南省', abbr: '湘', type: '省份', gdp: 50012,  taxRevenue: 6543,  livelihood: 72, population: 6604,  secretary: '沈晓明', governor: '毛伟明', icon: '🏔️' },
  { id: 'ah', name: '安徽省', abbr: '皖', type: '省份', gdp: 47443,  taxRevenue: 6012,  livelihood: 71, population: 6213,  secretary: '梁言顺', governor: '王清宪', icon: '🌿' },
  { id: 'sx', name: '陕西省', abbr: '陕', type: '省份', gdp: 33786,  taxRevenue: 4523,  livelihood: 70, population: 3952,  secretary: '赵一德', governor: '赵刚',   icon: '🏺' },
  { id: 'gz', name: '贵州省', abbr: '黔', type: '省份', gdp: 20164,  taxRevenue: 2765,  livelihood: 65, population: 3856,  secretary: '徐麟',   governor: '李炳军', icon: '🌄' },
  { id: 'yn', name: '云南省', abbr: '滇', type: '省份', gdp: 29514,  taxRevenue: 3987,  livelihood: 67, population: 4694,  secretary: '王宁',   governor: '王予波', icon: '🌻' },
  { id: 'jx', name: '江西省', abbr: '赣', type: '省份', gdp: 32200,  taxRevenue: 4012,  livelihood: 70, population: 4517,  secretary: '尹弘',   governor: '叶建春', icon: '🌹' },
  { id: 'cq', name: '重庆市', abbr: '渝', type: '直辖市', gdp: 29129, taxRevenue: 3965,  livelihood: 76, population: 3213,  secretary: '袁家军', governor: '胡衡华', icon: '🌉' },
  { id: 'ln', name: '辽宁省', abbr: '辽', type: '省份', gdp: 30423,  taxRevenue: 3876,  livelihood: 68, population: 4197,  secretary: '郝鹏',   governor: '李乐成', icon: '❄️' },
  { id: 'hei', name: '黑龙江省', abbr: '黑', type: '省份', gdp: 15883, taxRevenue: 1876, livelihood: 62, population: 3099, secretary: '许勤',   governor: '梁惠玲', icon: '🌲' },
  { id: 'jl', name: '吉林省', abbr: '吉', type: '省份', gdp: 13092,  taxRevenue: 1654,  livelihood: 63, population: 2375,  secretary: '景俊海', governor: '胡玉亭', icon: '🌾' },
  { id: 'shanxi', name: '山西省', abbr: '晋', type: '省份', gdp: 25643, taxRevenue: 4321, livelihood: 67, population: 3491, secretary: '任振鹤', governor: '金湘军', icon: '⛏️' },
  { id: 'xj', name: '新疆维吾尔自治区', abbr: '新', type: '自治区', gdp: 17717, taxRevenue: 2354, livelihood: 64, population: 2585, secretary: '马兴瑞', governor: '艾尔肯', icon: '🏜️' },
  { id: 'nm', name: '内蒙古自治区', abbr: '内蒙', type: '自治区', gdp: 24627, taxRevenue: 3198, livelihood: 66, population: 2400, secretary: '孙绍骋', governor: '王莉霞', icon: '🐎' },
  { id: 'gs', name: '甘肃省', abbr: '甘', type: '省份', gdp: 11201,  taxRevenue: 1543,  livelihood: 59, population: 2492,  secretary: '胡昌升', governor: '刘小明', icon: '🌵' },
  { id: 'hainan', name: '海南省', abbr: '琼', type: '省份', gdp: 7553,  taxRevenue: 987,   livelihood: 74, population: 1027,  secretary: '冯飞',   governor: '刘小明', icon: '🌴' },
  { id: 'qh', name: '青海省', abbr: '青', type: '省份', gdp: 3799,   taxRevenue: 567,   livelihood: 60, population: 592,   secretary: '陈刚',   governor: '吴晓军', icon: '🦅' },
  { id: 'nx', name: '宁夏回族自治区', abbr: '宁', type: '自治区', gdp: 5315, taxRevenue: 789, livelihood: 62, population: 725, secretary: '张雨浦', governor: '张超超', icon: '🕌' },
  { id: 'xz', name: '西藏自治区', abbr: '藏', type: '自治区', gdp: 2392, taxRevenue: 289, livelihood: 58, population: 364, secretary: '王君正', governor: '严金海', icon: '🏔️' },
  { id: 'gx', name: '广西壮族自治区', abbr: '桂', type: '自治区', gdp: 26898, taxRevenue: 3456, livelihood: 68, population: 5045, secretary: '刘宁', governor: '蓝天立', icon: '🌊' },
  { id: 'tj', name: '天津市', abbr: '津', type: '直辖市', gdp: 16311, taxRevenue: 2876, livelihood: 80, population: 1386, secretary: '陈敏尔', governor: '张工', icon: '⚓' },
  { id: 'hebei', name: '河北省', abbr: '冀', type: '省份', gdp: 42370, taxRevenue: 5012, livelihood: 70, population: 7447, secretary: '倪岳峰', governor: '王正谱', icon: '🌾' },
];

const TYPE_COLORS: Record<string, string> = {
  '省份': '#2B4B6F', '直辖市': '#C82829', '自治区': '#2a7a3b', '特别行政区': '#7B5E2A',
};

// 走访任务
const VISIT_TASKS = [
  { id: 'v1', label: '经济调研考察', desc: '深入企业和产业园区，了解发展实情', meritReward: 20, gdpBonus: 3,  cost: 50000 },
  { id: 'v2', label: '民生专项慰问', desc: '走访基层群众，了解民生诉求',       meritReward: 15, livBonus: 4,   cost: 30000 },
  { id: 'v3', label: '重大项目督导', desc: '现场督导重大项目推进情况',         meritReward: 25, gdpBonus: 5,  cost: 80000 },
  { id: 'v4', label: '干部廉政谈话', desc: '与省委班子开展廉政专题谈话',       meritReward: 12, intBonus: 3,   cost: 20000 },
];

export default function ProvincesManageScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
  const [sortBy, setSortBy] = useState<'gdp' | 'taxRevenue' | 'livelihood' | 'population'>('gdp');
  const [typeFilter, setTypeFilter] = useState<string>('全部');
  const [acting, setActing] = useState(false);
  const [result, setResult] = useState('');
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());

  if (!save || save.rankLevel < 14) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F4F1', padding: 24 }}>
        <Text style={{ fontSize: 32, marginBottom: 12 }}>🗺️</Text>
        <Text style={{ fontSize: 14, color: '#888', textAlign: 'center' }}>晋升至国政院院理（级别14）后解锁各省管理</Text>
      </View>
    );
  }

  const filtered = PROVINCES
    .filter(p => typeFilter === '全部' || p.type === typeFilter)
    .sort((a, b) => b[sortBy] - a[sortBy]);

  const totalGdp = PROVINCES.reduce((s, p) => s + p.gdp, 0);
  const totalTax = PROVINCES.reduce((s, p) => s + p.taxRevenue, 0);
  const avgLiv = Math.round(PROVINCES.reduce((s, p) => s + p.livelihood, 0) / PROVINCES.length);
  const totalPop = Math.round(PROVINCES.reduce((s, p) => s + p.population, 0) / 10000);

  const handleVisit = async (province: Province, task: typeof VISIT_TASKS[0]) => {
    const key = `${province.id}_${task.id}`;
    if (acting || (save?.fundBalance ?? 0) < task.cost || visitedIds.has(key)) return;
    setActing(true);
    const patch: Record<string, unknown> = {
      fundBalance: (save?.fundBalance ?? 0) - task.cost,
      meritPoints: (save?.meritPoints ?? 0) + task.meritReward,
    };
    await updateGameSave(patch as Parameters<typeof updateGameSave>[0]);
    setVisitedIds(prev => new Set(prev).add(key));
    setResult(`✅ 走访${province.name}「${task.label}」完成 · 政绩+${task.meritReward}`);
    setActing(false);
    setTimeout(() => setResult(''), 3000);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F4F0' }}>
      <StatusBar style="light" backgroundColor="#1D3B5E" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#1D3B5E', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: '#a0b4cc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(160,180,204,0.7)', fontSize: 9, letterSpacing: 3 }}>国政院 · 地方管理</Text>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>🗺️ 各省直辖市管理</Text>
            <Text style={{ color: 'rgba(160,180,204,0.8)', fontSize: 11, marginTop: 2 }}>
              {save.playerName} · 全国 31 个省级行政区
            </Text>
          </View>
        </View>

        {/* 全国汇总 */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {[
            { label: '全国GDP', value: `${(totalGdp / 10000).toFixed(0)}万亿`, color: '#FFD700' },
            { label: '全国税收', value: `${(totalTax / 10000).toFixed(1)}万亿`, color: '#7EC8E3' },
            { label: '民生均值', value: `${avgLiv}分`,  color: '#90EE90' },
            { label: '总人口',   value: `${totalPop}亿`, color: '#FFB6C1' },
          ].map(s => (
            <View key={s.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', padding: 8, alignItems: 'center' }}>
              <Text style={{ color: s.color, fontWeight: '700', fontSize: 13 }}>{s.value}</Text>
              <Text style={{ color: 'rgba(200,220,255,0.7)', fontSize: 9, marginTop: 1 }}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 排序 & 筛选 */}
      <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8E8E8' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10, paddingVertical: 8, gap: 6 }}>
          {(['全部', '省份', '直辖市', '自治区'] as const).map(t => (
            <Pressable
              key={t}
              onPress={() => setTypeFilter(t)}
              style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: typeFilter === t ? '#1D3B5E' : '#F0F4F8' }}
            >
              <Text style={{ fontSize: 11, color: typeFilter === t ? '#fff' : '#555', fontWeight: typeFilter === t ? '700' : '400' }}>{t}</Text>
            </Pressable>
          ))}
          <View style={{ width: 1, backgroundColor: '#EEE', marginHorizontal: 4 }} />
          <Text style={{ fontSize: 10, color: '#888', alignSelf: 'center' }}>排序：</Text>
          {([['gdp','GDP'], ['taxRevenue','税收'], ['livelihood','民生'], ['population','人口']] as const).map(([k, l]) => (
            <Pressable
              key={k}
              onPress={() => setSortBy(k as typeof sortBy)}
              style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: sortBy === k ? '#C82829' : '#F0F4F8' }}
            >
              <Text style={{ fontSize: 11, color: sortBy === k ? '#fff' : '#555' }}>{l}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 10, gap: 8 }}
        renderItem={({ item, index }) => {
          const isSelected = selectedProvince?.id === item.id;
          const typeColor = TYPE_COLORS[item.type] ?? '#888';
          const livColor = item.livelihood >= 80 ? '#2a7a3b' : item.livelihood >= 65 ? '#7B5E2A' : '#C82829';
          const remittance = Math.round(item.taxRevenue * 0.6);
          return (
            <Pressable
              onPress={() => setSelectedProvince(isSelected ? null : item)}
              style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: isSelected ? '#1D3B5E' : '#DDD' }}
            >
              {/* 基础信息行 */}
              <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 36, height: 36, backgroundColor: typeColor + '18', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: typeColor }}>
                  <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 6, fontWeight: '700', color: '#888', marginRight: 2 }}>#{index + 1}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#111' }}>{item.name}</Text>
                    <View style={{ backgroundColor: typeColor, paddingHorizontal: 4, paddingVertical: 1 }}>
                      <Text style={{ fontSize: 8, color: '#fff' }}>{item.type}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 10, color: '#888', marginTop: 1 }}>书记：{item.secretary} · 省长：{item.governor}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 3 }}>
                  <Text style={{ fontSize: 12, color: '#2B4B6F', fontWeight: '700' }}>GDP {(item.gdp / 10000).toFixed(1)}万亿</Text>
                  <View style={{ backgroundColor: livColor + '18', borderWidth: 1, borderColor: livColor, paddingHorizontal: 5, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 9, color: livColor, fontWeight: '700' }}>民生{item.livelihood}</Text>
                  </View>
                </View>
              </View>

              {/* 数据概览行 */}
              <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F5F5F5', paddingHorizontal: 10, paddingVertical: 8, gap: 6 }}>
                {[
                  { label: '税收',    value: `${(item.taxRevenue / 10000).toFixed(2)}万亿` },
                  { label: '上缴中央',value: `${(remittance / 10000).toFixed(2)}万亿`,    special: true },
                  { label: '人口',    value: `${item.population}万` },
                ].map(d => (
                  <View key={d.label} style={{ flex: 1, alignItems: 'center', backgroundColor: d.special ? '#FFF5E6' : '#F8F8F8', paddingVertical: 5 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: d.special ? '#C82829' : '#333' }}>{d.value}</Text>
                    <Text style={{ fontSize: 9, color: '#888', marginTop: 1 }}>{d.label}</Text>
                  </View>
                ))}
              </View>

              {/* 展开：走访功能 */}
              {isSelected && (
                <View style={{ borderTopWidth: 1, borderTopColor: '#EEE', padding: 12, gap: 8 }}>
                  <View style={{ backgroundColor: '#1D3B5E', padding: 10 }}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>🚁 走访 · {item.name}</Text>
                    <Text style={{ color: 'rgba(180,210,255,0.8)', fontSize: 10, marginTop: 2 }}>
                      当前经费：¥{formatMoney(save.fundBalance)}
                    </Text>
                  </View>
                  {VISIT_TASKS.map(task => {
                    const key = `${item.id}_${task.id}`;
                    const done = visitedIds.has(key);
                    const canDo = (save.fundBalance ?? 0) >= task.cost && !done;
                    return (
                      <View key={task.id} style={{ backgroundColor: done ? '#F0FAF0' : '#FAFAFA', borderWidth: 1, borderColor: done ? '#2a7a3b' : '#DDD', padding: 10 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: done ? '#2a7a3b' : '#222' }}>{task.label}</Text>
                            <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{task.desc}</Text>
                            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                              <Text style={{ fontSize: 9, color: '#7B5E2A', backgroundColor: '#FFF9E6', paddingHorizontal: 5, paddingVertical: 1 }}>
                                费用 ¥{formatMoney(task.cost)}
                              </Text>
                              <Text style={{ fontSize: 9, color: '#2a7a3b', backgroundColor: '#F0FAF0', paddingHorizontal: 5, paddingVertical: 1 }}>
                                +{task.meritReward}政绩
                              </Text>
                            </View>
                          </View>
                          {done ? (
                            <View style={{ backgroundColor: '#2a7a3b', paddingHorizontal: 6, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>已完成</Text>
                            </View>
                          ) : (
                            <Pressable
                              onPress={() => void handleVisit(item, task)}
                              disabled={!canDo || acting}
                              style={{ backgroundColor: canDo ? '#1D3B5E' : '#CCC', paddingHorizontal: 10, paddingVertical: 6 }}
                            >
                              <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>
                                {acting ? '…' : canDo ? '▶ 走访' : '经费不足'}
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </Pressable>
          );
        }}
      />

      {!!result && (
        <View style={{ position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: '#1D3B5E', padding: 12, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{result}</Text>
        </View>
      )}
    </View>
  );
}
