// 家庭生活页 - 婚姻、子女、家庭培养，含配偶关系值、约会、纪念日、子女里程碑+成长路径
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getFamilyMembers, addSpouse, addChild, updateFamilyMember } from '@/db/gameApi';
import type { FamilyMember } from '@/types/game';

const CHILD_INVEST_OPTIONS = [
  { label: '加强学习', desc: '报课外辅导班', studyDelta: 8, moralDelta: -2, cost: 20 },
  { label: '品德教育', desc: '培养良好品格', moralDelta: 8, studyDelta: -1, cost: 15 },
  { label: '体育锻炼', desc: '参加体育运动', healthDelta: 10, cost: 10 },
  { label: '综合培养', desc: '全面均衡发展', studyDelta: 4, moralDelta: 4, healthDelta: 3, cost: 30 },
];
type InvestOption = typeof CHILD_INVEST_OPTIONS[number];

// ── 子女成长阶段 ──────────────────────────────────────────────────
type GrowthStage = '婴幼儿' | '小学' | '中学' | '大学' | '工作' | '成家';

function getGrowthStage(age: number, child: FamilyMember): GrowthStage {
  if (age < 6)  return '婴幼儿';
  if (age < 12) return '小学';
  if (age < 18) return '中学';
  if (age < 23) return '大学';
  if (!child.adultPath?.includes('已婚')) return '工作';
  return '成家';
}

const STAGE_COLOR: Record<GrowthStage, string> = {
  '婴幼儿': '#888', '小学': '#1D3B5E', '中学': '#7B5E2A',
  '大学': '#2a7a3b', '工作': '#C82829', '成家': '#4a2c8a',
};

// 学校选择（小学 & 中学阶段均可选）
const SCHOOL_OPTIONS: { label: string; desc: string; studyBonus: number; moralBonus: number; cost: number; tag: string }[] = [
  { label: '普通学校',   desc: '均衡发展，学业+4·品德+2',   studyBonus: 4,  moralBonus: 2,  cost: 0,  tag: '免费' },
  { label: '重点学校',   desc: '学业提升明显，学业+10·品德+3', studyBonus: 10, moralBonus: 3,  cost: 30, tag: '推荐' },
  { label: '国际学校',   desc: '视野开阔，学业+6·品德+6',     studyBonus: 6,  moralBonus: 6,  cost: 60, tag: '精英' },
  { label: '贵族寄宿校', desc: '全面发展，学业+8·品德+8·健康+5', studyBonus: 8, moralBonus: 8,  cost: 100, tag: '豪华' },
];

// 职业选择（大学毕业/18岁+）
const CAREER_OPTIONS: { label: string; desc: string; meritBonus: number; moralBonus: number; tag: string }[] = [
  { label: '考公务员',   desc: '走上仕途，品德+5·每年为您带来政绩奖励',   meritBonus: 10, moralBonus: 5, tag: '稳定' },
  { label: '经商创业',   desc: '白手起家，每年为您带来更多资金',           meritBonus: 15, moralBonus: 0, tag: '高薪' },
  { label: '学术研究',   desc: '从事科研，声望与品德双提升',               meritBonus: 5,  moralBonus: 8, tag: '声望' },
  { label: '出国发展',   desc: '赴海外发展，开阔眼界，声望+10',            meritBonus: 8,  moralBonus: 3, tag: '海外' },
  { label: '艺术从业',   desc: '投身文艺，家庭幸福度持续提升',             meritBonus: 3,  moralBonus: 6, tag: '幸福' },
];

// 婚姻安排（25岁+）
const MARRIAGE_OPTIONS: { label: string; desc: string; meritBonus: number; moralBonus: number; tag: string }[] = [
  { label: '自由恋爱',   desc: '子女自行择偶，幸福度+10',                meritBonus: 0,  moralBonus: 5,  tag: '民心' },
  { label: '父母介绍',   desc: '你为其物色对象，增进家庭关系值',           meritBonus: 5,  moralBonus: 3,  tag: '关系' },
  { label: '政治联姻',   desc: '与官宦家庭联姻，政绩+20但幸福度-5',       meritBonus: 20, moralBonus: -3, tag: '仕途' },
  { label: '商业联姻',   desc: '与富商家庭结亲，政绩+15',                meritBonus: 15, moralBonus: 0,  tag: '财力' },
];

// 子女仕途职级体系（从科员到副部级）
const CHILD_RANKS = [
  { rank: 1, label: '办事员',   nextCost: 5,   meritGain: 2 },
  { rank: 2, label: '科员',     nextCost: 8,   meritGain: 3 },
  { rank: 3, label: '副科级',   nextCost: 10,  meritGain: 4 },
  { rank: 4, label: '正科级',   nextCost: 12,  meritGain: 5 },
  { rank: 5, label: '副处级',   nextCost: 15,  meritGain: 6 },
  { rank: 6, label: '正处级',   nextCost: 20,  meritGain: 8 },
  { rank: 7, label: '副厅级',   nextCost: 28,  meritGain: 10 },
  { rank: 8, label: '正厅级',   nextCost: 38,  meritGain: 13 },
  { rank: 9, label: '副部级',   nextCost: 50,  meritGain: 18 },
  { rank: 10, label: '正部级',  nextCost: 0,   meritGain: 25 },
];

// 子女可调任的部门（与玩家职级相关）
const CHILD_TRANSFER_DEPTS = [
  { dept: '国政院办公厅', tag: '核心', minPlayerRank: 13 },
  { dept: '财政部', tag: '要职', minPlayerRank: 11 },
  { dept: '发改委', tag: '要职', minPlayerRank: 11 },
  { dept: '省委组织部', tag: '省级', minPlayerRank: 9 },
  { dept: '省政府办公厅', tag: '省级', minPlayerRank: 9 },
  { dept: '市委书记办公室', tag: '市级', minPlayerRank: 7 },
  { dept: '市发改委', tag: '市级', minPlayerRank: 7 },
  { dept: '县委办公室', tag: '县级', minPlayerRank: 5 },
  { dept: '乡镇党委', tag: '基层', minPlayerRank: 3 },
];

