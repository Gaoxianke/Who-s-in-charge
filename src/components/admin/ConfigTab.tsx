// 配置管理 Tab（super_admin）：列出 game_config + 编辑 JSON + 保存
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { A, Badge, Btn, Card, Empty, LabeledInput, Row } from './shared';
import { adminCleanupStalePlaceholderSaves, adminSaveConfig, listGameConfig, type GameConfigItem } from '@/lib/adminApi';

export function ConfigTab({ role }: { role: string }) {
  const canEdit = role === 'super_admin';
  const [list, setList] = useState<GameConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [msg, setMsg] = useState('');
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupMsg, setCleanupMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setList(await listGameConfig());
    setLoading(false);
  }, []);

  const onCleanup = async () => {
    setCleanupLoading(true);
    setCleanupMsg('');
    const { count, err } = await adminCleanupStalePlaceholderSaves(3);
    if (err) setCleanupMsg(`✗ 清理失败：${err}`);
    else setCleanupMsg(`✓ 已清理 ${count} 个超过 3 天的异常占位档`);
    setCleanupLoading(false);
  };

  const startEdit = (c: GameConfigItem) => {
    setEditing(c.key);
    setEditValue(JSON.stringify(c.value, null, 2));
    setMsg('');
  };
  const onSave = async () => {
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(editValue); } catch { setMsg('✗ JSON 格式错误'); return; }
    const item = list.find((c) => c.key === editing);
    const r = await adminSaveConfig(editing!, parsed, item?.description ?? undefined);
    setMsg(r.ok ? '✓ 配置已保存，下次读档生效' : `✗ ${r.err}`);
    setEditing(null);
    if (r.ok) load();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Card title="异常占位档清理" accent={A.blue}>
        <Text style={{ color: A.textSecond, fontSize: 11, lineHeight: 18 }}>
          系统每天凌晨 3:00 自动清理超过 3 天仍未创建角色的占位档，防止误判"已有存档"。{'\n'}此处可手动触发清理。
        </Text>
        <View style={{ marginTop: 8 }}>
          <Btn
            label={cleanupLoading ? '清理中...' : '立即清理超过 3 天的占位档'}
            onPress={onCleanup}
            small
            disabled={cleanupLoading}
          />
          {cleanupMsg ? <Text style={{ color: cleanupMsg.startsWith('✓') ? '#7FE0A0' : '#FF7070', fontSize: 11, marginTop: 6 }}>{cleanupMsg}</Text> : null}
        </View>
      </Card>

      <Card title="游戏配置热更新" accent={A.gold}>
        <Text style={{ color: A.textSecond, fontSize: 11, lineHeight: 18 }}>
          可在不发版的情况下修改游戏参数。{'\n'}客户端下次读档时自动拉取最新配置。{'\n'}仅 super_admin 可修改。
        </Text>
      </Card>

      {loading ? <ActivityIndicator color={A.gold} /> :
        list.length === 0 ? <Empty text="暂无配置项" /> :
        list.map((c) => (
          <Card key={c.key} title={c.key} accent={editing === c.key ? A.gold : A.blue}>
            {editing === c.key ? (
              <View style={{ gap: 8 }}>
                <Text style={{ color: A.textSecond, fontSize: 11 }}>{c.description ?? ''}</Text>
                <LabeledInput label="JSON 值" value={editValue} onChange={setEditValue} multiline />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Btn label="保存" onPress={onSave} small />
                  <Btn label="取消" onPress={() => setEditing(null)} small variant="ghost" />
                </View>
              </View>
            ) : (
              <View style={{ gap: 6 }}>
                <Row label="说明" value={c.description ?? '-'} valueColor={A.textSecond} />
                <Row label="当前值" value={JSON.stringify(c.value)} valueColor={A.goldLight} />
                <Row label="更新时间" value={new Date(c.updated_at).toLocaleString('zh-CN')} valueColor={A.textHint} />
                {canEdit ? (
                  <View style={{ marginTop: 4 }}>
                    <Btn label="编辑" onPress={() => startEdit(c)} small variant="ghost" />
                  </View>
                ) : <Badge text="只读" color={A.textHint} />}
              </View>
            )}
          </Card>
        ))
      }

      {msg ? <Text style={{ color: A.goldLight, fontSize: 12, paddingHorizontal: 4 }}>{msg}</Text> : null}
    </ScrollView>
  );
}
