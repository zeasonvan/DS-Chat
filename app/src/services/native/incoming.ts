import { registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import { attachToNewChat, startNewChatWithText } from './actions.js'
import { dataUrlToFile } from './files.js'
import { warnNative } from './log.js'
import { isNativePlatform } from './platform.js'

export type IncomingSharePayload = {
  text?: string | null
  image?: { dataUrl: string; name: string; mimeType: string } | null
}

type IncomingSharePlugin = {
  getPending(): Promise<IncomingSharePayload>
  addListener(
    eventName: 'incomingShare',
    listener: (payload: IncomingSharePayload) => void
  ): Promise<PluginListenerHandle>
}

const IncomingShare = registerPlugin<IncomingSharePlugin>('IncomingShare')

let lastSignature = ''

const handlePayload = (payload: IncomingSharePayload) => {
  const signature = JSON.stringify(payload)
  if (!payload.text && !payload.image) {
    return
  }
  // 冷启动与 resume 可能拿到同一份 Intent，避免重复消费
  if (signature === lastSignature) {
    return
  }
  lastSignature = signature
  if (payload.text?.trim()) {
    startNewChatWithText(payload.text.trim())
  }
  if (payload.image?.dataUrl) {
    const file = dataUrlToFile(
      payload.image.dataUrl,
      payload.image.name || `shared-${Date.now()}.jpg`
    )
    attachToNewChat([file])
  }
}

export const initIncomingShare = async (): Promise<void> => {
  if (!isNativePlatform()) {
    return
  }
  try {
    handlePayload(await IncomingShare.getPending())
    await IncomingShare.addListener('incomingShare', handlePayload)
  } catch (error) {
    warnNative('incoming share unavailable', error)
  }
}
