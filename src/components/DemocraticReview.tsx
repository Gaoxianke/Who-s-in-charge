// 民主评议组件 - 重要人事任命需经过民主评议投票
import { useState, useMemo } from 'react';
import { Modal, ScrollView, Pressable, Text, View, ActivityIndicator } from 'react-native';
import {
  ALL_FACTIONS,
  FACTION_LABEL,
  FACTION_COLOR,
  FACTION_DESC,
  FACTION_VOTE_BIAS,
  ApprovalLevel,
  type Faction,
} from '@/types/game';
import type { Subordinate } from '@/types/game';

// ── 投票类型 ──────────────────────────────────────────────────
type VoteType = '赞成' | '反对' | '弃权';

interface OfficialVote {
  name: string;
  faction: Faction;
  vote: VoteType;
  reason: string;
  avatarEmoji: string;
}

interface ReviewResult {
  approve: number;
  oppose: number;
  abstain: number;
  passed: boolean;
  margin: number;   // 通过率
}

// ── 组件 Props ─────────────────────────────────────────────────
export interface DemocraticReviewProps {
  visible: boolean;
  /** 候选人信息 */
  candidate: {
    name: string;
    faction: Faction;
    ability: number;
    loyalty: number;
    integrity: number;
    targetRole: string;          // 任命目标职位
  };
  /** 参与评议的官员列表（当前领导班子成员）*/
  participants: Subordinate[];
  /** 审批级别 */
  approvalLevel: ApprovalLevel;
  /** 评议通过后确认任命回调 */
  onConfirm: () => void;
  /** 评议未通过但强制执行回调（上位会扣减上司好感） */
  onForceConfirm: () => void;
  /** 取消/撤回提名回调 */
  onCancel: () => void;
}

// ── 评议过程中投票计算逻辑 ───────────────────────────────────
function calcVote(
  officialFaction: Faction,
  candidateFaction: Faction,
  candidateAbility: number,
  candidateIntegrity: number,
  candidateLoyalty: number,
  officialName: string,
): OfficialVote {
  // 基础正向偏移：官场文化倾向支持上级提名
  let score = 1.5;

  // 候选人综合素质贡献（权重加大，体现能力的实际影响）
  score += (candidateAbility   - 60) * 0.10; // 能力70→+1.0，能力50→-1.0
  score += (candidateIntegrity - 60) * 0.07; // 廉洁70→+0.7，廉洁50→-0.7
  score += (candidateLoyalty   - 60) * 0.04; // 忠诚度作为辅助项

  // 阵营亲疏影响（核心变量）
  const factionBias = FACTION_VOTE_BIAS[officialFaction]?.[candidateFaction] ?? 0;
  score += factionBias;

  // 名字哈希提供确定性随机扰动（减小幅度，避免随机盖过素质分）
  let hash = 0;
  for (let i = 0; i < officialName.length; i++) hash = (hash * 31 + officialName.charCodeAt(i)) & 0xffff;
  score += ((hash % 7) - 3) * 0.2; // 扰动范围：-0.6 ~ +0.6

  // 判定阈值：赞成≥0.8，反对≤-1.5，其余弃权
  // 对应效果：普通候选人（能力70/廉洁70/中性阵营）≈2.3分 → 赞成
  //           跨阵营敌对（bias=-2）+ 能力低（50）≈-0.7分 → 反对
  //           真正无从判断的边界才弃权
  let vote: VoteType;
  let reason: string;

  if (score >= 0.8) {
    vote = '赞成';
    if (factionBias >= 3) reason = `与候选人政治理念高度契合，坚决支持`;
    else if (factionBias >= 1) reason = `与候选人路线相近，支持本次提名`;
    else if (candidateAbility >= 78) reason = `候选人能力突出，是胜任此职的合适人选`;
    else if (candidateIntegrity >= 75) reason = `候选人廉洁自律，值得信任委以重任`;
    else reason = `候选人综合素质符合要求，同意本次任命`;
  } else if (score <= -1.5) {
    vote = '反对';
    if (factionBias <= -2) reason = `与候选人政治理念存在重大分歧，坚决反对`;
    else if (candidateIntegrity < 50) reason = `对候选人廉洁问题高度警惕，提出反对`;
    else if (candidateAbility < 50) reason = `候选人能力明显不足，无法胜任此职`;
    else reason = `认为此次提名时机不当，建议重新考虑`;
  } else {
    vote = '弃权';
    if (factionBias === 0 && candidateAbility >= 60 && candidateAbility < 70) reason = `对候选人了解不深，暂不明确表态`;
    else if (Math.abs(factionBias) === 1) reason = `与候选人理念略有差异，持审慎态度`;
    else reason = `情况较为复杂，保留意见`;
  }

  return {
    name: officialName,
    faction: officialFaction,
    vote,
    reason,
    avatarEmoji: '👤',
  };
}

