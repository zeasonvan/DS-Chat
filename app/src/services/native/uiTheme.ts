import { Capacitor, registerPlugin } from '@capacitor/core'

/** 原生窗口底色：启动页阶段状态栏区域显示窗口背景，应用就绪后切回页面背景色 */
interface UiThemePlugin {
  setWindowBackground(options: { color: string }): Promise<{ applied: string }>
  hideSplash(): Promise<void>
}

const UiTheme = registerPlugin<UiThemePlugin>('UiTheme')

/** CSS 颜色转 #RRGGBB；Android 的 Color.parseColor 不认 rgb()/hsl() */
const toNativeColor = (value: string): string | null => {
  const trimmed = value.trim()
  if (trimmed.startsWith('#')) {
    return trimmed.length === 4
      ? `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`
      : trimmed
  }
  const rgb = trimmed.match(/rgba?\(([^)]+)\)/)
  if (!rgb) {
    return null
  }
  const parts = rgb[1].split(/[,\s/]+/).filter(Boolean).slice(0, 3).map(Number)
  if (parts.length < 3 || parts.some((item) => !Number.isFinite(item))) {
    return null
  }
  return `#${parts.map((item) => Math.max(0, Math.min(255, Math.round(item))).toString(16).padStart(2, '0')).join('')}`
}

/** 把当前页面背景色同步给原生窗口；非原生环境或旧版本直接忽略 */
export const syncWindowBackground = (cssColor: string): void => {
  if (!Capacitor.isNativePlatform()) {
    return
  }
  const color = toNativeColor(cssColor)
  if (!color) {
    return
  }
  void UiTheme.setWindowBackground({ color }).catch(() => {})
}

/** 原生端：网页首帧后放行系统启动页 */
export const hideNativeSplash = (): void => {
  if (!Capacitor.isNativePlatform()) {
    return
  }
  void UiTheme.hideSplash().catch(() => {})
}
