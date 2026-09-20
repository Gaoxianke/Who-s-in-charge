// 敏感词汇库（超管 + 普通管理员均可输入/管理）
// 玩家改名/创建存档时若名称包含库中任一词汇，将被多套机制自动熔断
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  adminAddSensitiveWord, adminDeleteSensitiveWord,
  adminListSensitiveWords, adminBatchAddSensitiveWords,
  type SensitiveWordRow,
} from '@/lib/adminApi';
import { clearSensitiveCache } from '@/lib/sensitiveFilter';
import { A, Btn, Empty } from './shared';

export function SensitiveWordTab() {
  const [words, setWords]           = useState<SensitiveWordRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');

  // 单条添加
  const [input, setInput]           = useState('');
  const [adding, setAdding]         = useState(false);

  // 批量添加
  const [batchText, setBatchText]   = useState('');
  const [batchOpen, setBatchOpen]   = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  // 删除
  const [delId, setDelId]           = useState<string | null>(null);

  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 5000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const data = await adminListSensitiveWords(2000, 0);
    setWords(data);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAdd = async () => {
    const w = input.trim().toLowerCase();
    if (!w) { flash(false, '请输入敏感词'); return; }
    if (w.length > 50) { flash(false, '词汇长度不能超过50字符'); return; }
    setAdding(true);
    const res = await adminAddSensitiveWord(w);
    setAdding(false);
    if (res.ok) {
      flash(true, `✓ 已添加「${w}」`);
      setInput('');
      clearSensitiveCache();
      load();
    } else {
      flash(false, `添加失败：${res.err ?? ''}`);
    }
  };

  const handleBatchAdd = async () => {
    const raw = batchText.trim();
    if (!raw) { flash(false, '请粘贴敏感词内容'); return; }
    const words = raw.split(/[,，\n\s]+/).map(s => s.trim().toLowerCase()).filter(s => s.length > 0 && s.length <= 50);
    if (!words.length) { flash(false, '未识别到有效词汇'); return; }
    setBatchLoading(true);
    const res = await adminBatchAddSensitiveWords(words);
    setBatchLoading(false);
    flash(true, `✓ 批量导入完成：新增 ${res.imported} 个，跳过已存在 ${res.skipped} 个`);
    setBatchText('');
    setBatchOpen(false);
    clearSensitiveCache();
    load();
  };

  const confirmDelete = async () => {
    if (!delId) return;
    const res = await adminDeleteSensitiveWord(delId);
    if (res.ok) {
      flash(true, '✓ 已删除该敏感词');
      setDelId(null);
      clearSensitiveCache();
      load();
    } else {
      flash(false, `删除失败：${res.err ?? ''}`);
      setDelId(null);
    }
  };

  const displayWords = search.trim()
    ? words.filter(w => w.word.includes(search.trim().toLowerCase()))
    : words;

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      {/* 说明 */}
      <Text style={{ color: A.gold, fontSize: 12, fontWeight: '700' }}>🚫 敏感词汇库</Text>
      <Text style={{ color: A.textHint, fontSize: 10, lineHeight: 16 }}>
        管理员可录入敏感词。已启用多套审查机制：①客户端实时检测②提交前二次校验③服务端RPC拦截④数据库触发器兜底。玩家改名/创建存档若触发词汇将被拒绝。
      </Text>

      {msg && (
        <View style={{ backgroundColor: msg.ok ? A.greenBg : A.redBg, borderLeftWidth: 2,
          borderLeftColor: msg.ok ? A.green : A.red, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ color: msg.ok ? '#7FE0A0' : '#FF7070', fontSize: 12 }}>{msg.text}</Text>
        </View>
      )}

      {/* 单条添加 */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          value={input} onChangeText={setInput}
          placeholder="输入敏感词（1-50字符）"
          placeholderTextColor={A.textHint} maxLength={50}
          onSubmitEditing={handleAdd}
          style={{ flex: 1, backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border,
            color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }}
        />
        <Btn label={adding ? '添加中…' : '+ 添加'} onPress={handleAdd} variant="gold" small disabled={adding} />
      </View>

      {/* 批量添加 */}
      <View style={{ borderWidth: 1, borderColor: A.divider, overflow: 'hidden' }}>
        <Pressable cssInterop={false} onPress={() => setBatchOpen(v => !v)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 12, paddingVertical: 8, backgroundColor: A.bgCard }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: A.textPrimary }}>📋 批量粘贴添加敏感词</Text>
          <Text style={{ fontSize: 10, color: A.textHint }}>{batchOpen ? '▲ 收起' : '▼ 展开'}</Text>
        </Pressable>
        {batchOpen && (
          <View style={{ padding: 10, gap: 8, backgroundColor: A.bgMid }}>
            <Text style={{ fontSize: 10, color: A.textHint, lineHeight: 15 }}>
              每行或用逗号/空格分隔一个词，自动转为小写，超50字符的词会被跳过。
            </Text>
            <TextInput
              value={batchText} onChangeText={setBatchText}
              placeholder={'例如：\n反动\n暴力, 涉黄'}
              placeholderTextColor={A.textHint}
              multiline numberOfLines={5}
              style={{ borderWidth: 1, borderColor: A.border, backgroundColor: A.bgInput,
                color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8,
                fontSize: 13, minHeight: 100, textAlignVertical: 'top' }}
            />
            <Pressable cssInterop={false} onPress={handleBatchAdd} disabled={batchLoading}
              style={{ backgroundColor: '#7c3aed', paddingVertical: 8, alignItems: 'center',
                opacity: batchLoading ? 0.6 : 1 }}>
              {batchLoading ? <ActivityIndicator size="small" color="#fff" /> :
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>批量导入</Text>}
            </Pressable>
          </View>
        )}
      </View>

      {/* 搜索 */}
      <TextInput
        value={search} onChangeText={setSearch}
        placeholder="搜索词汇…" placeholderTextColor={A.textHint}
        style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border,
          color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13 }}
      />

      {/* 词汇列表 */}
      {loading ? (
        <ActivityIndicator color={A.gold} size="large" style={{ marginTop: 24 }} />
      ) : words.length === 0 ? (
        <Empty text="暂无敏感词，添加后玩家改名/创档将自动熔断" />
      ) : (
        <>
          <Text style={{ color: A.textHint, fontSize: 10 }}>
            共 {words.length} 个{search.trim() ? `，当前显示 ${displayWords.length} 个` : ''}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {displayWords.map((w) => (
              <Pressable key={w.id} cssInterop={false} onPress={() => setDelId(w.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4,
                  backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.red,
                  paddingHorizontal: 10, paddingVertical: 5 }}>
                <Text style={{ color: A.textPrimary, fontSize: 12, fontWeight: '600' }}>{w.word}</Text>
                <Text style={{ color: A.red, fontSize: 12 }}>✕</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {/* 删除确认 */}
      <Modal visible={!!delId} transparent animationType="fade" onRequestClose={() => setDelId(null)}>
        <Pressable cssInterop={false} onPress={() => setDelId(null)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 }}>
          <Pressable cssInterop={false} onPress={() => {}}
            style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.red, padding: 18, gap: 12 }}>
            <Text style={{ color: '#FF7070', fontSize: 14, fontWeight: '700' }}>🗑 删除敏感词</Text>
            <Text style={{ color: A.textSecond, fontSize: 12 }}>确定要删除该敏感词吗？删除后玩家改名将不再受其约束。</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Btn label="取消" onPress={() => setDelId(null)} variant="ghost" small style={{ flex: 1 }} />
              <Btn label="确认删除" onPress={confirmDelete} variant="red" small style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
