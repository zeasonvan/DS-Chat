import { LocalNotifications } from '@capacitor/local-notifications'
import { warnNative } from './log.js'
import { isNativePlatform } from './platform.js'

/** 请求通知权限；返回是否已授权 */
export const ensureNotificationPermission = async (): Promise<boolean> => {
  if (!isNativePlatform()) {
    return false
  }
  try {
    const current = await LocalNotifications.checkPermissions()
    if (current.display === 'granted') {
      return true
    }
    const asked = await LocalNotifications.requestPermissions()
    return asked.display === 'granted'
  } catch (error) {
    warnNative('notification permission unavailable', error)
    return false
  }
}

export const notifyReplyComplete = async (title: string, body: string): Promise<void> => {
  if (!isNativePlatform()) {
    return
  }
  try {
    const current = await LocalNotifications.checkPermissions()
    if (current.display !== 'granted') {
      return
    }
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Math.random() * 0x7fffffff),
          title,
          body,
          schedule: { at: new Date(Date.now() + 100) },
        },
      ],
    })
  } catch (error) {
    warnNative('notification failed', error)
  }
}
