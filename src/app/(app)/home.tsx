import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import { supabase } from '@/client/supabase';
import { resolveGateTarget, gateTargetHref } from '@/lib/approvalGate';
import { useGame } from '@/ctx/GameContext';
import type { UpperInspectEvent } from '@/ctx/GameContext';
import { getBossTasks, getPoliceCases, deleteSave, resolveSubVisit, getAllReports, markReportsRead, updateSave, playerRenameSave, getAccountAndActivationCode } from '@/db/gameApi';
import { debounceCheckName } from '@/lib/sensitiveFilter';
import { gameDaysToDate, RANK_CONFIG, getRankGrade, getLegalTitle, getAvatarEmoji, getAvatarBgColor, getDeptNameByRank, CONCURRENT_POST_CONFIG, getAvailableConcurrentPosts, MINISTRY_POOL, formatMoney, estimateNationalGdp, getRetirementConfig, checkRetirementStatus, MAX_RANK_LEVEL } from '@/types/game';
import type { DeptKey } from '@/types/game';
import { StatBar } from '@/components/StatBar';
import { NavCard } from '@/components/NavCard';
import { RetirementModal } from '@/components/RetirementModal';
import { RenewalVoteModal } from '@/components/RenewalVoteModal';
import { DisciplineWarnModal } from '@/components/DisciplineWarnModal';
import { BossChangeModal } from '@/components/BossChangeModal';
import { getRankTheme } from '@/lib/rankTheme';
import { computeKpi, getKpiPanel, getPromotionSummary } from '@/lib/kpiEngine';
import { getConfigsByCategory } from '@/lib/gameplayConfig';
import type { KpiResult } from '@/lib/kpiEngine';

// 顶部背景图：现代城市天际线，贴合从政生涯主题，视觉中性
const HEADER_BG_IMAGE = 'https://miaoda-site-img.cdn.bcebos.com/images/docsearch_433ac2a8-b2ad-4237-be28-75d2f4063ff0.png';

