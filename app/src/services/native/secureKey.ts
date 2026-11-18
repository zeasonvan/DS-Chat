import { Capacitor, registerPlugin } from '@capacitor/core'
import { warnNative } from './log.js'

type SecureKeyStorePlugin = {
  get(options: { key: string }): Promise<{ value: string | null }>
  set(options: { key: string; value: string }): Promise<void>
  remove(options: { key: string }): Promise<void>
}

const SecureKeyStore = registerPlugin<SecureKeyStorePlugin>('SecureKeyStore')
/** 旧版本把 Key 明文存在这里，原生端首次启动时迁移到 Keystore */
const LEGACY_LOCAL_KEY = 'chat-demo:api-key'
const SECURE_KEY = 'api-key'

const readLegacy = (): string | null => {
  try {
    return localStorage.getItem(LEGACY_LOCAL_KEY)
  } catch {
    return null
  }
}

const clearLegacy = () => {
  try {
    localStorage.removeItem(LEGACY_LOCAL_KEY)
  } catch {
    // 存储不可用时忽略
  }
}

const writeLegacy = (value: string | null) => {
  try {
    if (value === null) {
      localStorage.removeItem(LEGACY_LOCAL_KEY)
    } else {
      localStorage.setItem(LEGACY_LOCAL_KEY, value)
    }
  } catch {
    // 存储不可用时只在内存中生效
  }
}

/** 读取 API Key：原生端优先 Keystore，并把旧的 localStorage 值迁移过去 */
export const loadStoredApiKey = async (): Promise<string | null> => {
  if (!Capacitor.isNativePlatform()) {
    return readLegacy()
  }
  const legacy = readLegacy()
  try {
    const { value } = await SecureKeyStore.get({ key: SECURE_KEY })
    if (value) {
      if (legacy) {
        clearLegacy()
      }
      return value
    }
    if (legacy) {
      await SecureKeyStore.set({ key: SECURE_KEY, value: legacy })
      clearLegacy()
    }
  } catch (error) {
    // 原生插件异常时不要退回明文；保留旧值仅供本次会话使用
    warnNative('SecureKeyStore unavailable', error)
    return legacy
  }
  return legacy
}

/** 保存 API Key：原生端写 Keystore，Web 端仍写 localStorage */
export const storeApiKey = async (value: string | null): Promise<void> => {
  if (!Capacitor.isNativePlatform()) {
    writeLegacy(value)
    return
  }
  try {
    if (value === null) {
      await SecureKeyStore.remove({ key: SECURE_KEY })
    } else {
      await SecureKeyStore.set({ key: SECURE_KEY, value })
    }
    clearLegacy()
  } catch (error) {
    warnNative('SecureKeyStore write failed', error)
  }
}
