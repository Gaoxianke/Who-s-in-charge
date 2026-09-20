// 城市金融页面
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getOrCreateFinance, applyLoan, startInvestment, establishInvestGroup } from '@/db/gameApi';
import type { CityFinance, LoanRecord, InvestmentRecord } from '@/types/game';
import { LOAN_TEMPLATES, INVEST_TEMPLATES, gameDaysToDate, formatFund } from '@/types/game';

type Tab = 'overview' | 'loan' | 'invest';

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f0f0f0' }}>
      <Text style={{ fontSize: 12, color: '#555' }}>{label}</Text>
      <Text style={{ fontSize: 12, fontWeight: '700', color: color ?? '#222', fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
}

export default function FinancePage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave, refreshSave } = useGame();
  const [tab, setTab] = useState<Tab>('overview');
  const [finance, setFinance] = useState<CityFinance | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [actionOk, setActionOk] = useState(false);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    if (!save) return;
    setLoading(true);
    const f = await getOrCreateFinance(save.id, save.userId);
    setFinance(f);
    setLoading(false);
  }, [save]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (!save) return null;

  const handleLoan = async (idx: number) => {
    if (!save || !finance) return;
    const tpl = LOAN_TEMPLATES[idx];
    if (!tpl) return;
    setActing(true);
    setActionMsg('');
    const loan: LoanRecord = {
      id: `loan_${Date.now()}`,
      amount: tpl.amount,
      rate: tpl.rateYearly,
      startDay: save.gameDays,
      dueDay: save.gameDays + tpl.durationDays,
      monthlyPay: Math.round(tpl.amount * tpl.rateYearly / 12 * 10) / 10 + Math.round(tpl.amount / (tpl.durationDays / 30) * 10) / 10,
      status: 'active',
    };
    const ok = await applyLoan(save.id, loan);
    if (ok) {
      await updateGameSave({ fundBalance: save.fundBalance + tpl.amount });
      await load();
      await refreshSave();
      setActionMsg(`成功获得 ${tpl.amount} 万元贷款`);
      setActionOk(true);
    } else {
      setActionMsg('申请失败，请重试');
      setActionOk(false);
    }
    setActing(false);
  };

  const handleInvest = async (idx: number) => {
    if (!save || !finance) return;
    const tpl = INVEST_TEMPLATES[idx];
    if (!tpl) return;
    if ((save.fundBalance) < tpl.amount) {
      setActionMsg(`资金不足，需 ${tpl.amount} 万元`);
      setActionOk(false);
      return;
    }
    if (!finance.investGroupEstDay) {
      setActionMsg('请先成立城市投资集团');
      setActionOk(false);
      return;
    }
    setActing(true);
    setActionMsg('');
    const inv: InvestmentRecord = {
      id: `inv_${Date.now()}`,
      name: tpl.name,
      amount: tpl.amount,
      startDay: save.gameDays,
      endDay: save.gameDays + tpl.durationDays,
      effectType: tpl.effectType,
      effectValue: tpl.effectValue,
      status: 'running',
    };
    const ok = await startInvestment(save.id, inv);
    if (ok) {
      // startInvestment 已同步扣减资金余额，此处仅刷新界面
      await load();
      await refreshSave();
      setActionMsg(`${tpl.name} 已启动`);
      setActionOk(true);
    } else {
      setActionMsg('资金不足或投资失败，请重试');
      setActionOk(false);
    }
    setActing(false);
  };

  const handleEstablishGroup = async () => {
    if (!save || !finance) return;
    if (finance.investGroupEstDay) return;
    setActing(true);
    const ok = await establishInvestGroup(save.id, save.gameDays);
    if (ok) { await load(); setActionMsg('投资集团已成立，可在全国范围开展投资'); setActionOk(true); }
    else { setActionMsg('成立失败，请重试'); setActionOk(false); }
    setActing(false);
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: '资金概览' },
    { key: 'loan',     label: '银行贷款' },
    { key: 'invest',   label: '招商投资' },
  ];

  const activeLoans  = finance?.loans.filter(l => l.status === 'active') ?? [];
  const runningInvs  = finance?.investments.filter(i => i.status === 'running') ?? [];
  const doneInvs     = finance?.investments.filter(i => i.status === 'done') ?? [];

  // 计算在运投资预计总盈利（基于profitRate）
  const totalEstimatedProfit = runningInvs.reduce((acc, inv) => {
    const tpl = INVEST_TEMPLATES.find(t => t.name === inv.name);
    if (!tpl) return acc;
    const durationYears = tpl.durationDays / 365;
    return acc + Math.round(inv.amount * tpl.profitRate * durationYears);
  }, 0);

  // 月均资金收入（贷款利息成本）
  const monthlyLoanCost = activeLoans.reduce((acc, l) => acc + l.monthlyPay, 0);

  const rankLevel = save?.rankLevel ?? 1;
  const isNationalScope = rankLevel >= 12;

  // 贷款按职级匹配：小额→乡镇(1-3)，县域→县级(4-6)，城市债→市级(7-9)，省级→省级+(10+)
  const loanLevelMap = [3, 6, 9, 99]; // LOAN_TEMPLATES[i] 适用的最大职级
  const availableLoans = LOAN_TEMPLATES.map((tpl, i) => {
    const minRank = i === 0 ? 1 : i === 1 ? 4 : i === 2 ? 7 : 10;
    const maxRank = loanLevelMap[i];
    return { tpl, idx: i, minRank, maxRank, available: rankLevel >= minRank && rankLevel <= maxRank };
  });

  // 招商投资按 minRank/maxRank 过滤
  const availableInvests = INVEST_TEMPLATES.map((tpl, i) => ({
    tpl, idx: i,
    available: rankLevel >= tpl.minRank && (tpl.maxRank === -1 || rankLevel <= tpl.maxRank),
  }));

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      <View style={{ backgroundColor: '#2B4B6F', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>
            {isNationalScope ? '国家发展改革委' : '金融局'}
          </Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>
            {isNationalScope ? '国家金融投资' : '城市金融'}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10 }}>{save?.rankName}</Text>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600', marginTop: 1 }}>
            {isNationalScope ? '全国范围' : save?.cityName}
          </Text>
        </View>
      </View>

      {/* 国政院级别全国范围横幅 */}
      {isNationalScope && (
        <View style={{ backgroundColor: '#C82829', paddingVertical: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 14 }}>🏦</Text>
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', flex: 1 }}>
            国家级金融调控 · 覆盖全国所有城市
          </Text>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ color: '#fff', fontSize: 9 }}>全国</Text>
          </View>
        </View>
      )}

      {/* Tab */}
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#D1D1CF' }}>
        {TABS.map(t => (
          <Pressable
            key={t.key}
            onPress={() => { setTab(t.key); setActionMsg(''); }}
            style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderColor: tab === t.key ? '#C82829' : 'transparent' }}
          >
            <Text style={{ fontSize: 13, color: tab === t.key ? '#C82829' : '#888', fontWeight: tab === t.key ? '700' : '400' }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#1D3B5E" />
        </View>
      ) : (
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 16, gap: 14 }}>
          {/* 消息提示 */}
          {actionMsg ? (
            <View style={{ backgroundColor: actionOk ? '#f0faf3' : '#fff5f5', borderWidth: 1, borderColor: actionOk ? '#2a7a3b' : '#C82829', padding: 10 }}>
              <Text style={{ fontSize: 12, color: actionOk ? '#2a7a3b' : '#C82829' }}>{actionMsg}</Text>
            </View>
          ) : null}

          {/* 概览 */}
          {tab === 'overview' && (
            <>
              {/* 资金主卡 */}
              <View style={{ backgroundColor: '#2B4B6F', padding: 16 }}>
                <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>
                  {isNationalScope ? '国家可调配资金' : '城市可用资金'}
                </Text>
                <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700', marginTop: 4, fontVariant: ['tabular-nums'] }}>
                  {formatFund(save?.fundBalance ?? 0)}
                </Text>
                <View style={{ flexDirection: 'row', gap: 20, marginTop: 10 }}>
                  <View>
                    <Text style={{ color: '#a0b4cc', fontSize: 9 }}>月贷款支出</Text>
                    <Text style={{ color: '#FF8A80', fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                      -{monthlyLoanCost.toFixed(0)} 万
                    </Text>
                  </View>
                  <View>
                    <Text style={{ color: '#a0b4cc', fontSize: 9 }}>在运投资预计盈利</Text>
                    <Text style={{ color: '#69F0AE', fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                      +{totalEstimatedProfit.toLocaleString()} 万
                    </Text>
                  </View>
                  <View>
                    <Text style={{ color: '#a0b4cc', fontSize: 9 }}>税收指数</Text>
                    <Text style={{ color: '#69F0AE', fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                      {save.taxRevenue ?? 0}
                    </Text>
                  </View>
                </View>
              </View>

              {/* 财务状况 */}
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
                <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 8 }}>财务状况</Text>
                <StatRow label="可用资金余额" value={formatFund(save?.fundBalance ?? 0)} color="#1D3B5E" />
                <StatRow label="未偿还贷款" value={formatFund(finance?.debtTotal ?? 0)} color={((finance?.debtTotal ?? 0) > 0) ? '#C82829' : '#888'} />
                <StatRow label="活跃贷款数" value={`${activeLoans.length} 笔`} />
                <StatRow label="在运投资项目" value={`${runningInvs.length} 项`} color="#2a7a3b" />
                <StatRow label="已完成投资" value={`${doneInvs.length} 项`} color="#888" />
                <StatRow label="城市税收指数" value={`${save.taxRevenue ?? 0} 点`} color="#1D3B5E" />
                <StatRow label="投资集团" value={finance?.investGroupEstDay ? `✓ 已成立（第${finance.investGroupEstDay}天）` : '未成立'} color={finance?.investGroupEstDay ? '#2a7a3b' : '#888'} />
              </View>

              {/* 投资盈利明细 */}
              {runningInvs.length > 0 && (
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
                  <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 8 }}>📈 投资盈利预测</Text>
                  {runningInvs.map(inv => {
                    const tpl = INVEST_TEMPLATES.find(t => t.name === inv.name);
                    const profitRate = tpl?.profitRate ?? 0.10;
                    const durationYears = tpl ? tpl.durationDays / 365 : 1;
                    const estProfit = Math.round(inv.amount * profitRate * durationYears);
                    return (
                      <View key={inv.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f0f0f0' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#222' }}>{inv.name}</Text>
                          <Text style={{ fontSize: 12, color: '#2a7a3b', fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                            预计盈利 +{estProfit.toLocaleString()} 万
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 11, color: '#888' }}>
                            投入 {inv.amount.toLocaleString()} 万　年化 {((profitRate) * 100).toFixed(0)}%
                          </Text>
                          <Text style={{ fontSize: 11, color: '#888' }}>到期 {gameDaysToDate(inv.endDay)}</Text>
                        </View>
                      </View>
                    );
                  })}
                  <View style={{ marginTop: 8, backgroundColor: '#f0faf3', padding: 10 }}>
                    <Text style={{ fontSize: 11, color: '#2a7a3b' }}>
                      合计预期盈利：<Text style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>+{totalEstimatedProfit.toLocaleString()} 万元</Text>
                    </Text>
                  </View>
                </View>
              )}

              {/* 贷款还款计划 */}
              {activeLoans.length > 0 && (
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
                  <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 8 }}>💳 贷款还款计划</Text>
                  {activeLoans.map(l => (
                    <View key={l.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f0f0f0' }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12, color: '#333' }}>本金 <Text style={{ fontWeight: '700' }}>{l.amount.toLocaleString()} 万元</Text></Text>
                        <Text style={{ fontSize: 11, color: '#C82829', fontWeight: '700' }}>月供 {l.monthlyPay.toFixed(1)} 万元</Text>
                      </View>
                      <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                        到期：{gameDaysToDate(l.dueDay)}　年利率：{(l.rate * 100).toFixed(1)}%
                      </Text>
                    </View>
                  ))}
                  <View style={{ marginTop: 8, backgroundColor: '#fff5f5', padding: 10 }}>
                    <Text style={{ fontSize: 11, color: '#C82829' }}>
                      每月总还款：<Text style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>{monthlyLoanCost.toFixed(1)} 万元</Text>
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}

          {/* 银行贷款 */}
          {tab === 'loan' && (
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
              <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 12 }}>
                {isNationalScope ? '可申请国家专项债券/主权债务' : '可申请政策性贷款'}
              </Text>
              {availableLoans.map(({ tpl, idx, available }) => (
                <View key={idx} style={{ borderWidth: 1, borderColor: available ? '#D1D1CF' : '#e8e8e8', padding: 12, marginBottom: 10, backgroundColor: available ? '#fafafa' : '#f5f5f5', opacity: available ? 1 : 0.5 }}>
                  {!available && (
                    <View style={{ backgroundColor: '#888', paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 6 }}>
                      <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>职级不符</Text>
                    </View>
                  )}
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#2B4B6F', marginBottom: 4 }}>{tpl.name}</Text>
                  <Text style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>{tpl.desc}</Text>
                  <View style={{ flexDirection: 'row', gap: 16, marginBottom: 10 }}>
                    <Text style={{ fontSize: 11, color: '#333' }}>额度 <Text style={{ fontWeight: '700' }}>{tpl.amount.toLocaleString()} 万</Text></Text>
                    <Text style={{ fontSize: 11, color: '#333' }}>利率 <Text style={{ fontWeight: '700' }}>{(tpl.rateYearly * 100).toFixed(1)}%</Text></Text>
                    <Text style={{ fontSize: 11, color: '#333' }}>期限 <Text style={{ fontWeight: '700' }}>{Math.round(tpl.durationDays / 365)} 年</Text></Text>
                  </View>
                  <Pressable
                    onPress={() => void handleLoan(idx)}
                    disabled={acting || !available}
                    style={{ backgroundColor: available ? '#2B4B6F' : '#ccc', padding: 10, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{available ? '申请贷款' : '职级不足'}</Text>
                  </Pressable>
                </View>
              ))}
              <Text style={{ fontSize: 11, color: '#888', lineHeight: 18, marginTop: 4 }}>
                注意：贷款需按月偿还，逾期将降低考评等级和政绩值
              </Text>
            </View>
          )}

          {/* 招商投资 */}
          {tab === 'invest' && (
            <>
              {!finance?.investGroupEstDay ? (
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 16, alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 14, color: '#333', fontWeight: '700' }}>
                    {isNationalScope ? '成立国家战略投资基金' : '成立城市投资集团'}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#888', textAlign: 'center' }}>
                    {isNationalScope
                      ? '成立国家战略投资基金后，可在全国范围开展重大投资布局，定期获得GDP和营商环境指数收益'
                      : '成立城市投资集团后，可开展招商引资项目，定期获得GDP和营商环境指数收益'}
                  </Text>
                  <Pressable onPress={() => void handleEstablishGroup()} disabled={acting} style={{ backgroundColor: '#C82829', paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 }}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>立即成立</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={{ backgroundColor: '#2a7a3b', padding: 12 }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                      {isNationalScope ? '国家战略投资基金' : '城市投资集团'}　成立于 {gameDaysToDate(finance.investGroupEstDay)}
                    </Text>
                    <Text style={{ color: '#c8f0d0', fontSize: 11, marginTop: 3 }}>在运项目 {runningInvs.length} 项　可用资金 {(save?.fundBalance ?? 0).toLocaleString()} 万元</Text>
                  </View>
                  <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
                    <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 12 }}>招商引资项目</Text>
                    {availableInvests.map(({ tpl, idx, available }) => {
                      const durationYears = tpl.durationDays / 365;
                      const estProfit = Math.round(tpl.amount * tpl.profitRate * durationYears);
                      const roi = (tpl.profitRate * durationYears * 100).toFixed(0);
                      const isRunning = runningInvs.some(r => r.name === tpl.name);
                      const canAfford = (save?.fundBalance ?? 0) >= tpl.amount;
                      return (
                        <View key={idx} style={{ borderWidth: 1, borderColor: isRunning ? '#c8e6c9' : available ? '#D1D1CF' : '#e8e8e8', padding: 12, marginBottom: 10, backgroundColor: isRunning ? '#f0faf3' : available ? '#fafafa' : '#f5f5f5', opacity: available ? 1 : 0.5 }}>
                          {!available && (
                            <View style={{ backgroundColor: '#888', paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 6 }}>
                              <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>职级不符</Text>
                            </View>
                          )}
                          {isRunning && (
                            <View style={{ backgroundColor: '#2a7a3b', paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 6 }}>
                              <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>进行中</Text>
                            </View>
                          )}
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#222', marginBottom: 4 }}>{tpl.name}</Text>
                          <Text style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>{tpl.desc}</Text>
                          {/* 投资数据行 */}
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                            <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 10, paddingVertical: 5 }}>
                              <Text style={{ fontSize: 9, color: '#888' }}>投入资金</Text>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#C82829', fontVariant: ['tabular-nums'] }}>{tpl.amount.toLocaleString()} 万</Text>
                            </View>
                            <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 10, paddingVertical: 5 }}>
                              <Text style={{ fontSize: 9, color: '#888' }}>投资周期</Text>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#222' }}>{Math.round(tpl.durationDays / 30)} 个月</Text>
                            </View>
                            <View style={{ backgroundColor: '#e8f5e9', paddingHorizontal: 10, paddingVertical: 5 }}>
                              <Text style={{ fontSize: 9, color: '#888' }}>年化盈利率</Text>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#2a7a3b' }}>{(tpl.profitRate * 100).toFixed(0)}%</Text>
                            </View>
                            <View style={{ backgroundColor: '#e8f5e9', paddingHorizontal: 10, paddingVertical: 5 }}>
                              <Text style={{ fontSize: 9, color: '#888' }}>预计盈利</Text>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#2a7a3b', fontVariant: ['tabular-nums'] }}>+{estProfit.toLocaleString()} 万</Text>
                            </View>
                            <View style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 10, paddingVertical: 5 }}>
                              <Text style={{ fontSize: 9, color: '#888' }}>ROI</Text>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#7A5C00' }}>{roi}%</Text>
                            </View>
                          </View>
                          {/* 城市效益 */}
                          <Text style={{ fontSize: 10, color: '#888', marginBottom: 8 }}>
                            到期城市效益：
                            <Text style={{ color: '#2B4B6F', fontWeight: '600' }}>
                              {tpl.effectType === 'gdp' ? 'GDP' : tpl.effectType === 'business' ? '营商' : tpl.effectType === 'livelihood' ? '民生' : '生态'} +{tpl.effectValue} 点
                            </Text>
                          </Text>
                          <Pressable
                            onPress={() => void handleInvest(idx)}
                            disabled={acting || !canAfford || isRunning || !available}
                            style={{ backgroundColor: isRunning || !available ? '#ccc' : canAfford ? '#2B4B6F' : '#ccc', padding: 10, alignItems: 'center' }}
                          >
                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                              {!available ? '职级不足' : isRunning ? '项目进行中' : canAfford ? '启动投资项目' : `资金不足（差 ${(tpl.amount - (save?.fundBalance ?? 0)).toLocaleString()} 万）`}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                  {runningInvs.length > 0 && (
                    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
                      <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 8 }}>在运项目</Text>
                      {runningInvs.map(inv => (
                        <View key={inv.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f0f0f0' }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12, color: '#333', fontWeight: '600' }}>{inv.name}</Text>
                            <Text style={{ fontSize: 11, color: '#2a7a3b' }}>到期+{inv.effectValue}点</Text>
                          </View>
                          <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>到期：{gameDaysToDate(inv.endDay)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </>
          )}

          {acting && <ActivityIndicator color="#1D3B5E" />}
        </ScrollView>
      )}
    </View>
  );
}
