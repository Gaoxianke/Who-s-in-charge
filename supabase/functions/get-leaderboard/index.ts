// 排行榜查询：日榜(当日增量) / 最高榜(永久累计) × 维度 × 口径
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CORS } from '../_shared/cors.ts';
import { rankScore, powerScore, type Metric } from '../_shared/scoring.ts';

type Board = 'daily' | 'alltime';
type Scope = 'region' | 'server' | 'faction';

interface Entry {
  rank: number;
  userId: string;
  saveId: string;
  playerName: string;
  rankLevel: number;
  rankName: string;
  faction: string;
  factionInfluence: number;
  regionCode: string;
  score: number;
  merit: number;
  contribution: number;
  wealth: number;
  students: number;
  isMe?: boolean;
}

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
    const myUserId = user?.id ?? null;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const board: Board = body.board === 'alltime' ? 'alltime' : 'daily';
    const metric: Metric = ['merit', 'contribution', 'rank', 'power'].includes(body.metric) ? body.metric : 'merit';
    const scope: Scope = ['region', 'server', 'faction'].includes(body.scope) ? body.scope : 'region';

    // 读取所有上榜存档及其 profile（含大区、派系归属）
    const { data: profiles } = await admin
      .from('player_profiles')
      .select('user_id, leaderboard_save_id, region_code')
      .not('leaderboard_save_id', 'is', null)
      .limit(5000);
    if (!profiles || profiles.length === 0) {
      return json({ entries: [], myRank: null, myScore: 0, prevGap: null });
    }

    const saveIds = profiles.map((p) => p.leaderboard_save_id);
    const { data: saves } = await admin
      .from('player_saves')
      .select('id, user_id, player_name, rank_level, rank_name, merit_points, faction_contribution, faction, faction_influence, silver, connections')
      .in('id', saveIds)
      .limit(5000);

    // 下属/门客数（门生）
    const { data: subCounts } = await admin.rpc('count_students_by_save', { save_ids: saveIds }).catch(() => ({ data: null }));
    const studentMap = new Map<string, number>();
    if (Array.isArray(subCounts)) {
      for (const r of subCounts) studentMap.set(r.save_id, Number(r.cnt));
    } else {
      // fallback：直接查
      const { data: subs } = await admin.from('subordinates').select('save_id').in('save_id', saveIds).limit(50000);
      const { data: rets } = await admin.from('retainers').select('save_id').in('save_id', saveIds).limit(50000);
      for (const s of (subs ?? [])) studentMap.set(s.save_id, (studentMap.get(s.save_id) ?? 0) + 1);
      for (const r of (rets ?? [])) studentMap.set(r.save_id, (studentMap.get(r.save_id) ?? 0) + 1);
    }

    const regionMap = new Map<string, string>();
    for (const p of profiles) regionMap.set(p.leaderboard_save_id, p.region_code ?? '');

    // 日榜：读取当日增量
    const today = todayDate();
    const dailyMap = new Map<string, number>();
    if (board === 'daily') {
      const { data: daily } = await admin
        .from('daily_scores')
        .select('save_id, metric, daily_delta')
        .eq('score_date', today)
        .eq('metric', metric)
        .limit(5000);
      for (const d of (daily ?? [])) {
        dailyMap.set(d.save_id, Number(d.daily_delta));
      }
    }

    // 组装条目
    const entries: Entry[] = [];
    for (const s of (saves ?? [])) {
      const sid = s.id as string;
      const merit = Number(s.merit_points ?? 0);
      const contribution = Number(s.faction_contribution ?? 0);
      const wealth = Number(s.silver ?? 0) + Number(s.connections ?? 0);
      const students = studentMap.get(sid) ?? 0;
      const rScore = rankScore(Number(s.rank_level ?? 1), null);
      const pScore = powerScore(merit, contribution, rScore, wealth, students);

      let score: number;
      if (board === 'daily') {
        score = dailyMap.get(sid) ?? 0;
      } else {
        score = metric === 'merit' ? merit
          : metric === 'contribution' ? contribution
          : metric === 'rank' ? rScore
          : pScore;
      }

      entries.push({
        rank: 0,
        userId: s.user_id as string,
        saveId: sid,
        playerName: s.player_name as string,
        rankLevel: Number(s.rank_level ?? 1),
        rankName: s.rank_name as string,
        faction: s.faction as string,
        factionInfluence: Number(s.faction_influence ?? 0),
        regionCode: regionMap.get(sid) ?? '',
        score,
        merit,
        contribution,
        wealth,
        students,
        isMe: s.user_id === myUserId,
      });
    }

    // 口径过滤
    let filtered = entries;
    if (scope === 'region' && myUserId) {
      const myRegion = regionMap.get(entries.find((e) => e.userId === myUserId)?.saveId ?? '') ?? '';
      filtered = entries.filter((e) => e.regionCode === myRegion);
    } else if (scope === 'faction' && myUserId) {
      const myFaction = entries.find((e) => e.userId === myUserId)?.faction ?? '';
      filtered = entries.filter((e) => e.faction === myFaction);
    }

    // 排序
    filtered.sort((a, b) => b.score - a.score);

    // 分配名次
    let prevScore: number | null = null;
    let prevRank = 0;
    filtered.forEach((e, i) => {
      if (prevScore !== null && e.score === prevScore) {
        e.rank = prevRank;
      } else {
        e.rank = i + 1;
        prevScore = e.score;
        prevRank = i + 1;
      }
    });

    const limit = scope === 'server' ? 200 : 100;
    const top = filtered.slice(0, limit);

    // 本人信息
    const me = filtered.find((e) => e.userId === myUserId);
    const myRank = me ? me.rank : null;
    const myScore = me ? me.score : 0;
    const myIdx = me ? filtered.indexOf(me) : -1;
    const prevGap = (myIdx > 0 && filtered[myIdx - 1])
      ? filtered[myIdx - 1].score - me!.score
      : null;

    return json({ entries: top, myRank, myScore, prevGap, total: filtered.length });
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