/**
 * KPI 考核评分引擎
 *
 * 五层级差异化考核体系，符合真实政治逻辑：
 *   乡镇(1-3)  → 维稳、上级任务、农村工作为主，经济权重低
 *   县级(4-6)  → 经济+民生+稳定+政治可靠
 *   市级(7-9)  → 综合经济+城市建设+区域协调+政治稳定
 *   省级(10-11)→ 宏观经济+生态文明+共同富裕+政治可靠
 *   国家级(12+)→ 政治表现+战略执行+全局稳定
 *
 * 每层级设置：
 *   - 各维度权重（和为1）
 *   - 晋升所需综合得分门槛
 *   - 晋升所需同级排名（百分位）
 *   - 一票否决项（触发即失去晋升资格）
 */

// ─── 类型定义 ────────────────────────────────────────────────────────────────

/** 单个考核维度 */
export interface KpiDimension {
  /** 维度唯一key */
  key: string;
  /** 显示名称 */
  label: string;
  /** 副标题/说明 */
  desc: string;
  /** 权重 0-1 */
  weight: number;
  /** 原始分 0-100 */
  rawScore: number;
  /** 加权得分 */
  weightedScore: number;
  /** 是否接近预警线 */
  warning: boolean;
  /** 是否触发一票否决 */
  vetoed: boolean;
}

/** 一票否决项 */
export interface VetoItem {
  label: string;
  desc: string;
  triggered: boolean;
  value: number;
  threshold: number;
}

/** KPI 评估结果 */
export interface KpiResult {
  /** 综合得分 0-100 */
  totalScore: number;
  /** 各维度列表 */
  dimensions: KpiDimension[];
  /** 一票否决项列表 */
  vetoItems: VetoItem[];
  /** 是否存在一票否决 */
  hasVeto: boolean;
  /** 晋升所需综合分数门槛 */
  scoreThreshold: number;
  /** 当前排名百分位（越高越好，70=前30%，annualRankPct） */
  rankPct: number;
  /** 晋升所需最低排名百分位 */
  rankThreshold: number;
  /** 综合得分是否达标 */
  scoreReady: boolean;
  /** 排名是否达标 */
  rankReady: boolean;
  /** 是否具备晋升资格（分数+排名+无否决+任期） */
  eligible: boolean;
  /** 差距描述：未达标的核心原因 */
  gaps: string[];
  /** 层级标签（用于 UI 标题） */
  tierLabel: string;
}

// ─── 辅助：将0-100原始值线性映射，支持反向（值越低越好） ──────────────────
function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

// ─── 各层级考核定义 ──────────────────────────────────────────────────────────

interface TierConfig {
  label: string;
  /** 晋升所需综合分门槛 */
  scoreThreshold: number;
  /** 晋升所需 annualRankPct 最低值（越高代表排名越靠前） */
  rankThreshold: number;
  dims: {
    key: string;
    label: string;
    desc: string;
    weight: number;
    /** 从 save 字段计算 0-100 分值 */
    compute: (s: KpiSaveSnapshot) => number;
    /** 警告线（低于此值时标红） */
    warnLine: number;
  }[];
  vetoRules: {
    label: string;
    desc: string;
    /** 返回 true = 触发否决 */
    check: (s: KpiSaveSnapshot) => { triggered: boolean; value: number; threshold: number };
  }[];
}

/** 传入 KPI 引擎所需的存档字段快照 */
export interface KpiSaveSnapshot {
  rankLevel: number;
  popularSupport: number;          // 民心值 0-100
  securityIndex: number;
  cityGdp: number;
  cityLivelihood: number;
  cityEcology: number;
  cityBusiness: number;
  bossFavor: number;
  boss2Favor: number;
  boss3Favor: number;
  annualRankPct: number;
  taxRevenue: number;
  tenureYears: number;
  meritPoints: number;
}

