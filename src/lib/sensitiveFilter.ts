// 客户端敏感词审查工具
// 机制1: 调用 player_check_name_sensitive RPC（不暴露词汇列表，仅返回 boolean）
// 机制2: 本地缓存上一次检测结果，同名无需重复请求
// 机制3: 防抖调用，避免高频请求
import { supabase } from '@/client/supabase';

const cache = new Map<string, boolean>(); // name → isSensitive

/** 检测名字是否含敏感词（通过 RPC，结果本地缓存）。
 *  返回 true 表示含敏感词，false 表示合规，null 表示网络异常（不阻断）。 */
export async function checkNameSensitive(name: string): Promise<boolean | null> {
  const key = name.trim().toLowerCase();
  if (!key) return false;
  if (cache.has(key)) return cache.get(key)!;
  const { data, error } = await supabase.rpc('player_check_name_sensitive', { p_name: key });
  if (error) return null; // 网络异常不阻断
  const result = Boolean(data);
  cache.set(key, result);
  return result;
}

/** 检测存档创建姓名（通过专用 RPC，返回 ok + message）。 */
export async function checkCreateSaveName(name: string): Promise<{ ok: boolean; message: string }> {
  const { data, error } = await supabase.rpc('player_check_create_save_name', { p_name: name.trim() });
  if (error) return { ok: true, message: '' }; // 网络异常不阻断
  const r = Array.isArray(data) ? data[0] : data;
  return { ok: Boolean(r?.ok ?? true), message: String(r?.message ?? '') };
}

/** 清除缓存（敏感词库更新后调用）。 */
export function clearSensitiveCache() {
  cache.clear();
}

/** 简单防抖 hook 工具（在 React 组件中使用 useDebounceCheck） */
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
export function debounceCheckName(
  name: string,
  cb: (result: boolean | null) => void,
  delay = 400,
) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    void checkNameSensitive(name).then(cb);
  }, delay);
}
