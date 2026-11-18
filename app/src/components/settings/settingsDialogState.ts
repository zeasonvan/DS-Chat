import { create } from 'zustand'
import { useSettings } from '../../services/settings.js'

/** 设置页：主页面或某个二级页面 */
export type SettingsPage =
  | 'main'
  | 'account'
  | 'data'
  | 'language'
  | 'appearance'
  | 'font'
  | 'personalize'
  | 'voice'
  | 'about'

/** 设置页：侧边栏底部、没有 API Key 时的操作与 401 提示都可以打开 */
export const useSettingsDialog = create(() => ({
  open: false,
  page: 'main' as SettingsPage,
}))

export const openSettings = (page: SettingsPage = 'main') =>
  useSettingsDialog.setState({ open: true, page })

export const closeSettings = () => useSettingsDialog.setState({ open: false })

/** 返回键/顶部返回：二级页先回主页面，主页面再关闭 */
export const goBackSettings = () => {
  const { page } = useSettingsDialog.getState()
  if (page !== 'main') {
    useSettingsDialog.setState({ page: 'main' })
    return
  }
  closeSettings()
}

/** 没有 API Key 时打开设置并选中账号管理，返回是否已有 Key */
export const ensureApiKey = () => {
  if (useSettings.getState().apiKey) {
    return true
  }
  openSettings('account')
  return false
}
