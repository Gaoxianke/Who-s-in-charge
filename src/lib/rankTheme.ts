/**
 * 职级主题系统
 * 根据 save.rankLevel 动态返回对应行政级别的视觉主题
 *
 * 乡镇级 (1-3)   — 泥土棕 / 稻田绿 / 青砖灰  朴素基层
 * 县处级 (4-7)   — 深藏蓝 / 行政白 / 印章红  公文严肃
 * 市厅级 (8-10)  — 深蓝   / 金线   / 大理石白 城市大气
 * 省部级 (11-13) — 正红   / 深金   / 纯白     威严肃穆
 * 国家级 (14+)   — 中国红 / 国旗金 / 墨黑     庄严神圣
 */
export interface RankTheme {
  // 背景
  pageBg: string;
  headerBg: string;
  headerText: string;
  headerSub: string;
  // 卡片
  cardBg: string;
  cardBorder: string;
  cardAccentBar: string;    // 卡片左侧竖条
  sectionHeaderBg: string;
  sectionHeaderText: string;
  sectionHeaderBorder: string;
  // 主色 & 强调
  primary: string;          // 按钮/高亮主色
  primaryText: string;
  accent: string;           // 强调/印章色
  accentSub: string;        // 强调辅助（金色线条等）
  // 文字
  labelText: string;
  valueText: string;
  mutedText: string;
  // 状态条
  quickStatBg: string;
  quickStatDivider: string;
  // 进度条
  progressBg: string;
  progressFill: string;
  // 数值颜色
  statHigh: string;
  statMid: string;
  statLow: string;
  // 徽章/标签
  badgeBg: string;
  badgeText: string;
  // 装饰
  decorLine: string;        // 红头文件横线 / 金色线条
  decorLineHeight: number;
  rankBanner: string;       // 顶部级别标语
  rankEmoji: string;        // 级别图标
  levelDesc: string;        // 级别描述
  // 特殊横幅（国旗红/公章/等）
  alertBg: string;
  alertBorder: string;
  alertText: string;
  accentBg: string;   // 选中/高亮背景（淡主色）
  // 导航卡片
  navCardBg: string;
  navCardBorder: string;
  navCardBottomBorder: string;
  navCardAccentBg: string;
  navCardAccentBorder: string;
  navCardAccentBottom: string;
  // 状态栏样式
  statusBarStyle: 'light' | 'dark';
}

// ─── 乡镇级 ─────────────────────────────────────────────
const TOWN: RankTheme = {
  pageBg:            '#F4F1EC',
  headerBg:          '#5C4A2A',
  headerText:        '#F5EDD8',
  headerSub:         '#D4C4A0',  // 加亮：原#C9B89A对比度不足
  cardBg:            '#FDFAF5',
  cardBorder:        '#D4C9B0',
  cardAccentBar:     '#9CAF88',
  sectionHeaderBg:   '#EDE6D6',
  sectionHeaderText: '#4A3A1E',  // 加深：原#5C4A2A在浅色背景上更深更清晰
  sectionHeaderBorder: '#C9B89A',
  primary:           '#5A7A4E',  // 加深：原#6B8F5E在浅背景上加深提升对比
  primaryText:       '#FFFFFF',
  accent:            '#C8102E',
  accentSub:         '#7A9E6A',
  labelText:         '#4A3A24',  // 加深：原#6B5A3E
  valueText:         '#2A1E0E',  // 加深：原#3A2E1E
  mutedText:         '#7A6A52',  // 加深：原#9C8B72，提升在浅色背景上的对比度
  quickStatBg:       '#4A3B20',
  quickStatDivider:  'rgba(255,255,255,0.15)',
  progressBg:        '#DDD4C0',
  progressFill:      '#9CAF88',
  statHigh:          '#3A6B2A',  // 加深绿色
  statMid:           '#8B6200',  // 加深黄色
  statLow:           '#C8102E',
  badgeBg:           '#9CAF88',
  badgeText:         '#FFFFFF',
  decorLine:         '#9CAF88',
  decorLineHeight:   2,
  rankBanner:        '乡镇基层干部',
  rankEmoji:         '🌾',
  levelDesc:         '扎根基层，服务人民',
  alertBg:           '#F4EFE4',
  alertBorder:       '#C9B89A',
  alertText:         '#5C4A2A',  // 加深
  accentBg:          '#EDF3E8',
  navCardBg:         '#FDFAF5',
  navCardBorder:     '#D4C9B0',
  navCardBottomBorder: '#9CAF88',
  navCardAccentBg:   '#6B8F5E',
  navCardAccentBorder: '#6B8F5E',
  navCardAccentBottom: '#4A6A40',
  statusBarStyle:    'light',
};

