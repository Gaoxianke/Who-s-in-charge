// 职能管理总览页 — 按官职体系（党委/政法/政府）分组显示
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getSubordinates, getDeptStaffCounts, rewardDeptHead } from '@/db/gameApi';
import {
  DEPT_CONFIG,
  getDeptNameByRank,
  getDeptHeadTitle,
  getDeptStaffQuota,
} from '@/types/game';
import type { DeptKey, Subordinate } from '@/types/game';

// ─── 各部门所属系统分组 ──────────────────────────────────────
type DeptSystem = 'party' | 'politic' | 'gov';

const DEPT_SYSTEM: Record<DeptKey, DeptSystem> = {
  organization: 'party',   // 组织部 → 党委系统
  police:       'politic',  // 公安局 → 政法系统
  petition:     'politic',  // 信访办 → 政法/信访系统
  ndrc:         'gov',
  finance:      'gov',
  urban:        'gov',
  education:    'gov',
  health:       'gov',
  ecology:      'gov',
  market:       'gov',
  agriculture:  'gov',
  personnel:    'gov',
  invest:       'gov',
  tax:          'gov',
};

// ─── 各系统按职级显示的上级机构标签 ─────────────────────────
function getSystemLabel(system: DeptSystem, rankLevel: number) {
  const level =
    rankLevel <= 3  ? 'town'     :
    rankLevel <= 6  ? 'county'   :
    rankLevel <= 9  ? 'city'     :
    rankLevel <= 11 ? 'province' : 'national';

  const LABELS: Record<DeptSystem, Record<string, string>> = {
    party: {
      town:     '乡镇党委  ·  党委工作系统',
      county:   '县委  ·  党委工作系统',
      city:     '市委  ·  党委工作系统',
      province: '省委  ·  党委工作系统',
      national: '中央  ·  党委工作系统',
    },
    politic: {
      town:     '乡镇政法  ·  政法综治系统',
      county:   '县政法委  ·  政法综治系统',
      city:     '市政法委  ·  政法综治系统',
      province: '省政法委  ·  政法综治系统',
      national: '中央政法委  ·  政法综治系统',
    },
    gov: {
      town:     '乡镇人民政府  ·  行政职能系统',
      county:   '县人民政府  ·  行政职能系统',
      city:     '市人民政府  ·  行政职能系统',
      province: '省人民政府  ·  行政职能系统',
      national: '国政院  ·  行政职能系统',
    },
  };
  return LABELS[system][level];
}

// ─── 各系统的主色 ─────────────────────────────────────────────
const SYSTEM_COLOR: Record<DeptSystem, string> = {
  party:   '#7A1B1E',
  politic: '#1a3a5c',
  gov:     '#1a4a2e',
};

const SYSTEM_TITLE: Record<DeptSystem, string> = {
  party:   '党委工作系统',
  politic: '政法综治系统',
  gov:     '政府职能系统',
};

const SYSTEM_ICON: Record<DeptSystem, string> = {
  party:   '🏛️',
  politic: '⚖️',
  gov:     '🏢',
};

// ─── 各部门深色卡片背景 ──────────────────────────────────────
const DEPT_BG: Record<DeptKey, string> = {
  organization:'#3a0a1a',
  police:      '#0e2a42',
  petition:    '#1a1030',
  ndrc:        '#1a4a2e',
  finance:     '#3a2000',
  urban:       '#1a1040',
  education:   '#003040',
  health:      '#3a0010',
  ecology:     '#103010',
  market:      '#2a1a00',
  agriculture: '#1e2e00',
  personnel:   '#102030',
  invest:      '#28103a',
  tax:         '#201010',
};

type DeptReward = { subId: string; deptKey: DeptKey; isReward: boolean };

