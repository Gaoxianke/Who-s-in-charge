// 组织部页面 - 招募新干部 / 年度编制分配 / 申请调任历史下属 / 年度晋升提报
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import {
  getOrCreateQuarterCandidates,
  getCurrentRecruitKey,
  getRecruitRoundLabel,
  getRecruitOrg,
  getTransferredSubordinates,
  recallSubordinate,
  getSubordinatesByRank,
  confirmManualRecruits,
} from '@/db/gameApi';
import type { RecruitCandidate, Subordinate } from '@/types/game';
import { getSubAvatarEmoji, getAvatarBgColor, DEPT_CONFIG, FACTION_LABEL, FACTION_COLOR, FACTION_SHORT, SUB_LEVEL_NAMES } from '@/types/game';
import { StatBar } from '@/components/StatBar';

type Tab = 'recruit' | 'orgdept' | 'staff' | 'recall' | 'nominate';

// ── 年度编制分配：按职级动态计算各部门编制配额 ──────────────────
function getDeptQuota(rankLevel: number): { deptName: string; quota: number; current: number }[] {
  const base = rankLevel <= 6 ? 3 : rankLevel <= 8 ? 5 : rankLevel <= 10 ? 8 : rankLevel <= 12 ? 12 : 15;
  return Object.values(DEPT_CONFIG).map(cfg => ({
    deptName: cfg.name,
    quota: base + Math.floor(Math.random() * 3),
    current: Math.floor(base * 0.6),
  }));
}

// 年度编制申请选项
const STAFF_REQUEST_TYPES = [
  { label: '增加行政人员编制', desc: '向组织部申请增加1名行政岗人员', meritCost: 10, result: '核准增编1名' },
  { label: '申请技术专家岗',   desc: '引进高水平专业技术人才',         meritCost: 20, result: '专家入编，能力+15' },
  { label: '申请领导岗扩编',   desc: '增加副职领导岗位名额',           meritCost: 30, result: '副职名额+1' },
  { label: '申请应急编制',     desc: '特殊事项临时增设岗位',           meritCost: 15, result: '临时编制2名' },
];

// ── 现实化招募背景信息 ─────────────────────────────────────────────
const RECRUIT_BG: { rankRange: [number, number]; title: string; org: string; desc: string; examName: string }[] = [
  {
    rankRange: [1, 3],
    title: '基层公务员招录',
    org: '县委组织部 · 人力资源和社会保障局',
    desc: '通过国家/省级公务员考试招录基层科员，经笔试、面试、政治审查后录用，由县委组织部审批备案，统一分配到乡镇各职能部门。',
    examName: '国考（11月）& 省考（3-4月）',
  },
  {
    rankRange: [4, 6],
    title: '县级机关公务员补充',
    org: '市委组织部 · 县委人力资源和社会保障局',
    desc: '县级机关干部主要通过省考招录，补充科员至副科级职位。录用人员经组织部政治考察后，按能力专长分配至各职能局，严禁超编招录。',
    examName: '省级公务员考试（每年2批次）',
  },
  {
    rankRange: [7, 9],
    title: '市级机关干部统筹',
    org: '省委组织部 · 市委人力资源和社会保障局',
    desc: '市级以上机关干部由省委组织部统一调配，以调任、遴选为主，公开考试为辅。重要岗位须经市委常委会研究通过。',
    examName: '遴选考试 & 组织调配',
  },
  {
    rankRange: [10, 15],
    title: '中枢组织部统筹分配',
    org: '中枢组织部',
    desc: '省部级及以上干部由中枢组织部统一管理，通过考察、推荐、中枢决策常委会审议等程序产生，不通过公开考试招录。',
    examName: '中央统一调配',
  },
];

function getRecruitBg(rankLevel: number) {
  return RECRUIT_BG.find(b => rankLevel >= b.rankRange[0] && rankLevel <= b.rankRange[1]) ?? RECRUIT_BG[0];
}

/**
 * 现实层级对照：召回/展示的"主要人员"范围
 *   乡镇(rank1-3)    → 无下属可召回（不参与管干部）
 *   县级(rank4-6)    → 正科(3)、副科(2)  [乡镇主要领导]
 *   市级(rank7-9)    → 正处(5)、副处(4)  [县级主要领导]
 *   省级(rank10-11)  → 正厅(7)、副厅(6)  [市级主要领导]
 *   国家级(rank12+)  → 正部(9)、副部(8)  [省级主要领导]
 */
function getMainSubLevelRange(rankLevel: number): { min: number; max: number } {
  if (rankLevel <= 3)   return { min: 1, max: 1 };  // 乡镇仅科员
  if (rankLevel <= 6)   return { min: 2, max: 3 };  // 县级 → 副科/正科
  if (rankLevel <= 9)   return { min: 4, max: 5 };  // 市级 → 副处/正处
  if (rankLevel <= 11)  return { min: 6, max: 7 };  // 省级 → 副厅/正厅
  return { min: 8, max: 9 };                        // 国家级 → 副部/正部
}

function getRecallLevelDesc(rankLevel: number): string {
  if (rankLevel <= 3)  return '科员级';
  if (rankLevel <= 6)  return '副科至正科级（乡镇主要领导）';
  if (rankLevel <= 9)  return '副处至正处级（县区主要领导）';
  if (rankLevel <= 11) return '副厅至正厅级（地市主要领导）';
  return '副部至正部级（省级主要领导）';
}