// ── 阵营分布展示 ──────────────────────────────────────────────
function FactionDistribution({ participants }: { participants: Subordinate[] }) {
  const dist: Partial<Record<Faction, number>> = {};
  for (const p of participants) {
    dist[p.faction] = (dist[p.faction] ?? 0) + 1;
  }
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
      {ALL_FACTIONS.map(f => {
        const cnt = dist[f] ?? 0;
        if (cnt === 0) return null;
        return (
          <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 3,
            backgroundColor: FACTION_COLOR[f] + '18', borderWidth: 1, borderColor: FACTION_COLOR[f],
            paddingHorizontal: 6, paddingVertical: 2 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: FACTION_COLOR[f] }} />
            <Text style={{ fontSize: 9, color: FACTION_COLOR[f], fontWeight: '700' }}>{FACTION_LABEL[f]}</Text>
            <Text style={{ fontSize: 9, color: FACTION_COLOR[f] }}>{cnt}人</Text>
          </View>
        );
      })}
    </View>
  );
}

// ── 投票结果进度条 ────────────────────────────────────────────
function VoteBar({ result }: { result: ReviewResult }) {
  const total = result.approve + result.oppose + result.abstain;
  if (total === 0) return null;
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: '#E0E0E0' }}>
        {result.approve > 0 && (
          <View style={{ flex: result.approve, backgroundColor: '#2a7a3b' }} />
        )}
        {result.abstain > 0 && (
          <View style={{ flex: result.abstain, backgroundColor: '#aaa' }} />
        )}
        {result.oppose > 0 && (
          <View style={{ flex: result.oppose, backgroundColor: '#C82829' }} />
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
        <Text style={{ fontSize: 10, color: '#2a7a3b', fontWeight: '700' }}>赞成 {result.approve}</Text>
        <Text style={{ fontSize: 10, color: '#888' }}>弃权 {result.abstain}</Text>
        <Text style={{ fontSize: 10, color: '#C82829', fontWeight: '700' }}>反对 {result.oppose}</Text>
      </View>
    </View>
  );
}

