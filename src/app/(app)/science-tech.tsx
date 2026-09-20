// 科技委页面 — rank13+解锁，科技投入 → 研发方向 → 成果转化 → 国力提升
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { formatMoney, formatFund } from '@/types/game';

interface ResearchDir {
  id: string;
  icon: string;
  name: string;
  desc: string;
  cost: number;         // 每次投入消耗资金（万元）
  progressPerAct: number;
  gdpBonus: number;
  businessBonus: number;
  ecologyBonus: number;
  meritReward: number;
}

const RESEARCH_DIRS: ResearchDir[] = [
  { id: 'ai',       icon: '🤖', name: '人工智能与大数据',   desc: '发展AI算法、算力基础设施，推动数字经济高质量发展',        cost: 500,  progressPerAct: 12, gdpBonus: 3, businessBonus: 4, ecologyBonus: 0, meritReward: 20 },
  { id: 'space',    icon: '🚀', name: '航天与深空探测',     desc: '推进载人航天、月球探测及深空探测任务，彰显国家战略实力',   cost: 800,  progressPerAct: 8,  gdpBonus: 2, businessBonus: 2, ecologyBonus: 0, meritReward: 30 },
  { id: 'bio',      icon: '🧬', name: '生物医药与生命科学', desc: '攻关核心医药技术，提升医疗卫生保障水平与生物安全能力',     cost: 400,  progressPerAct: 15, gdpBonus: 1, businessBonus: 2, ecologyBonus: 2, meritReward: 18 },
  { id: 'energy',   icon: '⚡', name: '新能源与氢能技术',   desc: '加速光伏、风电、氢能产业化，推动能源结构绿色低碳转型',    cost: 350,  progressPerAct: 14, gdpBonus: 2, businessBonus: 1, ecologyBonus: 5, meritReward: 16 },
  { id: 'chip',     icon: '💻', name: '芯片与集成电路',     desc: '突破卡脖子技术，打造自主可控的芯片产业生态',              cost: 600,  progressPerAct: 10, gdpBonus: 4, businessBonus: 3, ecologyBonus: 0, meritReward: 25 },
  { id: 'quantum',  icon: '⚛️', name: '量子科技',           desc: '推进量子通信、量子计算等前沿技术，保障国家信息安全',       cost: 700,  progressPerAct: 9,  gdpBonus: 2, businessBonus: 2, ecologyBonus: 0, meritReward: 28 },
  { id: 'ocean',    icon: '🌊', name: '海洋科技',           desc: '发展深海探测、海洋资源开发技术，维护海洋权益',            cost: 450,  progressPerAct: 12, gdpBonus: 2, businessBonus: 2, ecologyBonus: 3, meritReward: 18 },
  { id: 'agri',     icon: '🌾', name: '农业生物技术',       desc: '培育高产优质品种，保障国家粮食安全底线',                  cost: 280,  progressPerAct: 16, gdpBonus: 1, businessBonus: 1, ecologyBonus: 2, meritReward: 14 },
];