// ── 乡镇级（rank 1-3） ──
const TIER_TOWN: TierConfig = {
  label: '乡镇基层',
  scoreThreshold: 72,
  rankThreshold: 55,
  dims: [
    {
      key: 'stability',
      label: '社会稳定',
      desc: '治安秩序、信访控制、群体事件防范',
      weight: 0.25,
      compute: s => clamp(s.securityIndex),
      warnLine: 30,
    },
    {
      key: 'task',
      label: '完成上级任务',
      desc: '上级交办硬指标完成度、上级认可度',
      weight: 0.20,
      compute: s => clamp(s.bossFavor),
      warnLine: 35,
    },
    {
      key: 'rural',
      label: '农村工作',
      desc: '农村环境整治、农田水利、村级管理',
      weight: 0.20,
      compute: s => clamp((s.cityLivelihood + s.cityEcology) / 2),
      warnLine: 25,
    },
    {
      key: 'popularity',
      label: '群众口碑',
      desc: '基层群众满意度、民心向背',
      weight: 0.10,
      compute: s => clamp(s.popularSupport),
      warnLine: 40,
    },
    {
      key: 'party_build',
      label: '基层党建',
      desc: '党风廉政、组织生活、党员发展',
      weight: 0.15,
      compute: s => clamp(s.popularSupport),
      warnLine: 40,
    },
    {
      key: 'livelihood',
      label: '民生保障',
      desc: '低保发放、困难救助、基础设施',
      weight: 0.10,
      compute: s => clamp(s.cityLivelihood),
      warnLine: 25,
    },
  ],
  vetoRules: [
    {
      label: '重大群体性事件',
      desc: '安全稳定指数过低，发生重大群体事件',
      check: s => ({ triggered: s.securityIndex < 20, value: s.securityIndex, threshold: 20 }),
    },
    {
      label: '民心严重流失',
      desc: '群众满意度极低，民心严重流失',
      check: s => ({ triggered: s.popularSupport < 25, value: s.popularSupport, threshold: 25 }),
    },
  ],
};

// ── 县级（rank 4-6） ──
const TIER_COUNTY: TierConfig = {
  label: '县处级',
  scoreThreshold: 75,
  rankThreshold: 60,
  dims: [
    {
      key: 'economy',
      label: '经济发展',
      desc: 'GDP增长、财政收入、招商引资',
      weight: 0.30,
      compute: s => clamp((s.cityGdp * 0.5 + Math.min(100, s.taxRevenue * 2) * 0.3 + s.cityBusiness * 0.2)),
      warnLine: 30,
    },
    {
      key: 'livelihood',
      label: '民生改善',
      desc: '教育医疗投入、就业率、居民收入',
      weight: 0.20,
      compute: s => clamp(s.cityLivelihood),
      warnLine: 30,
    },
    {
      key: 'popularity',
      label: '群众口碑',
      desc: '基层群众满意度、民心向背',
      weight: 0.05,
      compute: s => clamp(s.popularSupport),
      warnLine: 40,
    },
    {
      key: 'stability',
      label: '社会稳定',
      desc: '信访数量、治安案件、群体事件',
      weight: 0.20,
      compute: s => clamp(s.securityIndex),
      warnLine: 25,
    },
    {
      key: 'task',
      label: '完成上级任务',
      desc: '县域硬指标完成度、上级评价',
      weight: 0.15,
      compute: s => clamp(s.bossFavor),
      warnLine: 35,
    },
    {
      key: 'political',
      label: '政治可靠性',
      desc: '上级认可度、班子团结、政策执行',
      weight: 0.10,
      compute: s => clamp((s.boss2Favor + s.boss3Favor) / 2),
      warnLine: 30,
    },
  ],
  vetoRules: [
    {
      label: '重大群体性事件',
      desc: '社会稳定指数过低，发生重大群体事件',
      check: s => ({ triggered: s.securityIndex < 22, value: s.securityIndex, threshold: 22 }),
    },
    {
      label: 'GDP连续倒数',
      desc: '经济发展严重滞后，GDP指数过低',
      check: s => ({ triggered: s.cityGdp < 20, value: s.cityGdp, threshold: 20 }),
    },
    {
      label: '民心严重流失',
      desc: '群众满意度极低，民心严重流失',
      check: s => ({ triggered: s.popularSupport < 20, value: s.popularSupport, threshold: 20 }),
    },
  ],
};

