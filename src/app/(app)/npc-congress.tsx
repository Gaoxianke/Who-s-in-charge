// 代会人事系统
// ─────────────────────────────────────────────────────────────────────────
// 规则说明：
//   · 所有 NPC 晋升、连任均须经对应级别代会（党代会/议政院/参政院）提名表决
//   · 连任通过率 85%，新任命通过率 65%，NPC 自行提名 75%
//   · 代会窗口期：开幕前 90 天 ~ 闭幕后 30 天（共 ≈ 120 天）
//   · 非窗口期只能查看候选人信息，无法提交提名
//   · 补充机制：考察期 45 天 → 公示期 5 天 → 正式任命
//   · 年龄红线：县/处级 ≤55岁，厅/部级 ≤60岁，省/国家级 ≤65岁
//   · 回避制度：连续同一岗位不超过 2 届（约 10 年）
//   · 异地任职：晋升时自动标记需异地交流经历
// ─────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getSubordinates } from '@/db/gameApi';
import { SUB_LEVEL_NAMES, RANK_CONFIG, gameDaysToDate } from '@/types/game';
import type { Subordinate } from '@/types/game';

// ── 类型 ─────────────────────────────────────────────────────────────────
type CongressType = '党代会' | '人民代表大会' | '政治协商会议';
type NominationStatus =
  | 'eligible'        // 可提名
  | 'examining'       // 考察期（45天）
  | 'publicizing'     // 公示期（5天）
  | 'approved'        // 已通过
  | 'rejected'        // 已否决
  | 'age_blocked'     // 超龄
  | 'tenure_blocked'; // 届满不宜连任

type AppointKind = '晋升' | '连任' | '平调' | '免职';
type NominateGroup = 'party' | 'gov' | 'nda';

interface CongressSchedule {
  congressType: CongressType;
  ordinal: number;       // 届次
  openDay: number;       // 开幕（gameDays）
  closeDays: number;     // 会期（天数）
  windowStart: number;   // 可提名窗口开始
  windowEnd: number;     // 可提名窗口关闭
}

interface Nomination {
  id: string;
  subId: string;
  subName: string;
  subLevel: number;       // 当前级别
  targetLevel: number;    // 拟任级别
  kind: AppointKind;
  status: NominationStatus;
  voteFor: number;
  voteAgainst: number;
  voteAbstain: number;
  totalVoters: number;
  examineStartDay: number;  // 考察开始
  publicizeDay: number;     // 公示开始
  proposedBy: 'player' | 'npc';
  createdDay: number;
  passRate: number;         // 0-100 通过率预估
  faction: string;
  age: number;
  tenureYears: number;      // 当前岗位已满任期（年）
  needsCrossRegion: boolean; // 是否需要异地经历
  notes: string[];           // 附加说明
  congressGroup: NominateGroup; // 提名所属代会分组
}

// ── 常量 ─────────────────────────────────────────────────────────────────
// 游戏开始日 2020-01-01 = gameDays 0
// 各级代会开幕 gameDays（近似值，以实际换届年月推算）
const CONGRESS_SCHEDULES: Record<number, CongressSchedule[]> = {
  // rank 1-3：乡镇层级  → 县党代会/县人代会
  1: buildSchedules('党代会', 17, [606, 606 + 1825, 606 + 3650]),            // 2021-08 → 2026-08 → 2031-08
  2: buildSchedules('人民代表大会', 14, [700, 700 + 1825, 700 + 3650]),       // 2021-11 → 2026-11
  // rank 4-6：县级  → 县党代会/县人代会
  4: buildSchedules('党代会', 17, [606, 606 + 1825, 606 + 3650]),
  5: buildSchedules('人民代表大会', 14, [700, 700 + 1825, 700 + 3650]),
  // rank 7-9：市级  → 市党代会/市人代会
  7: buildSchedules('党代会', 14, [640, 640 + 1825, 640 + 3650]),             // 2021-09 → 2026-09
  8: buildSchedules('人民代表大会', 11, [730, 730 + 1825, 730 + 3650]),       // 2022-01 → 2027-01
  // rank 10-11：省级  → 省党代会/省人代会
  10: buildSchedules('党代会', 13, [882, 882 + 1825, 882 + 3650]),            // 2022-06 → 2027-06
  11: buildSchedules('人民代表大会', 13, [1095, 1095 + 1825, 1095 + 3650]),   // 2023-01 → 2028-01
  // rank 12-15：国家级  → 全国执政党代表大会/全国议政院/全国参政院
  12: buildSchedules('党代会', 20, [1004, 1004 + 1825, 1004 + 3650]),         // 2022-10（二十大）→ 2027-10
  13: buildSchedules('人民代表大会', 14, [1156, 1156 + 1825, 1156 + 3650]),   // 2023-03（十四届）→ 2028-03
  14: buildSchedules('政治协商会议', 14, [1156, 1156 + 1825, 1156 + 3650]),
};

function buildSchedules(type: CongressType, startOrdinal: number, openDays: number[]): CongressSchedule[] {
  return openDays.map((open, i) => ({
    congressType: type,
    ordinal: startOrdinal + i,
    openDay: open,
    closeDays: type === '党代会' ? 7 : 14,
    windowStart: open - 90,
    windowEnd: open + 30,
  }));
}

// 通过率预估
function estimatePassRate(kind: AppointKind, loyalty: number, ability: number, isWindowOpen: boolean): number {
  if (!isWindowOpen) return 0;
  let base = kind === '连任' ? 85 : kind === '晋升' ? 65 : 70;
  base += Math.round((loyalty - 70) * 0.2);
  base += Math.round((ability - 70) * 0.15);
  return Math.min(98, Math.max(20, base));
}

