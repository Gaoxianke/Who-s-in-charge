// 纪检委页面 — rank13+（副院理以上）可处置市级以上干部贪腐案件
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getAllSubordinates, assessSubordinate } from '@/db/gameApi';
import type { Subordinate } from '@/types/game';

// 腐败案件生成（根据下属廉洁值随机触发）
interface CorruptCase {
  id: string;
  subId: string;
  subName: string;
  subRank: string;
  charge: string;
  severity: 'minor' | 'major' | 'serious';
  cleanlinessScore: number;
  discovered: boolean;
}

const CHARGES = [
  '涉嫌违规收受礼品', '滥用职权干预工程项目', '违规使用公款消费',
  '在下属企业违规持股', '利用职权为亲属谋取利益', '收受贿赂批准违规项目',
  '私设"小金库"挪用公款', '违规插手干预司法案件',
];

function buildCases(subs: Subordinate[]): CorruptCase[] {
  return subs
    .filter(s => s.integrity < 55 && s.subLevel >= 5) // 市委以上（rank5+代表县级干部）
    .map(s => {
      const severity: CorruptCase['severity'] =
        s.integrity < 25 ? 'serious' : s.integrity < 40 ? 'major' : 'minor';
      const chargeIdx = Math.abs(s.id.charCodeAt(0) + s.id.charCodeAt(1)) % CHARGES.length;
      return {
        id: `case-${s.id}`,
        subId: s.id,
        subName: s.name,
        subRank: s.position,
        charge: CHARGES[chargeIdx],
        severity,
        cleanlinessScore: s.integrity,
        discovered: true,
      };
    });
}

const SEVERITY_META: Record<CorruptCase['severity'], { label: string; color: string; bg: string }> = {
  minor:   { label: '一般问题', color: '#7B5E2A', bg: '#FFF9E6' },
  major:   { label: '严重违纪', color: '#C82829', bg: '#FFF0F0' },
  serious: { label: '涉嫌犯罪', color: '#fff',    bg: '#8B0000' },
};

