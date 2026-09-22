import { createClient } from '@supabase/supabase-js';
import { secureStorage } from './storage';

const supabaseUrl: string = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey: string = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

// 大陆网络适配：为 Supabase 请求添加全局超时控制
// 默认 fetch 无超时限制，在弱网/跨境环境下可能永久挂起导致白屏
const DEFAULT_TIMEOUT_MS = 15000; // 15秒超时

async function fetchWithTimeout(
  url: RequestInfo | URL,
  options?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    // 区分超时错误和其他网络错误
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${DEFAULT_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: fetchWithTimeout,
  },
});
