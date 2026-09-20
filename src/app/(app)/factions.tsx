// factions.tsx — 派系系统 v2（14 屏全面重写）
// 对应设计规格 §2–§4 / §10；删除旧 4-Tab 玩法，按文档全量实现
// v3：新增玩法 Tab（委托执行 / 密谋行动 / 叛逃换系）+ 位置棋盘入口
import { useState, useCallback } from 'react';
import { Pressable, ScrollView, Text, View, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getNpcBand } from '@/db/gameApi';
import {
  RANK_CONFIG,
  FACTION_LABEL,
  FACTION_SHORT,
  FACTION_COLOR,
  ALL_FACTIONS,
  type FactionId,
  type Faction,
  type FactionMandate,
  type CovertOpRecord,
  type PromotionContest,
} from '@/types/game';
import {
  getRepLevel,
  REP_LABELS,
  getDominantFaction,
  getLosingFaction,
  isCooldownActive,
  setCooldown,
  cooldownRemaining,
  WIND_CYCLE_DAYS,
  isInMobilizationPeriod,
  shouldTriggerWindCycle,
  calcKFaction,
  FACTION_RELATION_MATRIX,
  getActiveCoalitions,
  canFormCoalition,
  COALITION_CONTEST_BONUS,
  COALITION_FORM_RELATION_BOOST,
  applyRelDeltaToSave,
  calcSYou,
  calcBandSynergy,
  isMultiFactionFreeForAll,
  getRelationFromSave,
  prepBonus,
} from '@/lib/factionSystem';
// v6：派系胜负标准结算（统一走 promotionFaction，避免绕过晋升门控）
import {
  applyFactionWin,
  applyFactionLossPenalty,
  FACTION_LOSS_INFLUENCE_PENALTY,
  FACTION_LOSS_SUPPORT_PENALTY,
  FACTION_LOSS_SETBACK_DAYS,
} from '@/lib/promotionFaction';
// v6 扩展玩法：声望经济 / 暗线举报 / 周期分红
import {
  buySetbackImmunity,
  buyAccelerateContest,
  attemptInformReport,
  isFactionReportable,
  getInformExposureProb,
  PRESTIGE_ECONOMY,
  INFORM_REPORT,
} from '@/lib/factionExpansion';
// 派系玩法扩展（§二：委托 / 密谋 / 叛逃 + 六限制）
import {
  applyMandateComplete,
  applyMandateReject,
  attemptCovertOp,
  canDefect,
  applyDefection,
  COVERT_MERIT_COST,
  DEFECT_MERIT_COST,
  EXPOSURE_CASE_THRESHOLD,
  isInSetback,
} from '@/lib/factionGameplay';
import { PositionBoard } from '@/components/PositionBoard';

// ═══════════════════════════════════════════════════════════
// §2.1  五派完整配置（保留现有叙事内容）
// ═══════════════════════════════════════════════════════════
interface FactionConfig {
  key: FactionId;
  name: string;
  short: string;
  icon: string;
  headerColor: string;
  accentColor: string;
  tagline: string;
  background: string;
  representative: string;
  stronghold: string;
  weakness: string;
  perks: string[];
}

const FACTIONS: FactionConfig[] = [
  {
    key: 'reform', name: '改革开放系', short: '改革系', icon: '🔓',
    headerColor: '#1A3B66', accentColor: '#1E4D8C',
    tagline: '推进体制改革，扩大对外开放',
    background: '邓小平改革路线的继承者，发迹于广东、浙江等沿海改革前沿省份，与外资企业界及国际机构联系密切。',
    representative: '以广东系、浙商背景干部为代表，主张简政放权与营商环境优化。',
    stronghold: '广东、浙江、上海、福建；发改委、商务部、财政部。',
    weakness: '被质疑"让利于西方"，遇重大外部压力时政治风险骤升，与纪检系摩擦明显。',
    perks: ['改革政务政绩+30%', '晋升审批加速 5 天', '廉政考核优秀+10%', '招商引资GDP+15%（L3激活）'],
  },
  {
    key: 'pragmatic', name: '稳健国家系', short: '国家系', icon: '🏛️',
    headerColor: '#8B0000', accentColor: '#A00000',
    tagline: '党管一切，以稳定为压倒一切的任务',
    background: '以中央党政机关为核心阵地，强调党纪党风和意识形态管理，发迹于组织部、宣传部、中枢办公厅。',
    representative: '以"内陆党务系统"出身干部为代表，强调政治忠诚与意识形态统一。',
    stronghold: '中央党政机关、中枢组部宣部、国企央企；北京、河北、东北。',
    weakness: '改革动力不足，易被指"因循守旧"，在市场化改革呼声高涨时影响力下降。',
    perks: ['党务行动效果+25%', '上司忠诚好感+5', '意识形态安全+10%', '任期考核优秀+15%（L3激活）'],
  },
  {
    key: 'cyl', name: '共青团/民生系', short: '团系', icon: '🎓',
    headerColor: '#2E6B3E', accentColor: '#357A47',
    tagline: '以人民满意为第一标准，深耕群众工作',
    background: '从青年联合总团系统起步，擅长青年工作、媒体传播与群众调研。',
    representative: '重视教育、医疗、民生支出，走群众路线。',
    stronghold: '青年总团系统、教育部、卫生健康委、文化旅游部；中西部省份基层。',
    weakness: '被质疑缺乏经济建设经验，在经济下行期被边缘化；与国家系存在路线之争。',
    perks: ['民生施政政绩+25%', '群众满意度+10%', '上司汇报好感+5', '舆论管控解锁（L3激活）'],
  },
  {
    key: 'techno', name: '技术官僚系', short: '技官系', icon: '🔬',
    headerColor: '#7A5C00', accentColor: '#8A6800',
    tagline: '以数据治国，推动治理现代化',
    background: '理工科出身为主，在发改委、工信部、科技部及国有重点企业体系中影响深远。',
    representative: '以"工程师治国"路线为代表，数字经济、战略性新兴产业的强力推手。',
    stronghold: '工信部、发改委、科技部、中科院；航天军工、半导体、数字经济领域。',
    weakness: '政治动员能力弱，易被纪检系盯上技术领域腐败，与国家系意识形态路线时有摩擦。',
    perks: ['科技/数字政务+20%', '城市GDP+10%', '科研政绩+25%', '情报自然增速+50%（L2激活）'],
  },
  {
    key: 'local', name: '地方实力派', short: '地方派', icon: '🗺️',
    headerColor: '#3A2010', accentColor: '#4E2A14',
    tagline: '根植地方，深耕人脉资源',
    background: '长期在县市省层级深耕，掌握庞大的基层人脉、土地资源、地方企业关系网络。',
    representative: '在土地财政、基建项目上具有相当话语权，善于在中央政策下寻找地方操作空间。',
    stronghold: '省市县基层政府；建设局、国土局、城投公司；地方银行、商会。',
    weakness: '与中央改革路线摩擦，是反腐风暴重灾区，纪检系对地方利益输送高度警惕。',
    perks: ['基建政绩+30%', '下属招募成本-30%', '干部交流负面豁免', '地方资源调配解锁（L3激活）'],
  },
];

// ═══════════════════════════════════════════════════════════
// §3  政见表态（10 议题）
// ═══════════════════════════════════════════════════════════
interface PolicyStance {
  key: string; title: string; subtitle: string; background: string;
  effects: { fkey: FactionId; delta: number }[];
  merit: number; gdpDelta: number; livelihoodDelta: number;
  cooldown: number; risk: string;
}

const POLICY_STANCES: PolicyStance[] = [
  { key: 'pol_common_prosperity', title: '共同富裕论', subtitle: '以调节分配差距为核心，推进社会公平',
    background: '强调"第三次分配"，倡导平台经济承担社会责任，压缩资本过度扩张。',
    effects: [{ fkey: 'cyl', delta: 22 }, { fkey: 'pragmatic', delta: 10 }, { fkey: 'reform', delta: -12 }, { fkey: 'techno', delta: -5 }, { fkey: 'local', delta: -8 }],
    merit: 20, gdpDelta: -2, livelihoodDelta: 8, cooldown: 90,
    risk: '改革系和技官系认为此论调损害市场活力，招商引资承压。' },
  { key: 'pol_soe_strengthen', title: '国企做强做大论', subtitle: '强化国有企业主导地位，增强经济控制力',
    background: '主张国企在战略行业保持垄断，通过兼并重组做大规模，以国资委为核心建立央地协调机制。',
    effects: [{ fkey: 'pragmatic', delta: 20 }, { fkey: 'local', delta: 8 }, { fkey: 'reform', delta: -18 }, { fkey: 'techno', delta: -5 }, { fkey: 'cyl', delta: 5 }],
    merit: 15, gdpDelta: 3, livelihoodDelta: 0, cooldown: 75,
    risk: '改革系激烈反对，认为此论调阻碍民营经济活力，外资撤离风险上升。' },
  { key: 'pol_market_reform', title: '市场化深化论', subtitle: '让市场在资源配置中发挥决定性作用',
    background: '推动要素市场化配置改革，打破行政垄断，扩大民营企业准入。',
    effects: [{ fkey: 'reform', delta: 20 }, { fkey: 'techno', delta: 10 }, { fkey: 'pragmatic', delta: -15 }, { fkey: 'local', delta: -10 }, { fkey: 'cyl', delta: 3 }],
    merit: 22, gdpDelta: 10, livelihoodDelta: 0, cooldown: 90,
    risk: '国家系强烈抵制，被扣"历史虚无主义"帽子的政治风险较高。' },
  { key: 'pol_dual_circulation', title: '新发展格局（双循环）', subtitle: '以国内大循环为主体，国内国际双循环相互促进',
    background: '在中美博弈背景下，以内需拉动替代出口依赖，强化产业链自主可控。',
    effects: [{ fkey: 'techno', delta: 16 }, { fkey: 'pragmatic', delta: 14 }, { fkey: 'reform', delta: 5 }, { fkey: 'cyl', delta: 5 }, { fkey: 'local', delta: -3 }],
    merit: 18, gdpDelta: 6, livelihoodDelta: 2, cooldown: 75,
    risk: '政治风险低，但易被认为是向保守主义妥协，改革派部分人士有异议。' },
  { key: 'pol_anticorruption', title: '反腐常态化论', subtitle: '将反腐败斗争进行到底，构建不敢腐机制',
    background: '主张将巡视组、派驻纪检组制度化，同步推进官员财产公示。',
    effects: [{ fkey: 'reform', delta: 12 }, { fkey: 'cyl', delta: 8 }, { fkey: 'pragmatic', delta: 5 }, { fkey: 'local', delta: -22 }, { fkey: 'techno', delta: -3 }],
    merit: 25, gdpDelta: 0, livelihoodDelta: 3, cooldown: 90,
    risk: '地方实力派将视为直接威胁，可能触发地方官员结成防御联盟对抗。' },
  { key: 'pol_digital_economy', title: '数字经济强国论', subtitle: '以数字经济为引擎推动高质量发展',
    background: '在人工智能、工业互联网、大数据基础设施领域加大国家投入。',
    effects: [{ fkey: 'techno', delta: 22 }, { fkey: 'reform', delta: 10 }, { fkey: 'pragmatic', delta: 3 }, { fkey: 'cyl', delta: 0 }, { fkey: 'local', delta: -5 }],
    merit: 20, gdpDelta: 10, livelihoodDelta: 0, cooldown: 80,
    risk: '需配套较大财政投入；被纪检系警惕"数字腐败"新形式。' },
  { key: 'pol_rural_revitalization', title: '乡村振兴战略论', subtitle: '全面推进乡村振兴，缩小城乡差距',
    background: '接棒脱贫攻坚，强调农村基础设施、产业振兴、人才下乡。',
    effects: [{ fkey: 'cyl', delta: 20 }, { fkey: 'local', delta: 12 }, { fkey: 'reform', delta: 3 }, { fkey: 'techno', delta: -3 }, { fkey: 'pragmatic', delta: 8 }],
    merit: 16, gdpDelta: 2, livelihoodDelta: 10, cooldown: 60,
    risk: '政治安全，但易被质疑重民生轻效率；地方财政压力较大。' },
  { key: 'pol_full_reform', title: '全面深化改革论', subtitle: '以制度创新突破利益固化，推进国家治理体系现代化',
    background: '十八届三中全会精神的延伸，以顶层设计方式推进各领域系统性改革。',
    effects: [{ fkey: 'reform', delta: 22 }, { fkey: 'techno', delta: 10 }, { fkey: 'cyl', delta: 6 }, { fkey: 'pragmatic', delta: -12 }, { fkey: 'local', delta: -10 }],
    merit: 25, gdpDelta: 5, livelihoodDelta: 2, cooldown: 100,
    risk: '是改革系最为偏好的论调，但国家系会质疑是否动摇党的执政根基。' },
  { key: 'pol_party_leads_all', title: '党的全面领导论', subtitle: '坚持和加强党对一切工作的领导',
    background: '强调在党政军民学、东西南北中，党是领导一切的。',
    effects: [{ fkey: 'pragmatic', delta: 22 }, { fkey: 'local', delta: 5 }, { fkey: 'reform', delta: -15 }, { fkey: 'techno', delta: -8 }, { fkey: 'cyl', delta: -3 }],
    merit: 12, gdpDelta: -3, livelihoodDelta: 0, cooldown: 75,
    risk: '政治安全性最高，但市场主体信心下降风险较明显，长期GDP承压。' },
  { key: 'pol_open_to_world', title: '高水平对外开放论', subtitle: '扩大制度型开放，打造国际合作竞争新优势',
    background: '推进"第二个开放"：从商品和要素流动的开放，转向规则、规制、管理、标准的制度型开放。',
    effects: [{ fkey: 'reform', delta: 18 }, { fkey: 'techno', delta: 12 }, { fkey: 'pragmatic', delta: -10 }, { fkey: 'cyl', delta: 5 }, { fkey: 'local', delta: -8 }],
    merit: 20, gdpDelta: 12, livelihoodDelta: 0, cooldown: 90,
    risk: '在民族主义情绪高涨时政治风险上升，被指"崇洋"，需拿捏表达尺度。' },
];

// ═══════════════════════════════════════════════════════════
// §3  关系行动（每派 4-5 条）
// ═══════════════════════════════════════════════════════════
interface FactionAction {
  key: string; fkey: FactionId;
  type: '联络' | '合作' | '拉拢' | '打压';
  label: string; desc: string;
  relDelta: number;
  otherEffects: { fkey?: FactionId; merit?: number; gdpDelta?: number; livelihoodDelta?: number; fundCost?: number; moralDelta?: number }[];
  cooldown: number; minRank: number; riskLevel: '低' | '中' | '高';
}

