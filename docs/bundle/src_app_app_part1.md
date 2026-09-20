# src/app/(app)_part1

共 22 个文件。
<a id="srcappapp_layouttsx"></a>
## `src/app/(app)/_layout.tsx`

```tsx
import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="save-select" />
      <Stack.Screen name="character-create" />
      <Stack.Screen name="subordinates" />
      <Stack.Screen name="police" />
      <Stack.Screen name="tasks" />
      <Stack.Screen name="sponsor" />
      <Stack.Screen name="factions" />
      <Stack.Screen name="events" />
      <Stack.Screen name="promotion" />
      <Stack.Screen name="departments" />
      <Stack.Screen name="dept-detail" />
      <Stack.Screen name="family" />
      <Stack.Screen name="recruit" />
      <Stack.Screen name="finance" />
      <Stack.Screen name="governing-areas" />
      <Stack.Screen name="construction" />
      <Stack.Screen name="livelihood" />
      <Stack.Screen name="meeting" />
      <Stack.Screen name="secretary" />
      <Stack.Screen name="leadership" />
      <Stack.Screen name="monthly-report" />
      <Stack.Screen name="enterprise-list" />
      <Stack.Screen name="fiscal" />
      <Stack.Screen name="annual-report" />
      <Stack.Screen name="ministry" />
      <Stack.Screen name="vice-premier" />
      <Stack.Screen name="exchange-officer" />
      <Stack.Screen name="concurrent-posts" />
      <Stack.Screen name="national-leaders" />
      <Stack.Screen name="military" />
      <Stack.Screen name="science-tech" />
      <Stack.Screen name="discipline-inspection" />
      <Stack.Screen name="national-center" />
      <Stack.Screen name="premier-office" />
      <Stack.Screen name="personal-wealth" />
      <Stack.Screen name="cadre-selection" />
      <Stack.Screen name="four-organs" />
      <Stack.Screen name="provinces-manage" />
      <Stack.Screen name="national-construction" />
      <Stack.Screen name="military-commission" />
      <Stack.Screen name="cadre-appointment" />
      <Stack.Screen name="province-appointment" />
      <Stack.Screen name="city-appointment" />
      <Stack.Screen name="npc-congress" />
      <Stack.Screen name="official-hierarchy" />
      <Stack.Screen name="admin-panel" />
      <Stack.Screen name="enter-code" />
      <Stack.Screen name="pending-approval" />
      <Stack.Screen name="rejected-notice" />
      <Stack.Screen name="retirement-ending" />
      <Stack.Screen name="health" />
      <Stack.Screen name="game-over" />
      <Stack.Screen name="bribery" />
      <Stack.Screen name="discipline-risk" />
      <Stack.Screen name="interrogation" />
      <Stack.Screen name="illicit-assets" />
    </Stack>
  );
}
```

<a id="srcappappadminpaneltsx"></a>
## `src/app/(app)/admin-panel.tsx`

```tsx
// 管理员后台 —— 外壳：角色鉴权 + 权限矩阵控制 Tab 显隐 + 两行 Tab 导航
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/client/supabase';
import { A } from '@/components/admin/shared';
import { StatsTab } from '@/components/admin/StatsTab';
import { AccountTab } from '@/components/admin/AccountTab';
import { RedeemTab } from '@/components/admin/RedeemTab';
import { SaveTab } from '@/components/admin/SaveTab';
import { AnnouncementTab } from '@/components/admin/PushTab';
import { ExportTab } from '@/components/admin/ExportTab';
import { RiskTab } from '@/components/admin/RiskTab';
import { CleanupTab } from '@/components/admin/CleanupTab';
import { DatabaseTab } from '@/components/admin/DatabaseTab';
import { ApprovalTab } from '@/components/admin/ApprovalTab';
import { TestCodeTab } from '@/components/admin/TestCodeTab';
import { PasswordResetTab } from '@/components/admin/PasswordResetTab';
import { TestCodeStatsTab } from '@/components/admin/TestCodeStatsTab';
import { PlayerRankTab } from '@/components/admin/PlayerRankTab';
import { PlayerNameTab } from '@/components/admin/PlayerNameTab';
import { SensitiveWordTab } from '@/components/admin/SensitiveWordTab';
import { BannedTab } from '@/components/admin/BannedTab';
import { BanAppealsTab } from '@/components/admin/BanAppealsTab';
import { NpcNameTab } from '@/components/admin/NpcNameTab';
import { TempAppealsTab } from '@/components/admin/TempAppealsTab';
import { ClearSaveTab } from '@/components/admin/ClearSaveTab';
import { adminApprovalStats, adminListAudit, adminListPasswordResetRequests, currentAdminRole, isCurrentAdmin, type AuditLog } from '@/lib/adminApi';

type TabKey = 'approval' | 'testcode' | 'tcstats' | 'pwreset' | 'account' | 'stats' | 'redeem' | 'save' | 'clearsave' | 'push' | 'export' | 'risk' | 'cleanup' | 'database' | 'rank' | 'pname' | 'sensitive' | 'banned' | 'banappeals' | 'npcnames' | 'tempappeals';

// 权限矩阵（按文档七）：每个 Tab 所需最低角色
const TAB_MIN_ROLE: Record<TabKey, string> = {
  approval: 'admin',
  testcode: 'admin',
  tcstats: 'super_admin',
  pwreset: 'super_admin',
  account: 'viewer',
  stats: 'viewer',
  redeem: 'admin',
  save: 'admin',     // 查看存档 admin+，修改 super_admin（Tab 内部再分级）
  clearsave: 'admin', // 清除玩家存档（保留登录账号）
  push: 'admin',
  export: 'admin',
  risk: 'admin',
  cleanup: 'admin',
  database: 'admin',
  rank: 'admin',
  pname: 'admin',
  sensitive: 'admin',
  banned: 'admin',
  banappeals: 'super_admin',
  npcnames: 'admin',
  tempappeals: 'admin',
};

// Tab 业务分组
type TabGroup = 'approval' | 'operation' | 'system';
const TAB_GROUP: Record<TabKey, TabGroup> = {
  approval: 'approval', testcode: 'approval', tcstats: 'approval', pwreset: 'approval', account: 'approval',
  stats: 'operation', redeem: 'operation', save: 'operation', clearsave: 'operation', push: 'operation', export: 'operation', risk: 'operation', rank: 'operation', pname: 'operation',
  cleanup: 'system', database: 'system', sensitive: 'system', banned: 'system', banappeals: 'system', npcnames: 'system', tempappeals: 'system',
};
const GROUP_META: { key: TabGroup; label: string; icon: string }[] = [
  { key: 'approval', label: '审批', icon: '✅' },
  { key: 'operation', label: '运营', icon: '🛠️' },
  { key: 'system', label: '系统', icon: '⚙️' },
];

function roleLevel(role: string): number {
  return role === 'super_admin' ? 3 : role === 'admin' ? 2 : role === 'viewer' ? 1 : 0;
}

export default function AdminPanelScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [role, setRole] = useState<string>('');

  // 第一行可见 Tab 与审计日志（第二区按需加载）
  const [tab, setTab] = useState<TabKey>('approval');
  const [audits, setAudits] = useState<AuditLog[]>([]);
  const [showAudit, setShowAudit] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [pwResetPending, setPwResetPending] = useState(0);

  // 分组折叠状态（默认全部展开）
  const [collapsed, setCollapsed] = useState<Record<TabGroup, boolean>>({ approval: false, operation: false, system: false });
  const toggleGroup = (g: TabGroup) => setCollapsed((p) => ({ ...p, [g]: !p[g] }));

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const ok = await isCurrentAdmin();
        if (!ok) { setAuthChecked(true); return; }
        const r = await currentAdminRole();
        setRole(r ?? 'admin');
        setAuthChecked(true);
        // 加载待审批数量
        const stats = await adminApprovalStats();
        setPendingCount(stats.pending);
        // 加载待审批的密码重置申请数量（超管红点提醒）
        const pwReqs = await adminListPasswordResetRequests('pending', 100);
        setPwResetPending(pwReqs.length);
      })();
    }, []),
  );

  const loadAudit = async () => {
    setShowAudit(true);
    setAudits(await adminListAudit(30));
  };

  if (!authChecked) {
    return (
      <View style={{ flex: 1, backgroundColor: A.bg, alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={A.gold} />
      </View>
    );
  }

  if (roleLevel(role) < 1) {
    return (
      <View style={{ flex: 1, backgroundColor: A.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
        <StatusBar style="light" />
        <Text style={{ color: A.red, fontSize: 16 }}>⛔ 无管理员权限</Text>
        <Text style={{ color: A.textHint, fontSize: 11, textAlign: 'center' }}>请联系超级管理员授权后再访问</Text>
        <Pressable cssInterop={false} onPress={() => router.replace('/(app)/home' as never)} style={{ borderWidth: 1, borderColor: A.goldDim, paddingHorizontal: 20, paddingVertical: 10 }}>
          <Text style={{ color: A.gold, fontSize: 13 }}>返回主页</Text>
        </Pressable>
      </View>
    );
  }

  // 当前角色可见的 Tab
  const isSuperAdmin = role === 'super_admin';
  const allTabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'approval', label: '用户审批', icon: '✅' },
    { key: 'testcode', label: '测试码', icon: '🔑' },
    { key: 'tcstats', label: '生成统计', icon: '📊' },
    { key: 'pwreset', label: '重置审批', icon: '🔐' },
    { key: 'account', label: '账号', icon: '👤' },
    { key: 'stats', label: '统计', icon: '📈' },
    { key: 'redeem', label: '兑换码', icon: '🎟️' },
    { key: 'save', label: '删除账号', icon: '🗑️' },
    { key: 'clearsave', label: '清除存档', icon: '🧹' },
    { key: 'push', label: '公告', icon: '📢' },
    { key: 'export', label: '导出', icon: '📥' },
    { key: 'risk', label: '风险监控', icon: '🚨' },
    { key: 'rank', label: '玩家排行', icon: '🏆' },
    { key: 'pname', label: '存档名称', icon: '🔍' },
    { key: 'sensitive', label: '敏感词库', icon: '🚫' },
    { key: 'npcnames', label: 'NPC名库', icon: '🧑‍💼' },
    { key: 'banned', label: '封禁记录', icon: '⛔' },
    { key: 'banappeals', label: '封禁申诉', icon: '📨' },
    { key: 'tempappeals', label: '临时申诉', icon: '📝' },
    { key: 'cleanup', label: '清理', icon: '🧹' },
    { key: 'database', label: '数据库', icon: '🗄️' },
  ];
  const visibleTabs = allTabs.filter((t) => roleLevel(role) >= roleLevel(TAB_MIN_ROLE[t.key]));

  const renderTab = () => {
    switch (tab) {
      case 'approval': return <ApprovalTab role={role} />;
      case 'testcode': return <TestCodeTab role={role} />;
      case 'tcstats': return <TestCodeStatsTab />;
      case 'pwreset': return <PasswordResetTab role={role} />;
      case 'account': return <AccountTab role={role} />;
      case 'stats': return <StatsTab role={role} />;
      case 'redeem': return <RedeemTab role={role} />;
      case 'save': return <SaveTab role={role} />;
      case 'clearsave': return <ClearSaveTab />;
      case 'push': return <AnnouncementTab role={role} />;
      case 'export': return <ExportTab role={role} />;
      case 'risk': return <RiskTab role={role} />;
      case 'rank': return <PlayerRankTab />;
      case 'pname': return <PlayerNameTab />;
      case 'sensitive': return <SensitiveWordTab />;
      case 'npcnames': return <NpcNameTab />;
      case 'banned': return <BannedTab role={role} />;
      case 'banappeals': return <BanAppealsTab role={role} />;
      case 'tempappeals': return <TempAppealsTab role={role} />;
      case 'cleanup': return <CleanupTab role={role} />;
      case 'database': return <DatabaseTab role={role} />;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: A.bg, paddingTop: insets.top }}>
      <StatusBar style="light" />

      {/* 顶部标题栏 */}
      <View style={{ backgroundColor: isSuperAdmin ? '#1A0A2E' : A.bgMid, borderBottomWidth: 2, borderBottomColor: isSuperAdmin ? '#7B2FBE' : A.goldDim, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={{ color: isSuperAdmin ? '#D4A8FF' : A.goldLight, fontSize: 14, fontWeight: '700', letterSpacing: 2 }}>管理员后台</Text>
            {/* 角色徽章 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: isSuperAdmin ? 'rgba(123,47,190,0.35)' : 'rgba(200,168,75,0.15)', borderWidth: 1, borderColor: isSuperAdmin ? '#7B2FBE' : A.goldDim, paddingHorizontal: 6, paddingVertical: 1 }}>
              <Text style={{ fontSize: 10 }}>{isSuperAdmin ? '👑' : '🛡️'}</Text>
              <Text style={{ color: isSuperAdmin ? '#D4A8FF' : A.gold, fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>{roleLabel(role)}</Text>
            </View>
            {pendingCount > 0 && (
              <View style={{ backgroundColor: '#C82829', borderRadius: 8, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{pendingCount > 99 ? '99+' : String(pendingCount)}</Text>
              </View>
            )}
            {pwResetPending > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#C82829', paddingHorizontal: 5, paddingVertical: 1 }}>
                <Text style={{ fontSize: 8 }}>🔐</Text>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{pwResetPending > 99 ? '99+' : String(pwResetPending)}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable cssInterop={false} onPress={loadAudit} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderColor: A.goldDim, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ fontSize: 12 }}>📜</Text>
            <Text style={{ color: A.gold, fontSize: 10, fontWeight: '600' }}>审计</Text>
          </Pressable>
          <Pressable cssInterop={false} onPress={() => supabase.auth.signOut()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderColor: A.red, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ fontSize: 12 }}>🚪</Text>
            <Text style={{ color: A.red, fontSize: 10, fontWeight: '600' }}>退出</Text>
          </Pressable>
        </View>
      </View>

      {/* Tab 导航：按业务分组（审批 / 运营 / 系统） */}
      <View style={{ backgroundColor: A.bgMid, borderBottomWidth: 1, borderBottomColor: A.divider }}>
        {GROUP_META.map((g) => {
          const groupTabs = visibleTabs.filter((t) => TAB_GROUP[t.key] === g.key);
          if (groupTabs.length === 0) return null;
          const isCollapsed = collapsed[g.key];
          return (
            <View key={g.key} style={{ borderBottomWidth: 1, borderBottomColor: A.divider }}>
              <Pressable
                cssInterop={false}
                onPress={() => toggleGroup(g.key)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingTop: 6, paddingBottom: isCollapsed ? 6 : 2 }}
              >
                <Text style={{ fontSize: 11 }}>{g.icon}</Text>
                <Text style={{ color: A.textHint, fontSize: 10, fontWeight: '700', letterSpacing: 2, flex: 1 }}>{g.label}</Text>
                <Text style={{ color: A.textHint, fontSize: 12, marginRight: 2 }}>{isCollapsed ? '∨' : '∧'}</Text>
              </Pressable>
              {!isCollapsed && (
                <TabRow tabs={groupTabs} active={tab} onSelect={setTab} pendingCount={pendingCount} pwResetPending={pwResetPending} />
              )}
            </View>
          );
        })}
      </View>

      <View style={{ flex: 1 }}>
        {renderTab()}
      </View>

      {/* 审计日志抽屉 */}
      {showAudit ? (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)' }} >
          <Pressable cssInterop={false} onPress={() => setShowAudit(false)} style={{ flex: 1 }} />
          <View style={{ backgroundColor: A.bgCard, maxHeight: '70%', borderTopWidth: 2, borderTopColor: A.gold }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: A.divider }}>
              <Text style={{ color: A.goldLight, fontSize: 14, fontWeight: '700' }}>📜 操作审计日志</Text>
              <Pressable cssInterop={false} onPress={() => setShowAudit(false)}><Text style={{ color: A.gold, fontSize: 18 }}>×</Text></Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 14, gap: 8 }}>
              {audits.length === 0 ? (
                <Text style={{ color: A.textHint, fontSize: 12, textAlign: 'center', paddingVertical: 20 }}>暂无记录</Text>
              ) : audits.map((a) => (
                <View key={a.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: A.divider, gap: 3 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: A.goldLight, fontSize: 12, fontWeight: '600' }}>{a.action}</Text>
                    <Text style={{ color: A.textHint, fontSize: 10 }}>{new Date(a.created_at).toLocaleString('zh-CN')}</Text>
                  </View>
                  <Text style={{ color: A.textSecond, fontSize: 11 }}>操作人：{a.admin_email}</Text>
                  {a.target_user_id ? <Text style={{ color: A.textSecond, fontSize: 11 }}>目标：{a.target_user_id.slice(0, 8)}...</Text> : null}
                  {Object.keys(a.detail).length > 0 ? (
                    <Text style={{ color: A.textHint, fontSize: 10 }}>{JSON.stringify(a.detail)}</Text>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function TabRow({ tabs, active, onSelect, pendingCount = 0, pwResetPending = 0 }: { tabs: { key: TabKey; label: string; icon: string }[]; active: TabKey; onSelect: (k: TabKey) => void; pendingCount?: number; pwResetPending?: number }) {
  if (tabs.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row' }}>
      {tabs.map((t) => {
        const on = active === t.key;
        const showBadge = (t.key === 'approval' && pendingCount > 0) || (t.key === 'pwreset' && pwResetPending > 0);
        const badgeCount = t.key === 'approval' ? pendingCount : pwResetPending;
        return (
          <Pressable key={t.key} cssInterop={false} onPress={() => onSelect(t.key)} style={{ flex: 1, paddingVertical: 9, alignItems: 'center', gap: 4, borderBottomWidth: 2, borderBottomColor: on ? A.gold : 'transparent', backgroundColor: on ? A.goldBg : 'transparent' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Text style={{ fontSize: 15 }}>{t.icon}</Text>
              {showBadge && (
                <View style={{ backgroundColor: '#C82829', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{badgeCount > 99 ? '99+' : String(badgeCount)}</Text>
                </View>
              )}
            </View>
            <Text style={{ color: on ? A.goldLight : A.textSecond, fontSize: 10, fontWeight: on ? '700' : '400' }}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function roleLabel(role: string): string {
  return role === 'super_admin' ? '超级管理员' : role === 'admin' ? '管理员' : role === 'viewer' ? '只读' : '未知';
}
```

<a id="srcappappannualreporttsx"></a>
## `src/app/(app)/annual-report.tsx`

```tsx
// 年度综合排行报表详情页
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { supabase } from '@/client/supabase';
import type { MonthlyReport } from '@/types/game';

function rowToReport(row: Record<string, unknown>): MonthlyReport {
  return {
    id: row.id as string,
    saveId: row.save_id as string,
    monthKey: (row.month_key as number) ?? 0,
    yearKey: (row.year_key as number) ?? 0,
    deptKey: row.dept_key as string,
    title: row.title as string,
    content: row.content as string,
    gdpChange: (row.gdp_change as number) ?? 0,
    livelihoodChange: (row.livelihood_change as number) ?? 0,
    ecologyChange: (row.ecology_change as number) ?? 0,
    businessChange: (row.business_change as number) ?? 0,
    meritReward: (row.merit_reward as number) ?? 0,
    isRead: (row.is_read as boolean) ?? false,
    createdAt: row.created_at as string,
  };
}

export default function AnnualReportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save } = useGame();
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MonthlyReport | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!save) return;
      setLoading(true);
      supabase
        .from('monthly_reports')
        .select('*')
        .eq('save_id', save.id)
        .eq('dept_key', 'annual_rank')
        .order('year_key', { ascending: false })
        .limit(20)
        .then(({ data }) => {
          setReports((data ?? []).map(r => rowToReport(r as Record<string, unknown>)));
          setLoading(false);
        });
    }, [save])
  );

  const handleSelect = async (report: MonthlyReport) => {
    setSelected(report);
    // 标记已读
    if (!report.isRead) {
      await supabase.from('monthly_reports').update({ is_read: true }).eq('id', report.id);
      setReports(prev => prev.map(r => r.id === report.id ? { ...r, isRead: true } : r));
    }
  };

  const currentYear = save ? Math.floor(save.gameDays / 365) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      <StatusBar style="light" backgroundColor="#1D3B5E" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#2B4B6F', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => { if (selected) { setSelected(null); } else { router.back(); } }} style={{ marginRight: 12 }}>
            <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <Text style={{ fontSize: 24, marginRight: 8 }}>🏅</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>年度综合排行报表</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
              {selected ? selected.title : '历年报表档案'}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10 }}>{save?.rankName}</Text>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600', marginTop: 1 }}>{save?.cityName}</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#1D3B5E" />
        </View>
      ) : selected ? (
        // ===== 报表详情视图 =====
        <View style={{ flex: 1 }}>
          <FlatList
            data={[]}
            renderItem={() => null}
            ListHeaderComponent={
              <View style={{ padding: 16, gap: 14 }}>
                {/* 年度标题卡 */}
                <View style={{
                  backgroundColor: '#2B4B6F',
                  padding: 20,
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <Text style={{ color: '#a0b4cc', fontSize: 11, letterSpacing: 2 }}>
                    第 {selected.yearKey} 年度 · 综合政绩考核
                  </Text>
                  <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>{selected.title}</Text>
                  {selected.meritReward > 0 && (
                    <View style={{ backgroundColor: '#C9A227', paddingHorizontal: 12, paddingVertical: 4, marginTop: 4 }}>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                        🎖 优秀奖励 +{selected.meritReward} 政绩分
                      </Text>
                    </View>
                  )}
                </View>

                {/* 报表内容 */}
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 16 }}>
                  {selected.content.split('\n').map((line, idx) => {
                    const isSectionHeader = line.startsWith('【');
                    const isEmptyLine = line.trim() === '';
                    if (isEmptyLine) return <View key={idx} style={{ height: 8 }} />;
                    return (
                      <Text
                        key={idx}
                        style={{
                          fontSize: isSectionHeader ? 12 : 13,
                          color: isSectionHeader ? '#2B4B6F' : '#333',
                          fontWeight: isSectionHeader ? '700' : '400',
                          lineHeight: 22,
                          letterSpacing: isSectionHeader ? 1 : 0,
                          marginBottom: isSectionHeader ? 4 : 0,
                        }}
                      >
                        {line}
                      </Text>
                    );
                  })}
                </View>

                {/* 底部操作 */}
                <Pressable
                  onPress={() => setSelected(null)}
                  style={{ backgroundColor: '#2B4B6F', padding: 14, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>返回历年报表列表</Text>
                </Pressable>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 32 }}
          />
        </View>
      ) : (
        // ===== 报表列表视图 =====
        <FlatList
          data={reports}
          keyExtractor={item => item.id}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={{ paddingVertical: 60, alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 40 }}>🏅</Text>
              <Text style={{ fontSize: 15, color: '#555', fontWeight: '600' }}>尚无年度报表</Text>
              <Text style={{ fontSize: 12, color: '#999', textAlign: 'center', lineHeight: 18 }}>
                每自然年年底系统自动生成综合政绩排行报表{'\n'}当前处于第 {currentYear} 年，等待年底总结
              </Text>
            </View>
          }
          ListHeaderComponent={
            reports.length > 0 ? (
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14, marginBottom: 4 }}>
                <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '700', letterSpacing: 2, marginBottom: 8 }}>
                  历年排行档案
                </Text>
                <Text style={{ fontSize: 12, color: '#666', lineHeight: 18 }}>
                  共 {reports.length} 份年度报表。点击查看详细排名数据与施政总结。
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const grade =
              item.content.includes('特等') ? { label: '特等', color: '#C9A227', bg: '#FFF8E1' } :
              item.content.includes('优秀') ? { label: '优秀', color: '#2a7a3b', bg: '#F0FFF0' } :
              item.content.includes('良好') ? { label: '良好', color: '#2B4B6F', bg: '#F0F4F8' } :
              item.content.includes('合格') ? { label: '合格', color: '#666', bg: '#F5F5F5' } :
              { label: '待改进', color: '#c0392b', bg: '#FFF3F3' };

            return (
              <Pressable
                onPress={() => void handleSelect(item)}
                style={{
                  backgroundColor: '#fff',
                  borderWidth: 1,
                  borderColor: item.isRead ? '#E0E0E0' : '#2B4B6F',
                  padding: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                {/* 年份标识 */}
                <View style={{ backgroundColor: '#2B4B6F', width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#a0b4cc', fontSize: 9 }}>第</Text>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 22 }}>{item.yearKey}</Text>
                  <Text style={{ color: '#a0b4cc', fontSize: 9 }}>年</Text>
                </View>

                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: item.isRead ? '#555' : '#2B4B6F' }} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {!item.isRead && (
                      <View style={{ backgroundColor: '#c0392b', width: 6, height: 6, borderRadius: 3 }} />
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <View style={{ backgroundColor: grade.bg, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 11, color: grade.color, fontWeight: '700' }}>{grade.label}</Text>
                    </View>
                    {item.meritReward > 0 && (
                      <Text style={{ fontSize: 11, color: '#C9A227' }}>🎖 +{item.meritReward} 政绩</Text>
                    )}
                  </View>
                </View>

                <Text style={{ color: '#aaa', fontSize: 18 }}>›</Text>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
```

<a id="srcappappbriberytsx"></a>
## `src/app/(app)/bribery.tsx`

```tsx
// 权钱交易页面（复用通用玩法模板 + 非正式资源协调）
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { GameplayCardList } from '@/components/GameplayCardList';
import { CoordinationTab } from '@/components/CoordinationTab';
import { executeGameplayAction } from '@/lib/gameplayApi';
import type { GameplayConfig, GameplayCategory } from '@/types/game';

const TABS: { key: GameplayCategory; label: string }[] = [
  { key: 'bribery_channel', label: '受贿渠道' },
  { key: 'power_rent', label: '权力寻租' },
  { key: 'embezzlement', label: '贪污挪用' },
  { key: 'asset_hiding', label: '涉案账户' },
];

type TopTab = 'gameplay' | 'coordination';

export default function BriberyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave, refreshSave } = useGame();
  const [topTab, setTopTab] = useState<TopTab>('gameplay');

  const onAction = useCallback(async (config: GameplayConfig) => {
    if (!save) return { ok: false, message: '存档未加载' };
    const res = await executeGameplayAction(save.id, config);
    if (res.gameOver) {
      await updateGameSave({ gameOverType: res.gameOver });
    }
    await refreshSave();
    return { ok: res.success, message: res.message };
  }, [save, updateGameSave, refreshSave]);

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      <StatusBar style="light" backgroundColor="#1D3B5E" />
      <View style={{ backgroundColor: '#1D3B5E', paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text onPress={() => router.back()} style={{ color: '#ccc', fontSize: 22, marginRight: 12 }}>‹</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 2 }}>💰 权钱交易</Text>
        </View>
      </View>
      {/* 顶部切换 */}
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E5E5' }}>
        {([['gameplay', '涉案操作'], ['coordination', '非正式协调']] as const).map(([key, label]) => (
          <Text
            key={key}
            onPress={() => setTopTab(key)}
            style={{ flex: 1, textAlign: 'center', paddingVertical: 12, fontSize: 12, fontWeight: topTab === key ? '700' : '400', color: topTab === key ? '#C82829' : '#888', borderBottomWidth: 2, borderBottomColor: topTab === key ? '#C82829' : 'transparent' }}
          >
            {label}
          </Text>
        ))}
      </View>

      {topTab === 'gameplay' ? (
        <GameplayCardList title="权钱交易" subtitle="每一次伸手都会留下痕迹，风险与收益并存" tabs={TABS} onAction={onAction} />
      ) : (
        <ScrollView contentInsetAdjustmentBehavior="automatic">
          <CoordinationTab />
        </ScrollView>
      )}
    </View>
  );
}
```

<a id="srcappappcadreappointmenttsx"></a>
## `src/app/(app)/cadre-appointment.tsx`

```tsx
// 央管干部任免页 — 三级委员会表决制度
// 省级及以上：7人政治局常委会  |  省管（市级）：5人省委常委会  |  市管（县级）：3人市委常委会
// 最高职位享有一锤定音权，NPC可发起提案，表决结果影响各委员关系值
import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getMinistryLeaders, getProvinceLeaders } from '@/lib/leaders';

// ── 类型定义 ────────────────────────────────────────────────────────
type VoteStance = '赞成' | '反对' | '弃权';
type CommitteeLevel = 'psc7' | 'prov5' | 'city3';    // 政治局7人 / 省委5人 / 市委3人
type VoteStatus = 'none' | 'pending' | 'deliberating' | 'approved' | 'rejected' | 'overridden';

interface CommitteeMember {
  id: string;
  name: string;
  title: string;
  faction: string;
  stance: VoteStance | null;   // null = 未到自己
  revealed: boolean;
}

interface AppointProposal {
  id: string;
  cadreId: string;
  cadreName: string;
  proposedPost: string;
  proposedOrg: string;
  type: '任命' | '免职' | '调任' | '晋升';
  committeeLevel: CommitteeLevel;
  voteStatus: VoteStatus;
  members: CommitteeMember[];
  voteFor: number;
  voteAgainst: number;
  voteAbstain: number;
  createdDay: number;
  proposedBy: 'player' | string;  // 'player' 或 NPC名
  isTopOverride: boolean;         // 是否用了一锤定音
}

interface CentralCadre {
  id: string;
  name: string;
  currentPost: string;
  currentOrg: string;
  level: '正部级' | '副部级' | '正省级' | '副省级';
  age: number;
  ability: number;
  loyalty: number;
  faction: string;
}

// ── 常量 ────────────────────────────────────────────────────────────
const FACTIONS = ['改革派', '务实派', '共青团系', '技术官僚', '地方系'];
const FACTION_COLORS: Record<string, string> = {
  '改革派': '#2B4B6F', '务实派': '#607d8b', '共青团系': '#E53935',
  '技术官僚': '#1565C0', '地方系': '#4E342E',
};

// 派系敌对关系（简化为两两对立）
const FACTION_OPPOSE: Record<string, string[]> = {
  '改革派':   ['地方系'],
  '地方系':   ['改革派'],
  '共青团系': ['技术官僚'],
  '技术官僚': ['共青团系'],
  '务实派':   [],
};

const PSC_TITLES = [
  '常委·总执书记', '常委·国政院院理', '常委·议政院议政委员长',
  '常委·全国参政院主席', '常委·中枢纪委书记', '常委·国政院常务副院理', '常委·中枢书记处书记',
];
const PROV_STANDING_TITLES = [
  '省委书记', '省长', '专职省委副书记', '省委组织部长', '省纪委书记',
];
const CITY_STANDING_TITLES = [
  '市委书记', '市长', '市委组织部长',
];

const APPOINT_TYPES: Array<{ key: AppointProposal['type']; label: string; icon: string }> = [
  { key: '任命', label: '任命', icon: '📋' },
  { key: '免职', label: '免职', icon: '📤' },
  { key: '调任', label: '调任', icon: '🔄' },
  { key: '晋升', label: '晋升', icon: '⬆️' },
];

const POST_OPTIONS = [
  '国政院副院理', '国家发展改革委主任', '财政部部长', '外交部部长',
  '公安部部长', '教育部部长', '国家卫生健康委主任', '生态环境部部长',
  '中枢纪委副书记', '全国议政院常委会副议政委员长', '全国参政院副主席',
];

// NPC提案模板
const NPC_PROPOSALS_TEMPLATES = [
  { post: '国家发展改革委主任', org: '国家发展改革委', type: '任命' as const },
  { post: '财政部部长', org: '财政部', type: '调任' as const },
  { post: '广东省省委书记', org: '广东省', type: '晋升' as const },
  { post: '中枢纪委副书记', org: '中枢纪委', type: '任命' as const },
];

// ── 哈希工具 ────────────────────────────────────────────────────────
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
  return h;
}

// ── 构建央管干部候选人 ─────────────────────────────────────────────
function buildCentralCadres(saveId: string): CentralCadre[] {
  const miniLeadersMap = getMinistryLeaders(saveId);
  const provLeadersMap = getProvinceLeaders(saveId);
  const provinces = [
    '广东省', '浙江省', '江苏省', '山东省', '北京市', '上海市', '四川省',
    '湖北省', '湖南省', '河南省', '河北省', '福建省', '安徽省', '辽宁省',
  ];
  const miniNames = Object.values(miniLeadersMap).filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 10);
  const provNames = Object.values(provLeadersMap).map(p => p.secretary).slice(0, 10);
  const cadres: CentralCadre[] = [];
  miniNames.forEach((name, i) => {
    const h = hashStr(name + saveId);
    cadres.push({ id: `m${i}`, name, currentPost: '部长/主任', currentOrg: `第${i + 1}部委`, level: '正部级', age: 52 + (h % 10), ability: 75 + (h % 20), loyalty: 70 + ((h >> 4) % 25), faction: FACTIONS[h % FACTIONS.length] ?? '务实派' });
  });
  provNames.forEach((name, i) => {
    const h = hashStr(name + saveId);
    cadres.push({ id: `p${i}`, name, currentPost: '省委书记', currentOrg: provinces[i] ?? `第${i + 1}省`, level: '正省级', age: 53 + (h % 9), ability: 73 + (h % 22), loyalty: 68 + ((h >> 3) % 28), faction: FACTIONS[(h + 2) % FACTIONS.length] ?? '改革派' });
  });
  return cadres;
}

// ── 构建委员会成员（确定性哈希） ──────────────────────────────────
function buildCommittee(saveId: string, level: CommitteeLevel): CommitteeMember[] {
  const titles = level === 'psc7' ? PSC_TITLES : level === 'prov5' ? PROV_STANDING_TITLES : CITY_STANDING_TITLES;
  const surnames = ['习', '李', '赵', '王', '陈', '刘', '张', '杨', '黄', '吴'];
  const given = ['强', '克强', '乐际', '沪宁', '国强', '晓明', '建平', '志军', '毅', '俊'];
  return titles.map((title, i) => {
    const seed = hashStr(saveId + title + i);
    const name = (surnames[seed % surnames.length] ?? '王') + (given[(seed >> 4) % given.length] ?? '军');
    const faction = FACTIONS[seed % FACTIONS.length] ?? '务实派';
    return { id: `cm_${level}_${i}`, name, title, faction, stance: null, revealed: false };
  });
}

// ── 确定性投票立场计算 ─────────────────────────────────────────────
// 基于：委员派系 vs 候选人派系（60%权重）+ 委员与玩家关系层级（40%权重）
function calcVoteStance(
  memberId: string,
  memberFaction: string,
  candidateFaction: string,
  saveId: string,
): VoteStance {
  const h = hashStr(memberId + saveId + candidateFaction);
  // 派系匹配分（0-100）
  let factionScore: number;
  if (memberFaction === candidateFaction) factionScore = 80 + (h % 20);
  else if ((FACTION_OPPOSE[memberFaction] ?? []).includes(candidateFaction)) factionScore = 10 + (h % 20);
  else factionScore = 40 + (h % 30);
  // 关系层级分（0-100）
  const relHash = hashStr(saveId + memberId);
  const relScore = 30 + (relHash % 60);
  // 综合得分
  const combined = Math.round(factionScore * 0.6 + relScore * 0.4);
  if (combined >= 62) return '赞成';
  if (combined >= 40) return '弃权';
  return '反对';
}

// ── 生成NPC提案 ────────────────────────────────────────────────────
function buildNpcProposals(saveId: string, gameDays: number, existingCount: number): AppointProposal[] {
  if (existingCount > 0) return [];  // 已有提案时不重复生成
  const cadres = buildCentralCadres(saveId);
  return NPC_PROPOSALS_TEMPLATES.slice(0, 2).map((tmpl, i) => {
    const cadre = cadres[i] ?? cadres[0]!;
    const members = buildCommittee(saveId, 'psc7').map(m => ({
      ...m,
      stance: calcVoteStance(m.id, m.faction, cadre.faction, saveId),
    }));
    const propName = PSC_TITLES[i] ? `常委·${['国政院院理', '议政院议政委员长'][i] ?? '常委'}` : '常委';
    return {
      id: `npc_${gameDays}_${i}`,
      cadreId: cadre.id,
      cadreName: cadre.name,
      proposedPost: tmpl.post,
      proposedOrg: tmpl.org,
      type: tmpl.type,
      committeeLevel: 'psc7',
      voteStatus: 'pending',
      members,
      voteFor: 0, voteAgainst: 0, voteAbstain: 0,
      createdDay: gameDays,
      proposedBy: propName,
      isTopOverride: false,
    };
  });
}

export default function CadreAppointmentScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [tab, setTab] = useState<'cadres' | 'propose' | 'vote'>('cadres');
  const [proposals, setProposals] = useState<AppointProposal[]>([]);
  const [feedback, setFeedback] = useState('');
  const [feedbackOk, setFeedbackOk] = useState(true);
  const [selectedCadre, setSelectedCadre] = useState<CentralCadre | null>(null);
  const [propType, setPropType] = useState<AppointProposal['type']>('调任');
  const [propPost, setPropPost] = useState('');
  const [propOrg, setPropOrg] = useState('');
  const [committeeLevel, setCommitteeLevel] = useState<CommitteeLevel>('psc7');
  // 审议状态
  const [deliberatingId, setDeliberatingId] = useState<string | null>(null);
  const [revealIndex, setRevealIndex] = useState(0);
  const revealTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const npcInit = useRef(false);

  // NPC提案初始化（仅一次）—— Hooks 必须在 guard return 之前调用
  useEffect(() => {
    if (!save) return;
    if (!npcInit.current) {
      npcInit.current = true;
      const npcProps = buildNpcProposals(save.id, save.gameDays, proposals.length);
      if (npcProps.length > 0) {
        setProposals(prev => [...prev, ...npcProps]);
        showFeedback(`📩 常委发来${npcProps.length}份任免提案，请审阅`);
        setTab('vote');
      }
    }
  }, []);

  if (!save) return null;
  if (save.rankLevel < 13) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F4F1', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <StatusBar style="light" backgroundColor="#2B4B6F" />
        <Text style={{ fontSize: 30, marginBottom: 16 }}>🔒</Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#2B4B6F', marginBottom: 8 }}>权限不足</Text>
        <Text style={{ fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20 }}>
          央管干部任免权限仅开放给国政院副院理（13级）及以上职位
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#2B4B6F' }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>返回</Text>
        </Pressable>
      </View>
    );
  }

  const cadres = buildCentralCadres(save.id);
  const isTopLeader = save.rankLevel >= 15;   // 总执书记（15级）享有一锤定音权
  const isPremier = save.rankLevel >= 14;

  const showFeedback = (msg: string, ok = true) => {
    setFeedback(msg);
    setFeedbackOk(ok);
    setTimeout(() => setFeedback(''), 3800);
  };

  // ── 提交提案 ────────────────────────────────────────────
  const handleSubmitProposal = () => {
    if (!selectedCadre) { showFeedback('请先选择被任免干部', false); return; }
    if (!propPost.trim()) { showFeedback('请填写拟任职务', false); return; }
    const members = buildCommittee(save.id, committeeLevel).map(m => ({
      ...m,
      stance: calcVoteStance(m.id, m.faction, selectedCadre.faction, save.id),
    }));
    const newProp: AppointProposal = {
      id: `prop_${Date.now()}`,
      cadreId: selectedCadre.id,
      cadreName: selectedCadre.name,
      proposedPost: propPost.trim(),
      proposedOrg: propOrg.trim() || selectedCadre.currentOrg,
      type: propType,
      committeeLevel,
      voteStatus: 'pending',
      members,
      voteFor: 0, voteAgainst: 0, voteAbstain: 0,
      createdDay: save.gameDays,
      proposedBy: 'player',
      isTopOverride: false,
    };
    setProposals(prev => [newProp, ...prev]);
    setSelectedCadre(null);
    setPropPost('');
    setPropOrg('');
    showFeedback(`✅ ${propType}提案已提交，请在投票页发起表决`);
    setTab('vote');
  };

  // ── 逐一揭票审议 ─────────────────────────────────────────
  const startDeliberate = (propId: string) => {
    setDeliberatingId(propId);
    setRevealIndex(0);
    setProposals(prev => prev.map(p =>
      p.id === propId ? { ...p, voteStatus: 'deliberating' } : p,
    ));
    // 每800ms揭示一票
    const prop = proposals.find(p => p.id === propId);
    if (!prop) return;
    let idx = 0;
    revealTimer.current = setInterval(() => {
      idx++;
      setRevealIndex(idx);
      setProposals(prev => prev.map(p =>
        p.id === propId
          ? { ...p, members: p.members.map((m, i) => i < idx ? { ...m, revealed: true } : m) }
          : p,
      ));
      if (idx >= prop.members.length) {
        if (revealTimer.current) clearInterval(revealTimer.current);
        finalizeVote(propId);
      }
    }, 800);
  };

  const finalizeVote = async (propId: string) => {
    setDeliberatingId(null);
    setProposals(prev => prev.map(p => {
      if (p.id !== propId) return p;
      const voteFor = p.members.filter(m => m.stance === '赞成').length;
      const voteAgainst = p.members.filter(m => m.stance === '反对').length;
      const voteAbstain = p.members.filter(m => m.stance === '弃权').length;
      const quorum = Math.floor(p.members.length / 2) + 1;
      const approved = voteFor >= quorum;
      return { ...p, voteFor, voteAgainst, voteAbstain, voteStatus: approved ? 'approved' : 'rejected' };
    }));
    // 政治后果：+/- 政绩
    const updated = proposals.find(p => p.id === propId);
    if (!updated) return;
    const voteFor = updated.members.filter(m => m.stance === '赞成').length;
    const quorum = Math.floor(updated.members.length / 2) + 1;
    if (voteFor >= quorum) {
      await updateGameSave({ meritPoints: (save.meritPoints ?? 0) + 30 });
      showFeedback(`✅ 任免提案获批（${voteFor}赞成），政绩+30，与赞成委员关系改善`);
    } else {
      showFeedback(`❌ 提案未获通过（${voteFor}赞成/${updated.members.length}票），建议加强派系沟通`, false);
    }
  };

  // ── 一锤定音（最高决策权） ─────────────────────────────
  const handleTopOverride = async (propId: string, forceApprove: boolean) => {
    if (revealTimer.current) clearInterval(revealTimer.current);
    setDeliberatingId(null);
    setProposals(prev => prev.map(p =>
      p.id === propId ? { ...p, voteStatus: forceApprove ? 'approved' : 'rejected', isTopOverride: true } : p,
    ));
    if (forceApprove) {
      await updateGameSave({ meritPoints: (save.meritPoints ?? 0) + 40 });
      showFeedback('⚡ 已行使一锤定音权，任命强制通过，政绩+40');
    } else {
      showFeedback('⚡ 已行使否决权，提案强制否决');
    }
  };

  const pendingProposals = proposals.filter(p => p.voteStatus === 'pending');
  const activeProposals  = proposals.filter(p => p.voteStatus === 'deliberating');
  const decidedProposals = proposals.filter(p => p.voteStatus === 'approved' || p.voteStatus === 'rejected');
  const levelLabel = (lv: CommitteeLevel) =>
    lv === 'psc7' ? '政治局常委会（7人）' : lv === 'prov5' ? '省委常委会（5人）' : '市委常委会（3人）';

  return (
    <View style={{ flex: 1, backgroundColor: '#0E0C10' }}>
      <StatusBar style="light" backgroundColor="#1A1230" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#1A1230', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: '#8877BB', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#8877BB', fontSize: 9, letterSpacing: 3 }}>中枢组织部 · 央管干部</Text>
            <Text style={{ color: '#E8D0FF', fontSize: 16, fontWeight: '700' }}>🎖️ 央管干部任免</Text>
            <Text style={{ color: '#8877BB', fontSize: 10 }}>
              {isTopLeader ? '总执书记 · 一锤定音权' : isPremier ? '国政院院理 · 提名权 + 表决权' : '国政院副院理 · 提名建议权'}
            </Text>
          </View>
          {isTopLeader && (
            <View style={{ backgroundColor: '#6B1A1A', borderWidth: 1, borderColor: '#CC4444', paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: '#FF8888', fontSize: 9, fontWeight: '700' }}>⚡ 最高决策权</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {([
            { key: 'cadres',  label: '📋 候选干部' },
            { key: 'propose', label: '✍️ 发起提案' },
            { key: 'vote',    label: `🗳️ 表决（${pendingProposals.length + activeProposals.length}）` },
          ] as const).map(t => (
            <Pressable key={t.key} onPress={() => setTab(t.key)}
              style={{ flex: 1, paddingVertical: 7, alignItems: 'center', backgroundColor: tab === t.key ? '#4A1E7A' : 'rgba(255,255,255,0.08)' }}
            >
              <Text style={{ color: tab === t.key ? '#E8D0FF' : '#8877BB', fontSize: 9, fontWeight: tab === t.key ? '700' : '400' }}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 反馈条 */}
      {feedback ? (
        <View style={{ backgroundColor: feedbackOk ? '#0D2A18' : '#2A0D0D', padding: 10, borderBottomWidth: 1, borderBottomColor: feedbackOk ? '#1A5C30' : '#5C1A1A' }}>
          <Text style={{ color: feedbackOk ? '#5AE87A' : '#FF6666', fontSize: 12, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      {/* ══ 候选干部库 ══ */}
      {tab === 'cadres' && (
        <FlatList
          data={cadres}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 12, gap: 8 }}
          ListHeaderComponent={
            <View style={{ backgroundColor: '#1A1230', borderWidth: 1, borderColor: '#3A2A60', padding: 10, marginBottom: 4 }}>
              <Text style={{ fontSize: 10, color: '#C8A0FF', fontWeight: '700' }}>
                央管干部总数：{cadres.length}人 · 点击干部进入提案流程
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const fColor = FACTION_COLORS[item.faction] ?? '#888';
            const levelColor = item.level.startsWith('正') ? '#7B0026' : '#2B4B6F';
            return (
              <Pressable
                onPress={() => { setSelectedCadre(item); setTab('propose'); }}
                style={{ backgroundColor: '#18102A', borderWidth: 1, borderColor: '#3A2060', padding: 12 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 44, height: 44, backgroundColor: '#2A1A40', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: levelColor }}>
                    <Text style={{ fontSize: 22 }}>👔</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#E8D0FF' }}>{item.name}</Text>
                      <Text style={{ fontSize: 10, color: '#8877BB' }}>{item.age}岁</Text>
                      <View style={{ backgroundColor: levelColor + '22', borderWidth: 1, borderColor: levelColor, paddingHorizontal: 5, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 9, color: levelColor, fontWeight: '700' }}>{item.level}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: '#A890CC', marginTop: 2 }}>{item.currentPost} · {item.currentOrg}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 3 }}>
                      <View style={{ backgroundColor: fColor + '22', borderWidth: 1, borderColor: fColor, paddingHorizontal: 5, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 9, color: fColor }}>{item.faction}</Text>
                      </View>
                      <Text style={{ fontSize: 9, color: '#A890CC' }}>能力{item.ability}</Text>
                    </View>
                  </View>
                  <Text style={{ color: '#9966EE', fontSize: 12 }}>提名 ›</Text>
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
          <View style={{ backgroundColor: '#18102A', borderWidth: 1, borderColor: '#3A2060', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#9966EE', fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>被任免干部</Text>
            {selectedCadre ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 48, height: 48, backgroundColor: '#2A1A40', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#7B0026' }}>
                  <Text style={{ fontSize: 24 }}>👔</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#E8D0FF' }}>{selectedCadre.name}</Text>
                  <Text style={{ fontSize: 11, color: '#A890CC' }}>{selectedCadre.currentPost} · {selectedCadre.currentOrg}</Text>
                  <Text style={{ fontSize: 10, color: '#6655AA' }}>{selectedCadre.level} · {selectedCadre.faction}</Text>
                </View>
                <Pressable onPress={() => { setSelectedCadre(null); setTab('cadres'); }}>
                  <Text style={{ color: '#CC4444', fontSize: 12 }}>重选</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => setTab('cadres')}
                style={{ padding: 14, borderWidth: 1, borderColor: '#3A2060', alignItems: 'center', backgroundColor: '#120A20' }}
              >
                <Text style={{ color: '#9966EE', fontSize: 12, fontWeight: '600' }}>+ 从央管干部库选择</Text>
              </Pressable>
            )}
          </View>

          {/* 表决层级 */}
          <View style={{ backgroundColor: '#18102A', borderWidth: 1, borderColor: '#3A2060', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#9966EE', fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>表决委员会</Text>
            <View style={{ gap: 6 }}>
              {([
                { key: 'psc7',  label: '政治局常委会 7人', sub: '适用：省级及以上职位任命' },
                { key: 'prov5', label: '省委常委会 5人',  sub: '适用：省管干部·市级职位' },
                { key: 'city3', label: '市委常委会 3人',  sub: '适用：市管干部·县级职位' },
              ] as const).map(opt => (
                <Pressable
                  key={opt.key}
                  onPress={() => setCommitteeLevel(opt.key)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderWidth: 1, borderColor: committeeLevel === opt.key ? '#9966EE' : '#2A1A40', backgroundColor: committeeLevel === opt.key ? '#2A1040' : '#120A20' }}
                >
                  <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: committeeLevel === opt.key ? '#9966EE' : '#4A3A60', backgroundColor: committeeLevel === opt.key ? '#9966EE' : 'transparent' }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: committeeLevel === opt.key ? '#E8D0FF' : '#A890CC', fontSize: 12, fontWeight: committeeLevel === opt.key ? '700' : '400' }}>{opt.label}</Text>
                    <Text style={{ color: '#6655AA', fontSize: 9, marginTop: 1 }}>{opt.sub}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {/* 任免类型 */}
          <View style={{ backgroundColor: '#18102A', borderWidth: 1, borderColor: '#3A2060', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#9966EE', fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>任免类型</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {APPOINT_TYPES.map(at => (
                <Pressable
                  key={at.key}
                  onPress={() => setPropType(at.key)}
                  style={{ paddingHorizontal: 16, paddingVertical: 8, borderWidth: 2, borderColor: propType === at.key ? '#9966EE' : '#3A2060', backgroundColor: propType === at.key ? '#2A1040' : '#120A20' }}
                >
                  <Text style={{ color: propType === at.key ? '#E8D0FF' : '#6655AA', fontWeight: propType === at.key ? '700' : '400', fontSize: 12 }}>
                    {at.icon} {at.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* 拟任职务 */}
          <View style={{ backgroundColor: '#18102A', borderWidth: 1, borderColor: '#3A2060', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#9966EE', fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>拟任职务</Text>
            <TextInput
              value={propPost}
              onChangeText={setPropPost}
              placeholder="请填写拟任职务…"
              placeholderTextColor="#4A3A60"
              style={{ borderWidth: 1, borderColor: '#3A2060', padding: 10, fontSize: 13, color: '#E8D0FF', marginBottom: 8, backgroundColor: '#120A20' }}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {POST_OPTIONS.map(p => (
                <Pressable key={p} onPress={() => setPropPost(p)} style={{ backgroundColor: '#2A1A40', paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#4A2A70' }}>
                  <Text style={{ fontSize: 10, color: '#C8A0FF' }}>{p}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* 拟任单位 */}
          <View style={{ backgroundColor: '#18102A', borderWidth: 1, borderColor: '#3A2060', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#9966EE', fontWeight: '700', letterSpacing: 2, marginBottom: 8 }}>拟任单位（可选）</Text>
            <TextInput
              value={propOrg}
              onChangeText={setPropOrg}
              placeholder="留空则保留原单位"
              placeholderTextColor="#4A3A60"
              style={{ borderWidth: 1, borderColor: '#3A2060', padding: 10, fontSize: 13, color: '#E8D0FF', backgroundColor: '#120A20' }}
            />
          </View>

          {/* 提交 */}
          <Pressable
            onPress={handleSubmitProposal}
            style={{ backgroundColor: selectedCadre && propPost.trim() ? '#4A1E7A' : '#2A1A3A', paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: selectedCadre && propPost.trim() ? '#9966EE' : '#3A2060' }}
          >
            <Text style={{ color: selectedCadre && propPost.trim() ? '#E8D0FF' : '#4A3A60', fontWeight: '700', fontSize: 14 }}>
              📋 提交提案，进入委员会表决
            </Text>
          </Pressable>
          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* ══ 委员会表决 ══ */}
      {tab === 'vote' && (
        <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>
          {/* 待表决 + 审议中 */}
          {[...pendingProposals, ...activeProposals].map(p => {
            const isDeliberating = p.voteStatus === 'deliberating' && deliberatingId === p.id;
            const npcLabel = p.proposedBy !== 'player' ? `由 ${p.proposedBy} 发起` : '您发起';
            return (
              <View key={p.id} style={{ backgroundColor: '#18102A', borderWidth: 1, borderColor: '#4A2A70', padding: 14 }}>
                {/* 提案头部 */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <View style={{ backgroundColor: p.proposedBy !== 'player' ? '#2A1A40' : '#1A2A40', borderWidth: 1, borderColor: p.proposedBy !== 'player' ? '#9966EE' : '#4488FF', paddingHorizontal: 7, paddingVertical: 2 }}>
                    <Text style={{ color: p.proposedBy !== 'player' ? '#C8A0FF' : '#88BBFF', fontSize: 9, fontWeight: '700' }}>
                      {p.proposedBy !== 'player' ? '📩 NPC提案' : '✍️ 玩家提案'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#E8D0FF', flex: 1 }}>{p.cadreName}</Text>
                  <Text style={{ fontSize: 9, color: '#6655AA' }}>第{p.createdDay}天</Text>
                </View>
                <View style={{ backgroundColor: '#120A20', padding: 8, marginBottom: 8, gap: 2 }}>
                  <Text style={{ fontSize: 10, color: '#A890CC' }}>
                    {p.type}拟任：<Text style={{ color: '#C8A0FF', fontWeight: '600' }}>{p.proposedPost}</Text>
                  </Text>
                  <Text style={{ fontSize: 10, color: '#6655AA' }}>
                    单位：{p.proposedOrg} · {npcLabel} · {levelLabel(p.committeeLevel)}
                  </Text>
                </View>

                {/* 委员逐一揭票区 */}
                {(isDeliberating || p.voteStatus === 'deliberating') && (
                  <View style={{ marginBottom: 10, gap: 5 }}>
                    <Text style={{ fontSize: 10, color: '#9966EE', fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>🗳️ 常委逐一表决</Text>
                    {p.members.map((m, idx) => {
                      const stanceColor = m.stance === '赞成' ? '#3A7A3A' : m.stance === '反对' ? '#7A3A3A' : '#4A4A4A';
                      const stanceBg   = m.stance === '赞成' ? '#0D2A0D' : m.stance === '反对' ? '#2A0D0D' : '#1A1A1A';
                      const fColor = FACTION_COLORS[m.faction] ?? '#888';
                      return (
                        <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, opacity: m.revealed ? 1 : 0.3, backgroundColor: stanceBg, padding: 7, borderWidth: 1, borderColor: stanceColor }}>
                          <Text style={{ width: 14, color: '#6655AA', fontSize: 9 }}>{idx + 1}</Text>
                          <Text style={{ flex: 1, color: '#E8D0FF', fontSize: 11, fontWeight: '700' }}>{m.name}</Text>
                          <Text style={{ color: fColor, fontSize: 9 }}>{m.faction}</Text>
                          <Text style={{ fontSize: 9, color: '#8877BB' }}>{m.title.split('·')[1] ?? m.title}</Text>
                          {m.revealed ? (
                            <View style={{ backgroundColor: stanceColor + '33', borderWidth: 1, borderColor: stanceColor, paddingHorizontal: 8, paddingVertical: 2, minWidth: 36, alignItems: 'center' }}>
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

                {/* 按钮区 */}
                {p.voteStatus === 'pending' && (
                  <View style={{ gap: 8 }}>
                    <Pressable
                      onPress={() => startDeliberate(p.id)}
                      style={{ backgroundColor: '#4A1E7A', paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#9966EE' }}
                    >
                      <Text style={{ color: '#E8D0FF', fontWeight: '700', fontSize: 13 }}>🗳️ 召开常委会·逐一表决</Text>
                    </Pressable>
                    {isTopLeader && (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable
                          onPress={() => void handleTopOverride(p.id, true)}
                          style={{ flex: 1, backgroundColor: '#1A4A1A', paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#3A9A3A' }}
                        >
                          <Text style={{ color: '#88EE88', fontWeight: '700', fontSize: 11 }}>⚡ 一锤定音·强制通过</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => void handleTopOverride(p.id, false)}
                          style={{ flex: 1, backgroundColor: '#4A1A1A', paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#9A3A3A' }}
                        >
                          <Text style={{ color: '#EE8888', fontWeight: '700', fontSize: 11 }}>⚡ 最高否决·强制驳回</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                )}
                {p.voteStatus === 'deliberating' && !isDeliberating && (
                  <View style={{ backgroundColor: '#1A0E2A', padding: 8, alignItems: 'center' }}>
                    <Text style={{ color: '#9966EE', fontSize: 11 }}>⏳ 表决进行中…</Text>
                  </View>
                )}
              </View>
            );
          })}

          {/* 已决定提案 */}
          {decidedProposals.length > 0 && (
            <>
              <View style={{ borderBottomWidth: 1, borderBottomColor: '#2A1A40', paddingBottom: 4 }}>
                <Text style={{ fontSize: 10, color: '#6655AA', fontWeight: '700', letterSpacing: 2 }}>历史表决记录</Text>
              </View>
              {decidedProposals.map(p => {
                const approved = p.voteStatus === 'approved';
                const quorum = Math.floor(p.members.length / 2) + 1;
                return (
                  <View key={p.id} style={{ backgroundColor: '#18102A', borderWidth: 1, borderColor: approved ? '#1A5C30' : '#5C1A1A', padding: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Text style={{ fontSize: 16 }}>{p.isTopOverride ? '⚡' : approved ? '✅' : '❌'}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#E8D0FF', flex: 1 }}>{p.cadreName}</Text>
                      <View style={{ backgroundColor: (approved ? '#1A5C30' : '#5C1A1A'), paddingHorizontal: 6, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 9, color: approved ? '#5AE87A' : '#FF6666', fontWeight: '700' }}>
                          {p.isTopOverride ? (approved ? '一锤定音·通过' : '最高否决') : (approved ? '通过' : '否决')}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: '#A890CC' }}>{p.type}：{p.proposedPost}</Text>
                    {!p.isTopOverride && (
                      <>
                        <Text style={{ fontSize: 10, color: '#6655AA', marginTop: 4 }}>
                          表决结果：赞成{p.voteFor}票 · 反对{p.voteAgainst}票 · 弃权{p.voteAbstain}票（需{quorum}票过半）
                        </Text>
                        {/* 政治后果说明 */}
                        {approved && (
                          <View style={{ marginTop: 4, backgroundColor: '#0D2A18', padding: 6 }}>
                            <Text style={{ fontSize: 9, color: '#5AE87A' }}>
                              {p.voteFor}位赞成委员关系改善 · {p.voteAgainst}位反对委员关系微降
                            </Text>
                          </View>
                        )}
                        {!approved && (
                          <View style={{ marginTop: 4, backgroundColor: '#2A0D0D', padding: 6 }}>
                            <Text style={{ fontSize: 9, color: '#FF8888' }}>
                              提案被否 · 建议调整候选人或加强与反对委员的关系
                            </Text>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                );
              })}
            </>
          )}

          {proposals.length === 0 && (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>📋</Text>
              <Text style={{ fontSize: 14, color: '#6655AA', textAlign: 'center' }}>暂无任免提案</Text>
              <Text style={{ fontSize: 11, color: '#4A3A60', marginTop: 4 }}>在「发起提案」页提交提案，或等待NPC常委发起提案</Text>
            </View>
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </View>
  );
}
```

<a id="srcappappcadreselectiontsx"></a>
## `src/app/(app)/cadre-selection.tsx`

```tsx
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
```

<a id="srcappappcharactercreatetsx"></a>
## `src/app/(app)/character-create.tsx`

```tsx
// 角色创建页面 — 干部履历登记表（重设计版）
import { useState, useMemo, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/client/supabase';
import { resolveGateTarget, gateTargetHref } from '@/lib/approvalGate';
import type { RelativePathString } from 'expo-router';
import { completeCharacterCreation, createSave } from '@/db/gameApi';
import { useGame } from '@/ctx/GameContext';
import { checkCreateSaveName, debounceCheckName } from '@/lib/sensitiveFilter';
import {
  MALE_AVATARS, FEMALE_AVATARS, SCHOOL_BONUS,
  canApplyZhongXuanDiao, getZhongXuanDiaoMinAge,
  PROVINCE_LIST, PROVINCE_CITY_MAP,
  UNIVERSITY_985, UNIVERSITY_211, UNIVERSITY_NORMAL,
  UNIVERSITY_ZHUANKE_SUFFIXES, pickUniversityName,
} from '@/types/game';
import type { DegreeType } from '@/types/game';

/* ─────────── 配色 ─────────── */
const C = {
  bg:           '#F2EFEA',   // 档案纸米黄
  headerBg:     '#8B1A1A',   // 红头横幅
  headerText:   '#FFFFFF',
  headerSub:    'rgba(255,255,255,0.72)',
  navy:         '#1A2B3C',   // 深蓝正文
  red:          '#C82829',   // 印章红
  redLight:     '#FFF0F0',
  blue:         '#1D3B5E',   // 组织蓝
  blueLight:    '#EDF3FA',
  gold:         '#C8A84B',
  cardBg:       '#FEFCF8',   // 卡片白
  cardBorder:   '#D8D0C0',
  sectionBg:    '#F0EDE6',   // 分区背景
  label:        '#5A4E3C',
  muted:        '#9A8E7E',
  faint:        '#C8C0B0',
  inputBg:      '#FDFBF8',
  inputBorder:  '#C8C0B0',
  divider:      '#E0D8CC',
  successBg:    '#F0FAF0',
  warningBg:    '#FFF8EC',
};

type SchoolTier = '985院校' | '211院校' | '普通本科' | '大专院校';
const SCHOOL_TIERS: SchoolTier[] = ['985院校', '211院校', '普通本科', '大专院校'];
const SCHOOL_DESC: Record<SchoolTier, string> = {
  '985院校': '名校精英，初始能力 +10',
  '211院校': '重点高校，初始能力 +5',
  '普通本科': '扎实基础，均衡发展',
  '大专院校': '基层起步，初始能力 -5',
};
const SCHOOL_ICON: Record<SchoolTier, string> = {
  '985院校': '🏛️',
  '211院校': '🎓',
  '普通本科': '📚',
  '大专院校': '📖',
};
const DEGREES: DegreeType[] = ['本科', '硕士', '博士'];
const DEGREE_DESC: Record<DegreeType, string> = {
  '本科': '基础学历',
  '硕士': '可报选调，副科起步',
  '博士': '可报选调，正科起步',
};
const AGES = Array.from({ length: 11 }, (_, i) => 18 + i);

function getUniversityList(tier: SchoolTier, province?: string): string[] {
  if (tier === '985院校') return UNIVERSITY_985;
  if (tier === '211院校') return UNIVERSITY_211;
  if (tier === '普通本科') return UNIVERSITY_NORMAL;
  const cities = province ? (PROVINCE_CITY_MAP[province] ?? []) : [];
  const generated = new Set<string>();
  while (generated.size < 10) {
    const prefix = cities.length > 0
      ? cities[Math.floor(Math.random() * cities.length)].replace(/市|区|县/, '')
      : ['江南', '淮海', '云岭', '南湖', '桂江', '平原', '滨海'][Math.floor(Math.random() * 7)];
    const suffix = UNIVERSITY_ZHUANKE_SUFFIXES[Math.floor(Math.random() * UNIVERSITY_ZHUANKE_SUFFIXES.length)];
    generated.add(prefix + suffix);
  }
  return [...generated];
}

/* ─── 分区标题 ─── */
function SectionHeader({ no, title, subtitle }: { no: string; title: string; subtitle?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 }}>
      {/* 序号框 */}
      <View style={{ width: 26, height: 26, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>{no}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: C.navy, letterSpacing: 2 }}>{title}</Text>
        {subtitle && <Text style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{subtitle}</Text>}
      </View>
      <View style={{ width: 40, height: 1, backgroundColor: C.divider }} />
    </View>
  );
}

/* ─── 分区容器 ─── */
function Section({ children }: { children: React.ReactNode }) {
  return (
    <View style={{
      backgroundColor: C.cardBg,
      borderWidth: 1,
      borderColor: C.cardBorder,
      padding: 16,
      marginBottom: 12,
    }}>
      {children}
    </View>
  );
}

/* ─── 字段标签 ─── */
function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7 }}>
      <View style={{ width: 2, height: 12, backgroundColor: C.red }} />
      <Text style={{ fontSize: 11, color: C.label, fontWeight: '700', letterSpacing: 1.5 }}>{label}</Text>
      {hint && <Text style={{ fontSize: 10, color: C.muted }}>{hint}</Text>}
    </View>
  );
}

export default function CharacterCreateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { save, refreshSave } = useGame();

  const [name, setName] = useState('');
  const [gender, setGender] = useState<'男' | '女'>('男');
  const [age, setAge] = useState(22);
  const [avatarIdx, setAvatarIdx] = useState(0);
  const [birthProvince, setBirthProvince] = useState(PROVINCE_LIST[0]);
  const [birthCity, setBirthCity] = useState(PROVINCE_CITY_MAP[PROVINCE_LIST[0]]![0]);
  const [showProvinceList, setShowProvinceList] = useState(false);
  const [showCityList, setShowCityList] = useState(false);
  const [schoolTier, setSchoolTier] = useState<SchoolTier>('普通本科');
  const [degree, setDegree] = useState<DegreeType>('本科');
  const [isZhongXuanDiao, setIsZhongXuanDiao] = useState(false);
  const [universityName, setUniversityName] = useState<string>('');
  const [showUniversityList, setShowUniversityList] = useState(false);
  const universityList = useMemo(
    () => getUniversityList(schoolTier, birthProvince),
    [schoolTier, birthProvince],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nameWarn, setNameWarn] = useState(''); // 机制①：实时客户端检测
  const [submitPressed, setSubmitPressed] = useState(false);
  // 门禁：未通过审批前不展示创建表单
  const [gateChecked, setGateChecked] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const { data: adminData } = await supabase.rpc('is_current_admin');
        if (Boolean(adminData)) {
          if (active) setGateChecked(true);
          return;
        }
        // 统一走集中式门禁：仅在目标为 character-create 时放行，其余一律跳转，彻底避免误跳测试码页
        const target = await resolveGateTarget(true);
        if (target === 'character-create') {
          if (active) setGateChecked(true);
        } else {
          router.replace(gateTargetHref(target) as RelativePathString);
        }
      })();
      return () => {
        active = false;
      };
    }, [router]),
  );

  if (!gateChecked) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={C.red} />
        <Text style={{ marginTop: 12, fontSize: 12, color: C.muted, letterSpacing: 1 }}>正在验证档案资格...</Text>
      </View>
    );
  }

  const avatarPool = gender === '女' ? FEMALE_AVATARS : MALE_AVATARS;
  const zhongXuanUnlocked = canApplyZhongXuanDiao(
    schoolTier === '985院校' ? '985院校' : schoolTier, degree,
  );
  const minAge = isZhongXuanDiao ? getZhongXuanDiaoMinAge(degree) : 18;
  const birthYear = 2025 - age;
  const studyYears = degree === '博士' ? 9 : degree === '硕士' ? 6 : 4;
  const gradYear = birthYear + 18 + studyYears;
  const displayUniversity = universityName || (universityList[0] ?? '（请选择院校）');
  const previewSchool = isZhongXuanDiao
    ? `${displayUniversity} · ${degree}（选调生）`
    : `${displayUniversity} · ${schoolTier === '大专院校' ? '专科' : degree}`;

  const handleSchoolTierChange = (s: SchoolTier) => {
    setSchoolTier(s);
    setUniversityName('');
    if (!canApplyZhongXuanDiao(s === '985院校' ? '985院校' : s, degree)) setIsZhongXuanDiao(false);
  };
  const handleDegreeChange = (d: DegreeType) => {
    setDegree(d);
    if (!canApplyZhongXuanDiao(schoolTier === '985院校' ? '985院校' : schoolTier, d)) setIsZhongXuanDiao(false);
    const newMin = getZhongXuanDiaoMinAge(d);
    if (isZhongXuanDiao && age < newMin) setAge(newMin);
  };
  const handleZhongXuanToggle = () => {
    const next = !isZhongXuanDiao;
    setIsZhongXuanDiao(next);
    if (next) {
      const newMin = getZhongXuanDiaoMinAge(degree);
      if (age < newMin) setAge(newMin);
    }
  };
  const handleProvinceSelect = (p: string) => {
    setBirthProvince(p);
    const cities = PROVINCE_CITY_MAP[p] ?? [];
    setBirthCity(cities[0] ?? '');
    setShowProvinceList(false);
    setUniversityName('');
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError('请填写姓名'); return; }
    if (isZhongXuanDiao && age < minAge) {
      setError(`选调${degree}生最低入职年龄为 ${minAge} 岁`);
      return;
    }
    setLoading(true);
    setError('');
    // 机制②：提交前客户端二次校验
    const nameCheck = await checkCreateSaveName(name.trim());
    if (!nameCheck.ok) {
      setError(nameCheck.message);
      setNameWarn(nameCheck.message);
      setLoading(false);
      return;
    }
    // 无存档时先创建占位档（拆分后建档职责下放到角色创建页）
    let saveId = save?.id;
    if (!saveId) {
      const created = await createSave();
      if (!created) {
        setError('建档失败，请重试');
        setLoading(false);
        return;
      }
      saveId = created.id;
    }
    const finalUniversity = universityName || displayUniversity;
    const degreeStr = schoolTier === '大专院校' ? '专科' : degree;
    const result = await completeCharacterCreation(saveId, {
      playerName:    name.trim(),
      playerGender:  gender,
      playerAge:     age,
      avatarId:      avatarIdx,
      school:        schoolTier,
      isZhongXuanDiao,
      degree,
      birthYear,
      birthProvince,
      birthCity,
      universityName: `${finalUniversity}（${degreeStr}）`,
    });
    if (!result) {
      setError('建档失败，请重试');
      setLoading(false);
      return;
    }
    await refreshSave();
    router.replace('/(app)/home');
  };

  /* ─── 下拉选择框 ─── */
  function DropdownPicker({
    value, onPress, placeholder,
  }: { value: string; onPress: () => void; placeholder: string }) {
    const [pressed, setPressed] = useState(false);
    return (
      <Pressable
        onPress={onPress}
        cssInterop={false}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={{
          borderWidth: 1,
          borderColor: pressed ? C.red : C.inputBorder,
          backgroundColor: C.inputBg,
          paddingHorizontal: 12,
          paddingVertical: 11,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ fontSize: 13, color: value ? C.navy : C.faint, flex: 1 }} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Text style={{ color: C.muted, fontSize: 10, marginLeft: 6 }}>▾</Text>
      </Pressable>
    );
  }

  function DropdownList({
    items, selected, onSelect,
  }: { items: string[]; selected: string; onSelect: (v: string) => void }) {
    return (
      <View style={{ borderWidth: 1, borderColor: C.inputBorder, borderTopWidth: 0, backgroundColor: '#fff', maxHeight: 180, zIndex: 20 }}>
        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
          {items.map(item => (
            <Pressable
              key={item}
              onPress={() => onSelect(item)}
              style={{ paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.divider,
                backgroundColor: selected === item ? C.redLight : '#fff' }}
            >
              <Text style={{ fontSize: 13, color: selected === item ? C.red : C.navy, fontWeight: selected === item ? '700' : '400' }}>
                {item}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: C.bg }}
    >
      <StatusBar style="light" backgroundColor={C.headerBg} />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ━━━━━━━━━━━━━━━━━ 红头横幅 ━━━━━━━━━━━━━━━━━ */}
        <View style={{ backgroundColor: C.headerBg, paddingTop: insets.top + 14, paddingBottom: 18, paddingHorizontal: 20 }}>
          {/* 顶部编号 */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: 10, color: C.headerSub, letterSpacing: 2 }}>
              华夏人民共和国 · 中枢组织部
            </Text>
            <Text style={{ fontSize: 10, color: C.headerSub, letterSpacing: 1 }}>
              组干字〔2025〕001号
            </Text>
          </View>

          {/* 红线 */}
          <View style={{ height: 2, backgroundColor: C.gold, marginBottom: 12 }} />

          {/* 主标题 */}
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 4, textAlign: 'center', marginBottom: 4 }}>
            干  部  履  历  登  记  表
          </Text>
          <Text style={{ fontSize: 11, color: C.headerSub, textAlign: 'center', letterSpacing: 2 }}>
            请如实填写，组织严格保密 · 一经提交不可修改
          </Text>

          {/* 底部金线 */}
          <View style={{ height: 1, backgroundColor: C.gold, marginTop: 12, opacity: 0.5 }} />
        </View>

        {/* ━━━━━━━━━━━━━━━━━ 表格内容 ━━━━━━━━━━━━━━━━━ */}
        <View style={{ padding: 14 }}>

          {/* ─── 第一节：基本信息 ─── */}
          <Section>
            <SectionHeader no="一" title="基本信息" subtitle="姓名、性别及头像" />

            {/* 姓名行 */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
              <View style={{ flex: 1 }}>
                <FieldLabel label="姓名" hint="（限6字）" />
                <TextInput
                  style={{
                    borderWidth: 1, borderColor: C.inputBorder,
                    backgroundColor: C.inputBg,
                    paddingHorizontal: 12, paddingVertical: 11,
                    fontSize: 15, color: C.navy, letterSpacing: 1,
                  }}
                  placeholder="请输入真实姓名"
                  placeholderTextColor={C.faint}
                  value={name}
                  onChangeText={(v) => {
                    setName(v);
                    setNameWarn('');
                    // 机制①：防抖实时检测
                    debounceCheckName(v.trim(), (hit) => {
                      setNameWarn(hit ? '⚠️ 当前名字已违规，请重新整改' : '');
                    });
                  }}
                  maxLength={6}
                />
                {/* 机制①：实时违规提示 */}
                {!!nameWarn && (
                  <View style={{ backgroundColor: '#FFF3CD', borderLeftWidth: 2, borderLeftColor: '#FFC107',
                    paddingHorizontal: 10, paddingVertical: 6, marginTop: 4 }}>
                    <Text style={{ fontSize: 11, color: '#856404' }}>{nameWarn}</Text>
                  </View>
                )}
              </View>
              <View style={{ width: 80 }}>
                <FieldLabel label="性别" />
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {(['男', '女'] as const).map(g => (
                    <Pressable
                      key={g}
                      onPress={() => { setGender(g); setAvatarIdx(0); }}
                      style={{ flex: 1, paddingVertical: 11, alignItems: 'center',
                        backgroundColor: gender === g ? C.red : C.inputBg,
                        borderWidth: 1,
                        borderColor: gender === g ? C.red : C.inputBorder,
                      }}
                    >
                      <Text style={{ fontWeight: '700', fontSize: 13, color: gender === g ? '#fff' : C.navy }}>
                        {g}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            {/* 头像 */}
            <FieldLabel label="证件头像" hint="（点击选择）" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {avatarPool.map((emoji, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => setAvatarIdx(idx)}
                  style={{
                    width: 52, height: 52,
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: avatarIdx === idx ? 2 : 1,
                    borderColor: avatarIdx === idx ? C.red : C.inputBorder,
                    backgroundColor: avatarIdx === idx ? C.redLight : C.inputBg,
                  }}
                >
                  <Text style={{ fontSize: 28 }}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
          </Section>

          {/* ─── 第二节：出生地 ─── */}
          <Section>
            <SectionHeader no="二" title="出生地信息" subtitle="户籍省份及城市" />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              {/* 省份 */}
              <View style={{ flex: 1 }}>
                <FieldLabel label="省份" />
                <DropdownPicker
                  value={birthProvince}
                  placeholder="选择省份"
                  onPress={() => { setShowProvinceList(!showProvinceList); setShowCityList(false); }}
                />
                {showProvinceList && (
                  <DropdownList
                    items={PROVINCE_LIST}
                    selected={birthProvince}
                    onSelect={handleProvinceSelect}
                  />
                )}
              </View>
              {/* 城市 */}
              <View style={{ flex: 1 }}>
                <FieldLabel label="城市" />
                <DropdownPicker
                  value={birthCity}
                  placeholder="选择城市"
                  onPress={() => { setShowCityList(!showCityList); setShowProvinceList(false); }}
                />
                {showCityList && (
                  <DropdownList
                    items={PROVINCE_CITY_MAP[birthProvince] ?? []}
                    selected={birthCity}
                    onSelect={(c) => { setBirthCity(c); setShowCityList(false); }}
                  />
                )}
              </View>
            </View>
            <Text style={{ fontSize: 10, color: C.muted, marginTop: 8 }}>
              📅 出生年份将自动推算为 {birthYear} 年
            </Text>
          </Section>

          {/* ─── 第三节：学历信息 ─── */}
          <Section>
            <SectionHeader no="三" title="学历背景" subtitle="院校层次、就读院校及最高学历" />

            {/* 院校层次 */}
            <FieldLabel label="院校层次" />
            <View style={{ gap: 6, marginBottom: 14 }}>
              {SCHOOL_TIERS.map(s => {
                const bonus = SCHOOL_BONUS[s] ?? 0;
                const isSelected = schoolTier === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => handleSchoolTierChange(s)}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      paddingHorizontal: 12, paddingVertical: 11,
                      borderWidth: 1,
                      borderColor: isSelected ? C.blue : C.inputBorder,
                      backgroundColor: isSelected ? C.blue : C.inputBg,
                      gap: 10,
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>{SCHOOL_ICON[s]}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? '#fff' : C.navy }}>
                        {s}
                      </Text>
                      <Text style={{ fontSize: 10, marginTop: 1, color: isSelected ? 'rgba(255,255,255,0.7)' : C.muted }}>
                        {SCHOOL_DESC[s]}
                      </Text>
                    </View>
                    <View style={{
                      paddingHorizontal: 8, paddingVertical: 3,
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.18)' : C.sectionBg,
                      borderWidth: 1, borderColor: isSelected ? 'rgba(255,255,255,0.3)' : C.divider,
                    }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: isSelected ? '#FFD066' : (bonus >= 0 ? C.blue : C.red) }}>
                        {bonus >= 0 ? `+${bonus}` : `${bonus}`}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* 就读院校 */}
            <FieldLabel label="就读院校" />
            <DropdownPicker
              value={displayUniversity}
              placeholder="请选择院校"
              onPress={() => setShowUniversityList(!showUniversityList)}
            />
            {showUniversityList && (
              <DropdownList
                items={universityList}
                selected={universityName}
                onSelect={(u) => { setUniversityName(u); setShowUniversityList(false); }}
              />
            )}
            <Text style={{ fontSize: 10, color: C.muted, marginTop: 6, marginBottom: 14 }}>
              📅 预计毕业年份：{gradYear} 年
            </Text>

            {/* 最高学历（专科隐藏） */}
            {schoolTier !== '大专院校' && (
              <>
                <FieldLabel label="最高学历" />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {DEGREES.map(d => {
                    const isSelected = degree === d;
                    return (
                      <Pressable
                        key={d}
                        onPress={() => handleDegreeChange(d)}
                        style={{
                          flex: 1, paddingVertical: 10, alignItems: 'center',
                          borderWidth: 1,
                          borderColor: isSelected ? C.blue : C.inputBorder,
                          backgroundColor: isSelected ? C.blue : C.inputBg,
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? '#fff' : C.navy }}>
                          {d}
                        </Text>
                        <Text style={{ fontSize: 9, marginTop: 2, color: isSelected ? 'rgba(255,255,255,0.65)' : C.muted }}>
                          {DEGREE_DESC[d]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </Section>

          {/* ─── 第四节：入职年龄 ─── */}
          <Section>
            <SectionHeader no="四" title="入职信息" subtitle="首次参加公务员工作的年龄" />
            <FieldLabel label="入职年龄" hint={isZhongXuanDiao ? `（选调${degree}生 ≥ ${minAge}岁）` : undefined} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {AGES.map(a => {
                  const disabled = a < minAge;
                  const isSelected = age === a;
                  return (
                    <Pressable
                      key={a}
                      onPress={() => !disabled && setAge(a)}
                      disabled={disabled}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 10,
                        borderWidth: 1,
                        borderColor: isSelected ? C.blue : disabled ? C.divider : C.inputBorder,
                        backgroundColor: isSelected ? C.blue : disabled ? '#F4F2EE' : C.inputBg,
                      }}
                    >
                      <Text style={{
                        fontWeight: '700', fontSize: 13,
                        color: isSelected ? '#fff' : disabled ? C.faint : C.navy,
                      }}>
                        {a}岁
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </Section>

          {/* ─── 第五节：选调生 ─── */}
          {zhongXuanUnlocked && (
            <Pressable
              onPress={handleZhongXuanToggle}
              style={{
                marginBottom: 12,
                borderWidth: isZhongXuanDiao ? 2 : 1,
                borderColor: isZhongXuanDiao ? C.red : C.cardBorder,
                overflow: 'hidden',
              }}
            >
              {/* 选调生标头 */}
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                padding: 14, gap: 12,
                backgroundColor: isZhongXuanDiao ? C.red : C.cardBg,
              }}>
                <View style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: isZhongXuanDiao ? 'rgba(255,255,255,0.2)' : C.redLight,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 20 }}>🏅</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', letterSpacing: 1,
                    color: isZhongXuanDiao ? '#fff' : C.red }}>
                    中央选调生通道
                  </Text>
                  <Text style={{ fontSize: 10, marginTop: 2,
                    color: isZhongXuanDiao ? 'rgba(255,255,255,0.75)' : C.muted }}>
                    985院校 · {degree}学历 · 专属加速通道
                  </Text>
                </View>
                {/* 勾选框 */}
                <View style={{
                  width: 24, height: 24, borderRadius: 12,
                  borderWidth: 2,
                  borderColor: isZhongXuanDiao ? '#fff' : C.inputBorder,
                  backgroundColor: isZhongXuanDiao ? '#fff' : 'transparent',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {isZhongXuanDiao && (
                    <Text style={{ color: C.red, fontSize: 12, fontWeight: '900' }}>✓</Text>
                  )}
                </View>
              </View>

              {/* 加成详情 */}
              <View style={{ backgroundColor: '#FFF8F0', padding: 12, gap: 6 }}>
                <Text style={{ fontSize: 11, color: C.navy, fontWeight: '700', marginBottom: 4, letterSpacing: 1 }}>
                  选调生专属加成：
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  <View style={{ backgroundColor: '#FFE8E8', paddingHorizontal: 8, paddingVertical: 4, borderLeftWidth: 2, borderLeftColor: C.red }}>
                    <Text style={{ fontSize: 11, color: C.red }}>
                      {degree === '博士' ? '⭐ 乡镇长起步（正科级）' : '⭐ 副乡镇长起步（副科级）'}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: '#E8F0FF', paddingHorizontal: 8, paddingVertical: 4, borderLeftWidth: 2, borderLeftColor: C.blue }}>
                    <Text style={{ fontSize: 11, color: C.blue }}>📈 初始能力 +20</Text>
                  </View>
                  <View style={{ backgroundColor: '#E8FFE8', paddingHorizontal: 8, paddingVertical: 4, borderLeftWidth: 2, borderLeftColor: '#28A845' }}>
                    <Text style={{ fontSize: 11, color: '#28A845' }}>
                      {degree === '博士' ? '🏆 初始政绩 +50' : '🏆 初始政绩 +30'}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                  📅 最低入职年龄：{degree === '博士' ? '25' : '23'}岁
                </Text>
              </View>
            </Pressable>
          )}

          {/* ─── 档案预览卡 ─── */}
          <View style={{
            backgroundColor: C.cardBg,
            borderWidth: 1,
            borderColor: C.gold,
            marginBottom: 14,
            overflow: 'hidden',
          }}>
            {/* 标题栏 */}
            <View style={{ backgroundColor: '#1A2B3C', paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 3, height: 14, backgroundColor: C.gold }} />
              <Text style={{ fontSize: 11, color: C.gold, letterSpacing: 2, fontWeight: '700' }}>档案预览</Text>
            </View>
            <View style={{ padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
              {/* 头像框 */}
              <View style={{ width: 64, height: 80, backgroundColor: C.blueLight, alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: C.inputBorder }}>
                <Text style={{ fontSize: 40 }}>{avatarPool[avatarIdx]}</Text>
              </View>
              {/* 信息 */}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: C.navy, letterSpacing: 1 }}>
                  {name || '（未填写）'}
                </Text>
                <Text style={{ fontSize: 12, color: '#555' }}>
                  {gender} · {birthYear}年 · {birthProvince}{birthCity}
                </Text>
                <Text style={{ fontSize: 11, color: C.muted }}>{gradYear}年毕业于{previewSchool}</Text>
                <View style={{ marginTop: 4, backgroundColor: isZhongXuanDiao ? C.redLight : C.blueLight,
                  paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start',
                  borderLeftWidth: 2, borderLeftColor: isZhongXuanDiao ? C.red : C.blue }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: isZhongXuanDiao ? C.red : C.blue }}>
                    {isZhongXuanDiao
                      ? (degree === '博士' ? '乡镇长 · 选调生（正科起步）' : '副乡镇长 · 选调生（副科起步）')
                      : '乡镇科员（起步）'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 错误提示 */}
          {error ? (
            <View style={{ backgroundColor: '#FFF0F0', borderLeftWidth: 3, borderLeftColor: C.red,
              paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10 }}>
              <Text style={{ fontSize: 12, color: C.red }}>{error}</Text>
            </View>
          ) : null}

          {/* 提交按钮 */}
          <Pressable
            onPress={handleCreate}
            disabled={loading}
            cssInterop={false}
            onPressIn={() => setSubmitPressed(true)}
            onPressOut={() => setSubmitPressed(false)}
            style={{
              backgroundColor: submitPressed ? '#9E1C1D' : C.red,
              paddingVertical: 16,
              alignItems: 'center',
              opacity: loading ? 0.65 : 1,
              marginBottom: 6,
            }}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : (
                <View style={{ alignItems: 'center', gap: 2 }}>
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 4 }}>
                    确认建档，开始仕途
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, letterSpacing: 2 }}>
                    青云路 · 从科员到国家领导人
                  </Text>
                </View>
              )
            }
          </Pressable>
          <Text style={{ textAlign: 'center', fontSize: 10, color: C.muted, marginBottom: 20 }}>
            提交后游戏正式开始，数据不可修改
          </Text>

          <View style={{ height: insets.bottom + 8 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

<a id="srcappappcityappointmenttsx"></a>
## `src/app/(app)/city-appointment.tsx`

```tsx
// 市管干部任免页 — rank7（副厅级）及以上
// 规则：市委常委会3人逐一表决，市委书记享有一锤定音权，NPC委员可发起提案
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

interface CityCadre {
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

// 市委常委会3人职位
const CITY_TITLES = ['市委书记', '市长', '市委组织部长'];

// 市管干部池（县级职位）
const CITY_CADRE_POOL = [
  { post: '县委书记', org: '某县' },
  { post: '县长', org: '某县' },
  { post: '县委副书记', org: '某县' },
  { post: '常务副县长', org: '某县' },
  { post: '县委组织部长', org: '某县' },
  { post: '县纪委书记', org: '某县' },
  { post: '区委书记', org: '某区' },
  { post: '区长', org: '某区' },
  { post: '街道党工委书记', org: '某街道' },
];
const POST_OPTIONS = CITY_CADRE_POOL.map(p => p.post);

const COUNTY_NAMES = [
  '兴隆县', '平远县', '凤栖县', '安宁区', '宜和县',
  '崇明区', '溪山县', '长河区', '永泰县', '青云区',
];

// NPC提案模板
const NPC_TMPL = [
  { post: '县委书记', org: '兴隆县', type: '调任' as const },
  { post: '区长', org: '安宁区', type: '任命' as const },
];

// ── 哈希工具 ──────────────────────────────────────────────────────────
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
  return h;
}

// ── 构建市管干部候选人列表 ─────────────────────────────────────────
function buildCityCadres(saveId: string): CityCadre[] {
  const surnames = ['林', '韩', '许', '吕', '何', '郭', '唐', '余', '马', '罗', '崔', '廖'];
  const given = ['志远', '建国', '晓明', '伟', '刚', '磊', '峰', '军', '勇', '超'];
  return Array.from({ length: 14 }, (_, i) => {
    const h = hashStr(saveId + 'city_cadre' + i);
    const name = (surnames[h % surnames.length] ?? '林') + (given[(h >> 4) % given.length] ?? '志');
    const postIdx = h % CITY_CADRE_POOL.length;
    const countyIdx = (h >> 2) % COUNTY_NAMES.length;
    return {
      id: `cc${i}`,
      name,
      currentPost: CITY_CADRE_POOL[postIdx]?.post ?? '副县长',
      currentOrg: COUNTY_NAMES[countyIdx] ?? '某县',
      age: 32 + (h % 18),
      faction: FACTIONS[h % FACTIONS.length] ?? '务实派',
      ability: 55 + (h % 35),
    };
  });
}

// ── 构建市委常委会3人 ────────────────────────────────────────────────
function buildCityCommittee(saveId: string): CommitteeMember[] {
  const surnames2 = ['谢', '魏', '卢', '蒋', '沈', '侯', '宋', '潘'];
  const given2 = ['力', '涛', '鹏', '健', '新', '宇', '亮', '洪'];
  return CITY_TITLES.map((title, i) => {
    const h = hashStr(saveId + title + i + 'city');
    const name = (surnames2[h % surnames2.length] ?? '谢') + (given2[(h >> 4) % given2.length] ?? '力');
    const faction = FACTIONS[h % FACTIONS.length] ?? '务实派';
    return { id: `ccm_${i}`, name, title, faction, stance: '弃权', revealed: false };
  });
}

// ── 确定性投票立场 ────────────────────────────────────────────────────
function calcStance(memberId: string, memberFaction: string, candidateFaction: string, saveId: string): VoteStance {
  const h = hashStr(memberId + saveId + candidateFaction + 'city');
  let fScore: number;
  if (memberFaction === candidateFaction) fScore = 80 + (h % 18);
  else if ((FACTION_OPPOSE[memberFaction] ?? []).includes(candidateFaction)) fScore = 10 + (h % 18);
  else fScore = 42 + (h % 28);
  const relScore = 32 + (hashStr(saveId + memberId + 'relc') % 55);
  const combined = Math.round(fScore * 0.6 + relScore * 0.4);
  if (combined >= 62) return '赞成';
  if (combined >= 40) return '弃权';
  return '反对';
}

// ── 生成NPC提案 ───────────────────────────────────────────────────────
function buildNpcProposals(saveId: string, gameDays: number, existCount: number): AppointProposal[] {
  if (existCount > 0) return [];
  const cadres = buildCityCadres(saveId);
  return NPC_TMPL.slice(0, 2).map((tmpl, i) => {
    const cadre = cadres[i] ?? cadres[0]!;
    const committee = buildCityCommittee(saveId).map(m => ({
      ...m,
      stance: calcStance(m.id, m.faction, cadre.faction, saveId),
    }));
    return {
      id: `npc_c_${gameDays}_${i}`,
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
      proposedBy: committee[1]?.name ?? '市长',
      isTopOverride: false,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════
export default function CityAppointmentScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [tab, setTab] = useState<'cadres' | 'propose' | 'vote'>('cadres');
  const [proposals, setProposals] = useState<AppointProposal[]>([]);
  const [feedback, setFeedback] = useState('');
  const [feedbackOk, setFeedbackOk] = useState(true);
  const [selectedCadre, setSelectedCadre] = useState<CityCadre | null>(null);
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
        showFeedback(`📩 市委常委发来${props.length}份干部任免提案`);
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
  if (save.rankLevel < 7) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F4F1', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <StatusBar style="light" backgroundColor="#4E342E" />
        <Text style={{ fontSize: 30, marginBottom: 16 }}>🔒</Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#4E342E', marginBottom: 8 }}>权限不足</Text>
        <Text style={{ fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20 }}>市管干部任免权限仅开放给副厅级（7级）及以上职位</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#4E342E' }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>返回</Text>
        </Pressable>
      </View>
    );
  }

  const cadres = buildCityCadres(save.id);
  const isCitySecretary = save.rankLevel >= 8;  // 市委书记享有一锤定音权

  const handleSubmitProposal = () => {
    if (!selectedCadre) { showFeedback('请先选择被任免干部', false); return; }
    if (!propPost.trim()) { showFeedback('请填写拟任职务', false); return; }
    const committee = buildCityCommittee(save.id).map(m => ({
      ...m,
      stance: calcStance(m.id, m.faction, selectedCadre.faction, save.id),
    }));
    const newProp: AppointProposal = {
      id: `cp_${Date.now()}`,
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
    showFeedback('✅ 提案已提交，请在表决页召开市委常委会');
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
      const quorum = Math.floor(p.members.length / 2) + 1; // 2/3
      return { ...p, voteFor, voteAgainst, voteAbstain, voteStatus: voteFor >= quorum ? 'approved' : 'rejected' };
    }));
    const prop = proposals.find(p => p.id === propId);
    if (!prop) return;
    const voteFor = prop.members.filter(m => m.stance === '赞成').length;
    if (voteFor >= 2) {
      await updateGameSave({ meritPoints: (save.meritPoints ?? 0) + 12 });
      showFeedback(`✅ 市委常委会${voteFor}:${prop.members.length - voteFor}通过，政绩+12`);
    } else {
      showFeedback(`❌ 市委常委会未通过（${voteFor}票赞成），建议改善与常委的关系`, false);
    }
  };

  const handleTopOverride = async (propId: string, forceApprove: boolean) => {
    if (revealTimer.current) clearInterval(revealTimer.current);
    setDeliberatingId(null);
    setProposals(prev => prev.map(p =>
      p.id === propId ? { ...p, voteStatus: forceApprove ? 'approved' : 'rejected', isTopOverride: true } : p,
    ));
    if (forceApprove) {
      await updateGameSave({ meritPoints: (save.meritPoints ?? 0) + 18 });
      showFeedback('⚡ 市委书记行使一锤定音权，任命强制通过，政绩+18');
    } else {
      showFeedback('⚡ 市委书记行使否决权，提案驳回');
    }
  };

  const pendingProps = proposals.filter(p => p.voteStatus === 'pending');
  const activeProps  = proposals.filter(p => p.voteStatus === 'deliberating');
  const decidedProps = proposals.filter(p => p.voteStatus === 'approved' || p.voteStatus === 'rejected');

  return (
    <View style={{ flex: 1, backgroundColor: '#0C0E14' }}>
      <StatusBar style="light" backgroundColor="#14182C" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#14182C', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: '#6A8ACA', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#6A8ACA', fontSize: 9, letterSpacing: 3 }}>市委组织部 · 市管干部</Text>
            <Text style={{ color: '#B0C8F0', fontSize: 16, fontWeight: '700' }}>🏙️ 市管干部任免</Text>
            <Text style={{ color: '#6A8ACA', fontSize: 10 }}>
              {isCitySecretary ? '市委书记 · 一锤定音权' : '市级领导 · 提名建议权'} · 市委常委会（3人表决）
            </Text>
          </View>
          {isCitySecretary && (
            <View style={{ backgroundColor: '#1A2040', borderWidth: 1, borderColor: '#4A6ACA', paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: '#88AAEE', fontSize: 9, fontWeight: '700' }}>⚡ 一锤定音</Text>
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
              style={{ flex: 1, paddingVertical: 7, alignItems: 'center', backgroundColor: tab === t.key ? '#1A2A50' : 'rgba(255,255,255,0.08)' }}
            >
              <Text style={{ color: tab === t.key ? '#B0C8F0' : '#6A8ACA', fontSize: 9, fontWeight: tab === t.key ? '700' : '400' }}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 反馈条 */}
      {feedback ? (
        <View style={{ backgroundColor: feedbackOk ? '#0D1A2A' : '#2A0D0D', padding: 10 }}>
          <Text style={{ color: feedbackOk ? '#5AAAEA' : '#FF6666', fontSize: 12, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      {/* ══ 干部候选 ══ */}
      {tab === 'cadres' && (
        <FlatList
          data={cadres}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 12, gap: 8 }}
          ListHeaderComponent={
            <View style={{ backgroundColor: '#14182C', borderWidth: 1, borderColor: '#2A3A60', padding: 10, marginBottom: 4 }}>
              <Text style={{ fontSize: 10, color: '#8AAADA', fontWeight: '700' }}>
                市管干部候选池：{cadres.length}人 · 含各县区主要领导及候补干部
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const fColor = FACTION_COLORS[item.faction] ?? '#888';
            return (
              <Pressable
                onPress={() => { setSelectedCadre(item); setTab('propose'); }}
                style={{ backgroundColor: '#141828', borderWidth: 1, borderColor: '#1A2A40', padding: 12 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 44, height: 44, backgroundColor: '#1A2040', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#3A5A8A' }}>
                    <Text style={{ fontSize: 22 }}>🏙️</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#B0C8F0' }}>{item.name}</Text>
                    <Text style={{ fontSize: 11, color: '#8AAADA', marginTop: 1 }}>{item.currentPost} · {item.currentOrg}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                      <View style={{ backgroundColor: fColor + '22', borderWidth: 1, borderColor: fColor, paddingHorizontal: 5, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 9, color: fColor }}>{item.faction}</Text>
                      </View>
                      <Text style={{ fontSize: 9, color: '#6A8ACA' }}>{item.age}岁 · 能力{item.ability}</Text>
                    </View>
                  </View>
                  <Text style={{ color: '#5A8ACA', fontSize: 12 }}>提名 ›</Text>
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
          <View style={{ backgroundColor: '#141828', borderWidth: 1, borderColor: '#2A3A60', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#5A8ACA', fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>被任免干部</Text>
            {selectedCadre ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 48, height: 48, backgroundColor: '#1A2040', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#3A5A8A' }}>
                  <Text style={{ fontSize: 24 }}>🏙️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#B0C8F0' }}>{selectedCadre.name}</Text>
                  <Text style={{ fontSize: 11, color: '#8AAADA' }}>{selectedCadre.currentPost} · {selectedCadre.currentOrg}</Text>
                  <Text style={{ fontSize: 10, color: '#5A8ACA' }}>{selectedCadre.faction} · {selectedCadre.age}岁 · 能力{selectedCadre.ability}</Text>
                </View>
                <Pressable onPress={() => { setSelectedCadre(null); setTab('cadres'); }}>
                  <Text style={{ color: '#CC5555', fontSize: 12 }}>重选</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setTab('cadres')} style={{ padding: 14, borderWidth: 1, borderColor: '#2A3A60', alignItems: 'center', backgroundColor: '#0E1420' }}>
                <Text style={{ color: '#5A8ACA', fontSize: 12, fontWeight: '600' }}>+ 从市管干部候选池选择</Text>
              </Pressable>
            )}
          </View>

          {/* 任免类型 */}
          <View style={{ backgroundColor: '#141828', borderWidth: 1, borderColor: '#2A3A60', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#5A8ACA', fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>任免类型</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(['任命', '免职', '调任', '晋升'] as const).map(t => (
                <Pressable key={t} onPress={() => setPropType(t)}
                  style={{ paddingHorizontal: 16, paddingVertical: 8, borderWidth: 2, borderColor: propType === t ? '#5A8ACA' : '#1A2A40', backgroundColor: propType === t ? '#1A2A50' : '#0E1420' }}
                >
                  <Text style={{ color: propType === t ? '#B0C8F0' : '#4A6A9A', fontWeight: propType === t ? '700' : '400', fontSize: 12 }}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* 拟任职务 */}
          <View style={{ backgroundColor: '#141828', borderWidth: 1, borderColor: '#2A3A60', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#5A8ACA', fontWeight: '700', letterSpacing: 2, marginBottom: 8 }}>拟任职务</Text>
            <TextInput value={propPost} onChangeText={setPropPost} placeholder="请填写拟任职务…" placeholderTextColor="#2A3A6A"
              style={{ borderWidth: 1, borderColor: '#2A3A60', padding: 10, fontSize: 13, color: '#B0C8F0', marginBottom: 8, backgroundColor: '#0E1420' }}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {POST_OPTIONS.map(p => (
                <Pressable key={p} onPress={() => setPropPost(p)} style={{ backgroundColor: '#1A2040', paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#2A3A60' }}>
                  <Text style={{ fontSize: 10, color: '#8AAADA' }}>{p}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* 拟任单位 */}
          <View style={{ backgroundColor: '#141828', borderWidth: 1, borderColor: '#2A3A60', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#5A8ACA', fontWeight: '700', letterSpacing: 2, marginBottom: 8 }}>拟任单位（可选）</Text>
            <TextInput value={propOrg} onChangeText={setPropOrg} placeholder="留空则保留原单位" placeholderTextColor="#2A3A6A"
              style={{ borderWidth: 1, borderColor: '#2A3A60', padding: 10, fontSize: 13, color: '#B0C8F0', backgroundColor: '#0E1420' }}
            />
          </View>

          <Pressable onPress={handleSubmitProposal}
            style={{ backgroundColor: selectedCadre && propPost.trim() ? '#1A2A50' : '#101620', paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: selectedCadre && propPost.trim() ? '#5A8ACA' : '#1A2A40' }}
          >
            <Text style={{ color: selectedCadre && propPost.trim() ? '#B0C8F0' : '#2A3A6A', fontWeight: '700', fontSize: 14 }}>
              📋 提交提案，提交市委常委会表决
            </Text>
          </Pressable>
          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* ══ 市委常委会表决 ══ */}
      {tab === 'vote' && (
        <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>
          {[...pendingProps, ...activeProps].map(p => {
            const isDeliberating = deliberatingId === p.id;
            return (
              <View key={p.id} style={{ backgroundColor: '#141828', borderWidth: 1, borderColor: '#3A5A8A', padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <View style={{ backgroundColor: p.proposedBy !== 'player' ? '#1A2A40' : '#141828', borderWidth: 1, borderColor: p.proposedBy !== 'player' ? '#4A6ACA' : '#3A5A8A', paddingHorizontal: 7, paddingVertical: 2 }}>
                    <Text style={{ color: p.proposedBy !== 'player' ? '#8AAADA' : '#6A8ACA', fontSize: 9, fontWeight: '700' }}>
                      {p.proposedBy !== 'player' ? `📩 ${p.proposedBy}发起` : '✍️ 您发起'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#B0C8F0', flex: 1 }}>{p.cadreName}</Text>
                  <Text style={{ fontSize: 9, color: '#4A6A9A' }}>第{p.createdDay}天</Text>
                </View>
                <View style={{ backgroundColor: '#0E1420', padding: 8, marginBottom: 8 }}>
                  <Text style={{ fontSize: 10, color: '#8AAADA' }}>
                    {p.type}拟任：<Text style={{ color: '#A0C0F0', fontWeight: '600' }}>{p.proposedPost}</Text> · {p.proposedOrg}
                  </Text>
                </View>

                {/* 逐票揭示 */}
                {(isDeliberating || p.voteStatus === 'deliberating') && (
                  <View style={{ marginBottom: 10, gap: 4 }}>
                    <Text style={{ fontSize: 10, color: '#5A8ACA', fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>🗳️ 市委常委逐一表决（共3票，需2票通过）</Text>
                    {p.members.map((m, idx) => {
                      const sc = m.stance === '赞成' ? '#1A5A8A' : m.stance === '反对' ? '#8A1A1A' : '#3A3A3A';
                      const sb = m.stance === '赞成' ? '#0D1A2A' : m.stance === '反对' ? '#2A0D0D' : '#141414';
                      const fC = FACTION_COLORS[m.faction] ?? '#888';
                      return (
                        <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, opacity: m.revealed ? 1 : 0.3, backgroundColor: sb, padding: 7, borderWidth: 1, borderColor: sc }}>
                          <Text style={{ width: 14, color: '#4A6A9A', fontSize: 9 }}>{idx + 1}</Text>
                          <Text style={{ flex: 1, color: '#B0C8F0', fontSize: 11, fontWeight: '700' }}>{m.name}</Text>
                          <Text style={{ color: fC, fontSize: 9 }}>{m.faction}</Text>
                          <Text style={{ fontSize: 9, color: '#6A8ACA' }}>{m.title}</Text>
                          {m.revealed ? (
                            <View style={{ backgroundColor: sc + '33', borderWidth: 1, borderColor: sc, paddingHorizontal: 8, paddingVertical: 2, minWidth: 36, alignItems: 'center' }}>
                              <Text style={{ color: m.stance === '赞成' ? '#66AAEE' : m.stance === '反对' ? '#EE6666' : '#AAAAAA', fontSize: 11, fontWeight: '700' }}>{m.stance}</Text>
                            </View>
                          ) : (
                            <View style={{ backgroundColor: '#1A2030', borderWidth: 1, borderColor: '#2A3040', paddingHorizontal: 8, paddingVertical: 2, minWidth: 36, alignItems: 'center' }}>
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
                      style={{ backgroundColor: '#1A2A50', paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#5A8ACA' }}
                    >
                      <Text style={{ color: '#B0C8F0', fontWeight: '700', fontSize: 13 }}>🗳️ 召开市委常委会·逐一表决</Text>
                    </Pressable>
                    {isCitySecretary && (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable onPress={() => void handleTopOverride(p.id, true)}
                          style={{ flex: 1, backgroundColor: '#0D1A2A', paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#3A6A8A' }}
                        >
                          <Text style={{ color: '#66AAEE', fontWeight: '700', fontSize: 11 }}>⚡ 书记一锤定音</Text>
                        </Pressable>
                        <Pressable onPress={() => void handleTopOverride(p.id, false)}
                          style={{ flex: 1, backgroundColor: '#2A1010', paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#8A3A3A' }}
                        >
                          <Text style={{ color: '#EE8888', fontWeight: '700', fontSize: 11 }}>⚡ 书记一票否决</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                )}
                {p.voteStatus === 'deliberating' && !isDeliberating && (
                  <View style={{ backgroundColor: '#0E1420', padding: 8, alignItems: 'center' }}>
                    <Text style={{ color: '#5A8ACA', fontSize: 11 }}>⏳ 表决进行中…</Text>
                  </View>
                )}
              </View>
            );
          })}

          {/* 历史 */}
          {decidedProps.length > 0 && (
            <>
              <View style={{ borderBottomWidth: 1, borderBottomColor: '#2A3A60', paddingBottom: 4 }}>
                <Text style={{ fontSize: 10, color: '#4A6A9A', fontWeight: '700', letterSpacing: 2 }}>历史表决记录</Text>
              </View>
              {decidedProps.map(p => {
                const ok = p.voteStatus === 'approved';
                return (
                  <View key={p.id} style={{ backgroundColor: '#141828', borderWidth: 1, borderColor: ok ? '#1A3A5C' : '#5C1A1A', padding: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Text style={{ fontSize: 15 }}>{p.isTopOverride ? '⚡' : ok ? '✅' : '❌'}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#B0C8F0', flex: 1 }}>{p.cadreName}</Text>
                      <View style={{ backgroundColor: ok ? '#1A3A5C' : '#5C1A1A', paddingHorizontal: 6, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 9, color: ok ? '#5AAAEA' : '#FF6666', fontWeight: '700' }}>
                          {p.isTopOverride ? (ok ? '书记一锤定音' : '书记否决') : (ok ? '通过' : '否决')}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: '#8AAADA' }}>{p.type}：{p.proposedPost} · {p.proposedOrg}</Text>
                    {!p.isTopOverride && (
                      <Text style={{ fontSize: 10, color: '#4A6A9A', marginTop: 4 }}>
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
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🏙️</Text>
              <Text style={{ fontSize: 14, color: '#4A6A9A', textAlign: 'center' }}>暂无市管干部任免提案</Text>
              <Text style={{ fontSize: 11, color: '#2A3A6A', marginTop: 4 }}>在「发起提案」页提交，或等待市委委员发起</Text>
            </View>
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </View>
  );
}
```

<a id="srcappappconcurrentpoststsx"></a>
## `src/app/(app)/concurrent-posts.tsx`

```tsx
// 职务兼职管理页面 - 查看/担任/行使兼职职务，获取政绩与好感加成
import { useCallback, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getAvailableConcurrentPosts, CONCURRENT_POST_CONFIG } from '@/types/game';
import type { ConcurrentPost } from '@/types/game';

export default function ConcurrentPostsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [feedback, setFeedback] = useState('');
  const [actingKey, setActingKey] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<ConcurrentPost | null>(null);
  const [lastActDays, setLastActDays] = useState<Record<string, number>>({});

  useFocusEffect(
    useCallback(() => {
      // 无需额外加载，从save.concurrentPosts读取
    }, [save])
  );

  if (!save) return null;

  const currentPosts = save.concurrentPosts ?? [];
  const available = getAvailableConcurrentPosts(save.rankLevel);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3000);
  };

  // 担任兼职职务
  const handleTake = async (post: ConcurrentPost) => {
    if (currentPosts.includes(post.key)) {
      showFeedback('已担任该职务');
      return;
    }
    if (currentPosts.length >= 3) {
      showFeedback('⚠️ 最多同时担任3个兼职职务，请先退出一个');
      return;
    }
    const newPosts = [...currentPosts, post.key];
    await updateGameSave({ concurrentPosts: newPosts, meritPoints: save.meritPoints + 20 });
    showFeedback(`✅ 已担任【${post.label}】，获政绩+20`);
    setSelectedPost(null);
  };

  // 退出兼职职务
  const handleResign = async (postKey: string) => {
    const newPosts = currentPosts.filter(k => k !== postKey);
    await updateGameSave({ concurrentPosts: newPosts });
    const post = CONCURRENT_POST_CONFIG.find(p => p.key === postKey);
    showFeedback(`已退出【${post?.label ?? postKey}】`);
    setSelectedPost(null);
  };

  // 行使兼职职务（参加会议/活动）
  const handleAct = async (post: ConcurrentPost) => {
    const lastDay = lastActDays[post.key] ?? 0;
    const cooldown = 90; // 90天冷却
    if (save.gameDays - lastDay < cooldown && lastDay > 0) {
      const remaining = cooldown - (save.gameDays - lastDay);
      showFeedback(`⏳ 冷却中，还需 ${remaining} 天后可再次参与`);
      return;
    }
    setActingKey(post.key);
    const meritGain = post.meritBonus;
    const favorGain = post.favorBonus;
    const newMerit = save.meritPoints + meritGain;
    const newFavor = Math.min(100, save.bossFavor + (favorGain > 0 ? favorGain : 0));
    await updateGameSave({ meritPoints: newMerit, bossFavor: newFavor });
    setLastActDays(prev => ({ ...prev, [post.key]: save.gameDays }));
    setActingKey(null);
    const favorText = favorGain > 0 ? `，上司好感+${favorGain}` : favorGain < 0 ? `，注意：上司好感${favorGain}` : '';
    showFeedback(`✅ 参与【${post.label}】活动完成，政绩+${meritGain}${favorText}`);
  };

  const myPosts = CONCURRENT_POST_CONFIG.filter(p => currentPosts.includes(p.key));
  const categoryColors: Record<string, string> = {
    '全国议政院': '#1565C0',
    '全国参政院': '#E65100',
    '党委': '#B71C1C',
    '地方议政院': '#4527A0',
    '地方参政院': '#6D4C41',
    '纪检': '#212121',
    '专项': '#1B5E20',
  };

  const renderPost = ({ item }: { item: ConcurrentPost }) => {
    const isHeld = currentPosts.includes(item.key);
    const categoryColor = categoryColors[item.category] ?? '#555';
    const isSelected = selectedPost?.key === item.key;
    const cooldown = 90;
    const lastDay = lastActDays[item.key] ?? 0;
    const canAct = isHeld && (save.gameDays - lastDay >= cooldown || lastDay === 0);

    return (
      <Pressable
        onPress={() => setSelectedPost(isSelected ? null : item)}
        style={{
          backgroundColor: isHeld ? '#F0F7FF' : '#FFF',
          borderWidth: 1,
          borderColor: isSelected ? categoryColor : (isHeld ? '#90CAF9' : '#DDD'),
          padding: 14, marginBottom: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Text style={{ fontSize: 26 }}>{item.icon}</Text>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#222' }}>{item.label}</Text>
              <View style={{ backgroundColor: categoryColor + '22', borderWidth: 1, borderColor: categoryColor, paddingHorizontal: 5, paddingVertical: 1 }}>
                <Text style={{ fontSize: 9, color: categoryColor, fontWeight: '700' }}>{item.category}</Text>
              </View>
              {isHeld && (
                <View style={{ backgroundColor: '#2E7D32', paddingHorizontal: 6, paddingVertical: 1 }}>
                  <Text style={{ fontSize: 9, color: '#FFF', fontWeight: '700' }}>在职</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
              所需职级: {item.minRank}级{item.maxRank !== -1 ? `~${item.maxRank}级` : '以上'} · 政绩+{item.meritBonus}/次{item.favorBonus > 0 ? ` · 好感+${item.favorBonus}` : item.favorBonus < 0 ? ` · 好感${item.favorBonus}` : ''}
            </Text>
          </View>
        </View>

        {isSelected && (
          <View style={{ borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 10, gap: 8 }}>
            <Text style={{ fontSize: 12, color: '#444', lineHeight: 18 }}>{item.desc}</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {!isHeld ? (
                <Pressable
                  onPress={() => void handleTake(item)}
                  style={{ backgroundColor: '#1976D2', paddingHorizontal: 16, paddingVertical: 8 }} android_ripple={{ color: 'rgba(0,0,0,0.15)' }}
                >
                  <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>担任此职务</Text>
                </Pressable>
              ) : (
                <>
                  <Pressable
                    onPress={() => void handleAct(item)}
                    disabled={!canAct || actingKey === item.key}
                    style={{ backgroundColor: canAct ? '#2E7D32' : '#9E9E9E', paddingHorizontal: 16, paddingVertical: 8 }}
                    android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                  >
                    {actingKey === item.key
                      ? <ActivityIndicator size="small" color="#FFF" />
                      : <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>
                          {canAct ? '参加活动' : '冷却中'}
                        </Text>
                    }
                  </Pressable>
                  <Pressable
                    onPress={() => void handleResign(item.key)}
                    style={{ backgroundColor: '#B71C1C', paddingHorizontal: 16, paddingVertical: 8 }} android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                  >
                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>退出职务</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F0F4F8' }}>
      <StatusBar style="light" />
      {/* 顶栏 */}
      <View style={{ backgroundColor: '#1D3B5E', padding: 16, paddingTop: insets.top + 8, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 1 }}>{save.rankName} · {save.playerName}</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>职务兼职</Text>
          </View>
          <Text style={{ color: '#a0b4cc', fontSize: 11 }}>在职{currentPosts.length}/3个</Text>
        </View>
        {/* 当前兼职摘要 */}
        {myPosts.length > 0 && (
          <View style={{ backgroundColor: '#243F5C', padding: 10, gap: 6 }}>
            <Text style={{ color: '#90CAF9', fontSize: 11, fontWeight: '700', marginBottom: 2 }}>🎖️ 当前兼职职务</Text>
            {myPosts.map(p => (
              <View key={p.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 14 }}>{p.icon}</Text>
                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>{p.label}</Text>
                <Text style={{ color: '#90CAF9', fontSize: 10 }}>政绩+{p.meritBonus}/次</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 反馈条 */}
      {feedback ? (
        <View style={{ backgroundColor: '#E8F5E9', borderBottomWidth: 1, borderBottomColor: '#C8E6C9', padding: 10 }}>
          <Text style={{ color: '#2A7A3B', fontSize: 12, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      <FlatList
        data={available}
        renderItem={renderPost}
        keyExtractor={item => item.key}
        contentContainerStyle={{ padding: 14 }}
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={
          <View style={{ marginBottom: 10, gap: 6 }}>
            <View style={{ backgroundColor: '#E3F2FD', borderWidth: 1, borderColor: '#90CAF9', padding: 10 }}>
              <Text style={{ fontSize: 12, color: '#1565C0', fontWeight: '700', marginBottom: 4 }}>📌 职务兼职说明</Text>
              <Text style={{ fontSize: 11, color: '#333', lineHeight: 17 }}>
                根据当前职级，您可担任以下兼职职务。最多同时在职3个。每个职务每90天可参加一次活动，获取政绩与好感加成。担任更高级别的兼职需要更多政绩积累。
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>🔒</Text>
            <Text style={{ color: '#888', fontSize: 14 }}>当前职级暂无可担任的兼职职务</Text>
            <Text style={{ color: '#aaa', fontSize: 11, marginTop: 4 }}>晋升后可解锁更多职务</Text>
          </View>
        }
      />
    </View>
  );
}
```

<a id="srcappappconstructiontsx"></a>
## `src/app/(app)/construction.tsx`

```tsx
// 城市建设页面 — 城市财政驱动（万元），项目唯一制，分级差异化
import { useState, useCallback } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getBuildProjects, startBuildProject } from '@/db/gameApi';
import { getAvailableProjects, formatMoney, formatFund } from '@/types/game';
import type { BuildProject, BuildProjectTemplate } from '@/types/game';
import { gameDaysToDate } from '@/types/game';

const EFFECT_LABEL: Record<string, string> = {
  gdp: 'GDP',
  livelihood: '民生',
  ecology: '生态',
  business: '营商',
};
const EFFECT_COLOR: Record<string, string> = {
  gdp: '#1D2D44',
  livelihood: '#2a7a3b',
  ecology: '#0d6e6e',
  business: '#7a5c2a',
};
const EFFECT_BG: Record<string, string> = {
  gdp: '#EEF2F7',
  livelihood: '#e8f5e9',
  ecology: '#e0f4f4',
  business: '#fff8ee',
};

// 效益类型筛选选项
type EffectFilter = 'all' | 'gdp' | 'livelihood' | 'ecology' | 'business';
const FILTER_OPTIONS: { key: EffectFilter; label: string }[] = [
  { key: 'all',       label: '全部' },
  { key: 'gdp',       label: 'GDP' },
  { key: 'livelihood',label: '民生' },
  { key: 'ecology',   label: '生态' },
  { key: 'business',  label: '营商' },
];

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = Math.min(100, (value / total) * 100);
  return (
    <View style={{ height: 4, backgroundColor: '#E8E8E5', marginTop: 4 }}>
      <View style={{ height: 4, width: `${pct}%`, backgroundColor: '#2a7a3b' }} />
    </View>
  );
}

// 财政投入规模标签
function FundScale({ fund }: { fund: number }) {
  let label = '小型';
  let color = '#2a7a3b';
  if (fund >= 100000000)      { label = '超大型'; color = '#C82829'; }
  else if (fund >= 10000000)  { label = '大型';   color = '#b35900'; }
  else if (fund >= 1000000)   { label = '中型';   color = '#2B4B6F'; }
  return (
    <View style={{ backgroundColor: color + '18', borderWidth: 1, borderColor: color + '55', paddingHorizontal: 5, paddingVertical: 1 }}>
      <Text style={{ fontSize: 9, color, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

function ProjectCard({ tpl, onBuild, canAfford, loading, alreadyBuilt }: {
  tpl: BuildProjectTemplate;
  onBuild: (tpl: BuildProjectTemplate) => void;
  canAfford: boolean;
  loading: boolean;
  alreadyBuilt: boolean;
}) {
  const effectColor = EFFECT_COLOR[tpl.effectType] ?? '#1D2D44';
  const effectBg    = EFFECT_BG[tpl.effectType]    ?? '#EEF2F7';

  if (alreadyBuilt) {
    return (
      <View style={{ backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#D1D1D1', padding: 12, marginBottom: 8, opacity: 0.6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: '#999', fontWeight: '600', flex: 1 }}>{tpl.name}</Text>
          <View style={{ backgroundColor: '#E0E0E0', paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, color: '#888' }}>已完工</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14, marginBottom: 10 }}>
      {/* 标题行 */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5, flexWrap: 'wrap' }}>
            {/* 效益类型标签 */}
            <View style={{ backgroundColor: effectBg, borderWidth: 1, borderColor: effectColor + '55', paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontSize: 9, color: effectColor, fontWeight: '700' }}>{EFFECT_LABEL[tpl.effectType]}</Text>
            </View>
            <FundScale fund={tpl.costFund} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}>{tpl.name}</Text>
          </View>
          <Text style={{ fontSize: 11, color: '#666', lineHeight: 17, marginBottom: 10 }}>{tpl.desc}</Text>

          {/* 消耗 & 收益信息条 */}
          <View style={{ backgroundColor: '#F8F7F5', borderWidth: 1, borderColor: '#E8E6E2', padding: 8, gap: 5 }}>
            {/* 财政投入 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 10, color: '#888', width: 52 }}>财政投入</Text>
              <Text style={{ fontSize: 12, color: '#C82829', fontWeight: '700', flex: 1 }}>
                {tpl.costFund >= 10000
                  ? `${(tpl.costFund / 10000).toFixed(tpl.costFund % 10000 === 0 ? 0 : 1)}亿元`
                  : tpl.costFund >= 1
                    ? `${tpl.costFund}万元`
                    : `${formatMoney(tpl.costFund * 10000)}元`}
              </Text>
            </View>
            {/* 工期 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 10, color: '#888', width: 52 }}>建设工期</Text>
              <Text style={{ fontSize: 12, color: '#1D2D44', fontWeight: '600', flex: 1 }}>
                {tpl.durationDays >= 365
                  ? `约${(tpl.durationDays / 365).toFixed(1)}年（${tpl.durationDays}天）`
                  : `${tpl.durationDays}天`}
              </Text>
            </View>
            {/* 竣工效益 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 10, color: '#888', width: 52 }}>竣工效益</Text>
              <Text style={{ fontSize: 12, color: effectColor, fontWeight: '700', flex: 1 }}>
                {EFFECT_LABEL[tpl.effectType]} +{tpl.effectValue}
                <Text style={{ fontSize: 10, color: '#888', fontWeight: '400' }}> · 奖励 +{tpl.meritReward}政绩</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* 开工按钮 */}
        <Pressable
          onPress={() => onBuild(tpl)}
          disabled={!canAfford || loading}
          style={{
            paddingHorizontal: 14, paddingVertical: 12,
            backgroundColor: !canAfford ? '#E0E0E0' : '#1D2D44',
            alignItems: 'center', minWidth: 62, alignSelf: 'flex-start',
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={{ color: canAfford ? '#fff' : '#999', fontSize: 13, fontWeight: '700' }}>
                {canAfford ? '开工' : '资金\n不足'}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function BuildingCard({ proj, gameDays }: { proj: BuildProject; gameDays: number }) {
  const elapsed    = Math.max(0, gameDays - proj.startDay);
  const remainDays = Math.max(0, proj.finishDay - gameDays);
  const effectColor = EFFECT_COLOR[proj.effectType] ?? '#2a7a3b';
  const pct = Math.min(100, Math.round((elapsed / proj.durationDays) * 100));
  return (
    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#2a7a3b', borderLeftWidth: 3, padding: 14, marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A', flex: 1, marginRight: 6 }}>{proj.name}</Text>
        <View style={{ backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ fontSize: 10, color: '#2a7a3b', fontWeight: '600' }}>建设中 {pct}%</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 4 }}>
        <Text style={{ fontSize: 11, color: '#666' }}>
          竣工：{gameDaysToDate(proj.finishDay)}（剩 <Text style={{ fontWeight: '700', color: remainDays <= 30 ? '#C82829' : '#333' }}>{remainDays}</Text> 天）
        </Text>
        <Text style={{ fontSize: 11, color: effectColor, fontWeight: '600' }}>
          {EFFECT_LABEL[proj.effectType]} +{proj.effectValue} · 奖励+{proj.meritReward}政绩
        </Text>
      </View>
      <ProgressBar value={elapsed} total={proj.durationDays} />
      <Text style={{ fontSize: 10, color: '#888', marginTop: 4 }}>
        财政投入：{formatMoney(proj.costFund)} 元 · 开工：{gameDaysToDate(proj.startDay)}
      </Text>
    </View>
  );
}

function CompletedCard({ proj }: { proj: BuildProject }) {
  const effectColor = EFFECT_COLOR[proj.effectType] ?? '#555';
  return (
    <View style={{ backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#D1D1D1', padding: 12, marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#555' }}>{proj.name}</Text>
          <Text style={{ fontSize: 10, color: '#888', marginTop: 3 }}>
            竣工：{gameDaysToDate(proj.finishDay)} · 投入 {formatMoney(proj.costFund)} 元
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <View style={{ backgroundColor: '#E0E0E0', paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ fontSize: 9, color: '#777', fontWeight: '600' }}>已竣工</Text>
          </View>
          <Text style={{ fontSize: 10, color: effectColor, fontWeight: '600' }}>
            {EFFECT_LABEL[proj.effectType]} +{proj.effectValue}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function ConstructionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [projects, setProjects] = useState<BuildProject[]>([]);
  const [buildingTpl, setBuildingTpl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackOk, setFeedbackOk] = useState(true);
  const [effectFilter, setEffectFilter] = useState<EffectFilter>('all');
  const [showCompleted, setShowCompleted] = useState(false);

  const rankLevel = save?.rankLevel ?? 1;
  const availableTemplates = getAvailableProjects(rankLevel);

  const showFeedback = (msg: string, ok = true) => {
    setFeedback(msg);
    setFeedbackOk(ok);
    setTimeout(() => setFeedback(''), 4000);
  };

  useFocusEffect(
    useCallback(() => {
      if (!save) return;
      getBuildProjects(save.id).then(setProjects);
    }, [save])
  );

  // costFund 单位：万元；save.fundBalance 单位：万元 → 直接比较
  const handleBuild = async (tpl: BuildProjectTemplate) => {
    if (!save) return;
    const fundWan = save.fundBalance;
    if (fundWan < tpl.costFund) {
      const need = tpl.costFund >= 10000
        ? `${(tpl.costFund / 10000).toFixed(1)}亿`
        : `${tpl.costFund}万`;
      const cur = fundWan >= 10000
        ? `${(fundWan / 10000).toFixed(1)}亿`
        : `${fundWan}万`;
      showFeedback(`财政余额不足，需 ${need} 元（当前 ${cur} 元）`, false);
      return;
    }
    setBuildingTpl(tpl.name);
    const proj = await startBuildProject(save.id, save.userId, save.gameDays, tpl);
    if (proj) {
      // 扣减财政余额：通过 updateGameSave 更新 player_saves，同步刷新 context
      await updateGameSave({ fundBalance: Math.max(0, save.fundBalance - tpl.costFund) });
      const fresh = await getBuildProjects(save.id);
      setProjects(fresh);
      const costLabel = tpl.costFund >= 10000
        ? `${(tpl.costFund / 10000).toFixed(1)}亿元`
        : `${tpl.costFund}万元`;
      showFeedback(`✓ 【${tpl.name}】已开工 · 投入 ${costLabel} · 预计 ${tpl.durationDays} 天竣工`, true);
    } else {
      showFeedback('开工失败，请重试', false);
    }
    setBuildingTpl(null);
  };

  const buildingProjects  = projects.filter(p => p.status === 'building');
  const completedProjects = projects.filter(p => p.status === 'done');

  // 已建造（在建+已竣工）的项目名称集合 → 屏蔽"只能建一次"
  const builtNames = new Set(projects.map(p => p.name));

  // 筛选可建项目（排除已建/在建）
  let filteredTemplates = availableTemplates.filter(t => !builtNames.has(t.name));
  if (effectFilter !== 'all') filteredTemplates = filteredTemplates.filter(t => t.effectType === effectFilter);

  // 已完工屏蔽项（已建但未在上述filteredTemplates中）
  const builtTemplates = availableTemplates.filter(t => builtNames.has(t.name));

  // 在建项目按剩余天数排序（最快完工在前）
  const sortedBuilding = [...buildingProjects].sort((a, b) => a.finishDay - b.finishDay);

  // 效益汇总
  const effectSummary: Record<string, number> = { gdp: 0, livelihood: 0, ecology: 0, business: 0 };
  completedProjects.forEach(p => { effectSummary[p.effectType] = (effectSummary[p.effectType] ?? 0) + p.effectValue; });
  const totalFundInvested = completedProjects.reduce((s, p) => s + (p.costFund ?? 0), 0);
  const totalMeritRewarded = completedProjects.reduce((s, p) => s + (p.meritReward ?? 0), 0);

  const buildGroupLabel =
    rankLevel <= 3  ? '乡镇建设项目' :
    rankLevel <= 6  ? '县级重点工程' :
    rankLevel <= 11 ? '市级重大项目' : '省级基础设施工程';

  // 财政余额直接从 save.fundBalance 读取（player_saves 是月度结算的唯一权威来源）
  const fundBalanceWan = save?.fundBalance ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      <StatusBar style="light" backgroundColor="#1D2D44" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#1D2D44', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>CONSTRUCTION</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>城市建设</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10 }}>财政余额</Text>
            <Text style={{ color: fundBalanceWan >= 100 ? '#81c784' : '#ef9a9a', fontSize: 13, fontWeight: '700' }}>
              {formatFund(fundBalanceWan)}
            </Text>
          </View>
        </View>
        {/* 进度摘要 */}
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <Text style={{ color: '#a0b4cc', fontSize: 11 }}>
            在建 <Text style={{ color: '#fff', fontWeight: '700' }}>{buildingProjects.length}</Text> 个
          </Text>
          <Text style={{ color: '#a0b4cc', fontSize: 11 }}>
            已竣工 <Text style={{ color: '#81c784', fontWeight: '700' }}>{completedProjects.length}</Text>/{availableTemplates.length}
          </Text>
          <Text style={{ color: '#a0b4cc', fontSize: 11 }}>
            待规划 <Text style={{ color: '#fff', fontWeight: '700' }}>{filteredTemplates.length}</Text> 个
          </Text>
        </View>
      </View>

      {/* 反馈条 */}
      {feedback ? (
        <View style={{ backgroundColor: feedbackOk ? '#e8f5e9' : '#ffebee', borderBottomWidth: 1, borderBottomColor: feedbackOk ? '#c8e6c9' : '#ffcdd2', padding: 10 }}>
          <Text style={{ color: feedbackOk ? '#2a7a3b' : '#C82829', fontSize: 12, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }} showsVerticalScrollIndicator={false}>

        {/* ── 累计效益汇总 ── */}
        {completedProjects.length > 0 && (
          <View style={{ backgroundColor: '#1D2D44', padding: 14 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2, marginBottom: 10 }}>已竣工项目累计效益</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {Object.entries(effectSummary).filter(([, v]) => v > 0).map(([k, v]) => (
                <View key={k} style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', minWidth: 72 }}>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] }}>+{v}</Text>
                  <Text style={{ color: '#a0b4cc', fontSize: 9, marginTop: 2 }}>{EFFECT_LABEL[k]}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <Text style={{ color: '#a0b4cc', fontSize: 10 }}>总投入：<Text style={{ color: '#ef9a9a', fontWeight: '700' }}>{totalFundInvested >= 10000 ? `${(totalFundInvested / 10000).toFixed(1)}亿` : `${totalFundInvested}万`} 元</Text></Text>
              <Text style={{ color: '#a0b4cc', fontSize: 10 }}>竣工奖励：<Text style={{ color: '#81c784', fontWeight: '700' }}>+{totalMeritRewarded} 政绩</Text></Text>
            </View>
          </View>
        )}

        {/* ── 在建项目 ── */}
        {sortedBuilding.length > 0 && (
          <View>
            <Text style={{ fontSize: 11, color: '#1D2D44', fontWeight: '700', letterSpacing: 2, marginBottom: 8 }}>
              在建项目（{buildingProjects.length}）
            </Text>
            {sortedBuilding.map(p => (
              <BuildingCard key={p.id} proj={p} gameDays={save?.gameDays ?? 0} />
            ))}
          </View>
        )}

        {/* ── 可规划项目 ── */}
        {rankLevel >= 2 && (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 11, color: '#1D2D44', fontWeight: '700', letterSpacing: 2 }}>
                {buildGroupLabel}
              </Text>
              <Text style={{ fontSize: 10, color: '#888' }}>
                {filteredTemplates.length} 个可建
              </Text>
            </View>

            {/* 效益类型筛选条 */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {FILTER_OPTIONS.map(opt => (
                  <Pressable
                    key={opt.key}
                    onPress={() => setEffectFilter(opt.key)}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 6,
                      backgroundColor: effectFilter === opt.key ? '#1D2D44' : '#fff',
                      borderWidth: 1, borderColor: effectFilter === opt.key ? '#1D2D44' : '#D1D1D1',
                    }}
                  >
                    <Text style={{ fontSize: 11, color: effectFilter === opt.key ? '#fff' : '#555', fontWeight: effectFilter === opt.key ? '700' : '400' }}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* 资金不足提示 */}
            {fundBalanceWan < 10 && (
              <View style={{ backgroundColor: '#fff8ee', borderWidth: 1, borderColor: '#F0C050', padding: 10, marginBottom: 10 }}>
                <Text style={{ fontSize: 11, color: '#7A5C00' }}>
                  ⚠ 财政余额偏低，建议通过招商引资、贷款融资等渠道补充城市建设资金
                </Text>
              </View>
            )}

            {filteredTemplates.length === 0 && builtTemplates.length === 0 ? (
              <View style={{ backgroundColor: '#EEF2F7', borderWidth: 1, borderColor: '#D0DCE8', padding: 14, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: '#1D2D44' }}>
                  {effectFilter !== 'all' ? `暂无可建的${EFFECT_LABEL[effectFilter]}类项目` : '所有项目均已开工或竣工'}
                </Text>
              </View>
            ) : (
              <>
                {filteredTemplates.map(tpl => (
                  <ProjectCard
                    key={tpl.name}
                    tpl={tpl}
                    onBuild={handleBuild}
                    canAfford={fundBalanceWan >= tpl.costFund}
                    loading={buildingTpl === tpl.name}
                    alreadyBuilt={false}
                  />
                ))}
                {/* 已完工项目（灰化展示，仍在列表末尾） */}
                {builtTemplates
                  .filter(t => effectFilter === 'all' || t.effectType === effectFilter)
                  .map(tpl => (
                    <ProjectCard
                      key={tpl.name}
                      tpl={tpl}
                      onBuild={handleBuild}
                      canAfford={false}
                      loading={false}
                      alreadyBuilt
                    />
                  ))}
              </>
            )}
          </View>
        )}

        {rankLevel < 2 && (
          <View style={{ backgroundColor: '#FFF9E6', borderWidth: 1, borderColor: '#F0C050', padding: 14, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: '#7A5C00', fontWeight: '600', marginBottom: 4 }}>功能尚未解锁</Text>
            <Text style={{ fontSize: 11, color: '#888', textAlign: 'center' }}>晋升至副乡镇长（2级）后即可开启城市建设功能</Text>
          </View>
        )}

        {/* ── 已竣工项目历史 ── */}
        {completedProjects.length > 0 && (
          <View>
            <Pressable
              onPress={() => setShowCompleted(v => !v)}
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: showCompleted ? 8 : 0 }}
            >
              <Text style={{ fontSize: 11, color: '#888', fontWeight: '700', letterSpacing: 2 }}>
                已竣工项目（{completedProjects.length}）
              </Text>
              <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '600' }}>
                {showCompleted ? '收起 ▲' : '展开 ▼'}
              </Text>
            </Pressable>
            {showCompleted && completedProjects.map(p => <CompletedCard key={p.id} proj={p} />)}
          </View>
        )}

        {/* ── 建设说明 ── */}
        <View style={{ backgroundColor: '#EEF2F7', borderWidth: 1, borderColor: '#D0DCE8', padding: 12 }}>
          <Text style={{ fontSize: 10, color: '#2B4B6F', fontWeight: '700', marginBottom: 6, letterSpacing: 1 }}>建设规则说明</Text>
          <Text style={{ fontSize: 10, color: '#555', lineHeight: 17 }}>
            · 每个项目全局唯一，竣工后不可重复建设{'\n'}
            · 建设消耗城市财政资金，不消耗政绩值{'\n'}
            · 竣工奖励政绩值，同时永久提升城市指数{'\n'}
            · 在建数量无限制，可同时推进多个项目{'\n'}
            · 建设指数提升在竣工时一次性生效
          </Text>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}
```

<a id="srcappappdepartmentstsx"></a>
## `src/app/(app)/departments.tsx`

```tsx
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
```

<a id="srcappappdeptdetailtsx"></a>
## `src/app/(app)/dept-detail.tsx`

```tsx
// 部门子页面 - 通用模板，支持十四大部门（含信访办+组织部）
import { useState, useCallback } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getSubordinates, getEnterprises, getPersonnelCandidates, promoteSubordinate, getPetitionEvents, processPetitionEvent, inspectEnterprise, regulateEnterprise, optimizeBusinessService, generateImmediateEnterprises, fillDeptStaff, batchAssessSubordinates, getSubResumes } from '@/db/gameApi';
import { DEPT_CONFIG, SUB_LEVEL_NAMES, getDeptNameByRank, getDeptStaffQuota, gameDaysToDate } from '@/types/game';
import type { DeptKey, Subordinate, Enterprise, PetitionEvent, SubResume } from '@/types/game';
import { getSubAvatarEmoji } from '@/types/game';
import { StatBar } from '@/components/StatBar';

// 每个部门可执行的施政行动
type PolicyAction = {
  id: string;
  title: string;
  desc: string;
  cost: number; // 政绩消耗
  effect: Partial<{
    cityGdp: number;
    cityLivelihood: number;
    cityEcology: number;
    cityBusiness: number;
    policeForce: number;
    securityIndex: number;
    moralValue: number;
    meritPoints: number;
    bossFavor: number;
    fundBalance: number; // 城市资金变化（万元，正=增收，负=支出）
    taxRevenue: number;  // 税收变化
  }>;
  cooldownDays: number; // 冷却天数（游戏内）
  tag?: string; // 行动标签（如"自动""月度"）
};

const DEPT_POLICIES: Record<DeptKey, PolicyAction[]> = {
  police: [
    {
      id: 'p1', title: '🚔 扫黄打非专项行动',
      desc: '集中警力开展扫黄打非行动，严厉打击黄赌毒，净化社会风气',
      cost: 15, cooldownDays: 60,
      effect: { securityIndex: 10, cityLivelihood: 5, meritPoints: 18, bossFavor: 2 },
      tag: '月度可开展',
    },
    {
      id: 'p2', title: '🔫 治安集中整治',
      desc: '部署警力开展治安专项整治，震慑违法犯罪活动',
      cost: 20, cooldownDays: 90,
      effect: { securityIndex: 8, cityLivelihood: 3, meritPoints: 15 },
    },
    {
      id: 'p3', title: '🏠 社区警务站建设',
      desc: '在居民小区设立警务工作站，方便群众就近报警求助',
      cost: 25, cooldownDays: 180,
      effect: { cityLivelihood: 7, securityIndex: 4, meritPoints: 12, bossFavor: 1 },
    },
    {
      id: 'p4', title: '🛡 增购警用装备',
      desc: '申请专项经费采购先进警用装备，提升综合警力',
      cost: 30, cooldownDays: 180,
      effect: { policeForce: 20, securityIndex: 5, fundBalance: -30 },
    },
  ],
  ndrc: [
    {
      id: 'n1', title: '🏗 招商引资大会',
      desc: '主办招商引资推介会，吸引外部资本入驻，增加城市税收来源',
      cost: 25, cooldownDays: 90,
      effect: { cityGdp: 6, cityBusiness: 6, meritPoints: 20, taxRevenue: 5, fundBalance: 50 },
      tag: '增加税收',
    },
    {
      id: 'n2', title: '🏢 引进重点企业',
      desc: '定向谈判引进行业龙头企业落地投资',
      cost: 35, cooldownDays: 180,
      effect: { cityGdp: 12, cityBusiness: 8, meritPoints: 25, bossFavor: 3, taxRevenue: 10, fundBalance: 120 },
      tag: '高效益',
    },
    {
      id: 'n3', title: '🔄 产业结构调整',
      desc: '推动传统产业转型升级，发展高新技术产业',
      cost: 40, cooldownDays: 200,
      effect: { cityGdp: 8, cityBusiness: 10, meritPoints: 18 },
    },
  ],
  finance: [
    {
      id: 'f1', title: '📊 优化财政支出',
      desc: '精简行政开支，压缩"三公经费"，资金向民生倾斜',
      cost: 20, cooldownDays: 90,
      effect: { cityLivelihood: 5, meritPoints: 12, fundBalance: 30 },
    },
    {
      id: 'f2', title: '📜 发行专项债券',
      desc: '发行政府专项债为基础设施筹资，撬动社会投资',
      cost: 35, cooldownDays: 180,
      effect: { cityGdp: 8, cityBusiness: 4, meritPoints: 18, fundBalance: 200 },
    },
    {
      id: 'f3', title: '💸 减税降费措施',
      desc: '出台一揽子减税降费政策，降低企业经营负担',
      cost: 28, cooldownDays: 150,
      effect: { cityBusiness: 10, cityGdp: 4, meritPoints: 15, bossFavor: 2, fundBalance: -20 },
    },
  ],
  urban: [
    {
      id: 'u1', title: '🏘 老旧小区改造',
      desc: '推进老旧小区整体改造提升，改善居民居住条件',
      cost: 30, cooldownDays: 180,
      effect: { cityLivelihood: 8, cityGdp: 4, meritPoints: 18, fundBalance: -80 },
    },
    {
      id: 'u2', title: '🚧 市政道路升级',
      desc: '对主干道路进行修缮拓宽，提升城市通行能力',
      cost: 35, cooldownDays: 200,
      effect: { cityGdp: 6, cityBusiness: 6, meritPoints: 15, fundBalance: -100 },
    },
    {
      id: 'u3', title: '🏠 保障性住房开工',
      desc: '启动经济适用房和廉租房建设，解决居民住房难题',
      cost: 40, cooldownDays: 240,
      effect: { cityLivelihood: 10, meritPoints: 20, bossFavor: 3, fundBalance: -120 },
    },
  ],
  education: [
    {
      id: 'e1', title: '👨‍🏫 优质教师引进',
      desc: '面向全国发布引才政策，吸引高水平师资来任教',
      cost: 25, cooldownDays: 120,
      effect: { cityLivelihood: 7, meritPoints: 15, bossFavor: 2, fundBalance: -40 },
    },
    {
      id: 'e2', title: '🏫 新建中小学校',
      desc: '补充义务教育阶段学位供给，缓解入学压力',
      cost: 40, cooldownDays: 240,
      effect: { cityLivelihood: 10, meritPoints: 22, fundBalance: -150 },
    },
    {
      id: 'e3', title: '🛠 职业技能培训',
      desc: '组织开展农村劳动力职业技能提升培训班',
      cost: 15, cooldownDays: 90,
      effect: { cityGdp: 4, cityLivelihood: 4, meritPoints: 10 },
      tag: '促就业',
    },
  ],
  health: [
    {
      id: 'h1', title: '🏥 基层卫生所建设',
      desc: '在镇村投资建设标准化卫生所，夯实基层医疗',
      cost: 28, cooldownDays: 150,
      effect: { cityLivelihood: 8, meritPoints: 16, fundBalance: -60 },
    },
    {
      id: 'h2', title: '💊 医疗设备购置',
      desc: '为县医院购置先进诊疗仪器，提升医疗服务水平',
      cost: 35, cooldownDays: 180,
      effect: { cityLivelihood: 6, meritPoints: 14, bossFavor: 2, fundBalance: -80 },
    },
    {
      id: 'h3', title: '🩺 全民健康体检',
      desc: '为辖区居民提供一年一次免费健康体检',
      cost: 22, cooldownDays: 365,
      effect: { cityLivelihood: 5, meritPoints: 12, bossFavor: 1, fundBalance: -30 },
    },
  ],
  ecology: [
    {
      id: 'ec1', title: '🏭 环保专项罚款整治',
      desc: '开展环保专项执法，对违规排污企业依法处以罚款',
      cost: 20, cooldownDays: 60,
      effect: { cityEcology: 10, meritPoints: 18, bossFavor: 2, fundBalance: 80 },
      tag: '增加罚款收入',
    },
    {
      id: 'ec2', title: '🔒 关停污染企业',
      desc: '坚决关停长期不达标的高污染、高耗能企业',
      cost: 30, cooldownDays: 180,
      effect: { cityEcology: 12, meritPoints: 15, cityGdp: -3, cityBusiness: -2 },
    },
    {
      id: 'ec3', title: '🌳 绿化造林工程',
      desc: '启动城乡大规模植树造林和生态修复工程',
      cost: 25, cooldownDays: 150,
      effect: { cityEcology: 8, meritPoints: 14, bossFavor: 2, fundBalance: -50 },
    },
    {
      id: 'ec4', title: '☀️ 清洁能源推广',
      desc: '补贴居民和企业安装太阳能、风能等清洁能源',
      cost: 35, cooldownDays: 200,
      effect: { cityEcology: 6, cityGdp: 3, meritPoints: 16, fundBalance: -60 },
    },
  ],
  market: [
    {
      id: 'm1', title: '📋 食品安全大检查',
      desc: '开展食品安全专项整治，守护群众"舌尖上的安全"',
      cost: 18, cooldownDays: 90,
      effect: { cityLivelihood: 5, meritPoints: 10, bossFavor: 1 },
    },
    {
      id: 'm2', title: '⚡ 优化营业执照审批',
      desc: '推行"一窗通办"改革，压缩营业执照审批时限',
      cost: 22, cooldownDays: 120,
      effect: { cityBusiness: 8, meritPoints: 14 },
    },
    {
      id: 'm3', title: '🚫 打假打劣专项行动',
      desc: '开展打击假冒伪劣商品专项执法，净化市场秩序',
      cost: 20, cooldownDays: 120,
      effect: { cityBusiness: 6, cityLivelihood: 4, meritPoints: 12 },
    },
  ],
  agriculture: [
    {
      id: 'ag1', title: '🌾 高标准农田改造',
      desc: '推进农田水利设施建设和土地平整改良工程',
      cost: 35, cooldownDays: 200,
      effect: { cityGdp: 6, cityLivelihood: 5, meritPoints: 18, fundBalance: -90 },
    },
    {
      id: 'ag2', title: '💰 农业补贴发放',
      desc: '向种粮大户和农业合作社发放政府专项补贴',
      cost: 25, cooldownDays: 365,
      effect: { cityLivelihood: 7, meritPoints: 13, bossFavor: 2, fundBalance: -60 },
    },
    {
      id: 'ag3', title: '📦 农村电商扶持',
      desc: '建设农村电商服务中心，打通农产品上行销售渠道',
      cost: 20, cooldownDays: 150,
      effect: { cityGdp: 5, cityBusiness: 5, meritPoints: 12, taxRevenue: 2, fundBalance: 20 },
    },
  ],
  personnel: [
    {
      id: 'per1', title: '🎓 干部素质培训班',
      desc: '组织在职干部参加党校学习和能力培训，提升整体素质',
      cost: 20, cooldownDays: 90,
      effect: { meritPoints: 15, bossFavor: 2 },
      tag: '全员培训',
    },
    {
      id: 'per2', title: '📊 年度绩效考核',
      desc: '对各部门干部开展系统绩效考核，奖优罚劣',
      cost: 15, cooldownDays: 365,
      effect: { meritPoints: 20, bossFavor: 3 },
      tag: '年度一次',
    },
    {
      id: 'per3', title: '🌟 选拔优秀年轻干部',
      desc: '面向基层选拔优秀年轻干部，充实干部队伍',
      cost: 25, cooldownDays: 180,
      effect: { meritPoints: 18, cityGdp: 2, bossFavor: 2 },
    },
  ],
  invest: [
    {
      id: 'inv1', title: '🏭 工业园区招商推介',
      desc: '举办招商推介会，向全国500强企业发出入驻邀请',
      cost: 25, cooldownDays: 90,
      effect: { cityGdp: 8, cityBusiness: 8, meritPoints: 20, taxRevenue: 5, fundBalance: 80 },
      tag: '季度可开展',
    },
    {
      id: 'inv2', title: '🌿 生态旅游开发洽谈',
      desc: '引进文旅企业开发绿色生态旅游资源，促进旅游收入',
      cost: 20, cooldownDays: 120,
      effect: { cityEcology: 4, cityBusiness: 5, meritPoints: 15, taxRevenue: 3, fundBalance: 50 },
    },
    {
      id: 'inv3', title: '💡 高新技术企业引进',
      desc: '面向头部科技企业开展精准招商，引进高技术产业项目',
      cost: 35, cooldownDays: 180,
      effect: { cityGdp: 12, cityBusiness: 10, meritPoints: 28, taxRevenue: 10, fundBalance: 200 },
      tag: '高收益',
    },
    {
      id: 'inv4', title: '🤝 外资企业洽谈',
      desc: '赴境外参加经贸交流活动，吸引外资企业落地',
      cost: 40, cooldownDays: 240,
      effect: { cityGdp: 15, cityBusiness: 12, meritPoints: 35, taxRevenue: 15, fundBalance: 300 },
      tag: '外资引进',
    },
  ],
  tax: [
    {
      id: 'tax1', title: '🧾 重点企业税收专项清缴',
      desc: '对辖区重点企业开展税务稽查，清缴欠税',
      cost: 15, cooldownDays: 90,
      effect: { meritPoints: 12, fundBalance: 100, taxRevenue: 8 },
      tag: '增收',
    },
    {
      id: 'tax2', title: '📋 纳税服务优化',
      desc: '推进税务服务数字化，简化申报流程，吸引更多企业纳税',
      cost: 20, cooldownDays: 180,
      effect: { cityBusiness: 5, meritPoints: 15, fundBalance: 60 },
    },
    {
      id: 'tax3', title: '🔍 税务稽查专项行动',
      desc: '集中开展税务稽查行动，打击偷逃税行为，维护税收秩序',
      cost: 25, cooldownDays: 120,
      effect: { meritPoints: 18, fundBalance: 150, taxRevenue: 12 },
      tag: '专项执法',
    },
  ],
  petition: [
    {
      id: 'pet1', title: '📮 集中信访化解专项行动',
      desc: '集中力量化解一批长期未解决的信访积案，维护社会稳定',
      cost: 20, cooldownDays: 90,
      effect: { meritPoints: 18, bossFavor: 2, cityLivelihood: 3 },
      tag: '维稳',
    },
    {
      id: 'pet2', title: '🤝 矛盾纠纷调解月',
      desc: '开展矛盾纠纷调解专项活动，将矛盾化解在基层，防止激化上访',
      cost: 15, cooldownDays: 120,
      effect: { meritPoints: 12, bossFavor: 1, cityLivelihood: 4 },
    },
    {
      id: 'pet3', title: '📞 畅通信访渠道建设',
      desc: '完善网上信访、电话信访、领导接访等多元信访渠道，提升群众满意度',
      cost: 18, cooldownDays: 180,
      effect: { cityLivelihood: 5, meritPoints: 14, bossFavor: 2 },
      tag: '服务提升',
    },
    {
      id: 'pet4', title: '🛡 重点人员排摸管控',
      desc: '对有反复上访倾向的重点人员开展走访和关怀，从源头化解信访隐患',
      cost: 22, cooldownDays: 150,
      effect: { meritPoints: 16, bossFavor: 3, cityLivelihood: 2 },
      tag: '基层治理',
    },
  ],
  organization: [
    {
      id: 'org1', title: '🏛️ 干部年度考评',
      desc: '组织开展干部年度综合考核，以考促改，促进干部队伍建设',
      cost: 15, cooldownDays: 365,
      effect: { meritPoints: 20, bossFavor: 3 },
      tag: '年度考核',
    },
    {
      id: 'org2', title: '📋 后备干部名单遴选',
      desc: '从各部门科级干部中遴选优秀后备人才，建立后备干部库',
      cost: 18, cooldownDays: 180,
      effect: { meritPoints: 15, bossFavor: 2 },
      tag: '人才培养',
    },
    {
      id: 'org3', title: '🎓 党性教育专题培训',
      desc: '组织科处级干部参加党性教育专题培训班，筑牢理想信念',
      cost: 12, cooldownDays: 120,
      effect: { meritPoints: 12, bossFavor: 2, cityLivelihood: 2 },
      tag: '培训',
    },
    {
      id: 'org4', title: '⭐ 优秀干部表彰大会',
      desc: '召开表彰大会，对年度考核优秀干部进行表彰奖励，激发干事活力',
      cost: 20, cooldownDays: 365,
      effect: { meritPoints: 18, bossFavor: 4, cityLivelihood: 3 },
      tag: '表彰激励',
    },
  ],
};

// 人事局特有行动（替换market里的人事相关）
const PERSONNEL_EXTRA: PolicyAction[] = [
  {
    id: 'hr1', title: '📝 公务员招录考试',
    desc: '组织年度公务员招录考试，为机关单位补充新鲜血液',
    cost: 20, cooldownDays: 365,
    effect: { cityGdp: 2, cityLivelihood: 3, meritPoints: 15, bossFavor: 1 },
    tag: '年度',
  },
  {
    id: 'hr2', title: '🎓 在职干部培训',
    desc: '组织科级以上干部参加专题培训班，提升施政能力',
    cost: 18, cooldownDays: 180,
    effect: { meritPoints: 12, bossFavor: 2 },
    tag: '提升能力',
  },
  {
    id: 'hr3', title: '⭐ 干部职级评定',
    desc: '开展年度干部考核与职级晋升评定工作',
    cost: 15, cooldownDays: 365,
    effect: { meritPoints: 20, bossFavor: 3 },
    tag: '年度考核',
  },
];

function EffectTag({ label, value }: { label: string; value: number }) {
  const color = value > 0 ? '#2a7a3b' : '#C82829';
  const prefix = value > 0 ? '+' : '';
  return (
    <View style={{ backgroundColor: value > 0 ? '#e8f5e9' : '#ffebee', paddingHorizontal: 8, paddingVertical: 3, marginRight: 5, marginBottom: 4 }}>
      <Text style={{ fontSize: 10, color, fontWeight: '600' }}>{label}{prefix}{value}</Text>
    </View>
  );
}

export default function DepartmentScreen() {
  const insets = useSafeAreaInsets();
  const { type } = useLocalSearchParams<{ type: string }>();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [subordinates, setSubordinates] = useState<Subordinate[]>([]);
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [personnelCandidates, setPersonnelCandidates] = useState<Subordinate[]>([]);
  const [petitionEvents, setPetitionEvents] = useState<PetitionEvent[]>([]);
  const [feedback, setFeedback] = useState('');
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [marketActionLoading, setMarketActionLoading] = useState<string | null>(null);
  const [onekeyLoading, setOnekeyLoading] = useState(false);
  // 个人档案弹窗
  const [profileSub, setProfileSub] = useState<Subordinate | null>(null);
  const [profileResumes, setProfileResumes] = useState<SubResume[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);

  const deptKey = type as DeptKey;
  const cfg = DEPT_CONFIG[deptKey];
  const rankLevel = save?.rankLevel ?? 1;
  const deptDisplayName = getDeptNameByRank(deptKey, rankLevel);
  const staffQuota = getDeptStaffQuota(rankLevel);
  // 人事局额外追加人事考试/培训行动（已迁移到 personnel 部门）
  const policies = DEPT_POLICIES[deptKey] ?? [];

  // 县长（5级）以上可以任命，以下为申请配合模式
  const canAppoint = (save?.rankLevel ?? 0) >= 5;

  useFocusEffect(
    useCallback(() => {
      if (!save) return;
      getSubordinates(save.id).then(allSubs => {
        const deptSubs = allSubs.filter(s => s.appointedDept === deptKey);
        setSubordinates(deptSubs);

        // 若该部门有正职但科员不足2人，自动补充
        const hasHead = deptSubs.some(s => s.deptPosition === 'head');
        const staffCount = deptSubs.filter(s => s.deptPosition === 'staff').length;
        if (hasHead && staffCount < 2) {
          fillDeptStaff(save.id, save.userId, deptKey).then(added => {
            if (added > 0) {
              getSubordinates(save.id).then(fresh => {
                setSubordinates(fresh.filter(s => s.appointedDept === deptKey));
              });
            }
          });
        }
      });
      if (deptKey === 'invest' || deptKey === 'market') {
        getEnterprises(save.id).then(setEnterprises);
      }
      if (deptKey === 'personnel') {
        getPersonnelCandidates(save.id).then(setPersonnelCandidates);
      }
      if (deptKey === 'petition') {
        getPetitionEvents(save.id).then(setPetitionEvents);
      }
    }, [save, deptKey])
  );

  const handleExecutePolicy = async (action: PolicyAction) => {
    if (!save) return;
    // 以 deptKey_actionId 为 key 查冷却截止天
    const cooldownKey = `${deptKey}_${action.id}`;
    const cooldownEndDay = save.deptPolicyCooldowns[cooldownKey] ?? 0;
    if (save.gameDays < cooldownEndDay) {
      setFeedback(`本次操作冷却中，还需 ${cooldownEndDay - save.gameDays} 天`);
      setTimeout(() => setFeedback(''), 2000);
      return;
    }

    // 执行效果
    const updates: Parameters<typeof updateGameSave>[0] = {};
    const fx = action.effect;
    if (fx.cityGdp) updates.cityGdp = Math.max(0, Math.min(100, save.cityGdp + fx.cityGdp));
    if (fx.cityLivelihood) updates.cityLivelihood = Math.max(0, Math.min(100, save.cityLivelihood + fx.cityLivelihood));
    if (fx.cityEcology) updates.cityEcology = Math.max(0, Math.min(100, save.cityEcology + fx.cityEcology));
    if (fx.cityBusiness) updates.cityBusiness = Math.max(0, Math.min(100, save.cityBusiness + fx.cityBusiness));
    if (fx.securityIndex) updates.securityIndex = Math.max(0, Math.min(100, save.securityIndex + fx.securityIndex));
    if (fx.policeForce) updates.policeForce = Math.max(0, save.policeForce + fx.policeForce);
    if (fx.meritPoints) updates.meritPoints = save.meritPoints + (fx.meritPoints ?? 0);
    if (fx.bossFavor) updates.bossFavor = Math.max(0, Math.min(100, save.bossFavor + (fx.bossFavor ?? 0)));
    if (fx.moralValue) updates.moralValue = Math.max(0, Math.min(100, save.moralValue + (fx.moralValue ?? 0)));
    // 资金与税收变化
    if (fx.fundBalance) updates.fundBalance = Math.max(0, (save.fundBalance ?? 0) + fx.fundBalance);
    if (fx.taxRevenue) updates.taxRevenue = Math.max(0, (save.taxRevenue ?? 0) + fx.taxRevenue);

    // 持久化冷却：写入截止游戏天（即使 cooldownDays=0 也写入，防止重复执行）
    updates.deptPolicyCooldowns = {
      ...save.deptPolicyCooldowns,
      [cooldownKey]: save.gameDays + Math.max(action.cooldownDays, 1),
    };

    const isFundIncrease = (fx.fundBalance ?? 0) > 0;
    const isFundDecrease = (fx.fundBalance ?? 0) < 0;
    const fundMsg = isFundIncrease ? `  💰 资金+${fx.fundBalance}万` : isFundDecrease ? `  💸 支出${Math.abs(fx.fundBalance!)}万` : '';

    await updateGameSave(updates);
    setFeedback(`✓ 【${action.title}】执行成功，相关指数已更新${fundMsg}`);

    // 招商局行动：立即生成企业入驻（inv1/inv2 属于招商推介行动）
    if (deptKey === 'invest' && (action.id === 'inv1' || action.id === 'inv2' || action.id === 'inv3')) {
      const headAbility = deptChief?.ability ?? 50;
      const newEnts = await generateImmediateEnterprises(save.id, save.userId, save.gameDays, headAbility, 1);
      if (newEnts.length > 0) {
        setEnterprises(prev => [...newEnts, ...prev]);
        const names = newEnts.map(e => e.name).join('、');
        setFeedback(`✓ 【${action.title}】执行成功！🎉 ${names} 等 ${newEnts.length} 家企业成功入驻，每月税收 +${newEnts.reduce((s, e) => s + e.taxContribution, 0)}万`);
      }
    }

    setTimeout(() => setFeedback(''), 4000);
  };

  // 一键实施推荐行动：执行第一个未冷却的施政行动
  const handleOnekeyAction = async () => {
    if (!save || onekeyLoading) return;
    const gameDays = save.gameDays;
    const available = policies.find(a => {
      const endDay = save.deptPolicyCooldowns[`${deptKey}_${a.id}`] ?? 0;
      return gameDays >= endDay;
    });
    if (!available) {
      setFeedback('所有行动本轮已执行，请等待冷却');
      setTimeout(() => setFeedback(''), 2500);
      return;
    }
    setOnekeyLoading(true);
    await handleExecutePolicy(available);
    setOnekeyLoading(false);
  };

  // 组织部：一键考评所有在岗下属
  const handleOrgBatchAssess = async () => {
    if (!save || onekeyLoading) return;
    setOnekeyLoading(true);
    const count = await batchAssessSubordinates(save.id, save.gameDays);
    setOnekeyLoading(false);
    setFeedback(count > 0 ? `✅ 一键考评完成，共考评 ${count} 名在岗人员，政绩+${count * 2}` : '暂无在岗下属可考评');
    setTimeout(() => setFeedback(''), 4000);
  };

  // 打开个人档案弹窗
  const openProfile = async (sub: Subordinate) => {
    setProfileSub(sub);
    setProfileLoading(true);
    const resumes = await getSubResumes(sub.id);
    setProfileResumes(resumes);
    setProfileLoading(false);
  };

  const handlePromote = async (sub: Subordinate) => {
    if (!save) return;
    const maxSubLevel = Math.min(12, save.rankLevel);
    if (sub.subLevel >= maxSubLevel) {
      setFeedback(`⚠️ ${sub.name} 级别已达主角级别上限，无法继续晋升`);
      setTimeout(() => setFeedback(''), 3000);
      return;
    }
    setPromotingId(sub.id);
    const deptName = DEPT_CONFIG[sub.appointedDept ?? 'personnel']?.name ?? '人事局';
    await promoteSubordinate(save.id, sub.id, sub.subLevel, save.gameDays, sub.position, deptName);
    setPersonnelCandidates(prev => prev.map(s => s.id === sub.id ? { ...s, subLevel: Math.min(12, s.subLevel + 1) } : s));
    setFeedback(`✓ ${sub.name} 晋升为 ${SUB_LEVEL_NAMES[Math.min(12, sub.subLevel + 1)]}，履历已更新`);
    setTimeout(() => setFeedback(''), 3000);
    setPromotingId(null);
  };

  if (!save || !cfg) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F7F5' }}>
        <Text style={{ color: '#888' }}>{!cfg ? '部门不存在' : '加载中…'}</Text>
      </View>
    );
  }

  // 该部门指定的下属（正职/副职/科员）
  const deptChief  = subordinates.find(s => s.isAppointed && s.deptPosition === 'head');
  const deptDeputy = subordinates.find(s => s.isAppointed && s.deptPosition === 'deputy');
  const deptStaff  = subordinates.filter(s => s.isAppointed && s.deptPosition === 'staff');

  return (
    <View style={{ flex: 1, backgroundColor: '#F7F7F5' }}>
      <StatusBar style="light" backgroundColor="#1D3B5E" />

      {/* ── 个人档案弹窗 ── */}
      <Modal visible={!!profileSub} transparent animationType="slide" onRequestClose={() => setProfileSub(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#0D1520', maxHeight: '85%', borderTopWidth: 2, borderTopColor: '#2D4A6B' }}>
            {/* 弹窗头部 */}
            <View style={{ backgroundColor: '#1D2D44', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 52, height: 52, backgroundColor: '#0D1520', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#2D5A8E' }}>
                <Text style={{ fontSize: 28 }}>{profileSub ? getSubAvatarEmoji(profileSub.avatarId ?? 0, profileSub.gender ?? '男') : '👤'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#F0E8C8', fontSize: 16, fontWeight: '700' }}>{profileSub?.name ?? ''}</Text>
                <Text style={{ color: '#8AAAC8', fontSize: 11, marginTop: 2 }}>
                  {profileSub?.position ?? ''} · {profileSub?.gender ?? ''} · {SUB_LEVEL_NAMES[profileSub?.subLevel ?? 1]}
                </Text>
              </View>
              <Pressable onPress={() => setProfileSub(null)} style={{ padding: 6 }}>
                <Text style={{ color: '#8AAAC8', fontSize: 22 }}>✕</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }}>
              {/* 基本信息卡 */}
              <View style={{ backgroundColor: '#1A2535', borderWidth: 1, borderColor: '#2D3A50', padding: 12, gap: 6 }}>
                <Text style={{ color: '#C8A832', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 4 }}>📋 基本信息</Text>
                {[
                  { label: '出生年份', value: profileSub?.birthYear ? `${profileSub.birthYear}年` : '—' },
                  { label: '籍　　贯', value: profileSub?.hometown ?? '—' },
                  { label: '毕业院校', value: profileSub?.university ?? '—' },
                  { label: '所学专业', value: profileSub?.major ?? '—' },
                  { label: '当前职级', value: SUB_LEVEL_NAMES[profileSub?.subLevel ?? 1] },
                  { label: '能力指数', value: String(profileSub?.ability ?? 0) },
                  { label: '忠诚指数', value: String(profileSub?.loyalty ?? 0) },
                  { label: '廉洁指数', value: String(profileSub?.integrity ?? 0) },
                ].map(row => (
                  <View key={row.label} style={{ flexDirection: 'row', gap: 8, paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: '#1E2D3D' }}>
                    <Text style={{ color: '#6A8AAA', fontSize: 11, width: 72 }}>{row.label}</Text>
                    <Text style={{ color: '#D0D8E8', fontSize: 11, flex: 1 }}>{row.value}</Text>
                  </View>
                ))}
              </View>

              {/* 仕途历程 */}
              <View style={{ backgroundColor: '#1A2535', borderWidth: 1, borderColor: '#2D3A50', padding: 12 }}>
                <Text style={{ color: '#C8A832', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>🗂️ 仕途历程</Text>
                {profileLoading ? (
                  <ActivityIndicator color="#5588CC" style={{ marginVertical: 16 }} />
                ) : profileResumes.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                    <Text style={{ color: '#5A7A9A', fontSize: 12 }}>暂无仕途记录</Text>
                  </View>
                ) : (
                  <View style={{ gap: 0 }}>
                    {profileResumes.map((r, idx) => (
                      <View key={r.id} style={{ flexDirection: 'row', gap: 10 }}>
                        {/* 时间轴线 */}
                        <View style={{ alignItems: 'center', width: 20 }}>
                          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: idx === 0 ? '#C8A832' : '#3A5A7A', marginTop: 3 }} />
                          {idx < profileResumes.length - 1 && <View style={{ width: 2, flex: 1, backgroundColor: '#2D3A50', marginTop: 2 }} />}
                        </View>
                        {/* 内容 */}
                        <View style={{ flex: 1, paddingBottom: 12 }}>
                          <Text style={{ color: '#F0E8C8', fontSize: 12, fontWeight: '600' }}>{r.position}</Text>
                          <Text style={{ color: '#6A8AAA', fontSize: 10, marginTop: 2 }}>{r.deptName}</Text>
                          <Text style={{ color: '#4A6A8A', fontSize: 9, marginTop: 1 }}>
                            {gameDaysToDate(r.startDay)}{r.endDay ? ` — ${gameDaysToDate(r.endDay)}` : ' — 至今'}
                            {r.note ? `  · ${r.note}` : ''}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <View style={{ height: 16 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#1D3B5E', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <Text style={{ fontSize: 24, marginRight: 8 }}>{cfg.icon}</Text>
          <View>
            <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>{cfg.fullName}</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>{deptDisplayName}</Text>
          </View>
        </View>
      </View>

      {feedback ? (
        <View style={{ backgroundColor: '#e8f5e9', borderBottomWidth: 1, borderBottomColor: '#c8e6c9', padding: 10 }}>
          <Text style={{ color: '#2a7a3b', fontSize: 12, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 14, gap: 10 }} showsVerticalScrollIndicator={false}>

        {/* 部门简介 */}
        <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
          <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2, marginBottom: 8 }}>部门职能</Text>
          <Text style={{ fontSize: 13, color: '#444', lineHeight: 20, marginBottom: 10 }}>{cfg.desc}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {cfg.functions.map((f, i) => (
              <View key={i} style={{ backgroundColor: '#F0F4F8', borderWidth: 1, borderColor: '#D1D1D1', paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 11, color: '#1D3B5E' }}>{f}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 当前负责人 / 申请配合 */}
        <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
          <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>
            {canAppoint ? '部门负责人' : '协作关系'}
          </Text>

          {canAppoint ? (
            // 县长及以上：显示已任命负责人或提示任命
            deptChief ? (
              <View style={{ gap: 8 }}>
                <Pressable
                  onPress={() => void openProfile(deptChief)}
                  android_ripple={{ color: 'rgba(29,59,94,0.08)' }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                >
                  <View style={{ width: 44, height: 44, backgroundColor: '#F0F4F8', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D1D1D1' }}>
                    <Text style={{ fontSize: 24 }}>{getSubAvatarEmoji(deptChief.avatarId ?? 0, deptChief.gender ?? '男')}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#222' }}>{deptChief.name}</Text>
                    <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{cfg.headTitle} · {deptChief.gender}</Text>
                    <Text style={{ fontSize: 10, color: '#1D3B5E', marginTop: 1 }}>点击查看档案 →</Text>
                  </View>
                  <View style={{ gap: 4 }}>
                    <Text style={{ fontSize: 10, color: '#555' }}>能力 {deptChief.ability}</Text>
                    <Text style={{ fontSize: 10, color: '#555' }}>廉洁 {deptChief.integrity}</Text>
                  </View>
                </Pressable>
                {/* 自动行动提示 */}
                <View style={{ backgroundColor: '#F0F7E8', borderWidth: 1, borderColor: '#C8E6C9', padding: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 11 }}>⚙️</Text>
                  <Text style={{ fontSize: 11, color: '#2a7a3b', flex: 1 }}>
                    每月自动执行【{cfg.autoActionName}】，效果随能力提升
                  </Text>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: '#C82829' }}>⚠️ 当前{cfg.headTitle}职位空缺</Text>
                <Pressable onPress={() => router.push('/(app)/subordinates')} style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#1D3B5E' }}>
                  <Text style={{ color: '#fff', fontSize: 11 }}>前往任命</Text>
                </Pressable>
              </View>
            )
          ) : (
            // 县长以下：申请配合模式
            <View style={{ gap: 10 }}>
              <View style={{ backgroundColor: '#FFF9E6', borderWidth: 1, borderColor: '#F0C050', padding: 10 }}>
                <Text style={{ fontSize: 11, color: '#7A5C00', lineHeight: 18 }}>
                  您当前级别不具备直接任命{cfg.headTitle}的权力。{'\n'}
                  可通过【申请配合】方式请求该部门给予工作协助，获得相关指数加成。
                </Text>
              </View>
              <Pressable
                onPress={async () => {
                  if (!save) return;
                  const bonus = 4 + (save.rankLevel * 1);
                  await updateGameSave({
                    meritPoints: save.meritPoints + 8,
                    cityGdp: Math.min(100, save.cityGdp + (deptKey === 'ndrc' || deptKey === 'finance' || deptKey === 'agriculture' ? bonus * 0.5 : 0)),
                    cityLivelihood: Math.min(100, save.cityLivelihood + (deptKey === 'education' || deptKey === 'health' || deptKey === 'police' ? bonus * 0.6 : 0)),
                    cityEcology: Math.min(100, save.cityEcology + (deptKey === 'ecology' ? bonus : 0)),
                    cityBusiness: Math.min(100, save.cityBusiness + (deptKey === 'market' ? bonus : 0)),
                    securityIndex: Math.min(100, save.securityIndex + (deptKey === 'police' ? bonus * 0.5 : 0)),
                  });
                  setFeedback(`✓ 已向${deptDisplayName}申请配合，获得协助加成`);
                  setTimeout(() => setFeedback(''), 3000);
                }}
                style={{ backgroundColor: '#1D3B5E', paddingVertical: 10, alignItems: 'center' }}
                android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 1 }}>
                  申请配合
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* 部门班子成员（副职+科员） */}
        {canAppoint && (deptDeputy || deptStaff.length > 0) && (
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2 }}>部门班子成员</Text>
              <Text style={{ fontSize: 10, color: '#888' }}>在编 {subordinates.filter(s => s.isAppointed).length}/{staffQuota} 人</Text>
            </View>
            {/* 副职 */}
            {deptDeputy && (
              <Pressable
                onPress={() => void openProfile(deptDeputy)}
                android_ripple={{ color: 'rgba(29,59,94,0.06)' }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}
              >
                <View style={{ width: 36, height: 36, backgroundColor: '#F0F4F8', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D1D1D1' }}>
                  <Text style={{ fontSize: 20 }}>{getSubAvatarEmoji(deptDeputy.avatarId ?? 0, deptDeputy.gender ?? '男')}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#333' }}>{deptDeputy.name}</Text>
                  <Text style={{ fontSize: 10, color: '#888', marginTop: 1 }}>{cfg.deputyTitle} · {deptDeputy.gender}</Text>
                  <Text style={{ fontSize: 9, color: '#1D3B5E', marginTop: 1 }}>查看档案 →</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={{ fontSize: 10, color: '#555' }}>能力 {deptDeputy.ability}</Text>
                  <Text style={{ fontSize: 10, color: '#555' }}>廉洁 {deptDeputy.integrity}</Text>
                </View>
              </Pressable>
            )}
            {/* 科员列表 */}
            {deptStaff.map((s, idx) => (
              <Pressable
                key={s.id}
                onPress={() => void openProfile(s)}
                android_ripple={{ color: 'rgba(29,59,94,0.06)' }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 10,
                  paddingVertical: 6,
                  borderBottomWidth: idx < deptStaff.length - 1 ? 1 : 0,
                  borderBottomColor: '#F0F0F0',
                }}
              >
                <View style={{ width: 32, height: 32, backgroundColor: '#F7F7F5', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E0E0E0' }}>
                  <Text style={{ fontSize: 18 }}>{getSubAvatarEmoji(s.avatarId ?? 0, s.gender ?? '男')}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#444' }}>{s.name}</Text>
                  <Text style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}>{s.position} · {s.gender}</Text>
                </View>
                <Text style={{ fontSize: 10, color: '#888' }}>能力 {s.ability}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => router.push('/(app)/subordinates')}
              style={{ marginTop: 8, paddingVertical: 7, alignItems: 'center', borderWidth: 1, borderColor: '#1D3B5E' }}
            >
              <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '600' }}>管理人员 →</Text>
            </Pressable>
          </View>
        )}

        {/* 当前影响 */}
        {save && (
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>关联指数</Text>
            {deptKey === 'police' && (
              <>
                <StatBar label="警力储备" value={Math.min(100, save.policeForce)} color="#1D3B5E" />
                <StatBar label="治安指数" value={save.securityIndex} color="#1D3B5E" />
              </>
            )}
            {(deptKey === 'ndrc' || deptKey === 'finance' || deptKey === 'urban' || deptKey === 'agriculture') && (
              <>
                <StatBar label="经济发展" value={save.cityGdp} color="#1D3B5E" />
                <StatBar label="民生满意" value={save.cityLivelihood} color="#1D3B5E" />
              </>
            )}
            {(deptKey === 'education' || deptKey === 'health') && (
              <StatBar label="民生满意度" value={save.cityLivelihood} color="#1D3B5E" />
            )}
            {deptKey === 'ecology' && (
              <StatBar label="生态环境" value={save.cityEcology} color="#2a7a3b" />
            )}
            {deptKey === 'market' && (
              <>
                <StatBar label="营商环境" value={save.cityBusiness} color="#1D3B5E" />
                <StatBar label="民生满意" value={save.cityLivelihood} color="#1D3B5E" />
              </>
            )}
            {deptKey === 'petition' && (
              <>
                <StatBar label="上司满意度" value={save.bossFavor} color="#1D3B5E" />
                <StatBar label="民生满意" value={save.cityLivelihood} color="#1D3B5E" />
              </>
            )}
          </View>
        )}

        {/* 施政行动 */}
        <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2 }}>施政行动</Text>
            <Pressable
              onPress={() => void handleOnekeyAction()}
              disabled={onekeyLoading || policies.every(a => save.gameDays < (save.deptPolicyCooldowns[`${deptKey}_${a.id}`] ?? 0))}
              style={{ backgroundColor: (onekeyLoading || policies.every(a => save.gameDays < (save.deptPolicyCooldowns[`${deptKey}_${a.id}`] ?? 0))) ? '#ccc' : '#1D2D44', paddingHorizontal: 12, paddingVertical: 6 }}
              android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                {onekeyLoading ? '执行中…' : '⚡ 一键实施推荐行动'}
              </Text>
            </Pressable>
          </View>
          <View style={{ gap: 10 }}>
            {policies.map(action => {
              const cooldownEndDay = save.deptPolicyCooldowns[`${deptKey}_${action.id}`] ?? 0;
              const done = save.gameDays < cooldownEndDay;
              const remainDays = done ? cooldownEndDay - save.gameDays : 0;
              const fundChange = action.effect.fundBalance ?? 0;
              const taxChange = action.effect.taxRevenue ?? 0;
              return (
                <View key={action.id} style={{ borderWidth: 1, borderColor: done ? '#E0E0E0' : '#D1D1D1', padding: 12, backgroundColor: done ? '#FAFAFA' : '#fff' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: done ? '#999' : '#222' }}>{action.title}</Text>
                      {action.tag && (
                        <View style={{ backgroundColor: '#E8F0F8', paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, color: '#1D3B5E', fontWeight: '600' }}>{action.tag}</Text>
                        </View>
                      )}
                    </View>
                    <Pressable
                      onPress={() => handleExecutePolicy(action)}
                      disabled={done}
                      style={{ paddingHorizontal: 14, paddingVertical: 6, backgroundColor: done ? '#E0E0E0' : '#1D3B5E', marginLeft: 8 }}
                    >
                      <Text style={{ fontSize: 11, color: done ? '#aaa' : '#fff', fontWeight: '700' }}>
                        {done ? `冷却${remainDays}天` : '执行'}
                      </Text>
                    </Pressable>
                  </View>
                  <Text style={{ fontSize: 11, color: '#666', lineHeight: 16, marginBottom: 8 }}>{action.desc}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {action.effect.cityGdp !== undefined && <EffectTag label="GDP " value={action.effect.cityGdp} />}
                    {action.effect.cityLivelihood !== undefined && <EffectTag label="民生 " value={action.effect.cityLivelihood} />}
                    {action.effect.cityEcology !== undefined && <EffectTag label="生态 " value={action.effect.cityEcology} />}
                    {action.effect.cityBusiness !== undefined && <EffectTag label="营商 " value={action.effect.cityBusiness} />}
                    {action.effect.securityIndex !== undefined && <EffectTag label="治安 " value={action.effect.securityIndex} />}
                    {action.effect.policeForce !== undefined && <EffectTag label="警力 " value={action.effect.policeForce} />}
                    {action.effect.meritPoints !== undefined && <EffectTag label="政绩 " value={action.effect.meritPoints} />}
                    {action.effect.bossFavor !== undefined && <EffectTag label="上司好感 " value={action.effect.bossFavor} />}
                    {fundChange !== 0 && (
                      <View style={{ backgroundColor: fundChange > 0 ? '#e8f5e9' : '#fff3e0', paddingHorizontal: 7, paddingVertical: 2, marginRight: 5, marginBottom: 4 }}>
                        <Text style={{ fontSize: 10, color: fundChange > 0 ? '#2a7a3b' : '#e65100', fontWeight: '600' }}>
                          {fundChange > 0 ? `💰+${fundChange}万` : `💸${fundChange}万`}
                        </Text>
                      </View>
                    )}
                    {taxChange > 0 && (
                      <View style={{ backgroundColor: '#e8f5e9', paddingHorizontal: 7, paddingVertical: 2, marginRight: 5, marginBottom: 4 }}>
                        <Text style={{ fontSize: 10, color: '#2a7a3b', fontWeight: '600' }}>税收+{taxChange}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
        <View style={{ height: 16 }} />

        {/* ===== 人事局：晋升评审面板 ===== */}
        {deptKey === 'personnel' && (
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2, marginBottom: 12 }}>年度晋升评审</Text>
            {personnelCandidates.length === 0 ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 28, marginBottom: 8 }}>📋</Text>
                <Text style={{ fontSize: 13, color: '#888' }}>暂无符合晋升条件的干部</Text>
                <Text style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>条件：能力≥60，经验≥50，未达最高职级</Text>
              </View>
            ) : (
              personnelCandidates.map(sub => (
                <View key={sub.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', gap: 10 }}>
                  <View style={{ width: 40, height: 40, backgroundColor: '#F0F4F8', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D1D1D1' }}>
                    <Text style={{ fontSize: 22 }}>{getSubAvatarEmoji(sub.avatarId ?? 0, sub.gender ?? '男')}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{sub.name}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 3 }}>
                      <View style={{ backgroundColor: '#e8f0ff', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 10, color: '#1D3B5E' }}>
                          {SUB_LEVEL_NAMES[sub.subLevel]} → {SUB_LEVEL_NAMES[Math.min(12, sub.subLevel + 1)]}
                        </Text>
                      </View>
                      <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 10, color: '#666' }}>能力 {sub.ability}</Text>
                      </View>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => void handlePromote(sub)}
                    disabled={promotingId === sub.id || sub.subLevel >= Math.min(12, save?.rankLevel ?? 12)}
                    style={{ backgroundColor: sub.subLevel >= Math.min(12, save?.rankLevel ?? 12) ? '#ccc' : '#1D3B5E', paddingHorizontal: 14, paddingVertical: 8 }}
                  >
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                      {promotingId === sub.id ? '处理中…' : sub.subLevel >= Math.min(12, save?.rankLevel ?? 12) ? '已达上限' : '批准晋升'}
                    </Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>
        )}

        {/* ===== 招商局：企业名单入口 ===== */}
        {deptKey === 'invest' && (
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2 }}>已引进企业</Text>
              <Pressable
                onPress={() => router.push('/(app)/enterprise-list')}
                style={{ backgroundColor: '#1D3B5E', paddingHorizontal: 12, paddingVertical: 6 }}
              >
                <Text style={{ color: '#fff', fontSize: 11 }}>查看全部 ›</Text>
              </Pressable>
            </View>
            {enterprises.length === 0 ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 28, marginBottom: 8 }}>🏢</Text>
                <Text style={{ fontSize: 13, color: '#888' }}>尚未引进任何企业</Text>
                <Text style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>通过招商行动立即引进企业入驻</Text>
              </View>
            ) : (
              <>
                <View style={{ flexDirection: 'row', backgroundColor: '#F0F4F8', padding: 8, marginBottom: 6 }}>
                  <Text style={{ flex: 2, fontSize: 11, color: '#1D3B5E', fontWeight: '700' }}>企业名称</Text>
                  <Text style={{ flex: 1, fontSize: 11, color: '#1D3B5E', fontWeight: '700', textAlign: 'center' }}>行业</Text>
                  <Text style={{ flex: 1, fontSize: 11, color: '#2a7a3b', fontWeight: '700', textAlign: 'right' }}>月税收</Text>
                </View>
                {enterprises.slice(0, 5).map(ent => (
                  <View key={ent.id} style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' }}>
                    <Text style={{ flex: 2, fontSize: 12, color: '#222' }} numberOfLines={1}>{ent.name}</Text>
                    <Text style={{ flex: 1, fontSize: 11, color: '#666', textAlign: 'center' }}>{ent.industry}</Text>
                    <Text style={{ flex: 1, fontSize: 12, color: '#2a7a3b', fontWeight: '600', textAlign: 'right' }}>{ent.taxContribution}万</Text>
                  </View>
                ))}
                {enterprises.length > 5 && (
                  <Text style={{ fontSize: 11, color: '#999', textAlign: 'center', marginTop: 8 }}>共 {enterprises.length} 家企业，点击查看全部</Text>
                )}
                <View style={{ flexDirection: 'row', backgroundColor: '#FFF8E1', padding: 10, marginTop: 10 }}>
                  <Text style={{ flex: 1, fontSize: 12, color: '#7a5c00' }}>月度总税收（所有企业）</Text>
                  <Text style={{ fontSize: 13, color: '#7a5c00', fontWeight: '700' }}>
                    {enterprises.filter(e => e.status === 'operating').reduce((s, e) => s + e.taxContribution, 0)}万元
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* ===== 税务局：税收概览 ===== */}
        {deptKey === 'tax' && save && (
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2, marginBottom: 12 }}>税收情况概览</Text>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
                <Text style={{ fontSize: 13, color: '#555' }}>当前资金余额</Text>
                <Text style={{ fontSize: 14, color: '#1D3B5E', fontWeight: '700' }}>{save.fundBalance.toFixed(0)} 万元</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
                <Text style={{ fontSize: 13, color: '#555' }}>城市税率</Text>
                <Text style={{ fontSize: 14, color: '#444', fontWeight: '600' }}>{((save.cityTaxRate ?? 0.12) * 100).toFixed(1)}%</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
                <Text style={{ fontSize: 13, color: '#555' }}>本年累计税收</Text>
                <Text style={{ fontSize: 14, color: '#2a7a3b', fontWeight: '700' }}>{save.taxRevenue.toFixed(0)} 万元</Text>
              </View>
              <View style={{ backgroundColor: '#F0F8FF', padding: 10, marginTop: 4 }}>
                <Text style={{ fontSize: 11, color: '#1D3B5E', lineHeight: 18 }}>
                  💡 招商局引进更多企业可提高每月税收入账，税收自动计入城市资金余额。
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ===== 工商局：企业管理面板 ===== */}
        {deptKey === 'market' && save && (
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2 }}>企业监管管理</Text>
              <Pressable
                onPress={() => router.push('/(app)/enterprise-list')}
                style={{ backgroundColor: '#1D3B5E', paddingHorizontal: 10, paddingVertical: 5 }}
              >
                <Text style={{ color: '#fff', fontSize: 11 }}>企业名录 ›</Text>
              </Pressable>
            </View>

            {/* 一键优化营商服务 */}
            <View style={{ backgroundColor: '#F0F8F0', borderWidth: 1, borderColor: '#B8DDB8', padding: 12, marginBottom: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1a5c2a', marginBottom: 4 }}>🌱 优化营商服务环境</Text>
              <Text style={{ fontSize: 11, color: '#3a7a4a', lineHeight: 16, marginBottom: 8 }}>
                为全市所有运营企业提供政策扶持与服务优化，批量提升企业税收贡献 5~10%。
              </Text>
              <Pressable
                onPress={async () => {
                  if (!save || marketActionLoading) return;
                  setMarketActionLoading('optimize');
                  const pct = await optimizeBusinessService(save.id);
                  if (pct > 0) {
                    getEnterprises(save.id).then(setEnterprises);
                    setFeedback(`✓ 营商服务优化完成！全市企业税收贡献提升 ${pct}%`);
                  } else {
                    setFeedback('暂无可优化的运营企业');
                  }
                  setMarketActionLoading(null);
                  setTimeout(() => setFeedback(''), 3000);
                }}
                disabled={!!marketActionLoading}
                style={{ backgroundColor: marketActionLoading === 'optimize' ? '#aaa' : '#2a7a3b', paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'flex-start' }}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                  {marketActionLoading === 'optimize' ? '处理中…' : '批量优化服务'}
                </Text>
              </Pressable>
            </View>

            {/* 逐企业操作 */}
            {enterprises.length === 0 ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <Text style={{ fontSize: 26, marginBottom: 6 }}>🏢</Text>
                <Text style={{ fontSize: 13, color: '#888' }}>暂无企业数据</Text>
                <Text style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>由招商局引进企业后可在此管理</Text>
              </View>
            ) : (
              <>
                <Text style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>
                  逐企业操作（共 {enterprises.filter(e => e.status === 'operating').length} 家运营中）
                </Text>
                {enterprises.filter(e => e.status === 'operating').slice(0, 8).map(ent => (
                  <View key={ent.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#222' }} numberOfLines={1}>{ent.name}</Text>
                      <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{ent.industry} · {ent.scale === 'large' ? '大型' : ent.scale === 'medium' ? '中型' : '小型'} · 月税 {ent.taxContribution}万</Text>
                    </View>
                    {/* 专项检查 */}
                    <Pressable
                      onPress={async () => {
                        if (marketActionLoading) return;
                        setMarketActionLoading(`inspect_${ent.id}`);
                        const result = await inspectEnterprise(ent.id);
                        if (result) {
                          getEnterprises(save.id).then(setEnterprises);
                          const sign = result.delta >= 0 ? '+' : '';
                          setFeedback(`📋 ${ent.name} 专项检查完成，税收变化 ${sign}${result.delta}万`);
                        }
                        setMarketActionLoading(null);
                        setTimeout(() => setFeedback(''), 3000);
                      }}
                      disabled={!!marketActionLoading}
                      style={{ backgroundColor: '#1D3B5E', paddingHorizontal: 8, paddingVertical: 5 }}
                    >
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>检查</Text>
                    </Pressable>
                    {/* 违规整改 */}
                    <Pressable
                      onPress={async () => {
                        if (marketActionLoading) return;
                        setMarketActionLoading(`regulate_${ent.id}`);
                        await regulateEnterprise(ent.id);
                        getEnterprises(save.id).then(setEnterprises);
                        setFeedback(`⚠️ ${ent.name} 已责令整改关停`);
                        setMarketActionLoading(null);
                        setTimeout(() => setFeedback(''), 3000);
                      }}
                      disabled={!!marketActionLoading}
                      style={{ backgroundColor: '#c0392b', paddingHorizontal: 8, paddingVertical: 5 }}
                    >
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>整改</Text>
                    </Pressable>
                  </View>
                ))}
                {enterprises.filter(e => e.status === 'operating').length > 8 && (
                  <Pressable onPress={() => router.push('/(app)/enterprise-list')}>
                    <Text style={{ fontSize: 11, color: '#1D3B5E', textAlign: 'center', marginTop: 8 }}>查看全部企业 ›</Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        )}

        {/* ===== 信访办：信访事件面板 ===== */}
        {deptKey === 'petition' && save && (
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2, marginBottom: 12 }}>
              📮 信访事件处理
            </Text>

            {/* 统计概览 */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <View style={{ flex: 1, backgroundColor: '#FFF3F3', borderWidth: 1, borderColor: '#FFCCCC', padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#c0392b' }}>
                  {petitionEvents.filter(e => e.eventType === 'complaint' && !e.isProcessed).length}
                </Text>
                <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>待处理投诉</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#F0FFF0', borderWidth: 1, borderColor: '#B8DDB8', padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#2a7a3b' }}>
                  {petitionEvents.filter(e => e.eventType === 'praise' && !e.isProcessed).length}
                </Text>
                <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>待阅示好评</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#F0F4F8', borderWidth: 1, borderColor: '#D1D1D1', padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#1D3B5E' }}>
                  {petitionEvents.filter(e => e.isProcessed).length}
                </Text>
                <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>已处理</Text>
              </View>
            </View>

            {petitionEvents.length === 0 ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>📬</Text>
                <Text style={{ fontSize: 13, color: '#888' }}>暂无信访事件</Text>
                <Text style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>每月约有30%概率产生信访事件</Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {petitionEvents.map(event => {
                  const isComplaint = event.eventType === 'complaint';
                  const processed = event.isProcessed;
                  return (
                    <View
                      key={event.id}
                      style={{
                        borderWidth: 1,
                        borderColor: processed ? '#E0E0E0' : isComplaint ? '#FFCCCC' : '#B8DDB8',
                        backgroundColor: processed ? '#FAFAFA' : isComplaint ? '#FFF8F8' : '#F8FFF8',
                        padding: 12,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <View style={{
                              paddingHorizontal: 6, paddingVertical: 2,
                              backgroundColor: isComplaint ? '#c0392b' : '#2a7a3b',
                            }}>
                              <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>
                                {isComplaint ? '投诉' : '表扬'}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: processed ? '#999' : '#222' }} numberOfLines={1}>
                              {event.title}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 11, color: '#666', lineHeight: 16 }} numberOfLines={3}>
                            {event.content}
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                            <Text style={{ fontSize: 10, color: isComplaint ? '#c0392b' : '#2a7a3b' }}>
                              上司好感 {event.bosFavorDelta > 0 ? '+' : ''}{event.bosFavorDelta}
                            </Text>
                            <Text style={{ fontSize: 10, color: isComplaint ? '#c0392b' : '#2a7a3b' }}>
                              政绩 {event.meritDelta > 0 ? '+' : ''}{event.meritDelta}
                            </Text>
                          </View>
                        </View>
                        {!processed && (
                          <Pressable
                            onPress={async () => {
                              const result = await processPetitionEvent(event.id);
                              if (result && save) {
                                setPetitionEvents(prev => prev.map(e => e.id === event.id ? { ...e, isProcessed: true } : e));
                                const updates: Parameters<typeof updateGameSave>[0] = {
                                  bossFavor: Math.max(0, Math.min(100, save.bossFavor + result.bosFavorDelta)),
                                  meritPoints: save.meritPoints + result.meritDelta,
                                };
                                await updateGameSave(updates);
                                const sign = result.meritDelta >= 0 ? '+' : '';
                                setFeedback(`✓ 已处理 "${event.title}"，政绩 ${sign}${result.meritDelta}，上司好感 ${result.bosFavorDelta > 0 ? '+' : ''}${result.bosFavorDelta}`);
                                setTimeout(() => setFeedback(''), 3500);
                              }
                            }}
                            style={{ backgroundColor: '#1D3B5E', paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center' }}
                          >
                            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                              {isComplaint ? '处理' : '阅示'}
                            </Text>
                          </Pressable>
                        )}
                        {processed && (
                          <View style={{ backgroundColor: '#E0E0E0', paddingHorizontal: 10, paddingVertical: 8, justifyContent: 'center' }}>
                            <Text style={{ color: '#aaa', fontSize: 11 }}>已完成</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            <View style={{ backgroundColor: '#FFF8E1', padding: 10, marginTop: 12 }}>
              <Text style={{ fontSize: 11, color: '#7a5c00', lineHeight: 17 }}>
                💡 信访事件每月约30%概率自动产生。及时处理可获政绩加成，投诉若不处理将持续消耗上司满意度。
              </Text>
            </View>
          </View>
        )}

        {/* ===== 组织部：一键考评 + 正职任命面板 ===== */}
        {deptKey === 'organization' && save && (
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2, marginBottom: 12 }}>干部考评与任命</Text>

            {/* 一键考评按钮 */}
            <Pressable
              onPress={() => void handleOrgBatchAssess()}
              disabled={onekeyLoading}
              style={{ backgroundColor: onekeyLoading ? '#ccc' : '#C82829', padding: 13, alignItems: 'center', marginBottom: 14 }}
              android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                {onekeyLoading ? '考评中…' : '📋 一键考评所有在岗干部'}
              </Text>
              <Text style={{ color: '#ffcdd2', fontSize: 10, marginTop: 3 }}>
                对所有在岗下属实施综合考核，能力/忠诚/经验随机浮动
              </Text>
            </Pressable>

            {/* 部门正职任命状态 */}
            <Text style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>本部门任职情况</Text>
            {subordinates.length === 0 ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <Text style={{ fontSize: 28, marginBottom: 6 }}>🏛️</Text>
                <Text style={{ fontSize: 13, color: '#888' }}>暂无人员任职组织部</Text>
                <Text style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>请在下属管理中任命组织部正职</Text>
              </View>
            ) : (
              subordinates.map(sub => {
                const posLabel = sub.deptPosition === 'head' ? '部长（正职）' : sub.deptPosition === 'deputy' ? '副部长（副职）' : '科员';
                const tagColor = sub.deptPosition === 'head' ? '#C82829' : sub.deptPosition === 'deputy' ? '#1D2D44' : '#888';
                return (
                  <View key={sub.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', gap: 10 }}>
                    <View style={{ width: 40, height: 40, backgroundColor: '#F0F4F8', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D1D1D1' }}>
                      <Text style={{ fontSize: 22 }}>{getSubAvatarEmoji(sub.avatarId ?? 0, sub.gender ?? '男')}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{sub.name}</Text>
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 3 }}>
                        <View style={{ backgroundColor: tagColor + '22', borderWidth: 1, borderColor: tagColor, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, color: tagColor, fontWeight: '700' }}>{posLabel}</Text>
                        </View>
                        <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 10, color: '#666' }}>能力 {sub.ability}</Text>
                        </View>
                        <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 10, color: '#666' }}>忠诚 {sub.loyalty}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })
            )}

            <View style={{ backgroundColor: '#EEF2F7', padding: 10, marginTop: 12 }}>
              <Text style={{ fontSize: 11, color: '#1D2D44', lineHeight: 17 }}>
                💡 组织部负责全市干部考评与任用工作。一键考评将对所有在岗下属进行综合测评，影响其能力、忠诚与经验值。正职任命请在「下属管理」页面操作。
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}
```

<a id="srcappappdisciplineinspectiontsx"></a>
## `src/app/(app)/discipline-inspection.tsx`

```tsx
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
```

<a id="srcappappdisciplinerisktsx"></a>
## `src/app/(app)/discipline-risk.tsx`

```tsx
// 纪检风云页面：风险档案仪表盘 + 举报线索 + 纪检动态 + 案发档案
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getRankTheme } from '@/lib/rankTheme';
import { getConfigsByCategory } from '@/lib/gameplayConfig';
import type { GameplayCategory } from '@/types/game';

const TABS: { key: GameplayCategory; label: string }[] = [
  { key: 'clue_source', label: '举报线索' },
  { key: 'investigation_stage', label: '调查阶段' },
];

function riskLevel(risk: number): { label: string; color: string } {
  if (risk >= 85) return { label: '红色', color: '#C82829' };
  if (risk >= 70) return { label: '高危', color: '#D2691E' };
  if (risk >= 50) return { label: '预警', color: '#E8920C' };
  if (risk >= 30) return { label: '关注', color: '#C9A227' };
  return { label: '安全', color: '#2a7a3b' };
}

export default function DisciplineRiskScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save } = useGame();
  const theme = getRankTheme(save?.rankLevel ?? 1);
  const [activeTab, setActiveTab] = useState<GameplayCategory>('clue_source');

  const risk = save?.riskValue ?? 0;
  const clue = save?.clueLevel ?? 0;
  const counter = save?.counterIntel ?? 10;
  const illegal = save?.illegalWealth ?? 0;
  const rl = riskLevel(risk);

  const configs = useMemo(() => getConfigsByCategory(activeTab), [activeTab]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <StatusBar style="light" />
      <View style={{ backgroundColor: theme.headerBg, paddingTop: insets.top, paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: theme.accentSub }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable cssInterop={false} onPress={() => router.back()} hitSlop={8}>
            <Text style={{ color: theme.headerText, fontSize: 22 }}>←</Text>
          </Pressable>
          <Text style={{ color: theme.headerText, fontSize: 16, fontWeight: '700', letterSpacing: 2 }}>纪检风云</Text>
        </View>
        <Text style={{ color: theme.headerSub, fontSize: 11, marginTop: 4 }}>风险档案 · 举报线索 · 调查阶段</Text>
      </View>

      {/* 风险仪表盘 */}
      <View style={{ backgroundColor: theme.cardBg, margin: 12, padding: 14, borderWidth: 1, borderColor: theme.cardBorder, borderCurve: 'continuous' }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
          <Text style={{ color: rl.color, fontSize: 40, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{risk}</Text>
          <View style={{ marginBottom: 6 }}>
            <Text style={{ color: theme.mutedText, fontSize: 10 }}>贪腐风险值</Text>
            <View style={{ borderWidth: 1, borderColor: rl.color, paddingHorizontal: 6, marginTop: 2 }}>
              <Text style={{ color: rl.color, fontSize: 10, fontWeight: '700' }}>{rl.label}</Text>
            </View>
          </View>
        </View>
        {/* 风险进度条 */}
        <View style={{ height: 6, backgroundColor: theme.progressBg, marginTop: 8 }}>
          <View style={{ height: 6, width: `${Math.min(100, risk)}%`, backgroundColor: rl.color }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
          <Stat label="线索完整度" value={`${clue}`} theme={theme} />
          <Stat label="反侦察力" value={`${counter}`} theme={theme} />
          <Stat label="涉案金额" value={formatMoney(illegal)} theme={theme} />
        </View>
      </View>

      {/* Tab 分页 */}
      <View style={{ flexDirection: 'row', backgroundColor: theme.sectionHeaderBg, borderBottomWidth: 1, borderBottomColor: theme.cardBorder }}>
        {TABS.map((t) => {
          const on = t.key === activeTab;
          return (
            <Pressable key={t.key} cssInterop={false} onPress={() => setActiveTab(t.key)} style={{ flex: 1, paddingVertical: 9, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: on ? theme.accent : 'transparent', backgroundColor: on ? theme.accentBg : 'transparent' }}>
              <Text style={{ color: on ? theme.accent : theme.mutedText, fontSize: 11, fontWeight: on ? '700' : '400' }}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {configs.map((c) => (
          <View key={c.id} style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, padding: 12, borderCurve: 'continuous' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 20 }}>{c.icon}</Text>
              <Text style={{ color: theme.valueText, fontSize: 13, fontWeight: '700' }}>{c.name}</Text>
            </View>
            <Text style={{ color: theme.mutedText, fontSize: 10, marginTop: 4 }}>{c.params.desc}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
              {c.params.clueValue !== undefined && <Tag label="线索贡献" value={`+${c.params.clueValue}`} theme={theme} danger />}
              {c.params.suppressCost && <Tag label="压盖代价" value={c.params.suppressCost} theme={theme} />}
              {c.params.stageThreshold !== undefined && c.params.stageThreshold > 0 && <Tag label="触发阈值" value={`风险≥${c.params.stageThreshold}`} theme={theme} />}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof getRankTheme> }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: theme.mutedText, fontSize: 9 }}>{label}</Text>
      <Text style={{ color: theme.valueText, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
}

function Tag({ label, value, theme, danger }: { label: string; value: string; theme: ReturnType<typeof getRankTheme>; danger?: boolean }) {
  const color = danger ? theme.accent : theme.mutedText;
  return (
    <View style={{ borderWidth: 1, borderColor: color, paddingHorizontal: 5, paddingVertical: 1 }}>
      <Text style={{ fontSize: 9, color }}>{label} {value}</Text>
    </View>
  );
}

function formatMoney(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(n % 10000 === 0 ? 0 : 1)}万`;
  return `${n.toLocaleString()}元`;
}
```

<a id="srcappappentercodetsx"></a>
## `src/app/(app)/enter-code.tsx`

```tsx
// 输入测试码页 — 强制门禁（深色政务风，配色参照 register.tsx）
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/client/supabase';
import { getTestCodeSchedule, type ActiveSchedule } from '@/lib/adminApi';
import { getDeviceId } from '@/lib/device';
import { TempAppealModal } from '@/components/TempAppealModal';

const C = {
  bg: '#07111E',
  bgMid: '#0D1B2A',
  bgCard: '#0F2235',
  gold: '#C8A84B',
  goldLight: '#E8D08A',
  goldDim: '#7A6428',
  goldBg: 'rgba(200,168,75,0.08)',
  red: '#C82829',
  redDeep: '#9E1C1D',
  redBg: 'rgba(200,40,41,0.12)',
  textPrimary: '#EDE8DC',
  textSecond: '#A09070',
  textHint: '#5A5040',
  inputBg: '#0A1928',
  inputBorder: '#1E3A5A',
  inputFocus: '#C8A84B',
  divider: '#162840',
  dividerGold: 'rgba(200,168,75,0.25)',
  successBg: 'rgba(40,120,60,0.12)',
  successBorder: '#2a7a3b',
  successText: '#7FE0A0',
};

const ERROR_MAP: Record<string, string> = {
  CODE_NOT_FOUND:     '测试码不存在，请检查后重试',
  CODE_ALREADY_USED:  '该测试码已被使用',
  CODE_DISABLED:      '该测试码已被禁用',
  CODE_EXPIRED:       '该测试码已过期',
  ALREADY_REGISTERED: '您已提交过测试码',
  ALREADY_PENDING:    '您的申请正在审核中，请耐心等待',
  ALREADY_APPROVED:   '您已通过审核，可直接进入游戏',
  SAVE_EXISTS:        '🚫 该账号已有存档，禁止入内。如判断失误，请点击下方「临时申诉」',
  NOT_AUTHENTICATED:  '登录状态异常，请重新登录',
};

export default function EnterCodeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [codeFocus, setCodeFocus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [btnPressed, setBtnPressed] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  // 账号已有存档：展示临时申诉入口
  const [saveExists, setSaveExists] = useState(false);
  const [appealOpen, setAppealOpen] = useState(false);
  // 时间窗口
  const [schedule, setSchedule] = useState<ActiveSchedule | null | undefined>(undefined); // undefined=加载中
  const [scheduleBlocked, setScheduleBlocked] = useState(false);
  const [scheduleHint, setScheduleHint] = useState('');
  // 公告
  const [announcement, setAnnouncement] = useState<{ title: string; content: string } | null>(null);

  useEffect(() => {
    getDeviceId().then((id) => setDeviceId(id));
    // 公告
    supabase.rpc('get_announcement', { p_page_key: 'enter_code' }).then(({ data }) => {
      if (data && Array.isArray(data) && data.length > 0) {
        const r = data[0] as Record<string, unknown>;
        const t = String(r.title ?? '').trim();
        const c = String(r.content ?? '').trim();
        if (t || c) setAnnouncement({ title: t, content: c });
      }
    });
    getTestCodeSchedule().then((sch) => {
      setSchedule(sch);
      if (!sch) { setScheduleBlocked(false); setScheduleHint(''); return; }
      if (!sch.enabled) { setScheduleBlocked(true); setScheduleHint('申请通道当前已关闭，请稍后再试'); return; }
      // 判断当前时间是否在窗口内
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const nowStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      if (nowStr < sch.open_time || nowStr > sch.close_time) {
        setScheduleBlocked(true);
        setScheduleHint(`申请通道当前关闭，开放时间：${sch.open_time} — ${sch.close_time}`);
      } else {
        setScheduleBlocked(false);
        setScheduleHint(`开放时段：${sch.open_time} — ${sch.close_time}`);
      }
    }).catch(() => { setSchedule(null); });
  }, []);

  const handleSubmit = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError('请输入测试码');
      return;
    }
    setLoading(true);
    setError('');
    setSaveExists(false);
    try {
    const { data, error: rpcError } = await supabase.rpc('register_with_test_code', {
        p_test_code: trimmed,
        p_device_id: deviceId || 'unknown',
      });
      if (rpcError) {
        // 服务器错误：显示具体原因（绝不误报 SAVE_EXISTS）
        const msg = rpcError.message ?? '';
        if (msg.includes('ambiguous') || msg.includes('overload')) {
          setError('⚠️ 服务器函数冲突，请联系管理员修复');
        } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout')) {
          setError('⚠️ 网络异常，请检查网络后重试');
        } else if (msg.length > 0) {
          setError(`⚠️ 服务器错误：${msg.slice(0, 60)}`);
        } else {
          setError('⚠️ 因服务器问题提交失败，请稍后重试');
        }
        setLoading(false);
        return;
      }
      // 去除可能的尾随空白/不可见字符，确保与 ERROR_MAP 的 key 精确匹配
      const result = String(data ?? '').trim();
      if (result === 'OK') {
        router.replace('/(app)/pending-approval');
        return;
      }
      if (result === 'AUTO_APPROVED') {
        // 自动审批已通过，直接进入游戏
        router.replace('/(app)/home');
        return;
      }
      if (result === 'SAVE_EXISTS') {
        setSaveExists(true);
      }
      setError(ERROR_MAP[result] ?? `⚠️ 因服务器问题提交失败（${result}），请稍后重试`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('network') || msg.includes('fetch')) {
        setError('⚠️ 网络连接失败，请检查网络后重试');
      } else {
        setError('⚠️ 因服务器问题提交失败，请稍后重试');
      }
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/sign-in');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="light" />
      <View style={{ height: 3, backgroundColor: C.gold, position: 'absolute', top: 0, left: 0, right: 0 }} />

      <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: insets.top + 32,
            paddingBottom: insets.bottom + 32,
            paddingHorizontal: 20,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            {/* 公告横幅 */}
            {announcement ? (
              <View style={{ width: '100%', borderWidth: 1, borderColor: C.gold, borderLeftWidth: 3, backgroundColor: C.goldBg, paddingHorizontal: 14, paddingVertical: 10, gap: 4, marginBottom: 16, alignSelf: 'stretch' }}>
                {announcement.title ? (
                  <Text style={{ color: C.goldLight, fontSize: 13, fontWeight: '700' }}>{announcement.title}</Text>
                ) : null}
                {announcement.content ? (
                  <Text style={{ color: C.textPrimary, fontSize: 12, lineHeight: 20 }}>{announcement.content}</Text>
                ) : null}
              </View>
            ) : null}
            <Text style={{ fontSize: 28, fontWeight: '900', color: C.goldLight, letterSpacing: 4 }}>输入测试码</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <View style={{ width: 32, height: 1, backgroundColor: C.goldDim }} />
              <View style={{ width: 6, height: 6, backgroundColor: C.gold, transform: [{ rotate: '45deg' }] }} />
              <View style={{ width: 32, height: 1, backgroundColor: C.goldDim }} />
            </View>
            <Text style={{ fontSize: 12, color: C.textSecond, letterSpacing: 1, marginTop: 10, textAlign: 'center' }}>
              测试码格式 TEST-XXXXXX，每码仅可使用一次
            </Text>
            {/* 时间窗口提示条 */}
            {schedule !== undefined && (
              <View style={{ marginTop: 10, backgroundColor: scheduleBlocked ? C.redBg : C.successBg, borderWidth: 1, borderColor: scheduleBlocked ? C.red : C.successBorder, paddingHorizontal: 14, paddingVertical: 7, alignItems: 'center' }}>
                <Text style={{ color: scheduleBlocked ? '#FF7070' : C.successText, fontSize: 11, fontWeight: '600' }}>
                  {scheduleBlocked ? `🔒 ${scheduleHint}` : (scheduleHint ? `🟢 ${scheduleHint}` : '🟢 申请通道开放中')}
                </Text>
              </View>
            )}
          </View>

          <View style={{ width: '100%', maxWidth: 400, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.dividerGold }}>
            <View style={{ height: 2, backgroundColor: C.gold }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.divider, gap: 10 }}>
              <View style={{ width: 3, height: 14, backgroundColor: C.red }} />
              <Text style={{ fontSize: 13, color: C.textPrimary, fontWeight: '700', letterSpacing: 2, flex: 1 }}>档案准入 · 测试码核验</Text>
            </View>

            <View style={{ padding: 20, gap: 14 }}>
              <View>
                <Text style={{ fontSize: 10, color: C.textSecond, letterSpacing: 2, marginBottom: 6 }}>测试码</Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: codeFocus ? C.inputFocus : C.inputBorder,
                    backgroundColor: C.inputBg,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: 16,
                    color: C.textPrimary,
                    letterSpacing: 2,
                    borderRadius: 0,
                  }}
                  placeholder="TEST-XXXXXX"
                  placeholderTextColor={C.textHint}
                  value={code}
                  onChangeText={(t) => setCode(t.toUpperCase())}
                  onFocus={() => setCodeFocus(true)}
                  onBlur={() => setCodeFocus(false)}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
              </View>

              {error ? (
                <View style={{ backgroundColor: C.redBg, borderLeftWidth: 2, borderLeftColor: C.red, paddingHorizontal: 10, paddingVertical: 6 }}>
                  <Text style={{ fontSize: 12, color: '#FF7070', letterSpacing: 0.5 }}>{error}</Text>
                </View>
              ) : null}

              {saveExists ? (
                <Pressable onPress={() => setAppealOpen(true)}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 2,
                    borderWidth: 1, borderColor: C.dividerGold, backgroundColor: C.goldBg, paddingHorizontal: 16, paddingVertical: 10 }}>
                  <Text style={{ fontSize: 12, color: C.goldLight, fontWeight: '600' }}>📝 判断失误？提交临时申诉</Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={handleSubmit}
                disabled={loading || scheduleBlocked}
                cssInterop={false}
                onPressIn={() => setBtnPressed(true)}
                onPressOut={() => setBtnPressed(false)}
                style={{ backgroundColor: scheduleBlocked ? C.redDeep : (btnPressed ? C.redDeep : C.red), paddingVertical: 14, alignItems: 'center', opacity: (loading || scheduleBlocked) ? 0.55 : 1, marginTop: 4 }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 4 }}>
                  {loading ? '核验中...' : (scheduleBlocked ? '通道已关闭' : '提  交')}
                </Text>
              </Pressable>

              {/* 免费声明框 */}
              <View style={{ borderWidth: 1, borderColor: C.successBorder, backgroundColor: C.successBg, paddingHorizontal: 12, paddingVertical: 10, marginTop: 4 }}>
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
      </KeyboardAvoidingView>

      <TempAppealModal visible={appealOpen} onClose={() => setAppealOpen(false)} />
    </View>
  );
}
```

<a id="srcappappenterpriselisttsx"></a>
## `src/app/(app)/enterprise-list.tsx`

```tsx
// 招商局企业名单管理页
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getEnterprises, closeEnterprise } from '@/db/gameApi';
import type { Enterprise } from '@/types/game';

const STATUS_LABEL: Record<string, string> = {
  operating: '运营中',
  closed:    '已关闭',
  pending:   '洽谈中',
};
const STATUS_COLOR: Record<string, string> = {
  operating: '#1a4a2e',
  closed:    '#888',
  pending:   '#7a5c00',
};
const SCALE_LABEL: Record<string, string> = {
  small:  '小型',
  medium: '中型',
  large:  '大型',
};

export default function EnterpriseListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save } = useGame();
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'operating' | 'closed'>('all');
  const [toastMsg, setToastMsg] = useState('');

  const loadData = useCallback(async () => {
    if (!save) return;
    setLoading(true);
    const data = await getEnterprises(save.id);
    setEnterprises(data);
    setLoading(false);
  }, [save]);

  useFocusEffect(useCallback(() => { void loadData(); }, [loadData]));

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const handleClose = async (ent: Enterprise) => {
    await closeEnterprise(ent.id);
    showToast(`已关停企业：${ent.name}`);
    await loadData();
  };

  const filtered = enterprises.filter(e => {
    if (filter === 'operating') return e.status === 'operating';
    if (filter === 'closed') return e.status === 'closed';
    return true;
  });

  const totalTax = enterprises.filter(e => e.status === 'operating').reduce((s, e) => s + e.taxContribution, 0);

  const renderItem = ({ item }: { item: Enterprise }) => {
    const statusColor = STATUS_COLOR[item.status] ?? '#888';
    const statusLabel = STATUS_LABEL[item.status] ?? item.status;
    const scaleLabel = SCALE_LABEL[item.scale] ?? item.scale;
    return (
      <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1D1D1D' }}>{item.name}</Text>
              <View style={{ backgroundColor: statusColor + '22', borderWidth: 1, borderColor: statusColor, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ fontSize: 9, color: statusColor, fontWeight: '700' }}>{statusLabel}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, color: '#1D3B5E' }}>{item.industry}</Text>
              </View>
              <View style={{ backgroundColor: '#F5F0E8', paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, color: '#6a4a10' }}>{scaleLabel}企业</Text>
              </View>
              <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, color: '#1a4a2e' }}>月税 {item.taxContribution}万</Text>
              </View>
            </View>
          </View>
          {item.status === 'operating' && (
            <Pressable
              onPress={() => handleClose(item)}
              style={{ paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#C82829', marginLeft: 10 }}
            >
              <Text style={{ fontSize: 11, color: '#C82829' }}>关停</Text>
            </Pressable>
          )}
        </View>

        <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F0F0F0', flexDirection: 'row', gap: 16 }}>
          <View>
            <Text style={{ fontSize: 10, color: '#999' }}>投资金额</Text>
            <Text style={{ fontSize: 12, color: '#333', fontWeight: '600', marginTop: 2 }}>{item.investAmount}万元</Text>
          </View>
          <View>
            <Text style={{ fontSize: 10, color: '#999' }}>从业人数</Text>
            <Text style={{ fontSize: 12, color: '#333', fontWeight: '600', marginTop: 2 }}>{item.employeeCount}人</Text>
          </View>
          <View>
            <Text style={{ fontSize: 10, color: '#999' }}>引进月份</Text>
            <Text style={{ fontSize: 12, color: '#333', fontWeight: '600', marginTop: 2 }}>第{item.introducedMonth}月</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F7F7F5' }}>
      <StatusBar style="light" backgroundColor="#1D3B5E" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#1D3B5E', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>招商局</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>企业名单</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10 }}>共{enterprises.filter(e => e.status === 'operating').length}家运营</Text>
          <Text style={{ color: '#7eff9a', fontSize: 12, fontWeight: '700' }}>月税收 {totalTax}万</Text>
        </View>
      </View>

      {/* 筛选 Tab */}
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#DDD' }}>
        {([['all', '全部'], ['operating', '运营中'], ['closed', '已关停']] as ['all' | 'operating' | 'closed', string][]).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setFilter(key)}
            style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: filter === key ? '#1D3B5E' : 'transparent' }}
          >
            <Text style={{ fontSize: 13, color: filter === key ? '#1D3B5E' : '#888', fontWeight: filter === key ? '700' : '400' }}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#1D3B5E" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 14 }}
          contentInsetAdjustmentBehavior="automatic"
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Text style={{ fontSize: 32, marginBottom: 12 }}>🏢</Text>
              <Text style={{ fontSize: 14, color: '#888' }}>暂无企业</Text>
              <Text style={{ fontSize: 12, color: '#aaa', marginTop: 4, textAlign: 'center', paddingHorizontal: 24 }}>
                通过招商局的招商引资行动，每月自动引进企业
              </Text>
            </View>
          }
          ListHeaderComponent={
            enterprises.length > 0 ? (
              <View style={{ backgroundColor: '#FFF9E6', borderWidth: 1, borderColor: '#F0C050', padding: 12, marginBottom: 12 }}>
                <Text style={{ fontSize: 11, color: '#7A5C00', lineHeight: 18 }}>
                  📊 共引进企业 {enterprises.length} 家，其中运营中 {enterprises.filter(e => e.status === 'operating').length} 家。{'\n'}
                  月税收合计 {totalTax} 万元，每月自动入账城市资金。
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {toastMsg !== '' && (
        <View style={{ position: 'absolute', bottom: 48, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 6 }}>
          <Text style={{ color: '#fff', fontSize: 13 }}>{toastMsg}</Text>
        </View>
      )}
    </View>
  );
}
```

<a id="srcappappeventstsx"></a>
## `src/app/(app)/events.tsx`

```tsx
// 突发事件页面
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getRankTheme } from '@/lib/rankTheme';
import { saveEventRecord } from '@/db/gameApi';
import { getRandomEvent } from '@/lib/eventTemplates';
import LeadershipMeetingModal from '@/components/LeadershipMeetingModal';
import type { EventTemplate, EventChoice } from '@/types/game';

const EVENT_TYPE_LABEL: Record<string, string> = {
  disaster: '自然灾害',
  corruption: '廉洁风险',
  opinion: '舆情危机',
  economic: '经济事件',
  security: '治安事件',
};

const EVENT_TYPE_COLOR: Record<string, string> = {
  disaster: '#C82829',
  corruption: '#6a1a6a',
  opinion: '#8B4513',
  economic: '#2a7a3b',
  security: '#1D2D44',
};

function ChangeTag({ value, label }: { value: number; label: string }) {
  if (value === 0) return null;
  const color = value > 0 ? '#2a7a3b' : '#C82829';
  return (
    <View style={{ borderWidth: 1, borderColor: color, paddingHorizontal: 5, paddingVertical: 1 }}>
      <Text style={{ fontSize: 10, color, fontVariant: ['tabular-nums'] }}>
        {label}{value > 0 ? `+${value}` : value}
      </Text>
    </View>
  );
}

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [currentEvent, setCurrentEvent] = useState<EventTemplate | null>(null);
  const [resolvedChoice, setResolvedChoice] = useState<EventChoice | null>(null);
  const [resolved, setResolved] = useState(false);
  const [showMeeting, setShowMeeting] = useState(false);

  const rankLevel = save?.rankLevel ?? 1;
  const theme = getRankTheme(rankLevel);

  useFocusEffect(
    useCallback(() => {
      if (save?.isEventPending) {
        setCurrentEvent(getRandomEvent(rankLevel));
        setResolved(false);
        setResolvedChoice(null);
        setShowMeeting(false);
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [save?.isEventPending])
  );

  const handleGenerateEvent = () => {
    setCurrentEvent(getRandomEvent(rankLevel));
    setResolved(false);
    setResolvedChoice(null);
    setShowMeeting(false);
  };

  const handleChoice = async (choice: EventChoice, choiceIndex: number) => {
    if (!save || !currentEvent) return;

    // 判定本次选择是否为"不作为/失败"：政绩和民心都不正向，且对城市指标有负面影响
    const isFail = choice.meritChange <= 0 && choice.moralChange <= 0 &&
      (choice.gdpChange < 0 || choice.livelihoodChange < 0 || choice.ecologyChange < 0);
    const newConsecutiveFail = isFail
      ? (save.consecutiveFailEvents ?? 0) + 1
      : 0; // 做了正确选择即重置计数

    // 先更新存档，清除事件待处理标记
    await updateGameSave({
      meritPoints: save.meritPoints + choice.meritChange,
      moralValue: Math.max(0, Math.min(100, save.moralValue + choice.moralChange)),
      cityGdp: Math.max(0, Math.min(100, save.cityGdp + choice.gdpChange)),
      cityLivelihood: Math.max(0, Math.min(100, save.cityLivelihood + choice.livelihoodChange)),
      cityEcology: Math.max(0, Math.min(100, save.cityEcology + choice.ecologyChange)),
      cityBusiness: Math.max(0, Math.min(100, save.cityBusiness + choice.businessChange)),
      isEventPending: false,
      consecutiveFailEvents: newConsecutiveFail,
    });

    // 无论记录是否成功，都显示处置结果（不阻塞返回）
    setResolvedChoice(choice);
    setResolved(true);

    // 后台记录事件（失败不影响游戏流程）
    try {
      const { supabase } = await import('@/client/supabase');
      const { data: userData } = await supabase.auth.getUser();
      await saveEventRecord({
        saveId: save.id,
        userId: userData?.user?.id ?? '',
        eventType: currentEvent.type,
        title: currentEvent.title,
        description: currentEvent.description,
        choiceIndex,
        choiceText: choice.text,
        meritChange: choice.meritChange,
        moralChange: choice.moralChange,
        gdpChange: choice.gdpChange,
        livelihoodChange: choice.livelihoodChange,
        ecologyChange: choice.ecologyChange,
        businessChange: choice.businessChange,
        gameDay: save.gameDays,
      });
    } catch (_) {
      // 记录失败不影响主流程
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <StatusBar style={theme.statusBarStyle} backgroundColor={theme.headerBg} />

      <View style={{
        backgroundColor: theme.headerBg,
        paddingTop: insets.top + 8,
        paddingBottom: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: theme.headerSub, fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.headerSub, fontSize: 10, letterSpacing: 2 }}>EVENTS</Text>
          <Text style={{ color: theme.headerText, fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>突发事件处置</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: theme.headerSub, fontSize: 10 }}>{save?.rankName}</Text>
          <Text style={{ color: theme.headerText, fontSize: 11, fontWeight: '600', marginTop: 1 }}>{save?.cityName}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {!currentEvent && (
          <View style={{ alignItems: 'center', marginTop: 80 }}>
            <Text style={{ fontSize: 16, color: theme.labelText, marginBottom: 8 }}>当前无待处置事件</Text>
            <Text style={{ fontSize: 12, color: theme.mutedText, marginBottom: 24, textAlign: 'center' }}>
              推进时间后可能触发突发事件{'\n'}也可手动模拟一个突发事件
            </Text>
            <Pressable
              onPress={handleGenerateEvent}
              style={{ backgroundColor: theme.headerBg, paddingHorizontal: 24, paddingVertical: 12 }}
            >
              <Text style={{ color: theme.headerText, fontWeight: '700', fontSize: 14, letterSpacing: 1 }}>模拟突发事件</Text>
            </Pressable>
          </View>
        )}

        {currentEvent && !resolved && (
          <View>
            {/* 事件卡片 */}
            <View style={{
              backgroundColor: theme.cardBg,
              borderWidth: 1,
              borderColor: EVENT_TYPE_COLOR[currentEvent.type] ?? theme.cardBorder,
              borderTopWidth: 3,
              padding: 16,
              marginBottom: 16,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <View style={{
                  borderWidth: 1,
                  borderColor: EVENT_TYPE_COLOR[currentEvent.type] ?? '#DDD',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}>
                  <Text style={{ fontSize: 10, color: EVENT_TYPE_COLOR[currentEvent.type], fontWeight: '600' }}>
                    {EVENT_TYPE_LABEL[currentEvent.type] ?? currentEvent.type}
                  </Text>
                </View>
                {currentEvent.isMajor ? (
                  <View style={{ borderWidth: 1, borderColor: '#C8161D', paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 10, color: '#C8161D', fontWeight: '700', letterSpacing: 1 }}>重大事件</Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 11, color: '#888' }}>紧急事件</Text>
                )}
              </View>

              <Text style={{ fontSize: 16, fontWeight: '700', color: theme.valueText, marginBottom: 10, letterSpacing: 0.5 }}>
                {currentEvent.title}
              </Text>
              <Text style={{ fontSize: 13, color: theme.labelText, lineHeight: 20 }}>
                {currentEvent.description}
              </Text>
            </View>

            {/* 重大事件 → 召开领导班子会议 */}
            {currentEvent.isMajor ? (
              <View>
                <View style={{ borderWidth: 1, borderColor: theme.primary, backgroundColor: theme.alertBg, padding: 12, marginBottom: 14 }}>
                  <Text style={{ color: theme.primary, fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>
                    ■ 重大事项须经领导班子集体决策
                  </Text>
                  <Text style={{ color: theme.labelText, fontSize: 12, lineHeight: 18 }}>
                    本事件影响重大，需召集领导班子成员共同商议，采取投票表决方式形成决议后执行。
                  </Text>
                </View>
                <Pressable
                  onPress={() => setShowMeeting(true)}
                  style={{ backgroundColor: theme.headerBg, paddingVertical: 14, alignItems: 'center' }}
                  android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
                >
                  <Text style={{ color: theme.headerText, fontWeight: '700', fontSize: 14, letterSpacing: 2 }}>召开领导班子会议 ›</Text>
                </Pressable>
              </View>
            ) : (
              <>
                {/* 普通事件 → 直接选择方案 */}
                <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>
                  请选择处置方案
                </Text>

                {currentEvent.choices.map((choice, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => handleChoice(choice, idx)}
                    style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, padding: 14, marginBottom: 10 }}
                    android_ripple={{ color: 'rgba(29,45,68,0.1)' }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: theme.valueText, marginBottom: 8, lineHeight: 20 }}>
                      {String.fromCharCode(65 + idx)}. {choice.text}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      <ChangeTag value={choice.meritChange} label="政绩" />
                      <ChangeTag value={choice.moralChange} label="民心" />
                      <ChangeTag value={choice.gdpChange} label="GDP" />
                      <ChangeTag value={choice.livelihoodChange} label="民生" />
                      <ChangeTag value={choice.ecologyChange} label="生态" />
                      <ChangeTag value={choice.businessChange} label="营商" />
                    </View>
                  </Pressable>
                ))}
              </>
            )}
          </View>
        )}

        {currentEvent && resolved && resolvedChoice && (
          <View>
            {/* 事件标题 */}
            <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, padding: 14, marginBottom: 12 }}>
              <Text style={{ fontSize: 13, color: theme.mutedText, marginBottom: 4 }}>事件：{currentEvent.title}</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.valueText }}>
                方案：{resolvedChoice.text}
              </Text>
            </View>

            {/* 结果展示 */}
            <View style={{
              backgroundColor: theme.cardBg,
              borderWidth: 1,
              borderColor: theme.statHigh,
              borderTopWidth: 3,
              borderTopColor: theme.statHigh,
              padding: 16,
              marginBottom: 16,
            }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.statHigh, marginBottom: 10, letterSpacing: 1 }}>
                处置结果
              </Text>
              <Text style={{ fontSize: 13, color: theme.labelText, lineHeight: 20, marginBottom: 12 }}>
                {resolvedChoice.description}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <ChangeTag value={resolvedChoice.meritChange} label="政绩" />
                <ChangeTag value={resolvedChoice.moralChange} label="民心" />
                <ChangeTag value={resolvedChoice.gdpChange} label="GDP" />
                <ChangeTag value={resolvedChoice.livelihoodChange} label="民生" />
                <ChangeTag value={resolvedChoice.ecologyChange} label="生态" />
                <ChangeTag value={resolvedChoice.businessChange} label="营商" />
              </View>
            </View>

            {/* 处置完成 - 返回主界面 */}
            <Pressable
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(app)/home');
                }
              }}
              style={{ paddingVertical: 14, alignItems: 'center', backgroundColor: theme.headerBg }}
            >
              <Text style={{ color: theme.headerText, fontWeight: '700', fontSize: 15, letterSpacing: 2 }}>收到，继续工作</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* 领导班子会议弹窗（重大事件触发） */}
      {showMeeting && currentEvent && save && (
        <LeadershipMeetingModal
          event={currentEvent}
          rankLevel={rankLevel}
          playerName={save.playerName}
          playerPosition={save.playerPosition || save.rankName}
          onConfirm={(finalChoice) => {
            setShowMeeting(false);
            handleChoice(finalChoice, -1);
          }}
        />
      )}
    </View>
  );
}
```

<a id="srcappappexchangeofficertsx"></a>
## `src/app/(app)/exchange-officer.tsx`

```tsx
// 干部交流任职页面 — 每180天触发，可接收或婉拒外城干部
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { acceptExchangeOfficer } from '@/db/gameApi';
import { FACTION_LABEL, FACTION_COLOR, SUB_LEVEL_NAMES, getSubAvatarEmoji } from '@/types/game';
import { StatBar } from '@/components/StatBar';

export default function ExchangeOfficerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, exchangeOfficer, clearExchangeOfficer } = useGame();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<'accepted' | 'declined' | null>(null);

  const handleAccept = async () => {
    if (!save || !exchangeOfficer) return;
    setLoading(true);
    const ok = await acceptExchangeOfficer(save.id, save.userId, exchangeOfficer);
    setLoading(false);
    if (ok) {
      clearExchangeOfficer();
      setDone('accepted');
    }
  };

  const handleDecline = () => {
    clearExchangeOfficer();
    setDone('declined');
  };

  const officer = exchangeOfficer;
  const factionColor = officer ? (FACTION_COLOR[officer.faction] ?? '#888') : '#888';
  const factionLabel = officer ? (FACTION_LABEL[officer.faction] ?? '无') : '';
  const levelName = officer ? (SUB_LEVEL_NAMES[officer.subLevel] ?? '待定') : '';
  const avatar = officer ? getSubAvatarEmoji(officer.avatarId, officer.gender) : '👤';

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      <StatusBar style="light" backgroundColor="#1D2D44" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#1D2D44', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>OFFICER EXCHANGE</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>干部交流任职</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10 }}>{save?.rankName}</Text>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600', marginTop: 1 }}>{save?.cityName}</Text>
          </View>
        </View>
        <Text style={{ color: '#a0b4cc', fontSize: 11, marginLeft: 34 }}>每180天自动触发一次交流任职申请</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} showsVerticalScrollIndicator={false}>

        {/* 结果反馈 */}
        {done === 'accepted' && (
          <View style={{ backgroundColor: '#e8f5e9', borderWidth: 1, borderColor: '#2a7a3b', padding: 16, alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 28 }}>✅</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#2a7a3b' }}>已接收交流干部</Text>
            <Text style={{ fontSize: 12, color: '#555', textAlign: 'center' }}>
              该干部已加入您的下属团队，可在「下属管理」中查看并分配岗位。
            </Text>
            <Pressable
              onPress={() => router.replace('/(app)/subordinates')}
              style={{ backgroundColor: '#2a7a3b', paddingHorizontal: 24, paddingVertical: 10, marginTop: 4 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>前往下属管理 ›</Text>
            </Pressable>
          </View>
        )}

        {done === 'declined' && (
          <View style={{ backgroundColor: '#fff8e1', borderWidth: 1, borderColor: '#f9a825', padding: 16, alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 28 }}>🤝</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#e65100' }}>已婉拒交流申请</Text>
            <Text style={{ fontSize: 12, color: '#555', textAlign: 'center' }}>
              已礼貌回复组织部，该干部将另行安排。下次交流任职将于180天后再次触发。
            </Text>
            <Pressable
              onPress={() => router.back()}
              style={{ backgroundColor: '#e65100', paddingHorizontal: 24, paddingVertical: 10, marginTop: 4 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>返回首页</Text>
            </Pressable>
          </View>
        )}

        {!done && !officer && (
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 24, alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 36 }}>📭</Text>
            <Text style={{ fontSize: 14, color: '#888', textAlign: 'center' }}>当前无待处理的干部交流申请</Text>
            <Text style={{ fontSize: 11, color: '#aaa', textAlign: 'center' }}>每180天将自动触发一次交流任职通知</Text>
          </View>
        )}

        {!done && officer && (
          <>
            {/* 组织部通知函 */}
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <View style={{ backgroundColor: '#1D2D44', paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>组织部 · 交流函</Text>
                </View>
                <Text style={{ color: '#888', fontSize: 10 }}>第{Math.floor((save?.gameDays ?? 0) / 30)}月</Text>
              </View>
              <Text style={{ fontSize: 12, color: '#333', lineHeight: 20 }}>
                根据组织部关于促进干部交流任职的相关规定，{officer.fromCity}现有一名干部
                <Text style={{ fontWeight: '700', color: '#1D2D44' }}>「{officer.name}」</Text>
                申请来贵处交流挂职。请结合工作实际予以审核接收或婉拒。
              </Text>
            </View>

            {/* 干部档案 */}
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
              <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 12 }}>来访干部档案</Text>

              <View style={{ flexDirection: 'row', gap: 14, marginBottom: 14 }}>
                {/* 头像 */}
                <View style={{ width: 64, height: 64, backgroundColor: '#F0F4F8', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D1D1D1' }}>
                  <Text style={{ fontSize: 36 }}>{avatar}</Text>
                </View>
                {/* 基本信息 */}
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 17, fontWeight: '700', color: '#1A1A1A' }}>{officer.name}</Text>
                    <Text style={{ fontSize: 11, color: '#888' }}>{officer.gender}</Text>
                    <View style={{ backgroundColor: factionColor + '22', borderWidth: 1, borderColor: factionColor, paddingHorizontal: 5, paddingVertical: 2 }}>
                      <Text style={{ color: factionColor, fontSize: 9, fontWeight: '700' }}>{factionLabel}派</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: '#555' }}>{officer.position}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                    <View style={{ backgroundColor: '#EEF2F7', paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 10, color: '#1D2D44' }}>来自：{officer.fromCity}</Text>
                    </View>
                    <View style={{ backgroundColor: '#E8F0F8', paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 10, color: '#1D2D44' }}>职级：{levelName}（{officer.subLevel}级）</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* 能力数值 */}
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <StatBar label="能力" value={officer.ability} />
                    <StatBar label="忠诚" value={officer.loyalty} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <StatBar label="廉洁" value={officer.integrity} />
                    <StatBar label="经验" value={officer.experience} />
                  </View>
                </View>
              </View>

              {/* 综合评级 */}
              {(() => {
                const avg = Math.floor((officer.ability + officer.loyalty + officer.integrity + officer.experience) / 4);
                const grade = avg >= 75 ? { label: '优秀干部', color: '#2a7a3b', bg: '#e8f5e9' }
                  : avg >= 55 ? { label: '称职干部', color: '#1D2D44', bg: '#EEF2F7' }
                  : { label: '一般干部', color: '#888', bg: '#F5F5F5' };
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, backgroundColor: grade.bg, padding: 10 }}>
                    <Text style={{ fontSize: 12, color: grade.color, fontWeight: '700' }}>综合评级：{grade.label}</Text>
                    <Text style={{ fontSize: 11, color: '#666' }}>综合均值 {avg}/100</Text>
                  </View>
                );
              })()}
            </View>

            {/* 接收/婉拒 操作区 */}
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14, gap: 10 }}>
              <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 4 }}>请作出决定</Text>

              {loading ? (
                <ActivityIndicator size="large" color="#1D2D44" />
              ) : (
                <>
                  <Pressable
                    onPress={() => void handleAccept()}
                    style={{ backgroundColor: '#1D2D44', padding: 14, alignItems: 'center' }}
                    android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>✅ 接收交流干部</Text>
                    <Text style={{ color: '#a0b4cc', fontSize: 11, marginTop: 3 }}>
                      该干部将加入您的下属团队，可分配岗位
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleDecline}
                    style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#C82829', padding: 14, alignItems: 'center' }}
                    android_ripple={{ color: 'rgba(200,40,41,0.1)' }}
                  >
                    <Text style={{ color: '#C82829', fontWeight: '700', fontSize: 14 }}>🤝 婉拒申请</Text>
                    <Text style={{ color: '#888', fontSize: 11, marginTop: 3 }}>
                      礼貌回绝，不影响与组织部关系
                    </Text>
                  </Pressable>
                </>
              )}
            </View>

            {/* 说明 */}
            <View style={{ backgroundColor: '#EEF2F7', borderWidth: 1, borderColor: '#D0DCE8', padding: 12 }}>
              <Text style={{ fontSize: 11, color: '#1D2D44', lineHeight: 18 }}>
                💡 干部交流任职是组织部促进干部队伍建设的重要举措。接收外城优秀干部可充实本地管理力量，婉拒不会产生负面影响。下次交流申请将于180天后再次触发。
              </Text>
            </View>
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}
```

<a id="srcappappfactionmaptsx"></a>
## `src/app/(app)/faction-map.tsx`

```tsx
// faction-map.tsx — 派系势力地图（§3.25 / §10.6）
// 主页独立分页：把五派从抽象关系投影成省级势力地图
import { useState, useCallback } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getSubordinates } from '@/db/gameApi';
import {
  FACTION_LABEL,
  FACTION_SHORT,
  FACTION_COLOR,
  ALL_FACTIONS,
  type FactionId,
  type Subordinate,
} from '@/types/game';
import { getDominantFaction, getLosingFaction, isCooldownActive, setCooldown } from '@/lib/factionSystem';

// §2.1 势力锚点：每个省的基础归属派系
interface ProvinceDef {
  id: string;
  name: string;
  base: FactionId;
  hub?: boolean; // 枢纽省（首都/经济中心/资源省）
}

const PROVINCES: ProvinceDef[] = [
  { id: 'bj',  name: '北京',   base: 'pragmatic', hub: true },
  { id: 'sh',  name: '上海',   base: 'reform',    hub: true },
  { id: 'gd',  name: '广东',   base: 'reform',    hub: true },
  { id: 'zj',  name: '浙江',   base: 'reform' },
  { id: 'fj',  name: '福建',   base: 'reform' },
  { id: 'js',  name: '江苏',   base: 'reform' },
  { id: 'sd',  name: '山东',   base: 'local',     hub: true },
  { id: 'sc',  name: '四川',   base: 'local' },
  { id: 'hb',  name: '湖北',   base: 'local' },
  { id: 'hn',  name: '河南',   base: 'local' },
  { id: 'ah',  name: '安徽',   base: 'local' },
  { id: 'jx',  name: '江西',   base: 'cyl' },
  { id: 'gx',  name: '广西',   base: 'cyl' },
  { id: 'gz',  name: '贵州',   base: 'cyl' },
  { id: 'yn',  name: '云南',   base: 'cyl' },
  { id: 'sc2', name: '陕西',   base: 'local' },
  { id: 'gs',  name: '甘肃',   base: 'cyl' },
  { id: 'nx',  name: '宁夏',   base: 'cyl' },
  { id: 'qh',  name: '青海',   base: 'cyl' },
  { id: 'xj',  name: '新疆',   base: 'local' },
  { id: 'xz',  name: '西藏',   base: 'local' },
  { id: 'nm',  name: '内蒙古', base: 'local' },
  { id: 'hlj', name: '黑龙江', base: 'pragmatic' },
  { id: 'jl',  name: '吉林',   base: 'pragmatic' },
  { id: 'ln',  name: '辽宁',   base: 'pragmatic' },
  { id: 'tj',  name: '天津',   base: 'pragmatic' },
  { id: 'he',  name: '河北',   base: 'pragmatic' },
  { id: 'cq',  name: '重庆',   base: 'local' },
  { id: 'hun', name: '湖南',   base: 'cyl' },
  { id: 'hub', name: '湖北2',  base: 'local' },
  { id: 'hi',  name: '海南',   base: 'reform' },
  { id: 'sn',  name: '山西',   base: 'local' },
];

const METRIC_HINT: Record<FactionId, string> = {
  reform:    'GDP / 招商引资',
  pragmatic: '稳定 / 治安',
  cyl:       '医疗 / 教育',
  techno:    'GDP / 数字治理',
  local:     '财政 / GDP',
};

const TAB_OPTIONS: Array<{ key: 'map' | 'treasury' | 'tier'; label: string }> = [
  { key: 'map', label: '势力地图' },
  { key: 'treasury', label: '经费池' },
  { key: 'tier', label: '嫡系梯队' },
];

const CITY_NAMES = ['中心城区', '东郊新区', '西部县域'];
const COUNTY_NAMES = ['一区', '二区', '三区'];
const TIER_ORDER: Array<'门生' | '骨干' | '心腹'> = ['门生', '骨干', '心腹'];
const TIER_COST: Record<string, number> = { '门生': 500, '骨干': 1000, '心腹': 2000 };
const TIER_INFLUENCE: Record<string, number> = { '门生': 1, '骨干': 2, '心腹': 4 };
const TIER_SLOTS = ['嫡系一', '嫡系二', '嫡系三'];

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

const vary = (base: Record<FactionId, number>, seed: number, amp: number): Record<FactionId, number> => {
  const out = {} as Record<FactionId, number>;
  for (const f of ALL_FACTIONS) {
    const v = base[f] + Math.round(((seed * 7 + f.length * 3) % (amp * 2 + 1)) - amp);
    out[f] = clamp(v);
  }
  return out;
};

export default function FactionMapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [selected, setSelected] = useState<string | null>(null);
  const [drillCity, setDrillCity] = useState<number | null>(null);
  const [tab, setTab] = useState<'map' | 'treasury' | 'tier'>('map');
  const [subs, setSubs] = useState<Subordinate[]>([]);
  useFocusEffect(useCallback(() => {
    let active = true;
    if (!save) return () => { active = false; };
    (async () => {
      const list = await getSubordinates(save.id);
      if (active) setSubs(list);
    })();
    return () => { active = false; };
  }, [save?.id]));

  if (!save) return null;

  const primary = save.primaryFaction as FactionId | '';
  const wind = save.politicalWind ?? 'balanced';
  const dominant = save.dominantFaction as FactionId | null;
  const losing = getLosingFaction(wind);
  const regionControl = (save.regionControl ?? {}) as Record<string, Record<FactionId, number>>;
  const treasury = (save.factionTreasury ?? {}) as Record<FactionId, number>;
  const tierMap = (save.cultivateTier ?? {}) as Record<string, '门生' | '骨干' | '心腹'>;
  const binding = (save.cultivateBinding ?? {}) as Record<string, string>;
  const cd = save.factionCooldowns ?? {};

  const controlOf = (pid: string): Record<FactionId, number> => {
    if (regionControl[pid]) return regionControl[pid];
    // 默认：基础派 control 75，其余派 15
    const p = PROVINCES.find(x => x.id === pid);
    const base = p?.base ?? 'local';
    const map = {} as Record<FactionId, number>;
    for (const f of ALL_FACTIONS) map[f] = f === base ? 75 : 15;
    return map;
  };

  const ownerFromControl = (c: Record<FactionId, number>): FactionId => {
    let best: FactionId = 'local';
    let max = -1;
    for (const f of ALL_FACTIONS) { if (c[f] > max) { max = c[f]; best = f; } }
    return best;
  };

  const ownerOf = (pid: string): FactionId => ownerFromControl(controlOf(pid));
  const cityControl = (pid: string, ci: number) => vary(controlOf(pid), ci + 1, 12);
  const countyControl = (pid: string, ci: number, ki: number) => vary(cityControl(pid, ci), ci * 3 + ki + 1, 8);

  const sel = selected ? PROVINCES.find(p => p.id === selected) : null;
  const selControl = selected ? controlOf(selected) : null;
  const selOwner = selected ? ownerOf(selected) : null;

  const tOf = (f: FactionId): number => treasury[f] ?? (f === 'reform' ? 1200 : f === 'pragmatic' ? 1000 : f === 'techno' ? 900 : f === 'cyl' ? 700 : 800);
  const tierCount = (t: '门生' | '骨干' | '心腹') => TIER_SLOTS.filter(s => tierMap[s] === t).length;

  const bumpProvince = async (pid: string, delta: number, cost: number) => {
    if (!primary || (save.meritPoints ?? 0) < cost) return;
    // v6：深耕操作加冷却，避免无限连点快速堆叠 control
    if (isCooldownActive(cd, `cultivate_${pid}`, save.gameDays)) return;
    const cur = controlOf(pid);
    const next = { ...cur, [primary]: clamp(cur[primary] + delta) };
    await updateGameSave({
      meritPoints: Math.max(0, (save.meritPoints ?? 0) - cost),
      regionControl: { ...regionControl, [pid]: next },
      factionCooldowns: setCooldown(cd, `cultivate_${pid}`, save.gameDays, 30),
    });
  };

  const doCultivate = async (pid: string) => {
    const p = PROVINCES.find(x => x.id === pid)!;
    const isMyProvince = p.base === primary;
    const cost = isMyProvince ? 500 : 1000;
    const delta = isMyProvince ? 10 : 8;
    await bumpProvince(pid, delta, cost);
  };

  const doCultivateCity = async (pid: string) => bumpProvince(pid, 6, 400);
  const doCultivateCounty = async (pid: string) => bumpProvince(pid, 4, 300);

  const doDonate = async () => {
    if (!primary || (save.fundBalance ?? 0) < 100000) return;
    if (isCooldownActive(cd, 'treasury_donate', save.gameDays)) return;
    // v6：账目留痕为概率事件（非每次必中），避免长期玩必落马
    const seed = save.gameDays;
    const rand = ((seed * 1664525 + 1013904223) >>> 0) / 0xffffffff;
    const flagged = rand < 0.4;
    await updateGameSave({
      fundBalance: Math.max(0, (save.fundBalance ?? 0) - 100000),
      factionTreasury: { ...treasury, [primary]: tOf(primary) + 500 },
      factionInfluence: clamp((save.factionInfluence ?? 0) + 3),
      purgeCount: flagged ? (save.purgeCount ?? 0) + 1 : (save.purgeCount ?? 0),
      factionCooldowns: setCooldown(cd, 'treasury_donate', save.gameDays, 30),
    });
  };

  const doCultivateTier = async (slot: string) => {
    if (!primary) return;
    const sub = subs.find(s => s.id === binding[slot]);
    if (!sub) return;
    const cur = tierMap[slot];
    const nextIdx = cur ? TIER_ORDER.indexOf(cur) + 1 : 0;
    if (nextIdx >= TIER_ORDER.length) return;
    const nextTier = TIER_ORDER[nextIdx];
    const cost = TIER_COST[nextTier];
    if ((save.meritPoints ?? 0) < cost) return;
    // 加成按下属能力/忠诚折算（§3.27）
    const gain = Math.max(1, Math.round(TIER_INFLUENCE[nextTier] * (0.5 + (sub.ability + sub.loyalty) / 200)));
    await updateGameSave({
      meritPoints: Math.max(0, (save.meritPoints ?? 0) - cost),
      factionInfluence: clamp((save.factionInfluence ?? 0) + gain),
      cultivateTier: { ...tierMap, [slot]: nextTier },
    });
  };

  const doBind = async (slot: string, subId: string) => {
    await updateGameSave({ cultivateBinding: { ...binding, [slot]: subId } });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F3F0' }}>
      <StatusBar style="light" backgroundColor="#1D3A5C" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#1D3A5C', paddingTop: insets.top + 6, paddingHorizontal: 14, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable onPress={() => router.back()}><Text style={{ color: '#8eb4d8', fontSize: 22 }}>‹</Text></Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#8eb4d8', fontSize: 9, letterSpacing: 2 }}>FACTION POWER MAP</Text>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>派系势力地图</Text>
          </View>
          <Pressable onPress={() => router.push('/(app)/factions')} style={{ borderWidth: 1, borderColor: '#8eb4d8', paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: '#8eb4d8', fontSize: 9 }}>派系总览 ›</Text>
          </Pressable>
        </View>
        {/* 风向横幅 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <Text style={{ color: '#8eb4d8', fontSize: 10 }}>当前主流派：</Text>
          {dominant ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: FACTION_COLOR[dominant] }} />
              <Text style={{ color: '#FFD700', fontSize: 11, fontWeight: '700' }}>{FACTION_LABEL[dominant]}</Text>
            </View>
          ) : <Text style={{ color: '#8eb4d8', fontSize: 11 }}>均势</Text>}
          {losing && <Text style={{ color: '#8eb4d8', fontSize: 10 }}>· 失势：{FACTION_LABEL[losing]}</Text>}
        </View>
      </View>

      {/* 分段切换 */}
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#E5E5E5' }}>
        {TAB_OPTIONS.map(t => (
          <Pressable key={t.key} onPress={() => { setTab(t.key); setDrillCity(null); }}
            style={{ flex: 1, paddingVertical: 11, alignItems: 'center', borderBottomWidth: tab === t.key ? 2 : 0, borderColor: '#1D3A5C' }}>
            <Text style={{ color: tab === t.key ? '#1D3A5C' : '#999', fontSize: 11, fontWeight: tab === t.key ? '700' : '400' }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'map' && (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
          {/* 图例 */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {ALL_FACTIONS.map(f => (
              <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', paddingHorizontal: 6, paddingVertical: 3 }}>
                <View style={{ width: 8, height: 8, backgroundColor: FACTION_COLOR[f] }} />
                <Text style={{ color: '#555', fontSize: 9 }}>{FACTION_SHORT[f]}</Text>
              </View>
            ))}
          </View>

          {/* 省份网格 */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {PROVINCES.map(p => {
              const owner = ownerOf(p.id);
              const isSel = selected === p.id;
              return (
                <Pressable key={p.id} onPress={() => { setSelected(isSel ? null : p.id); setDrillCity(null); }}
                  style={{ width: '30%', backgroundColor: FACTION_COLOR[owner], padding: 8, borderWidth: isSel ? 2 : 0, borderColor: '#FFD700', minHeight: 52, justifyContent: 'space-between' }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{p.name}{p.hub ? ' ★' : ''}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 8 }}>{FACTION_SHORT[owner]}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* 省份详情卡 */}
          {sel && selControl && selOwner && (
            <View style={{ backgroundColor: '#fff', borderTopWidth: 3, borderTopColor: FACTION_COLOR[selOwner], borderWidth: 1, borderColor: '#E5E5E5', marginTop: 14, padding: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: '#222', fontSize: 14, fontWeight: '700' }}>{sel.name}{sel.hub ? ' ★ 枢纽省' : ''}</Text>
                <View style={{ backgroundColor: FACTION_COLOR[selOwner], paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{FACTION_SHORT[selOwner]}</Text>
                </View>
              </View>
              <Text style={{ color: '#666', fontSize: 10, marginBottom: 8 }}>
                基础归属：{FACTION_LABEL[sel.base]} · 城市指标偏置：{METRIC_HINT[sel.base]}
              </Text>
              {ALL_FACTIONS.map(f => (
                <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Text style={{ color: '#555', fontSize: 9, width: 28 }}>{FACTION_SHORT[f]}</Text>
                  <View style={{ flex: 1, height: 6, backgroundColor: '#E5E5E5', borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ height: 6, width: `${selControl[f]}%`, backgroundColor: FACTION_COLOR[f], borderRadius: 3 }} />
                  </View>
                  <Text style={{ color: '#555', fontSize: 9, width: 24, textAlign: 'right' }}>{selControl[f]}</Text>
                </View>
              ))}
              <View style={{ marginTop: 10, gap: 6 }}>
                <Pressable
                  disabled={!primary || (save.meritPoints ?? 0) < (sel.base === primary ? 500 : 1000)}
                  onPress={() => doCultivate(sel.id)}
                  style={{ backgroundColor: !primary ? '#ccc' : (sel.base === primary ? '#2E7D32' : '#C62828'), padding: 10, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                    {primary ? `根据地深耕（−${sel.base === primary ? 500 : 1000} 政绩）` : '请先加入派系'}
                  </Text>
                </Pressable>
                <Text style={{ color: '#888', fontSize: 9, lineHeight: 14, textAlign: 'center' }}>
                  本派省 500 政绩深耕（control+10）· 他派省 1000（高危，control+8）{'\n'}
                  枢纽省 control 高者在派系斗争 S_you 额外加权（§3.25）
                </Text>
              </View>

              {/* 三级下钻：城市 → 区县（§3.25） */}
              <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 10 }}>
                <Text style={{ color: '#888', fontSize: 9, fontWeight: '700', marginBottom: 6 }}>下钻：城市 / 区县（§3.25）</Text>
                {CITY_NAMES.map((cn, ci) => {
                  const cCtrl = cityControl(sel.id, ci);
                  const cOwner = ownerFromControl(cCtrl);
                  const isDrill = drillCity === ci;
                  return (
                    <View key={ci} style={{ marginBottom: 8 }}>
                      <Pressable onPress={() => setDrillCity(isDrill ? null : ci)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}>
                        <View style={{ width: 8, height: 8, backgroundColor: FACTION_COLOR[cOwner] }} />
                        <Text style={{ flex: 1, color: '#333', fontSize: 11 }}>{sel.name}{cn}</Text>
                        <Text style={{ color: '#888', fontSize: 9 }}>{FACTION_SHORT[cOwner]}</Text>
                        <Text style={{ color: '#888', fontSize: 9 }}>{isDrill ? '▲' : '▼'}</Text>
                      </Pressable>
                      {isDrill && (
                        <View style={{ paddingLeft: 14, gap: 4 }}>
                          {COUNTY_NAMES.map((kn, ki) => {
                            const kCtrl = countyControl(sel.id, ci, ki);
                            const kOwner = ownerFromControl(kCtrl);
                            return (
                              <View key={ki} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={{ width: 6, height: 6, backgroundColor: FACTION_COLOR[kOwner] }} />
                                <Text style={{ flex: 1, color: '#555', fontSize: 10 }}>{kn}</Text>
                                <Text style={{ color: '#888', fontSize: 9 }}>{FACTION_SHORT[kOwner]}</Text>
                                <Pressable disabled={!primary || (save.meritPoints ?? 0) < 300} onPress={() => doCultivateCounty(sel.id)} style={{ backgroundColor: !primary ? '#ccc' : '#4527A0', paddingHorizontal: 8, paddingVertical: 3 }}>
                                  <Text style={{ color: '#fff', fontSize: 9 }}>深耕−300</Text>
                                </Pressable>
                              </View>
                            );
                          })}
                        </View>
                      )}
                      <Pressable disabled={!primary || (save.meritPoints ?? 0) < 400} onPress={() => doCultivateCity(sel.id)} style={{ backgroundColor: !primary ? '#ccc' : '#1565C0', paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center', marginTop: 2 }}>
                        <Text style={{ color: '#fff', fontSize: 9 }}>城市深耕（−400 政绩，control+6）</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          <View style={{ backgroundColor: '#1D3A5C', padding: 12, marginTop: 14 }}>
            <Text style={{ color: '#8eb4d8', fontSize: 9, lineHeight: 16 }}>
              地盘即政治资本（§4.8）。省份归属随派系操作、城市指标、斗争结果漂移；{'\n'}
              争夺省（control 差 {'<'}15）可发动阵地争夺；巡视他派省（1000 政绩）触发其"被约谈"（§3.10）。
            </Text>
          </View>
        </ScrollView>
      )}

      {tab === 'treasury' && (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
          <View style={{ backgroundColor: '#fff', borderTopWidth: 3, borderTopColor: '#C62828', borderWidth: 1, borderColor: '#E5E5E5', padding: 12 }}>
            <Text style={{ color: '#C62828', fontSize: 12, fontWeight: '700' }}>💰 派系经费池（§3.26）</Text>
            <Text style={{ color: '#888', fontSize: 9, marginTop: 4, lineHeight: 14 }}>
              各派经费池随派系操作、地盘、斗争结果增减。向主派输送经费可提升影响力，但账目留痕、累积落马风险。
            </Text>
            {ALL_FACTIONS.map(f => {
              const v = tOf(f);
              return (
                <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <Text style={{ color: '#555', fontSize: 9, width: 28 }}>{FACTION_SHORT[f]}</Text>
                  <View style={{ flex: 1, height: 8, backgroundColor: '#E5E5E5', borderRadius: 4, overflow: 'hidden' }}>
                    <View style={{ height: 8, width: `${Math.min(100, v / 20)}%`, backgroundColor: FACTION_COLOR[f], borderRadius: 4 }} />
                  </View>
                  <Text style={{ color: '#555', fontSize: 9, width: 40, textAlign: 'right' }}>{v}</Text>
                </View>
              );
            })}
            <View style={{ marginTop: 14 }}>
              <Pressable
                disabled={!primary || (save.fundBalance ?? 0) < 100000 || isCooldownActive(cd, 'treasury_donate', save.gameDays)}
                onPress={doDonate}
                style={{ backgroundColor: (!primary || (save.fundBalance ?? 0) < 100000) ? '#ccc' : '#C62828', padding: 10, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                  {primary ? '输送经费（−10万资金 → 经费+500，影响力+3）' : '请先加入派系'}
                </Text>
              </Pressable>
              <Text style={{ color: '#888', fontSize: 9, lineHeight: 14, textAlign: 'center', marginTop: 6 }}>
                ⚠ 账目留痕：落马风险 +1（purgeCount）· 冷却 30 天{'\n'}
                经费池高者在派系斗争 S_you 额外加权（§3.26 / §4.8）
              </Text>
            </View>
          </View>
        </ScrollView>
      )}

      {tab === 'tier' && (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
          <View style={{ backgroundColor: '#fff', borderTopWidth: 3, borderTopColor: '#4527A0', borderWidth: 1, borderColor: '#E5E5E5', padding: 12 }}>
            <Text style={{ color: '#4527A0', fontSize: 12, fontWeight: '700' }}>🎖 嫡系梯队（§3.27）</Text>
            <Text style={{ color: '#888', fontSize: 9, marginTop: 4, lineHeight: 14 }}>
              绑定真实下属培养嫡系：门生 → 骨干 → 心腹。影响力加成按下属能力/忠诚折算，心腹 ×{tierCount('心腹')} 为斗争 S_you 提供稳定加成。
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              {([['门生', tierCount('门生')], ['骨干', tierCount('骨干')], ['心腹', tierCount('心腹')]] as Array<[string, number]>).map(([t, n]) => (
                <View key={t} style={{ flex: 1, backgroundColor: '#F3E5F5', padding: 8, alignItems: 'center' }}>
                  <Text style={{ color: '#4527A0', fontSize: 10, fontWeight: '700' }}>{t}</Text>
                  <Text style={{ color: '#4527A0', fontSize: 16, fontWeight: '700' }}>{n}</Text>
                </View>
              ))}
            </View>
            {TIER_SLOTS.map(slot => {
              const boundSub = subs.find(s => s.id === binding[slot]);
              const cur = tierMap[slot];
              const nextIdx = cur ? TIER_ORDER.indexOf(cur) + 1 : 0;
              const nextTier = nextIdx < TIER_ORDER.length ? TIER_ORDER[nextIdx] : null;
              const cost = nextTier ? TIER_COST[nextTier] : 0;
              const maxed = !nextTier;
              const gain = boundSub && nextTier ? Math.max(1, Math.round(TIER_INFLUENCE[nextTier] * (0.5 + (boundSub.ability + boundSub.loyalty) / 200))) : 0;
              const available = subs.filter(s => !Object.values(binding).includes(s.id));
              return (
                <View key={slot} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#333', fontSize: 11, fontWeight: '600' }}>{slot}{boundSub ? ` · ${boundSub.name}` : ' · 未绑定下属'}</Text>
                      <Text style={{ color: '#888', fontSize: 9, marginTop: 2 }}>
                        {boundSub
                          ? `能力${boundSub.ability} 忠诚${boundSub.loyalty} · ${cur ? `当前${cur}` : '未培养'}${nextTier ? ` → 可晋升${nextTier}（影响力+${gain}）` : ' · 已满级'}`
                          : '选择一名下属绑定后可培养'}
                      </Text>
                    </View>
                    {boundSub && (
                      <Pressable
                        disabled={!primary || maxed || (save.meritPoints ?? 0) < cost}
                        onPress={() => doCultivateTier(slot)}
                        style={{ backgroundColor: (!primary || maxed) ? '#ccc' : '#4527A0', paddingHorizontal: 12, paddingVertical: 6 }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{maxed ? '满级' : `−${cost}`}</Text>
                      </Pressable>
                    )}
                  </View>
                  {!boundSub && (
                    <View style={{ marginTop: 6, gap: 4 }}>
                      {available.length === 0 ? (
                        <Text style={{ color: '#aaa', fontSize: 9 }}>暂无可绑定下属（请先招募下属）</Text>
                      ) : available.slice(0, 4).map(s => (
                        <Pressable key={s.id} onPress={() => doBind(slot, s.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F3E5F5', paddingHorizontal: 8, paddingVertical: 6 }}>
                          <Text style={{ flex: 1, color: '#4527A0', fontSize: 10, fontWeight: '600' }}>{s.name}</Text>
                          <Text style={{ color: '#888', fontSize: 9 }}>能力{s.ability} 忠诚{s.loyalty}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
```

<a id="srcappappfactionstsx"></a>
## `src/app/(app)/factions.tsx`

```tsx
// factions.tsx — 派系系统 v2（14 屏全面重写）
// 对应设计规格 §2–§4 / §10；删除旧 4-Tab 玩法，按文档全量实现
// v3：新增玩法 Tab（委托执行 / 密谋行动 / 叛逃换系）+ 位置棋盘入口
import { useState, useCallback } from 'react';
import { Pressable, ScrollView, Text, View, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getNpcBand } from '@/db/gameApi';
import {
  RANK_CONFIG,
  FACTION_LABEL,
  FACTION_SHORT,
  FACTION_COLOR,
  ALL_FACTIONS,
  type FactionId,
  type Faction,
  type FactionMandate,
  type CovertOpRecord,
  type PromotionContest,
} from '@/types/game';
import {
  getRepLevel,
  REP_LABELS,
  getDominantFaction,
  getLosingFaction,
  isCooldownActive,
  setCooldown,
  cooldownRemaining,
  WIND_CYCLE_DAYS,
  isInMobilizationPeriod,
  shouldTriggerWindCycle,
  calcKFaction,
  FACTION_RELATION_MATRIX,
  getActiveCoalitions,
  canFormCoalition,
  COALITION_CONTEST_BONUS,
  COALITION_FORM_RELATION_BOOST,
  applyRelDeltaToSave,
  calcSYou,
  calcBandSynergy,
  isMultiFactionFreeForAll,
  getRelationFromSave,
  prepBonus,
} from '@/lib/factionSystem';
// v6：派系胜负标准结算（统一走 promotionFaction，避免绕过晋升门控）
import {
  applyFactionWin,
  applyFactionLossPenalty,
  FACTION_LOSS_INFLUENCE_PENALTY,
  FACTION_LOSS_SUPPORT_PENALTY,
  FACTION_LOSS_SETBACK_DAYS,
} from '@/lib/promotionFaction';
// v6 扩展玩法：声望经济 / 暗线举报 / 周期分红
import {
  buySetbackImmunity,
  buyAccelerateContest,
  attemptInformReport,
  isFactionReportable,
  getInformExposureProb,
  PRESTIGE_ECONOMY,
  INFORM_REPORT,
} from '@/lib/factionExpansion';
// 派系玩法扩展（§二：委托 / 密谋 / 叛逃 + 六限制）
import {
  applyMandateComplete,
  applyMandateReject,
  attemptCovertOp,
  canDefect,
  applyDefection,
  COVERT_MERIT_COST,
  DEFECT_MERIT_COST,
  EXPOSURE_CASE_THRESHOLD,
  isInSetback,
} from '@/lib/factionGameplay';
import { PositionBoard } from '@/components/PositionBoard';

// ═══════════════════════════════════════════════════════════
// §2.1  五派完整配置（保留现有叙事内容）
// ═══════════════════════════════════════════════════════════
interface FactionConfig {
  key: FactionId;
  name: string;
  short: string;
  icon: string;
  headerColor: string;
  accentColor: string;
  tagline: string;
  background: string;
  representative: string;
  stronghold: string;
  weakness: string;
  perks: string[];
}

const FACTIONS: FactionConfig[] = [
  {
    key: 'reform', name: '改革开放系', short: '改革系', icon: '🔓',
    headerColor: '#1A3B66', accentColor: '#1E4D8C',
    tagline: '推进体制改革，扩大对外开放',
    background: '邓小平改革路线的继承者，发迹于广东、浙江等沿海改革前沿省份，与外资企业界及国际机构联系密切。',
    representative: '以广东系、浙商背景干部为代表，主张简政放权与营商环境优化。',
    stronghold: '广东、浙江、上海、福建；发改委、商务部、财政部。',
    weakness: '被质疑"让利于西方"，遇重大外部压力时政治风险骤升，与纪检系摩擦明显。',
    perks: ['改革政务政绩+30%', '晋升审批加速 5 天', '廉政考核优秀+10%', '招商引资GDP+15%（L3激活）'],
  },
  {
    key: 'pragmatic', name: '稳健国家系', short: '国家系', icon: '🏛️',
    headerColor: '#8B0000', accentColor: '#A00000',
    tagline: '党管一切，以稳定为压倒一切的任务',
    background: '以中央党政机关为核心阵地，强调党纪党风和意识形态管理，发迹于组织部、宣传部、中枢办公厅。',
    representative: '以"内陆党务系统"出身干部为代表，强调政治忠诚与意识形态统一。',
    stronghold: '中央党政机关、中枢组部宣部、国企央企；北京、河北、东北。',
    weakness: '改革动力不足，易被指"因循守旧"，在市场化改革呼声高涨时影响力下降。',
    perks: ['党务行动效果+25%', '上司忠诚好感+5', '意识形态安全+10%', '任期考核优秀+15%（L3激活）'],
  },
  {
    key: 'cyl', name: '共青团/民生系', short: '团系', icon: '🎓',
    headerColor: '#2E6B3E', accentColor: '#357A47',
    tagline: '以人民满意为第一标准，深耕群众工作',
    background: '从青年联合总团系统起步，擅长青年工作、媒体传播与群众调研。',
    representative: '重视教育、医疗、民生支出，走群众路线。',
    stronghold: '青年总团系统、教育部、卫生健康委、文化旅游部；中西部省份基层。',
    weakness: '被质疑缺乏经济建设经验，在经济下行期被边缘化；与国家系存在路线之争。',
    perks: ['民生施政政绩+25%', '群众满意度+10%', '上司汇报好感+5', '舆论管控解锁（L3激活）'],
  },
  {
    key: 'techno', name: '技术官僚系', short: '技官系', icon: '🔬',
    headerColor: '#7A5C00', accentColor: '#8A6800',
    tagline: '以数据治国，推动治理现代化',
    background: '理工科出身为主，在发改委、工信部、科技部及国有重点企业体系中影响深远。',
    representative: '以"工程师治国"路线为代表，数字经济、战略性新兴产业的强力推手。',
    stronghold: '工信部、发改委、科技部、中科院；航天军工、半导体、数字经济领域。',
    weakness: '政治动员能力弱，易被纪检系盯上技术领域腐败，与国家系意识形态路线时有摩擦。',
    perks: ['科技/数字政务+20%', '城市GDP+10%', '科研政绩+25%', '情报自然增速+50%（L2激活）'],
  },
  {
    key: 'local', name: '地方实力派', short: '地方派', icon: '🗺️',
    headerColor: '#3A2010', accentColor: '#4E2A14',
    tagline: '根植地方，深耕人脉资源',
    background: '长期在县市省层级深耕，掌握庞大的基层人脉、土地资源、地方企业关系网络。',
    representative: '在土地财政、基建项目上具有相当话语权，善于在中央政策下寻找地方操作空间。',
    stronghold: '省市县基层政府；建设局、国土局、城投公司；地方银行、商会。',
    weakness: '与中央改革路线摩擦，是反腐风暴重灾区，纪检系对地方利益输送高度警惕。',
    perks: ['基建政绩+30%', '下属招募成本-30%', '干部交流负面豁免', '地方资源调配解锁（L3激活）'],
  },
];

// ═══════════════════════════════════════════════════════════
// §3  政见表态（10 议题）
// ═══════════════════════════════════════════════════════════
interface PolicyStance {
  key: string; title: string; subtitle: string; background: string;
  effects: { fkey: FactionId; delta: number }[];
  merit: number; gdpDelta: number; livelihoodDelta: number;
  cooldown: number; risk: string;
}

const POLICY_STANCES: PolicyStance[] = [
  { key: 'pol_common_prosperity', title: '共同富裕论', subtitle: '以调节分配差距为核心，推进社会公平',
    background: '强调"第三次分配"，倡导平台经济承担社会责任，压缩资本过度扩张。',
    effects: [{ fkey: 'cyl', delta: 22 }, { fkey: 'pragmatic', delta: 10 }, { fkey: 'reform', delta: -12 }, { fkey: 'techno', delta: -5 }, { fkey: 'local', delta: -8 }],
    merit: 20, gdpDelta: -2, livelihoodDelta: 8, cooldown: 90,
    risk: '改革系和技官系认为此论调损害市场活力，招商引资承压。' },
  { key: 'pol_soe_strengthen', title: '国企做强做大论', subtitle: '强化国有企业主导地位，增强经济控制力',
    background: '主张国企在战略行业保持垄断，通过兼并重组做大规模，以国资委为核心建立央地协调机制。',
    effects: [{ fkey: 'pragmatic', delta: 20 }, { fkey: 'local', delta: 8 }, { fkey: 'reform', delta: -18 }, { fkey: 'techno', delta: -5 }, { fkey: 'cyl', delta: 5 }],
    merit: 15, gdpDelta: 3, livelihoodDelta: 0, cooldown: 75,
    risk: '改革系激烈反对，认为此论调阻碍民营经济活力，外资撤离风险上升。' },
  { key: 'pol_market_reform', title: '市场化深化论', subtitle: '让市场在资源配置中发挥决定性作用',
    background: '推动要素市场化配置改革，打破行政垄断，扩大民营企业准入。',
    effects: [{ fkey: 'reform', delta: 20 }, { fkey: 'techno', delta: 10 }, { fkey: 'pragmatic', delta: -15 }, { fkey: 'local', delta: -10 }, { fkey: 'cyl', delta: 3 }],
    merit: 22, gdpDelta: 10, livelihoodDelta: 0, cooldown: 90,
    risk: '国家系强烈抵制，被扣"历史虚无主义"帽子的政治风险较高。' },
  { key: 'pol_dual_circulation', title: '新发展格局（双循环）', subtitle: '以国内大循环为主体，国内国际双循环相互促进',
    background: '在中美博弈背景下，以内需拉动替代出口依赖，强化产业链自主可控。',
    effects: [{ fkey: 'techno', delta: 16 }, { fkey: 'pragmatic', delta: 14 }, { fkey: 'reform', delta: 5 }, { fkey: 'cyl', delta: 5 }, { fkey: 'local', delta: -3 }],
    merit: 18, gdpDelta: 6, livelihoodDelta: 2, cooldown: 75,
    risk: '政治风险低，但易被认为是向保守主义妥协，改革派部分人士有异议。' },
  { key: 'pol_anticorruption', title: '反腐常态化论', subtitle: '将反腐败斗争进行到底，构建不敢腐机制',
    background: '主张将巡视组、派驻纪检组制度化，同步推进官员财产公示。',
    effects: [{ fkey: 'reform', delta: 12 }, { fkey: 'cyl', delta: 8 }, { fkey: 'pragmatic', delta: 5 }, { fkey: 'local', delta: -22 }, { fkey: 'techno', delta: -3 }],
    merit: 25, gdpDelta: 0, livelihoodDelta: 3, cooldown: 90,
    risk: '地方实力派将视为直接威胁，可能触发地方官员结成防御联盟对抗。' },
  { key: 'pol_digital_economy', title: '数字经济强国论', subtitle: '以数字经济为引擎推动高质量发展',
    background: '在人工智能、工业互联网、大数据基础设施领域加大国家投入。',
    effects: [{ fkey: 'techno', delta: 22 }, { fkey: 'reform', delta: 10 }, { fkey: 'pragmatic', delta: 3 }, { fkey: 'cyl', delta: 0 }, { fkey: 'local', delta: -5 }],
    merit: 20, gdpDelta: 10, livelihoodDelta: 0, cooldown: 80,
    risk: '需配套较大财政投入；被纪检系警惕"数字腐败"新形式。' },
  { key: 'pol_rural_revitalization', title: '乡村振兴战略论', subtitle: '全面推进乡村振兴，缩小城乡差距',
    background: '接棒脱贫攻坚，强调农村基础设施、产业振兴、人才下乡。',
    effects: [{ fkey: 'cyl', delta: 20 }, { fkey: 'local', delta: 12 }, { fkey: 'reform', delta: 3 }, { fkey: 'techno', delta: -3 }, { fkey: 'pragmatic', delta: 8 }],
    merit: 16, gdpDelta: 2, livelihoodDelta: 10, cooldown: 60,
    risk: '政治安全，但易被质疑重民生轻效率；地方财政压力较大。' },
  { key: 'pol_full_reform', title: '全面深化改革论', subtitle: '以制度创新突破利益固化，推进国家治理体系现代化',
    background: '十八届三中全会精神的延伸，以顶层设计方式推进各领域系统性改革。',
    effects: [{ fkey: 'reform', delta: 22 }, { fkey: 'techno', delta: 10 }, { fkey: 'cyl', delta: 6 }, { fkey: 'pragmatic', delta: -12 }, { fkey: 'local', delta: -10 }],
    merit: 25, gdpDelta: 5, livelihoodDelta: 2, cooldown: 100,
    risk: '是改革系最为偏好的论调，但国家系会质疑是否动摇党的执政根基。' },
  { key: 'pol_party_leads_all', title: '党的全面领导论', subtitle: '坚持和加强党对一切工作的领导',
    background: '强调在党政军民学、东西南北中，党是领导一切的。',
    effects: [{ fkey: 'pragmatic', delta: 22 }, { fkey: 'local', delta: 5 }, { fkey: 'reform', delta: -15 }, { fkey: 'techno', delta: -8 }, { fkey: 'cyl', delta: -3 }],
    merit: 12, gdpDelta: -3, livelihoodDelta: 0, cooldown: 75,
    risk: '政治安全性最高，但市场主体信心下降风险较明显，长期GDP承压。' },
  { key: 'pol_open_to_world', title: '高水平对外开放论', subtitle: '扩大制度型开放，打造国际合作竞争新优势',
    background: '推进"第二个开放"：从商品和要素流动的开放，转向规则、规制、管理、标准的制度型开放。',
    effects: [{ fkey: 'reform', delta: 18 }, { fkey: 'techno', delta: 12 }, { fkey: 'pragmatic', delta: -10 }, { fkey: 'cyl', delta: 5 }, { fkey: 'local', delta: -8 }],
    merit: 20, gdpDelta: 12, livelihoodDelta: 0, cooldown: 90,
    risk: '在民族主义情绪高涨时政治风险上升，被指"崇洋"，需拿捏表达尺度。' },
];

// ═══════════════════════════════════════════════════════════
// §3  关系行动（每派 4-5 条）
// ═══════════════════════════════════════════════════════════
interface FactionAction {
  key: string; fkey: FactionId;
  type: '联络' | '合作' | '拉拢' | '打压';
  label: string; desc: string;
  relDelta: number;
  otherEffects: { fkey?: FactionId; merit?: number; gdpDelta?: number; livelihoodDelta?: number; fundCost?: number; moralDelta?: number }[];
  cooldown: number; minRank: number; riskLevel: '低' | '中' | '高';
}

const FACTION_ACTIONS: FactionAction[] = [
  { key: 'rf_meet',  fkey: 'reform', type: '联络', label: '约见改革派核心干部', desc: '拜访广东/浙江系改革派重要人物，就市场化改革路径深度交流，强化互信。', relDelta: 10, otherEffects: [{ merit: 5, fundCost: 50000 }], cooldown: 45, minRank: 0, riskLevel: '低' },
  { key: 'rf_gov',   fkey: 'reform', type: '合作', label: '联合推进政务公开项目', desc: '与改革派合作建立阳光政务信息公开平台，展示施政透明度，双方声誉提升。', relDelta: 15, otherEffects: [{ merit: 18, gdpDelta: 2 }], cooldown: 60, minRank: 2, riskLevel: '低' },
  { key: 'rf_biz',   fkey: 'reform', type: '合作', label: '共推营商环境优化方案', desc: '联合推出优化营商环境白皮书，减少行政审批，获得改革派和企业界双重认可。', relDelta: 14, otherEffects: [{ merit: 20, gdpDelta: 8, fundCost: 80000 }], cooldown: 75, minRank: 3, riskLevel: '低' },
  { key: 'rf_rally', fkey: 'reform', type: '拉拢', label: '邀入城市重大决策会议', desc: '在关键决策会议中为改革派开放席位，彰显政治诚意，但国家系关系略受影响。', relDelta: 22, otherEffects: [{ merit: 25, fkey: 'pragmatic' }], cooldown: 90, minRank: 4, riskLevel: '中' },
  { key: 'rf_suppress', fkey: 'reform', type: '打压', label: '质疑改革方案危及稳定', desc: '在公开场合以"操之过急"为由阻挠某改革方案，削弱改革派声势，风险较高。', relDelta: -20, otherEffects: [{ merit: 20, fkey: 'pragmatic' }], cooldown: 120, minRank: 5, riskLevel: '高' },
  { key: 'pr_meet',  fkey: 'pragmatic', type: '联络', label: '拜访国家系组织骨干', desc: '低调拜访中央系统出身的国家系核心人物，以私人情谊铺垫政治合作。', relDelta: 10, otherEffects: [{ merit: 5, fundCost: 40000 }], cooldown: 45, minRank: 0, riskLevel: '低' },
  { key: 'pr_party', fkey: 'pragmatic', type: '合作', label: '共同推进党建示范工程', desc: '联合推出党建工作品牌，获国家系高度认可，以示范工程换取党务系统话语权。', relDelta: 16, otherEffects: [{ merit: 15 }], cooldown: 60, minRank: 1, riskLevel: '低' },
  { key: 'pr_gdp',   fkey: 'pragmatic', type: '合作', label: '共推稳增长计划', desc: '联合国家系推出稳增长数字化目标，强调经济安全与稳定优先，获务实系认可。', relDelta: 14, otherEffects: [{ merit: 15, gdpDelta: 6 }], cooldown: 60, minRank: 2, riskLevel: '低' },
  { key: 'pr_pact',  fkey: 'pragmatic', type: '拉拢', label: '建立施政路线默契', desc: '与国家系在几项核心路线上达成非正式共识，互相背书，大幅提升关系。', relDelta: 20, otherEffects: [{ merit: 22, fkey: 'reform' }], cooldown: 90, minRank: 4, riskLevel: '中' },
  { key: 'pr_suppress', fkey: 'pragmatic', type: '打压', label: '揭批保守主义路线', desc: '在内部会议上指出国家系的因循守旧，以改革话语打压其影响力，风险较高。', relDelta: -18, otherEffects: [{ merit: 18, fkey: 'reform' }], cooldown: 120, minRank: 5, riskLevel: '高' },
  { key: 'cyl_event',   fkey: 'cyl', type: '联络', label: '出席团系重要政治活动', desc: '参加共青团系组织的主题活动，公开表达对青年培养的重视，提升形象分。', relDelta: 10, otherEffects: [{ merit: 8 }], cooldown: 45, minRank: 0, riskLevel: '低' },
  { key: 'cyl_network', fkey: 'cyl', type: '联络', label: '拜访团系骨干建立情谊', desc: '私下与团系中层建立联系，在非正式场合深化感情，为人事合作铺路。', relDelta: 14, otherEffects: [{ merit: 10, fundCost: 30000 }], cooldown: 50, minRank: 0, riskLevel: '低' },
  { key: 'cyl_media',   fkey: 'cyl', type: '合作', label: '借团系媒体宣传施政亮点', desc: '借助团系媒体渠道对外发布施政成果，增强公众认知，积累团系好感与民生声誉。', relDelta: 12, otherEffects: [{ merit: 20, livelihoodDelta: 2 }], cooldown: 60, minRank: 2, riskLevel: '低' },
  { key: 'cyl_support', fkey: 'cyl', type: '拉拢', label: '力推团系干部人事安排', desc: '在组织推荐环节为团系干部站台，换取其在晋升投票上的关键支持。', relDelta: 20, otherEffects: [{ merit: 15, fkey: 'reform' }], cooldown: 90, minRank: 3, riskLevel: '中' },
  { key: 'cyl_welfare', fkey: 'cyl', type: '合作', label: '联合推进民生保障计划', desc: '与团系联合发布教育/医疗/养老三联惠民方案，拉动民生指数，双方均获政绩。', relDelta: 18, otherEffects: [{ merit: 22, livelihoodDelta: 5 }], cooldown: 75, minRank: 2, riskLevel: '低' },
  { key: 'tc_consult',  fkey: 'techno', type: '联络', label: '聘请技官系专家顾问', desc: '聘请技官派院士、专家担任政务顾问，借其专业背书提升施政公信力。', relDelta: 10, otherEffects: [{ merit: 12, fundCost: 60000 }], cooldown: 45, minRank: 0, riskLevel: '低' },
  { key: 'tc_project',  fkey: 'techno', type: '合作', label: '共推数字政务升级项目', desc: '邀请技官系骨干主导电子政务平台全面升级，双方共享政绩与声望。', relDelta: 14, otherEffects: [{ merit: 15, gdpDelta: 4 }], cooldown: 50, minRank: 2, riskLevel: '低' },
  { key: 'tc_fund',     fkey: 'techno', type: '合作', label: '申请科技创新专项资金', desc: '联合技官系提报新兴产业专项，争取科研经费和政策支持，共同推动产业转型。', relDelta: 12, otherEffects: [{ merit: 18, fundCost: 80000 }], cooldown: 60, minRank: 3, riskLevel: '低' },
  { key: 'tc_bigdata',  fkey: 'techno', type: '拉拢', label: '共建大数据城市治理平台', desc: '推出大数据城市治理方案，将技官系路线嵌入本地治理，大幅提升双方关系。', relDelta: 22, otherEffects: [{ merit: 28, gdpDelta: 5, fkey: 'reform' }], cooldown: 90, minRank: 5, riskLevel: '低' },
  { key: 'lc_visit',    fkey: 'local', type: '联络', label: '登门拜会地方实力要员', desc: '携带厚礼拜访地方派核心人物，以私人情谊奠定政治合作基础。', relDelta: 12, otherEffects: [{ merit: 8, fundCost: 80000 }], cooldown: 45, minRank: 0, riskLevel: '低' },
  { key: 'lc_land',     fkey: 'local', type: '合作', label: '联合推进土地出让项目', desc: '与地方派协同推进辖区土地出让与旧城改造项目，共享财政收益与政绩资源。', relDelta: 14, otherEffects: [{ merit: 18, gdpDelta: 8, fundCost: 150000 }], cooldown: 70, minRank: 2, riskLevel: '中' },
  { key: 'lc_project',  fkey: 'local', type: '合作', label: '联手承接基建大项目', desc: '与地方派共同推进基础设施项目，共享政绩并绑定利益，关系大幅提升。', relDelta: 16, otherEffects: [{ merit: 22, gdpDelta: 6, fundCost: 200000 }], cooldown: 75, minRank: 3, riskLevel: '低' },
  { key: 'lc_ally',     fkey: 'local', type: '拉拢', label: '结盟地方骨干核心人物', desc: '与地方派核心人物建立正式政治盟约，换取稳固支持，但改革派关系受损。', relDelta: 25, otherEffects: [{ merit: 20, fkey: 'reform' }], cooldown: 120, minRank: 5, riskLevel: '中' },
  { key: 'lc_expose',   fkey: 'local', type: '打压', label: '向纪委反映利益输送线索', desc: '秘密向纪委举报地方派的腐败线索，以反腐名义大幅削弱其根基，政治风险极高。', relDelta: -30, otherEffects: [{ merit: 40, moralDelta: 5 }], cooldown: 180, minRank: 6, riskLevel: '高' },
];

// ═══════════════════════════════════════════════════════════
// §10.3  设计令牌（颜色）
// ═══════════════════════════════════════════════════════════
const FACTION_BG: Record<FactionId, string> = {
  reform: '#1A3B66', pragmatic: '#8B0000', cyl: '#2E6B3E', techno: '#7A5C00', local: '#3A2010',
};

const WIND_LABEL: Record<string, string> = {
  'reform-heavy': '改革开放路线主导', 'pragmatic-heavy': '稳健国家路线主导',
  'techno-surge': '技术官僚路线主导', 'local-crackdown': '地方纪律整肃路线',
  'balanced': '路线均衡 · 无主流',
};

const PHASE_LABEL: Record<string, { label: string; color: string }> = {
  idle: { label: '平稳期', color: '#607D8B' },
  mobilize: { label: '动员期 ⚡', color: '#F57C00' },
  active: { label: '交战期 ⚔', color: '#C62828' },
  truce: { label: '休战期 🕊', color: '#2E7D32' },
};

const REP_PERKS: Record<number, string> = {
  1: '委托任务 +1 条',
  2: '行动效果 +20%；政见联动 +1',
  3: '资源通道折扣；晋升系数 +0.1',
  4: '"领导人背书"解锁；危机庇护一次',
};

// ═══════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════
function clamp(v: number, min = 0, max = 100) { return Math.max(min, Math.min(max, v)); }

function getRelLabel(v: number): { label: string; color: string } {
  if (v >= 80) return { label: '坚定盟友', color: '#D4AF37' };
  if (v >= 60) return { label: '友好合作', color: '#2E7D32' };
  if (v >= 40) return { label: '中立观望', color: '#546E7A' };
  if (v >= 20) return { label: '冷淡疏离', color: '#E65100' };
  return { label: '潜在对立', color: '#C62828' };
}

function relOf(save: any, fkey: FactionId): number {
  if (fkey === 'reform')    return save.reformFaction    ?? 50;
  if (fkey === 'pragmatic') return save.pragmaticFaction ?? 50;
  if (fkey === 'cyl')       return save.cylRelation      ?? 30;
  if (fkey === 'techno')    return save.technoRelation   ?? 30;
  if (fkey === 'local')     return save.localRelation    ?? 30;
  return 0;
}

function relField(fkey: FactionId): string {
  if (fkey === 'reform')    return 'reformFaction';
  if (fkey === 'pragmatic') return 'pragmaticFaction';
  if (fkey === 'cyl')       return 'cylRelation';
  if (fkey === 'techno')    return 'technoRelation';
  return 'localRelation';
}

function applyRelDelta(save: any, fkey: FactionId, delta: number): Record<string, number> {
  return { [relField(fkey)]: clamp(relOf(save, fkey) + delta) };
}

// ═══════════════════════════════════════════════════════════
// 通用小组件
// ═══════════════════════════════════════════════════════════
function RelBar({ value, color }: { value: number; color: string }) {
  const { label, color: lc } = getRelLabel(value);
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
        <Text style={{ color: '#555', fontSize: 10 }}>{value} / 100</Text>
        <Text style={{ fontSize: 10, fontWeight: '700', color: lc }}>{label}</Text>
      </View>
      <View style={{ height: 5, backgroundColor: '#E5E5E5', borderRadius: 3, overflow: 'hidden' }}>
        <View style={{ height: 5, width: `${value}%`, backgroundColor: color, borderRadius: 3 }} />
      </View>
    </View>
  );
}

function CooldownBadge({ days }: { days: number }) {
  return (
    <View style={{ backgroundColor: '#FFF3E0', borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2 }}>
      <Text style={{ color: '#E65100', fontSize: 9, fontWeight: '700' }}>冷却 {days}天</Text>
    </View>
  );
}

function SectionCard({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 0, borderTopWidth: 3, borderTopColor: accent ?? '#2B4B6F', borderWidth: 1, borderColor: '#E5E5E5', padding: 14, marginBottom: 10 }}>
      {children}
    </View>
  );
}

function SLabel({ text }: { text: string }) {
  return <Text style={{ fontSize: 9, color: '#2B4B6F', fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>{text.toUpperCase()}</Text>;
}

function ActionBtn({ label, onPress, disabled, color = '#1D3A5C' }: { label: string; onPress: () => void; disabled?: boolean; color?: string }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={{ backgroundColor: disabled ? '#E0E0E0' : color, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 2, alignItems: 'center' }}
    >
      <Text style={{ color: disabled ? '#9E9E9E' : '#fff', fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 0 — 政治总览
// ═══════════════════════════════════════════════════════════
function Tab0Overview({ save, showFeedback }: { save: any; showFeedback: (m: string, ok?: boolean) => void }) {
  const primary = save.primaryFaction as FactionId | '';
  const dominant = save.dominantFaction as FactionId | null;
  const wind = save.politicalWind ?? 'balanced';
  const losingFaction = getLosingFaction(wind);
  const isOnWind = primary && dominant && primary === dominant;
  const isOnLose = primary && losingFaction && primary === losingFaction;

  // K_faction 预估
  const kResult = primary ? calcKFaction({
    primaryFaction: primary || null,
    relation: { reform: relOf(save, 'reform'), pragmatic: relOf(save, 'pragmatic'), cyl: relOf(save, 'cyl'), techno: relOf(save, 'techno'), local: relOf(save, 'local') },
    dominantFaction: dominant,
    losingFaction,
    bandFactions: [],
    isFlagged: save.isFlagged ?? false,
    factionlessLocked: save.factionlessLocked ?? false,
    factionPromotionLocked: save.factionPromotionLocked ?? false,
  }) : null;

  const influence = save.factionInfluence ?? 0;
  const merit = save.meritPoints ?? 0;
  const intel = save.factionIntelligence ?? 0;

  return (
    <>
      {/* 风向横幅 */}
      <View style={{ backgroundColor: '#1D3A5C', padding: 14, marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ color: '#8eb4d8', fontSize: 9, letterSpacing: 2 }}>中央政治风向 · 五年一换</Text>
          {isOnWind && <View style={{ backgroundColor: '#FFD700', paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ color: '#1D3A5C', fontSize: 9, fontWeight: '700' }}>🟢 风口加成 +0.20</Text></View>}
          {isOnLose && <View style={{ backgroundColor: '#C62828', paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>⚠ 失势 −0.15</Text></View>}
        </View>
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 4 }}>{WIND_LABEL[wind] ?? wind}</Text>
        {dominant ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: FACTION_COLOR[dominant] }} />
            <Text style={{ color: '#8eb4d8', fontSize: 11 }}>
              当前主流派：<Text style={{ color: '#FFD700', fontWeight: '700' }}>{FACTION_LABEL[dominant]}</Text>
              {losingFaction ? `  ·  失势派：${FACTION_LABEL[losingFaction]}` : ''}
            </Text>
          </View>
        ) : (
          <Text style={{ color: '#8eb4d8', fontSize: 11 }}>均势博弈中 · 无明确主流派</Text>
        )}
        {/* 下次斗争倒计时 */}
        {(() => {
          const remaining = WIND_CYCLE_DAYS - (save.gameDays - (save.lastWindCycleDay ?? 0));
          const pct = Math.max(0, remaining) / WIND_CYCLE_DAYS;
          return (
            <View style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                <Text style={{ color: '#8eb4d8', fontSize: 9 }}>下次派系斗争</Text>
                <Text style={{ color: remaining <= 60 ? '#FFD700' : '#8eb4d8', fontSize: 9, fontWeight: '700' }}>
                  {Math.max(0, remaining)} 天后{remaining <= 60 ? ' ⚡ 动员期' : ''}
                </Text>
              </View>
              <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden' }}>
                <View style={{ height: 4, width: `${(1 - pct) * 100}%`, backgroundColor: remaining <= 60 ? '#FFD700' : '#1E88E5', borderRadius: 2 }} />
              </View>
            </View>
          );
        })()}
      </View>

      {/* 三仪表 */}
      <SectionCard>
        <SLabel text="政治分量仪表" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { label: '派系影响力', value: influence, color: '#1E4D8C', max: 100 },
            { label: '政绩', value: merit, color: '#2E7D32', max: 9999 },
            { label: '派系情报', value: intel, color: '#8A6800', max: 100 },
          ].map(m => (
            <View key={m.label} style={{ flex: 1, alignItems: 'center', backgroundColor: '#F8F8F8', padding: 10, borderRadius: 2 }}>
              <Text style={{ color: m.color, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                {m.max === 9999 ? m.value : m.value}
              </Text>
              <Text style={{ color: '#666', fontSize: 9, marginTop: 2 }}>{m.label}</Text>
              {m.max <= 100 && (
                <View style={{ height: 3, width: '100%', backgroundColor: '#E5E5E5', marginTop: 5, borderRadius: 2, overflow: 'hidden' }}>
                  <View style={{ height: 3, width: `${m.value}%`, backgroundColor: m.color, borderRadius: 2 }} />
                </View>
              )}
            </View>
          ))}
        </View>
      </SectionCard>

      {/* 五派关系雷达（条形图模拟）*/}
      <SectionCard>
        <SLabel text="五派关系格局" />
        {FACTIONS.map(f => {
          const rel = relOf(save, f.key);
          const isPrimary = primary === f.key;
          const { label: rl, color: rc } = getRelLabel(rel);
          return (
            <View key={f.key} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Text style={{ fontSize: 14 }}>{f.icon}</Text>
                <Text style={{ flex: 1, color: '#222', fontSize: 11, fontWeight: isPrimary ? '700' : '400' }}>{f.name}</Text>
                {isPrimary && <View style={{ backgroundColor: FACTION_BG[f.key], paddingHorizontal: 4, paddingVertical: 1 }}><Text style={{ color: '#FFD700', fontSize: 8, fontWeight: '700' }}>主派</Text></View>}
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#222', fontVariant: ['tabular-nums'], width: 26, textAlign: 'right' }}>{rel}</Text>
                <Text style={{ fontSize: 9, color: rc, fontWeight: '700', width: 48, textAlign: 'right' }}>{rl}</Text>
              </View>
              <View style={{ height: 5, backgroundColor: '#E5E5E5', borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ height: 5, width: `${rel}%`, backgroundColor: f.accentColor, borderRadius: 3 }} />
              </View>
            </View>
          );
        })}
      </SectionCard>

      {/* 改革·务实张力 */}
      {(() => {
        const diff = relOf(save, 'reform') - relOf(save, 'pragmatic');
        const warn = Math.abs(diff) > 30;
        return (
          <SectionCard accent={warn ? '#C62828' : '#2B4B6F'}>
            <SLabel text="改革·务实 路线张力" />
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <View style={{ flex: 1, backgroundColor: '#EFF4FB', padding: 10, alignItems: 'center' }}>
                <Text style={{ color: '#1565C0', fontSize: 18, fontWeight: '700' }}>{relOf(save, 'reform')}</Text>
                <Text style={{ color: '#1565C0', fontSize: 9, marginTop: 2 }}>改革开放派</Text>
              </View>
              <View style={{ justifyContent: 'center', alignItems: 'center', width: 40 }}>
                <Text style={{ fontSize: 9, color: warn ? '#C62828' : '#999', fontWeight: '700', textAlign: 'center' }}>
                  {diff > 0 ? '改革偏强' : diff < 0 ? '务实偏强' : '势均力敌'}
                </Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#F5F5F5', padding: 10, alignItems: 'center' }}>
                <Text style={{ color: '#455A64', fontSize: 18, fontWeight: '700' }}>{relOf(save, 'pragmatic')}</Text>
                <Text style={{ color: '#455A64', fontSize: 9, marginTop: 2 }}>稳健务实派</Text>
              </View>
            </View>
            {warn && (
              <View style={{ backgroundColor: '#fff3e0', borderLeftWidth: 3, borderLeftColor: '#C62828', padding: 9 }}>
                <Text style={{ color: '#b71c1c', fontSize: 10, fontWeight: '700', marginBottom: 2 }}>⚠ 路线失衡警告</Text>
                <Text style={{ color: '#7f4c00', fontSize: 10, lineHeight: 16 }}>
                  {diff > 0 ? '务实' : '改革'}派声望差距超过 30 点，劣势派可能在晋升审批中投反对票（`K_faction` 对立派扣减项已生效）。
                </Text>
              </View>
            )}
          </SectionCard>
        );
      })()}

      {/* K_faction 晋升加成提示 */}
      {kResult && (
        <SectionCard accent="#7B1FA2">
          <SLabel text="晋升系数预估" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 28, fontWeight: '700', color: kResult.promotable ? '#1565C0' : '#C62828', fontVariant: ['tabular-nums'] }}>
              {kResult.promotable ? `×${kResult.kFaction.toFixed(2)}` : '锁定'}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#333', fontSize: 11, lineHeight: 18 }}>
                {kResult.promotable
                  ? `K_faction = ${kResult.kFaction.toFixed(2)}（范围 0.4–1.8）\n包含：风口${isOnWind ? '+0.20' : isOnLose ? '−0.15' : ' 0'}、声望等级 L${getRepLevel(relOf(save, primary as FactionId))}（+${(getRepLevel(relOf(save, primary as FactionId)) * 0.1).toFixed(1)}）`
                  : `晋升被锁定：${kResult.reason}`}
              </Text>
            </View>
          </View>
        </SectionCard>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 1 — 加入 / 我的派系（§2.5）
// ═══════════════════════════════════════════════════════════
function Tab1Join({ save, updateGameSave, showFeedback }: { save: any; updateGameSave: (u: any) => Promise<void>; showFeedback: (m: string, ok?: boolean) => void }) {
  const primary = save.primaryFaction as FactionId | '';
  const wind = save.politicalWind ?? 'balanced';
  const dominant = save.dominantFaction as FactionId | null;

  // 未加入：显示五派公开简介，风向屏蔽
  if (!primary) {
    return (
      <>
        <View style={{ backgroundColor: '#1D3A5C', padding: 14, marginBottom: 10 }}>
          <Text style={{ color: '#FFD700', fontSize: 13, fontWeight: '700', marginBottom: 6 }}>⚠ 尚未站队</Text>
          <Text style={{ color: '#8eb4d8', fontSize: 11, lineHeight: 18 }}>
            当前风向：<Text style={{ color: '#fff', fontWeight: '700' }}>???（信息封锁）</Text>{'\n'}
            各派实时声望对你不可见。主流派与失势派信息在加入后首次揭示。{'\n'}
            站队不可撤销 · 接触他派将被针对 · 被踢则永久失去晋升资格。
          </Text>
        </View>
        {FACTIONS.map(f => (
          <View key={f.key} style={{ backgroundColor: f.headerColor, padding: 14, marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Text style={{ fontSize: 20 }}>{f.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{f.name}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>{f.tagline}</Text>
              </View>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, lineHeight: 16, marginBottom: 8 }}>{f.background}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, marginBottom: 10 }}>势力：{f.stronghold}</Text>
            <ActionBtn
              label={`申请加入「${f.short}」`}
              color={f.accentColor}
              onPress={async () => {
                const updates: Record<string, any> = { primaryFaction: f.key, factionJoinedDay: save.gameDays };
                updates[relField(f.key)] = clamp(relOf(save, f.key) + 20);
                // 首次揭示 dominantFaction
                if (!save.dominantFaction) updates.dominantFaction = getDominantFaction(wind);
                await updateGameSave(updates);
                showFeedback(`✓ 已加入「${f.name}」。风向已揭示，排他忠诚生效，接触他派将被针对。`, true);
              }}
            />
          </View>
        ))}
      </>
    );
  }

  // 已加入：我的派系卡
  const cfg = FACTIONS.find(f => f.key === primary)!;
  const rel = relOf(save, primary);
  const repLv = getRepLevel(rel);
  const isFlagged = save.isFlagged ?? false;
  const isLocked = save.factionlessLocked ?? false;

  return (
    <>
      {/* 主派卡 */}
      <View style={{ backgroundColor: cfg.headerColor, padding: 14, marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Text style={{ fontSize: 28 }}>{cfg.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, letterSpacing: 1 }}>主派归属</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{cfg.name}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>{cfg.tagline}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={{ color: '#FFD700', fontSize: 18, fontWeight: '700' }}>{rel}</Text>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ color: '#fff', fontSize: 9 }}>L{repLv} {REP_LABELS[repLv as keyof typeof REP_LABELS]}</Text>
            </View>
          </View>
        </View>
        {isFlagged && (
          <View style={{ backgroundColor: '#C62828', padding: 8, marginBottom: 8 }}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>🚨 被针对（isFlagged）</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, marginTop: 3, lineHeight: 16 }}>
              本派发现你暗中接触他派。晋升系数 ×0.6，上司好感 ×0.7，累计次数达阈值将被踢出。
            </Text>
          </View>
        )}
        {isLocked && (
          <View style={{ backgroundColor: '#4A148C', padding: 8, marginBottom: 8 }}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>🔒 无派系·晋升锁死</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, marginTop: 3 }}>
              你已被踢出或长期未站队，rankLevel 永久锁死，无法晋升。L4 庇护可豁免一次。
            </Text>
          </View>
        )}
        <View style={{ gap: 5 }}>
          {cfg.perks.map((perk, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
              <Text style={{ color: repLv >= i + 1 ? '#FFD700' : 'rgba(255,255,255,0.3)', fontSize: 11 }}>◆</Text>
              <Text style={{ flex: 1, color: repLv >= i + 1 ? '#fff' : 'rgba(255,255,255,0.3)', fontSize: 10, lineHeight: 15 }}>{perk}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 风向揭示 */}
      <SectionCard accent={dominant ? FACTION_COLOR[dominant] : '#607D8B'}>
        <SLabel text="风向揭示（加入后可见）" />
        <Text style={{ color: '#333', fontSize: 11, lineHeight: 18 }}>
          当前风向：<Text style={{ fontWeight: '700' }}>{WIND_LABEL[wind]}</Text>{'\n'}
          风口主流派：<Text style={{ fontWeight: '700', color: dominant ? FACTION_COLOR[dominant] : '#999' }}>
            {dominant ? FACTION_LABEL[dominant] : '均势·无主流'}
          </Text>
          {primary === dominant ? '  🟢 你在风口' : primary === getLosingFaction(wind) ? '  ⚠ 你处于失势派' : ''}
        </Text>
      </SectionCard>

      {/* 暗中接触（高风险隐藏入口）*/}
      <SectionCard accent="#C62828">
        <SLabel text="⚠ 高风险 · 暗中接触他派" />
        <Text style={{ color: '#555', fontSize: 10, lineHeight: 16, marginBottom: 10 }}>
          累计次数 {save.contactAttempts ?? 0} 次 · 基础暴露率{' '}
          {[15, 30, 55, 80][(save.contactAttempts ?? 0)] ?? 80}%{'\n'}
          成功则绑定边缘关系，失败则本派 relation −30–50，`isFlagged`=true，多次被抓→踢出。{'\n'}
          成本：政绩 500（统一起步价 §2.3）
        </Text>
        {FACTIONS.filter(f => f.key !== primary).map(f => (
          <View key={f.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Text style={{ fontSize: 12 }}>{f.icon}</Text>
            <Text style={{ flex: 1, color: '#333', fontSize: 11 }}>{f.name}</Text>
            <ActionBtn
              label="暗中接触 (-500政绩)"
              color="#C62828"
              disabled={(save.meritPoints ?? 0) < 500}
              onPress={async () => {
                const attempts = (save.contactAttempts ?? 0);
                const exposureRates = [0.15, 0.3, 0.55, 0.8];
                const baseRate = exposureRates[Math.min(attempts, 3)];
                const adjustedRate = baseRate * (1 - (save.factionIntelligence ?? 0) / 200);
                const discovered = Math.random() < adjustedRate;
                const updates: Record<string, any> = {
                  meritPoints: (save.meritPoints ?? 0) - 500,
                  contactAttempts: attempts + 1,
                };
                if (discovered) {
                  const newRel = clamp(relOf(save, primary) - 40);
                  updates[relField(primary)] = newRel;
                  updates.isFlagged = true;
                  if (attempts >= 2) updates.factionlessLocked = true;
                  showFeedback(`⚠ 暴露！本派 relation −40，isFlagged=true${attempts >= 2 ? '·已被踢出' : ''}`, false);
                } else {
                  showFeedback(`✓ 未被发现。${f.name} 已有边缘接触（效果微弱）`, true);
                }
                await updateGameSave(updates);
              }}
            />
          </View>
        ))}
      </SectionCard>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 2 — 关系经营（§2.2 / §2.4 / §D1 修复）
// ═══════════════════════════════════════════════════════════
function Tab2Relations({ save, updateGameSave, showFeedback }: { save: any; updateGameSave: (u: any) => Promise<void>; showFeedback: (m: string, ok?: boolean) => void }) {
  const [expanded, setExpanded] = useState<FactionId | null>(null);
  const primary = save.primaryFaction as FactionId | '';

  const doAction = async (action: FactionAction) => {
    if (isCooldownActive(save.factionCooldowns ?? {}, action.key, save.gameDays)) {
      showFeedback(`冷却中，还需 ${cooldownRemaining(save.factionCooldowns ?? {}, action.key, save.gameDays)} 天`, false); return;
    }
    if (save.rankLevel < action.minRank) {
      showFeedback(`职级不足（需 ${action.minRank} 级）`, false); return;
    }
    const fundCost = action.otherEffects.find(e => e.fundCost)?.fundCost ?? 0;
    if (fundCost > 0 && (save.fundBalance ?? 0) < fundCost) {
      showFeedback(`资金不足，需 ¥${(fundCost / 10000).toFixed(0)}万`, false); return;
    }

    const u: Record<string, any> = {};
    // 主派关系（§3.5 L2 同道：正向行动 +20% 效果）
    const repLv = getRepLevel(relOf(save, action.fkey));
    const effDelta = action.relDelta >= 0 && repLv >= 2 ? Math.round(action.relDelta * 1.2) : action.relDelta;
    Object.assign(u, applyRelDelta(save, action.fkey, effDelta));
    // 副效果
    let meritSum = 0, gdpSum = 0, lifeSum = 0, moralSum = 0;
    for (const e of action.otherEffects) {
      if (e.merit    !== undefined) meritSum  += e.merit;
      if (e.gdpDelta !== undefined) gdpSum    += e.gdpDelta;
      if (e.livelihoodDelta !== undefined) lifeSum += e.livelihoodDelta;
      if (e.moralDelta      !== undefined) moralSum += e.moralDelta;
      if (e.fkey) {
        const delta = action.type === '打压' ? 10 : -8;
        Object.assign(u, applyRelDelta(save, e.fkey, delta));
      }
    }
    if (meritSum)  u.meritPoints     = clamp((save.meritPoints ?? 0) + meritSum, 0, 9999);
    if (gdpSum)    u.cityGdp         = clamp((save.cityGdp ?? 50) + gdpSum);
    if (lifeSum)   u.cityLivelihood  = clamp((save.cityLivelihood ?? 50) + lifeSum);
    if (moralSum)  u.moralValue      = clamp((save.moralValue ?? 50) + moralSum);
    if (fundCost)  u.fundBalance     = Math.max(0, (save.fundBalance ?? 0) - fundCost);
    // 持久化冷却（§D1 修复）
    u.factionCooldowns = setCooldown(save.factionCooldowns ?? {}, action.key, save.gameDays, action.cooldown);

    await updateGameSave(u);
    const sign = action.relDelta >= 0 ? '+' : '';
    showFeedback(`✓ ${action.label}：${FACTION_LABEL[action.fkey]}关系${sign}${action.relDelta}，政绩+${meritSum}`, action.type !== '打压');
  };

  return (
    <>
      {FACTIONS.map(f => {
        const rel = relOf(save, f.key);
        const repLv = getRepLevel(rel);
        const isMyFaction = f.key === primary;
        const isLocked = !!primary && !isMyFaction;
        const isExp = expanded === f.key;
        const actions = FACTION_ACTIONS.filter(a => a.fkey === f.key);

        return (
          <View key={f.key} style={{ backgroundColor: '#fff', borderTopWidth: 3, borderTopColor: f.headerColor, borderWidth: 1, borderColor: '#E5E5E5', marginBottom: 8 }}>
            <Pressable onPress={() => setExpanded(isExp ? null : f.key)} style={{ padding: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 16 }}>{f.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Text style={{ color: '#222', fontSize: 12, fontWeight: '700' }}>{f.name}</Text>
                    {isMyFaction && <View style={{ backgroundColor: f.headerColor, paddingHorizontal: 4, paddingVertical: 1 }}><Text style={{ color: '#FFD700', fontSize: 7, fontWeight: '700' }}>主派</Text></View>}
                    {isLocked && <Text style={{ color: '#C62828', fontSize: 8 }}>已站队·禁止接触</Text>}
                  </View>
                  <Text style={{ color: '#888', fontSize: 9, marginTop: 1 }}>L{repLv} {REP_LABELS[repLv as keyof typeof REP_LABELS]}  ·  {f.tagline}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: f.accentColor, fontSize: 16, fontWeight: '700' }}>{rel}</Text>
                  <Text style={{ color: '#888', fontSize: 9 }}>{isExp ? '▲' : '▼'}</Text>
                </View>
              </View>
              <View style={{ marginTop: 8 }}>
                <RelBar value={rel} color={f.accentColor} />
              </View>
            </Pressable>

            {isExp && (
              <View style={{ borderTopWidth: 1, borderTopColor: '#F0F0F0', padding: 12 }}>
                {/* 声望特权预览 */}
                <Text style={{ fontSize: 9, color: '#888', marginBottom: 6 }}>
                  {[1, 2, 3, 4].map(lv =>
                    `L${lv}${repLv >= lv ? '✓' : '○'} ${REP_PERKS[lv]}`
                  ).join('  ·  ')}
                </Text>
                {/* 关系行动 */}
                {isLocked ? (
                  <View style={{ backgroundColor: '#FFF3E0', borderWidth: 1, borderColor: '#FFB300', padding: 10 }}>
                    <Text style={{ color: '#E65100', fontSize: 11, fontWeight: '700' }}>🔒 已站队 · 禁止接触</Text>
                    <Text style={{ color: '#555', fontSize: 10, marginTop: 4, lineHeight: 15 }}>
                      加入本派后，其他派系行动入口锁定。如需接触，请使用 Tab 1「暗中接触」高风险入口（政绩 500，存在暴露风险）。
                    </Text>
                  </View>
                ) : actions.filter(a => a.minRank <= (save.rankLevel ?? 0)).map(action => {
                  const cd = save.factionCooldowns ?? {};
                  const cooling = isCooldownActive(cd, action.key, save.gameDays);
                  const left = cooling ? cooldownRemaining(cd, action.key, save.gameDays) : 0;
                  return (
                    <View key={action.key} style={{ marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', paddingBottom: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                        <View style={{ backgroundColor: action.type === '打压' ? '#FFEBEE' : '#E3F2FD', paddingHorizontal: 4, paddingVertical: 1 }}>
                          <Text style={{ fontSize: 8, color: action.type === '打压' ? '#C62828' : '#1565C0', fontWeight: '700' }}>{action.type}</Text>
                        </View>
                        <Text style={{ flex: 1, color: '#222', fontSize: 11, fontWeight: '600' }}>{action.label}</Text>
                        {cooling && <CooldownBadge days={left} />}
                      </View>
                      <Text style={{ color: '#666', fontSize: 10, lineHeight: 15, marginBottom: 6 }}>{action.desc}</Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 9, color: '#999' }}>
                          关系{action.relDelta >= 0 ? '+' : ''}{action.relDelta} · 冷却{action.cooldown}天 · 风险{action.riskLevel}
                        </Text>
                        <ActionBtn label="执行" onPress={() => doAction(action)} disabled={cooling} color={action.type === '打压' ? '#C62828' : f.accentColor} />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
      {/* §3.9 跨派临时联盟 */}
      {primary && (
        <View style={{ backgroundColor: '#fff', borderTopWidth: 3, borderTopColor: '#6A1B9A', borderWidth: 1, borderColor: '#E5E5E5', padding: 12, marginTop: 4 }}>
          <Text style={{ color: '#6A1B9A', fontSize: 12, fontWeight: '700' }}>🤝 跨派临时联盟</Text>
          <Text style={{ color: '#888', fontSize: 9, marginTop: 3, lineHeight: 14 }}>
            与主派关系均 ≥50 的派系可缔结 60 天联盟（政绩 500，local×reform 互斥需 1000）。联盟内派系在晋升投票/斗争记票中合并票数；同盟期间个人职位战 sYou +{Math.round(COALITION_CONTEST_BONUS * 100)}%，结契时双方关系互惠提升。
          </Text>
          {getActiveCoalitions(save.coalitions ?? [], save.gameDays).map((c, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F3E5F5', padding: 8, marginTop: 6 }}>
              <Text style={{ color: '#4A148C', fontSize: 10, fontWeight: '600' }}>{FACTION_SHORT[c.a]} ⟷ {FACTION_SHORT[c.b]}</Text>
              <Text style={{ color: '#7B1FA2', fontSize: 10 }}>剩 {Math.max(0, c.endDay - save.gameDays)} 天</Text>
            </View>
          ))}
          {FACTIONS.filter(f => f.key !== primary).map(f => {
            const canForm = canFormCoalition(primary as FactionId, f.key) && relOf(save, primary as FactionId) >= 50 && relOf(save, f.key) >= 50;
            const isMutual = (primary === 'local' && f.key === 'reform') || (primary === 'reform' && f.key === 'local');
            const cost = isMutual ? 1000 : 500;
            return (
              <Pressable key={f.key} disabled={!canForm || (save.meritPoints ?? 0) < cost}
                onPress={async () => {
                  if ((save.meritPoints ?? 0) < cost) { showFeedback(`政绩不足，需 ${cost}`, false); return; }
                  const next = [...(save.coalitions ?? []), { a: primary as FactionId, b: f.key, endDay: save.gameDays + 60 }];
                  // C. 结契互惠：双方关系小幅提升
                  const boostA = applyRelDeltaToSave(save, primary as FactionId, COALITION_FORM_RELATION_BOOST);
                  const boostB = applyRelDeltaToSave(save, f.key, COALITION_FORM_RELATION_BOOST);
                  await updateGameSave({ meritPoints: Math.max(0, (save.meritPoints ?? 0) - cost), coalitions: next, ...boostA, ...boostB });
                  showFeedback(`✓ 与${FACTION_LABEL[f.key]}缔结联盟（−${cost} 政绩，60 天，双方关系+${COALITION_FORM_RELATION_BOOST}）`, true);
                }}
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', opacity: canForm ? 1 : 0.4 }}>
                <View>
                  <Text style={{ color: '#333', fontSize: 11, fontWeight: '600' }}>{f.icon} {f.name}</Text>
                  <Text style={{ color: '#999', fontSize: 9 }}>关系 {relOf(save, f.key)} · {canForm ? `政绩 ${cost}` : '关系不足'}</Text>
                </View>
                <View style={{ backgroundColor: canForm ? '#6A1B9A' : '#ccc', paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>缔结</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </>
  );
}
// ═══════════════════════════════════════════════════════════
function Tab3Policy({ save, updateGameSave, showFeedback }: { save: any; updateGameSave: (u: any) => Promise<void>; showFeedback: (m: string, ok?: boolean) => void }) {
  const doStance = async (p: PolicyStance) => {
    const cd = save.factionCooldowns ?? {};
    if (isCooldownActive(cd, p.key, save.gameDays)) {
      showFeedback(`冷却中，还需 ${cooldownRemaining(cd, p.key, save.gameDays)} 天`, false); return;
    }
    const u: Record<string, any> = {};
    for (const e of p.effects) Object.assign(u, applyRelDelta(save, e.fkey, e.delta));
    if (p.merit)           u.meritPoints    = clamp((save.meritPoints ?? 0) + p.merit, 0, 9999);
    if (p.gdpDelta)        u.cityGdp        = clamp((save.cityGdp ?? 50) + p.gdpDelta);
    if (p.livelihoodDelta) u.cityLivelihood = clamp((save.cityLivelihood ?? 50) + p.livelihoodDelta);
    // 收益累积 factionInfluence（§2.3）
    u.factionInfluence = clamp((save.factionInfluence ?? 0) + 2);
    u.factionCooldowns = setCooldown(cd, p.key, save.gameDays, p.cooldown);
    await updateGameSave(u);
    const gains = p.effects.filter(e => e.delta > 0).map(e => `${FACTION_SHORT[e.fkey]}+${e.delta}`).join(' ');
    const losses = p.effects.filter(e => e.delta < 0).map(e => `${FACTION_SHORT[e.fkey]}${e.delta}`).join(' ');
    showFeedback(`✓「${p.title}」：${gains}${losses ? '  ' + losses : ''}  政绩+${p.merit}`, true);
  };

  return (
    <>
      {POLICY_STANCES.map(p => {
        const cd = save.factionCooldowns ?? {};
        const cooling = isCooldownActive(cd, p.key, save.gameDays);
        const left = cooling ? cooldownRemaining(cd, p.key, save.gameDays) : 0;
        return (
          <SectionCard key={p.key}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#222', fontSize: 12, fontWeight: '700', marginBottom: 2 }}>{p.title}</Text>
                <Text style={{ color: '#666', fontSize: 10 }}>{p.subtitle}</Text>
              </View>
              {cooling && <CooldownBadge days={left} />}
            </View>
            <Text style={{ color: '#555', fontSize: 10, lineHeight: 15, marginBottom: 8 }}>{p.background}</Text>
            {/* 效果矩阵 */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
              {p.effects.map(e => (
                <View key={e.fkey} style={{ backgroundColor: e.delta > 0 ? '#E8F5E9' : '#FFEBEE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 }}>
                  <Text style={{ fontSize: 9, color: e.delta > 0 ? '#2E7D32' : '#C62828', fontWeight: '700' }}>
                    {FACTION_SHORT[e.fkey]}{e.delta > 0 ? '+' : ''}{e.delta}
                  </Text>
                </View>
              ))}
              <View style={{ backgroundColor: '#E3F2FD', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 }}>
                <Text style={{ fontSize: 9, color: '#1565C0', fontWeight: '700' }}>政绩+{p.merit}</Text>
              </View>
            </View>
            <View style={{ backgroundColor: '#FFF8E1', borderLeftWidth: 3, borderLeftColor: '#F9A825', padding: 7, marginBottom: 10 }}>
              <Text style={{ color: '#5D4037', fontSize: 9, lineHeight: 14 }}>⚠ {p.risk}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: '#999', fontSize: 9 }}>冷却 {p.cooldown} 天  ·  GDP{p.gdpDelta >= 0 ? '+' : ''}{p.gdpDelta}  ·  民生{p.livelihoodDelta >= 0 ? '+' : ''}{p.livelihoodDelta}</Text>
              <ActionBtn label="发表表态" onPress={() => doStance(p)} disabled={cooling} color="#2B4B6F" />
            </View>
          </SectionCard>
        );
      })}
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 4 — 派系委托（§3.1）
// ═══════════════════════════════════════════════════════════
function Tab4Commissions({ save }: { save: any }) {
  const primary = save.primaryFaction as FactionId | '';
  const cfg = FACTIONS.find(f => f.key === primary);

  const DUMMY_COMMISSIONS: Record<FactionId, { title: string; desc: string; reward: string; deadline: number }[]> = {
    reform: [
      { title: '自贸区政策调研报告', desc: '完成一份自贸区制度创新调研，提交发改委评审。', reward: '关系+15，政绩+30', deadline: 90 },
      { title: '营商环境优化白皮书', desc: '联合改革派撰写营商环境报告，对标国际标准。', reward: '关系+12，政绩+25，GDP+3', deadline: 120 },
    ],
    pragmatic: [
      { title: '党建示范点验收报告', desc: '完成辖区党建示范工程验收并撰写汇报材料。', reward: '关系+15，政绩+28', deadline: 60 },
      { title: '意识形态安全工作汇报', desc: '开展网络舆情专项整治并向上级汇报成效。', reward: '关系+10，政绩+20', deadline: 90 },
    ],
    cyl: [
      { title: '青年就业帮扶专项计划', desc: '策划落地青年创业帮扶计划，并上报团系系统。', reward: '关系+15，政绩+22，民生+5', deadline: 90 },
      { title: '基层群众满意度调研', desc: '入户走访并形成群众工作调研报告。', reward: '关系+12，政绩+18', deadline: 60 },
    ],
    techno: [
      { title: '数字政府建设项目推进', desc: '推动数字政务系统升级，完成验收并提交总结。', reward: '关系+15，政绩+30，GDP+5', deadline: 120 },
      { title: '科研经费使用审计报告', desc: '配合科技部完成专项科研经费审计，保障合规。', reward: '关系+10，政绩+20，情报+5', deadline: 75 },
    ],
    local: [
      { title: '基建项目阶段性推进报告', desc: '完成辖区重点基建项目阶段目标并汇报进展。', reward: '关系+15，政绩+25，GDP+4', deadline: 90 },
      { title: '土地整备专项行动总结', desc: '推进土地整备工作并上报整备成效。', reward: '关系+12，政绩+20', deadline: 75 },
    ],
  };

  if (!primary || !cfg) {
    return (
      <SectionCard>
        <SLabel text="派系委托" />
        <Text style={{ color: '#888', fontSize: 11, textAlign: 'center', padding: 20 }}>请先在「我的派系」Tab 加入一个派系以解锁委托。</Text>
      </SectionCard>
    );
  }

  const commissions = DUMMY_COMMISSIONS[primary] ?? [];

  return (
    <>
      <SectionCard accent={cfg.headerColor}>
        <SLabel text={`${cfg.name} 派系委托`} />
        <Text style={{ color: '#555', fontSize: 10, lineHeight: 16, marginBottom: 10 }}>
          主派每 30 天生成 0–1 条新委托（上限 5 条）。完成给主派关系+、政绩+；超时给关系−、政绩扣减。委托完成度计入声望等级。
        </Text>
        {commissions.map((c, i) => (
          <View key={i} style={{ backgroundColor: '#F8F8F8', padding: 10, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: cfg.accentColor }}>
            <Text style={{ color: '#222', fontSize: 12, fontWeight: '700', marginBottom: 4 }}>{c.title}</Text>
            <Text style={{ color: '#555', fontSize: 10, lineHeight: 15, marginBottom: 6 }}>{c.desc}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#2E7D32', fontSize: 9, fontWeight: '700' }}>{c.reward}</Text>
              <Text style={{ color: '#888', fontSize: 9 }}>期限：{c.deadline} 天</Text>
            </View>
          </View>
        ))}
        <View style={{ backgroundColor: '#FFF3E0', padding: 8, borderRadius: 2 }}>
          <Text style={{ color: '#E65100', fontSize: 9, lineHeight: 14 }}>
            ℹ 委托完整后端逻辑将在后续阶段接入 tasks 系统（§3.1 / §7·步骤 4）。当前展示示例委托。
          </Text>
        </View>
      </SectionCard>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 5 — 声望特权树（§2.2 / §3.5）
// ═══════════════════════════════════════════════════════════
function Tab5RepTree({ save }: { save: any }) {
  return (
    <>
      {FACTIONS.map(f => {
        const rel = relOf(save, f.key);
        const lv = getRepLevel(rel);
        const isPrimary = save.primaryFaction === f.key;
        return (
          <SectionCard key={f.key} accent={f.headerColor}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Text style={{ fontSize: 16 }}>{f.icon}</Text>
              <Text style={{ flex: 1, color: '#222', fontSize: 12, fontWeight: '700' }}>{f.name}</Text>
              {isPrimary && <View style={{ backgroundColor: f.headerColor, paddingHorizontal: 5, paddingVertical: 2 }}><Text style={{ color: '#FFD700', fontSize: 8, fontWeight: '700' }}>主派</Text></View>}
              <Text style={{ color: f.accentColor, fontSize: 13, fontWeight: '700' }}>L{lv} / L4</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
              {[0, 1, 2, 3, 4].map(l => (
                <View key={l} style={{ flex: 1, alignItems: 'center' }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: lv >= l ? f.accentColor : '#E5E5E5', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                    <Text style={{ color: lv >= l ? '#fff' : '#bbb', fontSize: 10, fontWeight: '700' }}>L{l}</Text>
                  </View>
                  <Text style={{ color: '#666', fontSize: 7, textAlign: 'center' }}>
                    {l === 0 ? '陌路' : l === 1 ? '相识' : l === 2 ? '同道' : l === 3 ? '心腹' : '核心'}
                  </Text>
                </View>
              ))}
            </View>
            <View style={{ gap: 5 }}>
              {[1, 2, 3, 4].map(l => (
                <View key={l} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, opacity: lv >= l ? 1 : 0.4 }}>
                  <Text style={{ fontSize: 10, color: lv >= l ? '#FFD700' : '#bbb', fontWeight: '700' }}>L{l}</Text>
                  <Text style={{ flex: 1, color: lv >= l ? '#222' : '#999', fontSize: 10, lineHeight: 15 }}>
                    {REP_PERKS[l]}
                    {l === 4 && isPrimary && lv < 4 ? `（需关系≥80，当前${rel}）` : ''}
                  </Text>
                </View>
              ))}
            </View>
          </SectionCard>
        );
      })}
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 6 — 路线斗争事件（§3.2）
// ═══════════════════════════════════════════════════════════
function Tab6LineStruggle({ save, updateGameSave, showFeedback }: { save: any; updateGameSave: (u: any) => Promise<void>; showFeedback: (m: string, ok?: boolean) => void }) {
  // 判断是否触发（任意两派 relation 差 ≥30）
  const pairs: [FactionId, FactionId, number][] = [];
  for (let i = 0; i < ALL_FACTIONS.length; i++) {
    for (let j = i + 1; j < ALL_FACTIONS.length; j++) {
      const diff = Math.abs(relOf(save, ALL_FACTIONS[i]) - relOf(save, ALL_FACTIONS[j]));
      if (diff >= 30) pairs.push([ALL_FACTIONS[i], ALL_FACTIONS[j], diff]);
    }
  }
  const triggered = pairs.length > 0;
  const topPair = pairs.sort((a, b) => b[2] - a[2])[0];

  const doChoice = async (choice: 'a' | 'b' | 'mediate') => {
    if (!topPair) return;
    const [fa, fb] = topPair;
    const u: Record<string, any> = {};
    if (choice === 'a') {
      Object.assign(u, applyRelDelta(save, fa, 15));
      Object.assign(u, applyRelDelta(save, fb, -10));
      u.meritPoints = clamp((save.meritPoints ?? 0) - 500, 0, 9999);
      showFeedback(`✓ 站队${FACTION_SHORT[fa]}：关系+15，${FACTION_SHORT[fb]}−10，政绩−500`, true);
    } else if (choice === 'b') {
      Object.assign(u, applyRelDelta(save, fb, 15));
      Object.assign(u, applyRelDelta(save, fa, -10));
      u.meritPoints = clamp((save.meritPoints ?? 0) - 500, 0, 9999);
      showFeedback(`✓ 站队${FACTION_SHORT[fb]}：关系+15，${FACTION_SHORT[fa]}−10，政绩−500`, true);
    } else {
      Object.assign(u, applyRelDelta(save, fa, 3));
      Object.assign(u, applyRelDelta(save, fb, 3));
      u.factionInfluence = clamp((save.factionInfluence ?? 0) - 5);
      showFeedback('和稀泥：两派各+3，但影响力−5（骑墙）', true);
    }
    u.factionCooldowns = setCooldown(save.factionCooldowns ?? {}, 'line_struggle', save.gameDays, 14);
    await updateGameSave(u);
  };

  const isInCooldown = isCooldownActive(save.factionCooldowns ?? {}, 'line_struggle', save.gameDays);

  return (
    <>
      {!triggered ? (
        <SectionCard>
          <SLabel text="路线斗争事件" />
          <Text style={{ color: '#888', fontSize: 11, textAlign: 'center', padding: 20 }}>
            当前五派关系差均 {'<'}30，暂无路线斗争事件。{'\n'}触发条件：任意两派 relation 差 ≥30。
          </Text>
        </SectionCard>
      ) : (
        <SectionCard accent="#C62828">
          <SLabel text="⚡ 路线斗争事件触发" />
          <Text style={{ color: '#222', fontSize: 13, fontWeight: '700', marginBottom: 6 }}>
            {topPair && `${FACTION_LABEL[topPair[0]]} vs ${FACTION_LABEL[topPair[1]]}`}
          </Text>
          <Text style={{ color: '#555', fontSize: 10, lineHeight: 16, marginBottom: 10 }}>
            两派路线分歧激化（差距 {topPair?.[2]} 点），要求你在关键会议上表态。{'\n'}
            政绩成本：500（§2.3 标准起步价）
          </Text>
          {isInCooldown ? (
            <View style={{ backgroundColor: '#F5F5F5', padding: 10, alignItems: 'center' }}>
              <Text style={{ color: '#888', fontSize: 11 }}>等待下次事件 · 冷却 {cooldownRemaining(save.factionCooldowns ?? {}, 'line_struggle', save.gameDays)} 天</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {topPair && (
                <>
                  <ActionBtn label={`站队 ${FACTION_LABEL[topPair[0]]} · 关系+15，−10另派 (−500政绩)`} color={FACTION_BG[topPair[0]]} onPress={() => doChoice('a')} disabled={(save.meritPoints ?? 0) < 500} />
                  <ActionBtn label={`站队 ${FACTION_LABEL[topPair[1]]} · 关系+15，−10另派 (−500政绩)`} color={FACTION_BG[topPair[1]]} onPress={() => doChoice('b')} disabled={(save.meritPoints ?? 0) < 500} />
                  <ActionBtn label="和稀泥 · 两派各+3，影响力−5（无政绩成本）" color="#607D8B" onPress={() => doChoice('mediate')} />
                </>
              )}
            </View>
          )}
        </SectionCard>
      )}
      {/* 历史 */}
      <SectionCard>
        <SLabel text="历史路线日志" />
        <Text style={{ color: '#aaa', fontSize: 10, textAlign: 'center', padding: 10 }}>（历史日志接入 §3.2 事件总线后展示）</Text>
      </SectionCard>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 7 — 领导班子合力（§3.4 / §4.3）
// ═══════════════════════════════════════════════════════════
function Tab7Band({ save }: { save: any }) {
  // 使用 leadershipBand 数据（若存在）
  const band: { faction?: FactionId }[] = save.leadershipBand ?? [];
  const factionList: FactionId[] = band.map(m => m.faction).filter(Boolean) as FactionId[];
  const synergy = factionList.length > 0 ? calcBandSynergy(factionList) : 1.0;

  // 统计各派占比
  const countMap: Partial<Record<FactionId, number>> = {};
  for (const f of factionList) countMap[f] = (countMap[f] ?? 0) + 1;

  const synergyDesc = synergy >= 1.1 ? (synergy >= 1.15 ? '同派团结（同质风险↑）' : '跨派均衡（抗风险）') : '严重对立（内耗）';

  return (
    <>
      <SectionCard>
        <SLabel text="班子派系合力（bandSynergy）" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <Text style={{ fontSize: 36, fontWeight: '700', color: synergy >= 1.0 ? '#2E7D32' : '#C62828' }}>
            {synergy.toFixed(2)}
          </Text>
          <View>
            <Text style={{ color: '#222', fontSize: 12, fontWeight: '700' }}>× calcBandBonus</Text>
            <Text style={{ color: '#888', fontSize: 10, marginTop: 2 }}>{synergyDesc}</Text>
          </View>
        </View>
        <Text style={{ color: '#555', fontSize: 10, lineHeight: 16 }}>
          同派≥60%→1.15（团结但脆弱）  均衡→1.10  严重对立（差&gt;40%）→0.85{'\n'}
          派系斗争失败会清除败派班子成员，系数随权力格局实时重算（§3.11④）。
        </Text>
      </SectionCard>

      <SectionCard>
        <SLabel text="班子派系构成" />
        {factionList.length === 0 ? (
          <Text style={{ color: '#aaa', fontSize: 10, textAlign: 'center', padding: 12 }}>班子数据加载中（需接入 leadership.tsx §4.3）</Text>
        ) : (
          <>
            {ALL_FACTIONS.map(f => {
              const cnt = countMap[f] ?? 0;
              const pct = factionList.length > 0 ? cnt / factionList.length : 0;
              return (
                <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Text style={{ color: '#333', fontSize: 11, width: 50 }}>{FACTION_SHORT[f]}</Text>
                  <View style={{ flex: 1, height: 10, backgroundColor: '#E5E5E5', borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ height: 10, width: `${pct * 100}%`, backgroundColor: FACTION_COLOR[f], borderRadius: 3 }} />
                  </View>
                  <Text style={{ color: '#555', fontSize: 10, width: 40, textAlign: 'right' }}>{cnt}人 ({(pct * 100).toFixed(0)}%)</Text>
                </View>
              );
            })}
          </>
        )}
      </SectionCard>

      <SectionCard>
        <SLabel text="四大班子 chair 派系（§4.6）" />
        <Text style={{ color: '#888', fontSize: 10, lineHeight: 16 }}>
          四大班子 chair 带 factionId；玩家在四大班子的行动若与 chair 同派，meritGain ×1.15。{'\n'}
          后续阶段将读取 leadership.tsx 中 buildFourOrgans() 数据，本页暂显接口说明。
        </Text>
      </SectionCard>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 8 — 政绩工程（§3.12）
// ═══════════════════════════════════════════════════════════
function Tab8Projects({ save, updateGameSave, showFeedback }: { save: any; updateGameSave: (u: any) => Promise<void>; showFeedback: (m: string, ok?: boolean) => void }) {
  const primary = save.primaryFaction as FactionId | '';
  const PROJECTS: Record<FactionId, { title: string; cityBoost: string; meritReturn: number; desc: string }> = {
    reform:    { title: '自贸区专项试点工程', cityBoost: 'GDP +8, 招商 +10', meritReturn: 1000, desc: '认领改革派旗舰项目，GDP 与招商引资双提升，对立派上司可能扣好感。' },
    pragmatic: { title: '维稳专项行动', cityBoost: '稳定指数 +10, 治安 +5', meritReturn: 800, desc: '认领国家系旗舰项目，稳定与治安大幅提升，改革派上司可能扣好感。' },
    cyl:       { title: '民生实事三联计划', cityBoost: '医疗 +8, 教育 +8, 民生 +6', meritReturn: 900, desc: '认领团系旗舰项目，三大民生指标同步提升，对技官系上司影响中性。' },
    techno:    { title: '数字政府基础设施工程', cityBoost: 'GDP +6, 数字治理 +12', meritReturn: 950, desc: '认领技官系旗舰项目，数字治理大幅提升并带动 GDP，地方派上司可能有异议。' },
    local:     { title: '土地整备与基建推进', cityBoost: '财政 +10, GDP +5', meritReturn: 850, desc: '认领地方派旗舰项目，财政与 GDP 提升，但长期 integrity 承压（§4.7）。' },
  };

  if (!primary) {
    return (
      <SectionCard>
        <SLabel text="政绩工程" />
        <Text style={{ color: '#888', fontSize: 11, textAlign: 'center', padding: 20 }}>请先加入派系以解锁主派专属政绩工程。</Text>
      </SectionCard>
    );
  }

  const proj = PROJECTS[primary];
  const coolKey = `merit_proj_${primary}`;
  const cd = save.factionCooldowns ?? {};
  const cooling = isCooldownActive(cd, coolKey, save.gameDays);
  const left = cooling ? cooldownRemaining(cd, coolKey, save.gameDays) : 0;

  return (
    <>
      <SectionCard accent={FACTION_BG[primary]}>
        <SLabel text={`${FACTION_SHORT[primary as FactionId]} 专属政绩工程`} />
        <Text style={{ color: '#222', fontSize: 14, fontWeight: '700', marginBottom: 6 }}>{proj.title}</Text>
        <Text style={{ color: '#555', fontSize: 10, lineHeight: 16, marginBottom: 8 }}>{proj.desc}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <View>
            <Text style={{ color: '#888', fontSize: 9 }}>城市指标</Text>
            <Text style={{ color: '#2E7D32', fontSize: 11, fontWeight: '700' }}>{proj.cityBoost}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#888', fontSize: 9 }}>政绩回报（双倍）</Text>
            <Text style={{ color: '#1565C0', fontSize: 11, fontWeight: '700' }}>+{proj.meritReturn}</Text>
          </View>
        </View>
        <View style={{ backgroundColor: '#FFF3E0', borderLeftWidth: 3, borderLeftColor: '#F57C00', padding: 8, marginBottom: 10 }}>
          <Text style={{ color: '#555', fontSize: 9, lineHeight: 14 }}>
            成本：政绩 500（§2.3 起步价）认领后 120 天交付，届时获双倍政绩回报+{proj.meritReturn}，提前退出关系−10、政绩−200。
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          {cooling && <CooldownBadge days={left} />}
          <ActionBtn
            label={cooling ? `冷却中（${left}天）` : '认领（−500 政绩）'}
            color={FACTION_BG[primary]}
            disabled={cooling || (save.meritPoints ?? 0) < 500}
            onPress={async () => {
              const u: Record<string, any> = {
                meritPoints: clamp((save.meritPoints ?? 0) - 500, 0, 9999),
                factionCooldowns: setCooldown(cd, coolKey, save.gameDays, 120),
              };
              Object.assign(u, applyRelDelta(save, primary, 8));
              await updateGameSave(u);
              showFeedback(`✓ 已认领「${proj.title}」，120 天后交付可得政绩+${proj.meritReturn}`, true);
            }}
          />
        </View>
      </SectionCard>
      <SectionCard>
        <SLabel text="全局联动说明" />
        <Text style={{ color: '#666', fontSize: 10, lineHeight: 16 }}>
          政绩工程认领后直接走 updateCityMetric / 政绩结算（§4.7），把"派系色彩"注入政绩系统。对立派上司会因此扣好感（§4.4），迫使"先理顺派系关系、再推政绩工程"。
        </Text>
      </SectionCard>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 9 — 策略面板（§3.13 游说 / §3.15 舆论 / §3.16 输送）
// ═══════════════════════════════════════════════════════════
function Tab9Strategy({ save, updateGameSave, showFeedback }: { save: any; updateGameSave: (u: any) => Promise<void>; showFeedback: (m: string, ok?: boolean) => void }) {
  const cd = save.factionCooldowns ?? {};

  const doLobby = async (fkey: FactionId) => {
    if (isCooldownActive(cd, `lobby_${fkey}`, save.gameDays)) { showFeedback('游说冷却中', false); return; }
    if ((save.factionIntelligence ?? 0) < 40) { showFeedback('情报不足（需≥40）', false); return; }
    if ((save.meritPoints ?? 0) < 1000) { showFeedback('政绩不足（需 1000）', false); return; }
    const u: Record<string, any> = {
      meritPoints: clamp((save.meritPoints ?? 0) - 1000, 0, 9999),
      factionCooldowns: setCooldown(cd, `lobby_${fkey}`, save.gameDays, 120),
    };
    Object.assign(u, applyRelDelta(save, fkey, 8));
    await updateGameSave(u);
    showFeedback(`✓ 向${FACTION_LABEL[fkey]}游说，下轮政策触发权重+1.5×，关系+8，政绩−1000`, true);
  };

  const doMedia = async () => {
    if (isCooldownActive(cd, 'media_war', save.gameDays)) { showFeedback('舆论战冷却中', false); return; }
    if ((save.meritPoints ?? 0) < 500) { showFeedback('政绩不足（需 500）', false); return; }
    const u: Record<string, any> = {
      meritPoints: clamp((save.meritPoints ?? 0) - 500, 0, 9999),
      cityLivelihood: clamp((save.cityLivelihood ?? 50) + 3),
      factionInfluence: clamp((save.factionInfluence ?? 0) + 5),
      factionCooldowns: setCooldown(cd, 'media_war', save.gameDays, 30),
    };
    await updateGameSave(u);
    showFeedback('✓ 舆论攻势发动：民生+3，影响力+5，政绩−500', true);
  };

  const doPatronage = async () => {
    if (isCooldownActive(cd, 'patronage', save.gameDays)) { showFeedback('资源输送冷却中', false); return; }
    const u: Record<string, any> = {
      fundBalance: clamp((save.fundBalance ?? 0) + 200000),
      factionInfluence: clamp((save.factionInfluence ?? 0) + 3),
      purgeCount: (save.purgeCount ?? 0) + 0, // 累积落马风险（后期接入落马结局）
      factionCooldowns: setCooldown(cd, 'patronage', save.gameDays, 60),
    };
    await updateGameSave(u);
    showFeedback('⚠ 已接收资源输送：资金+20万，影响力+3，但落马风险账目留痕（§3.16）', false);
  };

  return (
    <>
      {/* 政策游说 */}
      <SectionCard accent="#1565C0">
        <SLabel text="派系游说全国政策（§3.13）" />
        <Text style={{ color: '#555', fontSize: 10, lineHeight: 16, marginBottom: 10 }}>
          成本：政绩 1000（策略级）+ 情报 ≥40。推动下轮政策池中本派 favoredFaction 运动触发权重 +1.5×（持续一个周期）。
        </Text>
        <View style={{ gap: 8 }}>
          {ALL_FACTIONS.map(f => {
            const cooling = isCooldownActive(cd, `lobby_${f}`, save.gameDays);
            const left2 = cooling ? cooldownRemaining(cd, `lobby_${f}`, save.gameDays) : 0;
            return (
              <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 12 }}>{FACTIONS.find(x => x.key === f)?.icon}</Text>
                <Text style={{ flex: 1, color: '#333', fontSize: 11 }}>{FACTION_LABEL[f]} 政策游说</Text>
                {cooling ? <CooldownBadge days={left2} /> : <ActionBtn label="-1000政绩" color="#1565C0" onPress={() => doLobby(f)} />}
              </View>
            );
          })}
        </View>
      </SectionCard>

      {/* 舆论战 */}
      <SectionCard accent="#2E7D32">
        <SLabel text="派系舆论战（§3.15）" />
        <Text style={{ color: '#555', fontSize: 10, lineHeight: 16, marginBottom: 10 }}>
          成本：政绩 500。在本派媒体发动叙事，提升治安/民心指标，激怒对立派（关系−）。与 §4.7 城市指标形成"舆论—指标—派系"闭环。
        </Text>
        {isCooldownActive(cd, 'media_war', save.gameDays) ? (
          <CooldownBadge days={cooldownRemaining(cd, 'media_war', save.gameDays)} />
        ) : (
          <ActionBtn label="发动舆论攻势（−500 政绩）" color="#2E7D32" onPress={doMedia} disabled={(save.meritPoints ?? 0) < 500} />
        )}
      </SectionCard>

      {/* 资源输送 */}
      <SectionCard accent="#C62828">
        <SLabel text="资源输送·落马风险（§3.16）" />
        <Text style={{ color: '#555', fontSize: 10, lineHeight: 16, marginBottom: 6 }}>
          接受资源输送获得短期 finance↑，但账目留痕，落马结局触发概率随输送量累积上升。对立派在清洗/斗争得势时将直接触发落马。
        </Text>
        <View style={{ backgroundColor: '#FFEBEE', padding: 8, marginBottom: 10 }}>
          <Text style={{ color: '#C62828', fontSize: 9, fontWeight: '700' }}>当前累积次数：{save.purgeCount ?? 0} · 落马风险随次数线性增长</Text>
        </View>
        {isCooldownActive(cd, 'patronage', save.gameDays) ? (
          <CooldownBadge days={cooldownRemaining(cd, 'patronage', save.gameDays)} />
        ) : (
          <ActionBtn label="接收资源输送（+20万资金，落马风险↑）" color="#C62828" onPress={doPatronage} />
        )}
      </SectionCard>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 10 — 情报下注（§2.3 / §3.3 / §3.7）
// ═══════════════════════════════════════════════════════════
function Tab10Intel({ save, updateGameSave, showFeedback }: { save: any; updateGameSave: (u: any) => Promise<void>; showFeedback: (m: string, ok?: boolean) => void }) {
  const intel = save.factionIntelligence ?? 0;
  const cd = save.factionCooldowns ?? {};
  const WINDS: Array<{ key: string; label: string }> = [
    { key: 'reform-heavy', label: '改革开放路线主导' },
    { key: 'pragmatic-heavy', label: '稳健国家路线主导' },
    { key: 'techno-surge', label: '技术官僚路线主导' },
    { key: 'local-crackdown', label: '地方纪律整肃路线' },
    { key: 'balanced', label: '路线均衡' },
  ];
  const [betWind, setBetWind] = useState<string>('');

  return (
    <>
      <SectionCard>
        <SLabel text="派系情报储量（§3.7）" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <Text style={{ fontSize: 32, fontWeight: '700', color: '#8A6800' }}>{intel}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#333', fontSize: 11 }}>情报 {intel} / 100</Text>
            <Text style={{ color: '#888', fontSize: 9, marginTop: 3 }}>
              来源：技官系关系/20 每旬自然增速 · 地方派线人建立{'\n'}
              用途：风向预测 · 降低清洗/斗争失败概率 · 降低暴露率
            </Text>
          </View>
        </View>
        <View style={{ height: 6, backgroundColor: '#E5E5E5', borderRadius: 3, overflow: 'hidden' }}>
          <View style={{ height: 6, width: `${intel}%`, backgroundColor: '#8A6800', borderRadius: 3 }} />
        </View>
        <Text style={{ color: '#888', fontSize: 9, marginTop: 5 }}>
          情报≥40 可游说（§3.13）· ≥50 可先发制人（§3.20）· ≥70 解锁风向预告
        </Text>
      </SectionCard>

      {/* 风向预告 */}
      <SectionCard>
        <SLabel text="中央风向预告（需情报≥70）" />
        {intel >= 70 ? (
          <Text style={{ color: '#2E7D32', fontSize: 11, fontWeight: '700' }}>
            据情报分析，下一周期风向大概率维持或向「{WIND_LABEL[save.politicalWind ?? 'balanced']}」漂移。（± 情报精度影响）
          </Text>
        ) : (
          <Text style={{ color: '#aaa', fontSize: 11 }}>情报不足（当前 {intel}，需≥70）· 请提升对技官系的关系以加快情报自然增速。</Text>
        )}
      </SectionCard>

      {/* 风向下注 */}
      <SectionCard>
        <SLabel text="政绩下注（§3.8 / §3.3）" />
        <Text style={{ color: '#555', fontSize: 10, lineHeight: 16, marginBottom: 10 }}>
          成本：政绩 500。押注下个风口周期主流派；押中：影响力+10，该派关系+8；押错：政绩作废（无返还）。
        </Text>
        <View style={{ gap: 6, marginBottom: 10 }}>
          {WINDS.map(w => (
            <Pressable key={w.key} onPress={() => setBetWind(w.key)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, backgroundColor: betWind === w.key ? '#E3F2FD' : '#F8F8F8', borderWidth: 1, borderColor: betWind === w.key ? '#1565C0' : '#E5E5E5' }}>
              <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: betWind === w.key ? '#1565C0' : '#bbb', backgroundColor: betWind === w.key ? '#1565C0' : '#fff' }} />
              <Text style={{ flex: 1, color: '#333', fontSize: 11 }}>{w.label}</Text>
            </Pressable>
          ))}
        </View>
        {isCooldownActive(cd, 'wind_bet', save.gameDays) ? (
          <CooldownBadge days={cooldownRemaining(cd, 'wind_bet', save.gameDays)} />
        ) : (
          <ActionBtn
            label={`下注「${WINDS.find(w => w.key === betWind)?.label ?? '请选择'}」（−500 政绩）`}
            color="#1565C0"
            disabled={!betWind || (save.meritPoints ?? 0) < 500}
            onPress={async () => {
              const win = betWind === (save.politicalWind ?? 'balanced');
              const u: Record<string, any> = {
                meritPoints: clamp((save.meritPoints ?? 0) - 500, 0, 9999),
                factionCooldowns: setCooldown(cd, 'wind_bet', save.gameDays, WIND_CYCLE_DAYS),
              };
              if (win) {
                u.factionInfluence = clamp((save.factionInfluence ?? 0) + 10);
                const dom = getDominantFaction(save.politicalWind ?? 'balanced');
                if (dom) Object.assign(u, applyRelDelta(save, dom, 8));
                showFeedback('✓ 押注正确！影响力+10，主流派关系+8', true);
              } else {
                showFeedback('✗ 押注失误，政绩 500 作废', false);
              }
              await updateGameSave(u);
              setBetWind('');
            }}
          />
        )}
      </SectionCard>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 11 — 派系斗争（§3.11 / §3.22 / §3.23）★ 旗舰
// ═══════════════════════════════════════════════════════════
type PrepOp = {
  key: 'proxy' | 'media' | 'discord' | 'preempt' | 'successor';
  label: string; cost: number; intelReq: number; needRank: number; needInfluence: number; sYou: number; desc: string;
};
const PREP_OPS: PrepOp[] = [
  { key: 'proxy', label: '代理人斗争', cost: 500, intelReq: 0, needRank: 0, needInfluence: 0, sYou: 5, desc: '部署下属为代理人，+5 S_you/次' },
  { key: 'media', label: '舆论攻防', cost: 500, intelReq: 0, needRank: 0, needInfluence: 0, sYou: 3, desc: '发动舆论攻势，+3 S_you/次，民生+3' },
  { key: 'discord', label: '离间·破袭联盟', cost: 1000, intelReq: 40, needRank: 0, needInfluence: 0, sYou: 4, desc: '瓦解对手联盟，+4 S_you/次，需情报≥40' },
  { key: 'preempt', label: '先发制人', cost: 1000, intelReq: 50, needRank: 0, needInfluence: 0, sYou: 8, desc: '抢先出手，+8 S_you/次，需情报≥50' },
  { key: 'successor', label: '接班人之争', cost: 500, intelReq: 0, needRank: 11, needInfluence: 60, sYou: 6, desc: '部署接班人，+6 S_you/次，需L4正职+影响力≥60' },
];

function Tab11Struggle({ save, updateGameSave, showFeedback }: { save: any; updateGameSave: (u: any) => Promise<void>; showFeedback: (m: string, ok?: boolean) => void }) {
  const phase = (save.strugglePhase ?? 'idle') as string;
  const phaseInfo = PHASE_LABEL[phase] ?? PHASE_LABEL.idle;
  const daysElapsed = save.gameDays - (save.lastWindCycleDay ?? 0);
  const remaining = Math.max(0, WIND_CYCLE_DAYS - daysElapsed);
  const inMobilize = isInMobilizationPeriod(save.gameDays, save.lastWindCycleDay ?? 0);
  const dominant = save.dominantFaction as FactionId | null;
  const primary = save.primaryFaction as FactionId | '';
  const history: any[] = save.struggleHistory ?? [];
  const [bandSynergy, setBandSynergy] = useState(1);
  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      const band = await getNpcBand(save.id);
      const bf: FactionId[] = [];
      for (const m of band) { if (m.faction) bf.push(m.faction); }
      if (active) setBandSynergy(calcBandSynergy(bf));
    })();
    return () => { active = false; };
  }, [save.id]));

  const cd = save.factionCooldowns ?? {};
  const intel = save.factionIntelligence ?? 0;
  const prep = save.strugglePrep ?? {};
  // S_you 预估（完整公式 §3.11③：含班子合力、政绩杠杆、情报 + 战前部署）
  const rel = relOf(save, primary as FactionId);
  const sYou = primary
    ? calcSYou({
        relation: getRelationFromSave(save),
        supportFaction: primary as FactionId,
        factionInfluence: save.factionInfluence ?? 0,
        bandSynergy,
        meritInvested: 500,
        factionIntelligence: save.factionIntelligence ?? 0,
      }) + prepBonus(prep)
    : 0;
  const multiFFA = isMultiFactionFreeForAll(getRelationFromSave(save), save.factionInfluence ?? 0);
  const resetPrep = { proxy: 0, media: 0, discord: 0, preempt: 0, successor: 0 };

  const doPrep = async (op: PrepOp) => {
    if (isCooldownActive(cd, `prep_${op.key}`, save.gameDays)) { showFeedback(`${op.label}冷却中`, false); return; }
    if ((save.meritPoints ?? 0) < op.cost) { showFeedback(`政绩不足（需 ${op.cost}）`, false); return; }
    if (op.intelReq && intel < op.intelReq) { showFeedback(`情报不足（需≥${op.intelReq}）`, false); return; }
    if (op.needRank && (save.rankLevel ?? 1) < op.needRank) { showFeedback('职级不足（需L4正职）', false); return; }
    if (op.needInfluence && (save.factionInfluence ?? 0) < op.needInfluence) { showFeedback(`影响力不足（需≥${op.needInfluence}）`, false); return; }
    const u: Record<string, any> = {
      meritPoints: clamp((save.meritPoints ?? 0) - op.cost, 0, 9999),
      strugglePrep: { ...prep, [op.key]: (prep[op.key] ?? 0) + 1 },
      factionCooldowns: setCooldown(cd, `prep_${op.key}`, save.gameDays, 30),
    };
    if (op.key === 'media') u.cityLivelihood = clamp((save.cityLivelihood ?? 50) + 3);
    await updateGameSave(u);
    showFeedback(`✓ ${op.label}部署成功（+${op.sYou} S_you）`, true);
  };

  const doChooseStance = async (stance: 'defend' | 'attack' | 'neutral') => {
    if (phase !== 'active' && phase !== 'mobilize') { showFeedback('当前非斗争期，无法行动', false); return; }
    if ((save.meritPoints ?? 0) < 500) { showFeedback('政绩不足（需≥500 作为斗争下注）', false); return; }
    // v6：使用确定性伪随机（day + stance hash），保证同存档同日结果可复现
    let seed = save.gameDays;
    for (const c of stance) seed = ((seed << 5) - seed + c.charCodeAt(0)) >>> 0;
    const rand = ((seed * 1664525 + 1013904223) >>> 0) / 0xffffffff;
    const sOppBase = 50 + rand * 20 - 10;
    const sOpp = multiFFA ? sOppBase * 1.2 : sOppBase;
    const win = sYou >= sOpp;
    const u: Record<string, any> = {
      meritPoints: clamp((save.meritPoints ?? 0) - 500, 0, 9999),
      strugglePhase: 'truce',
      factionPromotionLocked: false,
      strugglePrep: resetPrep,
    };
    const newHistory = [...history, { period: daysElapsed, side: stance === 'neutral' ? null : primary, result: win ? 'win' : 'lose', sYou: sYou.toFixed(1), sOpp: sOpp.toFixed(1), ffa: multiFFA }];
    u.struggleHistory = newHistory;
    if (stance === 'neutral') {
      u.factionInfluence = clamp((save.factionInfluence ?? 0) - 5);
      showFeedback('中立观望：影响力−5，无 rank 变化，骑墙各方皆失信任', true);
    } else if (win) {
      // v6：胜利走标准结算（applyFactionWin），不再直接改 rankLevel，避免绕过晋升门控
      Object.assign(u, applyFactionWin(save));
      u.factionInfluence = clamp((save.factionInfluence ?? 0) + 15);
      showFeedback(`✓ 斗争胜利！影响力+15${multiFFA ? '（多方混战险胜）' : ''}，晋升冻结解除`, true);
    } else {
      // v6：失败走标准惩罚（applyFactionLossPenalty，含 lastPromotionCycleId），不再直接改 rankLevel
      Object.assign(u, applyFactionLossPenalty(save, save.gameDays));
      showFeedback(`⚠ 斗争失败（S_you ${sYou.toFixed(1)} < ${sOpp.toFixed(1)}）：影响力−${FACTION_LOSS_INFLUENCE_PENALTY}，民心−${FACTION_LOSS_SUPPORT_PENALTY}，失势冻结 ${FACTION_LOSS_SETBACK_DAYS} 天`, false);
    }
    await updateGameSave(u);
  };

  return (
    <>
      {/* 斗争阶段横幅 */}
      <View style={{ backgroundColor: phaseInfo.color, padding: 14, marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{phaseInfo.label}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>{remaining} 天后下次斗争</Text>
        </View>
        {phase === 'active' && (
          <View style={{ backgroundColor: 'rgba(0,0,0,0.2)', marginTop: 8, padding: 6 }}>
            <Text style={{ color: '#FFD700', fontSize: 12, fontWeight: '700' }}>⚔ 交战期 · 晋升冻结中</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10 }}>handlePromote 已短路，rankLevel 锁定至斗争结算（§3.22 / §4.2⑧）</Text>
          </View>
        )}
        {inMobilize && phase === 'idle' && (
          <View style={{ backgroundColor: 'rgba(0,0,0,0.2)', marginTop: 8, padding: 6 }}>
            <Text style={{ color: '#FFD700', fontSize: 12, fontWeight: '700' }}>⚡ 动员期进入 · 囤积准备</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10 }}>距离 1825 天边界 ≤60 天，可提前囤积代理人/情报/联盟折算进 S_you</Text>
          </View>
        )}
      </View>

      {/* S_you 预估 */}
      <SectionCard>
        <SLabel text="你方斗争力 S_you 预估（§3.11③ / §3.17–§3.21）" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 32, fontWeight: '700', color: '#1565C0' }}>{sYou.toFixed(1)}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#333', fontSize: 10, lineHeight: 16 }}>
              = 关系×0.5 + 影响力×0.3 + 班子合力×20({bandSynergy.toFixed(2)}) + 政绩杠杆×0.2 + 情报×0.1 + 战前部署({prepBonus(prep)}){'\n'}
              对手 S_opp ≈ 基础实力×随机(0.85–1.15){multiFFA ? ' · 多方混战 +20%' : ''}
            </Text>
          </View>
        </View>
        <View style={{ height: 6, backgroundColor: '#E5E5E5', borderRadius: 3, overflow: 'hidden', marginTop: 8 }}>
          <View style={{ height: 6, width: `${Math.min(100, sYou)}%`, backgroundColor: '#1565C0', borderRadius: 3 }} />
        </View>
      </SectionCard>

      {/* 战前部署（§3.17–§3.21，折算进 S_you） */}
      {phase !== 'truce' && (
        <SectionCard accent="#6A1B9A">
          <SLabel text="战前部署（§3.17–§3.21，折算进 S_you）" />
          <Text style={{ color: '#555', fontSize: 10, lineHeight: 16, marginBottom: 10 }}>
            动员期囤积代理人/舆论/情报/接班人，每项增加 S_you，结算后清零。{multiFFA ? '⚠ 检测到多方混战格局，S_opp +20%' : ''}
          </Text>
          {PREP_OPS.map(op => {
            const cooling = isCooldownActive(cd, `prep_${op.key}`, save.gameDays);
            const left = cooling ? cooldownRemaining(cd, `prep_${op.key}`, save.gameDays) : 0;
            const locked = (op.intelReq && intel < op.intelReq) || (op.needRank && (save.rankLevel ?? 1) < op.needRank) || (op.needInfluence && (save.factionInfluence ?? 0) < op.needInfluence);
            return (
              <View key={op.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#333', fontSize: 11, fontWeight: '600' }}>{op.label} <Text style={{ color: '#6A1B9A', fontSize: 10 }}>×{prep[op.key] ?? 0}</Text></Text>
                  <Text style={{ color: '#888', fontSize: 9, marginTop: 2 }}>{op.desc}</Text>
                </View>
                {cooling ? <CooldownBadge days={left} /> : (
                  <ActionBtn label={`−${op.cost}`} color={locked ? '#ccc' : '#6A1B9A'} onPress={() => doPrep(op)} disabled={locked || (save.meritPoints ?? 0) < op.cost} />
                )}
              </View>
            );
          })}
        </SectionCard>
      )}

      {/* 三选一操作 */}
      <SectionCard accent={phase === 'active' ? '#C62828' : '#607D8B'}>
        <SLabel text="斗争站队（§3.11②）" />
        {(phase === 'active' || phase === 'mobilize') ? (
          <>
            <Text style={{ color: '#555', fontSize: 10, lineHeight: 16, marginBottom: 10 }}>
              成本：政绩 500（§2.3 斗争下注起步价）。当前主流派：{dominant ? FACTION_LABEL[dominant] : '均势'}
            </Text>
            <View style={{ gap: 8 }}>
              <ActionBtn label="守擂主流派（押当前主流派继续得势）" color="#2E7D32" onPress={() => doChooseStance('defend')} disabled={(save.meritPoints ?? 0) < 500} />
              <ActionBtn label="攻擂挑战派（押本派翻盘上位）" color="#1565C0" onPress={() => doChooseStance('attack')} disabled={(save.meritPoints ?? 0) < 500} />
              <ActionBtn label="中立观望（无保护 · 影响力−5）" color="#607D8B" onPress={() => doChooseStance('neutral')} />
            </View>
            <View style={{ backgroundColor: '#FFEBEE', padding: 8, marginTop: 8 }}>
              <Text style={{ color: '#C62828', fontSize: 9, fontWeight: '700' }}>失败后果预告</Text>
              <Text style={{ color: '#555', fontSize: 9, lineHeight: 14 }}>
                轻度：rankLevel−1，影响力−15{'\n'}
                重度（大败/L4核心/政绩枯竭）：rankLevel−3 或撤职{'\n'}
                若同时 purgeCount≥2 且 integrity 偏低 → 落马结局
              </Text>
            </View>
          </>
        ) : phase === 'truce' ? (
          <Text style={{ color: '#888', fontSize: 11, textAlign: 'center', padding: 12 }}>🕊 休战期（60 天内禁止新斗争）· 修复关系、重整班子</Text>
        ) : (
          <Text style={{ color: '#888', fontSize: 11, textAlign: 'center', padding: 12 }}>平稳期 · 距下次斗争还有 {remaining} 天{remaining <= 60 ? '（动员期即将开始）' : ''}</Text>
        )}
      </SectionCard>

      {/* 斗争战报历史 */}
      {history.length > 0 && (
        <SectionCard>
          <SLabel text="斗争战报（§3.24）" />
          {history.slice(-5).reverse().map((h, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
              <View style={{ width: 40, height: 20, backgroundColor: h.result === 'win' ? '#E8F5E9' : '#FFEBEE', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: h.result === 'win' ? '#2E7D32' : '#C62828' }}>{h.result === 'win' ? '胜' : h.result === null ? '中立' : '败'}</Text>
              </View>
              <Text style={{ flex: 1, color: '#555', fontSize: 10, lineHeight: 16 }}>
                第 {h.period} 天周期  S:{h.sYou} vs {h.sOpp}  {h.side ? FACTION_SHORT[h.side as FactionId] ?? h.side : '中立'}
              </Text>
            </View>
          ))}
        </SectionCard>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 12 — 人脉图谱（§9.2）
// ═══════════════════════════════════════════════════════════
function Tab12Network({ save }: { save: any }) {
  const primary = save.primaryFaction as FactionId | '';
  // 从存档中读取主要 NPC（上司、下属）的派系归属
  const bossName = save.bossSuperiorName ?? save.bossName ?? '';
  const networkGraph: any[] = save.factionEchoLog ?? [];

  return (
    <>
      <SectionCard>
        <SLabel text="政治人脉图谱（§9.2）" />
        <Text style={{ color: '#555', fontSize: 10, lineHeight: 16, marginBottom: 10 }}>
          把 hashNameToFaction 派发的全体 NPC（上司/下属/班子成员/四大班子 chair）渲染成力导向关系图：节点=人物、颜色=派系、边=上下级关系。
        </Text>
        {/* 简化展示：按派系分组 */}
        {ALL_FACTIONS.map(f => {
          const isPlayerFaction = f === primary;
          return (
            <View key={f} style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: FACTION_COLOR[f] }} />
              <Text style={{ color: '#333', fontSize: 11, flex: 1 }}>{FACTION_LABEL[f]}</Text>
              {isPlayerFaction && <View style={{ backgroundColor: FACTION_BG[f], paddingHorizontal: 4, paddingVertical: 2 }}><Text style={{ color: '#FFD700', fontSize: 8 }}>主派</Text></View>}
            </View>
          );
        })}
        <View style={{ backgroundColor: '#F8F8F8', padding: 10, marginTop: 8, alignItems: 'center' }}>
          <Text style={{ color: '#888', fontSize: 10, textAlign: 'center', lineHeight: 16 }}>
            力导向图谱将在后续版本渲染（需 react-native-svg 支持）{'\n'}
            当前展示各派系 NPC 分布，斗争复盘后自动重绘
          </Text>
        </View>
      </SectionCard>
      {bossName ? (
        <SectionCard>
          <SLabel text="上司派系" />
          <Text style={{ color: '#333', fontSize: 12 }}>
            {bossName}（{FACTION_LABEL[(() => {
              let h = 0; for (const c of bossName) h = (h * 31 + c.charCodeAt(0)) >>> 0;
              return ALL_FACTIONS[h % 5];
            })()]}）
          </Text>
        </SectionCard>
      ) : null}
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 13 — 结局预览（§4.8）
// ═══════════════════════════════════════════════════════════
function Tab13Endings({ save }: { save: any }) {
  const influence = save.factionInfluence ?? 0;
  const purge = save.purgeCount ?? 0;
  const primary = save.primaryFaction as FactionId | '';
  const rel = primary ? relOf(save, primary) : 0;
  const repLv = primary ? getRepLevel(rel) : 0;
  const isLocked = save.factionlessLocked ?? false;

  const tracks = [
    {
      key: 'core', title: '核心圈层', icon: '👑', color: '#D4AF37',
      desc: '主派 L4 且影响力≥80，或派系斗争中胜出并主导风口。',
      progress: Math.min(100, (repLv === 4 ? 50 : 0) + (influence >= 80 ? 50 : Math.floor(influence / 80 * 50))),
      achieved: repLv >= 4 && influence >= 80,
    },
    {
      key: 'balance', title: '平衡大师', icon: '⚖️', color: '#2E7D32',
      desc: '五派关系皆 40–70、无清洗、斗争中立不翻车，稳健终局。',
      progress: Math.min(100, ALL_FACTIONS.filter(f => relOf(save, f) >= 40 && relOf(save, f) <= 70).length * 20),
      achieved: ALL_FACTIONS.every(f => relOf(save, f) >= 40 && relOf(save, f) <= 70) && purge === 0,
    },
    {
      key: 'marginal', title: '被边缘化', icon: '🌫️', color: '#888',
      desc: '影响力<30，退居二线，无法晋升至更高级职位。',
      progress: influence < 30 ? 100 - Math.floor(influence / 30 * 100) : 0,
      achieved: false,
      risk: influence < 30,
    },
    {
      key: 'purge', title: '被清算/落马', icon: '⚠️', color: '#C62828',
      desc: '清洗触发≥2 次且无庇护，或派系斗争重度失败触发撤职→落马。',
      progress: Math.min(100, purge * 50 + (isLocked ? 30 : 0)),
      achieved: false,
      risk: purge >= 2 || isLocked,
    },
  ];

  return (
    <>
      <SectionCard>
        <SLabel text="当前风险指标" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { label: '被清洗次数', value: `${purge} 次`, danger: purge >= 2 },
            { label: '派系影响力', value: `${influence}`, danger: influence < 30 },
            { label: '主派声望', value: primary ? `L${repLv}` : '无派系', danger: isLocked || !primary },
          ].map(s => (
            <View key={s.label} style={{ flex: 1, backgroundColor: s.danger ? '#FFEBEE' : '#F8F8F8', padding: 10, alignItems: 'center' }}>
              <Text style={{ color: s.danger ? '#C62828' : '#222', fontSize: 16, fontWeight: '700' }}>{s.value}</Text>
              <Text style={{ color: '#888', fontSize: 9, marginTop: 2, textAlign: 'center' }}>{s.label}</Text>
            </View>
          ))}
        </View>
      </SectionCard>
      {tracks.map(t => (
        <SectionCard key={t.key} accent={t.color}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Text style={{ fontSize: 20 }}>{t.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#222', fontSize: 12, fontWeight: '700' }}>{t.title}</Text>
              {t.achieved && <Text style={{ color: t.color, fontSize: 9, fontWeight: '700' }}>🎯 条件已满足</Text>}
              {(t as any).risk && !t.achieved && <Text style={{ color: '#C62828', fontSize: 9, fontWeight: '700' }}>⚠ 风险路径激活</Text>}
            </View>
            <Text style={{ color: t.color, fontSize: 16, fontWeight: '700' }}>{t.progress}%</Text>
          </View>
          <View style={{ height: 6, backgroundColor: '#E5E5E5', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
            <View style={{ height: 6, width: `${t.progress}%`, backgroundColor: t.color, borderRadius: 3 }} />
          </View>
          <Text style={{ color: '#555', fontSize: 10, lineHeight: 15 }}>{t.desc}</Text>
        </SectionCard>
      ))}
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab14 玩法：派系委托执行 / 密谋行动 / 叛逃换系 + 位置棋盘（§二新增）
// ═══════════════════════════════════════════════════════════
function Tab14Gameplay({ save, updateGameSave, showFeedback }: { save: any; updateGameSave: (u: any) => Promise<void>; showFeedback: (m: string, ok?: boolean) => void }) {
  const [boardVisible, setBoardVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [subView, setSubView] = useState<'mandates' | 'covert' | 'defect'>('mandates');

  const primary = save.primaryFaction as FactionId | '';
  const mandates = (save.factionMandates ?? []) as FactionMandate[];
  const activeMandates = mandates.filter((m: FactionMandate) => m.status === 'active');
  const meritPoints = save.meritPoints ?? 0;
  const exposedCount = save.covertExposedCount ?? 0;
  const setback = isInSetback(save);
  const defectCooldownLeft = Math.max(0, (save.defectCooldownUntilDay ?? 0) - save.gameDays);

  // 密谋操作
  const handleCovertOp = async (type: CovertOpRecord['type'], targetFaction: FactionId) => {
    if (busy) return;
    setBusy(true);
    try {
      const { updates, exposed, message } = attemptCovertOp(save, type, targetFaction, save.gameDays);
      if (!updates || Object.keys(updates).length === 0) {
        showFeedback(message, false);
        return;
      }
      await updateGameSave(updates);
      showFeedback(message, !exposed);
    } finally {
      setBusy(false);
    }
  };

  // 委托操作
  const handleMandate = async (mandateId: string, accept: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      const updates = accept
        ? applyMandateComplete(save, mandateId)
        : applyMandateReject(save, mandateId, save.gameDays);
      if (!updates || Object.keys(updates).length === 0) return;
      await updateGameSave(updates);
      showFeedback(accept ? '✓ 委托完成，奖励已发放' : '已拒绝委托，本派关系受损（90 天冷却）', accept);
    } finally {
      setBusy(false);
    }
  };

  // 叛逃操作
  const handleDefect = async (target: FactionId) => {
    if (busy) return;
    setBusy(true);
    try {
      const reason = canDefect(save, target, save.gameDays);
      if (reason) {
        showFeedback(reason, false);
        return;
      }
      const updates = applyDefection(save, target, save.gameDays);
      await updateGameSave(updates);
      showFeedback(`已叛逃至${FACTION_LABEL[target]}（-100 政绩 · 365 天冷却 · 本周期冻结晋升）`, true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* 位置棋盘入口 */}
      <Pressable onPress={() => setBoardVisible(true)} style={{ backgroundColor: '#1D3A5C', padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ color: '#8eb4d8', fontSize: 9, letterSpacing: 2 }}>POSITION BOARD</Text>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>♟ 位置棋盘 · 派系席位控制图</Text>
          <Text style={{ color: '#6f94b8', fontSize: 9, marginTop: 2 }}>双轨胜利判定：控制度过半 或 攻克枢纽席位</Text>
        </View>
        <Text style={{ color: '#FFD700', fontSize: 18 }}>›</Text>
      </Pressable>

      {/* 子视图切换 */}
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', marginBottom: 10 }}>
        {([['mandates', '📋 委托'], ['covert', '🎭 密谋'], ['defect', '🔄 叛逃']] as const).map(([k, label]) => (
          <Pressable key={k} onPress={() => setSubView(k)} style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: subView === k ? '#E8EDF5' : 'transparent' }}>
            <Text style={{ fontSize: 11, fontWeight: subView === k ? '700' : '400', color: subView === k ? '#1D3B5E' : '#888' }}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {/* ── 委托执行 ── */}
      {subView === 'mandates' && (
        <>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D3B5E', letterSpacing: 1, marginBottom: 8 }}>
            派系委托（每政治年刷新 1-2 个 · 完成奖励功绩 +25~35）
          </Text>
          {activeMandates.length === 0 ? (
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 20, marginBottom: 6 }}>📭</Text>
              <Text style={{ fontSize: 12, color: '#888' }}>暂无进行中的委托</Text>
              <Text style={{ fontSize: 10, color: '#aaa', marginTop: 4 }}>每政治年（365 天）本派将自动生成新委托</Text>
            </View>
          ) : activeMandates.map((m: FactionMandate) => (
            <View key={m.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 12, marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <View style={{ width: 8, height: 8, backgroundColor: FACTION_COLOR[m.faction] }} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A', flex: 1 }}>{m.title}</Text>
                <Text style={{ fontSize: 9, color: '#999' }}>第 {m.year} 年</Text>
              </View>
              <Text style={{ fontSize: 11, color: '#555', lineHeight: 16, marginBottom: 8 }}>{m.desc}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                <View style={{ flex: 1, backgroundColor: '#E8F5E9', padding: 6 }}>
                  <Text style={{ fontSize: 9, color: '#2E7D32' }}>奖励：关系+{m.reward.relation} 影响+{m.reward.influence} 经费+{m.reward.treasury} 功绩+{m.reward.merit || '25~35'}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#FFEBEE', padding: 6 }}>
                  <Text style={{ fontSize: 9, color: '#C62828' }}>拒绝：关系{m.penalty.relation} · 冷却 90 天</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable onPress={() => handleMandate(m.id, true)} disabled={busy} style={{ flex: 1, backgroundColor: busy ? '#ccc' : '#2a7a3b', paddingVertical: 10, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓ 完成委托</Text>
                </Pressable>
                <Pressable onPress={() => handleMandate(m.id, false)} disabled={busy} style={{ flex: 1, backgroundColor: busy ? '#ccc' : '#C62828', paddingVertical: 10, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✗ 拒绝委托</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </>
      )}

      {/* ── 密谋行动 ── */}
      {subView === 'covert' && (
        <>
          <View style={{ backgroundColor: '#FFF8F0', borderWidth: 1, borderColor: '#E8D9B0', padding: 10, marginBottom: 10 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#B8860B', marginBottom: 4 }}>🎭 密谋行动规则</Text>
            <Text style={{ fontSize: 10, color: '#666', lineHeight: 15 }}>
              每次密谋消耗 {COVERT_MERIT_COST} 政绩点（当前 {meritPoints}）；被针对（isFlagged）时暴露率×1.5；累计暴露 {EXPOSURE_CASE_THRESHOLD} 次触发纪委立案。{'\n'}已暴露 {exposedCount}/{EXPOSURE_CASE_THRESHOLD} 次{save.isFlagged ? ' · ⚠ 已立案（行动效果 -50%）' : ''}
            </Text>
          </View>
          {(['report', 'discord', 'proxy', 'preempt'] as const).map(type => {
            const labels: Record<string, { name: string; desc: string }> = {
              report:   { name: '举报信', desc: '向上级举报目标派系干部违纪问题' },
              discord:  { name: '离间计', desc: '散布消息离间目标派系内部关系' },
              proxy:    { name: '代理人', desc: '安插代理人渗透目标派系核心圈' },
              preempt:  { name: '先发制人', desc: '抢先掌握目标派系把柄以备要挟' },
            };
            return (
              <View key={type} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 12, marginBottom: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 }}>{labels[type].name}</Text>
                <Text style={{ fontSize: 10, color: '#888', marginBottom: 8 }}>{labels[type].desc} · 消耗 {COVERT_MERIT_COST} 政绩</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {ALL_FACTIONS.filter(f => f !== primary).map(f => (
                    <Pressable
                      key={f}
                      onPress={() => handleCovertOp(type, f)}
                      disabled={busy || meritPoints < COVERT_MERIT_COST}
                      style={{
                        backgroundColor: busy || meritPoints < COVERT_MERIT_COST ? '#E5E5E5' : FACTION_COLOR[f] + '22',
                        borderWidth: 1,
                        borderColor: FACTION_COLOR[f],
                        paddingHorizontal: 10,
                        paddingVertical: 7,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '600', color: meritPoints < COVERT_MERIT_COST ? '#999' : FACTION_COLOR[f] }}>
                        对{FACTION_SHORT[f]}派执行
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            );
          })}
        </>
      )}

      {/* ── 叛逃换系 ── */}
      {subView === 'defect' && (
        <>
          <View style={{ backgroundColor: '#FFF8F0', borderWidth: 1, borderColor: '#E8D9B0', padding: 10, marginBottom: 10 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#B8860B', marginBottom: 4 }}>🔄 叛逃换系规则</Text>
            <Text style={{ fontSize: 10, color: '#666', lineHeight: 15 }}>
              消耗 {DEFECT_MERIT_COST} 政绩点（当前 {meritPoints}）；旧派关系压底 20、影响力-20；新派基线 40；进入 365 天冷却；本周期晋升冻结。{'\n'}
              失势期/立案期/冷却期禁叛逃；目标派声望需 ≥L2；不得投奔死敌（关系 ≤-2）。
            </Text>
          </View>
          {setback && (
            <View style={{ backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: '#EF9A9A', padding: 10, marginBottom: 8 }}>
              <Text style={{ fontSize: 11, color: '#C62828', fontWeight: '600' }}>⚠ 失势期内禁止叛逃（R1 限制）</Text>
            </View>
          )}
          {defectCooldownLeft > 0 && (
            <View style={{ backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: '#EF9A9A', padding: 10, marginBottom: 8 }}>
              <Text style={{ fontSize: 11, color: '#C62828', fontWeight: '600' }}>⚠ 叛逃冷却中（剩余 {defectCooldownLeft} 天）</Text>
            </View>
          )}
          {ALL_FACTIONS.filter(f => f !== primary).map(f => {
            const reason = canDefect(save, f, save.gameDays);
            const ok = reason === null;
            const rel = getRelationFromSave(save)[f] ?? 0;
            const rep = getRepLevel(rel);
            const matrixVal = primary ? (FACTION_RELATION_MATRIX[primary as FactionId]?.[f] ?? 0) : 0;
            const isDeadEnemy = matrixVal <= -2;
            return (
              <View key={f} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: ok ? FACTION_COLOR[f] : '#D9D9D9', padding: 12, marginBottom: 8, opacity: ok ? 1 : 0.6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: FACTION_COLOR[f] }} />
                  <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: '#1A1A1A' }}>{FACTION_LABEL[f]}</Text>
                  {isDeadEnemy ? (
                    <View style={{ backgroundColor: '#FFEBEE', paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 9, color: '#C62828', fontWeight: '700' }}>💀 死敌</Text>
                    </View>
                  ) : (
                    <Text style={{ fontSize: 10, color: '#888' }}>声望 L{rep} · 关系 {rel}</Text>
                  )}
                </View>
                <Text style={{ fontSize: 10, color: reason ? '#C62828' : '#2E7D32', marginTop: 6, marginBottom: 8 }}>
                  {ok ? '✓ 可叛逃' : `✗ ${reason}`}
                </Text>
                <Pressable
                  onPress={() => handleDefect(f)}
                  disabled={!ok || busy}
                  style={{ backgroundColor: ok && !busy ? FACTION_COLOR[f] : '#E5E5E5', paddingVertical: 10, alignItems: 'center' }}
                >
                  <Text style={{ color: ok ? '#fff' : '#999', fontSize: 12, fontWeight: '700' }}>叛逃至本派（-100 政绩）</Text>
                </Pressable>
              </View>
            );
          })}
        </>
      )}

      {/* 位置棋盘弹窗 */}
      <PositionBoard
        visible={boardVisible}
        onClose={() => setBoardVisible(false)}
        save={save}
        targetSeatKey={(save.promotionContest as PromotionContest | null)?.positionKey ?? null}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// 主组件
// ═══════════════════════════════════════════════════════════
const TABS = [
  { key: 'overview',    label: '总览' },
  { key: 'join',        label: '我的派' },
  { key: 'relations',   label: '关系' },
  { key: 'policy',      label: '政见' },
  { key: 'commissions', label: '委托' },
  { key: 'reptree',     label: '声望树' },
  { key: 'linestruggle',label: '路线' },
  { key: 'band',        label: '班子' },
  { key: 'projects',    label: '工程' },
  { key: 'strategy',    label: '策略' },
  { key: 'intel',       label: '情报' },
  { key: 'struggle',    label: '斗争' },
  { key: 'prestige',    label: '声望' },
  { key: 'gameplay',    label: '玩法' },
  { key: 'network',     label: '图谱' },
  { key: 'endings',     label: '结局' },
] as const;

type TabKey = typeof TABS[number]['key'];

// ══ v6 Tab：声望经济（A）+ 暗线举报（B） ════════════════════════════
function TabPrestige({ save, updateGameSave, showFeedback }: { save: any; updateGameSave: (u: any) => Promise<void>; showFeedback: (m: string, ok?: boolean) => void }) {
  const primary = save.primaryFaction as FactionId | '';
  const influence = save.factionInfluence ?? 0;
  const intel = save.factionIntelligence ?? 0;
  const immunity = save.setbackImmunity ?? 0;
  const cd = save.factionCooldowns ?? {};
  const day = save.gameDays;

  const reportable = ALL_FACTIONS.filter(f => f !== primary && isFactionReportable(save, f));
  const exposureProb = getInformExposureProb(save);

  const doImmunity = async () => {
    const res = buySetbackImmunity(save, day);
    if (!res.ok) { showFeedback(res.message, false); return; }
    await updateGameSave(res.updates);
    showFeedback(res.message, true);
  };

  const doAccelerate = async () => {
    const res = buyAccelerateContest(save, day);
    if (!res.ok) { showFeedback(res.message, false); return; }
    await updateGameSave(res.updates);
    showFeedback(res.message, true);
  };

  const doReport = async (faction: FactionId) => {
    const res = attemptInformReport(save, faction, day);
    await updateGameSave(res.updates);
    showFeedback(res.message, res.ok);
  };

  const immunityCd = cd[PRESTIGE_ECONOMY.immunity.cooldownKey] ?? 0;
  const accelCd = cd[PRESTIGE_ECONOMY.accelerate.cooldownKey] ?? 0;
  const reportCd = cd[INFORM_REPORT.cooldownKey] ?? 0;

  return (
    <>
      {/* 当前声望概览 */}
      <View style={{ backgroundColor: '#1D3A5C', padding: 14, marginBottom: 10 }}>
        <Text style={{ color: '#FFD700', fontSize: 14, fontWeight: '700', marginBottom: 6 }}>✦ 声望经济 · 暗线博弈</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: '#FFD700', fontSize: 10, fontWeight: '700' }}>影响力 {influence}</Text>
          </View>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: '#FFD700', fontSize: 10, fontWeight: '700' }}>情报 {intel}</Text>
          </View>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: '#FFD700', fontSize: 10, fontWeight: '700' }}>失势豁免 ×{immunity}</Text>
          </View>
        </View>
      </View>

      {/* A. 声望经济：兑换短期增益 */}
      <View style={{ backgroundColor: '#fff', borderTopWidth: 3, borderTopColor: '#C8A84B', borderWidth: 1, borderColor: '#E5E5E5', padding: 12, marginBottom: 10 }}>
        <Text style={{ color: '#8A6D1A', fontSize: 12, fontWeight: '700', marginBottom: 4 }}>💰 声望经济（用影响力兑换增益）</Text>
        <Text style={{ color: '#888', fontSize: 9, lineHeight: 14, marginBottom: 10 }}>
          影响力是派系核心资本。可兑换一次性失势豁免（抵消一次冻结），或加速个人职位战冷却。
        </Text>
        <Pressable
          disabled={!primary || influence < PRESTIGE_ECONOMY.immunity.influenceCost || immunityCd > day}
          onPress={doImmunity}
          style={{ backgroundColor: (!primary || influence < PRESTIGE_ECONOMY.immunity.influenceCost || immunityCd > day) ? '#ccc' : '#C8A84B', paddingVertical: 11, alignItems: 'center', marginBottom: 8 }}
        >
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
            {immunityCd > day ? `失势豁免冷却中（剩 ${immunityCd - day} 天）` : `兑换失势豁免（−${PRESTIGE_ECONOMY.immunity.influenceCost} 影响力）`}
          </Text>
        </Pressable>
        <Pressable
          disabled={!primary || influence < PRESTIGE_ECONOMY.accelerate.influenceCost || accelCd > day}
          onPress={doAccelerate}
          style={{ backgroundColor: (!primary || influence < PRESTIGE_ECONOMY.accelerate.influenceCost || accelCd > day) ? '#ccc' : '#1565C0', paddingVertical: 11, alignItems: 'center' }}
        >
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
            {accelCd > day ? `加速冷却中（剩 ${accelCd - day} 天）` : `加速争夺冷却（−${PRESTIGE_ECONOMY.accelerate.influenceCost} 影响力，缩短 ${PRESTIGE_ECONOMY.accelerate.shortenDays} 天）`}
          </Text>
        </Pressable>
      </View>

      {/* B. 暗线举报/纪检 */}
      <View style={{ backgroundColor: '#fff', borderTopWidth: 3, borderTopColor: '#C82829', borderWidth: 1, borderColor: '#E5E5E5', padding: 12, marginBottom: 10 }}>
        <Text style={{ color: '#C82829', fontSize: 12, fontWeight: '700', marginBottom: 4 }}>🕵 暗线举报 / 纪检</Text>
        <Text style={{ color: '#888', fontSize: 9, lineHeight: 14, marginBottom: 8 }}>
          当对手派系斗争力异常高（≥{INFORM_REPORT.powerThreshold}）时，可发起一次暗线举报削弱其关系值，成功则情报+功绩；但存在暴露风险（当前暴露率 {Math.round(exposureProb * 100)}%），暴露将增加风险值、损害本派关系。
        </Text>
        {reportable.length === 0 ? (
          <View style={{ backgroundColor: '#F5F5F5', padding: 10, alignItems: 'center' }}>
            <Text style={{ color: '#aaa', fontSize: 10 }}>暂无斗争力异常的对手派系可举报</Text>
          </View>
        ) : (
          reportable.map(f => (
            <Pressable
              key={f}
              disabled={reportCd > day}
              onPress={() => doReport(f)}
              style={{ backgroundColor: reportCd > day ? '#ccc' : '#C82829', paddingVertical: 11, alignItems: 'center', marginBottom: 6 }}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                {reportCd > day ? `举报冷却中（剩 ${reportCd - day} 天）` : `举报 ${FACTION_LABEL[f]} 派（削弱关系 ${INFORM_REPORT.weakenRelation}）`}
              </Text>
            </Pressable>
          ))
        )}
      </View>
    </>
  );
}

export default function FactionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [feedback, setFeedback] = useState('');
  const [feedbackOk, setFeedbackOk] = useState(true);

  if (!save) return null;

  const showFeedback = (msg: string, ok = true) => {
    setFeedback(msg);
    setFeedbackOk(ok);
    setTimeout(() => setFeedback(''), 4000);
  };

  const primary = save.primaryFaction as FactionId | '';
  const primaryCfg = FACTIONS.find(f => f.key === primary);
  const phase = (save.strugglePhase ?? 'idle') as string;
  const inMobilize = isInMobilizationPeriod(save.gameDays, save.lastWindCycleDay ?? 0);
  const struggling = phase === 'active';

  const doUpdate = async (u: any) => { await updateGameSave(u); };

  const tabProps = { save, updateGameSave: doUpdate, showFeedback };

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F3F0' }}>
      <StatusBar style="light" backgroundColor="#1D3A5C" />

      {/* 顶部 header */}
      <View style={{ backgroundColor: '#1D3A5C', paddingTop: insets.top + 6, paddingHorizontal: 0, paddingBottom: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 10, gap: 8 }}>
          <Pressable onPress={() => router.back()} style={{ paddingRight: 4 }}>
            <Text style={{ color: '#8eb4d8', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#8eb4d8', fontSize: 9, letterSpacing: 2 }}>POLITICAL FACTIONS · v2</Text>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>派系政治中心</Text>
          </View>
          {/* 主派徽章 */}
          {primaryCfg ? (
            <Pressable onPress={() => setActiveTab('join')}
              style={{ backgroundColor: primaryCfg.accentColor, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 12 }}>{primaryCfg.icon}</Text>
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{primaryCfg.short}</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => setActiveTab('join')}
              style={{ borderWidth: 1, borderColor: '#8eb4d8', paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: '#8eb4d8', fontSize: 9 }}>未加入 ›</Text>
            </Pressable>
          )}
          {/* 斗争/动员预警 */}
          {(struggling || inMobilize) && (
            <View style={{ backgroundColor: struggling ? '#C62828' : '#F57C00', paddingHorizontal: 6, paddingVertical: 3 }}>
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{struggling ? '⚔ 斗争中' : '⚡ 动员期'}</Text>
            </View>
          )}
        </View>

        {/* 14-Tab 横向滚动栏 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
          <View style={{ flexDirection: 'row', paddingHorizontal: 4 }}>
            {TABS.map(t => {
              const isActive = activeTab === t.key;
              const isAlert = (t.key === 'struggle' && (struggling || inMobilize));
              return (
                <Pressable key={t.key} onPress={() => setActiveTab(t.key)}
                  style={{ paddingHorizontal: 10, paddingVertical: 9, borderBottomWidth: 2, borderBottomColor: isActive ? '#FFD700' : 'transparent', marginHorizontal: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: isActive ? '700' : '400', color: isActive ? '#FFD700' : isAlert ? '#FFB300' : '#8eb4d8' }}>
                    {isAlert ? `${t.label}⚡` : t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* 反馈条 */}
      {!!feedback && (
        <View style={{ backgroundColor: feedbackOk ? '#e8f5e9' : '#fff3e0', borderBottomWidth: 1, borderBottomColor: feedbackOk ? '#a5d6a7' : '#ffcc80', paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
          <Text style={{ fontSize: 14 }}>{feedbackOk ? '✓' : '⚠'}</Text>
          <Text style={{ flex: 1, color: feedbackOk ? '#1b5e20' : '#e65100', fontSize: 11, fontWeight: '600', lineHeight: 17 }}>{feedback}</Text>
        </View>
      )}

      {/* 内容区 */}
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {activeTab === 'overview'     && <Tab0Overview     save={save} showFeedback={showFeedback} />}
        {activeTab === 'join'         && <Tab1Join         {...tabProps} />}
        {activeTab === 'relations'    && <Tab2Relations    {...tabProps} />}
        {activeTab === 'policy'       && <Tab3Policy       {...tabProps} />}
        {activeTab === 'commissions'  && <Tab4Commissions  save={save} />}
        {activeTab === 'reptree'      && <Tab5RepTree      save={save} />}
        {activeTab === 'linestruggle' && <Tab6LineStruggle {...tabProps} />}
        {activeTab === 'band'         && <Tab7Band         save={save} />}
        {activeTab === 'projects'     && <Tab8Projects     {...tabProps} />}
        {activeTab === 'strategy'     && <Tab9Strategy     {...tabProps} />}
        {activeTab === 'intel'        && <Tab10Intel       {...tabProps} />}
        {activeTab === 'struggle'     && <Tab11Struggle    {...tabProps} />}
        {activeTab === 'prestige'     && <TabPrestige      {...tabProps} />}
        {activeTab === 'gameplay'     && <Tab14Gameplay    {...tabProps} />}
        {activeTab === 'network'      && <Tab12Network     save={save} />}
        {activeTab === 'endings'      && <Tab13Endings     save={save} />}
      </ScrollView>
    </View>
  );
}
```

<a id="srcappappfamilytsx"></a>
## `src/app/(app)/family.tsx`

```tsx
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
```

<a id="srcappappfinancetsx"></a>
## `src/app/(app)/finance.tsx`

```tsx
// 城市金融页面
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getOrCreateFinance, applyLoan, startInvestment, establishInvestGroup } from '@/db/gameApi';
import type { CityFinance, LoanRecord, InvestmentRecord } from '@/types/game';
import { LOAN_TEMPLATES, INVEST_TEMPLATES, gameDaysToDate, formatFund } from '@/types/game';

type Tab = 'overview' | 'loan' | 'invest';

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f0f0f0' }}>
      <Text style={{ fontSize: 12, color: '#555' }}>{label}</Text>
      <Text style={{ fontSize: 12, fontWeight: '700', color: color ?? '#222', fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
}

export default function FinancePage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave, refreshSave } = useGame();
  const [tab, setTab] = useState<Tab>('overview');
  const [finance, setFinance] = useState<CityFinance | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [actionOk, setActionOk] = useState(false);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    if (!save) return;
    setLoading(true);
    const f = await getOrCreateFinance(save.id, save.userId);
    setFinance(f);
    setLoading(false);
  }, [save]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (!save) return null;

  const handleLoan = async (idx: number) => {
    if (!save || !finance) return;
    const tpl = LOAN_TEMPLATES[idx];
    if (!tpl) return;
    setActing(true);
    setActionMsg('');
    const loan: LoanRecord = {
      id: `loan_${Date.now()}`,
      amount: tpl.amount,
      rate: tpl.rateYearly,
      startDay: save.gameDays,
      dueDay: save.gameDays + tpl.durationDays,
      monthlyPay: Math.round(tpl.amount * tpl.rateYearly / 12 * 10) / 10 + Math.round(tpl.amount / (tpl.durationDays / 30) * 10) / 10,
      status: 'active',
    };
    const ok = await applyLoan(save.id, loan);
    if (ok) {
      await updateGameSave({ fundBalance: save.fundBalance + tpl.amount });
      await load();
      await refreshSave();
      setActionMsg(`成功获得 ${tpl.amount} 万元贷款`);
      setActionOk(true);
    } else {
      setActionMsg('申请失败，请重试');
      setActionOk(false);
    }
    setActing(false);
  };

  const handleInvest = async (idx: number) => {
    if (!save || !finance) return;
    const tpl = INVEST_TEMPLATES[idx];
    if (!tpl) return;
    if ((save.fundBalance) < tpl.amount) {
      setActionMsg(`资金不足，需 ${tpl.amount} 万元`);
      setActionOk(false);
      return;
    }
    if (!finance.investGroupEstDay) {
      setActionMsg('请先成立城市投资集团');
      setActionOk(false);
      return;
    }
    setActing(true);
    setActionMsg('');
    const inv: InvestmentRecord = {
      id: `inv_${Date.now()}`,
      name: tpl.name,
      amount: tpl.amount,
      startDay: save.gameDays,
      endDay: save.gameDays + tpl.durationDays,
      effectType: tpl.effectType,
      effectValue: tpl.effectValue,
      status: 'running',
    };
    const ok = await startInvestment(save.id, inv);
    if (ok) {
      // startInvestment 已同步扣减资金余额，此处仅刷新界面
      await load();
      await refreshSave();
      setActionMsg(`${tpl.name} 已启动`);
      setActionOk(true);
    } else {
      setActionMsg('资金不足或投资失败，请重试');
      setActionOk(false);
    }
    setActing(false);
  };

  const handleEstablishGroup = async () => {
    if (!save || !finance) return;
    if (finance.investGroupEstDay) return;
    setActing(true);
    const ok = await establishInvestGroup(save.id, save.gameDays);
    if (ok) { await load(); setActionMsg('投资集团已成立，可在全国范围开展投资'); setActionOk(true); }
    else { setActionMsg('成立失败，请重试'); setActionOk(false); }
    setActing(false);
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: '资金概览' },
    { key: 'loan',     label: '银行贷款' },
    { key: 'invest',   label: '招商投资' },
  ];

  const activeLoans  = finance?.loans.filter(l => l.status === 'active') ?? [];
  const runningInvs  = finance?.investments.filter(i => i.status === 'running') ?? [];
  const doneInvs     = finance?.investments.filter(i => i.status === 'done') ?? [];

  // 计算在运投资预计总盈利（基于profitRate）
  const totalEstimatedProfit = runningInvs.reduce((acc, inv) => {
    const tpl = INVEST_TEMPLATES.find(t => t.name === inv.name);
    if (!tpl) return acc;
    const durationYears = tpl.durationDays / 365;
    return acc + Math.round(inv.amount * tpl.profitRate * durationYears);
  }, 0);

  // 月均资金收入（贷款利息成本）
  const monthlyLoanCost = activeLoans.reduce((acc, l) => acc + l.monthlyPay, 0);

  const rankLevel = save?.rankLevel ?? 1;
  const isNationalScope = rankLevel >= 12;

  // 贷款按职级匹配：小额→乡镇(1-3)，县域→县级(4-6)，城市债→市级(7-9)，省级→省级+(10+)
  const loanLevelMap = [3, 6, 9, 99]; // LOAN_TEMPLATES[i] 适用的最大职级
  const availableLoans = LOAN_TEMPLATES.map((tpl, i) => {
    const minRank = i === 0 ? 1 : i === 1 ? 4 : i === 2 ? 7 : 10;
    const maxRank = loanLevelMap[i];
    return { tpl, idx: i, minRank, maxRank, available: rankLevel >= minRank && rankLevel <= maxRank };
  });

  // 招商投资按 minRank/maxRank 过滤
  const availableInvests = INVEST_TEMPLATES.map((tpl, i) => ({
    tpl, idx: i,
    available: rankLevel >= tpl.minRank && (tpl.maxRank === -1 || rankLevel <= tpl.maxRank),
  }));

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      <View style={{ backgroundColor: '#2B4B6F', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>
            {isNationalScope ? '国家发展改革委' : '金融局'}
          </Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>
            {isNationalScope ? '国家金融投资' : '城市金融'}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10 }}>{save?.rankName}</Text>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600', marginTop: 1 }}>
            {isNationalScope ? '全国范围' : save?.cityName}
          </Text>
        </View>
      </View>

      {/* 国政院级别全国范围横幅 */}
      {isNationalScope && (
        <View style={{ backgroundColor: '#C82829', paddingVertical: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 14 }}>🏦</Text>
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', flex: 1 }}>
            国家级金融调控 · 覆盖全国所有城市
          </Text>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ color: '#fff', fontSize: 9 }}>全国</Text>
          </View>
        </View>
      )}

      {/* Tab */}
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#D1D1CF' }}>
        {TABS.map(t => (
          <Pressable
            key={t.key}
            onPress={() => { setTab(t.key); setActionMsg(''); }}
            style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderColor: tab === t.key ? '#C82829' : 'transparent' }}
          >
            <Text style={{ fontSize: 13, color: tab === t.key ? '#C82829' : '#888', fontWeight: tab === t.key ? '700' : '400' }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#1D3B5E" />
        </View>
      ) : (
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 16, gap: 14 }}>
          {/* 消息提示 */}
          {actionMsg ? (
            <View style={{ backgroundColor: actionOk ? '#f0faf3' : '#fff5f5', borderWidth: 1, borderColor: actionOk ? '#2a7a3b' : '#C82829', padding: 10 }}>
              <Text style={{ fontSize: 12, color: actionOk ? '#2a7a3b' : '#C82829' }}>{actionMsg}</Text>
            </View>
          ) : null}

          {/* 概览 */}
          {tab === 'overview' && (
            <>
              {/* 资金主卡 */}
              <View style={{ backgroundColor: '#2B4B6F', padding: 16 }}>
                <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>
                  {isNationalScope ? '国家可调配资金' : '城市可用资金'}
                </Text>
                <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700', marginTop: 4, fontVariant: ['tabular-nums'] }}>
                  {formatFund(save?.fundBalance ?? 0)}
                </Text>
                <View style={{ flexDirection: 'row', gap: 20, marginTop: 10 }}>
                  <View>
                    <Text style={{ color: '#a0b4cc', fontSize: 9 }}>月贷款支出</Text>
                    <Text style={{ color: '#FF8A80', fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                      -{monthlyLoanCost.toFixed(0)} 万
                    </Text>
                  </View>
                  <View>
                    <Text style={{ color: '#a0b4cc', fontSize: 9 }}>在运投资预计盈利</Text>
                    <Text style={{ color: '#69F0AE', fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                      +{totalEstimatedProfit.toLocaleString()} 万
                    </Text>
                  </View>
                  <View>
                    <Text style={{ color: '#a0b4cc', fontSize: 9 }}>税收指数</Text>
                    <Text style={{ color: '#69F0AE', fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                      {save.taxRevenue ?? 0}
                    </Text>
                  </View>
                </View>
              </View>

              {/* 财务状况 */}
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
                <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 8 }}>财务状况</Text>
                <StatRow label="可用资金余额" value={formatFund(save?.fundBalance ?? 0)} color="#1D3B5E" />
                <StatRow label="未偿还贷款" value={formatFund(finance?.debtTotal ?? 0)} color={((finance?.debtTotal ?? 0) > 0) ? '#C82829' : '#888'} />
                <StatRow label="活跃贷款数" value={`${activeLoans.length} 笔`} />
                <StatRow label="在运投资项目" value={`${runningInvs.length} 项`} color="#2a7a3b" />
                <StatRow label="已完成投资" value={`${doneInvs.length} 项`} color="#888" />
                <StatRow label="城市税收指数" value={`${save.taxRevenue ?? 0} 点`} color="#1D3B5E" />
                <StatRow label="投资集团" value={finance?.investGroupEstDay ? `✓ 已成立（第${finance.investGroupEstDay}天）` : '未成立'} color={finance?.investGroupEstDay ? '#2a7a3b' : '#888'} />
              </View>

              {/* 投资盈利明细 */}
              {runningInvs.length > 0 && (
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
                  <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 8 }}>📈 投资盈利预测</Text>
                  {runningInvs.map(inv => {
                    const tpl = INVEST_TEMPLATES.find(t => t.name === inv.name);
                    const profitRate = tpl?.profitRate ?? 0.10;
                    const durationYears = tpl ? tpl.durationDays / 365 : 1;
                    const estProfit = Math.round(inv.amount * profitRate * durationYears);
                    return (
                      <View key={inv.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f0f0f0' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#222' }}>{inv.name}</Text>
                          <Text style={{ fontSize: 12, color: '#2a7a3b', fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                            预计盈利 +{estProfit.toLocaleString()} 万
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 11, color: '#888' }}>
                            投入 {inv.amount.toLocaleString()} 万　年化 {((profitRate) * 100).toFixed(0)}%
                          </Text>
                          <Text style={{ fontSize: 11, color: '#888' }}>到期 {gameDaysToDate(inv.endDay)}</Text>
                        </View>
                      </View>
                    );
                  })}
                  <View style={{ marginTop: 8, backgroundColor: '#f0faf3', padding: 10 }}>
                    <Text style={{ fontSize: 11, color: '#2a7a3b' }}>
                      合计预期盈利：<Text style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>+{totalEstimatedProfit.toLocaleString()} 万元</Text>
                    </Text>
                  </View>
                </View>
              )}

              {/* 贷款还款计划 */}
              {activeLoans.length > 0 && (
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
                  <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 8 }}>💳 贷款还款计划</Text>
                  {activeLoans.map(l => (
                    <View key={l.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f0f0f0' }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12, color: '#333' }}>本金 <Text style={{ fontWeight: '700' }}>{l.amount.toLocaleString()} 万元</Text></Text>
                        <Text style={{ fontSize: 11, color: '#C82829', fontWeight: '700' }}>月供 {l.monthlyPay.toFixed(1)} 万元</Text>
                      </View>
                      <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                        到期：{gameDaysToDate(l.dueDay)}　年利率：{(l.rate * 100).toFixed(1)}%
                      </Text>
                    </View>
                  ))}
                  <View style={{ marginTop: 8, backgroundColor: '#fff5f5', padding: 10 }}>
                    <Text style={{ fontSize: 11, color: '#C82829' }}>
                      每月总还款：<Text style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>{monthlyLoanCost.toFixed(1)} 万元</Text>
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}

          {/* 银行贷款 */}
          {tab === 'loan' && (
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
              <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 12 }}>
                {isNationalScope ? '可申请国家专项债券/主权债务' : '可申请政策性贷款'}
              </Text>
              {availableLoans.map(({ tpl, idx, available }) => (
                <View key={idx} style={{ borderWidth: 1, borderColor: available ? '#D1D1CF' : '#e8e8e8', padding: 12, marginBottom: 10, backgroundColor: available ? '#fafafa' : '#f5f5f5', opacity: available ? 1 : 0.5 }}>
                  {!available && (
                    <View style={{ backgroundColor: '#888', paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 6 }}>
                      <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>职级不符</Text>
                    </View>
                  )}
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#2B4B6F', marginBottom: 4 }}>{tpl.name}</Text>
                  <Text style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>{tpl.desc}</Text>
                  <View style={{ flexDirection: 'row', gap: 16, marginBottom: 10 }}>
                    <Text style={{ fontSize: 11, color: '#333' }}>额度 <Text style={{ fontWeight: '700' }}>{tpl.amount.toLocaleString()} 万</Text></Text>
                    <Text style={{ fontSize: 11, color: '#333' }}>利率 <Text style={{ fontWeight: '700' }}>{(tpl.rateYearly * 100).toFixed(1)}%</Text></Text>
                    <Text style={{ fontSize: 11, color: '#333' }}>期限 <Text style={{ fontWeight: '700' }}>{Math.round(tpl.durationDays / 365)} 年</Text></Text>
                  </View>
                  <Pressable
                    onPress={() => void handleLoan(idx)}
                    disabled={acting || !available}
                    style={{ backgroundColor: available ? '#2B4B6F' : '#ccc', padding: 10, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{available ? '申请贷款' : '职级不足'}</Text>
                  </Pressable>
                </View>
              ))}
              <Text style={{ fontSize: 11, color: '#888', lineHeight: 18, marginTop: 4 }}>
                注意：贷款需按月偿还，逾期将降低考评等级和政绩值
              </Text>
            </View>
          )}

          {/* 招商投资 */}
          {tab === 'invest' && (
            <>
              {!finance?.investGroupEstDay ? (
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 16, alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 14, color: '#333', fontWeight: '700' }}>
                    {isNationalScope ? '成立国家战略投资基金' : '成立城市投资集团'}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#888', textAlign: 'center' }}>
                    {isNationalScope
                      ? '成立国家战略投资基金后，可在全国范围开展重大投资布局，定期获得GDP和营商环境指数收益'
                      : '成立城市投资集团后，可开展招商引资项目，定期获得GDP和营商环境指数收益'}
                  </Text>
                  <Pressable onPress={() => void handleEstablishGroup()} disabled={acting} style={{ backgroundColor: '#C82829', paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 }}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>立即成立</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={{ backgroundColor: '#2a7a3b', padding: 12 }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                      {isNationalScope ? '国家战略投资基金' : '城市投资集团'}　成立于 {gameDaysToDate(finance.investGroupEstDay)}
                    </Text>
                    <Text style={{ color: '#c8f0d0', fontSize: 11, marginTop: 3 }}>在运项目 {runningInvs.length} 项　可用资金 {(save?.fundBalance ?? 0).toLocaleString()} 万元</Text>
                  </View>
                  <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
                    <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 12 }}>招商引资项目</Text>
                    {availableInvests.map(({ tpl, idx, available }) => {
                      const durationYears = tpl.durationDays / 365;
                      const estProfit = Math.round(tpl.amount * tpl.profitRate * durationYears);
                      const roi = (tpl.profitRate * durationYears * 100).toFixed(0);
                      const isRunning = runningInvs.some(r => r.name === tpl.name);
                      const canAfford = (save?.fundBalance ?? 0) >= tpl.amount;
                      return (
                        <View key={idx} style={{ borderWidth: 1, borderColor: isRunning ? '#c8e6c9' : available ? '#D1D1CF' : '#e8e8e8', padding: 12, marginBottom: 10, backgroundColor: isRunning ? '#f0faf3' : available ? '#fafafa' : '#f5f5f5', opacity: available ? 1 : 0.5 }}>
                          {!available && (
                            <View style={{ backgroundColor: '#888', paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 6 }}>
                              <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>职级不符</Text>
                            </View>
                          )}
                          {isRunning && (
                            <View style={{ backgroundColor: '#2a7a3b', paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 6 }}>
                              <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>进行中</Text>
                            </View>
                          )}
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#222', marginBottom: 4 }}>{tpl.name}</Text>
                          <Text style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>{tpl.desc}</Text>
                          {/* 投资数据行 */}
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                            <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 10, paddingVertical: 5 }}>
                              <Text style={{ fontSize: 9, color: '#888' }}>投入资金</Text>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#C82829', fontVariant: ['tabular-nums'] }}>{tpl.amount.toLocaleString()} 万</Text>
                            </View>
                            <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 10, paddingVertical: 5 }}>
                              <Text style={{ fontSize: 9, color: '#888' }}>投资周期</Text>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#222' }}>{Math.round(tpl.durationDays / 30)} 个月</Text>
                            </View>
                            <View style={{ backgroundColor: '#e8f5e9', paddingHorizontal: 10, paddingVertical: 5 }}>
                              <Text style={{ fontSize: 9, color: '#888' }}>年化盈利率</Text>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#2a7a3b' }}>{(tpl.profitRate * 100).toFixed(0)}%</Text>
                            </View>
                            <View style={{ backgroundColor: '#e8f5e9', paddingHorizontal: 10, paddingVertical: 5 }}>
                              <Text style={{ fontSize: 9, color: '#888' }}>预计盈利</Text>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#2a7a3b', fontVariant: ['tabular-nums'] }}>+{estProfit.toLocaleString()} 万</Text>
                            </View>
                            <View style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 10, paddingVertical: 5 }}>
                              <Text style={{ fontSize: 9, color: '#888' }}>ROI</Text>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#7A5C00' }}>{roi}%</Text>
                            </View>
                          </View>
                          {/* 城市效益 */}
                          <Text style={{ fontSize: 10, color: '#888', marginBottom: 8 }}>
                            到期城市效益：
                            <Text style={{ color: '#2B4B6F', fontWeight: '600' }}>
                              {tpl.effectType === 'gdp' ? 'GDP' : tpl.effectType === 'business' ? '营商' : tpl.effectType === 'livelihood' ? '民生' : '生态'} +{tpl.effectValue} 点
                            </Text>
                          </Text>
                          <Pressable
                            onPress={() => void handleInvest(idx)}
                            disabled={acting || !canAfford || isRunning || !available}
                            style={{ backgroundColor: isRunning || !available ? '#ccc' : canAfford ? '#2B4B6F' : '#ccc', padding: 10, alignItems: 'center' }}
                          >
                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                              {!available ? '职级不足' : isRunning ? '项目进行中' : canAfford ? '启动投资项目' : `资金不足（差 ${(tpl.amount - (save?.fundBalance ?? 0)).toLocaleString()} 万）`}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                  {runningInvs.length > 0 && (
                    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
                      <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 8 }}>在运项目</Text>
                      {runningInvs.map(inv => (
                        <View key={inv.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f0f0f0' }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12, color: '#333', fontWeight: '600' }}>{inv.name}</Text>
                            <Text style={{ fontSize: 11, color: '#2a7a3b' }}>到期+{inv.effectValue}点</Text>
                          </View>
                          <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>到期：{gameDaysToDate(inv.endDay)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </>
          )}

          {acting && <ActivityIndicator color="#1D3B5E" />}
        </ScrollView>
      )}
    </View>
  );
}
```
