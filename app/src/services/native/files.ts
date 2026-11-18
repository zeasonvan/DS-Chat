import { Capacitor, registerPlugin } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { Browser } from '@capacitor/browser'
import { currentPlatform } from './platform.js'

type FileSaverPlugin = {
  begin(options: { name: string }): Promise<{ path: string }>
  append(options: { data: string }): Promise<void>
  finish(): Promise<{ path: string }>
  publish(options: { name: string; mimeType?: string }): Promise<{ name: string }>
  abort(): Promise<void>
}

const FileSaver = registerPlugin<FileSaverPlugin>('FileSaver')
/** 超过这个大小就走原生分块写文件，避免整块 Base64 撑爆 WebView 内存 */
const LARGE_BLOB_BYTES = 8 * 1024 * 1024
const WRITE_CHUNK_BYTES = 4 * 1024 * 1024

/** 把 Blob 分块写入 App cache，返回原生路径；避免整个大文件转成一个大 Base64 */
const writeBlobToCacheFile = async (blob: Blob, name: string): Promise<string> => {
  await FileSaver.begin({ name })
  try {
    for (let offset = 0; offset < blob.size; offset += WRITE_CHUNK_BYTES) {
      const chunk = blob.slice(offset, Math.min(blob.size, offset + WRITE_CHUNK_BYTES))
      await FileSaver.append({ data: await blobToBase64(chunk) })
    }
    return (await FileSaver.finish()).path
  } catch (error) {
    await FileSaver.abort().catch(() => {})
    throw error
  }
}

/** 文件名去路径分隔符，避免原生写文件时越界 */
const safeFileName = (name: string): string =>
  name.replace(/[\\/:*?"<>|]/g, '_').replace(/^\.+/, '').slice(0, 120) || 'file'

export const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('read blob failed'))
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.readAsDataURL(blob)
  })

const downloadInBrowser = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.rel = 'noreferrer'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/**
 * 保存并分享一个 Blob：
 * - 原生端写入 Cache，再交给系统分享面板（可直接存到「文件」或发给其他 App）；
 * - Web 端保持原有下载行为。
 */
export const saveAndShareBlob = async (
  blob: Blob,
  fileName: string
): Promise<'shared' | 'downloaded'> => {
  const name = safeFileName(fileName)
  if (!Capacitor.isNativePlatform()) {
    downloadInBrowser(blob, name)
    return 'downloaded'
  }
  let uri: string
  if (blob.size > LARGE_BLOB_BYTES && currentPlatform() === 'android') {
    // 大文件逐块写入 App cache，避免把整个 Blob 转成一个巨大的 Base64 字符串
    uri = `file://${await writeBlobToCacheFile(blob, name)}`
  } else {
    const data = await blobToBase64(blob)
    const written = await Filesystem.writeFile({
      path: `exports/${name}`,
      data,
      directory: Directory.Cache,
      recursive: true,
    })
    uri = written.uri
  }
  await Share.share({
    title: name,
    url: uri,
    dialogTitle: name,
  })
  return 'shared'
}

/** 直接保存到系统下载目录；旧系统或失败时退回系统分享 */
export const saveBlobToDownloads = async (
  blob: Blob,
  fileName: string,
  mimeType = 'application/zip'
): Promise<'downloaded' | 'shared'> => {
  const name = safeFileName(fileName)
  if (!Capacitor.isNativePlatform()) {
    downloadInBrowser(blob, name)
    return 'downloaded'
  }
  if (currentPlatform() !== 'android') {
    return saveAndShareBlob(blob, name)
  }
  const path = await writeBlobToCacheFile(blob, name)
  try {
    await FileSaver.publish({ name, mimeType })
    return 'downloaded'
  } catch {
    await Share.share({ title: name, url: `file://${path}`, dialogTitle: name })
    return 'shared'
  }
}

/** 分享纯文本；原生端走系统分享面板 */
export const shareText = async (title: string, text: string): Promise<void> => {
  if (!Capacitor.isNativePlatform()) {
    if (navigator.share) {
      await navigator.share({ title, text })
      return
    }
    await navigator.clipboard.writeText(text)
    return
  }
  await Share.share({ title, text, dialogTitle: title })
}

/** 在系统浏览器 / 应用内浏览器打开外部链接 */
export const openExternal = async (url: string): Promise<void> => {
  if (!Capacitor.isNativePlatform()) {
    window.open(url, '_blank', 'noopener,noreferrer')
    return
  }
  await Browser.open({ url })
}

export const dataUrlToBlob = (dataUrl: string): Blob => {
  const comma = dataUrl.indexOf(',')
  if (comma < 0) {
    return new Blob([])
  }
  const meta = dataUrl.slice(0, comma)
  const payload = dataUrl.slice(comma + 1)
  const isBase64 = /;base64/i.test(meta)
  const mimeType = /data:([^;]+)/i.exec(meta)?.[1] ?? 'application/octet-stream'
  if (!isBase64) {
    return new Blob([decodeURIComponent(payload)], { type: mimeType })
  }
  const binary = atob(payload)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mimeType })
}

export const dataUrlToFile = (dataUrl: string, name: string): File => {
  const blob = dataUrlToBlob(dataUrl)
  return new File([blob], safeFileName(name), { type: blob.type })
}