const FACTION_ACTIONS: FactionAction[] = [
  { key: 'rf_meet',  fkey: 'reform', type: '联络', label: '约见改革派核心干部', desc: '拜访广东/浙江系改革派重要人物，就市场化改革路径深度交流，强化互信。', relDelta: 10, otherEffects: [{ merit: 5, fundCost: 50000 }], cooldown: 45, minRank: 0, riskLevel: '低' },
  { key: 'rf_gov',   fkey: 'reform', type: '合作', label: '联合推进政务公开项目', desc: '与改革派合作建立阳光政务信息公开平台，展示施政透明度，双方声誉提升。', relDelta: 15, otherEffects: [{ merit: 18, gdpDelta: 2 }], cooldown: 60, minRank: 2, riskLevel: '低' },
  { key: 'rf_biz',   fkey: 'reform', type: '合作', label: '共推营商环境优化方案', desc: '联合推出优化营商环境白皮书，减少行政审批，获得改革派和企业界双重认可。', relDelta: 14, otherEffects: [{ merit: 20, gdpDelta: 8, fundCost: 80000 }], cooldown: 75, minRank: 3, riskLevel: '低' },
  { key: 'rf_rally', fkey: 'reform', type: '拉拢', label: '邀入城市重大决策会议', desc: '在关键决策会议中为改革派开放席位，彰显政治诚意，但国家系关系略受影响。', relDelta: 22, otherEffects: [{ merit: 25, fkey: 'pragmatic' }], cooldown: 90, minRank: 4, riskLevel: '中' },
  { key: 'rf_suppress', fkey: 'reform', type: '打压', label: '质疑改革方案危及稳定', desc: '在公开场合以"操之过急"为由阻挠某改革方案，削弱改革派声势，风险较高。', relDelta: -20, otherEffects: [{ merit: 20, fkey: 'pragmatic' }], cooldown: 120, minRank: 5, riskLevel: '高' },
  { key: 'pr_meet',  fkey: 'pragmatic', type: '联络', label: '拜访国家系组织骨干', desc: '低调拜访中央系统出身的国家系核心人物，以私人情谊铺垫政治合作。', relDelta: 10, otherEffects: [{ merit: 5, fundCost: 40000 }], cooldown: 45, minRank: 0, riskLevel: '低' },
  { key: 'pr_party', fkey: 'pragmatic', type: '合作', label: '共同推进党建示范工程', desc: '联合推出党建工作品牌，获国家系高度认可，以示范工程换取党务系统话语权。', relDelta: 16, otherEffects: [{ merit: 15 }], cooldown: 60, minRank: 1, riskLevel: '低' },
  { key: 'pr_gdp',   fkey: 'pragmatic', type: '合作', label: '共推稳增长计划', desc: '联合国家系推出稳增长数字化目标，强调经济安全与稳定优先，获务实系认可。', relDelta: 14, otherEffects: [{ merit: 15, gdpDelta: 6 }], cooldown: 60, minRank: 2, riskLevel: '低' },
  { key: 'pr_pact',  fkey: 'pragmatic', type: '拉拢', label: '建立施政路线默契', desc: '与国家系在几项核心路线上达成非正式共识，互相背书，大幅提升关系。', relDelta: 20, otherEffects: [{ merit: 22, fkey: 'reform' }], cooldown: 90, minRank: 4, riskLevel: '中' },
  { key: 'pr_suppress', fkey: 'pragmatic', type: '打压', label: '揭批保守主义路线', desc: '在内部会议上指出国家系的因循守旧，以改革话语打压其影响力，风险较高。', relDelta: -18, otherEffects: [{ merit: 18, fkey: 'reform' }], cooldown: 120, minRank: 5, riskLevel: '高' },
  { key: 'cyl_event',   fkey: 'cyl', type: '联络', label: '出席团系重要政治活动', desc: '参加共青团系组织的主题活动，公开表达对青年培养的重视，提升形象分。', relDelta: 10, otherEffects: [{ merit: 8 }], cooldown: 45, minRank: 0, riskLevel: '低' },
  { key: 'cyl_network', fkey: 'cyl', type: '联络', label: '拜访团系骨干建立情谊', desc: '私下与团系中层建立联系，在非正式场合深化感情，为人事合作铺路。', relDelta: 14, otherEffects: [{ merit: 10, fundCost: 30000 }], cooldown: 50, minRank: 0, riskLevel: '低' },
  { key: 'cyl_media',   fkey: 'cyl', type: '合作', label: '借团系媒体宣传施政亮点', desc: '借助团系媒体渠道对外发布施政成果，增强公众认知，积累团系好感与民生声誉。', relDelta: 12, otherEffects: [{ merit: 20, livelihoodDelta: 2 }], cooldown: 60, minRank: 2, riskLevel: '低' },
  { key: 'cyl_support', fkey: 'cyl', type: '拉拢', label: '力推团系干部人事安排', desc: '在组织推荐环节为团系干部站台，换取其在晋升投票上的关键支持。', relDelta: 20, otherEffects: [{ merit: 15, fkey: 'reform' }], cooldown: 90, minRank: 3, riskLevel: '中' },
  { key: 'cyl_welfare', fkey: 'cyl', type: '合作', label: '联合推进民生保障计划', desc: '与团系联合发布教育/医疗/养老三联惠民方案，拉动民生指数，双方均获政绩。', relDelta: 18, otherEffects: [{ merit: 22, livelihoodDelta: 5 }], cooldown: 75, minRank: 2, riskLevel: '低' },
  { key: 'tc_consult',  fkey: 'techno', type: '联络', label: '聘请技官系专家顾问', desc: '聘请技官派院士、专家担任政务顾问，借其专业背书提升施政公信力。', relDelta: 10, otherEffects: [{ merit: 12, fundCost: 60000 }], cooldown: 45, minRank: 0, riskLevel: '低' },
  { key: 'tc_project',  fkey: 'techno', type: '合作', label: '共推数字政务升级项目', desc: '邀请技官系骨干主导电子政务平台全面升级，双方共享政绩与声望。', relDelta: 14, otherEffects: [{ merit: 15, gdpDelta: 4 }], cooldown: 50, minRank: 2, riskLevel: '低' },
  { key: 'tc_fund',     fkey: 'techno', type: '合作', label: '申请科技创新专项资金', desc: '联合技官系提报新兴产业专项，争取科研经费和政策支持，共同推动产业转型。', relDelta: 12, otherEffects: [{ merit: 18, fundCost: 80000 }], cooldown: 60, minRank: 3, riskLevel: '低' },
  { key: 'tc_bigdata',  fkey: 'techno', type: '拉拢', label: '共建大数据城市治理平台', desc: '推出大数据城市治理方案，将技官系路线嵌入本地治理，大幅提升双方关系。', relDelta: 22, otherEffects: [{ merit: 28, gdpDelta: 5, fkey: 'reform' }], cooldown: 90, minRank: 5, riskLevel: '低' },
  { key: 'lc_visit',    fkey: 'local', type: '联络', label: '登门拜会地方实力要员', desc: '携带厚礼拜访地方派核心人物，以私人情谊奠定政治合作基础。', relDelta: 12, otherEffects: [{ merit: 8, fundCost: 80000 }], cooldown: 45, minRank: 0, riskLevel: '低' },
  { key: 'lc_land',     fkey: 'local', type: '合作', label: '联合推进土地出让项目', desc: '与地方派协同推进辖区土地出让与旧城改造项目，共享财政收益与政绩资源。', relDelta: 14, otherEffects: [{ merit: 18, gdpDelta: 8, fundCost: 150000 }], cooldown: 70, minRank: 2, riskLevel: '中' },
  { key: 'lc_project',  fkey: 'local', type: '合作', label: '联手承接基建大项目', desc: '与地方派共同推进基础设施项目，共享政绩并绑定利益，关系大幅提升。', relDelta: 16, otherEffects: [{ merit: 22, gdpDelta: 6, fundCost: 200000 }], cooldown: 75, minRank: 3, riskLevel: '低' },
  { key: 'lc_ally',     fkey: 'local', type: '拉拢', label: '结盟地方骨干核心人物', desc: '与地方派核心人物建立正式政治盟约，换取稳固支持，但改革派关系受损。', relDelta: 25, otherEffects: [{ merit: 20, fkey: 'reform' }], cooldown: 120, minRank: 5, riskLevel: '中' },
  { key: 'lc_expose',   fkey: 'local', type: '打压', label: '向纪委反映利益输送线索', desc: '秘密向纪委举报地方派的腐败线索，以反腐名义大幅削弱其根基，政治风险极高。', relDelta: -30, otherEffects: [{ merit: 40, moralDelta: 5 }], cooldown: 180, minRank: 6, riskLevel: '高' },
];

// ═══════════════════════════════════════════════════════════
// §10.3  设计令牌（颜色）
// ═══════════════════════════════════════════════════════════
const FACTION_BG: Record<FactionId, string> = {
  reform: '#1A3B66', pragmatic: '#8B0000', cyl: '#2E6B3E', techno: '#7A5C00', local: '#3A2010',
};

const WIND_LABEL: Record<string, string> = {
  'reform-heavy': '改革开放路线主导', 'pragmatic-heavy': '稳健国家路线主导',
  'techno-surge': '技术官僚路线主导', 'local-crackdown': '地方纪律整肃路线',
  'balanced': '路线均衡 · 无主流',
};

const PHASE_LABEL: Record<string, { label: string; color: string }> = {
  idle: { label: '平稳期', color: '#607D8B' },
  mobilize: { label: '动员期 ⚡', color: '#F57C00' },
  active: { label: '交战期 ⚔', color: '#C62828' },
  truce: { label: '休战期 🕊', color: '#2E7D32' },
};

const REP_PERKS: Record<number, string> = {
  1: '委托任务 +1 条',
  2: '行动效果 +20%；政见联动 +1',
  3: '资源通道折扣；晋升系数 +0.1',
  4: '"领导人背书"解锁；危机庇护一次',
};

// ═══════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════
function clamp(v: number, min = 0, max = 100) { return Math.max(min, Math.min(max, v)); }

function getRelLabel(v: number): { label: string; color: string } {
  if (v >= 80) return { label: '坚定盟友', color: '#D4AF37' };
  if (v >= 60) return { label: '友好合作', color: '#2E7D32' };
  if (v >= 40) return { label: '中立观望', color: '#546E7A' };
  if (v >= 20) return { label: '冷淡疏离', color: '#E65100' };
  return { label: '潜在对立', color: '#C62828' };
}

function relOf(save: any, fkey: FactionId): number {
  if (fkey === 'reform')    return save.reformFaction    ?? 50;
  if (fkey === 'pragmatic') return save.pragmaticFaction ?? 50;
  if (fkey === 'cyl')       return save.cylRelation      ?? 30;
  if (fkey === 'techno')    return save.technoRelation   ?? 30;
  if (fkey === 'local')     return save.localRelation    ?? 30;
  return 0;
}

function relField(fkey: FactionId): string {
  if (fkey === 'reform')    return 'reformFaction';
  if (fkey === 'pragmatic') return 'pragmaticFaction';
  if (fkey === 'cyl')       return 'cylRelation';
  if (fkey === 'techno')    return 'technoRelation';
  return 'localRelation';
}

function applyRelDelta(save: any, fkey: FactionId, delta: number): Record<string, number> {
  return { [relField(fkey)]: clamp(relOf(save, fkey) + delta) };
}

// ═══════════════════════════════════════════════════════════
// 通用小组件
// ═══════════════════════════════════════════════════════════
function RelBar({ value, color }: { value: number; color: string }) {
  const { label, color: lc } = getRelLabel(value);
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
        <Text style={{ color: '#555', fontSize: 10 }}>{value} / 100</Text>
        <Text style={{ fontSize: 10, fontWeight: '700', color: lc }}>{label}</Text>
      </View>
      <View style={{ height: 5, backgroundColor: '#E5E5E5', borderRadius: 3, overflow: 'hidden' }}>
        <View style={{ height: 5, width: `${value}%`, backgroundColor: color, borderRadius: 3 }} />
      </View>
    </View>
  );
}

function CooldownBadge({ days }: { days: number }) {
  return (
    <View style={{ backgroundColor: '#FFF3E0', borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2 }}>
      <Text style={{ color: '#E65100', fontSize: 9, fontWeight: '700' }}>冷却 {days}天</Text>
    </View>
  );
}

function SectionCard({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 0, borderTopWidth: 3, borderTopColor: accent ?? '#2B4B6F', borderWidth: 1, borderColor: '#E5E5E5', padding: 14, marginBottom: 10 }}>
      {children}
    </View>
  );
}

