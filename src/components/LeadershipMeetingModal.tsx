// 领导班子会议弹窗——重大事件集体决策投票
import { useState, useEffect, useRef } from 'react';
import { ActivityIndicator, Modal, View, Text, ScrollView, Pressable, Animated } from 'react-native';
import type { EventTemplate, EventChoice } from '@/types/game';
import {
  type TeamMember,
  type VoteResult,
  generateTeamMembers,
  calcAiVote,
  calcVoteMultiplier,
  getLeadershipConfig,
} from '@/lib/leadershipTeam';

// ─────────────────────────────────────────────
// 样式常量（公文档案风）
// ─────────────────────────────────────────────
const C = {
  bg: '#F5F4F1',
  headerBg: '#1A3B6E', // 钢笔墨蓝
  red: '#C8161D',
  dark: '#222222',
  muted: '#666666',
  border: '#CCCCCC',
  gold: '#B8860B',
  supportBg: '#E8F5E9',
  supportText: '#1B5E20',
  opposeBg: '#FFEBEE',
  opposeText: '#B71C1C',
  abstainBg: '#F5F5F5',
  abstainText: '#616161',
  white: '#FFFFFF',
};

const VOTE_LABEL: Record<VoteResult, string> = {
  support: '赞成',
  oppose: '反对',
  abstain: '弃权',
};

// ─────────────────────────────────────────────
// 应用投票倍率到选项数值
// ─────────────────────────────────────────────
function applyMultiplier(choice: EventChoice, multiplier: number | null): EventChoice {
  if (multiplier === null) {
    // 否决——强制执行负面效果（最差选项50%惩罚）
    return {
      ...choice,
      meritChange: Math.round(choice.meritChange * -0.5),
      moralChange: Math.round(choice.moralChange * -0.5) - 5,
      gdpChange: Math.round(choice.gdpChange * -0.5),
      livelihoodChange: Math.round(choice.livelihoodChange * -0.5),
      ecologyChange: Math.round(choice.ecologyChange * -0.5),
      businessChange: Math.round(choice.businessChange * -0.5),
      description: '【方案被否决】领导班子未能形成共识，情况被迫搁置，各指标受到负面影响。',
    };
  }
  return {
    ...choice,
    meritChange: Math.round(choice.meritChange * multiplier),
    moralChange: Math.round(choice.moralChange * multiplier),
    gdpChange: Math.round(choice.gdpChange * multiplier),
    livelihoodChange: Math.round(choice.livelihoodChange * multiplier),
    ecologyChange: Math.round(choice.ecologyChange * multiplier),
    businessChange: Math.round(choice.businessChange * multiplier),
  };
}

// ─────────────────────────────────────────────
// 投票阶段状态
// ─────────────────────────────────────────────
type Stage = 'select' | 'voting' | 'result';

interface VoteState {
  member: TeamMember;
  vote: VoteResult | null; // null 表示还未公布
}

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────
interface Props {
  event: EventTemplate;
  rankLevel: number;
  playerName: string;
  playerPosition?: string;  // 玩家当前职位（晋升后动态变化，不写死初始职级）
  onConfirm: (finalChoice: EventChoice, updatedMembers: TeamMember[]) => void;
  onClose?: () => void;
}

