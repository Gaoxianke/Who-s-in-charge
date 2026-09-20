// 存档修改 Tab：按存档ID加载 + 14字段编辑 + 清除冷却 + 全量关联游戏数据
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { A, Badge, Btn, Card, Empty, LabeledInput, Row } from './shared';
import {
  adminClearCooldowns, adminGetSave, adminPromoteRank, adminUpdateSaveFields,
  adminGetPlayerFull, adminFindSaveByAccount, adminDeleteAccount, adminBanAccount,
  type SaveData, type PlayerFullData, type FoundAccount,
} from '@/lib/adminApi';

export function SaveTab({ role }: { role: string }) {
  const canEdit = role === 'super_admin';
  const canDelete = role === 'admin' || role === 'super_admin';
  const [saveId, setSaveId] = useState('');
  const [save, setSave] = useState<SaveData | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  // 多存档选择 + 账号信息
  const [foundAccounts, setFoundAccounts] = useState<FoundAccount[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmBan, setConfirmBan] = useState(false);
  const [acting, setActing] = useState(false);
  // 关联游戏数据
  const [gameData, setGameData] = useState<PlayerFullData | null>(null);
  const [gameDataLoading, setGameDataLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const toggleSection = (key: string) => setExpandedSections(p => ({ ...p, [key]: !p[key] }));

  const loadSaveDetail = useCallback(async (sid: string, uid: string) => {
    setLoading(true); setMsg(''); setGameData(null);
    const s = await adminGetSave(sid);
    setSave(s); setCurrentUserId(uid);
    setLoading(false);
    if (!s) { setMsg('✗ 未找到该存档'); return; }
    setFields({
      player_name: s.player_name, merit_points: String(s.merit_points), moral_value: String(s.moral_value),
      city_gdp: String(s.city_gdp), city_livelihood: String(s.city_livelihood), city_ecology: String(s.city_ecology),
      city_business: String(s.city_business), security_index: String(s.security_index), boss_favor: String(s.boss_favor),
      fund_balance: String(s.fund_balance), personal_savings: String(s.personal_savings),
    });
    setGameDataLoading(true);
    const gd = await adminGetPlayerFull(s.id);
    setGameData(gd);
    setGameDataLoading(false);
  }, []);

  const load = useCallback(async () => {
    if (!saveId.trim()) { setMsg('请输入账号邮箱 / 用户ID / 存档ID'); return; }
    setLoading(true); setMsg(''); setGameData(null); setFoundAccounts([]); setSave(null); setCurrentEmail('');
    // 先按账号(邮箱/用户ID/存档ID)解析出存档列表，把后台与玩家账号绑定
    const found = await adminFindSaveByAccount(saveId.trim());
    if (!found.length) {
      setLoading(false); setMsg('✗ 未找到该账号对应的存档'); return;
    }
    setCurrentUserId(found[0].user_id);
    setCurrentEmail(found[0].email);
    if (found.length === 1) {
      await loadSaveDetail(found[0].save_id, found[0].user_id);
      return;
    }
    // 多存档：列出供管理员选择
    setLoading(false);
    setFoundAccounts(found);
  }, [saveId, loadSaveDetail]);

  const onDelete = async () => {
    if (!currentUserId) return;
    setActing(true);
    const r = await adminDeleteAccount(currentUserId);
    setConfirmDelete(false);
    setActing(false);
    setMsg(r.ok ? '✓ 账号已彻底删除（含全部游戏数据），设备/IP 已封禁100年防重注册' : `✗ ${r.err}`);
    if (r.ok) { setSave(null); setFoundAccounts([]); setGameData(null); setCurrentUserId(''); setCurrentEmail(''); }
  };

  const onBan = async () => {
    if (!currentUserId) return;
    setActing(true);
    const r = await adminBanAccount(currentUserId);
    setConfirmBan(false);
    setActing(false);
    setMsg(r.ok ? '✓ 账号已封禁100年（数据保留）' : `✗ ${r.err}`);
  };

  const setF = (k: string) => (v: string) => setFields((p) => ({ ...p, [k]: v }));

  const onSave = async () => {
    if (!save) return;
    const r = await adminUpdateSaveFields(save.id, fields);
    setMsg(r.ok ? '✓ 存档已保存' : `✗ ${r.err}`);
    if (r.ok) { const s = await adminGetSave(save.id); setSave(s); }
  };
  const onClearCD = async () => {
    if (!save) return;
    const r = await adminClearCooldowns(save.id);
    setMsg(r.ok ? '✓ 冷却已清除' : `✗ ${r.err}`);
  };
  const onPromote = async (rank: number) => {
    if (!save) return;
    const r = await adminPromoteRank(save.id, rank);
    setMsg(r.ok ? `✓ 晋升至 L${rank}` : `✗ ${r.err}`);
    if (r.ok) { const s = await adminGetSave(save.id); setSave(s); }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Card title="加载存档">
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}><LabeledInput label="账号邮箱 / 用户ID / 存档ID" value={saveId} onChange={setSaveId} placeholder="输入玩家账号或存档ID" /></View>
          <Btn label={loading ? '...' : '加载'} onPress={load} small disabled={loading} />
        </View>
        {msg ? <Text style={{ color: A.goldLight, fontSize: 12, marginTop: 8 }}>{msg}</Text> : null}
      </Card>

      {loading ? <ActivityIndicator color={A.gold} size="large" /> : null}

      {/* 账号操作：删除（彻底删除）/ 封禁（100年）—— 搜索出账号后即可操作，无需进入存档 */}
      {canDelete && currentUserId ? (
        <Card title="账号操作（危险）" accent={A.red}>
          <View style={{ gap: 6 }}>
            <Row label="账号邮箱" value={currentEmail || currentUserId.slice(0, 8) + '...'} />
            <Row label="用户ID" value={currentUserId.slice(0, 8) + '...'} />
            {foundAccounts.length > 1 ? <Text style={{ color: A.gold, fontSize: 11 }}>该账号有 {foundAccounts.length} 个存档</Text> : null}
          </View>

          {confirmDelete ? (
            <View style={{ gap: 8, marginTop: 10 }}>
              <Text style={{ color: A.red, fontSize: 12, fontWeight: '700' }}>确认彻底删除账号 {currentEmail || currentUserId.slice(0, 8)}... ？{'\n'}将删除登录账号及全部游戏数据，操作不可恢复。</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn label={acting ? '删除中...' : '确认彻底删除'} onPress={onDelete} variant="red" small disabled={acting} />
                <Btn label="取消" onPress={() => setConfirmDelete(false)} small disabled={acting} />
              </View>
            </View>
          ) : confirmBan ? (
            <View style={{ gap: 8, marginTop: 10 }}>
              <Text style={{ color: A.gold, fontSize: 12, fontWeight: '700' }}>确认封禁账号 {currentEmail || currentUserId.slice(0, 8)}... 100年？{'\n'}账号与数据保留，玩家无法登录。</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn label={acting ? '封禁中...' : '确认封禁100年'} onPress={onBan} variant="gold" small disabled={acting} />
                <Btn label="取消" onPress={() => setConfirmBan(false)} small disabled={acting} />
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Btn label="🗑️ 彻底删除账号" onPress={() => { setConfirmDelete(true); setConfirmBan(false); }} variant="red" small />
              <Btn label="🔒 封禁100年" onPress={() => { setConfirmBan(true); setConfirmDelete(false); }} variant="gold" small />
            </View>
          )}
        </Card>
      ) : null}

      {foundAccounts.length > 1 ? (
        <Card title="该账号有多个存档，请选择" accent={A.gold}>
          {foundAccounts.map((a) => (
            <Pressable
              key={a.save_id}
              cssInterop={false}
              onPress={() => { setFoundAccounts([]); loadSaveDetail(a.save_id, a.user_id); }}
              style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: A.divider }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ color: A.textPrimary, fontSize: 14, fontWeight: '700' }}>{a.player_name} · L{a.rank_level ?? '-'} {a.rank_name ?? ''}</Text>
                  <Text style={{ color: A.textSecond, fontSize: 10, marginTop: 2 }}>存档 {a.save_id.slice(0, 8)}...</Text>
                </View>
                <Text style={{ color: A.gold, fontSize: 12 }}>查看 ›</Text>
              </View>
            </Pressable>
          ))}
        </Card>
      ) : null}

      {save ? (
        <View style={{ gap: 12 }}>
          {/* 存档概览 */}
          <Card title={`${save.player_name} · L${save.rank_level} ${save.rank_name}`} accent={A.gold}>
            <Row label="存档ID" value={save.id.slice(0, 8) + '...'} />
            <Row label="用户ID" value={save.user_id.slice(0, 8) + '...'} />
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
              {save.is_retired ? <Badge text="已退休" color={A.textHint} /> : null}
              {save.game_over_type ? <Badge text={`结局:${save.game_over_type}`} color={A.red} /> : <Badge text="进行中" color={A.green} />}
            </View>
          </Card>

          {/* 字段编辑（super_admin） */}
          {canEdit ? (
            <Card title="字段修改（保存后立即生效）" accent={A.blue}>
              <View style={{ gap: 8 }}>
                <LabeledInput label="姓名" value={fields.player_name ?? ''} onChange={setF('player_name')} />
                <FieldGrid fields={fields} setF={setF} />
                <Btn label="保存修改" onPress={onSave} variant="gold" />
              </View>
            </Card>
          ) : (
            <Card title="字段（只读，需 super_admin 权限修改）" accent={A.textHint}>
              <View style={{ gap: 6 }}>
                <Row label="功勋" value={save.merit_points} />
                <Row label="民心" value={save.moral_value} />
                <Row label="GDP" value={save.city_gdp} />
                <Row label="民生" value={save.city_livelihood} />
                <Row label="资金" value={save.fund_balance} />
              </View>
            </Card>
          )}

          {/* 操作 */}
          <Card title="存档操作" accent={A.red}>
            <View style={{ gap: 8 }}>
              <Text style={{ color: A.textSecond, fontSize: 11 }}>职务晋升（目标职级 1-15）</Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {[3, 6, 8, 10, 13, 15].map((r) => (
                  <Pressable key={r} cssInterop={false} onPress={() => onPromote(r)} style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.gold, paddingHorizontal: 10, paddingVertical: 6 }}>
                    <Text style={{ color: A.goldLight, fontSize: 11 }}>L{r}</Text>
                  </Pressable>
                ))}
              </View>
              {canEdit ? <Btn label="❄️ 清除冷却" onPress={onClearCD} variant="ghost" /> : null}
            </View>
          </Card>

          {/* 关联游戏数据 */}
          <Card title="关联游戏数据" accent={A.blue}>
            {gameDataLoading
              ? <ActivityIndicator color={A.gold} style={{ paddingVertical: 12 }} />
              : gameData
                ? <GameDataSections data={gameData} expanded={expandedSections} toggle={toggleSection} />
                : <Text style={{ color: A.textHint, fontSize: 11, paddingVertical: 8 }}>暂无关联数据</Text>
            }
          </Card>
        </View>
      ) : (
        !loading ? <Empty text="输入玩家账号邮箱 / 用户ID / 存档ID 加载详情" /> : null
      )}
    </ScrollView>
  );
}