// ── 主组件 ────────────────────────────────────────────────────
export function DemocraticReview({
  visible,
  candidate,
  participants,
  approvalLevel,
  onConfirm,
  onForceConfirm,
  onCancel,
}: DemocraticReviewProps) {
  const [phase, setPhase] = useState<'intro' | 'voting' | 'result'>('intro');
  const [isVoting, setIsVoting] = useState(false);
  const [votes, setVotes] = useState<OfficialVote[]>([]);

  // 计算投票结果
  const result: ReviewResult | null = useMemo(() => {
    if (votes.length === 0) return null;
    const approve = votes.filter(v => v.vote === '赞成').length;
    const oppose  = votes.filter(v => v.vote === '反对').length;
    const abstain = votes.filter(v => v.vote === '弃权').length;
    const total   = votes.length;
    const passed  = approve > total / 2;
    const margin  = total > 0 ? Math.round((approve / total) * 100) : 0;
    return { approve, oppose, abstain, passed, margin };
  }, [votes]);

  // 审批级别颜色
  const LEVEL_COLOR: Record<ApprovalLevel, string> = {
    '本级决定':        '#2B4B6F',
    '县级议政院/组织部审批': '#7A5C00',
    '地市级审批':       '#7B0026',
    '省级审批':         '#4A1A6B',
    '中央审批':         '#1a1a1a',
  };

  // 重置状态
  const handleClose = () => {
    setPhase('intro');
    setVotes([]);
    setIsVoting(false);
    onCancel();
  };

  // 开始民主评议投票（模拟延迟增强仪式感）
  const handleStartVoting = async () => {
    setPhase('voting');
    setIsVoting(true);
    await new Promise(r => setTimeout(r, 800));
    // 生成每位参与者的投票
    const generatedVotes: OfficialVote[] = participants.map(p =>
      calcVote(
        p.faction,
        candidate.faction,
        candidate.ability,
        candidate.integrity,
        candidate.loyalty,
        p.name,
      )
    );
    // 若参与者不足3人，补充虚拟上级官员
    const supplementFactions: Faction[] = ['pragmatic', 'reform', 'techno'];
    const supplementNames = ['张政委', '李组长', '王部长'];
    while (generatedVotes.length < 3) {
      const idx = generatedVotes.length;
      const f = supplementFactions[idx] ?? 'pragmatic';
      generatedVotes.push(
        calcVote(f, candidate.faction, candidate.ability, candidate.integrity, candidate.loyalty, supplementNames[idx] ?? '评委')
      );
    }
    setVotes(generatedVotes);
    setIsVoting(false);
    setPhase('result');
  };

  // 确认任命：评议通过走 onConfirm，未通过强制走 onForceConfirm
  const handleConfirm = (force: boolean) => {
    setPhase('intro');
    setVotes([]);
    if (force) {
      onForceConfirm();
    } else {
      onConfirm();
    }
  };

  const levelColor = LEVEL_COLOR[approvalLevel];
  const candidateFactionColor = FACTION_COLOR[candidate.faction];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#fff', maxHeight: '88%', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>

          {/* 顶部标题栏 */}
          <View style={{ backgroundColor: '#1D3B5E', paddingTop: 16, paddingBottom: 12, paddingHorizontal: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>民主评议程序</Text>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 2 }}>
                  {candidate.targetRole} · 任命审议
                </Text>
              </View>
              {/* 审批级别徽章 */}
              <View style={{ backgroundColor: levelColor, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 9, letterSpacing: 1 }}>审批权限</Text>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', marginTop: 1 }}>{approvalLevel}</Text>
              </View>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>

            {/* 候选人信息卡 */}
            <View style={{ backgroundColor: '#F8F6F0', borderWidth: 1, borderColor: '#DDD', padding: 12 }}>
              <Text style={{ fontSize: 10, color: '#888', letterSpacing: 1, marginBottom: 8 }}>候选人档案</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 50, height: 50, backgroundColor: candidateFactionColor + '22',
                  borderWidth: 2, borderColor: candidateFactionColor, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 26 }}>👤</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#111' }}>{candidate.name}</Text>
                    <View style={{ backgroundColor: candidateFactionColor + '22', borderWidth: 1, borderColor: candidateFactionColor,
                      paddingHorizontal: 5, paddingVertical: 1 }}>
                      <Text style={{ fontSize: 9, color: candidateFactionColor, fontWeight: '700' }}>
                        {FACTION_LABEL[candidate.faction]}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 10, color: '#555', lineHeight: 15 }}>
                    {FACTION_DESC[candidate.faction]}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                    {[
                      { label: '能力', value: candidate.ability, color: '#2B4B6F' },
                      { label: '忠诚', value: candidate.loyalty, color: '#7B5E2A' },
                      { label: '廉洁', value: candidate.integrity, color: '#2a7a3b' },
                    ].map(m => (
                      <View key={m.label} style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: m.color }}>{m.value}</Text>
                        <Text style={{ fontSize: 9, color: '#888' }}>{m.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {/* 阶段：评议说明 */}
            {phase === 'intro' && (
              <>
                <View style={{ backgroundColor: '#FFF9E6', borderWidth: 1, borderColor: '#F0C050', padding: 12 }}>
                  <Text style={{ fontSize: 11, color: '#7A5C00', fontWeight: '700', marginBottom: 4 }}>📋 评议说明</Text>
                  <Text style={{ fontSize: 11, color: '#7A5C00', lineHeight: 18 }}>
                    依据《党政干部选拔任用工作条例》，{candidate.targetRole}属于重要岗位，须经民主评议程序。{'\n'}
                    · 共 {Math.max(3, participants.length)} 名参与评议人员{'\n'}
                    · 各官员将根据阵营、理念及利益立场投票{'\n'}
                    · 赞成票超过半数方可任命；未通过可强制任命，但将承受政治代价
                  </Text>
                </View>

                {/* 参与者阵营分布 */}
                {participants.length > 0 && (
                  <View>
                    <Text style={{ fontSize: 10, color: '#888', marginBottom: 6 }}>参与评议的官员阵营分布</Text>
                    <FactionDistribution participants={participants} />
                  </View>
                )}

                {/* 审批级别说明 */}
                <View style={{ backgroundColor: levelColor + '11', borderWidth: 1, borderColor: levelColor, padding: 10 }}>
                  <Text style={{ fontSize: 10, color: levelColor, fontWeight: '700' }}>
                    🏛 {approvalLevel}
                  </Text>
                  <Text style={{ fontSize: 10, color: levelColor, marginTop: 3, lineHeight: 16 }}>
                    {approvalLevel === '本级决定' && '此任命由本级党委或政府主官直接决定，无需上级审批。'}
                    {approvalLevel === '县级议政院/组织部审批' && '镇级党委书记/镇长的任命，须报请县委组织部和县议政院进行评议审批。'}
                    {approvalLevel === '地市级审批' && '县委书记/县长的任命，须报请地市级党委组织部进行审批。'}
                    {approvalLevel === '省级审批' && '市级正职的任命，须经省委组织部评议审批。'}
                    {approvalLevel === '中央审批' && '省级及以上核心职务由中央统一决策，通过全国议政院或中枢政治局审议。'}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    onPress={handleClose}
                    style={{ flex: 1, borderWidth: 1, borderColor: '#DDD', paddingVertical: 12, alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 13, color: '#666' }}>取消</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void handleStartVoting()}
                    style={{ flex: 2, backgroundColor: '#1D3B5E', paddingVertical: 12, alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 13, color: '#fff', fontWeight: '700' }}>🗳 开始民主评议</Text>
                  </Pressable>
                </View>
              </>
            )}

            {/* 阶段：计票中 */}
            {phase === 'voting' && isVoting && (
              <View style={{ alignItems: 'center', paddingVertical: 30, gap: 14 }}>
                <ActivityIndicator size="large" color="#1D3B5E" />
                <Text style={{ fontSize: 13, color: '#555', fontWeight: '600' }}>正在进行民主评议…</Text>
                <Text style={{ fontSize: 11, color: '#888' }}>各位官员正在依据自身立场表决</Text>
              </View>
            )}

            {/* 阶段：评议结果 */}
            {phase === 'result' && result && (
              <>
                {/* 结果标题 */}
                <View style={{
                  backgroundColor: result.passed ? '#e8f5e9' : '#fce8e8',
                  borderWidth: 2, borderColor: result.passed ? '#2a7a3b' : '#C82829',
                  padding: 14, alignItems: 'center', gap: 4,
                }}>
                  <Text style={{ fontSize: 24 }}>{result.passed ? '✅' : '⚠️'}</Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: result.passed ? '#2a7a3b' : '#C82829' }}>
                    {result.passed ? '民主评议通过' : '民主评议未通过'}
                  </Text>
                  <Text style={{ fontSize: 11, color: result.passed ? '#2a7a3b' : '#C82829' }}>
                    赞成率 {result.margin}%（{votes.length}人参与，过半数通过）
                  </Text>
                </View>

                {/* 投票进度条 */}
                <VoteBar result={result} />

                {/* 各官员投票明细 */}
                <View>
                  <Text style={{ fontSize: 11, color: '#888', fontWeight: '700', marginBottom: 6 }}>评议明细</Text>
                  <View style={{ gap: 6 }}>
                    {votes.map((v, i) => {
                      const voteColor = v.vote === '赞成' ? '#2a7a3b' : v.vote === '反对' ? '#C82829' : '#888';
                      const fc = FACTION_COLOR[v.faction];
                      return (
                        <View key={i} style={{
                          flexDirection: 'row', alignItems: 'flex-start', gap: 8,
                          padding: 8, backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#E8E8E8',
                        }}>
                          <View style={{ width: 32, height: 32, backgroundColor: fc + '22',
                            borderWidth: 1.5, borderColor: fc, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 18 }}>{v.avatarEmoji}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#222' }}>{v.name}</Text>
                              <View style={{ backgroundColor: fc + '18', borderWidth: 1, borderColor: fc, paddingHorizontal: 4, paddingVertical: 1 }}>
                                <Text style={{ fontSize: 8, color: fc }}>{FACTION_LABEL[v.faction]}</Text>
                              </View>
                            </View>
                            <Text style={{ fontSize: 10, color: '#666', lineHeight: 15 }}>{v.reason}</Text>
                          </View>
                          <View style={{ paddingHorizontal: 7, paddingVertical: 3, backgroundColor: voteColor, alignSelf: 'center' }}>
                            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{v.vote}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* 操作按钮 */}
                {!result.passed && (
                  <View style={{ backgroundColor: '#FFF3CD', borderWidth: 1, borderColor: '#FFCC02', padding: 10 }}>
                    <Text style={{ fontSize: 10, color: '#7A5C00', lineHeight: 16 }}>
                      ⚠️ 强制执行未通过的任命将导致 <Text style={{ fontWeight: '700' }}>上司好感 -10</Text>，并引发部分官员不满，需谨慎决策。
                    </Text>
                  </View>
                )}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    onPress={handleClose}
                    style={{ flex: 1, borderWidth: 1, borderColor: '#DDD', paddingVertical: 12, alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 12, color: '#666' }}>撤回提名</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleConfirm(!result.passed)}
                    style={{
                      flex: 2, paddingVertical: 12, alignItems: 'center',
                      backgroundColor: result.passed ? '#2a7a3b' : '#C82829',
                    }}
                  >
                    <Text style={{ fontSize: 12, color: '#fff', fontWeight: '700' }}>
                      {result.passed ? '✅ 正式任命' : '⚡ 强制任命（上司好感 -10）'}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default DemocraticReview;
