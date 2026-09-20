// 玩家数据库（政务大区）选择辅助
// 使用跨平台安全存储（原生 SecureStore / Web localStorage），避免 expo-sqlite polyfill 在
// iOS Safari、鸿蒙浏览器上初始化不稳定导致读取失败
import { supabase } from '@/client/supabase';
import { secureStorage } from '@/client/storage';

const SELECTED_KEY = 'selected_game_database_code';

export interface GameDatabaseInfo {
  code: string;
  name: string;
  capacity_limit: number;
  player_count: number;
  is_full: boolean;
  is_active: boolean;
  sort_order: number;
}

/** 读取玩家在注册页选定的大区 code（未选返回 null） */
export async function getSelectedDatabaseCode(): Promise<string | null> {
  try {
    const v = await secureStorage.getItem(SELECTED_KEY);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

/** 写入 / 清除玩家选定的大区 code */
export async function setSelectedDatabaseCode(code: string | null): Promise<void> {
  try {
    if (code && code.length > 0) await secureStorage.setItem(SELECTED_KEY, code);
    else await secureStorage.removeItem(SELECTED_KEY);
  } catch {
    // 忽略存储异常，不影响主流程
  }
}

/** 拉取可用政务大区列表（含实时玩家数与满载状态） */
export async function listGameDatabases(): Promise<GameDatabaseInfo[]> {
  const { data, error } = await supabase.rpc('list_game_databases');
  if (error || !data) return [];
  return (data as GameDatabaseInfo[]).map((d) => ({
    code: d.code,
    name: d.name,
    capacity_limit: d.capacity_limit,
    player_count: Number(d.player_count ?? 0),
    is_full: Boolean(d.is_full),
    is_active: Boolean(d.is_active),
    sort_order: d.sort_order,
  }));
}
