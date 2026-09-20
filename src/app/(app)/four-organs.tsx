// 四大班子办公室 — 议政院/参政院/国政院/纪委监委
// rank11+ 可访问，不同职位开放不同班子权限
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getTopLeaders } from '@/lib/leaders';
import { getAllSubordinates, assessSubordinate } from '@/db/gameApi';

// ── 数据类型 ────────────────────────────────────────────────────────
interface OrgAction {
  id: string;
  label: string;
  desc: string;
  icon: string;
  cost: number;        // 政绩消耗
  meritGain: number;
  minRank: number;
  cooldownDays: number;
  integrityGain?: number;  // 对所有在职下属廉洁度提升
}

interface FourOrgan {
  id: 'npc' | 'cppcc' | 'sc' | 'ccdi';
  name: string;
  fullName: string;
  icon: string;
  color: string;
  bgColor: string;
  chairman: string;
  desc: string;
  duties: string[];
  actions: OrgAction[];
  minRank: number;
}

// ── 四大班子定义 ────────────────────────────────────────────────────
function buildFourOrgans(saveId: string): FourOrgan[] {
  const top = getTopLeaders(saveId);

  return [
    {
      id: 'npc',
      name: '全国议政院',
      fullName: '全国议政院常务委员会',
      icon: '🏛️',
      color: '#7B0026',
      bgColor: '#1A0A14',
      chairman: top.npcChairman,
      desc: '最高国家权力机关，行使立法权、监督权、重大决定权和任免权',
      duties: [
        '制定和修改基本法律',
        '监督宪法的实施',
        '审查和批准国家预算',
        '决定国家重大事项',
        '选举和决定国家主要领导人',
        '批准省、自治区、直辖市的建置',
      ],
      minRank: 12,
      actions: [
        { id: 'npc1', label: '提交立法建议', icon: '📜', desc: '就分管领域重要事项向议政院常委会提交立法建议，推动制度完善', cost: 30, meritGain: 20, minRank: 12, cooldownDays: 60 },
        { id: 'npc2', label: '列席常委会会议', icon: '🤝', desc: '以政府代表身份列席议政院常委会会议，汇报工作进展', cost: 0, meritGain: 12, minRank: 12, cooldownDays: 30 },
        { id: 'npc3', label: '答复议政质询', icon: '🎤', desc: '就重大政策决定向议政代表作出书面或口头答复', cost: 10, meritGain: 15, minRank: 13, cooldownDays: 45 },
        { id: 'npc4', label: '推动重要立法', icon: '⚖️', desc: '就国家战略性重要领域推动专项立法进程，提升法治水平', cost: 80, meritGain: 50, minRank: 14, cooldownDays: 90 },
      ],
    },
    {
      id: 'cppcc',
      name: '华夏参政院',
      fullName: '华夏全国参政院',
      icon: '🕊️',
      color: '#1565C0',
      bgColor: '#0A1020',
      chairman: top.cppccChair,
      desc: '中国人民爱国统一战线的组织，是中国共产党领导的多党合作和政治协商的重要机构',
      duties: [
        '政治协商（协助决策）',
        '民主监督（合规监督）',
        '参政议政（政策建议）',
        '团结海内外各界人士',
        '维护国家统一和民族团结',
        '促进祖国和平统一大业',
      ],
      minRank: 11,
      actions: [
        { id: 'cppcc1', label: '参加参政院全体会议', icon: '🏟️', desc: '出席参政院全体大会，展现执政党与各党派合作共事精神', cost: 0, meritGain: 10, minRank: 11, cooldownDays: 30 },
        { id: 'cppcc2', label: '提交参政院提案', icon: '📋', desc: '以委员名义就民生热点、重大发展议题提交高质量参政院提案', cost: 20, meritGain: 18, minRank: 12, cooldownDays: 45 },
        { id: 'cppcc3', label: '统战联谊活动', icon: '🤝', desc: '组织开展统战联谊活动，广泛凝聚各界人士力量', cost: 40, meritGain: 25, minRank: 12, cooldownDays: 60 },
        { id: 'cppcc4', label: '推动两岸交流', icon: '🌉', desc: '借助参政院平台推动两岸经贸文化交流，增进同胞情感纽带', cost: 60, meritGain: 40, minRank: 13, cooldownDays: 90 },
      ],
    },
    {
      id: 'sc',
      name: '国政院',
      fullName: '华夏人民共和国国政院',
      icon: '⚙️',
      color: '#2a7a3b',
      bgColor: '#071510',
      chairman: top.premier,
      desc: '最高国家行政机关，执行国家权力机关制定的法律，统一领导全国行政工作',
      duties: [
        '制定行政法规、规章',
        '领导和管理国民经济和社会发展',
        '领导和管理民政、公安、司法行政等工作',
        '领导和管理国防建设事业',
        '保护华侨的正当的权利和利益',
        '批准省、自治区、直辖市的区域划分',
      ],
      minRank: 12,
      actions: [
        { id: 'sc1', label: '参加国政院常务会议', icon: '🏛️', desc: '列席或参加国政院常务会议，协助研究部署重要工作', cost: 0, meritGain: 15, minRank: 12, cooldownDays: 14 },
        { id: 'sc2', label: '起草重要政策文件', icon: '✍️', desc: '牵头起草国政院重要政策文件，推动重大改革举措落地', cost: 50, meritGain: 35, minRank: 13, cooldownDays: 45 },
        { id: 'sc3', label: '主持国政院全体会议', icon: '🎙️', desc: '以总理身份主持国政院全体会议，审议讨论重大行政事项', cost: 0, meritGain: 30, minRank: 14, cooldownDays: 30 },
        { id: 'sc4', label: '批准重大行政法规', icon: '📖', desc: '以行政首脑身份批准颁布重要行政法规，强化行政法治', cost: 100, meritGain: 60, minRank: 14, cooldownDays: 60 },
      ],
    },
    {
      id: 'ccdi',
      name: '中枢纪律督察委员会',
      fullName: '中枢纪律督察委员会 · 国家监察委员会',
      icon: '⚖️',
      color: '#B71C1C',
      bgColor: '#180505',
      chairman: top.ccdiBoss,
      desc: '党和国家监督专责机构，负责纪律检查和监察工作，推进全面从严治党',
      duties: [
        '检查党的路线方针政策执行情况',
        '维护党的纪律',
        '受理和检举党员违纪行为',
        '对国家公职人员行使监察权',
        '调查职务违法和职务犯罪',
        '推进党风廉政建设和反腐败工作',
      ],
      minRank: 12,
      actions: [
        { id: 'ccdi1', label: '开展廉洁自查', icon: '🔍', desc: '主动开展政治生态自查，健全本单位廉洁制度体系', cost: 0, meritGain: 15, minRank: 12, cooldownDays: 30, integrityGain: 3 },
        { id: 'ccdi2', label: '配合巡视检查', icon: '📁', desc: '积极配合中央巡视组开展专项巡视，主动接受党内监督', cost: 0, meritGain: 20, minRank: 12, cooldownDays: 45, integrityGain: 4 },
        { id: 'ccdi3', label: '推进清廉单位建设', icon: '🏆', desc: '牵头推进分管领域清廉单位建设，推广典型经验做法', cost: 40, meritGain: 30, minRank: 13, cooldownDays: 60, integrityGain: 6 },
        { id: 'ccdi4', label: '主持反腐败专项行动', icon: '🚨', desc: '以主要领导身份主持开展反腐败专项行动，严肃查处违纪违法行为', cost: 120, meritGain: 70, minRank: 14, cooldownDays: 90, integrityGain: 10 },
      ],
    },
  ];
}