// 倒计时文字
function countdownText(gameDays: number, targetDay: number): string {
  const diff = targetDay - gameDays;
  if (diff <= 0) return '进行中';
  if (diff < 30) return `${diff}天后`;
  if (diff < 365) return `约${Math.round(diff / 30)}个月后`;
  return `约${(diff / 365).toFixed(1)}年后`;
}

// 确定性投票模拟
function simulateVote(passRate: number, subId: string, total: number): { voteFor: number; voteAgainst: number; voteAbstain: number } {
  let h = 0;
  for (let i = 0; i < subId.length; i++) h = (h * 31 + subId.charCodeAt(i)) & 0xffff;
  const roll = (h % 100) + 1;
  const passed = roll <= passRate;
  if (passed) {
    const voteFor = Math.round(total * (0.6 + (h % 30) / 100));
    const voteAgainst = Math.round(total * (0.05 + (h % 10) / 100));
    return { voteFor, voteAgainst: voteAgainst, voteAbstain: total - voteFor - voteAgainst };
  } else {
    const voteFor = Math.round(total * (0.25 + (h % 20) / 100));
    const voteAgainst = Math.round(total * (0.5 + (h % 20) / 100));
    return { voteFor, voteAgainst, voteAbstain: Math.max(0, total - voteFor - voteAgainst) };
  }
}

function getFactionCN(faction: string): string {
  const map: Record<string, string> = {
    reform: '改革派', pragmatic: '务实派', communist: '共青团系',
    technocrat: '技术官僚', local: '地方系', neutral: '中立',
    economy: '经济发展', discipline: '纪检督查',
  };
  return map[faction] ?? faction;
}

const FACTION_COLORS: Record<string, string> = {
  reform: '#2B4B6F', pragmatic: '#607d8b', communist: '#E53935',
  technocrat: '#1565C0', local: '#4E342E', neutral: '#888',
  economy: '#2a7a3b', discipline: '#6A2A6A',
};

// ── 找到当前+下一届代会 ───────────────────────────────────────────────────
function getRelevantCongress(rankLevel: number, gameDays: number): {
  current: CongressSchedule | null;
  next: CongressSchedule;
  isWindowOpen: boolean;
} {
  const tier = rankLevel >= 12 ? 12 : rankLevel >= 10 ? 10 : rankLevel >= 7 ? 7 : 4;
  const schedules = CONGRESS_SCHEDULES[tier] ?? CONGRESS_SCHEDULES[4]!;
  // 找最近一届（开幕日≥今天-120，或已过窗口则找下一届）
  let current: CongressSchedule | null = null;
  let next: CongressSchedule = schedules[schedules.length - 1]!;
  for (const s of schedules) {
    if (gameDays >= s.windowStart && gameDays <= s.windowEnd) {
      current = s;
      const idx = schedules.indexOf(s);
      next = schedules[idx + 1] ?? s;
      break;
    }
    if (gameDays < s.openDay) {
      next = s;
      break;
    }
  }
  return { current, next, isWindowOpen: current !== null };
}

// 代会全称（含地名、级别、届次）
function congressFullName(s: CongressSchedule, rankLevel: number, cityName: string): string {
  const city = cityName || '所在地';
  if (s.congressType === '党代会') {
    if (rankLevel >= 12) return `中国共产党第${s.ordinal}次全国代表大会`;
    if (rankLevel >= 10) return `中国共产党${city}省第${s.ordinal}次代表大会`;
    if (rankLevel >= 7)  return `中国共产党${city}市第${s.ordinal}次代表大会`;
    if (rankLevel >= 4)  return `中国共产党${city}县第${s.ordinal}次代表大会`;
    return `中国共产党${city}镇第${s.ordinal}次代表大会`;
  }
  if (s.congressType === '人民代表大会') {
    if (rankLevel >= 12) return `华夏人民共和国第${s.ordinal}届全国议政院`;
    if (rankLevel >= 10) return `${city}省第${s.ordinal}届人民代表大会`;
    if (rankLevel >= 7)  return `${city}市第${s.ordinal}届人民代表大会`;
    if (rankLevel >= 4)  return `${city}县第${s.ordinal}届人民代表大会`;
    return `${city}镇第${s.ordinal}届人民代表大会`;
  }
  if (s.congressType === '政治协商会议') {
    if (rankLevel >= 12) return `华夏参政院第${s.ordinal}届全国委员会`;
    if (rankLevel >= 10) return `${city}省第${s.ordinal}届政治协商会议`;
    if (rankLevel >= 7)  return `${city}市第${s.ordinal}届政治协商会议`;
    return `${city}县第${s.ordinal}届政治协商会议`;
  }
  return `第${s.ordinal}届${s.congressType}`;
}

// 简称（用于顶栏行内短文本，避免名称过长）
function congressShortName(s: CongressSchedule, rankLevel: number, cityName: string): string {
  const city = cityName || '所在地';
  if (s.congressType === '党代会') {
    if (rankLevel >= 12) return `全国执政党代表大会·第${s.ordinal}次`;
    if (rankLevel >= 10) return `${city}省党代会·第${s.ordinal}次`;
    if (rankLevel >= 7)  return `${city}市党代会·第${s.ordinal}次`;
    return `${city}县党代会·第${s.ordinal}次`;
  }
  if (s.congressType === '人民代表大会') {
    if (rankLevel >= 12) return `全国议政院·第${s.ordinal}届`;
    if (rankLevel >= 10) return `${city}省议政院·第${s.ordinal}届`;
    if (rankLevel >= 7)  return `${city}市议政院·第${s.ordinal}届`;
    return `${city}县议政院·第${s.ordinal}届`;
  }
  if (rankLevel >= 12) return `全国参政院·第${s.ordinal}届`;
  return `${city}参政院·第${s.ordinal}届`;
}