export default function DisciplineInspectionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, isLoading, updateGameSave } = useGame();
  const [subs, setSubs] = useState<Subordinate[]>([]);
  const [cases, setCases] = useState<CorruptCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [result, setResult] = useState('');
  const [handled, setHandled] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      if (!save) return;
      getAllSubordinates(save.id).then(list => {
        setSubs(list);
        setCases(buildCases(list));
        setLoading(false);
      });
    }, [save]),
  );

  if (isLoading || !save) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color="#8B0000" /></View>;
  }
  if (save.rankLevel < 13) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F7F7F5' }}>
        <Text style={{ fontSize: 32, marginBottom: 12 }}>🔍</Text>
        <Text style={{ fontSize: 15, color: '#888', textAlign: 'center' }}>晋升至国政院副院理（级别13）后解锁纪检委处置权</Text>
      </View>
    );
  }

  const handleDispose = async (c: CorruptCase, action: 'dismiss' | 'demote') => {
    if (acting) return;
    setActing(true);
    const sub = subs.find(s => s.id === c.subId);
    if (!sub) { setActing(false); return; }

    let meritDelta = 0;
    let desc = '';
    let integrityShockDelta = 0;  // 震慑效果：对其余下属廉洁提升
    if (action === 'dismiss') {
      meritDelta = c.severity === 'serious' ? 40 : c.severity === 'major' ? 25 : 12;
      integrityShockDelta = c.severity === 'serious' ? 5 : c.severity === 'major' ? 3 : 2;
      desc = `双规开除：${c.subName}，政绩 +${meritDelta}，其余下属廉洁 +${integrityShockDelta}（震慑）`;
    } else {
      meritDelta = c.severity === 'serious' ? 20 : c.severity === 'major' ? 12 : 6;
      integrityShockDelta = c.severity === 'serious' ? 2 : c.severity === 'major' ? 1 : 1;
      desc = `降职处理：${c.subName}，政绩 +${meritDelta}，其余下属廉洁 +${integrityShockDelta}（警示）`;
    }

    await updateGameSave({
      meritPoints: save.meritPoints + meritDelta,
      disciplineLastActDay: save.gameDays,
    });

    // 震慑效果：对其余在职下属廉洁度+
    if (integrityShockDelta > 0) {
      const otherSubs = subs.filter(s => s.id !== c.subId && s.isAppointed);
      await Promise.all(
        otherSubs.map(s => assessSubordinate(s.id, save.gameDays, 0, 0, integrityShockDelta, 0))
      );
      // 更新本地state反映变化
      setSubs(prev => prev.map(s =>
        s.id !== c.subId && s.isAppointed
          ? { ...s, integrity: Math.min(100, s.integrity + integrityShockDelta) }
          : s
      ));
    }

    const newHandled = new Set(handled);
    newHandled.add(c.id);
    setHandled(newHandled);
    setResult(`⚖️ ${desc}`);
    setActing(false);
    setTimeout(() => setResult(''), 3000);
  };

  const pendingCases = cases.filter(c => !handled.has(c.id));

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F4F0' }}>
      <StatusBar style="light" backgroundColor="#3D0000" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#3D0000', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: '#ffaaaa', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'rgba(255,200,200,0.6)', fontSize: 9, letterSpacing: 3 }}>中枢纪律督察委员会</Text>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>⚖️ 反腐倡廉 · 纪检查案</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: 'rgba(255,200,200,0.6)', fontSize: 9 }}>待处置案件</Text>
          <Text style={{ color: '#FF6B6B', fontWeight: '700', fontSize: 18 }}>{pendingCases.length}</Text>
        </View>
      </View>

      {/* 权限说明 */}
      <View style={{ backgroundColor: '#5C0000', paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 10 }}>🔒</Text>
        <Text style={{ color: 'rgba(255,200,200,0.8)', fontSize: 10, flex: 1 }}>
          副院理以上可处置市委级以上干部（廉洁值＜55）；处置方式：双开或降职
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#8B0000" />
        </View>
      ) : (
        <ScrollView contentInsetAdjustmentBehavior="automatic">
          <View style={{ padding: 14, gap: 10 }}>

            {pendingCases.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ fontSize: 32, marginBottom: 12 }}>✅</Text>
                <Text style={{ fontSize: 15, color: '#888' }}>暂无待处置案件</Text>
                <Text style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                  {cases.length > 0 ? `共 ${cases.length} 件已处置完毕` : '下属廉洁值均正常，未发现违规线索'}
                </Text>
              </View>
            ) : (
              pendingCases.map(c => {
                const meta = SEVERITY_META[c.severity];
                return (
                  <View key={c.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D0D0D0', overflow: 'hidden' }}>
                    {/* 案件标题 */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, paddingBottom: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{c.subName}</Text>
                        <Text style={{ fontSize: 10, color: '#888', marginTop: 1 }}>{c.subRank}</Text>
                      </View>
                      <View style={{ backgroundColor: meta.bg, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 }}>
                        <Text style={{ fontSize: 10, color: meta.color, fontWeight: '700' }}>{meta.label}</Text>
                      </View>
                    </View>

                    {/* 案情 */}
                    <View style={{ paddingHorizontal: 12, paddingBottom: 10 }}>
                      <Text style={{ fontSize: 11, color: '#555', lineHeight: 17 }}>
                        经核查，{c.subName}同志{c.charge}，廉洁指数 {c.cleanlinessScore}，已上报纪检部门。
                      </Text>
                    </View>

                    {/* 操作 */}
                    <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F0F0F0' }}>
                      <Pressable
                        onPress={() => handleDispose(c, 'dismiss')}
                        disabled={acting}
                        style={{ flex: 1, backgroundColor: '#8B0000', paddingVertical: 11, alignItems: 'center' }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>🔨 双规开除</Text>
                      </Pressable>
                      <View style={{ width: 1, backgroundColor: '#aaa' }} />
                      <Pressable
                        onPress={() => handleDispose(c, 'demote')}
                        disabled={acting}
                        style={{ flex: 1, backgroundColor: '#7B5E2A', paddingVertical: 11, alignItems: 'center' }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>📉 降职处理</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}

            {/* 已处理案件数量 */}
            {handled.size > 0 && (
              <View style={{ backgroundColor: '#F0FAF0', padding: 12, borderWidth: 1, borderColor: '#C0E0C0', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: '#2a7a3b', fontWeight: '600' }}>
                  本次会话已处置 {handled.size} 件违纪案件
                </Text>
              </View>
            )}

            {/* 干部廉洁分布 */}
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 11, color: '#888', fontWeight: '700', letterSpacing: 2, marginBottom: 8 }}>下属廉洁分布概览</Text>
              {[
                { label: '廉洁（≥75）', count: subs.filter(s => s.integrity >= 75).length, color: '#2a7a3b' },
                { label: '一般（55-74）', count: subs.filter(s => s.integrity >= 55 && s.integrity < 75).length, color: '#7B5E2A' },
                { label: '风险（40-54）', count: subs.filter(s => s.integrity >= 40 && s.integrity < 55).length, color: '#C82829' },
                { label: '严重（＜40）', count: subs.filter(s => s.integrity < 40).length, color: '#8B0000' },
              ].map(item => (
                <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 10 }}>
                  <Text style={{ fontSize: 11, color: '#555', width: 90 }}>{item.label}</Text>
                  <View style={{ flex: 1, height: 8, backgroundColor: '#EEE', borderRadius: 4 }}>
                    <View style={{
                      width: subs.length > 0 ? `${(item.count / subs.length) * 100}%` : '0%',
                      height: 8, backgroundColor: item.color, borderRadius: 4,
                    }} />
                  </View>
                  <Text style={{ fontSize: 11, color: item.color, fontWeight: '700', width: 28, textAlign: 'right' }}>{item.count}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      {!!result && (
        <View style={{ position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: '#3D0000', padding: 12, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{result}</Text>
        </View>
      )}
    </View>
  );
}
