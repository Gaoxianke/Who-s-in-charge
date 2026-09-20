// 公安局管理页面
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getPoliceCases, solveCase, addNewCases } from '@/db/gameApi';
import type { PoliceCase } from '@/types/game';
import { StatBar } from '@/components/StatBar';

const CASE_TYPE_LABEL: Record<string, string> = {
  criminal: '刑事案件',
  corruption: '腐败案件',
  drug: '毒品案件',
  fraud: '诈骗案件',
};

const CASE_TYPE_COLOR: Record<string, string> = {
  criminal: '#1D2D44',
  corruption: '#C8102E',
  drug: '#6a1a6a',
  fraud: '#8B4513',
};

const SPECIAL_ACTIONS = [
  { key: 'sweep', label: '扫黑除恶', desc: '开展扫黑除恶专项行动，大幅提升治安指数', policeCost: 30, securityGain: 15, meritGain: 20, duration: '3个月' },
  { key: 'drug', label: '禁毒专项', desc: '开展禁毒专项整治，减少辖区毒品犯罪', policeCost: 25, securityGain: 12, meritGain: 15, duration: '2个月' },
  { key: 'patrol', label: '加强巡逻', desc: '增加日常巡逻频次，震慑犯罪行为', policeCost: 10, securityGain: 5, meritGain: 5, duration: '1个月' },
];

