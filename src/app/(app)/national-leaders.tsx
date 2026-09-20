// 领导人档案页 — 分级查阅：
//   · 所有级别均可查阅国家领导人 + 全国省份领导班子
//   · 镇级(1-3)额外看县级领导 / 县级(4-6)额外看市级 / 市级(7-9)额外看省级领导
//   · 每位领导人均有随机生成的仕途档案可展开查阅
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getAvatarImageUrl } from '@/types/game';

// ──────────────────────────────────────────────────────────
//  NPC 证件照头像图片池（与 game.ts AVATAR_URLS 保持同步）
// ──────────────────────────────────────────────────────────
const PORTRAIT_MALE = [
  'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_621c9218-19a0-43e9-b95d-f2d4ae3f9e92.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_924ae4e5-1a80-4181-9b8c-7339d311a0fc.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_99914b11-1dff-4dcf-858c-30f4e5eeb460.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_b7a5e3d5-c031-4df6-a678-a1dcdfe0c25b.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_00f033be-e75d-407f-aa89-77ce429e4328.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_5f219e03-1028-4de8-a9c2-ce7d6079f968.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_4ea31af7-d365-430e-8de7-1af355a47cd3.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_b45972f2-4401-4764-bd0f-6ca4a4a145bb.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_d5608b5d-b503-4723-8a42-1e1067273717.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_c0202944-425b-412e-816b-19e759fef575.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_32026d5c-e7bf-480d-8799-3807d71d8c75.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_70af69aa-81a8-48a3-9a59-32e326579115.jpg',
];
const PORTRAIT_FEMALE = [
  'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_6b0ad6c1-809a-47c3-ab75-3d678d663d27.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_25f1c571-9e3a-4802-8f48-e7190775540c.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_9b2d296a-6fa1-4ade-a808-c41467021031.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_140bb22d-7c64-43df-9b0b-9ce63580579f.jpg',
];
const PORTRAIT_MILITARY = [
  'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_d8949df0-f9e9-41f1-9a17-58d7d38150b7.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_07ea4fbb-c32b-4d1d-861d-b0f48a6244ed.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_82193f37-2b86-4edd-b6f4-a95cc3967fdb.jpg',
];
const PORTRAIT_POLICE = [
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_2e801fd7-befc-4df1-8a77-0b519156ef51.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_c70863ab-b122-4ca5-8234-b74fa4cce9c1.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_a635c1e5-604a-40da-aa51-ac399e1dded8.jpg',
];

/** 根据 leader id + 职位关键字 确定性地选取证件照 URL */
function pickPortrait(leaderId: string, title: string, isFemale: boolean): string {
  const h = Math.abs(
    leaderId.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0)
  );
  const isMil = /军委|战区|军区|军分区|人武部|军队|海军|空军|陆军|火箭军|联勤|联参/.test(title);
  const isPol = /公安|警察|武警/.test(title);
  if (isMil) return PORTRAIT_MILITARY[h % PORTRAIT_MILITARY.length];
  if (isPol) return PORTRAIT_POLICE[h % PORTRAIT_POLICE.length];
  if (isFemale) return PORTRAIT_FEMALE[h % PORTRAIT_FEMALE.length];
  return PORTRAIT_MALE[h % PORTRAIT_MALE.length];
}

// ──────────────────────────────────────────────────────────
//  随机数据素材
// ──────────────────────────────────────────────────────────
const SURNAMES = ['王','李','张','刘','陈','赵','孙','周','吴','郑','冯','韩','唐','曾','林','沈','徐','杨','朱','马','许','何','潘','谢','苗','余','方','邓','夏','卢'];
const M_GIVEN  = ['建国','明志','伟华','国强','志远','国栋','建平','海龙','志刚','国梁','建军','德政','国庆','建华','志明','国兴','明远','海清','开明','志国','天宇','光辉','振华','永贵','胜利','文武','治国','为民','正道','大为'];
const F_GIVEN  = ['玉华','淑华','秀兰','敏华','丽华','桂英','美娟','文静','燕玲','秀珍'];
const UNIVERSITIES = ['北京大学','清华大学','中国人民大学','复旦大学','南开大学','武汉大学','吉林大学','四川大学','中山大学','浙江大学','南京大学','西安交通大学','中央党校（在职）','国防科技大学'];
const MAJORS = ['法学','经济学','管理学','政治学','马克思主义理论','工学','农业经济','财政学','行政管理','社会学'];

// ── 省→市→县→镇 四级真实地名库 ──
const GEO_POOL = [
  { prov:'湖南省',   cities:['长沙市','常德市','岳阳市','株洲市'],  counties:['宁乡市','浏阳市','汨罗市','醴陵市'],  towns:['铜官镇','金井镇','开慧镇','乔口镇'] },
  { prov:'江西省',   cities:['南昌市','赣州市','吉安市','九江市'],  counties:['南昌县','修水县','万载县','樟树市'],  towns:['莲塘镇','罗坊镇','温圳镇','昌邑镇'] },
  { prov:'湖北省',   cities:['武汉市','黄冈市','荆州市','宜昌市'],  counties:['大冶市','麻城市','石首市','枝江市'],  towns:['邾城镇','木兰镇','龙感湖镇','沙洋镇'] },
  { prov:'四川省',   cities:['成都市','绵阳市','德阳市','南充市'],  counties:['都江堰市','绵竹市','广汉市','阆中市'],towns:['安德镇','崇义镇','寿宝镇','金溪镇'] },
  { prov:'山东省',   cities:['济南市','青岛市','烟台市','潍坊市'],  counties:['章丘区','邹平市','招远市','寿光市'],  towns:['明水街道','垛庄镇','绣惠镇','索镇'] },
  { prov:'河南省',   cities:['郑州市','洛阳市','开封市','南阳市'],  counties:['新郑市','巩义市','荥阳市','邓州市'],  towns:['龙湖镇','孝义镇','须水镇','汜水镇'] },
  { prov:'浙江省',   cities:['杭州市','宁波市','温州市','绍兴市'],  counties:['诸暨市','义乌市','慈溪市','象山县'],  towns:['枫桥镇','苏溪镇','大唐镇','鹤溪镇'] },
  { prov:'江苏省',   cities:['南京市','苏州市','无锡市','南通市'],  counties:['如皋市','昆山市','江阴市','海门区'],  towns:['磨头镇','周市镇','云亭镇','悦来镇'] },
  { prov:'福建省',   cities:['福州市','厦门市','泉州市','漳州市'],  counties:['晋江市','福清市','南安市','龙海区'],  towns:['深沪镇','龙田镇','英林镇','角美镇'] },
  { prov:'安徽省',   cities:['合肥市','芜湖市','蚌埠市','阜阳市'],  counties:['肥西县','无为市','天长市','界首市'],  towns:['上派镇','汤沟镇','铜城镇','光武镇'] },
  { prov:'陕西省',   cities:['西安市','宝鸡市','咸阳市','渭南市'],  counties:['韩城市','蒲城县','三原县','富平县'],  towns:['龙亭镇','荆姚镇','大程镇','庄里镇'] },
  { prov:'辽宁省',   cities:['沈阳市','大连市','鞍山市','锦州市'],  counties:['瓦房店市','海城市','北票市','凌源市'],towns:['长兴岛镇','腾鳌镇','牛庄镇','羊山镇'] },
  { prov:'黑龙江省', cities:['哈尔滨市','齐齐哈尔市','牡丹江市','佳木斯市'], counties:['阿城区','肇东市','海林市','富锦市'], towns:['玉泉镇','昌五镇','柴河镇','锦山镇'] },
  { prov:'吉林省',   cities:['长春市','吉林市','通化市','松原市'],  counties:['舒兰市','磐石市','梅河口市','扶余市'],towns:['法特镇','红旗岭镇','靖宇镇','松花江镇'] },
  { prov:'广东省',   cities:['广州市','深圳市','佛山市','东莞市'],  counties:['增城区','番禺区','台山市','高州市'],  towns:['派潭镇','石楼镇','水口镇','曹江镇'] },
  { prov:'广西壮族自治区', cities:['南宁市','柳州市','桂林市','贵港市'], counties:['横县','鹿寨县','灵川县','平南县'], towns:['灵马镇','寨沙镇','青狮潭镇','大安镇'] },
];

// 按职位层级取地名简称（直接拼入职位前）
// geoTier: 0=镇级 1=县级 2=市级 3=省级 4=国家级（不加地名）
function geoForTier(seed: number, geoTier: 0|1|2|3|4): string {
  if (geoTier === 4) return ''; // 国家级职位不加地名前缀
  const geo = GEO_POOL[seed % GEO_POOL.length];
  if (geoTier === 0) {
    // 镇名：完整镇名，如 "铜官镇"
    return geo.towns[(seed >> 3) % geo.towns.length];
  } else if (geoTier === 1) {
    // 县名简称（去掉末尾的"县"/"区"字，因职位里含"县"字）：如 "宁乡"
    const county = geo.counties[(seed >> 2) % geo.counties.length];
    // 保留完整县名，职位直接前置（如 "宁乡市委常委"）
    return county.replace(/[市县区]$/, '');
  } else if (geoTier === 2) {
    // 市名简称（去"市"字，因职位里含"市"字）：如 "长沙"
    return geo.cities[(seed >> 2) % geo.cities.length].replace(/市$/, '');
  } else {
    // 省名简称（去"省"/"壮族自治区"等，因职位里含"省"字）：如 "湖南"
    return geo.prov.replace(/省$|壮族自治区$|自治区$/, '');
  }
}

