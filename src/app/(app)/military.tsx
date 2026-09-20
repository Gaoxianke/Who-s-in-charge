// 国家军事力量页面
// 省部级（10级）以上可查看；副院理（13级）可提交军费建议
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';

// ── 军种图标与颜色 ──
const BRANCH_STYLE: Record<string, { icon: string; color: string; bg: string }> = {
  陆军: { icon: '🪖', color: '#2d5016', bg: '#E8F5E9' },
  海军: { icon: '⚓', color: '#0D2C5E', bg: '#E3F2FD' },
  空军: { icon: '✈️', color: '#1A237E', bg: '#E8EAF6' },
  火箭军: { icon: '🚀', color: '#7B1FA2', bg: '#F3E5F5' },
  战略支援部队: { icon: '📡', color: '#4E342E', bg: '#EFEBE9' },
  联勤保障部队: { icon: '🛡️', color: '#1B5E20', bg: '#F1F8E9' },
};

// 军事力量数据（基于存档ID哈希，保证稳定随机）
function seededRand(seed: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const norm = Math.abs(hash) / 2147483647;
  return Math.round(min + norm * (max - min));
}

interface MilitaryBranch {
  name: string;
  personnel: number;      // 万人
  equipment: number;      // 装备完好率%
  combatReadiness: number; // 战备等级%
  budget: number;         // 年度预算（亿元）
}

function buildMilitaryData(saveId: string): MilitaryBranch[] {
  return [
    {
      name: '陆军',
      personnel: seededRand(saveId + 'land_p', 80, 100),
      equipment: seededRand(saveId + 'land_e', 75, 92),
      combatReadiness: seededRand(saveId + 'land_c', 80, 95),
      budget: seededRand(saveId + 'land_b', 3000, 4500),
    },
    {
      name: '海军',
      personnel: seededRand(saveId + 'navy_p', 22, 32),
      equipment: seededRand(saveId + 'navy_e', 78, 95),
      combatReadiness: seededRand(saveId + 'navy_c', 82, 95),
      budget: seededRand(saveId + 'navy_b', 2000, 3000),
    },
    {
      name: '空军',
      personnel: seededRand(saveId + 'air_p', 25, 35),
      equipment: seededRand(saveId + 'air_e', 80, 96),
      combatReadiness: seededRand(saveId + 'air_c', 82, 96),
      budget: seededRand(saveId + 'air_b', 2500, 3500),
    },
    {
      name: '火箭军',
      personnel: seededRand(saveId + 'rocket_p', 10, 16),
      equipment: seededRand(saveId + 'rocket_e', 90, 99),
      combatReadiness: seededRand(saveId + 'rocket_c', 90, 99),
      budget: seededRand(saveId + 'rocket_b', 1800, 2800),
    },
    {
      name: '战略支援部队',
      personnel: seededRand(saveId + 'stra_p', 8, 14),
      equipment: seededRand(saveId + 'stra_e', 85, 98),
      combatReadiness: seededRand(saveId + 'stra_c', 85, 98),
      budget: seededRand(saveId + 'stra_b', 1200, 2000),
    },
    {
      name: '联勤保障部队',
      personnel: seededRand(saveId + 'log_p', 12, 18),
      equipment: seededRand(saveId + 'log_e', 80, 93),
      combatReadiness: seededRand(saveId + 'log_c', 78, 92),
      budget: seededRand(saveId + 'log_b', 800, 1400),
    },
  ];
}

// 战略核力量（独立面板）
function buildNuclearData(saveId: string) {
  return {
    icbm: seededRand(saveId + 'nuke_icbm', 200, 350),   // 洲际弹道导弹（枚）
    slbm: seededRand(saveId + 'nuke_slbm', 60, 100),    // 潜射弹道导弹（枚）
    warheads: seededRand(saveId + 'nuke_wh', 300, 500), // 战略核弹头（枚）
    readiness: seededRand(saveId + 'nuke_r', 88, 99),   // 战备完好率%
  };
}