export default function RecruitScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave, refreshSave } = useGame();
  const [tab, setTab] = useState<Tab>(() => (save && save.rankLevel >= 7) ? 'orgdept' : 'recruit');

  // ── Tab1: 招募（手动甄选模式）──
  const [candidates, setCandidates] = useState<RecruitCandidate[]>([]);
  const [recruitedList, setRecruitedList] = useState<RecruitCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [usedCount, setUsedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [feedbackOk, setFeedbackOk] = useState(true);
  const [assignmentLog, setAssignmentLog] = useState<{ name: string; dept: string; position: string }[]>([]);
  const [recruitType, setRecruitType] = useState<'national' | 'provincial'>('national');

  // ── Tab2: 编制分配 ──
  const [staffYear] = useState(() => save ? Math.floor(save.gameDays / 365) : 0);
  const [staffRequestDone, setStaffRequestDone] = useState<Set<number>>(new Set());
  const [deptQuota] = useState(() => save ? getDeptQuota(save.rankLevel) : []);

  // ── Tab3: 调任历史下属 ──
  const [transferred, setTransferred] = useState<Subordinate[]>([]);
  const [recallLoading, setRecallLoading] = useState(false);
  const [recalledIds, setRecalledIds] = useState<Set<string>>(new Set());

  // ── Tab4: 年度晋升提报（市委以上 rankLevel >= 7）──
  const [nominateSubs, setNominateSubs] = useState<Subordinate[]>([]);
  const [nominateLoading, setNominateLoading] = useState(false);
  const [nominatedIds, setNominatedIds] = useState<Set<string>>(new Set());
  const [nominateSubmitted, setNominateSubmitted] = useState(false);
  const currentYear = save ? Math.floor(save.gameDays / 365) : 0;
  const alreadyNominated = save ? (save.lastAnnualPromoteYear ?? -1) >= currentYear && currentYear > 0 : false;

  // ── 年度招募批次（每年2次，春0/秋1）──
  const currentRecruitKey = save ? getCurrentRecruitKey(save.gameDays) : 0;
  const alreadyRecruited = save ? (save.lastRecruitQuarter ?? 0) >= currentRecruitKey && currentRecruitKey > 0 : false;
  const recruitBg = save ? getRecruitBg(save.rankLevel) : RECRUIT_BG[0];
  // 当前批次类型：春季=国考，秋季=省考
  const isNationalExam = currentRecruitKey % 10 === 0;
  // 是否有新批次待处理（用于徽标提醒）
  const hasRecruitAlert = save ? save.rankLevel < 7 && !alreadyRecruited : false;

  const showMsg = (msg: string, ok = true) => {
    setFeedback(msg); setFeedbackOk(ok);
    setTimeout(() => setFeedback(''), 3500);
  };

  useFocusEffect(useCallback(() => {
    if (!save) return;
    setLoading(true);
    Promise.all([
      getOrCreateQuarterCandidates(save.id, save.userId, currentRecruitKey, save.rankLevel),
      getTransferredSubordinates(save.id),
      getSubordinatesByRank(save.id, save.rankLevel),
    ]).then(([cands, trans, subs]) => {
      // 本批次待甄选的候选人（pending）
      setCandidates(cands.filter(c => c.status === 'pending'));
      // 已完成批次：展示录用公示
      setRecruitedList(cands.filter(c => c.status === 'selected').sort((a, b) => (a.rankOrder ?? 99) - (b.rankOrder ?? 99)));
      setTransferred(trans);
      setUsedCount(subs.filter(s => !s.transferredCity).length);
      setLoading(false);
    });
    // 加载提报候选人（市委以上 rankLevel >= 7）
    if (save.rankLevel >= 7) {
      setNominateLoading(true);
      getSubordinatesByRank(save.id, save.rankLevel).then(subs => {
        const eligible = subs.filter(s => !s.transferredCity && s.subLevel >= 1 && s.subLevel <= Math.max(1, save.rankLevel - 2));
        setNominateSubs(eligible);
        setNominateLoading(false);
      });
    }
  }, [save, currentRecruitKey]));

  if (!save) return null;

  // ─── 编制余额与录取配额（R1.5：名册编制上限 145）───
  const balance = Math.max(0, 145 - usedCount);
  const rate = isNationalExam ? 0.2 : 0.4;
  const maxHire = Math.min(balance, Math.floor(candidates.length * rate));

  // ─── 手动甄选录用 ───
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < maxHire) next.add(id);
      return next;
    });
  };

  const toggleCompare = (id: string) => {
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const handleConfirmRecruits = async () => {
    if (!save || submitting || selectedIds.size === 0) return;
    setSubmitting(true);
    const result = await confirmManualRecruits(save.id, save.userId, currentRecruitKey, [...selectedIds], save.primaryFaction);
    await refreshSave();
    setRecruitedList(result.recruited);
    setAssignmentLog(result.assignments);
    setRecruitType(isNationalExam ? 'national' : 'provincial');
    setSelectedIds(new Set());
    setCompareIds([]);
    const typeLabel = isNationalExam ? '国考' : '省考';
    showMsg(`✅ ${typeLabel}本批次已录用${result.count}名干部并分配部门`);
    setSubmitting(false);
  };

  // ─── 编制申请操作 ───
  const handleStaffRequest = async (idx: number) => {
    if (!save || staffRequestDone.has(idx)) return;
    const req = STAFF_REQUEST_TYPES[idx];
    if (save.meritPoints < req.meritCost) {
      showMsg(`政绩不足，需 ${req.meritCost} 点`, false); return;
    }
    await updateGameSave({ meritPoints: save.meritPoints - req.meritCost });
    setStaffRequestDone(prev => new Set([...prev, idx]));
    showMsg(`✅ 「${req.label}」申请成功：${req.result}`);
  };

  // ─── 召回历史下属 ───
  const handleRecall = async (sub: Subordinate) => {
    if (!save || recalledIds.has(sub.id)) return;
    setRecallLoading(true);
    const ok = await recallSubordinate(sub.id);
    if (ok) {
      setRecalledIds(prev => new Set([...prev, sub.id]));
      setTransferred(prev => prev.filter(s => s.id !== sub.id));
      showMsg(`✅ ${sub.name} 已从${sub.transferredCity}调回，重新加入您的下属队伍`);
    } else {
      showMsg('召回失败，请稍后重试', false);
    }
    setRecallLoading(false);
  };

  // ─── 年度晋升提报 ───
  const handleToggleNominate = (sub: Subordinate) => {
    setNominatedIds(prev => {
      const next = new Set(prev);
      if (next.has(sub.id)) next.delete(sub.id);
      else next.add(sub.id);
      return next;
    });
  };

  const handleSubmitNominate = async () => {
    if (!save || nominatedIds.size === 0) return;
    // 记录本年度已提报，奖励政绩
    const meritBonus = nominatedIds.size * 15;
    await updateGameSave({
      meritPoints: save.meritPoints + meritBonus,
      lastAnnualPromoteYear: currentYear,
    });
    setNominateSubmitted(true);
    showMsg(`✅ 已向上级组织部提报 ${nominatedIds.size} 名干部，政绩+${meritBonus}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      <StatusBar style="light" backgroundColor="#1D3B5E" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#2B4B6F', paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 4 }}>
            <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>人事管理</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>组织部</Text>
            <Text style={{ color: '#a0b4cc', fontSize: 9, marginTop: 1 }}>{save.rankName} · {save.cityName}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 3 }}>
            <Text style={{ color: '#FFD700', fontSize: 11, fontWeight: '700' }}>第{staffYear + 1}年</Text>
            {hasRecruitAlert ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#C82829', paddingHorizontal: 7, paddingVertical: 3 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFD700' }} />
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
                  {isNationalExam ? '国考招募开放' : '省考招募开放'}
                </Text>
              </View>
            ) : (
              <Text style={{ color: '#a0b4cc', fontSize: 9 }}>历史下属 {transferred.length} 人可召回</Text>
            )}
          </View>
        </View>
        {/* Tab 切换 */}
        <View style={{ flexDirection: 'row', gap: 0, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
          {([
            // rank7以下才显示手动招募
            ...(save.rankLevel < 7 ? [{ key: 'recruit', label: '招募干部', badge: hasRecruitAlert }] : []),
            ...(save.rankLevel >= 7 ? [{ key: 'orgdept', label: '组织部分配', badge: false }] : []),
            { key: 'staff',    label: '编制分配', badge: false },
            { key: 'recall',   label: `召回下属${transferred.length > 0 ? `(${transferred.length})` : ''}`, badge: false },
            ...(save.rankLevel >= 7 ? [{ key: 'nominate', label: '年度提报', badge: false }] : []),
          ] as { key: Tab; label: string; badge: boolean }[]).map(t => (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key as Tab)}
              style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: tab === t.key ? '#C82829' : 'transparent' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: tab === t.key ? '700' : '400' }}>{t.label}</Text>
                {t.badge && (
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFD700', marginTop: -4 }} />
                )}
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 反馈条 */}
      {feedback ? (
        <View style={{ backgroundColor: feedbackOk ? '#e8f5e9' : '#ffebee', borderBottomWidth: 1, borderBottomColor: feedbackOk ? '#c8e6c9' : '#ffcdd2', padding: 10 }}>
          <Text style={{ color: feedbackOk ? '#2a7a3b' : '#C82829', fontSize: 12, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#C82829" />
        </View>
      ) : (
        <>
          {/* ══════ 组织部自动分配（rank7+）══════ */}
          {tab === 'orgdept' && (
            <ScrollView contentInsetAdjustmentBehavior="automatic">
              <View style={{ padding: 14, gap: 12 }}>
                {/* 说明横幅 */}
                <View style={{ backgroundColor: '#2B4B6F', padding: 14 }}>
                  <Text style={{ color: 'rgba(180,210,255,0.6)', fontSize: 9, letterSpacing: 2 }}>中枢组织部 · 干部统一分配</Text>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, marginTop: 3 }}>🏛️ 市级以上干部由组织部统筹</Text>
                  <Text style={{ color: 'rgba(180,210,255,0.85)', fontSize: 11, marginTop: 4, lineHeight: 16 }}>
                    根据全国干部库统筹调配，每季度自动完成选拔与分配，优先赴各地市重要岗位任职。
                  </Text>
                </View>

                {/* 本年度分配状态 */}
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14, gap: 10 }}>
                  <Text style={{ fontSize: 11, color: '#2B4B6B', fontWeight: '700', letterSpacing: 2 }}>本年度招募动态</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[
                      { label: '当前年度', val: `第${currentYear + 1}年`, color: '#2B4B6B' },
                      { label: '已录用', val: `${Math.min(12, (currentYear % 5) + 3)}名`, color: '#2a7a3b' },
                      { label: '在编干部', val: `${(currentYear % 4) + 6}名`, color: '#7B5E2A' },
                    ].map(s => (
                      <View key={s.label} style={{ flex: 1, alignItems: 'center', backgroundColor: '#F5F4F1', padding: 10 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: s.color }}>{s.val}</Text>
                        <Text style={{ fontSize: 9, color: '#888', marginTop: 2, textAlign: 'center' }}>{s.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* 普通干部分配 */}
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', overflow: 'hidden' }}>
                  <View style={{ backgroundColor: '#2B4B6F', padding: 10 }}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>📋 组织部统筹分配干部</Text>
                  </View>
                  {[
                    { name: '李明辉', score: 78, dept: '经济发展部门', level: '副处级', city: '本辖区' },
                    { name: '孙晓莉', score: 74, dept: '农业农村部门', level: '科级',   city: '本辖区' },
                    { name: '赵建国', score: 71, dept: '城市管理部门', level: '副科级', city: '本辖区' },
                    { name: '吴雅琴', score: 68, dept: '社会事务部门', level: '科级',   city: '本辖区' },
                  ].map((s, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', padding: 11, borderBottomWidth: i < 3 ? 1 : 0, borderBottomColor: '#F0F0F0', gap: 8 }}>
                      <View style={{ width: 28, height: 28, backgroundColor: '#2B4B6F', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 12 }}>{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{s.name}</Text>
                        <Text style={{ fontSize: 10, color: '#888', marginTop: 1 }}>{s.dept} · {s.level} · 综合{s.score}分</Text>
                      </View>
                      <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 6, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 9, color: '#2B4B6F' }}>分配至{s.city}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* 说明 */}
                <View style={{ backgroundColor: '#F0F4F8', padding: 12, borderLeftWidth: 3, borderLeftColor: '#2B4B6F' }}>
                  <Text style={{ fontSize: 11, color: '#555', lineHeight: 17 }}>
                    市级以上干部选拔由中枢组织部统一管理，每季度自动完成。综合考核满分100分，择优赴重点城市关键岗位任职。
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}

          {/* ══════ Tab1：招募干部 ══════ */}
          {tab === 'recruit' && (
            alreadyRecruited ? (
              /* ── 已完成：展示本批次录用公示 ── */
              <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 24 }}>
                <View style={{ backgroundColor: '#2B4B6F', padding: 16, alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 28 }}>{recruitType === 'national' ? '🏛️' : '📋'}</Text>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff', marginTop: 4 }}>
                    {recruitType === 'national' ? '国考录用公示' : '省考录用公示'}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#a0b4cc', textAlign: 'center', lineHeight: 17 }}>
                    {getRecruitRoundLabel(currentRecruitKey)}
                  </Text>
                  <View style={{ backgroundColor: recruitType === 'national' ? '#C8161D' : '#2a7a3b', paddingHorizontal: 10, paddingVertical: 4, marginTop: 4 }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                      {recruitType === 'national' ? `精英通道 · ${recruitBg.org}` : `编制补充 · ${recruitBg.org}`}
                    </Text>
                  </View>
                </View>

                {recruitedList.length > 0 ? (
                  <View style={{ gap: 10 }}>
                    <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '700', letterSpacing: 1 }}>
                      📄 录用人员档案（共{recruitedList.length}人 · 统一科员段起步）
                    </Text>
                    {recruitedList.map((c, idx) => {
                      const avatar = getSubAvatarEmoji(c.avatarId, c.gender);
                      const entryYear = c.birthYear ? (Math.floor(currentRecruitKey / 10) + 2000) : null;
                      const age = c.birthYear ? ((Math.floor(currentRecruitKey / 10) + 2000) - c.birthYear) : null;
                      const fLabel = FACTION_SHORT[c.faction] ?? '无';
                      const fColor = FACTION_COLOR[c.faction] ?? '#888';
                      return (
                        <View key={c.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', overflow: 'hidden' }}>
                          <View style={{ backgroundColor: '#F0F4F8', flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' }}>
                            <View style={{ width: 48, height: 48, backgroundColor: '#2B4B6F', alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ fontSize: 24 }}>{avatar}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={{ fontSize: 15, fontWeight: '700', color: '#222' }}>{c.name}</Text>
                                <Text style={{ fontSize: 11, color: '#888' }}>{c.gender}</Text>
                                {age && <Text style={{ fontSize: 11, color: '#888' }}>{age}岁</Text>}
                              </View>
                              <View style={{ flexDirection: 'row', gap: 4, marginTop: 3 }}>
                                <View style={{ backgroundColor: recruitType === 'national' ? '#2B4B6F' : '#2a7a3b', paddingHorizontal: 6, paddingVertical: 1 }}>
                                  <Text style={{ fontSize: 9, color: '#fff', fontWeight: '600' }}>科员段 · 第{idx + 1}名</Text>
                                </View>
                                <View style={{ backgroundColor: fColor + '22', borderWidth: 1, borderColor: fColor, paddingHorizontal: 6, paddingVertical: 1 }}>
                                  <Text style={{ fontSize: 9, color: fColor }}>{fLabel}</Text>
                                </View>
                                <View style={{ backgroundColor: '#F5F4F1', paddingHorizontal: 6, paddingVertical: 1, borderWidth: 1, borderColor: '#DDD' }}>
                                  <Text style={{ fontSize: 9, color: '#555' }}>{c.trait}</Text>
                                </View>
                              </View>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={{ fontSize: 20, fontWeight: '700', color: '#C8161D' }}>{c.score}</Text>
                              <Text style={{ fontSize: 9, color: '#888', marginTop: 1 }}>综合评分</Text>
                            </View>
                          </View>
                          <View style={{ padding: 10, gap: 6 }}>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              {[
                                { label: '出生年份', val: c.birthYear ? `${c.birthYear}年` : '--' },
                                { label: '入职年份', val: entryYear ? `${entryYear}年` : '--' },
                                { label: '籍贯', val: c.hometown ?? '--' },
                              ].map(f => (
                                <View key={f.label} style={{ flex: 1, backgroundColor: '#F9F9F9', padding: 6, borderWidth: 1, borderColor: '#EEE', alignItems: 'center' }}>
                                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#333' }}>{f.val}</Text>
                                  <Text style={{ fontSize: 9, color: '#999', marginTop: 1 }}>{f.label}</Text>
                                </View>
                              ))}
                            </View>
                            <View style={{ backgroundColor: '#F0F4F8', padding: 8, gap: 3, borderLeftWidth: 3, borderLeftColor: '#2B4B6F' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={{ fontSize: 10, color: '#555', fontWeight: '600' }}>🎓 毕业院校</Text>
                                <Text style={{ fontSize: 11, color: '#222', fontWeight: '700' }}>{c.university ?? '--'}</Text>
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={{ fontSize: 10, color: '#555', fontWeight: '600' }}>📚 所学专业</Text>
                                <Text style={{ fontSize: 11, color: '#2B4B6F' }}>{c.major ?? '--'}</Text>
                              </View>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              <View style={{ flex: 1 }}><StatBar label="能力" value={c.ability} /><StatBar label="忠诚" value={c.loyalty} /></View>
                              <View style={{ flex: 1 }}><StatBar label="廉洁" value={c.integrity} /><StatBar label="经验" value={c.experience} /></View>
                            </View>
                            {assignmentLog.find(a => a.name === c.name) && (() => {
                              const a = assignmentLog.find(a2 => a2.name === c.name)!;
                              return (
                                <View style={{ backgroundColor: '#E8F5E9', padding: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={{ fontSize: 11, color: '#2a7a3b' }}>🏢 分配至：</Text>
                                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#2a7a3b', flex: 1 }}>{a.dept} · {a.position}</Text>
                                </View>
                              );
                            })()}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={{ backgroundColor: '#F5F4F1', padding: 14, alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 14, color: '#888' }}>📭 本批次暂无录用公示数据</Text>
                  </View>
                )}

                <View style={{ backgroundColor: '#FFF8E7', borderWidth: 1, borderColor: '#F0C040', padding: 12, gap: 4 }}>
                  <Text style={{ fontSize: 11, color: '#7a5c00', fontWeight: '700' }}>📅 下次招募时间</Text>
                  <Text style={{ fontSize: 11, color: '#555', lineHeight: 17 }}>
                    {currentRecruitKey % 10 === 0
                      ? '秋季省考批次将于本年后半期开放（约第183天起）—— 录取率40%，按编制空缺补充'
                      : '明年春季国考批次将于次年前半期开放（约次年第1天起）—— 录取率20%，精英通道'}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable onPress={() => setTab('recall')} style={{ flex: 1, backgroundColor: '#2B4B6F', paddingVertical: 12, alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>查看可召回历史下属</Text>
                  </Pressable>
                  <Pressable onPress={() => router.back()} style={{ flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#DDD', alignItems: 'center' }}>
                    <Text style={{ color: '#666', fontSize: 13 }}>返回</Text>
                  </Pressable>
                </View>
              </ScrollView>
            ) : (
              /* ── 手动甄选：候选人名册 ── */
              <ScrollView contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: insets.bottom + 24 }}>
                {/* 招募机构背景 */}
                <View style={{ backgroundColor: '#1B3A6B', padding: 14, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ backgroundColor: isNationalExam ? '#C8161D' : '#2a7a3b', paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>
                        {isNationalExam ? '🏛️ 国家公务员考试' : '📋 省级公务员考试'}
                      </Text>
                    </View>
                    <Text style={{ color: '#FFD700', fontSize: 10 }}>{isNationalExam ? '春季批次 · 录取率20%' : '秋季批次 · 录取率40%'}</Text>
                  </View>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{recruitBg.title}</Text>
                  <Text style={{ color: 'rgba(180,210,255,0.9)', fontSize: 11, lineHeight: 17 }}>{recruitBg.desc}</Text>
                </View>

                {/* 编制与配额 */}
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 12, gap: 8 }}>
                  <Text style={{ fontSize: 11, color: '#2B4B6B', fontWeight: '700', letterSpacing: 1 }}>编制与录取配额</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[
                      { label: '编制上限', val: '145', color: '#2B4B6B' },
                      { label: '已用编制', val: `${usedCount}`, color: '#7B5E2A' },
                      { label: '编制余额', val: `${balance}`, color: balance > 0 ? '#2a7a3b' : '#C8161D' },
                      { label: '本批可录用', val: `${maxHire}`, color: '#C8161D' },
                    ].map(s => (
                      <View key={s.label} style={{ flex: 1, alignItems: 'center', backgroundColor: '#F5F4F1', padding: 8 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: s.color }}>{s.val}</Text>
                        <Text style={{ fontSize: 9, color: '#888', marginTop: 2, textAlign: 'center' }}>{s.label}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={{ fontSize: 10, color: '#888', lineHeight: 15 }}>
                    本批可录用 = min(编制余额 145−{usedCount}, 候选人{candidates.length}×录取率{Math.round(rate * 100)}%) = {maxHire} 名
                  </Text>
                </View>

                {/* 候选人名册 */}
                <Text style={{ fontSize: 11, color: '#2B4B6B', fontWeight: '700', letterSpacing: 1 }}>
                  📋 候选人名册（共{candidates.length}名 · 已选{selectedIds.size}/{maxHire}）
                </Text>
                {candidates.map(c => {
                  const avatar = getSubAvatarEmoji(c.avatarId, c.gender);
                  const sameFaction = c.faction === save.primaryFaction;
                  const fLabel = FACTION_SHORT[c.faction] ?? '无';
                  const fColor = FACTION_COLOR[c.faction] ?? '#888';
                  const isSelected = selectedIds.has(c.id);
                  const inCompare = compareIds.includes(c.id);
                  const canSelect = isSelected || selectedIds.size < maxHire;
                  const age = c.birthYear ? ((Math.floor(currentRecruitKey / 10) + 2000) - c.birthYear) : null;
                  return (
                    <View key={c.id} style={{ backgroundColor: isSelected ? '#EEF4FF' : '#fff', borderWidth: isSelected ? 2 : 1, borderColor: isSelected ? '#1B3A6B' : '#D1D1D1', overflow: 'hidden' }}>
                      <View style={{ backgroundColor: '#F0F4F8', flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' }}>
                        <View style={{ width: 46, height: 46, backgroundColor: '#1B3A6B', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 23 }}>{avatar}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: 15, fontWeight: '700', color: '#222' }}>{c.name}</Text>
                            <Text style={{ fontSize: 11, color: '#888' }}>{c.gender}{age ? ` · ${age}岁` : ''}</Text>
                            <View style={{ backgroundColor: fColor + '22', borderWidth: 1, borderColor: fColor, paddingHorizontal: 5, paddingVertical: 1 }}>
                              <Text style={{ fontSize: 9, color: fColor }}>{fLabel}</Text>
                            </View>
                            {sameFaction ? (
                              <View style={{ backgroundColor: '#2a7a3b', paddingHorizontal: 5, paddingVertical: 1 }}>
                                <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>同派系 +10忠诚</Text>
                              </View>
                            ) : (
                              <View style={{ backgroundColor: '#fff0f0', borderWidth: 1, borderColor: '#C8161D', paddingHorizontal: 5, paddingVertical: 1 }}>
                                <Text style={{ fontSize: 9, color: '#C8161D' }}>派系风险</Text>
                              </View>
                            )}
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                            <View style={{ backgroundColor: '#F5F4F1', paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1, borderColor: '#DDD' }}>
                              <Text style={{ fontSize: 9, color: '#555' }}>{c.trait}</Text>
                            </View>
                            <Text style={{ fontSize: 10, color: '#888' }}>{c.university ?? '--'}</Text>
                          </View>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 20, fontWeight: '700', color: '#C8161D' }}>{c.score}</Text>
                          <Text style={{ fontSize: 9, color: '#888', marginTop: 1 }}>综合评分</Text>
                        </View>
                      </View>
                      <View style={{ padding: 10, gap: 6 }}>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <View style={{ flex: 1 }}><StatBar label="能力" value={c.ability} /><StatBar label="忠诚" value={sameFaction ? Math.min(99, c.loyalty + 10) : c.loyalty} /></View>
                          <View style={{ flex: 1 }}><StatBar label="廉洁" value={c.integrity} /><StatBar label="经验" value={c.experience} /></View>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <Pressable onPress={() => toggleSelect(c.id)} disabled={!canSelect}
                            style={{ flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: isSelected ? '#1B3A6B' : canSelect ? '#2B4B6B' : '#CCC' }}>
                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{isSelected ? '✓ 已选' : '勾选录用'}</Text>
                          </Pressable>
                          <Pressable onPress={() => toggleCompare(c.id)}
                            style={{ paddingVertical: 9, paddingHorizontal: 14, alignItems: 'center', backgroundColor: inCompare ? '#C8161D' : '#fff', borderWidth: 1, borderColor: inCompare ? '#C8161D' : '#CCC' }}>
                            <Text style={{ color: inCompare ? '#fff' : '#666', fontSize: 12, fontWeight: '700' }}>{inCompare ? '✓ 对比' : '对比'}</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  );
                })}

                {/* 档案对比面板 */}
                {compareIds.length >= 2 && (
                  <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#1B3A6B', overflow: 'hidden' }}>
                    <View style={{ backgroundColor: '#1B3A6B', padding: 10 }}>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>📊 档案对比（按胜任度排序）</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 10, gap: 10 }}>
                      {[...candidates.filter(c => compareIds.includes(c.id))]
                        .sort((a, b) => (b.ability + (b.faction === save.primaryFaction ? 10 : 0)) - (a.ability + (a.faction === save.primaryFaction ? 10 : 0)))
                        .map((c, idx) => {
                          const avatar = getSubAvatarEmoji(c.avatarId, c.gender);
                          const sameFaction = c.faction === save.primaryFaction;
                          const fColor = FACTION_COLOR[c.faction] ?? '#888';
                          const competence = c.ability + (sameFaction ? 10 : 0);
                          return (
                            <View key={c.id} style={{ width: 150, backgroundColor: idx === 0 ? '#FFF8E7' : '#F8F8F8', borderWidth: 1, borderColor: idx === 0 ? '#E6A817' : '#DDD', padding: 8, gap: 4 }}>
                              {idx === 0 && <Text style={{ fontSize: 9, color: '#E6A817', fontWeight: '700' }}>🏆 推荐首选</Text>}
                              <View style={{ alignItems: 'center', gap: 2 }}>
                                <View style={{ width: 40, height: 40, backgroundColor: '#1B3A6B', alignItems: 'center', justifyContent: 'center' }}>
                                  <Text style={{ fontSize: 20 }}>{avatar}</Text>
                                </View>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{c.name}</Text>
                                <View style={{ backgroundColor: fColor + '22', borderWidth: 1, borderColor: fColor, paddingHorizontal: 4, paddingVertical: 1 }}>
                                  <Text style={{ fontSize: 8, color: fColor }}>{FACTION_SHORT[c.faction] ?? '无'}</Text>
                                </View>
                              </View>
                              <View style={{ alignItems: 'center', backgroundColor: '#F0F4F8', padding: 4 }}>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#1B3A6B' }}>胜任度 {competence}</Text>
                              </View>
                              <Text style={{ fontSize: 10, color: '#555' }}>能力 {c.ability} · 廉洁 {c.integrity}</Text>
                              <Text style={{ fontSize: 10, color: '#555' }}>忠诚 {c.loyalty}{sameFaction ? '+10' : ''} · 经验 {c.experience}</Text>
                              <Text style={{ fontSize: 9, color: '#888' }}>{c.trait}</Text>
                              <Text style={{ fontSize: 9, color: '#888' }} numberOfLines={1}>{c.university ?? '--'}</Text>
                            </View>
                          );
                        })}
                    </ScrollView>
                    <Pressable onPress={() => setCompareIds([])} style={{ backgroundColor: '#F0F4F8', padding: 8, alignItems: 'center' }}>
                      <Text style={{ fontSize: 11, color: '#2B4B6B' }}>清除对比</Text>
                    </Pressable>
                  </View>
                )}

                {/* 提交录用 */}
                <Pressable onPress={() => void handleConfirmRecruits()} disabled={submitting || selectedIds.size === 0}
                  style={{ backgroundColor: submitting || selectedIds.size === 0 ? '#CCC' : '#C8161D', paddingVertical: 14, alignItems: 'center', gap: 4 }}>
                  {submitting ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>组织部审核中…</Text>
                    </View>
                  ) : (
                    <>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                        ✅ 确认录用所选 {selectedIds.size} 名干部
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10 }}>同派系干部忠诚度初始+10，录用后统一科员段并分配部门</Text>
                    </>
                  )}
                </Pressable>
              </ScrollView>
            )
          )}
          {tab === 'staff' && (
            <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }} contentInsetAdjustmentBehavior="automatic">
              {/* 今年编制概况 */}
              <View style={{ backgroundColor: '#2B4B6F', padding: 14 }}>
                <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2, marginBottom: 4 }}>第{staffYear + 1}年度</Text>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 8 }}>分管部门编制情况</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[
                    { label: '总编制', value: deptQuota.reduce((s, d) => s + d.quota, 0), color: '#FFD700' },
                    { label: '已用', value: deptQuota.reduce((s, d) => s + d.current, 0), color: '#90CAF9' },
                    { label: '空缺', value: deptQuota.reduce((s, d) => s + (d.quota - d.current), 0), color: '#A5D6A7' },
                  ].map(item => (
                    <View key={item.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', padding: 8, alignItems: 'center' }}>
                      <Text style={{ color: item.color, fontSize: 18, fontWeight: '700' }}>{item.value}</Text>
                      <Text style={{ color: '#a0b4cc', fontSize: 9, marginTop: 2 }}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* 各部门编制列表 */}
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 12, gap: 8 }}>
                <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>各部门编制明细</Text>
                {deptQuota.map((dept, i) => {
                  const pct = Math.round((dept.current / dept.quota) * 100);
                  const fill = pct >= 90 ? '#C82829' : pct >= 60 ? '#2a7a3b' : '#7B5E2A';
                  return (
                    <View key={i} style={{ gap: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#222' }}>{dept.deptName}</Text>
                        <Text style={{ fontSize: 11, color: '#888' }}>{dept.current}/{dept.quota} 人</Text>
                      </View>
                      <View style={{ height: 6, backgroundColor: '#EEE' }}>
                        <View style={{ height: 6, width: `${pct}%`, backgroundColor: fill }} />
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* 编制申请 */}
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 12, gap: 8 }}>
                <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>📋 申请增加编制</Text>
                <Text style={{ fontSize: 11, color: '#888', marginBottom: 6, lineHeight: 17 }}>
                  每年可向组织部提交编制申请，经审批后增加部门人力资源配额。
                </Text>
                {STAFF_REQUEST_TYPES.map((req, idx) => {
                  const isDone = staffRequestDone.has(idx);
                  const canAfford = save.meritPoints >= req.meritCost;
                  return (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: isDone ? '#2a7a3b' : '#D1D1D1', padding: 10, gap: 8, backgroundColor: isDone ? '#f0faf3' : '#fff' }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: isDone ? '#2a7a3b' : '#222' }}>{req.label}</Text>
                          <View style={{ backgroundColor: isDone ? '#2a7a3b' : '#2B4B6F', paddingHorizontal: 5, paddingVertical: 1 }}>
                            <Text style={{ color: '#fff', fontSize: 9 }}>{isDone ? '✓已申请' : `${req.meritCost}政绩`}</Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{req.desc}</Text>
                        {isDone && <Text style={{ fontSize: 10, color: '#2a7a3b', marginTop: 2 }}>✅ 已获批：{req.result}</Text>}
                      </View>
                      {!isDone && (
                        <Pressable
                          onPress={() => void handleStaffRequest(idx)}
                          disabled={!canAfford}
                          style={{ backgroundColor: canAfford ? '#2B4B6F' : '#CCC', paddingHorizontal: 12, paddingVertical: 7 }}
                        >
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>申请</Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>

              <View style={{ backgroundColor: '#F0F4F8', borderWidth: 1, borderColor: '#D1D1D1', padding: 10 }}>
                <Text style={{ fontSize: 10, color: '#2B4B6F', fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>说明</Text>
                <Text style={{ fontSize: 11, color: '#666', lineHeight: 17 }}>
                  · 编制情况每年（365天）自动重置，根据职级重新分配{'\n'}
                  · 政绩充足时可申请增编，审批结果即时生效{'\n'}
                  · 每项申请在本年度内只能提交一次
                </Text>
              </View>
            </ScrollView>
          )}

          {/* ══════ Tab3：申请召回历史下属 ══════ */}
          {tab === 'recall' && (
            <ScrollView contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: insets.bottom + 24 }}>
              <View style={{ backgroundColor: '#2B4B6F', padding: 12, marginBottom: 4 }}>
                <Text style={{ color: '#FFD700', fontSize: 14, fontWeight: '700', marginBottom: 4 }}>召回历史下属</Text>
                <Text style={{ color: '#a0b4cc', fontSize: 11, lineHeight: 17 }}>
                  这里列出了您曾经共事、后调任他处的下属干部中的主要人员（
                  {save ? getRecallLevelDesc(save.rankLevel) : ''}
                  ）。您可申请将其召回，重新纳入当前职位的管辖队伍。
                </Text>
              </View>

              {recallLoading && <ActivityIndicator size="small" color="#C82829" />}

              {(() => {
                // 按玩家职级过滤"主要人员"（只展示直接下级层次）
                const recallFiltered = save
                  ? transferred.filter(s => {
                      const { min, max } = getMainSubLevelRange(save.rankLevel);
                      return s.subLevel >= min && s.subLevel <= max;
                    })
                  : transferred;
                if (recallFiltered.length === 0) {
                  return (
                    <View style={{ alignItems: 'center', padding: 40 }}>
                      <Text style={{ fontSize: 32, marginBottom: 12 }}>📭</Text>
                      <Text style={{ fontSize: 14, color: '#888', fontWeight: '600', marginBottom: 6 }}>暂无可召回的主要人员</Text>
                      <Text style={{ fontSize: 12, color: '#aaa', textAlign: 'center' }}>
                        在下属管理中将{getRecallLevelDesc(save?.rankLevel ?? 3)}干部调任后，可在此召回。
                      </Text>
                    </View>
                  );
                }
                return recallFiltered.map(sub => {
                  const emoji = getSubAvatarEmoji(sub.avatarId ?? 0, sub.gender ?? '男');
                  const bg    = getAvatarBgColor(sub.avatarId ?? 0, sub.faction ?? 'neutral');
                  const factionLabel = FACTION_LABEL[sub.faction] ?? '无';
                  const factionColor = FACTION_COLOR[sub.faction] ?? '#888';
                  const levelName = SUB_LEVEL_NAMES[sub.subLevel] ?? '待定';
                  const recalled = recalledIds.has(sub.id);
                  return (
                    <View key={sub.id} style={{ backgroundColor: recalled ? '#f0faf3' : '#fff', borderWidth: 1, borderColor: recalled ? '#2a7a3b' : '#D1D1D1', padding: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 22 }}>{emoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#222' }}>{sub.name}</Text>
                            <View style={{ backgroundColor: factionColor + '22', borderWidth: 1, borderColor: factionColor, paddingHorizontal: 5, paddingVertical: 1 }}>
                              <Text style={{ color: factionColor, fontSize: 9, fontWeight: '700' }}>{factionLabel}</Text>
                            </View>
                            <View style={{ backgroundColor: '#E8F0F8', paddingHorizontal: 5, paddingVertical: 1 }}>
                              <Text style={{ fontSize: 9, color: '#2B4B6F' }}>{levelName}</Text>
                            </View>
                          </View>
                          <Text style={{ fontSize: 11, color: '#888', marginTop: 1 }}>
                            {sub.position} · 现任职于 {sub.transferredCity}
                          </Text>
                        </View>
                        {recalled ? (
                          <View style={{ backgroundColor: '#2a7a3b', paddingHorizontal: 10, paddingVertical: 6 }}>
                            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>已召回</Text>
                          </View>
                        ) : (
                          <Pressable
                            onPress={() => void handleRecall(sub)}
                            disabled={recallLoading}
                            style={{ backgroundColor: '#C82829', paddingHorizontal: 10, paddingVertical: 6 }}
                          >
                            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>申请召回</Text>
                          </Pressable>
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <StatBar label="能力" value={sub.ability} />
                          <StatBar label="忠诚" value={sub.loyalty} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <StatBar label="廉洁" value={sub.integrity} />
                          <StatBar label="经验" value={sub.experience} />
                        </View>
                      </View>
                    </View>
                  );
                });
              })()}
            </ScrollView>
          )}

          {/* ══════ Tab4：年度晋升提报 ══════ */}
          {tab === 'nominate' && (
            <ScrollView contentInsetAdjustmentBehavior="automatic">
              {/* 说明横幅 */}
              <View style={{ backgroundColor: '#2B4B6F', padding: 14, gap: 4 }}>
                <Text style={{ color: 'rgba(160,180,204,0.7)', fontSize: 9, letterSpacing: 2 }}>组织部 · 年度干部考察提报</Text>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>📋 第 {currentYear + 1} 年度晋升提报</Text>
                <Text style={{ color: 'rgba(160,180,204,0.85)', fontSize: 11, lineHeight: 17, marginTop: 4 }}>
                  每年由组织部对市委以上干部进行考察提报，选拔优秀人才报上级党委审核晋升。
                  省级以下干部由省长/省委书记自行决定，无需通过此通道。每年度只能提报一次。
                </Text>
              </View>

              {/* 已完成提示 */}
              {(alreadyNominated || nominateSubmitted) ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 }}>
                  <Text style={{ fontSize: 40 }}>✅</Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#2B4B6F' }}>本年度提报已完成</Text>
                  <Text style={{ fontSize: 12, color: '#888', textAlign: 'center' }}>
                    第 {currentYear + 1} 年度干部晋升提报已提交组织部，等待上级党委审批。
                    {'\n'}下一年度可重新提报。
                  </Text>
                </View>
              ) : (
                <View style={{ padding: 14, gap: 10 }}>
                  {nominateLoading ? (
                    <View style={{ alignItems: 'center', padding: 30 }}>
                      <ActivityIndicator color="#1D3B5E" />
                    </View>
                  ) : nominateSubs.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                      <Text style={{ color: '#888', fontSize: 14 }}>暂无符合条件的提报对象</Text>
                      <Text style={{ color: '#aaa', fontSize: 11, marginTop: 6, textAlign: 'center' }}>
                        需下属在职且职级在市委级别以下
                      </Text>
                    </View>
                  ) : (
                    <>
                      <View style={{ backgroundColor: '#FFF9E6', borderWidth: 1, borderColor: '#E8D080', padding: 10 }}>
                        <Text style={{ fontSize: 11, color: '#7B5E2A' }}>
                          📌 已选 {nominatedIds.size} 人提报 · 建议优先选取能力值≥70、廉洁值≥60的干部
                        </Text>
                      </View>

                      {nominateSubs.map(sub => {
                        const isSelected = nominatedIds.has(sub.id);
                        const avatarEmoji = getSubAvatarEmoji(sub.avatarId ?? 0, sub.gender ?? '男');
                        const avatarBg    = getAvatarBgColor(sub.avatarId ?? 0, sub.faction ?? 'neutral');
                        const factionLabel = FACTION_LABEL[sub.faction] ?? '无';
                        const factionColor = FACTION_COLOR[sub.faction] ?? '#888';
                        const levelName   = SUB_LEVEL_NAMES[sub.subLevel] ?? '待定';
                        // 综合评分：能力40+廉洁30+忠诚20+政绩10
                        const score = Math.round(sub.ability * 0.4 + sub.integrity * 0.3 + sub.loyalty * 0.2 + Math.min(100, sub.experience / 50) * 0.1);
                        const isHighScore = score >= 65;

                        return (
                          <Pressable
                            key={sub.id}
                            onPress={() => handleToggleNominate(sub)}
                            style={{
                              backgroundColor: isSelected ? '#EEF4FF' : '#fff',
                              borderWidth: 1.5,
                              borderColor: isSelected ? '#2B4B6F' : '#D0D0D0',
                              padding: 12,
                              flexDirection: 'row',
                              gap: 10,
                              alignItems: 'flex-start',
                            }}
                          >
                            {/* 头像 */}
                            <View style={{ width: 38, height: 38, backgroundColor: avatarBg, alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ fontSize: 18 }}>{avatarEmoji}</Text>
                            </View>

                            {/* 信息 */}
                            <View style={{ flex: 1, gap: 3 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{sub.name}</Text>
                                {isHighScore && (
                                  <View style={{ backgroundColor: '#2a7a3b', paddingHorizontal: 5, paddingVertical: 1 }}>
                                    <Text style={{ fontSize: 8, color: '#fff', fontWeight: '700' }}>优秀</Text>
                                  </View>
                                )}
                                <View style={{ backgroundColor: factionColor + '22', paddingHorizontal: 5, paddingVertical: 1 }}>
                                  <Text style={{ fontSize: 8, color: factionColor }}>{factionLabel}</Text>
                                </View>
                              </View>
                              <Text style={{ fontSize: 10, color: '#888' }}>{levelName} · 综合评分 {score}</Text>
                              <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                                <Text style={{ fontSize: 9, color: '#555' }}>能力 {sub.ability}</Text>
                                <Text style={{ fontSize: 9, color: '#555' }}>廉洁 {sub.integrity}</Text>
                                <Text style={{ fontSize: 9, color: '#555' }}>忠诚 {sub.loyalty}</Text>
                              </View>
                            </View>

                            {/* 勾选状态 */}
                            <View style={{
                              width: 22, height: 22,
                              backgroundColor: isSelected ? '#2B4B6F' : '#fff',
                              borderWidth: 1.5, borderColor: isSelected ? '#2B4B6F' : '#CCC',
                              alignItems: 'center', justifyContent: 'center',
                            }}>
                              {isSelected && <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>✓</Text>}
                            </View>
                          </Pressable>
                        );
                      })}

                      {/* 提交按钮 */}
                      <Pressable
                        onPress={() => void handleSubmitNominate()}
                        disabled={nominatedIds.size === 0}
                        style={{
                          backgroundColor: nominatedIds.size > 0 ? '#2B4B6F' : '#CCC',
                          paddingVertical: 14,
                          alignItems: 'center',
                          marginTop: 6,
                        }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                          {nominatedIds.size > 0
                            ? `📤 提报 ${nominatedIds.size} 名干部至上级组织部`
                            : '请先选择提报对象'}
                        </Text>
                      </Pressable>
                    </>
                  )}
                </View>
              )}
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}
