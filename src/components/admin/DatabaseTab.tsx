// 数据库管理 Tab（admin+）：各政务大区容量与玩家数；超管可添加/编辑/停用
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { A, Badge, Btn, Card, Empty } from './shared';
import { adminDatabaseOverview, adminCreateDatabase, adminToggleDatabaseActive, adminUpdateDatabase, type DatabaseNode } from '@/lib/adminApi';

const isSuperAdmin = (role: string) => role === 'super_admin';

export function DatabaseTab({ role }: { role: string }) {
  const [dbs, setDbs] = useState<DatabaseNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editDb, setEditDb] = useState<DatabaseNode | null>(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [cap, setCap] = useState('1000');
  const [saving, setSaving] = useState(false);

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    const list = await adminDatabaseOverview();
    setDbs(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    timer.current = setInterval(load, 30000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 2500);
  };

  const openAdd = () => {
    setCode(''); setName(''); setCap('1000'); setSaving(false);
    setAddOpen(true);
  };

  const openEdit = (db: DatabaseNode) => {
    setEditDb(db); setName(db.name); setCap(String(db.capacity_limit)); setSaving(false);
  };

  const submitAdd = async () => {
    if (!code.trim() || !name.trim()) { flash(false, '编码和名称不能为空'); return; }
    const capNum = Number(cap);
    if (!capNum || capNum < 100) { flash(false, '容量上限至少为 100'); return; }
    setSaving(true);
    const { ok, err } = await adminCreateDatabase(code.trim(), name.trim(), capNum);
    setSaving(false);
    if (!ok) { flash(false, err ?? '添加失败'); return; }
    setAddOpen(false);
    flash(true, '✓ 已添加新大区');
    load();
  };

  const submitEdit = async () => {
    if (!editDb) return;
    if (!name.trim()) { flash(false, '名称不能为空'); return; }
    const capNum = Number(cap);
    if (!capNum || capNum < 100) { flash(false, '容量上限至少为 100'); return; }
    setSaving(true);
    const { ok, err } = await adminUpdateDatabase(editDb.id, name.trim(), capNum);
    setSaving(false);
    if (!ok) { flash(false, err ?? '更新失败'); return; }
    setEditDb(null);
    flash(true, '✓ 已更新大区信息');
    load();
  };

  const toggleActive = async (db: DatabaseNode) => {
    const { ok, err } = await adminToggleDatabaseActive(db.id, !db.is_active);
    if (!ok) { flash(false, err ?? '操作失败'); return; }
    flash(true, db.is_active ? '✓ 已停用大区' : '✓ 已启用大区');
    load();
  };

  const activeCount = dbs.filter((d) => d.is_active).length;
  const totalPlayers = dbs.reduce((s, d) => s + d.player_count, 0);
  const totalOnline = dbs.reduce((s, d) => s + d.online_count, 0);
  const fullCount = dbs.filter((d) => d.is_full || (d.capacity_limit > 0 && d.player_count / d.capacity_limit >= 1)).length;

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false}>
      {/* 顶部统计条 */}
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <View style={{ flex: 1, backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, padding: 10, alignItems: 'center' }}>
          <Text style={{ color: A.goldLight, fontSize: 16, fontWeight: '700' }}>{activeCount}</Text>
          <Text style={{ color: A.textSecond, fontSize: 10 }}>启用大区</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, padding: 10, alignItems: 'center' }}>
          <Text style={{ color: A.goldLight, fontSize: 16, fontWeight: '700' }}>{totalPlayers}</Text>
          <Text style={{ color: A.textSecond, fontSize: 10 }}>总玩家</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, padding: 10, alignItems: 'center' }}>
          <Text style={{ color: A.green, fontSize: 16, fontWeight: '700' }}>{totalOnline}</Text>
          <Text style={{ color: A.textSecond, fontSize: 10 }}>在线</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, padding: 10, alignItems: 'center' }}>
          <Text style={{ color: A.red, fontSize: 16, fontWeight: '700' }}>{fullCount}</Text>
          <Text style={{ color: A.textSecond, fontSize: 10 }}>满载大区</Text>
        </View>
      </View>

      {msg ? (
        <View style={{ backgroundColor: msg.ok ? A.greenBg : A.redBg, borderLeftWidth: 2, borderLeftColor: msg.ok ? A.green : A.red, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ color: msg.ok ? '#7FE0A0' : '#FF7070', fontSize: 12 }}>{msg.text}</Text>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Btn label="刷新" onPress={load} variant="ghost" small style={{ flex: 1 }} />
        {isSuperAdmin(role) ? <Btn label="+ 手动添加大区" onPress={openAdd} variant="gold" small style={{ flex: 1 }} /> : null}
      </View>

      {loading ? <ActivityIndicator color={A.gold} size="large" /> :
        dbs.length === 0 ? <Empty text="暂无大区数据" /> :
        dbs.map((db) => {
          const ratio = db.capacity_limit > 0 ? Math.min(1, db.player_count / db.capacity_limit) : 0;
          const full = db.is_full || ratio >= 1;
          const near = !full && ratio >= 0.8;
          const badge = !db.is_active ? { t: '停用', c: A.textHint } : full ? { t: '已满', c: A.red } : near ? { t: '即将满', c: A.orange } : { t: '正常', c: A.green };
          return (
            <Card key={db.id} title={db.name} accent={full ? A.red : A.green} style={{ opacity: db.is_active ? 1 : 0.55 }}>
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: A.textHint, fontSize: 10 }}>{db.code}</Text>
                  <Badge text={badge.t} color={badge.c} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: A.textSecond, fontSize: 11 }}>玩家数</Text>
                  <Text style={{ color: A.textPrimary, fontSize: 13, fontWeight: '600' }}>{db.player_count} / {db.capacity_limit}</Text>
                </View>
                <View style={{ height: 8, backgroundColor: A.divider, borderRadius: 4 }}>
                  <View style={{ height: 8, width: `${Math.round(ratio * 100)}%`, backgroundColor: full ? A.red : A.gold, borderRadius: 4 }} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: A.textSecond, fontSize: 11 }}>使用率</Text>
                  <Text style={{ color: full ? A.red : A.goldLight, fontSize: 12 }}>{Math.round(ratio * 100)}%</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: A.textSecond, fontSize: 11 }}>在线玩家</Text>
                  <Text style={{ color: A.green, fontSize: 12, fontWeight: '600' }}>{db.online_count}</Text>
                </View>
                {isSuperAdmin(role) ? (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                    <Btn label="编辑" onPress={() => openEdit(db)} variant="blue" small style={{ flex: 1 }} />
                    <Btn label={db.is_active ? '停用' : '启用'} onPress={() => toggleActive(db)} variant={db.is_active ? 'red' : 'green'} small style={{ flex: 1 }} />
                  </View>
                ) : null}
              </View>
            </Card>
          );
        })
      }

      {/* 添加大区弹窗 */}
      <Modal visible={addOpen} transparent animationType="fade" onRequestClose={() => setAddOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 }} onPress={() => setAddOpen(false)}>
          <Pressable style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, padding: 16, gap: 10 }} onPress={(e) => e.stopPropagation()}>
            <Text style={{ color: A.goldLight, fontSize: 14, fontWeight: '700', letterSpacing: 1 }}>手动添加大区</Text>
            <Text style={{ color: A.textSecond, fontSize: 11 }}>大区编码</Text>
            <TextInput value={code} onChangeText={setCode} placeholder="如 db_5" placeholderTextColor={A.textHint} style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }} />
            <Text style={{ color: A.textSecond, fontSize: 11 }}>大区名称</Text>
            <TextInput value={name} onChangeText={setName} placeholder="如 华南政务大区" placeholderTextColor={A.textHint} style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }} />
            <Text style={{ color: A.textSecond, fontSize: 11 }}>容量上限（≥100）</Text>
            <TextInput value={cap} onChangeText={setCap} placeholder="1000" placeholderTextColor={A.textHint} keyboardType="number-pad" style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Btn label="取消" onPress={() => setAddOpen(false)} variant="ghost" small style={{ flex: 1 }} />
              <Btn label={saving ? '提交中...' : '确认添加'} onPress={submitAdd} variant="gold" disabled={saving} small style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 编辑大区弹窗 */}
      <Modal visible={!!editDb} transparent animationType="fade" onRequestClose={() => setEditDb(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 }} onPress={() => setEditDb(null)}>
          <Pressable style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, padding: 16, gap: 10 }} onPress={(e) => e.stopPropagation()}>
            <Text style={{ color: A.goldLight, fontSize: 14, fontWeight: '700', letterSpacing: 1 }}>编辑大区 · {editDb?.code}</Text>
            <Text style={{ color: A.textSecond, fontSize: 11 }}>大区名称</Text>
            <TextInput value={name} onChangeText={setName} placeholder="大区名称" placeholderTextColor={A.textHint} style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }} />
            <Text style={{ color: A.textSecond, fontSize: 11 }}>容量上限（≥100）</Text>
            <TextInput value={cap} onChangeText={setCap} placeholder="1000" placeholderTextColor={A.textHint} keyboardType="number-pad" style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Btn label="取消" onPress={() => setEditDb(null)} variant="ghost" small style={{ flex: 1 }} />
              <Btn label={saving ? '提交中...' : '保存'} onPress={submitEdit} variant="gold" disabled={saving} small style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
