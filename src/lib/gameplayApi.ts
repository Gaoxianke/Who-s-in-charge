// 贪腐玩法：统一动作执行接口封装（调用 Edge Function，前端永不直接改数值）
import { supabase } from '@/client/supabase';
import type { GameplayConfig, GameplayActionResult } from '@/types/game';

export async function executeGameplayAction(
  saveId: string,
  config: GameplayConfig,
  amount?: number,
): Promise<GameplayActionResult> {
  const { data, error } = await supabase.functions.invoke('execute_gameplay_action', {
    body: { saveId, configId: config.id, amount },
  });
  if (error) {
    let message = '操作失败';
    try {
      const parsed = await error.context?.json?.();
      if (parsed?.error) message = parsed.error;
    } catch { /* ignore */ }
    return { success: false, message };
  }
  if (data?.error) {
    return { success: false, message: data.error };
  }
  return {
    success: !!data?.success,
    message: data?.message ?? '操作完成',
    roll: data?.roll,
    gain: data?.gain,
    gameOver: data?.gameOver ?? null,
  };
}

// 民心修行：动作执行接口（调用 execute_popular_action Edge Function）
export interface PopularActionResult {
  success: boolean;
  message: string;
  popularChange?: number;
  newPopularSupport?: number;
  sideEffects?: string[];
  changes?: {
    popularSupport?: number;
    cityLivelihood?: number;
    meritPoints?: number;
    riskValue?: number;
  };
}

export async function executePopularAction(
  saveId: string,
  actionId: string,
): Promise<PopularActionResult> {
  const { data, error } = await supabase.functions.invoke('execute_popular_action', {
    body: { saveId, actionId },
  });
  if (error) {
    let message = '操作失败';
    try {
      const parsed = await error.context?.json?.();
      if (parsed?.error) message = parsed.error;
    } catch { /* ignore */ }
    return { success: false, message };
  }
  if (data?.error) {
    return { success: false, message: data.error };
  }
  return {
    success: !!data?.success,
    message: data?.message ?? '操作完成',
    popularChange: data?.popularChange,
    newPopularSupport: data?.newPopularSupport,
    sideEffects: data?.sideEffects ?? [],
    changes: data?.changes ?? {},
  };
}