export default function SciTechScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, isLoading, updateGameSave } = useGame();
  const [acting, setActing] = useState(false);
  const [result, setResult] = useState('');
  const [selectedDir, setSelectedDir] = useState<string | null>(null);

  if (isLoading || !save) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color="#1D3B5E" /></View>;
  }
  if (save.rankLevel < 13) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F7F7F5' }}>
        <Text style={{ fontSize: 32, marginBottom: 12 }}>🔬</Text>
        <Text style={{ fontSize: 15, color: '#888', textAlign: 'center' }}>晋升至国政院副院理（级别13）后解锁科技委职权</Text>
      </View>
    );
  }

  const currentDir = RESEARCH_DIRS.find(d => d.id === save.sciTechResearchDir);
  const progress = save.sciTechProgress ?? 0;
  const isConvertible = progress >= 100;

  const handleSelectDir = async (dir: ResearchDir) => {
    if (acting) return;
    if (save.sciTechResearchDir === dir.id) { setSelectedDir(dir.id); return; }
    // 切换研发方向时重置进度
    setActing(true);
    await updateGameSave({ sciTechResearchDir: dir.id, sciTechProgress: 0 });
    setSelectedDir(dir.id);
    setResult(`📐 已切换研发方向：${dir.name}`);
    setActing(false);
    setTimeout(() => setResult(''), 2500);
  };

  const handleInvest = async () => {
    if (acting || !currentDir) return;
    const cost = currentDir.cost * 10000; // 万元 → 元单位
    if (save.fundBalance < currentDir.cost) {
      setResult(`⚠️ 专项经费不足，需 ¥${formatMoney(cost)}`);
      setTimeout(() => setResult(''), 2500);
      return;
    }
    setActing(true);
    const newProgress = Math.min(100, progress + currentDir.progressPerAct);
    await updateGameSave({
      fundBalance: save.fundBalance - currentDir.cost,
      sciTechInvestTotal: (save.sciTechInvestTotal ?? 0) + currentDir.cost,
      sciTechProgress: newProgress,
      sciTechLastActDay: save.gameDays,
      meritPoints: save.meritPoints + currentDir.meritReward,
    });
    setResult(`✅ 投入 ¥${formatMoney(cost)}，研发进度 +${currentDir.progressPerAct}%，政绩 +${currentDir.meritReward}`);
    setActing(false);
    setTimeout(() => setResult(''), 3000);
  };

  const handleConvert = async () => {
    if (acting || !currentDir || !isConvertible) return;
    setActing(true);
    await updateGameSave({
      sciTechProgress: 0,
      cityGdp: Math.min(100, save.cityGdp + currentDir.gdpBonus),
      cityBusiness: Math.min(100, save.cityBusiness + currentDir.businessBonus),
      cityEcology: Math.min(100, save.cityEcology + currentDir.ecologyBonus),
      meritPoints: save.meritPoints + 50,
    });
    setResult(`🎉 成果转化完成！GDP+${currentDir.gdpBonus} 营商+${currentDir.businessBonus} 生态+${currentDir.ecologyBonus} 政绩+50`);
    setActing(false);
    setTimeout(() => setResult(''), 4000);
  };

  const totalInvest = save.sciTechInvestTotal ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F4F0' }}>
      <StatusBar style="light" backgroundColor="#0D2137" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#0D2137', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: '#aac', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, letterSpacing: 3 }}>国家科学技术委员会</Text>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>🔬 科技强国战略</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9 }}>总投入</Text>
          <Text style={{ color: '#5BD8FF', fontWeight: '700', fontSize: 13 }}>¥{formatFund(totalInvest)}</Text>
        </View>
      </View>

      {/* 状态栏 */}
      <View style={{ flexDirection: 'row', backgroundColor: '#1D3B5E', paddingVertical: 10, paddingHorizontal: 14, gap: 10 }}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ color: '#a0b4cc', fontSize: 9 }}>专项经费</Text>
          <Text style={{ color: '#FFD700', fontWeight: '700', fontSize: 13 }}>¥{formatFund(save.fundBalance)}万</Text>
        </View>
        <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
        <View style={{ flex: 2, alignItems: 'center' }}>
          <Text style={{ color: '#a0b4cc', fontSize: 9 }}>当前研发方向</Text>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }} numberOfLines={1}>
            {currentDir ? `${currentDir.icon} ${currentDir.name}` : '— 请选择研发方向 —'}
          </Text>
        </View>
        <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ color: '#a0b4cc', fontSize: 9 }}>研发进度</Text>
          <Text style={{ color: isConvertible ? '#4CAF50' : '#5BD8FF', fontWeight: '700', fontSize: 13 }}>
            {progress}%{isConvertible ? ' ✅' : ''}
          </Text>
        </View>
      </View>

      <ScrollView contentInsetAdjustmentBehavior="automatic">

        {/* 进度条 + 操作按钮 */}
        {currentDir && (
          <View style={{ margin: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#D0D8E0', padding: 14, gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D3B5E' }}>{currentDir.icon} {currentDir.name}</Text>
              <Text style={{ fontSize: 11, color: '#888' }}>每次 ¥{formatFund(currentDir.cost)}</Text>
            </View>
            <Text style={{ fontSize: 11, color: '#666', lineHeight: 16 }}>{currentDir.desc}</Text>
            {/* 进度条 */}
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 10, color: '#888' }}>研发进度</Text>
                <Text style={{ fontSize: 10, color: '#1D3B5E', fontWeight: '700' }}>{progress} / 100</Text>
              </View>
              <View style={{ height: 8, backgroundColor: '#E0E8F0', borderRadius: 4 }}>
                <View style={{ width: `${progress}%`, height: 8, backgroundColor: isConvertible ? '#2a7a3b' : '#1D6EA8', borderRadius: 4 }} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
              {currentDir.gdpBonus > 0 && <View style={{ backgroundColor: '#EEF4FF', paddingHorizontal: 7, paddingVertical: 3 }}><Text style={{ fontSize: 9, color: '#1D3B5E' }}>成果：GDP +{currentDir.gdpBonus}</Text></View>}
              {currentDir.businessBonus > 0 && <View style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 7, paddingVertical: 3 }}><Text style={{ fontSize: 9, color: '#7B5E2A' }}>营商 +{currentDir.businessBonus}</Text></View>}
              {currentDir.ecologyBonus > 0 && <View style={{ backgroundColor: '#F0FAF0', paddingHorizontal: 7, paddingVertical: 3 }}><Text style={{ fontSize: 9, color: '#2a7a3b' }}>生态 +{currentDir.ecologyBonus}</Text></View>}
              <View style={{ backgroundColor: '#FFF0F0', paddingHorizontal: 7, paddingVertical: 3 }}><Text style={{ fontSize: 9, color: '#C82829' }}>政绩 +{currentDir.meritReward}/次</Text></View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Pressable
                onPress={handleInvest}
                disabled={acting || save.fundBalance < currentDir.cost || isConvertible}
                style={{ flex: 1, backgroundColor: isConvertible ? '#ccc' : (save.fundBalance >= currentDir.cost ? '#1D3B5E' : '#aaa'), paddingVertical: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
                  {acting ? '投入中…' : isConvertible ? '已完成研发' : '💰 投入研发经费'}
                </Text>
              </Pressable>
              {isConvertible && (
                <Pressable
                  onPress={handleConvert}
                  disabled={acting}
                  style={{ flex: 1, backgroundColor: '#2a7a3b', paddingVertical: 10, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>🚀 成果转化</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* 研发方向选择 */}
        <View style={{ paddingHorizontal: 14 }}>
          <Text style={{ fontSize: 11, color: '#888', fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>选择研发方向</Text>
          <View style={{ gap: 8 }}>
            {RESEARCH_DIRS.map(dir => {
              const isActive = save.sciTechResearchDir === dir.id;
              return (
                <Pressable
                  key={dir.id}
                  onPress={() => handleSelectDir(dir)}
                  style={{
                    backgroundColor: isActive ? '#EEF4FF' : '#fff',
                    borderWidth: isActive ? 1.5 : 1,
                    borderColor: isActive ? '#1D6EA8' : '#D8D8D8',
                    padding: 12,
                    flexDirection: 'row',
                    gap: 10,
                    alignItems: 'flex-start',
                  }}
                >
                  <Text style={{ fontSize: 22, width: 28, textAlign: 'center' }}>{dir.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: isActive ? '#1D3B5E' : '#333' }}>{dir.name}</Text>
                      {isActive && <View style={{ backgroundColor: '#1D3B5E', paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 9, color: '#fff' }}>当前方向</Text></View>}
                    </View>
                    <Text style={{ fontSize: 10, color: '#777', lineHeight: 15, marginTop: 2 }}>{dir.desc}</Text>
                    <Text style={{ fontSize: 10, color: '#C82829', marginTop: 3 }}>每次投入 ¥{formatFund(dir.cost)} · 政绩 +{dir.meritReward}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 说明 */}
        <View style={{ margin: 14, backgroundColor: '#F0F4F8', padding: 12, borderLeftWidth: 3, borderLeftColor: '#1D3B5E' }}>
          <Text style={{ fontSize: 11, color: '#555', lineHeight: 17 }}>
            {'科技强国路线：选定研发方向 → 持续投入经费（每次+进度）→ 进度达100%后可「成果转化」提升国家综合实力指标。切换方向将清零当前进度。'}
          </Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* 反馈条 */}
      {!!result && (
        <View style={{ position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: '#0D2137', padding: 12, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{result}</Text>
        </View>
      )}
    </View>
  );
}
