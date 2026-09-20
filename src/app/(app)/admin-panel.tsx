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
