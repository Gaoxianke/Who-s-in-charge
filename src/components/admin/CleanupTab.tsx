// 清理维护 Tab（super_admin）：手动清理 + 结果 + 历史报告
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { A, Badge, Btn, Card, Empty, Row } from './shared';
import { listCleanupLogs, triggerCleanup, type CleanupLog, type CleanupResult } from '@/lib/adminApi';

export function CleanupTab({ role: _role }: { role: string }) {
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState<CleanupResult | null>(null);
  const [logs, setLogs] = useState<CleanupLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLogs(await listCleanupLogs(20));
    setLoading(false);
  }, []);

  const onClean = async () => {
    setCleaning(true); setMsg(''); setResult(null);
    const r = await triggerCleanup();
    setCleaning(false);
    setResult(r);
    if (r) setMsg(`✓ 本次清理完成，节省 ${r.mb_saved} MB`);
    else setMsg('✗ 清理失败');
    load();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false}>
      <Card title="手动清理" accent={A.red}>
        <View style={{ gap: 8 }}>
          <Text style={{ color: A.textSecond, fontSize: 11, lineHeight: 18 }}>
            立即执行三条清理：{'\n'}① 大表超 1 天日志{'\n'}② 已调离超 1 天干部{'\n'}③ GameOver/退休超 1 天存档
          </Text>
          <Text style={{ color: A.textHint, fontSize: 10 }}>定时任务：每天北京时间 12:00（UTC 04:00）自动执行</Text>
          <Btn label={cleaning ? '清理中...' : '立即清理'} onPress={onClean} disabled={cleaning} variant="red" />
        </View>
      </Card>

      {msg ? <Text style={{ color: A.goldLight, fontSize: 12, paddingHorizontal: 4 }}>{msg}</Text> : null}

      {result ? (
        <Card title="✓ 本次清理结果" accent={A.green}>
          <Row label="大表数据" value={`${result.large_table_deleted} 条`} />
          <Row label="死干部" value={`${result.dead_cadres_deleted} 条`} />
          <Row label="死档" value={`${result.dead_saves_deleted} 个`} />
          <View style={{ height: 1, backgroundColor: A.divider, marginVertical: 6 }} />
          <Row label="清理前" value={`${result.mb_before} MB`} />
          <Row label="清理后" value={`${result.mb_after} MB`} />
          <Row label="本次节省" value={`${result.mb_saved} MB`} valueColor={A.goldLight} />
        </Card>
      ) : null}

      <Card title="历史清理报告">
        {loading ? <ActivityIndicator color={A.gold} /> :
          logs.length === 0 ? <Empty text="暂无清理记录" /> :
          logs.map((l) => (
            <View key={l.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: A.divider, gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Badge text={l.trigger_type === 'cron' ? '⏰ 定时' : l.trigger_type === 'admin_manual' ? '🛡️ 手动' : '🔧 ' + l.trigger_type} color={l.trigger_type === 'cron' ? A.green : A.gold} />
                <Text style={{ color: A.textHint, fontSize: 10 }}>{new Date(l.run_at).toLocaleString('zh-CN')}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 2 }}>
                <Text style={{ color: A.textSecond, fontSize: 11 }}>大表 {l.large_table_deleted}</Text>
                <Text style={{ color: A.textSecond, fontSize: 11 }}>干部 {l.dead_cadres_deleted}</Text>
                <Text style={{ color: A.textSecond, fontSize: 11 }}>存档 {l.dead_saves_deleted}</Text>
              </View>
              <Text style={{ color: A.goldLight, fontSize: 12, fontWeight: '600', marginTop: 2 }}>节省 {l.mb_saved} MB</Text>
            </View>
          ))
        }
      </Card>
    </ScrollView>
  );
}
