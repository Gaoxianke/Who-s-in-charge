// NPC 姓名名册（内存缓存）
// 所有 NPC 姓名取自管理员维护的 npc_names 名册（完整姓名）；
// 名册为空时自动熔断，按内置兜底词库生成，保证游戏不中断。
import { supabase } from '@/client/supabase';

let names: string[] = [];
let loaded = false;
let loadingPromise: Promise<void> | null = null;

// 熔断兜底词库：名册为空或加载失败时使用，避免硬编码散落各处
const FALLBACK_SURNAMES = ['王','李','张','刘','陈','赵','孙','周','吴','郑','冯','许','韩','唐','曹','邓','杨','林','黄','胡'];
const FALLBACK_GIVENS   = ['建国','志远','国华','宏伟','明远','国强','兴华','德胜','正阳','向阳','文斌','大勇','海峰','志刚','东升','卫国','思远','长征','光辉','振兴'];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 预加载名册到内存（幂等，可安全多次调用） */
export async function ensureNpcNamePoolLoaded(): Promise<void> {
  if (loaded) return;
  if (!loadingPromise) {
    loadingPromise = (async () => {
      try {
        const res = await supabase.from('npc_names').select('name').limit(2000);
        names = (res.data ?? []).map((r: { name: string }) => r.name);
      } catch {
        names = [];
      }
      loaded = true;
    })();
  }
  await loadingPromise;
}

/** 名册是否可用（用于展示熔断状态） */
export function npcNamesAvailable(): boolean {
  return names.length > 0;
}

/** 自动熔断：名册为空时按兜底词库生成一个姓名 */
function fallbackName(): string {
  return rand(FALLBACK_SURNAMES) + rand(FALLBACK_GIVENS);
}

/**
 * 从名册生成一个完整 NPC 姓名
 * @param exclude 需要避开的已用姓名（同套班子内去重）
 */
export function pickNpcName(exclude: string[] = []): string {
  const pool = names.length > 0 ? names : [];
  let name = '';
  let attempts = 0;
  if (pool.length > 0) {
    do {
      name = rand(pool);
      attempts++;
    } while (exclude.includes(name) && attempts < 50);
    if (!exclude.includes(name)) return name;
  }
  // 名册为空或全部命中 exclude → 熔断兜底
  do {
    name = fallbackName();
    attempts++;
  } while (exclude.includes(name) && attempts < 50);
  return name;
}

/** 仅取「名」（用于子女：家族姓 + 名）；名册为空时熔断兜底 */
export function pickGivenName(): string {
  if (names.length > 0) {
    // 从名册姓名中截取名（去掉首字姓氏）
    const full = rand(names);
    return full.length > 1 ? full.slice(1) : full;
  }
  return rand(FALLBACK_GIVENS);
}