export default function FourOrgansScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [activeOrg, setActiveOrg] = useState<FourOrgan['id']>('npc');
  const [actionDone, setActionDone] = useState<Record<string, number>>({}); // key → last gameDays
  const [feedback, setFeedback] = useState('');
  const [feedbackOk, setFeedbackOk] = useState(true);
  const [acting, setActing] = useState(false);

  if (!save) return null;

  const rl = save.rankLevel;

  if (rl < 11) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F4F1', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <StatusBar style="light" backgroundColor="#2B4B6F" />
        <Text style={{ fontSize: 32, marginBottom: 16 }}>🔒</Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#2B4B6F', marginBottom: 8 }}>权限不足</Text>
        <Text style={{ fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20 }}>
          四大班子办公室仅开放给省委书记（11级）及以上职位
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#2B4B6F' }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>返回</Text>
        </Pressable>
      </View>
    );
  }

  const organs = buildFourOrgans(save.id);
  const current = organs.find(o => o.id === activeOrg) ?? organs[0]!;

  const showFeedback = (msg: string, ok = true) => {
    setFeedback(msg);
    setFeedbackOk(ok);
    setTimeout(() => setFeedback(''), 3500);
  };

  const isOnCooldown = (actionId: string, cooldownDays: number) => {
    const last = actionDone[actionId];
    return last !== undefined && save.gameDays - last < cooldownDays;
  };

  const cooldownLeft = (actionId: string, cooldownDays: number) => {
    const last = actionDone[actionId];
    if (last === undefined) return 0;
    return Math.max(0, cooldownDays - (save.gameDays - last));
  };

  const handleAction = async (action: OrgAction) => {
    if (acting) return;
    if (rl < action.minRank) {
      showFeedback(`需要${action.minRank}级以上职位才能执行此操作`, false);
      return;
    }
    if (isOnCooldown(action.id, action.cooldownDays)) {
      showFeedback(`冷却中，还需 ${cooldownLeft(action.id, action.cooldownDays)} 天`, false);
      return;
    }
    if (action.cost > 0 && (save.meritPoints ?? 0) < action.cost) {
      showFeedback(`政绩不足，需要 ${action.cost} 政绩`, false);
      return;
    }
    setActing(true);
    await updateGameSave({
      meritPoints: Math.max(0, (save.meritPoints ?? 0) - action.cost + action.meritGain),
    });

    // 廉洁增益：批量提升在职下属廉洁度
    let integrityDesc = '';
    if (action.integrityGain && action.integrityGain > 0) {
      const allSubs = await getAllSubordinates(save.id);
      const appointed = allSubs.filter(s => s.isAppointed);
      if (appointed.length > 0) {
        await Promise.all(
          appointed.map(s => assessSubordinate(s.id, save.gameDays, 0, 0, action.integrityGain!, 0))
        );
        integrityDesc = `，${appointed.length} 名下属廉洁+${action.integrityGain}`;
      }
    }

    setActionDone(prev => ({ ...prev, [action.id]: save.gameDays }));
    setActing(false);
    const net = action.meritGain - action.cost;
    showFeedback(`✅ ${action.label}：政绩${net >= 0 ? '+' : ''}${net}${integrityDesc}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0F1A' }}>
      <StatusBar style="light" backgroundColor="#0A0F1A" />

      {/* 顶栏 */}
      <View style={{ paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, backgroundColor: '#0A0F1A' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: '#a0b4cc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 9, letterSpacing: 3 }}>HIGH POLITICS</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>四大班子办公室</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#a0b4cc', fontSize: 9 }}>{save.rankName}</Text>
            <Text style={{ color: current.color, fontSize: 9, marginTop: 1, fontWeight: '700' }}>■ {current.name}</Text>
          </View>
        </View>

        {/* 班子切换 */}
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {organs.map(o => {
            const locked = rl < o.minRank;
            const active = activeOrg === o.id;
            return (
              <Pressable
                key={o.id}
                onPress={() => !locked && setActiveOrg(o.id)}
                style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: active ? o.color : 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: active ? o.color : '#1e3a5f', opacity: locked ? 0.4 : 1 }}
              >
                <Text style={{ fontSize: 16 }}>{o.icon}</Text>
                <Text style={{ color: active ? '#fff' : '#888', fontSize: 8, marginTop: 2, fontWeight: active ? '700' : '400' }}>
                  {locked ? '🔒' : o.name.slice(0, 4)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 反馈条 */}
      {feedback ? (
        <View style={{ backgroundColor: feedbackOk ? '#0d2b12' : '#2b0d0d', padding: 10, borderBottomWidth: 1, borderBottomColor: feedbackOk ? '#1a5c2e' : '#7B0026' }}>
          <Text style={{ color: feedbackOk ? '#81c784' : '#ef9a9a', fontSize: 12, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }} showsVerticalScrollIndicator={false}>

        {/* 机构简介 */}
        <View style={{ backgroundColor: current.bgColor, borderWidth: 1, borderColor: current.color + '44', padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Text style={{ fontSize: 36 }}>{current.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: current.color, fontSize: 10, letterSpacing: 2, marginBottom: 2 }}>
                {current.id.toUpperCase()} · {current.minRank}级以上可用
              </Text>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', lineHeight: 20 }}>{current.fullName}</Text>
            </View>
          </View>

          {/* 主要领导 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', padding: 10, marginBottom: 10, gap: 10 }}>
            <View style={{ width: 40, height: 40, backgroundColor: current.color + '33', borderWidth: 1, borderColor: current.color, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20 }}>👤</Text>
            </View>
            <View>
              <Text style={{ color: '#a0b4cc', fontSize: 9, letterSpacing: 1 }}>主要负责人</Text>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 2 }}>{current.chairman}</Text>
            </View>
          </View>

          <Text style={{ color: '#a0b4cc', fontSize: 11, lineHeight: 17, marginBottom: 10 }}>{current.desc}</Text>

          {/* 主要职能 */}
          <View style={{ gap: 4 }}>
            <Text style={{ color: current.color, fontSize: 9, letterSpacing: 2, fontWeight: '700', marginBottom: 4 }}>法定职能</Text>
            {current.duties.map((d, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                <View style={{ width: 14, height: 14, backgroundColor: current.color + '33', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                  <Text style={{ color: current.color, fontSize: 8, fontWeight: '700' }}>{i + 1}</Text>
                </View>
                <Text style={{ color: '#ccc', fontSize: 10, flex: 1, lineHeight: 16 }}>{d}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 可执行操作 */}
        <View style={{ backgroundColor: '#111827', borderWidth: 1, borderColor: '#1e3a5f', padding: 14 }}>
          <Text style={{ color: current.color, fontSize: 10, letterSpacing: 2, fontWeight: '700', marginBottom: 10 }}>
            {current.icon} 参与途径与职权操作
          </Text>
          {current.actions.map(action => {
            const cd = isOnCooldown(action.id, action.cooldownDays);
            const locked = rl < action.minRank;
            const canAfford = action.cost === 0 || (save.meritPoints ?? 0) >= action.cost;
            const net = action.meritGain - action.cost;
            const disabled = cd || locked || !canAfford || acting;
            return (
              <View
                key={action.id}
                style={{ borderWidth: 1, borderColor: locked ? '#1e3a5f' : cd ? '#2a2a3a' : current.color + '44', padding: 12, marginBottom: 8, backgroundColor: locked ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)', opacity: locked ? 0.5 : 1 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Text style={{ fontSize: 20 }}>{action.icon}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: locked ? '#555' : '#fff', flex: 1 }}>{action.label}</Text>
                  {locked && (
                    <View style={{ backgroundColor: '#333', paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: '#888', fontSize: 9 }}>需{action.minRank}级</Text>
                    </View>
                  )}
                  {cd && !locked && (
                    <View style={{ backgroundColor: '#2a2a3a', paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: '#a0b4cc', fontSize: 9 }}>冷却{cooldownLeft(action.id, action.cooldownDays)}天</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 11, color: '#888', lineHeight: 16, marginBottom: 8 }}>{action.desc}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {action.cost > 0 && <Text style={{ fontSize: 10, color: '#ef9a9a' }}>消耗政绩 {action.cost}</Text>}
                    <Text style={{ fontSize: 10, color: '#81c784' }}>获得政绩 {action.meritGain}</Text>
                    <Text style={{ fontSize: 10, color: net >= 0 ? current.color : '#888', fontWeight: '700' }}>
                      净{net >= 0 ? '+' : ''}{net}
                    </Text>
                    {action.integrityGain && action.integrityGain > 0 && (
                      <Text style={{ fontSize: 10, color: '#4fc3f7', fontWeight: '700' }}>
                        🛡️ 下属廉洁+{action.integrityGain}
                      </Text>
                    )}
                  </View>
                  <Pressable
                    onPress={() => void handleAction(action)}
                    style={{ paddingHorizontal: 14, paddingVertical: 6, backgroundColor: disabled ? '#1e2a3a' : current.color }}
                  >
                    <Text style={{ color: disabled ? '#555' : '#fff', fontSize: 11, fontWeight: '700' }}>
                      {locked ? '权限不足' : cd ? '冷却中' : !canAfford ? '政绩不足' : '执行'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

        {/* 四大班子协作说明 */}
        <View style={{ backgroundColor: '#0d1520', borderWidth: 1, borderColor: '#1e3a5f', padding: 12 }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10, fontWeight: '700', marginBottom: 6, letterSpacing: 1 }}>四大班子协作机制</Text>
          <Text style={{ color: '#666', fontSize: 10, lineHeight: 16 }}>
            · 议政院：立法和监督 — 推动制度创新，增强法治保障{'\n'}
            · 参政院：协商和建言 — 广泛凝聚共识，扩大政治联盟{'\n'}
            · 国政院：行政和执行 — 统筹部署，推进各项政策落地{'\n'}
            · 纪委监委：监督和惩戒 — 维护党纪国法，推进全面从严治党{'\n'}
            · 各项操作均有冷却期，建议分散执行，协同提升政绩
          </Text>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}
