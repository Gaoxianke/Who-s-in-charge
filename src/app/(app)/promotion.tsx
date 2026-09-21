// 晋升评审页面 v5 — 三 Tab（派系攻夺战 / 个人争夺战 / 晋升条件）
// 废弃旧五步流程（PromotionFlow/pending_promotion）与旧 Tab（岗位空缺/破格通道）；落档统一走 applyContestWin
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getNpcBand, generateRankUpSubordinates } from '@/db/gameApi';
import { getTierOf } from '@/lib/promotionEngine';
import {
  COUNTY_OFFICIAL_POSITIONS,
  CITY_OFFICIAL_POSITIONS,
  SUB_PROVINCE_CITY_POSITIONS,
  PROVINCE_OFFICIAL_POSITIONS,
  RANK_CONFIG,
  getRandomCityForRank,
  FACTION_LABEL,
  type FactionId,
  type PlayerSave,
  type PromotionContest,
} from '@/types/game';
import {
  applyContestWin,
  resolveContestDetailed,
  checkPromotionGate,
  getContestCycleId,
  getPositionVacancy,
  attemptBreakPromote,
  validatePromotion,
  getFactionLevel,
  getUnlockedFactionPositions,
  getFactionPositionVacancy,
  promoteFactionPosition,
  applyTransfer,
  recommendPromote,
} from '@/lib/promotionFaction';
import { FACTION_POSITIONS } from '@/types/game';
import { bumpCycleContestWin } from '@/lib/factionExpansion';
import { CONTEST_COSTS, PROVINCE_ATTACK_COST } from '@/lib/provinceSeatSystem';
import { nanoid } from '@/lib/nanoid';
import { WIND_CYCLE_DAYS } from '@/lib/factionSystem';
import { PositionBoard } from '@/components/PositionBoard';
import { FactionAttackMap } from '@/components/promotion/FactionAttackMap';
import { ConditionsTab } from '@/components/promotion/ConditionsTab';
import { startRivalInvestigation, applyAnonymousLeak, applyCooptRival, type RivalProfile } from '@/lib/rivalSystem';
import { RecordsTab } from '@/components/promotion/RecordsTab';
import { buildTimingReport, applyMomentum, startWaiting, applyEmergencyPromotion } from '@/lib/promotionTimingSystem';

type TabKey = 'factionAttack' | 'personalContest' | 'conditions' | 'records' | 'rivals' | 'timing';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'factionAttack', label: '派系攻夺战' },
  { key: 'personalContest', label: '个人争夺战' },
  { key: 'conditions', label: '晋升条件' },
  { key: 'records', label: '晋升记录' },
  { key: 'rivals', label: '政敌' },
  { key: 'timing', label: '时机' },
];

// 顶栏背景图：古典建筑远景，贴合政务晋升主题，视觉中性
const PROMO_HEADER_BG = 'https://miaoda-site-img.cdn.bcebos.com/images/docsearch_819b8088-e0d9-48eb-b3da-eb04af3e2a5c.png';

/** 可选职位的最小结构（用于统一不同官职数组类型） */
type SelectablePosition = { key: string; title: string; tier: string; organ: string; desc: string };

/**
 * #2 修复越级显示：仅返回当前职级的「直接下一级」可选官职，
 * 严格按目标职级（rankLevel+1）的 rankGrade 过滤，禁止跨级出现越级职位。
 */
function getPositionsForRank(rankLevel: number): SelectablePosition[] {
  const nextRank = rankLevel + 1;
  const nextCfg = RANK_CONFIG[nextRank];
  if (!nextCfg) return [];
  const nextGrade = nextCfg.rankGrade;
  const tier = getTierOf(nextRank);
  const pool: SelectablePosition[] =
    tier === 1 ? COUNTY_OFFICIAL_POSITIONS
    : tier === 2 ? COUNTY_OFFICIAL_POSITIONS
    : tier === 3 ? CITY_OFFICIAL_POSITIONS
    : tier === 4 ? [...SUB_PROVINCE_CITY_POSITIONS, ...PROVINCE_OFFICIAL_POSITIONS]
    : PROVINCE_OFFICIAL_POSITIONS;
  const direct = pool.filter(p => p.tier === nextGrade);
  if (direct.length > 0) return direct;
  // 极高层级（国家级副职/正职/最高领导层）无对应官职对象，回退为以职级名为名的单一职位
  return [{ key: `rank_${nextRank}`, title: nextCfg.name, tier: nextGrade, organ: nextCfg.department ?? '', desc: nextCfg.legalTitle ?? '' }];
}

/** 当前争夺状态文案 */
function contestStatusText(contest: PlayerSave['promotionContest']): string {
  if (!contest) return '无';
  if (contest.status === 'active') return '进行中';
  if (contest.status === 'won') return '已胜';
  return '未胜';
}

