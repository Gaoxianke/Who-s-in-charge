/**
 * 共享领导人名单工具
 * 基于存档ID生成稳定的领导人名字，全游戏统一使用此模块
 * 保证各功能（领导班子、专线电话、战区管理、省份管理、军委等）名字一致
 */

const MALE_NAMES = [
  '王建国', '李明志', '张伟华', '刘国强', '陈志远', '赵国栋', '孙建平', '周海龙',
  '马志刚', '吴国梁', '郑建军', '韩德政', '冯国庆', '朱建华', '沈志明', '徐国兴',
  '杨志刚', '曾建国', '林海清', '唐明远', '魏德志', '何建平', '高国兴', '谢志远',
  '宋明华', '萧建军', '陆志民', '许国庆', '江德平', '钱明志',
];
const FEMALE_NAMES = [
  '王秀兰', '李玉华', '张敏华', '刘淑华', '陈秀兰', '赵丽萍', '孙燕华', '周慧敏',
];

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = Math.imul(31, h) + s.charCodeAt(i) | 0; }
  return Math.abs(h);
}

function seededName(seed: string, female = false): string {
  const pool = female ? FEMALE_NAMES : MALE_NAMES;
  return pool[hashSeed(seed) % pool.length];
}

// ───────────────────────────────────────────────────
// 顶层核心领导（基于 saveId 生成，全局唯一）
// ───────────────────────────────────────────────────
export function getTopLeaders(saveId: string, playerName = '') {
  const n = (id: string, female = false) => seededName(saveId + id, female);
  return {
    // 七常委
    generalSecretary:   n('genSec'),        // 总执书记
    premier:            playerName || n('premier'),  // 国政院院理（可被玩家替换）
    npcChairman:        n('npcChair'),       // 全国议政院议政委员长
    ccdiBoss:           n('ccdi'),           // 中枢纪委书记
    cppccChair:         n('cppcc'),          // 全国参政院主席
    lawComm:            n('lawComm'),        // 中央政法委书记
    propDept:           n('propDept'),       // 中枢宣传部部长
    // 国政院副院理
    vp1:  n('vp1'),    // 常务副院理
    vp2:  n('vp2'),    // 第二副院理
    vp3:  n('vp3'),    // 第三副院理
    // 国政委员
    sc1:  n('sc1'),
    sc2:  n('sc2'),
    sg:   n('sg'),     // 国政院秘书长
    // 军委副主席
    cmcVp1: n('cmcVp1') + '上将',
    cmcVp2: n('cmcVp2') + '上将',
  };
}

// ───────────────────────────────────────────────────
// 国政院各部委部长（24个部委）
// ───────────────────────────────────────────────────
export const MINISTRY_LEADER_KEYS = [
  { id: 'min_fa',      title: '外交部部长',                  shortTitle: '外交部' },
  { id: 'min_def',     title: '国防部部长',                  shortTitle: '国防部' },
  { id: 'min_ndrc',    title: '国家发展改革委主任',          shortTitle: '发改委' },
  { id: 'min_edu',     title: '教育部部长',                  shortTitle: '教育部' },
  { id: 'min_sci',     title: '科学技术部部长',              shortTitle: '科技部' },
  { id: 'min_miit',    title: '工业和信息化部部长',          shortTitle: '工信部' },
  { id: 'min_mps',     title: '公安部部长',                  shortTitle: '公安部' },
  { id: 'min_mca',     title: '民政部部长',                  shortTitle: '民政部' },
  { id: 'min_moj',     title: '司法部部长',                  shortTitle: '司法部' },
  { id: 'min_mof',     title: '财政部部长',                  shortTitle: '财政部' },
  { id: 'min_mohrss',  title: '人力资源和社会保障部部长',    shortTitle: '人社部' },
  { id: 'min_mnr',     title: '自然资源部部长',              shortTitle: '自然资源部' },
  { id: 'min_mee',     title: '生态环境部部长',              shortTitle: '生态环境部' },
  { id: 'min_mohurd',  title: '住房和城乡建设部部长',        shortTitle: '住建部' },
  { id: 'min_mot',     title: '交通运输部部长',              shortTitle: '交通运输部' },
  { id: 'min_mwr',     title: '水利部部长',                  shortTitle: '水利部' },
  { id: 'min_moa',     title: '农业农村部部长',              shortTitle: '农业农村部' },
  { id: 'min_mofcom',  title: '商务部部长',                  shortTitle: '商务部' },
  { id: 'min_mct',     title: '文化和旅游部部长',            shortTitle: '文旅部' },
  { id: 'min_nhc',     title: '国家卫生健康委员会主任',      shortTitle: '卫健委' },
  { id: 'min_mem',     title: '应急管理部部长',              shortTitle: '应急管理部' },
  { id: 'min_audit',   title: '审计署审计长',                shortTitle: '审计署' },
  { id: 'min_org',     title: '中枢组织部部长',              shortTitle: '中枢组部' },
  { id: 'min_united',  title: '中枢统战部部长',              shortTitle: '统战部' },
] as const;