// ── 市级（rank 7-9） ──
const TIER_CITY: TierConfig = {
  label: '地市级',
  scoreThreshold: 78,
  rankThreshold: 65,
  dims: [
    {
      key: 'economy',
      label: '综合经济',
      desc: 'GDP增长、财政收入、产业结构、营商环境',
      weight: 0.25,
      compute: s => clamp((s.cityGdp * 0.4 + s.cityBusiness * 0.35 + Math.min(100, s.taxRevenue * 1.5) * 0.25)),
      warnLine: 35,
    },
    {
      key: 'urban',
      label: '城市建设',
      desc: '城市规划、基础设施、环境质量',
      weight: 0.20,
      compute: s => clamp((s.cityEcology * 0.6 + s.cityBusiness * 0.4)),
      warnLine: 30,
    },
    {
      key: 'coordination',
      label: '区域协调',
      desc: '县域发展均衡度、跨县协调、同级排名',
      weight: 0.15,
      compute: s => clamp(s.annualRankPct),
      warnLine: 30,
    },
    {
      key: 'popularity',
      label: '群众口碑',
      desc: '基层群众满意度、民心向背',
      weight: 0.05,
      compute: s => clamp(s.popularSupport),
      warnLine: 40,
    },
    {
      key: 'stability',
      label: '政治稳定',
      desc: '信访管控、群体事件、社会治安',
      weight: 0.15,
      compute: s => clamp(s.securityIndex),
      warnLine: 28,
    },
    {
      key: 'political',
      label: '政治可靠性',
      desc: '上级信任、政策执行力、班子团结',
      weight: 0.10,
      compute: s => clamp(s.bossFavor),
      warnLine: 35,
    },
    {
      key: 'reputation',
      label: '干部口碑',
      desc: '班子评价、群众满意度',
      weight: 0.10,
      compute: s => clamp((s.boss2Favor + s.cityLivelihood) / 2),
      warnLine: 30,
    },
  ],
  vetoRules: [
    {
      label: '重大安全事故',
      desc: '社会稳定指数过低，发生重大安全事故',
      check: s => ({ triggered: s.securityIndex < 25, value: s.securityIndex, threshold: 25 }),
    },
    {
      label: '重大环境污染',
      desc: '生态环境指数过低，发生重大污染事件',
      check: s => ({ triggered: s.cityEcology < 15, value: s.cityEcology, threshold: 15 }),
    },
    {
      label: '班子严重分裂',
      desc: '上级关系极度恶化，班子无法正常运转',
      check: s => ({ triggered: s.boss2Favor < 25 && s.boss3Favor < 25, value: Math.min(s.boss2Favor, s.boss3Favor), threshold: 25 }),
    },
    {
      label: '民心严重流失',
      desc: '群众满意度极低，民心严重流失',
      check: s => ({ triggered: s.popularSupport < 15, value: s.popularSupport, threshold: 15 }),
    },
  ],
};

