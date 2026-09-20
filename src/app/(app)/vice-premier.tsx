import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '@/ctx/GameContext';
import { formatFund } from '@/types/game';

// 军委事务行动
const MILITARY_ACTIONS = [
  { id: 'm1', label: '推进国防信息化建设', cost: 120, desc: '强化军队指挥信息系统，提升联合作战能力', securityBonus: 8, meritReward: 15 },
  { id: 'm2', label: '军事演习联合指挥', cost: 80, desc: '组织跨战区联合演习，检验战备状态', securityBonus: 5, meritReward: 10 },
  { id: 'm3', label: '军民融合深度发展', cost: 90, desc: '推动军民两用技术转化，强化国防工业', securityBonus: 4, gdpBonus: 2, meritReward: 10 },
  { id: 'm4', label: '海外利益保护机制', cost: 100, desc: '建立海外公民撤离与资产保护体系', securityBonus: 3, meritReward: 8 },
  { id: 'm5', label: '战略核力量现代化', cost: 150, desc: '升级战略威慑体系，维护战略稳定', securityBonus: 12, meritReward: 20 },
];

// 外交事务行动
const DIPLOMACY_ACTIONS = [
  { id: 'd1', label: '主持大国峰会', cost: 100, desc: '与主要大国领导人举行峰会，推进战略互信', gdpBonus: 2, businessBonus: 3, meritReward: 12 },
  { id: 'd2', label: '推进"一带一路"合作', cost: 120, desc: '深化共建国家互联互通，拓展经济合作', gdpBonus: 4, businessBonus: 2, meritReward: 15 },
  { id: 'd3', label: '参与联合国改革', cost: 80, desc: '推动国际秩序改革，提升发展中国家话语权', businessBonus: 3, meritReward: 10 },
  { id: 'd4', label: '双边自贸协定谈判', cost: 90, desc: '与战略伙伴签署自贸协定，消除贸易壁垒', gdpBonus: 3, businessBonus: 2, meritReward: 10 },
  { id: 'd5', label: '人文交流与软实力', cost: 60, desc: '扩大文化输出，提升国家形象与软实力', businessBonus: 2, meritReward: 6 },
  { id: 'd6', label: '主导全球治理议题', cost: 100, desc: '在气候、卫生等全球议题上发挥领导力', gdpBonus: 1, businessBonus: 3, meritReward: 10 },
];

type Tab = 'military' | 'diplomacy' | 'overview';

