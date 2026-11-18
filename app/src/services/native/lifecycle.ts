import { App } from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'
import { closeSearchPanel, useSearchPanel } from '../../components/search/searchPanelState.js'
import { goBackSettings, useSettingsDialog } from '../../components/settings/settingsDialogState.js'
import { closeMobileSider, useMobileSider } from '../../components/sider/mobileSiderState.js'
import { useChatStore } from '../chat/store.js'
import { loadSession } from '../chat/db.js'
import type { AssistantMessage, Session } from '../chat/types.js'
import { useSettings } from '../settings.js'
import { attachPhoto, startNewChatWithText } from './actions.js'
import { initIncomingShare } from './incoming.js'
import { notifyReplyComplete } from './notifications.js'
import { isNativePlatform } from './platform.js'

/** 返回键：先关最上层 Web UI，再最小化 App，避免一按就退出 */
const closeTopLayer = (): boolean => {
  if (useSettingsDialog.getState().open) {
    // 设置页本身是一个 dialog；叠在上面的确认框先关确认框
    if (document.querySelectorAll('[role="dialog"]').length > 1) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    } else {
      goBackSettings()
    }
    return true
  }
  if (useMobileSider.getState().open) {
    closeMobileSider()
    return true
  }
  if (useSearchPanel.getState().entry !== null) {
    closeSearchPanel()
    return true
  }
  if (document.querySelector('[role="dialog"]')) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    return true
  }
  return false
}

const replyText = (message: AssistantMessage): string =>
  message.blocks
    .filter((block) => block.type === 'text')
    .map((block) => (block.type === 'text' ? block.text : ''))
    .join('\n')
    .trim()

const onReplyFinished = async (sessionId: string) => {
  if (!useSettings.getState().notifyOnComplete || document.visibilityState !== 'hidden') {
    return
  }
  const session: Session | undefined =
    useChatStore.getState().sessionCache[sessionId] ?? (await loadSession(sessionId))
  if (!session) {
    return
  }
  const last = [...session.messages].reverse().find((message) => message.role === 'assistant')
  if (!last || last.role !== 'assistant') {
    return
  }
  const text = replyText(last)
  if (!text) {
    return
  }
  await notifyReplyComplete(session.title || 'DeepSeek', text.slice(0, 120))
}

/** 订阅流式结束事件，只在该会话从 streaming 变为非 streaming 时通知一次 */
const installReplyNotifications = (): void => {
  let previous = useChatStore.getState().streaming
  useChatStore.subscribe((state) => {
    const current = state.streaming
    const finished = Object.keys(previous).filter((id) => !Object.hasOwn(current, id))
    previous = current
    finished.forEach((id) => {
      void onReplyFinished(id)
    })
  })
}

const handleDeepLink = (rawUrl: string) => {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return
  }
  if (url.protocol !== 'dschat:') {
    return
  }
  const route = url.host
  const path = url.pathname.replace(/\/+$/, '') || '/'
  if (route === 'chat' && path === '/new') {
    startNewChatWithText('')
    return
  }
  if (route === 'chat' && path === '/voice') {
    startNewChatWithText('')
    window.dispatchEvent(new CustomEvent('dschat:voice'))
    return
  }
  if (route === 'chat' && path === '/camera') {
    startNewChatWithText('')
    void attachPhoto(null)
    return
  }
  if (route === 'chat' && path === '/ask') {
    startNewChatWithText(url.searchParams.get('text') ?? '')
  }
}

/** 原生容器初始化：返回键、深链、外部分享入口、回复完成通知 */
export const initNativeBridge = async (): Promise<void> => {
  if (!isNativePlatform()) {
    return
  }
  const listeners: PluginListenerHandle[] = []
  listeners.push(
    await App.addListener('backButton', () => {
      if (!closeTopLayer()) {
        void App.minimizeApp()
      }
    })
  )
  listeners.push(
    await App.addListener('appUrlOpen', (event) => {
      handleDeepLink(event.url)
    })
  )
  await initIncomingShare()
  installReplyNotifications()
}
