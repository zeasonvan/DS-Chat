/**
 * 自定义头像：把用户选的图片裁成正方形并压到 256px 的 JPEG data URL。
 * 直接存原图会让 localStorage 迅速超限，也会让侧边栏每次渲染解码大图。
 */
const AVATAR_SIZE = 256
const AVATAR_QUALITY = 0.86
const MAX_INPUT_BYTES = 20 * 1024 * 1024

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('image decode failed'))
    image.src = url
  })

/** 读取用户选择的文件并生成头像 data URL；无法解码时抛错 */
export const readAvatarFile = async (file: File): Promise<string> => {
  if (!file.type.startsWith('image/')) {
    throw new Error('unsupported file')
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('file too large')
  }
  const url = URL.createObjectURL(file)
  try {
    const image = await loadImage(url)
    const side = Math.min(image.naturalWidth, image.naturalHeight)
    if (!side) {
      throw new Error('empty image')
    }
    const canvas = document.createElement('canvas')
    canvas.width = AVATAR_SIZE
    canvas.height = AVATAR_SIZE
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('canvas unavailable')
    }
    context.drawImage(
      image,
      (image.naturalWidth - side) / 2,
      (image.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      AVATAR_SIZE,
      AVATAR_SIZE
    )
    return canvas.toDataURL('image/jpeg', AVATAR_QUALITY)
  } finally {
    URL.revokeObjectURL(url)
  }
}