const GRADE_COLOR: Record<string, string> = {
  '优秀': '#2a7a3b',
  '良好': '#2B4B6F',
  '合格': '#888',
  '不合格': '#C82829',
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, isLoading, timeGranularity, isRunning, setTimeGranularity, setIsRunning, advanceTime, refreshSave, annualRankNotice, clearAnnualRankNotice, unreadReports, clearUnreadReports, exchangeOfficer, upperInspectEvent, clearUpperInspectEvent, meetingTaskFeedback, clearMeetingTaskFeedback, retirementTrigger, clearRetirementTrigger, renewalVoteTrigger, clearRenewalVoteTrigger, bossChangeEvent, clearBossChangeEvent, disciplineWarnEvent, clearDisciplineWarnEvent, gameOverTrigger, updateGameSave } = useGame();
  const [pendingTaskCount, setPendingTaskCount] = useState(0);
  const [pendingCaseCount, setPendingCaseCount] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingArchive, setDeletingArchive] = useState(false);

  // 改名弹窗
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameMsg, setRenameMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [renameWarn, setRenameWarn] = useState(''); // 机制①：实时检测
  // 是否管理员（控制后台入口显隐）
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);
  // 下属拜访弹窗
  const [visitModal, setVisitModal] = useState(false);
  // 月度报告弹窗
  const [showReportModal, setShowReportModal] = useState(false);
  // 账号与激活码
  const [accountInfo, setAccountInfo] = useState<{ email: string | null; activationCode: string | null }>({ email: null, activationCode: null });

  useFocusEffect(
    useCallback(() => {
      refreshSave();
      (async () => {
        getAccountAndActivationCode().then(setAccountInfo);
        const { data: adminData } = await supabase.rpc('is_current_admin');
        const isAdminUser = Boolean(adminData);
        setIsAdmin(isAdminUser);
        setAdminChecked(true);
        if (isAdminUser) return;
        // 统一走集中式门禁：仅在目标不是 home 时才跳转，彻底避免误跳测试码页
        const target = await resolveGateTarget(Boolean(save?.needsCharacterCreation));
        if (target !== 'home') router.replace(gateTargetHref(target) as RelativePathString);
      })();
    }, [refreshSave, router, save?.needsCharacterCreation])
  );

  // Game Over 跳转：触发时暂停时间并导航到结局页
  useEffect(() => {
    if (gameOverTrigger) {
      setIsRunning(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace({ pathname: '/(app)/game-over' as any, params: { type: gameOverTrigger } });
    }
  }, [gameOverTrigger, setIsRunning, router]);

  useEffect(() => {
    if (!save) return;
    getBossTasks(save.id).then(tasks => {
      setPendingTaskCount(tasks.filter(t => t.status === 'active').length);
    });
    getPoliceCases(save.id).then(cases => {
      setPendingCaseCount(cases.filter(c => c.status === 'pending').length);
    });
    // 若有下属拜访待处理则弹出
    if (save.subVisitPending) {
      setVisitModal(true);
    }
  }, [save]);

  const handleSignOut = async () => {
    setIsRunning(false);
    await supabase.auth.signOut();
    router.replace('/(auth)/sign-in');
  };

  const handleDeleteSave = async () => {
    if (!save) return;
    setDeletingArchive(true);
    await deleteSave(save.id);
    setIsRunning(false);
    // 删档后不再退出登录，清除设备存档偏好并回到存档选择页
    const { clearActiveSaveLocal } = await import('@/db/gameApi');
    clearActiveSaveLocal();
    router.replace('/(app)/save-select');
  };

  const handleVisitResponse = async (accept: boolean) => {
    if (!save) return;
    await resolveSubVisit(save.id, save.subVisitSubId ?? '', accept);
    setVisitModal(false);
    await refreshSave();
  };

  if (isLoading || (!save && !adminChecked)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F7F5' }}>
        <ActivityIndicator size="large" color="#C82829" />
        <Text style={{ marginTop: 12, color: '#666', fontSize: 13 }}>正在加载存档...</Text>
      </View>
    );
  }

  // 管理员账号：一律进入后台，阻断进入游戏
  if (isAdmin) {
    router.replace('/(app)/admin-panel' as never);
    return null;
  }

  if (!save) {
    // 拆分后新玩家无占位档：引导进入角色创建页建档
    router.replace('/(app)/character-create');
    return null;
  }

  // 新玩家未完成角色创建，强制跳转
  if (save.needsCharacterCreation) {
    router.replace('/(app)/character-create');
    return null;
  }

  const rankConfig = RANK_CONFIG[save.rankLevel];
  // 优秀排名时任职年限要求减半
  const effectiveTenureRequired = save.isExcellentRank
    ? Math.ceil(rankConfig.requiredTenureYears / 2)
    : rankConfig.requiredTenureYears;
  const tenureProgress = Math.min(100, (save.tenureYears / Math.max(1, effectiveTenureRequired)) * 100);
  const meritProgress = Math.min(100, (save.meritPoints / Math.max(1, rankConfig.requiredMerit)) * 100);
  const avatarEmoji = getAvatarEmoji(save.avatarId, save.playerGender);
  const avatarBg    = getAvatarBgColor(save.avatarId, save.reformFaction >= save.pragmaticFaction ? 'reform' : 'pragmatic');

  // 退休相关计算
  const retireCfg    = getRetirementConfig(save.rankLevel);
  const retireStatus = checkRetirementStatus(save.rankLevel, save.playerAge, save.retirementDelayYears ?? 0);
  // 有效退休年龄（正国家级显示自主退休年龄70岁；其余显示基准+延迟）
  const displayRetireAge = retireCfg.isVoluntaryAt !== null
    ? retireCfg.isVoluntaryAt
    : retireCfg.baseAge !== null
      ? retireCfg.baseAge + (save.retirementDelayYears ?? 0)
      : null;
  // 距退休不足1年才显示倒计时
  const showRetireWarning = retireStatus.type === 'approaching' && displayRetireAge !== null;

  // 根据职级和城市生成动态单位名称（覆盖全部15级）
  const getDynamicOrg = (rankLevel: number, cityName: string): string => {
    const city = cityName.replace(/省$|市$|自治区$/, '');
    switch (rankLevel) {
      // 乡科级：乡镇政府
      case 1: case 2: case 3: return `${cityName}人民政府`;
      // 县处级：县政府 / 县委
      case 4: case 5: return `${city}人民政府`;
      case 6:         return `中共${city}委员会`;
      // 厅局级：市政府 / 市委
      case 7: case 8: return `${city}人民政府`;
      case 9:         return `中共${city}委员会`;
      // 省部级：省政府 / 省委 / 国政院组成部门
      case 10:        return `${city}人民政府`;
      case 11:        return `中共${city}委员会`;
      case 12:        return `国政院`;
      // 国家级：国政院 / 中共中央
      case 13: case 14: return `国政院`;
      case 15:          return `中共中央`;
      default: return rankConfig.department;
    }
  };
  const dynamicOrg = getDynamicOrg(save.rankLevel, save.cityName);

  // ── 管辖区域 ──
  const getJurisdiction = (): { label: string; type: string; typeColor: string } => {
    const rl = save.rankLevel;
    if (rl <= 3) return { label: save.cityName, type: '乡镇', typeColor: '#4a7c59' };
    if (rl <= 6) return { label: save.cityName, type: '县（区）', typeColor: '#2B4B6F' };
    if (rl <= 9) return { label: save.cityName, type: '地级市', typeColor: '#7B3F00' };
    if (rl <= 11) return { label: save.cityName, type: '省级行政区', typeColor: '#6B0F1A' };
    if (rl === 12) return { label: '全国（国政院分管领域）', type: '国家级', typeColor: '#4B0082' };
    return { label: '全国（国政院）', type: '国家级', typeColor: '#4B0082' };
  };
  const jurisdiction = getJurisdiction();

  // ── 分层级 KPI 考核面板 ─────────────────────────────────────────────────────
  const kpiSnapshot = {
    rankLevel:      save.rankLevel,
    moralValue:     save.moralValue,
    popularSupport: save.popularSupport,
    securityIndex:  save.securityIndex,
    cityGdp:        save.cityGdp,
    cityLivelihood: save.cityLivelihood,
    cityEcology:    save.cityEcology,
    cityBusiness:   save.cityBusiness,
    bossFavor:      save.bossFavor,
    boss2Favor:     save.boss2Favor,
    boss3Favor:     save.boss3Favor,
    annualRankPct:  save.annualRankPct,
    taxRevenue:     save.taxRevenue ?? 0,
    tenureYears:    save.tenureYears,
    meritPoints:    save.meritPoints,
  };
  const kpiResult: KpiResult = computeKpi(kpiSnapshot);
  const kpiPanel = getKpiPanel(kpiSnapshot);
  const promotionSummaryText = getPromotionSummary(kpiResult, save.tenureYears, effectiveTenureRequired);

  // ── 施政绩效KPI（12级+用分管领域KPI；14级+全国综合绩效，最低500）──
  const isMinistryLevel = save.rankLevel >= 12;
  const isPremierLevel  = save.rankLevel >= 14;
  const foundMinistry = isMinistryLevel ? MINISTRY_POOL.find(m => m.name === save.cityName) : null;
  const ministryFocus = foundMinistry?.focus ?? 'GDP经济';
  // 总理级：全国综合指数（0-100面板 → 展示为万亿/万亿换算后的500+分值）
  const nationalGdp        = Math.max(500, Math.round(save.cityGdp * 1.5 + 500));
  const nationalLivelihood = Math.max(500, Math.round(save.cityLivelihood * 1.4 + 520));
  const nationalEco        = Math.max(500, Math.round(save.cityEcology * 1.3 + 510));
  const nationalBusiness   = Math.max(500, Math.round(save.cityBusiness * 1.6 + 490));
  const getMinistryKpis = (focus: string) => {
    const base = { a: save.cityGdp, b: save.cityLivelihood, c: save.cityEcology, d: save.cityBusiness };
    const map: Record<string, { aLabel: string; bLabel: string; cLabel: string; dLabel: string }> = {
      'GDP经济':  { aLabel: '经济发展指数', bLabel: '财税收入指数', cLabel: '重大项目推进', dLabel: '区域协调发展' },
      '民生保障': { aLabel: '民生保障指数', bLabel: '教育医疗水平', cLabel: '社会保障覆盖', dLabel: '就业促进效果' },
      '生态文明': { aLabel: '生态保护指数', bLabel: '环境治理成效', cLabel: '资源节约利用', dLabel: '绿色发展水平' },
      '营商环境': { aLabel: '营商便利指数', bLabel: '市场准入水平', cLabel: '企业扶持成效', dLabel: '外资引进指数' },
      '社会治安': { aLabel: '社会治安指数', bLabel: '网络安全水平', cLabel: '执法规范程度', dLabel: '综合协作效能' },
      '外交事务': { aLabel: '双边关系指数', bLabel: '多边合作水平', cLabel: '国际形象建设', dLabel: '涉外事务处置' },
      '国家安全': { aLabel: '国家安全指数', bLabel: '情报研判水平', cLabel: '战略威慑能力', dLabel: '综合国防效能' },
    };
    const labels = map[focus] ?? map['GDP经济'];
    return [
      { label: labels.aLabel, value: base.a },
      { label: labels.bLabel, value: base.b },
      { label: labels.cLabel, value: base.c },
      { label: labels.dLabel, value: base.d },
    ];
  };
  const ministryKpis = getMinistryKpis(ministryFocus);
  const theme = getRankTheme(save.rankLevel);

  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <StatusBar style={theme.statusBarStyle} backgroundColor={theme.headerBg} />

      {/* ══ 顶部导航栏 ══ */}
      <View style={{ backgroundColor: theme.headerBg, paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 0 }}>
        {/* 背景图 + 半透明遮罩 */}
        <Image
          source={{ uri: HEADER_BG_IMAGE }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
          contentFit="cover"
          transition={300}
        />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,30,50,0.72)' }} />
        <View style={{ height: theme.decorLineHeight, backgroundColor: theme.decorLine, marginBottom: 10 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: 12 }}>
          {/* 头像 */}
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: avatarBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: theme.decorLine, marginRight: 10 }}>
            <Text style={{ fontSize: 22 }}>{avatarEmoji}</Text>
          </View>
          {/* 姓名 + 职务 */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: theme.headerText, fontSize: 16, fontWeight: '700' }}>{save.playerName}</Text>
              <Text style={{ color: theme.headerSub, fontSize: 10 }}>{save.playerGender} · {save.playerAge}岁</Text>
              {/* 改名按钮 */}
              <Pressable onPress={() => { setRenameInput(''); setRenameMsg(null); setShowRenameModal(true); }}
                style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 }}>
                <Text style={{ color: theme.headerSub, fontSize: 9, opacity: 0.8 }}>改名</Text>
              </Pressable>
            </View>
            <Text style={{ color: theme.headerSub, fontSize: 10, marginTop: 2 }} numberOfLines={1}>{RANK_CONFIG[save.rankLevel]?.name ?? save.rankName} · {dynamicOrg}</Text>
            {accountInfo.email ? (
              <Text style={{ color: theme.headerSub, fontSize: 9, marginTop: 2, opacity: 0.85 }} numberOfLines={1}>
                账号：{accountInfo.email}{accountInfo.activationCode ? `  ·  激活码：${accountInfo.activationCode}` : ''}
              </Text>
            ) : null}
          </View>
          {/* 右侧：日期 + 操作 */}
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{gameDaysToDate(save.gameDays)}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => setShowDeleteConfirm(true)}>
                <Text style={{ color: theme.headerSub, fontSize: 10, opacity: 0.65 }}>删除存档</Text>
              </Pressable>
              <Pressable onPress={handleSignOut}>
                <Text style={{ color: theme.headerSub, fontSize: 10, opacity: 0.65 }}>退出</Text>
              </Pressable>
            </View>
          </View>
        </View>
        {/* ── 时间控制条（嵌入 header 底部）── */}
        <View style={{ flexDirection: 'row', gap: 0, marginBottom: 0, borderTopWidth: 1, borderTopColor: theme.decorLine, opacity: 1 }}>
          {(['天', '周', '月'] as const).map(g => (
            <Pressable
              key={g}
              onPress={() => setTimeGranularity(g)}
              style={{
                flex: 1, paddingVertical: 7, alignItems: 'center',
                backgroundColor: timeGranularity === g ? 'rgba(255,255,255,0.15)' : 'transparent',
                borderRightWidth: g !== '月' ? 1 : 0,
                borderRightColor: theme.decorLine,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: timeGranularity === g ? '700' : '400', color: timeGranularity === g ? theme.headerText : theme.headerSub }}>
                按{g}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => { void advanceTime(); }}
            style={{ flex: 2, paddingVertical: 7, alignItems: 'center', backgroundColor: theme.accentSub, borderLeftWidth: 1, borderLeftColor: theme.decorLine }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>▶ 推进</Text>
          </Pressable>
          <Pressable
            onPress={() => setIsRunning(!isRunning)}
            style={{
              flex: 2, paddingVertical: 7, alignItems: 'center',
              backgroundColor: isRunning ? theme.primary : 'transparent',
              borderLeftWidth: 1, borderLeftColor: theme.decorLine,
            }}
          >
            <Text style={{ fontWeight: '700', fontSize: 12, color: isRunning ? theme.primaryText : theme.headerSub }}>
              {isRunning ? '⏸ 暂停' : '⏯ 自动'}
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 12, gap: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 通知区域（只在有通知时显示）── */}
        {(save.isPromotionAvailable || save.isEventPending || !!annualRankNotice
          || ((save.lastRecruitQuarter ?? 0) < Math.floor(save.gameDays / 90) && Math.floor(save.gameDays / 90) > 0)
          || unreadReports.length > 0
          || (!!exchangeOfficer && save.rankLevel === 8)
          || (save.purgeCount ?? 0) >= 2
        ) && (
          <View style={{ gap: 6 }}>
            {(save.purgeCount ?? 0) >= 2 && (
              <View style={{ backgroundColor: '#1A0000', borderWidth: 1, borderColor: '#C82829', borderLeftWidth: 4, borderLeftColor: '#C82829', paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 16 }}>🚨</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FF6B6B', fontWeight: '700', fontSize: 12 }}>落马风险预警 · 账目留痕累积 {save.purgeCount} 次</Text>
                  <Text style={{ color: '#E0B4B4', fontSize: 11, marginTop: 2 }}>资源输送/斗争大败已留痕，民心低于 25 将触发落马结局（阈值 3 次）</Text>
                </View>
              </View>
            )}
            {save.isPromotionAvailable && save.rankLevel < MAX_RANK_LEVEL && (
              <Pressable
                onPress={() => router.push('/(app)/promotion')}
                style={{ backgroundColor: theme.primary, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderLeftWidth: 4, borderLeftColor: theme.accent }}
              >
                <Text style={{ fontSize: 16 }}>{theme.rankEmoji}</Text>
                <Text style={{ color: theme.primaryText, fontWeight: '700', fontSize: 13, flex: 1 }}>晋升条件已满足 — 点击申请 ›</Text>
              </Pressable>
            )}
            {save.isEventPending && (
              <Pressable
                onPress={() => router.push('/(app)/events')}
                style={{ backgroundColor: theme.alertBg, borderWidth: 1, borderColor: theme.alertBorder, borderLeftWidth: 4, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Text style={{ fontSize: 16 }}>⚠️</Text>
                <Text style={{ color: theme.alertText, fontWeight: '700', fontSize: 12, flex: 1 }}>有突发事件待处置，立即处理 ›</Text>
              </Pressable>
            )}
            {annualRankNotice && (
              <Pressable
                onPress={clearAnnualRankNotice}
                style={{ backgroundColor: annualRankNotice.isExcellent ? '#e8f5e9' : theme.sectionHeaderBg, borderWidth: 1, borderColor: annualRankNotice.isExcellent ? '#2a7a3b' : theme.cardBorder, borderLeftWidth: 4, borderLeftColor: annualRankNotice.isExcellent ? '#2a7a3b' : theme.decorLine, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Text style={{ fontSize: 16 }}>{annualRankNotice.isExcellent ? '🏆' : '📊'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: annualRankNotice.isExcellent ? '#2a7a3b' : theme.sectionHeaderText, fontWeight: '700', fontSize: 12 }}>
                    {annualRankNotice.isExcellent ? '年度考核优秀！' : '年度排名出炉'}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.labelText, marginTop: 2 }}>
                    超越 {annualRankNotice.pct}% 同级城市{annualRankNotice.isExcellent ? ' · 晋升年限减半' : ''}
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: theme.mutedText }}>×</Text>
              </Pressable>
            )}
            {(save.lastRecruitQuarter ?? 0) < Math.floor(save.gameDays / 90) && Math.floor(save.gameDays / 90) > 0 && (
              <Pressable
                onPress={() => router.push('/(app)/recruit')}
                style={{ backgroundColor: theme.sectionHeaderBg, borderWidth: 1, borderColor: theme.decorLine, borderLeftWidth: 4, borderLeftColor: theme.accent, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Text style={{ fontSize: 16 }}>📢</Text>
                <Text style={{ color: theme.sectionHeaderText, fontWeight: '700', fontSize: 12, flex: 1 }}>本期可招募新干部 ›</Text>
              </Pressable>
            )}
            {unreadReports.length > 0 && (
              <Pressable
                onPress={() => setShowReportModal(true)}
                style={{ backgroundColor: theme.sectionHeaderBg, borderWidth: 1, borderColor: theme.cardBorder, borderLeftWidth: 4, borderLeftColor: theme.accentSub, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Text style={{ fontSize: 16 }}>📋</Text>
                <Text style={{ color: theme.sectionHeaderText, fontWeight: '700', fontSize: 12, flex: 1 }}>{unreadReports.length} 份工作报告待查阅 ›</Text>
              </Pressable>
            )}
            {exchangeOfficer && save.rankLevel === 8 && (
              <Pressable
                onPress={() => router.push('/(app)/exchange-officer' as never)}
                style={{ backgroundColor: theme.alertBg, borderWidth: 1, borderColor: theme.alertBorder, borderLeftWidth: 4, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Text style={{ fontSize: 16 }}>🏛️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.alertText, fontWeight: '700', fontSize: 12 }}>干部交流任职通知</Text>
                  <Text style={{ color: theme.labelText, fontSize: 11, marginTop: 1 }}>{exchangeOfficer.fromCity} · {exchangeOfficer.name} 申请来访 ›</Text>
                </View>
                <View style={{ backgroundColor: theme.primary, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ color: theme.primaryText, fontSize: 10, fontWeight: '700' }}>待处理</Text>
                </View>
              </Pressable>
            )}
          </View>
        )}

        {/* ── 全国GDP横幅（副院理以上 rank13+）── */}
        {save.rankLevel >= 13 && (
          <View style={{ backgroundColor: theme.quickStatBg, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, gap: 8, borderWidth: 1, borderColor: theme.accent }}>
            <Text style={{ fontSize: 15 }}>🌏</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.headerSub, fontSize: 9, letterSpacing: 1 }}>国家统计局 · 年度数据</Text>
              <Text style={{ color: theme.accent, fontWeight: '700', fontSize: 12, marginTop: 1 }}>
                全国GDP：¥{formatMoney(estimateNationalGdp(save.rankLevel, save.cityGdp))} 元
              </Text>
            </View>
            <View style={{ borderWidth: 1, borderColor: theme.accent, paddingHorizontal: 7, paddingVertical: 3 }}>
              <Text style={{ color: theme.accent, fontSize: 10, fontWeight: '700' }}>经济指数 {save.cityGdp}</Text>
            </View>
          </View>
        )}

        {/* ══ 干部档案 ══ */}
        <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderTopWidth: theme.decorLineHeight, borderTopColor: theme.decorLine }}>
          {/* 顶行：头衔 + 考核等级 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: theme.cardBorder }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 }}>
              <Text style={{ fontSize: 12 }}>{theme.rankEmoji}</Text>
              <Text style={{ fontSize: 10, color: theme.sectionHeaderText, fontWeight: '700', letterSpacing: 1 }}>干部档案</Text>
              <Text style={{ fontSize: 10, color: theme.mutedText }}>·</Text>
              <Text style={{ fontSize: 10, color: theme.headerSub, letterSpacing: 0.5 }}>{theme.rankBanner}</Text>
            </View>
            <View style={{ borderWidth: 1, borderColor: GRADE_COLOR[save.assessmentGrade] ?? theme.mutedText, paddingHorizontal: 7, paddingVertical: 2 }}>
              <Text style={{ fontSize: 10, color: GRADE_COLOR[save.assessmentGrade] ?? theme.mutedText, fontWeight: '600' }}>考核 {save.assessmentGrade}</Text>
            </View>
          </View>

          {/* 主体：职务 + 六格状态 */}
          <View style={{ padding: 12, gap: 10 }}>
            {/* 职位信息行 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {!!save.playerPosition && (
                <View style={{ backgroundColor: theme.primary, paddingHorizontal: 7, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 11, color: theme.primaryText, fontWeight: '700' }}>{save.playerPosition}</Text>
                </View>
              )}
              {/* 行政职级徽标（从RANK_CONFIG读取，随级别动态变化） */}
              <View style={{ backgroundColor: 'rgba(200,168,75,0.12)', borderWidth: 1, borderColor: theme.decorLine, paddingHorizontal: 6, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, color: theme.decorLine, fontWeight: '700', letterSpacing: 0.5 }}>{getRankGrade(save.rankLevel)}</Text>
              </View>
              <Text style={{ fontSize: 11, color: theme.sectionHeaderText, flex: 1 }} numberOfLines={1}>📍 {save.cityName}</Text>
              <Text style={{ fontSize: 11, color: theme.mutedText }} numberOfLines={1}>🎓 {save.school}</Text>
            </View>
            {/* 法定职务类别（公务员法依据，单独小行） */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 9, color: theme.mutedText }}>⚖️</Text>
              <Text style={{ fontSize: 9, color: theme.mutedText, letterSpacing: 0.3 }}>{getLegalTitle(save.rankLevel)}</Text>
            </View>

            {/* 六格状态网格 2×3 */}
            <View style={{ flexDirection: 'row', gap: 0, borderWidth: 1, borderColor: theme.cardBorder }}>
              {(() => {
                // 偶数格 = cardBg（浅色背景），奇数格 = quickStatBg（深色背景）
                // lightColor：浅背景下的数字颜色（需深色保证对比度）
                // darkColor：深背景下的数字颜色（需亮色保证对比度）
                const moralLight = save.moralValue >= 60 ? '#1a6b2a' : save.moralValue >= 30 ? '#92600A' : '#B80000';
                const moralDark  = save.moralValue >= 60 ? theme.statHigh : save.moralValue >= 30 ? '#FFD54F' : '#FF6B6B';
                const bossLight  = save.bossFavor >= 60 ? '#1a6b2a' : save.bossFavor >= 25 ? '#92600A' : '#B80000';
                const bossDark   = save.bossFavor >= 60 ? theme.statHigh : save.bossFavor >= 25 ? '#FFD54F' : '#FF6B6B';
                const tenureOk   = save.tenureYears >= effectiveTenureRequired;
                const stats = [
                  // 偶数格（浅背景）
                  { label: '政绩', value: Math.floor(save.meritPoints).toString(), lightColor: theme.valueText,         darkColor: '#FFFFFF' },
                  // 奇数格（深背景）
                  { label: '财政余额', value: formatMoney(save.fundBalance),         lightColor: theme.valueText,         darkColor: '#FFFFFF' },
                  // 偶数格
                  { label: '民心', value: save.moralValue.toString(),               lightColor: moralLight,              darkColor: moralDark },
                  // 奇数格
                  { label: '上司', value: save.bossFavor.toString(),                lightColor: bossLight,               darkColor: bossDark },
                  // 偶数格
                  { label: '派系', value: save.primaryFaction ? (save.primaryFaction === 'reform' ? '改革' : save.primaryFaction === 'pragmatic' ? '务实' : save.primaryFaction === 'cyl' ? '团系' : save.primaryFaction === 'techno' ? '技官' : '地方') : '未站队', lightColor: theme.primary, darkColor: '#FFFFFF' },
                  // 奇数格
                  { label: '任期', value: `${save.tenureYears}/${effectiveTenureRequired}年`, lightColor: tenureOk ? '#1a6b2a' : theme.valueText, darkColor: tenureOk ? theme.statHigh : '#FFFFFF' },
                ];
                return stats.map((item, i) => {
                  const isDeepBg = i % 2 === 1; // 奇数格深色背景
                  const numColor  = isDeepBg ? item.darkColor : item.lightColor;
                  const lblColor  = isDeepBg ? 'rgba(255,255,255,0.62)' : theme.mutedText;
                  // 财政余额格（index=1）点击跳转到城市财政；民心格（index=2）点击跳民心修行
                  const isFiscal = item.label === '财政余额';
                  const isPopular = item.label === '民心';
                  return (
                    <Pressable
                      key={item.label}
                      onPress={isFiscal ? () => router.push('/(app)/fiscal' as never) : isPopular ? () => router.push('/(app)/popular-support' as RelativePathString) : undefined}
                      style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRightWidth: i < 5 ? 1 : 0, borderRightColor: theme.cardBorder, backgroundColor: isDeepBg ? theme.quickStatBg : theme.cardBg }}
                    >
                      <Text style={{ fontSize: 8, color: lblColor, letterSpacing: 0.5, marginBottom: 3 }}>
                        {item.label}{(isFiscal || isPopular) ? ' ▸' : ''}
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: numColor, fontVariant: ['tabular-nums'] }} numberOfLines={1}>{item.value}</Text>
                    </Pressable>
                  );
                });
              })()}
            </View>

            {/* 进度条 */}
            <View style={{ gap: 7 }}>
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Text style={{ fontSize: 10, color: theme.labelText }}>任职年限</Text>
                    {save.isExcellentRank && (
                      <View style={{ backgroundColor: '#e8f5e9', borderWidth: 1, borderColor: '#2a7a3b', paddingHorizontal: 4, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 8, color: '#2a7a3b', fontWeight: '700' }}>优秀减半</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 10, color: save.tenureYears >= effectiveTenureRequired ? theme.statHigh : theme.accentSub, fontVariant: ['tabular-nums'] }}>
                    {save.tenureYears}年 / 需{effectiveTenureRequired}年
                    {save.tenureYears >= effectiveTenureRequired ? ' ✓' : ''}
                  </Text>
                </View>
                <View style={{ height: 5, backgroundColor: theme.progressBg }}>
                  <View style={{ height: 5, width: `${tenureProgress}%`, backgroundColor: tenureProgress >= 100 ? '#2a7a3b' : theme.accentSub }} />
                </View>
              </View>
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 10, color: theme.labelText }}>政绩积累</Text>
                  <Text style={{ fontSize: 10, color: meritProgress >= 100 ? theme.statHigh : theme.primary, fontVariant: ['tabular-nums'] }}>
                    {save.meritPoints.toFixed(0)} / {rankConfig.requiredMerit}
                    {meritProgress >= 100 ? ' ✓' : ''}
                  </Text>
                </View>
                <View style={{ height: 5, backgroundColor: theme.progressBg }}>
                  <View style={{ height: 5, width: `${meritProgress}%`, backgroundColor: meritProgress >= 100 ? '#2a7a3b' : theme.primary }} />
                </View>
              </View>
              {displayRetireAge !== null && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTopWidth: 1, borderTopColor: theme.cardBorder }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Text style={{ fontSize: 10, color: theme.mutedText }}>{retireCfg.isVoluntaryAt !== null ? '自主退休' : '退休年龄'}</Text>
                    {(save.retirementDelayYears ?? 0) > 0 && (
                      <View style={{ backgroundColor: '#FFF0C0', borderWidth: 1, borderColor: '#D4A017', paddingHorizontal: 4, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 8, color: '#8B6A00', fontWeight: '700' }}>已延迟{save.retirementDelayYears}年</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Text style={{ fontSize: 10, color: showRetireWarning ? theme.statLow : theme.mutedText, fontWeight: showRetireWarning ? '700' : '400' }}>
                      {retireCfg.isVoluntaryAt !== null ? `${displayRetireAge}岁可自主选择` : `${displayRetireAge}岁`}
                    </Text>
                    {showRetireWarning && (
                      <View style={{ backgroundColor: theme.alertBg, borderWidth: 1, borderColor: theme.statLow, paddingHorizontal: 4, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 8, color: theme.statLow, fontWeight: '700' }}>⚠ 不足1年</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ══ 城市经营面板 ══ */}
        <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderTopWidth: theme.decorLineHeight, borderTopColor: theme.accentSub, padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <View style={{ backgroundColor: jurisdiction.typeColor, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{jurisdiction.type}</Text>
            </View>
            <Text style={{ fontSize: 12, color: theme.sectionHeaderText, fontWeight: '600', flex: 1 }}>{jurisdiction.label}</Text>
            <Text style={{ fontSize: 10, color: '#888' }}>任期 {save.tenureYears}/{save.maxTenureYears}年</Text>
            {(() => {
              const cityScore = isPremierLevel
                ? Math.round((nationalGdp + nationalLivelihood + nationalEco + nationalBusiness) / 4)
                : Math.round((save.cityGdp + save.cityLivelihood + save.cityEcology + save.cityBusiness) / 4);
              const scoreColor = isPremierLevel ? '#4B0082' : cityScore >= 70 ? '#2a7a3b' : cityScore >= 40 ? '#e67e22' : '#C82829';
              return (
                <View style={{ backgroundColor: scoreColor, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>综合{cityScore}</Text>
                </View>
              );
            })()}
          </View>
          {isPremierLevel ? (
            <>
              <View style={{ backgroundColor: theme.sectionHeaderBg, borderWidth: 1, borderColor: theme.cardBorder, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 9, color: theme.sectionHeaderText }}>🏛️ 施政范围</Text>
                <Text style={{ fontSize: 11, color: theme.sectionHeaderText, fontWeight: '700' }}>全国综合治理</Text>
                <Text style={{ fontSize: 9, color: theme.mutedText, marginLeft: 4 }}>数值下限 500</Text>
              </View>
              {[
                { label: '经济发展总指数', value: nationalGdp, max: 1200 },
                { label: '民生保障总指数', value: nationalLivelihood, max: 1200 },
                { label: '生态治理总指数', value: nationalEco, max: 1200 },
                { label: '营商环境总指数', value: nationalBusiness, max: 1200 },
              ].map(kpi => (
                <View key={kpi.label} style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                    <Text style={{ fontSize: 11, color: theme.labelText }}>{kpi.label}</Text>
                    <Text style={{ fontSize: 11, color: theme.accent, fontWeight: '700' }}>{kpi.value}</Text>
                  </View>
                  <View style={{ height: 4, backgroundColor: theme.progressBg }}>
                    <View style={{ height: 4, width: `${Math.min(100, Math.round(kpi.value / kpi.max * 100))}%`, backgroundColor: theme.progressFill }} />
                  </View>
                </View>
              ))}
            </>
          ) : isMinistryLevel ? (
            <>
              <View style={{ backgroundColor: theme.sectionHeaderBg, borderWidth: 1, borderColor: theme.cardBorder, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 9, color: theme.sectionHeaderText }}>🏛️ 分管领域</Text>
                <Text style={{ fontSize: 11, color: theme.sectionHeaderText, fontWeight: '700' }}>{ministryFocus}</Text>
              </View>
              {ministryKpis.map(kpi => (
                <StatBar key={kpi.label} label={kpi.label} value={kpi.value} theme={theme} />
              ))}
            </>
          ) : (
            <>
              {/* 分层级 KPI 考核指标 */}
              {kpiPanel.map(item => {
                const barColor = item.vetoed
                  ? '#C82829'
                  : item.warning
                    ? '#e67e22'
                    : item.score >= 70
                      ? '#2a7a3b'
                      : theme.primary;
                return (
                  <View key={item.key} style={{ marginBottom: 9 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                        {item.isTop && (
                          <View style={{ backgroundColor: theme.primary, paddingHorizontal: 4, paddingVertical: 1 }}>
                            <Text style={{ fontSize: 7, color: theme.primaryText, fontWeight: '700' }}>核心</Text>
                          </View>
                        )}
                        <Text style={{ fontSize: 11, color: theme.labelText, fontWeight: item.isTop ? '700' : '400' }}>{item.label}</Text>
                        {item.warning && !item.vetoed && (
                          <Text style={{ fontSize: 9, color: '#e67e22' }}>⚠</Text>
                        )}
                        {item.vetoed && (
                          <Text style={{ fontSize: 9, color: '#C82829', fontWeight: '700' }}>⛔</Text>
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 9, color: theme.mutedText }}>权重{Math.round(item.weight * 100)}%</Text>
                        <Text style={{ fontSize: 11, color: barColor, fontWeight: '700', fontVariant: ['tabular-nums'], minWidth: 28, textAlign: 'right' }}>
                          {item.score}
                        </Text>
                      </View>
                    </View>
                    <View style={{ height: 5, backgroundColor: theme.progressBg }}>
                      <View style={{ height: 5, width: `${item.score}%`, backgroundColor: barColor }} />
                    </View>
                    <Text style={{ fontSize: 9, color: theme.mutedText, marginTop: 2 }}>{item.desc}</Text>
                  </View>
                );
              })}
              {/* 综合得分 + 晋升状态 */}
              <View style={{ borderTopWidth: 1, borderTopColor: theme.cardBorder, marginTop: 4, paddingTop: 8, gap: 5 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, color: theme.labelText, fontWeight: '700' }}>综合考核得分</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 9, color: theme.mutedText }}>门槛 {kpiResult.scoreThreshold}分</Text>
                    <Text style={{
                      fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'],
                      color: kpiResult.scoreReady ? '#2a7a3b' : '#C82829',
                    }}>
                      {kpiResult.totalScore}分
                    </Text>
                  </View>
                </View>
                <View style={{ height: 7, backgroundColor: theme.progressBg }}>
                  <View style={{ height: 7, width: `${Math.min(100, kpiResult.totalScore)}%`, backgroundColor: kpiResult.scoreReady ? '#2a7a3b' : theme.primary }} />
                  {/* 门槛标记线 */}
                  <View style={{ position: 'absolute', left: `${kpiResult.scoreThreshold}%`, top: 0, bottom: 0, width: 1.5, backgroundColor: '#C82829' }} />
                </View>
                <View style={{ backgroundColor: kpiResult.eligible ? '#e8f5e9' : kpiResult.hasVeto ? '#fff0f0' : '#fffbe6', borderWidth: 1, borderColor: kpiResult.eligible ? '#2a7a3b' : kpiResult.hasVeto ? '#C82829' : '#e67e22', paddingHorizontal: 8, paddingVertical: 5, marginTop: 2 }}>
                  <Text style={{ fontSize: 10, color: kpiResult.eligible ? '#2a7a3b' : kpiResult.hasVeto ? '#C82829' : '#8B6914', fontWeight: '600', lineHeight: 16 }}>
                    {promotionSummaryText}
                  </Text>
                </View>
                {kpiResult.hasVeto && (
                  <View style={{ gap: 3, marginTop: 2 }}>
                    {kpiResult.vetoItems.filter(v => v.triggered).map(v => (
                      <Text key={v.label} style={{ fontSize: 9, color: '#C82829', lineHeight: 14 }}>
                        ⛔ {v.label}：{v.desc}（当前 {v.value}，需≥{v.threshold}）
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
        </View>

        {/* ══ 核心政务 ══ */}
        <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderTopWidth: theme.decorLineHeight, borderTopColor: theme.decorLine, padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <View style={{ width: 3, height: 13, backgroundColor: theme.primary }} />
            <Text style={{ fontSize: 10, color: theme.valueText, fontWeight: '700', letterSpacing: 2 }}>核心政务</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <View style={{ width: '31%' }}>
              <NavCard label="上司关系" icon="🤝" badge={pendingTaskCount} onPress={() => router.push('/(app)/tasks')} accent theme={theme} />
            </View>
            {save.rankLevel < 12 && (
              <View style={{ width: '31%' }}>
                <NavCard label="突发事件" icon="⚠️" badge={save.isEventPending ? 1 : 0} onPress={() => router.push('/(app)/events')} accent theme={theme} />
              </View>
            )}
            {save.rankLevel < MAX_RANK_LEVEL && (
              <View style={{ width: '31%' }}>
                <NavCard label="晋升申请" icon="🏅" badge={save.isPromotionAvailable ? 1 : 0} onPress={() => router.push('/(app)/promotion')} accent theme={theme} />
              </View>
            )}
            {save.rankLevel < 12 && (
              <View style={{ width: '31%' }}>
                <NavCard label="工作报告" icon="📑" badge={unreadReports.length} onPress={() => router.push('/(app)/monthly-report')} theme={theme} />
              </View>
            )}
            {save.rankLevel >= 12 && (
              <View style={{ width: '31%' }}>
                <NavCard label="述职报告" icon="📑" badge={unreadReports.length} onPress={() => router.push('/(app)/monthly-report')} theme={theme} />
              </View>
            )}
          </View>
        </View>

        {/* ══ 人事管理 ══ */}
        <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderTopWidth: theme.decorLineHeight, borderTopColor: theme.decorLine, padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <View style={{ width: 3, height: 13, backgroundColor: theme.primary }} />
            <Text style={{ fontSize: 10, color: theme.valueText, fontWeight: '700', letterSpacing: 2 }}>人事管理</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <View style={{ width: '31%' }}>
              <NavCard label="人事中枢" icon="🏛️" onPress={() => router.push('/(app)/personnel')} accent theme={theme} />
            </View>
            <View style={{ width: '31%' }}>
              <NavCard label="下属管理" icon="👥" onPress={() => router.push('/(app)/subordinates')} theme={theme} />
            </View>
            <View style={{ width: '31%' }}>
              {save.rankLevel < 7 ? (
                <NavCard
                  label="招募干部" icon="🎓"
                  badge={(save.lastRecruitQuarter ?? 0) < Math.floor(save.gameDays / 90) && Math.floor(save.gameDays / 90) > 0 ? 1 : 0}
                  onPress={() => router.push('/(app)/recruit')}
                  theme={theme}
                />
              ) : save.rankLevel < 12 ? (
                <NavCard label="组织部" icon="🎓" onPress={() => router.push('/(app)/recruit')} theme={theme} />
              ) : save.rankLevel < 13 ? (
                <NavCard label="组织部分配" icon="🏢" onPress={() => router.push('/(app)/subordinates')} theme={theme} />
              ) : (
                <NavCard label="央管干部" icon="🎖️" onPress={() => router.push('/(app)/cadre-appointment')} accent theme={theme} />
              )}
            </View>
            <View style={{ width: '31%' }}>
              <NavCard label="派系关系" icon="⚖️" onPress={() => router.push('/(app)/factions')} theme={theme} />
            </View>
            <View style={{ width: '31%' }}>
              <NavCard label="势力地图" icon="🗺️" onPress={() => router.push('/(app)/faction-map' as never)} theme={theme} />
            </View>
            {save.rankLevel >= 7 && save.rankLevel < 10 && (
              <View style={{ width: '31%' }}>
                <NavCard label="市管干部" icon="🏙️" onPress={() => router.push('/(app)/city-appointment')} accent theme={theme} />
              </View>
            )}
            {save.rankLevel >= 8 && save.rankLevel < 12 && (
              <View style={{ width: '31%' }}>
                <NavCard label="交流干部" icon="🔄" badge={exchangeOfficer ? 1 : 0} onPress={() => router.push('/(app)/exchange-officer')} theme={theme} />
              </View>
            )}
            <View style={{ width: '31%' }}>
              <NavCard label="代会提名" icon="🏛️" onPress={() => router.push('/(app)/npc-congress')} theme={theme} />
            </View>
            {save.rankLevel >= 12 && (
              <View style={{ width: '31%' }}>
                <NavCard label="选调生" icon="🎓" onPress={() => router.push('/(app)/cadre-selection')} accent theme={theme} />
              </View>
            )}
          </View>
        </View>

        {/* ══ 城市治理（rank < 12）══ */}
        {save.rankLevel < 12 && (
          <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderTopWidth: theme.decorLineHeight, borderTopColor: theme.accentSub, padding: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <View style={{ width: 3, height: 13, backgroundColor: theme.accentSub }} />
              <Text style={{ fontSize: 10, color: theme.valueText, fontWeight: '700', letterSpacing: 2 }}>城市治理</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {[
                { label: '职能管理', icon: '🏛️', badge: pendingCaseCount, path: '/(app)/departments', lock: false },
                { label: '城市建设', icon: '🏗️', badge: 0, path: '/(app)/construction', lock: save.rankLevel < 2, unlock: 2 },
                { label: '管辖区域', icon: '🗺️', badge: 0, path: '/(app)/governing-areas', lock: save.rankLevel < 5, unlock: 5 },
                { label: '民生详情', icon: '🏘️', badge: 0, path: '/(app)/livelihood', lock: false },
                { label: '城市财政', icon: '📊', badge: 0, path: '/(app)/fiscal', lock: false },
                { label: '城市金融', icon: '🏦', badge: 0, path: '/(app)/finance', lock: save.rankLevel < 4, unlock: 4 },
              ].map(item => (
                <View key={item.label} style={{ width: '31%' }}>
                  <NavCard
                    label={item.label} icon={item.icon}
                    badge={item.badge > 0 ? item.badge : undefined}
                    onPress={() => router.push(item.path as never)}
                    locked={item.lock}
                    unlockLevel={item.unlock}
                    theme={theme}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ══ 民心修行 ══ */}
        <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderTopWidth: theme.decorLineHeight, borderTopColor: theme.primary, padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <View style={{ width: 3, height: 13, backgroundColor: theme.primary }} />
            <Text style={{ fontSize: 10, color: theme.valueText, fontWeight: '700', letterSpacing: 2 }}>民心修行</Text>
            {(save.popularSupport ?? 50) < 40 && (
              <View style={{ backgroundColor: '#dc2626', borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 }}>
                <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>⚠️ 民心不足</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <View style={{ width: '100%' }}>
              <NavCard
                label="民心修行"
                icon="🌱"
                badge={(() => {
                  const cooldowns: Record<string, number> = save.popularActionCooldowns ?? {};
                  const actions = getConfigsByCategory('popularity');
                  const hasAvailable = actions.some((a) => {
                    if (save.rankLevel < a.unlockRank) return false;
                    return save.gameDays >= (cooldowns[a.id] ?? 0);
                  });
                  return hasAvailable ? 1 : undefined;
                })()}
                onPress={() => router.push('/(app)/popular-support' as RelativePathString)}
                theme={theme}
              />
            </View>
          </View>
        </View>

        {/* ══ 灰色权力（贪腐玩法）══ */}
        <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.accent, borderTopWidth: theme.decorLineHeight, borderTopColor: theme.accent, padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <View style={{ width: 3, height: 13, backgroundColor: theme.accent }} />
            <Text style={{ fontSize: 10, color: theme.accent, fontWeight: '700', letterSpacing: 2 }}>灰色权力</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <View style={{ width: '48%' }}>
              <NavCard label="权钱交易" icon="💰" badge={(save.riskValue ?? 0) > 0 ? save.riskValue : undefined} onPress={() => router.push('/(app)/bribery')} locked={save.rankLevel < 3} unlockLevel={3} theme={theme} />
            </View>
            <View style={{ width: '48%' }}>
              <NavCard label="纪检风云" icon="🕵️" badge={(save.riskValue ?? 0) >= 50 ? 1 : undefined} onPress={() => router.push('/(app)/discipline-risk')} locked={save.rankLevel < 4} unlockLevel={4} theme={theme} />
            </View>
            <View style={{ width: '48%' }}>
              <NavCard label="涉案资产" icon="📦" badge={(save.illegalWealth ?? 0) >= 100000 ? 1 : undefined} onPress={() => router.push('/(app)/illicit-assets')} locked={save.rankLevel < 3} unlockLevel={3} theme={theme} />
            </View>
            <View style={{ width: '48%' }}>
              <NavCard label="接受审查" icon="⚖️" onPress={() => router.push('/(app)/interrogation')} locked={(save.investState ?? 'none') === 'none'} unlockLevel={0} theme={theme} />
            </View>
          </View>
        </View>

        {/* ══ 辅助功能 ══ */}
        <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderTopWidth: theme.decorLineHeight, borderTopColor: theme.decorLine, padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <View style={{ width: 3, height: 13, backgroundColor: theme.primary }} />
            <Text style={{ fontSize: 10, color: theme.valueText, fontWeight: '700', letterSpacing: 2 }}>辅助功能</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <View style={{ width: '31%' }}>
              {save.rankLevel < 12
                ? <NavCard label="月度会议" icon="📝" locked={save.rankLevel < 3} unlockLevel={3} onPress={() => router.push('/(app)/meeting')} theme={theme} />
                : <NavCard label="国政院会议" icon="🏛️" onPress={() => router.push('/(app)/meeting')} theme={theme} />}
            </View>
            <View style={{ width: '31%' }}>
              <NavCard label="专属秘书" icon="🤵" locked={false} unlockLevel={1} onPress={() => router.push('/(app)/secretary')} theme={theme} />
            </View>
            <View style={{ width: '31%' }}>
              <NavCard label="领导班子" icon="🫂" locked={save.rankLevel < 3} unlockLevel={3} onPress={() => router.push('/(app)/leadership')} theme={theme} />
            </View>
            <View style={{ width: '31%' }}>
              <NavCard label="健康党校" icon="🏥" onPress={() => router.push('/(app)/health')} theme={theme} />
            </View>
            <View style={{ width: '31%' }}>
              <NavCard label="家庭生活" icon="🏠" onPress={() => router.push('/(app)/family')} theme={theme} />
            </View>
            <View style={{ width: '31%' }}>
              <NavCard label="年度排行" icon="🏆" onPress={() => router.push('/(app)/annual-report')} theme={theme} />
            </View>
            <View style={{ width: '31%' }}>
              <NavCard label="排行榜" icon="🥇" onPress={() => router.push('/(app)/ranking')} theme={theme} />
            </View>
            <View style={{ width: '31%' }}>
              <NavCard label="个人财富" icon="💰" onPress={() => router.push('/(app)/personal-wealth')} theme={theme} />
            </View>
            <View style={{ width: '31%' }}>
              <NavCard label="官职体系" icon="📜" onPress={() => router.push('/(app)/official-hierarchy')} theme={theme} />
            </View>
            <View style={{ width: '31%' }}>
              <NavCard label="领导人档案" icon="📋" onPress={() => router.push('/(app)/national-leaders')} theme={theme} />
            </View>
          </View>
        </View>

        {/* ══ 管理后台（仅管理员可见）══ */}
        {isAdmin && (
          <View style={{ backgroundColor: '#0D1B2A', borderWidth: 1, borderColor: '#C8A84B', borderTopWidth: 2, borderTopColor: '#C8A84B', padding: 12 }}>
            <Pressable cssInterop={false} onPress={() => router.push('/(app)/admin-panel' as never)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 22 }}>🛡️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#E8D08A', letterSpacing: 2 }}>管理后台</Text>
                <Text style={{ fontSize: 10, color: '#A09070', marginTop: 2 }}>数据统计 · 清理维护 · 数据库管理</Text>
              </View>
              <Text style={{ fontSize: 16, color: '#C8A84B' }}>›</Text>
            </Pressable>
          </View>
        )}

        {/* ══ 高层职权（rank 8+）══ */}
        {save.rankLevel >= 8 && (
          <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.primary, borderTopWidth: theme.decorLineHeight, borderTopColor: theme.primary, padding: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <View style={{ width: 3, height: 13, backgroundColor: theme.accent }} />
              <Text style={{ fontSize: 10, color: theme.primary, fontWeight: '700', letterSpacing: 2 }}>高层职权</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {save.rankLevel < 14 && (
                <View style={{ width: '31%' }}>
                  <NavCard label="职务兼职" icon="🎖️" badge={(save.concurrentPosts ?? []).length} onPress={() => router.push('/(app)/concurrent-posts')} accent theme={theme} />
                </View>
              )}
              {save.rankLevel >= 10 && save.rankLevel < 13 && (
                <View style={{ width: '31%' }}>
                  <NavCard label="省管干部" icon="🏛️" onPress={() => router.push('/(app)/province-appointment')} accent theme={theme} />
                </View>
              )}
              {save.rankLevel >= 10 && (
                <View style={{ width: '31%' }}>
                  <NavCard label="军事力量" icon="⚔️" onPress={() => router.push('/(app)/military')} accent theme={theme} />
                </View>
              )}
              {save.rankLevel >= 11 && (
                <View style={{ width: '31%' }}>
                  <NavCard label="四大班子" icon="🏛️" onPress={() => router.push('/(app)/four-organs')} accent theme={theme} />
                </View>
              )}
              {save.rankLevel >= 12 && save.rankLevel <= 12 && (
                <View style={{ width: '31%' }}>
                  <NavCard label="部委治国" icon="🏛️" onPress={() => router.push('/(app)/ministry')} accent theme={theme} />
                </View>
              )}
              <View style={{ width: '31%' }}>
                <NavCard label="总理办公室" icon="⭐" onPress={() => router.push('/(app)/premier-office')} accent theme={theme} />
              </View>
              {save.rankLevel >= 13 && (
                <View style={{ width: '31%' }}>
                  <NavCard label="央管干部" icon="🎖️" onPress={() => router.push('/(app)/cadre-appointment')} accent theme={theme} />
                </View>
              )}
              {save.rankLevel >= 14 && (
                <View style={{ width: '31%' }}>
                  <NavCard label="各省管理" icon="🗺️" onPress={() => router.push('/(app)/provinces-manage')} accent theme={theme} />
                </View>
              )}
              {save.rankLevel >= 14 && (
                <View style={{ width: '31%' }}>
                  <NavCard label="国家建设" icon="🏗️" onPress={() => router.push('/(app)/national-construction')} accent theme={theme} />
                </View>
              )}
              {save.rankLevel >= 14 && (
                <View style={{ width: '31%' }}>
                  <NavCard label="军委职权" icon="🎖️" onPress={() => router.push('/(app)/military-commission')} accent theme={theme} />
                </View>
              )}
              {save.rankLevel >= 15 && (
                <View style={{ width: '31%' }}>
                  <NavCard label="国家中枢" icon="🏯" onPress={() => router.push('/(app)/national-center')} accent theme={theme} />
                </View>
              )}
              {save.rankLevel >= 12 && save.rankLevel < 14 && (
                <View style={{ width: '31%' }}>
                  <NavCard label="选调生" icon="🎓" onPress={() => router.push('/(app)/cadre-selection')} accent theme={theme} />
                </View>
              )}
            </View>

            {/* 兼职摘要条 */}
            {(save.concurrentPosts ?? []).length > 0 && (() => {
              const myPosts = CONCURRENT_POST_CONFIG.filter(p => (save.concurrentPosts ?? []).includes(p.key));
              return (
                <View style={{ backgroundColor: theme.sectionHeaderBg, borderWidth: 1, borderColor: theme.decorLine, borderLeftWidth: 3, borderLeftColor: theme.primary, padding: 10, marginTop: 10, gap: 4 }}>
                  <Text style={{ fontSize: 10, color: theme.sectionHeaderText, fontWeight: '700', marginBottom: 3 }}>🎖️ 当前兼职职务</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {myPosts.map(p => (
                      <View key={p.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 12 }}>{p.icon}</Text>
                        <Text style={{ fontSize: 11, color: theme.labelText, fontWeight: '600' }}>{p.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })()}
          </View>
        )}

        {/* ══ 上司关系速览 ══ */}
        <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderTopWidth: theme.decorLineHeight, borderTopColor: theme.accentSub, padding: 12, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 3, height: 13, backgroundColor: theme.accentSub }} />
              <Text style={{ fontSize: 10, color: theme.valueText, fontWeight: '700', letterSpacing: 2 }}>上级关系</Text>
            </View>
            {pendingTaskCount > 0 && (
              <Pressable onPress={() => router.push('/(app)/tasks')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ backgroundColor: theme.primary, paddingHorizontal: 7, paddingVertical: 2 }}>
                  <Text style={{ color: theme.primaryText, fontSize: 9, fontWeight: '700' }}>{pendingTaskCount}项待完成</Text>
                </View>
              </Pressable>
            )}
          </View>
          {/* 直属上司 */}
          <View style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <View>
                <Text style={{ fontSize: 9, color: theme.mutedText, letterSpacing: 1 }}>直属上司</Text>
                <Text style={{ fontSize: 13, color: theme.valueText, fontWeight: '700', marginTop: 2 }}>{save.bossName || RANK_CONFIG[save.rankLevel]?.bossTitle || '—'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 9, color: theme.mutedText }}>好感度</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: save.bossFavor >= 60 ? theme.statHigh : save.bossFavor >= 25 ? theme.statMid : theme.statLow }}>
                  {save.bossFavor}
                </Text>
              </View>
            </View>
            <View style={{ height: 5, backgroundColor: theme.progressBg }}>
              <View style={{ height: 5, width: `${save.bossFavor}%`, backgroundColor: save.bossFavor >= 60 ? theme.statHigh : save.bossFavor >= 25 ? theme.statMid : theme.statLow }} />
            </View>
          </View>
          {/* 上司2 */}
          {save.boss2Name ? (
            <View style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <View>
                  <Text style={{ fontSize: 9, color: theme.mutedText, letterSpacing: 1 }}>{RANK_CONFIG[save.rankLevel]?.bossTitle2 || '二级上司'}</Text>
                  <Text style={{ fontSize: 12, color: theme.labelText, fontWeight: '600', marginTop: 2 }}>{save.boss2Name}</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: save.boss2Favor >= 60 ? theme.statHigh : save.boss2Favor >= 25 ? theme.statMid : theme.statLow }}>
                  {save.boss2Favor}
                </Text>
              </View>
              <View style={{ height: 3, backgroundColor: theme.progressBg }}>
                <View style={{ height: 3, width: `${save.boss2Favor}%`, backgroundColor: save.boss2Favor >= 60 ? theme.statHigh : save.boss2Favor >= 25 ? theme.statMid : theme.statLow }} />
              </View>
            </View>
          ) : null}
          {/* 上司3 */}
          {save.boss3Name ? (
            <View style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <View>
                  <Text style={{ fontSize: 9, color: theme.mutedText, letterSpacing: 1 }}>{RANK_CONFIG[save.rankLevel]?.bossTitle3 || '三级上司'}</Text>
                  <Text style={{ fontSize: 12, color: theme.labelText, fontWeight: '600', marginTop: 2 }}>{save.boss3Name}</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: save.boss3Favor >= 60 ? theme.statHigh : save.boss3Favor >= 25 ? theme.statMid : theme.statLow }}>
                  {save.boss3Favor}
                </Text>
              </View>
              <View style={{ height: 3, backgroundColor: theme.progressBg }}>
                <View style={{ height: 3, width: `${save.boss3Favor}%`, backgroundColor: save.boss3Favor >= 60 ? theme.statHigh : save.boss3Favor >= 25 ? theme.statMid : theme.statLow }} />
              </View>
            </View>
          ) : null}
          <StatBar label="改革派声望" value={save.reformFaction} theme={theme} />
          <StatBar label="务实派声望" value={save.pragmaticFaction} theme={theme} />
        </View>

        {/* 底部：频道 + 赞助 双入口 */}
        <View style={{ marginTop: 10, marginBottom: insets.bottom + 12, marginHorizontal: 12, flexDirection: 'row', gap: 8 }}>
          {/* 腾讯频道(QQ)入口 — 缩小版 */}
          <View style={{ flex: 1, backgroundColor: '#0D1B2A', borderWidth: 1, borderColor: '#1E3A5A', padding: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 26, height: 26, backgroundColor: '#12B7F5', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>QQ</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#EDE8DC', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>腾讯频道</Text>
              <Text style={{ color: '#7A6428', fontSize: 9, marginTop: 1 }}>Gaoxian2026</Text>
            </View>
          </View>
          {/* 赞助支持作者入口 */}
          <Pressable
            onPress={() => router.push('/(app)/sponsor')}
            style={{ flex: 1, backgroundColor: '#1A1200', borderWidth: 1, borderColor: '#7A6428', padding: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <View style={{ width: 26, height: 26, backgroundColor: '#C8A84B', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 14 }}>❤️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#E8D08A', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>赞助支持作者</Text>
              <Text style={{ color: '#A09070', fontSize: 9, marginTop: 1 }}>永久免费承诺</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      {/* 退休弹窗 */}
      {retirementTrigger && (
        <RetirementModal
          visible={!!retirementTrigger}
          triggerType={retirementTrigger}
          onClose={clearRetirementTrigger}
        />
      )}

      {/* 续任投票弹窗（rank14 总理第一届届满 / rank15 总执书记每届届满） */}
      {renewalVoteTrigger && (
        <RenewalVoteModal
          visible={!!renewalVoteTrigger}
          rankLevel={renewalVoteTrigger.rankLevel}
          voteRate={renewalVoteTrigger.voteRate}
          passed={renewalVoteTrigger.passed}
          termsAfter={renewalVoteTrigger.termsAfter}
          onClose={clearRenewalVoteTrigger}
        />
      )}

      {/* 纪委约谈 / 立案审查弹窗 */}
      {disciplineWarnEvent && save && (
        <DisciplineWarnModal
          event={disciplineWarnEvent}
          onConfirm={async () => {
            // 应用政绩扣除和民心值变化
            const penalty = disciplineWarnEvent.meritPenalty;
            const moralDelta = disciplineWarnEvent.moralChange;
            await updateGameSave({
              meritPoints: Math.max(0, save.meritPoints - penalty),
              moralValue: Math.max(0, Math.min(100, save.moralValue + moralDelta)),
            });
            clearDisciplineWarnEvent();
          }}
        />
      )}

      {/* 上司换届通知弹窗 */}
      {bossChangeEvent && (
        <BossChangeModal
          event={bossChangeEvent}
          onConfirm={clearBossChangeEvent}
        />
      )}

      {/* ══ 改名弹窗 ══ */}
      <Modal visible={showRenameModal} transparent animationType="fade" onRequestClose={() => setShowRenameModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: theme.cardBg, padding: 24, width: '85%', borderRadius: 8, borderTopWidth: 3, borderTopColor: theme.primary }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.headerText, marginBottom: 4 }}>修改存档名称</Text>
            <Text style={{ fontSize: 11, color: theme.mutedText, marginBottom: 14, lineHeight: 16 }}>
              名称将用于显示，不影响职级和游戏进度。名称须符合社区规范，{'\n'}
              违禁词将触发警告，二次违规自动封号。
            </Text>
            <TextInput
              value={renameInput}
              onChangeText={(v) => {
                setRenameInput(v);
                setRenameWarn('');
                // 机制①：防抖实时检测
                debounceCheckName(v.trim(), (hit) => {
                  if (hit) setRenameWarn('⚠️ 名称含违规词汇，提交将被拦截');
                  else setRenameWarn('');
                });
              }}
              placeholder={`当前：${save.playerName}`}
              placeholderTextColor={theme.mutedText}
              maxLength={20}
              autoFocus
              style={{
                borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 6,
                paddingHorizontal: 12, paddingVertical: 9,
                fontSize: 14, color: theme.headerText, backgroundColor: theme.pageBg,
                marginBottom: 8,
              }}
            />
            <Text style={{ fontSize: 10, color: theme.mutedText, marginBottom: 4, textAlign: 'right' }}>
              {renameInput.length}/20
            </Text>
            {/* 机制①：实时检测提示 */}
            {!!renameWarn && (
              <View style={{ backgroundColor: '#fff3cd', borderWidth: 1, borderColor: '#ffc107',
                borderRadius: 6, padding: 8, marginBottom: 8 }}>
                <Text style={{ fontSize: 11, color: '#856404', lineHeight: 16 }}>{renameWarn}</Text>
              </View>
            )}
            {/* 结果提示 */}
            {renameMsg && (
              <View style={{
                backgroundColor: renameMsg.ok ? '#16a34a22' : '#dc262622',
                borderWidth: 1, borderColor: renameMsg.ok ? '#16a34a55' : '#dc262655',
                borderRadius: 6, padding: 10, marginBottom: 12,
              }}>
                <Text style={{ fontSize: 12, color: renameMsg.ok ? '#16a34a' : '#dc2626', lineHeight: 18 }}>
                  {renameMsg.text}
                </Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <Pressable
                onPress={() => { setShowRenameModal(false); setRenameMsg(null); setRenameWarn(''); }}
                style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, backgroundColor: theme.cardBorder }}>
                <Text style={{ fontSize: 13, color: theme.labelText }}>取消</Text>
              </Pressable>
              <Pressable
                disabled={renameLoading || renameInput.trim().length === 0}
                onPress={async () => {
                  const name = renameInput.trim();
                  if (!name || name.length > 20) return;
                  setRenameLoading(true);
                  setRenameMsg(null);
                  // 机制②：提交前二次校验（客户端）
                  const { checkNameSensitive } = await import('@/lib/sensitiveFilter');
                  const hit = await checkNameSensitive(name);
                  if (hit === true) {
                    setRenameLoading(false);
                    setRenameMsg({ ok: false, text: '⚠️ 名称含违规词汇，已被客户端拦截，请更换名称。' });
                    return;
                  }
                  // 机制③：服务端 RPC 校验（含警告/封号逻辑）
                  const res = await playerRenameSave(save.id, name);
                  setRenameLoading(false);
                  if (res.code === 'OK') {
                    setRenameWarn('');
                    await refreshSave();
                    setShowRenameModal(false);
                  } else if (res.code === 'BANNED') {
                    setRenameMsg({ ok: false, text: res.message });
                    setTimeout(async () => {
                      setShowRenameModal(false);
                      await handleSignOut();
                    }, 3000);
                  } else {
                    setRenameMsg({ ok: res.ok, text: res.message });
                  }
                }}
                style={{
                  paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6,
                  backgroundColor: theme.primary,
                  opacity: (renameLoading || renameInput.trim().length === 0) ? 0.5 : 1,
                }}>
                {renameLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={{ fontSize: 13, color: '#fff', fontWeight: '700' }}>确认改名</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* 删除存档确认弹窗 */}
      {showDeleteConfirm && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: theme.cardBg, padding: 24, width: '82%', borderTopWidth: 3, borderTopColor: '#C82829' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#C82829', marginBottom: 8 }}>⚠️ 删除存档</Text>
            <Text style={{ fontSize: 13, color: theme.labelText, lineHeight: 20, marginBottom: 20 }}>
              此操作将永久删除当前存档及所有游戏数据，无法恢复。确认删除？
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => setShowDeleteConfirm(false)}
                style={{ flex: 1, paddingVertical: 11, borderWidth: 1, borderColor: theme.cardBorder, alignItems: 'center' }}
              >
                <Text style={{ color: theme.labelText, fontSize: 14, fontWeight: '600' }}>取消</Text>
              </Pressable>
              <Pressable
                onPress={handleDeleteSave}
                disabled={deletingArchive}
                style={{ flex: 1, paddingVertical: 11, backgroundColor: '#C82829', alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                  {deletingArchive ? '删除中…' : '确认删除'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* 下属拜访弹窗 */}
      {visitModal && save.subVisitSubName && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: theme.cardBg, padding: 22, width: '82%', borderTopWidth: 3, borderTopColor: theme.accentSub }}>
            <Text style={{ fontSize: 18, textAlign: 'center', marginBottom: 8 }}>🤝</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.sectionHeaderText, marginBottom: 6, textAlign: 'center' }}>
              下属来访
            </Text>
            <Text style={{ fontSize: 13, color: theme.labelText, lineHeight: 20, marginBottom: 18, textAlign: 'center' }}>
              {save.subVisitSubName} 前来拜访，希望加深与您的关系。是否接待？
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => handleVisitResponse(false)}
                style={{ flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: theme.cardBorder, alignItems: 'center' }}
              >
                <Text style={{ color: theme.mutedText, fontSize: 13 }}>婉拒</Text>
              </Pressable>
              <Pressable
                onPress={() => handleVisitResponse(true)}
                style={{ flex: 1, paddingVertical: 10, backgroundColor: theme.accentSub, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>热情接待（+忠诚）</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* 月度工作报告弹窗 */}
      {showReportModal && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: theme.cardBg, width: '90%', maxHeight: '75%' }}>
            <View style={{ backgroundColor: theme.headerBg, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: theme.headerText, fontWeight: '700', fontSize: 15 }}>📋 月度工作报告</Text>
              <Pressable onPress={async () => {
                if (save) {
                  const monthKey = Math.floor(save.gameDays / 30);
                  await markReportsRead(save.id, monthKey);
                  clearUnreadReports();
                }
                setShowReportModal(false);
              }}>
                <Text style={{ color: theme.headerSub, fontSize: 22 }}>×</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }}>
              {unreadReports.length === 0 ? (
                <Text style={{ color: theme.mutedText, textAlign: 'center', padding: 20 }}>暂无新报告</Text>
              ) : unreadReports.map(r => (
                <View key={r.id} style={{ borderWidth: 1, borderColor: theme.cardBorder, borderLeftWidth: 3, borderLeftColor: theme.accentSub, padding: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.sectionHeaderText, marginBottom: 4 }}>{r.title}</Text>
                  <Text style={{ fontSize: 11, color: theme.labelText, lineHeight: 18, marginBottom: 8 }}>{r.content}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {r.gdpChange > 0 && <View style={{ backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontSize: 10, color: '#2a7a3b' }}>GDP +{r.gdpChange.toFixed(1)}</Text></View>}
                    {r.livelihoodChange > 0 && <View style={{ backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontSize: 10, color: '#2a7a3b' }}>民生 +{r.livelihoodChange.toFixed(1)}</Text></View>}
                    {r.ecologyChange > 0 && <View style={{ backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontSize: 10, color: '#2a7a3b' }}>生态 +{r.ecologyChange.toFixed(1)}</Text></View>}
                    {r.businessChange > 0 && <View style={{ backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontSize: 10, color: '#2a7a3b' }}>营商 +{r.businessChange.toFixed(1)}</Text></View>}
                    <View style={{ backgroundColor: theme.sectionHeaderBg, paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontSize: 10, color: theme.sectionHeaderText }}>政绩 +{r.meritReward}</Text></View>
                  </View>
                </View>
              ))}
            </ScrollView>
            <Pressable
              onPress={async () => {
                if (save) {
                  const monthKey = Math.floor(save.gameDays / 30);
                  await markReportsRead(save.id, monthKey);
                  clearUnreadReports();
                }
                setShowReportModal(false);
                router.push('/(app)/monthly-report');
              }}
              style={{ backgroundColor: theme.headerBg, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: theme.headerText, fontWeight: '700', fontSize: 13 }}>查看全部报告 ›</Text>
            </Pressable>
          </View>
        </View>
      )}
      {/* 月度会议任务结算通知条 */}
      {!!meetingTaskFeedback && (
        <Pressable
          onPress={clearMeetingTaskFeedback}
          style={{ position: 'absolute', bottom: 80, left: 16, right: 16, backgroundColor: theme.headerBg, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderLeftWidth: 3, borderLeftColor: theme.accent }}
        >
          <Text style={{ color: theme.headerText, fontSize: 12, flex: 1, lineHeight: 18 }}>{meetingTaskFeedback}</Text>
          <Text style={{ color: theme.headerSub, fontSize: 16 }}>×</Text>
        </Pressable>
      )}

      {/* 上级来访考察弹窗 */}
      {upperInspectEvent && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: theme.cardBg, width: '90%' }}>
            {/* 标题 */}
            <View style={{
              backgroundColor: upperInspectEvent.result === 'excellent' ? '#1a4a2e' :
                upperInspectEvent.result === 'good' ? theme.headerBg :
                upperInspectEvent.result === 'pass' ? '#5a4010' : '#7a1a1a',
              padding: 14,
            }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, letterSpacing: 2 }}>上级单位 · 来访考察</Text>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, marginTop: 2 }}>
                {upperInspectEvent.result === 'excellent' ? '🏅' :
                  upperInspectEvent.result === 'good' ? '📋' :
                  upperInspectEvent.result === 'pass' ? '⚠️' : '🚨'} {upperInspectEvent.resultLabel}
              </Text>
            </View>
            {/* 考察官信息 */}
            <View style={{ padding: 14, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.cardBorder }}>
                <View style={{ width: 44, height: 44, backgroundColor: theme.accentSub, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 22 }}>👔</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: theme.sectionHeaderText }}>{upperInspectEvent.inspectorName}</Text>
                  <Text style={{ fontSize: 11, color: theme.mutedText, marginTop: 2 }}>{upperInspectEvent.inspectorTitle}</Text>
                </View>
                <View style={{ marginLeft: 'auto' }}>
                  <View style={{ backgroundColor: theme.sectionHeaderBg, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 10, color: theme.sectionHeaderText, fontWeight: '600' }}>考察重点：{upperInspectEvent.focusLabel}</Text>
                  </View>
                </View>
              </View>
              {/* 考察意见 */}
              <Text style={{ fontSize: 13, color: theme.labelText, lineHeight: 20, paddingLeft: 4, borderLeftWidth: 2, borderLeftColor: upperInspectEvent.result === 'fail' ? theme.statLow : theme.accentSub }}>
                {upperInspectEvent.comment}
              </Text>
              {/* 奖惩结果 */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1, backgroundColor: upperInspectEvent.meritDelta >= 0 ? '#e8f5e9' : '#fff5f5', padding: 10, alignItems: 'center', borderWidth: 1, borderColor: upperInspectEvent.meritDelta >= 0 ? '#c8e6c9' : '#ffcdd2' }}>
                  <Text style={{ fontSize: 10, color: theme.mutedText }}>政绩变动</Text>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: upperInspectEvent.meritDelta >= 0 ? '#2a7a3b' : '#C82829', marginTop: 2 }}>
                    {upperInspectEvent.meritDelta >= 0 ? '+' : ''}{upperInspectEvent.meritDelta}
                  </Text>
                </View>
                <View style={{ flex: 1, backgroundColor: upperInspectEvent.favorDelta >= 0 ? '#e8f5e9' : '#fff5f5', padding: 10, alignItems: 'center', borderWidth: 1, borderColor: upperInspectEvent.favorDelta >= 0 ? '#c8e6c9' : '#ffcdd2' }}>
                  <Text style={{ fontSize: 10, color: theme.mutedText }}>上司好感</Text>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: upperInspectEvent.favorDelta >= 0 ? '#2a7a3b' : '#C82829', marginTop: 2 }}>
                    {upperInspectEvent.favorDelta >= 0 ? '+' : ''}{upperInspectEvent.favorDelta}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => clearUpperInspectEvent()}
                style={{ backgroundColor: theme.headerBg, paddingVertical: 12, alignItems: 'center', marginTop: 4 }}
              >
                <Text style={{ color: theme.headerText, fontWeight: '700', fontSize: 13 }}>收悉考察结果</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