function FieldGrid({ fields, setF }: { fields: Record<string, string>; setF: (k: string) => (v: string) => void }) {
  const items: [string, string][] = [
    ['merit_points', '功勋'], ["moral_value", "民心"], ['city_gdp', 'GDP'], ['city_livelihood', '民生'],
    ['city_ecology', '生态'], ['city_business', '商业'], ['security_index', '治安'], ['boss_favor', '上司好感'],
    ['fund_balance', '资金'], ['personal_savings', '储蓄'],
  ];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {items.map(([k, label]) => (
        <View key={k} style={{ width: '47%' }}>
          <LabeledInput label={label} value={fields[k] ?? ''} onChange={setF(k)} keyboardType="number-pad" />
        </View>
      ))}
    </View>
  );
}

// ── 关联游戏数据分区组件 ──────────────────────────────────────────────────────
function SectionHeader({ title, count, expanded, onToggle }: { title: string; count: number; expanded: boolean; onToggle: () => void }) {
  return (
    <Pressable cssInterop={false} onPress={onToggle}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: A.divider }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ color: A.gold, fontSize: 12, fontWeight: '700' }}>{title}</Text>
        <View style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, paddingHorizontal: 6, paddingVertical: 1 }}>
          <Text style={{ color: A.textHint, fontSize: 10 }}>{count}</Text>
        </View>
      </View>
      <Text style={{ color: A.textHint, fontSize: 14 }}>{expanded ? '▲' : '▼'}</Text>
    </Pressable>
  );
}

