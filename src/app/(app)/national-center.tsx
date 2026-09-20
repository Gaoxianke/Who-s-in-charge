// 国家中枢页面 — rank15（总执书记/华夏主席/中枢军委主席）专属
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { formatMoney, formatFund } from '@/types/game';

// 国家中枢权力行动
interface CentralAction {
  id: string;
  icon: string;
  category: string;
  title: string;
  desc: string;
  cost: number;
  meritReward: number;
  effects: { label: string; delta: number; key: string }[];
  cooldownDays: number;
}

const CENTRAL_ACTIONS: CentralAction[] = [
  // 党中央职权
  {
    id: 'politburo',    icon: '🏛️', category: '中枢政治局',
    title: '主持政治局常委会',
    desc: '召集中枢决策常委会议，审议重大国家政策，确立党的战略决策',
    cost: 0, meritReward: 60, cooldownDays: 30,
    effects: [{ label: 'GDP', delta: 2, key: 'cityGdp' }, { label: '民生', delta: 2, key: 'cityLivelihood' }],
  },
  {
    id: 'plenum',       icon: '📜', category: '中央全会',
    title: '召集中央全体会议',
    desc: '主持党的十九届（二十届）中央全会，研究部署国家重大发展战略',
    cost: 0, meritReward: 100, cooldownDays: 90,
    effects: [{ label: 'GDP', delta: 3, key: 'cityGdp' }, { label: '营商', delta: 3, key: 'cityBusiness' }],
  },
  {
    id: 'reform',       icon: '🔧', category: '全面深化改革',
    title: '部署全面深化改革',
    desc: '亲自主持改革部署，推动重点领域、关键环节改革向纵深发展',
    cost: 500, meritReward: 80, cooldownDays: 60,
    effects: [{ label: 'GDP', delta: 4, key: 'cityGdp' }, { label: '营商', delta: 4, key: 'cityBusiness' }, { label: '民生', delta: 2, key: 'cityLivelihood' }],
  },
  // 华夏主席职权
  {
    id: 'state_visit',  icon: '🌐', category: '华夏主席',
    title: '出访友好国家',
    desc: '以华夏主席身份对重要伙伴国进行国事访问，深化战略互信与合作',
    cost: 800, meritReward: 50, cooldownDays: 45,
    effects: [{ label: '营商', delta: 3, key: 'cityBusiness' }, { label: 'GDP', delta: 2, key: 'cityGdp' }],
  },
  {
    id: 'npc',          icon: '📋', category: '华夏主席',
    title: '主持全国议政院会议',
    desc: '主持全国议政院年度会议，发布政府工作报告，审议重大立法',
    cost: 0, meritReward: 70, cooldownDays: 365,
    effects: [{ label: '民生', delta: 3, key: 'cityLivelihood' }, { label: '营商', delta: 2, key: 'cityBusiness' }],
  },
  {
    id: 'special_law',  icon: '⚖️', category: '华夏主席',
    title: '颁布重大法律',
    desc: '签署发布重大法律法规，完善中国特色社会主义法治体系',
    cost: 0, meritReward: 45, cooldownDays: 60,
    effects: [{ label: '民生', delta: 2, key: 'cityLivelihood' }, { label: '生态', delta: 2, key: 'cityEcology' }],
  },
  // 中枢军委主席职权
  {
    id: 'mil_parade',   icon: '⚔️', category: '中枢军委主席',
    title: '主持阅兵式',
    desc: '以中枢军委主席身份主持重大军事阅兵，展示国家军事实力与决心',
    cost: 1500, meritReward: 90, cooldownDays: 180,
    effects: [{ label: '安全', delta: 8, key: 'securityIndex' }, { label: '政绩', delta: 30, key: 'meritPoints' }],
  },
  {
    id: 'mil_strategy', icon: '🛡️', category: '中枢军委主席',
    title: '下达军事战略部署',
    desc: '亲自部署国家军事战略，调整战备态势，提升战略威慑能力',
    cost: 2000, meritReward: 80, cooldownDays: 90,
    effects: [{ label: '安全', delta: 12, key: 'securityIndex' }],
  },
  {
    id: 'mil_modern',   icon: '🚀', category: '中枢军委主席',
    title: '推进军队现代化',
    desc: '亲自督促军队信息化、智能化建设，加速实现建军百年奋斗目标',
    cost: 1200, meritReward: 70, cooldownDays: 60,
    effects: [{ label: '安全', delta: 6, key: 'securityIndex' }, { label: 'GDP', delta: 1, key: 'cityGdp' }],
  },
  // 重大国家战略
  {
    id: 'rural_revit',  icon: '🌾', category: '国家战略',
    title: '乡村振兴战略部署',
    desc: '亲自部署乡村振兴重大举措，推动农业农村现代化高质量发展',
    cost: 600, meritReward: 55, cooldownDays: 90,
    effects: [{ label: '民生', delta: 5, key: 'cityLivelihood' }, { label: '生态', delta: 3, key: 'cityEcology' }],
  },
  {
    id: 'innovation',   icon: '💡', category: '国家战略',
    title: '科技强国部署',
    desc: '主持科技体制改革，确立科技强国战略，推动关键核心技术攻关',
    cost: 1000, meritReward: 65, cooldownDays: 120,
    effects: [{ label: 'GDP', delta: 5, key: 'cityGdp' }, { label: '营商', delta: 3, key: 'cityBusiness' }],
  },
  {
    id: 'ecology_civ',  icon: '🌿', category: '国家战略',
    title: '生态文明建设',
    desc: '亲自部署绿色发展战略，确立碳达峰碳中和目标，引领全球气候治理',
    cost: 400, meritReward: 45, cooldownDays: 90,
    effects: [{ label: '生态', delta: 6, key: 'cityEcology' }, { label: '营商', delta: 2, key: 'cityBusiness' }],
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  '中枢政治局': '#2B4B6F',
  '中央全会':   '#2B4B6F',
  '全面深化改革': '#2a7a3b',
  '华夏主席':   '#7B5E2A',
  '中枢军委主席':   '#5C0000',
  '国家战略':   '#1a4a6e',
};

export default function NationalCenterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, isLoading, updateGameSave } = useGame();
  const [acting, setActing] = useState(false);
  const [result, setResult] = useState('');
  const [actionDays, setActionDays] = useState<Record<string, number>>({});
  const [activeCategory, setActiveCategory] = useState('中枢政治局');

  if (isLoading || !save) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color="#1D3B5E" /></View>;
  }
  if (save.rankLevel < 15) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#0D1F35' }}>
        <Text style={{ fontSize: 36, marginBottom: 14 }}>🏛️</Text>
        <Text style={{ fontSize: 15, color: '#a0b4cc', textAlign: 'center' }}>
          晋升至总执书记/华夏主席（级别15）后可访问国家中枢
        </Text>
      </View>
    );
  }

  const categories = [...new Set(CENTRAL_ACTIONS.map(a => a.category))];
  const filtered = CENTRAL_ACTIONS.filter(a => a.category === activeCategory);

  const handleAction = async (action: CentralAction) => {
    if (acting) return;
    const lastDay = actionDays[action.id] ?? 0;
    if (save.gameDays - lastDay < action.cooldownDays) {
      const remain = action.cooldownDays - (save.gameDays - lastDay);
      setResult(`⏳ ${action.title}冷却中，还需 ${remain} 天`);
      setTimeout(() => setResult(''), 2500);
      return;
    }
    if (action.cost > 0 && save.fundBalance < action.cost) {
      setResult(`⚠️ 专项经费不足，需 ¥${formatFund(action.cost)}`);
      setTimeout(() => setResult(''), 2500);
      return;
    }
    setActing(true);

    const patch: Record<string, number> = {
      meritPoints: save.meritPoints + action.meritReward,
      fundBalance: save.fundBalance - action.cost,
    };
    action.effects.forEach(e => {
      if (e.key === 'meritPoints') { patch.meritPoints = (patch.meritPoints ?? save.meritPoints) + e.delta; return; }
      const cur = (save as unknown as Record<string, number>)[e.key] ?? 0;
      patch[e.key] = Math.min(100, cur + e.delta);
    });
    await updateGameSave(patch as Parameters<typeof updateGameSave>[0]);

    setActionDays(prev => ({ ...prev, [action.id]: save.gameDays }));
    const effectStr = action.effects.map(e => `${e.label}+${e.delta}`).join(' ');
    setResult(`✅ ${action.title}完成 · 政绩+${action.meritReward} · ${effectStr}`);
    setActing(false);
    setTimeout(() => setResult(''), 4000);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0D1F35' }}>
      <StatusBar style="light" backgroundColor="#060F1A" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#060F1A', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: '#a0b4cc', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'rgba(200,220,255,0.4)', fontSize: 9, letterSpacing: 3 }}>中共中央 · 国家最高权力机构</Text>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>🏛️ 国家中枢</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: 'rgba(200,220,255,0.4)', fontSize: 9 }}>{save.rankName}</Text>
          <Text style={{ color: '#FFD700', fontWeight: '600', fontSize: 12 }}>{save.playerName}</Text>
        </View>
      </View>

      {/* 综合指标 */}
      <View style={{ flexDirection: 'row', backgroundColor: '#0D1F35', paddingVertical: 10, paddingHorizontal: 14, gap: 8 }}>
        {[
          { label: 'GDP', value: save.cityGdp, color: '#5BD8FF' },
          { label: '民生', value: save.cityLivelihood, color: '#4CAF50' },
          { label: '生态', value: save.cityEcology, color: '#66BB6A' },
          { label: '营商', value: save.cityBusiness, color: '#FFD700' },
          { label: '安全', value: save.securityIndex, color: '#FF7043' },
        ].map(item => (
          <View key={item.label} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: 'rgba(200,220,255,0.5)', fontSize: 8 }}>{item.label}</Text>
            <Text style={{ color: item.color, fontWeight: '700', fontSize: 13 }}>{item.value.toFixed(0)}</Text>
          </View>
        ))}
        <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <View style={{ flex: 1.5, alignItems: 'center' }}>
          <Text style={{ color: 'rgba(200,220,255,0.5)', fontSize: 8 }}>专项经费</Text>
          <Text style={{ color: '#FFD700', fontWeight: '700', fontSize: 11 }}>¥{formatFund(save.fundBalance)}</Text>
        </View>
      </View>

      {/* 分类Tab */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: '#111D2C', flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
        {categories.map(cat => (
          <Pressable
            key={cat}
            onPress={() => setActiveCategory(cat)}
            style={{
              paddingHorizontal: 12, paddingVertical: 6,
              backgroundColor: activeCategory === cat ? (CATEGORY_COLORS[cat] ?? '#2B4B6F') : 'transparent',
              borderWidth: 1,
              borderColor: activeCategory === cat ? (CATEGORY_COLORS[cat] ?? '#2B4B6F') : 'rgba(200,220,255,0.2)',
            }}
          >
            <Text style={{ fontSize: 11, color: activeCategory === cat ? '#fff' : 'rgba(200,220,255,0.6)', fontWeight: activeCategory === cat ? '700' : '400' }}>
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={{ padding: 14, gap: 10 }}>
          {filtered.map(action => {
            const lastDay = actionDays[action.id] ?? 0;
            const onCooldown = save.gameDays - lastDay < action.cooldownDays;
            const canAfford = action.cost === 0 || save.fundBalance >= action.cost;
            const canAct = !onCooldown && canAfford;
            const remain = action.cooldownDays - (save.gameDays - lastDay);

            return (
              <View key={action.id} style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <View style={{ padding: 14, gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                    <Text style={{ fontSize: 22 }}>{action.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>{action.title}</Text>
                        <View style={{ backgroundColor: 'rgba(255,215,0,0.15)', paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, color: '#FFD700' }}>政绩 +{action.meritReward}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 11, color: 'rgba(200,220,255,0.7)', lineHeight: 16, marginTop: 3 }}>{action.desc}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                    {action.effects.map(e => (
                      <View key={e.key} style={{ backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, color: 'rgba(200,220,255,0.8)' }}>{e.label} +{e.delta}</Text>
                      </View>
                    ))}
                    {action.cost > 0 && (
                      <View style={{ backgroundColor: 'rgba(255,215,0,0.1)', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, color: '#FFD700' }}>¥{formatFund(action.cost)}</Text>
                      </View>
                    )}
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 9, color: 'rgba(200,220,255,0.5)' }}>冷却 {action.cooldownDays}天</Text>
                    </View>
                  </View>
                </View>
                <Pressable
                  onPress={() => handleAction(action)}
                  disabled={!canAct || acting}
                  style={{
                    backgroundColor: canAct
                      ? (CATEGORY_COLORS[action.category] ?? '#2B4B6F')
                      : 'rgba(255,255,255,0.08)',
                    paddingVertical: 11, alignItems: 'center',
                  }}
                >
                  <Text style={{ color: canAct ? '#fff' : 'rgba(200,220,255,0.4)', fontWeight: '700', fontSize: 12 }}>
                    {acting ? '执行中…'
                      : onCooldown ? `⏳ 冷却中（剩余 ${remain} 天）`
                      : !canAfford ? '⚠️ 经费不足'
                      : `▶ 执行：${action.title}`}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>

      {!!result && (
        <View style={{ position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: 'rgba(6,15,26,0.95)', padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' }}>
          <Text style={{ color: '#FFD700', fontWeight: '700', fontSize: 13 }}>{result}</Text>
        </View>
      )}
    </View>
  );
}
