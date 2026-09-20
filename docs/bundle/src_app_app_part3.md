# src/app/(app)_part3

共 16 个文件。
<a id="srcappappnationalleaderstsx"></a>
## `src/app/(app)/national-leaders.tsx`

```tsx
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
```

<a id="srcappappnpccongresstsx"></a>
## `src/app/(app)/npc-congress.tsx`

```tsx
// 代会人事系统
// ─────────────────────────────────────────────────────────────────────────
// 规则说明：
//   · 所有 NPC 晋升、连任均须经对应级别代会（党代会/议政院/参政院）提名表决
//   · 连任通过率 85%，新任命通过率 65%，NPC 自行提名 75%
//   · 代会窗口期：开幕前 90 天 ~ 闭幕后 30 天（共 ≈ 120 天）
//   · 非窗口期只能查看候选人信息，无法提交提名
//   · 补充机制：考察期 45 天 → 公示期 5 天 → 正式任命
//   · 年龄红线：县/处级 ≤55岁，厅/部级 ≤60岁，省/国家级 ≤65岁
//   · 回避制度：连续同一岗位不超过 2 届（约 10 年）
//   · 异地任职：晋升时自动标记需异地交流经历
// ─────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getSubordinates } from '@/db/gameApi';
import { SUB_LEVEL_NAMES, RANK_CONFIG, gameDaysToDate } from '@/types/game';
import type { Subordinate } from '@/types/game';

// ── 类型 ─────────────────────────────────────────────────────────────────
type CongressType = '党代会' | '人民代表大会' | '政治协商会议';
type NominationStatus =
  | 'eligible'        // 可提名
  | 'examining'       // 考察期（45天）
  | 'publicizing'     // 公示期（5天）
  | 'approved'        // 已通过
  | 'rejected'        // 已否决
  | 'age_blocked'     // 超龄
  | 'tenure_blocked'; // 届满不宜连任

type AppointKind = '晋升' | '连任' | '平调' | '免职';
type NominateGroup = 'party' | 'gov' | 'nda';

interface CongressSchedule {
  congressType: CongressType;
  ordinal: number;       // 届次
  openDay: number;       // 开幕（gameDays）
  closeDays: number;     // 会期（天数）
  windowStart: number;   // 可提名窗口开始
  windowEnd: number;     // 可提名窗口关闭
}

interface Nomination {
  id: string;
  subId: string;
  subName: string;
  subLevel: number;       // 当前级别
  targetLevel: number;    // 拟任级别
  kind: AppointKind;
  status: NominationStatus;
  voteFor: number;
  voteAgainst: number;
  voteAbstain: number;
  totalVoters: number;
  examineStartDay: number;  // 考察开始
  publicizeDay: number;     // 公示开始
  proposedBy: 'player' | 'npc';
  createdDay: number;
  passRate: number;         // 0-100 通过率预估
  faction: string;
  age: number;
  tenureYears: number;      // 当前岗位已满任期（年）
  needsCrossRegion: boolean; // 是否需要异地经历
  notes: string[];           // 附加说明
  congressGroup: NominateGroup; // 提名所属代会分组
}

// ── 常量 ─────────────────────────────────────────────────────────────────
// 游戏开始日 2020-01-01 = gameDays 0
// 各级代会开幕 gameDays（近似值，以实际换届年月推算）
const CONGRESS_SCHEDULES: Record<number, CongressSchedule[]> = {
  // rank 1-3：乡镇层级  → 县党代会/县人代会
  1: buildSchedules('党代会', 17, [606, 606 + 1825, 606 + 3650]),            // 2021-08 → 2026-08 → 2031-08
  2: buildSchedules('人民代表大会', 14, [700, 700 + 1825, 700 + 3650]),       // 2021-11 → 2026-11
  // rank 4-6：县级  → 县党代会/县人代会
  4: buildSchedules('党代会', 17, [606, 606 + 1825, 606 + 3650]),
  5: buildSchedules('人民代表大会', 14, [700, 700 + 1825, 700 + 3650]),
  // rank 7-9：市级  → 市党代会/市人代会
  7: buildSchedules('党代会', 14, [640, 640 + 1825, 640 + 3650]),             // 2021-09 → 2026-09
  8: buildSchedules('人民代表大会', 11, [730, 730 + 1825, 730 + 3650]),       // 2022-01 → 2027-01
  // rank 10-11：省级  → 省党代会/省人代会
  10: buildSchedules('党代会', 13, [882, 882 + 1825, 882 + 3650]),            // 2022-06 → 2027-06
  11: buildSchedules('人民代表大会', 13, [1095, 1095 + 1825, 1095 + 3650]),   // 2023-01 → 2028-01
  // rank 12-15：国家级  → 全国执政党代表大会/全国议政院/全国参政院
  12: buildSchedules('党代会', 20, [1004, 1004 + 1825, 1004 + 3650]),         // 2022-10（二十大）→ 2027-10
  13: buildSchedules('人民代表大会', 14, [1156, 1156 + 1825, 1156 + 3650]),   // 2023-03（十四届）→ 2028-03
  14: buildSchedules('政治协商会议', 14, [1156, 1156 + 1825, 1156 + 3650]),
};

function buildSchedules(type: CongressType, startOrdinal: number, openDays: number[]): CongressSchedule[] {
  return openDays.map((open, i) => ({
    congressType: type,
    ordinal: startOrdinal + i,
    openDay: open,
    closeDays: type === '党代会' ? 7 : 14,
    windowStart: open - 90,
    windowEnd: open + 30,
  }));
}

// 通过率预估
function estimatePassRate(kind: AppointKind, loyalty: number, ability: number, isWindowOpen: boolean): number {
  if (!isWindowOpen) return 0;
  let base = kind === '连任' ? 85 : kind === '晋升' ? 65 : 70;
  base += Math.round((loyalty - 70) * 0.2);
  base += Math.round((ability - 70) * 0.15);
  return Math.min(98, Math.max(20, base));
}

// 倒计时文字
function countdownText(gameDays: number, targetDay: number): string {
  const diff = targetDay - gameDays;
  if (diff <= 0) return '进行中';
  if (diff < 30) return `${diff}天后`;
  if (diff < 365) return `约${Math.round(diff / 30)}个月后`;
  return `约${(diff / 365).toFixed(1)}年后`;
}

// 确定性投票模拟
function simulateVote(passRate: number, subId: string, total: number): { voteFor: number; voteAgainst: number; voteAbstain: number } {
  let h = 0;
  for (let i = 0; i < subId.length; i++) h = (h * 31 + subId.charCodeAt(i)) & 0xffff;
  const roll = (h % 100) + 1;
  const passed = roll <= passRate;
  if (passed) {
    const voteFor = Math.round(total * (0.6 + (h % 30) / 100));
    const voteAgainst = Math.round(total * (0.05 + (h % 10) / 100));
    return { voteFor, voteAgainst: voteAgainst, voteAbstain: total - voteFor - voteAgainst };
  } else {
    const voteFor = Math.round(total * (0.25 + (h % 20) / 100));
    const voteAgainst = Math.round(total * (0.5 + (h % 20) / 100));
    return { voteFor, voteAgainst, voteAbstain: Math.max(0, total - voteFor - voteAgainst) };
  }
}

function getFactionCN(faction: string): string {
  const map: Record<string, string> = {
    reform: '改革派', pragmatic: '务实派', communist: '共青团系',
    technocrat: '技术官僚', local: '地方系', neutral: '中立',
    economy: '经济发展', discipline: '纪检督查',
  };
  return map[faction] ?? faction;
}

const FACTION_COLORS: Record<string, string> = {
  reform: '#2B4B6F', pragmatic: '#607d8b', communist: '#E53935',
  technocrat: '#1565C0', local: '#4E342E', neutral: '#888',
  economy: '#2a7a3b', discipline: '#6A2A6A',
};

// ── 找到当前+下一届代会 ───────────────────────────────────────────────────
function getRelevantCongress(rankLevel: number, gameDays: number): {
  current: CongressSchedule | null;
  next: CongressSchedule;
  isWindowOpen: boolean;
} {
  const tier = rankLevel >= 12 ? 12 : rankLevel >= 10 ? 10 : rankLevel >= 7 ? 7 : 4;
  const schedules = CONGRESS_SCHEDULES[tier] ?? CONGRESS_SCHEDULES[4]!;
  // 找最近一届（开幕日≥今天-120，或已过窗口则找下一届）
  let current: CongressSchedule | null = null;
  let next: CongressSchedule = schedules[schedules.length - 1]!;
  for (const s of schedules) {
    if (gameDays >= s.windowStart && gameDays <= s.windowEnd) {
      current = s;
      const idx = schedules.indexOf(s);
      next = schedules[idx + 1] ?? s;
      break;
    }
    if (gameDays < s.openDay) {
      next = s;
      break;
    }
  }
  return { current, next, isWindowOpen: current !== null };
}

// 代会全称（含地名、级别、届次）
function congressFullName(s: CongressSchedule, rankLevel: number, cityName: string): string {
  const city = cityName || '所在地';
  if (s.congressType === '党代会') {
    if (rankLevel >= 12) return `中国共产党第${s.ordinal}次全国代表大会`;
    if (rankLevel >= 10) return `中国共产党${city}省第${s.ordinal}次代表大会`;
    if (rankLevel >= 7)  return `中国共产党${city}市第${s.ordinal}次代表大会`;
    if (rankLevel >= 4)  return `中国共产党${city}县第${s.ordinal}次代表大会`;
    return `中国共产党${city}镇第${s.ordinal}次代表大会`;
  }
  if (s.congressType === '人民代表大会') {
    if (rankLevel >= 12) return `华夏人民共和国第${s.ordinal}届全国议政院`;
    if (rankLevel >= 10) return `${city}省第${s.ordinal}届人民代表大会`;
    if (rankLevel >= 7)  return `${city}市第${s.ordinal}届人民代表大会`;
    if (rankLevel >= 4)  return `${city}县第${s.ordinal}届人民代表大会`;
    return `${city}镇第${s.ordinal}届人民代表大会`;
  }
  if (s.congressType === '政治协商会议') {
    if (rankLevel >= 12) return `华夏参政院第${s.ordinal}届全国委员会`;
    if (rankLevel >= 10) return `${city}省第${s.ordinal}届政治协商会议`;
    if (rankLevel >= 7)  return `${city}市第${s.ordinal}届政治协商会议`;
    return `${city}县第${s.ordinal}届政治协商会议`;
  }
  return `第${s.ordinal}届${s.congressType}`;
}

// 简称（用于顶栏行内短文本，避免名称过长）
function congressShortName(s: CongressSchedule, rankLevel: number, cityName: string): string {
  const city = cityName || '所在地';
  if (s.congressType === '党代会') {
    if (rankLevel >= 12) return `全国执政党代表大会·第${s.ordinal}次`;
    if (rankLevel >= 10) return `${city}省党代会·第${s.ordinal}次`;
    if (rankLevel >= 7)  return `${city}市党代会·第${s.ordinal}次`;
    return `${city}县党代会·第${s.ordinal}次`;
  }
  if (s.congressType === '人民代表大会') {
    if (rankLevel >= 12) return `全国议政院·第${s.ordinal}届`;
    if (rankLevel >= 10) return `${city}省议政院·第${s.ordinal}届`;
    if (rankLevel >= 7)  return `${city}市议政院·第${s.ordinal}届`;
    return `${city}县议政院·第${s.ordinal}届`;
  }
  if (rankLevel >= 12) return `全国参政院·第${s.ordinal}届`;
  return `${city}参政院·第${s.ordinal}届`;
}

// ═══════════════════════════════════════════════════════════════════════════
export default function NpcCongressScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [tab, setTab] = useState<'schedule' | 'nominate' | 'review'>('schedule');
  const [nominateGroup, setNominateGroup] = useState<NominateGroup>('party');
  const [subs, setSubs] = useState<Subordinate[]>([]);
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [feedback, setFeedback] = useState('');
  const [feedbackOk, setFeedbackOk] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const npcInit = useRef(false);

  useFocusEffect(useCallback(() => {
    if (!save) return;
    getSubordinates(save.id).then(data => setSubs(data));
  }, [save]));

  // NPC 自动提名（窗口期内且首次进入）—— Hooks 必须在 guard return 之前调用
  useEffect(() => {
    if (!save) return;
    const gameDays = save.gameDays;
    const rankLevel = save.rankLevel;
    const { current, next } = getRelevantCongress(rankLevel, gameDays);
    const activeCongress = current ?? next;
    const isWindowOpen = Boolean(activeCongress) && activeCongress.windowStart <= gameDays && gameDays <= activeCongress.windowEnd;
    if (!isWindowOpen || npcInit.current || subs.length === 0) return;
    npcInit.current = true;
    const eligible = subs.filter(s =>
      s.subLevel >= 1 && s.subLevel <= 10 &&
      s.ability >= 75 && s.loyalty >= 70 &&
      !nominations.find(n => n.subId === s.id)
    ).slice(0, 2);
    if (eligible.length === 0) return;
    const auto: Nomination[] = eligible.map(s => {
      const kind: AppointKind = '晋升';
      const passRate = estimatePassRate(kind, s.loyalty, s.ability, true);
      const age = 35 + Math.floor(((hashSub(s.id)) % 25));
      return {
        id: `npc_nom_${s.id}`,
        subId: s.id,
        subName: s.name,
        subLevel: s.subLevel,
        targetLevel: Math.min(s.subLevel + 1, 10),
        kind,
        status: 'eligible',
        voteFor: 0, voteAgainst: 0, voteAbstain: 0,
        totalVoters: activeCongress.congressType === '党代会' ? 200 : 150,
        examineStartDay: gameDays,
        publicizeDay: gameDays + 45,
        proposedBy: 'npc',
        createdDay: gameDays,
        passRate,
        faction: s.faction,
        age,
        tenureYears: 2 + (hashSub(s.id) % 4),
        needsCrossRegion: s.subLevel >= 5,
        notes: [],
        congressGroup: 'party' as NominateGroup,
      };
    });
    setNominations(prev => [...prev, ...auto]);
    showFeedback(`📩 组织部门已自动提名${auto.length}名干部候选人，请在审议页表决`);
    setTab('review');
  }, [save, subs]);

  function hashSub(id: string): number {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
    return h;
  }

  const showFeedback = (msg: string, ok = true) => {
    setFeedback(msg); setFeedbackOk(ok);
    setTimeout(() => setFeedback(''), 3200);
  };

  if (!save) return null;

  const gameDays = save.gameDays;
  const rankLevel = save.rankLevel;
  const rankName = RANK_CONFIG[rankLevel]?.name ?? '干部';

  // 代会信息
  const { current, next, isWindowOpen } = getRelevantCongress(rankLevel, gameDays);
  const activeCongress = current ?? next;

  // ── 玩家提名 ───────────────────────────────────────────────────────────
  const handleNominate = (sub: Subordinate, kind: AppointKind, group: NominateGroup) => {
    if (!isWindowOpen) {
      showFeedback(`❌ 当前非${congressFullName(activeCongress, rankLevel, save.cityName ?? '')}窗口期，无法提名`, false);
      return;
    }
    if (nominations.find(n => n.subId === sub.id && n.status !== 'rejected')) {
      showFeedback('该干部已有进行中的提名', false); return;
    }
    const age = 35 + (hashSub(sub.id) % 25);
    const targetLevel = kind === '晋升' ? Math.min(sub.subLevel + 1, 10) : sub.subLevel;
    const tenureYears = 2 + (hashSub(sub.id) % 4);
    if (kind === '连任' && tenureYears >= 10) {
      showFeedback(`❌ ${sub.name}在同一职位已满10年（2届），不宜连任`, false);
      return;
    }
    const passRate = estimatePassRate(kind, sub.loyalty, sub.ability, true);
    // 不同代会分组的代表人数差异
    const voters = group === 'party' ? 200 : group === 'gov' ? 180 : 150;
    const nom: Nomination = {
      id: `nom_${Date.now()}_${sub.id}`,
      subId: sub.id, subName: sub.name,
      subLevel: sub.subLevel, targetLevel,
      kind, status: 'eligible',
      voteFor: 0, voteAgainst: 0, voteAbstain: 0,
      totalVoters: voters,
      examineStartDay: gameDays, publicizeDay: gameDays + 45,
      proposedBy: 'player', createdDay: gameDays, passRate,
      faction: sub.faction, age,
      tenureYears,
      needsCrossRegion: sub.subLevel >= 5,
      notes: buildNotes(sub, kind, age, tenureYears),
      congressGroup: group,
    };
    setNominations(prev => [nom, ...prev]);
    const groupName = group === 'party' ? '党代会' : group === 'gov' ? '人民代表大会（政府班子）' : '人民代表大会（议政院班子）';
    showFeedback(`✅ 已向${groupName}提名${sub.name}参加${kind}表决，进入45天考察期`);
    setTab('review');
  };

  function buildNotes(sub: Subordinate, kind: AppointKind, age: number, tenure: number): string[] {
    const notes: string[] = [];
    if (kind === '连任') notes.push(`连任通过率约85%，高于新任命`);
    if (kind === '晋升') notes.push(`晋升需要：能力${sub.ability}、忠诚${sub.loyalty}`);
    if (sub.subLevel >= 5 && !sub.transferredCity) notes.push(`⚠️ 尚无异地任职经历，晋升加分项缺失`);
    if (tenure >= 8) notes.push(`连续任职${tenure}年，建议轮岗`);
    return notes;
  }

  // ── 进入考察 / 公示 / 表决 ─────────────────────────────────────────────
  const handleProceed = async (nomId: string) => {
    if (processingId) return;
    setProcessingId(nomId);
    const nom = nominations.find(n => n.id === nomId);
    if (!nom) { setProcessingId(null); return; }

    if (nom.status === 'eligible') {
      // 进入考察期（45天）→ 模拟为即时推进
      setNominations(prev => prev.map(n => n.id === nomId ? { ...n, status: 'examining' } : n));
      showFeedback(`🔍 ${nom.subName}进入45天组织考察期，请等待结果…`);
      setTimeout(() => {
        setNominations(prev => prev.map(n => n.id === nomId ? { ...n, status: 'publicizing' } : n));
        showFeedback(`📢 ${nom.subName}考察合格，进入5天公示期`);
        setTimeout(() => finalizeVote(nomId), 2000);
      }, 1800);
    } else if (nom.status === 'publicizing') {
      finalizeVote(nomId);
    }
    setProcessingId(null);
  };

  const finalizeVote = async (nomId: string) => {
    const nom = nominations.find(n => n.id === nomId);
    if (!nom) return;
    const { voteFor, voteAgainst, voteAbstain } = simulateVote(nom.passRate, nom.subId, nom.totalVoters);
    const quorum = Math.floor(nom.totalVoters / 2) + 1;
    const passed = voteFor >= quorum;
    setNominations(prev => prev.map(n =>
      n.id === nomId ? { ...n, status: passed ? 'approved' : 'rejected', voteFor, voteAgainst, voteAbstain } : n,
    ));
    if (passed) {
      const merit = nom.kind === '晋升' ? 25 : 12;
      await updateGameSave({ meritPoints: (save.meritPoints ?? 0) + merit });
      showFeedback(`✅ ${nom.subName}经${congressFullName(activeCongress, rankLevel, save.cityName ?? '')}表决通过（${voteFor}/${nom.totalVoters}票），政绩+${merit}`);
    } else {
      showFeedback(`❌ ${nom.subName}未获代会通过（${voteFor}/${nom.totalVoters}票），需改善条件后下届再议`, false);
    }
  };

  const pendingNoms  = nominations.filter(n => n.status === 'eligible' || n.status === 'examining' || n.status === 'publicizing');
  const decidedNoms  = nominations.filter(n => n.status === 'approved' || n.status === 'rejected');
  const nominableS   = subs.filter(s => s.subLevel >= 1 && !nominations.find(n => n.subId === s.id && n.status !== 'rejected'));

  // 颜色主题（深棕/金色 → 代表权威性）
  const BG  = '#0C0A06';
  const HDR = '#1C1608';
  const ACT = '#4A3A08';
  const TXT = '#F5E8B0';
  const MUT = '#9A8A50';
  const BOR = '#4A3A1A';
  const GLD = '#C8A832';

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar style="light" backgroundColor={HDR} />

      {/* ── 顶栏 ── */}
      <View style={{ backgroundColor: HDR, paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: GLD, fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: MUT, fontSize: 9, letterSpacing: 3 }}>代会人事 · {rankName}层级</Text>
            <Text style={{ color: TXT, fontSize: 16, fontWeight: '700' }}>🏛️ 代会干部提名系统</Text>
            <Text style={{ color: MUT, fontSize: 10 }}>
              {isWindowOpen
                ? `✅ 当前处于 ${congressShortName(activeCongress, rankLevel, save.cityName ?? '')} 窗口期（可提名）`
                : `⏳ 下届：${congressShortName(activeCongress, rankLevel, save.cityName ?? '')} — ${countdownText(gameDays, activeCongress.openDay)}`}
            </Text>
          </View>
          <View style={{ backgroundColor: isWindowOpen ? '#1A3A0A' : '#3A2A08', borderWidth: 1, borderColor: isWindowOpen ? '#5AAA3A' : GLD, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: isWindowOpen ? '#88EE88' : GLD, fontSize: 9, fontWeight: '700' }}>
              {isWindowOpen ? '窗口期' : '等待中'}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {([
            { key: 'schedule', label: '📅 代会日程' },
            { key: 'nominate', label: `👥 提名候选（${nominableS.length}）` },
            { key: 'review',   label: `🗳️ 审议表决（${pendingNoms.length}）` },
          ] as const).map(t => (
            <Pressable key={t.key} onPress={() => setTab(t.key)}
              style={{ flex: 1, paddingVertical: 7, alignItems: 'center', backgroundColor: tab === t.key ? ACT : 'rgba(255,255,255,0.06)' }}
            >
              <Text style={{ color: tab === t.key ? TXT : MUT, fontSize: 9, fontWeight: tab === t.key ? '700' : '400' }}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 反馈条 */}
      {feedback ? (
        <View style={{ backgroundColor: feedbackOk ? '#0D2A0D' : '#2A0D0D', padding: 10 }}>
          <Text style={{ color: feedbackOk ? '#5AE87A' : '#FF6666', fontSize: 12, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      {/* ══ 代会日程 ══ */}
      {tab === 'schedule' && (
        <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>
          {/* 窗口状态横幅 */}
          <View style={{ backgroundColor: isWindowOpen ? '#0A2A0A' : HDR, borderWidth: 2, borderColor: isWindowOpen ? '#3A8A3A' : GLD, padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Text style={{ fontSize: 28 }}>{isWindowOpen ? '✅' : '⏳'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: TXT, fontSize: 15, fontWeight: '700' }}>{congressFullName(activeCongress, rankLevel, save.cityName ?? '')}</Text>
                <Text style={{ color: MUT, fontSize: 11, marginTop: 2 }}>
                  {isWindowOpen
                    ? `${gameDaysToDate(activeCongress.openDay)} 开幕 · 会期${activeCongress.closeDays}天`
                    : `${gameDaysToDate(activeCongress.openDay)} 开幕 · 尚需 ${countdownText(gameDays, activeCongress.openDay)}`}
                </Text>
              </View>
            </View>
            <View style={{ backgroundColor: '#1A1408', padding: 10, gap: 4 }}>
              <Text style={{ color: GLD, fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>代会人事安排规则</Text>
              <Text style={{ color: MUT, fontSize: 10, lineHeight: 16 }}>
                {'  '}① 窗口期：开幕前90天至闭幕后30天，共约120天
              </Text>
              <Text style={{ color: MUT, fontSize: 10, lineHeight: 16 }}>
                {'  '}② 连任通过率约 85%，高于新任命（65%）
              </Text>
              <Text style={{ color: MUT, fontSize: 10, lineHeight: 16 }}>
                {'  '}③ 提名后须经45天考察期 + 5天公示期
              </Text>
              <Text style={{ color: MUT, fontSize: 10, lineHeight: 16 }}>
                {'  '}④ 窗口期外无法提名，只能做预备工作
              </Text>
            </View>
          </View>

          {/* 现实约束说明 */}
          <View style={{ backgroundColor: HDR, borderWidth: 1, borderColor: BOR, padding: 14, gap: 8 }}>
            <Text style={{ color: GLD, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 4 }}>📜 干部任免现实约束</Text>

            {[
              { icon: '🔄', title: '回避制度', desc: '同一岗位不得超过2届（约10年），届满须轮岗' },
              { icon: '✈️', title: '异地任职', desc: '副厅级及以上晋升需有异地任职经历，否则扣分' },
              { icon: '🔍', title: '组织考察', desc: '提名后须经45天考察期，考察合格方可进入公示' },
              { icon: '📢', title: '任前公示', desc: '候选人须在单位公示5天，接受群众监督' },
              { icon: '📋', title: '届委制度', desc: '领导班子成员须在代会前提名，经代会选举产生' },
              { icon: '🤝', title: '交流任职', desc: '党政领导职务与同级不得在同一单位任职超2届' },
              { icon: '⚖️', title: '双重管理', desc: '党委管干部（党代会）、国家机关管官员（议政院选举）' },
            ].map(item => (
              <View key={item.title} style={{ flexDirection: 'row', gap: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#2A2010' }}>
                <Text style={{ fontSize: 16, width: 22 }}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: TXT, fontSize: 11, fontWeight: '700' }}>{item.title}</Text>
                  <Text style={{ color: MUT, fontSize: 10, marginTop: 1, lineHeight: 15 }}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* 代会日程表 */}
          <View style={{ backgroundColor: HDR, borderWidth: 1, borderColor: BOR, padding: 14 }}>
            <Text style={{ color: GLD, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>
              📅 未来届会日程（{rankName}层级）
            </Text>
            {(() => {
              // 按层级取全部类型的日程（党代会 + 人民代表大会 + 参政院）
              const tierKeys: number[] =
                rankLevel >= 12 ? [12, 13, 14] :
                rankLevel >= 10 ? [10, 11] :
                rankLevel >= 7  ? [7, 8] :
                rankLevel >= 4  ? [4, 5] :
                                  [1, 2];
              const allSchedules = tierKeys
                .flatMap(k => CONGRESS_SCHEDULES[k] ?? [])
                .sort((a, b) => a.openDay - b.openDay);
              const TYPE_ICON: Record<string, string> = {
                '党代会': '🏛️',
                '人民代表大会': '📜',
                '政治协商会议': '🤝',
              };
              return allSchedules.map(s => {
                const inWindow = gameDays >= s.windowStart && gameDays <= s.windowEnd;
                const passed = gameDays > s.windowEnd;
                return (
                  <View key={`${s.congressType}-${s.ordinal}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8,
                    backgroundColor: inWindow ? '#1A2A0A' : passed ? '#181408' : '#141008',
                    borderWidth: 1, borderColor: inWindow ? '#3A7A2A' : passed ? '#2A2010' : BOR, padding: 10 }}>
                    <View style={{ width: 32, height: 32, backgroundColor: inWindow ? '#2A5A1A' : '#2A2010', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 18 }}>
                        {passed ? '✓' : inWindow ? '🔓' : (TYPE_ICON[s.congressType] ?? '🔒')}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: inWindow ? '#88EE88' : passed ? '#6A6A6A' : TXT, fontSize: 12, fontWeight: '700' }}>
                        第{s.ordinal}届{s.congressType}
                      </Text>
                      <Text style={{ color: MUT, fontSize: 10 }}>
                        开幕：{gameDaysToDate(s.openDay)} · 会期{s.closeDays}天
                      </Text>
                      <Text style={{ color: MUT, fontSize: 9 }}>
                        提名窗口：{gameDaysToDate(s.windowStart)} — {gameDaysToDate(s.windowEnd)}
                      </Text>
                    </View>
                    {inWindow && (
                      <View style={{ backgroundColor: '#1A4A0A', borderWidth: 1, borderColor: '#4A8A2A', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: '#88EE88', fontSize: 9, fontWeight: '700' }}>当前</Text>
                      </View>
                    )}
                  </View>
                );
              });
            })()}
          </View>
          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* ══ 提名候选 ══ */}
      {tab === 'nominate' && (() => {
        // 三个分组定义
        const NOMINATE_GROUPS: { key: NominateGroup; label: string; icon: string; color: string; desc: string; congressName: string; requirement: string }[] = [
          {
            key: 'party', label: '党代会提名', icon: '🏛️', color: '#8B3A3A',
            desc: '党委书记、副书记、常委等党委班子成员，须经同级党代表大会或党代会全委会审议通过。',
            congressName: '党代会',
            requirement: '适合党务系统、纪委、政法委等岗位候选人',
          },
          {
            key: 'gov', label: '政府班子提名', icon: '🏢', color: '#2A5A6A',
            desc: '县长/市长/省长及各级政府副职，须经人民代表大会选举（正职）或议政院常委会通过（副职）。',
            congressName: '人民代表大会',
            requirement: '适合行政管理、经济建设等政府职能岗位候选人',
          },
          {
            key: 'nda', label: '议政院班子提名', icon: '📜', color: '#2A6A3A',
            desc: '议政院主任、副主任及常委会委员，须经人民代表大会全体会议选举产生。',
            congressName: '议政院',
            requirement: '适合法律、监督、立法等议政院系统岗位候选人',
          },
        ];
        const curGroup = NOMINATE_GROUPS.find(g => g.key === nominateGroup)!;
        // 过滤当前分组中已有提名的下属
        const nominableFiltered = subs.filter(s =>
          s.subLevel >= 1 &&
          !nominations.find(n => n.subId === s.id && n.status !== 'rejected' && n.congressGroup === nominateGroup)
        );

        return (
          <View style={{ flex: 1 }}>
            {/* 分组小Tab */}
            <View style={{ flexDirection: 'row', backgroundColor: '#181408', borderBottomWidth: 1, borderBottomColor: BOR }}>
              {NOMINATE_GROUPS.map(g => (
                <Pressable key={g.key} onPress={() => setNominateGroup(g.key)}
                  style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: nominateGroup === g.key ? g.color : 'transparent' }}>
                  <Text style={{ fontSize: 14 }}>{g.icon}</Text>
                  <Text style={{ fontSize: 8, color: nominateGroup === g.key ? g.color : MUT, fontWeight: nominateGroup === g.key ? '700' : '400', marginTop: 1 }}>{g.label}</Text>
                  <Text style={{ fontSize: 7, color: MUT, marginTop: 1 }}>
                    {nominations.filter(n => n.congressGroup === g.key && (n.status === 'eligible' || n.status === 'examining' || n.status === 'publicizing')).length}项进行中
                  </Text>
                </Pressable>
              ))}
            </View>

            <FlatList
              data={nominableFiltered}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 12, gap: 8 }}
              ListHeaderComponent={
                <View style={{ gap: 6, marginBottom: 4 }}>
                  {/* 分组说明 */}
                  <View style={{ backgroundColor: HDR, borderWidth: 1, borderColor: curGroup.color + '66', borderLeftWidth: 3, borderLeftColor: curGroup.color, padding: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Text style={{ fontSize: 16 }}>{curGroup.icon}</Text>
                      <Text style={{ color: curGroup.color, fontSize: 12, fontWeight: '700' }}>{curGroup.label}</Text>
                    </View>
                    <Text style={{ color: MUT, fontSize: 10, lineHeight: 16 }}>{curGroup.desc}</Text>
                    <Text style={{ color: curGroup.color + 'AA', fontSize: 9, marginTop: 4 }}>📌 {curGroup.requirement}</Text>
                  </View>
                  {/* 窗口期警告 */}
                  {!isWindowOpen && (
                    <View style={{ backgroundColor: '#2A1A08', borderWidth: 1, borderColor: '#6A4A18', padding: 8 }}>
                      <Text style={{ color: '#CC8833', fontSize: 10, fontWeight: '700' }}>
                        ⚠️ 当前非{curGroup.congressName}窗口期 · 可预览候选人信息但无法提名
                      </Text>
                      <Text style={{ color: MUT, fontSize: 9, marginTop: 2 }}>
                        下届窗口开放时间：{gameDaysToDate(activeCongress.windowStart)}
                      </Text>
                    </View>
                  )}
                  <Text style={{ color: MUT, fontSize: 10, fontWeight: '600' }}>
                    可提名下属：{nominableFiltered.length}人 · 向「{curGroup.congressName}」提交候选
                  </Text>
                </View>
              }
              ListEmptyComponent={
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Text style={{ fontSize: 36, marginBottom: 12 }}>👥</Text>
                  <Text style={{ fontSize: 14, color: MUT, textAlign: 'center' }}>暂无可提名的下属干部</Text>
                  <Text style={{ fontSize: 11, color: '#4A3A18', marginTop: 4 }}>先在「下属管理」页培养干部</Text>
                </View>
              }
              renderItem={({ item }) => {
                const age = 35 + (hashSub(item.id) % 25);
                const tenure = 2 + (hashSub(item.id) % 4);
                const fColor = FACTION_COLORS[item.faction] ?? '#888';
                const fName = getFactionCN(item.faction);
                const tenureOk = tenure < 10;

                return (
                  <View style={{ backgroundColor: '#141008', borderWidth: 1, borderColor: BOR, padding: 12 }}>
                    {/* 干部信息 */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <View style={{ width: 46, height: 46, backgroundColor: '#2A2010', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: curGroup.color }}>
                        <Text style={{ fontSize: 24 }}>{item.gender === '女' ? '👩‍💼' : '👔'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: TXT }}>{item.name}</Text>
                          <Text style={{ fontSize: 10, color: MUT }}>{age}岁</Text>
                        </View>
                        <Text style={{ fontSize: 11, color: MUT, marginTop: 2 }}>
                          {SUB_LEVEL_NAMES[item.subLevel]} · 现岗{tenure}年
                          {!tenureOk ? '⚠️届满' : ''}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                          <View style={{ backgroundColor: fColor + '22', borderWidth: 1, borderColor: fColor, paddingHorizontal: 5, paddingVertical: 1 }}>
                            <Text style={{ fontSize: 9, color: fColor }}>{fName}</Text>
                          </View>
                          <Text style={{ fontSize: 9, color: MUT }}>能力{item.ability} · 忠诚{item.loyalty}</Text>
                          {item.subLevel >= 5 && !item.transferredCity && (
                            <View style={{ backgroundColor: '#3A2A08', borderWidth: 1, borderColor: '#6A4A18', paddingHorizontal: 4, paddingVertical: 1 }}>
                              <Text style={{ fontSize: 8, color: '#CC8833' }}>缺异地</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* 提名目标标识 */}
                    <View style={{ backgroundColor: curGroup.color + '18', borderWidth: 1, borderColor: curGroup.color + '44', padding: 6, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 12 }}>{curGroup.icon}</Text>
                      <Text style={{ color: curGroup.color, fontSize: 10 }}>提名至：{curGroup.congressName} · {curGroup.label}</Text>
                    </View>

                    {/* 通过率预估 */}
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                      {(['晋升', '连任', '平调'] as const).map(kind => {
                        const pr = estimatePassRate(kind, item.loyalty, item.ability, true);
                        return (
                          <View key={kind} style={{ flex: 1, backgroundColor: '#1A1408', borderWidth: 1, borderColor: BOR, padding: 5, alignItems: 'center' }}>
                            <Text style={{ color: MUT, fontSize: 9 }}>{kind}</Text>
                            <Text style={{ color: pr >= 75 ? '#88EE88' : pr >= 55 ? GLD : '#EE6666', fontSize: 12, fontWeight: '700' }}>{pr}%</Text>
                          </View>
                        );
                      })}
                    </View>

                    {/* 提名按钮 */}
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {(['晋升', '连任', '平调'] as const).map(kind => {
                        const canNom = isWindowOpen && (kind !== '连任' || tenureOk);
                        return (
                          <Pressable key={kind}
                            onPress={() => canNom && handleNominate(item, kind, nominateGroup)}
                            style={{ flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: canNom ? curGroup.color + '44' : '#1A1408', borderWidth: 1, borderColor: canNom ? curGroup.color : '#2A2010' }}
                          >
                            <Text style={{ color: canNom ? TXT : '#4A3A18', fontSize: 11, fontWeight: canNom ? '700' : '400' }}>
                              {kind === '晋升' ? '⬆️' : kind === '连任' ? '🔁' : '↔️'} {kind}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    {!isWindowOpen && (
                      <Text style={{ color: '#6A4A18', fontSize: 9, marginTop: 4, textAlign: 'center' }}>
                        非窗口期 · {countdownText(gameDays, activeCongress.windowStart)}后可提名
                      </Text>
                    )}
                  </View>
                );
              }}
            />
          </View>
        );
      })()}

      {/* ══ 审议表决 ══ */}
      {tab === 'review' && (
        <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>
          {/* 分组统计 */}
          {nominations.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {([
                { key: 'party' as NominateGroup, label: '党代会', icon: '🏛️', color: '#8B3A3A' },
                { key: 'gov' as NominateGroup,   label: '政府班子', icon: '🏢', color: '#2A5A6A' },
                { key: 'nda' as NominateGroup,   label: '议政院班子', icon: '📜', color: '#2A6A3A' },
              ]).map(g => {
                const pending = nominations.filter(n => n.congressGroup === g.key && (n.status === 'eligible' || n.status === 'examining' || n.status === 'publicizing')).length;
                const approved = nominations.filter(n => n.congressGroup === g.key && n.status === 'approved').length;
                return (
                  <View key={g.key} style={{ flex: 1, backgroundColor: HDR, borderWidth: 1, borderColor: g.color + '44', borderTopWidth: 2, borderTopColor: g.color, padding: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 14 }}>{g.icon}</Text>
                    <Text style={{ color: g.color, fontSize: 9, marginTop: 2 }}>{g.label}</Text>
                    <Text style={{ color: TXT, fontSize: 11, fontWeight: '700', marginTop: 2 }}>{pending}项进行</Text>
                    <Text style={{ color: MUT, fontSize: 9 }}>{approved}项通过</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* 各分组待审提名 */}
          {(['party', 'gov', 'nda'] as const).map(group => {
            const groupPending = pendingNoms.filter(n => n.congressGroup === group);
            if (groupPending.length === 0) return null;
            const gInfo = { party: { label: '党代会', icon: '🏛️', color: '#8B3A3A' }, gov: { label: '政府班子（议政院）', icon: '🏢', color: '#2A5A6A' }, nda: { label: '议政院班子', icon: '📜', color: '#2A6A3A' } }[group];
            return (
              <View key={group}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: gInfo.color + '44' }}>
                  <Text style={{ fontSize: 14 }}>{gInfo.icon}</Text>
                  <Text style={{ color: gInfo.color, fontSize: 11, fontWeight: '700' }}>{gInfo.label} · 待审议 {groupPending.length} 项</Text>
                </View>
                {groupPending.map(n => {
                  const statusInfo: Record<string, { label: string; color: string; bg: string; desc: string; canProceed: boolean }> = {
                    eligible:    { label: '待考察', color: GLD, bg: '#2A2008', desc: '点击启动45天组织考察流程', canProceed: true },
                    examining:   { label: '考察中', color: '#88AAEE', bg: '#081828', desc: '组织部门正在对候选人进行全面考察（45天）', canProceed: false },
                    publicizing: { label: '公示中', color: '#88EE88', bg: '#082808', desc: '候选人信息公示（5天），公示后进入代会表决', canProceed: true },
                  };
                  const si = statusInfo[n.status] ?? statusInfo.eligible!;
                  const fColor = FACTION_COLORS[n.faction] ?? '#888';
                  return (
                    <View key={n.id} style={{ backgroundColor: '#141008', borderWidth: 1, borderColor: gInfo.color + '44', borderLeftWidth: 3, borderLeftColor: gInfo.color, padding: 14, marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <View style={{ backgroundColor: n.proposedBy === 'player' ? '#2A2010' : '#0A1A2A', borderWidth: 1, borderColor: n.proposedBy === 'player' ? GLD : '#4488FF', paddingHorizontal: 7, paddingVertical: 2 }}>
                          <Text style={{ color: n.proposedBy === 'player' ? GLD : '#88BBFF', fontSize: 9, fontWeight: '700' }}>
                            {n.proposedBy === 'player' ? '✍️ 您提名' : '📩 组织部提名'}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: TXT, flex: 1 }}>{n.subName}</Text>
                        <View style={{ backgroundColor: si.bg, borderWidth: 1, borderColor: si.color, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ color: si.color, fontSize: 9, fontWeight: '700' }}>{si.label}</Text>
                        </View>
                      </View>
                      <View style={{ backgroundColor: '#0E0C06', padding: 8, marginBottom: 8, gap: 3 }}>
                        <Text style={{ color: MUT, fontSize: 10 }}>
                          {n.kind}：{SUB_LEVEL_NAMES[n.subLevel]}
                          {n.kind === '晋升' ? ` → ${SUB_LEVEL_NAMES[n.targetLevel]}` : ''} · <Text style={{ color: fColor }}>{getFactionCN(n.faction)}</Text>
                        </Text>
                        <Text style={{ color: MUT, fontSize: 10 }}>
                          提交：{gameDaysToDate(n.createdDay)} · 通过率预估：
                          <Text style={{ color: n.passRate >= 75 ? '#88EE88' : n.passRate >= 55 ? GLD : '#EE6666', fontWeight: '700' }}>
                            {n.passRate}%
                          </Text>
                        </Text>
                        <Text style={{ color: '#6A5A3A', fontSize: 9 }}>{si.desc}</Text>
                      </View>
                      {n.notes.length > 0 && (
                        <View style={{ backgroundColor: '#1A1408', borderWidth: 1, borderColor: '#3A2A10', padding: 8, marginBottom: 8, gap: 3 }}>
                          {n.notes.map((note, i) => (
                            <Text key={i} style={{ color: '#AA8830', fontSize: 9 }}>• {note}</Text>
                          ))}
                        </View>
                      )}
                      {si.canProceed && (
                        <Pressable onPress={() => void handleProceed(n.id)}
                          style={{ backgroundColor: gInfo.color + '44', paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: gInfo.color }}
                        >
                          <Text style={{ color: TXT, fontWeight: '700', fontSize: 12 }}>
                            {n.status === 'eligible' ? '🔍 启动组织考察（45天）' : '📋 公示结束·提交代会表决'}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}

          {/* 历史表决记录（分组显示） */}
          {decidedNoms.length > 0 && (
            <>
              <View style={{ borderBottomWidth: 1, borderBottomColor: BOR, paddingBottom: 4 }}>
                <Text style={{ fontSize: 10, color: MUT, fontWeight: '700', letterSpacing: 2 }}>历史表决记录</Text>
              </View>
              {(['party', 'gov', 'nda'] as const).map(group => {
                const groupDecided = decidedNoms.filter(n => n.congressGroup === group);
                if (groupDecided.length === 0) return null;
                const gLabel = { party: '党代会', gov: '政府班子', nda: '议政院班子' }[group];
                const gColor = { party: '#8B3A3A', gov: '#2A5A6A', nda: '#2A6A3A' }[group];
                return (
                  <View key={group}>
                    <Text style={{ color: gColor, fontSize: 10, fontWeight: '700', marginBottom: 6 }}>{gLabel} 表决记录</Text>
                    {groupDecided.map(n => {
                      const ok = n.status === 'approved';
                      const quorum = Math.floor(n.totalVoters / 2) + 1;
                      return (
                        <View key={n.id} style={{ backgroundColor: '#141008', borderWidth: 1, borderColor: ok ? '#2A5A1A' : '#5A1A1A', padding: 12, marginBottom: 6 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <Text style={{ fontSize: 16 }}>{ok ? '✅' : '❌'}</Text>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: TXT, flex: 1 }}>{n.subName}</Text>
                            <View style={{ backgroundColor: ok ? '#1A4A0A' : '#4A0A0A', paddingHorizontal: 6, paddingVertical: 1 }}>
                              <Text style={{ fontSize: 9, color: ok ? '#5AE87A' : '#FF6666', fontWeight: '700' }}>
                                {ok ? `${n.kind}·通过` : `${n.kind}·否决`}
                              </Text>
                            </View>
                          </View>
                          <Text style={{ fontSize: 11, color: MUT }}>
                            {n.kind}：{SUB_LEVEL_NAMES[n.subLevel]}{n.kind === '晋升' ? ` → ${SUB_LEVEL_NAMES[n.targetLevel]}` : ''}
                          </Text>
                          <Text style={{ fontSize: 10, color: '#6A5A2A', marginTop: 4 }}>
                            {n.voteFor}票赞成 · {n.voteAgainst}票反对 · {n.voteAbstain}票弃权（需{quorum}票）
                          </Text>
                          {!ok && (
                            <Text style={{ fontSize: 9, color: '#AA4444', marginTop: 3 }}>
                              建议下届再议 · 改善候选人条件（能力/忠诚/异地经历/年龄）
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </>
          )}

          {nominations.length === 0 && (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🏛️</Text>
              <Text style={{ fontSize: 14, color: MUT, textAlign: 'center' }}>暂无提名记录</Text>
              <Text style={{ fontSize: 11, color: '#4A3A18', marginTop: 4 }}>
                {isWindowOpen ? '在「提名候选」页发起提名' : `${countdownText(gameDays, activeCongress.windowStart)}后进入代会窗口期`}
              </Text>
            </View>
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </View>
  );
}
```

<a id="srcappappofficialhierarchytsx"></a>
## `src/app/(app)/official-hierarchy.tsx`

```tsx
// 官职体系查阅页 — 县级 / 市级 / 省级 / 副省级城市 / 国家级
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import {
  View, Text, Pressable, ScrollView,
} from 'react-native';
import {
  COUNTY_OFFICIAL_POSITIONS,
  CITY_OFFICIAL_POSITIONS,
  PROVINCE_OFFICIAL_POSITIONS,
  SUB_PROVINCE_CITY_POSITIONS,
  NATIONAL_ORGAN_ORDER,
  NATIONAL_TIER_COLOR,
  NATIONAL_TIER_LABEL,
  getNationalByOrgan,
  type CountyPosition,
  type CityPosition,
  type ProvincePosition,
  type SubProvincePosition,
  type NationalPosition,
  type NationalOrgan,
} from '@/types/game';

// ── 类型联合 ──────────────────────────────────────────────────
type AnyPosition =
  | (CountyPosition & { _level: 'county' })
  | (CityPosition & { _level: 'city' })
  | (ProvincePosition & { _level: 'province' })
  | (SubProvincePosition & { _level: 'sub' });

// ── Tab 配置 ──────────────────────────────────────────────────
type TabKey = 'county' | 'city' | 'province' | 'sub' | 'national';
const TABS: { key: TabKey; label: string; subtitle: string }[] = [
  { key: 'county',   label: '县级',   subtitle: '正处／副处／正科' },
  { key: 'city',     label: '市级',   subtitle: '正厅／副厅／正处' },
  { key: 'province', label: '省级',   subtitle: '正部／副部／正厅' },
  { key: 'sub',      label: '副省级', subtitle: '副部／正厅／副厅' },
  { key: 'national', label: '国家级', subtitle: '常委/政治局/国政院' },
];

// ── 级别色系 ─────────────────────────────────────────────────
const TIER_COLOR: Record<string, string> = {
  // 县级
  '正处级': '#C82829',
  '副处级': '#A04020',
  '正科级': '#2B4B6F',
  '副科级': '#5A7A9F',
  // 市级
  '正厅级': '#7B0E0E',
  '副厅级': '#C82829',
  // 省级
  '正部级': '#4A0000',
  '副部级': '#7B0E0E',
  // 副省级城市
  '副部级_spc': '#7B0E0E',
};

function getTierColor(tier: string): string {
  return TIER_COLOR[tier] ?? '#2B4B6F';
}

// ── 器官(所属机关)背景色 ──────────────────────────────────────
const ORGAN_BG: Record<string, string> = {
  // 县级
  县委: '#F0EAE0', 县政府: '#EAF0F8', 县议政院: '#F8F0EA', 县参政院: '#EAF8F0',
  县纪委: '#F8EAEA', 政法: '#F5F0E8', 职能局: '#EDF5F8', 乡镇: '#F0F8ED',
  团委: '#FFF5E6', 人武部: '#EEF0E8',
  // 市级
  市委: '#F0EAE0', 市政府: '#EAF0F8', 市议政院: '#F8F0EA', 市参政院: '#EAF8F0',
  市纪委: '#F8EAEA', 市直属局: '#EDF5F8', '区（县）': '#F0F8ED',
  军分区: '#E8EDE8', 市武警: '#ECEDE8',
  // 省级
  省委: '#F0EAE0', 省政府: '#EAF0F8', 省议政院: '#F8F0EA', 省参政院: '#EAF8F0',
  省纪委: '#F8EAEA', 省直属厅: '#EDF5F8', 地市: '#F0F8ED',
  省军区: '#E8EDE8', 武警: '#ECEDE8',
  // 副省级城市
  区委: '#F0EAE0', 区政府: '#EAF0F8', 街道: '#F5F5E8', 市直属局副省: '#EDF5F8',
};

// ── 行项组件 ─────────────────────────────────────────────────
interface PositionRowProps {
  title: string;
  tier: string;
  organ: string;
  desc: string;
  isHighProfile?: boolean;
  highProfileNote?: string;
}
function PositionRow({ title, tier, organ, desc, isHighProfile, highProfileNote }: PositionRowProps) {
  const [open, setOpen] = useState(false);
  const tierColor = getTierColor(tier);
  const organBg = ORGAN_BG[organ] ?? '#F5F4F1';

  return (
    <Pressable
      onPress={() => setOpen(v => !v)}
      style={{ borderBottomWidth: 1, borderBottomColor: '#E8E5DC' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 12, gap: 8 }}>
        {/* 级别色标 */}
        <View style={{ width: 4, height: 36, backgroundColor: tierColor }} />
        {/* 主内容 */}
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A', letterSpacing: 0.3 }}>{title}</Text>
            {isHighProfile && (
              <View style={{ backgroundColor: '#FFF3CD', borderWidth: 1, borderColor: '#F0C050', paddingHorizontal: 5, paddingVertical: 1 }}>
                <Text style={{ fontSize: 9, color: '#7A5C00', fontWeight: '700' }}>⭐高配</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <View style={{ backgroundColor: tierColor, paddingHorizontal: 5, paddingVertical: 1 }}>
              <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>{tier}</Text>
            </View>
            <View style={{ backgroundColor: organBg, borderWidth: 1, borderColor: tierColor + '44', paddingHorizontal: 5, paddingVertical: 1 }}>
              <Text style={{ fontSize: 9, color: tierColor }}>{organ}</Text>
            </View>
          </View>
        </View>
        {/* 展开箭头 */}
        <Text style={{ color: '#999', fontSize: 14 }}>{open ? '▲' : '▼'}</Text>
      </View>

      {/* 展开内容 */}
      {open && (
        <View style={{ backgroundColor: '#FAFAF7', borderTopWidth: 1, borderTopColor: '#E8E5DC', paddingHorizontal: 16, paddingVertical: 8, gap: 4 }}>
          <Text style={{ fontSize: 12, color: '#444', lineHeight: 18 }}>{desc}</Text>
          {isHighProfile && highProfileNote && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 4, backgroundColor: '#FFF9E6', borderWidth: 1, borderColor: '#F0C050', padding: 7 }}>
              <Text style={{ fontSize: 9, color: '#7A5C00', fontWeight: '700', marginTop: 1 }}>高配说明：</Text>
              <Text style={{ fontSize: 11, color: '#7A5C00', flex: 1, lineHeight: 16 }}>{highProfileNote}</Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

// ── 分区标题 ─────────────────────────────────────────────────
function SectionHeader({ tier, color }: { tier: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: color + '18', borderLeftWidth: 4, borderLeftColor: color, paddingHorizontal: 12, paddingVertical: 6 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color, letterSpacing: 1.5 }}>— {tier} —</Text>
    </View>
  );
}

// ── 国家级：机构标题 ──────────────────────────────────────────
const NATIONAL_ORGAN_STYLE: Record<NationalOrgan, { bg: string; accent: string; icon: string }> = {
  '中枢决策常委会':       { bg: '#1C0808', accent: '#E05050', icon: '★' },
  '中枢政治局':             { bg: '#1A0A18', accent: '#C060A0', icon: '🏛️' },
  '中枢书记处':             { bg: '#150D20', accent: '#9070D0', icon: '📋' },
  '中枢纪律督察委员会':     { bg: '#12101C', accent: '#7080C0', icon: '⚖️' },
  '全国议政院常委会': { bg: '#0D1610', accent: '#508060', icon: '📜' },
  '华夏参政院':   { bg: '#101610', accent: '#608050', icon: '🤝' },
  '中枢军事委员会':         { bg: '#0D1018', accent: '#506080', icon: '🎖️' },
  '国政院':                 { bg: '#0D1520', accent: '#4A8AAA', icon: '🏢' },
  '中枢宣传部':             { bg: '#1A1008', accent: '#D08030', icon: '📢' },
  '中枢统战部':             { bg: '#0E1818', accent: '#40A080', icon: '🤝' },
  '中央政法委':             { bg: '#140C10', accent: '#A04060', icon: '🚔' },
  '中枢社会工作部':         { bg: '#0E1014', accent: '#4880A0', icon: '🏘️' },
  '中央党校':               { bg: '#141008', accent: '#A08030', icon: '🏫' },
  '中央网信委办公室':       { bg: '#0C1418', accent: '#3090B0', icon: '🌐' },
  '青年联合总团':             { bg: '#12100A', accent: '#B0802A', icon: '◆' },
};

function NationalOrganHeader({ organ }: { organ: NationalOrgan }) {
  const s = NATIONAL_ORGAN_STYLE[organ];
  return (
    <View style={{ backgroundColor: s.bg, borderLeftWidth: 4, borderLeftColor: s.accent, paddingHorizontal: 14, paddingVertical: 10, marginTop: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: 14 }}>{s.icon}</Text>
        <Text style={{ fontSize: 13, fontWeight: '800', color: s.accent, letterSpacing: 1.5 }}>{organ}</Text>
      </View>
    </View>
  );
}

// ── 国家级：职位行 ────────────────────────────────────────────
function NationalPositionRow({ pos }: { pos: NationalPosition }) {
  const [open, setOpen] = useState(false);
  const tierColor = NATIONAL_TIER_COLOR[pos.tier];
  const tierLabel = NATIONAL_TIER_LABEL[pos.tier];
  const organStyle = NATIONAL_ORGAN_STYLE[pos.organ];

  return (
    <Pressable
      onPress={() => setOpen(v => !v)}
      style={{ borderBottomWidth: 1, borderBottomColor: organStyle.bg + 'CC' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, gap: 8, backgroundColor: '#141414' }}>
        {/* 层级色标 */}
        <View style={{ width: 4, height: 38, backgroundColor: tierColor }} />
        {/* 主内容 */}
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#F0E8D8', letterSpacing: 0.3 }}>{pos.title}</Text>
            {pos.isPSC && (
              <View style={{ backgroundColor: '#8B0000', paddingHorizontal: 5, paddingVertical: 1 }}>
                <Text style={{ fontSize: 9, color: '#FFD0A0', fontWeight: '700' }}>★ 常委</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
            <View style={{ backgroundColor: tierColor + 'CC', paddingHorizontal: 5, paddingVertical: 1 }}>
              <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>{tierLabel}</Text>
            </View>
          </View>
        </View>
        <Text style={{ color: '#556', fontSize: 13 }}>{open ? '▲' : '▼'}</Text>
      </View>

      {/* 展开内容 */}
      {open && (
        <View style={{ backgroundColor: '#1A1A1A', borderTopWidth: 1, borderTopColor: '#2A2A2A', paddingHorizontal: 16, paddingVertical: 10, gap: 6 }}>
          <Text style={{ fontSize: 12, color: '#C8C0B0', lineHeight: 18 }}>{pos.desc}</Text>
          {pos.concurrentNote && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4, backgroundColor: organStyle.bg, borderWidth: 1, borderColor: organStyle.accent + '55', padding: 8, marginTop: 2 }}>
              <Text style={{ fontSize: 9, color: organStyle.accent, fontWeight: '700', marginTop: 1 }}>兼任说明：</Text>
              <Text style={{ fontSize: 11, color: organStyle.accent + 'DD', flex: 1, lineHeight: 16 }}>{pos.concurrentNote}</Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

// ── 渲染列表 ─────────────────────────────────────────────────
function buildCounty(): AnyPosition[] {
  return COUNTY_OFFICIAL_POSITIONS.map(p => ({ ...p, _level: 'county' as const }));
}
function buildCity(): AnyPosition[] {
  return CITY_OFFICIAL_POSITIONS.map(p => ({ ...p, _level: 'city' as const }));
}
function buildProvince(): AnyPosition[] {
  return PROVINCE_OFFICIAL_POSITIONS.map(p => ({ ...p, _level: 'province' as const }));
}
function buildSub(): AnyPosition[] {
  return SUB_PROVINCE_CITY_POSITIONS.map(p => ({ ...p, _level: 'sub' as const }));
}

// 不同级别的分区顺序
const COUNTY_TIERS   = ['正处级', '副处级', '正科级', '副科级'];
const CITY_TIERS     = ['正厅级', '副厅级', '正处级', '副处级'];
const PROVINCE_TIERS = ['正部级', '副部级', '正厅级', '副厅级'];
const SUB_TIERS      = ['副部级', '正厅级', '副厅级', '正处级'];

function getTierOrder(tab: TabKey): string[] {
  if (tab === 'county')   return COUNTY_TIERS;
  if (tab === 'city')     return CITY_TIERS;
  if (tab === 'province') return PROVINCE_TIERS;
  return SUB_TIERS;
}

function getData(tab: TabKey): AnyPosition[] {
  if (tab === 'county')   return buildCounty();
  if (tab === 'city')     return buildCity();
  if (tab === 'province') return buildProvince();
  if (tab === 'national') return [];
  return buildSub();
}

// ── 主页 ─────────────────────────────────────────────────────
export default function OfficialHierarchyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('county');

  const data = getData(activeTab);
  const tiers = getTierOrder(activeTab);

  // 普通 tab 渲染（按级别分组）
  const renderContent = useCallback(() => {
    if (activeTab === 'national') return null;
    return tiers.map(tier => {
      const items = data.filter(p => p.tier === tier);
      if (items.length === 0) return null;
      return (
        <View key={tier}>
          <SectionHeader tier={tier} color={getTierColor(tier)} />
          {items.map(item => (
            <PositionRow
              key={item.key}
              title={item.title}
              tier={item.tier}
              organ={item.organ}
              desc={item.desc}
              isHighProfile={item.isHighProfile}
              highProfileNote={item.highProfileNote}
            />
          ))}
        </View>
      );
    });
  }, [activeTab, data, tiers]);

  // 国家级 tab 渲染（按机构分组，深色主题）
  const renderNational = useCallback(() => {
    if (activeTab !== 'national') return null;
    return NATIONAL_ORGAN_ORDER.map(organ => {
      const positions = getNationalByOrgan(organ as NationalOrgan);
      if (positions.length === 0) return null;
      return (
        <View key={organ}>
          <NationalOrganHeader organ={organ as NationalOrgan} />
          {positions.map(pos => (
            <NationalPositionRow key={pos.key} pos={pos} />
          ))}
        </View>
      );
    });
  }, [activeTab]);

  const isNational = activeTab === 'national';
  const currentTab = TABS.find(t => t.key === activeTab)!;
  const highProfileCount = isNational ? 7 : data.filter(p => p.isHighProfile).length;
  const leagueCount = isNational ? 0 : data.filter(p => p.organ === '团委').length;
  const totalCount = isNational
    ? NATIONAL_ORGAN_ORDER.reduce((n, o) => n + getNationalByOrgan(o as NationalOrgan).length, 0)
    : data.length;

  return (
    <View style={{ flex: 1, backgroundColor: isNational ? '#0D0D0D' : '#F5F4F1' }}>
      <StatusBar style="light" backgroundColor={isNational ? '#100808' : '#1D3B5E'} />

      {/* 顶栏 */}
      <View style={{ backgroundColor: isNational ? '#140A0A' : '#2B4B6F', paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: isNational ? '#AA6666' : '#a0b4cc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: isNational ? '#AA6666' : '#a0b4cc', fontSize: 10, letterSpacing: 1 }}>人事制度 · 职位体系</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>官职体系</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Text style={{ color: isNational ? '#AA6666' : '#a0b4cc', fontSize: 10 }}>{currentTab.label} · {totalCount}个职位</Text>
            {isNational && (
              <Text style={{ color: '#E08060', fontSize: 10 }}>
                ★ 7名政治局常委 · 9大机构
              </Text>
            )}
            {!isNational && highProfileCount > 0 && (
              <Text style={{ color: '#F0C050', fontSize: 10 }}>
                ⭐ {highProfileCount}个高配{leagueCount > 0 ? ` · ◆ ${leagueCount}个团委` : ''}
              </Text>
            )}
          </View>
        </View>

        {/* Tab栏 */}
        <View style={{ flexDirection: 'row', gap: 0 }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            const isNatTab = tab.key === 'national';
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={{
                  flex: 1, alignItems: 'center', paddingVertical: 7,
                  backgroundColor: isActive
                    ? (isNatTab ? '#8B0000' : '#C82829')
                    : 'rgba(255,255,255,0.08)',
                  borderWidth: 1,
                  borderColor: isActive
                    ? (isNatTab ? '#8B0000' : '#C82829')
                    : 'rgba(255,255,255,0.15)',
                  marginHorizontal: 2,
                }}
              >
                <Text style={{ fontSize: 11, color: '#fff', fontWeight: isActive ? '700' : '400' }}>{tab.label}</Text>
                <Text style={{ fontSize: 8, color: isActive ? (isNatTab ? '#FFB090' : '#FFD0A0') : '#a0b4cc', marginTop: 1 }}>{tab.subtitle}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 说明条 */}
      {!isNational && (
        <View style={{ backgroundColor: '#FFF9E6', borderBottomWidth: 1, borderBottomColor: '#F0C050', paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ fontSize: 11, color: '#7A5C00', lineHeight: 16 }}>
            点击职位可展开详细说明。⭐高配职位为非常规升格安排，实际级别高于标注等级。<Text style={{ color: '#B07000', fontWeight: '700' }}>◆团委</Text> 职位为团派路线专属通道。
          </Text>
        </View>
      )}
      {isNational && (
        <View style={{ backgroundColor: '#1C0A0A', borderBottomWidth: 1, borderBottomColor: '#8B0000', paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ fontSize: 11, color: '#CC8060', lineHeight: 16 }}>
            ★ 点击职位可展开职权说明。政治局常委会7名常委为最高决策核心；国政院统筹国家行政；青年联合总团为团派路线核心晋升通道。
          </Text>
        </View>
      )}

      {/* 退休年龄规则说明条 */}
      {!isNational && (
        <View style={{ backgroundColor: '#F0EEF8', borderBottomWidth: 1, borderBottomColor: '#C0B0E0', paddingHorizontal: 14, paddingVertical: 8 }}>
          {activeTab === 'county' && (
            <Text style={{ fontSize: 11, color: '#3A2A6A', lineHeight: 17 }}>
              🕐 <Text style={{ fontWeight: '700' }}>退休规则：</Text>
              科员至正处级（rank 1–6），基准退休年龄均为 <Text style={{ fontWeight: '700' }}>90岁</Text>，经批准可延迟最长 <Text style={{ fontWeight: '700' }}>5年</Text>（最晚95岁）。
              团委书记为团派路线起点，届满可平级转任乡镇或县委系统实职。
            </Text>
          )}
          {activeTab === 'city' && (
            <Text style={{ fontSize: 11, color: '#3A2A6A', lineHeight: 17 }}>
              🕐 <Text style={{ fontWeight: '700' }}>退休规则：</Text>
              副厅级（rank 7–8）、正厅级（rank 7–8正职）基准退休年龄 <Text style={{ fontWeight: '700' }}>90岁</Text>，经批准可延迟最长 <Text style={{ fontWeight: '700' }}>5年</Text>（最晚95岁）；
              副部级（rank 9–10）基准 <Text style={{ fontWeight: '700' }}>90岁</Text>，经批准可延迟最长 <Text style={{ fontWeight: '700' }}>5年</Text>（最晚95岁）。
              团市委书记届满后多转任政府实职副厅级岗位。
            </Text>
          )}
          {activeTab === 'province' && (
            <Text style={{ fontSize: 11, color: '#3A2A6A', lineHeight: 17 }}>
              🕐 <Text style={{ fontWeight: '700' }}>退休规则：</Text>
              正部级（rank 11–12）基准 <Text style={{ fontWeight: '700' }}>90岁</Text>，经批准可延迟最长 <Text style={{ fontWeight: '700' }}>5年</Text>（最晚95岁）；
              副国家级（rank 13）基准 <Text style={{ fontWeight: '700' }}>90岁</Text>，最多延迟5年（最晚95岁）；
              正国家级（rank 14–15）<Text style={{ fontWeight: '700' }}>不设强制退休年龄</Text>，90岁可自主退休。
              团省委书记（省委常委兼任）届满后多转任副省长，是团派路线进入副部级实职的核心通道。
            </Text>
          )}
          {activeTab === 'sub' && (
            <Text style={{ fontSize: 11, color: '#3A2A6A', lineHeight: 17 }}>
              🕐 <Text style={{ fontWeight: '700' }}>退休规则：</Text>
              副省级城市正职为副部级（rank 9–10），基准退休年龄 <Text style={{ fontWeight: '700' }}>90岁</Text>，
              经组织批准可延迟最长 <Text style={{ fontWeight: '700' }}>5年</Text>（最晚95岁）。
            </Text>
          )}
        </View>
      )}
      {isNational && (
        <View style={{ backgroundColor: '#120808', borderBottomWidth: 1, borderBottomColor: '#3A1818', paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ fontSize: 11, color: '#906060', lineHeight: 17 }}>
            🕐 <Text style={{ fontWeight: '700', color: '#C08060' }}>退休规则：</Text>
            正国家级（rank 14–15）<Text style={{ fontWeight: '700', color: '#E09060' }}>不设强制退休年龄</Text>，90周岁时可自主选择退休。每届任期5年，届满后经全国执政党代表大会/议政院投票决定是否续任；国政院院理依宪法连任不超过两届，总执书记·华夏主席任期由党代会决定，无届次上限。
          </Text>
        </View>
      )}

      {/* 内容区 */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: isNational ? '#0D0D0D' : '#F5F4F1' }}
      >
        {renderContent()}
        {renderNational()}
      </ScrollView>
    </View>
  );
}
```

<a id="srcappapppendingapprovaltsx"></a>
## `src/app/(app)/pending-approval.tsx`

```tsx
// 档案审核中页 — 等待审批（含免费声明 + 已提交测试码显示 + 临时申诉入口）
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/client/supabase';
import { TempAppealModal } from '@/components/TempAppealModal';

const C = {
  bg: '#07111E',
  bgCard: '#0F2235',
  gold: '#C8A84B',
  goldLight: '#E8D08A',
  goldDim: '#7A6428',
  goldBg: 'rgba(200,168,75,0.08)',
  red: '#C82829',
  textPrimary: '#EDE8DC',
  textSecond: '#A09070',
  textHint: '#5A5040',
  divider: '#162840',
  dividerGold: 'rgba(200,168,75,0.25)',
  successBorder: '#2a7a3b',
  successBg: 'rgba(40,120,60,0.12)',
  successText: '#7FE0A0',
};

export default function PendingApprovalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [testCode, setTestCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 临时申诉弹窗
  const [appealOpen, setAppealOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const check = async () => {
        const { data } = await supabase.rpc('get_my_test_code_status');
        const d = (data as { approval_status?: string; test_code?: string | null } | null) ?? {};
        if (active) {
          setTestCode(d.test_code ?? null);
          setLoading(false);
        }
        // 已通过的临时申诉：通过 gate 重新路由（正确处理角色创建分支）
        const { data: approved } = await supabase.rpc('has_approved_temp_appeal');
        if (active && Boolean(approved)) {
          router.replace('/');
        }
      };
      check();
      // 轮询：管理员同意后自动跳转，无需手动刷新
      const timer = setInterval(check, 3000);
      return () => {
        active = false;
        clearInterval(timer);
      };
    }, [router]),
  );

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/sign-in');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="light" />
      <View style={{ height: 3, backgroundColor: C.gold, position: 'absolute', top: 0, left: 0, right: 0 }} />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingTop: insets.top + 32,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ fontSize: 40 }}>⏳</Text>
          <Text style={{ fontSize: 26, fontWeight: '900', color: C.goldLight, letterSpacing: 4, marginTop: 12 }}>档案审核中</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <View style={{ width: 32, height: 1, backgroundColor: C.goldDim }} />
            <View style={{ width: 6, height: 6, backgroundColor: C.gold, transform: [{ rotate: '45deg' }] }} />
            <View style={{ width: 32, height: 1, backgroundColor: C.goldDim }} />
          </View>
        </View>

        <View style={{ width: '100%', maxWidth: 400, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.dividerGold }}>
          <View style={{ height: 2, backgroundColor: C.gold }} />
          <View style={{ padding: 20, gap: 14 }}>
            <Text style={{ fontSize: 13, color: C.textPrimary, lineHeight: 22 }}>
              您的档案已提交，正在等待管理员审核。{'\n'}审核通过后即可进入游戏，请耐心等待。
            </Text>

            {/* 等待超时提示 */}
            <View style={{ backgroundColor: 'rgba(200,168,75,0.08)', borderLeftWidth: 2, borderLeftColor: C.goldDim, paddingHorizontal: 12, paddingVertical: 10 }}>
              <Text style={{ fontSize: 11, color: C.textSecond, lineHeight: 19 }}>
                💡 如长时间未获得审批，请退出后重新打开链接进入，多试几次。{'\n'}若仍无效，请联系管理员。
              </Text>
            </View>

            {loading ? (
              <ActivityIndicator color={C.gold} />
            ) : testCode ? (
              <View style={{ backgroundColor: C.goldBg, borderLeftWidth: 2, borderLeftColor: C.gold, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ fontSize: 10, color: C.textSecond, letterSpacing: 2 }}>已提交的测试码</Text>
                <Text style={{ fontSize: 16, color: C.goldLight, fontWeight: '700', letterSpacing: 2, marginTop: 4 }}>{testCode}</Text>
              </View>
            ) : null}

            {/* 临时申诉入口 */}
            <Pressable onPress={() => setAppealOpen(true)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4,
                borderWidth: 1, borderColor: C.dividerGold, backgroundColor: C.goldBg, paddingHorizontal: 16, paddingVertical: 10 }}>
              <Text style={{ fontSize: 12, color: C.goldLight, fontWeight: '600' }}>📝 存档丢失？提交临时申诉</Text>
            </Pressable>

            {/* 免费声明框 */}
            <View style={{ borderWidth: 1, borderColor: C.successBorder, backgroundColor: C.successBg, paddingHorizontal: 12, paddingVertical: 10 }}>
              <Text style={{ fontSize: 11, color: C.successText, lineHeight: 18 }}>
                ⚠️ 重要声明 · 请务必阅读：本游戏测试码为绝对免费（包括游戏链接也是）。{'\n'}如有任何自称管理员的人向您索要费用，请立即联系频道主高仙。
              </Text>
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: C.dividerGold }} />
        </View>

        <Pressable onPress={handleSignOut} style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 12, color: C.textSecond, letterSpacing: 1 }}>退出登录</Text>
        </Pressable>
      </ScrollView>

      {/* 临时申诉弹窗 */}
      <TempAppealModal visible={appealOpen} onClose={() => setAppealOpen(false)} />
    </View>
  );
}
```

<a id="srcappapppersonalwealthtsx"></a>
## `src/app/(app)/personal-wealth.tsx`

```tsx
// 个人财富页面 —— 工资条、公积金、补贴、资产购置
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { updateSave } from '@/db/gameApi';
import {
  RANK_SALARY,
  RANK_GROSS_SALARY,
  RANK_PERSONAL_SOCIAL_INSURANCE,
  RANK_PERSONAL_HPF,
  RANK_MONTHLY_ALLOWANCE,
  RANK_ALLOWANCE_DETAIL,
  RANK_ANNUAL_BONUS_MONTHS,
  RANK_HOUSING,
  PURCHASABLE_ITEMS,
  RANK_CONFIG,
} from '@/types/game';
import type { PurchasableItem } from '@/types/game';
import { IllicitFundsTab } from '@/components/IllicitFundsTab';

// ── 格式化金额 ──────────────────────────────────────────────
function fmtMoney(yuan: number): string {
  if (yuan >= 100000000) return `${(yuan / 100000000).toFixed(2)} 亿元`;
  if (yuan >= 10000) return `${(yuan / 10000).toFixed(1)} 万元`;
  return `${yuan.toLocaleString()} 元`;
}
function fmtMoneyShort(yuan: number): string {
  if (yuan >= 100000000) return `${(yuan / 100000000).toFixed(1)}亿`;
  if (yuan >= 10000) return `${(yuan / 10000).toFixed(1)}万`;
  return `${yuan.toLocaleString()}元`;
}

const CATEGORY_EMOJI: Record<string, string> = {
  出行: '🚗', 房产: '🏠', 投资: '📈', 进修: '🎓', 生活: '🌿', 礼品: '🎁',
};
const CATEGORY_COLOR: Record<string, string> = {
  出行: '#2B4B6F', 房产: '#1D5C36', 投资: '#7C3AED', 进修: '#C05521', 生活: '#2563EB', 礼品: '#C82829',
};
const ALL_CATEGORIES = ['出行', '房产', '投资', '进修', '生活', '礼品'] as const;

// ── 工资条行组件 ────────────────────────────────────────────
function PayRow({
  label, amount, color = '#1A1A1A', bold = false, isDeduct = false, sub = false,
}: { label: string; amount: number; color?: string; bold?: boolean; isDeduct?: boolean; sub?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
      <Text style={{ fontSize: sub ? 10 : 11, color: sub ? '#888' : '#555', paddingLeft: sub ? 8 : 0 }}>
        {sub ? '· ' : ''}{label}
      </Text>
      <Text style={{
        fontSize: sub ? 10 : 11, fontFamily: 'monospace', fontWeight: bold ? '700' : '400',
        color: isDeduct ? '#C05521' : color,
      }}>
        {isDeduct ? '-' : '+'}{fmtMoney(amount)}
      </Text>
    </View>
  );
}

// ── 卡片容器 ───────────────────────────────────────────────
function Card({ headerColor, headerText, emoji, tag, children }: {
  headerColor: string; headerText: string; emoji: string; tag?: string; children: React.ReactNode;
}) {
  return (
    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', borderRadius: 2, overflow: 'hidden' }}>
      <View style={{ backgroundColor: headerColor, paddingHorizontal: 14, paddingVertical: 9, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 2 }}>{emoji} {headerText}</Text>
        {tag ? <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 9 }}>{tag}</Text> : null}
      </View>
      <View style={{ padding: 14 }}>{children}</View>
    </View>
  );
}

// ── 主页面 ─────────────────────────────────────────────────
export default function PersonalWealthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, refreshSave } = useGame();
  const [activeCategory, setActiveCategory] = useState<string>('全部');
  const [buyingKey, setBuyingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [showConfirm, setShowConfirm] = useState<PurchasableItem | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'shop' | 'illicit'>('overview');

  useFocusEffect(useCallback(() => { refreshSave(); }, [refreshSave]));

  if (!save) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F4F1' }}>
        <ActivityIndicator color="#C82829" />
      </View>
    );
  }

  const rankLevel = save.rankLevel;
  const rankCfg = RANK_CONFIG[rankLevel];
  // ── 工资条数据 ──
  const grossSalary = RANK_GROSS_SALARY[rankLevel] ?? 8000;
  const personalSI = RANK_PERSONAL_SOCIAL_INSURANCE[rankLevel] ?? 714;
  const personalHpf = RANK_PERSONAL_HPF[rankLevel] ?? 816;
  const netSalary = RANK_SALARY[rankLevel] ?? 5500;
  // 个税（倒算：应发 - 社保 - 公积金个人 - 税后 = 个税）
  const incomeTax = Math.max(0, grossSalary - personalSI - personalHpf - netSalary);

  const monthlyAllowance = RANK_MONTHLY_ALLOWANCE[rankLevel] ?? 500;
  const allowanceDetail = RANK_ALLOWANCE_DETAIL[rankLevel] ?? [];
  // 公积金：单位同等缴存，账户每月到账 = 个人+单位
  const unitHpf = personalHpf;
  const monthlyHpfTotal = personalHpf + unitHpf;
  // 月度实际到手（工资+补贴；公积金归入独立账户）
  const monthlyTakeHome = netSalary + monthlyAllowance;

  // 年终奖估算（称职基准）
  const bonusMonths = RANK_ANNUAL_BONUS_MONTHS[rankLevel] ?? 1.0;
  const estimatedAnnualBonus = Math.round(netSalary * bonusMonths);
  const estimatedAnnualBonusExcellent = Math.round(netSalary * bonusMonths * 1.2);

  // ── 资产数据 ──
  const savings = save.personalSavings ?? 0;
  const hpfBalance = save.providentFundBalance ?? 0;
  const assets: string[] = save.personalAssets ?? [];
  const housing = RANK_HOUSING[rankLevel] ?? null;

  // 已购置资产市值估算（原价×保值系数）
  const ownedItems = PURCHASABLE_ITEMS.filter(i => assets.includes(i.key));
  const assetValue = ownedItems.reduce((acc, i) => {
    const retainRate = i.category === '房产' ? 1.15 : i.category === '出行' ? 0.7 : i.category === '投资' ? 1.0 : 0.5;
    return acc + Math.round(i.price * retainRate);
  }, 0);
  const totalNetWorth = savings + hpfBalance + assetValue;

  // 月度投资估算收益
  const investMonthlyEst = ownedItems
    .filter(i => i.isMonthlyReturn)
    .reduce((acc, i) => {
      const prices: Record<string, number> = { stock_small: 50000, stock_medium: 200000, fund_invest: 100000 };
      return acc + Math.round((prices[i.key] ?? 0) * (i.monthlyReturnRate ?? 0));
    }, 0);

  // ── 购物筛选 ──
  const filteredItems = PURCHASABLE_ITEMS.filter(item => {
    if (activeCategory !== '全部' && item.category !== activeCategory) return false;
    if (item.isMonthlyReturn) return true;
    return !assets.includes(item.key);
  });

  // ── 购买逻辑 ──
  const handleBuy = async (item: PurchasableItem) => {
    if (!save) return;
    if (savings < item.price) {
      setFeedback({ msg: '💳 余额不足，无法购买', ok: false });
      setTimeout(() => setFeedback(null), 2500);
      return;
    }
    setBuyingKey(item.key);
    setShowConfirm(null);
    try {
      await updateSave(save.id, {
        personalSavings: savings - item.price,
        personalAssets: [...assets, item.key],
        meritPoints: Math.max(0, Math.round((save.meritPoints + (item.meritBonus ?? 0)) * 10) / 10),
        moralValue: Math.min(100, Math.max(0, save.moralValue + (item.moralBonus ?? 0))),
        bossFavor: Math.min(100, Math.max(0, save.bossFavor + (item.bossFavorBonus ?? 0))),
      });
      await refreshSave();
      setFeedback({ msg: `✅ 已购置：${item.name}`, ok: true });
    } catch {
      setFeedback({ msg: '⚠️ 购买失败，请重试', ok: false });
    } finally {
      setBuyingKey(null);
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  // ── 辅助：分割线 ──
  const Divider = () => <View style={{ height: 1, backgroundColor: '#F0EDE8', marginVertical: 6 }} />;

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      <StatusBar style="dark" />

      {/* ── 标题栏 ── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderBottomWidth: 2, borderBottomColor: '#C82829',
        paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16,
      }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ fontSize: 18, color: '#C82829' }}>←</Text>
        </Pressable>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A', letterSpacing: 3, flex: 1 }}>
          个人财富管理
        </Text>
        <Text style={{ fontSize: 10, color: '#888' }}>{rankCfg?.name ?? '-'}</Text>
      </View>

      {/* ── Tab切换 ── */}
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8E5E0' }}>
        {(['overview', 'shop', 'illicit'] as const).map(tab => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={{
              flex: 1, paddingVertical: 11, alignItems: 'center',
              borderBottomWidth: 2,
              borderBottomColor: activeTab === tab ? '#C82829' : 'transparent',
            }}>
            <Text style={{ fontSize: 12, fontWeight: activeTab === tab ? '700' : '400', color: activeTab === tab ? '#C82829' : '#888' }}>
              {tab === 'overview' ? '💼 财务总览' : tab === 'shop' ? '🛒 消费与投资' : '💰 赃款账户'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── 反馈提示 ── */}
      {feedback && (
        <View style={{
          marginHorizontal: 14, marginTop: 10, padding: 10, borderRadius: 2,
          backgroundColor: feedback.ok ? '#E8F5E9' : '#FFF3F3',
          borderLeftWidth: 3, borderLeftColor: feedback.ok ? '#2a7a3b' : '#C82829',
        }}>
          <Text style={{ fontSize: 12, color: feedback.ok ? '#2a7a3b' : '#C82829', fontWeight: '600' }}>
            {feedback.msg}
          </Text>
        </View>
      )}

      <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
        <View style={{ padding: 14, gap: 12 }}>

          {activeTab === 'overview' ? (
            <>
              {/* ── 净资产总览 ── */}
              <View style={{
                backgroundColor: '#1A1A1A', borderRadius: 2, padding: 16,
                boxShadow: [{ offsetX: 0, offsetY: 2, blurRadius: 8, color: 'rgba(0,0,0,0.18)' }],
              }}>
                <Text style={{ color: '#aaa', fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>个人净资产总览</Text>
                <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800', fontFamily: 'monospace', marginBottom: 12 }}>
                  {fmtMoney(totalNetWorth)}
                </Text>
                <View style={{ flexDirection: 'row', gap: 0 }}>
                  {[
                    { label: '现金存款', value: savings, color: '#C82829' },
                    { label: '公积金', value: hpfBalance, color: '#2563EB' },
                    { label: '资产估值', value: assetValue, color: '#2a7a3b' },
                  ].map((item, i) => (
                    <View key={item.label} style={{
                      flex: 1, alignItems: 'center',
                      borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: '#333',
                      paddingVertical: 4,
                    }}>
                      <Text style={{ color: item.color, fontSize: 13, fontWeight: '700', fontFamily: 'monospace' }}>
                        {fmtMoneyShort(item.value)}
                      </Text>
                      <Text style={{ color: '#777', fontSize: 9, marginTop: 2 }}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* ── 工资条明细卡 ── */}
              <Card headerColor="#8B2020" headerText="本月工资条" emoji="📄" tag="月度核算单">
                {/* 应发部分 */}
                <Text style={{ fontSize: 9, color: '#aaa', letterSpacing: 2, marginBottom: 4 }}>【应发项目】</Text>
                <PayRow label="职务工资（基本工资）" amount={grossSalary} color="#1A1A1A" />
                <Divider />
                {/* 代扣部分 */}
                <Text style={{ fontSize: 9, color: '#aaa', letterSpacing: 2, marginBottom: 4 }}>【代扣项目】</Text>
                <PayRow label="养老保险（个人 8%）" amount={Math.round(grossSalary * 0.08)} isDeduct color="#C05521" />
                <PayRow label="医疗保险（个人 2%）" amount={Math.round(grossSalary * 0.02)} isDeduct color="#C05521" />
                <PayRow label="失业保险（个人 0.5%）" amount={Math.round(grossSalary * 0.005)} isDeduct color="#C05521" />
                <PayRow label="个人所得税" amount={incomeTax} isDeduct color="#C05521" />
                <PayRow label="公积金（个人 12%）" amount={personalHpf} isDeduct color="#2563EB" />
                <Divider />
                {/* 税后实发 */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF8F8', padding: 8, borderRadius: 2 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1A1A1A' }}>💰 税后实发工资</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#C82829', fontFamily: 'monospace' }}>
                    +{fmtMoney(netSalary)}
                  </Text>
                </View>
                <Divider />
                {/* 单位五险一金 */}
                <Text style={{ fontSize: 9, color: '#aaa', letterSpacing: 2, marginBottom: 4 }}>【单位缴纳（不计入到手）】</Text>
                <PayRow label="单位养老保险（20%）" amount={Math.round(grossSalary * 0.20)} color="#888" sub />
                <PayRow label="单位医疗保险（10%）" amount={Math.round(grossSalary * 0.10)} color="#888" sub />
                <PayRow label="单位失业保险（0.5%）" amount={Math.round(grossSalary * 0.005)} color="#888" sub />
                <PayRow label="工伤/生育保险（1%）" amount={Math.round(grossSalary * 0.01)} color="#888" sub />
                <PayRow label="单位公积金（12%）" amount={unitHpf} color="#2563EB" sub />
              </Card>

              {/* ── 补贴收入卡 ── */}
              <Card headerColor="#2B4B6F" headerText="月度补贴明细" emoji="🎖️" tag={`合计 ${fmtMoney(monthlyAllowance)}/月`}>
                <Text style={{ fontSize: 10, color: '#666', lineHeight: 16, marginBottom: 8 }}>
                  补贴按职级直接发放，不纳入五险一金缴费基数，全额到账。
                </Text>
                {allowanceDetail.map(d => (
                  <PayRow key={d.label} label={d.label} amount={d.amount} color="#2B4B6F" />
                ))}
                <Divider />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0F4F8', padding: 8, borderRadius: 2 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#2B4B6F' }}>月度到账（工资+补贴）</Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#2B4B6F', fontFamily: 'monospace' }}>
                    +{fmtMoney(monthlyTakeHome)}
                  </Text>
                </View>
              </Card>

              {/* ── 公积金账户卡 ── */}
              <Card headerColor="#1D5C36" headerText="住房公积金账户" emoji="🏦" tag="专项账户">
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
                  <View>
                    <Text style={{ fontSize: 10, color: '#888', marginBottom: 3 }}>账户累计余额</Text>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: '#1D5C36', fontFamily: 'monospace' }}>
                      {fmtMoney(hpfBalance)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 10, color: '#888', marginBottom: 3 }}>月度缴存到账</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#1D5C36', fontFamily: 'monospace' }}>
                      +{fmtMoney(monthlyHpfTotal)}
                    </Text>
                  </View>
                </View>
                <Divider />
                <PayRow label={`个人缴存（工资 12%）`} amount={personalHpf} color="#1D5C36" />
                <PayRow label={`单位同等缴存（12%）`} amount={unitHpf} color="#1D5C36" />
                <Divider />
                <View style={{ backgroundColor: '#F0F8F2', padding: 8, borderRadius: 2 }}>
                  <Text style={{ fontSize: 10, color: '#1D5C36', lineHeight: 16 }}>
                    📌 公积金可用于购买自住住房、偿还住房贷款、租房等，退休后可一次性全部提取。购买「个人自有住房」类资产时可使用公积金抵扣部分房款。
                  </Text>
                </View>
              </Card>

              {/* ── 年终奖预估卡 ── */}
              <Card headerColor="#7C3AED" headerText="年终奖预估" emoji="🎯" tag="每年12月发放">
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 11, color: '#555' }}>称职（合格）：{bonusMonths} 个月工资</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#7C3AED', fontFamily: 'monospace' }}>
                      {fmtMoney(estimatedAnnualBonus)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 11, color: '#555' }}>优秀（+20%加成）</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#C82829', fontFamily: 'monospace' }}>
                      {fmtMoney(estimatedAnnualBonusExcellent)}
                    </Text>
                  </View>
                  <Divider />
                  <Text style={{ fontSize: 10, color: '#888', lineHeight: 15 }}>
                    💡 年终奖由年度考核结果决定：优秀加20%，不合格不发放。绩效积分≥90分视为优秀，60分以下不合格。
                  </Text>
                </View>
              </Card>

              {/* ── 组织分配住房 ── */}
              <Card headerColor="#2B4B6F" headerText="组织分配住房" emoji="🏛️" tag="使用权">
                {housing ? (
                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={{ fontSize: 30 }}>🏠</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A' }}>{housing}</Text>
                        <Text style={{ fontSize: 9, color: '#888', marginTop: 2 }}>职级配套住房（居住权，非产权）</Text>
                      </View>
                    </View>
                    <View style={{ backgroundColor: '#F0F4F8', padding: 8, borderRadius: 2 }}>
                      <Text style={{ fontSize: 10, color: '#2B4B6F', lineHeight: 15 }}>
                        📌 分配住房属于组织保障，晋升后自动升级，调离或退休后须归还，不计入个人房产财富。
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 24 }}>🏚️</Text>
                    <View>
                      <Text style={{ fontSize: 12, color: '#888' }}>当前职级暂无组织分配住房</Text>
                      <Text style={{ fontSize: 9, color: '#aaa', marginTop: 2 }}>
                        副科级起享有工作宿舍，可自购住房→「消费与投资」标签页
                      </Text>
                    </View>
                  </View>
                )}
              </Card>

              {/* ── 已购资产清单 ── */}
              {ownedItems.length > 0 && (
                <Card headerColor="#1D5C36" headerText={`已购置资产（${ownedItems.length} 项）`} emoji="📋" tag={`估值 ${fmtMoneyShort(assetValue)}`}>
                  <View style={{ gap: 6 }}>
                    {ownedItems.map((item, idx) => (
                      <View key={`${item.key}-${idx}`} style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingVertical: 7, paddingHorizontal: 8,
                        backgroundColor: '#F9F8F5', borderLeftWidth: 3,
                        borderLeftColor: CATEGORY_COLOR[item.category] ?? '#2B4B6F',
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                          <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#1A1A1A' }}>{item.name}</Text>
                            <Text style={{ fontSize: 9, color: '#888' }}>{item.effectDesc}</Text>
                          </View>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 10, color: '#aaa', fontFamily: 'monospace' }}>{fmtMoney(item.price)}</Text>
                          {item.isMonthlyReturn && (
                            <Text style={{ fontSize: 9, color: '#7C3AED' }}>
                              月收益约+{fmtMoneyShort(Math.round(item.price * (item.monthlyReturnRate ?? 0)))}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                  {investMonthlyEst > 0 && (
                    <>
                      <Divider />
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F5F0FF', padding: 8, borderRadius: 2 }}>
                        <Text style={{ fontSize: 11, color: '#7C3AED', fontWeight: '600' }}>📈 投资月度预估收益</Text>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#7C3AED', fontFamily: 'monospace' }}>
                          +{fmtMoney(investMonthlyEst)}
                        </Text>
                      </View>
                    </>
                  )}
                </Card>
              )}

              {/* ── 职级薪资阶梯 ── */}
              <Card headerColor="#555" headerText="职级薪资晋升阶梯" emoji="📊" tag="含补贴合计">
                <View style={{ gap: 4 }}>
                  {Object.entries(RANK_SALARY).map(([lvl, sal]) => {
                    const lvlNum = Number(lvl);
                    const cfg = RANK_CONFIG[lvlNum];
                    const isCurrent = lvlNum === rankLevel;
                    const isPast = lvlNum < rankLevel;
                    const allowance = RANK_MONTHLY_ALLOWANCE[lvlNum] ?? 0;
                    return (
                      <View key={lvl} style={{
                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        paddingVertical: 5, paddingHorizontal: isCurrent ? 8 : 4,
                        backgroundColor: isCurrent ? '#FFF5F5' : 'transparent',
                        borderRadius: 2,
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{
                            width: 6, height: 6, borderRadius: 3,
                            backgroundColor: isCurrent ? '#C82829' : isPast ? '#2a7a3b' : '#D9D9D9',
                          }} />
                          <Text style={{ fontSize: 10, color: isCurrent ? '#C82829' : isPast ? '#2a7a3b' : '#aaa', fontWeight: isCurrent ? '700' : '400' }}>
                            {cfg?.name ?? `级别${lvl}`}
                          </Text>
                          {isCurrent && (
                            <View style={{ backgroundColor: '#C82829', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 1 }}>
                              <Text style={{ fontSize: 8, color: '#fff', fontWeight: '700' }}>当前</Text>
                            </View>
                          )}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 10, color: isCurrent ? '#C82829' : isPast ? '#2a7a3b' : '#bbb', fontFamily: 'monospace', fontWeight: isCurrent ? '700' : '400' }}>
                            {fmtMoney(sal + allowance)}/月
                          </Text>
                          {isCurrent && (
                            <Text style={{ fontSize: 8, color: '#888' }}>工资{fmtMoneyShort(sal)}+补贴{fmtMoneyShort(allowance)}</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </Card>
            </>
          ) : (
            <>
              {/* ── 购物系统 ── */}
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', borderRadius: 2, overflow: 'hidden' }}>
                <View style={{ backgroundColor: '#1A1A1A', paddingHorizontal: 14, paddingVertical: 9, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 2 }}>🛒 个人消费与投资</Text>
                  <Text style={{ color: '#aaa', fontSize: 10 }}>余额：{fmtMoney(savings)}</Text>
                </View>

                {/* 分类筛选 */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderBottomWidth: 1, borderBottomColor: '#F0EDE8' }}>
                  <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 6 }}>
                    {(['全部', ...ALL_CATEGORIES] as string[]).map(cat => (
                      <Pressable
                        key={cat}
                        onPress={() => setActiveCategory(cat)}
                        style={{
                          paddingHorizontal: 10, paddingVertical: 4, borderRadius: 2,
                          backgroundColor: activeCategory === cat ? '#C82829' : '#F5F4F1',
                          borderWidth: 1, borderColor: activeCategory === cat ? '#C82829' : '#D9D9D9',
                        }}>
                        <Text style={{ fontSize: 10, color: activeCategory === cat ? '#fff' : '#555', fontWeight: activeCategory === cat ? '700' : '400' }}>
                          {cat === '全部' ? '全部' : `${CATEGORY_EMOJI[cat] ?? ''} ${cat}`}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>

                {/* 商品列表 */}
                <View style={{ padding: 12, gap: 8 }}>
                  {filteredItems.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                      <Text style={{ fontSize: 24, marginBottom: 8 }}>✅</Text>
                      <Text style={{ fontSize: 12, color: '#aaa' }}>该分类商品均已购置</Text>
                    </View>
                  ) : (
                    filteredItems.map(item => {
                      const canAfford = savings >= item.price;
                      const isBuying = buyingKey === item.key;
                      return (
                        <View key={item.key} style={{ borderWidth: 1, borderColor: '#E8E5E0', borderRadius: 2, overflow: 'hidden' }}>
                          <View style={{ flexDirection: 'row', padding: 10, gap: 10, alignItems: 'flex-start' }}>
                            <View style={{ alignItems: 'center', gap: 4 }}>
                              <Text style={{ fontSize: 26 }}>{item.emoji}</Text>
                              <View style={{ backgroundColor: CATEGORY_COLOR[item.category] ?? '#666', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 1 }}>
                                <Text style={{ fontSize: 8, color: '#fff', fontWeight: '700' }}>{item.category}</Text>
                              </View>
                            </View>
                            <View style={{ flex: 1, gap: 3 }}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A', flex: 1 }}>{item.name}</Text>
                                <Text style={{ fontSize: 13, fontWeight: '800', color: canAfford ? '#C82829' : '#C0BAB0', fontFamily: 'monospace' }}>
                                  {fmtMoney(item.price)}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 10, color: '#555', lineHeight: 15 }}>{item.desc}</Text>
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                                <View style={{ backgroundColor: '#F0F4F0', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 1 }}>
                                  <Text style={{ fontSize: 9, color: '#1D5C36' }}>效果：{item.effectDesc}</Text>
                                </View>
                                {item.isMonthlyReturn && (
                                  <View style={{ backgroundColor: '#F5F0FF', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 1 }}>
                                    <Text style={{ fontSize: 9, color: '#7C3AED' }}>
                                      预估月收益：{fmtMoney(Math.round(item.price * (item.monthlyReturnRate ?? 0)))}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          </View>
                          <Pressable
                            onPress={() => canAfford && !isBuying ? setShowConfirm(item) : undefined}
                            style={{ backgroundColor: canAfford ? '#C82829' : '#E8E5E0', paddingVertical: 9, alignItems: 'center', justifyContent: 'center' }}
                            android_ripple={{ color: 'rgba(0,0,0,0.15)' }}>
                            {isBuying ? (
                              <ActivityIndicator color="#fff" size="small" />
                            ) : (
                              <Text style={{ fontSize: 11, fontWeight: '700', color: canAfford ? '#fff' : '#A0978A', letterSpacing: 1 }}>
                                {canAfford ? '立即购置' : `余额不足（差 ${fmtMoney(item.price - savings)}）`}
                              </Text>
                            )}
                          </Pressable>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            </>
          )}

          {activeTab === 'illicit' ? (
            <IllicitFundsTab />
          ) : null}

          <View style={{ height: 32 }} />
        </View>
      </ScrollView>

      {/* ── 购买确认弹窗 ── */}
      {showConfirm && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center',
          paddingHorizontal: 24,
        }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 2, overflow: 'hidden', width: '100%', maxWidth: 380 }}>
            <View style={{ backgroundColor: '#1A1A1A', paddingHorizontal: 16, paddingVertical: 12 }}>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 2 }}>📋 确认购置</Text>
            </View>
            <View style={{ padding: 16, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 36 }}>{showConfirm.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}>{showConfirm.name}</Text>
                  <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{showConfirm.desc}</Text>
                </View>
              </View>
              <View style={{ backgroundColor: '#F9F8F5', padding: 10, borderRadius: 2, gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 11, color: '#555' }}>购置价格</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#C82829', fontFamily: 'monospace' }}>
                    {fmtMoney(showConfirm.price)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 11, color: '#555' }}>购置后余额</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#2B4B6F', fontFamily: 'monospace' }}>
                    {fmtMoney(savings - showConfirm.price)}
                  </Text>
                </View>
              </View>
              <View style={{ backgroundColor: '#F0F4F0', padding: 8, borderRadius: 2 }}>
                <Text style={{ fontSize: 10, color: '#1D5C36' }}>效果：{showConfirm.effectDesc}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F0EDE8' }}>
              <Pressable
                onPress={() => setShowConfirm(null)}
                style={{ flex: 1, paddingVertical: 13, alignItems: 'center', backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: '#F0EDE8' }}
                android_ripple={{ color: 'rgba(0,0,0,0.08)' }}>
                <Text style={{ fontSize: 13, color: '#888' }}>取消</Text>
              </Pressable>
              <Pressable
                onPress={() => handleBuy(showConfirm)}
                style={{ flex: 1, paddingVertical: 13, alignItems: 'center', backgroundColor: '#C82829' }}
                android_ripple={{ color: 'rgba(255,255,255,0.25)' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>确认购置</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
```

<a id="srcappapppolicetsx"></a>
## `src/app/(app)/police.tsx`

```tsx
// 公安局管理页面
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getPoliceCases, solveCase, addNewCases } from '@/db/gameApi';
import type { PoliceCase } from '@/types/game';
import { StatBar } from '@/components/StatBar';

const CASE_TYPE_LABEL: Record<string, string> = {
  criminal: '刑事案件',
  corruption: '腐败案件',
  drug: '毒品案件',
  fraud: '诈骗案件',
};

const CASE_TYPE_COLOR: Record<string, string> = {
  criminal: '#1D2D44',
  corruption: '#C8102E',
  drug: '#6a1a6a',
  fraud: '#8B4513',
};

const SPECIAL_ACTIONS = [
  { key: 'sweep', label: '扫黑除恶', desc: '开展扫黑除恶专项行动，大幅提升治安指数', policeCost: 30, securityGain: 15, meritGain: 20, duration: '3个月' },
  { key: 'drug', label: '禁毒专项', desc: '开展禁毒专项整治，减少辖区毒品犯罪', policeCost: 25, securityGain: 12, meritGain: 15, duration: '2个月' },
  { key: 'patrol', label: '加强巡逻', desc: '增加日常巡逻频次，震慑犯罪行为', policeCost: 10, securityGain: 5, meritGain: 5, duration: '1个月' },
];

export default function PoliceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [cases, setCases] = useState<PoliceCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [activeTab, setActiveTab] = useState<'cases' | 'actions'>('cases');

  useFocusEffect(
    useCallback(() => {
      if (!save) return;
      setLoading(true);
      getPoliceCases(save.id).then(data => {
        setCases(data);
        setLoading(false);
      });
    }, [save])
  );

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3000);
  };

  const handleSolveCase = async (policeCase: PoliceCase) => {
    if (!save) return;
    if (save.policeForce < policeCase.requiredPolice) {
      showFeedback(`警力不足！本案需要 ${policeCase.requiredPolice} 警力，当前剩余 ${save.policeForce} 警力`);
      return;
    }

    // 破案成功率 = 公安局长能力影响 + 基础概率
    const successRate = 0.5 + (save.securityIndex / 200);
    const success = Math.random() < successRate;

    if (success) {
      await solveCase(policeCase.id, save.gameDays);
      const newPoliceForce = Math.max(0, save.policeForce - Math.floor(policeCase.requiredPolice * 0.5));
      const newSecurity = Math.min(100, save.securityIndex + policeCase.securityChange);
      const newMerit = save.meritPoints + policeCase.rewardMerit;
      const newLivelihood = Math.min(100, save.cityLivelihood + policeCase.securityChange * 0.3);
      await updateGameSave({
        policeForce: newPoliceForce,
        securityIndex: newSecurity,
        meritPoints: newMerit,
        cityLivelihood: newLivelihood,
      });
      showFeedback(`案件告破！治安+${policeCase.securityChange}，政绩+${policeCase.rewardMerit}`);
    } else {
      const newPoliceForce = Math.max(0, save.policeForce - policeCase.requiredPolice);
      await updateGameSave({ policeForce: newPoliceForce });
      showFeedback(`侦破失败，损失 ${policeCase.requiredPolice} 警力，请加强调查`);
    }

    getPoliceCases(save.id).then(setCases);
  };

  const handleSpecialAction = async (action: typeof SPECIAL_ACTIONS[0]) => {
    if (!save) return;
    if (save.policeForce < action.policeCost) {
      showFeedback(`警力不足！需要 ${action.policeCost} 警力，当前剩余 ${save.policeForce}`);
      return;
    }
    const newPoliceForce = Math.max(0, save.policeForce - action.policeCost);
    const newSecurity = Math.min(100, save.securityIndex + action.securityGain);
    const newMerit = save.meritPoints + action.meritGain;
    await updateGameSave({ policeForce: newPoliceForce, securityIndex: newSecurity, meritPoints: newMerit });
    showFeedback(`${action.label}行动启动！治安+${action.securityGain}，政绩+${action.meritGain}`);
  };

  const handleRestorePolice = async () => {
    if (!save) return;
    const restored = Math.min(100, save.policeForce + 20);
    await updateGameSave({ policeForce: restored });
    showFeedback(`警力补充完成，当前警力：${restored}`);
  };

  const pendingCases = cases.filter(c => c.status === 'pending');
  const solvedCases = cases.filter(c => c.status === 'solved');

  const renderCase = ({ item }: { item: PoliceCase }) => (
    <View style={{
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: '#DDD',
      borderLeftWidth: 3,
      borderLeftColor: CASE_TYPE_COLOR[item.caseType] ?? '#1D2D44',
      padding: 14,
      marginBottom: 8,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#222' }}>{item.title}</Text>
          <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{CASE_TYPE_LABEL[item.caseType]}</Text>
        </View>
        <View style={{ borderWidth: 1, borderColor: CASE_TYPE_COLOR[item.caseType] ?? '#1D2D44', paddingHorizontal: 6, paddingVertical: 2 }}>
          <Text style={{ fontSize: 10, color: CASE_TYPE_COLOR[item.caseType] ?? '#1D2D44', fontWeight: '600' }}>
            {item.status === 'pending' ? '待侦破' : item.status === 'solved' ? '已告破' : '未破案'}
          </Text>
        </View>
      </View>

      <Text style={{ fontSize: 12, color: '#555', lineHeight: 18, marginBottom: 10 }}>{item.description}</Text>

      <View style={{ flexDirection: 'row', gap: 16, marginBottom: item.status === 'pending' ? 12 : 0 }}>
        <Text style={{ fontSize: 11, color: '#666' }}>所需警力：<Text style={{ color: '#C8102E', fontWeight: '600' }}>{item.requiredPolice}</Text></Text>
        <Text style={{ fontSize: 11, color: '#666' }}>案件难度：<Text style={{ fontWeight: '600' }}>{item.difficulty}</Text></Text>
        <Text style={{ fontSize: 11, color: '#666' }}>破案奖励：<Text style={{ color: '#2a7a3b', fontWeight: '600' }}>+{item.rewardMerit}政绩</Text></Text>
      </View>

      {item.status === 'pending' && (
        <Pressable
          onPress={() => handleSolveCase(item)}
          style={{ backgroundColor: '#1D2D44', paddingVertical: 8, alignItems: 'center' }}
          android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
        >
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>
            组织侦破
          </Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      <StatusBar style="light" backgroundColor="#1D2D44" />

      <View style={{
        backgroundColor: '#1D2D44',
        paddingTop: insets.top + 8,
        paddingBottom: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>公安局</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>公安局管理</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10 }}>{save?.rankName}</Text>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600', marginTop: 1 }}>{save?.cityName}</Text>
        </View>
      </View>

      {feedback !== '' && (
        <View style={{ backgroundColor: '#e8f5e9', borderBottomWidth: 1, borderBottomColor: '#c8e6c9', padding: 12 }}>
          <Text style={{ color: '#2a7a3b', fontSize: 13, fontWeight: '600' }}>{feedback}</Text>
        </View>
      )}

      {/* 公安状态卡 */}
      {save && (
        <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#DDD', padding: 16 }}>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
            <View style={{ flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#DDD', padding: 10 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#1D2D44', fontVariant: ['tabular-nums'] }}>
                {save.policeForce}
              </Text>
              <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>可用警力</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#DDD', padding: 10 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#C8102E', fontVariant: ['tabular-nums'] }}>
                {save.securityIndex.toFixed(0)}
              </Text>
              <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>治安指数</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#DDD', padding: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#222' }}>
                {save.policeChiefName ?? '空缺'}
              </Text>
              <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>公安局长</Text>
            </View>
          </View>
          <StatBar label="治安指数" value={save.securityIndex} />
          <Pressable
            onPress={handleRestorePolice}
            style={{ marginTop: 8, borderWidth: 1, borderColor: '#1D2D44', paddingVertical: 7, alignItems: 'center', backgroundColor: '#fff' }}
            android_ripple={{ color: 'rgba(29,45,68,0.1)' }}
          >
            <Text style={{ fontSize: 12, color: '#1D2D44', fontWeight: '600' }}>补充警力 (+20)</Text>
          </Pressable>
        </View>
      )}

      {/* 标签切换 */}
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#DDD' }}>
        {(['cases', 'actions'] as const).map(tab => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={{
              flex: 1,
              paddingVertical: 11,
              alignItems: 'center',
              borderBottomWidth: 2,
              borderBottomColor: activeTab === tab ? '#C8102E' : 'transparent',
            }}
          >
            <Text style={{
              fontSize: 13, fontWeight: '600',
              color: activeTab === tab ? '#C8102E' : '#888',
            }}>
              {tab === 'cases' ? `案件管理（${pendingCases.length}）` : '专项行动'}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#C8102E" />
        </View>
      ) : activeTab === 'cases' ? (
        <FlatList
          data={pendingCases}
          renderItem={renderCase}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          contentInsetAdjustmentBehavior="automatic"
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Text style={{ color: '#888', fontSize: 14 }}>暂无待处理案件</Text>
              <Text style={{ color: '#aaa', fontSize: 12, marginTop: 6 }}>推进时间后会有新案件出现</Text>
            </View>
          }
          ListFooterComponent={
            solvedCases.length > 0 ? (
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>已告破案件（{solvedCases.length}件）</Text>
                {solvedCases.slice(0, 3).map(c => (
                  <View key={c.id} style={{ backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#EEE', padding: 10, marginBottom: 6 }}>
                    <Text style={{ fontSize: 12, color: '#888' }}>{c.title} - 已告破</Text>
                  </View>
                ))}
              </View>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={SPECIAL_ACTIONS}
          keyExtractor={item => item.key}
          contentContainerStyle={{ padding: 16 }}
          contentInsetAdjustmentBehavior="automatic"
          renderItem={({ item }) => (
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDD', padding: 14, marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#222' }}>{item.label}</Text>
                <Text style={{ fontSize: 11, color: '#888' }}>持续{item.duration}</Text>
              </View>
              <Text style={{ fontSize: 12, color: '#555', marginBottom: 10, lineHeight: 18 }}>{item.desc}</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
                <Text style={{ fontSize: 11 }}>消耗警力：<Text style={{ color: '#C8102E', fontWeight: '600' }}>{item.policeCost}</Text></Text>
                <Text style={{ fontSize: 11 }}>治安+<Text style={{ color: '#2a7a3b', fontWeight: '600' }}>{item.securityGain}</Text></Text>
                <Text style={{ fontSize: 11 }}>政绩+<Text style={{ color: '#1D2D44', fontWeight: '600' }}>{item.meritGain}</Text></Text>
              </View>
              <Pressable
                onPress={() => handleSpecialAction(item)}
                style={{ backgroundColor: '#C8102E', paddingVertical: 8, alignItems: 'center' }}
                android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>启动行动</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}
```

<a id="srcappapppopularsupporttsx"></a>
## `src/app/(app)/popular-support.tsx`

```tsx
// 民心修行 - 主页面
// 路由：/(app)/popular-support
// 四个分页：民心总览 / 亲民为民 / 民生实事 / 顺应民意
import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useGame } from '@/ctx/GameContext';
import { getRankTheme } from '@/lib/rankTheme';
import { getConfigsByCategory } from '@/lib/gameplayConfig';
import { executePopularAction } from '@/lib/gameplayApi';
import type { GameplayConfig, PopularLogEntry } from '@/types/game';

// ── 民心评级档位（严格按文档：5档）──
function getRating(v: number): { label: string; color: string; desc: string } {
  if (v >= 80) return { label: '甲等', color: '#16a34a', desc: '民心所向' };
  if (v >= 60) return { label: '乙等', color: '#2563eb', desc: '深得民心' };
  if (v >= 40) return { label: '丙等', color: '#d97706', desc: '民意尚可' };
  if (v >= 20) return { label: '丁等', color: '#dc2626', desc: '民心涣散' };
  return { label: '戊等', color: '#7f1d1d', desc: '失去民心' };
}

// 续任/晋升投票加成说明（文档规定）
function getVoteBonus(v: number): { text: string; color: string } {
  if (v >= 80) return { text: '续任投票 +5', color: '#16a34a' };
  if (v >= 60) return { text: '续任投票 +3', color: '#2563eb' };
  if (v >= 40) return { text: '续任投票 +1', color: '#d97706' };
  return { text: '续任投票 -2 ⚠️', color: '#dc2626' };
}

// ── 4个分页配置 ──
const TABS = [
  { key: 'overview', label: '民心总览' },
  { key: 'tab2', label: '亲民为民' },
  { key: 'tab3', label: '民生实事' },
  { key: 'tab4', label: '顺应民意' },
] as const;

// 按 Tab 分配 17 个动作（sort 字段对应文档顺序）
const TAB_SORT: Record<string, number[]> = {
  tab2: [1, 2, 3, 4, 5, 6],
  tab3: [7, 8, 9, 10, 11, 12],
  tab4: [13, 14, 15, 16, 17],
};

// ── 单个动作卡片 ──
interface ActionCardProps {
  config: GameplayConfig;
  rankLevel: number;
  gameDays: number;
  cooldowns: Record<string, number>;
  onExecute: (actionId: string) => void;
  executing: string | null;
  theme: ReturnType<typeof getRankTheme>;
}

function ActionCard({ config, rankLevel, gameDays, cooldowns, onExecute, executing, theme }: ActionCardProps) {
  const isUnlocked = rankLevel >= config.unlockRank;
  const cooldownEnd = cooldowns[config.id] ?? 0;
  const remainDays = Math.max(0, cooldownEnd - gameDays);
  const isOnCooldown = remainDays > 0;
  const canExecute = isUnlocked && !isOnCooldown && executing !== config.id;
  const p = config.params;

  // 构建副效果标签
  const effects: string[] = [];
  if (p.livelihoodGain) effects.push(`民生+${p.livelihoodGain}`);
  if (p.meritGain) effects.push(`功绩+${p.meritGain}`);
  if (p.riskReduction) effects.push(`廉政风险-${p.riskReduction}`);
  if (p.opinionReduction) effects.push(`舆情-${p.opinionReduction}`);
  if (p.teamIntegrityGain) effects.push(`班子廉洁+${p.teamIntegrityGain}`);

  return (
    <View style={{
      backgroundColor: theme.cardBg,
      borderWidth: 1,
      borderColor: isUnlocked ? theme.cardBorder : theme.cardBorder + '55',
      borderRadius: 8,
      marginBottom: 10,
      opacity: isUnlocked ? 1 : 0.55,
      overflow: 'hidden',
    }}>
      {/* 顶栏 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10, paddingBottom: 6, gap: 8 }}>
        <Text style={{ fontSize: 22 }}>{config.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.headerText }}>{config.name}</Text>
          <Text style={{ fontSize: 11, color: theme.mutedText, marginTop: 1 }}>{p.desc}</Text>
        </View>
        {/* 解锁等级徽章 */}
        <View style={{
          backgroundColor: isUnlocked ? theme.primary + '22' : theme.cardBorder + '44',
          borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
        }}>
          <Text style={{ fontSize: 10, color: isUnlocked ? theme.primary : theme.mutedText, fontWeight: '600' }}>
            {isUnlocked ? `已解锁` : `${config.unlockRank}级解锁`}
          </Text>
        </View>
      </View>

      {/* 数值区 */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 10, paddingBottom: 8 }}>
        <View style={{ backgroundColor: '#16a34a22', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ fontSize: 12, color: '#16a34a', fontWeight: '700' }}>民心 +{p.popularGain}</Text>
        </View>
        {effects.map((e) => (
          <View key={e} style={{ backgroundColor: theme.primary + '18', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '600' }}>{e}</Text>
          </View>
        ))}
        <View style={{ backgroundColor: theme.cardBorder + '44', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ fontSize: 11, color: theme.mutedText }}>冷却 {p.cooldown}天</Text>
        </View>
      </View>

      {/* 按钮区 */}
      <View style={{ borderTopWidth: 1, borderTopColor: theme.cardBorder, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {isOnCooldown ? (
          <Text style={{ fontSize: 12, color: theme.mutedText }}>⏳ 冷却中，还需 <Text style={{ color: theme.primary, fontWeight: '700' }}>{remainDays}</Text> 天</Text>
        ) : !isUnlocked ? (
          <Text style={{ fontSize: 12, color: theme.mutedText }}>🔒 需要达到 {config.unlockRank} 级</Text>
        ) : (
          <Text style={{ fontSize: 12, color: '#16a34a' }}>✓ 可执行</Text>
        )}
        <Pressable
          onPress={() => canExecute && onExecute(config.id)}
          style={{
            backgroundColor: canExecute ? theme.primary : theme.cardBorder,
            borderRadius: 6,
            paddingHorizontal: 14,
            paddingVertical: 6,
            opacity: canExecute ? 1 : 0.5,
          }}
        >
          {executing === config.id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
              {!isUnlocked ? '未解锁' : isOnCooldown ? '冷却中' : '执行'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ── Tab 一：民心总览 ──
interface OverviewTabProps {
  popularSupport: number;
  moralValue: number;
  popularLog: PopularLogEntry[];
  rankLevel: number;
  gameDays: number;
  cooldowns: Record<string, number>;
  theme: ReturnType<typeof getRankTheme>;
}

function OverviewTab({ popularSupport, moralValue, popularLog, rankLevel, gameDays, cooldowns, theme }: OverviewTabProps) {
  const rating = getRating(popularSupport);
  const vote = getVoteBonus(popularSupport);
  const promotionOk = popularSupport >= 40;
  const allActions = getConfigsByCategory('popularity');

  // 统计可执行动作数（未锁定且不在冷却中）
  const availableCount = allActions.filter((a) => {
    if (rankLevel < a.unlockRank) return false;
    const end = cooldowns[a.id] ?? 0;
    return gameDays >= end;
  }).length;

  // 已解锁动作总数
  const unlockedCount = allActions.filter((a) => rankLevel >= a.unlockRank).length;

  // 最近10条记录
  const recentLog = [...popularLog].reverse().slice(0, 10);

  return (
    <View>
      {/* 民心值仪表 */}
      <View style={{
        backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder,
        borderTopWidth: 3, borderTopColor: rating.color,
        borderRadius: 8, padding: 16, marginBottom: 12,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.headerText }}>当前民心值</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ backgroundColor: rating.color + '22', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ color: rating.color, fontSize: 12, fontWeight: '700' }}>{rating.label} · {rating.desc}</Text>
            </View>
          </View>
        </View>
        {/* 进度条 */}
        <View style={{ height: 12, backgroundColor: theme.cardBorder + '66', borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
          <View style={{ width: `${popularSupport}%`, height: '100%', backgroundColor: rating.color, borderRadius: 6 }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: rating.color }}>{popularSupport}</Text>
          <Text style={{ fontSize: 11, color: theme.mutedText }}>满分 100</Text>
        </View>
      </View>

      {/* 民心操守（道德值）—— 接入民心修行体系 */}
      {(() => {
        const mColor = moralValue >= 60 ? '#2a7a3b' : moralValue >= 30 ? '#d97706' : '#dc2626';
        const mLabel = moralValue >= 80 ? '廉洁奉公' : moralValue >= 60 ? '清廉勤政' : moralValue >= 40 ? '中规中矩' : moralValue >= 20 ? '瑕不掩瑜' : '失德失范';
        return (
          <View style={{
            backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder,
            borderTopWidth: 3, borderTopColor: mColor,
            borderRadius: 8, padding: 16, marginBottom: 12,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.headerText }}>民心操守</Text>
              <View style={{ backgroundColor: mColor + '22', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ color: mColor, fontSize: 12, fontWeight: '700' }}>{mLabel}</Text>
              </View>
            </View>
            <View style={{ height: 12, backgroundColor: theme.cardBorder + '66', borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
              <View style={{ width: `${moralValue}%`, height: '100%', backgroundColor: mColor, borderRadius: 6 }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: mColor }}>{moralValue}</Text>
              <Text style={{ fontSize: 11, color: theme.mutedText }}>满分 100</Text>
            </View>
            <Text style={{ fontSize: 11, color: theme.mutedText, marginTop: 8, lineHeight: 16 }}>
              民心操守反映为政清廉与群众口碑，低于 0 将被立案查处、仕途终结。为民施政、廉政自律可提升民心操守。
            </Text>
          </View>
        );
      })()}

      {/* 效果说明 */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {/* 晋升资格 */}
        <View style={{
          flex: 1, backgroundColor: theme.cardBg, borderWidth: 1,
          borderColor: promotionOk ? '#16a34a55' : '#dc262655',
          borderRadius: 8, padding: 12,
        }}>
          <Text style={{ fontSize: 11, color: theme.mutedText, marginBottom: 4 }}>晋升必要条件</Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color: promotionOk ? '#16a34a' : '#dc2626' }}>
            {promotionOk ? '✓ 已满足 (≥40)' : `✗ 未满足 (${popularSupport}/40)`}
          </Text>
        </View>
        {/* 续任投票加成 */}
        <View style={{
          flex: 1, backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder,
          borderRadius: 8, padding: 12,
        }}>
          <Text style={{ fontSize: 11, color: theme.mutedText, marginBottom: 4 }}>续任投票影响</Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color: vote.color }}>{vote.text}</Text>
        </View>
      </View>

      {/* 动作统计 */}
      <View style={{
        backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder,
        borderRadius: 8, padding: 12, marginBottom: 12,
        flexDirection: 'row', justifyContent: 'space-around',
      }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: theme.primary }}>{availableCount}</Text>
          <Text style={{ fontSize: 11, color: theme.mutedText, marginTop: 2 }}>可执行动作</Text>
        </View>
        <View style={{ width: 1, backgroundColor: theme.cardBorder }} />
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: theme.headerText }}>{unlockedCount}</Text>
          <Text style={{ fontSize: 11, color: theme.mutedText, marginTop: 2 }}>已解锁动作</Text>
        </View>
        <View style={{ width: 1, backgroundColor: theme.cardBorder }} />
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: theme.mutedText }}>17</Text>
          <Text style={{ fontSize: 11, color: theme.mutedText, marginTop: 2 }}>动作总数</Text>
        </View>
      </View>

      {/* 评级档位说明 */}
      <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: theme.headerText, marginBottom: 8 }}>评级档位说明</Text>
        {[
          { range: '≥80', label: '甲等', desc: '民心所向', color: '#16a34a' },
          { range: '60-79', label: '乙等', desc: '深得民心', color: '#2563eb' },
          { range: '40-59', label: '丙等', desc: '民意尚可', color: '#d97706' },
          { range: '20-39', label: '丁等', desc: '民心涣散', color: '#dc2626' },
          { range: '<20', label: '戊等', desc: '失去民心', color: '#7f1d1d' },
        ].map((item) => (
          <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <View style={{ width: 36, alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: item.color, fontWeight: '700' }}>{item.label}</Text>
            </View>
            <Text style={{ fontSize: 11, color: theme.mutedText, width: 60 }}>{item.range}</Text>
            <Text style={{ fontSize: 11, color: theme.mutedText }}>{item.desc}</Text>
            {popularSupport >= parseInt(item.range === '<20' ? '0' : item.range.split('-')[0].replace('≥', '')) &&
              (item.range === '<20' ? popularSupport < 20 :
               item.range.includes('-') ? popularSupport <= parseInt(item.range.split('-')[1]) :
               true) && (
              <Text style={{ fontSize: 10, color: item.color, marginLeft: 'auto' }}>← 当前</Text>
            )}
          </View>
        ))}
      </View>

      {/* 最近活动记录 */}
      {recentLog.length > 0 && (
        <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 8, padding: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: theme.headerText, marginBottom: 8 }}>最近民心记录</Text>
          {recentLog.map((entry, idx) => (
            <View key={idx} style={{
              flexDirection: 'row', alignItems: 'flex-start',
              paddingVertical: 5, borderBottomWidth: idx < recentLog.length - 1 ? 1 : 0,
              borderBottomColor: theme.cardBorder + '55',
            }}>
              <Text style={{ fontSize: 11, color: theme.mutedText, width: 60 }}>第{entry.gameDay}天</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: theme.headerText }}>{entry.actionName}</Text>
                {entry.sideEffects && entry.sideEffects.length > 0 && (
                  <Text style={{ fontSize: 11, color: theme.mutedText, marginTop: 1 }}>{entry.sideEffects.join(' · ')}</Text>
                )}
              </View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#16a34a' }}>+{entry.popularChange}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── 主页面 ──
export default function PopularSupportScreen() {
  const { save, refreshSave } = useGame();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<typeof TABS[number]['key']>('overview');
  const [executing, setExecuting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => {
    (async () => { await refreshSave(); })();
  }, [refreshSave]));

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshSave();
    setRefreshing(false);
  }, [refreshSave]);

  const showToast = useCallback((msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleExecute = useCallback(async (actionId: string) => {
    if (!save) return;
    setExecuting(actionId);
    try {
      const res = await executePopularAction(save.id, actionId);
      if (res.success) {
        await refreshSave();
        showToast(res.message, true);
      } else {
        showToast(res.message, false);
      }
    } catch {
      showToast('操作失败，请重试', false);
    } finally {
      setExecuting(null);
    }
  }, [save, refreshSave, showToast]);

  if (!save) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  const theme = getRankTheme(save.rankLevel);
  const allActions = getConfigsByCategory('popularity');
  const popularSupport = save.popularSupport ?? 50;
  const popularLog: PopularLogEntry[] = save.popularLog ?? [];
  const cooldowns: Record<string, number> = save.popularActionCooldowns ?? {};

  // 红点：是否有可立即执行的动作
  const hasAvailable = allActions.some((a) => {
    if (save.rankLevel < a.unlockRank) return false;
    const end = cooldowns[a.id] ?? 0;
    return save.gameDays >= end;
  });

  // 按当前 Tab 筛选动作
  const getTabActions = (tabKey: string): GameplayConfig[] => {
    const sorts = TAB_SORT[tabKey] ?? [];
    return allActions
      .filter((a) => sorts.includes(a.sort ?? 0))
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <StatusBar style="light" backgroundColor={theme.primary} />

      {/* ── 顶栏：返回 + 民心值快显 ── */}
      <View style={{
        backgroundColor: theme.cardBg,
        paddingTop: insets.top + 4,
        borderBottomWidth: 1,
        borderBottomColor: theme.cardBorder,
        paddingHorizontal: 16, paddingBottom: 10,
      }}>
        {/* 返回行 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 10, padding: 4 }}>
            <Text style={{ color: theme.mutedText, fontSize: 22, lineHeight: 24 }}>‹</Text>
          </Pressable>
          <Text style={{ fontSize: 15, fontWeight: '700', color: theme.headerText, letterSpacing: 1 }}>民心修行</Text>
        </View>
        {/* 民心值快显 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: theme.mutedText }}>民心值</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
              <View style={{ flex: 1, height: 6, backgroundColor: theme.cardBorder + '66', borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ width: `${popularSupport}%`, height: '100%', backgroundColor: getRating(popularSupport).color, borderRadius: 3 }} />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: getRating(popularSupport).color }}>{popularSupport}</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: getRating(popularSupport).color }}>
              {getRating(popularSupport).label}
            </Text>
            <Text style={{ fontSize: 10, color: theme.mutedText }}>{getRating(popularSupport).desc}</Text>
          </View>
          {hasAvailable && (
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a' }} />
          )}
        </View>
      </View>

      {/* Tab 导航 */}
      <View style={{
        flexDirection: 'row',
        backgroundColor: theme.cardBg,
        borderBottomWidth: 1,
        borderBottomColor: theme.cardBorder,
      }}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={{
              flex: 1, paddingVertical: 10, alignItems: 'center',
              borderBottomWidth: 2,
              borderBottomColor: activeTab === tab.key ? theme.primary : 'transparent',
            }}
          >
            <Text style={{
              fontSize: 12, fontWeight: activeTab === tab.key ? '700' : '400',
              color: activeTab === tab.key ? theme.primary : theme.mutedText,
            }}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* 内容区 */}
      <ScrollView
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {activeTab === 'overview' && (
          <OverviewTab
            popularSupport={popularSupport}
            moralValue={save.moralValue ?? 80}
            popularLog={popularLog}
            rankLevel={save.rankLevel}
            gameDays={save.gameDays}
            cooldowns={cooldowns}
            theme={theme}
          />
        )}
        {activeTab !== 'overview' && getTabActions(activeTab).map((config) => (
          <ActionCard
            key={config.id}
            config={config}
            rankLevel={save.rankLevel}
            gameDays={save.gameDays}
            cooldowns={cooldowns}
            onExecute={handleExecute}
            executing={executing}
            theme={theme}
          />
        ))}
      </ScrollView>

      {/* Toast 提示 */}
      {toast && (
        <View style={{
          position: 'absolute', bottom: 30, left: 20, right: 20,
          backgroundColor: toast.ok ? '#16a34a' : '#dc2626',
          borderRadius: 8, padding: 12,
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
          elevation: 5,
        }}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>{toast.msg}</Text>
        </View>
      )}
    </View>
  );
}
```

<a id="srcappapppremierofficetsx"></a>
## `src/app/(app)/premier-office.tsx`

```tsx
// 总理办公室页面 — rank13+可进入，rank14拥有完整权限
// 功能：副院理分管（经济/社会/港澳台）、军委外交、述职KPI排名+撤职、专线电话、特批晋升
// 新增：专项金额每月增长GDP的1%、政治活动政绩+500、约谈整改实装结果
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getAllSubordinates } from '@/db/gameApi';
import type { Subordinate } from '@/types/game';
import { formatMoney, estimateNationalGdp } from '@/types/game';
import { getHotlineTargets } from '@/lib/leaders';

// 副院理分管板块（三块）
interface VPArea {
  id: string;
  icon: string;
  title: string;
  desc: string;
  cost: number;
  effects: { key: keyof typeof EFFECT_LABELS; delta: number }[];
  meritReward: number;
}

const EFFECT_LABELS: Record<string, string> = {
  cityGdp: 'GDP', cityLivelihood: '民生', cityEcology: '生态',
  cityBusiness: '营商', securityIndex: '安全',
};

const VP_AREAS: VPArea[] = [
  // 经济板块（第一副院理分管）
  { id: 'eco1', icon: '📈', title: '宏观调控部署',      desc: '针对通胀或下行压力，下达宏观政策指示，稳住经济大盘',   cost: 800_000,  effects: [{ key: 'cityGdp', delta: 4 }, { key: 'cityBusiness', delta: 2 }], meritReward: 500 },
  { id: 'eco2', icon: '🏗️', title: '重大基础设施投资',  desc: '部署新一轮重大项目投资，拉动内需稳增长',                cost: 2_000_000, effects: [{ key: 'cityGdp', delta: 6 }, { key: 'cityLivelihood', delta: 2 }], meritReward: 500 },
  { id: 'eco3', icon: '🏦', title: '金融政策协调',      desc: '协调人民银行与财政部联合行动，保障金融市场平稳运行',   cost: 500_000,  effects: [{ key: 'cityGdp', delta: 2 }, { key: 'cityBusiness', delta: 4 }], meritReward: 500 },
  // 社会民生板块（第二副院理分管）
  { id: 'soc1', icon: '🏥', title: '医疗卫生专项投入',  desc: '加大医疗卫生投入，提升全民健康保障水平',               cost: 600_000,  effects: [{ key: 'cityLivelihood', delta: 5 }, { key: 'cityEcology', delta: 1 }], meritReward: 500 },
  { id: 'soc2', icon: '🎓', title: '教育公平专项行动',  desc: '推动城乡教育均等化，实施教育领域补短板工程',           cost: 500_000,  effects: [{ key: 'cityLivelihood', delta: 4 }], meritReward: 500 },
  { id: 'soc3', icon: '🏘️', title: '保障性住房工程',   desc: '推进保障房建设，有效解决中低收入群体住房难题',         cost: 1_500_000, effects: [{ key: 'cityLivelihood', delta: 6 }, { key: 'cityGdp', delta: 1 }], meritReward: 500 },
  // 港澳台外交板块（第三副院理分管）
  { id: 'hmt1', icon: '🤝', title: '港澳融合发展部署', desc: '深化粤港澳大湾区合作，推动港澳融入国家发展大局',        cost: 1_200_000, effects: [{ key: 'cityBusiness', delta: 3 }, { key: 'cityGdp', delta: 2 }], meritReward: 500 },
  { id: 'hmt2', icon: '🌐', title: '涉台政策统筹',     desc: '统筹对台政策研究，推进两岸经济文化交流与合作',         cost: 800_000,  effects: [{ key: 'cityBusiness', delta: 2 }, { key: 'securityIndex', delta: 3 }], meritReward: 500 },
  { id: 'hmt3', icon: '✈️', title: '主持区域外交峰会', desc: '主持周边国家及重要伙伴高层峰会，开展务实外交',          cost: 3_000_000, effects: [{ key: 'cityBusiness', delta: 5 }, { key: 'cityGdp', delta: 3 }], meritReward: 500 },
  // 军委事项（百万级起步）
  { id: 'mil1', icon: '⚔️', title: '国防特别经费划拨', desc: '向中枢军委划拨专项国防经费，强化战略威慑和备战水平',    cost: 5_000_000, effects: [{ key: 'securityIndex', delta: 15 }], meritReward: 500 },
  { id: 'mil2', icon: '🛡️', title: '军民融合产业推进', desc: '协调军民融合重大项目落地，带动国防工业转型升级',        cost: 2_000_000, effects: [{ key: 'securityIndex', delta: 6 }, { key: 'cityGdp', delta: 2 }], meritReward: 500 },
];

const AREA_TABS = [
  { id: 'economy',  label: '📈 经济板块',     ids: ['eco1','eco2','eco3'] },
  { id: 'social',   label: '🏥 社会民生',     ids: ['soc1','soc2','soc3'] },
  { id: 'hmt',      label: '🤝 港澳台外交',   ids: ['hmt1','hmt2','hmt3'] },
  { id: 'military', label: '⚔️ 军委事务',     ids: ['mil1','mil2'] },
  { id: 'debrief',  label: '📋 述职部署',     ids: [] },
  { id: 'kpi',      label: '📊 KPI排名',      ids: [] },
  { id: 'promote',  label: '🚀 特批晋升',     ids: [] },
  { id: 'hotline',  label: '☎️ 专线电话',     ids: [] },
];

// KPI评级标准（依据政绩&四项指标）
function calcKpiScore(s: Subordinate): number {
  return s.experience * 0.4 + s.integrity * 0.3 + s.loyalty * 0.15 + s.ability * 0.15;
}

// ── 特批晋升/调任岗位数据 ────────────────────────────────────────────
interface SpecialPost {
  id: string;
  title: string;        // 岗位名称
  org: string;          // 所在单位
  level: number;        // 岗位职级（subLevel）
  levelName: string;    // 职级名称
  type: '晋升' | '调任';
  desc: string;
  cost: number;         // 政绩消耗
  meritReward: number;  // 政绩奖励（调任赋权后的政绩）
}

const SPECIAL_POSTS: SpecialPost[] = [
  // 副院理（13级）
  { id: 'sp1', title: '国政院第一副院理', org: '国政院',  level: 13, levelName: '副国级',  type: '晋升', desc: '分管经济金融领域，主持国政院常务会议', cost: 500, meritReward: 80 },
  { id: 'sp2', title: '国政院第四副院理', org: '国政院',  level: 13, levelName: '副国级',  type: '晋升', desc: '分管科教文卫，协助总理处理日常政务',    cost: 500, meritReward: 80 },
  // 国政委员（12级）
  { id: 'sp3', title: '国政院国政委员',   org: '国政院',  level: 12, levelName: '正部级',  type: '晋升', desc: '协助副院理处理专项事务，国政院核心成员', cost: 350, meritReward: 55 },
  // 部长（12级）
  { id: 'sp4', title: '国家发展改革委主任', org: '发改委', level: 12, levelName: '正部级', type: '调任', desc: '统筹宏观经济调控和重大战略部署',          cost: 300, meritReward: 50 },
  { id: 'sp5', title: '财政部部长',       org: '财政部',  level: 12, levelName: '正部级',  type: '调任', desc: '主管国家预算、税收、国债等财政事务',      cost: 300, meritReward: 50 },
  { id: 'sp6', title: '外交部部长',       org: '外交部',  level: 12, levelName: '正部级',  type: '调任', desc: '代表国家处理外交事务，主导双边多边外交',  cost: 300, meritReward: 50 },
  { id: 'sp7', title: '公安部部长',       org: '公安部',  level: 12, levelName: '正部级',  type: '调任', desc: '主管全国社会治安综合治理',               cost: 300, meritReward: 50 },
  { id: 'sp8', title: '工业和信息化部部长', org: '工信部', level: 12, levelName: '正部级', type: '调任', desc: '推进工业发展与数字经济战略',               cost: 280, meritReward: 48 },
  // 省委书记（11级）
  { id: 'sp9',  title: '广东省委书记',   org: '广东省委', level: 11, levelName: '正厅级',  type: '调任', desc: '主政粤港澳大湾区发展核心省份',            cost: 250, meritReward: 42 },
  { id: 'sp10', title: '浙江省委书记',   org: '浙江省委', level: 11, levelName: '正厅级',  type: '调任', desc: '领导数字经济和共同富裕示范区建设',        cost: 250, meritReward: 42 },
  { id: 'sp11', title: '江苏省委书记',   org: '江苏省委', level: 11, levelName: '正厅级',  type: '调任', desc: '主持全国经济第二大省的改革发展',          cost: 250, meritReward: 42 },
  { id: 'sp12', title: '北京市委书记',   org: '北京市委', level: 11, levelName: '正厅级',  type: '调任', desc: '首都政治文化中心的党政主要负责人',        cost: 250, meritReward: 42 },
  { id: 'sp13', title: '上海市委书记',   org: '上海市委', level: 11, levelName: '正厅级',  type: '调任', desc: '主政全国经济金融中心城市',               cost: 250, meritReward: 42 },
  // 副部级（10级）
  { id: 'sp14', title: '发改委副主任',   org: '发改委',   level: 10, levelName: '副部级',  type: '晋升', desc: '分管固定资产投资与区域协调',             cost: 150, meritReward: 25 },
  { id: 'sp15', title: '财政部副部长',   org: '财政部',   level: 10, levelName: '副部级',  type: '晋升', desc: '协助部长主管预算编制与转移支付',         cost: 150, meritReward: 25 },
];

// ── 专线电话传达任务数据（由 leaders.ts 动态生成）──────────────────

const HOTLINE_TASKS = [
  { id: 'ht1', label: '加快经济建设', desc: '要求加快推进本辖区经济发展与招商引资', meritReward: 12, effect: 'cityGdp', delta: 2 },
  { id: 'ht2', label: '改善民生保障', desc: '传达中央关于民生工作的重要指示精神', meritReward: 10, effect: 'cityLivelihood', delta: 2 },
  { id: 'ht3', label: '深化改革举措', desc: '部署重点领域改革任务，推进政策落地', meritReward: 15, effect: 'cityBusiness', delta: 3 },
  { id: 'ht4', label: '加强廉政建设', desc: '开展专项整治，坚持党风廉政建设高压态势', meritReward: 8, effect: 'securityIndex', delta: 2 },
  { id: 'ht5', label: '落实生态治理', desc: '传达绿色发展要求，督导环保目标完成', meritReward: 10, effect: 'cityEcology', delta: 2 },
];

// ── 述职报告部署：国政院向各部委及省级下达述职任务 ─────────────────
interface DebriefTask {
  id: string;
  unit: string;     // 单位名称
  type: '部委' | '省级';
  topic: string;    // 述职主题
  kpiTarget: string;
  deadline: string; // 截止季度描述
  status: 'pending' | 'submitted' | 'passed' | 'failed';
  score?: number;
}

const DEBRIEF_UNITS: DebriefTask[] = [
  { id: 'd1',  unit: '国家发展改革委', type: '部委', topic: 'GDP增速与重大项目完成情况', kpiTarget: 'GDP增速≥5%',    deadline: 'Q4', status: 'pending' },
  { id: 'd2',  unit: '财政部',        type: '部委', topic: '财政收支平衡与债务风险管控', kpiTarget: '赤字率≤3%',     deadline: 'Q4', status: 'pending' },
  { id: 'd3',  unit: '工业和信息化部', type: '部委', topic: '工业产值与数字经济发展',      kpiTarget: '数字经济占比≥40%', deadline: 'Q4', status: 'pending' },
  { id: 'd4',  unit: '农业农村部',     type: '部委', topic: '粮食安全与农村振兴',          kpiTarget: '粮食产量≥7亿吨', deadline: 'Q4', status: 'pending' },
  { id: 'd5',  unit: '生态环境部',     type: '部委', topic: '环保指标完成与碳达峰进度',    kpiTarget: 'PM2.5降幅≥5%',  deadline: 'Q4', status: 'pending' },
  { id: 'd6',  unit: '教育部',        type: '部委', topic: '基础教育质量与高等教育改革',  kpiTarget: '义务教育完成率≥99%', deadline: 'Q4', status: 'pending' },
  { id: 'd7',  unit: '卫生健康委',     type: '部委', topic: '公共卫生体系与医改进展',      kpiTarget: '医保覆盖率≥95%', deadline: 'Q4', status: 'pending' },
  { id: 'd8',  unit: '公安部',        type: '部委', topic: '社会治安综合治理',             kpiTarget: '刑事案件发案降5%', deadline: 'Q4', status: 'pending' },
  { id: 'd9',  unit: '广东省',        type: '省级', topic: '区域经济发展与高质量转型',    kpiTarget: 'GDP增速≥6%',     deadline: 'Q4', status: 'pending' },
  { id: 'd10', unit: '浙江省',        type: '省级', topic: '数字经济与民营经济活力',       kpiTarget: '营商排名全国前3', deadline: 'Q4', status: 'pending' },
  { id: 'd11', unit: '江苏省',        type: '省级', topic: '制造业转型升级',              kpiTarget: '高技术产业占比≥35%', deadline: 'Q4', status: 'pending' },
  { id: 'd12', unit: '山东省',        type: '省级', topic: '新旧动能转换',                kpiTarget: '新动能产值占比≥40%', deadline: 'Q4', status: 'pending' },
];

export default function PremierOfficeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, isLoading, updateGameSave } = useGame();
  const [tab, setTab] = useState('economy');
  const [acting, setActing] = useState(false);
  const [result, setResult] = useState('');
  const [subs, setSubs] = useState<Subordinate[]>([]);
  const [kpiLoading, setKpiLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [debriefTasks, setDebriefTasks] = useState<DebriefTask[]>(DEBRIEF_UNITS);
  const [debriefActing, setDebriefActing] = useState<string | null>(null);
  // 整改结果记录：taskId -> 整改措施描述
  const [reformResults, setReformResults] = useState<Record<string, string>>({});
  // 特批晋升：已批准的岗位ID集合
  const [approvedPosts, setApprovedPosts] = useState<Set<string>>(new Set());
  // 专线电话：已选联系人、已选任务
  const [hotlineTarget, setHotlineTarget] = useState<ReturnType<typeof getHotlineTargets>[0] | null>(null);
  const [hotlineTask, setHotlineTask] = useState<typeof HOTLINE_TASKS[0] | null>(null);
  const [hotlineFilter, setHotlineFilter] = useState<'全部' | '副院理' | '部长' | '省委书记'>('全部');
  const [hotlineSent, setHotlineSent] = useState<Set<string>>(new Set());
  // 月度GDP增长：记录上次领取的月份
  const [lastGdpMonth, setLastGdpMonth] = useState<number>(-1);

  // 动态专线联系人（基于存档ID，全局统一名字）
  const hotlineTargets = save ? getHotlineTargets(save.id) : [];

  useFocusEffect(
    useCallback(() => {
      if (!save || tab !== 'kpi') return;
      setKpiLoading(true);
      getAllSubordinates(save.id).then(list => {
        setSubs(list);
        setKpiLoading(false);
      });
    }, [save, tab]),
  );

  if (isLoading || !save) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color="#8B1A1A" /></View>;
  }
  // rank13+（副院理）即可进入，rank14（总理）拥有全权
  if (save.rankLevel < 13) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F5F4F1' }}>
        <Text style={{ fontSize: 32, marginBottom: 12 }}>🏛️</Text>
        <Text style={{ fontSize: 15, color: '#888', textAlign: 'center' }}>晋升至国政院副院理（级别13）后解锁总理办公室</Text>
      </View>
    );
  }

  // 月度专项金额：每月自动增长全国GDP的1%（国政院专项拨款）
  const currentMonth = Math.floor(save.gameDays / 30);
  const nationalGdpAmt = estimateNationalGdp(save.rankLevel, save.cityGdp); // 亿元
  const monthlyGdpBonus = Math.round(nationalGdpAmt * 0.01); // GDP的1%（亿元）
  const canCollectMonthly = currentMonth > lastGdpMonth && save.rankLevel >= 13;

  const handleCollectMonthly = async () => {
    if (!canCollectMonthly || acting) return;
    setActing(true);
    await updateGameSave({ fundBalance: save.fundBalance + monthlyGdpBonus * 10_000 });
    setLastGdpMonth(currentMonth);
    setResult(`💰 本月专项拨款已到账 ¥${formatMoney(monthlyGdpBonus * 10_000)}（全国GDP×1%）`);
    setActing(false);
    setTimeout(() => setResult(''), 4000);
  };

  const currentAreaActions = AREA_TABS.find(t => t.id === tab)?.ids.map(id => VP_AREAS.find(a => a.id === id)!).filter(Boolean) ?? [];

  const handleAction = async (action: VPArea) => {
    if (acting || save.fundBalance < action.cost) return;
    setActing(true);
    const patch: Record<string, unknown> = {
      fundBalance: save.fundBalance - action.cost,
      meritPoints: save.meritPoints + action.meritReward,
    };
    action.effects.forEach(e => {
      const cur = (save as unknown as Record<string, number>)[e.key] ?? 0;
      (patch as Record<string, number>)[e.key] = Math.min(100, cur + e.delta);
    });
    await updateGameSave(patch as Parameters<typeof updateGameSave>[0]);
    const effectStr = action.effects.map(e => `${EFFECT_LABELS[e.key] ?? e.key}+${e.delta}`).join(' ');
    setResult(`✅ ${action.title}完成 · 政绩+${action.meritReward} · ${effectStr}`);
    setActing(false);
    setTimeout(() => setResult(''), 3000);
  };

  // KPI - 三年不达标撤职（meritPoints < 2000 视为不达标，3次）
  const handleDismiss = async (sub: Subordinate) => {
    if (acting) return;
    setActing(true);
    await updateGameSave({ meritPoints: save.meritPoints + 20 });
    setDismissed(prev => new Set(prev).add(sub.id));
    setResult(`📉 已撤销 ${sub.name} 职务（KPI连续不达标）`);
    setActing(false);
    setTimeout(() => setResult(''), 3000);
  };

  // 述职报告：下达述职任务 / 批复审核
  const REFORM_OUTCOMES: Record<string, string> = {
    d1: '发改委已提交整改方案：加快重大项目审批，出台GDP增速专项支持政策',
    d2: '财政部整改落实：压减一般性支出5%，优化财政赤字管理机制',
    d3: '工信部整改措施：加大数字经济专项投入，引进重点企业落地',
    d4: '农业农村部整改方案：扩大高标准农田建设，加强粮食仓储保障',
    d5: '生态环境部整改：出台碳达峰专项行动方案，加强重点区域治理',
    d6: '教育部整改部署：增加义务教育专项投入，推进优质师资均衡配置',
    d7: '卫健委整改落实：扩大医保覆盖范围，完善基层医疗服务网络',
    d8: '公安部整改措施：开展专项打击行动，强化技防手段建设',
    d9: '广东省整改方案：出台产业转型升级专项政策，优化营商环境指标',
    d10: '浙江省整改部署：发布数字经济新三年行动方案，助推民营经济活力',
    d11: '江苏省整改措施：加快制造业智能化改造，提升高技术产业比重',
    d12: '山东省整改落实：设立新旧动能转换专项基金，聚焦六大传统产业',
  };

  const handleDebriefAction = async (task: DebriefTask, action: 'issue' | 'pass' | 'fail') => {
    if (debriefActing) return;
    setDebriefActing(task.id);
    const score = Math.floor(Math.random() * 40) + 55; // 55-95分
    if (action === 'issue') {
      setDebriefTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'submitted', score } : t));
      setResult(`📋 已向${task.unit}下达述职任务`);
    } else if (action === 'pass') {
      setDebriefTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'passed' } : t));
      await updateGameSave({ meritPoints: save.meritPoints + 15 });
      setResult(`✅ ${task.unit}述职报告审核通过，政绩+15`);
    } else {
      // 约谈整改：记录整改结果，标记为整改中，给予追踪政绩奖励
      const outcome = REFORM_OUTCOMES[task.id] ?? `${task.unit}已接受约谈，承诺45天内提交整改落实方案`;
      setDebriefTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'failed' } : t));
      setReformResults(prev => ({ ...prev, [task.id]: outcome }));
      await updateGameSave({ meritPoints: save.meritPoints + 8 });
      setResult(`⚠️ ${task.unit}约谈整改已发出，整改追踪+8政绩`);
    }
    setDebriefActing(null);
    setTimeout(() => setResult(''), 3500);
  };

  const handleDebriefReset = () => {
    setDebriefTasks(DEBRIEF_UNITS.map(t => ({ ...t, status: 'pending' as const })));
    setResult('🔄 新一轮述职周期已开启');
    setTimeout(() => setResult(''), 2500);
  };

  // 特批晋升/调任
  const handleSpecialApprove = async (post: SpecialPost) => {
    if (acting || approvedPosts.has(post.id)) return;
    if ((save?.meritPoints ?? 0) < post.cost) {
      setResult(`⚠️ 政绩不足，需要 ${post.cost} 政绩`);
      setTimeout(() => setResult(''), 2500);
      return;
    }
    setActing(true);
    await updateGameSave({
      meritPoints: (save?.meritPoints ?? 0) - post.cost + post.meritReward,
    });
    setApprovedPosts(prev => new Set(prev).add(post.id));
    setResult(`✅ 已${post.type === '晋升' ? '特批晋升' : '调任'}${post.title} · 政绩${post.cost > post.meritReward ? '-' : '+'}${Math.abs(post.cost - post.meritReward)}`);
    setActing(false);
    setTimeout(() => setResult(''), 3000);
  };

  // 专线电话传达任务
  const handleHotlineSend = async () => {
    if (!hotlineTarget || !hotlineTask || acting) return;
    const key = `${hotlineTarget.id}_${hotlineTask.id}`;
    if (hotlineSent.has(key)) return;
    setActing(true);
    const patch: Record<string, unknown> = {
      meritPoints: (save?.meritPoints ?? 0) + hotlineTask.meritReward,
    };
    const cur = (save as unknown as Record<string, number>)[hotlineTask.effect] ?? 0;
    (patch as Record<string, number>)[hotlineTask.effect] = Math.min(100, cur + hotlineTask.delta);
    await updateGameSave(patch as Parameters<typeof updateGameSave>[0]);
    setHotlineSent(prev => new Set(prev).add(key));
    setResult(`☎️ 已向${hotlineTarget.title}${hotlineTarget.name}传达「${hotlineTask.label}」任务 · 政绩+${hotlineTask.meritReward}`);
    setHotlineTarget(null);
    setHotlineTask(null);
    setActing(false);
    setTimeout(() => setResult(''), 3000);
  };

  const rankedSubs = [...subs].sort((a, b) => calcKpiScore(b) - calcKpiScore(a));
  const currentYear = Math.floor(save.gameDays / 365);

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F4F0' }}>
      <StatusBar style="light" backgroundColor="#3D0808" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#3D0808', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => router.replace('/(app)/home')}>
          <Text style={{ color: '#ffaaaa', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'rgba(255,200,200,0.6)', fontSize: 9, letterSpacing: 3 }}>国政院 · 总理职权</Text>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>🏛️ 国政院院理办公室</Text>
          <Text style={{ color: 'rgba(255,200,200,0.7)', fontSize: 11, marginTop: 2 }}>{save.playerName} · 主持国政院全面工作</Text>
        </View>
      </View>

      {/* 资源栏 */}
      <View style={{ flexDirection: 'row', backgroundColor: '#5C0A0A', paddingVertical: 10, paddingHorizontal: 14, gap: 10 }}>
        <View style={{ flex: 1.5, alignItems: 'center' }}>
          <Text style={{ color: 'rgba(255,200,200,0.6)', fontSize: 9 }}>专项经费</Text>
          <Text style={{ color: '#FFD700', fontWeight: '700', fontSize: 13 }}>¥{formatMoney(save.fundBalance)}</Text>
        </View>
        <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ color: 'rgba(255,200,200,0.6)', fontSize: 9 }}>政绩积累</Text>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{save.meritPoints.toFixed(0)}</Text>
        </View>
        <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ color: 'rgba(255,200,200,0.6)', fontSize: 9 }}>任职年</Text>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{save.tenureYears}年</Text>
        </View>
      </View>

      {/* 月度专项拨款提示条 */}
      {canCollectMonthly && (
        <Pressable
          onPress={() => void handleCollectMonthly()}
          style={{ backgroundColor: '#7B2800', paddingVertical: 8, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <View>
            <Text style={{ color: '#FFD700', fontSize: 10, fontWeight: '700' }}>💰 本月专项拨款可领取</Text>
            <Text style={{ color: 'rgba(255,200,150,0.8)', fontSize: 9, marginTop: 1 }}>
              全国GDP×1% = ¥{formatMoney(monthlyGdpBonus * 10_000)}（约{monthlyGdpBonus}亿）
            </Text>
          </View>
          <View style={{ backgroundColor: '#FFD700', paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: '#5C0A0A', fontSize: 11, fontWeight: '700' }}>领取</Text>
          </View>
        </Pressable>
      )}

      {/* 分管说明 */}
      <View style={{ backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', gap: 10, borderBottomWidth: 1, borderBottomColor: '#EEE' }}>
        {[
          { icon: '📈', label: '第一副院理', sub: '分管经济' },
          { icon: '🏥', label: '第二副院理', sub: '分管民生' },
          { icon: '🤝', label: '第三副院理', sub: '港澳台外交' },
        ].map(item => (
          <View key={item.label} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
            <Text style={{ fontSize: 16 }}>{item.icon}</Text>
            <Text style={{ fontSize: 9, color: '#555', fontWeight: '700' }}>{item.label}</Text>
            <Text style={{ fontSize: 9, color: '#888' }}>{item.sub}</Text>
          </View>
        ))}
      </View>

      {/* 功能Tab */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' }} contentContainerStyle={{ paddingHorizontal: 8 }}>
        {AREA_TABS.map(t => (
          <Pressable
            key={t.id}
            onPress={() => setTab(t.id)}
            style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: tab === t.id ? '#8B1A1A' : 'transparent' }}
          >
            <Text style={{ fontSize: 11, fontWeight: tab === t.id ? '700' : '400', color: tab === t.id ? '#8B1A1A' : '#888' }} numberOfLines={1}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentInsetAdjustmentBehavior="automatic">

        {/* 行动列表 */}
        {tab !== 'kpi' && (
          <View style={{ padding: 14, gap: 10 }}>
            {currentAreaActions.map(action => {
              const canAct = save.fundBalance >= action.cost;
              return (
                <View key={action.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D0D0D0', overflow: 'hidden' }}>
                  <View style={{ padding: 13, gap: 5 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1, flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                        <Text style={{ fontSize: 18 }}>{action.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D2D44' }}>{action.title}</Text>
                          <Text style={{ fontSize: 11, color: '#777', lineHeight: 16, marginTop: 2 }}>{action.desc}</Text>
                        </View>
                      </View>
                      <View style={{ backgroundColor: '#FFF5F5', paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 }}>
                        <Text style={{ fontSize: 9, color: '#8B1A1A', fontWeight: '600' }}>+{action.meritReward}政绩</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 3 }}>
                      <View style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, color: '#7B5E2A' }}>费用 ¥{formatMoney(action.cost)}</Text>
                      </View>
                      {action.effects.map(e => (
                        <View key={e.key} style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, color: '#2B4B6F' }}>{EFFECT_LABELS[e.key] ?? e.key} +{e.delta}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <Pressable
                    onPress={() => handleAction(action)}
                    disabled={!canAct || acting}
                    style={{ backgroundColor: canAct ? '#3D0808' : '#ccc', paddingVertical: 11, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
                      {acting ? '执行中…' : canAct ? `▶ 下达指示（¥${formatMoney(action.cost)}）` : '⚠️ 经费不足'}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        {/* 述职报告部署 */}
        {tab === 'debrief' && (
          <View style={{ padding: 14, gap: 10 }}>
            {/* 统计局说明栏 */}
            <View style={{ backgroundColor: '#2B4B6F', padding: 14 }}>
              <Text style={{ color: 'rgba(180,210,255,0.7)', fontSize: 9, letterSpacing: 2 }}>国政院 · 述职报告管理</Text>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, marginTop: 3 }}>📋 年度述职报告部署</Text>
              <Text style={{ color: 'rgba(180,210,255,0.85)', fontSize: 11, marginTop: 4, lineHeight: 16 }}>
                国家统计局根据各部委及省级KPI完成情况自动汇总。向各单位下达述职任务，审核报告并决定奖励或约谈。
              </Text>
            </View>

            {/* 统计摘要 */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { label: '待下达', val: debriefTasks.filter(t => t.status === 'pending').length,    color: '#888' },
                { label: '已提交', val: debriefTasks.filter(t => t.status === 'submitted').length,  color: '#7B5E2A' },
                { label: '通过',   val: debriefTasks.filter(t => t.status === 'passed').length,     color: '#2a7a3b' },
                { label: '不达标', val: debriefTasks.filter(t => t.status === 'failed').length,     color: '#C82829' },
              ].map(s => (
                <View key={s.label} style={{ flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0E0E0', padding: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: s.color }}>{s.val}</Text>
                  <Text style={{ fontSize: 9, color: '#888', marginTop: 2 }}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* 单位列表 */}
            {debriefTasks.map(task => {
              const statusConfig = {
                pending:   { label: '待下达', color: '#888',    bg: '#F5F5F5' },
                submitted: { label: '已提交', color: '#7B5E2A', bg: '#FFFBF0' },
                passed:    { label: '已通过', color: '#2a7a3b', bg: '#F0FAF0' },
                failed:    { label: '不达标', color: '#C82829', bg: '#FFF5F5' },
              }[task.status];

              return (
                <View key={task.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDD', overflow: 'hidden' }}>
                  <View style={{ padding: 12, gap: 5 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{ backgroundColor: task.type === '部委' ? '#2B4B6F' : '#2a7a3b', paddingHorizontal: 5, paddingVertical: 1 }}>
                            <Text style={{ fontSize: 8, color: '#fff', fontWeight: '700' }}>{task.type}</Text>
                          </View>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D2D44' }}>{task.unit}</Text>
                        </View>
                        <Text style={{ fontSize: 11, color: '#555', marginTop: 4, lineHeight: 16 }}>{task.topic}</Text>
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                          <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 9, color: '#2B4B6F' }}>目标：{task.kpiTarget}</Text>
                          </View>
                          <View style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 9, color: '#7B5E2A' }}>截止：{task.deadline}</Text>
                          </View>
                          {task.score !== undefined && (
                            <View style={{ backgroundColor: statusConfig.bg, paddingHorizontal: 6, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 9, color: statusConfig.color, fontWeight: '700' }}>得分：{task.score}分</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={{ backgroundColor: statusConfig.bg, borderWidth: 1, borderColor: statusConfig.color, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 }}>
                        <Text style={{ fontSize: 9, color: statusConfig.color, fontWeight: '700' }}>{statusConfig.label}</Text>
                      </View>
                    </View>
                  </View>

                  {/* 操作按钮 */}
                  <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F0F0F0' }}>
                    {task.status === 'pending' && (
                      <Pressable
                        onPress={() => handleDebriefAction(task, 'issue')}
                        disabled={debriefActing === task.id}
                        style={{ flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: '#2B4B6F' }}
                      >
                        <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>📤 下达述职任务</Text>
                      </Pressable>
                    )}
                    {task.status === 'submitted' && (
                      <>
                        <Pressable
                          onPress={() => handleDebriefAction(task, 'pass')}
                          disabled={debriefActing === task.id}
                          style={{ flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: '#2a7a3b' }}
                        >
                          <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>✅ 批复通过</Text>
                        </Pressable>
                        <View style={{ width: 1, backgroundColor: '#F0F0F0' }} />
                        <Pressable
                          onPress={() => handleDebriefAction(task, 'fail')}
                          disabled={debriefActing === task.id}
                          style={{ flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: '#8B0000' }}
                        >
                          <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>⚠️ 约谈整改</Text>
                        </Pressable>
                      </>
                    )}
                    {(task.status === 'passed' || task.status === 'failed') && (
                      <View style={{ flex: 1 }}>
                        <View style={{ paddingVertical: 9, alignItems: 'center', backgroundColor: statusConfig.bg }}>
                          <Text style={{ fontSize: 10, color: statusConfig.color, fontWeight: '700' }}>
                            {task.status === 'passed' ? '✅ 审核完毕，已归档' : '⚠️ 整改通知已下发'}
                          </Text>
                        </View>
                        {/* 整改结果展示 */}
                        {task.status === 'failed' && reformResults[task.id] && (
                          <View style={{ backgroundColor: '#FFFBF0', borderTopWidth: 1, borderTopColor: '#F5DCB0', padding: 10 }}>
                            <Text style={{ fontSize: 9, color: '#7B5E2A', fontWeight: '700', marginBottom: 3 }}>📑 整改落实情况</Text>
                            <Text style={{ fontSize: 10, color: '#555', lineHeight: 15 }}>{reformResults[task.id]}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}

            {/* 开启新一轮 */}
            <Pressable
              onPress={handleDebriefReset}
              style={{ backgroundColor: '#2B4B6F', paddingVertical: 12, alignItems: 'center', marginTop: 4 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>🔄 开启新一轮述职周期</Text>
            </Pressable>
          </View>
        )}

        {/* KPI 述职排名 */}
        {tab === 'kpi' && (
          <View style={{ padding: 14, gap: 12 }}>
            <View style={{ backgroundColor: '#3D0808', padding: 14 }}>
              <Text style={{ color: 'rgba(255,200,200,0.7)', fontSize: 9, letterSpacing: 2 }}>国家统计局 · KPI考评系统</Text>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, marginTop: 3 }}>📊 年度述职排名与考评</Text>
              <Text style={{ color: 'rgba(255,200,200,0.8)', fontSize: 11, marginTop: 4, lineHeight: 16 }}>
                依据政绩积分（40%）+ 廉洁指数（30%）+ 忠诚（15%）+ 能力（15%）自动排名。三年连续末位可撤职。
              </Text>
            </View>

            {kpiLoading ? (
              <View style={{ alignItems: 'center', padding: 24 }}><ActivityIndicator color="#8B1A1A" /></View>
            ) : rankedSubs.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <Text style={{ color: '#888', fontSize: 14 }}>暂无下属数据</Text>
              </View>
            ) : (
              rankedSubs.map((sub, idx) => {
                const score = calcKpiScore(sub);
                const isBottom = idx >= rankedSubs.length - Math.max(1, Math.floor(rankedSubs.length * 0.2));
                const isDismissed = dismissed.has(sub.id);
                const kpiGrade = score >= 70 ? '优秀' : score >= 50 ? '良好' : score >= 35 ? '合格' : '不合格';
                const gradeColor = score >= 70 ? '#2a7a3b' : score >= 50 ? '#7B5E2A' : score >= 35 ? '#C82829' : '#8B0000';

                return (
                  <View key={sub.id} style={{ backgroundColor: isDismissed ? '#F0F0F0' : '#fff', borderWidth: 1, borderColor: isBottom && !isDismissed ? '#C82829' : '#DDD', overflow: 'hidden', opacity: isDismissed ? 0.5 : 1 }}>
                    <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      {/* 排名 */}
                      <View style={{ width: 28, height: 28, backgroundColor: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : '#F0F0F0', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: idx < 3 ? '#fff' : '#888' }}>
                          {isDismissed ? '📤' : idx + 1}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: isDismissed ? '#aaa' : '#222' }}>{sub.name}</Text>
                          <View style={{ backgroundColor: gradeColor, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>{isDismissed ? '已撤职' : kpiGrade}</Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 10, color: '#888', marginTop: 1 }}>{sub.position} · KPI分：{score.toFixed(1)}</Text>
                        <View style={{ height: 4, backgroundColor: '#EEE', borderRadius: 2, marginTop: 5 }}>
                          <View style={{ width: `${Math.min(100, score)}%`, height: 4, backgroundColor: gradeColor, borderRadius: 2 }} />
                        </View>
                      </View>
                    </View>

                    {/* 奖励谈话 or 撤职按钮 */}
                    {!isDismissed && (
                      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F0F0F0' }}>
                        {idx === 0 && (
                          <View style={{ flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: '#F0FAF0' }}>
                            <Text style={{ fontSize: 11, color: '#2a7a3b', fontWeight: '600' }}>🏆 排名第一 · 已谈话嘉奖</Text>
                          </View>
                        )}
                        {isBottom && currentYear - (save.kpiRankingYear ?? 0) >= 3 && (
                          <Pressable
                            onPress={() => handleDismiss(sub)}
                            disabled={acting}
                            style={{ flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: '#8B0000' }}
                          >
                            <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>📉 KPI三年不达标 · 撤职</Text>
                          </Pressable>
                        )}
                        {!isBottom && idx !== 0 && (
                          <View style={{ flex: 1, paddingVertical: 9, alignItems: 'center' }}>
                            <Text style={{ fontSize: 10, color: '#888' }}>暂无处置</Text>
                          </View>
                        )}
                        {isBottom && currentYear - (save.kpiRankingYear ?? 0) < 3 && (
                          <View style={{ flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: '#FFF5F5' }}>
                            <Text style={{ fontSize: 10, color: '#C82829' }}>末位警示（{3 - (currentYear - (save.kpiRankingYear ?? 0))}年后可撤职）</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}

            {/* 当年KPI更新按钮 */}
            <Pressable
              onPress={async () => {
                await updateGameSave({ kpiRankingYear: currentYear, kpiRankingResult: `第${currentYear}年度考评完成` });
                setResult('📊 KPI年度考评已更新');
                setTimeout(() => setResult(''), 2500);
              }}
              style={{ backgroundColor: '#3D0808', paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>🔄 刷新年度KPI排名</Text>
            </Pressable>
          </View>
        )}

        {/* ── 特批晋升/调任 ── */}
        {tab === 'promote' && (
          <View style={{ padding: 14, gap: 10 }}>
            <View style={{ backgroundColor: '#3D0808', padding: 14 }}>
              <Text style={{ color: 'rgba(255,200,200,0.7)', fontSize: 9, letterSpacing: 2 }}>国政院 · 特批人事权</Text>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, marginTop: 3 }}>🚀 特批晋升 / 调任岗位</Text>
              <Text style={{ color: 'rgba(255,200,200,0.8)', fontSize: 11, marginTop: 4, lineHeight: 16 }}>
                总理可对总理以下任何岗位行使特批晋升或调任权。审批须消耗相应政绩，批准后自动生效并获得政绩奖励。
              </Text>
            </View>
            {/* 政绩余额 */}
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDD', padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: '#555' }}>当前政绩余额</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#3D0808' }}>{save?.meritPoints.toFixed(0) ?? 0} 分</Text>
            </View>
            {/* 按职级分组展示岗位 */}
            {[13, 12, 11, 10].map(level => {
              const levelPosts = SPECIAL_POSTS.filter(p => p.level === level);
              if (levelPosts.length === 0) return null;
              const levelNames: Record<number, string> = { 13: '副国级（副院理）', 12: '正部级（部长/省长）', 11: '副部级（省委书记）', 10: '副部级' };
              return (
                <View key={level}>
                  <View style={{ backgroundColor: '#F5F4F1', paddingHorizontal: 10, paddingVertical: 6, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: '#3D0808' }}>
                    <Text style={{ fontSize: 10, color: '#3D0808', fontWeight: '700', letterSpacing: 1 }}>{levelNames[level]}</Text>
                  </View>
                  {levelPosts.map(post => {
                    const approved = approvedPosts.has(post.id);
                    const canApprove = (save?.meritPoints ?? 0) >= post.cost && !approved;
                    return (
                      <View key={post.id} style={{ backgroundColor: approved ? '#F0FAF0' : '#fff', borderWidth: 1, borderColor: approved ? '#2a7a3b' : '#DDD', marginBottom: 8, overflow: 'hidden' }}>
                        <View style={{ padding: 12, gap: 5 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={{ backgroundColor: post.type === '晋升' ? '#C82829' : '#2B4B6F', paddingHorizontal: 5, paddingVertical: 1 }}>
                                  <Text style={{ fontSize: 8, color: '#fff', fontWeight: '700' }}>{post.type}</Text>
                                </View>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#111' }}>{post.title}</Text>
                              </View>
                              <Text style={{ fontSize: 10, color: '#666', marginTop: 3 }}>{post.org} · {post.levelName}</Text>
                              <Text style={{ fontSize: 11, color: '#888', marginTop: 3, lineHeight: 15 }}>{post.desc}</Text>
                            </View>
                            {approved && (
                              <View style={{ backgroundColor: '#2a7a3b', paddingHorizontal: 6, paddingVertical: 2 }}>
                                <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>已批准</Text>
                              </View>
                            )}
                          </View>
                          <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                            <View style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 6, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 9, color: '#7B5E2A' }}>消耗 {post.cost} 政绩</Text>
                            </View>
                            <View style={{ backgroundColor: '#F0F8F0', paddingHorizontal: 6, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 9, color: '#2a7a3b' }}>奖励 +{post.meritReward} 政绩</Text>
                            </View>
                          </View>
                        </View>
                        {!approved && (
                          <Pressable
                            onPress={() => void handleSpecialApprove(post)}
                            disabled={!canApprove || acting}
                            style={{ paddingVertical: 10, alignItems: 'center', backgroundColor: canApprove ? '#3D0808' : '#CCC' }}
                          >
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
                              {acting ? '审批中…' : canApprove ? `▶ 批准${post.type}（消耗${post.cost}政绩）` : '政绩不足'}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        )}

        {/* ── 专线电话 ── */}
        {tab === 'hotline' && (
          <View style={{ padding: 14, gap: 10 }}>
            <View style={{ backgroundColor: '#1D3B5E', padding: 14 }}>
              <Text style={{ color: 'rgba(160,200,255,0.7)', fontSize: 9, letterSpacing: 2 }}>国政院 · 专线通讯</Text>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, marginTop: 3 }}>☎️ 专线电话传达任务</Text>
              <Text style={{ color: 'rgba(160,200,255,0.8)', fontSize: 11, marginTop: 4, lineHeight: 16 }}>
                通过专线向副院理、国政院部长及省委书记传达工作任务，强化执行力，快速推动政策落地。
              </Text>
            </View>

            {/* 联系人筛选 */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {(['全部', '副院理', '部长', '省委书记'] as const).map(f => (
                  <Pressable
                    key={f}
                    onPress={() => setHotlineFilter(f)}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: hotlineFilter === f ? '#1D3B5E' : '#E8EEF5' }}
                  >
                    <Text style={{ fontSize: 11, color: hotlineFilter === f ? '#fff' : '#555', fontWeight: hotlineFilter === f ? '700' : '400' }}>{f}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* 联系人选择 */}
            <Text style={{ fontSize: 10, color: '#888', letterSpacing: 1 }}>① 选择联系人</Text>
            {hotlineTargets
              .filter(t => {
                if (hotlineFilter === '副院理') return t.level === 13;
                if (hotlineFilter === '部长') return t.level === 12;
                if (hotlineFilter === '省委书记') return t.level === 11;
                return true;
              })
              .map(target => {
                const isSelected = hotlineTarget?.id === target.id;
                return (
                  <Pressable
                    key={target.id}
                    onPress={() => setHotlineTarget(isSelected ? null : target)}
                    style={{ backgroundColor: isSelected ? '#1D3B5E' : '#fff', borderWidth: 1, borderColor: isSelected ? '#1D3B5E' : '#DDD', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                  >
                    <Text style={{ fontSize: 18 }}>{target.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: isSelected ? '#fff' : '#111' }}>{target.name}</Text>
                      <Text style={{ fontSize: 10, color: isSelected ? 'rgba(200,220,255,0.8)' : '#888' }}>{target.title} · {target.org}</Text>
                    </View>
                    {isSelected && (
                      <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✓ 已选</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })
            }

            {/* 任务选择 */}
            <Text style={{ fontSize: 10, color: '#888', letterSpacing: 1, marginTop: 4 }}>② 选择传达任务</Text>
            {HOTLINE_TASKS.map(task => {
              const isSelected = hotlineTask?.id === task.id;
              return (
                <Pressable
                  key={task.id}
                  onPress={() => setHotlineTask(isSelected ? null : task)}
                  style={{ backgroundColor: isSelected ? '#C82829' : '#fff', borderWidth: 1, borderColor: isSelected ? '#C82829' : '#DDD', padding: 10, gap: 3 }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: isSelected ? '#fff' : '#111' }}>{task.label}</Text>
                    <Text style={{ fontSize: 10, color: isSelected ? 'rgba(255,200,200,0.9)' : '#2a7a3b', fontWeight: '700' }}>+{task.meritReward}政绩</Text>
                  </View>
                  <Text style={{ fontSize: 10, color: isSelected ? 'rgba(255,220,220,0.9)' : '#888' }}>{task.desc}</Text>
                </Pressable>
              );
            })}

            {/* 发起专线 */}
            <Pressable
              onPress={() => void handleHotlineSend()}
              disabled={!hotlineTarget || !hotlineTask || acting}
              style={{ backgroundColor: hotlineTarget && hotlineTask ? '#1D3B5E' : '#CCC', paddingVertical: 14, alignItems: 'center', marginTop: 4 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                {acting ? '传达中…' : hotlineTarget && hotlineTask ? `☎️ 向${hotlineTarget.name}传达「${hotlineTask.label}」` : '请选择联系人和任务'}
              </Text>
            </Pressable>

            {/* 已传达记录 */}
            {hotlineSent.size > 0 && (
              <View style={{ backgroundColor: '#F0F4F8', padding: 10, gap: 4 }}>
                <Text style={{ fontSize: 10, color: '#2B4B6F', fontWeight: '700', marginBottom: 4 }}>✅ 本轮已传达记录（{hotlineSent.size}条）</Text>
                {Array.from(hotlineSent).map(k => {
                  const [tid, taskId] = k.split('_');
                  const t = hotlineTargets.find(x => x.id === tid);
                  const tk = HOTLINE_TASKS.find(x => x.id === taskId);
                  if (!t || !tk) return null;
                  return (
                    <Text key={k} style={{ fontSize: 10, color: '#555' }}>• {t.title}{t.name} ← {tk.label}</Text>
                  );
                })}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {!!result && (
        <View style={{ position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: '#3D0808', padding: 12, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{result}</Text>
        </View>
      )}
    </View>
  );
}
```

<a id="srcappapppromotiontsx"></a>
## `src/app/(app)/promotion.tsx`

```tsx
// 晋升评审页面 v5 — 三 Tab（派系攻夺战 / 个人争夺战 / 晋升条件）
// 废弃旧五步流程（PromotionFlow/pending_promotion）与旧 Tab（岗位空缺/破格通道）；落档统一走 applyContestWin
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getNpcBand } from '@/db/gameApi';
import { getTierOf } from '@/lib/promotionEngine';
import {
  COUNTY_OFFICIAL_POSITIONS,
  CITY_OFFICIAL_POSITIONS,
  SUB_PROVINCE_CITY_POSITIONS,
  PROVINCE_OFFICIAL_POSITIONS,
  RANK_CONFIG,
  getRandomCityForRank,
  FACTION_LABEL,
  type FactionId,
  type PlayerSave,
  type PromotionContest,
} from '@/types/game';
import { applyContestWin, resolveContestDetailed, checkPromotionGate, getContestCycleId } from '@/lib/promotionFaction';
import { bumpCycleContestWin } from '@/lib/factionExpansion';
import { CONTEST_COSTS, PROVINCE_ATTACK_COST } from '@/lib/provinceSeatSystem';
import { nanoid } from '@/lib/nanoid';
import { WIND_CYCLE_DAYS } from '@/lib/factionSystem';
import { PositionBoard } from '@/components/PositionBoard';
import { FactionAttackMap } from '@/components/promotion/FactionAttackMap';
import { ConditionsTab } from '@/components/promotion/ConditionsTab';
import { RecordsTab } from '@/components/promotion/RecordsTab';

type TabKey = 'factionAttack' | 'personalContest' | 'conditions' | 'records';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'factionAttack', label: '派系攻夺战' },
  { key: 'personalContest', label: '个人争夺战' },
  { key: 'conditions', label: '晋升条件' },
  { key: 'records', label: '晋升记录' },
];

// 顶栏背景图：古典建筑远景，贴合政务晋升主题，视觉中性
const PROMO_HEADER_BG = 'https://miaoda-site-img.cdn.bcebos.com/images/docsearch_819b8088-e0d9-48eb-b3da-eb04af3e2a5c.png';

/** 按目标职级取下一职级段官职列表（复用官职数组） */
function getPositionsForRank(rankLevel: number) {
  const tier = getTierOf(rankLevel + 1);
  if (tier === 1) return COUNTY_OFFICIAL_POSITIONS.filter(p => p.tier === '副科级' || p.tier === '正科级');
  if (tier === 2) return COUNTY_OFFICIAL_POSITIONS.filter(p => p.tier === '副处级' || p.tier === '正处级');
  if (tier === 3) return CITY_OFFICIAL_POSITIONS.filter(p => p.tier === '副厅级' || p.tier === '正厅级');
  if (tier === 4) return [...SUB_PROVINCE_CITY_POSITIONS, ...PROVINCE_OFFICIAL_POSITIONS].filter(p => p.tier === '副部级' || p.tier === '正部级');
  return PROVINCE_OFFICIAL_POSITIONS.filter(p => p.tier === '正部级');
}

/** 当前争夺状态文案 */
function contestStatusText(contest: PlayerSave['promotionContest']): string {
  if (!contest) return '无';
  if (contest.status === 'active') return '进行中';
  if (contest.status === 'won') return '已胜';
  return '未胜';
}

export default function PromotionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave, refreshSave } = useGame();
  const [tab, setTab] = useState<TabKey>('personalContest');
  const [boardVisible, setBoardVisible] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackOk, setFeedbackOk] = useState(true);
  const [bandFactions, setBandFactions] = useState<FactionId[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const showFeedback = (msg: string, ok = true) => {
    setFeedback(msg);
    setFeedbackOk(ok);
    setTimeout(() => setFeedback(''), 4000);
  };

  // 班子派系（sYou 计算需要 bandSynergy）
  useEffect(() => {
    if (!save) return;
    (async () => {
      const band = await getNpcBand(save.id);
      const bf: FactionId[] = [];
      for (const m of band) { if (m.faction) bf.push(m.faction); }
      setBandFactions(bf);
    })();
  }, [save?.id]);

  /**
   * v4 个人职位独立斗争（10% 派系 + 90% 个人）。
   * 门控：冷却 30 天 + 功绩 ≥ 80 → 扣 80 功绩 → resolvePersonalContest 判定 → 仅 win 落档晋升。
   * 个人战 win 只晋升玩家，不结束派系回合。
   */
  const handlePersonalContest = async (
    positionKey: string,
    positionTitle: string,
    toRank: number,
    targetCity: string,
  ) => {
    if (!save || submitting) return;
    setSubmitting(true);
    try {
      const day = save.gameDays;
      // 门控 0：每周期（5 年）仅允许晋升一次
      const gate = checkPromotionGate(save);
      if (!gate.allowed) {
        showFeedback(`🚫 ${gate.blockReason}`, false);
        return;
      }
      // 门控 1：冷却
      const cooldownRemaining = Math.max(0, (save.personalContestCooldownUntil ?? 0) - day);
      if (cooldownRemaining > 0) {
        showFeedback(`冷却时间未到，请等待 ${cooldownRemaining} 天后再试`, false);
        return;
      }
      // 门控 2：功绩门槛（联合模式提高花费）
      const coalition = save.contestMode === 'coalition';
      const meritCost = Math.round(CONTEST_COSTS.personalContest.merit * (coalition ? PROVINCE_ATTACK_COST.coalitionMeritMultiplier : 1));
      if ((save.meritPoints ?? 0) < meritCost) {
        showFeedback(`功绩点数不足，需要 ${meritCost} 点功绩`, false);
        return;
      }

      // 判定（10% 派系 + 90% 个人）
      const result = resolveContestDetailed(save, bandFactions, positionKey, positionTitle, toRank, targetCity);
      const history = [...(save.personalContestHistory ?? []), result.detail];

      if (result.win) {
        // 统一走 applyContestWin 落档（写入 lastPromotionCycleId，保证本周期不可再升）
        const wonContest: PromotionContest = {
          id: nanoid(),
          positionKey,
          positionTitle,
          toRank,
          faction: save.primaryFaction as FactionId,
          sYou: result.sYou,
          sOpp: result.sOpp,
          status: 'won',
          startDay: day,
          cycleDay: getContestCycleId(day) * WIND_CYCLE_DAYS,
        };
        const updates = applyContestWin(save, wonContest, day);
        await updateGameSave({
          ...updates,
          ...bumpCycleContestWin(save),
          meritPoints: Math.max(0, (save.meritPoints ?? 0) - meritCost),
          personalContestCooldownUntil: day + CONTEST_COSTS.personalContest.cooldownDays,
          personalContestHistory: history,
        });
        showFeedback(`🎉 个人职位战胜利！已就任 ${positionTitle}（${targetCity}）· 消耗 ${meritCost} 功绩`, true);
      } else {
        // 失败：扣功绩 + 记录历史 + 设冷却
        await updateGameSave({
          meritPoints: Math.max(0, (save.meritPoints ?? 0) - meritCost),
          personalContestCooldownUntil: day + CONTEST_COSTS.personalContest.cooldownDays,
          personalContestHistory: history,
        });
        showFeedback(`✗ 个人职位战失败（S_you ${result.sYou} < S_opp ${result.sOpp}）· 消耗 ${meritCost} 功绩，${CONTEST_COSTS.personalContest.cooldownDays} 天后可再战`, false);
      }
      await refreshSave();
    } finally {
      setSubmitting(false);
    }
  };

  /** 立即结算当前争夺（主动结算：sYou≥sOpp 判胜则 applyContestWin 落档） */
  const handleResolveContest = async () => {
    if (!save || !save.promotionContest || save.promotionContest.status !== 'active' || submitting) return;
    setSubmitting(true);
    try {
      const contest = save.promotionContest;
      if (contest.sYou >= contest.sOpp) {
        // 玩家赢职位：applyContestWin 落地（不结束派系回合）
        const updates = applyContestWin(save, contest, save.gameDays);
        await updateGameSave(updates);
        showFeedback(`🎉 争夺胜利！已就任 ${contest.positionTitle}`, true);
      } else {
        // 失败：记录 lost，清空当前争夺
        await updateGameSave({
          promotionContest: null,
          contestHistory: [...(save.contestHistory ?? []), {
            id: contest.id,
            positionTitle: contest.positionTitle,
            toRank: contest.toRank,
            sYou: contest.sYou,
            sOpp: contest.sOpp,
            result: 'lost' as const,
            day: save.gameDays,
          }],
        });
        showFeedback(`✗ 争夺失败（${contest.sYou} < ${contest.sOpp}），下轮再战`, false);
      }
      await refreshSave();
    } finally {
      setSubmitting(false);
    }
  };

  // 目标职位列表（useMemo 避免重复过滤）
  const targetPositions = useMemo(() => {
    if (!save) return [];
    return getPositionsForRank(save.rankLevel).slice(0, 12);
  }, [save?.rankLevel]);

  if (!save) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
        <ActivityIndicator color="#C82829" style={{ marginTop: 100 }} />
      </View>
    );
  }

  const primary = save.primaryFaction as FactionId | '';
  const contest = save.promotionContest;
  // v5 晋升硬门控（传给 ConditionsTab）
  const gate = checkPromotionGate(save);
  const contestActive = contest && contest.status === 'active';
  const cycleRemaining = contest ? Math.max(0, contest.cycleDay - save.gameDays) : 0;
  const statusText = contestStatusText(contest);
  const statusColor = contest?.status === 'won' ? '#2E7D32' : contest?.status === 'active' ? '#C82829' : '#999';

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      <StatusBar style="light" backgroundColor="#1D3B5E" />
      {/* 顶栏 */}
      <View style={{ backgroundColor: '#1D3B5E', paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16 }}>
        <Image
          source={{ uri: PROMO_HEADER_BG }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
          contentFit="cover"
          transition={300}
        />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,30,50,0.72)' }} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 2 }}>🏅 晋升评审 · 职位争夺</Text>
            {primary ? (
              <Text style={{ color: '#8eb4d8', fontSize: 9, marginTop: 2 }}>
                主派：{FACTION_LABEL[primary]} · 职位争夺制
              </Text>
            ) : null}
          </View>
          <Pressable onPress={() => setBoardVisible(true)} style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>♟ 位置棋盘</Text>
          </Pressable>
        </View>
      </View>

      {/* 顶部信息卡：当前职级 → 目标职级、主派、当前争夺状态 */}
      <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E5E5', padding: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1, backgroundColor: '#F5F4F1', borderWidth: 1, borderColor: '#D9D9D9', padding: 8, alignItems: 'center' }}>
            <Text style={{ fontSize: 9, color: '#888' }}>当前职级</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D3B5E' }}>{RANK_CONFIG[save.rankLevel]?.name ?? '-'}</Text>
          </View>
          <Text style={{ fontSize: 16, color: '#C82829', fontWeight: '700' }}>→</Text>
          <View style={{ flex: 1, backgroundColor: '#FFF8F8', borderWidth: 1, borderColor: '#C82829', padding: 8, alignItems: 'center' }}>
            <Text style={{ fontSize: 9, color: '#C82829' }}>目标职级</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#C82829' }}>{RANK_CONFIG[save.rankLevel + 1]?.name ?? '已封顶'}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={{ fontSize: 10, color: '#666' }}>
            主派：{primary ? FACTION_LABEL[primary] : '无'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 10, color: '#666' }}>当前争夺：</Text>
            <View style={{ backgroundColor: statusColor + '18', borderWidth: 1, borderColor: statusColor + '55', paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ color: statusColor, fontSize: 10, fontWeight: '700' }}>{statusText}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 反馈条 */}
      {!!feedback && (
        <View style={{ backgroundColor: feedbackOk ? '#e8f5e9' : '#fff3e0', borderBottomWidth: 1, borderBottomColor: feedbackOk ? '#a5d6a7' : '#ffcc80', paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ color: feedbackOk ? '#1b5e20' : '#e65100', fontSize: 11, fontWeight: '600' }}>{feedback}</Text>
        </View>
      )}

      {/* Tab 栏 */}
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E5E5' }}>
        {TABS.map(t => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: tab === t.key ? '#C82829' : 'transparent' }}>
            <Text style={{ fontSize: 11, fontWeight: tab === t.key ? '700' : '400', color: tab === t.key ? '#C82829' : '#888' }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* 内容 */}
      {tab === 'factionAttack' ? <FactionAttackMap /> : null}
      {tab === 'personalContest' ? (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* v4 个人职位独立斗争卡片 */}
          {(() => {
            const cooldownRemaining = Math.max(0, (save.personalContestCooldownUntil ?? 0) - save.gameDays);
            const coalition = save.contestMode === 'coalition';
            const meritCost = Math.round(CONTEST_COSTS.personalContest.merit * (coalition ? PROVINCE_ATTACK_COST.coalitionMeritMultiplier : 1));
            const meritEnough = (save.meritPoints ?? 0) >= meritCost;
            const nextRank = save.rankLevel + 1;
            const targetPos = RANK_CONFIG[nextRank]?.name ?? '拟任职务';
            const gate = checkPromotionGate(save);
            const canFight = cooldownRemaining <= 0 && meritEnough && gate.allowed;
            const fightLabel = !gate.allowed
              ? `🚫 ${gate.blockReason}`
              : submitting
                ? '结算中…'
                : cooldownRemaining > 0
                  ? `冷却中（剩 ${cooldownRemaining} 天）`
                  : meritEnough
                    ? `发起个人职位战（-${meritCost} 功绩）`
                    : `功绩不足（需 ${meritCost}）`;
            return (
              <View style={{ backgroundColor: '#FFFCF0', borderWidth: 2, borderColor: '#B8860B', padding: 12, marginBottom: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#8A6D1A', marginBottom: 6 }}>⚔ 个人职位独立斗争（10%派系 + 90%个人）</Text>
                <Text style={{ fontSize: 11, color: '#666', lineHeight: 16, marginBottom: 8 }}>
                  目标：{targetPos}（第 {nextRank} 级）· 花费 {meritCost} 功绩 · 冷却 {CONTEST_COSTS.personalContest.cooldownDays} 天。{'\n'}
                  胜利即落档晋升（独立于派系席位战，不影响派系斗争回合）。{'\n'}
                  每个斗争周期（5 年）仅可晋升一次。
                </Text>
                {/* 争夺模式：正面 / 联合 */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Text style={{ fontSize: 11, color: '#8A6D1A', fontWeight: '600' }}>争夺模式：</Text>
                  <Pressable
                    onPress={() => updateGameSave({ contestMode: 'direct' })}
                    style={{ backgroundColor: !coalition ? '#B8860B' : 'transparent', borderWidth: 1, borderColor: '#B8860B', paddingHorizontal: 10, paddingVertical: 4 }}
                  >
                    <Text style={{ color: !coalition ? '#fff' : '#8A6D1A', fontSize: 11, fontWeight: '600' }}>正面</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => updateGameSave({ contestMode: 'coalition' })}
                    style={{ backgroundColor: coalition ? '#B8860B' : 'transparent', borderWidth: 1, borderColor: '#B8860B', paddingHorizontal: 10, paddingVertical: 4 }}
                  >
                    <Text style={{ color: coalition ? '#fff' : '#8A6D1A', fontSize: 11, fontWeight: '600' }}>联合</Text>
                  </Pressable>
                  <Text style={{ fontSize: 9, color: '#999', flex: 1 }}>
                    {coalition ? '对手难度 ×0.85，花费 ×1.5' : '标准正面争夺'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    if (!gate.allowed) {
                      showFeedback(`🚫 ${gate.blockReason}`, false);
                      return;
                    }
                    if (!canFight) {
                      showFeedback(
                        cooldownRemaining > 0
                          ? `冷却时间未到，请等待 ${cooldownRemaining} 天后再试`
                          : `功绩点数不足，需要 ${meritCost} 点功绩`,
                        false,
                      );
                      return;
                    }
                    handlePersonalContest(`rank_${nextRank}`, targetPos, nextRank, getRandomCityForRank(nextRank));
                  }}
                  disabled={submitting || !gate.allowed}
                  style={{ backgroundColor: canFight && !submitting ? '#B8860B' : '#ccc', paddingVertical: 11, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                    {fightLabel}
                  </Text>
                </Pressable>
              </View>
            );
          })()}

          {/* 当前争夺状态卡 */}
          {contestActive && contest ? (
            <View style={{ backgroundColor: '#fff', borderWidth: 2, borderColor: '#C82829', padding: 12, marginBottom: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#C82829', marginBottom: 8 }}>⚔ 进行中的争夺</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 }}>{contest.positionTitle}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#E8EDF5', padding: 8 }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#1565C0' }}>{contest.sYou}</Text>
                  <Text style={{ fontSize: 9, color: '#666' }}>我方 S_you</Text>
                </View>
                <Text style={{ fontSize: 14, color: '#999', fontWeight: '700' }}>vs</Text>
                <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#FFEBEE', padding: 8 }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#C62828' }}>{contest.sOpp}</Text>
                  <Text style={{ fontSize: 9, color: '#666' }}>对立派 S_opp</Text>
                </View>
              </View>
              <Text style={{ fontSize: 10, color: '#999', marginBottom: 8 }}>
                周期剩余 {cycleRemaining} 天 · 到周期边界未赢则争夺过期
              </Text>
              <Pressable
                onPress={handleResolveContest}
                disabled={submitting}
                style={{ backgroundColor: submitting ? '#ccc' : '#C82829', paddingVertical: 12, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{submitting ? '结算中…' : '立即结算争夺'}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ backgroundColor: '#FFF8F0', borderWidth: 1, borderColor: '#E8D9B0', padding: 12, marginBottom: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#B8860B', marginBottom: 4 }}>📌 晋升规则：职位争夺制</Text>
              <Text style={{ fontSize: 11, color: '#666', lineHeight: 17 }}>
                真正决定晋升的是：本派赢下目标职位争夺（S_you ≥ S_opp）。{'\n'}
                点击下方职位即发起争夺；派系整体胜可提前结算，派系整体败则必受惩罚。
              </Text>
            </View>
          )}

          {/* 目标职位选择器 */}
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D3B5E', letterSpacing: 1, marginBottom: 8 }}>
            下一职级段可选职位（{getTierOf(save.rankLevel + 1)} 段）
          </Text>
          {targetPositions.map(pos => {
            const isTarget = contest?.positionKey === pos.key;
            const gate = checkPromotionGate(save);
            const posDisabled = !!contestActive || submitting || !gate.allowed;
            return (
              <Pressable
                key={pos.key}
                onPress={() => {
                  if (!gate.allowed) {
                    showFeedback(`🚫 ${gate.blockReason}`, false);
                    return;
                  }
                  handlePersonalContest(pos.key, pos.title, save.rankLevel + 1, getRandomCityForRank(save.rankLevel + 1));
                }}
                disabled={posDisabled}
                style={{
                  backgroundColor: isTarget ? '#FFF8F8' : '#fff',
                  borderWidth: isTarget ? 2 : 1,
                  borderColor: isTarget ? '#C82829' : '#D9D9D9',
                  borderStyle: isTarget ? 'dashed' : 'solid',
                  padding: 12,
                  marginBottom: 8,
                  opacity: posDisabled ? 0.5 : 1,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A' }}>
                      {isTarget ? '🎯 ' : ''}{pos.title}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
                      {pos.tier} · {pos.organ}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#888', marginTop: 4, lineHeight: 15 }} numberOfLines={2}>
                      {pos.desc}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: posDisabled ? '#ECECEC' : '#E8EDF5', paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 10, color: posDisabled ? '#999' : '#1565C0', fontWeight: '600' }}>
                      {!gate.allowed ? '本轮已用' : '发起争夺 ›'}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}

          {/* 争夺历史 */}
          {(save.contestHistory ?? []).length > 0 && (
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 12, marginTop: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D3B5E', marginBottom: 8 }}>争夺历史</Text>
              {(save.contestHistory ?? []).slice(-5).reverse().map((h, i) => (
                <View key={h.id + i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
                  <View style={{ width: 36, height: 18, backgroundColor: h.result === 'won' ? '#E8F5E9' : h.result === 'expired' ? '#FFF3E0' : '#FFEBEE', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: h.result === 'won' ? '#2E7D32' : h.result === 'expired' ? '#E65100' : '#C62828' }}>
                      {h.result === 'won' ? '胜' : h.result === 'expired' ? '过期' : '败'}
                    </Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 10, color: '#555' }}>
                    {h.positionTitle} · S:{h.sYou} vs {h.sOpp} · 第 {h.day} 天
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      ) : null}
      {tab === 'conditions' ? <ConditionsTab gate={gate} /> : null}
      {tab === 'records' ? <RecordsTab /> : null}

      {/* 位置棋盘弹窗 */}
      <PositionBoard
        visible={boardVisible}
        onClose={() => setBoardVisible(false)}
        save={save}
        targetSeatKey={contest?.positionKey ?? null}
      />
    </View>
  );
}
```

<a id="srcappappprovinceappointmenttsx"></a>
## `src/app/(app)/province-appointment.tsx`

```tsx
// 省管干部任免页 — rank10（副省级）及以上
// 规则：省委常委会5人逐一表决，省委书记享有一锤定音权，NPC委员可发起提案
// 表决结果影响各委员与玩家的关系值（±3）
import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';

// ── 类型 ─────────────────────────────────────────────────────────────
type VoteStance = '赞成' | '反对' | '弃权';
type VoteStatus = 'pending' | 'deliberating' | 'approved' | 'rejected';

interface CommitteeMember {
  id: string;
  name: string;
  title: string;
  faction: string;
  stance: VoteStance;
  revealed: boolean;
}

interface AppointProposal {
  id: string;
  cadreId: string;
  cadreName: string;
  cadreFaction: string;
  proposedPost: string;
  proposedOrg: string;
  type: '任命' | '免职' | '调任' | '晋升';
  voteStatus: VoteStatus;
  members: CommitteeMember[];
  voteFor: number;
  voteAgainst: number;
  voteAbstain: number;
  createdDay: number;
  proposedBy: 'player' | string;
  isTopOverride: boolean;
}

interface ProvCadre {
  id: string;
  name: string;
  currentPost: string;
  currentOrg: string;
  age: number;
  faction: string;
  ability: number;
}

// ── 常量 ─────────────────────────────────────────────────────────────
const FACTIONS = ['改革派', '务实派', '共青团系', '技术官僚', '地方系'];
const FACTION_COLORS: Record<string, string> = {
  '改革派': '#2B4B6F', '务实派': '#607d8b', '共青团系': '#E53935',
  '技术官僚': '#1565C0', '地方系': '#4E342E',
};
const FACTION_OPPOSE: Record<string, string[]> = {
  '改革派': ['地方系'], '地方系': ['改革派'],
  '共青团系': ['技术官僚'], '技术官僚': ['共青团系'], '务实派': [],
};

// 省委常委会5人职位
const PROV_TITLES = [
  '省委书记', '省长', '专职省委副书记', '省委组织部长', '省纪委书记',
];

// 省管干部池（市级职位）
const PROV_CADRE_POOL = [
  { post: '市委书记', orgs: ['某市'] },
  { post: '市长', orgs: ['某市'] },
  { post: '市委副书记', orgs: ['某市'] },
  { post: '常务副市长', orgs: ['某市'] },
  { post: '市委组织部长', orgs: ['某市'] },
  { post: '市委宣传部长', orgs: ['某市'] },
  { post: '市纪委书记', orgs: ['某市'] },
  { post: '市委政法委书记', orgs: ['某市'] },
];
const POST_OPTIONS = PROV_CADRE_POOL.map(p => p.post);

const CITY_NAMES = [
  '春江市', '汉阳市', '晋州市', '渭南市', '洛泉市',
  '定远市', '涪陵市', '龙川市', '通明市', '岳麓市',
];

// NPC提案模板
const NPC_TMPL = [
  { post: '市委书记', org: '春江市', type: '调任' as const },
  { post: '常务副市长', org: '汉阳市', type: '任命' as const },
];

// ── 哈希工具 ──────────────────────────────────────────────────────────
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
  return h;
}

// ── 构建省管干部候选人列表 ─────────────────────────────────────────
function buildProvCadres(saveId: string): ProvCadre[] {
  const surnames = ['张', '王', '李', '赵', '陈', '刘', '杨', '黄', '周', '吴', '徐', '孙'];
  const given = ['文博', '建国', '志远', '晓明', '宏伟', '峰', '勇', '磊', '洁', '青'];
  return Array.from({ length: 14 }, (_, i) => {
    const h = hashStr(saveId + 'prov_cadre' + i);
    const name = (surnames[h % surnames.length] ?? '王') + (given[(h >> 4) % given.length] ?? '博');
    const postIdx = h % PROV_CADRE_POOL.length;
    const cityIdx = (h >> 2) % CITY_NAMES.length;
    return {
      id: `pc${i}`,
      name,
      currentPost: PROV_CADRE_POOL[postIdx]?.post ?? '副市长',
      currentOrg: CITY_NAMES[cityIdx] ?? '某市',
      age: 40 + (h % 15),
      faction: FACTIONS[h % FACTIONS.length] ?? '务实派',
      ability: 65 + (h % 30),
    };
  });
}

// ── 构建省委常委会5人 ────────────────────────────────────────────────
function buildProvCommittee(saveId: string): CommitteeMember[] {
  const surnames2 = ['钱', '孙', '周', '吴', '郑', '王', '冯', '陈'];
  const given2 = ['强', '明', '勇', '志', '海', '浩', '峰', '博'];
  return PROV_TITLES.map((title, i) => {
    const h = hashStr(saveId + title + i + 'prov');
    const name = (surnames2[h % surnames2.length] ?? '钱') + (given2[(h >> 4) % given2.length] ?? '明');
    const faction = FACTIONS[h % FACTIONS.length] ?? '务实派';
    return { id: `pcm_${i}`, name, title, faction, stance: '弃权', revealed: false };
  });
}

// ── 确定性投票立场 ────────────────────────────────────────────────────
function calcStance(memberId: string, memberFaction: string, candidateFaction: string, saveId: string): VoteStance {
  const h = hashStr(memberId + saveId + candidateFaction + 'prov');
  let fScore: number;
  if (memberFaction === candidateFaction) fScore = 80 + (h % 18);
  else if ((FACTION_OPPOSE[memberFaction] ?? []).includes(candidateFaction)) fScore = 10 + (h % 18);
  else fScore = 42 + (h % 28);
  const relScore = 32 + (hashStr(saveId + memberId + 'rel') % 55);
  const combined = Math.round(fScore * 0.6 + relScore * 0.4);
  if (combined >= 62) return '赞成';
  if (combined >= 40) return '弃权';
  return '反对';
}

// ── 生成NPC提案 ───────────────────────────────────────────────────────
function buildNpcProposals(saveId: string, gameDays: number, existCount: number): AppointProposal[] {
  if (existCount > 0) return [];
  const cadres = buildProvCadres(saveId);
  return NPC_TMPL.slice(0, 2).map((tmpl, i) => {
    const cadre = cadres[i] ?? cadres[0]!;
    const committee = buildProvCommittee(saveId).map(m => ({
      ...m,
      stance: calcStance(m.id, m.faction, cadre.faction, saveId),
    }));
    return {
      id: `npc_p_${gameDays}_${i}`,
      cadreId: cadre.id,
      cadreName: cadre.name,
      cadreFaction: cadre.faction,
      proposedPost: tmpl.post,
      proposedOrg: tmpl.org,
      type: tmpl.type,
      voteStatus: 'pending' as VoteStatus,
      members: committee,
      voteFor: 0, voteAgainst: 0, voteAbstain: 0,
      createdDay: gameDays,
      proposedBy: committee[1]?.name ?? '省长',
      isTopOverride: false,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════
export default function ProvinceAppointmentScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [tab, setTab] = useState<'cadres' | 'propose' | 'vote'>('cadres');
  const [proposals, setProposals] = useState<AppointProposal[]>([]);
  const [feedback, setFeedback] = useState('');
  const [feedbackOk, setFeedbackOk] = useState(true);
  const [selectedCadre, setSelectedCadre] = useState<ProvCadre | null>(null);
  const [propType, setPropType] = useState<AppointProposal['type']>('调任');
  const [propPost, setPropPost] = useState('');
  const [propOrg, setPropOrg] = useState('');
  const [deliberatingId, setDeliberatingId] = useState<string | null>(null);
  const revealTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const npcInit = useRef(false);

  useEffect(() => {
    if (!save) return;
    if (!npcInit.current) {
      npcInit.current = true;
      const props = buildNpcProposals(save.id, save.gameDays, proposals.length);
      if (props.length > 0) {
        setProposals(prev => [...prev, ...props]);
        showFeedback(`📩 省委常委发来${props.length}份干部任免提案`);
        setTab('vote');
      }
    }
  }, []);

  const showFeedback = (msg: string, ok = true) => {
    setFeedback(msg);
    setFeedbackOk(ok);
    setTimeout(() => setFeedback(''), 3800);
  };

  if (!save) return null;
  if (save.rankLevel < 10) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F4F1', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <StatusBar style="light" backgroundColor="#7B0026" />
        <Text style={{ fontSize: 30, marginBottom: 16 }}>🔒</Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#7B0026', marginBottom: 8 }}>权限不足</Text>
        <Text style={{ fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20 }}>省管干部任免权限仅开放给副省级（10级）及以上职位</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#7B0026' }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>返回</Text>
        </Pressable>
      </View>
    );
  }

  const cadres = buildProvCadres(save.id);
  const isProvSecretary = save.rankLevel >= 11;  // 省委书记享有一锤定音权

  const handleSubmitProposal = () => {
    if (!selectedCadre) { showFeedback('请先选择被任免干部', false); return; }
    if (!propPost.trim()) { showFeedback('请填写拟任职务', false); return; }
    const committee = buildProvCommittee(save.id).map(m => ({
      ...m,
      stance: calcStance(m.id, m.faction, selectedCadre.faction, save.id),
    }));
    const newProp: AppointProposal = {
      id: `pp_${Date.now()}`,
      cadreId: selectedCadre.id,
      cadreName: selectedCadre.name,
      cadreFaction: selectedCadre.faction,
      proposedPost: propPost.trim(),
      proposedOrg: propOrg.trim() || selectedCadre.currentOrg,
      type: propType,
      voteStatus: 'pending',
      members: committee,
      voteFor: 0, voteAgainst: 0, voteAbstain: 0,
      createdDay: save.gameDays,
      proposedBy: 'player',
      isTopOverride: false,
    };
    setProposals(prev => [newProp, ...prev]);
    setSelectedCadre(null);
    setPropPost('');
    setPropOrg('');
    showFeedback('✅ 提案已提交，请在表决页召开省委常委会');
    setTab('vote');
  };

  // 逐票揭示
  const startDeliberate = (propId: string) => {
    setDeliberatingId(propId);
    setProposals(prev => prev.map(p => p.id === propId ? { ...p, voteStatus: 'deliberating' } : p));
    let idx = 0;
    const prop = proposals.find(p => p.id === propId);
    if (!prop) return;
    revealTimer.current = setInterval(() => {
      idx++;
      setProposals(prev => prev.map(p =>
        p.id === propId ? { ...p, members: p.members.map((m, i) => i < idx ? { ...m, revealed: true } : m) } : p,
      ));
      if (idx >= prop.members.length) {
        if (revealTimer.current) clearInterval(revealTimer.current);
        finalizeVote(propId);
      }
    }, 900);
  };

  const finalizeVote = async (propId: string) => {
    setDeliberatingId(null);
    setProposals(prev => prev.map(p => {
      if (p.id !== propId) return p;
      const voteFor = p.members.filter(m => m.stance === '赞成').length;
      const voteAgainst = p.members.filter(m => m.stance === '反对').length;
      const voteAbstain = p.members.filter(m => m.stance === '弃权').length;
      const quorum = Math.floor(p.members.length / 2) + 1; // 3/5
      return { ...p, voteFor, voteAgainst, voteAbstain, voteStatus: voteFor >= quorum ? 'approved' : 'rejected' };
    }));
    const prop = proposals.find(p => p.id === propId);
    if (!prop) return;
    const voteFor = prop.members.filter(m => m.stance === '赞成').length;
    if (voteFor >= 3) {
      await updateGameSave({ meritPoints: (save.meritPoints ?? 0) + 20 });
      showFeedback(`✅ 省委常委会${voteFor}:${prop.members.length - voteFor}通过，政绩+20`);
    } else {
      showFeedback(`❌ 省委常委会未通过（${voteFor}票赞成），建议改善与常委的关系`, false);
    }
  };

  const handleTopOverride = async (propId: string, forceApprove: boolean) => {
    if (revealTimer.current) clearInterval(revealTimer.current);
    setDeliberatingId(null);
    setProposals(prev => prev.map(p =>
      p.id === propId ? { ...p, voteStatus: forceApprove ? 'approved' : 'rejected', isTopOverride: true } : p,
    ));
    if (forceApprove) {
      await updateGameSave({ meritPoints: (save.meritPoints ?? 0) + 28 });
      showFeedback('⚡ 省委书记行使一锤定音权，任命强制通过，政绩+28');
    } else {
      showFeedback('⚡ 省委书记行使否决权，提案驳回');
    }
  };

  const pendingProps  = proposals.filter(p => p.voteStatus === 'pending');
  const activeProps   = proposals.filter(p => p.voteStatus === 'deliberating');
  const decidedProps  = proposals.filter(p => p.voteStatus === 'approved' || p.voteStatus === 'rejected');

  return (
    <View style={{ flex: 1, backgroundColor: '#0E100C' }}>
      <StatusBar style="light" backgroundColor="#1C2A14" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#1C2A14', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: '#7AAA5A', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#7AAA5A', fontSize: 9, letterSpacing: 3 }}>省委组织部 · 省管干部</Text>
            <Text style={{ color: '#D0F0B0', fontSize: 16, fontWeight: '700' }}>🏛️ 省管干部任免</Text>
            <Text style={{ color: '#7AAA5A', fontSize: 10 }}>
              {isProvSecretary ? '省委书记 · 一锤定音权' : '省级领导 · 提名建议权'} · 省委常委会（5人表决）
            </Text>
          </View>
          {isProvSecretary && (
            <View style={{ backgroundColor: '#1A3A0A', borderWidth: 1, borderColor: '#4A8A2A', paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: '#88DD88', fontSize: 9, fontWeight: '700' }}>⚡ 一锤定音</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {([
            { key: 'cadres',  label: '👥 干部候选' },
            { key: 'propose', label: '✍️ 发起提案' },
            { key: 'vote',    label: `🗳️ 常委表决（${pendingProps.length + activeProps.length}）` },
          ] as const).map(t => (
            <Pressable key={t.key} onPress={() => setTab(t.key)}
              style={{ flex: 1, paddingVertical: 7, alignItems: 'center', backgroundColor: tab === t.key ? '#2A4A1A' : 'rgba(255,255,255,0.08)' }}
            >
              <Text style={{ color: tab === t.key ? '#D0F0B0' : '#7AAA5A', fontSize: 9, fontWeight: tab === t.key ? '700' : '400' }}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 反馈条 */}
      {feedback ? (
        <View style={{ backgroundColor: feedbackOk ? '#0D2A0D' : '#2A0D0D', padding: 10 }}>
          <Text style={{ color: feedbackOk ? '#5AE87A' : '#FF6666', fontSize: 12, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      {/* ══ 干部候选 ══ */}
      {tab === 'cadres' && (
        <FlatList
          data={cadres}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 12, gap: 8 }}
          ListHeaderComponent={
            <View style={{ backgroundColor: '#1C2A14', borderWidth: 1, borderColor: '#2A4A1A', padding: 10, marginBottom: 4 }}>
              <Text style={{ fontSize: 10, color: '#A0D080', fontWeight: '700' }}>
                省管干部候选池：{cadres.length}人 · 含各市主要领导及候补干部
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const fColor = FACTION_COLORS[item.faction] ?? '#888';
            return (
              <Pressable
                onPress={() => { setSelectedCadre(item); setTab('propose'); }}
                style={{ backgroundColor: '#141E0E', borderWidth: 1, borderColor: '#2A3A20', padding: 12 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 44, height: 44, backgroundColor: '#1A2A14', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#3A6A2A' }}>
                    <Text style={{ fontSize: 22 }}>🏛️</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#D0F0B0' }}>{item.name}</Text>
                    <Text style={{ fontSize: 11, color: '#8AAA6A', marginTop: 1 }}>{item.currentPost} · {item.currentOrg}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                      <View style={{ backgroundColor: fColor + '22', borderWidth: 1, borderColor: fColor, paddingHorizontal: 5, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 9, color: fColor }}>{item.faction}</Text>
                      </View>
                      <Text style={{ fontSize: 9, color: '#8AAA6A' }}>{item.age}岁 · 能力{item.ability}</Text>
                    </View>
                  </View>
                  <Text style={{ color: '#5AAA3A', fontSize: 12 }}>提名 ›</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* ══ 发起提案 ══ */}
      {tab === 'propose' && (
        <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }}>
          {/* 被任免干部 */}
          <View style={{ backgroundColor: '#141E0E', borderWidth: 1, borderColor: '#2A4A1A', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#5AAA3A', fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>被任免干部</Text>
            {selectedCadre ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 48, height: 48, backgroundColor: '#1A2A14', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#3A6A2A' }}>
                  <Text style={{ fontSize: 24 }}>🏛️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#D0F0B0' }}>{selectedCadre.name}</Text>
                  <Text style={{ fontSize: 11, color: '#8AAA6A' }}>{selectedCadre.currentPost} · {selectedCadre.currentOrg}</Text>
                  <Text style={{ fontSize: 10, color: '#5AAA3A' }}>{selectedCadre.faction} · {selectedCadre.age}岁 · 能力{selectedCadre.ability}</Text>
                </View>
                <Pressable onPress={() => { setSelectedCadre(null); setTab('cadres'); }}>
                  <Text style={{ color: '#CC5555', fontSize: 12 }}>重选</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setTab('cadres')} style={{ padding: 14, borderWidth: 1, borderColor: '#2A4A1A', alignItems: 'center', backgroundColor: '#0E1A08' }}>
                <Text style={{ color: '#5AAA3A', fontSize: 12, fontWeight: '600' }}>+ 从省管干部候选池选择</Text>
              </Pressable>
            )}
          </View>

          {/* 任免类型 */}
          <View style={{ backgroundColor: '#141E0E', borderWidth: 1, borderColor: '#2A4A1A', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#5AAA3A', fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>任免类型</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(['任命', '免职', '调任', '晋升'] as const).map(t => (
                <Pressable key={t} onPress={() => setPropType(t)}
                  style={{ paddingHorizontal: 16, paddingVertical: 8, borderWidth: 2, borderColor: propType === t ? '#5AAA3A' : '#2A3A20', backgroundColor: propType === t ? '#1A3A0A' : '#0E1A08' }}
                >
                  <Text style={{ color: propType === t ? '#D0F0B0' : '#5A7A3A', fontWeight: propType === t ? '700' : '400', fontSize: 12 }}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* 拟任职务 */}
          <View style={{ backgroundColor: '#141E0E', borderWidth: 1, borderColor: '#2A4A1A', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#5AAA3A', fontWeight: '700', letterSpacing: 2, marginBottom: 8 }}>拟任职务</Text>
            <TextInput value={propPost} onChangeText={setPropPost} placeholder="请填写拟任职务…" placeholderTextColor="#3A5A2A"
              style={{ borderWidth: 1, borderColor: '#2A4A1A', padding: 10, fontSize: 13, color: '#D0F0B0', marginBottom: 8, backgroundColor: '#0E1A08' }}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {POST_OPTIONS.map(p => (
                <Pressable key={p} onPress={() => setPropPost(p)} style={{ backgroundColor: '#1A2A14', paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#3A5A2A' }}>
                  <Text style={{ fontSize: 10, color: '#A0D080' }}>{p}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* 拟任单位 */}
          <View style={{ backgroundColor: '#141E0E', borderWidth: 1, borderColor: '#2A4A1A', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#5AAA3A', fontWeight: '700', letterSpacing: 2, marginBottom: 8 }}>拟任单位（可选）</Text>
            <TextInput value={propOrg} onChangeText={setPropOrg} placeholder="留空则保留原单位" placeholderTextColor="#3A5A2A"
              style={{ borderWidth: 1, borderColor: '#2A4A1A', padding: 10, fontSize: 13, color: '#D0F0B0', backgroundColor: '#0E1A08' }}
            />
          </View>

          <Pressable onPress={handleSubmitProposal}
            style={{ backgroundColor: selectedCadre && propPost.trim() ? '#2A4A1A' : '#1A2A10', paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: selectedCadre && propPost.trim() ? '#5AAA3A' : '#2A3A20' }}
          >
            <Text style={{ color: selectedCadre && propPost.trim() ? '#D0F0B0' : '#3A5A2A', fontWeight: '700', fontSize: 14 }}>
              📋 提交提案，提交省委常委会表决
            </Text>
          </Pressable>
          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* ══ 省委常委会表决 ══ */}
      {tab === 'vote' && (
        <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>
          {[...pendingProps, ...activeProps].map(p => {
            const isDeliberating = deliberatingId === p.id;
            return (
              <View key={p.id} style={{ backgroundColor: '#141E0E', borderWidth: 1, borderColor: '#3A6A2A', padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <View style={{ backgroundColor: p.proposedBy !== 'player' ? '#1A2A14' : '#141E0E', borderWidth: 1, borderColor: p.proposedBy !== 'player' ? '#5AAA3A' : '#3A6A2A', paddingHorizontal: 7, paddingVertical: 2 }}>
                    <Text style={{ color: p.proposedBy !== 'player' ? '#A0D080' : '#7AAA5A', fontSize: 9, fontWeight: '700' }}>
                      {p.proposedBy !== 'player' ? `📩 ${p.proposedBy}发起` : '✍️ 您发起'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#D0F0B0', flex: 1 }}>{p.cadreName}</Text>
                  <Text style={{ fontSize: 9, color: '#5A7A3A' }}>第{p.createdDay}天</Text>
                </View>
                <View style={{ backgroundColor: '#0E1A08', padding: 8, marginBottom: 8 }}>
                  <Text style={{ fontSize: 10, color: '#8AAA6A' }}>
                    {p.type}拟任：<Text style={{ color: '#A0D080', fontWeight: '600' }}>{p.proposedPost}</Text> · {p.proposedOrg}
                  </Text>
                </View>

                {/* 逐票揭示 */}
                {(isDeliberating || p.voteStatus === 'deliberating') && (
                  <View style={{ marginBottom: 10, gap: 4 }}>
                    <Text style={{ fontSize: 10, color: '#5AAA3A', fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>🗳️ 省委常委逐一表决（共5票，需3票通过）</Text>
                    {p.members.map((m, idx) => {
                      const sc = m.stance === '赞成' ? '#3A7A3A' : m.stance === '反对' ? '#7A3A3A' : '#4A4A4A';
                      const sb = m.stance === '赞成' ? '#0D2A0D' : m.stance === '反对' ? '#2A0D0D' : '#1A1A1A';
                      const fC = FACTION_COLORS[m.faction] ?? '#888';
                      return (
                        <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, opacity: m.revealed ? 1 : 0.3, backgroundColor: sb, padding: 7, borderWidth: 1, borderColor: sc }}>
                          <Text style={{ width: 14, color: '#5A7A3A', fontSize: 9 }}>{idx + 1}</Text>
                          <Text style={{ flex: 1, color: '#D0F0B0', fontSize: 11, fontWeight: '700' }}>{m.name}</Text>
                          <Text style={{ color: fC, fontSize: 9 }}>{m.faction}</Text>
                          <Text style={{ fontSize: 9, color: '#6A8A5A' }}>{m.title}</Text>
                          {m.revealed ? (
                            <View style={{ backgroundColor: sc + '33', borderWidth: 1, borderColor: sc, paddingHorizontal: 8, paddingVertical: 2, minWidth: 36, alignItems: 'center' }}>
                              <Text style={{ color: m.stance === '赞成' ? '#66EE66' : m.stance === '反对' ? '#EE6666' : '#AAAAAA', fontSize: 11, fontWeight: '700' }}>{m.stance}</Text>
                            </View>
                          ) : (
                            <View style={{ backgroundColor: '#2A2A2A', borderWidth: 1, borderColor: '#3A3A3A', paddingHorizontal: 8, paddingVertical: 2, minWidth: 36, alignItems: 'center' }}>
                              <Text style={{ color: '#444', fontSize: 11 }}>…</Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}

                {p.voteStatus === 'pending' && (
                  <View style={{ gap: 8 }}>
                    <Pressable onPress={() => startDeliberate(p.id)}
                      style={{ backgroundColor: '#2A4A1A', paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#5AAA3A' }}
                    >
                      <Text style={{ color: '#D0F0B0', fontWeight: '700', fontSize: 13 }}>🗳️ 召开省委常委会·逐一表决</Text>
                    </Pressable>
                    {isProvSecretary && (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable onPress={() => void handleTopOverride(p.id, true)}
                          style={{ flex: 1, backgroundColor: '#1A3A1A', paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#3A9A3A' }}
                        >
                          <Text style={{ color: '#88EE88', fontWeight: '700', fontSize: 11 }}>⚡ 书记一锤定音</Text>
                        </Pressable>
                        <Pressable onPress={() => void handleTopOverride(p.id, false)}
                          style={{ flex: 1, backgroundColor: '#3A1A1A', paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#8A3A3A' }}
                        >
                          <Text style={{ color: '#EE8888', fontWeight: '700', fontSize: 11 }}>⚡ 书记一票否决</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                )}
                {p.voteStatus === 'deliberating' && !isDeliberating && (
                  <View style={{ backgroundColor: '#0E1A08', padding: 8, alignItems: 'center' }}>
                    <Text style={{ color: '#5AAA3A', fontSize: 11 }}>⏳ 表决进行中…</Text>
                  </View>
                )}
              </View>
            );
          })}

          {/* 历史 */}
          {decidedProps.length > 0 && (
            <>
              <View style={{ borderBottomWidth: 1, borderBottomColor: '#2A4A1A', paddingBottom: 4 }}>
                <Text style={{ fontSize: 10, color: '#5A7A3A', fontWeight: '700', letterSpacing: 2 }}>历史表决记录</Text>
              </View>
              {decidedProps.map(p => {
                const ok = p.voteStatus === 'approved';
                return (
                  <View key={p.id} style={{ backgroundColor: '#141E0E', borderWidth: 1, borderColor: ok ? '#1A5C1A' : '#5C1A1A', padding: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Text style={{ fontSize: 15 }}>{p.isTopOverride ? '⚡' : ok ? '✅' : '❌'}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#D0F0B0', flex: 1 }}>{p.cadreName}</Text>
                      <View style={{ backgroundColor: ok ? '#1A5C1A' : '#5C1A1A', paddingHorizontal: 6, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 9, color: ok ? '#5AE87A' : '#FF6666', fontWeight: '700' }}>
                          {p.isTopOverride ? (ok ? '书记一锤定音' : '书记否决') : (ok ? '通过' : '否决')}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: '#8AAA6A' }}>{p.type}：{p.proposedPost} · {p.proposedOrg}</Text>
                    {!p.isTopOverride && (
                      <Text style={{ fontSize: 10, color: '#5A7A3A', marginTop: 4 }}>
                        {p.voteFor}票赞成 · {p.voteAgainst}票反对 · {p.voteAbstain}票弃权
                        {ok ? `  ·  赞成委员关系+3` : `  ·  建议改善与常委关系`}
                      </Text>
                    )}
                  </View>
                );
              })}
            </>
          )}

          {proposals.length === 0 && (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🏛️</Text>
              <Text style={{ fontSize: 14, color: '#5A7A3A', textAlign: 'center' }}>暂无省管干部任免提案</Text>
              <Text style={{ fontSize: 11, color: '#3A5A2A', marginTop: 4 }}>在「发起提案」页提交，或等待省委委员发起</Text>
            </View>
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </View>
  );
}
```

<a id="srcappappprovincesmanagetsx"></a>
## `src/app/(app)/provinces-manage.tsx`

```tsx
// 各省直辖市管理页 — rank14 国政院院理专属
// 功能：全国31个省/直辖市/自治区 GDP/税收/民生/人口/走访
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { formatMoney } from '@/types/game';

// 省级数据（参考2023年各省GDP/税收/民生现实数据，游戏单位：亿元）
interface Province {
  id: string;
  name: string;
  abbr: string;
  type: '省份' | '直辖市' | '自治区' | '特别行政区';
  gdp: number;        // GDP（亿元）
  taxRevenue: number; // 税收（亿元）
  livelihood: number; // 民生指数（0-100）
  population: number; // 人口（万人）
  secretary: string;  // 省委书记
  governor: string;   // 省长/市长
  icon: string;
}

const PROVINCES: Province[] = [
  { id: 'gd', name: '广东省', abbr: '粤', type: '省份', gdp: 135673, taxRevenue: 19823, livelihood: 78, population: 12709, secretary: '黄坤明', governor: '王伟中', icon: '🌺' },
  { id: 'js', name: '江苏省', abbr: '苏', type: '省份', gdp: 122875, taxRevenue: 16588, livelihood: 82, population: 8515,  secretary: '信长星', governor: '许昆林', icon: '🌾' },
  { id: 'sd', name: '山东省', abbr: '鲁', type: '省份', gdp: 92069,  taxRevenue: 10253, livelihood: 75, population: 10162, secretary: '林武',  governor: '周乃翔', icon: '⛵' },
  { id: 'zj', name: '浙江省', abbr: '浙', type: '省份', gdp: 82553,  taxRevenue: 12987, livelihood: 85, population: 6577,  secretary: '易炼红', governor: '王浩',   icon: '🍵' },
  { id: 'sh', name: '上海市', abbr: '沪', type: '直辖市', gdp: 47218, taxRevenue: 11233, livelihood: 90, population: 2489,  secretary: '陈吉宁', governor: '龚正',   icon: '🏙️' },
  { id: 'he', name: '河南省', abbr: '豫', type: '省份', gdp: 61345,  taxRevenue: 7821,  livelihood: 68, population: 9872,  secretary: '楼阳生', governor: '王凯',   icon: '🌽' },
  { id: 'sc', name: '四川省', abbr: '川', type: '省份', gdp: 60132,  taxRevenue: 8765,  livelihood: 73, population: 8374,  secretary: '王晓晖', governor: '黄强',   icon: '🐼' },
  { id: 'hb', name: '湖北省', abbr: '鄂', type: '省份', gdp: 55803,  taxRevenue: 7234,  livelihood: 74, population: 5775,  secretary: '王蒙徽', governor: '王忠林', icon: '🌸' },
  { id: 'fx', name: '福建省', abbr: '闽', type: '省份', gdp: 53109,  taxRevenue: 7123,  livelihood: 80, population: 4187,  secretary: '周祖翼', governor: '赵龙',   icon: '🌊' },
  { id: 'bj', name: '北京市', abbr: '京', type: '直辖市', gdp: 43760, taxRevenue: 13542, livelihood: 88, population: 2185,  secretary: '尹力',   governor: '殷勇',   icon: '🏯' },
  { id: 'hn', name: '湖南省', abbr: '湘', type: '省份', gdp: 50012,  taxRevenue: 6543,  livelihood: 72, population: 6604,  secretary: '沈晓明', governor: '毛伟明', icon: '🏔️' },
  { id: 'ah', name: '安徽省', abbr: '皖', type: '省份', gdp: 47443,  taxRevenue: 6012,  livelihood: 71, population: 6213,  secretary: '梁言顺', governor: '王清宪', icon: '🌿' },
  { id: 'sx', name: '陕西省', abbr: '陕', type: '省份', gdp: 33786,  taxRevenue: 4523,  livelihood: 70, population: 3952,  secretary: '赵一德', governor: '赵刚',   icon: '🏺' },
  { id: 'gz', name: '贵州省', abbr: '黔', type: '省份', gdp: 20164,  taxRevenue: 2765,  livelihood: 65, population: 3856,  secretary: '徐麟',   governor: '李炳军', icon: '🌄' },
  { id: 'yn', name: '云南省', abbr: '滇', type: '省份', gdp: 29514,  taxRevenue: 3987,  livelihood: 67, population: 4694,  secretary: '王宁',   governor: '王予波', icon: '🌻' },
  { id: 'jx', name: '江西省', abbr: '赣', type: '省份', gdp: 32200,  taxRevenue: 4012,  livelihood: 70, population: 4517,  secretary: '尹弘',   governor: '叶建春', icon: '🌹' },
  { id: 'cq', name: '重庆市', abbr: '渝', type: '直辖市', gdp: 29129, taxRevenue: 3965,  livelihood: 76, population: 3213,  secretary: '袁家军', governor: '胡衡华', icon: '🌉' },
  { id: 'ln', name: '辽宁省', abbr: '辽', type: '省份', gdp: 30423,  taxRevenue: 3876,  livelihood: 68, population: 4197,  secretary: '郝鹏',   governor: '李乐成', icon: '❄️' },
  { id: 'hei', name: '黑龙江省', abbr: '黑', type: '省份', gdp: 15883, taxRevenue: 1876, livelihood: 62, population: 3099, secretary: '许勤',   governor: '梁惠玲', icon: '🌲' },
  { id: 'jl', name: '吉林省', abbr: '吉', type: '省份', gdp: 13092,  taxRevenue: 1654,  livelihood: 63, population: 2375,  secretary: '景俊海', governor: '胡玉亭', icon: '🌾' },
  { id: 'shanxi', name: '山西省', abbr: '晋', type: '省份', gdp: 25643, taxRevenue: 4321, livelihood: 67, population: 3491, secretary: '任振鹤', governor: '金湘军', icon: '⛏️' },
  { id: 'xj', name: '新疆维吾尔自治区', abbr: '新', type: '自治区', gdp: 17717, taxRevenue: 2354, livelihood: 64, population: 2585, secretary: '马兴瑞', governor: '艾尔肯', icon: '🏜️' },
  { id: 'nm', name: '内蒙古自治区', abbr: '内蒙', type: '自治区', gdp: 24627, taxRevenue: 3198, livelihood: 66, population: 2400, secretary: '孙绍骋', governor: '王莉霞', icon: '🐎' },
  { id: 'gs', name: '甘肃省', abbr: '甘', type: '省份', gdp: 11201,  taxRevenue: 1543,  livelihood: 59, population: 2492,  secretary: '胡昌升', governor: '刘小明', icon: '🌵' },
  { id: 'hainan', name: '海南省', abbr: '琼', type: '省份', gdp: 7553,  taxRevenue: 987,   livelihood: 74, population: 1027,  secretary: '冯飞',   governor: '刘小明', icon: '🌴' },
  { id: 'qh', name: '青海省', abbr: '青', type: '省份', gdp: 3799,   taxRevenue: 567,   livelihood: 60, population: 592,   secretary: '陈刚',   governor: '吴晓军', icon: '🦅' },
  { id: 'nx', name: '宁夏回族自治区', abbr: '宁', type: '自治区', gdp: 5315, taxRevenue: 789, livelihood: 62, population: 725, secretary: '张雨浦', governor: '张超超', icon: '🕌' },
  { id: 'xz', name: '西藏自治区', abbr: '藏', type: '自治区', gdp: 2392, taxRevenue: 289, livelihood: 58, population: 364, secretary: '王君正', governor: '严金海', icon: '🏔️' },
  { id: 'gx', name: '广西壮族自治区', abbr: '桂', type: '自治区', gdp: 26898, taxRevenue: 3456, livelihood: 68, population: 5045, secretary: '刘宁', governor: '蓝天立', icon: '🌊' },
  { id: 'tj', name: '天津市', abbr: '津', type: '直辖市', gdp: 16311, taxRevenue: 2876, livelihood: 80, population: 1386, secretary: '陈敏尔', governor: '张工', icon: '⚓' },
  { id: 'hebei', name: '河北省', abbr: '冀', type: '省份', gdp: 42370, taxRevenue: 5012, livelihood: 70, population: 7447, secretary: '倪岳峰', governor: '王正谱', icon: '🌾' },
];

const TYPE_COLORS: Record<string, string> = {
  '省份': '#2B4B6F', '直辖市': '#C82829', '自治区': '#2a7a3b', '特别行政区': '#7B5E2A',
};

// 走访任务
const VISIT_TASKS = [
  { id: 'v1', label: '经济调研考察', desc: '深入企业和产业园区，了解发展实情', meritReward: 20, gdpBonus: 3,  cost: 50000 },
  { id: 'v2', label: '民生专项慰问', desc: '走访基层群众，了解民生诉求',       meritReward: 15, livBonus: 4,   cost: 30000 },
  { id: 'v3', label: '重大项目督导', desc: '现场督导重大项目推进情况',         meritReward: 25, gdpBonus: 5,  cost: 80000 },
  { id: 'v4', label: '干部廉政谈话', desc: '与省委班子开展廉政专题谈话',       meritReward: 12, intBonus: 3,   cost: 20000 },
];

export default function ProvincesManageScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
  const [sortBy, setSortBy] = useState<'gdp' | 'taxRevenue' | 'livelihood' | 'population'>('gdp');
  const [typeFilter, setTypeFilter] = useState<string>('全部');
  const [acting, setActing] = useState(false);
  const [result, setResult] = useState('');
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());

  if (!save || save.rankLevel < 14) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F4F1', padding: 24 }}>
        <Text style={{ fontSize: 32, marginBottom: 12 }}>🗺️</Text>
        <Text style={{ fontSize: 14, color: '#888', textAlign: 'center' }}>晋升至国政院院理（级别14）后解锁各省管理</Text>
      </View>
    );
  }

  const filtered = PROVINCES
    .filter(p => typeFilter === '全部' || p.type === typeFilter)
    .sort((a, b) => b[sortBy] - a[sortBy]);

  const totalGdp = PROVINCES.reduce((s, p) => s + p.gdp, 0);
  const totalTax = PROVINCES.reduce((s, p) => s + p.taxRevenue, 0);
  const avgLiv = Math.round(PROVINCES.reduce((s, p) => s + p.livelihood, 0) / PROVINCES.length);
  const totalPop = Math.round(PROVINCES.reduce((s, p) => s + p.population, 0) / 10000);

  const handleVisit = async (province: Province, task: typeof VISIT_TASKS[0]) => {
    const key = `${province.id}_${task.id}`;
    if (acting || (save?.fundBalance ?? 0) < task.cost || visitedIds.has(key)) return;
    setActing(true);
    const patch: Record<string, unknown> = {
      fundBalance: (save?.fundBalance ?? 0) - task.cost,
      meritPoints: (save?.meritPoints ?? 0) + task.meritReward,
    };
    await updateGameSave(patch as Parameters<typeof updateGameSave>[0]);
    setVisitedIds(prev => new Set(prev).add(key));
    setResult(`✅ 走访${province.name}「${task.label}」完成 · 政绩+${task.meritReward}`);
    setActing(false);
    setTimeout(() => setResult(''), 3000);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F4F0' }}>
      <StatusBar style="light" backgroundColor="#1D3B5E" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#1D3B5E', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: '#a0b4cc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(160,180,204,0.7)', fontSize: 9, letterSpacing: 3 }}>国政院 · 地方管理</Text>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>🗺️ 各省直辖市管理</Text>
            <Text style={{ color: 'rgba(160,180,204,0.8)', fontSize: 11, marginTop: 2 }}>
              {save.playerName} · 全国 31 个省级行政区
            </Text>
          </View>
        </View>

        {/* 全国汇总 */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {[
            { label: '全国GDP', value: `${(totalGdp / 10000).toFixed(0)}万亿`, color: '#FFD700' },
            { label: '全国税收', value: `${(totalTax / 10000).toFixed(1)}万亿`, color: '#7EC8E3' },
            { label: '民生均值', value: `${avgLiv}分`,  color: '#90EE90' },
            { label: '总人口',   value: `${totalPop}亿`, color: '#FFB6C1' },
          ].map(s => (
            <View key={s.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', padding: 8, alignItems: 'center' }}>
              <Text style={{ color: s.color, fontWeight: '700', fontSize: 13 }}>{s.value}</Text>
              <Text style={{ color: 'rgba(200,220,255,0.7)', fontSize: 9, marginTop: 1 }}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 排序 & 筛选 */}
      <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8E8E8' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10, paddingVertical: 8, gap: 6 }}>
          {(['全部', '省份', '直辖市', '自治区'] as const).map(t => (
            <Pressable
              key={t}
              onPress={() => setTypeFilter(t)}
              style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: typeFilter === t ? '#1D3B5E' : '#F0F4F8' }}
            >
              <Text style={{ fontSize: 11, color: typeFilter === t ? '#fff' : '#555', fontWeight: typeFilter === t ? '700' : '400' }}>{t}</Text>
            </Pressable>
          ))}
          <View style={{ width: 1, backgroundColor: '#EEE', marginHorizontal: 4 }} />
          <Text style={{ fontSize: 10, color: '#888', alignSelf: 'center' }}>排序：</Text>
          {([['gdp','GDP'], ['taxRevenue','税收'], ['livelihood','民生'], ['population','人口']] as const).map(([k, l]) => (
            <Pressable
              key={k}
              onPress={() => setSortBy(k as typeof sortBy)}
              style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: sortBy === k ? '#C82829' : '#F0F4F8' }}
            >
              <Text style={{ fontSize: 11, color: sortBy === k ? '#fff' : '#555' }}>{l}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 10, gap: 8 }}
        renderItem={({ item, index }) => {
          const isSelected = selectedProvince?.id === item.id;
          const typeColor = TYPE_COLORS[item.type] ?? '#888';
          const livColor = item.livelihood >= 80 ? '#2a7a3b' : item.livelihood >= 65 ? '#7B5E2A' : '#C82829';
          const remittance = Math.round(item.taxRevenue * 0.6);
          return (
            <Pressable
              onPress={() => setSelectedProvince(isSelected ? null : item)}
              style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: isSelected ? '#1D3B5E' : '#DDD' }}
            >
              {/* 基础信息行 */}
              <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 36, height: 36, backgroundColor: typeColor + '18', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: typeColor }}>
                  <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 6, fontWeight: '700', color: '#888', marginRight: 2 }}>#{index + 1}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#111' }}>{item.name}</Text>
                    <View style={{ backgroundColor: typeColor, paddingHorizontal: 4, paddingVertical: 1 }}>
                      <Text style={{ fontSize: 8, color: '#fff' }}>{item.type}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 10, color: '#888', marginTop: 1 }}>书记：{item.secretary} · 省长：{item.governor}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 3 }}>
                  <Text style={{ fontSize: 12, color: '#2B4B6F', fontWeight: '700' }}>GDP {(item.gdp / 10000).toFixed(1)}万亿</Text>
                  <View style={{ backgroundColor: livColor + '18', borderWidth: 1, borderColor: livColor, paddingHorizontal: 5, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 9, color: livColor, fontWeight: '700' }}>民生{item.livelihood}</Text>
                  </View>
                </View>
              </View>

              {/* 数据概览行 */}
              <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F5F5F5', paddingHorizontal: 10, paddingVertical: 8, gap: 6 }}>
                {[
                  { label: '税收',    value: `${(item.taxRevenue / 10000).toFixed(2)}万亿` },
                  { label: '上缴中央',value: `${(remittance / 10000).toFixed(2)}万亿`,    special: true },
                  { label: '人口',    value: `${item.population}万` },
                ].map(d => (
                  <View key={d.label} style={{ flex: 1, alignItems: 'center', backgroundColor: d.special ? '#FFF5E6' : '#F8F8F8', paddingVertical: 5 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: d.special ? '#C82829' : '#333' }}>{d.value}</Text>
                    <Text style={{ fontSize: 9, color: '#888', marginTop: 1 }}>{d.label}</Text>
                  </View>
                ))}
              </View>

              {/* 展开：走访功能 */}
              {isSelected && (
                <View style={{ borderTopWidth: 1, borderTopColor: '#EEE', padding: 12, gap: 8 }}>
                  <View style={{ backgroundColor: '#1D3B5E', padding: 10 }}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>🚁 走访 · {item.name}</Text>
                    <Text style={{ color: 'rgba(180,210,255,0.8)', fontSize: 10, marginTop: 2 }}>
                      当前经费：¥{formatMoney(save.fundBalance)}
                    </Text>
                  </View>
                  {VISIT_TASKS.map(task => {
                    const key = `${item.id}_${task.id}`;
                    const done = visitedIds.has(key);
                    const canDo = (save.fundBalance ?? 0) >= task.cost && !done;
                    return (
                      <View key={task.id} style={{ backgroundColor: done ? '#F0FAF0' : '#FAFAFA', borderWidth: 1, borderColor: done ? '#2a7a3b' : '#DDD', padding: 10 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: done ? '#2a7a3b' : '#222' }}>{task.label}</Text>
                            <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{task.desc}</Text>
                            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                              <Text style={{ fontSize: 9, color: '#7B5E2A', backgroundColor: '#FFF9E6', paddingHorizontal: 5, paddingVertical: 1 }}>
                                费用 ¥{formatMoney(task.cost)}
                              </Text>
                              <Text style={{ fontSize: 9, color: '#2a7a3b', backgroundColor: '#F0FAF0', paddingHorizontal: 5, paddingVertical: 1 }}>
                                +{task.meritReward}政绩
                              </Text>
                            </View>
                          </View>
                          {done ? (
                            <View style={{ backgroundColor: '#2a7a3b', paddingHorizontal: 6, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>已完成</Text>
                            </View>
                          ) : (
                            <Pressable
                              onPress={() => void handleVisit(item, task)}
                              disabled={!canDo || acting}
                              style={{ backgroundColor: canDo ? '#1D3B5E' : '#CCC', paddingHorizontal: 10, paddingVertical: 6 }}
                            >
                              <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>
                                {acting ? '…' : canDo ? '▶ 走访' : '经费不足'}
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </Pressable>
          );
        }}
      />

      {!!result && (
        <View style={{ position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: '#1D3B5E', padding: 12, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{result}</Text>
        </View>
      )}
    </View>
  );
}
```

<a id="srcappapprecruittsx"></a>
## `src/app/(app)/recruit.tsx`

```tsx
// 组织部页面 - 招募新干部 / 年度编制分配 / 申请调任历史下属 / 年度晋升提报
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import {
  getOrCreateQuarterCandidates,
  getCurrentRecruitKey,
  getRecruitRoundLabel,
  getRecruitOrg,
  triggerAutoRecruit,
  getTransferredSubordinates,
  recallSubordinate,
  getSubordinatesByRank,
} from '@/db/gameApi';
import type { RecruitCandidate, Subordinate } from '@/types/game';
import { getSubAvatarEmoji, getAvatarBgColor, DEPT_CONFIG, FACTION_LABEL, FACTION_COLOR, SUB_LEVEL_NAMES } from '@/types/game';
import { StatBar } from '@/components/StatBar';

type Tab = 'recruit' | 'orgdept' | 'staff' | 'recall' | 'nominate';

// ── 年度编制分配：按职级动态计算各部门编制配额 ──────────────────
function getDeptQuota(rankLevel: number): { deptName: string; quota: number; current: number }[] {
  const base = rankLevel <= 6 ? 3 : rankLevel <= 8 ? 5 : rankLevel <= 10 ? 8 : rankLevel <= 12 ? 12 : 15;
  return Object.values(DEPT_CONFIG).map(cfg => ({
    deptName: cfg.name,
    quota: base + Math.floor(Math.random() * 3),
    current: Math.floor(base * 0.6),
  }));
}

// 年度编制申请选项
const STAFF_REQUEST_TYPES = [
  { label: '增加行政人员编制', desc: '向组织部申请增加1名行政岗人员', meritCost: 10, result: '核准增编1名' },
  { label: '申请技术专家岗',   desc: '引进高水平专业技术人才',         meritCost: 20, result: '专家入编，能力+15' },
  { label: '申请领导岗扩编',   desc: '增加副职领导岗位名额',           meritCost: 30, result: '副职名额+1' },
  { label: '申请应急编制',     desc: '特殊事项临时增设岗位',           meritCost: 15, result: '临时编制2名' },
];

// ── 现实化招募背景信息 ─────────────────────────────────────────────
const RECRUIT_BG: { rankRange: [number, number]; title: string; org: string; desc: string; examName: string }[] = [
  {
    rankRange: [1, 3],
    title: '基层公务员招录',
    org: '县委组织部 · 人力资源和社会保障局',
    desc: '通过国家/省级公务员考试招录基层科员，经笔试、面试、政治审查后录用，由县委组织部审批备案，统一分配到乡镇各职能部门。',
    examName: '国考（11月）& 省考（3-4月）',
  },
  {
    rankRange: [4, 6],
    title: '县级机关公务员补充',
    org: '市委组织部 · 县委人力资源和社会保障局',
    desc: '县级机关干部主要通过省考招录，补充科员至副科级职位。录用人员经组织部政治考察后，按能力专长分配至各职能局，严禁超编招录。',
    examName: '省级公务员考试（每年2批次）',
  },
  {
    rankRange: [7, 9],
    title: '市级机关干部统筹',
    org: '省委组织部 · 市委人力资源和社会保障局',
    desc: '市级以上机关干部由省委组织部统一调配，以调任、遴选为主，公开考试为辅。重要岗位须经市委常委会研究通过。',
    examName: '遴选考试 & 组织调配',
  },
  {
    rankRange: [10, 15],
    title: '中枢组织部统筹分配',
    org: '中枢组织部',
    desc: '省部级及以上干部由中枢组织部统一管理，通过考察、推荐、中枢决策常委会审议等程序产生，不通过公开考试招录。',
    examName: '中央统一调配',
  },
];

function getRecruitBg(rankLevel: number) {
  return RECRUIT_BG.find(b => rankLevel >= b.rankRange[0] && rankLevel <= b.rankRange[1]) ?? RECRUIT_BG[0];
}

/**
 * 现实层级对照：召回/展示的"主要人员"范围
 *   乡镇(rank1-3)    → 无下属可召回（不参与管干部）
 *   县级(rank4-6)    → 正科(3)、副科(2)  [乡镇主要领导]
 *   市级(rank7-9)    → 正处(5)、副处(4)  [县级主要领导]
 *   省级(rank10-11)  → 正厅(7)、副厅(6)  [市级主要领导]
 *   国家级(rank12+)  → 正部(9)、副部(8)  [省级主要领导]
 */
function getMainSubLevelRange(rankLevel: number): { min: number; max: number } {
  if (rankLevel <= 3)   return { min: 1, max: 1 };  // 乡镇仅科员
  if (rankLevel <= 6)   return { min: 2, max: 3 };  // 县级 → 副科/正科
  if (rankLevel <= 9)   return { min: 4, max: 5 };  // 市级 → 副处/正处
  if (rankLevel <= 11)  return { min: 6, max: 7 };  // 省级 → 副厅/正厅
  return { min: 8, max: 9 };                        // 国家级 → 副部/正部
}

function getRecallLevelDesc(rankLevel: number): string {
  if (rankLevel <= 3)  return '科员级';
  if (rankLevel <= 6)  return '副科至正科级（乡镇主要领导）';
  if (rankLevel <= 9)  return '副处至正处级（县区主要领导）';
  if (rankLevel <= 11) return '副厅至正厅级（地市主要领导）';
  return '副部至正部级（省级主要领导）';
}

export default function RecruitScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave, refreshSave } = useGame();
  const [tab, setTab] = useState<Tab>(() => (save && save.rankLevel >= 7) ? 'orgdept' : 'recruit');

  // ── Tab1: 招募（自动模式）──
  const [recruitedList, setRecruitedList] = useState<RecruitCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [recruiting, setRecruiting] = useState(false); // 自动招募进行中
  const [feedback, setFeedback] = useState('');
  const [feedbackOk, setFeedbackOk] = useState(true);
  const [assignmentLog, setAssignmentLog] = useState<{ name: string; dept: string; position: string }[]>([]);
  const [recruitType, setRecruitType] = useState<'national' | 'provincial'>('national');

  // ── Tab2: 编制分配 ──
  const [staffYear] = useState(() => save ? Math.floor(save.gameDays / 365) : 0);
  const [staffRequestDone, setStaffRequestDone] = useState<Set<number>>(new Set());
  const [deptQuota] = useState(() => save ? getDeptQuota(save.rankLevel) : []);

  // ── Tab3: 调任历史下属 ──
  const [transferred, setTransferred] = useState<Subordinate[]>([]);
  const [recallLoading, setRecallLoading] = useState(false);
  const [recalledIds, setRecalledIds] = useState<Set<string>>(new Set());

  // ── Tab4: 年度晋升提报（市委以上 rankLevel >= 7）──
  const [nominateSubs, setNominateSubs] = useState<Subordinate[]>([]);
  const [nominateLoading, setNominateLoading] = useState(false);
  const [nominatedIds, setNominatedIds] = useState<Set<string>>(new Set());
  const [nominateSubmitted, setNominateSubmitted] = useState(false);
  const currentYear = save ? Math.floor(save.gameDays / 365) : 0;
  const alreadyNominated = save ? (save.lastAnnualPromoteYear ?? -1) >= currentYear && currentYear > 0 : false;

  // ── 年度招募批次（每年2次，春0/秋1）──
  const currentRecruitKey = save ? getCurrentRecruitKey(save.gameDays) : 0;
  const alreadyRecruited = save ? (save.lastRecruitQuarter ?? 0) >= currentRecruitKey && currentRecruitKey > 0 : false;
  const recruitBg = save ? getRecruitBg(save.rankLevel) : RECRUIT_BG[0];
  // 当前批次类型：春季=国考，秋季=省考
  const isNationalExam = currentRecruitKey % 10 === 0;
  // 是否有新批次待处理（用于徽标提醒）
  const hasRecruitAlert = save ? save.rankLevel < 7 && !alreadyRecruited : false;

  const showMsg = (msg: string, ok = true) => {
    setFeedback(msg); setFeedbackOk(ok);
    setTimeout(() => setFeedback(''), 3500);
  };

  useFocusEffect(useCallback(() => {
    if (!save) return;
    setLoading(true);
    Promise.all([
      getOrCreateQuarterCandidates(save.id, save.userId, currentRecruitKey, save.rankLevel),
      getTransferredSubordinates(save.id),
    ]).then(([cands, trans]) => {
      // 已经被选中（自动录用）的候选人作为本批次录用名单
      setRecruitedList(cands.filter(c => c.status === 'selected').sort((a, b) => (a.rankOrder ?? 99) - (b.rankOrder ?? 99)));
      setTransferred(trans);
      setLoading(false);
    });
    // 加载提报候选人（市委以上 rankLevel >= 7）
    if (save.rankLevel >= 7) {
      setNominateLoading(true);
      getSubordinatesByRank(save.id, save.rankLevel).then(subs => {
        const eligible = subs.filter(s => !s.transferredCity && s.subLevel >= 1 && s.subLevel <= Math.max(1, save.rankLevel - 2));
        setNominateSubs(eligible);
        setNominateLoading(false);
      });
    }
  }, [save, currentRecruitKey]));

  if (!save) return null;

  // ─── 自动招募操作（一键触发系统自动录用）───
  const handleAutoRecruit = async () => {
    if (!save || recruiting) return;
    setRecruiting(true);
    const result = await triggerAutoRecruit(save.id, save.userId, currentRecruitKey, save.rankLevel);
    await refreshSave();
    setRecruitedList(result.recruited);
    setAssignmentLog(result.assignments);
    setRecruitType(result.recruitType);
    const typeLabel = result.recruitType === 'national' ? '国考' : '省考';
    showMsg(`✅ 系统已完成${typeLabel}本批次录用，共录用${result.count}名干部并分配部门`);
    setRecruiting(false);
  };

  // ─── 编制申请操作 ───
  const handleStaffRequest = async (idx: number) => {
    if (!save || staffRequestDone.has(idx)) return;
    const req = STAFF_REQUEST_TYPES[idx];
    if (save.meritPoints < req.meritCost) {
      showMsg(`政绩不足，需 ${req.meritCost} 点`, false); return;
    }
    await updateGameSave({ meritPoints: save.meritPoints - req.meritCost });
    setStaffRequestDone(prev => new Set([...prev, idx]));
    showMsg(`✅ 「${req.label}」申请成功：${req.result}`);
  };

  // ─── 召回历史下属 ───
  const handleRecall = async (sub: Subordinate) => {
    if (!save || recalledIds.has(sub.id)) return;
    setRecallLoading(true);
    const ok = await recallSubordinate(sub.id);
    if (ok) {
      setRecalledIds(prev => new Set([...prev, sub.id]));
      setTransferred(prev => prev.filter(s => s.id !== sub.id));
      showMsg(`✅ ${sub.name} 已从${sub.transferredCity}调回，重新加入您的下属队伍`);
    } else {
      showMsg('召回失败，请稍后重试', false);
    }
    setRecallLoading(false);
  };

  // ─── 年度晋升提报 ───
  const handleToggleNominate = (sub: Subordinate) => {
    setNominatedIds(prev => {
      const next = new Set(prev);
      if (next.has(sub.id)) next.delete(sub.id);
      else next.add(sub.id);
      return next;
    });
  };

  const handleSubmitNominate = async () => {
    if (!save || nominatedIds.size === 0) return;
    // 记录本年度已提报，奖励政绩
    const meritBonus = nominatedIds.size * 15;
    await updateGameSave({
      meritPoints: save.meritPoints + meritBonus,
      lastAnnualPromoteYear: currentYear,
    });
    setNominateSubmitted(true);
    showMsg(`✅ 已向上级组织部提报 ${nominatedIds.size} 名干部，政绩+${meritBonus}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      <StatusBar style="light" backgroundColor="#1D3B5E" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#2B4B6F', paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 4 }}>
            <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>人事管理</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>组织部</Text>
            <Text style={{ color: '#a0b4cc', fontSize: 9, marginTop: 1 }}>{save.rankName} · {save.cityName}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 3 }}>
            <Text style={{ color: '#FFD700', fontSize: 11, fontWeight: '700' }}>第{staffYear + 1}年</Text>
            {hasRecruitAlert ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#C82829', paddingHorizontal: 7, paddingVertical: 3 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFD700' }} />
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
                  {isNationalExam ? '国考招募开放' : '省考招募开放'}
                </Text>
              </View>
            ) : (
              <Text style={{ color: '#a0b4cc', fontSize: 9 }}>历史下属 {transferred.length} 人可召回</Text>
            )}
          </View>
        </View>
        {/* Tab 切换 */}
        <View style={{ flexDirection: 'row', gap: 0, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
          {([
            // rank7以下才显示手动招募
            ...(save.rankLevel < 7 ? [{ key: 'recruit', label: '招募干部', badge: hasRecruitAlert }] : []),
            ...(save.rankLevel >= 7 ? [{ key: 'orgdept', label: '组织部分配', badge: false }] : []),
            { key: 'staff',    label: '编制分配', badge: false },
            { key: 'recall',   label: `召回下属${transferred.length > 0 ? `(${transferred.length})` : ''}`, badge: false },
            ...(save.rankLevel >= 7 ? [{ key: 'nominate', label: '年度提报', badge: false }] : []),
          ] as { key: Tab; label: string; badge: boolean }[]).map(t => (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key as Tab)}
              style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: tab === t.key ? '#C82829' : 'transparent' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: tab === t.key ? '700' : '400' }}>{t.label}</Text>
                {t.badge && (
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFD700', marginTop: -4 }} />
                )}
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 反馈条 */}
      {feedback ? (
        <View style={{ backgroundColor: feedbackOk ? '#e8f5e9' : '#ffebee', borderBottomWidth: 1, borderBottomColor: feedbackOk ? '#c8e6c9' : '#ffcdd2', padding: 10 }}>
          <Text style={{ color: feedbackOk ? '#2a7a3b' : '#C82829', fontSize: 12, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#C82829" />
        </View>
      ) : (
        <>
          {/* ══════ 组织部自动分配（rank7+）══════ */}
          {tab === 'orgdept' && (
            <ScrollView contentInsetAdjustmentBehavior="automatic">
              <View style={{ padding: 14, gap: 12 }}>
                {/* 说明横幅 */}
                <View style={{ backgroundColor: '#2B4B6F', padding: 14 }}>
                  <Text style={{ color: 'rgba(180,210,255,0.6)', fontSize: 9, letterSpacing: 2 }}>中枢组织部 · 干部统一分配</Text>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, marginTop: 3 }}>🏛️ 市级以上干部由组织部统筹</Text>
                  <Text style={{ color: 'rgba(180,210,255,0.85)', fontSize: 11, marginTop: 4, lineHeight: 16 }}>
                    根据全国干部库统筹调配，每季度自动完成选拔与分配。综合考核分值≥85者纳入中央选调生，优先赴各地市重要岗位任职。
                  </Text>
                </View>

                {/* 本年度分配状态 */}
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14, gap: 10 }}>
                  <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '700', letterSpacing: 2 }}>本年度招募动态</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[
                      { label: '当前年度', val: `第${currentYear + 1}年`, color: '#2B4B6F' },
                      { label: '已录用', val: `${Math.min(12, (currentYear % 5) + 3)}名`, color: '#2a7a3b' },
                      { label: '选调生数', val: `${(currentYear % 3) + 1}名`, color: '#C82829' },
                    ].map(s => (
                      <View key={s.label} style={{ flex: 1, alignItems: 'center', backgroundColor: '#F5F4F1', padding: 10 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: s.color }}>{s.val}</Text>
                        <Text style={{ fontSize: 9, color: '#888', marginTop: 2, textAlign: 'center' }}>{s.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* 选调生名单 */}
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', overflow: 'hidden' }}>
                  <View style={{ backgroundColor: '#C82829', padding: 10 }}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>⭐ 中央选调生名单（综合≥85分）</Text>
                  </View>
                  {[
                    { name: '王思远', univ: '清华大学', score: 92, dest: '广东省珠海市' },
                    { name: '陈晓雨', univ: '北京大学', score: 89, dest: '浙江省杭州市' },
                    { name: '刘嘉诚', univ: '复旦大学', score: 87, dest: '江苏省南京市' },
                    { name: '张婷婷', univ: '中国人民大学', score: 86, dest: '四川省成都市' },
                  ].map((s, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', padding: 11, borderBottomWidth: i < 3 ? 1 : 0, borderBottomColor: '#F0F0F0', gap: 10 }}>
                      <View style={{ width: 28, height: 28, backgroundColor: '#C82829', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{s.name}</Text>
                          <View style={{ backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#C82829', paddingHorizontal: 4, paddingVertical: 1 }}>
                            <Text style={{ fontSize: 8, color: '#C82829', fontWeight: '700' }}>选调生</Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 10, color: '#888', marginTop: 1 }}>{s.univ} · 综合{s.score}分 → {s.dest}任职</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* 普通干部分配 */}
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', overflow: 'hidden' }}>
                  <View style={{ backgroundColor: '#2B4B6F', padding: 10 }}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>📋 组织部统筹分配干部</Text>
                  </View>
                  {[
                    { name: '李明辉', score: 78, dept: '经济发展部门', level: '副处级', city: '本辖区' },
                    { name: '孙晓莉', score: 74, dept: '农业农村部门', level: '科级',   city: '本辖区' },
                    { name: '赵建国', score: 71, dept: '城市管理部门', level: '副科级', city: '本辖区' },
                    { name: '吴雅琴', score: 68, dept: '社会事务部门', level: '科级',   city: '本辖区' },
                  ].map((s, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', padding: 11, borderBottomWidth: i < 3 ? 1 : 0, borderBottomColor: '#F0F0F0', gap: 8 }}>
                      <View style={{ width: 28, height: 28, backgroundColor: '#2B4B6F', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 12 }}>{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{s.name}</Text>
                        <Text style={{ fontSize: 10, color: '#888', marginTop: 1 }}>{s.dept} · {s.level} · 综合{s.score}分</Text>
                      </View>
                      <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 6, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 9, color: '#2B4B6F' }}>分配至{s.city}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* 说明 */}
                <View style={{ backgroundColor: '#F0F4F8', padding: 12, borderLeftWidth: 3, borderLeftColor: '#2B4B6F' }}>
                  <Text style={{ fontSize: 11, color: '#555', lineHeight: 17 }}>
                    市级以上干部选拔由中枢组织部统一管理，每季度自动完成。综合考核满分100分，85分及以上进入中央选调生通道，优先赴重点城市关键岗位任职。
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}

          {/* ══════ Tab1：招募干部 ══════ */}
          {tab === 'recruit' && (
            alreadyRecruited || recruitedList.length > 0 ? (
              /* ── 已完成：展示本批次录用公示 ── */
              <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 24 }}>
                {/* 完成横幅 */}
                <View style={{ backgroundColor: '#2B4B6F', padding: 16, alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 28 }}>{recruitType === 'national' ? '🏆' : '📋'}</Text>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff', marginTop: 4 }}>
                    {recruitType === 'national' ? '国考录用公示' : '省考录用公示'}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#a0b4cc', textAlign: 'center', lineHeight: 17 }}>
                    {getRecruitRoundLabel(currentRecruitKey)}
                  </Text>
                  <View style={{ backgroundColor: recruitType === 'national' ? '#C82829' : '#2a7a3b', paddingHorizontal: 10, paddingVertical: 4, marginTop: 4 }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                      {recruitType === 'national'
                        ? `名额精少·含选调生通道 · ${recruitBg.org}`
                        : `按编制空缺补充 · ${recruitBg.org}`}
                    </Text>
                  </View>
                </View>

                  {recruitedList.length > 0 ? (
                  <View style={{ gap: 10 }}>
                    <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '700', letterSpacing: 1 }}>
                      📄 录用人员档案（共{recruitedList.length}人 · {recruitType === 'national' ? '国考批次' : '省考批次'}）
                    </Text>
                    {recruitedList.map((c, idx) => {
                      const avatar = getSubAvatarEmoji(c.avatarId, c.gender);
                      const entryYear = c.birthYear ? (Math.floor(currentRecruitKey / 10) + 2000) : null;
                      const age = c.birthYear ? ((Math.floor(currentRecruitKey / 10) + 2000) - c.birthYear) : null;
                      // 国考第1名且高分 = 选调生
                      const isZhuandiaosheng = recruitType === 'national' && idx === 0 && (c.score ?? 0) >= 80;
                      return (
                        <View key={c.id} style={{ backgroundColor: '#fff', borderWidth: isZhuandiaosheng ? 2 : 1, borderColor: isZhuandiaosheng ? '#C82829' : '#D1D1D1', overflow: 'hidden' }}>
                          {/* 档案头部 */}
                          <View style={{ backgroundColor: isZhuandiaosheng ? '#C82829' : '#F0F4F8', flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: isZhuandiaosheng ? 'rgba(255,255,255,0.3)' : '#E0E0E0' }}>
                            <View style={{ width: 48, height: 48, backgroundColor: isZhuandiaosheng ? 'rgba(255,255,255,0.2)' : '#2B4B6F', alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ fontSize: 24 }}>{avatar}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={{ fontSize: 15, fontWeight: '700', color: isZhuandiaosheng ? '#fff' : '#222' }}>{c.name}</Text>
                                <Text style={{ fontSize: 11, color: isZhuandiaosheng ? 'rgba(255,255,255,0.8)' : '#888' }}>{c.gender}</Text>
                                {age && <Text style={{ fontSize: 11, color: isZhuandiaosheng ? 'rgba(255,255,255,0.8)' : '#888' }}>{age}岁</Text>}
                              </View>
                              <View style={{ flexDirection: 'row', gap: 4, marginTop: 3 }}>
                                {isZhuandiaosheng ? (
                                  <View style={{ backgroundColor: '#FFD700', paddingHorizontal: 6, paddingVertical: 1 }}>
                                    <Text style={{ fontSize: 9, color: '#7B4A00', fontWeight: '700' }}>⭐ 选调生 · 副科级起步</Text>
                                  </View>
                                ) : (
                                  <View style={{ backgroundColor: recruitType === 'national' ? '#2B4B6F' : '#2a7a3b', paddingHorizontal: 6, paddingVertical: 1 }}>
                                    <Text style={{ fontSize: 9, color: '#fff', fontWeight: '600' }}>
                                      {recruitType === 'national' ? `国考录用第${idx + 1}名` : `省考录用第${idx + 1}名`}
                                    </Text>
                                  </View>
                                )}
                                <View style={{ backgroundColor: '#F5F4F1', paddingHorizontal: 6, paddingVertical: 1, borderWidth: 1, borderColor: '#DDD' }}>
                                  <Text style={{ fontSize: 9, color: '#555' }}>{c.trait}</Text>
                                </View>
                              </View>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={{ fontSize: 20, fontWeight: '700', color: isZhuandiaosheng ? '#FFD700' : '#C82829' }}>{c.score}</Text>
                              <Text style={{ fontSize: 9, color: isZhuandiaosheng ? 'rgba(255,255,255,0.7)' : '#888', marginTop: 1 }}>综合评分</Text>
                            </View>
                          </View>
                          {/* 档案详情 */}
                          <View style={{ padding: 10, gap: 6 }}>
                            {/* 基本信息行 */}
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              {[
                                { label: '出生年份', val: c.birthYear ? `${c.birthYear}年` : '--' },
                                { label: '入职年份', val: entryYear ? `${entryYear}年` : '--' },
                                { label: '籍贯', val: c.hometown ?? '--' },
                              ].map(f => (
                                <View key={f.label} style={{ flex: 1, backgroundColor: '#F9F9F9', padding: 6, borderWidth: 1, borderColor: '#EEE', alignItems: 'center' }}>
                                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#333' }}>{f.val}</Text>
                                  <Text style={{ fontSize: 9, color: '#999', marginTop: 1 }}>{f.label}</Text>
                                </View>
                              ))}
                            </View>
                            {/* 教育背景 */}
                            <View style={{ backgroundColor: '#F0F4F8', padding: 8, gap: 3, borderLeftWidth: 3, borderLeftColor: isZhuandiaosheng ? '#C82829' : '#2B4B6F' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={{ fontSize: 10, color: '#555', fontWeight: '600' }}>🎓 毕业院校</Text>
                                <Text style={{ fontSize: 11, color: '#222', fontWeight: '700' }}>{c.university ?? '--'}</Text>
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={{ fontSize: 10, color: '#555', fontWeight: '600' }}>📚 所学专业</Text>
                                <Text style={{ fontSize: 11, color: '#2B4B6F' }}>{c.major ?? '--'}</Text>
                              </View>
                            </View>
                            {/* 能力指标 */}
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              <View style={{ flex: 1 }}>
                                <StatBar label="能力" value={c.ability} />
                                <StatBar label="忠诚" value={c.loyalty} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <StatBar label="廉洁" value={c.integrity} />
                                <StatBar label="经验" value={c.experience} />
                              </View>
                            </View>
                            {/* 分配结果 */}
                            {assignmentLog.find(a => a.name === c.name) && (() => {
                              const a = assignmentLog.find(a2 => a2.name === c.name)!;
                              return (
                                <View style={{ backgroundColor: isZhuandiaosheng ? '#FFF5CC' : '#E8F5E9', padding: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={{ fontSize: 11, color: isZhuandiaosheng ? '#7B4A00' : '#2a7a3b' }}>
                                    {isZhuandiaosheng ? '⭐ 选调生分配至：' : '🏢 分配至：'}
                                  </Text>
                                  <Text style={{ fontSize: 11, fontWeight: '700', color: isZhuandiaosheng ? '#7B4A00' : '#2a7a3b', flex: 1 }}>{a.dept} · {a.position}</Text>
                                </View>
                              );
                            })()}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={{ backgroundColor: '#F5F4F1', padding: 14, alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 14, color: '#888' }}>📭 本批次暂无录用公示数据</Text>
                    <Text style={{ fontSize: 11, color: '#aaa' }}>本批次可能尚未开放，或录用结果还未生成</Text>
                  </View>
                )}

                {/* 下次招募提示 */}
                <View style={{ backgroundColor: '#FFF8E7', borderWidth: 1, borderColor: '#F0C040', padding: 12, gap: 4 }}>
                  <Text style={{ fontSize: 11, color: '#7a5c00', fontWeight: '700' }}>📅 下次招募时间</Text>
                  <Text style={{ fontSize: 11, color: '#555', lineHeight: 17 }}>
                    {currentRecruitKey % 10 === 0
                      ? '秋季省考批次将于本年后半期开放（约第183天起）—— 人数多，按编制空缺补充'
                      : '明年春季国考批次将于次年前半期开放（约次年第1天起）—— 名额精少，含选调生通道'}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#888' }}>主管机构：{recruitBg.org}</Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable onPress={() => setTab('recall')} style={{ flex: 1, backgroundColor: '#2B4B6F', paddingVertical: 12, alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>查看可召回历史下属</Text>
                  </Pressable>
                  <Pressable onPress={() => router.back()} style={{ flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#DDD', alignItems: 'center' }}>
                    <Text style={{ color: '#666', fontSize: 13 }}>返回</Text>
                  </Pressable>
                </View>
              </ScrollView>
            ) : (
              /* ── 未招募：显示考试信息 + 一键触发按钮 ── */
              <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 24 }}>
                {/* 招募机构背景 */}
                <View style={{ backgroundColor: isNationalExam ? '#1A2B4A' : '#1A3A2A', padding: 16, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ backgroundColor: isNationalExam ? '#C82829' : '#2a7a3b', paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>
                        {isNationalExam ? '🏛️ 国家公务员考试' : '📋 省级公务员考试'}
                      </Text>
                    </View>
                    <Text style={{ color: '#FFD700', fontSize: 10 }}>
                      {isNationalExam ? '春季批次' : '秋季批次'}
                    </Text>
                  </View>
                  <Text style={{ color: 'rgba(160,180,210,0.8)', fontSize: 9, letterSpacing: 2 }}>{recruitBg.org}</Text>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{recruitBg.title}</Text>
                  <Text style={{ color: 'rgba(160,180,210,0.9)', fontSize: 11, lineHeight: 17 }}>{recruitBg.desc}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 6, flex: 1 }}>
                      <Text style={{ color: '#FFD700', fontSize: 9, fontWeight: '700', marginBottom: 2 }}>考试批次</Text>
                      <Text style={{ color: '#a0b4cc', fontSize: 10 }}>{recruitBg.examName}</Text>
                    </View>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 6, flex: 1 }}>
                      <Text style={{ color: '#FFD700', fontSize: 9, fontWeight: '700', marginBottom: 2 }}>当前批次</Text>
                      <Text style={{ color: '#a0b4cc', fontSize: 10 }}>{isNationalExam ? '春季（国考）批次' : '秋季（省考）批次'}</Text>
                    </View>
                  </View>
                </View>

                {/* 国考/省考对比说明 */}
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14, gap: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#2B4B6F', letterSpacing: 1, marginBottom: 4 }}>
                    {isNationalExam ? '🏆 国考特点（精英通道）' : '📊 省考特点（编制补充）'}
                  </Text>
                  {isNationalExam ? [
                    '候选人共12名，竞争激烈，整体素质高',
                    `录取名额：${save.rankLevel <= 3 ? '1名' : '2名'}（严格按综合评分择优）`,
                    '⭐ 综合评分≥80分者认定为选调生，直接定副科级',
                    '选调生优先分配至发改委、财政局等重要岗位',
                    '985/211院校候选人占比高，博士/硕士比例更多',
                    '录用后系统自动分配，无法人工干预录取名单',
                  ].map((rule, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
                      <Text style={{ fontSize: 10, color: '#C82829', fontWeight: '700', marginTop: 1 }}>·</Text>
                      <Text style={{ fontSize: 11, color: '#555', lineHeight: 17, flex: 1 }}>{rule}</Text>
                    </View>
                  )) : [
                    '候选人共8名，难度相对较低，注重实际工作能力',
                    '录取名额：依据编制空缺自动计算（2~6名）',
                    '省考无选调生通道，录取者均为普通公务员',
                    '按编制最空缺的部门顺序依次补充，填满空缺',
                    '录用后统一定科员级，分配至缺编最多的部门',
                    '院校层次分布更广，本科/大专均有机会录取',
                  ].map((rule, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
                      <Text style={{ fontSize: 10, color: '#2a7a3b', fontWeight: '700', marginTop: 1 }}>·</Text>
                      <Text style={{ fontSize: 11, color: '#555', lineHeight: 17, flex: 1 }}>{rule}</Text>
                    </View>
                  ))}
                </View>

                {/* 本年度分配状态 */}
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14, gap: 10 }}>
                  <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '700', letterSpacing: 2 }}>本年度招募动态</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[
                      { label: '当前年度', val: `第${currentYear + 1}年`, color: '#2B4B6F' },
                      { label: isNationalExam ? '国考名额' : '省考名额',
                        val: isNationalExam
                          ? (save.rankLevel <= 3 ? '1名' : '2名')
                          : '依编制定',
                        color: isNationalExam ? '#C82829' : '#2a7a3b' },
                      { label: isNationalExam ? '含选调生' : '补充空缺',
                        val: isNationalExam ? '可能1名' : '最多6名',
                        color: '#7B5E2A' },
                    ].map(s => (
                      <View key={s.label} style={{ flex: 1, alignItems: 'center', backgroundColor: '#F5F4F1', padding: 10 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: s.color }}>{s.val}</Text>
                        <Text style={{ fontSize: 9, color: '#888', marginTop: 2, textAlign: 'center' }}>{s.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* 触发自动招募按钮 */}
                <Pressable
                  onPress={() => void handleAutoRecruit()}
                  disabled={recruiting}
                  style={{ backgroundColor: recruiting ? '#888' : (isNationalExam ? '#C82829' : '#2a7a3b'), paddingVertical: 14, alignItems: 'center', gap: 4 }}
                >
                  {recruiting ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>组织部正在审核评分中…</Text>
                    </View>
                  ) : (
                    <>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                        {isNationalExam ? '📋 查看国考录用结果' : '📋 查看省考录用结果'}
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>系统将自动按评分录用，无需人工干预</Text>
                    </>
                  )}
                </Pressable>

                <View style={{ backgroundColor: '#F0F4F8', padding: 12, borderLeftWidth: 3, borderLeftColor: isNationalExam ? '#C82829' : '#2a7a3b' }}>
                  <Text style={{ fontSize: 11, color: '#555', lineHeight: 17 }}>
                    {isNationalExam
                      ? '根据《公务员法》规定，国家公务员考试竞争激烈，录取率低，选调生为高层次人才选拔通道，直接进入重要岗位任职。录取结果由系统依法生成，不受干预。'
                      : '省级公务员考试主要补充基层部门编制空缺，录取相对宽松，录用后系统自动按最空缺部门分配，保证各部门人员充足。'}
                  </Text>
                </View>
              </ScrollView>
            )
          )}

          {/* ══════ Tab2：年度编制分配 ══════ */}
          {tab === 'staff' && (
            <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }} contentInsetAdjustmentBehavior="automatic">
              {/* 今年编制概况 */}
              <View style={{ backgroundColor: '#2B4B6F', padding: 14 }}>
                <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2, marginBottom: 4 }}>第{staffYear + 1}年度</Text>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 8 }}>分管部门编制情况</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[
                    { label: '总编制', value: deptQuota.reduce((s, d) => s + d.quota, 0), color: '#FFD700' },
                    { label: '已用', value: deptQuota.reduce((s, d) => s + d.current, 0), color: '#90CAF9' },
                    { label: '空缺', value: deptQuota.reduce((s, d) => s + (d.quota - d.current), 0), color: '#A5D6A7' },
                  ].map(item => (
                    <View key={item.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', padding: 8, alignItems: 'center' }}>
                      <Text style={{ color: item.color, fontSize: 18, fontWeight: '700' }}>{item.value}</Text>
                      <Text style={{ color: '#a0b4cc', fontSize: 9, marginTop: 2 }}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* 各部门编制列表 */}
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 12, gap: 8 }}>
                <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>各部门编制明细</Text>
                {deptQuota.map((dept, i) => {
                  const pct = Math.round((dept.current / dept.quota) * 100);
                  const fill = pct >= 90 ? '#C82829' : pct >= 60 ? '#2a7a3b' : '#7B5E2A';
                  return (
                    <View key={i} style={{ gap: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#222' }}>{dept.deptName}</Text>
                        <Text style={{ fontSize: 11, color: '#888' }}>{dept.current}/{dept.quota} 人</Text>
                      </View>
                      <View style={{ height: 6, backgroundColor: '#EEE' }}>
                        <View style={{ height: 6, width: `${pct}%`, backgroundColor: fill }} />
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* 编制申请 */}
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 12, gap: 8 }}>
                <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>📋 申请增加编制</Text>
                <Text style={{ fontSize: 11, color: '#888', marginBottom: 6, lineHeight: 17 }}>
                  每年可向组织部提交编制申请，经审批后增加部门人力资源配额。
                </Text>
                {STAFF_REQUEST_TYPES.map((req, idx) => {
                  const isDone = staffRequestDone.has(idx);
                  const canAfford = save.meritPoints >= req.meritCost;
                  return (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: isDone ? '#2a7a3b' : '#D1D1D1', padding: 10, gap: 8, backgroundColor: isDone ? '#f0faf3' : '#fff' }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: isDone ? '#2a7a3b' : '#222' }}>{req.label}</Text>
                          <View style={{ backgroundColor: isDone ? '#2a7a3b' : '#2B4B6F', paddingHorizontal: 5, paddingVertical: 1 }}>
                            <Text style={{ color: '#fff', fontSize: 9 }}>{isDone ? '✓已申请' : `${req.meritCost}政绩`}</Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{req.desc}</Text>
                        {isDone && <Text style={{ fontSize: 10, color: '#2a7a3b', marginTop: 2 }}>✅ 已获批：{req.result}</Text>}
                      </View>
                      {!isDone && (
                        <Pressable
                          onPress={() => void handleStaffRequest(idx)}
                          disabled={!canAfford}
                          style={{ backgroundColor: canAfford ? '#2B4B6F' : '#CCC', paddingHorizontal: 12, paddingVertical: 7 }}
                        >
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>申请</Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>

              <View style={{ backgroundColor: '#F0F4F8', borderWidth: 1, borderColor: '#D1D1D1', padding: 10 }}>
                <Text style={{ fontSize: 10, color: '#2B4B6F', fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>说明</Text>
                <Text style={{ fontSize: 11, color: '#666', lineHeight: 17 }}>
                  · 编制情况每年（365天）自动重置，根据职级重新分配{'\n'}
                  · 政绩充足时可申请增编，审批结果即时生效{'\n'}
                  · 每项申请在本年度内只能提交一次
                </Text>
              </View>
            </ScrollView>
          )}

          {/* ══════ Tab3：申请召回历史下属 ══════ */}
          {tab === 'recall' && (
            <ScrollView contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: insets.bottom + 24 }}>
              <View style={{ backgroundColor: '#2B4B6F', padding: 12, marginBottom: 4 }}>
                <Text style={{ color: '#FFD700', fontSize: 14, fontWeight: '700', marginBottom: 4 }}>召回历史下属</Text>
                <Text style={{ color: '#a0b4cc', fontSize: 11, lineHeight: 17 }}>
                  这里列出了您曾经共事、后调任他处的下属干部中的主要人员（
                  {save ? getRecallLevelDesc(save.rankLevel) : ''}
                  ）。您可申请将其召回，重新纳入当前职位的管辖队伍。
                </Text>
              </View>

              {recallLoading && <ActivityIndicator size="small" color="#C82829" />}

              {(() => {
                // 按玩家职级过滤"主要人员"（只展示直接下级层次）
                const recallFiltered = save
                  ? transferred.filter(s => {
                      const { min, max } = getMainSubLevelRange(save.rankLevel);
                      return s.subLevel >= min && s.subLevel <= max;
                    })
                  : transferred;
                if (recallFiltered.length === 0) {
                  return (
                    <View style={{ alignItems: 'center', padding: 40 }}>
                      <Text style={{ fontSize: 32, marginBottom: 12 }}>📭</Text>
                      <Text style={{ fontSize: 14, color: '#888', fontWeight: '600', marginBottom: 6 }}>暂无可召回的主要人员</Text>
                      <Text style={{ fontSize: 12, color: '#aaa', textAlign: 'center' }}>
                        在下属管理中将{getRecallLevelDesc(save?.rankLevel ?? 3)}干部调任后，可在此召回。
                      </Text>
                    </View>
                  );
                }
                return recallFiltered.map(sub => {
                  const emoji = getSubAvatarEmoji(sub.avatarId ?? 0, sub.gender ?? '男');
                  const bg    = getAvatarBgColor(sub.avatarId ?? 0, sub.faction ?? 'neutral');
                  const factionLabel = FACTION_LABEL[sub.faction] ?? '无';
                  const factionColor = FACTION_COLOR[sub.faction] ?? '#888';
                  const levelName = SUB_LEVEL_NAMES[sub.subLevel] ?? '待定';
                  const recalled = recalledIds.has(sub.id);
                  return (
                    <View key={sub.id} style={{ backgroundColor: recalled ? '#f0faf3' : '#fff', borderWidth: 1, borderColor: recalled ? '#2a7a3b' : '#D1D1D1', padding: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 22 }}>{emoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#222' }}>{sub.name}</Text>
                            <View style={{ backgroundColor: factionColor + '22', borderWidth: 1, borderColor: factionColor, paddingHorizontal: 5, paddingVertical: 1 }}>
                              <Text style={{ color: factionColor, fontSize: 9, fontWeight: '700' }}>{factionLabel}</Text>
                            </View>
                            <View style={{ backgroundColor: '#E8F0F8', paddingHorizontal: 5, paddingVertical: 1 }}>
                              <Text style={{ fontSize: 9, color: '#2B4B6F' }}>{levelName}</Text>
                            </View>
                          </View>
                          <Text style={{ fontSize: 11, color: '#888', marginTop: 1 }}>
                            {sub.position} · 现任职于 {sub.transferredCity}
                          </Text>
                        </View>
                        {recalled ? (
                          <View style={{ backgroundColor: '#2a7a3b', paddingHorizontal: 10, paddingVertical: 6 }}>
                            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>已召回</Text>
                          </View>
                        ) : (
                          <Pressable
                            onPress={() => void handleRecall(sub)}
                            disabled={recallLoading}
                            style={{ backgroundColor: '#C82829', paddingHorizontal: 10, paddingVertical: 6 }}
                          >
                            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>申请召回</Text>
                          </Pressable>
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <StatBar label="能力" value={sub.ability} />
                          <StatBar label="忠诚" value={sub.loyalty} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <StatBar label="廉洁" value={sub.integrity} />
                          <StatBar label="经验" value={sub.experience} />
                        </View>
                      </View>
                    </View>
                  );
                });
              })()}
            </ScrollView>
          )}

          {/* ══════ Tab4：年度晋升提报 ══════ */}
          {tab === 'nominate' && (
            <ScrollView contentInsetAdjustmentBehavior="automatic">
              {/* 说明横幅 */}
              <View style={{ backgroundColor: '#2B4B6F', padding: 14, gap: 4 }}>
                <Text style={{ color: 'rgba(160,180,204,0.7)', fontSize: 9, letterSpacing: 2 }}>组织部 · 年度干部考察提报</Text>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>📋 第 {currentYear + 1} 年度晋升提报</Text>
                <Text style={{ color: 'rgba(160,180,204,0.85)', fontSize: 11, lineHeight: 17, marginTop: 4 }}>
                  每年由组织部对市委以上干部进行考察提报，选拔优秀人才报上级党委审核晋升。
                  省级以下干部由省长/省委书记自行决定，无需通过此通道。每年度只能提报一次。
                </Text>
              </View>

              {/* 已完成提示 */}
              {(alreadyNominated || nominateSubmitted) ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 }}>
                  <Text style={{ fontSize: 40 }}>✅</Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#2B4B6F' }}>本年度提报已完成</Text>
                  <Text style={{ fontSize: 12, color: '#888', textAlign: 'center' }}>
                    第 {currentYear + 1} 年度干部晋升提报已提交组织部，等待上级党委审批。
                    {'\n'}下一年度可重新提报。
                  </Text>
                </View>
              ) : (
                <View style={{ padding: 14, gap: 10 }}>
                  {nominateLoading ? (
                    <View style={{ alignItems: 'center', padding: 30 }}>
                      <ActivityIndicator color="#1D3B5E" />
                    </View>
                  ) : nominateSubs.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                      <Text style={{ color: '#888', fontSize: 14 }}>暂无符合条件的提报对象</Text>
                      <Text style={{ color: '#aaa', fontSize: 11, marginTop: 6, textAlign: 'center' }}>
                        需下属在职且职级在市委级别以下
                      </Text>
                    </View>
                  ) : (
                    <>
                      <View style={{ backgroundColor: '#FFF9E6', borderWidth: 1, borderColor: '#E8D080', padding: 10 }}>
                        <Text style={{ fontSize: 11, color: '#7B5E2A' }}>
                          📌 已选 {nominatedIds.size} 人提报 · 建议优先选取能力值≥70、廉洁值≥60的干部
                        </Text>
                      </View>

                      {nominateSubs.map(sub => {
                        const isSelected = nominatedIds.has(sub.id);
                        const avatarEmoji = getSubAvatarEmoji(sub.avatarId ?? 0, sub.gender ?? '男');
                        const avatarBg    = getAvatarBgColor(sub.avatarId ?? 0, sub.faction ?? 'neutral');
                        const factionLabel = FACTION_LABEL[sub.faction] ?? '无';
                        const factionColor = FACTION_COLOR[sub.faction] ?? '#888';
                        const levelName   = SUB_LEVEL_NAMES[sub.subLevel] ?? '待定';
                        // 综合评分：能力40+廉洁30+忠诚20+政绩10
                        const score = Math.round(sub.ability * 0.4 + sub.integrity * 0.3 + sub.loyalty * 0.2 + Math.min(100, sub.experience / 50) * 0.1);
                        const isHighScore = score >= 65;

                        return (
                          <Pressable
                            key={sub.id}
                            onPress={() => handleToggleNominate(sub)}
                            style={{
                              backgroundColor: isSelected ? '#EEF4FF' : '#fff',
                              borderWidth: 1.5,
                              borderColor: isSelected ? '#2B4B6F' : '#D0D0D0',
                              padding: 12,
                              flexDirection: 'row',
                              gap: 10,
                              alignItems: 'flex-start',
                            }}
                          >
                            {/* 头像 */}
                            <View style={{ width: 38, height: 38, backgroundColor: avatarBg, alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ fontSize: 18 }}>{avatarEmoji}</Text>
                            </View>

                            {/* 信息 */}
                            <View style={{ flex: 1, gap: 3 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{sub.name}</Text>
                                {isHighScore && (
                                  <View style={{ backgroundColor: '#2a7a3b', paddingHorizontal: 5, paddingVertical: 1 }}>
                                    <Text style={{ fontSize: 8, color: '#fff', fontWeight: '700' }}>优秀</Text>
                                  </View>
                                )}
                                <View style={{ backgroundColor: factionColor + '22', paddingHorizontal: 5, paddingVertical: 1 }}>
                                  <Text style={{ fontSize: 8, color: factionColor }}>{factionLabel}</Text>
                                </View>
                              </View>
                              <Text style={{ fontSize: 10, color: '#888' }}>{levelName} · 综合评分 {score}</Text>
                              <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                                <Text style={{ fontSize: 9, color: '#555' }}>能力 {sub.ability}</Text>
                                <Text style={{ fontSize: 9, color: '#555' }}>廉洁 {sub.integrity}</Text>
                                <Text style={{ fontSize: 9, color: '#555' }}>忠诚 {sub.loyalty}</Text>
                              </View>
                            </View>

                            {/* 勾选状态 */}
                            <View style={{
                              width: 22, height: 22,
                              backgroundColor: isSelected ? '#2B4B6F' : '#fff',
                              borderWidth: 1.5, borderColor: isSelected ? '#2B4B6F' : '#CCC',
                              alignItems: 'center', justifyContent: 'center',
                            }}>
                              {isSelected && <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>✓</Text>}
                            </View>
                          </Pressable>
                        );
                      })}

                      {/* 提交按钮 */}
                      <Pressable
                        onPress={() => void handleSubmitNominate()}
                        disabled={nominatedIds.size === 0}
                        style={{
                          backgroundColor: nominatedIds.size > 0 ? '#2B4B6F' : '#CCC',
                          paddingVertical: 14,
                          alignItems: 'center',
                          marginTop: 6,
                        }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                          {nominatedIds.size > 0
                            ? `📤 提报 ${nominatedIds.size} 名干部至上级组织部`
                            : '请先选择提报对象'}
                        </Text>
                      </Pressable>
                    </>
                  )}
                </View>
              )}
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}
```

<a id="srcappapprejectednoticetsx"></a>
## `src/app/(app)/rejected-notice.tsx`

```tsx
// 申请已驳回页 — 可凭新码重新申请
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/client/supabase';

const C = {
  bg: '#07111E',
  bgCard: '#0F2235',
  gold: '#C8A84B',
  goldLight: '#E8D08A',
  goldDim: '#7A6428',
  goldBg: 'rgba(200,168,75,0.08)',
  red: '#C82829',
  redBg: 'rgba(200,40,41,0.12)',
  textPrimary: '#EDE8DC',
  textSecond: '#A09070',
  textHint: '#5A5040',
  divider: '#162840',
  dividerGold: 'rgba(200,168,75,0.25)',
  successBorder: '#2a7a3b',
  successBg: 'rgba(40,120,60,0.12)',
  successText: '#7FE0A0',
};

export default function RejectedNoticeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const { data } = await supabase.rpc('get_my_test_code_status');
        const d = (data as { approval_status?: string; test_code?: string | null } | null) ?? {};
        if (active) {
          setReason(null);
          setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const handleReapply = () => {
    router.replace('/(app)/enter-code');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/sign-in');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="light" />
      <View style={{ height: 3, backgroundColor: C.gold, position: 'absolute', top: 0, left: 0, right: 0 }} />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingTop: insets.top + 32,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ fontSize: 40 }}>⛔</Text>
          <Text style={{ fontSize: 26, fontWeight: '900', color: C.red, letterSpacing: 4, marginTop: 12 }}>申请已驳回</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <View style={{ width: 32, height: 1, backgroundColor: C.goldDim }} />
            <View style={{ width: 6, height: 6, backgroundColor: C.gold, transform: [{ rotate: '45deg' }] }} />
            <View style={{ width: 32, height: 1, backgroundColor: C.goldDim }} />
          </View>
        </View>

        <View style={{ width: '100%', maxWidth: 400, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.dividerGold }}>
          <View style={{ height: 2, backgroundColor: C.gold }} />
          <View style={{ padding: 20, gap: 14 }}>
            <Text style={{ fontSize: 13, color: C.textPrimary, lineHeight: 22 }}>
              您的档案申请未通过审核。{'\n'}如有疑问请联系管理员。您可凭新的测试码重新提交申请。
            </Text>

            {loading ? (
              <ActivityIndicator color={C.gold} />
            ) : reason ? (
              <View style={{ backgroundColor: C.redBg, borderLeftWidth: 2, borderLeftColor: C.red, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ fontSize: 10, color: C.textSecond, letterSpacing: 2 }}>驳回原因</Text>
                <Text style={{ fontSize: 12, color: '#FF9A9A', marginTop: 4 }}>{reason}</Text>
              </View>
            ) : null}

            {/* 免费声明框 */}
            <View style={{ borderWidth: 1, borderColor: C.successBorder, backgroundColor: C.successBg, paddingHorizontal: 12, paddingVertical: 10 }}>
              <Text style={{ fontSize: 11, color: C.successText, lineHeight: 18 }}>
                ⚠️ 重要声明 · 请务必阅读：本游戏测试码为绝对免费（包括游戏链接也是）。{'\n'}如有任何自称管理员的人向您索要费用，请立即联系频道主高仙。
              </Text>
            </View>

            <Pressable
              onPress={handleReapply}
              cssInterop={false}
              style={{ backgroundColor: C.gold, paddingVertical: 14, alignItems: 'center', marginTop: 4 }}
            >
              <Text style={{ color: '#1A1208', fontWeight: '700', fontSize: 14, letterSpacing: 2 }}>凭新码重新申请</Text>
            </Pressable>
          </View>
          <View style={{ height: 1, backgroundColor: C.dividerGold }} />
        </View>

        <Pressable onPress={handleSignOut} style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 12, color: C.textSecond, letterSpacing: 1 }}>退出登录</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
```

<a id="srcappappretirementendingtsx"></a>
## `src/app/(app)/retirement-ending.tsx`

```tsx
// 退休结局页——功成身退
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/client/supabase';
import { useGame } from '@/ctx/GameContext';
import { getSubordinates, deleteSave } from '@/db/gameApi';
import { evaluateFactionEnding } from '@/lib/factionSystem';
import { gameDaysToDate, RANK_CONFIG, getAvatarEmoji, getAvatarBgColor, formatMoney, getRetirementConfig } from '@/types/game';

/** 计算仕途年数 */
function calcCareerYears(gameDays: number): number {
  return Math.floor(gameDays / 365);
}

/** 获取退休后待遇描述 */
function getRetirementBenefits(rankLevel: number): string[] {
  if (rankLevel >= 14) {
    return [
      '保留最高政治待遇，享受国家领导人礼遇',
      '可受邀出席国家重大典礼与外交活动',
      '参与国家重大战略决策咨询',
      '宏观政策建言渠道畅通，影响深远',
      '国家为您保障专职医疗保健与安保团队',
    ];
  }
  if (rankLevel >= 13) {
    return [
      '享受副国家级政治待遇与相应生活保障',
      '可受邀参与重大政策咨询',
      '在重要节假日出席党和国家领导层活动',
      '专职医疗保健与生活服务',
    ];
  }
  if (rankLevel >= 11) {
    return [
      '享受正部级或副部级退休待遇',
      '退休工资为在职工资的90%',
      '相应级别的医疗保健服务',
      '参与相关领域顾问与咨询工作',
    ];
  }
  return [
    '享受相应职级退休工资待遇',
    '基本医疗保险与社会保障',
    '地方组织优秀退休干部表彰',
  ];
}

/** 民心评价 */
function getMoralLabel(moralValue: number): { label: string; color: string } {
  if (moralValue >= 80) return { label: '廉洁奉公', color: '#2a7a3b' };
  if (moralValue >= 60) return { label: '清廉勤政', color: '#4a7c59' };
  if (moralValue >= 40) return { label: '中规中矩', color: '#888' };
  if (moralValue >= 20) return { label: '瑕不掩瑜', color: '#C87820' };
  return { label: '留有污点', color: '#C82829' };
}

/** 政绩评价 */
function getMeritLabel(meritPoints: number, rankLevel: number): { label: string; color: string } {
  const required = RANK_CONFIG[rankLevel]?.requiredMerit ?? 100;
  const ratio = meritPoints / required;
  if (ratio >= 3) return { label: '建树卓著', color: '#2a7a3b' };
  if (ratio >= 2) return { label: '政绩斐然', color: '#4a7c59' };
  if (ratio >= 1) return { label: '政绩扎实', color: '#2B4B6F' };
  return { label: '政绩平淡', color: '#888' };
}

/** 家庭幸福评价 */
function getFamilyLabel(familyHappiness: number): { label: string; color: string } {
  if (familyHappiness >= 80) return { label: '家庭美满', color: '#2a7a3b' };
  if (familyHappiness >= 60) return { label: '家庭和睦', color: '#4a7c59' };
  if (familyHappiness >= 40) return { label: '家庭尚可', color: '#888' };
  return { label: '聚少离多', color: '#C87820' };
}

export default function RetirementEndingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, isLoading, setIsRunning } = useGame();
  const [subCount, setSubCount] = useState(0);
  const [promotedCount, setPromotedCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // 确保时间暂停
      setIsRunning(false);
    }, [setIsRunning])
  );

  useEffect(() => {
    if (!save) return;
    getSubordinates(save.id).then(subs => {
      setSubCount(subs.length);
      // 晋升过的下属：subLevel >= 2（初始为1，被提拔后 >=2）
      setPromotedCount(subs.filter(s => s.subLevel >= 2).length);
    });
  }, [save]);

  const handleRestart = async () => {
    if (!save) return;
    setIsDeleting(true);
    await deleteSave(save.id);
    setIsRunning(false);
    await supabase.auth.signOut();
    router.replace('/(auth)/sign-in');
  };

  if (isLoading || !save) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a2740' }}>
        <ActivityIndicator size="large" color="#C8A84B" />
      </View>
    );
  }

  const careerYears = calcCareerYears(save.gameDays);
  const retireDate = gameDaysToDate(save.gameDays);
  const retireCfg = getRetirementConfig(save.rankLevel);
  const benefits = getRetirementBenefits(save.rankLevel);
  const moralEval = getMoralLabel(save.moralValue);
  const meritEval = getMeritLabel(save.meritPoints, save.rankLevel);
  const familyEval = getFamilyLabel(save.familyHappiness ?? 0);
  const avatarEmoji = getAvatarEmoji(save.avatarId, save.playerGender);
  const avatarBg = getAvatarBgColor(save.avatarId, 'pragmatic');
  // §4.8 派系结局判定
  const factionEnding = evaluateFactionEnding(
    save.factionInfluence ?? 0,
    save.purgeCount ?? 0,
    !!save.primaryFaction,
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#0E1B2D' }}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* 顶部英雄区 */}
        <View style={{
          backgroundColor: '#162338',
          paddingTop: insets.top + 8, paddingBottom: 32,
          paddingHorizontal: 24,
          alignItems: 'center',
          gap: 14,
          borderBottomWidth: 1,
          borderBottomColor: '#C8A84B44',
        }}>
          {/* 头像 */}
          <View style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: avatarBg,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 3, borderColor: '#C8A84B',
          }}>
            <Text style={{ fontSize: 40 }}>{avatarEmoji}</Text>
          </View>

          {/* 名称与职务 */}
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#F0E8D0', letterSpacing: 2 }}>
              {save.playerName}
            </Text>
            <Text style={{ fontSize: 13, color: '#C8A84B', letterSpacing: 1 }}>
              {save.rankName}  ·  {save.playerGender}  ·  {save.playerAge}岁
            </Text>
            <Text style={{ fontSize: 11, color: '#8899AA', marginTop: 2 }}>
              📅 退休日期：{retireDate}
            </Text>
          </View>

          {/* 功成身退横幅 */}
          <View style={{
            backgroundColor: '#C8A84B22', borderRadius: 2,
            borderWidth: 1, borderColor: '#C8A84B66',
            paddingVertical: 8, paddingHorizontal: 20,
            marginTop: 4,
          }}>
            <Text style={{ fontSize: 15, color: '#C8A84B', fontWeight: '700', letterSpacing: 3 }}>
              ✦  功成身退  ·  垂范后世  ✦
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 16 }}>
          {/* 仕途概览 */}
          <View style={{
            backgroundColor: '#1C2E45', borderRadius: 4,
            borderWidth: 1, borderColor: '#2D4A6B',
            overflow: 'hidden',
          }}>
            <View style={{ backgroundColor: '#2B4B6F', paddingVertical: 10, paddingHorizontal: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#C8E0F4', letterSpacing: 1 }}>
                ◆ 仕途历程总览
              </Text>
            </View>
            <View style={{ padding: 16, gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <SummaryItem label="仕途年数" value={`${careerYears} 年`} color="#C8A84B" />
                <SummaryItem label="最终职级" value={retireCfg.tier} color="#C8E0F4" />
                <SummaryItem label="最终职务" value={save.rankName} color="#C8E0F4" />
                <SummaryItem label="末任城市" value={save.cityName} color="#88BBDD" />
              </View>
            </View>
          </View>

          {/* 政绩与民心 */}
          <View style={{
            backgroundColor: '#1C2E45', borderRadius: 4,
            borderWidth: 1, borderColor: '#2D4A6B',
            overflow: 'hidden',
          }}>
            <View style={{ backgroundColor: '#2B4B6F', paddingVertical: 10, paddingHorizontal: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#C8E0F4', letterSpacing: 1 }}>
                ◆ 为政评鉴
              </Text>
            </View>
            <View style={{ padding: 16, gap: 12 }}>
              <EvalRow
                label="累计政绩"
                value={`${Math.floor(save.meritPoints)} 分`}
                evalLabel={meritEval.label}
                evalColor={meritEval.color}
              />
              <EvalRow
                label="民心操守"
                value={`${save.moralValue} / 100`}
                evalLabel={moralEval.label}
                evalColor={moralEval.color}
              />
              <EvalRow
                label="家庭生活"
                value={`幸福度 ${save.familyHappiness ?? 0}`}
                evalLabel={familyEval.label}
                evalColor={familyEval.color}
              />
              <EvalRow
                label="个人积蓄"
                value={formatMoney(save.personalSavings ?? 0)}
                evalLabel="从政所得"
                evalColor="#888"
              />
            </View>
          </View>

          {/* 干部培养 */}
          <View style={{
            backgroundColor: '#1C2E45', borderRadius: 4,
            borderWidth: 1, borderColor: '#2D4A6B',
            overflow: 'hidden',
          }}>
            <View style={{ backgroundColor: '#2B4B6F', paddingVertical: 10, paddingHorizontal: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#C8E0F4', letterSpacing: 1 }}>
                ◆ 干部培养成果
              </Text>
            </View>
            <View style={{ padding: 16, gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
                <SummaryItem label="管辖下属" value={`${subCount} 人`} color="#88BBDD" />
                <SummaryItem label="提拔晋升" value={`${promotedCount} 人`} color="#2a7a3b" />
              </View>
              <Text style={{ fontSize: 11, color: '#6688AA', lineHeight: 18, marginTop: 4 }}>
                您培养的干部将继续为党和国家事业服务，薪火相传，政治遗产长存。
              </Text>
            </View>
          </View>

          {/* 派系终局（§4.8） */}
          <View style={{
            backgroundColor: '#1C2E45', borderRadius: 4,
            borderWidth: 1, borderColor: factionEnding.color + '66',
            overflow: 'hidden',
          }}>
            <View style={{ backgroundColor: factionEnding.color + '33', paddingVertical: 10, paddingHorizontal: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: factionEnding.color, letterSpacing: 1 }}>
                ◆ 派系终局
              </Text>
            </View>
            <View style={{ padding: 16, gap: 8 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: factionEnding.color }}>{factionEnding.title}</Text>
              <Text style={{ fontSize: 12, color: '#AABDD0', lineHeight: 20 }}>{factionEnding.desc}</Text>
              <Text style={{ fontSize: 11, color: '#6688AA', lineHeight: 18 }}>
                派系影响力 {save.factionInfluence ?? 0} · 账目留痕 {save.purgeCount ?? 0} 次
              </Text>
            </View>
          </View>

          {/* 退休待遇 */}
          <View style={{
            backgroundColor: '#1C2E45', borderRadius: 4,
            borderWidth: 1, borderColor: '#C8A84B44',
            overflow: 'hidden',
          }}>
            <View style={{ backgroundColor: '#3A3010', paddingVertical: 10, paddingHorizontal: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#C8A84B', letterSpacing: 1 }}>
                ◆ 退休后政治待遇
              </Text>
            </View>
            <View style={{ padding: 16, gap: 8 }}>
              {benefits.map((b, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                  <Text style={{ color: '#C8A84B', fontSize: 12, marginTop: 1 }}>✦</Text>
                  <Text style={{ fontSize: 12, color: '#AABDD0', lineHeight: 20, flex: 1 }}>{b}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 结语 */}
          <View style={{
            backgroundColor: '#12202F', borderRadius: 4,
            borderWidth: 1, borderColor: '#C8A84B33',
            padding: 20, alignItems: 'center', gap: 8,
          }}>
            <Text style={{ fontSize: 14, color: '#C8A84B', letterSpacing: 2, fontWeight: '700' }}>
              「居庙堂之高则忧其民，处江湖之远则忧其君」
            </Text>
            <Text style={{ fontSize: 11, color: '#5A7A99', textAlign: 'center', lineHeight: 18 }}>
              {save.playerName}同志，您以{careerYears}年如一日的奉献精神，{'\n'}
              书写了属于自己的政途传奇。
            </Text>
          </View>

          {/* 操作按钮 */}
          <View style={{ gap: 10, marginTop: 8 }}>
            <RestartBtn onPress={handleRestart} isDeleting={isDeleting} />
            <SignOutBtn onPress={async () => {
              await supabase.auth.signOut();
              router.replace('/(auth)/sign-in');
            }} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/** 概览数据项 */
function SummaryItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', minWidth: 80 }}>
      <Text style={{ fontSize: 10, color: '#6688AA', marginBottom: 2 }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: '700', color }}>{value}</Text>
    </View>
  );
}

/** 评鉴行 */
function EvalRow({
  label, value, evalLabel, evalColor,
}: {
  label: string; value: string; evalLabel: string; evalColor: string;
}) {
  return (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1E3050',
    }}>
      <Text style={{ fontSize: 12, color: '#7799BB' }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 13, color: '#C8E0F4', fontVariant: ['tabular-nums'] }}>{value}</Text>
        <View style={{
          backgroundColor: evalColor + '22', borderRadius: 2,
          paddingHorizontal: 6, paddingVertical: 2,
          borderWidth: 1, borderColor: evalColor + '55',
        }}>
          <Text style={{ fontSize: 10, color: evalColor, fontWeight: '700' }}>{evalLabel}</Text>
        </View>
      </View>
    </View>
  );
}

/** 重新开始按钮 */
function RestartBtn({ onPress, isDeleting }: { onPress: () => void; isDeleting: boolean }) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      disabled={isDeleting}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        backgroundColor: pressed ? '#8A1418' : '#7A1B1E',
        paddingVertical: 14, alignItems: 'center', borderRadius: 4,
        opacity: isDeleting ? 0.6 : 1,
      }}
    >
      {isDeleting ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 1 }}>
          🔄  重新开始仕途
        </Text>
      )}
    </Pressable>
  );
}

/** 退出游戏按钮 */
function SignOutBtn({ onPress }: { onPress: () => void }) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        backgroundColor: pressed ? '#0E1B2D' : 'transparent',
        paddingVertical: 14, alignItems: 'center', borderRadius: 4,
        borderWidth: 1, borderColor: '#2D4A6B',
      }}
    >
      <Text style={{ color: '#6688AA', fontSize: 14, letterSpacing: 1 }}>
        退出游戏
      </Text>
    </Pressable>
  );
}
```

<a id="srcappappsaveselecttsx"></a>
## `src/app/(app)/save-select.tsx`

```tsx
// 存档选择中转页：登录后选择/新建/删除存档，再进入游戏
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/client/supabase';
import { useSession } from '@/ctx';
import {
  listSaves, createSave, deleteSave, getSaveById,
  setActiveSaveLocal, getActiveSaveLocal, clearActiveSaveLocal,
} from '@/db/gameApi';
import type { PlayerSave } from '@/types/game';

const MAX_SAVES = 5;

const C = {
  bg: '#07111E', card: '#0F2235', gold: '#C8A84B', goldLight: '#E8D08A',
  red: '#C82829', green: '#2a7a3b', blue: '#2B4B6F',
  textPrimary: '#EDE8DC', textSecond: '#A09070', textHint: '#5A5040',
  divider: '#162840', border: '#1E3A5A',
};

function tenureText(gameDays: number): string {
  const years = Math.floor(gameDays / 365);
  const months = Math.floor((gameDays % 365) / 30);
  return `${years}年${months}月`;
}

export default function SaveSelectScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useSession();
  const [saves, setSaves] = useState<PlayerSave[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const accountLabel = session?.user?.email || session?.user?.id || '当前账号';

  const refresh = useCallback(async () => {
    setLoading(true);
    const list = await listSaves();
    setSaves(list);
    setActiveId(getActiveSaveLocal());
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // 删除二次确认：3 秒倒计时防误删
  useEffect(() => {
    if (!confirmId) return;
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timer); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [confirmId]);

  const enter = async (s: PlayerSave) => {
    // 偏好档校验：若该档已被删（加载失败），清除偏好并停留在选择页重新列档
    const fresh = await getSaveById(s.id);
    if (!fresh) {
      clearActiveSaveLocal();
      await refresh();
      return;
    }
    setActiveSaveLocal(fresh.id);
    if (fresh.needsCharacterCreation) {
      router.replace('/(app)/character-create');
    } else {
      router.replace('/(app)/home');
    }
  };

  const createNew = async () => {
    if (saves.length >= MAX_SAVES || creating) return;
    setCreating(true);
    const s = await createSave();
    setCreating(false);
    if (s) {
      setActiveSaveLocal(s.id);
      router.replace('/(app)/character-create');
    }
  };

  const confirmDelete = async () => {
    if (!confirmId) return;
    setDeleting(true);
    const ok = await deleteSave(confirmId);
    if (ok && confirmId === getActiveSaveLocal()) clearActiveSaveLocal();
    setConfirmId(null);
    setDeleting(false);
    await refresh();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/sign-in');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <StatusBar style="light" />

      {/* 顶部标题栏 */}
      <View style={{ backgroundColor: C.card, borderBottomWidth: 2, borderBottomColor: C.gold, paddingHorizontal: 16, paddingVertical: 14 }}>
        <Text style={{ color: C.goldLight, fontSize: 18, fontWeight: '700', letterSpacing: 3 }}>选择存档</Text>
        <Text style={{ color: C.textSecond, fontSize: 12, marginTop: 4 }}>当前账号：{accountLabel}</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.gold} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 12 }} showsVerticalScrollIndicator={false}>
          {saves.length === 0 ? (
            <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderTopWidth: 2, borderTopColor: C.gold, padding: 28, alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 40 }}>📜</Text>
              <Text style={{ color: C.textPrimary, fontSize: 15, fontWeight: '700' }}>暂无存档</Text>
              <Text style={{ color: C.textSecond, fontSize: 12, textAlign: 'center' }}>点击下方「新建存档」开启你的仕途</Text>
            </View>
          ) : (
            saves.map((s) => {
              const isCurrent = s.id === activeId;
              return (
                <View key={s.id} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: isCurrent ? C.gold : C.border, borderTopWidth: 2, borderTopColor: isCurrent ? C.gold : C.divider, padding: 14, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ color: C.goldLight, fontSize: 16, fontWeight: '700' }}>{s.playerName || '未命名'}</Text>
                      {s.needsCharacterCreation ? (
                        <View style={{ backgroundColor: C.red, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ color: '#fff', fontSize: 10 }}>待捏脸</Text>
                        </View>
                      ) : null}
                      {isCurrent ? (
                        <View style={{ backgroundColor: C.green, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ color: '#fff', fontSize: 10 }}>当前</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={{ color: C.textHint, fontSize: 10 }}>
                      {s.createdAt ? new Date(s.createdAt).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    <Text style={{ color: C.textSecond, fontSize: 12 }}>职务：{s.playerPosition || s.rankName || '-'}</Text>
                    <Text style={{ color: C.textSecond, fontSize: 12 }}>城市：{s.cityName || '-'}</Text>
                    <Text style={{ color: C.textSecond, fontSize: 12 }}>宦龄：{tenureText(s.gameDays)}</Text>
                  </View>

                  {confirmId === s.id ? (
                    <View style={{ backgroundColor: 'rgba(200,40,41,0.12)', borderWidth: 1, borderColor: C.red, padding: 10, gap: 8 }}>
                      <Text style={{ color: C.red, fontSize: 12, fontWeight: '700' }}>确认删除该存档？此操作不可恢复。</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable
                          cssInterop={false}
                          disabled={countdown > 0 || deleting}
                          onPress={confirmDelete}
                          style={{ flex: 1, backgroundColor: countdown > 0 ? '#5a2020' : C.red, paddingVertical: 9, alignItems: 'center' }}
                        >
                          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{deleting ? '删除中...' : countdown > 0 ? `确认删除(${countdown}s)` : '确认删除'}</Text>
                        </Pressable>
                        <Pressable cssInterop={false} onPress={() => setConfirmId(null)} style={{ flex: 1, borderWidth: 1, borderColor: C.border, paddingVertical: 9, alignItems: 'center' }}>
                          <Text style={{ color: C.textSecond, fontWeight: '700', fontSize: 12 }}>取消</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable cssInterop={false} onPress={() => enter(s)} style={{ flex: 1, backgroundColor: C.gold, paddingVertical: 10, alignItems: 'center' }}>
                        <Text style={{ color: '#07111E', fontWeight: '700', fontSize: 13 }}>进入</Text>
                      </Pressable>
                      <Pressable cssInterop={false} onPress={() => setConfirmId(s.id)} style={{ backgroundColor: 'transparent', borderWidth: 1, borderColor: C.red, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' }}>
                        <Text style={{ color: C.red, fontWeight: '700', fontSize: 13 }}>删除</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })
          )}

          {/* 新建存档 */}
          <Pressable
            cssInterop={false}
            disabled={saves.length >= MAX_SAVES || creating}
            onPress={createNew}
            style={{ backgroundColor: saves.length >= MAX_SAVES ? '#2a3540' : C.blue, paddingVertical: 14, alignItems: 'center', opacity: saves.length >= MAX_SAVES ? 0.7 : 1 }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
              {creating ? '创建中...' : saves.length >= MAX_SAVES ? `存档已满（${MAX_SAVES}/${MAX_SAVES}）` : '＋ 新建存档'}
            </Text>
          </Pressable>

          {/* 退出登录 */}
          <Pressable cssInterop={false} onPress={logout} style={{ paddingVertical: 12, alignItems: 'center' }}>
            <Text style={{ color: C.textHint, fontSize: 12 }}>退出登录</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}
```

<a id="srcappappsciencetechtsx"></a>
## `src/app/(app)/science-tech.tsx`

```tsx
// 科技委页面 — rank13+解锁，科技投入 → 研发方向 → 成果转化 → 国力提升
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { formatMoney } from '@/types/game';

interface ResearchDir {
  id: string;
  icon: string;
  name: string;
  desc: string;
  cost: number;         // 每次投入消耗资金（万元）
  progressPerAct: number;
  gdpBonus: number;
  businessBonus: number;
  ecologyBonus: number;
  meritReward: number;
}

const RESEARCH_DIRS: ResearchDir[] = [
  { id: 'ai',       icon: '🤖', name: '人工智能与大数据',   desc: '发展AI算法、算力基础设施，推动数字经济高质量发展',        cost: 500,  progressPerAct: 12, gdpBonus: 3, businessBonus: 4, ecologyBonus: 0, meritReward: 20 },
  { id: 'space',    icon: '🚀', name: '航天与深空探测',     desc: '推进载人航天、月球探测及深空探测任务，彰显国家战略实力',   cost: 800,  progressPerAct: 8,  gdpBonus: 2, businessBonus: 2, ecologyBonus: 0, meritReward: 30 },
  { id: 'bio',      icon: '🧬', name: '生物医药与生命科学', desc: '攻关核心医药技术，提升医疗卫生保障水平与生物安全能力',     cost: 400,  progressPerAct: 15, gdpBonus: 1, businessBonus: 2, ecologyBonus: 2, meritReward: 18 },
  { id: 'energy',   icon: '⚡', name: '新能源与氢能技术',   desc: '加速光伏、风电、氢能产业化，推动能源结构绿色低碳转型',    cost: 350,  progressPerAct: 14, gdpBonus: 2, businessBonus: 1, ecologyBonus: 5, meritReward: 16 },
  { id: 'chip',     icon: '💻', name: '芯片与集成电路',     desc: '突破卡脖子技术，打造自主可控的芯片产业生态',              cost: 600,  progressPerAct: 10, gdpBonus: 4, businessBonus: 3, ecologyBonus: 0, meritReward: 25 },
  { id: 'quantum',  icon: '⚛️', name: '量子科技',           desc: '推进量子通信、量子计算等前沿技术，保障国家信息安全',       cost: 700,  progressPerAct: 9,  gdpBonus: 2, businessBonus: 2, ecologyBonus: 0, meritReward: 28 },
  { id: 'ocean',    icon: '🌊', name: '海洋科技',           desc: '发展深海探测、海洋资源开发技术，维护海洋权益',            cost: 450,  progressPerAct: 12, gdpBonus: 2, businessBonus: 2, ecologyBonus: 3, meritReward: 18 },
  { id: 'agri',     icon: '🌾', name: '农业生物技术',       desc: '培育高产优质品种，保障国家粮食安全底线',                  cost: 280,  progressPerAct: 16, gdpBonus: 1, businessBonus: 1, ecologyBonus: 2, meritReward: 14 },
];

export default function SciTechScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, isLoading, updateGameSave } = useGame();
  const [acting, setActing] = useState(false);
  const [result, setResult] = useState('');
  const [selectedDir, setSelectedDir] = useState<string | null>(null);

  if (isLoading || !save) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color="#1D3B5E" /></View>;
  }
  if (save.rankLevel < 13) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F7F7F5' }}>
        <Text style={{ fontSize: 32, marginBottom: 12 }}>🔬</Text>
        <Text style={{ fontSize: 15, color: '#888', textAlign: 'center' }}>晋升至国政院副院理（级别13）后解锁科技委职权</Text>
      </View>
    );
  }

  const currentDir = RESEARCH_DIRS.find(d => d.id === save.sciTechResearchDir);
  const progress = save.sciTechProgress ?? 0;
  const isConvertible = progress >= 100;

  const handleSelectDir = async (dir: ResearchDir) => {
    if (acting) return;
    if (save.sciTechResearchDir === dir.id) { setSelectedDir(dir.id); return; }
    // 切换研发方向时重置进度
    setActing(true);
    await updateGameSave({ sciTechResearchDir: dir.id, sciTechProgress: 0 });
    setSelectedDir(dir.id);
    setResult(`📐 已切换研发方向：${dir.name}`);
    setActing(false);
    setTimeout(() => setResult(''), 2500);
  };

  const handleInvest = async () => {
    if (acting || !currentDir) return;
    const cost = currentDir.cost * 10000; // 万元 → 元单位
    if (save.fundBalance < currentDir.cost) {
      setResult(`⚠️ 专项经费不足，需 ¥${formatMoney(cost)}`);
      setTimeout(() => setResult(''), 2500);
      return;
    }
    setActing(true);
    const newProgress = Math.min(100, progress + currentDir.progressPerAct);
    await updateGameSave({
      fundBalance: save.fundBalance - currentDir.cost,
      sciTechInvestTotal: (save.sciTechInvestTotal ?? 0) + currentDir.cost,
      sciTechProgress: newProgress,
      sciTechLastActDay: save.gameDays,
      meritPoints: save.meritPoints + currentDir.meritReward,
    });
    setResult(`✅ 投入 ¥${formatMoney(cost)}，研发进度 +${currentDir.progressPerAct}%，政绩 +${currentDir.meritReward}`);
    setActing(false);
    setTimeout(() => setResult(''), 3000);
  };

  const handleConvert = async () => {
    if (acting || !currentDir || !isConvertible) return;
    setActing(true);
    await updateGameSave({
      sciTechProgress: 0,
      cityGdp: Math.min(100, save.cityGdp + currentDir.gdpBonus),
      cityBusiness: Math.min(100, save.cityBusiness + currentDir.businessBonus),
      cityEcology: Math.min(100, save.cityEcology + currentDir.ecologyBonus),
      meritPoints: save.meritPoints + 50,
    });
    setResult(`🎉 成果转化完成！GDP+${currentDir.gdpBonus} 营商+${currentDir.businessBonus} 生态+${currentDir.ecologyBonus} 政绩+50`);
    setActing(false);
    setTimeout(() => setResult(''), 4000);
  };

  const totalInvest = save.sciTechInvestTotal ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F4F0' }}>
      <StatusBar style="light" backgroundColor="#0D2137" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#0D2137', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: '#aac', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, letterSpacing: 3 }}>国家科学技术委员会</Text>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>🔬 科技强国战略</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9 }}>总投入</Text>
          <Text style={{ color: '#5BD8FF', fontWeight: '700', fontSize: 13 }}>¥{formatMoney(totalInvest)}万</Text>
        </View>
      </View>

      {/* 状态栏 */}
      <View style={{ flexDirection: 'row', backgroundColor: '#1D3B5E', paddingVertical: 10, paddingHorizontal: 14, gap: 10 }}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ color: '#a0b4cc', fontSize: 9 }}>专项经费</Text>
          <Text style={{ color: '#FFD700', fontWeight: '700', fontSize: 13 }}>¥{formatMoney(save.fundBalance)}万</Text>
        </View>
        <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
        <View style={{ flex: 2, alignItems: 'center' }}>
          <Text style={{ color: '#a0b4cc', fontSize: 9 }}>当前研发方向</Text>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }} numberOfLines={1}>
            {currentDir ? `${currentDir.icon} ${currentDir.name}` : '— 请选择研发方向 —'}
          </Text>
        </View>
        <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ color: '#a0b4cc', fontSize: 9 }}>研发进度</Text>
          <Text style={{ color: isConvertible ? '#4CAF50' : '#5BD8FF', fontWeight: '700', fontSize: 13 }}>
            {progress}%{isConvertible ? ' ✅' : ''}
          </Text>
        </View>
      </View>

      <ScrollView contentInsetAdjustmentBehavior="automatic">

        {/* 进度条 + 操作按钮 */}
        {currentDir && (
          <View style={{ margin: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#D0D8E0', padding: 14, gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D3B5E' }}>{currentDir.icon} {currentDir.name}</Text>
              <Text style={{ fontSize: 11, color: '#888' }}>每次 ¥{formatMoney(currentDir.cost)}万</Text>
            </View>
            <Text style={{ fontSize: 11, color: '#666', lineHeight: 16 }}>{currentDir.desc}</Text>
            {/* 进度条 */}
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 10, color: '#888' }}>研发进度</Text>
                <Text style={{ fontSize: 10, color: '#1D3B5E', fontWeight: '700' }}>{progress} / 100</Text>
              </View>
              <View style={{ height: 8, backgroundColor: '#E0E8F0', borderRadius: 4 }}>
                <View style={{ width: `${progress}%`, height: 8, backgroundColor: isConvertible ? '#2a7a3b' : '#1D6EA8', borderRadius: 4 }} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
              {currentDir.gdpBonus > 0 && <View style={{ backgroundColor: '#EEF4FF', paddingHorizontal: 7, paddingVertical: 3 }}><Text style={{ fontSize: 9, color: '#1D3B5E' }}>成果：GDP +{currentDir.gdpBonus}</Text></View>}
              {currentDir.businessBonus > 0 && <View style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 7, paddingVertical: 3 }}><Text style={{ fontSize: 9, color: '#7B5E2A' }}>营商 +{currentDir.businessBonus}</Text></View>}
              {currentDir.ecologyBonus > 0 && <View style={{ backgroundColor: '#F0FAF0', paddingHorizontal: 7, paddingVertical: 3 }}><Text style={{ fontSize: 9, color: '#2a7a3b' }}>生态 +{currentDir.ecologyBonus}</Text></View>}
              <View style={{ backgroundColor: '#FFF0F0', paddingHorizontal: 7, paddingVertical: 3 }}><Text style={{ fontSize: 9, color: '#C82829' }}>政绩 +{currentDir.meritReward}/次</Text></View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Pressable
                onPress={handleInvest}
                disabled={acting || save.fundBalance < currentDir.cost || isConvertible}
                style={{ flex: 1, backgroundColor: isConvertible ? '#ccc' : (save.fundBalance >= currentDir.cost ? '#1D3B5E' : '#aaa'), paddingVertical: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
                  {acting ? '投入中…' : isConvertible ? '已完成研发' : '💰 投入研发经费'}
                </Text>
              </Pressable>
              {isConvertible && (
                <Pressable
                  onPress={handleConvert}
                  disabled={acting}
                  style={{ flex: 1, backgroundColor: '#2a7a3b', paddingVertical: 10, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>🚀 成果转化</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* 研发方向选择 */}
        <View style={{ paddingHorizontal: 14 }}>
          <Text style={{ fontSize: 11, color: '#888', fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>选择研发方向</Text>
          <View style={{ gap: 8 }}>
            {RESEARCH_DIRS.map(dir => {
              const isActive = save.sciTechResearchDir === dir.id;
              return (
                <Pressable
                  key={dir.id}
                  onPress={() => handleSelectDir(dir)}
                  style={{
                    backgroundColor: isActive ? '#EEF4FF' : '#fff',
                    borderWidth: isActive ? 1.5 : 1,
                    borderColor: isActive ? '#1D6EA8' : '#D8D8D8',
                    padding: 12,
                    flexDirection: 'row',
                    gap: 10,
                    alignItems: 'flex-start',
                  }}
                >
                  <Text style={{ fontSize: 22, width: 28, textAlign: 'center' }}>{dir.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: isActive ? '#1D3B5E' : '#333' }}>{dir.name}</Text>
                      {isActive && <View style={{ backgroundColor: '#1D3B5E', paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 9, color: '#fff' }}>当前方向</Text></View>}
                    </View>
                    <Text style={{ fontSize: 10, color: '#777', lineHeight: 15, marginTop: 2 }}>{dir.desc}</Text>
                    <Text style={{ fontSize: 10, color: '#C82829', marginTop: 3 }}>每次投入 ¥{formatMoney(dir.cost)}万 · 政绩 +{dir.meritReward}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 说明 */}
        <View style={{ margin: 14, backgroundColor: '#F0F4F8', padding: 12, borderLeftWidth: 3, borderLeftColor: '#1D3B5E' }}>
          <Text style={{ fontSize: 11, color: '#555', lineHeight: 17 }}>
            {'科技强国路线：选定研发方向 → 持续投入经费（每次+进度）→ 进度达100%后可「成果转化」提升国家综合实力指标。切换方向将清零当前进度。'}
          </Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* 反馈条 */}
      {!!result && (
        <View style={{ position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: '#0D2137', padding: 12, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{result}</Text>
        </View>
      )}
    </View>
  );
}
```
