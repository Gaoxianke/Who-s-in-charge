// NPC名库管理 Tab
// 单区块：NPC姓名名册 — 管理员维护的完整姓名名册
//   ① 扫描存档去重导入
//   ② 单条手动添加
//   ③ 批量粘贴导入（逗号/换行分隔）
//   ④ 多选批量删除
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  adminListNpcNames, adminAddNpcName, adminDeleteNpcName, adminScanNpcNames, adminImportNpcNames, adminSyncNpcNamesFromSaves,
  type NpcNameRow,
} from '@/lib/adminApi';
import { Btn, Empty } from './shared';

export function NpcNameTab() {
  // ── 名册 ──
  const [roster, setRoster]         = useState<NpcNameRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');

  // 单条添加
  const [addInput, setAddInput]     = useState('');
  const [adding, setAdding]         = useState(false);

  // 批量粘贴添加
  const [batchInput, setBatchInput] = useState('');
  const [batchExpanded, setBatchExpanded] = useState(false);
  const [batchLoading, setBatchLoading]   = useState(false);

  // 批量删除
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [batchDelOpen, setBatchDelOpen] = useState(false);
  const [batchDeling, setBatchDeling] = useState(false);

  // 单条删除
  const [delId, setDelId]           = useState<string | null>(null);
  const [delName, setDelName]       = useState('');

  // 扫描
  const [scanning, setScanning]     = useState(false);
  // 同步
  const [syncing, setSyncing]       = useState(false);

  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 6000);
  };

  const loadRoster = useCallback(async (q?: string) => {
    setLoading(true);
    const rows = await adminListNpcNames(q || undefined, 2000, 0);
    setRoster(rows);
    setLoading(false);
    setSelected(new Set()); // 切换搜索后清空选中
  }, []);

  useFocusEffect(useCallback(() => { loadRoster(); }, [loadRoster]));

  // ── 扫描去重导入 ──
  const handleScan = async () => {
    setScanning(true);
    const res = await adminScanNpcNames();
    setScanning(false);
    flash(true, `扫描完成：共 ${res.scanned} 个NPC姓名，导入 ${res.imported} 个，跳过已存在 ${res.skipped} 个`);
    loadRoster();
  };

  // ── 服务端全量同步 ──
  const handleSync = async () => {
    setSyncing(true);
    const res = await adminSyncNpcNamesFromSaves();
    setSyncing(false);
    flash(true, `✓ 同步完成：本次导入 ${res.imported} 个新名字，名册共 ${res.total} 个`);
    loadRoster();
  };

  // ── 单条添加 ──
  const handleAdd = async () => {
    const v = addInput.trim();
    if (!v) { flash(false, '请输入NPC名字'); return; }
    setAdding(true);
    const res = await adminAddNpcName(v);
    setAdding(false);
    if (res.ok) { flash(true, `✓ 已添加「${v}」`); setAddInput(''); loadRoster(); }
    else { flash(false, `添加失败：${res.err ?? ''}`); }
  };

  // ── 批量粘贴添加 ──
  const handleBatchAdd = async () => {
    const raw = batchInput.trim();
    if (!raw) { flash(false, '请粘贴姓名（逗号或换行分隔）'); return; }
    const names = raw
      .split(/[,，\n]+/)
      .map(s => s.trim())
      .filter(s => s.length >= 2 && s.length <= 20);
    if (!names.length) { flash(false, '未识别到有效姓名（每个须2-20字符）'); return; }
    setBatchLoading(true);
    const res = await adminImportNpcNames(names);
    setBatchLoading(false);
    flash(true, `✓ 批量导入完成：导入 ${res.imported} 个，跳过已存在 ${res.skipped} 个`);
    setBatchInput('');
    setBatchExpanded(false);
    loadRoster();
  };

  // ── 单条删除 ──
  const confirmDelete = async () => {
    if (!delId) return;
    const res = await adminDeleteNpcName(delId);
    if (res.ok) { flash(true, `✓ 已删除「${delName}」`); setDelId(null); loadRoster(); }
    else { flash(false, `删除失败：${res.err ?? ''}`); }
  };

  // ── 批量删除 ──
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const handleBatchDelete = async () => {
    if (!selected.size) return;
    setBatchDeling(true);
    let ok = 0;
    for (const id of Array.from(selected)) {
      const row = roster.find(r => r.id === id);
      const res = await adminDeleteNpcName(id);
      if (res.ok) ok++;
      else flash(false, `删除「${row?.name}」失败`);
    }
    setBatchDeling(false);
    setBatchDelOpen(false);
    setSelectMode(false);
    setSelected(new Set());
    flash(true, `✓ 已删除 ${ok} 个NPC名字`);
    loadRoster();
  };

  const displayRows = roster.filter(r => !search.trim() || r.name.includes(search.trim()));

  return (
    <View style={{ flex: 1 }}>
      {msg && (
        <View style={{ backgroundColor: msg.ok ? '#16a34a' : '#dc2626', borderRadius: 6, padding: 10, margin: 12, marginBottom: 0 }}>
          <Text style={{ color: '#fff', fontSize: 13, lineHeight: 18 }}>{msg.text}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 12, gap: 10 }}>
        {/* 扫描按钮 */}
        <Pressable onPress={handleScan} disabled={scanning}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            backgroundColor: '#3b82f6', borderRadius: 6, paddingVertical: 10, opacity: scanning ? 0.6 : 1 }}>
          {scanning ? <ActivityIndicator size="small" color="#fff" /> :
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>🔍 扫描所有存档NPC并去重导入到名册</Text>}
        </Pressable>
        <Text style={{ fontSize: 11, color: '#6b7280', lineHeight: 16 }}>
          扫描玩家所有已激活存档中的上级、下级、干部、领导人档案，去重后导入名册。名册为空时游戏将自动熔断生成兜底姓名，保证不中断。
        </Text>

        {/* 服务端同步按钮 */}
        <Pressable onPress={handleSync} disabled={syncing}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            backgroundColor: '#7c3aed', borderRadius: 6, paddingVertical: 10, opacity: syncing ? 0.6 : 1 }}>
          {syncing ? <ActivityIndicator size="small" color="#fff" /> :
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>🔄 同步所有存档NPC姓名到名册</Text>}
        </Pressable>
        <Text style={{ fontSize: 11, color: '#6b7280', lineHeight: 16 }}>
          服务端全量扫描所有玩家存档中的下级干部与上级姓名，去重写入名册；此后新生成的NPC姓名也会自动同步。
        </Text>

        {/* 单条新增 */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            value={addInput} onChangeText={setAddInput}
            placeholder="手动新增NPC完整姓名（2-20字）"
            placeholderTextColor="#9ca3af" maxLength={20}
            onSubmitEditing={handleAdd}
            style={{ flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6,
              paddingHorizontal: 10, paddingVertical: 7, fontSize: 13, color: '#111827', backgroundColor: '#fff' }}
          />
          <Pressable onPress={handleAdd} disabled={adding}
            style={{ backgroundColor: '#16a34a', borderRadius: 6, paddingHorizontal: 16,
              paddingVertical: 7, justifyContent: 'center', opacity: adding ? 0.6 : 1 }}>
            {adding ? <ActivityIndicator size="small" color="#fff" /> :
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>添加</Text>}
          </Pressable>
        </View>

        {/* 批量粘贴 */}
        <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
          <Pressable onPress={() => setBatchExpanded(v => !v)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f9fafb' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151' }}>📋 批量粘贴添加姓名</Text>
            <Text style={{ fontSize: 11, color: '#6b7280' }}>{batchExpanded ? '▲ 收起' : '▼ 展开'}</Text>
          </Pressable>
          {batchExpanded && (
            <View style={{ padding: 10, gap: 8, backgroundColor: '#fff' }}>
              <Text style={{ fontSize: 11, color: '#6b7280', lineHeight: 16 }}>
                每行或用逗号/中文逗号分隔一个姓名，每个姓名须2-20个字符。
              </Text>
              <TextInput
                value={batchInput} onChangeText={setBatchInput}
                placeholder={'例如：\n张伟\n李娜, 王芳\n赵磊'}
                placeholderTextColor="#9ca3af"
                multiline numberOfLines={6}
                style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6,
                  paddingHorizontal: 10, paddingVertical: 8, fontSize: 13,
                  color: '#111827', backgroundColor: '#f9fafb', minHeight: 120,
                  textAlignVertical: 'top' }}
              />
              <Pressable onPress={handleBatchAdd} disabled={batchLoading}
                style={{ backgroundColor: '#7c3aed', borderRadius: 6, paddingVertical: 9,
                  alignItems: 'center', opacity: batchLoading ? 0.6 : 1 }}>
                {batchLoading ? <ActivityIndicator size="small" color="#fff" /> :
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>批量导入</Text>}
              </Pressable>
            </View>
          )}
        </View>

        {/* 搜索 + 工具栏 */}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput
            value={search} onChangeText={setSearch}
            placeholder="搜索名字…" placeholderTextColor="#9ca3af"
            style={{ flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6,
              paddingHorizontal: 10, paddingVertical: 7, fontSize: 13, color: '#111827', backgroundColor: '#fff' }}
          />
          {!selectMode ? (
            <Pressable onPress={() => setSelectMode(true)}
              style={{ backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5', borderRadius: 6,
                paddingHorizontal: 12, paddingVertical: 7 }}>
              <Text style={{ color: '#dc2626', fontSize: 12, fontWeight: '700' }}>批量删除</Text>
            </Pressable>
          ) : (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Pressable onPress={() => { setSelectMode(false); setSelected(new Set()); }}
                style={{ backgroundColor: '#f3f4f6', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7 }}>
                <Text style={{ color: '#374151', fontSize: 12 }}>取消</Text>
              </Pressable>
              {selected.size > 0 && (
                <Pressable onPress={() => setBatchDelOpen(true)}
                  style={{ backgroundColor: '#dc2626', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7 }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>删除({selected.size})</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        {/* 全选/取消全选 */}
        {selectMode && displayRows.length > 0 && (
          <Pressable onPress={() => setSelected(new Set(selected.size === displayRows.length ? [] : displayRows.map(r => r.id)))}
            style={{ paddingVertical: 4 }}>
            <Text style={{ fontSize: 12, color: '#3b82f6' }}>
              {selected.size === displayRows.length ? '取消全选' : `全选 (${displayRows.length})`}
            </Text>
          </Pressable>
        )}

        {/* 名单 */}
        {loading ? (
          <ActivityIndicator style={{ marginTop: 30 }} />
        ) : displayRows.length === 0 ? (
          <Empty text={roster.length === 0 ? '名册为空，游戏将自动熔断生成兜底姓名。可点击上方扫描导入或手动添加' : '未找到匹配姓名'} />
        ) : (
          <>
            <Text style={{ fontSize: 11, color: '#6b7280' }}>
              共 {roster.length} 个{search.trim() ? `，当前显示 ${displayRows.length} 个` : ''}
              {selectMode && selected.size > 0 ? `，已选 ${selected.size} 个` : ''}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {displayRows.map((row) => {
                const isSelected = selected.has(row.id);
                return (
                  <Pressable
                    key={row.id}
                    onPress={() => { if (selectMode) { toggleSelect(row.id); } else { setDelId(row.id); setDelName(row.name); } }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4,
                      backgroundColor: isSelected ? '#fee2e2' : '#f9fafb',
                      borderWidth: 1, borderColor: isSelected ? '#f87171' : '#e5e7eb',
                      borderRadius: 20, paddingVertical: 5, paddingLeft: 12, paddingRight: 6 }}>
                    {selectMode && (
                      <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 1.5,
                        borderColor: isSelected ? '#dc2626' : '#d1d5db',
                        backgroundColor: isSelected ? '#dc2626' : 'transparent',
                        alignItems: 'center', justifyContent: 'center', marginRight: 2 }}>
                        {isSelected && <Text style={{ color: '#fff', fontSize: 9 }}>✓</Text>}
                      </View>
                    )}
                    <Text style={{ fontSize: 14, color: '#111827', fontWeight: '600' }}>{row.name}</Text>
                    {row.source === 'scanned' && (
                      <Text style={{ fontSize: 9, color: '#6b7280', backgroundColor: '#eef2ff', borderRadius: 4, paddingHorizontal: 4 }}>扫</Text>
                    )}
                    {!selectMode && (
                      <View style={{ backgroundColor: '#fef2f2', borderRadius: 12, width: 22, height: 22,
                        alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#dc2626', fontSize: 13, lineHeight: 15 }}>×</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* 单条删除确认 */}
      <Modal visible={!!delId} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 32 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 20 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 8 }}>确认删除</Text>
            <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
              确定要从名册中删除「<Text style={{ color: '#dc2626', fontWeight: '700' }}>{delName}</Text>」吗？{'\n'}
              删除后不影响已生成的NPC姓名，但未来新NPC将不再使用此姓名。
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <Pressable onPress={() => setDelId(null)}
                style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, backgroundColor: '#f3f4f6' }}>
                <Text style={{ fontSize: 13, color: '#374151' }}>取消</Text>
              </Pressable>
              <Pressable onPress={confirmDelete}
                style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, backgroundColor: '#dc2626' }}>
                <Text style={{ fontSize: 13, color: '#fff', fontWeight: '700' }}>确认删除</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* 批量删除确认 */}
      <Modal visible={batchDelOpen} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 32 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 20 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 8 }}>批量删除确认</Text>
            <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
              确定要删除所选的 <Text style={{ color: '#dc2626', fontWeight: '700' }}>{selected.size}</Text> 个NPC姓名吗？{'\n'}
              此操作不可撤销，已生成的NPC不受影响。
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <Pressable onPress={() => setBatchDelOpen(false)}
                style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, backgroundColor: '#f3f4f6' }}>
                <Text style={{ fontSize: 13, color: '#374151' }}>取消</Text>
              </Pressable>
              <Pressable onPress={handleBatchDelete} disabled={batchDeling}
                style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, backgroundColor: '#dc2626',
                  opacity: batchDeling ? 0.6 : 1 }}>
                {batchDeling ? <ActivityIndicator size="small" color="#fff" /> :
                  <Text style={{ fontSize: 13, color: '#fff', fontWeight: '700' }}>确认删除({selected.size})</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
