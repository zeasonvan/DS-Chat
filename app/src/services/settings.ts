import { Capacitor } from '@capacitor/core'
import { create } from 'zustand'
import type { TtsVoice } from './api/speech.js'
import { normalizeLocation, type UserLocation } from './location.js'
import { loadStoredApiKey, storeApiKey } from './native/secureKey.js'

export type Locale = 'zh-CN' | 'en-US'

/** 主题偏好；默认跟随系统 */
export type ThemePreference = 'light' | 'dark' | 'system'

/**
 * 本机设置，存 localStorage：语言、主题、位置、朗读音色、字号、自动朗读、
 * 回复完成通知、深度思考与智能搜索开关、侧边栏收起状态。
 * API Key 在原生端存 Android Keystore；Web 端仍存 localStorage。
 */
type Settings = {
  apiKey: string | null
  locale: Locale
  themePreference: ThemePreference
  location: UserLocation | null
  ttsVoice: TtsVoice
  fontSize: number
  autoReadAloud: boolean
  notifyOnComplete: boolean
  thinking: boolean
  search: boolean
  siderCollapsed: boolean
  /** 本机昵称；空字符串表示使用默认名称 */
  profileName: string
  /** 头像图片（data URL）；null 表示使用默认首字母头像 */
  profileAvatar: string | null
}

const KEYS = {
  apiKey: 'chat-demo:api-key',
  locale: 'chat-demo:locale',
  location: 'chat-demo:location',
  themePreference: 'chat-demo:theme-preference',
  ttsVoice: 'chat-demo:tts-voice',
  fontSize: 'chat-demo:font-size',
  autoReadAloud: 'chat-demo:auto-read-aloud',
  notifyOnComplete: 'chat-demo:notify-on-complete',
  thinking: 'chat-demo:thinking',
  search: 'chat-demo:search',
  siderCollapsed: 'chat-demo:sider-collapsed',
  profileName: 'chat-demo:profile-name',
  profileAvatar: 'chat-demo:profile-avatar',
} as const

const read = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const write = (key: string, value: string | null) => {
  try {
    if (value === null) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, value)
    }
  } catch {
    // 存储不可用时只在内存中生效
  }
}

/** 位置选择模式跟随浏览器语言，与应用内选择的界面语言无关。 */
export const isChineseBrowser = (): boolean =>
  (typeof navigator === 'undefined' ? 'zh' : navigator.language).toLowerCase().startsWith('zh')

const initialLocale = (): Locale => {
  const saved = read(KEYS.locale)
  if (saved === 'zh-CN' || saved === 'en-US') {
    return saved
  }
  // 未保存过时跟随系统/浏览器语言
  return isChineseBrowser() ? 'zh-CN' : 'en-US'
}

const initialLocation = (): UserLocation | null => {
  try {
    const location = normalizeLocation(JSON.parse(read(KEYS.location) ?? 'null'))
    if (!location) {
      return null
    }
    return isChineseBrowser()
      ? location.region === 'CN' && location.province
        ? location
        : null
      : { region: location.region }
  } catch {
    return null
  }
}

/** 未保存过时跟随系统 */
const initialThemePreference = (): ThemePreference => {
  const saved = read(KEYS.themePreference)
  return saved === 'light' || saved === 'dark' ? saved : 'system'
}

/** 未保存过时使用服务端默认音色 stella（海星） */
const initialTtsVoice = (): TtsVoice => (read(KEYS.ttsVoice) === 'tide' ? 'tide' : 'stella')

export const FONT_SIZE_MIN = 13
export const FONT_SIZE_MAX = 20
export const FONT_SIZE_DEFAULT = 16

const clampFontSize = (value: number): number =>
  Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(value)))

const initialFontSize = (): number => {
  const raw = read(KEYS.fontSize)
  if (raw === null) {
    return FONT_SIZE_DEFAULT
  }
  const value = Number(raw)
  return Number.isFinite(value) ? clampFontSize(value) : FONT_SIZE_DEFAULT
}

