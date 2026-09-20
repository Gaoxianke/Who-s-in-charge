// 民心修行动作执行接口
// 流程：鉴权 → 解锁校验 → 冷却校验 → 应用民心增减+附加效果 → 更新冷却 → 写民心日志
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PopularParams {
  popularGain?: number;
  cooldown?: number;
  livelihoodGain?: number;
  opinionReduction?: number;
  meritGain?: number;
  riskReduction?: number;
  teamIntegrityGain?: number;
  desc?: string;
}

interface PopularConfig {
  category: string;
  id: string;
  name: string;
  icon: string;
  unlockRank: number;
  params: PopularParams;
  sort: number;
  enabled: boolean;
}

// 与前端 gameplayConfig.ts 完全一致的 17 条配置（后端单一来源）
const POPULAR_SUPPORT_ACTIONS: PopularConfig[] = [
  // Tab 二：亲民为民
  { category: 'popularity', id: 'popular_visit_poor', name: '走访困难群众', icon: '🏠', unlockRank: 1, sort: 1, enabled: true,
    params: { popularGain: 2, cooldown: 45, livelihoodGain: 2 } },
  { category: 'popularity', id: 'popular_grassroot_survey', name: '基层调研', icon: '📋', unlockRank: 2, sort: 2, enabled: true,
    params: { popularGain: 2, cooldown: 45 } },
  { category: 'popularity', id: 'popular_reception_day', name: '群众接待日', icon: '🤝', unlockRank: 3, sort: 3, enabled: true,
    params: { popularGain: 3, cooldown: 60, opinionReduction: 10 } },
  { category: 'popularity', id: 'popular_paired_aid', name: '结对帮扶', icon: '👥', unlockRank: 4, sort: 4, enabled: true,
    params: { popularGain: 3, cooldown: 90 } },
  { category: 'popularity', id: 'popular_village_stay', name: '驻村蹲点', icon: '🌾', unlockRank: 5, sort: 5, enabled: true,
    params: { popularGain: 4, cooldown: 120 } },
  { category: 'popularity', id: 'popular_open_review', name: '开门搞评议', icon: '🗣️', unlockRank: 7, sort: 6, enabled: true,
    params: { popularGain: 4, cooldown: 180, opinionReduction: 5 } },
  // Tab 三：民生实事
  { category: 'popularity', id: 'popular_resolve_legacy', name: '化解历史遗留问题', icon: '🔧', unlockRank: 6, sort: 7, enabled: true,
    params: { popularGain: 5, cooldown: 180, opinionReduction: 10 } },
  { category: 'popularity', id: 'popular_welfare_project', name: '推动惠民工程', icon: '🏗️', unlockRank: 8, sort: 8, enabled: true,
    params: { popularGain: 5, cooldown: 180, livelihoodGain: 5 } },
  { category: 'popularity', id: 'popular_promote_jobs', name: '促进就业增收', icon: '💼', unlockRank: 8, sort: 9, enabled: true,
    params: { popularGain: 3, cooldown: 120, livelihoodGain: 3 } },
  { category: 'popularity', id: 'popular_edu_health', name: '提升教育医疗', icon: '🏫', unlockRank: 9, sort: 10, enabled: true,
    params: { popularGain: 4, cooldown: 180, livelihoodGain: 4 } },
  { category: 'popularity', id: 'popular_gov_transparency', name: '政务公开透明', icon: '📢', unlockRank: 10, sort: 11, enabled: true,
    params: { popularGain: 4, cooldown: 365, riskReduction: 5 } },
  { category: 'popularity', id: 'popular_major_promise', name: '重大民生承诺兑现', icon: '🏅', unlockRank: 12, sort: 12, enabled: true,
    params: { popularGain: 6, cooldown: 365, livelihoodGain: 8 } },
  // Tab 四：顺应民意
  { category: 'popularity', id: 'popular_rectify_local', name: '整治群众身边不正之风', icon: '⚖️', unlockRank: 5, sort: 13, enabled: true,
    params: { popularGain: 4, cooldown: 90, teamIntegrityGain: 3 } },
  { category: 'popularity', id: 'popular_respond_opinion', name: '回应舆情关切', icon: '📡', unlockRank: 6, sort: 14, enabled: true,
    params: { popularGain: 3, cooldown: 60 } },
  { category: 'popularity', id: 'popular_special_inspect', name: '专项督查整改', icon: '🔍', unlockRank: 8, sort: 15, enabled: true,
    params: { popularGain: 5, cooldown: 180 } },
  { category: 'popularity', id: 'popular_lead_discipline', name: '带头正风肃纪行动', icon: '🎯', unlockRank: 10, sort: 16, enabled: true,
    params: { popularGain: 6, cooldown: 180, meritGain: 15 } },
  { category: 'popularity', id: 'popular_mass_discipline', name: '正风肃纪专项行动', icon: '🚩', unlockRank: 12, sort: 17, enabled: true,
    params: { popularGain: 8, cooldown: 365, meritGain: 30 } },
];

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 鉴权
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: '未登录' }, 401);

    const body = await req.json();
    const saveId: string = body.saveId;
    const actionId: string = body.actionId;

    if (!saveId || !actionId) return json({ error: '参数缺失' }, 400);

    const config = POPULAR_SUPPORT_ACTIONS.find((c) => c.id === actionId);
    if (!config || !config.enabled) return json({ error: '动作不存在或已禁用' }, 400);

    // 读取存档（精确选取所需字段）
    const { data: save, error: saveErr } = await supabase
      .from('player_saves')
      .select('id, user_id, rank_level, game_days, popular_support, popular_log, popular_action_cooldowns, city_livelihood, merit_points, risk_value')
      .eq('id', saveId)
      .maybeSingle();
    if (saveErr) return json({ error: saveErr.message }, 500);
    if (!save) return json({ error: '存档不存在' }, 404);
    if (save.user_id !== user.id) return json({ error: '无权操作此存档' }, 403);

    const rankLevel: number = save.rank_level ?? 1;
    const gameDays: number = save.game_days ?? 0;
    const p = config.params;

    // ① 解锁校验
    if (rankLevel < config.unlockRank) {
      return json({ error: `职级不足，需 ${config.unlockRank} 级解锁` }, 400);
    }

    // ② 冷却校验（popular_action_cooldowns: { [actionId]: endGameDay }）
    const cooldowns: Record<string, number> = (save.popular_action_cooldowns as Record<string, number>) ?? {};
    const cooldownEnd = cooldowns[actionId];
    if (cooldownEnd !== undefined && gameDays < cooldownEnd) {
      const remaining = cooldownEnd - gameDays;
      return json({ error: `冷却中，还需 ${remaining} 天` }, 400);
    }

    // ③ 应用民心增减与附加效果
    const popularGain = p.popularGain ?? 0;
    const newPopularSupport = clamp((save.popular_support as number ?? 50) + popularGain, 0, 100);
    const updates: Record<string, unknown> = {};
    const sideEffects: string[] = [];

    updates.popular_support = newPopularSupport;

    if (p.livelihoodGain && p.livelihoodGain > 0) {
      updates.city_livelihood = clamp((save.city_livelihood as number ?? 50) + p.livelihoodGain, 0, 100);
      sideEffects.push(`民生+${p.livelihoodGain}`);
    }
    if (p.meritGain && p.meritGain > 0) {
      updates.merit_points = (save.merit_points as number ?? 0) + p.meritGain;
      sideEffects.push(`功绩+${p.meritGain}`);
    }
    if (p.riskReduction && p.riskReduction > 0) {
      updates.risk_value = clamp((save.risk_value as number ?? 0) - p.riskReduction, 0, 100);
      sideEffects.push(`廉政风险-${p.riskReduction}`);
    }
    if (p.opinionReduction && p.opinionReduction > 0) {
      // 舆情/诉求压力减少记录到日志（无独立字段，影响民生体验感知）
      sideEffects.push(`舆情-${p.opinionReduction}`);
    }
    if (p.teamIntegrityGain && p.teamIntegrityGain > 0) {
      // 团队廉洁：小幅提升班子成员 integrity（批量 +teamIntegrityGain，上限100）
      const { data: bandRows } = await supabase
        .from('npc_band')
        .select('id, integrity')
        .eq('save_id', saveId)
        .gt('age', 0); // 跳过玩家自身（age=0）
      if (bandRows && bandRows.length > 0) {
        for (const m of bandRows) {
          const newIntegrity = clamp((m.integrity as number ?? 60) + p.teamIntegrityGain, 0, 100);
          await supabase.from('npc_band').update({ integrity: newIntegrity }).eq('id', m.id);
        }
      }
      sideEffects.push(`团队廉洁+${p.teamIntegrityGain}`);
    }

    // ④ 更新冷却截止天数
    const newCooldowns = { ...cooldowns, [actionId]: gameDays + (p.cooldown ?? 0) };
    updates.popular_action_cooldowns = newCooldowns;

    // ⑤ 写民心日志（保留最近 200 条）
    const log: Array<{ gameDay: number; actionId: string; actionName: string; popularChange: number; sideEffects?: string[] }> =
      (save.popular_log as typeof log) ?? [];
    log.push({ gameDay: gameDays, actionId, actionName: config.name, popularChange: popularGain, sideEffects });
    if (log.length > 200) log.splice(0, log.length - 200);
    updates.popular_log = log;

    // ⑥ 持久化
    const { error: updateErr } = await supabase.from('player_saves').update(updates).eq('id', saveId);
    if (updateErr) return json({ error: updateErr.message }, 500);

    const message = `${config.icon} ${config.name}完成！民心 +${popularGain}${sideEffects.length ? '，' + sideEffects.join('，') : ''}`;
    return json({
      success: true,
      message,
      popularChange: popularGain,
      newPopularSupport,
      sideEffects,
      changes: {
        popularSupport: newPopularSupport,
        ...(updates.city_livelihood !== undefined ? { cityLivelihood: updates.city_livelihood } : {}),
        ...(updates.merit_points !== undefined ? { meritPoints: updates.merit_points } : {}),
        ...(updates.risk_value !== undefined ? { riskValue: updates.risk_value } : {}),
      },
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : '服务器错误' }, 500);
  }
});
