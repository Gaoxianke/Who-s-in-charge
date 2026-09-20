// 续任投票弹窗
// rank14（国政院院理第一届届满）→ 全国议政院表决是否连任
// rank15（总执书记·华夏主席·中枢军委主席每届届满）→ 全国执政党代表大会表决是否续任
// 投票通过（≥75%）：重置任期，届数+1，继续执政
// 投票未通过（<75%）：荣退，进入退休结局
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getRankTheme } from '@/lib/rankTheme';

interface RenewalVoteModalProps {
  visible: boolean;
  rankLevel: number;
  voteRate: number;
  passed: boolean;
  termsAfter: number;
  onClose: () => void;
}

// 按钮组件（带按压反馈，避免函数式 style）
function ActionBtn({
  onPress,
  bg,
  bgPressed,
  children,
}: {
  onPress: () => void;
  bg: string;
  bgPressed: string;
  children: React.ReactNode;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        backgroundColor: pressed ? bgPressed : bg,
        paddingVertical: 14,
        alignItems: 'center',
        borderRadius: 3,
      }}
    >
      {children}
    </Pressable>
  );
}

// 投票进度条（动态增长动画）
function VoteBar({ rate, color, bg }: { rate: number; color: string; bg: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: rate,
      duration: 1800,
      useNativeDriver: false,
    }).start();
  }, [anim, rate]);

  const width = anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  return (
    <View style={{ height: 18, backgroundColor: bg, borderRadius: 2, overflow: 'hidden', marginVertical: 6 }}>
      <Animated.View style={{ height: '100%', width, backgroundColor: color, borderRadius: 2 }} />
      {/* 通过线标记 75% */}
      <View
        style={{
          position: 'absolute', top: 0, bottom: 0,
          left: '75%', width: 2, backgroundColor: 'rgba(255,255,255,0.6)',
        }}
      />
    </View>
  );
}