// 用 id 作种子，保证同存档同人物始终一致
function hashNum(s: string, offset = 0): number {
  let h = offset * 31;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function pick<T>(arr: T[], seed: number): T { return arr[seed % arr.length]; }

// ──────────────────────────────────────────────────────────
//  仕途档案生成
// ──────────────────────────────────────────────────────────
interface CareerEntry { years: string; position: string }
interface LeaderProfile {
  name: string;
  age: number;
  birthYear: number;
  birthplace: string;
  education: string;
  partyYear: number;
  career: CareerEntry[];
}

// rankTier: 1=县级 2=市级 3=省部级 4=国家级
// gameYear: 当前游戏年份（2020 + floor(gameDays/365)）
// currentTitle: 该人物现任职务（显示为最后一条经历）
function generateProfile(
  id: string,
  rankTier: 1|2|3|4,
  gameYear: number,
  currentTitle: string,
): LeaderProfile {
  const s = (n: number) => hashNum(id, n);
  const isFemale = s(99) % 9 === 0; // ~11% 女性
  const surname = pick(SURNAMES, s(0));
  const given   = isFemale ? pick(F_GIVEN, s(1)) : pick(M_GIVEN, s(1));
  const name    = surname + given;

  const baseAge = rankTier === 4 ? 64 : rankTier === 3 ? 57 : rankTier === 2 ? 51 : 45;
  const age     = baseAge + (s(2) % 8);
  const birthYear = gameYear - age;

  const birthplace = GEO_POOL[s(3) % GEO_POOL.length].prov;
  let university = pick(UNIVERSITIES, s(4));   // 军队/外交路径会覆盖为对应院校
  let major      = pick(MAJORS, s(5));          // 同上
  const partyYear  = birthYear + 20 + (s(6) % 6);

  // ── 任职层级爬升路径（全部从镇级基层起步）──
  // 镇级职位
  const TOWN_POSTS  = ['科员','党政办副主任','党委委员','副镇长','镇长','党委书记'];
  // 县级职位
  const COUNTY_POSTS= ['县委办副主任','县委常委','县政府副县长','县长','县委书记'];
  // 市级职位
  const CITY_POSTS  = ['市政府副秘书长','市委常委','市政府副市长','市政府秘书长','市长','市委书记'];
  // 省级职位
  const PROV_POSTS  = ['省委常委','省政府副省长','省委秘书长','省委组织部长','省长','省委书记'];

  // 按rankTier确定生涯轨迹层级列表
  // ⚠️ tierPath 长度 = careerLen - 1，最后一条由 isLast+currentTitle 控制
  let tierPath: Array<{ pool: string[]; geoTier: 0|1|2|3|4 }>;
  if (rankTier === 1) {
    // 县级领导 7-8条：镇(3)→县(4-5)
    tierPath = [
      { pool: TOWN_POSTS.slice(0, 2),  geoTier: 0 }, // 科员/办主任
      { pool: TOWN_POSTS.slice(1, 3),  geoTier: 0 }, // 党委委员/副镇长
      { pool: TOWN_POSTS.slice(3, 5),  geoTier: 0 }, // 镇长/党委书记
      { pool: COUNTY_POSTS.slice(0, 2),geoTier: 1 }, // 县委办/常委
      { pool: COUNTY_POSTS.slice(1, 3),geoTier: 1 }, // 副县长
      { pool: COUNTY_POSTS.slice(2, 4),geoTier: 1 }, // 县长
      { pool: COUNTY_POSTS.slice(3),   geoTier: 1 }, // 县委书记（careerLen=8时倒二）
    ];
  } else if (rankTier === 2) {
    // 市级领导 7-8条：镇(2)→县(2)→市(3-4)
    tierPath = [
      { pool: TOWN_POSTS.slice(0, 2),  geoTier: 0 }, // 科员/办主任
      { pool: TOWN_POSTS.slice(3),     geoTier: 0 }, // 镇长/书记
      { pool: COUNTY_POSTS.slice(0, 3),geoTier: 1 }, // 县委常委/副县长
      { pool: COUNTY_POSTS.slice(2),   geoTier: 1 }, // 县长/书记
      { pool: CITY_POSTS.slice(0, 3),  geoTier: 2 }, // 市副秘书长/常委
      { pool: CITY_POSTS.slice(2, 4),  geoTier: 2 }, // 副市长/秘书长
      { pool: CITY_POSTS.slice(4),     geoTier: 2 }, // 市长/书记（careerLen=8时倒二）
    ];
  } else if (rankTier === 3) {
    // 省部级领导：根据系统类型生成专属路径（7-8条）
    const ct3 = currentTitle;
    const isDis3 = ct3.includes('纪委');
    const isOrg3 = ct3.includes('组织部');
    const isPol3 = ct3.includes('政法委') || ct3.includes('公安厅');
    const isMil3 = ct3.includes('军区') || (ct3.includes('司令员') && !ct3.includes('战区'));

    if (isDis3) {
      // 省纪委书记：纪检系统路径
      tierPath = [
        { pool:['纪检干事','监察委员会干部'],                   geoTier:1 },
        { pool:['县纪委副书记','县纪委书记'],                   geoTier:1 },
        { pool:['市纪委委员','市纪委副书记'],                   geoTier:2 },
        { pool:['市纪委书记','市委常委（纪委书记）'],           geoTier:2 },
        { pool:['省纪委委员','省纪委副书记'],                   geoTier:3 },
        { pool:['省委常委（纪委书记）','省纪委书记'],           geoTier:3 },
      ];
    } else if (isOrg3) {
      // 省委组织部长：组织系统路径
      tierPath = [
        { pool:['县委组织部副部长','县委组织部部长'],           geoTier:1 },
        { pool:['市委组织部副部长','市委组织部部长'],           geoTier:2 },
        { pool:['市委常委（组织部长）'],                        geoTier:2 },
        { pool:['省委组织部处长','省委组织部副部长'],           geoTier:3 },
        { pool:['省委组织部部长'],                              geoTier:3 },
        { pool:['省委常委（组织部长）'],                        geoTier:3 },
      ];
    } else if (isPol3) {
      // 省委政法委书记/公安厅长：政法系统路径
      tierPath = [
        { pool:['派出所民警','刑侦队队员'],                     geoTier:1 },
        { pool:['县公安局副局长','县公安局局长'],               geoTier:1 },
        { pool:['市公安局副局长','市公安局局长'],               geoTier:2 },
        { pool:['市委政法委书记','市委常委（政法委书记）'],     geoTier:2 },
        { pool:['省公安厅副厅长','省委政法委副书记'],           geoTier:3 },
        { pool:['省公安厅厅长','省委政法委书记'],               geoTier:3 },
      ];
    } else if (isMil3) {
      // 省军区司令员（少将级）：军队系统路径（职位含军衔）
      tierPath = [
        { pool:['步兵连连长（上尉）','炮兵营营长（少校）'],     geoTier:4 },
        { pool:['步兵团团长（上校）','装甲旅参谋长（中校）'],   geoTier:4 },
        { pool:['合成旅旅长（大校）','集团军副参谋长（大校）'], geoTier:4 },
        { pool:['省军区参谋长（大校）','省军区副司令员（少将）'], geoTier:4 },
        { pool:['省军区副司令员（少将）','省军区参谋长（少将）'],geoTier:4 },
        { pool:['省军区司令员（少将）'],                        geoTier:4 },
      ];
    } else {
      // 通用省级党政路径（书记、省长、议政院主任、参政主席等）
      tierPath = [
        { pool: TOWN_POSTS.slice(2, 5),  geoTier: 0 }, // 镇党委委员→副镇长→镇长
        { pool: COUNTY_POSTS.slice(0, 2),geoTier: 1 }, // 县委常委
        { pool: COUNTY_POSTS.slice(2),   geoTier: 1 }, // 县长/书记
        { pool: CITY_POSTS.slice(0, 3),  geoTier: 2 }, // 市常委/副市长
        { pool: CITY_POSTS.slice(3),     geoTier: 2 }, // 市长/书记
        { pool: PROV_POSTS.slice(0, 4),  geoTier: 3 }, // 省委常委/副省长/组织部长
        { pool: PROV_POSTS.slice(4),     geoTier: 3 }, // 省长/省委书记（careerLen=8时倒二）
      ];
    }
  } else {
    // ── 国家级领导：根据系统类型生成各自专属仕途路径（共11条）──
    // 参考现实：军委副主席全程军队、外交部长外交系统、公安部长政法系统……
    const ct = currentTitle;

    // ── 系统类型判断 ──
    // 军队：军委副主席、国防部长、战区/军种司令员政委、联参/政工部等
    const MIL_KEYWORDS = ['军委副主席','战区司令员','战区政委','战区参谋长',
      '陆军司令员','海军司令员','空军司令员','火箭军司令员',
      '信息支援部队','联勤保障部队','联合参谋部','政治工作部主任'];
    const isMilitary   = MIL_KEYWORDS.some(k => ct.includes(k)) ||
                         (ct.includes('国防部') && ct.includes('部长'));
    const isDiplomatic = ct.includes('外交部');
    const isEconTech   = ct.includes('发展和改革') || ct.includes('发展改革') ||
                         ct.includes('财政部') || ct.includes('商务部');
    const isPolicing   = ct.includes('公安部') || ct.includes('司法部') ||
                         ct.includes('国家安全部');
    const isDiscipline = ct.includes('纪委');
    const isPartyOrg   = ct.includes('组织部');

    if (isMilitary) {
      // ── 军队路径：全程军营，配军衔晋升（geoTier=4，不加地名） ──
      // 参考：张又侠（野战兵→集团军→战区→军委）
      university = pick(['国防大学','解放军国防科技大学','陆军指挥学院',
                         '海军指挥学院','空军指挥学院','联合参谋学院'], s(4));
      major      = pick(['军事指挥学','战役学','战略学','联合作战指挥','武器系统工程'], s(5));
      // 军委副主席前任是"军委委员"；国防部长/战区司令员前任是"战区/联参"
      const milBridge = ct.includes('国防部') || ct.includes('战区') ||
                        ct.includes('陆军司令') || ct.includes('海军司令') ||
                        ct.includes('空军司令') || ct.includes('火箭军司令') ||
                        ct.includes('联合参谋部') || ct.includes('政治工作部主任')
        ? ['战区司令员（上将）','中枢军委联合参谋部参谋长（上将）','中枢军委委员（上将）']
        : ['中枢军委委员（上将）','中枢军委联合参谋部参谋长（上将）'];
      tierPath = [
        { pool:['步兵排长（少尉）','炮兵连指导员（中尉）','侦察排排长（少尉）'],           geoTier:4 }, // i=0
        { pool:['步兵连连长（上尉）','装甲连连长（上尉）','工兵连连长（上尉）'],           geoTier:4 }, // i=1
        { pool:['步兵营营长（少校）','炮兵营营长（少校）','工兵营营长（中校）'],           geoTier:4 }, // i=2
        { pool:['合成旅参谋长（中校）','步兵团参谋长（中校）','装甲团副团长（中校）'],     geoTier:4 }, // i=3
        { pool:['合成旅旅长（上校）','步兵团团长（上校）','炮兵旅旅长（上校）'],           geoTier:4 }, // i=4
        { pool:['集团军副参谋长（大校）','集团军合成师副师长（大校）','合成旅旅长（大校）'], geoTier:4 }, // i=5
        { pool:['集团军参谋长（少将）','集团军副军长（少将）','集团军政委（少将）'],        geoTier:4 }, // i=6
        { pool:['战区陆军参谋长（中将）','战区副司令员（中将）',
                '战区联合参谋部参谋长（中将）'],                                          geoTier:4 }, // i=7
        { pool:['战区司令员（上将）','战区政委（上将）'],                                  geoTier:4 }, // i=8
        { pool: milBridge,                                                                 geoTier:4 }, // i=9 过渡
        // i=10 → isLast → currentTitle
      ];

    } else if (isDiplomatic) {
      // ── 外交路径：驻外→司局→大使→副部→国政委员 ──
      // 参考：王毅（日本留学→外交部亚洲司→驻日大使→外交部长）
      university = pick(['北京外国语大学','外交学院','中国人民大学',
                         '复旦大学','北京大学'], s(4));
      major      = pick(['国际关系','外交学','英语','法语','国际法'], s(5));
      tierPath = [
        { pool:['外交部三等秘书','外交部研究室助理研究员','外交部干部'],                       geoTier:4 }, // i=0
        { pool:['驻美国使馆三等秘书','驻英国使馆三等秘书','驻联合国代表处三等秘书'],         geoTier:4 }, // i=1
        { pool:['驻俄罗斯使馆二等秘书','驻日本使馆二等秘书','驻法国使馆二等秘书'],           geoTier:4 }, // i=2
        { pool:['驻德国使馆一等秘书','驻澳大利亚使馆一等秘书','驻加拿大使馆参赞'],           geoTier:4 }, // i=3
        { pool:['外交部亚洲司处长','外交部欧洲司处长','外交部美洲大洋洲司处长'],             geoTier:4 }, // i=4
        { pool:['驻某国公使','外交部亚洲司副司长','外交部条约法律司副司长'],                 geoTier:4 }, // i=5
        { pool:['驻欧盟使团大使','驻俄罗斯大使','驻东盟使团大使','驻美国公使'],              geoTier:4 }, // i=6
        { pool:['外交部部长助理'],                                                            geoTier:4 }, // i=7
        { pool:['外交部副部长'],                                                              geoTier:4 }, // i=8
        { pool:['国政委员（主管外交）','中枢外事工作委员会办公室主任'],                       geoTier:4 }, // i=9 过渡
        // i=10 → isLast → 外交部部长
      ];

    } else if (isEconTech) {
      // ── 经济/技术官僚路径：地方财经→省级→部委 ──
      // 参考：刘鹤（国家计委→发改委→国政院副院理）
      tierPath = [
        { pool:['财政局科员','发改局科员','统计局干部'],                        geoTier:1 }, // i=0
        { pool:['财政局副股长','发改局副科长','统计局科长'],                    geoTier:1 }, // i=1
        { pool:['市财政局副局长','市发改委副主任','市统计局局长'],              geoTier:2 }, // i=2
        { pool:['省财政厅处长','省发改委处长','省统计局副局长'],                geoTier:3 }, // i=3
        { pool:['省财政厅副厅长','省发改委副主任','省统计局局长'],              geoTier:3 }, // i=4
        { pool:['省财政厅厅长','省发改委主任','省委财经委办公室主任'],          geoTier:3 }, // i=5
        { pool:['省委常委（分管经济）','省委副书记（分管经济财政）'],            geoTier:3 }, // i=6
        { pool: PROV_POSTS.slice(4),                                             geoTier:3 }, // i=7 省长/省委书记
        { pool:['国家发改委副主任','财政部副部长','商务部副部长'],              geoTier:4 }, // i=8
        { pool:['国政委员（分管经济）','国政院副院理（分管经济）','国政院副秘书长'], geoTier:4 }, // i=9 过渡
        // i=10 → isLast → 发改委主任/财政部长
      ];

    } else if (isPolicing) {
      // ── 政法路径：基层警察→省厅→部委 ──
      // 参考：赵克志（河北省公安厅长→省委书记→公安部长）
      tierPath = [
        { pool:['派出所民警','刑侦队队员','治安大队干警'],                      geoTier:1 }, // i=0
        { pool:['派出所副所长','派出所所长','刑侦大队长'],                      geoTier:1 }, // i=1
        { pool:['县公安局副局长','县公安局政委'],                               geoTier:1 }, // i=2
        { pool:['市公安局刑侦支队长','市公安局治安支队长'],                     geoTier:2 }, // i=3
        { pool:['市公安局副局长','市公安局政委'],                               geoTier:2 }, // i=4
        { pool:['市公安局局长','市委政法委书记'],                               geoTier:2 }, // i=5
        { pool:['省公安厅副厅长','省委政法委副书记'],                           geoTier:3 }, // i=6
        { pool:['省公安厅厅长','省委政法委书记'],                               geoTier:3 }, // i=7
        { pool: PROV_POSTS.slice(4),                                             geoTier:3 }, // i=8 省委书记
        { pool:['公安部副部长','国家安全部副部长','司法部副部长'],              geoTier:4 }, // i=9 过渡
        // i=10 → isLast → 公安部部长
      ];

    } else if (isDiscipline) {
      // ── 纪检路径：地方纪委→省纪委→中枢纪委 ──
      // 参考：赵乐际（陕西省委书记→中枢纪委书记）
      tierPath = [
        { pool:['纪检监察干部','纪检委干事'],                                   geoTier:1 }, // i=0
        { pool:['县纪委委员','县监委委员'],                                     geoTier:1 }, // i=1
        { pool:['县纪委副书记','县纪委书记'],                                   geoTier:1 }, // i=2
        { pool:['市纪委委员','市监委委员'],                                     geoTier:2 }, // i=3
        { pool:['市纪委副书记','市监委副主任'],                                 geoTier:2 }, // i=4
        { pool:['市纪委书记','市委常委（纪委书记）'],                           geoTier:2 }, // i=5
        { pool:['省纪委副书记','省监委副主任'],                                 geoTier:3 }, // i=6
        { pool:['省纪委书记','省委常委（纪委书记）'],                           geoTier:3 }, // i=7
        { pool: PROV_POSTS.slice(4),                                             geoTier:3 }, // i=8 省委书记
        { pool:['中枢纪委常委','中枢纪委副书记','国家监委副主任'],              geoTier:4 }, // i=9 过渡
        // i=10 → isLast → 中枢纪委书记/常务副书记
      ];

    } else if (isPartyOrg) {
      // ── 组织/党务路径：地方组织部→省委组织部→中枢组织部 ──
      tierPath = [
        { pool:['县委组织部干事','县委组织部科员'],                             geoTier:1 }, // i=0
        { pool:['县委组织部副部长','县委组织部部长'],                           geoTier:1 }, // i=1
        { pool:['市委组织部干部科科长','市委组织部副部长'],                     geoTier:2 }, // i=2
        { pool:['市委组织部部长','市委常委（组织部长）'],                       geoTier:2 }, // i=3
        { pool:['省委组织部处长','省委组织部副部长'],                           geoTier:3 }, // i=4
        { pool:['省委组织部部长','省委常委（组织部长）'],                       geoTier:3 }, // i=5
        { pool:['省委副书记'],                                                   geoTier:3 }, // i=6
        { pool: PROV_POSTS.slice(4),                                             geoTier:3 }, // i=7 省长/省委书记
        { pool: PROV_POSTS.slice(5),                                             geoTier:3 }, // i=8 省委书记（第二省）
        { pool:['中枢组织部常务副部长','中枢政治局委员'],                       geoTier:4 }, // i=9 过渡
        // i=10 → isLast → 中枢组织部部长
      ];

    } else {
      // ── 通用党政路径：总执书记/总理/议政院/参政院/其他副国级 ──
      const isSupreme = ['总执书记','议政委员长','参政主席'].some(k => ct.includes(k));
      const isPremier = ct.includes('国政院院理') && !ct.includes('副') && !ct.includes('常务');

      // 专项路径判断
      const isPropaganda = ct.includes('宣传部');
      const isUFWork     = ct.includes('统战部');
      const isSocialWork = ct.includes('社会工作部');
      const isLeague     = ct.includes('共青团') || ct.includes('青年总团');
      const isLabor      = ct.includes('工会') || ct.includes('人力资源') || ct.includes('社会保障');
      const isWomen      = ct.includes('妇女联合');
      const isPartySchool= ct.includes('党校') || ct.includes('行政学院');
      const isCyber      = ct.includes('网信') || ct.includes('互联网信息');
      const isHealth     = ct.includes('卫生') || ct.includes('医疗保障');
      const isAgriculture= ct.includes('农业农村');
      const isEnviro     = ct.includes('生态环境') || ct.includes('自然资源');
      const isTransport  = ct.includes('交通运输');
      const isCulture    = ct.includes('文化和旅游') || ct.includes('广播电视') || ct.includes('体育');
      const isEmergency  = ct.includes('应急管理');
      const isMilAffairs = ct.includes('退役军人');
      const isStats      = ct.includes('统计局');
      const isMVA        = ct.includes('国家民族') || ct.includes('民委');
      const isScience    = ct.includes('科学技术');
      const isCommerce   = ct.includes('商务部');
      const isFinance2   = ct.includes('金融监管') || ct.includes('证券监督') || ct.includes('人民银行');

      if (isPropaganda) {
        // 宣传部路径：党报党刊→宣传系统→省委常委→中枢宣传部
        university = pick(['北京大学','中国人民大学','中国传媒大学','复旦大学','武汉大学'], s(4));
        major      = pick(['新闻学','中文','马克思主义理论','广播电视学','哲学'], s(5));
        tierPath = [
          { pool:['党报编辑','宣传部干事','新闻出版局科员'],                           geoTier:1 },
          { pool:['县委宣传部副部长','县委宣传部部长'],                                geoTier:1 },
          { pool:['市委宣传部副部长','市委宣传部部长'],                                geoTier:2 },
          { pool:['市委常委（宣传部长）'],                                              geoTier:2 },
          { pool:['省委宣传部副部长','省委宣传部部长'],                                geoTier:3 },
          { pool:['省委常委（宣传部长）'],                                              geoTier:3 },
          { pool:['省委副书记'],                                                        geoTier:3 },
          { pool:['省委书记'],                                                          geoTier:3 },
          { pool:['中枢宣传部副部长','中枢政治局委员（分管宣传）'],                    geoTier:4 },
          { pool:['中枢政治局委员·中枢宣传部部长'],                                   geoTier:4 },
        ];
      } else if (isUFWork) {
        // 统战部路径：民族宗教→统战系统→省委常委→中枢统战部
        university = pick(['中央民族大学','北京大学','中国人民大学','中央社会主义学院'], s(4));
        major      = pick(['政治学','民族学','历史学','法学','经济学'], s(5));
        tierPath = [
          { pool:['民族事务委员会干部','统一战线部干事','宗教事务局科员'],              geoTier:1 },
          { pool:['县委统战部副部长','县委统战部部长'],                                geoTier:1 },
          { pool:['市委统战部副部长','市委统战部部长'],                                geoTier:2 },
          { pool:['市委常委（统战部长）'],                                              geoTier:2 },
          { pool:['省委统战部副部长','省委统战部部长'],                                geoTier:3 },
          { pool:['省委常委（统战部长）'],                                              geoTier:3 },
          { pool:['省委副书记'],                                                        geoTier:3 },
          { pool:['省委书记'],                                                          geoTier:3 },
          { pool:['中枢统战部副部长','国家民委主任'],                                  geoTier:4 },
          { pool:['中枢统战部部长'],                                                    geoTier:4 },
        ];
      } else if (isSocialWork) {
        // 社会工作部路径：基层社会治理→工会→省委→中枢社会工作部
        tierPath = [
          { pool:['街道社会工作站站长','社区党组织书记'],                               geoTier:1 },
          { pool:['县委社会工作部干事','民政局科员'],                                   geoTier:1 },
          { pool:['市委社会工作委员会副主任','市民政局局长'],                           geoTier:2 },
          { pool:['市委常委（社会工作部长）'],                                          geoTier:2 },
          { pool:['省委社会工作委员会主任','省民政厅厅长'],                             geoTier:3 },
          { pool:['省委常委（社会工作部长）'],                                          geoTier:3 },
          { pool:['省委副书记'],                                                        geoTier:3 },
          { pool:['省委书记'],                                                          geoTier:3 },
          { pool:['中枢社会工作部副部长'],                                              geoTier:4 },
          { pool:['中枢社会工作部部长'],                                                geoTier:4 },
        ];
      } else if (isLeague) {
        // 团派路径：团委→团省委→全国议政院→省委→青年总团
        university = pick(['北京大学','清华大学','中国人民大学','复旦大学'], s(4));
        major      = pick(['政治学','法学','经济学','社会学','中文'], s(5));
        tierPath = [
          { pool:['镇团委书记','县团委副书记'],                                         geoTier:1 },
          { pool:['县团委书记','县委副书记（兼团委书记）'],                             geoTier:1 },
          { pool:['市团委书记','市委常委（兼团市委书记）'],                             geoTier:2 },
          { pool:['省团委书记','团省委书记'],                                           geoTier:3 },
          { pool:['省委常委','省委副秘书长'],                                           geoTier:3 },
          { pool:['省委副书记'],                                                        geoTier:3 },
          { pool:['省委书记','省长'],                                                   geoTier:3 },
          { pool:['共青团中枢书记处书记','全国青联主席'],                               geoTier:4 },
          { pool:['全国青联主席','共青团中枢书记处第一书记'],                           geoTier:4 },
          { pool:['共青团中枢书记处第一书记'],                                          geoTier:4 },
        ];
      } else if (isLabor) {
        // 劳动/人社路径：社保系统→省人社厅→部委
        tierPath = [
          { pool:['劳动局科员','社保局干部'],                                           geoTier:1 },
          { pool:['县人社局副局长','县劳动局局长'],                                    geoTier:1 },
          { pool:['市人社局副局长','市劳动局局长'],                                    geoTier:2 },
          { pool:['市人社局局长','市委常委（分管人社）'],                               geoTier:2 },
          { pool:['省人社厅处长','省人社厅副厅长'],                                    geoTier:3 },
          { pool:['省人社厅厅长','省委常委（分管劳动）'],                               geoTier:3 },
          { pool:['省委副书记','省长'],                                                 geoTier:3 },
          { pool:['省委书记'],                                                          geoTier:3 },
          { pool:['人力资源和社会保障部副部长','人社部党组书记'],                       geoTier:4 },
          { pool:['人力资源和社会保障部部长'],                                          geoTier:4 },
        ];
      } else if (isWomen) {
        // 妇联路径：基层妇联→省妇联→全国妇联
        const isFm = true; // 妇联路径默认女性
        void isFm;
        university = pick(['北京大学','中国人民大学','复旦大学','中国女子学院'], s(4));
        major      = pick(['社会学','政治学','法学','教育学','经济学'], s(5));
        tierPath = [
          { pool:['村妇代会主任','街道妇联副主席'],                                    geoTier:1 },
          { pool:['县妇联主席','县委统战委员'],                                        geoTier:1 },
          { pool:['市妇联主席','市参政院副主席（兼妇联主席）'],                           geoTier:2 },
          { pool:['省妇联副主席','省参政院常委'],                                        geoTier:3 },
          { pool:['省妇联主席','省委常委'],                                             geoTier:3 },
          { pool:['全国妇联书记处书记'],                                               geoTier:4 },
          { pool:['全国妇联副主席'],                                                   geoTier:4 },
          { pool:['全国妇联第一副主席'],                                               geoTier:4 },
          { pool:['全国妇联主席'],                                                     geoTier:4 },
          { pool:['全国妇联主席'],                                                     geoTier:4 },
        ];
      } else if (isPartySchool) {
        // 党校路径：院校教师→省委党校→中央党校
        university = pick(['北京大学','中国人民大学','清华大学','中央党校','复旦大学'], s(4));
        major      = pick(['马克思主义理论','哲学','政治学','行政管理','历史学'], s(5));
        tierPath = [
          { pool:['县委党校教师','县委党校副校长'],                                    geoTier:1 },
          { pool:['市委党校教师','市委党校教务处处长'],                                geoTier:2 },
          { pool:['市委党校副校长','市委党校校长'],                                    geoTier:2 },
          { pool:['省委党校教研室主任','省委党校副校长'],                              geoTier:3 },
          { pool:['省委党校常务副校长','省委党校校长'],                                geoTier:3 },
          { pool:['省委常委（分管教育·党建）'],                                        geoTier:3 },
          { pool:['省委副书记'],                                                       geoTier:3 },
          { pool:['省委书记'],                                                         geoTier:3 },
          { pool:['中央党校副校长','国家行政学院常务副院长'],                          geoTier:4 },
          { pool:['中央党校（国家行政学院）校长'],                                     geoTier:4 },
        ];
      } else if (isCyber) {
        // 网信路径：技术部门→互联网监管→中央网信办
        university = pick(['清华大学','北京大学','上海交通大学','北京邮电大学','浙江大学'], s(4));
        major      = pick(['计算机科学','信息工程','通信工程','软件工程','法学'], s(5));
        tierPath = [
          { pool:['工信部科员','互联网信息办公室干部'],                                geoTier:1 },
          { pool:['工信局科长','网信办副主任'],                                        geoTier:2 },
          { pool:['市委网信办主任','市工信局局长'],                                    geoTier:2 },
          { pool:['省委网信办主任','省工信厅副厅长'],                                  geoTier:3 },
          { pool:['省工信厅厅长','省委常委（分管网络安全）'],                          geoTier:3 },
          { pool:['省委副书记'],                                                       geoTier:3 },
          { pool:['省委书记'],                                                         geoTier:3 },
          { pool:['国家互联网信息办公室副主任','工业和信息化部副部长'],                geoTier:4 },
          { pool:['国家互联网信息办公室主任'],                                         geoTier:4 },
          { pool:['中央网信办主任'],                                                   geoTier:4 },
        ];
      } else if (isHealth) {
        // 卫生/医保路径：医院→卫生行政→省卫健委→部委
        university = pick(['北京大学医学部','复旦大学医学院','中南大学湘雅医学院','北京协和医学院','四川大学华西医学中心'], s(4));
        major      = pick(['临床医学','公共卫生','卫生管理','医学','药学'], s(5));
        tierPath = [
          { pool:['县卫生局科员','乡镇卫生院院长'],                                   geoTier:1 },
          { pool:['县卫生局副局长','县卫生局局长'],                                   geoTier:1 },
          { pool:['市卫生局副局长','市卫生局局长'],                                   geoTier:2 },
          { pool:['省卫健委处长','省卫健委副主任'],                                   geoTier:3 },
          { pool:['省卫健委主任','省政府副省长（分管卫生）'],                          geoTier:3 },
          { pool:['省委常委'],                                                         geoTier:3 },
          { pool:['省委副书记','省长'],                                                geoTier:3 },
          { pool:['省委书记'],                                                         geoTier:3 },
          { pool:['国家卫健委副主任','国家医保局副局长'],                              geoTier:4 },
          { pool:['国家卫生健康委员会主任','国家医疗保障局局长'],                      geoTier:4 },
        ];
      } else if (isAgriculture) {
        // 农业路径：乡镇农技→农业局→省农业农村厅→农业农村部
        university = pick(['中国农业大学','华中农业大学','浙江大学农学院','南京农业大学','四川农业大学'], s(4));
        major      = pick(['农学','农业经济','植保','土壤学','畜牧兽医'], s(5));
        tierPath = [
          { pool:['乡镇农技站技术员','农业局科员'],                                   geoTier:1 },
          { pool:['县农业局副局长','县农业局局长'],                                   geoTier:1 },
          { pool:['市农业农村局副局长','市农业农村局局长'],                            geoTier:2 },
          { pool:['省农业农村厅处长','省农业农村厅副厅长'],                            geoTier:3 },
          { pool:['省农业农村厅厅长','省委常委（分管农业）'],                          geoTier:3 },
          { pool:['省委副书记'],                                                       geoTier:3 },
          { pool:['省委书记','省长'],                                                  geoTier:3 },
          { pool:['省委书记'],                                                         geoTier:3 },
          { pool:['农业农村部副部长'],                                                 geoTier:4 },
          { pool:['农业农村部部长'],                                                   geoTier:4 },
        ];
      } else if (isEnviro) {
        // 生态/自然资源路径：地勘/环评→省级→部委
        university = pick(['中国地质大学','南京大学','北京大学','中国环境科学研究院','武汉大学'], s(4));
        major      = pick(['地质学','环境科学','生态学','自然地理','资源勘查工程'], s(5));
        tierPath = [
          { pool:['环保局科员','国土资源局干部'],                                     geoTier:1 },
          { pool:['县生态环境局副局长','县自然资源局局长'],                            geoTier:1 },
          { pool:['市生态环境局局长','市自然资源和规划局局长'],                        geoTier:2 },
          { pool:['省生态环境厅副厅长','省自然资源厅副厅长'],                          geoTier:3 },
          { pool:['省生态环境厅厅长','省自然资源厅厅长'],                              geoTier:3 },
          { pool:['省委常委（分管生态）'],                                             geoTier:3 },
          { pool:['省委副书记','省长'],                                                geoTier:3 },
          { pool:['省委书记'],                                                         geoTier:3 },
          { pool:['生态环境部副部长','自然资源部副部长'],                              geoTier:4 },
          { pool:['生态环境部部长','自然资源部部长'],                                  geoTier:4 },
        ];
      } else if (isTransport) {
        // 交通路径：公路/铁路→省交通厅→交通部
        university = pick(['同济大学','西南交通大学','长安大学','哈尔滨工业大学','北京交通大学'], s(4));
        major      = pick(['道路桥梁','交通工程','工程管理','土木工程','运输经济'], s(5));
        tierPath = [
          { pool:['县公路局工程师','铁路局技术员'],                                   geoTier:1 },
          { pool:['县交通局副局长','县交通局局长'],                                   geoTier:1 },
          { pool:['市交通运输局副局长','市交通运输局局长'],                            geoTier:2 },
          { pool:['省交通运输厅副厅长'],                                               geoTier:3 },
          { pool:['省交通运输厅厅长','省政府副省长（分管交通）'],                      geoTier:3 },
          { pool:['省委常委'],                                                         geoTier:3 },
          { pool:['省委副书记','省长'],                                                geoTier:3 },
          { pool:['省委书记'],                                                         geoTier:3 },
          { pool:['交通运输部副部长'],                                                 geoTier:4 },
          { pool:['交通运输部部长'],                                                   geoTier:4 },
        ];
      } else if (isCulture || isStats || isScience || isCommerce) {
        // 文体/统计/科技/商务路径：技术/专业→地方局→部委
        university = pick(['北京大学','清华大学','中国传媒大学','中国科学技术大学','对外经济贸易大学'], s(4));
        major      = pick(['文学','经济学','统计学','物理学','国际经济与贸易'], s(5));
        tierPath = [
          { pool:['文化馆干部','统计局科员','科研机构助理研究员','外经贸局科员'],       geoTier:1 },
          { pool:['县文旅局局长','县统计局局长'],                                      geoTier:1 },
          { pool:['市文旅局局长','市科技局局长','市商务局局长'],                        geoTier:2 },
          { pool:['省文化厅处长','省科技厅处长','省商务厅副厅长'],                     geoTier:3 },
          { pool:['省文化厅厅长','省科技厅厅长','省商务厅厅长'],                       geoTier:3 },
          { pool:['省委常委'],                                                         geoTier:3 },
          { pool:['省委副书记','省长'],                                                geoTier:3 },
          { pool:['省委书记'],                                                         geoTier:3 },
          { pool:['文化和旅游部副部长','国家统计局副局长','科技部副部长','商务部副部长'],geoTier:4 },
          { pool:['文化和旅游部部长','国家统计局局长','科学技术部部长','商务部部长'],   geoTier:4 },
        ];
      } else if (isEmergency) {
        // 应急管理路径：消防/安监→省应急厅→应急管理部
        tierPath = [
          { pool:['县安监局干部','消防支队干部'],                                      geoTier:1 },
          { pool:['县应急管理局副局长','县安监局局长'],                                geoTier:1 },
          { pool:['市应急管理局副局长','市应急管理局局长'],                            geoTier:2 },
          { pool:['省应急管理厅副厅长','省安全生产监督管理局局长'],                    geoTier:3 },
          { pool:['省应急管理厅厅长'],                                                 geoTier:3 },
          { pool:['省委常委'],                                                         geoTier:3 },
          { pool:['省委副书记','省长'],                                                geoTier:3 },
          { pool:['省委书记'],                                                         geoTier:3 },
          { pool:['应急管理部副部长'],                                                 geoTier:4 },
          { pool:['应急管理部部长'],                                                   geoTier:4 },
        ];
      } else if (isMilAffairs) {
        // 退役军人路径：军队转业→退役安置→部委
        university = pick(['国防大学','解放军国防科技大学','南京陆军指挥学院'], s(4));
        major      = pick(['军事管理','行政管理','政治工作','社会保障'], s(5));
        tierPath = [
          { pool:['步兵排长（少尉）','军队干事'],                                      geoTier:4 },
          { pool:['步兵营营长（少校）','团政治处主任（少校）'],                        geoTier:4 },
          { pool:['旅政治处副主任（中校）','旅政治部主任（上校）'],                    geoTier:4 },
          { pool:['师政治部主任（上校）','退役军人服务保障中心主任'],                  geoTier:4 },
          { pool:['县退役军人事务局局长','退役军人服务中心主任'],                      geoTier:1 },
          { pool:['市退役军人事务局局长'],                                             geoTier:2 },
          { pool:['省退役军人事务厅副厅长','省退役军人事务厅厅长'],                   geoTier:3 },
          { pool:['省委常委（分管双拥工作）'],                                         geoTier:3 },
          { pool:['退役军人事务部副部长'],                                             geoTier:4 },
          { pool:['退役军人事务部部长'],                                               geoTier:4 },
        ];
      } else if (isMVA) {
        // 民族委路径：民族地区→民委系统
        university = pick(['中央民族大学','中国人民大学','西南民族大学','西北民族大学'], s(4));
        major      = pick(['民族学','政治学','历史学','法学','经济学'], s(5));
        tierPath = [
          { pool:['民族事务局干部','民委办事员'],                                      geoTier:1 },
          { pool:['县民族宗教事务局副局长','县民族事务局局长'],                        geoTier:1 },
          { pool:['市民委副主任','市民族事务局局长'],                                  geoTier:2 },
          { pool:['省民委副主任','省民族事务委员会主任'],                              geoTier:3 },
          { pool:['省委常委（分管民族宗教）','省委统战部部长'],                        geoTier:3 },
          { pool:['省委副书记'],                                                       geoTier:3 },
          { pool:['省委书记'],                                                         geoTier:3 },
          { pool:['省委书记（民族自治区）'],                                           geoTier:3 },
          { pool:['国家民族事务委员会副主任'],                                         geoTier:4 },
          { pool:['国家民族事务委员会主任'],                                           geoTier:4 },
        ];
      } else if (isFinance2) {
        // 金融监管/证监/人行路径：银行→监管部门
        university = pick(['北京大学','清华大学','中国人民大学','上海交通大学','复旦大学'], s(4));
        major      = pick(['金融学','经济学','财政学','会计学','统计学'], s(5));
        tierPath = [
          { pool:['银行柜员','证券公司研究员','保险公司精算师'],                       geoTier:1 },
          { pool:['县银监局干部','县人行营业部主任'],                                  geoTier:1 },
          { pool:['市银监局副局长','市人行行长'],                                      geoTier:2 },
          { pool:['省银监局副局长','省银保监局处长'],                                  geoTier:3 },
          { pool:['省银保监局局长','省金融监管局局长'],                                geoTier:3 },
          { pool:['中国银行副行长','国家金融监管总局副局长'],                          geoTier:4 },
          { pool:['国家金融监管总局局长','中国证监会副主席','华夏中央银行副行长'],     geoTier:4 },
          { pool:['国家金融监管总局局长','中国证券监督管理委员会主席'],                geoTier:4 },
          { pool:['国家金融监督管理总局局长'],                                         geoTier:4 },
          { pool:['国家金融监督管理总局局长','华夏中央银行行长'],                      geoTier:4 },
        ];
      } else {
        // 通用党政路径（总执书记/总理/议政院/参政院/秘书长/工会等）
        const natBridge = isSupreme
          ? ['中枢政治局常委', '中枢政治局委员', '华夏副主席']
          : isPremier
          ? ['国政院常务副院理', '中枢政治局委员']
          : ['国政院副院理', '中枢书记处书记', '全国参政院副主席',
             '全国议政院常委会副议政委员长', '中枢纪委副书记'];
        tierPath = [
          { pool: TOWN_POSTS.slice(0, 3),  geoTier: 0 },
          { pool: TOWN_POSTS.slice(3),     geoTier: 0 },
          { pool: COUNTY_POSTS.slice(0, 3),geoTier: 1 },
          { pool: COUNTY_POSTS.slice(3),   geoTier: 1 },
          { pool: CITY_POSTS.slice(0, 3),  geoTier: 2 },
          { pool: CITY_POSTS.slice(3),     geoTier: 2 },
          { pool: PROV_POSTS.slice(0, 4),  geoTier: 3 },
          { pool: PROV_POSTS.slice(4),     geoTier: 3 },
          { pool: PROV_POSTS.slice(5),     geoTier: 3 },
          { pool: natBridge,               geoTier: 4 },
        ];
      }
    }
  }

  // ── 生成时间轴：从22岁参加工作起，正向分配到至今 ──
  // tier=4 固定11条（i=9走natBridge动态过渡，i=10才是isLast→currentTitle），其余7-8条
  const careerLen = rankTier === 4 ? 11 : 7 + (s(7) % 2);
  const workYears = Math.max(careerLen * 2, age - 22); // 22岁参加工作，确保足够分配
  const startYear = gameYear - workYears; // 参加工作年份

  // 从起点正向推进，均匀分段（每段长度 ≈ workYears/careerLen，带随机扰动）
  const segments: Array<{ start: number; end: number | null }> = [];
  let cursor = startYear;
  for (let i = 0; i < careerLen; i++) {
    const remaining = careerLen - 1 - i; // 当前段之后还剩几段
    const yearsLeft = gameYear - cursor;  // 游戏当前年到cursor还剩多少年
    if (remaining === 0) {
      // 最后一段：到至今
      segments.push({ start: cursor, end: null });
    } else {
      // 均分剩余年数，加小幅扰动（-1/0/+1）
      const avgDur = Math.floor(yearsLeft / (remaining + 1));
      const dur = Math.max(2, avgDur + ((s(10 + i) % 3) - 1));
      segments.push({ start: cursor, end: cursor + dur - 1 });
      cursor += dur;
    }
  }

  const career: CareerEntry[] = segments.map((seg, i) => {
    const tierIdx = Math.min(i, tierPath.length - 1);
    const { pool, geoTier } = tierPath[tierIdx];
    // 最后一条（最新职务）直接使用 currentTitle
    const isLast = i === careerLen - 1;
    const pos = isLast ? currentTitle : pick(pool, s(20 + i * 3));
    // 最后一条不加地名（就是现任职务本身），历史条目拼地名简称+职位（无空格）
    const geo = isLast ? '' : geoForTier(s(30 + i * 7), geoTier as 0|1|2|3|4);
    const yearsStr = seg.end === null
      ? `${seg.start}—至今`
      : `${seg.start}—${seg.end}`;
    return {
      years: yearsStr,
      position: geo ? `${geo}${pos}` : pos,
    };
  });

  return { name, age, birthYear, birthplace, education: `${university} ${major}`, partyYear, career };
}

// ──────────────────────────────────────────────────────────
//  ① 保密等级：玩家可查阅的最高 tier（1=县 2=市 3=省 4=国家）
//  县级以下 → tier≤1；县→2；市→3；省+ → 全部
// ──────────────────────────────────────────────────────────
function getAccessTier(rankLevel: number): number {
  if (rankLevel <= 3)  return 1; // 镇级：仅县级档案
  if (rankLevel <= 6)  return 2; // 县级：最高市级
  if (rankLevel <= 9)  return 3; // 市级：最高省级
  return 4;                       // 省级及以上：全部解锁
}

// ──────────────────────────────────────────────────────────
//  ② 系统分类（用于筛选）
//  返回：'党务'|'政府'|'军队'|'纪检'|'议政院·参政院'
// ──────────────────────────────────────────────────────────
function getSystemCategory(title: string, system: string): string {
  const t = title + system;
  if (/战区|战队|军委|军种|联合参谋|陆军|海军|空军|火箭军|信息支援|联勤|武装警察|军事委|军政/.test(t)) return '军队';
  if (/纪委|监委|纪检|监察/.test(t)) return '纪检';
  if (/议政院|参政院|代表大会|人民政治协商/.test(t)) return '议政院·参政院';
  if (/总执书记|书记处|政治局|组织部|宣传部|统战|党委书记|区党委|市委书记|省委书记/.test(t)) return '党务';
  return '政府';
}

// ──────────────────────────────────────────────────────────
//  ③ 玩家籍贯（由 saveId 哈希确定，固定不变）
// ──────────────────────────────────────────────────────────
function getPlayerBirthplace(saveId: string): string {
  return GEO_POOL[hashNum(saveId, 77) % GEO_POOL.length].prov;
}

// ──────────────────────────────────────────────────────────
//  ④ 关系等级（deterministic，由 saveId+leaderId 哈希）
//  返回：{ level: 0-3, label, color, bgColor }
// ──────────────────────────────────────────────────────────
const REL_LEVELS = [
  { label:'陌生', color:'#666666', bgColor:'#33333360', borderColor:'#555555' },
  { label:'认识', color:'#5B9BD5', bgColor:'#1A3A5A60', borderColor:'#3A6A9A' },
  { label:'熟悉', color:'#55AA55', bgColor:'#1A3A1A60', borderColor:'#3A8A3A' },
  { label:'亲近', color:'#D4AF37', bgColor:'#3A2A0060', borderColor:'#AA8820' },
];

function calcRelation(saveId: string, leaderId: string, tier: number, sameProvince: boolean): { level: number; label: string; color: string; bgColor: string; borderColor: string } {
  const raw = hashNum(saveId + '_rel_' + leaderId, 13) % 100;
  // 高级别领导关系基值较低（国家级×0.45，省级×0.6）
  const factor = tier >= 4 ? 0.45 : tier === 3 ? 0.6 : 0.85;
  let score = Math.floor(raw * factor);
  // 同省加成
  if (sameProvince) score = Math.min(99, score + 18);
  const level = score < 25 ? 0 : score < 50 ? 1 : score < 75 ? 2 : 3;
  return { level, ...REL_LEVELS[level] };
}

// ──────────────────────────────────────────────────────────
//  ⑤ 任期届数（基于 gameYear 和职位类型）
//  返回：{ termLabel: '第20届', endYear: 2027, line: '第20届 · 2027年届满' }
//  参考现实：
//   · 国家级PSC：19届(2017-2022) / 20届(2022-2027) / 21届(2027-2032)
//   · 全国议政院/参政院：14届(2023-2028) / 15届(2028-2033)
//   · 军委、部委副国级：与党代会届次同步（5年）
//   · 省委（省部级）：各省换届跟随全国，但有1-2年差异（哈希扰动）
// ──────────────────────────────────────────────────────────
function calcTermInfo(
  id: string, title: string, tier: number, gameYear: number
): { line: string } {
  let startYear: number;
  let endYear: number;
  let ordinal: number;

  const isNpc = /议政院常委会议政委员长|议政院常委会主任/.test(title);
  const isCppcc = /参政主席/.test(title);

  if (tier === 4 && (isNpc || isCppcc)) {
    // 全国议政院/参政院 5年制：14届2023-2028，15届2028-2033
    const BASE_YEAR = 2023;
    const termLen = 5;
    // 不用 Math.max(0,…)，让 floor 处理负数，防止 gameYear < BASE_YEAR 时跳到未来届
    const n = Math.floor((gameYear - BASE_YEAR) / termLen);
    ordinal = 14 + n;
    startYear = BASE_YEAR + n * termLen;
    endYear   = startYear + termLen;
  } else if (tier === 4) {
    // 国家级（PSC/副国级/部长/军委）：党代会5年，19届2017-2022
    const BASE_YEAR = 2017;
    const termLen = 5;
    const n = Math.floor((gameYear - BASE_YEAR) / termLen);
    ordinal = 19 + n;
    startYear = BASE_YEAR + n * termLen;
    endYear   = startYear + termLen;
  } else {
    // 省部级及以下：5年制，各省换届年有哈希扰动（模拟各省换届年不同步）
    // 参考：第20届省委，大多在2022年底至2023年底换届
    const BASE_YEAR = 2022 + (hashNum(id, 88) % 3); // 2022/2023/2024 锚点
    const termLen = 5;
    // floor 可处理负数：gameYear=2020, BASE_YEAR=2024 → n=floor(-4/5)=-1
    // → startYear=2024-5=2019, endYear=2024（符合现实：2019届满2024）
    const n = Math.floor((gameYear - BASE_YEAR) / termLen);
    ordinal = 13 + n;
    startYear = BASE_YEAR + n * termLen;
    endYear   = startYear + termLen;
  }

  void startYear; // suppress unused warning
  return { line: `第${ordinal}届 · ${endYear}年届满` };
}

// 全国31个省级行政区 + 2个特区（按地理分布排列）
// isPBM = 该省委书记通常为政治局委员（Is Politburo Member）
const PROVINCES: Array<{ name: string; type: '直辖市'|'省'|'自治区'|'特别行政区'; secTitle: string; govTitle: string; isPBM?: boolean }> = [
  // 直辖市（4个直辖市书记全是政治局委员）
  { name:'北京',  type:'直辖市',        secTitle:'北京市委书记',   govTitle:'北京市市长',        isPBM:true },
  { name:'天津',  type:'直辖市',        secTitle:'天津市委书记',   govTitle:'天津市市长',        isPBM:true },
  { name:'上海',  type:'直辖市',        secTitle:'上海市委书记',   govTitle:'上海市市长',        isPBM:true },
  { name:'重庆',  type:'直辖市',        secTitle:'重庆市委书记',   govTitle:'重庆市市长',        isPBM:true },
  // 东北
  { name:'辽宁',  type:'省',            secTitle:'辽宁省委书记',   govTitle:'辽宁省省长' },
  { name:'吉林',  type:'省',            secTitle:'吉林省委书记',   govTitle:'吉林省省长' },
  { name:'黑龙江',type:'省',            secTitle:'黑龙江省委书记', govTitle:'黑龙江省省长' },
  // 华北
  { name:'河北',  type:'省',            secTitle:'河北省委书记',   govTitle:'河北省省长' },
  { name:'山西',  type:'省',            secTitle:'山西省委书记',   govTitle:'山西省省长' },
  { name:'内蒙古',type:'自治区',        secTitle:'内蒙古区党委书记',govTitle:'内蒙古自治区主席'},
  // 华东（广东是大省，书记通常是政治局委员）
  { name:'江苏',  type:'省',            secTitle:'江苏省委书记',   govTitle:'江苏省省长' },
  { name:'浙江',  type:'省',            secTitle:'浙江省委书记',   govTitle:'浙江省省长' },
  { name:'安徽',  type:'省',            secTitle:'安徽省委书记',   govTitle:'安徽省省长' },
  { name:'福建',  type:'省',            secTitle:'福建省委书记',   govTitle:'福建省省长' },
  { name:'江西',  type:'省',            secTitle:'江西省委书记',   govTitle:'江西省省长' },
  { name:'山东',  type:'省',            secTitle:'山东省委书记',   govTitle:'山东省省长' },
  // 华中
  { name:'河南',  type:'省',            secTitle:'河南省委书记',   govTitle:'河南省省长' },
  { name:'湖北',  type:'省',            secTitle:'湖北省委书记',   govTitle:'湖北省省长' },
  { name:'湖南',  type:'省',            secTitle:'湖南省委书记',   govTitle:'湖南省省长' },
  // 华南（广东大省，书记是政治局委员）
  { name:'广东',  type:'省',            secTitle:'广东省委书记',   govTitle:'广东省省长',        isPBM:true },
  { name:'广西',  type:'自治区',        secTitle:'广西区党委书记', govTitle:'广西壮族自治区主席'},
  { name:'海南',  type:'省',            secTitle:'海南省委书记',   govTitle:'海南省省长' },
  // 西南
  { name:'四川',  type:'省',            secTitle:'四川省委书记',   govTitle:'四川省省长' },
  { name:'贵州',  type:'省',            secTitle:'贵州省委书记',   govTitle:'贵州省省长' },
  { name:'云南',  type:'省',            secTitle:'云南省委书记',   govTitle:'云南省省长' },
  { name:'西藏',  type:'自治区',        secTitle:'西藏区党委书记', govTitle:'西藏自治区主席',    isPBM:true },
  // 西北（新疆区党委书记是政治局委员）
  { name:'陕西',  type:'省',            secTitle:'陕西省委书记',   govTitle:'陕西省省长' },
  { name:'甘肃',  type:'省',            secTitle:'甘肃省委书记',   govTitle:'甘肃省省长' },
  { name:'青海',  type:'省',            secTitle:'青海省委书记',   govTitle:'青海省省长' },
  { name:'宁夏',  type:'自治区',        secTitle:'宁夏区党委书记', govTitle:'宁夏回族自治区主席'},
  { name:'新疆',  type:'自治区',        secTitle:'新疆区党委书记', govTitle:'新疆维吾尔自治区主席', isPBM:true },
  // 特别行政区
  { name:'香港',  type:'特别行政区',    secTitle:'香港特区中联办主任',govTitle:'香港特别行政区行政长官'},
  { name:'澳门',  type:'特别行政区',    secTitle:'澳门特区中联办主任',govTitle:'澳门特别行政区行政长官'},
];

// 国家级7常委
const NATIONAL_PSC = [
  { id:'psc1', title:'中共中央总执书记·华夏主席·中枢军委主席', system:'中共中央', emoji:'⭐', tier:4 as const },
  { id:'psc2', title:'国政院院理',                         system:'国政院',   emoji:'🔴', tier:4 as const },
  { id:'psc3', title:'全国议政院常委会议政委员长',               system:'全国议政院', emoji:'🔴', tier:4 as const },
  { id:'psc4', title:'全国参政院主席',                       system:'全国参政院', emoji:'🔴', tier:4 as const },
  { id:'psc5', title:'中枢书记处第一书记',                 system:'中枢书记处',emoji:'🔴', tier:4 as const },
  { id:'psc6', title:'国政院常务副院理',                   system:'国政院',   emoji:'🔴', tier:4 as const },
  { id:'psc7', title:'中枢纪委书记',                       system:'中枢纪委', emoji:'🔴', tier:4 as const },
];

// ── 全量国家级领导人（与 game.ts LEADERSHIP_ROLES rank=10~15 完全对应）──
const NATIONAL_OTHERS: Array<{ id:string; title:string; system:string; emoji:string; tier:4 }> = [
  // ── 华夏副主席 ──
  { id:'vp',        title:'华夏副主席',                                   system:'华夏主席府',     emoji:'🔴', tier:4 },
  // ── 国政院（常务副院理在PSC，不重复） ──
  { id:'vp1',       title:'国政院副院理（二）',                           system:'国政院',         emoji:'🌟', tier:4 },
  { id:'vp2',       title:'国政院副院理（三）',                           system:'国政院',         emoji:'🌟', tier:4 },
  { id:'vp3',       title:'国政院副院理（四）',                           system:'国政院',         emoji:'🌟', tier:4 },
  { id:'sc1',       title:'国政委员（兼外交部长）',                       system:'国政院',         emoji:'🌐', tier:4 },
  { id:'sc2',       title:'国政委员（兼国防部长）',                       system:'国政院',         emoji:'🛡️', tier:4 },
  { id:'sc3',       title:'国政委员（分管政法·公安）',                    system:'国政院',         emoji:'⚖️', tier:4 },
  { id:'sc4',       title:'国政委员（分管科教·文化）',                    system:'国政院',         emoji:'📚', tier:4 },
  { id:'sg',        title:'国政院秘书长',                                 system:'国政院',         emoji:'📋', tier:4 },
  // ── 全国议政院 ──
  { id:'npc1',      title:'全国议政院常委会第一副议政委员长',                   system:'全国议政院',       emoji:'⚖️', tier:4 },
  { id:'npc2',      title:'全国议政院常委会副议政委员长（二）',                 system:'全国议政院',       emoji:'⚖️', tier:4 },
  { id:'npc3',      title:'全国议政院常委会副议政委员长（三）',                 system:'全国议政院',       emoji:'⚖️', tier:4 },
  { id:'npc_sg',    title:'全国议政院常委会秘书长',                         system:'全国议政院',       emoji:'📋', tier:4 },
  // ── 全国参政院 ──
  { id:'cppcc1',    title:'全国参政院第一副主席',                           system:'全国参政院',       emoji:'🤝', tier:4 },
  { id:'cppcc2',    title:'全国参政院副主席（二）',                         system:'全国参政院',       emoji:'🤝', tier:4 },
  { id:'cppcc_sg',  title:'全国参政院秘书长',                               system:'全国参政院',       emoji:'📋', tier:4 },
  // ── 中枢军事委员会 ──
  { id:'cmc1',      title:'中枢军委副主席（主持联合作战）',               system:'中枢军委',       emoji:'🎖️', tier:4 },
  { id:'cmc2',      title:'中枢军委副主席（主持战略后勤）',               system:'中枢军委',       emoji:'🎖️', tier:4 },
  { id:'cmc_jcs',   title:'中枢军委联合参谋部参谋长（上将）',             system:'中枢军委',       emoji:'🎖️', tier:4 },
  { id:'cmc_gpd',   title:'中枢军委政治工作部主任（上将）',               system:'中枢军委',       emoji:'🎖️', tier:4 },
  { id:'cmc_jld',   title:'中枢军委后勤保障部部长（上将）',               system:'中枢军委',       emoji:'🎖️', tier:4 },
  { id:'cmc_eqd',   title:'中枢军委装备发展部部长（上将）',               system:'中枢军委',       emoji:'🎖️', tier:4 },
  { id:'cmc_disc',  title:'中枢军委纪律检查委员会书记（上将）',           system:'中枢军委',       emoji:'⚖️', tier:4 },
  // ── 五大战区 ──
  { id:'tc_east_c',  title:'东部战区司令员（上将）',                      system:'战区',           emoji:'⚔️', tier:4 },
  { id:'tc_east_p',  title:'东部战区政治委员（上将）',                    system:'战区',           emoji:'⚔️', tier:4 },
  { id:'tc_west_c',  title:'西部战区司令员（上将）',                      system:'战区',           emoji:'⚔️', tier:4 },
  { id:'tc_west_p',  title:'西部战区政治委员（上将）',                    system:'战区',           emoji:'⚔️', tier:4 },
  { id:'tc_south_c', title:'南部战区司令员（上将）',                      system:'战区',           emoji:'⚔️', tier:4 },
  { id:'tc_south_p', title:'南部战区政治委员（上将）',                    system:'战区',           emoji:'⚔️', tier:4 },
  { id:'tc_north_c', title:'北部战区司令员（上将）',                      system:'战区',           emoji:'⚔️', tier:4 },
  { id:'tc_north_p', title:'北部战区政治委员（上将）',                    system:'战区',           emoji:'⚔️', tier:4 },
  { id:'tc_cent_c',  title:'中部战区司令员（上将）',                      system:'战区',           emoji:'⚔️', tier:4 },
  { id:'tc_cent_p',  title:'中部战区政治委员（上将）',                    system:'战区',           emoji:'⚔️', tier:4 },
  // ── 军种 ──
  { id:'army_c',     title:'陆军司令员（上将）',                          system:'中枢军委',       emoji:'🪖', tier:4 },
  { id:'navy_c',     title:'海军司令员（上将）',                          system:'中枢军委',       emoji:'⚓', tier:4 },
  { id:'air_c',      title:'空军司令员（上将）',                          system:'中枢军委',       emoji:'✈️', tier:4 },
  { id:'rocket_c',   title:'火箭军司令员（上将）',                        system:'中枢军委',       emoji:'🚀', tier:4 },
  { id:'isf_c',      title:'信息支援部队司令员（上将）',                  system:'中枢军委',       emoji:'📡', tier:4 },
  // ── 国政院核心部委 ──
  { id:'fa',         title:'外交部部长',                                  system:'国政院部委',     emoji:'🌐', tier:4 },
  { id:'ndrc',       title:'国家发展和改革委员会主任',                    system:'国政院部委',     emoji:'📈', tier:4 },
  { id:'mof',        title:'财政部部长',                                  system:'国政院部委',     emoji:'💰', tier:4 },
  { id:'mps',        title:'公安部部长',                                  system:'国政院部委',     emoji:'🚔', tier:4 },
  { id:'moe',        title:'教育部部长',                                  system:'国政院部委',     emoji:'📚', tier:4 },
  { id:'nhc',        title:'国家卫生健康委员会主任',                      system:'国政院部委',     emoji:'🏥', tier:4 },
  { id:'miit',       title:'工业和信息化部部长',                          system:'国政院部委',     emoji:'🏭', tier:4 },
  { id:'mhurd',      title:'住房和城乡建设部部长',                        system:'国政院部委',     emoji:'🏗️', tier:4 },
  { id:'mara',       title:'农业农村部部长',                              system:'国政院部委',     emoji:'🌾', tier:4 },
  { id:'moj',        title:'司法部部长',                                  system:'国政院部委',     emoji:'⚖️', tier:4 },
  { id:'samr',       title:'国家市场监督管理总局局长',                    system:'国政院直属机构', emoji:'🏪', tier:4 },
  { id:'mee',        title:'生态环境部部长',                              system:'国政院部委',     emoji:'🌿', tier:4 },
  { id:'mot',        title:'交通运输部部长',                              system:'国政院部委',     emoji:'🚗', tier:4 },
  { id:'mhrss',      title:'人力资源和社会保障部部长',                    system:'国政院部委',     emoji:'👷', tier:4 },
  { id:'mss',        title:'国家安全部部长',                              system:'国政院部委',     emoji:'🔒', tier:4 },
  { id:'mnr',        title:'自然资源部部长',                              system:'国政院部委',     emoji:'🗺️', tier:4 },
  { id:'sasac',      title:'国政院国有资产监督管理委员会主任',            system:'国政院直属机构', emoji:'🏦', tier:4 },
  { id:'mca',        title:'民政部部长',                                  system:'国政院部委',     emoji:'🤝', tier:4 },
  { id:'mwr',        title:'水利部部长',                                  system:'国政院部委',     emoji:'💧', tier:4 },
  { id:'mvaa',       title:'退役军人事务部部长',                          system:'国政院部委',     emoji:'🎖️', tier:4 },
  { id:'mem',        title:'应急管理部部长',                              system:'国政院部委',     emoji:'🚨', tier:4 },
  { id:'neac',       title:'国家民族事务委员会主任',                      system:'国政院部委',     emoji:'🌐', tier:4 },
  { id:'mct',        title:'文化和旅游部部长',                            system:'国政院部委',     emoji:'🎭', tier:4 },
  { id:'most',       title:'科学技术部部长',                              system:'国政院部委',     emoji:'🔬', tier:4 },
  { id:'mofcom',     title:'商务部部长',                                  system:'国政院部委',     emoji:'🛍️', tier:4 },
  { id:'mohurd_c',   title:'国家能源局局长',                              system:'国政院直属机构', emoji:'⚡', tier:4 },
  { id:'nfga',       title:'国家粮食和物资储备局局长',                    system:'国政院直属机构', emoji:'🌾', tier:4 },
  { id:'nfa',        title:'国家林业和草原局局长',                        system:'国政院直属机构', emoji:'🌲', tier:4 },
  { id:'nhsa',       title:'国家金融监督管理总局局长',                    system:'国政院直属机构', emoji:'🏦', tier:4 },
  { id:'csrc',       title:'中国证券监督管理委员会主席',                  system:'国政院直属机构', emoji:'📊', tier:4 },
  { id:'nhia',       title:'国家医疗保障局局长',                          system:'国政院直属机构', emoji:'🏥', tier:4 },
  { id:'sta',        title:'国家税务总局局长',                            system:'国政院直属机构', emoji:'🧾', tier:4 },
  { id:'nrta',       title:'国家广播电视总局局长',                        system:'国政院直属机构', emoji:'📺', tier:4 },
  { id:'gsa',        title:'国家体育总局局长',                            system:'国政院直属机构', emoji:'⚽', tier:4 },
  { id:'nbs',        title:'国家统计局局长',                              system:'国政院直属机构', emoji:'📉', tier:4 },
  { id:'nra',        title:'国家铁路局局长',                              system:'国政院直属机构', emoji:'🚄', tier:4 },
  { id:'caac',       title:'中国民用航空局局长',                          system:'国政院直属机构', emoji:'✈️', tier:4 },
  { id:'pboc',       title:'华夏中央银行行长',                            system:'国政院直属机构', emoji:'🏦', tier:4 },
  // ── 中央党务机构 ──
  { id:'org',        title:'中枢组织部部长',                              system:'中共中央',       emoji:'🔴', tier:4 },
  { id:'cpd',        title:'中枢宣传部部长',                              system:'中枢宣传部',     emoji:'📢', tier:4 },
  { id:'ufwd',       title:'中枢统战部部长',                              system:'中枢统战部',     emoji:'🤝', tier:4 },
  { id:'cplc_s',     title:'中央政法委书记',                              system:'中央政法委',     emoji:'⚖️', tier:4 },
  { id:'cswb',       title:'中枢社会工作部部长',                          system:'中枢社会工作部', emoji:'🏘️', tier:4 },
  { id:'cpcsch',     title:'中央党校（国家行政学院）校长',                system:'中央党校',       emoji:'🏫', tier:4 },
  { id:'cac',        title:'中央网信办主任（国家互联网信息办公室主任）',  system:'中央网信委办公室', emoji:'🌐', tier:4 },
  { id:'cyd_league', title:'共青团中枢书记处第一书记',                    system:'群团组织',       emoji:'🌱', tier:4 },
  { id:'acftu',      title:'中华全国总工会主席',                          system:'群团组织',       emoji:'⚒️', tier:4 },
  { id:'acwf',       title:'中华全国妇女联合会主席',                      system:'群团组织',       emoji:'👩', tier:4 },
  // ── 纪检·司法系统 ──
  { id:'ccdi',       title:'中枢纪委常务副书记·国家监委副主任',          system:'中枢纪委',       emoji:'⚖️', tier:4 },
  { id:'spc',        title:'最高人民法院院长',                            system:'中央政法委',     emoji:'🏛️', tier:4 },
  { id:'spp',        title:'最高人民检察院检察长',                        system:'中央政法委',     emoji:'⚖️', tier:4 },
];

// ──────────────────────────────────────────────────────────
//  主领导人条目接口
// ──────────────────────────────────────────────────────────
interface Leader {
  id: string;
  title: string;
  system: string;
  emoji: string;
  tier: 1|2|3|4;           // 1=县 2=市 3=省 4=国家
  isPlayer?: boolean;
  isBoss?: boolean;
  bossLevel?: 1|2|3;
  province?: string;        // 所属省份（省级/地方领导用）
  badge?: string;           // 额外徽章文字（如"政治局委员"）
  badgeColor?: string;      // 徽章颜色（默认红色）
  profileSeed?: string;     // 覆盖档案种子（用于届次轮换）
}

// ──────────────────────────────────────────────────────────
//  Tab 定义
// ──────────────────────────────────────────────────────────
type TabKey = 'national' | 'province' | 'local' | 'military';

interface TabDef { key: TabKey; label: string; emoji: string }

function getTabDefs(rankLevel: number): TabDef[] {
  const tabs: TabDef[] = [
    { key: 'national', label: '国家领导人', emoji: '⭐' },
    { key: 'province', label: '省份领导',   emoji: '🏛️' },
    { key: 'military', label: '军队序列',   emoji: '🎖️' },
  ];
  // 镇(1-3)看县 / 县(4-6)看市 / 市(7-9)看省（省级领导单独tab）
  if (rankLevel <= 9) {
    const label = rankLevel <= 3 ? '所在县领导' : rankLevel <= 6 ? '所在市领导' : '所在省领导';
    tabs.splice(2, 0, { key: 'local', label, emoji: '📍' });
  }
  return tabs;
}

// ──────────────────────────────────────────────────────────
//  本级上级地方领导生成
// ──────────────────────────────────────────────────────────
function buildLocalLeaders(rankLevel: number, cityName: string, saveId: string, playerPosition?: string): Leader[] {
  // 本级班子里，玩家职位精确匹配
  const mp = (title: string) =>
    !!(playerPosition && (
      title === playerPosition ||
      playerPosition.replace(/（.*?）/, '').trim() === title.replace(/（.*?）/, '').trim()
    ));

  if (rankLevel <= 3) {
    // 镇级 → 查看所在县的领导班子
    const geoEntry = GEO_POOL[hashNum(saveId, 1) % GEO_POOL.length];
    const countyFull = geoEntry.counties[hashNum(saveId, 2) % geoEntry.counties.length];
    const headTitle = countyFull.endsWith('市') ? `${countyFull}市长`
      : countyFull.endsWith('区') ? `${countyFull}区长`
      : `${countyFull}县长`;
    return [
      { id:'county_sec', title:`${countyFull}委书记`,       system:countyFull, emoji:'🏛️', tier:1, isPlayer: mp(`${countyFull}委书记`) },
      { id:'county_gov', title: headTitle,                  system:countyFull, emoji:'🏠', tier:1, isPlayer: mp(headTitle) },
      { id:'county_npc', title:`${countyFull}议政院主任`,   system:countyFull, emoji:'⚖️', tier:1, isPlayer: mp(`${countyFull}议政院主任`) },
      { id:'county_cpp', title:`${countyFull}参政主席`,     system:countyFull, emoji:'🤝', tier:1, isPlayer: mp(`${countyFull}参政主席`) },
      { id:'county_org', title:`${countyFull}委组织部长`,   system:countyFull, emoji:'📋', tier:1, isPlayer: mp(`${countyFull}委组织部长`) },
      { id:'county_dis', title:`${countyFull}纪委书记`,     system:countyFull, emoji:'🔍', tier:1, isPlayer: mp(`${countyFull}纪委书记`) },
      { id:'county_pol', title:`${countyFull}委政法委书记`, system:countyFull, emoji:'🚔', tier:1, isPlayer: mp(`${countyFull}委政法委书记`) },
      { id:'county_mil', title:`${countyFull}人武部部长`,   system:'人武部',   emoji:'🪖', tier:1, isPlayer: mp(`${countyFull}人武部部长`) },
      { id:'county_lge', title:`${countyFull}团委书记`,     system:'团委',     emoji:'🌟', tier:1, isPlayer: mp(`${countyFull}团委书记`) },
    ];
  } else if (rankLevel <= 6) {
    // 县级 → 查看所在地级市的领导班子
    const geoEntry = GEO_POOL[hashNum(saveId, 1) % GEO_POOL.length];
    const cityFull = geoEntry.cities[hashNum(saveId, 3) % geoEntry.cities.length];
    const cityShort = cityFull.endsWith('市') ? cityFull : `${cityFull}市`;
    return [
      { id:'city_sec', title:`${cityShort}委书记`,          system:cityShort, emoji:'🏙️', tier:2, isPlayer: mp(`${cityShort}委书记`) },
      { id:'city_gov', title:`${cityShort}市长`,            system:cityShort, emoji:'🏢', tier:2, isPlayer: mp(`${cityShort}市长`) },
      { id:'city_npc', title:`${cityShort}议政院常委会主任`, system:cityShort, emoji:'⚖️', tier:2, isPlayer: mp(`${cityShort}议政院常委会主任`) },
      { id:'city_cpp', title:`${cityShort}参政主席`,        system:cityShort, emoji:'🤝', tier:2, isPlayer: mp(`${cityShort}参政主席`) },
      { id:'city_org', title:`${cityShort}委组织部长`,      system:cityShort, emoji:'📋', tier:2, isPlayer: mp(`${cityShort}委组织部长`) },
      { id:'city_dis', title:`${cityShort}纪委书记`,        system:cityShort, emoji:'🔍', tier:2, isPlayer: mp(`${cityShort}纪委书记`) },
      { id:'city_pol', title:`${cityShort}委政法委书记`,    system:cityShort, emoji:'🚔', tier:2, isPlayer: mp(`${cityShort}委政法委书记`) },
      { id:'city_mil', title:`${cityShort}军分区司令员`,    system:'军分区',  emoji:'🪖', tier:2, isPlayer: mp(`${cityShort}军分区司令员`) },
      { id:'city_pap', title:`${cityShort}武警支队长`,      system:'武警',    emoji:'🛡️', tier:2, isPlayer: mp(`${cityShort}武警支队长`) },
      { id:'city_lge', title:`${cityShort}团市委书记`,      system:'团委',    emoji:'🌟', tier:2, isPlayer: mp(`${cityShort}团市委书记`) },
    ];
  } else {
    // 市级(7-9) → 看省级领导
    const prov = cityName ? PROVINCES.find(p => cityName.includes(p.name)) : null;
    const provName = prov ? prov.name : '本省';
    const suffix = prov?.type === '直辖市' ? '市' : prov?.type === '特别行政区' ? '特区' : '省';
    const secT = prov?.secTitle ?? `${provName}${suffix}委书记`;
    const govT = prov?.govTitle ?? `${provName}省长`;
    return [
      { id:'prov_sec', title: secT,                                   system:provName, emoji:'🌲', tier:3, isPlayer: mp(secT) },
      { id:'prov_gov', title: govT,                                   system:provName, emoji:'🌿', tier:3, isPlayer: mp(govT) },
      { id:'prov_npc', title:`${provName}${suffix}议政院常委会主任`,   system:provName, emoji:'⚖️', tier:3, isPlayer: mp(`${provName}${suffix}议政院常委会主任`) },
      { id:'prov_cpp', title:`${provName}${suffix}参政主席`,           system:provName, emoji:'🤝', tier:3, isPlayer: mp(`${provName}${suffix}参政主席`) },
      { id:'prov_org', title:`${provName}${suffix}委组织部长`,         system:provName, emoji:'📋', tier:3, isPlayer: mp(`${provName}${suffix}委组织部长`) },
      { id:'prov_dis', title:`${provName}${suffix}纪委书记`,           system:provName, emoji:'🔍', tier:3, isPlayer: mp(`${provName}${suffix}纪委书记`) },
      { id:'prov_pol', title:`${provName}${suffix}委政法委书记`,       system:provName, emoji:'🚔', tier:3, isPlayer: mp(`${provName}${suffix}委政法委书记`) },
      { id:'prov_mil', title:`${provName}省军区司令员`,                system:'省军区', emoji:'🪖', tier:3, isPlayer: mp(`${provName}省军区司令员`) },
      { id:'prov_pap', title:`${provName}省武警总队长`,                system:'武警',   emoji:'🛡️', tier:3, isPlayer: mp(`${provName}省武警总队长`) },
      { id:'prov_lge', title:`${provName}${suffix}团委书记`,           system:'团委',   emoji:'🌟', tier:3, isPlayer: mp(`${provName}${suffix}团委书记`) },
    ];
  }
}

// ──────────────────────────────────────────────────────────
//  领导人档案卡（可展开）
// ──────────────────────────────────────────────────────────
const TIER_BG: Record<number, { bg: string; accent: string; border: string; label: string }> = {
  1: { bg:'#1B4332', accent:'#52B788', border:'#74C69D', label:'县处级' },
  2: { bg:'#1E3A5F', accent:'#6096BA', border:'#89C2D9', label:'地市级' },
  3: { bg:'#4A2040', accent:'#C77DFF', border:'#E0AAFF', label:'省部级' },
  4: { bg:'#3D0000', accent:'#FF6B6B', border:'#FFB3B3', label:'国家级' },
};

function LeaderCard({ leader, saveId, gameYear, bossName, boss2Name, boss3Name, rankLevel, playerBirthplace, playerName, playerAvatarUrl }: {
  leader: Leader;
  saveId: string;
  gameYear: number;
  bossName: string;
  boss2Name: string;
  boss3Name: string;
  rankLevel: number;
  playerBirthplace: string;
  playerName?: string;
  playerAvatarUrl?: string;
}) {
  const [open, setOpen] = useState(false);
  const cfg = TIER_BG[leader.tier];

  // 用 profileSeed（届次轮换）或 saveId+id 生成稳定档案
  const profile = useMemo(() =>
    generateProfile(leader.profileSeed ?? (saveId + leader.id), leader.tier, gameYear, leader.title),
    [leader.id, leader.tier, leader.title, leader.profileSeed, saveId, gameYear],
  );

  // 判断是否上司（简单匹配：title包含bossName对应职务）
  const isBoss = leader.isBoss;
  const isPlayer = leader.isPlayer;

  // 玩家显示名（真实姓名）
  const displayName = isPlayer && playerName ? playerName : profile.name;

  // ── 保密等级 ──
  const accessTier = getAccessTier(rankLevel);
  const isClassified = leader.tier > accessTier && !isPlayer;

  // ── 关系计算 ──
  const sameProvince = !!(leader.province && playerBirthplace && leader.province.includes(
    playerBirthplace.replace(/省$|壮族自治区$|自治区$/, '')
  ));
  const rel = useMemo(
    () => calcRelation(saveId, leader.id, leader.tier, sameProvince),
    [saveId, leader.id, leader.tier, sameProvince],
  );

  // ── 籍贯同乡判断（档案籍贯 vs 玩家籍贯）──
  const npcProvShort = profile.birthplace.replace(/省$|壮族自治区$|自治区$/, '');
  const playerProvShort = playerBirthplace.replace(/省$|壮族自治区$|自治区$/, '');
  const isSameNative = npcProvShort === playerProvShort && npcProvShort.length > 0;

  // ── 任期届数 ──
  const termInfo = useMemo(
    () => calcTermInfo(saveId + leader.id, leader.title, leader.tier, gameYear),
    [saveId, leader.id, leader.title, leader.tier, gameYear],
  );

  // ── 证件照头像 ──
  const isFemale = F_GIVEN.some(g => profile.name.endsWith(g.slice(-1)) && profile.name.length >= 2);
  const portraitUrl = pickPortrait(leader.id, leader.title, isFemale);

  const borderColor = isPlayer ? '#FFD700' : isBoss ? '#FF9800' : cfg.border + '80';
  const bgRow = isPlayer ? '#2A1A00' : isBoss ? '#1A0E00' : '#1A1A1A';

  return (
    <Pressable onPress={() => setOpen(v => !v)} style={{ marginBottom: 4 }}>
      {/* 主行 */}
      <View style={{ backgroundColor: bgRow, borderLeftWidth: 3, borderLeftColor: isPlayer ? '#FFD700' : isBoss ? '#FF9800' : cfg.accent, borderBottomWidth: 1, borderBottomColor: borderColor, flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, gap: 10 }}>
        {/* 证件照头像 */}
        <View style={{ width: 40, height: 48, backgroundColor: '#EDE8DF', borderWidth: 1.5, borderColor: isPlayer ? '#FFD700' : isBoss ? '#FF9800' : cfg.accent + '80', alignItems: 'center', justifyContent: 'center', borderRadius: 2, overflow: 'hidden' }}>
          {isPlayer ? (
            playerAvatarUrl ? (
              <Image source={{ uri: playerAvatarUrl }} style={{ width: 40, height: 48 }} contentFit="cover" />
            ) : (
              <Text style={{ fontSize: 22 }}>🏅</Text>
            )
          ) : isClassified ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <Text style={{ fontSize: 16, color: '#AA1111' }}>★</Text>
            </View>
          ) : (
            <Image
              source={{ uri: portraitUrl }}
              style={{ width: 40, height: 48 }}
              contentFit="cover"
            />
          )}
        </View>
        {/* 内容 */}
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: isPlayer ? '#FFD700' : isBoss ? '#FFA040' : '#F0E8D0', letterSpacing: 0.2 }}>
              {displayName}
            </Text>
            {isPlayer && <View style={{ backgroundColor: '#FFD700', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 1 }}><Text style={{ color: '#000', fontSize: 8, fontWeight: '800' }}>您</Text></View>}
            {isBoss && !isPlayer && (
              <View style={{ backgroundColor: '#FF980030', borderWidth: 1, borderColor: '#FF9800', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 1 }}>
                <Text style={{ color: '#FF9800', fontSize: 8, fontWeight: '700' }}>
                  {leader.bossLevel === 1 ? '⬆直属上司' : leader.bossLevel === 2 ? '⬆二级上司' : '⬆三级上司'}
                </Text>
              </View>
            )}
            {leader.badge && (
              <View style={{ backgroundColor: (leader.badgeColor ?? '#8B0000') + '30', borderWidth: 1, borderColor: leader.badgeColor ?? '#CC2200', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 1 }}>
                <Text style={{ color: leader.badgeColor ?? '#FF5555', fontSize: 8, fontWeight: '700' }}>
                  {leader.badge}
                </Text>
              </View>
            )}
            {/* 同乡标签 */}
            {isSameNative && !isClassified && (
              <View style={{ backgroundColor: '#1A3A1A', borderWidth: 1, borderColor: '#3A7A3A', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 1 }}>
                <Text style={{ color: '#66CC66', fontSize: 8, fontWeight: '700' }}>同乡</Text>
              </View>
            )}
            {/* 关系标签 */}
            {!isPlayer && (
              <View style={{ backgroundColor: rel.bgColor, borderWidth: 1, borderColor: rel.borderColor, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 1 }}>
                <Text style={{ color: rel.color, fontSize: 8, fontWeight: '600' }}>{rel.label}</Text>
              </View>
            )}
            {leader.province && (
              <View style={{ backgroundColor: cfg.bg, borderWidth: 1, borderColor: cfg.border + '60', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 1 }}>
                <Text style={{ color: cfg.accent, fontSize: 8 }}>{leader.province}</Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 10, color: isBoss || isPlayer ? '#FFA040' : '#8A8070', letterSpacing: 0.2 }} numberOfLines={1}>
            {leader.title}
          </Text>
        </View>
        {/* 展开箭头 */}
        <Text style={{ color: cfg.accent + '80', fontSize: 12 }}>{open ? '▲' : '▼'}</Text>
      </View>

      {/* 仕途档案展开区 */}
      {open && (
        <View style={{ backgroundColor: '#111', borderLeftWidth: 3, borderLeftColor: cfg.accent + '50', paddingHorizontal: 14, paddingVertical: 12, gap: 10 }}>
          {isClassified ? (
            /* ── 机密遮挡 ── */
            <View style={{ alignItems: 'center', paddingVertical: 20, gap: 8 }}>
              <Text style={{ fontSize: 28, color: '#AA1111' }}>★</Text>
              <Text style={{ color: '#CC2200', fontSize: 13, fontWeight: '700', letterSpacing: 2 }}>机密档案</Text>
              <Text style={{ color: '#884444', fontSize: 10, textAlign: 'center' }}>
                权限不足，无法查阅{'\n'}
                {leader.tier === 4 ? '需达到省部级及以上' : leader.tier === 3 ? '需达到市厅级及以上' : '需达到县处级及以上'}方可解锁
              </Text>
            </View>
          ) : (
            <>
              {/* 基本信息 */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {[
                  { label: '出生', value: `${profile.birthYear}年` },
                  { label: '年龄', value: `${profile.age}岁` },
                  { label: '籍贯', value: profile.birthplace.replace('省','').replace('壮族自治区','') },
                  { label: '入党', value: `${profile.partyYear}年` },
                ].map(item => (
                  <View key={item.label} style={{ backgroundColor: cfg.bg + '80', borderWidth: 1, borderColor: cfg.border + '40', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 2 }}>
                    <Text style={{ color: cfg.accent + 'AA', fontSize: 9 }}>{item.label}</Text>
                    <Text style={{ color: '#E0D8C0', fontSize: 11, fontWeight: '600', marginTop: 1 }}>{item.value}</Text>
                  </View>
                ))}
              </View>
              {/* 同乡友好提示 */}
              {isSameNative && (
                <View style={{ backgroundColor: '#0D2A0D', borderWidth: 1, borderColor: '#2A6A2A', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 2, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ color: '#55AA55', fontSize: 10, fontWeight: '700' }}>同乡·友好</Text>
                  <Text style={{ color: '#447744', fontSize: 9 }}>与您同为{npcProvShort}籍，初始关系较佳</Text>
                </View>
              )}
              {/* 任期届数 */}
              <View style={{ backgroundColor: '#1A1208', borderWidth: 1, borderColor: '#4A3A1A', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: '#AA8830', fontSize: 9, letterSpacing: 0.5 }}>任期</Text>
                <Text style={{ color: '#D4AF37', fontSize: 11, fontWeight: '700' }}>{termInfo.line}</Text>
              </View>
              <View style={{ backgroundColor: cfg.bg + '60', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 2 }}>
                <Text style={{ color: cfg.accent + 'AA', fontSize: 9, marginBottom: 2 }}>教育背景</Text>
                <Text style={{ color: '#D0C8B0', fontSize: 11 }}>{profile.education}</Text>
              </View>
              {/* 任职经历 */}
              <View>
                <Text style={{ color: cfg.accent + 'AA', fontSize: 9, marginBottom: 6, letterSpacing: 1 }}>▌ 主要任职经历</Text>
                {profile.career.map((c, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 5, alignItems: 'flex-start' }}>
                    <View style={{ width: 78, backgroundColor: cfg.bg + '80', paddingHorizontal: 4, paddingVertical: 2, alignItems: 'center', borderRadius: 1 }}>
                      <Text style={{ color: cfg.accent, fontSize: 9, fontWeight: '600' }}>{c.years}</Text>
                    </View>
                    <Text style={{ flex: 1, color: '#C0B8A0', fontSize: 11, lineHeight: 16, paddingTop: 1 }}>{c.position}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      )}
    </Pressable>
  );
}

// ──────────────────────────────────────────────────────────
//  搜索 + 系统筛选组件
// ──────────────────────────────────────────────────────────
const FILTER_OPTIONS = ['全部', '党务', '政府', '军队', '纪检', '议政院·参政院'] as const;
type FilterOption = typeof FILTER_OPTIONS[number];

function SearchFilter({ search, onSearch, filter, onFilter }: {
  search: string;
  onSearch: (v: string) => void;
  filter: FilterOption;
  onFilter: (v: FilterOption) => void;
}) {
  return (
    <View style={{ backgroundColor: '#111', borderBottomWidth: 1, borderBottomColor: '#2A1A0A', paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
      {/* 搜索框 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#3A2A0A', borderRadius: 2, paddingHorizontal: 10, height: 32, gap: 6 }}>
        <Text style={{ color: '#664433', fontSize: 12 }}>🔍</Text>
        <TextInput
          style={{ flex: 1, color: '#E0D0B0', fontSize: 12, height: 32 }}
          placeholder="搜索姓名或职务…"
          placeholderTextColor="#4A3A2A"
          value={search}
          onChangeText={onSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <Pressable onPress={() => onSearch('')} hitSlop={8}>
            <Text style={{ color: '#664433', fontSize: 14 }}>✕</Text>
          </Pressable>
        )}
      </View>
      {/* 系统筛选 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {FILTER_OPTIONS.map(f => {
          const active = filter === f;
          return (
            <Pressable
              key={f}
              onPress={() => onFilter(f)}
              style={{ backgroundColor: active ? '#DE2910' : '#1A0A0A', borderWidth: 1, borderColor: active ? '#DE2910' : '#3A2A0A', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 1 }}
            >
              <Text style={{ color: active ? '#FFFFFF' : '#6A5A3A', fontSize: 10, fontWeight: active ? '700' : '400' }}>{f}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ── 过滤工具函数 ──
function matchesSearch(title: string, system: string, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim();
  return title.includes(q) || system.includes(q);
}
function matchesFilter(title: string, system: string, filter: FilterOption): boolean {
  if (filter === '全部') return true;
  return getSystemCategory(title, system) === filter;
}

// ──────────────────────────────────────────────────────────
//  省份 Tab — 三级钻取：区域 → 省份 → 领导名单
// ──────────────────────────────────────────────────────────
const REGION_GROUPS: Array<{ label: string; emoji: string; names: string[] }> = [
  { label: '直辖市',     emoji: '🏙️', names: ['北京','天津','上海','重庆'] },
  { label: '东北地区',   emoji: '❄️', names: ['辽宁','吉林','黑龙江'] },
  { label: '华北地区',   emoji: '🏔️', names: ['河北','山西','内蒙古'] },
  { label: '华东地区',   emoji: '🌊', names: ['江苏','浙江','安徽','福建','江西','山东'] },
  { label: '华中地区',   emoji: '🌾', names: ['河南','湖北','湖南'] },
  { label: '华南地区',   emoji: '🌴', names: ['广东','广西','海南'] },
  { label: '西南地区',   emoji: '🏞️', names: ['四川','贵州','云南','西藏'] },
  { label: '西北地区',   emoji: '🐫', names: ['陕西','甘肃','青海','宁夏','新疆'] },
  { label: '特别行政区', emoji: '🏢', names: ['香港','澳门'] },
];

// 构建某个省份的领导人列表
function buildProvLeaders(
  prov: typeof PROVINCES[number],
  cityName: string,
  rankLevel: number,
  playerPosition?: string,
) {
  const isPlayerProv = cityName.includes(prov.name);
  const pfx = prov.name;
  const sfx = prov.type === '直辖市' ? '市' : prov.type === '特别行政区' ? '' : '省';
  const npcNpc   = prov.type === '直辖市' ? `${pfx}市议政院常委会主任` : `${pfx}${sfx}议政院常委会主任`;
  const npcCppcc = prov.type === '直辖市' ? `${pfx}市参政主席`       : `${pfx}${sfx}参政主席`;
  const npcOrg   = `${pfx}${sfx}委组织部长`;
  const npcCcdi  = `${pfx}${sfx}纪委书记`;
  const npcPol   = `${pfx}${sfx}委政法委书记`;

  // 玩家职位精确匹配辅助：只在玩家所在省注入
  const matchPlayer = (title: string) =>
    !!(isPlayerProv && playerPosition && (
      title === playerPosition ||
      playerPosition.includes(title.replace(/（.*?）/, '').trim()) ||
      title.replace(/（.*?）/, '').trim() === playerPosition.replace(/（.*?）/, '').trim()
    ));

  return {
    isPlayerProv,
    leaders: [
      { id: `prov_sec_${pfx}`,   title: prov.secTitle, emoji: prov.type === '特别行政区' ? '🏢' : '🌲',
        isBoss: isPlayerProv && rankLevel >= 9 && !matchPlayer(prov.secTitle),
        isPlayer: matchPlayer(prov.secTitle),
        badge: prov.isPBM ? '政治局委员' : undefined },
      { id: `prov_gov_${pfx}`,   title: prov.govTitle, emoji: prov.type === '特别行政区' ? '🏛️' : '🌿',
        isBoss: false, isPlayer: matchPlayer(prov.govTitle) },
      ...(prov.type !== '特别行政区' ? [{
        id: `prov_vsec_${pfx}`,
        title: prov.type === '直辖市' ? `${pfx}市委副书记（专职）` : `${pfx}${sfx}委副书记（专职）`,
        emoji: '📌', isBoss: false,
        isPlayer: matchPlayer(prov.type === '直辖市' ? `${pfx}市委副书记（专职）` : `${pfx}${sfx}委副书记（专职）`),
      }] : []),
      { id: `prov_npc_${pfx}`,   title: npcNpc,   emoji: '⚖️', isBoss: false, isPlayer: matchPlayer(npcNpc) },
      { id: `prov_cppcc_${pfx}`, title: npcCppcc, emoji: '🤝', isBoss: false, isPlayer: matchPlayer(npcCppcc) },
      { id: `prov_org_${pfx}`,   title: npcOrg,   emoji: '📋', isBoss: false, isPlayer: matchPlayer(npcOrg) },
      { id: `prov_ccdi_${pfx}`,  title: npcCcdi,  emoji: '🔍', isBoss: false, isPlayer: matchPlayer(npcCcdi) },
      { id: `prov_pol_${pfx}`,   title: npcPol,   emoji: '🚔', isBoss: false, isPlayer: matchPlayer(npcPol) },
    ],
  };
}

type DrillView = 'regions' | 'provinces' | 'leaders';

function ProvinceTab({ saveId, rankLevel, cityName, gameYear, bossName, boss2Name, boss3Name, playerBirthplace, playerName, playerPosition, playerAvatarUrl }: {
  saveId: string; rankLevel: number; cityName: string; gameYear: number;
  bossName: string; boss2Name: string; boss3Name: string;
  playerBirthplace: string;
  playerName?: string; playerPosition?: string; playerAvatarUrl?: string;
}) {
  const [drillView, setDrillView] = useState<DrillView>('regions');
  const [selectedRegion, setSelectedRegion] = useState<typeof REGION_GROUPS[number] | null>(null);
  const [selectedProv, setSelectedProv]     = useState<typeof PROVINCES[number] | null>(null);
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState<FilterOption>('全部');

  // 进入省列表
  const openRegion = (group: typeof REGION_GROUPS[number]) => {
    setSelectedRegion(group);
    setDrillView('provinces');
  };

  // 进入领导名单
  const openProv = (prov: typeof PROVINCES[number]) => {
    setSelectedProv(prov);
    setSearch('');
    setFilter('全部');
    setDrillView('leaders');
  };

  // 返回上一级
  const goBack = () => {
    if (drillView === 'leaders')   { setDrillView('provinces'); setSelectedProv(null); }
    else if (drillView === 'provinces') { setDrillView('regions'); setSelectedRegion(null); }
  };

  // ── Level 1：区域列表 ──────────────────────────────────
  if (drillView === 'regions') {
    return (
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: '#111', borderLeftWidth: 3, borderLeftColor: '#DE2910', paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 }}>
          <Text style={{ color: '#FFD0A0', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>请选择地区</Text>
          <Text style={{ color: '#5A4A2A', fontSize: 9, marginTop: 2 }}>共 {PROVINCES.length} 个省级行政区</Text>
        </View>
        {REGION_GROUPS.map(group => {
          const provs = PROVINCES.filter(p => group.names.includes(p.name));
          // 是否包含玩家所在省
          const hasPlayerProv = provs.some(p => cityName.includes(p.name));
          return (
            <Pressable
              key={group.label}
              onPress={() => openRegion(group)}
              style={{
                backgroundColor: hasPlayerProv ? '#1A0E00' : '#161212',
                borderWidth: 1,
                borderColor: hasPlayerProv ? '#FF980060' : '#2A1A0A',
                marginBottom: 6,
                paddingHorizontal: 14,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Text style={{ fontSize: 22 }}>{group.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFD0A0', fontSize: 13, fontWeight: '700' }}>{group.label}</Text>
                <Text style={{ color: '#5A4A2A', fontSize: 10, marginTop: 2 }}>
                  {group.names.join('  ')}
                </Text>
              </View>
              {hasPlayerProv && (
                <View style={{ backgroundColor: '#FF980025', borderWidth: 1, borderColor: '#FF980060', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 1 }}>
                  <Text style={{ color: '#FF9800', fontSize: 9 }}>📍 所在地</Text>
                </View>
              )}
              <Text style={{ color: '#5A4A2A', fontSize: 16 }}>›</Text>
            </Pressable>
          );
        })}
        <View style={{ height: 20 }} />
      </ScrollView>
    );
  }

  // ── Level 2：省份列表 ──────────────────────────────────
  if (drillView === 'provinces' && selectedRegion) {
    const provs = PROVINCES.filter(p => selectedRegion.names.includes(p.name));
    return (
      <View style={{ flex: 1 }}>
        {/* 面包屑返回栏 */}
        <Pressable
          onPress={goBack}
          style={{ backgroundColor: '#1A1010', borderBottomWidth: 1, borderBottomColor: '#2A1A0A', paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <Text style={{ color: '#CC9944', fontSize: 20, lineHeight: 22 }}>‹</Text>
          <Text style={{ color: '#8B6914', fontSize: 10 }}>全部地区</Text>
          <Text style={{ color: '#4A3A1A', fontSize: 10 }}>/</Text>
          <Text style={{ color: '#FFD0A0', fontSize: 10, fontWeight: '700' }}>{selectedRegion.emoji} {selectedRegion.label}</Text>
        </Pressable>
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {provs.map(prov => {
            const isPlayerProv = cityName.includes(prov.name);
            const playerProvShort = playerBirthplace.replace(/省$|壮族自治区$|自治区$/, '');
            const isNative = prov.name.includes(playerProvShort) && playerProvShort.length > 0;
            return (
              <Pressable
                key={prov.name}
                onPress={() => openProv(prov)}
                style={{
                  backgroundColor: isPlayerProv ? '#1A0E00' : '#161212',
                  borderWidth: 1,
                  borderColor: isPlayerProv ? '#FF980060' : '#2A1A0A',
                  marginBottom: 5,
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ color: '#FFD0A0', fontSize: 14, fontWeight: '700' }}>{prov.name}</Text>
                    {prov.isPBM && (
                      <View style={{ backgroundColor: '#8B000030', borderWidth: 1, borderColor: '#CC2200', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 1 }}>
                        <Text style={{ color: '#FF5555', fontSize: 8, fontWeight: '700' }}>政治局委员省</Text>
                      </View>
                    )}
                    {isNative && (
                      <View style={{ backgroundColor: '#1A3A1A', borderWidth: 1, borderColor: '#3A7A3A', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 1 }}>
                        <Text style={{ color: '#66CC66', fontSize: 8, fontWeight: '700' }}>籍贯</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: '#5A4A2A', fontSize: 9, marginTop: 3 }}>
                    {prov.secTitle.replace(prov.name, '').replace(/^市/, '')}  ·  {prov.govTitle.replace(prov.name, '').replace(/^市/, '')}
                  </Text>
                </View>
                {isPlayerProv && (
                  <View style={{ backgroundColor: '#FF980025', borderWidth: 1, borderColor: '#FF980060', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 1 }}>
                    <Text style={{ color: '#FF9800', fontSize: 9 }}>📍</Text>
                  </View>
                )}
                <Text style={{ color: '#5A4A2A', fontSize: 16 }}>›</Text>
              </Pressable>
            );
          })}
          <View style={{ height: 20 }} />
        </ScrollView>
      </View>
    );
  }

  // ── Level 3：领导名单 ──────────────────────────────────
  if (drillView === 'leaders' && selectedRegion && selectedProv) {
    const prov = selectedProv;
    const { isPlayerProv, leaders: provLeaders } = buildProvLeaders(prov, cityName, rankLevel, playerPosition);

    const filtered = provLeaders.filter(l =>
      matchesSearch(l.title, prov.name, search) &&
      matchesFilter(l.title, prov.name, filter)
    );

    return (
      <View style={{ flex: 1 }}>
        {/* 面包屑返回栏 */}
        <Pressable
          onPress={goBack}
          style={{ backgroundColor: '#1A1010', borderBottomWidth: 1, borderBottomColor: '#2A1A0A', paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <Text style={{ color: '#CC9944', fontSize: 20, lineHeight: 22 }}>‹</Text>
          <Text style={{ color: '#8B6914', fontSize: 10 }}>{selectedRegion.label}</Text>
          <Text style={{ color: '#4A3A1A', fontSize: 10 }}>/</Text>
          <Text style={{ color: '#FFD0A0', fontSize: 10, fontWeight: '700' }}>{prov.name}领导班子</Text>
          {isPlayerProv && <Text style={{ color: '#FF9800', fontSize: 9 }}>📍 所在地</Text>}
        </Pressable>
        <SearchFilter search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} />
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {filtered.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ color: '#4A3A2A', fontSize: 12 }}>无匹配结果</Text>
            </View>
          ) : (
            filtered.map(l => (
              <LeaderCard
                key={l.id}
                leader={{ id: l.id, title: l.title, system: prov.name, emoji: l.emoji, tier: 3, province: prov.name, isBoss: l.isBoss, bossLevel: 1, badge: l.badge }}
                saveId={saveId} gameYear={gameYear} bossName={bossName} boss2Name={boss2Name} boss3Name={boss3Name}
                rankLevel={rankLevel} playerBirthplace={playerBirthplace}
              />
            ))
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      </View>
    );
  }

  return null;
}

// ──────────────────────────────────────────────────────────
//  军队页面数据常量
// ──────────────────────────────────────────────────────────
// 五大战区（2016年军改后）
const THEATER_DATA = [
  { id:'tc_east',    name:'东部战区', hq:'南京', region:'台海·东海方向',   emoji:'⚔️', color:'#1A3A1A' },
  { id:'tc_south',   name:'南部战区', hq:'广州', region:'南海·东南亚方向', emoji:'🌊', color:'#1A2A3A' },
  { id:'tc_west',    name:'西部战区', hq:'成都', region:'西部·高原方向',   emoji:'🏔️', color:'#2A1A3A' },
  { id:'tc_north',   name:'北部战区', hq:'沈阳', region:'东北·蒙古方向',  emoji:'❄️', color:'#1A2A2A' },
  { id:'tc_central', name:'中部战区', hq:'北京', region:'首都防卫方向',    emoji:'🛡️', color:'#3A2A1A' },
];

// 各军种司令部
const SERVICE_DATA = [
  { id:'svc_army',   name:'陆军',       emoji:'🪖', desc:'陆军司令部·北京' },
  { id:'svc_navy',   name:'海军',       emoji:'⚓', desc:'海军司令部·北京' },
  { id:'svc_air',    name:'空军',       emoji:'✈️', desc:'空军司令部·北京' },
  { id:'svc_rocket', name:'火箭军',     emoji:'🚀', desc:'火箭军司令部·北京' },
  { id:'svc_info',   name:'信息支援部队', emoji:'📡', desc:'信息支援部队·北京' },
  { id:'svc_jlsb',  name:'联勤保障部队', emoji:'🔧', desc:'联勤保障部队·武汉' },
];

// ──────────────────────────────────────────────────────────
//  军队 Tab
// ──────────────────────────────────────────────────────────
function MilitaryTab({ saveId, gameYear, bossName, boss2Name, boss3Name, rankLevel, playerBirthplace, playerName, playerAvatarUrl }: {
  saveId: string; gameYear: number;
  bossName: string; boss2Name: string; boss3Name: string;
  rankLevel: number; playerBirthplace: string;
  playerName?: string; playerAvatarUrl?: string;
}) {
  const [expandedTheaters, setExpandedTheaters] = useState<Set<string>>(
    () => new Set(THEATER_DATA.map(t => t.id))
  );
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterOption>('全部');

  const toggleTheater = (id: string) => {
    setExpandedTheaters(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── 中枢军委层（共用国家级id，名字联动） ──
  const cmcLeaders: Leader[] = [
    // 中枢军委主席 = 总执书记（共用 psc1 的 id）
    { id:'psc1',  title:'中枢军事委员会主席（最高统帅）', system:'中枢军委', emoji:'⭐', tier:4 },
    // 军委副主席（共用 cmc1/cmc2 id，与国家级Tab名字相同）
    { id:'cmc1',  title:'中枢军委副主席（主持联合作战）', system:'中枢军委', emoji:'🎖️', tier:4 },
    { id:'cmc2',  title:'中枢军委副主席（主持战略后勤）', system:'中枢军委', emoji:'🎖️', tier:4 },
    // 国防部长 = 国政委员兼国防部长（共用 sc2 id）
    { id:'sc2',   title:'国防部部长（国政委员兼）',        system:'中枢军委', emoji:'🛡️', tier:4 },
  ];

  // 军委直属机构领导
  const cmcOrgLeaders: Leader[] = [
    { id:'cjcs',  title:'中枢军委联合参谋部参谋长（上将）',      system:'联合参谋部', emoji:'⭐', tier:4 },
    { id:'gpd',   title:'中枢军委政治工作部主任（上将）',         system:'政治工作部', emoji:'🎖️', tier:4 },
    { id:'glb',   title:'中枢军委后勤保障部部长（上将）',         system:'后勤保障部', emoji:'🔧', tier:4 },
    { id:'ead',   title:'中枢军委装备发展部部长（上将）',         system:'装备发展部', emoji:'⚙️', tier:4 },
    { id:'njw',   title:'中枢军委纪律检查委员会书记（上将）',     system:'军委纪委',   emoji:'🔍', tier:4 },
  ];

  return (
    <View style={{ flex: 1 }}>
      <SearchFilter search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} />
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* 中枢军委 */}
        {cmcLeaders.filter(l => matchesSearch(l.title, l.system, search) && matchesFilter(l.title, l.system, filter)).length > 0 && (
          <View style={{ marginBottom: 10 }}>
            <View style={{ backgroundColor: '#1A0000', borderLeftWidth: 3, borderLeftColor: '#CC2200', paddingHorizontal: 12, paddingVertical: 7, marginBottom: 4 }}>
              <Text style={{ color: '#FF8888', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>🏴 中枢军事委员会</Text>
              <Text style={{ color: '#884444', fontSize: 9, marginTop: 2 }}>中国人民解放军最高领导机构</Text>
            </View>
            {cmcLeaders.filter(l => matchesSearch(l.title, l.system, search) && matchesFilter(l.title, l.system, filter)).map(l => (
              <LeaderCard key={l.id} leader={l} saveId={saveId} gameYear={gameYear} bossName={bossName} boss2Name={boss2Name} boss3Name={boss3Name} rankLevel={rankLevel} playerBirthplace={playerBirthplace} playerName={playerName} playerAvatarUrl={playerAvatarUrl} />
            ))}
          </View>
        )}

        {/* 军委直属机构 */}
        {cmcOrgLeaders.filter(l => matchesSearch(l.title, l.system, search) && matchesFilter(l.title, l.system, filter)).length > 0 && (
          <View style={{ marginBottom: 10 }}>
            <View style={{ backgroundColor: '#0D1A0D', borderLeftWidth: 3, borderLeftColor: '#446644', paddingHorizontal: 12, paddingVertical: 7, marginBottom: 4 }}>
              <Text style={{ color: '#88CC88', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>⚙️ 军委直属机构</Text>
              <Text style={{ color: '#446644', fontSize: 9, marginTop: 2 }}>联参·政工·后勤·装备·纪委</Text>
            </View>
            {cmcOrgLeaders.filter(l => matchesSearch(l.title, l.system, search) && matchesFilter(l.title, l.system, filter)).map(l => (
              <LeaderCard key={l.id} leader={l} saveId={saveId} gameYear={gameYear} bossName={bossName} boss2Name={boss2Name} boss3Name={boss3Name} rankLevel={rankLevel} playerBirthplace={playerBirthplace} playerName={playerName} playerAvatarUrl={playerAvatarUrl} />
            ))}
          </View>
        )}

        {/* 五大战区 */}
        <View style={{ marginBottom: 6 }}>
          <View style={{ backgroundColor: '#0D1520', borderLeftWidth: 3, borderLeftColor: '#2266AA', paddingHorizontal: 12, paddingVertical: 7, marginBottom: 6 }}>
            <Text style={{ color: '#88AADD', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>🗺️ 五大战区（联合作战指挥机构）</Text>
            <Text style={{ color: '#445566', fontSize: 9, marginTop: 2 }}>2016年军改后设立，统一作战指挥</Text>
          </View>
          {THEATER_DATA.map(tc => {
            const expanded = expandedTheaters.has(tc.id);
            const cmdLeader: Leader = { id: `${tc.id}_cmd`, title: `${tc.name}司令员（上将）`, system: tc.name, emoji: tc.emoji, tier: 4 };
            const polLeader: Leader = { id: `${tc.id}_pol`, title: `${tc.name}政委（上将）`,   system: tc.name, emoji: '🎗️', tier: 4 };
            const tcLeaders = [cmdLeader, polLeader].filter(l =>
              matchesSearch(l.title, l.system, search) && matchesFilter(l.title, l.system, filter)
            );
            if (tcLeaders.length === 0) return null;
            return (
              <View key={tc.id} style={{ marginBottom: 6, borderWidth: 1, borderColor: '#1E3050' }}>
                <Pressable onPress={() => toggleTheater(tc.id)} style={{ backgroundColor: tc.color, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 18 }}>{tc.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#DDEEFF', fontSize: 12, fontWeight: '700' }}>{tc.name}</Text>
                    <Text style={{ color: '#7799AA', fontSize: 9, marginTop: 1 }}>司令部·{tc.hq}  ·  {tc.region}</Text>
                  </View>
                  <Text style={{ color: '#7799AA', fontSize: 12 }}>{expanded ? '▲' : '▼'}</Text>
                </Pressable>
                {expanded && tcLeaders.map(l => (
                  <LeaderCard key={l.id} leader={l} saveId={saveId} gameYear={gameYear} bossName={bossName} boss2Name={boss2Name} boss3Name={boss3Name} rankLevel={rankLevel} playerBirthplace={playerBirthplace} playerName={playerName} playerAvatarUrl={playerAvatarUrl} />
                ))}
              </View>
            );
          })}
        </View>

        {/* 武警部队 */}
        {([
          { id:'pap_cmd', title:'武装警察部队司令员（上将）',   emoji:'🦺' },
          { id:'pap_pol', title:'武装警察部队政治委员（上将）', emoji:'🎗️' },
        ] as Leader[]).filter(l => matchesSearch(l.title, '武警部队', search) && matchesFilter(l.title, '武警部队', filter)).length > 0 && (
          <View style={{ marginBottom: 10 }}>
            <View style={{ backgroundColor: '#100A1A', borderLeftWidth: 3, borderLeftColor: '#7744AA', paddingHorizontal: 12, paddingVertical: 7, marginBottom: 4 }}>
              <Text style={{ color: '#BB99EE', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>🦺 中国人民武装警察部队</Text>
              <Text style={{ color: '#443355', fontSize: 9, marginTop: 2 }}>由中枢军委统一领导·2018年改革后划归军委直管</Text>
            </View>
            {([
              { id:'pap_cmd', title:'武装警察部队司令员（上将）',   emoji:'🦺' },
              { id:'pap_pol', title:'武装警察部队政治委员（上将）', emoji:'🎗️' },
            ] as Leader[]).filter(l => matchesSearch(l.title, '武警部队', search) && matchesFilter(l.title, '武警部队', filter)).map(l => (
              <LeaderCard key={l.id} leader={{ ...l, system:'武警部队', tier:4 }} saveId={saveId} gameYear={gameYear} bossName={bossName} boss2Name={boss2Name} boss3Name={boss3Name} rankLevel={rankLevel} playerBirthplace={playerBirthplace} playerName={playerName} playerAvatarUrl={playerAvatarUrl} />
            ))}
          </View>
        )}

        {/* 各军种 */}
        <View style={{ marginBottom: 10 }}>
          <View style={{ backgroundColor: '#1A150D', borderLeftWidth: 3, borderLeftColor: '#AA8822', paddingHorizontal: 12, paddingVertical: 7, marginBottom: 4 }}>
            <Text style={{ color: '#DDBB66', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>🪖 各军种司令部</Text>
            <Text style={{ color: '#665533', fontSize: 9, marginTop: 2 }}>陆·海·空·火箭军·信息支援·联勤</Text>
          </View>
          {SERVICE_DATA.map(svc => {
            const cmdLeader: Leader = { id: `${svc.id}_cmd`, title: `${svc.name}司令员（上将）`, system: svc.name, emoji: svc.emoji, tier: 4 };
            const polLeader: Leader = { id: `${svc.id}_pol`, title: `${svc.name}政治工作部主任（上将）`, system: svc.name, emoji: '🎗️', tier: 4 };
            const svcLeaders = [cmdLeader, polLeader].filter(l =>
              matchesSearch(l.title, l.system, search) && matchesFilter(l.title, l.system, filter)
            );
            if (svcLeaders.length === 0) return null;
            return (
              <View key={svc.id} style={{ marginBottom: 4 }}>
                <View style={{ backgroundColor: '#111008', paddingHorizontal: 10, paddingVertical: 4, borderLeftWidth: 2, borderLeftColor: '#665533', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 14 }}>{svc.emoji}</Text>
                  <View>
                    <Text style={{ color: '#CCAA55', fontSize: 11, fontWeight: '700' }}>{svc.name}</Text>
                    <Text style={{ color: '#554422', fontSize: 9 }}>{svc.desc}</Text>
                  </View>
                </View>
                {svcLeaders.map(l => (
                  <LeaderCard key={l.id} leader={l} saveId={saveId} gameYear={gameYear} bossName={bossName} boss2Name={boss2Name} boss3Name={boss3Name} rankLevel={rankLevel} playerBirthplace={playerBirthplace} playerName={playerName} playerAvatarUrl={playerAvatarUrl} />
                ))}
              </View>
            );
          })}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

// ──────────────────────────────────────────────────────────
//  届次轮换辅助：基于 gameYear 计算当前党代会届次纪元
//  党代会5年制：19届锚点2017，每届NPC完全更换
// ──────────────────────────────────────────────────────────
function getNationalTermEpoch(gameYear: number): number {
  return Math.floor((gameYear - 2017) / 5);
}

// ──────────────────────────────────────────────────────────
//  国家领导人 Tab
// ──────────────────────────────────────────────────────────
function NationalTab({ saveId, rankLevel, playerName, playerPosition, playerAvatarUrl, cityName, gameYear, bossName, boss2Name, boss3Name, playerBirthplace }: {
  saveId: string; rankLevel: number; playerName: string; playerPosition: string; playerAvatarUrl?: string;
  cityName: string; gameYear: number; bossName: string; boss2Name: string; boss3Name: string;
  playerBirthplace: string;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterOption>('全部');

  // 届次纪元：每5年换届，NPC档案（姓名/履历）完全更新
  const termEpoch = getNationalTermEpoch(gameYear);

  const allLeaders: Leader[] = useMemo(() => {
    const result: Leader[] = [];
    // PSC 7常委（特殊种子，不随届次变化——保持稳定性）
    NATIONAL_PSC.forEach(p => {
      const isPlayer = (rankLevel === 14 && p.id === 'psc2') || (rankLevel === 15 && p.id === 'psc1');
      result.push({ ...p, isPlayer });
    });
    // 其他国家级职位：带届次种子，换届即换人
    NATIONAL_OTHERS.forEach(p => {
      const isPlayer = rankLevel === 12 && cityName && p.title.includes(cityName.slice(0, 4));
      result.push({
        ...p,
        isPlayer: !!isPlayer,
        // profileSeed 带入届次纪元，换届后档案完全更新
        profileSeed: saveId + p.id + '_ep' + termEpoch,
      });
    });
    // 玩家副院理特殊条目（rank=13）
    if (rankLevel === 13) {
      result.push({ id:'player_vp', title: playerPosition || '国政院副院理', system:'国政院', emoji:'🏅', tier:4, isPlayer: true });
    }
    return result;
  }, [rankLevel, playerName, playerPosition, cityName, saveId, termEpoch]);

  // ── 全量分组：覆盖 NATIONAL_PSC + NATIONAL_OTHERS 的所有 id ──
  const sections: Array<{ label: string; ids: string[]; note?: string }> = [
    {
      label: '中枢决策常委会（7常委）',
      ids: ['psc1','psc2','psc3','psc4','psc5','psc6','psc7','player_vp'],
      note: '党和国家最高权力核心',
    },
    {
      label: '华夏主席·华夏副主席',
      ids: ['vp'],
      note: '国家宪法职务·对外礼宾',
    },
    {
      label: '国政院（副院理·国政委员·秘书长）',
      ids: ['vp1','vp2','vp3','sc1','sc2','sc3','sc4','sg'],
      note: '常务副院理已列入常委会',
    },
    {
      label: '全国议政院常委会',
      ids: ['npc1','npc2','npc3','npc_sg'],
      note: '最高国家权力机关常设机构',
    },
    {
      label: '全国参政院',
      ids: ['cppcc1','cppcc2','cppcc_sg'],
      note: '华夏参政院',
    },
    {
      label: '中枢军事委员会',
      ids: ['cmc1','cmc2','cmc_jcs','cmc_gpd','cmc_jld','cmc_eqd','cmc_disc'],
      note: '主席由总执书记兼任，已列入常委会',
    },
    {
      label: '五大战区',
      ids: [
        'tc_east_c','tc_east_p',
        'tc_west_c','tc_west_p',
        'tc_south_c','tc_south_p',
        'tc_north_c','tc_north_p',
        'tc_cent_c','tc_cent_p',
      ],
      note: '东·西·南·北·中，2016年军改后设立',
    },
    {
      label: '各军种司令员',
      ids: ['army_c','navy_c','air_c','rocket_c','isf_c'],
      note: '陆·海·空·火箭军·信息支援部队',
    },
    {
      label: '中央党务机构',
      ids: ['org','cpd','ufwd','cplc_s','cswb','cpcsch','cac'],
      note: '组织·宣传·统战·政法委·社会工作·党校·网信',
    },
    {
      label: '群团组织',
      ids: ['cyd_league','acftu','acwf'],
      note: '共青团·全国总工会·全国妇联',
    },
    {
      label: '国政院综合经济部委',
      ids: ['ndrc','mof','mofcom','most','miit','sasac','pboc'],
      note: '发改·财政·商务·科技·工信·国资委·人民银行',
    },
    {
      label: '国政院社会民生部委',
      ids: ['moe','nhc','mhrss','mca','mct','gsa','nrta'],
      note: '教育·卫健·人社·民政·文旅·体育·广电',
    },
    {
      label: '国政院资源生态部委',
      ids: ['mara','mnr','mee','mot','mwr','mhurd','mem'],
      note: '农业农村·自然资源·生态·交通·水利·住建·应急',
    },
    {
      label: '国政院政法外交部委',
      ids: ['fa','mps','moj','mss','mvaa','neac'],
      note: '外交·公安·司法·国安·退役军人·民委',
    },
    {
      label: '国政院直属机构',
      ids: ['samr','nhsa','csrc','nhia','sta','nbs','mohurd_c','nfga','nfa','nra','caac'],
      note: '市监·金融监管·证监·医保·税务·统计·能源·粮储·林草·铁路·民航',
    },
    {
      label: '中枢纪委·国家监委',
      ids: ['ccdi'],
      note: '纪委书记已列入常委会',
    },
    {
      label: '最高司法机关',
      ids: ['spc','spp'],
      note: '最高人民法院·最高人民检察院',
    },
  ];

  return (
    <View style={{ flex: 1 }}>
      <SearchFilter search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} />
      {/* 届次标识 */}
      <View style={{ backgroundColor: '#0A0505', borderBottomWidth: 1, borderBottomColor: '#1A0A00', paddingHorizontal: 14, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ color: '#6A3A1A', fontSize: 9 }}>第{19 + termEpoch}届中央领导集体</Text>
        <Text style={{ color: '#3A2A0A', fontSize: 9 }}>·</Text>
        <Text style={{ color: '#4A3A1A', fontSize: 9 }}>{2017 + termEpoch * 5}—{2022 + termEpoch * 5}年</Text>
        <Text style={{ color: '#3A2A0A', fontSize: 9 }}>·</Text>
        <Text style={{ color: '#4A2A0A', fontSize: 9 }}>换届年：{2022 + termEpoch * 5}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {sections.map(sec => {
          const items = allLeaders.filter(l =>
            sec.ids.includes(l.id) &&
            matchesSearch(l.title, l.system, search) &&
            matchesFilter(l.title, l.system, filter)
          );
          if (items.length === 0) return null;
          return (
            <View key={sec.label} style={{ marginBottom: 10 }}>
              <View style={{ backgroundColor: '#0D0D0D', borderLeftWidth: 3, borderLeftColor: '#DE2910', paddingHorizontal: 12, paddingVertical: 7, marginBottom: 4 }}>
                <Text style={{ color: '#FFE08A', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>{sec.label}</Text>
                {sec.note && <Text style={{ color: '#5A4A2A', fontSize: 9, marginTop: 2 }}>{sec.note}</Text>}
              </View>
              {items.map(l => (
                <LeaderCard key={l.id} leader={l} saveId={saveId} gameYear={gameYear} bossName={bossName} boss2Name={boss2Name} boss3Name={boss3Name} rankLevel={rankLevel} playerBirthplace={playerBirthplace} playerName={playerName} playerAvatarUrl={playerAvatarUrl} />
              ))}
            </View>
          );
        })}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

// ──────────────────────────────────────────────────────────
//  本级地方领导 Tab
// ──────────────────────────────────────────────────────────
function LocalTab({ saveId, rankLevel, cityName, gameYear, bossName, boss2Name, boss3Name, playerBirthplace, playerName, playerPosition, playerAvatarUrl }: {
  saveId: string; rankLevel: number; cityName: string; gameYear: number;
  bossName: string; boss2Name: string; boss3Name: string;
  playerBirthplace: string;
  playerName?: string; playerPosition?: string; playerAvatarUrl?: string;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterOption>('全部');

  const leaders = useMemo(
    () => buildLocalLeaders(rankLevel, cityName, saveId, playerPosition),
    [rankLevel, cityName, saveId, playerPosition]
  );
  const levelLabel = rankLevel <= 3 ? '县级领导班子' : rankLevel <= 6 ? '地市级领导班子' : '省级领导班子';

  const filtered = leaders.filter(l =>
    matchesSearch(l.title, l.system, search) &&
    matchesFilter(l.title, l.system, filter)
  );

  return (
    <View style={{ flex: 1 }}>
      <SearchFilter search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} />
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: '#0A1A2A', borderLeftWidth: 3, borderLeftColor: '#6096BA', paddingHorizontal: 12, paddingVertical: 7, marginBottom: 8 }}>
          <Text style={{ color: '#89C2D9', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>
            📍 {cityName || '所在地'}  ·  {levelLabel}
          </Text>
        </View>
        {filtered.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ color: '#4A3A2A', fontSize: 12 }}>无匹配结果</Text>
          </View>
        ) : (
          filtered.map(l => (
            <LeaderCard key={l.id} leader={l} saveId={saveId} gameYear={gameYear} bossName={bossName} boss2Name={boss2Name} boss3Name={boss3Name} rankLevel={rankLevel} playerBirthplace={playerBirthplace} playerName={playerName} playerAvatarUrl={playerAvatarUrl} />
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

// ──────────────────────────────────────────────────────────
//  主屏
// ──────────────────────────────────────────────────────────
export default function NationalLeadersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save } = useGame();
  const [activeTab, setActiveTab] = useState<TabKey>('national');

  if (!save) return null;

  // 游戏年份：游戏从2020年1月1日起，每365天进一年
  const gameYear = 2020 + Math.floor(save.gameDays / 365);

  // 玩家籍贯（由存档id哈希确定，与档案保密/同乡计算联动）
  const playerBirthplace = getPlayerBirthplace(save.id);

  // 玩家头像 URL（与角色创建/主界面保持一致）
  const playerAvatarUrl = getAvatarImageUrl(save.avatarId, save.playerGender ?? '男', save.playerPosition);

  const tabs = getTabDefs(save.rankLevel);

  // 如果当前 activeTab 不在 tabs 中，重置到第一个
  const validTab = tabs.find(t => t.key === activeTab) ? activeTab : tabs[0].key;

  return (
    <View style={{ flex: 1, backgroundColor: '#0D0D0D' }}>
      <StatusBar style="light" backgroundColor="#0D0D0D" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#0D0D0D', paddingTop: insets.top + 8, paddingBottom: 0, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#2A1A0A' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Pressable onPress={() => router.back()} style={{ paddingRight: 8, paddingVertical: 4 }}>
            <Text style={{ color: '#CC9944', fontSize: 24 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#8B6914', fontSize: 10, letterSpacing: 2 }}>PEOPLE'S REPUBLIC OF CHINA</Text>
            <Text style={{ color: '#FFE08A', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>
              📜 领导人档案
            </Text>
          </View>
          <View style={{ backgroundColor: '#1E1008', borderWidth: 1, borderColor: '#3A2A0A', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 2 }}>
            <Text style={{ color: '#8B6914', fontSize: 9 }}>当前职务</Text>
            <Text style={{ color: '#FFE08A', fontSize: 10, fontWeight: '700', marginTop: 1 }}>
              {save.playerPosition || save.rankName}
            </Text>
          </View>
        </View>

        {/* Tab 栏 */}
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {tabs.map(tab => {
            const active = validTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={{ flex: 1, paddingVertical: 9, alignItems: 'center', borderBottomWidth: active ? 2 : 0, borderBottomColor: '#DE2910', backgroundColor: active ? '#1A0808' : 'transparent' }}
              >
                <Text style={{ fontSize: 9, marginBottom: 2 }}>{tab.emoji}</Text>
                <Text style={{ fontSize: 10, fontWeight: active ? '700' : '400', color: active ? '#FFE08A' : '#6B5A30', letterSpacing: 0.5 }}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Tab 内容 */}
      <View style={{ flex: 1 }}>
        {validTab === 'national' && (
          <NationalTab
            saveId={save.id} rankLevel={save.rankLevel}
            playerName={save.playerName} playerPosition={save.playerPosition}
            playerAvatarUrl={playerAvatarUrl}
            cityName={save.cityName} gameYear={gameYear}
            bossName={save.bossName} boss2Name={save.boss2Name} boss3Name={save.boss3Name}
            playerBirthplace={playerBirthplace}
          />
        )}
        {validTab === 'province' && (
          <ProvinceTab
            saveId={save.id} rankLevel={save.rankLevel} cityName={save.cityName}
            gameYear={gameYear}
            bossName={save.bossName} boss2Name={save.boss2Name} boss3Name={save.boss3Name}
            playerBirthplace={playerBirthplace}
            playerName={save.playerName} playerPosition={save.playerPosition}
            playerAvatarUrl={playerAvatarUrl}
          />
        )}
        {validTab === 'local' && (
          <LocalTab
            saveId={save.id} rankLevel={save.rankLevel} cityName={save.cityName}
            gameYear={gameYear}
            bossName={save.bossName} boss2Name={save.boss2Name} boss3Name={save.boss3Name}
            playerBirthplace={playerBirthplace}
            playerName={save.playerName} playerPosition={save.playerPosition}
            playerAvatarUrl={playerAvatarUrl}
          />
        )}
        {validTab === 'military' && (
          <MilitaryTab
            saveId={save.id} gameYear={gameYear}
            bossName={save.bossName} boss2Name={save.boss2Name} boss3Name={save.boss3Name}
            rankLevel={save.rankLevel} playerBirthplace={playerBirthplace}
            playerName={save.playerName} playerAvatarUrl={playerAvatarUrl}
          />
        )}
      </View>
    </View>
  );
}

