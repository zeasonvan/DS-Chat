import { createRoot } from 'react-dom/client'
import { App } from './app/App.js'
import { enableNativeWindowTheme, setupTheme } from './app/theme.js'
import { hideNativeSplash } from './services/native/uiTheme.js'
import { Capacitor } from '@capacitor/core'
import { ensureKatex } from './services/markdown/katex.js'
import { initNativeBridge } from './services/native/lifecycle.js'
import { applyFontSize, hydrateApiKey, useSettings } from './services/settings.js'
import './app/theme.css'
import './app/global.css'

ensureKatex()
setupTheme()
applyFontSize(useSettings.getState().fontSize)

/** 启动页最短展示时长：给人物形象留出生效时间 */
const SPLASH_MIN_MS = 700
const splashShownAt = Date.now()

const start = async () => {
  // 原生端先把 Keystore 里的 API Key 读进内存，再渲染，避免首屏误判为未设置
  await hydrateApiKey()
  applyFontSize(useSettings.getState().fontSize)
  createRoot(document.getElementById('root') as HTMLElement).render(<App />)
  // 首帧渲染后再淡出启动页；保持一个最短展示时间，避免人物形象一闪而过
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const splash = document.getElementById('splash')
      if (!splash) {
        return
      }
      const wait = Math.max(0, SPLASH_MIN_MS - (Date.now() - splashShownAt))
      window.setTimeout(() => {
        if (Capacitor.isNativePlatform()) {
          // 系统启动页还盖在上面：先移除网页启动页再放行，不会闪
          splash.remove()
          enableNativeWindowTheme()
          hideNativeSplash()
          return
        }
        splash.classList.add('splash-hide')
        window.setTimeout(() => {
          splash.remove()
          enableNativeWindowTheme()
        }, 300)
      }, wait)
    })
  })
  void initNativeBridge()
}

void start()
