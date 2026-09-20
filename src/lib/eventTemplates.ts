// 突发事件模板数据库（按职级分层）
// isMajor=true 的事件触发领导班子集体决策投票
import type { EventTemplate } from '@/types/game';

// ─────────────────────────────────────────────
// 乡镇级（rank 1-3）
// ─────────────────────────────────────────────
const EVENTS_TOWN: EventTemplate[] = [
  {
    type: 'opinion',
    title: '村民纠纷激化',
    description: '辖区两户村民因宅基地边界问题发生激烈争吵，聚集村民约三十余人，情绪激动，存在械斗风险，已有人拨打信访热线。',
    choices: [
      { text: '亲赴现场调解，组织村委会共同协商', meritChange: 15, moralChange: 5, gdpChange: 0, livelihoodChange: 8, ecologyChange: 0, businessChange: 0, description: '当场化解矛盾，民心凝聚，树立良好形象。' },
      { text: '委托村委会按规章处理，保持观望', meritChange: 5, moralChange: 0, gdpChange: 0, livelihoodChange: 2, ecologyChange: 0, businessChange: 0, description: '事件缓慢平息，但民众感觉缺乏关怀。' },
      { text: '移交派出所处理，不参与介入', meritChange: -5, moralChange: -5, gdpChange: 0, livelihoodChange: -5, ecologyChange: 0, businessChange: 0, description: '村民认为领导推诿，信访投诉增多。' },
    ],
  },
  {
    type: 'opinion',
    title: '基层信访集中',
    description: '本月辖区信访量激增，有群众反映农村低保发放不公正，多人结伴前往县信访办投诉，已引起县委关注。',
    choices: [
      { text: '主动约谈信访群众，开展低保专项核查', meritChange: 20, moralChange: 8, gdpChange: 0, livelihoodChange: 10, ecologyChange: 0, businessChange: 0, description: '问题查实整改，群众满意度上升。' },
      { text: '安排专职干部接访，分类处理诉求', meritChange: 8, moralChange: 3, gdpChange: 0, livelihoodChange: 4, ecologyChange: 0, businessChange: 0, description: '部分诉求得到回应，信访量有所下降。' },
      { text: '要求村委会自行协调，劝阻群众上访', meritChange: -10, moralChange: -10, gdpChange: 0, livelihoodChange: -8, ecologyChange: 0, businessChange: 0, description: '群众情绪恶化，越级上访至市级。' },
    ],
  },
  {
    type: 'disaster',
    title: '农村道路塌方',
    description: '连日暴雨后，辖区一条通村主干道发生塌方，交通中断，数个村庄出行受阻，农产品滞销，村民怨声载道。',
    choices: [
      { text: '紧急申请修缮经费，组织机械抢修', meritChange: 18, moralChange: 4, gdpChange: -5, livelihoodChange: 12, ecologyChange: 0, businessChange: -3, description: '道路迅速恢复通行，群众拍手称快。' },
      { text: '上报灾情等待县级拨款，临时绕行方案', meritChange: 7, moralChange: 0, gdpChange: -8, livelihoodChange: 3, ecologyChange: 0, businessChange: -5, description: '等待期间农损较大，但流程规范。' },
      { text: '仅发布绕行通知，暂不修缮', meritChange: -5, moralChange: -5, gdpChange: -10, livelihoodChange: -8, ecologyChange: 0, businessChange: -8, description: '村民强烈不满，集体投诉。' },
    ],
  },
  {
    type: 'security',
    title: '乡镇企业安全事故',
    description: '辖区一家小型化工厂发生轻微泄漏事故，无人员伤亡，但周边居民恐慌，要求关停该厂，工厂主坚决反对，双方对峙。',
    choices: [
      { text: '立即启动安全核查，责令停产整改', meritChange: 15, moralChange: 6, gdpChange: -5, livelihoodChange: 5, ecologyChange: 8, businessChange: -8, description: '安全隐患消除，民众放心，厂主配合。' },
      { text: '组织第三方检测，依结果处理', meritChange: 10, moralChange: 3, gdpChange: -3, livelihoodChange: 3, ecologyChange: 3, businessChange: -3, description: '程序正当，双方接受结果。' },
      { text: '维持现状，以经济发展为由驳回诉求', meritChange: -8, moralChange: -10, gdpChange: 3, livelihoodChange: -10, ecologyChange: -8, businessChange: 5, description: '民众持续上访，媒体介入，舆情恶化。' },
    ],
  },
  {
    type: 'economic',
    title: '村级换届选举纠纷',
    description: '村委会换届选举过程中出现选票争议，落选候选人声称存在拉票行为，组织数十名村民聚集抗议，要求重新选举。',
    choices: [
      { text: '成立核查小组，重新核验全部选票', meritChange: 18, moralChange: 10, gdpChange: 0, livelihoodChange: 5, ecologyChange: 0, businessChange: 0, description: '选举公信力得到维护，群众信服。' },
      { text: '宣布选举结果有效，安抚落选方', meritChange: 5, moralChange: -3, gdpChange: 0, livelihoodChange: -3, ecologyChange: 0, businessChange: 0, description: '事件暂平息但留有隐患，双方存在隔阂。' },
      { text: '强行压制诉求，以扰乱秩序为由处置', meritChange: -12, moralChange: -15, gdpChange: 0, livelihoodChange: -10, ecologyChange: 0, businessChange: 0, description: '被上级纪委关注，涉嫌打压民主权利。' },
    ],
  },
  {
    type: 'disaster',
    title: '农田水利纠纷',
    description: '上游村庄截流导致下游农田干旱，双方村民爆发冲突，农业损失严重，需要协调用水分配。',
    isMajor: true,
    choices: [
      { text: '召集两村代表与水利部门联合协商，制定用水分配方案', meritChange: 35, moralChange: 8, gdpChange: 5, livelihoodChange: 15, ecologyChange: 5, businessChange: 0, description: '建立长效机制，两村矛盾彻底化解，农业生产恢复正常。' },
      { text: '依据水利法规强制执行均等分水', meritChange: 20, moralChange: 3, gdpChange: 0, livelihoodChange: 8, ecologyChange: 3, businessChange: 0, description: '冲突平息，但上游村不满，留有隐患。' },
      { text: '向上级推卸责任，要求县水利局处理', meritChange: -10, moralChange: -8, gdpChange: -5, livelihoodChange: -10, ecologyChange: -5, businessChange: 0, description: '被批评失职，农业损失持续扩大。' },
    ],
  },
];