// ─── 县处级 ─────────────────────────────────────────────
const COUNTY: RankTheme = {
  pageBg:            '#F5F4F1',
  headerBg:          '#1E3A5F',
  headerText:        '#FFFFFF',
  headerSub:         '#C8D8EC',  // 加亮：原#A0B4CC在深蓝背景上对比度低
  cardBg:            '#FFFFFF',
  cardBorder:        '#D1D8E0',
  cardAccentBar:     '#1E3A5F',
  sectionHeaderBg:   '#EEF2F7',
  sectionHeaderText: '#0D2240',  // 加深：原#1E3A5F
  sectionHeaderBorder: '#C8102E',
  primary:           '#C8102E',
  primaryText:       '#FFFFFF',
  accent:            '#C8102E',
  accentSub:         '#1E3A5F',
  labelText:         '#2A3A4A',  // 加深：原#4A5568
  valueText:         '#0D1822',  // 加深：原#1A2B3C
  mutedText:         '#4A5E72',  // 加深：原#718096
  quickStatBg:       '#1E3A5F',
  quickStatDivider:  'rgba(255,255,255,0.15)',
  progressBg:        '#E2E8F0',
  progressFill:      '#1E3A5F',
  statHigh:          '#1a6b2a',  // 加深绿
  statMid:           '#A05C00',  // 加深橙
  statLow:           '#C8102E',
  badgeBg:           '#C8102E',
  badgeText:         '#FFFFFF',
  decorLine:         '#C8102E',
  decorLineHeight:   3,
  rankBanner:        '县处级领导干部',
  rankEmoji:         '📋',
  levelDesc:         '主政一县，胸怀全局',
  alertBg:           '#FEF2F2',
  alertBorder:       '#C8102E',
  alertText:         '#7B0C0C',  // 加深
  accentBg:          '#FEF2F2',
  navCardBg:         '#FFFFFF',
  navCardBorder:     '#D8D4CE',
  navCardBottomBorder: '#1E3A5F',
  navCardAccentBg:   '#C8102E',
  navCardAccentBorder: '#C8102E',
  navCardAccentBottom: '#9E1E1E',
  statusBarStyle:    'light',
};

// ─── 市厅级（厅局级，ranks 7-9：副市长/市长/市委书记） ─────────────────────
const CITY: RankTheme = {
  pageBg:            '#F2F4F8',
  headerBg:          '#003366',
  headerText:        '#FFFFFF',
  headerSub:         '#B8D0E8',  // 加亮：原#8AAFD4
  cardBg:            '#FFFFFF',
  cardBorder:        '#C8D8E8',
  cardAccentBar:     '#D4AF37',
  sectionHeaderBg:   '#EBF0F7',
  sectionHeaderText: '#002244',  // 加深：原#003366
  sectionHeaderBorder: '#D4AF37',
  primary:           '#003366',
  primaryText:       '#FFFFFF',
  accent:            '#D4AF37',
  accentSub:         '#003366',
  labelText:         '#2A3C50',  // 加深：原#4A5C70
  valueText:         '#051525',  // 加深：原#0D1F35
  mutedText:         '#3A5065',  // 加深：原#6B7E90
  quickStatBg:       '#012755',
  quickStatDivider:  'rgba(212,175,55,0.3)',
  progressBg:        '#D8E4F0',
  progressFill:      '#D4AF37',
  statHigh:          '#1a6b2a',  // 加深绿
  statMid:           '#8B6200',  // 加深黄
  statLow:           '#C8102E',
  badgeBg:           '#D4AF37',
  badgeText:         '#002244',  // 加深确保可读
  decorLine:         '#D4AF37',
  decorLineHeight:   2,
  rankBanner:        '厅局级领导干部',
  rankEmoji:         '🏙️',
  levelDesc:         '运筹帷幄，城市治理',
  alertBg:           '#FFFBEB',
  alertBorder:       '#D4AF37',
  alertText:         '#6B4000',  // 加深：原#92400E
  accentBg:          '#EBF0F7',
  navCardBg:         '#FFFFFF',
  navCardBorder:     '#C8D8E8',
  navCardBottomBorder: '#D4AF37',
  navCardAccentBg:   '#003366',
  navCardAccentBorder: '#003366',
  navCardAccentBottom: '#001A40',
  statusBarStyle:    'light',
};

