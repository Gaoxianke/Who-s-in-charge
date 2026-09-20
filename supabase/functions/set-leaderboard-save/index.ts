// 设置/切换上榜存档（账号全局唯一，每5年周期只能换一次）
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CORS } from '../_shared/cors.ts';

const COOLDOWN_DAYS = 1825; // 5年周期 = 1825天（与派系争夺周期对齐）

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    // 用 anon key 解析当前用户身份
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return json({ error: '未登录' }, 401);
    }
    const userId = user.id;

    const body = await req.json().catch(() => ({}));
    const targetSaveId = body.saveId as string | undefined;
    if (!targetSaveId) {
      return json({ error: '缺少存档ID' }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // 校验该存档属于本人
    const { data: save } = await admin
      .from('player_saves')
      .select('id, user_id, game_days')
      .eq('id', targetSaveId)
      .maybeSingle();
    if (!save || save.user_id !== userId) {
      return json({ error: '存档不存在或不属于本人' }, 403);
    }

    // 读取当前 profile
    const { data: profile } = await admin
      .from('player_profiles')
      .select('leaderboard_save_id, leaderboard_save_changed_at')
      .eq('user_id', userId)
      .maybeSingle();

    const currentGameDays = save.game_days ?? 0;

    // 冷却校验：若已有上榜存档，需满足5年周期
    if (profile?.leaderboard_save_id && profile.leaderboard_save_id !== targetSaveId) {
      // 用当前上榜存档的 game_days 记录切换基准
      const { data: curSave } = await admin
        .from('player_saves')
        .select('game_days')
        .eq('id', profile.leaderboard_save_id)
        .maybeSingle();
      const lastGameDays = curSave?.game_days ?? 0;
      if (currentGameDays - lastGameDays < COOLDOWN_DAYS) {
        const remain = COOLDOWN_DAYS - (currentGameDays - lastGameDays);
        return json({
          error: `更换上榜存档冷却中，还需 ${remain} 天（每5年周期仅可更换一次）`,
          cooldownRemainingDays: remain,
        }, 409);
      }
    }

    // 写入 profile（upsert）
    const { error: upErr } = await admin
      .from('player_profiles')
      .upsert({
        user_id: userId,
        leaderboard_save_id: targetSaveId,
        leaderboard_save_changed_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    if (upErr) {
      return json({ error: '写入失败：' + upErr.message }, 500);
    }

    // 切换后清空新存档的当日日榜记录（不继承历史）
    const today = todayDate();
    await admin
      .from('daily_scores')
      .delete()
      .eq('save_id', targetSaveId)
      .eq('score_date', today);

    return json({ success: true, saveId: targetSaveId });
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

function todayDate(): string {
  // 固定按 Asia/Shanghai（UTC+8）计算当日日期，12:00 切日由 cron 处理
  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return utc8.toISOString().slice(0, 10);
}