// 统一玩法配置表（JSON 数据，非硬编码逻辑）
// 新增玩法 = 在对应数组中插入一条配置；页面与后端接口零改动
import type { GameplayConfig } from '@/types/game';

// ── 玩法一·权钱交易：受贿渠道（严格按设计文档参数表）──
export const BRIBERY_CHANNELS: GameplayConfig[] = [
  { category: 'bribery_channel', id: 'gift', name: '收受礼品礼金', icon: '🎁', unlockRank: 3, sort: 1, enabled: true,
    params: { gainMin: 2000, gainMax: 8000, risk: 2, moral: 1, successRate: 0.95, cooldown: 15, desc: '逢年过节收受管理对象的礼品礼金。' } },
  { category: 'bribery_channel', id: 'banquet', name: '宴请与消费卡', icon: '🍽️', unlockRank: 4, sort: 2, enabled: true,
    params: { gainMin: 5000, gainMax: 20000, risk: 3, moral: 2, successRate: 0.90, cooldown: 20, desc: '接受企业宴请并收受消费卡。' } },
  { category: 'bribery_channel', id: 'redpacket', name: '企业红包', icon: '🧧', unlockRank: 5, sort: 3, enabled: true,
    params: { gainMin: 10000, gainMax: 50000, risk: 4, moral: 3, successRate: 0.85, cooldown: 30, desc: '收受企业以红包名义输送的利益。' } },
  { category: 'bribery_channel', id: 'kickback', name: '工程回扣', icon: '🏗️', unlockRank: 7, sort: 4, enabled: true,
    params: { gainMin: 50000, gainMax: 300000, risk: 8, moral: 5, successRate: 0.75, cooldown: 60, desc: '在工程项目中收取回扣。' } },
  { category: 'bribery_channel', id: 'finance_fee', name: '融资中介费', icon: '🏦', unlockRank: 8, sort: 5, enabled: true,
    params: { gainMin: 100000, gainMax: 500000, risk: 9, moral: 5, successRate: 0.70, cooldown: 60, desc: '为融资项目牵线并收取中介费。' } },
  { category: 'bribery_channel', id: 'land_rent', name: '土地指标寻租', icon: '🏞️', unlockRank: 8, sort: 6, enabled: true,
    params: { gainMin: 200000, gainMax: 800000, risk: 12, moral: 6, successRate: 0.65, cooldown: 90, desc: '利用土地审批权进行寻租。' } },
  { category: 'bribery_channel', id: 'personnel', name: '人事晋升交易', icon: '🎖️', unlockRank: 9, sort: 7, enabled: true,
    params: { gainMin: 300000, gainMax: 1000000, risk: 12, moral: 7, successRate: 0.60, cooldown: 90, desc: '在干部选拔中收钱卖官。' } },
  { category: 'bribery_channel', id: 'special_fund', name: '专项资金截留', icon: '📋', unlockRank: 10, sort: 8, enabled: true,
    params: { gainMin: 500000, gainMax: 2000000, risk: 15, moral: 8, successRate: 0.55, cooldown: 120, desc: '截留挪用专项资金中饱私囊。' } },
  { category: 'bribery_channel', id: 'overseas_share', name: '境外公司股份', icon: '🌐', unlockRank: 12, sort: 9, enabled: true,
    params: { gainMin: 1000000, gainMax: 5000000, risk: 18, moral: 9, successRate: 0.45, cooldown: 180, desc: '通过境外公司代持股份获取利益。' } },
  { category: 'bribery_channel', id: 'trust', name: '巨额信托洗钱', icon: '🏛️', unlockRank: 14, sort: 10, enabled: true,
    params: { gainMin: 5000000, gainMax: 20000000, risk: 25, moral: 12, successRate: 0.35, cooldown: 365, desc: '通过信托产品清洗巨额非法资金。' } },
];

