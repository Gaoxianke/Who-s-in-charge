// 封禁记录 Tab：展示 banned_entities 全部封禁记录，支持类型筛选 + 超管解封
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  adminListBannedEntities, adminUnbanEntity, adminBannedEntitiesStats,
  type BannedEntityRow, type BannedEntitiesStats,
} from '@/lib/adminApi';
import { A, Badge, Btn, Empty } from './shared';

const TYPE_LABELS: Record<string, string> = {
  user: '账号', email: '邮箱', device: '设备', ip: 'IP地址', vpn: 'VPN',
};
const TYPE_COLORS: Record<string, string> = {
  user: '#C82829', email: '#C8A84B', device: '#4A7FBF', ip: '#8B5CF6', vpn: '#F97316',
};

type TypeFilter = 'all' | 'user' | 'email' | 'device' | 'ip';

export function BannedTab({ role }: { role: string }) {
  const isSuperAdmin = role === 'super_admin';
  const [records, setRecords] = useState<BannedEntityRow[]>([]);
  const [stats, setStats] = useState<BannedEntitiesStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [page, setPage] = useState(0);
  const PAGE = 30;
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [unbanning, setUnbanning] = useState<string | null>(null);

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 5000);
  };

  const load = useCallback(async (p = 0, t: TypeFilter = typeFilter) => {
    setLoading(true);
    const [data, s] = await Promise.all([
      adminListBannedEntities(PAGE, p * PAGE, t === 'all' ? undefined : t),
      adminBannedEntitiesStats(),
    ]);
    setRecords(data);
    setStats(s);
    setLoading(false);
  }, [typeFilter]);

  useFocusEffect(useCallback(() => { setPage(0); load(0, typeFilter); }, [load, typeFilter]));

  const handleFilter = (t: TypeFilter) => {
    setTypeFilter(t);
    setPage(0);
    load(0, t);
  };

  const handleUnban = async (id: string) => {
    setUnbanning(id);
    const res = await adminUnbanEntity(id);
    setUnbanning(null);
    if (res.ok) {
      flash(true, '✓ 已解封该记录');
      load(page);
    } else {
      flash(false, `解封失败：${res.err ?? ''}`);
    }
  };

  const formatDate = (s: string) => new Date(s).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' });
  const formatUntil = (s: string) => {
    const d = new Date(s);
    if (d.getFullYear() > 2100) return '永久（100年）';
    return d.toLocaleDateString('zh-CN');
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* 消息提示 */}
      {msg ? (
        <View style={{ backgroundColor: msg.ok ? A.greenBg : A.redBg, borderLeftWidth: 2, borderLeftColor: msg.ok ? A.green : A.red, paddingHorizontal: 10, paddingVertical: 7 }}>
          <Text style={{ color: msg.ok ? '#7FE0A0' : '#FF7070', fontSize: 12 }}>{msg.text}</Text>
        </View>
      ) : null}

      {/* ── 统计卡片 ── */}
      {stats ? (
        <View style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, padding: 12, gap: 10 }}>
          <Text style={{ color: A.goldLight, fontSize: 12, fontWeight: '700' }}>📊 封禁统计</Text>
          {/* 今日 + 总活跃 */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, backgroundColor: '#1A0D0D', borderWidth: 1, borderColor: A.red, padding: 10, alignItems: 'center', gap: 2 }}>
              <Text style={{ color: A.red, fontSize: 20, fontWeight: '900' }}>{stats.today}</Text>
              <Text style={{ color: A.textHint, fontSize: 10 }}>今日新增</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#0D1A0D', borderWidth: 1, borderColor: A.green, padding: 10, alignItems: 'center', gap: 2 }}>
              <Text style={{ color: '#7FE0A0', fontSize: 20, fontWeight: '900' }}>{stats.total_active}</Text>
              <Text style={{ color: A.textHint, fontSize: 10 }}>当前有效封禁</Text>
            </View>
          </View>
          {/* 分类分布 */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {([
              ['账号', 'user', '#C82829', stats.by_type.user],
              ['邮箱', 'email', '#C8A84B', stats.by_type.email],
              ['设备', 'device', '#4A7FBF', stats.by_type.device],
              ['IP', 'ip', '#8B5CF6', stats.by_type.ip],
              ['VPN', 'vpn', '#F97316', stats.by_type.vpn],
            ] as [string, string, string, number][]).map(([label, , color, count]) => (
              <View key={label} style={{ borderWidth: 1, borderColor: color, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', minWidth: 60, gap: 2 }}>
                <Text style={{ color, fontSize: 16, fontWeight: '700' }}>{count}</Text>
                <Text style={{ color: A.textHint, fontSize: 9 }}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* 说明 */}
      <View style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, padding: 10, gap: 4 }}>
        <Text style={{ color: A.red, fontSize: 12, fontWeight: '700' }}>🚫 封禁记录库</Text>
        <Text style={{ color: A.textSecond, fontSize: 11, lineHeight: 16 }}>
          {'• 包含账号/邮箱/设备指纹/IP 四种封禁类型\n'}
          {'• 删除账号时自动写入；同设备/同IP重复注册时自动双封\n'}
          {'• 注册时自动检测所有活跃封禁记录，命中则拒绝\n'}
          {'• 超级管理员可手动解封某条记录（不影响其他同账号封禁）'}
        </Text>
      </View>

      {/* 类型筛选 */}
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <Text style={{ color: A.textHint, fontSize: 10 }}>类型：</Text>
        {(['all', 'user', 'email', 'device', 'ip'] as TypeFilter[]).map((t) => (
          <Pressable
            key={t}
            cssInterop={false}
            onPress={() => handleFilter(t)}
            style={{
              paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1,
              borderColor: typeFilter === t ? (TYPE_COLORS[t] ?? A.gold) : A.divider,
              backgroundColor: typeFilter === t ? `${(TYPE_COLORS[t] ?? A.gold)}22` : 'transparent',
            }}
          >
            <Text style={{ color: typeFilter === t ? (TYPE_COLORS[t] ?? A.goldLight) : A.textSecond, fontSize: 11, fontWeight: typeFilter === t ? '700' : '400' }}>
              {t === 'all' ? '全部' : (TYPE_LABELS[t] ?? t)}
            </Text>
          </Pressable>
        ))}
        <Btn label="刷新" onPress={() => load(page)} variant="ghost" small />
      </View>

      {/* 列表 */}
      {loading ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator color={A.red} size="large" />
        </View>
      ) : records.length === 0 ? (
        <Empty text="暂无封禁记录" />
      ) : (
        records.map((r) => (
          <View
            key={r.id}
            style={{
              backgroundColor: r.is_active ? '#1A0D0D' : A.bgCard,
              borderWidth: 1,
              borderColor: r.is_active ? A.red : A.divider,
              padding: 12, gap: 6,
            }}
          >
            {/* 类型标签 + 活跃状态 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ borderWidth: 1, borderColor: TYPE_COLORS[r.entity_type] ?? A.divider, paddingHorizontal: 7, paddingVertical: 3 }}>
                <Text style={{ color: TYPE_COLORS[r.entity_type] ?? A.textSecond, fontSize: 10, fontWeight: '700' }}>
                  {TYPE_LABELS[r.entity_type] ?? r.entity_type}
                </Text>
              </View>
              <Badge text={r.is_active ? '🔴 封禁中' : '⚪ 已失效'} color={r.is_active ? A.red : A.textHint} />
            </View>

            {/* 封禁值 */}
            <Text style={{ color: A.textPrimary, fontSize: 12, fontWeight: '700', fontFamily: 'monospace' }}>
              {r.entity_value ?? '—'}
            </Text>

            {/* 关联账号 */}
            {r.email ? (
              <Text style={{ color: A.textSecond, fontSize: 11 }}>账号：{r.email}</Text>
            ) : null}

            {/* 原因 */}
            {r.ban_reason ? (
              <Text style={{ color: r.is_active ? '#FF9090' : A.textHint, fontSize: 11 }}>
                原因：{r.ban_reason}
              </Text>
            ) : null}

            {/* 时间 */}
            <View style={{ gap: 2 }}>
              <Text style={{ color: A.textHint, fontSize: 10 }}>封禁时间：{formatDate(r.banned_at)}</Text>
              <Text style={{ color: A.textHint, fontSize: 10 }}>到期时间：{formatUntil(r.banned_until)}</Text>
              {r.banned_by_email ? (
                <Text style={{ color: A.textHint, fontSize: 10 }}>操作人：{r.banned_by_email}</Text>
              ) : null}
            </View>

            {/* 超管解封 */}
            {isSuperAdmin && r.is_active ? (
              <Btn
                label={unbanning === r.id ? '解封中…' : '🔓 解封此条记录'}
                onPress={() => handleUnban(r.id)}
                variant="ghost"
                small
                disabled={unbanning === r.id}
              />
            ) : null}
          </View>
        ))
      )}

      {/* 分页 */}
      {!loading && records.length === PAGE ? (
        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
          {page > 0 ? <Btn label="◀ 上一页" onPress={() => { const p = page - 1; setPage(p); load(p); }} variant="ghost" small /> : null}
          <Text style={{ color: A.textHint, fontSize: 11, alignSelf: 'center' }}>第 {page + 1} 页</Text>
          <Btn label="下一页 ▶" onPress={() => { const p = page + 1; setPage(p); load(p); }} variant="ghost" small />
        </View>
      ) : null}
    </ScrollView>
  );
}
