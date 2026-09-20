// 设备指纹工具：跨平台生成稳定的设备唯一标识
// - iOS：IDFV
// - Android：Android ID
// - Web：安全存储持久化的随机 UUID（避免所有 Web 用户共享同一标识）
import * as Application from 'expo-application';
import { secureStorage } from '@/client/storage';

const WEB_KEY = '_game_device_id';

export async function getDeviceId(): Promise<string> {
  try {
    if (process.env.EXPO_OS === 'ios') {
      return (await Application.getIosIdForVendorAsync()) ?? 'unknown';
    }
    if (process.env.EXPO_OS === 'android') {
      return Application.getAndroidId() ?? 'unknown';
    }
    // Web
    let id = await secureStorage.getItem(WEB_KEY);
    if (!id) {
      id =
        'web-' +
        (typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      await secureStorage.setItem(WEB_KEY, id);
    }
    return id;
  } catch {
    return 'unknown';
  }
}