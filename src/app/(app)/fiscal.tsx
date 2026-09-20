// 城市财政总览页 - 统一展示所有资金来源与支出
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getFiscalSummary } from '@/db/gameApi';
import { DEPT_CONFIG, formatFund } from '@/types/game';
import type { FiscalSummary } from '@/db/gameApi';
import type { DeptKey } from '@/types/game';

type Tab = 'overview' | 'income' | 'expense' | 'debt';

const TAB_LIST: { key: Tab; label: string }[] = [
  { key: 'overview', label: '财政概览' },
  { key: 'income',   label: '收入来源' },
  { key: 'expense',  label: '支出明细' },
  { key: 'debt',     label: '负债投资' },
];

function Row({ label, value, sub, color, bold }: {
  label: string; value: string; sub?: string; color?: string; bold?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F2F2F2' }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, color: '#444' }}>{label}</Text>
        {!!sub && <Text style={{ fontSize: 10, color: '#999', marginTop: 2 }}>{sub}</Text>}
      </View>
      <Text style={{ fontSize: 13, fontWeight: bold ? '700' : '500', color: color ?? '#222', fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D4D4D4', marginBottom: 12 }}>
      <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#D4D4D4' }}>
        <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '700', letterSpacing: 2 }}>{title}</Text>
      </View>
      <View style={{ paddingHorizontal: 14, paddingBottom: 4 }}>{children}</View>
    </View>
  );
}

