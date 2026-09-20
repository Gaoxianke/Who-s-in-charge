// 玩家存档名称检查（超管 + 普通管理员均可见）
// 检索所有玩家存档名称，按首字符分组（字典序），支持改名
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { adminListPlayerNames, adminRenamePlayer, adminToggleBan, type PlayerNameRow } from '@/lib/adminApi';
import { A, Badge, Btn, Empty } from './shared';

const PAGE_SIZE = 50;

// 取首字符作为分组键
function groupKey(name: string): string {
  if (!name) return '#';
  const ch = name.trim().charAt(0);
  const code = ch.charCodeAt(0);
  if (code >= 0x4e00 && code <= 0x9fff) return ch; // 中文：取该汉字
  if (/[a-zA-Z]/.test(ch)) return ch.toUpperCase();
  if (/[0-9]/.test(ch)) return '0-9';
  return '#';
}

export function PlayerNameTab() {
  const [rows, setRows] = useState<PlayerNameRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  // 改名弹窗
  const [editTarget, setEditTarget] = useState<PlayerNameRow | null>(null);
  const [editValue, setEditValue] = useState('');
  const [renameErr, setRenameErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const load = useCallback(async (p: number) => {
    setLoading(true);
    const data = await adminListPlayerNames(search || undefined, PAGE_SIZE, p * PAGE_SIZE);
    setRows(data);
    setTotal(data.length < PAGE_SIZE && p === 0 ? data.length : (p + 1) * PAGE_SIZE + (data.length === PAGE_SIZE ? 1 : 0));
    setLoading(false);
  }, [search]);

  useFocusEffect(useCallback(() => { load(0); setPage(0); }, [load]));

  const openEdit = (r: PlayerNameRow) => { setEditTarget(r); setEditValue(''); setRenameErr(''); };

  const confirmRename = async () => {
    if (!editTarget) return;
    const name = editValue.trim();
    if (name.length < 1 || name.length > 20) { setRenameErr('名称长度需为1-20字符'); return; }
    setSaving(true);
    const res = await adminRenamePlayer(editTarget.id, name);
    setSaving(false);
    if (res.ok) {
      flash(true, `✓ 已将「${editTarget.player_name}」改名为「${name}」`);
      setEditTarget(null);
      setRenameErr('');
      load(page);
    } else {
      // 弹窗内标红显示错误（熔断 / 敏感词等）
      setRenameErr(res.err ?? '改名失败，请重试');
    }
  };

  const onBan = async (row: PlayerNameRow) => {
    const res = await adminToggleBan(row.user_id, !row.banned);
    if (res.ok) {
      flash(true, row.banned ? `✓ 已解封「${row.player_name}」` : `✓ 已封禁「${row.player_name}」`);
      load(page);
    } else {
      flash(false, `操作失败：${res.err ?? ''}`);
    }
  };

  // 分组
  const groups: { key: string; items: PlayerNameRow[] }[] = [];
  const map = new Map<string, PlayerNameRow[]>();
  rows.forEach((r) => {
    const k = groupKey(r.player_name);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(r);
  });
  [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'zh')).forEach(([key, items]) => {
    groups.push({ key, items: items.sort((x, y) => x.player_name.localeCompare(y.player_name, 'zh')) });
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      <Text style={{ color: A.gold, fontSize: 12, fontWeight: '700' }}>🔍 玩家存档名称检查</Text>

      {msg ? (
        <View style={{ backgroundColor: msg.ok ? A.greenBg : A.redBg, borderLeftWidth: 2, borderLeftColor: msg.ok ? A.green : A.red, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ color: msg.ok ? '#7FE0A0' : '#FF7070', fontSize: 12 }}>{msg.text}</Text>
        </View>
      ) : null}

      {/* 搜索 */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="按名称搜索"
          placeholderTextColor={A.textHint}
          onSubmitEditing={() => { setPage(0); load(0); }}
          style={{ flex: 1, backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }}
        />
        <Btn label="搜索" onPress={() => { setPage(0); load(0); }} variant="gold" small />
      </View>

      {loading ? (
        <ActivityIndicator color={A.gold} size="large" style={{ marginTop: 24 }} />
      ) : groups.length === 0 ? (
        <Empty text="暂无玩家存档" />
      ) : (
        groups.map((g) => (
          <View key={g.key} style={{ gap: 6 }}>
            <Text style={{ color: A.goldLight, fontSize: 12, fontWeight: '700', paddingHorizontal: 2 }}>
              {/^[A-Z0-9#]$/.test(g.key) ? g.key : `${g.key} · 拼音/汉字首字母`}
            </Text>
            {g.items.map((r) => (
              <View key={r.id} style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, padding: 12, gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={{ color: A.textPrimary, fontSize: 13, fontWeight: '700' }}>{r.player_name}</Text>
                      {r.banned ? <Badge text="封禁" color={A.red} /> : null}
                    </View>
                    <Text style={{ color: A.textHint, fontSize: 10 }}>Lv.{r.rank_level} {r.rank_name} · 账号 {r.email || '—'}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Btn label="改名" onPress={() => openEdit(r)} variant="blue" small style={{ flex: 1 }} />
                  <Btn label={r.banned ? '🔓 解封' : '🔒 封禁'} onPress={() => onBan(r)} variant={r.banned ? 'green' : 'red'} small style={{ flex: 1 }} />
                </View>
              </View>
            ))}
          </View>
        ))
      )}

      {/* 分页 */}
      {!search ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Btn label="◀ 上页" onPress={() => { const p = Math.max(0, page - 1); setPage(p); load(p); }} variant="ghost" small disabled={page === 0} />
          <Text style={{ color: A.textSecond, fontSize: 11 }}>第 {page + 1} / {totalPages} 页</Text>
          <Btn label="下页 ▶" onPress={() => { const p = page + 1; setPage(p); load(p); }} variant="ghost" small disabled={rows.length < PAGE_SIZE} />
        </View>
      ) : null}

      {/* 改名弹窗 */}
      <Modal visible={!!editTarget} transparent animationType="fade" onRequestClose={() => setEditTarget(null)}>
        <Pressable cssInterop={false} onPress={() => setEditTarget(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 }}>
          <Pressable cssInterop={false} onPress={() => {}} style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.gold, padding: 18, gap: 12 }}>
            <Text style={{ color: A.goldLight, fontSize: 14, fontWeight: '700' }}>✏️ 更改玩家存档名称</Text>
            <Text style={{ color: A.textHint, fontSize: 11 }}>原名：{editTarget?.player_name}</Text>
            <TextInput
              value={editValue}
              onChangeText={(v) => { setEditValue(v); setRenameErr(''); }}
              placeholder="输入新名称（1-20字符）"
              placeholderTextColor={A.textHint}
              maxLength={20}
              style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: renameErr ? A.red : A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }}
            />
            {/* 弹窗内直接标红显示错误（敏感词熔断等） */}
            {renameErr ? (
              <View style={{ backgroundColor: '#3A1515', borderLeftWidth: 2, borderLeftColor: A.red, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text style={{ color: '#FF7070', fontSize: 12, fontWeight: '600' }}>🚫 {renameErr}</Text>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Btn label="取消" onPress={() => { setEditTarget(null); setRenameErr(''); }} variant="ghost" small style={{ flex: 1 }} />
              <Btn label={saving ? '改名中…' : '确认改名'} onPress={confirmRename} variant="gold" small style={{ flex: 1 }} disabled={saving} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}