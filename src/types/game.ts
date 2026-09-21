// 游戏核心类型定义

/** v5：个人争夺战模式 */
export type ContestMode = 'direct' | 'coalition';

export type AssessmentGrade = '特等' | '优秀' | '良好' | '合格' | '不合格';
export type TimeGranularity = '天' | '周' | '月';
export type TaskStatus = 'active' | 'completed' | 'failed' | 'expired';
export type CaseStatus = 'pending' | 'solving' | 'solved' | 'failed';
export type EventType = 'disaster' | 'corruption' | 'opinion' | 'economic' | 'security';
export type CaseType = 'criminal' | 'corruption' | 'drug' | 'fraud';
export type FactionType = 'reform' | 'pragmatic';
export type MarriageStatus = 'single' | 'married';
export type MemberType = 'spouse' | 'child';

// ============ 职级定义（对应华夏人民共和国公务员体系）============
export type RankConfig = {
  name: string;
  /** 行政职级（《公务员法》职级序列，用于档案和晋升页动态显示） */
  rankGrade: string;
  /** 法定职务类别说明（《地方组织法》依据，不超15字） */
  legalTitle: string;
  cityType: string;          // 城市层级描述
  requiredMerit: number;
  requiredTenureYears: number;
  maxTenureYears: number;
  randomCity: boolean;       // 晋升时是否随机换城市
  bossTitle: string;         // 直属上司职衔
  bossTitle2: string;        // 上司2职衔
  bossTitle3: string;        // 上司3职衔
  department: string;        // 所在单位
};

export const RANK_CONFIG: Record<number, RankConfig> = {
  // ── 乡科级 ──────────────────────────────────────────────────────────────
  1:  { name: '乡镇科员',            rankGrade: '科员级',    legalTitle: '综合管理类公务员',           cityType: '乡镇',    requiredMerit: 70,    requiredTenureYears: 2, maxTenureYears: 3, randomCity: false, bossTitle: '乡镇党委书记', bossTitle2: '乡镇长',       bossTitle3: '县委组织部长',      department: '乡镇人民政府' },
  2:  { name: '副乡镇长',            rankGrade: '副科级',    legalTitle: '乡镇政府副职领导成员',       cityType: '乡镇',    requiredMerit: 195,   requiredTenureYears: 2, maxTenureYears: 3, randomCity: false, bossTitle: '乡镇长',       bossTitle2: '乡镇党委书记',     bossTitle3: '县委书记',          department: '乡镇人民政府' },
  3:  { name: '乡镇长',              rankGrade: '正科级',    legalTitle: '乡镇政府行政首长',           cityType: '乡镇',    requiredMerit: 360,   requiredTenureYears: 3, maxTenureYears: 5, randomCity: false, bossTitle: '县委书记',     bossTitle2: '县长',         bossTitle3: '县委组织部长',      department: '乡镇人民政府' },
  // ── 县处级 ──────────────────────────────────────────────────────────────
  4:  { name: '县委常委/副县长',     rankGrade: '副处级',    legalTitle: '县级政府副职领导成员',       cityType: '县（区）', requiredMerit: 550,   requiredTenureYears: 3, maxTenureYears: 5, randomCity: false, bossTitle: '县长',         bossTitle2: '县委书记',     bossTitle3: '市委组织部长',      department: '县级人民政府' },
  5:  { name: '县长/区长',           rankGrade: '正处级',    legalTitle: '县级政府行政首长',           cityType: '县（区）', requiredMerit: 770,   requiredTenureYears: 3, maxTenureYears: 5, randomCity: true,  bossTitle: '市委书记',     bossTitle2: '市长',         bossTitle3: '县委书记',          department: '县级人民政府' },
  6:  { name: '县委书记/区委书记',   rankGrade: '正处级',    legalTitle: '县级党委书记',               cityType: '县（区）', requiredMerit: 1010,  requiredTenureYears: 3, maxTenureYears: 5, randomCity: true,  bossTitle: '市委书记',     bossTitle2: '市长',         bossTitle3: '省委组织部长',      department: '县委' },
  // ── 厅局级 ──────────────────────────────────────────────────────────────
  7:  { name: '副市长/市政府秘书长', rankGrade: '副厅级',    legalTitle: '地级市政府副职领导成员',     cityType: '地级市',  requiredMerit: 1275,  requiredTenureYears: 4, maxTenureYears: 5, randomCity: false, bossTitle: '市长',         bossTitle2: '市委书记',     bossTitle3: '省委组织部长',      department: '市人民政府' },
  8:  { name: '市长',                rankGrade: '正厅级',    legalTitle: '地级市政府行政首长',         cityType: '地级市',  requiredMerit: 1560,  requiredTenureYears: 4, maxTenureYears: 5, randomCity: true,  bossTitle: '省委书记',     bossTitle2: '省长',         bossTitle3: '市委书记',          department: '市人民政府' },
  9:  { name: '市委书记',            rankGrade: '正厅级',    legalTitle: '地级市党委书记',             cityType: '地级市',  requiredMerit: 1860,  requiredTenureYears: 4, maxTenureYears: 5, randomCity: true,  bossTitle: '省委书记',     bossTitle2: '省长',         bossTitle3: '中枢组织部副部长',  department: '市委' },
  // ── 省部级 ──────────────────────────────────────────────────────────────
  10: { name: '省长/副省长',         rankGrade: '副部级',    legalTitle: '省级政府副职领导成员',       cityType: '省级',    requiredMerit: 2180,  requiredTenureYears: 5, maxTenureYears: 5, randomCity: true,  bossTitle: '省委书记',     bossTitle2: '国政院副院理', bossTitle3: '中枢组织部长',      department: '省人民政府' },
  11: { name: '省委书记',            rankGrade: '正部级',    legalTitle: '省级党委书记',               cityType: '省级',    requiredMerit: 2515,  requiredTenureYears: 5, maxTenureYears: 5, randomCity: true,  bossTitle: '中枢组织部长', bossTitle2: '国政院院理', bossTitle3: '中枢政治局委员',    department: '省委' },
  12: { name: '国政院部长',          rankGrade: '正部级',    legalTitle: '国务院组成部门正职',         cityType: '国家级',  requiredMerit: 2860,  requiredTenureYears: 5, maxTenureYears: 5, randomCity: false, bossTitle: '国政院院理',   bossTitle2: '国政院副院理', bossTitle3: '国政院秘书长',      department: '国政院' },
  // ── 国家级 ──────────────────────────────────────────────────────────────
  13: { name: '国政院副院理',        rankGrade: '国家级副职', legalTitle: '国务院副职领导人',          cityType: '国家级',  requiredMerit: 3230,  requiredTenureYears: 5, maxTenureYears: 5, randomCity: false, bossTitle: '国政院院理',   bossTitle2: '中枢政治局常委', bossTitle3: '国政院秘书长',     department: '国政院' },
  14: { name: '国政院院理',          rankGrade: '国家级正职', legalTitle: '国务院正职领导人',          cityType: '国家级',  requiredMerit: 3610,  requiredTenureYears: 5, maxTenureYears: 5, randomCity: false, bossTitle: '中枢政治局常委', bossTitle2: '全国议政院议政委员长', bossTitle3: '中枢纪委书记', department: '国政院' },
  15: { name: '总执书记·华夏主席·中枢军委主席', rankGrade: '国家最高领导层', legalTitle: '党和国家最高领导职务', cityType: '国家级', requiredMerit: 4000, requiredTenureYears: 5, maxTenureYears: 10, randomCity: false, bossTitle: '中枢决策常委会', bossTitle2: '全国议政院常委会', bossTitle3: '中枢军委', department: '中共中央' },
};

/** 最高职级（达到后不再有晋升） */
export const MAX_RANK_LEVEL = 15;

/** 从配置表读取指定职级的行政职级名称 */
export function getRankGrade(rankLevel: number): string {
  return RANK_CONFIG[rankLevel]?.rankGrade ?? '未知职级';
}

/** 从配置表读取指定职级的法定职务类别说明 */
export function getLegalTitle(rankLevel: number): string {
  return RANK_CONFIG[rankLevel]?.legalTitle ?? '';
}


// ============ 城市池（按职级分层）============
export const CITY_POOLS: Record<string, string[]> = {
  乡镇: ['青河镇', '柳溪镇', '石桥镇', '双峰镇', '金沙镇', '桃园镇', '莲花镇', '银杏镇'],
  '县（区）': [
    '山东省章丘区', '山东省邹平市', '湖南省宁乡市', '湖南省浏阳市',
    '江苏省昆山市', '江苏省如皋市', '浙江省慈溪市', '浙江省义乌市',
    '广东省增城区', '广东省番禺区', '四川省简阳市', '河南省荥阳市',
    '安徽省肥西县', '福建省晋江市', '河北省迁安市', '湖北省仙桃市',
  ],
  地级市: [
    '山东省济南市', '山东省青岛市', '山东省烟台市',
    '浙江省杭州市', '浙江省宁波市', '浙江省温州市',
    '江苏省苏州市', '江苏省南京市', '江苏省无锡市',
    '广东省广州市', '广东省深圳市', '广东省佛山市',
    '湖南省长沙市', '湖北省武汉市', '四川省成都市',
    '河南省郑州市', '福建省厦门市', '安徽省合肥市',
    '云南省昆明市', '陕西省西安市', '辽宁省大连市',
  ],
  省级: [
    '山东省', '浙江省', '江苏省', '广东省',
    '湖南省', '湖北省', '四川省', '河南省',
    '安徽省', '福建省', '河北省', '云南省',
    '陕西省', '辽宁省', '黑龙江省', '贵州省',
  ],
  国家级: ['中央'],
};

/** 国政院部委池（26个实际部委）*/
export const MINISTRY_POOL = [
  { name: '外交部',     focus: '外交事务',   emoji: '🌐' },
  { name: '国防部',     focus: '国家安全',   emoji: '🛡️' },
  { name: '发展改革委', focus: 'GDP经济',    emoji: '📈' },
  { name: '教育部',     focus: '民生保障',   emoji: '📚' },
  { name: '科学技术部', focus: 'GDP经济',    emoji: '🔬' },
  { name: '工业和信息化部', focus: '营商环境', emoji: '🏭' },
  { name: '公安部',     focus: '社会治安',   emoji: '🚔' },
  { name: '民政部',     focus: '民生保障',   emoji: '🤝' },
  { name: '司法部',     focus: '社会治安',   emoji: '⚖️' },
  { name: '财政部',     focus: 'GDP经济',    emoji: '💰' },
  { name: '人力资源和社会保障部', focus: '民生保障', emoji: '👷' },
  { name: '自然资源部', focus: '生态文明',   emoji: '🌳' },
  { name: '生态环境部', focus: '生态文明',   emoji: '♻️' },
  { name: '住房和城乡建设部', focus: '民生保障', emoji: '🏗️' },
  { name: '交通运输部', focus: '营商环境',   emoji: '🚆' },
  { name: '水利部',     focus: '生态文明',   emoji: '💧' },
  { name: '农业农村部', focus: '民生保障',   emoji: '🌾' },
  { name: '商务部',     focus: '营商环境',   emoji: '🤝' },
  { name: '文化和旅游部', focus: '民生保障', emoji: '🎭' },
  { name: '国家卫生健康委员会', focus: '民生保障', emoji: '🏥' },
  { name: '应急管理部', focus: '社会治安',   emoji: '🚨' },
  { name: '审计署',     focus: '营商环境',   emoji: '📊' },
  { name: '海关总署',   focus: '营商环境',   emoji: '🛳️' },
  { name: '国家税务总局', focus: 'GDP经济',  emoji: '🧾' },
  { name: '国家市场监督管理总局', focus: '营商环境', emoji: '🏪' },
  { name: '国家统计局', focus: 'GDP经济',    emoji: '📉' },
] as const;

export type MinistryInfo = typeof MINISTRY_POOL[number];

export function getRandomMinistry(): MinistryInfo {
  return MINISTRY_POOL[Math.floor(Math.random() * MINISTRY_POOL.length)];
}

export function getRandomCityForRank(rankLevel: number): string {
  if (rankLevel >= 12) {
    const m = getRandomMinistry();
    return m.name;
  }
  const config = RANK_CONFIG[rankLevel];
  if (!config) return '待定地区';
  const pool = CITY_POOLS[config.cityType] ?? CITY_POOLS['地级市'];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ============ 默认城市（固定起始，低级别动态生成）============
// rank 1-3 的真实起始镇名由 gameApi 中 randRealStartTown() 动态生成
// 此处保留 rank 4+ 的真实城市名
export const DEFAULT_CITY_BY_LEVEL: Record<number, string> = {
  1: '龙泉镇', 2: '龙泉镇', 3: '兴华镇',
  4: '青山县', 5: '山东省章丘区', 6: '湖南省浏阳市',
  7: '河西市', 8: '山东省济南市', 9: '浙江省杭州市', 10: '山东省',
  11: '广东省', 12: '中央', 13: '中央',
};

// ============ 头像系统 ============
// emoji池（角色创建时选择界面使用）
export const MALE_AVATARS = ['👨‍💼', '👨‍🏫', '👨‍⚕️', '👨‍🔬', '🧑‍💼', '👮‍♂️', '👨‍⚖️', '🧔', '👨‍🦱', '👨‍🦲'];
export const FEMALE_AVATARS = ['👩‍💼', '👩‍🏫', '👩‍⚕️', '👩‍🔬', '🧑‍💼', '👮‍♀️', '👩‍⚖️', '👩‍🦱', '👩‍🦳', '👩'];
export const SUB_MALE_AVATARS = ['🧑‍💼', '👨‍💻', '👨‍🏭', '👨‍🌾', '👨', '🧔‍♂️', '👱‍♂️', '👨‍🦯'];
export const SUB_FEMALE_AVATARS = ['👩‍💻', '👩‍🏭', '👩‍🌾', '👩', '👱‍♀️', '👩‍🦰', '🧕'];

// ── 卡通证件照图片池（NPC头像，扁平卡通风）──────────────────────
export const MALE_AVATAR_URLS: string[] = [
  'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_621c9218-19a0-43e9-b95d-f2d4ae3f9e92.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_924ae4e5-1a80-4181-9b8c-7339d311a0fc.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_99914b11-1dff-4dcf-858c-30f4e5eeb460.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_b7a5e3d5-c031-4df6-a678-a1dcdfe0c25b.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_00f033be-e75d-407f-aa89-77ce429e4328.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_5f219e03-1028-4de8-a9c2-ce7d6079f968.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_4ea31af7-d365-430e-8de7-1af355a47cd3.jpg',
  // 新增扁平卡通官员头像
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_b45972f2-4401-4764-bd0f-6ca4a4a145bb.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_d5608b5d-b503-4723-8a42-1e1067273717.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_c0202944-425b-412e-816b-19e759fef575.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_32026d5c-e7bf-480d-8799-3807d71d8c75.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_70af69aa-81a8-48a3-9a59-32e326579115.jpg',
];
export const FEMALE_AVATAR_URLS: string[] = [
  'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_6b0ad6c1-809a-47c3-ab75-3d678d663d27.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_25f1c571-9e3a-4802-8f48-e7190775540c.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_9b2d296a-6fa1-4ade-a808-c41467021031.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_140bb22d-7c64-43df-9b0b-9ce63580579f.jpg',
];
export const MILITARY_AVATAR_URLS: string[] = [
  'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_d8949df0-f9e9-41f1-9a17-58d7d38150b7.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_07ea4fbb-c32b-4d1d-861d-b0f48a6244ed.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_82193f37-2b86-4edd-b6f4-a95cc3967fdb.jpg',
];
export const POLICE_AVATAR_URLS: string[] = [
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_2e801fd7-befc-4df1-8a77-0b519156ef51.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_c70863ab-b122-4ca5-8234-b74fa4cce9c1.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_a635c1e5-604a-40da-aa51-ac399e1dded8.jpg',
];

// ============ 官员头像系统 ============
/** 根据 avatarId + 性别获取玩家头像 emoji（角色创建/旧UI兼容） */
export function getAvatarEmoji(avatarId: number, gender: string): string {
  const pool = gender === '女' ? FEMALE_AVATARS : MALE_AVATARS;
  return pool[avatarId % pool.length];
}

/** 根据 avatarId + 性别获取下属头像 emoji（兼容旧UI） */
export function getSubAvatarEmoji(avatarId: number, gender: string): string {
  const pool = gender === '女' ? SUB_FEMALE_AVATARS : SUB_MALE_AVATARS;
  return pool[avatarId % pool.length];
}

/** 根据 avatarId + 性别 + 职位关键字 返回卡通证件照 URL */
export function getAvatarImageUrl(avatarId: number, gender: string, positionLabel = ''): string {
  const isMil = /军委|战区|军区|军分区|人武部|海军|空军|陆军|火箭军|联勤|联参/.test(positionLabel);
  const isPol = /公安|警察|武警/.test(positionLabel);
  if (isMil) return MILITARY_AVATAR_URLS[avatarId % MILITARY_AVATAR_URLS.length];
  if (isPol) return POLICE_AVATAR_URLS[avatarId % POLICE_AVATAR_URLS.length];
  if (gender === '女') return FEMALE_AVATAR_URLS[avatarId % FEMALE_AVATAR_URLS.length];
  return MALE_AVATAR_URLS[avatarId % MALE_AVATAR_URLS.length];
}

/** 派系背景色（五大阵营） */
export const AVATAR_BG_BY_FACTION: Record<string, string[]> = {
  reform:     ['#1D3B5E', '#1a4a7a', '#253f6a', '#2b527e'],
  pragmatic:  ['#6B2020', '#7a2a2a', '#5a1a1a', '#8a3030'],
  cyl:        ['#2E6B3E', '#2a6040', '#1e5c38', '#356b45'],
  techno:     ['#7A5C00', '#8a6a10', '#6b4e00', '#9a7020'],
  local:      ['#3A2010', '#4e2a14', '#2e1508', '#5c3218'],
  // 旧别名兼容（factions.tsx v1 使用的旧 key，迁移后弃用）
  neutral:    ['#2E6B3E', '#2a6040', '#1e5c38', '#356b45'],
  economy:    ['#7A5C00', '#8a6a10', '#6b4e00', '#9a7020'],
  discipline: ['#4A1A6B', '#5a2a7a', '#3d1255', '#621e8a'],
};

export function getAvatarBgColor(avatarId: number, faction: string): string {
  const pool = AVATAR_BG_BY_FACTION[faction] ?? AVATAR_BG_BY_FACTION['neutral'];
  return pool[avatarId % pool.length];
}

/** 文字首字（备用占位符） */
export function getAvatarChar(name: string): string {
  return name ? name[0] : '员';
}

// ============ 学校影响 ============
export const SCHOOL_BONUS: Record<string, number> = {
  '985院校': 10,
  '211院校': 5,
  '普通本科': 0,
  '大专院校': -5,
  '985院校（选调生）': 20,  // 中央选调生专属，能力加成更高
};

// ============ 学历类型 ============
export type DegreeType = '本科' | '硕士' | '博士';

/** 判断是否满足中央选调条件 */
export function canApplyZhongXuanDiao(school: string, degree: DegreeType): boolean {
  return school === '985院校' && (degree === '硕士' || degree === '博士');
}

/** 中央选调最低入职年龄（985硕士≥23岁，博士≥25岁）*/
export function getZhongXuanDiaoMinAge(degree: DegreeType): number {
  if (degree === '博士') return 25;
  if (degree === '硕士') return 23;
  return 22;
}

/** 选调生起始职级（硕士→副科/rank2，博士→正科/rank3）*/
export function getZhongXuanDiaoStartRank(degree: DegreeType): number {
  if (degree === '博士') return 3;  // 乡镇长（正科级）
  return 2;                          // 副乡镇长（副科级）
}

// ============ 个人薪资系统 ============
/** 各职级月薪（元/月，参照现实体制内薪资适当游戏化放大）*/
export const RANK_SALARY: Record<number, number> = {
  1:  5500,   // 乡镇科员
  2:  7000,   // 副乡镇长（副科）
  3:  9000,   // 乡镇长（正科）
  4:  13000,  // 县委常委/副县长（副处）
  5:  16000,  // 县长/区长（正处）
  6:  20000,  // 县委书记（正处）
  7:  26000,  // 副市长（副厅）
  8:  32000,  // 市长（正厅）
  9:  38000,  // 市委书记（正厅）
  10: 50000,  // 省长/副省长（副部）
  11: 65000,  // 省委书记（正部）
  12: 80000,  // 国政院部长（正部）
  13: 100000, // 国政院副院理（国级）
  14: 120000, // 国政院院理（国级）
  15: 150000, // 总执书记/华夏主席（国级）
};

/**
 * 各职级初始财政余额（万元）
 * 参照现实：乡镇50-80万 → 县级500-1200万 → 市5000-15000万 → 省80000-120000万 → 国家级以上数十万亿
 */
export const RANK_INITIAL_FUND: Record<number, number> = {
  1:  30,       // 乡镇科员：30万（刚入职，几乎没有可支配资金）
  2:  50,       // 副乡镇长：50万
  3:  80,       // 乡镇长：80万
  4:  500,      // 副县长：500万
  5:  800,      // 县长/区长：800万
  6:  1200,     // 县委书记：1200万
  7:  5000,     // 副市长：5000万
  8:  10000,    // 市长：1亿
  9:  15000,    // 市委书记：1.5亿
  10: 80000,    // 省长/副省长：80亿
  11: 120000,   // 省委书记：120亿
  12: 500000,   // 国政院部长：5000亿
  13: 1000000,  // 国政院副院理：1万亿
  14: 5000000,  // 国政院院理：5万亿
  15: 10000000, // 总执书记：10万亿
};

/**
 * 部门自动收益（fundBalance）的职级倍率
 * 统一在月度结算中对 autoResult.fundBalance 乘以此系数
 */
export const RANK_FUND_MULTIPLIER: Record<number, number> = {
  1: 0.05, 2: 0.08, 3: 0.12,  // 乡镇：财政局+税务局合计约 1-4万/月
  4: 0.8,  5: 1.2,  6: 1.8,   // 县级：约 28-63万/月
  7: 8,    8: 15,   9: 22,     // 市级：约 280-770万/月
  10: 80, 11: 130,             // 省级：约 2800-4550万/月
  12: 500, 13: 1200, 14: 3000, // 国家：约 1.75亿-10.5亿/月
  15: 8000,
};

// ============ 个人薪资拆解系统（公积金 + 五险 + 补贴）============

/**
 * 各职级「应发工资」（税前），RANK_SALARY是税后到手
 * 公式参考：应发 = 职务工资 + 级别工资 + 地方补贴
 * 实际体制内税前约为税后的1.15~1.25倍（含扣缴五险一金后）
 */
export const RANK_GROSS_SALARY: Record<number, number> = {
  1:  6800,   // 乡镇科员
  2:  8700,   // 副乡镇长（副科）
  3:  11200,  // 乡镇长（正科）
  4:  16200,  // 副县长（副处）
  5:  20000,  // 县长/区长（正处）
  6:  25000,  // 县委书记（正处）
  7:  32500,  // 副市长（副厅）
  8:  40000,  // 市长（正厅）
  9:  47500,  // 市委书记（正厅）
  10: 62500,  // 省长/副省长（副部）
  11: 81250,  // 省委书记（正部）
  12: 100000, // 国政院部长（正部）
  13: 125000, // 国政院副院理（国级）
  14: 150000, // 国政院院理（国级）
  15: 187500, // 总执书记/华夏主席（国级）
};

/**
 * 各职级每月应缴「个人社保」（养老8%+医疗2%+失业0.5%，以应发工资为基数）
 * 精确值由应发工资×10.5%计算，此处为预计算值（元/月）
 */
export const RANK_PERSONAL_SOCIAL_INSURANCE: Record<number, number> = {
  1:  714,   2:  914,   3:  1176,
  4:  1701,  5:  2100,  6:  2625,
  7:  3413,  8:  4200,  9:  4988,
  10: 6563,  11: 8531,  12: 10500,
  13: 13125, 14: 15750, 15: 19688,
};

/**
 * 各职级每月「个人公积金」缴存（应发工资×12%）
 * 单位同等缴存（单位公积金=个人公积金，每月进入个人账户双倍）
 */
export const RANK_PERSONAL_HPF: Record<number, number> = {
  1:  816,   2:  1044,  3:  1344,
  4:  1944,  5:  2400,  6:  3000,
  7:  3900,  8:  4800,  9:  5700,
  10: 7500,  11: 9750,  12: 12000,
  13: 15000, 14: 18000, 15: 22500,
};

/**
 * 各职级每月各项「补贴」合计（车补+通讯补贴+餐补+取暖/高温补贴）
 * 参照现实：科级500-800/月，处级1300-2500/月，厅级3000-6000/月，部级以上更高
 */
export const RANK_MONTHLY_ALLOWANCE: Record<number, number> = {
  1:  500,   // 科员：通讯100+餐补200+其他200
  2:  650,   // 副科：车补200+通讯100+餐补200+其他150
  3:  900,   // 正科：车补300+通讯150+餐补250+其他200
  4:  1500,  // 副处：车补700+通讯200+餐补350+其他250
  5:  2000,  // 正处：车补1000+通讯250+餐补450+其他300
  6:  2500,  // 正处（书记）：加秘书服务补贴
  7:  4000,  // 副厅：车补2000+通讯500+餐补800+其他700
  8:  5500,  // 正厅：车补3000+通讯700+餐补1000+其他800
  9:  6500,  // 正厅（书记）：加专职司机保障
  10: 10000, // 副部：车补5000+通讯1500+餐补2000+其他1500
  11: 14000, // 正部：车补7000+通讯2000+餐补3000+其他2000
  12: 18000, // 国政院部长：加政务接待保障
  13: 25000, // 副院理：专机/专列使用
  14: 35000, // 总理：国家安保保障
  15: 50000, // 总执书记：中南海专属保障
};

/**
 * 各职级「年终奖/绩效奖金」倍数（月薪倍数，实发=月薪×倍数）
 * 体制内通常1~3个月等额工资；优秀评定可多1个月；以称职（合格）为基准
 */
export const RANK_ANNUAL_BONUS_MONTHS: Record<number, number> = {
  1: 1.0, 2: 1.0, 3: 1.2,
  4: 1.5, 5: 1.5, 6: 1.8,
  7: 2.0, 8: 2.0, 9: 2.2,
  10: 2.5, 11: 2.5, 12: 3.0,
  13: 3.0, 14: 3.0, 15: 3.0,
};

/**
 * 补贴明细标签（用于UI展示）
 * 各职级享有的补贴类别
 */
export const RANK_ALLOWANCE_DETAIL: Record<number, Array<{ label: string; amount: number }>> = {
  1:  [{ label: '通讯补贴', amount: 100 }, { label: '餐费补贴', amount: 200 }, { label: '其他补贴', amount: 200 }],
  2:  [{ label: '车辆补贴', amount: 200 }, { label: '通讯补贴', amount: 100 }, { label: '餐费补贴', amount: 200 }, { label: '其他补贴', amount: 150 }],
  3:  [{ label: '车辆补贴', amount: 300 }, { label: '通讯补贴', amount: 150 }, { label: '餐费补贴', amount: 250 }, { label: '其他补贴', amount: 200 }],
  4:  [{ label: '车辆补贴', amount: 700 }, { label: '通讯补贴', amount: 200 }, { label: '餐费补贴', amount: 350 }, { label: '其他补贴', amount: 250 }],
  5:  [{ label: '车辆补贴', amount: 1000 }, { label: '通讯补贴', amount: 250 }, { label: '餐费补贴', amount: 450 }, { label: '其他补贴', amount: 300 }],
  6:  [{ label: '车辆补贴', amount: 1200 }, { label: '通讯补贴', amount: 300 }, { label: '餐费补贴', amount: 500 }, { label: '秘书保障', amount: 500 }],
  7:  [{ label: '车辆补贴', amount: 2000 }, { label: '通讯补贴', amount: 500 }, { label: '餐费补贴', amount: 800 }, { label: '岗位津贴', amount: 700 }],
  8:  [{ label: '车辆补贴', amount: 3000 }, { label: '通讯补贴', amount: 700 }, { label: '餐费补贴', amount: 1000 }, { label: '岗位津贴', amount: 800 }],
  9:  [{ label: '车辆补贴', amount: 3500 }, { label: '通讯补贴', amount: 800 }, { label: '餐费补贴', amount: 1200 }, { label: '专职司机保障', amount: 1000 }],
  10: [{ label: '车辆补贴', amount: 5000 }, { label: '通讯补贴', amount: 1500 }, { label: '餐费补贴', amount: 2000 }, { label: '岗位津贴', amount: 1500 }],
  11: [{ label: '车辆补贴', amount: 7000 }, { label: '通讯补贴', amount: 2000 }, { label: '餐费补贴', amount: 3000 }, { label: '岗位津贴', amount: 2000 }],
  12: [{ label: '车辆补贴', amount: 8000 }, { label: '通讯补贴', amount: 3000 }, { label: '餐费补贴', amount: 4000 }, { label: '政务保障', amount: 3000 }],
  13: [{ label: '车辆补贴', amount: 10000 }, { label: '通讯补贴', amount: 5000 }, { label: '餐费补贴', amount: 5000 }, { label: '专机使用保障', amount: 5000 }],
  14: [{ label: '安保出行保障', amount: 15000 }, { label: '通讯保障', amount: 8000 }, { label: '政务接待保障', amount: 12000 }],
  15: [{ label: '中南海专属保障', amount: 30000 }, { label: '通讯安全保障', amount: 10000 }, { label: '国家领导人待遇', amount: 10000 }],
};

/** 各职级分配住房（级别越高住房越好）*/
export const RANK_HOUSING: Record<number, string | null> = {
  1:  null,              // 科员无分配住房
  2:  '乡镇工作宿舍',
  3:  '乡镇干部公寓',
  4:  '县级干部住房（两居室）',
  5:  '县级单位住宅（三居室）',
  6:  '县委独栋小院',
  7:  '市级干部公寓（精装修）',
  8:  '市长官邸（四居室+车库）',
  9:  '市委书记官邸（附属庭院）',
  10: '省级干部别墅区',
  11: '省委专属官邸',
  12: '部委配套豪华官邸',
  13: '国家配备别墅（中南海附近）',
  14: '总理专属官邸',
  15: '中南海专属居所',
};

// ============ 可购买物品系统 ============
export interface PurchasableItem {
  key: string;
  name: string;
  emoji: string;
  price: number;       // 单位：元
  desc: string;        // 效果描述
  effectDesc: string;  // 游戏效果
  category: '出行' | '房产' | '投资' | '进修' | '生活' | '礼品';
  // 效果数值（可选）
  meritBonus?: number;
  moralBonus?: number;
  abilityBonus?: number;
  familyHappiness?: number;
  bossFavorBonus?: number;
  isMonthlyReturn?: boolean; // 每月产生收益（股票）
  monthlyReturnRate?: number; // 月收益率（股票，可正可负）
}

export const PURCHASABLE_ITEMS: PurchasableItem[] = [
  {
    key: 'car_basic',
    name: '代步轿车',
    emoji: '🚗',
    price: 150000,
    desc: '购买一辆普通代步轿车，出行更便利',
    effectDesc: '形象+3，上司好感度+2',
    category: '出行',
    meritBonus: 0,
    bossFavorBonus: 2,
    moralBonus: 0,
  },
  {
    key: 'car_luxury',
    name: '豪华公务座驾',
    emoji: '🏎️',
    price: 500000,
    desc: '高档豪华轿车，彰显身份，提升形象',
    effectDesc: '上司好感度+5，政绩+8（慎用，民心-3）',
    category: '出行',
    meritBonus: 8,
    bossFavorBonus: 5,
    moralBonus: -3,
  },
  {
    key: 'house_commercial',
    name: '商品住房',
    emoji: '🏠',
    price: 1000000,
    desc: '购置一套城区商品房作为私产',
    effectDesc: '家庭幸福度+15，个人资产增值',
    category: '房产',
    familyHappiness: 15,
  },
  {
    key: 'house_school_district',
    name: '学区房',
    emoji: '🏫',
    price: 2000000,
    desc: '顶级学区优质住房，子女教育加成',
    effectDesc: '家庭幸福度+20，子女发展加成',
    category: '房产',
    familyHappiness: 20,
  },
  {
    key: 'house_villa',
    name: '私人别墅',
    emoji: '🏡',
    price: 5000000,
    desc: '郊区私人别墅，彰显成就与财力',
    effectDesc: '家庭幸福度+25，个人声望+10（慎用，民心-5）',
    category: '房产',
    familyHappiness: 25,
    moralBonus: -5,
    meritBonus: 10,
  },
  {
    key: 'stock_small',
    name: '股票投资（小额）',
    emoji: '📈',
    price: 50000,
    desc: '买入小额股票，每月随机产生收益或亏损',
    effectDesc: '每月随机±5%~±15%收益（高风险）',
    category: '投资',
    isMonthlyReturn: true,
    monthlyReturnRate: 0.08,
  },
  {
    key: 'stock_medium',
    name: '股票投资（中额）',
    emoji: '📊',
    price: 200000,
    desc: '中等规模股票组合，分散风险',
    effectDesc: '每月随机±3%~±12%收益',
    category: '投资',
    isMonthlyReturn: true,
    monthlyReturnRate: 0.06,
  },
  {
    key: 'fund_invest',
    name: '基金理财',
    emoji: '💹',
    price: 100000,
    desc: '购买稳健型基金，低风险稳定收益',
    effectDesc: '每月约+3%稳定收益（低风险）',
    category: '投资',
    isMonthlyReturn: true,
    monthlyReturnRate: 0.03,
  },
  {
    key: 'mba',
    name: 'MBA进修',
    emoji: '🎓',
    price: 300000,
    desc: '攻读工商管理硕士，提升领导能力',
    effectDesc: '能力+8，政绩+12，职业发展加成',
    category: '进修',
    meritBonus: 12,
    abilityBonus: 8,
  },
  {
    key: 'overseas_visit',
    name: '出国考察学习',
    emoji: '✈️',
    price: 80000,
    desc: '赴海外考察先进治理经验，开阔视野',
    effectDesc: '政绩+8，民心+3，能力+3',
    category: '进修',
    meritBonus: 8,
    moralBonus: 3,
    abilityBonus: 3,
  },
  {
    key: 'family_travel',
    name: '家庭旅游',
    emoji: '🏖️',
    price: 30000,
    desc: '带家人出行度假，增进家庭感情',
    effectDesc: '家庭幸福度+20，配偶关系+10',
    category: '生活',
    familyHappiness: 20,
  },
  {
    key: 'health_check',
    name: '高端体检套餐',
    emoji: '🏥',
    price: 20000,
    desc: '全面高端健康检查，保障身体状况',
    effectDesc: '政绩+3，民心+2（健康就是硬实力）',
    category: '生活',
    meritBonus: 3,
    moralBonus: 2,
  },
  {
    key: 'gift_boss',
    name: '高档礼品（送上司）',
    emoji: '🎁',
    price: 50000,
    desc: '精心准备名贵礼品，加深与上司的私人关系',
    effectDesc: '上司好感度+8（民心-4，存在风险）',
    category: '礼品',
    bossFavorBonus: 8,
    moralBonus: -4,
  },
  {
    key: 'watch_luxury',
    name: '名表收藏',
    emoji: '⌚',
    price: 200000,
    desc: '收藏高档名表，兼具投资与身份展示',
    effectDesc: '上司好感度+3，个人形象提升',
    category: '生活',
    bossFavorBonus: 3,
  },
  {
    key: 'charity_donation',
    name: '慈善捐款',
    emoji: '❤️',
    price: 100000,
    desc: '向公益事业捐款，树立良好社会形象',
    effectDesc: '民心+8，政绩+5，社会声望大幅提升',
    category: '生活',
    moralBonus: 8,
    meritBonus: 5,
  },
];

// ============ 十四大职能部门（含信访办+组织部）============
export type DeptKey = 'police' | 'ndrc' | 'finance' | 'urban' | 'education' | 'health' | 'ecology' | 'market' | 'agriculture' | 'personnel' | 'invest' | 'tax' | 'petition' | 'organization';

// ============ 五大阵营系统 v2（§2.1 统一 FactionId）============
// §D2 修复：废除 neutral/economy/discipline 旧别名，统一用 cyl/techno/local
export type FactionId = 'reform' | 'pragmatic' | 'cyl' | 'techno' | 'local';
/** 向后兼容别名，新代码统一用 FactionId */
export type Faction = FactionId;

export const FACTION_LABEL: Record<FactionId, string> = {
  reform:    '改革开放系',
  pragmatic: '稳健国家系',
  cyl:       '共青团/民生系',
  techno:    '技术官僚系',
  local:     '地方实力派',
};

export const FACTION_SHORT: Record<FactionId, string> = {
  reform:    '改革系',
  pragmatic: '国家系',
  cyl:       '团系',
  techno:    '技官系',
  local:     '地方派',
};

export const FACTION_COLOR: Record<FactionId, string> = {
  reform:    '#1A3B66',  // 深蓝：改革开放系
  pragmatic: '#8B0000',  // 深红：稳健国家系
  cyl:       '#2E6B3E',  // 深绿：共青团/民生系
  techno:    '#7A5C00',  // 深金：技术官僚系
  local:     '#3A2010',  // 深棕：地方实力派
};

export const FACTION_DESC: Record<FactionId, string> = {
  reform:    '邓小平改革路线继承者，主张扩大对外开放、简政放权、允许市场在资源配置中发挥决定性作用；在沿海省份根基深厚，与外资企业界关系密切',
  pragmatic: '强调党对一切工作的领导，以政治稳定为压倒一切的任务，主张国企做强做大、强化意识形态管理；在中央系统和北方省份影响力较强',
  cyl:       '发迹于共青团系统，长于群众工作与基层调研，主张以人民满意度为施政标尺，偏重民生投入与社会公平；在中西部和青年干部群体中有广泛基础',
  techno:    '理工科出身的专业技术型干部，以数据说话、追求治理现代化，主张大力发展数字经济和战略性新兴产业；在国家发改委、工业和信息化系统影响深远',
  local:     '长期在县市省层级深耕，掌握庞大的基层人脉、土地资源与地方企业关系网络，善于在中央政策下寻找地方操作空间；是反腐风暴重灾区',
};

/** 各阵营对重要人事任命的投票倾向矩阵（§4.2 K_faction 同/对立派占比依据）*/
export const FACTION_VOTE_BIAS: Record<FactionId, Record<FactionId, number>> = {
  reform:    { reform: 3, pragmatic: -2, cyl: 1,  techno: 2,  local: -1 },
  pragmatic: { reform: -2, pragmatic: 3, cyl: -1, techno: 0,  local: 1  },
  cyl:       { reform: 1,  pragmatic: -2, cyl: 3, techno: 0,  local: 0  },
  techno:    { reform: 2,  pragmatic: 0,  cyl: 0, techno: 3,  local: -1 },
  local:     { reform: -1, pragmatic: 1,  cyl: 0, techno: -1, local: 3  },
};

export const ALL_FACTIONS: FactionId[] = ['reform', 'pragmatic', 'cyl', 'techno', 'local'];

// ── 派系系统 v2 新增类型（§6）──────────────────────────────────
/** 中央政治风向（§2.3 / §3.3） */
export type PoliticalWind =
  | 'reform-heavy'
  | 'balanced'
  | 'pragmatic-heavy'
  | 'techno-surge'
  | 'local-crackdown';

/** 派系斗争阶段（§3.22） */
export type StrugglePhase = 'idle' | 'mobilize' | 'active' | 'truce';

/** 声望等级 L0–L4（§2.2） */
export type FactionRepLevel = 0 | 1 | 2 | 3 | 4;

/** 历次派系斗争记录（§3.24 / §6） */
export interface FactionStruggle {
  period: number;
  side: FactionId | null;
  result: 'win' | 'lose' | 'neutral';
  S_you: number;
  S_opp: number;
  lossDesc: string;
  gainDesc: string;
}

/** 临时联盟记录（§3.9 / §6） */
export interface FactionCoalition {
  a: FactionId;
  b: FactionId;
  endDay: number;
}

// ═════════════ 派系晋升联动：位置棋盘 / 双轨胜利 / 委托 / 密谋（新增）═════════════
/** 棋盘席位（PositionBoard 格点） */
export interface PositionSeat {
  key: string;            // 职位唯一标识（对齐官职数组 key）
  title: string;          // 职位名称
  tier: string;           // 职级层（正部级/副厅级/正处级…）
  organ: string;          // 所属机关
  isHub: boolean;         // 是否枢纽席位（最高 tier 席位，攻克即整体胜利）
  holderFaction: FactionId | null;  // 当前控制派系（null = 无主/空缺）
}

/** 晋升争夺（玩家发起的职位争夺战） */
export interface PromotionContest {
  id: string;
  positionKey: string;        // 目标职位 key
  positionTitle: string;      // 目标职位名称
  toRank: number;             // 目标职级
  targetCity: string;         // 目标城市（落档 cityName，必须与界面选择一致）
  faction: FactionId;         // 发起派系（玩家主派）
  sYou: number;               // 玩家方争夺力
  sOpp: number;               // 对立派加权争夺力
  status: 'active' | 'won' | 'lost' | 'expired';
  startDay: number;           // 发起游戏天
  cycleDay: number;           // 所属周期边界游戏天（WIND_CYCLE_DAYS 倍数）
}

/** 历次争夺记录条目 */
export interface ContestRecord {
  id: string;
  positionTitle: string;
  toRank: number;
  sYou: number;
  sOpp: number;
  result: 'won' | 'lost' | 'expired';
  day: number;
}

/** 晋升类型：普通 / 破格 / 举荐，统一走同一入口校验 */
export type PromotionKind = 'normal' | 'break' | 'recommend';

/** 派系内职位（独立于个人官职职级） */
export interface FactionPositionDef {
  key: string;            // steward / strategist / elder
  title: string;          // 执事 / 军师 / 长老
  desc: string;
  minFactionLevel: number; // 解锁所需派系等级
}

export const FACTION_POSITIONS: FactionPositionDef[] = [
  { key: 'steward',    title: '执事', desc: '派系日常事务管理者，负责资源调度与成员联络，派系等级≥1 解锁。', minFactionLevel: 1 },
  { key: 'strategist', title: '军师', desc: '派系核心谋士，参与重大决策与战略规划，派系等级≥3 解锁。',     minFactionLevel: 3 },
  { key: 'elder',      title: '长老', desc: '派系元老，享有崇高声望与话语权，派系等级≥5 解锁。',         minFactionLevel: 5 },
];

/** 公共事件类型：巡查 / 弹劾 / 舆情 */
export type PublicEventType = 'inspection' | 'impeachment' | 'public_opinion';

export interface PublicEvent {
  type: PublicEventType;
  title: string;
  content: string;
  meritDelta: number;   // 政绩增减
  favorDelta: number;   // 上级认可度增减
  demoteLevels: number; // 弹劾降职级数（0 表示不降职）
}

/** 派系委托（每政治年生成 1-2 个） */
export interface FactionMandate {
  id: string;
  faction: FactionId;         // 委托发起派系（本派）
  title: string;              // 委托标题
  desc: string;               // 委托内容
  reward: { relation: number; influence: number; treasury: number; merit: number };
  penalty: { relation: number };
  status: 'active' | 'done' | 'rejected';
  year: number;               // 所属政治年（gameDays / 365）
}

/** 密谋行动记录 */
export interface CovertOpRecord {
  id: string;
  type: 'report' | 'discord' | 'proxy' | 'preempt';
  targetFaction: FactionId;
  exposed: boolean;
  day: number;
}

// ===== v4 派系玩法：省级席位控制（全国棋盘）+ 个人职位独立斗争 =====

/** 省级席位（全国棋盘单元：某省级行政区） */
export interface ProvinceSeat {
  province: string;              // 省级行政区名称（PROVINCE_LIST 项）
  seatCount: number;             // 该省席位数（round(地级市数 × 1.8)，clamp [3,18]）
  holderFaction: FactionId | null; // 当前控制该省的派系（null = 无主）
}

/** 全国席位控制统计 */
export interface NationalSeatControl {
  totalSeats: number;                        // 全国总席位数
  factionSeats: Record<FactionId, number>;   // 各派控制席位数
  controlRatios: Record<FactionId, number>;  // 各派控制比例（0~1）
  dominantFaction: FactionId | null;         // 控制度最高派系
  reachedThreshold: boolean;                 // 是否有派系达到获胜阈值
  thresholdRatio: number;                    // 当前最高控制比例
}

/** 个人职位争夺（v4：10% 派系 + 90% 个人） */
export interface PersonalContest {
  positionKey: string;           // 目标职位 key
  positionTitle: string;         // 目标职位名称
  toRank: number;                // 目标职级
  targetCity: string;            // 目标城市（落档 cityName）
  factionPower: number;          // 派系贡献分（加权后）
  personalPower: number;         // 个人独立战力分（加权后）
  win: boolean;                  // 是否获胜
  day: number;                   // 发起游戏天
}

/** 个人职位争夺详情（战力分解） */
export interface ContestDetail {
  sYou: number;                      // 我方总分 = 派系贡献 + 个人战力
  sOpp: number;                      // 竞争派系实力
  factionShare: number;              // 派系贡献占比（0~1）
  personalShare: number;             // 个人贡献占比（0~1）
  breakdown: {                       // 个人战力七维分解
    merit: number;                   // 政绩
    support: number;                 // 民心
    economy: number;                 // 经济
    integrity: number;               // 廉洁
    events: number;                  // 事件处理
    network: number;                 // 人脉
    tenure: number;                  // 任期稳定
  };
  oppBreakdown: {                    // 竞争派系实力分解
    faction: FactionId;
    power: number;
  }[];
  win: boolean;
}

/** 战前部署计数（§3.17–§3.21，斗争结算后清零） */
export interface StrugglePrep {
  proxy: number;
  media: number;
  discord: number;
  preempt: number;
  successor: number;
}

/** 政策响应派系回写日志（§4.1 / §6） */
export interface FactionEcho {
  day: number;
  policyId: string;
  faction: FactionId;
  echo: number;
}

// ============ 县级官职完整架构（正处/副处/正科/副科）============
/** 县级职位条目 */
export interface CountyPosition {
  key: string;          // 唯一标识
  title: string;        // 职位名称
  tier: '正处级' | '副处级' | '正科级' | '副科级';
  organ: '县委' | '县政府' | '县议政院' | '县参政院' | '县纪委' | '政法' | '职能局' | '乡镇' | '团委' | '人武部';
  desc: string;         // 说明
  isHighProfile?: boolean;
  highProfileNote?: string;
}

// ============ 市级官职完整架构（正厅/副厅/正处/副处）============
export interface CityPosition {
  key: string;
  title: string;
  tier: '正厅级' | '副厅级' | '正处级' | '副处级';
  organ: '市委' | '市政府' | '市议政院' | '市参政院' | '市纪委' | '政法' | '市直属局' | '区（县）' | '团委' | '军分区' | '市武警';
  desc: string;
  isHighProfile?: boolean;
  highProfileNote?: string;
}

// ============ 省级官职完整架构（正部/副部/正厅/副厅）============
export interface ProvincePosition {
  key: string;
  title: string;
  tier: '正部级' | '副部级' | '正厅级' | '副厅级';
  organ: '省委' | '省政府' | '省议政院' | '省参政院' | '省纪委' | '政法' | '省直属厅' | '地市' | '团委' | '省军区' | '武警';
  desc: string;
  isHighProfile?: boolean;
  highProfileNote?: string;
}
export interface SubProvincePosition {
  key: string;
  title: string;
  tier: '副部级' | '正厅级' | '副厅级' | '正处级';
  organ: '市委' | '市政府' | '市议政院' | '市参政院' | '市直属局' | '区委' | '区政府' | '街道' | '军分区' | '市武警';
  desc: string;
  isHighProfile?: boolean;
  highProfileNote?: string;
}

export const COUNTY_OFFICIAL_POSITIONS: CountyPosition[] = [
  // ══ 正处级：县委县政府最高领导 ══════════════════════════════
  { key: 'county_party_sec',  title: '县委书记',
    tier: '正处级', organ: '县委',
    desc: '县委一把手，统领全县党政军民工作。对下直接领导县委全体常委，对上向地市委书记负责。主持县委常委会，决定重大政策、干部任免与财政预算。' },
  { key: 'county_gov_head',   title: '县长（县政府党组书记）',
    tier: '正处级', organ: '县政府',
    desc: '县政府最高行政首长，主持县政府全面工作。负责县域经济发展、财政预算执行、民生事业推进。向县议政院负责，接受县委书记领导。' },

  // ══ 副处级：县委常委班子 ═══════════════════════════════════
  { key: 'county_deputy_sec',    title: '县委副书记（专职）',
    tier: '副处级', organ: '县委',
    desc: '协助书记分管党务与综合协调，负责日常政务对接。通常分管意识形态或党风廉政，是接班县长或书记的重要培养岗位。' },
  { key: 'county_standing_org',  title: '县委常委（组织部长）',
    tier: '副处级', organ: '县委',
    desc: '主管全县干部选拔任用、组织建设与党员管理。掌握全县科级及以下干部考察权，是仕途晋升最关键的节点守门人。' },
  { key: 'county_standing_prop', title: '县委常委（宣传部长）',
    tier: '副处级', organ: '县委',
    desc: '主管思想宣传、新闻舆论与精神文明建设。负责对外宣传报道口径统一，协调县级媒体与文化产业政策。' },
  { key: 'county_standing_disc', title: '县委常委（纪委书记·监委主任）',
    tier: '副处级', organ: '县纪委',
    desc: '主持县纪委监委工作，统筹全县党风廉政建设与反腐败斗争。有权对县处级以下干部启动纪律审查，负责巡察工作。',
    isHighProfile: true, highProfileNote: '因兼任监察委主任，实际权力超出普通常委，是县级"反腐一把手"' },
  { key: 'county_standing_pol',  title: '县委常委（政法委书记）',
    tier: '副处级', organ: '政法',
    desc: '统筹协调公检法司等政法机关工作，维护社会稳定与治安综合治理。主持县委政法委，对重大案件可提出党委意见。' },
  { key: 'county_standing_mil',  title: '县委常委（人武部政委）',
    tier: '副处级', organ: '人武部',
    desc: '主管县人民武装部政治工作，主持人武部党委工作，负责民兵建设、国防教育与双拥共建，同时承担县委领导武装力量的专责常委工作。',
    isHighProfile: true, highProfileNote: '现役军人兼任县委常委，是党管武装的重要制度安排' },
  { key: 'county_standing_united', title: '县委常委（统战部长）',
    tier: '副处级', organ: '县委',
    desc: '负责统一战线工作，联系非公经济人士、少数民族和宗教界代表人士，协调民主党派联络与港澳台工作。' },
  { key: 'county_deputy_gov1',   title: '副县长一（分管工业·招商）',
    tier: '副处级', organ: '县政府',
    desc: '分管工业经济、科技创新、招商引资与开发区建设，联系发改局、工信局、招商局、科技局等部门。' },
  { key: 'county_deputy_gov2',   title: '副县长二（分管农业·生态）',
    tier: '副处级', organ: '县政府',
    desc: '分管农业农村、生态环境、水利林业与乡村振兴，联系农业农村局、水利局、林业局、生态环保局等。' },
  { key: 'county_deputy_gov3',   title: '副县长三（分管民生·社保）',
    tier: '副处级', organ: '县政府',
    desc: '分管教育、卫健、民政、社保、文化体育，联系教育局、卫健局、民政局、人社局等民生部门。' },
  { key: 'county_deputy_gov4',   title: '副县长四（分管城建·交通）',
    tier: '副处级', organ: '县政府',
    desc: '分管城市建设、住房保障、交通运输、自然资源规划，联系住建局、交通局、自然资源局、城管局等。' },
  { key: 'county_npc_chair',     title: '县议政院常委会主任',
    tier: '副处级', organ: '县议政院',
    desc: '主持县人民代表大会常务委员会工作，审议县政府预算报告，监督司法机关工作，审查规范性文件，是地方立法监督的核心职位。' },
  { key: 'county_cppcc_chair',   title: '县参政主席',
    tier: '副处级', organ: '县参政院',
    desc: '主持县人民政治协商会议工作，开展政治协商、民主监督与参政议政，联系各界代表人士，协调非党组织参与县域治理。' },
  { key: 'county_gov_sec',       title: '县政府办公室主任（县委常委）',
    tier: '副处级', organ: '县政府',
    desc: '主持县政府办公室工作，协调各职能部门政务运转，负责重大文件起草与会议组织。通常由县委常委兼任，是"大管家"角色。',
    isHighProfile: true, highProfileNote: '现实中多由常委兼任，实为常委级别高配政府办主任' },

  // ══ 正科级：各职能局正职、政法机关正职、团委、乡镇党委书记 ══
  { key: 'county_court_pres',    title: '县法院院长',
    tier: '正科级', organ: '政法',
    desc: '主持县人民法院审判工作，负责民事、刑事、行政各类案件的一审裁判，维护司法公正。' },
  { key: 'county_proc_chief',    title: '县检察院检察长',
    tier: '正科级', organ: '政法',
    desc: '主持县检察院工作，开展法律监督，负责刑事案件审查逮捕与起诉，以及职务犯罪检察工作。' },
  { key: 'county_league_sec',    title: '团县委书记',
    tier: '正科级', organ: '团委',
    desc: '主持共青团县委全面工作，是团派路线在县级的关键起点岗位。主管青年工作、学生联合会与志愿服务，向上对接团市委。',
    isHighProfile: true, highProfileNote: '团派路线专属关键职位，届满后多转任乡镇党委书记或县委办主任，进入主流仕途' },
  { key: 'head_police',          title: '县公安局长（县委常委）',
    tier: '正科级', organ: '职能局',
    desc: '主持全县公安工作，负责社会治安、刑事侦查、交通管理与出入境管理。',
    isHighProfile: true, highProfileNote: '通常兼任县委常委，实为副处级高配，是县级最重要的"实权局长"' },
  { key: 'head_ndrc',            title: '县发改局局长',
    tier: '正科级', organ: '职能局',
    desc: '统筹县域经济发展规划与重大项目审批，负责价格监管与宏观调控，编制年度国民经济和社会发展计划。' },
  { key: 'head_finance',         title: '县财政局局长',
    tier: '正科级', organ: '职能局',
    desc: '管理全县财政收支，负责预算编制审核与资金调度，是县级政府运转的"钱袋子"，也是最重要的职能局之一。' },
  { key: 'head_urban',           title: '县住建局局长',
    tier: '正科级', organ: '职能局',
    desc: '负责城乡规划建设与基础设施项目管理，主管危房改造、棚户区改造与城市综合管理工作。' },
  { key: 'head_education',       title: '县教育局局长',
    tier: '正科级', organ: '职能局',
    desc: '统筹全县义务教育、学前教育与职业教育发展，负责学校管理与教师队伍建设，推进教育均衡发展。' },
  { key: 'head_health',          title: '县卫健局局长',
    tier: '正科级', organ: '职能局',
    desc: '推进全县医疗卫生体系建设，负责公共卫生应急响应、基层医疗机构管理与计划生育政策执行。' },
  { key: 'head_ecology',         title: '县生态环保局局长',
    tier: '正科级', organ: '职能局',
    desc: '负责全县大气、水、土壤污染防治与生态保护，执行环保执法检查，推进绿色低碳发展。' },
  { key: 'head_market',          title: '县市场监管局局长',
    tier: '正科级', organ: '职能局',
    desc: '统一监管全县市场秩序，负责食品药品安全、知识产权保护与营业执照管理，优化营商环境。' },
  { key: 'head_agriculture',     title: '县农业农村局局长',
    tier: '正科级', organ: '职能局',
    desc: '负责农业生产指导、农村经济发展与乡村振兴战略落实，推进农业现代化与高标准农田建设。' },
  { key: 'head_hr',              title: '县人社局局长',
    tier: '正科级', organ: '职能局',
    desc: '负责全县就业促进、社会保险管理与劳动关系协调，主管公务员招录与科级干部日常管理。' },
  { key: 'head_invest',          title: '县招商局局长',
    tier: '正科级', organ: '职能局',
    desc: '负责全县招商引资工作，开展产业项目对接与园区投资促进，是经济发展考核的核心部门负责人。' },
  { key: 'head_natural_res',     title: '县自然资源局局长',
    tier: '正科级', organ: '职能局',
    desc: '负责土地资源规划管理、地质矿产开发监管与不动产登记，掌管土地指标，是腐败高发岗位之一。' },
  { key: 'head_transport',       title: '县交通运输局局长',
    tier: '正科级', organ: '职能局',
    desc: '负责全县公路建设维护、道路运输管理与农村公路发展，统筹"四好农村路"等重点工程建设。' },
  { key: 'head_civil_affairs',   title: '县民政局局长',
    tier: '正科级', organ: '职能局',
    desc: '负责低保救助、残疾人福利、婚姻登记、村级治理与退役军人安置等民生保障工作。' },
  { key: 'head_justice',         title: '县司法局局长',
    tier: '正科级', organ: '职能局',
    desc: '负责全县法律援助服务、律师公证行业监管与社区矫正工作，推进公民法治意识教育。' },
  { key: 'head_culture',         title: '县文化旅游局局长',
    tier: '正科级', organ: '职能局',
    desc: '统筹全县文化艺术事业与旅游产业发展，管理景区景点与文化遗产保护传承工作。' },
  { key: 'head_emergency',       title: '县应急管理局局长',
    tier: '正科级', organ: '职能局',
    desc: '负责全县安全生产监管、自然灾害防治与重大突发事件应急处置，统筹应急救援体系建设。' },
  { key: 'head_veterans',        title: '县退役军人事务局局长',
    tier: '正科级', organ: '职能局',
    desc: '负责全县退役军人安置保障工作，维护退役军人合法权益，开展"双拥"模范县创建活动。' },

  // ══ 县人武部（县级武装力量专属机构）══════════════════════════
  { key: 'county_wmd_cmd',       title: '县人武部部长（中校/上校）',
    tier: '正科级', organ: '人武部',
    desc: '主持县人民武装部全面工作，负责辖区民兵队伍建设、兵役征集与国防动员，中校或上校军衔。' },
  { key: 'county_wmd_pol',        title: '县人武部政委（中校/上校）',
    tier: '副处级', organ: '人武部',
    desc: '主持县人武部党委日常工作，负责民兵政治教育、双拥工作与党管武装制度落实，兼任县委常委。',
    isHighProfile: true, highProfileNote: '现役军人担任县委常委，是党管武装的核心制度安排，副处级高配' },
  { key: 'county_wmd_cs',        title: '县人武部参谋长（少校/中校）',
    tier: '副科级', organ: '人武部',
    desc: '负责县人武部参谋业务与民兵训练计划制定，是县域武装工作的具体参谋执行官。' },
  { key: 'county_wmd_dep',       title: '县人武部副部长（少校）',
    tier: '副科级', organ: '人武部',
    desc: '协助部长分管民兵预备役管理或兵役征集工作，是人武部战备动员具体落实者。' },

  // ══ 县委办公室·信访·税务 ══════════════════════════════════
  { key: 'county_party_office',  title: '县委办公室主任',
    tier: '正科级', organ: '县委',
    desc: '协助县委书记处理日常公务，统筹文件起草、会议组织与重要事项督办，是"大秘"的核心角色，晋升通道宽。' },
  { key: 'head_tax',             title: '县税务局局长',
    tier: '正科级', organ: '职能局',
    desc: '负责全县税收征管与税务稽查，执行税收政策，为县财政提供核心财源，是地税系统骨干培养关键岗。' },
  { key: 'head_petition',        title: '县信访局局长',
    tier: '正科级', organ: '县政府',
    desc: '负责接收处理群众来信来访，维护社会稳定，是党委政府"减压阀"，处置不当将直接影响上级考核。' },
  { key: 'head_veterans',        title: '县退役军人事务局局长',
    tier: '正科级', organ: '职能局',
    desc: '负责全县退役军人安置保障、权益维护与烈士褒扬工作，统筹"双拥"模范县创建活动。' },
  { key: 'head_statistics',      title: '县统计局局长',
    tier: '正科级', organ: '职能局',
    desc: '负责县域经济社会数据统计发布，防止统计数字造假，为县委科学决策提供数据支撑。' },

  { key: 'town_party1',          title: '第一镇党委书记',
    tier: '正科级', organ: '乡镇',
    desc: '主持下辖第一乡镇党委全面工作，负责辖区经济发展、社会治理与党建工作，是最基层的"一把手"。' },
  { key: 'town_party2',          title: '第二镇党委书记',
    tier: '正科级', organ: '乡镇',
    desc: '主持下辖第二乡镇党委全面工作，是乡镇党委书记系列的重要培养岗位。' },
  { key: 'town_party3',          title: '第三镇党委书记',
    tier: '正科级', organ: '乡镇',
    desc: '主持下辖第三乡镇党委全面工作，是县域扩大基层治理覆盖面的重要岗位。' },
  { key: 'town_party4',          title: '经济开发区党工委书记',
    tier: '正科级', organ: '乡镇',
    desc: '主持县级经济开发区党工委工作，是招商引资、工业集聚的最前线"主官"，晋升最快的基层岗位之一。',
    isHighProfile: true, highProfileNote: '开发区主官通常享受副处级政治待遇，是县内最具成长性岗位' },

  // ══ 副科级：职能局副职、政法机关副职、团委副书记、乡镇长 ══
  { key: 'dep_police',           title: '公安局副局长（分管刑侦）',
    tier: '副科级', organ: '职能局',
    desc: '协助局长分管刑事侦查、治安管理或交警业务，是公安业务的具体推进者，升任局长的常见通道。' },
  { key: 'county_court_vice',    title: '法院副院长',
    tier: '副科级', organ: '政法',
    desc: '协助院长分管审判业务庭室，负责立案、执行或某一审判条线的专项工作，是法院业务骨干核心职位。' },
  { key: 'county_proc_vice',     title: '检察院副检察长',
    tier: '副科级', organ: '政法',
    desc: '协助检察长分管侦监、公诉或检察技术条线，负责具体案件审核把关与队伍建设。' },
  { key: 'county_league_vice',   title: '团县委副书记',
    tier: '副科级', organ: '团委',
    desc: '协助书记主持团委日常工作，分管青年志愿服务或学生联合会工作，是团派路线的基层起步岗位。' },
  { key: 'dep_finance',          title: '财政局副局长',
    tier: '副科级', organ: '职能局',
    desc: '协助局长分管预算编制、国库管理或政府采购，是财政系统基层培养骨干的核心岗位。' },
  { key: 'dep_education',        title: '教育局副局长',
    tier: '副科级', organ: '职能局',
    desc: '协助局长分管义务教育均衡发展、师资队伍管理或职业教育推进工作。' },
  { key: 'dep_health',           title: '卫健局副局长',
    tier: '副科级', organ: '职能局',
    desc: '协助局长分管基层卫生院管理、公共卫生应急或计划生育服务体系建设。' },
  { key: 'dep_agriculture',      title: '农业农村局副局长',
    tier: '副科级', organ: '职能局',
    desc: '协助局长分管农业技术推广、高标准农田建设或乡村振兴项目落地。' },
  { key: 'dep_natural_res',      title: '自然资源局副局长',
    tier: '副科级', organ: '职能局',
    desc: '协助局长分管土地征收、矿产开发或不动产登记业务，是敏感业务的具体执行者。' },
  { key: 'dep_market',           title: '市场监管局副局长',
    tier: '副科级', organ: '职能局',
    desc: '协助局长分管食品安全监管、知识产权执法或营业执照审批，是基层市场监管体系的骨干。' },
  { key: 'dep_emergency',        title: '应急管理局副局长',
    tier: '副科级', organ: '职能局',
    desc: '协助局长分管工矿企业安全生产检查或消防救援工作，是基层应急体系的重要执行官员。' },
  { key: 'town_mayor1',          title: '第一镇镇长',
    tier: '副科级', organ: '乡镇',
    desc: '主持下辖第一乡镇政府行政工作，负责辖区GDP、农业生产与基础设施投资，向镇党委书记负责。' },
  { key: 'town_mayor2',          title: '第二镇镇长',
    tier: '副科级', organ: '乡镇',
    desc: '主持下辖第二乡镇政府行政工作，是乡镇政府主要行政首长，协助党委书记管理政务。' },
  { key: 'town_mayor3',          title: '第三镇镇长',
    tier: '副科级', organ: '乡镇',
    desc: '主持下辖第三乡镇政府行政工作，统筹辖区村庄建设、民生补贴发放与基层矛盾调处。' },
  { key: 'town_mayor4',          title: '经济开发区管委会主任',
    tier: '副科级', organ: '乡镇',
    desc: '主持县级开发区管委会行政工作，负责园区项目落地、基础设施建设与企业服务，是基层经济建设主力岗。' },
  { key: 'town_league_sec',      title: '镇团委书记',
    tier: '副科级', organ: '团委',
    desc: '主持乡镇团委工作，是团派路线最基层起点岗位，负责辖区青年工作与志愿服务组织。',
    isHighProfile: true, highProfileNote: '团派路线起点岗，通常3年内转任镇党政副职，是基层"快车道"出发站' },
];

/** 按级别分组获取县级职位 */
export function getCountyPositionsByTier(tier: CountyPosition['tier']): CountyPosition[] {
  return COUNTY_OFFICIAL_POSITIONS.filter(p => p.tier === tier);
}

// ============ 市级官职完整数据（正厅/副厅/正处/副处）============
export const CITY_OFFICIAL_POSITIONS: CityPosition[] = [
  // ══ 正厅级：市委市政府最高领导班子 ══════════════════════════
  { key: 'city_party_sec',    title: '市委书记',
    tier: '正厅级', organ: '市委',
    desc: '全市最高领导，主持市委常委会，统领全市党政军民工作。对上向省委负责，是大部分市级干部晋升的最终把关人，通常为省委常委（副部级）高配。',
    isHighProfile: true, highProfileNote: '大城市书记常由省委常委兼任（副部级高配）' },
  { key: 'city_mayor',        title: '市长（市政府党组书记）',
    tier: '正厅级', organ: '市政府',
    desc: '主持市政府全面工作，是市级行政首长。负责统筹经济发展、财政预算执行与民生保障，向市议政院负责并受市委书记领导。' },
  { key: 'city_npc_chair',    title: '市议政院常委会主任',
    tier: '正厅级', organ: '市议政院',
    desc: '主持市议政院常委会工作，审议地方性法规、重大政务事项与财政预算，对市政府司法工作开展监督，通常由退休市委书记或副书记转任。' },
  { key: 'city_cppcc_chair',  title: '市参政主席',
    tier: '正厅级', organ: '市参政院',
    desc: '主持市政治协商会议工作，开展政治协商与民主监督，联系各界代表人士，为市委重大决策提供参考意见。' },

  // ══ 副厅级：市委常委班子 ═════════════════════════════════
  { key: 'city_deputy_sec',   title: '市委副书记（专职）',
    tier: '副厅级', organ: '市委',
    desc: '协助书记主持日常党务工作，通常分管组织人事或意识形态，是接班市长或市委书记的核心培养岗位。' },
  { key: 'city_std_org',      title: '市委常委（组织部长）',
    tier: '副厅级', organ: '市委',
    desc: '主管全市干部选拔任用、组织建设与党员管理。掌握处级以下干部考察权，是全市仕途体系中最重要的守门人。' },
  { key: 'city_std_prop',     title: '市委常委（宣传部长）',
    tier: '副厅级', organ: '市委',
    desc: '主管全市思想宣传、新闻舆论与精神文明建设，负责协调市级媒体与意识形态安全工作。' },
  { key: 'city_std_disc',     title: '市委常委（纪委书记·监委主任）',
    tier: '副厅级', organ: '市纪委',
    desc: '主持市纪委监委工作，统筹全市党风廉政建设与反腐败斗争，对处级及以下干部有立案审查权。',
    isHighProfile: true, highProfileNote: '兼任监察委主任，权力范围扩展至政府系统人员，是市级"反腐第一要员"' },
  { key: 'city_std_pol',      title: '市委常委（政法委书记）',
    tier: '副厅级', organ: '政法',
    desc: '统筹协调全市公检法司政法机关工作，维护社会稳定，对重大刑事政治案件可提出党委处理意见。' },
  { key: 'city_std_united',   title: '市委常委（统战部长）',
    tier: '副厅级', organ: '市委',
    desc: '负责全市统一战线工作，联系非公经济代表人士、宗教界和海外侨胞，协调民主党派与无党派人士参与市政。' },
  { key: 'city_std_sec',      title: '市委常委（秘书长）',
    tier: '副厅级', organ: '市委',
    desc: '主持市委办公室工作，是市委政务运转的总协调人，负责常委会决议的贯彻执行与重要文件起草。' },
  { key: 'city_std_police',   title: '市委常委（公安局长）',
    tier: '副厅级', organ: '市委',
    desc: '主持市公安局工作，维护全市社会治安，统管刑侦、交警、特警与出入境管理，兼任市委常委。',
    isHighProfile: true, highProfileNote: '公安局长兼任常委为固定安排，属副厅级高配正处级职位' },
  { key: 'city_deputy_mayor1', title: '副市长一（分管工业·科技·招商）',
    tier: '副厅级', organ: '市政府',
    desc: '分管工业经济、科技创新、招商引资与开发区建设，联系工信局、科技局、发改委、招商投资局等。' },
  { key: 'city_deputy_mayor2', title: '副市长二（分管农业·生态·水利）',
    tier: '副厅级', organ: '市政府',
    desc: '分管农业农村、生态环境、水利林业与乡村振兴，联系农业农村局、生态环保局、水务局等。' },
  { key: 'city_deputy_mayor3', title: '副市长三（分管民生·教育·卫生）',
    tier: '副厅级', organ: '市政府',
    desc: '分管教育、卫健、民政、社保与文化体育，联系教育局、卫健委、人社局、文旅局等民生部门。' },
  { key: 'city_deputy_mayor4', title: '副市长四（分管城建·交通·规划）',
    tier: '副厅级', organ: '市政府',
    desc: '分管城市建设、住房保障、交通运输与自然资源规划，联系住建局、交通运输局、自然资源局等。' },
  { key: 'city_gov_sec_gen',   title: '市政府秘书长（市委常委）',
    tier: '副厅级', organ: '市政府',
    desc: '负责市政府办公室工作，协调全市政务运转，负责政府文件起草与重要会议组织。',
    isHighProfile: true, highProfileNote: '通常由市委常委兼任，行政路线从政府系统晋升的重要过渡岗位' },
  { key: 'city_npc_vice',      title: '市议政院常委会副主任',
    tier: '副厅级', organ: '市议政院',
    desc: '协助主任分管议政院工作，具体负责立法调研或执法检查工作，通常由退休正厅级干部担任。' },
  { key: 'city_cppcc_vice',    title: '市参政院副主席',
    tier: '副厅级', organ: '市参政院',
    desc: '协助主席分管参政院工作，联系特定界别委员，主持专题调研并向市委提交提案建议。' },
  { key: 'city_league_sec',    title: '团市委书记',
    tier: '副厅级', organ: '团委',
    desc: '主持共青团市委全面工作，领导全市共青团工作，是团派路线在市级的关键晋升节点，届满后多转任政府系统副厅级实职。',
    isHighProfile: true, highProfileNote: '团派路线市级关键职位，届满后通常转任副市长或市委副秘书长等副厅实职' },

  // ══ 正处级：市直属局局长、区县党政主官、政法机关正职 ══════
  { key: 'city_head_ndrc',    title: '市发展和改革委员会主任',
    tier: '正处级', organ: '市直属局',
    desc: '统筹全市经济社会发展规划与重大项目审批，是宏观调控与政策协调的核心枢纽，分管发展改革各条线。' },
  { key: 'city_head_finance', title: '市财政局局长',
    tier: '正处级', organ: '市直属局',
    desc: '管理全市财政收支，负责预算编制审核、资金调度与转移支付管理，是市级政府最重要的"管钱人"。' },
  { key: 'city_head_edu',     title: '市教育局局长',
    tier: '正处级', organ: '市直属局',
    desc: '统筹全市教育事业发展，负责学校布局调整、教师队伍建设与高考资源分配管理。' },
  { key: 'city_head_health',  title: '市卫生健康委员会主任',
    tier: '正处级', organ: '市直属局',
    desc: '推进全市医疗卫生体系建设，负责公共卫生应急响应、市级医院管理与基层卫生机构监管。' },
  { key: 'city_head_urban',   title: '市住房和城乡建设局局长',
    tier: '正处级', organ: '市直属局',
    desc: '推进全市城乡建设与住房保障，管理房地产市场秩序，负责重大基础设施项目审批监管。' },
  { key: 'city_head_eco',     title: '市生态环境局局长',
    tier: '正处级', organ: '市直属局',
    desc: '统筹全市生态环境保护工作，负责污染防治攻坚战落实，开展环保执法检查与减排目标管理。' },
  { key: 'city_head_market',  title: '市市场监督管理局局长',
    tier: '正处级', organ: '市直属局',
    desc: '统一监管全市市场秩序，负责食品药品安全、知识产权保护、营业执照管理与反垄断调查。' },
  { key: 'city_head_hr',      title: '市人力资源和社会保障局局长',
    tier: '正处级', organ: '市直属局',
    desc: '负责全市就业促进、社会保险管理、劳动关系协调与公务员招录工作，是重要的民生主管部门。' },
  { key: 'city_head_agri',    title: '市农业农村局局长',
    tier: '正处级', organ: '市直属局',
    desc: '推进全市农业农村现代化，统筹乡村振兴战略落实，负责农业产业化与高标准农田建设。' },
  { key: 'city_head_invest',  title: '市招商投资促进局局长',
    tier: '正处级', organ: '市直属局',
    desc: '统筹全市招商引资工作，负责重大产业项目对接洽谈，是经济发展考核核心部门负责人。' },
  { key: 'city_head_natural', title: '市自然资源和规划局局长',
    tier: '正处级', organ: '市直属局',
    desc: '负责全市土地资源规划管理、城乡规划审批与不动产登记，掌握土地指标，是腐败高发关键岗。' },
  { key: 'city_head_transport', title: '市交通运输局局长',
    tier: '正处级', organ: '市直属局',
    desc: '统筹全市公路建设维护、道路运输管理与城市公共交通发展，负责重大交通项目审批推进。' },
  { key: 'city_head_justice',  title: '市司法局局长',
    tier: '正处级', organ: '市直属局',
    desc: '主管全市法律援助、律师与公证行业监管、社区矫正工作，是纪检政法路线晋升的重要过渡岗位。' },
  { key: 'city_court_pres',   title: '市中级人民法院院长',
    tier: '正处级', organ: '政法',
    desc: '主持市中院审判工作，作为辖区内二审及重大刑事案件的审判机关最高负责人，维护司法公正权威。' },
  { key: 'city_proc_chief',   title: '市人民检察院检察长',
    tier: '正处级', organ: '政法',
    desc: '主持市检察院工作，负责对市内刑事案件的法律监督，承办职务犯罪查处工作。' },
  { key: 'city_county_sec',   title: '区（县）委书记',
    tier: '正处级', organ: '区（县）',
    desc: '主持辖区县委全面工作，为该区县最高党政领导，统领辖区经济社会发展全面工作。',
    isHighProfile: true, highProfileNote: '重点城区县书记有时由副市长兼任（副厅级高配）' },
  { key: 'city_county_gov',   title: '区（县）长',
    tier: '正处级', organ: '区（县）',
    desc: '主持辖区县政府行政工作，负责辖区GDP增长、民生投入与营商环境建设，向县区议政院负责。' },
  { key: 'city_league_vice',  title: '团市委副书记',
    tier: '正处级', organ: '团委',
    desc: '协助书记主持团市委日常工作，分管青年联合会或学生工作，是团派路线市级培养的常见起步岗位。' },

  // ══ 副处级：市直属局副职 ══════════════════════════════════
  { key: 'city_dep_police',   title: '市公安局副局长（分管刑侦）',
    tier: '副处级', organ: '市直属局',
    desc: '协助局长分管刑事侦查、治安管理或网络安全，是公安系统晋升局长前的必经岗位。' },
  { key: 'city_dep_finance',  title: '市财政局副局长',
    tier: '副处级', organ: '市直属局',
    desc: '协助局长分管预算编制、国库集中支付或政府债务管理，是财政系统骨干培养核心岗位。' },
  { key: 'city_dep_edu',      title: '市教育局副局长',
    tier: '副处级', organ: '市直属局',
    desc: '协助局长分管义务教育均衡、高考管理或职业教育推进，是教育系统晋升正职的常见过渡岗。' },
  { key: 'city_dep_health',   title: '市卫健委副主任',
    tier: '副处级', organ: '市直属局',
    desc: '协助主任分管基层卫生、公共卫生应急或医疗质量监管，是卫健系统骨干核心岗位。' },
  { key: 'city_dep_urban',    title: '市住建局副局长',
    tier: '副处级', organ: '市直属局',
    desc: '协助局长分管工程质量、城市管理或住房保障工作，是建设系统晋升正职的关键过渡岗位。' },
  { key: 'city_dep_ndrc',     title: '市发改委副主任',
    tier: '副处级', organ: '市直属局',
    desc: '协助主任分管重大项目审批、价格管理或区域规划推进，是发改委系统骨干核心岗。' },

  // ══ 市军分区系统（市委领导武装力量，大校级）══════════════════
  { key: 'city_mil_cmd',      title: '军分区司令员（大校）',
    tier: '副厅级', organ: '军分区',
    desc: '市（地）级军分区最高军事长官，负责辖区民兵建设、国防动员与兵役征集工作，大校军衔。',
    isHighProfile: true, highProfileNote: '军分区司令员兼任市委常委，是市级党委领导武装力量的制度安排' },
  { key: 'city_mil_pol',      title: '军分区政委（大校·市委常委）',
    tier: '副厅级', organ: '军分区',
    desc: '市级军分区政治工作负责人，主管部队党建与思想政治工作。兼任市委常委，是地方党委连接军队的桥梁。',
    isHighProfile: true, highProfileNote: '兼任市委常委，副厅级高配，大校军衔' },
  { key: 'city_mil_cs',       title: '军分区参谋长（中校/上校）',
    tier: '正处级', organ: '军分区',
    desc: '负责军分区参谋业务，统筹民兵训练计划与国防动员演练，是军分区作战训练工作核心负责人。' },

  // ══ 市武警支队（武警市级指挥机构）══════════════════════════
  { key: 'city_pap_cmd',      title: '市武警支队支队长（上校）',
    tier: '正处级', organ: '市武警',
    desc: '主持市武警支队全面工作，负责辖区内卫、机动与应急处突任务，承担重要目标警卫与维稳任务。' },

  // ══ 市直属局扩充（完善市级职能部门）══════════════════════════
  { key: 'city_head_science',  title: '市科学技术局局长',
    tier: '正处级', organ: '市直属局',
    desc: '推进全市科技创新体系建设，负责高新技术企业培育、科技平台建设与科技成果转化推进。' },
  { key: 'city_head_culture',  title: '市文化和旅游局局长',
    tier: '正处级', organ: '市直属局',
    desc: '推进全市文化事业和旅游产业发展，统筹景区管理与非遗保护传承，协调文旅融合重点项目。' },
  { key: 'city_head_water',    title: '市水务局局长',
    tier: '正处级', organ: '市直属局',
    desc: '统筹全市水资源利用与供排水管理，负责防汛抗旱应急与城市水环境综合治理。' },
  { key: 'city_head_emergency', title: '市应急管理局局长',
    tier: '正处级', organ: '市直属局',
    desc: '统筹全市应急管理体系建设，负责安全生产监管、重大灾害防治与突发事件应急处置协调。' },
  { key: 'city_head_commerce', title: '市商务局局长',
    tier: '正处级', organ: '市直属局',
    desc: '统筹全市对外贸易与商业体系发展，管理外商投资审批与大型商贸流通项目推进。' },
  { key: 'city_head_statistics', title: '市统计局局长',
    tier: '正处级', organ: '市直属局',
    desc: '主持全市统计工作，组织重要经济社会数据发布，防止数据造假，为市委决策提供统计支撑。' },
  { key: 'city_head_tax',        title: '市税务局局长',
    tier: '正处级', organ: '市直属局',
    desc: '负责全市税收征管与税务稽查，是辖区财政收入的关键保障部门负责人。' },
  { key: 'city_head_medins',     title: '市医疗保障局局长',
    tier: '正处级', organ: '市直属局',
    desc: '统筹全市基本医疗保险、生育保险与医疗救助政策，负责医保基金监管与药品集采工作。' },
  { key: 'city_head_veterans',   title: '市退役军人事务局局长',
    tier: '正处级', organ: '市直属局',
    desc: '负责全市退役军人安置保障与权益维护，统筹"双拥"工作，推进退役军人思想政治工作。' },
  { key: 'city_head_petition',   title: '市信访局局长',
    tier: '正处级', organ: '市直属局',
    desc: '统筹全市信访工作，化解社会矛盾，维护信访秩序，是"维稳"工作的核心窗口岗位。' },
  { key: 'city_head_state_assets', title: '市国资委主任',
    tier: '正处级', organ: '市直属局',
    desc: '代表市政府对市属国有企业行使出资人职责，监管市管国企人事绩效与国有资产保值增值。' },
  { key: 'city_mil_dep_cmd',     title: '军分区副司令员（上校）',
    tier: '副处级', organ: '军分区',
    desc: '协助司令员分管民兵训练、国防动员或兵役征集，是军分区第二梯队核心指挥官，上校军衔。' },
  { key: 'city_pap_pol',         title: '市武警支队政委（上校）',
    tier: '正处级', organ: '市武警',
    desc: '主持市武警支队政治工作，负责部队思想建设与党的领导制度落实，与支队长共同负责全面工作。' },
  { key: 'city_mil_dep_cs',      title: '军分区副参谋长（中校）',
    tier: '副处级', organ: '军分区',
    desc: '协助参谋长处理参谋业务，负责民兵应急演练组织与国防动员计划执行。' },
];

/** 按级别分组获取市级职位 */
export function getCityPositionsByTier(tier: CityPosition['tier']): CityPosition[] {
  return CITY_OFFICIAL_POSITIONS.filter(p => p.tier === tier);
}

// ============ 省级官职完整数据（正部/副部/正厅/副厅）============
export const PROVINCE_OFFICIAL_POSITIONS: ProvincePosition[] = [
  // ══ 正部级：省委省政府最高领导班子 ══════════════════════════
  { key: 'prov_party_sec',    title: '省委书记',
    tier: '正部级', organ: '省委',
    desc: '全省最高领导，主持省委常委会，统领全省党政军民工作。向中枢政治局负责，掌握全省厅级干部提名权，是仕途中最有分量的省级正职。',
    isHighProfile: true, highProfileNote: '重要省份书记通常由中枢政治局委员兼任（副国家级高配）' },
  { key: 'prov_governor',     title: '省长（省政府党组书记）',
    tier: '正部级', organ: '省政府',
    desc: '主持省政府全面工作，是省级行政首长。负责统筹经济发展、财政预算执行与民生保障，向省议政院负责并接受省委书记领导。' },
  { key: 'prov_npc_chair',    title: '省议政院常委会主任',
    tier: '正部级', organ: '省议政院',
    desc: '主持省议政院常委会工作，审议省级地方性法规与政府工作报告，监督省政府及司法机关，通常由退休省委书记担任。' },
  { key: 'prov_cppcc_chair',  title: '省参政主席',
    tier: '正部级', organ: '省参政院',
    desc: '主持省参政院工作，开展政治协商与民主监督，联系各界代表人士，通常由退休省委副书记或省长转任。' },

  // ══ 副部级：省委常委班子 ═════════════════════════════════
  { key: 'prov_deputy_sec',   title: '省委副书记（专职）',
    tier: '副部级', organ: '省委',
    desc: '协助书记主持日常党务工作，通常分管组织人事或意识形态，是接班省长或省委书记的核心培养岗位。' },
  { key: 'prov_std_org',      title: '省委常委（组织部长）',
    tier: '副部级', organ: '省委',
    desc: '主管全省干部选拔任用、组织建设与党员管理，掌握全省厅级以下干部考察权，是省级最重要的人事守门人。' },
  { key: 'prov_std_prop',     title: '省委常委（宣传部长）',
    tier: '副部级', organ: '省委',
    desc: '主管全省思想宣传、新闻舆论与精神文明建设，协调省级媒体与意识形态安全管理。' },
  { key: 'prov_std_disc',     title: '省委常委（纪委书记·监委主任）',
    tier: '副部级', organ: '省纪委',
    desc: '主持省纪委监委工作，统筹全省党风廉政建设与反腐败斗争，对厅级以下干部有立案审查权。',
    isHighProfile: true, highProfileNote: '兼任省监察委主任，是全省反腐主导者，权力实际超出一般常委' },
  { key: 'prov_std_pol',      title: '省委常委（政法委书记）',
    tier: '副部级', organ: '政法',
    desc: '统筹协调全省公检法司政法机关工作，维护省域社会稳定，负责重大政治案件处理意见汇报。' },
  { key: 'prov_std_united',   title: '省委常委（统战部长）',
    tier: '副部级', organ: '省委',
    desc: '负责全省统一战线工作，联系非公经济代表人士、宗教界与港澳台海外侨胞，协调民主党派参与省政。' },
  { key: 'prov_std_sec',      title: '省委常委（秘书长）',
    tier: '副部级', organ: '省委',
    desc: '主持省委办公厅工作，是省委政务运转的总协调人，负责常委会决议贯彻执行与重要文件起草。' },
  { key: 'prov_std_city',     title: '省委常委（省会城市委书记）',
    tier: '副部级', organ: '省委',
    desc: '兼任省会城市党委书记，同时担任省委常委。是省委对省会实施直接领导的制度安排。',
    isHighProfile: true, highProfileNote: '省会城市书记兼任省委常委为固定惯例，属副部级高配正厅级岗位' },
  { key: 'prov_std_military',  title: '省委常委（省军区政委）',
    tier: '副部级', organ: '省委',
    desc: '兼任省军区政委，是省委领导武装力量的重要常委职位，负责民兵武装、国防动员与双拥工作。' },
  { key: 'prov_deputy_gov1',  title: '常务副省长（省政府党组副书记）',
    tier: '副部级', organ: '省政府',
    desc: '协助省长主持省政府常务工作，在省长出缺时代为主持全面工作，分管财政、发改、统计等综合性核心部门。',
    isHighProfile: true, highProfileNote: '常务副省长是省政府序列第一副职，晋升省长的核心热门岗位' },
  { key: 'prov_deputy_gov2',  title: '副省长二（分管工业·科技·招商）',
    tier: '副部级', organ: '省政府',
    desc: '分管工业经济、科技创新、招商引资与开发区建设，联系工信厅、科技厅、发改委、工业园区等。' },
  { key: 'prov_deputy_gov3',  title: '副省长三（分管农业·生态·水利）',
    tier: '副部级', organ: '省政府',
    desc: '分管农业农村、生态环境、水利林业与乡村振兴，联系农业农村厅、生态环境厅、水利厅等。' },
  { key: 'prov_deputy_gov4',  title: '副省长四（分管民生·教育·卫生）',
    tier: '副部级', organ: '省政府',
    desc: '分管教育、卫健、民政、社保与文化体育，联系教育厅、卫健委、民政厅、人社厅等民生部门。' },
  { key: 'prov_deputy_gov5',  title: '副省长五（分管城建·交通·规划）',
    tier: '副部级', organ: '省政府',
    desc: '分管城市建设、住房保障、交通运输与自然资源规划，联系住建厅、交通厅、自然资源厅等。' },
  { key: 'prov_gov_sec_gen',   title: '省政府秘书长（省委常委）',
    tier: '副部级', organ: '省政府',
    desc: '负责省政府办公厅工作，协调全省政务运转，负责政府文件起草与重要会议组织。',
    isHighProfile: true, highProfileNote: '通常由省委常委兼任，行政路线晋升省长的重要过渡岗位' },
  { key: 'prov_npc_vice',     title: '省议政院常委会副主任',
    tier: '副部级', organ: '省议政院',
    desc: '协助主任分管立法调研或执法检查工作，具体负责特定专门委员会，通常由退休省级领导担任。' },
  { key: 'prov_cppcc_vice',   title: '省参政院副主席',
    tier: '副部级', organ: '省参政院',
    desc: '协助主席分管参政院工作，联系特定界别委员，主持专题调研提案工作，由退休省级干部或民主党派代表担任。' },
  { key: 'prov_league_sec',   title: '团省委书记（省委常委）',
    tier: '副部级', organ: '团委',
    desc: '主持共青团省委全面工作，是团派路线在省级的核心晋升节点。通常由省委常委兼任，届满后多转任副省长或省委副秘书长等副部级实职。',
    isHighProfile: true, highProfileNote: '团派路线省级关键职位，省委常委兼任团省委书记为惯例安排，是进入省级领导班子的重要通道' },

  // ══ 正厅级：省直属厅厅长、地市党政主官、政法机关正职 ══════
  { key: 'prov_head_police',  title: '省公安厅厅长',
    tier: '正厅级', organ: '省直属厅',
    desc: '主持全省公安工作，统筹社会治安综合治理与刑侦业务，是省级最重要的强力部门负责人。' },
  { key: 'prov_head_ndrc',    title: '省发展和改革委员会主任',
    tier: '正厅级', organ: '省直属厅',
    desc: '统筹全省经济社会发展规划与重大项目审批，是宏观调控与政策协调的核心枢纽，分管发展改革各条线。' },
  { key: 'prov_head_finance', title: '省财政厅厅长',
    tier: '正厅级', organ: '省直属厅',
    desc: '管理全省财政收支，负责省级预算编制审核、转移支付管理与地方政府债券发行，是省级"钱袋子"。' },
  { key: 'prov_head_edu',     title: '省教育厅厅长',
    tier: '正厅级', organ: '省直属厅',
    desc: '统筹全省基础教育、高等教育与职业教育政策，推进教育改革与高校建设，负责高考招录制度管理。' },
  { key: 'prov_head_health',  title: '省卫生健康委员会主任',
    tier: '正厅级', organ: '省直属厅',
    desc: '推进全省医疗卫生体系建设，负责公共卫生应急响应、省级医院管理与基层卫生机构监管。' },
  { key: 'prov_head_urban',   title: '省住房和城乡建设厅厅长',
    tier: '正厅级', organ: '省直属厅',
    desc: '推进全省城乡建设与住房保障政策，管理省级建设市场秩序，负责重大基础设施项目审批监管。' },
  { key: 'prov_head_eco',     title: '省生态环境厅厅长',
    tier: '正厅级', organ: '省直属厅',
    desc: '统筹全省生态环境保护，负责污染防治攻坚战落实，开展环保执法检查与减排目标管理。' },
  { key: 'prov_head_market',  title: '省市场监督管理局局长',
    tier: '正厅级', organ: '省直属厅',
    desc: '统一监管全省市场秩序，负责食品药品安全、知识产权保护与反垄断调查，优化全省营商环境。' },
  { key: 'prov_head_agri',    title: '省农业农村厅厅长',
    tier: '正厅级', organ: '省直属厅',
    desc: '推进全省农业农村现代化，统筹乡村振兴战略落实，负责农业产业化政策制定与高标准农田建设。' },
  { key: 'prov_head_hr',      title: '省人力资源和社会保障厅厅长',
    tier: '正厅级', organ: '省直属厅',
    desc: '负责全省就业促进、社会保险管理与劳动关系协调，主管省级公务员招录与厅级干部日常管理。' },
  { key: 'prov_head_natural', title: '省自然资源厅厅长',
    tier: '正厅级', organ: '省直属厅',
    desc: '负责全省土地资源规划管理、矿产开发监管与不动产登记，掌握土地指标，是腐败高发关键岗位。' },
  { key: 'prov_head_justice', title: '省司法厅厅长',
    tier: '正厅级', organ: '省直属厅',
    desc: '主管全省法律援助、律师公证行业监管、社区矫正与地方立法技术审查，纪检政法路线重要晋升岗位。' },
  { key: 'prov_head_transport', title: '省交通运输厅厅长',
    tier: '正厅级', organ: '省直属厅',
    desc: '统筹全省公路铁路水运综合交通运输体系建设，负责重大交通项目规划审批与交通安全监管。' },
  { key: 'prov_head_audit',   title: '省审计厅厅长',
    tier: '正厅级', organ: '省直属厅',
    desc: '负责省级预算执行与政府财政收支的独立审计监督，开展领导干部经济责任审计与专项审计。' },
  { key: 'prov_court_pres',   title: '省高级人民法院院长',
    tier: '正厅级', organ: '政法',
    desc: '主持省高院审判工作，作为全省最高审判机关的最高负责人，承办重大死刑复核及二审上诉案件。' },
  { key: 'prov_proc_chief',   title: '省人民检察院检察长',
    tier: '正厅级', organ: '政法',
    desc: '主持省检察院工作，负责对全省重大刑事案件的法律监督，开展职务犯罪检察与省级重大案件审核。' },
  { key: 'prov_city_sec',     title: '地级市委书记',
    tier: '正厅级', organ: '地市',
    desc: '主持地市党委全面工作，统领辖区经济社会发展。向省委书记负责，对辖区干部具有直接提名权。' },
  { key: 'prov_city_mayor',   title: '地级市市长',
    tier: '正厅级', organ: '地市',
    desc: '主持地市政府行政工作，是辖区最高行政首长，统筹经济发展与民生建设，向市议政院负责。' },

  // ══ 副厅级：省直属厅副职、地市副职 ══════════════════════════
  { key: 'prov_dep_police',   title: '省公安厅副厅长（分管刑侦）',
    tier: '副厅级', organ: '省直属厅',
    desc: '协助厅长分管刑事侦查、治安管理或网络安全，是全省公安系统晋升厅长前的核心培养岗位。' },
  { key: 'prov_dep_finance',  title: '省财政厅副厅长',
    tier: '副厅级', organ: '省直属厅',
    desc: '协助厅长分管省级预算编制、国库集中支付或政府债务管理，是财政系统骨干晋升的核心岗位。' },
  { key: 'prov_dep_edu',      title: '省教育厅副厅长',
    tier: '副厅级', organ: '省直属厅',
    desc: '协助厅长分管高等教育、基础教育或职业教育某一条线，是教育系统晋升厅长的常见过渡岗位。' },
  { key: 'prov_dep_health',   title: '省卫健委副主任',
    tier: '副厅级', organ: '省直属厅',
    desc: '协助主任分管医疗质量、公共卫生或基层卫生，是卫健系统晋升正厅级的关键骨干培养岗位。' },
  { key: 'prov_dep_ndrc',     title: '省发改委副主任',
    tier: '副厅级', organ: '省直属厅',
    desc: '协助主任分管重大项目审批、价格管理或区域规划推进，是发改委系统骨干核心岗位。' },
  { key: 'prov_city_dep_sec', title: '地级市委副书记',
    tier: '副厅级', organ: '地市',
    desc: '协助地市委书记分管党务，通常兼任市长，是晋升市委书记的核心候选岗位。' },
  { key: 'prov_dep_justice',  title: '省司法厅副厅长',
    tier: '副厅级', organ: '省直属厅',
    desc: '协助厅长分管律师公证行业监管、社区矫正或法律援助工作，是纪检政法条线骨干培养岗位。' },

  // ══ 省军区系统（省委领导武装力量，少将级正副职）══════════════
  { key: 'prov_mil_cmd',     title: '省军区司令员（少将）',
    tier: '正厅级', organ: '省军区',
    desc: '省军区最高军事长官，负责全省民兵工作、兵役动员与边防安全，战时向战区陆军统一指挥。',
    isHighProfile: true, highProfileNote: '少将军衔，省委常委会列席成员，是党委领导武装力量的重要制度安排' },
  { key: 'prov_mil_pol',     title: '省军区政委（少将·省委常委）',
    tier: '副部级', organ: '省军区',
    desc: '省军区政治工作最高负责人，主管部队党建与思想政治工作。兼任省委常委，是连接军队与地方党委的纽带。',
    isHighProfile: true, highProfileNote: '省委常委兼省军区政委，副部级高配，是少将军衔的最高地方兼职' },
  { key: 'prov_mil_dep_cmd', title: '省军区副司令员（大校/少将）',
    tier: '正厅级', organ: '省军区',
    desc: '协助司令员主持省军区工作，分管民兵训练、兵役征集或国防动员，大校或少将军衔。' },
  { key: 'prov_mil_cs',      title: '省军区参谋长（大校）',
    tier: '正厅级', organ: '省军区',
    desc: '主持省军区机关参谋工作，统筹作战动员规划与训练计划制定，是省军区业务核心参谋长。' },

  // ══ 武装警察总队（省级武警最高指挥机构）══════════════════════
  { key: 'prov_pap_cmd',     title: '省武警总队总队长（大校/少将）',
    tier: '正厅级', organ: '武警',
    desc: '主持省武装警察总队工作，负责全省武警部队的内卫、机动、交通与森林防火等专项任务。' },
  { key: 'prov_pap_pol',     title: '省武警总队政委（大校/少将）',
    tier: '正厅级', organ: '武警',
    desc: '主持省武警总队政治工作，负责部队思想建设与党的领导制度落实，与总队长共同负责全面工作。' },

  // ══ 省直属其他厅局（扩充完善）══════════════════════════════════
  { key: 'prov_head_science',  title: '省科学技术厅厅长',
    tier: '正厅级', organ: '省直属厅',
    desc: '推进全省科技创新体系建设，负责重大科技专项组织实施、高新技术企业认定与科技成果转化推进。' },
  { key: 'prov_head_civil',    title: '省民政厅厅长',
    tier: '正厅级', organ: '省直属厅',
    desc: '负责全省低保救助、养老服务、残障事务与婚姻登记管理，统筹村级自治与社区治理政策。' },
  { key: 'prov_head_commerce', title: '省商务厅厅长',
    tier: '正厅级', organ: '省直属厅',
    desc: '统筹全省对外贸易与内外资招商促进，管理外商投资审批与"一带一路"产业合作项目。' },
  { key: 'prov_head_culture',  title: '省文化和旅游厅厅长',
    tier: '正厅级', organ: '省直属厅',
    desc: '推进全省文化事业与文化产业发展，统筹旅游景区管理与非物质文化遗产保护传承工作。' },
  { key: 'prov_head_state_assets', title: '省国资委主任',
    tier: '正厅级', organ: '省直属厅',
    desc: '代表省政府对省属国有企业行使出资人职责，监管省管国企人事绩效与国有资产保值增值。' },
  { key: 'prov_head_statistic', title: '省统计局局长',
    tier: '正厅级', organ: '省直属厅',
    desc: '主持全省统计工作，发布省级GDP及重要经济社会数据，防止统计数字弄虚作假。' },
  { key: 'prov_head_water',    title: '省水利厅厅长',
    tier: '正厅级', organ: '省直属厅',
    desc: '统筹全省水资源管理与水利工程建设，负责防汛抗旱应急与农村水利基础设施建设。' },
  { key: 'prov_head_emergency', title: '省应急管理厅厅长',
    tier: '正厅级', organ: '省直属厅',
    desc: '统筹全省应急管理体系，负责安全生产监管、自然灾害防治与重大突发事件处置协调。' },
  { key: 'prov_head_forestry', title: '省林草局局长',
    tier: '正厅级', organ: '省直属厅',
    desc: '负责全省林草资源保护与合理利用，统筹森林防火、退耕还林与湿地保护工作。' },
  { key: 'prov_head_customs',  title: '省（直辖市）海关关长',
    tier: '正厅级', organ: '省直属厅',
    desc: '主持省级海关工作，监管进出口贸易通关与税收征管，负责反走私与边境安全管理。',
    isHighProfile: false },
  { key: 'prov_league_vice',  title: '团省委副书记',
    tier: '正厅级', organ: '团委',
    desc: '协助书记主持团省委日常工作，分管青年联合会或高校学生工作，是团派路线省级培养的重要起步岗位。' },

  // ══ 省直属其他厅局（进一步完善）══════════════════════════════════
  { key: 'prov_head_natsec',   title: '省国家安全厅厅长',
    tier: '正厅级', organ: '省直属厅',
    desc: '负责全省反间谍、反颠覆与境外情报工作，职权高度保密。通常由省委常委分管，向国家安全部垂直汇报。',
    isHighProfile: true, highProfileNote: '最神秘的省级厅局长，权力游离于公众视野之外，但其政治地位不容小觑' },
  { key: 'prov_head_tax',      title: '省税务局局长',
    tier: '正厅级', organ: '省直属厅',
    desc: '负责全省税收征管政策执行与税务稽查，是省级财源的核心保障部门，受国家税务总局垂直管理。' },
  { key: 'prov_head_medins',   title: '省医疗保障局局长',
    tier: '正厅级', organ: '省直属厅',
    desc: '统筹全省基本医疗保险、生育保险与医疗救助体系，负责医保基金安全监管与药品耗材集采管理。' },
  { key: 'prov_head_veterans', title: '省退役军人事务厅厅长',
    tier: '正厅级', organ: '省直属厅',
    desc: '统筹全省退役军人安置、权益保障与烈士褒扬工作，推进"双拥"省份建设，维护社会稳定。' },
  { key: 'prov_head_sports',   title: '省体育局局长',
    tier: '正厅级', organ: '省直属厅',
    desc: '统筹全省体育事业与体育产业发展，负责竞技体育后备人才培养、全民健身推进与重大赛事申办。' },
  { key: 'prov_head_ethnic',   title: '省民族宗教事务委员会主任',
    tier: '正厅级', organ: '省直属厅',
    desc: '负责全省民族关系协调、少数民族权益保护与宗教事务管理，是边疆与民族省份最敏感的职能机构。',
    isHighProfile: true, highProfileNote: '在民族地区省份（如云南、新疆、西藏、广西）政治分量尤为突出' },
  { key: 'prov_head_grain',    title: '省粮食和物资储备局局长',
    tier: '正厅级', organ: '省直属厅',
    desc: '负责全省粮食收购储运与应急物资储备管理，统筹粮食市场监管，是粮食安全战略的省级执行机构。' },
  { key: 'prov_head_broadcast', title: '省广播电视局局长',
    tier: '正厅级', organ: '省直属厅',
    desc: '监管全省广播电视内容播出与新兴网络视听业务，是意识形态领域的重要技术监管机构。' },
  { key: 'prov_head_petition',  title: '省信访局局长',
    tier: '正厅级', organ: '省直属厅',
    desc: '统筹全省信访工作，化解重大群体性矛盾，是省委"维稳"体系中的核心协调部门，主官压力极大。' },

  // ══ 省纪委·巡视系统 ══════════════════════════════════════════
  { key: 'prov_inspection_lead', title: '省委巡视组组长',
    tier: '副厅级', organ: '省纪委',
    desc: '代表省委对地市、国有企业或高校开展政治巡视，是反腐败与政治监督的"前沿侦察队"，有权向省委反映问题。',
    isHighProfile: true, highProfileNote: '省委巡视具有极大政治威慑力，被巡视单位官员视之如临深渊' },

  // ══ 省军区系统（扩充完善）══════════════════════════════════════
  { key: 'prov_mil_pol_dir',  title: '省军区政治部主任（大校）',
    tier: '副厅级', organ: '省军区',
    desc: '主持省军区政治部工作，统管部队政治工作、干部管理与思想建设，是省军区政委的核心助手。' },
  { key: 'prov_mil_log',      title: '省军区联合保障中心主任（大校）',
    tier: '副厅级', organ: '省军区',
    desc: '统筹省军区后勤保障与国防动员物资储备，是省级战备体系的重要支撑部门负责人。' },

  // ══ 武装警察总队（扩充）══════════════════════════════════════
  { key: 'prov_pap_cs',      title: '省武警总队参谋长（大校）',
    tier: '正厅级', organ: '武警',
    desc: '主持省武警总队参谋部工作，统筹部队训练、作战方案与应急处突演练计划，是总队核心参谋长。' },
  { key: 'prov_pap_pol_dep', title: '省武警总队政治部主任（大校）',
    tier: '副厅级', organ: '武警',
    desc: '主持省武警总队政治部工作，负责部队思想工作、党建与干部管理，协助政委开展教育管理工作。' },
];

/** 按级别分组获取省级职位 */
export function getProvincePositionsByTier(tier: ProvincePosition['tier']): ProvincePosition[] {
  return PROVINCE_OFFICIAL_POSITIONS.filter(p => p.tier === tier);
}

// ============ 副省级城市官职架构（副部/正厅/副厅/正处）============
export const SUB_PROVINCE_CITY_POSITIONS: SubProvincePosition[] = [
  // ── 副部级（最高领导，整体升格）──
  { key: 'spc_party_sec',     title: '市委书记',        tier: '副部级', organ: '市委',    desc: '主持市委全面工作，级别高于普通地级市委书记（正厅级）' },
  { key: 'spc_mayor',         title: '市长',            tier: '副部级', organ: '市政府',  desc: '主持市政府全面工作，级别高于普通地级市长（正厅级）' },

  // ── 正厅级（常委班子及议政院参政院主职）──
  { key: 'spc_deputy_sec',    title: '市委副书记',      tier: '正厅级', organ: '市委',    desc: '协助书记分管党务，级别高于普通副市级市委副书记' },
  { key: 'spc_std_org',       title: '市委常委（组织部长）', tier: '正厅级', organ: '市委', desc: '主管组织建设、干部选拔任用' },
  { key: 'spc_std_prop',      title: '市委常委（宣传部长）', tier: '正厅级', organ: '市委', desc: '主管思想宣传、新闻舆论建设' },
  { key: 'spc_std_disc',      title: '市委常委（纪委书记）', tier: '正厅级', organ: '市委', desc: '主持纪检监察工作' },
  { key: 'spc_std_pol',       title: '市委常委（政法委书记）', tier: '正厅级', organ: '市委', desc: '统筹政法机关工作，维护社会稳定' },
  { key: 'spc_deputy_mayor1', title: '副市长一',        tier: '正厅级', organ: '市政府',  desc: '分管工业经济、科技创新、招商引资' },
  { key: 'spc_deputy_mayor2', title: '副市长二',        tier: '正厅级', organ: '市政府',  desc: '分管农业农村、生态环境、水利林业' },
  { key: 'spc_deputy_mayor3', title: '副市长三',        tier: '正厅级', organ: '市政府',  desc: '分管教育卫生、民政社保、文化体育' },
  { key: 'spc_deputy_mayor4', title: '副市长四',        tier: '正厅级', organ: '市政府',  desc: '分管城建住建、交通运输、自然资源' },
  { key: 'spc_npc_chair',     title: '市议政院常委会主任', tier: '正厅级', organ: '市议政院',  desc: '主持市议政院工作，审议重大事项' },
  { key: 'spc_cppcc_chair',   title: '市参政主席',      tier: '正厅级', organ: '市参政院',  desc: '主持参政院工作，开展政治协商与民主监督' },

  // ── 副厅级（市直属局局长 + 区主职领导，升格安排）──
  { key: 'spc_head_police',   title: '市公安局局长',    tier: '副厅级', organ: '市直属局', desc: '主持公安工作，在副省级城市为副厅级，高于普通地级市正处级' },
  { key: 'spc_head_ndrc',     title: '市发改委主任',    tier: '副厅级', organ: '市直属局', desc: '统筹全市经济社会发展战略，副厅级配置' },
  { key: 'spc_head_finance',  title: '市财政局局长',    tier: '副厅级', organ: '市直属局', desc: '管理财政收支，副厅级配置' },
  { key: 'spc_head_edu',      title: '市教育局局长',    tier: '副厅级', organ: '市直属局', desc: '发展教育事业，副厅级配置' },
  { key: 'spc_head_health',   title: '市卫健委主任',    tier: '副厅级', organ: '市直属局', desc: '推进医疗卫生事业，副厅级配置' },
  { key: 'spc_head_urban',    title: '市住建局局长',    tier: '副厅级', organ: '市直属局', desc: '推进城市建设，副厅级配置' },
  { key: 'spc_dist_sec',      title: '区委书记',        tier: '副厅级', organ: '区委',    desc: '主持辖区党委全面工作，副厅级配置（高于普通区正处级）' },
  { key: 'spc_dist_gov',      title: '区长',            tier: '副厅级', organ: '区政府',  desc: '主持辖区政府工作，负责行政管理，副厅级配置' },

  // ── 正处级（内设处室处长 + 街道办主任，同步升格）──
  { key: 'spc_dept_chief1',   title: '局内设处室处长一', tier: '正处级', organ: '市直属局', desc: '负责局内重要处室管理工作，为正处级' },
  { key: 'spc_dept_chief2',   title: '局内设处室处长二', tier: '正处级', organ: '市直属局', desc: '协助处室开展具体业务工作，为正处级' },
  { key: 'spc_street1',       title: '街道办事处主任一', tier: '正处级', organ: '街道',    desc: '主持辖区街道全面工作，为正处级（高于普通街道科级）' },
  { key: 'spc_street2',       title: '街道办事处主任二', tier: '正处级', organ: '街道',    desc: '负责辖区街道行政事务，为正处级' },
  { key: 'spc_street3',       title: '街道办事处主任三', tier: '正处级', organ: '街道',    desc: '负责辖区街道行政事务，为正处级' },
];

/** 按级别分组获取副省级城市职位 */
export function getSubProvincePositionsByTier(tier: SubProvincePosition['tier']): SubProvincePosition[] {
  return SUB_PROVINCE_CITY_POSITIONS.filter(p => p.tier === tier);
}

/** 重要人事任命的逐级审批层级 */
export type ApprovalLevel = '本级决定' | '县级议政院/组织部审批' | '地市级审批' | '省级审批' | '中央审批';

/**
 * 政府行政班子职位（本级决定，一键任命可直接通过）
 * 以 roleKey 前缀判断：gov / deputy_gov / exec_deputy / dep_gov / office / gov_sec / gov_office
 */
const GOV_ROLE_PREFIXES = [
  'town_deputy_gov', 'town_office_dir',       // 乡镇政府
  'cty_exec_deputy', 'cty_deputy_gov', 'cty_gov_sec',       // 县政府
  'city_exec_deputy', 'city_dep_gov', 'city_gov_sec', 'city_gov_office', 'city_deputy_gov', // 市政府
  'prov_exec_deputy', 'prov_dep_gov', 'prov_gov_sec',       // 省政府
  'vice_premier', 'state_councilor', 'state_sec_gen',       // 国政院
  'min_vice', 'min_exec_deputy',                            // 部委副职
];

/** 根据玩家职级和任命职务判断所需审批层级 */
export function getAppointmentApprovalLevel(playerRank: number, roleKey: string): ApprovalLevel {
  // 政府行政职位（副镇长/副县长/副市长/副省长等）→ 本级决定，无需民主评议
  if (GOV_ROLE_PREFIXES.some(prefix => roleKey.startsWith(prefix))) return '本级决定';

  // 党委系列职位（纪委/组织/宣传/政法/常委等）需民主评议
  if (playerRank <= 4) return '县级议政院/组织部审批';
  if (playerRank <= 6) return '地市级审批';
  if (playerRank <= 9) return '省级审批';
  return '中央审批';
}
export const SUB_LEVEL_NAMES = [
  '', // 0 占位
  '科员', '副科级', '正科级', '副处级',
  '正处级', '副厅级', '正厅级', '副部级',
  '正部级', '副国级', '正国级', '副院理级',
];
export const SUB_LEVEL_COUNT = 12;

/**
 * 各职级下属的全局人数上限（金字塔结构）
 * 防止反复晋升导致大量高级别干部堆积
 */
export const SUB_LEVEL_MAX_COUNT: Record<number, number> = {
  1: 999, 2: 999,   // 科员/副科级 不限
  3: 30,  4: 20,    // 正科/副处
  5: 12,  6: 8,     // 正处/副厅
  7: 5,   8: 3,     // 正厅/副部
  9: 2,             // 正部（玩家团队最多2名正部级下属）
  10: 1, 11: 1, 12: 0,
};

export interface DeptConfig {
  key: DeptKey;
  name: string;
  fullName: string;
  icon: string;
  headTitle: string;
  deputyTitle: string; // 副职称谓
  affectIndex: string;
  desc: string;
  functions: string[];
  // 有正职时每月自动执行的效果（按能力系数缩放）
  autoEffect: Partial<{
    cityGdp: number;
    cityLivelihood: number;
    cityEcology: number;
    cityBusiness: number;
    securityIndex: number;
    meritPoints: number;
    bossFavor: number;
    fundBalance: number;
    taxRevenue: number;
  }>;
  autoActionName: string; // 自动行动的名称，用于日志/提示
}

export const DEPT_CONFIG: Record<DeptKey, DeptConfig> = {
  police: {
    key: 'police', name: '公安局', fullName: '公安局', icon: '🚔',
    headTitle: '公安局长', deputyTitle: '公安副局长', affectIndex: '治安→民生',
    desc: '维护社会治安，侦破刑事案件，保障人民群众生命财产安全。',
    functions: ['治安管理', '刑事侦查', '户籍管理', '交通管理'],
    autoActionName: '日常巡逻执勤',
    autoEffect: { securityIndex: 2, cityLivelihood: 1, meritPoints: 3 },
  },
  ndrc: {
    key: 'ndrc', name: '发展改革委', fullName: '发展和改革委员会', icon: '📈',
    headTitle: '发改委主任', deputyTitle: '发改委副主任', affectIndex: 'GDP发展',
    desc: '统筹谋划经济发展，审批重大投资项目，推进重点改革举措。',
    functions: ['经济规划', '项目审批', '价格管理', '产业政策'],
    autoActionName: '项目审批推进',
    autoEffect: { cityGdp: 2, cityBusiness: 1, meritPoints: 3 },
  },
  finance: {
    key: 'finance', name: '财政局', fullName: '财政局', icon: '💰',
    headTitle: '财政局长', deputyTitle: '财政副局长', affectIndex: '综合指数',
    desc: '管理财政收支，优化预算分配，保障重大项目资金来源。',
    functions: ['预算编制', '资金拨付', '财务监督', '政府债务'],
    autoActionName: '财政资金管理',
    autoEffect: { fundBalance: 15, meritPoints: 2 },
  },
  urban: {
    key: 'urban', name: '住建局', fullName: '住房和城乡建设局', icon: '🏗️',
    headTitle: '住建局长', deputyTitle: '住建副局长', affectIndex: 'GDP+民生',
    desc: '推进城市建设与基础设施建设，改善居住环境。',
    functions: ['房地产管理', '城镇建设', '市政设施', '工程质量'],
    autoActionName: '市政工程督查',
    autoEffect: { cityGdp: 1, cityLivelihood: 2, meritPoints: 2 },
  },
  education: {
    key: 'education', name: '教育局', fullName: '教育局', icon: '📚',
    headTitle: '教育局长', deputyTitle: '教育副局长', affectIndex: '民生满意',
    desc: '发展教育事业，均衡教育资源，提升民生满意度。',
    functions: ['学校管理', '师资建设', '教育资源配置', '职业教育'],
    autoActionName: '教学质量督导',
    autoEffect: { cityLivelihood: 3, meritPoints: 2 },
  },
  health: {
    key: 'health', name: '卫健委', fullName: '卫生健康委员会', icon: '🏥',
    headTitle: '卫健委主任', deputyTitle: '卫健委副主任', affectIndex: '民生满意',
    desc: '推进医疗卫生事业发展，保障群众基本医疗需求。',
    functions: ['医疗服务', '公共卫生', '卫生监督', '医改推进'],
    autoActionName: '医疗卫生巡查',
    autoEffect: { cityLivelihood: 3, meritPoints: 2 },
  },
  ecology: {
    key: 'ecology', name: '生态环保局', fullName: '生态环境局', icon: '🌿',
    headTitle: '生态局长', deputyTitle: '生态副局长', affectIndex: '生态环境',
    desc: '保护生态环境，开展环保专项行动，推进绿色发展。',
    functions: ['污染防治', '生态修复', '环境监测', '绿化建设'],
    autoActionName: '环境巡查监测',
    autoEffect: { cityEcology: 3, meritPoints: 2 },
  },
  market: {
    key: 'market', name: '市场监管局', fullName: '市场监督管理局', icon: '⚖️',
    headTitle: '市监局长', deputyTitle: '市监副局长', affectIndex: '营商环境',
    desc: '加强市场监管，维护市场秩序，优化营商环境。',
    functions: ['市场准入', '质量监管', '反垄断执法', '食品安全'],
    autoActionName: '日常市场监查',
    autoEffect: { cityBusiness: 2, cityLivelihood: 1, meritPoints: 2 },
  },
  agriculture: {
    key: 'agriculture', name: '农业农村局', fullName: '农业农村局', icon: '🌾',
    headTitle: '农业局长', deputyTitle: '农业副局长', affectIndex: 'GDP+民生',
    desc: '推进农业农村现代化，实施乡村振兴战略。',
    functions: ['农业生产', '农村建设', '农民增收', '农技推广'],
    autoActionName: '农业生产督导',
    autoEffect: { cityGdp: 1, cityLivelihood: 2, meritPoints: 2 },
  },
  personnel: {
    key: 'personnel', name: '人事局', fullName: '人事局', icon: '🎓',
    headTitle: '人事局长', deputyTitle: '人事副局长', affectIndex: '干部培养',
    desc: '负责干部人事管理，开展年度晋升评审，组织在职培训。',
    functions: ['干部考核', '职级晋升', '人才培养', '绩效评估'],
    autoActionName: '干部日常考勤管理',
    autoEffect: { meritPoints: 3, bossFavor: 1 },
  },
  invest: {
    key: 'invest', name: '招商局', fullName: '招商引资局', icon: '🏢',
    headTitle: '招商局长', deputyTitle: '招商副局长', affectIndex: 'GDP+营商',
    desc: '负责招商引资工作，吸引企业入驻，发展地方经济。',
    functions: ['招商引资', '企业服务', '项目跟踪', '经济合作'],
    autoActionName: '在谈企业跟进',
    autoEffect: { cityGdp: 1, cityBusiness: 2, meritPoints: 2, taxRevenue: 1 },
  },
  tax: {
    key: 'tax', name: '税务局', fullName: '税务局', icon: '🧾',
    headTitle: '税务局长', deputyTitle: '税务副局长', affectIndex: '城市资金',
    desc: '负责税收征管工作，确保税收收入，为城市发展提供资金支撑。',
    functions: ['税收征管', '纳税服务', '税务稽查', '税收政策执行'],
    autoActionName: '日常税收征管',
    autoEffect: { fundBalance: 20, taxRevenue: 2, meritPoints: 2 },
  },
  petition: {
    key: 'petition', name: '信访办', fullName: '信访办公室', icon: '📮',
    headTitle: '信访办主任', deputyTitle: '信访办副主任', affectIndex: '上司满意度',
    desc: '负责接收群众来信来访，化解社会矛盾，维护社会稳定，是政府与群众沟通的重要桥梁。',
    functions: ['信访接待', '矛盾调解', '维稳工作', '舆情处理'],
    autoActionName: '日常信访接待化解',
    autoEffect: { meritPoints: 3, bossFavor: 1, cityLivelihood: 1 },
  },
  organization: {
    key: 'organization', name: '组织部', fullName: '中共×××委员会组织部', icon: '🏛️',
    headTitle: '组织部部长', deputyTitle: '组织部副部长', affectIndex: '干部队伍建设',
    desc: '负责干部选拔任用、党员管理与考核培训，是领导班子建设的核心职能部门。',
    functions: ['干部考评', '正职任命', '党员管理', '后备干部培养'],
    autoActionName: '定期干部考核登记',
    autoEffect: { meritPoints: 4, bossFavor: 1 },
  },
};

// ============ 职能部门名称随职级动态切换 ============
// 乡镇→所/站/办, 县市→局, 省→厅, 国→部委
export const DEPT_NAME_BY_RANK: Record<DeptKey, Record<'town'|'county'|'city'|'province'|'national', string>> = {
  police:       { town: '派出所',     county: '公安局',     city: '公安局',     province: '公安厅',       national: '公安部' },
  ndrc:         { town: '发改站',     county: '发展改革局', city: '发展改革局', province: '发展改革委',   national: '国家发展改革委' },
  finance:      { town: '财政所',     county: '财政局',     city: '财政局',     province: '财政厅',       national: '财政部' },
  urban:        { town: '建设站',     county: '住建局',     city: '住建局',     province: '住房建设厅',   national: '住房和城乡建设部' },
  education:    { town: '教育办',     county: '教育局',     city: '教育局',     province: '教育厅',       national: '教育部' },
  health:       { town: '卫生站',     county: '卫健局',     city: '卫健委',     province: '卫健委',       national: '国家卫生健康委' },
  ecology:      { town: '环保站',     county: '生态环保局', city: '生态环境局', province: '生态环境厅',   national: '生态环境部' },
  market:       { town: '市监所',     county: '市场监管局', city: '市场监管局', province: '市场监管局',   national: '市场监管总局' },
  agriculture:  { town: '农业站',     county: '农业农村局', city: '农业农村局', province: '农业农村厅',   national: '农业农村部' },
  personnel:    { town: '人事办',     county: '人社局',     city: '人社局',     province: '人力资源厅',   national: '人力资源和社会保障部' },
  invest:       { town: '招商办',     county: '招商局',     city: '投资促进局', province: '投资促进厅',   national: '商务部' },
  tax:          { town: '税务所',     county: '税务局',     city: '税务局',     province: '税务局',       national: '国家税务总局' },
  petition:     { town: '信访室',     county: '信访局',     city: '信访局',     province: '信访局',       national: '国家信访局' },
  organization: { town: '党务办',     county: '组织部',     city: '组织部',     province: '组织部',       national: '中枢组织部' },
};

/** 根据主角职级返回对应部门显示名称 */
export function getDeptNameByRank(key: DeptKey, rankLevel: number): string {
  const map = DEPT_NAME_BY_RANK[key];
  if (!map) {
    const cfg = DEPT_CONFIG[key];
    return cfg ? cfg.name : '待分配';
  }
  if (rankLevel <= 3) return map.town;
  if (rankLevel <= 6) return map.county;
  if (rankLevel <= 9) return map.city;
  if (rankLevel <= 11) return map.province;
  return map.national;
}

/** 各部门按层级的正职称谓 */
export const DEPT_HEAD_TITLE_BY_RANK: Record<DeptKey, Record<'town'|'county'|'city'|'province'|'national', string>> = {
  police:       { town: '所长',   county: '局长',   city: '局长',     province: '厅长',     national: '部长' },
  ndrc:         { town: '站长',   county: '局长',   city: '委主任',   province: '委主任',   national: '主任' },
  finance:      { town: '所长',   county: '局长',   city: '局长',     province: '厅长',     national: '部长' },
  urban:        { town: '站长',   county: '局长',   city: '局长',     province: '厅长',     national: '部长' },
  education:    { town: '办主任', county: '局长',   city: '局长',     province: '厅长',     national: '部长' },
  health:       { town: '站长',   county: '局长',   city: '委主任',   province: '委主任',   national: '主任' },
  ecology:      { town: '站长',   county: '局长',   city: '局长',     province: '厅长',     national: '部长' },
  market:       { town: '所长',   county: '局长',   city: '局长',     province: '局长',     national: '总局长' },
  agriculture:  { town: '站长',   county: '局长',   city: '局长',     province: '厅长',     national: '部长' },
  personnel:    { town: '办主任', county: '局长',   city: '局长',     province: '厅长',     national: '部长' },
  invest:       { town: '办主任', county: '局长',   city: '促进局长', province: '促进厅长', national: '部长' },
  tax:          { town: '所长',   county: '局长',   city: '局长',     province: '局长',     national: '总局长' },
  petition:     { town: '室主任', county: '局长',   city: '局长',     province: '局长',     national: '局长' },
  organization: { town: '书记',   county: '部长',   city: '部长',     province: '部长',     national: '部长' },
};

/** 各部门按层级的副职称谓 */
export const DEPT_DEPUTY_TITLE_BY_RANK: Record<DeptKey, Record<'town'|'county'|'city'|'province'|'national', string>> = {
  police:       { town: '副所长',   county: '副局长',   city: '副局长',     province: '副厅长',     national: '副部长' },
  ndrc:         { town: '副站长',   county: '副局长',   city: '委副主任',   province: '委副主任',   national: '副主任' },
  finance:      { town: '副所长',   county: '副局长',   city: '副局长',     province: '副厅长',     national: '副部长' },
  urban:        { town: '副站长',   county: '副局长',   city: '副局长',     province: '副厅长',     national: '副部长' },
  education:    { town: '副主任',   county: '副局长',   city: '副局长',     province: '副厅长',     national: '副部长' },
  health:       { town: '副站长',   county: '副局长',   city: '委副主任',   province: '委副主任',   national: '副主任' },
  ecology:      { town: '副站长',   county: '副局长',   city: '副局长',     province: '副厅长',     national: '副部长' },
  market:       { town: '副所长',   county: '副局长',   city: '副局长',     province: '副局长',     national: '副总局长' },
  agriculture:  { town: '副站长',   county: '副局长',   city: '副局长',     province: '副厅长',     national: '副部长' },
  personnel:    { town: '副主任',   county: '副局长',   city: '副局长',     province: '副厅长',     national: '副部长' },
  invest:       { town: '副主任',   county: '副局长',   city: '副促进局长', province: '副促进厅长', national: '副部长' },
  tax:          { town: '副所长',   county: '副局长',   city: '副局长',     province: '副局长',     national: '副总局长' },
  petition:     { town: '副主任',   county: '副局长',   city: '副局长',     province: '副局长',     national: '副局长' },
  organization: { town: '副书记',   county: '副部长',   city: '副部长',     province: '副部长',     national: '副部长' },
};

/** 根据部门key和职级返回正职动态称谓（带机构名前缀）*/
export function getDeptHeadTitle(key: DeptKey, rankLevel: number): string {
  const deptName = getDeptNameByRank(key, rankLevel);
  const titleMap = DEPT_HEAD_TITLE_BY_RANK[key];
  let title: string;
  if (rankLevel <= 3) title = titleMap.town;
  else if (rankLevel <= 6) title = titleMap.county;
  else if (rankLevel <= 9) title = titleMap.city;
  else if (rankLevel <= 11) title = titleMap.province;
  else title = titleMap.national;
  return `${deptName}${title}`;
}

/** 根据部门key和职级返回副职动态称谓（带机构名前缀）*/
export function getDeptDeputyTitle(key: DeptKey, rankLevel: number): string {
  const deptName = getDeptNameByRank(key, rankLevel);
  const titleMap = DEPT_DEPUTY_TITLE_BY_RANK[key];
  let title: string;
  if (rankLevel <= 3) title = titleMap.town;
  else if (rankLevel <= 6) title = titleMap.county;
  else if (rankLevel <= 9) title = titleMap.city;
  else if (rankLevel <= 11) title = titleMap.province;
  else title = titleMap.national;
  return `${deptName}${title}`;
}

/** 根据主角职级返回职能部门编制人数（总额） */
export function getDeptStaffQuota(rankLevel: number): number {
  if (rankLevel <= 3) return 10;
  if (rankLevel <= 6) return 40;
  if (rankLevel <= 9) return 100;
  if (rankLevel <= 11) return 300;
  return 560;
}

/**
 * 根据玩家职级返回单部门人员范围（写实配置）
 *   乡镇：2-4（只有负责人+1-2工作人员）
 *   县级：6-15（局长+副局长+3-10科员）
 *   地市：15-50（局长+多副局长+若干科室）
 *   省级：50-200（厅级部门，各处室+人员）
 *   国家级：200-500（部级，含多个司局）
 */
export function getDeptStaffRange(rankLevel: number): { min: number; max: number } {
  if (rankLevel <= 3) return { min: 2, max: 4 };
  if (rankLevel <= 6) return { min: 6, max: 15 };
  if (rankLevel <= 9) return { min: 15, max: 50 };
  if (rankLevel <= 11) return { min: 50, max: 200 };
  return { min: 200, max: 500 };
}

/**
 * 根据部门、玩家职级和岗位，返回应有的现实职级(sub_level)
 * 参考现实逻辑：
 *   - 所有层级部门正职基准 = rankLevel - 1（乡镇最低保证副科级=2）
 *   - 公安/纪检等"强力部门"额外高配 +1（如县公安局长普遍高配副处）
 *   - 副职 = rankLevel - 2（乡镇最低保证科员级=1）
 * 例：乡镇(rank3) 派出所所长=2(副科)，副所长=1(科员)
 *     县级(rank5)  公安局长=4(副处)，副局长=3(正科)
 *     市级(rank7)  公安局长=6(副厅)，副局长=5(正处)
 */
// 高配部门：公安/纪检/组织/税务，头部高配比普通部门高一级
const HIGH_CONFIG_DEPTS: DeptKey[] = ['police', 'organization', 'tax'];
export function getDeptPositionSubLevel(
  deptKey: DeptKey, rankLevel: number, position: 'head' | 'deputy'
): number {
  const isHighConfig = HIGH_CONFIG_DEPTS.includes(deptKey) && rankLevel >= 5;
  if (position === 'head') {
    // 高配：rankLevel（即高出副职一级）；普通：rankLevel - 1
    const base = isHighConfig ? rankLevel : Math.max(2, rankLevel - 1);
    return Math.min(12, Math.max(2, base));
  }
  // 副职：比正职低一级
  return Math.min(12, Math.max(1, rankLevel - 2));
}

/**
 * 兼职配置：哪个领导班子职位兼任哪个职能部门的正职
 * 现实依据：
 *   乡镇：政法委员兼任派出所长；副镇长一分管综合，副镇长二分管财政，副镇长三分管农业等
 *   县级：政法委书记兼公安局长；组织部长分管人事局；纪委书记分管纪检系统
 *   市级：副市长兼公安局局长（高配）；分管副市长对口各系统
 */
export const LEADERSHIP_CONCURRENT: Record<string, { deptKey: DeptKey; label: string }> = {
  // 乡镇
  town_law:          { deptKey: 'police',      label: '兼任派出所所长' },
  town_deputy_gov1:  { deptKey: 'police',      label: '分管综治安全·兼任派出所所长' },
  town_deputy_gov2:  { deptKey: 'finance',     label: '分管财政经济·兼任财政所所长' },
  town_deputy_gov3:  { deptKey: 'agriculture', label: '分管农业农村·兼任农业站站长' },
  town_org:          { deptKey: 'personnel',   label: '分管组织人事·协管人事办' },
  // 县级
  cty_law:           { deptKey: 'police',      label: '兼任公安局局长' },
  cty_org:           { deptKey: 'personnel',   label: '分管组织·协管人社局' },
  cty_exec_standing: { deptKey: 'finance',     label: '分管财政·协管财政局' },
  cty_deputy_gov1:   { deptKey: 'police',      label: '分管政法·兼管公安局' },
  cty_deputy_gov2:   { deptKey: 'finance',     label: '分管财政经济·兼管财政局' },
  cty_deputy_gov3:   { deptKey: 'education',   label: '分管教育卫生·兼管教育局' },
  // 市级
  city_deputy_gov1:  { deptKey: 'police',      label: '分管政法·兼任公安局局长' },
  city_deputy_gov2:  { deptKey: 'finance',     label: '分管财政经济·协管财政局' },
  city_deputy_gov3:  { deptKey: 'education',   label: '分管教育文化·协管教育局' },
  city_dep_gov1:     { deptKey: 'police',      label: '分管政法·兼任公安局局长' },
  city_dep_gov2:     { deptKey: 'finance',     label: '分管财政经济·协管财政局' },
  city_dep_gov3:     { deptKey: 'education',   label: '分管教育文化·协管教育局' },
  city_dep_gov4:     { deptKey: 'ecology',     label: '分管生态环保·协管生态环保局' },
};

// ============ 玩家存档 ============
export interface PlayerSave {
  id: string;
  userId: string;
  playerName: string;
  playerGender: string;
  playerAge: number;
  playerBirthDay: number;
  avatarId: number;
  school: string;
  needsCharacterCreation: boolean;

  // ── 政治生态事件状态（v3）──
  prestigeStage: number;
  cliqueExposed: boolean;
  obstructionMonths: number;
  patronExtendedCount: number;
  rivalAmbushCount: number;

  // ── 破格晋升新机制（v3）──
  meritLocked: number;
  breakTagCount: number;

  // ── 派系耦合（v3）──
  factionRank: number;
  factionSwitches: number;
  turncoatTag: boolean;

  // ── 晋升仪式（v3）──
  lastPromotionCeremonyDay: number;
  promotionSnapshot: Record<string, unknown>;

  // ── 版本标记（v3）──
  promotionSystemVersion: number;

  // ── 政治声望系统 v1.0 ──
  reputation: {
    merit: number;
    network: number;
    integrity: number;
    publicity: number;
    faction: number;
  };

  // ── 上司关系网系统 v1.0 ──
  bossProfiles: Array<{
    id: string;
    name: string;
    title: string;
    stance: string;
    aspiration: string;
    favor: number;
    loyalty: number;
    power: number;
    personalDilemma: string | null;
    dilemmaResolved: boolean;
    lastActiveDay: number;
  }>;

  // ── 政敌系统 v1.0 ──
  rivals: Array<{
    id: string;
    name: string;
    faction: string;
    isSameFactionRival: boolean;
    meritScore: number;
    power: number;
    favor: number;
    hasLeverage: boolean;
    leverageDetail: string | null;
    status: string;
    lastActionDay: number;
    grudgeOrigin: string;
    motto: string;
    investigation: { startedDay: number; endsDay: number; success: boolean | null } | null;
    revengeOfId: string | null;
    examReport: string;
  }>;

  // ── 晋升时机系统 v1.0 ──
  momentumActive: boolean;      // 是否已造势（窗口内成功率+10%）
  waitingState: {
    startedDay: number;
    accumulatedDays: number;
    bonus: number;
  } | null;
  lastWindowWaivedDay: number;  // 上次主动放弃窗口的天数
  firePromotionDebuffDays: number; // 火线提拔"根基不稳"剩余冻结天数

  // 个人档案
  birthYear: number;
  birthProvince: string;
  birthCity: string;
  universityName: string;
  rankLevel: number;
  rankName: string;
  meritPoints: number;
  moralValue: number;
  assessmentGrade: AssessmentGrade;
  tenureYears: number;
  tenureDays: number;
  maxTenureYears: number;
  gameDays: number;
  cityName: string;
  cityGdp: number;
  cityLivelihood: number;
  cityEcology: number;
  cityBusiness: number;
  policeForce: number;
  securityIndex: number;
  policeChiefName: string | null;
  reformFaction: number;
  pragmaticFaction: number;
  // 三大额外派系关系值（0-100）
  cylRelation: number;
  technoRelation: number;
  localRelation: number;
  // 玩家主派系 key（'reform' | 'pragmatic' | 'cyl' | 'techno' | 'local' | ''）
  primaryFaction: string;
  // ── 派系系统 v2 新增字段（§6 数据模型，DB 已迁移）──────────────
  /** 整体政治分量 0-100（§2.3） */
  factionInfluence: number;
  /** 中央政治风向（§2.3 / §3.3） */
  politicalWind: PoliticalWind;
  /** 当前风口主流派（§2.3），派系斗争争夺目标 */
  dominantFaction: FactionId | null;
  /** 上次风口切换日，用于每 1825 天触发斗争 */
  lastWindCycleDay: number;
  /** 派系情报资源 0-100（§2.3 / §3.7） */
  factionIntelligence: number;
  /** 持久化冷却表（key 前缀 fac_/pol_，§D1 修复） */
  factionCooldowns: Record<string, number>;
  /** 当前临时联盟列表（§3.9） */
  coalitions: FactionCoalition[];
  /** 被清洗次数，结局判定用（§3.10 / §4.8） */
  purgeCount: number;
  /** 加入当前派系的游戏日（§2.5②） */
  factionJoinedDay: number;
  /** 是否被本派发现暗中接触他派（§2.5③） */
  isFlagged: boolean;
  /** 暗中接触他派累计次数（驱动暴露率递增，§2.5③） */
  contactAttempts: number;
  /** 是否已进入无派系晋升锁死状态（§2.5④） */
  factionlessLocked: boolean;
  /** 派系斗争交战期晋升冻结（§3.22 / §4.2⑧） */
  factionPromotionLocked: boolean;
  /** 当前斗争阶段（§3.22） */
  strugglePhase: StrugglePhase;
  /** 历次派系斗争记录（§3.24） */
  struggleHistory: FactionStruggle[];
  /** 政策响应派系回写日志（§4.1） */
  factionEchoLog: FactionEcho[];
  /** 省级势力控制度地图（§3.25） */
  regionControl: Record<string, Record<FactionId, number>>;
  /** 各派经费池（§3.26） */
  factionTreasury: Record<FactionId, number>;
  /** 嫡系培养档（§3.27） */
  cultivateTier: Record<string, '门生' | '骨干' | '心腹'>;
  /** 嫡系档位绑定的下属 ID（§3.27，slot → subId） */
  cultivateBinding: Record<string, string>;
  /** 战前部署计数（§3.17–§3.21，结算后清零） */
  strugglePrep: StrugglePrep;
  bossName: string;
  bossFavor: number;
  requiredMerit: number;
  requiredTenureYears: number;
  isPromotionAvailable: boolean;
  isEventPending: boolean;
  familyHappiness: number;
  marriageStatus: MarriageStatus;
  eventsThisYear: number;
  lastRankDay: number;
  annualRankPct: number;
  isExcellentRank: boolean;
  // 民生扩展字段
  cityPopulation: number;
  residentIncome: number;
  eduLevel: number;
  healthcareRate: number;
  housingRate: number;
  // 资金余额
  fundBalance: number;
  // ── R3/R4 资源：个人资金、人脉 ──
  silver: number;        // 个人资金（门客招募、赏赐、招商收益）
  connections: number;   // 人脉（幕僚/门客招募）
  // 三上司字段
  boss2Name: string;
  boss2Favor: number;
  boss3Name: string;
  boss3Favor: number;
  // 年度招募追踪
  lastRecruitYear: number;
  // 季度招募追踪（gameDays / 91 的商值）
  lastRecruitQuarter: number;
  // 城市税收
  cityTaxRate: number;
  cityTaxIncome: number;
  taxRevenue: number;  // 税收指数（招商引资累积提升）
  // 月度报告追踪
  lastMonthDay: number;
  // 年度KPI
  kpiGdpTarget: number;
  kpiLivelihoodTarget: number;
  kpiEcologyTarget: number;
  kpiBusinessTarget: number;
  kpiYear: number;
  // 下属拜访
  subVisitPending: boolean;
  subVisitSubId: string | null;
  subVisitSubName: string | null;
  // 人事局年底评审追踪
  lastPersonnelYear: number;
  // 部门月度汇报追踪
  deptReportDay: number;
  // 干部交流任职追踪（每180天触发）
  lastExchangeDay: number;
  // 部委轮换追踪（级别12时每365天触发）
  lastMinistryRotateDay: number;
  // 配偶关系值与结婚纪念日
  spouseRelationValue: number;
  marriageDay: number;
  // 玩家当前职务名称（晋升时同步更新）
  playerPosition: string;
  // 职务兼职（记录担任的兼职key列表）
  concurrentPosts: string[];
  // 投票支持率（晋升总理用）
  voteSupport: number;
  lastVoteDay: number;
  // 党代会选举支持率（晋升总执书记用）
  partyCongressVote: number;
  lastPartyCongressDay: number;
  /** 正国家级（rank 14-15）已连续执政届数（0=未届满一届） */
  nationalTermsServed: number;
  // 仕途路线：'party'=党务, 'government'=行政, ''=未选择/共同段
  careerPath: string;
  // 全国GDP总量（亿元，rank12+显示）
  nationalGdp: number;
  // 科技委研发数据
  sciTechInvestTotal: number;
  sciTechResearchDir: string;
  sciTechProgress: number;
  sciTechLastActDay: number;
  // 纪检委案件追踪
  disciplineLastActDay: number;
  // KPI述职排名（总理办公室用）
  kpiRankingYear: number;
  kpiRankingResult: string;
  // 年度提报晋升追踪
  lastAnnualPromoteYear: number;
  // 个人财富系统
  personalSavings: number;         // 个人存款（元）
  personalAssets: string[];        // 已购置资产key列表
  lastSalaryDay: number;           // 上次发薪game_days，避免重复发
  providentFundBalance: number;    // 住房公积金账户累计余额（元，个人+单位双倍缴存）
  lastAnnualBonusDay: number;      // 上次发年终奖的game_days
  // 退休系统
  retirementDelayYears: number;   // 已批准延迟退休年数（0~5）
  isRetired: boolean;             // 是否已退休
  // 上司生命周期
  bossTenureStart: number;        // 上司1任期开始游戏天
  bossTenureDuration: number;     // 上司1任期总天数
  boss2TenureStart: number;
  boss2TenureDuration: number;
  boss3TenureStart: number;
  boss3TenureDuration: number;
  // 纪委风险追踪
  lastDisciplineWarnDay: number;  // 上次纪委约谈游戏天
  lastCaseCheckDay: number;       // 上次立案审查检测游戏天
  // 重大事故风险
  consecutiveFailEvents: number;  // 连续"不作为"突发事件次数
  // 连续优秀/特等加速晋升计数（每年考核后更新，非优秀时清零）
  consecutiveExcellentYears: number;
  // ===== 贪腐玩法系统（权钱交易/纪检风云/接受审查/涉案资产）=====
  riskValue: number;       // 贪腐风险值 0-100
  clueLevel: number;       // 线索完整度 0-100
  counterIntel: number;    // 反侦察力 0-100
  illegalWealth: number;   // 涉案金额（元）
  testimonyChain: number;  // 供述链完整度 0-100
  caseHistory: number;     // 案发次数
  custodyDays: number;     // 留置剩余天数
  illicitLog: IllicitLogEntry[];       // 涉案流水记录
  transferLog: TransferLogEntry[];     // 资产转移记录
  assetHiding: AssetHidingEntry[];     // 藏匿方式组合
  investState: InvestState;            // 调查当前阶段
  lastInterrogationDay: number;        // 上次讯问轮次游戏天
  caseStartDay: number;                // 立案起始游戏天
  // Game Over结局类型
  gameOverType: 'corruption' | 'accident' | 'purge' | 'fugitive' | 'dismissed' | null;
  createdAt: string;
  updatedAt: string;
  // 民心修行系统
  popularSupport: number;                        // 民心值 0-100，初始50
  popularLog: PopularLogEntry[];                 // 民心记录
  popularActionCooldowns: Record<string, number>; // 动作冷却截止游戏天数
  deptPolicyCooldowns: Record<string, number>;    // 部门施政行动冷却，key=deptKey_actionId，value=截止游戏天数
  // ===== 晋升系统 v2（参考晋升机制设计文档）=====
  promotion_frozen: boolean;          // 晋升冻结标记
  break_rule_used: number;            // 已使用破格次数
  break_rule_observe_days: number;    // 破格观察期剩余天数
  promotion_window_locked: boolean;   // 超龄窗口关闭标记
  watched_post: string | null;        // 关注的岗位标识
  pending_promotion: boolean;         // 晋升申请排队状态
  competition_id: string | null;      // 当前参与的竞争场次标识
  lost_priority: boolean;             // 落选后的「下次优先」资格
  appointment_doc_no: string | null;  // 最近一次任职通知文号
  last_promotion_day: number;         // 上次晋升游戏天
  prestige_flag: boolean;             // 功高盖主标记
  clique_flag: boolean;               // 非正式关系密切标记
  base_tenure_years: number;          // 基层累计任职年数
  leader_obstruct: boolean;           // 领导阻挠标记
  patron_id: string | null;           // 越级赏识领导标识
  patron_favor: number;               // 赏识领导认可度
  patron_expire_day: number;          // 赏识关系到期游戏天
  bribe_log: BribeLogEntry[];         // 协调记录
  bribe_count: number;                // 累计协调次数
  last_bribe_day: number;             // 上次协调游戏天
  patronage: boolean;                 // 庇护状态标记
  illicit_funds: number;              // 赃款账户余额（元）
  illicit_source_log: IllicitSourceEntry[]; // 赃款流水（来源/金额/日期）
  laundering_log: LaunderingEntry[];  // 洗白记录（方式/金额/周期/状态）
  funds_hiding: string | null;        // 赃款藏匿方式
  promo_log: PromoLogEntry[];         // 晋升与破格记录（含文号、流程节点）
  next_priority_bonus: number;        // 下次优先加分
  observation_days: number;           // 观察期剩余天数
  rooting_days: number;               // 扎根期剩余天数
  promo_freeze_until_day: number;     // 晋升冻结到期游戏天（0=无冻结）
  patron_fail_months: number;         // 越级赏识连续未触发月数（概率增长用）
  // ===== 派系晋升联动新增字段（双轨胜利 / 位置棋盘 / 委托 / 密谋）=====
  /** 棋盘席位快照（buildBoard 每周期刷新后持久化） */
  boardSeats: PositionSeat[];
  /** 当前进行中的晋升争夺（null = 无进行中争夺） */
  promotionContest: PromotionContest | null;
  /** 历次争夺记录 */
  contestHistory: ContestRecord[];
  /** 当前派系委托列表（最多 2 条） */
  factionMandates: FactionMandate[];
  /** 密谋行动被暴露累计次数 */
  covertExposedCount: number;
  /** 叛逃冷却截止游戏天（0=无冷却） */
  defectCooldownUntilDay: number;
  /** 失势截止游戏天（factionSetbackUntilDay > gameDays 时处于失势期）*/
  factionSetbackUntilDay: number;
  /** 委托拒绝冷却截止游戏天 */
  mandateRejectCooldownUntilDay: number;
  /** 最近一次委托刷新游戏年（每 365 天刷新一次） */
  lastMandateYear: number;
  // ===== v4 派系玩法：省级席位 + 个人职位战 =====
  /** 各省席位控制派系（province → factionId） */
  provinceSeatControl: Record<string, FactionId | null>;
  /** v5：各省本派攻夺进度（省名 → 0~100） */
  provinceAttackProgress?: Record<string, number>;
  lastPromotionCycleId?: number;
  /** v5：个人争夺战模式 */
  contestMode?: 'direct' | 'coalition';
  /** 个人职位战冷却截止游戏天（0 = 无冷却） */
  personalContestCooldownUntil: number;
  /** 个人职位战历史记录（战力分解详情） */
  personalContestHistory: ContestDetail[];

  // ══ v6 扩展玩法：周期分红 / 声望经济 / 暗线举报 ════════════════
  /** 当前斗争周期内赢下职位争夺的次数（周期结算时用于功绩分红，结算后清零） */
  cycleContestWins?: number;
  /** 当前斗争周期内累计贡献分（赢争夺/派系胜累加，周期结算时用于分红） */
  cycleContribution?: number;
  /** 声望经济：一次豁免失势的可用次数（影响力兑换获得，使用时消耗） */
  setbackImmunity?: number;
  // ══ P1 晋升玩法修复新增字段 ═══════════════════════════════════════
  /** 累计派系贡献（赢下个人争夺/派系活动累加，晋升门槛用） */
  factionContribution: number;
  /** 各职位已占用编制数（positionKey → 占用数，用于编制空缺判定） */
  positionOccupancy: Record<string, number>;
  /** 上次破格晋升所用斗争周期 id（全局每周期仅 1 个破格名额） */
  breakPromotionCycleId: number;
  // ══ P2–P7 晋升玩法扩展字段 ═══════════════════════════════════════
  /** 当前派系内职位 key（长老/军师/执事，独立于个人官职职级） */
  factionPosition: string | null;
  /** 各派系职位已占用编制数（positionKey → 占用数） */
  factionPositionOccupancy: Record<string, number>;
  /** 上次常态对抗结算日（每 120 天一次） */
  lastConfrontationDay: number;
  /** 上次任期考核日（每 365 天一次） */
  lastTenureAssessDay: number;
  /** 降职冷却截止日（降职后不可晋升） */
  demotionCooldownUntil: number;
  /** 上次调任/平调日（调任冷却） */
  lastTransferDay: number;

  // ── 权力交接仪式系统 v1.0 ──
  /** 当前晋升仪式状态（null = 无进行中仪式） */
  ceremonyState: {
    phase: 'talk' | 'publicity' | 'announce' | 'handover' | 'speech' | 'complete';
    startedDay: number;
    targetRank: number;
    talkDone: boolean;
    publicityDone: boolean;
    publicityReported: boolean;
    announceDone: boolean;
    handoverDone: boolean;
    predecessorAttitude: 'friendly' | 'neutral' | 'hostile';
    subordinateStances: Record<string, 'loyal' | 'waitsee' | 'leave'>;
    speechDone: boolean;
    speechType?: 'pragmatic' | 'reform' | 'steady';
    isBigPromotion: boolean;
    tierFrom: number;
    tierTo: number;
  } | null;

  // ── 破格晋升系统 v2.0 ──
  /** 破格晋升全流程状态 */
  breakPromotionFlow: {
    nomination: {
      qualified: boolean;
      source: 'emergency' | 'national_award' | 'faction_boss' | 'patron_push' | null;
      qualifiedDay: number;
      expiryDay: number;
      applied: boolean;
      applicationStyle: 'merit' | 'network' | 'faction' | null;
    };
    review: {
      reviewers: Array<{
        id: string;
        name: string;
        faction: string;
        preference: 'merit' | 'network' | 'faction' | 'age';
        favor: number;
        bribed: boolean;
      }>;
      startedDay: number;
      endsDay: number;
      playerCommunicated: string[];
      internalConflict: boolean;
      conflictResolved: boolean;
    } | null;
    publicity: {
      startedDay: number;
      endsDay: number;
      reports: Array<{ from: string; reason: string; day: number }>;
      playerChoice: 'lawyer' | 'media' | 'connections' | null;
    } | null;
    vote: {
      votes: Array<{ reviewerId: string; approve: boolean }>;
      passed: boolean;
    } | null;
    status: 'idle' | 'nominated' | 'reviewing' | 'publicity' | 'voting' | 'passed' | 'rejected';
  } | null;
  /** 破格提拔成功标签（有效期2个职级） */
  breakPromotionTag: {
    meritBonus: number;
    popularDecay: number;
    bossFavorBonus: number;
    riskMultiplier: number;
    remainingRanks: number;
  } | null;
  /** 揠苗助长失败标签 */
  breakFailureTag: {
    meritLossPercent: number;
    penaltyDays: number;
  } | null;

  // ── 失败后软着陆系统 v1.0 ──
  /** 软着陆状态 */
  softLandingState: {
    failureType: 'insufficient' | 'competitive' | 'political' | 'timing';
    failureDay: number;
    settlingEndDay: number;
    settlingBonusActive: boolean;
    reviewDone: boolean;
    reviewRewardClaimed: boolean;
    weaknessKey: string;
    implicitCapital: number;
    selfChoice: 'strive' | 'laylow' | null;
    choiceEffectiveDay: number;
  } | null;

  // ── 晋升后权力感知系统 v1.0 ──
  /** 权力感知状态（职级解锁能力、专属事件、称谓变化） */
  powerPerceptionState: {
    currentTier: 1 | 2 | 3 | 4 | 5;
    officeLevel: 'basic' | 'standard' | 'spacious' | 'luxury' | 'command';
    unlockedFeatures: import('@/lib/promotionPowerPerception').UnlockedFeature[];
    tierEventsTriggered: Record<number, string[]>;
    titleStyle: 'casual' | 'formal' | 'news';
    lastTitleChangeDay: number;
  } | null;
}

// 贪腐玩法：调查阶段
export type InvestState = 'none' | 'fuhan' | 'chushi' | 'liangan' | 'liuzhi';

// 贪腐玩法：涉案流水记录
export interface IllicitLogEntry {
  id: string;
  channel: string;      // 渠道名称
  amount: number;        // 金额（元）
  day: number;           // 游戏天
  success: boolean;      // 是否成功
}

// 贪腐玩法：资产转移记录
export interface TransferLogEntry {
  id: string;
  method: string;        // 转移方式
  amount: number;        // 金额（元）
  day: number;
}

// 贪腐玩法：藏匿方式组合
export interface AssetHidingEntry {
  methodKey: string;     // 藏匿方式key
  amount: number;        // 藏匿金额（元）
}

// ===== 统一玩法配置表（JSON，非硬编码）=====
export type GameplayCategory =
  | 'bribery_channel'    // 受贿渠道
  | 'power_rent'         // 权力寻租
  | 'embezzlement'       // 贪污挪用
  | 'asset_hiding'       // 涉案账户藏匿
  | 'asset_transfer'     // 资产转移销赃
  | 'clue_source'        // 举报线索来源
  | 'investigation_stage' // 接受审查阶段
  | 'popularity';         // 民心修行

export interface GameplayConfig {
  category: GameplayCategory;
  id: string;
  name: string;
  icon: string;
  unlockRank: number;    // 解锁职级（0=触发式/随父级解锁）
  params: GameplayParams;
  sort: number;
  enabled: boolean;
}

export interface GameplayParams {
  gainMin?: number;      // 收益下限（元）
  gainMax?: number;      // 收益上限（元）
  risk?: number;         // 风险增幅
  moral?: number;        // 民心损耗
  successRate?: number;  // 成功率（0-1）
  cooldown?: number;     // 冷却天数
  clueGain?: number;     // 线索完整度增加
  counterIntel?: number; // 反侦察力变化
  desc?: string;         // 文案描述
  // 藏匿/转移专用
  safety?: number;       // 资金安全性
  recoveryRate?: number; // 追缴率（0-1）
  // 线索来源专用
  clueValue?: number;    // 线索贡献值
  suppressCost?: string; // 压盖代价描述
  // 审查阶段专用
  stageThreshold?: number; // 阶段风险阈值
  // 民心修行专用
  popularGain?: number;         // 民心增加量
  livelihoodGain?: number;      // 民生指标增加量
  opinionReduction?: number;    // 舆情/诉求压力减少量（正数=减少）
  meritGain?: number;           // 功绩增加量
  riskReduction?: number;       // 廉政风险减少量
  teamIntegrityGain?: number;   // 团队廉洁增加量（更新班子成员integrity）
}

// 民心记录条目
export interface PopularLogEntry {
  gameDay: number;
  actionId: string;
  actionName: string;
  popularChange: number;
  sideEffects?: string[];  // 附加效果描述，如 ['民生+5','功绩+15']
}

// ===== 晋升系统 v2 数据结构 =====
export interface BribeLogEntry {
  gameDay: number;
  target: string;        // 协调对象
  tier: string;          // small/medium/large/huge
  amount: number;        // 金额（元）
  source: 'legal' | 'illicit'; // 资金来源
}
export interface IllicitSourceEntry {
  gameDay: number;
  channel: string;      // 来源渠道
  amount: number;        // 金额（元）
}
export interface LaunderingEntry {
  gameDay: number;
  methodId: string;      // 洗白方式 id
  methodName: string;
  amount: number;        // 原始赃款（元）
  fee: number;           // 手续费率
  netAmount: number;     // 到账合法金额（元）
  days: number;          // 周期天数
  endDay: number;        // 结束游戏天
  status: 'processing' | 'done'; // 状态
}
export interface PromoLogEntry {
  gameDay: number;
  docNo: string;         // 文号
  type: 'promote' | 'break' | 'lost'; // 晋升/破格/落选
  fromRank: number;
  toRank: number;
  postName: string;
  note?: string;
}
export interface NpcPost {
  post_key: string;
  save_id: string;
  tier: number;
  post_name: string;
  occupant_name: string | null;
  occupant_age: number | null;
  tenure_end_day: number | null;
  integrity: number | null;
  status: 'occupied' | 'vacant' | 'publicizing' | 'rotating';
  vacancy_start_day: number | null;
  created_at: string;
}
export interface NpcCandidate {
  candidate_key: string;
  save_id: string;
  tier: number;
  name: string;
  merit_score: number;
  popularity_score: number;
  assess_score: number;
  favor_score: number;
  age: number;
  tenure_years: number;
  integrity: number;
  in_competition: boolean;
  status: 'standby' | 'competing' | 'out' | 'appointed';
  created_at: string;
}

// 玩法动作执行结果（Edge Function 返回）
export interface GameplayActionResult {
  success: boolean;
  message: string;
  roll?: number;         // 掷骰结果（0-100）
  gain?: number;         // 实际收益
  changes?: Partial<PlayerSave>; // 数值变化
  gameOver?: 'corruption' | 'fugitive' | 'dismissed' | null;
}

// ============ 月度报告 ============
// ============ 信访事件 ============
export interface PetitionEvent {
  id: string;
  saveId: string;
  userId: string;
  eventType: 'complaint' | 'praise';
  title: string;
  content: string;
  gameDay: number;
  monthKey: number;
  bosFavorDelta: number;
  meritDelta: number;
  isProcessed: boolean;
  createdAt: string;
}

export interface MonthlyReport {
  id: string;
  saveId: string;
  monthKey: number;
  yearKey: number;
  deptKey: string;
  title: string;
  content: string;
  gdpChange: number;
  livelihoodChange: number;
  ecologyChange: number;
  businessChange: number;
  meritReward: number;
  isRead: boolean;
  createdAt: string;
}

// ============ 领导班子 ============
export interface LeadershipMember {
  id: string;
  saveId: string;
  subId: string | null;
  roleKey: string;
  roleLabel: string;
  subName: string;
  subAvatar: number;
  subGender: string;
  assignedDay: number;
}

// 各级别的领导班子角色（按现实党政体制配置）
export const LEADERSHIP_ROLES: Record<number, { key: string; label: string; tierLabel: string; organ: string; requiredSubLevel: number; concurrentLabel?: string }[]> = {
  1: [],
  2: [],

  // ── rank 3：乡镇长（党委副书记兼），可任命镇党委常委会其余成员 + 政府班子 ──
  3: [
    // 镇党委常委会（玩家为党委副书记、镇长；下列为其余8席）
    { key: 'town_party_full',    label: '专职党委副书记',  tierLabel: '镇党委常委会', organ: '镇党委',  requiredSubLevel: 3 }, // 正科级
    { key: 'town_disc',          label: '纪委书记',         tierLabel: '镇党委常委会', organ: '镇党委',  requiredSubLevel: 2 }, // 副科级
    { key: 'town_org',           label: '组织委员',         tierLabel: '镇党委常委会', organ: '镇党委',  requiredSubLevel: 2, concurrentLabel: '分管组织人事·协管人事办' },
    { key: 'town_prop',          label: '宣传委员',         tierLabel: '镇党委常委会', organ: '镇党委',  requiredSubLevel: 2 },
    { key: 'town_law',           label: '政法委员',         tierLabel: '镇党委常委会', organ: '镇党委',  requiredSubLevel: 2, concurrentLabel: '兼任派出所所长' },
    { key: 'town_military',      label: '武装部长',         tierLabel: '镇党委常委会', organ: '镇党委',  requiredSubLevel: 2 },
    { key: 'town_npc',           label: '议政院主席',         tierLabel: '镇党委常委会', organ: '镇议政院',  requiredSubLevel: 3 }, // 正科级
    // 镇政府班子（政府办公会）
    { key: 'town_deputy_gov1',   label: '副镇长一',         tierLabel: '镇政府班子',   organ: '镇政府',  requiredSubLevel: 2, concurrentLabel: '分管综治安全·兼任派出所所长' },
    { key: 'town_deputy_gov2',   label: '副镇长二',         tierLabel: '镇政府班子',   organ: '镇政府',  requiredSubLevel: 2, concurrentLabel: '分管财政经济·兼任财政所所长' },
    { key: 'town_deputy_gov3',   label: '副镇长三',         tierLabel: '镇政府班子',   organ: '镇政府',  requiredSubLevel: 2, concurrentLabel: '分管农业农村·兼任农业站站长' },
    { key: 'town_office_dir',    label: '政府办公室主任',   tierLabel: '镇政府班子',   organ: '镇政府',  requiredSubLevel: 2 },
    { key: 'town_league_sec',    label: '镇团委书记',        tierLabel: '镇党委常委会', organ: '镇团委',  requiredSubLevel: 2, concurrentLabel: '团派路线基层起点·兼管青年工作站' },
  ],

  // ── rank 4：县委常委 / 副县长，与 rank 3 共用乡镇一级职位表 ──
  4: [
    { key: 'town_party_full',    label: '专职党委副书记',  tierLabel: '镇党委常委会', organ: '镇党委',  requiredSubLevel: 3 },
    { key: 'town_disc',          label: '纪委书记',         tierLabel: '镇党委常委会', organ: '镇党委',  requiredSubLevel: 2 },
    { key: 'town_org',           label: '组织委员',         tierLabel: '镇党委常委会', organ: '镇党委',  requiredSubLevel: 2, concurrentLabel: '分管组织人事·协管人事办' },
    { key: 'town_prop',          label: '宣传委员',         tierLabel: '镇党委常委会', organ: '镇党委',  requiredSubLevel: 2 },
    { key: 'town_law',           label: '政法委员',         tierLabel: '镇党委常委会', organ: '镇党委',  requiredSubLevel: 2, concurrentLabel: '兼任派出所所长' },
    { key: 'town_military',      label: '武装部长',         tierLabel: '镇党委常委会', organ: '镇党委',  requiredSubLevel: 2 },
    { key: 'town_npc',           label: '议政院主席',         tierLabel: '镇党委常委会', organ: '镇议政院',  requiredSubLevel: 3 },
    { key: 'town_deputy_gov1',   label: '副镇长一',         tierLabel: '镇政府班子',   organ: '镇政府',  requiredSubLevel: 2, concurrentLabel: '分管综治安全·兼任派出所所长' },
    { key: 'town_deputy_gov2',   label: '副镇长二',         tierLabel: '镇政府班子',   organ: '镇政府',  requiredSubLevel: 2, concurrentLabel: '分管财政经济·兼任财政所所长' },
    { key: 'town_deputy_gov3',   label: '副镇长三',         tierLabel: '镇政府班子',   organ: '镇政府',  requiredSubLevel: 2, concurrentLabel: '分管农业农村·兼任农业站站长' },
    { key: 'town_office_dir',    label: '政府办公室主任',   tierLabel: '镇政府班子',   organ: '镇政府',  requiredSubLevel: 2 },
    { key: 'town_league_sec',    label: '镇团委书记',        tierLabel: '镇党委常委会', organ: '镇团委',  requiredSubLevel: 2, concurrentLabel: '团派路线基层起点·兼管青年工作站' },
  ],

  // ── rank 5：县长（政府常务会） ──
  5: [
    { key: 'cty_exec_deputy',    label: '常务副县长',       tierLabel: '县政府常务会', organ: '县政府',  requiredSubLevel: 4 }, // 副处级
    { key: 'cty_deputy_gov1',    label: '副县长一',         tierLabel: '县政府常务会', organ: '县政府',  requiredSubLevel: 4, concurrentLabel: '分管政法·兼管公安局' },
    { key: 'cty_deputy_gov2',    label: '副县长二',         tierLabel: '县政府常务会', organ: '县政府',  requiredSubLevel: 4, concurrentLabel: '分管财政经济·兼管财政局' },
    { key: 'cty_deputy_gov3',    label: '副县长三',         tierLabel: '县政府常务会', organ: '县政府',  requiredSubLevel: 4, concurrentLabel: '分管教育卫生·兼管教育局' },
    { key: 'cty_gov_sec',        label: '县政府办公室主任', tierLabel: '县政府常务会', organ: '县政府',  requiredSubLevel: 3 }, // 正科级
  ],

  // ── rank 6：县委书记（县委常委会，11人，玩家为书记） ──
  6: [
    { key: 'cty_party_deputy_sec', label: '县委副书记、县长',       tierLabel: '县委常委会', organ: '县委',    requiredSubLevel: 5 }, // 正处级
    { key: 'cty_party_full_sec',   label: '专职县委副书记',          tierLabel: '县委常委会', organ: '县委',    requiredSubLevel: 5 },
    { key: 'cty_disc',             label: '县纪委书记',              tierLabel: '县委常委会', organ: '县纪委',  requiredSubLevel: 5 },
    { key: 'cty_org',              label: '县委组织部长',            tierLabel: '县委常委会', organ: '县委',    requiredSubLevel: 4, concurrentLabel: '分管组织·协管人社局' },
    { key: 'cty_prop',             label: '县委宣传部长',            tierLabel: '县委常委会', organ: '县委',    requiredSubLevel: 4 },
    { key: 'cty_law',              label: '县委政法委书记',          tierLabel: '县委常委会', organ: '县委',    requiredSubLevel: 4, concurrentLabel: '兼任公安局局长' },
    { key: 'cty_military',         label: '县人武部部长',            tierLabel: '县委常委会', organ: '县人武部',requiredSubLevel: 4 },
    { key: 'cty_exec_standing',    label: '常务副县长（县委常委）',  tierLabel: '县委常委会', organ: '县委',    requiredSubLevel: 4, concurrentLabel: '分管财政·协管财政局' },
    { key: 'cty_united',           label: '县委统战部长',            tierLabel: '县委常委会', organ: '县委',    requiredSubLevel: 4 },
    { key: 'cty_npc',              label: '议政院主任',                tierLabel: '县委常委会', organ: '县议政院',  requiredSubLevel: 5 },
    { key: 'cty_league_sec',       label: '团县委书记',              tierLabel: '县委常委会', organ: '团委',    requiredSubLevel: 3, concurrentLabel: '团派路线县级关键岗·兼管青年联合会' },
  ],

  // ── rank 7：副市长，同时可管辖部分县委职位 ──
  7: [
    { key: 'city_deputy_gov1',   label: '副市长一',         tierLabel: '市政府班子', organ: '市政府',  requiredSubLevel: 6, concurrentLabel: '分管政法·兼任公安局局长' },
    { key: 'city_deputy_gov2',   label: '副市长二',         tierLabel: '市政府班子', organ: '市政府',  requiredSubLevel: 6, concurrentLabel: '分管财政经济·协管财政局' },
    { key: 'city_deputy_gov3',   label: '副市长三',         tierLabel: '市政府班子', organ: '市政府',  requiredSubLevel: 6, concurrentLabel: '分管教育文化·协管教育局' },
    { key: 'city_gov_office',    label: '市政府办公室主任', tierLabel: '市政府班子', organ: '市政府',  requiredSubLevel: 5 }, // 正处级
  ],

  // ── rank 8：市长（市政府常务会） ──
  8: [
    { key: 'city_exec_deputy',   label: '常务副市长',       tierLabel: '市政府常务会', organ: '市政府',  requiredSubLevel: 6 }, // 副厅级
    { key: 'city_dep_gov1',      label: '副市长一',         tierLabel: '市政府常务会', organ: '市政府',  requiredSubLevel: 6, concurrentLabel: '分管政法·兼任公安局局长' },
    { key: 'city_dep_gov2',      label: '副市长二',         tierLabel: '市政府常务会', organ: '市政府',  requiredSubLevel: 6, concurrentLabel: '分管财政经济·协管财政局' },
    { key: 'city_dep_gov3',      label: '副市长三',         tierLabel: '市政府常务会', organ: '市政府',  requiredSubLevel: 6, concurrentLabel: '分管教育文化·协管教育局' },
    { key: 'city_dep_gov4',      label: '副市长四',         tierLabel: '市政府常务会', organ: '市政府',  requiredSubLevel: 6, concurrentLabel: '分管生态环保·协管生态环保局' },
    { key: 'city_gov_sec',       label: '市政府秘书长',     tierLabel: '市政府常务会', organ: '市政府',  requiredSubLevel: 5 }, // 正处级
  ],

  // ── rank 9：市委书记（市委常委会，13人，玩家为书记） ──
  9: [
    { key: 'city_party_dep_sec',   label: '市委副书记、市长',       tierLabel: '市委常委会', organ: '市委',    requiredSubLevel: 7 }, // 正厅级
    { key: 'city_party_full_sec',  label: '专职市委副书记',          tierLabel: '市委常委会', organ: '市委',    requiredSubLevel: 7 },
    { key: 'city_disc',            label: '市纪委书记',              tierLabel: '市委常委会', organ: '市纪委',  requiredSubLevel: 7 },
    { key: 'city_org',             label: '市委组织部长',            tierLabel: '市委常委会', organ: '市委',    requiredSubLevel: 6 }, // 副厅级
    { key: 'city_prop',            label: '市委宣传部长',            tierLabel: '市委常委会', organ: '市委',    requiredSubLevel: 6 },
    { key: 'city_law',             label: '市委政法委书记',          tierLabel: '市委常委会', organ: '市委',    requiredSubLevel: 6 },
    { key: 'city_exec_standing',   label: '常务副市长（市委常委）',  tierLabel: '市委常委会', organ: '市委',    requiredSubLevel: 6 },
    { key: 'city_united',          label: '市委统战部长',            tierLabel: '市委常委会', organ: '市委',    requiredSubLevel: 6 },
    { key: 'city_military',        label: '市人武部政委',            tierLabel: '市委常委会', organ: '市人武部',requiredSubLevel: 6 },
    { key: 'city_sec_gen',         label: '市委秘书长',              tierLabel: '市委常委会', organ: '市委',    requiredSubLevel: 6 },
    { key: 'city_party_sec2',      label: '市委副书记（专职）',      tierLabel: '市委常委会', organ: '市委',    requiredSubLevel: 7 },
    { key: 'city_npc',             label: '议政院常委会主任',          tierLabel: '市委常委会', organ: '市议政院',  requiredSubLevel: 7 },
    { key: 'city_league_sec',      label: '团市委书记',              tierLabel: '市委常委会', organ: '团委',    requiredSubLevel: 5, concurrentLabel: '团派路线市级关键岗·常委级配置' },
  ],

  // ── rank 10：省长（省政府常务会） ──
  10: [
    { key: 'prov_exec_deputy',   label: '常务副省长',       tierLabel: '省政府常务会', organ: '省政府',  requiredSubLevel: 8 }, // 副部级
    { key: 'prov_dep_gov1',      label: '副省长一',         tierLabel: '省政府常务会', organ: '省政府',  requiredSubLevel: 8 },
    { key: 'prov_dep_gov2',      label: '副省长二',         tierLabel: '省政府常务会', organ: '省政府',  requiredSubLevel: 8 },
    { key: 'prov_dep_gov3',      label: '副省长三',         tierLabel: '省政府常务会', organ: '省政府',  requiredSubLevel: 8 },
    { key: 'prov_dep_gov4',      label: '副省长四',         tierLabel: '省政府常务会', organ: '省政府',  requiredSubLevel: 8 },
    { key: 'prov_dep_gov5',      label: '副省长五',         tierLabel: '省政府常务会', organ: '省政府',  requiredSubLevel: 8 },
    { key: 'prov_gov_sec',       label: '省政府秘书长',     tierLabel: '省政府常务会', organ: '省政府',  requiredSubLevel: 7 }, // 正厅级
  ],

  // ── rank 11：省委书记（省委常委会，13人，玩家为书记） ──
  11: [
    { key: 'prov_party_dep_sec',  label: '省委副书记、省长',       tierLabel: '省委常委会', organ: '省委',    requiredSubLevel: 9 }, // 正部级
    { key: 'prov_party_full_sec', label: '专职省委副书记',          tierLabel: '省委常委会', organ: '省委',    requiredSubLevel: 9 },
    { key: 'prov_disc',           label: '省纪委书记',              tierLabel: '省委常委会', organ: '省纪委',  requiredSubLevel: 8 }, // 副部级
    { key: 'prov_org',            label: '省委组织部长',            tierLabel: '省委常委会', organ: '省委',    requiredSubLevel: 7 }, // 正厅
    { key: 'prov_prop',           label: '省委宣传部长',            tierLabel: '省委常委会', organ: '省委',    requiredSubLevel: 7 },
    { key: 'prov_law',            label: '省委政法委书记',          tierLabel: '省委常委会', organ: '省委',    requiredSubLevel: 7 },
    { key: 'prov_exec_standing',  label: '常务副省长（省委常委）',  tierLabel: '省委常委会', organ: '省委',    requiredSubLevel: 8 },
    { key: 'prov_united',         label: '省委统战部长',            tierLabel: '省委常委会', organ: '省委',    requiredSubLevel: 7 },
    { key: 'prov_sec_gen',        label: '省委秘书长',              tierLabel: '省委常委会', organ: '省委',    requiredSubLevel: 7 },
    { key: 'prov_military',       label: '省军区政委',              tierLabel: '省委常委会', organ: '省军区',  requiredSubLevel: 8 },
    { key: 'prov_party_sec2',     label: '省委副书记',              tierLabel: '省委常委会', organ: '省委',    requiredSubLevel: 8 },
    { key: 'prov_npc',            label: '议政院常委会主任',          tierLabel: '省委常委会', organ: '省议政院',  requiredSubLevel: 9 },
    { key: 'prov_league_sec',     label: '团省委书记',              tierLabel: '省委常委会', organ: '团委',    requiredSubLevel: 7, concurrentLabel: '团派路线省级核心岗·常委级配置' },
  ],

  // ── rank 12：部委副部长 ──
  12: [
    { key: 'min_exec_deputy',    label: '党委副书记（常务副部长）',  tierLabel: '部党委常委会', organ: '部党委',  requiredSubLevel: 8 }, // 副部级
    { key: 'min_vice1',          label: '副部长一（党委委员）',      tierLabel: '部党委常委会', organ: '部党委',  requiredSubLevel: 8 },
    { key: 'min_vice2',          label: '副部长二（党委委员）',      tierLabel: '部党委常委会', organ: '部党委',  requiredSubLevel: 8 },
    { key: 'min_disc',           label: '纪检组长',                  tierLabel: '部党委常委会', organ: '部党委',  requiredSubLevel: 7 }, // 正厅级
    { key: 'min_assist',         label: '部长助理（党委委员）',      tierLabel: '部党委常委会', organ: '部党委',  requiredSubLevel: 8 },
    { key: 'min_org',            label: '机关党委书记（党委委员）',  tierLabel: '部党委常委会', organ: '部党委',  requiredSubLevel: 7 },
    { key: 'min_tech',           label: '总工程师（党委委员）',      tierLabel: '部党委常委会', organ: '部党委',  requiredSubLevel: 7 },
    { key: 'min_policy',         label: '政策研究室主任（党委委员）',tierLabel: '部党委常委会', organ: '部党委',  requiredSubLevel: 7 },
  ],

  // ── rank 13：国政院副院理 ──
  13: [
    { key: 'vice_premier1',   label: '国政院副院理一',  tierLabel: '国政院常务会', organ: '国政院',  requiredSubLevel: 9 }, // 正部级
    { key: 'vice_premier2',   label: '国政院副院理二',  tierLabel: '国政院常务会', organ: '国政院',  requiredSubLevel: 9 },
    { key: 'vice_premier3',   label: '国政院副院理三',  tierLabel: '国政院常务会', organ: '国政院',  requiredSubLevel: 9 },
    { key: 'state_councilor1',label: '国政委员一',       tierLabel: '国政院常务会', organ: '国政院',  requiredSubLevel: 9 },
    { key: 'state_councilor2',label: '国政委员二',       tierLabel: '国政院常务会', organ: '国政院',  requiredSubLevel: 9 },
    { key: 'state_sec_gen',   label: '国政院秘书长',     tierLabel: '国政院常务会', organ: '国政院',  requiredSubLevel: 9 },
  ],

  // ── rank 14：国政院院理任命班子（副院理/国政委员/各部部长/省委书记） ──
  14: [
    { key: 'vp_finance',     label: '主管财经副院理',           tierLabel: '国政院班子', organ: '国政院',        requiredSubLevel: 10 }, // 副国级
    { key: 'vp_agriculture', label: '主管农业副院理',           tierLabel: '国政院班子', organ: '国政院',        requiredSubLevel: 10 },
    { key: 'vp_science',     label: '主管科技副院理',           tierLabel: '国政院班子', organ: '国政院',        requiredSubLevel: 10 },
    { key: 'vp_social',      label: '主管民生副院理',           tierLabel: '国政院班子', organ: '国政院',        requiredSubLevel: 10 },
    { key: 'sc_foreign',     label: '主管外交国政委员',         tierLabel: '国政院班子', organ: '国政院',        requiredSubLevel: 10 },
    { key: 'sc_defense',     label: '主管国防国政委员',         tierLabel: '国政院班子', organ: '国政院',        requiredSubLevel: 10 },
    { key: 'sc_security',    label: '主管安全国政委员',         tierLabel: '国政院班子', organ: '国政院',        requiredSubLevel: 10 },
    { key: 'min_ndr',        label: '国家发改委主任',           tierLabel: '部级正职', organ: '发展改革系统',    requiredSubLevel: 9 },
    { key: 'min_finance',    label: '财政部部长',               tierLabel: '部级正职', organ: '财税金融系统',    requiredSubLevel: 9 },
    { key: 'min_commerce',   label: '商务部部长',               tierLabel: '部级正职', organ: '经贸系统',        requiredSubLevel: 9 },
    { key: 'min_industry',   label: '工业和信息化部部长',       tierLabel: '部级正职', organ: '工业系统',        requiredSubLevel: 9 },
    { key: 'min_edu',        label: '教育部部长',               tierLabel: '部级正职', organ: '社会民生系统',    requiredSubLevel: 9 },
    { key: 'min_sci',        label: '科学技术部部长',           tierLabel: '部级正职', organ: '科技系统',        requiredSubLevel: 9 },
    { key: 'min_agri',       label: '农业农村部部长',           tierLabel: '部级正职', organ: '农业系统',        requiredSubLevel: 9 },
    { key: 'min_civil',      label: '民政部部长',               tierLabel: '部级正职', organ: '社会民生系统',    requiredSubLevel: 9 },
    { key: 'min_justice',    label: '司法部部长',               tierLabel: '部级正职', organ: '政法系统',        requiredSubLevel: 9 },
    { key: 'min_hr',         label: '人力资源和社会保障部部长', tierLabel: '部级正职', organ: '社会民生系统',    requiredSubLevel: 9 },
    { key: 'min_natural',    label: '自然资源部部长',           tierLabel: '部级正职', organ: '资源环境系统',    requiredSubLevel: 9 },
    { key: 'min_eco',        label: '生态环境部部长',           tierLabel: '部级正职', organ: '资源环境系统',    requiredSubLevel: 9 },
    { key: 'min_housing',    label: '住房和城乡建设部部长',     tierLabel: '部级正职', organ: '建设系统',        requiredSubLevel: 9 },
    { key: 'min_transport',  label: '交通运输部部长',           tierLabel: '部级正职', organ: '基础设施系统',    requiredSubLevel: 9 },
    { key: 'min_water',      label: '水利部部长',               tierLabel: '部级正职', organ: '基础设施系统',    requiredSubLevel: 9 },
    { key: 'min_culture',    label: '文化和旅游部部长',         tierLabel: '部级正职', organ: '文化系统',        requiredSubLevel: 9 },
    { key: 'min_health',     label: '国家卫生健康委主任',       tierLabel: '部级正职', organ: '社会民生系统',    requiredSubLevel: 9 },
    { key: 'min_veterans',   label: '退役军人事务部部长',       tierLabel: '部级正职', organ: '社会民生系统',    requiredSubLevel: 9 },
    { key: 'min_emergency',  label: '应急管理部部长',           tierLabel: '部级正职', organ: '社会安全系统',    requiredSubLevel: 9 },
    { key: 'min_medins',     label: '国家医疗保障局局长',       tierLabel: '部级正职', organ: '社会民生系统',    requiredSubLevel: 9 },
    { key: 'min_fin_reg',    label: '国家金融监督管理总局局长', tierLabel: '部级正职', organ: '财税金融系统',    requiredSubLevel: 9 },
    { key: 'min_csrc',       label: '中国证监会主席',           tierLabel: '部级正职', organ: '财税金融系统',    requiredSubLevel: 9 },
    { key: 'min_tax',        label: '国家税务总局局长',         tierLabel: '部级正职', organ: '财税金融系统',    requiredSubLevel: 9 },
    { key: 'min_ethnic',     label: '国家民族事务委员会主任',   tierLabel: '部级正职', organ: '民族宗教系统',    requiredSubLevel: 9 },
    { key: 'min_sports',     label: '国家体育总局局长',         tierLabel: '部级正职', organ: '文化系统',        requiredSubLevel: 9 },
    { key: 'min_broadcast',  label: '国家广播电视总局局长',     tierLabel: '部级正职', organ: '文化系统',        requiredSubLevel: 9 },
    { key: 'min_stats',      label: '国家统计局局长',           tierLabel: '部级正职', organ: '综合行政系统',    requiredSubLevel: 9 },
    { key: 'cyd_league',     label: '共青团中枢书记处第一书记', tierLabel: '部级正职', organ: '群团系统',        requiredSubLevel: 9, concurrentLabel: '团派路线最高岗，届满后通常进省部级岗位' },
    { key: 'pbs_guangdong',  label: '广东省委书记',             tierLabel: '省委书记级', organ: '省委系统',       requiredSubLevel: 9 },
    { key: 'pbs_jiangsu',    label: '江苏省委书记',             tierLabel: '省委书记级', organ: '省委系统',       requiredSubLevel: 9 },
    { key: 'pbs_zhejiang',   label: '浙江省委书记',             tierLabel: '省委书记级', organ: '省委系统',       requiredSubLevel: 9 },
    { key: 'pbs_shandong',   label: '山东省委书记',             tierLabel: '省委书记级', organ: '省委系统',       requiredSubLevel: 9 },
    { key: 'pbs_beijing',    label: '北京市委书记',             tierLabel: '省委书记级', organ: '省委系统',       requiredSubLevel: 9 },
    { key: 'pbs_shanghai',   label: '上海市委书记',             tierLabel: '省委书记级', organ: '省委系统',       requiredSubLevel: 9 },
    { key: 'pbs_sichuan',    label: '四川省委书记',             tierLabel: '省委书记级', organ: '省委系统',       requiredSubLevel: 9 },
    { key: 'pbs_hubei',      label: '湖北省委书记',             tierLabel: '省委书记级', organ: '省委系统',       requiredSubLevel: 9 },
  ],

  // ── rank 15：总执书记（政治局常委、政治局委员、中枢书记处、中纪委、全国议政院/参政院、中枢军委） ──
  15: [
    // 政治局常委会
    { key: 'r15_psc2',     label: '国政院院理（政治局常委）',        tierLabel: '政治局常委会', organ: '中枢决策常委会', requiredSubLevel: 11 }, // 正国级
    { key: 'r15_psc3',     label: '全国议政院议政委员长（政治局常委）',    tierLabel: '政治局常委会', organ: '中枢决策常委会', requiredSubLevel: 11 },
    { key: 'r15_psc4',     label: '全国参政院主席（政治局常委）',      tierLabel: '政治局常委会', organ: '中枢决策常委会', requiredSubLevel: 11 },
    { key: 'r15_psc5',     label: '政治局常委（分管宣传）',          tierLabel: '政治局常委会', organ: '中枢决策常委会', requiredSubLevel: 11 },
    { key: 'r15_psc6',     label: '政治局常委（分管政法）',          tierLabel: '政治局常委会', organ: '中枢决策常委会', requiredSubLevel: 11 },
    { key: 'r15_psc7',     label: '中枢纪委书记（政治局常委）',        tierLabel: '政治局常委会', organ: '中枢决策常委会', requiredSubLevel: 11 },
    // 中枢政治局委员
    { key: 'r15_pb_vp1',   label: '国政院副院理一（政治局委员）',    tierLabel: '中枢政治局', organ: '中枢政治局', requiredSubLevel: 10 }, // 副国级
    { key: 'r15_pb_vp2',   label: '国政院副院理二（政治局委员）',    tierLabel: '中枢政治局', organ: '中枢政治局', requiredSubLevel: 10 },
    { key: 'r15_pb_sc',    label: '国政委员（政治局委员）',          tierLabel: '中枢政治局', organ: '中枢政治局', requiredSubLevel: 10 },
    { key: 'r15_pb_bj',    label: '北京市委书记（政治局委员）',      tierLabel: '中枢政治局', organ: '中枢政治局', requiredSubLevel: 10 },
    { key: 'r15_pb_sh',    label: '上海市委书记（政治局委员）',      tierLabel: '中枢政治局', organ: '中枢政治局', requiredSubLevel: 10 },
    { key: 'r15_pb_gd',    label: '广东省委书记（政治局委员）',      tierLabel: '中枢政治局', organ: '中枢政治局', requiredSubLevel: 10 },
    { key: 'r15_pb_org',   label: '中枢组织部部长（政治局委员）',    tierLabel: '中枢政治局', organ: '中枢政治局', requiredSubLevel: 10 },
    // 中枢书记处
    { key: 'r15_sec1',     label: '中枢书记处第一书记',              tierLabel: '中枢书记处', organ: '中枢书记处', requiredSubLevel: 10 },
    { key: 'r15_sec2',     label: '中枢书记处书记（组织）',          tierLabel: '中枢书记处', organ: '中枢书记处', requiredSubLevel: 9 },
    { key: 'r15_sec3',     label: '中枢书记处书记（宣传）',          tierLabel: '中枢书记处', organ: '中枢书记处', requiredSubLevel: 9 },
    { key: 'r15_office',   label: '中枢办公厅主任',                  tierLabel: '中枢书记处', organ: '中枢书记处', requiredSubLevel: 9 },
    // 中枢纪律督察委员会
    { key: 'r15_ccdi_d1',  label: '中纪委常务副书记',                tierLabel: '中枢纪委', organ: '中枢纪委', requiredSubLevel: 10 },
    { key: 'r15_ccdi_d2',  label: '中纪委副书记（监督执纪）',        tierLabel: '中枢纪委', organ: '中枢纪委', requiredSubLevel: 9 },
    // 全国议政院常委会
    { key: 'r15_npc_d1',   label: '全国议政院常委会第一副议政委员长',      tierLabel: '全国议政院', organ: '全国议政院', requiredSubLevel: 10 },
    { key: 'r15_npc_d2',   label: '全国议政院常委会副议政委员长',          tierLabel: '全国议政院', organ: '全国议政院', requiredSubLevel: 9 },
    // 全国参政院
    { key: 'r15_cppcc_d1', label: '全国参政院第一副主席',              tierLabel: '全国参政院', organ: '全国参政院', requiredSubLevel: 10 },
    { key: 'r15_cppcc_d2', label: '全国参政院副主席',                  tierLabel: '全国参政院', organ: '全国参政院', requiredSubLevel: 9 },
    // 中枢军事委员会
    { key: 'r15_cmc_v1',   label: '中枢军委副主席一',                tierLabel: '中枢军委', organ: '中枢军委', requiredSubLevel: 10 },
    { key: 'r15_cmc_v2',   label: '中枢军委副主席二',                tierLabel: '中枢军委', organ: '中枢军委', requiredSubLevel: 10 },
    { key: 'r15_cmc_jcs',  label: '中枢军委联合参谋部参谋长',        tierLabel: '中枢军委', organ: '中枢军委', requiredSubLevel: 9 },
    // 中央直属机构要职
    { key: 'r15_cpd',      label: '中枢宣传部部长（政治局委员）',    tierLabel: '中枢书记处', organ: '中枢宣传部', requiredSubLevel: 10 },
    { key: 'r15_cuf',      label: '中枢统战部部长（政治局委员）',    tierLabel: '中枢书记处', organ: '中枢统战部', requiredSubLevel: 9 },
    { key: 'r15_cswa',     label: '中枢社会工作部部长',              tierLabel: '中枢书记处', organ: '中枢社会工作部', requiredSubLevel: 9 },
    { key: 'r15_cclc',     label: '中央政法委书记（政治局委员）',    tierLabel: '中枢书记处', organ: '中央政法委', requiredSubLevel: 10 },
    { key: 'r15_cybm',     label: '中央网络安全和信息化委员会办公室主任', tierLabel: '中枢书记处', organ: '中央网信办', requiredSubLevel: 9 },
    { key: 'r15_partysch', label: '中央党校（国家行政学院）校长',    tierLabel: '中枢书记处', organ: '中央党校', requiredSubLevel: 10 },
  ],
};

// ============ 下属 ============
// 干部特长：影响岗位匹配加成与随机事件类型
export type CadreSpecialty = 'economy' | 'social' | 'legal' | 'agriculture' | 'tech' | 'party' | 'finance' | 'military';
export const CADRE_SPECIALTY_LABEL: Record<CadreSpecialty, string> = {
  economy: '经济', social: '社会', legal: '政法', agriculture: '农业',
  tech: '科技', party: '党务', finance: '财务', military: '军事',
};
export const CADRE_SPECIALTY_COLOR: Record<CadreSpecialty, string> = {
  economy: '#2B4B6F', social: '#2a7a3b', legal: '#7B0026', agriculture: '#5c7a1a',
  tech: '#4B0082', party: '#C82829', finance: '#7B5E2A', military: '#4a4a4a',
};

// 干部随机事件
export type SubEventType = 'transfer_request' | 'corruption_risk' | 'achievement' | 'complaint' | 'borrow' | 'betrayal';
export const SUB_EVENT_CONFIG: Record<SubEventType, { label: string; icon: string; urgency: 'high' | 'medium' | 'low' }> = {
  transfer_request:  { label: '申请调动',   icon: '📤', urgency: 'medium' },
  corruption_risk:   { label: '廉洁风险',   icon: '⚠️', urgency: 'high'   },
  achievement:       { label: '重大立功',   icon: '🏆', urgency: 'low'    },
  complaint:         { label: '群众投诉',   icon: '📩', urgency: 'high'   },
  borrow:            { label: '上级借调',   icon: '🔄', urgency: 'medium' },
  betrayal:          { label: '反水叛变',   icon: '🗡️', urgency: 'high'   },
};

// 任命提名状态
export type NominationStatus = 'idle' | 'reviewing' | 'approved' | 'rejected';

export interface Subordinate {
  id: string;
  saveId: string;
  userId: string;
  name: string;
  position: string;
  role: string;
  avatarId: number;
  gender: string;
  ability: number;
  loyalty: number;
  integrity: number;
  experience: number;
  faction: Faction;      // 派系归属
  subLevel: number;      // 干部职级 1-12
  isAppointed: boolean;
  appointedRole: string | null;
  appointedDept: DeptKey | null;
  deptPosition: 'head' | 'deputy' | 'staff'; // 部门正职/副职/科员
  transferredCity: string | null;  // 调任城市记录
  lastAssessedDay: number;
  createdAt: string;
  // ── 新增字段 ──────────────────────────────────
  specialty: CadreSpecialty;          // 干部特长
  isReserve: boolean;                 // 是否列入后备干部库
  nominationStatus: NominationStatus; // 任命提名流程状态
  nominationDept: DeptKey | null;     // 提名目标部门
  nominationPosition: 'head' | 'deputy' | 'staff' | null; // 提名职位
  nominationStartDay: number | null;  // 考察开始游戏天
  eventType: SubEventType | null;     // 当前待处理事件
  eventDay: number | null;            // 事件发生游戏天
  eventHandled: boolean;              // 事件是否已处理
  satisfaction: number;               // 干部满意度 0-100
  lastReviewScores: string | null;    // 最近五维考核json
  cadreAge: number | null;            // 干部年龄
  borrowedTo: string | null;          // 借调单位（非空=被借调）
  // ── 个人档案 ──────────────────────────────────
  birthYear: number | null;           // 出生年份
  university: string | null;          // 毕业院校
  major: string | null;               // 所学专业
  hometown: string | null;            // 籍贯
  newRecruit: boolean;                // 是否新录用（组织部招录后待提醒）
  // ── 预留字段（后续门客/派遣/忠诚玩法，本期不实现逻辑） ──
  // isRetainer?: boolean;        // 是否为门客/幕僚/亲信（预留）
  // dispatchTaskId?: string | null; // 当前派遣任务（预留）
  // loyaltyEvent?: string | null;   // 忠诚事件标记（预留）
  // ── R3 派遣 & R4 师徒 ──
  isDispatched: boolean;             // 是否正在派遣执行任务
  dispatchType: DispatchType | null; // 当前派遣任务类型
  dispatchStartDay: number | null;   // 派遣开始游戏天
  dispatchEndDay: number | null;     // 派遣结束游戏天
  mentorId: string | null;           // 师傅下属ID（师徒制）
}

// ============ R3 派遣任务类型 ============
export type DispatchType = 'inspect' | 'invest' | 'stabilize' | 'special';
export const DISPATCH_CONFIG: Record<DispatchType, { label: string; icon: string; days: number; req: { kind: 'ability' | 'loyalty'; value: number }; reward: string; desc: string }> = {
  inspect:   { label: '巡查', icon: '🔍', days: 30, req: { kind: 'ability', value: 40 }, reward: '政绩+15~30 / 派系贡献+10', desc: '深入基层巡查，发现并解决民生问题' },
  invest:    { label: '招商', icon: '💰', days: 60, req: { kind: 'ability', value: 50 }, reward: '个人资金+150~300 / 政绩+20', desc: '外出招商引资，引进企业带动经济' },
  stabilize: { label: '维稳', icon: '🛡️', days: 60, req: { kind: 'loyalty', value: 50 }, reward: '派系声望+ / 治安+', desc: '维护社会稳定，化解矛盾纠纷' },
  special:   { label: '专案', icon: '📋', days: 90, req: { kind: 'ability', value: 60 }, reward: '派系贡献+30~50 / 政绩+40', desc: '承办重大专项工作，立功受奖' },
};

// ============ R4 私属门客/幕僚/亲信 ============
export type RetainerType = 'advisor' | 'spy' | 'guard';
export const RETAINER_CONFIG: Record<RetainerType, { label: string; icon: string; req: { silver?: number; connections?: number }; effect: string; desc: string }> = {
  advisor: { label: '幕僚', icon: '🧠', req: { connections: 50 }, effect: '政绩产出 +5%', desc: '政务参谋，运筹帷幄，提升整体政绩产出' },
  spy:     { label: '门客', icon: '🕵️', req: { silver: 200, connections: 30 }, effect: '事件探查成功率↑ / 不确定性↓', desc: '情报耳目，探查隐情，降低事件不确定性' },
  guard:   { label: '亲信', icon: '🛡️', req: { silver: 300 }, effect: '治安↑ / 反水概率↓', desc: '执行护卫，维护治安，降低下属反水概率' },
};
export interface Retainer {
  id: string;
  saveId: string;
  userId: string;
  type: RetainerType;
  name: string;
  avatarId: number;
  ability: number;
  loyalty: number;
  bonus: string;
  createdAt: string;
}

// ============ 下属履历 ============
export interface SubResume {
  id: string;
  saveId: string;
  subId: string;
  position: string;    // 职务名称
  deptName: string;    // 所在部门
  startDay: number;    // 开始游戏天
  endDay: number | null; // 离任游戏天（null=仍在职）
  note: string;
  createdAt: string;
}

// ============ 招商引资企业 ============
export interface Enterprise {
  id: string;
  saveId: string;
  userId: string;
  name: string;
  industry: string;       // 行业类型
  scale: 'small' | 'medium' | 'large'; // 规模
  investAmount: number;   // 投资额（万元）
  taxContribution: number; // 月税收贡献（万元）
  employeeCount: number;  // 从业人数
  introducedMonth: number; // 引进月份（游戏月）
  status: 'operating' | 'suspended' | 'closed';
  foundedDay: number;
  createdAt: string;
}

export const INDUSTRY_TYPES = [
  '制造业', '信息技术', '新能源', '生物医药', '高端装备',
  '商贸零售', '农业产业化', '文化旅游', '现代物流', '金融服务',
];

export const ENTERPRISE_NAME_PREFIXES = [
  '华盛', '鼎兴', '腾远', '宏达', '聚力', '鑫源', '瑞丰', '卓越', '恒信', '晨阳',
  '盛世', '创合', '博远', '同兴', '智汇', '龙腾', '福瑞', '康泰', '永业', '嘉和',
];
export const ENTERPRISE_NAME_SUFFIXES = [
  '科技有限公司', '实业有限公司', '投资集团', '新材料有限公司', '装备制造有限公司',
  '生物科技有限公司', '能源科技有限公司', '集团有限公司', '产业有限公司', '发展有限公司',
];

// ============ 招募候选人 ============
export interface RecruitCandidate {
  id: string;
  saveId: string;
  userId: string;
  yearKey: number;
  name: string;
  gender: string;
  avatarId: number;
  ability: number;
  loyalty: number;
  integrity: number;
  experience: number;
  trait: string;
  rankOrder: number | null;
  status: 'pending' | 'selected' | 'dismissed';
  createdAt: string;
  // ── 个人档案 ──────────────────────────────────
  birthYear: number | null;   // 出生年份
  university: string | null;  // 毕业院校
  major: string | null;       // 所学专业
  hometown: string | null;    // 籍贯
  score: number | null;       // 综合考试评分
  faction: Faction;           // 候选人派系归属（用于同派系/冲突判定）
  // ── 预留字段（后续门客/派遣/忠诚玩法，本期不实现逻辑） ──
  // retainer?: boolean;     // 是否为门客/亲信角色（预留）
  // dispatchSlot?: number | null; // 派遣任务槽位（预留）
}

// 下属特质标签（招募时随机带1个）
export const SUB_TRAITS = ['实干型', '才思敏捷', '忠诚可靠', '善于协调', '创新思维', '稳健务实', '敢于担当', '廉洁自律', '善于汇报', '执行力强'];


// ============ 家庭成员 ============
export interface FamilyMember {
  id: string;
  saveId: string;
  userId: string;
  memberType: MemberType;
  name: string;
  gender: string;
  birthDay: number;
  personality: string;
  job: string;
  studyScore: number;
  healthScore: number;
  moralScore: number;
  isAdult: boolean;
  adultPath: string | null;
  createdAt: string;
}

// ============ 上司任务 ============
export interface BossTask {
  id: string;
  saveId: string;
  userId: string;
  title: string;
  description: string;
  taskType: string;
  targetValue: number;
  currentValue: number;
  rewardMerit: number;
  rewardFavor: number;
  status: TaskStatus;
  deadlineDays: number;
  createdDay: number;
  bossLevel: number; // 1=直属 2=二级 3=三级
  isPostponed: boolean;
  createdAt: string;
  urgency: 'normal' | 'important' | 'urgent';
  penaltyMerit: number;
  penaltyFavor: number;
}

// ============ 事件记录 ============
export interface EventRecord {
  id: string;
  saveId: string;
  userId: string;
  eventType: EventType;
  title: string;
  description: string;
  choiceIndex: number | null;
  choiceText: string | null;
  meritChange: number;
  moralChange: number;
  gdpChange: number;
  livelihoodChange: number;
  ecologyChange: number;
  businessChange: number;
  gameDay: number;
  createdAt: string;
}

// ============ 案件 ============
export interface PoliceCase {
  id: string;
  saveId: string;
  userId: string;
  title: string;
  description: string;
  caseType: CaseType;
  difficulty: number;
  requiredPolice: number;
  rewardMerit: number;
  securityChange: number;
  status: CaseStatus;
  createdDay: number;
  solvedDay: number | null;
  createdAt: string;
}

// ============ 突发事件 ============
export interface EventChoice {
  text: string;
  meritChange: number;
  moralChange: number;
  gdpChange: number;
  livelihoodChange: number;
  ecologyChange: number;
  businessChange: number;
  description: string;
}

export interface EventTemplate {
  type: EventType;
  title: string;
  description: string;
  choices: EventChoice[];
  /** 是否为重大事件——重大事件触发领导班子集体决策投票 */
  isMajor?: boolean;
}

// ============ 下属数量上限（每级增加10人）============
export const SUBORDINATE_LIMIT: Record<number, number> = {
  1: 10, 2: 20, 3: 30, 4: 40, 5: 50,
  6: 60, 7: 70, 8: 80, 9: 90, 10: 100,
  11: 110, 12: 120, 13: 130,
};

// ============ 建设项目 ============
export type BuildCategory = 'town' | 'county' | 'city' | 'province';
export type EffectType = 'gdp' | 'livelihood' | 'ecology' | 'business';

export interface BuildProject {
  id: string;
  saveId: string;
  userId: string;
  name: string;
  category: BuildCategory;
  costMerit: number;
  costFund: number;
  durationDays: number;
  startDay: number;
  finishDay: number;
  status: 'building' | 'done';
  effectType: EffectType;
  effectValue: number;
  meritReward: number;
  createdAt: string;
}

export interface BuildProjectTemplate {
  name: string;
  desc: string;
  category: BuildCategory;
  /** 财政投入（元）—— 主要消耗 */
  costFund: number;
  durationDays: number;
  effectType: EffectType;
  effectValue: number;
  /** 竣工政绩奖励 */
  meritReward: number;
}

// ────────────────────────────────────────────────────────
// 城市建设项目模板
//
// costFund 单位：万元（与 player_saves.fund_balance 一致）
// 数值参照现实：乡镇5-80万 / 县级200-4000万 / 市级5000-80000万 / 省级50000-600000万
// 每个项目全局只能建设一次（已建或在建名称均屏蔽）
// ────────────────────────────────────────────────────────
export const BUILD_TEMPLATES: BuildProjectTemplate[] = [

  // ══════════════════ 乡镇级（rank 2-3）══════════════════

  // 交通基础设施
  { name: '通村公路硬化',      desc: '将泥土路改为水泥路，解决晴通雨阻问题，村民出行从根本改善',                                     category: 'town', costFund: 15,    durationDays: 60,  effectType: 'livelihood', effectValue: 8,  meritReward: 20 },
  { name: '通组路网建设',      desc: '打通各村民小组之间的道路断头路，完善乡镇路网体系',                                             category: 'town', costFund: 10,    durationDays: 45,  effectType: 'business',   effectValue: 6,  meritReward: 15 },
  { name: '危桥改造工程',      desc: '对辖区内评级为危桥的桥梁进行整体重建，消除安全隐患',                                           category: 'town', costFund: 12,    durationDays: 50,  effectType: 'livelihood', effectValue: 6,  meritReward: 14 },

  // 公共卫生
  { name: '乡镇卫生院扩建',    desc: '扩建现有卫生院门诊楼与住院楼，新增床位，提升基层诊疗能力',                                     category: 'town', costFund: 40,    durationDays: 120, effectType: 'livelihood', effectValue: 12, meritReward: 35 },
  { name: '村级卫生室建设',    desc: '在每个行政村配备标准卫生室，实现农村医疗服务"最后一公里"覆盖',                                 category: 'town', costFund: 5,     durationDays: 40,  effectType: 'livelihood', effectValue: 7,  meritReward: 18 },

  // 教育文化
  { name: '村小学修缮工程',    desc: '修缮危旧校舍，更新教学设施，改善农村儿童就学环境',                                             category: 'town', costFund: 20,    durationDays: 60,  effectType: 'livelihood', effectValue: 7,  meritReward: 18 },
  { name: '乡镇文化活动中心',  desc: '建设综合文化活动室，含图书角、文体器材，丰富群众精神文化生活',                                 category: 'town', costFund: 12,    durationDays: 45,  effectType: 'livelihood', effectValue: 5,  meritReward: 12 },

  // 商贸经济
  { name: '农村综合市场',      desc: '新建标准化农贸市场，结束露天摆摊历史，促进农产品流通',                                         category: 'town', costFund: 30,    durationDays: 70,  effectType: 'business',   effectValue: 8,  meritReward: 22 },
  { name: '电商服务站',        desc: '引进电商平台设立村镇服务站，帮助农户将农产品直接对接城市消费者',                               category: 'town', costFund: 4,     durationDays: 30,  effectType: 'business',   effectValue: 7,  meritReward: 15 },
  { name: '冷链储存仓库',      desc: '建设农产品冷链仓储设施，减少果蔬损耗，提高农业附加值',                                         category: 'town', costFund: 25,    durationDays: 80,  effectType: 'gdp',        effectValue: 8,  meritReward: 20 },

  // 生态环保
  { name: '农村污水处理站',    desc: '建设集中式污水处理设施，告别污水乱排，改善农村人居环境',                                       category: 'town', costFund: 35,    durationDays: 90,  effectType: 'ecology',    effectValue: 10, meritReward: 28 },
  { name: '生活垃圾处理站',    desc: '建设垃圾分类收集与无害化处理设施，推进农村人居环境整治',                                       category: 'town', costFund: 15,    durationDays: 50,  effectType: 'ecology',    effectValue: 7,  meritReward: 16 },
  { name: '农田防护林网',      desc: '营造防护林带，改善农田小气候，兼具水土保持与生态涵养功能',                                     category: 'town', costFund: 8,    durationDays: 60,  effectType: 'ecology',    effectValue: 6,  meritReward: 14 },

  // 民生保障
  { name: '公租房建设（乡镇）', desc: '建设低租金公租房，优先保障农村困难群体和外来务工人员居住需求',                               category: 'town', costFund: 60,    durationDays: 150, effectType: 'livelihood', effectValue: 10, meritReward: 30 },
  { name: '养老服务站',        desc: '建设乡镇养老服务中心，提供日间照料、助餐助浴等服务，应对农村老龄化',                           category: 'town', costFund: 14,    durationDays: 55,  effectType: 'livelihood', effectValue: 7,  meritReward: 16 },

  // ══════════════════ 县级（rank 4-6）══════════════════

  // 交通
  { name: '县城互通立交桥',    desc: '在主要干道交叉节点建设立交桥，缓解县城交通拥堵，提升通行效率',                                 category: 'county', costFund: 2000,   durationDays: 180, effectType: 'gdp',        effectValue: 10, meritReward: 60 },
  { name: '农村公路网提升',    desc: '对全县乡村公路实施提档升级，达到双车道技术标准，打通断头路',                                   category: 'county', costFund: 1500,   durationDays: 120, effectType: 'business',   effectValue: 8,  meritReward: 40 },
  { name: '公共停车场体系',    desc: '在县城商业区、医院、学校周边建设立体停车场，系统解决停车难题',                                 category: 'county', costFund: 800,   durationDays: 90,  effectType: 'business',   effectValue: 7,  meritReward: 30 },

  // 医疗卫生
  { name: '县人民医院扩建',    desc: '新建县人民医院外科楼，购置大型医疗设备，争创二级甲等医院',                                     category: 'county', costFund: 3000,   durationDays: 240, effectType: 'livelihood', effectValue: 15, meritReward: 90 },
  { name: '县中医院建设',      desc: '新建标准化中医院，发展中医药诊疗特色，传承地方中医资源',                                       category: 'county', costFund: 2000,   durationDays: 180, effectType: 'livelihood', effectValue: 10, meritReward: 60 },
  { name: '疾控与卫生监督中心', desc: '新建疾控中心实验室，提升重大疫情和突发公共卫生事件处置能力',                                  category: 'county', costFund: 1200,   durationDays: 150, effectType: 'livelihood', effectValue: 8,  meritReward: 45 },

  // 教育
  { name: '县职业技术学校',    desc: '建设一所涵盖汽修、电子、农业技术等专业的职业学校，培养本地技能人才',                           category: 'county', costFund: 2500,   durationDays: 200, effectType: 'livelihood', effectValue: 12, meritReward: 70 },
  { name: '县高中新校区',      desc: '在城东新区建设现代化高中校区，扩大优质教育资源供给，提升升学率',                               category: 'county', costFund: 3500,   durationDays: 270, effectType: 'livelihood', effectValue: 13, meritReward: 80 },

  // 产业经济
  { name: '县级工业园区',      desc: '规划建设标准厂房、配套道路和供排水体系，吸引劳动密集型企业入驻',                               category: 'county', costFund: 5000,   durationDays: 300, effectType: 'gdp',        effectValue: 18, meritReward: 110 },
  { name: '农产品加工园',      desc: '建设农副产品初加工与深加工园区，延伸农业产业链，提高农产品附加值',                             category: 'county', costFund: 3000,   durationDays: 200, effectType: 'gdp',        effectValue: 12, meritReward: 70 },
  { name: '现代物流中心',      desc: '建设县城骨干仓储物流园区，引入快递电商仓配一体化运营，降低物流成本',                           category: 'county', costFund: 2000,   durationDays: 150, effectType: 'business',   effectValue: 10, meritReward: 55 },

  // 生态
  { name: '城市湿地公园',      desc: '依托河道建设湿地生态公园，集生态保护、科普教育和市民休闲为一体',                               category: 'county', costFund: 1500,   durationDays: 150, effectType: 'ecology',    effectValue: 12, meritReward: 55 },
  { name: '生态防护林带',      desc: '沿县城周边营造绿化隔离林带，防止城镇扩张侵占农田，构建生态屏障',                               category: 'county', costFund: 800,   durationDays: 120, effectType: 'ecology',    effectValue: 10, meritReward: 40 },

  // 民生
  { name: '保障性住房小区（县）', desc: '新建廉租房和公租房小区，解决城镇低收入家庭和新市民住房困难',                               category: 'county', costFund: 4000,   durationDays: 240, effectType: 'livelihood', effectValue: 12, meritReward: 70 },
  { name: '综合体育场馆',      desc: '建设含体育场、游泳馆、篮球馆的综合体育中心，满足居民体育健身需求',                             category: 'county', costFund: 1500,   durationDays: 180, effectType: 'livelihood', effectValue: 8,  meritReward: 45 },
  { name: '县文化馆与图书馆',  desc: '建设现代化文化馆和公共图书馆，提升公共文化服务效能',                                           category: 'county', costFund: 1200,   durationDays: 150, effectType: 'livelihood', effectValue: 7,  meritReward: 38 },

  // ══════════════════ 市级（rank 7-9）══════════════════

  // 交通枢纽
  { name: '高铁站综合枢纽',    desc: '建设集高铁、城际、公交、出租于一体的综合交通枢纽，显著提升城市交通地位',                       category: 'city', costFund: 50000,   durationDays: 730, effectType: 'gdp',        effectValue: 22, meritReward: 320 },
  { name: '城市快速路环线',    desc: '建设城市一环快速路，实现城区重要节点快速联通，支撑城市空间扩展',                               category: 'city', costFund: 40000,   durationDays: 600, effectType: 'gdp',        effectValue: 16, meritReward: 240 },
  { name: '城市轨道交通1号线', desc: '建设城市轨道交通一期工程，缓解地面交通压力，引导城市沿轨道方向发展',                           category: 'city', costFund: 80000,   durationDays: 900, effectType: 'gdp',        effectValue: 25, meritReward: 380 },
  { name: '过境高速公路',      desc: '积极推动过境高速公路立项建设，打通对外交通通道，接入全国干线公路网',                           category: 'city', costFund: 45000,   durationDays: 720, effectType: 'business',   effectValue: 18, meritReward: 280 },
  { name: '跨江（河）特大桥',  desc: '建设跨越主要水系的特大型桥梁，将两岸发展要素高效连通',                                         category: 'city', costFund: 25000,   durationDays: 540, effectType: 'gdp',        effectValue: 14, meritReward: 200 },

  // 产业园区
  { name: '国家级高新技术开发区', desc: '申建国家高新区，引进高端制造、生物医药、电子信息等战略性新兴产业',                          category: 'city', costFund: 50000,   durationDays: 720, effectType: 'business',   effectValue: 24, meritReward: 360 },
  { name: '出口加工贸易区',    desc: '建设出口加工保税区，承接沿海产业转移，发展加工贸易与跨境电商',                                 category: 'city', costFund: 35000,   durationDays: 540, effectType: 'business',   effectValue: 18, meritReward: 260 },
  { name: '现代服务业集聚区',  desc: '规划建设金融、电商、文创、商务等现代服务业集聚区，推动经济结构优化',                           category: 'city', costFund: 20000,   durationDays: 450, effectType: 'gdp',        effectValue: 14, meritReward: 200 },

  // 教育
  { name: '大学城规划建设',    desc: '引进2-3所高校入驻大学城，补强城市高等教育短板，集聚科技创新资源',                              category: 'city', costFund: 40000,   durationDays: 720, effectType: 'livelihood', effectValue: 18, meritReward: 280 },
  { name: '职业教育园区',      desc: '建设现代职教园区，整合本地职业学校，打造区域职业教育高地',                                     category: 'city', costFund: 15000,   durationDays: 360, effectType: 'livelihood', effectValue: 12, meritReward: 180 },

  // 医疗
  { name: '三甲医院新建',      desc: '新建一所三级甲等综合医院，全面提升城市高端医疗服务能力',                                       category: 'city', costFund: 30000,   durationDays: 600, effectType: 'livelihood', effectValue: 16, meritReward: 250 },
  { name: '区域医学中心',      desc: '建设区域医学研究与临床诊疗中心，承担疑难危重病人救治和医学科研任务',                           category: 'city', costFund: 20000,   durationDays: 480, effectType: 'livelihood', effectValue: 12, meritReward: 190 },

  // 生态
  { name: '城市综合污染整治',  desc: '实施大气、水、土壤污染三位一体综合整治工程，环境质量达到国家标准',                             category: 'city', costFund: 20000,   durationDays: 450, effectType: 'ecology',    effectValue: 20, meritReward: 200 },
  { name: '城市生态绿道体系',  desc: '沿河道、山脉构建城市绿道网络，建成串联公园绿地的生态廊道',                                     category: 'city', costFund: 10000,   durationDays: 360, effectType: 'ecology',    effectValue: 14, meritReward: 150 },
  { name: '固体废弃物处理中心', desc: '建设生活垃圾焚烧发电厂和建筑垃圾循环利用基地，实现城市固废无害化处理',                        category: 'city', costFund: 15000,   durationDays: 400, effectType: 'ecology',    effectValue: 14, meritReward: 160 },

  // 民生
  { name: '保障房大规模建设',  desc: '推进保障性住房三年行动计划，大批量供应公租房、安置房，稳定房价预期',                           category: 'city', costFund: 50000,   durationDays: 600, effectType: 'livelihood', effectValue: 16, meritReward: 240 },
  { name: '市体育中心',        desc: '建设可承办省级赛事的综合体育中心，含体育场、馆和游泳跳水馆',                                   category: 'city', costFund: 15000,   durationDays: 400, effectType: 'livelihood', effectValue: 10, meritReward: 140 },
  { name: '会展经济中心',      desc: '建设大型会展综合体，举办行业博览会与贸易洽谈会，拉动消费与投资',                               category: 'city', costFund: 25000,   durationDays: 480, effectType: 'business',   effectValue: 16, meritReward: 220 },

  // ══════════════════ 省级（rank 10-11）══════════════════

  // 综合交通
  { name: '省会机场扩建（T3）', desc: '建设省会国际机场三期航站楼，将年旅客吞吐量提升至6000万人次',                                  category: 'province', costFund: 200000,  durationDays: 1460, effectType: 'gdp',        effectValue: 28, meritReward: 900 },
  { name: '城际铁路网络',      desc: '规划建设省内城际铁路主骨架，实现省会与主要地级市"1小时交通圈"',                               category: 'province', costFund: 500000,  durationDays: 1800, effectType: 'gdp',        effectValue: 30, meritReward: 1000 },
  { name: '高速公路千公里提速', desc: '对全省高速公路网进行扩容改造，新增高速里程超过1000公里，构建省内快速通道',                     category: 'province', costFund: 300000,  durationDays: 1200, effectType: 'business',   effectValue: 22, meritReward: 700 },

  // 开放型经济
  { name: '自由贸易试验区',    desc: '经国政院批复设立自贸试验区，探索制度创新，打造对外开放新高地',                                 category: 'province', costFund: 400000,  durationDays: 1500, effectType: 'business',   effectValue: 32, meritReward: 1100 },
  { name: '国家级经济技术开发区', desc: '申建并建设国家级经开区，优化营商环境，大规模引进世界500强企业',                              category: 'province', costFund: 350000,  durationDays: 1300, effectType: 'gdp',        effectValue: 26, meritReward: 900 },
  { name: '跨境电商综合试验区', desc: '申建跨境电商综合试验区，发展数字贸易，打造内陆开放型经济增长极',                              category: 'province', costFund: 150000,  durationDays: 900,  effectType: 'business',   effectValue: 20, meritReward: 650 },

  // 高端产业
  { name: '集成电路产业基地',  desc: '建设集成电路设计、制造、封测全链条产业基地，补强电子信息产业短板',                             category: 'province', costFund: 600000,  durationDays: 1800, effectType: 'gdp',        effectValue: 30, meritReward: 1000 },
  { name: '新能源汽车产业园',  desc: '引进整车及配套企业，建设新能源汽车产业集群，打造省级支柱产业',                                 category: 'province', costFund: 400000,  durationDays: 1500, effectType: 'gdp',        effectValue: 26, meritReward: 900 },
  { name: '生物医药产业园区',  desc: '建设从研发到生产的生物医药全产业链园区，承接国家重大新药创制专项',                             category: 'province', costFund: 300000,  durationDays: 1200, effectType: 'gdp',        effectValue: 22, meritReward: 750 },

  // 生态
  { name: '国家生态文明试验区', desc: '创建国家生态文明建设示范省份，建立绿水青山转化为金山银山的体制机制',                          category: 'province', costFund: 200000,  durationDays: 1000, effectType: 'ecology',    effectValue: 30, meritReward: 700 },
  { name: '重大流域综合治理',  desc: '对省内重要流域实施系统治理，统筹上下游防洪、生态、供水，建设幸福河湖',                         category: 'province', costFund: 300000,  durationDays: 1200, effectType: 'ecology',    effectValue: 26, meritReward: 750 },
  { name: '百万亩国土绿化',    desc: '推进国家储备林和退耕还林工程，绿化国土100万亩，提高森林覆盖率',                               category: 'province', costFund: 150000,  durationDays: 900,  effectType: 'ecology',    effectValue: 20, meritReward: 580 },

  // 教育科技
  { name: '国家重点实验室',    desc: '争取在省内高校建设国家重点实验室，提升基础科研能力和人才引进竞争力',                           category: 'province', costFund: 200000,  durationDays: 1000, effectType: 'livelihood', effectValue: 18, meritReward: 620 },
  { name: '高校扩张工程',      desc: '支持省内高校新建或扩建校区，提升高等教育毛入学率，优化高校学科布局',                           category: 'province', costFund: 250000,  durationDays: 1200, effectType: 'livelihood', effectValue: 20, meritReward: 680 },

  // 民生
  { name: '超大规模保障房工程', desc: '建设百万套以上保障性住房，从根本解决城镇低收入家庭住房困难问题',                               category: 'province', costFund: 500000,  durationDays: 1800, effectType: 'livelihood', effectValue: 22, meritReward: 850 },
  { name: '全省医疗体系提升',  desc: '推动优质医疗资源扩容下沉，每个县至少配备一所三级医院，看病难在县域解决',                       category: 'province', costFund: 350000,  durationDays: 1400, effectType: 'livelihood', effectValue: 24, meritReward: 800 },
];

// 获取当前级别可用的项目
export function getAvailableProjects(rankLevel: number): BuildProjectTemplate[] {
  if (rankLevel <= 1) return [];
  if (rankLevel <= 3) return BUILD_TEMPLATES.filter(p => p.category === 'town');
  if (rankLevel <= 6) return BUILD_TEMPLATES.filter(p => p.category === 'county');
  if (rankLevel <= 9) return BUILD_TEMPLATES.filter(p => p.category === 'city');
  return BUILD_TEMPLATES.filter(p => p.category === 'province');
}

// ============ 管辖区域 ============
export interface GoverningArea {
  id: string;
  saveId: string;
  userId: string;
  areaName: string;
  areaType: 'village' | 'town' | 'district' | 'city_level';
  devIndex: number;
  favorIndex: number;
  lastVisitedDay: number;
  lastInvestedDay: number;
  createdAt: string;
}

// 各级地名池
const VILLAGE_NAMES = ['红星村', '幸福村', '桃花村', '青山村', '石桥村', '梅岭村', '竹溪村', '金沙村', '双龙村', '白云村', '清泉村', '丰收村'];
const TOWN_NAMES = ['清河镇', '桥头镇', '金桥镇', '阳光镇', '新华镇', '红旗镇', '兴隆镇', '庙街镇', '平原镇', '双溪镇', '白马镇', '梅林镇'];
const DISTRICT_NAMES = ['新城区', '东城区', '西城区', '南湖区', '开发区', '滨江区', '高新区', '经开区', '工业区', '文化区'];
const CITY_NAMES = ['清远市', '龙江市', '兴安市', '平川市', '云峰市', '临泉市', '桂林市', '锦州市', '合阳市', '秀水市', '金明市'];

/** areaType 对应的中文标签 */
export const AREA_TYPE_LABEL: Record<GoverningArea['areaType'], string> = {
  village: '下辖村庄',
  town: '下辖乡镇',
  district: '下辖区县',
  city_level: '下辖地级市',
};

export function generateAreas(rankLevel: number, cityName: string): { name: string; type: GoverningArea['areaType'] }[] {
  let pool: string[];
  let type: GoverningArea['areaType'];
  let count: number;

  if (rankLevel <= 3) {
    pool = VILLAGE_NAMES; type = 'village'; count = 6;
  } else if (rankLevel <= 6) {
    pool = TOWN_NAMES; type = 'town'; count = 6;
  } else if (rankLevel <= 9) {
    pool = DISTRICT_NAMES; type = 'district'; count = 5;
  } else {
    pool = CITY_NAMES; type = 'city_level'; count = 5;
  }

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const prefix = cityName.length > 2 ? cityName.slice(0, 2) : cityName;
  return shuffled.slice(0, count).map((n, i) => ({
    name: i === 0 ? n : `${prefix.charAt(i % prefix.length)}${n}`,
    type,
  }));
}

// ============ 游戏日期工具 ============
export function gameDaysToDate(days: number): string {
  const startDate = new Date(2020, 0, 1);
  startDate.setDate(startDate.getDate() + days);
  const year = startDate.getFullYear();
  const month = startDate.getMonth() + 1;
  const day = startDate.getDate();
  return `${year}年${month}月${day}日`;
}

// 根据出生日（游戏天数）和当前天数计算年龄
export function calcAge(birthDay: number, currentDay: number): number {
  return 22 + Math.floor((currentDay - birthDay) / 365);
}

// ============ 月度工作会议 ============
export type KpiType = 'gdp' | 'livelihood' | 'ecology' | 'business';
export const KPI_LABELS: Record<KpiType, string> = {
  gdp: 'GDP增长', livelihood: '民生提升', ecology: '生态改善', business: '营商环境',
};

export interface MeetingTask {
  subordinateId: string;
  subordinateName: string;
  kpiType: KpiType;
  targetValue: number; // 目标提升点数
  deadlineDay: number;
  status: 'pending' | 'done' | 'failed';
  completedDay: number | null;
}

export interface MonthlyMeeting {
  id: string;
  saveId: string;
  userId: string;
  monthKey: string;  // Math.floor(gameDays/30).toString()
  heldDay: number;
  tasks: MeetingTask[];
  createdAt: string;
}

// ============ 秘书 ============
export interface Secretary {
  id: string;
  saveId: string;
  userId: string;
  name: string;
  avatarId: number;
  ability: number;      // 0-100 秘书能力值
  lastDocworkDay: number;
  dailySchedule: string | null;
  createdAt: string;
  // 任命下属为专属秘书
  subId: string | null;       // 关联的下属id
  isAppointed: boolean;       // 是否已任命具体下属担任秘书
}

// ============ 城市金融 ============
export interface LoanRecord {
  id: string;
  amount: number;       // 万元
  rate: number;         // 年利率 0.xx
  startDay: number;
  dueDay: number;
  monthlyPay: number;
  status: 'active' | 'paid';
}

export interface InvestmentRecord {
  id: string;
  name: string;
  amount: number;       // 万元
  startDay: number;
  endDay: number;
  effectType: EffectType;
  effectValue: number;  // 到期时提升城市指数点数
  status: 'running' | 'done';
}

export interface CityFinance {
  id: string;
  saveId: string;
  userId: string;
  fundBalance: number;
  debtTotal: number;
  loans: LoanRecord[];
  investments: InvestmentRecord[];
  investGroupEstDay: number | null;
  createdAt: string;
  updatedAt: string;
}

// 贷款模板
export interface LoanTemplate {
  name: string;
  amount: number;
  rateYearly: number;
  durationDays: number;
  desc: string;
}
export const LOAN_TEMPLATES: LoanTemplate[] = [
  { name: '小额政策贷款',       amount: 50,     rateYearly: 0.038, durationDays: 365,  desc: '乡镇专用，小额短期政策性贷款，支持乡镇基础设施建设与民生项目' },
  { name: '县域发展专项贷款',   amount: 1000,   rateYearly: 0.042, durationDays: 730,  desc: '县级专用，县域经济发展专项贷款，支持工业园区和民生工程' },
  { name: '城市建设债券',       amount: 10000,  rateYearly: 0.035, durationDays: 1825, desc: '地级市专用，城投债，用于市政基础设施和重大工程建设' },
  { name: '省级重点项目贷款',   amount: 100000, rateYearly: 0.030, durationDays: 3650, desc: '省级专用，国家政策性银行低息贷款，支持省级重大产业和基础设施项目' },
];

// 招商引资项目模板
export interface InvestTemplate {
  name: string;
  minRank: number;  // 最低可用职级
  maxRank: number;  // 最高可用职级（-1不限）
  amount: number;
  durationDays: number;
  effectType: EffectType;
  effectValue: number;
  profitRate: number;   // 年化盈利率（如 0.08 = 8%）
  desc: string;
}
export const INVEST_TEMPLATES: InvestTemplate[] = [
  // 乡镇级（rank 1-3）：小额农业/特色产业，投资50-150万
  { name: '🌾 乡镇农业招商',     minRank: 1, maxRank: 3,  amount: 30,     durationDays: 180, effectType: 'gdp',        effectValue: 5,  profitRate: 0.12, desc: '引进农业龙头企业，建立订单农业基地，带动村民增收，提升乡镇GDP' },
  { name: '🏕 乡村生态旅游',     minRank: 1, maxRank: 3,  amount: 50,     durationDays: 240, effectType: 'ecology',    effectValue: 6,  profitRate: 0.10, desc: '依托山水资源发展农家乐、民宿旅游，改善生态的同时增加税收' },
  { name: '🏭 乡镇小微工业园',   minRank: 2, maxRank: 3,  amount: 80,     durationDays: 300, effectType: 'business',   effectValue: 6,  profitRate: 0.14, desc: '建设小微企业创业园，引进劳动密集型小企业，解决农村就业问题' },
  // 县级（rank 4-6）：中等产业园，投资500-3000万
  { name: '🏭 县域工业园招商',   minRank: 4, maxRank: 6,  amount: 500,    durationDays: 365, effectType: 'business',   effectValue: 10, profitRate: 0.13, desc: '招引制造业企业入驻县级工业园，改善营商环境，扩大就业规模' },
  { name: '🌿 县域生态旅游开发', minRank: 4, maxRank: 6,  amount: 300,    durationDays: 360, effectType: 'ecology',    effectValue: 8,  profitRate: 0.11, desc: '开发县域绿色生态旅游资源，打造特色旅游目的地，改善生态同时带来税收' },
  { name: '🏙 县城商业综合体',   minRank: 4, maxRank: 6,  amount: 800,    durationDays: 420, effectType: 'business',   effectValue: 12, profitRate: 0.15, desc: '引进商业地产企业开发购物中心，带动县城商业繁荣，增加财政税收' },
  { name: '🌾 农产品加工招商',   minRank: 4, maxRank: 6,  amount: 600,    durationDays: 300, effectType: 'gdp',        effectValue: 10, profitRate: 0.14, desc: '引进农业龙头企业在本地建立加工基地，延伸产业链，提高农民收入' },
  // 市级（rank 7-9）：大型产业，投资5000-50000万
  { name: '💡 市级科技产业园',   minRank: 7, maxRank: 9,  amount: 8000,   durationDays: 540, effectType: 'gdp',        effectValue: 18, profitRate: 0.18, desc: '引进高新技术企业集群，优化产业结构，打造城市创新发展引擎' },
  { name: '🏗 城市综合体开发',   minRank: 7, maxRank: 9,  amount: 5000,   durationDays: 480, effectType: 'business',   effectValue: 15, profitRate: 0.16, desc: '引进大型商业地产企业开发城市综合体，建设商业、办公、酒店一体化项目' },
  { name: '🏭 市级先进制造业基地', minRank: 7, maxRank: 9, amount: 15000, durationDays: 600, effectType: 'gdp',        effectValue: 20, profitRate: 0.14, desc: '引进国内外大型制造业企业建立区域生产基地，形成千亿产业集群' },
  { name: '🌊 现代服务业集聚',   minRank: 7, maxRank: 9,  amount: 10000,  durationDays: 540, effectType: 'business',   effectValue: 18, profitRate: 0.17, desc: '打造金融、电商、文创等现代服务业集聚区，推动产业升级转型' },
  // 省级（rank 10-11）：重大产业，投资10万-50万亿万
  { name: '🔬 省级高端产业招商', minRank: 10, maxRank: 11, amount: 80000,  durationDays: 730, effectType: 'gdp',        effectValue: 28, profitRate: 0.16, desc: '引进世界500强和国内头部企业建立区域总部，打造省级经济增长极' },
  { name: '🏗 省级平台公司投资', minRank: 10, maxRank: -1, amount: 120000, durationDays: 900, effectType: 'business',   effectValue: 25, profitRate: 0.12, desc: '省级城投平台统筹全省基础设施投资建设，稳定收益、激活营商环境' },
  // 国家级（rank 12+）
  { name: '🌐 国家战略产业布局', minRank: 12, maxRank: -1, amount: 500000, durationDays: 1095, effectType: 'gdp',       effectValue: 35, profitRate: 0.14, desc: '推动集成电路、航空航天、量子计算等国家战略性新兴产业布局，引领全球竞争' },
];


// ============ 职务兼职系统 ============
export interface ConcurrentPost {
  key: string;         // 唯一标识
  label: string;       // 显示名称
  category: string;    // 分类：议政院/参政院/党委/其他
  minRank: number;     // 最低所需职级
  maxRank: number;     // 最高适用职级（-1不限）
  meritBonus: number;  // 每次会议/活动政绩加成
  favorBonus: number;  // 好感度加成
  desc: string;        // 职位描述
  icon: string;
}

/** 可担任的兼职职务配置（按级别分组） */
export const CONCURRENT_POST_CONFIG: ConcurrentPost[] = [
  // 全国议政院相关（全国级，12+）
  { key: 'npc_member',        label: '全国议政院代表',       category: '全国议政院',   minRank: 8,  maxRank: -1, meritBonus: 80,  favorBonus: 5,  desc: '参与全国议政院年度会议，审议国家法律法规，提交议案建议。', icon: '🏛️' },
  { key: 'npc_standing',      label: '全国议政院常委',       category: '全国议政院',   minRank: 11, maxRank: -1, meritBonus: 150, favorBonus: 10, desc: '全国议政院常务委员会委员，参与法律审议和重大事项决定。', icon: '⚖️' },
  { key: 'npc_vice_chair',    label: '全国议政院副议政委员长',   category: '全国议政院',   minRank: 13, maxRank: -1, meritBonus: 300, favorBonus: 15, desc: '全国议政院常委会副议政委员长，协助议政委员长工作，领导专项委员会。', icon: '🎖️' },
  // 全国参政院相关
  { key: 'cppcc_member',      label: '全国参政院委员',       category: '全国参政院',   minRank: 8,  maxRank: -1, meritBonus: 60,  favorBonus: 5,  desc: '参与全国政治协商会议，就国家重大事务提出参政院提案与意见。', icon: '🤝' },
  { key: 'cppcc_standing',    label: '全国参政院常委',       category: '全国参政院',   minRank: 11, maxRank: -1, meritBonus: 120, favorBonus: 8,  desc: '全国参政院常务委员会委员，参与协商议事和重要提案审查。', icon: '📋' },
  { key: 'cppcc_vice_chair',  label: '全国参政院副主席',     category: '全国参政院',   minRank: 13, maxRank: -1, meritBonus: 250, favorBonus: 12, desc: '全国参政院副主席，协助主席开展政治协商工作。', icon: '🌟' },
  // 党委相关兼职
  { key: 'central_committee', label: '中央委员',           category: '党委',       minRank: 11, maxRank: -1, meritBonus: 200, favorBonus: 12, desc: '华夏执政党中央委员会委员，参与党的重大方针政策讨论。', icon: '🔴' },
  { key: 'alternate_cc',      label: '中央候补委员',       category: '党委',       minRank: 10, maxRank: 12, meritBonus: 120, favorBonus: 8,  desc: '中央委员会候补委员，可列席中央会议，为正式委员资格储备。', icon: '🟠' },
  { key: 'politburo',         label: '中枢政治局委员',     category: '党委',       minRank: 13, maxRank: -1, meritBonus: 500, favorBonus: 20, desc: '中枢政治局委员，参与最高政治决策，主导重要政策制定。', icon: '⭐' },
  // 省/市级议政院参政院（地方级）
  { key: 'prov_npc_member',   label: '省议政代表',         category: '地方议政院',   minRank: 6,  maxRank: 10, meritBonus: 30,  favorBonus: 3,  desc: '省级人民代表大会代表，参与地方立法和监督工作。', icon: '🏠' },
  { key: 'prov_cppcc_member', label: '省参政院委员',         category: '地方参政院',   minRank: 6,  maxRank: 10, meritBonus: 25,  favorBonus: 3,  desc: '省级政治协商会议委员，就地方重大事务提案。', icon: '💬' },
  { key: 'city_npc_member',   label: '市议政代表',         category: '地方议政院',   minRank: 4,  maxRank: 8,  meritBonus: 15,  favorBonus: 2,  desc: '地级市人民代表大会代表，参与市级立法与监督。', icon: '🏙️' },
  // 其他专项职务
  { key: 'discipline_insp',   label: '纪检监察特派员',     category: '纪检',       minRank: 9,  maxRank: -1, meritBonus: 100, favorBonus: -3, desc: '负责专项纪检监察工作，开展廉政督查，提升整体廉洁度。', icon: '🔍' },
  { key: 'cyber_security',    label: '网络安全工作领导组成员', category: '专项',    minRank: 10, maxRank: -1, meritBonus: 80,  favorBonus: 4,  desc: '参与国家网络安全领导协调，推动数字治理体系建设。', icon: '💻' },
  { key: 'ecology_leader',    label: '生态文明建设专项组组长', category: '专项',    minRank: 9,  maxRank: -1, meritBonus: 90,  favorBonus: 5,  desc: '牵头推进生态文明建设重点工作，统筹协调绿色发展政策落地。', icon: '🌿' },
];

/** 获取当前职级可担任的兼职职务 */
export function getAvailableConcurrentPosts(rankLevel: number): ConcurrentPost[] {
  return CONCURRENT_POST_CONFIG.filter(
    p => p.minRank <= rankLevel && (p.maxRank === -1 || p.maxRank >= rankLevel),
  );
}

// ============ 退休年龄与退休机制配置 ============

/**
 * 各职级退休配置
 * baseAge    基准退休年龄（岁）；正国家级为 null（不强制）
 * maxDelayYears  可申请延迟退休的最长年数（0=不可延迟）
 * isVoluntaryAt  自主退休触发年龄（正国家级专用，null=不适用）
 * tier       职级层次描述
 * costPerDelay   申请1年延迟退休消耗的政绩值
 */
export interface RetirementConfig {
  baseAge: number | null;
  maxDelayYears: number;
  isVoluntaryAt: number | null;
  tier: string;
  costPerDelay: number;   // 每次申请延迟退休的政绩消耗
  delayNote: string;
}

export const RETIREMENT_CONFIG: Record<number, RetirementConfig> = {
  // 全职级统一基准退休年龄 90 岁，届龄后可申请弹性延迟退休最长 5 年（最晚 95 岁）
  1:  { baseAge: 90, maxDelayYears: 5, isVoluntaryAt: null, tier: '科员级',   costPerDelay: 50,  delayNote: '基准退休年龄90周岁，届龄后经组织批准可延迟最长5年（最晚95岁）' },
  2:  { baseAge: 90, maxDelayYears: 5, isVoluntaryAt: null, tier: '副科级',   costPerDelay: 50,  delayNote: '基准退休年龄90周岁，届龄后经组织批准可延迟最长5年（最晚95岁）' },
  3:  { baseAge: 90, maxDelayYears: 5, isVoluntaryAt: null, tier: '正科级',   costPerDelay: 50,  delayNote: '基准退休年龄90周岁，届龄后经组织批准可延迟最长5年（最晚95岁）' },
  4:  { baseAge: 90, maxDelayYears: 5, isVoluntaryAt: null, tier: '副处级',   costPerDelay: 50,  delayNote: '基准退休年龄90周岁，届龄后经组织批准可延迟最长5年（最晚95岁）' },
  5:  { baseAge: 90, maxDelayYears: 5, isVoluntaryAt: null, tier: '正处级',   costPerDelay: 50,  delayNote: '基准退休年龄90周岁，届龄后经组织批准可延迟最长5年（最晚95岁）' },
  6:  { baseAge: 90, maxDelayYears: 5, isVoluntaryAt: null, tier: '正处级',   costPerDelay: 50,  delayNote: '基准退休年龄90周岁，届龄后经组织批准可延迟最长5年（最晚95岁）' },
  7:  { baseAge: 90, maxDelayYears: 5, isVoluntaryAt: null, tier: '副厅级',   costPerDelay: 50,  delayNote: '基准退休年龄90周岁，届龄后经组织批准可延迟最长5年（最晚95岁）' },
  8:  { baseAge: 90, maxDelayYears: 5, isVoluntaryAt: null, tier: '正厅级',   costPerDelay: 50,  delayNote: '基准退休年龄90周岁，届龄后经组织批准可延迟最长5年（最晚95岁）' },
  9:  { baseAge: 90, maxDelayYears: 5, isVoluntaryAt: null, tier: '副部级',   costPerDelay: 100, delayNote: '基准90岁，届龄后经组织批准可延迟最长5年（最晚95岁）' },
  10: { baseAge: 90, maxDelayYears: 5, isVoluntaryAt: null, tier: '副部级',   costPerDelay: 100, delayNote: '基准90岁，届龄后经组织批准可延迟最长5年（最晚95岁）' },
  11: { baseAge: 90, maxDelayYears: 5, isVoluntaryAt: null, tier: '正部级',   costPerDelay: 150, delayNote: '基准90岁，届龄后经组织批准可延迟最长5年（最晚95岁）' },
  12: { baseAge: 90, maxDelayYears: 5, isVoluntaryAt: null, tier: '正部级',   costPerDelay: 150, delayNote: '基准90岁，届龄后经组织批准可延迟最长5年（最晚95岁）' },
  13: { baseAge: 90, maxDelayYears: 5, isVoluntaryAt: null, tier: '副国家级', costPerDelay: 200, delayNote: '基准90岁，届龄后经组织批准可延迟最长5年（最晚95岁）' },
  // rank 14-15：正国家级，不设强制退休，90岁可自主选择
  14: { baseAge: null, maxDelayYears: 0, isVoluntaryAt: 90, tier: '正国家级', costPerDelay: 0, delayNote: '不设法定强制退休年龄，90周岁时可自主选择' },
  15: { baseAge: null, maxDelayYears: 0, isVoluntaryAt: 90, tier: '正国家级', costPerDelay: 0, delayNote: '不设法定强制退休年龄，90周岁时可自主选择' },
};

/** 获取指定职级的退休配置 */
export function getRetirementConfig(rankLevel: number): RetirementConfig {
  return RETIREMENT_CONFIG[rankLevel] ?? RETIREMENT_CONFIG[1];
}

/** 获取有效退休年龄（计入已批准的延迟年数） */
export function getEffectiveRetirementAge(rankLevel: number, delayYearsGranted: number): number | null {
  const cfg = getRetirementConfig(rankLevel);
  if (cfg.baseAge === null) return null; // 正国家级无强制退休年龄
  return cfg.baseAge + Math.min(delayYearsGranted, cfg.maxDelayYears);
}

/**
 * 退休状态检查结果
 * none         — 未到退休相关节点
 * approaching  — 距退休不足12个月
 * voluntary    — 正国家级达到70岁，弹出自主选择弹窗
 * mandatory    — 已达有效退休年龄，强制退休（含延迟期满）
 */
export type RetirementStatusType = 'none' | 'approaching' | 'voluntary' | 'mandatory';

export interface RetirementStatus {
  type: RetirementStatusType;
  /** 距退休剩余岁数（approaching 时有意义）*/
  remainingYears?: number;
  /** 当前有效退休年龄（强制退休时使用）*/
  effectiveRetirementAge?: number;
  config: RetirementConfig;
}

/** 检查当前玩家的退休状态 */
export function checkRetirementStatus(
  rankLevel: number,
  playerAge: number,
  delayYearsGranted: number,
): RetirementStatus {
  const cfg = getRetirementConfig(rankLevel);

  // 正国家级——自主退休逻辑
  if (cfg.isVoluntaryAt !== null && playerAge >= cfg.isVoluntaryAt) {
    return { type: 'voluntary', config: cfg };
  }

  // 有基准退休年龄——强制/临近逻辑
  if (cfg.baseAge !== null) {
    const effective = cfg.baseAge + Math.min(delayYearsGranted, cfg.maxDelayYears);
    if (playerAge >= effective) {
      return { type: 'mandatory', effectiveRetirementAge: effective, config: cfg };
    }
    const remaining = effective - playerAge;
    if (remaining <= 1) {
      return { type: 'approaching', remainingYears: remaining, effectiveRetirementAge: effective, config: cfg };
    }
  }

  return { type: 'none', config: cfg };
}

/**
 * 正国家级续任投票（rank15 每届届满触发）
 * 参照现实：总执书记、华夏主席、中枢军委主席均由党代会、议政院等机构投票决定是否续任
 * 机制：基础通过率85%，绩优加成最高+12%；投票通过继续执政，失败则荣退
 */
export interface RenewalVoteResult {
  voteRate: number;     // 最终得票率（0-100）
  passed: boolean;      // 是否通过（>= 75）
  termsAfter: number;   // 投票通过后的届数
  breakdown: {
    base: number;       // 85
    moralBonus: number;
    meritBonus: number;
    favorBonus: number;
    stabilityBonus: number;
    random: number;     // ±随机波动
  };
}

/** 计算续任投票结果 */
export function calcRenewalVote(
  moralValue: number,
  meritPoints: number,
  cityGdp: number,
  bossFavor: number,
  boss2Favor: number,
  nationalTermsServed: number,
): RenewalVoteResult {
  const base = 85;
  // 民心值加成（廉洁形象）
  const moralBonus = moralValue >= 80 ? 5 : moralValue >= 60 ? 3 : moralValue >= 40 ? 1 : -2;
  // 政绩加成（GDP + 民生综合）
  const avgMetric = (cityGdp + meritPoints / 1000) / 2;
  const meritBonus = avgMetric >= 70 ? 4 : avgMetric >= 50 ? 2 : 0;
  // 上司好感（政治局常委会及议政院）
  const favorBonus = bossFavor >= 80 ? 3 : bossFavor >= 65 ? 1 : 0;
  // 稳定性加成：执政越久反而略降（党内年轻化压力）
  const stabilityBonus = nationalTermsServed === 0 ? 0 : nationalTermsServed >= 3 ? -5 : -2;
  // 随机波动 ±4（模拟党代会讨论变数）
  const random = Math.round((Math.random() * 8 - 4) * 10) / 10;

  const voteRate = Math.min(99, Math.max(60, base + moralBonus + meritBonus + favorBonus + stabilityBonus + random));
  return {
    voteRate: Math.round(voteRate * 10) / 10,
    passed: voteRate >= 75,
    termsAfter: nationalTermsServed + 1,
    breakdown: { base, moralBonus, meritBonus, favorBonus, stabilityBonus, random },
  };
}

// ============ 资金自动简写（全局通用）============
export function formatMoney(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1_000_000_000_000) return `${sign}${(abs / 1_000_000_000_000).toFixed(1)}万亿`;
  if (abs >= 100_000_000)       return `${sign}${(abs / 100_000_000).toFixed(1)}亿`;
  if (abs >= 10_000_000)        return `${sign}${(abs / 10_000_000).toFixed(1)}千万`;
  if (abs >= 10_000)            return `${sign}${(abs / 10_000).toFixed(1)}万`;
  return `${sign}${abs.toLocaleString()}`;
}

/**
 * 格式化财政资金（单位：万元）
 * 1亿 = 10000万；1万亿 = 100000000万
 * 超1万亿万元 → "X.X万亿元"；超1亿万元 → "X.X亿元"；超1万万元 → "X.X万元"；否则直接显示
 */
export function formatFund(wan: number): string {
  const abs = Math.abs(wan);
  const sign = wan < 0 ? '-' : '';
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(1)}万亿元`;
  if (abs >= 10_000)      return `${sign}${(abs / 10_000).toFixed(1)}亿元`;
  if (abs >= 1_000)       return `${sign}${(abs / 1_000).toFixed(1)}千万元`;
  return `${sign}${abs.toLocaleString()}万元`;
}

// 全国GDP估算（根据rankLevel和cityGdp指数计算，单位亿）
export function estimateNationalGdp(rankLevel: number, cityGdp: number): number {
  // 基础值：模拟全国GDP约120万亿，根据指数上下浮动
  const base = 1_200_000_000_000_000; // 1200万亿分（显示为120万亿）
  const factor = 0.7 + (cityGdp / 100) * 0.6;
  return Math.round((base * factor) / 100_000_000); // 返回亿元
}


// =====================================================================
// ========  中央核心权力架构（国家级职位体系）  ========================
// =====================================================================

/** 职位等级：L1=政治局常委会成员 | L2=政治局委员 | L3=副国家级/正部辅助 | L4=正部辅助 */
export type NationalRankTier = 'L1' | 'L2' | 'L3' | 'L4';

/** 中央职位所属权力机构 */
export type NationalOrgan =
  | '中枢决策常委会'
  | '中枢政治局'
  | '中枢书记处'
  | '中枢纪律督察委员会'
  | '全国议政院常委会'
  | '华夏参政院'
  | '中枢军事委员会'
  | '国政院'
  | '中枢宣传部'
  | '中枢统战部'
  | '中央政法委'
  | '中枢社会工作部'
  | '中央党校'
  | '中央网信委办公室'
  | '青年联合总团';

export interface NationalPosition {
  key: string;
  title: string;
  tier: NationalRankTier;
  organ: NationalOrgan;
  /** 是否为政治局常委会核心成员（七人决议机制参与者） */
  isPSC: boolean;
  desc: string;
  /** 常见兼任说明 */
  concurrentNote?: string;
}


// ─── 政治局常委会（7名常委）────────────────────────────────────
export const PSC_POSITIONS: NationalPosition[] = [
  { key:'psc_1', title:'中共中央总执书记', tier:'L1', organ:'中枢决策常委会', isPSC:true,
    desc:'党的最高领导职务，主持中枢政治局、中枢决策常委会工作，统领全党全军全国工作。',
    concurrentNote:'兼任华夏主席、中枢中枢军委主席，集党政军最高权力于一身' },
  { key:'psc_2', title:'国政院院理', tier:'L1', organ:'中枢决策常委会', isPSC:true,
    desc:'主持国政院工作，是国家最高行政机关的负责人，统筹协调全国经济社会发展与政府日常运转。',
    concurrentNote:'同时担任中枢政治局常委，党内第二号领导人' },
  { key:'psc_3', title:'全国议政院常委会议政委员长', tier:'L1', organ:'中枢决策常委会', isPSC:true,
    desc:'主持全国议政院常务委员会工作，负责立法、监督与议政院常委会各专门委员会事务。',
    concurrentNote:'同时担任中枢政治局常委，党内第三号领导人，兼任全国议政院常委会党委书记' },
  { key:'psc_4', title:'全国参政院主席', tier:'L1', organ:'中枢决策常委会', isPSC:true,
    desc:'主持华夏全国参政院工作，负责政治协商、民主监督与参政议政。',
    concurrentNote:'同时担任中枢政治局常委，部分届次兼任中枢书记处第一书记' },
  { key:'psc_5', title:'中枢书记处第一书记', tier:'L1', organ:'中枢决策常委会', isPSC:true,
    desc:'主持中枢书记处日常工作，协调党中枢政治局决议的贯彻执行，分管宣传意识形态与精神文明建设。',
    concurrentNote:'同时担任中枢政治局常委，兼任中央宣传思想文化工作领导小组组长' },
  { key:'psc_6', title:'国政院常务副院理', tier:'L1', organ:'中枢决策常委会', isPSC:true,
    desc:'协助总理主持国政院常务工作，排名第一的国政院副院理，统筹协调重大经济与民生发展事项。',
    concurrentNote:'同时担任中枢政治局常委，党内第六号领导人' },
  { key:'psc_7', title:'中枢纪委书记', tier:'L1', organ:'中枢决策常委会', isPSC:true,
    desc:'主持中枢纪律督察委员会、国家监察委员会工作，负责党纪国法监督执行。',
    concurrentNote:'兼任国家监察委员会主任，是反腐败斗争的最高主持者' },
];


// ─── 中枢政治局委员（约18名非常委委员）────────────────────────
export const POLITBURO_POSITIONS: NationalPosition[] = [
  { key:'pb_premier_dep', title:'国政院副院理（政治局委员）', tier:'L2', organ:'中枢政治局', isPSC:false,
    desc:'协助总理分管经济、农业、科技、民生等专项工作，通常同时担任政治局委员。' },
  { key:'pb_state_council', title:'国政委员（政治局委员）', tier:'L2', organ:'中枢政治局', isPSC:false,
    desc:'协助总理处理重大综合性事务，常分管外交、国防、公安等特定领域。',
    concurrentNote:'可能兼任外交部长或国防部长' },
  { key:'pb_bj_sec', title:'北京市委书记（政治局委员）', tier:'L2', organ:'中枢政治局', isPSC:false,
    desc:'主持北京市委工作，首都地位使该职通常配备政治局委员资格。',
    concurrentNote:'首都重要省委书记，惯例配政治局委员' },
  { key:'pb_sh_sec', title:'上海市委书记（政治局委员）', tier:'L2', organ:'中枢政治局', isPSC:false,
    desc:'主持上海市委工作，全国最大经济中心的党委负责人，惯例享政治局委员级别。' },
  { key:'pb_gd_sec', title:'广东省委书记（政治局委员）', tier:'L2', organ:'中枢政治局', isPSC:false,
    desc:'主持广东省委工作，作为经济第一大省，省委书记通常为政治局委员。' },
  { key:'pb_xj_sec', title:'新疆党委书记（政治局委员）', tier:'L2', organ:'中枢政治局', isPSC:false,
    desc:'主持新疆维吾尔自治区党委工作，重要边疆地区负责人，配政治局委员资格。' },
  { key:'pb_cmc_vice', title:'中枢军委副主席（政治局委员）', tier:'L2', organ:'中枢政治局', isPSC:false,
    desc:'协助中枢中枢军委主席领导全国武装力量，通常为军队最高实职将领。',
    concurrentNote:'通常配备两位，为军队系统最高代表' },
  { key:'pb_org_dept', title:'中枢组织部部长（政治局委员）', tier:'L2', organ:'中枢政治局', isPSC:false,
    desc:'主管全国干部选拔任用、党员管理与党建工作，掌握人事核心资源。' },
  { key:'pb_others', title:'其他政治局委员', tier:'L2', organ:'中枢政治局', isPSC:false,
    desc:'担任重要党政职务的政治局委员，包括重要省份及部门负责人等。' },
];


// ─── 中枢书记处 ──────────────────────────────────────────────
export const SECRETARIAT_POSITIONS: NationalPosition[] = [
  { key:'sec_first', title:'中枢书记处第一书记', tier:'L2', organ:'中枢书记处', isPSC:false,
    desc:'主持中枢书记处日常工作，负责党的日常事务与政治局决议的贯彻执行。',
    concurrentNote:'通常由政治局常委兼任（排名第五）' },
  { key:'sec_m1', title:'中枢书记处书记（组织）', tier:'L3', organ:'中枢书记处', isPSC:false,
    desc:'协助处理党的中枢工作，分管党务组织建设与干部事务协调。' },
  { key:'sec_m2', title:'中枢书记处书记（宣传）', tier:'L3', organ:'中枢书记处', isPSC:false,
    desc:'协助处理宣传意识形态领域党务，协调中央媒体与舆论工作。' },
  { key:'sec_m3', title:'中枢书记处书记（统战）', tier:'L3', organ:'中枢书记处', isPSC:false,
    desc:'协助统一战线与民族宗教领域党务事项，联络各民主党派和无党派人士。' },
  { key:'sec_general_office', title:'中枢办公厅主任', tier:'L3', organ:'中枢书记处', isPSC:false,
    desc:'负责华夏执政党中枢办公厅工作，是党中央日常运转的最高执行协调者。',
    concurrentNote:'中枢书记处书记兼任，掌握党中枢信息流' },
];

// ─── 中枢纪律督察委员会 ──────────────────────────────────────
export const CCDI_POSITIONS: NationalPosition[] = [
  { key:'ccdi_deputy1', title:'中纪委常务副书记', tier:'L2', organ:'中枢纪律督察委员会', isPSC:false,
    desc:'协助书记主持中纪委日常工作，负责纪检监察体系的具体运营管理。' },
  { key:'ccdi_deputy2', title:'中纪委副书记（监督执纪）', tier:'L3', organ:'中枢纪律督察委员会', isPSC:false,
    desc:'分管监督执纪问责领域，负责重要案件查处与问责制度建设。' },
  { key:'ccdi_deputy3', title:'中纪委副书记（审查调查）', tier:'L3', organ:'中枢纪律督察委员会', isPSC:false,
    desc:'分管案件审查调查工作，负责违纪违法干部的立案审查。' },
  { key:'ccdi_inspection', title:'中央巡视工作领导小组组长', tier:'L3', organ:'中枢纪律督察委员会', isPSC:false,
    desc:'负责统筹协调中央巡视工作，对各省、央企、金融机构开展政治巡视。',
    concurrentNote:'通常由中纪委副书记兼任' },
];


// ─── 全国议政院常务委员会 ──────────────────────────────
export const NPC_POSITIONS: NationalPosition[] = [
  { key:'npc_deputy1', title:'全国议政院常委会第一副议政委员长', tier:'L2', organ:'全国议政院常委会', isPSC:false,
    desc:'协助议政委员长主持议政院常委会工作，分管特定立法领域或联系省级议政院。',
    concurrentNote:'通常为政治局委员或退休政治局常委转任' },
  { key:'npc_deputy2', title:'全国议政院常委会副议政委员长（若干）', tier:'L3', organ:'全国议政院常委会', isPSC:false,
    desc:'分管各专门委员会工作，通常由退休正部级干部或民主党派主要负责人担任。' },
  { key:'npc_sec_gen', title:'全国议政院常委会秘书长', tier:'L4', organ:'全国议政院常委会', isPSC:false,
    desc:'负责议政院常委会办公厅工作，协调议政院日常行政事务与会议筹备。' },
];

// ─── 华夏全国参政院 ─────────────────────────
export const CPPCC_POSITIONS: NationalPosition[] = [
  { key:'cppcc_deputy1', title:'全国参政院第一副主席', tier:'L2', organ:'华夏参政院', isPSC:false,
    desc:'协助主席主持参政院工作，负责联系重要社会阶层与统一战线工作。',
    concurrentNote:'通常为政治局委员' },
  { key:'cppcc_deputy2', title:'全国参政院副主席（若干）', tier:'L3', organ:'华夏参政院', isPSC:false,
    desc:'分管联系特定界别，通常由各民主党派主席、无党派人士代表或退休省部级干部担任。' },
  { key:'cppcc_sec_gen', title:'全国参政院秘书长', tier:'L4', organ:'华夏参政院', isPSC:false,
    desc:'负责参政院办公厅及日常行政工作，协调提案办理与委员联络服务。' },
];

// ─── 中枢军事委员会 ─────────────────────────────────────────
export const CMC_POSITIONS: NationalPosition[] = [
  { key:'cmc_vice1', title:'中枢军委副主席（主持联合作战）', tier:'L2', organ:'中枢军事委员会', isPSC:false,
    desc:'协助主席主持军委日常工作，分管联合作战指挥体系与重大军事行动统筹协调。',
    concurrentNote:'通常为政治局委员，上将军衔' },
  { key:'cmc_vice2', title:'中枢军委副主席（主持战略后勤）', tier:'L2', organ:'中枢军事委员会', isPSC:false,
    desc:'协助主席主持军委日常工作，分管军队战略建设、后勤装备与国防科工体系。',
    concurrentNote:'通常为政治局委员，上将军衔' },
  { key:'cmc_jcs', title:'中枢军委联合参谋部参谋长', tier:'L3', organ:'中枢军事委员会', isPSC:false,
    desc:'统筹协调全军联合作战行动，是军队作战指挥体系的最高运筹参谋长。',
    concurrentNote:'军委委员，上将军衔' },
  { key:'cmc_political', title:'中枢军委政治工作部主任', tier:'L3', organ:'中枢军事委员会', isPSC:false,
    desc:'主管全军政治工作，负责思想建军、党的领导制度在军队中的落实。',
    concurrentNote:'军委委员，上将军衔' },
  { key:'cmc_logistics', title:'中枢军委后勤保障部部长', tier:'L3', organ:'中枢军事委员会', isPSC:false,
    desc:'统管全军后勤保障、装备物资供给与战时后勤动员体系。',
    concurrentNote:'军委委员，上将军衔' },
  { key:'cmc_office', title:'中枢军委办公厅主任', tier:'L4', organ:'中枢军事委员会', isPSC:false,
    desc:'负责军委办公厅日常运转，协调军委文件下发与重要会议组织。' },
];


// ─── 国政院（正部级常委会成员 + 重要部委）────────────────────
export const STATE_COUNCIL_POSITIONS: NationalPosition[] = [
  // ── 国政院常委会成员（非政治局常委的副院理/国政委员）──
  { key:'sc_vp1', title:'国政院副院理（分管农业·科技）', tier:'L2', organ:'国政院', isPSC:false,
    desc:'协助总理分管农业农村、科学技术、粮食安全等领域，联系农业农村部、科技部等。',
    concurrentNote:'通常同时担任政治局委员（见政治局板块）' },
  { key:'sc_vp2', title:'国政院副院理（分管工业·能源）', tier:'L2', organ:'国政院', isPSC:false,
    desc:'协助总理分管工业经济、能源、交通、国有资产等领域，联系工信部、发改委、国资委等。' },
  { key:'sc_vp3', title:'国政院副院理（分管民生·社保）', tier:'L2', organ:'国政院', isPSC:false,
    desc:'协助总理分管教育、卫生、社保、就业等民生工作，联系教育部、卫健委、人社部等。' },
  { key:'sc_councilor1', title:'国政委员（分管外交）', tier:'L2', organ:'国政院', isPSC:false,
    desc:'协助总理处理外交事务，通常担任国家外交委员会副主任，处理重大双边外交。',
    concurrentNote:'可能兼任外交部部长，为正部级高配国政委员' },
  { key:'sc_councilor2', title:'国政委员（分管国防·国安）', tier:'L2', organ:'国政院', isPSC:false,
    desc:'协助总理处理国防与国家安全事务，联系国防部、国家安全部等。',
    concurrentNote:'可能兼任国防部部长' },
  { key:'sc_sec_gen', title:'国政院秘书长', tier:'L2', organ:'国政院', isPSC:false,
    desc:'负责国政院办公厅工作，协调国政院各机构日常运转，是国政院最重要的后台管理者。',
    concurrentNote:'通常兼任国政委员，国政院常委会固定成员' },

  // ── 外交·国防·政法 ──
  { key:'sc_mfa', title:'外交部部长', tier:'L3', organ:'国政院', isPSC:false,
    desc:'主持外交部工作，代表国家开展双边多边外交，参与重大国际事务谈判与磋商。',
    concurrentNote:'常由国政委员兼任（正部级高配）' },
  { key:'sc_mod', title:'国防部部长', tier:'L3', organ:'国政院', isPSC:false,
    desc:'主持国防部工作，负责对外军事交流与国防政策对外宣示，对内统筹国防建设事务。',
    concurrentNote:'常由国政委员兼任，同时担任中枢军委委员' },
  { key:'sc_mps', title:'公安部部长', tier:'L3', organ:'国政院', isPSC:false,
    desc:'主持公安部工作，统筹全国公安系统社会治安与侦查工作，负责出入境管理。' },
  { key:'sc_mss', title:'国家安全部部长', tier:'L3', organ:'国政院', isPSC:false,
    desc:'主持国家安全部工作，负责国内反间谍与境外情报搜集，职权高度保密。' },
  { key:'sc_moj', title:'司法部部长', tier:'L3', organ:'国政院', isPSC:false,
    desc:'主持司法部工作，统筹全国法律事务、司法行政管理、律师与公证行业监管。' },

  // ── 经济·财政·金融 ──
  { key:'sc_ndrc', title:'国家发展和改革委员会主任', tier:'L3', organ:'国政院', isPSC:false,
    desc:'统筹全国经济体制改革与发展规划，审批重大投资项目，负责宏观调控综合协调。' },
  { key:'sc_mof', title:'财政部部长', tier:'L3', organ:'国政院', isPSC:false,
    desc:'主持财政部工作，管理国家预算、税收分配与国债发行，是国家财政资源最高管理者。' },
  { key:'sc_pboc', title:'华夏中央银行行长', tier:'L3', organ:'国政院', isPSC:false,
    desc:'主持华夏中央银行工作，负责货币政策制定与实施、金融稳定与外汇管理。' },
  { key:'sc_sasac', title:'国政院国资委主任', tier:'L3', organ:'国政院', isPSC:false,
    desc:'代表国政院对中央国有企业行使出资人职责，监管重要行业央企的人事与绩效考核。' },
  { key:'sc_mofcom', title:'商务部部长', tier:'L3', organ:'国政院', isPSC:false,
    desc:'主持商务部工作，统筹国内贸易与对外经贸合作，负责外商投资管理与反倾销工作。' },
  { key:'sc_samr', title:'国家市场监督管理总局局长', tier:'L3', organ:'国政院', isPSC:false,
    desc:'统一监管市场秩序、食品药品安全、知识产权与反垄断，是最大的综合市场监管机构。' },
  { key:'sc_nao', title:'审计署审计长', tier:'L3', organ:'国政院', isPSC:false,
    desc:'主持国家审计署工作，对中央预算执行与财政收支开展独立审计监督。' },

  // ── 产业·民生·科教 ──
  { key:'sc_miit', title:'工业和信息化部部长', tier:'L3', organ:'国政院', isPSC:false,
    desc:'统筹工业经济发展、信息化建设与国防科工，管理电信频率与互联网行业。' },
  { key:'sc_mee', title:'生态环境部部长', tier:'L3', organ:'国政院', isPSC:false,
    desc:'主持生态环境部工作，统筹大气、水、土壤污染防治与应对气候变化政策。' },
  { key:'sc_moe', title:'教育部部长', tier:'L3', organ:'国政院', isPSC:false,
    desc:'主持教育部工作，统筹全国基础教育、高等教育与职业教育政策，负责高考制度管理。' },
  { key:'sc_most', title:'科学技术部部长', tier:'L3', organ:'国政院', isPSC:false,
    desc:'主持科技部工作，统筹国家重大科技专项，推进科技体制改革与创新驱动发展战略。' },
  { key:'sc_nhc', title:'国家卫生健康委员会主任', tier:'L3', organ:'国政院', isPSC:false,
    desc:'主持卫健委工作，统筹全国医疗卫生体系、公共卫生应急与人口健康政策。' },
  { key:'sc_mara', title:'农业农村部部长', tier:'L3', organ:'国政院', isPSC:false,
    desc:'主持农业农村部工作，统筹农业生产、农村改革与乡村振兴战略实施。' },
  { key:'sc_mot', title:'交通运输部部长', tier:'L3', organ:'国政院', isPSC:false,
    desc:'主持交通运输部工作，统筹公路、铁路、水运、民航综合交通运输体系建设。' },
  { key:'sc_mohr', title:'人力资源和社会保障部部长', tier:'L3', organ:'国政院', isPSC:false,
    desc:'主持人社部工作，统筹全国就业促进、社会保险、工资收入分配与人事管理。' },
  { key:'sc_ndrc_dep', title:'国家发改委常务副主任', tier:'L4', organ:'国政院', isPSC:false,
    desc:'协助主任主持发改委日常工作，分管综合、投资、价格等核心业务部门。' },
  { key:'sc_mof_dep', title:'财政部常务副部长', tier:'L4', organ:'国政院', isPSC:false,
    desc:'协助部长主持财政部日常工作，负责预算编制审核与地方财政关系统筹协调。' },

  // ── 民生·住建·水利·自然资源 ──
  { key:'sc_mca',    title:'民政部部长',             tier:'L3', organ:'国政院', isPSC:false,
    desc:'主持民政部工作，统筹全国低保救助、养老服务、殡葬管理、婚姻登记与基层自治，是民生保障的核心主管部门。' },
  { key:'sc_mhurd',  title:'住房和城乡建设部部长',   tier:'L3', organ:'国政院', isPSC:false,
    desc:'主持住建部工作，统筹全国城乡规划建设、住房保障体系与建筑市场管理，负责房地产市场宏观调控政策协调。' },
  { key:'sc_mwr',    title:'水利部部长',             tier:'L3', organ:'国政院', isPSC:false,
    desc:'主持水利部工作，统筹全国水资源管理、重大水利工程建设与防汛抗旱应急，负责河长制、南水北调等重点工作。' },
  { key:'sc_mnr',    title:'自然资源部部长',         tier:'L3', organ:'国政院', isPSC:false,
    desc:'主持自然资源部工作，统一管理土地、矿产、海洋、地质等自然资源，负责国土空间规划与自然保护地体系建设。' },
  { key:'sc_mct',    title:'文化和旅游部部长',       tier:'L3', organ:'国政院', isPSC:false,
    desc:'主持文旅部工作，统筹全国文化事业发展、旅游产业促进与非物质文化遗产保护，负责文化外交与"走出去"工程。' },

  // ── 新设与改革部委 ──
  { key:'sc_mvaa',   title:'退役军人事务部部长',     tier:'L3', organ:'国政院', isPSC:false,
    desc:'主持退役军人事务部工作（2018年新设），统筹全国退役军人安置保障、权益维护与烈士褒扬，维护军人优待制度体系。' },
  { key:'sc_mem',    title:'应急管理部部长',         tier:'L3', organ:'国政院', isPSC:false,
    desc:'主持应急管理部工作（2018年新设），统筹全国安全生产监管、自然灾害防治、消防救援与重大突发事件应急处置。' },
  { key:'sc_neac',   title:'国家民族事务委员会主任', tier:'L3', organ:'国政院', isPSC:false,
    desc:'主持国家民委工作，统筹全国民族关系协调、少数民族经济社会发展与民族政策研究，是民族团结工作最高行政机构。' },

  // ── 金融·市场监管 ──
  { key:'sc_nhsa',   title:'国家金融监督管理总局局长', tier:'L3', organ:'国政院', isPSC:false,
    desc:'主持金融监管总局工作（2023年由银保监会升格），统一监管银行业、保险业与非银行金融机构，维护金融系统安全。' },
  { key:'sc_csrc',   title:'中国证券监督管理委员会主席', tier:'L3', organ:'国政院', isPSC:false,
    desc:'主持证监会工作，统一监管全国证券、期货与基金市场，负责上市公司信披监管与资本市场稳定。' },
  { key:'sc_nhia',   title:'国家医疗保障局局长',     tier:'L3', organ:'国政院', isPSC:false,
    desc:'主持国家医保局工作（2018年新设），统筹全国基本医疗保险、药品集采与医保基金安全监管，是"灵魂砍价"集采政策决策核心。' },
  { key:'sc_sta',    title:'国家税务总局局长',       tier:'L3', organ:'国政院', isPSC:false,
    desc:'主持国家税务总局工作，统一管理全国税收征管与稽查，负责税收政策执行与纳税服务优化，是财政收入核心保障机构。' },
  { key:'sc_nrta',   title:'国家广播电视总局局长',   tier:'L3', organ:'国政院', isPSC:false,
    desc:'主持广电总局工作，监管全国广播电视与网络视听节目内容，负责影视许可证审批，与宣传部共同把控舆论导向。' },
  { key:'sc_gsa',    title:'国家体育总局局长',       tier:'L3', organ:'国政院', isPSC:false,
    desc:'主持国家体育总局工作，统筹全国竞技体育与大众健身政策，负责奥运会等重大赛事备战与体育产业发展。' },
  { key:'sc_nbs',    title:'国家统计局局长',         tier:'L3', organ:'国政院', isPSC:false,
    desc:'主持国家统计局工作，负责全国GDP、CPI等重要经济社会数据统计发布，维护统计数据真实性，是宏观决策数据基础的守护者。' },

  // ── 副部级直属机构 ──
  { key:'sc_nfga',   title:'国家粮食和物资储备局局长', tier:'L4', organ:'国政院', isPSC:false,
    desc:'统筹全国粮食收购储运与战略物资储备，负责国家粮食安全战略执行与应急储备体系建设，受发改委管理的副部级直属机构。' },
  { key:'sc_nfla',   title:'国家林业和草原局局长',   tier:'L4', organ:'国政院', isPSC:false,
    desc:'统筹全国林草资源保护与合理利用，负责退耕还林、湿地保护与国家公园体系建设，副部级、由自然资源部管理。' },
  { key:'sc_nrca',   title:'国家铁路局局长',         tier:'L4', organ:'国政院', isPSC:false,
    desc:'负责全国铁路安全监管与行业监管，制定铁路技术标准，监督国家铁路集团安全运营，交通运输部管理的副部级机构。' },
  { key:'sc_cma',    title:'中国气象局局长',         tier:'L4', organ:'国政院', isPSC:false,
    desc:'主持中国气象局工作，提供全国气象预报预警服务，开展气候变化应对研究，维护气象探测网络安全稳定运行。' },
  { key:'sc_cnipa',  title:'国家知识产权局局长',     tier:'L4', organ:'国政院', isPSC:false,
    desc:'主持国家知识产权局工作，负责专利、商标审查注册与知识产权保护，推进"知识产权强国"战略实施，由市场监管总局管理。' },
  { key:'sc_gao',    title:'国政院研究室主任',       tier:'L4', organ:'国政院', isPSC:false,
    desc:'主持国政院研究室工作，为总理和国政院起草重要文稿，开展重大政策理论研究，是最高行政机构的核心智囊参谋机构。' },
];

// ─── 中枢宣传部（意识形态核心机构）─────────────────────────
export const CPD_POSITIONS: NationalPosition[] = [
  { key:'cpd_minister', title:'中枢宣传部部长', tier:'L2', organ:'中枢宣传部', isPSC:false,
    desc:'主持中枢宣传部全面工作，统筹党的意识形态工作、新闻舆论管理与文化产业政策，向中枢书记处负责。',
    concurrentNote:'通常由中枢政治局委员担任（副国级高配正部级）' },
  { key:'cpd_deputy1', title:'中枢宣传部常务副部长', tier:'L3', organ:'中枢宣传部', isPSC:false,
    desc:'协助部长主持宣传部日常工作，分管新闻出版、网络宣传与对外传播等核心业务。' },
  { key:'cpd_deputy2', title:'中枢宣传部副部长（网络舆论）', tier:'L3', organ:'中枢宣传部', isPSC:false,
    desc:'分管互联网内容管理、网络舆论引导与新媒体平台监管，兼联系国家广播电视总局。' },
  { key:'cpd_deputy3', title:'中枢宣传部副部长（文化产业）', tier:'L3', organ:'中枢宣传部', isPSC:false,
    desc:'分管文化艺术、出版发行、影视管理与文化产业发展，联系中国作家协会、中国文联等团体。' },
  { key:'cpd_xinhua', title:'新华通讯社社长', tier:'L3', organ:'中枢宣传部', isPSC:false,
    desc:'主持新华社全面工作，统领全球200余个驻外分社，是国家最重要的官方通讯社负责人。',
    concurrentNote:'副部级正职，受中枢宣传部业务指导' },
  { key:'cpd_people_daily', title:'人民日报社总编辑', tier:'L3', organ:'中枢宣传部', isPSC:false,
    desc:'主持人民日报社编辑出版工作，是党中央机关报的最高新闻决策者，负责重要舆论定调。' },
  { key:'cpd_cctv', title:'中央广播电视总台台长', tier:'L3', organ:'中枢宣传部', isPSC:false,
    desc:'主持中央广播电视总台全面工作，统管CCTV、中国国际电视台（CGTN）等多个频道平台。' },
];

// ─── 中枢统一战线工作部（统战工作核心机构）────────────────
export const UFWD_POSITIONS: NationalPosition[] = [
  { key:'ufwd_minister', title:'中枢统战部部长', tier:'L2', organ:'中枢统战部', isPSC:false,
    desc:'主持中枢统战部全面工作，统筹非中共党派、无党派人士、少数民族、宗教界与港澳台海外侨胞联络工作。',
    concurrentNote:'通常由中枢书记处书记兼任' },
  { key:'ufwd_deputy1', title:'中枢统战部常务副部长', tier:'L3', organ:'中枢统战部', isPSC:false,
    desc:'协助部长主持日常统战工作，分管民主党派与无党派人士联络，兼联系全国工商联等团体。' },
  { key:'ufwd_deputy2', title:'中枢统战部副部长（港澳台）', tier:'L3', organ:'中枢统战部', isPSC:false,
    desc:'分管港澳台工作协调与对台统战工作，联系全国台湾同胞投资企业联谊会等港澳台涉侨机构。' },
  { key:'ufwd_deputy3', title:'中枢统战部副部长（民族宗教）', tier:'L3', organ:'中枢统战部', isPSC:false,
    desc:'分管少数民族事务与宗教工作，兼联系国家民族事务委员会、国家宗教事务局业务。' },
  { key:'ufwd_cppcc_liai', title:'全国工商联主席', tier:'L3', organ:'中枢统战部', isPSC:false,
    desc:'主持全国工商业联合会工作，联系非公有制经济代表人士，是统战系统联系民营企业家的重要渠道。',
    concurrentNote:'正部级，受中枢统战部指导' },
];

// ─── 中枢政法委员会（政法系统最高协调机构）────────────────
export const CPLC_POSITIONS: NationalPosition[] = [
  { key:'cplc_sec', title:'中枢政法委员会书记', tier:'L2', organ:'中央政法委', isPSC:false,
    desc:'主持中央政法委工作，统筹协调公检法司等政法机关，负责维护社会稳定与重大政治敏感案件协调处理。',
    concurrentNote:'通常由中枢政治局委员担任（副国级高配正部级）' },
  { key:'cplc_deputy', title:'中央政法委秘书长', tier:'L3', organ:'中央政法委', isPSC:false,
    desc:'负责中央政法委日常运转与综合协调，是政法委核心行政运作的具体执行负责人。' },
  { key:'cplc_spc', title:'最高人民法院院长', tier:'L3', organ:'中央政法委', isPSC:false,
    desc:'主持最高人民法院全面工作，行使最高司法解释权，统管全国法院审判工作，是国家最高审判机关的负责人。',
    concurrentNote:'正部级，党中央委员会委员，最高法院同时接受议政院监督' },
  { key:'cplc_spp', title:'最高人民检察院检察长', tier:'L3', organ:'中央政法委', isPSC:false,
    desc:'主持最高人民检察院全面工作，负责对全国刑事案件的法律监督，统管职务犯罪检察与公益诉讼工作。' },
  { key:'cplc_mps', title:'公安部部长（中央政法委委员）', tier:'L3', organ:'中央政法委', isPSC:false,
    desc:'作为中央政法委委员参与政法协调，同时主持公安部工作，是政法委中权力最大的成员之一。' },
  { key:'cplc_mss', title:'国家安全部部长（中央政法委委员）', tier:'L3', organ:'中央政法委', isPSC:false,
    desc:'作为中央政法委委员参与政法协调，同时主持国家安全部工作，负责反间谍与境外情报工作。' },
  { key:'cplc_moj', title:'司法部部长（中央政法委委员）', tier:'L3', organ:'中央政法委', isPSC:false,
    desc:'作为中央政法委委员参与政法协调，统管全国司法行政体系、律师公证行业与社区矫正工作。' },
];

// ─── 中枢社会工作部（2023年新设，基层治理核心）────────────
export const CSWB_POSITIONS: NationalPosition[] = [
  { key:'cswb_minister', title:'中枢社会工作部部长', tier:'L3', organ:'中枢社会工作部', isPSC:false,
    desc:'主持中枢社会工作部全面工作。该部2023年新设，统筹党建引领基层治理、新经济组织和新社会组织党建工作。',
    concurrentNote:'正部级，中央直属机构' },
  { key:'cswb_deputy', title:'中枢社会工作部副部长', tier:'L3', organ:'中枢社会工作部', isPSC:false,
    desc:'协助部长分管社区治理、网格化管理与新兴领域党建工作，推进党的建设向社会末梢延伸。' },
];

// ─── 中央党校（国家行政学院）（干部教育培训核心机构）────────
export const CPCSCHOOL_POSITIONS: NationalPosition[] = [
  { key:'cpcschool_pres', title:'中央党校（国家行政学院）校长', tier:'L2', organ:'中央党校', isPSC:false,
    desc:'主持中央党校暨国家行政学院工作，负责高级干部政治理论培训与党的理论研究工作。',
    concurrentNote:'通常由中枢书记处书记兼任，是高级干部晋升培训的枢纽' },
  { key:'cpcschool_exec_vp', title:'中央党校常务副校长', tier:'L3', organ:'中央党校', isPSC:false,
    desc:'协助校长主持中央党校日常教学与行政管理，是党校具体运营的最高执行官。' },
  { key:'cpcschool_vp', title:'中央党校副校长（国家行政学院副院长）', tier:'L3', organ:'中央党校', isPSC:false,
    desc:'协助主持党校或国家行政学院工作，分管特定教研领域或学员管理工作。' },
];

// ─── 中央网络安全和信息化委员会办公室（网信办）────────────
export const CAC_POSITIONS: NationalPosition[] = [
  { key:'cac_dir', title:'中央网信办主任（国家互联网信息办公室主任）', tier:'L2', organ:'中央网信委办公室', isPSC:false,
    desc:'统筹网络安全与信息化工作，监管互联网内容、数据安全与网络平台合规，是数字中国建设的核心主管部门负责人。',
    concurrentNote:'正部级，通常由中枢政治局委员担任（高配）' },
  { key:'cac_dep_dir', title:'中央网信办副主任', tier:'L3', organ:'中央网信委办公室', isPSC:false,
    desc:'协助主任分管网络安全审查、算法治理、个人信息保护或国际网络合作，是数字治理具体推进的核心官员。' },
  { key:'cac_dep_content', title:'中央网信办副主任（网络内容管理）', tier:'L3', organ:'中央网信委办公室', isPSC:false,
    desc:'专责互联网内容生态治理，负责有害信息清查、网络平台内容合规审查与"清朗"系列专项行动统筹。' },
];

// ─── 青年联合总团（团派路线的出发地与重要晋升节点）────────────
export const CYCL_POSITIONS: NationalPosition[] = [
  { key:'cycl_first', title:'青年联合总团第一书记', tier:'L3', organ:'青年联合总团', isPSC:false,
    desc:'主持青年联合总团全面工作，是全国青年组织的最高负责人。正部级，中央委员会委员。',
    concurrentNote:'团派路线核心高位，届满后多转任省委书记或中央部委部长' },
  { key:'cycl_standing', title:'共青团中枢书记处常务书记', tier:'L3', organ:'青年联合总团', isPSC:false,
    desc:'协助第一书记主持团中枢书记处日常工作，分管基层团建与青年工作统筹。副部级。',
    concurrentNote:'届满常转任省委副书记或副部级职务' },
  { key:'cycl_sec1', title:'共青团中枢书记处书记（组织·宣传）', tier:'L4', organ:'青年联合总团', isPSC:false,
    desc:'分管青年总团组织建设与宣传工作，协调全国各省团委业务。副部级。' },
  { key:'cycl_sec2', title:'共青团中枢书记处书记（青年工作）', tier:'L4', organ:'青年联合总团', isPSC:false,
    desc:'分管青年权益保护、就业创业服务与大学生工作。副部级。' },
  { key:'cycl_youth_fed', title:'中华全国青年联合会主席', tier:'L4', organ:'青年联合总团', isPSC:false,
    desc:'主持全国青联工作，联系各界青年代表，开展对外青年交流与爱国统战工作。副部级。',
    concurrentNote:'通常由团中枢书记处书记兼任' },
  { key:'cycl_school', title:'全国学生联合会主席', tier:'L4', organ:'青年联合总团', isPSC:false,
    desc:'主持全国学联工作，代表全国学生群体参与重大事务，是团派路线的重要培养平台。正厅级。' },
];

/** 全量国家级职位（按各机构合并，PSC 成员在各机构中不重复列示） */
export const NATIONAL_OFFICIAL_POSITIONS: NationalPosition[] = [
  ...PSC_POSITIONS,
  ...POLITBURO_POSITIONS,
  ...SECRETARIAT_POSITIONS,
  ...CCDI_POSITIONS,
  ...NPC_POSITIONS,
  ...CPPCC_POSITIONS,
  ...CMC_POSITIONS,
  ...STATE_COUNCIL_POSITIONS,
  ...CPD_POSITIONS,
  ...UFWD_POSITIONS,
  ...CPLC_POSITIONS,
  ...CSWB_POSITIONS,
  ...CPCSCHOOL_POSITIONS,
  ...CAC_POSITIONS,
  ...CYCL_POSITIONS,
];

/** 各机构展示顺序 */
export const NATIONAL_ORGAN_ORDER: NationalOrgan[] = [
  '中枢决策常委会',
  '中枢政治局',
  '中枢书记处',
  '中枢纪律督察委员会',
  '全国议政院常委会',
  '华夏参政院',
  '中枢军事委员会',
  '国政院',
  '中枢宣传部',
  '中枢统战部',
  '中央政法委',
  '中枢社会工作部',
  '中央党校',
  '中央网信委办公室',
  '青年联合总团',
];

/** 层级颜色（国家级） */
export const NATIONAL_TIER_COLOR: Record<NationalRankTier, string> = {
  L1: '#8B0000',
  L2: '#4A0E2E',
  L3: '#1a2a4a',
  L4: '#1a3a2a',
};

/** 层级中文标签（国家级） */
export const NATIONAL_TIER_LABEL: Record<NationalRankTier, string> = {
  L1: '正国家级·最高核心',
  L2: '正/副国家级',
  L3: '副国/正部级',
  L4: '正部级辅助',
};

/** 按机构获取国家级职位（含 PSC 成员，PSC 成员不重复出现在子机构中） */
export function getNationalByOrgan(organ: NationalOrgan): NationalPosition[] {
  if (organ === '中枢决策常委会') return PSC_POSITIONS;
  // 其他机构：排除已在常委会中出现的 key（psc_7 是纪委书记，psc_3是议政院，psc_4是参政院）
  const pscKeys = new Set(PSC_POSITIONS.map(p => p.key));
  return NATIONAL_OFFICIAL_POSITIONS.filter(p => p.organ === organ && !pscKeys.has(p.key));
}

// ======================================================================
// ★ 新系统：领导班子 / 仕途档案 / 健康精力 / 党校 / 政策运动 / 城市指标
// ======================================================================

/** 仕途历史条目 */
export interface CareerEntry {
  yearStart: number;   // 现实年份（如2015）
  yearEnd: number | null;
  position: string;    // 职务名称
  city: string;        // 任职城市/单位
  rankLevel: number;
}

/** 领导班子成员（NPC） */
export interface LeadershipBand {
  id: string;
  saveId: string;
  positionKey: string;
  positionLabel: string;
  rankLevel: number;
  name: string;
  gender: string;
  age: number;
  faction: FactionId;
  ability: number;       // 0-100
  loyalty: number;       // 好感度 0-100
  integrity: number;     // 廉洁度 0-100
  careerHistory: CareerEntry[];
  isRetired: boolean;
  retireGameDay: number | null;
  // 个人档案扩展
  birthProvince: string;
  birthCity: string;
  universityName: string;
  graduationYear: number;
  birthYear: number;
  // 班子分组
  bandGroup: 'party' | 'gov' | 'nda';
  // 头像
  avatarId?: number;
}

/** 玩家健康精力 */
export interface PlayerHealth {
  id: string;
  saveId: string;
  health: number;    // 0-100
  energy: number;    // 0-100
  isOnLeave: boolean;
  leaveEndDay: number | null;
  lastMonthlyCareDay: number; // 上次月度医疗保健加成的game_days
}

// ============ 健康 / 精力联动系统 ============

/**
 * 各职级「月度健康自然恢复」（单位：点/月）
 * 来源：住房环境改善 + 医疗保健配套 + 生活条件提升
 * 叠加规则：基础值 + 下列联动加成
 */
export const RANK_MONTHLY_HEALTH_REGEN: Record<number, number> = {
  1:  1,   // 科员：几乎无保障，略有自然恢复
  2:  2,   // 副科：乡镇宿舍，条件有限
  3:  2,   // 正科：干部公寓，略好一些
  4:  3,   // 副处：享有县级干部保健
  5:  4,   // 正处：县级单位配备卫生室
  6:  4,   // 正处（书记）：同上稍优
  7:  6,   // 副厅：市级干部保健，定期体检
  8:  7,   // 正厅：专属保健医生跟诊
  9:  8,   // 正厅（书记）：中央保健委委托市级医院专案
  10: 10,  // 副部：省级领导专属保健医生，高端医院绿色通道
  11: 12,  // 正部：中央保健委直管，顶级医疗资源
  12: 15,  // 国政院部长：中央保健委直管+专属医疗组
  13: 18,  // 副院理：24小时医疗保障
  14: 20,  // 总理：国家领导人医疗保障体系
  15: 25,  // 总执书记：最高级中央保健团队
};

/**
 * 各职级「每日精力自然恢复加成」（基础值之上的增量）
 * 基础每日恢复 = 5点；此表为额外加成
 * 来源：住房质量 / 医疗条件 / 职务待遇
 */
export const RANK_DAILY_ENERGY_BONUS: Record<number, number> = {
  1: 0, 2: 0, 3: 1,
  4: 1, 5: 1, 6: 2,
  7: 2, 8: 2, 9: 3,
  10: 3, 11: 4,
  12: 4, 13: 5,
  14: 5, 15: 6,
};

/**
 * 各职级医疗保健级别名称及说明
 */
export const RANK_MEDICAL_TIER: Record<number, { tier: string; desc: string; emoji: string }> = {
  1:  { tier: '社区卫生',     emoji: '🏥', desc: '享有基本医保，就诊社区卫生中心，无专属保健待遇' },
  2:  { tier: '单位医务室',   emoji: '🩺', desc: '单位配备基本医务室，可享受简单诊疗' },
  3:  { tier: '单位医务室',   emoji: '🩺', desc: '单位医务室，乡镇卫生院合作定期巡诊' },
  4:  { tier: '县级干部保健', emoji: '💊', desc: '纳入县级干部保健计划，享有县人民医院优先就诊通道' },
  5:  { tier: '县级干部保健', emoji: '💊', desc: '县级干部保健，年度全面体检，重大疾病绿色通道' },
  6:  { tier: '处级干部保健', emoji: '💊', desc: '处级干部保健计划，每年享有专项体检及疗养机会' },
  7:  { tier: '市级专属保健', emoji: '🏨', desc: '市级领导专属保健，市三甲医院专家团队定期随诊' },
  8:  { tier: '市级专属保健', emoji: '🏨', desc: '市级保健委直管，专属保健医生，疗养院年度疗养' },
  9:  { tier: '省级委托保健', emoji: '🌟', desc: '中央保健委委托省级医院专案管理，顶级医疗资源' },
  10: { tier: '省级专属医疗', emoji: '🌟', desc: '省级领导专属保健医生跟诊，高端医院全程绑定' },
  11: { tier: '中央保健委直管', emoji: '⭐', desc: '中央保健委直接管理，北京顶级医院专属病房待命' },
  12: { tier: '中央保健委直管', emoji: '⭐', desc: '中央保健委直管，专属医疗组24小时随行保障' },
  13: { tier: '国家领导人保健', emoji: '🔴', desc: '国家领导人医疗保障体系，顶级医疗专家24小时待命' },
  14: { tier: '国家领导人保健', emoji: '🔴', desc: '同上，额外配备国际顶级医学资源' },
  15: { tier: '最高保健规格',   emoji: '🏅', desc: '中央最高级别保健待遇，中南海专属医疗团队全程保障' },
};

/**
 * 购买资产对健康/精力的月度加成
 * key = 资产key，value = { healthBonus, energyBonusDaily }
 */
export const ASSET_HEALTH_BONUS: Record<string, { healthBonus: number; energyBonusDaily: number; desc: string }> = {
  car_basic:        { healthBonus: 0, energyBonusDaily: 0.3, desc: '通勤更便捷，减轻疲劳' },
  car_luxury:       { healthBonus: 0, energyBonusDaily: 0.5, desc: '豪华车载休息区，精力微恢复' },
  house_self:       { healthBonus: 2, energyBonusDaily: 1,   desc: '自购住房改善居住环境' },
  house_premium:    { healthBonus: 4, energyBonusDaily: 1.5, desc: '高档住宅，空气和环境明显改善' },
  gym_membership:   { healthBonus: 3, energyBonusDaily: 1,   desc: '健身房会员，每月锻炼效果' },
  health_checkup:   { healthBonus: 5, energyBonusDaily: 0,   desc: '定期深度体检，早发现早治疗' },
};

/** 党校培训类型 */
export type PartySchoolLevel = 'county' | 'city' | 'basic' | 'middle' | 'advanced' | 'national';

export interface PartySchoolRecord {
  id: string;
  saveId: string;
  targetType: 'player' | 'subordinate';
  targetId: string | null;
  targetName: string;
  trainLevel: PartySchoolLevel;
  startGameDay: number;
  endGameDay: number;
  isComplete: boolean;
  abilityBonus: number;
  loyaltyBonus: number;
  promoteBonus: number;
  networkBonus: number; // 人脉加成（上司好感度）
  certName: string;     // 结业证书名称
}

/** 国家政策运动 */
export interface NationalPolicy {
  id: string;
  saveId: string;
  policyKey: string;
  policyName: string;
  startGameDay: number;
  durationDays: number;
  isActive: boolean;
  responded: boolean;
}

/** 城市指标联动 */
export interface CityMetrics {
  id: string;
  saveId: string;
  gdp: number;        // 0-100
  finance: number;
  ecology: number;
  stability: number;
  education: number;
  healthcare: number;
  investBonus: number;         // 招商引资加成%
  petitionReduction: number;   // 信访减少%
  talentPool: number;          // 人才积累
}

// ── 退休年龄上限（按职级区间） ──────────────────────────────────────────
// rank 1-3 乡科级：60岁  rank 4-6 县处级：58岁
// rank 7-9 地厅级：60岁  rank 10-11 副/正省部级：63岁
// rank 12-13 正部级：63岁  rank 14-15 国家级：68岁
export const RETIREMENT_AGE_MAP: Record<number, number> = {
  1: 60, 2: 60, 3: 60,
  4: 58, 5: 58, 6: 58,
  7: 60, 8: 60, 9: 60,
  10: 63, 11: 63,
  12: 63, 13: 65,
  14: 68, 15: 68,
};

/** 各职级 NPC 合理年龄范围 [min, max] */
export const NPC_AGE_RANGE: Record<number, [number, number]> = {
  1: [28, 40], 2: [30, 43], 3: [33, 46],
  4: [36, 50], 5: [40, 52], 6: [42, 54],
  7: [44, 55], 8: [46, 57], 9: [47, 58],
  10: [50, 60], 11: [52, 62],
  12: [53, 62], 13: [55, 63],
  14: [57, 65], 15: [60, 67],
};

/** 党校培训配置 */
export const PARTY_SCHOOL_CONFIG: Record<PartySchoolLevel, {
  label: string;
  schoolName: string;
  fullName: string;
  durationDays: number;
  costResource: number;
  abilityBonus: number;
  loyaltyBonus: number;
  promoteBonus: number;
  networkBonus: number;  // 完成后上司好感度加成
  certName: string;      // 结业证书
  minRank: number;
  color: string;
  desc: string;          // 培训简介
}> = {
  county:   {
    label: '科级班', schoolName: '乡镇/县委党校',
    fullName: '县委党校（乡镇干部培训班）',
    durationDays: 14, costResource: 20,
    abilityBonus: 2, loyaltyBonus: 5, promoteBonus: 0, networkBonus: 0,
    certName: '县委党校结业证书',
    minRank: 1, color: '#5A7A40',
    desc: '适合科员至副科级干部，以基层治理、党的理论基础为主要内容。就近参加，不占用较多时间。',
  },
  city:     {
    label: '处级班', schoolName: '市委党校',
    fullName: '市委党校（处级干部进修班）',
    durationDays: 21, costResource: 40,
    abilityBonus: 4, loyaltyBonus: 8, promoteBonus: 0, networkBonus: 2,
    certName: '市委党校进修结业证书',
    minRank: 3, color: '#2B6B4F',
    desc: '适合科级至处级干部，聚焦城市治理、经济发展、党的建设，可结识同级干部、拓展地方人脉。',
  },
  basic:    {
    label: '初级班', schoolName: '省委党校',
    fullName: '省委党校（县处级干部培训班）',
    durationDays: 30, costResource: 50,
    abilityBonus: 5, loyaltyBonus: 10, promoteBonus: 0, networkBonus: 3,
    certName: '省委党校结业证书',
    minRank: 4, color: '#2a5a3e',
    desc: '适合县处级干部，系统学习习近平新时代中国特色社会主义思想，兼修治理能力与执政能力，结识省内厅处级同学。',
  },
  middle:   {
    label: '中级班', schoolName: '省委党校',
    fullName: '省委党校（厅级领导干部进修班）',
    durationDays: 60, costResource: 100,
    abilityBonus: 10, loyaltyBonus: 15, promoteBonus: 5, networkBonus: 5,
    certName: '省委党校厅级干部进修结业证书',
    minRank: 7, color: '#1D3B6C',
    desc: '适合厅级干部，深入研习新发展理念与宏观治理，有助于晋升副省级，可建立省际干部交流网络。',
  },
  advanced: {
    label: '高级班', schoolName: '中央党校',
    fullName: '中央党校（省部级干部研讨班）',
    durationDays: 90, costResource: 200,
    abilityBonus: 15, loyaltyBonus: 20, promoteBonus: 10, networkBonus: 10,
    certName: '中央党校结业证书',
    minRank: 10, color: '#7B3F00',
    desc: '适合省部级领导干部，在中央党校深度研修国家治理，参与高层研讨，与其他省部级同学建立全国性人脉网络。',
  },
  national: {
    label: '国家级研修', schoolName: '中央党校（国家行政学院）',
    fullName: '中央党校（国家行政学院）（国家级领导干部专题研修班）',
    durationDays: 30, costResource: 300,
    abilityBonus: 20, loyaltyBonus: 25, promoteBonus: 15, networkBonus: 15,
    certName: '中央党校（国家行政学院）研修结业证书',
    minRank: 12, color: '#4A0E0E',
    desc: '面向正部级及以上领导干部，中央党校与国家行政学院合并后的最高级别研修，参与党和国家重大战略研讨，接触核心圈层人脉。',
  },
};

/** 国家重大政策运动池 */
export interface NationalPolicyDef {
  key: string;
  name: string;
  desc: string;
  durationDays: number; // 持续天数
  affectedMetric: 'ecology' | 'stability' | 'gdp' | 'education' | 'healthcare' | 'integrity';
  meritBonus: number;   // 积极响应获得的政绩加成
  meritPenalty: number; // 消极应对的政绩惩罚
  promoteBonus: number; // 晋升加分
  // §4.1 派系色彩：该运动有利于的派系 / 不利于的派系
  favoredFaction?: FactionId | null;
  disfavoredFaction?: FactionId | null;
}

export const NATIONAL_POLICY_POOL: NationalPolicyDef[] = [
  { key: 'sweepEvil',    name: '扫黑除恶专项行动',  desc: '全面打击黑恶势力，整顿社会治安，提升群众安全感。',   durationDays: 120, affectedMetric: 'stability',  meritBonus: 60,  meritPenalty: -30, promoteBonus: 8,  favoredFaction: 'pragmatic', disfavoredFaction: 'local' },
  { key: 'ecoSupervise', name: '中央环保督查',       desc: '国家环保督查组进驻，对环境问题实施严格检查和问责。',  durationDays: 90,  affectedMetric: 'ecology',    meritBonus: 50,  meritPenalty: -40, promoteBonus: 6,  favoredFaction: 'techno',    disfavoredFaction: 'local' },
  { key: 'antiCorrupt',  name: '反腐败专项行动',     desc: '深入推进反腐败斗争，持续形成高压态势。',              durationDays: 150, affectedMetric: 'integrity',  meritBonus: 40,  meritPenalty: -50, promoteBonus: 5,  favoredFaction: 'reform',    disfavoredFaction: 'local' },
  { key: 'ruralRevival', name: '乡村振兴攻坚',       desc: '全面推进乡村振兴战略，加快农业农村现代化步伐。',      durationDays: 180, affectedMetric: 'education',  meritBonus: 55,  meritPenalty: -25, promoteBonus: 7,  favoredFaction: 'cyl',       disfavoredFaction: null },
  { key: 'commonPros',   name: '共同富裕示范行动',   desc: '扎实推进共同富裕，缩小城乡差距，提升居民收入。',      durationDays: 120, affectedMetric: 'healthcare', meritBonus: 50,  meritPenalty: -30, promoteBonus: 6,  favoredFaction: 'cyl',       disfavoredFaction: 'reform' },
  { key: 'safetyCheck',  name: '安全生产专项整治',   desc: '开展安全生产大检查，消除重大安全隐患。',              durationDays: 60,  affectedMetric: 'stability',  meritBonus: 35,  meritPenalty: -35, promoteBonus: 4,  favoredFaction: 'pragmatic', disfavoredFaction: null },
  { key: 'eduImprove',   name: '教育质量提升行动',   desc: '深化教育改革，提升教育公平与质量。',                  durationDays: 90,  affectedMetric: 'education',  meritBonus: 45,  meritPenalty: -20, promoteBonus: 5,  favoredFaction: 'cyl',       disfavoredFaction: null },
  { key: 'gdpDrive',     name: '经济高质量发展攻坚', desc: '坚持质量第一，效益优先，推动经济高质量发展。',        durationDays: 120, affectedMetric: 'gdp',        meritBonus: 60,  meritPenalty: -35, promoteBonus: 8,  favoredFaction: 'reform',    disfavoredFaction: 'pragmatic' },
];

// ── 领导班子职位配置（按玩家rank层级） ──────────────────────────────────
export interface BandPositionDef {
  key: string;
  label: string;
  isPlayerRole?: boolean; // 玩家自身职位，不生成NPC
}

export const BAND_POSITIONS: Record<number, BandPositionDef[]> = {
  // 乡镇级（rank 1-3）镇党委常委会9人
  1: [
    { key: 'town_party_sec',   label: '镇党委书记' },
    { key: 'town_vice_sec',    label: '党委副书记兼镇长', isPlayerRole: true }, // rank3玩家
    { key: 'town_full_vice',   label: '专职党委副书记' },
    { key: 'town_discipline',  label: '纪委书记' },
    { key: 'town_org',         label: '组织委员' },
    { key: 'town_prop',        label: '宣传委员' },
    { key: 'town_legal',       label: '政法委员' },
    { key: 'town_armed',       label: '武装部长' },
    { key: 'town_npc',         label: '议政院主席' },
  ],
  2: [
    { key: 'town_party_sec',   label: '镇党委书记' },
    { key: 'town_vice_sec',    label: '党委副书记兼镇长', isPlayerRole: true },
    { key: 'town_full_vice',   label: '专职党委副书记' },
    { key: 'town_discipline',  label: '纪委书记' },
    { key: 'town_org',         label: '组织委员' },
    { key: 'town_prop',        label: '宣传委员' },
    { key: 'town_legal',       label: '政法委员' },
    { key: 'town_armed',       label: '武装部长' },
    { key: 'town_npc',         label: '议政院主席' },
  ],
  3: [
    { key: 'town_party_sec',   label: '镇党委书记' },
    { key: 'town_mayor',       label: '镇长', isPlayerRole: true },
    { key: 'town_full_vice',   label: '专职党委副书记' },
    { key: 'town_discipline',  label: '纪委书记' },
    { key: 'town_org',         label: '组织委员' },
    { key: 'town_prop',        label: '宣传委员' },
    { key: 'town_legal',       label: '政法委员' },
    { key: 'town_armed',       label: '武装部长' },
    { key: 'town_npc',         label: '议政院主席' },
  ],
  // 县处级（rank 4-6）县委常委会11人
  4: [
    { key: 'county_party_sec', label: '县委书记' },
    { key: 'county_gov_sec',   label: '县委副书记兼县长' },
    { key: 'county_full_vice', label: '专职县委副书记' },
    { key: 'county_discipline',label: '县纪委书记' },
    { key: 'county_org',       label: '县委组织部长' },
    { key: 'county_prop',      label: '县委宣传部长' },
    { key: 'county_legal',     label: '县委政法委书记' },
    { key: 'county_armed',     label: '县人武部部长' },
    { key: 'county_exec_vice', label: '常务副县长', isPlayerRole: true },
    { key: 'county_united',    label: '县委统战部长' },
    { key: 'county_npc',       label: '议政院主任' },
  ],
  5: [
    { key: 'county_party_sec', label: '县委书记' },
    { key: 'county_mayor',     label: '县长', isPlayerRole: true },
    { key: 'county_full_vice', label: '专职县委副书记' },
    { key: 'county_discipline',label: '县纪委书记' },
    { key: 'county_org',       label: '县委组织部长' },
    { key: 'county_prop',      label: '县委宣传部长' },
    { key: 'county_legal',     label: '县委政法委书记' },
    { key: 'county_armed',     label: '县人武部部长' },
    { key: 'county_exec_vice', label: '常务副县长' },
    { key: 'county_united',    label: '县委统战部长' },
    { key: 'county_npc',       label: '议政院主任' },
  ],
  6: [
    { key: 'county_party_sec', label: '县委书记', isPlayerRole: true },
    { key: 'county_mayor',     label: '县长' },
    { key: 'county_full_vice', label: '专职县委副书记' },
    { key: 'county_discipline',label: '县纪委书记' },
    { key: 'county_org',       label: '县委组织部长' },
    { key: 'county_prop',      label: '县委宣传部长' },
    { key: 'county_legal',     label: '县委政法委书记' },
    { key: 'county_armed',     label: '县人武部部长' },
    { key: 'county_exec_vice', label: '常务副县长' },
    { key: 'county_united',    label: '县委统战部长' },
    { key: 'county_npc',       label: '议政院主任' },
  ],
  // 地厅级（rank 7-9）市委常委会13人
  7: [
    { key: 'city_party_sec',   label: '市委书记' },
    { key: 'city_mayor',       label: '市长' },
    { key: 'city_full_vice',   label: '专职市委副书记' },
    { key: 'city_discipline',  label: '市纪委书记' },
    { key: 'city_org',         label: '市委组织部长' },
    { key: 'city_prop',        label: '市委宣传部长' },
    { key: 'city_legal',       label: '市委政法委书记' },
    { key: 'city_exec_vice',   label: '常务副市长', isPlayerRole: true },
    { key: 'city_united',      label: '市委统战部长' },
    { key: 'city_armed',       label: '市人武部政委' },
    { key: 'city_sec_gen',     label: '市委秘书长' },
    { key: 'city_vice2',       label: '市委副书记（专职）' },
    { key: 'city_npc',         label: '议政院常委会主任' },
  ],
  8: [
    { key: 'city_party_sec',   label: '市委书记' },
    { key: 'city_mayor',       label: '市长', isPlayerRole: true },
    { key: 'city_full_vice',   label: '专职市委副书记' },
    { key: 'city_discipline',  label: '市纪委书记' },
    { key: 'city_org',         label: '市委组织部长' },
    { key: 'city_prop',        label: '市委宣传部长' },
    { key: 'city_legal',       label: '市委政法委书记' },
    { key: 'city_exec_vice',   label: '常务副市长' },
    { key: 'city_united',      label: '市委统战部长' },
    { key: 'city_armed',       label: '市人武部政委' },
    { key: 'city_sec_gen',     label: '市委秘书长' },
    { key: 'city_vice2',       label: '市委副书记（专职）' },
    { key: 'city_npc',         label: '议政院常委会主任' },
  ],
  9: [
    { key: 'city_party_sec',   label: '市委书记', isPlayerRole: true },
    { key: 'city_mayor',       label: '市长' },
    { key: 'city_full_vice',   label: '专职市委副书记' },
    { key: 'city_discipline',  label: '市纪委书记' },
    { key: 'city_org',         label: '市委组织部长' },
    { key: 'city_prop',        label: '市委宣传部长' },
    { key: 'city_legal',       label: '市委政法委书记' },
    { key: 'city_exec_vice',   label: '常务副市长' },
    { key: 'city_united',      label: '市委统战部长' },
    { key: 'city_armed',       label: '市人武部政委' },
    { key: 'city_sec_gen',     label: '市委秘书长' },
    { key: 'city_vice2',       label: '市委副书记（专职）' },
    { key: 'city_npc',         label: '议政院常委会主任' },
  ],
  // 副部省级（rank 10-11）省委常委会13人
  10: [
    { key: 'prov_party_sec',   label: '省委书记' },
    { key: 'prov_gov',         label: '省长' },
    { key: 'prov_full_vice',   label: '专职省委副书记' },
    { key: 'prov_discipline',  label: '省纪委书记' },
    { key: 'prov_org',         label: '省委组织部长' },
    { key: 'prov_prop',        label: '省委宣传部长' },
    { key: 'prov_legal',       label: '省委政法委书记' },
    { key: 'prov_exec_vice',   label: '常务副省长', isPlayerRole: true },
    { key: 'prov_united',      label: '省委统战部长' },
    { key: 'prov_sec_gen',     label: '省委秘书长' },
    { key: 'prov_armed',       label: '省军区政委' },
    { key: 'prov_vice2',       label: '省委副书记' },
    { key: 'prov_npc',         label: '议政院常委会主任' },
  ],
  11: [
    { key: 'prov_party_sec',   label: '省委书记', isPlayerRole: true },
    { key: 'prov_gov',         label: '省长' },
    { key: 'prov_full_vice',   label: '专职省委副书记' },
    { key: 'prov_discipline',  label: '省纪委书记' },
    { key: 'prov_org',         label: '省委组织部长' },
    { key: 'prov_prop',        label: '省委宣传部长' },
    { key: 'prov_legal',       label: '省委政法委书记' },
    { key: 'prov_exec_vice',   label: '常务副省长' },
    { key: 'prov_united',      label: '省委统战部长' },
    { key: 'prov_sec_gen',     label: '省委秘书长' },
    { key: 'prov_armed',       label: '省军区政委' },
    { key: 'prov_vice2',       label: '省委副书记' },
    { key: 'prov_npc',         label: '议政院常委会主任' },
  ],
  // 正部省级（rank 12-13）部党委常委会9人
  12: [
    { key: 'min_sec',          label: '部党委书记（部长）', isPlayerRole: true },
    { key: 'min_exec_vice',    label: '常务副部长' },
    { key: 'min_vice1',        label: '副部长1' },
    { key: 'min_vice2',        label: '副部长2' },
    { key: 'min_discipline',   label: '纪检组长' },
    { key: 'min_asst1',        label: '部长助理' },
    { key: 'min_party',        label: '机关党委书记' },
    { key: 'min_expert',       label: '总工程师' },
    { key: 'min_policy',       label: '政研室主任' },
  ],
  13: [
    { key: 'sc_vice_pm',       label: '国政院副院理', isPlayerRole: true },
    { key: 'sc_pm',            label: '国政院院理' },
    { key: 'sc_exec_vice',     label: '常务副院理' },
    { key: 'sc_vice2',         label: '国政院副院理2' },
    { key: 'sc_sec_gen',       label: '国政院秘书长' },
    { key: 'sc_state1',        label: '国政委员1' },
    { key: 'sc_state2',        label: '国政委员2' },
  ],
  // 国家级（rank 14-15）中枢决策常委会7人
  14: [
    { key: 'sc_pm',            label: '国政院院理', isPlayerRole: true },
    { key: 'psc_general_sec',  label: '总执书记' },
    { key: 'psc_npc',          label: '全国议政院议政委员长' },
    { key: 'psc_cppcc',        label: '全国参政院主席' },
    { key: 'psc_discipline',   label: '中枢纪委书记' },
    { key: 'psc_exec_vice',    label: '常务副院理' },
    { key: 'psc_secretariat',  label: '中枢书记处书记' },
  ],
  15: [
    { key: 'psc_general_sec',  label: '总执书记', isPlayerRole: true },
    { key: 'psc_pm',           label: '国政院院理' },
    { key: 'psc_npc',          label: '全国议政院议政委员长' },
    { key: 'psc_cppcc',        label: '全国参政院主席' },
    { key: 'psc_discipline',   label: '中枢纪委书记' },
    { key: 'psc_exec_vice',    label: '常务副院理' },
    { key: 'psc_secretariat',  label: '中枢书记处书记' },
  ],
};

// ─── 政府班子职位配置（按玩家rank层级）─────────────────────────────────────
// 政府由议政院产生，正职须经议政院全会选举，副职经议政院常委会任命
export const GOVT_POSITIONS: Record<number, BandPositionDef[]> = {
  // 乡镇（rank 1-3）政府班子：镇长+副镇长
  1: [
    { key: 'town_mayor_gov',       label: '镇长' },
    { key: 'town_exec_vice_gov',   label: '常务副镇长' },
    { key: 'town_vice1_gov',       label: '副镇长（分管民政）' },
    { key: 'town_vice2_gov',       label: '副镇长（分管经济）' },
  ],
  2: [
    { key: 'town_mayor_gov',       label: '镇长' },
    { key: 'town_exec_vice_gov',   label: '常务副镇长' },
    { key: 'town_vice1_gov',       label: '副镇长（分管民政）' },
    { key: 'town_vice2_gov',       label: '副镇长（分管经济）' },
  ],
  3: [
    { key: 'town_mayor_gov',       label: '镇长', isPlayerRole: true },
    { key: 'town_exec_vice_gov',   label: '常务副镇长' },
    { key: 'town_vice1_gov',       label: '副镇长（分管民政）' },
    { key: 'town_vice2_gov',       label: '副镇长（分管经济）' },
  ],
  // 县级（rank 4-6）政府班子：县长+4-5名副县长
  4: [
    { key: 'county_mayor_gov',      label: '县长' },
    { key: 'county_exec_vice_gov',  label: '常务副县长', isPlayerRole: true },
    { key: 'county_vice1_gov',      label: '副县长（分管农业）' },
    { key: 'county_vice2_gov',      label: '副县长（分管工业）' },
    { key: 'county_vice3_gov',      label: '副县长（分管民政教育）' },
    { key: 'county_vice4_gov',      label: '副县长（分管政法）' },
  ],
  5: [
    { key: 'county_mayor_gov',      label: '县长', isPlayerRole: true },
    { key: 'county_exec_vice_gov',  label: '常务副县长' },
    { key: 'county_vice1_gov',      label: '副县长（分管农业）' },
    { key: 'county_vice2_gov',      label: '副县长（分管工业）' },
    { key: 'county_vice3_gov',      label: '副县长（分管民政教育）' },
    { key: 'county_vice4_gov',      label: '副县长（分管政法）' },
  ],
  6: [
    { key: 'county_mayor_gov',      label: '县长' },
    { key: 'county_exec_vice_gov',  label: '常务副县长' },
    { key: 'county_vice1_gov',      label: '副县长（分管农业）' },
    { key: 'county_vice2_gov',      label: '副县长（分管工业）' },
    { key: 'county_vice3_gov',      label: '副县长（分管民政教育）' },
    { key: 'county_vice4_gov',      label: '副县长（分管政法）' },
  ],
  // 地市级（rank 7-9）政府班子：市长+6名副市长
  7: [
    { key: 'city_mayor_gov',        label: '市长' },
    { key: 'city_exec_vice_gov',    label: '常务副市长', isPlayerRole: true },
    { key: 'city_vice1_gov',        label: '副市长（分管经济）' },
    { key: 'city_vice2_gov',        label: '副市长（分管城建）' },
    { key: 'city_vice3_gov',        label: '副市长（分管农业）' },
    { key: 'city_vice4_gov',        label: '副市长（分管教科文卫）' },
    { key: 'city_vice5_gov',        label: '副市长（分管政法安全）' },
  ],
  8: [
    { key: 'city_mayor_gov',        label: '市长', isPlayerRole: true },
    { key: 'city_exec_vice_gov',    label: '常务副市长' },
    { key: 'city_vice1_gov',        label: '副市长（分管经济）' },
    { key: 'city_vice2_gov',        label: '副市长（分管城建）' },
    { key: 'city_vice3_gov',        label: '副市长（分管农业）' },
    { key: 'city_vice4_gov',        label: '副市长（分管教科文卫）' },
    { key: 'city_vice5_gov',        label: '副市长（分管政法安全）' },
  ],
  9: [
    { key: 'city_mayor_gov',        label: '市长' },
    { key: 'city_exec_vice_gov',    label: '常务副市长' },
    { key: 'city_vice1_gov',        label: '副市长（分管经济）' },
    { key: 'city_vice2_gov',        label: '副市长（分管城建）' },
    { key: 'city_vice3_gov',        label: '副市长（分管农业）' },
    { key: 'city_vice4_gov',        label: '副市长（分管教科文卫）' },
    { key: 'city_vice5_gov',        label: '副市长（分管政法安全）' },
  ],
  // 省级（rank 10-11）政府班子：省长+7名副省长
  10: [
    { key: 'prov_gov_gov',          label: '省长' },
    { key: 'prov_exec_vice_gov',    label: '常务副省长', isPlayerRole: true },
    { key: 'prov_vice1_gov',        label: '副省长（分管经济）' },
    { key: 'prov_vice2_gov',        label: '副省长（分管农业农村）' },
    { key: 'prov_vice3_gov',        label: '副省长（分管科教文卫）' },
    { key: 'prov_vice4_gov',        label: '副省长（分管工业投资）' },
    { key: 'prov_vice5_gov',        label: '副省长（分管民政法制）' },
    { key: 'prov_vice6_gov',        label: '副省长（分管生态环保）' },
  ],
  11: [
    { key: 'prov_gov_gov',          label: '省长' },
    { key: 'prov_exec_vice_gov',    label: '常务副省长' },
    { key: 'prov_vice1_gov',        label: '副省长（分管经济）' },
    { key: 'prov_vice2_gov',        label: '副省长（分管农业农村）' },
    { key: 'prov_vice3_gov',        label: '副省长（分管科教文卫）' },
    { key: 'prov_vice4_gov',        label: '副省长（分管工业投资）' },
    { key: 'prov_vice5_gov',        label: '副省长（分管民政法制）' },
    { key: 'prov_vice6_gov',        label: '副省长（分管生态环保）' },
  ],
  // 国家级（rank 12-15）
  12: [
    { key: 'sc_pm_gov',             label: '国政院院理', isPlayerRole: true },
    { key: 'sc_exec_vice_gov',      label: '常务副院理' },
    { key: 'sc_vice1_gov',          label: '国政院副院理（分管经济）' },
    { key: 'sc_vice2_gov',          label: '国政院副院理（分管农业）' },
    { key: 'sc_state1_gov',         label: '国政委员（分管外事）' },
    { key: 'sc_state2_gov',         label: '国政委员（分管公安）' },
    { key: 'sc_secgen_gov',         label: '国政院秘书长' },
  ],
  13: [
    { key: 'sc_pm_gov',             label: '国政院院理' },
    { key: 'sc_exec_vice_gov',      label: '常务副院理' },
    { key: 'sc_vice1_gov',          label: '国政院副院理（分管经济）' },
    { key: 'sc_vice2_gov',          label: '国政院副院理（分管农业）' },
    { key: 'sc_state1_gov',         label: '国政委员（分管外事）' },
    { key: 'sc_state2_gov',         label: '国政委员（分管公安）' },
    { key: 'sc_secgen_gov',         label: '国政院秘书长' },
  ],
  14: [
    { key: 'sc_pm_gov',             label: '国政院院理', isPlayerRole: true },
    { key: 'sc_exec_vice_gov',      label: '常务副院理' },
    { key: 'sc_vice1_gov',          label: '国政院副院理（分管经济）' },
    { key: 'sc_vice2_gov',          label: '国政院副院理（分管农业）' },
    { key: 'sc_state1_gov',         label: '国政委员（分管外事）' },
    { key: 'sc_state2_gov',         label: '国政委员（分管公安）' },
    { key: 'sc_secgen_gov',         label: '国政院秘书长' },
  ],
  15: [
    { key: 'sc_pm_gov',             label: '国政院院理' },
    { key: 'sc_exec_vice_gov',      label: '常务副院理' },
    { key: 'sc_vice1_gov',          label: '国政院副院理（分管经济）' },
    { key: 'sc_vice2_gov',          label: '国政院副院理（分管农业）' },
    { key: 'sc_state1_gov',         label: '国政委员（分管外事）' },
    { key: 'sc_state2_gov',         label: '国政委员（分管公安）' },
    { key: 'sc_secgen_gov',         label: '国政院秘书长' },
  ],
};

// ─── 议政院班子职位配置（按玩家rank层级）─────────────────────────────────────
// 议政院常委会成员：主任1名、副主任若干、秘书长1名
export const NDA_POSITIONS: Record<number, BandPositionDef[]> = {
  // 乡镇（rank 1-3）：镇议政院主席团
  1: [
    { key: 'town_nda_chair',    label: '镇议政院主席' },
    { key: 'town_nda_vice1',    label: '镇议政院副主席' },
  ],
  2: [
    { key: 'town_nda_chair',    label: '镇议政院主席' },
    { key: 'town_nda_vice1',    label: '镇议政院副主席' },
  ],
  3: [
    { key: 'town_nda_chair',    label: '镇议政院主席' },
    { key: 'town_nda_vice1',    label: '镇议政院副主席' },
  ],
  // 县级（rank 4-6）：县议政院常委会
  4: [
    { key: 'county_nda_chair',  label: '县议政院常委会主任' },
    { key: 'county_nda_vice1',  label: '县议政院常委会副主任1' },
    { key: 'county_nda_vice2',  label: '县议政院常委会副主任2' },
    { key: 'county_nda_secgen', label: '县议政院常委会秘书长' },
  ],
  5: [
    { key: 'county_nda_chair',  label: '县议政院常委会主任' },
    { key: 'county_nda_vice1',  label: '县议政院常委会副主任1' },
    { key: 'county_nda_vice2',  label: '县议政院常委会副主任2' },
    { key: 'county_nda_secgen', label: '县议政院常委会秘书长' },
  ],
  6: [
    { key: 'county_nda_chair',  label: '县议政院常委会主任' },
    { key: 'county_nda_vice1',  label: '县议政院常委会副主任1' },
    { key: 'county_nda_vice2',  label: '县议政院常委会副主任2' },
    { key: 'county_nda_secgen', label: '县议政院常委会秘书长' },
  ],
  // 地市级（rank 7-9）：市议政院常委会
  7: [
    { key: 'city_nda_chair',    label: '市议政院常委会主任' },
    { key: 'city_nda_vice1',    label: '市议政院常委会副主任1' },
    { key: 'city_nda_vice2',    label: '市议政院常委会副主任2' },
    { key: 'city_nda_vice3',    label: '市议政院常委会副主任3' },
    { key: 'city_nda_secgen',   label: '市议政院常委会秘书长' },
  ],
  8: [
    { key: 'city_nda_chair',    label: '市议政院常委会主任' },
    { key: 'city_nda_vice1',    label: '市议政院常委会副主任1' },
    { key: 'city_nda_vice2',    label: '市议政院常委会副主任2' },
    { key: 'city_nda_vice3',    label: '市议政院常委会副主任3' },
    { key: 'city_nda_secgen',   label: '市议政院常委会秘书长' },
  ],
  9: [
    { key: 'city_nda_chair',    label: '市议政院常委会主任' },
    { key: 'city_nda_vice1',    label: '市议政院常委会副主任1' },
    { key: 'city_nda_vice2',    label: '市议政院常委会副主任2' },
    { key: 'city_nda_vice3',    label: '市议政院常委会副主任3' },
    { key: 'city_nda_secgen',   label: '市议政院常委会秘书长' },
  ],
  // 省级（rank 10-11）：省议政院常委会
  10: [
    { key: 'prov_nda_chair',    label: '省议政院常委会主任' },
    { key: 'prov_nda_vice1',    label: '省议政院常委会副主任1' },
    { key: 'prov_nda_vice2',    label: '省议政院常委会副主任2' },
    { key: 'prov_nda_vice3',    label: '省议政院常委会副主任3' },
    { key: 'prov_nda_vice4',    label: '省议政院常委会副主任4' },
    { key: 'prov_nda_secgen',   label: '省议政院常委会秘书长' },
  ],
  11: [
    { key: 'prov_nda_chair',    label: '省议政院常委会主任' },
    { key: 'prov_nda_vice1',    label: '省议政院常委会副主任1' },
    { key: 'prov_nda_vice2',    label: '省议政院常委会副主任2' },
    { key: 'prov_nda_vice3',    label: '省议政院常委会副主任3' },
    { key: 'prov_nda_vice4',    label: '省议政院常委会副主任4' },
    { key: 'prov_nda_secgen',   label: '省议政院常委会秘书长' },
  ],
  // 全国（rank 12-15）
  12: [
    { key: 'npc_chair',         label: '全国议政院常委会议政委员长' },
    { key: 'npc_vice1',         label: '全国议政院常委会副议政委员长1' },
    { key: 'npc_vice2',         label: '全国议政院常委会副议政委员长2' },
    { key: 'npc_vice3',         label: '全国议政院常委会副议政委员长3' },
    { key: 'npc_secgen',        label: '全国议政院常委会秘书长' },
  ],
  13: [
    { key: 'npc_chair',         label: '全国议政院常委会议政委员长' },
    { key: 'npc_vice1',         label: '全国议政院常委会副议政委员长1' },
    { key: 'npc_vice2',         label: '全国议政院常委会副议政委员长2' },
    { key: 'npc_vice3',         label: '全国议政院常委会副议政委员长3' },
    { key: 'npc_secgen',        label: '全国议政院常委会秘书长' },
  ],
  14: [
    { key: 'npc_chair',         label: '全国议政院常委会议政委员长', isPlayerRole: true },
    { key: 'npc_vice1',         label: '全国议政院常委会副议政委员长1' },
    { key: 'npc_vice2',         label: '全国议政院常委会副议政委员长2' },
    { key: 'npc_vice3',         label: '全国议政院常委会副议政委员长3' },
    { key: 'npc_secgen',        label: '全国议政院常委会秘书长' },
  ],
  15: [
    { key: 'npc_chair',         label: '全国议政院常委会议政委员长' },
    { key: 'npc_vice1',         label: '全国议政院常委会副议政委员长1' },
    { key: 'npc_vice2',         label: '全国议政院常委会副议政委员长2' },
    { key: 'npc_vice3',         label: '全国议政院常委会副议政委员长3' },
    { key: 'npc_secgen',        label: '全国议政院常委会秘书长' },
  ],
};

// =====================================================================
// ★ 大学名单 & 出生地数据
// =====================================================================

/** 全国31个省级行政区（含直辖市），值为[省名, [代表城市/县]] */
export const PROVINCE_CITY_MAP: Record<string, string[]> = {
  '北京市':   ['海淀区', '朝阳区', '丰台区', '顺义区', '昌平区', '大兴区', '通州区', '怀柔区'],
  '天津市':   ['和平区', '南开区', '河西区', '滨海新区', '武清区', '宝坻区', '蓟州区'],
  '河北省':   ['石家庄市', '保定市', '唐山市', '廊坊市', '邯郸市', '邢台市', '张家口市', '承德市', '沧州市', '衡水市', '秦皇岛市'],
  '山西省':   ['太原市', '大同市', '长治市', '运城市', '临汾市', '晋中市', '朔州市', '忻州市'],
  '内蒙古自治区': ['呼和浩特市', '包头市', '赤峰市', '通辽市', '鄂尔多斯市', '呼伦贝尔市', '巴彦淖尔市'],
  '辽宁省':   ['沈阳市', '大连市', '鞍山市', '抚顺市', '本溪市', '丹东市', '锦州市', '营口市', '辽阳市'],
  '吉林省':   ['长春市', '吉林市', '四平市', '通化市', '白山市', '延边朝鲜族自治州', '松原市'],
  '黑龙江省': ['哈尔滨市', '齐齐哈尔市', '大庆市', '牡丹江市', '佳木斯市', '绥化市', '鸡西市'],
  '上海市':   ['黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '杨浦区', '浦东新区', '闵行区', '宝山区'],
  '江苏省':   ['南京市', '苏州市', '无锡市', '南通市', '常州市', '镇江市', '扬州市', '盐城市', '徐州市', '淮安市', '连云港市'],
  '浙江省':   ['杭州市', '宁波市', '温州市', '绍兴市', '嘉兴市', '湖州市', '金华市', '台州市', '丽水市', '衢州市'],
  '安徽省':   ['合肥市', '芜湖市', '马鞍山市', '安庆市', '蚌埠市', '淮南市', '阜阳市', '宣城市', '滁州市', '黄山市'],
  '福建省':   ['福州市', '厦门市', '泉州市', '漳州市', '莆田市', '三明市', '南平市', '龙岩市', '宁德市'],
  '江西省':   ['南昌市', '赣州市', '吉安市', '宜春市', '上饶市', '景德镇市', '九江市', '萍乡市', '新余市', '宁都县', '抚州市'],
  '山东省':   ['济南市', '青岛市', '烟台市', '潍坊市', '临沂市', '济宁市', '淄博市', '威海市', '东营市', '泰安市'],
  '河南省':   ['郑州市', '洛阳市', '开封市', '南阳市', '新乡市', '信阳市', '驻马店市', '安阳市', '焦作市', '许昌市'],
  '湖北省':   ['武汉市', '宜昌市', '襄阳市', '荆州市', '荆门市', '黄冈市', '孝感市', '黄石市', '十堰市', '恩施土家族苗族自治州'],
  '湖南省':   ['长沙市', '株洲市', '湘潭市', '衡阳市', '邵阳市', '岳阳市', '常德市', '益阳市', '娄底市', '郴州市', '永州市'],
  '广东省':   ['广州市', '深圳市', '佛山市', '东莞市', '珠海市', '惠州市', '汕头市', '中山市', '江门市', '梅州市', '潮州市'],
  '广西壮族自治区': ['南宁市', '桂林市', '柳州市', '梧州市', '北海市', '玉林市', '贺州市', '钦州市', '百色市'],
  '海南省':   ['海口市', '三亚市', '儋州市', '文昌市', '琼海市', '万宁市'],
  '重庆市':   ['渝中区', '江北区', '南岸区', '渝北区', '璧山区', '巴南区', '九龙坡区', '合川区', '永川区', '涪陵区'],
  '四川省':   ['成都市', '绵阳市', '德阳市', '宜宾市', '南充市', '达州市', '泸州市', '自贡市', '攀枝花市', '广元市', '遂宁市'],
  '贵州省':   ['贵阳市', '遵义市', '毕节市', '六盘水市', '安顺市', '铜仁市', '黔南布依族苗族自治州'],
  '云南省':   ['昆明市', '曲靖市', '大理白族自治州', '红河哈尼族彝族自治州', '文山壮族苗族自治州', '玉溪市', '楚雄彝族自治州', '保山市'],
  '西藏自治区': ['拉萨市', '日喀则市', '林芝市', '山南市', '昌都市'],
  '陕西省':   ['西安市', '宝鸡市', '咸阳市', '渭南市', '延安市', '汉中市', '榆林市', '安康市'],
  '甘肃省':   ['兰州市', '天水市', '武威市', '张掖市', '酒泉市', '定西市', '庆阳市', '平凉市'],
  '青海省':   ['西宁市', '海东市', '海西蒙古族藏族自治州', '海北藏族自治州', '玉树藏族自治州'],
  '宁夏回族自治区': ['银川市', '石嘴山市', '吴忠市', '固原市', '中卫市'],
  '新疆维吾尔自治区': ['乌鲁木齐市', '喀什地区', '伊犁哈萨克自治州', '昌吉回族自治州', '巴音郭楞蒙古自治州', '阿克苏地区'],
};

export const PROVINCE_LIST = Object.keys(PROVINCE_CITY_MAP);

/** 随机取出生地 */
export function randBirthPlace(): { province: string; city: string } {
  const provinces = PROVINCE_LIST;
  const province = provinces[Math.floor(Math.random() * provinces.length)];
  const cities = PROVINCE_CITY_MAP[province]!;
  const city = cities[Math.floor(Math.random() * cities.length)];
  return { province, city };
}

// 真实风格镇名前缀（40个，供随机生成起始镇）
const _REAL_TOWN_PREFIXES = [
  '清河', '兴华', '龙泉', '南湖', '北溪', '桃源', '柳林', '石桥', '金沙', '铜山',
  '梅岭', '凤凰', '荷花', '莲湖', '白云', '青山', '新兴', '永安', '兴隆', '平原',
  '东风', '红星', '向阳', '太平', '广济', '福安', '长寿', '大同', '永丰', '富民',
  '天马', '玉泉', '惠民', '安平', '通达', '望江', '临江', '泉山', '宝兴', '瑞云',
];

/**
 * 随机生成一个真实省市+镇的起始地名
 * 格式：xx省xx市xx镇
 */
export function randRealStartTown(): string {
  const province = PROVINCE_LIST[Math.floor(Math.random() * PROVINCE_LIST.length)];
  const cities = PROVINCE_CITY_MAP[province]!;
  const city = cities[Math.floor(Math.random() * cities.length)];
  const prefix = _REAL_TOWN_PREFIXES[Math.floor(Math.random() * _REAL_TOWN_PREFIXES.length)];
  return `${province}${city}${prefix}镇`;
}

/** 根据指定籍贯省市生成起始镇名（用于角色创建后同步开局地点） */
export function randRealStartTownByProvCity(province: string, city: string): string {
  // 省份校验：如果传入省份不在列表中则随机降级
  const validProv = PROVINCE_LIST.includes(province) ? province : PROVINCE_LIST[Math.floor(Math.random() * PROVINCE_LIST.length)];
  const cities = PROVINCE_CITY_MAP[validProv] ?? [];
  // 城市校验：如果传入城市不在该省列表中则随机选一个
  const validCity = cities.includes(city) ? city : cities[Math.floor(Math.random() * cities.length)] ?? city;
  const prefix = _REAL_TOWN_PREFIXES[Math.floor(Math.random() * _REAL_TOWN_PREFIXES.length)];
  return `${validProv}${validCity}${prefix}镇`;
}

// ── 985大学（38所）──
export const UNIVERSITY_985: string[] = [
  '清华大学', '北京大学', '浙江大学', '复旦大学', '上海交通大学',
  '南京大学', '中国科学技术大学', '哈尔滨工业大学', '西安交通大学',
  '北京航空航天大学', '北京理工大学', '中国人民大学', '中山大学',
  '华中科技大学', '武汉大学', '四川大学', '同济大学', '南开大学',
  '天津大学', '厦门大学', '山东大学', '中南大学', '吉林大学',
  '大连理工大学', '华南理工大学', '重庆大学', '湖南大学', '兰州大学',
  '电子科技大学', '东北大学', '东南大学', '北京师范大学', '中国农业大学',
  '国防科技大学', '西北工业大学', '中国海洋大学', '中央民族大学', '华东师范大学',
];

// ── 211大学（非985，约73所代表性院校）──
export const UNIVERSITY_211: string[] = [
  '北京交通大学', '北京工业大学', '北京化工大学', '北京邮电大学',
  '北京林业大学', '中国传媒大学', '对外经济贸易大学', '中央财经大学',
  '中国政法大学', '华北电力大学', '南京航空航天大学', '南京理工大学',
  '河海大学', '江南大学', '苏州大学', '南京师范大学',
  '合肥工业大学', '福州大学', '南昌大学', '郑州大学', '武汉理工大学',
  '华中农业大学', '华中师范大学', '中南财经政法大学', '中国地质大学（武汉）',
  '湘潭大学', '广西大学', '海南大学', '贵州大学', '云南大学',
  '西北农林科技大学', '陕西师范大学', '新疆大学', '内蒙古大学',
  '延边大学', '西藏大学', '青海大学', '宁夏大学',
  '太原理工大学', '辽宁大学', '大连海事大学', '东北农业大学', '东北林业大学',
  '上海大学', '上海财经大学', '华东理工大学', '东华大学',
  '浙江工业大学', '安徽大学', '中国矿业大学', '中国石油大学（华东）',
  '暨南大学', '华南师范大学', '深圳大学', '广州大学',
  '四川农业大学', '重庆医科大学', '贵州医科大学',
  '哈尔滨工程大学', '长安大学', '西南大学', '西南财经大学',
  '西南交通大学', '西北大学', '西安电子科技大学',
  '中国海洋大学（青岛）', '山东农业大学', '中国石油大学（北京）',
  '北京科技大学', '首都经济贸易大学', '北京外国语大学',
];

// ── 普通本科（代表性院校名）──
export const UNIVERSITY_NORMAL: string[] = [
  '河北大学', '山西大学', '内蒙古师范大学', '沈阳大学', '长春大学',
  '哈尔滨学院', '苏州科技大学', '安徽工业大学', '赣南师范大学', '烟台大学',
  '中原工学院', '湖北工业大学', '湖南科技大学', '广东工业大学', '广西师范大学',
  '海南师范大学', '重庆工商大学', '贵州师范大学', '云南师范大学',
  '西安工业大学', '兰州交通大学', '青海师范大学', '宁夏医科大学',
  '新疆师范大学', '桂林电子科技大学', '南京工业大学', '浙江工商大学',
  '上海工程技术大学', '天津师范大学', '石家庄铁道大学', '山东理工大学',
  '福建农林大学', '江西理工大学', '湖南农业大学', '广西财经学院',
  '四川理工学院', '西华大学', '昆明理工大学', '兰州理工大学',
];

// ── 专科院校（随机后缀生成模板）──
export const UNIVERSITY_ZHUANKE_SUFFIXES: string[] = [
  '职业技术学院', '职业学院', '技术学院', '工程职业学院',
  '财经职业学院', '医学高等专科学校', '农业职业技术学院', '旅游职业学院',
];

/** 按学校类型返回大学名（DegreeType × school级别） */
export function pickUniversityName(schoolTier: '985' | '211' | '普通本科' | '大专', province?: string): string {
  if (schoolTier === '985') {
    // 40%概率清北，60%随机985
    if (Math.random() < 0.4) return Math.random() < 0.5 ? '清华大学' : '北京大学';
    return UNIVERSITY_985[Math.floor(Math.random() * UNIVERSITY_985.length)];
  }
  if (schoolTier === '211') {
    return UNIVERSITY_211[Math.floor(Math.random() * UNIVERSITY_211.length)];
  }
  if (schoolTier === '普通本科') {
    return UNIVERSITY_NORMAL[Math.floor(Math.random() * UNIVERSITY_NORMAL.length)];
  }
  // 专科：取省份前缀 + 随机后缀
  const cityNames = province ? (PROVINCE_CITY_MAP[province] ?? []) : [];
  const prefix = cityNames.length > 0
    ? cityNames[Math.floor(Math.random() * cityNames.length)].replace(/市|区|县/, '')
    : ['江南', '淮海', '云岭', '南湖', '桂江'][Math.floor(Math.random() * 5)];
  const suffix = UNIVERSITY_ZHUANKE_SUFFIXES[Math.floor(Math.random() * UNIVERSITY_ZHUANKE_SUFFIXES.length)];
  return prefix + suffix;
}

/** NPC按级别随机分配学历层次（级别越高学历越好） */
export function npcSchoolTier(rankLevel: number): '985' | '211' | '普通本科' | '大专' {
  if (rankLevel >= 12) {
    // 部级以上：70%985，28%211，2%普本
    const r = Math.random();
    if (r < 0.70) return '985';
    if (r < 0.98) return '211';
    return '普通本科';
  }
  if (rankLevel >= 9) {
    // 省部级：40%985，45%211，15%普本
    const r = Math.random();
    if (r < 0.40) return '985';
    if (r < 0.85) return '211';
    return '普通本科';
  }
  if (rankLevel >= 6) {
    // 厅级：20%985，50%211，30%普本
    const r = Math.random();
    if (r < 0.20) return '985';
    if (r < 0.70) return '211';
    return '普通本科';
  }
  if (rankLevel >= 3) {
    // 县处级：8%985，30%211，55%普本，7%专科
    const r = Math.random();
    if (r < 0.08) return '985';
    if (r < 0.38) return '211';
    if (r < 0.93) return '普通本科';
    return '大专';
  }
  // 科级及以下：5%985，15%211，55%普本，25%专科
  const r = Math.random();
  if (r < 0.05) return '985';
  if (r < 0.20) return '211';
  if (r < 0.75) return '普通本科';
  return '大专';
}

/** NPC学历对应学位名称 */
export function npcDegreeLabel(schoolTier: '985' | '211' | '普通本科' | '大专', rankLevel: number): string {
  if (schoolTier === '大专') return '专科';
  if (schoolTier === '985' && rankLevel >= 6) {
    const r = Math.random();
    if (r < 0.50) return '博士';
    if (r < 0.80) return '硕士';
    return '本科';
  }
  if (schoolTier === '211' && rankLevel >= 8) {
    const r = Math.random();
    if (r < 0.25) return '博士';
    if (r < 0.65) return '硕士';
    return '本科';
  }
  const r = Math.random();
  if (r < 0.10) return '博士';
  if (r < 0.35) return '硕士';
  return '本科';
}

// ============ 排行榜类型 ============
export type LeaderboardMetric = 'merit' | 'contribution' | 'rank' | 'power';
export type LeaderboardBoard = 'daily' | 'alltime';
export type LeaderboardScope = 'region' | 'server' | 'faction';
export type LeaderboardMilestone = 'top10' | 'top3' | 'top1';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  saveId: string;
  playerName: string;
  rankLevel: number;
  rankName: string;
  faction: string;
  factionInfluence: number;
  regionCode: string;
  score: number;
  merit: number;
  contribution: number;
  wealth: number;
  students: number;
  isMe?: boolean;
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  myRank: number | null;
  myScore: number;
  prevGap: number | null;
  total: number;
}

export interface PlayerProfile {
  userId: string;
  leaderboardSaveId: string | null;
  leaderboardSaveChangedAt: number;
  regionCode: string;
}

export interface ClaimMilestoneResult {
  success: boolean;
  milestone: string;
  influence: number;
  silver: number;
  extra: string | null;
}
