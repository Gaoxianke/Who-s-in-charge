// 个人财富页面 —— 工资条、公积金、补贴、资产购置
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { updateSave } from '@/db/gameApi';
import {
  RANK_SALARY,
  RANK_GROSS_SALARY,
  RANK_PERSONAL_SOCIAL_INSURANCE,
  RANK_PERSONAL_HPF,
  RANK_MONTHLY_ALLOWANCE,
  RANK_ALLOWANCE_DETAIL,
  RANK_ANNUAL_BONUS_MONTHS,
  RANK_HOUSING,
  PURCHASABLE_ITEMS,
  RANK_CONFIG,
} from '@/types/game';
import type { PurchasableItem } from '@/types/game';
import { IllicitFundsTab } from '@/components/IllicitFundsTab';

// ── 格式化金额 ──────────────────────────────────────────────
function fmtMoney(yuan: number): string {
  if (yuan >= 100000000) return `${(yuan / 100000000).toFixed(2)} 亿元`;
  if (yuan >= 10000) return `${(yuan / 10000).toFixed(1)} 万元`;
  return `${yuan.toLocaleString()} 元`;
}
function fmtMoneyShort(yuan: number): string {
  if (yuan >= 100000000) return `${(yuan / 100000000).toFixed(1)}亿`;
  if (yuan >= 10000) return `${(yuan / 10000).toFixed(1)}万`;
  return `${yuan.toLocaleString()}元`;
}

const CATEGORY_EMOJI: Record<string, string> = {
  出行: '🚗', 房产: '🏠', 投资: '📈', 进修: '🎓', 生活: '🌿', 礼品: '🎁',
};
const CATEGORY_COLOR: Record<string, string> = {
  出行: '#2B4B6F', 房产: '#1D5C36', 投资: '#7C3AED', 进修: '#C05521', 生活: '#2563EB', 礼品: '#C82829',
};
const ALL_CATEGORIES = ['出行', '房产', '投资', '进修', '生活', '礼品'] as const;

// ── 工资条行组件 ────────────────────────────────────────────
function PayRow({
  label, amount, color = '#1A1A1A', bold = false, isDeduct = false, sub = false,
}: { label: string; amount: number; color?: string; bold?: boolean; isDeduct?: boolean; sub?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
      <Text style={{ fontSize: sub ? 10 : 11, color: sub ? '#888' : '#555', paddingLeft: sub ? 8 : 0 }}>
        {sub ? '· ' : ''}{label}
      </Text>
      <Text style={{
        fontSize: sub ? 10 : 11, fontFamily: 'monospace', fontWeight: bold ? '700' : '400',
        color: isDeduct ? '#C05521' : color,
      }}>
        {isDeduct ? '-' : '+'}{fmtMoney(amount)}
      </Text>
    </View>
  );
}

// ── 卡片容器 ───────────────────────────────────────────────
function Card({ headerColor, headerText, emoji, tag, children }: {
  headerColor: string; headerText: string; emoji: string; tag?: string; children: React.ReactNode;
}) {
  return (
    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', borderRadius: 2, overflow: 'hidden' }}>
      <View style={{ backgroundColor: headerColor, paddingHorizontal: 14, paddingVertical: 9, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 2 }}>{emoji} {headerText}</Text>
        {tag ? <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 9 }}>{tag}</Text> : null}
      </View>
      <View style={{ padding: 14 }}>{children}</View>
    </View>
  );
}