// ─────────────────────────────────────────────
// 主组件
// ─────────────────────────────────────────────
export default function LeadershipMeetingModal({
  event,
  rankLevel,
  playerName,
  playerPosition,
  onConfirm,
  onClose,
}: Props) {
  const [stage, setStage] = useState<Stage>('select');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [voteStates, setVoteStates] = useState<VoteState[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [multiplier, setMultiplier] = useState<number | null>(1);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 从词库加载班子成员（异步）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const m = await generateTeamMembers(rankLevel, playerName, playerPosition);
      if (!cancelled) setMembers(m);
    })();
    return () => { cancelled = true; };
  }, [rankLevel, playerName, playerPosition]);

  // 当前职级的会议名称，如"市委常委会"
  const meetingName = getLeadershipConfig(rankLevel).levelName;

  // 震动动效（投票结果公布时）
  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  // 确认方案 → 进入投票阶段
  const handleConfirmChoice = () => {
    if (selectedIndex === null) return;

    // 建立初始投票状态（全部未公布）
    const initial: VoteState[] = members.map((m, i) => ({
      member: m,
      vote: i === 0 ? 'support' : null, // 玩家自己固定赞成
    }));
    setVoteStates(initial);
    setRevealedCount(1); // 玩家那票已知
    setStage('voting');
  };

  // 逐一揭示 AI 成员投票（每500ms一票）
  useEffect(() => {
    if (stage !== 'voting') return;

    const nextIndex = revealedCount;
    if (nextIndex >= members.length) {
      // 全部揭示完毕 → 计算结果
      timerRef.current = setTimeout(() => {
        const supportCount = voteStates.filter(v => v.vote === 'support').length;
        const mul = calcVoteMultiplier(supportCount, members.length);
        setMultiplier(mul);
        setStage('result');
        triggerShake();
      }, 600);
      return;
    }

    timerRef.current = setTimeout(() => {
      const aiVote = calcAiVote(members[nextIndex].favorability);
      setVoteStates(prev => {
        const next = [...prev];
        next[nextIndex] = { ...next[nextIndex], vote: aiVote };
        return next;
      });
      setRevealedCount(prev => prev + 1);
    }, 480);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [stage, revealedCount, members, voteStates]);

  // 最终确认
  const handleFinalConfirm = () => {
    if (selectedIndex === null) return;
    const choice = event.choices[selectedIndex];
    const finalChoice = applyMultiplier(choice, multiplier);

    // 更新好感度：赞成的成员 +3，反对的成员 -5
    const updatedMembers = members.map((m, i) => {
      if (i === 0) return m; // 玩家自己不变
      const vote = voteStates[i]?.vote;
      if (vote === 'support') return { ...m, favorability: Math.min(100, m.favorability + 3) };
      if (vote === 'oppose') return { ...m, favorability: Math.max(0, m.favorability - 5) };
      return m;
    });

    onConfirm(finalChoice, updatedMembers);
  };

  const supportCount = voteStates.filter(v => v.vote === 'support').length;
  const opposeCount = voteStates.filter(v => v.vote === 'oppose').length;
  const abstainCount = voteStates.filter(v => v.vote === 'abstain').length;
  const passed = multiplier !== null;

  // ────────────────────────────────────────────
  // 渲染
  // ────────────────────────────────────────────
  return (
    <Modal visible transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <Animated.View style={{ width: '100%', maxWidth: 480, backgroundColor: C.bg, transform: [{ translateX: shakeAnim }] }}>

          {/* 红头——重大事件标识 */}
          <View style={{ backgroundColor: C.red, paddingVertical: 6, alignItems: 'center' }}>
            <Text style={{ color: C.white, fontWeight: 'bold', fontSize: 11, letterSpacing: 2 }}>
              ■ 重大事项集体决策 ■
            </Text>
          </View>

          {/* 蓝色标题栏 */}
          <View style={{ backgroundColor: C.headerBg, paddingVertical: 14, paddingHorizontal: 16 }}>
            <Text style={{ color: C.white, fontSize: 15, fontWeight: 'bold', letterSpacing: 1 }}>
              {meetingName}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 3 }}>
              议题：{event.title}
            </Text>
          </View>

          <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
            <View style={{ padding: 16, gap: 14 }}>

              {/* 事件描述 */}
              <View style={{ borderLeftWidth: 3, borderLeftColor: C.red, paddingLeft: 10 }}>
                <Text style={{ color: C.dark, fontSize: 13, lineHeight: 20 }}>
                  {event.description}
                </Text>
              </View>

              {/* 班子成员加载中 */}
              {members.length === 0 ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <ActivityIndicator color={C.headerBg} />
                  <Text style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>正在组建班子…</Text>
                </View>
              ) : (
                <>
              {/* ── 阶段一：选择方案 ── */}
              {stage === 'select' && (
                <>
                  <Text style={{ color: C.dark, fontSize: 13, fontWeight: 'bold', borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 6 }}>
                    请提出您的主导方案：
                  </Text>
                  {event.choices.map((choice, idx) => {
                    const selected = selectedIndex === idx;
                    return (
                      <Pressable
                        key={idx}
                        onPress={() => setSelectedIndex(idx)}
                        style={{
                          borderWidth: selected ? 2 : 1,
                          borderColor: selected ? C.headerBg : C.border,
                          backgroundColor: selected ? 'rgba(26,59,110,0.06)' : C.white,
                          padding: 12,
                        }}
                      >
                        <Text style={{ color: selected ? C.headerBg : C.dark, fontSize: 13, fontWeight: selected ? 'bold' : 'normal', lineHeight: 20 }}>
                          {`方案${['一', '二', '三'][idx]}：${choice.text}`}
                        </Text>
                        <Text style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
                          政绩 {choice.meritChange > 0 ? `+${choice.meritChange}` : choice.meritChange}
                          {'  '}民心 {choice.moralChange > 0 ? `+${choice.moralChange}` : choice.moralChange}
                        </Text>
                      </Pressable>
                    );
                  })}

                  <Pressable
                    onPress={handleConfirmChoice}
                    style={{
                      backgroundColor: selectedIndex !== null ? C.headerBg : C.border,
                      paddingVertical: 13, alignItems: 'center', marginTop: 4,
                    }}
                  >
                    <Text style={{ color: C.white, fontWeight: 'bold', fontSize: 14, letterSpacing: 1 }}>
                      提交方案，交付班子表决
                    </Text>
                  </Pressable>
                </>
              )}

              {/* ── 阶段二/三：投票 & 结果 ── */}
              {(stage === 'voting' || stage === 'result') && (
                <>
                  {/* 被选方案回显 */}
                  {selectedIndex !== null && (
                    <View style={{ borderWidth: 1, borderColor: C.headerBg, backgroundColor: 'rgba(26,59,110,0.05)', padding: 10 }}>
                      <Text style={{ color: C.headerBg, fontSize: 12, fontWeight: 'bold' }}>
                        主导方案：{event.choices[selectedIndex].text}
                      </Text>
                    </View>
                  )}

                  {/* 班子成员投票列表 */}
                  <Text style={{ color: C.dark, fontSize: 13, fontWeight: 'bold', borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 6 }}>
                    领导班子表决情况（共{members.length}人）：
                  </Text>
                  {voteStates.map((vs, i) => {
                    const revealed = vs.vote !== null;
                    const isPlayer = i === 0;
                    return (
                      <View key={i} style={{
                        flexDirection: 'row', alignItems: 'center',
                        paddingVertical: 8, paddingHorizontal: 4,
                        borderBottomWidth: 1, borderBottomColor: '#EFEFEF',
                        backgroundColor: isPlayer ? 'rgba(26,59,110,0.04)' : C.white,
                      }}>
                        {/* 序号 */}
                        <Text style={{ width: 22, color: C.muted, fontSize: 11 }}>{i + 1}.</Text>
                        {/* 职位+姓名 */}
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: isPlayer ? C.headerBg : C.dark, fontSize: 12, fontWeight: isPlayer ? 'bold' : 'normal' }}>
                            {vs.member.position}
                          </Text>
                          <Text style={{ color: C.muted, fontSize: 11 }}>{vs.member.name}</Text>
                        </View>
                        {/* 投票结果 */}
                        {revealed ? (
                          <View style={{
                            paddingHorizontal: 10, paddingVertical: 4,
                            backgroundColor: vs.vote === 'support' ? C.supportBg : vs.vote === 'oppose' ? C.opposeBg : C.abstainBg,
                            borderWidth: 1,
                            borderColor: vs.vote === 'support' ? C.supportText : vs.vote === 'oppose' ? C.opposeText : C.abstainText,
                          }}>
                            <Text style={{
                              fontWeight: 'bold', fontSize: 12,
                              color: vs.vote === 'support' ? C.supportText : vs.vote === 'oppose' ? C.opposeText : C.abstainText,
                            }}>
                              {VOTE_LABEL[vs.vote!]}
                            </Text>
                          </View>
                        ) : (
                          <View style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: C.border }}>
                            <Text style={{ color: C.muted, fontSize: 12 }}>表决中…</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </>
              )}

              {/* ── 阶段三：结果汇总 ── */}
              {stage === 'result' && (
                <>
                  {/* 票数统计横幅 */}
                  <View style={{ flexDirection: 'row', borderWidth: 2, borderColor: passed ? C.headerBg : C.red, marginTop: 4 }}>
                    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: C.supportBg }}>
                      <Text style={{ color: C.supportText, fontSize: 18, fontWeight: 'bold' }}>{supportCount}</Text>
                      <Text style={{ color: C.supportText, fontSize: 11 }}>赞成</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: C.opposeBg }}>
                      <Text style={{ color: C.opposeText, fontSize: 18, fontWeight: 'bold' }}>{opposeCount}</Text>
                      <Text style={{ color: C.opposeText, fontSize: 11 }}>反对</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: C.abstainBg }}>
                      <Text style={{ color: C.abstainText, fontSize: 18, fontWeight: 'bold' }}>{abstainCount}</Text>
                      <Text style={{ color: C.abstainText, fontSize: 11 }}>弃权</Text>
                    </View>
                  </View>

                  {/* 决议结论 */}
                  <View style={{
                    borderWidth: 2,
                    borderColor: passed ? C.headerBg : C.red,
                    backgroundColor: passed ? 'rgba(26,59,110,0.05)' : 'rgba(200,22,29,0.05)',
                    padding: 12,
                  }}>
                    <Text style={{ color: passed ? C.headerBg : C.red, fontWeight: 'bold', fontSize: 14, marginBottom: 6 }}>
                      {passed ? '▶ 决议通过' : '✕ 决议未通过'}
                      {passed && multiplier !== null && multiplier !== 1.0 && (
                        <Text style={{ fontSize: 12, fontWeight: 'normal' }}>
                          {multiplier > 1 ? `（效果加成 ×${multiplier}）` : `（效果削减 ×${multiplier}）`}
                        </Text>
                      )}
                    </Text>
                    {selectedIndex !== null && (
                      <Text style={{ color: C.dark, fontSize: 12, lineHeight: 19 }}>
                        {applyMultiplier(event.choices[selectedIndex], multiplier).description}
                      </Text>
                    )}
                  </View>

                  {/* 最终确认按钮 */}
                  <Pressable
                    onPress={handleFinalConfirm}
                    style={{ backgroundColor: C.red, paddingVertical: 13, alignItems: 'center' }}
                  >
                    <Text style={{ color: C.white, fontWeight: 'bold', fontSize: 14, letterSpacing: 1 }}>
                      确认执行决议
                    </Text>
                  </Pressable>
                </>
              )}
              </>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
