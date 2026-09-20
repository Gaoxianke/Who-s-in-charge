// 每日12:00（由 cron 调用）：结算日榜奖励 + 清零当日日榜
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CORS } from '../_shared/cors.ts';

// 日榜奖励档位（按当日综合名次）
const DAILY_TIERS: { maxRank: number; merit: number; silver: number }[] = [
  { maxRank: 1, merit: 20, silver: 200 },
  { maxRank: 3, merit: 12, silver: 120 },
  { maxRank: 10, merit: 6, silver: 60 },
  { maxRank: 50, merit: 2, silver: 0 },
];

function rewardForRank(rank: number): { merit: number; silver: number } | null {
  for (const t of DAILY_TIERS) {
    if (rank <= t.maxRank) return { merit: t.merit, silver: t.silver };
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);

    const today = todayDate();

    // 1. 计算当日综合实力排名（用于发放日榜奖励）
    const { data: profiles } = await admin
      .from('player_profiles')
      .select('leaderboard_save_id')
      .not('leaderboard_save_id', 'is', null)
      .limit(5000);
    if (!profiles || profiles.length === 0) {
      return json({ settled: 0, cleared: true });
    }
    const saveIds = profiles.map((p) => p.leaderboard_save_id);

    const { data: saves } = await admin
      .from('player_saves')
      .select('id, merit_points, faction_contribution, rank_level, silver, connections')
      .in('id', saveIds)
      .limit(5000);

    const { data: subs } = await admin.from('subordinates').select('save_id').in('save_id', saveIds).limit(50000);
    const { data: rets } = await admin.from('retainers').select('save_id').in('save_id', saveIds).limit(50000);
    const studentMap = new Map<string, number>();
    for (const s of (subs ?? [])) studentMap.set(s.save_id, (studentMap.get(s.save_id) ?? 0) + 1);
    for (const r of (rets ?? [])) studentMap.set(r.save_id, (studentMap.get(r.save_id) ?? 0) + 1);

    // 当日增量
    const { data: daily } = await admin
      .from('daily_scores')
      .select('save_id, metric, daily_delta')
      .eq('score_date', today)
      .limit(5000);
    const dailyMerit = new Map<string, number>();
    const dailyContribution = new Map<string, number>();
    const dailyRank = new Map<string, number>();
    for (const d of (daily ?? [])) {
      const v = Number(d.daily_delta);
      if (d.metric === 'merit') dailyMerit.set(d.save_id, v);
      else if (d.metric === 'contribution') dailyContribution.set(d.save_id, v);
      else if (d.metric === 'rank') dailyRank.set(d.save_id, v);
    }

    // 当日综合增量 = 政绩增量*0.35 + 贡献增量*0.30 + 官职增量*0.20
    const scored = (saves ?? []).map((s) => {
      const sid = s.id as string;
      const dm = dailyMerit.get(sid) ?? 0;
      const dc = dailyContribution.get(sid) ?? 0;
      const dr = dailyRank.get(sid) ?? 0;
      const score = Math.round(dm * 0.35 + dc * 0.30 + dr * 0.20);
      return { saveId: sid, score };
    }).sort((a, b) => b.score - a.score);

    // 2. 发放日榜奖励
    let settled = 0;
    let rank = 0;
    let prevScore: number | null = null;
    for (const e of scored) {
      if (e.score <= 0) continue;
      if (prevScore !== null && e.score === prevScore) {
        // 同分同名次
      } else {
        rank += 1;
        prevScore = e.score;
      }
      const reward = rewardForRank(rank);
      if (!reward) continue;
      const save = (saves ?? []).find((s) => s.id === e.saveId);
      if (!save) continue;
      await admin
        .from('player_saves')
        .update({
          merit_points: Number(save.merit_points ?? 0) + reward.merit,
          silver: Math.round(Number(save.silver ?? 0) + reward.silver),
        })
        .eq('id', e.saveId);
      settled += 1;
    }

    // 3. 清零当日日榜（删除当日记录）
    await admin.from('daily_scores').delete().eq('score_date', today);

    return json({ settled, cleared: true, date: today });
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
  const now = new Date();
  const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return utc8.toISOString().slice(0, 10);
}