// ── 主页面 ─────────────────────────────────────────────────
export default function PersonalWealthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, refreshSave } = useGame();
  const [activeCategory, setActiveCategory] = useState<string>('全部');
  const [buyingKey, setBuyingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [showConfirm, setShowConfirm] = useState<PurchasableItem | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'shop' | 'illicit'>('overview');
  const [transferAmount, setTransferAmount] = useState<string>('500');
  const [transferBusy, setTransferBusy] = useState<boolean>(false);
  const [transferMsg, setTransferMsg] = useState<{ msg: string; ok: boolean } | null>(null);

  // ── 资金划拨逻辑（现金存款 ⇄ 个人资金 1:1 互转）──
  const handleTransferFunds = async (direction: 'to_funds' | 'to_savings', customAmt?: number) => {
    if (!save) return;
    const amt = customAmt !== undefined ? customAmt : parseInt(transferAmount, 10);
    if (isNaN(amt) || amt <= 0) {
      setTransferMsg({ msg: '⚠️ 请输入有效划拨金额', ok: false });
      setTimeout(() => setTransferMsg(null), 2500);
      return;
    }

    const currentSavings = save.personalSavings ?? 0;
    const currentFunds = save.silver ?? 0;

    if (direction === 'to_funds') {
      if (currentSavings < amt) {
        setTransferMsg({ msg: `⚠️ 现金存款不足（现有 ${fmtMoneyShort(currentSavings)}）`, ok: false });
        setTimeout(() => setTransferMsg(null), 2500);
        return;
      }
      setTransferBusy(true);
      try {
        await updateSave(save.id, {
          personalSavings: currentSavings - amt,
          silver: currentFunds + amt,
        });
        await refreshSave();
        setTransferMsg({ msg: `✅ 成功划拨 ${amt} 元至个人资金`, ok: true });
      } catch {
        setTransferMsg({ msg: '⚠️ 划拨失败，请重试', ok: false });
      } finally {
        setTransferBusy(false);
        setTimeout(() => setTransferMsg(null), 2500);
      }
    } else {
      if (currentFunds < amt) {
        setTransferMsg({ msg: `⚠️ 个人资金不足（现有 ${currentFunds} 元）`, ok: false });
        setTimeout(() => setTransferMsg(null), 2500);
        return;
      }
      setTransferBusy(true);
      try {
        await updateSave(save.id, {
          personalSavings: currentSavings + amt,
          silver: currentFunds - amt,
        });
        await refreshSave();
        setTransferMsg({ msg: `✅ 成功提回 ${amt} 元至现金存款`, ok: true });
      } catch {
        setTransferMsg({ msg: '⚠️ 提回失败，请重试', ok: false });
      } finally {
        setTransferBusy(false);
        setTimeout(() => setTransferMsg(null), 2500);
      }
    }
  };

  useFocusEffect(useCallback(() => { refreshSave(); }, [refreshSave]));

  if (!save) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F4F1' }}>
        <ActivityIndicator color="#C82829" />
      </View>
    );
  }

  const rankLevel = save.rankLevel;
  const rankCfg = RANK_CONFIG[rankLevel];
  // ── 工资条数据 ──
  const grossSalary = RANK_GROSS_SALARY[rankLevel] ?? 8000;
  const personalSI = RANK_PERSONAL_SOCIAL_INSURANCE[rankLevel] ?? 714;
  const personalHpf = RANK_PERSONAL_HPF[rankLevel] ?? 816;
  const netSalary = RANK_SALARY[rankLevel] ?? 5500;
  // 个税（倒算：应发 - 社保 - 公积金个人 - 税后 = 个税）
  const incomeTax = Math.max(0, grossSalary - personalSI - personalHpf - netSalary);

  const monthlyAllowance = RANK_MONTHLY_ALLOWANCE[rankLevel] ?? 500;
  const allowanceDetail = RANK_ALLOWANCE_DETAIL[rankLevel] ?? [];
  // 公积金：单位同等缴存，账户每月到账 = 个人+单位
  const unitHpf = personalHpf;
  const monthlyHpfTotal = personalHpf + unitHpf;
  // 月度实际到手（工资+补贴；公积金归入独立账户）
  const monthlyTakeHome = netSalary + monthlyAllowance;

  // 年终奖估算（称职基准）
  const bonusMonths = RANK_ANNUAL_BONUS_MONTHS[rankLevel] ?? 1.0;
  const estimatedAnnualBonus = Math.round(netSalary * bonusMonths);
  const estimatedAnnualBonusExcellent = Math.round(netSalary * bonusMonths * 1.2);

  // ── 资产数据 ──
  const savings = save.personalSavings ?? 0;
  const personalFunds = save.silver ?? 0;
  const hpfBalance = save.providentFundBalance ?? 0;
  const assets: string[] = save.personalAssets ?? [];
  const housing = RANK_HOUSING[rankLevel] ?? null;

  // 已购置资产市值估算（原价×保值系数）
  const ownedItems = PURCHASABLE_ITEMS.filter(i => assets.includes(i.key));
  const assetValue = ownedItems.reduce((acc, i) => {
    const retainRate = i.category === '房产' ? 1.15 : i.category === '出行' ? 0.7 : i.category === '投资' ? 1.0 : 0.5;
    return acc + Math.round(i.price * retainRate);
  }, 0);
  const totalNetWorth = savings + hpfBalance + assetValue + personalFunds;

  // 月度投资估算收益
  const investMonthlyEst = ownedItems
    .filter(i => i.isMonthlyReturn)
    .reduce((acc, i) => {
      const prices: Record<string, number> = { stock_small: 50000, stock_medium: 200000, fund_invest: 100000 };
      return acc + Math.round((prices[i.key] ?? 0) * (i.monthlyReturnRate ?? 0));
    }, 0);

  // ── 购物筛选 ──
  const filteredItems = PURCHASABLE_ITEMS.filter(item => {
    if (activeCategory !== '全部' && item.category !== activeCategory) return false;
    if (item.isMonthlyReturn) return true;
    return !assets.includes(item.key);
  });

  // ── 购买逻辑 ──
  const handleBuy = async (item: PurchasableItem) => {
    if (!save) return;
    if (savings < item.price) {
      setFeedback({ msg: '💳 余额不足，无法购买', ok: false });
      setTimeout(() => setFeedback(null), 2500);
      return;
    }
    setBuyingKey(item.key);
    setShowConfirm(null);
    try {
      await updateSave(save.id, {
        personalSavings: savings - item.price,
        personalAssets: [...assets, item.key],
        meritPoints: Math.max(0, Math.round((save.meritPoints + (item.meritBonus ?? 0)) * 10) / 10),
        moralValue: Math.min(100, Math.max(0, save.moralValue + (item.moralBonus ?? 0))),
        bossFavor: Math.min(100, Math.max(0, save.bossFavor + (item.bossFavorBonus ?? 0))),
      });
      await refreshSave();
      setFeedback({ msg: `✅ 已购置：${item.name}`, ok: true });
    } catch {
      setFeedback({ msg: '⚠️ 购买失败，请重试', ok: false });
    } finally {
      setBuyingKey(null);
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  // ── 辅助：分割线 ──
  const Divider = () => <View style={{ height: 1, backgroundColor: '#F0EDE8', marginVertical: 6 }} />;

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      <StatusBar style="dark" />

      {/* ── 标题栏 ── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderBottomWidth: 2, borderBottomColor: '#C82829',
        paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16,
      }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ fontSize: 18, color: '#C82829' }}>←</Text>
        </Pressable>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A', letterSpacing: 3, flex: 1 }}>
          个人财富管理
        </Text>
        <Text style={{ fontSize: 10, color: '#888' }}>{rankCfg?.name ?? '-'}</Text>
      </View>

      {/* ── Tab切换 ── */}
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8E5E0' }}>
        {(['overview', 'shop', 'illicit'] as const).map(tab => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={{
              flex: 1, paddingVertical: 11, alignItems: 'center',
              borderBottomWidth: 2,
              borderBottomColor: activeTab === tab ? '#C82829' : 'transparent',
            }}>
            <Text style={{ fontSize: 12, fontWeight: activeTab === tab ? '700' : '400', color: activeTab === tab ? '#C82829' : '#888' }}>
              {tab === 'overview' ? '💼 财务总览' : tab === 'shop' ? '🛒 消费与投资' : '💰 赃款账户'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── 反馈提示 ── */}
      {feedback && (
        <View style={{
          marginHorizontal: 14, marginTop: 10, padding: 10, borderRadius: 2,
          backgroundColor: feedback.ok ? '#E8F5E9' : '#FFF3F3',
          borderLeftWidth: 3, borderLeftColor: feedback.ok ? '#2a7a3b' : '#C82829',
        }}>
          <Text style={{ fontSize: 12, color: feedback.ok ? '#2a7a3b' : '#C82829', fontWeight: '600' }}>
            {feedback.msg}
          </Text>
        </View>
      )}

      <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
        <View style={{ padding: 14, gap: 12 }}>

          {activeTab === 'overview' ? (
            <>
              {/* ── 净资产总览 ── */}
              <View style={{
                backgroundColor: '#1A1A1A', borderRadius: 2, padding: 16,
                boxShadow: [{ offsetX: 0, offsetY: 2, blurRadius: 8, color: 'rgba(0,0,0,0.18)' }],
              }}>
                <Text style={{ color: '#aaa', fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>个人净资产总览</Text>
                <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800', fontFamily: 'monospace', marginBottom: 12 }}>
                  {fmtMoney(totalNetWorth)}
                </Text>
                <View style={{ flexDirection: 'row', gap: 0 }}>
                  {[
                    { label: '现金存款', value: savings, color: '#C82829' },
                    { label: '个人资金', value: personalFunds, color: '#7A5C00' },
                    { label: '公积金', value: hpfBalance, color: '#2563EB' },
                    { label: '资产估值', value: assetValue, color: '#2a7a3b' },
                  ].map((item, i) => (
                    <View key={item.label} style={{
                      flex: 1, alignItems: 'center',
                      borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: '#333',
                      paddingVertical: 4,
                    }}>
                      <Text style={{ color: item.color, fontSize: 13, fontWeight: '700', fontFamily: 'monospace' }}>
                        {fmtMoneyShort(item.value)}
                      </Text>
                      <Text style={{ color: '#777', fontSize: 9, marginTop: 2 }}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* ── 个人资金（人事周转金）卡片 ── */}
              <Card headerColor="#7A5C00" headerText="个人资金账户（人事周转金）" emoji="💰" tag={`可用 ${Math.round(personalFunds)} 元`}>
                <View style={{ backgroundColor: '#FCF9F2', padding: 10, borderWidth: 1, borderColor: '#E8DFD0', marginBottom: 10 }}>
                  <Text style={{ fontSize: 11, color: '#6A4E00', lineHeight: 16 }}>
                    📌 <Text style={{ fontWeight: '700' }}>个人资金用途：</Text>用于人事中枢招募私属门客/幕僚/亲信、赏赐下属提升忠诚度、政务任务周转等。
                  </Text>
                  <Text style={{ fontSize: 10, color: '#8A6E20', marginTop: 4 }}>
                    可随时将「现金存款」按 1:1 划拨转入，也可将闲置资金提回存款。
                  </Text>
                </View>

                {/* 当前资金对比 */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8F7F4', padding: 10, marginBottom: 12 }}>
                  <View>
                    <Text style={{ fontSize: 10, color: '#777' }}>当前个人资金</Text>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#7A5C00', fontFamily: 'monospace' }}>
                      {Math.round(personalFunds)} 元
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 10, color: '#777' }}>可用现金存款</Text>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#C82829', fontFamily: 'monospace' }}>
                      {fmtMoneyShort(savings)}
                    </Text>
                  </View>
                </View>

                {/* 快捷划拨按钮 */}
                <Text style={{ fontSize: 10, color: '#888', marginBottom: 6 }}>快捷划拨到个人资金：</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                  {[100, 300, 500, 1000].map(amt => (
                    <Pressable
                      key={amt}
                      disabled={transferBusy || savings < amt}
                      onPress={() => void handleTransferFunds('to_funds', amt)}
                      style={{
                        paddingHorizontal: 10, paddingVertical: 6,
                        backgroundColor: savings < amt ? '#E0DDD8' : '#7A5C00',
                        borderRadius: 2,
                      }}
                    >
                      <Text style={{ color: savings < amt ? '#888' : '#fff', fontSize: 11, fontWeight: '600' }}>
                        +划拨 {amt}元
                      </Text>
                    </Pressable>
                  ))}
                  {personalFunds > 0 && (
                    <Pressable
                      disabled={transferBusy}
                      onPress={() => void handleTransferFunds('to_savings', Math.round(personalFunds))}
                      style={{
                        paddingHorizontal: 10, paddingVertical: 6,
                        backgroundColor: '#2B4B6F',
                        borderRadius: 2,
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>
                        全部提回存款
                      </Text>
                    </Pressable>
                  )}
                </View>

                {/* 自定义金额划转 */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <TextInput
                    value={transferAmount}
                    onChangeText={setTransferAmount}
                    keyboardType="numeric"
                    placeholder="自定义金额"
                    style={{
                      flex: 1, borderWidth: 1, borderColor: '#D1CDCA', backgroundColor: '#fff',
                      paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, height: 34,
                    }}
                  />
                  <Pressable
                    disabled={transferBusy}
                    onPress={() => void handleTransferFunds('to_funds')}
                    style={{
                      paddingHorizontal: 12, height: 34, justifyContent: 'center',
                      backgroundColor: '#7A5C00', borderRadius: 2,
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>转入资金</Text>
                  </Pressable>
                  <Pressable
                    disabled={transferBusy || personalFunds <= 0}
                    onPress={() => void handleTransferFunds('to_savings')}
                    style={{
                      paddingHorizontal: 12, height: 34, justifyContent: 'center',
                      backgroundColor: personalFunds <= 0 ? '#E0DDD8' : '#555', borderRadius: 2,
                    }}
                  >
                    <Text style={{ color: personalFunds <= 0 ? '#888' : '#fff', fontSize: 11, fontWeight: '700' }}>提回存款</Text>
                  </Pressable>
                </View>

                {/* 反馈提示 */}
                {transferMsg && (
                  <View style={{
                    marginTop: 8, padding: 6,
                    backgroundColor: transferMsg.ok ? '#F0FFF4' : '#FFF0F0',
                    borderWidth: 1, borderColor: transferMsg.ok ? '#2a7a3b' : '#C82829',
                  }}>
                    <Text style={{ fontSize: 11, color: transferMsg.ok ? '#2a7a3b' : '#C82829', textAlign: 'center' }}>
                      {transferMsg.msg}
                    </Text>
                  </View>
                )}

                {/* 直达人事中枢入口 */}
                <Pressable
                  onPress={() => router.push('/(app)/personnel' as never)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                    gap: 6, backgroundColor: '#1B3A6B', paddingVertical: 8, marginTop: 12, borderRadius: 2,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>🏛️ 前往人事中枢使用个人资金 ›</Text>
                </Pressable>
              </Card>

              {/* ── 工资条明细卡 ── */}
              <Card headerColor="#8B2020" headerText="本月工资条" emoji="📄" tag="月度核算单">
                {/* 应发部分 */}
                <Text style={{ fontSize: 9, color: '#aaa', letterSpacing: 2, marginBottom: 4 }}>【应发项目】</Text>
                <PayRow label="职务工资（基本工资）" amount={grossSalary} color="#1A1A1A" />
                <Divider />
                {/* 代扣部分 */}
                <Text style={{ fontSize: 9, color: '#aaa', letterSpacing: 2, marginBottom: 4 }}>【代扣项目】</Text>
                <PayRow label="养老保险（个人 8%）" amount={Math.round(grossSalary * 0.08)} isDeduct color="#C05521" />
                <PayRow label="医疗保险（个人 2%）" amount={Math.round(grossSalary * 0.02)} isDeduct color="#C05521" />
                <PayRow label="失业保险（个人 0.5%）" amount={Math.round(grossSalary * 0.005)} isDeduct color="#C05521" />
                <PayRow label="个人所得税" amount={incomeTax} isDeduct color="#C05521" />
                <PayRow label="公积金（个人 12%）" amount={personalHpf} isDeduct color="#2563EB" />
                <Divider />
                {/* 税后实发 */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF8F8', padding: 8, borderRadius: 2 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1A1A1A' }}>💰 税后实发工资</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#C82829', fontFamily: 'monospace' }}>
                    +{fmtMoney(netSalary)}
                  </Text>
                </View>
                <Divider />
                {/* 单位五险一金 */}
                <Text style={{ fontSize: 9, color: '#aaa', letterSpacing: 2, marginBottom: 4 }}>【单位缴纳（不计入到手）】</Text>
                <PayRow label="单位养老保险（20%）" amount={Math.round(grossSalary * 0.20)} color="#888" sub />
                <PayRow label="单位医疗保险（10%）" amount={Math.round(grossSalary * 0.10)} color="#888" sub />
                <PayRow label="单位失业保险（0.5%）" amount={Math.round(grossSalary * 0.005)} color="#888" sub />
                <PayRow label="工伤/生育保险（1%）" amount={Math.round(grossSalary * 0.01)} color="#888" sub />
                <PayRow label="单位公积金（12%）" amount={unitHpf} color="#2563EB" sub />
              </Card>

              {/* ── 补贴收入卡 ── */}
              <Card headerColor="#2B4B6F" headerText="月度补贴明细" emoji="🎖️" tag={`合计 ${fmtMoney(monthlyAllowance)}/月`}>
                <Text style={{ fontSize: 10, color: '#666', lineHeight: 16, marginBottom: 8 }}>
                  补贴按职级直接发放，不纳入五险一金缴费基数，全额到账。
                </Text>
                {allowanceDetail.map(d => (
                  <PayRow key={d.label} label={d.label} amount={d.amount} color="#2B4B6F" />
                ))}
                <Divider />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0F4F8', padding: 8, borderRadius: 2 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#2B4B6F' }}>月度到账（工资+补贴）</Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#2B4B6F', fontFamily: 'monospace' }}>
                    +{fmtMoney(monthlyTakeHome)}
                  </Text>
                </View>
              </Card>

              {/* ── 公积金账户卡 ── */}
              <Card headerColor="#1D5C36" headerText="住房公积金账户" emoji="🏦" tag="专项账户">
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
                  <View>
                    <Text style={{ fontSize: 10, color: '#888', marginBottom: 3 }}>账户累计余额</Text>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: '#1D5C36', fontFamily: 'monospace' }}>
                      {fmtMoney(hpfBalance)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 10, color: '#888', marginBottom: 3 }}>月度缴存到账</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#1D5C36', fontFamily: 'monospace' }}>
                      +{fmtMoney(monthlyHpfTotal)}
                    </Text>
                  </View>
                </View>
                <Divider />
                <PayRow label={`个人缴存（工资 12%）`} amount={personalHpf} color="#1D5C36" />
                <PayRow label={`单位同等缴存（12%）`} amount={unitHpf} color="#1D5C36" />
                <Divider />
                <View style={{ backgroundColor: '#F0F8F2', padding: 8, borderRadius: 2 }}>
                  <Text style={{ fontSize: 10, color: '#1D5C36', lineHeight: 16 }}>
                    📌 公积金可用于购买自住住房、偿还住房贷款、租房等，退休后可一次性全部提取。购买「个人自有住房」类资产时可使用公积金抵扣部分房款。
                  </Text>
                </View>
              </Card>

              {/* ── 年终奖预估卡 ── */}
              <Card headerColor="#7C3AED" headerText="年终奖预估" emoji="🎯" tag="每年12月发放">
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 11, color: '#555' }}>称职（合格）：{bonusMonths} 个月工资</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#7C3AED', fontFamily: 'monospace' }}>
                      {fmtMoney(estimatedAnnualBonus)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 11, color: '#555' }}>优秀（+20%加成）</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#C82829', fontFamily: 'monospace' }}>
                      {fmtMoney(estimatedAnnualBonusExcellent)}
                    </Text>
                  </View>
                  <Divider />
                  <Text style={{ fontSize: 10, color: '#888', lineHeight: 15 }}>
                    💡 年终奖由年度考核结果决定：优秀加20%，不合格不发放。绩效积分≥90分视为优秀，60分以下不合格。
                  </Text>
                </View>
              </Card>

              {/* ── 组织分配住房 ── */}
              <Card headerColor="#2B4B6F" headerText="组织分配住房" emoji="🏛️" tag="使用权">
                {housing ? (
                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={{ fontSize: 30 }}>🏠</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A' }}>{housing}</Text>
                        <Text style={{ fontSize: 9, color: '#888', marginTop: 2 }}>职级配套住房（居住权，非产权）</Text>
                      </View>
                    </View>
                    <View style={{ backgroundColor: '#F0F4F8', padding: 8, borderRadius: 2 }}>
                      <Text style={{ fontSize: 10, color: '#2B4B6F', lineHeight: 15 }}>
                        📌 分配住房属于组织保障，晋升后自动升级，调离或退休后须归还，不计入个人房产财富。
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 24 }}>🏚️</Text>
                    <View>
                      <Text style={{ fontSize: 12, color: '#888' }}>当前职级暂无组织分配住房</Text>
                      <Text style={{ fontSize: 9, color: '#aaa', marginTop: 2 }}>
                        副科级起享有工作宿舍，可自购住房→「消费与投资」标签页
                      </Text>
                    </View>
                  </View>
                )}
              </Card>

              {/* ── 已购资产清单 ── */}
              {ownedItems.length > 0 && (
                <Card headerColor="#1D5C36" headerText={`已购置资产（${ownedItems.length} 项）`} emoji="📋" tag={`估值 ${fmtMoneyShort(assetValue)}`}>
                  <View style={{ gap: 6 }}>
                    {ownedItems.map((item, idx) => (
                      <View key={`${item.key}-${idx}`} style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingVertical: 7, paddingHorizontal: 8,
                        backgroundColor: '#F9F8F5', borderLeftWidth: 3,
                        borderLeftColor: CATEGORY_COLOR[item.category] ?? '#2B4B6F',
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                          <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#1A1A1A' }}>{item.name}</Text>
                            <Text style={{ fontSize: 9, color: '#888' }}>{item.effectDesc}</Text>
                          </View>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 10, color: '#aaa', fontFamily: 'monospace' }}>{fmtMoney(item.price)}</Text>
                          {item.isMonthlyReturn && (
                            <Text style={{ fontSize: 9, color: '#7C3AED' }}>
                              月收益约+{fmtMoneyShort(Math.round(item.price * (item.monthlyReturnRate ?? 0)))}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                  {investMonthlyEst > 0 && (
                    <>
                      <Divider />
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F5F0FF', padding: 8, borderRadius: 2 }}>
                        <Text style={{ fontSize: 11, color: '#7C3AED', fontWeight: '600' }}>📈 投资月度预估收益</Text>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#7C3AED', fontFamily: 'monospace' }}>
                          +{fmtMoney(investMonthlyEst)}
                        </Text>
                      </View>
                    </>
                  )}
                </Card>
              )}

              {/* ── 职级薪资阶梯 ── */}
              <Card headerColor="#555" headerText="职级薪资晋升阶梯" emoji="📊" tag="含补贴合计">
                <View style={{ gap: 4 }}>
                  {Object.entries(RANK_SALARY).map(([lvl, sal]) => {
                    const lvlNum = Number(lvl);
                    const cfg = RANK_CONFIG[lvlNum];
                    const isCurrent = lvlNum === rankLevel;
                    const isPast = lvlNum < rankLevel;
                    const allowance = RANK_MONTHLY_ALLOWANCE[lvlNum] ?? 0;
                    return (
                      <View key={lvl} style={{
                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        paddingVertical: 5, paddingHorizontal: isCurrent ? 8 : 4,
                        backgroundColor: isCurrent ? '#FFF5F5' : 'transparent',
                        borderRadius: 2,
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{
                            width: 6, height: 6, borderRadius: 3,
                            backgroundColor: isCurrent ? '#C82829' : isPast ? '#2a7a3b' : '#D9D9D9',
                          }} />
                          <Text style={{ fontSize: 10, color: isCurrent ? '#C82829' : isPast ? '#2a7a3b' : '#aaa', fontWeight: isCurrent ? '700' : '400' }}>
                            {cfg?.name ?? `级别${lvl}`}
                          </Text>
                          {isCurrent && (
                            <View style={{ backgroundColor: '#C82829', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 1 }}>
                              <Text style={{ fontSize: 8, color: '#fff', fontWeight: '700' }}>当前</Text>
                            </View>
                          )}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 10, color: isCurrent ? '#C82829' : isPast ? '#2a7a3b' : '#bbb', fontFamily: 'monospace', fontWeight: isCurrent ? '700' : '400' }}>
                            {fmtMoney(sal + allowance)}/月
                          </Text>
                          {isCurrent && (
                            <Text style={{ fontSize: 8, color: '#888' }}>工资{fmtMoneyShort(sal)}+补贴{fmtMoneyShort(allowance)}</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </Card>
            </>
          ) : (
            <>
              {/* ── 购物系统 ── */}
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', borderRadius: 2, overflow: 'hidden' }}>
                <View style={{ backgroundColor: '#1A1A1A', paddingHorizontal: 14, paddingVertical: 9, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 2 }}>🛒 个人消费与投资</Text>
                  <Text style={{ color: '#aaa', fontSize: 10 }}>余额：{fmtMoney(savings)}</Text>
                </View>

                {/* 分类筛选 */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderBottomWidth: 1, borderBottomColor: '#F0EDE8' }}>
                  <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 6 }}>
                    {(['全部', ...ALL_CATEGORIES] as string[]).map(cat => (
                      <Pressable
                        key={cat}
                        onPress={() => setActiveCategory(cat)}
                        style={{
                          paddingHorizontal: 10, paddingVertical: 4, borderRadius: 2,
                          backgroundColor: activeCategory === cat ? '#C82829' : '#F5F4F1',
                          borderWidth: 1, borderColor: activeCategory === cat ? '#C82829' : '#D9D9D9',
                        }}>
                        <Text style={{ fontSize: 10, color: activeCategory === cat ? '#fff' : '#555', fontWeight: activeCategory === cat ? '700' : '400' }}>
                          {cat === '全部' ? '全部' : `${CATEGORY_EMOJI[cat] ?? ''} ${cat}`}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>

                {/* 商品列表 */}
                <View style={{ padding: 12, gap: 8 }}>
                  {filteredItems.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                      <Text style={{ fontSize: 24, marginBottom: 8 }}>✅</Text>
                      <Text style={{ fontSize: 12, color: '#aaa' }}>该分类商品均已购置</Text>
                    </View>
                  ) : (
                    filteredItems.map(item => {
                      const canAfford = savings >= item.price;
                      const isBuying = buyingKey === item.key;
                      return (
                        <View key={item.key} style={{ borderWidth: 1, borderColor: '#E8E5E0', borderRadius: 2, overflow: 'hidden' }}>
                          <View style={{ flexDirection: 'row', padding: 10, gap: 10, alignItems: 'flex-start' }}>
                            <View style={{ alignItems: 'center', gap: 4 }}>
                              <Text style={{ fontSize: 26 }}>{item.emoji}</Text>
                              <View style={{ backgroundColor: CATEGORY_COLOR[item.category] ?? '#666', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 1 }}>
                                <Text style={{ fontSize: 8, color: '#fff', fontWeight: '700' }}>{item.category}</Text>
                              </View>
                            </View>
                            <View style={{ flex: 1, gap: 3 }}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A', flex: 1 }}>{item.name}</Text>
                                <Text style={{ fontSize: 13, fontWeight: '800', color: canAfford ? '#C82829' : '#C0BAB0', fontFamily: 'monospace' }}>
                                  {fmtMoney(item.price)}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 10, color: '#555', lineHeight: 15 }}>{item.desc}</Text>
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                                <View style={{ backgroundColor: '#F0F4F0', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 1 }}>
                                  <Text style={{ fontSize: 9, color: '#1D5C36' }}>效果：{item.effectDesc}</Text>
                                </View>
                                {item.isMonthlyReturn && (
                                  <View style={{ backgroundColor: '#F5F0FF', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 1 }}>
                                    <Text style={{ fontSize: 9, color: '#7C3AED' }}>
                                      预估月收益：{fmtMoney(Math.round(item.price * (item.monthlyReturnRate ?? 0)))}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          </View>
                          <Pressable
                            onPress={() => canAfford && !isBuying ? setShowConfirm(item) : undefined}
                            style={{ backgroundColor: canAfford ? '#C82829' : '#E8E5E0', paddingVertical: 9, alignItems: 'center', justifyContent: 'center' }}
                            android_ripple={{ color: 'rgba(0,0,0,0.15)' }}>
                            {isBuying ? (
                              <ActivityIndicator color="#fff" size="small" />
                            ) : (
                              <Text style={{ fontSize: 11, fontWeight: '700', color: canAfford ? '#fff' : '#A0978A', letterSpacing: 1 }}>
                                {canAfford ? '立即购置' : `余额不足（差 ${fmtMoney(item.price - savings)}）`}
                              </Text>
                            )}
                          </Pressable>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            </>
          )}

          {activeTab === 'illicit' ? (
            <IllicitFundsTab />
          ) : null}

          <View style={{ height: 32 }} />
        </View>
      </ScrollView>

      {/* ── 购买确认弹窗 ── */}
      {showConfirm && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center',
          paddingHorizontal: 24,
        }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 2, overflow: 'hidden', width: '100%', maxWidth: 380 }}>
            <View style={{ backgroundColor: '#1A1A1A', paddingHorizontal: 16, paddingVertical: 12 }}>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 2 }}>📋 确认购置</Text>
            </View>
            <View style={{ padding: 16, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 36 }}>{showConfirm.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}>{showConfirm.name}</Text>
                  <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{showConfirm.desc}</Text>
                </View>
              </View>
              <View style={{ backgroundColor: '#F9F8F5', padding: 10, borderRadius: 2, gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 11, color: '#555' }}>购置价格</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#C82829', fontFamily: 'monospace' }}>
                    {fmtMoney(showConfirm.price)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 11, color: '#555' }}>购置后余额</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#2B4B6F', fontFamily: 'monospace' }}>
                    {fmtMoney(savings - showConfirm.price)}
                  </Text>
                </View>
              </View>
              <View style={{ backgroundColor: '#F0F4F0', padding: 8, borderRadius: 2 }}>
                <Text style={{ fontSize: 10, color: '#1D5C36' }}>效果：{showConfirm.effectDesc}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F0EDE8' }}>
              <Pressable
                onPress={() => setShowConfirm(null)}
                style={{ flex: 1, paddingVertical: 13, alignItems: 'center', backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: '#F0EDE8' }}
                android_ripple={{ color: 'rgba(0,0,0,0.08)' }}>
                <Text style={{ fontSize: 13, color: '#888' }}>取消</Text>
              </Pressable>
              <Pressable
                onPress={() => handleBuy(showConfirm)}
                style={{ flex: 1, paddingVertical: 13, alignItems: 'center', backgroundColor: '#C82829' }}
                android_ripple={{ color: 'rgba(255,255,255,0.25)' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>确认购置</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

