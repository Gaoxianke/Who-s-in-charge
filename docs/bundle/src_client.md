# src/client

共 2 个文件。
<a id="srcclientstoragets"></a>
## `src/client/storage.ts`

```typescript
// 跨平台安全存储适配器
// - 原生端（iOS / Android / 鸿蒙）：使用 expo-secure-store（Keychain / Keystore）
// - Web 端（Safari / 鸿蒙浏览器等）：使用浏览器 localStorage
// 解决 expo-sqlite/localStorage polyfill 在 iOS Safari / 鸿蒙浏览器上初始化不稳定
// 导致 Supabase 会话读取卡住、白屏"打不开/登不上"的问题
import * as SecureStore from 'expo-secure-store';

const isWeb = process.env.EXPO_OS === 'web';

// SecureStore 单条 value 上限约 2048 字节，refresh token 较长时需分片
const MAX_VALUE_BYTES = 1900;

function utf8ByteLength(str: string): number {
  let n = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else n += 3;
  }
  return n;
}

function chunkKey(key: string, idx: number): string {
  return `${key}__chunk_${idx}`;
}

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (isWeb) {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      }
      // 原生端：先尝试读取分片数据
      const countStr = await SecureStore.getItemAsync(`${key}__chunks`);
      if (countStr) {
        const count = Number(countStr);
        if (Number.isFinite(count) && count > 0) {
          let assembled = '';
          for (let i = 0; i < count; i++) {
            const part = await SecureStore.getItemAsync(chunkKey(key, i));
            if (part == null) return null;
            assembled += part;
          }
          return assembled;
        }
      }
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (isWeb) {
        if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
        return;
      }
      // 原生端：按字节长度决定是否分片
      if (utf8ByteLength(value) > MAX_VALUE_BYTES) {
        const parts: string[] = [];
        let buf = '';
        for (let i = 0; i < value.length; i++) {
          buf += value[i];
          if (utf8ByteLength(buf) >= MAX_VALUE_BYTES) {
            parts.push(buf);
            buf = '';
          }
        }
        if (buf.length > 0) parts.push(buf);
        await SecureStore.setItemAsync(`${key}__chunks`, String(parts.length));
        for (let i = 0; i < parts.length; i++) {
          await SecureStore.setItemAsync(chunkKey(key, i), parts[i]);
        }
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch {
      // 存储失败不应阻断登录流程
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (isWeb) {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
        return;
      }
      const countStr = await SecureStore.getItemAsync(`${key}__chunks`);
      if (countStr) {
        const count = Number(countStr);
        if (Number.isFinite(count) && count > 0) {
          for (let i = 0; i < count; i++) {
            await SecureStore.deleteItemAsync(chunkKey(key, i));
          }
        }
        await SecureStore.deleteItemAsync(`${key}__chunks`);
      }
      await SecureStore.deleteItemAsync(key);
    } catch {
      // 忽略删除错误
    }
  },
};
```

<a id="srcclientsupabasets"></a>
## `src/client/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import { secureStorage } from './storage';

const supabaseUrl: string = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey: string = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```