// ─────────────────────────────────────────────
// 县处级（rank 4-6）
// ─────────────────────────────────────────────
const EVENTS_COUNTY: EventTemplate[] = [
  {
    type: 'economic',
    title: '招商引资项目流产',
    description: '一家承诺投资5亿元的企业突然宣布撤资，理由是营商环境不理想，相关报道被媒体转载，县委问责压力巨大。',
    choices: [
      { text: '主动约谈企业负责人，提供专项政策支持', meritChange: 20, moralChange: 3, gdpChange: 5, livelihoodChange: 3, ecologyChange: 0, businessChange: 15, description: '企业重新考量，达成意向协议。' },
      { text: '公开回应媒体，说明县域发展优势', meritChange: 8, moralChange: 0, gdpChange: 0, livelihoodChange: 0, ecologyChange: 0, businessChange: 5, description: '舆论压力缓解，但投资未能挽回。' },
      { text: '低调处理，暗中压制相关报道', meritChange: -10, moralChange: -12, gdpChange: -3, livelihoodChange: 0, ecologyChange: 0, businessChange: -5, description: '被更多媒体追问，舆情进一步恶化。' },
    ],
  },
  {
    type: 'security',
    title: '学校食品安全事故',
    description: '县城一所中学爆发集体食物中毒，共62名学生送医，家长聚集医院闹事，教育局和卫生局相互推诿，事态升级。',
    choices: [
      { text: '亲赴医院慰问并成立联合调查组，第一时间公开通报', meritChange: 25, moralChange: 10, gdpChange: 0, livelihoodChange: 10, ecologyChange: 0, businessChange: 0, description: '处置及时透明，家长情绪平稳，舆论正面。' },
      { text: '召开紧急会议协调各部门，对外低调处理', meritChange: 10, moralChange: 2, gdpChange: 0, livelihoodChange: 5, ecologyChange: 0, businessChange: 0, description: '事态平息但外界观感一般。' },
      { text: '要求教育局独立处理，保持距离', meritChange: -15, moralChange: -10, gdpChange: 0, livelihoodChange: -8, ecologyChange: 0, businessChange: 0, description: '被家长投诉不作为，省级媒体介入。' },
    ],
  },
  {
    type: 'corruption',
    title: '工厂排污举报',
    description: '辖区一家重点税源企业被群众举报长期偷排污水，环保部门核查属实，但该企业是县财政重要来源，县委内部意见分歧。',
    isMajor: true,
    choices: [
      { text: '召开常委会研究，依法依规责令停产整改', meritChange: 30, moralChange: 12, gdpChange: -8, livelihoodChange: 8, ecologyChange: 20, businessChange: -5, description: '法治形象确立，生态改善，长期营商环境受益。' },
      { text: '给予限期整改期限，暂不停产', meritChange: 12, moralChange: -3, gdpChange: 3, livelihoodChange: 0, ecologyChange: 5, businessChange: 5, description: '短期经济未受损，但环保问题未彻底解决。' },
      { text: '以经济利益为由压下不处理', meritChange: -20, moralChange: -20, gdpChange: 5, livelihoodChange: -5, ecologyChange: -15, businessChange: 3, description: '被省级环保督察组点名，面临问责。' },
    ],
  },
  {
    type: 'opinion',
    title: '旧城改造拆迁矛盾',
    description: '县城旧改项目拆迁工作中，有12户居民拒绝签约，声称补偿标准过低，引发网络关注，相关视频播放量过百万。',
    choices: [
      { text: '启动第三方评估，提高补偿标准，组织公开协商', meritChange: 22, moralChange: 8, gdpChange: 5, livelihoodChange: 8, ecologyChange: 0, businessChange: 8, description: '矛盾化解，项目推进，获民众认可。' },
      { text: '维持原方案，加强法律宣传耐心疏导', meritChange: 8, moralChange: -2, gdpChange: 3, livelihoodChange: 0, ecologyChange: 0, businessChange: 3, description: '部分居民接受，但舆论关注持续。' },
      { text: '强制推进拆迁，动用法律手段驱离', meritChange: -18, moralChange: -20, gdpChange: 8, livelihoodChange: -15, ecologyChange: 0, businessChange: 5, description: '引发大规模抗议，被媒体列为典型负面案例。' },
    ],
  },
  {
    type: 'corruption',
    title: '教育经费挪用举报',
    description: '县教育局一名科长被举报挪用上千万教育专项经费用于违规投资，相关证据已流出，家长群体情绪激愤。',
    isMajor: true,
    choices: [
      { text: '召开常委会，移送纪委立案，公开通报处理结果', meritChange: 40, moralChange: 15, gdpChange: 0, livelihoodChange: 10, ecologyChange: 0, businessChange: 0, description: '重拳反腐，赢得群众极大信任，上级通报表扬。' },
      { text: '内部核查，低调处理，避免舆论扩大', meritChange: 10, moralChange: -5, gdpChange: 0, livelihoodChange: 0, ecologyChange: 0, businessChange: 0, description: '短期平息，但被质疑包庇，留下隐患。' },
      { text: '以证据不足为由暂缓处理', meritChange: -25, moralChange: -25, gdpChange: 0, livelihoodChange: -8, ecologyChange: 0, businessChange: 0, description: '被上级纪委直接介入调查，连带问责。' },
    ],
  },
  {
    type: 'disaster',
    title: '县城内涝应急',
    description: '暴雨导致县城主城区严重内涝，多条主干道积水超1米，数百辆车被淹，群众强烈要求追责城市规划问题。',
    choices: [
      { text: '启动应急预案，亲赴现场统一指挥排涝', meritChange: 20, moralChange: 6, gdpChange: -5, livelihoodChange: 10, ecologyChange: -3, businessChange: -5, description: '处置高效，灾损降至最低，形象加分。' },
      { text: '协调城建局与气象局开展灾后评估', meritChange: 8, moralChange: 2, gdpChange: -8, livelihoodChange: 3, ecologyChange: -3, businessChange: -8, description: '处置平稳但缺乏担当形象。' },
      { text: '推责于规划局，要求追溯历史问题', meritChange: -8, moralChange: -8, gdpChange: -10, livelihoodChange: -8, ecologyChange: -5, businessChange: -10, description: '互相推诿，群众怒火高涨，媒体批评。' },
    ],
  },
];