// ═══════════════════════════════════════════════════════════════════════════
export default function NpcCongressScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [tab, setTab] = useState<'schedule' | 'nominate' | 'review'>('schedule');
  const [nominateGroup, setNominateGroup] = useState<NominateGroup>('party');
  const [subs, setSubs] = useState<Subordinate[]>([]);
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [feedback, setFeedback] = useState('');
  const [feedbackOk, setFeedbackOk] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const npcInit = useRef(false);

  useFocusEffect(useCallback(() => {
    if (!save) return;
    getSubordinates(save.id).then(data => setSubs(data));
  }, [save]));

  // NPC 自动提名（窗口期内且首次进入）—— Hooks 必须在 guard return 之前调用
  useEffect(() => {
    if (!save) return;
    const gameDays = save.gameDays;
    const rankLevel = save.rankLevel;
    const { current, next } = getRelevantCongress(rankLevel, gameDays);
    const activeCongress = current ?? next;
    const isWindowOpen = Boolean(activeCongress) && activeCongress.windowStart <= gameDays && gameDays <= activeCongress.windowEnd;
    if (!isWindowOpen || npcInit.current || subs.length === 0) return;
    npcInit.current = true;
    const eligible = subs.filter(s =>
      s.subLevel >= 1 && s.subLevel <= 10 &&
      s.ability >= 75 && s.loyalty >= 70 &&
      !nominations.find(n => n.subId === s.id)
    ).slice(0, 2);
    if (eligible.length === 0) return;
    const auto: Nomination[] = eligible.map(s => {
      const kind: AppointKind = '晋升';
      const passRate = estimatePassRate(kind, s.loyalty, s.ability, true);
      const age = 35 + Math.floor(((hashSub(s.id)) % 25));
      return {
        id: `npc_nom_${s.id}`,
        subId: s.id,
        subName: s.name,
        subLevel: s.subLevel,
        targetLevel: Math.min(s.subLevel + 1, 10),
        kind,
        status: 'eligible',
        voteFor: 0, voteAgainst: 0, voteAbstain: 0,
        totalVoters: activeCongress.congressType === '党代会' ? 200 : 150,
        examineStartDay: gameDays,
        publicizeDay: gameDays + 45,
        proposedBy: 'npc',
        createdDay: gameDays,
        passRate,
        faction: s.faction,
        age,
        tenureYears: 2 + (hashSub(s.id) % 4),
        needsCrossRegion: s.subLevel >= 5,
        notes: [],
        congressGroup: 'party' as NominateGroup,
      };
    });
    setNominations(prev => [...prev, ...auto]);
    showFeedback(`📩 组织部门已自动提名${auto.length}名干部候选人，请在审议页表决`);
    setTab('review');
  }, [save, subs]);

  function hashSub(id: string): number {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
    return h;
  }

  const showFeedback = (msg: string, ok = true) => {
    setFeedback(msg); setFeedbackOk(ok);
    setTimeout(() => setFeedback(''), 3200);
  };

  if (!save) return null;

  const gameDays = save.gameDays;
  const rankLevel = save.rankLevel;
  const rankName = RANK_CONFIG[rankLevel]?.name ?? '干部';

  // 代会信息
  const { current, next, isWindowOpen } = getRelevantCongress(rankLevel, gameDays);
  const activeCongress = current ?? next;

  // ── 玩家提名 ───────────────────────────────────────────────────────────
  const handleNominate = (sub: Subordinate, kind: AppointKind, group: NominateGroup) => {
    if (!isWindowOpen) {
      showFeedback(`❌ 当前非${congressFullName(activeCongress, rankLevel, save.cityName ?? '')}窗口期，无法提名`, false);
      return;
    }
    if (nominations.find(n => n.subId === sub.id && n.status !== 'rejected')) {
      showFeedback('该干部已有进行中的提名', false); return;
    }
    const age = 35 + (hashSub(sub.id) % 25);
    const targetLevel = kind === '晋升' ? Math.min(sub.subLevel + 1, 10) : sub.subLevel;
    const tenureYears = 2 + (hashSub(sub.id) % 4);
    if (kind === '连任' && tenureYears >= 10) {
      showFeedback(`❌ ${sub.name}在同一职位已满10年（2届），不宜连任`, false);
      return;
    }
    const passRate = estimatePassRate(kind, sub.loyalty, sub.ability, true);
    // 不同代会分组的代表人数差异
    const voters = group === 'party' ? 200 : group === 'gov' ? 180 : 150;
    const nom: Nomination = {
      id: `nom_${Date.now()}_${sub.id}`,
      subId: sub.id, subName: sub.name,
      subLevel: sub.subLevel, targetLevel,
      kind, status: 'eligible',
      voteFor: 0, voteAgainst: 0, voteAbstain: 0,
      totalVoters: voters,
      examineStartDay: gameDays, publicizeDay: gameDays + 45,
      proposedBy: 'player', createdDay: gameDays, passRate,
      faction: sub.faction, age,
      tenureYears,
      needsCrossRegion: sub.subLevel >= 5,
      notes: buildNotes(sub, kind, age, tenureYears),
      congressGroup: group,
    };
    setNominations(prev => [nom, ...prev]);
    const groupName = group === 'party' ? '党代会' : group === 'gov' ? '人民代表大会（政府班子）' : '人民代表大会（议政院班子）';
    showFeedback(`✅ 已向${groupName}提名${sub.name}参加${kind}表决，进入45天考察期`);
    setTab('review');
  };

  function buildNotes(sub: Subordinate, kind: AppointKind, age: number, tenure: number): string[] {
    const notes: string[] = [];
    if (kind === '连任') notes.push(`连任通过率约85%，高于新任命`);
    if (kind === '晋升') notes.push(`晋升需要：能力${sub.ability}、忠诚${sub.loyalty}`);
    if (sub.subLevel >= 5 && !sub.transferredCity) notes.push(`⚠️ 尚无异地任职经历，晋升加分项缺失`);
    if (tenure >= 8) notes.push(`连续任职${tenure}年，建议轮岗`);
    return notes;
  }

  // ── 进入考察 / 公示 / 表决 ─────────────────────────────────────────────
  const handleProceed = async (nomId: string) => {
    if (processingId) return;
    setProcessingId(nomId);
    const nom = nominations.find(n => n.id === nomId);
    if (!nom) { setProcessingId(null); return; }

    if (nom.status === 'eligible') {
      // 进入考察期（45天）→ 模拟为即时推进
      setNominations(prev => prev.map(n => n.id === nomId ? { ...n, status: 'examining' } : n));
      showFeedback(`🔍 ${nom.subName}进入45天组织考察期，请等待结果…`);
      setTimeout(() => {
        setNominations(prev => prev.map(n => n.id === nomId ? { ...n, status: 'publicizing' } : n));
        showFeedback(`📢 ${nom.subName}考察合格，进入5天公示期`);
        setTimeout(() => finalizeVote(nomId), 2000);
      }, 1800);
    } else if (nom.status === 'publicizing') {
      finalizeVote(nomId);
    }
    setProcessingId(null);
  };

  const finalizeVote = async (nomId: string) => {
    const nom = nominations.find(n => n.id === nomId);
    if (!nom) return;
    const { voteFor, voteAgainst, voteAbstain } = simulateVote(nom.passRate, nom.subId, nom.totalVoters);
    const quorum = Math.floor(nom.totalVoters / 2) + 1;
    const passed = voteFor >= quorum;
    setNominations(prev => prev.map(n =>
      n.id === nomId ? { ...n, status: passed ? 'approved' : 'rejected', voteFor, voteAgainst, voteAbstain } : n,
    ));
    if (passed) {
      const merit = nom.kind === '晋升' ? 25 : 12;
      await updateGameSave({ meritPoints: (save.meritPoints ?? 0) + merit });
      showFeedback(`✅ ${nom.subName}经${congressFullName(activeCongress, rankLevel, save.cityName ?? '')}表决通过（${voteFor}/${nom.totalVoters}票），政绩+${merit}`);
    } else {
      showFeedback(`❌ ${nom.subName}未获代会通过（${voteFor}/${nom.totalVoters}票），需改善条件后下届再议`, false);
    }
  };

  const pendingNoms  = nominations.filter(n => n.status === 'eligible' || n.status === 'examining' || n.status === 'publicizing');
  const decidedNoms  = nominations.filter(n => n.status === 'approved' || n.status === 'rejected');
  const nominableS   = subs.filter(s => s.subLevel >= 1 && !nominations.find(n => n.subId === s.id && n.status !== 'rejected'));

  // 颜色主题（深棕/金色 → 代表权威性）
  const BG  = '#0C0A06';
  const HDR = '#1C1608';
  const ACT = '#4A3A08';
  const TXT = '#F5E8B0';
  const MUT = '#9A8A50';
  const BOR = '#4A3A1A';
  const GLD = '#C8A832';

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar style="light" backgroundColor={HDR} />

      {/* ── 顶栏 ── */}
      <View style={{ backgroundColor: HDR, paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: GLD, fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: MUT, fontSize: 9, letterSpacing: 3 }}>代会人事 · {rankName}层级</Text>
            <Text style={{ color: TXT, fontSize: 16, fontWeight: '700' }}>🏛️ 代会干部提名系统</Text>
            <Text style={{ color: MUT, fontSize: 10 }}>
              {isWindowOpen
                ? `✅ 当前处于 ${congressShortName(activeCongress, rankLevel, save.cityName ?? '')} 窗口期（可提名）`
                : `⏳ 下届：${congressShortName(activeCongress, rankLevel, save.cityName ?? '')} — ${countdownText(gameDays, activeCongress.openDay)}`}
            </Text>
          </View>
          <View style={{ backgroundColor: isWindowOpen ? '#1A3A0A' : '#3A2A08', borderWidth: 1, borderColor: isWindowOpen ? '#5AAA3A' : GLD, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: isWindowOpen ? '#88EE88' : GLD, fontSize: 9, fontWeight: '700' }}>
              {isWindowOpen ? '窗口期' : '等待中'}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {([
            { key: 'schedule', label: '📅 代会日程' },
            { key: 'nominate', label: `👥 提名候选（${nominableS.length}）` },
            { key: 'review',   label: `🗳️ 审议表决（${pendingNoms.length}）` },
          ] as const).map(t => (
            <Pressable key={t.key} onPress={() => setTab(t.key)}
              style={{ flex: 1, paddingVertical: 7, alignItems: 'center', backgroundColor: tab === t.key ? ACT : 'rgba(255,255,255,0.06)' }}
            >
              <Text style={{ color: tab === t.key ? TXT : MUT, fontSize: 9, fontWeight: tab === t.key ? '700' : '400' }}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 反馈条 */}
      {feedback ? (
        <View style={{ backgroundColor: feedbackOk ? '#0D2A0D' : '#2A0D0D', padding: 10 }}>
          <Text style={{ color: feedbackOk ? '#5AE87A' : '#FF6666', fontSize: 12, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      {/* ══ 代会日程 ══ */}
      {tab === 'schedule' && (
        <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>
          {/* 窗口状态横幅 */}
          <View style={{ backgroundColor: isWindowOpen ? '#0A2A0A' : HDR, borderWidth: 2, borderColor: isWindowOpen ? '#3A8A3A' : GLD, padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Text style={{ fontSize: 28 }}>{isWindowOpen ? '✅' : '⏳'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: TXT, fontSize: 15, fontWeight: '700' }}>{congressFullName(activeCongress, rankLevel, save.cityName ?? '')}</Text>
                <Text style={{ color: MUT, fontSize: 11, marginTop: 2 }}>
                  {isWindowOpen
                    ? `${gameDaysToDate(activeCongress.openDay)} 开幕 · 会期${activeCongress.closeDays}天`
                    : `${gameDaysToDate(activeCongress.openDay)} 开幕 · 尚需 ${countdownText(gameDays, activeCongress.openDay)}`}
                </Text>
              </View>
            </View>
            <View style={{ backgroundColor: '#1A1408', padding: 10, gap: 4 }}>
              <Text style={{ color: GLD, fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>代会人事安排规则</Text>
              <Text style={{ color: MUT, fontSize: 10, lineHeight: 16 }}>
                {'  '}① 窗口期：开幕前90天至闭幕后30天，共约120天
              </Text>
              <Text style={{ color: MUT, fontSize: 10, lineHeight: 16 }}>
                {'  '}② 连任通过率约 85%，高于新任命（65%）
              </Text>
              <Text style={{ color: MUT, fontSize: 10, lineHeight: 16 }}>
                {'  '}③ 提名后须经45天考察期 + 5天公示期
              </Text>
              <Text style={{ color: MUT, fontSize: 10, lineHeight: 16 }}>
                {'  '}④ 窗口期外无法提名，只能做预备工作
              </Text>
            </View>
          </View>

          {/* 现实约束说明 */}
          <View style={{ backgroundColor: HDR, borderWidth: 1, borderColor: BOR, padding: 14, gap: 8 }}>
            <Text style={{ color: GLD, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 4 }}>📜 干部任免现实约束</Text>

            {[
              { icon: '🔄', title: '回避制度', desc: '同一岗位不得超过2届（约10年），届满须轮岗' },
              { icon: '✈️', title: '异地任职', desc: '副厅级及以上晋升需有异地任职经历，否则扣分' },
              { icon: '🔍', title: '组织考察', desc: '提名后须经45天考察期，考察合格方可进入公示' },
              { icon: '📢', title: '任前公示', desc: '候选人须在单位公示5天，接受群众监督' },
              { icon: '📋', title: '届委制度', desc: '领导班子成员须在代会前提名，经代会选举产生' },
              { icon: '🤝', title: '交流任职', desc: '党政领导职务与同级不得在同一单位任职超2届' },
              { icon: '⚖️', title: '双重管理', desc: '党委管干部（党代会）、国家机关管官员（议政院选举）' },
            ].map(item => (
              <View key={item.title} style={{ flexDirection: 'row', gap: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#2A2010' }}>
                <Text style={{ fontSize: 16, width: 22 }}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: TXT, fontSize: 11, fontWeight: '700' }}>{item.title}</Text>
                  <Text style={{ color: MUT, fontSize: 10, marginTop: 1, lineHeight: 15 }}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* 代会日程表 */}
          <View style={{ backgroundColor: HDR, borderWidth: 1, borderColor: BOR, padding: 14 }}>
            <Text style={{ color: GLD, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>
              📅 未来届会日程（{rankName}层级）
            </Text>
            {(() => {
              // 按层级取全部类型的日程（党代会 + 人民代表大会 + 参政院）
              const tierKeys: number[] =
                rankLevel >= 12 ? [12, 13, 14] :
                rankLevel >= 10 ? [10, 11] :
                rankLevel >= 7  ? [7, 8] :
                rankLevel >= 4  ? [4, 5] :
                                  [1, 2];
              const allSchedules = tierKeys
                .flatMap(k => CONGRESS_SCHEDULES[k] ?? [])
                .sort((a, b) => a.openDay - b.openDay);
              const TYPE_ICON: Record<string, string> = {
                '党代会': '🏛️',
                '人民代表大会': '📜',
                '政治协商会议': '🤝',
              };
              return allSchedules.map(s => {
                const inWindow = gameDays >= s.windowStart && gameDays <= s.windowEnd;
                const passed = gameDays > s.windowEnd;
                return (
                  <View key={`${s.congressType}-${s.ordinal}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8,
                    backgroundColor: inWindow ? '#1A2A0A' : passed ? '#181408' : '#141008',
                    borderWidth: 1, borderColor: inWindow ? '#3A7A2A' : passed ? '#2A2010' : BOR, padding: 10 }}>
                    <View style={{ width: 32, height: 32, backgroundColor: inWindow ? '#2A5A1A' : '#2A2010', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 18 }}>
                        {passed ? '✓' : inWindow ? '🔓' : (TYPE_ICON[s.congressType] ?? '🔒')}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: inWindow ? '#88EE88' : passed ? '#6A6A6A' : TXT, fontSize: 12, fontWeight: '700' }}>
                        第{s.ordinal}届{s.congressType}
                      </Text>
                      <Text style={{ color: MUT, fontSize: 10 }}>
                        开幕：{gameDaysToDate(s.openDay)} · 会期{s.closeDays}天
                      </Text>
                      <Text style={{ color: MUT, fontSize: 9 }}>
                        提名窗口：{gameDaysToDate(s.windowStart)} — {gameDaysToDate(s.windowEnd)}
                      </Text>
                    </View>
                    {inWindow && (
                      <View style={{ backgroundColor: '#1A4A0A', borderWidth: 1, borderColor: '#4A8A2A', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: '#88EE88', fontSize: 9, fontWeight: '700' }}>当前</Text>
                      </View>
                    )}
                  </View>
                );
              });
            })()}
          </View>
          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* ══ 提名候选 ══ */}
      {tab === 'nominate' && (() => {
        // 三个分组定义
        const NOMINATE_GROUPS: { key: NominateGroup; label: string; icon: string; color: string; desc: string; congressName: string; requirement: string }[] = [
          {
            key: 'party', label: '党代会提名', icon: '🏛️', color: '#8B3A3A',
            desc: '党委书记、副书记、常委等党委班子成员，须经同级党代表大会或党代会全委会审议通过。',
            congressName: '党代会',
            requirement: '适合党务系统、纪委、政法委等岗位候选人',
          },
          {
            key: 'gov', label: '政府班子提名', icon: '🏢', color: '#2A5A6A',
            desc: '县长/市长/省长及各级政府副职，须经人民代表大会选举（正职）或议政院常委会通过（副职）。',
            congressName: '人民代表大会',
            requirement: '适合行政管理、经济建设等政府职能岗位候选人',
          },
          {
            key: 'nda', label: '议政院班子提名', icon: '📜', color: '#2A6A3A',
            desc: '议政院主任、副主任及常委会委员，须经人民代表大会全体会议选举产生。',
            congressName: '议政院',
            requirement: '适合法律、监督、立法等议政院系统岗位候选人',
          },
        ];
        const curGroup = NOMINATE_GROUPS.find(g => g.key === nominateGroup)!;
        // 过滤当前分组中已有提名的下属
        const nominableFiltered = subs.filter(s =>
          s.subLevel >= 1 &&
          !nominations.find(n => n.subId === s.id && n.status !== 'rejected' && n.congressGroup === nominateGroup)
        );

        return (
          <View style={{ flex: 1 }}>
            {/* 分组小Tab */}
            <View style={{ flexDirection: 'row', backgroundColor: '#181408', borderBottomWidth: 1, borderBottomColor: BOR }}>
              {NOMINATE_GROUPS.map(g => (
                <Pressable key={g.key} onPress={() => setNominateGroup(g.key)}
                  style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: nominateGroup === g.key ? g.color : 'transparent' }}>
                  <Text style={{ fontSize: 14 }}>{g.icon}</Text>
                  <Text style={{ fontSize: 8, color: nominateGroup === g.key ? g.color : MUT, fontWeight: nominateGroup === g.key ? '700' : '400', marginTop: 1 }}>{g.label}</Text>
                  <Text style={{ fontSize: 7, color: MUT, marginTop: 1 }}>
                    {nominations.filter(n => n.congressGroup === g.key && (n.status === 'eligible' || n.status === 'examining' || n.status === 'publicizing')).length}项进行中
                  </Text>
                </Pressable>
              ))}
            </View>

            <FlatList
              data={nominableFiltered}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 12, gap: 8 }}
              ListHeaderComponent={
                <View style={{ gap: 6, marginBottom: 4 }}>
                  {/* 分组说明 */}
                  <View style={{ backgroundColor: HDR, borderWidth: 1, borderColor: curGroup.color + '66', borderLeftWidth: 3, borderLeftColor: curGroup.color, padding: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Text style={{ fontSize: 16 }}>{curGroup.icon}</Text>
                      <Text style={{ color: curGroup.color, fontSize: 12, fontWeight: '700' }}>{curGroup.label}</Text>
                    </View>
                    <Text style={{ color: MUT, fontSize: 10, lineHeight: 16 }}>{curGroup.desc}</Text>
                    <Text style={{ color: curGroup.color + 'AA', fontSize: 9, marginTop: 4 }}>📌 {curGroup.requirement}</Text>
                  </View>
                  {/* 窗口期警告 */}
                  {!isWindowOpen && (
                    <View style={{ backgroundColor: '#2A1A08', borderWidth: 1, borderColor: '#6A4A18', padding: 8 }}>
                      <Text style={{ color: '#CC8833', fontSize: 10, fontWeight: '700' }}>
                        ⚠️ 当前非{curGroup.congressName}窗口期 · 可预览候选人信息但无法提名
                      </Text>
                      <Text style={{ color: MUT, fontSize: 9, marginTop: 2 }}>
                        下届窗口开放时间：{gameDaysToDate(activeCongress.windowStart)}
                      </Text>
                    </View>
                  )}
                  <Text style={{ color: MUT, fontSize: 10, fontWeight: '600' }}>
                    可提名下属：{nominableFiltered.length}人 · 向「{curGroup.congressName}」提交候选
                  </Text>
                </View>
              }
              ListEmptyComponent={
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Text style={{ fontSize: 36, marginBottom: 12 }}>👥</Text>
                  <Text style={{ fontSize: 14, color: MUT, textAlign: 'center' }}>暂无可提名的下属干部</Text>
                  <Text style={{ fontSize: 11, color: '#4A3A18', marginTop: 4 }}>先在「下属管理」页培养干部</Text>
                </View>
              }
              renderItem={({ item }) => {
                const age = 35 + (hashSub(item.id) % 25);
                const tenure = 2 + (hashSub(item.id) % 4);
                const fColor = FACTION_COLORS[item.faction] ?? '#888';
                const fName = getFactionCN(item.faction);
                const tenureOk = tenure < 10;

                return (
                  <View style={{ backgroundColor: '#141008', borderWidth: 1, borderColor: BOR, padding: 12 }}>
                    {/* 干部信息 */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <View style={{ width: 46, height: 46, backgroundColor: '#2A2010', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: curGroup.color }}>
                        <Text style={{ fontSize: 24 }}>{item.gender === '女' ? '👩‍💼' : '👔'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: TXT }}>{item.name}</Text>
                          <Text style={{ fontSize: 10, color: MUT }}>{age}岁</Text>
                        </View>
                        <Text style={{ fontSize: 11, color: MUT, marginTop: 2 }}>
                          {SUB_LEVEL_NAMES[item.subLevel]} · 现岗{tenure}年
                          {!tenureOk ? '⚠️届满' : ''}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                          <View style={{ backgroundColor: fColor + '22', borderWidth: 1, borderColor: fColor, paddingHorizontal: 5, paddingVertical: 1 }}>
                            <Text style={{ fontSize: 9, color: fColor }}>{fName}</Text>
                          </View>
                          <Text style={{ fontSize: 9, color: MUT }}>能力{item.ability} · 忠诚{item.loyalty}</Text>
                          {item.subLevel >= 5 && !item.transferredCity && (
                            <View style={{ backgroundColor: '#3A2A08', borderWidth: 1, borderColor: '#6A4A18', paddingHorizontal: 4, paddingVertical: 1 }}>
                              <Text style={{ fontSize: 8, color: '#CC8833' }}>缺异地</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* 提名目标标识 */}
                    <View style={{ backgroundColor: curGroup.color + '18', borderWidth: 1, borderColor: curGroup.color + '44', padding: 6, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 12 }}>{curGroup.icon}</Text>
                      <Text style={{ color: curGroup.color, fontSize: 10 }}>提名至：{curGroup.congressName} · {curGroup.label}</Text>
                    </View>

                    {/* 通过率预估 */}
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                      {(['晋升', '连任', '平调'] as const).map(kind => {
                        const pr = estimatePassRate(kind, item.loyalty, item.ability, true);
                        return (
                          <View key={kind} style={{ flex: 1, backgroundColor: '#1A1408', borderWidth: 1, borderColor: BOR, padding: 5, alignItems: 'center' }}>
                            <Text style={{ color: MUT, fontSize: 9 }}>{kind}</Text>
                            <Text style={{ color: pr >= 75 ? '#88EE88' : pr >= 55 ? GLD : '#EE6666', fontSize: 12, fontWeight: '700' }}>{pr}%</Text>
                          </View>
                        );
                      })}
                    </View>

                    {/* 提名按钮 */}
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {(['晋升', '连任', '平调'] as const).map(kind => {
                        const canNom = isWindowOpen && (kind !== '连任' || tenureOk);
                        return (
                          <Pressable key={kind}
                            onPress={() => canNom && handleNominate(item, kind, nominateGroup)}
                            style={{ flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: canNom ? curGroup.color + '44' : '#1A1408', borderWidth: 1, borderColor: canNom ? curGroup.color : '#2A2010' }}
                          >
                            <Text style={{ color: canNom ? TXT : '#4A3A18', fontSize: 11, fontWeight: canNom ? '700' : '400' }}>
                              {kind === '晋升' ? '⬆️' : kind === '连任' ? '🔁' : '↔️'} {kind}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    {!isWindowOpen && (
                      <Text style={{ color: '#6A4A18', fontSize: 9, marginTop: 4, textAlign: 'center' }}>
                        非窗口期 · {countdownText(gameDays, activeCongress.windowStart)}后可提名
                      </Text>
                    )}
                  </View>
                );
              }}
            />
          </View>
        );
      })()}

      {/* ══ 审议表决 ══ */}
      {tab === 'review' && (
        <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>
          {/* 分组统计 */}
          {nominations.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {([
                { key: 'party' as NominateGroup, label: '党代会', icon: '🏛️', color: '#8B3A3A' },
                { key: 'gov' as NominateGroup,   label: '政府班子', icon: '🏢', color: '#2A5A6A' },
                { key: 'nda' as NominateGroup,   label: '议政院班子', icon: '📜', color: '#2A6A3A' },
              ]).map(g => {
                const pending = nominations.filter(n => n.congressGroup === g.key && (n.status === 'eligible' || n.status === 'examining' || n.status === 'publicizing')).length;
                const approved = nominations.filter(n => n.congressGroup === g.key && n.status === 'approved').length;
                return (
                  <View key={g.key} style={{ flex: 1, backgroundColor: HDR, borderWidth: 1, borderColor: g.color + '44', borderTopWidth: 2, borderTopColor: g.color, padding: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 14 }}>{g.icon}</Text>
                    <Text style={{ color: g.color, fontSize: 9, marginTop: 2 }}>{g.label}</Text>
                    <Text style={{ color: TXT, fontSize: 11, fontWeight: '700', marginTop: 2 }}>{pending}项进行</Text>
                    <Text style={{ color: MUT, fontSize: 9 }}>{approved}项通过</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* 各分组待审提名 */}
          {(['party', 'gov', 'nda'] as const).map(group => {
            const groupPending = pendingNoms.filter(n => n.congressGroup === group);
            if (groupPending.length === 0) return null;
            const gInfo = { party: { label: '党代会', icon: '🏛️', color: '#8B3A3A' }, gov: { label: '政府班子（议政院）', icon: '🏢', color: '#2A5A6A' }, nda: { label: '议政院班子', icon: '📜', color: '#2A6A3A' } }[group];
            return (
              <View key={group}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: gInfo.color + '44' }}>
                  <Text style={{ fontSize: 14 }}>{gInfo.icon}</Text>
                  <Text style={{ color: gInfo.color, fontSize: 11, fontWeight: '700' }}>{gInfo.label} · 待审议 {groupPending.length} 项</Text>
                </View>
                {groupPending.map(n => {
                  const statusInfo: Record<string, { label: string; color: string; bg: string; desc: string; canProceed: boolean }> = {
                    eligible:    { label: '待考察', color: GLD, bg: '#2A2008', desc: '点击启动45天组织考察流程', canProceed: true },
                    examining:   { label: '考察中', color: '#88AAEE', bg: '#081828', desc: '组织部门正在对候选人进行全面考察（45天）', canProceed: false },
                    publicizing: { label: '公示中', color: '#88EE88', bg: '#082808', desc: '候选人信息公示（5天），公示后进入代会表决', canProceed: true },
                  };
                  const si = statusInfo[n.status] ?? statusInfo.eligible!;
                  const fColor = FACTION_COLORS[n.faction] ?? '#888';
                  return (
                    <View key={n.id} style={{ backgroundColor: '#141008', borderWidth: 1, borderColor: gInfo.color + '44', borderLeftWidth: 3, borderLeftColor: gInfo.color, padding: 14, marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <View style={{ backgroundColor: n.proposedBy === 'player' ? '#2A2010' : '#0A1A2A', borderWidth: 1, borderColor: n.proposedBy === 'player' ? GLD : '#4488FF', paddingHorizontal: 7, paddingVertical: 2 }}>
                          <Text style={{ color: n.proposedBy === 'player' ? GLD : '#88BBFF', fontSize: 9, fontWeight: '700' }}>
                            {n.proposedBy === 'player' ? '✍️ 您提名' : '📩 组织部提名'}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: TXT, flex: 1 }}>{n.subName}</Text>
                        <View style={{ backgroundColor: si.bg, borderWidth: 1, borderColor: si.color, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ color: si.color, fontSize: 9, fontWeight: '700' }}>{si.label}</Text>
                        </View>
                      </View>
                      <View style={{ backgroundColor: '#0E0C06', padding: 8, marginBottom: 8, gap: 3 }}>
                        <Text style={{ color: MUT, fontSize: 10 }}>
                          {n.kind}：{SUB_LEVEL_NAMES[n.subLevel]}
                          {n.kind === '晋升' ? ` → ${SUB_LEVEL_NAMES[n.targetLevel]}` : ''} · <Text style={{ color: fColor }}>{getFactionCN(n.faction)}</Text>
                        </Text>
                        <Text style={{ color: MUT, fontSize: 10 }}>
                          提交：{gameDaysToDate(n.createdDay)} · 通过率预估：
                          <Text style={{ color: n.passRate >= 75 ? '#88EE88' : n.passRate >= 55 ? GLD : '#EE6666', fontWeight: '700' }}>
                            {n.passRate}%
                          </Text>
                        </Text>
                        <Text style={{ color: '#6A5A3A', fontSize: 9 }}>{si.desc}</Text>
                      </View>
                      {n.notes.length > 0 && (
                        <View style={{ backgroundColor: '#1A1408', borderWidth: 1, borderColor: '#3A2A10', padding: 8, marginBottom: 8, gap: 3 }}>
                          {n.notes.map((note, i) => (
                            <Text key={i} style={{ color: '#AA8830', fontSize: 9 }}>• {note}</Text>
                          ))}
                        </View>
                      )}
                      {si.canProceed && (
                        <Pressable onPress={() => void handleProceed(n.id)}
                          style={{ backgroundColor: gInfo.color + '44', paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: gInfo.color }}
                        >
                          <Text style={{ color: TXT, fontWeight: '700', fontSize: 12 }}>
                            {n.status === 'eligible' ? '🔍 启动组织考察（45天）' : '📋 公示结束·提交代会表决'}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}

          {/* 历史表决记录（分组显示） */}
          {decidedNoms.length > 0 && (
            <>
              <View style={{ borderBottomWidth: 1, borderBottomColor: BOR, paddingBottom: 4 }}>
                <Text style={{ fontSize: 10, color: MUT, fontWeight: '700', letterSpacing: 2 }}>历史表决记录</Text>
              </View>
              {(['party', 'gov', 'nda'] as const).map(group => {
                const groupDecided = decidedNoms.filter(n => n.congressGroup === group);
                if (groupDecided.length === 0) return null;
                const gLabel = { party: '党代会', gov: '政府班子', nda: '议政院班子' }[group];
                const gColor = { party: '#8B3A3A', gov: '#2A5A6A', nda: '#2A6A3A' }[group];
                return (
                  <View key={group}>
                    <Text style={{ color: gColor, fontSize: 10, fontWeight: '700', marginBottom: 6 }}>{gLabel} 表决记录</Text>
                    {groupDecided.map(n => {
                      const ok = n.status === 'approved';
                      const quorum = Math.floor(n.totalVoters / 2) + 1;
                      return (
                        <View key={n.id} style={{ backgroundColor: '#141008', borderWidth: 1, borderColor: ok ? '#2A5A1A' : '#5A1A1A', padding: 12, marginBottom: 6 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <Text style={{ fontSize: 16 }}>{ok ? '✅' : '❌'}</Text>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: TXT, flex: 1 }}>{n.subName}</Text>
                            <View style={{ backgroundColor: ok ? '#1A4A0A' : '#4A0A0A', paddingHorizontal: 6, paddingVertical: 1 }}>
                              <Text style={{ fontSize: 9, color: ok ? '#5AE87A' : '#FF6666', fontWeight: '700' }}>
                                {ok ? `${n.kind}·通过` : `${n.kind}·否决`}
                              </Text>
                            </View>
                          </View>
                          <Text style={{ fontSize: 11, color: MUT }}>
                            {n.kind}：{SUB_LEVEL_NAMES[n.subLevel]}{n.kind === '晋升' ? ` → ${SUB_LEVEL_NAMES[n.targetLevel]}` : ''}
                          </Text>
                          <Text style={{ fontSize: 10, color: '#6A5A2A', marginTop: 4 }}>
                            {n.voteFor}票赞成 · {n.voteAgainst}票反对 · {n.voteAbstain}票弃权（需{quorum}票）
                          </Text>
                          {!ok && (
                            <Text style={{ fontSize: 9, color: '#AA4444', marginTop: 3 }}>
                              建议下届再议 · 改善候选人条件（能力/忠诚/异地经历/年龄）
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </>
          )}

          {nominations.length === 0 && (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🏛️</Text>
              <Text style={{ fontSize: 14, color: MUT, textAlign: 'center' }}>暂无提名记录</Text>
              <Text style={{ fontSize: 11, color: '#4A3A18', marginTop: 4 }}>
                {isWindowOpen ? '在「提名候选」页发起提名' : `${countdownText(gameDays, activeCongress.windowStart)}后进入代会窗口期`}
              </Text>
            </View>
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </View>
  );
}