export function getMinistryLeaders(saveId: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const m of MINISTRY_LEADER_KEYS) {
    result[m.id] = seededName(saveId + m.id);
    result[m.shortTitle] = result[m.id];
    result[m.title] = result[m.id];
  }
  return result;
}

// ───────────────────────────────────────────────────
// 省委书记 & 省长（24个省/直辖市/自治区）
// ───────────────────────────────────────────────────
export const PROVINCE_LIST = [
  '北京', '天津', '上海', '重庆',
  '广东', '浙江', '江苏', '山东',
  '四川', '河南', '湖北', '湖南',
  '河北', '安徽', '福建', '陕西',
  '黑龙江', '吉林', '辽宁', '内蒙古',
  '广西', '云南', '贵州', '新疆',
] as const;

export type ProvinceName = typeof PROVINCE_LIST[number];

export function getProvinceLeaders(saveId: string): Record<string, { secretary: string; governor: string }> {
  const result: Record<string, { secretary: string; governor: string }> = {};
  PROVINCE_LIST.forEach((prov, i) => {
    result[prov] = {
      secretary: seededName(saveId + 'pbs_' + i),
      governor:  seededName(saveId + 'pgv_' + i),
    };
  });
  return result;
}

// ───────────────────────────────────────────────────
// 军委委员 & 各战区司令/政委
// ───────────────────────────────────────────────────
export const THEATER_LIST = [
  { id: 'east',   name: '东部战区',   location: '南京',   emoji: '⚔️' },
  { id: 'south',  name: '南部战区',   location: '广州',   emoji: '🌊' },
  { id: 'west',   name: '西部战区',   location: '成都',   emoji: '🏔️' },
  { id: 'north',  name: '北部战区',   location: '沈阳',   emoji: '❄️' },
  { id: 'center', name: '中部战区',   location: '北京',   emoji: '🏯' },
] as const;

export function getTheaterLeaders(saveId: string): Record<string, { commander: string; commissar: string }> {
  const result: Record<string, { commander: string; commissar: string }> = {};
  THEATER_LIST.forEach(t => {
    result[t.id] = {
      commander: seededName(saveId + 'tc_' + t.id) + '上将',
      commissar: seededName(saveId + 'tp_' + t.id) + '上将',
    };
  });
  return result;
}

// ───────────────────────────────────────────────────
// 快捷获取：专线电话对象（副院理/部长/省委书记）
// ───────────────────────────────────────────────────
export interface HotlineEntry {
  id: string;
  name: string;
  title: string;
  org: string;
  level: number;
  icon: string;
}

export function getHotlineTargets(saveId: string): HotlineEntry[] {
  const top = getTopLeaders(saveId);
  const prov = getProvinceLeaders(saveId);
  const mins = getMinistryLeaders(saveId);

  return [
    { id: 'vp1', name: top.vp1,  title: '国政院常务副院理', org: '国政院', level: 13, icon: '🏛️' },
    { id: 'vp2', name: top.vp2,  title: '国政院副院理（二）', org: '国政院', level: 13, icon: '🏛️' },
    { id: 'vp3', name: top.vp3,  title: '国政院副院理（三）', org: '国政院', level: 13, icon: '🏛️' },
    { id: 'm1',  name: mins['min_mof'],    title: '财政部部长',  org: '财政部', level: 12, icon: '💰' },
    { id: 'm2',  name: mins['min_fa'],     title: '外交部部长',  org: '外交部', level: 12, icon: '🌐' },
    { id: 'm3',  name: mins['min_miit'],   title: '工信部部长',  org: '工信部', level: 12, icon: '🏭' },
    { id: 'm4',  name: mins['min_mps'],    title: '公安部部长',  org: '公安部', level: 12, icon: '🛡️' },
    { id: 'm5',  name: mins['min_ndrc'],   title: '发改委主任',  org: '发改委', level: 12, icon: '📊' },
    { id: 'p1',  name: prov['广东'].secretary, title: '广东省委书记', org: '广东省', level: 11, icon: '🗺️' },
    { id: 'p2',  name: prov['浙江'].secretary, title: '浙江省委书记', org: '浙江省', level: 11, icon: '🗺️' },
    { id: 'p3',  name: prov['江苏'].secretary, title: '江苏省委书记', org: '江苏省', level: 11, icon: '🗺️' },
    { id: 'p4',  name: prov['北京'].secretary, title: '北京市委书记', org: '北京市', level: 11, icon: '🗺️' },
    { id: 'p5',  name: prov['上海'].secretary, title: '上海市委书记', org: '上海市', level: 11, icon: '🗺️' },
  ];
}