function SLabel({ text }: { text: string }) {
  return <Text style={{ fontSize: 9, color: '#2B4B6F', fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>{text.toUpperCase()}</Text>;
}

function ActionBtn({ label, onPress, disabled, color = '#1D3A5C' }: { label: string; onPress: () => void; disabled?: boolean; color?: string }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={{ backgroundColor: disabled ? '#E0E0E0' : color, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 2, alignItems: 'center' }}
    >
      <Text style={{ color: disabled ? '#9E9E9E' : '#fff', fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 0 — 政治总览
// ═══════════════════════════════════════════════════════════
function Tab0Overview({ save, showFeedback }: { save: any; showFeedback: (m: string, ok?: boolean) => void }) {
  const primary = save.primaryFaction as FactionId | '';
  const dominant = save.dominantFaction as FactionId | null;
  const wind = save.politicalWind ?? 'balanced';
  const losingFaction = getLosingFaction(wind);
  const isOnWind = primary && dominant && primary === dominant;
  const isOnLose = primary && losingFaction && primary === losingFaction;

  // K_faction 预估
  const kResult = primary ? calcKFaction({
    primaryFaction: primary || null,
    relation: { reform: relOf(save, 'reform'), pragmatic: relOf(save, 'pragmatic'), cyl: relOf(save, 'cyl'), techno: relOf(save, 'techno'), local: relOf(save, 'local') },
    dominantFaction: dominant,
    losingFaction,
    bandFactions: [],
    isFlagged: save.isFlagged ?? false,
    factionlessLocked: save.factionlessLocked ?? false,
    factionPromotionLocked: save.factionPromotionLocked ?? false,
  }) : null;

  const influence = save.factionInfluence ?? 0;
  const merit = save.meritPoints ?? 0;
  const intel = save.factionIntelligence ?? 0;

  return (
    <>
      {/* 风向横幅 */}
      <View style={{ backgroundColor: '#1D3A5C', padding: 14, marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ color: '#8eb4d8', fontSize: 9, letterSpacing: 2 }}>中央政治风向 · 五年一换</Text>
          {isOnWind && <View style={{ backgroundColor: '#FFD700', paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ color: '#1D3A5C', fontSize: 9, fontWeight: '700' }}>🟢 风口加成 +0.20</Text></View>}
          {isOnLose && <View style={{ backgroundColor: '#C62828', paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>⚠ 失势 −0.15</Text></View>}
        </View>
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 4 }}>{WIND_LABEL[wind] ?? wind}</Text>
        {dominant ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: FACTION_COLOR[dominant] }} />
            <Text style={{ color: '#8eb4d8', fontSize: 11 }}>
              当前主流派：<Text style={{ color: '#FFD700', fontWeight: '700' }}>{FACTION_LABEL[dominant]}</Text>
              {losingFaction ? `  ·  失势派：${FACTION_LABEL[losingFaction]}` : ''}
            </Text>
          </View>
        ) : (
          <Text style={{ color: '#8eb4d8', fontSize: 11 }}>均势博弈中 · 无明确主流派</Text>
        )}
        {/* 下次斗争倒计时 */}
        {(() => {
          const remaining = WIND_CYCLE_DAYS - (save.gameDays - (save.lastWindCycleDay ?? 0));
          const pct = Math.max(0, remaining) / WIND_CYCLE_DAYS;
          return (
            <View style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                <Text style={{ color: '#8eb4d8', fontSize: 9 }}>下次派系斗争</Text>
                <Text style={{ color: remaining <= 60 ? '#FFD700' : '#8eb4d8', fontSize: 9, fontWeight: '700' }}>
                  {Math.max(0, remaining)} 天后{remaining <= 60 ? ' ⚡ 动员期' : ''}
                </Text>
              </View>
              <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden' }}>
                <View style={{ height: 4, width: `${(1 - pct) * 100}%`, backgroundColor: remaining <= 60 ? '#FFD700' : '#1E88E5', borderRadius: 2 }} />
              </View>
            </View>
          );
        })()}
      </View>

      {/* 三仪表 */}
      <SectionCard>
        <SLabel text="政治分量仪表" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { label: '派系影响力', value: influence, color: '#1E4D8C', max: 100 },
            { label: '政绩', value: merit, color: '#2E7D32', max: 9999 },
            { label: '派系情报', value: intel, color: '#8A6800', max: 100 },
          ].map(m => (
            <View key={m.label} style={{ flex: 1, alignItems: 'center', backgroundColor: '#F8F8F8', padding: 10, borderRadius: 2 }}>
              <Text style={{ color: m.color, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                {m.max === 9999 ? m.value : m.value}
              </Text>
              <Text style={{ color: '#666', fontSize: 9, marginTop: 2 }}>{m.label}</Text>
              {m.max <= 100 && (
                <View style={{ height: 3, width: '100%', backgroundColor: '#E5E5E5', marginTop: 5, borderRadius: 2, overflow: 'hidden' }}>
                  <View style={{ height: 3, width: `${m.value}%`, backgroundColor: m.color, borderRadius: 2 }} />
                </View>
              )}
            </View>
          ))}
        </View>
      </SectionCard>

      {/* 五派关系雷达（条形图模拟）*/}
      <SectionCard>
        <SLabel text="五派关系格局" />
        {FACTIONS.map(f => {
          const rel = relOf(save, f.key);
          const isPrimary = primary === f.key;
          const { label: rl, color: rc } = getRelLabel(rel);
          return (
            <View key={f.key} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Text style={{ fontSize: 14 }}>{f.icon}</Text>
                <Text style={{ flex: 1, color: '#222', fontSize: 11, fontWeight: isPrimary ? '700' : '400' }}>{f.name}</Text>
                {isPrimary && <View style={{ backgroundColor: FACTION_BG[f.key], paddingHorizontal: 4, paddingVertical: 1 }}><Text style={{ color: '#FFD700', fontSize: 8, fontWeight: '700' }}>主派</Text></View>}
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#222', fontVariant: ['tabular-nums'], width: 26, textAlign: 'right' }}>{rel}</Text>
                <Text style={{ fontSize: 9, color: rc, fontWeight: '700', width: 48, textAlign: 'right' }}>{rl}</Text>
              </View>
              <View style={{ height: 5, backgroundColor: '#E5E5E5', borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ height: 5, width: `${rel}%`, backgroundColor: f.accentColor, borderRadius: 3 }} />
              </View>
            </View>
          );
        })}
      </SectionCard>

      {/* 改革·务实张力 */}
      {(() => {
        const diff = relOf(save, 'reform') - relOf(save, 'pragmatic');
        const warn = Math.abs(diff) > 30;
        return (
          <SectionCard accent={warn ? '#C62828' : '#2B4B6F'}>
            <SLabel text="改革·务实 路线张力" />
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <View style={{ flex: 1, backgroundColor: '#EFF4FB', padding: 10, alignItems: 'center' }}>
                <Text style={{ color: '#1565C0', fontSize: 18, fontWeight: '700' }}>{relOf(save, 'reform')}</Text>
                <Text style={{ color: '#1565C0', fontSize: 9, marginTop: 2 }}>改革开放派</Text>
              </View>
              <View style={{ justifyContent: 'center', alignItems: 'center', width: 40 }}>
                <Text style={{ fontSize: 9, color: warn ? '#C62828' : '#999', fontWeight: '700', textAlign: 'center' }}>
                  {diff > 0 ? '改革偏强' : diff < 0 ? '务实偏强' : '势均力敌'}
                </Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#F5F5F5', padding: 10, alignItems: 'center' }}>
                <Text style={{ color: '#455A64', fontSize: 18, fontWeight: '700' }}>{relOf(save, 'pragmatic')}</Text>
                <Text style={{ color: '#455A64', fontSize: 9, marginTop: 2 }}>稳健务实派</Text>
              </View>
            </View>
            {warn && (
              <View style={{ backgroundColor: '#fff3e0', borderLeftWidth: 3, borderLeftColor: '#C62828', padding: 9 }}>
                <Text style={{ color: '#b71c1c', fontSize: 10, fontWeight: '700', marginBottom: 2 }}>⚠ 路线失衡警告</Text>
                <Text style={{ color: '#7f4c00', fontSize: 10, lineHeight: 16 }}>
                  {diff > 0 ? '务实' : '改革'}派声望差距超过 30 点，劣势派可能在晋升审批中投反对票（`K_faction` 对立派扣减项已生效）。
                </Text>
              </View>
            )}
          </SectionCard>
        );
      })()}

      {/* K_faction 晋升加成提示 */}
      {kResult && (
        <SectionCard accent="#7B1FA2">
          <SLabel text="晋升系数预估" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 28, fontWeight: '700', color: kResult.promotable ? '#1565C0' : '#C62828', fontVariant: ['tabular-nums'] }}>
              {kResult.promotable ? `×${kResult.kFaction.toFixed(2)}` : '锁定'}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#333', fontSize: 11, lineHeight: 18 }}>
                {kResult.promotable
                  ? `K_faction = ${kResult.kFaction.toFixed(2)}（范围 0.4–1.8）\n包含：风口${isOnWind ? '+0.20' : isOnLose ? '−0.15' : ' 0'}、声望等级 L${getRepLevel(relOf(save, primary as FactionId))}（+${(getRepLevel(relOf(save, primary as FactionId)) * 0.1).toFixed(1)}）`
                  : `晋升被锁定：${kResult.reason}`}
              </Text>
            </View>
          </View>
        </SectionCard>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 1 — 加入 / 我的派系（§2.5）
// ═══════════════════════════════════════════════════════════
function Tab1Join({ save, updateGameSave, showFeedback }: { save: any; updateGameSave: (u: any) => Promise<void>; showFeedback: (m: string, ok?: boolean) => void }) {
  const primary = save.primaryFaction as FactionId | '';
  const wind = save.politicalWind ?? 'balanced';
  const dominant = save.dominantFaction as FactionId | null;

  // 未加入：显示五派公开简介，风向屏蔽
  if (!primary) {
    return (
      <>
        <View style={{ backgroundColor: '#1D3A5C', padding: 14, marginBottom: 10 }}>
          <Text style={{ color: '#FFD700', fontSize: 13, fontWeight: '700', marginBottom: 6 }}>⚠ 尚未站队</Text>
          <Text style={{ color: '#8eb4d8', fontSize: 11, lineHeight: 18 }}>
            当前风向：<Text style={{ color: '#fff', fontWeight: '700' }}>???（信息封锁）</Text>{'\n'}
            各派实时声望对你不可见。主流派与失势派信息在加入后首次揭示。{'\n'}
            站队不可撤销 · 接触他派将被针对 · 被踢则永久失去晋升资格。
          </Text>
        </View>
        {FACTIONS.map(f => (
          <View key={f.key} style={{ backgroundColor: f.headerColor, padding: 14, marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Text style={{ fontSize: 20 }}>{f.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{f.name}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>{f.tagline}</Text>
              </View>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, lineHeight: 16, marginBottom: 8 }}>{f.background}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, marginBottom: 10 }}>势力：{f.stronghold}</Text>
            <ActionBtn
              label={`申请加入「${f.short}」`}
              color={f.accentColor}
              onPress={async () => {
                const updates: Record<string, any> = { primaryFaction: f.key, factionJoinedDay: save.gameDays };
                updates[relField(f.key)] = clamp(relOf(save, f.key) + 20);
                // 首次揭示 dominantFaction
                if (!save.dominantFaction) updates.dominantFaction = getDominantFaction(wind);
                await updateGameSave(updates);
                showFeedback(`✓ 已加入「${f.name}」。风向已揭示，排他忠诚生效，接触他派将被针对。`, true);
              }}
            />
          </View>
        ))}
      </>
    );
  }

  // 已加入：我的派系卡
  const cfg = FACTIONS.find(f => f.key === primary)!;
  const rel = relOf(save, primary);
  const repLv = getRepLevel(rel);
  const isFlagged = save.isFlagged ?? false;
  const isLocked = save.factionlessLocked ?? false;

  return (
    <>
      {/* 主派卡 */}
      <View style={{ backgroundColor: cfg.headerColor, padding: 14, marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Text style={{ fontSize: 28 }}>{cfg.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, letterSpacing: 1 }}>主派归属</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{cfg.name}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>{cfg.tagline}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={{ color: '#FFD700', fontSize: 18, fontWeight: '700' }}>{rel}</Text>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ color: '#fff', fontSize: 9 }}>L{repLv} {REP_LABELS[repLv as keyof typeof REP_LABELS]}</Text>
            </View>
          </View>
        </View>
        {isFlagged && (
          <View style={{ backgroundColor: '#C62828', padding: 8, marginBottom: 8 }}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>🚨 被针对（isFlagged）</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, marginTop: 3, lineHeight: 16 }}>
              本派发现你暗中接触他派。晋升系数 ×0.6，上司好感 ×0.7，累计次数达阈值将被踢出。
            </Text>
          </View>
        )}
        {isLocked && (
          <View style={{ backgroundColor: '#4A148C', padding: 8, marginBottom: 8 }}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>🔒 无派系·晋升锁死</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, marginTop: 3 }}>
              你已被踢出或长期未站队，rankLevel 永久锁死，无法晋升。L4 庇护可豁免一次。
            </Text>
          </View>
        )}
        <View style={{ gap: 5 }}>
          {cfg.perks.map((perk, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
              <Text style={{ color: repLv >= i + 1 ? '#FFD700' : 'rgba(255,255,255,0.3)', fontSize: 11 }}>◆</Text>
              <Text style={{ flex: 1, color: repLv >= i + 1 ? '#fff' : 'rgba(255,255,255,0.3)', fontSize: 10, lineHeight: 15 }}>{perk}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 风向揭示 */}
      <SectionCard accent={dominant ? FACTION_COLOR[dominant] : '#607D8B'}>
        <SLabel text="风向揭示（加入后可见）" />
        <Text style={{ color: '#333', fontSize: 11, lineHeight: 18 }}>
          当前风向：<Text style={{ fontWeight: '700' }}>{WIND_LABEL[wind]}</Text>{'\n'}
          风口主流派：<Text style={{ fontWeight: '700', color: dominant ? FACTION_COLOR[dominant] : '#999' }}>
            {dominant ? FACTION_LABEL[dominant] : '均势·无主流'}
          </Text>
          {primary === dominant ? '  🟢 你在风口' : primary === getLosingFaction(wind) ? '  ⚠ 你处于失势派' : ''}
        </Text>
      </SectionCard>

      {/* 暗中接触（高风险隐藏入口）*/}
      <SectionCard accent="#C62828">
        <SLabel text="⚠ 高风险 · 暗中接触他派" />
        <Text style={{ color: '#555', fontSize: 10, lineHeight: 16, marginBottom: 10 }}>
          累计次数 {save.contactAttempts ?? 0} 次 · 基础暴露率{' '}
          {[15, 30, 55, 80][(save.contactAttempts ?? 0)] ?? 80}%{'\n'}
          成功则绑定边缘关系，失败则本派 relation −30–50，`isFlagged`=true，多次被抓→踢出。{'\n'}
          成本：政绩 500（统一起步价 §2.3）
        </Text>
        {FACTIONS.filter(f => f.key !== primary).map(f => (
          <View key={f.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Text style={{ fontSize: 12 }}>{f.icon}</Text>
            <Text style={{ flex: 1, color: '#333', fontSize: 11 }}>{f.name}</Text>
            <ActionBtn
              label="暗中接触 (-500政绩)"
              color="#C62828"
              disabled={(save.meritPoints ?? 0) < 500}
              onPress={async () => {
                const attempts = (save.contactAttempts ?? 0);
                const exposureRates = [0.15, 0.3, 0.55, 0.8];
                const baseRate = exposureRates[Math.min(attempts, 3)];
                const adjustedRate = baseRate * (1 - (save.factionIntelligence ?? 0) / 200);
                const discovered = Math.random() < adjustedRate;
                const updates: Record<string, any> = {
                  meritPoints: (save.meritPoints ?? 0) - 500,
                  contactAttempts: attempts + 1,
                };
                if (discovered) {
                  const newRel = clamp(relOf(save, primary) - 40);
                  updates[relField(primary)] = newRel;
                  updates.isFlagged = true;
                  if (attempts >= 2) updates.factionlessLocked = true;
                  showFeedback(`⚠ 暴露！本派 relation −40，isFlagged=true${attempts >= 2 ? '·已被踢出' : ''}`, false);
                } else {
                  showFeedback(`✓ 未被发现。${f.name} 已有边缘接触（效果微弱）`, true);
                }
                await updateGameSave(updates);
              }}
            />
          </View>
        ))}
      </SectionCard>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 2 — 关系经营（§2.2 / §2.4 / §D1 修复）
// ═══════════════════════════════════════════════════════════
function Tab2Relations({ save, updateGameSave, showFeedback }: { save: any; updateGameSave: (u: any) => Promise<void>; showFeedback: (m: string, ok?: boolean) => void }) {
  const [expanded, setExpanded] = useState<FactionId | null>(null);
  const primary = save.primaryFaction as FactionId | '';

  const doAction = async (action: FactionAction) => {
    if (isCooldownActive(save.factionCooldowns ?? {}, action.key, save.gameDays)) {
      showFeedback(`冷却中，还需 ${cooldownRemaining(save.factionCooldowns ?? {}, action.key, save.gameDays)} 天`, false); return;
    }
    if (save.rankLevel < action.minRank) {
      showFeedback(`职级不足（需 ${action.minRank} 级）`, false); return;
    }
    const fundCost = action.otherEffects.find(e => e.fundCost)?.fundCost ?? 0;
    if (fundCost > 0 && (save.fundBalance ?? 0) < fundCost) {
      showFeedback(`资金不足，需 ¥${(fundCost / 10000).toFixed(0)}万`, false); return;
    }

    const u: Record<string, any> = {};
    // 主派关系（§3.5 L2 同道：正向行动 +20% 效果）
    const repLv = getRepLevel(relOf(save, action.fkey));
    const effDelta = action.relDelta >= 0 && repLv >= 2 ? Math.round(action.relDelta * 1.2) : action.relDelta;
    Object.assign(u, applyRelDelta(save, action.fkey, effDelta));
    // 副效果
    let meritSum = 0, gdpSum = 0, lifeSum = 0, moralSum = 0;
    for (const e of action.otherEffects) {
      if (e.merit    !== undefined) meritSum  += e.merit;
      if (e.gdpDelta !== undefined) gdpSum    += e.gdpDelta;
      if (e.livelihoodDelta !== undefined) lifeSum += e.livelihoodDelta;
      if (e.moralDelta      !== undefined) moralSum += e.moralDelta;
      if (e.fkey) {
        const delta = action.type === '打压' ? 10 : -8;
        Object.assign(u, applyRelDelta(save, e.fkey, delta));
      }
    }
    if (meritSum)  u.meritPoints     = clamp((save.meritPoints ?? 0) + meritSum, 0, 9999);
    if (gdpSum)    u.cityGdp         = clamp((save.cityGdp ?? 50) + gdpSum);
    if (lifeSum)   u.cityLivelihood  = clamp((save.cityLivelihood ?? 50) + lifeSum);
    if (moralSum)  u.moralValue      = clamp((save.moralValue ?? 50) + moralSum);
    if (fundCost)  u.fundBalance     = Math.max(0, (save.fundBalance ?? 0) - fundCost);
    // 持久化冷却（§D1 修复）
    u.factionCooldowns = setCooldown(save.factionCooldowns ?? {}, action.key, save.gameDays, action.cooldown);

    await updateGameSave(u);
    const sign = action.relDelta >= 0 ? '+' : '';
    showFeedback(`✓ ${action.label}：${FACTION_LABEL[action.fkey]}关系${sign}${action.relDelta}，政绩+${meritSum}`, action.type !== '打压');
  };

  return (
    <>
      {FACTIONS.map(f => {
        const rel = relOf(save, f.key);
        const repLv = getRepLevel(rel);
        const isMyFaction = f.key === primary;
        const isLocked = !!primary && !isMyFaction;
        const isExp = expanded === f.key;
        const actions = FACTION_ACTIONS.filter(a => a.fkey === f.key);

        return (
          <View key={f.key} style={{ backgroundColor: '#fff', borderTopWidth: 3, borderTopColor: f.headerColor, borderWidth: 1, borderColor: '#E5E5E5', marginBottom: 8 }}>
            <Pressable onPress={() => setExpanded(isExp ? null : f.key)} style={{ padding: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 16 }}>{f.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Text style={{ color: '#222', fontSize: 12, fontWeight: '700' }}>{f.name}</Text>
                    {isMyFaction && <View style={{ backgroundColor: f.headerColor, paddingHorizontal: 4, paddingVertical: 1 }}><Text style={{ color: '#FFD700', fontSize: 7, fontWeight: '700' }}>主派</Text></View>}
                    {isLocked && <Text style={{ color: '#C62828', fontSize: 8 }}>已站队·禁止接触</Text>}
                  </View>
                  <Text style={{ color: '#888', fontSize: 9, marginTop: 1 }}>L{repLv} {REP_LABELS[repLv as keyof typeof REP_LABELS]}  ·  {f.tagline}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: f.accentColor, fontSize: 16, fontWeight: '700' }}>{rel}</Text>
                  <Text style={{ color: '#888', fontSize: 9 }}>{isExp ? '▲' : '▼'}</Text>
                </View>
              </View>
              <View style={{ marginTop: 8 }}>
                <RelBar value={rel} color={f.accentColor} />
              </View>
            </Pressable>

            {isExp && (
              <View style={{ borderTopWidth: 1, borderTopColor: '#F0F0F0', padding: 12 }}>
                {/* 声望特权预览 */}
                <Text style={{ fontSize: 9, color: '#888', marginBottom: 6 }}>
                  {[1, 2, 3, 4].map(lv =>
                    `L${lv}${repLv >= lv ? '✓' : '○'} ${REP_PERKS[lv]}`
                  ).join('  ·  ')}
                </Text>
                {/* 关系行动 */}
                {isLocked ? (
                  <View style={{ backgroundColor: '#FFF3E0', borderWidth: 1, borderColor: '#FFB300', padding: 10 }}>
                    <Text style={{ color: '#E65100', fontSize: 11, fontWeight: '700' }}>🔒 已站队 · 禁止接触</Text>
                    <Text style={{ color: '#555', fontSize: 10, marginTop: 4, lineHeight: 15 }}>
                      加入本派后，其他派系行动入口锁定。如需接触，请使用 Tab 1「暗中接触」高风险入口（政绩 500，存在暴露风险）。
                    </Text>
                  </View>
                ) : actions.filter(a => a.minRank <= (save.rankLevel ?? 0)).map(action => {
                  const cd = save.factionCooldowns ?? {};
                  const cooling = isCooldownActive(cd, action.key, save.gameDays);
                  const left = cooling ? cooldownRemaining(cd, action.key, save.gameDays) : 0;
                  return (
                    <View key={action.key} style={{ marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', paddingBottom: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                        <View style={{ backgroundColor: action.type === '打压' ? '#FFEBEE' : '#E3F2FD', paddingHorizontal: 4, paddingVertical: 1 }}>
                          <Text style={{ fontSize: 8, color: action.type === '打压' ? '#C62828' : '#1565C0', fontWeight: '700' }}>{action.type}</Text>
                        </View>
                        <Text style={{ flex: 1, color: '#222', fontSize: 11, fontWeight: '600' }}>{action.label}</Text>
                        {cooling && <CooldownBadge days={left} />}
                      </View>
                      <Text style={{ color: '#666', fontSize: 10, lineHeight: 15, marginBottom: 6 }}>{action.desc}</Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 9, color: '#999' }}>
                          关系{action.relDelta >= 0 ? '+' : ''}{action.relDelta} · 冷却{action.cooldown}天 · 风险{action.riskLevel}
                        </Text>
                        <ActionBtn label="执行" onPress={() => doAction(action)} disabled={cooling} color={action.type === '打压' ? '#C62828' : f.accentColor} />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
      {/* §3.9 跨派临时联盟 */}
      {primary && (
        <View style={{ backgroundColor: '#fff', borderTopWidth: 3, borderTopColor: '#6A1B9A', borderWidth: 1, borderColor: '#E5E5E5', padding: 12, marginTop: 4 }}>
          <Text style={{ color: '#6A1B9A', fontSize: 12, fontWeight: '700' }}>🤝 跨派临时联盟</Text>
          <Text style={{ color: '#888', fontSize: 9, marginTop: 3, lineHeight: 14 }}>
            与主派关系均 ≥50 的派系可缔结 60 天联盟（政绩 500，local×reform 互斥需 1000）。联盟内派系在晋升投票/斗争记票中合并票数；同盟期间个人职位战 sYou +{Math.round(COALITION_CONTEST_BONUS * 100)}%，结契时双方关系互惠提升。
          </Text>
          {getActiveCoalitions(save.coalitions ?? [], save.gameDays).map((c, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F3E5F5', padding: 8, marginTop: 6 }}>
              <Text style={{ color: '#4A148C', fontSize: 10, fontWeight: '600' }}>{FACTION_SHORT[c.a]} ⟷ {FACTION_SHORT[c.b]}</Text>
              <Text style={{ color: '#7B1FA2', fontSize: 10 }}>剩 {Math.max(0, c.endDay - save.gameDays)} 天</Text>
            </View>
          ))}
          {FACTIONS.filter(f => f.key !== primary).map(f => {
            const canForm = canFormCoalition(primary as FactionId, f.key) && relOf(save, primary as FactionId) >= 50 && relOf(save, f.key) >= 50;
            const isMutual = (primary === 'local' && f.key === 'reform') || (primary === 'reform' && f.key === 'local');
            const cost = isMutual ? 1000 : 500;
            return (
              <Pressable key={f.key} disabled={!canForm || (save.meritPoints ?? 0) < cost}
                onPress={async () => {
                  if ((save.meritPoints ?? 0) < cost) { showFeedback(`政绩不足，需 ${cost}`, false); return; }
                  const next = [...(save.coalitions ?? []), { a: primary as FactionId, b: f.key, endDay: save.gameDays + 60 }];
                  // C. 结契互惠：双方关系小幅提升
                  const boostA = applyRelDeltaToSave(save, primary as FactionId, COALITION_FORM_RELATION_BOOST);
                  const boostB = applyRelDeltaToSave(save, f.key, COALITION_FORM_RELATION_BOOST);
                  await updateGameSave({ meritPoints: Math.max(0, (save.meritPoints ?? 0) - cost), coalitions: next, ...boostA, ...boostB });
                  showFeedback(`✓ 与${FACTION_LABEL[f.key]}缔结联盟（−${cost} 政绩，60 天，双方关系+${COALITION_FORM_RELATION_BOOST}）`, true);
                }}
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', opacity: canForm ? 1 : 0.4 }}>
                <View>
                  <Text style={{ color: '#333', fontSize: 11, fontWeight: '600' }}>{f.icon} {f.name}</Text>
                  <Text style={{ color: '#999', fontSize: 9 }}>关系 {relOf(save, f.key)} · {canForm ? `政绩 ${cost}` : '关系不足'}</Text>
                </View>
                <View style={{ backgroundColor: canForm ? '#6A1B9A' : '#ccc', paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>缔结</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </>
  );
}
// ═══════════════════════════════════════════════════════════
function Tab3Policy({ save, updateGameSave, showFeedback }: { save: any; updateGameSave: (u: any) => Promise<void>; showFeedback: (m: string, ok?: boolean) => void }) {
  const doStance = async (p: PolicyStance) => {
    const cd = save.factionCooldowns ?? {};
    if (isCooldownActive(cd, p.key, save.gameDays)) {
      showFeedback(`冷却中，还需 ${cooldownRemaining(cd, p.key, save.gameDays)} 天`, false); return;
    }
    const u: Record<string, any> = {};
    for (const e of p.effects) Object.assign(u, applyRelDelta(save, e.fkey, e.delta));
    if (p.merit)           u.meritPoints    = clamp((save.meritPoints ?? 0) + p.merit, 0, 9999);
    if (p.gdpDelta)        u.cityGdp        = clamp((save.cityGdp ?? 50) + p.gdpDelta);
    if (p.livelihoodDelta) u.cityLivelihood = clamp((save.cityLivelihood ?? 50) + p.livelihoodDelta);
    // 收益累积 factionInfluence（§2.3）
    u.factionInfluence = clamp((save.factionInfluence ?? 0) + 2);
    u.factionCooldowns = setCooldown(cd, p.key, save.gameDays, p.cooldown);
    await updateGameSave(u);
    const gains = p.effects.filter(e => e.delta > 0).map(e => `${FACTION_SHORT[e.fkey]}+${e.delta}`).join(' ');
    const losses = p.effects.filter(e => e.delta < 0).map(e => `${FACTION_SHORT[e.fkey]}${e.delta}`).join(' ');
    showFeedback(`✓「${p.title}」：${gains}${losses ? '  ' + losses : ''}  政绩+${p.merit}`, true);
  };

  return (
    <>
      {POLICY_STANCES.map(p => {
        const cd = save.factionCooldowns ?? {};
        const cooling = isCooldownActive(cd, p.key, save.gameDays);
        const left = cooling ? cooldownRemaining(cd, p.key, save.gameDays) : 0;
        return (
          <SectionCard key={p.key}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#222', fontSize: 12, fontWeight: '700', marginBottom: 2 }}>{p.title}</Text>
                <Text style={{ color: '#666', fontSize: 10 }}>{p.subtitle}</Text>
              </View>
              {cooling && <CooldownBadge days={left} />}
            </View>
            <Text style={{ color: '#555', fontSize: 10, lineHeight: 15, marginBottom: 8 }}>{p.background}</Text>
            {/* 效果矩阵 */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
              {p.effects.map(e => (
                <View key={e.fkey} style={{ backgroundColor: e.delta > 0 ? '#E8F5E9' : '#FFEBEE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 }}>
                  <Text style={{ fontSize: 9, color: e.delta > 0 ? '#2E7D32' : '#C62828', fontWeight: '700' }}>
                    {FACTION_SHORT[e.fkey]}{e.delta > 0 ? '+' : ''}{e.delta}
                  </Text>
                </View>
              ))}
              <View style={{ backgroundColor: '#E3F2FD', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 }}>
                <Text style={{ fontSize: 9, color: '#1565C0', fontWeight: '700' }}>政绩+{p.merit}</Text>
              </View>
            </View>
            <View style={{ backgroundColor: '#FFF8E1', borderLeftWidth: 3, borderLeftColor: '#F9A825', padding: 7, marginBottom: 10 }}>
              <Text style={{ color: '#5D4037', fontSize: 9, lineHeight: 14 }}>⚠ {p.risk}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: '#999', fontSize: 9 }}>冷却 {p.cooldown} 天  ·  GDP{p.gdpDelta >= 0 ? '+' : ''}{p.gdpDelta}  ·  民生{p.livelihoodDelta >= 0 ? '+' : ''}{p.livelihoodDelta}</Text>
              <ActionBtn label="发表表态" onPress={() => doStance(p)} disabled={cooling} color="#2B4B6F" />
            </View>
          </SectionCard>
        );
      })}
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 4 — 派系委托（§3.1）
// ═══════════════════════════════════════════════════════════
function Tab4Commissions({ save }: { save: any }) {
  const primary = save.primaryFaction as FactionId | '';
  const cfg = FACTIONS.find(f => f.key === primary);

  const DUMMY_COMMISSIONS: Record<FactionId, { title: string; desc: string; reward: string; deadline: number }[]> = {
    reform: [
      { title: '自贸区政策调研报告', desc: '完成一份自贸区制度创新调研，提交发改委评审。', reward: '关系+15，政绩+30', deadline: 90 },
      { title: '营商环境优化白皮书', desc: '联合改革派撰写营商环境报告，对标国际标准。', reward: '关系+12，政绩+25，GDP+3', deadline: 120 },
    ],
    pragmatic: [
      { title: '党建示范点验收报告', desc: '完成辖区党建示范工程验收并撰写汇报材料。', reward: '关系+15，政绩+28', deadline: 60 },
      { title: '意识形态安全工作汇报', desc: '开展网络舆情专项整治并向上级汇报成效。', reward: '关系+10，政绩+20', deadline: 90 },
    ],
    cyl: [
      { title: '青年就业帮扶专项计划', desc: '策划落地青年创业帮扶计划，并上报团系系统。', reward: '关系+15，政绩+22，民生+5', deadline: 90 },
      { title: '基层群众满意度调研', desc: '入户走访并形成群众工作调研报告。', reward: '关系+12，政绩+18', deadline: 60 },
    ],
    techno: [
      { title: '数字政府建设项目推进', desc: '推动数字政务系统升级，完成验收并提交总结。', reward: '关系+15，政绩+30，GDP+5', deadline: 120 },
      { title: '科研经费使用审计报告', desc: '配合科技部完成专项科研经费审计，保障合规。', reward: '关系+10，政绩+20，情报+5', deadline: 75 },
    ],
    local: [
      { title: '基建项目阶段性推进报告', desc: '完成辖区重点基建项目阶段目标并汇报进展。', reward: '关系+15，政绩+25，GDP+4', deadline: 90 },
      { title: '土地整备专项行动总结', desc: '推进土地整备工作并上报整备成效。', reward: '关系+12，政绩+20', deadline: 75 },
    ],
  };

  if (!primary || !cfg) {
    return (
      <SectionCard>
        <SLabel text="派系委托" />
        <Text style={{ color: '#888', fontSize: 11, textAlign: 'center', padding: 20 }}>请先在「我的派系」Tab 加入一个派系以解锁委托。</Text>
      </SectionCard>
    );
  }

  const commissions = DUMMY_COMMISSIONS[primary] ?? [];

  return (
    <>
      <SectionCard accent={cfg.headerColor}>
        <SLabel text={`${cfg.name} 派系委托`} />
        <Text style={{ color: '#555', fontSize: 10, lineHeight: 16, marginBottom: 10 }}>
          主派每 30 天生成 0–1 条新委托（上限 5 条）。完成给主派关系+、政绩+；超时给关系−、政绩扣减。委托完成度计入声望等级。
        </Text>
        {commissions.map((c, i) => (
          <View key={i} style={{ backgroundColor: '#F8F8F8', padding: 10, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: cfg.accentColor }}>
            <Text style={{ color: '#222', fontSize: 12, fontWeight: '700', marginBottom: 4 }}>{c.title}</Text>
            <Text style={{ color: '#555', fontSize: 10, lineHeight: 15, marginBottom: 6 }}>{c.desc}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#2E7D32', fontSize: 9, fontWeight: '700' }}>{c.reward}</Text>
              <Text style={{ color: '#888', fontSize: 9 }}>期限：{c.deadline} 天</Text>
            </View>
          </View>
        ))}
        <View style={{ backgroundColor: '#FFF3E0', padding: 8, borderRadius: 2 }}>
          <Text style={{ color: '#E65100', fontSize: 9, lineHeight: 14 }}>
            ℹ 委托完整后端逻辑将在后续阶段接入 tasks 系统（§3.1 / §7·步骤 4）。当前展示示例委托。
          </Text>
        </View>
      </SectionCard>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 5 — 声望特权树（§2.2 / §3.5）
// ═══════════════════════════════════════════════════════════
function Tab5RepTree({ save }: { save: any }) {
  return (
    <>
      {FACTIONS.map(f => {
        const rel = relOf(save, f.key);
        const lv = getRepLevel(rel);
        const isPrimary = save.primaryFaction === f.key;
        return (
          <SectionCard key={f.key} accent={f.headerColor}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Text style={{ fontSize: 16 }}>{f.icon}</Text>
              <Text style={{ flex: 1, color: '#222', fontSize: 12, fontWeight: '700' }}>{f.name}</Text>
              {isPrimary && <View style={{ backgroundColor: f.headerColor, paddingHorizontal: 5, paddingVertical: 2 }}><Text style={{ color: '#FFD700', fontSize: 8, fontWeight: '700' }}>主派</Text></View>}
              <Text style={{ color: f.accentColor, fontSize: 13, fontWeight: '700' }}>L{lv} / L4</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
              {[0, 1, 2, 3, 4].map(l => (
                <View key={l} style={{ flex: 1, alignItems: 'center' }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: lv >= l ? f.accentColor : '#E5E5E5', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                    <Text style={{ color: lv >= l ? '#fff' : '#bbb', fontSize: 10, fontWeight: '700' }}>L{l}</Text>
                  </View>
                  <Text style={{ color: '#666', fontSize: 7, textAlign: 'center' }}>
                    {l === 0 ? '陌路' : l === 1 ? '相识' : l === 2 ? '同道' : l === 3 ? '心腹' : '核心'}
                  </Text>
                </View>
              ))}
            </View>
            <View style={{ gap: 5 }}>
              {[1, 2, 3, 4].map(l => (
                <View key={l} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, opacity: lv >= l ? 1 : 0.4 }}>
                  <Text style={{ fontSize: 10, color: lv >= l ? '#FFD700' : '#bbb', fontWeight: '700' }}>L{l}</Text>
                  <Text style={{ flex: 1, color: lv >= l ? '#222' : '#999', fontSize: 10, lineHeight: 15 }}>
                    {REP_PERKS[l]}
                    {l === 4 && isPrimary && lv < 4 ? `（需关系≥80，当前${rel}）` : ''}
                  </Text>
                </View>
              ))}
            </View>
          </SectionCard>
        );
      })}
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 6 — 路线斗争事件（§3.2）
// ═══════════════════════════════════════════════════════════
function Tab6LineStruggle({ save, updateGameSave, showFeedback }: { save: any; updateGameSave: (u: any) => Promise<void>; showFeedback: (m: string, ok?: boolean) => void }) {
  // 判断是否触发（任意两派 relation 差 ≥30）
  const pairs: [FactionId, FactionId, number][] = [];
  for (let i = 0; i < ALL_FACTIONS.length; i++) {
    for (let j = i + 1; j < ALL_FACTIONS.length; j++) {
      const diff = Math.abs(relOf(save, ALL_FACTIONS[i]) - relOf(save, ALL_FACTIONS[j]));
      if (diff >= 30) pairs.push([ALL_FACTIONS[i], ALL_FACTIONS[j], diff]);
    }
  }
  const triggered = pairs.length > 0;
  const topPair = pairs.sort((a, b) => b[2] - a[2])[0];

  const doChoice = async (choice: 'a' | 'b' | 'mediate') => {
    if (!topPair) return;
    const [fa, fb] = topPair;
    const u: Record<string, any> = {};
    if (choice === 'a') {
      Object.assign(u, applyRelDelta(save, fa, 15));
      Object.assign(u, applyRelDelta(save, fb, -10));
      u.meritPoints = clamp((save.meritPoints ?? 0) - 500, 0, 9999);
      showFeedback(`✓ 站队${FACTION_SHORT[fa]}：关系+15，${FACTION_SHORT[fb]}−10，政绩−500`, true);
    } else if (choice === 'b') {
      Object.assign(u, applyRelDelta(save, fb, 15));
      Object.assign(u, applyRelDelta(save, fa, -10));
      u.meritPoints = clamp((save.meritPoints ?? 0) - 500, 0, 9999);
      showFeedback(`✓ 站队${FACTION_SHORT[fb]}：关系+15，${FACTION_SHORT[fa]}−10，政绩−500`, true);
    } else {
      Object.assign(u, applyRelDelta(save, fa, 3));
      Object.assign(u, applyRelDelta(save, fb, 3));
      u.factionInfluence = clamp((save.factionInfluence ?? 0) - 5);
      showFeedback('和稀泥：两派各+3，但影响力−5（骑墙）', true);
    }
    u.factionCooldowns = setCooldown(save.factionCooldowns ?? {}, 'line_struggle', save.gameDays, 14);
    await updateGameSave(u);
  };

  const isInCooldown = isCooldownActive(save.factionCooldowns ?? {}, 'line_struggle', save.gameDays);

  return (
    <>
      {!triggered ? (
        <SectionCard>
          <SLabel text="路线斗争事件" />
          <Text style={{ color: '#888', fontSize: 11, textAlign: 'center', padding: 20 }}>
            当前五派关系差均 {'<'}30，暂无路线斗争事件。{'\n'}触发条件：任意两派 relation 差 ≥30。
          </Text>
        </SectionCard>
      ) : (
        <SectionCard accent="#C62828">
          <SLabel text="⚡ 路线斗争事件触发" />
          <Text style={{ color: '#222', fontSize: 13, fontWeight: '700', marginBottom: 6 }}>
            {topPair && `${FACTION_LABEL[topPair[0]]} vs ${FACTION_LABEL[topPair[1]]}`}
          </Text>
          <Text style={{ color: '#555', fontSize: 10, lineHeight: 16, marginBottom: 10 }}>
            两派路线分歧激化（差距 {topPair?.[2]} 点），要求你在关键会议上表态。{'\n'}
            政绩成本：500（§2.3 标准起步价）
          </Text>
          {isInCooldown ? (
            <View style={{ backgroundColor: '#F5F5F5', padding: 10, alignItems: 'center' }}>
              <Text style={{ color: '#888', fontSize: 11 }}>等待下次事件 · 冷却 {cooldownRemaining(save.factionCooldowns ?? {}, 'line_struggle', save.gameDays)} 天</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {topPair && (
                <>
                  <ActionBtn label={`站队 ${FACTION_LABEL[topPair[0]]} · 关系+15，−10另派 (−500政绩)`} color={FACTION_BG[topPair[0]]} onPress={() => doChoice('a')} disabled={(save.meritPoints ?? 0) < 500} />
                  <ActionBtn label={`站队 ${FACTION_LABEL[topPair[1]]} · 关系+15，−10另派 (−500政绩)`} color={FACTION_BG[topPair[1]]} onPress={() => doChoice('b')} disabled={(save.meritPoints ?? 0) < 500} />
                  <ActionBtn label="和稀泥 · 两派各+3，影响力−5（无政绩成本）" color="#607D8B" onPress={() => doChoice('mediate')} />
                </>
              )}
            </View>
          )}
        </SectionCard>
      )}
      {/* 历史 */}
      <SectionCard>
        <SLabel text="历史路线日志" />
        <Text style={{ color: '#aaa', fontSize: 10, textAlign: 'center', padding: 10 }}>（历史日志接入 §3.2 事件总线后展示）</Text>
      </SectionCard>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 7 — 领导班子合力（§3.4 / §4.3）
// ═══════════════════════════════════════════════════════════
function Tab7Band({ save }: { save: any }) {
  // 使用 leadershipBand 数据（若存在）
  const band: { faction?: FactionId }[] = save.leadershipBand ?? [];
  const factionList: FactionId[] = band.map(m => m.faction).filter(Boolean) as FactionId[];
  const synergy = factionList.length > 0 ? calcBandSynergy(factionList) : 1.0;

  // 统计各派占比
  const countMap: Partial<Record<FactionId, number>> = {};
  for (const f of factionList) countMap[f] = (countMap[f] ?? 0) + 1;

  const synergyDesc = synergy >= 1.1 ? (synergy >= 1.15 ? '同派团结（同质风险↑）' : '跨派均衡（抗风险）') : '严重对立（内耗）';

  return (
    <>
      <SectionCard>
        <SLabel text="班子派系合力（bandSynergy）" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <Text style={{ fontSize: 36, fontWeight: '700', color: synergy >= 1.0 ? '#2E7D32' : '#C62828' }}>
            {synergy.toFixed(2)}
          </Text>
          <View>
            <Text style={{ color: '#222', fontSize: 12, fontWeight: '700' }}>× calcBandBonus</Text>
            <Text style={{ color: '#888', fontSize: 10, marginTop: 2 }}>{synergyDesc}</Text>
          </View>
        </View>
        <Text style={{ color: '#555', fontSize: 10, lineHeight: 16 }}>
          同派≥60%→1.15（团结但脆弱）  均衡→1.10  严重对立（差&gt;40%）→0.85{'\n'}
          派系斗争失败会清除败派班子成员，系数随权力格局实时重算（§3.11④）。
        </Text>
      </SectionCard>

      <SectionCard>
        <SLabel text="班子派系构成" />
        {factionList.length === 0 ? (
          <Text style={{ color: '#aaa', fontSize: 10, textAlign: 'center', padding: 12 }}>班子数据加载中（需接入 leadership.tsx §4.3）</Text>
        ) : (
          <>
            {ALL_FACTIONS.map(f => {
              const cnt = countMap[f] ?? 0;
              const pct = factionList.length > 0 ? cnt / factionList.length : 0;
              return (
                <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Text style={{ color: '#333', fontSize: 11, width: 50 }}>{FACTION_SHORT[f]}</Text>
                  <View style={{ flex: 1, height: 10, backgroundColor: '#E5E5E5', borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ height: 10, width: `${pct * 100}%`, backgroundColor: FACTION_COLOR[f], borderRadius: 3 }} />
                  </View>
                  <Text style={{ color: '#555', fontSize: 10, width: 40, textAlign: 'right' }}>{cnt}人 ({(pct * 100).toFixed(0)}%)</Text>
                </View>
              );
            })}
          </>
        )}
      </SectionCard>

      <SectionCard>
        <SLabel text="四大班子 chair 派系（§4.6）" />
        <Text style={{ color: '#888', fontSize: 10, lineHeight: 16 }}>
          四大班子 chair 带 factionId；玩家在四大班子的行动若与 chair 同派，meritGain ×1.15。{'\n'}
          后续阶段将读取 leadership.tsx 中 buildFourOrgans() 数据，本页暂显接口说明。
        </Text>
      </SectionCard>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 8 — 政绩工程（§3.12）
// ═══════════════════════════════════════════════════════════
function Tab8Projects({ save, updateGameSave, showFeedback }: { save: any; updateGameSave: (u: any) => Promise<void>; showFeedback: (m: string, ok?: boolean) => void }) {
  const primary = save.primaryFaction as FactionId | '';
  const PROJECTS: Record<FactionId, { title: string; cityBoost: string; meritReturn: number; desc: string }> = {
    reform:    { title: '自贸区专项试点工程', cityBoost: 'GDP +8, 招商 +10', meritReturn: 1000, desc: '认领改革派旗舰项目，GDP 与招商引资双提升，对立派上司可能扣好感。' },
    pragmatic: { title: '维稳专项行动', cityBoost: '稳定指数 +10, 治安 +5', meritReturn: 800, desc: '认领国家系旗舰项目，稳定与治安大幅提升，改革派上司可能扣好感。' },
    cyl:       { title: '民生实事三联计划', cityBoost: '医疗 +8, 教育 +8, 民生 +6', meritReturn: 900, desc: '认领团系旗舰项目，三大民生指标同步提升，对技官系上司影响中性。' },
    techno:    { title: '数字政府基础设施工程', cityBoost: 'GDP +6, 数字治理 +12', meritReturn: 950, desc: '认领技官系旗舰项目，数字治理大幅提升并带动 GDP，地方派上司可能有异议。' },
    local:     { title: '土地整备与基建推进', cityBoost: '财政 +10, GDP +5', meritReturn: 850, desc: '认领地方派旗舰项目，财政与 GDP 提升，但长期 integrity 承压（§4.7）。' },
  };

  if (!primary) {
    return (
      <SectionCard>
        <SLabel text="政绩工程" />
        <Text style={{ color: '#888', fontSize: 11, textAlign: 'center', padding: 20 }}>请先加入派系以解锁主派专属政绩工程。</Text>
      </SectionCard>
    );
  }

  const proj = PROJECTS[primary];
  const coolKey = `merit_proj_${primary}`;
  const cd = save.factionCooldowns ?? {};
  const cooling = isCooldownActive(cd, coolKey, save.gameDays);
  const left = cooling ? cooldownRemaining(cd, coolKey, save.gameDays) : 0;

  return (
    <>
      <SectionCard accent={FACTION_BG[primary]}>
        <SLabel text={`${FACTION_SHORT[primary as FactionId]} 专属政绩工程`} />
        <Text style={{ color: '#222', fontSize: 14, fontWeight: '700', marginBottom: 6 }}>{proj.title}</Text>
        <Text style={{ color: '#555', fontSize: 10, lineHeight: 16, marginBottom: 8 }}>{proj.desc}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <View>
            <Text style={{ color: '#888', fontSize: 9 }}>城市指标</Text>
            <Text style={{ color: '#2E7D32', fontSize: 11, fontWeight: '700' }}>{proj.cityBoost}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#888', fontSize: 9 }}>政绩回报（双倍）</Text>
            <Text style={{ color: '#1565C0', fontSize: 11, fontWeight: '700' }}>+{proj.meritReturn}</Text>
          </View>
        </View>
        <View style={{ backgroundColor: '#FFF3E0', borderLeftWidth: 3, borderLeftColor: '#F57C00', padding: 8, marginBottom: 10 }}>
          <Text style={{ color: '#555', fontSize: 9, lineHeight: 14 }}>
            成本：政绩 500（§2.3 起步价）认领后 120 天交付，届时获双倍政绩回报+{proj.meritReturn}，提前退出关系−10、政绩−200。
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          {cooling && <CooldownBadge days={left} />}
          <ActionBtn
            label={cooling ? `冷却中（${left}天）` : '认领（−500 政绩）'}
            color={FACTION_BG[primary]}
            disabled={cooling || (save.meritPoints ?? 0) < 500}
            onPress={async () => {
              const u: Record<string, any> = {
                meritPoints: clamp((save.meritPoints ?? 0) - 500, 0, 9999),
                factionCooldowns: setCooldown(cd, coolKey, save.gameDays, 120),
              };
              Object.assign(u, applyRelDelta(save, primary, 8));
              await updateGameSave(u);
              showFeedback(`✓ 已认领「${proj.title}」，120 天后交付可得政绩+${proj.meritReturn}`, true);
            }}
          />
        </View>
      </SectionCard>
      <SectionCard>
        <SLabel text="全局联动说明" />
        <Text style={{ color: '#666', fontSize: 10, lineHeight: 16 }}>
          政绩工程认领后直接走 updateCityMetric / 政绩结算（§4.7），把"派系色彩"注入政绩系统。对立派上司会因此扣好感（§4.4），迫使"先理顺派系关系、再推政绩工程"。
        </Text>
      </SectionCard>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 9 — 策略面板（§3.13 游说 / §3.15 舆论 / §3.16 输送）
// ═══════════════════════════════════════════════════════════
function Tab9Strategy({ save, updateGameSave, showFeedback }: { save: any; updateGameSave: (u: any) => Promise<void>; showFeedback: (m: string, ok?: boolean) => void }) {
  const cd = save.factionCooldowns ?? {};

  const doLobby = async (fkey: FactionId) => {
    if (isCooldownActive(cd, `lobby_${fkey}`, save.gameDays)) { showFeedback('游说冷却中', false); return; }
    if ((save.factionIntelligence ?? 0) < 40) { showFeedback('情报不足（需≥40）', false); return; }
    if ((save.meritPoints ?? 0) < 1000) { showFeedback('政绩不足（需 1000）', false); return; }
    const u: Record<string, any> = {
      meritPoints: clamp((save.meritPoints ?? 0) - 1000, 0, 9999),
      factionCooldowns: setCooldown(cd, `lobby_${fkey}`, save.gameDays, 120),
    };
    Object.assign(u, applyRelDelta(save, fkey, 8));
    await updateGameSave(u);
    showFeedback(`✓ 向${FACTION_LABEL[fkey]}游说，下轮政策触发权重+1.5×，关系+8，政绩−1000`, true);
  };

  const doMedia = async () => {
    if (isCooldownActive(cd, 'media_war', save.gameDays)) { showFeedback('舆论战冷却中', false); return; }
    if ((save.meritPoints ?? 0) < 500) { showFeedback('政绩不足（需 500）', false); return; }
    const u: Record<string, any> = {
      meritPoints: clamp((save.meritPoints ?? 0) - 500, 0, 9999),
      cityLivelihood: clamp((save.cityLivelihood ?? 50) + 3),
      factionInfluence: clamp((save.factionInfluence ?? 0) + 5),
      factionCooldowns: setCooldown(cd, 'media_war', save.gameDays, 30),
    };
    await updateGameSave(u);
    showFeedback('✓ 舆论攻势发动：民生+3，影响力+5，政绩−500', true);
  };

  const doPatronage = async () => {
    if (isCooldownActive(cd, 'patronage', save.gameDays)) { showFeedback('资源输送冷却中', false); return; }
    const u: Record<string, any> = {
      fundBalance: clamp((save.fundBalance ?? 0) + 200000),
      factionInfluence: clamp((save.factionInfluence ?? 0) + 3),
      purgeCount: (save.purgeCount ?? 0) + 0, // 累积落马风险（后期接入落马结局）
      factionCooldowns: setCooldown(cd, 'patronage', save.gameDays, 60),
    };
    await updateGameSave(u);
    showFeedback('⚠ 已接收资源输送：资金+20万，影响力+3，但落马风险账目留痕（§3.16）', false);
  };

  return (
    <>
      {/* 政策游说 */}
      <SectionCard accent="#1565C0">
        <SLabel text="派系游说全国政策（§3.13）" />
        <Text style={{ color: '#555', fontSize: 10, lineHeight: 16, marginBottom: 10 }}>
          成本：政绩 1000（策略级）+ 情报 ≥40。推动下轮政策池中本派 favoredFaction 运动触发权重 +1.5×（持续一个周期）。
        </Text>
        <View style={{ gap: 8 }}>
          {ALL_FACTIONS.map(f => {
            const cooling = isCooldownActive(cd, `lobby_${f}`, save.gameDays);
            const left2 = cooling ? cooldownRemaining(cd, `lobby_${f}`, save.gameDays) : 0;
            return (
              <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 12 }}>{FACTIONS.find(x => x.key === f)?.icon}</Text>
                <Text style={{ flex: 1, color: '#333', fontSize: 11 }}>{FACTION_LABEL[f]} 政策游说</Text>
                {cooling ? <CooldownBadge days={left2} /> : <ActionBtn label="-1000政绩" color="#1565C0" onPress={() => doLobby(f)} />}
              </View>
            );
          })}
        </View>
      </SectionCard>

      {/* 舆论战 */}
      <SectionCard accent="#2E7D32">
        <SLabel text="派系舆论战（§3.15）" />
        <Text style={{ color: '#555', fontSize: 10, lineHeight: 16, marginBottom: 10 }}>
          成本：政绩 500。在本派媒体发动叙事，提升治安/民心指标，激怒对立派（关系−）。与 §4.7 城市指标形成"舆论—指标—派系"闭环。
        </Text>
        {isCooldownActive(cd, 'media_war', save.gameDays) ? (
          <CooldownBadge days={cooldownRemaining(cd, 'media_war', save.gameDays)} />
        ) : (
          <ActionBtn label="发动舆论攻势（−500 政绩）" color="#2E7D32" onPress={doMedia} disabled={(save.meritPoints ?? 0) < 500} />
        )}
      </SectionCard>

      {/* 资源输送 */}
      <SectionCard accent="#C62828">
        <SLabel text="资源输送·落马风险（§3.16）" />
        <Text style={{ color: '#555', fontSize: 10, lineHeight: 16, marginBottom: 6 }}>
          接受资源输送获得短期 finance↑，但账目留痕，落马结局触发概率随输送量累积上升。对立派在清洗/斗争得势时将直接触发落马。
        </Text>
        <View style={{ backgroundColor: '#FFEBEE', padding: 8, marginBottom: 10 }}>
          <Text style={{ color: '#C62828', fontSize: 9, fontWeight: '700' }}>当前累积次数：{save.purgeCount ?? 0} · 落马风险随次数线性增长</Text>
        </View>
        {isCooldownActive(cd, 'patronage', save.gameDays) ? (
          <CooldownBadge days={cooldownRemaining(cd, 'patronage', save.gameDays)} />
        ) : (
          <ActionBtn label="接收资源输送（+20万资金，落马风险↑）" color="#C62828" onPress={doPatronage} />
        )}
      </SectionCard>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 10 — 情报下注（§2.3 / §3.3 / §3.7）
// ═══════════════════════════════════════════════════════════
function Tab10Intel({ save, updateGameSave, showFeedback }: { save: any; updateGameSave: (u: any) => Promise<void>; showFeedback: (m: string, ok?: boolean) => void }) {
  const intel = save.factionIntelligence ?? 0;
  const cd = save.factionCooldowns ?? {};
  const WINDS: Array<{ key: string; label: string }> = [
    { key: 'reform-heavy', label: '改革开放路线主导' },
    { key: 'pragmatic-heavy', label: '稳健国家路线主导' },
    { key: 'techno-surge', label: '技术官僚路线主导' },
    { key: 'local-crackdown', label: '地方纪律整肃路线' },
    { key: 'balanced', label: '路线均衡' },
  ];
  const [betWind, setBetWind] = useState<string>('');

  return (
    <>
      <SectionCard>
        <SLabel text="派系情报储量（§3.7）" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <Text style={{ fontSize: 32, fontWeight: '700', color: '#8A6800' }}>{intel}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#333', fontSize: 11 }}>情报 {intel} / 100</Text>
            <Text style={{ color: '#888', fontSize: 9, marginTop: 3 }}>
              来源：技官系关系/20 每旬自然增速 · 地方派线人建立{'\n'}
              用途：风向预测 · 降低清洗/斗争失败概率 · 降低暴露率
            </Text>
          </View>
        </View>
        <View style={{ height: 6, backgroundColor: '#E5E5E5', borderRadius: 3, overflow: 'hidden' }}>
          <View style={{ height: 6, width: `${intel}%`, backgroundColor: '#8A6800', borderRadius: 3 }} />
        </View>
        <Text style={{ color: '#888', fontSize: 9, marginTop: 5 }}>
          情报≥40 可游说（§3.13）· ≥50 可先发制人（§3.20）· ≥70 解锁风向预告
        </Text>
      </SectionCard>

      {/* 风向预告 */}
      <SectionCard>
        <SLabel text="中央风向预告（需情报≥70）" />
        {intel >= 70 ? (
          <Text style={{ color: '#2E7D32', fontSize: 11, fontWeight: '700' }}>
            据情报分析，下一周期风向大概率维持或向「{WIND_LABEL[save.politicalWind ?? 'balanced']}」漂移。（± 情报精度影响）
          </Text>
        ) : (
          <Text style={{ color: '#aaa', fontSize: 11 }}>情报不足（当前 {intel}，需≥70）· 请提升对技官系的关系以加快情报自然增速。</Text>
        )}
      </SectionCard>

      {/* 风向下注 */}
      <SectionCard>
        <SLabel text="政绩下注（§3.8 / §3.3）" />
        <Text style={{ color: '#555', fontSize: 10, lineHeight: 16, marginBottom: 10 }}>
          成本：政绩 500。押注下个风口周期主流派；押中：影响力+10，该派关系+8；押错：政绩作废（无返还）。
        </Text>
        <View style={{ gap: 6, marginBottom: 10 }}>
          {WINDS.map(w => (
            <Pressable key={w.key} onPress={() => setBetWind(w.key)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, backgroundColor: betWind === w.key ? '#E3F2FD' : '#F8F8F8', borderWidth: 1, borderColor: betWind === w.key ? '#1565C0' : '#E5E5E5' }}>
              <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: betWind === w.key ? '#1565C0' : '#bbb', backgroundColor: betWind === w.key ? '#1565C0' : '#fff' }} />
              <Text style={{ flex: 1, color: '#333', fontSize: 11 }}>{w.label}</Text>
            </Pressable>
          ))}
        </View>
        {isCooldownActive(cd, 'wind_bet', save.gameDays) ? (
          <CooldownBadge days={cooldownRemaining(cd, 'wind_bet', save.gameDays)} />
        ) : (
          <ActionBtn
            label={`下注「${WINDS.find(w => w.key === betWind)?.label ?? '请选择'}」（−500 政绩）`}
            color="#1565C0"
            disabled={!betWind || (save.meritPoints ?? 0) < 500}
            onPress={async () => {
              const win = betWind === (save.politicalWind ?? 'balanced');
              const u: Record<string, any> = {
                meritPoints: clamp((save.meritPoints ?? 0) - 500, 0, 9999),
                factionCooldowns: setCooldown(cd, 'wind_bet', save.gameDays, WIND_CYCLE_DAYS),
              };
              if (win) {
                u.factionInfluence = clamp((save.factionInfluence ?? 0) + 10);
                const dom = getDominantFaction(save.politicalWind ?? 'balanced');
                if (dom) Object.assign(u, applyRelDelta(save, dom, 8));
                showFeedback('✓ 押注正确！影响力+10，主流派关系+8', true);
              } else {
                showFeedback('✗ 押注失误，政绩 500 作废', false);
              }
              await updateGameSave(u);
              setBetWind('');
            }}
          />
        )}
      </SectionCard>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 11 — 派系斗争（§3.11 / §3.22 / §3.23）★ 旗舰
// ═══════════════════════════════════════════════════════════
type PrepOp = {
  key: 'proxy' | 'media' | 'discord' | 'preempt' | 'successor';
  label: string; cost: number; intelReq: number; needRank: number; needInfluence: number; sYou: number; desc: string;
};
const PREP_OPS: PrepOp[] = [
  { key: 'proxy', label: '代理人斗争', cost: 500, intelReq: 0, needRank: 0, needInfluence: 0, sYou: 5, desc: '部署下属为代理人，+5 S_you/次' },
  { key: 'media', label: '舆论攻防', cost: 500, intelReq: 0, needRank: 0, needInfluence: 0, sYou: 3, desc: '发动舆论攻势，+3 S_you/次，民生+3' },
  { key: 'discord', label: '离间·破袭联盟', cost: 1000, intelReq: 40, needRank: 0, needInfluence: 0, sYou: 4, desc: '瓦解对手联盟，+4 S_you/次，需情报≥40' },
  { key: 'preempt', label: '先发制人', cost: 1000, intelReq: 50, needRank: 0, needInfluence: 0, sYou: 8, desc: '抢先出手，+8 S_you/次，需情报≥50' },
  { key: 'successor', label: '接班人之争', cost: 500, intelReq: 0, needRank: 11, needInfluence: 60, sYou: 6, desc: '部署接班人，+6 S_you/次，需L4正职+影响力≥60' },
];

function Tab11Struggle({ save, updateGameSave, showFeedback }: { save: any; updateGameSave: (u: any) => Promise<void>; showFeedback: (m: string, ok?: boolean) => void }) {
  const phase = (save.strugglePhase ?? 'idle') as string;
  const phaseInfo = PHASE_LABEL[phase] ?? PHASE_LABEL.idle;
  const daysElapsed = save.gameDays - (save.lastWindCycleDay ?? 0);
  const remaining = Math.max(0, WIND_CYCLE_DAYS - daysElapsed);
  const inMobilize = isInMobilizationPeriod(save.gameDays, save.lastWindCycleDay ?? 0);
  const dominant = save.dominantFaction as FactionId | null;
  const primary = save.primaryFaction as FactionId | '';
  const history: any[] = save.struggleHistory ?? [];
  const [bandSynergy, setBandSynergy] = useState(1);
  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      const band = await getNpcBand(save.id);
      const bf: FactionId[] = [];
      for (const m of band) { if (m.faction) bf.push(m.faction); }
      if (active) setBandSynergy(calcBandSynergy(bf));
    })();
    return () => { active = false; };
  }, [save.id]));

  const cd = save.factionCooldowns ?? {};
  const intel = save.factionIntelligence ?? 0;
  const prep = save.strugglePrep ?? {};
  // S_you 预估（完整公式 §3.11③：含班子合力、政绩杠杆、情报 + 战前部署）
  const rel = relOf(save, primary as FactionId);
  const sYou = primary
    ? calcSYou({
        relation: getRelationFromSave(save),
        supportFaction: primary as FactionId,
        factionInfluence: save.factionInfluence ?? 0,
        bandSynergy,
        meritInvested: 500,
        factionIntelligence: save.factionIntelligence ?? 0,
      }) + prepBonus(prep)
    : 0;
  const multiFFA = isMultiFactionFreeForAll(getRelationFromSave(save), save.factionInfluence ?? 0);
  const resetPrep = { proxy: 0, media: 0, discord: 0, preempt: 0, successor: 0 };

  const doPrep = async (op: PrepOp) => {
    if (isCooldownActive(cd, `prep_${op.key}`, save.gameDays)) { showFeedback(`${op.label}冷却中`, false); return; }
    if ((save.meritPoints ?? 0) < op.cost) { showFeedback(`政绩不足（需 ${op.cost}）`, false); return; }
    if (op.intelReq && intel < op.intelReq) { showFeedback(`情报不足（需≥${op.intelReq}）`, false); return; }
    if (op.needRank && (save.rankLevel ?? 1) < op.needRank) { showFeedback('职级不足（需L4正职）', false); return; }
    if (op.needInfluence && (save.factionInfluence ?? 0) < op.needInfluence) { showFeedback(`影响力不足（需≥${op.needInfluence}）`, false); return; }
    const u: Record<string, any> = {
      meritPoints: clamp((save.meritPoints ?? 0) - op.cost, 0, 9999),
      strugglePrep: { ...prep, [op.key]: (prep[op.key] ?? 0) + 1 },
      factionCooldowns: setCooldown(cd, `prep_${op.key}`, save.gameDays, 30),
    };
    if (op.key === 'media') u.cityLivelihood = clamp((save.cityLivelihood ?? 50) + 3);
    await updateGameSave(u);
    showFeedback(`✓ ${op.label}部署成功（+${op.sYou} S_you）`, true);
  };

  const doChooseStance = async (stance: 'defend' | 'attack' | 'neutral') => {
    if (phase !== 'active' && phase !== 'mobilize') { showFeedback('当前非斗争期，无法行动', false); return; }
    if ((save.meritPoints ?? 0) < 500) { showFeedback('政绩不足（需≥500 作为斗争下注）', false); return; }
    // v6：使用确定性伪随机（day + stance hash），保证同存档同日结果可复现
    let seed = save.gameDays;
    for (const c of stance) seed = ((seed << 5) - seed + c.charCodeAt(0)) >>> 0;
    const rand = ((seed * 1664525 + 1013904223) >>> 0) / 0xffffffff;
    const sOppBase = 50 + rand * 20 - 10;
    const sOpp = multiFFA ? sOppBase * 1.2 : sOppBase;
    const win = sYou >= sOpp;
    const u: Record<string, any> = {
      meritPoints: clamp((save.meritPoints ?? 0) - 500, 0, 9999),
      strugglePhase: 'truce',
      factionPromotionLocked: false,
      strugglePrep: resetPrep,
    };
    const newHistory = [...history, { period: daysElapsed, side: stance === 'neutral' ? null : primary, result: win ? 'win' : 'lose', sYou: sYou.toFixed(1), sOpp: sOpp.toFixed(1), ffa: multiFFA }];
    u.struggleHistory = newHistory;
    if (stance === 'neutral') {
      u.factionInfluence = clamp((save.factionInfluence ?? 0) - 5);
      showFeedback('中立观望：影响力−5，无 rank 变化，骑墙各方皆失信任', true);
    } else if (win) {
      // v6：胜利走标准结算（applyFactionWin），不再直接改 rankLevel，避免绕过晋升门控
      Object.assign(u, applyFactionWin(save));
      u.factionInfluence = clamp((save.factionInfluence ?? 0) + 15);
      showFeedback(`✓ 斗争胜利！影响力+15${multiFFA ? '（多方混战险胜）' : ''}，晋升冻结解除`, true);
    } else {
      // v6：失败走标准惩罚（applyFactionLossPenalty，含 lastPromotionCycleId），不再直接改 rankLevel
      Object.assign(u, applyFactionLossPenalty(save, save.gameDays));
      showFeedback(`⚠ 斗争失败（S_you ${sYou.toFixed(1)} < ${sOpp.toFixed(1)}）：影响力−${FACTION_LOSS_INFLUENCE_PENALTY}，民心−${FACTION_LOSS_SUPPORT_PENALTY}，失势冻结 ${FACTION_LOSS_SETBACK_DAYS} 天`, false);
    }
    await updateGameSave(u);
  };

  return (
    <>
      {/* 斗争阶段横幅 */}
      <View style={{ backgroundColor: phaseInfo.color, padding: 14, marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{phaseInfo.label}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>{remaining} 天后下次斗争</Text>
        </View>
        {phase === 'active' && (
          <View style={{ backgroundColor: 'rgba(0,0,0,0.2)', marginTop: 8, padding: 6 }}>
            <Text style={{ color: '#FFD700', fontSize: 12, fontWeight: '700' }}>⚔ 交战期 · 晋升冻结中</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10 }}>handlePromote 已短路，rankLevel 锁定至斗争结算（§3.22 / §4.2⑧）</Text>
          </View>
        )}
        {inMobilize && phase === 'idle' && (
          <View style={{ backgroundColor: 'rgba(0,0,0,0.2)', marginTop: 8, padding: 6 }}>
            <Text style={{ color: '#FFD700', fontSize: 12, fontWeight: '700' }}>⚡ 动员期进入 · 囤积准备</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10 }}>距离 1825 天边界 ≤60 天，可提前囤积代理人/情报/联盟折算进 S_you</Text>
          </View>
        )}
      </View>

      {/* S_you 预估 */}
      <SectionCard>
        <SLabel text="你方斗争力 S_you 预估（§3.11③ / §3.17–§3.21）" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 32, fontWeight: '700', color: '#1565C0' }}>{sYou.toFixed(1)}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#333', fontSize: 10, lineHeight: 16 }}>
              = 关系×0.5 + 影响力×0.3 + 班子合力×20({bandSynergy.toFixed(2)}) + 政绩杠杆×0.2 + 情报×0.1 + 战前部署({prepBonus(prep)}){'\n'}
              对手 S_opp ≈ 基础实力×随机(0.85–1.15){multiFFA ? ' · 多方混战 +20%' : ''}
            </Text>
          </View>
        </View>
        <View style={{ height: 6, backgroundColor: '#E5E5E5', borderRadius: 3, overflow: 'hidden', marginTop: 8 }}>
          <View style={{ height: 6, width: `${Math.min(100, sYou)}%`, backgroundColor: '#1565C0', borderRadius: 3 }} />
        </View>
      </SectionCard>

      {/* 战前部署（§3.17–§3.21，折算进 S_you） */}
      {phase !== 'truce' && (
        <SectionCard accent="#6A1B9A">
          <SLabel text="战前部署（§3.17–§3.21，折算进 S_you）" />
          <Text style={{ color: '#555', fontSize: 10, lineHeight: 16, marginBottom: 10 }}>
            动员期囤积代理人/舆论/情报/接班人，每项增加 S_you，结算后清零。{multiFFA ? '⚠ 检测到多方混战格局，S_opp +20%' : ''}
          </Text>
          {PREP_OPS.map(op => {
            const cooling = isCooldownActive(cd, `prep_${op.key}`, save.gameDays);
            const left = cooling ? cooldownRemaining(cd, `prep_${op.key}`, save.gameDays) : 0;
            const locked = (op.intelReq && intel < op.intelReq) || (op.needRank && (save.rankLevel ?? 1) < op.needRank) || (op.needInfluence && (save.factionInfluence ?? 0) < op.needInfluence);
            return (
              <View key={op.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#333', fontSize: 11, fontWeight: '600' }}>{op.label} <Text style={{ color: '#6A1B9A', fontSize: 10 }}>×{prep[op.key] ?? 0}</Text></Text>
                  <Text style={{ color: '#888', fontSize: 9, marginTop: 2 }}>{op.desc}</Text>
                </View>
                {cooling ? <CooldownBadge days={left} /> : (
                  <ActionBtn label={`−${op.cost}`} color={locked ? '#ccc' : '#6A1B9A'} onPress={() => doPrep(op)} disabled={locked || (save.meritPoints ?? 0) < op.cost} />
                )}
              </View>
            );
          })}
        </SectionCard>
      )}

      {/* 三选一操作 */}
      <SectionCard accent={phase === 'active' ? '#C62828' : '#607D8B'}>
        <SLabel text="斗争站队（§3.11②）" />
        {(phase === 'active' || phase === 'mobilize') ? (
          <>
            <Text style={{ color: '#555', fontSize: 10, lineHeight: 16, marginBottom: 10 }}>
              成本：政绩 500（§2.3 斗争下注起步价）。当前主流派：{dominant ? FACTION_LABEL[dominant] : '均势'}
            </Text>
            <View style={{ gap: 8 }}>
              <ActionBtn label="守擂主流派（押当前主流派继续得势）" color="#2E7D32" onPress={() => doChooseStance('defend')} disabled={(save.meritPoints ?? 0) < 500} />
              <ActionBtn label="攻擂挑战派（押本派翻盘上位）" color="#1565C0" onPress={() => doChooseStance('attack')} disabled={(save.meritPoints ?? 0) < 500} />
              <ActionBtn label="中立观望（无保护 · 影响力−5）" color="#607D8B" onPress={() => doChooseStance('neutral')} />
            </View>
            <View style={{ backgroundColor: '#FFEBEE', padding: 8, marginTop: 8 }}>
              <Text style={{ color: '#C62828', fontSize: 9, fontWeight: '700' }}>失败后果预告</Text>
              <Text style={{ color: '#555', fontSize: 9, lineHeight: 14 }}>
                轻度：rankLevel−1，影响力−15{'\n'}
                重度（大败/L4核心/政绩枯竭）：rankLevel−3 或撤职{'\n'}
                若同时 purgeCount≥2 且 integrity 偏低 → 落马结局
              </Text>
            </View>
          </>
        ) : phase === 'truce' ? (
          <Text style={{ color: '#888', fontSize: 11, textAlign: 'center', padding: 12 }}>🕊 休战期（60 天内禁止新斗争）· 修复关系、重整班子</Text>
        ) : (
          <Text style={{ color: '#888', fontSize: 11, textAlign: 'center', padding: 12 }}>平稳期 · 距下次斗争还有 {remaining} 天{remaining <= 60 ? '（动员期即将开始）' : ''}</Text>
        )}
      </SectionCard>

      {/* 斗争战报历史 */}
      {history.length > 0 && (
        <SectionCard>
          <SLabel text="斗争战报（§3.24）" />
          {history.slice(-5).reverse().map((h, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
              <View style={{ width: 40, height: 20, backgroundColor: h.result === 'win' ? '#E8F5E9' : '#FFEBEE', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: h.result === 'win' ? '#2E7D32' : '#C62828' }}>{h.result === 'win' ? '胜' : h.result === null ? '中立' : '败'}</Text>
              </View>
              <Text style={{ flex: 1, color: '#555', fontSize: 10, lineHeight: 16 }}>
                第 {h.period} 天周期  S:{h.sYou} vs {h.sOpp}  {h.side ? FACTION_SHORT[h.side as FactionId] ?? h.side : '中立'}
              </Text>
            </View>
          ))}
        </SectionCard>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 12 — 人脉图谱（§9.2）
// ═══════════════════════════════════════════════════════════
function Tab12Network({ save }: { save: any }) {
  const primary = save.primaryFaction as FactionId | '';
  // 从存档中读取主要 NPC（上司、下属）的派系归属
  const bossName = save.bossSuperiorName ?? save.bossName ?? '';
  const networkGraph: any[] = save.factionEchoLog ?? [];

  return (
    <>
      <SectionCard>
        <SLabel text="政治人脉图谱（§9.2）" />
        <Text style={{ color: '#555', fontSize: 10, lineHeight: 16, marginBottom: 10 }}>
          把 hashNameToFaction 派发的全体 NPC（上司/下属/班子成员/四大班子 chair）渲染成力导向关系图：节点=人物、颜色=派系、边=上下级关系。
        </Text>
        {/* 简化展示：按派系分组 */}
        {ALL_FACTIONS.map(f => {
          const isPlayerFaction = f === primary;
          return (
            <View key={f} style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: FACTION_COLOR[f] }} />
              <Text style={{ color: '#333', fontSize: 11, flex: 1 }}>{FACTION_LABEL[f]}</Text>
              {isPlayerFaction && <View style={{ backgroundColor: FACTION_BG[f], paddingHorizontal: 4, paddingVertical: 2 }}><Text style={{ color: '#FFD700', fontSize: 8 }}>主派</Text></View>}
            </View>
          );
        })}
        <View style={{ backgroundColor: '#F8F8F8', padding: 10, marginTop: 8, alignItems: 'center' }}>
          <Text style={{ color: '#888', fontSize: 10, textAlign: 'center', lineHeight: 16 }}>
            力导向图谱将在后续版本渲染（需 react-native-svg 支持）{'\n'}
            当前展示各派系 NPC 分布，斗争复盘后自动重绘
          </Text>
        </View>
      </SectionCard>
      {bossName ? (
        <SectionCard>
          <SLabel text="上司派系" />
          <Text style={{ color: '#333', fontSize: 12 }}>
            {bossName}（{FACTION_LABEL[(() => {
              let h = 0; for (const c of bossName) h = (h * 31 + c.charCodeAt(0)) >>> 0;
              return ALL_FACTIONS[h % 5];
            })()]}）
          </Text>
        </SectionCard>
      ) : null}
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 13 — 结局预览（§4.8）
// ═══════════════════════════════════════════════════════════
function Tab13Endings({ save }: { save: any }) {
  const influence = save.factionInfluence ?? 0;
  const purge = save.purgeCount ?? 0;
  const primary = save.primaryFaction as FactionId | '';
  const rel = primary ? relOf(save, primary) : 0;
  const repLv = primary ? getRepLevel(rel) : 0;
  const isLocked = save.factionlessLocked ?? false;

  const tracks = [
    {
      key: 'core', title: '核心圈层', icon: '👑', color: '#D4AF37',
      desc: '主派 L4 且影响力≥80，或派系斗争中胜出并主导风口。',
      progress: Math.min(100, (repLv === 4 ? 50 : 0) + (influence >= 80 ? 50 : Math.floor(influence / 80 * 50))),
      achieved: repLv >= 4 && influence >= 80,
    },
    {
      key: 'balance', title: '平衡大师', icon: '⚖️', color: '#2E7D32',
      desc: '五派关系皆 40–70、无清洗、斗争中立不翻车，稳健终局。',
      progress: Math.min(100, ALL_FACTIONS.filter(f => relOf(save, f) >= 40 && relOf(save, f) <= 70).length * 20),
      achieved: ALL_FACTIONS.every(f => relOf(save, f) >= 40 && relOf(save, f) <= 70) && purge === 0,
    },
    {
      key: 'marginal', title: '被边缘化', icon: '🌫️', color: '#888',
      desc: '影响力<30，退居二线，无法晋升至更高级职位。',
      progress: influence < 30 ? 100 - Math.floor(influence / 30 * 100) : 0,
      achieved: false,
      risk: influence < 30,
    },
    {
      key: 'purge', title: '被清算/落马', icon: '⚠️', color: '#C62828',
      desc: '清洗触发≥2 次且无庇护，或派系斗争重度失败触发撤职→落马。',
      progress: Math.min(100, purge * 50 + (isLocked ? 30 : 0)),
      achieved: false,
      risk: purge >= 2 || isLocked,
    },
  ];

  return (
    <>
      <SectionCard>
        <SLabel text="当前风险指标" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { label: '被清洗次数', value: `${purge} 次`, danger: purge >= 2 },
            { label: '派系影响力', value: `${influence}`, danger: influence < 30 },
            { label: '主派声望', value: primary ? `L${repLv}` : '无派系', danger: isLocked || !primary },
          ].map(s => (
            <View key={s.label} style={{ flex: 1, backgroundColor: s.danger ? '#FFEBEE' : '#F8F8F8', padding: 10, alignItems: 'center' }}>
              <Text style={{ color: s.danger ? '#C62828' : '#222', fontSize: 16, fontWeight: '700' }}>{s.value}</Text>
              <Text style={{ color: '#888', fontSize: 9, marginTop: 2, textAlign: 'center' }}>{s.label}</Text>
            </View>
          ))}
        </View>
      </SectionCard>
      {tracks.map(t => (
        <SectionCard key={t.key} accent={t.color}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Text style={{ fontSize: 20 }}>{t.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#222', fontSize: 12, fontWeight: '700' }}>{t.title}</Text>
              {t.achieved && <Text style={{ color: t.color, fontSize: 9, fontWeight: '700' }}>🎯 条件已满足</Text>}
              {(t as any).risk && !t.achieved && <Text style={{ color: '#C62828', fontSize: 9, fontWeight: '700' }}>⚠ 风险路径激活</Text>}
            </View>
            <Text style={{ color: t.color, fontSize: 16, fontWeight: '700' }}>{t.progress}%</Text>
          </View>
          <View style={{ height: 6, backgroundColor: '#E5E5E5', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
            <View style={{ height: 6, width: `${t.progress}%`, backgroundColor: t.color, borderRadius: 3 }} />
          </View>
          <Text style={{ color: '#555', fontSize: 10, lineHeight: 15 }}>{t.desc}</Text>
        </SectionCard>
      ))}
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab14 玩法：派系委托执行 / 密谋行动 / 叛逃换系 + 位置棋盘（§二新增）
// ═══════════════════════════════════════════════════════════
function Tab14Gameplay({ save, updateGameSave, showFeedback }: { save: any; updateGameSave: (u: any) => Promise<void>; showFeedback: (m: string, ok?: boolean) => void }) {
  const [boardVisible, setBoardVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [subView, setSubView] = useState<'mandates' | 'covert' | 'defect'>('mandates');

  const primary = save.primaryFaction as FactionId | '';
  const mandates = (save.factionMandates ?? []) as FactionMandate[];
  const activeMandates = mandates.filter((m: FactionMandate) => m.status === 'active');
  const meritPoints = save.meritPoints ?? 0;
  const exposedCount = save.covertExposedCount ?? 0;
  const setback = isInSetback(save);
  const defectCooldownLeft = Math.max(0, (save.defectCooldownUntilDay ?? 0) - save.gameDays);

  // 密谋操作
  const handleCovertOp = async (type: CovertOpRecord['type'], targetFaction: FactionId) => {
    if (busy) return;
    setBusy(true);
    try {
      const { updates, exposed, message } = attemptCovertOp(save, type, targetFaction, save.gameDays);
      if (!updates || Object.keys(updates).length === 0) {
        showFeedback(message, false);
        return;
      }
      await updateGameSave(updates);
      showFeedback(message, !exposed);
    } finally {
      setBusy(false);
    }
  };

  // 委托操作
  const handleMandate = async (mandateId: string, accept: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      const updates = accept
        ? applyMandateComplete(save, mandateId)
        : applyMandateReject(save, mandateId, save.gameDays);
      if (!updates || Object.keys(updates).length === 0) return;
      await updateGameSave(updates);
      showFeedback(accept ? '✓ 委托完成，奖励已发放' : '已拒绝委托，本派关系受损（90 天冷却）', accept);
    } finally {
      setBusy(false);
    }
  };

  // 叛逃操作
  const handleDefect = async (target: FactionId) => {
    if (busy) return;
    setBusy(true);
    try {
      const reason = canDefect(save, target, save.gameDays);
      if (reason) {
        showFeedback(reason, false);
        return;
      }
      const updates = applyDefection(save, target, save.gameDays);
      await updateGameSave(updates);
      showFeedback(`已叛逃至${FACTION_LABEL[target]}（-100 政绩 · 365 天冷却 · 本周期冻结晋升）`, true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* 位置棋盘入口 */}
      <Pressable onPress={() => setBoardVisible(true)} style={{ backgroundColor: '#1D3A5C', padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ color: '#8eb4d8', fontSize: 9, letterSpacing: 2 }}>POSITION BOARD</Text>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>♟ 位置棋盘 · 派系席位控制图</Text>
          <Text style={{ color: '#6f94b8', fontSize: 9, marginTop: 2 }}>双轨胜利判定：控制度过半 或 攻克枢纽席位</Text>
        </View>
        <Text style={{ color: '#FFD700', fontSize: 18 }}>›</Text>
      </Pressable>

      {/* 子视图切换 */}
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', marginBottom: 10 }}>
        {([['mandates', '📋 委托'], ['covert', '🎭 密谋'], ['defect', '🔄 叛逃']] as const).map(([k, label]) => (
          <Pressable key={k} onPress={() => setSubView(k)} style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: subView === k ? '#E8EDF5' : 'transparent' }}>
            <Text style={{ fontSize: 11, fontWeight: subView === k ? '700' : '400', color: subView === k ? '#1D3B5E' : '#888' }}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {/* ── 委托执行 ── */}
      {subView === 'mandates' && (
        <>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D3B5E', letterSpacing: 1, marginBottom: 8 }}>
            派系委托（每政治年刷新 1-2 个 · 完成奖励功绩 +25~35）
          </Text>
          {activeMandates.length === 0 ? (
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 20, marginBottom: 6 }}>📭</Text>
              <Text style={{ fontSize: 12, color: '#888' }}>暂无进行中的委托</Text>
              <Text style={{ fontSize: 10, color: '#aaa', marginTop: 4 }}>每政治年（365 天）本派将自动生成新委托</Text>
            </View>
          ) : activeMandates.map((m: FactionMandate) => (
            <View key={m.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 12, marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <View style={{ width: 8, height: 8, backgroundColor: FACTION_COLOR[m.faction] }} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A', flex: 1 }}>{m.title}</Text>
                <Text style={{ fontSize: 9, color: '#999' }}>第 {m.year} 年</Text>
              </View>
              <Text style={{ fontSize: 11, color: '#555', lineHeight: 16, marginBottom: 8 }}>{m.desc}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                <View style={{ flex: 1, backgroundColor: '#E8F5E9', padding: 6 }}>
                  <Text style={{ fontSize: 9, color: '#2E7D32' }}>奖励：关系+{m.reward.relation} 影响+{m.reward.influence} 经费+{m.reward.treasury} 功绩+{m.reward.merit || '25~35'}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#FFEBEE', padding: 6 }}>
                  <Text style={{ fontSize: 9, color: '#C62828' }}>拒绝：关系{m.penalty.relation} · 冷却 90 天</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable onPress={() => handleMandate(m.id, true)} disabled={busy} style={{ flex: 1, backgroundColor: busy ? '#ccc' : '#2a7a3b', paddingVertical: 10, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓ 完成委托</Text>
                </Pressable>
                <Pressable onPress={() => handleMandate(m.id, false)} disabled={busy} style={{ flex: 1, backgroundColor: busy ? '#ccc' : '#C62828', paddingVertical: 10, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✗ 拒绝委托</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </>
      )}

      {/* ── 密谋行动 ── */}
      {subView === 'covert' && (
        <>
          <View style={{ backgroundColor: '#FFF8F0', borderWidth: 1, borderColor: '#E8D9B0', padding: 10, marginBottom: 10 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#B8860B', marginBottom: 4 }}>🎭 密谋行动规则</Text>
            <Text style={{ fontSize: 10, color: '#666', lineHeight: 15 }}>
              每次密谋消耗 {COVERT_MERIT_COST} 政绩点（当前 {meritPoints}）；被针对（isFlagged）时暴露率×1.5；累计暴露 {EXPOSURE_CASE_THRESHOLD} 次触发纪委立案。{'\n'}已暴露 {exposedCount}/{EXPOSURE_CASE_THRESHOLD} 次{save.isFlagged ? ' · ⚠ 已立案（行动效果 -50%）' : ''}
            </Text>
          </View>
          {(['report', 'discord', 'proxy', 'preempt'] as const).map(type => {
            const labels: Record<string, { name: string; desc: string }> = {
              report:   { name: '举报信', desc: '向上级举报目标派系干部违纪问题' },
              discord:  { name: '离间计', desc: '散布消息离间目标派系内部关系' },
              proxy:    { name: '代理人', desc: '安插代理人渗透目标派系核心圈' },
              preempt:  { name: '先发制人', desc: '抢先掌握目标派系把柄以备要挟' },
            };
            return (
              <View key={type} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 12, marginBottom: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 }}>{labels[type].name}</Text>
                <Text style={{ fontSize: 10, color: '#888', marginBottom: 8 }}>{labels[type].desc} · 消耗 {COVERT_MERIT_COST} 政绩</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {ALL_FACTIONS.filter(f => f !== primary).map(f => (
                    <Pressable
                      key={f}
                      onPress={() => handleCovertOp(type, f)}
                      disabled={busy || meritPoints < COVERT_MERIT_COST}
                      style={{
                        backgroundColor: busy || meritPoints < COVERT_MERIT_COST ? '#E5E5E5' : FACTION_COLOR[f] + '22',
                        borderWidth: 1,
                        borderColor: FACTION_COLOR[f],
                        paddingHorizontal: 10,
                        paddingVertical: 7,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '600', color: meritPoints < COVERT_MERIT_COST ? '#999' : FACTION_COLOR[f] }}>
                        对{FACTION_SHORT[f]}派执行
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            );
          })}
        </>
      )}

      {/* ── 叛逃换系 ── */}
      {subView === 'defect' && (
        <>
          <View style={{ backgroundColor: '#FFF8F0', borderWidth: 1, borderColor: '#E8D9B0', padding: 10, marginBottom: 10 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#B8860B', marginBottom: 4 }}>🔄 叛逃换系规则</Text>
            <Text style={{ fontSize: 10, color: '#666', lineHeight: 15 }}>
              消耗 {DEFECT_MERIT_COST} 政绩点（当前 {meritPoints}）；旧派关系压底 20、影响力-20；新派基线 40；进入 365 天冷却；本周期晋升冻结。{'\n'}
              失势期/立案期/冷却期禁叛逃；目标派声望需 ≥L2；不得投奔死敌（关系 ≤-2）。
            </Text>
          </View>
          {setback && (
            <View style={{ backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: '#EF9A9A', padding: 10, marginBottom: 8 }}>
              <Text style={{ fontSize: 11, color: '#C62828', fontWeight: '600' }}>⚠ 失势期内禁止叛逃（R1 限制）</Text>
            </View>
          )}
          {defectCooldownLeft > 0 && (
            <View style={{ backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: '#EF9A9A', padding: 10, marginBottom: 8 }}>
              <Text style={{ fontSize: 11, color: '#C62828', fontWeight: '600' }}>⚠ 叛逃冷却中（剩余 {defectCooldownLeft} 天）</Text>
            </View>
          )}
          {ALL_FACTIONS.filter(f => f !== primary).map(f => {
            const reason = canDefect(save, f, save.gameDays);
            const ok = reason === null;
            const rel = getRelationFromSave(save)[f] ?? 0;
            const rep = getRepLevel(rel);
            const matrixVal = primary ? (FACTION_RELATION_MATRIX[primary as FactionId]?.[f] ?? 0) : 0;
            const isDeadEnemy = matrixVal <= -2;
            return (
              <View key={f} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: ok ? FACTION_COLOR[f] : '#D9D9D9', padding: 12, marginBottom: 8, opacity: ok ? 1 : 0.6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: FACTION_COLOR[f] }} />
                  <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: '#1A1A1A' }}>{FACTION_LABEL[f]}</Text>
                  {isDeadEnemy ? (
                    <View style={{ backgroundColor: '#FFEBEE', paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 9, color: '#C62828', fontWeight: '700' }}>💀 死敌</Text>
                    </View>
                  ) : (
                    <Text style={{ fontSize: 10, color: '#888' }}>声望 L{rep} · 关系 {rel}</Text>
                  )}
                </View>
                <Text style={{ fontSize: 10, color: reason ? '#C62828' : '#2E7D32', marginTop: 6, marginBottom: 8 }}>
                  {ok ? '✓ 可叛逃' : `✗ ${reason}`}
                </Text>
                <Pressable
                  onPress={() => handleDefect(f)}
                  disabled={!ok || busy}
                  style={{ backgroundColor: ok && !busy ? FACTION_COLOR[f] : '#E5E5E5', paddingVertical: 10, alignItems: 'center' }}
                >
                  <Text style={{ color: ok ? '#fff' : '#999', fontSize: 12, fontWeight: '700' }}>叛逃至本派（-100 政绩）</Text>
                </Pressable>
              </View>
            );
          })}
        </>
      )}

      {/* 位置棋盘弹窗 */}
      <PositionBoard
        visible={boardVisible}
        onClose={() => setBoardVisible(false)}
        save={save}
        targetSeatKey={(save.promotionContest as PromotionContest | null)?.positionKey ?? null}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// 主组件
// ═══════════════════════════════════════════════════════════
const TABS = [
  { key: 'overview',    label: '总览' },
  { key: 'join',        label: '我的派' },
  { key: 'relations',   label: '关系' },
  { key: 'policy',      label: '政见' },
  { key: 'commissions', label: '委托' },
  { key: 'reptree',     label: '声望树' },
  { key: 'linestruggle',label: '路线' },
  { key: 'band',        label: '班子' },
  { key: 'projects',    label: '工程' },
  { key: 'strategy',    label: '策略' },
  { key: 'intel',       label: '情报' },
  { key: 'struggle',    label: '斗争' },
  { key: 'prestige',    label: '声望' },
  { key: 'gameplay',    label: '玩法' },
  { key: 'network',     label: '图谱' },
  { key: 'endings',     label: '结局' },
] as const;

type TabKey = typeof TABS[number]['key'];

// ══ v6 Tab：声望经济（A）+ 暗线举报（B） ════════════════════════════
function TabPrestige({ save, updateGameSave, showFeedback }: { save: any; updateGameSave: (u: any) => Promise<void>; showFeedback: (m: string, ok?: boolean) => void }) {
  const primary = save.primaryFaction as FactionId | '';
  const influence = save.factionInfluence ?? 0;
  const intel = save.factionIntelligence ?? 0;
  const immunity = save.setbackImmunity ?? 0;
  const cd = save.factionCooldowns ?? {};
  const day = save.gameDays;

  const reportable = ALL_FACTIONS.filter(f => f !== primary && isFactionReportable(save, f));
  const exposureProb = getInformExposureProb(save);

  const doImmunity = async () => {
    const res = buySetbackImmunity(save, day);
    if (!res.ok) { showFeedback(res.message, false); return; }
    await updateGameSave(res.updates);
    showFeedback(res.message, true);
  };

  const doAccelerate = async () => {
    const res = buyAccelerateContest(save, day);
    if (!res.ok) { showFeedback(res.message, false); return; }
    await updateGameSave(res.updates);
    showFeedback(res.message, true);
  };

  const doReport = async (faction: FactionId) => {
    const res = attemptInformReport(save, faction, day);
    await updateGameSave(res.updates);
    showFeedback(res.message, res.ok);
  };

  const immunityCd = cd[PRESTIGE_ECONOMY.immunity.cooldownKey] ?? 0;
  const accelCd = cd[PRESTIGE_ECONOMY.accelerate.cooldownKey] ?? 0;
  const reportCd = cd[INFORM_REPORT.cooldownKey] ?? 0;

  return (
    <>
      {/* 当前声望概览 */}
      <View style={{ backgroundColor: '#1D3A5C', padding: 14, marginBottom: 10 }}>
        <Text style={{ color: '#FFD700', fontSize: 14, fontWeight: '700', marginBottom: 6 }}>✦ 声望经济 · 暗线博弈</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: '#FFD700', fontSize: 10, fontWeight: '700' }}>影响力 {influence}</Text>
          </View>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: '#FFD700', fontSize: 10, fontWeight: '700' }}>情报 {intel}</Text>
          </View>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: '#FFD700', fontSize: 10, fontWeight: '700' }}>失势豁免 ×{immunity}</Text>
          </View>
        </View>
      </View>

      {/* A. 声望经济：兑换短期增益 */}
      <View style={{ backgroundColor: '#fff', borderTopWidth: 3, borderTopColor: '#C8A84B', borderWidth: 1, borderColor: '#E5E5E5', padding: 12, marginBottom: 10 }}>
        <Text style={{ color: '#8A6D1A', fontSize: 12, fontWeight: '700', marginBottom: 4 }}>💰 声望经济（用影响力兑换增益）</Text>
        <Text style={{ color: '#888', fontSize: 9, lineHeight: 14, marginBottom: 10 }}>
          影响力是派系核心资本。可兑换一次性失势豁免（抵消一次冻结），或加速个人职位战冷却。
        </Text>
        <Pressable
          disabled={!primary || influence < PRESTIGE_ECONOMY.immunity.influenceCost || immunityCd > day}
          onPress={doImmunity}
          style={{ backgroundColor: (!primary || influence < PRESTIGE_ECONOMY.immunity.influenceCost || immunityCd > day) ? '#ccc' : '#C8A84B', paddingVertical: 11, alignItems: 'center', marginBottom: 8 }}
        >
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
            {immunityCd > day ? `失势豁免冷却中（剩 ${immunityCd - day} 天）` : `兑换失势豁免（−${PRESTIGE_ECONOMY.immunity.influenceCost} 影响力）`}
          </Text>
        </Pressable>
        <Pressable
          disabled={!primary || influence < PRESTIGE_ECONOMY.accelerate.influenceCost || accelCd > day}
          onPress={doAccelerate}
          style={{ backgroundColor: (!primary || influence < PRESTIGE_ECONOMY.accelerate.influenceCost || accelCd > day) ? '#ccc' : '#1565C0', paddingVertical: 11, alignItems: 'center' }}
        >
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
            {accelCd > day ? `加速冷却中（剩 ${accelCd - day} 天）` : `加速争夺冷却（−${PRESTIGE_ECONOMY.accelerate.influenceCost} 影响力，缩短 ${PRESTIGE_ECONOMY.accelerate.shortenDays} 天）`}
          </Text>
        </Pressable>
      </View>

      {/* B. 暗线举报/纪检 */}
      <View style={{ backgroundColor: '#fff', borderTopWidth: 3, borderTopColor: '#C82829', borderWidth: 1, borderColor: '#E5E5E5', padding: 12, marginBottom: 10 }}>
        <Text style={{ color: '#C82829', fontSize: 12, fontWeight: '700', marginBottom: 4 }}>🕵 暗线举报 / 纪检</Text>
        <Text style={{ color: '#888', fontSize: 9, lineHeight: 14, marginBottom: 8 }}>
          当对手派系斗争力异常高（≥{INFORM_REPORT.powerThreshold}）时，可发起一次暗线举报削弱其关系值，成功则情报+功绩；但存在暴露风险（当前暴露率 {Math.round(exposureProb * 100)}%），暴露将增加风险值、损害本派关系。
        </Text>
        {reportable.length === 0 ? (
          <View style={{ backgroundColor: '#F5F5F5', padding: 10, alignItems: 'center' }}>
            <Text style={{ color: '#aaa', fontSize: 10 }}>暂无斗争力异常的对手派系可举报</Text>
          </View>
        ) : (
          reportable.map(f => (
            <Pressable
              key={f}
              disabled={reportCd > day}
              onPress={() => doReport(f)}
              style={{ backgroundColor: reportCd > day ? '#ccc' : '#C82829', paddingVertical: 11, alignItems: 'center', marginBottom: 6 }}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                {reportCd > day ? `举报冷却中（剩 ${reportCd - day} 天）` : `举报 ${FACTION_LABEL[f]} 派（削弱关系 ${INFORM_REPORT.weakenRelation}）`}
              </Text>
            </Pressable>
          ))
        )}
      </View>
    </>
  );
}

export default function FactionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [feedback, setFeedback] = useState('');
  const [feedbackOk, setFeedbackOk] = useState(true);

  if (!save) return null;

  const showFeedback = (msg: string, ok = true) => {
    setFeedback(msg);
    setFeedbackOk(ok);
    setTimeout(() => setFeedback(''), 4000);
  };

  const primary = save.primaryFaction as FactionId | '';
  const primaryCfg = FACTIONS.find(f => f.key === primary);
  const phase = (save.strugglePhase ?? 'idle') as string;
  const inMobilize = isInMobilizationPeriod(save.gameDays, save.lastWindCycleDay ?? 0);
  const struggling = phase === 'active';

  const doUpdate = async (u: any) => { await updateGameSave(u); };

  const tabProps = { save, updateGameSave: doUpdate, showFeedback };

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F3F0' }}>
      <StatusBar style="light" backgroundColor="#1D3A5C" />

      {/* 顶部 header */}
      <View style={{ backgroundColor: '#1D3A5C', paddingTop: insets.top + 6, paddingHorizontal: 0, paddingBottom: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 10, gap: 8 }}>
          <Pressable onPress={() => router.back()} style={{ paddingRight: 4 }}>
            <Text style={{ color: '#8eb4d8', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#8eb4d8', fontSize: 9, letterSpacing: 2 }}>POLITICAL FACTIONS · v2</Text>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>派系政治中心</Text>
          </View>
          {/* 主派徽章 */}
          {primaryCfg ? (
            <Pressable onPress={() => setActiveTab('join')}
              style={{ backgroundColor: primaryCfg.accentColor, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 12 }}>{primaryCfg.icon}</Text>
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{primaryCfg.short}</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => setActiveTab('join')}
              style={{ borderWidth: 1, borderColor: '#8eb4d8', paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: '#8eb4d8', fontSize: 9 }}>未加入 ›</Text>
            </Pressable>
          )}
          {/* 斗争/动员预警 */}
          {(struggling || inMobilize) && (
            <View style={{ backgroundColor: struggling ? '#C62828' : '#F57C00', paddingHorizontal: 6, paddingVertical: 3 }}>
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{struggling ? '⚔ 斗争中' : '⚡ 动员期'}</Text>
            </View>
          )}
        </View>

        {/* 14-Tab 横向滚动栏 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
          <View style={{ flexDirection: 'row', paddingHorizontal: 4 }}>
            {TABS.map(t => {
              const isActive = activeTab === t.key;
              const isAlert = (t.key === 'struggle' && (struggling || inMobilize));
              return (
                <Pressable key={t.key} onPress={() => setActiveTab(t.key)}
                  style={{ paddingHorizontal: 10, paddingVertical: 9, borderBottomWidth: 2, borderBottomColor: isActive ? '#FFD700' : 'transparent', marginHorizontal: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: isActive ? '700' : '400', color: isActive ? '#FFD700' : isAlert ? '#FFB300' : '#8eb4d8' }}>
                    {isAlert ? `${t.label}⚡` : t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* 反馈条 */}
      {!!feedback && (
        <View style={{ backgroundColor: feedbackOk ? '#e8f5e9' : '#fff3e0', borderBottomWidth: 1, borderBottomColor: feedbackOk ? '#a5d6a7' : '#ffcc80', paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
          <Text style={{ fontSize: 14 }}>{feedbackOk ? '✓' : '⚠'}</Text>
          <Text style={{ flex: 1, color: feedbackOk ? '#1b5e20' : '#e65100', fontSize: 11, fontWeight: '600', lineHeight: 17 }}>{feedback}</Text>
        </View>
      )}

      {/* 内容区 */}
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {activeTab === 'overview'     && <Tab0Overview     save={save} showFeedback={showFeedback} />}
        {activeTab === 'join'         && <Tab1Join         {...tabProps} />}
        {activeTab === 'relations'    && <Tab2Relations    {...tabProps} />}
        {activeTab === 'policy'       && <Tab3Policy       {...tabProps} />}
        {activeTab === 'commissions'  && <Tab4Commissions  save={save} />}
        {activeTab === 'reptree'      && <Tab5RepTree      save={save} />}
        {activeTab === 'linestruggle' && <Tab6LineStruggle {...tabProps} />}
        {activeTab === 'band'         && <Tab7Band         save={save} />}
        {activeTab === 'projects'     && <Tab8Projects     {...tabProps} />}
        {activeTab === 'strategy'     && <Tab9Strategy     {...tabProps} />}
        {activeTab === 'intel'        && <Tab10Intel       {...tabProps} />}
        {activeTab === 'struggle'     && <Tab11Struggle    {...tabProps} />}
        {activeTab === 'prestige'     && <TabPrestige      {...tabProps} />}
        {activeTab === 'gameplay'     && <Tab14Gameplay    {...tabProps} />}
        {activeTab === 'network'      && <Tab12Network     save={save} />}
        {activeTab === 'endings'      && <Tab13Endings     save={save} />}
      </ScrollView>
    </View>
  );
}
