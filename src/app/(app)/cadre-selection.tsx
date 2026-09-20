// 中央选调生管理页 — 每年更新一批，可培养、指派到部门
import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';

// ── 选调生数据结构 ──────────────────────────────────────────────────
interface CadreSelectee {
  id: string;
  name: string;
  school: string;
  major: string;
  ability: number;      // 60-100
  potential: number;    // 60-100
  loyalty: number;      // 50-100
  year: number;         // 招募年份（游戏年）
  status: 'pool' | 'training' | 'assigned' | 'graduated';
  trainDays: number;    // 已培养天数
  assignedOrg: string;  // 分配到的部门
  assignedPost: string; // 分配职务
}

const TOP_SCHOOLS = [
  '北京大学', '清华大学', '中国人民大学', '复旦大学', '上海交通大学',
  '浙江大学', '武汉大学', '南京大学', '中山大学', '同济大学',
  '北京师范大学', '国防科技大学', '中央党校',
];

const MAJORS = [
  '政治学', '经济学', '法学', '公共管理', '行政管理',
  '财政学', '金融学', '社会学', '马克思主义理论', '历史学',
];

const ASSIGN_ORGS = [
  '国家发展改革委', '财政部', '商务部', '工业和信息化部', '农业农村部',
  '科技部', '生态环境部', '教育部', '国家卫生健康委', '人力资源社会保障部',
  '中枢办公厅', '国政院办公厅', '中枢宣传部', '中枢组织部', '国家统计局',
];

const ASSIGN_POSTS = ['科员', '副科长', '科长', '副处长', '处长'];

const TRAIN_DURATION = 180; // 培养需要180天
const UPDATE_INTERVAL_DAYS = 365; // 每365天更新一批
const BATCH_SIZE = 8; // 每批8人

function generateName(seed: number): string {
  const surnames = ['张', '王', '李', '赵', '陈', '刘', '杨', '黄', '周', '吴', '徐', '孙', '马', '朱', '胡'];
  const names = ['文博', '建国', '志远', '晓明', '宏伟', '佳琳', '雅倩', '诗雨', '文静', '子涵', '峰', '勇', '磊', '洁', '婷'];
  const s = surnames[seed % surnames.length] ?? '张';
  const n = names[(seed * 7 + 3) % names.length] ?? '文';
  return s + n;
}

function generateSelectee(id: string, seed: number, year: number): CadreSelectee {
  const h = (seed * 2654435761) >>> 0;
  return {
    id,
    name: generateName(seed),
    school: TOP_SCHOOLS[h % TOP_SCHOOLS.length] ?? '北京大学',
    major: MAJORS[(h >> 4) % MAJORS.length] ?? '政治学',
    ability: 60 + (h % 36),
    potential: 60 + ((h >> 6) % 36),
    loyalty: 50 + ((h >> 3) % 46),
    year,
    status: 'pool',
    trainDays: 0,
    assignedOrg: '',
    assignedPost: '',
  };
}

function getGameYear(gameDays: number): number {
  return 2025 + Math.floor(gameDays / 365);
}

