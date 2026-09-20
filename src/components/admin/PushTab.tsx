// 公告管理 Tab：两分页（登录页 / 测试码页）+ 标题 + 内容 + 发布
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { A, Btn, Card, LabeledInput, Row } from './shared';
import { adminGetAnnouncement, adminUpsertAnnouncement, type Announcement } from '@/lib/adminApi';

type PageKey = 'login' | 'enter_code';
const PAGE_TABS: { key: PageKey; label: string }[] = [
  { key: 'login',      label: '🔐 登录页公告' },
  { key: 'enter_code', label: '🔑 测试码页公告' },
];

interface AnoState { title: string; content: string; active: boolean; updating: boolean; info: Announcement | null; }
const defaultState = (): AnoState => ({ title: '', content: '', active: true, updating: false, info: null });

export function AnnouncementTab({ role }: { role: string }) {
  const canEdit = role === 'admin' || role === 'super_admin';
  const [page, setPage] = useState<PageKey>('login');
  const [states, setStates] = useState<Record<PageKey, AnoState>>({
    login: defaultState(), enter_code: defaultState(),
  });
  const [loading, setLoading] = useState<Record<PageKey, boolean>>({ login: false, enter_code: false });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loaded, setLoaded] = useState<Record<PageKey, boolean>>({ login: false, enter_code: false });

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 5000);
  };

  const loadPage = useCallback(async (key: PageKey) => {
    if (loaded[key]) return;
    setLoading((p) => ({ ...p, [key]: true }));
    const info = await adminGetAnnouncement(key);
    setLoading((p) => ({ ...p, [key]: false }));
    setLoaded((p) => ({ ...p, [key]: true }));
    if (info) {
      setStates((p) => ({ ...p, [key]: { ...p[key], title: info.title, content: info.content, active: info.active, info } }));
    }
  }, [loaded]);

  // 切换分页时加载
  const onSelectPage = (key: PageKey) => {
    setPage(key);
    loadPage(key);
  };

  // 首次自动加载当前页
  useEffect(() => { loadPage(page); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const s = states[page];
  const set = (field: keyof AnoState) => (v: string | boolean) =>
    setStates((p) => ({ ...p, [page]: { ...p[page], [field]: v } }));

  const onSubmit = async () => {
    if (!s.title.trim() || !s.content.trim()) { flash(false, '✗ 标题和内容不能为空'); return; }
    setStates((p) => ({ ...p, [page]: { ...p[page], updating: true } }));
    const r = await adminUpsertAnnouncement(page, s.title.trim(), s.content.trim(), s.active);
    setStates((p) => ({ ...p, [page]: { ...p[page], updating: false } }));
    flash(r.ok, r.ok ? `✓ 公告已${s.active ? '发布' : '隐藏'}` : `✗ ${r.err}`);
    if (r.ok) {
      // 刷新 info，表单内容保留
      const refreshed = await adminGetAnnouncement(page);
      setStates((p) => ({ ...p, [page]: { ...p[page], info: refreshed } }));
    }
  };

  const onClear = () => setStates((p) => ({ ...p, [page]: { ...p[page], title: '', content: '' } }));

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* 分页 Tab */}
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {PAGE_TABS.map((t) => (
          <Pressable key={t.key} cssInterop={false} onPress={() => onSelectPage(t.key)}
            style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: page === t.key ? A.gold : A.bgInput, borderWidth: 1, borderColor: page === t.key ? A.gold : A.border }}>
            <Text style={{ color: page === t.key ? '#0D1B2A' : A.textSecond, fontSize: 11, fontWeight: '700' }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* 编辑区 */}
      <Card title={`${PAGE_TABS.find((t) => t.key === page)!.label} · 当前公告`} accent={A.gold}>
        {loading[page]
          ? <ActivityIndicator color={A.gold} />
          : (
          <View style={{ gap: 10 }}>
            {s.info?.updated_by_email ? (
              <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                <Row label="最后更新" value={s.info.updated_at ? new Date(s.info.updated_at).toLocaleString('zh-CN') : '-'} valueColor={A.textHint} />
                <Row label="操作人" value={s.info.updated_by_email} valueColor={A.textHint} />
              </View>
            ) : null}

            <LabeledInput label="公告标题" value={s.title} onChange={set('title') as (v: string) => void} placeholder="如：测试阶段通知" />
            <LabeledInput label="公告内容" value={s.content} onChange={set('content') as (v: string) => void} placeholder="在此输入公告正文内容…" multiline />

            {/* 是否显示 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: A.textSecond, fontSize: 11 }}>是否显示：</Text>
              {([true, false] as const).map((v) => (
                <Pressable key={String(v)} cssInterop={false} onPress={() => canEdit && (set('active') as (v: boolean) => void)(v)}
                  style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: s.active === v ? (v ? A.green : A.red) : A.bgInput, borderWidth: 1, borderColor: s.active === v ? (v ? A.green : A.red) : A.border }}>
                  <Text style={{ color: s.active === v ? '#fff' : A.textSecond, fontSize: 11, fontWeight: '600' }}>{v ? '显示' : '隐藏'}</Text>
                </Pressable>
              ))}
            </View>

            {canEdit
              ? (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <View style={{ flex: 1 }}>
                    <Btn label={s.updating ? '保存中...' : s.active ? '📢 发布公告' : '💾 保存（隐藏）'} onPress={onSubmit} disabled={s.updating} variant="gold" />
                  </View>
                  <Btn label="清空" onPress={onClear} variant="ghost" small />
                </View>
              )
              : <Text style={{ color: A.textHint, fontSize: 10 }}>需 admin 及以上权限</Text>
            }
          </View>
        )}
      </Card>

      {msg ? (
        <View style={{ backgroundColor: msg.ok ? A.greenBg : A.redBg, borderLeftWidth: 2, borderLeftColor: msg.ok ? A.green : A.red, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ color: msg.ok ? '#7FE0A0' : '#FF7070', fontSize: 12 }}>{msg.text}</Text>
        </View>
      ) : null}

      {/* 预览区 */}
      {s.title || s.content ? (
        <Card title="📋 预览效果" accent={A.blue}>
          <View style={{ borderWidth: 1, borderColor: A.gold, borderLeftWidth: 3, backgroundColor: A.goldBg, padding: 12, gap: 6 }}>
            {s.title ? <Text style={{ color: A.goldLight, fontSize: 14, fontWeight: '700' }}>{s.title}</Text> : null}
            {s.content ? <Text style={{ color: A.textPrimary, fontSize: 12, lineHeight: 20 }}>{s.content}</Text> : null}
          </View>
        </Card>
      ) : null}
    </ScrollView>
  );
}

// 简单的 mount 回调 hook（已内联为 useEffect，此处保留空函数供向后兼容）
function useCallbackOnMount(_cb: () => void) { /* replaced by inline useEffect */ }
