import { Capacitor } from '@capacitor/core'

/** 是否运行在 Capacitor 原生容器内（Android/iOS），而不是普通浏览器 */
export const isNativePlatform = () => Capacitor.isNativePlatform()

export const currentPlatform = () => Capacitor.getPlatform()