// ─────────────────────────────────────────────
// 地厅级（rank 7-9）
// ─────────────────────────────────────────────
const EVENTS_CITY: EventTemplate[] = [
  {
    type: 'economic',
    title: 'GDP增速下滑',
    description: '本季度地区GDP增速跌破全省平均水平，排名落至倒数第三，省委主要领导点名要求市委书记赴省汇报情况。',
    choices: [
      { text: '召开经济分析会，推出针对性稳增长方案', meritChange: 25, moralChange: 3, gdpChange: 10, livelihoodChange: 5, ecologyChange: 0, businessChange: 8, description: '政策精准发力，下季度增速明显回升。' },
      { text: '赴省诚恳汇报，争取专项支持政策', meritChange: 12, moralChange: 0, gdpChange: 5, livelihoodChange: 0, ecologyChange: 0, businessChange: 5, description: '获得省级政策倾斜，形势逐步好转。' },
      { text: '以客观因素为由解释，请求延期考核', meritChange: -5, moralChange: -5, gdpChange: 0, livelihoodChange: 0, ecologyChange: 0, businessChange: 0, description: '省委对推责态度不满，问责压力持续。' },
    ],
  },
  {
    type: 'security',
    title: '跨县群体性事件',
    description: '两县交界处数百名农民因环境污染问题聚集抗议，人数持续增加，已有激进者冲击县政府大门，局势危急。',
    isMajor: true,
    choices: [
      { text: '召开市常委会研判形势，带队赴现场对话疏导，同步启动污染整治', meritChange: 40, moralChange: 10, gdpChange: -5, livelihoodChange: 12, ecologyChange: 15, businessChange: -5, description: '沉着应对，化解危机，省委批示表扬。' },
      { text: '启动应急预案，加派警力维稳，同步追责污染源', meritChange: 20, moralChange: 0, gdpChange: -3, livelihoodChange: 5, ecologyChange: 8, businessChange: -3, description: '局势控制，但被批评处置偏硬。' },
      { text: '等待省级介入，以超出权限为由推卸责任', meritChange: -30, moralChange: -15, gdpChange: -5, livelihoodChange: -10, ecologyChange: -5, businessChange: -5, description: '事态恶化，省委直接派工作组接管，严厉批评。' },
    ],
  },
  {
    type: 'security',
    title: '重大刑事案件',
    description: '市区发生一起持刀伤人案，造成3死5伤，案犯在逃，社会恐慌蔓延，媒体追问市委市政府的治安举措。',
    choices: [
      { text: '第一时间召开新闻发布会，宣布限期破案并强化巡逻部署', meritChange: 22, moralChange: 5, gdpChange: 0, livelihoodChange: 8, ecologyChange: 0, businessChange: -5, description: '48小时内告破，市民安心，形象大幅提升。' },
      { text: '全力配合公安侦破，对外保持低调', meritChange: 10, moralChange: 3, gdpChange: 0, livelihoodChange: 3, ecologyChange: 0, businessChange: -3, description: '案件告破，但社会安全感恢复慢。' },
      { text: '将压力完全转嫁给公安局，不予置评', meritChange: -10, moralChange: -8, gdpChange: 0, livelihoodChange: -8, ecologyChange: 0, businessChange: -8, description: '被批评推诿，公安系统士气受损。' },
    ],
  },
  {
    type: 'economic',
    title: '地区债务危机',
    description: '城投公司债务违约信号出现，评级机构下调地方信用评级，已有债权人登门催债，银行收紧授信，财政压力骤增。',
    isMajor: true,
    choices: [
      { text: '召开常委会研究化债方案，引入省级国有资本注资', meritChange: 35, moralChange: 5, gdpChange: -5, livelihoodChange: 3, ecologyChange: 0, businessChange: 5, description: '危机有序化解，信用评级恢复，省委给予充分肯定。' },
      { text: '组建化债工作组，争取债务展期协议', meritChange: 18, moralChange: 3, gdpChange: -8, livelihoodChange: 0, ecologyChange: 0, businessChange: -3, description: '短期风险缓释，但长期问题未解决。' },
      { text: '压制消息，避免债务问题公开扩散', meritChange: -25, moralChange: -18, gdpChange: -10, livelihoodChange: -5, ecologyChange: 0, businessChange: -10, description: '危机持续发酵，被省财政厅通报预警。' },
    ],
  },
  {
    type: 'corruption',
    title: '议政代表联名质询',
    description: '本市20名议政代表联名提出质询，指出市政工程建设存在系统性腐败嫌疑，相关质询材料已提交省议政院监督委。',
    isMajor: true,
    choices: [
      { text: '正式出席议政院会议作答，承诺启动独立核查并向省纪委汇报', meritChange: 38, moralChange: 15, gdpChange: 0, livelihoodChange: 8, ecologyChange: 0, businessChange: 0, description: '以负责任姿态回应监督，问题彻查，获省议政院肯定。' },
      { text: '组织内部审计，在议政院层面寻求解释', meritChange: 15, moralChange: 3, gdpChange: 0, livelihoodChange: 0, ecologyChange: 0, businessChange: 0, description: '代表暂时接受，但监督压力持续。' },
      { text: '以程序问题为由拖延答复时间', meritChange: -20, moralChange: -15, gdpChange: 0, livelihoodChange: -5, ecologyChange: 0, businessChange: 0, description: '被省议政院要求限时回应，舆论高度关注。' },
    ],
  },
  {
    type: 'economic',
    title: '省属重点企业亏损问责',
    description: '省政府直属一家在本市注册的国有企业连续三年亏损，省国资委要求市委协助展开问责，涉及市国资局官员多人。',
    choices: [
      { text: '积极配合省级调查，同步推动企业改革重组', meritChange: 18, moralChange: 8, gdpChange: -3, livelihoodChange: 3, ecologyChange: 0, businessChange: 3, description: '配合有力，省级肯定，企业走上正轨。' },
      { text: '配合调查的同时力争保留部分市级利益', meritChange: 8, moralChange: -3, gdpChange: 0, livelihoodChange: 0, ecologyChange: 0, businessChange: 0, description: '平稳过渡，但被批评立场不够坚定。' },
      { text: '以维稳为由拖延配合', meritChange: -15, moralChange: -12, gdpChange: -3, livelihoodChange: -3, ecologyChange: 0, businessChange: -5, description: '省国资委绕开市委直接处理，面子尽失。' },
    ],
  },
];