export default function VicePremierScreen() {
  const insets = useSafeAreaInsets();
  const { save, isLoading, updateGameSave } = useGame();
  const [tab, setTab] = useState<Tab>('overview');
  const [acting, setActing] = useState(false);
  const [result, setResult] = useState('');

  if (isLoading || !save) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color="#C82829" /></View>;
  }
  if (save.rankLevel < 13) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 15, color: '#888', textAlign: 'center' }}>晋升至国政院副院理级（级别13）后解锁此页面</Text>
      </View>
    );
  }

  const handleMilitaryAction = async (action: typeof MILITARY_ACTIONS[0]) => {
    if (acting || save.fundBalance < action.cost) return;
    setActing(true);
    await updateGameSave({
      fundBalance: save.fundBalance - action.cost,
      meritPoints: save.meritPoints + action.meritReward,
      securityIndex: Math.min(100, save.securityIndex + action.securityBonus),
      cityGdp: action.gdpBonus ? Math.min(100, save.cityGdp + action.gdpBonus) : save.cityGdp,
    });
    setResult(`✅ 已下达指示：${action.label}，政绩 +${action.meritReward}`);
    setActing(false);
    setTimeout(() => setResult(''), 3000);
  };

  const handleDiplomacyAction = async (action: typeof DIPLOMACY_ACTIONS[0]) => {
    if (acting || save.fundBalance < action.cost) return;
    setActing(true);
    await updateGameSave({
      fundBalance: save.fundBalance - action.cost,
      meritPoints: save.meritPoints + action.meritReward,
      cityGdp: action.gdpBonus ? Math.min(100, save.cityGdp + action.gdpBonus) : save.cityGdp,
      cityBusiness: action.businessBonus ? Math.min(100, save.cityBusiness + action.businessBonus) : save.cityBusiness,
    });
    setResult(`✅ 外交成果：${action.label}，政绩 +${action.meritReward}`);
    setActing(false);
    setTimeout(() => setResult(''), 3000);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F4F0' }}>
      <StatusBar style="light" backgroundColor="#0D1F35" />
      {/* 页眉 */}
      <View style={{ backgroundColor: '#0D1F35', padding: 18, paddingTop: insets.top + 8 }}>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, letterSpacing: 3 }}>国政院 · 副院理治国</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <Text style={{ fontSize: 32 }}>🏛️</Text>
          <View>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 20 }}>国政院副院理</Text>
            <Text style={{ color: '#a0b4cc', fontSize: 12, marginTop: 2 }}>
              {save.playerName}  ·  分管：军委 + 外交 + 经济
            </Text>
          </View>
        </View>
      </View>

      {/* 资源栏 */}
      <View style={{ flexDirection: 'row', backgroundColor: '#2B4B6F', paddingVertical: 10, paddingHorizontal: 14, gap: 16 }}>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={{ color: '#a0b4cc', fontSize: 9 }}>专项经费</Text>
          <Text style={{ color: '#FFD700', fontWeight: '700', fontSize: 14 }}>{formatFund(save.fundBalance)}</Text>
        </View>
        <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={{ color: '#a0b4cc', fontSize: 9 }}>政绩积累</Text>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{save.meritPoints}</Text>
        </View>
        <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={{ color: '#a0b4cc', fontSize: 9 }}>安全指数</Text>
          <Text style={{ color: '#ff8a65', fontWeight: '700', fontSize: 14 }}>{save.securityIndex.toFixed(1)}</Text>
        </View>
      </View>

      {/* 标签栏 */}
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' }}>
        {([['overview', '📊 总览'], ['military', '⚔️ 军委'], ['diplomacy', '🌐 外交']] as [Tab, string][]).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: tab === key ? '#C82829' : 'transparent' }}
          >
            <Text style={{ fontSize: 12, fontWeight: tab === key ? '700' : '400', color: tab === key ? '#C82829' : '#888' }}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentInsetAdjustmentBehavior="automatic">
        {/* 总览 */}
        {tab === 'overview' && (
          <View style={{ padding: 14, gap: 12 }}>
            <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, fontWeight: '700' }}>国家综合治理指标</Text>
            {[
              { label: 'GDP增速', value: save.cityGdp, color: '#2B4B6F' },
              { label: '民生保障', value: save.cityLivelihood, color: '#2a7a3b' },
              { label: '生态文明', value: save.cityEcology, color: '#1a6b3a' },
              { label: '营商环境', value: save.cityBusiness, color: '#7B5E2A' },
              { label: '社会治安', value: save.securityIndex, color: '#7a1a1a' },
            ].map(item => (
              <View key={item.label}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                  <Text style={{ fontSize: 12, color: '#333', fontWeight: '600' }}>{item.label}</Text>
                  <Text style={{ fontSize: 12, color: item.color, fontWeight: '700' }}>{item.value.toFixed(1)}</Text>
                </View>
                <View style={{ height: 6, backgroundColor: '#E0E0E0', borderRadius: 3 }}>
                  <View style={{ width: `${item.value}%`, height: 6, backgroundColor: item.color, borderRadius: 3 }} />
                </View>
              </View>
            ))}

            <View style={{ height: 1, backgroundColor: '#E0E0E0', marginVertical: 4 }} />
            <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, fontWeight: '700' }}>分管职责说明</Text>
            <View style={{ gap: 8 }}>
              {[
                { icon: '⚔️', title: '军委板块', desc: '主持国防建设、军事现代化及战略安全工作，向国政院院理负责。' },
                { icon: '🌐', title: '外交板块', desc: '统筹多边外交、经济外交及人文交流，维护国家战略利益。' },
                { icon: '📋', title: '经济协调', desc: '协调重大经济政策出台，统筹发展与安全两件大事。' },
              ].map(item => (
                <View key={item.title} style={{ flexDirection: 'row', gap: 10, backgroundColor: '#fff', padding: 12, borderWidth: 1, borderColor: '#E0E0E0' }}>
                  <Text style={{ fontSize: 22, width: 28, textAlign: 'center' }}>{item.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#2B4B6F', marginBottom: 3 }}>{item.title}</Text>
                    <Text style={{ fontSize: 11, color: '#666', lineHeight: 17 }}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 军委板块 */}
        {tab === 'military' && (
          <View style={{ padding: 14, gap: 10 }}>
            <View style={{ backgroundColor: '#1a1a2e', padding: 12, marginBottom: 4 }}>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, letterSpacing: 2 }}>中枢军事委员会</Text>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, marginTop: 2 }}>⚔️ 国防与军队建设</Text>
              <Text style={{ color: '#a0a0b0', fontSize: 11, marginTop: 4, lineHeight: 16 }}>
                统筹国家军事战略，推进国防现代化。每项举措均直接影响全国安全指数。
              </Text>
            </View>
            {MILITARY_ACTIONS.map(action => {
              const canAct = save.fundBalance >= action.cost;
              return (
                <View key={action.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D0D0D0' }}>
                  <View style={{ padding: 12, gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D2D44', flex: 1 }}>{action.label}</Text>
                      <View style={{ backgroundColor: '#fff5f5', paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 }}>
                        <Text style={{ fontSize: 9, color: '#C82829', fontWeight: '600' }}>政绩 +{action.meritReward}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: '#777', lineHeight: 16 }}>{action.desc}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      <View style={{ backgroundColor: '#fff0f0', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, color: '#7a1a1a' }}>安全指数 +{action.securityBonus}</Text>
                      </View>
                      {action.gdpBonus && (
                        <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, color: '#2B4B6F' }}>GDP +{action.gdpBonus}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Pressable
                    onPress={() => handleMilitaryAction(action)}
                    disabled={!canAct || acting}
                    style={{ backgroundColor: canAct ? '#1a1a2e' : '#ccc', paddingVertical: 10, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
                      {acting ? '执行中…' : `下达指示（¥${action.cost}）`}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        {/* 外交板块 */}
        {tab === 'diplomacy' && (
          <View style={{ padding: 14, gap: 10 }}>
            <View style={{ backgroundColor: '#003366', padding: 12, marginBottom: 4 }}>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, letterSpacing: 2 }}>外交事务</Text>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, marginTop: 2 }}>🌐 大国外交与国际合作</Text>
              <Text style={{ color: '#a0b4cc', fontSize: 11, marginTop: 4, lineHeight: 16 }}>
                主导多边外交框架，拓展战略伙伴关系，提升国际话语权与经济合作广度。
              </Text>
            </View>
            {DIPLOMACY_ACTIONS.map(action => {
              const canAct = save.fundBalance >= action.cost;
              return (
                <View key={action.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D0D0D0' }}>
                  <View style={{ padding: 12, gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D2D44', flex: 1 }}>{action.label}</Text>
                      <View style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 }}>
                        <Text style={{ fontSize: 9, color: '#7B5E2A', fontWeight: '600' }}>政绩 +{action.meritReward}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: '#777', lineHeight: 16 }}>{action.desc}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {action.gdpBonus && (
                        <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, color: '#2B4B6F' }}>GDP +{action.gdpBonus}</Text>
                        </View>
                      )}
                      {action.businessBonus && (
                        <View style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, color: '#7B5E2A' }}>营商 +{action.businessBonus}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Pressable
                    onPress={() => handleDiplomacyAction(action)}
                    disabled={!canAct || acting}
                    style={{ backgroundColor: canAct ? '#003366' : '#ccc', paddingVertical: 10, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
                      {acting ? '推进中…' : `开展外交（¥${action.cost}）`}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
            <View style={{ height: 24 }} />
          </View>
        )}
      </ScrollView>

      {/* 操作结果 */}
      {!!result && (
        <View style={{ position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: '#2a7a3b', padding: 12, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{result}</Text>
        </View>
      )}
    </View>
  );
}
