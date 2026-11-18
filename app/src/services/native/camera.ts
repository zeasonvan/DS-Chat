import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { isNativePlatform } from './platform.js'

/** 调系统相机拍照；Web 端返回 null，由文件选择器兜底 */
export const takePhoto = async (): Promise<File | null> => {
  if (!isNativePlatform()) {
    return null
  }
  const photo = await Camera.getPhoto({
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Prompt,
    quality: 85,
    width: 2048,
    saveToGallery: false,
  })
  if (!photo.dataUrl) {
    return null
  }
  const response = await fetch(photo.dataUrl)
  const blob = await response.blob()
  const ext = (photo.format || 'jpeg').replace(/^jpg$/i, 'jpeg')
  return new File([blob], `photo-${Date.now()}.${ext}`, { type: blob.type })
}
