// 领取最高榜里程碑奖励（一次性，防重复）
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CORS } from '../_shared/cors.ts';

// 里程碑奖励配置
const MILESTONES: Record<string, { influence: number; silver: number; extra?: string }> = {
  top10: { influence: 20, silver: 300 },
  top3: { influence: 40, silver: 800 },
  top1: { influence: 80, silver: 2000, extra: '破格晋升加权' },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: '未登录' }, 401);
    const userId = user.id;

    const body = await req.json().catch(() => ({}));
    const milestone = body.milestone as string | undefined;
    if (!milestone || !MILESTONES[milestone]) {
      return json({ error: '无效的里程碑' }, 400);
    }
    const reward = MILESTONES[milestone];

    const admin = createClient(supabaseUrl, serviceKey);

    // 检查是否已领取（唯一约束防重复）
    const { data: existing } = await admin
      .from('milestone_rewards')
      .select('id')
      .eq('user_id', userId)
      .eq('milestone', milestone)
      .maybeSingle();
    if (existing) {
      return json({ error: '该里程碑奖励已领取', alreadyClaimed: true }, 409);
    }

    // 获取上榜存档
    const { data: profile } = await admin
      .from('player_profiles')
      .select('leaderboard_save_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (!profile?.leaderboard_save_id) {
      return json({ error: '尚未设置上榜存档' }, 400);
    }

    // 发放奖励：声望(faction_influence) + 银两(silver)
    const { data: save } = await admin
      .from('player_saves')
      .select('faction_influence, silver')
      .eq('id', profile.leaderboard_save_id)
      .maybeSingle();
    if (!save) return json({ error: '存档不存在' }, 400);

    await admin
      .from('player_saves')
      .update({
        faction_influence: Math.min(100, Number(save.faction_influence ?? 0) + reward.influence),
        silver: Math.round(Number(save.silver ?? 0) + reward.silver),
      })
      .eq('id', profile.leaderboard_save_id);

    // 记录领取
    await admin
      .from('milestone_rewards')
      .insert({ user_id: userId, milestone });

    return json({
      success: true,
      milestone,
      influence: reward.influence,
      silver: reward.silver,
      extra: reward.extra ?? null,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}