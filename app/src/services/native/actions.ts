import { showToast } from '../../components/base/toastState.js'
import { closeSettings } from '../../components/settings/settingsDialogState.js'
import { ensureApiKey } from '../../components/settings/settingsDialogState.js'
import { closeMobileSider } from '../../components/sider/mobileSiderState.js'
import { addDraftFiles, setDraftText } from '../chat/drafts.js'
import { newChat } from '../chat/store.js'
import { useSettings } from '../settings.js'
import { takePhoto } from './camera.js'

/** 把外部内容放进「新对话」的输入框；原生分享/深链都走这里 */
export const startNewChatWithText = (text: string) => {
  closeSettings()
  closeMobileSider()
  newChat()
  setDraftText(null, text)
}

/** 把图片/文件加入新对话草稿；没有 Key 时先打开设置 */
export const attachToNewChat = (files: File[]) => {
  if (files.length === 0) {
    return
  }
  if (!ensureApiKey()) {
    showToast({ key: 'apiKeyRequiredForShare', type: 'error' })
    return
  }
  closeMobileSider()
  newChat()
  const error = addDraftFiles(null, files, useSettings.getState().apiKey ?? '')
  if (error) {
    showToast(error)
  }
}

/** 拍照并加入当前草稿 */
export const attachPhoto = async (sessionId: string | null) => {
  if (!ensureApiKey()) {
    return
  }
  try {
    const file = await takePhoto()
    if (!file) {
      return
    }
    const error = addDraftFiles(sessionId, [file], useSettings.getState().apiKey ?? '')
    if (error) {
      showToast(error)
    }
  } catch {
    showToast({ key: 'imageShareFailed', type: 'error' })
  }
}