export default function FiscalScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save } = useGame();
  const [tab, setTab] = useState<Tab>('overview');
  const [fs, setFs] = useState<FiscalSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!save) return;
    setLoading(true);
    const data = await getFiscalSummary(save.id, save.userId);
    setFs(data);
    setLoading(false);
  }, [save]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (!save) return null;

  const netColor = !fs ? '#444' : fs.monthlyNetFlow >= 0 ? '#1a6a30' : '#C82829';
  const balanceColor = (fs?.mainBalance ?? 0) > 0 ? '#fff' : '#FF8A80';

  // 计算各部门月度行政经费（人均3万）
  const DEPT_KEYS = Object.keys(DEPT_CONFIG) as DeptKey[];

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      <StatusBar style="light" backgroundColor="#1D3B5E" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#2B4B6F', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>财政局</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>城市财政总览</Text>
          <Text style={{ color: '#a0b4cc', fontSize: 9, marginTop: 1 }}>{save?.rankName} · {save?.cityName}</Text>
        </View>
        {fs && (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10 }}>月净现金流</Text>
            <Text style={{ color: netColor === '#C82829' ? '#FF8A80' : '#7eff9a', fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
              {fs.monthlyNetFlow >= 0 ? '+' : ''}{fs.monthlyNetFlow.toFixed(0)}万
            </Text>
          </View>
        )}
      </View>

      {/* Tab 栏 */}
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#DDD' }}>
        {TAB_LIST.map(t => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            style={{ flex: 1, paddingVertical: 11, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: tab === t.key ? '#2B4B6F' : 'transparent' }}
          >
            <Text style={{ fontSize: 12, color: tab === t.key ? '#2B4B6F' : '#888', fontWeight: tab === t.key ? '700' : '400' }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#1D3B5E" />
        </View>
      ) : !fs ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#888' }}>暂无财政数据</Text>
        </View>
      ) : (
        <FlatList
          data={[tab]}
          keyExtractor={k => k}
          contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
          contentInsetAdjustmentBehavior="automatic"
          renderItem={() => (
            <View>
              {/* ====== 财政概览 ====== */}
              {tab === 'overview' && (
                <>
                  {/* 主账户余额大卡 */}
                  <View style={{ backgroundColor: '#2B4B6F', padding: 18, marginBottom: 12 }}>
                    <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>城市可用资金余额</Text>
                    <Text style={{ color: balanceColor, fontSize: 30, fontWeight: '700', marginTop: 4, fontVariant: ['tabular-nums'] }}>
                      {formatFund(fs.mainBalance)}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 0, marginTop: 12, borderTopWidth: 1, borderTopColor: '#2e3f54', paddingTop: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#a0b4cc', fontSize: 9 }}>月度总收入</Text>
                        <Text style={{ color: '#7eff9a', fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                          +{(fs.monthlyTaxIncome).toFixed(0)} 万
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#a0b4cc', fontSize: 9 }}>月度总支出</Text>
                        <Text style={{ color: '#FF8A80', fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                          -{(fs.monthlyLoanRepayment + fs.monthlyAdminExpense).toFixed(0)} 万
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#a0b4cc', fontSize: 9 }}>月净现金流</Text>
                        <Text style={{ color: fs.monthlyNetFlow >= 0 ? '#7eff9a' : '#FF8A80', fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                          {fs.monthlyNetFlow >= 0 ? '+' : ''}{fs.monthlyNetFlow.toFixed(0)} 万
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* 月度收支汇总表 */}
                  <SectionCard title="月度收支汇总">
                    <Row
                      label="企业税收（招商局）"
                      sub={`${fs.enterpriseCount} 家运营企业`}
                      value={`+${fs.monthlyTaxIncome.toFixed(0)} 万`}
                      color="#1a6a30"
                      bold
                    />
                    <Row
                      label="贷款月供（银行贷款）"
                      sub={`${fs.activeLoans.length} 笔活跃贷款`}
                      value={`-${fs.monthlyLoanRepayment.toFixed(0)} 万`}
                      color={fs.monthlyLoanRepayment > 0 ? '#C82829' : '#888'}
                    />
                    <Row
                      label="行政运营经费"
                      sub={`${fs.totalStaff} 名在编干部 × 3万/月`}
                      value={`-${fs.monthlyAdminExpense.toFixed(0)} 万`}
                      color={fs.monthlyAdminExpense > 0 ? '#b05000' : '#888'}
                    />
                    <Row
                      label="月净结余"
                      value={`${fs.monthlyNetFlow >= 0 ? '+' : ''}${fs.monthlyNetFlow.toFixed(0)} 万`}
                      color={netColor}
                      bold
                    />
                  </SectionCard>

                  {/* 财政健康状态 */}
                  <SectionCard title="财政健康指标">
                    <Row label="累计税收总额" value={formatFund(fs.totalTaxRevenue)} color="#1D3B5E" bold />
                    <Row label="城市基础税率" value={`${(fs.cityTaxRate * 100).toFixed(1)}%`} />
                    <Row label="未偿还债务" value={formatFund(fs.debtTotal)} color={fs.debtTotal > 0 ? '#C82829' : '#888'} />
                    <Row label="在运投资项目" value={`${fs.runningInvestments.length} 项`} color="#1a6a30" />
                    <Row label="引进企业数（运营中）" value={`${fs.enterpriseCount} 家`} color="#1D3B5E" />
                    <Row
                      label="资产负债状况"
                      value={fs.debtTotal === 0 ? '健康无债' : fs.debtTotal < fs.mainBalance ? '可控' : '偏高'}
                      color={fs.debtTotal === 0 ? '#1a6a30' : fs.debtTotal < fs.mainBalance ? '#b05000' : '#C82829'}
                      bold
                    />
                  </SectionCard>

                  {/* 资金流向说明 */}
                  <View style={{ backgroundColor: '#FFF9E6', borderWidth: 1, borderColor: '#F0C050', padding: 12 }}>
                    <Text style={{ fontSize: 11, color: '#7A5C00', lineHeight: 18 }}>
                      💡 资金来源说明：{'\n'}
                      · 招商局每月自动引进企业，营运企业按税率缴税，自动计入余额{'\n'}
                      · 职能部门行政活动可带来专项收入或产生专项支出{'\n'}
                      · 城市金融页可申请政策性贷款或启动投资项目
                    </Text>
                  </View>
                </>
              )}

              {/* ====== 收入来源 ====== */}
              {tab === 'income' && (
                <>
                  <SectionCard title="招商局 · 企业税收">
                    {fs.enterprises.filter(e => e.status === 'operating').length === 0 ? (
                      <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, color: '#888' }}>暂无运营企业</Text>
                        <Text style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>通过招商局引进企业后，每月自动缴税</Text>
                      </View>
                    ) : (
                      <>
                        {/* 表头 */}
                        <View style={{ flexDirection: 'row', backgroundColor: '#F0F4F8', paddingVertical: 6, paddingHorizontal: 4, marginTop: 8, marginBottom: 4 }}>
                          <Text style={{ flex: 3, fontSize: 10, color: '#2B4B6F', fontWeight: '700' }}>企业名称</Text>
                          <Text style={{ flex: 2, fontSize: 10, color: '#2B4B6F', fontWeight: '700', textAlign: 'center' }}>行业/规模</Text>
                          <Text style={{ flex: 1, fontSize: 10, color: '#1a6a30', fontWeight: '700', textAlign: 'right' }}>月税收</Text>
                        </View>
                        {fs.enterprises.filter(e => e.status === 'operating').map(ent => (
                          <View key={ent.id} style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' }}>
                            <Text style={{ flex: 3, fontSize: 12, color: '#222' }} numberOfLines={1}>{ent.name}</Text>
                            <Text style={{ flex: 2, fontSize: 11, color: '#666', textAlign: 'center' }} numberOfLines={1}>
                              {ent.industry}·{ent.scale === 'large' ? '大' : ent.scale === 'medium' ? '中' : '小'}
                            </Text>
                            <Text style={{ flex: 1, fontSize: 12, color: '#1a6a30', fontWeight: '700', textAlign: 'right', fontVariant: ['tabular-nums'] }}>
                              +{ent.taxContribution}万
                            </Text>
                          </View>
                        ))}
                        <View style={{ flexDirection: 'row', backgroundColor: '#E8F5E9', padding: 10, marginTop: 8 }}>
                          <Text style={{ flex: 1, fontSize: 12, color: '#1a6a30', fontWeight: '700' }}>月度企业税收合计</Text>
                          <Text style={{ fontSize: 13, color: '#1a6a30', fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                            +{fs.enterpriseTotalTax.toFixed(0)} 万元
                          </Text>
                        </View>
                      </>
                    )}
                  </SectionCard>

                  {/* 投资项目预期收益 */}
                  <SectionCard title="城市投资集团 · 在运项目">
                    {fs.runningInvestments.length === 0 ? (
                      <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, color: '#888' }}>暂无在运投资项目</Text>
                        <Text style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>前往城市金融 → 招商投资启动项目</Text>
                      </View>
                    ) : (
                      fs.runningInvestments.map(inv => (
                        <View key={inv.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#222' }}>{inv.name}</Text>
                            <Text style={{ fontSize: 12, color: '#1a6a30', fontWeight: '700', fontVariant: ['tabular-nums'] }}>投入 {inv.amount.toLocaleString()}万</Text>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                            <Text style={{ fontSize: 11, color: '#888' }}>
                              到期：+{inv.effectValue}点
                              {inv.effectType === 'gdp' ? 'GDP' : inv.effectType === 'business' ? '营商' : inv.effectType === 'livelihood' ? '民生' : '生态'}
                            </Text>
                            <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 10, color: '#1a6a30' }}>进行中</Text>
                            </View>
                          </View>
                        </View>
                      ))
                    )}
                  </SectionCard>

                  {/* 职能部门专项收入提示 */}
                  <SectionCard title="职能部门 · 专项收入">
                    <View style={{ paddingVertical: 12 }}>
                      <Text style={{ fontSize: 12, color: '#555', lineHeight: 20 }}>
                        部分行政活动可带来专项收入，常见来源：
                      </Text>
                      <View style={{ gap: 6, marginTop: 8 }}>
                        {[
                          { dept: '发改委', action: '引进重大项目', income: '+50~120万' },
                          { dept: '招商局', action: '大型投资洽谈', income: '+80~300万' },
                          { dept: '税务局', action: '税务专项整治', income: '+60~150万' },
                          { dept: '财政局', action: '优化财政支出', income: '+30万' },
                          { dept: '市场监管', action: '市场秩序整治', income: '+20万' },
                        ].map(item => (
                          <View key={item.action} style={{ flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' }}>
                            <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 8, paddingVertical: 3, marginRight: 10 }}>
                              <Text style={{ fontSize: 10, color: '#2B4B6F', fontWeight: '600' }}>{item.dept}</Text>
                            </View>
                            <Text style={{ flex: 1, fontSize: 12, color: '#444' }}>{item.action}</Text>
                            <Text style={{ fontSize: 12, color: '#1a6a30', fontWeight: '700' }}>{item.income}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </SectionCard>
                </>
              )}

              {/* ====== 支出明细 ====== */}
              {tab === 'expense' && (
                <>
                  {/* 贷款月供 */}
                  <SectionCard title="银行贷款 · 月供支出">
                    {fs.activeLoans.length === 0 ? (
                      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, color: '#888' }}>当前无在贷贷款</Text>
                      </View>
                    ) : (
                      <>
                        {fs.activeLoans.map(loan => (
                          <View key={loan.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 13, color: '#333' }}>本金 <Text style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>{loan.amount.toLocaleString()}万</Text></Text>
                              <Text style={{ fontSize: 12, color: '#C82829', fontWeight: '700', fontVariant: ['tabular-nums'] }}>月供 -{loan.monthlyPay.toFixed(1)}万</Text>
                            </View>
                            <Text style={{ fontSize: 11, color: '#888', marginTop: 3 }}>年利率 {(loan.rate * 100).toFixed(1)}%</Text>
                          </View>
                        ))}
                        <View style={{ backgroundColor: '#FFF0F0', padding: 10, marginTop: 8 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12, color: '#C82829', fontWeight: '700' }}>贷款月供合计</Text>
                            <Text style={{ fontSize: 13, color: '#C82829', fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                              -{fs.monthlyLoanRepayment.toFixed(1)} 万元
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                            <Text style={{ fontSize: 11, color: '#888' }}>未偿还债务总额</Text>
                            <Text style={{ fontSize: 12, color: '#C82829', fontVariant: ['tabular-nums'] }}>{formatFund(fs.debtTotal)}</Text>
                          </View>
                        </View>
                      </>
                    )}
                  </SectionCard>

                  {/* 行政运营经费 */}
                  <SectionCard title="行政运营 · 各部门编制经费">
                    {fs.totalStaff === 0 ? (
                      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, color: '#888' }}>暂无在编干部</Text>
                        <Text style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>招募并派遣干部到各职能部门后显示经费</Text>
                      </View>
                    ) : (
                      <>
                        {DEPT_KEYS.filter(dk => (fs.deptStaffCounts[dk] ?? 0) > 0).map(dk => {
                          const cfg = DEPT_CONFIG[dk];
                          const count = fs.deptStaffCounts[dk] ?? 0;
                          const cost = count * 3;
                          return (
                            <View key={dk} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' }}>
                              <Text style={{ fontSize: 18, width: 32 }}>{cfg.icon}</Text>
                              <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={{ fontSize: 13, color: '#222', fontWeight: '600' }}>{cfg.name}</Text>
                                <Text style={{ fontSize: 10, color: '#888', marginTop: 1 }}>在编 {count} 人 × 3万/月</Text>
                              </View>
                              <Text style={{ fontSize: 13, color: '#b05000', fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                                -{cost}万
                              </Text>
                            </View>
                          );
                        })}
                        <View style={{ backgroundColor: '#FFF3E0', padding: 10, marginTop: 8 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12, color: '#b05000', fontWeight: '700' }}>行政经费合计</Text>
                            <Text style={{ fontSize: 13, color: '#b05000', fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                              -{fs.monthlyAdminExpense}万元/月
                            </Text>
                          </View>
                          <Text style={{ fontSize: 11, color: '#888', marginTop: 4 }}>共 {fs.totalStaff} 人在编，人均行政成本 3万/月</Text>
                        </View>
                      </>
                    )}
                  </SectionCard>

                  {/* 职能部门专项支出提示 */}
                  <SectionCard title="职能部门 · 专项支出参考">
                    <View style={{ paddingVertical: 8 }}>
                      <Text style={{ fontSize: 11, color: '#888', lineHeight: 18, marginBottom: 8 }}>
                        以下行政活动会直接消耗城市资金余额，请合理规划：
                      </Text>
                      {[
                        { dept: '公安局', action: '警用装备采购', cost: '-30万' },
                        { dept: '教育局', action: '优质教育资源引进', cost: '-80万' },
                        { dept: '卫生局', action: '医疗基础设施建设', cost: '-100~150万' },
                        { dept: '农业局', action: '农业综合开发', cost: '-90万' },
                        { dept: '生态局', action: '生态修复工程', cost: '-50~60万' },
                        { dept: '发改委', action: '产业园区建设', cost: '-20万' },
                      ].map(item => (
                        <View key={item.action} style={{ flexDirection: 'row', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' }}>
                          <View style={{ backgroundColor: '#FFF0F0', paddingHorizontal: 8, paddingVertical: 3, marginRight: 10 }}>
                            <Text style={{ fontSize: 10, color: '#C82829', fontWeight: '600' }}>{item.dept}</Text>
                          </View>
                          <Text style={{ flex: 1, fontSize: 12, color: '#444' }}>{item.action}</Text>
                          <Text style={{ fontSize: 12, color: '#C82829', fontWeight: '700' }}>{item.cost}</Text>
                        </View>
                      ))}
                    </View>
                  </SectionCard>
                </>
              )}

              {/* ====== 负债投资 ====== */}
              {tab === 'debt' && (
                <>
                  {/* 负债汇总 */}
                  <SectionCard title="负债汇总">
                    <Row label="未偿还债务总额" value={formatFund(fs.debtTotal)} color={fs.debtTotal > 0 ? '#C82829' : '#1a6a30'} bold />
                    <Row label="活跃贷款笔数" value={`${fs.activeLoans.length} 笔`} />
                    <Row
                      label="负债率（债务/余额）"
                      value={fs.mainBalance > 0 ? `${((fs.debtTotal / fs.mainBalance) * 100).toFixed(0)}%` : 'N/A'}
                      color={fs.debtTotal > fs.mainBalance ? '#C82829' : '#1a6a30'}
                    />
                    <Row label="月贷款成本" value={`-${fs.monthlyLoanRepayment.toFixed(1)}万`} color={fs.monthlyLoanRepayment > 0 ? '#C82829' : '#888'} />
                  </SectionCard>

                  {/* 各笔贷款详情 */}
                  {fs.activeLoans.length > 0 && (
                    <SectionCard title="贷款明细">
                      {fs.activeLoans.map((loan, i) => (
                        <View key={loan.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>贷款 #{i + 1}</Text>
                            <View style={{ backgroundColor: '#FFF0F0', paddingHorizontal: 8, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 10, color: '#C82829', fontWeight: '700' }}>偿还中</Text>
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 10, paddingVertical: 6 }}>
                              <Text style={{ fontSize: 10, color: '#888' }}>本金</Text>
                              <Text style={{ fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{loan.amount.toLocaleString()}万</Text>
                            </View>
                            <View style={{ backgroundColor: '#FFF0F0', paddingHorizontal: 10, paddingVertical: 6 }}>
                              <Text style={{ fontSize: 10, color: '#888' }}>月供</Text>
                              <Text style={{ fontSize: 13, color: '#C82829', fontWeight: '700', fontVariant: ['tabular-nums'] }}>{loan.monthlyPay.toFixed(1)}万</Text>
                            </View>
                            <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 10, paddingVertical: 6 }}>
                              <Text style={{ fontSize: 10, color: '#888' }}>年利率</Text>
                              <Text style={{ fontSize: 13, fontWeight: '700' }}>{(loan.rate * 100).toFixed(1)}%</Text>
                            </View>
                          </View>
                        </View>
                      ))}
                    </SectionCard>
                  )}

                  {/* 在运投资详情 */}
                  <SectionCard title="在运投资项目">
                    {fs.runningInvestments.length === 0 ? (
                      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, color: '#888' }}>暂无在运投资项目</Text>
                        <Pressable
                          onPress={() => router.push('/(app)/finance')}
                          style={{ backgroundColor: '#2B4B6F', paddingHorizontal: 16, paddingVertical: 8, marginTop: 12 }}
                        >
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>前往城市金融启动项目</Text>
                        </Pressable>
                      </View>
                    ) : (
                      fs.runningInvestments.map(inv => (
                        <View key={inv.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{inv.name}</Text>
                            <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 10, color: '#1a6a30', fontWeight: '700' }}>进行中</Text>
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 12 }}>
                            <Text style={{ fontSize: 12, color: '#666' }}>投入 <Text style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>{inv.amount.toLocaleString()}万</Text></Text>
                            <Text style={{ fontSize: 12, color: '#1a6a30' }}>
                              到期奖励：{inv.effectType === 'gdp' ? 'GDP' : inv.effectType === 'business' ? '营商' : inv.effectType === 'livelihood' ? '民生' : '生态'} +{inv.effectValue}
                            </Text>
                          </View>
                        </View>
                      ))
                    )}
                  </SectionCard>

                  {/* 快捷入口 */}
                  <Pressable
                    onPress={() => router.push('/(app)/finance')}
                    style={{ backgroundColor: '#2B4B6F', padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>🏦 前往城市金融管理贷款/投资</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}