export function RenewalVoteModal({
  visible,
  rankLevel,
  voteRate,
  passed,
  termsAfter,
  onClose,
}: RenewalVoteModalProps) {
  const router = useRouter();
  const { save, updateGameSave, clearRenewalVoteTrigger } = useGame();
  const theme = getRankTheme(rankLevel);

  // 是否已展示投票结果（分两阶段：投票中 → 结果揭晓）
  const [phase, setPhase] = useState<'voting' | 'result'>('voting');
  const [isProcessing, setIsProcessing] = useState(false);

  // 重置 phase（每次弹窗重新打开时）
  useEffect(() => {
    if (visible) setPhase('voting');
  }, [visible]);

  if (!save) return null;

  // 文案配置
  const isRank15 = rankLevel === 15;
  const voteBodyName = isRank15 ? '全国执政党代表大会' : '全国议政院';
  const voteTitle   = isRank15 ? '中共中央总执书记续任投票' : '国政院院理续任表决';
  const voteSubtitle = isRank15
    ? '党代会全体代表对总执书记·华夏主席·中枢军委主席续任进行投票表决'
    : '全国议政院对国政院院理连任进行投票表决';
  const passedTitle   = isRank15 ? '续任投票高票通过' : '连任表决通过';
  const passedDesc    = isRank15
    ? `经 ${voteBodyName} 全体代表投票表决，您以 ${voteRate}% 的高票续任，继续领导党和国家事业。`
    : `经 ${voteBodyName} 全体代表投票表决，您以 ${voteRate}% 赞成票连任国政院院理，继续主持政府工作。`;
  const failedTitle   = isRank15 ? '届届交接，荣休卸任' : '任期届满，完成历史使命';
  const failedDesc    = isRank15
    ? `经 ${voteBodyName} 投票，续任支持率为 ${voteRate}%，未达通过线，按照党纪惯例，您光荣卸任，完成任期使命。`
    : `经 ${voteBodyName} 投票，续任支持率为 ${voteRate}%，未达通过线，您任期届满，完成历史使命，荣誉退休。`;

  // 第一阶段：展示投票场景
  const handleRevealResult = () => setPhase('result');

  // 通过：更新届数、重置任期
  const handleContinue = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    await updateGameSave({
      nationalTermsServed: termsAfter,
      // 重置任期计数，让玩家继续新的5年任期
      tenureDays: 0,
      tenureYears: 0,
    });
    clearRenewalVoteTrigger();
    onClose();
    setIsProcessing(false);
  };

  // 未通过：荣退
  const handleRetire = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    await updateGameSave({ isRetired: true });
    clearRenewalVoteTrigger();
    onClose();
    router.push('/(app)/retirement-ending');
    setIsProcessing(false);
  };

  // 投票结果色
  const resultColor = passed ? '#4CAF50' : '#DE2910';
  const resultBg    = passed ? '#1A2E1A' : '#2E1A1A';

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <View style={{
          width: '100%', maxWidth: 420,
          backgroundColor: theme.cardBg,
          borderWidth: 1.5, borderColor: theme.cardBorder,
          borderRadius: 4, overflow: 'hidden',
          maxHeight: '88%',
        }}>
          {/* 顶部标题栏 */}
          <View style={{ backgroundColor: theme.headerBg, paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 2, borderBottomColor: theme.primary }}>
            <Text style={{ color: theme.primary, fontSize: 11, fontWeight: '700', letterSpacing: 3, textAlign: 'center', marginBottom: 4 }}>
              {voteBodyName.toUpperCase()}
            </Text>
            <Text style={{ color: theme.headerText, fontSize: 17, fontWeight: '700', textAlign: 'center', letterSpacing: 1 }}>
              {voteTitle}
            </Text>
            <Text style={{ color: theme.mutedText, fontSize: 11, textAlign: 'center', marginTop: 4, letterSpacing: 0.5 }}>
              {voteSubtitle}
            </Text>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>

            {/* ── 第一阶段：投票中 ── */}
            {phase === 'voting' && (
              <View>
                {/* 国徽/会议图标区 */}
                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                  <Text style={{ fontSize: 52 }}>🏛️</Text>
                  <Text style={{ color: theme.headerText, fontSize: 14, fontWeight: '600', marginTop: 8, textAlign: 'center' }}>
                    {isRank15 ? '第二十一次全国代表大会' : '全国议政院全体会议'}
                  </Text>
                  <Text style={{ color: theme.mutedText, fontSize: 11, marginTop: 4, textAlign: 'center' }}>
                    {isRank15
                      ? '2956名党代表出席，投票表决总执书记续任'
                      : '2977名全国议政院代表出席，表决总理连任'}
                  </Text>
                </View>

                {/* 分隔线 */}
                <View style={{ height: 1, backgroundColor: theme.cardBorder, marginBottom: 16 }} />

                {/* 被提名人信息 */}
                <View style={{ backgroundColor: theme.sectionHeaderBg, borderRadius: 3, padding: 14, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: theme.accent }}>
                  <Text style={{ color: theme.labelText, fontSize: 11, marginBottom: 6, letterSpacing: 1 }}>被提名人</Text>
                  <Text style={{ color: theme.headerText, fontSize: 16, fontWeight: '700' }}>{save.playerName}</Text>
                  <Text style={{ color: theme.mutedText, fontSize: 12, marginTop: 3 }}>
                    {isRank15 ? '中共中央总执书记 · 华夏主席 · 中枢中枢军委主席' : '国政院院理'}
                  </Text>
                  <Text style={{ color: theme.mutedText, fontSize: 11, marginTop: 6 }}>
                    已任职届数：<Text style={{ color: theme.accent }}>{save.nationalTermsServed}</Text> 届 ·
                    年龄：<Text style={{ color: theme.accent }}> {save.playerAge}</Text> 岁
                  </Text>
                </View>

                {/* 程序说明 */}
                <View style={{ marginBottom: 20 }}>
                  {[
                    `由中央提名，提交${voteBodyName}表决`,
                    '代表就候选人执政表现、廉洁情况进行评估',
                    '通过秘密投票方式，赞成票超过75%即视为通过',
                    isRank15 ? '通过后继续担任下一届总执书记·华夏主席·中枢军委主席' : '通过后连任第二届国政院院理（任期至宪法上限）',
                  ].map((step, i) => (
                    <View key={i} style={{ flexDirection: 'row', marginBottom: 8 }}>
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 1 }}>
                        <Text style={{ color: theme.primaryText, fontSize: 10, fontWeight: '700' }}>{i + 1}</Text>
                      </View>
                      <Text style={{ color: theme.valueText, fontSize: 12, flex: 1, lineHeight: 18 }}>{step}</Text>
                    </View>
                  ))}
                </View>

                {/* 揭晓按钮 */}
                <ActionBtn onPress={handleRevealResult} bg={theme.primary} bgPressed={theme.accentSub}>
                  <Text style={{ color: theme.primaryText, fontSize: 14, fontWeight: '700', letterSpacing: 2 }}>
                    ▶  宣布投票结果
                  </Text>
                </ActionBtn>
              </View>
            )}

            {/* ── 第二阶段：结果揭晓 ── */}
            {phase === 'result' && (
              <View>
                {/* 结果标题 */}
                <View style={{ backgroundColor: resultBg, borderRadius: 3, padding: 16, marginBottom: 18, borderWidth: 1, borderColor: resultColor, alignItems: 'center' }}>
                  <Text style={{ fontSize: 36, marginBottom: 8 }}>{passed ? '🎉' : '🕊️'}</Text>
                  <Text style={{ color: resultColor, fontSize: 16, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>
                    {passed ? passedTitle : failedTitle}
                  </Text>
                  <Text style={{ color: theme.valueText, fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
                    {passed ? passedDesc : failedDesc}
                  </Text>
                </View>

                {/* 投票数据 */}
                <View style={{ marginBottom: 18 }}>
                  <Text style={{ color: theme.labelText, fontSize: 11, letterSpacing: 1, marginBottom: 10 }}>▌  投票统计</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: theme.mutedText, fontSize: 12 }}>赞成票</Text>
                    <Text style={{ color: resultColor, fontSize: 14, fontWeight: '700' }}>{voteRate}%</Text>
                  </View>
                  <VoteBar rate={voteRate} color={resultColor} bg={theme.progressBg} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={{ color: theme.mutedText, fontSize: 10 }}>0%</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>通过线 75%</Text>
                    <Text style={{ color: theme.mutedText, fontSize: 10 }}>100%</Text>
                  </View>
                </View>

                {/* 任期信息 */}
                {passed && (
                  <View style={{ backgroundColor: theme.sectionHeaderBg, borderRadius: 3, padding: 14, marginBottom: 18, borderLeftWidth: 3, borderLeftColor: theme.accent }}>
                    <Text style={{ color: theme.labelText, fontSize: 11, marginBottom: 8, letterSpacing: 1 }}>本届任期信息</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ color: theme.accent, fontSize: 22, fontWeight: '700' }}>{termsAfter}</Text>
                        <Text style={{ color: theme.mutedText, fontSize: 10 }}>执政届数</Text>
                      </View>
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ color: theme.accent, fontSize: 22, fontWeight: '700' }}>5</Text>
                        <Text style={{ color: theme.mutedText, fontSize: 10 }}>届期（年）</Text>
                      </View>
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ color: theme.accent, fontSize: 22, fontWeight: '700' }}>
                          {isRank15 ? '无限' : (termsAfter >= 2 ? '最终届' : '1届剩余')}
                        </Text>
                        <Text style={{ color: theme.mutedText, fontSize: 10 }}>
                          {isRank15 ? '届次上限' : '宪法限制'}
                        </Text>
                      </View>
                    </View>
                    {isRank15 && (
                      <Text style={{ color: theme.mutedText, fontSize: 10, marginTop: 10, textAlign: 'center', lineHeight: 15 }}>
                        ※ 2018年宪法修正案已取消华夏主席任期限制，总执书记·中枢军委主席任期由党代会决定
                      </Text>
                    )}
                    {!isRank15 && termsAfter >= 2 && (
                      <Text style={{ color: theme.mutedText, fontSize: 10, marginTop: 10, textAlign: 'center', lineHeight: 15 }}>
                        ※ 根据宪法第87条，国政院院理任期届满后不得连任，第二届任满后将完成历史使命
                      </Text>
                    )}
                  </View>
                )}

                {/* 操作按钮 */}
                {passed ? (
                  <ActionBtn
                    onPress={handleContinue}
                    bg={theme.primary}
                    bgPressed={theme.accentSub}
                  >
                    <Text style={{ color: theme.primaryText, fontSize: 14, fontWeight: '700', letterSpacing: 2 }}>
                      受命·开启新届期  ▶
                    </Text>
                  </ActionBtn>
                ) : (
                  <ActionBtn
                    onPress={handleRetire}
                    bg='#4A2020'
                    bgPressed='#3A1010'
                  >
                    <Text style={{ color: '#FFAAAA', fontSize: 14, fontWeight: '700', letterSpacing: 2 }}>
                      光荣卸任，完成使命  ▶
                    </Text>
                  </ActionBtn>
                )}
              </View>
            )}

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