export default function DepartmentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save } = useGame();
  const [chiefMap, setChiefMap] = useState<Partial<Record<DeptKey, Subordinate>>>({});
  const [staffCounts, setStaffCounts] = useState<Record<string, number>>({});
  const [rewardModal, setRewardModal] = useState<DeptReward | null>(null);
  const [toastMsg, setToastMsg] = useState('');

  const loadData = useCallback(async () => {
    if (!save) return;
    const [subs, counts] = await Promise.all([
      getSubordinates(save.id),
      getDeptStaffCounts(save.id),
    ]);
    const map: Partial<Record<DeptKey, Subordinate>> = {};
    subs.filter(s => s.isAppointed && s.appointedDept && s.deptPosition === 'head')
      .forEach((s: Subordinate) => {
        if (s.appointedDept) map[s.appointedDept] = s;
      });
    setChiefMap(map);
    setStaffCounts(counts);
  }, [save]);

  useFocusEffect(useCallback(() => { void loadData(); }, [loadData]));

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const handleReward = async (pending: DeptReward) => {
    if (!pending.subId) return;
    await rewardDeptHead(pending.subId, pending.isReward);
    setRewardModal(null);
    showToast(pending.isReward ? '✅ 已发出表扬，局长忠诚度提升' : '⚠️ 已实施问责，局长需改进工作');
    await loadData();
  };

  const rankLevel = save?.rankLevel ?? 1;
  const staffQuota = getDeptStaffQuota(rankLevel);
  const deptKeys = Object.keys(DEPT_CONFIG) as DeptKey[];

  // 按系统分组
  const groups: Record<DeptSystem, DeptKey[]> = { party: [], politic: [], gov: [] };
  deptKeys.forEach(k => groups[DEPT_SYSTEM[k]].push(k));
  const systemOrder: DeptSystem[] = ['party', 'politic', 'gov'];

  return (
    <View style={{ flex: 1, backgroundColor: '#0D1B2A' }}>
      <StatusBar style="light" backgroundColor="#0D1B2A" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#0D1B2A', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1E3050' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: '#6688AA', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#5577AA', fontSize: 10, letterSpacing: 2 }}>政府职能架构</Text>
          <Text style={{ color: '#E8D5A0', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>职能管理</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: '#5577AA', fontSize: 10 }}>{save?.rankName}</Text>
          <Text style={{ color: '#C8E0F4', fontSize: 11, fontWeight: '600', marginTop: 1 }}>{save?.cityName}</Text>
        </View>
      </View>

      {/* 当前所处行政层级说明 */}
      <View style={{ backgroundColor: '#111E30', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1E3050' }}>
        <Text style={{ fontSize: 11, color: '#7799BB', lineHeight: 17 }}>
          辖区下设 <Text style={{ color: '#E8D5A0', fontWeight: '700' }}>三大职能系统</Text>，共 {deptKeys.length} 个工作部门。点击部门查看详情，长按对一把手进行考核。
        </Text>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 14, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {systemOrder.map(system => {
          const keys = groups[system];
          const sysColor = SYSTEM_COLOR[system];
          const sysLabel = getSystemLabel(system, rankLevel);
          return (
            <View key={system}>
              {/* 系统分组标题栏 */}
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                backgroundColor: sysColor + 'CC',
                paddingHorizontal: 14, paddingVertical: 10,
                borderRadius: 2, marginBottom: 6,
                borderLeftWidth: 3, borderLeftColor: '#E8D5A0',
              }}>
                <Text style={{ fontSize: 18 }}>{SYSTEM_ICON[system]}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#E8D5A0', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 }}>
                    {SYSTEM_TITLE[system]}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, marginTop: 1 }}>
                    {sysLabel}
                  </Text>
                </View>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                  <Text style={{ color: '#E8D5A0', fontSize: 10, fontWeight: '700' }}>{keys.length} 个部门</Text>
                </View>
              </View>

              {/* 各部门卡片 */}
              <View style={{ gap: 6 }}>
                {keys.map((key) => {
                  const cfg = DEPT_CONFIG[key];
                  const chief = chiefMap[key] ?? null;
                  const count = staffCounts[key] ?? 0;
                  const bgColor = DEPT_BG[key];
                  const deptDisplayName = getDeptNameByRank(key, rankLevel);
                  const headTitle = getDeptHeadTitle(key, rankLevel);
                  return (
                    <Pressable
                      key={key}
                      onPress={() => router.push({ pathname: '/(app)/dept-detail', params: { type: key } })}
                      onLongPress={() => {
                        if (chief) setRewardModal({ subId: chief.id, deptKey: key, isReward: true });
                      }}
                      style={{ backgroundColor: bgColor, padding: 14, borderRadius: 2, borderLeftWidth: 2, borderLeftColor: sysColor }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                          <Text style={{ fontSize: 26 }}>{cfg.icon}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: '#E8D5A0', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 }}>
                              {deptDisplayName}
                            </Text>
                            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, marginTop: 2 }}>
                              {cfg.desc.slice(0, 24)}…
                            </Text>
                          </View>
                        </View>
                        <View style={{ alignItems: 'flex-end', minWidth: 80 }}>
                          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, letterSpacing: 0.3 }}>
                            {headTitle}
                          </Text>
                          {chief ? (
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2 }}>
                              在任：{chief.name}
                            </Text>
                          ) : (
                            <Text style={{ color: 'rgba(255,120,100,0.9)', fontSize: 10, marginTop: 2 }}>
                              暂无一把手
                            </Text>
                          )}
                        </View>
                      </View>

                      {/* 编制 + 职能标签 */}
                      <View style={{
                        marginTop: 10, paddingTop: 8,
                        borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
                        flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5,
                      }}>
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 2 }}>
                          <Text style={{ color: '#E8D5A0', fontSize: 9 }}>👥 {count}/{staffQuota} 人</Text>
                        </View>
                        {cfg.functions.map((f, i) => (
                          <View key={i} style={{ backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 2 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9 }}>{f}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={{ position: 'absolute', right: 10, top: 16 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>›</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Toast */}
      {toastMsg !== '' && (
        <View style={{ position: 'absolute', bottom: 48, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 6 }}>
          <Text style={{ color: '#fff', fontSize: 13 }}>{toastMsg}</Text>
        </View>
      )}

      {/* 表扬/问责弹窗 */}
      {rewardModal && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#111E30', borderWidth: 1, borderColor: '#2D4A6B', margin: 32, padding: 24, borderRadius: 4, width: 300 }}>
            <Text style={{ fontSize: 11, color: '#5577AA', letterSpacing: 2, marginBottom: 4 }}>
              干部考核
            </Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#E8D5A0', marginBottom: 8 }}>
              {getDeptNameByRank(rewardModal.deptKey, rankLevel)}
            </Text>
            <Text style={{ fontSize: 11, color: '#7799BB', marginBottom: 20, lineHeight: 18 }}>
              对当前一把手进行表扬或问责，将影响其忠诚度与工作效率。
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                onPress={() => handleReward({ ...rewardModal, isReward: true })}
                style={{ flex: 1, backgroundColor: '#1a4a2e', paddingVertical: 10, alignItems: 'center', borderRadius: 2 }}
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>表扬</Text>
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, marginTop: 2 }}>忠诚+8 能力+2</Text>
              </Pressable>
              <Pressable
                onPress={() => handleReward({ ...rewardModal, isReward: false })}
                style={{ flex: 1, backgroundColor: '#7a1a1a', paddingVertical: 10, alignItems: 'center', borderRadius: 2 }}
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>问责</Text>
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, marginTop: 2 }}>忠诚-8 能力-2</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => setRewardModal(null)} style={{ marginTop: 14, alignItems: 'center' }}>
              <Text style={{ color: '#5577AA', fontSize: 12 }}>取消</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