// ── 玩法一·权钱交易：权力寻租（按文档表格，缺失数值合理推算）──
export const POWER_RENTS: GameplayConfig[] = [
  { category: 'power_rent', id: 'project_bid', name: '工程发包权', icon: '🏗️', unlockRank: 7, sort: 1, enabled: true,
    params: { gainMin: 30000, gainMax: 300000, risk: 10, moral: 5, successRate: 0.70, cooldown: 45, desc: '指定关系户中标工程，收取标的额提成。' } },
  { category: 'power_rent', id: 'bid_leak', name: '招投标干预', icon: '📑', unlockRank: 7, sort: 2, enabled: true,
    params: { gainMin: 50000, gainMax: 200000, risk: 8, moral: 4, successRate: 0.75, cooldown: 45, desc: '泄露标底为关系户谋利。' } },
  { category: 'power_rent', id: 'land_sale', name: '土地出让', icon: '🏞️', unlockRank: 8, sort: 3, enabled: true,
    params: { gainMin: 200000, gainMax: 1000000, risk: 12, moral: 6, successRate: 0.65, cooldown: 90, desc: '定向低价出让土地。' } },
  { category: 'power_rent', id: 'gov_purchase', name: '政府采购', icon: '🏪', unlockRank: 7, sort: 4, enabled: true,
    params: { gainMin: 20000, gainMax: 100000, risk: 6, moral: 3, successRate: 0.80, cooldown: 30, desc: '指定供应商获取采购回扣。' } },
  { category: 'power_rent', id: 'cadre_appoint', name: '干部任命', icon: '🎖️', unlockRank: 9, sort: 5, enabled: true,
    params: { gainMin: 300000, gainMax: 1000000, risk: 12, moral: 7, successRate: 0.60, cooldown: 90, desc: '卖官鬻爵，收钱提拔。' } },
  { category: 'power_rent', id: 'resource_approval', name: '资源审批', icon: '♻️', unlockRank: 8, sort: 6, enabled: true,
    params: { gainMin: 50000, gainMax: 300000, risk: 8, moral: 4, successRate: 0.72, cooldown: 60, desc: '环评放水、审批寻租。' } },
  { category: 'power_rent', id: 'finance_license', name: '金融牌照', icon: '🏦', unlockRank: 12, sort: 7, enabled: true,
    params: { gainMin: 500000, gainMax: 3000000, risk: 15, moral: 8, successRate: 0.55, cooldown: 180, desc: '审批金融牌照进行寻租。' } },
];

// ── 玩法一·权钱交易：贪污挪用（按文档表格）──
export const EMBEZZLEMENTS: GameplayConfig[] = [
  { category: 'embezzlement', id: 'fake_travel', name: '虚报差旅费', icon: '🧾', unlockRank: 3, sort: 1, enabled: true,
    params: { gainMin: 1000, gainMax: 3000, risk: 2, moral: 2, successRate: 0.90, cooldown: 20, desc: '虚报差旅费用报销套现。' } },
  { category: 'embezzlement', id: 'fake_invoice', name: '假发票报销', icon: '🧾', unlockRank: 4, sort: 2, enabled: true,
    params: { gainMin: 3000, gainMax: 10000, risk: 4, moral: 3, successRate: 0.85, cooldown: 25, desc: '使用虚假发票报销套取公款。' } },
  { category: 'embezzlement', id: 'agri_fund', name: '截留惠农资金', icon: '🌾', unlockRank: 5, sort: 3, enabled: true,
    params: { gainMin: 10000, gainMax: 50000, risk: 6, moral: 5, successRate: 0.78, cooldown: 40, desc: '截留挪用惠农补贴资金。' } },
  { category: 'embezzlement', id: 'slush_fund', name: '私设小金库', icon: '💰', unlockRank: 6, sort: 4, enabled: true,
    params: { gainMin: 20000, gainMax: 100000, risk: 7, moral: 5, successRate: 0.72, cooldown: 50, desc: '私设小金库截留单位资金。' } },
  { category: 'embezzlement', id: 'special_embezzle', name: '挪用专项资金', icon: '📋', unlockRank: 8, sort: 5, enabled: true,
    params: { gainMin: 100000, gainMax: 500000, risk: 10, moral: 7, successRate: 0.65, cooldown: 70, desc: '挪用专项资金用于个人用途。' } },
  { category: 'embezzlement', id: 'poverty_fund', name: '骗取扶贫资金', icon: '🤝', unlockRank: 9, sort: 6, enabled: true,
    params: { gainMin: 200000, gainMax: 800000, risk: 12, moral: 9, successRate: 0.58, cooldown: 90, desc: '骗取扶贫专项资金。' } },
  { category: 'embezzlement', id: 'social_fund', name: '社保基金挪用', icon: '🏥', unlockRank: 10, sort: 7, enabled: true,
    params: { gainMin: 500000, gainMax: 2000000, risk: 15, moral: 10, successRate: 0.50, cooldown: 120, desc: '挪用社保基金，风险极高。' } },
];