// 小型进度条
function MiniBar({ value, color }: { value: number; color: string }) {
  const pct = Math.min(100, Math.max(0, value));
  const barColor = pct >= 85 ? '#2a7a3b' : pct >= 65 ? '#e67e22' : '#C82829';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ flex: 1, height: 5, backgroundColor: '#E5E5E5' }}>
        <View style={{ width: `${pct}%`, height: 5, backgroundColor: barColor }} />
      </View>
      <Text style={{ fontSize: 10, color: barColor, fontWeight: '700', minWidth: 30, textAlign: 'right' }}>
        {pct}%
      </Text>
    </View>
  );
}

export default function MilitaryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save } = useGame();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggestionText, setSuggestionText] = useState('');
  const [feedback, setFeedback] = useState('');

  if (!save) return null;

  const rl = save.rankLevel;

  // 仅10级以上可进入
  if (rl < 10) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F4F1', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <StatusBar style="light" backgroundColor="#0D1F35" />
        <Text style={{ fontSize: 32, marginBottom: 16 }}>🔒</Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#2B4B6F', marginBottom: 8 }}>权限不足</Text>
        <Text style={{ fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20 }}>
          国家军事力量属于高度机密信息，仅省委书记（10级）以上职位可查阅
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#2B4B6F' }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>返回</Text>
        </Pressable>
      </View>
    );
  }

  const branches = buildMilitaryData(save.id);
  const nuclear = buildNuclearData(save.id);
  const totalPersonnel = branches.reduce((s, b) => s + b.personnel, 0);
  const totalBudget = branches.reduce((s, b) => s + b.budget, 0);
  const avgReadiness = Math.round(branches.reduce((s, b) => s + b.combatReadiness, 0) / branches.length);

  // 权限说明（根据实际职级动态显示）
  const permLabel = rl >= 15 ? '党和国家最高领导人（最高指挥权）'
    : rl === 14 ? '国政院院理（军委副主席·全面指挥权）'
    : rl === 13 ? '国政院副院理（军委委员·建议权）'
    : rl === 12 ? '国政院部长（国防联络权）'
    : rl === 11 ? '省委书记（动员配合权）'
    : '省长/副省长（地方配合权）';

  const handleSubmitSuggestion = () => {
    if (!suggestionText.trim()) return;
    setFeedback(`✅ 军费建议已提交至中枢军委，待审议（+10 政绩）`);
    setSuggestionText('');
    setShowSuggestion(false);
    setTimeout(() => setFeedback(''), 4000);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0D1F35' }}>
      <StatusBar style="light" backgroundColor="#0D1F35" />

      {/* 顶栏 */}
      <View style={{ paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: '#a0b4cc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>中枢军事委员会 · 机密</Text>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 1 }}>国家军事力量</Text>
          </View>
          <View style={{ backgroundColor: 'rgba(255,0,0,0.15)', borderWidth: 1, borderColor: '#C82829', paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ color: '#ff6666', fontSize: 9, fontWeight: '700', letterSpacing: 1 }}>绝密</Text>
          </View>
        </View>

        {/* 当前权限徽章 */}
        <View style={{ marginTop: 10, backgroundColor: 'rgba(255,255,255,0.07)', padding: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 11, color: '#a0b4cc' }}>当前权限：</Text>
          <Text style={{ fontSize: 11, color: '#FFD700', fontWeight: '700' }}>{permLabel}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: '#F5F4F1' }} contentInsetAdjustmentBehavior="automatic">

        {/* 总体概览 */}
        <View style={{ backgroundColor: '#0D1F35', padding: 14, marginBottom: 10 }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2, marginBottom: 10 }}>总体概况</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { label: '总兵力', value: `${totalPersonnel}万人`, color: '#FFD700' },
              { label: '国防预算', value: `${totalBudget}亿/年`, color: '#90CAF9' },
              { label: '平均战备', value: `${avgReadiness}%`, color: avgReadiness >= 85 ? '#81C784' : '#FF8A65' },
            ].map(item => (
              <View key={item.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', padding: 10, alignItems: 'center' }}>
                <Text style={{ color: item.color, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{item.value}</Text>
                <Text style={{ color: '#a0b4cc', fontSize: 9, marginTop: 3 }}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 反馈条 */}
        {feedback ? (
          <View style={{ backgroundColor: '#e8f5e9', borderBottomWidth: 1, borderBottomColor: '#c8e6c9', padding: 10, marginBottom: 6 }}>
            <Text style={{ color: '#2a7a3b', fontSize: 12, fontWeight: '600' }}>{feedback}</Text>
          </View>
        ) : null}

        {/* 各军种面板 */}
        <View style={{ padding: 14, gap: 10 }}>
          {branches.map(branch => {
            const style = BRANCH_STYLE[branch.name] ?? { icon: '🔰', color: '#333', bg: '#F5F5F5' };
            const isExp = expanded === branch.name;
            return (
              <Pressable
                key={branch.name}
                onPress={() => setExpanded(isExp ? null : branch.name)}
                style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: isExp ? style.color : '#DDD', overflow: 'hidden' }}
              >
                {/* 军种头部 */}
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 }}>
                  <View style={{ backgroundColor: style.bg, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 20 }}>{style.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: style.color }}>{branch.name}</Text>
                    <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>兵力 {branch.personnel} 万人</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={{ backgroundColor: branch.combatReadiness >= 85 ? '#e8f5e9' : '#fff3e0', paddingHorizontal: 7, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: branch.combatReadiness >= 85 ? '#2a7a3b' : '#e67e22' }}>
                        {branch.combatReadiness}%
                      </Text>
                    </View>
                    <Text style={{ fontSize: 9, color: '#aaa', marginTop: 2 }}>战备率</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: '#aaa' }}>{isExp ? '▲' : '▼'}</Text>
                </View>

                {/* 展开详情 */}
                {isExp && (
                  <View style={{ borderTopWidth: 1, borderTopColor: '#F0EEEA', padding: 12, gap: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 10, color: '#555' }}>年度预算</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#2B4B6F' }}>{branch.budget} 亿元</Text>
                    </View>
                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                        <Text style={{ fontSize: 10, color: '#555' }}>装备完好率</Text>
                      </View>
                      <MiniBar value={branch.equipment} color={style.color} />
                    </View>
                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                        <Text style={{ fontSize: 10, color: '#555' }}>战备完好率</Text>
                      </View>
                      <MiniBar value={branch.combatReadiness} color={style.color} />
                    </View>
                  </View>
                )}
              </Pressable>
            );
          })}

          {/* 战略核力量（独立面板，略微敏感说明） */}
          <View style={{ backgroundColor: '#0D1F35', borderWidth: 1, borderColor: '#C82829', padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Text style={{ fontSize: 18 }}>☢️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>战略核力量</Text>
                <Text style={{ color: '#a0b4cc', fontSize: 9, marginTop: 2 }}>最高机密 · 仅供参阅</Text>
              </View>
              <View style={{ backgroundColor: '#C82829', paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>TOP SECRET</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { label: '洲际弹道导弹', value: `${nuclear.icbm} 枚` },
                { label: '潜射弹道导弹', value: `${nuclear.slbm} 枚` },
                { label: '战略核弹头', value: `${nuclear.warheads} 枚` },
              ].map(item => (
                <View key={item.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', padding: 8, alignItems: 'center' }}>
                  <Text style={{ color: '#FFD700', fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{item.value}</Text>
                  <Text style={{ color: '#a0b4cc', fontSize: 8, marginTop: 3, textAlign: 'center' }}>{item.label}</Text>
                </View>
              ))}
            </View>
            <View style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 10, color: '#a0b4cc' }}>核弹头战备完好率</Text>
                <Text style={{ fontSize: 10, color: '#FFD700', fontWeight: '700' }}>{nuclear.readiness}%</Text>
              </View>
              <View style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <View style={{ width: `${nuclear.readiness}%`, height: 5, backgroundColor: '#FFD700' }} />
              </View>
            </View>
          </View>

          {/* 军费建议（副院理13级+专属） */}
          {rl >= 13 && (
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#9FA8DA', padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <View style={{ backgroundColor: '#3949AB', paddingHorizontal: 7, paddingVertical: 2 }}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>副院理专属</Text>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#2B4B6F' }}>提交军费建议</Text>
              </View>
              <Text style={{ fontSize: 11, color: '#666', lineHeight: 18, marginBottom: 10 }}>
                作为国政院副院理，您可向中枢军委提交国防预算建议。建议将纳入年度审议，对政绩有正向影响。
              </Text>
              {!showSuggestion ? (
                <Pressable
                  onPress={() => setShowSuggestion(true)}
                  style={{ backgroundColor: '#3949AB', paddingVertical: 11, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>✍️ 撰写军费建议</Text>
                </Pressable>
              ) : (
                <View style={{ gap: 8 }}>
                  <TextInput
                    multiline
                    numberOfLines={4}
                    value={suggestionText}
                    onChangeText={setSuggestionText}
                    placeholder="请输入军费预算建议（如：增加火箭军战略威慑能力预算，建议年度增幅不低于8%…）"
                    placeholderTextColor="#aaa"
                    style={{
                      borderWidth: 1, borderColor: '#9FA8DA',
                      padding: 10, fontSize: 13, color: '#222',
                      textAlignVertical: 'top', minHeight: 90,
                    }}
                  />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                      onPress={() => { setShowSuggestion(false); setSuggestionText(''); }}
                      style={{ flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: '#CCC', alignItems: 'center' }}
                    >
                      <Text style={{ color: '#666', fontSize: 12 }}>取消</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleSubmitSuggestion}
                      disabled={!suggestionText.trim()}
                      style={{ flex: 2, paddingVertical: 10, backgroundColor: suggestionText.trim() ? '#3949AB' : '#CCC', alignItems: 'center' }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>提交至军委审议</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* 中枢军委主席特权（如果有该兼职） */}
          {(save.concurrentPosts ?? []).includes('military_chairman') && (
            <View style={{ backgroundColor: '#1a0a00', borderWidth: 1, borderColor: '#FFD700', padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Text style={{ fontSize: 20 }}>🌟</Text>
                <View>
                  <Text style={{ color: '#FFD700', fontSize: 13, fontWeight: '700' }}>中枢军委主席权限</Text>
                  <Text style={{ color: '#a0b4cc', fontSize: 10 }}>最高军事指挥权</Text>
                </View>
              </View>
              <View style={{ gap: 8 }}>
                {[
                  { icon: '📊', label: '下达年度战备指令', desc: '提升全军战备等级 +5%，政绩 +20' },
                  { icon: '🎖️', label: '晋升高级将领', desc: '任命大区级军官，影响军队士气' },
                  { icon: '💰', label: '批复国防预算', desc: '审批军费分配方案，增强军备' },
                ].map((cmd, i) => (
                  <Pressable
                    key={i}
                    onPress={() => {
                      setFeedback(`✅ 已执行：${cmd.label}（${cmd.desc.split('，')[0]}）`);
                      setTimeout(() => setFeedback(''), 4000);
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,215,0,0.08)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)', padding: 10 }}
                  >
                    <Text style={{ fontSize: 20 }}>{cmd.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#FFD700', fontSize: 12, fontWeight: '700' }}>{cmd.label}</Text>
                      <Text style={{ color: '#a0b4cc', fontSize: 10, marginTop: 2 }}>{cmd.desc}</Text>
                    </View>
                    <Text style={{ color: '#FFD700', fontSize: 14 }}>›</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

        </View>
      </ScrollView>
    </View>
  );
}