// ─── 省部级 ─────────────────────────────────────────────
const PROVINCE: RankTheme = {
  pageBg:            '#FDF8F8',
  headerBg:          '#DE2910',
  headerText:        '#FFFFFF',
  headerSub:         '#FFDDE0',  // 加亮：原#FFCDD2
  cardBg:            '#FFFFFF',
  cardBorder:        '#E8C8C8',
  cardAccentBar:     '#B8860B',
  sectionHeaderBg:   '#FEF2F2',
  sectionHeaderText: '#7B0A0A',  // 加深：原#9B1C1C
  sectionHeaderBorder: '#B8860B',
  primary:           '#DE2910',
  primaryText:       '#FFFFFF',
  accent:            '#B8860B',
  accentSub:         '#DE2910',
  labelText:         '#5A1010',  // 加深：原#6B2020
  valueText:         '#2D0606',  // 加深：原#3D0C0C
  mutedText:         '#7A2A2A',  // 加深：原#9B4040
  quickStatBg:       '#B22000',
  quickStatDivider:  'rgba(255,255,255,0.2)',
  progressBg:        '#F8DCDC',
  progressFill:      '#B8860B',
  statHigh:          '#1a6b2a',
  statMid:           '#8B6200',
  statLow:           '#DE2910',
  badgeBg:           '#B8860B',
  badgeText:         '#FFFFFF',
  decorLine:         '#B8860B',
  decorLineHeight:   3,
  rankBanner:        '省部级领导干部',
  rankEmoji:         '⭐',
  levelDesc:         '一省之政，责任如山',
  alertBg:           '#FFF8E1',
  alertBorder:       '#B8860B',
  alertText:         '#5A3A00',  // 加深：原#7D5A00
  accentBg:          '#FEF2F2',
  navCardBg:         '#FFFFFF',
  navCardBorder:     '#E8C8C8',
  navCardBottomBorder: '#B8860B',
  navCardAccentBg:   '#DE2910',
  navCardAccentBorder: '#DE2910',
  navCardAccentBottom: '#A01F0A',
  statusBarStyle:    'light',
};

// ─── 国家级 ─────────────────────────────────────────────
const NATIONAL: RankTheme = {
  pageBg:            '#1A1A1A',
  headerBg:          '#0D0D0D',
  headerText:        '#FFE08A',
  headerSub:         '#FF8080',  // 加亮：原#CC4444在黑背景上偏暗
  cardBg:            '#242424',
  cardBorder:        '#3A2A0A',
  cardAccentBar:     '#FFDE00',
  sectionHeaderBg:   '#1E1008',
  sectionHeaderText: '#FFE08A',
  sectionHeaderBorder: '#DE2910',
  primary:           '#DE2910',
  primaryText:       '#FFE08A',
  accent:            '#FFDE00',
  accentSub:         '#DE2910',
  labelText:         '#DDB85A',  // 加亮：原#CC9944
  valueText:         '#FFE08A',
  mutedText:         '#B8922A',  // 加亮：原#8B6914在暗背景对比不足
  quickStatBg:       '#0D0D0D',
  quickStatDivider:  'rgba(255,222,0,0.2)',
  progressBg:        '#2A1A00',
  progressFill:      '#FFDE00',
  statHigh:          '#4CAF50',
  statMid:           '#FFDE00',
  statLow:           '#FF5252',  // 加亮：原#DE2910在暗背景上加亮
  badgeBg:           '#FFDE00',
  badgeText:         '#0D0D0D',
  decorLine:         '#FFDE00',
  decorLineHeight:   2,
  rankBanner:        '国家领导人',
  rankEmoji:         '🏛️',
  levelDesc:         '治国理政，人民重托',
  alertBg:           '#1E0800',
  alertBorder:       '#DE2910',
  alertText:         '#FF9A80',  // 加亮：原#FF8A80
  accentBg:          '#1E1008',
  navCardBg:         '#242424',
  navCardBorder:     '#3A2A0A',
  navCardBottomBorder: '#FFDE00',
  navCardAccentBg:   '#DE2910',
  navCardAccentBorder: '#DE2910',
  navCardAccentBottom: '#8B0000',
  statusBarStyle:    'light',
};

/** 根据 rankLevel 返回对应主题
 * 分层依据《公务员法》职级序列：
 *   TOWN     (1-3)  : 乡科级（科员~正科）
 *   COUNTY   (4-6)  : 县处级（副处~正处）
 *   CITY     (7-9)  : 厅局级（副厅~正厅）
 *   PROVINCE (10-12): 省部级（副部~正部）
 *   NATIONAL (13+)  : 国家级（副职/正职/最高）
 */
export function getRankTheme(rankLevel: number): RankTheme {
  if (rankLevel >= 13) return NATIONAL;
  if (rankLevel >= 10) return PROVINCE;
  if (rankLevel >= 7)  return CITY;
  if (rankLevel >= 4)  return COUNTY;
  return TOWN;
}

/** 根据职级返回级别标识色 */
export function getRankColor(rankLevel: number): string {
  if (rankLevel >= 13) return '#DE2910';
  if (rankLevel >= 10) return '#B8860B';
  if (rankLevel >= 7)  return '#D4AF37';
  if (rankLevel >= 4)  return '#1E3A5F';
  return '#6B8F5E';
}