// ─────────────────────────────────────────────
// 副部省级（rank 10-11）
// ─────────────────────────────────────────────
const EVENTS_PROVINCE: EventTemplate[] = [
  {
    type: 'economic',
    title: '省级财政赤字警报',
    description: '本年度省级财政预计缺口达800亿元，土地财政收入大幅萎缩，社保资金压力骤增，国政院财政部已介入关注。',
    isMajor: true,
    choices: [
      { text: '召开省常委会研究压减非刚性支出，同步向财政部汇报化解方案', meritChange: 45, moralChange: 8, gdpChange: -5, livelihoodChange: -3, ecologyChange: 0, businessChange: 3, description: '方案获中央认可，财政压力有序化解，获通报表扬。' },
      { text: '向国政院申请专项转移支付缓解压力', meritChange: 22, moralChange: 2, gdpChange: -8, livelihoodChange: -5, ecologyChange: 0, businessChange: 0, description: '争取到部分支持，问题缓解但未根本解决。' },
      { text: '加快出让土地回笼资金，压缩民生支出', meritChange: -15, moralChange: -12, gdpChange: 5, livelihoodChange: -15, ecologyChange: -10, businessChange: 5, description: '被国政院发改委点名批评，社会矛盾加剧。' },
    ],
  },
  {
    type: 'disaster',
    title: '重大环境污染事故',
    description: '省内一条主要河流发生大规模工业污染，波及三个地级市，数百万人饮水受威胁，中央环保督察组已宣布进驻。',
    isMajor: true,
    choices: [
      { text: '省委紧急部署，启动省级应急预案，书记省长同赴现场', meritChange: 50, moralChange: 12, gdpChange: -8, livelihoodChange: 8, ecologyChange: 20, businessChange: -8, description: '处置有力，中央通报肯定，树立负责任省委形象。' },
      { text: '协调相关市县迅速处置，争取在督察进驻前自查整改', meritChange: 25, moralChange: 3, gdpChange: -5, livelihoodChange: 3, ecologyChange: 10, businessChange: -5, description: '整改态度积极，被督察组评为"边查边改"典型。' },
      { text: '延迟上报，试图在中央督察前掩盖污染规模', meritChange: -40, moralChange: -25, gdpChange: 0, livelihoodChange: -10, ecologyChange: -15, businessChange: -5, description: '督察组掌握证据，中央通报批评，主要领导被问责。' },
    ],
  },
  {
    type: 'corruption',
    title: '省内腐败窝案爆发',
    description: '省纪委查明，省内一个地级市多名官员涉及系统性腐败，案件牵涉人数超百人，中纪委已派驻调查组，社会震动极大。',
    isMajor: true,
    choices: [
      { text: '全力配合中纪委调查，省委主动向中央汇报，启动系统整治', meritChange: 55, moralChange: 20, gdpChange: -3, livelihoodChange: 5, ecologyChange: 0, businessChange: 0, description: '以零容忍态度赢得中央高度信任，成为全国廉政建设典范。' },
      { text: '配合调查同时稳定干部队伍，防止工作瘫痪', meritChange: 25, moralChange: 8, gdpChange: -3, livelihoodChange: 0, ecologyChange: 0, businessChange: 0, description: '处置稳妥，省级秩序维持，获中央肯定。' },
      { text: '以稳定大局为由要求调查组放缓节奏', meritChange: -35, moralChange: -25, gdpChange: 0, livelihoodChange: -5, ecologyChange: 0, businessChange: 0, description: '被中央认定妨碍调查，主要领导被约谈。' },
    ],
  },
  {
    type: 'security',
    title: '重大工程事故',
    description: '省重点基础设施项目发生坍塌事故，造成15人死亡，工程违规问题被曝光，国家安监局和住建部联合调查组进驻。',
    isMajor: true,
    choices: [
      { text: '立即停工全面排查，省级领导赴现场，追责违规参建方', meritChange: 40, moralChange: 10, gdpChange: -5, livelihoodChange: 5, ecologyChange: 0, businessChange: -5, description: '第一时间止损，调查组评价省委态度坚决，获通报肯定。' },
      { text: '配合调查，向遇难者家属充分赔偿，低调推进整改', meritChange: 20, moralChange: 5, gdpChange: -3, livelihoodChange: 3, ecologyChange: 0, businessChange: -3, description: '事态平稳处置，但省级监管漏洞被指出。' },
      { text: '优先推进工期，对外最小化事故定性', meritChange: -40, moralChange: -30, gdpChange: 3, livelihoodChange: -10, ecologyChange: 0, businessChange: 0, description: '被国家调查组定性为瞒报，主要领导被撤职处分。' },
    ],
  },
  {
    type: 'economic',
    title: '外资大规模撤离',
    description: '省内多家跨国企业宣布将生产基地迁往东南亚，涉及就业岗位超10万个，省内经济学家公开批评营商环境恶化。',
    isMajor: true,
    choices: [
      { text: '召开省营商环境紧急整治会，省长亲自约谈外资代表', meritChange: 38, moralChange: 5, gdpChange: 8, livelihoodChange: 5, ecologyChange: 0, businessChange: 20, description: '专项政策奏效，部分企业宣布暂缓撤离，营商信心回升。' },
      { text: '推出留商奖励政策，争取三年过渡期', meritChange: 18, moralChange: 0, gdpChange: 3, livelihoodChange: 0, ecologyChange: 0, businessChange: 10, description: '部分奏效，损失可控，但结构性问题未解决。' },
      { text: '以产业升级为名放任外资撤离', meritChange: -20, moralChange: -8, gdpChange: -10, livelihoodChange: -12, ecologyChange: 0, businessChange: -15, description: '就业大量流失，引发省内社会稳定问题。' },
    ],
  },
  {
    type: 'opinion',
    title: '省内重大群体性事件',
    description: '某市数千名工人因欠薪问题聚集，冲击市政府，现场警民对峙，事件在全国社交媒体引发广泛关注，中央高度重视。',
    isMajor: true,
    choices: [
      { text: '省委书记亲赴现场与工人代表对话，承诺7日内解决欠薪', meritChange: 50, moralChange: 15, gdpChange: -3, livelihoodChange: 15, ecologyChange: 0, businessChange: -3, description: '以担当化解危机，获中央高度评价，成全国样板。' },
      { text: '省政府迅速协调企业补发欠薪，同步维稳', meritChange: 22, moralChange: 5, gdpChange: -3, livelihoodChange: 8, ecologyChange: 0, businessChange: -3, description: '事件平息，舆论好转，但体制性问题待解。' },
      { text: '以警力强制清场，随后再谈赔偿', meritChange: -40, moralChange: -25, gdpChange: -3, livelihoodChange: -15, ecologyChange: 0, businessChange: -5, description: '激化矛盾，引发全国舆论强烈谴责，中央通报批评。' },
    ],
  },
];