// 家庭事件池（含结婚纪念日）
const FAMILY_EVENTS = [
  { title: '配偶生病', desc: '配偶突发疾病，需要关心照顾', happinessDelta: -10, meritDelta: 0, relationDelta: -5 },
  { title: '孩子取得好成绩', desc: '子女在学校表现优异，获得表彰', happinessDelta: 8, meritDelta: 5, relationDelta: 3 },
  { title: '家庭矛盾', desc: '因工作繁忙引发家庭矛盾', happinessDelta: -15, meritDelta: -3, relationDelta: -8 },
  { title: '结婚纪念日', desc: '今天是你们的结婚纪念日，记得庆祝！', happinessDelta: 15, meritDelta: 2, relationDelta: 10, isAnniversary: true },
  { title: '家庭聚会', desc: '与亲属欢聚一堂，其乐融融', happinessDelta: 6, meritDelta: 0, relationDelta: 4 },
];

// 子女成就里程碑（学业≥80 或 品德≥80）
function getChildMilestone(child: FamilyMember): string | null {
  if (child.studyScore >= 80 && child.moralScore >= 80) return '🏆 品学兼优';
  if (child.studyScore >= 80) return '📚 学业优秀';
  if (child.moralScore >= 80) return '🌟 品德高尚';
  return null;
}

function calcChildAge(birthDay: number, gameDays: number): number {
  return Math.floor((gameDays - birthDay) / 365);
}

function ScoreMini({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: 9, color: '#888' }}>{label}</Text>
      <Text style={{ fontSize: 12, fontWeight: '700', color: color ?? '#222' }}>{value}</Text>
    </View>
  );
}