// ── 玩法一·权钱交易：涉案账户（藏匿方式，按文档表格）──
export const ASSET_HIDINGS: GameplayConfig[] = [
  { category: 'asset_hiding', id: 'cash', name: '现金藏匿（保险柜）', icon: '🗄️', unlockRank: 3, sort: 1, enabled: true,
    params: { safety: 2, recoveryRate: 0.60, risk: 2, moral: 0, desc: '将现金藏于家中保险柜，安全性中等。' } },
  { category: 'asset_hiding', id: 'relative', name: '亲属代持', icon: '👨‍👩‍👧', unlockRank: 5, sort: 2, enabled: true,
    params: { safety: 2, recoveryRate: 0.55, risk: 3, moral: 1, desc: '由亲属代持资产，牵连家人风险。' } },
  { category: 'asset_hiding', id: 'antique', name: '古董字画', icon: '🖼️', unlockRank: 6, sort: 3, enabled: true,
    params: { safety: 3, recoveryRate: 0.35, risk: 2, moral: 1, desc: '购置古董字画藏匿资金。' } },
  { category: 'asset_hiding', id: 'overseas_account', name: '境外账户', icon: '🌍', unlockRank: 8, sort: 4, enabled: true,
    params: { safety: 3, recoveryRate: 0.25, risk: 4, moral: 2, desc: '在境外开设账户转移资金。' } },
  { category: 'asset_hiding', id: 'shell_company', name: '空壳公司', icon: '🏢', unlockRank: 9, sort: 5, enabled: true,
    params: { safety: 3, recoveryRate: 0.40, risk: 3, moral: 2, desc: '通过空壳公司洗白资金。' } },
  { category: 'asset_hiding', id: 'crypto', name: '加密货币', icon: '🪙', unlockRank: 10, sort: 6, enabled: true,
    params: { safety: 4, recoveryRate: 0.15, risk: 4, moral: 2, desc: '兑换加密货币藏匿资金，追缴极难。' } },
  { category: 'asset_hiding', id: 'overseas_trust', name: '境外信托', icon: '🏛️', unlockRank: 14, sort: 7, enabled: true,
    params: { safety: 4, recoveryRate: 0.10, risk: 5, moral: 3, desc: '设立境外信托，追缴率极低。' } },
];

// ── 玩法二·纪检风云：举报线索来源（按文档表格，缺失数值合理推算）──
export const CLUE_SOURCES: GameplayConfig[] = [
  { category: 'clue_source', id: 'mass_report', name: '群众匿名举报', icon: '✉️', unlockRank: 0, sort: 1, enabled: true,
    params: { clueValue: 5, suppressCost: '政绩-5', desc: '风险≥30时随机产生，线索+5。' } },
  { category: 'clue_source', id: 'sub_report', name: '下属检举', icon: '👥', unlockRank: 0, sort: 2, enabled: true,
    params: { clueValue: 15, suppressCost: '政绩-8，下属流失', desc: '同案下属忠诚度<30时反水，线索+15。' } },
  { category: 'clue_source', id: 'inspection', name: '巡视组发现问题', icon: '🔍', unlockRank: 0, sort: 3, enabled: true,
    params: { clueValue: 20, suppressCost: '无法压盖', desc: '巡视组进驻期间发现，线索+20，无法压盖。' } },
  { category: 'clue_source', id: 'audit', name: '审计移交', icon: '📊', unlockRank: 0, sort: 4, enabled: true,
    params: { clueValue: 12, suppressCost: '存款-10万', desc: '专项资金动作被审计发现，线索+12。' } },
  { category: 'clue_source', id: 'public_opinion', name: '网络舆情', icon: '🌐', unlockRank: 0, sort: 5, enabled: true,
    params: { clueValue: 8, suppressCost: '政绩-6', desc: '民生相关贪腐引发舆情，线索+8。' } },
  { category: 'clue_source', id: 'business_expose', name: '商人揭发', icon: '💼', unlockRank: 0, sort: 6, enabled: true,
    params: { clueValue: 25, suppressCost: '无法压盖', desc: '行贿失败/翻脸后商人揭发，线索+25。' } },
];

// ── 玩法三·接受审查：审查阶段（按文档阈值表）──
export const INVESTIGATION_STAGES: GameplayConfig[] = [
  { category: 'investigation_stage', id: 'fuhan', name: '谈话函询', icon: '📋', unlockRank: 0, sort: 1, enabled: true,
    params: { stageThreshold: 55, desc: '风险≥55触发，30天窗口期。' } },
  { category: 'investigation_stage', id: 'chushi', name: '初步核实', icon: '🔎', unlockRank: 0, sort: 2, enabled: true,
    params: { stageThreshold: 70, desc: '风险≥70触发，60天窗口期。' } },
  { category: 'investigation_stage', id: 'liangan', name: '立案审查', icon: '⚖️', unlockRank: 0, sort: 3, enabled: true,
    params: { stageThreshold: 85, desc: '风险≥85或线索≥70触发，90天。' } },
  { category: 'investigation_stage', id: 'liuzhi', name: '留置调查', icon: '🔒', unlockRank: 0, sort: 4, enabled: true,
    params: { stageThreshold: 0, desc: '涉案≥500万或供述链≥80触发，剥夺行动自由。' } },
];