// ─────────────────────────────────────────────
// 正部省级（rank 12-13）
// ─────────────────────────────────────────────
const EVENTS_MINISTRY: EventTemplate[] = [
  {
    type: 'economic',
    title: '部委政策执行重大争议',
    description: '主管部委推出一项新政策，引发全国多省市强烈反弹，数位省委书记联名致函国政院要求暂缓执行，政治风险极高。',
    isMajor: true,
    choices: [
      { text: '主动召集各省代表座谈，听取意见，提交国政院修订建议', meritChange: 50, moralChange: 10, gdpChange: 5, livelihoodChange: 8, ecologyChange: 0, businessChange: 10, description: '协调各方利益，政策优化后顺利推进，获总理批示表扬。' },
      { text: '坚持政策立场，选择性回应部分省份诉求', meritChange: 22, moralChange: 0, gdpChange: 3, livelihoodChange: 3, ecologyChange: 0, businessChange: 5, description: '政策推进，但地方摩擦持续。' },
      { text: '强势推行，压制异见声音', meritChange: -25, moralChange: -15, gdpChange: 0, livelihoodChange: -5, ecologyChange: 0, businessChange: -5, description: '被国政院叫停，主要领导被约谈批评。' },
    ],
  },
  {
    type: 'economic',
    title: '全国性行业系统性危机',
    description: '主管行业多家龙头企业同时陷入债务危机，牵涉数十万就业岗位和数千亿债务，国政院责成本部委提交三日内化解方案。',
    isMajor: true,
    choices: [
      { text: '组建跨部委应急专班，联合央行、发改委提出系统性化解方案', meritChange: 60, moralChange: 8, gdpChange: 8, livelihoodChange: 8, ecologyChange: 0, businessChange: 12, description: '方案获国政院批准，危机有序化解，部委获表彰。' },
      { text: '分批化解，优先保障就业，争取银行展期', meritChange: 30, moralChange: 3, gdpChange: 3, livelihoodChange: 5, ecologyChange: 0, businessChange: 5, description: '危机受控，国政院评价"处置合理"。' },
      { text: '寄希望于市场自我修复，延缓干预', meritChange: -40, moralChange: -15, gdpChange: -10, livelihoodChange: -10, ecologyChange: 0, businessChange: -12, description: '危机蔓延，国政院紧急派驻工作组，部委领导被问责。' },
    ],
  },
  {
    type: 'opinion',
    title: '重大外交摩擦',
    description: '主管部委发布的一份政策文件被多个国家解读为立场强硬，引发国际社会广泛争议，外交部向本部委施压要求澄清。',
    isMajor: true,
    choices: [
      { text: '主动与外交部协商，发布补充说明并开展外交沟通', meritChange: 45, moralChange: 8, gdpChange: 5, livelihoodChange: 3, ecologyChange: 0, businessChange: 8, description: '外交紧张消除，国际形象修复，获中央肯定。' },
      { text: '坚持政策解读，委托外交部处理国际舆论', meritChange: 15, moralChange: 0, gdpChange: 0, livelihoodChange: 0, ecologyChange: 0, businessChange: 0, description: '外交压力缓解，但摩擦未完全消除。' },
      { text: '拒绝修改立场，将责任推给对方国家误读', meritChange: -30, moralChange: -10, gdpChange: -5, livelihoodChange: -3, ecologyChange: 0, businessChange: -8, description: '外交局势升级，国政院被迫介入，本部委被批评处置不当。' },
    ],
  },
  {
    type: 'economic',
    title: '国有企业重组风波',
    description: '主管央企重组计划引发大规模员工抗议，工会发表公开声明，多家媒体追问重组是否存在国有资产流失，社会舆论沸腾。',
    isMajor: true,
    choices: [
      { text: '召开部委常委扩大会议，邀请职工代表参与讨论，公开透明推进重组', meritChange: 48, moralChange: 12, gdpChange: 5, livelihoodChange: 5, ecologyChange: 0, businessChange: 8, description: '重组方案优化，员工诉求吸纳，舆论转向正面，国政院通报表扬。' },
      { text: '加大安置补偿力度，快速推进重组', meritChange: 22, moralChange: 3, gdpChange: 5, livelihoodChange: -3, ecologyChange: 0, businessChange: 8, description: '效率优先，部分抗议平息，但舆论监督持续。' },
      { text: '强行推进，以维稳手段处理抗议', meritChange: -35, moralChange: -25, gdpChange: 3, livelihoodChange: -10, ecologyChange: 0, businessChange: 3, description: '引发全国性舆论批评，国政院介入处置，主要领导被约谈。' },
    ],
  },
  {
    type: 'opinion',
    title: '全国性社会舆论危机',
    description: '主管领域一起执法事件被拍摄并在网络广泛传播，质疑声浪迅速席卷全国，人民日报发表批评性评论，中枢宣传部约谈。',
    isMajor: true,
    choices: [
      { text: '第一时间认错，启动内部调查，责令违规人员停职', meritChange: 42, moralChange: 15, gdpChange: 0, livelihoodChange: 8, ecologyChange: 0, businessChange: 0, description: '坦诚担当，舆情快速平息，中央通报表扬处置得当。' },
      { text: '发表澄清声明，同步开展内部整顿', meritChange: 18, moralChange: 5, gdpChange: 0, livelihoodChange: 3, ecologyChange: 0, businessChange: 0, description: '危机可控，但外界对诚意存疑。' },
      { text: '以国家利益为由要求媒体撤稿，压制讨论', meritChange: -38, moralChange: -20, gdpChange: 0, livelihoodChange: -5, ecologyChange: 0, businessChange: 0, description: '引发更强烈反弹，中枢宣传部批评"处置失当"。' },
    ],
  },
  {
    type: 'economic',
    title: '科技领域国际封锁',
    description: '多国宣布联合封锁我国主管领域核心技术出口，涉及芯片、高端装备等关键环节，严重威胁产业链安全。',
    isMajor: true,
    choices: [
      { text: '召开部委紧急会议，启动国产替代攻关专项，联合发改委、财政部制定支持方案', meritChange: 55, moralChange: 8, gdpChange: -5, livelihoodChange: 3, ecologyChange: 0, businessChange: 8, description: '国产化攻关加速，中央高度肯定，部委获专项授权。' },
      { text: '通过外交和贸易谈判争取豁免，同步布局自主研发', meritChange: 28, moralChange: 3, gdpChange: 0, livelihoodChange: 0, ecologyChange: 0, businessChange: 5, description: '争取到部分缓冲时间，长期压力持续。' },
      { text: '以为时过早为由暂不启动国产替代，等待外交解决', meritChange: -28, moralChange: -10, gdpChange: -8, livelihoodChange: -5, ecologyChange: 0, businessChange: -10, description: '产业损失持续扩大，被国政院批评缺乏战略预判。' },
    ],
  },
];