export default function PoliceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [cases, setCases] = useState<PoliceCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [activeTab, setActiveTab] = useState<'cases' | 'actions'>('cases');

  useFocusEffect(
    useCallback(() => {
      if (!save) return;
      setLoading(true);
      getPoliceCases(save.id).then(data => {
        setCases(data);
        setLoading(false);
      });
    }, [save])
  );

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3000);
  };

  const handleSolveCase = async (policeCase: PoliceCase) => {
    if (!save) return;
    if (save.policeForce < policeCase.requiredPolice) {
      showFeedback(`警力不足！本案需要 ${policeCase.requiredPolice} 警力，当前剩余 ${save.policeForce} 警力`);
      return;
    }

    // 破案成功率 = 公安局长能力影响 + 基础概率
    const successRate = 0.5 + (save.securityIndex / 200);
    const success = Math.random() < successRate;

    if (success) {
      await solveCase(policeCase.id, save.gameDays);
      const newPoliceForce = Math.max(0, save.policeForce - Math.floor(policeCase.requiredPolice * 0.5));
      const newSecurity = Math.min(100, save.securityIndex + policeCase.securityChange);
      const newMerit = save.meritPoints + policeCase.rewardMerit;
      const newLivelihood = Math.min(100, save.cityLivelihood + policeCase.securityChange * 0.3);
      await updateGameSave({
        policeForce: newPoliceForce,
        securityIndex: newSecurity,
        meritPoints: newMerit,
        cityLivelihood: newLivelihood,
      });
      showFeedback(`案件告破！治安+${policeCase.securityChange}，政绩+${policeCase.rewardMerit}`);
    } else {
      const newPoliceForce = Math.max(0, save.policeForce - policeCase.requiredPolice);
      await updateGameSave({ policeForce: newPoliceForce });
      showFeedback(`侦破失败，损失 ${policeCase.requiredPolice} 警力，请加强调查`);
    }

    getPoliceCases(save.id).then(setCases);
  };

  const handleSpecialAction = async (action: typeof SPECIAL_ACTIONS[0]) => {
    if (!save) return;
    if (save.policeForce < action.policeCost) {
      showFeedback(`警力不足！需要 ${action.policeCost} 警力，当前剩余 ${save.policeForce}`);
      return;
    }
    const newPoliceForce = Math.max(0, save.policeForce - action.policeCost);
    const newSecurity = Math.min(100, save.securityIndex + action.securityGain);
    const newMerit = save.meritPoints + action.meritGain;
    await updateGameSave({ policeForce: newPoliceForce, securityIndex: newSecurity, meritPoints: newMerit });
    showFeedback(`${action.label}行动启动！治安+${action.securityGain}，政绩+${action.meritGain}`);
  };

  const handleRestorePolice = async () => {
    if (!save) return;
    const restored = Math.min(100, save.policeForce + 20);
    await updateGameSave({ policeForce: restored });
    showFeedback(`警力补充完成，当前警力：${restored}`);
  };

  const pendingCases = cases.filter(c => c.status === 'pending');
  const solvedCases = cases.filter(c => c.status === 'solved');

  const renderCase = ({ item }: { item: PoliceCase }) => (
    <View style={{
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: '#DDD',
      borderLeftWidth: 3,
      borderLeftColor: CASE_TYPE_COLOR[item.caseType] ?? '#1D2D44',
      padding: 14,
      marginBottom: 8,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#222' }}>{item.title}</Text>
          <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{CASE_TYPE_LABEL[item.caseType]}</Text>
        </View>
        <View style={{ borderWidth: 1, borderColor: CASE_TYPE_COLOR[item.caseType] ?? '#1D2D44', paddingHorizontal: 6, paddingVertical: 2 }}>
          <Text style={{ fontSize: 10, color: CASE_TYPE_COLOR[item.caseType] ?? '#1D2D44', fontWeight: '600' }}>
            {item.status === 'pending' ? '待侦破' : item.status === 'solved' ? '已告破' : '未破案'}
          </Text>
        </View>
      </View>

      <Text style={{ fontSize: 12, color: '#555', lineHeight: 18, marginBottom: 10 }}>{item.description}</Text>

      <View style={{ flexDirection: 'row', gap: 16, marginBottom: item.status === 'pending' ? 12 : 0 }}>
        <Text style={{ fontSize: 11, color: '#666' }}>所需警力：<Text style={{ color: '#C8102E', fontWeight: '600' }}>{item.requiredPolice}</Text></Text>
        <Text style={{ fontSize: 11, color: '#666' }}>案件难度：<Text style={{ fontWeight: '600' }}>{item.difficulty}</Text></Text>
        <Text style={{ fontSize: 11, color: '#666' }}>破案奖励：<Text style={{ color: '#2a7a3b', fontWeight: '600' }}>+{item.rewardMerit}政绩</Text></Text>
      </View>

      {item.status === 'pending' && (
        <Pressable
          onPress={() => handleSolveCase(item)}
          style={{ backgroundColor: '#1D2D44', paddingVertical: 8, alignItems: 'center' }}
          android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
        >
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>
            组织侦破
          </Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      <StatusBar style="light" backgroundColor="#1D2D44" />

      <View style={{
        backgroundColor: '#1D2D44',
        paddingTop: insets.top + 8,
        paddingBottom: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>公安局</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>公安局管理</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10 }}>{save?.rankName}</Text>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600', marginTop: 1 }}>{save?.cityName}</Text>
        </View>
      </View>

      {feedback !== '' && (
        <View style={{ backgroundColor: '#e8f5e9', borderBottomWidth: 1, borderBottomColor: '#c8e6c9', padding: 12 }}>
          <Text style={{ color: '#2a7a3b', fontSize: 13, fontWeight: '600' }}>{feedback}</Text>
        </View>
      )}

      {/* 公安状态卡 */}
      {save && (
        <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#DDD', padding: 16 }}>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
            <View style={{ flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#DDD', padding: 10 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#1D2D44', fontVariant: ['tabular-nums'] }}>
                {save.policeForce}
              </Text>
              <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>可用警力</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#DDD', padding: 10 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#C8102E', fontVariant: ['tabular-nums'] }}>
                {save.securityIndex.toFixed(0)}
              </Text>
              <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>治安指数</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#DDD', padding: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#222' }}>
                {save.policeChiefName ?? '空缺'}
              </Text>
              <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>公安局长</Text>
            </View>
          </View>
          <StatBar label="治安指数" value={save.securityIndex} />
          <Pressable
            onPress={handleRestorePolice}
            style={{ marginTop: 8, borderWidth: 1, borderColor: '#1D2D44', paddingVertical: 7, alignItems: 'center', backgroundColor: '#fff' }}
            android_ripple={{ color: 'rgba(29,45,68,0.1)' }}
          >
            <Text style={{ fontSize: 12, color: '#1D2D44', fontWeight: '600' }}>补充警力 (+20)</Text>
          </Pressable>
        </View>
      )}

      {/* 标签切换 */}
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#DDD' }}>
        {(['cases', 'actions'] as const).map(tab => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={{
              flex: 1,
              paddingVertical: 11,
              alignItems: 'center',
              borderBottomWidth: 2,
              borderBottomColor: activeTab === tab ? '#C8102E' : 'transparent',
            }}
          >
            <Text style={{
              fontSize: 13, fontWeight: '600',
              color: activeTab === tab ? '#C8102E' : '#888',
            }}>
              {tab === 'cases' ? `案件管理（${pendingCases.length}）` : '专项行动'}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#C8102E" />
        </View>
      ) : activeTab === 'cases' ? (
        <FlatList
          data={pendingCases}
          renderItem={renderCase}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          contentInsetAdjustmentBehavior="automatic"
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Text style={{ color: '#888', fontSize: 14 }}>暂无待处理案件</Text>
              <Text style={{ color: '#aaa', fontSize: 12, marginTop: 6 }}>推进时间后会有新案件出现</Text>
            </View>
          }
          ListFooterComponent={
            solvedCases.length > 0 ? (
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>已告破案件（{solvedCases.length}件）</Text>
                {solvedCases.slice(0, 3).map(c => (
                  <View key={c.id} style={{ backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#EEE', padding: 10, marginBottom: 6 }}>
                    <Text style={{ fontSize: 12, color: '#888' }}>{c.title} - 已告破</Text>
                  </View>
                ))}
              </View>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={SPECIAL_ACTIONS}
          keyExtractor={item => item.key}
          contentContainerStyle={{ padding: 16 }}
          contentInsetAdjustmentBehavior="automatic"
          renderItem={({ item }) => (
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDD', padding: 14, marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#222' }}>{item.label}</Text>
                <Text style={{ fontSize: 11, color: '#888' }}>持续{item.duration}</Text>
              </View>
              <Text style={{ fontSize: 12, color: '#555', marginBottom: 10, lineHeight: 18 }}>{item.desc}</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
                <Text style={{ fontSize: 11 }}>消耗警力：<Text style={{ color: '#C8102E', fontWeight: '600' }}>{item.policeCost}</Text></Text>
                <Text style={{ fontSize: 11 }}>治安+<Text style={{ color: '#2a7a3b', fontWeight: '600' }}>{item.securityGain}</Text></Text>
                <Text style={{ fontSize: 11 }}>政绩+<Text style={{ color: '#1D2D44', fontWeight: '600' }}>{item.meritGain}</Text></Text>
              </View>
              <Pressable
                onPress={() => handleSpecialAction(item)}
                style={{ backgroundColor: '#C8102E', paddingVertical: 8, alignItems: 'center' }}
                android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>启动行动</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}