// ── 玩法四·涉案资产：转移销赃（按文档表格，缺失数值合理推算）──
export const ASSET_TRANSFERS: GameplayConfig[] = [
  { category: 'asset_transfer', id: 'cash_transfer', name: '现金转移', icon: '💵', unlockRank: 8, sort: 1, enabled: true,
    params: { recoveryRate: 0.10, risk: 3, moral: 1, successRate: 0.85, cooldown: 30, desc: '转移现金至亲友处，追缴率-10%。' } },
  { category: 'asset_transfer', id: 'overseas_property', name: '购买海外房产', icon: '🏠', unlockRank: 8, sort: 2, enabled: true,
    params: { recoveryRate: 0.15, risk: 4, moral: 2, successRate: 0.80, cooldown: 45, desc: '购置海外房产转移资金，追缴率-15%。' } },
  { category: 'asset_transfer', id: 'hard_currency', name: '兑换硬通货', icon: '🥇', unlockRank: 8, sort: 3, enabled: true,
    params: { recoveryRate: 0.10, risk: 3, moral: 1, successRate: 0.88, cooldown: 30, desc: '兑换黄金/外币，追缴率-10%。' } },
  { category: 'asset_transfer', id: 'gift_relative', name: '转赠亲属', icon: '👨‍👩‍👧', unlockRank: 8, sort: 4, enabled: true,
    params: { recoveryRate: 0.05, risk: 2, moral: 2, successRate: 0.90, cooldown: 30, desc: '家庭内部转移，牵连家属。' } },
  { category: 'asset_transfer', id: 'destroy_evidence', name: '销毁证据', icon: '🔥', unlockRank: 8, sort: 5, enabled: true,
    params: { clueGain: -10, risk: 5, moral: 2, successRate: 0.70, cooldown: 60, desc: '烧毁账本票据，线索完整度-10。' } },
];