// ─────────────────────────────────────────────
// 国家级（rank 14-15）
// ─────────────────────────────────────────────
const EVENTS_NATIONAL: EventTemplate[] = [
  {
    type: 'economic',
    title: '国际贸易战升级',
    description: '主要贸易伙伴宣布对我国商品加征高额关税，涉及金额超2万亿人民币，出口企业告急，就业冲击迅速显现，全球市场剧烈波动。',
    isMajor: true,
    choices: [
      { text: '召开中枢决策常委会紧急会议，发布反制清单同步启动多边磋商', meritChange: 60, moralChange: 8, gdpChange: 8, livelihoodChange: 5, ecologyChange: 0, businessChange: 15, description: '精准反制赢得主动，国际社会多方斡旋，危机有序化解，历史性外交胜利。' },
      { text: '先谈判争取缓冲期，同步扩大内需拉动增长', meritChange: 35, moralChange: 3, gdpChange: 3, livelihoodChange: 8, ecologyChange: 0, businessChange: 5, description: '损失可控，经济结构获得调整契机。' },
      { text: '保持克制，以静制动，寄望对方主动让步', meritChange: -25, moralChange: -8, gdpChange: -12, livelihoodChange: -8, ecologyChange: 0, businessChange: -15, description: '对方加大施压，经济损失持续扩大，国内批评声浪高涨。' },
    ],
  },
  {
    type: 'economic',
    title: '金融系统性风险',
    description: '国内多家大型商业银行同时出现流动性紧张，资本市场单日跌幅超8%，外资持续流出，央行向国政院紧急报告，触发系统性金融风险预警。',
    isMajor: true,
    choices: [
      { text: '召集央行、金融监管总局、财政部负责人联席研判，启动历史级别流动性注入', meritChange: 65, moralChange: 8, gdpChange: 10, livelihoodChange: 5, ecologyChange: 0, businessChange: 12, description: '危机48小时内受控，金融市场平稳，成功阻断系统性风险传导，载入政策史册。' },
      { text: '定向向问题机构注资，引导市场预期', meritChange: 35, moralChange: 3, gdpChange: 5, livelihoodChange: 3, ecologyChange: 0, businessChange: 8, description: '危机缓释，市场信心部分恢复。' },
      { text: '相信市场自我纠偏机制，暂不干预', meritChange: -45, moralChange: -15, gdpChange: -15, livelihoodChange: -10, ecologyChange: 0, businessChange: -18, description: '危机全面爆发，经济陷入衰退，历史性失职。' },
    ],
  },
  {
    type: 'disaster',
    title: '全国性重大自然灾害',
    description: '强烈地震波及五省，数百万人受灾，基础设施大规模受损，国际社会高度关注，救援物资和人力调配面临空前挑战。',
    isMajor: true,
    choices: [
      { text: '宣布进入国家紧急状态，统一调度全军及国家救援体系全力驰援', meritChange: 65, moralChange: 20, gdpChange: -5, livelihoodChange: 20, ecologyChange: -5, businessChange: -5, description: '救援创历史最快响应纪录，全国凝聚，国际高度赞誉，赢得史诗级政治信任。' },
      { text: '协调各省救援力量并行驰援，国政院成立前线指挥部', meritChange: 38, moralChange: 12, gdpChange: -8, livelihoodChange: 12, ecologyChange: -8, businessChange: -8, description: '救援有序，数十万人获救，获国际社会高度肯定。' },
      { text: '按常规程序逐级汇报处置，等待详细灾情评估', meritChange: -30, moralChange: -20, gdpChange: -10, livelihoodChange: -20, ecologyChange: -10, businessChange: -10, description: '救援黄金时间丧失，伤亡人数激增，成为历史性过失。' },
    ],
  },
  {
    type: 'security',
    title: '国家安全重大危机',
    description: '境外情报机构渗透国家核心机构的案件被证实，涉及国防与科技领域多个部门，国际舆论高度关注，内部整肃需要在维稳与效率间抉择。',
    isMajor: true,
    choices: [
      { text: '召集国家安全委员会全体会议，启动全面排查与系统性安全升级', meritChange: 58, moralChange: 12, gdpChange: -3, livelihoodChange: 3, ecologyChange: 0, businessChange: -5, description: '渗透网络彻底清除，安全体系系统升级，国家核心能力大幅强化。' },
      { text: '分步骤精准清查，将干扰降至最低', meritChange: 32, moralChange: 6, gdpChange: -3, livelihoodChange: 0, ecologyChange: 0, businessChange: -3, description: '威胁清除，运转稳定，但国际舆论持续施压。' },
      { text: '低调内部处置，对外否认危机存在', meritChange: -35, moralChange: -20, gdpChange: -3, livelihoodChange: -3, ecologyChange: 0, businessChange: -5, description: '信息泄露后引发更大信任危机，国家安全委员会要求问责。' },
    ],
  },
  {
    type: 'economic',
    title: '重大科技战略决策',
    description: '国家科学院提交报告：人工智能与量子计算领域中美差距持续拉大，建议实施"举国体制"专项攻关，需国政院拍板定向投入万亿级资源。',
    isMajor: true,
    choices: [
      { text: '常委会全体研究通过，发布国家科技战略新纲领，组建国家实验室集群', meritChange: 62, moralChange: 6, gdpChange: 8, livelihoodChange: 5, ecologyChange: 0, businessChange: 12, description: '举国科技攻关开局，十年后缩小关键差距，成为时代性战略决策。' },
      { text: '试点部分领域先行，评估后再全面推进', meritChange: 30, moralChange: 3, gdpChange: 3, livelihoodChange: 3, ecologyChange: 0, businessChange: 5, description: '稳健推进，但与最佳窗口期存在差距。' },
      { text: '以财政压力为由搁置，等待市场资本主导', meritChange: -30, moralChange: -8, gdpChange: -5, livelihoodChange: -3, ecologyChange: 0, businessChange: -8, description: '差距进一步扩大，被学界批评错失战略窗口期。' },
    ],
  },
  {
    type: 'opinion',
    title: '宪法修正草案重大争议',
    description: '全国议政院法律委员会提交宪法修正草案，涉及土地制度与公民数据权利章节引发社会广泛讨论，学界、媒体、地方代表意见高度分歧。',
    isMajor: true,
    choices: [
      { text: '召开多轮立法听证会，广泛听取各方意见，修订完善后提交全国议政院审议', meritChange: 58, moralChange: 15, gdpChange: 3, livelihoodChange: 8, ecologyChange: 0, businessChange: 3, description: '立法过程开放透明，草案质量大幅提升，全国议政院高票通过，成为宪政典范。' },
      { text: '小范围修改争议条款后提交审议', meritChange: 28, moralChange: 5, gdpChange: 0, livelihoodChange: 3, ecologyChange: 0, businessChange: 0, description: '顺利推进，但部分争议延续。' },
      { text: '坚持原稿，压制异见声音，强行推进审议', meritChange: -35, moralChange: -20, gdpChange: 0, livelihoodChange: -8, ecologyChange: 0, businessChange: 0, description: '引发全社会强烈反响，被认为破坏立法民主化进程，历史评价极差。' },
    ],
  },
];

