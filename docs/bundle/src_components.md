# src/components

共 75 个文件。
<a id="srccomponentsbosschangemodaltsx"></a>
## `src/components/BossChangeModal.tsx`

```tsx
// 上司换届通知弹窗（组织人事调整公文风格）
import { Modal, Pressable, Text, View } from 'react-native';
import type { BossChangeEvent } from '@/ctx/GameContext';

interface Props {
  event: BossChangeEvent;
  onConfirm: () => void;
}

const BOSS_NUM_LABEL: Record<number, string> = {
  1: '直属上级',
  2: '二级上级',
  3: '三级上级',
};

export function BossChangeModal({ event, onConfirm }: Props) {
  const docNum = `组干字〔${new Date().getFullYear()}〕第 ${Math.floor(Math.random() * 90 + 10)} 号`;
  const favorDesc = event.newFavor >= 50
    ? `初步了解（好感 ${event.newFavor}），需主动维护关系`
    : `尚不熟悉（好感 ${event.newFavor}），需尽快建立信任`;

  return (
    <Modal transparent animationType="fade" visible>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={{ width: '100%', maxWidth: 440, backgroundColor: '#F5F4F1', borderWidth: 1, borderColor: '#1D3557' }}>
          {/* 蓝色公文头 */}
          <View style={{ backgroundColor: '#1D3557', paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 11, letterSpacing: 5, marginBottom: 4, opacity: 0.80 }}>
              中共  组织部  干部人事局
            </Text>
            <Text style={{ color: '#A8D0F5', fontSize: 18, fontWeight: 'bold', letterSpacing: 3, fontFamily: 'serif' }}>
              干部职务调整通知
            </Text>
          </View>

          {/* 金色装饰线 */}
          <View style={{ height: 2, backgroundColor: '#C8A84B' }} />

          {/* 文号 */}
          <View style={{ backgroundColor: '#EEF3F8', paddingHorizontal: 20, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#D0DCE8' }}>
            <Text style={{ fontSize: 11, color: '#888', textAlign: 'right', fontFamily: 'serif' }}>{docNum}</Text>
          </View>

          {/* 正文 */}
          <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12 }}>
            <Text style={{ fontSize: 13, color: '#1D3557', fontWeight: '700', marginBottom: 14, fontFamily: 'serif' }}>
              {BOSS_NUM_LABEL[event.bossNum]} 职务变动：
            </Text>

            {/* 离任卡 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, padding: 12, backgroundColor: '#F0EDE8', borderWidth: 1, borderColor: '#D0C8B8' }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#CCC', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Text style={{ fontSize: 16 }}>👤</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, color: '#555', fontFamily: 'serif' }}>
                  <Text style={{ fontWeight: '700', color: '#333' }}>{event.oldBossName}</Text> 同志
                </Text>
                <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                  职务：{event.position}  ·  任期届满，荣休
                </Text>
              </View>
              <View style={{ backgroundColor: '#888', paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>离任</Text>
              </View>
            </View>

            {/* 箭头 */}
            <Text style={{ textAlign: 'center', color: '#1D3557', fontSize: 18, marginVertical: 4 }}>↓</Text>

            {/* 接任卡 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, padding: 12, backgroundColor: '#EEF3F8', borderWidth: 1, borderColor: '#1D3557' }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#1D3557', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Text style={{ fontSize: 16 }}>🧑‍💼</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, color: '#1D3557', fontFamily: 'serif' }}>
                  <Text style={{ fontWeight: '700' }}>{event.newBossName}</Text> 同志
                </Text>
                <Text style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                  职务：{event.position}  ·  正式履职
                </Text>
              </View>
              <View style={{ backgroundColor: '#1D3557', paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>接任</Text>
              </View>
            </View>

            {/* 关系提示 */}
            <View style={{ backgroundColor: '#FFF9E6', borderLeftWidth: 3, borderLeftColor: '#C8A84B', paddingVertical: 8, paddingHorizontal: 12 }}>
              <Text style={{ fontSize: 11, color: '#7B5E2A', lineHeight: 18 }}>
                📌 与新上级的关系：{favorDesc}
              </Text>
              <Text style={{ fontSize: 11, color: '#999', marginTop: 4, lineHeight: 16 }}>
                提示：及时汇报工作、拜访联络，有助于尽快建立信任，保持晋升通道畅通。
              </Text>
            </View>

            {/* 落款 */}
            <View style={{ alignItems: 'flex-end', marginTop: 14 }}>
              <Text style={{ fontSize: 11, color: '#888', fontFamily: 'serif' }}>
                中共中枢组织部  干部一局
              </Text>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: '#DDD', marginHorizontal: 20 }} />

          <View style={{ padding: 16 }}>
            <Pressable
              onPress={onConfirm}
              style={{ backgroundColor: '#1D3557', paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold', letterSpacing: 2 }}>悉知，继续工作</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
```

<a id="srccomponentscoordinationtabtsx"></a>
## `src/components/CoordinationTab.tsx`

```tsx
// 非正式资源协调 Tab：四档协调（小额/中额/大额/巨额），合法或赃款输送
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useGame } from '@/ctx/GameContext';
import { COORD_TIERS, COORD_RISK, PATRONAGE_TIERS } from '@/lib/promotionConfig';
import { computeCoordProb, hasPatronage } from '@/lib/promotionEngine';
import type { CoordTier } from '@/lib/promotionConfig';

function fmt(yuan: number): string {
  if (yuan >= 100000000) return `${(yuan / 100000000).toFixed(2)} 亿`;
  if (yuan >= 10000) return `${(yuan / 10000).toFixed(1)} 万`;
  return `${yuan.toLocaleString()} 元`;
}

export function CoordinationTab() {
  const { save, updateGameSave } = useGame();
  const [tier, setTier] = useState<CoordTier | null>(null);
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState<'legal' | 'illicit'>('legal');
  const [feedback, setFeedback] = useState('');

  if (!save) return null;
  const favors = [save.bossFavor, save.boss2Favor, save.boss3Favor];
  const minFavor = Math.min(...favors);

  const handleConfirm = async () => {
    if (!tier) return;
    const amt = Math.floor(Number(amount) || 0);
    if (amt < tier.amountMin || amt > tier.amountMax) {
      setFeedback(`金额需在 ${fmt(tier.amountMin)} ~ ${fmt(tier.amountMax)} 之间`);
      return;
    }
    if (source === 'legal' && amt > save.personalSavings) {
      setFeedback('合法存款不足');
      return;
    }
    if (source === 'illicit' && amt > save.illicit_funds) {
      setFeedback('赃款余额不足');
      return;
    }
    const prob = computeCoordProb(tier.id, minFavor, save.bribe_count, save.riskValue, source);
    const gain = tier.favorGain;
    const updates: Parameters<typeof updateGameSave>[0] = {
      bribe_count: save.bribe_count + 1,
      last_bribe_day: save.gameDays,
      bribe_log: [...(save.bribe_log ?? []), {
        gameDay: save.gameDays, target: '上级', tier: tier.id, amount: amt, source,
      }],
      bossFavor: Math.min(100, save.bossFavor + gain),
      boss2Favor: Math.min(100, save.boss2Favor + gain),
      boss3Favor: Math.min(100, save.boss3Favor + gain),
    };
    if (source === 'legal') updates.personalSavings = save.personalSavings - amt;
    else updates.illicit_funds = save.illicit_funds - amt;
    if (hasPatronage(tier.id)) updates.patronage = true;
    await updateGameSave(updates);
    setFeedback(`已向协调对象输送 ${fmt(amt)}（${source === 'legal' ? '合法存款' : '赃款'}），认可度 +${tier.favorGain}，查获概率 ${prob}%`);
    setTier(null);
    setAmount('');
  };

  return (
    <View style={{ padding: 14, gap: 12 }}>
      {feedback ? (
        <View style={{ backgroundColor: '#fff3e0', borderWidth: 1, borderColor: '#ffe0b2', padding: 10 }}>
          <Text style={{ color: '#e65100', fontSize: 11, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      <View style={{ backgroundColor: '#7C3AED', padding: 14 }}>
        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 2 }}>🤝 非正式资源协调</Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 6, lineHeight: 16 }}>
          向上级输送资源以换取认可度与晋升评分加分。大额/巨额协调可形成「庇护」状态。查获将触发纪检风险。
        </Text>
      </View>

      <View style={{ gap: 8 }}>
        {COORD_TIERS.map(t => {
          const prob = computeCoordProb(t.id, minFavor, save.bribe_count, save.riskValue, source);
          return (
            <Pressable key={t.id} onPress={() => setTier(t)} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1A1A1A' }}>{t.name}</Text>
                {PATRONAGE_TIERS.includes(t.id) ? <Text style={{ fontSize: 9, color: '#7C3AED', fontWeight: '700' }}>可形成庇护</Text> : null}
              </View>
              <Text style={{ fontSize: 10, color: '#999', marginTop: 4 }}>金额区间 {fmt(t.amountMin)} ~ {fmt(t.amountMax)}</Text>
              <Text style={{ fontSize: 10, color: '#999', marginTop: 2 }}>认可度 +{t.favorGain} · 评分 +{t.scoreGain} · 当前查获概率 {prob}%</Text>
            </Pressable>
          );
        })}
      </View>

      <Modal visible={!!tier} transparent animationType="fade" onRequestClose={() => setTier(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#fff', padding: 18 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 }}>{tier?.name}</Text>
            <Text style={{ fontSize: 11, color: '#999', marginBottom: 10 }}>金额区间 {tier ? fmt(tier.amountMin) : ''} ~ {tier ? fmt(tier.amountMax) : ''}</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="输入输送金额"
              placeholderTextColor="#bbb"
              style={{ borderWidth: 1, borderColor: '#D9D9D9', padding: 10, fontSize: 13, fontFamily: 'monospace' }}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Pressable onPress={() => setSource('legal')} style={{ flex: 1, borderWidth: 1, borderColor: source === 'legal' ? '#2a7a3b' : '#D9D9D9', paddingVertical: 10, alignItems: 'center', backgroundColor: source === 'legal' ? '#E8F5E9' : '#fff' }}>
                <Text style={{ fontSize: 12, color: source === 'legal' ? '#2a7a3b' : '#888', fontWeight: '600' }}>合法存款</Text>
              </Pressable>
              <Pressable onPress={() => setSource('illicit')} style={{ flex: 1, borderWidth: 1, borderColor: source === 'illicit' ? '#C82829' : '#D9D9D9', paddingVertical: 10, alignItems: 'center', backgroundColor: source === 'illicit' ? '#FFF3F3' : '#fff' }}>
                <Text style={{ fontSize: 12, color: source === 'illicit' ? '#C82829' : '#888', fontWeight: '600' }}>赃款</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Pressable onPress={() => setTier(null)} style={{ flex: 1, borderWidth: 1, borderColor: '#999', paddingVertical: 11, alignItems: 'center' }}>
                <Text style={{ color: '#555', fontSize: 13 }}>取消</Text>
              </Pressable>
              <Pressable onPress={handleConfirm} style={{ flex: 1, backgroundColor: '#C82829', paddingVertical: 11, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>确认输送</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
```

<a id="srccomponentsdemocraticreviewtsx"></a>
## `src/components/DemocraticReview.tsx`

```tsx
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
```

<a id="srccomponentsdisciplinewarnmodaltsx"></a>
## `src/components/DisciplineWarnModal.tsx`

```tsx
// 纪委约谈 / 立案审查 弹窗组件（公文红头文件风格）
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import type { DisciplineWarnEvent } from '@/ctx/GameContext';

interface Props {
  event: DisciplineWarnEvent;
  onConfirm: () => void; // 确认后由 home.tsx 执行扣分逻辑
}

export function DisciplineWarnModal({ event, onConfirm }: Props) {
  const [confirming, setConfirming] = useState(false);
  const isInvestigation = event.type === 'investigation';

  const headerBg    = isInvestigation ? '#7B0000' : '#9E2A2B';
  const titleText   = isInvestigation ? '立案审查通知书' : '纪委约谈通知';
  const docNum      = isInvestigation
    ? `纪审函〔${new Date().getFullYear()}〕第 ${Math.floor(Math.random() * 90 + 10)} 号`
    : `纪谈字〔${new Date().getFullYear()}〕第 ${Math.floor(Math.random() * 90 + 10)} 号`;
  const btnLabel    = isInvestigation ? '知悉，接受审查' : '知悉，接受约谈';
  const penaltyText = isInvestigation
    ? `政绩扣除 ${event.meritPenalty} 分，民心下降 ${Math.abs(event.moralChange)} 点`
    : `政绩扣除 ${event.meritPenalty} 分，民心回升 ${event.moralChange} 点（警示效果）`;

  const handleConfirm = async () => {
    setConfirming(true);
    onConfirm();
  };

  return (
    <Modal transparent animationType="fade" visible>
      {/* 遮罩 */}
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.70)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        {/* 文件卡片 */}
        <View style={{ width: '100%', maxWidth: 440, backgroundColor: '#F5F4F1', borderWidth: 1, borderColor: '#8B1A1A' }}>
          {/* 红头区域 */}
          <View style={{ backgroundColor: headerBg, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 11, letterSpacing: 6, marginBottom: 4, opacity: 0.85 }}>
              华夏人民共和国  纪检监察委员会
            </Text>
            <Text style={{ color: '#FFD700', fontSize: 20, fontWeight: 'bold', letterSpacing: 4, fontFamily: 'serif' }}>
              {titleText}
            </Text>
          </View>

          {/* 红线 */}
          <View style={{ height: 3, backgroundColor: '#C82829' }} />

          {/* 文号区 */}
          <View style={{ backgroundColor: '#FFF8F0', paddingHorizontal: 20, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E0D0C0' }}>
            <Text style={{ fontSize: 11, color: '#888', textAlign: 'right', fontFamily: 'serif' }}>{docNum}</Text>
          </View>

          {/* 正文 */}
          <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12 }}>
            {/* 称谓 */}
            <Text style={{ fontSize: 14, color: '#1D3557', fontWeight: '700', marginBottom: 10, fontFamily: 'serif' }}>
              同志：
            </Text>
            {/* 正文内容 */}
            <Text style={{ fontSize: 13, color: '#2C2C2C', lineHeight: 22, textAlign: 'justify', fontFamily: 'serif' }}>
              {event.content}
            </Text>

            {/* 警示框 */}
            <View style={{
              marginTop: 16, borderLeftWidth: 4, borderLeftColor: headerBg,
              backgroundColor: isInvestigation ? '#FFF0F0' : '#FFF8E1',
              paddingVertical: 10, paddingHorizontal: 14,
            }}>
              <Text style={{ fontSize: 12, color: headerBg, fontWeight: '700', marginBottom: 3 }}>
                {isInvestigation ? '⚠️ 组织处理' : '📋 提醒处理'}
              </Text>
              <Text style={{ fontSize: 11, color: '#555', lineHeight: 18 }}>{penaltyText}</Text>
              {isInvestigation && (
                <Text style={{ fontSize: 11, color: '#C82829', marginTop: 4, fontWeight: '600' }}>
                  警告：若民心降至 0，将被立案查处，仕途终结。
                </Text>
              )}
            </View>

            {/* 落款 */}
            <View style={{ alignItems: 'flex-end', marginTop: 16 }}>
              <Text style={{ fontSize: 11, color: '#888', fontFamily: 'serif' }}>
                经办：{event.officerName}
              </Text>
              <Text style={{ fontSize: 11, color: '#888', fontFamily: 'serif', marginTop: 2 }}>
                {new Date().getFullYear()} 年  组织部
              </Text>
            </View>
          </View>

          {/* 分割线 */}
          <View style={{ height: 1, backgroundColor: '#DDD', marginHorizontal: 20 }} />

          {/* 按钮区 */}
          <View style={{ padding: 16, alignItems: 'center' }}>
            <Pressable
              onPress={handleConfirm}
              disabled={confirming}
              style={{
                backgroundColor: confirming ? '#aaa' : headerBg,
                paddingVertical: 12, paddingHorizontal: 40,
                width: '100%', alignItems: 'center',
              }}
            >
              {confirming
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold', letterSpacing: 2 }}>{btnLabel}</Text>
              }
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
```

<a id="srccomponentsgameplaycardlisttsx"></a>
## `src/components/GameplayCardList.tsx`

```tsx
// 通用玩法页面模板：读配置表 → 按职级过滤 → 循环渲染卡片 → Tab分页 → 点卡片弹统一确认面板
import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getRankTheme } from '@/lib/rankTheme';
import { isGameplayUnlocked, getConfigsByCategory } from '@/lib/gameplayConfig';
import type { GameplayConfig, GameplayCategory } from '@/types/game';

interface GameplayCardListProps {
  title: string;
  subtitle?: string;
  tabs: { key: GameplayCategory; label: string }[];
  // 执行动作：返回 { ok, message }；返回 undefined 表示该卡片无动作（如展示型）
  onAction?: (config: GameplayConfig) => Promise<{ ok: boolean; message: string } | undefined>;
  // 是否显示该卡片（除了解锁外额外条件，如审查阶段）
  canShow?: (config: GameplayConfig) => boolean;
  // 自定义卡片右侧额外信息
  renderExtra?: (config: GameplayConfig) => React.ReactNode;
  loading?: boolean;
}

export function GameplayCardList({ title, subtitle, tabs, onAction, canShow, renderExtra, loading }: GameplayCardListProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save } = useGame();
  const theme = getRankTheme(save?.rankLevel ?? 1);
  const [activeTab, setActiveTab] = useState<GameplayCategory>(tabs[0].key);
  const [selected, setSelected] = useState<GameplayConfig | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const configs = useMemo(() => {
    const list = getConfigsByCategory(activeTab);
    return canShow ? list.filter(canShow) : list;
  }, [activeTab, canShow]);

  const rankLevel = save?.rankLevel ?? 1;

  const handleConfirm = async () => {
    if (!selected || !onAction) return;
    setSubmitting(true);
    try {
      const res = await onAction(selected);
      setResult(res ?? { ok: true, message: '操作完成' });
    } catch (e: unknown) {
      setResult({ ok: false, message: e instanceof Error ? e.message : '操作失败' });
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setSelected(null);
    setResult(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <StatusBar style="light" />
      {/* 顶部标题栏 */}
      <View style={{ backgroundColor: theme.headerBg, paddingTop: insets.top, paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: theme.accentSub }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable cssInterop={false} onPress={() => router.back()} hitSlop={8}>
            <Text style={{ color: theme.headerText, fontSize: 22 }}>←</Text>
          </Pressable>
          <Text style={{ color: theme.headerText, fontSize: 16, fontWeight: '700', letterSpacing: 2 }}>{title}</Text>
        </View>
        {subtitle ? <Text style={{ color: theme.headerSub, fontSize: 11, marginTop: 4 }}>{subtitle}</Text> : null}
      </View>

      {/* Tab 分页 */}
      <View style={{ flexDirection: 'row', backgroundColor: theme.sectionHeaderBg, borderBottomWidth: 1, borderBottomColor: theme.cardBorder }}>
        {tabs.map((t) => {
          const on = t.key === activeTab;
          return (
            <Pressable key={t.key} cssInterop={false} onPress={() => setActiveTab(t.key)} style={{ flex: 1, paddingVertical: 9, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: on ? theme.accent : 'transparent', backgroundColor: on ? theme.accentBg : 'transparent' }}>
              <Text style={{ color: on ? theme.accent : theme.mutedText, fontSize: 11, fontWeight: on ? '700' : '400' }}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {configs.length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 30, marginBottom: 8 }}>📭</Text>
              <Text style={{ color: theme.mutedText, fontSize: 12 }}>暂无可操作内容</Text>
            </View>
          ) : (
            configs.map((c) => {
              const unlocked = isGameplayUnlocked(c.unlockRank, rankLevel);
              return (
                <Pressable
                  key={c.id}
                  cssInterop={false}
                  disabled={!unlocked}
                  onPress={() => { setSelected(c); setResult(null); }}
                  style={{
                    backgroundColor: theme.cardBg,
                    borderWidth: 1,
                    borderColor: unlocked ? theme.cardBorder : theme.mutedText,
                    borderStyle: unlocked ? 'solid' : 'dashed',
                    opacity: unlocked ? 1 : 0.5,
                    padding: 12,
                    borderCurve: 'continuous',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 24 }}>{c.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ color: theme.valueText, fontSize: 13, fontWeight: '700' }}>{c.name}</Text>
                        {!unlocked && (
                          <View style={{ borderWidth: 1, borderColor: theme.mutedText, paddingHorizontal: 4 }}>
                            <Text style={{ color: theme.mutedText, fontSize: 9 }}>🔒 {c.unlockRank}级</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ color: theme.mutedText, fontSize: 10, marginTop: 2 }} numberOfLines={1}>{c.params.desc}</Text>
                    </View>
                    {renderExtra ? renderExtra(c) : null}
                  </View>
                  {/* 参数标签 */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                    <ParamTag label="收益" value={c.params.gainMin !== undefined ? `${formatMoney(c.params.gainMin)}~${formatMoney(c.params.gainMax ?? c.params.gainMin)}` : undefined} theme={theme} />
                    <ParamTag label="风险" value={c.params.risk !== undefined ? `+${c.params.risk}` : undefined} theme={theme} danger />
                    <ParamTag label="民心" value={c.params.moral !== undefined ? `-${c.params.moral}` : undefined} theme={theme} danger />
                    <ParamTag label="成功率" value={c.params.successRate !== undefined ? `${Math.round(c.params.successRate * 100)}%` : undefined} theme={theme} />
                    <ParamTag label="冷却" value={c.params.cooldown !== undefined ? `${c.params.cooldown}天` : undefined} theme={theme} />
                    <ParamTag label="线索" value={c.params.clueValue !== undefined ? `+${c.params.clueValue}` : undefined} theme={theme} danger />
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}

      {/* 统一确认面板 */}
      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.accent, borderCurve: 'continuous' }}>
            <View style={{ backgroundColor: theme.headerBg, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 22 }}>{selected?.icon}</Text>
              <Text style={{ color: theme.headerText, fontSize: 14, fontWeight: '700' }}>{selected?.name}</Text>
            </View>
            <View style={{ padding: 14, gap: 8 }}>
              <Text style={{ color: theme.mutedText, fontSize: 11 }}>{selected?.params.desc}</Text>
              {result ? (
                <View style={{ borderWidth: 1, borderColor: result.ok ? theme.statHigh : theme.accent, padding: 8, backgroundColor: result.ok ? 'rgba(42,122,59,0.08)' : 'rgba(200,40,41,0.08)' }}>
                  <Text style={{ color: result.ok ? theme.statHigh : theme.accent, fontSize: 11 }}>{result.message}</Text>
                </View>
              ) : (
                <View style={{ gap: 4 }}>
                  {selected?.params.gainMin !== undefined && <ConfirmRow label="预计收益" value={`${formatMoney(selected.params.gainMin)} ~ ${formatMoney(selected.params.gainMax ?? selected.params.gainMin)}`} theme={theme} />}
                  {selected?.params.risk !== undefined && <ConfirmRow label="风险增幅" value={`+${selected.params.risk}`} theme={theme} danger />}
                  {selected?.params.moral !== undefined && <ConfirmRow label="民心损耗" value={`-${selected.params.moral}`} theme={theme} danger />}
                  {selected?.params.successRate !== undefined && <ConfirmRow label="成功率" value={`${Math.round(selected.params.successRate * 100)}%`} theme={theme} />}
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <Pressable cssInterop={false} onPress={closeModal} style={{ flex: 1, borderWidth: 1, borderColor: theme.cardBorder, paddingVertical: 10, alignItems: 'center' }}>
                  <Text style={{ color: theme.mutedText, fontSize: 12 }}>{result ? '关闭' : '取消'}</Text>
                </Pressable>
                {!result && (
                  <Pressable cssInterop={false} disabled={submitting} onPress={handleConfirm} style={{ flex: 1, backgroundColor: theme.accent, paddingVertical: 10, alignItems: 'center', opacity: submitting ? 0.6 : 1 }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{submitting ? '处理中...' : '确认执行'}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ParamTag({ label, value, theme, danger }: { label: string; value?: string; theme: ReturnType<typeof getRankTheme>; danger?: boolean }) {
  if (value === undefined) return null;
  const color = danger ? theme.accent : theme.mutedText;
  return (
    <View style={{ borderWidth: 1, borderColor: color, paddingHorizontal: 5, paddingVertical: 1 }}>
      <Text style={{ fontSize: 9, color }}>{label}{value}</Text>
    </View>
  );
}

function ConfirmRow({ label, value, theme, danger }: { label: string; value: string; theme: ReturnType<typeof getRankTheme>; danger?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: theme.mutedText, fontSize: 11 }}>{label}</Text>
      <Text style={{ color: danger ? theme.accent : theme.valueText, fontSize: 11, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

function formatMoney(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(n % 10000 === 0 ? 0 : 1)}万`;
  return `${n.toLocaleString()}元`;
}
```

<a id="srccomponentsillicitfundstabtsx"></a>
## `src/components/IllicitFundsTab.tsx`

```tsx
// 赃款账户 Tab：赃款总额、来源明细、洗白七方式、藏匿方式
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useGame } from '@/ctx/GameContext';
import {
  LAUNDER_METHODS, HIDING_METHODS, LAUNDER_RISK_DIVISOR, HIDING_EXTRA_RECOVERY,
} from '@/lib/promotionConfig';
import { computeLaunderProb } from '@/lib/promotionEngine';
import type { LaunderMethod } from '@/lib/promotionConfig';

function fmt(yuan: number): string {
  if (yuan >= 100000000) return `${(yuan / 100000000).toFixed(2)} 亿`;
  if (yuan >= 10000) return `${(yuan / 10000).toFixed(1)} 万`;
  return `${yuan.toLocaleString()} 元`;
}

const RISK_LABEL: Record<string, string> = { low: '低', mid: '中', high: '高', extreme: '极高' };

export function IllicitFundsTab() {
  const { save, updateGameSave } = useGame();
  const [launderMethod, setLaunderMethod] = useState<LaunderMethod | null>(null);
  const [amount, setAmount] = useState('');
  const [feedback, setFeedback] = useState('');

  if (!save) return null;
  const funds = save.illicit_funds ?? 0;
  const sources = save.illicit_source_log ?? [];
  const laundering = save.laundering_log ?? [];

  const handleLaunder = async () => {
    if (!launderMethod) return;
    const amt = Math.floor(Number(amount) || 0);
    if (amt <= 0 || amt > funds) { setFeedback('请输入合法金额且不超过赃款余额'); return; }
    const fee = launderMethod.fee;
    const net = Math.round(amt * (1 - fee));
    const entry = {
      gameDay: save.gameDays,
      methodId: launderMethod.id,
      methodName: launderMethod.name,
      amount: amt,
      fee,
      netAmount: net,
      days: launderMethod.days,
      endDay: save.gameDays + launderMethod.days,
      status: 'processing' as const,
    };
    const prob = computeLaunderProb(launderMethod.baseProb, save.riskValue);
    await updateGameSave({
      illicit_funds: funds - amt,
      laundering_log: [...laundering, entry],
    });
    setFeedback(`已发起「${launderMethod.name}」洗白，金额 ${fmt(amt)}，手续费 ${(fee * 100).toFixed(0)}%，周期 ${launderMethod.days} 天，查获概率 ${prob}%`);
    setLaunderMethod(null);
    setAmount('');
  };

  const handleHiding = async (id: string, name: string) => {
    await updateGameSave({ funds_hiding: id });
    setFeedback(`已选择「${name}」藏匿方式，查获时可追缴比例将降低`);
  };

  return (
    <View style={{ padding: 14, gap: 12 }}>
      {feedback ? (
        <View style={{ backgroundColor: '#fff3e0', borderWidth: 1, borderColor: '#ffe0b2', padding: 10 }}>
          <Text style={{ color: '#e65100', fontSize: 11, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      {/* 赃款总额 */}
      <View style={{ backgroundColor: '#1A1A1A', padding: 16 }}>
        <Text style={{ color: '#aaa', fontSize: 10, letterSpacing: 2 }}>赃款账户余额</Text>
        <Text style={{ color: '#FFD700', fontSize: 26, fontWeight: '800', fontFamily: 'monospace', marginTop: 4 }}>{fmt(funds)}</Text>
        <Text style={{ color: '#888', fontSize: 10, marginTop: 6 }}>
          藏匿方式：{save.funds_hiding ? HIDING_METHODS.find(h => h.id === save.funds_hiding)?.name ?? '未设置' : '未设置'}
        </Text>
      </View>

      {/* 来源明细 */}
      <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 14 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D3B5E', letterSpacing: 2, marginBottom: 8 }}>来源明细</Text>
        {sources.length === 0 ? (
          <Text style={{ fontSize: 11, color: '#aaa', textAlign: 'center', paddingVertical: 12 }}>暂无赃款来源记录</Text>
        ) : sources.slice(-6).reverse().map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
            <Text style={{ fontSize: 11, color: '#666' }}>{s.channel}</Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#C82829', fontFamily: 'monospace' }}>+{fmt(s.amount)}</Text>
          </View>
        ))}
      </View>

      {/* 洗白方式 */}
      <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 14 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D3B5E', letterSpacing: 2, marginBottom: 8 }}>洗白方式（扣除手续费后转为合法存款）</Text>
        <View style={{ gap: 8 }}>
          {LAUNDER_METHODS.map(m => {
            const unlocked = save.rankLevel >= m.unlockRank;
            const prob = computeLaunderProb(m.baseProb, save.riskValue);
            return (
              <Pressable
                key={m.id}
                onPress={() => unlocked && setLaunderMethod(m)}
                disabled={!unlocked}
                style={{ borderWidth: 1, borderColor: unlocked ? '#D9D9D9' : '#EEE', padding: 10, backgroundColor: unlocked ? '#FFFCF5' : '#F7F7F7' }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: unlocked ? '#1A1A1A' : '#bbb' }}>{m.name}</Text>
                  <Text style={{ fontSize: 10, color: unlocked ? '#999' : '#ccc' }}>{unlocked ? `手续费 ${(m.fee * 100).toFixed(0)}%` : `${m.unlockRank}级解锁`}</Text>
                </View>
                <Text style={{ fontSize: 10, color: '#999', marginTop: 3 }}>周期 {m.days} 天 · 查获风险{RISK_LABEL[m.risk]} · 基础查获概率 {m.baseProb}%（当前 {prob}%）</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 藏匿方式 */}
      <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 14 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D3B5E', letterSpacing: 2, marginBottom: 8 }}>赃款藏匿方式</Text>
        <View style={{ gap: 8 }}>
          {HIDING_METHODS.map(h => (
            <Pressable
              key={h.id}
              onPress={() => handleHiding(h.id, h.name)}
              style={{ borderWidth: 1, borderColor: save.funds_hiding === h.id ? '#C82829' : '#D9D9D9', padding: 10, backgroundColor: save.funds_hiding === h.id ? '#FFF3F3' : '#FFFCF5' }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#1A1A1A' }}>{h.name}</Text>
                <Text style={{ fontSize: 10, color: '#999' }}>可追缴 {(h.recoveryRate * 100).toFixed(0)}%</Text>
              </View>
            </Pressable>
          ))}
        </View>
        <Text style={{ fontSize: 10, color: '#999', marginTop: 8 }}>藏匿被查获时，额外增加 {(HIDING_EXTRA_RECOVERY * 100).toFixed(0)}% 涉案金额认定（加重情节）</Text>
      </View>

      {/* 洗白确认弹窗 */}
      <Modal visible={!!launderMethod} transparent animationType="fade" onRequestClose={() => setLaunderMethod(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#fff', padding: 18 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 }}>{launderMethod?.name}</Text>
            <Text style={{ fontSize: 11, color: '#999', marginBottom: 12 }}>手续费 {(launderMethod ? launderMethod.fee * 100 : 0).toFixed(0)}% · 周期 {launderMethod?.days} 天</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder={`输入洗白金额（最多 ${fmt(funds)}）`}
              placeholderTextColor="#bbb"
              style={{ borderWidth: 1, borderColor: '#D9D9D9', padding: 10, fontSize: 13, fontFamily: 'monospace' }}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Pressable onPress={() => setLaunderMethod(null)} style={{ flex: 1, borderWidth: 1, borderColor: '#999', paddingVertical: 11, alignItems: 'center' }}>
                <Text style={{ color: '#555', fontSize: 13 }}>取消</Text>
              </Pressable>
              <Pressable onPress={handleLaunder} style={{ flex: 1, backgroundColor: '#C82829', paddingVertical: 11, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>确认洗白</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
```

<a id="srccomponentsleadershipmeetingmodaltsx"></a>
## `src/components/LeadershipMeetingModal.tsx`

```tsx
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
```

<a id="srccomponentsnavcardtsx"></a>
## `src/components/NavCard.tsx`

```tsx
// 功能入口按钮卡片 —— 随职级主题动态切换风格
import { Pressable, Text, View } from 'react-native';
import type { RankTheme } from '@/lib/rankTheme';

interface NavCardProps {
  label: string;
  icon: string;
  badge?: number;
  onPress: () => void;
  accent?: boolean;   // 强调样式（重要功能）
  locked?: boolean;   // 未解锁状态
  unlockLevel?: number;
  theme?: RankTheme;  // 职级主题（可选，未传则使用默认县处级风格）
}

export function NavCard({ label, icon, badge, onPress, accent = false, locked = false, unlockLevel, theme }: NavCardProps) {
  const bg         = theme?.navCardBg          ?? '#FFFFFF';
  const border     = theme?.navCardBorder       ?? '#D8D4CE';
  const bottom     = theme?.navCardBottomBorder ?? '#2B4B6F';
  const accentBg   = theme?.navCardAccentBg     ?? '#C82829';
  const accentBd   = theme?.navCardAccentBorder ?? '#C82829';
  const accentBot  = theme?.navCardAccentBottom ?? '#9E1E1E';
  const accentBar  = theme?.cardAccentBar       ?? '#2B4B6F';
  const cardBg     = accent ? accentBg  : bg;
  const cardBorder = accent ? accentBd  : border;
  const cardBottom = accent ? accentBot : bottom;

  if (locked) {
    return (
      <View style={{
        flex: 1, minHeight: 74, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: border, borderStyle: 'dashed',
        backgroundColor: bg, opacity: 0.45, padding: 10,
      }}>
        <Text style={{ fontSize: 20, marginBottom: 3 }}>{icon}</Text>
        <Text style={{ fontSize: 10, color: theme?.mutedText ?? '#AEAAA4', fontWeight: '600' }}>{label}</Text>
        {unlockLevel !== undefined && (
          <Text style={{ fontSize: 8, color: theme?.mutedText ?? '#C8C5BE', marginTop: 2 }}>🔒 {unlockLevel}级解锁</Text>
        )}
      </View>
    );
  }

  return (
    <Pressable
      cssInterop={false}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 74,
        backgroundColor: cardBg,
        borderWidth: 1,
        borderColor: cardBorder,
        borderBottomWidth: 3,
        borderBottomColor: cardBottom,
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
      android_ripple={{ color: accent ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)' }}
    >
      {/* 左侧竖条 */}
      <View style={{
        position: 'absolute', top: 0, left: 0,
        width: 3, height: '100%',
        backgroundColor: accent ? (theme?.primaryText === '#FFE08A' ? '#FFDE00' : 'rgba(255,255,255,0.4)') : accentBar,
      }} />
      <Text style={{ fontSize: 22, marginBottom: 3 }}>{icon}</Text>
      <Text style={{
        fontSize: 11, fontWeight: '700', letterSpacing: 0.5,
        color: accent ? (theme?.primaryText ?? '#fff') : (theme?.valueText ?? '#1A2B3C'),
      }}>{label}</Text>
      {badge !== undefined && badge > 0 && (
        <View style={{
          position: 'absolute', top: 5, right: 5,
          backgroundColor: accent ? '#fff' : (theme?.badgeBg ?? '#C82829'),
          minWidth: 17, height: 17,
          alignItems: 'center', justifyContent: 'center',
          paddingHorizontal: 3,
        }}>
          <Text style={{
            color: accent ? (theme?.accent ?? '#C82829') : (theme?.badgeText ?? '#fff'),
            fontSize: 9, fontWeight: '700',
          }}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}
```

<a id="srccomponentsofficialdocumentmodaltsx"></a>
## `src/components/OfficialDocumentModal.tsx`

```tsx
// 红头公文弹窗组件（考察谈话/任职公示/任职通知/组织谈话 统一公文风格）
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface OfficialDocumentModalProps {
  visible: boolean;
  header: string;        // 发文机关（红色大字）
  title: string;         // 文件标题
  docNo?: string;        // 文号
  sealText?: string;     // 印章文字
  children: React.ReactNode;
  onClose?: () => void;
  primaryAction?: { label: string; onPress: () => void };
  secondaryAction?: { label: string; onPress: () => void };
  dismissable?: boolean; // 是否允许点遮罩关闭
}

export function OfficialDocumentModal({
  visible, header, title, docNo, sealText, children,
  onClose, primaryAction, secondaryAction, dismissable = true,
}: OfficialDocumentModalProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => dismissable && onClose?.()}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 }}>
        <View style={{
          backgroundColor: '#FFFCF5', borderWidth: 2, borderColor: '#C82829', maxHeight: '85%',
        }}>
          {/* 红头 */}
          <View style={{ borderBottomWidth: 2, borderBottomColor: '#C82829', paddingVertical: 14, alignItems: 'center' }}>
            <Text style={{ color: '#C82829', fontSize: 18, fontWeight: '900', letterSpacing: 4 }}>{header}</Text>
            {docNo ? <Text style={{ color: '#C82829', fontSize: 11, marginTop: 4 }}>{docNo}</Text> : null}
          </View>
          {/* 标题 */}
          <View style={{ paddingVertical: 12, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E8D9B5' }}>
            <Text style={{ color: '#1A1A1A', fontSize: 15, fontWeight: '700', letterSpacing: 2 }}>{title}</Text>
          </View>
          {/* 正文 */}
          <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ padding: 18 }}>
            {children}
          </ScrollView>
          {/* 印章 */}
          {sealText ? (
            <View style={{ alignItems: 'flex-end', paddingRight: 24, paddingBottom: 4 }}>
              <View style={{
                width: 72, height: 72, borderRadius: 36, borderWidth: 2.5, borderColor: '#C82829',
                alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }],
              }}>
                <Text style={{ color: '#C82829', fontSize: 10, fontWeight: '800', textAlign: 'center' }}>{sealText}</Text>
              </View>
            </View>
          ) : null}
          {/* 操作按钮 */}
          <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: '#E8D9B5' }}>
            {secondaryAction ? (
              <Pressable
                onPress={secondaryAction.onPress}
                style={{ flex: 1, borderWidth: 1, borderColor: '#999', paddingVertical: 11, alignItems: 'center' }}
              >
                <Text style={{ color: '#555', fontSize: 13, fontWeight: '600' }}>{secondaryAction.label}</Text>
              </Pressable>
            ) : null}
            {primaryAction ? (
              <Pressable
                onPress={primaryAction.onPress}
                style={{ flex: 1, backgroundColor: '#C82829', paddingVertical: 11, alignItems: 'center' }}
                android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{primaryAction.label}</Text>
              </Pressable>
            ) : null}
            {!primaryAction && !secondaryAction ? (
              <Pressable
                onPress={() => onClose?.()}
                style={{ flex: 1, backgroundColor: '#1D3B5E', paddingVertical: 11, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>关闭</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={{ height: insets.bottom }} />
        </View>
      </View>
    </Modal>
  );
}
```

<a id="srccomponentspositionboardtsx"></a>
## `src/components/PositionBoard.tsx`

```tsx
// 位置棋盘组件（派系晋升联动 §一.3）
// 席位网格按 holderFaction 着色、枢纽席位★、玩家目标席位虚线环、
// 顶部派系控制度进度条 + 两种获证方法状态、底部四宫格结局实时提示
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import {
  ALL_FACTIONS,
  FACTION_COLOR,
  FACTION_LABEL,
  FACTION_SHORT,
  type FactionId,
  type PlayerSave,
  type PositionSeat,
} from '@/types/game';
import { computeFactionControl, countFactionSeats, controlsHub, getHubSeats } from '@/lib/positionBoard';

interface Props {
  visible: boolean;
  onClose: () => void;
  save: PlayerSave;
  /** 玩家当前发起争夺的目标席位 key（若有） */
  targetSeatKey?: string | null;
}

const WIN_THRESHOLD = 0.5;

export function PositionBoard({ visible, onClose, save, targetSeatKey }: Props) {
  const [expandedTier, setExpandedTier] = useState<string | null>(null);
  const primary = save.primaryFaction as FactionId | '';
  const seats: PositionSeat[] = save.boardSeats ?? [];

  // 席位统计（useMemo 避免重复计算）
  const stats = useMemo(() => {
    const counts = countFactionSeats(seats);
    const total = seats.length;
    const controls: Record<string, number> = {};
    for (const f of ALL_FACTIONS) {
      controls[f] = computeFactionControl(seats, f);
    }
    return { counts, total, controls };
  }, [seats]);

  const myControl     = primary ? stats.controls[primary] ?? 0 : 0;
  const myHub         = primary ? controlsHub(seats, primary as FactionId) : false;
  const hubSeats      = getHubSeats(seats);

  // 玩家个人职务胜负状态
  const contest = save.promotionContest;
  const playerWin = contest ? contest.sYou >= contest.sOpp : false;

  // 派系整体胜（过半 OR 攻克枢纽）
  const factionWin = myControl >= WIN_THRESHOLD || myHub;

  // 按 tier 分组席位
  const grouped = useMemo(() => {
    const map = new Map<string, PositionSeat[]>();
    for (const s of seats) {
      const arr = map.get(s.tier) ?? [];
      arr.push(s);
      map.set(s.tier, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [seats]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <View style={{ flex: 1, backgroundColor: '#F4F3F0', marginTop: 50, borderTopLeftRadius: 12, borderTopRightRadius: 12, overflow: 'hidden' }}>

          {/* 标题栏 */}
          <View style={{ backgroundColor: '#1D3A5C', padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ color: '#8eb4d8', fontSize: 9, letterSpacing: 2 }}>POSITION BOARD · 位置棋盘</Text>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>派系席位控制图</Text>
            </View>
            <Pressable onPress={onClose} style={{ padding: 6 }}>
              <Text style={{ color: '#8eb4d8', fontSize: 20 }}>✕</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

            {/* ── 顶部：派系控制度进度条 ───────────────────── */}
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 12, marginBottom: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D3B5E', letterSpacing: 1, marginBottom: 10 }}>
                本派控制度（{primary ? FACTION_SHORT[primary as FactionId] : '无主派'}）
              </Text>
              <View style={{ height: 14, backgroundColor: '#E5E5E5', borderRadius: 7, overflow: 'hidden' }}>
                <View style={{ height: 14, width: `${Math.min(100, myControl * 100)}%`, backgroundColor: primary ? FACTION_COLOR[primary as FactionId] : '#888' }} />
              </View>
              <Text style={{ fontSize: 10, color: '#666', marginTop: 6 }}>
                {(myControl * 100).toFixed(1)}% · 过半线 50% · 枢纽席位 {myHub ? '✅ 已攻克' : '❌ 未攻克'}
              </Text>

              {/* 两种获证方法状态 */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <View style={{ flex: 1, backgroundColor: myControl >= WIN_THRESHOLD ? '#E8F5E9' : '#F8F8F8', borderWidth: 1, borderColor: myControl >= WIN_THRESHOLD ? '#A5D6A7' : '#DDD', padding: 8 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: myControl >= WIN_THRESHOLD ? '#2E7D32' : '#888' }}>
                    {myControl >= WIN_THRESHOLD ? '✅ 方法一：控制度过半' : '⬜ 方法一：控制度过半'}
                  </Text>
                  <Text style={{ fontSize: 9, color: '#999', marginTop: 2 }}>席位控制率 ≥ 50%</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: myHub ? '#E8F5E9' : '#F8F8F8', borderWidth: 1, borderColor: myHub ? '#A5D6A7' : '#DDD', padding: 8 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: myHub ? '#2E7D32' : '#888' }}>
                    {myHub ? '✅ 方法二：攻克枢纽' : '⬜ 方法二：攻克枢纽'}
                  </Text>
                  <Text style={{ fontSize: 9, color: '#999', marginTop: 2 }}>拿下最高 tier 枢纽席位</Text>
                </View>
              </View>
            </View>

            {/* ── 各派系控制度一览 ───────────────────────── */}
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 12, marginBottom: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D3B5E', letterSpacing: 1, marginBottom: 8 }}>
                五派席位分布（总 {stats.total} 席）
              </Text>
              {ALL_FACTIONS.map(f => {
                const ctrl = stats.controls[f] ?? 0;
                const isPrimary = f === primary;
                return (
                  <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: FACTION_COLOR[f] }} />
                    <Text style={{ flex: 1, fontSize: 11, color: '#333' }}>
                      {FACTION_LABEL[f]}{isPrimary ? '（主派）' : ''}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#666', width: 36 }}>{stats.counts[f]} 席</Text>
                    <View style={{ width: 80, height: 6, backgroundColor: '#E5E5E5', borderRadius: 3, overflow: 'hidden' }}>
                      <View style={{ height: 6, width: `${ctrl * 100}%`, backgroundColor: FACTION_COLOR[f] }} />
                    </View>
                    <Text style={{ fontSize: 9, color: '#999', width: 32, textAlign: 'right' }}>{(ctrl * 100).toFixed(0)}%</Text>
                  </View>
                );
              })}
            </View>

            {/* ── 枢纽席位列表 ───────────────────────────── */}
            {hubSeats.length > 0 && (
              <View style={{ backgroundColor: '#FFFBF0', borderWidth: 1, borderColor: '#E8D9B0', padding: 12, marginBottom: 10 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#B8860B', letterSpacing: 1, marginBottom: 6 }}>★ 枢纽席位（最高 tier）</Text>
                {hubSeats.slice(0, 6).map(s => (
                  <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 }}>
                    <Text style={{ color: '#B8860B', fontSize: 12 }}>★</Text>
                    <Text style={{ flex: 1, fontSize: 11, color: '#333' }}>{s.title}</Text>
                    <Text style={{ fontSize: 9, color: s.holderFaction ? FACTION_COLOR[s.holderFaction] : '#999', fontWeight: '600' }}>
                      {s.holderFaction ? FACTION_SHORT[s.holderFaction] : '空缺'}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* ── 席位网格（按 tier 折叠展开）────────────── */}
            {grouped.map(([tier, tierSeats]) => {
              const expanded = expandedTier === tier;
              const shown = expanded ? tierSeats : tierSeats.slice(0, 4);
              return (
                <View key={tier} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 12, marginBottom: 10 }}>
                  <Pressable onPress={() => setExpandedTier(expanded ? null : tier)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D3B5E' }}>
                      {tier}（{tierSeats.length} 席）
                    </Text>
                    <Text style={{ fontSize: 10, color: '#888' }}>{expanded ? '收起 ▲' : `展开 ▼`}</Text>
                  </Pressable>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {shown.map(s => renderSeatCell(s, targetSeatKey, primary))}
                  </View>
                </View>
              );
            })}

            {/* ── 底部四宫格结局提示 ─────────────────────── */}
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 12, marginBottom: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D3B5E', letterSpacing: 1, marginBottom: 10 }}>
                四宫格结局实时提示（派系胜负 × 玩家职务胜负）
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {renderOutcomeCell({
                  title: '双胜',
                  desc: '派系胜 × 玩家胜',
                  detail: '最优结局：职位到手，派系也主导风口',
                  active: factionWin && playerWin,
                  color: '#2E7D32', bg: '#E8F5E9', border: '#A5D6A7',
                })}
                {renderOutcomeCell({
                  title: '派胜·职负',
                  desc: '派系胜 × 玩家负',
                  detail: '"那没事"：派系整体得势，个人职位之争失利无碍大局',
                  active: factionWin && !playerWin,
                  color: '#1565C0', bg: '#E3F2FD', border: '#90CAF9',
                })}
                {renderOutcomeCell({
                  title: '派负·职胜',
                  desc: '派系负 × 玩家胜',
                  detail: '"仍受罚"：个人虽赢得职位，但派系整体败仍要接受惩罚',
                  active: !factionWin && playerWin,
                  color: '#E65100', bg: '#FFF3E0', border: '#FFCC80',
                })}
                {renderOutcomeCell({
                  title: '双负',
                  desc: '派系负 × 玩家负',
                  detail: '"最糟"：职位与派系双双失利，受失势惩罚',
                  active: !factionWin && !playerWin,
                  color: '#C62828', bg: '#FFEBEE', border: '#EF9A9A',
                })}
              </View>
            </View>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** 渲染单个席位格子 */
function renderSeatCell(
  seat: PositionSeat,
  targetSeatKey: string | null | undefined,
  primary: FactionId | '',
): React.ReactNode {
  const isTarget = seat.key === targetSeatKey;
  const holderColor = seat.holderFaction ? FACTION_COLOR[seat.holderFaction] : '#999';
  const isMine = seat.holderFaction && seat.holderFaction === primary;

  return (
    <View
      key={seat.key}
      style={{
        width: '31%',
        backgroundColor: seat.holderFaction ? `${holderColor}18` : '#F8F8F8',
        borderWidth: isTarget ? 2 : 1,
        borderColor: isTarget ? '#C82829' : seat.holderFaction ? `${holderColor}80` : '#DDD',
        borderStyle: isTarget ? 'dashed' : 'solid',
        borderRadius: 4,
        padding: 6,
        minHeight: 44,
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 9, color: '#999', lineHeight: 12 }}>{seat.organ}</Text>
      <Text style={{ fontSize: 10, fontWeight: '700', color: '#333', lineHeight: 13 }} numberOfLines={1}>
        {seat.isHub ? '★ ' : ''}{seat.title}
      </Text>
      <Text style={{ fontSize: 9, color: holderColor, fontWeight: '600', marginTop: 2 }}>
        {seat.holderFaction ? FACTION_SHORT[seat.holderFaction] : '空缺'}{isMine ? '·本派' : ''}
      </Text>
    </View>
  );
}

/** 渲染四宫格结局单元 */
function renderOutcomeCell(props: {
  title: string; desc: string; detail: string;
  active: boolean; color: string; bg: string; border: string;
}): React.ReactNode {
  return (
    <View
      style={{
        width: '48%',
        backgroundColor: props.active ? props.bg : '#F8F8F8',
        borderWidth: props.active ? 2 : 1,
        borderColor: props.active ? props.border : '#DDD',
        borderRadius: 4,
        padding: 10,
        minHeight: 80,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '700', color: props.active ? props.color : '#888' }}>
        {props.active ? '▶ ' : ''}{props.title}
      </Text>
      <Text style={{ fontSize: 9, color: '#999', marginTop: 2 }}>{props.desc}</Text>
      <Text style={{ fontSize: 9, color: props.active ? props.color : '#AAA', marginTop: 4, lineHeight: 13 }}>
        {props.detail}
      </Text>
    </View>
  );
}
```

<a id="srccomponentsprovinceseatmaptsx"></a>
## `src/components/ProvinceSeatMap.tsx`

```tsx
// 省级席位地图（v4 派系玩法：全国棋盘）
// 风格：体制内机密档案 · 战略指挥中心（硬边网格分割，无圆角无渐变）
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  RANK_CONFIG,
  getRandomCityForRank,
  FACTION_LABEL,
  FACTION_SHORT,
  FACTION_COLOR,
  ALL_FACTIONS,
  type FactionId,
  type PlayerSave,
} from '@/types/game';
import {
  VICTORY_THRESHOLD,
  CONTEST_BLEND,
  CONTEST_COSTS,
  getNationalControl,
  getDomainTypeOfProvince,
  describeFactionDomainBonuses,
  DOMAIN_TYPE_LABEL,
  calcFactionPower,
  calcPersonalPower,
} from '@/lib/provinceSeatSystem';
import { nanoid } from '@/lib/nanoid';

interface Props {
  visible: boolean;
  onClose: () => void;
  save: PlayerSave;
  /** 班子派系（个人职位战竞争派系来源） */
  bandFactions: FactionId[];
  /** 个人职位战结算回调（win 才晋升落档） */
  onLaunchPersonalContest: (
    positionKey: string,
    positionTitle: string,
    toRank: number,
    targetCity: string,
  ) => Promise<void>;
}

// 档案风格色板（框架色，业务数据色全部走 FACTION_COLOR 配置）
const INK = '#121212';        // 深砚灰背景
const INK2 = '#1E1E1E';       // 模块底
const LINE = '#333333';       // 硬边分割线
const SEAL = '#8A1515';       // 印泥红（阈值线/警示）
const GOLD = '#D4AF37';       // 档案金（玩家目标/核心数据）
const PAPER = '#E8E4D8';      // 纸面文字
const MUTED = '#9A948A';      // 次要文字

export function ProvinceSeatMap({ visible, onClose, save, bandFactions, onLaunchPersonalContest }: Props) {
  const insets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  const primary = (save.primaryFaction || 'reform') as FactionId;

  // 全国控制统计（从存档 provinceSeatControl 派生，未分配时按当前关系预估）
  const { control, seats } = useMemo(() => getNationalControl(save), [save]);
  const myRatio = control.controlRatios[primary] ?? 0;
  const mySeats = control.factionSeats[primary] ?? 0;

  // 个人战力分解（预估展示）
  const factionPower = useMemo(() => calcFactionPower(save, primary), [save, primary]);
  const personalPower = useMemo(() => calcPersonalPower(save), [save]);
  const factionShareScore = Math.round(CONTEST_BLEND.faction * factionPower * 10) / 10;
  const personalShareScore = Math.round(CONTEST_BLEND.personal * personalPower * 10) / 10;
  const estSYou = Math.round((factionShareScore + personalShareScore) * 10) / 10;

  // 冷却/门槛状态
  const cooldownRemaining = Math.max(0, (save.personalContestCooldownUntil ?? 0) - save.gameDays);
  const inCooldown = cooldownRemaining > 0;
  const meritEnough = (save.meritPoints ?? 0) >= CONTEST_COSTS.personalContest.merit;

  // 目标职位（下一职级）
  const toRank = save.rankLevel + 1;
  const targetPosition = RANK_CONFIG[toRank]?.name ?? '拟任职务';

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 4000);
  };

  /** 发起个人职位战 */
  const handleLaunch = async () => {
    if (submitting) return;
    if (inCooldown) {
      showFeedback(`冷却时间未到，请等待 ${cooldownRemaining} 天后再试`);
      return;
    }
    if (!meritEnough) {
      showFeedback(`功绩点数不足，需要 ${CONTEST_COSTS.personalContest.merit} 点功绩`);
      return;
    }
    setSubmitting(true);
    try {
      const targetCity = getRandomCityForRank(toRank);
      await onLaunchPersonalContest(`rank_${toRank}`, targetPosition, toRank, targetCity);
    } finally {
      setSubmitting(false);
    }
  };

  // 加成说明
  const domainBonusList = useMemo(() => describeFactionDomainBonuses(), []);

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: INK, paddingTop: insets.top }}>
        {/* 顶栏 */}
        <View style={{ borderBottomWidth: 1, borderColor: LINE, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: PAPER, fontSize: 15, fontWeight: '700', letterSpacing: 3 }}>省级席位 · 全国棋盘</Text>
            <Text style={{ color: MUTED, fontSize: 9, marginTop: 2, letterSpacing: 1 }}>
              {FACTION_LABEL[primary]} · 双轨制：席位战(80%) + 个人战(10%+90%)
            </Text>
          </View>
          <Pressable onPress={onClose} style={{ borderWidth: 1, borderColor: LINE, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Text style={{ color: MUTED, fontSize: 11 }}>关闭 ✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
          {/* 反馈条 */}
          {!!feedback && (
            <View style={{ borderWidth: 1, borderColor: SEAL, backgroundColor: '#2A1010', padding: 8, marginBottom: 8 }}>
              <Text style={{ color: '#E8B4B4', fontSize: 11 }}>{feedback}</Text>
            </View>
          )}

          {/* ══ 全国控制度进度条 + 阈值线 ══ */}
          <View style={{ borderWidth: 1, borderColor: LINE, backgroundColor: INK2, padding: 12 }}>
            <Text style={{ color: MUTED, fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>全国席位控制度</Text>
            <View style={{ height: 22, borderWidth: 1, borderColor: LINE, flexDirection: 'row' }}>
              {ALL_FACTIONS.map(f => {
                const w = (control.controlRatios[f] ?? 0) * 100;
                if (w <= 0) return null;
                return (
                  <View key={f} style={{ width: `${w}%`, backgroundColor: FACTION_COLOR[f], justifyContent: 'center', alignItems: 'center' }}>
                    {w >= 12 ? <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{Math.round(w)}%</Text> : null}
                  </View>
                );
              })}
            </View>
            {/* 80% 阈值线 */}
            <View style={{ position: 'absolute', left: 12 + (VICTORY_THRESHOLD * 100 * (320 - 24) / 100) + 12, top: 34, bottom: 12, width: 2, backgroundColor: SEAL }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <View style={{ width: 10, height: 10, backgroundColor: SEAL }} />
              <Text style={{ color: SEAL, fontSize: 10, fontWeight: '700' }}>
                获胜阈值 {Math.round(VICTORY_THRESHOLD * 100)}%（本派当前 {Math.round(myRatio * 100)}% · {mySeats}/{control.totalSeats} 席）
              </Text>
            </View>
            <Text style={{ color: MUTED, fontSize: 9, marginTop: 6, lineHeight: 14 }}>
              {myRatio >= VICTORY_THRESHOLD
                ? '✓ 本派已达获胜阈值，本轮斗争提前收官'
                : `距获胜阈值还差 ${Math.max(0, Math.round((VICTORY_THRESHOLD - myRatio) * 100))}%，到周期边界仍未达标则本轮争夺过期`}
            </Text>
          </View>

          {/* ══ 五派席位分布 ══ */}
          <View style={{ borderWidth: 1, borderColor: LINE, backgroundColor: INK2, padding: 12, marginTop: 8 }}>
            <Text style={{ color: MUTED, fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>五派席位分布</Text>
            {[...ALL_FACTIONS].sort((a, b) => (control.factionSeats[b] ?? 0) - (control.factionSeats[a] ?? 0)).map(f => {
              const cnt = control.factionSeats[f] ?? 0;
              const ratio = control.controlRatios[f] ?? 0;
              const isMine = f === primary;
              return (
                <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                  <View style={{ width: 10, height: 10, backgroundColor: FACTION_COLOR[f] }} />
                  <Text style={{ width: 88, color: isMine ? GOLD : PAPER, fontSize: 11, fontWeight: isMine ? '700' : '400' }}>
                    {FACTION_LABEL[f]}{isMine ? ' ★' : ''}
                  </Text>
                  <View style={{ flex: 1, height: 8, backgroundColor: '#2A2A2A', flexDirection: 'row' }}>
                    <View style={{ width: `${ratio * 100}%`, backgroundColor: FACTION_COLOR[f] }} />
                  </View>
                  <Text style={{ width: 70, color: MUTED, fontSize: 10, textAlign: 'right' }}>
                    {cnt} 席 · {Math.round(ratio * 100)}%
                  </Text>
                </View>
              );
            })}
          </View>

          {/* ══ 各省列表 ══ */}
          <View style={{ borderWidth: 1, borderColor: LINE, backgroundColor: INK2, padding: 12, marginTop: 8 }}>
            <Text style={{ color: MUTED, fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>
              各省席位（席位 = round(地级市数 × 1.8)，clamp [3,18]）
            </Text>
            {seats.map(s => {
              const holder = s.holderFaction;
              const domainType = getDomainTypeOfProvince(s.province);
              const isMine = holder === primary;
              const isSelected = selectedProvince === s.province;
              const playerHere = save.cityName.includes(s.province.replace(/省|市|自治区|壮族自治区|回族自治区|维吾尔自治区/g, ''));
              return (
                <Pressable
                  key={s.province}
                  onPress={() => setSelectedProvince(isSelected ? null : s.province)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' }}
                >
                  <View style={{ width: 3, height: 18, backgroundColor: holder ? FACTION_COLOR[holder] : '#555' }} />
                  <Text style={{ width: 92, color: PAPER, fontSize: 11 }}>{s.province}</Text>
                  <View style={{ width: 58, borderWidth: 1, borderColor: holder ? FACTION_COLOR[holder] : LINE, alignItems: 'center', paddingVertical: 2 }}>
                    <Text style={{ color: holder ? FACTION_COLOR[holder] : MUTED, fontSize: 9, fontWeight: '700' }}>
                      {holder ? FACTION_SHORT[holder] : '无主'}
                    </Text>
                  </View>
                  <Text style={{ width: 40, color: MUTED, fontSize: 10, textAlign: 'center' }}>{s.seatCount} 席</Text>
                  <Text style={{ width: 60, color: '#666', fontSize: 8, flex: 1 }} numberOfLines={1}>
                    {DOMAIN_TYPE_LABEL[domainType]}
                  </Text>
                  {isMine ? <Text style={{ color: GOLD, fontSize: 10 }}>★</Text> : null}
                  {playerHere ? <Text style={{ color: GOLD, fontSize: 9 }}>任职地</Text> : null}
                </Pressable>
              );
            })}
          </View>

          {/* ══ 个人职位战面板 ══ */}
          <View style={{ borderWidth: 1, borderColor: GOLD, backgroundColor: INK2, padding: 12, marginTop: 8 }}>
            <Text style={{ color: GOLD, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 6 }}>个人职位战（独立赛道）</Text>
            <Text style={{ color: MUTED, fontSize: 9, marginBottom: 8, lineHeight: 14 }}>
              目标职位：{targetPosition}（第 {toRank} 级）· 花费 {CONTEST_COSTS.personalContest.merit} 功绩 · 冷却 {CONTEST_COSTS.personalContest.cooldownDays} 天
            </Text>

            {/* 战力预估分解条：派系10% + 个人90% */}
            <Text style={{ color: MUTED, fontSize: 9, marginBottom: 4 }}>战力预估（S_you ≈ {estSYou}）</Text>
            <View style={{ height: 14, flexDirection: 'row', borderWidth: 1, borderColor: LINE }}>
              <View style={{ width: `${CONTEST_BLEND.faction * 100}%`, backgroundColor: FACTION_COLOR[primary], justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 8 }}>派系 {factionShareScore}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: GOLD, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: INK, fontSize: 8, fontWeight: '700' }}>个人 {personalShareScore}（90%）</Text>
              </View>
            </View>
            <Text style={{ color: MUTED, fontSize: 8, marginTop: 4 }}>
              派系实力 {factionPower}（关系/影响力/功绩/情报/经费池加权）· 个人战力 {personalPower}（七维加权）
            </Text>

            {/* 花费/冷却状态 */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <View style={{ flex: 1, borderWidth: 1, borderColor: meritEnough ? '#2E6B3E' : SEAL, padding: 6 }}>
                <Text style={{ color: meritEnough ? '#7CBF8E' : '#E8B4B4', fontSize: 9 }}>
                  功绩 {Math.round(save.meritPoints ?? 0)} / {CONTEST_COSTS.personalContest.merit} {meritEnough ? '✓' : '✗'}
                </Text>
              </View>
              <View style={{ flex: 1, borderWidth: 1, borderColor: inCooldown ? SEAL : '#2E6B3E', padding: 6 }}>
                <Text style={{ color: inCooldown ? '#E8B4B4' : '#7CBF8E', fontSize: 9 }}>
                  {inCooldown ? `冷却中 ${cooldownRemaining} 天` : '冷却已结束 ✓'}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleLaunch}
              disabled={submitting}
              style={{ backgroundColor: submitting ? '#3A3A3A' : GOLD, paddingVertical: 11, alignItems: 'center', marginTop: 10 }}
            >
              <Text style={{ color: submitting ? MUTED : INK, fontSize: 12, fontWeight: '700', letterSpacing: 2 }}>
                {submitting ? '结算中…' : `发起个人职位战（-${CONTEST_COSTS.personalContest.merit} 功绩）`}
              </Text>
            </Pressable>
            <Text style={{ color: MUTED, fontSize: 8, marginTop: 6, lineHeight: 12 }}>
              仅胜利才落档晋升；个人战胜利不影响派系斗争回合。四宫格：派系胜+个人胜(最佳) / 派系胜+个人负(无妨) / 派系负+个人胜(仍受罚) / 派系负+个人负(最糟)。
            </Text>
          </View>

          {/* ══ 个人职位战历史 ══ */}
          {(save.personalContestHistory ?? []).length > 0 && (
            <View style={{ borderWidth: 1, borderColor: LINE, backgroundColor: INK2, padding: 12, marginTop: 8 }}>
              <Text style={{ color: MUTED, fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>个人职位战历史</Text>
              {(save.personalContestHistory ?? []).slice(-6).reverse().map((h, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' }}>
                  <View style={{ width: 28, height: 16, backgroundColor: h.win ? '#1E3A24' : '#2A1010', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: h.win ? '#7CBF8E' : '#E8B4B4', fontSize: 9, fontWeight: '700' }}>{h.win ? '胜' : '败'}</Text>
                  </View>
                  <Text style={{ flex: 1, color: PAPER, fontSize: 10 }}>
                    S:{h.sYou} vs {h.sOpp}（派系 {Math.round(h.factionShare * 100)}% + 个人 {Math.round(h.personalShare * 100)}%）
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* ══ 竞争派系加成说明 ══ */}
          <View style={{ borderWidth: 1, borderColor: LINE, backgroundColor: INK2, padding: 12, marginTop: 8 }}>
            <Text style={{ color: MUTED, fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>竞争派系地域加成</Text>
            {domainBonusList.map(d => (
              <View key={d.faction} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 4 }}>
                <View style={{ width: 10, height: 10, backgroundColor: FACTION_COLOR[d.faction], marginTop: 3 }} />
                <Text style={{ width: 88, color: PAPER, fontSize: 10 }}>{d.label}</Text>
                <Text style={{ flex: 1, color: MUTED, fontSize: 10, lineHeight: 15 }}>
                  {d.lines.length > 0 ? d.lines.join(' · ') : '无地域加成'}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
```

<a id="srccomponentsrenewalvotemodaltsx"></a>
## `src/components/RenewalVoteModal.tsx`

```tsx
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
```

<a id="srccomponentsretirementmodaltsx"></a>
## `src/components/RetirementModal.tsx`

```tsx
// 退休弹窗组件
// 触发条件：正国家级90岁（自主选择）/ 各级基准退休年龄（强制）
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getRetirementConfig, checkRetirementStatus } from '@/types/game';

interface RetirementModalProps {
  visible: boolean;
  triggerType: 'voluntary' | 'mandatory';
  onClose: () => void;
}

// 带 pressed 反馈的按钮组件（避免函数式 style）
function ActionBtn({
  onPress,
  bg,
  bgPressed,
  border,
  children,
}: {
  onPress: () => void;
  bg: string;
  bgPressed: string;
  border?: { width: number; color: string };
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
        paddingVertical: 12, alignItems: 'center', borderRadius: 2,
        ...(border ? { borderWidth: border.width, borderColor: border.color } : {}),
      }}
    >
      {children}
    </Pressable>
  );
}

interface RetirementModalProps {
  visible: boolean;
  triggerType: 'voluntary' | 'mandatory';
  onClose: () => void;
}

export function RetirementModal({ visible, triggerType, onClose }: RetirementModalProps) {
  const router = useRouter();
  const { save, updateGameSave, clearRetirementTrigger } = useGame();

  if (!save) return null;

  const cfg = getRetirementConfig(save.rankLevel);
  const retireStatus = checkRetirementStatus(save.rankLevel, save.playerAge, save.retirementDelayYears);
  const canDelay = cfg.maxDelayYears > 0 && save.retirementDelayYears < cfg.maxDelayYears;
  const delayUsed = save.retirementDelayYears;
  const delayMax = cfg.maxDelayYears;
  const delayRemaining = delayMax - delayUsed;

  // 强制退休（延迟次数已用尽或不可延迟）
  const isForcedRetire = triggerType === 'mandatory' && !canDelay;

  const handleRetireNow = async () => {
    // 标记已退休，跳转结局页
    await updateGameSave({ isRetired: true });
    clearRetirementTrigger();
    onClose();
    router.push('/(app)/retirement-ending');
  };

  const handleDelayRetire = async () => {
    if (!canDelay) return;
    // 消耗政绩申请延迟退休
    const cost = cfg.costPerDelay;
    await updateGameSave({
      retirementDelayYears: save.retirementDelayYears + 1,
      meritPoints: Math.max(0, save.meritPoints - cost),
    });
    clearRetirementTrigger();
    onClose();
  };

  const handleContinue = () => {
    // 正国家级自主：选择继续执政
    clearRetirementTrigger();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={{
        flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
        alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 20,
      }}>
        <View style={{
          backgroundColor: '#FBF9F6',
          borderRadius: 4,
          borderWidth: 1,
          borderColor: '#C8B89A',
          width: '100%',
          maxWidth: 400,
          overflow: 'hidden',
        }}>
          {/* 顶部标题栏 */}
          <View style={{
            backgroundColor: triggerType === 'voluntary' ? '#2B4B6F' : '#7A1B1E',
            paddingVertical: 14, paddingHorizontal: 20,
            flexDirection: 'row', alignItems: 'center', gap: 8,
          }}>
            <Text style={{ fontSize: 16, color: '#fff' }}>
              {triggerType === 'voluntary' ? '🎖️' : '📋'}
            </Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 1 }}>
              {triggerType === 'voluntary' ? '功成身退·自主选择' : '届龄退休·组织通知'}
            </Text>
          </View>

          <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ padding: 20, gap: 14 }}>
            {/* 职级与退休规则说明 */}
            <View style={{
              backgroundColor: '#F0ECE4', borderRadius: 2,
              padding: 12, gap: 6,
            }}>
              <Text style={{ fontSize: 11, color: '#888', letterSpacing: 1 }}>当前职级</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#2B4B6F' }}>
                {cfg.tier}  ·  {save.rankName}
              </Text>
              <Text style={{ fontSize: 12, color: '#666', lineHeight: 18, marginTop: 2 }}>
                {cfg.delayNote}
              </Text>
            </View>

            {/* 主要内容区 */}
            {triggerType === 'voluntary' ? (
              // 正国家级——自主退休内容
              <View style={{ gap: 10 }}>
                <View style={{
                  backgroundColor: '#EFF5EB', borderLeftWidth: 3, borderLeftColor: '#2a7a3b',
                  padding: 12,
                }}>
                  <Text style={{ fontSize: 13, color: '#2a7a3b', fontWeight: '700', marginBottom: 4 }}>
                    ✦ 自主退休选项
                  </Text>
                  <Text style={{ fontSize: 12, color: '#444', lineHeight: 20 }}>
                    您已年届 {save.playerAge} 岁，达到可自主选择退休的年龄。{'\n'}
                    退休后将保留最高政治待遇，仍可受邀参与国家重大战略决策与宏观政策咨询。
                  </Text>
                </View>
                <View style={{
                  backgroundColor: '#EEF2F8', borderLeftWidth: 3, borderLeftColor: '#2B4B6F',
                  padding: 12,
                }}>
                  <Text style={{ fontSize: 13, color: '#2B4B6F', fontWeight: '700', marginBottom: 4 }}>
                    ✦ 继续执政选项
                  </Text>
                  <Text style={{ fontSize: 12, color: '#444', lineHeight: 20 }}>
                    正国家级不设法定强制退休年龄，您可根据个人意愿与身体状况决定继续履职。
                  </Text>
                </View>
              </View>
            ) : (
              // 强制退休 / 延迟退休内容
              <View style={{ gap: 10 }}>
                <View style={{
                  backgroundColor: '#FDF3F3', borderLeftWidth: 3, borderLeftColor: '#C82829',
                  padding: 12,
                }}>
                  <Text style={{ fontSize: 13, color: '#C82829', fontWeight: '700', marginBottom: 4 }}>
                    📋 届龄退休通知
                  </Text>
                  <Text style={{ fontSize: 12, color: '#444', lineHeight: 20 }}>
                    您已年届 {save.playerAge} 岁，达到{cfg.tier}基准退休年龄，
                    {delayUsed > 0 ? `此前已申请 ${delayUsed} 年延迟退休，` : ''}
                    组织部要求按规定办理退休手续。
                  </Text>
                </View>
                {canDelay && (
                  <View style={{
                    backgroundColor: '#FFF8EC', borderLeftWidth: 3, borderLeftColor: '#D4A017',
                    padding: 12, gap: 4,
                  }}>
                    <Text style={{ fontSize: 13, color: '#8B6A00', fontWeight: '700' }}>
                      ⏳ 申请弹性延迟退休
                    </Text>
                    <Text style={{ fontSize: 12, color: '#555', lineHeight: 20 }}>
                      {cfg.tier}可申请弹性延迟退休，经组织批准后可延迟1年继续任职。{'\n'}
                      尚可申请：{delayRemaining} 次（已申请 {delayUsed}/{delayMax} 年）{'\n'}
                      本次申请政绩消耗：<Text style={{ color: '#C82829', fontWeight: '700' }}>-{cfg.costPerDelay} 政绩</Text>
                      {save.meritPoints < cfg.costPerDelay && (
                        <Text style={{ color: '#C82829' }}>（⚠️ 政绩不足，无法申请）</Text>
                      )}
                    </Text>
                  </View>
                )}
                {isForcedRetire && (
                  <View style={{
                    backgroundColor: '#F5F0E8', borderRadius: 2, padding: 10,
                  }}>
                    <Text style={{ fontSize: 11, color: '#888', lineHeight: 18 }}>
                      延迟退休名额已用尽或本职级不支持延迟，须正式办理退休手续。{'\n'}
                      退休后保留相应政治待遇，您的仕途奋斗将载入史册。
                    </Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* 操作按钮区 */}
          <View style={{
            borderTopWidth: 1, borderTopColor: '#E8E2D8',
            padding: 16, gap: 10,
          }}>
            {triggerType === 'voluntary' ? (
              <>
                <ActionBtn
                  onPress={handleRetireNow}
                  bg="#2B4B6F" bgPressed="#1a3a5c"
                >
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                    🎖️  功成身退，安享晚年
                  </Text>
                </ActionBtn>
                <ActionBtn
                  onPress={handleContinue}
                  bg="#F5F2EC" bgPressed="#EDE8E0"
                  border={{ width: 1, color: '#C8B89A' }}
                >
                  <Text style={{ color: '#2B4B6F', fontSize: 14, fontWeight: '600' }}>
                    继续履职，报效国家
                  </Text>
                </ActionBtn>
              </>
            ) : (
              <>
                {canDelay && save.meritPoints >= cfg.costPerDelay && (
                  <ActionBtn
                    onPress={handleDelayRetire}
                    bg="#D4A017" bgPressed="#C89800"
                  >
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                      ⏳  申请延迟退休（消耗 {cfg.costPerDelay} 政绩）
                    </Text>
                  </ActionBtn>
                )}
                <ActionBtn
                  onPress={handleRetireNow}
                  bg="#7A1B1E" bgPressed="#8A1418"
                >
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                    📋  办理退休手续，功成身退
                  </Text>
                </ActionBtn>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
```

<a id="srccomponentsstatbartsx"></a>
## `src/components/StatBar.tsx`

```tsx
// 数值进度条组件 —— 随职级主题动态切换风格
import { Text, View } from 'react-native';
import type { RankTheme } from '@/lib/rankTheme';

interface StatBarProps {
  label: string;
  value: number;
  color?: string;
  showValue?: boolean;
  theme?: RankTheme;
}

export function StatBar({ label, value, color, showValue = true, theme }: StatBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const high = theme?.statHigh  ?? '#2a7a3b';
  const mid  = theme?.statMid   ?? (color ?? '#2B4B6F');
  const low  = theme?.statLow   ?? '#C82829';
  const barColor = clampedValue >= 70 ? high : clampedValue >= 40 ? mid : low;
  const trackBg  = theme?.progressBg ?? '#E5E2DC';
  const labelClr = theme?.labelText  ?? '#555';

  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
        <Text style={{ fontSize: 11, color: labelClr, letterSpacing: 0.5 }}>{label}</Text>
        {showValue && (
          <Text style={{ fontSize: 11, color: barColor, fontVariant: ['tabular-nums'], fontWeight: '600' }}>
            {clampedValue.toFixed(1)}
          </Text>
        )}
      </View>
      <View style={{ height: 5, backgroundColor: trackBg, overflow: 'hidden' }}>
        <View style={{ height: 5, width: `${clampedValue}%`, backgroundColor: barColor }} />
      </View>
    </View>
  );
}
```

<a id="srccomponentstempappealmodaltsx"></a>
## `src/components/TempAppealModal.tsx`

```tsx
// 临时申诉弹窗（复用组件）
// 提交时调用 submit-temp-appeal Edge Function：
//   - 捕获设备指纹 / IP
//   - 多开检测（同设备 / 同 IP 其他账号数，排除管理员）
//   - 返回账号创建时间
//   - 管理员账号自动豁免
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { supabase } from '@/client/supabase';
import { getDeviceId } from '@/lib/device';

const C = {
  bgCard: '#0F2235',
  gold: '#C8A84B',
  goldLight: '#E8D08A',
  goldBg: 'rgba(200,168,75,0.08)',
  red: '#C82829',
  redBg: 'rgba(200,40,41,0.12)',
  green: '#2a7a3b',
  greenBg: 'rgba(40,120,60,0.12)',
  textPrimary: '#EDE8DC',
  textSecond: '#A09070',
  textHint: '#5A5040',
  inputBg: '#0A1928',
  inputBorder: '#1E3A5A',
  divider: '#162840',
};

export interface TempAppealRisk {
  same_fp_count: number;
  same_ip_count: number;
  admin_exempt: boolean;
  created_at: string | null;
}

export function TempAppealModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [risk, setRisk] = useState<TempAppealRisk | null>(null);

  const reset = () => {
    setReason('');
    setMsg(null);
    setRisk(null);
  };

  const submit = async () => {
    const r = reason.trim();
    if (r.length < 5) {
      setMsg({ ok: false, text: '请填写不少于 5 字的申诉理由' });
      return;
    }
    setSubmitting(true);
    setMsg(null);
    setRisk(null);
    try {
      const deviceId = await getDeviceId();
      const { data, error } = await supabase.functions.invoke('submit-temp-appeal', {
        body: { reason: r, device_fingerprint: deviceId },
      });
      if (error) {
        setMsg({ ok: false, text: `提交失败：${error.message}` });
      } else {
        const res = data as { ok?: boolean; err?: string; risk?: Omit<TempAppealRisk, 'created_at'>; created_at?: string };
        if (res?.ok) {
          setMsg({ ok: true, text: '✓ 临时申诉已提交，请耐心等待管理员审核' });
          setReason('');
          setRisk({
            same_fp_count: res.risk?.same_fp_count ?? 0,
            same_ip_count: res.risk?.same_ip_count ?? 0,
            admin_exempt: res.risk?.admin_exempt ?? false,
            created_at: res.created_at ?? null,
          });
        } else {
          setMsg({ ok: false, text: res?.err ?? '提交失败，请稍后重试' });
        }
      }
    } catch (e) {
      setMsg({ ok: false, text: `提交失败：${e instanceof Error ? e.message : String(e)}` });
    }
    setSubmitting(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', paddingHorizontal: 24 }} onPress={() => { reset(); onClose(); }}>
          <Pressable style={{ backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.gold, padding: 18, gap: 12 }} onPress={() => {}}>
            <Text style={{ color: C.goldLight, fontSize: 15, fontWeight: '700' }}>📝 临时申诉</Text>
            <Text style={{ color: C.textSecond, fontSize: 11, lineHeight: 18 }}>
              若后台显示您的账号已有存档，但您在此处看不到存档（可能是后台显示错误），请填写申诉理由，管理员将尽快核实处理。
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="请详细描述您遇到的问题（不少于 5 字）"
              placeholderTextColor={C.textHint}
              multiline
              maxLength={300}
              style={{ backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.inputBorder, paddingHorizontal: 10, paddingVertical: 8, color: C.textPrimary, fontSize: 12, minHeight: 80, textAlignVertical: 'top' }}
            />

            {risk ? (
              <View style={{ backgroundColor: C.goldBg, borderWidth: 1, borderColor: C.gold, paddingHorizontal: 10, paddingVertical: 8, gap: 4 }}>
                <Text style={{ color: C.goldLight, fontSize: 11, fontWeight: '700' }}>系统风控信息</Text>
                <Text style={{ color: C.textSecond, fontSize: 11, lineHeight: 18 }}>
                  账号创建时间：{risk.created_at ? new Date(risk.created_at).toLocaleString('zh-CN') : '未知'}
                </Text>
                <Text style={{ color: risk.same_fp_count > 0 ? '#FF7070' : C.textSecond, fontSize: 11, lineHeight: 18 }}>
                  同设备其他账号：{risk.same_fp_count} 个{risk.same_fp_count > 0 ? '（疑似多开）' : ''}
                </Text>
                <Text style={{ color: risk.same_ip_count > 0 ? '#FF7070' : C.textSecond, fontSize: 11, lineHeight: 18 }}>
                  同网络IP其他账号：{risk.same_ip_count} 个{risk.same_ip_count > 0 ? '（疑似多开）' : ''}
                </Text>
                {risk.admin_exempt ? (
                  <Text style={{ color: '#7FE0A0', fontSize: 11, fontWeight: '700' }}>🛡 管理员账号，已自动豁免多开审查</Text>
                ) : null}
              </View>
            ) : null}

            {msg ? (
              <View style={{ backgroundColor: msg.ok ? C.greenBg : C.redBg, borderLeftWidth: 2, borderLeftColor: msg.ok ? C.green : C.red, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text style={{ color: msg.ok ? '#7FE0A0' : '#FF7070', fontSize: 11, lineHeight: 16 }}>{msg.text}</Text>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => { reset(); onClose(); }} style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: C.divider }}>
                <Text style={{ color: C.textSecond, fontSize: 13 }}>关闭</Text>
              </Pressable>
              <Pressable onPress={submit} disabled={submitting} style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: C.gold, opacity: submitting ? 0.6 : 1 }}>
                <Text style={{ color: '#1a1a1a', fontSize: 13, fontWeight: '700' }}>{submitting ? '提交中...' : '提交申诉'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
```

<a id="srccomponentsadminaccounttabtsx"></a>
## `src/components/admin/AccountTab.tsx`

```tsx
// 账号管理 Tab：
// - 查看所有玩家账号（邮箱、玩家、职级、注册时间）
// - 密码：超级管理员可查看账号标识并直接改密/删号；普通管理员密码显示 ***，仅能发起重置申请
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { A, Badge, Btn, Card, Empty, LabeledInput, Row } from './shared';
import { WheelPicker } from './WheelPicker';
import {
  adminAccountList, adminAccountStats, adminDeleteInactive, adminDeletePlayerAccount,
  adminGetPlayerPassword, adminPreviewInactive, adminPromoteRank, adminPurgeExpiredAccounts,
  adminRequestPasswordReset, adminRestoreAccount, adminSetPlayerPassword, adminToggleBan,
  type AccountRow, type AccountStats,
} from '@/lib/adminApi';

const DAYS_VALUES = Array.from({ length: 31 }, (_, i) => i + 1);

export function AccountTab({ role }: { role: string }) {
  const isSuperAdmin = role === 'super_admin';
  const canResetBan = role === 'admin' || role === 'super_admin';
  const canDeleteInactive = role === 'super_admin';

  const [rows, setRows] = useState<AccountRow[]>([]);
  const [st, setSt] = useState<AccountStats | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  // 选中的账号操作
  const [sel, setSel] = useState<AccountRow | null>(null);
  const [promoteRank, setPromoteRank] = useState('1');
  const [newPwd, setNewPwd] = useState('');
  // 不活跃清理
  const [inactiveDays, setInactiveDays] = useState(30);
  const [preview, setPreview] = useState<{ user_id: string; email: string; last_active: string; player_name: string | null }[]>([]);
  const [previewing, setPreviewing] = useState(false);
  // 密码查看（超管）：显示账号标识
  const [pwdEmail, setPwdEmail] = useState<string | null>(null);
  const [pwdLoading, setPwdLoading] = useState(false);
  // 重置申请原因
  const [resetReason, setResetReason] = useState('');
  // 删除账号确认
  const [confirmDelete, setConfirmDelete] = useState(false);
  // 软删除账号列表
  const [deletedRows, setDeletedRows] = useState<AccountRow[]>([]);
  const [deletedLoading, setDeletedLoading] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  // 导出明细
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [r, s] = await Promise.all([adminAccountList(search, 50, 0), adminAccountStats()]);
    setRows(r); setSt(s); setLoading(false);
  }, [search]);

  const doSearch = () => load();

  const flash = (text: string) => { setMsg(text); setTimeout(() => setMsg(''), 2500); };

  // 导出含注册时间的账号明细 CSV（复制到剪贴板）
  const onExport = async () => {
    setExporting(true);
    const list = await adminAccountList(search, 500, 0);
    const esc = (v: unknown) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const header = ['邮箱', '注册时间', '玩家昵称', '职级', '职级名', '功勋', '是否封禁', '是否管理员', '管理员角色', '最后登录'].map(esc).join(',');
    const lines = list.map((r) => [
      r.email, r.created_at, r.player_name ?? '', r.rank_level ?? '', r.rank_name ?? '',
      r.merit_points ?? '', r.banned ? '是' : '否', r.is_admin ? '是' : '否', r.admin_role ?? '', r.last_sign_in_at ?? '',
    ].map(esc).join(','));
    const csv = [header, ...lines].join('\n');
    await Clipboard.setStringAsync(csv);
    setExporting(false);
    flash(`✓ 已导出 ${list.length} 条账号明细，CSV 已复制到剪贴板`);
  };

  const onPromote = async (saveId: string) => {
    const r = await adminPromoteRank(saveId, Number(promoteRank));
    flash(r.ok ? `✓ 已晋升至 L${promoteRank}` : `✗ ${r.err}`);
    if (r.ok) load();
  };
  const onBan = async (row: AccountRow) => {
    const r = await adminToggleBan(row.user_id, !row.banned);
    flash(r.ok ? (row.banned ? '✓ 已解封' : '✓ 已封禁') : `✗ ${r.err}`);
    if (r.ok) load();
  };
  // 普通管理员：发起密码重置申请（提交超级管理员审批）
  const onRequestReset = async (userId: string) => {
    const r = await adminRequestPasswordReset(userId, resetReason.trim() || undefined);
    flash(r.ok ? '✓ 已提交密码重置申请，等待超级管理员审批' : `✗ ${r.err}`);
    if (r.ok) setResetReason('');
  };
  // 超级管理员：直接修改玩家密码
  const onSetPassword = async (userId: string) => {
    if (newPwd.length < 6) { flash('✗ 密码至少 6 位'); return; }
    const r = await adminSetPlayerPassword(userId, newPwd);
    flash(r.ok ? '✓ 密码已修改' : `✗ ${r.err}`);
    if (r.ok) setNewPwd('');
  };
  // 超级管理员：查看账号标识（Auth 密码为哈希不可逆，展示账号用于核对）
  const onViewPassword = async (userId: string) => {
    setPwdLoading(true);
    const r = await adminGetPlayerPassword(userId);
    setPwdLoading(false);
    if (r.ok) setPwdEmail(r.email ?? '未知');
    else flash(`✗ ${r.err}`);
  };
  // 超级管理员：删除玩家账号
  const onDeleteAccount = async (userId: string) => {
    const r = await adminDeletePlayerAccount(userId);
    setConfirmDelete(false);
    flash(r.ok ? '✓ 账号已标记删除（30天后自动清除）' : `✗ ${r.err}`);
    if (r.ok) { setSel(null); load(); }
  };

  // 加载软删除账号列表
  const loadDeleted = async () => {
    setDeletedLoading(true);
    const list = await adminAccountList('', 100, 0, true);
    setDeletedRows(list.filter((r) => r.auth_deleted_at));
    setDeletedLoading(false);
  };
  const onToggleDeleted = () => {
    if (!showDeleted) loadDeleted();
    setShowDeleted((v) => !v);
  };

  // 恢复账号
  const onRestoreAccount = async (row: AccountRow) => {
    const r = await adminRestoreAccount(row.user_id);
    flash(r.ok ? `✓ 账号「${row.email}」已恢复` : `✗ ${r.err}`);
    if (r.ok) loadDeleted();
  };

  // 超管：立即清除已过期的软删账号
  const onPurgeExpired = async () => {
    const r = await adminPurgeExpiredAccounts();
    flash(r.ok ? `✓ 已彻底清除 ${r.count ?? 0} 个已过期账号` : `✗ ${r.err}`);
    if (r.ok) loadDeleted();
  };

  const previewInactive = async () => {
    setPreviewing(true); setMsg('');
    const list = await adminPreviewInactive(inactiveDays);
    setPreview(list.map((r) => ({ user_id: r.user_id, email: r.email, last_active: r.last_active, player_name: r.player_name })));
    setPreviewing(false);
    flash(`找到 ${list.length} 个不活跃账号`);
  };
  const deleteInactive = async () => {
    if (preview.length === 0) { flash('请先预览'); return; }
    const cnt = await adminDeleteInactive(preview.map((p) => p.user_id));
    flash(`✓ 已清理 ${cnt} 个账号`);
    setPreview([]);
    load();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* 统计条 */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <MiniStat label="注册用户" value={st?.total_users ?? 0} />
        <MiniStat label="已建角色" value={st?.has_character ?? 0} />
        <MiniStat label="存档保留" value={st?.active_saves ?? 0} />
        <MiniStat label="管理员" value={st?.admin_count ?? 0} />
      </View>

      {/* 搜索 */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <LabeledInput label="搜索（邮箱 / 昵称）" value={search} onChange={setSearch} placeholder="留空查看全部" />
        </View>
        <View style={{ justifyContent: 'flex-end' }}>
          <Btn label="搜索" onPress={doSearch} small />
        </View>
        <View style={{ justifyContent: 'flex-end' }}>
          <Btn label={exporting ? '导出中...' : '导出明细'} onPress={onExport} small variant="blue" disabled={exporting} />
        </View>
      </View>

      {msg ? <Text style={{ color: A.goldLight, fontSize: 12, paddingHorizontal: 4 }}>{msg}</Text> : null}

      {/* 账号列表 */}
      <Card title={`账号列表（${rows.length}）`}>
        {loading ? <ActivityIndicator color={A.gold} /> :
          rows.length === 0 ? <Empty text="无匹配账号" /> :
          rows.map((row) => (
            <View key={row.user_id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: A.divider, gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: A.textPrimary, fontSize: 12, fontWeight: '600', flex: 1 }}>{row.email}</Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {row.is_admin ? <Badge text={row.admin_role ?? 'admin'} color={A.gold} /> : null}
                  {row.banned ? <Badge text="封禁" color={A.red} /> : null}
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Text style={{ color: A.textSecond, fontSize: 10 }}>注册 {new Date(row.created_at).toLocaleString('zh-CN')}</Text>
                {row.player_name ? <Text style={{ color: A.textSecond, fontSize: 10 }}>{row.player_name} L{row.rank_level} {row.rank_name}</Text> : null}
              </View>
              {/* 密码显示：超管显示账号标识入口，普通管理员显示 *** */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: A.textHint, fontSize: 10 }}>密码：</Text>
                {isSuperAdmin ? (
                  <Pressable cssInterop={false} onPress={() => onViewPassword(row.user_id)} hitSlop={6}>
                    <Text style={{ color: A.gold, fontSize: 10, fontWeight: '600' }}>{pwdLoading ? '查询中...' : '查看账号 ›'}</Text>
                  </Pressable>
                ) : (
                  <Text style={{ color: A.textHint, fontSize: 10 }}>********（仅超级管理员可查看）</Text>
                )}
              </View>
              <Btn label={sel?.user_id === row.user_id ? '收起操作' : '展开操作'} onPress={() => setSel(sel?.user_id === row.user_id ? null : row)} small variant="ghost" />
              {sel?.user_id === row.user_id ? (
                <View style={{ marginTop: 8, gap: 10, backgroundColor: A.bgInput, padding: 10, borderWidth: 1, borderColor: A.border }}>
                  <Text style={{ color: A.goldLight, fontSize: 11, fontWeight: '700' }}>账号操作</Text>
                  {/* 晋升（需存档） */}
                  {row.save_id ? (
                    <View style={{ gap: 6 }}>
                      <Text style={{ color: A.textSecond, fontSize: 10 }}>职务晋升（目标职级 1-15）</Text>
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                          <LabeledInput label="" value={promoteRank} onChange={setPromoteRank} placeholder="如 8" keyboardType="number-pad" />
                        </View>
                        <View style={{ justifyContent: 'flex-end' }}>
                          <Btn label="晋升" onPress={() => onPromote(row.save_id!)} small variant="gold" disabled={!canResetBan} />
                        </View>
                      </View>
                    </View>
                  ) : <Text style={{ color: A.textHint, fontSize: 10 }}>该用户尚未建角色</Text>}

                  {/* 封禁/解封 */}
                  {canResetBan ? (
                    <Btn label={row.banned ? '🔓 解封账号' : '🔒 封禁账号'} onPress={() => onBan(row)} small variant={row.banned ? 'green' : 'red'} />
                  ) : null}

                  {/* 密码：超管直接改密 / 普通管理员发起重置申请 */}
                  {isSuperAdmin ? (
                    <View style={{ gap: 6 }}>
                      <Text style={{ color: A.textSecond, fontSize: 10 }}>修改密码（≥6位，立即生效）</Text>
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
                        <View style={{ flex: 1 }}>
                          <LabeledInput label="" value={newPwd} onChange={setNewPwd} placeholder="新密码" />
                        </View>
                        <Btn label="修改密码" onPress={() => onSetPassword(row.user_id)} small variant="blue" />
                      </View>
                      {/* 删除账号 */}
                      {confirmDelete ? (
                        <View style={{ gap: 6, marginTop: 4 }}>
                          <Text style={{ color: A.red, fontSize: 11, fontWeight: '700' }}>确认删除账号 {row.email}？此操作不可恢复！</Text>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <Btn label="确认删除" onPress={() => onDeleteAccount(row.user_id)} variant="red" small style={{ flex: 1 }} />
                            <Btn label="取消" onPress={() => setConfirmDelete(false)} variant="ghost" small style={{ flex: 1 }} />
                          </View>
                        </View>
                      ) : (
                        <Btn label="🗑️ 删除该账号" onPress={() => setConfirmDelete(true)} variant="red" small />
                      )}
                    </View>
                  ) : (
                    <View style={{ gap: 6 }}>
                      <Text style={{ color: A.textHint, fontSize: 10 }}>普通管理员无法直接修改密码，需向超级管理员申请重置</Text>
                      <LabeledInput label="重置原因（可选）" value={resetReason} onChange={setResetReason} placeholder="如：玩家忘记密码" />
                      <Btn label="📝 提交密码重置申请" onPress={() => onRequestReset(row.user_id)} variant="blue" small />
                    </View>
                  )}
                </View>
              ) : null}
            </View>
          ))
        }
      </Card>

      {/* 不活跃清理（super_admin） */}
      {canDeleteInactive ? (
        <Card title="不活跃账号清理" accent={A.red}>
          <Text style={{ color: A.textSecond, fontSize: 11, lineHeight: 17, marginBottom: 8 }}>
            彻底删除超过指定天数未登录的账号（从数据库永久移除，不可恢复）
          </Text>
          {/* 天数滚轮选择器 */}
          <View style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, padding: 10, marginBottom: 10 }}>
            <Text style={{ color: A.textHint, fontSize: 10, marginBottom: 6, letterSpacing: 0.5 }}>选择清理天数（1–31 天）</Text>
            <WheelPicker values={DAYS_VALUES} selected={inactiveDays} onChange={setInactiveDays} unit="天未登录" />
          </View>
          <Btn label={previewing ? '查询中...' : `预览 ${inactiveDays} 天未登录账号`} onPress={previewInactive} variant="ghost" disabled={previewing} />
          {preview.length > 0 ? (
            <View style={{ marginTop: 10, gap: 6 }}>
              {preview.map((p) => (
                <Row key={p.user_id} label={p.email} value={`${p.player_name ?? '无存档'} · ${new Date(p.last_active).toLocaleDateString('zh-CN')}`} />
              ))}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Btn label={`确认删除 ${preview.length} 个`} onPress={deleteInactive} variant="red" />
                <Btn label="取消" onPress={() => setPreview([])} variant="ghost" small />
              </View>
            </View>
          ) : null}
        </Card>
      ) : null}

      {/* 软删除账号保留区（30天保留） */}
      <Card title="待删除账号（30天保留）" accent={A.red}>
        <View style={{ gap: 8 }}>
          {/* 说明条 */}
          <View style={{ backgroundColor: 'rgba(200,50,50,0.1)', borderLeftWidth: 2, borderLeftColor: A.red, paddingHorizontal: 10, paddingVertical: 7 }}>
            <Text style={{ color: A.textSecond, fontSize: 11, lineHeight: 17 }}>
              {'被删除的账号会在此保留 30 天，期间数据完整保留，超管可一键恢复。\n到期后可手动彻底清除，或由系统自动处理。'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn label={showDeleted ? '收起列表' : '查看待删除账号'} onPress={onToggleDeleted} small variant="ghost" />
            {isSuperAdmin && showDeleted && (
              <Btn label="清除已过期" onPress={onPurgeExpired} small variant="red" />
            )}
          </View>
          {showDeleted && (
            deletedLoading ? <ActivityIndicator color={A.red} style={{ marginTop: 8 }} /> :
            deletedRows.length === 0 ? (
              <Text style={{ color: A.textHint, fontSize: 12, textAlign: 'center', marginTop: 6 }}>暂无待删除账号</Text>
            ) : (
              <View style={{ gap: 8, marginTop: 4 }}>
                {deletedRows.map((row) => {
                  const deletedAt = row.auth_deleted_at ? new Date(row.auth_deleted_at) : null;
                  const purgeAt = deletedAt ? new Date(deletedAt.getTime() + 30 * 86400000) : null;
                  const daysLeft = purgeAt ? Math.max(0, Math.ceil((purgeAt.getTime() - Date.now()) / 86400000)) : 0;
                  const expired = daysLeft === 0;
                  return (
                    <View key={row.user_id} style={{ backgroundColor: A.bgMid, borderWidth: 1, borderColor: expired ? A.red : A.divider, padding: 10, gap: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ color: A.textPrimary, fontSize: 12, flex: 1 }}>{row.email}</Text>
                        <View style={{ backgroundColor: expired ? A.red : 'rgba(200,50,50,0.25)', paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ color: expired ? '#fff' : A.red, fontSize: 10, fontWeight: '700' }}>
                            {expired ? '已到期' : `${daysLeft}天后清除`}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: A.textHint, fontSize: 10 }}>
                        {row.player_name ? `角色：${row.player_name}` : '无存档'}
                        {deletedAt ? `　删除时间：${deletedAt.toLocaleDateString('zh-CN')}` : ''}
                      </Text>
                      {isSuperAdmin && !expired && (
                        <Btn label="恢复账号" onPress={() => onRestoreAccount(row)} small variant="green" />
                      )}
                    </View>
                  );
                })}
              </View>
            )
          )}
        </View>
      </Card>
    </ScrollView>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flex: 1, backgroundColor: A.bgMid, borderWidth: 1, borderColor: A.divider, padding: 8, alignItems: 'center', gap: 2 }}>
      <Text style={{ color: A.gold, fontSize: 9 }}>{label}</Text>
      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>{value.toLocaleString()}</Text>
    </View>
  );
}
```

<a id="srccomponentsadminapprovaltabtsx"></a>
## `src/components/admin/ApprovalTab.tsx`

```tsx
// 用户审批 Tab（admin+）：统计、搜索、状态筛选、批量通过/驳回、详情、拒绝模板、30s 自动刷新
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { A, Badge, Btn, Card, Empty } from './shared';
import { adminApprovalList, adminApprovalStats, adminApproveUser, adminBatchApproveAll, adminBatchReject, adminGetAutoApproval, adminRejectUser, adminSetAutoApproval, adminSetCodeSystem, adminTodaySystemRejectedCount, type ApprovalRow, type ApprovalStats, type AutoApprovalConfig } from '@/lib/adminApi';

const REJECT_TEMPLATES = [
  '信息不完整，请补充真实资料后重新申请',
  '测试码已过期，请使用新的测试码申请',
  '注册信息与测试码不匹配',
  '不符合当前内测资格要求',
  '重复申请，已有一个有效账号',
  '⚠️ 系统检测：该设备已有账号登录，不允许重复注册',
  '内测资格已满，请等待下一批次开放',
  '账号信息异常，请联系管理员处理',
];

const STATUS_LABEL: Record<string, string> = { pending: '待审核', approved: '已通过', rejected: '已驳回' };
const STATUS_COLOR: Record<string, string> = { pending: A.gold, approved: A.green, rejected: A.red };

export function ApprovalTab({ role: _role }: { role: string }) {
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [stats, setStats] = useState<ApprovalStats>({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // 隐藏已审批记录开关
  const [hideDone, setHideDone] = useState(false);
  // 自动审批配置
  const [autoCfg, setAutoCfg] = useState<AutoApprovalConfig>({ enabled: false, note: null, updated_by: null, updated_at: null, code_system_enabled: true });
  const [autoLoading, setAutoLoading] = useState(false);
  const [confirmAuto, setConfirmAuto] = useState(false);
  const [codeConfirm, setCodeConfirm] = useState(false);
  // 今日系统拒绝人数
  const [todayRejected, setTodayRejected] = useState(0);
  const isSuper = _role === 'super_admin';
  // 一键批量通过确认框
  const [confirmApproveAll, setConfirmApproveAll] = useState(false);
  const [approveAllLoading, setApproveAllLoading] = useState(false);

  const [detail, setDetail] = useState<ApprovalRow | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ userId: string; batch: boolean } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const [list, s, auto, today] = await Promise.all([
      adminApprovalList(search, statusFilter, 100),
      adminApprovalStats(),
      adminGetAutoApproval(),
      adminTodaySystemRejectedCount(),
    ]);
    setRows(list);
    setStats(s);
    setAutoCfg(auto);
    setTodayRejected(today);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    // 搜索输入做 400ms 防抖，避免每次按键都触发请求
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(load, 400);
    timer.current = setInterval(load, 30000);
    return () => {
      if (timer.current) clearInterval(timer.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [load]);

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 2500);
  };

  const approve = async (userId: string) => {
    const { ok, err } = await adminApproveUser(userId);
    if (!ok) { flash(false, err ?? '操作失败'); return; }
    flash(true, '✓ 已通过审批');
    load();
  };

  /** 一键通过全部 pending（服务端直接执行，不受前端分页限制） */
  const approveAll = async () => {
    setApproveAllLoading(true);
    const { count, err } = await adminBatchApproveAll();
    setApproveAllLoading(false);
    setConfirmApproveAll(false);
    if (err) { flash(false, `操作失败：${err}`); return; }
    flash(true, `✅ 已一键通过全部 ${count} 个待审核用户`);
    load();
  };

  const openReject = (userId: string, batch: boolean) => {
    setRejectTarget({ userId, batch });
    setRejectReason('');
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    const reason = rejectReason.trim() || '未通过';
    if (rejectTarget.batch) {
      const ids = Array.from(selected);
      const count = await adminBatchReject(ids, reason);
      flash(true, `✓ 已批量驳回 ${count} 条`);
      setSelected(new Set());
      setSelectMode(false);
    } else {
      const { ok, err } = await adminRejectUser(rejectTarget.userId, reason);
      if (!ok) { flash(false, err ?? '操作失败'); setRejectTarget(null); return; }
      flash(true, '✓ 已驳回');
    }
    setRejectTarget(null);
    load();
  };

  const toggleSelect = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  /** 切换自动审批模式（仅超级管理员） */
  const applyAutoApproval = async () => {
    setConfirmAuto(false);
    setAutoLoading(true);
    const next = !autoCfg.enabled;
    const { ok, err } = await adminSetAutoApproval(next, autoCfg.note ?? undefined);
    setAutoLoading(false);
    if (!ok) { flash(false, err ?? '操作失败'); return; }
    flash(true, next ? '🟢 已开启自动审批' : '⚪ 已关闭自动审批，恢复手动模式');
    load();
  };

  const applyCodeSystem = async () => {
    setCodeConfirm(false);
    setAutoLoading(true);
    const next = !autoCfg.code_system_enabled;
    const { ok, err } = await adminSetCodeSystem(next);
    setAutoLoading(false);
    if (!ok) { flash(false, err ?? '操作失败'); return; }
    flash(true, next ? '🔑 已开启激活码制' : '🔓 已关闭激活码制，用户可凭邮箱直接注册/登录');
    load();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false}>
      {/* 统计面板 */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[
          { l: '待审核', v: stats.pending, c: A.gold },
          { l: '已通过', v: stats.approved, c: A.green },
          { l: '已驳回', v: stats.rejected, c: A.red },
          { l: '总计', v: stats.total, c: A.blue },
        ].map((s) => (
          <View key={s.l} style={{ flex: 1, backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, padding: 10, alignItems: 'center' }}>
            <Text style={{ color: s.c, fontSize: 18, fontWeight: '700' }}>{s.v}</Text>
            <Text style={{ color: A.textSecond, fontSize: 10 }}>{s.l}</Text>
          </View>
        ))}
      </View>

      {/* 自动审批模式状态卡片 */}
      <View style={{
        backgroundColor: autoCfg.enabled ? 'rgba(76,175,80,0.12)' : A.bgCard,
        borderWidth: 1,
        borderColor: autoCfg.enabled ? A.green : A.divider,
        borderLeftWidth: autoCfg.enabled ? 3 : 1,
        borderLeftColor: autoCfg.enabled ? A.green : A.divider,
        padding: 12, gap: 8,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: autoCfg.enabled ? A.green : A.textHint }} />
            <Text style={{ color: autoCfg.enabled ? '#7FE0A0' : A.textPrimary, fontSize: 13, fontWeight: '700' }}>
              {autoCfg.enabled ? '自动审批已开启' : '手动审批模式'}
            </Text>
          </View>
          {isSuper ? (
            <Pressable
              onPress={() => setConfirmAuto(true)}
              disabled={autoLoading}
              style={{
                paddingHorizontal: 12, paddingVertical: 6,
                borderWidth: 1,
                borderColor: autoCfg.enabled ? A.red : A.green,
                backgroundColor: autoCfg.enabled ? 'rgba(255,100,100,0.15)' : 'rgba(76,175,80,0.15)',
                opacity: autoLoading ? 0.5 : 1,
              }}
            >
              <Text style={{ color: autoCfg.enabled ? '#FF7070' : '#7FE0A0', fontSize: 11, fontWeight: '700' }}>
                {autoLoading ? '处理中…' : autoCfg.enabled ? '关闭自动审批' : '开启自动审批'}
              </Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={{ color: A.textSecond, fontSize: 10 }}>
          {autoCfg.enabled
            ? '新申请将自动通过；重复邮箱、同设备多账号将被系统拒绝并进入申诉（7天未申诉自动清除）。'
            : '所有申请需管理员手动审批。开启后普通管理员无需手动操作。'}
        </Text>
        {/* 今日系统拒绝统计 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <Text style={{ color: todayRejected > 0 ? '#C8A84B' : A.textHint, fontSize: 11, fontWeight: '700' }}>
            🤖 今日系统拒绝：{todayRejected} 人
          </Text>
          {todayRejected > 0 ? (
            <Text style={{ color: A.textHint, fontSize: 9 }}>（可在「账号申诉」页查看详情）</Text>
          ) : null}
        </View>
        {autoCfg.updated_at ? (
          <Text style={{ color: A.textHint, fontSize: 9 }}>
            最近更新：{autoCfg.updated_at.slice(0, 16).replace('T', ' ')}
          </Text>
        ) : null}
      </View>

      {/* 激活码制开关卡片 */}
      <View style={{
        backgroundColor: autoCfg.code_system_enabled ? A.bgCard : 'rgba(76,175,80,0.12)',
        borderWidth: 1,
        borderColor: autoCfg.code_system_enabled ? A.divider : A.green,
        borderLeftWidth: autoCfg.code_system_enabled ? 1 : 3,
        borderLeftColor: autoCfg.code_system_enabled ? A.divider : A.green,
        padding: 12, gap: 8,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: autoCfg.code_system_enabled ? A.gold : A.green }} />
            <Text style={{ color: autoCfg.code_system_enabled ? A.textPrimary : '#7FE0A0', fontSize: 13, fontWeight: '700' }}>
              {autoCfg.code_system_enabled ? '激活码制已开启' : '激活码制已关闭'}
            </Text>
          </View>
          {isSuper ? (
            <Pressable
              onPress={() => setCodeConfirm(true)}
              disabled={autoLoading}
              style={{
                paddingHorizontal: 12, paddingVertical: 6,
                borderWidth: 1,
                borderColor: autoCfg.code_system_enabled ? A.green : A.red,
                backgroundColor: autoCfg.code_system_enabled ? 'rgba(76,175,80,0.15)' : 'rgba(255,100,100,0.15)',
                opacity: autoLoading ? 0.5 : 1,
              }}
            >
              <Text style={{ color: autoCfg.code_system_enabled ? '#7FE0A0' : '#FF7070', fontSize: 11, fontWeight: '700' }}>
                {autoLoading ? '处理中…' : autoCfg.code_system_enabled ? '关闭激活码制' : '开启激活码制'}
              </Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={{ color: A.textSecond, fontSize: 10 }}>
          {autoCfg.code_system_enabled
            ? '用户注册后需输入管理员分配的测试码并通过审批方可进入游戏。'
            : '用户可凭邮箱直接注册/登录，无需测试码即可进入游戏。'}
        </Text>
      </View>

      {msg ? (
        <View style={{ backgroundColor: msg.ok ? A.greenBg : A.redBg, borderLeftWidth: 2, borderLeftColor: msg.ok ? A.green : A.red, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ color: msg.ok ? '#7FE0A0' : '#FF7070', fontSize: 12 }}>{msg.text}</Text>
        </View>
      ) : null}

      {/* 搜索 */}
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="按邮箱或玩家名搜索"
        placeholderTextColor={A.textHint}
        style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13 }}
      />

      {/* 状态筛选 */}
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {['all', 'pending', 'approved', 'rejected'].map((s) => (
          <Pressable key={s} onPress={() => setStatusFilter(s)} style={{ paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: statusFilter === s ? A.gold : A.divider, backgroundColor: statusFilter === s ? A.goldBg : 'transparent' }}>
            <Text style={{ color: statusFilter === s ? A.goldLight : A.textSecond, fontSize: 11 }}>{s === 'all' ? '全部' : STATUS_LABEL[s]}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Btn label="刷新" onPress={load} variant="ghost" small />
        <Btn label={`🚀 一键全部通过${stats.pending > 0 ? `(${stats.pending})` : ''}`} onPress={() => { if (stats.pending === 0) { flash(false, '暂无待审核用户'); } else { setConfirmApproveAll(true); } }} variant="green" small disabled={stats.pending === 0} />
        <Btn label={selectMode ? '取消多选' : '多选'} onPress={() => { setSelectMode(!selectMode); setSelected(new Set()); }} variant="blue" small />
        <Btn label={hideDone ? '显示全部' : '隐藏已审批'} onPress={() => setHideDone(!hideDone)} variant="ghost" small />
        {selectMode ? <Btn label={`批量驳回(${selected.size})`} onPress={() => openReject('', true)} variant="red" small disabled={selected.size === 0} /> : null}
      </View>

      {loading ? <ActivityIndicator color={A.gold} size="large" /> :
        rows.length === 0 ? <Empty text="暂无审批记录" /> :
        (() => {
          const visible = hideDone ? rows.filter((r) => r.status === 'pending') : rows;
          if (visible.length === 0) return <Empty text={hideDone ? '暂无待审核记录' : '暂无审批记录'} />;
          return visible.map((r) => (
          <Pressable key={r.id} onPress={() => selectMode ? toggleSelect(r.user_id) : setDetail(r)} style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: selectMode && selected.has(r.user_id) ? A.gold : A.divider, padding: 12 }}>
            {/* 重复邮箱警示 */}
            {r.dup_email_count > 1 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, backgroundColor: 'rgba(255,160,0,0.12)', borderLeftWidth: 2, borderLeftColor: '#FFA000', paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ color: '#FFA000', fontSize: 10, fontWeight: '700' }}>⚠ 重复申请</Text>
                <Text style={{ color: '#FFA000', fontSize: 10 }}>同邮箱共 {r.dup_email_count} 条记录，通过/驳回本条将自动处理其余重复条目</Text>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: A.textPrimary, fontSize: 13, fontWeight: '600' }}>{r.email || '未知邮箱'}</Text>
              <Badge text={STATUS_LABEL[r.status] ?? r.status} color={STATUS_COLOR[r.status] ?? A.gold} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              {r.player_name ? <Text style={{ color: A.textSecond, fontSize: 10 }}>玩家 {r.player_name}</Text> : null}
              {r.rank_name ? <Text style={{ color: A.textSecond, fontSize: 10 }}>{r.rank_name}</Text> : null}
              <Text style={{ color: A.textHint, fontSize: 10 }}>{r.created_at?.slice(0, 10)}</Text>
            </View>
            {r.status === 'pending' ? (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Btn label="通过" onPress={() => approve(r.user_id)} variant="green" small style={{ flex: 1 }} />
                <Btn label="驳回" onPress={() => openReject(r.user_id, false)} variant="red" small style={{ flex: 1 }} />
              </View>
            ) : null}
          </Pressable>
          ));
        })()
      }

      {/* 详情弹窗 */}
      <Modal visible={!!detail} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 }} onPress={() => setDetail(null)}>
          <Pressable style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, padding: 16, gap: 8 }} onPress={(e) => e.stopPropagation()}>
            <Text style={{ color: A.goldLight, fontSize: 14, fontWeight: '700', letterSpacing: 1 }}>审批详情</Text>
            <Text style={{ color: A.textSecond, fontSize: 12 }}>邮箱：{detail?.email || '未知'}</Text>
            <Text style={{ color: A.textSecond, fontSize: 12 }}>玩家：{detail?.player_name || '未创建角色'}</Text>
            <Text style={{ color: A.textSecond, fontSize: 12 }}>职级：{detail?.rank_name ?? '—'}</Text>
            <Text style={{ color: A.textSecond, fontSize: 12 }}>状态：{detail ? STATUS_LABEL[detail.status] : ''}</Text>
            <Text style={{ color: A.textSecond, fontSize: 12 }}>提交时间：{detail?.created_at?.slice(0, 19).replace('T', ' ')}</Text>
            {detail?.reject_reason ? <Text style={{ color: '#FF9A9A', fontSize: 12 }}>驳回原因：{detail.reject_reason}</Text> : null}
            <Btn label="关闭" onPress={() => setDetail(null)} variant="ghost" small style={{ marginTop: 4 }} />
          </Pressable>
        </Pressable>
      </Modal>

      {/* 驳回弹窗 */}
      <Modal visible={!!rejectTarget} transparent animationType="fade" onRequestClose={() => setRejectTarget(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 }} onPress={() => setRejectTarget(null)}>
          <Pressable style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, padding: 16, gap: 10 }} onPress={(e) => e.stopPropagation()}>
            <Text style={{ color: A.goldLight, fontSize: 14, fontWeight: '700', letterSpacing: 1 }}>驳回原因</Text>
            <View style={{ gap: 6 }}>
              {REJECT_TEMPLATES.map((t) => (
                <Pressable key={t} onPress={() => setRejectReason(t)} style={{ borderWidth: 1, borderColor: rejectReason === t ? A.gold : A.divider, backgroundColor: rejectReason === t ? A.goldBg : 'transparent', paddingHorizontal: 10, paddingVertical: 8 }}>
                  <Text style={{ color: rejectReason === t ? A.goldLight : A.textSecond, fontSize: 11 }}>{t}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput value={rejectReason} onChangeText={setRejectReason} placeholder="或自定义输入原因" placeholderTextColor={A.textHint} multiline style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, minHeight: 60, textAlignVertical: 'top' }} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Btn label="取消" onPress={() => setRejectTarget(null)} variant="ghost" small style={{ flex: 1 }} />
              <Btn label="确认驳回" onPress={submitReject} variant="red" small style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 一键全部通过确认框 */}
      <Modal visible={confirmApproveAll} transparent animationType="fade" onRequestClose={() => setConfirmApproveAll(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 24 }} onPress={() => setConfirmApproveAll(false)}>
          <Pressable style={{ backgroundColor: A.bgCard, borderWidth: 2, borderColor: A.green, padding: 20, gap: 12 }} onPress={(e) => e.stopPropagation()}>
            <Text style={{ color: '#7FE0A0', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>🚀 一键通过全部</Text>
            <Text style={{ color: A.textSecond, fontSize: 13, lineHeight: 20 }}>
              即将批量通过 <Text style={{ color: A.goldLight, fontWeight: '700' }}>{stats.pending} 个</Text>待审核用户。{'\n'}
              已驳回用户不受影响。此操作不可撤销，请确认。
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <Btn label="取消" onPress={() => setConfirmApproveAll(false)} variant="ghost" small style={{ flex: 1 }} />
              <Btn
                label={approveAllLoading ? '处理中...' : `确认通过 ${stats.pending} 人`}
                onPress={approveAll}
                variant="green"
                small
                disabled={approveAllLoading}
                style={{ flex: 2 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 自动审批切换确认 */}
      <Modal visible={confirmAuto} transparent animationType="fade" onRequestClose={() => setConfirmAuto(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 24 }} onPress={() => setConfirmAuto(false)}>
          <Pressable style={{ backgroundColor: A.bgCard, borderWidth: 2, borderColor: autoCfg.enabled ? A.red : A.green, padding: 20, gap: 12 }} onPress={(e) => e.stopPropagation()}>
            <Text style={{ color: autoCfg.enabled ? '#FF7070' : '#7FE0A0', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>
              {autoCfg.enabled ? '关闭自动审批' : '开启自动审批'}
            </Text>
            <Text style={{ color: A.textSecond, fontSize: 13, lineHeight: 20 }}>
              {autoCfg.enabled
                ? '关闭后，所有新申请将恢复为手动审批模式，需管理员逐条处理。'
                : '开启后，新申请将自动通过；重复邮箱、同设备多账号将被系统拒绝并进入申诉（7天未申诉自动清除）。普通管理员无需手动操作。'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <Btn label="取消" onPress={() => setConfirmAuto(false)} variant="ghost" small style={{ flex: 1 }} />
              <Btn
                label={autoLoading ? '处理中...' : '确认'}
                onPress={applyAutoApproval}
                variant={autoCfg.enabled ? 'red' : 'green'}
                small
                disabled={autoLoading}
                style={{ flex: 2 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 激活码制切换确认 */}
      <Modal visible={codeConfirm} transparent animationType="fade" onRequestClose={() => setCodeConfirm(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 24 }} onPress={() => setCodeConfirm(false)}>
          <Pressable style={{ backgroundColor: A.bgCard, borderWidth: 2, borderColor: autoCfg.code_system_enabled ? A.red : A.green, padding: 20, gap: 12 }} onPress={(e) => e.stopPropagation()}>
            <Text style={{ color: autoCfg.code_system_enabled ? '#FF7070' : '#7FE0A0', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>
              {autoCfg.code_system_enabled ? '关闭激活码制' : '开启激活码制'}
            </Text>
            <Text style={{ color: A.textSecond, fontSize: 13, lineHeight: 20 }}>
              {autoCfg.code_system_enabled
                ? '关闭后，用户可凭邮箱直接注册/登录，无需测试码即可进入游戏。已通过审批的账号不受影响。'
                : '开启后，用户注册后需输入管理员分配的测试码并通过审批方可进入游戏。'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <Btn label="取消" onPress={() => setCodeConfirm(false)} variant="ghost" small style={{ flex: 1 }} />
              <Btn
                label={autoLoading ? '处理中...' : '确认'}
                onPress={applyCodeSystem}
                variant={autoCfg.code_system_enabled ? 'red' : 'green'}
                small
                disabled={autoLoading}
                style={{ flex: 2 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
```

<a id="srccomponentsadminbanappealstabtsx"></a>
## `src/components/admin/BanAppealsTab.tsx`

```tsx
// 封禁申诉 Tab：玩家提交的封禁申诉，超管审核（通过即解封）
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/client/supabase';
import {
  adminListBanAppeals, adminReviewBanAppeal,
  type BanAppealRow,
} from '@/lib/adminApi';
import { A, Badge, Btn, Empty } from './shared';

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending:  { label: '待审核', color: A.gold },
  approved: { label: '已通过', color: A.green },
  rejected: { label: '已驳回', color: A.red },
};
// 封禁类型中文标签
const BAN_TYPE_LABEL: Record<string, string> = {
  device: '设备封禁',
  ip: 'IP 封禁',
  email: '邮箱封禁',
};
type Filter = 'pending' | 'approved' | 'rejected' | 'all';

export function BanAppealsTab({ role }: { role: string }) {
  const isSuperAdmin = role === 'super_admin';
  const [records, setRecords] = useState<BanAppealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('pending');
  const [page, setPage] = useState(0);
  const PAGE = 30;
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [detail, setDetail] = useState<BanAppealRow | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const load = useCallback(async (p = 0, f: Filter = filter) => {
    setLoading(true);
    const data = await adminListBanAppeals(f === 'all' ? undefined : f, PAGE, p * PAGE);
    setRecords(data);
    setLoading(false);
  }, [filter]);

  useFocusEffect(useCallback(() => { load(0); setPage(0); }, [load]));

  // 实时订阅 ban_appeals 表变更，申诉列表实时刷新
  useEffect(() => {
    const channel = supabase
      .channel('ban-appeals-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ban_appeals' }, () => {
        load(page, filter);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load, page, filter]);

  const openDetail = (r: BanAppealRow) => {
    setDetail(r);
    setReviewNote(r.review_note ?? '');
  };

  const doReview = async (approve: boolean) => {
    if (!detail) return;
    setProcessing(true);
    const res = await adminReviewBanAppeal(detail.id, approve, reviewNote.trim() || undefined);
    setProcessing(false);
    if (res.ok) {
      flash(true, approve ? '已通过申诉并解封该账号' : '已驳回该申诉');
      setDetail(null);
      load(page, filter);
    } else {
      flash(false, res.err ?? '操作失败');
    }
  };

  const filters: Filter[] = ['pending', 'approved', 'rejected', 'all'];

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false}>
      <Text style={{ color: A.textSecond, fontSize: 11, letterSpacing: 0.5 }}>
        玩家被封禁后可通过登录页申诉入口提交申诉。超管审核通过后自动解封该账号。
      </Text>

      {msg ? (
        <View style={{ backgroundColor: msg.ok ? A.greenBg : A.redBg, borderLeftWidth: 2, borderLeftColor: msg.ok ? A.green : A.red, paddingHorizontal: 10, paddingVertical: 7 }}>
          <Text style={{ color: msg.ok ? '#7FE0A0' : '#FF7070', fontSize: 12 }}>{msg.text}</Text>
        </View>
      ) : null}

      {/* 状态筛选 */}
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {filters.map((f) => (
          <Pressable key={f} onPress={() => { setFilter(f); setPage(0); load(0, f); }}
            style={{ flex: 1, paddingVertical: 7, alignItems: 'center', borderWidth: 1, borderColor: filter === f ? A.gold : A.divider, backgroundColor: filter === f ? A.goldBg : 'transparent' }}>
            <Text style={{ color: filter === f ? A.goldLight : A.textSecond, fontSize: 11, fontWeight: filter === f ? '700' : '400' }}>
              {f === 'all' ? '全部' : STATUS_META[f]?.label ?? f}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={A.gold} style={{ marginTop: 24 }} />
      ) : records.length === 0 ? (
        <Empty text="暂无封禁申诉记录" />
      ) : (
        <View style={{ gap: 8 }}>
          {records.map((r) => {
            const meta = STATUS_META[r.status] ?? { label: r.status, color: A.textSecond };
            return (
              <Pressable key={r.id} onPress={() => openDetail(r)} cssInterop={false}
                style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, padding: 12, gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: A.textPrimary, fontSize: 13, fontWeight: '700' }}>{r.email}</Text>
                  <Badge text={meta.label} color={meta.color} />
                </View>
                <Text style={{ color: A.textSecond, fontSize: 11 }} numberOfLines={2}>{r.reason}</Text>
                <Text style={{ color: A.textHint, fontSize: 10 }}>{new Date(r.created_at).toLocaleString('zh-CN')}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* 分页 */}
      {records.length > 0 ? (
        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 4 }}>
          <Btn label="上一页" variant="ghost" small disabled={page === 0} onPress={() => { const p = Math.max(0, page - 1); setPage(p); load(p, filter); }} />
          <Text style={{ color: A.textHint, fontSize: 11, alignSelf: 'center' }}>第 {page + 1} 页</Text>
          <Btn label="下一页" variant="ghost" small disabled={records.length < PAGE} onPress={() => { const p = page + 1; setPage(p); load(p, filter); }} />
        </View>
      ) : null}

      {/* 详情/审核弹窗 */}
      <Modal visible={!!detail} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', paddingHorizontal: 20 }} onPress={() => setDetail(null)}>
          <Pressable style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.gold, padding: 16, gap: 10 }} onPress={() => {}}>
            <Text style={{ color: A.goldLight, fontSize: 14, fontWeight: '700' }}>封禁申诉详情</Text>
            <View style={{ gap: 4 }}>
              <Text style={{ color: A.textSecond, fontSize: 11 }}>账号：{detail?.email}</Text>
              <Text style={{ color: A.textSecond, fontSize: 11 }}>状态：{detail ? (STATUS_META[detail.status]?.label ?? detail.status) : ''}</Text>
              <Text style={{ color: A.textSecond, fontSize: 11 }}>
                封禁类型：{detail?.ban_type ? (BAN_TYPE_LABEL[detail.ban_type] ?? detail.ban_type) : '未知'}
              </Text>
              <Text style={{ color: A.textSecond, fontSize: 11 }}>
                封禁时间：{detail?.banned_at ? new Date(detail.banned_at).toLocaleString('zh-CN') : '—'}
              </Text>
              <Text style={{ color: A.textSecond, fontSize: 11 }}>提交时间：{detail ? new Date(detail.created_at).toLocaleString('zh-CN') : ''}</Text>
            </View>
            <View style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, padding: 10 }}>
              <Text style={{ color: A.textPrimary, fontSize: 12, lineHeight: 18 }}>{detail?.reason}</Text>
            </View>
            <Text style={{ color: A.textSecond, fontSize: 11 }}>审核备注</Text>
            <TextInput
              style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, paddingHorizontal: 10, paddingVertical: 8, color: A.textPrimary, fontSize: 12 }}
              placeholder="可选：填写审核备注"
              placeholderTextColor={A.textHint}
              value={reviewNote}
              onChangeText={setReviewNote}
              multiline
            />
            {isSuperAdmin && detail?.status === 'pending' ? (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <Btn label={processing ? '处理中...' : '通过并解封'} variant="green" disabled={processing} onPress={() => doReview(true)} style={{ flex: 1 }} />
                <Btn label="驳回" variant="red" disabled={processing} onPress={() => doReview(false)} style={{ flex: 1 }} />
              </View>
            ) : (
              <Text style={{ color: A.textHint, fontSize: 11 }}>
                {!isSuperAdmin ? '仅超级管理员可审核申诉' : '该申诉已处理'}
              </Text>
            )}
            <Btn label="关闭" variant="ghost" small onPress={() => setDetail(null)} />
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
```

<a id="srccomponentsadminbannedtabtsx"></a>
## `src/components/admin/BannedTab.tsx`

```tsx
// 封禁记录 Tab：展示 banned_entities 全部封禁记录，支持类型筛选 + 超管解封
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  adminListBannedEntities, adminUnbanEntity, adminBannedEntitiesStats,
  type BannedEntityRow, type BannedEntitiesStats,
} from '@/lib/adminApi';
import { A, Badge, Btn, Empty } from './shared';

const TYPE_LABELS: Record<string, string> = {
  user: '账号', email: '邮箱', device: '设备', ip: 'IP地址', vpn: 'VPN',
};
const TYPE_COLORS: Record<string, string> = {
  user: '#C82829', email: '#C8A84B', device: '#4A7FBF', ip: '#8B5CF6', vpn: '#F97316',
};

type TypeFilter = 'all' | 'user' | 'email' | 'device' | 'ip';

export function BannedTab({ role }: { role: string }) {
  const isSuperAdmin = role === 'super_admin';
  const [records, setRecords] = useState<BannedEntityRow[]>([]);
  const [stats, setStats] = useState<BannedEntitiesStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [page, setPage] = useState(0);
  const PAGE = 30;
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [unbanning, setUnbanning] = useState<string | null>(null);

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 5000);
  };

  const load = useCallback(async (p = 0, t: TypeFilter = typeFilter) => {
    setLoading(true);
    const [data, s] = await Promise.all([
      adminListBannedEntities(PAGE, p * PAGE, t === 'all' ? undefined : t),
      adminBannedEntitiesStats(),
    ]);
    setRecords(data);
    setStats(s);
    setLoading(false);
  }, [typeFilter]);

  useFocusEffect(useCallback(() => { setPage(0); load(0, typeFilter); }, [load, typeFilter]));

  const handleFilter = (t: TypeFilter) => {
    setTypeFilter(t);
    setPage(0);
    load(0, t);
  };

  const handleUnban = async (id: string) => {
    setUnbanning(id);
    const res = await adminUnbanEntity(id);
    setUnbanning(null);
    if (res.ok) {
      flash(true, '✓ 已解封该记录');
      load(page);
    } else {
      flash(false, `解封失败：${res.err ?? ''}`);
    }
  };

  const formatDate = (s: string) => new Date(s).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' });
  const formatUntil = (s: string) => {
    const d = new Date(s);
    if (d.getFullYear() > 2100) return '永久（100年）';
    return d.toLocaleDateString('zh-CN');
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* 消息提示 */}
      {msg ? (
        <View style={{ backgroundColor: msg.ok ? A.greenBg : A.redBg, borderLeftWidth: 2, borderLeftColor: msg.ok ? A.green : A.red, paddingHorizontal: 10, paddingVertical: 7 }}>
          <Text style={{ color: msg.ok ? '#7FE0A0' : '#FF7070', fontSize: 12 }}>{msg.text}</Text>
        </View>
      ) : null}

      {/* ── 统计卡片 ── */}
      {stats ? (
        <View style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, padding: 12, gap: 10 }}>
          <Text style={{ color: A.goldLight, fontSize: 12, fontWeight: '700' }}>📊 封禁统计</Text>
          {/* 今日 + 总活跃 */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, backgroundColor: '#1A0D0D', borderWidth: 1, borderColor: A.red, padding: 10, alignItems: 'center', gap: 2 }}>
              <Text style={{ color: A.red, fontSize: 20, fontWeight: '900' }}>{stats.today}</Text>
              <Text style={{ color: A.textHint, fontSize: 10 }}>今日新增</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#0D1A0D', borderWidth: 1, borderColor: A.green, padding: 10, alignItems: 'center', gap: 2 }}>
              <Text style={{ color: '#7FE0A0', fontSize: 20, fontWeight: '900' }}>{stats.total_active}</Text>
              <Text style={{ color: A.textHint, fontSize: 10 }}>当前有效封禁</Text>
            </View>
          </View>
          {/* 分类分布 */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {([
              ['账号', 'user', '#C82829', stats.by_type.user],
              ['邮箱', 'email', '#C8A84B', stats.by_type.email],
              ['设备', 'device', '#4A7FBF', stats.by_type.device],
              ['IP', 'ip', '#8B5CF6', stats.by_type.ip],
              ['VPN', 'vpn', '#F97316', stats.by_type.vpn],
            ] as [string, string, string, number][]).map(([label, , color, count]) => (
              <View key={label} style={{ borderWidth: 1, borderColor: color, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', minWidth: 60, gap: 2 }}>
                <Text style={{ color, fontSize: 16, fontWeight: '700' }}>{count}</Text>
                <Text style={{ color: A.textHint, fontSize: 9 }}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* 说明 */}
      <View style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, padding: 10, gap: 4 }}>
        <Text style={{ color: A.red, fontSize: 12, fontWeight: '700' }}>🚫 封禁记录库</Text>
        <Text style={{ color: A.textSecond, fontSize: 11, lineHeight: 16 }}>
          {'• 包含账号/邮箱/设备指纹/IP 四种封禁类型\n'}
          {'• 删除账号时自动写入；同设备/同IP重复注册时自动双封\n'}
          {'• 注册时自动检测所有活跃封禁记录，命中则拒绝\n'}
          {'• 超级管理员可手动解封某条记录（不影响其他同账号封禁）'}
        </Text>
      </View>

      {/* 类型筛选 */}
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <Text style={{ color: A.textHint, fontSize: 10 }}>类型：</Text>
        {(['all', 'user', 'email', 'device', 'ip'] as TypeFilter[]).map((t) => (
          <Pressable
            key={t}
            cssInterop={false}
            onPress={() => handleFilter(t)}
            style={{
              paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1,
              borderColor: typeFilter === t ? (TYPE_COLORS[t] ?? A.gold) : A.divider,
              backgroundColor: typeFilter === t ? `${(TYPE_COLORS[t] ?? A.gold)}22` : 'transparent',
            }}
          >
            <Text style={{ color: typeFilter === t ? (TYPE_COLORS[t] ?? A.goldLight) : A.textSecond, fontSize: 11, fontWeight: typeFilter === t ? '700' : '400' }}>
              {t === 'all' ? '全部' : (TYPE_LABELS[t] ?? t)}
            </Text>
          </Pressable>
        ))}
        <Btn label="刷新" onPress={() => load(page)} variant="ghost" small />
      </View>

      {/* 列表 */}
      {loading ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator color={A.red} size="large" />
        </View>
      ) : records.length === 0 ? (
        <Empty text="暂无封禁记录" />
      ) : (
        records.map((r) => (
          <View
            key={r.id}
            style={{
              backgroundColor: r.is_active ? '#1A0D0D' : A.bgCard,
              borderWidth: 1,
              borderColor: r.is_active ? A.red : A.divider,
              padding: 12, gap: 6,
            }}
          >
            {/* 类型标签 + 活跃状态 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ borderWidth: 1, borderColor: TYPE_COLORS[r.entity_type] ?? A.divider, paddingHorizontal: 7, paddingVertical: 3 }}>
                <Text style={{ color: TYPE_COLORS[r.entity_type] ?? A.textSecond, fontSize: 10, fontWeight: '700' }}>
                  {TYPE_LABELS[r.entity_type] ?? r.entity_type}
                </Text>
              </View>
              <Badge text={r.is_active ? '🔴 封禁中' : '⚪ 已失效'} color={r.is_active ? A.red : A.textHint} />
            </View>

            {/* 封禁值 */}
            <Text style={{ color: A.textPrimary, fontSize: 12, fontWeight: '700', fontFamily: 'monospace' }}>
              {r.entity_value ?? '—'}
            </Text>

            {/* 关联账号 */}
            {r.email ? (
              <Text style={{ color: A.textSecond, fontSize: 11 }}>账号：{r.email}</Text>
            ) : null}

            {/* 原因 */}
            {r.ban_reason ? (
              <Text style={{ color: r.is_active ? '#FF9090' : A.textHint, fontSize: 11 }}>
                原因：{r.ban_reason}
              </Text>
            ) : null}

            {/* 时间 */}
            <View style={{ gap: 2 }}>
              <Text style={{ color: A.textHint, fontSize: 10 }}>封禁时间：{formatDate(r.banned_at)}</Text>
              <Text style={{ color: A.textHint, fontSize: 10 }}>到期时间：{formatUntil(r.banned_until)}</Text>
              {r.banned_by_email ? (
                <Text style={{ color: A.textHint, fontSize: 10 }}>操作人：{r.banned_by_email}</Text>
              ) : null}
            </View>

            {/* 超管解封 */}
            {isSuperAdmin && r.is_active ? (
              <Btn
                label={unbanning === r.id ? '解封中…' : '🔓 解封此条记录'}
                onPress={() => handleUnban(r.id)}
                variant="ghost"
                small
                disabled={unbanning === r.id}
              />
            ) : null}
          </View>
        ))
      )}

      {/* 分页 */}
      {!loading && records.length === PAGE ? (
        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
          {page > 0 ? <Btn label="◀ 上一页" onPress={() => { const p = page - 1; setPage(p); load(p); }} variant="ghost" small /> : null}
          <Text style={{ color: A.textHint, fontSize: 11, alignSelf: 'center' }}>第 {page + 1} 页</Text>
          <Btn label="下一页 ▶" onPress={() => { const p = page + 1; setPage(p); load(p); }} variant="ghost" small />
        </View>
      ) : null}
    </ScrollView>
  );
}
```

<a id="srccomponentsadmincleanuptabtsx"></a>
## `src/components/admin/CleanupTab.tsx`

```tsx
// 清理维护 Tab（super_admin）：手动清理 + 结果 + 历史报告
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { A, Badge, Btn, Card, Empty, Row } from './shared';
import { listCleanupLogs, triggerCleanup, type CleanupLog, type CleanupResult } from '@/lib/adminApi';

export function CleanupTab({ role: _role }: { role: string }) {
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState<CleanupResult | null>(null);
  const [logs, setLogs] = useState<CleanupLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLogs(await listCleanupLogs(20));
    setLoading(false);
  }, []);

  const onClean = async () => {
    setCleaning(true); setMsg(''); setResult(null);
    const r = await triggerCleanup();
    setCleaning(false);
    setResult(r);
    if (r) setMsg(`✓ 本次清理完成，节省 ${r.mb_saved} MB`);
    else setMsg('✗ 清理失败');
    load();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false}>
      <Card title="手动清理" accent={A.red}>
        <View style={{ gap: 8 }}>
          <Text style={{ color: A.textSecond, fontSize: 11, lineHeight: 18 }}>
            立即执行三条清理：{'\n'}① 大表超 1 天日志{'\n'}② 已调离超 1 天干部{'\n'}③ GameOver/退休超 1 天存档
          </Text>
          <Text style={{ color: A.textHint, fontSize: 10 }}>定时任务：每天北京时间 12:00（UTC 04:00）自动执行</Text>
          <Btn label={cleaning ? '清理中...' : '立即清理'} onPress={onClean} disabled={cleaning} variant="red" />
        </View>
      </Card>

      {msg ? <Text style={{ color: A.goldLight, fontSize: 12, paddingHorizontal: 4 }}>{msg}</Text> : null}

      {result ? (
        <Card title="✓ 本次清理结果" accent={A.green}>
          <Row label="大表数据" value={`${result.large_table_deleted} 条`} />
          <Row label="死干部" value={`${result.dead_cadres_deleted} 条`} />
          <Row label="死档" value={`${result.dead_saves_deleted} 个`} />
          <View style={{ height: 1, backgroundColor: A.divider, marginVertical: 6 }} />
          <Row label="清理前" value={`${result.mb_before} MB`} />
          <Row label="清理后" value={`${result.mb_after} MB`} />
          <Row label="本次节省" value={`${result.mb_saved} MB`} valueColor={A.goldLight} />
        </Card>
      ) : null}

      <Card title="历史清理报告">
        {loading ? <ActivityIndicator color={A.gold} /> :
          logs.length === 0 ? <Empty text="暂无清理记录" /> :
          logs.map((l) => (
            <View key={l.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: A.divider, gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Badge text={l.trigger_type === 'cron' ? '⏰ 定时' : l.trigger_type === 'admin_manual' ? '🛡️ 手动' : '🔧 ' + l.trigger_type} color={l.trigger_type === 'cron' ? A.green : A.gold} />
                <Text style={{ color: A.textHint, fontSize: 10 }}>{new Date(l.run_at).toLocaleString('zh-CN')}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 2 }}>
                <Text style={{ color: A.textSecond, fontSize: 11 }}>大表 {l.large_table_deleted}</Text>
                <Text style={{ color: A.textSecond, fontSize: 11 }}>干部 {l.dead_cadres_deleted}</Text>
                <Text style={{ color: A.textSecond, fontSize: 11 }}>存档 {l.dead_saves_deleted}</Text>
              </View>
              <Text style={{ color: A.goldLight, fontSize: 12, fontWeight: '600', marginTop: 2 }}>节省 {l.mb_saved} MB</Text>
            </View>
          ))
        }
      </Card>
    </ScrollView>
  );
}
```

<a id="srccomponentsadminclearsavetabtsx"></a>
## `src/components/admin/ClearSaveTab.tsx`

```tsx
// 存档清除 Tab：按账号搜索玩家 → 展示存档信息 → 清除存档（仅删游戏数据，保留登录账号）
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { A, Badge, Btn, Card, Empty, LabeledInput, Row } from './shared';
import { adminFindSaveByAccount, adminClearPlayerSave, type FoundAccount } from '@/lib/adminApi';

export function ClearSaveTab() {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [found, setFound] = useState<FoundAccount | null>(null);
  const [msg, setMsg] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [acting, setActing] = useState(false);

  const search = async () => {
    if (!keyword.trim()) { setMsg('请输入账号邮箱 / 用户ID / 存档ID'); return; }
    setLoading(true); setMsg(''); setFound(null); setConfirm(false);
    const list = await adminFindSaveByAccount(keyword.trim());
    setLoading(false);
    if (!list.length) { setMsg('✗ 未找到该账号对应的存档'); return; }
    if (list.length > 1) { setMsg(`该账号有 ${list.length} 个存档，已显示第一个`); }
    setFound(list[0]);
  };

  const onClear = async () => {
    if (!found) return;
    setActing(true);
    const r = await adminClearPlayerSave(found.user_id);
    setConfirm(false);
    setActing(false);
    if (r.ok) {
      setMsg(`✓ 已清除存档（${r.player_name ?? '-'} · L${r.rank_level ?? '-'}）· 登录账号保留，玩家重新登录将生成新存档`);
      setFound(null);
    } else {
      setMsg(`✗ ${r.err}`);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Card title="搜索玩家账号" accent={A.blue}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <LabeledInput label="账号邮箱 / 用户ID / 存档ID" value={keyword} onChange={setKeyword} placeholder="输入玩家账号或存档ID" />
          </View>
          <Btn label={loading ? '...' : '搜索'} onPress={search} small disabled={loading} />
        </View>
        {msg ? <Text style={{ color: A.goldLight, fontSize: 12, marginTop: 8 }}>{msg}</Text> : null}
      </Card>

      {loading ? <ActivityIndicator color={A.gold} size="large" /> : null}

      {found ? (
        <Card title="存档信息" accent={A.gold}>
          <Row label="玩家姓名" value={found.player_name || '-'} />
          <Row label="账号邮箱" value={found.email || '-'} />
          <Row label="用户ID" value={found.user_id.slice(0, 8) + '...'} />
          <Row label="当前职级" value={`L${found.rank_level ?? '-'} ${found.rank_name ?? ''}`} />
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
            <Badge text="存档存在" color={A.green} />
            <Badge text="清除后保留登录账号" color={A.blue} />
          </View>

          {confirm ? (
            <View style={{ gap: 8, marginTop: 12 }}>
              <Text style={{ color: A.red, fontSize: 12, fontWeight: '700' }}>
                确认清除玩家「{found.player_name || found.email}」的存档？{'\n'}
                将删除该账号的全部游戏数据（存档/班子/岗位），登录账号保留；玩家重新登录后会生成全新初始存档。操作不可恢复。
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn label={acting ? '清除中...' : '确认清除存档'} onPress={onClear} variant="red" small disabled={acting} />
                <Btn label="取消" onPress={() => setConfirm(false)} small disabled={acting} />
              </View>
            </View>
          ) : (
            <View style={{ marginTop: 12 }}>
              <Btn label="🗑️ 清除存档（保留账号）" onPress={() => setConfirm(true)} variant="red" />
            </View>
          )}
        </Card>
      ) : (
        !loading ? <Empty text="输入玩家账号邮箱 / 用户ID / 存档ID 搜索存档" /> : null
      )}
    </ScrollView>
  );
}
```

<a id="srccomponentsadminconfigtabtsx"></a>
## `src/components/admin/ConfigTab.tsx`

```tsx
// 配置管理 Tab（super_admin）：列出 game_config + 编辑 JSON + 保存
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { A, Badge, Btn, Card, Empty, LabeledInput, Row } from './shared';
import { adminCleanupStalePlaceholderSaves, adminSaveConfig, listGameConfig, type GameConfigItem } from '@/lib/adminApi';

export function ConfigTab({ role }: { role: string }) {
  const canEdit = role === 'super_admin';
  const [list, setList] = useState<GameConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [msg, setMsg] = useState('');
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupMsg, setCleanupMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setList(await listGameConfig());
    setLoading(false);
  }, []);

  const onCleanup = async () => {
    setCleanupLoading(true);
    setCleanupMsg('');
    const { count, err } = await adminCleanupStalePlaceholderSaves(3);
    if (err) setCleanupMsg(`✗ 清理失败：${err}`);
    else setCleanupMsg(`✓ 已清理 ${count} 个超过 3 天的异常占位档`);
    setCleanupLoading(false);
  };

  const startEdit = (c: GameConfigItem) => {
    setEditing(c.key);
    setEditValue(JSON.stringify(c.value, null, 2));
    setMsg('');
  };
  const onSave = async () => {
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(editValue); } catch { setMsg('✗ JSON 格式错误'); return; }
    const item = list.find((c) => c.key === editing);
    const r = await adminSaveConfig(editing!, parsed, item?.description ?? undefined);
    setMsg(r.ok ? '✓ 配置已保存，下次读档生效' : `✗ ${r.err}`);
    setEditing(null);
    if (r.ok) load();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Card title="异常占位档清理" accent={A.blue}>
        <Text style={{ color: A.textSecond, fontSize: 11, lineHeight: 18 }}>
          系统每天凌晨 3:00 自动清理超过 3 天仍未创建角色的占位档，防止误判"已有存档"。{'\n'}此处可手动触发清理。
        </Text>
        <View style={{ marginTop: 8 }}>
          <Btn
            label={cleanupLoading ? '清理中...' : '立即清理超过 3 天的占位档'}
            onPress={onCleanup}
            small
            disabled={cleanupLoading}
          />
          {cleanupMsg ? <Text style={{ color: cleanupMsg.startsWith('✓') ? '#7FE0A0' : '#FF7070', fontSize: 11, marginTop: 6 }}>{cleanupMsg}</Text> : null}
        </View>
      </Card>

      <Card title="游戏配置热更新" accent={A.gold}>
        <Text style={{ color: A.textSecond, fontSize: 11, lineHeight: 18 }}>
          可在不发版的情况下修改游戏参数。{'\n'}客户端下次读档时自动拉取最新配置。{'\n'}仅 super_admin 可修改。
        </Text>
      </Card>

      {loading ? <ActivityIndicator color={A.gold} /> :
        list.length === 0 ? <Empty text="暂无配置项" /> :
        list.map((c) => (
          <Card key={c.key} title={c.key} accent={editing === c.key ? A.gold : A.blue}>
            {editing === c.key ? (
              <View style={{ gap: 8 }}>
                <Text style={{ color: A.textSecond, fontSize: 11 }}>{c.description ?? ''}</Text>
                <LabeledInput label="JSON 值" value={editValue} onChange={setEditValue} multiline />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Btn label="保存" onPress={onSave} small />
                  <Btn label="取消" onPress={() => setEditing(null)} small variant="ghost" />
                </View>
              </View>
            ) : (
              <View style={{ gap: 6 }}>
                <Row label="说明" value={c.description ?? '-'} valueColor={A.textSecond} />
                <Row label="当前值" value={JSON.stringify(c.value)} valueColor={A.goldLight} />
                <Row label="更新时间" value={new Date(c.updated_at).toLocaleString('zh-CN')} valueColor={A.textHint} />
                {canEdit ? (
                  <View style={{ marginTop: 4 }}>
                    <Btn label="编辑" onPress={() => startEdit(c)} small variant="ghost" />
                  </View>
                ) : <Badge text="只读" color={A.textHint} />}
              </View>
            )}
          </Card>
        ))
      }

      {msg ? <Text style={{ color: A.goldLight, fontSize: 12, paddingHorizontal: 4 }}>{msg}</Text> : null}
    </ScrollView>
  );
}
```

<a id="srccomponentsadmindatabasetabtsx"></a>
## `src/components/admin/DatabaseTab.tsx`

```tsx
// 数据库管理 Tab（admin+）：各政务大区容量与玩家数；超管可添加/编辑/停用
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { A, Badge, Btn, Card, Empty } from './shared';
import { adminDatabaseOverview, adminCreateDatabase, adminToggleDatabaseActive, adminUpdateDatabase, type DatabaseNode } from '@/lib/adminApi';

const isSuperAdmin = (role: string) => role === 'super_admin';

export function DatabaseTab({ role }: { role: string }) {
  const [dbs, setDbs] = useState<DatabaseNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editDb, setEditDb] = useState<DatabaseNode | null>(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [cap, setCap] = useState('1000');
  const [saving, setSaving] = useState(false);

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    const list = await adminDatabaseOverview();
    setDbs(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    timer.current = setInterval(load, 30000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 2500);
  };

  const openAdd = () => {
    setCode(''); setName(''); setCap('1000'); setSaving(false);
    setAddOpen(true);
  };

  const openEdit = (db: DatabaseNode) => {
    setEditDb(db); setName(db.name); setCap(String(db.capacity_limit)); setSaving(false);
  };

  const submitAdd = async () => {
    if (!code.trim() || !name.trim()) { flash(false, '编码和名称不能为空'); return; }
    const capNum = Number(cap);
    if (!capNum || capNum < 100) { flash(false, '容量上限至少为 100'); return; }
    setSaving(true);
    const { ok, err } = await adminCreateDatabase(code.trim(), name.trim(), capNum);
    setSaving(false);
    if (!ok) { flash(false, err ?? '添加失败'); return; }
    setAddOpen(false);
    flash(true, '✓ 已添加新大区');
    load();
  };

  const submitEdit = async () => {
    if (!editDb) return;
    if (!name.trim()) { flash(false, '名称不能为空'); return; }
    const capNum = Number(cap);
    if (!capNum || capNum < 100) { flash(false, '容量上限至少为 100'); return; }
    setSaving(true);
    const { ok, err } = await adminUpdateDatabase(editDb.id, name.trim(), capNum);
    setSaving(false);
    if (!ok) { flash(false, err ?? '更新失败'); return; }
    setEditDb(null);
    flash(true, '✓ 已更新大区信息');
    load();
  };

  const toggleActive = async (db: DatabaseNode) => {
    const { ok, err } = await adminToggleDatabaseActive(db.id, !db.is_active);
    if (!ok) { flash(false, err ?? '操作失败'); return; }
    flash(true, db.is_active ? '✓ 已停用大区' : '✓ 已启用大区');
    load();
  };

  const activeCount = dbs.filter((d) => d.is_active).length;
  const totalPlayers = dbs.reduce((s, d) => s + d.player_count, 0);
  const totalOnline = dbs.reduce((s, d) => s + d.online_count, 0);
  const fullCount = dbs.filter((d) => d.is_full || (d.capacity_limit > 0 && d.player_count / d.capacity_limit >= 1)).length;

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false}>
      {/* 顶部统计条 */}
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <View style={{ flex: 1, backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, padding: 10, alignItems: 'center' }}>
          <Text style={{ color: A.goldLight, fontSize: 16, fontWeight: '700' }}>{activeCount}</Text>
          <Text style={{ color: A.textSecond, fontSize: 10 }}>启用大区</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, padding: 10, alignItems: 'center' }}>
          <Text style={{ color: A.goldLight, fontSize: 16, fontWeight: '700' }}>{totalPlayers}</Text>
          <Text style={{ color: A.textSecond, fontSize: 10 }}>总玩家</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, padding: 10, alignItems: 'center' }}>
          <Text style={{ color: A.green, fontSize: 16, fontWeight: '700' }}>{totalOnline}</Text>
          <Text style={{ color: A.textSecond, fontSize: 10 }}>在线</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, padding: 10, alignItems: 'center' }}>
          <Text style={{ color: A.red, fontSize: 16, fontWeight: '700' }}>{fullCount}</Text>
          <Text style={{ color: A.textSecond, fontSize: 10 }}>满载大区</Text>
        </View>
      </View>

      {msg ? (
        <View style={{ backgroundColor: msg.ok ? A.greenBg : A.redBg, borderLeftWidth: 2, borderLeftColor: msg.ok ? A.green : A.red, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ color: msg.ok ? '#7FE0A0' : '#FF7070', fontSize: 12 }}>{msg.text}</Text>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Btn label="刷新" onPress={load} variant="ghost" small style={{ flex: 1 }} />
        {isSuperAdmin(role) ? <Btn label="+ 手动添加大区" onPress={openAdd} variant="gold" small style={{ flex: 1 }} /> : null}
      </View>

      {loading ? <ActivityIndicator color={A.gold} size="large" /> :
        dbs.length === 0 ? <Empty text="暂无大区数据" /> :
        dbs.map((db) => {
          const ratio = db.capacity_limit > 0 ? Math.min(1, db.player_count / db.capacity_limit) : 0;
          const full = db.is_full || ratio >= 1;
          const near = !full && ratio >= 0.8;
          const badge = !db.is_active ? { t: '停用', c: A.textHint } : full ? { t: '已满', c: A.red } : near ? { t: '即将满', c: A.orange } : { t: '正常', c: A.green };
          return (
            <Card key={db.id} title={db.name} accent={full ? A.red : A.green} style={{ opacity: db.is_active ? 1 : 0.55 }}>
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: A.textHint, fontSize: 10 }}>{db.code}</Text>
                  <Badge text={badge.t} color={badge.c} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: A.textSecond, fontSize: 11 }}>玩家数</Text>
                  <Text style={{ color: A.textPrimary, fontSize: 13, fontWeight: '600' }}>{db.player_count} / {db.capacity_limit}</Text>
                </View>
                <View style={{ height: 8, backgroundColor: A.divider, borderRadius: 4 }}>
                  <View style={{ height: 8, width: `${Math.round(ratio * 100)}%`, backgroundColor: full ? A.red : A.gold, borderRadius: 4 }} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: A.textSecond, fontSize: 11 }}>使用率</Text>
                  <Text style={{ color: full ? A.red : A.goldLight, fontSize: 12 }}>{Math.round(ratio * 100)}%</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: A.textSecond, fontSize: 11 }}>在线玩家</Text>
                  <Text style={{ color: A.green, fontSize: 12, fontWeight: '600' }}>{db.online_count}</Text>
                </View>
                {isSuperAdmin(role) ? (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                    <Btn label="编辑" onPress={() => openEdit(db)} variant="blue" small style={{ flex: 1 }} />
                    <Btn label={db.is_active ? '停用' : '启用'} onPress={() => toggleActive(db)} variant={db.is_active ? 'red' : 'green'} small style={{ flex: 1 }} />
                  </View>
                ) : null}
              </View>
            </Card>
          );
        })
      }

      {/* 添加大区弹窗 */}
      <Modal visible={addOpen} transparent animationType="fade" onRequestClose={() => setAddOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 }} onPress={() => setAddOpen(false)}>
          <Pressable style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, padding: 16, gap: 10 }} onPress={(e) => e.stopPropagation()}>
            <Text style={{ color: A.goldLight, fontSize: 14, fontWeight: '700', letterSpacing: 1 }}>手动添加大区</Text>
            <Text style={{ color: A.textSecond, fontSize: 11 }}>大区编码</Text>
            <TextInput value={code} onChangeText={setCode} placeholder="如 db_5" placeholderTextColor={A.textHint} style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }} />
            <Text style={{ color: A.textSecond, fontSize: 11 }}>大区名称</Text>
            <TextInput value={name} onChangeText={setName} placeholder="如 华南政务大区" placeholderTextColor={A.textHint} style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }} />
            <Text style={{ color: A.textSecond, fontSize: 11 }}>容量上限（≥100）</Text>
            <TextInput value={cap} onChangeText={setCap} placeholder="1000" placeholderTextColor={A.textHint} keyboardType="number-pad" style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Btn label="取消" onPress={() => setAddOpen(false)} variant="ghost" small style={{ flex: 1 }} />
              <Btn label={saving ? '提交中...' : '确认添加'} onPress={submitAdd} variant="gold" disabled={saving} small style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 编辑大区弹窗 */}
      <Modal visible={!!editDb} transparent animationType="fade" onRequestClose={() => setEditDb(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 }} onPress={() => setEditDb(null)}>
          <Pressable style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, padding: 16, gap: 10 }} onPress={(e) => e.stopPropagation()}>
            <Text style={{ color: A.goldLight, fontSize: 14, fontWeight: '700', letterSpacing: 1 }}>编辑大区 · {editDb?.code}</Text>
            <Text style={{ color: A.textSecond, fontSize: 11 }}>大区名称</Text>
            <TextInput value={name} onChangeText={setName} placeholder="大区名称" placeholderTextColor={A.textHint} style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }} />
            <Text style={{ color: A.textSecond, fontSize: 11 }}>容量上限（≥100）</Text>
            <TextInput value={cap} onChangeText={setCap} placeholder="1000" placeholderTextColor={A.textHint} keyboardType="number-pad" style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Btn label="取消" onPress={() => setEditDb(null)} variant="ghost" small style={{ flex: 1 }} />
              <Btn label={saving ? '提交中...' : '保存'} onPress={submitEdit} variant="gold" disabled={saving} small style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
```

<a id="srccomponentsadminexporttabtsx"></a>
## `src/components/admin/ExportTab.tsx`

```tsx
// 数据导出 Tab：选择类型 → 生成 CSV → 预览 + 复制
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { A, Btn, Card, Empty } from './shared';
import { adminAccountList, adminListAudit, listRedeemCodes } from '@/lib/adminApi';

type ExportType = 'players' | 'redeem' | 'audit';

function esc(v: unknown): string {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCSV(headers: string[], rows: unknown[][]): string {
  return [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
}

export function ExportTab({ role }: { role: string }) {
  const canExport = role === 'admin' || role === 'super_admin';
  const [type, setType] = useState<ExportType>('players');
  const [busy, setBusy] = useState(false);
  const [csv, setCsv] = useState('');
  const [msg, setMsg] = useState('');

  const onGen = async () => {
    setBusy(true); setMsg(''); setCsv('');
    if (type === 'players') {
      const list = await adminAccountList('', 200, 0);
      setCsv(toCSV(['邮箱', '昵称', '职级', '职级名', '功勋', '注册时间', '是否管理员'],
        list.map((r) => [r.email, r.player_name ?? '', r.rank_level ?? '', r.rank_name ?? '', r.merit_points ?? '', r.created_at, r.is_admin ? '是' : '否'])));
    } else if (type === 'redeem') {
      const list = await listRedeemCodes('all');
      setCsv(toCSV(['码值', '名称', '是否已用', '使用人', '使用时间', '生成时间', '奖励'],
        list.map((r) => [r.code, r.label, r.is_used ? '是' : '否', r.used_by_email ?? '', r.used_at ?? '', r.created_at, JSON.stringify(r.reward)])));
    } else {
      const list = await adminListAudit(200);
      setCsv(toCSV(['操作人', '动作', '目标', '时间', '详情'],
        list.map((r) => [r.admin_email, r.action, r.target_user_id ?? '', r.created_at, JSON.stringify(r.detail)])));
    }
    setBusy(false);
    setMsg('✓ 已生成 CSV');
  };

  const onCopy = async () => {
    await Clipboard.setStringAsync(csv);
    setMsg('✓ CSV 已复制到剪贴板');
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false}>
      <Card title="数据导出（CSV）" accent={A.blue}>
        <View style={{ gap: 8 }}>
          <Text style={{ color: A.textSecond, fontSize: 11 }}>选择导出类型</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {([['players', '玩家数据'], ['redeem', '兑换码记录'], ['audit', '审计日志']] as const).map(([v, l]) => (
              <Pressable key={v} cssInterop={false} onPress={() => setType(v)} style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: type === v ? A.gold : A.bgInput, borderWidth: 1, borderColor: type === v ? A.gold : A.border }}>
                <Text style={{ color: type === v ? '#0D1B2A' : A.textSecond, fontSize: 11, fontWeight: '600' }}>{l}</Text>
              </Pressable>
            ))}
          </View>
          <Btn label={busy ? '生成中...' : '生成 CSV'} onPress={onGen} disabled={!canExport || busy} />
          {!canExport ? <Text style={{ color: A.textHint, fontSize: 10 }}>需 admin 及以上权限</Text> : null}
        </View>
      </Card>

      {msg ? <Text style={{ color: A.goldLight, fontSize: 12, paddingHorizontal: 4 }}>{msg}</Text> : null}

      {busy ? <ActivityIndicator color={A.gold} /> : null}
      {csv ? (
        <Card title="CSV 预览（前 2000 字）" accent={A.gold}>
          <View style={{ gap: 8 }}>
            <Text style={{ color: A.textPrimary, fontSize: 10, fontFamily: 'monospace', lineHeight: 16 }}>{csv.slice(0, 2000)}{csv.length > 2000 ? '\n...(已截断)' : ''}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Btn label="复制全部" onPress={onCopy} small />
              <Text style={{ color: A.textHint, fontSize: 10, alignSelf: 'center' }}>共 {csv.length} 字符</Text>
            </View>
          </View>
        </Card>
      ) : (
        !busy ? <Empty text="选择类型并生成 CSV" /> : null
      )}
    </ScrollView>
  );
}
```

<a id="srccomponentsadminnpcnametabtsx"></a>
## `src/components/admin/NpcNameTab.tsx`

```tsx
// NPC名库管理 Tab
// 单区块：NPC姓名名册 — 管理员维护的完整姓名名册
//   ① 扫描存档去重导入
//   ② 单条手动添加
//   ③ 批量粘贴导入（逗号/换行分隔）
//   ④ 多选批量删除
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  adminListNpcNames, adminAddNpcName, adminDeleteNpcName, adminScanNpcNames, adminImportNpcNames, adminSyncNpcNamesFromSaves,
  type NpcNameRow,
} from '@/lib/adminApi';
import { Btn, Empty } from './shared';

export function NpcNameTab() {
  // ── 名册 ──
  const [roster, setRoster]         = useState<NpcNameRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');

  // 单条添加
  const [addInput, setAddInput]     = useState('');
  const [adding, setAdding]         = useState(false);

  // 批量粘贴添加
  const [batchInput, setBatchInput] = useState('');
  const [batchExpanded, setBatchExpanded] = useState(false);
  const [batchLoading, setBatchLoading]   = useState(false);

  // 批量删除
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [batchDelOpen, setBatchDelOpen] = useState(false);
  const [batchDeling, setBatchDeling] = useState(false);

  // 单条删除
  const [delId, setDelId]           = useState<string | null>(null);
  const [delName, setDelName]       = useState('');

  // 扫描
  const [scanning, setScanning]     = useState(false);
  // 同步
  const [syncing, setSyncing]       = useState(false);

  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 6000);
  };

  const loadRoster = useCallback(async (q?: string) => {
    setLoading(true);
    const rows = await adminListNpcNames(q || undefined, 2000, 0);
    setRoster(rows);
    setLoading(false);
    setSelected(new Set()); // 切换搜索后清空选中
  }, []);

  useFocusEffect(useCallback(() => { loadRoster(); }, [loadRoster]));

  // ── 扫描去重导入 ──
  const handleScan = async () => {
    setScanning(true);
    const res = await adminScanNpcNames();
    setScanning(false);
    flash(true, `扫描完成：共 ${res.scanned} 个NPC姓名，导入 ${res.imported} 个，跳过已存在 ${res.skipped} 个`);
    loadRoster();
  };

  // ── 服务端全量同步 ──
  const handleSync = async () => {
    setSyncing(true);
    const res = await adminSyncNpcNamesFromSaves();
    setSyncing(false);
    flash(true, `✓ 同步完成：本次导入 ${res.imported} 个新名字，名册共 ${res.total} 个`);
    loadRoster();
  };

  // ── 单条添加 ──
  const handleAdd = async () => {
    const v = addInput.trim();
    if (!v) { flash(false, '请输入NPC名字'); return; }
    setAdding(true);
    const res = await adminAddNpcName(v);
    setAdding(false);
    if (res.ok) { flash(true, `✓ 已添加「${v}」`); setAddInput(''); loadRoster(); }
    else { flash(false, `添加失败：${res.err ?? ''}`); }
  };

  // ── 批量粘贴添加 ──
  const handleBatchAdd = async () => {
    const raw = batchInput.trim();
    if (!raw) { flash(false, '请粘贴姓名（逗号或换行分隔）'); return; }
    const names = raw
      .split(/[,，\n]+/)
      .map(s => s.trim())
      .filter(s => s.length >= 2 && s.length <= 20);
    if (!names.length) { flash(false, '未识别到有效姓名（每个须2-20字符）'); return; }
    setBatchLoading(true);
    const res = await adminImportNpcNames(names);
    setBatchLoading(false);
    flash(true, `✓ 批量导入完成：导入 ${res.imported} 个，跳过已存在 ${res.skipped} 个`);
    setBatchInput('');
    setBatchExpanded(false);
    loadRoster();
  };

  // ── 单条删除 ──
  const confirmDelete = async () => {
    if (!delId) return;
    const res = await adminDeleteNpcName(delId);
    if (res.ok) { flash(true, `✓ 已删除「${delName}」`); setDelId(null); loadRoster(); }
    else { flash(false, `删除失败：${res.err ?? ''}`); }
  };

  // ── 批量删除 ──
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const handleBatchDelete = async () => {
    if (!selected.size) return;
    setBatchDeling(true);
    let ok = 0;
    for (const id of Array.from(selected)) {
      const row = roster.find(r => r.id === id);
      const res = await adminDeleteNpcName(id);
      if (res.ok) ok++;
      else flash(false, `删除「${row?.name}」失败`);
    }
    setBatchDeling(false);
    setBatchDelOpen(false);
    setSelectMode(false);
    setSelected(new Set());
    flash(true, `✓ 已删除 ${ok} 个NPC名字`);
    loadRoster();
  };

  const displayRows = roster.filter(r => !search.trim() || r.name.includes(search.trim()));

  return (
    <View style={{ flex: 1 }}>
      {msg && (
        <View style={{ backgroundColor: msg.ok ? '#16a34a' : '#dc2626', borderRadius: 6, padding: 10, margin: 12, marginBottom: 0 }}>
          <Text style={{ color: '#fff', fontSize: 13, lineHeight: 18 }}>{msg.text}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 12, gap: 10 }}>
        {/* 扫描按钮 */}
        <Pressable onPress={handleScan} disabled={scanning}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            backgroundColor: '#3b82f6', borderRadius: 6, paddingVertical: 10, opacity: scanning ? 0.6 : 1 }}>
          {scanning ? <ActivityIndicator size="small" color="#fff" /> :
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>🔍 扫描所有存档NPC并去重导入到名册</Text>}
        </Pressable>
        <Text style={{ fontSize: 11, color: '#6b7280', lineHeight: 16 }}>
          扫描玩家所有已激活存档中的上级、下级、干部、领导人档案，去重后导入名册。名册为空时游戏将自动熔断生成兜底姓名，保证不中断。
        </Text>

        {/* 服务端同步按钮 */}
        <Pressable onPress={handleSync} disabled={syncing}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            backgroundColor: '#7c3aed', borderRadius: 6, paddingVertical: 10, opacity: syncing ? 0.6 : 1 }}>
          {syncing ? <ActivityIndicator size="small" color="#fff" /> :
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>🔄 同步所有存档NPC姓名到名册</Text>}
        </Pressable>
        <Text style={{ fontSize: 11, color: '#6b7280', lineHeight: 16 }}>
          服务端全量扫描所有玩家存档中的下级干部与上级姓名，去重写入名册；此后新生成的NPC姓名也会自动同步。
        </Text>

        {/* 单条新增 */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            value={addInput} onChangeText={setAddInput}
            placeholder="手动新增NPC完整姓名（2-20字）"
            placeholderTextColor="#9ca3af" maxLength={20}
            onSubmitEditing={handleAdd}
            style={{ flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6,
              paddingHorizontal: 10, paddingVertical: 7, fontSize: 13, color: '#111827', backgroundColor: '#fff' }}
          />
          <Pressable onPress={handleAdd} disabled={adding}
            style={{ backgroundColor: '#16a34a', borderRadius: 6, paddingHorizontal: 16,
              paddingVertical: 7, justifyContent: 'center', opacity: adding ? 0.6 : 1 }}>
            {adding ? <ActivityIndicator size="small" color="#fff" /> :
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>添加</Text>}
          </Pressable>
        </View>

        {/* 批量粘贴 */}
        <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
          <Pressable onPress={() => setBatchExpanded(v => !v)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f9fafb' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151' }}>📋 批量粘贴添加姓名</Text>
            <Text style={{ fontSize: 11, color: '#6b7280' }}>{batchExpanded ? '▲ 收起' : '▼ 展开'}</Text>
          </Pressable>
          {batchExpanded && (
            <View style={{ padding: 10, gap: 8, backgroundColor: '#fff' }}>
              <Text style={{ fontSize: 11, color: '#6b7280', lineHeight: 16 }}>
                每行或用逗号/中文逗号分隔一个姓名，每个姓名须2-20个字符。
              </Text>
              <TextInput
                value={batchInput} onChangeText={setBatchInput}
                placeholder={'例如：\n张伟\n李娜, 王芳\n赵磊'}
                placeholderTextColor="#9ca3af"
                multiline numberOfLines={6}
                style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6,
                  paddingHorizontal: 10, paddingVertical: 8, fontSize: 13,
                  color: '#111827', backgroundColor: '#f9fafb', minHeight: 120,
                  textAlignVertical: 'top' }}
              />
              <Pressable onPress={handleBatchAdd} disabled={batchLoading}
                style={{ backgroundColor: '#7c3aed', borderRadius: 6, paddingVertical: 9,
                  alignItems: 'center', opacity: batchLoading ? 0.6 : 1 }}>
                {batchLoading ? <ActivityIndicator size="small" color="#fff" /> :
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>批量导入</Text>}
              </Pressable>
            </View>
          )}
        </View>

        {/* 搜索 + 工具栏 */}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput
            value={search} onChangeText={setSearch}
            placeholder="搜索名字…" placeholderTextColor="#9ca3af"
            style={{ flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6,
              paddingHorizontal: 10, paddingVertical: 7, fontSize: 13, color: '#111827', backgroundColor: '#fff' }}
          />
          {!selectMode ? (
            <Pressable onPress={() => setSelectMode(true)}
              style={{ backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5', borderRadius: 6,
                paddingHorizontal: 12, paddingVertical: 7 }}>
              <Text style={{ color: '#dc2626', fontSize: 12, fontWeight: '700' }}>批量删除</Text>
            </Pressable>
          ) : (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Pressable onPress={() => { setSelectMode(false); setSelected(new Set()); }}
                style={{ backgroundColor: '#f3f4f6', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7 }}>
                <Text style={{ color: '#374151', fontSize: 12 }}>取消</Text>
              </Pressable>
              {selected.size > 0 && (
                <Pressable onPress={() => setBatchDelOpen(true)}
                  style={{ backgroundColor: '#dc2626', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7 }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>删除({selected.size})</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        {/* 全选/取消全选 */}
        {selectMode && displayRows.length > 0 && (
          <Pressable onPress={() => setSelected(new Set(selected.size === displayRows.length ? [] : displayRows.map(r => r.id)))}
            style={{ paddingVertical: 4 }}>
            <Text style={{ fontSize: 12, color: '#3b82f6' }}>
              {selected.size === displayRows.length ? '取消全选' : `全选 (${displayRows.length})`}
            </Text>
          </Pressable>
        )}

        {/* 名单 */}
        {loading ? (
          <ActivityIndicator style={{ marginTop: 30 }} />
        ) : displayRows.length === 0 ? (
          <Empty text={roster.length === 0 ? '名册为空，游戏将自动熔断生成兜底姓名。可点击上方扫描导入或手动添加' : '未找到匹配姓名'} />
        ) : (
          <>
            <Text style={{ fontSize: 11, color: '#6b7280' }}>
              共 {roster.length} 个{search.trim() ? `，当前显示 ${displayRows.length} 个` : ''}
              {selectMode && selected.size > 0 ? `，已选 ${selected.size} 个` : ''}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {displayRows.map((row) => {
                const isSelected = selected.has(row.id);
                return (
                  <Pressable
                    key={row.id}
                    onPress={() => { if (selectMode) { toggleSelect(row.id); } else { setDelId(row.id); setDelName(row.name); } }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4,
                      backgroundColor: isSelected ? '#fee2e2' : '#f9fafb',
                      borderWidth: 1, borderColor: isSelected ? '#f87171' : '#e5e7eb',
                      borderRadius: 20, paddingVertical: 5, paddingLeft: 12, paddingRight: 6 }}>
                    {selectMode && (
                      <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 1.5,
                        borderColor: isSelected ? '#dc2626' : '#d1d5db',
                        backgroundColor: isSelected ? '#dc2626' : 'transparent',
                        alignItems: 'center', justifyContent: 'center', marginRight: 2 }}>
                        {isSelected && <Text style={{ color: '#fff', fontSize: 9 }}>✓</Text>}
                      </View>
                    )}
                    <Text style={{ fontSize: 14, color: '#111827', fontWeight: '600' }}>{row.name}</Text>
                    {row.source === 'scanned' && (
                      <Text style={{ fontSize: 9, color: '#6b7280', backgroundColor: '#eef2ff', borderRadius: 4, paddingHorizontal: 4 }}>扫</Text>
                    )}
                    {!selectMode && (
                      <View style={{ backgroundColor: '#fef2f2', borderRadius: 12, width: 22, height: 22,
                        alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#dc2626', fontSize: 13, lineHeight: 15 }}>×</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* 单条删除确认 */}
      <Modal visible={!!delId} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 32 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 20 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 8 }}>确认删除</Text>
            <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
              确定要从名册中删除「<Text style={{ color: '#dc2626', fontWeight: '700' }}>{delName}</Text>」吗？{'\n'}
              删除后不影响已生成的NPC姓名，但未来新NPC将不再使用此姓名。
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <Pressable onPress={() => setDelId(null)}
                style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, backgroundColor: '#f3f4f6' }}>
                <Text style={{ fontSize: 13, color: '#374151' }}>取消</Text>
              </Pressable>
              <Pressable onPress={confirmDelete}
                style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, backgroundColor: '#dc2626' }}>
                <Text style={{ fontSize: 13, color: '#fff', fontWeight: '700' }}>确认删除</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* 批量删除确认 */}
      <Modal visible={batchDelOpen} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 32 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 20 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 8 }}>批量删除确认</Text>
            <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
              确定要删除所选的 <Text style={{ color: '#dc2626', fontWeight: '700' }}>{selected.size}</Text> 个NPC姓名吗？{'\n'}
              此操作不可撤销，已生成的NPC不受影响。
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <Pressable onPress={() => setBatchDelOpen(false)}
                style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, backgroundColor: '#f3f4f6' }}>
                <Text style={{ fontSize: 13, color: '#374151' }}>取消</Text>
              </Pressable>
              <Pressable onPress={handleBatchDelete} disabled={batchDeling}
                style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, backgroundColor: '#dc2626',
                  opacity: batchDeling ? 0.6 : 1 }}>
                {batchDeling ? <ActivityIndicator size="small" color="#fff" /> :
                  <Text style={{ fontSize: 13, color: '#fff', fontWeight: '700' }}>确认删除({selected.size})</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
```

<a id="srccomponentsadminpasswordresettabtsx"></a>
## `src/components/admin/PasswordResetTab.tsx`

```tsx
// 密码重置申请审批 Tab（仅超级管理员）
// 普通管理员发起的密码重置申请在此审批；审批时超级管理员可重新设置玩家新密码
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { A, Badge, Btn, Card, Empty, LabeledInput, Row } from './shared';
import {
  adminApprovePasswordReset, adminListPasswordResetRequests, adminRejectPasswordReset,
  type PasswordResetRequest,
} from '@/lib/adminApi';

export function PasswordResetTab({ role }: { role: string }) {
  const isSuperAdmin = role === 'super_admin';
  const [rows, setRows] = useState<PasswordResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('pending');
  const [msg, setMsg] = useState('');
  // 审批中的申请 + 新密码输入
  const [approving, setApproving] = useState<string | null>(null);
  const [newPwd, setNewPwd] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const list = await adminListPasswordResetRequests(filter === 'all' ? undefined : filter, 100);
    setRows(list);
    setLoading(false);
  }, [filter]);

  const flash = (text: string) => { setMsg(text); setTimeout(() => setMsg(''), 2500); };

  const onApprove = async (id: string) => {
    if (newPwd.length < 6) { flash('✗ 新密码至少 6 位'); return; }
    const r = await adminApprovePasswordReset(id, newPwd);
    flash(r.ok ? '✓ 已审批通过并重置玩家密码' : `✗ ${r.err}`);
    if (r.ok) { setApproving(null); setNewPwd(''); load(); }
  };
  const onReject = async (id: string) => {
    const r = await adminRejectPasswordReset(id);
    flash(r.ok ? '✓ 已驳回申请' : `✗ ${r.err}`);
    if (r.ok) load();
  };

  if (!isSuperAdmin) {
    return (
      <View style={{ padding: 16, alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <Text style={{ color: A.textHint, fontSize: 12 }}>仅超级管理员可审批密码重置申请</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* 筛选 */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
          <Btn key={f} label={f === 'pending' ? '待审批' : f === 'approved' ? '已通过' : f === 'rejected' ? '已驳回' : '全部'} onPress={() => setFilter(f)} small variant={filter === f ? 'gold' : 'ghost'} style={{ flex: 1 }} />
        ))}
      </View>

      {msg ? <Text style={{ color: A.goldLight, fontSize: 12, paddingHorizontal: 4 }}>{msg}</Text> : null}

      {loading ? <ActivityIndicator color={A.gold} size="large" /> :
        rows.length === 0 ? <Empty text="暂无密码重置申请" /> :
        rows.map((r) => (
          <Card key={r.id} title={`${r.target_email}`} accent={r.status === 'pending' ? A.gold : r.status === 'approved' ? A.green : A.textHint}>
            <Row label="玩家" value={r.target_player_name ?? '未建角色'} />
            <Row label="申请管理员" value={r.requested_by_email} />
            <Row label="申请原因" value={r.reason || '未填写'} />
            <Row label="申请时间" value={new Date(r.created_at).toLocaleString('zh-CN')} />
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
              <Badge text={r.status === 'pending' ? '待审批' : r.status === 'approved' ? '已通过' : '已驳回'} color={r.status === 'pending' ? A.gold : r.status === 'approved' ? A.green : A.textHint} />
              {r.reviewed_at ? <Text style={{ color: A.textHint, fontSize: 10 }}>审批于 {new Date(r.reviewed_at).toLocaleString('zh-CN')}</Text> : null}
            </View>

            {r.status === 'pending' && approving === r.id ? (
              <View style={{ marginTop: 10, gap: 8, backgroundColor: A.bgInput, padding: 10, borderWidth: 1, borderColor: A.border }}>
                <Text style={{ color: A.goldLight, fontSize: 11, fontWeight: '700' }}>重新设置玩家新密码（≥6位）</Text>
                <LabeledInput label="新密码" value={newPwd} onChange={setNewPwd} placeholder="输入新密码" />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Btn label="✓ 通过并重置" onPress={() => onApprove(r.id)} variant="green" small style={{ flex: 1 }} />
                  <Btn label="取消" onPress={() => { setApproving(null); setNewPwd(''); }} variant="ghost" small style={{ flex: 1 }} />
                </View>
              </View>
            ) : null}

            {r.status === 'pending' && approving !== r.id ? (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Btn label="✓ 审批通过" onPress={() => setApproving(r.id)} variant="green" small style={{ flex: 1 }} />
                <Btn label="✗ 驳回" onPress={() => onReject(r.id)} variant="red" small style={{ flex: 1 }} />
              </View>
            ) : null}
          </Card>
        ))
      }
    </ScrollView>
  );
}
```

<a id="srccomponentsadminplayernametabtsx"></a>
## `src/components/admin/PlayerNameTab.tsx`

```tsx
// 玩家存档名称检查（超管 + 普通管理员均可见）
// 检索所有玩家存档名称，按首字符分组（字典序），支持改名
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { adminListPlayerNames, adminRenamePlayer, adminToggleBan, type PlayerNameRow } from '@/lib/adminApi';
import { A, Badge, Btn, Empty } from './shared';

const PAGE_SIZE = 50;

// 取首字符作为分组键
function groupKey(name: string): string {
  if (!name) return '#';
  const ch = name.trim().charAt(0);
  const code = ch.charCodeAt(0);
  if (code >= 0x4e00 && code <= 0x9fff) return ch; // 中文：取该汉字
  if (/[a-zA-Z]/.test(ch)) return ch.toUpperCase();
  if (/[0-9]/.test(ch)) return '0-9';
  return '#';
}

export function PlayerNameTab() {
  const [rows, setRows] = useState<PlayerNameRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  // 改名弹窗
  const [editTarget, setEditTarget] = useState<PlayerNameRow | null>(null);
  const [editValue, setEditValue] = useState('');
  const [renameErr, setRenameErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const load = useCallback(async (p: number) => {
    setLoading(true);
    const data = await adminListPlayerNames(search || undefined, PAGE_SIZE, p * PAGE_SIZE);
    setRows(data);
    setTotal(data.length < PAGE_SIZE && p === 0 ? data.length : (p + 1) * PAGE_SIZE + (data.length === PAGE_SIZE ? 1 : 0));
    setLoading(false);
  }, [search]);

  useFocusEffect(useCallback(() => { load(0); setPage(0); }, [load]));

  const openEdit = (r: PlayerNameRow) => { setEditTarget(r); setEditValue(''); setRenameErr(''); };

  const confirmRename = async () => {
    if (!editTarget) return;
    const name = editValue.trim();
    if (name.length < 1 || name.length > 20) { setRenameErr('名称长度需为1-20字符'); return; }
    setSaving(true);
    const res = await adminRenamePlayer(editTarget.id, name);
    setSaving(false);
    if (res.ok) {
      flash(true, `✓ 已将「${editTarget.player_name}」改名为「${name}」`);
      setEditTarget(null);
      setRenameErr('');
      load(page);
    } else {
      // 弹窗内标红显示错误（熔断 / 敏感词等）
      setRenameErr(res.err ?? '改名失败，请重试');
    }
  };

  const onBan = async (row: PlayerNameRow) => {
    const res = await adminToggleBan(row.user_id, !row.banned);
    if (res.ok) {
      flash(true, row.banned ? `✓ 已解封「${row.player_name}」` : `✓ 已封禁「${row.player_name}」`);
      load(page);
    } else {
      flash(false, `操作失败：${res.err ?? ''}`);
    }
  };

  // 分组
  const groups: { key: string; items: PlayerNameRow[] }[] = [];
  const map = new Map<string, PlayerNameRow[]>();
  rows.forEach((r) => {
    const k = groupKey(r.player_name);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(r);
  });
  [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'zh')).forEach(([key, items]) => {
    groups.push({ key, items: items.sort((x, y) => x.player_name.localeCompare(y.player_name, 'zh')) });
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      <Text style={{ color: A.gold, fontSize: 12, fontWeight: '700' }}>🔍 玩家存档名称检查</Text>

      {msg ? (
        <View style={{ backgroundColor: msg.ok ? A.greenBg : A.redBg, borderLeftWidth: 2, borderLeftColor: msg.ok ? A.green : A.red, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ color: msg.ok ? '#7FE0A0' : '#FF7070', fontSize: 12 }}>{msg.text}</Text>
        </View>
      ) : null}

      {/* 搜索 */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="按名称搜索"
          placeholderTextColor={A.textHint}
          onSubmitEditing={() => { setPage(0); load(0); }}
          style={{ flex: 1, backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }}
        />
        <Btn label="搜索" onPress={() => { setPage(0); load(0); }} variant="gold" small />
      </View>

      {loading ? (
        <ActivityIndicator color={A.gold} size="large" style={{ marginTop: 24 }} />
      ) : groups.length === 0 ? (
        <Empty text="暂无玩家存档" />
      ) : (
        groups.map((g) => (
          <View key={g.key} style={{ gap: 6 }}>
            <Text style={{ color: A.goldLight, fontSize: 12, fontWeight: '700', paddingHorizontal: 2 }}>
              {/^[A-Z0-9#]$/.test(g.key) ? g.key : `${g.key} · 拼音/汉字首字母`}
            </Text>
            {g.items.map((r) => (
              <View key={r.id} style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, padding: 12, gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={{ color: A.textPrimary, fontSize: 13, fontWeight: '700' }}>{r.player_name}</Text>
                      {r.banned ? <Badge text="封禁" color={A.red} /> : null}
                    </View>
                    <Text style={{ color: A.textHint, fontSize: 10 }}>Lv.{r.rank_level} {r.rank_name} · 账号 {r.email || '—'}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Btn label="改名" onPress={() => openEdit(r)} variant="blue" small style={{ flex: 1 }} />
                  <Btn label={r.banned ? '🔓 解封' : '🔒 封禁'} onPress={() => onBan(r)} variant={r.banned ? 'green' : 'red'} small style={{ flex: 1 }} />
                </View>
              </View>
            ))}
          </View>
        ))
      )}

      {/* 分页 */}
      {!search ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Btn label="◀ 上页" onPress={() => { const p = Math.max(0, page - 1); setPage(p); load(p); }} variant="ghost" small disabled={page === 0} />
          <Text style={{ color: A.textSecond, fontSize: 11 }}>第 {page + 1} / {totalPages} 页</Text>
          <Btn label="下页 ▶" onPress={() => { const p = page + 1; setPage(p); load(p); }} variant="ghost" small disabled={rows.length < PAGE_SIZE} />
        </View>
      ) : null}

      {/* 改名弹窗 */}
      <Modal visible={!!editTarget} transparent animationType="fade" onRequestClose={() => setEditTarget(null)}>
        <Pressable cssInterop={false} onPress={() => setEditTarget(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 }}>
          <Pressable cssInterop={false} onPress={() => {}} style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.gold, padding: 18, gap: 12 }}>
            <Text style={{ color: A.goldLight, fontSize: 14, fontWeight: '700' }}>✏️ 更改玩家存档名称</Text>
            <Text style={{ color: A.textHint, fontSize: 11 }}>原名：{editTarget?.player_name}</Text>
            <TextInput
              value={editValue}
              onChangeText={(v) => { setEditValue(v); setRenameErr(''); }}
              placeholder="输入新名称（1-20字符）"
              placeholderTextColor={A.textHint}
              maxLength={20}
              style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: renameErr ? A.red : A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }}
            />
            {/* 弹窗内直接标红显示错误（敏感词熔断等） */}
            {renameErr ? (
              <View style={{ backgroundColor: '#3A1515', borderLeftWidth: 2, borderLeftColor: A.red, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text style={{ color: '#FF7070', fontSize: 12, fontWeight: '600' }}>🚫 {renameErr}</Text>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Btn label="取消" onPress={() => { setEditTarget(null); setRenameErr(''); }} variant="ghost" small style={{ flex: 1 }} />
              <Btn label={saving ? '改名中…' : '确认改名'} onPress={confirmRename} variant="gold" small style={{ flex: 1 }} disabled={saving} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
```

<a id="srccomponentsadminplayerranktabtsx"></a>
## `src/components/admin/PlayerRankTab.tsx`

```tsx
// 玩家排行榜（超管 + 普通管理员均可见）
// 按玩家等级降序，前20名
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { adminPlayerLeaderboard, type PlayerLeaderRow } from '@/lib/adminApi';
import { A, Badge, Empty } from './shared';

export function PlayerRankTab() {
  const [rows, setRows] = useState<PlayerLeaderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await adminPlayerLeaderboard();
    setRows(data);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      <Text style={{ color: A.gold, fontSize: 12, fontWeight: '700' }}>🏆 玩家排行榜 · 前20名</Text>

      {loading ? (
        <ActivityIndicator color={A.gold} size="large" style={{ marginTop: 24 }} />
      ) : rows.length === 0 ? (
        <Empty text="暂无玩家数据" />
      ) : (
        rows.map((p, idx) => (
          <View key={p.id} style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: idx < 3 ? A.gold : A.divider, padding: 12, gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Text style={{ color: idx < 3 ? A.goldLight : A.textSecond, fontSize: 14, fontWeight: '700' }}>
                  {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : `#${idx + 1}`}
                </Text>
                <Text style={{ color: A.textPrimary, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>{p.player_name}</Text>
              </View>
              <Badge text={p.rank_name} color={A.gold} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              <Text style={{ color: A.goldLight, fontSize: 11 }}>等级 Lv.{p.rank_level}</Text>
              <Text style={{ color: A.textSecond, fontSize: 11 }}>政绩 {p.merit_points}</Text>
              <Text style={{ color: A.textSecond, fontSize: 11 }}>民望 {p.moral_value}</Text>
              <Text style={{ color: A.textSecond, fontSize: 11 }}>任职 {p.game_days} 天</Text>
              {p.city_name ? <Text style={{ color: A.textSecond, fontSize: 11 }}>{p.city_name}</Text> : null}
              {p.is_retired ? <Text style={{ color: A.textHint, fontSize: 11 }}>已退休</Text> : null}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
```

<a id="srccomponentsadminpushtabtsx"></a>
## `src/components/admin/PushTab.tsx`

```tsx
// 公告管理 Tab：两分页（登录页 / 测试码页）+ 标题 + 内容 + 发布
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { A, Btn, Card, LabeledInput, Row } from './shared';
import { adminGetAnnouncement, adminUpsertAnnouncement, type Announcement } from '@/lib/adminApi';

type PageKey = 'login' | 'enter_code';
const PAGE_TABS: { key: PageKey; label: string }[] = [
  { key: 'login',      label: '🔐 登录页公告' },
  { key: 'enter_code', label: '🔑 测试码页公告' },
];

interface AnoState { title: string; content: string; active: boolean; updating: boolean; info: Announcement | null; }
const defaultState = (): AnoState => ({ title: '', content: '', active: true, updating: false, info: null });

export function AnnouncementTab({ role }: { role: string }) {
  const canEdit = role === 'admin' || role === 'super_admin';
  const [page, setPage] = useState<PageKey>('login');
  const [states, setStates] = useState<Record<PageKey, AnoState>>({
    login: defaultState(), enter_code: defaultState(),
  });
  const [loading, setLoading] = useState<Record<PageKey, boolean>>({ login: false, enter_code: false });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loaded, setLoaded] = useState<Record<PageKey, boolean>>({ login: false, enter_code: false });

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 5000);
  };

  const loadPage = useCallback(async (key: PageKey) => {
    if (loaded[key]) return;
    setLoading((p) => ({ ...p, [key]: true }));
    const info = await adminGetAnnouncement(key);
    setLoading((p) => ({ ...p, [key]: false }));
    setLoaded((p) => ({ ...p, [key]: true }));
    if (info) {
      setStates((p) => ({ ...p, [key]: { ...p[key], title: info.title, content: info.content, active: info.active, info } }));
    }
  }, [loaded]);

  // 切换分页时加载
  const onSelectPage = (key: PageKey) => {
    setPage(key);
    loadPage(key);
  };

  // 首次自动加载当前页
  useEffect(() => { loadPage(page); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const s = states[page];
  const set = (field: keyof AnoState) => (v: string | boolean) =>
    setStates((p) => ({ ...p, [page]: { ...p[page], [field]: v } }));

  const onSubmit = async () => {
    if (!s.title.trim() || !s.content.trim()) { flash(false, '✗ 标题和内容不能为空'); return; }
    setStates((p) => ({ ...p, [page]: { ...p[page], updating: true } }));
    const r = await adminUpsertAnnouncement(page, s.title.trim(), s.content.trim(), s.active);
    setStates((p) => ({ ...p, [page]: { ...p[page], updating: false } }));
    flash(r.ok, r.ok ? `✓ 公告已${s.active ? '发布' : '隐藏'}` : `✗ ${r.err}`);
    if (r.ok) {
      // 刷新 info，表单内容保留
      const refreshed = await adminGetAnnouncement(page);
      setStates((p) => ({ ...p, [page]: { ...p[page], info: refreshed } }));
    }
  };

  const onClear = () => setStates((p) => ({ ...p, [page]: { ...p[page], title: '', content: '' } }));

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* 分页 Tab */}
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {PAGE_TABS.map((t) => (
          <Pressable key={t.key} cssInterop={false} onPress={() => onSelectPage(t.key)}
            style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: page === t.key ? A.gold : A.bgInput, borderWidth: 1, borderColor: page === t.key ? A.gold : A.border }}>
            <Text style={{ color: page === t.key ? '#0D1B2A' : A.textSecond, fontSize: 11, fontWeight: '700' }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* 编辑区 */}
      <Card title={`${PAGE_TABS.find((t) => t.key === page)!.label} · 当前公告`} accent={A.gold}>
        {loading[page]
          ? <ActivityIndicator color={A.gold} />
          : (
          <View style={{ gap: 10 }}>
            {s.info?.updated_by_email ? (
              <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                <Row label="最后更新" value={s.info.updated_at ? new Date(s.info.updated_at).toLocaleString('zh-CN') : '-'} valueColor={A.textHint} />
                <Row label="操作人" value={s.info.updated_by_email} valueColor={A.textHint} />
              </View>
            ) : null}

            <LabeledInput label="公告标题" value={s.title} onChange={set('title') as (v: string) => void} placeholder="如：测试阶段通知" />
            <LabeledInput label="公告内容" value={s.content} onChange={set('content') as (v: string) => void} placeholder="在此输入公告正文内容…" multiline />

            {/* 是否显示 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: A.textSecond, fontSize: 11 }}>是否显示：</Text>
              {([true, false] as const).map((v) => (
                <Pressable key={String(v)} cssInterop={false} onPress={() => canEdit && (set('active') as (v: boolean) => void)(v)}
                  style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: s.active === v ? (v ? A.green : A.red) : A.bgInput, borderWidth: 1, borderColor: s.active === v ? (v ? A.green : A.red) : A.border }}>
                  <Text style={{ color: s.active === v ? '#fff' : A.textSecond, fontSize: 11, fontWeight: '600' }}>{v ? '显示' : '隐藏'}</Text>
                </Pressable>
              ))}
            </View>

            {canEdit
              ? (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <View style={{ flex: 1 }}>
                    <Btn label={s.updating ? '保存中...' : s.active ? '📢 发布公告' : '💾 保存（隐藏）'} onPress={onSubmit} disabled={s.updating} variant="gold" />
                  </View>
                  <Btn label="清空" onPress={onClear} variant="ghost" small />
                </View>
              )
              : <Text style={{ color: A.textHint, fontSize: 10 }}>需 admin 及以上权限</Text>
            }
          </View>
        )}
      </Card>

      {msg ? (
        <View style={{ backgroundColor: msg.ok ? A.greenBg : A.redBg, borderLeftWidth: 2, borderLeftColor: msg.ok ? A.green : A.red, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ color: msg.ok ? '#7FE0A0' : '#FF7070', fontSize: 12 }}>{msg.text}</Text>
        </View>
      ) : null}

      {/* 预览区 */}
      {s.title || s.content ? (
        <Card title="📋 预览效果" accent={A.blue}>
          <View style={{ borderWidth: 1, borderColor: A.gold, borderLeftWidth: 3, backgroundColor: A.goldBg, padding: 12, gap: 6 }}>
            {s.title ? <Text style={{ color: A.goldLight, fontSize: 14, fontWeight: '700' }}>{s.title}</Text> : null}
            {s.content ? <Text style={{ color: A.textPrimary, fontSize: 12, lineHeight: 20 }}>{s.content}</Text> : null}
          </View>
        </Card>
      ) : null}
    </ScrollView>
  );
}

// 简单的 mount 回调 hook（已内联为 useEffect，此处保留空函数供向后兼容）
function useCallbackOnMount(_cb: () => void) { /* replaced by inline useEffect */ }
```

<a id="srccomponentsadminredeemtabtsx"></a>
## `src/components/admin/RedeemTab.tsx`

```tsx
// 兑换码 Tab：生成码 + 列表筛选 + 复制
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { A, Badge, Btn, Card, Empty, LabeledInput } from './shared';
import { adminCreateRedeemCode, listRedeemCodes, type RedeemCode } from '@/lib/adminApi';

export function RedeemTab({ role }: { role: string }) {
  const canCreate = role === 'admin' || role === 'super_admin';
  const [label, setLabel] = useState('通用兑换码');
  const [rewardMerit, setRewardMerit] = useState('500');
  const [rewardFund, setRewardFund] = useState('10000');
  const [count, setCount] = useState('1');
  const [creating, setCreating] = useState(false);
  const [newCodes, setNewCodes] = useState<string[]>([]);
  const [msg, setMsg] = useState('');

  const [filter, setFilter] = useState<'all' | 'unused' | 'used'>('all');
  const [list, setList] = useState<RedeemCode[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setList(await listRedeemCodes(filter));
    setLoading(false);
  }, [filter]);

  const onGenerate = async () => {
    setCreating(true); setMsg('');
    const reward: Record<string, unknown> = { merit: Number(rewardMerit) || 0, fund: Number(rewardFund) || 0 };
    const codes = await adminCreateRedeemCode(label, reward, Number(count) || 1);
    setNewCodes(codes);
    setCreating(false);
    setMsg(codes.length > 0 ? `✓ 已生成 ${codes.length} 个兑换码` : '✗ 生成失败');
    load();
  };

  const copy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    setMsg('✓ 已复制：' + text);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* 生成 */}
      {canCreate ? (
        <Card title="生成兑换码" accent={A.gold}>
          <View style={{ gap: 8 }}>
            <LabeledInput label="码名称" value={label} onChange={setLabel} placeholder="通用兑换码" />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}><LabeledInput label="奖励·功勋" value={rewardMerit} onChange={setRewardMerit} keyboardType="number-pad" /></View>
              <View style={{ flex: 1 }}><LabeledInput label="奖励·资金" value={rewardFund} onChange={setRewardFund} keyboardType="number-pad" /></View>
              <View style={{ flex: 0.6 }}><LabeledInput label="数量" value={count} onChange={setCount} keyboardType="number-pad" /></View>
            </View>
            <Btn label={creating ? '生成中...' : '生成兑换码'} onPress={onGenerate} disabled={creating} />
          </View>
          {newCodes.length > 0 ? (
            <View style={{ marginTop: 10, gap: 6 }}>
              <Text style={{ color: A.goldLight, fontSize: 11 }}>新生成的码（点击复制）</Text>
              {newCodes.map((c) => (
                <Pressable key={c} cssInterop={false} onPress={() => copy(c)} style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.gold, padding: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: A.goldLight, fontSize: 14, fontWeight: '700', letterSpacing: 1 }}>{c}</Text>
                  <Text style={{ color: A.textHint, fontSize: 11 }}>复制</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Card>
      ) : null}

      {msg ? <Text style={{ color: A.goldLight, fontSize: 12, paddingHorizontal: 4 }}>{msg}</Text> : null}

      {/* 列表 */}
      <Card title="兑换码列表">
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
          {(['all', 'unused', 'used'] as const).map((f) => (
            <Pressable key={f} cssInterop={false} onPress={() => setFilter(f)} style={{ flex: 1, paddingVertical: 7, alignItems: 'center', backgroundColor: filter === f ? A.gold : A.bgInput, borderWidth: 1, borderColor: filter === f ? A.gold : A.border }}>
              <Text style={{ color: filter === f ? '#0D1B2A' : A.textSecond, fontSize: 11, fontWeight: '600' }}>{f === 'all' ? '全部' : f === 'unused' ? '未用' : '已用'}</Text>
            </Pressable>
          ))}
        </View>
        {loading ? <ActivityIndicator color={A.gold} /> :
          list.length === 0 ? <Empty text="无兑换码" /> :
          list.map((c) => (
            <View key={c.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: A.divider, gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Pressable cssInterop={false} onPress={() => copy(c.code)}>
                  <Text style={{ color: c.is_used ? A.textHint : A.goldLight, fontSize: 14, fontWeight: '700', letterSpacing: 1 }}>{c.code}</Text>
                </Pressable>
                <Badge text={c.is_used ? '已用' : '可用'} color={c.is_used ? A.textHint : A.green} />
              </View>
              <Text style={{ color: A.textSecond, fontSize: 10 }}>{c.label} · 功勋{String(c.reward?.merit ?? 0)} 资金{String(c.reward?.fund ?? 0)}</Text>
              <Text style={{ color: A.textHint, fontSize: 9 }}>{c.is_used ? `使用人 ${c.used_by_email ?? '-'} · ${c.used_at ? new Date(c.used_at).toLocaleString('zh-CN') : ''}` : `生成于 ${new Date(c.created_at).toLocaleString('zh-CN')}`}</Text>
            </View>
          ))
        }
      </Card>
    </ScrollView>
  );
}
```

<a id="srccomponentsadminrisktabtsx"></a>
## `src/components/admin/RiskTab.tsx`

```tsx
// 风险监控 Tab：设备/IP 集群检测已关闭，展示简要说明
import { ScrollView, Text, View } from 'react-native';
import { A, Card } from './shared';

export function RiskTab({ role: _role }: { role: string }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
      <Card title="🚨 风险监控" accent={A.gold}>
        <View style={{ gap: 10 }}>
          <View style={{ backgroundColor: A.greenBg, borderLeftWidth: 2, borderLeftColor: A.green, paddingHorizontal: 12, paddingVertical: 10 }}>
            <Text style={{ color: '#7FE0A0', fontSize: 12, fontWeight: '700', marginBottom: 4 }}>✅ 检测机制已精简</Text>
            <Text style={{ color: A.textSecond, fontSize: 11, lineHeight: 18 }}>
              设备指纹检测、多设备登录检测、IP 集群检测均已关闭。{'\n'}
              测试码注册流程仅进行码有效性验证，不再对设备/IP 做限制。
            </Text>
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ color: A.textHint, fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>当前生效的审核逻辑</Text>
            {[
              '✔ 测试码一码一用（状态流转：unused → used）',
              '✔ 自动审批模式：开启后提交码即直接 approved',
              '✔ 手动审批模式：提交码后状态为 pending，等待管理员审核',
              '✔ 已审批账号重新提交码：直接返回 ALREADY_APPROVED',
              '✔ 封禁账号：通过申诉流程由超级管理员处理',
            ].map((item, i) => (
              <Text key={i} style={{ color: A.textSecond, fontSize: 11, lineHeight: 18 }}>{item}</Text>
            ))}
          </View>
          <View style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, padding: 10 }}>
            <Text style={{ color: A.textHint, fontSize: 10, lineHeight: 16 }}>
              如需查看账号分布情况，请使用「账号」或「统计」Tab。{'\n'}
              如需处理违规账号，请使用「删除账号」或「封禁记录」Tab。
            </Text>
          </View>
        </View>
      </Card>
    </ScrollView>
  );
}
```

<a id="srccomponentsadminsavetabtsx"></a>
## `src/components/admin/SaveTab.tsx`

```tsx
// 存档修改 Tab：按存档ID加载 + 14字段编辑 + 清除冷却 + 全量关联游戏数据
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { A, Badge, Btn, Card, Empty, LabeledInput, Row } from './shared';
import {
  adminClearCooldowns, adminGetSave, adminPromoteRank, adminUpdateSaveFields,
  adminGetPlayerFull, adminFindSaveByAccount, adminDeleteAccount, adminBanAccount,
  type SaveData, type PlayerFullData, type FoundAccount,
} from '@/lib/adminApi';

export function SaveTab({ role }: { role: string }) {
  const canEdit = role === 'super_admin';
  const canDelete = role === 'admin' || role === 'super_admin';
  const [saveId, setSaveId] = useState('');
  const [save, setSave] = useState<SaveData | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  // 多存档选择 + 账号信息
  const [foundAccounts, setFoundAccounts] = useState<FoundAccount[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmBan, setConfirmBan] = useState(false);
  const [acting, setActing] = useState(false);
  // 关联游戏数据
  const [gameData, setGameData] = useState<PlayerFullData | null>(null);
  const [gameDataLoading, setGameDataLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const toggleSection = (key: string) => setExpandedSections(p => ({ ...p, [key]: !p[key] }));

  const loadSaveDetail = useCallback(async (sid: string, uid: string) => {
    setLoading(true); setMsg(''); setGameData(null);
    const s = await adminGetSave(sid);
    setSave(s); setCurrentUserId(uid);
    setLoading(false);
    if (!s) { setMsg('✗ 未找到该存档'); return; }
    setFields({
      player_name: s.player_name, merit_points: String(s.merit_points), moral_value: String(s.moral_value),
      city_gdp: String(s.city_gdp), city_livelihood: String(s.city_livelihood), city_ecology: String(s.city_ecology),
      city_business: String(s.city_business), security_index: String(s.security_index), boss_favor: String(s.boss_favor),
      fund_balance: String(s.fund_balance), personal_savings: String(s.personal_savings),
    });
    setGameDataLoading(true);
    const gd = await adminGetPlayerFull(s.id);
    setGameData(gd);
    setGameDataLoading(false);
  }, []);

  const load = useCallback(async () => {
    if (!saveId.trim()) { setMsg('请输入账号邮箱 / 用户ID / 存档ID'); return; }
    setLoading(true); setMsg(''); setGameData(null); setFoundAccounts([]); setSave(null); setCurrentEmail('');
    // 先按账号(邮箱/用户ID/存档ID)解析出存档列表，把后台与玩家账号绑定
    const found = await adminFindSaveByAccount(saveId.trim());
    if (!found.length) {
      setLoading(false); setMsg('✗ 未找到该账号对应的存档'); return;
    }
    setCurrentUserId(found[0].user_id);
    setCurrentEmail(found[0].email);
    if (found.length === 1) {
      await loadSaveDetail(found[0].save_id, found[0].user_id);
      return;
    }
    // 多存档：列出供管理员选择
    setLoading(false);
    setFoundAccounts(found);
  }, [saveId, loadSaveDetail]);

  const onDelete = async () => {
    if (!currentUserId) return;
    setActing(true);
    const r = await adminDeleteAccount(currentUserId);
    setConfirmDelete(false);
    setActing(false);
    setMsg(r.ok ? '✓ 账号已彻底删除（含全部游戏数据），设备/IP 已封禁100年防重注册' : `✗ ${r.err}`);
    if (r.ok) { setSave(null); setFoundAccounts([]); setGameData(null); setCurrentUserId(''); setCurrentEmail(''); }
  };

  const onBan = async () => {
    if (!currentUserId) return;
    setActing(true);
    const r = await adminBanAccount(currentUserId);
    setConfirmBan(false);
    setActing(false);
    setMsg(r.ok ? '✓ 账号已封禁100年（数据保留）' : `✗ ${r.err}`);
  };

  const setF = (k: string) => (v: string) => setFields((p) => ({ ...p, [k]: v }));

  const onSave = async () => {
    if (!save) return;
    const r = await adminUpdateSaveFields(save.id, fields);
    setMsg(r.ok ? '✓ 存档已保存' : `✗ ${r.err}`);
    if (r.ok) { const s = await adminGetSave(save.id); setSave(s); }
  };
  const onClearCD = async () => {
    if (!save) return;
    const r = await adminClearCooldowns(save.id);
    setMsg(r.ok ? '✓ 冷却已清除' : `✗ ${r.err}`);
  };
  const onPromote = async (rank: number) => {
    if (!save) return;
    const r = await adminPromoteRank(save.id, rank);
    setMsg(r.ok ? `✓ 晋升至 L${rank}` : `✗ ${r.err}`);
    if (r.ok) { const s = await adminGetSave(save.id); setSave(s); }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Card title="加载存档">
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}><LabeledInput label="账号邮箱 / 用户ID / 存档ID" value={saveId} onChange={setSaveId} placeholder="输入玩家账号或存档ID" /></View>
          <Btn label={loading ? '...' : '加载'} onPress={load} small disabled={loading} />
        </View>
        {msg ? <Text style={{ color: A.goldLight, fontSize: 12, marginTop: 8 }}>{msg}</Text> : null}
      </Card>

      {loading ? <ActivityIndicator color={A.gold} size="large" /> : null}

      {/* 账号操作：删除（彻底删除）/ 封禁（100年）—— 搜索出账号后即可操作，无需进入存档 */}
      {canDelete && currentUserId ? (
        <Card title="账号操作（危险）" accent={A.red}>
          <View style={{ gap: 6 }}>
            <Row label="账号邮箱" value={currentEmail || currentUserId.slice(0, 8) + '...'} />
            <Row label="用户ID" value={currentUserId.slice(0, 8) + '...'} />
            {foundAccounts.length > 1 ? <Text style={{ color: A.gold, fontSize: 11 }}>该账号有 {foundAccounts.length} 个存档</Text> : null}
          </View>

          {confirmDelete ? (
            <View style={{ gap: 8, marginTop: 10 }}>
              <Text style={{ color: A.red, fontSize: 12, fontWeight: '700' }}>确认彻底删除账号 {currentEmail || currentUserId.slice(0, 8)}... ？{'\n'}将删除登录账号及全部游戏数据，操作不可恢复。</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn label={acting ? '删除中...' : '确认彻底删除'} onPress={onDelete} variant="red" small disabled={acting} />
                <Btn label="取消" onPress={() => setConfirmDelete(false)} small disabled={acting} />
              </View>
            </View>
          ) : confirmBan ? (
            <View style={{ gap: 8, marginTop: 10 }}>
              <Text style={{ color: A.gold, fontSize: 12, fontWeight: '700' }}>确认封禁账号 {currentEmail || currentUserId.slice(0, 8)}... 100年？{'\n'}账号与数据保留，玩家无法登录。</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn label={acting ? '封禁中...' : '确认封禁100年'} onPress={onBan} variant="gold" small disabled={acting} />
                <Btn label="取消" onPress={() => setConfirmBan(false)} small disabled={acting} />
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Btn label="🗑️ 彻底删除账号" onPress={() => { setConfirmDelete(true); setConfirmBan(false); }} variant="red" small />
              <Btn label="🔒 封禁100年" onPress={() => { setConfirmBan(true); setConfirmDelete(false); }} variant="gold" small />
            </View>
          )}
        </Card>
      ) : null}

      {foundAccounts.length > 1 ? (
        <Card title="该账号有多个存档，请选择" accent={A.gold}>
          {foundAccounts.map((a) => (
            <Pressable
              key={a.save_id}
              cssInterop={false}
              onPress={() => { setFoundAccounts([]); loadSaveDetail(a.save_id, a.user_id); }}
              style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: A.divider }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ color: A.textPrimary, fontSize: 14, fontWeight: '700' }}>{a.player_name} · L{a.rank_level ?? '-'} {a.rank_name ?? ''}</Text>
                  <Text style={{ color: A.textSecond, fontSize: 10, marginTop: 2 }}>存档 {a.save_id.slice(0, 8)}...</Text>
                </View>
                <Text style={{ color: A.gold, fontSize: 12 }}>查看 ›</Text>
              </View>
            </Pressable>
          ))}
        </Card>
      ) : null}

      {save ? (
        <View style={{ gap: 12 }}>
          {/* 存档概览 */}
          <Card title={`${save.player_name} · L${save.rank_level} ${save.rank_name}`} accent={A.gold}>
            <Row label="存档ID" value={save.id.slice(0, 8) + '...'} />
            <Row label="用户ID" value={save.user_id.slice(0, 8) + '...'} />
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
              {save.is_retired ? <Badge text="已退休" color={A.textHint} /> : null}
              {save.game_over_type ? <Badge text={`结局:${save.game_over_type}`} color={A.red} /> : <Badge text="进行中" color={A.green} />}
            </View>
          </Card>

          {/* 字段编辑（super_admin） */}
          {canEdit ? (
            <Card title="字段修改（保存后立即生效）" accent={A.blue}>
              <View style={{ gap: 8 }}>
                <LabeledInput label="姓名" value={fields.player_name ?? ''} onChange={setF('player_name')} />
                <FieldGrid fields={fields} setF={setF} />
                <Btn label="保存修改" onPress={onSave} variant="gold" />
              </View>
            </Card>
          ) : (
            <Card title="字段（只读，需 super_admin 权限修改）" accent={A.textHint}>
              <View style={{ gap: 6 }}>
                <Row label="功勋" value={save.merit_points} />
                <Row label="民心" value={save.moral_value} />
                <Row label="GDP" value={save.city_gdp} />
                <Row label="民生" value={save.city_livelihood} />
                <Row label="资金" value={save.fund_balance} />
              </View>
            </Card>
          )}

          {/* 操作 */}
          <Card title="存档操作" accent={A.red}>
            <View style={{ gap: 8 }}>
              <Text style={{ color: A.textSecond, fontSize: 11 }}>职务晋升（目标职级 1-15）</Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {[3, 6, 8, 10, 13, 15].map((r) => (
                  <Pressable key={r} cssInterop={false} onPress={() => onPromote(r)} style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.gold, paddingHorizontal: 10, paddingVertical: 6 }}>
                    <Text style={{ color: A.goldLight, fontSize: 11 }}>L{r}</Text>
                  </Pressable>
                ))}
              </View>
              {canEdit ? <Btn label="❄️ 清除冷却" onPress={onClearCD} variant="ghost" /> : null}
            </View>
          </Card>

          {/* 关联游戏数据 */}
          <Card title="关联游戏数据" accent={A.blue}>
            {gameDataLoading
              ? <ActivityIndicator color={A.gold} style={{ paddingVertical: 12 }} />
              : gameData
                ? <GameDataSections data={gameData} expanded={expandedSections} toggle={toggleSection} />
                : <Text style={{ color: A.textHint, fontSize: 11, paddingVertical: 8 }}>暂无关联数据</Text>
            }
          </Card>
        </View>
      ) : (
        !loading ? <Empty text="输入玩家账号邮箱 / 用户ID / 存档ID 加载详情" /> : null
      )}
    </ScrollView>
  );
}

function FieldGrid({ fields, setF }: { fields: Record<string, string>; setF: (k: string) => (v: string) => void }) {
  const items: [string, string][] = [
    ['merit_points', '功勋'], ["moral_value", "民心"], ['city_gdp', 'GDP'], ['city_livelihood', '民生'],
    ['city_ecology', '生态'], ['city_business', '商业'], ['security_index', '治安'], ['boss_favor', '上司好感'],
    ['fund_balance', '资金'], ['personal_savings', '储蓄'],
  ];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {items.map(([k, label]) => (
        <View key={k} style={{ width: '47%' }}>
          <LabeledInput label={label} value={fields[k] ?? ''} onChange={setF(k)} keyboardType="number-pad" />
        </View>
      ))}
    </View>
  );
}

// ── 关联游戏数据分区组件 ──────────────────────────────────────────────────────
function SectionHeader({ title, count, expanded, onToggle }: { title: string; count: number; expanded: boolean; onToggle: () => void }) {
  return (
    <Pressable cssInterop={false} onPress={onToggle}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: A.divider }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ color: A.gold, fontSize: 12, fontWeight: '700' }}>{title}</Text>
        <View style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, paddingHorizontal: 6, paddingVertical: 1 }}>
          <Text style={{ color: A.textHint, fontSize: 10 }}>{count}</Text>
        </View>
      </View>
      <Text style={{ color: A.textHint, fontSize: 14 }}>{expanded ? '▲' : '▼'}</Text>
    </Pressable>
  );
}

function GameDataSections({ data, expanded, toggle }: { data: PlayerFullData; expanded: Record<string, boolean>; toggle: (k: string) => void }) {
  return (
    <View style={{ gap: 2 }}>
      {/* 健康状态（单条，直接展示） */}
      {data.health && (
        <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: A.divider }}>
          <Text style={{ color: A.gold, fontSize: 12, fontWeight: '700', flex: 1 }}>❤️ 健康</Text>
          <Text style={{ color: A.textPrimary, fontSize: 11 }}>体力 {data.health.health}</Text>
          <Text style={{ color: A.textPrimary, fontSize: 11 }}>精力 {data.health.energy}</Text>
          {data.health.is_on_leave && <Badge text="休假中" color={A.blue} />}
        </View>
      )}

      {/* 职业履历 */}
      <SectionHeader title="📋 职业履历" count={data.career_history.length} expanded={!!expanded.career} onToggle={() => toggle('career')} />
      {expanded.career && (
        <View style={{ gap: 4, paddingVertical: 6 }}>
          {data.career_history.length === 0 ? <Text style={{ color: A.textHint, fontSize: 11 }}>暂无记录</Text>
            : data.career_history.map((c, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: A.divider }}>
                <Text style={{ color: A.textHint, fontSize: 10, width: 18 }}>L{c.rank_level}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: A.textPrimary, fontSize: 11 }}>{c.position}</Text>
                  <Text style={{ color: A.textHint, fontSize: 10 }}>{c.city} · {c.start_year}—{c.end_year ?? '至今'}</Text>
                </View>
              </View>
            ))}
        </View>
      )}

      {/* 下属团队 */}
      <SectionHeader title="👥 下属团队" count={data.subordinates.length} expanded={!!expanded.subs} onToggle={() => toggle('subs')} />
      {expanded.subs && (
        <View style={{ gap: 4, paddingVertical: 6 }}>
          {data.subordinates.length === 0 ? <Text style={{ color: A.textHint, fontSize: 11 }}>暂无下属</Text>
            : data.subordinates.map((s, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: A.divider }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: A.textPrimary, fontSize: 11 }}>{s.name} <Text style={{ color: A.textHint, fontSize: 10 }}>L{s.rank_level} {s.role}</Text></Text>
                  {s.specialty ? <Text style={{ color: A.textHint, fontSize: 10 }}>专长: {s.specialty}</Text> : null}
                </View>
                <Text style={{ color: A.green, fontSize: 11 }}>忠诚{s.loyalty}</Text>
                <Text style={{ color: A.goldLight, fontSize: 11 }}>能力{s.ability}</Text>
                {s.is_appointed && <Badge text="已任命" color={A.green} />}
              </View>
            ))}
        </View>
      )}

      {/* 上司任务 */}
      <SectionHeader title="📌 上司任务" count={data.boss_tasks.length} expanded={!!expanded.tasks} onToggle={() => toggle('tasks')} />
      {expanded.tasks && (
        <View style={{ gap: 4, paddingVertical: 6 }}>
          {data.boss_tasks.length === 0 ? <Text style={{ color: A.textHint, fontSize: 11 }}>暂无任务</Text>
            : data.boss_tasks.map((t, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: A.divider }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: A.textPrimary, fontSize: 11 }}>{t.title}</Text>
                  <Text style={{ color: A.textHint, fontSize: 10 }}>进度 {t.current_value}/{t.target_value} · 奖励 {t.reward_merit}</Text>
                </View>
                <Badge text={t.status} color={t.status === 'active' ? A.gold : t.status === 'completed' ? A.green : A.textHint} />
                {t.urgency === 'urgent' && <Badge text="紧急" color={A.red} />}
              </View>
            ))}
        </View>
      )}

      {/* 建设项目 */}
      <SectionHeader title="🏗️ 建设项目" count={data.construction.length} expanded={!!expanded.build} onToggle={() => toggle('build')} />
      {expanded.build && (
        <View style={{ gap: 4, paddingVertical: 6 }}>
          {data.construction.length === 0 ? <Text style={{ color: A.textHint, fontSize: 11 }}>暂无项目</Text>
            : data.construction.map((c, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: A.divider }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: A.textPrimary, fontSize: 11 }}>{c.name}</Text>
                  <Text style={{ color: A.textHint, fontSize: 10 }}>{c.category} · 奖励 {c.merit_reward}</Text>
                </View>
                <Badge text={c.status} color={c.status === 'completed' ? A.green : c.status === 'in_progress' ? A.blue : A.textHint} />
              </View>
            ))}
        </View>
      )}

      {/* 家庭成员 */}
      <SectionHeader title="👨‍👩‍👧 家庭成员" count={data.family_members.length} expanded={!!expanded.family} onToggle={() => toggle('family')} />
      {expanded.family && (
        <View style={{ gap: 4, paddingVertical: 6 }}>
          {data.family_members.length === 0 ? <Text style={{ color: A.textHint, fontSize: 11 }}>暂无成员</Text>
            : data.family_members.map((f, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: A.divider }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: A.textPrimary, fontSize: 11 }}>{f.name} <Text style={{ color: A.textHint, fontSize: 10 }}>({f.member_type})</Text></Text>
                  {f.job ? <Text style={{ color: A.textHint, fontSize: 10 }}>{f.job}</Text> : null}
                </View>
                <Text style={{ color: A.green, fontSize: 11 }}>健康{f.health_score}</Text>
                <Text style={{ color: A.goldLight, fontSize: 11 }}>品德{f.moral_score}</Text>
              </View>
            ))}
        </View>
      )}

      {/* 治安案件 */}
      <SectionHeader title="🚔 治安案件" count={data.police_cases.length} expanded={!!expanded.police} onToggle={() => toggle('police')} />
      {expanded.police && (
        <View style={{ gap: 4, paddingVertical: 6 }}>
          {data.police_cases.length === 0 ? <Text style={{ color: A.textHint, fontSize: 11 }}>暂无案件</Text>
            : data.police_cases.map((p, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: A.divider }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: A.textPrimary, fontSize: 11 }}>{p.title}</Text>
                  <Text style={{ color: A.textHint, fontSize: 10 }}>{p.case_type} · 难度{p.difficulty}</Text>
                </View>
                <Badge text={p.status} color={p.status === 'solved' ? A.green : p.status === 'pending' ? A.gold : A.textHint} />
              </View>
            ))}
        </View>
      )}

      {/* 管辖区域 */}
      <SectionHeader title="🗺️ 管辖区域" count={data.governing_areas.length} expanded={!!expanded.areas} onToggle={() => toggle('areas')} />
      {expanded.areas && (
        <View style={{ gap: 4, paddingVertical: 6 }}>
          {data.governing_areas.length === 0 ? <Text style={{ color: A.textHint, fontSize: 11 }}>暂无区域</Text>
            : data.governing_areas.map((a, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: A.divider }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: A.textPrimary, fontSize: 11 }}>{a.area_name} <Text style={{ color: A.textHint, fontSize: 10 }}>({a.area_type})</Text></Text>
                </View>
                <Text style={{ color: A.green, fontSize: 11 }}>发展{a.dev_index}</Text>
                <Text style={{ color: A.goldLight, fontSize: 11 }}>民心{a.favor_index}</Text>
              </View>
            ))}
        </View>
      )}
    </View>
  );
}
```

<a id="srccomponentsadminsensitivewordtabtsx"></a>
## `src/components/admin/SensitiveWordTab.tsx`

```tsx
// 敏感词汇库（超管 + 普通管理员均可输入/管理）
// 玩家改名/创建存档时若名称包含库中任一词汇，将被多套机制自动熔断
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  adminAddSensitiveWord, adminDeleteSensitiveWord,
  adminListSensitiveWords, adminBatchAddSensitiveWords,
  type SensitiveWordRow,
} from '@/lib/adminApi';
import { clearSensitiveCache } from '@/lib/sensitiveFilter';
import { A, Btn, Empty } from './shared';

export function SensitiveWordTab() {
  const [words, setWords]           = useState<SensitiveWordRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');

  // 单条添加
  const [input, setInput]           = useState('');
  const [adding, setAdding]         = useState(false);

  // 批量添加
  const [batchText, setBatchText]   = useState('');
  const [batchOpen, setBatchOpen]   = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  // 删除
  const [delId, setDelId]           = useState<string | null>(null);

  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 5000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const data = await adminListSensitiveWords(2000, 0);
    setWords(data);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAdd = async () => {
    const w = input.trim().toLowerCase();
    if (!w) { flash(false, '请输入敏感词'); return; }
    if (w.length > 50) { flash(false, '词汇长度不能超过50字符'); return; }
    setAdding(true);
    const res = await adminAddSensitiveWord(w);
    setAdding(false);
    if (res.ok) {
      flash(true, `✓ 已添加「${w}」`);
      setInput('');
      clearSensitiveCache();
      load();
    } else {
      flash(false, `添加失败：${res.err ?? ''}`);
    }
  };

  const handleBatchAdd = async () => {
    const raw = batchText.trim();
    if (!raw) { flash(false, '请粘贴敏感词内容'); return; }
    const words = raw.split(/[,，\n\s]+/).map(s => s.trim().toLowerCase()).filter(s => s.length > 0 && s.length <= 50);
    if (!words.length) { flash(false, '未识别到有效词汇'); return; }
    setBatchLoading(true);
    const res = await adminBatchAddSensitiveWords(words);
    setBatchLoading(false);
    flash(true, `✓ 批量导入完成：新增 ${res.imported} 个，跳过已存在 ${res.skipped} 个`);
    setBatchText('');
    setBatchOpen(false);
    clearSensitiveCache();
    load();
  };

  const confirmDelete = async () => {
    if (!delId) return;
    const res = await adminDeleteSensitiveWord(delId);
    if (res.ok) {
      flash(true, '✓ 已删除该敏感词');
      setDelId(null);
      clearSensitiveCache();
      load();
    } else {
      flash(false, `删除失败：${res.err ?? ''}`);
      setDelId(null);
    }
  };

  const displayWords = search.trim()
    ? words.filter(w => w.word.includes(search.trim().toLowerCase()))
    : words;

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      {/* 说明 */}
      <Text style={{ color: A.gold, fontSize: 12, fontWeight: '700' }}>🚫 敏感词汇库</Text>
      <Text style={{ color: A.textHint, fontSize: 10, lineHeight: 16 }}>
        管理员可录入敏感词。已启用多套审查机制：①客户端实时检测②提交前二次校验③服务端RPC拦截④数据库触发器兜底。玩家改名/创建存档若触发词汇将被拒绝。
      </Text>

      {msg && (
        <View style={{ backgroundColor: msg.ok ? A.greenBg : A.redBg, borderLeftWidth: 2,
          borderLeftColor: msg.ok ? A.green : A.red, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ color: msg.ok ? '#7FE0A0' : '#FF7070', fontSize: 12 }}>{msg.text}</Text>
        </View>
      )}

      {/* 单条添加 */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          value={input} onChangeText={setInput}
          placeholder="输入敏感词（1-50字符）"
          placeholderTextColor={A.textHint} maxLength={50}
          onSubmitEditing={handleAdd}
          style={{ flex: 1, backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border,
            color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }}
        />
        <Btn label={adding ? '添加中…' : '+ 添加'} onPress={handleAdd} variant="gold" small disabled={adding} />
      </View>

      {/* 批量添加 */}
      <View style={{ borderWidth: 1, borderColor: A.divider, overflow: 'hidden' }}>
        <Pressable cssInterop={false} onPress={() => setBatchOpen(v => !v)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 12, paddingVertical: 8, backgroundColor: A.bgCard }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: A.textPrimary }}>📋 批量粘贴添加敏感词</Text>
          <Text style={{ fontSize: 10, color: A.textHint }}>{batchOpen ? '▲ 收起' : '▼ 展开'}</Text>
        </Pressable>
        {batchOpen && (
          <View style={{ padding: 10, gap: 8, backgroundColor: A.bgMid }}>
            <Text style={{ fontSize: 10, color: A.textHint, lineHeight: 15 }}>
              每行或用逗号/空格分隔一个词，自动转为小写，超50字符的词会被跳过。
            </Text>
            <TextInput
              value={batchText} onChangeText={setBatchText}
              placeholder={'例如：\n反动\n暴力, 涉黄'}
              placeholderTextColor={A.textHint}
              multiline numberOfLines={5}
              style={{ borderWidth: 1, borderColor: A.border, backgroundColor: A.bgInput,
                color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8,
                fontSize: 13, minHeight: 100, textAlignVertical: 'top' }}
            />
            <Pressable cssInterop={false} onPress={handleBatchAdd} disabled={batchLoading}
              style={{ backgroundColor: '#7c3aed', paddingVertical: 8, alignItems: 'center',
                opacity: batchLoading ? 0.6 : 1 }}>
              {batchLoading ? <ActivityIndicator size="small" color="#fff" /> :
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>批量导入</Text>}
            </Pressable>
          </View>
        )}
      </View>

      {/* 搜索 */}
      <TextInput
        value={search} onChangeText={setSearch}
        placeholder="搜索词汇…" placeholderTextColor={A.textHint}
        style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border,
          color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13 }}
      />

      {/* 词汇列表 */}
      {loading ? (
        <ActivityIndicator color={A.gold} size="large" style={{ marginTop: 24 }} />
      ) : words.length === 0 ? (
        <Empty text="暂无敏感词，添加后玩家改名/创档将自动熔断" />
      ) : (
        <>
          <Text style={{ color: A.textHint, fontSize: 10 }}>
            共 {words.length} 个{search.trim() ? `，当前显示 ${displayWords.length} 个` : ''}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {displayWords.map((w) => (
              <Pressable key={w.id} cssInterop={false} onPress={() => setDelId(w.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4,
                  backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.red,
                  paddingHorizontal: 10, paddingVertical: 5 }}>
                <Text style={{ color: A.textPrimary, fontSize: 12, fontWeight: '600' }}>{w.word}</Text>
                <Text style={{ color: A.red, fontSize: 12 }}>✕</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {/* 删除确认 */}
      <Modal visible={!!delId} transparent animationType="fade" onRequestClose={() => setDelId(null)}>
        <Pressable cssInterop={false} onPress={() => setDelId(null)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 }}>
          <Pressable cssInterop={false} onPress={() => {}}
            style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.red, padding: 18, gap: 12 }}>
            <Text style={{ color: '#FF7070', fontSize: 14, fontWeight: '700' }}>🗑 删除敏感词</Text>
            <Text style={{ color: A.textSecond, fontSize: 12 }}>确定要删除该敏感词吗？删除后玩家改名将不再受其约束。</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Btn label="取消" onPress={() => setDelId(null)} variant="ghost" small style={{ flex: 1 }} />
              <Btn label="确认删除" onPress={confirmDelete} variant="red" small style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
```

<a id="srccomponentsadminstatstabtsx"></a>
## `src/components/admin/StatsTab.tsx`

```tsx
// 数据统计 Tab：三张核心卡片 + 14天趋势 + 活跃TOP20 + 职级分布 + 当前在线
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { A, Card, Empty } from './shared';
import {
  adminOnlinePlayers, adminRankDistribution, adminRegistrationTrend, adminStatsOverview, adminTopActive,
  type AdminStats, type OnlinePlayer, type RankBucket, type TopPlayer, type TrendPoint,
} from '@/lib/adminApi';

export function StatsTab({ role: _role }: { role: string }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [top, setTop] = useState<TopPlayer[]>([]);
  const [ranks, setRanks] = useState<RankBucket[]>([]);
  const [online, setOnline] = useState<OnlinePlayer[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [s, t, tp, r, o] = await Promise.all([
      adminStatsOverview(), adminRegistrationTrend(14), adminTopActive(20), adminRankDistribution(), adminOnlinePlayers(5),
    ]);
    setStats(s); setTrend(t); setTop(tp); setRanks(r); setOnline(o);
    setLoading(false);
  }, []);

  // 60 秒自动刷新核心卡片（+在线）
  useEffect(() => {
    load();
    const id = setInterval(async () => {
      const [s, o] = await Promise.all([adminStatsOverview(), adminOnlinePlayers(5)]);
      setStats(s); setOnline(o);
    }, 60000);
    return () => clearInterval(id);
  }, [load]);

  if (loading) return <ActivityIndicator size="large" color={A.gold} style={{ padding: 40 }} />;

  const maxTrend = Math.max(1, ...trend.map((t) => t.cnt));
  const maxRank = Math.max(1, ...ranks.map((r) => r.cnt));

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false}>
      {/* 三张核心卡片 */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <StatCard label="总注册" value={stats?.total_users ?? 0} suffix="人" accent={A.gold} />
        <StatCard label="今日新增" value={stats?.today_new ?? 0} prefix="+" suffix="人" accent={A.green} />
        <StatCard label="今日活跃" value={stats?.today_active ?? 0} suffix="人" accent={A.goldLight} />
      </View>

      {/* 14天注册趋势 */}
      <Card title="近 14 天注册趋势" accent={A.blue}>
        {trend.length === 0 ? <Empty /> : (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 3 }}>
            {trend.map((t, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                <View style={{ width: '100%', height: Math.max(2, (t.cnt / maxTrend) * 60), backgroundColor: t.cnt > 0 ? A.blue : A.divider }} />
                <Text style={{ fontSize: 7, color: A.textHint }}>{String(t.d).slice(5)}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* 活跃 TOP20 */}
      <Card title="活跃玩家 TOP20" accent={A.gold}>
        {top.length === 0 ? <Empty text="暂无活跃玩家" /> : top.map((p, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: A.divider }}>
            <Text style={{ color: i < 3 ? A.gold : A.textHint, fontSize: 12, fontWeight: '700', width: 20 }}>{i + 1}</Text>
            <Text style={{ color: A.textPrimary, fontSize: 13, flex: 1 }}>{p.player_name || '匿名'}</Text>
            <Text style={{ color: A.textSecond, fontSize: 11 }}>L{p.rank_level} {p.rank_name}</Text>
            <Text style={{ color: A.goldLight, fontSize: 12, fontWeight: '600' }}>{p.merit_points}</Text>
          </View>
        ))}
      </Card>

      {/* 职级分布 */}
      <Card title="职级分布" accent={A.green}>
        {ranks.length === 0 ? <Empty text="暂无存档" /> : ranks.map((r) => (
          <View key={r.rank_level} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
            <Text style={{ color: A.textSecond, fontSize: 11, width: 28 }}>L{r.rank_level}</Text>
            <View style={{ flex: 1, height: 10, backgroundColor: A.divider }}>
              <View style={{ height: 10, width: `${Math.max(3, (r.cnt / maxRank) * 100)}%`, backgroundColor: A.green }} />
            </View>
            <Text style={{ color: A.textPrimary, fontSize: 11, width: 40, textAlign: 'right' }}>{r.cnt}</Text>
          </View>
        ))}
      </Card>

      {/* 当前在线 */}
      <Card title={`🟢 当前在线 · ${online.length} 人`} accent={A.green}>
        {online.length === 0 ? <Empty text="近 5 分钟无活跃" /> : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {online.map((p, i) => (
              <View key={i} style={{ backgroundColor: A.greenBg, borderWidth: 1, borderColor: A.green, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ color: A.textPrimary, fontSize: 11 }}>{p.player_name || '匿名'} (L{p.rank_level})</Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

function StatCard({ label, value, suffix, prefix, accent }: { label: string; value: number; suffix?: string; prefix?: string; accent: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: A.bgMid, borderWidth: 1, borderColor: A.divider, borderTopWidth: 2, borderTopColor: accent, padding: 12, gap: 4 }}>
      <Text style={{ color: accent, fontSize: 10, letterSpacing: 1 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>{prefix}{value.toLocaleString()}</Text>
        <Text style={{ color: A.textSecond, fontSize: 10 }}>{suffix}</Text>
      </View>
    </View>
  );
}
```

<a id="srccomponentsadmintempappealstabtsx"></a>
## `src/components/admin/TempAppealsTab.tsx`

```tsx
// 临时申诉 Tab：玩家提交的临时申诉（后台显示有存档但玩家端看不到存档）
// 管理员可同意或拒绝，拒绝须填写理由
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  adminListTempAppeals, adminReviewTempAppeal, adminApproveAllTempAppeals,
  type TempAppealRow,
} from '@/lib/adminApi';
import { A, Badge, Btn, Empty } from './shared';

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending:  { label: '待处理', color: A.gold },
  approved: { label: '已同意', color: A.green },
  rejected: { label: '已拒绝', color: A.red },
};
type Filter = 'pending' | 'approved' | 'rejected' | 'all';

function shortId(v: string | null): string {
  if (!v) return '—';
  return v.length > 12 ? `${v.slice(0, 8)}…${v.slice(-4)}` : v;
}

export function TempAppealsTab({ role }: { role: string }) {
  const canReview = role === 'admin' || role === 'super_admin';
  const [records, setRecords] = useState<TempAppealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('pending');
  const [page, setPage] = useState(0);
  const PAGE = 30;
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [detail, setDetail] = useState<TempAppealRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [confirmMode, setConfirmMode] = useState<'approve' | 'reject' | null>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const load = useCallback(async (p = 0, f: Filter = filter) => {
    setLoading(true);
    const data = await adminListTempAppeals(f === 'all' ? undefined : f, PAGE, p * PAGE);
    setRecords(data);
    setLoading(false);
  }, [filter]);

  useFocusEffect(useCallback(() => { load(0); setPage(0); }, [load]));

  const pendingCount = records.filter((r) => r.status === 'pending').length;

  const doBatchApprove = async () => {
    setShowBatchConfirm(false);
    setBatchProcessing(true);
    const res = await adminApproveAllTempAppeals();
    setBatchProcessing(false);
    if (res.ok) {
      flash(true, `已一键同意 ${res.count ?? 0} 条临时申诉`);
      setFilter('pending');
      setPage(0);
      load(0, 'pending');
    } else {
      flash(false, res.err ?? '操作失败');
    }
  };

  const openDetail = (r: TempAppealRow) => {
    setDetail(r);
    setRejectReason('');
    setConfirmMode(null);
  };

  const doReview = async () => {
    if (!detail || !confirmMode) return;
    if (confirmMode === 'reject' && rejectReason.trim().length < 2) {
      flash(false, '请填写拒绝理由（不少于 2 字）');
      return;
    }
    setProcessing(true);
    const res = await adminReviewTempAppeal(detail.id, confirmMode === 'approve', rejectReason.trim() || undefined);
    setProcessing(false);
    if (res.ok) {
      flash(true, confirmMode === 'approve' ? '已同意该临时申诉' : '已拒绝该临时申诉');
      setDetail(null);
      setConfirmMode(null);
      load(page, filter);
    } else {
      flash(false, res.err ?? '操作失败');
    }
  };

  const filters: Filter[] = ['pending', 'approved', 'rejected', 'all'];

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false}>
      <Text style={{ color: A.textSecond, fontSize: 11, letterSpacing: 0.5 }}>
        当后台显示账号已有存档、但玩家端看不到存档时，玩家可在档案审核页提交临时申诉。管理员可同意或拒绝，拒绝须填写理由。
      </Text>

      {msg ? (
        <View style={{ backgroundColor: msg.ok ? A.greenBg : A.redBg, borderLeftWidth: 2, borderLeftColor: msg.ok ? A.green : A.red, paddingHorizontal: 10, paddingVertical: 7 }}>
          <Text style={{ color: msg.ok ? '#7FE0A0' : '#FF7070', fontSize: 12 }}>{msg.text}</Text>
        </View>
      ) : null}

      {canReview && (filter === 'pending' || filter === 'all') && pendingCount > 0 ? (
        <View style={{ gap: 6 }}>
          <Btn
            label={batchProcessing ? '处理中...' : '✅ 一键同意当前所有临时申诉'}
            variant="green"
            small
            disabled={batchProcessing}
            onPress={() => setShowBatchConfirm(true)}
          />
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 6 }}>
        {filters.map((f) => (
          <Pressable key={f} onPress={() => { setFilter(f); setPage(0); load(0, f); }}
            style={{ flex: 1, paddingVertical: 7, alignItems: 'center', borderWidth: 1, borderColor: filter === f ? A.gold : A.divider, backgroundColor: filter === f ? A.goldBg : 'transparent' }}>
            <Text style={{ color: filter === f ? A.goldLight : A.textSecond, fontSize: 11, fontWeight: filter === f ? '700' : '400' }}>
              {f === 'all' ? '全部' : STATUS_META[f]?.label ?? f}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={A.gold} style={{ marginTop: 24 }} />
      ) : records.length === 0 ? (
        <Empty text="暂无临时申诉记录" />
      ) : (
        <View style={{ gap: 8 }}>
          {records.map((r) => {
            const meta = STATUS_META[r.status] ?? { label: r.status, color: A.textSecond };
            return (
              <Pressable key={r.id} onPress={() => openDetail(r)} cssInterop={false}
                style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, padding: 12, gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: A.textPrimary, fontSize: 13, fontWeight: '700' }}>{r.email}</Text>
                  <Badge text={meta.label} color={meta.color} />
                </View>
                <Text style={{ color: A.textSecond, fontSize: 11 }} numberOfLines={2}>{r.reason}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Text style={{ color: (r.same_fp_count) > 0 ? '#FF7070' : A.textHint, fontSize: 10 }}>
                    同设备 {r.same_fp_count}
                  </Text>
                  {r.admin_exempt ? <Text style={{ color: '#7FE0A0', fontSize: 10 }}>🛡管理员豁免</Text> : null}
                </View>
                <Text style={{ color: A.textHint, fontSize: 10 }}>{new Date(r.created_at).toLocaleString('zh-CN')}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {records.length > 0 ? (
        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 4 }}>
          <Btn label="上一页" variant="ghost" small disabled={page === 0} onPress={() => { const p = Math.max(0, page - 1); setPage(p); load(p, filter); }} />
          <Text style={{ color: A.textHint, fontSize: 11, alignSelf: 'center' }}>第 {page + 1} 页</Text>
          <Btn label="下一页" variant="ghost" small disabled={records.length < PAGE} onPress={() => { const p = page + 1; setPage(p); load(p, filter); }} />
        </View>
      ) : null}

      {/* 详情/审核弹窗 */}
      <Modal visible={!!detail} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', paddingHorizontal: 20 }} onPress={() => setDetail(null)}>
          <Pressable style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.gold, padding: 16, gap: 10 }} onPress={() => {}}>
            <Text style={{ color: A.goldLight, fontSize: 14, fontWeight: '700' }}>临时申诉详情</Text>
            <View style={{ gap: 4 }}>
              <Text style={{ color: A.textSecond, fontSize: 11 }}>账号：{detail?.email}</Text>
              <Text style={{ color: A.textSecond, fontSize: 11 }}>
                状态：{detail ? (STATUS_META[detail.status]?.label ?? detail.status) : ''}
              </Text>
              <Text style={{ color: A.textSecond, fontSize: 11 }}>提交时间：{detail ? new Date(detail.created_at).toLocaleString('zh-CN') : ''}</Text>
            </View>
            <View style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, padding: 10 }}>
              <Text style={{ color: A.textPrimary, fontSize: 12, lineHeight: 18 }}>{detail?.reason}</Text>
            </View>

            {/* 风控信息 */}
            <View style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.divider, padding: 10, gap: 4 }}>
              <Text style={{ color: A.goldLight, fontSize: 11, fontWeight: '700' }}>系统风控信息</Text>
              <Text style={{ color: A.textSecond, fontSize: 11, lineHeight: 18 }}>
                账号创建时间：{detail?.account_created_at ? new Date(detail.account_created_at).toLocaleString('zh-CN') : '未知'}
              </Text>
              <Text style={{ color: (detail?.same_fp_count ?? 0) > 0 ? '#FF7070' : A.textSecond, fontSize: 11, lineHeight: 18 }}>
                同设备其他账号：{detail?.same_fp_count ?? 0} 个{((detail?.same_fp_count ?? 0) > 0) ? '（疑似多开）' : ''}
              </Text>
              <Text style={{ color: A.textHint, fontSize: 10, lineHeight: 16 }}>设备指纹：{shortId(detail?.device_fingerprint ?? null)}</Text>
              {detail?.admin_exempt ? (
                <Text style={{ color: '#7FE0A0', fontSize: 11, fontWeight: '700' }}>🛡 管理员账号，已自动豁免多开审查</Text>
              ) : null}
            </View>

            {detail?.status === 'pending' ? (
              <>
                {confirmMode === 'reject' ? (
                  <>
                    <Text style={{ color: A.red, fontSize: 11, fontWeight: '700' }}>拒绝理由（必填）</Text>
                    <TextInput
                      style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, paddingHorizontal: 10, paddingVertical: 8, color: A.textPrimary, fontSize: 12 }}
                      placeholder="请填写拒绝理由"
                      placeholderTextColor={A.textHint}
                      value={rejectReason}
                      onChangeText={setRejectReason}
                      multiline
                    />
                  </>
                ) : null}

                {confirmMode === null ? (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <Btn label="同意" variant="green" onPress={() => setConfirmMode('approve')} style={{ flex: 1 }} />
                    <Btn label="拒绝" variant="red" onPress={() => setConfirmMode('reject')} style={{ flex: 1 }} />
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <Btn label="取消" variant="ghost" onPress={() => { setConfirmMode(null); setRejectReason(''); }} style={{ flex: 1 }} />
                    <Btn label={processing ? '处理中...' : (confirmMode === 'approve' ? '确认同意' : '确认拒绝')} variant={confirmMode === 'approve' ? 'green' : 'red'} disabled={processing} onPress={doReview} style={{ flex: 1 }} />
                  </View>
                )}
              </>
            ) : (
              <>
                {detail?.status === 'rejected' && detail.reject_reason ? (
                  <View style={{ backgroundColor: A.redBg, borderLeftWidth: 2, borderLeftColor: A.red, paddingHorizontal: 10, paddingVertical: 7 }}>
                    <Text style={{ color: '#FF7070', fontSize: 11, fontWeight: '700' }}>拒绝理由</Text>
                    <Text style={{ color: '#FF7070', fontSize: 12, lineHeight: 18 }}>{detail.reject_reason}</Text>
                  </View>
                ) : null}
                <Text style={{ color: A.textHint, fontSize: 11 }}>该申诉已处理</Text>
              </>
            )}
            <Btn label="关闭" variant="ghost" small onPress={() => { setDetail(null); setConfirmMode(null); }} />
          </Pressable>
        </Pressable>
      </Modal>

      {/* 一键同意确认弹窗 */}
      <Modal visible={showBatchConfirm} transparent animationType="fade" onRequestClose={() => setShowBatchConfirm(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', paddingHorizontal: 20 }} onPress={() => setShowBatchConfirm(false)}>
          <Pressable style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.green, padding: 16, gap: 10 }} onPress={() => {}}>
            <Text style={{ color: '#7FE0A0', fontSize: 14, fontWeight: '700' }}>一键同意确认</Text>
            <Text style={{ color: A.textSecond, fontSize: 12, lineHeight: 18 }}>
              将同意当前所有待处理的临时申诉（共 {pendingCount} 条），并删除对应玩家的旧存档。此操作不可撤销，确定继续吗？
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Btn label="取消" variant="ghost" onPress={() => setShowBatchConfirm(false)} style={{ flex: 1 }} />
              <Btn label={batchProcessing ? '处理中...' : '确认同意'} variant="green" disabled={batchProcessing} onPress={doBatchApprove} style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
```

<a id="srccomponentsadmintestcodestatstabtsx"></a>
## `src/components/admin/TestCodeStatsTab.tsx`

```tsx
// 测试码生成统计（仅超级管理员可见）
// 顶部：生成总量（未用/已用）；下方：各管理员生成明细（最多20个账号）
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { adminTestCodeGenStats, type TestCodeGenStats } from '@/lib/adminApi';
import { A, Empty } from './shared';

export function TestCodeStatsTab() {
  const [stats, setStats] = useState<TestCodeGenStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await adminTestCodeGenStats();
    setStats(data);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      <Text style={{ color: A.gold, fontSize: 12, fontWeight: '700' }}>🎫 测试码生成统计</Text>

      {loading ? (
        <ActivityIndicator color={A.gold} size="large" style={{ marginTop: 24 }} />
      ) : (
        <>
          {/* 总量面板 */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { l: '生成总量', v: stats?.total ?? 0, c: A.gold },
              { l: '未使用', v: stats?.unused ?? 0, c: A.green },
              { l: '已使用', v: stats?.used ?? 0, c: A.blue },
            ].map((s) => (
              <View key={s.l} style={{ flex: 1, backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, borderTopWidth: 2, borderTopColor: s.c, padding: 12, alignItems: 'center' }}>
                <Text style={{ color: s.c, fontSize: 20, fontWeight: '700' }}>{s.v}</Text>
                <Text style={{ color: A.textSecond, fontSize: 10, marginTop: 2 }}>{s.l}</Text>
              </View>
            ))}
          </View>

          {/* 各管理员明细 */}
          <Text style={{ color: A.textSecond, fontSize: 11, marginTop: 4 }}>管理员生成明细（最多20个账号）</Text>
          {(!stats || stats.admins.length === 0) ? (
            <Empty text="暂无生成记录" />
          ) : (
            stats.admins.map((a, idx) => (
              <View key={a.admin_id} style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, padding: 12, gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: A.gold, fontSize: 12, fontWeight: '700' }}>#{idx + 1}</Text>
                    <Text style={{ color: A.textPrimary, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>{a.admin_email}</Text>
                  </View>
                  <Text style={{ color: A.goldLight, fontSize: 14, fontWeight: '700' }}>{a.gen_count}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Text style={{ color: A.green, fontSize: 11 }}>未用 {a.gen_unused}</Text>
                  <Text style={{ color: A.blue, fontSize: 11 }}>已用 {a.gen_used}</Text>
                </View>
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}
```

<a id="srccomponentsadmintestcodetabtsx"></a>
## `src/components/admin/TestCodeTab.tsx`

```tsx
// 测试码管理 Tab（admin+）：生成、批次筛选、使用者显示、过期置灰、批量禁用、CSV、分页
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { A, Badge, Btn, Card, Empty } from './shared';
import { supabase } from '@/client/supabase';
import {
  adminDeleteTestCodeBatch, adminGenerateTestCodes, adminListTestCodeBatches, adminListTestCodes,
  adminListTestCodeGroups, adminClearUnusedTestCodes, adminRenameTestCodeGroup, adminDeleteTestCodeGroup,
  adminLogBatchCopy, adminRenameTestCodeBatch, adminTestCodeStats,
  adminUpsertSchedule, adminListScheduleRequests, adminApproveSchedule, adminRejectSchedule,
  type ScheduleRequest, type TestCodeBatch, type TestCodeGroup, type TestCodeRow, type TestCodeStats,
} from '@/lib/adminApi';

const STATUS_LABEL: Record<string, string> = {
  unused: '未用', used: '已用', disabled: '已禁用', available: '可用', expired: '已过期',
};
const SCH_STATUS_LABEL: Record<string, string> = {
  active: '生效中', pending: '待审批', rejected: '已驳回', superseded: '已替换',
};
const SCH_STATUS_COLOR: Record<string, string> = {
  active: '#4CAF50', pending: '#C8A84B', rejected: '#C82829', superseded: '#5A5040',
};

const PAGE_SIZE = 50;

export function TestCodeTab({ role }: { role: string }) {
  const isSuperAdmin = role === 'super_admin';
  const [codes, setCodes] = useState<TestCodeRow[]>([]);
  const [batches, setBatches] = useState<TestCodeBatch[]>([]);
  const [groups, setGroups] = useState<TestCodeGroup[]>([]);
  const [stats, setStats] = useState<TestCodeStats>({ unused: 0, used: 0, disabled: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [batchFilter, setBatchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // 分页
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // 生成弹窗
  const [genOpen, setGenOpen] = useState(false);
  const [genBatch, setGenBatch] = useState('');
  const [genCount, setGenCount] = useState('10');
  const [genNote, setGenNote] = useState('');
  const [genGroup, setGenGroup] = useState('');
  const [genMinutes, setGenMinutes] = useState(10);
  const [genSaving, setGenSaving] = useState(false);
  const [genResult, setGenResult] = useState<{ codes: string[]; batchName: string; note: string } | null>(null);
  const [genCopyFormat, setGenCopyFormat] = useState<'plain' | 'withNote'>('plain');

  // 多选
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // 批次删除 / 重命名
  const [delBatch, setDelBatch] = useState<string | null>(null);
  const [renameBatch, setRenameBatch] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [clearUnusedOpen, setClearUnusedOpen] = useState(false);
  const [renameGroup, setRenameGroup] = useState<string | null>(null);
  const [groupRenameValue, setGroupRenameValue] = useState('');
  const [delGroup, setDelGroup] = useState<string | null>(null);

  // 时间窗口 tab
  const [tab, setTab] = useState<'codes' | 'schedule'>('codes');
  const [schOpen, setSchOpen] = useState('09:00');
  const [schClose, setSchClose] = useState('23:00');
  const [schEnabled, setSchEnabled] = useState(true);
  const [schNote, setSchNote] = useState('');
  const [schSaving, setSchSaving] = useState(false);
  const [schRequests, setSchRequests] = useState<ScheduleRequest[]>([]);
  const [schLoading, setSchLoading] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // 批次详情 Modal
  const [batchDetail, setBatchDetail] = useState<{
    batch: TestCodeBatch;
    codes: TestCodeRow[];
    page: number;
    total: number;
    loading: boolean;
  } | null>(null);

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const hiddenIds = useRef<Set<string>>(new Set());
  const hideTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // load 不依赖 page 闭包，targetPage 参数显式传入，避免每次翻页都重建 load 引用
  const load = useCallback(async (targetPage: number) => {
    const offset = targetPage * PAGE_SIZE;
    const [list, b, s, g] = await Promise.all([
      adminListTestCodes(batchFilter, statusFilter, PAGE_SIZE, offset, groupFilter),
      adminListTestCodeBatches(),
      adminTestCodeStats(),
      adminListTestCodeGroups(),
    ]);
    setGroups(g);
    list.forEach((c) => {
      const isExpired = c.expires_at ? new Date(c.expires_at) < new Date() : false;
      const displayStatus = isExpired && c.status === 'unused' ? 'expired' : c.status;
      if ((displayStatus === 'used' || displayStatus === 'expired') && !hiddenIds.current.has(c.id) && !hideTimers.current.has(c.id)) {
        const t = setTimeout(() => {
          hiddenIds.current.add(c.id); hideTimers.current.delete(c.id);
          setCodes((prev) => prev.filter((x) => x.id !== c.id));
        }, 60000);
        hideTimers.current.set(c.id, t);
      }
    });
    // 精准分页总数：按当前批次+状态过滤组合计算
    const bd = batchFilter !== 'all' ? b.find((bb) => bb.batch_name === batchFilter) : null;
    const batchTotal = batchFilter === 'all'
      ? (statusFilter === 'unused' ? s.unused : statusFilter === 'used' ? s.used : statusFilter === 'disabled' ? s.disabled : s.total)
      : (!bd ? 0 : statusFilter === 'unused' ? bd.available : statusFilter === 'used' ? bd.used : statusFilter === 'disabled' ? bd.disabled : bd.total);
    setTotalCount(batchTotal);
    setCodes(list.filter((c) => !hiddenIds.current.has(c.id)));
    setBatches(b);
    setStats(s);
    setLoading(false);
  }, [batchFilter, statusFilter, groupFilter]);

  const loadSchedule = useCallback(async () => {
    setSchLoading(true);
    const reqs = await adminListScheduleRequests();
    setSchRequests(reqs);
    // 预填当前生效的时间窗口
    const active = reqs.find((r) => r.status === 'active');
    if (active) { setSchOpen(active.open_time); setSchClose(active.close_time); setSchEnabled(active.enabled); setSchNote(active.note ?? ''); }
    setSchLoading(false);
  }, []);

  const clearUsedExpired = () => {
    const now = new Date();
    let cnt = 0;
    setCodes((prev) =>
      prev.filter((c) => {
        const isExpired = c.expires_at ? new Date(c.expires_at) < now : false;
        const displayStatus = isExpired && c.status === 'unused' ? 'expired' : c.status;
        if (displayStatus === 'used' || displayStatus === 'expired') {
          hiddenIds.current.add(c.id);
          if (hideTimers.current.has(c.id)) { clearTimeout(hideTimers.current.get(c.id)!); hideTimers.current.delete(c.id); }
          cnt += 1; return false;
        }
        return true;
      }),
    );
    setMsg({ ok: true, text: cnt > 0 ? `✓ 已立即清除 ${cnt} 个已用/已过期码` : '当前无已用/已过期码可清除' });
  };

  useEffect(() => {
    setPage(0);
    load(0);
    timer.current = setInterval(() => load(0), 45000);
    return () => {
      if (timer.current) clearInterval(timer.current);
      hideTimers.current.forEach((t) => clearTimeout(t));
      hideTimers.current.clear();
    };
  }, [load]);

  useEffect(() => { if (tab === 'schedule') loadSchedule(); }, [tab, loadSchedule]);

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 5000);
  };

  const copyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    flash(true, `✓ 已复制：${code}`);
  };

  const goPage = (p: number) => { setPage(p); load(p); };

  const openGen = () => { setGenOpen(true); setGenBatch(''); setGenCount('10'); setGenNote(''); setGenGroup(''); setGenMinutes(10); setGenResult(null); };

  const submitGen = async () => {
    const count = parseInt(genCount, 10);
    if (!genBatch.trim()) { flash(false, '请选择或输入批次名'); return; }
    if (isNaN(count) || count < 1) { flash(false, '请输入有效数量'); return; }
    if (count > 5000) { flash(false, '单次最多生成 5000 个'); return; }
    setGenSaving(true);
    const expiresAt = new Date(Date.now() + genMinutes * 60000).toISOString();
    const codes = await adminGenerateTestCodes(genBatch.trim(), count, expiresAt, genNote.trim() || undefined, genGroup.trim() || undefined);
    setGenSaving(false);
    if (codes.length > 0) {
      setGenResult({ codes, batchName: genBatch.trim(), note: genNote.trim() });
      flash(true, `✓ 已生成 ${codes.length} 个测试码`);
      load(0);
    } else {
      flash(false, '生成失败：返回为空，请重试');
    }
  };

  // 生成结果一键复制：支持纯码 / 带批次备注两种格式
  const copyGenResult = async () => {
    if (!genResult) return;
    const text = genCopyFormat === 'withNote'
      ? genResult.codes.map((c) => `${c}\t${genResult.batchName}${genResult.note ? `\t${genResult.note}` : ''}`).join('\n')
      : genResult.codes.join('\n');
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
    } catch { /* ignore */ }
    await adminLogBatchCopy(genResult.batchName, genResult.codes.length).catch(() => {});
    flash(true, `✓ 已复制 ${genResult.codes.length} 个测试码（${genCopyFormat === 'plain' ? '纯码' : '带批次备注'}）`);
  };

  // 单条复制：复制生成结果中的单个测试码
  const copySingleCode = async (code: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(code);
      }
    } catch { /* ignore */ }
    flash(true, `✓ 已复制测试码 ${code}`);
  };

  const copyAllAndDoc = async () => {
    const batchName = batchFilter === 'all' ? '全部批次' : batchFilter;
    const lines = codes.map((c) => `${c.code}\t${c.batch_name}\t${STATUS_LABEL[c.status] ?? c.status}\t${c.used_by_email ?? ''}\t${c.note ?? ''}\t${c.created_at}`);
    const text = [`测试码\t批次\t状态\t使用者\t备注\t创建时间`, ...lines].join('\n');
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
    } catch { /* ignore clipboard error */ }
    // 记录复制日志
    if (batchFilter !== 'all') {
      await adminLogBatchCopy(batchFilter, codes.length).catch(() => {});
    }
    // 生成 xlsx
    try {
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.aoa_to_sheet([
        ['测试码', '批次', '状态', '使用者邮箱', '备注', '创建时间'],
        ...codes.map((c) => [c.code, c.batch_name, STATUS_LABEL[c.status] ?? c.status, c.used_by_email ?? '', c.note ?? '', c.created_at]),
      ]);
      ws['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 8 }, { wch: 26 }, { wch: 20 }, { wch: 22 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '测试码');
      if (process.env.EXPO_OS === 'web') {
        XLSX.writeFile(wb, `测试码_${batchName}.xlsx`);
      } else {
        const { default: FileSystem } = await import('expo-file-system/legacy');
        const { default: Sharing } = await import('expo-sharing');
        const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        const path = `${FileSystem.cacheDirectory}test_codes_${Date.now()}.xlsx`;
        await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
        await Sharing.shareAsync(path, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      }
      flash(true, `✓ 已复制并导出 ${codes.length} 个测试码（xlsx）`);
    } catch (e) {
      flash(false, `导出失败：${e instanceof Error ? e.message : String(e)}`);
    }
    load(page);
  };

  const copyBatchCodes = async (batchName: string) => {
    const all = await adminListTestCodes(batchName, 'all', 1000, 0);
    const text = all.map((c) => c.code).join('\n');
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
    } catch { /* ignore */ }
    if (all.length > 0) await adminLogBatchCopy(batchName, all.length).catch(() => {});
    flash(true, `✓ 已复制批次「${batchName}」全部 ${all.length} 个测试码`);
    load(page);
  };

  // 一键复制某编组下所有未使用的测试码
  const copyGroupUnusedCodes = async (groupName: string) => {
    const filterGroup = groupName === '未分组' ? '' : groupName;
    const unused = await adminListTestCodes(filterGroup, 'unused', 5000, 0);
    const valid = unused.filter((c) => {
      const isExpired = c.expires_at ? new Date(c.expires_at) < new Date() : false;
      return !isExpired;
    });
    const text = valid.map((c) => c.code).join('\n');
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
    } catch { /* ignore */ }
    if (valid.length > 0) await adminLogBatchCopy(groupName, valid.length).catch(() => {});
    flash(valid.length > 0 ? true : false, valid.length > 0
      ? `✓ 已复制编组「${groupName}」${valid.length} 个未用测试码`
      : `编组「${groupName}」暂无未用测试码`);
    load(page);
  };

  const DETAIL_PAGE = 30;

  const openBatchDetail = async (batch: TestCodeBatch) => {
    setBatchDetail({ batch, codes: [], page: 0, total: batch.total, loading: true });
    const list = await adminListTestCodes(batch.batch_name, 'all', DETAIL_PAGE, 0);
    setBatchDetail((prev) => prev ? { ...prev, codes: list, loading: false } : null);
  };

  const loadDetailPage = async (p: number) => {
    if (!batchDetail) return;
    setBatchDetail((prev) => prev ? { ...prev, loading: true } : null);
    const list = await adminListTestCodes(batchDetail.batch.batch_name, 'all', DETAIL_PAGE, p * DETAIL_PAGE);
    setBatchDetail((prev) => prev ? { ...prev, codes: list, page: p, loading: false } : null);
  };

  const copyDetailAll = async () => {
    if (!batchDetail) return;
    const all = await adminListTestCodes(batchDetail.batch.batch_name, 'all', 5000, 0);
    const text = all.map((c) => c.code).join('\n');
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) await navigator.clipboard.writeText(text);
    } catch { /* ignore */ }
    if (all.length > 0) await adminLogBatchCopy(batchDetail.batch.batch_name, all.length).catch(() => {});
    flash(true, `✓ 已复制批次「${batchDetail.batch.batch_name}」全部 ${all.length} 个码`);
  };

  const toggleSelect = (id: string) => setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const batchDisable = async () => {
    if (selected.size === 0) return;
    const ids = [...selected];
    const { error } = await supabase.rpc('admin_disable_test_codes', { p_ids: ids });
    if (!error) { flash(true, `✓ 已禁用 ${ids.length} 个测试码`); setSelectMode(false); setSelected(new Set()); load(page); }
    else flash(false, '批量禁用失败');
  };

  const confirmDeleteBatch = async () => {
    if (!delBatch) return;
    const res = await adminDeleteTestCodeBatch(delBatch);
    if (res.ok) { flash(true, `✓ 已删除批次「${delBatch}」（${res.count ?? 0} 个码）`); if (batchFilter === delBatch) setBatchFilter('all'); setDelBatch(null); load(0); }
    else { flash(false, '删除失败'); setDelBatch(null); }
  };

  const confirmClearUnused = async () => {
    const count = await adminClearUnusedTestCodes();
    setClearUnusedOpen(false);
    if (count >= 0) { flash(true, `✓ 已清除 ${count} 个未使用的测试码`); load(0); }
    else { flash(false, '清除失败'); }
  };

  const confirmRenameGroup = async () => {
    if (!renameGroup || !groupRenameValue.trim()) { flash(false, '请输入新编组名'); return; }
    const res = await adminRenameTestCodeGroup(renameGroup, groupRenameValue.trim());
    if (res.ok) {
      flash(true, `✓ 编组「${renameGroup}」已改名为「${groupRenameValue.trim()}」（更新 ${res.updated} 个码）`);
      if (groupFilter === renameGroup) setGroupFilter(groupRenameValue.trim());
      setRenameGroup(null);
      load(0);
    } else {
      flash(false, `改名失败：${res.err ?? ''}`);
    }
  };

  const confirmDeleteGroup = async () => {
    if (!delGroup) return;
    const res = await adminDeleteTestCodeGroup(delGroup);
    if (res.ok) {
      flash(true, `✓ 已删除编组「${delGroup}」的未使用测试码（${res.deleted} 个），已用码已保留`);
      if (groupFilter === delGroup) setGroupFilter('all');
      setDelGroup(null);
      load(0);
    } else {
      flash(false, `删除失败：${res.err ?? ''}`);
    }
  };

  const confirmRenameBatch = async () => {
    if (!renameBatch || !renameValue.trim()) return;
    const res = await adminRenameTestCodeBatch(renameBatch, renameValue.trim());
    if (res.ok) {
      flash(true, `✓ 批次已改名为「${renameValue.trim()}」（${res.count ?? 0} 个码）`);
      if (batchFilter === renameBatch) setBatchFilter(renameValue.trim());
      setRenameBatch(null); setRenameValue(''); load(page);
    } else {
      flash(false, res.err?.includes('duplicate') ? '批次名已存在' : '改名失败');
    }
  };

  const submitSchedule = async () => {
    if (!schOpen.match(/^\d{2}:\d{2}$/) || !schClose.match(/^\d{2}:\d{2}$/)) { flash(false, '时间格式错误，请用 HH:MM'); return; }
    setSchSaving(true);
    const res = await adminUpsertSchedule(schOpen, schClose, schEnabled, schNote.trim() || undefined);
    setSchSaving(false);
    if (res.ok) {
      const label = res.status === 'active' ? '已直接生效' : '申请已提交，等待超管审批';
      flash(true, `✓ 时间窗口设置成功（${label}）`);
      loadSchedule();
    } else { flash(false, `设置失败：${res.err ?? ''}`); }
  };

  const handleApproveSchedule = async (id: string) => {
    const res = await adminApproveSchedule(id);
    if (res.ok) { flash(true, '✓ 已审批通过'); loadSchedule(); }
    else flash(false, `审批失败：${res.err ?? ''}`);
  };

  const handleRejectSchedule = async () => {
    if (!rejectId) return;
    const res = await adminRejectSchedule(rejectId, rejectReason.trim() || undefined);
    if (res.ok) { flash(true, '✓ 已驳回'); setRejectId(null); setRejectReason(''); loadSchedule(); }
    else flash(false, `驳回失败：${res.err ?? ''}`);
  };

  const exportCSV = () => {
    const header = 'code,batch_name,status,used_by_email,note,created_at';
    const rows = codes.map((c) => [c.code, c.batch_name, c.status, c.used_by_email ?? '', c.note ?? '', c.created_at].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [header, ...rows].join('\n');
    try {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'test_codes.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch { flash(false, '导出失败（Web 环境）'); }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const statusColors: Record<string, string> = { unused: A.green, used: A.blue, available: A.green, disabled: A.textHint, expired: A.textHint };

  // ──────── 时间窗口 Tab ────────
  const activeSchedule = schRequests.find((r) => r.status === 'active');
  const pendingRequests = schRequests.filter((r) => r.status === 'pending');

  return (
    <>
    {/* ── Tab 切换 ── */}
    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: A.divider, backgroundColor: A.bgMid }}>
      {([['codes', '🎫 测试码'], ['schedule', '⏰ 申请时间窗口']] as const).map(([key, label]) => (
        <Pressable key={key} onPress={() => setTab(key)} style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: tab === key ? A.gold : 'transparent' }}>
          <Text style={{ color: tab === key ? A.goldLight : A.textSecond, fontSize: 12, fontWeight: tab === key ? '700' : '400' }}>{label}</Text>
        </Pressable>
      ))}
    </View>

    {msg ? (
      <View style={{ backgroundColor: msg.ok ? A.greenBg : A.redBg, borderLeftWidth: 2, borderLeftColor: msg.ok ? A.green : A.red, paddingHorizontal: 10, paddingVertical: 6, marginHorizontal: 12, marginTop: 8 }}>
        <Text style={{ color: msg.ok ? '#7FE0A0' : '#FF7070', fontSize: 12 }}>{msg.text}</Text>
      </View>
    ) : null}

    {/* ════════ 测试码 Tab ════════ */}
    {tab === 'codes' && (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false}>
      {/* 统计面板 */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[
          { l: '未用', v: stats.unused, c: A.green },
          { l: '已用', v: stats.used, c: A.blue },
          { l: '已禁用', v: stats.disabled, c: A.textHint },
          { l: '总计', v: stats.total, c: A.gold },
        ].map((s) => (
          <View key={s.l} style={{ flex: 1, backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, borderTopWidth: 2, borderTopColor: s.c, padding: 12, alignItems: 'center' }}>
            <Text style={{ color: s.c, fontSize: 20, fontWeight: '700' }}>{s.v}</Text>
            <Text style={{ color: A.textSecond, fontSize: 10, marginTop: 2 }}>{s.l}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2 }}>
        <Text style={{ color: A.gold, fontSize: 10 }}>⏱</Text>
        <Text style={{ color: A.textHint, fontSize: 10 }}>已用/已过期码将在展示 60 秒后自动清除</Text>
        <View style={{ flex: 1 }} />
        <Pressable cssInterop={false} onPress={clearUsedExpired} hitSlop={6} style={{ borderWidth: 1, borderColor: A.goldDim, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ color: A.gold, fontSize: 10, fontWeight: '600' }}>🧹 立即清除</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Btn label="刷新" onPress={() => load(page)} variant="ghost" small />
        <Btn label="生成测试码" onPress={openGen} variant="gold" small />
        <Btn label={selectMode ? '取消多选' : '多选'} onPress={() => { setSelectMode(!selectMode); setSelected(new Set()); }} variant="blue" small />
        <Btn label="清除未使用" onPress={() => setClearUnusedOpen(true)} variant="red" small />
        {selectMode ? <Btn label={`禁用(${selected.size})`} onPress={batchDisable} variant="red" small disabled={selected.size === 0} /> : null}
        <Btn label="复制并导出" onPress={copyAllAndDoc} variant="ghost" small />
        <Btn label="CSV 导出" onPress={exportCSV} variant="ghost" small />
      </View>

      {/* 编组列表 — 在生成测试码下方展示 */}
      {groups.length > 0 && (
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: A.goldLight, fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>📂 测试码编组</Text>
            <Text style={{ color: A.textHint, fontSize: 10 }}>共 {groups.length} 个组</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
            {groups.map((g) => {
              const isUngrouped = g.group_name === '未分组';
              return (
                <View key={g.group_name} style={{ borderWidth: 1, borderColor: A.divider, backgroundColor: A.bgCard, paddingHorizontal: 12, paddingVertical: 8, minWidth: 140 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <Text style={{ color: A.textPrimary, fontSize: 12, fontWeight: '700', flex: 1 }} numberOfLines={1}>{g.group_name}</Text>
                    {!isUngrouped && (
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        <Pressable cssInterop={false} onPress={() => { setRenameGroup(g.group_name); setGroupRenameValue(g.group_name); }} hitSlop={4} style={{ paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1, borderColor: A.goldDim }}>
                          <Text style={{ color: A.goldLight, fontSize: 9 }}>改名</Text>
                        </Pressable>
                        <Pressable cssInterop={false} onPress={() => setDelGroup(g.group_name)} hitSlop={4} style={{ paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1, borderColor: A.red }}>
                          <Text style={{ color: A.red, fontSize: 9 }}>删除</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <Text style={{ color: A.textSecond, fontSize: 10 }}>共 {g.total}</Text>
                    <Text style={{ color: A.green, fontSize: 10 }}>可用 {g.available}</Text>
                    <Text style={{ color: A.textHint, fontSize: 10 }}>已用 {g.used}</Text>
                  </View>
                  <Pressable
                    cssInterop={false}
                    onPress={() => copyGroupUnusedCodes(g.group_name)}
                    hitSlop={4}
                    disabled={g.available === 0}
                    style={{ marginTop: 6, borderWidth: 1, borderColor: g.available === 0 ? A.divider : A.green, backgroundColor: g.available === 0 ? 'transparent' : 'rgba(76,175,80,0.15)', paddingVertical: 5, alignItems: 'center' }}
                  >
                    <Text style={{ color: g.available === 0 ? A.textHint : '#7FE0A0', fontSize: 10, fontWeight: '700' }}>📋 复制未用测试码</Text>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* 按编组筛选 */}
      {groups.length > 0 && (
        <View style={{ gap: 4 }}>
          <Text style={{ color: A.textHint, fontSize: 10 }}>按编组筛选：</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
            <Pressable onPress={() => { setGroupFilter('all'); setPage(0); }} style={{ paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: groupFilter === 'all' ? A.gold : A.divider, backgroundColor: groupFilter === 'all' ? A.goldBg : 'transparent' }}>
              <Text style={{ color: groupFilter === 'all' ? A.goldLight : A.textSecond, fontSize: 11 }}>全部</Text>
            </Pressable>
            {groups.map((g) => {
              const key = g.group_name === '未分组' ? '' : g.group_name;
              const isSelected = groupFilter === key;
              return (
                <Pressable key={g.group_name} onPress={() => { setGroupFilter(key); setPage(0); }} style={{ paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: isSelected ? A.gold : A.divider, backgroundColor: isSelected ? A.goldBg : 'transparent' }}>
                  <Text style={{ color: isSelected ? A.goldLight : A.textSecond, fontSize: 11 }}>{g.group_name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* 批次列表 — 点击查看详情，小图标筛选/复制/改名/删除 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
        <Pressable onPress={() => { setBatchFilter('all'); setPage(0); }} style={{ paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: batchFilter === 'all' ? A.gold : A.divider, backgroundColor: batchFilter === 'all' ? A.goldBg : 'transparent' }}>
          <Text style={{ color: batchFilter === 'all' ? A.goldLight : A.textSecond, fontSize: 11 }}>全部</Text>
        </Pressable>
        {batches.map((b) => (
          <View key={b.batch_name} style={{ borderWidth: 1, borderColor: batchFilter === b.batch_name ? A.gold : A.divider, backgroundColor: batchFilter === b.batch_name ? A.goldBg : 'transparent' }}>
            {/* 点击批次名 → 打开详情 Modal */}
            <Pressable onPress={() => openBatchDetail(b)} style={{ paddingHorizontal: 10, paddingTop: 5, paddingBottom: 2 }}>
              <Text style={{ color: batchFilter === b.batch_name ? A.goldLight : A.textPrimary, fontSize: 11, fontWeight: '700' }}>{b.batch_name}</Text>
              <Text style={{ color: A.textSecond, fontSize: 9, marginTop: 1 }}>
                {b.available} 可用 / {b.total} 总计
              </Text>
              {/* 复制记录摘要 */}
              {b.copy_count > 0 ? (
                <Text style={{ color: A.textHint, fontSize: 9, marginTop: 2 }}>
                  📋 已被复制 {b.copy_count} 次
                  {b.last_copied_email ? `  最近：${b.last_copied_email.split('@')[0]}` : ''}
                </Text>
              ) : null}
            </Pressable>
            {/* 底部操作图标 */}
            <View style={{ flexDirection: 'row', paddingBottom: 3, paddingHorizontal: 6, gap: 4 }}>
              {/* 筛选主列表 */}
              <Pressable cssInterop={false} onPress={() => { setBatchFilter(b.batch_name); setPage(0); }} hitSlop={4} style={{ paddingHorizontal: 4 }}>
                <Text style={{ color: batchFilter === b.batch_name ? A.gold : A.textHint, fontSize: 11 }}>🔍</Text>
              </Pressable>
              <Pressable cssInterop={false} onPress={() => copyBatchCodes(b.batch_name)} hitSlop={4} style={{ paddingHorizontal: 4 }}>
                <Text style={{ color: A.blue, fontSize: 11 }}>📋</Text>
              </Pressable>
              <Pressable cssInterop={false} onPress={() => { setRenameBatch(b.batch_name); setRenameValue(b.batch_name); }} hitSlop={4} style={{ paddingHorizontal: 4 }}>
                <Text style={{ color: A.gold, fontSize: 11 }}>✏️</Text>
              </Pressable>
              <Pressable cssInterop={false} onPress={() => setDelBatch(b.batch_name)} hitSlop={4} style={{ paddingHorizontal: 4 }}>
                <Text style={{ color: A.red, fontSize: 12 }}>🗑</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* 状态筛选 */}
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        {['all', 'unused', 'used', 'disabled', 'expired'].map((s) => (
          <Pressable key={s} onPress={() => { setStatusFilter(s); setPage(0); }} style={{ paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: statusFilter === s ? A.gold : A.divider, backgroundColor: statusFilter === s ? A.goldBg : 'transparent' }}>
            <Text style={{ color: statusFilter === s ? A.goldLight : A.textSecond, fontSize: 10 }}>{s === 'all' ? '全部' : STATUS_LABEL[s]}</Text>
          </Pressable>
        ))}
      </View>

      {/* 分页控件 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
        <Btn label="◀ 上页" onPress={() => goPage(page - 1)} variant="ghost" small disabled={page === 0} />
        <Text style={{ color: A.textSecond, fontSize: 11 }}>第 {page + 1} / {totalPages} 页（{PAGE_SIZE} 条/页）</Text>
        <Btn label="下页 ▶" onPress={() => goPage(page + 1)} variant="ghost" small disabled={page >= totalPages - 1} />
      </View>

      {loading ? <ActivityIndicator color={A.gold} size="large" /> :
        codes.length === 0 ? <Empty text="暂无测试码" /> :
        codes.map((c) => {
          const isExpired = c.expires_at ? new Date(c.expires_at) < new Date() : false;
          const displayStatus = isExpired && c.status === 'unused' ? 'expired' : c.status;
          const dim = c.status === 'disabled' || displayStatus === 'expired';
          return (
            <Pressable key={c.id} onPress={() => selectMode && toggleSelect(c.id)} style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: selectMode && selected.has(c.id) ? A.gold : A.divider, padding: 12, opacity: dim ? 0.5 : 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: A.textPrimary, fontSize: 14, fontWeight: '700', letterSpacing: 1, flex: 1 }}>{c.code}</Text>
                <Pressable
                  cssInterop={false}
                  onPress={() => copyCode(c.code)}
                  hitSlop={6}
                  style={{ borderWidth: 1, borderColor: A.border, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: 'rgba(255,255,255,0.06)', marginRight: 8 }}
                >
                  <Text style={{ color: A.textSecond, fontSize: 10 }}>复制</Text>
                </Pressable>
                <Badge text={STATUS_LABEL[displayStatus] ?? displayStatus} color={statusColors[displayStatus] ?? A.gold} />
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                <Text style={{ color: A.textSecond, fontSize: 10 }}>批次 {c.batch_name}</Text>
                {c.used_by_email ? <Text style={{ color: A.textSecond, fontSize: 10 }}>使用者 {c.used_by_email}</Text> : null}
                {c.note ? <Text style={{ color: A.textSecond, fontSize: 10 }}>备注 {c.note}</Text> : null}
              </View>
            </Pressable>
          );
        })
      }

      {/* 底部分页 */}
      {codes.length > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingBottom: 8 }}>
          <Btn label="◀ 上页" onPress={() => goPage(page - 1)} variant="ghost" small disabled={page === 0} />
          <Text style={{ color: A.textSecond, fontSize: 11 }}>{page + 1} / {totalPages}</Text>
          <Btn label="下页 ▶" onPress={() => goPage(page + 1)} variant="ghost" small disabled={page >= totalPages - 1} />
        </View>
      )}

      {/* 生成弹窗 */}
      <Modal visible={genOpen} transparent animationType="fade" onRequestClose={() => setGenOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 }} onPress={() => setGenOpen(false)}>
          <Pressable style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, padding: 16, gap: 10 }} onPress={(e) => e.stopPropagation()}>
            <Text style={{ color: A.goldLight, fontSize: 14, fontWeight: '700', letterSpacing: 1 }}>生成测试码</Text>
            <Text style={{ color: A.textSecond, fontSize: 11 }}>选择批次（或直接输入新批次名）</Text>
            <TextInput
              value={genBatch}
              onChangeText={setGenBatch}
              placeholder="输入或选择批次名，如：管理员21"
              placeholderTextColor={A.textHint}
              style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }}
            />
            <Text style={{ color: A.textHint, fontSize: 10 }}>已有批次（点击快速选择）：</Text>
            <ScrollView style={{ maxHeight: 140 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
              <View style={{ gap: 3 }}>
                {batches.length === 0 ? (
                  <Text style={{ color: A.textHint, fontSize: 11, paddingVertical: 8 }}>暂无批次，请在上方输入新批次名</Text>
                ) : batches.map((b) => {
                  const isSelected = genBatch === b.batch_name;
                  return (
                    <Pressable
                      key={b.batch_name}
                      onPress={() => setGenBatch(b.batch_name)}
                      style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1,
                        borderColor: isSelected ? A.gold : A.divider,
                        backgroundColor: isSelected ? A.goldBg : 'transparent' }}
                    >
                      <Text style={{ color: isSelected ? A.goldLight : A.textPrimary, fontSize: 12 }}>{b.batch_name}</Text>
                      <Text style={{ color: A.textSecond, fontSize: 10 }}>{b.total} 个</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
            <Text style={{ color: A.textSecond, fontSize: 11 }}>编组（可选，选择已有组或输入新组名）</Text>
            <TextInput
              value={genGroup}
              onChangeText={setGenGroup}
              placeholder="输入新组名，如：内测A组"
              placeholderTextColor={A.textHint}
              style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }}
            />
            {groups.length > 0 ? (
              <>
                <Text style={{ color: A.textHint, fontSize: 10 }}>已有编组（点击快速选择）：</Text>
                <ScrollView style={{ maxHeight: 100 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                  <View style={{ gap: 3 }}>
                    {groups.map((g) => {
                      const isSelected = genGroup === g.group_name;
                      return (
                        <Pressable
                          key={g.group_name}
                          onPress={() => setGenGroup(g.group_name === '未分组' ? '' : g.group_name)}
                          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                            paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1,
                            borderColor: isSelected ? A.gold : A.divider,
                            backgroundColor: isSelected ? A.goldBg : 'transparent' }}
                        >
                          <Text style={{ color: isSelected ? A.goldLight : A.textPrimary, fontSize: 12 }}>{g.group_name}</Text>
                          <Text style={{ color: A.textSecond, fontSize: 10 }}>{g.total} 个</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </>
            ) : null}
            <Text style={{ color: A.textSecond, fontSize: 11 }}>数量（单次最多 5000）</Text>
            <TextInput value={genCount} onChangeText={setGenCount} placeholder="10" placeholderTextColor={A.textHint} keyboardType="number-pad" style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }} />
            <Text style={{ color: A.textSecond, fontSize: 11 }}>备注（可选）</Text>
            <TextInput value={genNote} onChangeText={setGenNote} placeholder="如：内测第一批" placeholderTextColor={A.textHint} style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }} />
            <Text style={{ color: A.textSecond, fontSize: 11 }}>生效时长（到期自动删除）</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {([1, 5, 10, 30, 60, 720, 1440] as const).map((m) => {
                const active = genMinutes === m;
                const label = m < 60 ? `${m}分钟` : m === 60 ? '1小时' : m === 720 ? '12小时' : '24小时';
                return (
                  <Pressable key={m} onPress={() => setGenMinutes(m)} style={{ paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', borderWidth: 1, borderColor: active ? A.gold : A.border, backgroundColor: active ? A.goldBg : A.bgInput }}>
                    <Text style={{ color: active ? A.goldLight : A.textSecond, fontSize: 12, fontWeight: active ? '700' : '400' }}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {genResult ? (
              <View style={{ backgroundColor: A.greenBg, borderWidth: 1, borderColor: A.green, padding: 8, gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: '#7FE0A0', fontSize: 11, fontWeight: '700' }}>✓ 已生成 {genResult.codes.length} 个测试码</Text>
                  <Pressable
                    cssInterop={false}
                    onPress={copyGenResult}
                    hitSlop={4}
                    style={{ borderWidth: 1, borderColor: A.green, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: 'rgba(76,175,80,0.15)' }}
                  >
                    <Text style={{ color: '#7FE0A0', fontSize: 10, fontWeight: '700' }}>📋 一键复制</Text>
                  </Pressable>
                </View>
                {/* 复制格式切换 */}
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {([['plain', '纯码'], ['withNote', '带批次备注']] as const).map(([val, label]) => {
                    const on = genCopyFormat === val;
                    return (
                      <Pressable
                        key={val}
                        cssInterop={false}
                        onPress={() => setGenCopyFormat(val)}
                        style={{ paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: on ? A.green : A.divider, backgroundColor: on ? 'rgba(76,175,80,0.2)' : 'transparent' }}
                      >
                        <Text style={{ color: on ? '#7FE0A0' : A.textSecond, fontSize: 10, fontWeight: on ? '700' : '400' }}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <ScrollView style={{ maxHeight: 120 }} showsVerticalScrollIndicator={false}>
                  {genResult.codes.map((code) => (
                    <View key={code} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 }}>
                      <Text style={{ color: '#7FE0A0', fontSize: 12, flex: 1 }}>{code}</Text>
                      <Pressable
                        cssInterop={false}
                        onPress={() => copySingleCode(code)}
                        hitSlop={4}
                        style={{ borderWidth: 1, borderColor: A.green, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: 'rgba(76,175,80,0.15)' }}
                      >
                        <Text style={{ color: '#7FE0A0', fontSize: 9, fontWeight: '700' }}>复制</Text>
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Btn label="取消" onPress={() => setGenOpen(false)} variant="ghost" small style={{ flex: 1 }} />
              <Btn label={genSaving ? '生成中...' : '确认生成'} onPress={submitGen} variant="gold" disabled={genSaving} small style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 批次删除确认 */}
      <Modal visible={!!delBatch} transparent animationType="fade" onRequestClose={() => setDelBatch(null)}>
        <Pressable cssInterop={false} onPress={() => setDelBatch(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.red, padding: 18, gap: 12 }}>
            <Text style={{ color: A.red, fontSize: 14, fontWeight: '700' }}>🗑 删除批次</Text>
            <Text style={{ color: A.textSecond, fontSize: 12, lineHeight: 18 }}>确认删除批次「{delBatch}」及其全部测试码？此操作不可撤销。</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Btn label="取消" onPress={() => setDelBatch(null)} variant="ghost" small style={{ flex: 1 }} />
              <Btn label="确认删除" onPress={confirmDeleteBatch} variant="red" small style={{ flex: 1 }} />
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* 清除未使用测试码确认 */}
      <Modal visible={clearUnusedOpen} transparent animationType="fade" onRequestClose={() => setClearUnusedOpen(false)}>
        <Pressable cssInterop={false} onPress={() => setClearUnusedOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.red, padding: 18, gap: 12 }}>
            <Text style={{ color: A.red, fontSize: 14, fontWeight: '700' }}>🧹 清除未使用测试码</Text>
            <Text style={{ color: A.textSecond, fontSize: 12, lineHeight: 18 }}>将删除所有状态为「未使用」的测试码，已使用/已禁用/已过期的码不受影响。此操作不可撤销。</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Btn label="取消" onPress={() => setClearUnusedOpen(false)} variant="ghost" small style={{ flex: 1 }} />
              <Btn label="确认清除" onPress={confirmClearUnused} variant="red" small style={{ flex: 1 }} />
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* 编组改名 */}
      <Modal visible={!!renameGroup} transparent animationType="fade" onRequestClose={() => setRenameGroup(null)}>
        <Pressable cssInterop={false} onPress={() => setRenameGroup(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 }}>
          <Pressable cssInterop={false} onPress={() => {}} style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.gold, padding: 18, gap: 12 }}>
            <Text style={{ color: A.goldLight, fontSize: 14, fontWeight: '700' }}>✏️ 编组改名</Text>
            <Text style={{ color: A.textHint, fontSize: 11 }}>原名：{renameGroup}</Text>
            <TextInput value={groupRenameValue} onChangeText={setGroupRenameValue} placeholder="输入新编组名" placeholderTextColor={A.textHint} style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Btn label="取消" onPress={() => setRenameGroup(null)} variant="ghost" small style={{ flex: 1 }} />
              <Btn label="确认改名" onPress={confirmRenameGroup} variant="gold" small style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 编组删除确认 */}
      <Modal visible={!!delGroup} transparent animationType="fade" onRequestClose={() => setDelGroup(null)}>
        <Pressable cssInterop={false} onPress={() => setDelGroup(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.red, padding: 18, gap: 12 }}>
            <Text style={{ color: A.red, fontSize: 14, fontWeight: '700' }}>🗑 删除编组</Text>
            <Text style={{ color: A.textSecond, fontSize: 12, lineHeight: 18 }}>将删除编组「{delGroup}」下所有未使用的测试码。已使用/已禁用/已过期的码将保留（其编组名不变）。此操作不可撤销。</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Btn label="取消" onPress={() => setDelGroup(null)} variant="ghost" small style={{ flex: 1 }} />
              <Btn label="确认删除" onPress={confirmDeleteGroup} variant="red" small style={{ flex: 1 }} />
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* 批次重命名 */}
      <Modal visible={!!renameBatch} transparent animationType="fade" onRequestClose={() => { setRenameBatch(null); setRenameValue(''); }}>
        <Pressable cssInterop={false} onPress={() => { setRenameBatch(null); setRenameValue(''); }} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 }}>
          <Pressable cssInterop={false} onPress={() => {}} style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.gold, padding: 18, gap: 12 }}>
            <Text style={{ color: A.goldLight, fontSize: 14, fontWeight: '700' }}>✏️ 批次改名</Text>
            <Text style={{ color: A.textHint, fontSize: 11 }}>原名：{renameBatch}</Text>
            <TextInput value={renameValue} onChangeText={setRenameValue} placeholder="输入新批次名" placeholderTextColor={A.textHint} style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Btn label="取消" onPress={() => { setRenameBatch(null); setRenameValue(''); }} variant="ghost" small style={{ flex: 1 }} />
              <Btn label="确认改名" onPress={confirmRenameBatch} variant="gold" small style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 批次详情 Modal */}
      <Modal visible={!!batchDetail} transparent animationType="slide" onRequestClose={() => setBatchDetail(null)}>
        <Pressable cssInterop={false} onPress={() => setBatchDetail(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
          <Pressable cssInterop={false} onPress={() => {}} style={{ backgroundColor: A.bgMid, borderTopWidth: 2, borderTopColor: A.gold, maxHeight: '85%' }}>
            {batchDetail ? (
              <>
                {/* 标题行 */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: A.divider }}>
                  <View style={{ gap: 2 }}>
                    <Text style={{ color: A.goldLight, fontSize: 15, fontWeight: '700' }}>📦 {batchDetail.batch.batch_name}</Text>
                    <Text style={{ color: A.textSecond, fontSize: 11 }}>
                      {batchDetail.batch.available} 可用 · {batchDetail.batch.total} 总计
                      {batchDetail.batch.copy_count > 0 ? `  · 已复制 ${batchDetail.batch.copy_count} 次` : ''}
                    </Text>
                  </View>
                  <Btn label="📋 复制全部" onPress={copyDetailAll} variant="blue" small />
                </View>

                {/* 分页控制 */}
                {(() => {
                  const totalDetailPages = Math.max(1, Math.ceil(batchDetail.total / DETAIL_PAGE));
                  return (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: A.divider }}>
                      <Btn label="◀" onPress={() => loadDetailPage(batchDetail.page - 1)} variant="ghost" small disabled={batchDetail.page === 0 || batchDetail.loading} />
                      <Text style={{ color: A.textSecond, fontSize: 11 }}>
                        第 {batchDetail.page + 1} / {totalDetailPages} 页（{DETAIL_PAGE} 条/页）
                      </Text>
                      <Btn label="▶" onPress={() => loadDetailPage(batchDetail.page + 1)} variant="ghost" small disabled={batchDetail.page >= totalDetailPages - 1 || batchDetail.loading} />
                    </View>
                  );
                })()}

                {/* 码列表 */}
                <ScrollView contentContainerStyle={{ padding: 12, gap: 6 }} showsVerticalScrollIndicator={false}>
                  {batchDetail.loading ? (
                    <ActivityIndicator color={A.gold} size="large" style={{ marginVertical: 32 }} />
                  ) : batchDetail.codes.length === 0 ? (
                    <Text style={{ color: A.textHint, textAlign: 'center', paddingVertical: 24 }}>暂无测试码</Text>
                  ) : batchDetail.codes.map((c) => {
                    const isExpired = c.expires_at ? new Date(c.expires_at) < new Date() : false;
                    const displayStatus = isExpired && c.status === 'unused' ? 'expired' : c.status;
                    const detailStatusColor: Record<string, string> = { unused: A.green, used: A.blue, disabled: A.textHint, expired: A.textHint };
                    return (
                      <View key={c.id} style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', opacity: displayStatus === 'disabled' || displayStatus === 'expired' ? 0.5 : 1 }}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={{ color: A.textPrimary, fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>{c.code}</Text>
                          {c.used_by_email ? <Text style={{ color: A.textHint, fontSize: 10 }}>使用者 {c.used_by_email}</Text> : null}
                        </View>
                        <Badge text={STATUS_LABEL[displayStatus] ?? displayStatus} color={detailStatusColor[displayStatus] ?? A.gold} />
                      </View>
                    );
                  })}
                </ScrollView>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
    )}

    {/* ════════ 时间窗口 Tab ════════ */}
    {tab === 'schedule' && (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false}>
      {/* 当前生效时间窗口 */}
      <Card title="当前生效时间窗口" accent={A.green}>
        {schLoading ? <ActivityIndicator color={A.green} /> :
         activeSchedule ? (
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ backgroundColor: activeSchedule.enabled ? A.greenBg : A.redBg, borderWidth: 1, borderColor: activeSchedule.enabled ? A.green : A.red, paddingHorizontal: 12, paddingVertical: 8, flex: 1, alignItems: 'center' }}>
                <Text style={{ color: activeSchedule.enabled ? A.green : A.red, fontSize: 18, fontWeight: '700' }}>
                  {activeSchedule.enabled ? `${activeSchedule.open_time} — ${activeSchedule.close_time}` : '申请通道已关闭'}
                </Text>
                <Text style={{ color: A.textSecond, fontSize: 10, marginTop: 4 }}>
                  {activeSchedule.enabled ? '每日此时间段内开放玩家申请测试码' : '当前关闭，玩家无法提交测试码申请'}
                </Text>
              </View>
            </View>
            {activeSchedule.note ? <Text style={{ color: A.textHint, fontSize: 11 }}>备注：{activeSchedule.note}</Text> : null}
          </View>
        ) : (
          <View style={{ backgroundColor: A.redBg, borderLeftWidth: 2, borderLeftColor: A.red, paddingHorizontal: 10, paddingVertical: 8 }}>
            <Text style={{ color: A.red, fontSize: 12 }}>⚠️ 未设置时间窗口，玩家可随时申请测试码</Text>
          </View>
        )}
      </Card>

      {/* 设置 / 申请时间窗口 */}
      <Card title={isSuperAdmin ? '⚙️ 直接设置时间窗口（超管）' : '📋 申请修改时间窗口（需超管审批）'} accent={A.gold}>
        <View style={{ gap: 10 }}>
          <View style={{ backgroundColor: A.bgInput, borderLeftWidth: 2, borderLeftColor: A.gold, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Text style={{ color: A.textHint, fontSize: 10, lineHeight: 16 }}>
              {isSuperAdmin
                ? '超管直接生效，旧设置自动替换'
                : '普通管理员提交申请，超管审批后生效'}
            </Text>
          </View>

          {/* 开启/关闭总开关 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ color: A.textSecond, fontSize: 12, flex: 1 }}>申请通道</Text>
            <Pressable onPress={() => setSchEnabled(!schEnabled)} style={{ paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: schEnabled ? A.green : A.red, backgroundColor: schEnabled ? A.greenBg : A.redBg }}>
              <Text style={{ color: schEnabled ? A.green : A.red, fontSize: 12, fontWeight: '700' }}>{schEnabled ? '开启中' : '已关闭'}</Text>
            </Pressable>
          </View>

          {schEnabled && (
            <>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: A.textSecond, fontSize: 11, marginBottom: 4 }}>开始时间（HH:MM）</Text>
                  <TextInput value={schOpen} onChangeText={setSchOpen} placeholder="09:00" placeholderTextColor={A.textHint} style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, textAlign: 'center' }} />
                </View>
                <Text style={{ color: A.textHint, fontSize: 14, marginTop: 18 }}>—</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: A.textSecond, fontSize: 11, marginBottom: 4 }}>结束时间（HH:MM）</Text>
                  <TextInput value={schClose} onChangeText={setSchClose} placeholder="23:00" placeholderTextColor={A.textHint} style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, textAlign: 'center' }} />
                </View>
              </View>
              {/* 快速预设 */}
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {[['09:00','18:00'],['10:00','22:00'],['00:00','23:59']].map(([o, c]) => (
                  <Pressable key={o} onPress={() => { setSchOpen(o); setSchClose(c); }} style={{ paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: schOpen === o && schClose === c ? A.gold : A.divider, backgroundColor: schOpen === o && schClose === c ? A.goldBg : 'transparent' }}>
                    <Text style={{ color: schOpen === o && schClose === c ? A.goldLight : A.textSecond, fontSize: 10 }}>{o}–{c}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <Text style={{ color: A.textSecond, fontSize: 11 }}>备注（可选）</Text>
          <TextInput value={schNote} onChangeText={setSchNote} placeholder="如：活动期间临时开放" placeholderTextColor={A.textHint} style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }} />

          <Btn
            label={schSaving ? '提交中...' : (isSuperAdmin ? '立即生效' : '提交申请')}
            onPress={submitSchedule} variant="gold" disabled={schSaving}
          />
        </View>
      </Card>

      {/* 申请记录列表（超管可审批；普通管理员仅看） */}
      <Card title="申请记录" accent={A.gold}>
        {schLoading ? <ActivityIndicator color={A.gold} /> :
         schRequests.length === 0 ? <Empty text="暂无申请记录" /> :
         schRequests.map((req) => (
          <View key={req.id} style={{ backgroundColor: A.bgMid, borderWidth: 1, borderColor: A.divider, padding: 10, gap: 6, marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: A.textPrimary, fontSize: 13, fontWeight: '700', flex: 1 }}>
                {req.enabled ? `${req.open_time} — ${req.close_time}` : '关闭申请通道'}
              </Text>
              <View style={{ backgroundColor: SCH_STATUS_COLOR[req.status] + '22', borderWidth: 1, borderColor: SCH_STATUS_COLOR[req.status], paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ color: SCH_STATUS_COLOR[req.status], fontSize: 10, fontWeight: '700' }}>{SCH_STATUS_LABEL[req.status] ?? req.status}</Text>
              </View>
            </View>
            <Text style={{ color: A.textHint, fontSize: 10 }}>
              申请人：{req.created_by_email ?? '未知'}  ·  {new Date(req.created_at).toLocaleString('zh-CN')}
            </Text>
            {req.note ? <Text style={{ color: A.textSecond, fontSize: 10 }}>备注：{req.note}</Text> : null}
            {req.reject_reason ? <Text style={{ color: A.red, fontSize: 10 }}>驳回原因：{req.reject_reason}</Text> : null}
            {/* 超管审批按钮 */}
            {isSuperAdmin && req.status === 'pending' && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <Btn label="✓ 通过" onPress={() => handleApproveSchedule(req.id)} variant="green" small style={{ flex: 1 }} />
                <Btn label="✗ 驳回" onPress={() => { setRejectId(req.id); setRejectReason(''); }} variant="red" small style={{ flex: 1 }} />
              </View>
            )}
          </View>
        ))}
      </Card>

      {/* 驳回原因弹窗 */}
      <Modal visible={!!rejectId} transparent animationType="fade" onRequestClose={() => setRejectId(null)}>
        <Pressable cssInterop={false} onPress={() => setRejectId(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 }}>
          <Pressable cssInterop={false} onPress={() => {}} style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.red, padding: 18, gap: 12 }}>
            <Text style={{ color: A.red, fontSize: 14, fontWeight: '700' }}>驳回申请</Text>
            <Text style={{ color: A.textSecond, fontSize: 11 }}>驳回原因（可选）</Text>
            <TextInput value={rejectReason} onChangeText={setRejectReason} placeholder="填写驳回原因" placeholderTextColor={A.textHint} style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Btn label="取消" onPress={() => setRejectId(null)} variant="ghost" small style={{ flex: 1 }} />
              <Btn label="确认驳回" onPress={handleRejectSchedule} variant="red" small style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
    )}
    </>
  );
}
```

<a id="srccomponentsadminwheelpickertsx"></a>
## `src/components/admin/WheelPicker.tsx`

```tsx
// 滚轮选择器：垂直滚动选择数值，iOS/Android/Web 均可用
import { useCallback, useRef } from 'react';
import { FlatList, Text, View } from 'react-native';

const ITEM_H = 44; // 每项高度
const VISIBLE = 3; // 可见项数（奇数，中间为选中项）

interface WheelPickerProps {
  values: number[];
  selected: number;
  onChange: (v: number) => void;
  unit?: string; // 可选单位，显示在滚轮右侧
}

export function WheelPicker({ values, selected, onChange, unit }: WheelPickerProps) {
  const ref = useRef<FlatList>(null);
  const selIdx = values.indexOf(selected);

  // 挂载后滚到选中位置
  const onLayout = useCallback(() => {
    const idx = values.indexOf(selected);
    if (idx >= 0) {
      ref.current?.scrollToOffset({ offset: idx * ITEM_H, animated: false });
    }
  }, [selected, values]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ height: ITEM_H * VISIBLE, width: 80, overflow: 'hidden', position: 'relative' }}>
        {/* 选中项高亮背景 */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute', top: ITEM_H, left: 0, right: 0, height: ITEM_H,
            backgroundColor: 'rgba(212,175,55,0.12)',
            borderTopWidth: 1, borderBottomWidth: 1,
            borderColor: 'rgba(212,175,55,0.45)',
            zIndex: 2,
          }}
        />
        <FlatList
          ref={ref}
          data={values}
          keyExtractor={(v) => String(v)}
          snapToInterval={ITEM_H}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onLayout={onLayout}
          contentContainerStyle={{ paddingTop: ITEM_H, paddingBottom: ITEM_H }}
          onMomentumScrollEnd={(e) => {
            const raw = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
            const clamped = Math.max(0, Math.min(raw, values.length - 1));
            if (values[clamped] !== selected) onChange(values[clamped]);
          }}
          // 慢速滑动也需捕获
          onScrollEndDrag={(e) => {
            const raw = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
            const clamped = Math.max(0, Math.min(raw, values.length - 1));
            if (values[clamped] !== selected) onChange(values[clamped]);
          }}
          renderItem={({ item }) => {
            const isSelected = item === selected;
            return (
              <View style={{ height: ITEM_H, justifyContent: 'center', alignItems: 'center' }}>
                <Text
                  style={{
                    color: isSelected ? '#D4AF37' : 'rgba(255,255,255,0.35)',
                    fontSize: isSelected ? 22 : 15,
                    fontWeight: isSelected ? '700' : '400',
                  }}
                >
                  {item}
                </Text>
              </View>
            );
          }}
        />
      </View>
      {unit ? (
        <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>{unit}</Text>
      ) : null}
      {/* 选中值大字提示 */}
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        <Text style={{ color: '#D4AF37', fontSize: 11, fontWeight: '600', opacity: selIdx >= 0 ? 1 : 0 }}>
          已选 {selected} 天
        </Text>
      </View>
    </View>
  );
}
```

<a id="srccomponentsadminsharedtsx"></a>
## `src/components/admin/shared.tsx`

```tsx
// 管理员后台共享 UI 组件与配色（深色政务风，与登录页一致）
import { ReactNode } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

export const A = {
  bg: '#07111E', bgCard: '#0F2235', bgMid: '#0D1B2A', bgInput: '#0A1A2A',
  gold: '#C8A84B', goldLight: '#E8D08A', goldDim: '#7A6428', goldBg: 'rgba(200,168,75,0.08)',
  red: '#C82829', redBg: '#3a1414', green: '#2a7a3b', greenBg: '#123a1c',
  blue: '#2B4B6F', orange: '#B5651D',
  textPrimary: '#EDE8DC', textSecond: '#A09070', textHint: '#5A5040',
  divider: '#162840', border: '#1E3A5A',
};

export function Card({ children, title, accent = A.gold, style }: { children: ReactNode; title?: string; accent?: string; style?: object }) {
  return (
    <View style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, borderTopWidth: 2, borderTopColor: accent, padding: 14, borderRadius: 4, ...style }}>
      {title ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <View style={{ width: 3, height: 13, backgroundColor: accent }} />
          <Text style={{ fontSize: 13, color: A.goldLight, fontWeight: '700', letterSpacing: 1 }}>{title}</Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function Row({ label, value, valueColor }: { label: string; value: ReactNode; valueColor?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: A.divider }}>
      <Text style={{ color: A.textSecond, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: valueColor ?? A.textPrimary, fontSize: 12, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

export function Btn({ label, onPress, variant = 'gold', disabled, small, style }: { label: string; onPress: () => void; variant?: 'gold' | 'red' | 'green' | 'ghost' | 'blue'; disabled?: boolean; small?: boolean; style?: object }) {
  const colors: Record<string, string> = { gold: A.gold, red: A.red, green: A.green, blue: A.blue, ghost: 'transparent' };
  const bg = disabled ? A.goldDim : colors[variant];
  return (
    <Pressable
      cssInterop={false}
      disabled={disabled}
      onPress={onPress}
      style={{ backgroundColor: bg, paddingVertical: small ? 8 : 12, paddingHorizontal: small ? 10 : 16, alignItems: 'center', borderWidth: variant === 'ghost' ? 1 : 0, borderColor: A.goldDim, opacity: disabled ? 0.6 : 1, ...(style as object) }}
    >
      <Text style={{ color: variant === 'ghost' ? A.gold : '#fff', fontWeight: '700', fontSize: small ? 11 : 13, letterSpacing: 1 }}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ text, color = A.gold }: { text: string; color?: string }) {
  return (
    <View style={{ backgroundColor: color, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}

export function Empty({ text = '暂无数据' }: { text?: string }) {
  return <Text style={{ color: A.textHint, fontSize: 12, textAlign: 'center', paddingVertical: 16 }}>{text}</Text>;
}

export function LabeledInput({ label, value, onChange, placeholder, keyboardType, multiline }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; keyboardType?: 'default' | 'numeric' | 'number-pad'; multiline?: boolean }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: A.textSecond, fontSize: 11 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={A.textHint}
        keyboardType={keyboardType}
        multiline={multiline}
        style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, minHeight: multiline ? 72 : 0, textAlignVertical: 'top' }}
      />
    </View>
  );
}
```

<a id="srccomponentspromotionconditionstabtsx"></a>
## `src/components/promotion/ConditionsTab.tsx`

```tsx
// 晋升页·晋升条件 Tab（软输入参考 + v5 硬门控）
// v5：移除旧 pending_promotion 申请按钮与 ensureNpcPosts 旧岗位系统；接入 checkPromotionGate 硬门控
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getNpcBand } from '@/db/gameApi';
import { isPromotionFrozen, isWindowLocked, getTierOf, getFreezeReason } from '@/lib/promotionEngine';
import { resolveContest } from '@/lib/promotionFaction';
import type { PromotionGateResult } from '@/lib/promotionFaction';
import { CONTEST_BLEND, CONTEST_COSTS, calcFactionPower, calcPersonalPower, getNationalControl } from '@/lib/provinceSeatSystem';
import { RANK_CONFIG, getLegalTitle, FACTION_COLOR, FACTION_LABEL, type FactionId } from '@/types/game';

export function ConditionsTab({ gate }: { gate: PromotionGateResult }) {
  const { save } = useGame();
  const [bandFactions, setBandFactions] = useState<FactionId[]>([]);

  useFocusEffect(useCallback(() => {
    if (!save) return;
    (async () => {
      const band = await getNpcBand(save.id);
      const bf: FactionId[] = [];
      for (const m of band) { if (m.faction) bf.push(m.faction); }
      setBandFactions(bf);
    })();
  }, [save]));

  if (!save) return <ActivityIndicator color="#C82829" style={{ padding: 40 }} />;

  const frozen = isPromotionFrozen(save);
  const windowLocked = isWindowLocked(save);
  const freezeReason = getFreezeReason(save);

  // v5 硬门控（由父组件传入，避免重复计算）

  // 当前争夺力预估（软输入折算展示）
  const { sYou, sOpp } = resolveContest(save, bandFactions);
  const contest = save.promotionContest;
  const contestWinning = contest && contest.status === 'active' && contest.sYou >= contest.sOpp;

  return (
    <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>

      {/* 当前 → 目标职级卡（从 RANK_CONFIG 读取，配置驱动） */}
      {save.rankLevel < 15 && (() => {
        const cur = RANK_CONFIG[save.rankLevel];
        const nxt = RANK_CONFIG[save.rankLevel + 1];
        if (!cur || !nxt) return null;
        const sameGrade = cur.rankGrade === nxt.rankGrade;
        return (
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D3B5E', letterSpacing: 1, marginBottom: 10 }}>职级晋升概览</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 0 }}>
              {/* 当前职级 */}
              <View style={{ flex: 1, backgroundColor: '#F5F4F1', borderWidth: 1, borderColor: '#D9D9D9', padding: 10, alignItems: 'center', gap: 3 }}>
                <Text style={{ fontSize: 9, color: '#888', letterSpacing: 0.5 }}>当前职级</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D3B5E' }}>{cur.name}</Text>
                <View style={{ backgroundColor: '#E8EDF5', borderWidth: 1, borderColor: '#AAB8CC', paddingHorizontal: 6, paddingVertical: 2, marginTop: 2 }}>
                  <Text style={{ fontSize: 10, color: '#1D3B5E', fontWeight: '600' }}>{cur.rankGrade}</Text>
                </View>
                <Text style={{ fontSize: 9, color: '#999', marginTop: 2, textAlign: 'center' }}>{getLegalTitle(save.rankLevel)}</Text>
              </View>
              {/* 箭头 */}
              <View style={{ paddingHorizontal: 8, alignItems: 'center', gap: 2 }}>
                <Text style={{ fontSize: 18, color: '#C82829' }}>→</Text>
                {!sameGrade && (
                  <Text style={{ fontSize: 8, color: '#C82829', fontWeight: '600', letterSpacing: 0.3 }}>升级</Text>
                )}
              </View>
              {/* 目标职级 */}
              <View style={{ flex: 1, backgroundColor: '#FFF8F8', borderWidth: 1, borderColor: '#C82829', padding: 10, alignItems: 'center', gap: 3 }}>
                <Text style={{ fontSize: 9, color: '#C82829', letterSpacing: 0.5 }}>目标职级</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#C82829' }}>{nxt.name}</Text>
                <View style={{ backgroundColor: !sameGrade ? '#FDE8E8' : '#F5F4F1', borderWidth: 1, borderColor: !sameGrade ? '#C82829' : '#D9D9D9', paddingHorizontal: 6, paddingVertical: 2, marginTop: 2 }}>
                  <Text style={{ fontSize: 10, color: !sameGrade ? '#C82829' : '#1D3B5E', fontWeight: '700' }}>{nxt.rankGrade}</Text>
                </View>
                <Text style={{ fontSize: 9, color: '#999', marginTop: 2, textAlign: 'center' }}>{getLegalTitle(save.rankLevel + 1)}</Text>
              </View>
            </View>
          </View>
        );
      })()}

      {/* v5 晋升硬门控卡 */}
      <View style={{ backgroundColor: gate.allowed ? '#F0FAF0' : '#FFF5F5', borderWidth: 1, borderColor: gate.allowed ? '#A5D6A7' : '#F0B4B4', padding: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: gate.allowed ? '#2E7D32' : '#C62828', letterSpacing: 1 }}>🛂 v5 晋升硬门控</Text>
          <Text style={{ fontSize: 11, fontWeight: '700', color: gate.allowed ? '#2E7D32' : '#C62828' }}>
            {gate.allowed ? '✅ 可晋升' : '⛔ 未通过'}
          </Text>
        </View>
        {gate.blockReason ? (
          <Text style={{ fontSize: 11, color: '#8A2B2B', lineHeight: 17, marginBottom: 8 }}>{gate.blockReason}</Text>
        ) : null}
        {gate.details.length > 0 ? (
          <View style={{ gap: 8 }}>
            {gate.details.map(d => (
              <View key={d.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 14 }}>{d.pass ? '✅' : '⚠️'}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: d.pass ? '#2a7a3b' : '#B8860B' }}>{d.label}</Text>
                </View>
                <Text style={{ fontSize: 11, color: d.pass ? '#2a7a3b' : '#C62828' }}>
                  {String(d.current)} / {String(d.required)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {/* v4 双轨战力卡：个人职位战（10%派系+90%个人）+ 省级席位控制度 */}
      {(() => {
        const primary = (save.primaryFaction || 'reform') as FactionId;
        const factionPower = calcFactionPower(save, primary);
        const personalPower = calcPersonalPower(save);
        const estSYou = Math.round((CONTEST_BLEND.faction * factionPower + CONTEST_BLEND.personal * personalPower) * 10) / 10;
        const { control } = getNationalControl(save);
        const myRatio = control.controlRatios[primary] ?? 0;
        const cooldownRemaining = Math.max(0, (save.personalContestCooldownUntil ?? 0) - save.gameDays);
        const meritEnough = (save.meritPoints ?? 0) >= CONTEST_COSTS.personalContest.merit;
        return (
          <View style={{ backgroundColor: '#FFFCF0', borderWidth: 1, borderColor: '#B8860B', padding: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#8A6D1A', marginBottom: 8 }}>⚔ v4 双轨战力预估</Text>
            {/* 个人职位战分解条 */}
            <Text style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>个人职位战 S_you ≈ {estSYou}（派系 {CONTEST_BLEND.faction * 100}% + 个人 {CONTEST_BLEND.personal * 100}%）</Text>
            <View style={{ height: 14, flexDirection: 'row', borderWidth: 1, borderColor: '#D9CFA3' }}>
              <View style={{ width: `${CONTEST_BLEND.faction * 100}%`, backgroundColor: FACTION_COLOR[primary], justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 8 }}>{Math.round(CONTEST_BLEND.faction * factionPower)}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#B8860B', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>{Math.round(CONTEST_BLEND.personal * personalPower)}（90%）</Text>
              </View>
            </View>
            <Text style={{ fontSize: 9, color: '#999', marginTop: 4, marginBottom: 6 }}>
              派系实力 {factionPower} · 个人战力 {personalPower} · 花费 {CONTEST_COSTS.personalContest.merit} 功绩{cooldownRemaining > 0 ? ` · 冷却中剩 ${cooldownRemaining} 天` : meritEnough ? ' · 可发起' : ' · 功绩不足'}
            </Text>
            {/* 省级席位控制度 */}
            <View style={{ borderTopWidth: 1, borderTopColor: '#E8DCC0', paddingTop: 6 }}>
              <Text style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>
                省级席位战：{FACTION_LABEL[primary]} 控制 {Math.round(myRatio * 100)}%（{control.factionSeats[primary] ?? 0}/{control.totalSeats} 席）· 获胜阈值 80%
              </Text>
              <View style={{ height: 10, backgroundColor: '#F0EBDD', borderWidth: 1, borderColor: '#D9CFA3', flexDirection: 'row' }}>
                <View style={{ width: `${myRatio * 100}%`, backgroundColor: FACTION_COLOR[primary] }} />
                <View style={{ position: 'absolute', left: `${80}%`, top: -2, bottom: -2, width: 2, backgroundColor: '#8A1515' }} />
              </View>
              <Text style={{ fontSize: 9, color: '#999', marginTop: 4 }}>
                双轨独立：席位战 ≥80% 提前收官 · 个人战仅凭 S_you ≥ S_opp 晋升，互不干扰。
              </Text>
            </View>
          </View>
        );
      })()}

      {/* v5 说明横幅：职位争夺制 */}
      <View style={{ backgroundColor: '#F0F4FA', borderWidth: 1, borderColor: '#B4C6E0', padding: 10 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D3B5E', marginBottom: 4 }}>📌 门槛规则（职位争夺制）</Text>
        <Text style={{ fontSize: 11, color: '#44608A', lineHeight: 17 }}>
          晋升须先在「个人争夺战」赢下目标职位（S_you ≥ S_opp），再通过上方硬门控（功绩/民心/本派关系/无立案/无失势冻结）。请切换到「个人争夺战」页发起争夺。
        </Text>
      </View>

      {/* 争夺力实时预估 */}
      <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 14 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D3B5E', letterSpacing: 2, marginBottom: 10 }}>争夺力预估（S_you vs S_opp）</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#E8EDF5', padding: 10 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#1565C0' }}>{sYou}</Text>
            <Text style={{ fontSize: 9, color: '#666' }}>我方 S_you</Text>
          </View>
          <Text style={{ fontSize: 13, color: '#999', fontWeight: '700' }}>vs</Text>
          <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#FFEBEE', padding: 10 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#C62828' }}>{sOpp}</Text>
            <Text style={{ fontSize: 9, color: '#666' }}>对立派 S_opp</Text>
          </View>
        </View>
        {contest ? (
          <Text style={{ fontSize: 10, color: contestWinning ? '#2E7D32' : '#C62828', marginTop: 8, fontWeight: '600' }}>
            {contest.status === 'active'
              ? contestWinning ? '✅ 当前争夺占优' : '❌ 当前争夺处于劣势'
              : `当前争夺状态：${contest.status}`}
          </Text>
        ) : (
          <Text style={{ fontSize: 10, color: '#999', marginTop: 8 }}>暂无进行中争夺 · 到「个人争夺战」页发起</Text>
        )}
      </View>

      {/* 状态横幅 */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {frozen ? <StatusChip text="⚠ 晋升冻结" color="#C82829" /> : null}
        {windowLocked ? <StatusChip text="⏳ 已超晋升窗口" color="#e67e22" /> : null}
        {!frozen && !windowLocked ? <StatusChip text="✅ 评审通道开放" color="#2a7a3b" /> : null}
      </View>
      {/* 冻结具体原因 */}
      {freezeReason ? (
        <View style={{ backgroundColor: '#FDECEC', borderWidth: 1, borderColor: '#E8B4B4', padding: 10, gap: 4 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#B33A3A', letterSpacing: 0.5 }}>冻结原因</Text>
          <Text style={{ fontSize: 12, color: '#8A2B2B', lineHeight: 18 }}>{freezeReason}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function StatusChip({ text, color }: { text: string; color: string }) {
  return (
    <View style={{ backgroundColor: color + '18', borderWidth: 1, borderColor: color + '55', paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color, fontSize: 11, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}
```

<a id="srccomponentspromotionfactionattackmaptsx"></a>
## `src/components/promotion/FactionAttackMap.tsx`

```tsx
// v5 派系攻夺战地图：全国席位控制度总览 + 各省攻夺进度 + 攻夺按钮
// 所有数字均来自配置对象（PROVINCE_ATTACK_COST / VICTORY_THRESHOLD 等），禁止硬编码
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useGame } from '@/ctx/GameContext';
import {
  PROVINCE_ATTACK_COST,
  VICTORY_THRESHOLD,
  getNationalControl,
  getProvinceAttackProgressOf,
  canLaunchProvinceAttack,
  launchProvinceAttack,
} from '@/lib/provinceSeatSystem';
import { ALL_FACTIONS, FACTION_COLOR, FACTION_LABEL, type FactionId } from '@/types/game';

export function FactionAttackMap() {
  const { save, updateGameSave, refreshSave } = useGame();
  if (!save) return null;

  const primary = (save.primaryFaction || 'reform') as FactionId;
  const { control, seats } = getNationalControl(save);
  const day = save.gameDays;
  const cost = PROVINCE_ATTACK_COST;

  const handleAttack = async (province: string) => {
    const check = canLaunchProvinceAttack(save, province, day);
    if (!check.ok) return;
    const updates = launchProvinceAttack(save, province, day);
    await updateGameSave(updates);
    await refreshSave();
  };

  const myRatio = control.controlRatios[primary] ?? 0;
  const seatCountOf = (province: string) =>
    seats.find(s => s.province === province)?.seatCount ?? 0;

  return (
    <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40, gap: 12 }} showsVerticalScrollIndicator={false}>
      {/* 全国席位控制度总览 */}
      <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D3B5E', letterSpacing: 1 }}>🗺 全国席位控制度</Text>
          <Text style={{ fontSize: 10, color: '#999' }}>共 {control.totalSeats} 席</Text>
        </View>
        {/* 各派按比例着色条 */}
        <View style={{ height: 22, flexDirection: 'row', borderWidth: 1, borderColor: '#D9D9D9' }}>
          {ALL_FACTIONS.map(f => {
            const ratio = control.controlRatios[f] ?? 0;
            if (ratio <= 0) return null;
            return (
              <View
                key={f}
                style={{ width: `${ratio * 100}%`, backgroundColor: FACTION_COLOR[f], justifyContent: 'center', alignItems: 'center' }}
              >
                {ratio >= 0.08 ? (
                  <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>{Math.round(ratio * 100)}%</Text>
                ) : null}
              </View>
            );
          })}
        </View>
        {/* 80% 胜线说明 */}
        <View style={{ position: 'relative', height: 14, marginTop: 4 }}>
          <View style={{ position: 'absolute', left: `${VICTORY_THRESHOLD * 100}%`, top: 0, bottom: 0, width: 2, backgroundColor: '#8A1515' }} />
          <Text style={{ fontSize: 9, color: '#999' }}>
            本派 {FACTION_LABEL[primary]} 控制 {Math.round(myRatio * 100)}%（{control.factionSeats[primary] ?? 0} 席）· 达 {Math.round(VICTORY_THRESHOLD * 100)}% 提前收官
          </Text>
        </View>
        {/* 五派分布 */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {ALL_FACTIONS.map(f => (
            <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 8, height: 8, backgroundColor: FACTION_COLOR[f] }} />
              <Text style={{ fontSize: 9, color: '#666' }}>
                {FACTION_LABEL[f]} {Math.round((control.controlRatios[f] ?? 0) * 100)}%
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* 攻夺花费说明 */}
      <View style={{ backgroundColor: '#FFFCF0', borderWidth: 1, borderColor: '#B8860B', padding: 10 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#8A6D1A', marginBottom: 4 }}>⚔ 派系攻夺战</Text>
        <Text style={{ fontSize: 10, color: '#666', lineHeight: 16 }}>
          每次攻夺消耗 {cost.meritCost} 功绩 · 进度 +{cost.progressPerAttack}（上限 {cost.maxProgress}）· 冷却 {cost.cooldownDays} 天。{'\n'}
          攻夺进度累积可提升本派对各省席位的争夺实力，助力省级席位控制度。
        </Text>
      </View>

      {/* 各省列表 */}
      <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D3B5E', letterSpacing: 1 }}>各省攻夺进度</Text>
      {seats.map(seat => {
        const progress = getProvinceAttackProgressOf(save, seat.province);
        const check = canLaunchProvinceAttack(save, seat.province, day);
        const isFull = progress >= cost.maxProgress;
        const cooldownUntil = save.factionCooldowns?.[`provinceAttack_${seat.province}`] ?? 0;
        const cooldownRemaining = Math.max(0, cooldownUntil - day);
        const disabled = !check.ok;
        return (
          <View key={seat.province} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A' }}>{seat.province}</Text>
                <Text style={{ fontSize: 10, color: '#999', marginTop: 1 }}>
                  {seatCountOf(seat.province)} 席 · 当前控制：{seat.holderFaction ? FACTION_LABEL[seat.holderFaction] : '无'}
                </Text>
              </View>
              <View style={{ backgroundColor: '#E8EDF5', paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#1565C0' }}>{progress}/{cost.maxProgress}</Text>
              </View>
            </View>
            {/* 进度条 */}
            <View style={{ height: 10, backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 8 }}>
              <View style={{ width: `${(progress / cost.maxProgress) * 100}%`, height: '100%', backgroundColor: isFull ? '#2E7D32' : '#1565C0' }} />
            </View>
            <Pressable
              onPress={() => handleAttack(seat.province)}
              disabled={disabled}
              style={{ backgroundColor: disabled ? '#ccc' : '#1565C0', paddingVertical: 10, alignItems: 'center' }}
              android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
            >
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                {isFull
                  ? '已满控制'
                  : cooldownRemaining > 0
                    ? `冷却中（剩 ${cooldownRemaining} 天）`
                    : `发起攻夺（-${cost.meritCost} 功绩）`}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}
```

<a id="srccomponentspromotionpromotionflowtsx"></a>
## `src/components/promotion/PromotionFlow.tsx`

```tsx
// 晋升五步流程：考察谈话 → 民主推荐 → 任职公示 → 任命文件 → 交接赴任
// v4：民主推荐率为软输入参考；个人职位战（10%派系+90%个人）走「职位争夺」独立通道
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { OfficialDocumentModal } from '@/components/OfficialDocumentModal';
import { INTERVIEW_OPTIONS } from '@/lib/promotionConfig';
import { generateDocNo } from '@/lib/promotionEngine';
import { CONTEST_BLEND, CONTEST_COSTS } from '@/lib/provinceSeatSystem';
import type { PlayerSave } from '@/types/game';
import { RANK_CONFIG, getRandomCityForRank } from '@/types/game';

type Step = 'interview' | 'recommend' | 'publicity' | 'appointment' | 'done';

interface Props {
  visible: boolean;
  save: PlayerSave;
  postName: string;
  toRank: number;
  onClose: () => void;
  onComplete: (payload: {
    docNo: string; toRank: number; cityName: string; postName: string;
  }) => void;
}

export function PromotionFlow({ visible, save, postName, toRank, onClose, onComplete }: Props) {
  const [step, setStep] = useState<Step>('interview');
  const [impression, setImpression] = useState(0);
  const [recommendRate, setRecommendRate] = useState(0);
  const [docNo] = useState(() => generateDocNo(save.gameDays));
  const [chosenCity] = useState(() => getRandomCityForRank(toRank > 0 ? toRank : 1));

  const favorAvg = Math.round((save.bossFavor + save.boss2Favor + save.boss3Favor) / 3);

  const handleInterview = (score: number) => {
    setImpression(score);
    const rate = Math.min(95, 40 + score * 8 + favorAvg * 0.3);
    setRecommendRate(Math.round(rate));
    setStep('recommend');
  };

  const handleRecommend = () => {
    if (recommendRate < 60) {
      onComplete({ docNo, toRank: save.rankLevel, cityName: save.cityName, postName: '' });
      return;
    }
    setStep('publicity');
  };

  const handlePublicity = () => setStep('appointment');
  const handleAccept = () => {
    setStep('done');
    onComplete({ docNo, toRank, cityName: chosenCity, postName });
  };

  const close = () => { setStep('interview'); onClose(); };

  return (
    <OfficialDocumentModal
      visible={visible}
      header="组织人事部门"
      title={step === 'interview' ? '组织考察谈话通知'
        : step === 'recommend' ? '民主推荐结果'
        : step === 'publicity' ? '任职公示'
        : step === 'appointment' ? '任职通知'
        : '赴任提示'}
      docNo={step === 'appointment' ? docNo : undefined}
      sealText={step === 'appointment' ? '组织人事部门\n专用章' : undefined}
      dismissable={step === 'done'}
      onClose={close}
      primaryAction={step === 'done' ? { label: '完成赴任', onPress: close } : undefined}
    >
      {step === 'interview' ? (
        <View style={{ gap: 10 }}>
          <Text style={bodyStyle}>经组织研究，拟安排 {save.playerName} 同志进行考察谈话。请结合自身工作实际，选择谈话重点：</Text>
          {INTERVIEW_OPTIONS.map(opt => (
            <Pressable key={opt.key} onPress={() => handleInterview(opt.score)} style={{ borderWidth: 1, borderColor: '#D9D9D9', padding: 12, backgroundColor: '#FFFCF5' }}>
              <Text style={{ fontSize: 13, color: '#1A1A1A', fontWeight: '600' }}>{opt.label}</Text>
              <Text style={{ fontSize: 10, color: '#999', marginTop: 2 }}>印象分 +{opt.score}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {step === 'recommend' ? (
        <View style={{ gap: 10 }}>
          <Text style={bodyStyle}>经民主推荐统计，{save.playerName} 同志的推荐率为：</Text>
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Text style={{ fontSize: 36, fontWeight: '900', color: recommendRate >= 60 ? '#2a7a3b' : '#C82829' }}>{recommendRate}%</Text>
            <Text style={{ fontSize: 11, color: '#999', marginTop: 4 }}>通过线 60%（软输入参考 · 不再一票否决）</Text>
          </View>
          {recommendRate < 60 ? (
            <Text style={{ fontSize: 12, color: '#B8860B', lineHeight: 18 }}>
              推荐率不足 60%（软输入）。本次组织流程中止，但个人职位战通道不受影响——可前往「晋升评审 · 职位争夺」发起个人职位战（派系 {CONTEST_BLEND.faction * 100}% + 个人 {CONTEST_BLEND.personal * 100}%，花费 {CONTEST_COSTS.personalContest.merit} 功绩）。
            </Text>
          ) : null}
          <Pressable onPress={handleRecommend} style={{ backgroundColor: '#C82829', paddingVertical: 12, alignItems: 'center', marginTop: 6 }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{recommendRate >= 60 ? '进入任职公示' : '确认中止'}</Text>
          </Pressable>
        </View>
      ) : null}

      {step === 'publicity' ? (
        <View style={{ gap: 10 }}>
          <Text style={bodyStyle}>现将拟任人选公示如下：</Text>
          <View style={{ backgroundColor: '#F5F0E0', padding: 12, gap: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A' }}>拟任职务：{postName}</Text>
            <Text style={{ fontSize: 11, color: '#666' }}>拟任人选：{save.playerName} 同志</Text>
            <Text style={{ fontSize: 11, color: '#666' }}>公示期：7 个工作日</Text>
            <Text style={{ fontSize: 11, color: '#666' }}>监督电话：12380</Text>
          </View>
          <Pressable onPress={handlePublicity} style={{ backgroundColor: '#C82829', paddingVertical: 12, alignItems: 'center', marginTop: 6 }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>公示无异议，进入任命</Text>
          </Pressable>
        </View>
      ) : null}

      {step === 'appointment' ? (
        <View style={{ gap: 10 }}>
          <Text style={bodyStyle}>经组织研究决定：</Text>
          <Text style={{ fontSize: 13, color: '#1A1A1A', lineHeight: 22 }}>
            任命 {save.playerName} 同志为 {postName}（第 {toRank} 级），任职时间自即日起计算。
          </Text>
          <Text style={{ fontSize: 11, color: '#999', marginTop: 6 }}>请点击「接受任命」完成职位变更。</Text>
          <Pressable onPress={handleAccept} style={{ backgroundColor: '#C82829', paddingVertical: 12, alignItems: 'center', marginTop: 6 }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>接受任命</Text>
          </Pressable>
        </View>
      ) : null}

      {step === 'done' ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#2a7a3b' }}>🎉 赴任成功</Text>
          <Text style={bodyStyle}>你已正式就任 {postName}，赴 {chosenCity} 履新。</Text>
          <Text style={{ fontSize: 11, color: '#999' }}>新职级：第 {toRank} 级 · {RANK_CONFIG[toRank]?.name ?? ''}</Text>
          <Text style={{ fontSize: 11, color: '#e67e22' }}>初来乍到，民心值 -5，进入 90 天扎根期。</Text>
        </View>
      ) : null}
    </OfficialDocumentModal>
  );
}

const bodyStyle = { fontSize: 13, color: '#333', lineHeight: 22 } as const;
```

<a id="srccomponentspromotionrecordstabtsx"></a>
## `src/components/promotion/RecordsTab.tsx`

```tsx
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
```

<a id="srccomponentsuiaccordiontsx"></a>
## `src/components/ui/accordion.tsx`

```tsx
import { Icon } from '@/components/ui/icon';
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as AccordionPrimitive from '@rn-primitives/accordion';
import { ChevronDown } from 'lucide-react-native';
import { Platform, Pressable, View } from 'react-native';
import Animated, {
  FadeOutUp,
  LayoutAnimationConfig,
  LinearTransition,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';

function Accordion({
  children,
  ref,
  ...props
}: Omit<React.ComponentProps<typeof AccordionPrimitive.Root>, 'asChild'>) {
  return (
    <LayoutAnimationConfig skipEntering>
      <AccordionPrimitive.Root
        {...(props as AccordionPrimitive.RootProps)}
        asChild={Platform.OS !== 'web'}>
        <Animated.View layout={LinearTransition.duration(200)}>{children}</Animated.View>
      </AccordionPrimitive.Root>
    </LayoutAnimationConfig>
  );
}

function AccordionItem({
  children,
  className,
  value,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      className={cn(
        'border-border border-b',
        Platform.select({ web: 'last:border-b-0' }),
        className
      )}
      value={value}
      asChild={Platform.OS !== 'web'}
      {...props}>
      <Animated.View
        className="native:overflow-hidden"
        layout={Platform.select({ native: LinearTransition.duration(200) })}>
        {children}
      </Animated.View>
    </AccordionPrimitive.Item>
  );
}

const Trigger = Platform.OS === 'web' ? View : Pressable;

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger> & {
  children?: React.ReactNode;
}) {
  const { isExpanded } = AccordionPrimitive.useItemContext();

  const progress = useDerivedValue(
    () => (isExpanded ? withTiming(1, { duration: 250 }) : withTiming(0, { duration: 200 })),
    [isExpanded]
  );
  const chevronStyle = useAnimatedStyle(
    () => ({
      transform: [{ rotate: `${progress.value * 180}deg` }],
    }),
    [progress]
  );

  return (
    <TextClassContext.Provider
      value={cn(
        'text-left text-sm font-medium',
        Platform.select({ web: 'group-hover:underline' })
      )}>
      <AccordionPrimitive.Header>
        <AccordionPrimitive.Trigger {...props} asChild>
          <Trigger
            className={cn(
              'flex-row items-start justify-between gap-4 rounded-md py-4 disabled:opacity-50',
              Platform.select({
                web: 'focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 outline-none transition-all hover:underline focus-visible:ring-[3px] disabled:pointer-events-none [&[data-state=open]>svg]:rotate-180',
              }),
              className
            )}>
            <>{children}</>
            <Animated.View style={chevronStyle}>
              <Icon
                as={ChevronDown}
                size={16}
                className={cn(
                  'text-muted-foreground shrink-0',
                  Platform.select({
                    web: 'pointer-events-none translate-y-0.5 transition-transform duration-200',
                  })
                )}
              />
            </Animated.View>
          </Trigger>
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
    </TextClassContext.Provider>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  const { isExpanded } = AccordionPrimitive.useItemContext();
  return (
    <TextClassContext.Provider value="text-sm">
      <AccordionPrimitive.Content
        className={cn(
          'overflow-hidden',
          Platform.select({
            web: isExpanded ? 'animate-accordion-down' : 'animate-accordion-up',
          })
        )}
        {...props}>
        <Animated.View
          exiting={Platform.select({ native: FadeOutUp.duration(200) })}
          className={cn('pb-4', className)}>
          {children}
        </Animated.View>
      </AccordionPrimitive.Content>
    </TextClassContext.Provider>
  );
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
```

<a id="srccomponentsuialertdialogtsx"></a>
## `src/components/ui/alert-dialog.tsx`

```tsx
import { buttonTextVariants, buttonVariants } from '@/components/ui/button';
import { NativeOnlyAnimatedView } from '@/components/ui/native-only-animated-view';
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as AlertDialogPrimitive from '@rn-primitives/alert-dialog';
import * as React from 'react';
import { Platform, View, type ViewProps } from 'react-native';
import { FadeIn, FadeOut } from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';

const AlertDialog = AlertDialogPrimitive.Root;

const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

const AlertDialogPortal = AlertDialogPrimitive.Portal;

const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;

function AlertDialogOverlay({
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof AlertDialogPrimitive.Overlay>, 'asChild'> & {
    children?: React.ReactNode;
  }) {
  return (
    <FullWindowOverlay>
      <AlertDialogPrimitive.Overlay
        className={cn(
          'absolute bottom-0 left-0 right-0 top-0 z-50 flex items-center justify-center bg-black/50 p-2',
          Platform.select({
            web: 'animate-in fade-in-0 fixed',
          }),
          className
        )}
        {...props}>
        <NativeOnlyAnimatedView
          entering={FadeIn.duration(200).delay(50)}
          exiting={FadeOut.duration(150)}>
          <>{children}</>
        </NativeOnlyAnimatedView>
      </AlertDialogPrimitive.Overlay>
    </FullWindowOverlay>
  );
}

function AlertDialogContent({
  className,
  portalHost,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content> & {
    portalHost?: string;
  }) {
  return (
    <AlertDialogPortal hostName={portalHost}>
      <AlertDialogOverlay>
        <AlertDialogPrimitive.Content
          className={cn(
            'bg-background border-border z-50 flex w-full max-w-[calc(100%-2rem)] flex-col gap-4 rounded-lg border p-6 shadow-lg shadow-black/5 sm:max-w-lg',
            Platform.select({
              web: 'animate-in fade-in-0 zoom-in-95 duration-200',
            }),
            className
          )}
          {...props}
        />
      </AlertDialogOverlay>
    </AlertDialogPortal>
  );
}

function AlertDialogHeader({ className, ...props }: ViewProps) {
  return (
    <TextClassContext.Provider value="text-center sm:text-left">
      <View className={cn('flex flex-col gap-2', className)} {...props} />
    </TextClassContext.Provider>
  );
}

function AlertDialogFooter({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      className={cn('text-foreground text-lg font-semibold', className)}
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ className })}>
      <AlertDialogPrimitive.Action className={cn(buttonVariants(), className)} {...props} />
    </TextClassContext.Provider>
  );
}

function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ className, variant: 'outline' })}>
      <AlertDialogPrimitive.Cancel
        className={cn(buttonVariants({ variant: 'outline' }), className)}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
};
```

<a id="srccomponentsuialerttsx"></a>
## `src/components/ui/alert.tsx`

```tsx
import { Icon } from '@/components/ui/icon';
import { Text, TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

function Alert({
  className,
  variant,
  children,
  icon,
  iconClassName,
  ...props
}: React.ComponentProps<typeof View> & {
    icon: LucideIcon;
    variant?: 'default' | 'destructive';
    iconClassName?: string;
  }) {
  return (
    <TextClassContext.Provider
      value={cn(
        'text-sm text-foreground',
        variant === 'destructive' && 'text-destructive',
        className
      )}>
      <View
        role="alert"
        className={cn(
          'bg-card border-border relative w-full rounded-lg border px-4 pb-2 pt-3.5',
          className
        )}
        {...props}>
        <View className="absolute left-3.5 top-3">
          <Icon
            as={icon}
            className={cn('size-4', variant === 'destructive' && 'text-destructive', iconClassName)}
          />
        </View>
        {children}
      </View>
    </TextClassContext.Provider>
  );
}

function AlertTitle({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      className={cn('mb-1 ml-0.5 min-h-4 pl-6 font-medium leading-none tracking-tight', className)}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  const textClass = React.useContext(TextClassContext);
  return (
    <Text
      className={cn(
        'text-muted-foreground ml-0.5 pb-1.5 pl-6 text-sm leading-relaxed',
        textClass?.includes('text-destructive') && 'text-destructive/90',
        className
      )}
      {...props}
    />
  );
}

export { Alert, AlertDescription, AlertTitle };
```

<a id="srccomponentsuiaspectratiotsx"></a>
## `src/components/ui/aspect-ratio.tsx`

```tsx
import * as AspectRatioPrimitive from '@rn-primitives/aspect-ratio';

const AspectRatio = AspectRatioPrimitive.Root;

export { AspectRatio };
```

<a id="srccomponentsuiavatartsx"></a>
## `src/components/ui/avatar.tsx`

```tsx
import { cn } from '@/lib/utils';
import * as AvatarPrimitive from '@rn-primitives/avatar';

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      className={cn('relative flex size-8 shrink-0 overflow-hidden rounded-full', className)}
      {...props}
    />
  );
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return <AvatarPrimitive.Image className={cn('aspect-square size-full', className)} {...props} />;
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      className={cn(
        'bg-muted flex size-full flex-row items-center justify-center rounded-full',
        className
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarFallback, AvatarImage };
```

<a id="srccomponentsuibadgetsx"></a>
## `src/components/ui/badge.tsx`

```tsx
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as Slot from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Platform, View } from 'react-native';

const badgeVariants = cva(
  cn(
    'border-border group shrink-0 flex-row items-center justify-center gap-1 overflow-hidden rounded-full border px-2 py-0.5',
    Platform.select({
      web: 'focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive w-fit whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] [&>svg]:pointer-events-none [&>svg]:size-3',
    })
  ),
  {
    variants: {
      variant: {
        default: cn(
          'bg-primary border-transparent',
          Platform.select({ web: '[a&]:hover:bg-primary/90' })
        ),
        secondary: cn(
          'bg-secondary border-transparent',
          Platform.select({ web: '[a&]:hover:bg-secondary/90' })
        ),
        destructive: cn(
          'bg-destructive border-transparent',
          Platform.select({ web: '[a&]:hover:bg-destructive/90' })
        ),
        outline: Platform.select({ web: '[a&]:hover:bg-accent [a&]:hover:text-accent-foreground' }),
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const badgeTextVariants = cva('text-xs font-medium', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      secondary: 'text-secondary-foreground',
      destructive: 'text-white',
      outline: 'text-foreground',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

type BadgeProps = React.ComponentProps<typeof View> & {
    asChild?: boolean;
  } & VariantProps<typeof badgeVariants>;

function Badge({ className, variant, asChild, ...props }: BadgeProps) {
  const Component = asChild ? Slot.View : View;
  return (
    <TextClassContext.Provider value={badgeTextVariants({ variant })}>
      <Component className={cn(badgeVariants({ variant }), className)} {...props} />
    </TextClassContext.Provider>
  );
}

export { Badge, badgeTextVariants, badgeVariants };
export type { BadgeProps };
```

<a id="srccomponentsuibuttontsx"></a>
## `src/components/ui/button.tsx`

```tsx
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Platform, Pressable } from 'react-native';

const buttonVariants = cva(
  cn(
    'group shrink-0 flex-row items-center justify-center gap-2 rounded-md shadow-none',
    Platform.select({
      web: "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive whitespace-nowrap outline-none transition-all focus-visible:ring-[3px] disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    })
  ),
  {
    variants: {
      variant: {
        default: cn(
          'bg-primary active:bg-primary/90 shadow-sm shadow-black/5',
          Platform.select({ web: 'hover:bg-primary/90' })
        ),
        destructive: cn(
          'bg-destructive active:bg-destructive/90 dark:bg-destructive/60 shadow-sm shadow-black/5',
          Platform.select({
            web: 'hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
          })
        ),
        outline: cn(
          'border-border bg-background active:bg-accent dark:bg-input/30 dark:border-input dark:active:bg-input/50 border shadow-sm shadow-black/5',
          Platform.select({
            web: 'hover:bg-accent dark:hover:bg-input/50',
          })
        ),
        secondary: cn(
          'bg-secondary active:bg-secondary/80 shadow-sm shadow-black/5',
          Platform.select({ web: 'hover:bg-secondary/80' })
        ),
        ghost: cn(
          'active:bg-accent dark:active:bg-accent/50',
          Platform.select({ web: 'hover:bg-accent dark:hover:bg-accent/50' })
        ),
        link: '',
      },
      size: {
        default: cn('h-10 px-4 py-2 sm:h-9', Platform.select({ web: 'has-[>svg]:px-3' })),
        sm: cn('h-9 gap-1.5 rounded-md px-3 sm:h-8', Platform.select({ web: 'has-[>svg]:px-2.5' })),
        lg: cn('h-11 rounded-md px-6 sm:h-10', Platform.select({ web: 'has-[>svg]:px-4' })),
        icon: 'h-10 w-10 sm:h-9 sm:w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const buttonTextVariants = cva(
  cn(
    'text-foreground text-sm font-medium',
    Platform.select({ web: 'pointer-events-none transition-colors' })
  ),
  {
    variants: {
      variant: {
        default: 'text-primary-foreground',
        destructive: 'text-white',
        outline: cn(
          'group-active:text-accent-foreground',
          Platform.select({ web: 'group-hover:text-accent-foreground' })
        ),
        secondary: 'text-secondary-foreground',
        ghost: 'group-active:text-accent-foreground',
        link: cn(
          'text-primary group-active:underline',
          Platform.select({ web: 'underline-offset-4 hover:underline group-hover:underline' })
        ),
      },
      size: {
        default: '',
        sm: '',
        lg: '',
        icon: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

type ButtonProps = React.ComponentProps<typeof Pressable> & VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Pressable
        className={cn(props.disabled && 'opacity-50', buttonVariants({ variant, size }), className)}
        role="button"
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
```

<a id="srccomponentsuicardtsx"></a>
## `src/components/ui/card.tsx`

```tsx
import { Text, TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { View } from 'react-native';

function Card({ className, ...props }: React.ComponentProps<typeof View>) {
  return (
    <TextClassContext.Provider value="text-card-foreground">
      <View
        className={cn(
          'bg-card border-border flex flex-col gap-6 rounded-xl border py-6 shadow-sm shadow-black/5',
          className
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<typeof View>) {
  return <View className={cn('flex flex-col gap-1.5 px-6', className)} {...props} />;
}

function CardTitle({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      role="heading"
      aria-level={3}
      className={cn('font-semibold leading-none', className)}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return <Text className={cn('text-muted-foreground text-sm', className)} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<typeof View>) {
  return <View className={cn('px-6', className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<typeof View>) {
  return <View className={cn('flex flex-row items-center px-6', className)} {...props} />;
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
```

<a id="srccomponentsuicheckboxtsx"></a>
## `src/components/ui/checkbox.tsx`

```tsx
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import * as CheckboxPrimitive from '@rn-primitives/checkbox';
import { Check } from 'lucide-react-native';
import { Platform } from 'react-native';

const DEFAULT_HIT_SLOP = 24;

function Checkbox({
  className,
  checkedClassName,
  indicatorClassName,
  iconClassName,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> & {
    checkedClassName?: string;
    indicatorClassName?: string;
    iconClassName?: string;
  }) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'border-input dark:bg-input/30 size-4 shrink-0 rounded-[4px] border shadow-sm shadow-black/5',
        Platform.select({
          web: 'focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive peer cursor-default outline-none transition-shadow focus-visible:ring-[3px] disabled:cursor-not-allowed',
          native: 'overflow-hidden',
        }),
        props.checked && cn('border-primary', checkedClassName),
        props.disabled && 'opacity-50',
        className
      )}
      hitSlop={DEFAULT_HIT_SLOP}
      {...props}>
      <CheckboxPrimitive.Indicator
        className={cn('bg-primary h-full w-full items-center justify-center', indicatorClassName)}>
        <Icon
          as={Check}
          size={12}
          strokeWidth={Platform.OS === 'web' ? 2.5 : 3.5}
          className={cn('text-primary-foreground', iconClassName)}
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
```

<a id="srccomponentsuicollapsibletsx"></a>
## `src/components/ui/collapsible.tsx`

```tsx
import * as CollapsiblePrimitive from '@rn-primitives/collapsible';

const Collapsible = CollapsiblePrimitive.Root;

const CollapsibleTrigger = CollapsiblePrimitive.Trigger;

const CollapsibleContent = CollapsiblePrimitive.Content;

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
```

<a id="srccomponentsuicontextmenutsx"></a>
## `src/components/ui/context-menu.tsx`

```tsx
import { Icon } from '@/components/ui/icon';
import { NativeOnlyAnimatedView } from '@/components/ui/native-only-animated-view';
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as ContextMenuPrimitive from '@rn-primitives/context-menu';
import { Check, ChevronDown, ChevronRight, ChevronUp } from 'lucide-react-native';
import * as React from 'react';
import {
  Platform,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { FadeIn } from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';

const ContextMenu = ContextMenuPrimitive.Root;
const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
const ContextMenuGroup = ContextMenuPrimitive.Group;
const ContextMenuSub = ContextMenuPrimitive.Sub;
const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

function ContextMenuSubTrigger({
  className,
  inset,
  children,
  iconClassName,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubTrigger> & {
    children?: React.ReactNode;
    iconClassName?: string;
    inset?: boolean;
  }) {
  const { open } = ContextMenuPrimitive.useSubContext();
  const icon = Platform.OS === 'web' ? ChevronRight : open ? ChevronUp : ChevronDown;
  return (
    <TextClassContext.Provider
      value={cn(
        'text-sm select-none group-active:text-accent-foreground',
        open && 'text-accent-foreground'
      )}>
      <ContextMenuPrimitive.SubTrigger
        className={cn(
          'active:bg-accent group flex flex-row items-center rounded-sm px-2 py-2 sm:py-1.5',
          Platform.select({
            web: 'focus:bg-accent focus:text-accent-foreground cursor-default outline-none [&_svg]:pointer-events-none',
          }),
          className,
          open && cn('bg-accent', Platform.select({ native: 'mb-1' })),
          inset && 'pl-8'
        )}
        {...props}>
        <>{children}</>
        <Icon as={icon} className={cn('text-foreground ml-auto size-4 shrink-0', iconClassName)} />
      </ContextMenuPrimitive.SubTrigger>
    </TextClassContext.Provider>
  );
}

function ContextMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubContent>) {
  return (
    <NativeOnlyAnimatedView entering={FadeIn}>
      <ContextMenuPrimitive.SubContent
        className={cn(
          'bg-popover border-border overflow-hidden rounded-md border p-1 shadow-lg shadow-black/5',
          Platform.select({
            web: 'animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 fade-in-0 data-[state=closed]:zoom-out-95 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-context-menu-content-transform-origin) z-50 min-w-[8rem]',
          }),
          className
        )}
        {...props}
      />
    </NativeOnlyAnimatedView>
  );
}

const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;

function ContextMenuContent({
  className,
  overlayClassName,
  overlayStyle,
  portalHost,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Content> & {
    overlayStyle?: StyleProp<ViewStyle>;
    overlayClassName?: string;
    portalHost?: string;
  }) {
  return (
    <ContextMenuPrimitive.Portal hostName={portalHost}>
      <FullWindowOverlay>
        <ContextMenuPrimitive.Overlay
          style={Platform.select({
            web: overlayStyle ?? undefined,
            native: overlayStyle
              ? StyleSheet.flatten([
                StyleSheet.absoluteFill,
                overlayStyle as typeof StyleSheet.absoluteFill,
              ])
              : StyleSheet.absoluteFill,
          })}
          className={overlayClassName}>
          <NativeOnlyAnimatedView entering={FadeIn}>
            <TextClassContext.Provider value="text-popover-foreground">
              <ContextMenuPrimitive.Content
                className={cn(
                  'bg-popover border-border min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-lg shadow-black/5',
                  Platform.select({
                    web: cn(
                      'animate-in fade-in-0 zoom-in-95 max-h-(--radix-context-menu-content-available-height) origin-(--radix-context-menu-content-transform-origin) z-50 cursor-default',
                      props.side === 'bottom' && 'slide-in-from-top-2',
                      props.side === 'top' && 'slide-in-from-bottom-2'
                    ),
                  }),
                  className
                )}
                {...props}
              />
            </TextClassContext.Provider>
          </NativeOnlyAnimatedView>
        </ContextMenuPrimitive.Overlay>
      </FullWindowOverlay>
    </ContextMenuPrimitive.Portal>
  );
}

function ContextMenuItem({
  className,
  inset,
  variant,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Item> & {
    className?: string;
    inset?: boolean;
    variant?: 'default' | 'destructive';
  }) {
  return (
    <TextClassContext.Provider
      value={cn(
        'select-none text-sm text-popover-foreground group-active:text-popover-foreground',
        variant === 'destructive' && 'text-destructive group-active:text-destructive'
      )}>
      <ContextMenuPrimitive.Item
        className={cn(
          'active:bg-accent group relative flex flex-row items-center gap-2 rounded-sm px-2 py-2 sm:py-1.5',
          Platform.select({
            web: cn(
              'focus:bg-accent focus:text-accent-foreground cursor-default outline-none data-[disabled]:pointer-events-none',
              variant === 'destructive' && 'focus:bg-destructive/10 dark:focus:bg-destructive/20'
            ),
          }),
          variant === 'destructive' && 'active:bg-destructive/10 dark:active:bg-destructive/20',
          props.disabled && 'opacity-50',
          inset && 'pl-8',
          className
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function ContextMenuCheckboxItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.CheckboxItem> & {
    children?: React.ReactNode;
  }) {
  return (
    <TextClassContext.Provider value="text-sm text-popover-foreground select-none group-active:text-accent-foreground">
      <ContextMenuPrimitive.CheckboxItem
        className={cn(
          'active:bg-accent group relative flex flex-row items-center gap-2 rounded-sm py-2 pl-8 pr-2 sm:py-1.5',
          Platform.select({
            web: 'focus:bg-accent focus:text-accent-foreground cursor-default outline-none data-[disabled]:pointer-events-none',
          }),
          props.disabled && 'opacity-50',
          className
        )}
        {...props}>
        <View className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <ContextMenuPrimitive.ItemIndicator>
            <Icon
              as={Check}
              className={cn(
                'text-foreground size-4',
                Platform.select({ web: 'pointer-events-none' })
              )}
            />
          </ContextMenuPrimitive.ItemIndicator>
        </View>
        <>{children}</>
      </ContextMenuPrimitive.CheckboxItem>
    </TextClassContext.Provider>
  );
}

function ContextMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.RadioItem> & {
    children?: React.ReactNode;
  }) {
  return (
    <TextClassContext.Provider value="text-sm text-popover-foreground select-none group-active:text-accent-foreground">
      <ContextMenuPrimitive.RadioItem
        className={cn(
          'active:bg-accent group relative flex flex-row items-center gap-2 rounded-sm py-2 pl-8 pr-2 sm:py-1.5',
          Platform.select({
            web: 'focus:bg-accent focus:text-accent-foreground cursor-default outline-none data-[disabled]:pointer-events-none',
          }),
          props.disabled && 'opacity-50',
          className
        )}
        {...props}>
        <View className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <ContextMenuPrimitive.ItemIndicator>
            <View className="bg-foreground h-2 w-2 rounded-full" />
          </ContextMenuPrimitive.ItemIndicator>
        </View>
        <>{children}</>
      </ContextMenuPrimitive.RadioItem>
    </TextClassContext.Provider>
  );
}

function ContextMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Label> & {
    className?: string;
    inset?: boolean;
  }) {
  return (
    <ContextMenuPrimitive.Label
      className={cn(
        'text-foreground px-2 py-2 text-sm font-medium sm:py-1.5',
        inset && 'pl-8',
        className
      )}
      {...props}
    />
  );
}

function ContextMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Separator>) {
  return (
    <ContextMenuPrimitive.Separator
      className={cn('bg-border -mx-1 my-1 h-px', className)}
      {...props}
    />
  );
}

function ContextMenuShortcut({ className, ...props }: React.ComponentProps<typeof Text>) {
  return (
    <Text
      className={cn('text-muted-foreground ml-auto text-xs tracking-widest', className)}
      {...props}
    />
  );
}

export {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
};
```

<a id="srccomponentsuidialogtsx"></a>
## `src/components/ui/dialog.tsx`

```tsx
import { Icon } from '@/components/ui/icon';
import { NativeOnlyAnimatedView } from '@/components/ui/native-only-animated-view';
import { cn } from '@/lib/utils';
import * as DialogPrimitive from '@rn-primitives/dialog';
import { X } from 'lucide-react-native';
import * as React from 'react';
import { Platform, Text, View, type ViewProps } from 'react-native';
import { FadeIn, FadeOut } from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;

function DialogOverlay({
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof DialogPrimitive.Overlay>, 'asChild'> & {
    children?: React.ReactNode;
  }) {
  return (
    <FullWindowOverlay>
      <DialogPrimitive.Overlay
        className={cn(
          'absolute bottom-0 left-0 right-0 top-0 flex items-center justify-center bg-black/50 p-2',
          Platform.select({
            web: 'animate-in fade-in-0 fixed cursor-default [&>*]:cursor-auto',
          }),
          className
        )}
        {...props}
        asChild={Platform.OS !== 'web'}>
        <NativeOnlyAnimatedView entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
          <NativeOnlyAnimatedView entering={FadeIn.delay(50)} exiting={FadeOut.duration(150)}>
            <>{children}</>
          </NativeOnlyAnimatedView>
        </NativeOnlyAnimatedView>
      </DialogPrimitive.Overlay>
    </FullWindowOverlay>
  );
}
function DialogContent({
  className,
  portalHost,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
    portalHost?: string;
  }) {
  return (
    <DialogPortal hostName={portalHost}>
      <DialogOverlay>
        <DialogPrimitive.Content
          className={cn(
            'bg-background border-border z-50 mx-auto flex w-full max-w-[calc(100%-2rem)] flex-col gap-4 rounded-lg border p-6 shadow-lg shadow-black/5 sm:max-w-lg',
            Platform.select({
              web: 'animate-in fade-in-0 zoom-in-95 duration-200',
            }),
            className
          )}
          {...props}>
          <>{children}</>
          <DialogPrimitive.Close
            className={cn(
              'absolute right-4 top-4 rounded opacity-70 active:opacity-100',
              Platform.select({
                web: 'ring-offset-background focus:ring-ring data-[state=open]:bg-accent transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2',
              })
            )}
            hitSlop={12}>
            <Icon
              as={X}
              className={cn('text-accent-foreground web:pointer-events-none size-4 shrink-0')}
            />
            <Text className="sr-only">Close</Text>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogOverlay>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: ViewProps) {
  return (
    <View className={cn('flex flex-col gap-2 text-center sm:text-left', className)} {...props} />
  );
}

function DialogFooter({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-foreground text-lg font-semibold leading-none', className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
```

<a id="srccomponentsuidropdownmenutsx"></a>
## `src/components/ui/dropdown-menu.tsx`

```tsx
import { Icon } from '@/components/ui/icon';
import { NativeOnlyAnimatedView } from '@/components/ui/native-only-animated-view';
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as DropdownMenuPrimitive from '@rn-primitives/dropdown-menu';
import { Check, ChevronDown, ChevronRight, ChevronUp } from 'lucide-react-native';
import * as React from 'react';
import {
  Platform,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { FadeIn } from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';

const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  iconClassName,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
    children?: React.ReactNode;
    iconClassName?: string;
    inset?: boolean;
  }) {
  const { open } = DropdownMenuPrimitive.useSubContext();
  const icon = Platform.OS === 'web' ? ChevronRight : open ? ChevronUp : ChevronDown;
  return (
    <TextClassContext.Provider
      value={cn(
        'text-sm select-none group-active:text-accent-foreground',
        open && 'text-accent-foreground'
      )}>
      <DropdownMenuPrimitive.SubTrigger
        className={cn(
          'active:bg-accent group flex flex-row items-center rounded-sm px-2 py-2 sm:py-1.5',
          Platform.select({
            web: 'focus:bg-accent focus:text-accent-foreground cursor-default outline-none [&_svg]:pointer-events-none',
          }),
          className,
          open && 'bg-accent',
          inset && 'pl-8'
        )}
        {...props}>
        <>{children}</>
        <Icon as={icon} className={cn('text-foreground ml-auto size-4 shrink-0', iconClassName)} />
      </DropdownMenuPrimitive.SubTrigger>
    </TextClassContext.Provider>
  );
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <NativeOnlyAnimatedView entering={FadeIn}>
      <DropdownMenuPrimitive.SubContent
        className={cn(
          'bg-popover border-border overflow-hidden rounded-md border p-1 shadow-lg shadow-black/5',
          Platform.select({
            web: 'animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 fade-in-0 data-[state=closed]:zoom-out-95 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-context-menu-content-transform-origin) z-50 min-w-[8rem]',
          }),
          className
        )}
        {...props}
      />
    </NativeOnlyAnimatedView>
  );
}

const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;

function DropdownMenuContent({
  className,
  overlayClassName,
  overlayStyle,
  portalHost,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content> & {
    overlayStyle?: StyleProp<ViewStyle>;
    overlayClassName?: string;
    portalHost?: string;
  }) {
  return (
    <DropdownMenuPrimitive.Portal hostName={portalHost}>
      <FullWindowOverlay>
        <DropdownMenuPrimitive.Overlay
          style={Platform.select({
            web: overlayStyle ?? undefined,
            native: overlayStyle
              ? StyleSheet.flatten([
                StyleSheet.absoluteFill,
                overlayStyle as typeof StyleSheet.absoluteFill,
              ])
              : StyleSheet.absoluteFill,
          })}
          className={overlayClassName}>
          <NativeOnlyAnimatedView entering={FadeIn}>
            <TextClassContext.Provider value="text-popover-foreground">
              <DropdownMenuPrimitive.Content
                className={cn(
                  'bg-popover border-border min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-lg shadow-black/5',
                  Platform.select({
                    web: cn(
                      'animate-in fade-in-0 zoom-in-95 max-h-(--radix-context-menu-content-available-height) origin-(--radix-context-menu-content-transform-origin) z-50 cursor-default',
                      props.side === 'bottom' && 'slide-in-from-top-2',
                      props.side === 'top' && 'slide-in-from-bottom-2'
                    ),
                  }),
                  className
                )}
                {...props}
              />
            </TextClassContext.Provider>
          </NativeOnlyAnimatedView>
        </DropdownMenuPrimitive.Overlay>
      </FullWindowOverlay>
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuItem({
  className,
  inset,
  variant,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
    className?: string;
    inset?: boolean;
    variant?: 'default' | 'destructive';
  }) {
  return (
    <TextClassContext.Provider
      value={cn(
        'select-none text-sm text-popover-foreground group-active:text-popover-foreground',
        variant === 'destructive' && 'text-destructive group-active:text-destructive'
      )}>
      <DropdownMenuPrimitive.Item
        className={cn(
          'active:bg-accent group relative flex flex-row items-center gap-2 rounded-sm px-2 py-2 sm:py-1.5',
          Platform.select({
            web: cn(
              'focus:bg-accent focus:text-accent-foreground cursor-default outline-none data-[disabled]:pointer-events-none',
              variant === 'destructive' && 'focus:bg-destructive/10 dark:focus:bg-destructive/20'
            ),
          }),
          variant === 'destructive' && 'active:bg-destructive/10 dark:active:bg-destructive/20',
          props.disabled && 'opacity-50',
          inset && 'pl-8',
          className
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem> & {
    children?: React.ReactNode;
  }) {
  return (
    <TextClassContext.Provider value="text-sm text-popover-foreground select-none group-active:text-accent-foreground">
      <DropdownMenuPrimitive.CheckboxItem
        className={cn(
          'active:bg-accent group relative flex flex-row items-center gap-2 rounded-sm py-2 pl-8 pr-2 sm:py-1.5',
          Platform.select({
            web: 'focus:bg-accent focus:text-accent-foreground cursor-default outline-none data-[disabled]:pointer-events-none',
          }),
          props.disabled && 'opacity-50',
          className
        )}
        {...props}>
        <View className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <DropdownMenuPrimitive.ItemIndicator>
            <Icon
              as={Check}
              className={cn(
                'text-foreground size-4',
                Platform.select({ web: 'pointer-events-none' })
              )}
            />
          </DropdownMenuPrimitive.ItemIndicator>
        </View>
        <>{children}</>
      </DropdownMenuPrimitive.CheckboxItem>
    </TextClassContext.Provider>
  );
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem> & {
    children?: React.ReactNode;
  }) {
  return (
    <TextClassContext.Provider value="text-sm text-popover-foreground select-none group-active:text-accent-foreground">
      <DropdownMenuPrimitive.RadioItem
        className={cn(
          'active:bg-accent group relative flex flex-row items-center gap-2 rounded-sm py-2 pl-8 pr-2 sm:py-1.5',
          Platform.select({
            web: 'focus:bg-accent focus:text-accent-foreground cursor-default outline-none data-[disabled]:pointer-events-none',
          }),
          props.disabled && 'opacity-50',
          className
        )}
        {...props}>
        <View className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <DropdownMenuPrimitive.ItemIndicator>
            <View className="bg-foreground h-2 w-2 rounded-full" />
          </DropdownMenuPrimitive.ItemIndicator>
        </View>
        <>{children}</>
      </DropdownMenuPrimitive.RadioItem>
    </TextClassContext.Provider>
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
    className?: string;
    inset?: boolean;
  }) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn(
        'text-foreground px-2 py-2 text-sm font-medium sm:py-1.5',
        inset && 'pl-8',
        className
      )}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn('bg-border -mx-1 my-1 h-px', className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<typeof Text>) {
  return (
    <Text
      className={cn('text-muted-foreground ml-auto text-xs tracking-widest', className)}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
```

<a id="srccomponentsuihovercardtsx"></a>
## `src/components/ui/hover-card.tsx`

```tsx
import { NativeOnlyAnimatedView } from '@/components/ui/native-only-animated-view';
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as HoverCardPrimitive from '@rn-primitives/hover-card';
import * as React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { FadeIn, FadeOut } from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';

const HoverCard = HoverCardPrimitive.Root;

const HoverCardTrigger = HoverCardPrimitive.Trigger;

const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;

function HoverCardContent({
  className,
  align = 'center',
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Content>) {
  return (
    <HoverCardPrimitive.Portal>
      <FullWindowOverlay>
        <HoverCardPrimitive.Overlay style={Platform.select({ native: StyleSheet.absoluteFill })}>
          <NativeOnlyAnimatedView entering={FadeIn} exiting={FadeOut}>
            <TextClassContext.Provider value="text-popover-foreground">
              <HoverCardPrimitive.Content
                align={align}
                sideOffset={sideOffset}
                className={cn(
                  'bg-popover border-border outline-hidden z-50 w-64 rounded-md border p-4 shadow-md shadow-black/5',
                  Platform.select({
                    web: cn(
                      'animate-in fade-in-0 zoom-in-95 origin-(--radix-hover-card-content-transform-origin) cursor-default [&>*]:cursor-auto',
                      props.side === 'bottom' && 'slide-in-from-top-2',
                      props.side === 'top' && 'slide-in-from-bottom-2'
                    ),
                  }),
                  className
                )}
                {...props}
              />
            </TextClassContext.Provider>
          </NativeOnlyAnimatedView>
        </HoverCardPrimitive.Overlay>
      </FullWindowOverlay>
    </HoverCardPrimitive.Portal>
  );
}

export { HoverCard, HoverCardContent, HoverCardTrigger };
```

<a id="srccomponentsuiicontsx"></a>
## `src/components/ui/icon.tsx`

```tsx
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import type { LucideIcon, LucideProps } from 'lucide-react-native';
import { cssInterop } from 'nativewind';
import * as React from 'react';

type IconProps = LucideProps & {
  as: LucideIcon;
};

function IconImpl({ as: IconComponent, ...props }: IconProps) {
  return <IconComponent {...props} />;
}

cssInterop(IconImpl, {
  className: {
    target: 'style',
    nativeStyleToProp: {
      height: 'size',
      width: 'size',
    },
  },
});

/**
 * A wrapper component for Lucide icons with Nativewind `className` support via `cssInterop`.
 *
 * This component allows you to render any Lucide icon while applying utility classes
 * using `nativewind`. It avoids the need to wrap or configure each icon individually.
 *
 * @component
 * @example
 * ```tsx
 * import { ArrowRight } from 'lucide-react-native';
 * import { Icon } from '@/registry/components/ui/icon';
 *
 * <Icon as={ArrowRight} className="text-red-500" size={16} />
 * ```
 *
 * @param {LucideIcon} as - The Lucide icon component to render.
 * @param {string} className - Utility classes to style the icon using Nativewind.
 * @param {number} size - Icon size (defaults to 14).
 * @param {...LucideProps} ...props - Additional Lucide icon props passed to the "as" icon.
 */
function Icon({ as: IconComponent, className, size = 14, ...props }: IconProps) {
  const textClass = React.useContext(TextClassContext);
  return (
    <IconImpl
      as={IconComponent}
      className={cn('text-foreground', textClass, className)}
      size={size}
      {...props}
    />
  );
}

export { Icon };
```

<a id="srccomponentsuiinputtsx"></a>
## `src/components/ui/input.tsx`

```tsx
import { cn } from '@/lib/utils';
import { Platform, TextInput } from 'react-native';

function Input({ className, ...props }: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      className={cn(
        'dark:bg-input/30 border-input bg-background text-foreground flex h-10 w-full min-w-0 flex-row items-center rounded-md border px-3 py-1 text-base leading-5 shadow-sm shadow-black/5 sm:h-9',
        props.editable === false &&
          cn(
            'opacity-50',
            Platform.select({ web: 'disabled:pointer-events-none disabled:cursor-not-allowed' })
          ),
        Platform.select({
          web: cn(
            'placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground outline-none transition-[color,box-shadow] md:text-sm',
            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
            'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive'
          ),
          native: 'placeholder:text-muted-foreground/50',
        }),
        className
      )}
      {...props}
    />
  );
}

export { Input };
```

<a id="srccomponentsuilabeltsx"></a>
## `src/components/ui/label.tsx`

```tsx
import { cn } from '@/lib/utils';
import * as LabelPrimitive from '@rn-primitives/label';
import { Platform } from 'react-native';

function Label({
  className,
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  disabled,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Text>) {
  return (
    <LabelPrimitive.Root
      className={cn(
        'flex select-none flex-row items-center gap-2',
        Platform.select({
          web: 'cursor-default leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50',
        }),
        disabled && 'opacity-50'
      )}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}>
      <LabelPrimitive.Text
        className={cn(
          'text-foreground text-sm font-medium',
          Platform.select({ web: 'leading-none' }),
          className
        )}
        {...props}
      />
    </LabelPrimitive.Root>
  );
}

export { Label };
```

<a id="srccomponentsuimenubartsx"></a>
## `src/components/ui/menubar.tsx`

```tsx
import { Icon } from '@/components/ui/icon';
import { NativeOnlyAnimatedView } from '@/components/ui/native-only-animated-view';
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as MenubarPrimitive from '@rn-primitives/menubar';
import { Portal } from '@rn-primitives/portal';
import { Check, ChevronDown, ChevronRight, ChevronUp } from 'lucide-react-native';
import * as React from 'react';
import {
  Platform,
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { FadeIn } from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';

const MenubarMenu = MenubarPrimitive.Menu;

const MenubarGroup = MenubarPrimitive.Group;

const MenubarPortal = MenubarPrimitive.Portal;

const MenubarSub = MenubarPrimitive.Sub;

const MenubarRadioGroup = MenubarPrimitive.RadioGroup;

const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;

function Menubar({
  className,
  value: valueProp,
  onValueChange: onValueChangeProp,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Root>) {
  const id = React.useId();
  const [value, setValue] = React.useState<string | undefined>(undefined);

  function closeMenu() {
    if (onValueChangeProp) {
      onValueChangeProp(undefined);
      return;
    }
    setValue(undefined);
  }

  return (
    <>
      {Platform.OS !== 'web' && (value || valueProp) ? (
        <Portal name={`menubar-overlay-${id}`}>
          <Pressable onPress={closeMenu} style={StyleSheet.absoluteFill} />
        </Portal>
      ) : null}
      <MenubarPrimitive.Root
        className={cn(
          'bg-background border-border flex h-10 flex-row items-center gap-1 rounded-md border p-1 shadow-sm shadow-black/5 sm:h-9',
          className
        )}
        value={value ?? valueProp}
        onValueChange={onValueChangeProp ?? setValue}
        {...props}
      />
    </>
  );
}

function MenubarTrigger({
  className,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Trigger>) {
  const { value } = MenubarPrimitive.useRootContext();
  const { value: itemValue } = MenubarPrimitive.useMenuContext();

  return (
    <TextClassContext.Provider
      value={cn(
        'text-sm font-medium select-none group-active:text-accent-foreground',
        value === itemValue && 'text-accent-foreground'
      )}>
      <MenubarPrimitive.Trigger
        className={cn(
          'group flex items-center rounded-md px-2 py-1.5 sm:py-1',
          Platform.select({
            web: 'focus:bg-accent focus:text-accent-foreground cursor-default outline-none',
          }),
          value === itemValue && 'bg-accent',
          className
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function MenubarSubTrigger({
  className,
  inset,
  children,
  iconClassName,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.SubTrigger> & {
    children?: React.ReactNode;
    iconClassName?: string;
    inset?: boolean;
  }) {
  const { open } = MenubarPrimitive.useSubContext();
  const icon = Platform.OS === 'web' ? ChevronRight : open ? ChevronUp : ChevronDown;
  return (
    <TextClassContext.Provider
      value={cn(
        'text-sm select-none group-active:text-accent-foreground',
        open && 'text-accent-foreground'
      )}>
      <MenubarPrimitive.SubTrigger
        className={cn(
          'active:bg-accent group flex flex-row items-center rounded-sm px-2 py-2 sm:py-1.5',
          Platform.select({
            web: 'focus:bg-accent focus:text-accent-foreground cursor-default outline-none [&_svg]:pointer-events-none',
          }),
          className,
          open && 'bg-accent',
          inset && 'pl-8'
        )}
        {...props}>
        <>{children}</>
        <Icon as={icon} className={cn('text-foreground ml-auto size-4 shrink-0', iconClassName)} />
      </MenubarPrimitive.SubTrigger>
    </TextClassContext.Provider>
  );
}

function MenubarSubContent({
  className,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.SubContent>) {
  return (
    <NativeOnlyAnimatedView entering={FadeIn}>
      <MenubarPrimitive.SubContent
        className={cn(
          'bg-popover border-border overflow-hidden rounded-md border p-1 shadow-lg shadow-black/5',
          Platform.select({
            web: 'animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 fade-in-0 data-[state=closed]:zoom-out-95 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-context-menu-content-transform-origin) z-50 min-w-[8rem]',
          }),
          className
        )}
        {...props}
      />
    </NativeOnlyAnimatedView>
  );
}

function MenubarContent({
  className,
  portalHost,
  align = 'start',
  alignOffset = -4,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Content> & {
    portalHost?: string;
  }) {
  return (
    <MenubarPrimitive.Portal hostName={portalHost}>
      <FullWindowOverlay>
        <NativeOnlyAnimatedView
          entering={FadeIn}
          style={StyleSheet.absoluteFill}
          pointerEvents="box-none">
          <TextClassContext.Provider value="text-popover-foreground">
            <MenubarPrimitive.Content
              className={cn(
                'bg-popover border-border min-w-[12rem] overflow-hidden rounded-md border p-1 shadow-lg shadow-black/5',
                Platform.select({
                  web: cn(
                    'animate-in fade-in-0 zoom-in-95 max-h-(--radix-context-menu-content-available-height) origin-(--radix-context-menu-content-transform-origin) z-50 cursor-default',
                    props.side === 'bottom' && 'slide-in-from-top-2',
                    props.side === 'top' && 'slide-in-from-bottom-2'
                  ),
                }),
                className
              )}
              align={align}
              alignOffset={alignOffset}
              sideOffset={sideOffset}
              {...props}
            />
          </TextClassContext.Provider>
        </NativeOnlyAnimatedView>
      </FullWindowOverlay>
    </MenubarPrimitive.Portal>
  );
}

function MenubarItem({
  className,
  inset,
  variant,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Item> & {
    className?: string;
    inset?: boolean;
    variant?: 'default' | 'destructive';
  }) {
  return (
    <TextClassContext.Provider
      value={cn(
        'select-none text-sm text-popover-foreground group-active:text-popover-foreground',
        variant === 'destructive' && 'text-destructive group-active:text-destructive'
      )}>
      <MenubarPrimitive.Item
        className={cn(
          'active:bg-accent group relative flex flex-row items-center gap-2 rounded-sm px-2 py-2 sm:py-1.5',
          Platform.select({
            web: cn(
              'focus:bg-accent focus:text-accent-foreground cursor-default outline-none data-[disabled]:pointer-events-none',
              variant === 'destructive' && 'focus:bg-destructive/10 dark:focus:bg-destructive/20'
            ),
          }),
          variant === 'destructive' && 'active:bg-destructive/10 dark:active:bg-destructive/20',
          props.disabled && 'opacity-50',
          inset && 'pl-8',
          className
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function MenubarCheckboxItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.CheckboxItem> & {
    children?: React.ReactNode;
  }) {
  return (
    <TextClassContext.Provider value="text-sm text-popover-foreground select-none group-active:text-accent-foreground">
      <MenubarPrimitive.CheckboxItem
        className={cn(
          'active:bg-accent group relative flex flex-row items-center gap-2 rounded-sm py-2 pl-8 pr-2 sm:py-1.5',
          Platform.select({
            web: 'focus:bg-accent focus:text-accent-foreground cursor-default outline-none data-[disabled]:pointer-events-none',
          }),
          props.disabled && 'opacity-50',
          className
        )}
        {...props}>
        <View className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <MenubarPrimitive.ItemIndicator>
            <Icon
              as={Check}
              className={cn(
                'text-foreground size-4',
                Platform.select({ web: 'pointer-events-none' })
              )}
            />
          </MenubarPrimitive.ItemIndicator>
        </View>
        <>{children}</>
      </MenubarPrimitive.CheckboxItem>
    </TextClassContext.Provider>
  );
}

function MenubarRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.RadioItem> & {
    children?: React.ReactNode;
  }) {
  return (
    <TextClassContext.Provider value="text-sm text-popover-foreground select-none group-active:text-accent-foreground">
      <MenubarPrimitive.RadioItem
        className={cn(
          'active:bg-accent group relative flex flex-row items-center gap-2 rounded-sm py-2 pl-8 pr-2 sm:py-1.5',
          Platform.select({
            web: 'focus:bg-accent focus:text-accent-foreground cursor-default outline-none data-[disabled]:pointer-events-none',
          }),
          props.disabled && 'opacity-50',
          className
        )}
        {...props}>
        <View className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <MenubarPrimitive.ItemIndicator>
            <View className="bg-foreground h-2 w-2 rounded-full" />
          </MenubarPrimitive.ItemIndicator>
        </View>
        <>{children}</>
      </MenubarPrimitive.RadioItem>
    </TextClassContext.Provider>
  );
}

function MenubarLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Label> & {
    className?: string;
    inset?: boolean;
  }) {
  return (
    <MenubarPrimitive.Label
      className={cn(
        'text-foreground px-2 py-2 text-sm font-medium sm:py-1.5',
        inset && 'pl-8',
        className
      )}
      {...props}
    />
  );
}

function MenubarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof MenubarPrimitive.Separator>) {
  return (
    <MenubarPrimitive.Separator className={cn('bg-border -mx-1 my-1 h-px', className)} {...props} />
  );
}

function MenubarShortcut({ className, ...props }: React.ComponentProps<typeof Text>) {
  return (
    <Text
      className={cn('text-muted-foreground ml-auto text-xs tracking-widest', className)}
      {...props}
    />
  );
}

export {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarPortal,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
};
```

<a id="srccomponentsuinativeonlyanimatedviewtsx"></a>
## `src/components/ui/native-only-animated-view.tsx`

```tsx
import { Platform } from 'react-native';
import Animated from 'react-native-reanimated';

/**
 * This component is used to wrap animated views that should only be animated on native.
 * @param props - The props for the animated view.
 * @returns The animated view if the platform is native, otherwise the children.
 * @example
 * <NativeOnlyAnimatedView entering={FadeIn} exiting={FadeOut}>
 *   <Text>I am only animated on native</Text>
 * </NativeOnlyAnimatedView>
 */
function NativeOnlyAnimatedView(
  props: React.ComponentProps<typeof Animated.View>
) {
  if (Platform.OS === 'web') {
    return <>{props.children as React.ReactNode}</>;
  } else {
    return <Animated.View {...props} />;
  }
}

export { NativeOnlyAnimatedView };
```

<a id="srccomponentsuipopovertsx"></a>
## `src/components/ui/popover.tsx`

```tsx
import { NativeOnlyAnimatedView } from '@/components/ui/native-only-animated-view';
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as PopoverPrimitive from '@rn-primitives/popover';
import * as React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { FadeIn, FadeOut } from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;

function PopoverContent({
  className,
  align = 'center',
  sideOffset = 4,
  portalHost,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & {
    portalHost?: string;
  }) {
  return (
    <PopoverPrimitive.Portal hostName={portalHost}>
      <FullWindowOverlay>
        <PopoverPrimitive.Overlay style={Platform.select({ native: StyleSheet.absoluteFill })}>
          <NativeOnlyAnimatedView entering={FadeIn.duration(200)} exiting={FadeOut}>
            <TextClassContext.Provider value="text-popover-foreground">
              <PopoverPrimitive.Content
                align={align}
                sideOffset={sideOffset}
                className={cn(
                  'bg-popover border-border outline-hidden z-50 w-72 rounded-md border p-4 shadow-md shadow-black/5',
                  Platform.select({
                    web: cn(
                      'animate-in fade-in-0 zoom-in-95 origin-(--radix-popover-content-transform-origin) cursor-auto',
                      props.side === 'bottom' && 'slide-in-from-top-2',
                      props.side === 'top' && 'slide-in-from-bottom-2'
                    ),
                  }),
                  className
                )}
                {...props}
              />
            </TextClassContext.Provider>
          </NativeOnlyAnimatedView>
        </PopoverPrimitive.Overlay>
      </FullWindowOverlay>
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverContent, PopoverTrigger };
```

<a id="srccomponentsuiprogresstsx"></a>
## `src/components/ui/progress.tsx`

```tsx
import { cn } from '@/lib/utils';
import * as ProgressPrimitive from '@rn-primitives/progress';
import { Platform, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';

function Progress({
  className,
  value,
  indicatorClassName,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  indicatorClassName?: string;
}) {
  return (
    <ProgressPrimitive.Root
      className={cn('bg-primary/20 relative h-2 w-full overflow-hidden rounded-full', className)}
      {...props}>
      <Indicator value={value} className={indicatorClassName} />
    </ProgressPrimitive.Root>
  );
}

export { Progress };

const Indicator = Platform.select({
  web: WebIndicator,
  native: NativeIndicator,
  default: NullIndicator,
});

type IndicatorProps = {
  value: number | undefined | null;
  className?: string;
};

function WebIndicator({ value, className }: IndicatorProps) {
  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View
      className={cn('bg-primary h-full w-full flex-1 transition-all', className)}
      style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}>
      <ProgressPrimitive.Indicator className={cn('h-full w-full', className)} />
    </View>
  );
}

function NativeIndicator({ value, className }: IndicatorProps) {
  const progress = useDerivedValue(() => value ?? 0);

  const indicator = useAnimatedStyle(() => {
    return {
      width: withSpring(
        `${interpolate(progress.value, [0, 100], [1, 100], Extrapolation.CLAMP)}%`,
        { overshootClamping: true }
      ),
    };
  }, [value]);

  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <ProgressPrimitive.Indicator asChild>
      <Animated.View style={indicator} className={cn('bg-foreground h-full', className)} />
    </ProgressPrimitive.Indicator>
  );
}

function NullIndicator(_props: IndicatorProps) {
  return null;
}
```

<a id="srccomponentsuiradiogrouptsx"></a>
## `src/components/ui/radio-group.tsx`

```tsx
import { cn } from '@/lib/utils';
import * as RadioGroupPrimitive from '@rn-primitives/radio-group';
import { Platform } from 'react-native';

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return <RadioGroupPrimitive.Root className={cn('gap-3', className)} {...props} />;
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        'border-input dark:bg-input/30 aspect-square size-4 shrink-0 items-center justify-center rounded-full border shadow-sm shadow-black/5',
        Platform.select({
          web: 'focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive outline-none transition-all focus-visible:ring-[3px] disabled:cursor-not-allowed',
        }),
        props.disabled && 'opacity-50',
        className
      )}
      {...props}>
      <RadioGroupPrimitive.Indicator className="bg-primary size-2 rounded-full" />
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };
```

<a id="srccomponentsuiselecttsx"></a>
## `src/components/ui/select.tsx`

```tsx
import { Icon } from '@/components/ui/icon';
import { NativeOnlyAnimatedView } from '@/components/ui/native-only-animated-view';
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as SelectPrimitive from '@rn-primitives/select';
import { Check, ChevronDown, ChevronDownIcon, ChevronUpIcon } from 'lucide-react-native';
import * as React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { FadeIn, FadeOut } from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';

type Option = SelectPrimitive.Option;

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

function SelectValue({
  ref,
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value> & {
    className?: string;
  }) {
  const { value } = SelectPrimitive.useRootContext();
  return (
    <SelectPrimitive.Value
      ref={ref}
      className={cn(
        'text-foreground line-clamp-1 flex flex-row items-center gap-2 text-sm',
        !value && 'text-muted-foreground',
        className
      )}
      {...props}
    />
  );
}

function SelectTrigger({
  ref,
  className,
  children,
  size = 'default',
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
    children?: React.ReactNode;
    size?: 'default' | 'sm';
  }) {
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        'border-input dark:bg-input/30 dark:active:bg-input/50 bg-background flex h-10 flex-row items-center justify-between gap-2 rounded-md border px-3 py-2 shadow-sm shadow-black/5 sm:h-9',
        Platform.select({
          web: 'focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:hover:bg-input/50 w-fit whitespace-nowrap text-sm outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0',
        }),
        props.disabled && 'opacity-50',
        size === 'sm' && 'h-8 py-2 sm:py-1.5',
        className
      )}
      {...props}>
      <>{children}</>
      <Icon as={ChevronDown} aria-hidden={true} className="text-muted-foreground size-4" />
    </SelectPrimitive.Trigger>
  );
}

const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;

function SelectContent({
  className,
  children,
  position = 'popper',
  portalHost,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content> & {
    className?: string;
    portalHost?: string;
  }) {
  return (
    <SelectPrimitive.Portal hostName={portalHost}>
      <FullWindowOverlay>
        <SelectPrimitive.Overlay style={Platform.select({ native: StyleSheet.absoluteFill })}>
          <TextClassContext.Provider value="text-popover-foreground">
            <NativeOnlyAnimatedView className="z-50" entering={FadeIn} exiting={FadeOut}>
              <SelectPrimitive.Content
                className={cn(
                  'bg-popover border-border relative z-50 min-w-[8rem] rounded-md border shadow-md shadow-black/5',
                  Platform.select({
                    web: cn(
                      'animate-in fade-in-0 zoom-in-95 origin-(--radix-select-content-transform-origin) max-h-52 overflow-y-auto overflow-x-hidden',
                      props.side === 'bottom' && 'slide-in-from-top-2',
                      props.side === 'top' && 'slide-in-from-bottom-2'
                    ),
                    native: 'p-1',
                  }),
                  position === 'popper' &&
                  Platform.select({
                    web: cn(
                      props.side === 'bottom' && 'translate-y-1',
                      props.side === 'top' && '-translate-y-1'
                    ),
                  }),
                  className
                )}
                position={position}
                {...props}>
                <SelectScrollUpButton />
                <SelectPrimitive.Viewport
                  className={cn(
                    'p-1',
                    position === 'popper' &&
                    cn(
                      'w-full',
                      Platform.select({
                        web: 'h-[var(--radix-select-trigger-height)] min-w-[var(--radix-select-trigger-width)]',
                      })
                    )
                  )}>
                  {children}
                </SelectPrimitive.Viewport>
                <SelectScrollDownButton />
              </SelectPrimitive.Content>
            </NativeOnlyAnimatedView>
          </TextClassContext.Provider>
        </SelectPrimitive.Overlay>
      </FullWindowOverlay>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      className={cn('text-muted-foreground px-2 py-2 text-xs sm:py-1.5', className)}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'active:bg-accent group relative flex w-full flex-row items-center gap-2 rounded-sm py-2 pl-2 pr-8 sm:py-1.5',
        Platform.select({
          web: 'focus:bg-accent focus:text-accent-foreground *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2 cursor-default outline-none data-[disabled]:pointer-events-none [&_svg]:pointer-events-none',
        }),
        props.disabled && 'opacity-50',
        className
      )}
      {...props}>
      <View className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Icon as={Check} className="text-muted-foreground size-4 shrink-0" />
        </SelectPrimitive.ItemIndicator>
      </View>
      <SelectPrimitive.ItemText className="text-foreground group-active:text-accent-foreground select-none text-sm" />
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      className={cn(
        'bg-border -mx-1 my-1 h-px',
        Platform.select({ web: 'pointer-events-none' }),
        className
      )}
      {...props}
    />
  );
}

/**
 * @platform Web only
 * Returns null on native platforms
 */
function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  if (Platform.OS !== 'web') {
    return null;
  }
  return (
    <SelectPrimitive.ScrollUpButton
      className={cn('flex cursor-default items-center justify-center py-1', className)}
      {...props}>
      <Icon as={ChevronUpIcon} className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}

/**
 * @platform Web only
 * Returns null on native platforms
 */
function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  if (Platform.OS !== 'web') {
    return null;
  }
  return (
    <SelectPrimitive.ScrollDownButton
      className={cn('flex cursor-default items-center justify-center py-1', className)}
      {...props}>
      <Icon as={ChevronDownIcon} className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}



export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  type Option,
};
```

<a id="srccomponentsuiseparatortsx"></a>
## `src/components/ui/separator.tsx`

```tsx
import { cn } from '@/lib/utils';
import * as SeparatorPrimitive from '@rn-primitives/separator';

function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'bg-border shrink-0',
        orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
        className
      )}
      {...props}
    />
  );
}

export { Separator };
```

<a id="srccomponentsuiskeletontsx"></a>
## `src/components/ui/skeleton.tsx`

```tsx
import { cn } from '@/lib/utils';
import { View } from 'react-native';

function Skeleton({
  className,
  ...props
}: React.ComponentProps<typeof View>) {
  return <View className={cn('bg-accent animate-pulse rounded-md', className)} {...props} />;
}

export { Skeleton };
```

<a id="srccomponentsuiswitchtsx"></a>
## `src/components/ui/switch.tsx`

```tsx
import { cn } from '@/lib/utils';
import * as SwitchPrimitives from '@rn-primitives/switch';
import { Platform } from 'react-native';

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitives.Root>) {
  return (
    <SwitchPrimitives.Root
      className={cn(
        'flex h-[1.15rem] w-8 shrink-0 flex-row items-center rounded-full border border-transparent shadow-sm shadow-black/5',
        Platform.select({
          web: 'focus-visible:border-ring focus-visible:ring-ring/50 peer inline-flex outline-none transition-all focus-visible:ring-[3px] disabled:cursor-not-allowed',
        }),
        props.checked ? 'bg-primary' : 'bg-input dark:bg-input/80',
        props.disabled && 'opacity-50',
        className
      )}
      {...props}>
      <SwitchPrimitives.Thumb
        className={cn(
          'bg-background size-4 rounded-full transition-transform',
          Platform.select({
            web: 'pointer-events-none block ring-0',
          }),
          props.checked
            ? 'dark:bg-primary-foreground translate-x-3.5'
            : 'dark:bg-foreground translate-x-0'
        )}
      />
    </SwitchPrimitives.Root>
  );
}

export { Switch };
```

<a id="srccomponentsuitabstsx"></a>
## `src/components/ui/tabs.tsx`

```tsx
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as TabsPrimitive from '@rn-primitives/tabs';
import { Platform } from 'react-native';

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root className={cn('flex flex-col gap-2', className)} {...props} />;
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'bg-muted flex h-9 flex-row items-center justify-center rounded-lg p-[3px]',
        Platform.select({ web: 'inline-flex w-fit', native: 'mr-auto' }),
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const { value } = TabsPrimitive.useRootContext();
  return (
    <TextClassContext.Provider
      value={cn(
        'text-foreground dark:text-muted-foreground text-sm font-medium',
        value === props.value && 'dark:text-foreground'
      )}>
      <TabsPrimitive.Trigger
        className={cn(
          'flex h-[calc(100%-1px)] flex-row items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 shadow-none shadow-black/5',
          Platform.select({
            web: 'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring inline-flex cursor-default whitespace-nowrap transition-[color,box-shadow] focus-visible:outline-1 focus-visible:ring-[3px] disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
          }),
          props.disabled && 'opacity-50',
          props.value === value && 'bg-background dark:border-foreground/10 dark:bg-input/30',
          className
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn(Platform.select({ web: 'flex-1 outline-none' }), className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
```

<a id="srccomponentsuitexttsx"></a>
## `src/components/ui/text.tsx`

```tsx
import { cn } from '@/lib/utils';
import * as Slot from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Platform, Text as RNText, type Role } from 'react-native';

const textVariants = cva(
  cn(
    'text-foreground text-base',
    Platform.select({
      web: 'select-text',
    })
  ),
  {
    variants: {
      variant: {
        default: '',
        h1: cn(
          'text-center text-4xl font-extrabold tracking-tight',
          Platform.select({ web: 'scroll-m-20 text-balance' })
        ),
        h2: cn(
          'border-border border-b pb-2 text-3xl font-semibold tracking-tight',
          Platform.select({ web: 'scroll-m-20 first:mt-0' })
        ),
        h3: cn('text-2xl font-semibold tracking-tight', Platform.select({ web: 'scroll-m-20' })),
        h4: cn('text-xl font-semibold tracking-tight', Platform.select({ web: 'scroll-m-20' })),
        p: 'mt-3 leading-7 sm:mt-6',
        blockquote: 'mt-4 border-l-2 pl-3 italic sm:mt-6 sm:pl-6',
        code: cn(
          'bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold'
        ),
        lead: 'text-muted-foreground text-xl',
        large: 'text-lg font-semibold',
        small: 'text-sm font-medium leading-none',
        muted: 'text-muted-foreground text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

type TextVariantProps = VariantProps<typeof textVariants>;

type TextVariant = NonNullable<TextVariantProps['variant']>;

const ROLE: Partial<Record<TextVariant, Role>> = {
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  blockquote: Platform.select({ web: 'blockquote' as Role }),
  code: Platform.select({ web: 'code' as Role }),
};

const ARIA_LEVEL: Partial<Record<TextVariant, string>> = {
  h1: '1',
  h2: '2',
  h3: '3',
  h4: '4',
};

const TextClassContext = React.createContext<string | undefined>(undefined);

function Text({
  className,
  asChild = false,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof RNText> &
  TextVariantProps & {
    asChild?: boolean;
  }) {
  const textClass = React.useContext(TextClassContext);
  const Component = asChild ? Slot.Text : RNText;
  return (
    <Component
      className={cn(textVariants({ variant }), textClass, className)}
      role={variant ? ROLE[variant] : undefined}
      aria-level={variant ? ARIA_LEVEL[variant] : undefined}
      {...props}
    />
  );
}

export { Text, TextClassContext };
```

<a id="srccomponentsuitextareatsx"></a>
## `src/components/ui/textarea.tsx`

```tsx
import { cn } from '@/lib/utils';
import { Platform, TextInput } from 'react-native';

function Textarea({
  className,
  multiline = true,
  numberOfLines = Platform.select({ web: 2, native: 8 }), // On web, numberOfLines also determines initial height. On native, it determines the maximum height.
  placeholderClassName,
  ...props
}: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      className={cn(
        'text-foreground border-input dark:bg-input/30 flex min-h-16 w-full flex-row rounded-md border bg-transparent px-3 py-2 text-base shadow-sm shadow-black/5 md:text-sm',
        Platform.select({
          web: 'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive field-sizing-content resize-y outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:cursor-not-allowed',
        }),
        props.editable === false && 'opacity-50',
        className
      )}
      placeholderClassName={cn('text-muted-foreground', placeholderClassName)}
      multiline={multiline}
      numberOfLines={numberOfLines}
      textAlignVertical="top"
      {...props}
    />
  );
}

export { Textarea };
```

<a id="srccomponentsuitogglegrouptsx"></a>
## `src/components/ui/toggle-group.tsx`

```tsx
import { Icon } from '@/components/ui/icon';
import { TextClassContext } from '@/components/ui/text';
import { toggleVariants } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';
import * as ToggleGroupPrimitive from '@rn-primitives/toggle-group';
import type { VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Platform } from 'react-native';

const ToggleGroupContext = React.createContext<VariantProps<typeof toggleVariants> | null>(null);

function ToggleGroup({
  className,
  variant,
  size,
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <ToggleGroupPrimitive.Root
      className={cn(
        'flex flex-row items-center rounded-md shadow-none',
        Platform.select({ web: 'w-fit' }),
        variant === 'outline' && 'shadow-sm shadow-black/5',
        className
      )}
      {...props}>
      <ToggleGroupContext.Provider value={{ variant, size }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

function useToggleGroupContext() {
  const context = React.useContext(ToggleGroupContext);
  if (context === null) {
    throw new Error(
      'ToggleGroup compound components cannot be rendered outside the ToggleGroup component'
    );
  }
  return context;
}

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  isFirst,
  isLast,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> &
  VariantProps<typeof toggleVariants> & {
    isFirst?: boolean;
    isLast?: boolean;
  }) {
  const context = useToggleGroupContext();
  const { value } = ToggleGroupPrimitive.useRootContext();

  return (
    <TextClassContext.Provider
      value={cn(
        'text-sm text-foreground font-medium',
        ToggleGroupPrimitive.utils.getIsSelected(value, props.value)
          ? 'text-accent-foreground'
          : Platform.select({ web: 'group-hover:text-muted-foreground' })
      )}>
      <ToggleGroupPrimitive.Item
        className={cn(
          toggleVariants({
            variant: context.variant || variant,
            size: context.size || size,
          }),
          props.disabled && 'opacity-50',
          ToggleGroupPrimitive.utils.getIsSelected(value, props.value) && 'bg-accent',
          'min-w-0 shrink-0 rounded-none shadow-none',
          isFirst && 'rounded-l-md',
          isLast && 'rounded-r-md',
          (context.variant === 'outline' || variant === 'outline') && 'border-l-0',
          (context.variant === 'outline' || variant === 'outline') && isFirst && 'border-l',
          Platform.select({
            web: 'flex-1 focus:z-10 focus-visible:z-10',
          }),
          className
        )}
        {...props}>
        {children}
      </ToggleGroupPrimitive.Item>
    </TextClassContext.Provider>
  );
}

function ToggleGroupIcon({ className, ...props }: React.ComponentProps<typeof Icon>) {
  const textClass = React.useContext(TextClassContext);
  return <Icon className={cn('size-4 shrink-0', textClass, className)} {...props} />;
}

export { ToggleGroup, ToggleGroupIcon, ToggleGroupItem };
```

<a id="srccomponentsuitoggletsx"></a>
## `src/components/ui/toggle.tsx`

```tsx
import { Icon } from '@/components/ui/icon';
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as TogglePrimitive from '@rn-primitives/toggle';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Platform } from 'react-native';

const toggleVariants = cva(
  cn(
    'active:bg-muted group flex flex-row items-center justify-center gap-2 rounded-md',
    Platform.select({
      web: 'hover:bg-muted hover:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex cursor-default whitespace-nowrap outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:pointer-events-none [&_svg]:pointer-events-none',
    })
  ),
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        outline: cn(
          'border-input active:bg-accent border bg-transparent shadow-sm shadow-black/5',
          Platform.select({
            web: 'hover:bg-accent hover:text-accent-foreground',
          })
        ),
      },
      size: {
        default: 'h-10 min-w-10 px-2.5 sm:h-9 sm:min-w-9 sm:px-2',
        sm: 'h-9 min-w-9 px-2 sm:h-8 sm:min-w-8 sm:px-1.5',
        lg: 'h-11 min-w-11 px-3 sm:h-10 sm:min-w-10 sm:px-2.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return (
    <TextClassContext.Provider
      value={cn(
        'text-sm text-foreground font-medium',
        props.pressed
          ? 'text-accent-foreground'
          : Platform.select({ web: 'group-hover:text-muted-foreground' }),
        className
      )}>
      <TogglePrimitive.Root
        className={cn(
          toggleVariants({ variant, size }),
          props.disabled && 'opacity-50',
          props.pressed && 'bg-accent',
          className
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function ToggleIcon({ className, ...props }: React.ComponentProps<typeof Icon>) {
  const textClass = React.useContext(TextClassContext);
  return <Icon className={cn('size-4 shrink-0', textClass, className)} {...props} />;
}

export { Toggle, ToggleIcon, toggleVariants };
```

<a id="srccomponentsuitooltiptsx"></a>
## `src/components/ui/tooltip.tsx`

```tsx
import { NativeOnlyAnimatedView } from '@/components/ui/native-only-animated-view';
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as TooltipPrimitive from '@rn-primitives/tooltip';
import * as React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { FadeInDown, FadeInUp, FadeOut } from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;

function TooltipContent({
  className,
  sideOffset = 4,
  portalHost,
  side = 'top',
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content> & {
    portalHost?: string;
  }) {
  return (
    <TooltipPrimitive.Portal hostName={portalHost}>
      <FullWindowOverlay>
        <TooltipPrimitive.Overlay style={Platform.select({ native: StyleSheet.absoluteFill })}>
          <NativeOnlyAnimatedView
            entering={
              side === 'top'
                ? FadeInDown.withInitialValues({ transform: [{ translateY: 3 }] }).duration(150)
                : FadeInUp.withInitialValues({ transform: [{ translateY: -5 }] })
            }
            exiting={FadeOut}>
            <TextClassContext.Provider value="text-xs text-primary-foreground">
              <TooltipPrimitive.Content
                sideOffset={sideOffset}
                className={cn(
                  'bg-primary z-50 rounded-md px-3 py-2 sm:py-1.5',
                  Platform.select({
                    web: cn(
                      'animate-in fade-in-0 zoom-in-95 origin-(--radix-tooltip-content-transform-origin) w-fit text-balance',
                      side === 'bottom' && 'slide-in-from-top-2',
                      side === 'left' && 'slide-in-from-right-2',
                      side === 'right' && 'slide-in-from-left-2',
                      side === 'top' && 'slide-in-from-bottom-2'
                    ),
                  }),
                  className
                )}
                side={side}
                {...props}
              />
            </TextClassContext.Provider>
          </NativeOnlyAnimatedView>
        </TooltipPrimitive.Overlay>
      </FullWindowOverlay>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipTrigger };
```