export const useSettings = create<Settings>(() => ({
  // 原生端由 hydrateApiKey 在渲染前从 Keystore 读入；Web 端保持原有 localStorage
  apiKey: Capacitor.isNativePlatform() ? null : read(KEYS.apiKey),
  locale: initialLocale(),
  location: initialLocation(),
  themePreference: initialThemePreference(),
  ttsVoice: initialTtsVoice(),
  fontSize: initialFontSize(),
  autoReadAloud: read(KEYS.autoReadAloud) === 'true',
  notifyOnComplete: read(KEYS.notifyOnComplete) === 'true',
  thinking: read(KEYS.thinking) === 'true',
  search: read(KEYS.search) === 'true',
  siderCollapsed: read(KEYS.siderCollapsed) === 'true',
  profileName: read(KEYS.profileName) ?? '',
  profileAvatar: read(KEYS.profileAvatar),
}))

/** 把字号写到根节点，消息区 CSS 统一读 --chat-font-size */
export const applyFontSize = (fontSize: number) => {
  try {
    document.documentElement.style.setProperty('--chat-font-size', `${fontSize}px`)
  } catch {
    // 非浏览器环境忽略
  }
}

/** 原生端启动时从 Keystore 读取 API Key；必须在首次渲染前调用 */
export const hydrateApiKey = async (): Promise<void> => {
  const stored = await loadStoredApiKey()
  if (useSettings.getState().apiKey === null) {
    useSettings.setState({ apiKey: stored })
  }
}

export const setLocale = (locale: Locale) => {
  write(KEYS.locale, locale)
  useSettings.setState({ locale })
}

export const setLocation = (value: UserLocation | null) => {
  const location = normalizeLocation(value)
  write(KEYS.location, location ? JSON.stringify(location) : null)
  useSettings.setState({ location })
}

export const setThemePreference = (themePreference: ThemePreference) => {
  write(KEYS.themePreference, themePreference)
  useSettings.setState({ themePreference })
}

export const setTtsVoice = (ttsVoice: TtsVoice) => {
  write(KEYS.ttsVoice, ttsVoice)
  useSettings.setState({ ttsVoice })
}

export const setFontSize = (fontSize: number) => {
  const value = clampFontSize(fontSize)
  write(KEYS.fontSize, String(value))
  useSettings.setState({ fontSize: value })
  applyFontSize(value)
}

export const setAutoReadAloud = (autoReadAloud: boolean) => {
  write(KEYS.autoReadAloud, String(autoReadAloud))
  useSettings.setState({ autoReadAloud })
}

export const setNotifyOnComplete = (notifyOnComplete: boolean) => {
  write(KEYS.notifyOnComplete, String(notifyOnComplete))
  useSettings.setState({ notifyOnComplete })
}

export const setApiKey = (apiKey: string | null) => {
  useSettings.setState({ apiKey })
  void storeApiKey(apiKey)
}

export const setThinking = (thinking: boolean) => {
  write(KEYS.thinking, String(thinking))
  useSettings.setState({ thinking })
}

export const setSearch = (search: boolean) => {
  write(KEYS.search, String(search))
  useSettings.setState({ search })
}

export const setSiderCollapsed = (siderCollapsed: boolean) => {
  write(KEYS.siderCollapsed, String(siderCollapsed))
  useSettings.setState({ siderCollapsed })
}

/** 昵称：去掉首尾空白，过长截断，避免撑坏侧边栏和设置页布局 */
export const setProfileName = (name: string) => {
  const value = name.trim().slice(0, 24)
  write(KEYS.profileName, value || null)
  useSettings.setState({ profileName: value })
}

/** 头像：data URL 直接存 localStorage；null 恢复默认首字母头像 */
export const setProfileAvatar = (avatar: string | null) => {
  try {
    write(KEYS.profileAvatar, avatar)
  } catch {
    // 存储空间不足时仅在本次运行内生效
  }
  useSettings.setState({ profileAvatar: avatar })
}
