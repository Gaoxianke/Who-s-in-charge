// 轻量 ID 生成（无依赖，供游戏逻辑模块使用）
const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** 生成 12 位随机 ID */
export function nanoid(size = 12): string {
  let id = '';
  for (let i = 0; i < size; i++) {
    id += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return id;
}