// ── 省级（rank 10-11） ──
const TIER_PROVINCE: TierConfig = {
  label: '省部级',
  scoreThreshold: 82,
  rankThreshold: 72,
  dims: [
    {
      key: 'macro_economy',
      label: '宏观经济',
      desc: 'GDP增速、财政收入、产业转型升级',
      weight: 0.25,
      compute: s => clamp((s.cityGdp * 0.5 + Math.min(100, s.taxRevenue * 1.2) * 0.3 + s.cityBusiness * 0.2)),
      warnLine: 40,
    },
    {
      key: 'ecology',
      label: '生态文明',
      desc: '环境质量、节能减排、生态保护红线',
      weight: 0.20,
      compute: s => clamp(s.cityEcology),
      warnLine: 35,
    },
    {
      key: 'common_wealth',
      label: '共同富裕',
      desc: '收入差距、民生保障、脱贫成果巩固',
      weight: 0.20,
      compute: s => clamp(s.cityLivelihood),
      warnLine: 35,
    },
    {
      key: 'political',
      label: '政治可靠性',
      desc: '中央认可度、重大政策执行、政治立场',
      weight: 0.20,
      compute: s => clamp((s.bossFavor * 0.6 + s.boss2Favor * 0.4)),
      warnLine: 40,
    },
    {
      key: 'stability',
      label: '全局稳定',
      desc: '省内治安、群体事件控制、信访管控',
      weight: 0.10,
      compute: s => clamp(s.securityIndex),
      warnLine: 35,
    },
    {
      key: 'popularity',
      label: '群众口碑',
      desc: '群众满意度、民心向背',
      weight: 0.05,
      compute: s => clamp(s.popularSupport),
      warnLine: 40,
    },
  ],
  vetoRules: [
    {
      label: '生态文明硬约束',
      desc: '生态指数过低，未完成环保约束性指标',
      check: s => ({ triggered: s.cityEcology < 20, value: s.cityEcology, threshold: 20 }),
    },
    {
      label: '共同富裕严重滞后',
      desc: '民生指数过低，脱贫攻坚/共同富裕任务未完成',
      check: s => ({ triggered: s.cityLivelihood < 20, value: s.cityLivelihood, threshold: 20 }),
    },
    {
      label: '重大稳定事件',
      desc: '省内发生重大群体性事件，社会稳定失控',
      check: s => ({ triggered: s.securityIndex < 28, value: s.securityIndex, threshold: 28 }),
    },
    {
      label: '民心严重流失',
      desc: '群众满意度极低，民心严重流失',
      check: s => ({ triggered: s.popularSupport < 10, value: s.popularSupport, threshold: 10 }),
    },
    {
      label: '中央信任危机',
      desc: '上级好感度极低，政治可靠性存疑',
      check: s => ({ triggered: s.bossFavor < 20, value: s.bossFavor, threshold: 20 }),
    },
  ],
};

// ── 国家级（rank 12+） ──
const TIER_NATIONAL: TierConfig = {
  label: '国家级',
  scoreThreshold: 88,
  rankThreshold: 80,
  dims: [
    {
      key: 'political_perf',
      label: '政治表现',
      desc: '政治忠诚、政治纪律、政治立场鲜明',
      weight: 0.35,
      compute: s => clamp((s.bossFavor * 0.5 + s.popularSupport * 0.5)),
      warnLine: 50,
    },
    {
      key: 'popularity',
      label: '群众口碑',
      desc: '全国群众满意度、民心向背',
      weight: 0.05,
      compute: s => clamp(s.popularSupport),
      warnLine: 40,
    },
    {
      key: 'strategy',
      label: '国家战略执行',
      desc: '重大战略任务完成度、中央部署落实',
      weight: 0.30,
      compute: s => clamp((s.boss2Favor * 0.5 + s.boss3Favor * 0.5)),
      warnLine: 45,
    },
    {
      key: 'stability',
      label: '全局稳定',
      desc: '国家安全、社会稳定、综合治理',
      weight: 0.20,
      compute: s => clamp((s.securityIndex * 0.5 + s.cityGdp * 0.3 + s.cityLivelihood * 0.2)),
      warnLine: 40,
    },
    {
      key: 'reputation',
      label: '干部口碑',
      desc: '班子评价、群众口碑、历史贡献',
      weight: 0.10,
      compute: s => clamp(s.annualRankPct),
      warnLine: 40,
    },
  ],
  vetoRules: [
    {
      label: '重大政治风险',
      desc: '政治可靠性严重不足，存在政治风险',
      check: s => ({ triggered: s.bossFavor < 25, value: s.bossFavor, threshold: 25 }),
    },
    {
      label: '民心严重流失',
      desc: '全国群众满意度极低，民心严重流失',
      check: s => ({ triggered: s.popularSupport < 8, value: s.popularSupport, threshold: 8 }),
    },
  ],
};

// ─── 按职级获取层级配置 ─────────────────────────────────────────────────────
function getTierConfig(rankLevel: number): TierConfig {
  if (rankLevel <= 3)  return TIER_TOWN;
  if (rankLevel <= 6)  return TIER_COUNTY;
  if (rankLevel <= 9)  return TIER_CITY;
  if (rankLevel <= 11) return TIER_PROVINCE;
  return TIER_NATIONAL;
}