// ── 民心修行：17个为民动作（严格按设计文档参数表）──
export const POPULAR_SUPPORT_ACTIONS: GameplayConfig[] = [
  // Tab 二：亲民为民（走动联系群众类）6个
  { category: 'popularity', id: 'popular_visit_poor', name: '走访困难群众', icon: '🏠', unlockRank: 1, sort: 1, enabled: true,
    params: { popularGain: 2, cooldown: 45, livelihoodGain: 2, desc: '深入困难群众家中开展走访慰问，了解民情民意。' } },
  { category: 'popularity', id: 'popular_grassroot_survey', name: '基层调研', icon: '📋', unlockRank: 2, sort: 2, enabled: true,
    params: { popularGain: 2, cooldown: 45, desc: '深入基层开展调查研究，掌握第一手民情信息。' } },
  { category: 'popularity', id: 'popular_reception_day', name: '群众接待日', icon: '🤝', unlockRank: 3, sort: 3, enabled: true,
    params: { popularGain: 3, cooldown: 60, opinionReduction: 10, desc: '定期开展领导接待日，现场受理群众诉求。' } },
  { category: 'popularity', id: 'popular_paired_aid', name: '结对帮扶', icon: '👥', unlockRank: 4, sort: 4, enabled: true,
    params: { popularGain: 3, cooldown: 90, desc: '与困难群众结对帮扶，精准服务弱势群体。' } },
  { category: 'popularity', id: 'popular_village_stay', name: '驻村蹲点', icon: '🌾', unlockRank: 5, sort: 5, enabled: true,
    params: { popularGain: 4, cooldown: 120, desc: '深入农村基层驻村蹲点，推动政策落地落实。' } },
  { category: 'popularity', id: 'popular_open_review', name: '开门搞评议', icon: '🗣️', unlockRank: 7, sort: 6, enabled: true,
    params: { popularGain: 4, cooldown: 180, opinionReduction: 5, desc: '开放评议渠道，广泛征求群众对工作的意见建议。' } },
  // Tab 三：民生实事（干事创业类）6个
  { category: 'popularity', id: 'popular_resolve_legacy', name: '化解历史遗留问题', icon: '🔧', unlockRank: 6, sort: 7, enabled: true,
    params: { popularGain: 5, cooldown: 180, opinionReduction: 10, desc: '集中力量化解长期积累的历史遗留矛盾与纠纷。' } },
  { category: 'popularity', id: 'popular_welfare_project', name: '推动惠民工程', icon: '🏗️', unlockRank: 8, sort: 8, enabled: true,
    params: { popularGain: 5, cooldown: 180, livelihoodGain: 5, desc: '主导推进民生基础设施建设，提升群众生活品质。' } },
  { category: 'popularity', id: 'popular_promote_jobs', name: '促进就业增收', icon: '💼', unlockRank: 8, sort: 9, enabled: true,
    params: { popularGain: 3, cooldown: 120, livelihoodGain: 3, desc: '出台就业创业扶持政策，拓宽群众增收渠道。' } },
  { category: 'popularity', id: 'popular_edu_health', name: '提升教育医疗', icon: '🏫', unlockRank: 9, sort: 10, enabled: true,
    params: { popularGain: 4, cooldown: 180, livelihoodGain: 4, desc: '加大教育医疗投入，切实改善群众就医就学条件。' } },
  { category: 'popularity', id: 'popular_gov_transparency', name: '政务公开透明', icon: '📢', unlockRank: 10, sort: 11, enabled: true,
    params: { popularGain: 4, cooldown: 365, riskReduction: 5, desc: '全面推行政务公开，主动接受社会监督。' } },
  { category: 'popularity', id: 'popular_major_promise', name: '重大民生承诺兑现', icon: '🏅', unlockRank: 12, sort: 12, enabled: true,
    params: { popularGain: 6, cooldown: 365, livelihoodGain: 8, desc: '全面落实向人民群众作出的重大民生承诺事项。' } },
  // Tab 四：顺应民意（正风肃纪类）5个
  { category: 'popularity', id: 'popular_rectify_local', name: '整治群众身边不正之风', icon: '⚖️', unlockRank: 5, sort: 13, enabled: true,
    params: { popularGain: 4, cooldown: 90, teamIntegrityGain: 3, desc: '专项整治发生在群众身边的不正之风和腐败问题。' } },
  { category: 'popularity', id: 'popular_respond_opinion', name: '回应舆情关切', icon: '📡', unlockRank: 6, sort: 14, enabled: true,
    params: { popularGain: 3, cooldown: 60, desc: '及时主动回应社会舆情热点，消除群众疑虑与误解。' } },
  { category: 'popularity', id: 'popular_special_inspect', name: '专项督查整改', icon: '🔍', unlockRank: 8, sort: 15, enabled: true,
    params: { popularGain: 5, cooldown: 180, desc: '开展专项督查，推动突出问题整改落实到位。' } },
  { category: 'popularity', id: 'popular_lead_discipline', name: '带头正风肃纪行动', icon: '🎯', unlockRank: 10, sort: 16, enabled: true,
    params: { popularGain: 6, cooldown: 180, meritGain: 15, desc: '以身作则带头推进正风肃纪，树立廉洁自律表率。' } },
  { category: 'popularity', id: 'popular_mass_discipline', name: '正风肃纪专项行动', icon: '🚩', unlockRank: 12, sort: 17, enabled: true,
    params: { popularGain: 8, cooldown: 365, meritGain: 30, desc: '在全辖范围内开展大规模正风肃纪专项行动。' } },
];

// 全量配置表（供通用模板按 category 过滤）
export const ALL_GAMEPLAY_CONFIGS: GameplayConfig[] = [
  ...BRIBERY_CHANNELS,
  ...POWER_RENTS,
  ...EMBEZZLEMENTS,
  ...ASSET_HIDINGS,
  ...ASSET_TRANSFERS,
  ...CLUE_SOURCES,
  ...INVESTIGATION_STAGES,
  ...POPULAR_SUPPORT_ACTIONS,
];

// 按 category 获取配置
export function getConfigsByCategory(category: GameplayConfig['category']): GameplayConfig[] {
  return ALL_GAMEPLAY_CONFIGS.filter((c) => c.category === category && c.enabled);
}

// 按 id 获取单条配置
export function getConfigById(id: string): GameplayConfig | undefined {
  return ALL_GAMEPLAY_CONFIGS.find((c) => c.id === id);
}

// 统一解锁判断函数（全站复用）
export function isGameplayUnlocked(unlockRank: number, currentRank: number): boolean {
  return currentRank >= unlockRank;
}