export default function PromotionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave, refreshSave } = useGame();
  type SaveRival = PlayerSave['rivals'][number];
  const [tab, setTab] = useState<TabKey>('personalContest');
  const [boardVisible, setBoardVisible] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackOk, setFeedbackOk] = useState(true);
  const [bandFactions, setBandFactions] = useState<FactionId[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const showFeedback = (msg: string, ok = true) => {
    setFeedback(msg);
    setFeedbackOk(ok);
    setTimeout(() => setFeedback(''), 4000);
  };

  // 班子派系（sYou 计算需要 bandSynergy）
  useEffect(() => {
    if (!save) return;
    (async () => {
      const band = await getNpcBand(save.id);
      const bf: FactionId[] = [];
      for (const m of band) { if (m.faction) bf.push(m.faction); }
      setBandFactions(bf);
    })();
  }, [save?.id]);

  /**
   * v4 个人职位独立斗争（10% 派系 + 90% 个人）。
   * 门控：冷却 30 天 + 功绩 ≥ 80 → 扣 80 功绩 → resolvePersonalContest 判定 → 仅 win 落档晋升。
   * 个人战 win 只晋升玩家，不结束派系回合。
   */
  const handlePersonalContest = async (
    positionKey: string,
    positionTitle: string,
    toRank: number,
    targetCity: string,
  ) => {
    if (!save || submitting) return;
    setSubmitting(true);
    try {
      const day = save.gameDays;
      // 门控 0：每周期（5 年）仅允许晋升一次
      const gate = checkPromotionGate(save);
      if (!gate.allowed) {
        showFeedback(`🚫 ${gate.blockReason}`, false);
        return;
      }
      // 门控 1：冷却
      const cooldownRemaining = Math.max(0, (save.personalContestCooldownUntil ?? 0) - day);
      if (cooldownRemaining > 0) {
        showFeedback(`冷却时间未到，请等待 ${cooldownRemaining} 天后再试`, false);
        return;
      }
      // 门控 2：功绩门槛（联合模式提高花费）
      const coalition = save.contestMode === 'coalition';
      const meritCost = Math.round(CONTEST_COSTS.personalContest.merit * (coalition ? PROVINCE_ATTACK_COST.coalitionMeritMultiplier : 1));
      if ((save.meritPoints ?? 0) < meritCost) {
        showFeedback(`功绩点数不足，需要 ${meritCost} 点功绩`, false);
        return;
      }

      // 判定（10% 派系 + 90% 个人）
      const result = resolveContestDetailed(save, bandFactions, positionKey, positionTitle, toRank, targetCity);
      const history = [...(save.personalContestHistory ?? []), result.detail];

      if (result.win) {
        // 统一走 applyContestWin 落档（写入 lastPromotionCycleId，保证本周期不可再升）
        const wonContest: PromotionContest = {
          id: nanoid(),
          positionKey,
          positionTitle,
          toRank,
          targetCity,
          faction: save.primaryFaction as FactionId,
          sYou: result.sYou,
          sOpp: result.sOpp,
          status: 'won',
          startDay: day,
          cycleDay: getContestCycleId(day) * WIND_CYCLE_DAYS,
        };
        const updates = applyContestWin(save, wonContest, day);
        await updateGameSave({
          ...updates,
          ...bumpCycleContestWin(save),
          meritPoints: Math.max(0, (save.meritPoints ?? 0) - meritCost),
          personalContestCooldownUntil: day + CONTEST_COSTS.personalContest.cooldownDays,
          personalContestHistory: history,
        });
        // R1.5：职级升级后自动补充生成 42 名下属（受 145 编制上限约束）
        await generateRankUpSubordinates(save.id, save.userId, save.rankLevel + 1);
        showFeedback(`🎉 个人职位战胜利！已就任 ${positionTitle}（${targetCity}）· 消耗 ${meritCost} 功绩`, true);
      } else {
        // 失败：扣功绩 + 记录历史 + 设冷却
        await updateGameSave({
          meritPoints: Math.max(0, (save.meritPoints ?? 0) - meritCost),
          personalContestCooldownUntil: day + CONTEST_COSTS.personalContest.cooldownDays,
          personalContestHistory: history,
        });
        showFeedback(`✗ 个人职位战失败（S_you ${result.sYou} < S_opp ${result.sOpp}）· 消耗 ${meritCost} 功绩，${CONTEST_COSTS.personalContest.cooldownDays} 天后可再战`, false);
      }
      await refreshSave();
    } finally {
      setSubmitting(false);
    }
  };

  /** 立即结算当前争夺（主动结算：sYou≥sOpp 判胜则 applyContestWin 落档） */
  const handleResolveContest = async () => {
    if (!save || !save.promotionContest || save.promotionContest.status !== 'active' || submitting) return;
    setSubmitting(true);
    try {
      const contest = save.promotionContest;
      if (contest.sYou >= contest.sOpp) {
        // 玩家赢职位：applyContestWin 落地（不结束派系回合）
        const updates = applyContestWin(save, contest, save.gameDays);
        await updateGameSave(updates);
        // R1.5：职级升级后自动补充生成 42 名下属（受 145 编制上限约束）
        await generateRankUpSubordinates(save.id, save.userId, save.rankLevel + 1);
        showFeedback(`🎉 争夺胜利！已就任 ${contest.positionTitle}`, true);
      } else {
        // 失败：记录 lost，清空当前争夺
        await updateGameSave({
          promotionContest: null,
          contestHistory: [...(save.contestHistory ?? []), {
            id: contest.id,
            positionTitle: contest.positionTitle,
            toRank: contest.toRank,
            sYou: contest.sYou,
            sOpp: contest.sOpp,
            result: 'lost' as const,
            day: save.gameDays,
          }],
        });
        showFeedback(`✗ 争夺失败（${contest.sYou} < ${contest.sOpp}），下轮再战`, false);
      }
      await refreshSave();
    } finally {
      setSubmitting(false);
    }
  };

  // ── 政敌反制 ──────────────────────────────
  const handleInvestigate = async (r: SaveRival) => {
    if (!save || submitting) return;
    setSubmitting(true);
    try {
      const res = startRivalInvestigation(r as unknown as RivalProfile, save.gameDays);
      if (!res.ok) { showFeedback(res.msg, false); return; }
      const next = (save.rivals ?? []).map(x => x.id === r.id ? { ...x, investigation: res.investigation } : x);
      await updateGameSave({ silver: (save.silver ?? 0) - 50, rivals: next });
      showFeedback(`🔍 已启动对 ${r.name} 的调查（30天后出结果）`, true);
      await refreshSave();
    } finally { setSubmitting(false); }
  };
  const handleLeak = async (r: SaveRival) => {
    if (!save || submitting) return;
    setSubmitting(true);
    try {
      const res = applyAnonymousLeak(r as unknown as RivalProfile, save.gameDays);
      if (!res.ok) { showFeedback(res.msg, false); return; }
      const next = (save.rivals ?? []).map(x => x.id === r.id ? { ...x, hasLeverage: false, leverageDetail: null, status: 'defeated' } : x);
      await updateGameSave({ rivals: next });
      showFeedback(`📰 匿名爆料成功：${res.msg}`, true);
      await refreshSave();
    } finally { setSubmitting(false); }
  };
  const handleCoopt = async (r: SaveRival) => {
    if (!save || submitting) return;
    setSubmitting(true);
    try {
      const res = applyCooptRival(r as unknown as RivalProfile);
      if (!res.ok) { showFeedback(res.msg, false); return; }
      const next = (save.rivals ?? []).map(x => x.id === r.id ? { ...x, status: 'recruited' } : x);
      await updateGameSave({
        factionContribution: (save.factionContribution ?? 0) - 200,
        silver: (save.silver ?? 0) - 100,
        rivals: next,
      });
      showFeedback(`🤝 收编成功：${r.name} 已转为你的政治盟友`, true);
      await refreshSave();
    } finally { setSubmitting(false); }
  };

  // ── 晋升时机主动创造 ────────────────────────
  const handleMomentum = async () => {
    if (!save || submitting) return;
    setSubmitting(true);
    try {
      const res = applyMomentum(save);
      if (!res.ok) { showFeedback(res.msg, false); return; }
      await updateGameSave(res.updates);
      showFeedback(res.msg, true);
      await refreshSave();
    } finally { setSubmitting(false); }
  };
  const handleWait = async () => {
    if (!save || submitting) return;
    setSubmitting(true);
    try {
      if (save.waitingState) { showFeedback('已在等待中', false); return; }
      const { waitingState, meritPenalty } = startWaiting(save, save.gameDays);
      await updateGameSave({ waitingState, meritPoints: Math.max(0, (save.meritPoints ?? 0) - meritPenalty) });
      showFeedback(`⏳ 放弃本窗口，开始积累耐心（功绩 -${meritPenalty}）`, true);
      await refreshSave();
    } finally { setSubmitting(false); }
  };
  const handleEmergency = async () => {
    if (!save || submitting) return;
    setSubmitting(true);
    try {
      const res = applyEmergencyPromotion(save);
      if (!res.ok) { showFeedback(res.msg, false); return; }
      await updateGameSave(res.updates);
      showFeedback(res.msg, true);
      await refreshSave();
    } finally { setSubmitting(false); }
  };

  // 目标职位列表（useMemo 避免重复过滤）
  const targetPositions = useMemo(() => {
    if (!save) return [];
    return getPositionsForRank(save.rankLevel).slice(0, 12);
  }, [save?.rankLevel]);

  if (!save) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
        <ActivityIndicator color="#C82829" style={{ marginTop: 100 }} />
      </View>
    );
  }

  const primary = save.primaryFaction as FactionId | '';
  const contest = save.promotionContest;
  // v5 晋升硬门控（传给 ConditionsTab）
  const gate = checkPromotionGate(save);
  const contestActive = contest && contest.status === 'active';
  const cycleRemaining = contest ? Math.max(0, contest.cycleDay - save.gameDays) : 0;
  const statusText = contestStatusText(contest);
  const statusColor = contest?.status === 'won' ? '#2E7D32' : contest?.status === 'active' ? '#C82829' : '#999';

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      <StatusBar style="light" backgroundColor="#1D3B5E" />
      {/* 顶栏 */}
      <View style={{ backgroundColor: '#1D3B5E', paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16 }}>
        <Image
          source={{ uri: PROMO_HEADER_BG }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
          contentFit="cover"
          transition={300}
        />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,30,50,0.72)' }} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 2 }}>🏅 晋升评审 · 职位争夺</Text>
            {primary ? (
              <Text style={{ color: '#8eb4d8', fontSize: 9, marginTop: 2 }}>
                主派：{FACTION_LABEL[primary]} · 职位争夺制
              </Text>
            ) : null}
          </View>
          <Pressable onPress={() => setBoardVisible(true)} style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>♟ 位置棋盘</Text>
          </Pressable>
        </View>
      </View>

      {/* 顶部信息卡：当前职级 → 目标职级、主派、当前争夺状态 */}
      <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E5E5', padding: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1, backgroundColor: '#F5F4F1', borderWidth: 1, borderColor: '#D9D9D9', padding: 8, alignItems: 'center' }}>
            <Text style={{ fontSize: 9, color: '#888' }}>当前职级</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D3B5E' }}>{RANK_CONFIG[save.rankLevel]?.name ?? '-'}</Text>
          </View>
          <Text style={{ fontSize: 16, color: '#C82829', fontWeight: '700' }}>→</Text>
          <View style={{ flex: 1, backgroundColor: '#FFF8F8', borderWidth: 1, borderColor: '#C82829', padding: 8, alignItems: 'center' }}>
            <Text style={{ fontSize: 9, color: '#C82829' }}>目标职级</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#C82829' }}>{RANK_CONFIG[save.rankLevel + 1]?.name ?? '已封顶'}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={{ fontSize: 10, color: '#666' }}>
            主派：{primary ? FACTION_LABEL[primary] : '无'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 10, color: '#666' }}>当前争夺：</Text>
            <View style={{ backgroundColor: statusColor + '18', borderWidth: 1, borderColor: statusColor + '55', paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ color: statusColor, fontSize: 10, fontWeight: '700' }}>{statusText}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 反馈条 */}
      {!!feedback && (
        <View style={{ backgroundColor: feedbackOk ? '#e8f5e9' : '#fff3e0', borderBottomWidth: 1, borderBottomColor: feedbackOk ? '#a5d6a7' : '#ffcc80', paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ color: feedbackOk ? '#1b5e20' : '#e65100', fontSize: 11, fontWeight: '600' }}>{feedback}</Text>
        </View>
      )}

      {/* Tab 栏 */}
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E5E5' }}>
        {TABS.map(t => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: tab === t.key ? '#C82829' : 'transparent' }}>
            <Text style={{ fontSize: 11, fontWeight: tab === t.key ? '700' : '400', color: tab === t.key ? '#C82829' : '#888' }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* 内容 */}
      {tab === 'factionAttack' ? <FactionAttackMap /> : null}
      {tab === 'personalContest' ? (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* v4 个人职位独立斗争卡片（仅展示信息与争夺模式，发起入口在下方职位选择器） */}
          {(() => {
            const coalition = save.contestMode === 'coalition';
            const meritCost = Math.round(CONTEST_COSTS.personalContest.merit * (coalition ? PROVINCE_ATTACK_COST.coalitionMeritMultiplier : 1));
            const nextRank = save.rankLevel + 1;
            const targetPos = RANK_CONFIG[nextRank]?.name ?? '拟任职务';
            return (
              <View style={{ backgroundColor: '#FFFCF0', borderWidth: 2, borderColor: '#B8860B', padding: 12, marginBottom: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#8A6D1A', marginBottom: 6 }}>⚔ 个人职位独立斗争（10%派系 + 90%个人）</Text>
                <Text style={{ fontSize: 11, color: '#666', lineHeight: 16, marginBottom: 8 }}>
                  目标：{targetPos}（第 {nextRank} 级）· 花费 {meritCost} 功绩 · 冷却 {CONTEST_COSTS.personalContest.cooldownDays} 天。{'\n'}
                  胜利即落档晋升（独立于派系席位战，不影响派系斗争回合）。{'\n'}
                  每个斗争周期（3 年）仅可晋升一次；请在下方选择具体目标职务发起。
                </Text>
                {/* 争夺模式：正面 / 联合 */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Text style={{ fontSize: 11, color: '#8A6D1A', fontWeight: '600' }}>争夺模式：</Text>
                  <Pressable
                    onPress={() => updateGameSave({ contestMode: 'direct' })}
                    style={{ backgroundColor: !coalition ? '#B8860B' : 'transparent', borderWidth: 1, borderColor: '#B8860B', paddingHorizontal: 10, paddingVertical: 4 }}
                  >
                    <Text style={{ color: !coalition ? '#fff' : '#8A6D1A', fontSize: 11, fontWeight: '600' }}>正面</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => updateGameSave({ contestMode: 'coalition' })}
                    style={{ backgroundColor: coalition ? '#B8860B' : 'transparent', borderWidth: 1, borderColor: '#B8860B', paddingHorizontal: 10, paddingVertical: 4 }}
                  >
                    <Text style={{ color: coalition ? '#fff' : '#8A6D1A', fontSize: 11, fontWeight: '600' }}>联合</Text>
                  </Pressable>
                  <Text style={{ fontSize: 9, color: '#999', flex: 1 }}>
                    {coalition ? '对手难度 ×0.85，花费 ×1.5' : '标准正面争夺'}
                  </Text>
                </View>
                <View style={{ backgroundColor: '#FFF8E1', borderWidth: 1, borderColor: '#E0C97A', padding: 8 }}>
                  <Text style={{ fontSize: 10, color: '#8A6D1A', lineHeight: 15 }}>
                    请在下方「下一职级段可选职位」中选择具体目标职务发起争夺；所选目标职务即为落档职务，不会替换为其他职位。
                  </Text>
                </View>
              </View>
            );
          })()}

          {/* 当前争夺状态卡 */}
          {contestActive && contest ? (
            <View style={{ backgroundColor: '#fff', borderWidth: 2, borderColor: '#C82829', padding: 12, marginBottom: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#C82829', marginBottom: 8 }}>⚔ 进行中的争夺</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 }}>{contest.positionTitle}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#E8EDF5', padding: 8 }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#1565C0' }}>{contest.sYou}</Text>
                  <Text style={{ fontSize: 9, color: '#666' }}>我方 S_you</Text>
                </View>
                <Text style={{ fontSize: 14, color: '#999', fontWeight: '700' }}>vs</Text>
                <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#FFEBEE', padding: 8 }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#C62828' }}>{contest.sOpp}</Text>
                  <Text style={{ fontSize: 9, color: '#666' }}>对立派 S_opp</Text>
                </View>
              </View>
              <Text style={{ fontSize: 10, color: '#999', marginBottom: 8 }}>
                周期剩余 {cycleRemaining} 天 · 到周期边界未赢则争夺过期
              </Text>
              <Pressable
                onPress={handleResolveContest}
                disabled={submitting}
                style={{ backgroundColor: submitting ? '#ccc' : '#C82829', paddingVertical: 12, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{submitting ? '结算中…' : '立即结算争夺'}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ backgroundColor: '#FFF8F0', borderWidth: 1, borderColor: '#E8D9B0', padding: 12, marginBottom: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#B8860B', marginBottom: 4 }}>📌 晋升规则：职位争夺制</Text>
              <Text style={{ fontSize: 11, color: '#666', lineHeight: 17 }}>
                真正决定晋升的是：本派赢下目标职位争夺（S_you ≥ S_opp）。{'\n'}
                点击下方职位即发起争夺；派系整体胜可提前结算，派系整体败则必受惩罚。
              </Text>
            </View>
          )}

          {/* 目标职位选择器 */}
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D3B5E', letterSpacing: 1, marginBottom: 8 }}>
            下一职级段可选职位（{getTierOf(save.rankLevel + 1)} 段）
          </Text>
          {targetPositions.map(pos => {
            const isTarget = contest?.positionKey === pos.key;
            // 逐职位统一门控（年龄/任期/双池/编制空缺/无立案/无失势冻结）
            const gate = validatePromotion(save, 'normal', pos.key);
            const vacancy = getPositionVacancy(save, pos.key);
            const noVacancy = !vacancy.available;
            const posDisabled = !!contestActive || submitting || !gate.allowed || noVacancy;
            const nextRank = save.rankLevel + 1;
            return (
              <Pressable
                key={pos.key}
                onPress={() => {
                  if (!gate.allowed) {
                    showFeedback(`🚫 ${gate.blockReason}`, false);
                    return;
                  }
                  if (noVacancy) {
                    showFeedback('该职位编制已满，无空缺可争夺', false);
                    return;
                  }
                  // #1 目标城市在发起时确定并随争夺保存，落档时严格使用，避免乱窜
                  const city = RANK_CONFIG[nextRank]?.randomCity ? getRandomCityForRank(nextRank) : save.cityName;
                  handlePersonalContest(pos.key, pos.title, nextRank, city);
                }}
                disabled={posDisabled}
                style={{
                  backgroundColor: isTarget ? '#FFF8F8' : '#fff',
                  borderWidth: isTarget ? 2 : 1,
                  borderColor: isTarget ? '#C82829' : '#D9D9D9',
                  borderStyle: isTarget ? 'dashed' : 'solid',
                  padding: 12,
                  marginBottom: 8,
                  opacity: posDisabled ? 0.5 : 1,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A' }}>
                      {isTarget ? '🎯 ' : ''}{pos.title}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
                      {pos.tier} · {pos.organ}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#888', marginTop: 4, lineHeight: 15 }} numberOfLines={2}>
                      {pos.desc}
                    </Text>
                    {/* #8 编制空缺 */}
                    <Text style={{ fontSize: 9, color: noVacancy ? '#C62828' : '#2E7D32', marginTop: 4, fontWeight: '600' }}>
                      {noVacancy ? `编制已满（${vacancy.occupied}/${vacancy.quota}）` : `编制空缺 ${vacancy.vacancy}/${vacancy.quota}`}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: posDisabled ? '#ECECEC' : '#E8EDF5', paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 10, color: posDisabled ? '#999' : '#1565C0', fontWeight: '600' }}>
                      {!gate.allowed ? '本轮已用' : noVacancy ? '已满编' : '发起争夺 ›'}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}

          {/* #7 破格晋升：独立通道，条件极苛刻（仅无进行中争夺时显示），走统一门控 */}
          {!contestActive && (() => {
            const nextRank = save.rankLevel + 1;
            const breakPos = targetPositions.find(p => getPositionVacancy(save, p.key).available);
            // 统一门控：破格前置条件 + 年龄/编制/无立案/无失势冻结
            const breakGate = breakPos
              ? validatePromotion(save, 'break', breakPos.key)
              : { allowed: false, blockReason: '当前无可用编制空缺的职位', details: [] };
            const breakOk = breakGate.allowed;
            return (
              <View style={{ backgroundColor: '#FBF0F0', borderWidth: 2, borderColor: '#8A1515', padding: 12, marginBottom: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#8A1515', marginBottom: 6 }}>⚡ 破格晋升（成功率 5%，消耗全部政绩+派系贡献）</Text>
                <Text style={{ fontSize: 10, color: '#666', lineHeight: 15, marginBottom: 8 }}>
                  需派系贡献≥1500 且 政绩≥2500、上级认可度≥90（派系首领特批）、本周期破格名额未用，且年龄≥18、目标职位有编制空缺、无立案、无失势冻结。{'\n'}
                  成功则严格+1级并就任目标职务；失败亦消耗全部资源。每周期全局仅 1 个名额。
                </Text>
                <Pressable
                  onPress={async () => {
                    if (submitting) return;
                    if (!breakOk || !breakPos) {
                      showFeedback(`🚫 ${breakGate.blockReason}`, false);
                      return;
                    }
                    setSubmitting(true);
                    try {
                      const day = save.gameDays;
                      const city = RANK_CONFIG[nextRank]?.randomCity ? getRandomCityForRank(nextRank) : save.cityName;
                      const res = attemptBreakPromote(save, breakPos.key, breakPos.title, city, day);
                      await updateGameSave(res.updates);
                      showFeedback(res.success ? `🎉 ${res.message}` : `✗ ${res.message}`, res.success);
                      await refreshSave();
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  disabled={submitting || !breakOk}
                  style={{ backgroundColor: breakOk && !submitting ? '#8A1515' : '#ccc', paddingVertical: 11, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                    {breakOk ? (submitting ? '申请中…' : '申请破格晋升') : `🚫 ${breakGate.blockReason}`}
                  </Text>
                </Pressable>
              </View>
            );
          })()}

          {/* ══ P3 派系内职位（独立于个人官职职级） ══ */}
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 12, marginTop: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D3B5E', marginBottom: 4 }}>🏛 派系内职位（独立晋升线）</Text>
            <Text style={{ fontSize: 10, color: '#888', marginBottom: 8 }}>
              派系等级 {getFactionLevel(save)}，编制配额 = 派系等级×2 + 1。就任派系职位不改变个人职级，可叠加派系贡献与影响力。
            </Text>
            {getUnlockedFactionPositions(save).map(pos => {
              const vac = getFactionPositionVacancy(save, pos.key);
              const held = save.factionPosition === pos.key;
              const canTake = vac.available && !held && !contestActive && !submitting;
              return (
                <View key={pos.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#1A1A1A' }}>
                      {held ? '✅ ' : ''}{pos.title}
                    </Text>
                    <Text style={{ fontSize: 9, color: '#999', marginTop: 2 }} numberOfLines={2}>{pos.desc}</Text>
                    <Text style={{ fontSize: 9, color: vac.available ? '#2E7D32' : '#C62828', marginTop: 2, fontWeight: '600' }}>
                      编制空缺 {vac.vacancy}/{vac.quota}
                    </Text>
                  </View>
                  <Pressable
                    onPress={async () => {
                      if (submitting) return;
                      if (held) { showFeedback('你已就任该派系职位', false); return; }
                      if (!vac.available) { showFeedback('该派系职位编制已满', false); return; }
                      setSubmitting(true);
                      try {
                        await updateGameSave(promoteFactionPosition(save, pos.key, save.gameDays));
                        showFeedback(`🎉 就任派系${pos.title}，贡献+100、影响力+5`, true);
                        await refreshSave();
                      } finally { setSubmitting(false); }
                    }}
                    disabled={!canTake}
                    style={{ backgroundColor: canTake ? '#1D6F42' : '#ccc', paddingHorizontal: 10, paddingVertical: 6 }}
                  >
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{held ? '已就任' : '就任 ›'}</Text>
                  </Pressable>
                </View>
              );
            })}
            {getUnlockedFactionPositions(save).length === 0 && (
              <Text style={{ fontSize: 10, color: '#999' }}>提升派系影响力以解锁派系内职位。</Text>
            )}
          </View>

          {/* ══ P6 调任 / 平调 ══ */}
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 12, marginTop: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D3B5E', marginBottom: 4 }}>🔄 调任 / 平调</Text>
            <Text style={{ fontSize: 10, color: '#888', marginBottom: 8 }}>
              跨行政区划（或跨派系）调动，重置部分区域性加成，不动扎根天数（rooting）。每 365 天一次。
            </Text>
            <Pressable
              onPress={async () => {
                if (submitting) return;
                setSubmitting(true);
                try {
                  const res = applyTransfer(save, save.gameDays);
                  if (!res.ok) { showFeedback(`🚫 ${res.reason}`, false); return; }
                  await updateGameSave(res.updates);
                  showFeedback(`🔄 已调任至 ${res.updates.cityName}，区域性指标已重置`, true);
                  await refreshSave();
                } finally { setSubmitting(false); }
              }}
              disabled={submitting}
              style={{ backgroundColor: submitting ? '#ccc' : '#1565C0', paddingVertical: 11, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{submitting ? '调动中…' : '申请调任 / 平调'}</Text>
            </Pressable>
          </View>

          {/* ══ P6 举荐（高阶玩家，走统一门控） ══ */}
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 12, marginTop: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D3B5E', marginBottom: 4 }}>🤝 举荐新人入派系</Text>
            <Text style={{ fontSize: 10, color: '#888', marginBottom: 8 }}>
              职级≥7 可举荐新人入派系/接任，须同样满足 年龄+任期+编制+贡献 全套限制（走统一门控，不得豁免），并消耗本轮晋升机会。
            </Text>
            {(() => {
              const rec = recommendPromote(save, save.gameDays);
              return (
                <Pressable
                  onPress={async () => {
                    if (submitting) return;
                    if (!rec.ok) { showFeedback(`🚫 ${rec.reason}`, false); return; }
                    setSubmitting(true);
                    try {
                      await updateGameSave(rec.updates);
                      showFeedback('🤝 举荐成功，新人已入派系，影响力+8、贡献+200', true);
                      await refreshSave();
                    } finally { setSubmitting(false); }
                  }}
                  disabled={submitting || !rec.ok}
                  style={{ backgroundColor: rec.ok && !submitting ? '#6A1B9A' : '#ccc', paddingVertical: 11, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                    {rec.ok ? (submitting ? '举荐中…' : '举荐新人入派系') : `🚫 ${rec.reason}`}
                  </Text>
                </Pressable>
              );
            })()}
          </View>

          {/* 争夺历史 */}
          {(save.contestHistory ?? []).length > 0 && (
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 12, marginTop: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D3B5E', marginBottom: 8 }}>争夺历史</Text>
              {(save.contestHistory ?? []).slice(-5).reverse().map((h, i) => (
                <View key={h.id + i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
                  <View style={{ width: 36, height: 18, backgroundColor: h.result === 'won' ? '#E8F5E9' : h.result === 'expired' ? '#FFF3E0' : '#FFEBEE', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: h.result === 'won' ? '#2E7D32' : h.result === 'expired' ? '#E65100' : '#C62828' }}>
                      {h.result === 'won' ? '胜' : h.result === 'expired' ? '过期' : '败'}
                    </Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 10, color: '#555' }}>
                    {h.positionTitle} · S:{h.sYou} vs {h.sOpp} · 第 {h.day} 天
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      ) : null}
      {tab === 'conditions' ? <ConditionsTab gate={gate} /> : null}
      {tab === 'records' ? <RecordsTab /> : null}
      {tab === 'rivals' ? (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {(save.rivals ?? []).length === 0 ? (
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 12 }}>
              <Text style={{ fontSize: 12, color: '#999' }}>暂无政敌 · 月度结算后按职级段自动生成</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {(save.rivals ?? []).map((r) => (
                <View key={r.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#1D3B5E' }}>{r.name}</Text>
                    <View style={{ backgroundColor: r.isSameFactionRival ? '#FFF8E1' : '#FFEBEE', borderWidth: 1, borderColor: r.isSameFactionRival ? '#E0C97A' : '#E8B4B4', paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 10, color: r.isSameFactionRival ? '#8A6D1A' : '#C62828', fontWeight: '600' }}>{r.isSameFactionRival ? '同派竞争者' : '跨派打压者'}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, color: '#666', lineHeight: 17, marginBottom: 8 }}>{r.examReport}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                    <StatusBadge label={`势力 ${r.power}`} color="#666" />
                    <StatusBadge label={`评分 ${r.meritScore}`} color="#666" />
                    <StatusBadge label={`关系 ${r.favor}`} color={r.favor < 0 ? '#C62828' : '#2E7D32'} />
                    {r.hasLeverage ? <StatusBadge label="已掌握把柄" color="#C62829" /> : null}
                    {r.investigation && r.investigation.success === null ? <StatusBadge label={`调查中（${r.investigation.endsDay - save.gameDays}天）`} color="#8A6D1A" /> : null}
                  </View>
                  {/* 反制行动 */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {r.status === 'active' && (!r.investigation || r.investigation.success !== null) ? (
                      <Pressable onPress={() => handleInvestigate(r)} style={{ backgroundColor: '#1D3B5E', paddingHorizontal: 10, paddingVertical: 5 }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>🔍 调查（50万/30天）</Text>
                      </Pressable>
                    ) : null}
                    {r.hasLeverage ? (
                      <Pressable onPress={() => handleLeak(r)} style={{ backgroundColor: '#C62829', paddingHorizontal: 10, paddingVertical: 5 }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>📰 匿名爆料</Text>
                      </Pressable>
                    ) : null}
                    {r.status === 'active' && r.meritScore < (save.meritPoints ?? 0) * 0.8 ? (
                      <Pressable onPress={() => handleCoopt(r)} style={{ backgroundColor: '#2E7D32', paddingHorizontal: 10, paddingVertical: 5 }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>🤝 收编（200贡献+100万）</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      ) : null}
      {tab === 'timing' ? (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {(() => {
            const report = buildTimingReport(save, save.gameDays, save.momentumActive ?? false);
            return (
              <View style={{ gap: 10 }}>
                {/* 窗口状态 */}
                <View style={{ backgroundColor: report.isWindowOpen ? '#F0FAF0' : '#F5F4F1', borderWidth: 1, borderColor: report.isWindowOpen ? '#A5D6A7' : '#D9D9D9', padding: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: report.isWindowOpen ? '#2E7D32' : '#666', marginBottom: 6 }}>
                    {report.isWindowOpen ? `🟢 ${report.windowLabel} 进行中` : `⏳ 距${report.windowLabel} 还有 ${report.daysToWindow} 天`}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#666', lineHeight: 17 }}>
                    晋升时机评分：<Text style={{ fontWeight: '700', color: report.score >= 50 ? '#2E7D32' : '#C62828' }}>{report.score} 分</Text> · {report.scoreLabel}
                    {report.momentum ? ' · 已造势（+10%）' : ''}
                    {save.waitingState ? ` · 等待中（+${save.waitingState.bonus}）` : ''}
                  </Text>
                </View>
                {/* 环境因子 */}
                {report.factors.length > 0 ? (
                  <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D3B5E', marginBottom: 8 }}>外部环境因子</Text>
                    {report.factors.map((f, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
                        <Text style={{ fontSize: 11, color: '#555' }}>{f.label}</Text>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: f.delta > 0 ? '#2E7D32' : f.delta < 0 ? '#C62828' : '#666' }}>{f.delta > 0 ? '+' : ''}{f.delta}%</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                {/* 主动创造时机 */}
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 12, gap: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D3B5E', marginBottom: 2 }}>主动创造时机</Text>
                  <Pressable onPress={handleMomentum} style={{ backgroundColor: save.momentumActive ? '#E8E8E8' : '#1D3B5E', paddingHorizontal: 12, paddingVertical: 8 }}>
                    <Text style={{ color: save.momentumActive ? '#999' : '#fff', fontSize: 11, fontWeight: '600' }}>
                      {save.momentumActive ? '✅ 已造势（当前窗口生效）' : '🔊 舆论造势（消耗 50 万 + 100 声望）'}
                    </Text>
                  </Pressable>
                  <Pressable onPress={handleWait} style={{ backgroundColor: save.waitingState ? '#E8E8E8' : '#8A6D1A', paddingHorizontal: 12, paddingVertical: 8 }}>
                    <Text style={{ color: save.waitingState ? '#999' : '#fff', fontSize: 11, fontWeight: '600' }}>
                      {save.waitingState ? `⏳ 等待中（已积累 ${save.waitingState.accumulatedDays} 天）` : '🕐 放弃本窗口 · 积累耐心（功绩-5%，下次评分+5）'}
                    </Text>
                  </Pressable>
                  <Pressable onPress={handleEmergency} style={{ backgroundColor: '#C62829', paddingHorizontal: 12, paddingVertical: 8 }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>🔥 火线提拔（跳过窗口，获 90 天冻结）</Text>
                  </Pressable>
                  {save.firePromotionDebuffDays && save.firePromotionDebuffDays > 0 ? (
                    <Text style={{ fontSize: 10, color: '#C62828' }}>⚠️ 根基不稳：剩余 {save.firePromotionDebuffDays} 天冻结</Text>
                  ) : null}
                </View>
              </View>
            );
          })()}
        </ScrollView>
      ) : null}

      {/* 位置棋盘弹窗 */}
      <PositionBoard
        visible={boardVisible}
        onClose={() => setBoardVisible(false)}
        save={save}
        targetSeatKey={contest?.positionKey ?? null}
      />
    </View>
  );
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ backgroundColor: color + '14', borderWidth: 1, borderColor: color + '44', paddingHorizontal: 6, paddingVertical: 2 }}>
      <Text style={{ fontSize: 9, color, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

