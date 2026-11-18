import { registerPlugin } from '@capacitor/core'
import { warnNative } from './log.js'
import { isNativePlatform } from './platform.js'

type MediaKeepAlivePlugin = {
  start(options: { title?: string }): Promise<void>
  stop(): Promise<void>
}

const MediaKeepAlive = registerPlugin<MediaKeepAlivePlugin>('MediaKeepAlive')

/** 朗读期间启动前台服务；失败不影响朗读本身 */
export const startReadAloudKeepAlive = async (title = '正在朗读'): Promise<void> => {
  if (!isNativePlatform()) {
    return
  }
  try {
    await MediaKeepAlive.start({ title })
  } catch (error) {
    warnNative('keep alive start failed', error)
  }
}

export const stopReadAloudKeepAlive = async (): Promise<void> => {
  if (!isNativePlatform()) {
    return
  }
  try {
    await MediaKeepAlive.stop()
  } catch (error) {
    warnNative('keep alive stop failed', error)
  }
}
