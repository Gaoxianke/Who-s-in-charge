# src/app/(app)_part2

共 17 个文件。
<a id="srcappappfiscaltsx"></a>
## `src/app/(app)/fiscal.tsx`

```tsx
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
```

<a id="srcappappfourorganstsx"></a>
## `src/app/(app)/four-organs.tsx`

```tsx
// 四大班子办公室 — 议政院/参政院/国政院/纪委监委
// rank11+ 可访问，不同职位开放不同班子权限
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getTopLeaders } from '@/lib/leaders';
import { getAllSubordinates, assessSubordinate } from '@/db/gameApi';

// ── 数据类型 ────────────────────────────────────────────────────────
interface OrgAction {
  id: string;
  label: string;
  desc: string;
  icon: string;
  cost: number;        // 政绩消耗
  meritGain: number;
  minRank: number;
  cooldownDays: number;
  integrityGain?: number;  // 对所有在职下属廉洁度提升
}

interface FourOrgan {
  id: 'npc' | 'cppcc' | 'sc' | 'ccdi';
  name: string;
  fullName: string;
  icon: string;
  color: string;
  bgColor: string;
  chairman: string;
  desc: string;
  duties: string[];
  actions: OrgAction[];
  minRank: number;
}

// ── 四大班子定义 ────────────────────────────────────────────────────
function buildFourOrgans(saveId: string): FourOrgan[] {
  const top = getTopLeaders(saveId);

  return [
    {
      id: 'npc',
      name: '全国议政院',
      fullName: '全国议政院常务委员会',
      icon: '🏛️',
      color: '#7B0026',
      bgColor: '#1A0A14',
      chairman: top.npcChairman,
      desc: '最高国家权力机关，行使立法权、监督权、重大决定权和任免权',
      duties: [
        '制定和修改基本法律',
        '监督宪法的实施',
        '审查和批准国家预算',
        '决定国家重大事项',
        '选举和决定国家主要领导人',
        '批准省、自治区、直辖市的建置',
      ],
      minRank: 12,
      actions: [
        { id: 'npc1', label: '提交立法建议', icon: '📜', desc: '就分管领域重要事项向议政院常委会提交立法建议，推动制度完善', cost: 30, meritGain: 20, minRank: 12, cooldownDays: 60 },
        { id: 'npc2', label: '列席常委会会议', icon: '🤝', desc: '以政府代表身份列席议政院常委会会议，汇报工作进展', cost: 0, meritGain: 12, minRank: 12, cooldownDays: 30 },
        { id: 'npc3', label: '答复议政质询', icon: '🎤', desc: '就重大政策决定向议政代表作出书面或口头答复', cost: 10, meritGain: 15, minRank: 13, cooldownDays: 45 },
        { id: 'npc4', label: '推动重要立法', icon: '⚖️', desc: '就国家战略性重要领域推动专项立法进程，提升法治水平', cost: 80, meritGain: 50, minRank: 14, cooldownDays: 90 },
      ],
    },
    {
      id: 'cppcc',
      name: '华夏参政院',
      fullName: '华夏全国参政院',
      icon: '🕊️',
      color: '#1565C0',
      bgColor: '#0A1020',
      chairman: top.cppccChair,
      desc: '中国人民爱国统一战线的组织，是中国共产党领导的多党合作和政治协商的重要机构',
      duties: [
        '政治协商（协助决策）',
        '民主监督（合规监督）',
        '参政议政（政策建议）',
        '团结海内外各界人士',
        '维护国家统一和民族团结',
        '促进祖国和平统一大业',
      ],
      minRank: 11,
      actions: [
        { id: 'cppcc1', label: '参加参政院全体会议', icon: '🏟️', desc: '出席参政院全体大会，展现执政党与各党派合作共事精神', cost: 0, meritGain: 10, minRank: 11, cooldownDays: 30 },
        { id: 'cppcc2', label: '提交参政院提案', icon: '📋', desc: '以委员名义就民生热点、重大发展议题提交高质量参政院提案', cost: 20, meritGain: 18, minRank: 12, cooldownDays: 45 },
        { id: 'cppcc3', label: '统战联谊活动', icon: '🤝', desc: '组织开展统战联谊活动，广泛凝聚各界人士力量', cost: 40, meritGain: 25, minRank: 12, cooldownDays: 60 },
        { id: 'cppcc4', label: '推动两岸交流', icon: '🌉', desc: '借助参政院平台推动两岸经贸文化交流，增进同胞情感纽带', cost: 60, meritGain: 40, minRank: 13, cooldownDays: 90 },
      ],
    },
    {
      id: 'sc',
      name: '国政院',
      fullName: '华夏人民共和国国政院',
      icon: '⚙️',
      color: '#2a7a3b',
      bgColor: '#071510',
      chairman: top.premier,
      desc: '最高国家行政机关，执行国家权力机关制定的法律，统一领导全国行政工作',
      duties: [
        '制定行政法规、规章',
        '领导和管理国民经济和社会发展',
        '领导和管理民政、公安、司法行政等工作',
        '领导和管理国防建设事业',
        '保护华侨的正当的权利和利益',
        '批准省、自治区、直辖市的区域划分',
      ],
      minRank: 12,
      actions: [
        { id: 'sc1', label: '参加国政院常务会议', icon: '🏛️', desc: '列席或参加国政院常务会议，协助研究部署重要工作', cost: 0, meritGain: 15, minRank: 12, cooldownDays: 14 },
        { id: 'sc2', label: '起草重要政策文件', icon: '✍️', desc: '牵头起草国政院重要政策文件，推动重大改革举措落地', cost: 50, meritGain: 35, minRank: 13, cooldownDays: 45 },
        { id: 'sc3', label: '主持国政院全体会议', icon: '🎙️', desc: '以总理身份主持国政院全体会议，审议讨论重大行政事项', cost: 0, meritGain: 30, minRank: 14, cooldownDays: 30 },
        { id: 'sc4', label: '批准重大行政法规', icon: '📖', desc: '以行政首脑身份批准颁布重要行政法规，强化行政法治', cost: 100, meritGain: 60, minRank: 14, cooldownDays: 60 },
      ],
    },
    {
      id: 'ccdi',
      name: '中枢纪律督察委员会',
      fullName: '中枢纪律督察委员会 · 国家监察委员会',
      icon: '⚖️',
      color: '#B71C1C',
      bgColor: '#180505',
      chairman: top.ccdiBoss,
      desc: '党和国家监督专责机构，负责纪律检查和监察工作，推进全面从严治党',
      duties: [
        '检查党的路线方针政策执行情况',
        '维护党的纪律',
        '受理和检举党员违纪行为',
        '对国家公职人员行使监察权',
        '调查职务违法和职务犯罪',
        '推进党风廉政建设和反腐败工作',
      ],
      minRank: 12,
      actions: [
        { id: 'ccdi1', label: '开展廉洁自查', icon: '🔍', desc: '主动开展政治生态自查，健全本单位廉洁制度体系', cost: 0, meritGain: 15, minRank: 12, cooldownDays: 30, integrityGain: 3 },
        { id: 'ccdi2', label: '配合巡视检查', icon: '📁', desc: '积极配合中央巡视组开展专项巡视，主动接受党内监督', cost: 0, meritGain: 20, minRank: 12, cooldownDays: 45, integrityGain: 4 },
        { id: 'ccdi3', label: '推进清廉单位建设', icon: '🏆', desc: '牵头推进分管领域清廉单位建设，推广典型经验做法', cost: 40, meritGain: 30, minRank: 13, cooldownDays: 60, integrityGain: 6 },
        { id: 'ccdi4', label: '主持反腐败专项行动', icon: '🚨', desc: '以主要领导身份主持开展反腐败专项行动，严肃查处违纪违法行为', cost: 120, meritGain: 70, minRank: 14, cooldownDays: 90, integrityGain: 10 },
      ],
    },
  ];
}

export default function FourOrgansScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [activeOrg, setActiveOrg] = useState<FourOrgan['id']>('npc');
  const [actionDone, setActionDone] = useState<Record<string, number>>({}); // key → last gameDays
  const [feedback, setFeedback] = useState('');
  const [feedbackOk, setFeedbackOk] = useState(true);
  const [acting, setActing] = useState(false);

  if (!save) return null;

  const rl = save.rankLevel;

  if (rl < 11) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F4F1', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <StatusBar style="light" backgroundColor="#2B4B6F" />
        <Text style={{ fontSize: 32, marginBottom: 16 }}>🔒</Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#2B4B6F', marginBottom: 8 }}>权限不足</Text>
        <Text style={{ fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20 }}>
          四大班子办公室仅开放给省委书记（11级）及以上职位
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#2B4B6F' }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>返回</Text>
        </Pressable>
      </View>
    );
  }

  const organs = buildFourOrgans(save.id);
  const current = organs.find(o => o.id === activeOrg) ?? organs[0]!;

  const showFeedback = (msg: string, ok = true) => {
    setFeedback(msg);
    setFeedbackOk(ok);
    setTimeout(() => setFeedback(''), 3500);
  };

  const isOnCooldown = (actionId: string, cooldownDays: number) => {
    const last = actionDone[actionId];
    return last !== undefined && save.gameDays - last < cooldownDays;
  };

  const cooldownLeft = (actionId: string, cooldownDays: number) => {
    const last = actionDone[actionId];
    if (last === undefined) return 0;
    return Math.max(0, cooldownDays - (save.gameDays - last));
  };

  const handleAction = async (action: OrgAction) => {
    if (acting) return;
    if (rl < action.minRank) {
      showFeedback(`需要${action.minRank}级以上职位才能执行此操作`, false);
      return;
    }
    if (isOnCooldown(action.id, action.cooldownDays)) {
      showFeedback(`冷却中，还需 ${cooldownLeft(action.id, action.cooldownDays)} 天`, false);
      return;
    }
    if (action.cost > 0 && (save.meritPoints ?? 0) < action.cost) {
      showFeedback(`政绩不足，需要 ${action.cost} 政绩`, false);
      return;
    }
    setActing(true);
    await updateGameSave({
      meritPoints: Math.max(0, (save.meritPoints ?? 0) - action.cost + action.meritGain),
    });

    // 廉洁增益：批量提升在职下属廉洁度
    let integrityDesc = '';
    if (action.integrityGain && action.integrityGain > 0) {
      const allSubs = await getAllSubordinates(save.id);
      const appointed = allSubs.filter(s => s.isAppointed);
      if (appointed.length > 0) {
        await Promise.all(
          appointed.map(s => assessSubordinate(s.id, save.gameDays, 0, 0, action.integrityGain!, 0))
        );
        integrityDesc = `，${appointed.length} 名下属廉洁+${action.integrityGain}`;
      }
    }

    setActionDone(prev => ({ ...prev, [action.id]: save.gameDays }));
    setActing(false);
    const net = action.meritGain - action.cost;
    showFeedback(`✅ ${action.label}：政绩${net >= 0 ? '+' : ''}${net}${integrityDesc}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0F1A' }}>
      <StatusBar style="light" backgroundColor="#0A0F1A" />

      {/* 顶栏 */}
      <View style={{ paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, backgroundColor: '#0A0F1A' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: '#a0b4cc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 9, letterSpacing: 3 }}>HIGH POLITICS</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>四大班子办公室</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#a0b4cc', fontSize: 9 }}>{save.rankName}</Text>
            <Text style={{ color: current.color, fontSize: 9, marginTop: 1, fontWeight: '700' }}>■ {current.name}</Text>
          </View>
        </View>

        {/* 班子切换 */}
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {organs.map(o => {
            const locked = rl < o.minRank;
            const active = activeOrg === o.id;
            return (
              <Pressable
                key={o.id}
                onPress={() => !locked && setActiveOrg(o.id)}
                style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: active ? o.color : 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: active ? o.color : '#1e3a5f', opacity: locked ? 0.4 : 1 }}
              >
                <Text style={{ fontSize: 16 }}>{o.icon}</Text>
                <Text style={{ color: active ? '#fff' : '#888', fontSize: 8, marginTop: 2, fontWeight: active ? '700' : '400' }}>
                  {locked ? '🔒' : o.name.slice(0, 4)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 反馈条 */}
      {feedback ? (
        <View style={{ backgroundColor: feedbackOk ? '#0d2b12' : '#2b0d0d', padding: 10, borderBottomWidth: 1, borderBottomColor: feedbackOk ? '#1a5c2e' : '#7B0026' }}>
          <Text style={{ color: feedbackOk ? '#81c784' : '#ef9a9a', fontSize: 12, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }} showsVerticalScrollIndicator={false}>

        {/* 机构简介 */}
        <View style={{ backgroundColor: current.bgColor, borderWidth: 1, borderColor: current.color + '44', padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Text style={{ fontSize: 36 }}>{current.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: current.color, fontSize: 10, letterSpacing: 2, marginBottom: 2 }}>
                {current.id.toUpperCase()} · {current.minRank}级以上可用
              </Text>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', lineHeight: 20 }}>{current.fullName}</Text>
            </View>
          </View>

          {/* 主要领导 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', padding: 10, marginBottom: 10, gap: 10 }}>
            <View style={{ width: 40, height: 40, backgroundColor: current.color + '33', borderWidth: 1, borderColor: current.color, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20 }}>👤</Text>
            </View>
            <View>
              <Text style={{ color: '#a0b4cc', fontSize: 9, letterSpacing: 1 }}>主要负责人</Text>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 2 }}>{current.chairman}</Text>
            </View>
          </View>

          <Text style={{ color: '#a0b4cc', fontSize: 11, lineHeight: 17, marginBottom: 10 }}>{current.desc}</Text>

          {/* 主要职能 */}
          <View style={{ gap: 4 }}>
            <Text style={{ color: current.color, fontSize: 9, letterSpacing: 2, fontWeight: '700', marginBottom: 4 }}>法定职能</Text>
            {current.duties.map((d, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                <View style={{ width: 14, height: 14, backgroundColor: current.color + '33', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                  <Text style={{ color: current.color, fontSize: 8, fontWeight: '700' }}>{i + 1}</Text>
                </View>
                <Text style={{ color: '#ccc', fontSize: 10, flex: 1, lineHeight: 16 }}>{d}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 可执行操作 */}
        <View style={{ backgroundColor: '#111827', borderWidth: 1, borderColor: '#1e3a5f', padding: 14 }}>
          <Text style={{ color: current.color, fontSize: 10, letterSpacing: 2, fontWeight: '700', marginBottom: 10 }}>
            {current.icon} 参与途径与职权操作
          </Text>
          {current.actions.map(action => {
            const cd = isOnCooldown(action.id, action.cooldownDays);
            const locked = rl < action.minRank;
            const canAfford = action.cost === 0 || (save.meritPoints ?? 0) >= action.cost;
            const net = action.meritGain - action.cost;
            const disabled = cd || locked || !canAfford || acting;
            return (
              <View
                key={action.id}
                style={{ borderWidth: 1, borderColor: locked ? '#1e3a5f' : cd ? '#2a2a3a' : current.color + '44', padding: 12, marginBottom: 8, backgroundColor: locked ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)', opacity: locked ? 0.5 : 1 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Text style={{ fontSize: 20 }}>{action.icon}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: locked ? '#555' : '#fff', flex: 1 }}>{action.label}</Text>
                  {locked && (
                    <View style={{ backgroundColor: '#333', paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: '#888', fontSize: 9 }}>需{action.minRank}级</Text>
                    </View>
                  )}
                  {cd && !locked && (
                    <View style={{ backgroundColor: '#2a2a3a', paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: '#a0b4cc', fontSize: 9 }}>冷却{cooldownLeft(action.id, action.cooldownDays)}天</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 11, color: '#888', lineHeight: 16, marginBottom: 8 }}>{action.desc}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {action.cost > 0 && <Text style={{ fontSize: 10, color: '#ef9a9a' }}>消耗政绩 {action.cost}</Text>}
                    <Text style={{ fontSize: 10, color: '#81c784' }}>获得政绩 {action.meritGain}</Text>
                    <Text style={{ fontSize: 10, color: net >= 0 ? current.color : '#888', fontWeight: '700' }}>
                      净{net >= 0 ? '+' : ''}{net}
                    </Text>
                    {action.integrityGain && action.integrityGain > 0 && (
                      <Text style={{ fontSize: 10, color: '#4fc3f7', fontWeight: '700' }}>
                        🛡️ 下属廉洁+{action.integrityGain}
                      </Text>
                    )}
                  </View>
                  <Pressable
                    onPress={() => void handleAction(action)}
                    style={{ paddingHorizontal: 14, paddingVertical: 6, backgroundColor: disabled ? '#1e2a3a' : current.color }}
                  >
                    <Text style={{ color: disabled ? '#555' : '#fff', fontSize: 11, fontWeight: '700' }}>
                      {locked ? '权限不足' : cd ? '冷却中' : !canAfford ? '政绩不足' : '执行'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

        {/* 四大班子协作说明 */}
        <View style={{ backgroundColor: '#0d1520', borderWidth: 1, borderColor: '#1e3a5f', padding: 12 }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10, fontWeight: '700', marginBottom: 6, letterSpacing: 1 }}>四大班子协作机制</Text>
          <Text style={{ color: '#666', fontSize: 10, lineHeight: 16 }}>
            · 议政院：立法和监督 — 推动制度创新，增强法治保障{'\n'}
            · 参政院：协商和建言 — 广泛凝聚共识，扩大政治联盟{'\n'}
            · 国政院：行政和执行 — 统筹部署，推进各项政策落地{'\n'}
            · 纪委监委：监督和惩戒 — 维护党纪国法，推进全面从严治党{'\n'}
            · 各项操作均有冷却期，建议分散执行，协同提升政绩
          </Text>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}
```

<a id="srcappappgameovertsx"></a>
## `src/app/(app)/game-over.tsx`

```tsx
// 游戏结局页面 —— 落马 / 重大事故 / 政治清洗
// 通过路由参数 type 区分：corruption / accident / purge
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { supabase } from '@/client/supabase';
import { useGame } from '@/ctx/GameContext';
import { deleteSave } from '@/db/gameApi';
import { RANK_CONFIG, gameDaysToDate, getAvatarEmoji, getAvatarBgColor } from '@/types/game';

type GameOverType = 'corruption' | 'accident' | 'purge' | 'fugitive' | 'dismissed';

// 结局配置
const GAME_OVER_CONFIG: Record<GameOverType, {
  headline: string;
  subhead: string;
  headerBg: string;
  accentColor: string;
  badge: string;
  verdictTitle: string;
  verdictLines: string[];
  historyRating: (rankLevel: number, meritPoints: number, moralValue: number) => string;
}> = {
  corruption: {
    headline: '落马',
    subhead: '因涉嫌严重违纪违法，中枢纪律督察委员会对你立案审查',
    headerBg: '#1A0000',
    accentColor: '#C82829',
    badge: '⚖️',
    verdictTitle: '组织处分决定',
    verdictLines: [
      '经查，你严重违反廉洁纪律，利用职务便利谋取私利',
      '违反中央八项规定精神，长期民心失范，不守底线',
      '依据《中国共产党纪律处分条例》，开除党籍、撤销公职',
      '涉嫌犯罪问题移送司法机关依法处理',
    ],
    historyRating: (rank, merit, moral) => {
      if (merit > 5000) return '政绩可观，却因一己之私毁于一旦。权力是把双刃剑，此路引以为戒。';
      if (moral < 10) return '廉洁防线早已崩溃，终难逃法网。历史将以此为警示。';
      return '本可有所作为，奈何走入歧途。望后来者引以为鉴。';
    },
  },
  accident: {
    headline: '引咎辞职',
    subhead: '辖区发生重大安全事故，你对处置失当负有主要领导责任',
    headerBg: '#1A1200',
    accentColor: '#C87820',
    badge: '📋',
    verdictTitle: '责任追究决定',
    verdictLines: [
      '经调查，辖区安全生产管理严重失职失责',
      '对多起突发事件处置不当，酿成重大事故',
      '根据问责条例，给予引咎辞职处分',
      '相关行政和刑事责任将依法追究',
    ],
    historyRating: (rank, merit, _moral) => {
      if (rank >= 8) return '曾执掌一方，却在危机时刻失守岗位职责。能力与担当，缺一不可。';
      return '安全底线不可逾越，事故背后是无数家庭的悲剧。敬畏生命，方能为官。';
    },
  },
  purge: {
    headline: '政治出局',
    subhead: '派系斗争失利，被强势政治力量边缘化，强制调任虚职',
    headerBg: '#0D0D1A',
    accentColor: '#4A2C8A',
    badge: '🏛️',
    verdictTitle: '组织调整决定',
    verdictLines: [
      '经组织研究，你所在派系影响力已严重削弱',
      '政治生态发生重大变化，现有职位已难以为继',
      '经党组研究决定，调任虚职，不再参与实际政务',
      '任满后依规定办理退休手续',
    ],
    historyRating: (_rank, merit, _moral) => {
      if (merit > 8000) return '政绩颇丰，却在政治博弈中落败。宦海沉浮，非一己之力所能掌控。';
      return '派系倾轧是官场永恒的暗流，唯有实力与人脉兼备，方能立于不败之地。';
    },
  },
  fugitive: {
    headline: '潜逃境外',
    subhead: '在留置前仓皇出逃，红色通缉令已发布，国际追逃追赃启动',
    headerBg: '#0A1A0A',
    accentColor: '#2a7a3b',
    badge: '🌍',
    verdictTitle: '国际追逃决定',
    verdictLines: [
      '经查，你涉嫌巨额贪腐，在组织审查前畏罪潜逃境外',
      '中央反腐败协调小组已发布红色通缉令',
      '依据《国际刑事司法协助法》，启动国际追逃追赃',
      '天网恢恢，疏而不漏，归案只是时间问题',
    ],
    historyRating: (_rank, merit, _moral) => {
      if (merit > 8000) return '曾位高权重，却选择了一条不归路。异国他乡，终是漂泊无依。';
      return '贪念蒙蔽双眼，一念之差，从此亡命天涯。前车之覆，后车之鉴。';
    },
  },
  dismissed: {
    headline: '双开',
    subhead: '立案审查后证据坐实，被开除党籍、开除公职',
    headerBg: '#1A0A0A',
    accentColor: '#8B0000',
    badge: '🚫',
    verdictTitle: '党纪政务处分决定',
    verdictLines: [
      '经立案审查，你的违纪违法事实证据确凿',
      '严重违反政治纪律、组织纪律、廉洁纪律',
      '依据党纪处分条例，给予开除党籍处分',
      '依据政务处分法，给予开除公职处分',
    ],
    historyRating: (_rank, merit, _moral) => {
      if (merit > 5000) return '本有锦绣前程，却因贪腐身败名裂。双开之下，一切归零。';
      return '党纪国法面前，无人能心存侥幸。双开处分，是对贪腐者的应有惩戒。';
    },
  },
};

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7,
      borderBottomWidth: 1, borderBottomColor: '#E8E4E0' }}>
      <Text style={{ fontSize: 12, color: '#888' }}>{label}</Text>
      <Text style={{ fontSize: 13, color: color ?? '#1D3557', fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

export default function GameOverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ type: GameOverType }>();
  const type: GameOverType = (params.type as GameOverType) || 'corruption';
  const cfg = GAME_OVER_CONFIG[type];
  const { save, setIsRunning, clearGameOverTrigger } = useGame();
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // 停止时间推进
  useFocusEffect(useCallback(() => {
    setIsRunning(false);
  }, [setIsRunning]));

  const handleRestart = async () => {
    if (!save) return;
    setDeleting(true);
    await deleteSave(save.id);
    clearGameOverTrigger();
    setIsRunning(false);
    await supabase.auth.signOut();
    router.replace('/(auth)/sign-in');
  };

  if (!save) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A0000' }}>
        <ActivityIndicator color="#C82829" />
      </View>
    );
  }

  const rankConfig = RANK_CONFIG[save.rankLevel];
  const careerYears = Math.floor(save.gameDays / 365);
  const startDate = gameDaysToDate(0);
  const endDate = gameDaysToDate(save.gameDays);
  const avatarEmoji = getAvatarEmoji(save.avatarId, save.playerGender);
  const avatarBg = getAvatarBgColor(save.avatarId, save.reformFaction >= save.pragmaticFaction ? 'reform' : 'pragmatic');
  const historyRating = cfg.historyRating(save.rankLevel, save.meritPoints, save.moralValue);

  return (
    <View style={{ flex: 1, backgroundColor: cfg.headerBg }}>
      <StatusBar style="light" backgroundColor={cfg.headerBg} />
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        {/* 全屏结局横幅 */}
        <View style={{ paddingTop: insets.top + 8, paddingBottom: 36, paddingHorizontal: 24, alignItems: 'center' }}>
          <Text style={{ fontSize: 56, marginBottom: 12 }}>{cfg.badge}</Text>
          <Text style={{ color: cfg.accentColor, fontSize: 38, fontWeight: 'bold', letterSpacing: 8,
            fontFamily: 'serif', marginBottom: 8 }}>
            {cfg.headline}
          </Text>
          <View style={{ height: 2, width: 80, backgroundColor: cfg.accentColor, marginBottom: 16 }} />
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center',
            lineHeight: 22, maxWidth: 340 }}>
            {cfg.subhead}
          </Text>
        </View>

        {/* 档案卡 */}
        <View style={{ backgroundColor: '#F5F4F1', marginHorizontal: 16, borderWidth: 1,
          borderColor: cfg.accentColor, marginBottom: 16 }}>
          {/* 档案头 */}
          <View style={{ backgroundColor: cfg.accentColor, paddingVertical: 10, paddingHorizontal: 16,
            flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold', letterSpacing: 2, flex: 1,
              fontFamily: 'serif' }}>干部仕途档案  ·  终止记录</Text>
          </View>

          <View style={{ padding: 16 }}>
            {/* 头像+姓名 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16,
              paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: cfg.accentColor }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: avatarBg,
                alignItems: 'center', justifyContent: 'center', marginRight: 14,
                borderWidth: 2, borderColor: cfg.accentColor }}>
                <Text style={{ fontSize: 28 }}>{avatarEmoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', fontFamily: 'serif' }}>
                  {save.playerName} 同志
                </Text>
                <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                  {save.playerGender} · {save.playerAge} 岁 · {save.school}
                </Text>
              </View>
              <View style={{ backgroundColor: cfg.accentColor, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{cfg.headline}</Text>
              </View>
            </View>

            {/* 仕途数据 */}
            <StatRow label="最终职级" value={rankConfig.name} color={cfg.accentColor} />
            <StatRow label="最终职位" value={save.playerPosition || rankConfig.name} />
            <StatRow label="任职城市" value={save.cityName} />
            <StatRow label="仕途年数" value={`${careerYears} 年`} />
            <StatRow label="政绩积分" value={`${Math.round(save.meritPoints).toLocaleString()} 分`} />
            <StatRow label="民心指数" value={`${save.moralValue} / 100`}
              color={save.moralValue < 20 ? '#C82829' : save.moralValue < 40 ? '#C87820' : '#2a7a3b'} />
            <StatRow label="在职时间" value={`${startDate} — ${endDate}`} />
            <StatRow label="个人存款" value={`¥ ${(save.personalSavings / 10000).toFixed(1)} 万元`} />
            {(type === 'corruption' || type === 'fugitive' || type === 'dismissed') && (
              <StatRow label="涉案金额" value={`¥ ${(Number(save.illegalWealth ?? 0) / 10000).toFixed(1)} 万元`} color="#C82829" />
            )}
          </View>
        </View>

        {/* 组织处分决定 */}
        <View style={{ backgroundColor: '#F5F4F1', marginHorizontal: 16, borderWidth: 1,
          borderColor: '#D0C8B8', marginBottom: 16 }}>
          <View style={{ backgroundColor: '#2C2C2C', paddingVertical: 10, paddingHorizontal: 16 }}>
            <Text style={{ color: '#FFD700', fontSize: 12, fontWeight: 'bold', letterSpacing: 2,
              fontFamily: 'serif' }}>{cfg.verdictTitle}</Text>
          </View>
          <View style={{ padding: 16 }}>
            {cfg.verdictLines.map((line, i) => (
              <View key={i} style={{ flexDirection: 'row', marginBottom: 8 }}>
                <Text style={{ color: cfg.accentColor, fontWeight: '700', marginRight: 8, fontSize: 13 }}>
                  {i + 1}.
                </Text>
                <Text style={{ flex: 1, fontSize: 13, color: '#333', lineHeight: 20 }}>{line}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 历史评价 */}
        <View style={{ backgroundColor: '#F5F4F1', marginHorizontal: 16, marginBottom: 28,
          borderWidth: 1, borderColor: '#D0C8B8' }}>
          <View style={{ backgroundColor: '#3C3228', paddingVertical: 10, paddingHorizontal: 16 }}>
            <Text style={{ color: '#D4B896', fontSize: 12, fontWeight: 'bold', letterSpacing: 2,
              fontFamily: 'serif' }}>历史评价</Text>
          </View>
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 14, color: '#444', lineHeight: 24, fontStyle: 'italic',
              fontFamily: 'serif', textAlign: 'center' }}>
              「{historyRating}」
            </Text>
          </View>
        </View>

        {/* 操作按钮 */}
        <View style={{ marginHorizontal: 16, marginBottom: 48, gap: 12 }}>
          {!showDelete ? (
            <Pressable
              onPress={() => setShowDelete(true)}
              style={{ backgroundColor: cfg.accentColor, paddingVertical: 16, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 3 }}>
                重新开始仕途
              </Text>
            </Pressable>
          ) : (
            <View style={{ borderWidth: 1, borderColor: cfg.accentColor, padding: 16 }}>
              <Text style={{ color: '#333', fontSize: 13, textAlign: 'center', marginBottom: 12, lineHeight: 20 }}>
                确认将删除本档存档并返回登录页，此操作不可撤销。
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable
                  onPress={() => setShowDelete(false)}
                  style={{ flex: 1, borderWidth: 1, borderColor: '#999', paddingVertical: 12, alignItems: 'center' }}
                >
                  <Text style={{ color: '#666', fontSize: 14 }}>取消</Text>
                </Pressable>
                <Pressable
                  onPress={handleRestart}
                  disabled={deleting}
                  style={{ flex: 2, backgroundColor: cfg.accentColor, paddingVertical: 12, alignItems: 'center' }}
                >
                  {deleting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>确认，重新开始</Text>
                  }
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
```

<a id="srcappappgoverningareastsx"></a>
## `src/app/(app)/governing-areas.tsx`

```tsx
// 管辖区域页面 - 含汇总面板、排行榜、全区普查、发展等级标签、冷却时间、特色发展
import { useState, useCallback } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getGoverningAreas, initGoverningAreas, investArea, visitArea } from '@/db/gameApi';
import { generateAreas, AREA_TYPE_LABEL } from '@/types/game';
import type { GoverningArea } from '@/types/game';

function getAreaTier(rankLevel: number): GoverningArea['areaType'] {
  if (rankLevel <= 3) return 'village';
  if (rankLevel <= 6) return 'town';
  if (rankLevel <= 9) return 'district';
  return 'city_level';
}

function getDevLevelLabel(devIndex: number): { label: string; color: string; bg: string } {
  if (devIndex >= 80) return { label: '先进', color: '#fff', bg: '#2a7a3b' };
  if (devIndex >= 60) return { label: '良好', color: '#fff', bg: '#2B4B6F' };
  if (devIndex >= 40) return { label: '一般', color: '#fff', bg: '#e67e22' };
  return { label: '落后', color: '#fff', bg: '#C82829' };
}

/** 冷却剩余天数（30天冷却） */
function cooldownLeft(lastDay: number, currentDay: number, cd = 30): number {
  return Math.max(0, cd - (currentDay - lastDay));
}

function IndexBar({ label, value, color = '#1D2D44' }: { label: string; value: number; color?: string }) {
  return (
    <View style={{ marginBottom: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
        <Text style={{ fontSize: 10, color: '#666' }}>{label}</Text>
        <Text style={{ fontSize: 10, color, fontVariant: ['tabular-nums'], fontWeight: '600' }}>{value}</Text>
      </View>
      <View style={{ height: 3, backgroundColor: '#E8E8E5' }}>
        <View style={{ height: 3, width: `${value}%`, backgroundColor: color }} />
      </View>
    </View>
  );
}

function AreaCard({
  area, rank, gameDays, onInvest, onVisit, onInspect, onSpecial, loading,
}: {
  area: GoverningArea; rank: number; gameDays: number;
  onInvest: (id: string) => void;
  onVisit: (id: string) => void;
  onInspect: (id: string) => void;
  onSpecial: (id: string) => void;
  loading: string | null;
}) {
  const isLoading = loading === area.id;
  const devLevel = getDevLevelLabel(area.devIndex);
  const rankBadgeColor = rank === 1 ? '#C82829' : rank === 2 ? '#7a5c2a' : rank === 3 ? '#2B4B6F' : '#888';

  const investCd = cooldownLeft(area.lastInvestedDay, gameDays);
  const visitCd = cooldownLeft(area.lastVisitedDay, gameDays);
  const isLagging = area.devIndex < 40;

  return (
    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: isLagging ? '#ffcdd2' : '#D1D1D1', marginBottom: 10, padding: 14 }}>
      {/* 落后标记 */}
      {isLagging && (
        <View style={{ backgroundColor: '#ffebee', paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 }}>
          <Text style={{ fontSize: 10, color: '#C82829', fontWeight: '700' }}>⚠️ 落后辖区 — 建议优先投资扶持</Text>
        </View>
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <View style={{ width: 20, height: 20, backgroundColor: rankBadgeColor, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{rank}</Text>
            </View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A' }}>{area.areaName}</Text>
            <View style={{ backgroundColor: devLevel.bg, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ color: devLevel.color, fontSize: 9, fontWeight: '700' }}>{devLevel.label}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ borderWidth: 1, borderColor: '#D1D1D1', paddingHorizontal: 5, paddingVertical: 1 }}>
              <Text style={{ color: '#888', fontSize: 9 }}>{AREA_TYPE_LABEL[area.areaType]}</Text>
            </View>
            <Text style={{ fontSize: 9, color: '#aaa' }}>好感{area.favorIndex}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 10, color: '#888' }}>综合发展</Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: devLevel.bg, fontVariant: ['tabular-nums'] }}>
            {area.devIndex}
          </Text>
        </View>
      </View>

      <IndexBar label="发展指数" value={area.devIndex} color="#1D2D44" />
      <IndexBar label="群众好感" value={area.favorIndex} color="#2a7a3b" />

      {isLoading ? (
        <ActivityIndicator size="small" color="#1D2D44" style={{ marginTop: 10 }} />
      ) : (
        <View style={{ gap: 6, marginTop: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* 投资拨款 */}
            <Pressable
              onPress={() => onInvest(area.id)}
              disabled={investCd > 0}
              style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: investCd > 0 ? '#E8E8E5' : '#1D2D44' }}
            >
              <Text style={{ color: investCd > 0 ? '#aaa' : '#fff', fontSize: 11, fontWeight: '700' }}>
                {investCd > 0 ? `投资（冷却${investCd}天）` : '投资拨款'}
              </Text>
              <Text style={{ color: investCd > 0 ? '#bbb' : '#aac0d8', fontSize: 9, marginTop: 2 }}>
                {investCd > 0 ? '— 冷却中 —' : '消耗20政绩 · 发展+8'}
              </Text>
            </Pressable>
            {/* 实地走访 */}
            <Pressable
              onPress={() => onVisit(area.id)}
              disabled={visitCd > 0}
              style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: visitCd > 0 ? '#ccc' : '#2a7a3b', backgroundColor: '#fff' }}
            >
              <Text style={{ color: visitCd > 0 ? '#aaa' : '#2a7a3b', fontSize: 11, fontWeight: '700' }}>
                {visitCd > 0 ? `走访（冷却${visitCd}天）` : '实地走访'}
              </Text>
              <Text style={{ color: '#888', fontSize: 9, marginTop: 2 }}>
                {visitCd > 0 ? '— 冷却中 —' : '好感+12 · +8政绩'}
              </Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* 视察检查 */}
            <Pressable
              onPress={() => onInspect(area.id)}
              style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#C82829', backgroundColor: '#fff' }}
            >
              <Text style={{ color: '#C82829', fontSize: 11, fontWeight: '700' }}>视察检查</Text>
              <Text style={{ color: '#888', fontSize: 9, marginTop: 2 }}>发现问题+15政绩</Text>
            </Pressable>
            {/* 特色发展（落后辖区额外增益）*/}
            <Pressable
              onPress={() => onSpecial(area.id)}
              style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: isLagging ? '#C82829' : '#7B5E2A' }}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                {isLagging ? '精准帮扶' : '特色发展'}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, marginTop: 2 }}>
                {isLagging ? '消耗30政绩 · 发展+15' : '消耗25政绩 · 好感+15'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

export default function GoverningAreasScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [areas, setAreas] = useState<GoverningArea[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackOk, setFeedbackOk] = useState(true);
  const [surveying, setSurveying] = useState(false);
  const [sortMode, setSortMode] = useState<'rank' | 'lagging'>('rank');

  const rankLevel = save?.rankLevel ?? 1;
  const currentTier = getAreaTier(rankLevel);
  const gameDays = save?.gameDays ?? 0;

  const showFeedback = (msg: string, ok = true) => {
    setFeedback(msg);
    setFeedbackOk(ok);
    setTimeout(() => setFeedback(''), 3500);
  };

  useFocusEffect(
    useCallback(() => {
      if (!save) return;
      setPageLoading(true);
      getGoverningAreas(save.id).then(async list => {
        const needReinit = list.length === 0 || (list.length > 0 && list[0].areaType !== currentTier);
        if (needReinit) {
          const generated = generateAreas(rankLevel, save.cityName);
          await initGoverningAreas(save.id, save.userId, generated);
          const fresh = await getGoverningAreas(save.id);
          setAreas(fresh);
        } else {
          setAreas(list);
        }
        setPageLoading(false);
      });
    }, [save, rankLevel, currentTier])
  );

  const handleInvest = async (areaId: string) => {
    if (!save) return;
    const area = areas.find(a => a.id === areaId);
    if (!area) return;
    if (cooldownLeft(area.lastInvestedDay, gameDays) > 0) { showFeedback('投资冷却中，请等待30天', false); return; }
    if (save.meritPoints < 20) { showFeedback('政绩值不足（需20）', false); return; }
    setActionLoading(areaId);
    await investArea(areaId, 8);
    await updateGameSave({ meritPoints: save.meritPoints - 20 });
    const fresh = await getGoverningAreas(save.id);
    setAreas(fresh);
    setActionLoading(null);
    showFeedback(`✓ 向${area.areaName}拨款，发展指数+8`, true);
  };

  const handleVisit = async (areaId: string) => {
    if (!save) return;
    const area = areas.find(a => a.id === areaId);
    if (!area) return;
    if (cooldownLeft(area.lastVisitedDay, gameDays) > 0) { showFeedback('走访冷却中，请等待30天', false); return; }
    setActionLoading(areaId);
    await visitArea(areaId, gameDays, 12);
    await updateGameSave({ meritPoints: save.meritPoints + 8 });
    const fresh = await getGoverningAreas(save.id);
    setAreas(fresh);
    setActionLoading(null);
    showFeedback(`✓ 走访${area.areaName}完成，好感+12，获8政绩`, true);
  };

  const handleInspect = async (areaId: string) => {
    if (!save) return;
    const area = areas.find(a => a.id === areaId);
    const foundIssue = Math.random() < 0.5;
    setActionLoading(areaId);
    if (foundIssue) {
      // 视察发现问题：发展指数略降但政绩+好感大增
      await investArea(areaId, -3);
      await updateGameSave({ meritPoints: save.meritPoints + 15, bossFavor: Math.min(100, (save.bossFavor ?? 50) + 3) });
      showFeedback(`⚠️ 在${area?.areaName ?? '辖区'}发现违规问题，启动整改，政绩+15，上司好感+3`, true);
    } else {
      await updateGameSave({ meritPoints: save.meritPoints + 5 });
      showFeedback(`✓ ${area?.areaName ?? '辖区'}工作正常有序，获5政绩`, true);
    }
    const fresh = await getGoverningAreas(save.id);
    setAreas(fresh);
    setActionLoading(null);
  };

  /** 精准帮扶（落后辖区）/ 特色发展 */
  const handleSpecial = async (areaId: string) => {
    if (!save) return;
    const area = areas.find(a => a.id === areaId);
    if (!area) return;
    const isLagging = area.devIndex < 40;
    const cost = isLagging ? 30 : 25;
    if (save.meritPoints < cost) { showFeedback(`政绩不足（需${cost}）`, false); return; }
    setActionLoading(areaId);
    if (isLagging) {
      await investArea(areaId, 15);
      await updateGameSave({ meritPoints: save.meritPoints - cost });
      showFeedback(`✓ 精准帮扶${area.areaName}，发展指数+15`, true);
    } else {
      await visitArea(areaId, gameDays, 15);
      await updateGameSave({ meritPoints: save.meritPoints - cost });
      showFeedback(`✓ ${area.areaName}特色发展启动，好感+15`, true);
    }
    const fresh = await getGoverningAreas(save.id);
    setAreas(fresh);
    setActionLoading(null);
  };

  // 全区普查（消耗50政绩，全辖区发展+3，好感+5）
  const handleSurvey = async () => {
    if (!save) return;
    if (save.meritPoints < 50) { showFeedback('全区普查需50政绩（当前不足）', false); return; }
    setSurveying(true);
    // 并行处理所有辖区，减少等待时间
    await Promise.all(areas.flatMap(area => [
      investArea(area.id, 3),
      visitArea(area.id, gameDays, 5),
    ]));
    await updateGameSave({ meritPoints: save.meritPoints - 50 });
    const fresh = await getGoverningAreas(save.id);
    setAreas(fresh);
    setSurveying(false);
    showFeedback(`✓ 全区普查完成，全辖区发展+3，好感+5，消耗50政绩`, true);
  };

  // 汇总统计
  const avgDevIndex = areas.length > 0 ? Math.round(areas.reduce((s, a) => s + a.devIndex, 0) / areas.length) : 0;
  const avgFavor = areas.length > 0 ? Math.round(areas.reduce((s, a) => s + a.favorIndex, 0) / areas.length) : 0;
  const advancedCount = areas.filter(a => a.devIndex >= 80).length;
  const laggingCount = areas.filter(a => a.devIndex < 40).length;

  const rankedAreas = [...areas].sort((a, b) => b.devIndex - a.devIndex);
  const displayAreas = sortMode === 'lagging'
    ? [...areas].sort((a, b) => a.devIndex - b.devIndex)
    : rankedAreas;

  const tierDesc: Record<GoverningArea['areaType'], string> = {
    village: '村级管理：深入基层，走访群众，推动乡村振兴。',
    town: '乡镇管理：统筹乡镇发展，协调各村工作，推进项目落地。',
    district: '区县管理：推动城乡统筹，优化产业布局，提升整体竞争力。',
    city_level: '地级市管理：全面统筹辖区经济社会发展，做大做强城市影响力。',
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      <StatusBar style="light" backgroundColor="#1D2D44" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#1D2D44', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>GOVERNING AREAS</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>管辖区域</Text>
          </View>
          <Pressable
            onPress={() => void handleSurvey()}
            disabled={surveying}
            style={{ borderWidth: 1, borderColor: '#a0b4cc', paddingHorizontal: 10, paddingVertical: 5 }}
          >
            <Text style={{ color: '#a0b4cc', fontSize: 11, fontWeight: '700' }}>
              {surveying ? '普查中...' : '全区普查-50政'}
            </Text>
          </Pressable>
        </View>
        <Text style={{ color: '#a0b4cc', fontSize: 10 }}>
          {save?.rankName} · {save?.cityName} · {AREA_TYPE_LABEL[currentTier]} · 政绩余额 {save?.meritPoints ?? 0}
        </Text>
      </View>

      {feedback ? (
        <View style={{ backgroundColor: feedbackOk ? '#e8f5e9' : '#ffebee', borderBottomWidth: 1, borderBottomColor: feedbackOk ? '#c8e6c9' : '#ffcdd2', padding: 10 }}>
          <Text style={{ color: feedbackOk ? '#2a7a3b' : '#C82829', fontSize: 12, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      {pageLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#1D2D44" />
          <Text style={{ color: '#888', marginTop: 12, fontSize: 13 }}>加载辖区数据...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }} showsVerticalScrollIndicator={false}>

          {/* 汇总面板 */}
          <View style={{ backgroundColor: '#1D2D44', padding: 14 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2, marginBottom: 10 }}>辖区汇总</Text>
            <View style={{ flexDirection: 'row', gap: 0 }}>
              {[
                { label: '平均发展指数', value: avgDevIndex, color: avgDevIndex >= 60 ? '#81c784' : '#ef9a9a' },
                { label: '平均群众好感', value: avgFavor, color: '#90caf9' },
                { label: '辖区总数', value: areas.length, color: '#fff' },
              ].map((item, i) => (
                <View key={i} style={{ flex: 1, alignItems: 'center', borderRightWidth: i < 2 ? 1 : 0, borderRightColor: 'rgba(255,255,255,0.1)' }}>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: item.color, fontVariant: ['tabular-nums'] }}>{item.value}</Text>
                  <Text style={{ fontSize: 9, color: '#a0b4cc', marginTop: 2, textAlign: 'center' }}>{item.label}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <View style={{ flex: 1, backgroundColor: 'rgba(42,122,59,0.25)', padding: 8, alignItems: 'center' }}>
                <Text style={{ color: '#81c784', fontSize: 16, fontWeight: '700' }}>{advancedCount}</Text>
                <Text style={{ color: '#a0b4cc', fontSize: 9 }}>先进辖区(≥80)</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: 'rgba(200,40,41,0.25)', padding: 8, alignItems: 'center' }}>
                <Text style={{ color: '#ef9a9a', fontSize: 16, fontWeight: '700' }}>{laggingCount}</Text>
                <Text style={{ color: '#a0b4cc', fontSize: 9 }}>落后辖区(&lt;40)</Text>
              </View>
              <Pressable
                onPress={() => setSortMode(m => m === 'rank' ? 'lagging' : 'rank')}
                style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', padding: 8, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                  {sortMode === 'rank' ? '📉 看落后' : '📈 看排行'}
                </Text>
                <Text style={{ color: '#a0b4cc', fontSize: 9, marginTop: 2 }}>切换排序</Text>
              </Pressable>
            </View>
          </View>

          {/* 排行榜（前3）*/}
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>发展排行榜 TOP 3</Text>
            {rankedAreas.slice(0, 3).map((area, i) => {
              const devLevel = getDevLevelLabel(area.devIndex);
              const medalColors = ['#C82829', '#7a5c2a', '#2B4B6F'];
              return (
                <View key={area.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: '#F0EEEA' }}>
                  <View style={{ width: 24, height: 24, backgroundColor: medalColors[i], alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{i + 1}</Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 13, color: '#222', fontWeight: '600' }}>{area.areaName}</Text>
                  <View style={{ backgroundColor: devLevel.bg, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{devLevel.label}</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: devLevel.bg, fontVariant: ['tabular-nums'], minWidth: 30, textAlign: 'right' }}>
                    {area.devIndex}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* 辖区描述 */}
          <View style={{ backgroundColor: '#EEF2F7', borderWidth: 1, borderColor: '#D0DCE8', padding: 12 }}>
            <Text style={{ fontSize: 11, color: '#1D2D44', lineHeight: 18 }}>
              {tierDesc[currentTier]}共{areas.length}个{AREA_TYPE_LABEL[currentTier]}。
              投资/走访有30天冷却，视察随机触发整改，精准帮扶可加速落后辖区发展。
            </Text>
          </View>

          {/* 辖区列表 */}
          {displayAreas.map((area, idx) => (
            <AreaCard
              key={area.id}
              area={area}
              rank={sortMode === 'rank' ? idx + 1 : rankedAreas.findIndex(a => a.id === area.id) + 1}
              gameDays={gameDays}
              onInvest={handleInvest}
              onVisit={handleVisit}
              onInspect={handleInspect}
              onSpecial={handleSpecial}
              loading={actionLoading}
            />
          ))}

          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </View>
  );
}
```

<a id="srcappapphealthtsx"></a>
## `src/app/(app)/health.tsx`

```tsx
// 健康精力管理 + 党校培训 Tab
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import {
  getPlayerHealth, restoreHealth, ensurePlayerHealth,
  trainAtPartySchool, getPartySchoolRecords, getPartySchoolQuota,
} from '@/db/gameApi';
import {
  PARTY_SCHOOL_CONFIG,
  RANK_MONTHLY_HEALTH_REGEN,
  RANK_DAILY_ENERGY_BONUS,
  RANK_MEDICAL_TIER,
  ASSET_HEALTH_BONUS,
} from '@/types/game';
import type { PlayerHealth, PartySchoolRecord, PartySchoolLevel } from '@/types/game';

type Tab = 'health' | 'train';

// ── 进度条组件 ─────────────────────────────────────────────────
function GaugeBar({
  value, max = 100, color, label, sublabel,
}: { value: number; max?: number; color: string; label: string; sublabel?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  const statusColor = pct >= 70 ? '#2a5a3e' : pct >= 40 ? '#C05521' : '#C82829';
  const statusText = pct >= 70 ? '良好' : pct >= 40 ? '偏低' : '危险';
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#1A1A1A' }}>{label}</Text>
          {sublabel ? <Text style={{ fontSize: 9, color: '#888' }}>{sublabel}</Text> : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ backgroundColor: statusColor + '22', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 2 }}>
            <Text style={{ fontSize: 9, color: statusColor, fontWeight: '700' }}>{statusText}</Text>
          </View>
          <Text style={{ fontSize: 16, fontWeight: '800', color, fontFamily: 'monospace' }}>{value}</Text>
          <Text style={{ fontSize: 10, color: '#aaa' }}>/{max}</Text>
        </View>
      </View>
      <View style={{ height: 8, backgroundColor: '#F0EDE8', borderRadius: 4, overflow: 'hidden' }}>
        <View style={{ height: 8, width: `${pct}%`, backgroundColor: color, borderRadius: 4 }} />
      </View>
    </View>
  );
}

// ── 信息卡 ──────────────────────────────────────────────────
function InfoCard({ headerColor, title, emoji, children }: { headerColor: string; title: string; emoji: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', borderRadius: 2, overflow: 'hidden' }}>
      <View style={{ backgroundColor: headerColor, paddingHorizontal: 14, paddingVertical: 9 }}>
        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 }}>{emoji} {title}</Text>
      </View>
      <View style={{ padding: 14 }}>{children}</View>
    </View>
  );
}

// ── 分割线 ───────────────────────────────────────────────────
function Divider() {
  return <View style={{ height: 1, backgroundColor: '#F0EDE8', marginVertical: 6 }} />;
}

// ── 明细行 ───────────────────────────────────────────────────
function DetailRow({ label, value, color = '#1A1A1A', sign }: { label: string; value: string | number; color?: string; sign?: '+' | '-' }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 }}>
      <Text style={{ fontSize: 10, color: '#666' }}>{label}</Text>
      <Text style={{ fontSize: 11, fontWeight: '600', color, fontFamily: 'monospace' }}>
        {sign}{value}
      </Text>
    </View>
  );
}

const LEVEL_ORDER: PartySchoolLevel[] = ['county', 'city', 'basic', 'middle', 'advanced', 'national'];

export default function HealthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save } = useGame();
  const [tab, setTab] = useState<Tab>('health');
  const [health, setHealth] = useState<PlayerHealth | null>(null);
  const [records, setRecords] = useState<PartySchoolRecord[]>([]);
  const [quota, setQuota] = useState<{ usedCount: number; quotaLimit: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionFeedback, setActionFeedback] = useState('');
  const [trainFeedback, setTrainFeedback] = useState('');
  const [confirmTrain, setConfirmTrain] = useState<PartySchoolLevel | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<'rest' | 'exercise' | 'sanatorium' | null>(null);

  const gameYear = save ? Math.floor(save.gameDays / 365) + 1 : 1;
  const rankLevel = save?.rankLevel ?? 1;
  const playerAge = save?.playerAge ?? 30;
  const assets = save?.personalAssets ?? [];

  useFocusEffect(useCallback(() => {
    if (!save) return;
    void (async () => {
      setLoading(true);
      const [h, rec, q] = await Promise.all([
        ensurePlayerHealth(save.id),
        getPartySchoolRecords(save.id),
        getPartySchoolQuota(save.id, gameYear, save.rankLevel),
      ]);
      setHealth(h);
      setRecords(rec);
      setQuota(q);
      setLoading(false);
    })();
  }, [save]));

  const handleRestore = async (type: 'rest' | 'exercise' | 'sanatorium') => {
    if (!save || !health) return;
    setConfirmRestore(null);
    const ok = await restoreHealth(save.id, type, save.gameDays);
    if (ok) {
      const h = await getPlayerHealth(save.id);
      if (h) setHealth(h);
      const msgs: Record<typeof type, string> = {
        rest:       '✅ 休假完成，健康+10，精力+30',
        exercise:   '✅ 锻炼完成，健康+5，精力+10',
        sanatorium: '✅ 疗养完成，健康+25，精力+50',
      };
      setActionFeedback(msgs[type]);
      setTimeout(() => setActionFeedback(''), 3500);
    }
  };

  const handleTrain = async (level: PartySchoolLevel) => {
    if (!save || !quota) return;
    const result = await trainAtPartySchool(
      save.id, level, 'player', null, save.playerName,
      save.gameDays, gameYear, save.rankLevel, save.meritPoints,
    );
    setTrainFeedback(result.success ? `✅ ${result.msg}` : `❌ ${result.msg}`);
    if (result.success) {
      const [rec, q] = await Promise.all([
        getPartySchoolRecords(save.id),
        getPartySchoolQuota(save.id, gameYear, save.rankLevel),
      ]);
      setRecords(rec);
      setQuota(q);
    }
    setConfirmTrain(null);
    setTimeout(() => setTrainFeedback(''), 4000);
  };

  if (!save) return null;

  // ── 月度健康加成明细计算（与 gameApi monthlyHealthRegen 保持一致，仅展示用）──
  const rankHealthBase = RANK_MONTHLY_HEALTH_REGEN[rankLevel] ?? 1;
  const assetHealthBonus = assets.reduce((acc, key) => acc + (ASSET_HEALTH_BONUS[key]?.healthBonus ?? 0), 0);
  const agePenalty = Math.max(0, Math.floor((playerAge - 50) / 5));
  const fatiguePenalty = health && health.energy < 30 ? 3 : health && health.energy < 60 ? 1 : 0;
  const totalMonthlyHealthDelta = rankHealthBase + assetHealthBonus - agePenalty - fatiguePenalty;

  const rankEnergyBonus = RANK_DAILY_ENERGY_BONUS[rankLevel] ?? 0;
  const assetEnergyBonus = assets.reduce((acc, key) => acc + (ASSET_HEALTH_BONUS[key]?.energyBonusDaily ?? 0), 0);
  const totalDailyEnergy = 5 + rankEnergyBonus + Math.round(assetEnergyBonus);

  const medicalTier = RANK_MEDICAL_TIER[rankLevel];

  // ── 已完成培训证书列表 ──
  const completedRecords = records.filter(r => r.isComplete && r.targetType === 'player');

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      <StatusBar style="light" />

      {/* ── 标题栏 ── */}
      <View style={{
        backgroundColor: '#1D3B6C', paddingTop: insets.top + 8, paddingBottom: 14,
        paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10,
      }}>
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <Text style={{ color: '#B8C8E0', fontSize: 18 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#B8C8E0', fontSize: 10, letterSpacing: 1.5 }}>HEALTH & TRAINING</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>健康管理 · 党校培训</Text>
        </View>
        {health?.isOnLeave && (
          <View style={{ backgroundColor: '#C82829', paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>因病休假中</Text>
          </View>
        )}
      </View>

      {/* ── Tab ── */}
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#DDD' }}>
        {([['health', '🏥 健康精力'], ['train', '🏛️ 党校培训']] as [Tab, string][]).map(([t, label]) => (
          <Pressable key={t} onPress={() => setTab(t)}
            style={{ flex: 1, paddingVertical: 11, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: tab === t ? '#1D3B6C' : 'transparent' }}>
            <Text style={{ fontSize: 12, color: tab === t ? '#1D3B6C' : '#888', fontWeight: tab === t ? '700' : '400' }}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#1D3B6C" />
        </View>
      ) : (
        <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
          <View style={{ padding: 14, gap: 12 }}>

            {/* ════════════════ 健康精力 Tab ════════════════ */}
            {tab === 'health' && (
              <>
                {/* 反馈提示 */}
                {!!actionFeedback && (
                  <View style={{ backgroundColor: '#F0FFF4', borderWidth: 1, borderColor: '#7BAD7E', padding: 12, borderRadius: 2 }}>
                    <Text style={{ fontSize: 12, color: '#2a5a3e', textAlign: 'center', fontWeight: '600' }}>{actionFeedback}</Text>
                  </View>
                )}

                {/* 状态面板 */}
                {health && (
                  <InfoCard headerColor="#1D3B6C" title="当前身体状况" emoji="💊">
                    <View style={{ gap: 14 }}>
                      <GaugeBar
                        value={health.health} color="#C82829" label="健康值"
                        sublabel={`月度净变化 ${totalMonthlyHealthDelta >= 0 ? '+' : ''}${totalMonthlyHealthDelta}/月`}
                      />
                      <GaugeBar
                        value={health.energy} color="#1D3B6C" label="精力值"
                        sublabel={`每日恢复 +${totalDailyEnergy}`}
                      />
                    </View>

                    {health.isOnLeave && (
                      <View style={{ backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: '#F5B7B1', padding: 10, marginTop: 12, borderRadius: 2 }}>
                        <Text style={{ fontSize: 12, color: '#C82829', textAlign: 'center', fontWeight: '600' }}>
                          ⚕️ 因病休假中，无法处理公务
                          {health.leaveEndDay ? `（第 ${health.leaveEndDay} 天结束）` : ''}
                        </Text>
                      </View>
                    )}
                    {health.health < 30 && !health.isOnLeave && (
                      <View style={{ backgroundColor: '#FFF8EE', borderWidth: 1, borderColor: '#F5B041', padding: 10, marginTop: 10, borderRadius: 2 }}>
                        <Text style={{ fontSize: 11, color: '#875A12', lineHeight: 16 }}>
                          ⚠️ 健康值过低！工作效率下降20%。继续高强度工作将触发强制休假（7天）。
                        </Text>
                      </View>
                    )}
                    {health.energy < 30 && (
                      <View style={{ backgroundColor: '#FFFBF0', borderWidth: 1, borderColor: '#F5B041', padding: 10, marginTop: 10, borderRadius: 2 }}>
                        <Text style={{ fontSize: 11, color: '#875A12', lineHeight: 16 }}>
                          😴 精力严重不足！处理事件将额外消耗健康值，建议尽快休假恢复。
                        </Text>
                      </View>
                    )}
                  </InfoCard>
                )}

                {/* 月度健康加成明细 */}
                <InfoCard headerColor="#2a5a3e" title="月度健康变化明细" emoji="📊">
                  <Text style={{ fontSize: 10, color: '#888', marginBottom: 8 }}>每推进一个游戏月，健康值自动结算一次</Text>
                  <DetailRow label={`${medicalTier?.emoji ?? '🏥'} 医疗保健基础（${medicalTier?.tier ?? ''}）`} value={rankHealthBase} sign="+" color="#2a5a3e" />
                  {assetHealthBonus > 0 && (
                    <DetailRow label="资产环境加成（住房/健检/健身）" value={assetHealthBonus} sign="+" color="#1D3B6C" />
                  )}
                  {agePenalty > 0 && (
                    <DetailRow label={`年龄衰减（${playerAge}岁，每超50岁+5年 -1）`} value={agePenalty} sign="-" color="#C05521" />
                  )}
                  {fatiguePenalty > 0 && (
                    <DetailRow label="疲劳惩罚（精力过低）" value={fatiguePenalty} sign="-" color="#C82829" />
                  )}
                  <Divider />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: totalMonthlyHealthDelta >= 0 ? '#F0F8F4' : '#FFF5F5', padding: 8, borderRadius: 2 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#1A1A1A' }}>月净变化</Text>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: totalMonthlyHealthDelta >= 0 ? '#2a5a3e' : '#C82829', fontFamily: 'monospace' }}>
                      {totalMonthlyHealthDelta >= 0 ? '+' : ''}{totalMonthlyHealthDelta}
                    </Text>
                  </View>
                </InfoCard>

                {/* 精力恢复明细 */}
                <InfoCard headerColor="#2B4B6F" title="每日精力恢复明细" emoji="⚡">
                  <DetailRow label="基础自然恢复" value={5} sign="+" color="#2B4B6F" />
                  {rankEnergyBonus > 0 && (
                    <DetailRow label={`职级待遇加成（${save.rankLevel}级）`} value={rankEnergyBonus} sign="+" color="#1D3B6C" />
                  )}
                  {Math.round(assetEnergyBonus) > 0 && (
                    <DetailRow label="资产生活质量加成" value={Math.round(assetEnergyBonus)} sign="+" color="#7C3AED" />
                  )}
                  <Divider />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0F4F8', padding: 8, borderRadius: 2 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#1A1A1A' }}>日恢复量</Text>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#2B4B6F', fontFamily: 'monospace' }}>+{totalDailyEnergy}/天</Text>
                  </View>
                </InfoCard>

                {/* 医疗级别卡 */}
                {medicalTier && (
                  <InfoCard headerColor="#7C3AED" title="专属医疗保健配置" emoji={medicalTier.emoji}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                      <Text style={{ fontSize: 32 }}>{medicalTier.emoji}</Text>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#7C3AED' }}>{medicalTier.tier}</Text>
                        <Text style={{ fontSize: 10, color: '#555', lineHeight: 16 }}>{medicalTier.desc}</Text>
                      </View>
                    </View>
                    {rankLevel < 7 && (
                      <View style={{ backgroundColor: '#F5F0FF', padding: 8, borderRadius: 2, marginTop: 10 }}>
                        <Text style={{ fontSize: 10, color: '#7C3AED', lineHeight: 15 }}>
                          💡 晋升至副厅级（Rank 7）可享有市级专属保健医生，月度健康恢复+6
                        </Text>
                      </View>
                    )}
                  </InfoCard>
                )}

                {/* 恢复操作 */}
                <InfoCard headerColor="#1A1A1A" title="主动恢复操作" emoji="🔋">
                  <View style={{ gap: 10 }}>
                    {/* 休假 */}
                    <Pressable
                      onPress={() => !health?.isOnLeave && setConfirmRestore('rest')}
                      style={{
                        borderWidth: 1, borderColor: '#2a5a3e', borderRadius: 2, padding: 12,
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        opacity: health?.isOnLeave ? 0.45 : 1,
                        backgroundColor: health?.isOnLeave ? '#F5F4F1' : '#F8FFF8',
                      }}
                      android_ripple={{ color: 'rgba(42,90,62,0.1)' }}>
                      <Text style={{ fontSize: 28 }}>🛌</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#2a5a3e' }}>居家休假</Text>
                        <Text style={{ fontSize: 9, color: '#888', marginTop: 2 }}>消耗 3 游戏天 · 健康 +10 · 精力 +30</Text>
                      </View>
                      <View style={{ backgroundColor: '#2a5a3e', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 2 }}>
                        <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>立即休息</Text>
                      </View>
                    </Pressable>

                    {/* 锻炼 */}
                    <Pressable
                      onPress={() => !health?.isOnLeave && setConfirmRestore('exercise')}
                      style={{
                        borderWidth: 1, borderColor: '#1D3B6C', borderRadius: 2, padding: 12,
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        opacity: health?.isOnLeave ? 0.45 : 1,
                        backgroundColor: health?.isOnLeave ? '#F5F4F1' : '#F0F4FF',
                      }}
                      android_ripple={{ color: 'rgba(29,59,108,0.1)' }}>
                      <Text style={{ fontSize: 28 }}>🏃</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D3B6C' }}>坚持锻炼</Text>
                        <Text style={{ fontSize: 9, color: '#888', marginTop: 2 }}>消耗 1 游戏天 · 健康 +5 · 精力 +10</Text>
                      </View>
                      <View style={{ backgroundColor: '#1D3B6C', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 2 }}>
                        <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>去锻炼</Text>
                      </View>
                    </Pressable>

                    {/* 疗养（厅级及以上） */}
                    {rankLevel >= 7 ? (
                      <Pressable
                        onPress={() => !health?.isOnLeave && setConfirmRestore('sanatorium')}
                        style={{
                          borderWidth: 1, borderColor: '#7B3F00', borderRadius: 2, padding: 12,
                          flexDirection: 'row', alignItems: 'center', gap: 12,
                          opacity: health?.isOnLeave ? 0.45 : 1,
                          backgroundColor: health?.isOnLeave ? '#F5F4F1' : '#FFF8F0',
                        }}
                        android_ripple={{ color: 'rgba(123,63,0,0.1)' }}>
                        <Text style={{ fontSize: 28 }}>🏖️</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#7B3F00' }}>干部疗养</Text>
                          <Text style={{ fontSize: 9, color: '#888', marginTop: 2 }}>消耗 7 游戏天 · 健康 +25 · 精力 +50</Text>
                          <Text style={{ fontSize: 9, color: '#7B3F00', marginTop: 1 }}>仅厅级及以上干部享有</Text>
                        </View>
                        <View style={{ backgroundColor: '#7B3F00', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 2 }}>
                          <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>预约疗养</Text>
                        </View>
                      </Pressable>
                    ) : (
                      <View style={{ borderWidth: 1, borderColor: '#E8E5E0', borderStyle: 'dashed', borderRadius: 2, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={{ fontSize: 24, opacity: 0.4 }}>🏖️</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11, color: '#bbb', fontWeight: '600' }}>干部疗养（锁定）</Text>
                          <Text style={{ fontSize: 9, color: '#ccc', marginTop: 2 }}>晋升至副厅级（Rank 7）解锁，健康+25 精力+50</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </InfoCard>

                {/* 健康系统说明 */}
                <InfoCard headerColor="#555" title="健康系统说明" emoji="📖">
                  <View style={{ gap: 4 }}>
                    {[
                      '精力每天自然恢复（基础5点 + 职级加成），处理事件/开会消耗精力',
                      '精力耗尽后，继续工作将额外消耗健康值',
                      '每推进一个月，按职级医疗保健等级自动恢复健康',
                      '健康值低于30时，所有工作效率降低20%',
                      '健康值降至20以下，强制触发7天「因病休假」，休假期间健康自动恢复至50',
                      '年龄超过50岁后，月度健康衰减加速（每增5岁多衰减1点）',
                      '购置健身房会员、高档住宅、定期体检等资产可提升月度健康恢复量',
                    ].map((tip, i) => (
                      <Text key={i} style={{ fontSize: 10, color: '#888', lineHeight: 16 }}>
                        • {tip}
                      </Text>
                    ))}
                  </View>
                </InfoCard>
              </>
            )}

            {/* ════════════════ 党校培训 Tab ════════════════ */}
            {tab === 'train' && (
              <>
                {/* 名额状态 */}
                {quota && (
                  <View style={{
                    backgroundColor: '#EEF4FF', borderWidth: 1, borderColor: '#B8CCF0', padding: 12, borderRadius: 2,
                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <View>
                      <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '700' }}>本年度培训名额</Text>
                      <Text style={{ fontSize: 10, color: '#5577AA', marginTop: 2 }}>
                        第 {gameYear} 年 · 已用 {quota.usedCount}/{quota.quotaLimit}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 5 }}>
                      {Array.from({ length: quota.quotaLimit }).map((_, i) => (
                        <View key={i} style={{
                          width: 18, height: 18, borderRadius: 9,
                          backgroundColor: i < quota.usedCount ? '#C82829' : '#1D3B6C',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Text style={{ fontSize: 8, color: '#fff', fontWeight: '700' }}>{i < quota.usedCount ? '✓' : String(i + 1)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* 反馈 */}
                {!!trainFeedback && (
                  <View style={{
                    backgroundColor: trainFeedback.startsWith('✅') ? '#F0FFF0' : '#FFF0F0',
                    borderWidth: 1, borderColor: trainFeedback.startsWith('✅') ? '#7BAD7E' : '#F5B7B1',
                    padding: 12, borderRadius: 2,
                  }}>
                    <Text style={{ fontSize: 12, color: trainFeedback.startsWith('✅') ? '#2a5a3e' : '#C82829', textAlign: 'center' }}>
                      {trainFeedback}
                    </Text>
                  </View>
                )}

                {/* 培训课程卡 */}
                {LEVEL_ORDER.map(level => {
                  const cfg = PARTY_SCHOOL_CONFIG[level];
                  const canApply = (save.rankLevel >= cfg.minRank) && (quota ? quota.usedCount < quota.quotaLimit : false);
                  const activeRecord = records.find(r => r.trainLevel === level && !r.isComplete);
                  const doneRecord = completedRecords.find(r => r.trainLevel === level);
                  const locked = save.rankLevel < cfg.minRank;
                  return (
                    <View key={level} style={{
                      backgroundColor: '#fff', borderWidth: 1, borderColor: locked ? '#E8E5E0' : '#D9D9D9',
                      borderRadius: 2, overflow: 'hidden',
                      opacity: locked ? 0.65 : 1,
                    }}>
                      {/* 卡头 */}
                      <View style={{ backgroundColor: locked ? '#888' : cfg.color, padding: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>
                            {cfg.label} · {cfg.schoolName}
                          </Text>
                          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 9 }}>{cfg.fullName}</Text>
                          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 9, marginTop: 1 }}>
                            最低 Rank {cfg.minRank} · 培训 {cfg.durationDays} 天 · 消耗 {cfg.costResource} 政治资源
                          </Text>
                        </View>
                        <View style={{ gap: 3, alignItems: 'flex-end' }}>
                          {activeRecord && (
                            <View style={{ backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 2 }}>
                              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>培训中</Text>
                            </View>
                          )}
                          {doneRecord && (
                            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 2 }}>
                              <Text style={{ color: '#fff', fontSize: 9 }}>✓ 已完成</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* 卡体 */}
                      <View style={{ padding: 12, gap: 10 }}>
                        <Text style={{ fontSize: 10, color: '#555', lineHeight: 15 }}>{cfg.desc}</Text>

                        {/* 效果标签 */}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                          <View style={{ backgroundColor: '#F0FFF0', paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: '#7BAD7E', borderRadius: 2 }}>
                            <Text style={{ fontSize: 9, color: '#2a5a3e', fontWeight: '600' }}>能力 +{cfg.abilityBonus}</Text>
                          </View>
                          <View style={{ backgroundColor: '#F0F4FF', paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: '#B8CCF0', borderRadius: 2 }}>
                            <Text style={{ fontSize: 9, color: '#1D3B6C', fontWeight: '600' }}>忠诚 +{cfg.loyaltyBonus}</Text>
                          </View>
                          {cfg.promoteBonus > 0 && (
                            <View style={{ backgroundColor: '#FFF8EE', paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: '#F5B041', borderRadius: 2 }}>
                              <Text style={{ fontSize: 9, color: '#875A12', fontWeight: '600' }}>晋升分 +{cfg.promoteBonus}</Text>
                            </View>
                          )}
                          {cfg.networkBonus > 0 && (
                            <View style={{ backgroundColor: '#FFF0F8', paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: '#F5B7E0', borderRadius: 2 }}>
                              <Text style={{ fontSize: 9, color: '#8B1A5E', fontWeight: '600' }}>上司好感 +{cfg.networkBonus}</Text>
                            </View>
                          )}
                          <View style={{ backgroundColor: '#F8F8F8', paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: '#DDD', borderRadius: 2 }}>
                            <Text style={{ fontSize: 9, color: '#555' }}>📜 {cfg.certName}</Text>
                          </View>
                        </View>

                        {/* 按钮区 */}
                        {confirmTrain === level ? (
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <Pressable onPress={() => setConfirmTrain(null)}
                              style={{ flex: 1, borderWidth: 1, borderColor: '#DDD', padding: 10, alignItems: 'center', borderRadius: 2 }}>
                              <Text style={{ fontSize: 12, color: '#888' }}>取消</Text>
                            </Pressable>
                            <Pressable onPress={() => void handleTrain(level)}
                              style={{ flex: 2, backgroundColor: cfg.color, padding: 10, alignItems: 'center', borderRadius: 2 }}>
                              <Text style={{ fontSize: 12, color: '#fff', fontWeight: '700' }}>
                                确认报名（扣 {cfg.costResource} 资源）
                              </Text>
                            </Pressable>
                          </View>
                        ) : (
                          <Pressable
                            onPress={() => canApply && !activeRecord ? setConfirmTrain(level) : undefined}
                            style={{
                              backgroundColor: canApply && !activeRecord ? cfg.color : '#E8E5E0',
                              padding: 10, alignItems: 'center', borderRadius: 2,
                            }}
                            android_ripple={{ color: 'rgba(0,0,0,0.12)' }}>
                            <Text style={{ fontSize: 12, color: canApply && !activeRecord ? '#fff' : '#AAA', fontWeight: '600' }}>
                              {activeRecord
                                ? `培训进行中（${activeRecord.startGameDay} → ${activeRecord.endGameDay} 天）`
                                : locked
                                  ? `🔒 需达到 Rank ${cfg.minRank}`
                                  : !canApply ? '今年名额已用完'
                                  : '申报参加培训'}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  );
                })}

                {/* 结业证书墙 */}
                {completedRecords.length > 0 && (
                  <InfoCard headerColor="#7B3F00" title={`结业证书（${completedRecords.length} 枚）`} emoji="🏅">
                    <View style={{ gap: 8 }}>
                      {completedRecords.map(r => {
                        const cfg = PARTY_SCHOOL_CONFIG[r.trainLevel];
                        return (
                          <View key={r.id} style={{
                            flexDirection: 'row', alignItems: 'center', gap: 10,
                            backgroundColor: '#FFFBF4', padding: 10, borderRadius: 2,
                            borderLeftWidth: 3, borderLeftColor: cfg?.color ?? '#7B3F00',
                          }}>
                            <Text style={{ fontSize: 22 }}>📜</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 11, fontWeight: '700', color: '#1A1A1A' }}>{r.certName}</Text>
                              <Text style={{ fontSize: 9, color: '#888', marginTop: 2 }}>
                                第 {Math.floor(r.endGameDay / 365) + 1} 年结业 · 能力+{r.abilityBonus} 忠诚+{r.loyaltyBonus}
                                {r.promoteBonus > 0 ? ` 晋升分+${r.promoteBonus}` : ''}
                                {r.networkBonus > 0 ? ` 人脉+${r.networkBonus}` : ''}
                              </Text>
                            </View>
                            <View style={{ backgroundColor: cfg?.color ?? '#7B3F00', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 2 }}>
                              <Text style={{ fontSize: 8, color: '#fff', fontWeight: '700' }}>{cfg?.label ?? ''}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </InfoCard>
                )}

                {/* 培训说明 */}
                <InfoCard headerColor="#555" title="党校培训制度说明" emoji="📖">
                  <View style={{ gap: 4 }}>
                    {[
                      '党校培训是干部晋升的重要资质，完成后直接提升能力、忠诚度与晋升评分',
                      '高级班（省委党校、中央党校）可建立跨地区干部人脉，提升上司好感度',
                      '每年培训名额有限，职级越高名额越多（科级2个/县级3个/厅级4个/部级5个）',
                      '县委党校科级班就近参加，耗时短；中央党校高级班耗时长但效果显著',
                      '中央党校（国家行政学院）研修班为正部级及以上最高培训规格，仅限极少数干部',
                      '培训期间计入游戏天数，请合理规划；在职培训不影响日常工作推进',
                    ].map((tip, i) => (
                      <Text key={i} style={{ fontSize: 10, color: '#888', lineHeight: 16 }}>• {tip}</Text>
                    ))}
                  </View>
                </InfoCard>
              </>
            )}

            <View style={{ height: 32 }} />
          </View>
        </ScrollView>
      )}

      {/* ── 操作确认弹窗 ── */}
      {confirmRestore && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
          paddingHorizontal: 24,
        }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 2, overflow: 'hidden', width: '100%', maxWidth: 380 }}>
            <View style={{ backgroundColor: '#1A1A1A', paddingHorizontal: 16, paddingVertical: 12 }}>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 2 }}>确认操作</Text>
            </View>
            <View style={{ padding: 16 }}>
              {confirmRestore === 'rest' && (
                <>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 }}>🛌 居家休假</Text>
                  <Text style={{ fontSize: 12, color: '#555', lineHeight: 18 }}>
                    休假 3 个游戏天，健康 +10，精力 +30。{'\n'}休假期间不推进工作日程，请确认。
                  </Text>
                </>
              )}
              {confirmRestore === 'exercise' && (
                <>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 }}>🏃 坚持锻炼</Text>
                  <Text style={{ fontSize: 12, color: '#555', lineHeight: 18 }}>
                    消耗 1 个游戏天，健康 +5，精力 +10。{'\n'}养成锻炼习惯有助于长期健康管理。
                  </Text>
                </>
              )}
              {confirmRestore === 'sanatorium' && (
                <>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 }}>🏖️ 干部疗养</Text>
                  <Text style={{ fontSize: 12, color: '#555', lineHeight: 18 }}>
                    疗养 7 个游戏天，健康 +25，精力 +50。{'\n'}仅厅级及以上干部享有此待遇，效果显著。
                  </Text>
                </>
              )}
            </View>
            <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F0EDE8' }}>
              <Pressable
                onPress={() => setConfirmRestore(null)}
                style={{ flex: 1, paddingVertical: 13, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#F0EDE8' }}
                android_ripple={{ color: 'rgba(0,0,0,0.08)' }}>
                <Text style={{ fontSize: 13, color: '#888' }}>取消</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleRestore(confirmRestore)}
                style={{ flex: 1, paddingVertical: 13, alignItems: 'center', backgroundColor: '#1D3B6C' }}
                android_ripple={{ color: 'rgba(255,255,255,0.2)' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>确认执行</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
```

<a id="srcappapphometsx"></a>
## `src/app/(app)/home.tsx`

```tsx
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
```

<a id="srcappappillicitassetstsx"></a>
## `src/app/(app)/illicit-assets.tsx`

```tsx
// 涉案资产页面（复用通用玩法模板）
import { useCallback } from 'react';
import { useGame } from '@/ctx/GameContext';
import { GameplayCardList } from '@/components/GameplayCardList';
import { executeGameplayAction } from '@/lib/gameplayApi';
import type { GameplayConfig, GameplayCategory } from '@/types/game';

const TABS: { key: GameplayCategory; label: string }[] = [
  { key: 'asset_hiding', label: '灰色资产' },
  { key: 'asset_transfer', label: '转移销赃' },
];

export default function IllicitAssetsScreen() {
  const { save, updateGameSave, refreshSave } = useGame();

  const onAction = useCallback(async (config: GameplayConfig) => {
    if (!save) return { ok: false, message: '存档未加载' };
    const res = await executeGameplayAction(save.id, config);
    if (res.gameOver) {
      await updateGameSave({ gameOverType: res.gameOver });
    }
    await refreshSave();
    return { ok: res.success, message: res.message };
  }, [save, updateGameSave, refreshSave]);

  return (
    <GameplayCardList
      title="涉案资产"
      subtitle="管理非法所得的存放与洗白，影响追缴率与证据链"
      tabs={TABS}
      onAction={onAction}
    />
  );
}
```

<a id="srcappappinterrogationtsx"></a>
## `src/app/(app)/interrogation.tsx`

```tsx
// 接受组织审查页面：调查阶段状态 + 审查进展 + 供述选择
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getRankTheme } from '@/lib/rankTheme';
import { updateSave } from '@/db/gameApi';
import type { InvestState } from '@/types/game';

const STAGE_LABEL: Record<InvestState, string> = {
  none: '暂无调查',
  fuhan: '谈话函询',
  chushi: '初步核实',
  liangan: '立案审查',
  liuzhi: '留置调查',
};

const STAGE_DESC: Record<InvestState, string> = {
  none: '当前未进入组织审查程序，请保持廉洁自律。',
  fuhan: '纪检监察委员会已对你展开谈话函询，请配合说明问题。',
  chushi: '调查组已进驻单位进行初步核实，核实进度持续推进。',
  liangan: '已进入立案审查（双规）阶段，需在规定时间地点交代问题。',
  liuzhi: '已移送监察机关留置，剥夺行动自由，只能靠自身应对。',
};

// 供述选择（文档第七章 6 选 1，缺失数值合理推算）
const STRATEGIES = [
  { id: 'deny', name: '咬死不承认', icon: '🤐', desc: '本轮供述压力≤70时60%扛过；>70触发从重。' },
  { id: 'minimize', name: '避重就轻', icon: '🎭', desc: '承认小问题否认大问题，供述压力-15，线索+5。' },
  { id: 'confess', name: '全盘托出', icon: '🤝', desc: '坦白从宽：供述压力清零，量刑降档。' },
  { id: 'divert', name: '转移话题', icon: '🗣️', desc: '谈政绩谈苦劳，供述压力-5，消耗1次机会。' },
  { id: 'confront', name: '强硬对抗', icon: '😤', desc: '供述压力-20但触发纪律惩戒（政绩-30，民心-5）。' },
  { id: 'report', name: '举报立功', icon: '🎖️', desc: '供出更大老虎，换取大幅减刑/保护。' },
];

export default function InterrogationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave, refreshSave } = useGame();
  const theme = getRankTheme(save?.rankLevel ?? 1);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const state: InvestState = save?.investState ?? 'none';
  const risk = save?.riskValue ?? 0;
  const clue = save?.clueLevel ?? 0;
  const counter = save?.counterIntel ?? 10;
  const testimony = save?.testimonyChain ?? 0;
  const custody = save?.custodyDays ?? 0;

  // 供述压力公式（文档第七章）
  const pressure = Math.round(clue * 0.5 + testimony * 0.3 + 2 - counter * 0.3);

  const handleStrategy = async (sid: string) => {
    if (!save || state === 'none' || busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      const updates: Record<string, number | string> = {};
      let msg = '';
      if (sid === 'deny') {
        const roll = Math.random() * 100;
        const pass = pressure <= 70 && roll < 60;
        if (pass) {
          updates.risk_value = Math.max(0, risk - 5);
          msg = '本轮成功扛过，审查继续。';
        } else {
          updates.clue_level = Math.min(100, clue + 15);
          updates.risk_value = Math.min(100, risk + 10);
          msg = pressure > 70 ? '供述压力过高，触发从重情节！' : '未能扛过，线索+15，风险上升。';
        }
      } else if (sid === 'minimize') {
        updates.clue_level = Math.min(100, clue + 5);
        msg = '避重就轻，线索+5。';
      } else if (sid === 'confess') {
        updates.risk_value = Math.max(0, risk - 30);
        updates.testimony_chain = Math.min(100, testimony + 20);
        msg = '全盘托出，风险-30，但供述链上升。';
      } else if (sid === 'divert') {
        msg = '转移话题拖延时间。';
      } else if (sid === 'confront') {
        updates.moral_value = Math.max(0, (save.moralValue ?? 0) - 5);
        updates.merit_points = Math.max(0, (save.meritPoints ?? 0) - 30);
        msg = '强硬对抗：政绩-30，民心-5。';
      } else if (sid === 'report') {
        updates.risk_value = Math.max(0, risk - 40);
        updates.testimony_chain = Math.min(100, testimony + 30);
        msg = '举报立功，风险-40，供述链上升。';
      }
      await updateSave(save.id, updates as Parameters<typeof updateSave>[1]);
      await updateGameSave(updates as Parameters<typeof updateSave>[1]);
      await refreshSave();
      setFeedback(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <StatusBar style="light" />
      <View style={{ backgroundColor: theme.headerBg, paddingTop: insets.top, paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: theme.accentSub }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable cssInterop={false} onPress={() => router.back()} hitSlop={8}>
            <Text style={{ color: theme.headerText, fontSize: 22 }}>←</Text>
          </Pressable>
          <Text style={{ color: theme.headerText, fontSize: 16, fontWeight: '700', letterSpacing: 2 }}>接受审查</Text>
        </View>
        <Text style={{ color: theme.headerSub, fontSize: 11, marginTop: 4 }}>谈话函询 · 初步核实 · 立案审查 · 留置</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* 当前阶段 */}
        <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.accent, padding: 14, borderCurve: 'continuous' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 22 }}>{state === 'none' ? '🛡️' : state === 'liuzhi' ? '🔒' : '⚖️'}</Text>
            <Text style={{ color: theme.accent, fontSize: 14, fontWeight: '700' }}>{STAGE_LABEL[state]}</Text>
          </View>
          <Text style={{ color: theme.mutedText, fontSize: 11, marginTop: 6 }}>{STAGE_DESC[state]}</Text>
        </View>

        {/* 审查数据 */}
        <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, padding: 12, borderCurve: 'continuous' }}>
          <Text style={{ color: theme.mutedText, fontSize: 10, marginBottom: 6 }}>审查数据</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <DataItem label="供述压力" value={`${Math.max(0, pressure)}`} theme={theme} />
            <DataItem label="线索完整度" value={`${clue}`} theme={theme} />
            <DataItem label="供述链" value={`${testimony}`} theme={theme} />
          </View>
          {state === 'liuzhi' && <Text style={{ color: theme.accent, fontSize: 10, marginTop: 6 }}>留置剩余天数：{custody} 天</Text>}
        </View>

        {feedback && (
          <View style={{ borderWidth: 1, borderColor: theme.accent, padding: 8, backgroundColor: theme.accentBg }}>
            <Text style={{ color: theme.accent, fontSize: 11 }}>{feedback}</Text>
          </View>
        )}

        {/* 供述选择 */}
        <Text style={{ color: theme.mutedText, fontSize: 11, marginTop: 4 }}>供述选择（每轮讯问 6 选 1）</Text>
        {STRATEGIES.map((s) => (
          <Pressable
            key={s.id}
            cssInterop={false}
            disabled={state === 'none' || busy}
            onPress={() => handleStrategy(s.id)}
            style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, padding: 12, borderCurve: 'continuous', opacity: state === 'none' ? 0.5 : 1 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 18 }}>{s.icon}</Text>
              <Text style={{ color: theme.valueText, fontSize: 12, fontWeight: '700' }}>{s.name}</Text>
            </View>
            <Text style={{ color: theme.mutedText, fontSize: 10, marginTop: 4 }}>{s.desc}</Text>
          </Pressable>
        ))}
        {state === 'none' && (
          <Text style={{ color: theme.mutedText, fontSize: 10, textAlign: 'center', marginTop: 4 }}>当前未进入审查程序，供述选择不可用</Text>
        )}
      </ScrollView>
    </View>
  );
}

function DataItem({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof getRankTheme> }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: theme.mutedText, fontSize: 9 }}>{label}</Text>
      <Text style={{ color: theme.valueText, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
}
```

<a id="srcappappleadershiptsx"></a>
## `src/app/(app)/leadership.tsx`

```tsx
// 领导班子综合管理 — NPC班子/人事任命/仕途档案/城市指标/政策运动
import { useCallback, useState, useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import {
  getLeadershipBand, assignLeadershipRole, removeLeadershipRole, getSubordinatesByRank,
  getNpcBand, initLeadershipBand,
  getActiveNationalPolicy, respondToPolicy,
  getCityMetrics, getPlayerCareerHistory, getPlayerHealth,
} from '@/db/gameApi';
import {
  getSubAvatarEmoji, LEADERSHIP_ROLES, RANK_CONFIG, FACTION_LABEL, FACTION_COLOR,
  getAppointmentApprovalLevel, SUB_LEVEL_NAMES, RETIREMENT_AGE_MAP, MALE_AVATARS, FEMALE_AVATARS,
  getAvatarImageUrl,
} from '@/types/game';
import type {
  LeadershipMember, Subordinate, ApprovalLevel,
  LeadershipBand, NationalPolicy, CityMetrics, PlayerHealth,
} from '@/types/game';
import { DemocraticReview } from '@/components/DemocraticReview';
import { getRankTheme } from '@/lib/rankTheme';
import { calcBandSynergy } from '@/lib/factionSystem';

type MainTab = 'npc' | 'appoint' | 'career' | 'city' | 'policy';
type BandGroupTab = 'party' | 'gov' | 'nda';

const FACTION_ICONS: Record<string, string> = { reform: '🔵', pragmatic: '🟠', cyl: '⚪', techno: '🟡', local: '🟤' };

// ─── 代会/议政院/参政院/政府 窗口期判断 ──────────────────────────────────────
// 游戏开始日 2020-01-01 = gameDays 0
// 【党代会】约每5年一次（开幕前90天～闭幕后30天）
const PARTY_CONGRESS_DAYS: Record<number, number[]> = {
  3: [606, 606+1825, 606+3650], 4: [606, 606+1825, 606+3650],
  5: [606, 606+1825, 606+3650], 6: [606, 606+1825, 606+3650],
  7: [640, 640+1825, 640+3650], 8: [640, 640+1825, 640+3650], 9: [640, 640+1825, 640+3650],
  10: [882, 882+1825, 882+3650], 11: [882, 882+1825, 882+3650],
  12: [1004, 1004+1825, 1004+3650], 13: [1004, 1004+1825, 1004+3650],
  14: [1004, 1004+1825, 1004+3650], 15: [1004, 1004+1825, 1004+3650],
};
// 【议政院/参政院/政府】每年召开一次（两会，1-3月）；窗口：开幕前30天～闭幕后20天
// 县级议政院：2021-11开始，每年11月；市级：2022-01；省级/国家级：2023-01/03
// 为覆盖多年，展开前10届
function buildAnnualSessions(firstDay: number, count = 10): number[] {
  return Array.from({ length: count }, (_, i) => firstDay + i * 365);
}
const NPC_SESSION_DAYS: Record<number, number[]> = {
  // 县级议政院（rank 4-6）：2021-11 ≈ day 700
  4: buildAnnualSessions(700), 5: buildAnnualSessions(700), 6: buildAnnualSessions(700),
  // 市级议政院（rank 7-9）：2022-01 ≈ day 730
  7: buildAnnualSessions(730), 8: buildAnnualSessions(730), 9: buildAnnualSessions(730),
  // 省级议政院（rank 10-11）：2023-01 ≈ day 1095
  10: buildAnnualSessions(1095), 11: buildAnnualSessions(1095),
  // 全国议政院（rank 12+）：2023-03 ≈ day 1156
  12: buildAnnualSessions(1156), 13: buildAnnualSessions(1156),
  14: buildAnnualSessions(1156), 15: buildAnnualSessions(1156),
};
// 参政院与议政院同期（提前5天）
const CPPCC_SESSION_DAYS: Record<number, number[]> = Object.fromEntries(
  Object.entries(NPC_SESSION_DAYS).map(([k, v]) => [k, v.map(d => d - 5)])
);

type OrganCategory = 'party' | 'npc' | 'cppcc' | 'gov_senior' | 'gov_deputy' | 'free';

/** 判断职位所属机构类别 */
function getOrganCategory(organ: string, roleKey: string): OrganCategory {
  if (organ.includes('党委') || organ.includes('县委') || organ === '省委' || organ === '市委'
    || organ.includes('纪委') || organ.includes('镇党委')) return 'party';
  if (organ.includes('议政院')) return 'npc';
  if (organ.includes('参政院')) return 'cppcc';
  // 政府正职（县长/市长/省长/国政院院理等）须经议政院选举，限制最严
  if ((organ.includes('政府') || organ.includes('乡镇') || organ.includes('国政院') || organ.includes('区（县）'))
    && (roleKey.includes('_head') || roleKey.includes('_mayor') || roleKey.includes('_governor')
      || roleKey.includes('_premier') || roleKey.includes('county_gov') || roleKey.includes('city_mayor')
      || roleKey.includes('prov_governor') || roleKey.includes('exec_deputy'))) return 'gov_senior';
  // 政府副职（副县长/副市长/副省长等）可由议政院常委会审议，限制较轻
  if (organ.includes('政府') || organ.includes('乡镇') || organ.includes('国政院')
    || organ.includes('区（县）')) return 'gov_deputy';
  return 'free'; // 完全自由任命（如职能局、政法等）
}

/** 是否在对应窗口期内 */
function isInSessionWindow(category: OrganCategory, rankLevel: number, gameDays: number): boolean {
  if (category === 'free') return true;
  if (category === 'party') {
    const opens = PARTY_CONGRESS_DAYS[rankLevel] ?? PARTY_CONGRESS_DAYS[4]!;
    return opens.some(d => gameDays >= d - 90 && gameDays <= d + 37);
  }
  if (category === 'npc' || category === 'gov_senior' || category === 'gov_deputy') {
    const opens = NPC_SESSION_DAYS[rankLevel] ?? NPC_SESSION_DAYS[4]!;
    return opens.some(d => gameDays >= d - 30 && gameDays <= d + 20);
  }
  if (category === 'cppcc') {
    const opens = CPPCC_SESSION_DAYS[rankLevel] ?? CPPCC_SESSION_DAYS[4]!;
    return opens.some(d => gameDays >= d - 30 && gameDays <= d + 20);
  }
  return false;
}

/** 距下次会议窗口期还有多少天 */
function daysToNextSession(category: OrganCategory, rankLevel: number, gameDays: number): number {
  let days: number[];
  if (category === 'party') {
    days = PARTY_CONGRESS_DAYS[rankLevel] ?? PARTY_CONGRESS_DAYS[4]!;
    for (const d of days) { if (gameDays < d - 90) return (d - 90) - gameDays; }
  } else if (category === 'npc' || category === 'gov_senior' || category === 'gov_deputy') {
    days = NPC_SESSION_DAYS[rankLevel] ?? NPC_SESSION_DAYS[4]!;
    for (const d of days) { if (gameDays < d - 30) return (d - 30) - gameDays; }
  } else if (category === 'cppcc') {
    days = CPPCC_SESSION_DAYS[rankLevel] ?? CPPCC_SESSION_DAYS[4]!;
    for (const d of days) { if (gameDays < d - 30) return (d - 30) - gameDays; }
  }
  return 9999;
}

/** 补缺代价配置 */
const VACANCY_PENALTY: Record<OrganCategory, { merit: number; favor: number; label: string; sessionName: string; color: string }> = {
  party:      { merit: 15, favor: 5, label: '党代会选举', sessionName: '党代会换届期', color: '#CC4444' },
  npc:        { merit: 10, favor: 3, label: '议政院会议选举', sessionName: '议政院会议期', color: '#4477CC' },
  cppcc:      { merit: 8,  favor: 2, label: '参政院会议通过', sessionName: '参政院会议期', color: '#44AA77' },
  gov_senior: { merit: 15, favor: 5, label: '议政院选举任命', sessionName: '议政院会议期', color: '#CC6622' },
  gov_deputy: { merit: 8,  favor: 2, label: '议政院常委会审议', sessionName: '议政院常委会审议', color: '#CC8833' },
  free:       { merit: 0,  favor: 0, label: '本级决定', sessionName: '', color: '#888' },
};

// ─── 向后兼容：party organ 判断（供 UI 渲染徽章用）──────────────────────────
function isPartyOrgan(organ: string): boolean {
  return getOrganCategory(organ, '') === 'party';
}
function isPartyCongressWindow(rankLevel: number, gameDays: number): boolean {
  return isInSessionWindow('party', rankLevel, gameDays);
}
function daysToNextCongress(rankLevel: number, gameDays: number): number {
  return daysToNextSession('party', rankLevel, gameDays);
}

/** 年龄接近退休时显示警告色 */
function ageColor(age: number, rankLevel: number): string {
  const retireAge = RETIREMENT_AGE_MAP[rankLevel] ?? 60;
  if (age >= retireAge) return '#C82829';
  if (age >= retireAge - 2) return '#E67E22';
  return '#5577AA';
}

/** 计算班子综合能力加成（§4.3 最终加成 × bandSynergy） */
function calcBandBonus(band: LeadershipMember[], subs: Subordinate[]) {
  if (band.length === 0) return { avgAbility: 0, avgLoyalty: 0, synergy: 1 };
  let abilitySum = 0, loyaltySum = 0;
  const bandFactions: import('@/types/game').FactionId[] = [];
  for (const m of band) {
    const sub = subs.find(s => s.id === m.subId);
    if (sub) {
      abilitySum += sub.ability;
      loyaltySum += sub.loyalty;
      if (sub.faction) bandFactions.push(sub.faction);
    }
  }
  const synergy = calcBandSynergy(bandFactions);
  return {
    avgAbility: Math.max(0, Math.round(abilitySum / band.length)),
    avgLoyalty: Math.max(0, Math.round(loyaltySum / band.length)),
    synergy,
  };
}

// ─── organ → 系统颜色与图标 ───────────────────────────────────
type OrganSystem = { color: string; icon: string; label: string };
function getOrganSystem(organ: string): OrganSystem {
  if (organ === '全国议政院') return { color: '#1a3a2a', icon: '📜', label: '全国议政院' };
  if (organ === '全国参政院') return { color: '#2a3a1a', icon: '🤝', label: '全国参政院' };
  if (organ === '中枢军委' || organ === '中枢军事委员会') return { color: '#1a2840', icon: '🎖️', label: '中枢军委' };
  if (organ.includes('党委') || organ === '省委' || organ === '省委系统') return { color: '#7A1B1E', icon: '🏛️', label: organ };
  if (organ.includes('纪委')) return { color: '#4a1a4a', icon: '⚖️', label: organ };
  if (organ.includes('政法') || organ.includes('司法')) return { color: '#1a2a4a', icon: '🔏', label: organ };
  if (organ.includes('议政院')) return { color: '#1a3a2a', icon: '📜', label: organ };
  if (organ.includes('参政院')) return { color: '#2a3a1a', icon: '🤝', label: organ };
  if (organ.includes('国政院')) return { color: '#2a1a00', icon: '🇨🇳', label: organ };
  if (organ.includes('政府') || organ.includes('省政府')) return { color: '#1a3a4a', icon: '🏢', label: organ };
  if (organ.includes('乡') || organ.includes('村') || organ.includes('社区')) return { color: '#1a3a1a', icon: '🏘️', label: organ };
  return { color: '#1e2a3a', icon: '🏗️', label: organ };
}

/** NPC个人档案弹窗 */
function CareerModal({ member, onClose, rankLevel, playerBirthProvince, playerBirthCity, playerUniversity, saveCityName }: {
  member: LeadershipBand;
  onClose: () => void;
  rankLevel: number;
  playerBirthProvince?: string;
  playerBirthCity?: string;
  playerUniversity?: string;
  saveCityName?: string;
}) {
  const retireAge = RETIREMENT_AGE_MAP[rankLevel] ?? 60;
  const birthYear = member.age > 0 ? 2025 - member.age : 0;
  const theme = getRankTheme(rankLevel);

  // 同乡/同省/同校提示
  const sameCity = !!playerBirthCity && !!member.birthCity && playerBirthCity === member.birthCity;
  const sameProv = !sameCity && !!playerBirthProvince && !!member.birthProvince && playerBirthProvince === member.birthProvince;
  // 大学匹配（universityName格式为"xx大学（硕士）"，取括号前部分比对）
  const memberUniBase = member.universityName.split('（')[0];
  const playerUniBase = (playerUniversity ?? '').split('（')[0];
  const sameUni = !!playerUniBase && !!memberUniBase && playerUniBase === memberUniBase;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
      <View style={{ backgroundColor: theme.cardBg, maxHeight: '80%' }}>
        <View style={{ backgroundColor: theme.headerBg, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: theme.headerSub, fontSize: 10, letterSpacing: 1.5 }}>个人档案</Text>
            <Text style={{ color: theme.headerText, fontSize: 15, fontWeight: '700', marginTop: 2 }}>{member.name} · {member.positionLabel}</Text>
          </View>
          <Pressable onPress={onClose} style={{ padding: 4 }}><Text style={{ color: theme.headerSub, fontSize: 22 }}>×</Text></Pressable>
        </View>

        {/* 标签行 */}
        <View style={{ flexDirection: 'row', gap: 6, padding: 10, backgroundColor: theme.sectionHeaderBg, borderBottomWidth: 1, borderBottomColor: theme.cardBorder, flexWrap: 'wrap' }}>
          <View style={{ backgroundColor: theme.accentBg, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: theme.cardBorder }}>
            <Text style={{ fontSize: 11, color: theme.valueText }}>年龄 {member.age} 岁</Text>
          </View>
          <View style={{ backgroundColor: '#FFF8EE', paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#F5B041' }}>
            <Text style={{ fontSize: 11, color: '#875A12' }}>距退休 {Math.max(0, retireAge - member.age)} 年</Text>
          </View>
          <View style={{ backgroundColor: FACTION_COLOR[member.faction] + '22', paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: FACTION_COLOR[member.faction] }}>
            <Text style={{ fontSize: 11, color: FACTION_COLOR[member.faction] }}>{FACTION_ICONS[member.faction]} {FACTION_LABEL[member.faction]}</Text>
          </View>
          <View style={{ backgroundColor: '#F0F8F0', paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#7BAD7E' }}>
            <Text style={{ fontSize: 11, color: '#2a5a3e' }}>能力 {member.ability} · 廉洁 {member.integrity}</Text>
          </View>
          {sameCity && <View style={{ backgroundColor: '#FFF0E0', paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#E8A040' }}>
            <Text style={{ fontSize: 11, color: '#C07020' }}>🏡 同乡 +12好感</Text>
          </View>}
          {sameProv && <View style={{ backgroundColor: '#FFF8EE', paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#D0B060' }}>
            <Text style={{ fontSize: 11, color: '#996620' }}>🗺 同省 +7好感</Text>
          </View>}
          {sameUni && <View style={{ backgroundColor: '#F0F0FF', paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#8888CC' }}>
            <Text style={{ fontSize: 11, color: '#4444AA' }}>🎓 校友 +10好感</Text>
          </View>}
        </View>

        <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>
          {/* 基本信息 */}
          <View style={{ backgroundColor: theme.sectionHeaderBg, borderWidth: 1, borderColor: theme.cardBorder, padding: 10, gap: 5 }}>
            <Text style={{ fontSize: 11, color: theme.mutedText, fontWeight: '700', marginBottom: 2 }}>基本信息</Text>
            {birthYear > 0 && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={{ fontSize: 11, color: theme.mutedText, width: 56 }}>出生年份</Text>
                <Text style={{ fontSize: 11, color: theme.labelText, flex: 1 }}>{birthYear} 年</Text>
              </View>
            )}
            {(member.birthProvince || member.birthCity) && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={{ fontSize: 11, color: theme.mutedText, width: 56 }}>籍贯</Text>
                <Text style={{ fontSize: 11, color: theme.labelText, flex: 1 }}>
                  {member.birthProvince}{member.birthCity}
                </Text>
              </View>
            )}
            {member.universityName && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={{ fontSize: 11, color: theme.mutedText, width: 56 }}>学历</Text>
                <Text style={{ fontSize: 11, color: theme.labelText, flex: 1 }}>{member.universityName}</Text>
              </View>
            )}
            {member.graduationYear > 0 && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={{ fontSize: 11, color: theme.mutedText, width: 56 }}>毕业年份</Text>
                <Text style={{ fontSize: 11, color: theme.labelText, flex: 1 }}>{member.graduationYear} 年</Text>
              </View>
            )}
          </View>

          {/* 仕途历程 */}
          <Text style={{ fontSize: 11, color: theme.mutedText, fontWeight: '700' }}>仕途历程</Text>
          {member.careerHistory.length === 0 ? (
            <Text style={{ color: theme.mutedText, fontSize: 12, textAlign: 'center', marginTop: 10 }}>暂无历史档案记录</Text>
          ) : (
            member.careerHistory.map((entry, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ width: 32, alignItems: 'center' }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.headerBg, marginTop: 4 }} />
                  {i < member.careerHistory.length - 1 && <View style={{ width: 2, flex: 1, backgroundColor: theme.cardBorder, marginTop: 2 }} />}
                </View>
                <View style={{ flex: 1, paddingBottom: 12 }}>
                  <Text style={{ fontSize: 10, color: theme.mutedText }}>{entry.yearStart} — {entry.yearEnd ?? '至今'}</Text>
                  <Text style={{ fontSize: 13, color: theme.valueText, fontWeight: '600' }}>{entry.city}</Text>
                  <Text style={{ fontSize: 12, color: theme.labelText }}>{entry.position}</Text>
                </View>
              </View>
            ))
          )}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ width: 32, alignItems: 'center' }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.primary }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: theme.primary }}>
                {member.careerHistory.length > 0
                  ? `${member.careerHistory[member.careerHistory.length - 1]?.yearEnd ?? 2025} — 至今（现职）`
                  : '2025 — 至今（现职）'}
              </Text>
              {saveCityName ? (
                <Text style={{ fontSize: 11, color: theme.mutedText, marginBottom: 1 }}>{saveCityName}</Text>
              ) : null}
              <Text style={{ fontSize: 13, color: theme.primary, fontWeight: '700' }}>{member.positionLabel}</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

export default function LeadershipScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [tab, setTab] = useState<MainTab>('npc');
  const [bandGroupTab, setBandGroupTab] = useState<BandGroupTab>('party');

  // ── 人事任命状态 ──
  const [band, setBand] = useState<LeadershipMember[]>([]);
  const [subs, setSubs] = useState<Subordinate[]>([]);
  const [selectingRole, setSelectingRole] = useState<{ key: string; label: string; requiredSubLevel: number; organ: string } | null>(null);
  const [feedback, setFeedback] = useState('');
  const [search, setSearch] = useState('');
  const [reviewState, setReviewState] = useState<{
    sub: Subordinate;
    role: { key: string; label: string; requiredSubLevel: number; organ: string };
    approvalLevel: ApprovalLevel;
  } | null>(null);
  // 代会补缺确认弹窗
  const [congressAlert, setCongressAlert] = useState<{
    sub: Subordinate;
    role: { key: string; label: string; requiredSubLevel: number; organ: string };
    daysLeft: number;
    category: OrganCategory;
  } | null>(null);

  // ── NPC班子 / 档案 / 指标 / 政策状态 ──
  const [npcMembers, setNpcMembers] = useState<LeadershipBand[]>([]);
  const [playerCareer, setPlayerCareer] = useState<{ position: string; city: string; rankLevel: number; startYear: number | null; endYear: number | null }[]>([]);
  const [cityMetrics, setCityMetrics] = useState<CityMetrics | null>(null);
  const [activePolicy, setActivePolicy] = useState<NationalPolicy | null>(null);
  const [playerHealth, setPlayerHealth] = useState<PlayerHealth | null>(null);
  const [selectedMember, setSelectedMember] = useState<LeadershipBand | null>(null);
  const [policyFeedback, setPolicyFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [initializingBand, setInitializingBand] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!save) return;
      setLoading(true);
      Promise.all([
        getLeadershipBand(save.id),
        getSubordinatesByRank(save.id, save.rankLevel),
        getNpcBand(save.id),
        getPlayerCareerHistory(save.id),
        getCityMetrics(save.id),
        getActiveNationalPolicy(save.id),
        getPlayerHealth(save.id),
      ]).then(async ([b, s, npc, career, metrics, policy, health]) => {
        setBand(b);
        setSubs(s);
        setPlayerCareer(career);
        setCityMetrics(metrics);
        setActivePolicy(policy);
        setPlayerHealth(health);
        // 自动初始化：首次进入且NPC班子为空时自动生成
        if (npc.length === 0) {
          setInitializingBand(true);
          await initLeadershipBand(save.id, save.rankLevel, save.playerName, save.rankName,
            { province: save.birthProvince, city: save.birthCity, universityName: save.universityName ?? '' },
            save.cityName);
          const fresh = await getNpcBand(save.id);
          setNpcMembers(fresh);
          setInitializingBand(false);
        } else {
          setNpcMembers(npc);
        }
        setLoading(false);
      });
    }, [save])
  );

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 2500);
  };

  // ── 人事任命逻辑 ──
  const handleAssign = async (sub: Subordinate) => {
    if (!save || !selectingRole) return;
    const required = selectingRole.requiredSubLevel ?? 1;
    if (sub.subLevel < required) {
      const reqName = SUB_LEVEL_NAMES[required] ?? `${required}级`;
      const subName = SUB_LEVEL_NAMES[sub.subLevel] ?? `${sub.subLevel}级`;
      showFeedback(`❌ ${sub.name}（${subName}）不符合任职要求：${selectingRole.label} 需要 ${reqName} 及以上`);
      return;
    }

    // ── 所有非"本级自由"职位：须在对应会议窗口期内换届；窗口外触发补缺确认 ──
    const category = getOrganCategory(selectingRole.organ, selectingRole.key);
    if (category !== 'free' && !isInSessionWindow(category, save.rankLevel, save.gameDays)) {
      const days = daysToNextSession(category, save.rankLevel, save.gameDays);
      setCongressAlert({ sub, role: selectingRole, daysLeft: days, category });
      setSelectingRole(null);
      setSearch('');
      return;
    }

    const approvalLevel = getAppointmentApprovalLevel(save.rankLevel, selectingRole.key);
    if (approvalLevel !== '本级决定') {
      setReviewState({ sub, role: selectingRole, approvalLevel });
      setSelectingRole(null);
      setSearch('');
      return;
    }
    await doAssign(sub, selectingRole);
  };

  const doAssign = async (sub: Subordinate, role: { key: string; label: string }) => {
    if (!save) return;
    const ok = await assignLeadershipRole(
      save.id, save.userId, sub.id,
      role.key, role.label,
      sub.name, sub.avatarId ?? 0, sub.gender ?? '男',
      save.gameDays,
    );
    if (ok) {
      const updated = await getLeadershipBand(save.id);
      setBand(updated);
      showFeedback(`已任命 ${sub.name} 为 ${role.label}`);
    }
  };

  /** 补缺任命：上级主导，玩家主动推动需按机构类型付代价 */
  const handleCongressAlertConfirm = async () => {
    if (!congressAlert || !save) return;
    const { sub, role, category } = congressAlert;
    const penalty = VACANCY_PENALTY[category];
    const newMerit = Math.max(0, (save.meritPoints ?? 0) - penalty.merit);
    const newFavor = Math.max(0, save.bossFavor - penalty.favor);
    if (penalty.merit > 0 || penalty.favor > 0) {
      await updateGameSave({ meritPoints: newMerit, bossFavor: newFavor });
    }
    await doAssign(sub, role);
    setCongressAlert(null);
    const costTip = penalty.merit > 0 ? `政绩-${penalty.merit}，上司好感-${penalty.favor}` : '无代价';
    showFeedback(`⚠️ 补缺任命完成：${role.label} → ${sub.name}（${costTip}）`);
  };

  const handleReviewConfirm = async () => {
    if (!reviewState || !save) return;
    const { sub, role, approvalLevel } = reviewState;
    await doAssign(sub, role);
    setReviewState(null);
    showFeedback(`✅ ${role.label} 任命已通过${approvalLevel !== '本级决定' ? `（${approvalLevel}）` : ''}`);
  };

  const handleReviewForceConfirm = async () => {
    if (!reviewState || !save) return;
    const { sub, role, approvalLevel } = reviewState;
    const newFavor = Math.max(0, save.bossFavor - 10);
    await updateGameSave({ bossFavor: newFavor });
    await doAssign(sub, role);
    setReviewState(null);
    showFeedback(`⚡ ${role.label} 强制任命执行（${approvalLevel}未通过），上司好感 -10 → 当前 ${newFavor}`);
  };

  const handleRemove = async (m: LeadershipMember) => {
    if (!save) return;
    const roleObj = allRoles.find(r => r.key === m.roleKey);
    if (roleObj) {
      const category = getOrganCategory(roleObj.organ, roleObj.key);
      if (category !== 'free' && !isInSessionWindow(category, save.rankLevel, save.gameDays)) {
        const penalty = VACANCY_PENALTY[category];
        const newMerit = Math.max(0, (save.meritPoints ?? 0) - Math.round(penalty.merit * 0.6));
        const newFavor = Math.max(0, save.bossFavor - penalty.favor);
        await updateGameSave({ meritPoints: newMerit, bossFavor: newFavor });
        await removeLeadershipRole(save.id, m.roleKey);
        setBand(prev => prev.filter(b => b.roleKey !== m.roleKey));
        showFeedback(`⚠️ 非会议期撤销 ${VACANCY_PENALTY[category].label} 职务，政绩-${Math.round(penalty.merit * 0.6)}，好感-${penalty.favor}`);
        return;
      }
    }
    await removeLeadershipRole(save.id, m.roleKey);
    setBand(prev => prev.filter(b => b.roleKey !== m.roleKey));
    showFeedback(`已撤销 ${m.subName} 的 ${m.roleLabel} 职务`);
  };

  const handleAssignAll = async () => {
    if (!save) return;
    // 只填补"真正空缺"（NPC在位不算空缺，玩家替换才算）
    const vacantRoles = allRoles.filter(r =>
      !bandMap.has(r.key) &&
      !npcByLabel.has(r.label) &&
      getAppointmentApprovalLevel(save.rankLevel, r.key) === '本级决定'
    );
    const reviewableCount = allRoles.filter(r =>
      !bandMap.has(r.key) && !npcByLabel.has(r.label) &&
      getAppointmentApprovalLevel(save.rankLevel, r.key) !== '本级决定'
    ).length;
    if (vacantRoles.length === 0) {
      showFeedback(reviewableCount > 0
        ? `党委系列职位（${reviewableCount}个）须逐一经民主评议`
        : 'NPC已全部在位，如需替换请逐一操作');
      return;
    }
    const available = subs
      .filter(s => !s.transferredCity && !band.some(b => b.subId === s.id))
      .sort((a, b) => b.ability - a.ability);
    if (available.length === 0) { showFeedback('暂无可用下属，请先培养下属'); return; }
    let assigned = 0, levelBlocked = 0;
    const usedIds = new Set<string>();
    for (const role of vacantRoles) {
      const candidate = available.find(s => !usedIds.has(s.id) && s.subLevel >= (role.requiredSubLevel ?? 1));
      if (!candidate) { levelBlocked++; continue; }
      const ok = await assignLeadershipRole(save.id, save.userId, candidate.id, role.key, role.label, candidate.name, candidate.avatarId ?? 0, candidate.gender ?? '男', save.gameDays);
      if (ok) { usedIds.add(candidate.id); assigned++; }
    }
    const updated = await getLeadershipBand(save.id);
    setBand(updated);
    const levelTip = levelBlocked > 0 ? `，${levelBlocked}个职位因职级不足未填充` : '';
    const reviewTip = reviewableCount > 0 ? `，另有${reviewableCount}个党委职位须单独评议` : '';
    showFeedback(`✅ 一键替换完成，共任命 ${assigned} 名干部${levelTip}${reviewTip}`);
  };

  const handleRemoveAll = async () => {
    if (!save || band.length === 0) { showFeedback('当前班子为空，无需操作'); return; }
    await Promise.all(band.map(m => removeLeadershipRole(save.id, m.roleKey)));
    setBand([]);
    showFeedback(`已撤销全部 ${band.length} 名班子成员任命`);
  };

  const handleRespondPolicy = async () => {
    if (!save || !activePolicy) return;
    const { meritBonus } = await respondToPolicy(save.id, activePolicy.id, save.gameDays);
    if (meritBonus > 0) {
      setPolicyFeedback(`✅ 积极响应政策运动！获得政绩+${meritBonus}`);
      setActivePolicy({ ...activePolicy, responded: true });
    }
  };

  const filteredSubs = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return subs.filter(s => {
      if (s.transferredCity) return false;
      if (kw && !s.name.includes(kw) && !(s.position ?? '').includes(kw)) return false;
      return true;
    }).sort((a, b) => b.ability - a.ability);
  }, [subs, search]);

  if (!save) return null;

  const playerRank = save.rankLevel;
  const theme = getRankTheme(playerRank);
  const TIER_BAND: Record<number, number[]> = {
    3: [3], 4: [3], 5: [4, 5], 6: [5],
    7: [6, 7], 8: [7], 9: [7, 8],
    10: [9, 10], 11: [10],
    12: [11, 12], 13: [12],
    14: [14], 15: [15],
  };
  const bandLevels = TIER_BAND[playerRank] ?? [playerRank];
  const allRoles = bandLevels.flatMap(r => LEADERSHIP_ROLES[r] ?? []);
  const bandMap = new Map(band.map(m => [m.roleKey, m]));
  // NPC成员按职位名称索引，用于在人事任命中显示"NPC在位"状态
  const npcByLabel = new Map(npcMembers.filter(m => !m.isRetired).map(m => [m.positionLabel, m]));
  const playerRankName = RANK_CONFIG[playerRank]?.name ?? '';
  // 玩家已替换数 / NPC在位数 / 真正空缺数
  const playerFilledCount = band.length;
  const npcHeldCount = allRoles.filter(r => !bandMap.has(r.key) && npcByLabel.has(r.label)).length;
  const totalCount = allRoles.length;
  const trueVacantCount = totalCount - playerFilledCount - npcHeldCount;
  const bonus = calcBandBonus(band, subs);
  const retireAge = RETIREMENT_AGE_MAP[playerRank] ?? 60;

  // organ 分组
  const organOrder: string[] = [];
  const organRoleMap: Record<string, typeof allRoles> = {};
  for (const role of allRoles) {
    const org = role.organ;
    if (!organOrder.includes(org)) organOrder.push(org);
    (organRoleMap[org] ??= []).push(role);
  }

  const tabs: [MainTab, string, string][] = [
    ['npc',    '当届班子', '👥'],
    ['appoint','代会任命', '🏛️'],
    ['career', '个人档案', '📄'],
    ['city',   '城市指标', '📊'],
    ['policy', '政策运动', '📢'],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <StatusBar style={theme.statusBarStyle} backgroundColor={theme.headerBg} />

      {/* 顶栏 */}
      <View style={{ backgroundColor: theme.headerBg, paddingTop: insets.top + 8, paddingBottom: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: theme.cardBorder }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Text style={{ color: theme.headerSub, fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.headerSub, fontSize: 10, letterSpacing: 2 }}>权力中枢</Text>
            <Text style={{ color: theme.headerText, fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>领导班子</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: theme.headerSub, fontSize: 10 }}>{playerRankName}</Text>
            <Text style={{ color: theme.headerText, fontSize: 11, fontWeight: '600', marginTop: 1 }}>{save.cityName}</Text>
            {activePolicy && !activePolicy.responded && (
              <View style={{ backgroundColor: '#C82829', paddingHorizontal: 6, paddingVertical: 2, marginTop: 3 }}>
                <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>政策运动进行中</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Tab 导航 */}
      <View style={{ flexDirection: 'row', backgroundColor: theme.quickStatBg, borderBottomWidth: 1, borderBottomColor: theme.cardBorder }}>
        {tabs.map(([t, label, icon]) => (
          <Pressable key={t} onPress={() => setTab(t)}
            style={{ flex: 1, paddingVertical: 9, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: tab === t ? theme.accentSub : 'transparent' }}>
            <Text style={{ fontSize: 14 }}>{icon}</Text>
            <Text style={{ fontSize: 9, color: tab === t ? theme.accentSub : theme.headerSub, fontWeight: tab === t ? '700' : '400', marginTop: 1 }}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {/* 反馈条 */}
      {feedback ? (
        <View style={{ backgroundColor: theme.sectionHeaderBg, borderBottomWidth: 1, borderBottomColor: theme.cardBorder, paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text style={{ color: theme.statHigh, fontSize: 12, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.accentSub} />
          {initializingBand && <Text style={{ color: theme.headerSub, fontSize: 12, marginTop: 12 }}>正在自动生成领导班子成员…</Text>}
        </View>
      ) : (
        <>
          {/* ════════ TAB: 当届班子 (NPC) ════════ */}
          {tab === 'npc' && (() => {
            const partyMembers = npcMembers.filter(m => m.bandGroup === 'party');
            const govMembers   = npcMembers.filter(m => m.bandGroup === 'gov');
            const ndaMembers   = npcMembers.filter(m => m.bandGroup === 'nda');
            const GROUP_TABS: [BandGroupTab, string, string, string][] = [
              ['party', '党委班子', '🏛️', '#7A1B1E'],
              ['gov',   '政府班子', '🏢', '#1A3A4A'],
              ['nda',   '议政院班子', '📜', '#1A3A2A'],
            ];
            const currentList = bandGroupTab === 'party' ? partyMembers : bandGroupTab === 'gov' ? govMembers : ndaMembers;
            const groupColor = GROUP_TABS.find(g => g[0] === bandGroupTab)?.[3] ?? theme.headerBg;
            return (
              <View style={{ flex: 1 }}>
                {/* 上级认可度与政治生态 */}
                <View style={{ backgroundColor: theme.quickStatBg, borderBottomWidth: 1, borderBottomColor: theme.cardBorder, padding: 12 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: theme.primaryText, letterSpacing: 1, marginBottom: 8 }}>上级认可度</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[['上级一', save.bossFavor], ['上级二', save.boss2Favor], ['上级三', save.boss3Favor]].map(([label, val]) => (
                      <View key={label} style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={{ fontSize: 10, color: theme.mutedText }}>{label}</Text>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: (val as number) >= 70 ? '#2a7a3b' : (val as number) >= 40 ? '#e67e22' : '#C82829' }}>{val}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {save.patronage ? <EcoChip text="🛡️ 庇护状态" color="#1A3A4A" /> : null}
                  </View>
                </View>
                {/* 班子合力（§3.4 / §4.3） */}
                <View style={{ backgroundColor: theme.quickStatBg, borderBottomWidth: 1, borderBottomColor: theme.cardBorder, padding: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: theme.primaryText, letterSpacing: 1 }}>班子派系合力</Text>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: bonus.synergy >= 1.0 ? '#2a7a3b' : '#C82829' }}>×{bonus.synergy.toFixed(2)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[['平均能力', bonus.avgAbility], ['平均忠诚', bonus.avgLoyalty], ['合力系数', bonus.synergy]].map(([label, val]) => (
                      <View key={label} style={{ flex: 1, alignItems: 'center', backgroundColor: theme.cardBg, padding: 8 }}>
                        <Text style={{ fontSize: 10, color: theme.mutedText }}>{label}</Text>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: theme.primaryText }}>
                          {label === '合力系数' ? `×${(val as number).toFixed(2)}` : val}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <Text style={{ fontSize: 9, color: theme.mutedText, marginTop: 6, lineHeight: 14 }}>
                    同派≥60%→1.15（团结但脆弱）· 跨派均衡→1.10 · 严重对立→0.85。最终班子加成 × 合力系数（§4.3）。
                  </Text>
                </View>
                {/* 三组小 Tab */}
                <View style={{ flexDirection: 'row', backgroundColor: theme.quickStatBg, borderBottomWidth: 1, borderBottomColor: theme.cardBorder }}>
                  {GROUP_TABS.map(([g, label, icon, color]) => (
                    <Pressable key={g} onPress={() => setBandGroupTab(g)}
                      style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: bandGroupTab === g ? color : 'transparent' }}>
                      <Text style={{ fontSize: 13 }}>{icon}</Text>
                      <Text style={{ fontSize: 9, color: bandGroupTab === g ? color : theme.headerSub, fontWeight: bandGroupTab === g ? '700' : '400', marginTop: 1 }}>{label}</Text>
                      <Text style={{ fontSize: 8, color: theme.mutedText, marginTop: 1 }}>
                        {(g === 'party' ? partyMembers : g === 'gov' ? govMembers : ndaMembers).filter(m => !m.isRetired).length}人
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <FlatList
                  data={currentList}
                  keyExtractor={m => m.id}
                  contentContainerStyle={{ padding: 14, gap: 8 }}
                  contentInsetAdjustmentBehavior="automatic"
                  ListHeaderComponent={
                    <View style={{ gap: 8 }}>
                      {/* 玩家任命的班子成员 */}
                      {band.length > 0 && (
                        <View style={{ backgroundColor: '#1a3a1a', borderLeftWidth: 3, borderLeftColor: '#4CAF50', padding: 10 }}>
                          <Text style={{ color: '#7FE08A', fontSize: 11, fontWeight: '700' }}>
                            ⭐ 玩家任命成员 · 共{band.length}人
                          </Text>
                          <Text style={{ color: theme.headerSub, fontSize: 10, marginTop: 2 }}>
                            由你提名并经代会任命的班子成员，已进入当届班子。
                          </Text>
                          <View style={{ marginTop: 6, gap: 4 }}>
                            {band.map((m) => (
                              <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#7FE08A' }}>{m.subName}</Text>
                                <Text style={{ fontSize: 11, color: theme.headerSub }}>→ {m.roleLabel}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                      <View style={{ backgroundColor: theme.quickStatBg, borderLeftWidth: 3, borderLeftColor: groupColor, padding: 10 }}>
                        <Text style={{ color: groupColor, fontSize: 11, fontWeight: '700' }}>
                          {GROUP_TABS.find(g => g[0] === bandGroupTab)?.[1]} · 共{currentList.filter(m => !m.isRetired).length}人 · 退休年龄{retireAge}岁
                        </Text>
                        <Text style={{ color: theme.headerSub, fontSize: 10, marginTop: 2 }}>
                          点击成员可查看仕途档案。橙色/红色年龄提示临近/到达退休年龄。
                        </Text>
                      </View>
                    </View>
                  }
                  ListEmptyComponent={
                    <View style={{ alignItems: 'center', marginTop: 60 }}>
                      <Text style={{ fontSize: 32, marginBottom: 12 }}>👥</Text>
                      <Text style={{ fontSize: 13, color: theme.headerSub, textAlign: 'center' }}>
                        {npcMembers.length === 0 ? '领导班子成员正在生成…\n请稍后刷新' : '该组暂无成员'}
                      </Text>
                    </View>
                  }
                  renderItem={({ item: m }) => (
                    <Pressable
                      onPress={() => { if (m.age > 0) setSelectedMember(m); }}
                      style={{
                        backgroundColor: m.isRetired ? theme.sectionHeaderBg : theme.quickStatBg,
                        borderWidth: 1, borderColor: m.isRetired ? theme.cardBorder : theme.sectionHeaderBorder,
                        flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10,
                        opacity: m.isRetired ? 0.5 : 1,
                        borderLeftWidth: 3, borderLeftColor: m.age === 0 ? '#C82829' : (FACTION_COLOR[m.faction] ?? groupColor),
                      }}
                    >
                      {/* 证件照头像 */}
                      <View style={{ width: 40, height: 48, backgroundColor: '#EDE8DF', borderWidth: 1, borderColor: FACTION_COLOR[m.faction] + '66', overflow: 'hidden', flexShrink: 0 }}>
                        {m.age > 0 ? (
                          <Image
                            source={{ uri: getAvatarImageUrl(m.avatarId ?? 0, m.gender ?? '男', m.positionLabel) }}
                            style={{ width: 40, height: 48 }}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: '#aaa', fontSize: 10 }}>空缺</Text>
                          </View>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: m.age === 0 ? theme.primary : theme.headerText }}>{m.name}</Text>
                          {m.age > 0 && (
                            <Text style={{ fontSize: 11, color: ageColor(m.age, playerRank), fontWeight: '600' }}>{m.age}岁</Text>
                          )}
                          {m.gender && m.age > 0 && (
                            <View style={{ backgroundColor: m.gender === '女' ? '#880044' : '#003388', paddingHorizontal: 4, paddingVertical: 1 }}>
                              <Text style={{ color: '#fff', fontSize: 8 }}>{m.gender}</Text>
                            </View>
                          )}
                          {m.age > 0 && m.age >= retireAge - 1 && !m.isRetired && (
                            <View style={{ backgroundColor: theme.primary, paddingHorizontal: 4, paddingVertical: 1 }}>
                              <Text style={{ color: '#fff', fontSize: 8 }}>临近退休</Text>
                            </View>
                          )}
                          {m.isRetired && (
                            <View style={{ backgroundColor: '#3a3a3a', paddingHorizontal: 4, paddingVertical: 1 }}>
                              <Text style={{ color: '#888', fontSize: 8 }}>已退休</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 12, color: theme.accentSub, fontWeight: '600', marginBottom: 3 }}>{m.positionLabel}</Text>
                        {m.age > 0 && (
                          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: 10, color: FACTION_COLOR[m.faction] }}>
                              {FACTION_ICONS[m.faction]} {FACTION_LABEL[m.faction]}
                            </Text>
                            <Text style={{ fontSize: 10, color: theme.headerSub }}>能力{m.ability}</Text>
                            <Text style={{ fontSize: 10, color: theme.headerSub }}>廉洁{m.integrity}</Text>
                            <Text style={{ fontSize: 10, color: m.loyalty >= 70 ? '#4CAF50' : m.loyalty < 40 ? '#C82829' : '#5577AA' }}>
                              好感{m.loyalty}
                            </Text>
                            {(m.birthProvince || m.birthCity) && (
                              <Text style={{ fontSize: 10, color: theme.mutedText }}>
                                📍{m.birthProvince}{m.birthCity}
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                      {m.age > 0 && <Text style={{ fontSize: 11, color: theme.headerSub }}>›</Text>}
                    </Pressable>
                  )}
                />
              </View>
            );
          })()}

          {/* ════════ TAB: 代会任命 → 跳转代会系统 ════════ */}
          {tab === 'appoint' && (
            <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 16, gap: 14 }}>
              {/* 说明标题 */}
              <View style={{ backgroundColor: theme.quickStatBg, borderLeftWidth: 3, borderLeftColor: theme.accentSub, padding: 12 }}>
                <Text style={{ color: theme.accentSub, fontSize: 13, fontWeight: '700' }}>🏛️ 人事任命须经代表大会</Text>
                <Text style={{ color: theme.headerSub, fontSize: 11, marginTop: 4, lineHeight: 18 }}>
                  根据宪法及党章规定，领导班子成员的任命须经各级代表大会提名、审议与表决通过，不得由个人擅自决定。
                </Text>
              </View>

              {/* 三大代会入口 */}
              {[
                {
                  key: 'party',
                  title: '党代会',
                  icon: '🏛️',
                  desc: '党委书记、副书记、常委的选举与任命，须经同级党代表大会或党代会常委会审议。',
                  color: '#7A1B1E',
                  windowInfo: (() => {
                    const inW = isInSessionWindow('party', save.rankLevel, save.gameDays);
                    const days = daysToNextSession('party', save.rankLevel, save.gameDays);
                    return inW ? '✅ 当前处于换届窗口期，可提交提名' : `⏳ 距下次换届约 ${days >= 9999 ? '—' : days} 天`;
                  })(),
                },
                {
                  key: 'gov',
                  title: '人民代表大会',
                  icon: '📜',
                  desc: '县长/市长/省长/副职等政府领导成员，须经人民代表大会选举产生或议政院常委会批准。',
                  color: '#1A3A4A',
                  windowInfo: (() => {
                    const inW = isInSessionWindow('gov_senior', save.rankLevel, save.gameDays);
                    const days = daysToNextSession('gov_senior', save.rankLevel, save.gameDays);
                    return inW ? '✅ 当前议政院会议期，可提交提名' : `⏳ 距下次议政院会议约 ${days >= 9999 ? '—' : days} 天`;
                  })(),
                },
                {
                  key: 'nda',
                  title: '议政院常委会',
                  icon: '⚖️',
                  desc: '议政院主任、副主任等议政院班子成员，须经人民代表大会选举或议政院常委会审议任命。',
                  color: '#1A3A2A',
                  windowInfo: (() => {
                    const inW = isInSessionWindow('npc', save.rankLevel, save.gameDays);
                    const days = daysToNextSession('npc', save.rankLevel, save.gameDays);
                    return inW ? '✅ 当前议政院会议期，可提交提名' : `⏳ 距下次议政院会议约 ${days >= 9999 ? '—' : days} 天`;
                  })(),
                },
              ].map(entry => (
                <Pressable
                  key={entry.key}
                  onPress={() => router.push('/(app)/npc-congress')}
                  style={{ backgroundColor: theme.quickStatBg, borderWidth: 1, borderColor: theme.cardBorder, borderLeftWidth: 4, borderLeftColor: entry.color, padding: 14, gap: 8 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 22 }}>{entry.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: entry.color, fontSize: 14, fontWeight: '700' }}>{entry.title}</Text>
                      <Text style={{ color: theme.headerSub, fontSize: 11, marginTop: 2 }}>{entry.desc}</Text>
                    </View>
                    <Text style={{ color: theme.headerSub, fontSize: 18 }}>›</Text>
                  </View>
                  <View style={{ backgroundColor: theme.sectionHeaderBg, padding: 8, borderRadius: 2 }}>
                    <Text style={{ fontSize: 11, color: theme.mutedText }}>{entry.windowInfo}</Text>
                  </View>
                </Pressable>
              ))}

              {/* 说明提示 */}
              <View style={{ backgroundColor: theme.sectionHeaderBg, borderWidth: 1, borderColor: theme.cardBorder, padding: 12 }}>
                <Text style={{ fontSize: 11, color: theme.mutedText, lineHeight: 18 }}>
                  📌 提名须在代表大会会议期内提交，非会议期提交属「补缺程序」，将扣除政绩与上司好感。{'\n'}
                  🔵 当届班子中的 NPC 成员通过代会程序选举产生，如需替换请前往对应代会提交提名。{'\n'}
                  🟡 经代会通过后，任命结果将自动同步至"当届班子"展示。
                </Text>
              </View>
            </ScrollView>
          )}

          {/* ════════ TAB: 个人档案 ════════ */}
          {tab === 'career' && (
            <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }} contentInsetAdjustmentBehavior="automatic">

              {/* ── 基本信息卡 ── */}
              <View style={{ backgroundColor: '#1D3B6C', padding: 12, borderLeftWidth: 3, borderLeftColor: '#7EB8D4' }}>
                <Text style={{ color: '#B8C8E0', fontSize: 9, letterSpacing: 2, marginBottom: 4 }}>PERSONAL RECORD · 个人档案</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 52, height: 64, backgroundColor: '#EDE8DF', borderWidth: 2, borderColor: '#7EB8D4', overflow: 'hidden' }}>
                    <Image
                      source={{ uri: getAvatarImageUrl(save.avatarId ?? 0, save.playerGender ?? '男', save.rankName ?? '') }}
                      style={{ width: 52, height: 64 }}
                      contentFit="cover"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>{save.playerName}</Text>
                    <Text style={{ color: '#93A8C0', fontSize: 11, marginTop: 2 }}>
                      {save.playerGender} · {save.playerAge} 岁
                    </Text>
                    {save.birthYear > 0 && (
                      <Text style={{ color: '#7799BB', fontSize: 11, marginTop: 1 }}>
                        {save.birthYear} 年生
                        {save.birthProvince ? `于${save.birthProvince}` : ''}
                        {save.birthCity ? save.birthCity : ''}
                      </Text>
                    )}
                    <Text style={{ color: '#E8D5A0', fontSize: 11, fontWeight: '600', marginTop: 3 }}>
                      {save.rankName}
                    </Text>
                  </View>
                </View>
              </View>

              {/* ── 学历信息 ── */}
              <View style={{ backgroundColor: '#111E30', borderWidth: 1, borderColor: '#2D4A6B', padding: 12 }}>
                <Text style={{ color: '#E8D5A0', fontSize: 11, fontWeight: '700', marginBottom: 8 }}>🎓 学历信息</Text>
                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                    <Text style={{ color: '#5577AA', fontSize: 11, width: 60 }}>院校层级</Text>
                    <Text style={{ color: '#C8E0F4', fontSize: 12, flex: 1 }}>{save.school || '未知'}</Text>
                  </View>
                  {save.universityName && (
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                      <Text style={{ color: '#5577AA', fontSize: 11, width: 60 }}>毕业院校</Text>
                      <Text style={{ color: '#C8E0F4', fontSize: 12, flex: 1 }}>{save.universityName}</Text>
                    </View>
                  )}
                  {save.birthYear > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                      <Text style={{ color: '#5577AA', fontSize: 11, width: 60 }}>出生年份</Text>
                      <Text style={{ color: '#C8E0F4', fontSize: 12, flex: 1 }}>{save.birthYear} 年</Text>
                    </View>
                  )}
                  {(save.birthProvince || save.birthCity) && (
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                      <Text style={{ color: '#5577AA', fontSize: 11, width: 60 }}>籍贯</Text>
                      <Text style={{ color: '#C8E0F4', fontSize: 12, flex: 1 }}>
                        {save.birthProvince}{save.birthCity}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* ── 仕途历程时间线 ── */}
              <View style={{ backgroundColor: '#111E30', borderWidth: 1, borderColor: '#2D4A6B', padding: 14 }}>
                <Text style={{ color: '#E8D5A0', fontSize: 11, fontWeight: '700', marginBottom: 10 }}>📋 仕途历程</Text>
                {playerCareer.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                    <Text style={{ fontSize: 28, marginBottom: 8 }}>📄</Text>
                    <Text style={{ fontSize: 12, color: '#5577AA', textAlign: 'center' }}>仕途历程尚未记录{'\n'}每次晋升后将自动写入档案</Text>
                  </View>
                ) : (
                  playerCareer.map((entry, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ width: 32, alignItems: 'center' }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#7EB8D4', marginTop: 5 }} />
                        {i < playerCareer.length - 1 && (
                          <View style={{ width: 2, flex: 1, backgroundColor: '#2D4A6B', marginTop: 2 }} />
                        )}
                      </View>
                      <View style={{ flex: 1, paddingBottom: 14 }}>
                        <Text style={{ fontSize: 10, color: theme.mutedText }}>
                          {entry.startYear ?? '——'} — {entry.endYear ?? '至今'}
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#C8E0F4', marginTop: 1 }}>
                          {entry.city}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#7799BB' }}>{entry.position}</Text>
                      </View>
                    </View>
                  ))
                )}
                {/* 当前职务节点 */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ width: 32, alignItems: 'center' }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.primary }} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, color: theme.primary }}>2025 — 至今（现职）</Text>
                    <Text style={{ fontSize: 11, color: '#888', marginBottom: 1 }}>{save.cityName}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#C82829' }}>{save.rankName}</Text>
                  </View>
                </View>
              </View>

              {/* ── 健康状态 ── */}
              {playerHealth && (
                <View style={{ backgroundColor: '#111E30', borderWidth: 1, borderColor: '#2D4A6B', padding: 12 }}>
                  <Text style={{ fontSize: 11, color: '#E8D5A0', fontWeight: '700', marginBottom: 8 }}>🏥 当前身体状态</Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1, backgroundColor: '#1a0a0a', padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#3a1515' }}>
                      <Text style={{ fontSize: 10, color: '#7799BB' }}>健康值</Text>
                      <Text style={{ fontSize: 22, fontWeight: '700', color: playerHealth.health < 30 ? '#C82829' : '#4CAF50', marginTop: 2 }}>{playerHealth.health}</Text>
                      <Text style={{ fontSize: 9, color: '#5577AA' }}>/ 100</Text>
                      {playerHealth.isOnLeave && <Text style={{ fontSize: 9, color: '#C82829', marginTop: 2 }}>因病休假中</Text>}
                    </View>
                    <View style={{ flex: 1, backgroundColor: '#0a0a1a', padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#1a1a3a' }}>
                      <Text style={{ fontSize: 10, color: '#7799BB' }}>精力值</Text>
                      <Text style={{ fontSize: 22, fontWeight: '700', color: playerHealth.energy < 30 ? '#E67E22' : '#7EB8D4', marginTop: 2 }}>{playerHealth.energy}</Text>
                      <Text style={{ fontSize: 9, color: '#5577AA' }}>/ 100</Text>
                    </View>
                  </View>
                  <Pressable onPress={() => router.push('/(app)/health')} style={{ marginTop: 10, backgroundColor: '#1D3B6C', padding: 10, alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>前往健康管理 →</Text>
                  </Pressable>
                </View>
              )}
              <View style={{ height: 24 }} />
            </ScrollView>
          )}


          {/* ════════ TAB: 城市指标 ════════ */}
          {tab === 'city' && (
            <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }} contentInsetAdjustmentBehavior="automatic">
              <View style={{ backgroundColor: theme.headerBg, padding: 12 }}>
                <Text style={{ color: theme.headerSub, fontSize: 10, letterSpacing: 1.5 }}>CITY METRICS</Text>
                <Text style={{ color: theme.headerText, fontSize: 14, fontWeight: '700', marginTop: 2 }}>{save.cityName} · 综合治理指标</Text>
              </View>
              {!cityMetrics ? (
                <Text style={{ color: theme.headerSub, textAlign: 'center', marginTop: 40 }}>城市指标暂未初始化</Text>
              ) : (
                <>
                  {([
                    { label: 'GDP增长', key: 'gdp', icon: '📈', color: '#7EB8D4', desc: 'GDP每提升→带动财政收入增加' },
                    { label: '财政收入', key: 'finance', icon: '💰', color: '#4CAF50', desc: '财政充裕→教育/医疗投入上限提升' },
                    { label: '环境质量', key: 'ecology', icon: '🌿', color: '#81C784', desc: `当前招商加成 +${cityMetrics.investBonus}%` },
                    { label: '社会稳定', key: 'stability', icon: '🛡️', color: '#E8D5A0', desc: `当前信访减少 ${cityMetrics.petitionReduction}%` },
                    { label: '教育投入', key: 'education', icon: '📚', color: '#FFB74D', desc: `人才积累指数 ${cityMetrics.talentPool}` },
                    { label: '医疗投入', key: 'healthcare', icon: '🏥', color: '#CE93D8', desc: '医疗水平影响人口健康增长' },
                  ] as { label: string; key: keyof CityMetrics; icon: string; color: string; desc: string }[]).map(item => {
                    const val = cityMetrics[item.key] as number;
                    return (
                      <View key={item.key} style={{ backgroundColor: theme.quickStatBg, borderWidth: 1, borderColor: theme.cardBorder, padding: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.headerText }}>{item.label}</Text>
                          </View>
                          <Text style={{ fontSize: 20, fontWeight: '700', color: item.color }}>{val}</Text>
                        </View>
                        <View style={{ height: 5, backgroundColor: '#1E3050', marginBottom: 4 }}>
                          <View style={{ height: 5, width: `${val}%`, backgroundColor: item.color }} />
                        </View>
                        <Text style={{ fontSize: 10, color: theme.mutedText }}>{item.desc}</Text>
                      </View>
                    );
                  })}
                  <View style={{ backgroundColor: theme.quickStatBg, borderLeftWidth: 3, borderLeftColor: theme.sectionHeaderBorder, padding: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: theme.accentSub, marginBottom: 6 }}>🔗 当前联动效果</Text>
                    <Text style={{ fontSize: 11, color: theme.headerSub, lineHeight: 18 }}>
                      📈 GDP→财政：每+1点GDP带来约+0.5财政{'\n'}
                      🌿 生态→招商：+{cityMetrics.investBonus}% 招商引资成功率{'\n'}
                      🛡️ 稳定→信访：减少 {cityMetrics.petitionReduction}% 信访事件{'\n'}
                      📚 教育→人才：累积分 {cityMetrics.talentPool}（满200享受晋升加成）
                    </Text>
                  </View>
                </>
              )}
              <View style={{ height: 24 }} />
            </ScrollView>
          )}

          {/* ════════ TAB: 政策运动 ════════ */}
          {tab === 'policy' && (
            <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }} contentInsetAdjustmentBehavior="automatic">
              <View style={{ backgroundColor: theme.headerBg, padding: 12 }}>
                <Text style={{ color: theme.headerSub, fontSize: 10, letterSpacing: 1.5 }}>NATIONAL POLICY</Text>
                <Text style={{ color: theme.headerText, fontSize: 14, fontWeight: '700', marginTop: 2 }}>国家重大政策运动</Text>
              </View>
              {!activePolicy ? (
                <View style={{ backgroundColor: theme.quickStatBg, borderWidth: 1, borderColor: theme.cardBorder, padding: 24, alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, marginBottom: 8 }}>🕊️</Text>
                  <Text style={{ fontSize: 13, color: theme.headerSub, textAlign: 'center' }}>当前无进行中的国家政策运动{'\n'}运动随机在每年年初触发（30%概率）</Text>
                </View>
              ) : (
                <View style={{ backgroundColor: theme.quickStatBg, borderWidth: 2, borderColor: theme.primary, overflow: 'hidden' }}>
                  <View style={{ backgroundColor: '#C82829', padding: 12 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 9, letterSpacing: 2 }}>中共中央 · 国政院</Text>
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 2 }}>
                      关于深入开展{activePolicy.policyName}的通知
                    </Text>
                  </View>
                  <View style={{ padding: 14 }}>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                      <View style={{ backgroundColor: theme.alertBg, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: theme.alertBorder }}>
                        <Text style={{ fontSize: 11, color: theme.alertText }}>📅 开始第 {activePolicy.startGameDay} 天</Text>
                      </View>
                      <View style={{ backgroundColor: theme.alertBg, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: theme.alertBorder }}>
                        <Text style={{ fontSize: 11, color: theme.alertText }}>⏱ 持续 {activePolicy.durationDays} 天</Text>
                      </View>
                      {activePolicy.responded && (
                        <View style={{ backgroundColor: '#0e2a1a', paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#1a5a2a' }}>
                          <Text style={{ fontSize: 11, color: '#4CAF50' }}>✅ 已响应</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 12, color: '#C8E0F4', lineHeight: 20, marginBottom: 14 }}>
                      各地区各部门须高度重视，将{activePolicy.policyName}列为当前重点工作任务，
                      落实责任，确保取得实效。积极响应者予以政绩加分，消极应对者予以通报批评。
                    </Text>
                    {policyFeedback ? (
                      <View style={{ backgroundColor: theme.accentBg, padding: 10, borderWidth: 1, borderColor: theme.cardBorder }}>
                        <Text style={{ fontSize: 12, color: theme.statHigh }}>{policyFeedback}</Text>
                      </View>
                    ) : !activePolicy.responded ? (
                      <Pressable onPress={() => void handleRespondPolicy()} style={{ backgroundColor: theme.primary, padding: 12, alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>积极响应政策运动</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              )}
              <View style={{ backgroundColor: theme.quickStatBg, borderLeftWidth: 3, borderLeftColor: theme.sectionHeaderBorder, padding: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.accentSub, marginBottom: 6 }}>📖 运动说明</Text>
                <Text style={{ fontSize: 10, color: theme.headerSub, lineHeight: 16 }}>
                  国家重大政策运动每年有30%概率随机触发，持续90-180天。{'\n'}
                  积极响应可获得政绩+35~+60及晋升加分+4~+8。{'\n'}
                  消极应对将受到政绩处罚，影响年度考核。{'\n'}
                  运动类型涵盖：扫黑除恶、环保督查、反腐败、乡村振兴、共同富裕、安全生产、教育提升、经济攻坚。
                </Text>
              </View>
              <View style={{ height: 24 }} />
            </ScrollView>
          )}
        </>
      )}

      {/* 选人弹窗 */}
      {selectingRole && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: theme.pageBg, maxHeight: '75%', borderTopWidth: 1, borderTopColor: theme.cardBorder }}>
            <View style={{ backgroundColor: theme.quickStatBg, padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ color: theme.accentSub, fontWeight: '700', fontSize: 14 }}>选择 {selectingRole.label} 人选</Text>
                <Pressable onPress={() => { setSelectingRole(null); setSearch(''); }}>
                  <Text style={{ color: theme.headerSub, fontSize: 22 }}>×</Text>
                </Pressable>
              </View>
              <TextInput
                value={search} onChangeText={setSearch}
                placeholder="搜索姓名或职务…" placeholderTextColor={theme.mutedText}
                style={{ backgroundColor: theme.sectionHeaderBg, color: theme.valueText, paddingHorizontal: 12, paddingVertical: 7, fontSize: 13, borderWidth: 1, borderColor: theme.cardBorder }}
              />
            </View>
            <ScrollView contentContainerStyle={{ padding: 14, gap: 8 }}>
              {filteredSubs.length === 0 ? (
                <Text style={{ color: theme.mutedText, textAlign: 'center', padding: 20 }}>{search ? '无符合条件的下属' : '暂无可用下属'}</Text>
              ) : filteredSubs.map(sub => {
                const inBand = band.some(b => b.subId === sub.id);
                const required = selectingRole.requiredSubLevel ?? 1;
                const levelOk = sub.subLevel >= required;
                const reqName = SUB_LEVEL_NAMES[required] ?? `${required}级`;
                const subLevelName = SUB_LEVEL_NAMES[sub.subLevel] ?? `${sub.subLevel}级`;
                const fColor = FACTION_COLOR[sub.faction] ?? '#888';
                const disabled = inBand || !levelOk;
                return (
                  <Pressable key={sub.id} onPress={() => { if (!disabled) void handleAssign(sub); }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderWidth: 1, borderColor: !levelOk ? theme.alertBorder : inBand ? theme.cardBorder : theme.sectionHeaderBorder, backgroundColor: !levelOk ? theme.alertBg : inBand ? theme.sectionHeaderBg : theme.quickStatBg, opacity: disabled ? 0.55 : 1 }}
                  >
                    <View style={{ width: 38, height: 48, backgroundColor: '#EDE8DF', borderWidth: 1, borderColor: fColor + '66', overflow: 'hidden' }}>
                      <Image
                        source={{ uri: getAvatarImageUrl(sub.avatarId ?? 0, sub.gender ?? '男', sub.position ?? '') }}
                        style={{ width: 38, height: 48 }}
                        contentFit="cover"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2, flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: disabled ? theme.mutedText : theme.headerText }}>{sub.name}</Text>
                        <View style={{ backgroundColor: fColor + '22', borderWidth: 1, borderColor: fColor + '66', paddingHorizontal: 4, paddingVertical: 1 }}>
                          <Text style={{ fontSize: 9, color: fColor }}>{FACTION_LABEL[sub.faction]}</Text>
                        </View>
                        <View style={{ backgroundColor: levelOk ? '#1a3a2e' : '#3a1a1a', borderWidth: 1, borderColor: levelOk ? '#2a5a3e' : '#6a2a2a', paddingHorizontal: 4, paddingVertical: 1 }}>
                          <Text style={{ fontSize: 9, color: levelOk ? '#4CAF90' : '#CC5544' }}>{subLevelName}</Text>
                        </View>
                        {inBand && <View style={{ backgroundColor: '#1E3050', paddingHorizontal: 5, paddingVertical: 1 }}><Text style={{ fontSize: 9, color: '#5577AA' }}>已在班子</Text></View>}
                      </View>
                      <Text style={{ fontSize: 11, color: '#5577AA' }}>能力 {sub.ability} · 忠诚 {sub.loyalty} · 廉洁 {sub.integrity}</Text>
                      {!levelOk && <Text style={{ fontSize: 10, color: theme.primary, marginTop: 2 }}>⚠ 需 {reqName}，当前 {subLevelName}，职级不足</Text>}
                    </View>
                    {!disabled && (
                      <View style={{ backgroundColor: theme.statHigh, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 2 }}>
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>选择</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      )}

      {/* 民主评议弹窗 */}
      {reviewState && save && (
        <DemocraticReview
          visible={!!reviewState}
          candidate={{ name: reviewState.sub.name, faction: reviewState.sub.faction, ability: reviewState.sub.ability, loyalty: reviewState.sub.loyalty, integrity: reviewState.sub.integrity, targetRole: reviewState.role.label }}
          participants={band.map(m => subs.find(s => s.id === m.subId)).filter((s): s is Subordinate => !!s)}
          approvalLevel={reviewState.approvalLevel}
          onConfirm={() => void handleReviewConfirm()}
          onForceConfirm={() => void handleReviewForceConfirm()}
          onCancel={() => setReviewState(null)}
        />
      )}

      {/* NPC个人档案弹窗 */}
      {selectedMember && (
        <CareerModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          rankLevel={playerRank}
          playerBirthProvince={save.birthProvince}
          playerBirthCity={save.birthCity}
          playerUniversity={save.universityName}
          saveCityName={save.cityName}
        />
      )}
    </View>
  );
}

function EcoChip({ text, color }: { text: string; color: string }) {
  return (
    <View style={{ backgroundColor: color + '18', borderWidth: 1, borderColor: color + '55', paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color, fontSize: 10, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}

function EcoAction({ label, hint, onPress }: { label: string; hint: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1, borderWidth: 1, borderColor: '#D9D9D9', paddingVertical: 6, paddingHorizontal: 6, alignItems: 'center', backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: '#1A1A1A' }}>{label}</Text>
      <Text style={{ fontSize: 9, color: '#999', marginTop: 1 }}>{hint}</Text>
    </Pressable>
  );
}
```

<a id="srcappapplivelihoodtsx"></a>
## `src/app/(app)/livelihood.tsx`

```tsx
// 民生详情页面 — 全面展示城市民生状况，数据随全局操作动态变化
import React, { useCallback } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';

// ────────────────────────────────────────────────────────
// 人口基准数据（参照2020年全国人口普查及行政区划实际数据）
//
// 乡镇级（1-3）：中国乡镇平均常住人口约1.5万，范围0.5-5万
// 县级（4-6）：县级行政区平均约43万，范围20-120万
// 地级市（7-9）：地级市平均约400万，范围50-2000万
// 省级（10-11）：省份平均约9400万，范围80万(西藏)-1.26亿(广东)
// 国家级（12+）：管辖全国约14.1亿
// ────────────────────────────────────────────────────────
const BASE_POPULATION: Record<number, number> = {
  1:  8000,      // 乡镇科员：所在乡镇约0.8万
  2:  12000,     // 副乡镇长：乡镇约1.2万
  3:  22000,     // 乡镇长：乡镇约2.2万
  4:  400000,    // 副县长：县约40万
  5:  500000,    // 县长：县约50万
  6:  620000,    // 县委书记：县约62万
  7:  2500000,   // 副市长：地级市约250万
  8:  3800000,   // 市长：地级市约380万
  9:  5000000,   // 市委书记：地级市约500万
  10: 50000000,  // 省长：省份约5000万
  11: 65000000,  // 省委书记：省份约6500万
  12: 1410000000,// 部长：全国约14.1亿
  13: 1410000000,
  14: 1410000000,
  15: 1410000000,
};

// 城镇化率基准（%）
const URBAN_RATE_BASE: Record<number, number> = {
  1: 25, 2: 28, 3: 32,        // 乡镇：城镇化率较低
  4: 48, 5: 52, 6: 55,        // 县级
  7: 62, 8: 65, 9: 68,        // 地级市
  10: 72, 11: 74,              // 省级
  12: 67, 13: 67, 14: 67, 15: 67, // 全国
};

function calcPopulation(rankLevel: number, livelihood: number): number {
  const base = BASE_POPULATION[rankLevel] ?? 50000;
  // 民生指数影响人口（高民生吸引外来人口，低民生导致人口流失）
  const factor = 0.85 + (livelihood / 100) * 0.30;
  return Math.round(base * factor);
}

function formatPop(n: number): string {
  if (n >= 100000000) return `${(n / 100000000).toFixed(2)}亿`;
  if (n >= 10000)     return `${(n / 10000).toFixed(1)}万`;
  return `${n}`;
}

// 月人均可支配收入（元）推算
// 参照2023年统计公报，全国城镇居民月均可支配收入约3700元，农村约1650元
function calcMonthlyIncome(rankLevel: number, residentIncome: number): number {
  const base = rankLevel >= 10 ? 4200 : rankLevel >= 7 ? 3600 : rankLevel >= 4 ? 2800 : 1800;
  return Math.round(base * (0.5 + residentIncome / 100 * 1.0));
}

// 医疗保险覆盖率（%）：全国基本医保已覆盖95%+，模拟中低端值为初始
function calcMedicalCoverage(healthcareRate: number): number {
  return Math.min(99, Math.round(50 + healthcareRate * 0.48));
}

// 义务教育巩固率（%）参照全国2023年九年义务教育巩固率约95.7%
function calcEduRetention(eduLevel: number): number {
  return Math.min(99, Math.round(60 + eduLevel * 0.38));
}

// 万人拥有病床数（张/万人）：全国约68张（2023）
function calcBedsPerWan(rankLevel: number, healthcareRate: number): number {
  const base = rankLevel >= 10 ? 75 : rankLevel >= 7 ? 60 : rankLevel >= 4 ? 45 : 28;
  return Math.round(base * (0.5 + healthcareRate / 100 * 1.0));
}

// 保障房覆盖率（%）
function calcHousingSecurity(housingRate: number): number {
  return Math.min(60, Math.round(5 + housingRate * 0.55));
}

// 城镇化率（%）
function calcUrbanRate(rankLevel: number, cityLivelihood: number): number {
  const base = URBAN_RATE_BASE[rankLevel] ?? 55;
  return Math.min(95, Math.round(base + cityLivelihood * 0.12));
}

// 人口自然增长率（‰）：全国2023年约-1.5‰
function calcNaturalGrowth(residentIncome: number, healthcareRate: number): number {
  const raw = -2 + (residentIncome + healthcareRate) / 100 * 4;
  return Math.round(raw * 10) / 10;
}

// 万人拥有学校数
function calcSchoolsPerWan(rankLevel: number, eduLevel: number): number {
  const base = rankLevel <= 3 ? 3.5 : rankLevel <= 6 ? 2.8 : rankLevel <= 9 ? 2.2 : 1.8;
  return Math.round((base * (0.6 + eduLevel / 100 * 0.8)) * 10) / 10;
}

// 社会消费品零售总额增速（%）
function calcRetailGrowth(residentIncome: number, cityGdp: number): number {
  return Math.round((residentIncome * 0.04 + cityGdp * 0.02) * 10) / 10;
}

function ProgressBar({ value, color, height = 6 }: { value: number; color: string; height?: number }) {
  return (
    <View style={{ height, backgroundColor: '#EBEBEB', flex: 1, borderRadius: 1 }}>
      <View style={{ height, width: `${Math.min(100, Math.max(0, value))}%` as `${number}%`, backgroundColor: color, borderRadius: 1 }} />
    </View>
  );
}

interface StatRowProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  indent?: boolean;
}
function StatRow({ label, value, sub, color = '#222', indent }: StatRowProps) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 5, paddingLeft: indent ? 12 : 0, borderBottomWidth: 1, borderBottomColor: '#F0EEEA' }}>
      <Text style={{ fontSize: 12, color: '#555', flex: 1 }}>{label}</Text>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color }}>{value}</Text>
        {sub ? <Text style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}>{sub}</Text> : null}
      </View>
    </View>
  );
}

interface SectionProps { title: string; icon: string; children: React.ReactNode }
function Section({ title, icon, children }: SectionProps) {
  return (
    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14, gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Text style={{ fontSize: 14 }}>{icon}</Text>
        <Text style={{ fontSize: 11, color: '#666', letterSpacing: 1.5, fontWeight: '600' }}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// 影响因素来源说明
const IMPACT_SOURCES = [
  { icon: '📋', title: '秘书室·起草文件', desc: '党建/整治类公文 → 下属廉洁+；社会治理类 → 治安提升；民生类公文 → 城市民生指数+' },
  { icon: '📩', title: '秘书室·辅助申请', desc: '文明城市/平安建设申请 → 民生指数、治安+；项目补贴 → 居民收入+；教育项目 → 教育水平+' },
  { icon: '🏗️', title: '城市建设', desc: '基础设施建设 → GDP/民生+；教育文化设施 → 教育+；医疗项目 → 医疗覆盖+' },
  { icon: '🏛️', title: '招商局', desc: '企业入驻 → 就业岗位增加 → 居民收入+；营商环境提升 → GDP+' },
  { icon: '🚔', title: '公安系统', desc: '破获案件、专项整治 → 治安指数+；扫黑除恶行动 → 民生满意度+' },
  { icon: '📑', title: '职能部门行政活动', desc: '民政局慰问、教育局专项、卫健委普查等活动 → 对应民生分项+' },
  { icon: '⚖️', title: '四大班子·廉洁自查', desc: '开展廉洁自查、配合巡视 → 下属廉洁+ → 间接提升民心满意度' },
  { icon: '💰', title: '财政投入', desc: '城市财政盈余充裕时，月结算自动小幅提升民生基础指标' },
];

export default function LivelihoodPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, refreshSave } = useGame();

  useFocusEffect(useCallback(() => {
    refreshSave();
  }, [refreshSave]));

  if (!save) return null;

  const rl = save.rankLevel;

  // 基础计算
  const population      = calcPopulation(rl, save.cityLivelihood);
  const urbanRate       = calcUrbanRate(rl, save.cityLivelihood);
  const monthlyIncome   = calcMonthlyIncome(rl, save.residentIncome);
  const annualIncome    = monthlyIncome * 12;
  const medCoverage     = calcMedicalCoverage(save.healthcareRate);
  const eduRetention    = calcEduRetention(save.eduLevel);
  const bedsPerWan      = calcBedsPerWan(rl, save.healthcareRate);
  const schoolsPerWan   = calcSchoolsPerWan(rl, save.eduLevel);
  const housingSec      = calcHousingSecurity(save.housingRate);
  const naturalGrowth   = calcNaturalGrowth(save.residentIncome, save.healthcareRate);
  const retailGrowth    = calcRetailGrowth(save.residentIncome, save.cityGdp);
  const isNational      = rl >= 12;

  // 民心综合得分
  const compositeScore = Math.round(
    save.residentIncome * 0.30 +
    save.healthcareRate * 0.28 +
    save.eduLevel       * 0.22 +
    save.housingRate    * 0.20
  );
  const scoreLevel =
    compositeScore >= 80 ? { label: '优秀', color: '#2a7a3b', bg: '#f0faf3' } :
    compositeScore >= 65 ? { label: '良好', color: '#2B4B6F', bg: '#f0f4fa' } :
    compositeScore >= 45 ? { label: '一般', color: '#b35900', bg: '#fff8f0' } :
    { label: '较差', color: '#C82829', bg: '#fff5f5' };

  // 人口趋势方向
  const popTrend = naturalGrowth > 0.5 ? '↑ 净流入' : naturalGrowth < -1 ? '↓ 净流出' : '→ 基本稳定';
  const popTrendColor = naturalGrowth > 0.5 ? '#2a7a3b' : naturalGrowth < -1 ? '#C82829' : '#888';

  // 贫困率估算（越低越好）
  const povertyRate = Math.max(0.1, 15 - save.residentIncome * 0.12 - save.cityLivelihood * 0.05).toFixed(1);

  // 就业率
  const employRate = Math.min(99, Math.round(88 + save.cityBusiness * 0.06 + save.cityGdp * 0.04));

  // 人均GDP（万元）估算
  const gdpPerCapita = (() => {
    const base = rl >= 10 ? 12 : rl >= 7 ? 7 : rl >= 4 ? 4 : 2;
    return (base * (0.6 + save.cityGdp / 100 * 0.9)).toFixed(1);
  })();

  // 刑事案件万人发案率（越低越好）
  const crimeRate = Math.max(0.5, 8 - save.securityIndex * 0.06).toFixed(1);

  const securityLevel =
    save.securityIndex >= 75 ? { label: '优良', color: '#2a7a3b' } :
    save.securityIndex >= 50 ? { label: '一般', color: '#b35900' } :
    { label: '较差', color: '#C82829' };

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      {/* 顶栏 */}
      <View style={{ backgroundColor: '#2B4B6F', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>民生与社会事业</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>民生详情</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10 }}>{save.rankName}</Text>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600', marginTop: 1 }}>{save.cityName}</Text>
        </View>
      </View>

      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 14, gap: 12 }}>

        {/* ── 综合概览横幅 ── */}
        <View style={{ backgroundColor: '#2B4B6F', padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            {/* 人口区 */}
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#a0b4cc', fontSize: 9, letterSpacing: 2, marginBottom: 2 }}>
                {isNational ? '全国常住人口' : '辖区常住人口'}
              </Text>
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                {formatPop(population)}
              </Text>
              <Text style={{ color: popTrendColor, fontSize: 11, marginTop: 3 }}>
                {popTrend} · 自然增长率 {naturalGrowth}‰
              </Text>
            </View>
            {/* 民心分 */}
            <View style={{ alignItems: 'center', borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.18)', paddingLeft: 16 }}>
              <Text style={{ color: '#a0b4cc', fontSize: 9, letterSpacing: 1, marginBottom: 4 }}>民心综合评分</Text>
              <Text style={{ color: '#fff', fontSize: 32, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{compositeScore}</Text>
              <View style={{ backgroundColor: scoreLevel.bg, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 }}>
                <Text style={{ fontSize: 10, color: scoreLevel.color, fontWeight: '700' }}>{scoreLevel.label}</Text>
              </View>
            </View>
          </View>

          {/* 城镇/农村人口分布 */}
          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#a0b4cc', fontSize: 10 }}>城镇化率</Text>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>{urbanRate}%</Text>
            </View>
            <View style={{ flexDirection: 'row', height: 6, gap: 1 }}>
              <View style={{ flex: urbanRate, backgroundColor: '#4FC3F7', borderRadius: 1 }} />
              <View style={{ flex: 100 - urbanRate, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 1 }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#a0b4cc', fontSize: 9 }}>城镇 {formatPop(Math.round(population * urbanRate / 100))}</Text>
              <Text style={{ color: '#a0b4cc', fontSize: 9 }}>农村 {formatPop(Math.round(population * (100 - urbanRate) / 100))}</Text>
            </View>
          </View>
        </View>

        {/* ── 四维指标（进度条） ── */}
        <Section title="民生核心四维指标" icon="📊">
          {([
            { label: '居民收入水平', value: save.residentIncome, color: '#2B4B6F', sub: `月均可支配 ${(monthlyIncome / 1000).toFixed(1)}k元` },
            { label: '医疗卫生保障', value: save.healthcareRate, color: '#C82829', sub: `基本医保覆盖率 ${medCoverage}%` },
            { label: '教育文化水平', value: save.eduLevel,       color: '#2a7a3b', sub: `义务教育巩固率 ${eduRetention}%` },
            { label: '住房保障程度', value: save.housingRate,    color: '#7a5c2a', sub: `保障房覆盖率 ${housingSec}%` },
          ] as const).map(ind => (
            <View key={ind.label} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                <Text style={{ fontSize: 12, color: '#333' }}>{ind.label}</Text>
                <Text style={{ fontSize: 12, color: ind.color, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                  {ind.value}<Text style={{ fontSize: 9, fontWeight: '400' }}>/100</Text>
                </Text>
              </View>
              <ProgressBar value={ind.value} color={ind.color} height={6} />
              <Text style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>{ind.sub}</Text>
            </View>
          ))}
          {/* 权重说明 */}
          <View style={{ backgroundColor: '#F8F7F5', padding: 10, marginTop: 4, borderWidth: 1, borderColor: '#E8E6E2' }}>
            <Text style={{ fontSize: 10, color: '#888', lineHeight: 16 }}>
              民心综合分权重：居民收入 30% · 医疗卫生 28% · 教育水平 22% · 住房保障 20%
            </Text>
          </View>
        </Section>

        {/* ── 居民收入与就业 ── */}
        <Section title="居民收入与就业" icon="💼">
          <StatRow label="城镇居民月均可支配收入" value={`${(monthlyIncome / 1000).toFixed(1)}k 元/月`} sub="（模拟估算值）" color="#2B4B6F" />
          <StatRow label="城镇居民年均可支配收入" value={`${(annualIncome / 10000).toFixed(2)}万元/年`} color="#2B4B6F" />
          <StatRow label="农村居民月均可支配收入" value={`${(monthlyIncome * 0.48 / 1000).toFixed(1)}k 元/月`} />
          <StatRow label="人均GDP（估算）" value={`${gdpPerCapita}万元`} sub={`全国均对应约${rl >= 10 ? '12' : rl >= 7 ? '7' : rl >= 4 ? '4' : '2'}万元`} />
          <StatRow label="城镇就业率" value={`${employRate}%`} color={employRate >= 95 ? '#2a7a3b' : employRate >= 90 ? '#b35900' : '#C82829'} />
          <StatRow label="社会消费品零售总额增速" value={`+${retailGrowth}%`} sub="同比" color="#2a7a3b" />
          <StatRow label="贫困率（估算）" value={`${povertyRate}%`} color={parseFloat(povertyRate) < 2 ? '#2a7a3b' : parseFloat(povertyRate) < 5 ? '#b35900' : '#C82829'} />
          <View style={{ backgroundColor: '#F8F7F5', padding: 8, marginTop: 6, borderWidth: 1, borderColor: '#E8E6E2' }}>
            <Text style={{ fontSize: 10, color: '#888', lineHeight: 16 }}>
              💡 影响来源：招商局·企业入驻 → 就业岗位↑；秘书室·经济类公文 → 居民收入+；城市建设·产业项目 → 收入/GDP+
            </Text>
          </View>
        </Section>

        {/* ── 医疗卫生 ── */}
        <Section title="医疗卫生与健康" icon="🏥">
          <StatRow label="基本医疗保险覆盖率" value={`${medCoverage}%`} color={medCoverage >= 90 ? '#2a7a3b' : medCoverage >= 70 ? '#b35900' : '#C82829'} />
          <StatRow label="每万人病床数" value={`${bedsPerWan} 张/万人`} sub={`全国平均约68张（2023）`} />
          <StatRow label="卫生机构数估算" value={`约${Math.round(population / 10000 * (bedsPerWan / 15))}所`} sub="（含诊所、卫生室）" />
          <StatRow label="人均预期寿命" value={`${Math.min(80, 68 + Math.round(save.healthcareRate * 0.12))}岁`} sub="（全国均约78.6岁）" />
          <StatRow label="婴儿死亡率" value={`${Math.max(2, 12 - Math.round(save.healthcareRate * 0.09))}‰`} sub="（全国约4.9‰）" />
          <StatRow label="城镇职工医保参保率" value={`${Math.min(98, 55 + Math.round(save.healthcareRate * 0.43))}%`} />
          <View style={{ backgroundColor: '#F8F7F5', padding: 8, marginTop: 6, borderWidth: 1, borderColor: '#E8E6E2' }}>
            <Text style={{ fontSize: 10, color: '#888', lineHeight: 16 }}>
              💡 影响来源：职能部门·卫健委 → 医疗覆盖+；城市建设·医疗设施 → 床位数+；秘书室·民生类公文 → 医疗保障+
            </Text>
          </View>
        </Section>

        {/* ── 教育文化 ── */}
        <Section title="教育文化与人才" icon="📚">
          <StatRow label="义务教育九年巩固率" value={`${eduRetention}%`} color={eduRetention >= 95 ? '#2a7a3b' : '#b35900'} sub="（全国约95.7%）" />
          <StatRow label="高中阶段毛入学率" value={`${Math.min(97, Math.round(55 + save.eduLevel * 0.40))}%`} sub="（全国约91.6%）" />
          <StatRow label="高等教育毛入学率" value={`${Math.min(75, Math.round(20 + save.eduLevel * 0.50))}%`} sub="（全国约60.2%）" />
          <StatRow label="万人拥有学校数" value={`${schoolsPerWan} 所/万人`} />
          <StatRow label="在校学生人数估算" value={`约${formatPop(Math.round(population * 0.17 * (0.6 + save.eduLevel / 100 * 0.8)))}`} sub="含中小学" />
          <StatRow label="劳动力受教育年限" value={`${(9 + save.eduLevel * 0.06).toFixed(1)}年`} sub="（全国均约11年）" />
          <StatRow label="公共文化机构数" value={`约${Math.round(1 + save.eduLevel * 0.05 * (rl >= 10 ? 20 : rl >= 7 ? 5 : 1))}`} sub="图书馆/文化馆/博物馆" />
          <View style={{ backgroundColor: '#F8F7F5', padding: 8, marginTop: 6, borderWidth: 1, borderColor: '#E8E6E2' }}>
            <Text style={{ fontSize: 10, color: '#888', lineHeight: 16 }}>
              💡 影响来源：职能部门·教育局 → 教育水平+；秘书室·教育类公文 → 入学率+；城市建设·教育设施 → 教育+
            </Text>
          </View>
        </Section>

        {/* ── 住房保障 ── */}
        <Section title="住房与社会保障" icon="🏘️">
          <StatRow label="保障性住房覆盖率" value={`${housingSec}%`} color={housingSec >= 25 ? '#2a7a3b' : housingSec >= 15 ? '#b35900' : '#C82829'} />
          <StatRow label="城镇居民人均住房面积" value={`${(25 + save.housingRate * 0.25).toFixed(0)} ㎡`} sub="（全国约39.8㎡）" />
          <StatRow label="城镇家庭自有住房率" value={`${Math.min(90, 60 + Math.round(save.housingRate * 0.28))}%`} />
          <StatRow label="公租房/廉租房套数" value={`约${formatPop(Math.round(population * housingSec / 100 * 0.25))}套`} />
          <StatRow label="城镇低保覆盖率" value={`${(2.5 - save.residentIncome * 0.015).toFixed(1)}%`} sub="（全国约2.5%）" />
          <StatRow label="养老保险参保率" value={`${Math.min(97, 50 + Math.round(save.housingRate * 0.47))}%`} />
          <StatRow label="失业保险参保人数" value={`约${formatPop(Math.round(population * 0.35 * (0.3 + save.housingRate / 100 * 0.5)))}`} />
          <View style={{ backgroundColor: '#F8F7F5', padding: 8, marginTop: 6, borderWidth: 1, borderColor: '#E8E6E2' }}>
            <Text style={{ fontSize: 10, color: '#888', lineHeight: 16 }}>
              💡 影响来源：城市建设·保障房项目 → 住房保障+；秘书室·申请保障性住房补贴 → +；职能部门·民政局 → 社保覆盖+
            </Text>
          </View>
        </Section>

        {/* ── 社会治安 ── */}
        <Section title="社会治安与稳定" icon="🚔">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F0EEEA' }}>
            <Text style={{ fontSize: 12, color: '#555' }}>社会治安综合指数</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ProgressBar value={save.securityIndex} color={securityLevel.color} height={5} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: securityLevel.color, minWidth: 48 }}>
                {save.securityIndex} <Text style={{ fontSize: 10 }}>({securityLevel.label})</Text>
              </Text>
            </View>
          </View>
          <StatRow label="刑事案件万人发案率" value={`${crimeRate} 件/万人`} color={parseFloat(crimeRate) < 3 ? '#2a7a3b' : parseFloat(crimeRate) < 6 ? '#b35900' : '#C82829'} sub="（全国约5件/万人）" />
          <StatRow label="群众安全感满意率" value={`${Math.min(99, 60 + Math.round(save.securityIndex * 0.38))}%`} sub="（全国约98.3%）" />
          <StatRow label="信访投诉处理率" value={`${Math.min(99, 55 + Math.round(save.securityIndex * 0.40))}%`} />
          <StatRow label="安全生产事故发生率" value={`${Math.max(0.1, (5 - save.securityIndex * 0.04)).toFixed(1)}‰`} />
          <View style={{ backgroundColor: '#F8F7F5', padding: 8, marginTop: 6, borderWidth: 1, borderColor: '#E8E6E2' }}>
            <Text style={{ fontSize: 10, color: '#888', lineHeight: 16 }}>
              💡 影响来源：公安局·专项整治/破案 → 治安+；秘书室·社会治理类公文 → 治安+；纪检委·反腐行动 → 间接提升
            </Text>
          </View>
        </Section>

        {/* ── 民生与城市发展关联 ── */}
        <Section title="民生与城市发展关联" icon="🔗">
          <View style={{ gap: 8 }}>
            {[
              { a: '居民收入↑', b: 'GDP增速加快，消费市场扩大', icon: '→' },
              { a: '教育水平↑', b: '营商环境改善，高素质劳动力增加', icon: '→' },
              { a: '医疗覆盖↑', b: '劳动力健康水平提升，人口净增长', icon: '→' },
              { a: '住房保障↑', b: '外来人口净流入，城镇化率提升', icon: '→' },
              { a: '民生指数↑', b: '晋升考核加分，政绩积累加速', icon: '→' },
              { a: '社会治安↑', b: '营商环境改善，招商引资更顺利', icon: '→' },
            ].map(row => (
              <View key={row.a} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '700', minWidth: 90 }}>{row.a}</Text>
                <Text style={{ fontSize: 11, color: '#aaa' }}>{row.icon}</Text>
                <Text style={{ fontSize: 11, color: '#555', flex: 1, lineHeight: 16 }}>{row.b}</Text>
              </View>
            ))}
          </View>
        </Section>

        {/* ── 提升民生的途径说明 ── */}
        <Section title="提升民生的主要途径" icon="💡">
          <Text style={{ fontSize: 10, color: '#aaa', marginBottom: 10, lineHeight: 16 }}>
            民生指标由以下系统操作动态驱动，无需单独操作民生页面
          </Text>
          {IMPACT_SOURCES.map(src => (
            <View key={src.title} style={{ flexDirection: 'row', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F0EEEA' }}>
              <Text style={{ fontSize: 14 }}>{src.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: '#333', fontWeight: '600', marginBottom: 1 }}>{src.title}</Text>
                <Text style={{ fontSize: 10, color: '#888', lineHeight: 15 }}>{src.desc}</Text>
              </View>
            </View>
          ))}
        </Section>

        {/* ── 人口结构说明 ── */}
        <Section title="人口结构与流动" icon="👥">
          <StatRow label="人口自然增长率" value={`${naturalGrowth}‰`} color={naturalGrowth > 0 ? '#2a7a3b' : '#C82829'} sub="（全国2023年约-1.5‰）" />
          <StatRow label="城镇化率" value={`${urbanRate}%`} sub={`全国均约66.2%（2023）`} />
          <StatRow label="老龄化率（65岁+）" value={`${Math.min(28, Math.max(8, 14 - naturalGrowth * 0.5 + (100 - save.residentIncome) * 0.04)).toFixed(1)}%`} sub="（全国约15.4%）" />
          <StatRow label="外出务工人口比例" value={`${Math.max(5, 25 - Math.round(save.cityGdp * 0.15))}%`} sub="（与本地就业机会负相关）" />
          <StatRow label="外来常住人口比例" value={`${Math.max(2, Math.round(save.cityBusiness * 0.10 + save.residentIncome * 0.05))}%`} />
          <View style={{ backgroundColor: '#F0F4FA', padding: 8, marginTop: 6, borderWidth: 1, borderColor: '#D0DAE8' }}>
            <Text style={{ fontSize: 10, color: '#2B4B6F', lineHeight: 16 }}>
              📌 人口数据基于2020年全国人口普查数据换算，根据民生指数动态浮动±15%
            </Text>
          </View>
        </Section>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}
```

<a id="srcappappmeetingtsx"></a>
## `src/app/(app)/meeting.tsx`

```tsx
// 月度工作会议页面 — 按职级差异化会议名称/内容，全层级开放，强制月度召开
// 流程：学习传达 → 工作通报 → 议题审议 → 任务分派 → 形成纪要
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getSubordinates, getMeetingByMonth, createMeeting, getRecentMeetings, getLeadershipBand } from '@/db/gameApi';
import type { Subordinate, MonthlyMeeting, MeetingTask, KpiType, LeadershipMember } from '@/types/game';
import { KPI_LABELS, gameDaysToDate, DEPT_CONFIG } from '@/types/game';
import type { DeptKey } from '@/types/game';
import { getDeptNameByRank } from '@/types/game';

// ── 会议名称体系（参照现实各层级党政会议制度） ─────────────────────────
function getMeetingInfo(rankLevel: number): { title: string; subtitle: string; headerColor: string; convener: string } {
  if (rankLevel >= 14) return { title: '中枢决策常委会', subtitle: '中共中枢决策常委会会议', headerColor: '#1a0a3e', convener: '总执书记主持' };
  if (rankLevel >= 13) return { title: '中枢政治局会议', subtitle: '中共中枢政治局会议', headerColor: '#2C1A5E', convener: '政治局常委主持' };
  if (rankLevel >= 12) return { title: '国政院常务会议', subtitle: '国政院常务委员会会议', headerColor: '#2C1A5E', convener: '总理主持召开' };
  if (rankLevel >= 11) return { title: '省委常委会', subtitle: '中共省委常务委员会会议', headerColor: '#1D2D44', convener: '省委书记主持' };
  if (rankLevel >= 10) return { title: '省政府常务会', subtitle: '省人民政府常务委员会会议', headerColor: '#1D3B5E', convener: '省长主持召开' };
  if (rankLevel >= 9)  return { title: '市委常委会', subtitle: '中共市委常务委员会会议', headerColor: '#1D2D44', convener: '市委书记主持' };
  if (rankLevel >= 8)  return { title: '市政府常务会', subtitle: '市人民政府常务委员会会议', headerColor: '#1D3B5E', convener: '市长主持召开' };
  if (rankLevel >= 7)  return { title: '市委扩大会议', subtitle: '市委常委会扩大会议', headerColor: '#2B4B6F', convener: '主要领导主持' };
  if (rankLevel >= 6)  return { title: '县委常委会', subtitle: '中共县委常务委员会会议', headerColor: '#1D2D44', convener: '县委书记主持' };
  if (rankLevel >= 5)  return { title: '县政府常务会', subtitle: '县人民政府常务委员会会议', headerColor: '#1D3B5E', convener: '县长主持召开' };
  if (rankLevel >= 4)  return { title: '县委扩大会议', subtitle: '县委常委会扩大会议', headerColor: '#2B4B6F', convener: '主要领导主持' };
  if (rankLevel >= 3)  return { title: '镇政府办公会', subtitle: '乡镇人民政府办公会议', headerColor: '#2B4B6F', convener: '镇长主持召开' };
  if (rankLevel >= 2)  return { title: '党政联席会', subtitle: '乡镇党政联席会议', headerColor: '#2B4B6F', convener: '党委书记主持' };
  return { title: '支部会议', subtitle: '党支部工作会议', headerColor: '#555', convener: '支部书记主持' };
}

// ── 学习传达内容库（按层级不同） ────────────────────────────────────
function getStudyItems(rankLevel: number): { title: string; content: string }[] {
  if (rankLevel >= 12) return [
    { title: '学习习近平总执书记重要讲话精神', content: '传达总执书记最新重要讲话和批示精神，深刻领会核心要义，切实抓好贯彻落实。' },
    { title: '传达中央全会重要决议', content: '传达中央全会精神，结合本单位实际研究贯彻落实措施。' },
    { title: '学习国政院最新政策部署', content: '学习贯彻国政院最新政策措施，确保政令畅通，推动各项决策部署落地见效。' },
  ];
  if (rankLevel >= 9) return [
    { title: '传达中央省委重要指示精神', content: '传达中央和省委最新指示要求，研究部署贯彻落实工作，确保政令畅通到底。' },
    { title: '学习党中央重要决定', content: '组织学习党中央关于全面从严治党、经济工作等重要决定，深入领会精神实质。' },
    { title: '传达省委重要工作部署', content: '传达省委书记最新讲话精神和重要批示，对照检视本地工作差距，明确整改措施。' },
  ];
  if (rankLevel >= 6) return [
    { title: '传达上级重要文件精神', content: '认真学习传达上级党委政府最新文件要求，研究具体贯彻落实措施。' },
    { title: '学习廉洁自律相关规定', content: '组织学习《党纪处分条例》和廉洁从政相关规定，强化党员领导干部廉洁意识。' },
    { title: '传达市委市政府工作要求', content: '传达市委市政府月度工作重点部署，结合本地实际制定落实方案。' },
  ];
  return [
    { title: '传达上级党委重要精神', content: '传达县委县政府最新工作要求，部署安排近期重点工作任务。' },
    { title: '学习基层党建相关文件', content: '组织全体党员学习最新党建文件，强化基层党组织建设。' },
    { title: '学习农村基层治理政策', content: '学习农村基层治理相关政策，提升基层干部治理能力和为民服务水平。' },
  ];
}

// ── 工作通报内容（按层级生成） ─────────────────────────────────────
function getWorkReports(rankLevel: number, cityName: string): { dept: string; content: string; rating: '优' | '良' | '一般' | '差' }[] {
  const rand4 = (): '优' | '良' | '一般' | '差' => {
    const r = Math.random();
    return r < 0.2 ? '优' : r < 0.5 ? '良' : r < 0.8 ? '一般' : '差';
  };
  if (rankLevel >= 12) return [
    { dept: '国家发改委', content: `本月全国GDP增速完成情况：预计${(4.8 + Math.random()).toFixed(1)}%，整体运行平稳`, rating: rand4() },
    { dept: '财政部', content: `本月财政收入同比${Math.random() > 0.5 ? '增长' : '下降'}${(Math.random() * 5).toFixed(1)}%，财政形势总体稳定`, rating: rand4() },
    { dept: '公安部', content: `全国治安形势总体稳定，重大案件同比下降${(Math.random() * 15).toFixed(0)}%`, rating: rand4() },
    { dept: '生态环境部', content: `重点区域空气质量同比改善，PM2.5浓度继续下降`, rating: rand4() },
  ];
  if (rankLevel >= 9) return [
    { dept: '发展改革委', content: `${cityName}本月GDP增速预估${(4 + Math.random() * 3).toFixed(1)}%，重大项目推进顺利`, rating: rand4() },
    { dept: '财政局', content: `本月税收完成计划的${(85 + Math.random() * 20).toFixed(0)}%，财政运行总体平稳`, rating: rand4() },
    { dept: '公安局', content: `社会治安形势稳定，刑事案件发案率同比下降${(Math.random() * 12).toFixed(0)}%`, rating: rand4() },
    { dept: '住建局', content: `重点工程项目推进进度${(60 + Math.random() * 35).toFixed(0)}%，工程质量总体受控`, rating: rand4() },
  ];
  return [
    { dept: '经发部门', content: `${cityName}本月经济运行总体平稳，规上企业产值完成月度计划的${(80 + Math.random() * 25).toFixed(0)}%`, rating: rand4() },
    { dept: '民政部门', content: `民生保障工作稳步推进，困难群众帮扶救助及时到位`, rating: rand4() },
    { dept: '维稳部门', content: `社会治安总体稳定，信访工作有序推进，存量案件持续化解`, rating: rand4() },
    { dept: '生态环保', content: `生态环境整治持续推进，违规排放问题得到有效管控`, rating: rand4() },
  ];
}

const KPI_OPTIONS: { type: KpiType; target: number; label: string }[] = [
  { type: 'gdp',        target: 5,  label: 'GDP +5' },
  { type: 'livelihood', target: 5,  label: '民生 +5' },
  { type: 'ecology',    target: 5,  label: '生态 +5' },
  { type: 'business',   target: 5,  label: '营商 +5' },
];
const NATIONAL_KPI_OPTIONS: { type: KpiType; target: number; label: string }[] = [
  { type: 'gdp',        target: 8,  label: '经济发展 +8' },
  { type: 'livelihood', target: 8,  label: '民生改善 +8' },
  { type: 'ecology',    target: 8,  label: '生态治理 +8' },
  { type: 'business',   target: 8,  label: '营商优化 +8' },
];

// ── 临时议题资料库（按层级分组） ───────────────────────────────────────
type AgendaVote = 'yes' | 'no' | null;
interface TempAgenda {
  id: string; dept: DeptKey; issue: string; detail: string;
  vote: AgendaVote; yesCount: number; noCount: number; passed: boolean | null;
}

// 乡镇议题池
const TOWN_AGENDA_POOL: { dept: DeptKey; issue: string; detail: string }[] = [
  { dept: 'agriculture', issue: '关于推进高标准农田建设的议案', detail: '结合农业补贴政策，推动辖区高标准农田整治改造，提升粮食生产能力，惠及种植农户约200户。' },
  { dept: 'ecology',     issue: '关于开展农村生活污水治理的议案', detail: '针对辖区部分村庄生活污水直排现象，建设小型污水处理设施，改善农村人居环境。' },
  { dept: 'petition',    issue: '关于化解历史土地纠纷积案的议案', detail: '辖区存在3件多年未解决的土地权属纠纷，建议成立专项调解小组，依法依规推进化解。' },
  { dept: 'education',   issue: '关于改善村小学基础设施的议案', detail: '辖区某村小学校舍老旧，建议申请专项资金完成修缮改造，改善学生学习环境。' },
  { dept: 'health',      issue: '关于加强村级卫生室建设的议案', detail: '部分村卫生室药品短缺、设备陈旧，建议申请配备资金，提升基层医疗服务能力。' },
  { dept: 'market',      issue: '关于整治农贸市场环境卫生的议案', detail: '辖区农贸市场存在占道经营、卫生条件差等问题，建议开展专项整治，提升市场管理水平。' },
];

// 县级议题池
const COUNTY_AGENDA_POOL: { dept: DeptKey; issue: string; detail: string }[] = [
  { dept: 'police',      issue: '关于加强城区夜间巡逻力度的议案', detail: '近期辖区夜间治安事件有所上升，公安部门提请增派警力，延长巡逻时段至凌晨2时。' },
  { dept: 'ndrc',        issue: '关于引进新能源产业园项目的议案', detail: '发改部门汇报，有企业意向在本辖区投资建设新能源产业园，预计带动就业500人，请审议立项。' },
  { dept: 'finance',     issue: '关于追加民生补贴预算的紧急议案', detail: '财政部门反映部分低收入群体生活困难，建议本月追加专项补贴资金200万元。' },
  { dept: 'urban',       issue: '关于老旧小区改造工程立项的议案', detail: '住建部门申请对辖区三个老旧小区进行外立面及管网改造，改善居民居住条件。' },
  { dept: 'education',   issue: '关于新建小学招生扩容的议案', detail: '教育部门称现有小学学位紧张，建议新建一所小学或扩建现有学校，以满足适龄儿童入学需求。' },
  { dept: 'ecology',     issue: '关于河道污染整治专项行动的议案', detail: '生态环保部门汇报，辖区主要河道水质下降，建议启动为期三个月的专项整治行动。' },
  { dept: 'personnel',   issue: '关于开展干部能力素质培训的议案', detail: '人事部门申请组织科级干部赴省委党校开展为期一周的能力素质提升专题培训班。' },
  { dept: 'petition',    issue: '关于化解历史遗留信访积案的议案', detail: '信访局汇报辖区存在5件三年以上积案，建议成立专项工作组，争取本季度内实现化解清零。' },
];

// 市级议题池
const CITY_AGENDA_POOL: { dept: DeptKey; issue: string; detail: string }[] = [
  { dept: 'ndrc',        issue: '关于全市重大项目年度投资计划调整的议案', detail: '受政策环境变化影响，部分重大项目需调整投资计划，发改委提请审议优化方案，确保年度目标完成。' },
  { dept: 'finance',     issue: '关于市级专项资金统筹安排方案的议案', detail: '市财政局提出本年度专项资金统筹安排方案，重点保障基础设施、民生工程、生态环保等领域投入。' },
  { dept: 'urban',       issue: '关于城市轨道交通规划研究方案的议案', detail: '住建部门汇报城市轨道交通规划研究成果，建议启动规划编制工作，为未来发展预留空间。' },
  { dept: 'market',      issue: '关于优化营商环境创新举措方案的议案', detail: '市场监管局提出营商环境优化创新举措，包括审批提速、减证便民、惠企政策落地等系列改革。' },
  { dept: 'invest',      issue: '关于本月重点招商引资项目审议', detail: '市投促局汇报3个意向落地项目情况，总投资约30亿元，提请常委会审议明确扶持政策和工作机制。' },
  { dept: 'ecology',     issue: '关于"无废城市"建设工作方案的议案', detail: '生态环境局提请审议"无废城市"建设三年行动计划，统筹推进固废减量化、资源化、无害化。' },
  { dept: 'organization','issue': '关于后备干部队伍建设规划方案的议案', detail: '组织部汇报后备干部队伍结构分析，建议调整充实后备人选，优化年龄学历结构，加强培养锻炼。' },
  { dept: 'health',      issue: '关于全市医疗资源优化布局方案的议案', detail: '市卫健委提出医疗资源优化布局方案，重点补强基层医疗短板，探索县域医共体建设新模式。' },
];

// 省级议题池
const PROVINCE_AGENDA_POOL: { dept: DeptKey; issue: string; detail: string }[] = [
  { dept: 'ndrc',        issue: '关于全省高质量发展综合绩效考核方案的议案', detail: '省发改委提请审议新一轮高质量发展综合绩效考核指标体系，强化对各市州经济发展质量的考核导向。' },
  { dept: 'finance',     issue: '关于省级财政转移支付制度改革方案的议案', detail: '省财政厅提出转移支付制度改革方案，优化一般性转移支付和专项转移支付结构，提高资金使用效益。' },
  { dept: 'ecology',     issue: '关于深化生态补偿制度改革的议案', detail: '生态环境厅提请审议流域横向生态补偿扩面工作方案，推动更多重要流域建立上下游横向补偿机制。' },
  { dept: 'organization','issue': '关于县(市区)党政领导班子动态考察方案', detail: '组织部汇报拟开展年度县(市区)党政领导班子动态考察工作，请审议考察方案和时间安排。' },
  { dept: 'invest',      issue: '关于省重大引资项目特殊政策审议', detail: '省投促局汇报一批重点招商引资项目谈判进展，涉及多项特殊支持政策，提请常委会研究确定。' },
  { dept: 'education',   issue: '关于省属高等院校学科布局调整方案', detail: '省教育厅提出省属高校学科专业调整优化方案，重点增强理工农医类专业供给，提升服务经济发展能力。' },
  { dept: 'market',      issue: '关于全省市场准入负面清单动态管理办法', detail: '省市场监管局提请审议市场准入负面清单动态管理实施细则，进一步优化营商环境，激发市场活力。' },
  { dept: 'police',      issue: '关于跨市重大刑事案件协同侦办机制的议案', detail: '省公安厅提请建立跨市重大刑事案件协同侦办机制，解决跨区域案件协调难、移送慢等突出问题。' },
];

// 国家级议题池
const NATIONAL_AGENDA_POOL: { dept: DeptKey; issue: string; detail: string }[] = [
  { dept: 'ndrc',        issue: '关于全国年度GDP目标执行情况的专项报告', detail: '国家发改委汇报本年度GDP增速完成情况及下半年调控重点，提请审议确定宏观调控措施。' },
  { dept: 'finance',     issue: '关于国家财政赤字率调整方案的议案', detail: '财政部提出适度扩大赤字率，支持基础设施建设和民生保障，预计释放财政资金万亿量级，请审议。' },
  { dept: 'ecology',     issue: '关于碳达峰碳中和路线图优化调整的报告', detail: '生态环境部就"双碳"时间表进行阶段性评估，建议调整重点行业节奏，报请审定。' },
  { dept: 'health',      issue: '关于深化医药卫生体制改革综合方案', detail: '国家卫健委提出新一轮医改方案，重点优化分级诊疗和医保支付制度，预计惠及全国群众10亿人次。' },
  { dept: 'police',      issue: '关于打击跨境电信网络诈骗专项行动方案', detail: '公安部汇报跨境电信诈骗高发态势，申请启动跨部门联合打击专项行动，重点攻克境外诈骗窝点。' },
  { dept: 'organization','issue': '关于深化改革重点任务年度推进方案', detail: '中央改革办汇报改革推进情况，提请审议下年度重点改革任务清单和责任分工安排。' },
  { dept: 'agriculture', issue: '关于粮食安全战略性储备能力提升方案', detail: '农业农村部汇报全国粮食储备现状，建议启动新一轮粮食安全保障工程，确保口粮绝对安全。' },
  { dept: 'invest',      issue: '关于进一步扩大高水平对外开放综合方案', detail: '商务部提请审议扩大外资准入、优化营商环境的系列措施，重点深化自贸区先行先试改革。' },
];

function getAgendaPool(rankLevel: number) {
  if (rankLevel >= 12) return NATIONAL_AGENDA_POOL;
  if (rankLevel >= 9)  return PROVINCE_AGENDA_POOL;
  if (rankLevel >= 6)  return CITY_AGENDA_POOL;
  if (rankLevel >= 3)  return COUNTY_AGENDA_POOL;
  return TOWN_AGENDA_POOL;
}

// ── 国家级参会人员 ──────────────────────────────────────────────────
interface NationalAttendee {
  id: string; name: string; title: string; dept: string; isCore: boolean; kpiDomain: KpiType;
}
function generateNationalAttendees(rankLevel: number): NationalAttendee[] {
  if (rankLevel === 12) return [
    { id: 'n1', name: '李副院理', title: '国政院第一副院理', dept: '国政院', isCore: true, kpiDomain: 'gdp' },
    { id: 'n2', name: '王副院理', title: '主管经济的副院理', dept: '国政院', isCore: true, kpiDomain: 'business' },
    { id: 'n3', name: '张副院理', title: '主管民生的副院理', dept: '国政院', isCore: true, kpiDomain: 'livelihood' },
    { id: 'n4', name: '刘副院理', title: '主管生态的副院理', dept: '国政院', isCore: true, kpiDomain: 'ecology' },
    { id: 'n5', name: '陈国政委员', title: '国政委员（经济）', dept: '国政院', isCore: false, kpiDomain: 'gdp' },
    { id: 'n6', name: '赵国政委员', title: '国政委员（外交）', dept: '国政院', isCore: false, kpiDomain: 'business' },
    { id: 'n7', name: '孙秘书长', title: '国政院秘书长', dept: '国政院办公厅', isCore: false, kpiDomain: 'livelihood' },
  ];
  if (rankLevel === 13) return [
    { id: 'n1', name: '王常委', title: '政治局常委（议政院议政委员长）', dept: '全国议政院', isCore: true, kpiDomain: 'gdp' },
    { id: 'n2', name: '张常委', title: '政治局常委（国政院院理）', dept: '国政院', isCore: true, kpiDomain: 'business' },
    { id: 'n3', name: '刘常委', title: '政治局常委（参政主席）', dept: '全国参政院', isCore: true, kpiDomain: 'livelihood' },
    { id: 'n4', name: '李常委', title: '政治局常委（中枢纪委书记）', dept: '中枢纪委', isCore: false, kpiDomain: 'ecology' },
    { id: 'n5', name: '陈部长', title: '中枢组织部部长', dept: '中枢组织部', isCore: false, kpiDomain: 'gdp' },
  ];
  return [
    { id: 'n1', name: '李常委', title: '政治局常委（国政院院理）', dept: '国政院', isCore: true, kpiDomain: 'gdp' },
    { id: 'n2', name: '王常委', title: '政治局常委（议政院议政委员长）', dept: '全国议政院', isCore: true, kpiDomain: 'livelihood' },
    { id: 'n3', name: '张常委', title: '政治局常委（参政主席）', dept: '全国参政院', isCore: true, kpiDomain: 'business' },
    { id: 'n4', name: '刘常委', title: '政治局常委（中枢纪委书记）', dept: '中枢纪委', isCore: true, kpiDomain: 'ecology' },
    { id: 'n5', name: '陈常委', title: '政治局常委（中枢宣部长）', dept: '中枢宣部', isCore: true, kpiDomain: 'gdp' },
  ];
}

function generateTempAgendas(rankLevel: number, attendeeCount: number): TempAgenda[] {
  const pool = getAgendaPool(rankLevel);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const count = Math.floor(Math.random() * 3) + 2;
  return shuffled.slice(0, count).map((item, i) => {
    const yesBase = Math.max(1, Math.floor(attendeeCount * 0.5));
    const yesCount = yesBase + Math.floor(Math.random() * Math.floor(attendeeCount * 0.3));
    const noCount = Math.max(0, attendeeCount - yesCount - 1);
    return { id: `agenda_${i}_${Date.now()}`, dept: item.dept, issue: item.issue, detail: item.detail, vote: null, yesCount, noCount, passed: null };
  });
}

const KPI_CYCLE: KpiType[] = ['gdp', 'livelihood', 'ecology', 'business'];
const STATUS_COLOR: Record<string, string> = { pending: '#888', done: '#2a7a3b', failed: '#C82829' };
const STATUS_LABEL: Record<string, string> = { pending: '进行中', done: '已完成', failed: '未达标' };
const RATING_COLOR: Record<string, string> = { '优': '#2a7a3b', '良': '#1D3B5E', '一般': '#888', '差': '#C82829' };

function ProgressBar({ value, total, color = '#2a7a3b' }: { value: number; total: number; color?: string }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ flex: 1, height: 5, backgroundColor: '#E0E0E0' }}>
        <View style={{ height: 5, width: `${pct}%`, backgroundColor: color }} />
      </View>
      <Text style={{ fontSize: 10, color, fontVariant: ['tabular-nums'], width: 34, textAlign: 'right' }}>{value}/{total}</Text>
    </View>
  );
}

function AttendeeRow({ sub, deptLabel, isLeader = false }: { sub: Subordinate; deptLabel: string; isLeader?: boolean }) {
  let posTag = '班子'; let tagColor = '#7B5E2A';
  if (sub.deptPosition === 'head')   { posTag = '正职'; tagColor = '#C82829'; }
  else if (sub.deptPosition === 'deputy') { posTag = '副职'; tagColor = '#1D2D44'; }
  else if (isLeader) { posTag = '班子'; tagColor = '#7B5E2A'; }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
      <View style={{ backgroundColor: tagColor, paddingHorizontal: 5, paddingVertical: 2 }}>
        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{posTag}</Text>
      </View>
      <Text style={{ fontSize: 12, color: '#222', fontWeight: '600', flex: 1 }}>{sub.name}</Text>
      <Text style={{ fontSize: 10, color: '#888' }}>{deptLabel}</Text>
    </View>
  );
}

type MeetingStep = 'study' | 'report' | 'agenda' | 'kpi' | 'summary';

export default function MeetingPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save } = useGame();
  const [subordinates, setSubordinates] = useState<Subordinate[]>([]);
  const [band, setBand] = useState<LeadershipMember[]>([]);
  const [currentMeeting, setCurrentMeeting] = useState<MonthlyMeeting | null>(null);
  const [recentMeetings, setRecentMeetings] = useState<MonthlyMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHolding, setIsHolding] = useState(false);
  const [meetingStep, setMeetingStep] = useState<MeetingStep>('study');
  const [studySelected, setStudySelected] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<Record<string, KpiType>>({});
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [showAttendees, setShowAttendees] = useState(false);
  const [tempAgendas, setTempAgendas] = useState<TempAgenda[]>([]);
  const [customIssue, setCustomIssue] = useState('');

  const monthKey = save ? String(Math.floor(save.gameDays / 30)) : '0';

  const load = useCallback(async () => {
    if (!save) return;
    setLoading(true);
    const [subs, meeting, recent, b] = await Promise.all([
      getSubordinates(save.id),
      getMeetingByMonth(save.id, monthKey),
      getRecentMeetings(save.id, 6),
      getLeadershipBand(save.id),
    ]);
    setSubordinates(subs);
    setCurrentMeeting(meeting);
    setRecentMeetings(recent.filter(m => m.monthKey !== monthKey));
    setBand(b);
    setLoading(false);
  }, [save, monthKey]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (!save) return null;

  const isNational = save.rankLevel >= 12;
  const meetingInfo = getMeetingInfo(save.rankLevel);
  const nationalAttendees = isNational ? generateNationalAttendees(save.rankLevel) : [];
  const activeKpiOptions = isNational ? NATIONAL_KPI_OPTIONS : KPI_OPTIONS;
  const studyItems = getStudyItems(save.rankLevel);
  const workReports = getWorkReports(save.rankLevel, save.cityName);

  const headDeputy = subordinates.filter(s => s.isAppointed && (s.deptPosition === 'head' || s.deptPosition === 'deputy'));
  const bandSubIds = new Set(band.map(m => m.subId));
  const bandSubs   = subordinates.filter(s => bandSubIds.has(s.id) && !headDeputy.find(h => h.id === s.id));
  const attendees  = isNational ? [] : [...headDeputy, ...bandSubs];
  const totalAttendeeCount = isNational ? nationalAttendees.length : attendees.length;

  // 历史完成率
  const totalHistTasks = recentMeetings.reduce((s, m) => s + m.tasks.length, 0);
  const doneHistTasks  = recentMeetings.reduce((s, m) => s + m.tasks.filter(t => t.status === 'done').length, 0);
  const histRate = totalHistTasks > 0 ? Math.round((doneHistTasks / totalHistTasks) * 100) : null;

  const handleHoldMeeting = () => {
    setIsHolding(true);
    setMeetingStep('study');
    setStudySelected(null);
    setAssignments({});
    setMsg('');
    setCustomIssue('');
    setTempAgendas(generateTempAgendas(save.rankLevel, totalAttendeeCount));
  };

  const handleVote = (id: string, vote: 'yes' | 'no') => {
    setTempAgendas(prev => prev.map(a => {
      if (a.id !== id) return a;
      const totalYes = vote === 'yes' ? a.yesCount + 1 : a.yesCount;
      const totalVotes = a.yesCount + a.noCount + 1;
      return { ...a, vote, passed: totalYes > totalVotes / 2 };
    }));
  };

  const handleAddCustomAgenda = () => {
    const issue = customIssue.trim();
    if (!issue) return;
    setTempAgendas(prev => [...prev, {
      id: `custom_${Date.now()}`, dept: 'organization', issue,
      detail: '（领导提出的临时议题，由与会人员讨论表决）',
      vote: null,
      yesCount: Math.max(1, Math.floor(totalAttendeeCount * 0.6)),
      noCount:  Math.max(0, Math.floor(totalAttendeeCount * 0.2)),
      passed: null,
    }]);
    setCustomIssue('');
  };

  const handleAutoAssign = () => {
    const auto: Record<string, KpiType> = {};
    if (isNational) {
      nationalAttendees.forEach((a, i) => { auto[a.id] = KPI_CYCLE[i % KPI_CYCLE.length]; });
    } else {
      attendees.forEach((s, i) => { auto[s.id] = KPI_CYCLE[i % KPI_CYCLE.length]; });
    }
    setAssignments(auto);
    setMsg(`✓ 已向全部 ${totalAttendeeCount} 名参会人员自动分派指标，可手动调整`);
  };

  const handleSubmit = async () => {
    if (!save) return;
    const keys = Object.keys(assignments);
    if (keys.length === 0) { setMsg('请至少为一名下属分派任务'); return; }
    setSubmitting(true);
    const targetVal = isNational ? 8 : 5;
    const tasks: MeetingTask[] = keys.map(subId => {
      const kpiType = assignments[subId];
      let personName = '未知';
      if (isNational) {
        personName = nationalAttendees.find(a => a.id === subId)?.name ?? subId;
      } else {
        personName = subordinates.find(s => s.id === subId)?.name ?? '未知';
      }
      return { subordinateId: subId, subordinateName: personName, kpiType, targetValue: targetVal, deadlineDay: save.gameDays + 30, status: 'pending', completedDay: null };
    });
    const result = await createMeeting(save.id, save.userId, monthKey, save.gameDays, tasks);
    setSubmitting(false);
    if (result) { setCurrentMeeting(result); setIsHolding(false); setMsg(''); }
    else { setMsg('发起失败，请重试'); }
  };

  // ── 步骤进度组件 ──
  const STEPS: { key: MeetingStep; label: string }[] = [
    { key: 'study',   label: '学习传达' },
    { key: 'report',  label: '工作通报' },
    { key: 'agenda',  label: '议题审议' },
    { key: 'kpi',     label: '任务分派' },
    { key: 'summary', label: '形成纪要' },
  ];
  const stepIdx = STEPS.findIndex(s => s.key === meetingStep);

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      {/* 顶栏 */}
      <View style={{ backgroundColor: meetingInfo.headerColor, paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 1 }}>{save?.rankName} · {save?.cityName}</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>{meetingInfo.title}</Text>
          <Text style={{ color: '#a0b4cc', fontSize: 10, marginTop: 1 }}>{meetingInfo.subtitle} · {meetingInfo.convener}</Text>
        </View>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ color: '#fff', fontSize: 10 }}>参会 {totalAttendeeCount}人</Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={meetingInfo.headerColor} />
        </View>
      ) : (
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 16, gap: 14 }}>

          {/* ── 强制月度召开警告横幅 ── */}
          {!currentMeeting && (
            <View style={{ backgroundColor: '#C82829', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 22 }}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>本月{meetingInfo.title}尚未召开</Text>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 }}>
                  依据党政会议制度，{meetingInfo.title}每月至少召开一次。未按时召开将影响工作推进，产生政绩扣减风险。
                </Text>
              </View>
            </View>
          )}

          {/* ── 参会人员名单 ── */}
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: isNational ? '#4a2c8a' : '#D1D1CF', padding: 14 }}>
            <Pressable onPress={() => setShowAttendees(v => !v)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: isNational ? '#4a2c8a' : '#888', letterSpacing: 2, fontWeight: isNational ? '700' : '400' }}>
                {isNational ? '与会领导' : '参会人员'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {isNational ? (
                  <>
                    <View style={{ backgroundColor: '#4a2c8a', paddingHorizontal: 6, paddingVertical: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 9 }}>常委 {nationalAttendees.filter(a => a.isCore).length}</Text>
                    </View>
                    <View style={{ backgroundColor: '#7B5E2A', paddingHorizontal: 6, paddingVertical: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 9 }}>委员 {nationalAttendees.filter(a => !a.isCore).length}</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={{ backgroundColor: '#C82829', paddingHorizontal: 6, paddingVertical: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 9 }}>正 {headDeputy.filter(s => s.deptPosition === 'head').length}</Text>
                    </View>
                    <View style={{ backgroundColor: '#1D2D44', paddingHorizontal: 6, paddingVertical: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 9 }}>副 {headDeputy.filter(s => s.deptPosition === 'deputy').length}</Text>
                    </View>
                    <View style={{ backgroundColor: '#7B5E2A', paddingHorizontal: 6, paddingVertical: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 9 }}>班 {bandSubs.length}</Text>
                    </View>
                  </>
                )}
                <Text style={{ color: '#888', fontSize: 14 }}>{showAttendees ? '▲' : '▼'}</Text>
              </View>
            </Pressable>
            {showAttendees && (
              <View style={{ marginTop: 10, gap: 4 }}>
                {isNational ? nationalAttendees.map(a => (
                  <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' }}>
                    <View style={{ backgroundColor: a.isCore ? '#4a2c8a' : '#7B5E2A', paddingHorizontal: 5, paddingVertical: 2 }}>
                      <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{a.isCore ? '常委' : '委员'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, color: '#222', fontWeight: '600' }}>{a.name}</Text>
                      <Text style={{ fontSize: 10, color: '#888' }}>{a.title} · {a.dept}</Text>
                    </View>
                  </View>
                )) : attendees.length === 0 ? (
                  <Text style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic' }}>暂无在岗领导班子成员</Text>
                ) : (
                  attendees.map(s => (
                    <AttendeeRow key={s.id} sub={s} deptLabel={s.appointedRole ?? s.appointedDept ?? ''} isLeader={bandSubIds.has(s.id)} />
                  ))
                )}
              </View>
            )}
          </View>

          {/* ── 本月状态 ── */}
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 6 }}>本月会议状态</Text>
            <Text style={{ fontSize: 12, color: '#555', marginBottom: 10 }}>
              {gameDaysToDate(save.gameDays)}　第 {monthKey} 月
            </Text>

            {currentMeeting ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <View style={{ backgroundColor: '#2a7a3b', paddingHorizontal: 10, paddingVertical: 3 }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✓ 已召开</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: '#888' }}>分派任务 {currentMeeting.tasks.length} 项</Text>
                  <View style={{ flex: 1 }}>
                    <ProgressBar
                      value={currentMeeting.tasks.filter(t => t.status === 'done').length}
                      total={currentMeeting.tasks.length}
                    />
                  </View>
                </View>
                {currentMeeting.tasks.map((t, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderColor: '#f0f0f0' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, color: '#222', fontWeight: '600' }}>{t.subordinateName}</Text>
                      <Text style={{ fontSize: 11, color: '#888' }}>
                        {KPI_LABELS[t.kpiType]} +{t.targetValue}点　截止{gameDaysToDate(t.deadlineDay)}
                      </Text>
                    </View>
                    <View style={{ borderWidth: 1, borderColor: STATUS_COLOR[t.status], paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 }}>
                      <Text style={{ fontSize: 11, color: STATUS_COLOR[t.status], fontWeight: '600' }}>{STATUS_LABEL[t.status]}</Text>
                    </View>
                  </View>
                ))}
              </>
            ) : isHolding ? (
              <View style={{ gap: 10 }}>
                {/* 步骤进度条 */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 0, marginBottom: 6 }}>
                  {STEPS.map((s, i) => (
                    <View key={s.key} style={{ flex: 1, alignItems: 'center' }}>
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: i <= stepIdx ? meetingInfo.headerColor : '#D1D1CF', alignItems: 'center', justifyContent: 'center', marginBottom: 3 }}>
                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{i + 1}</Text>
                      </View>
                      <Text style={{ fontSize: 8, color: i === stepIdx ? meetingInfo.headerColor : '#aaa', fontWeight: i === stepIdx ? '700' : '400', textAlign: 'center' }}>{s.label}</Text>
                    </View>
                  ))}
                </View>

                {/* 第一步：学习传达 */}
                {meetingStep === 'study' && (
                  <View style={{ gap: 8 }}>
                    <View style={{ backgroundColor: meetingInfo.headerColor, paddingHorizontal: 12, paddingVertical: 8 }}>
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>📖 第一项：学习传达</Text>
                      <Text style={{ color: '#a0b4cc', fontSize: 10, marginTop: 2 }}>学习传达上级重要精神，统一思想认识</Text>
                    </View>
                    {studyItems.map((item, i) => (
                      <Pressable
                        key={i}
                        onPress={() => setStudySelected(i)}
                        style={{ borderWidth: 1.5, borderColor: studySelected === i ? '#C82829' : '#D1D1CF', backgroundColor: studySelected === i ? '#fff5f5' : '#fafafa', padding: 12 }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: studySelected === i ? '#C82829' : '#ccc', backgroundColor: studySelected === i ? '#C82829' : '#fff', alignItems: 'center', justifyContent: 'center' }}>
                            {studySelected === i && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }} />}
                          </View>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: studySelected === i ? '#C82829' : '#222', flex: 1 }}>{item.title}</Text>
                        </View>
                        <Text style={{ fontSize: 11, color: '#666', lineHeight: 17, paddingLeft: 24 }}>{item.content}</Text>
                      </Pressable>
                    ))}
                    <Pressable
                      onPress={() => studySelected !== null && setMeetingStep('report')}
                      disabled={studySelected === null}
                      style={{ backgroundColor: studySelected !== null ? meetingInfo.headerColor : '#ccc', paddingVertical: 12, alignItems: 'center' }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>学习传达完毕 → 工作通报</Text>
                    </Pressable>
                    <Pressable onPress={() => setIsHolding(false)} style={{ paddingVertical: 8, alignItems: 'center' }}>
                      <Text style={{ color: '#888', fontSize: 12 }}>取消会议</Text>
                    </Pressable>
                  </View>
                )}

                {/* 第二步：工作通报 */}
                {meetingStep === 'report' && (
                  <View style={{ gap: 8 }}>
                    <View style={{ backgroundColor: meetingInfo.headerColor, paddingHorizontal: 12, paddingVertical: 8 }}>
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>📊 第二项：工作通报</Text>
                      <Text style={{ color: '#a0b4cc', fontSize: 10, marginTop: 2 }}>各部门负责人通报近期工作情况</Text>
                    </View>
                    {workReports.map((r, i) => (
                      <View key={i} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0E0E0', padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                        <View style={{ backgroundColor: RATING_COLOR[r.rating], paddingHorizontal: 6, paddingVertical: 3, minWidth: 24, alignItems: 'center' }}>
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{r.rating}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>{r.dept}</Text>
                          <Text style={{ fontSize: 12, color: '#333', lineHeight: 18 }}>{r.content}</Text>
                        </View>
                      </View>
                    ))}
                    <Pressable onPress={() => setMeetingStep('agenda')} style={{ backgroundColor: meetingInfo.headerColor, paddingVertical: 12, alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>通报完毕 → 议题审议</Text>
                    </Pressable>
                    <Pressable onPress={() => setMeetingStep('study')} style={{ paddingVertical: 8, alignItems: 'center' }}>
                      <Text style={{ color: '#888', fontSize: 12 }}>← 返回上一步</Text>
                    </Pressable>
                  </View>
                )}

                {/* 第三步：议题审议 */}
                {meetingStep === 'agenda' && (
                  <View style={{ gap: 8 }}>
                    <View style={{ backgroundColor: meetingInfo.headerColor, paddingHorizontal: 12, paddingVertical: 8 }}>
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>📋 第三项：议题审议</Text>
                      <Text style={{ color: '#a0b4cc', fontSize: 10, marginTop: 2 }}>各职能部门提报议题，逐一讨论表决</Text>
                    </View>
                    {tempAgendas.map((agenda) => {
                      const deptName = getDeptNameByRank(agenda.dept, save.rankLevel);
                      const totalVotes = agenda.yesCount + agenda.noCount + (agenda.vote ? 1 : 0);
                      return (
                        <View key={agenda.id} style={{ borderWidth: 1, borderColor: agenda.passed === true ? '#2a7a3b' : agenda.passed === false ? '#C82829' : '#D1D1CF', backgroundColor: agenda.passed === true ? '#f0faf2' : agenda.passed === false ? '#fff5f5' : '#fff', padding: 12 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                            <View style={{ backgroundColor: meetingInfo.headerColor, paddingHorizontal: 6, paddingVertical: 2, marginTop: 1 }}>
                              <Text style={{ color: '#fff', fontSize: 9 }}>{deptName}</Text>
                            </View>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#222', flex: 1, lineHeight: 18 }}>{agenda.issue}</Text>
                          </View>
                          <Text style={{ fontSize: 11, color: '#666', lineHeight: 17, marginBottom: 8, paddingLeft: 4, borderLeftWidth: 2, borderLeftColor: '#D1D1CF' }}>{agenda.detail}</Text>
                          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                            <Text style={{ fontSize: 10, color: '#888' }}>🙋 班子赞成 {agenda.yesCount} 票</Text>
                            <Text style={{ fontSize: 10, color: '#888' }}>✋ 反对 {agenda.noCount} 票</Text>
                          </View>
                          {agenda.vote === null ? (
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              <Pressable onPress={() => handleVote(agenda.id, 'yes')} style={{ flex: 1, backgroundColor: '#2a7a3b', paddingVertical: 8, alignItems: 'center' }}>
                                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✅ 举手赞成</Text>
                              </Pressable>
                              <Pressable onPress={() => handleVote(agenda.id, 'no')} style={{ flex: 1, backgroundColor: '#C82829', paddingVertical: 8, alignItems: 'center' }}>
                                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>❌ 投票反对</Text>
                              </Pressable>
                            </View>
                          ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <View style={{ backgroundColor: agenda.passed ? '#2a7a3b' : '#C82829', paddingHorizontal: 10, paddingVertical: 4 }}>
                                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{agenda.passed ? '✅ 决议通过' : '❌ 决议否决'}</Text>
                              </View>
                              <Text style={{ fontSize: 10, color: '#888' }}>赞成{agenda.vote === 'yes' ? agenda.yesCount + 1 : agenda.yesCount}/{totalVotes}票</Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                    {/* 自定义议题 */}
                    <View style={{ borderWidth: 1, borderColor: '#D1D1CF', borderStyle: 'dashed', padding: 10, gap: 8 }}>
                      <Text style={{ fontSize: 11, color: '#888', letterSpacing: 1 }}>➕ 提出临时议题</Text>
                      <TextInput
                        value={customIssue}
                        onChangeText={setCustomIssue}
                        placeholder="输入议题标题（如：关于…的议案）"
                        placeholderTextColor="#bbb"
                        style={{ borderWidth: 1, borderColor: '#D1D1CF', padding: 8, fontSize: 12, color: '#222' }}
                      />
                      <Pressable onPress={handleAddCustomAgenda} style={{ backgroundColor: '#4a3a1e', paddingVertical: 8, alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>提交至会议议程</Text>
                      </Pressable>
                    </View>
                    <Pressable onPress={() => setMeetingStep('kpi')} style={{ backgroundColor: meetingInfo.headerColor, paddingVertical: 12, alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>议题审议完毕 → 分派工作任务</Text>
                    </Pressable>
                    <Pressable onPress={() => setMeetingStep('report')} style={{ paddingVertical: 8, alignItems: 'center' }}>
                      <Text style={{ color: '#888', fontSize: 12 }}>← 返回上一步</Text>
                    </Pressable>
                  </View>
                )}

                {/* 第四步：任务分派 */}
                {meetingStep === 'kpi' && (
                  <View style={{ gap: 10 }}>
                    <View style={{ backgroundColor: meetingInfo.headerColor, paddingHorizontal: 12, paddingVertical: 8 }}>
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>📌 第四项：工作部署</Text>
                      <Text style={{ color: '#a0b4cc', fontSize: 10, marginTop: 2 }}>向与会人员下达本月工作任务指标</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: meetingInfo.headerColor, fontWeight: '700' }}>
                        {isNational ? '向与会领导下达任务' : '为下属分派KPI指标'}
                      </Text>
                      <Pressable onPress={handleAutoAssign} style={{ backgroundColor: meetingInfo.headerColor, paddingHorizontal: 12, paddingVertical: 6 }} android_ripple={{ color: 'rgba(255,255,255,0.2)' }}>
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>⚡ 一键分配</Text>
                      </Pressable>
                    </View>
                    {isNational ? nationalAttendees.map(person => (
                      <View key={person.id} style={{ borderWidth: 1, borderColor: assignments[person.id] ? '#4a2c8a' : '#D1D1CF', padding: 10, backgroundColor: assignments[person.id] ? '#f4f0fa' : '#fff' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <View style={{ backgroundColor: person.isCore ? '#4a2c8a' : '#7B5E2A', paddingHorizontal: 5, paddingVertical: 2 }}>
                            <Text style={{ color: '#fff', fontSize: 9 }}>{person.isCore ? '常委' : '委员'}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#222' }}>{person.name}</Text>
                            <Text style={{ fontSize: 10, color: '#888' }}>{person.title}</Text>
                          </View>
                          {assignments[person.id] && <View style={{ backgroundColor: '#4a2c8a', paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ color: '#fff', fontSize: 9 }}>已分配</Text></View>}
                        </View>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                          {activeKpiOptions.map(opt => (
                            <Pressable key={opt.type} onPress={() => setAssignments(prev => ({ ...prev, [person.id]: opt.type }))}
                              style={{ borderWidth: 1, borderColor: assignments[person.id] === opt.type ? '#4a2c8a' : '#ccc', backgroundColor: assignments[person.id] === opt.type ? '#4a2c8a' : '#fff', paddingHorizontal: 8, paddingVertical: 4 }}>
                              <Text style={{ fontSize: 11, color: assignments[person.id] === opt.type ? '#fff' : '#555' }}>{opt.label}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    )) : attendees.length === 0 ? (
                      <Text style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic' }}>暂无在岗人员，请先任命部门正职</Text>
                    ) : attendees.map(sub => {
                      const isBandMember = bandSubIds.has(sub.id) && sub.deptPosition !== 'head' && sub.deptPosition !== 'deputy';
                      const posLabel = sub.deptPosition === 'head' ? '正职' : sub.deptPosition === 'deputy' ? '副职' : '班子';
                      const posColor = sub.deptPosition === 'head' ? '#C82829' : sub.deptPosition === 'deputy' ? '#1D2D44' : '#7B5E2A';
                      return (
                        <View key={sub.id} style={{ borderWidth: 1, borderColor: assignments[sub.id] ? meetingInfo.headerColor : '#D1D1CF', padding: 10, backgroundColor: assignments[sub.id] ? '#f0f4fa' : '#fff' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                            <View style={{ backgroundColor: posColor, paddingHorizontal: 5, paddingVertical: 2 }}>
                              <Text style={{ color: '#fff', fontSize: 9 }}>{posLabel}</Text>
                            </View>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#222' }}>{sub.name}</Text>
                            <Text style={{ fontSize: 10, color: '#888', flex: 1 }}>{isBandMember ? '领导班子' : sub.appointedRole ?? sub.appointedDept ?? ''}</Text>
                            {assignments[sub.id] && <View style={{ backgroundColor: meetingInfo.headerColor, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ color: '#fff', fontSize: 9 }}>已分配</Text></View>}
                          </View>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                            {activeKpiOptions.map(opt => (
                              <Pressable key={opt.type} onPress={() => setAssignments(prev => ({ ...prev, [sub.id]: opt.type }))}
                                style={{ borderWidth: 1, borderColor: assignments[sub.id] === opt.type ? '#C82829' : '#ccc', backgroundColor: assignments[sub.id] === opt.type ? '#C82829' : '#fff', paddingHorizontal: 8, paddingVertical: 4 }}>
                                <Text style={{ fontSize: 11, color: assignments[sub.id] === opt.type ? '#fff' : '#555' }}>{opt.label}</Text>
                              </Pressable>
                            ))}
                          </View>
                        </View>
                      );
                    })}
                    {msg ? <Text style={{ fontSize: 12, color: msg.startsWith('✓') ? '#2a7a3b' : '#C82829' }}>{msg}</Text> : null}
                    <Pressable onPress={() => setMeetingStep('summary')} disabled={Object.keys(assignments).length === 0} style={{ backgroundColor: Object.keys(assignments).length > 0 ? meetingInfo.headerColor : '#ccc', paddingVertical: 12, alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>任务布置完毕 → 形成纪要</Text>
                    </Pressable>
                    <Pressable onPress={() => setMeetingStep('agenda')} style={{ paddingVertical: 8, alignItems: 'center' }}>
                      <Text style={{ color: '#888', fontSize: 12 }}>← 返回上一步</Text>
                    </Pressable>
                  </View>
                )}

                {/* 第五步：形成纪要 */}
                {meetingStep === 'summary' && (
                  <View style={{ gap: 10 }}>
                    <View style={{ backgroundColor: meetingInfo.headerColor, paddingHorizontal: 12, paddingVertical: 8 }}>
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>📝 第五项：形成纪要</Text>
                      <Text style={{ color: '#a0b4cc', fontSize: 10, marginTop: 2 }}>确认本次会议内容，形成会议纪要</Text>
                    </View>
                    {/* 纪要预览 */}
                    <View style={{ backgroundColor: '#FAFAF8', borderWidth: 1, borderColor: '#D1D1CF', padding: 14, gap: 8 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#222', textAlign: 'center', marginBottom: 4 }}>
                        {meetingInfo.subtitle}纪要
                      </Text>
                      <Text style={{ fontSize: 11, color: '#555' }}>时间：{gameDaysToDate(save.gameDays)}</Text>
                      <Text style={{ fontSize: 11, color: '#555' }}>主持：{meetingInfo.convener}</Text>
                      <Text style={{ fontSize: 11, color: '#555' }}>参会人数：{totalAttendeeCount}人</Text>
                      <View style={{ borderTopWidth: 1, borderTopColor: '#E0E0E0', paddingTop: 8, marginTop: 4 }}>
                        <Text style={{ fontSize: 11, color: '#555', fontWeight: '600' }}>一、学习传达事项</Text>
                        <Text style={{ fontSize: 11, color: '#888', marginTop: 3 }}>
                          {studySelected !== null ? studyItems[studySelected].title : ''}
                        </Text>
                      </View>
                      <View style={{ borderTopWidth: 1, borderTopColor: '#E0E0E0', paddingTop: 8 }}>
                        <Text style={{ fontSize: 11, color: '#555', fontWeight: '600' }}>二、议题审议结果</Text>
                        {tempAgendas.map((a, i) => (
                          <Text key={a.id} style={{ fontSize: 11, color: '#888', marginTop: 3 }}>
                            {i + 1}. {a.issue}——{a.passed === true ? '✅通过' : a.passed === false ? '❌否决' : '⏳待定'}
                          </Text>
                        ))}
                      </View>
                      <View style={{ borderTopWidth: 1, borderTopColor: '#E0E0E0', paddingTop: 8 }}>
                        <Text style={{ fontSize: 11, color: '#555', fontWeight: '600' }}>三、工作部署任务</Text>
                        <Text style={{ fontSize: 11, color: '#888', marginTop: 3 }}>共向 {Object.keys(assignments).length} 名与会人员下达KPI工作任务，30天内完成。</Text>
                      </View>
                    </View>
                    <Pressable onPress={handleSubmit} disabled={submitting} style={{ backgroundColor: '#2a7a3b', paddingVertical: 14, alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{submitting ? '提交中…' : '✅ 确认纪要，会议结束'}</Text>
                    </Pressable>
                    <Pressable onPress={() => setMeetingStep('kpi')} style={{ paddingVertical: 8, alignItems: 'center' }}>
                      <Text style={{ color: '#888', fontSize: 12 }}>← 返回上一步</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <View style={{ borderWidth: 1, borderColor: '#888', paddingHorizontal: 10, paddingVertical: 3 }}>
                    <Text style={{ color: '#888', fontSize: 11 }}>未召开</Text>
                  </View>
                </View>
                <Pressable onPress={handleHoldMeeting} style={{ backgroundColor: meetingInfo.headerColor, padding: 13, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 1 }}>召开{meetingInfo.title}</Text>
                </Pressable>
              </>
            )}
          </View>

          {/* ── 往期记录 ── */}
          {recentMeetings.length > 0 && (
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2 }}>往期会议记录</Text>
                {histRate !== null && (
                  <View style={{ backgroundColor: histRate >= 70 ? '#2a7a3b' : histRate >= 40 ? '#e07a00' : '#C82829', paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>完成率 {histRate}%</Text>
                  </View>
                )}
              </View>
              {recentMeetings.map(m => {
                const done  = m.tasks.filter(t => t.status === 'done').length;
                const total = m.tasks.length;
                const rateColor = done === total ? '#2a7a3b' : done > 0 ? '#e07a00' : '#C82829';
                return (
                  <View key={m.id} style={{ paddingVertical: 8, borderTopWidth: 1, borderColor: '#f0f0f0' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <View>
                        <Text style={{ fontSize: 12, color: '#333' }}>第 {m.monthKey} 月 {meetingInfo.title}</Text>
                        <Text style={{ fontSize: 11, color: '#888' }}>{gameDaysToDate(m.heldDay)}</Text>
                      </View>
                      <Text style={{ fontSize: 12, color: rateColor, fontWeight: '600' }}>{done}/{total} 完成</Text>
                    </View>
                    <ProgressBar value={done} total={total} color={rateColor} />
                  </View>
                );
              })}
            </View>
          )}

          {/* ── 规则说明 ── */}
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 8 }}>会议制度说明</Text>
            <Text style={{ fontSize: 12, color: '#555', lineHeight: 20 }}>
              · 依据党政会议制度，{meetingInfo.title}每月至少召开一次{'\n'}
              · 未按时召开将产生政绩扣减并增加工作风险{'\n'}
              · 会议流程：学习传达→工作通报→议题审议→任务分派→形成纪要{'\n'}
              · 各职能部门议题须逐一表决，形成党委/政府决议{'\n'}
              · 任务分派后30天内系统自动结算，完成任务获政绩奖励{'\n'}
              · 「一键分配」将四类KPI轮转分配给各参会人员
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
```

<a id="srcappappmilitarycommissiontsx"></a>
## `src/app/(app)/military-commission.tsx`

```tsx
// 军委职权页 — rank14 国政院院理/军委副主席专属
// 功能：参考现实中枢军委职权 - 任命/预算/演习/装备研发
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { formatMoney } from '@/types/game';

// ── 军委委员数据（参考现实中枢军委组成） ────────────────────────────
interface CmcMember {
  id: string;
  name: string;
  title: string;
  rank: string;
  service: '解放军' | '海军' | '空军' | '火箭军' | '战略支援' | '联勤保障' | '陆军';
  ability: number;
  loyalty: number;
  appointed: boolean;
}

const CMC_MEMBERS: CmcMember[] = [
  { id: 'cmc1', name: '张卫国', title: '联合参谋部参谋长',  rank: '上将', service: '解放军', ability: 88, loyalty: 92, appointed: false },
  { id: 'cmc2', name: '李建华', title: '中枢军委委员',     rank: '上将', service: '陆军',   ability: 85, loyalty: 89, appointed: false },
  { id: 'cmc3', name: '刘志远', title: '海军司令员',       rank: '上将', service: '海军',   ability: 84, loyalty: 88, appointed: false },
  { id: 'cmc4', name: '王天宇', title: '空军司令员',       rank: '上将', service: '空军',   ability: 87, loyalty: 91, appointed: false },
  { id: 'cmc5', name: '陈国兴', title: '火箭军司令员',     rank: '上将', service: '火箭军', ability: 90, loyalty: 85, appointed: false },
  { id: 'cmc6', name: '赵明华', title: '战略支援部队司令', rank: '上将', service: '战略支援', ability: 83, loyalty: 87, appointed: false },
  { id: 'cmc7', name: '周建军', title: '联勤保障部队司令', rank: '上将', service: '联勤保障', ability: 81, loyalty: 90, appointed: false },
  { id: 'cmc8', name: '孙志强', title: '国防部长',         rank: '上将', service: '解放军', ability: 86, loyalty: 93, appointed: false },
];

const SERVICE_COLORS: Record<string, string> = {
  '解放军': '#C82829', '海军': '#1D3B5E', '空军': '#2B4B6F',
  '火箭军': '#7B0026', '战略支援': '#2a7a3b', '联勤保障': '#7B5E2A', '陆军': '#4a5a2a',
};

// ── 军事预算项目 ─────────────────────────────────────────────────────
interface BudgetItem {
  id: string;
  icon: string;
  name: string;
  category: '战略威慑' | '常规力量' | '信息作战' | '后勤保障';
  amount: number;   // 万元
  securityBonus: number;
  desc: string;
}

const BUDGET_ITEMS: BudgetItem[] = [
  { id: 'b1', icon: '🚀', name: '核威慑力量维护升级', category: '战略威慑', amount: 5000000, securityBonus: 20, desc: '核弹头维护、战略导弹更新与核指挥系统升级' },
  { id: 'b2', icon: '🛸', name: '第五代战机研发',     category: '常规力量', amount: 3000000, securityBonus: 12, desc: '推进歼-35系列战机研制并列装空海军部队' },
  { id: 'b3', icon: '🛳️', name: '大型航母战斗群',     category: '常规力量', amount: 4000000, securityBonus: 15, desc: '第四艘航母建造及配套舰载机部队组建' },
  { id: 'b4', icon: '🔮', name: '电子作战能力建设',   category: '信息作战', amount: 1500000, securityBonus: 8,  desc: '强化电子干扰、网络攻防和信息侦察能力' },
  { id: 'b5', icon: '🤖', name: '智能无人作战系统',   category: '信息作战', amount: 2000000, securityBonus: 10, desc: '无人机蜂群、水下无人潜艇等智能武器研发' },
  { id: 'b6', icon: '🏥', name: '战备医疗保障体系',   category: '后勤保障', amount: 500000,  securityBonus: 4,  desc: '战时医疗救援体系建设，提升战场救治能力' },
  { id: 'b7', icon: '⛽', name: '战略能源储备',       category: '后勤保障', amount: 800000,  securityBonus: 5,  desc: '扩大石油、核燃料等战略物资储备规模' },
];

// ── 联合演习计划 ─────────────────────────────────────────────────────
interface Exercise {
  id: string;
  icon: string;
  name: string;
  type: '陆战' | '海战' | '空战' | '联合' | '信息战';
  scale: '战区级' | '战略级' | '全军级';
  cost: number;
  securityBonus: number;
  meritReward: number;
  desc: string;
  duration: string;
}

const EXERCISES: Exercise[] = [
  { id: 'e1', icon: '⚔️', name: '东部战区联合作战演习',  type: '联合', scale: '战区级', cost: 500000,   securityBonus: 6,  meritReward: 20, desc: '模拟岛链外围联合作战，检验三军协同能力', duration: '7天' },
  { id: 'e2', icon: '🌊', name: '南海舰队远洋实兵演练',  type: '海战', scale: '战区级', cost: 800000,   securityBonus: 8,  meritReward: 25, desc: '舰载机跨海域协同演习，提升远洋投送能力', duration: '14天' },
  { id: 'e3', icon: '🛸', name: '空军战略轰炸机远程巡航', type: '空战', scale: '战略级', cost: 600000,   securityBonus: 7,  meritReward: 22, desc: '战略轰炸机绕岛巡逻，彰显战略威慑意志',   duration: '3天' },
  { id: 'e4', icon: '💻', name: '全军网络空间对抗演习',   type: '信息战', scale: '全军级', cost: 400000, securityBonus: 5,  meritReward: 18, desc: '检验网络攻防、电磁对抗和指挥控制能力',  duration: '5天' },
  { id: 'e5', icon: '🏔️', name: '高原山地联合立体作战',  type: '陆战', scale: '战区级', cost: 700000,   securityBonus: 7,  meritReward: 23, desc: '检验高原高寒地区联合作战保障能力',       duration: '10天' },
  { id: 'e6', icon: '🚀', name: '东风系列导弹综合演训',   type: '联合', scale: '全军级', cost: 1200000,  securityBonus: 12, meritReward: 40, desc: '常规弹道导弹精确打击与核力量综合演训',  duration: '5天' },
];

// ── 装备研发项目 ─────────────────────────────────────────────────────
interface EquipProject {
  id: string;
  icon: string;
  name: string;
  type: '陆装' | '海装' | '空装' | '信息装备' | '战略装备';
  cost: number;
  securityBonus: number;
  period: string;
  desc: string;
  status: 'planning' | 'developing' | 'completed';
}

const EQUIP_PROJECTS: EquipProject[] = [
  { id: 'eq1', icon: '🛡️', name: '新型主战坦克（三代+）', type: '陆装',   cost: 1500000, securityBonus: 8,  period: '3年', desc: '研制装备新一代主战坦克，提升陆战突击能力', status: 'planning' },
  { id: 'eq2', icon: '🚢', name: '核动力航母',            type: '海装',   cost: 8000000, securityBonus: 25, period: '8年', desc: '首艘核动力航空母舰立项研制，实现跨代跃升', status: 'planning' },
  { id: 'eq3', icon: '✈️', name: '隐身无人战略侦察机',   type: '空装',   cost: 2000000, securityBonus: 10, period: '4年', desc: '高空长航时隐身战略侦察机研发部署',         status: 'planning' },
  { id: 'eq4', icon: '🔬', name: '量子通信军事网络',      type: '信息装备', cost: 1200000, securityBonus: 12, period: '5年', desc: '构建抗干扰量子加密军事通信指挥体系',      status: 'planning' },
  { id: 'eq5', icon: '🚀', name: '高超音速导弹扩充',      type: '战略装备', cost: 3000000, securityBonus: 18, period: '3年', desc: '东风-17/21改进型批量生产，扩充核常兼备打击力量', status: 'planning' },
  { id: 'eq6', icon: '🤖', name: '无人机集群作战系统',    type: '空装',   cost: 900000,  securityBonus: 7,  period: '2年', desc: '自主协同无人机蜂群作战系统研发与列装',     status: 'planning' },
];

const CMC_TABS = [
  { id: 'appoint',  label: '🎖️ 人事任免' },
  { id: 'budget',   label: '💰 国防预算' },
  { id: 'exercise', label: '⚔️ 军事演习' },
  { id: 'equip',    label: '🔬 装备研发' },
  { id: 'theater',  label: '🗺️ 战区管理' },
];

// ── 五大战区数据 ────────────────────────────────────────────────────
interface TheaterCommand {
  id: string;
  name: string;
  icon: string;
  color: string;
  hq: string;
  jurisdiction: string[];
  commander: string;
  commissar: string;
  rank: string;
  troops: number;   // 万人
  readiness: number; // 战备率%
  missions: string[];
}

const THEATER_COMMANDS: TheaterCommand[] = [
  {
    id: 'east', name: '东部战区', icon: '🌊', color: '#1565C0', hq: '南京',
    jurisdiction: ['江苏', '浙江', '福建', '安徽', '江西', '上海'],
    commander: '张振海', commissar: '刘建国', rank: '上将',
    troops: 35, readiness: 92,
    missions: ['台海方向主战', '东海防空识别区维权', '联合岛链封控演练', '近海防御纵深打击'],
  },
  {
    id: 'south', name: '南部战区', icon: '🏝️', color: '#1B5E20', hq: '广州',
    jurisdiction: ['广东', '广西', '云南', '贵州', '海南', '香港', '澳门'],
    commander: '陈锐之', commissar: '王宏伟', rank: '上将',
    troops: 30, readiness: 88,
    missions: ['南海岛礁维权', '马六甲通道保障', '东南亚方向战略威慑', '反恐维稳协同'],
  },
  {
    id: 'west', name: '西部战区', icon: '🏔️', color: '#4A148C', hq: '成都',
    jurisdiction: ['四川', '重庆', '云南', '西藏', '新疆', '青海', '甘肃', '宁夏'],
    commander: '孙志强', commissar: '赵国梁', rank: '上将',
    troops: 32, readiness: 85,
    missions: ['中印边境防御', '反分裂处置', '高原高寒作战能力建设', '反恐维稳保障'],
  },
  {
    id: 'north', name: '北部战区', icon: '❄️', color: '#37474F', hq: '沈阳',
    jurisdiction: ['辽宁', '吉林', '黑龙江', '内蒙古', '山东', '北京', '天津'],
    commander: '李天宇', commissar: '周建华', rank: '上将',
    troops: 28, readiness: 87,
    missions: ['朝鲜半岛应急预案', '海上通道防控', '战略纵深防御', '联合防空体系建设'],
  },
  {
    id: 'central', name: '中部战区', icon: '🛡️', color: '#B71C1C', hq: '北京',
    jurisdiction: ['河北', '河南', '湖北', '湖南', '山西', '陕西'],
    commander: '吴向阳', commissar: '徐志明', rank: '上将',
    troops: 25, readiness: 95,
    missions: ['首都圈战略防卫', '核指挥保障', '战略预备队协调', '全国战略机动指挥'],
  },
];

// 战区指挥官调整操作
interface TheaterAction {
  id: string;
  label: string;
  icon: string;
  desc: string;
  cost: number;
  meritReward: number;
  securityBonus: number;
}

const THEATER_ACTIONS: TheaterAction[] = [
  { id: 'ta1', label: '下达战备提升令', icon: '📡', desc: '向指定战区下达战备提升指令，提高部队应急响应能力', cost: 200000, meritReward: 15, securityBonus: 5 },
  { id: 'ta2', label: '组织战区联合演习', icon: '⚔️', desc: '以军委名义组织跨战区联合演习，检验多战区协同作战能力', cost: 800000, meritReward: 30, securityBonus: 10 },
  { id: 'ta3', label: '调整战区司令员', icon: '🎖️', desc: '对战区司令员实施人事调整，优化战区领导班子建设', cost: 0, meritReward: 20, securityBonus: 3 },
  { id: 'ta4', label: '视察战区部队', icon: '🚁', desc: '亲赴战区视察部队，提振官兵士气，了解实际战备情况', cost: 50000, meritReward: 12, securityBonus: 4 },
];

export default function MilitaryCommissionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [tab, setTab] = useState('appoint');
  const [acting, setActing] = useState(false);
  const [result, setResult] = useState('');
  const [appointedIds, setAppointedIds] = useState<Set<string>>(new Set());
  const [approvedBudgets, setApprovedBudgets] = useState<Set<string>>(new Set());
  const [conductedExercises, setConductedExercises] = useState<Set<string>>(new Set());
  const [launchedProjects, setLaunchedProjects] = useState<Set<string>>(new Set());
  // 战区管理
  const [selectedTheater, setSelectedTheater] = useState<string | null>(null);
  const [theaterActionDone, setTheaterActionDone] = useState<Set<string>>(new Set());

  if (!save || save.rankLevel < 14) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F4F1', padding: 24 }}>
        <Text style={{ fontSize: 32, marginBottom: 12 }}>🎖️</Text>
        <Text style={{ fontSize: 14, color: '#888', textAlign: 'center' }}>晋升至国政院院理（级别14）后解锁军委职权</Text>
      </View>
    );
  }

  const showResult = (msg: string) => {
    setResult(msg);
    setTimeout(() => setResult(''), 3500);
  };

  const handleAppoint = async (member: CmcMember) => {
    if (acting || appointedIds.has(member.id)) return;
    setActing(true);
    await updateGameSave({ meritPoints: (save.meritPoints ?? 0) + 30 });
    setAppointedIds(prev => new Set(prev).add(member.id));
    showResult(`🎖️ 已任命 ${member.rank}${member.name} 为${member.title} · 政绩+30`);
    setActing(false);
  };

  const handleBudget = async (item: BudgetItem) => {
    if (acting || approvedBudgets.has(item.id)) return;
    if ((save.fundBalance ?? 0) < item.amount) {
      showResult(`⚠️ 经费不足，需要 ¥${formatMoney(item.amount)}`);
      return;
    }
    setActing(true);
    const cur = save.securityIndex ?? 50;
    await updateGameSave({
      fundBalance: (save.fundBalance ?? 0) - item.amount,
      securityIndex: Math.min(100, cur + item.securityBonus),
      meritPoints: (save.meritPoints ?? 0) + 20,
    });
    setApprovedBudgets(prev => new Set(prev).add(item.id));
    showResult(`💰 ${item.name}预算批准 · 安全指数+${item.securityBonus} · 政绩+20`);
    setActing(false);
  };

  const handleExercise = async (ex: Exercise) => {
    if (acting || conductedExercises.has(ex.id)) return;
    if ((save.fundBalance ?? 0) < ex.cost) {
      showResult(`⚠️ 经费不足，需要 ¥${formatMoney(ex.cost)}`);
      return;
    }
    setActing(true);
    const cur = save.securityIndex ?? 50;
    await updateGameSave({
      fundBalance: (save.fundBalance ?? 0) - ex.cost,
      securityIndex: Math.min(100, cur + ex.securityBonus),
      meritPoints: (save.meritPoints ?? 0) + ex.meritReward,
    });
    setConductedExercises(prev => new Set(prev).add(ex.id));
    showResult(`⚔️ 「${ex.name}」演习完成 · 安全+${ex.securityBonus} · 政绩+${ex.meritReward}`);
    setActing(false);
  };

  const handleEquip = async (eq: EquipProject) => {
    if (acting || launchedProjects.has(eq.id)) return;
    if ((save.fundBalance ?? 0) < eq.cost) {
      showResult(`⚠️ 经费不足，需要 ¥${formatMoney(eq.cost)}`);
      return;
    }
    setActing(true);
    const cur = save.securityIndex ?? 50;
    await updateGameSave({
      fundBalance: (save.fundBalance ?? 0) - eq.cost,
      securityIndex: Math.min(100, cur + eq.securityBonus),
      meritPoints: (save.meritPoints ?? 0) + 35,
    });
    setLaunchedProjects(prev => new Set(prev).add(eq.id));
    showResult(`🔬 「${eq.name}」立项批准 · 预计${eq.period}完成 · 安全+${eq.securityBonus}`);
    setActing(false);
  };

  const CATEGORY_COLORS: Record<string, string> = {
    '战略威慑': '#7B0026', '常规力量': '#1D3B5E', '信息作战': '#2B4B6F', '后勤保障': '#2a7a3b',
  };
  const TYPE_COLORS: Record<string, string> = {
    '陆战': '#4a5a2a', '海战': '#1D3B5E', '空战': '#2B4B6F', '联合': '#C82829', '信息战': '#4a4a8a',
  };
  const EQUIP_COLORS: Record<string, string> = {
    '陆装': '#4a5a2a', '海装': '#1D3B5E', '空装': '#2B4B6F', '信息装备': '#4a4a8a', '战略装备': '#7B0026',
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0D0D14' }}>
      <StatusBar style="light" backgroundColor="#0D0D14" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#0D0D14', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#1E1E30' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: '#a0b0cc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(160,180,220,0.5)', fontSize: 9, letterSpacing: 3 }}>中枢军事委员会 · 机密</Text>
            <Text style={{ color: '#E8D0A0', fontWeight: '700', fontSize: 17 }}>🎖️ 军委职权</Text>
            <Text style={{ color: 'rgba(200,180,140,0.7)', fontSize: 11, marginTop: 2 }}>
              {save.playerName} · 中枢军委副主席职权
            </Text>
          </View>
        </View>

        {/* 军力数据 */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {[
            { label: '国防安全', value: `${save.securityIndex ?? 50}`, unit: '分',  color: '#E8D0A0' },
            { label: '政绩积累', value: `${save.meritPoints.toFixed(0)}`, unit: '分', color: '#7EC8E3' },
            { label: '专项经费', value: formatMoney(save.fundBalance), unit: '万', color: '#90EE90' },
            { label: '任期',     value: `${save.tenureYears}`, unit: '年',        color: '#FFB6C1' },
          ].map(s => (
            <View key={s.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', padding: 8, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
              <Text style={{ color: s.color, fontWeight: '700', fontSize: 13 }}>{s.value}<Text style={{ fontSize: 9 }}>{s.unit}</Text></Text>
              <Text style={{ color: 'rgba(200,200,200,0.5)', fontSize: 9, marginTop: 1 }}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Tab */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, backgroundColor: '#12121E', borderBottomWidth: 1, borderBottomColor: '#1E1E30' }} contentContainerStyle={{ paddingHorizontal: 8 }}>
        {CMC_TABS.map(t => (
          <Pressable
            key={t.id}
            onPress={() => setTab(t.id)}
            style={{ paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: tab === t.id ? '#E8D0A0' : 'transparent' }}
          >
            <Text style={{ fontSize: 11, fontWeight: tab === t.id ? '700' : '400', color: tab === t.id ? '#E8D0A0' : '#666' }}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={{ backgroundColor: '#0D0D14' }} contentInsetAdjustmentBehavior="automatic">
        <View style={{ padding: 12, gap: 10 }}>

          {/* 人事任免 */}
          {tab === 'appoint' && (
            <>
              <View style={{ backgroundColor: '#1A1A2E', padding: 12, borderWidth: 1, borderColor: '#2a2a4a' }}>
                <Text style={{ color: '#E8D0A0', fontWeight: '700', fontSize: 12 }}>🎖️ 中枢军委委员人事任免</Text>
                <Text style={{ color: 'rgba(200,200,200,0.6)', fontSize: 10, marginTop: 4, lineHeight: 15 }}>
                  参照《宪法》和《国防法》，总理协助中枢军委主席行使军委委员任命权。已任命 {appointedIds.size}/{CMC_MEMBERS.length} 名。
                </Text>
              </View>
              {CMC_MEMBERS.map(m => {
                const done = appointedIds.has(m.id);
                const svcColor = SERVICE_COLORS[m.service] ?? '#888';
                return (
                  <View key={m.id} style={{ backgroundColor: '#12121E', borderWidth: 1, borderColor: done ? '#E8D0A0' : '#1E1E30' }}>
                    <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 44, height: 44, backgroundColor: svcColor + '30', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: svcColor }}>
                        <Text style={{ fontSize: 20 }}>🎖️</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: done ? '#E8D0A0' : '#ddd' }}>{m.name}</Text>
                          <View style={{ backgroundColor: svcColor, paddingHorizontal: 4, paddingVertical: 1 }}>
                            <Text style={{ fontSize: 8, color: '#fff' }}>{m.rank}</Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 10, color: 'rgba(200,200,200,0.6)', marginTop: 2 }}>{m.title} · {m.service}</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                          <Text style={{ fontSize: 9, color: '#7EC8E3' }}>能力 {m.ability}</Text>
                          <Text style={{ fontSize: 9, color: '#90EE90' }}>忠诚 {m.loyalty}</Text>
                        </View>
                      </View>
                      {done ? (
                        <View style={{ backgroundColor: '#E8D0A0', paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, color: '#333', fontWeight: '700' }}>已任命</Text>
                        </View>
                      ) : (
                        <Pressable
                          onPress={() => void handleAppoint(m)}
                          disabled={acting}
                          style={{ backgroundColor: '#C82829', paddingHorizontal: 10, paddingVertical: 6 }}
                        >
                          <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>任命</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {/* 国防预算 */}
          {tab === 'budget' && (
            <>
              <View style={{ backgroundColor: '#1A1A2E', padding: 12, borderWidth: 1, borderColor: '#2a2a4a' }}>
                <Text style={{ color: '#E8D0A0', fontWeight: '700', fontSize: 12 }}>💰 国防专项预算审批</Text>
                <Text style={{ color: 'rgba(200,200,200,0.6)', fontSize: 10, marginTop: 4, lineHeight: 15 }}>
                  协助中枢军委主席审批国防专项预算。当前安全指数：{save.securityIndex ?? 50}分
                </Text>
              </View>
              {BUDGET_ITEMS.map(item => {
                const done = approvedBudgets.has(item.id);
                const canDo = (save.fundBalance ?? 0) >= item.amount && !done;
                const catColor = CATEGORY_COLORS[item.category] ?? '#666';
                return (
                  <View key={item.id} style={{ backgroundColor: '#12121E', borderWidth: 1, borderColor: done ? '#E8D0A0' : '#1E1E30', overflow: 'hidden' }}>
                    <View style={{ padding: 12, gap: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                        <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: done ? '#E8D0A0' : '#ddd' }}>{item.name}</Text>
                            <View style={{ backgroundColor: catColor, paddingHorizontal: 4, paddingVertical: 1 }}>
                              <Text style={{ fontSize: 8, color: '#fff' }}>{item.category}</Text>
                            </View>
                          </View>
                          <Text style={{ fontSize: 10, color: 'rgba(200,200,200,0.6)', marginTop: 3, lineHeight: 14 }}>{item.desc}</Text>
                          <View style={{ flexDirection: 'row', gap: 6, marginTop: 5 }}>
                            <View style={{ backgroundColor: 'rgba(200,160,80,0.15)', paddingHorizontal: 5, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 9, color: '#E8D0A0' }}>预算 ¥{formatMoney(item.amount)}</Text>
                            </View>
                            <View style={{ backgroundColor: 'rgba(200,80,80,0.15)', paddingHorizontal: 5, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 9, color: '#FF8080' }}>安全+{item.securityBonus}</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                    {!done && (
                      <Pressable
                        onPress={() => void handleBudget(item)}
                        disabled={!canDo || acting}
                        style={{ paddingVertical: 10, alignItems: 'center', backgroundColor: canDo ? '#C82829' : '#222' }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>
                          {acting ? '审批中…' : canDo ? `▶ 批准预算（¥${formatMoney(item.amount)}）` : '经费不足'}
                        </Text>
                      </Pressable>
                    )}
                    {done && (
                      <View style={{ paddingVertical: 8, alignItems: 'center', backgroundColor: 'rgba(232,208,160,0.08)' }}>
                        <Text style={{ color: '#E8D0A0', fontSize: 10 }}>✓ 预算已批准，项目执行中</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          )}

          {/* 军事演习 */}
          {tab === 'exercise' && (
            <>
              <View style={{ backgroundColor: '#1A1A2E', padding: 12, borderWidth: 1, borderColor: '#2a2a4a' }}>
                <Text style={{ color: '#E8D0A0', fontWeight: '700', fontSize: 12 }}>⚔️ 联合军事演习部署</Text>
                <Text style={{ color: 'rgba(200,200,200,0.6)', fontSize: 10, marginTop: 4, lineHeight: 15 }}>
                  依据《军委演习条例》，批准和部署各军种联合演习，提升实战能力与战略威慑。
                </Text>
              </View>
              {EXERCISES.map(ex => {
                const done = conductedExercises.has(ex.id);
                const canDo = (save.fundBalance ?? 0) >= ex.cost && !done;
                const typeColor = TYPE_COLORS[ex.type] ?? '#666';
                const scaleColor = ex.scale === '全军级' ? '#C82829' : ex.scale === '战略级' ? '#7B0026' : '#2B4B6F';
                return (
                  <View key={ex.id} style={{ backgroundColor: '#12121E', borderWidth: 1, borderColor: done ? '#E8D0A0' : '#1E1E30', overflow: 'hidden' }}>
                    <View style={{ padding: 12, gap: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                        <Text style={{ fontSize: 22 }}>{ex.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: done ? '#E8D0A0' : '#ddd' }}>{ex.name}</Text>
                            <View style={{ backgroundColor: typeColor, paddingHorizontal: 4, paddingVertical: 1 }}>
                              <Text style={{ fontSize: 8, color: '#fff' }}>{ex.type}</Text>
                            </View>
                            <View style={{ backgroundColor: scaleColor, paddingHorizontal: 4, paddingVertical: 1 }}>
                              <Text style={{ fontSize: 8, color: '#fff' }}>{ex.scale}</Text>
                            </View>
                          </View>
                          <Text style={{ fontSize: 10, color: 'rgba(200,200,200,0.6)', marginTop: 3, lineHeight: 14 }}>{ex.desc}</Text>
                          <View style={{ flexDirection: 'row', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: 9, color: '#E8D0A0', backgroundColor: 'rgba(200,160,80,0.12)', paddingHorizontal: 5, paddingVertical: 2 }}>费用 ¥{formatMoney(ex.cost)}</Text>
                            <Text style={{ fontSize: 9, color: '#FF8080', backgroundColor: 'rgba(200,80,80,0.12)', paddingHorizontal: 5, paddingVertical: 2 }}>安全+{ex.securityBonus}</Text>
                            <Text style={{ fontSize: 9, color: '#90EE90', backgroundColor: 'rgba(80,200,80,0.12)', paddingHorizontal: 5, paddingVertical: 2 }}>政绩+{ex.meritReward}</Text>
                            <Text style={{ fontSize: 9, color: '#7EC8E3', backgroundColor: 'rgba(80,150,200,0.12)', paddingHorizontal: 5, paddingVertical: 2 }}>历时{ex.duration}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    {!done && (
                      <Pressable
                        onPress={() => void handleExercise(ex)}
                        disabled={!canDo || acting}
                        style={{ paddingVertical: 10, alignItems: 'center', backgroundColor: canDo ? '#1D3B5E' : '#222' }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>
                          {acting ? '部署中…' : canDo ? '▶ 批准演习' : '经费不足'}
                        </Text>
                      </Pressable>
                    )}
                    {done && (
                      <View style={{ paddingVertical: 8, alignItems: 'center', backgroundColor: 'rgba(232,208,160,0.08)' }}>
                        <Text style={{ color: '#E8D0A0', fontSize: 10 }}>✓ 演习已完成，战备水平提升</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          )}

          {/* 装备研发 */}
          {tab === 'equip' && (
            <>
              <View style={{ backgroundColor: '#1A1A2E', padding: 12, borderWidth: 1, borderColor: '#2a2a4a' }}>
                <Text style={{ color: '#E8D0A0', fontWeight: '700', fontSize: 12 }}>🔬 重大武器装备研发立项</Text>
                <Text style={{ color: 'rgba(200,200,200,0.6)', fontSize: 10, marginTop: 4, lineHeight: 15 }}>
                  批准国防科工委提交的重大武器装备研发项目，提升国防现代化水平。
                </Text>
              </View>
              {EQUIP_PROJECTS.map(eq => {
                const done = launchedProjects.has(eq.id);
                const canDo = (save.fundBalance ?? 0) >= eq.cost && !done;
                const typeColor = EQUIP_COLORS[eq.type] ?? '#666';
                return (
                  <View key={eq.id} style={{ backgroundColor: '#12121E', borderWidth: 1, borderColor: done ? '#E8D0A0' : '#1E1E30', overflow: 'hidden' }}>
                    <View style={{ padding: 12, gap: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                        <Text style={{ fontSize: 22 }}>{eq.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: done ? '#E8D0A0' : '#ddd' }}>{eq.name}</Text>
                            <View style={{ backgroundColor: typeColor, paddingHorizontal: 4, paddingVertical: 1 }}>
                              <Text style={{ fontSize: 8, color: '#fff' }}>{eq.type}</Text>
                            </View>
                          </View>
                          <Text style={{ fontSize: 10, color: 'rgba(200,200,200,0.6)', marginTop: 3, lineHeight: 14 }}>{eq.desc}</Text>
                          <View style={{ flexDirection: 'row', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: 9, color: '#E8D0A0', backgroundColor: 'rgba(200,160,80,0.12)', paddingHorizontal: 5, paddingVertical: 2 }}>投资 ¥{formatMoney(eq.cost)}</Text>
                            <Text style={{ fontSize: 9, color: '#FF8080', backgroundColor: 'rgba(200,80,80,0.12)', paddingHorizontal: 5, paddingVertical: 2 }}>安全+{eq.securityBonus}</Text>
                            <Text style={{ fontSize: 9, color: '#7EC8E3', backgroundColor: 'rgba(80,150,200,0.12)', paddingHorizontal: 5, paddingVertical: 2 }}>研发周期 {eq.period}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    {!done && (
                      <Pressable
                        onPress={() => void handleEquip(eq)}
                        disabled={!canDo || acting}
                        style={{ paddingVertical: 10, alignItems: 'center', backgroundColor: canDo ? '#7B0026' : '#222' }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>
                          {acting ? '立项中…' : canDo ? `▶ 批准立项（¥${formatMoney(eq.cost)}）` : '经费不足'}
                        </Text>
                      </Pressable>
                    )}
                    {done && (
                      <View style={{ paddingVertical: 8, alignItems: 'center', backgroundColor: 'rgba(232,208,160,0.08)' }}>
                        <Text style={{ color: '#E8D0A0', fontSize: 10 }}>✓ 已立项，研发周期 {eq.period}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          )}

          {/* ── 战区管理 Tab ── */}
          {tab === 'theater' && (
            <>
              <View style={{ backgroundColor: '#0D2035', padding: 12, marginBottom: 10 }}>
                <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2, marginBottom: 4 }}>中枢军委 · 战区体制</Text>
                <Text style={{ color: '#fff', fontSize: 12, lineHeight: 18 }}>
                  根据中枢军委命令，全国划分为东、南、西、北、中五大战区，实行军委——战区——部队的作战指挥体制。
                </Text>
              </View>

              {/* 五大战区列表 */}
              {THEATER_COMMANDS.map(tc => {
                const isSelected = selectedTheater === tc.id;
                return (
                  <View key={tc.id} style={{ backgroundColor: '#111827', borderWidth: 1, borderColor: isSelected ? tc.color : '#1e3a5f', marginBottom: 8 }}>
                    {/* 战区头部 */}
                    <Pressable
                      onPress={() => setSelectedTheater(isSelected ? null : tc.id)}
                      style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                    >
                      <View style={{ width: 44, height: 44, backgroundColor: tc.color + '33', borderWidth: 1, borderColor: tc.color, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 22 }}>{tc.icon}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{tc.name}</Text>
                        <Text style={{ color: '#a0b4cc', fontSize: 10, marginTop: 1 }}>司令部：{tc.hq} · {tc.rank}</Text>
                        <Text style={{ color: '#a0b4cc', fontSize: 10 }}>{tc.troops}万人 · 战备率{tc.readiness}%</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 3 }}>
                        <View style={{ height: 6, width: 60, backgroundColor: '#1e3a5f' }}>
                          <View style={{ height: 6, width: `${tc.readiness}%`, backgroundColor: tc.readiness >= 90 ? '#4CAF50' : tc.readiness >= 80 ? '#FF9800' : '#F44336' }} />
                        </View>
                        <Text style={{ color: '#666', fontSize: 10 }}>{isSelected ? '▲' : '▼'}</Text>
                      </View>
                    </Pressable>

                    {/* 展开详情 */}
                    {isSelected && (
                      <View style={{ borderTopWidth: 1, borderTopColor: '#1e3a5f', padding: 12, gap: 10 }}>
                        {/* 领导班子 */}
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', padding: 10 }}>
                            <Text style={{ color: '#a0b4cc', fontSize: 9, letterSpacing: 1, marginBottom: 4 }}>战区司令员</Text>
                            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{tc.commander}</Text>
                            <Text style={{ color: '#a0b4cc', fontSize: 9, marginTop: 2 }}>{tc.rank} · 主持军事工作</Text>
                          </View>
                          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', padding: 10 }}>
                            <Text style={{ color: '#a0b4cc', fontSize: 9, letterSpacing: 1, marginBottom: 4 }}>战区政治委员</Text>
                            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{tc.commissar}</Text>
                            <Text style={{ color: '#a0b4cc', fontSize: 9, marginTop: 2 }}>{tc.rank} · 主持政治工作</Text>
                          </View>
                        </View>

                        {/* 辖区 */}
                        <View style={{ gap: 4 }}>
                          <Text style={{ color: '#a0b4cc', fontSize: 9, letterSpacing: 1 }}>战区辖区</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                            {tc.jurisdiction.map(j => (
                              <View key={j} style={{ backgroundColor: tc.color + '33', borderWidth: 1, borderColor: tc.color, paddingHorizontal: 7, paddingVertical: 2 }}>
                                <Text style={{ color: '#ccc', fontSize: 9 }}>{j}</Text>
                              </View>
                            ))}
                          </View>
                        </View>

                        {/* 作战使命 */}
                        <View style={{ gap: 4 }}>
                          <Text style={{ color: '#a0b4cc', fontSize: 9, letterSpacing: 1 }}>主要作战使命</Text>
                          {tc.missions.map(m => (
                            <View key={m} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <View style={{ width: 4, height: 4, backgroundColor: tc.color }} />
                              <Text style={{ color: '#ccc', fontSize: 10, flex: 1 }}>{m}</Text>
                            </View>
                          ))}
                        </View>

                        {/* 军委指令 */}
                        <View style={{ gap: 6 }}>
                          <Text style={{ color: '#E8D0A0', fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>军委指令</Text>
                          {THEATER_ACTIONS.map(action => {
                            const doneKey = `${tc.id}_${action.id}`;
                            const done = theaterActionDone.has(doneKey);
                            const canAfford = action.cost === 0 || (save.fundBalance ?? 0) >= action.cost;
                            return (
                              <Pressable
                                key={action.id}
                                onPress={async () => {
                                  if (done || acting) return;
                                  if (!canAfford) { showResult(`⚠️ 经费不足，需要 ¥${formatMoney(action.cost)}`); return; }
                                  setActing(true);
                                  const updates: Record<string, number> = { meritPoints: (save.meritPoints ?? 0) + action.meritReward };
                                  if (action.cost > 0) updates.fundBalance = Math.max(0, (save.fundBalance ?? 0) - action.cost);
                                  await updateGameSave(updates);
                                  setTheaterActionDone(prev => new Set(prev).add(doneKey));
                                  setActing(false);
                                  showResult(`${action.icon} 对${tc.name}执行「${action.label}」· 安全+${action.securityBonus} · 政绩+${action.meritReward}`);
                                }}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: done ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: done ? '#333' : tc.color + '66', padding: 10, opacity: done ? 0.6 : 1 }}
                              >
                                <Text style={{ fontSize: 18 }}>{action.icon}</Text>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ color: done ? '#666' : '#fff', fontSize: 11, fontWeight: '600' }}>{action.label}</Text>
                                  <Text style={{ color: '#888', fontSize: 9, marginTop: 2 }}>{action.desc}</Text>
                                  {action.cost > 0 && (
                                    <Text style={{ color: '#a0b4cc', fontSize: 9, marginTop: 1 }}>消耗：¥{formatMoney(action.cost)} · 政绩+{action.meritReward}</Text>
                                  )}
                                </View>
                                {done ? (
                                  <Text style={{ color: '#4CAF50', fontSize: 10 }}>✓</Text>
                                ) : (
                                  <Text style={{ color: tc.color, fontSize: 16 }}>›</Text>
                                )}
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          )}

        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {!!result && (
        <View style={{ position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: '#1A1A2E', borderWidth: 1, borderColor: '#E8D0A0', padding: 12, alignItems: 'center' }}>
          <Text style={{ color: '#E8D0A0', fontWeight: '700', fontSize: 13 }}>{result}</Text>
        </View>
      )}
    </View>
  );
}
```

<a id="srcappappmilitarytsx"></a>
## `src/app/(app)/military.tsx`

```tsx
// 国家军事力量页面
// 省部级（10级）以上可查看；副院理（13级）可提交军费建议
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';

// ── 军种图标与颜色 ──
const BRANCH_STYLE: Record<string, { icon: string; color: string; bg: string }> = {
  陆军: { icon: '🪖', color: '#2d5016', bg: '#E8F5E9' },
  海军: { icon: '⚓', color: '#0D2C5E', bg: '#E3F2FD' },
  空军: { icon: '✈️', color: '#1A237E', bg: '#E8EAF6' },
  火箭军: { icon: '🚀', color: '#7B1FA2', bg: '#F3E5F5' },
  战略支援部队: { icon: '📡', color: '#4E342E', bg: '#EFEBE9' },
  联勤保障部队: { icon: '🛡️', color: '#1B5E20', bg: '#F1F8E9' },
};

// 军事力量数据（基于存档ID哈希，保证稳定随机）
function seededRand(seed: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const norm = Math.abs(hash) / 2147483647;
  return Math.round(min + norm * (max - min));
}

interface MilitaryBranch {
  name: string;
  personnel: number;      // 万人
  equipment: number;      // 装备完好率%
  combatReadiness: number; // 战备等级%
  budget: number;         // 年度预算（亿元）
}

function buildMilitaryData(saveId: string): MilitaryBranch[] {
  return [
    {
      name: '陆军',
      personnel: seededRand(saveId + 'land_p', 80, 100),
      equipment: seededRand(saveId + 'land_e', 75, 92),
      combatReadiness: seededRand(saveId + 'land_c', 80, 95),
      budget: seededRand(saveId + 'land_b', 3000, 4500),
    },
    {
      name: '海军',
      personnel: seededRand(saveId + 'navy_p', 22, 32),
      equipment: seededRand(saveId + 'navy_e', 78, 95),
      combatReadiness: seededRand(saveId + 'navy_c', 82, 95),
      budget: seededRand(saveId + 'navy_b', 2000, 3000),
    },
    {
      name: '空军',
      personnel: seededRand(saveId + 'air_p', 25, 35),
      equipment: seededRand(saveId + 'air_e', 80, 96),
      combatReadiness: seededRand(saveId + 'air_c', 82, 96),
      budget: seededRand(saveId + 'air_b', 2500, 3500),
    },
    {
      name: '火箭军',
      personnel: seededRand(saveId + 'rocket_p', 10, 16),
      equipment: seededRand(saveId + 'rocket_e', 90, 99),
      combatReadiness: seededRand(saveId + 'rocket_c', 90, 99),
      budget: seededRand(saveId + 'rocket_b', 1800, 2800),
    },
    {
      name: '战略支援部队',
      personnel: seededRand(saveId + 'stra_p', 8, 14),
      equipment: seededRand(saveId + 'stra_e', 85, 98),
      combatReadiness: seededRand(saveId + 'stra_c', 85, 98),
      budget: seededRand(saveId + 'stra_b', 1200, 2000),
    },
    {
      name: '联勤保障部队',
      personnel: seededRand(saveId + 'log_p', 12, 18),
      equipment: seededRand(saveId + 'log_e', 80, 93),
      combatReadiness: seededRand(saveId + 'log_c', 78, 92),
      budget: seededRand(saveId + 'log_b', 800, 1400),
    },
  ];
}

// 战略核力量（独立面板）
function buildNuclearData(saveId: string) {
  return {
    icbm: seededRand(saveId + 'nuke_icbm', 200, 350),   // 洲际弹道导弹（枚）
    slbm: seededRand(saveId + 'nuke_slbm', 60, 100),    // 潜射弹道导弹（枚）
    warheads: seededRand(saveId + 'nuke_wh', 300, 500), // 战略核弹头（枚）
    readiness: seededRand(saveId + 'nuke_r', 88, 99),   // 战备完好率%
  };
}

// 小型进度条
function MiniBar({ value, color }: { value: number; color: string }) {
  const pct = Math.min(100, Math.max(0, value));
  const barColor = pct >= 85 ? '#2a7a3b' : pct >= 65 ? '#e67e22' : '#C82829';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ flex: 1, height: 5, backgroundColor: '#E5E5E5' }}>
        <View style={{ width: `${pct}%`, height: 5, backgroundColor: barColor }} />
      </View>
      <Text style={{ fontSize: 10, color: barColor, fontWeight: '700', minWidth: 30, textAlign: 'right' }}>
        {pct}%
      </Text>
    </View>
  );
}

export default function MilitaryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save } = useGame();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggestionText, setSuggestionText] = useState('');
  const [feedback, setFeedback] = useState('');

  if (!save) return null;

  const rl = save.rankLevel;

  // 仅10级以上可进入
  if (rl < 10) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F4F1', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <StatusBar style="light" backgroundColor="#0D1F35" />
        <Text style={{ fontSize: 32, marginBottom: 16 }}>🔒</Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#2B4B6F', marginBottom: 8 }}>权限不足</Text>
        <Text style={{ fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20 }}>
          国家军事力量属于高度机密信息，仅省委书记（10级）以上职位可查阅
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#2B4B6F' }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>返回</Text>
        </Pressable>
      </View>
    );
  }

  const branches = buildMilitaryData(save.id);
  const nuclear = buildNuclearData(save.id);
  const totalPersonnel = branches.reduce((s, b) => s + b.personnel, 0);
  const totalBudget = branches.reduce((s, b) => s + b.budget, 0);
  const avgReadiness = Math.round(branches.reduce((s, b) => s + b.combatReadiness, 0) / branches.length);

  // 权限说明（根据实际职级动态显示）
  const permLabel = rl >= 15 ? '党和国家最高领导人（最高指挥权）'
    : rl === 14 ? '国政院院理（军委副主席·全面指挥权）'
    : rl === 13 ? '国政院副院理（军委委员·建议权）'
    : rl === 12 ? '国政院部长（国防联络权）'
    : rl === 11 ? '省委书记（动员配合权）'
    : '省长/副省长（地方配合权）';

  const handleSubmitSuggestion = () => {
    if (!suggestionText.trim()) return;
    setFeedback(`✅ 军费建议已提交至中枢军委，待审议（+10 政绩）`);
    setSuggestionText('');
    setShowSuggestion(false);
    setTimeout(() => setFeedback(''), 4000);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0D1F35' }}>
      <StatusBar style="light" backgroundColor="#0D1F35" />

      {/* 顶栏 */}
      <View style={{ paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: '#a0b4cc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>中枢军事委员会 · 机密</Text>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 1 }}>国家军事力量</Text>
          </View>
          <View style={{ backgroundColor: 'rgba(255,0,0,0.15)', borderWidth: 1, borderColor: '#C82829', paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ color: '#ff6666', fontSize: 9, fontWeight: '700', letterSpacing: 1 }}>绝密</Text>
          </View>
        </View>

        {/* 当前权限徽章 */}
        <View style={{ marginTop: 10, backgroundColor: 'rgba(255,255,255,0.07)', padding: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 11, color: '#a0b4cc' }}>当前权限：</Text>
          <Text style={{ fontSize: 11, color: '#FFD700', fontWeight: '700' }}>{permLabel}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: '#F5F4F1' }} contentInsetAdjustmentBehavior="automatic">

        {/* 总体概览 */}
        <View style={{ backgroundColor: '#0D1F35', padding: 14, marginBottom: 10 }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2, marginBottom: 10 }}>总体概况</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { label: '总兵力', value: `${totalPersonnel}万人`, color: '#FFD700' },
              { label: '国防预算', value: `${totalBudget}亿/年`, color: '#90CAF9' },
              { label: '平均战备', value: `${avgReadiness}%`, color: avgReadiness >= 85 ? '#81C784' : '#FF8A65' },
            ].map(item => (
              <View key={item.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', padding: 10, alignItems: 'center' }}>
                <Text style={{ color: item.color, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{item.value}</Text>
                <Text style={{ color: '#a0b4cc', fontSize: 9, marginTop: 3 }}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 反馈条 */}
        {feedback ? (
          <View style={{ backgroundColor: '#e8f5e9', borderBottomWidth: 1, borderBottomColor: '#c8e6c9', padding: 10, marginBottom: 6 }}>
            <Text style={{ color: '#2a7a3b', fontSize: 12, fontWeight: '600' }}>{feedback}</Text>
          </View>
        ) : null}

        {/* 各军种面板 */}
        <View style={{ padding: 14, gap: 10 }}>
          {branches.map(branch => {
            const style = BRANCH_STYLE[branch.name] ?? { icon: '🔰', color: '#333', bg: '#F5F5F5' };
            const isExp = expanded === branch.name;
            return (
              <Pressable
                key={branch.name}
                onPress={() => setExpanded(isExp ? null : branch.name)}
                style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: isExp ? style.color : '#DDD', overflow: 'hidden' }}
              >
                {/* 军种头部 */}
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 }}>
                  <View style={{ backgroundColor: style.bg, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 20 }}>{style.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: style.color }}>{branch.name}</Text>
                    <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>兵力 {branch.personnel} 万人</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={{ backgroundColor: branch.combatReadiness >= 85 ? '#e8f5e9' : '#fff3e0', paddingHorizontal: 7, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: branch.combatReadiness >= 85 ? '#2a7a3b' : '#e67e22' }}>
                        {branch.combatReadiness}%
                      </Text>
                    </View>
                    <Text style={{ fontSize: 9, color: '#aaa', marginTop: 2 }}>战备率</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: '#aaa' }}>{isExp ? '▲' : '▼'}</Text>
                </View>

                {/* 展开详情 */}
                {isExp && (
                  <View style={{ borderTopWidth: 1, borderTopColor: '#F0EEEA', padding: 12, gap: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 10, color: '#555' }}>年度预算</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#2B4B6F' }}>{branch.budget} 亿元</Text>
                    </View>
                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                        <Text style={{ fontSize: 10, color: '#555' }}>装备完好率</Text>
                      </View>
                      <MiniBar value={branch.equipment} color={style.color} />
                    </View>
                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                        <Text style={{ fontSize: 10, color: '#555' }}>战备完好率</Text>
                      </View>
                      <MiniBar value={branch.combatReadiness} color={style.color} />
                    </View>
                  </View>
                )}
              </Pressable>
            );
          })}

          {/* 战略核力量（独立面板，略微敏感说明） */}
          <View style={{ backgroundColor: '#0D1F35', borderWidth: 1, borderColor: '#C82829', padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Text style={{ fontSize: 18 }}>☢️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>战略核力量</Text>
                <Text style={{ color: '#a0b4cc', fontSize: 9, marginTop: 2 }}>最高机密 · 仅供参阅</Text>
              </View>
              <View style={{ backgroundColor: '#C82829', paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>TOP SECRET</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { label: '洲际弹道导弹', value: `${nuclear.icbm} 枚` },
                { label: '潜射弹道导弹', value: `${nuclear.slbm} 枚` },
                { label: '战略核弹头', value: `${nuclear.warheads} 枚` },
              ].map(item => (
                <View key={item.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', padding: 8, alignItems: 'center' }}>
                  <Text style={{ color: '#FFD700', fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{item.value}</Text>
                  <Text style={{ color: '#a0b4cc', fontSize: 8, marginTop: 3, textAlign: 'center' }}>{item.label}</Text>
                </View>
              ))}
            </View>
            <View style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 10, color: '#a0b4cc' }}>核弹头战备完好率</Text>
                <Text style={{ fontSize: 10, color: '#FFD700', fontWeight: '700' }}>{nuclear.readiness}%</Text>
              </View>
              <View style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <View style={{ width: `${nuclear.readiness}%`, height: 5, backgroundColor: '#FFD700' }} />
              </View>
            </View>
          </View>

          {/* 军费建议（副院理13级+专属） */}
          {rl >= 13 && (
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#9FA8DA', padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <View style={{ backgroundColor: '#3949AB', paddingHorizontal: 7, paddingVertical: 2 }}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>副院理专属</Text>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#2B4B6F' }}>提交军费建议</Text>
              </View>
              <Text style={{ fontSize: 11, color: '#666', lineHeight: 18, marginBottom: 10 }}>
                作为国政院副院理，您可向中枢军委提交国防预算建议。建议将纳入年度审议，对政绩有正向影响。
              </Text>
              {!showSuggestion ? (
                <Pressable
                  onPress={() => setShowSuggestion(true)}
                  style={{ backgroundColor: '#3949AB', paddingVertical: 11, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>✍️ 撰写军费建议</Text>
                </Pressable>
              ) : (
                <View style={{ gap: 8 }}>
                  <TextInput
                    multiline
                    numberOfLines={4}
                    value={suggestionText}
                    onChangeText={setSuggestionText}
                    placeholder="请输入军费预算建议（如：增加火箭军战略威慑能力预算，建议年度增幅不低于8%…）"
                    placeholderTextColor="#aaa"
                    style={{
                      borderWidth: 1, borderColor: '#9FA8DA',
                      padding: 10, fontSize: 13, color: '#222',
                      textAlignVertical: 'top', minHeight: 90,
                    }}
                  />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                      onPress={() => { setShowSuggestion(false); setSuggestionText(''); }}
                      style={{ flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: '#CCC', alignItems: 'center' }}
                    >
                      <Text style={{ color: '#666', fontSize: 12 }}>取消</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleSubmitSuggestion}
                      disabled={!suggestionText.trim()}
                      style={{ flex: 2, paddingVertical: 10, backgroundColor: suggestionText.trim() ? '#3949AB' : '#CCC', alignItems: 'center' }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>提交至军委审议</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* 中枢军委主席特权（如果有该兼职） */}
          {(save.concurrentPosts ?? []).includes('military_chairman') && (
            <View style={{ backgroundColor: '#1a0a00', borderWidth: 1, borderColor: '#FFD700', padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Text style={{ fontSize: 20 }}>🌟</Text>
                <View>
                  <Text style={{ color: '#FFD700', fontSize: 13, fontWeight: '700' }}>中枢军委主席权限</Text>
                  <Text style={{ color: '#a0b4cc', fontSize: 10 }}>最高军事指挥权</Text>
                </View>
              </View>
              <View style={{ gap: 8 }}>
                {[
                  { icon: '📊', label: '下达年度战备指令', desc: '提升全军战备等级 +5%，政绩 +20' },
                  { icon: '🎖️', label: '晋升高级将领', desc: '任命大区级军官，影响军队士气' },
                  { icon: '💰', label: '批复国防预算', desc: '审批军费分配方案，增强军备' },
                ].map((cmd, i) => (
                  <Pressable
                    key={i}
                    onPress={() => {
                      setFeedback(`✅ 已执行：${cmd.label}（${cmd.desc.split('，')[0]}）`);
                      setTimeout(() => setFeedback(''), 4000);
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,215,0,0.08)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)', padding: 10 }}
                  >
                    <Text style={{ fontSize: 20 }}>{cmd.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#FFD700', fontSize: 12, fontWeight: '700' }}>{cmd.label}</Text>
                      <Text style={{ color: '#a0b4cc', fontSize: 10, marginTop: 2 }}>{cmd.desc}</Text>
                    </View>
                    <Text style={{ color: '#FFD700', fontSize: 14 }}>›</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

        </View>
      </ScrollView>
    </View>
  );
}
```

<a id="srcappappministrytsx"></a>
## `src/app/(app)/ministry.tsx`

```tsx
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { MINISTRY_POOL, gameDaysToDate, formatMoney, formatFund } from '@/types/game';
import type { PlayerSave } from '@/types/game';

// 国家级指标策略行动池
const NATIONAL_POLICIES: Record<string, { id: string; label: string; cost: number; desc: string; effect: Partial<Record<'gdp' | 'livelihood' | 'ecology' | 'business' | 'security', number>>; meritReward: number }[]> = {
  'GDP经济': [
    { id: 'n1', label: '推进供给侧结构性改革', cost: 50, desc: '优化产业结构，提升全要素生产率', effect: { gdp: 3 }, meritReward: 8 },
    { id: 'n2', label: '发布营商环境改善方案', cost: 40, desc: '降低市场准入门槛，激发市场活力', effect: { gdp: 2, business: 2 }, meritReward: 6 },
    { id: 'n3', label: '出台稳增长一揽子政策', cost: 80, desc: '财政政策+货币政策协同发力', effect: { gdp: 5 }, meritReward: 12 },
  ],
  '民生保障': [
    { id: 'n4', label: '全国就业优先政策', cost: 60, desc: '扩大就业容量，提升居民收入', effect: { livelihood: 4 }, meritReward: 10 },
    { id: 'n5', label: '推进基本公共服务均等化', cost: 70, desc: '缩小城乡差距，保障基本民生', effect: { livelihood: 3 }, meritReward: 8 },
    { id: 'n6', label: '健全社会保障体系', cost: 50, desc: '完善养老、医疗保险制度', effect: { livelihood: 2 }, meritReward: 6 },
  ],
  '生态文明': [
    { id: 'n7', label: '碳达峰碳中和行动方案', cost: 80, desc: '推动绿色低碳转型，完成双碳目标', effect: { ecology: 5 }, meritReward: 12 },
    { id: 'n8', label: '全国生态保护红线划定', cost: 60, desc: '保护生物多样性，守住生态底线', effect: { ecology: 3 }, meritReward: 8 },
    { id: 'n9', label: '污染防治攻坚战', cost: 70, desc: '系统治理大气、水、土壤污染', effect: { ecology: 4 }, meritReward: 10 },
  ],
  '营商环境': [
    { id: 'n10', label: '清理不合理政商壁垒', cost: 50, desc: '打破地方保护主义，统一大市场', effect: { business: 4 }, meritReward: 10 },
    { id: 'n11', label: '数字政务改革', cost: 40, desc: '提升行政效能，实现"一网通办"', effect: { business: 3 }, meritReward: 7 },
    { id: 'n12', label: '知识产权强国建设', cost: 60, desc: '完善知识产权保护体系，激励创新', effect: { business: 3, gdp: 1 }, meritReward: 8 },
  ],
  '社会治安': [
    { id: 'n13', label: '扫黑除恶专项整治', cost: 60, desc: '打击有组织犯罪，维护社会稳定', effect: { security: 5 }, meritReward: 12 },
    { id: 'n14', label: '完善公共安全应急体系', cost: 50, desc: '提升重大突发事件应对能力', effect: { security: 3 }, meritReward: 8 },
    { id: 'n15', label: '加强网络安全综合治理', cost: 40, desc: '防范网络违法犯罪，保护数据安全', effect: { security: 2 }, meritReward: 5 },
  ],
  '外交事务': [
    { id: 'n16', label: '推进多边贸易合作', cost: 60, desc: '主导区域合作框架，扩大朋友圈', effect: { gdp: 2, business: 2 }, meritReward: 8 },
    { id: 'n17', label: '构建人类命运共同体倡议', cost: 80, desc: '深化南南合作，提升国际影响力', effect: { business: 3 }, meritReward: 10 },
    { id: 'n18', label: '主办国际重要论坛', cost: 50, desc: '展示大国形象，争取国际话语权', effect: { gdp: 1, livelihood: 1 }, meritReward: 6 },
  ],
  '国家安全': [
    { id: 'n19', label: '国防科技创新工程', cost: 80, desc: '推进自主创新，提升战略威慑力', effect: { security: 5 }, meritReward: 15 },
    { id: 'n20', label: '维权护权专项行动', cost: 60, desc: '坚决捍卫国家主权和领土完整', effect: { security: 4 }, meritReward: 12 },
  ],
};

// 各部委下设办公室模板 + 独立编制人员（与玩家下属体系完全独立）
type MinistryStaff = { name: string; title: string; level: 'head' | 'deputy' | 'staff' };
type MinistryOffice = { name: string; headTitle: string; duty: string; staff: MinistryStaff[] };

const MINISTRY_OFFICES: Record<string, MinistryOffice[]> = {
  'GDP经济': [
    { name: '综合发展司', headTitle: '司长', duty: '统筹全国经济发展规划',
      staff: [{ name: '张宏远', title: '司长', level: 'head' }, { name: '李思成', title: '副司长', level: 'deputy' }, { name: '王立群', title: '副司长', level: 'deputy' }] },
    { name: '产业政策司', headTitle: '司长', duty: '推进产业结构调整升级',
      staff: [{ name: '陈博文', title: '司长', level: 'head' }, { name: '刘晓燕', title: '副司长', level: 'deputy' }] },
    { name: '数字经济司', headTitle: '司长', duty: '引导数字经济与实体经济融合',
      staff: [{ name: '孙志远', title: '司长', level: 'head' }, { name: '周磊', title: '副司长', level: 'deputy' }] },
    { name: '财务与预算处', headTitle: '处长', duty: '负责部委年度预算编制',
      staff: [{ name: '吴建国', title: '处长', level: 'head' }, { name: '赵晓梅', title: '副处长', level: 'deputy' }] },
  ],
  '民生保障': [
    { name: '社会保障司', headTitle: '司长', duty: '统筹城乡社会保障政策',
      staff: [{ name: '林德义', title: '司长', level: 'head' }, { name: '杨春梅', title: '副司长', level: 'deputy' }, { name: '黄志强', title: '副司长', level: 'deputy' }] },
    { name: '就业促进司', headTitle: '司长', duty: '推动就业政策落地见效',
      staff: [{ name: '马国华', title: '司长', level: 'head' }, { name: '钱思远', title: '副司长', level: 'deputy' }] },
    { name: '基层民生处', headTitle: '处长', duty: '直接对接基层群众诉求',
      staff: [{ name: '朱明辉', title: '处长', level: 'head' }, { name: '许丽华', title: '副处长', level: 'deputy' }] },
    { name: '政策法规处', headTitle: '处长', duty: '负责民生相关法规研制',
      staff: [{ name: '何昌盛', title: '处长', level: 'head' }, { name: '郑思华', title: '副处长', level: 'deputy' }] },
  ],
  '生态文明': [
    { name: '生态保护司', headTitle: '司长', duty: '推进自然保护区建设管理',
      staff: [{ name: '宋建民', title: '司长', level: 'head' }, { name: '冯志远', title: '副司长', level: 'deputy' }] },
    { name: '大气环境司', headTitle: '司长', duty: '统筹大气污染防治攻坚',
      staff: [{ name: '韩世杰', title: '司长', level: 'head' }, { name: '蒋玉清', title: '副司长', level: 'deputy' }] },
    { name: '资源节约处', headTitle: '处长', duty: '推动能源节约与循环利用',
      staff: [{ name: '唐建华', title: '处长', level: 'head' }, { name: '曾志强', title: '副处长', level: 'deputy' }] },
    { name: '环境监测处', headTitle: '处长', duty: '全国环境质量数据汇总分析',
      staff: [{ name: '彭国梁', title: '处长', level: 'head' }, { name: '邓思远', title: '副处长', level: 'deputy' }] },
  ],
  '营商环境': [
    { name: '市场准入司', headTitle: '司长', duty: '降低市场准入壁垒',
      staff: [{ name: '卢建中', title: '司长', level: 'head' }, { name: '苏明远', title: '副司长', level: 'deputy' }] },
    { name: '公平竞争司', headTitle: '司长', duty: '维护市场公平竞争秩序',
      staff: [{ name: '廖国建', title: '司长', level: 'head' }, { name: '姜思成', title: '副司长', level: 'deputy' }] },
    { name: '政务服务处', headTitle: '处长', duty: '推进"一网通办"改革',
      staff: [{ name: '谭志华', title: '处长', level: 'head' }, { name: '崔晓东', title: '副处长', level: 'deputy' }] },
    { name: '中小企业处', headTitle: '处长', duty: '扶持中小企业发展',
      staff: [{ name: '侯建国', title: '处长', level: 'head' }, { name: '史思远', title: '副处长', level: 'deputy' }] },
  ],
  '社会治安': [
    { name: '治安管理司', headTitle: '司长', duty: '统筹全国治安防控体系',
      staff: [{ name: '龙世明', title: '司长', level: 'head' }, { name: '贺国栋', title: '副司长', level: 'deputy' }] },
    { name: '应急管理司', headTitle: '司长', duty: '重大突发事件协调处置',
      staff: [{ name: '尹建军', title: '司长', level: 'head' }, { name: '潘志远', title: '副司长', level: 'deputy' }] },
    { name: '反诈中心处', headTitle: '处长', duty: '打击电信网络诈骗',
      staff: [{ name: '邹国华', title: '处长', level: 'head' }, { name: '石思思', title: '副处长', level: 'deputy' }] },
    { name: '网络安全处', headTitle: '处长', duty: '维护国家网络安全',
      staff: [{ name: '熊建明', title: '处长', level: 'head' }, { name: '雷志远', title: '副处长', level: 'deputy' }] },
  ],
  '外交事务': [
    { name: '亚洲事务司', headTitle: '司长', duty: '主管周边国家外交事务',
      staff: [{ name: '秦国华', title: '司长', level: 'head' }, { name: '武志成', title: '副司长', level: 'deputy' }] },
    { name: '多边合作司', headTitle: '司长', duty: '参与国际多边机制谈判',
      staff: [{ name: '孟建华', title: '司长', level: 'head' }, { name: '江思远', title: '副司长', level: 'deputy' }] },
    { name: '礼宾处', headTitle: '处长', duty: '承办国际外交接待礼仪',
      staff: [{ name: '叶国明', title: '处长', level: 'head' }, { name: '魏志华', title: '副处长', level: 'deputy' }] },
    { name: '信息资讯处', headTitle: '处长', duty: '对外新闻发布与信息管理',
      staff: [{ name: '丁建中', title: '处长', level: 'head' }, { name: '沈思远', title: '副处长', level: 'deputy' }] },
  ],
  '国家安全': [
    { name: '战略规划司', headTitle: '司长', duty: '统筹国家安全战略规划',
      staff: [{ name: '付国强', title: '司长', level: 'head' }, { name: '范志远', title: '副司长', level: 'deputy' }, { name: '康建华', title: '副司长', level: 'deputy' }] },
    { name: '科技装备司', headTitle: '司长', duty: '推进国防科技自主创新',
      staff: [{ name: '任世杰', title: '司长', level: 'head' }, { name: '袁志成', title: '副司长', level: 'deputy' }] },
    { name: '综合协调处', headTitle: '处长', duty: '协调各系统安全事务',
      staff: [{ name: '方建国', title: '处长', level: 'head' }, { name: '汪思远', title: '副处长', level: 'deputy' }] },
    { name: '保密管理处', headTitle: '处长', duty: '国家机密保护与管理',
      staff: [{ name: '柳志华', title: '处长', level: 'head' }, { name: '严国栋', title: '副处长', level: 'deputy' }] },
  ],
};

// 全局指标颜色
const INDEX_COLOR = { gdp: '#2B4B6F', livelihood: '#2a7a3b', ecology: '#1a6b3a', business: '#7B5E2A', security: '#7a1a1a' };
const INDEX_LABEL = { gdp: 'GDP增速', livelihood: '民生保障', ecology: '生态文明', business: '营商环境', security: '社会治安' };

type MinTab = 'policy' | 'building' | 'staff' | 'events' | 'scitech' | 'discipline';

// 重要工作事项配置
const MINISTRY_EVENTS = [
  {
    key: 'state_council_meeting',
    icon: '🏛️',
    title: '国政院常务会议',
    subtitle: '国政院 · 每季度定期召开',
    desc: '主持国政院常务会议，汇报分管领域工作进展，审议重要政策文件，协调跨部门重大事项。',
    cooldownDays: 90,
    cost: 0,
    meritReward: 300,
    favorReward: 8,
    effects: { gdp: 2 },
    badge: '核心会议',
    badgeColor: '#B71C1C',
  },
  {
    key: 'press_conference',
    icon: '🎙️',
    title: '部长记者会',
    subtitle: '新闻中心 · 两会期间举行',
    desc: '出席全国两会部长通道记者会，就国内外媒体关注的政策热点问题作权威解答，展示施政成果。',
    cooldownDays: 60,
    cost: 0,
    meritReward: 150,
    favorReward: 5,
    effects: { livelihood: 2, business: 1 },
    badge: '媒体曝光',
    badgeColor: '#E65100',
  },
  {
    key: 'national_work_conf',
    icon: '📋',
    title: '全国工作会议',
    subtitle: '部委主办 · 全国省市代表参加',
    desc: '召开全国系统工作会议，部署本年度重点工作任务，传达中央指示精神，推动政策落地执行。',
    cooldownDays: 120,
    cost: 20,
    meritReward: 250,
    favorReward: 5,
    effects: { gdp: 1, livelihood: 1, ecology: 1, business: 1, security: 1 },
    badge: '全国部署',
    badgeColor: '#1565C0',
  },
  {
    key: 'special_inspection',
    icon: '🔍',
    title: '专项督察行动',
    subtitle: '派驻督察组 · 下沉地方督导',
    desc: '组织专项督察组赴重点省市，对重大政策落实情况实施全面督导检查，形成督察整改闭环。',
    cooldownDays: 60,
    cost: 30,
    meritReward: 180,
    favorReward: 3,
    effects: { security: 3, livelihood: 1 },
    badge: '监督落实',
    badgeColor: '#212121',
  },
  {
    key: 'legislative_review',
    icon: '⚖️',
    title: '立法审查工作',
    subtitle: '与议政院联动 · 部门规章制定',
    desc: '推进本部门职责范围内的立法和规章修订工作，提交全国议政院常委会审议，完善法规制度体系。',
    cooldownDays: 90,
    cost: 20,
    meritReward: 200,
    favorReward: 5,
    effects: { business: 2 },
    badge: '制度建设',
    badgeColor: '#4527A0',
  },
  {
    key: 'budget_meeting',
    icon: '💰',
    title: '年度预算分配会议',
    subtitle: '财政部协同 · 全国预算分配',
    desc: '与财政部协商年度专项预算资金分配方案，向各省市下达政策资金，推动重大项目资金到位。',
    cooldownDays: 120,
    cost: 0,
    meritReward: 180,
    favorReward: 4,
    effects: { gdp: 2 },
    badge: '资金调配',
    badgeColor: '#1B5E20',
  },
  {
    key: 'national_survey',
    icon: '🚌',
    title: '全国调研视察',
    subtitle: '深入基层 · 掌握第一手情况',
    desc: '赴典型省市开展专项调研，走访基层单位和群众，收集一线政策执行反馈，形成高质量调研报告。',
    cooldownDays: 30,
    cost: 10,
    meritReward: 80,
    favorReward: 3,
    effects: { livelihood: 1 },
    badge: '基层视察',
    badgeColor: '#2E7D32',
  },
  {
    key: 'intl_cooperation',
    icon: '🌐',
    title: '对外合作与交流',
    subtitle: '外交协同 · 国际组织参与',
    desc: '参加相关领域国际会议或双多边会谈，推动签署合作协议，拓展对外合作空间，提升国际影响力。',
    cooldownDays: 60,
    cost: 20,
    meritReward: 150,
    favorReward: 4,
    effects: { business: 2, gdp: 1 },
    badge: '对外开放',
    badgeColor: '#006064',
  },
] as const;
type EventKey = typeof MINISTRY_EVENTS[number]['key'];

// ── 副院理以上：只读部委年度工作总览 ──────────────────────────────
// 参照现实政府考核维度：GDP、民生、生态、营商、安全 对应5类关注焦点
const FOCUS_SCORE_MAP: Record<string, { label: string; color: string }> = {
  'GDP经济':  { label: 'GDP增速', color: '#2B4B6F' },
  '民生保障': { label: '民生改善', color: '#2a7a3b' },
  '生态文明': { label: '生态达标', color: '#5a8a3b' },
  '营商环境': { label: '营商评分', color: '#7B5E2A' },
  '社会治安': { label: '治安指数', color: '#8B1A1A' },
  '外交事务': { label: '外交评分', color: '#4B3B8C' },
  '国家安全': { label: '安全指数', color: '#8B1A1A' },
};

function buildAnnualRecord(
  m: typeof MINISTRY_POOL[number],
  save: PlayerSave,
  idx: number,
) {
  // 用各指标和部委焦点确定性地生成"完成率"
  const focusValue = (() => {
    const f = m.focus;
    if (f === 'GDP经济')  return save.cityGdp;
    if (f === '民生保障') return save.cityLivelihood;
    if (f === '生态文明') return save.cityEcology;
    if (f === '营商环境') return save.cityBusiness;
    return save.securityIndex;
  })();
  // 加上稳定扰动（deterministic by idx）
  const noise = ((idx * 13 + 7) % 15) - 7;          // ±7
  const completionRate = Math.min(100, Math.max(30, Math.round(focusValue * 0.7 + noise + 25)));
  const staffFillRate  = Math.min(100, Math.max(70, 88 + ((idx * 7) % 12)));
  const grade = completionRate >= 85 ? '优秀' : completionRate >= 70 ? '良好' : completionRate >= 55 ? '合格' : '待改善';
  const gradeColor = completionRate >= 85 ? '#2a7a3b' : completionRate >= 70 ? '#7B5E2A' : completionRate >= 55 ? '#2B4B6F' : '#C82829';
  return { completionRate, staffFillRate, grade, gradeColor };
}

function MinistryReadonlyView({
  save,
  router,
}: { save: PlayerSave; router: ReturnType<typeof useRouter> }) {
  const insets = useSafeAreaInsets();
  const [focusFilter, setFocusFilter] = useState('全部');
  const [expanded, setExpanded]       = useState<string | null>(null);

  const focusList = ['全部', ...Array.from(new Set(MINISTRY_POOL.map(m => m.focus)))];
  const filtered  = focusFilter === '全部'
    ? MINISTRY_POOL
    : MINISTRY_POOL.filter(m => m.focus === focusFilter);

  const currentYear = Math.floor(save.gameDays / 365) + 1;

  // 汇总统计
  const allRecords = MINISTRY_POOL.map((m, i) => buildAnnualRecord(m, save, i));
  const avgCompletion = Math.round(allRecords.reduce((s, r) => s + r.completionRate, 0) / allRecords.length);
  const excellentCount = allRecords.filter(r => r.grade === '优秀').length;
  const poorCount      = allRecords.filter(r => r.grade === '待改善').length;

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F4F0' }}>
      {/* 顶栏 */}
      <View style={{ backgroundColor: '#0D1F35', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: '#a0b4cc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(160,180,204,0.6)', fontSize: 9, letterSpacing: 3 }}>国政院 · 部委治国</Text>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>🏛️ 部委年度工作总览</Text>
            <Text style={{ color: '#a0b4cc', fontSize: 10, marginTop: 2 }}>第 {currentYear} 年度 · {save.rankName} · 只读模式</Text>
          </View>
        </View>
        {/* 汇总条 */}
        <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
          {[
            { label: '平均完成率', value: `${avgCompletion}%`, color: '#FFD700' },
            { label: '优秀部委',   value: `${excellentCount}个`, color: '#90EE90' },
            { label: '待改善',     value: `${poorCount}个`,     color: '#FF8888' },
            { label: '部委总数',   value: `${MINISTRY_POOL.length}个`, color: '#a0b4cc' },
          ].map(item => (
            <View key={item.label} style={{ flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', paddingVertical: 8 }}>
              <Text style={{ color: item.color, fontWeight: '700', fontSize: 13 }}>{item.value}</Text>
              <Text style={{ color: 'rgba(160,180,204,0.7)', fontSize: 8, marginTop: 2 }}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 领域筛选 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' }} contentContainerStyle={{ paddingHorizontal: 6 }}>
        {focusList.map(f => (
          <Pressable
            key={f}
            onPress={() => setFocusFilter(f)}
            style={{ paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: focusFilter === f ? '#0D1F35' : 'transparent' }}
          >
            <Text style={{ fontSize: 11, fontWeight: focusFilter === f ? '700' : '400', color: focusFilter === f ? '#0D1F35' : '#888' }}>
              {f}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 12, gap: 8 }}>
        {filtered.map((m, rawIdx) => {
          // 找到在原数组的idx以确保扰动一致
          const idx = MINISTRY_POOL.findIndex(x => x.name === m.name);
          const rec = buildAnnualRecord(m, save, idx);
          const isOpen = expanded === m.name;
          const focusMeta = FOCUS_SCORE_MAP[m.focus] ?? { label: m.focus, color: '#555' };

          return (
            <Pressable
              key={m.name}
              onPress={() => setExpanded(isOpen ? null : m.name)}
              style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: isOpen ? '#0D1F35' : '#D8D8D8' }}
            >
              {/* 卡片头 */}
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 }}>
                <Text style={{ fontSize: 22 }}>{m.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D2D44' }}>{m.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <View style={{ backgroundColor: focusMeta.color + '22', paddingHorizontal: 5, paddingVertical: 1 }}>
                      <Text style={{ fontSize: 9, color: focusMeta.color, fontWeight: '600' }}>{focusMeta.label}</Text>
                    </View>
                    <View style={{ backgroundColor: rec.gradeColor + '22', paddingHorizontal: 5, paddingVertical: 1 }}>
                      <Text style={{ fontSize: 9, color: rec.gradeColor, fontWeight: '700' }}>{rec.grade}</Text>
                    </View>
                  </View>
                </View>
                {/* 完成率数字 */}
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: rec.gradeColor }}>{rec.completionRate}%</Text>
                  <Text style={{ fontSize: 8, color: '#aaa' }}>年度完成率</Text>
                </View>
              </View>

              {/* 进度条（始终显示） */}
              <View style={{ height: 4, backgroundColor: '#F0F0F0' }}>
                <View style={{ width: `${rec.completionRate}%`, height: 4, backgroundColor: rec.gradeColor }} />
              </View>

              {/* 展开详情 */}
              {isOpen && (
                <View style={{ padding: 12, gap: 10 }}>
                  {/* 人员情况 */}
                  <View style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 10, color: '#555', fontWeight: '600' }}>人员编制到位率</Text>
                      <Text style={{ fontSize: 10, color: rec.staffFillRate >= 95 ? '#2a7a3b' : '#E08030' }}>
                        {rec.staffFillRate}%{rec.staffFillRate < 95 ? '（补员中）' : '（满编）'}
                      </Text>
                    </View>
                    <View style={{ height: 4, backgroundColor: '#EEE', borderRadius: 2 }}>
                      <View style={{ width: `${rec.staffFillRate}%`, height: 4, backgroundColor: rec.staffFillRate >= 95 ? '#2a7a3b' : '#E08030', borderRadius: 2 }} />
                    </View>
                  </View>

                  {/* 年度工作完成情况 */}
                  <View style={{ backgroundColor: '#F5F4F1', padding: 10, gap: 6 }}>
                    <Text style={{ fontSize: 10, color: '#555', fontWeight: '600' }}>第 {currentYear} 年度工作报告摘要</Text>
                    <Text style={{ fontSize: 10, color: '#666', lineHeight: 16 }}>
                      {rec.completionRate >= 85
                        ? `${m.name}本年度超额完成各项工作指标，在${focusMeta.label}方面表现突出，获国政院年度通报表扬。`
                        : rec.completionRate >= 70
                        ? `${m.name}本年度基本完成工作任务，${focusMeta.label}指标稳中有升，整体运行有序。`
                        : rec.completionRate >= 55
                        ? `${m.name}本年度完成主要指标，但${focusMeta.label}方面仍有提升空间，需加强工作部署。`
                        : `${m.name}本年度部分核心指标未达预期，在${focusMeta.label}上存在明显短板，国政院已要求整改。`
                      }
                    </Text>
                  </View>

                  {/* 提示：只读 */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 9, color: '#aaa' }}>ℹ️ 副院理以上级别不直接兼管部委，如需干预请通过总理办公室下达指示</Text>
                  </View>
                </View>
              )}
            </Pressable>
          );
        })}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

// ── 科技委内嵌数据 ─────────────────────────────────────────────────────
const SCITECH_DIRS = [
  { id: 'ai',      icon: '🤖', name: '人工智能与大数据',   cost: 500,  merit: 20, gdpD: 3, bizD: 4, ecoD: 0 },
  { id: 'space',   icon: '🚀', name: '航天与深空探测',     cost: 800,  merit: 30, gdpD: 2, bizD: 2, ecoD: 0 },
  { id: 'bio',     icon: '🧬', name: '生物医药与生命科学', cost: 400,  merit: 18, gdpD: 1, bizD: 2, ecoD: 2 },
  { id: 'energy',  icon: '⚡', name: '新能源与氢能技术',   cost: 350,  merit: 16, gdpD: 2, bizD: 1, ecoD: 5 },
  { id: 'chip',    icon: '💻', name: '芯片与集成电路',     cost: 600,  merit: 25, gdpD: 4, bizD: 3, ecoD: 0 },
  { id: 'quantum', icon: '⚛️', name: '量子科技',           cost: 700,  merit: 28, gdpD: 2, bizD: 2, ecoD: 0 },
];

const CORRUPT_CHARGES = [
  '涉嫌违规收受礼品', '滥用职权干预工程项目', '违规使用公款消费',
  '在下属企业违规持股', '利用职权为亲属谋利', '收受贿赂批准违规项目',
  '私设"小金库"挪用公款', '违规插手干预司法案件',
];

export default function MinistryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, isLoading, updateGameSave } = useGame();
  const [acting, setActing] = useState(false);
  const [result, setResult] = useState<string>('');
  const [daysLeft, setDaysLeft] = useState(0);
  const [activeTab, setActiveTab] = useState<MinTab>('policy');
  const [expandedOffice, setExpandedOffice] = useState<string | null>(null);
  // 重要工作事项冷却追踪（key -> 最近执行游戏天）
  const [eventLastDays, setEventLastDays] = useState<Record<EventKey, number>>({} as Record<EventKey, number>);
  const [actingEvent, setActingEvent] = useState<EventKey | null>(null);

  useFocusEffect(useCallback(() => {
    if (!save) return;
    const rotateDay = save.lastMinistryRotateDay ?? 0;
    const remaining = Math.max(0, 365 - (save.gameDays - rotateDay));
    setDaysLeft(remaining);
  }, [save]));

  if (isLoading || !save) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color="#C82829" /></View>;
  }
  if (save.rankLevel < 12) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 15, color: '#888', textAlign: 'center' }}>晋升至国政院部长级（级别12）后解锁此页面</Text>
      </View>
    );
  }

  // ── rank13+（副院理以上）：只读查看各部委年度工作情况 ──
  if (save.rankLevel >= 13) {
    return <MinistryReadonlyView save={save} router={router} />;
  }

  const ministryName = save.cityName || '国政院部委';
  const foundMinistry = MINISTRY_POOL.find(m => m.name === ministryName);
  const ministryInfo = foundMinistry ?? { name: ministryName, focus: 'GDP经济' as 'GDP经济', emoji: '🏛️' as '🏛️' };
  const policiesForMinistry = NATIONAL_POLICIES[ministryInfo.focus] ?? NATIONAL_POLICIES['GDP经济'];
  const officesForMinistry = MINISTRY_OFFICES[ministryInfo.focus] ?? MINISTRY_OFFICES['GDP经济'];

  // 国家级五大指标（复用城市指标字段）
  const nationalIndices = [
    { key: 'gdp', value: save.cityGdp },
    { key: 'livelihood', value: save.cityLivelihood },
    { key: 'ecology', value: save.cityEcology },
    { key: 'business', value: save.cityBusiness },
    { key: 'security', value: save.securityIndex },
  ] as { key: keyof typeof INDEX_LABEL; value: number }[];

  const handleExecutePolicy = async (policy: typeof policiesForMinistry[0]) => {
    if (acting || save.fundBalance < policy.cost) return;
    setActing(true);
    // 每次实施政策固定奖励政绩 200
    const MERIT_REWARD = 200;
    const updates: Partial<Parameters<typeof updateGameSave>[0]> = {
      fundBalance: save.fundBalance - policy.cost,
      meritPoints: save.meritPoints + MERIT_REWARD,
    };
    if (policy.effect.gdp) updates.cityGdp = Math.min(100, save.cityGdp + policy.effect.gdp);
    if (policy.effect.livelihood) updates.cityLivelihood = Math.min(100, save.cityLivelihood + policy.effect.livelihood);
    if (policy.effect.ecology) updates.cityEcology = Math.min(100, save.cityEcology + policy.effect.ecology);
    if (policy.effect.business) updates.cityBusiness = Math.min(100, save.cityBusiness + policy.effect.business);
    if (policy.effect.security) updates.securityIndex = Math.min(100, save.securityIndex + policy.effect.security);
    await updateGameSave(updates);
    setResult(`✅ 已颁布《${policy.label}》，获政绩 +${MERIT_REWARD}`);
    setActing(false);
    setTimeout(() => setResult(''), 3000);
  };

  const handleExecuteEvent = async (ev: typeof MINISTRY_EVENTS[number]) => {
    if (!save || actingEvent) return;
    const lastDay = eventLastDays[ev.key] ?? 0;
    const remaining = ev.cooldownDays - (save.gameDays - lastDay);
    if (remaining > 0 && lastDay > 0) {
      setResult(`⏳ 冷却中，还需 ${remaining} 天`);
      setTimeout(() => setResult(''), 2500);
      return;
    }
    if (ev.cost > 0 && save.fundBalance < ev.cost) {
      setResult('⚠️ 专项经费不足');
      setTimeout(() => setResult(''), 2500);
      return;
    }
    setActingEvent(ev.key);
    const updates: Partial<Parameters<typeof updateGameSave>[0]> = {
      meritPoints: save.meritPoints + ev.meritReward,
      bossFavor: Math.min(100, save.bossFavor + ev.favorReward),
    };
    if (ev.cost > 0) updates.fundBalance = save.fundBalance - ev.cost;
    if ('gdp' in ev.effects && ev.effects.gdp) updates.cityGdp = Math.min(100, save.cityGdp + ev.effects.gdp);
    if ('livelihood' in ev.effects && ev.effects.livelihood) updates.cityLivelihood = Math.min(100, save.cityLivelihood + ev.effects.livelihood);
    if ('ecology' in ev.effects && ev.effects.ecology) updates.cityEcology = Math.min(100, save.cityEcology + ev.effects.ecology);
    if ('business' in ev.effects && ev.effects.business) updates.cityBusiness = Math.min(100, save.cityBusiness + ev.effects.business);
    if ('security' in ev.effects && ev.effects.security) updates.securityIndex = Math.min(100, save.securityIndex + ev.effects.security);
    await updateGameSave(updates);
    setEventLastDays(prev => ({ ...prev, [ev.key]: save.gameDays }));
    setActingEvent(null);
    const costText = ev.cost > 0 ? ` · 经费-${ev.cost}万` : '';
    setResult(`✅ 完成【${ev.title}】，政绩+${ev.meritReward}，上司好感+${ev.favorReward}${costText}`);
    setTimeout(() => setResult(''), 4000);
  };
  const allMinistryStaff = officesForMinistry.flatMap(o => o.staff);
  const headCount   = allMinistryStaff.filter(s => s.level === 'head').length;
  const deputyCount = allMinistryStaff.filter(s => s.level === 'deputy').length;
  const staffCount  = allMinistryStaff.filter(s => s.level === 'staff').length;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F4F4F0' }} contentInsetAdjustmentBehavior="automatic">
      <StatusBar style="light" backgroundColor="#0D1F35" />
      {/* 页眉 */}
      <View style={{ backgroundColor: '#0D1F35', padding: 18, paddingTop: insets.top + 8 }}>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, letterSpacing: 3 }}>国政院 · 部委治国</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <Text style={{ fontSize: 32 }}>{ministryInfo.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 20 }}>{ministryName}</Text>
            <Text style={{ color: '#a0b4cc', fontSize: 12, marginTop: 2 }}>
              {save.playerName}  ·  {ministryName}部长  ·  任期第 {save.tenureYears} 年
            </Text>
          </View>
          {/* 返回主页 */}
          <Pressable
            onPress={() => router.replace('/(app)/home')}
            style={{ backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
          >
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>🏠 主页</Text>
          </Pressable>
        </View>
        {/* 部委轮换倒计时 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, backgroundColor: 'rgba(255,255,255,0.08)', padding: 10 }}>
          <Text style={{ color: '#ffcc80', fontSize: 12 }}>🔄 部委轮换倒计时：</Text>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{daysLeft} 天</Text>
          <Text style={{ color: '#a0b4cc', fontSize: 10, marginLeft: 'auto' }}>轮换后继续积累政绩</Text>
        </View>
      </View>

      {/* 资金余额 */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 14, backgroundColor: '#2B4B6F', borderBottomWidth: 3, borderBottomColor: '#C82829' }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10 }}>专项经费余额</Text>
          <Text style={{ color: '#FFD700', fontWeight: '700', fontSize: 16, marginTop: 2 }}>
            {formatFund(save.fundBalance)}
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10 }}>本届政绩积累</Text>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18, marginTop: 2 }}>{save.meritPoints}</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10 }}>晋升所需</Text>
          <Text style={{ color: '#FF8A65', fontWeight: '700', fontSize: 18, marginTop: 2 }}>{save.requiredMerit}</Text>
        </View>
      </View>

      {/* 全国五大指标 */}
      <View style={{ padding: 14, gap: 8 }}>
        <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, fontWeight: '700', marginBottom: 2 }}>全国发展指标</Text>
        {nationalIndices.map(({ key, value }) => (
          <View key={key}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
              <Text style={{ fontSize: 12, color: '#333', fontWeight: '600' }}>{INDEX_LABEL[key]}</Text>
              <Text style={{ fontSize: 12, color: INDEX_COLOR[key], fontWeight: '700' }}>{value.toFixed(1)}</Text>
            </View>
            <View style={{ height: 6, backgroundColor: '#E0E0E0', borderRadius: 3 }}>
              <View style={{ width: `${value}%`, height: 6, backgroundColor: INDEX_COLOR[key], borderRadius: 3 }} />
            </View>
          </View>
        ))}
      </View>

      {/* 分割线 */}
      <View style={{ height: 1, backgroundColor: '#D0D0C8', marginHorizontal: 14 }} />

      {/* 标签切换 */}
      <View style={{ flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#D0D0C8', marginHorizontal: 14, marginTop: 10 }}>
        {([
          { key: 'policy',     label: '施政命令' },
          { key: 'events',     label: '重要工作' },
          { key: 'building',   label: '部委大楼' },
          { key: 'staff',      label: '部委人员' },
          { key: 'scitech',    label: '🔬 科技委' },
          { key: 'discipline', label: '⚖️ 纪检委' },
        ] as { key: MinTab; label: string }[]).map(tab => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={{
              flex: 1, paddingVertical: 10, alignItems: 'center',
              borderBottomWidth: activeTab === tab.key ? 2 : 0,
              borderBottomColor: '#C82829',
              marginBottom: -2,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: activeTab === tab.key ? '700' : '400', color: activeTab === tab.key ? '#C82829' : '#777' }}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── 施政命令 ── */}
      {activeTab === 'policy' && (
        <View style={{ padding: 14, gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, fontWeight: '700' }}>施政重点：{ministryInfo.focus}</Text>
            <View style={{ backgroundColor: '#0D1F35', paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ color: '#fff', fontSize: 9 }}>共 {policiesForMinistry.length} 项政策</Text>
            </View>
          </View>
          {policiesForMinistry.map(policy => {
            const canAct = save.fundBalance >= policy.cost;
            return (
              <View key={policy.id} style={{ borderWidth: 1, borderColor: '#D1D1CF', backgroundColor: '#fff' }}>
                <View style={{ padding: 12, gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D2D44', flex: 1 }}>{policy.label}</Text>
                    <View style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 }}>
                      <Text style={{ fontSize: 9, color: '#7B5E2A', fontWeight: '600' }}>政绩 +200</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, color: '#777', lineHeight: 16 }}>{policy.desc}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {Object.entries(policy.effect).map(([k, v]) => (
                      <View key={k} style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, color: '#2B4B6F' }}>{INDEX_LABEL[k as keyof typeof INDEX_LABEL]} +{v}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <Pressable
                  onPress={() => handleExecutePolicy(policy)}
                  disabled={!canAct || acting}
                  style={{ backgroundColor: canAct ? '#C82829' : '#ccc', paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
                    {acting ? '颁布中…' : `颁布政令（${policy.cost} 万元）`}
                  </Text>
                  {!canAct && <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>经费不足</Text>}
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {/* ── 部委大楼 ── */}
      {activeTab === 'building' && (
        <View style={{ padding: 14, gap: 10 }}>
          {/* 大楼概况 */}
          <View style={{ backgroundColor: '#0D1F35', padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Text style={{ fontSize: 28 }}>🏛️</Text>
              <View>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{ministryName}办公大楼</Text>
                <Text style={{ color: '#a0b4cc', fontSize: 11 }}>北京市西城区 · 国政院部委区</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { label: '建筑面积', value: '3.2万㎡' },
                { label: '楼层', value: '18层' },
                { label: '启用年份', value: '2003年' },
              ].map(item => (
                <View key={item.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', padding: 8, alignItems: 'center' }}>
                  <Text style={{ color: '#a0b4cc', fontSize: 9 }}>{item.label}</Text>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, marginTop: 2 }}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 下设办公室 */}
          <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, fontWeight: '700', marginTop: 4 }}>下设机构</Text>
          {officesForMinistry.map((office, i) => (
            <View key={i} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <View style={{ backgroundColor: '#0D1F35', paddingHorizontal: 6, paddingVertical: 3, marginTop: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 9 }}>{office.headTitle}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D2D44' }}>{office.name}</Text>
                  <Text style={{ fontSize: 11, color: '#777', marginTop: 3, lineHeight: 16 }}>{office.duty}</Text>
                </View>
                {/* 机构人数（随机模拟编制规模）*/}
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 11, color: '#C82829', fontWeight: '700' }}>{20 + i * 8}人</Text>
                  <Text style={{ fontSize: 9, color: '#aaa' }}>编制</Text>
                </View>
              </View>
            </View>
          ))}

          {/* 配套设施 */}
          <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, fontWeight: '700', marginTop: 4 }}>配套设施</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {['🏟️ 大会议室', '📚 资料室', '🖥️ 信息中心', '🍽️ 食堂', '🚗 公务车队', '🏋️ 职工活动室'].map(item => (
              <View key={item} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ fontSize: 12, color: '#555' }}>{item}</Text>
              </View>
            ))}
          </View>

          {/* 当前任命档案 */}
          <View style={{ borderWidth: 1, borderColor: '#D1D1CF', backgroundColor: '#fff', padding: 12, gap: 6, marginTop: 4 }}>
            <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, fontWeight: '700', marginBottom: 4 }}>当前任命档案</Text>
            <Text style={{ fontSize: 12, color: '#333' }}>任命部委：<Text style={{ fontWeight: '700', color: '#2B4B6F' }}>{ministryName}</Text></Text>
            <Text style={{ fontSize: 12, color: '#333' }}>任命日期：<Text style={{ color: '#555' }}>{gameDaysToDate(save.lastMinistryRotateDay || save.lastRankDay)}</Text></Text>
            <Text style={{ fontSize: 12, color: '#333' }}>施政重点：<Text style={{ color: '#555' }}>{ministryInfo.focus}</Text></Text>
            <Text style={{ fontSize: 12, color: '#C82829' }}>距下次轮换：<Text style={{ fontWeight: '700' }}>{daysLeft} 天</Text></Text>
          </View>
        </View>
      )}

      {/* ── 重要工作 ── */}
      {activeTab === 'events' && (
        <View style={{ padding: 14, gap: 10 }}>
          <View style={{ backgroundColor: '#E8EAF6', borderWidth: 1, borderColor: '#9FA8DA', padding: 10, marginBottom: 4 }}>
            <Text style={{ fontSize: 11, color: '#283593', fontWeight: '700', marginBottom: 2 }}>📌 部长级重要工作事项</Text>
            <Text style={{ fontSize: 11, color: '#333', lineHeight: 17 }}>
              以下为部长级核心职务工作，每项有独立冷却周期。完成后获得政绩、上司好感及指标加成，是区别于施政命令的高层次活动。
            </Text>
          </View>

          {MINISTRY_EVENTS.map(ev => {
            const lastDay = eventLastDays[ev.key] ?? 0;
            const cooldownRemaining = lastDay > 0 ? Math.max(0, ev.cooldownDays - (save.gameDays - lastDay)) : 0;
            const isReady = cooldownRemaining === 0;
            const canAfford = ev.cost === 0 || save.fundBalance >= ev.cost;
            const isActing = actingEvent === ev.key;

            return (
              <View key={ev.key} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: isReady ? '#9FA8DA' : '#DDD', overflow: 'hidden' }}>
                {/* 头部 */}
                <View style={{ backgroundColor: isReady ? '#E8EAF6' : '#F5F5F5', padding: 12, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 22 }}>{ev.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D2D44' }}>{ev.title}</Text>
                        <View style={{ backgroundColor: ev.badgeColor + '22', borderWidth: 1, borderColor: ev.badgeColor, paddingHorizontal: 5, paddingVertical: 1 }}>
                          <Text style={{ fontSize: 9, color: ev.badgeColor, fontWeight: '700' }}>{ev.badge}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{ev.subtitle}</Text>
                    </View>
                    {/* 奖励信息 */}
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <Text style={{ fontSize: 12, color: '#7B5E2A', fontWeight: '700' }}>政绩 +{ev.meritReward}</Text>
                      <Text style={{ fontSize: 10, color: '#2a7a3b' }}>好感 +{ev.favorReward}</Text>
                      {ev.cost > 0 && <Text style={{ fontSize: 10, color: '#C82829' }}>费用 -{ev.cost}万</Text>}
                    </View>
                  </View>

                  <Text style={{ fontSize: 11, color: '#666', lineHeight: 17, marginTop: 4 }}>{ev.desc}</Text>

                  {/* 指标效果 */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 }}>
                    {Object.entries(ev.effects).map(([k, v]) => v ? (
                      <View key={k} style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, color: INDEX_COLOR[k as keyof typeof INDEX_COLOR] ?? '#555' }}>
                          {INDEX_LABEL[k as keyof typeof INDEX_LABEL] ?? k} +{v}
                        </Text>
                      </View>
                    ) : null)}
                  </View>

                  {/* 冷却状态 */}
                  {!isReady && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <View style={{ flex: 1, height: 4, backgroundColor: '#E0E0E0' }}>
                        <View style={{
                          height: 4,
                          backgroundColor: '#7986CB',
                          width: `${((ev.cooldownDays - cooldownRemaining) / ev.cooldownDays) * 100}%`,
                        }} />
                      </View>
                      <Text style={{ fontSize: 10, color: '#888' }}>冷却剩余 {cooldownRemaining} 天</Text>
                    </View>
                  )}
                </View>

                {/* 执行按钮 */}
                <Pressable
                  onPress={() => void handleExecuteEvent(ev)}
                  disabled={!isReady || !canAfford || !!actingEvent}
                  style={{ backgroundColor: !isReady ? '#9E9E9E' : !canAfford ? '#E57373' : '#3949AB', paddingVertical: 10, alignItems: 'center' }}
                  android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                >
                  {isActing
                    ? <ActivityIndicator size="small" color="#FFF" />
                    : <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>
                        {!isReady ? `⏳ 冷却中（${cooldownRemaining}天）` : !canAfford ? '经费不足' : `▶ 执行此项工作`}
                      </Text>
                  }
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {/* ── 部委人员 ── */}
      {activeTab === 'staff' && (
        <View style={{ padding: 14, gap: 10 }}>
          {/* 人员统计 */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { label: '司/处级正职', count: headCount, color: '#C82829' },
              { label: '司/处级副职', count: deputyCount, color: '#2B4B6F' },
              { label: '科员及以下', count: staffCount, color: '#7B5E2A' },
            ].map(item => (
              <View key={item.label} style={{ flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: item.color }}>{item.count}</Text>
                <Text style={{ fontSize: 9, color: '#888', marginTop: 2, textAlign: 'center' }}>{item.label}</Text>
              </View>
            ))}
          </View>

          <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, fontWeight: '700' }}>各机构在岗人员</Text>

          {/* 各办公室展开列表 */}
          {officesForMinistry.map((office) => {
            const isExpanded = expandedOffice === office.name;
            return (
              <View key={office.name} style={{ borderWidth: 1, borderColor: '#D1D1CF', backgroundColor: '#fff' }}>
                {/* 机构行（可点击展开） */}
                <Pressable
                  onPress={() => setExpandedOffice(isExpanded ? null : office.name)}
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 }}
                >
                  <View style={{ backgroundColor: '#0D1F35', paddingHorizontal: 6, paddingVertical: 3 }}>
                    <Text style={{ color: '#fff', fontSize: 9 }}>{office.headTitle}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D2D44' }}>{office.name}</Text>
                    <Text style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}>{office.duty}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Text style={{ fontSize: 11, color: '#C82829', fontWeight: '700' }}>{office.staff.length} 人</Text>
                    <Text style={{ fontSize: 10, color: '#aaa' }}>{isExpanded ? '▲ 收起' : '▼ 展开'}</Text>
                  </View>
                </Pressable>

                {/* 展开：人员明细 */}
                {isExpanded && (
                  <View style={{ borderTopWidth: 1, borderTopColor: '#F0EEEA' }}>
                    {office.staff.map((s, si) => {
                      const levelColor = s.level === 'head' ? '#C82829' : s.level === 'deputy' ? '#2B4B6F' : '#7B5E2A';
                      const levelLabel = s.level === 'head' ? '正职' : s.level === 'deputy' ? '副职' : '科员';
                      return (
                        <View key={si} style={{
                          flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, gap: 8,
                          borderBottomWidth: si < office.staff.length - 1 ? 1 : 0, borderBottomColor: '#F5F5F5',
                          backgroundColor: si % 2 === 0 ? '#FAFAFA' : '#fff',
                        }}>
                          <View style={{ backgroundColor: levelColor, paddingHorizontal: 5, paddingVertical: 2, minWidth: 30, alignItems: 'center' }}>
                            <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>{levelLabel}</Text>
                          </View>
                          <Text style={{ flex: 1, fontSize: 13, color: '#222', fontWeight: '600' }}>{s.name}</Text>
                          <Text style={{ fontSize: 11, color: '#888' }}>{s.title}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}

          <Text style={{ fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 4, lineHeight: 17 }}>
            以上人员为部委独立编制，由组织部统一调配，独立于您的个人班底
          </Text>
        </View>
      )}

      {/* ── 科技委 Tab ── */}
      {activeTab === 'scitech' && (
        <View style={{ padding: 14, gap: 10 }}>
          <View style={{ backgroundColor: '#2B4B6F', padding: 14 }}>
            <Text style={{ color: 'rgba(180,210,255,0.6)', fontSize: 9, letterSpacing: 2 }}>国家科学技术委员会</Text>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, marginTop: 3 }}>🔬 科技战略投入</Text>
            <Text style={{ color: 'rgba(180,210,255,0.85)', fontSize: 11, marginTop: 4, lineHeight: 16 }}>
              确定科研方向，拨付专项科研经费，推动核心技术攻关与成果转化。
            </Text>
          </View>
          <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderWidth: 1, borderColor: '#D0D0D0', padding: 12, gap: 10 }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: '#888', fontSize: 9 }}>科技投入总额</Text>
              <Text style={{ color: '#2B4B6F', fontWeight: '700', fontSize: 14 }}>¥{formatMoney(save.sciTechInvestTotal ?? 0)}</Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#EEE' }} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: '#888', fontSize: 9 }}>专项经费</Text>
              <Text style={{ color: '#C82829', fontWeight: '700', fontSize: 14 }}>¥{formatMoney(save.fundBalance)}</Text>
            </View>
          </View>
          {SCITECH_DIRS.map(dir => {
            const canAct = !acting && save.fundBalance >= dir.cost;
            return (
              <View key={dir.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D0D0D0', overflow: 'hidden' }}>
                <View style={{ padding: 12, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 22 }}>{dir.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D2D44' }}>{dir.name}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                      <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, color: '#2B4B6F' }}>经费 ¥{formatMoney(dir.cost)}</Text>
                      </View>
                      <View style={{ backgroundColor: '#F0FAF0', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, color: '#2a7a3b' }}>政绩+{dir.merit}</Text>
                      </View>
                      {dir.gdpD > 0 && <View style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 9, color: '#7B5E2A' }}>GDP+{dir.gdpD}</Text></View>}
                      {dir.bizD > 0 && <View style={{ backgroundColor: '#F0F8FF', paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 9, color: '#1565C0' }}>营商+{dir.bizD}</Text></View>}
                      {dir.ecoD > 0 && <View style={{ backgroundColor: '#F0FAF0', paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 9, color: '#2a7a3b' }}>生态+{dir.ecoD}</Text></View>}
                    </View>
                  </View>
                </View>
                <Pressable
                  disabled={!canAct}
                  onPress={async () => {
                    if (!canAct) return;
                    setActing(true);
                    await updateGameSave({
                      fundBalance: save.fundBalance - dir.cost,
                      meritPoints: save.meritPoints + dir.merit,
                      cityGdp: Math.min(100, (save.cityGdp ?? 0) + dir.gdpD),
                      cityBusiness: Math.min(100, (save.cityBusiness ?? 0) + dir.bizD),
                      cityEcology: Math.min(100, (save.cityEcology ?? 0) + dir.ecoD),
                      sciTechInvestTotal: (save.sciTechInvestTotal ?? 0) + dir.cost,
                    });
                    setResult(`✅ 已投入${dir.name}研究，政绩+${dir.merit}`);
                    setActing(false);
                    setTimeout(() => setResult(''), 2500);
                  }}
                  style={{ backgroundColor: canAct ? '#2B4B6F' : '#ccc', paddingVertical: 10, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                    {canAct ? `▶ 拨付科研经费 ¥${formatMoney(dir.cost)}` : '⚠️ 经费不足'}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {/* ── 纪检委 Tab ── */}
      {activeTab === 'discipline' && (
        <View style={{ padding: 14, gap: 10 }}>
          <View style={{ backgroundColor: '#2D1A00', padding: 14 }}>
            <Text style={{ color: 'rgba(255,210,150,0.6)', fontSize: 9, letterSpacing: 2 }}>中枢纪律督察委员会</Text>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, marginTop: 3 }}>⚖️ 反腐纠风行动</Text>
            <Text style={{ color: 'rgba(255,210,150,0.85)', fontSize: 11, marginTop: 4, lineHeight: 16 }}>
              对廉洁指数低的干部立案调查，维护党纪国法，筑牢廉政防线。
            </Text>
          </View>
          {(() => {
            const suspects = (save as unknown as Record<string,unknown>);
            // 模拟5个典型案例（基于save.gameDays种子）
            const cases = CORRUPT_CHARGES.slice(0, 5).map((charge, i) => {
              const seed = (save.gameDays + i * 37) % 100;
              const severity = seed < 20 ? '严重违纪' : seed < 50 ? '一般违纪' : '违规问题';
              const severityColor = seed < 20 ? '#8B0000' : seed < 50 ? '#C82829' : '#7B5E2A';
              const names = ['张某某','李某某','王某某','刘某某','陈某某'];
              const positions = ['省级干部','地厅级','县处级','市委常委','省委委员'];
              return { id: `case-${i}`, name: names[i], position: positions[i], charge, severity, severityColor, seed };
            });
            return cases.map(c => (
              <View key={c.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D0D0D0', overflow: 'hidden' }}>
                <View style={{ padding: 12, gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{c.name} · {c.position}</Text>
                    <View style={{ backgroundColor: c.severityColor, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>{c.severity}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, color: '#555' }}>问题线索：{c.charge}</Text>
                </View>
                <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F0F0F0' }}>
                  <Pressable
                    disabled={acting}
                    onPress={async () => {
                      setActing(true);
                      await updateGameSave({ meritPoints: save.meritPoints + 25, moralValue: Math.min(100, save.moralValue + 3) });
                      setResult(`✅ 已对${c.name}立案调查，政绩+25，廉洁+3`);
                      setActing(false);
                      setTimeout(() => setResult(''), 2500);
                    }}
                    style={{ flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: '#2D1A00' }}
                  >
                    <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>🔍 立案调查</Text>
                  </Pressable>
                  <View style={{ width: 1, backgroundColor: '#F0F0F0' }} />
                  <Pressable
                    disabled={acting}
                    onPress={async () => {
                      setActing(true);
                      await updateGameSave({ meritPoints: save.meritPoints + 10 });
                      setResult(`📋 已对${c.name}予以诫勉谈话，政绩+10`);
                      setActing(false);
                      setTimeout(() => setResult(''), 2500);
                    }}
                    style={{ flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: '#7B5E2A' }}
                  >
                    <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>📋 诫勉谈话</Text>
                  </Pressable>
                </View>
              </View>
            ));
          })()}
        </View>
      )}

      {/* 操作结果提示 */}
      {!!result && (
        <View style={{ position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: '#2a7a3b', padding: 12, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{result}</Text>
        </View>
      )}
    </ScrollView>
  );
}
```

<a id="srcappappmonthlyreporttsx"></a>
## `src/app/(app)/monthly-report.tsx`

```tsx
// 月度工作报告 + 年度KPI设定与考核 + 述职报告（关联职位职能动态化）
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getAllReports, markReportsRead } from '@/db/gameApi';
import type { MonthlyReport } from '@/types/game';
import { RANK_CONFIG } from '@/types/game';

type Tab = 'reports' | 'kpi' | 'debrief';

const DEPT_LABELS: Record<string, string> = {
  police: '公安局', ndrc: '发改委', finance: '财政局',
  urban: '住建局', education: '教育局', health: '卫健委',
  ecology: '生态局', market: '市监局', agriculture: '农业局',
};

// ── 述职报告：根据职位职能动态生成内容结构 ──────────────────────
interface DebriefSection {
  title: string;
  items: string[];
  icon: string;
  color: string;
}

function getDebriefSections(rankLevel: number, rankName: string, cityName: string, save: {
  cityGdp: number; cityLivelihood: number; cityEcology: number; cityBusiness: number;
  meritPoints: number; gameDays: number; tenureYears?: number;
}): DebriefSection[] {
  const year = Math.floor(save.gameDays / 365);
  const tenureYrs = save.tenureYears ?? year;

  // 低级别（乡镇/县级）
  if (rankLevel <= 3) {
    return [
      {
        icon: '📋', color: '#2B4B6F', title: '基本情况',
        items: [
          `本人担任${rankName}以来，已任职满${tenureYrs}年`,
          `负责辖区${cityName}基层治理、党建工作及为民服务`,
          `在上级党委政府正确领导下，圆满完成各项目标任务`,
        ],
      },
      {
        icon: '🏗️', color: '#2a7a3b', title: '主要工作完成情况',
        items: [
          `扎实推进乡村振兴，辖区农业基础设施进一步完善`,
          `开展矛盾纠纷调解工作，有效化解基层信访问题`,
          `完成上级下达的各项社会治安综合治理任务`,
          `切实推进"放管服"改革，提升基层服务群众效能`,
        ],
      },
      {
        icon: '📊', color: '#7B5E2A', title: '主要指标完成情况',
        items: [
          `GDP贡献指数：${save.cityGdp.toFixed(1)}（${save.cityGdp >= 60 ? '达标' : '需加强'}）`,
          `民生满意度：${save.cityLivelihood.toFixed(1)}（${save.cityLivelihood >= 65 ? '群众满意' : '有待提升'}）`,
          `信访诉求处结率：95%以上`,
        ],
      },
      {
        icon: '🔍', color: '#C82829', title: '存在问题与不足',
        items: [
          '基层治理资源有限，部分项目推进进度有待加快',
          '干部队伍建设需进一步强化，个别同志能力尚显不足',
        ],
      },
      {
        icon: '🎯', color: '#2B4B6F', title: '下一步工作打算',
        items: [
          '持续聚焦基层减负，优化行政流程，提高办事效率',
          '强化党建引领，带动辖区经济社会高质量发展',
        ],
      },
    ];
  }

  // 县级干部（rank 4-6）
  if (rankLevel <= 6) {
    return [
      {
        icon: '📋', color: '#2B4B6F', title: '个人基本情况',
        items: [
          `现任${rankName}，在${cityName}任职`,
          `累计任职年限：${tenureYrs}年，工作勤勉、恪尽职守`,
          `政绩分值：${save.meritPoints} 点，综合表现良好`,
        ],
      },
      {
        icon: '💰', color: '#2a7a3b', title: '经济发展成效',
        items: [
          `辖区GDP指数：${save.cityGdp.toFixed(1)}，同比稳中有升`,
          `成功引进重点项目${Math.floor(save.meritPoints / 80)}个，推动县域经济提质增效`,
          `营商环境指数：${save.cityBusiness.toFixed(1)}，持续优化政务服务`,
        ],
      },
      {
        icon: '❤️', color: '#C82829', title: '民生保障工作',
        items: [
          `民生满意度达：${save.cityLivelihood.toFixed(1)}，基本民生得到有效保障`,
          `持续推进教育、医疗、住房等社会事业发展`,
          `切实解决群众急难愁盼问题，信访工作平稳有序`,
        ],
      },
      {
        icon: '🌿', color: '#2a7a3b', title: '生态文明建设',
        items: [
          `生态环境指数：${save.cityEcology.toFixed(1)}，持续改善人居环境`,
          `完成年度节能减排和环境保护目标任务`,
        ],
      },
      {
        icon: '🎯', color: '#7B5E2A', title: '下步工作重点',
        items: [
          '坚持党的全面领导，深入贯彻新发展理念',
          '以高质量发展为主线，推动县域综合实力持续提升',
          '着力保障改善民生，不断增强群众获得感幸福感',
        ],
      },
    ];
  }

  // 市级干部（rank 7-9）
  if (rankLevel <= 9) {
    return [
      {
        icon: '📋', color: '#2B4B6F', title: '任职基本情况',
        items: [
          `现任${rankName}，主政${cityName}`,
          `履职以来，全面统筹经济社会发展各项工作`,
          `政绩积分：${save.meritPoints} 点，综合施政效果显著`,
        ],
      },
      {
        icon: '📈', color: '#2a7a3b', title: '经济发展主要成效',
        items: [
          `全市GDP综合指数：${save.cityGdp.toFixed(1)}，经济保持平稳增长`,
          `招商引资项目${Math.floor(save.meritPoints / 60)}个，实际到位资金持续增长`,
          `营商环境指数：${save.cityBusiness.toFixed(1)}，政务服务效能持续提升`,
          `推进重大基础设施项目建设，城市综合承载力明显增强`,
        ],
      },
      {
        icon: '🏛️', color: '#C82829', title: '社会治理工作',
        items: [
          `民生满意度综合评价：${save.cityLivelihood.toFixed(1)}`,
          '深化"放管服"改革，持续优化营商环境',
          '健全基层治理体系，维护社会大局稳定',
          `信访积案化解率：${Math.min(100, Math.floor(save.cityLivelihood))}%`,
        ],
      },
      {
        icon: '🌿', color: '#2a7a3b', title: '生态环保成效',
        items: [
          `生态环境指数：${save.cityEcology.toFixed(1)}`,
          '统筹推进山水林田湖草一体化保护治理',
          '全面落实河长制、林长制，生态质量持续向好',
        ],
      },
      {
        icon: '⚠️', color: '#7B5E2A', title: '存在问题与下步举措',
        items: [
          '部分领域发展不平衡不充分问题仍较突出',
          '将聚焦重点难点，持续发力补短板强弱项',
          '以高质量发展统领全局，奋力开创新局面',
        ],
      },
    ];
  }

  // 省级干部（rank 10-11）
  if (rankLevel <= 11) {
    return [
      {
        icon: '📋', color: '#2B4B6F', title: '履职情况综述',
        items: [
          `现任${rankName}，主政${cityName}`,
          `全面贯彻党中央决策部署，统筹全省（区）发展大局`,
          `政绩积分：${save.meritPoints} 点`,
        ],
      },
      {
        icon: '📈', color: '#2a7a3b', title: '经济社会发展成效',
        items: [
          `全省GDP综合指数：${save.cityGdp.toFixed(1)}，位次持续提升`,
          `实施重大战略项目${Math.floor(save.meritPoints / 50)}项`,
          `营商环境指数：${save.cityBusiness.toFixed(1)}，跻身全国前列`,
          `新兴产业集群加速壮大，创新驱动态势明显`,
        ],
      },
      {
        icon: '🤝', color: '#C82829', title: '政治生态与党建工作',
        items: [
          '坚定不移推进全面从严治党，风清气正的政治生态加快形成',
          '深化干部队伍建设，选拔任用政治过硬、能力突出的干部',
          '持续推进省级机构改革，推动行政效能进一步提升',
        ],
      },
      {
        icon: '🌿', color: '#2a7a3b', title: '绿色发展与民生保障',
        items: [
          `生态指数：${save.cityEcology.toFixed(1)}，绿色转型步伐加快`,
          `民生满意度：${save.cityLivelihood.toFixed(1)}，群众幸福感持续增强`,
          '教育、医疗、养老等民生事业全面加强',
        ],
      },
      {
        icon: '🎯', color: '#2B4B6F', title: '下步工作思路',
        items: [
          '深入落实党中央战略部署，以改革创新推动高质量发展',
          '加快构建现代化产业体系，提升区域竞争力',
          '全面推进共同富裕，让发展成果更多惠及人民群众',
        ],
      },
    ];
  }

  // 国家级（rank 12-14）
  if (rankLevel === 13) {
    // 国政院副院理
    return [
      {
        icon: '🏛️', color: '#7B0026', title: '履职情况报告',
        items: [
          `现任国政院副院理，分管${cityName}方向重点工作`,
          '协助总理处理日常行政事务，统筹分管领域政策执行',
          `政绩积分：${save.meritPoints} 点，任职以来各项工作稳步推进`,
        ],
      },
      {
        icon: '📈', color: '#2a7a3b', title: '分管领域执行情况',
        items: [
          `统筹推进分管经济领域，综合指数：${save.cityGdp.toFixed(1)}`,
          `主导召开联席协调会议 ${Math.floor(save.meritPoints / 60)} 次，推进政策落实`,
          '加强与各部委沟通衔接，推动重大项目按期落地',
          `营商环境指数：${save.cityBusiness.toFixed(1)}，持续优化政务服务`,
        ],
      },
      {
        icon: '⚖️', color: '#2B4B6F', title: '政治建设情况',
        items: [
          '坚决执行党中央和国政院决策部署，确保政令畅通',
          '扎实开展调研工作，掌握分管领域真实情况',
          '推进干部队伍建设，选用廉洁高效的领导班子',
        ],
      },
      {
        icon: '🌿', color: '#1a5c2e', title: '民生与社会工作',
        items: [
          `民生满意度：${save.cityLivelihood.toFixed(1)}，惠民政策持续加力`,
          `生态指数：${save.cityEcology.toFixed(1)}，绿色发展稳步推进`,
          '关注重点群体，推进基本公共服务均等化',
        ],
      },
      {
        icon: '🎯', color: '#7B0026', title: '下一阶段工作安排',
        items: [
          '持续深化分管领域改革，破除制度性障碍',
          '强化部际协调联动，形成政策合力',
          '做好重大决策风险评估，确保政策平稳实施',
        ],
      },
    ];
  }
  if (rankLevel >= 14) {
    // 国政院院理
    return [
      {
        icon: '🏛️', color: '#C82829', title: '国政院院理工作报告',
        items: [
          '本人主持国政院全面工作，统领行政系统运转',
          '党中央重大决策部署得到有力执行，国家治理效能持续提升',
          `综合政绩积分：${save.meritPoints} 点，各项工作总体达到预期目标`,
        ],
      },
      {
        icon: '📈', color: '#2a7a3b', title: '宏观经济与发展战略',
        items: [
          `全国GDP综合指数：${save.cityGdp.toFixed(1)}，经济运行保持稳中向好态势`,
          `主持推进重大国家战略 ${Math.floor(save.meritPoints / 40)} 项，新发展格局加快构建`,
          '深化供给侧结构性改革，产业结构持续优化升级',
          `营商环境指数：${save.cityBusiness.toFixed(1)}，高水平对外开放格局深入推进`,
        ],
      },
      {
        icon: '🤝', color: '#2B4B6F', title: '政府职能转变与施政',
        items: [
          '推进国政院机构改革，行政效能和服务水平大幅提升',
          `主持召开国政院常务会议 ${Math.floor(save.gameDays / 14)} 次，研究部署重大事项`,
          '持续推进"放管服"改革，市场准入壁垒有效降低',
          '加强预算管理，财政资金使用效率明显提高',
        ],
      },
      {
        icon: '🌿', color: '#1a5c2e', title: '民生保障与社会治理',
        items: [
          `全国民生满意度：${save.cityLivelihood.toFixed(1)}，共同富裕取得积极进展`,
          `生态文明建设指数：${save.cityEcology.toFixed(1)}，美丽中国建设稳步推进`,
          '教育、医疗、养老、住房等民生领域投入持续加大',
          '社会治理体系和治理能力现代化水平全面提升',
        ],
      },
      {
        icon: '🌐', color: '#7B5E2A', title: '国际经济合作与外交配合',
        items: [
          '积极参与全球治理，推动构建开放型世界经济',
          '深化"一带一路"务实合作，国际经济联系更加紧密',
          '妥善应对国际经济环境变化，维护国家发展利益',
        ],
      },
      {
        icon: '🎯', color: '#C82829', title: '下一步施政重点',
        items: [
          '坚持以中国式现代化全面推进强国建设、民族复兴伟业',
          '持续深化重点领域改革，破除高质量发展体制机制障碍',
          '加强政府自身建设，打造廉洁高效的人民政府',
          '统筹发展与安全，确保国家各项事业沿正确方向前进',
        ],
      },
    ];
  }
  // 国政院部长/委主任（rank 12）
  return [
    {
      icon: '🏛️', color: '#2B4B6F', title: '履职情况报告',
      items: [
        `现任${rankName}，全面负责本部委工作`,
        `全面贯彻执行党中央重大决策部署`,
        `政绩积分：${save.meritPoints} 点，履职尽责，成效显著`,
      ],
    },
    {
      icon: '📈', color: '#2a7a3b', title: '国家战略执行情况',
      items: [
        `统筹全国经济社会发展大局，GDP综合指数：${save.cityGdp.toFixed(1)}`,
        `牵头推进重大国家战略${Math.floor(save.meritPoints / 40)}项`,
        `统筹推进高质量发展、高水平安全，新发展格局加快构建`,
        `深化供给侧结构性改革，国家综合实力持续增强`,
      ],
    },
    {
      icon: '⚖️', color: '#C82829', title: '治国理政主要成果',
      items: [
        '持续深化党和国家机构改革，治理效能全面提升',
        `民生满意度：${save.cityLivelihood.toFixed(1)}，共同富裕取得积极进展`,
        `生态文明建设指数：${save.cityEcology.toFixed(1)}，美丽中国建设稳步推进`,
        '依法治国全面推进，社会主义法治体系不断完善',
      ],
    },
    {
      icon: '🌐', color: '#7B5E2A', title: '国际形势应对',
      items: [
        '坚定维护国家主权、安全和发展利益',
        '统筹国内国际两个大局，推动构建人类命运共同体',
        `营商环境指数：${save.cityBusiness.toFixed(1)}，高水平对外开放纵深推进`,
      ],
    },
    {
      icon: '🎯', color: '#2B4B6F', title: '新时期工作展望',
      items: [
        '坚持以中国式现代化全面推进强国建设、民族复兴',
        '持续深化改革，破除制约高质量发展的体制机制障碍',
        '加强党的建设，推动党在新时代新征程上赢得更大胜利',
      ],
    },
  ];
}

export default function MonthlyReportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [tab, setTab] = useState<Tab>('reports');
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [loading, setLoading] = useState(true);

  // KPI编辑
  const [kpiGdp, setKpiGdp] = useState('');
  const [kpiLivelihood, setKpiLivelihood] = useState('');
  const [kpiEcology, setKpiEcology] = useState('');
  const [kpiBusiness, setKpiBusiness] = useState('');
  const [kpiSaved, setKpiSaved] = useState(false);
  // 述职报告打印态
  const [debriefPrinted, setDebriefPrinted] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!save) return;
      setLoading(true);
      // 初始化KPI表单
      setKpiGdp(String(save.kpiGdpTarget || Math.round(save.cityGdp + 5)));
      setKpiLivelihood(String(save.kpiLivelihoodTarget || Math.round(save.cityLivelihood + 5)));
      setKpiEcology(String(save.kpiEcologyTarget || Math.round(save.cityEcology + 5)));
      setKpiBusiness(String(save.kpiBusinessTarget || Math.round(save.cityBusiness + 5)));
      setDebriefPrinted(false);

      getAllReports(save.id).then(data => {
        setReports(data);
        // 标记当月已读
        const monthKey = Math.floor(save.gameDays / 30);
        markReportsRead(save.id, monthKey);
        setLoading(false);
      });
    }, [save])
  );

  const handleSaveKpi = async () => {
    if (!save) return;
    const yr = Math.floor(save.gameDays / 365);
    await updateGameSave({
      kpiGdpTarget: Number(kpiGdp) || 0,
      kpiLivelihoodTarget: Number(kpiLivelihood) || 0,
      kpiEcologyTarget: Number(kpiEcology) || 0,
      kpiBusinessTarget: Number(kpiBusiness) || 0,
      kpiYear: yr,
    });
    setKpiSaved(true);
    setTimeout(() => setKpiSaved(false), 2500);
  };

  if (!save) return null;

  const currentYear = Math.floor(save.gameDays / 365);
  const kpiYear = save.kpiYear ?? 0;
  const kpiSet = kpiYear === currentYear && save.kpiGdpTarget > 0;

  // KPI完成情况
  const kpiResults = [
    { label: 'GDP指数', current: save.cityGdp, target: save.kpiGdpTarget, icon: '📈' },
    { label: '民生满意度', current: save.cityLivelihood, target: save.kpiLivelihoodTarget, icon: '❤️' },
    { label: '生态环境', current: save.cityEcology, target: save.kpiEcologyTarget, icon: '🌿' },
    { label: '营商环境', current: save.cityBusiness, target: save.kpiBusinessTarget, icon: '⚖️' },
  ];

  // 述职报告动态内容
  const rankCfg = RANK_CONFIG[save.rankLevel];
  const debriefSections = getDebriefSections(save.rankLevel, save.rankName, save.cityName, {
    cityGdp: save.cityGdp,
    cityLivelihood: save.cityLivelihood,
    cityEcology: save.cityEcology,
    cityBusiness: save.cityBusiness,
    meritPoints: save.meritPoints,
    gameDays: save.gameDays,
  });
  const debriefTitle = `${save.rankName}述职报告`;
  const debriefSubtitle = `${rankCfg?.department ?? '人民政府'} · ${save.cityName}`;

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      <StatusBar style="light" backgroundColor="#1D3B5E" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#2B4B6F', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 4 }}>
            <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>第 {currentYear} 年</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>工作报告与述职</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10 }}>{save.rankName}</Text>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600', marginTop: 1 }}>{save.cityName}</Text>
          </View>
        </View>
        {/* Tab */}
        <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
          {([
            ['reports', '月度报告'],
            ['kpi',     '年度KPI'],
            ['debrief', '述职报告'],
          ] as [Tab, string][]).map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: tab === key ? '#C82829' : 'transparent' }}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: tab === key ? '700' : '400' }}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#1D3B5E" />
        </View>
      ) : (
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 14, gap: 12 }}>

          {/* ============ 月度工作报告 ============ */}
          {tab === 'reports' && (
            <>
              {reports.length === 0 ? (
                <View style={{ alignItems: 'center', padding: 40 }}>
                  <Text style={{ fontSize: 32, marginBottom: 12 }}>📋</Text>
                  <Text style={{ fontSize: 14, color: '#888', textAlign: 'center' }}>暂无工作报告</Text>
                  <Text style={{ fontSize: 12, color: '#aaa', marginTop: 6, textAlign: 'center' }}>每月推进时间后，各职能部门将自动提交月度报告</Text>
                </View>
              ) : reports.map(r => {
                const deptLabel = DEPT_LABELS[r.deptKey] ?? r.deptKey;
                const hasEffect = r.gdpChange > 0 || r.livelihoodChange > 0 || r.ecologyChange > 0 || r.businessChange > 0;
                return (
                  <View key={r.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: r.isRead ? '#E0E0E0' : '#2196F3', padding: 14 }}>
                    {!r.isRead && (
                      <View style={{ position: 'absolute', top: 10, right: 10, backgroundColor: '#C82829', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>新</Text>
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#D1D1D1' }}>
                        <Text style={{ fontSize: 10, color: '#2B4B6F', fontWeight: '600' }}>{deptLabel}</Text>
                      </View>
                      <Text style={{ fontSize: 10, color: '#aaa' }}>第{r.monthKey}个月</Text>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#2B4B6F', marginBottom: 6 }}>{r.title}</Text>
                    <Text style={{ fontSize: 12, color: '#555', lineHeight: 18, marginBottom: 8 }}>{r.content}</Text>
                    {hasEffect && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {r.gdpChange > 0 && <View style={{ backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontSize: 10, color: '#2a7a3b' }}>GDP +{r.gdpChange.toFixed(1)}</Text></View>}
                        {r.livelihoodChange > 0 && <View style={{ backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontSize: 10, color: '#2a7a3b' }}>民生 +{r.livelihoodChange.toFixed(1)}</Text></View>}
                        {r.ecologyChange > 0 && <View style={{ backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontSize: 10, color: '#2a7a3b' }}>生态 +{r.ecologyChange.toFixed(1)}</Text></View>}
                        {r.businessChange > 0 && <View style={{ backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontSize: 10, color: '#2a7a3b' }}>营商 +{r.businessChange.toFixed(1)}</Text></View>}
                        <View style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontSize: 10, color: '#7A5C00' }}>政绩 +{r.meritReward}</Text></View>
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          )}

          {/* ============ 年度KPI ============ */}
          {tab === 'kpi' && (
            <>
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
                <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '700', letterSpacing: 2, marginBottom: 12 }}>
                  {currentYear > 0 ? `第 ${currentYear} 年度KPI目标设定` : '年度KPI目标设定'}
                </Text>
                {kpiSaved && (
                  <View style={{ backgroundColor: '#e8f5e9', borderWidth: 1, borderColor: '#c8e6c9', padding: 8, marginBottom: 10 }}>
                    <Text style={{ fontSize: 12, color: '#2a7a3b', fontWeight: '600' }}>✓ KPI目标已保存</Text>
                  </View>
                )}
                {([
                  ['GDP指数目标', kpiGdp, setKpiGdp, save.cityGdp],
                  ['民生满意度目标', kpiLivelihood, setKpiLivelihood, save.cityLivelihood],
                  ['生态环境目标', kpiEcology, setKpiEcology, save.cityEcology],
                  ['营商环境目标', kpiBusiness, setKpiBusiness, save.cityBusiness],
                ] as [string, string, (v: string) => void, number][]).map(([label, val, setter, current]) => (
                  <View key={label} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 }}>
                    <Text style={{ fontSize: 12, color: '#444', flex: 1 }}>{label}</Text>
                    <Text style={{ fontSize: 11, color: '#888', width: 60 }}>当前 {current.toFixed(1)}</Text>
                    <TextInput
                      value={val}
                      onChangeText={setter}
                      keyboardType="number-pad"
                      style={{ borderWidth: 1, borderColor: '#CCC', paddingHorizontal: 10, paddingVertical: 6, width: 70, fontSize: 14, color: '#222', textAlign: 'center' }}
                    />
                  </View>
                ))}
                <Pressable
                  onPress={handleSaveKpi}
                  style={{ backgroundColor: '#2B4B6F', paddingVertical: 11, alignItems: 'center', marginTop: 4 }}
                >
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>保存KPI目标</Text>
                </Pressable>
              </View>

              {kpiSet && (
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
                  <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '700', letterSpacing: 2, marginBottom: 12 }}>当前完成情况</Text>
                  {kpiResults.map(item => {
                    const pct = item.target > 0 ? Math.min(100, (item.current / item.target) * 100) : 0;
                    const done = item.current >= item.target;
                    return (
                      <View key={item.label} style={{ marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontSize: 12, color: '#333' }}>{item.icon} {item.label}</Text>
                          <Text style={{ fontSize: 12, color: done ? '#2a7a3b' : '#C82829', fontWeight: '700' }}>
                            {item.current.toFixed(1)} / {item.target}
                            {done ? ' ✓达标' : ` 差${(item.target - item.current).toFixed(1)}`}
                          </Text>
                        </View>
                        <View style={{ backgroundColor: '#F0F0F0', height: 8 }}>
                          <View style={{ backgroundColor: done ? '#2a7a3b' : '#2B4B6F', width: `${pct}%`, height: 8 }} />
                        </View>
                      </View>
                    );
                  })}
                  <View style={{ marginTop: 6, backgroundColor: '#F5F4F1', padding: 10 }}>
                    <Text style={{ fontSize: 11, color: '#555', lineHeight: 18 }}>
                      年度综合评分：{kpiResults.filter(r => r.current >= r.target).length}/{kpiResults.length} 项达标
                      {kpiResults.filter(r => r.current >= r.target).length === kpiResults.length
                        ? '　🏆 全项达标，年度优秀！'
                        : kpiResults.filter(r => r.current >= r.target).length >= 2
                        ? '　📊 部分达标，继续努力'
                        : '　⚠️ 多项未达标，需加大力度'}
                    </Text>
                  </View>
                </View>
              )}
              {!kpiSet && (
                <View style={{ backgroundColor: '#FFF9E6', borderWidth: 1, borderColor: '#F0C050', padding: 14 }}>
                  <Text style={{ fontSize: 12, color: '#7A5C00', lineHeight: 20 }}>
                    📌 请设定本年度KPI目标后，即可在此查看各项指数与目标的完成进度。{'\n'}
                    建议每年初设定合理目标，年末进行考核。
                  </Text>
                </View>
              )}
            </>
          )}

          {/* ============ 述职报告（动态关联职位职能） ============ */}
          {tab === 'debrief' && (
            <>
              {/* 报告头部 */}
              <View style={{ backgroundColor: '#2B4B6F', padding: 16, alignItems: 'center' }}>
                <View style={{ borderWidth: 1, borderColor: 'rgba(255,215,0,0.5)', paddingHorizontal: 14, paddingVertical: 6, marginBottom: 10 }}>
                  <Text style={{ color: '#FFD700', fontSize: 10, letterSpacing: 3, fontWeight: '700' }}>OFFICIAL DOCUMENT</Text>
                </View>
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 2, marginBottom: 4 }}>{debriefTitle}</Text>
                <Text style={{ color: '#a0b4cc', fontSize: 11, letterSpacing: 1 }}>{debriefSubtitle}</Text>
                <Text style={{ color: '#a0b4cc', fontSize: 10, marginTop: 4 }}>
                  第{currentYear}年 · 第{Math.floor(save.gameDays / 30)}个工作月
                </Text>
              </View>

              {/* 关键数据总览 */}
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 12 }}>
                <Text style={{ fontSize: 10, color: '#2B4B6F', fontWeight: '700', letterSpacing: 2, marginBottom: 8 }}>核心指标总览</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[
                    { label: 'GDP指数', value: save.cityGdp.toFixed(1), icon: '📈', color: '#2B4B6F' },
                    { label: '民生', value: save.cityLivelihood.toFixed(1), icon: '❤️', color: '#C82829' },
                    { label: '生态', value: save.cityEcology.toFixed(1), icon: '🌿', color: '#2a7a3b' },
                    { label: '营商', value: save.cityBusiness.toFixed(1), icon: '⚖️', color: '#7B5E2A' },
                  ].map(item => (
                    <View key={item.label} style={{ flex: 1, backgroundColor: '#F5F4F1', padding: 8, alignItems: 'center', borderWidth: 1, borderColor: '#E5E5E5' }}>
                      <Text style={{ fontSize: 14 }}>{item.icon}</Text>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: item.color, marginTop: 2 }}>{item.value}</Text>
                      <Text style={{ fontSize: 9, color: '#888', marginTop: 1 }}>{item.label}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <View style={{ flex: 1, backgroundColor: '#FFF9E6', padding: 8, borderWidth: 1, borderColor: '#F0C050' }}>
                    <Text style={{ fontSize: 10, color: '#7A5C00' }}>累计政绩分值</Text>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#7A5C00' }}>{save.meritPoints} 分</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#F0F4F8', padding: 8, borderWidth: 1, borderColor: '#D1D1D1' }}>
                    <Text style={{ fontSize: 10, color: '#2B4B6F' }}>担任现职</Text>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#2B4B6F' }}>{currentYear} 年</Text>
                  </View>
                </View>
              </View>

              {/* 述职正文各章节（动态按职位生成） */}
              {debriefSections.map((section, idx) => (
                <View key={idx} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', overflow: 'hidden' }}>
                  {/* 章节标题 */}
                  <View style={{ backgroundColor: section.color, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 14 }}>{section.icon}</Text>
                    <Text style={{ fontSize: 12, color: '#fff', fontWeight: '700', letterSpacing: 1 }}>{section.title}</Text>
                  </View>
                  {/* 章节内容 */}
                  <View style={{ padding: 12, gap: 6 }}>
                    {section.items.map((item, ii) => (
                      <View key={ii} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                        <Text style={{ fontSize: 11, color: section.color, fontWeight: '700', marginTop: 1 }}>•</Text>
                        <Text style={{ flex: 1, fontSize: 12, color: '#333', lineHeight: 19 }}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}

              {/* 关联月度工作报告（最多20份） */}
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', overflow: 'hidden' }}>
                <View style={{ backgroundColor: '#2B4B6F', paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: '#fff', fontWeight: '700', letterSpacing: 1 }}>📎 关联月度工作报告</Text>
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 9, color: '#fff' }}>共 {Math.min(reports.length, 20)} / 20 份</Text>
                  </View>
                </View>
                {reports.length === 0 ? (
                  <View style={{ padding: 16, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#aaa' }}>暂无月度报告可关联</Text>
                  </View>
                ) : (
                  reports.slice(0, 20).map((r, idx) => {
                    const deptLabel = DEPT_LABELS[r.deptKey] ?? r.deptKey;
                    return (
                      <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: idx < Math.min(reports.length, 20) - 1 ? 1 : 0, borderBottomColor: '#F5F5F5', backgroundColor: idx % 2 === 0 ? '#FAFAFA' : '#fff', gap: 8 }}>
                        <View style={{ width: 22, height: 22, backgroundColor: '#2B4B6F', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{idx + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#1D2D44' }} numberOfLines={1}>{r.title}</Text>
                          <Text style={{ fontSize: 9, color: '#888', marginTop: 1 }}>{deptLabel} · 第{r.monthKey}月</Text>
                        </View>
                        <View style={{ backgroundColor: r.isRead ? '#F0F4F8' : '#FFF0F0', paddingHorizontal: 5, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 8, color: r.isRead ? '#2B4B6F' : '#C82829', fontWeight: '600' }}>{r.isRead ? '已阅' : '未读'}</Text>
                        </View>
                      </View>
                    );
                  })
                )}
                {reports.length > 20 && (
                  <View style={{ padding: 10, backgroundColor: '#F5F4F1', alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, color: '#888' }}>仅展示最近20份，共{reports.length}份报告</Text>
                  </View>
                )}
              </View>

              {/* 述职签发 */}
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 11, color: '#888' }}>本报告已据实填报，如有不实，本人负责。</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16 }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>述职人</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#2B4B6F' }}>{save.playerName || save.rankName}</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>呈报部门</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#2B4B6F' }}>{rankCfg?.bossTitle3 ?? '上级组织部'}</Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => setDebriefPrinted(true)}
                  style={{ marginTop: 12, backgroundColor: debriefPrinted ? '#2a7a3b' : '#2B4B6F', paddingVertical: 10, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                    {debriefPrinted ? '✅ 述职报告已提交' : '📤 提交述职报告'}
                  </Text>
                </Pressable>
              </View>

              <View style={{ height: 10 }} />
            </>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </View>
  );
}
```

<a id="srcappappnationalcentertsx"></a>
## `src/app/(app)/national-center.tsx`

```tsx
// 国家中枢页面 — rank15（总执书记/华夏主席/中枢军委主席）专属
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { formatMoney } from '@/types/game';

// 国家中枢权力行动
interface CentralAction {
  id: string;
  icon: string;
  category: string;
  title: string;
  desc: string;
  cost: number;
  meritReward: number;
  effects: { label: string; delta: number; key: string }[];
  cooldownDays: number;
}

const CENTRAL_ACTIONS: CentralAction[] = [
  // 党中央职权
  {
    id: 'politburo',    icon: '🏛️', category: '中枢政治局',
    title: '主持政治局常委会',
    desc: '召集中枢决策常委会议，审议重大国家政策，确立党的战略决策',
    cost: 0, meritReward: 60, cooldownDays: 30,
    effects: [{ label: 'GDP', delta: 2, key: 'cityGdp' }, { label: '民生', delta: 2, key: 'cityLivelihood' }],
  },
  {
    id: 'plenum',       icon: '📜', category: '中央全会',
    title: '召集中央全体会议',
    desc: '主持党的十九届（二十届）中央全会，研究部署国家重大发展战略',
    cost: 0, meritReward: 100, cooldownDays: 90,
    effects: [{ label: 'GDP', delta: 3, key: 'cityGdp' }, { label: '营商', delta: 3, key: 'cityBusiness' }],
  },
  {
    id: 'reform',       icon: '🔧', category: '全面深化改革',
    title: '部署全面深化改革',
    desc: '亲自主持改革部署，推动重点领域、关键环节改革向纵深发展',
    cost: 500, meritReward: 80, cooldownDays: 60,
    effects: [{ label: 'GDP', delta: 4, key: 'cityGdp' }, { label: '营商', delta: 4, key: 'cityBusiness' }, { label: '民生', delta: 2, key: 'cityLivelihood' }],
  },
  // 华夏主席职权
  {
    id: 'state_visit',  icon: '🌐', category: '华夏主席',
    title: '出访友好国家',
    desc: '以华夏主席身份对重要伙伴国进行国事访问，深化战略互信与合作',
    cost: 800, meritReward: 50, cooldownDays: 45,
    effects: [{ label: '营商', delta: 3, key: 'cityBusiness' }, { label: 'GDP', delta: 2, key: 'cityGdp' }],
  },
  {
    id: 'npc',          icon: '📋', category: '华夏主席',
    title: '主持全国议政院会议',
    desc: '主持全国议政院年度会议，发布政府工作报告，审议重大立法',
    cost: 0, meritReward: 70, cooldownDays: 365,
    effects: [{ label: '民生', delta: 3, key: 'cityLivelihood' }, { label: '营商', delta: 2, key: 'cityBusiness' }],
  },
  {
    id: 'special_law',  icon: '⚖️', category: '华夏主席',
    title: '颁布重大法律',
    desc: '签署发布重大法律法规，完善中国特色社会主义法治体系',
    cost: 0, meritReward: 45, cooldownDays: 60,
    effects: [{ label: '民生', delta: 2, key: 'cityLivelihood' }, { label: '生态', delta: 2, key: 'cityEcology' }],
  },
  // 中枢军委主席职权
  {
    id: 'mil_parade',   icon: '⚔️', category: '中枢军委主席',
    title: '主持阅兵式',
    desc: '以中枢军委主席身份主持重大军事阅兵，展示国家军事实力与决心',
    cost: 1500, meritReward: 90, cooldownDays: 180,
    effects: [{ label: '安全', delta: 8, key: 'securityIndex' }, { label: '政绩', delta: 30, key: 'meritPoints' }],
  },
  {
    id: 'mil_strategy', icon: '🛡️', category: '中枢军委主席',
    title: '下达军事战略部署',
    desc: '亲自部署国家军事战略，调整战备态势，提升战略威慑能力',
    cost: 2000, meritReward: 80, cooldownDays: 90,
    effects: [{ label: '安全', delta: 12, key: 'securityIndex' }],
  },
  {
    id: 'mil_modern',   icon: '🚀', category: '中枢军委主席',
    title: '推进军队现代化',
    desc: '亲自督促军队信息化、智能化建设，加速实现建军百年奋斗目标',
    cost: 1200, meritReward: 70, cooldownDays: 60,
    effects: [{ label: '安全', delta: 6, key: 'securityIndex' }, { label: 'GDP', delta: 1, key: 'cityGdp' }],
  },
  // 重大国家战略
  {
    id: 'rural_revit',  icon: '🌾', category: '国家战略',
    title: '乡村振兴战略部署',
    desc: '亲自部署乡村振兴重大举措，推动农业农村现代化高质量发展',
    cost: 600, meritReward: 55, cooldownDays: 90,
    effects: [{ label: '民生', delta: 5, key: 'cityLivelihood' }, { label: '生态', delta: 3, key: 'cityEcology' }],
  },
  {
    id: 'innovation',   icon: '💡', category: '国家战略',
    title: '科技强国部署',
    desc: '主持科技体制改革，确立科技强国战略，推动关键核心技术攻关',
    cost: 1000, meritReward: 65, cooldownDays: 120,
    effects: [{ label: 'GDP', delta: 5, key: 'cityGdp' }, { label: '营商', delta: 3, key: 'cityBusiness' }],
  },
  {
    id: 'ecology_civ',  icon: '🌿', category: '国家战略',
    title: '生态文明建设',
    desc: '亲自部署绿色发展战略，确立碳达峰碳中和目标，引领全球气候治理',
    cost: 400, meritReward: 45, cooldownDays: 90,
    effects: [{ label: '生态', delta: 6, key: 'cityEcology' }, { label: '营商', delta: 2, key: 'cityBusiness' }],
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  '中枢政治局': '#2B4B6F',
  '中央全会':   '#2B4B6F',
  '全面深化改革': '#2a7a3b',
  '华夏主席':   '#7B5E2A',
  '中枢军委主席':   '#5C0000',
  '国家战略':   '#1a4a6e',
};

export default function NationalCenterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, isLoading, updateGameSave } = useGame();
  const [acting, setActing] = useState(false);
  const [result, setResult] = useState('');
  const [actionDays, setActionDays] = useState<Record<string, number>>({});
  const [activeCategory, setActiveCategory] = useState('中枢政治局');

  if (isLoading || !save) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color="#1D3B5E" /></View>;
  }
  if (save.rankLevel < 15) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#0D1F35' }}>
        <Text style={{ fontSize: 36, marginBottom: 14 }}>🏛️</Text>
        <Text style={{ fontSize: 15, color: '#a0b4cc', textAlign: 'center' }}>
          晋升至总执书记/华夏主席（级别15）后可访问国家中枢
        </Text>
      </View>
    );
  }

  const categories = [...new Set(CENTRAL_ACTIONS.map(a => a.category))];
  const filtered = CENTRAL_ACTIONS.filter(a => a.category === activeCategory);

  const handleAction = async (action: CentralAction) => {
    if (acting) return;
    const lastDay = actionDays[action.id] ?? 0;
    if (save.gameDays - lastDay < action.cooldownDays) {
      const remain = action.cooldownDays - (save.gameDays - lastDay);
      setResult(`⏳ ${action.title}冷却中，还需 ${remain} 天`);
      setTimeout(() => setResult(''), 2500);
      return;
    }
    if (action.cost > 0 && save.fundBalance < action.cost) {
      setResult(`⚠️ 专项经费不足，需 ¥${formatMoney(action.cost)}万`);
      setTimeout(() => setResult(''), 2500);
      return;
    }
    setActing(true);

    const patch: Record<string, number> = {
      meritPoints: save.meritPoints + action.meritReward,
      fundBalance: save.fundBalance - action.cost,
    };
    action.effects.forEach(e => {
      if (e.key === 'meritPoints') { patch.meritPoints = (patch.meritPoints ?? save.meritPoints) + e.delta; return; }
      const cur = (save as unknown as Record<string, number>)[e.key] ?? 0;
      patch[e.key] = Math.min(100, cur + e.delta);
    });
    await updateGameSave(patch as Parameters<typeof updateGameSave>[0]);

    setActionDays(prev => ({ ...prev, [action.id]: save.gameDays }));
    const effectStr = action.effects.map(e => `${e.label}+${e.delta}`).join(' ');
    setResult(`✅ ${action.title}完成 · 政绩+${action.meritReward} · ${effectStr}`);
    setActing(false);
    setTimeout(() => setResult(''), 4000);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0D1F35' }}>
      <StatusBar style="light" backgroundColor="#060F1A" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#060F1A', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: '#a0b4cc', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'rgba(200,220,255,0.4)', fontSize: 9, letterSpacing: 3 }}>中共中央 · 国家最高权力机构</Text>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>🏛️ 国家中枢</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: 'rgba(200,220,255,0.4)', fontSize: 9 }}>{save.rankName}</Text>
          <Text style={{ color: '#FFD700', fontWeight: '600', fontSize: 12 }}>{save.playerName}</Text>
        </View>
      </View>

      {/* 综合指标 */}
      <View style={{ flexDirection: 'row', backgroundColor: '#0D1F35', paddingVertical: 10, paddingHorizontal: 14, gap: 8 }}>
        {[
          { label: 'GDP', value: save.cityGdp, color: '#5BD8FF' },
          { label: '民生', value: save.cityLivelihood, color: '#4CAF50' },
          { label: '生态', value: save.cityEcology, color: '#66BB6A' },
          { label: '营商', value: save.cityBusiness, color: '#FFD700' },
          { label: '安全', value: save.securityIndex, color: '#FF7043' },
        ].map(item => (
          <View key={item.label} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: 'rgba(200,220,255,0.5)', fontSize: 8 }}>{item.label}</Text>
            <Text style={{ color: item.color, fontWeight: '700', fontSize: 13 }}>{item.value.toFixed(0)}</Text>
          </View>
        ))}
        <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <View style={{ flex: 1.5, alignItems: 'center' }}>
          <Text style={{ color: 'rgba(200,220,255,0.5)', fontSize: 8 }}>专项经费</Text>
          <Text style={{ color: '#FFD700', fontWeight: '700', fontSize: 11 }}>¥{formatMoney(save.fundBalance)}万</Text>
        </View>
      </View>

      {/* 分类Tab */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: '#111D2C', flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
        {categories.map(cat => (
          <Pressable
            key={cat}
            onPress={() => setActiveCategory(cat)}
            style={{
              paddingHorizontal: 12, paddingVertical: 6,
              backgroundColor: activeCategory === cat ? (CATEGORY_COLORS[cat] ?? '#2B4B6F') : 'transparent',
              borderWidth: 1,
              borderColor: activeCategory === cat ? (CATEGORY_COLORS[cat] ?? '#2B4B6F') : 'rgba(200,220,255,0.2)',
            }}
          >
            <Text style={{ fontSize: 11, color: activeCategory === cat ? '#fff' : 'rgba(200,220,255,0.6)', fontWeight: activeCategory === cat ? '700' : '400' }}>
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={{ padding: 14, gap: 10 }}>
          {filtered.map(action => {
            const lastDay = actionDays[action.id] ?? 0;
            const onCooldown = save.gameDays - lastDay < action.cooldownDays;
            const canAfford = action.cost === 0 || save.fundBalance >= action.cost;
            const canAct = !onCooldown && canAfford;
            const remain = action.cooldownDays - (save.gameDays - lastDay);

            return (
              <View key={action.id} style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <View style={{ padding: 14, gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                    <Text style={{ fontSize: 22 }}>{action.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>{action.title}</Text>
                        <View style={{ backgroundColor: 'rgba(255,215,0,0.15)', paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, color: '#FFD700' }}>政绩 +{action.meritReward}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 11, color: 'rgba(200,220,255,0.7)', lineHeight: 16, marginTop: 3 }}>{action.desc}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                    {action.effects.map(e => (
                      <View key={e.key} style={{ backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, color: 'rgba(200,220,255,0.8)' }}>{e.label} +{e.delta}</Text>
                      </View>
                    ))}
                    {action.cost > 0 && (
                      <View style={{ backgroundColor: 'rgba(255,215,0,0.1)', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, color: '#FFD700' }}>¥{formatMoney(action.cost)}万</Text>
                      </View>
                    )}
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 9, color: 'rgba(200,220,255,0.5)' }}>冷却 {action.cooldownDays}天</Text>
                    </View>
                  </View>
                </View>
                <Pressable
                  onPress={() => handleAction(action)}
                  disabled={!canAct || acting}
                  style={{
                    backgroundColor: canAct
                      ? (CATEGORY_COLORS[action.category] ?? '#2B4B6F')
                      : 'rgba(255,255,255,0.08)',
                    paddingVertical: 11, alignItems: 'center',
                  }}
                >
                  <Text style={{ color: canAct ? '#fff' : 'rgba(200,220,255,0.4)', fontWeight: '700', fontSize: 12 }}>
                    {acting ? '执行中…'
                      : onCooldown ? `⏳ 冷却中（剩余 ${remain} 天）`
                      : !canAfford ? '⚠️ 经费不足'
                      : `▶ 执行：${action.title}`}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>

      {!!result && (
        <View style={{ position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: 'rgba(6,15,26,0.95)', padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' }}>
          <Text style={{ color: '#FFD700', fontWeight: '700', fontSize: 13 }}>{result}</Text>
        </View>
      )}
    </View>
  );
}
```

<a id="srcappappnationalconstructiontsx"></a>
## `src/app/(app)/national-construction.tsx`

```tsx
// 国家建设页 — rank14 国政院院理专属
// 功能：外贸/金融/国内制造业三Tab，每月收益入账资金池
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { formatMoney } from '@/types/game';

// ── 外贸板块 ────────────────────────────────────────────────────────
interface TradeProject {
  id: string;
  icon: string;
  name: string;
  partner: string;    // 贸易伙伴国/地区
  type: '出口' | '进口' | '双边' | '多边';
  volume: number;     // 贸易规模（亿元）
  monthlyRevenue: number; // 月度收益入账（万元）
  gdpBonus: number;
  cost: number;       // 一次性启动成本（万元）
  desc: string;
  activated: boolean;
}

const TRADE_PROJECTS: TradeProject[] = [
  { id: 't1',  icon: '🇪🇺', name: '中欧综合协议',      partner: '欧盟',    type: '双边', volume: 78000, monthlyRevenue: 2800, gdpBonus: 3, cost: 500000, desc: '深化中欧全面投资协定，扩大双边贸易规模',       activated: false },
  { id: 't2',  icon: '🇺🇸', name: '中美贸易谈判',      partner: '美国',    type: '双边', volume: 65000, monthlyRevenue: 3200, gdpBonus: 4, cost: 800000, desc: '推动中美经贸摩擦降温，争取关税减免',           activated: false },
  { id: 't3',  icon: '🤝', name: 'RCEP深化合作',       partner: 'RCEP成员', type: '多边', volume: 45000, monthlyRevenue: 1800, gdpBonus: 2, cost: 300000, desc: '推进区域全面经济伙伴关系协定落地，扩大出口',   activated: false },
  { id: 't4',  icon: '🛣️', name: '一带一路基础设施',   partner: '沿线国家', type: '多边', volume: 35000, monthlyRevenue: 1500, gdpBonus: 2, cost: 400000, desc: '深化"一带一路"基础设施投资与产能合作',         activated: false },
  { id: 't5',  icon: '🛢️', name: '中东能源进口',       partner: '中东',    type: '进口', volume: 28000, monthlyRevenue: 800,  gdpBonus: 1, cost: 200000, desc: '扩大中东石油天然气进口，保障能源安全',         activated: false },
  { id: 't6',  icon: '🌾', name: '粮食进口多元化',      partner: '全球',    type: '进口', volume: 15000, monthlyRevenue: 500,  gdpBonus: 1, cost: 150000, desc: '多元化粮食进口来源，提升农产品保障水平',       activated: false },
  { id: 't7',  icon: '🚀', name: '航天技术出口',        partner: '新兴市场', type: '出口', volume: 8000,  monthlyRevenue: 1200, gdpBonus: 2, cost: 350000, desc: '推动航天技术和商业火箭出口，打造新增长极',     activated: false },
  { id: 't8',  icon: '📱', name: '数字科技出口',        partner: '全球',    type: '出口', volume: 22000, monthlyRevenue: 2000, gdpBonus: 3, cost: 450000, desc: '推进5G、人工智能和智能制造技术出口',           activated: false },
];

// ── 金融板块 ────────────────────────────────────────────────────────
interface FinancePolicy {
  id: string;
  icon: string;
  name: string;
  category: '货币政策' | '资本市场' | '国际金融' | '数字金融';
  monthlyRevenue: number;
  effect: string;
  effectDelta: number;
  cost: number;
  desc: string;
  activated: boolean;
}

const FINANCE_POLICIES: FinancePolicy[] = [
  { id: 'f1', icon: '🏦', name: '降准降息组合拳',    category: '货币政策', monthlyRevenue: 2000, effect: 'cityGdp', effectDelta: 3, cost: 0,       desc: '适时下调存款准备金率和贷款基准利率，释放流动性', activated: false },
  { id: 'f2', icon: '📈', name: 'A股注册制改革',     category: '资本市场', monthlyRevenue: 1500, effect: 'cityBusiness', effectDelta: 4, cost: 200000, desc: '全面推行注册制，激活资本市场融资活力',           activated: false },
  { id: 'f3', icon: '🌏', name: '人民币国际化',      category: '国际金融', monthlyRevenue: 3000, effect: 'cityGdp', effectDelta: 2, cost: 500000, desc: '扩大人民币在国际贸易结算中的使用比例',           activated: false },
  { id: 'f4', icon: '💳', name: '数字人民币推广',    category: '数字金融', monthlyRevenue: 1200, effect: 'cityBusiness', effectDelta: 3, cost: 300000, desc: '加速数字人民币试点推广，建立数字货币生态',       activated: false },
  { id: 'f5', icon: '🏘️', name: '房地产托底政策',   category: '货币政策', monthlyRevenue: 800,  effect: 'cityLivelihood', effectDelta: 3, cost: 1000000, desc: '出台定向支持政策稳定房地产市场预期',           activated: false },
  { id: 'f6', icon: '🌿', name: '绿色金融体系',      category: '资本市场', monthlyRevenue: 1000, effect: 'cityEcology', effectDelta: 4, cost: 250000, desc: '构建绿色信贷、绿色债券、碳交易市场体系',         activated: false },
  { id: 'f7', icon: '🔐', name: '金融风险防控',      category: '国际金融', monthlyRevenue: 500,  effect: 'securityIndex', effectDelta: 5, cost: 150000, desc: '强化系统性金融风险防控，维护金融稳定',           activated: false },
];

// ── 制造业板块 ──────────────────────────────────────────────────────
interface MfgPlan {
  id: string;
  icon: string;
  name: string;
  sector: '高端制造' | '新能源' | '半导体' | '航空航天' | '生物医药';
  monthlyRevenue: number;
  effect: string;
  effectDelta: number;
  cost: number;
  desc: string;
  activated: boolean;
}

const MFG_PLANS: MfgPlan[] = [
  { id: 'm1', icon: '🤖', name: '工业机器人产业升级',  sector: '高端制造', monthlyRevenue: 2500, effect: 'cityGdp', effectDelta: 4, cost: 600000, desc: '推动机器人产业链本土化，争取全球市场份额',     activated: false },
  { id: 'm2', icon: '⚡', name: '新能源汽车出海战略',  sector: '新能源',  monthlyRevenue: 3000, effect: 'cityGdp', effectDelta: 5, cost: 800000, desc: '支持新能源汽车企业扩大海外市场，全球布局',     activated: false },
  { id: 'm3', icon: '🔋', name: '储能电池技术攻关',    sector: '新能源',  monthlyRevenue: 1800, effect: 'cityEcology', effectDelta: 3, cost: 500000, desc: '集中攻关新型储能技术，建立全球储能产业优势',   activated: false },
  { id: 'm4', icon: '💻', name: '国产芯片攻坚计划',    sector: '半导体',  monthlyRevenue: 2000, effect: 'cityGdp', effectDelta: 3, cost: 2000000, desc: '集国家力量突破芯片卡脖子问题，实现自主可控',   activated: false },
  { id: 'm5', icon: '✈️', name: '大飞机商业化推进',    sector: '航空航天', monthlyRevenue: 1500, effect: 'cityGdp', effectDelta: 2, cost: 1500000, desc: '加速C919等大飞机商业化运营，推动航空产业升级', activated: false },
  { id: 'm6', icon: '🧬', name: '生物医药创新工程',    sector: '生物医药', monthlyRevenue: 1200, effect: 'cityLivelihood', effectDelta: 3, cost: 400000, desc: '布局基因工程、创新药物研发，打造生物医药高地', activated: false },
  { id: 'm7', icon: '🌊', name: '海洋工程装备研发',    sector: '高端制造', monthlyRevenue: 900,  effect: 'cityBusiness', effectDelta: 2, cost: 350000, desc: '加大深海探测装备和海洋平台研发投入',           activated: false },
];

const EFFECT_LABELS: Record<string, string> = {
  cityGdp: 'GDP', cityLivelihood: '民生', cityEcology: '生态',
  cityBusiness: '营商', securityIndex: '安全',
};

export default function NationalConstructionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [tab, setTab] = useState<'trade' | 'finance' | 'mfg'>('trade');
  const [acting, setActing] = useState(false);
  const [result, setResult] = useState('');
  const [activatedTrade, setActivatedTrade] = useState<Set<string>>(new Set());
  const [activatedFinance, setActivatedFinance] = useState<Set<string>>(new Set());
  const [activatedMfg, setActivatedMfg] = useState<Set<string>>(new Set());

  if (!save || save.rankLevel < 14) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F4F1', padding: 24 }}>
        <Text style={{ fontSize: 32, marginBottom: 12 }}>🏗️</Text>
        <Text style={{ fontSize: 14, color: '#888', textAlign: 'center' }}>晋升至国政院院理（级别14）后解锁国家建设</Text>
      </View>
    );
  }

  const tradeMonthly = Array.from(activatedTrade).reduce((s, id) => {
    const p = TRADE_PROJECTS.find(x => x.id === id);
    return s + (p?.monthlyRevenue ?? 0);
  }, 0);
  const financeMonthly = Array.from(activatedFinance).reduce((s, id) => {
    const p = FINANCE_POLICIES.find(x => x.id === id);
    return s + (p?.monthlyRevenue ?? 0);
  }, 0);
  const mfgMonthly = Array.from(activatedMfg).reduce((s, id) => {
    const p = MFG_PLANS.find(x => x.id === id);
    return s + (p?.monthlyRevenue ?? 0);
  }, 0);
  const totalMonthly = tradeMonthly + financeMonthly + mfgMonthly;

  const handleActivate = async (
    id: string,
    cost: number,
    monthlyRevenue: number,
    effect: string,
    effectDelta: number,
    label: string,
    setActivated: React.Dispatch<React.SetStateAction<Set<string>>>,
    activated: Set<string>,
  ) => {
    if (acting || activated.has(id)) return;
    if ((save.fundBalance ?? 0) < cost) {
      setResult(`⚠️ 经费不足，需要 ¥${formatMoney(cost)}`);
      setTimeout(() => setResult(''), 2500);
      return;
    }
    setActing(true);
    const patch: Record<string, unknown> = {
      fundBalance: (save.fundBalance ?? 0) - cost,
      meritPoints: (save.meritPoints ?? 0) + Math.round(monthlyRevenue / 100),
    };
    if (effect) {
      const cur = (save as unknown as Record<string, number>)[effect] ?? 0;
      (patch as Record<string, number>)[effect] = Math.min(100, cur + effectDelta);
    }
    await updateGameSave(patch as Parameters<typeof updateGameSave>[0]);
    setActivated(prev => new Set(prev).add(id));
    setResult(`✅ 已启动「${label}」· 月收益 +¥${formatMoney(monthlyRevenue)}/月`);
    setActing(false);
    setTimeout(() => setResult(''), 3500);
  };

  const SECTOR_COLORS: Record<string, string> = {
    '高端制造': '#1D3B5E', '新能源': '#2a7a3b', '半导体': '#C82829',
    '航空航天': '#4a4a8a', '生物医药': '#7B5E2A',
    '货币政策': '#C82829', '资本市场': '#2B4B6F',
    '国际金融': '#2a7a3b', '数字金融': '#7B0026',
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F4F0' }}>
      <StatusBar style="light" backgroundColor="#0D2137" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#0D2137', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: '#7a9ec0', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(120,160,200,0.7)', fontSize: 9, letterSpacing: 3 }}>国政院 · 国家战略</Text>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>🏗️ 国家建设</Text>
            <Text style={{ color: 'rgba(140,180,220,0.8)', fontSize: 11, marginTop: 2 }}>
              {save.playerName} · 统筹三大支柱产业
            </Text>
          </View>
        </View>

        {/* 月度收益概览 */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {[
            { label: '外贸月收益',   value: tradeMonthly,   color: '#FFD700' },
            { label: '金融月收益',   value: financeMonthly, color: '#7EC8E3' },
            { label: '制造业月收益', value: mfgMonthly,     color: '#90EE90' },
            { label: '合计月入账',   value: totalMonthly,   color: '#FF8C69' },
          ].map(s => (
            <View key={s.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', padding: 8, alignItems: 'center' }}>
              <Text style={{ color: s.color, fontWeight: '700', fontSize: 12 }}>+{formatMoney(s.value)}</Text>
              <Text style={{ color: 'rgba(180,200,230,0.6)', fontSize: 8, marginTop: 1 }}>{s.label}</Text>
            </View>
          ))}
        </View>
        {totalMonthly > 0 && (
          <View style={{ backgroundColor: 'rgba(255,200,100,0.1)', borderWidth: 1, borderColor: 'rgba(255,200,100,0.3)', padding: 6, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 10, color: '#FFD700' }}>💰 月度收益将在每月推进时自动入账资金池</Text>
          </View>
        )}
      </View>

      {/* Tab */}
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' }}>
        {([['trade', '🌐 对外贸易', tradeMonthly], ['finance', '🏦 金融政策', financeMonthly], ['mfg', '🏭 制造业', mfgMonthly]] as const).map(([id, label, rev]) => (
          <Pressable
            key={id}
            onPress={() => setTab(id)}
            style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: tab === id ? '#0D2137' : 'transparent' }}
          >
            <Text style={{ fontSize: 11, fontWeight: tab === id ? '700' : '400', color: tab === id ? '#0D2137' : '#888' }}>{label}</Text>
            {rev > 0 && (
              <Text style={{ fontSize: 9, color: '#2a7a3b', marginTop: 1 }}>+{formatMoney(rev)}/月</Text>
            )}
          </Pressable>
        ))}
      </View>

      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={{ padding: 12, gap: 10 }}>

          {/* 外贸 */}
          {tab === 'trade' && TRADE_PROJECTS.map(p => {
            const done = activatedTrade.has(p.id);
            const canAct = (save.fundBalance ?? 0) >= p.cost && !done;
            return (
              <ProjectCard
                key={p.id}
                icon={p.icon}
                name={p.name}
                badge={p.type}
                badgeColor={p.type === '双边' ? '#2B4B6F' : p.type === '多边' ? '#2a7a3b' : '#7B5E2A'}
                partner={p.partner}
                desc={p.desc}
                cost={p.cost}
                monthlyRev={p.monthlyRevenue}
                effectLabel={`GDP+${p.gdpBonus}`}
                done={done}
                canAct={canAct}
                acting={acting}
                onActivate={() => void handleActivate(
                  p.id, p.cost, p.monthlyRevenue, 'cityGdp', p.gdpBonus, p.name,
                  setActivatedTrade, activatedTrade,
                )}
              />
            );
          })}

          {/* 金融 */}
          {tab === 'finance' && FINANCE_POLICIES.map(p => {
            const done = activatedFinance.has(p.id);
            const canAct = (save.fundBalance ?? 0) >= p.cost && !done;
            return (
              <ProjectCard
                key={p.id}
                icon={p.icon}
                name={p.name}
                badge={p.category}
                badgeColor={SECTOR_COLORS[p.category] ?? '#666'}
                partner={''}
                desc={p.desc}
                cost={p.cost}
                monthlyRev={p.monthlyRevenue}
                effectLabel={`${EFFECT_LABELS[p.effect] ?? p.effect}+${p.effectDelta}`}
                done={done}
                canAct={canAct}
                acting={acting}
                onActivate={() => void handleActivate(
                  p.id, p.cost, p.monthlyRevenue, p.effect, p.effectDelta, p.name,
                  setActivatedFinance, activatedFinance,
                )}
              />
            );
          })}

          {/* 制造业 */}
          {tab === 'mfg' && MFG_PLANS.map(p => {
            const done = activatedMfg.has(p.id);
            const canAct = (save.fundBalance ?? 0) >= p.cost && !done;
            return (
              <ProjectCard
                key={p.id}
                icon={p.icon}
                name={p.name}
                badge={p.sector}
                badgeColor={SECTOR_COLORS[p.sector] ?? '#666'}
                partner={''}
                desc={p.desc}
                cost={p.cost}
                monthlyRev={p.monthlyRevenue}
                effectLabel={`${EFFECT_LABELS[p.effect] ?? p.effect}+${p.effectDelta}`}
                done={done}
                canAct={canAct}
                acting={acting}
                onActivate={() => void handleActivate(
                  p.id, p.cost, p.monthlyRevenue, p.effect, p.effectDelta, p.name,
                  setActivatedMfg, activatedMfg,
                )}
              />
            );
          })}

        </View>
        <View style={{ height: 30 }} />
      </ScrollView>

      {!!result && (
        <View style={{ position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: '#0D2137', padding: 12, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{result}</Text>
        </View>
      )}
    </View>
  );
}

// 通用项目卡片组件
function ProjectCard({
  icon, name, badge, badgeColor, partner, desc, cost, monthlyRev, effectLabel,
  done, canAct, acting, onActivate,
}: {
  icon: string; name: string; badge: string; badgeColor: string;
  partner: string; desc: string; cost: number; monthlyRev: number; effectLabel: string;
  done: boolean; canAct: boolean; acting: boolean; onActivate: () => void;
}) {
  return (
    <View style={{ backgroundColor: done ? '#F0FAF0' : '#fff', borderWidth: 1, borderColor: done ? '#2a7a3b' : '#DDD', overflow: 'hidden' }}>
      <View style={{ padding: 12, gap: 5 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <Text style={{ fontSize: 20 }}>{icon}</Text>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: done ? '#2a7a3b' : '#111' }}>{name}</Text>
              <View style={{ backgroundColor: badgeColor, paddingHorizontal: 5, paddingVertical: 1 }}>
                <Text style={{ fontSize: 8, color: '#fff', fontWeight: '700' }}>{badge}</Text>
              </View>
              {!!partner && (
                <Text style={{ fontSize: 9, color: '#888' }}>· {partner}</Text>
              )}
            </View>
            <Text style={{ fontSize: 11, color: '#777', lineHeight: 15, marginTop: 3 }}>{desc}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
              {cost > 0 && (
                <View style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 5, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 9, color: '#7B5E2A' }}>启动 ¥{formatMoney(cost)}</Text>
                </View>
              )}
              <View style={{ backgroundColor: '#F0FAF0', paddingHorizontal: 5, paddingVertical: 2 }}>
                <Text style={{ fontSize: 9, color: '#2a7a3b', fontWeight: '700' }}>+¥{formatMoney(monthlyRev)}/月</Text>
              </View>
              <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 5, paddingVertical: 2 }}>
                <Text style={{ fontSize: 9, color: '#2B4B6F' }}>{effectLabel}</Text>
              </View>
            </View>
          </View>
          {done && (
            <View style={{ backgroundColor: '#2a7a3b', paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>已启动</Text>
            </View>
          )}
        </View>
      </View>
      {!done && (
        <Pressable
          onPress={onActivate}
          disabled={!canAct || acting}
          style={{ backgroundColor: canAct ? '#0D2137' : '#CCC', paddingVertical: 10, alignItems: 'center' }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
            {acting ? '启动中…' : canAct
              ? cost > 0 ? `▶ 启动（¥${formatMoney(cost)}）` : '▶ 立即启动（免费）'
              : '⚠️ 经费不足'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
```
