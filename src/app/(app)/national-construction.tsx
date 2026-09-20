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