// ─── 主入口：计算 KPI 评估结果 ───────────────────────────────────────────────
export function computeKpi(s: KpiSaveSnapshot): KpiResult {
  const cfg = getTierConfig(s.rankLevel);

  // 计算各维度
  const dimensions: KpiDimension[] = cfg.dims.map(d => {
    const rawScore = Math.round(d.compute(s));
    const weightedScore = Math.round(rawScore * d.weight);
    return {
      key: d.key,
      label: d.label,
      desc: d.desc,
      weight: d.weight,
      rawScore,
      weightedScore,
      warning: rawScore < d.warnLine,
      vetoed: false,
    };
  });

  // 综合得分
  const totalScore = Math.min(100, dimensions.reduce((sum, d) => sum + d.weightedScore, 0));

  // 一票否决判断
  const vetoItems: VetoItem[] = cfg.vetoRules.map(r => {
    const res = r.check(s);
    return { label: r.label, desc: r.desc, ...res };
  });
  const hasVeto = vetoItems.some(v => v.triggered);

  // 达标判断
  const scoreReady = totalScore >= cfg.scoreThreshold;
  const rankReady  = s.annualRankPct >= cfg.rankThreshold;
  const eligible   = scoreReady && rankReady && !hasVeto;

  // 差距描述
  const gaps: string[] = [];
  if (!scoreReady) {
    const diff = cfg.scoreThreshold - totalScore;
    gaps.push(`综合得分 ${totalScore}分，距门槛 ${cfg.scoreThreshold}分还差 ${diff}分`);
    // 找最弱维度
    const weakest = [...dimensions].sort((a, b) => a.rawScore - b.rawScore)[0];
    if (weakest && weakest.rawScore < 50) {
      gaps.push(`"${weakest.label}"得分偏低（${weakest.rawScore}分），建议重点提升`);
    }
  }
  if (!rankReady) {
    gaps.push(`同级排名 ${s.annualRankPct}%，需达到 ${cfg.rankThreshold}% 才具备晋升资格`);
  }
  vetoItems.filter(v => v.triggered).forEach(v => {
    gaps.push(`⛔ 一票否决：${v.label}（当前 ${v.value}，需 ≥${v.threshold}）`);
  });

  return {
    totalScore,
    dimensions,
    vetoItems,
    hasVeto,
    scoreThreshold: cfg.scoreThreshold,
    rankPct: s.annualRankPct,
    rankThreshold: cfg.rankThreshold,
    scoreReady,
    rankReady,
    eligible,
    gaps,
    tierLabel: cfg.label,
  };
}

// ─── 获取当前层级的核心考核指标（用于主界面面板） ─────────────────────────
export interface KpiPanelItem {
  key: string;
  label: string;
  desc: string;
  score: number;
  weight: number;
  warning: boolean;
  vetoed: boolean;
  isTop: boolean; // 是否为权重最大的核心指标（前3名）
}

export function getKpiPanel(s: KpiSaveSnapshot): KpiPanelItem[] {
  const result = computeKpi(s);
  const sorted = [...result.dimensions].sort((a, b) => b.weight - a.weight);
  return sorted.map((d, i) => ({
    key: d.key,
    label: d.label,
    desc: d.desc,
    score: d.rawScore,
    weight: d.weight,
    warning: d.warning,
    vetoed: d.vetoed,
    isTop: i < 3,
  }));
}

/** 获取晋升总结文字 */
export function getPromotionSummary(kpi: KpiResult, tenureYears: number, requiredTenureYears: number): string {
  if (kpi.hasVeto) return '⛔ 存在一票否决项，暂无晋升资格';
  if (tenureYears < requiredTenureYears) return `⏳ 任期未满（${tenureYears}/${requiredTenureYears}年）`;
  if (!kpi.scoreReady) return `📊 综合考核得分 ${kpi.totalScore}分（门槛 ${kpi.scoreThreshold}分）`;
  if (!kpi.rankReady)  return `📈 同级排名 ${kpi.rankPct}%（需 ≥${kpi.rankThreshold}%）`;
  return '✅ 已具备晋升条件，等待换届窗口期';
}