export default function CadreSelectionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [tab, setTab] = useState<'pool' | 'training' | 'assigned'>('pool');
  const [selectees, setSelectees] = useState<CadreSelectee[]>([]);
  const [feedback, setFeedback] = useState('');
  const [feedbackOk, setFeedbackOk] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState<CadreSelectee | null>(null);
  const [selOrg, setSelOrg] = useState(0);
  const [selPost, setSelPost] = useState(0);
  const lastUpdateYear = useRef<number>(-1);

  // 每游戏年自动刷新一批选调生 —— Hooks 必须在 guard return 之前调用
  useEffect(() => {
    if (!save) return;
    const gameYear = getGameYear(save.gameDays);
    if (gameYear !== lastUpdateYear.current) {
      lastUpdateYear.current = gameYear;
      const existBatch = selectees.filter(s => s.year === gameYear);
      if (existBatch.length === 0) {
        const newBatch: CadreSelectee[] = Array.from({ length: BATCH_SIZE }, (_, i) => {
          const seed = gameYear * 100 + i + (save.id?.charCodeAt(0) ?? 0);
          return generateSelectee(`sel_${gameYear}_${i}`, seed, gameYear);
        });
        setSelectees(prev => [...prev, ...newBatch]);
        showFeedback(`✅ ${gameYear}年度中央选调生已更新，新入选${BATCH_SIZE}人`);
      }
    }
  }, [save, selectees]);

  // 初始生成（首次）
  useEffect(() => {
    if (!save) return;
    if (selectees.length === 0) {
      const gameYear = getGameYear(save.gameDays);
      const initial: CadreSelectee[] = Array.from({ length: BATCH_SIZE }, (_, i) => {
        const seed = gameYear * 100 + i + (save.id?.charCodeAt(0) ?? 0);
        return generateSelectee(`sel_${gameYear}_${i}`, seed, gameYear);
      });
      setSelectees(initial);
      lastUpdateYear.current = gameYear;
    }
  }, [save, selectees]);

  const showFeedback = (msg: string, ok = true) => {
    setFeedback(msg);
    setFeedbackOk(ok);
    setTimeout(() => setFeedback(''), 3200);
  };

  if (!save) return null;

  const gameYear = getGameYear(save.gameDays);
  const daysToNextUpdate = UPDATE_INTERVAL_DAYS - (save.gameDays % UPDATE_INTERVAL_DAYS);

  const poolList = selectees.filter(s => s.status === 'pool');
  const trainingList = selectees.filter(s => s.status === 'training');
  const assignedList = selectees.filter(s => s.status === 'assigned' || s.status === 'graduated');

  const handleStartTrain = (id: string) => {
    setSelectees(prev => prev.map(s => s.id === id ? { ...s, status: 'training', trainDays: 0 } : s));
    showFeedback('✅ 已开始培养，需180天完成挂职锻炼');
  };

  const handleAdvanceTrain = async (id: string) => {
    const s = selectees.find(x => x.id === id);
    if (!s) return;
    const newDays = Math.min(s.trainDays + 60, TRAIN_DURATION);
    const graduated = newDays >= TRAIN_DURATION;
    setSelectees(prev => prev.map(x => x.id === id
      ? { ...x, trainDays: newDays, status: graduated ? 'pool' : 'training', ability: graduated ? Math.min(100, x.ability + 5) : x.ability }
      : x,
    ));
    if (graduated) {
      await updateGameSave({ meritPoints: (save.meritPoints ?? 0) + 10 });
      showFeedback(`🎓 ${s.name}完成培养，能力+5，政绩+10`);
    } else {
      showFeedback(`📚 ${s.name}培养进度+60天（${newDays}/${TRAIN_DURATION}天）`);
    }
  };

  const handleAssign = (s: CadreSelectee) => {
    const org = ASSIGN_ORGS[selOrg] ?? ASSIGN_ORGS[0]!;
    const post = ASSIGN_POSTS[selPost] ?? ASSIGN_POSTS[0]!;
    setSelectees(prev => prev.map(x => x.id === s.id
      ? { ...x, status: 'assigned', assignedOrg: org, assignedPost: post }
      : x,
    ));
    setShowAssignModal(null);
    showFeedback(`✅ ${s.name}已分配至${org}担任${post}`);
  };

  const getAbilityColor = (v: number) => v >= 85 ? '#2a7a3b' : v >= 70 ? '#7B5E2A' : '#888';
  const getPotentialColor = (v: number) => v >= 85 ? '#1565C0' : v >= 70 ? '#7B5E2A' : '#888';
  const trainPct = (days: number) => Math.round((days / TRAIN_DURATION) * 100);

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      <StatusBar style="light" backgroundColor="#2B4B6F" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#2B4B6F', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: '#a0b4cc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 9, letterSpacing: 3 }}>中枢组织部 · 干部培养</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>🎓 中央选调生管理</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#a0b4cc', fontSize: 9 }}>{gameYear}年</Text>
            <Text style={{ color: '#FFD700', fontSize: 9, marginTop: 1 }}>下批更新：{daysToNextUpdate}天后</Text>
          </View>
        </View>
        {/* 统计行 */}
        <View style={{ flexDirection: 'row', gap: 4, marginBottom: 10 }}>
          {[
            { label: '待培养', value: poolList.length, color: '#a0b4cc' },
            { label: '培养中', value: trainingList.length, color: '#FFD700' },
            { label: '已分配', value: assignedList.length, color: '#81c784' },
          ].map(st => (
            <View key={st.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', padding: 6, alignItems: 'center' }}>
              <Text style={{ color: st.color, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{st.value}</Text>
              <Text style={{ color: '#a0b4cc', fontSize: 9 }}>{st.label}</Text>
            </View>
          ))}
        </View>
        {/* Tab */}
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {([
            { key: 'pool', label: `📋 待培养(${poolList.length})` },
            { key: 'training', label: `🎓 培养中(${trainingList.length})` },
            { key: 'assigned', label: `🏢 已分配(${assignedList.length})` },
          ] as const).map(t => (
            <Pressable key={t.key} onPress={() => setTab(t.key)}
              style={{ flex: 1, paddingVertical: 6, alignItems: 'center', backgroundColor: tab === t.key ? '#C82829' : 'rgba(255,255,255,0.12)' }}
            >
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: tab === t.key ? '700' : '400' }}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 反馈条 */}
      {feedback ? (
        <View style={{ backgroundColor: feedbackOk ? '#e8f5e9' : '#ffebee', padding: 10, borderBottomWidth: 1, borderBottomColor: feedbackOk ? '#c8e6c9' : '#ffcdd2' }}>
          <Text style={{ color: feedbackOk ? '#2a7a3b' : '#C82829', fontSize: 12, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      {/* ── 待培养 ── */}
      {tab === 'pool' && (
        <FlatList
          data={poolList}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 12, gap: 8 }}
          ListEmptyComponent={
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🎓</Text>
              <Text style={{ fontSize: 14, color: '#888', textAlign: 'center' }}>暂无待培养选调生</Text>
              <Text style={{ fontSize: 11, color: '#aaa', marginTop: 4, textAlign: 'center' }}>每年自动更新一批中央选调生</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <View style={{ width: 44, height: 44, backgroundColor: '#EEF0F5', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#2B4B6F' }}>
                  <Text style={{ fontSize: 22 }}>👨‍🎓</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#111' }}>{item.name}</Text>
                    <Text style={{ fontSize: 9, color: '#888' }}>{item.year}年</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: '#555' }}>{item.school} · {item.major}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                    <Text style={{ fontSize: 10, color: getAbilityColor(item.ability), fontWeight: '600' }}>能力{item.ability}</Text>
                    <Text style={{ fontSize: 10, color: getPotentialColor(item.potential), fontWeight: '600' }}>潜力{item.potential}</Text>
                    <Text style={{ fontSize: 10, color: '#7B0026', fontWeight: '600' }}>忠诚{item.loyalty}</Text>
                  </View>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Pressable
                  onPress={() => handleStartTrain(item.id)}
                  style={{ flex: 1, backgroundColor: '#2B4B6F', paddingVertical: 8, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>🎓 开始挂职培养</Text>
                </Pressable>
                <Pressable
                  onPress={() => { setShowAssignModal(item); setSelOrg(0); setSelPost(0); }}
                  style={{ flex: 1, borderWidth: 1, borderColor: '#2B4B6F', paddingVertical: 8, alignItems: 'center' }}
                >
                  <Text style={{ color: '#2B4B6F', fontWeight: '700', fontSize: 11 }}>🏢 直接分配</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      {/* ── 培养中 ── */}
      {tab === 'training' && (
        <FlatList
          data={trainingList}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 12, gap: 8 }}
          ListEmptyComponent={
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>📚</Text>
              <Text style={{ fontSize: 14, color: '#888' }}>暂无培养中的选调生</Text>
            </View>
          }
          renderItem={({ item }) => {
            const pct = trainPct(item.trainDays);
            return (
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <View style={{ width: 44, height: 44, backgroundColor: '#FFF8E1', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#F9A825' }}>
                    <Text style={{ fontSize: 22 }}>📚</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#111' }}>{item.name}</Text>
                    <Text style={{ fontSize: 11, color: '#555' }}>{item.school} · {item.major}</Text>
                    <Text style={{ fontSize: 10, color: '#7B5E2A' }}>挂职培养进度：{item.trainDays}/{TRAIN_DURATION}天</Text>
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#F9A825', fontVariant: ['tabular-nums'] }}>{pct}%</Text>
                </View>
                <View style={{ height: 6, backgroundColor: '#EEE', marginBottom: 8 }}>
                  <View style={{ height: 6, width: `${pct}%`, backgroundColor: '#F9A825' }} />
                </View>
                <Pressable
                  onPress={() => void handleAdvanceTrain(item.id)}
                  style={{ backgroundColor: '#F9A825', paddingVertical: 8, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>📈 加快培养进度（+60天）</Text>
                </Pressable>
              </View>
            );
          }}
        />
      )}

      {/* ── 已分配 ── */}
      {tab === 'assigned' && (
        <FlatList
          data={assignedList}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 12, gap: 8 }}
          ListEmptyComponent={
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🏢</Text>
              <Text style={{ fontSize: 14, color: '#888' }}>暂无已分配的选调生</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#c8e6c9', padding: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 44, height: 44, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#2a7a3b' }}>
                  <Text style={{ fontSize: 22 }}>🏛️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#111' }}>{item.name}</Text>
                  <Text style={{ fontSize: 11, color: '#2a7a3b', fontWeight: '600' }}>{item.assignedOrg} · {item.assignedPost}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                    <Text style={{ fontSize: 10, color: getAbilityColor(item.ability) }}>能力{item.ability}</Text>
                    <Text style={{ fontSize: 10, color: getPotentialColor(item.potential) }}>潜力{item.potential}</Text>
                    <Text style={{ fontSize: 10, color: '#888' }}>{item.school}</Text>
                  </View>
                </View>
                <Text style={{ color: '#2a7a3b', fontSize: 12 }}>✓ 在岗</Text>
              </View>
            </View>
          )}
        />
      )}

      {/* 分配弹窗 */}
      {showAssignModal && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#fff', padding: 20 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#2B4B6F', marginBottom: 12 }}>
              分配 {showAssignModal.name} 到工作岗位
            </Text>
            <Text style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>选择单位：</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {ASSIGN_ORGS.map((org, i) => (
                  <Pressable key={org} onPress={() => setSelOrg(i)}
                    style={{ paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: selOrg === i ? '#2B4B6F' : '#D1D1D1', backgroundColor: selOrg === i ? '#2B4B6F' : '#fff' }}
                  >
                    <Text style={{ color: selOrg === i ? '#fff' : '#555', fontSize: 10 }}>{org}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <Text style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>选择职务：</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
              {ASSIGN_POSTS.map((post, i) => (
                <Pressable key={post} onPress={() => setSelPost(i)}
                  style={{ flex: 1, paddingVertical: 6, borderWidth: 1, borderColor: selPost === i ? '#C82829' : '#D1D1D1', alignItems: 'center', backgroundColor: selPost === i ? '#C82829' : '#fff' }}
                >
                  <Text style={{ color: selPost === i ? '#fff' : '#555', fontSize: 10 }}>{post}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => setShowAssignModal(null)} style={{ flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: '#D1D1D1', alignItems: 'center' }}>
                <Text style={{ color: '#666' }}>取消</Text>
              </Pressable>
              <Pressable onPress={() => handleAssign(showAssignModal)} style={{ flex: 2, paddingVertical: 10, backgroundColor: '#C82829', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>确认分配</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