export default function FamilyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [feedbackOk, setFeedbackOk] = useState(true);
  const [showMarryForm, setShowMarryForm] = useState(false);
  const [spouseName, setSpouseName] = useState('');
  const [spouseGender, setSpouseGender] = useState<'男' | '女'>('女');
  const [expandedChild, setExpandedChild] = useState<string | null>(null);
  const [showEvent, setShowEvent] = useState(false);
  const [activeEvent, setActiveEvent] = useState<typeof FAMILY_EVENTS[0] | null>(null);

  const isMarried = save?.marriageStatus === 'married';
  const spouse = members.find(m => m.memberType === 'spouse');
  const children = members.filter(m => m.memberType === 'child');

  useFocusEffect(
    useCallback(() => {
      if (!save) return;
      setLoading(true);
      getFamilyMembers(save.id).then(data => {
        setMembers(data);
        setLoading(false);
      });
    }, [save])
  );

  const showMsg = (msg: string, ok = true) => {
    setFeedback(msg);
    setFeedbackOk(ok);
    setTimeout(() => setFeedback(''), 3000);
  };

  // 结婚（同时记录结婚纪念日）
  const handleMarry = async () => {
    if (!save || !spouseName.trim()) return;
    const newSpouse = await addSpouse(save.id, save.userId, spouseName.trim(), spouseGender, save.gameDays);
    if (!newSpouse) { showMsg('结婚操作失败，请重试', false); return; }
    await updateGameSave({
      marriageStatus: 'married',
      familyHappiness: Math.min(100, save.familyHappiness + 20),
      spouseRelationValue: 70,
      marriageDay: save.gameDays,
    });
    setShowMarryForm(false);
    setSpouseName('');
    getFamilyMembers(save.id).then(setMembers);
    showMsg(`🎊 恭喜！与 ${spouseName} 步入婚姻殿堂`, true);
  };

  // 约会（消耗10政绩，+15关系值，+5幸福度）
  const handleDate = async () => {
    if (!save || !isMarried) return;
    if (save.meritPoints < 10) { showMsg('约会需消耗10政绩（当前不足）', false); return; }
    await updateGameSave({
      meritPoints: save.meritPoints - 10,
      spouseRelationValue: Math.min(100, (save.spouseRelationValue ?? 50) + 15),
      familyHappiness: Math.min(100, save.familyHappiness + 5),
    });
    showMsg('💑 约会愉快！配偶关系值+15，幸福度+5', true);
  };

  // 生子
  const handleHaveChild = async (gender: '男' | '女') => {
    if (!save || !isMarried) return;
    const familyName = save.playerName.charAt(0);
    const child = await addChild(save.id, save.userId, gender, save.gameDays, familyName);
    if (!child) { showMsg('操作失败，请重试', false); return; }
    await updateGameSave({ familyHappiness: Math.min(100, save.familyHappiness + 15) });
    getFamilyMembers(save.id).then(setMembers);
    showMsg(`🍼 恭喜！迎来一位${gender}宝宝`, true);
  };

  // 培养子女（未成年投入）
  const handleInvest = async (child: FamilyMember, opt: InvestOption) => {
    if (!save) return;
    const updates: Parameters<typeof updateFamilyMember>[1] = {};
    if (opt.studyDelta) updates.studyScore = Math.max(0, Math.min(100, child.studyScore + opt.studyDelta));
    if (opt.moralDelta) updates.moralScore = Math.max(0, Math.min(100, child.moralScore + (opt.moralDelta ?? 0)));
    if ((opt as { healthDelta?: number }).healthDelta) updates.healthScore = Math.max(0, Math.min(100, child.healthScore + ((opt as { healthDelta?: number }).healthDelta ?? 0)));
    await updateFamilyMember(child.id, updates);
    getFamilyMembers(save.id).then(setMembers);
    setExpandedChild(null);
    showMsg(`✓ 对 ${child.name} 实施「${opt.label}」，效果已更新`, true);
  };

  // 选择学校
  const handleChooseSchool = async (child: FamilyMember, opt: typeof SCHOOL_OPTIONS[0]) => {
    if (!save) return;
    if (save.meritPoints < opt.cost) { showMsg(`政绩不足，需 ${opt.cost} 点政绩`, false); return; }
    const pathTag = `学校:${opt.label}`;
    const updates: Parameters<typeof updateFamilyMember>[1] = {
      studyScore: Math.min(100, child.studyScore + opt.studyBonus),
      moralScore: Math.min(100, child.moralScore + opt.moralBonus),
      adultPath: pathTag,
    };
    await updateFamilyMember(child.id, updates);
    if (opt.cost > 0) await updateGameSave({ meritPoints: save.meritPoints - opt.cost });
    getFamilyMembers(save.id).then(setMembers);
    setExpandedChild(null);
    showMsg(`✅ ${child.name} 就读${opt.label}！学业+${opt.studyBonus} 品德+${opt.moralBonus}`, true);
  };

  // 选择职业方向（成年后）
  const handleChooseCareer = async (child: FamilyMember, opt: typeof CAREER_OPTIONS[0]) => {
    if (!save) return;
    const pathTag = `职业:${opt.label}`;
    await updateFamilyMember(child.id, {
      job: opt.label,
      isAdult: true,
      adultPath: pathTag,
      moralScore: Math.min(100, child.moralScore + opt.moralBonus),
    });
    if (opt.meritBonus > 0) await updateGameSave({ meritPoints: save.meritPoints + opt.meritBonus });
    getFamilyMembers(save.id).then(setMembers);
    setExpandedChild(null);
    showMsg(`🎓 ${child.name} 选择了「${opt.label}」道路！获得政绩+${opt.meritBonus}`, true);
  };

  // 获取子女当前仕途职级（从adultPath中解析）
  function getChildOfficialRank(child: FamilyMember): number {
    const m = child.adultPath?.match(/官职级(\d+)/);
    return m ? parseInt(m[1]) : 1;
  }

  function getChildOfficialDept(child: FamilyMember): string {
    const m = child.adultPath?.match(/部门:([^|]+)/);
    return m ? m[1] : '基层单位';
  }

  // 子女晋升（需消耗玩家政绩）
  const handleChildPromote = async (child: FamilyMember) => {
    if (!save) return;
    const curRank = getChildOfficialRank(child);
    const rankInfo = CHILD_RANKS[curRank - 1];
    if (!rankInfo || rankInfo.nextCost === 0) { showMsg(`${child.name}已是最高级别，无法再晋升`, false); return; }
    if (save.meritPoints < rankInfo.nextCost) { showMsg(`政绩不足，晋升需${rankInfo.nextCost}点政绩`, false); return; }
    const nextRankLabel = CHILD_RANKS[curRank]?.label ?? '顶级';
    const newPath = (child.adultPath ?? '')
      .replace(/官职级\d+/, `官职级${curRank + 1}`)
      .replace(/职级:[^|]+/, `职级:${nextRankLabel}`);
    const finalPath = newPath.includes('官职级') ? newPath : `${newPath}|官职级${curRank + 1}|职级:${nextRankLabel}`;
    await updateFamilyMember(child.id, { adultPath: finalPath });
    await updateGameSave({ meritPoints: save.meritPoints - rankInfo.nextCost });
    getFamilyMembers(save.id).then(setMembers);
    showMsg(`🎖️ ${child.name} 晋升至【${nextRankLabel}】！消耗${rankInfo.nextCost}政绩`, true);
  };

  // 子女调任（利用玩家影响力安排调任）
  const handleChildTransfer = async (child: FamilyMember, dept: typeof CHILD_TRANSFER_DEPTS[0]) => {
    if (!save) return;
    if (save.meritPoints < 15) { showMsg('调任需消耗15点政绩', false); return; }
    const curPath = child.adultPath ?? '';
    const newPath = curPath.includes('部门:')
      ? curPath.replace(/部门:[^|]+/, `部门:${dept.dept}`)
      : `${curPath}|部门:${dept.dept}`;
    await updateFamilyMember(child.id, { adultPath: newPath });
    await updateGameSave({ meritPoints: save.meritPoints - 15 });
    getFamilyMembers(save.id).then(setMembers);
    showMsg(`📋 ${child.name} 已调任至【${dept.dept}】，消耗15政绩`, true);
  };

  // 子女特别引荐（高级职位，需更多政绩）
  const handleChildSpecialRef = async (child: FamilyMember, position: string, cost: number) => {
    if (!save) return;
    if (save.meritPoints < cost) { showMsg(`特别引荐需消耗${cost}点政绩`, false); return; }
    const curPath = child.adultPath ?? '';
    const newPath = `${curPath}|引荐岗位:${position}`;
    await updateFamilyMember(child.id, { job: position, adultPath: newPath });
    await updateGameSave({ meritPoints: save.meritPoints - cost, familyHappiness: Math.min(100, save.familyHappiness + 5) });
    getFamilyMembers(save.id).then(setMembers);
    showMsg(`⭐ 您引荐 ${child.name} 担任【${position}】！家庭幸福度+5，消耗${cost}政绩`, true);
  };

  // 安排婚姻（25岁+）
  const handleArrangeMarriage = async (child: FamilyMember, opt: typeof MARRIAGE_OPTIONS[0]) => {
    if (!save) return;
    const currentPath = child.adultPath ?? '';
    const pathTag = `${currentPath}|已婚:${opt.label}`;
    await updateFamilyMember(child.id, {
      adultPath: pathTag,
      moralScore: Math.min(100, Math.max(0, child.moralScore + opt.moralBonus)),
    });
    if (opt.meritBonus !== 0) {
      await updateGameSave({
        meritPoints: save.meritPoints + opt.meritBonus,
        familyHappiness: Math.min(100, save.familyHappiness + (opt.label === '自由恋爱' ? 10 : 5)),
      });
    } else {
      await updateGameSave({ familyHappiness: Math.min(100, save.familyHappiness + 10) });
    }
    getFamilyMembers(save.id).then(setMembers);
    setExpandedChild(null);
    showMsg(`🎊 ${child.name} 通过「${opt.label}」完成婚配！政绩${opt.meritBonus >= 0 ? '+' : ''}${opt.meritBonus}`, true);
  };

  // 随机家庭事件（检查是否逢结婚纪念日）
  const triggerFamilyEvent = () => {
    if (!isMarried) { showMsg('请先成婚再触发家庭事件', false); return; }
    // 若今天是纪念日（每365天一次），优先触发
    const isAnniversary = save && save.marriageDay > 0
      && ((save.gameDays - save.marriageDay) % 365 === 0)
      && save.gameDays !== save.marriageDay;
    const pool = isAnniversary
      ? FAMILY_EVENTS.filter(e => e.isAnniversary)
      : FAMILY_EVENTS.filter(e => !e.isAnniversary);
    const ev = pool[Math.floor(Math.random() * pool.length)];
    setActiveEvent(ev ?? FAMILY_EVENTS[0]);
    setShowEvent(true);
  };

  const handleProcessEvent = async () => {
    if (!save || !activeEvent) return;
    const updates: Parameters<typeof updateGameSave>[0] = {
      familyHappiness: Math.max(0, Math.min(100, save.familyHappiness + activeEvent.happinessDelta)),
      meritPoints: save.meritPoints + activeEvent.meritDelta,
    };
    if (activeEvent.relationDelta) {
      updates.spouseRelationValue = Math.max(0, Math.min(100, (save.spouseRelationValue ?? 50) + activeEvent.relationDelta));
    }
    await updateGameSave(updates);
    setShowEvent(false);
    setActiveEvent(null);
    showMsg(`事件处理完毕：幸福度${activeEvent.happinessDelta >= 0 ? '+' : ''}${activeEvent.happinessDelta}`, activeEvent.happinessDelta >= 0);
  };

  if (loading || !save) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F7F5' }}>
        <ActivityIndicator size="large" color="#C82829" />
      </View>
    );
  }

  const relationValue = save.spouseRelationValue ?? 50;
  const relationColor = relationValue >= 70 ? '#2a7a3b' : relationValue >= 40 ? '#e67e22' : '#C82829';
  const relationLabel = relationValue >= 70 ? '亲密' : relationValue >= 40 ? '普通' : '疏远';

  // 结婚周年
  const anniversaryYear = save.marriageDay > 0
    ? Math.floor((save.gameDays - save.marriageDay) / 365)
    : 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#F7F7F5' }}>
      <StatusBar style="light" backgroundColor="#1D3B5E" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#1D3B5E', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>私人生活</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>家庭生活</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10 }}>{save?.rankName}</Text>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600', marginTop: 1 }}>{save?.cityName}</Text>
        </View>
      </View>

      {feedback ? (
        <View style={{ backgroundColor: feedbackOk ? '#e8f5e9' : '#ffebee', borderBottomWidth: 1, borderBottomColor: feedbackOk ? '#c8e6c9' : '#ffcdd2', padding: 10 }}>
          <Text style={{ color: feedbackOk ? '#2a7a3b' : '#C82829', fontSize: 12, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      {/* 家庭事件弹窗 */}
      {showEvent && activeEvent && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#fff', borderWidth: 2, borderColor: activeEvent.isAnniversary ? '#C82829' : '#1D3B5E', padding: 20, width: '100%' }}>
            {activeEvent.isAnniversary && (
              <View style={{ backgroundColor: '#C82829', paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 8 }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>结婚纪念日</Text>
              </View>
            )}
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#222', marginBottom: 6 }}>{activeEvent.title}</Text>
            <Text style={{ fontSize: 13, color: '#555', lineHeight: 20, marginBottom: 12 }}>{activeEvent.desc}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1, backgroundColor: activeEvent.happinessDelta >= 0 ? '#e8f5e9' : '#ffebee', padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 10, color: '#888' }}>幸福度</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: activeEvent.happinessDelta >= 0 ? '#2a7a3b' : '#C82829' }}>
                  {activeEvent.happinessDelta >= 0 ? '+' : ''}{activeEvent.happinessDelta}
                </Text>
              </View>
              <View style={{ flex: 1, backgroundColor: (activeEvent.relationDelta ?? 0) >= 0 ? '#e8f5e9' : '#ffebee', padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 10, color: '#888' }}>关系值</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: (activeEvent.relationDelta ?? 0) >= 0 ? '#2a7a3b' : '#C82829' }}>
                  {(activeEvent.relationDelta ?? 0) >= 0 ? '+' : ''}{activeEvent.relationDelta ?? 0}
                </Text>
              </View>
              {activeEvent.meritDelta !== 0 && (
                <View style={{ flex: 1, backgroundColor: activeEvent.meritDelta > 0 ? '#e8f5e9' : '#ffebee', padding: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, color: '#888' }}>政绩</Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: activeEvent.meritDelta > 0 ? '#2a7a3b' : '#C82829' }}>
                    {activeEvent.meritDelta > 0 ? '+' : ''}{activeEvent.meritDelta}
                  </Text>
                </View>
              )}
            </View>
            <Pressable onPress={() => void handleProcessEvent()} style={{ backgroundColor: '#1D3B5E', paddingVertical: 12, alignItems: 'center', marginTop: 14 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>处理事件</Text>
            </Pressable>
          </View>
        </View>
      )}

      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 14, gap: 10 }} showsVerticalScrollIndicator={false}>

        {/* 家庭概况 */}
        <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2 }}>家庭概况</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 10, color: '#888' }}>家庭幸福度</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: save.familyHappiness >= 60 ? '#2a7a3b' : save.familyHappiness >= 30 ? '#888' : '#C82829' }}>
                {save.familyHappiness}
              </Text>
            </View>
          </View>
          <View style={{ height: 6, backgroundColor: '#E8E6E2', marginBottom: 10 }}>
            <View style={{ height: 6, width: `${save.familyHappiness}%`, backgroundColor: save.familyHappiness >= 60 ? '#2a7a3b' : '#C82829' }} />
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, backgroundColor: '#F0F4F8', padding: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 18 }}>{isMarried ? '💑' : '👤'}</Text>
              <Text style={{ fontSize: 10, color: '#888', marginTop: 3 }}>婚姻</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: isMarried ? '#2a7a3b' : '#888' }}>
                {isMarried ? '已婚' : '未婚'}
              </Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#F0F4F8', padding: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 18 }}>👨‍👩‍👧‍👦</Text>
              <Text style={{ fontSize: 10, color: '#888', marginTop: 3 }}>子女</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D3B5E' }}>{children.length}位</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#F0F4F8', padding: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 18 }}>🎲</Text>
              <Text style={{ fontSize: 10, color: '#888', marginTop: 3 }}>家庭事件</Text>
              <Pressable onPress={triggerFamilyEvent} style={{ marginTop: 2 }}>
                <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '600' }}>触发 ›</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* 婚姻 + 配偶关系值 */}
        <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
          <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2, marginBottom: 12 }}>婚姻</Text>

          {isMarried && spouse ? (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <View style={{ width: 52, height: 52, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D1D1D1' }}>
                  <Text style={{ fontSize: 28 }}>{spouse.gender === '女' ? '👩' : '👨'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#222' }}>{spouse.name}</Text>
                  <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{spouse.gender} · {spouse.job}</Text>
                  {anniversaryYear > 0 && (
                    <Text style={{ fontSize: 10, color: '#C82829', marginTop: 2 }}>💍 结婚{anniversaryYear}周年</Text>
                  )}
                </View>
                <View style={{ alignItems: 'center', gap: 3 }}>
                  <ScoreMini label="健康" value={spouse.healthScore} color="#2a7a3b" />
                  <ScoreMini label="品德" value={spouse.moralScore} color="#1D3B5E" />
                </View>
              </View>

              {/* 配偶关系值 */}
              <View style={{ backgroundColor: '#F7F7F5', borderWidth: 1, borderColor: '#E0E0E0', padding: 10, marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ fontSize: 11, color: '#555' }}>配偶关系值</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ paddingHorizontal: 6, paddingVertical: 2, backgroundColor: relationColor }}>
                      <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{relationLabel}</Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: relationColor, fontVariant: ['tabular-nums'] }}>{relationValue}</Text>
                  </View>
                </View>
                <View style={{ height: 5, backgroundColor: '#E8E6E2' }}>
                  <View style={{ height: 5, width: `${relationValue}%`, backgroundColor: relationColor }} />
                </View>
              </View>

              {/* 约会按钮 */}
              <Pressable
                onPress={() => void handleDate()}
                style={{ backgroundColor: '#C82829', paddingVertical: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>💑 安排约会（消耗10政绩 · 关系+15）</Text>
              </Pressable>
            </View>
          ) : showMarryForm ? (
            <View style={{ gap: 10 }}>
              <TextInput
                value={spouseName}
                onChangeText={setSpouseName}
                placeholder="输入配偶姓名"
                style={{ borderWidth: 1, borderColor: '#D1D1D1', padding: 10, fontSize: 14 }}
                placeholderTextColor="#aaa"
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['女', '男'] as const).map(g => (
                  <Pressable
                    key={g}
                    onPress={() => setSpouseGender(g)}
                    style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: spouseGender === g ? '#C82829' : '#D1D1D1', backgroundColor: spouseGender === g ? '#C82829' : '#fff' }}
                  >
                    <Text style={{ color: spouseGender === g ? '#fff' : '#555', fontWeight: '600' }}>{g}方</Text>
                  </Pressable>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable onPress={() => void handleMarry()} style={{ flex: 1, backgroundColor: '#1D3B5E', paddingVertical: 11, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>确认成婚</Text>
                </Pressable>
                <Pressable onPress={() => setShowMarryForm(false)} style={{ flex: 1, borderWidth: 1, borderColor: '#D1D1D1', paddingVertical: 11, alignItems: 'center' }}>
                  <Text style={{ color: '#666' }}>取消</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View>
              <Text style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>您目前尚未婚配，成婚可提升家庭幸福度。</Text>
              <Pressable onPress={() => setShowMarryForm(true)} style={{ backgroundColor: '#1D3B5E', paddingVertical: 12, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>💍 登记结婚</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* 子女 + 成就里程碑 */}
        <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2 }}>子女</Text>
            {isMarried && children.length < 3 && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable onPress={() => void handleHaveChild('男')} style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#1D3B5E' }}>
                  <Text style={{ color: '#fff', fontSize: 11 }}>生男孩</Text>
                </Pressable>
                <Pressable onPress={() => void handleHaveChild('女')} style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#C82829' }}>
                  <Text style={{ color: '#fff', fontSize: 11 }}>生女孩</Text>
                </Pressable>
              </View>
            )}
          </View>

          {children.length === 0 ? (
            <Text style={{ fontSize: 13, color: '#888' }}>
              {isMarried ? '尚无子女，可选择生育。' : '成婚后可养育子女。'}
            </Text>
          ) : (
            <View style={{ gap: 10 }}>
              {children.map(child => {
                const age = calcChildAge(child.birthDay, save.gameDays);
                const isExpanded = expandedChild === child.id;
                const milestone = getChildMilestone(child);
                const stage = getGrowthStage(age, child);
                const stageColor = STAGE_COLOR[stage];
                const isMarriedChild = child.adultPath?.includes('已婚');
                return (
                  <Pressable
                    key={child.id}
                    onPress={() => setExpandedChild(isExpanded ? null : child.id)}
                    style={{ borderWidth: 1, borderColor: milestone ? '#C82829' : isExpanded ? '#1D3B5E' : '#D1D1D1', padding: 12 }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 44, height: 44, backgroundColor: '#F0F4F8', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D1D1D1' }}>
                        <Text style={{ fontSize: 24 }}>{child.gender === '女' ? '👧' : '👦'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: '#222' }}>{child.name}</Text>
                          {milestone && (
                            <View style={{ backgroundColor: '#C82829', paddingHorizontal: 5, paddingVertical: 1 }}>
                              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{milestone}</Text>
                            </View>
                          )}
                          <View style={{ backgroundColor: stageColor, paddingHorizontal: 5, paddingVertical: 1 }}>
                            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{stage}</Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 11, color: '#888', marginTop: 1 }}>
                          {child.gender} · {age}岁 · {child.isAdult ? child.job : '学生'}
                          {child.adultPath ? ` · ${child.adultPath.split('|').pop()}` : ''}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <ScoreMini label="学业" value={child.studyScore} color={child.studyScore >= 80 ? '#C82829' : '#1D3B5E'} />
                        <ScoreMini label="品德" value={child.moralScore} color={child.moralScore >= 80 ? '#C82829' : '#2a7a3b'} />
                        <ScoreMini label="健康" value={child.healthScore} color="#7a5c2a" />
                      </View>
                    </View>

                    {/* ── 展开：成长阶段面板 ── */}
                    {isExpanded && (
                      <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 10, gap: 10 }}>

                        {/* 婴幼儿：暂无操作 */}
                        {stage === '婴幼儿' && (
                          <Text style={{ fontSize: 12, color: '#888', fontStyle: 'italic' }}>宝宝还小，用心陪伴是最好的礼物。</Text>
                        )}

                        {/* 小学/中学：培养投入 + 选择学校 */}
                        {(stage === '小学' || stage === '中学') && (
                          <>
                            <Text style={{ fontSize: 10, color: '#888', letterSpacing: 1, fontWeight: '700' }}>📚 日常培养</Text>
                            <View style={{ gap: 6 }}>
                              {CHILD_INVEST_OPTIONS.map(opt => (
                                <View key={opt.label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#D1D1D1', padding: 10 }}>
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#222' }}>{opt.label}</Text>
                                    <Text style={{ fontSize: 10, color: '#888' }}>{opt.desc}</Text>
                                  </View>
                                  <Pressable onPress={() => void handleInvest(child, opt)} style={{ backgroundColor: '#1D3B5E', paddingHorizontal: 12, paddingVertical: 5 }}>
                                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>投入</Text>
                                  </Pressable>
                                </View>
                              ))}
                            </View>
                            <Text style={{ fontSize: 10, color: '#888', letterSpacing: 1, fontWeight: '700', marginTop: 4 }}>🏫 选择学校</Text>
                            <View style={{ gap: 6 }}>
                              {SCHOOL_OPTIONS.map(opt => {
                                const current = child.adultPath?.startsWith('学校:') && child.adultPath.includes(opt.label);
                                return (
                                  <View key={opt.label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: current ? '#2a7a3b' : '#D1D1D1', padding: 10, backgroundColor: current ? '#f0faf3' : '#fff' }}>
                                    <View style={{ flex: 1 }}>
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#222' }}>{opt.label}</Text>
                                        <View style={{ backgroundColor: '#7B5E2A', paddingHorizontal: 4, paddingVertical: 1 }}>
                                          <Text style={{ color: '#fff', fontSize: 8 }}>{opt.tag}</Text>
                                        </View>
                                        {opt.cost > 0 && <Text style={{ fontSize: 10, color: '#C82829' }}>消耗{opt.cost}政绩</Text>}
                                      </View>
                                      <Text style={{ fontSize: 10, color: '#888' }}>{opt.desc}</Text>
                                    </View>
                                    {current ? (
                                      <View style={{ backgroundColor: '#2a7a3b', paddingHorizontal: 10, paddingVertical: 5 }}>
                                        <Text style={{ color: '#fff', fontSize: 10 }}>就读中</Text>
                                      </View>
                                    ) : (
                                      <Pressable onPress={() => void handleChooseSchool(child, opt)} style={{ backgroundColor: '#7B5E2A', paddingHorizontal: 10, paddingVertical: 5 }}>
                                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>择校</Text>
                                      </Pressable>
                                    )}
                                  </View>
                                );
                              })}
                            </View>
                          </>
                        )}

                        {/* 大学阶段：学业提升 */}
                        {stage === '大学' && (
                          <>
                            <Text style={{ fontSize: 10, color: '#888', letterSpacing: 1, fontWeight: '700' }}>🎓 大学阶段</Text>
                            <Text style={{ fontSize: 12, color: '#555' }}>
                              {child.name} 正在大学就读，您可以为其学习深造提供支持。
                            </Text>
                            <View style={{ gap: 6 }}>
                              {[
                                { label: '支持深造', desc: '鼓励努力学习，学业+10·品德+3', studyDelta: 10, moralDelta: 3 },
                                { label: '海外交流', desc: '送出国交换，学业+6·品德+8', studyDelta: 6, moralDelta: 8 },
                                { label: '实习锻炼', desc: '安排实习机会，品德+5·健康+5', moralDelta: 5, healthDelta: 5 },
                              ].map(opt => (
                                <View key={opt.label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#D1D1D1', padding: 10 }}>
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#222' }}>{opt.label}</Text>
                                    <Text style={{ fontSize: 10, color: '#888' }}>{opt.desc}</Text>
                                  </View>
                                  <Pressable onPress={() => void handleInvest(child, opt as InvestOption)} style={{ backgroundColor: '#2a7a3b', paddingHorizontal: 12, paddingVertical: 5 }}>
                                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>支持</Text>
                                  </Pressable>
                                </View>
                              ))}
                            </View>
                          </>
                        )}

                        {/* 工作阶段：选择职业 */}
                        {stage === '工作' && (
                          <>
                            <Text style={{ fontSize: 10, color: '#888', letterSpacing: 1, fontWeight: '700' }}>💼 职业方向</Text>
                            {child.isAdult && child.job && child.job !== '未定' ? (
                              <View style={{ backgroundColor: '#F0F4F8', padding: 10, borderWidth: 1, borderColor: '#D1D1D1' }}>
                                <Text style={{ fontSize: 12, color: '#1D3B5E', fontWeight: '600' }}>
                                  {child.name} 现从事：{child.job}
                                </Text>
                                {child.adultPath && (
                                  <Text style={{ fontSize: 10, color: '#888', marginTop: 3 }}>{child.adultPath}</Text>
                                )}
                              </View>
                            ) : (
                              <View style={{ gap: 6 }}>
                                {CAREER_OPTIONS.map(opt => (
                                  <View key={opt.label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#D1D1D1', padding: 10 }}>
                                    <View style={{ flex: 1 }}>
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#222' }}>{opt.label}</Text>
                                        <View style={{ backgroundColor: '#C82829', paddingHorizontal: 4, paddingVertical: 1 }}>
                                          <Text style={{ color: '#fff', fontSize: 8 }}>{opt.tag}</Text>
                                        </View>
                                        {opt.meritBonus > 0 && <Text style={{ fontSize: 10, color: '#2a7a3b' }}>政绩+{opt.meritBonus}</Text>}
                                      </View>
                                      <Text style={{ fontSize: 10, color: '#888' }}>{opt.desc}</Text>
                                    </View>
                                    <Pressable onPress={() => void handleChooseCareer(child, opt)} style={{ backgroundColor: '#C82829', paddingHorizontal: 10, paddingVertical: 5 }}>
                                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>选择</Text>
                                    </Pressable>
                                  </View>
                                ))}
                              </View>
                            )}

                            {/* 子女仕途管理（已选「考公务员」后显示） */}
                            {child.isAdult && child.job === '考公务员' && (() => {
                              const curRank = getChildOfficialRank(child);
                              const curDept = getChildOfficialDept(child);
                              const curRankInfo = CHILD_RANKS[curRank - 1];
                              const nextRankInfo = CHILD_RANKS[curRank];
                              const playerRank = save?.rankLevel ?? 0;
                              const availableDepts = CHILD_TRANSFER_DEPTS.filter(d => d.minPlayerRank <= playerRank);
                              return (
                                <>
                                  {/* 当前仕途状态 */}
                                  <View style={{ backgroundColor: '#EEF2F7', borderWidth: 1, borderColor: '#D0DCE8', padding: 12, marginTop: 8 }}>
                                    <Text style={{ fontSize: 10, color: '#1D3B5E', fontWeight: '700', letterSpacing: 1, marginBottom: 8 }}>🏛️ 仕途管理</Text>
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                      <View style={{ flex: 1, backgroundColor: '#fff', padding: 8, alignItems: 'center', borderWidth: 1, borderColor: '#D1D1D1' }}>
                                        <Text style={{ fontSize: 9, color: '#888' }}>当前职级</Text>
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D3B5E', marginTop: 2 }}>{curRankInfo?.label ?? '办事员'}</Text>
                                      </View>
                                      <View style={{ flex: 2, backgroundColor: '#fff', padding: 8, alignItems: 'center', borderWidth: 1, borderColor: '#D1D1D1' }}>
                                        <Text style={{ fontSize: 9, color: '#888' }}>所在单位</Text>
                                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#1D3B5E', marginTop: 2, textAlign: 'center' }}>{curDept}</Text>
                                      </View>
                                    </View>
                                  </View>

                                  {/* 晋升操作 */}
                                  {nextRankInfo && (
                                    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 12, gap: 6 }}>
                                      <Text style={{ fontSize: 10, color: '#888', fontWeight: '700', letterSpacing: 1 }}>⬆️ 晋升操作</Text>
                                      <Text style={{ fontSize: 11, color: '#555' }}>
                                        利用您的影响力，助力 {child.name} 晋升至【{nextRankInfo.label}】
                                      </Text>
                                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <View style={{ flexDirection: 'row', gap: 6 }}>
                                          <View style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 6, paddingVertical: 2 }}>
                                            <Text style={{ fontSize: 9, color: '#7B5E2A' }}>消耗{curRankInfo?.nextCost}政绩</Text>
                                          </View>
                                          <View style={{ backgroundColor: '#EEF2F7', paddingHorizontal: 6, paddingVertical: 2 }}>
                                            <Text style={{ fontSize: 9, color: '#1D3B5E' }}>晋升至{nextRankInfo.label}</Text>
                                          </View>
                                        </View>
                                        <Pressable
                                          onPress={() => void handleChildPromote(child)}
                                          style={{ backgroundColor: '#2B4B6F', paddingHorizontal: 14, paddingVertical: 7 }}
                                        >
                                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>晋升</Text>
                                        </Pressable>
                                      </View>
                                    </View>
                                  )}

                                  {/* 调任操作 */}
                                  {availableDepts.length > 0 && (
                                    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 12, gap: 6 }}>
                                      <Text style={{ fontSize: 10, color: '#888', fontWeight: '700', letterSpacing: 1 }}>📋 调任部门</Text>
                                      <Text style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>
                                        利用关系网络为 {child.name} 安排调任（每次消耗15政绩）
                                      </Text>
                                      {availableDepts.map(d => (
                                        <Pressable
                                          key={d.dept}
                                          onPress={() => void handleChildTransfer(child, d)}
                                          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E0E0E0', padding: 8 }}
                                        >
                                          <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                              <Text style={{ fontSize: 12, fontWeight: '600', color: '#222' }}>{d.dept}</Text>
                                              <View style={{ backgroundColor: '#7B5E2A', paddingHorizontal: 4, paddingVertical: 1 }}>
                                                <Text style={{ color: '#fff', fontSize: 8 }}>{d.tag}</Text>
                                              </View>
                                            </View>
                                          </View>
                                          <Text style={{ fontSize: 10, color: '#1D3B5E', fontWeight: '600' }}>调任 ›</Text>
                                        </Pressable>
                                      ))}
                                    </View>
                                  )}

                                  {/* 特别引荐（根据玩家职级解锁） */}
                                  {playerRank >= 10 && (
                                    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#C82829', padding: 12, gap: 6 }}>
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        <Text style={{ fontSize: 10, color: '#C82829', fontWeight: '700', letterSpacing: 1 }}>⭐ 特别引荐</Text>
                                        <View style={{ backgroundColor: '#C82829', paddingHorizontal: 5, paddingVertical: 1 }}>
                                          <Text style={{ color: '#fff', fontSize: 8 }}>需要职级≥10</Text>
                                        </View>
                                      </View>
                                      <Text style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>
                                        凭借您的地位，直接引荐 {child.name} 担任要职
                                      </Text>
                                      {[
                                        playerRank >= 14 ? { pos: '省长助理', cost: 30 } : null,
                                        playerRank >= 12 ? { pos: '市委副书记', cost: 25 } : null,
                                        playerRank >= 10 ? { pos: '市政府秘书长', cost: 20 } : null,
                                      ].filter(Boolean).map((item) => item && (
                                        <Pressable
                                          key={item.pos}
                                          onPress={() => void handleChildSpecialRef(child, item.pos, item.cost)}
                                          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#F0D0D0', padding: 8 }}
                                        >
                                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#222' }}>{item.pos}</Text>
                                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Text style={{ fontSize: 10, color: '#C82829' }}>消耗{item.cost}政绩</Text>
                                            <Text style={{ fontSize: 10, color: '#C82829', fontWeight: '700' }}>引荐 ›</Text>
                                          </View>
                                        </Pressable>
                                      ))}
                                    </View>
                                  )}
                                </>
                              );
                            })()}

                            {/* 25岁以上可安排婚姻 */}
                            {age >= 25 && !isMarriedChild && (
                              <>
                                <Text style={{ fontSize: 10, color: '#888', letterSpacing: 1, fontWeight: '700', marginTop: 6 }}>💍 婚姻安排</Text>
                                <View style={{ gap: 6 }}>
                                  {MARRIAGE_OPTIONS.map(opt => (
                                    <View key={opt.label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#D1D1D1', padding: 10 }}>
                                      <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#222' }}>{opt.label}</Text>
                                          <View style={{ backgroundColor: '#4a2c8a', paddingHorizontal: 4, paddingVertical: 1 }}>
                                            <Text style={{ color: '#fff', fontSize: 8 }}>{opt.tag}</Text>
                                          </View>
                                        </View>
                                        <Text style={{ fontSize: 10, color: '#888' }}>{opt.desc}</Text>
                                      </View>
                                      <Pressable onPress={() => void handleArrangeMarriage(child, opt)} style={{ backgroundColor: '#4a2c8a', paddingHorizontal: 10, paddingVertical: 5 }}>
                                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>安排</Text>
                                      </Pressable>
                                    </View>
                                  ))}
                                </View>
                              </>
                            )}
                          </>
                        )}

                        {/* 成家阶段 */}
                        {stage === '成家' && (
                          <View style={{ backgroundColor: '#F4F0FA', padding: 10, borderWidth: 1, borderColor: '#4a2c8a' }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#4a2c8a', marginBottom: 4 }}>🏡 已成家立业</Text>
                            <Text style={{ fontSize: 12, color: '#555' }}>
                              {child.name}（{age}岁）从事{child.job}，婚姻美满，家庭幸福。
                            </Text>
                            <Text style={{ fontSize: 10, color: '#888', marginTop: 4 }}>
                              {child.adultPath?.split('|').join(' · ')}
                            </Text>
                          </View>
                        )}

                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* 家庭经营提示 */}
        <View style={{ backgroundColor: '#F0F4F8', borderWidth: 1, borderColor: '#D1D1D1', padding: 12, marginBottom: 8 }}>
          <Text style={{ fontSize: 10, color: '#1D3B5E', fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>家庭经营提示</Text>
          <Text style={{ fontSize: 11, color: '#666', lineHeight: 17 }}>
            · 定期约会可提升配偶关系值，关系值影响家庭幸福度{'\n'}
            · 结婚纪念日将自动触发特殊事件，带来更多幸福度{'\n'}
            · 子女学业≥80获得「学业优秀」里程碑，品德≥80获「品德高尚」{'\n'}
            · 子女6岁起可选择学校，18岁进入大学，毕业后择业，25岁可安排婚姻{'\n'}
            · 家庭幸福度影响民心的每日自然增减
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