function GameDataSections({ data, expanded, toggle }: { data: PlayerFullData; expanded: Record<string, boolean>; toggle: (k: string) => void }) {
  return (
    <View style={{ gap: 2 }}>
      {/* 健康状态（单条，直接展示） */}
      {data.health && (
        <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: A.divider }}>
          <Text style={{ color: A.gold, fontSize: 12, fontWeight: '700', flex: 1 }}>❤️ 健康</Text>
          <Text style={{ color: A.textPrimary, fontSize: 11 }}>体力 {data.health.health}</Text>
          <Text style={{ color: A.textPrimary, fontSize: 11 }}>精力 {data.health.energy}</Text>
          {data.health.is_on_leave && <Badge text="休假中" color={A.blue} />}
        </View>
      )}

      {/* 职业履历 */}
      <SectionHeader title="📋 职业履历" count={data.career_history.length} expanded={!!expanded.career} onToggle={() => toggle('career')} />
      {expanded.career && (
        <View style={{ gap: 4, paddingVertical: 6 }}>
          {data.career_history.length === 0 ? <Text style={{ color: A.textHint, fontSize: 11 }}>暂无记录</Text>
            : data.career_history.map((c, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: A.divider }}>
                <Text style={{ color: A.textHint, fontSize: 10, width: 18 }}>L{c.rank_level}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: A.textPrimary, fontSize: 11 }}>{c.position}</Text>
                  <Text style={{ color: A.textHint, fontSize: 10 }}>{c.city} · {c.start_year}—{c.end_year ?? '至今'}</Text>
                </View>
              </View>
            ))}
        </View>
      )}

      {/* 下属团队 */}
      <SectionHeader title="👥 下属团队" count={data.subordinates.length} expanded={!!expanded.subs} onToggle={() => toggle('subs')} />
      {expanded.subs && (
        <View style={{ gap: 4, paddingVertical: 6 }}>
          {data.subordinates.length === 0 ? <Text style={{ color: A.textHint, fontSize: 11 }}>暂无下属</Text>
            : data.subordinates.map((s, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: A.divider }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: A.textPrimary, fontSize: 11 }}>{s.name} <Text style={{ color: A.textHint, fontSize: 10 }}>L{s.rank_level} {s.role}</Text></Text>
                  {s.specialty ? <Text style={{ color: A.textHint, fontSize: 10 }}>专长: {s.specialty}</Text> : null}
                </View>
                <Text style={{ color: A.green, fontSize: 11 }}>忠诚{s.loyalty}</Text>
                <Text style={{ color: A.goldLight, fontSize: 11 }}>能力{s.ability}</Text>
                {s.is_appointed && <Badge text="已任命" color={A.green} />}
              </View>
            ))}
        </View>
      )}

      {/* 上司任务 */}
      <SectionHeader title="📌 上司任务" count={data.boss_tasks.length} expanded={!!expanded.tasks} onToggle={() => toggle('tasks')} />
      {expanded.tasks && (
        <View style={{ gap: 4, paddingVertical: 6 }}>
          {data.boss_tasks.length === 0 ? <Text style={{ color: A.textHint, fontSize: 11 }}>暂无任务</Text>
            : data.boss_tasks.map((t, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: A.divider }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: A.textPrimary, fontSize: 11 }}>{t.title}</Text>
                  <Text style={{ color: A.textHint, fontSize: 10 }}>进度 {t.current_value}/{t.target_value} · 奖励 {t.reward_merit}</Text>
                </View>
                <Badge text={t.status} color={t.status === 'active' ? A.gold : t.status === 'completed' ? A.green : A.textHint} />
                {t.urgency === 'urgent' && <Badge text="紧急" color={A.red} />}
              </View>
            ))}
        </View>
      )}

      {/* 建设项目 */}
      <SectionHeader title="🏗️ 建设项目" count={data.construction.length} expanded={!!expanded.build} onToggle={() => toggle('build')} />
      {expanded.build && (
        <View style={{ gap: 4, paddingVertical: 6 }}>
          {data.construction.length === 0 ? <Text style={{ color: A.textHint, fontSize: 11 }}>暂无项目</Text>
            : data.construction.map((c, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: A.divider }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: A.textPrimary, fontSize: 11 }}>{c.name}</Text>
                  <Text style={{ color: A.textHint, fontSize: 10 }}>{c.category} · 奖励 {c.merit_reward}</Text>
                </View>
                <Badge text={c.status} color={c.status === 'completed' ? A.green : c.status === 'in_progress' ? A.blue : A.textHint} />
              </View>
            ))}
        </View>
      )}

      {/* 家庭成员 */}
      <SectionHeader title="👨‍👩‍👧 家庭成员" count={data.family_members.length} expanded={!!expanded.family} onToggle={() => toggle('family')} />
      {expanded.family && (
        <View style={{ gap: 4, paddingVertical: 6 }}>
          {data.family_members.length === 0 ? <Text style={{ color: A.textHint, fontSize: 11 }}>暂无成员</Text>
            : data.family_members.map((f, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: A.divider }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: A.textPrimary, fontSize: 11 }}>{f.name} <Text style={{ color: A.textHint, fontSize: 10 }}>({f.member_type})</Text></Text>
                  {f.job ? <Text style={{ color: A.textHint, fontSize: 10 }}>{f.job}</Text> : null}
                </View>
                <Text style={{ color: A.green, fontSize: 11 }}>健康{f.health_score}</Text>
                <Text style={{ color: A.goldLight, fontSize: 11 }}>品德{f.moral_score}</Text>
              </View>
            ))}
        </View>
      )}

      {/* 治安案件 */}
      <SectionHeader title="🚔 治安案件" count={data.police_cases.length} expanded={!!expanded.police} onToggle={() => toggle('police')} />
      {expanded.police && (
        <View style={{ gap: 4, paddingVertical: 6 }}>
          {data.police_cases.length === 0 ? <Text style={{ color: A.textHint, fontSize: 11 }}>暂无案件</Text>
            : data.police_cases.map((p, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: A.divider }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: A.textPrimary, fontSize: 11 }}>{p.title}</Text>
                  <Text style={{ color: A.textHint, fontSize: 10 }}>{p.case_type} · 难度{p.difficulty}</Text>
                </View>
                <Badge text={p.status} color={p.status === 'solved' ? A.green : p.status === 'pending' ? A.gold : A.textHint} />
              </View>
            ))}
        </View>
      )}

      {/* 管辖区域 */}
      <SectionHeader title="🗺️ 管辖区域" count={data.governing_areas.length} expanded={!!expanded.areas} onToggle={() => toggle('areas')} />
      {expanded.areas && (
        <View style={{ gap: 4, paddingVertical: 6 }}>
          {data.governing_areas.length === 0 ? <Text style={{ color: A.textHint, fontSize: 11 }}>暂无区域</Text>
            : data.governing_areas.map((a, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: A.divider }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: A.textPrimary, fontSize: 11 }}>{a.area_name} <Text style={{ color: A.textHint, fontSize: 10 }}>({a.area_type})</Text></Text>
                </View>
                <Text style={{ color: A.green, fontSize: 11 }}>发展{a.dev_index}</Text>
                <Text style={{ color: A.goldLight, fontSize: 11 }}>民心{a.favor_index}</Text>
              </View>
            ))}
        </View>
      )}
    </View>
  );
}