/**
 * 按玩家职级返回事件模板池
 * rank 1-3  → 乡镇级
 * rank 4-6  → 县处级
 * rank 7-9  → 地厅级
 * rank 10-11→ 副部省级
 * rank 12-13→ 正部省级
 * rank 14-15→ 国家级
 */
function getPoolForRank(rankLevel: number): EventTemplate[] {
  if (rankLevel <= 3) return EVENTS_TOWN;
  if (rankLevel <= 6) return EVENTS_COUNTY;
  if (rankLevel <= 9) return EVENTS_CITY;
  if (rankLevel <= 11) return EVENTS_PROVINCE;
  if (rankLevel <= 13) return EVENTS_MINISTRY;
  return EVENTS_NATIONAL;
}

/** 按职级随机获取一个事件模板 */
export function getRandomEvent(rankLevel = 1): EventTemplate {
  const pool = getPoolForRank(rankLevel);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** 按职级随机获取一个重大事件（isMajor=true） */
export function getRandomMajorEvent(rankLevel = 1): EventTemplate {
  const pool = getPoolForRank(rankLevel).filter(e => e.isMajor);
  if (pool.length === 0) return getRandomEvent(rankLevel);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** 按职级随机获取一个普通事件（isMajor=false 或未设置） */
export function getRandomMinorEvent(rankLevel = 1): EventTemplate {
  const pool = getPoolForRank(rankLevel).filter(e => !e.isMajor);
  if (pool.length === 0) return getRandomEvent(rankLevel);
  return pool[Math.floor(Math.random() * pool.length)];
}
