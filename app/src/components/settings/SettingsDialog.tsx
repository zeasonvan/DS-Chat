import clsx from 'clsx'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  IconBackOutline20,
  IconCameraOutline16,
  IconChevronRightOutline14,
  IconDarkOutline16,
  IconDataOutline16,
  IconDocOutline20,
  IconDownloadOutline16,
  IconFollowsystemOutline16,
  IconGlobeLanguageOutline14,
  IconHelpOutline20,
  IconInfoOutline20,
  IconLightOutline16,
  IconLogoutOutline20,
  IconPlayMediaOutline16,
  IconSparkleOutline20,
  IconUploadOutline14,
  IconUserOutline20,
} from '../base/icons.js'
import {
  BackupError,
  clearHistory,
  exportHistory,
  importHistory,
} from '../../services/chat/backup.js'
import { useChatStore } from '../../services/chat/store.js'
import { regionCodes, getRegionName, provinces } from '../../services/location.js'
import {
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  isChineseBrowser,
  setApiKey,
  setAutoReadAloud,
  setFontSize,
  setLocale,
  setLocation,
  setNotifyOnComplete,
  setProfileAvatar,
  setProfileName,
  setThemePreference,
  setTtsVoice,
  useSettings,
  type ThemePreference,
} from '../../services/settings.js'
import { useTranslate, type TranslationKey, type TranslationMessage } from '../../i18n/index.js'
import { Button } from '../base/Button.js'
import { Modal } from '../base/Modal.js'
import { Select } from '../base/Select.js'
import { showToast } from '../base/toastState.js'
import { fetchUserBalance, type UserBalance } from '../../services/api/balance.js'
import { classifyApiError } from '../../services/api/errors.js'
import { openExternal, saveBlobToDownloads } from '../../services/native/files.js'
import { readAvatarFile } from '../../services/profile/avatar.js'
import { ensureNotificationPermission } from '../../services/native/notifications.js'
import { ApiKeyConfirm, ApiKeyField, useApiKeyEditor } from './ApiKeyField.js'
import {
  goBackSettings,
  openSettings,
  useSettingsDialog,
  type SettingsPage,
} from './settingsDialogState.js'
import styles from './Settings.module.css'

/**
 * 设置弹窗：分「通用设置」（主题、语言、朗读音色、位置）与「数据管理」（API Key、导入、导出、删除）。
 * 桌面端为居中弹窗、左侧导航；移动端为底部弹层、导航横排在内容上方
 */
const APP_VERSION =
  document.querySelector('meta[name="application-version"]')?.getAttribute('content') ?? '0.1.1'

const pageTitleKey: Record<Exclude<SettingsPage, 'main'>, TranslationKey> = {
  account: 'settingsAccountManagement',
  data: 'settingsDataManagement',
  language: 'settingsLanguage',
  appearance: 'settingsAppearance',
  font: 'settingsFontSize',
  personalize: 'settingsPersonalization',
  voice: 'settingsTtsVoice',
  about: 'settingsSectionAbout',
}

/** 关闭动画时长，与 Settings.module.css 中的退出动画保持一致 */
const EXIT_MS = 220

/** 打开从右侧推入、关闭反向退出；关闭动画播完才卸载，避免直接消失 */
export const SettingsDialog = () => {
  const open = useSettingsDialog((state) => state.open)
  const page = useSettingsDialog((state) => state.page)
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      setClosing(false)
      return
    }
    if (!mounted) {
      return
    }
    setClosing(true)
    const timer = window.setTimeout(() => {
      setMounted(false)
      setClosing(false)
    }, EXIT_MS)
    return () => window.clearTimeout(timer)
  }, [open, mounted])

  return mounted ? <SettingsPage page={page} closing={closing} /> : null
}

const SettingsPage = ({ page, closing }: { page: SettingsPage; closing: boolean }) => {
  const t = useTranslate()
  const title = page === 'main' ? t('settings') : t(pageTitleKey[page])
  // 首次进入的页面不做内容过渡，交给整页推入动画
  const firstPage = useRef(page)
  const animateContent = page !== firstPage.current
  return (
    <div
      className={clsx(styles.page, closing ? styles.pageClosing : styles.pageEntering)}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <header className={styles.pageHeader}>
        <button
          type="button"
          className={styles.backButton}
          aria-label={t('back')}
          onClick={goBackSettings}
        >
          <IconBackOutline20 />
        </button>
        <div className={styles.pageTitle}>{title}</div>
        <span className={styles.headerSpacer} />
      </header>
      <div
        key={page}
        className={clsx(
          styles.pageScroll,
          animateContent && (page === 'main' ? styles.pageScrollBack : styles.pageScrollForward)
        )}
      >
        {page === 'main' ? <SettingsMain /> : null}
        {page === 'account' ? <AccountPage /> : null}
        {page === 'data' ? <DataPage /> : null}
        {page === 'language' ? <LanguagePage /> : null}
        {page === 'appearance' ? <AppearancePage /> : null}
        {page === 'font' ? <FontPage /> : null}
        {page === 'personalize' ? <PersonalizePage /> : null}
        {page === 'voice' ? <VoicePage /> : null}
        {page === 'about' ? <AboutPage /> : null}
      </div>
    </div>
  )
}

const SectionLabel = ({ children }: { children: ReactNode }) => (
  <div className={styles.sectionLabel}>{children}</div>
)

const Card = ({ children, standalone }: { children: ReactNode; standalone?: boolean }) => (
  <div className={clsx(styles.card, standalone && styles.cardStandalone)}>{children}</div>
)

const NavRow = ({
  icon,
  label,
  value,
  onClick,
  chevron = true,
  danger = false,
}: {
  icon: ReactNode
  label: string
  value?: string
  onClick: () => void
  chevron?: boolean
  danger?: boolean
}) => (
  <button
    type="button"
    className={clsx(styles.navRow, danger && styles.navRowDanger)}
    onClick={onClick}
  >
    <span className={styles.navIcon}>{icon}</span>
    <span className={styles.navLabel}>{label}</span>
    {value ? <span className={styles.navValue}>{value}</span> : null}
    {chevron ? (
      <span className={styles.navChevron}>
        <IconChevronRightOutline14 />
      </span>
    ) : null}
  </button>
)

const SettingsMain = () => {
  const t = useTranslate()
  const locale = useSettings((state) => state.locale)
  const themePreference = useSettings((state) => state.themePreference)
  const ttsVoice = useSettings((state) => state.ttsVoice)
  const fontSize = useSettings((state) => state.fontSize)
  const [confirmLogout, setConfirmLogout] = useState(false)

  const themeLabel =
    themePreference === 'light'
      ? t('avatarMenuSettingsDialogThemeSelectLightOption')
      : themePreference === 'dark'
        ? t('avatarMenuSettingsDialogThemeSelectDarkOption')
        : t('settingsAppearanceSystem')
  const voiceLabel =
    ttsVoice === 'stella' ? t('settingsTtsVoiceStella') : t('settingsTtsVoiceTide')
  const localeLabel =
    locale === 'zh-CN' ? t('settingsLanguageValueZhCN') : t('settingsLanguageValueEnUS')
  const termsUrl =
    locale === 'zh-CN'
      ? 'https://cdn.deepseek.com/policies/zh-CN/deepseek-terms-of-use.html'
      : 'https://cdn.deepseek.com/policies/en-US/deepseek-terms-of-use.html'

  return (
    <>
      <SectionLabel>{t('settingsSectionAccount')}</SectionLabel>
      <Card>
        <NavRow
          icon={<IconUserOutline20 />}
          label={t('settingsAccountManagement')}
          onClick={() => openSettings('account')}
        />
        <NavRow
          icon={<IconDataOutline16 />}
          label={t('settingsDataManagement')}
          onClick={() => openSettings('data')}
        />
      </Card>

      <SectionLabel>{t('settingsSectionApp')}</SectionLabel>
      <Card>
        <NavRow
          icon={<IconGlobeLanguageOutline14 />}
          label={t('settingsLanguage')}
          value={localeLabel}
          onClick={() => openSettings('language')}
        />
        <NavRow
          icon={<IconLightOutline16 />}
          label={t('settingsAppearance')}
          value={themeLabel}
          onClick={() => openSettings('appearance')}
        />
        <NavRow
          icon={<span className={styles.aaIcon}>Aa</span>}
          label={t('settingsFontSize')}
          value={`${fontSize}px`}
          onClick={() => openSettings('font')}
        />
        <NavRow
          icon={<IconSparkleOutline20 />}
          label={t('settingsPersonalization')}
          onClick={() => openSettings('personalize')}
        />
      </Card>

      <SectionLabel>{t('settingsSectionVoice')}</SectionLabel>
      <Card>
        <NavRow
          icon={<IconPlayMediaOutline16 />}
          label={t('settingsTtsVoice')}
          value={voiceLabel}
          onClick={() => openSettings('voice')}
        />
      </Card>

      <SectionLabel>{t('settingsSectionAbout')}</SectionLabel>
      <Card>
        <NavRow
          icon={<IconInfoOutline20 />}
          label={t('settingsCheckUpdate')}
          value={APP_VERSION}
          onClick={() => showToast({ key: 'settingsUpToDate' })}
        />
        <NavRow
          icon={<IconDocOutline20 />}
          label={t('settingsTerms')}
          onClick={() => void openExternal(termsUrl)}
        />
      </Card>

      <Card standalone>
        <NavRow
          icon={<IconHelpOutline20 />}
          label={t('settingsHelpFeedback')}
          onClick={() => void openExternal('https://github.com/zeasonvan/DS-Chat')}
        />
      </Card>

      <Card standalone>
        <NavRow
          icon={<IconLogoutOutline20 />}
          label={t('settingsLogout')}
          onClick={() => setConfirmLogout(true)}
          chevron={false}
        />
      </Card>

      {confirmLogout ? (
        <Modal
          title={t('settingsLogoutConfirmTitle')}
          onClose={() => setConfirmLogout(false)}
          footer={
            <>
              <Button variant="outlined" onClick={() => setConfirmLogout(false)}>
                {t('cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setApiKey(null)
                  setConfirmLogout(false)
                  openSettings('account')
                }}
              >
                {t('settingsLogoutConfirm')}
              </Button>
            </>
          }
        >
          {t('settingsLogoutConfirmDescription')}
        </Modal>
      ) : null}
    </>
  )
}

const AccountPage = () => {
  const t = useTranslate()
  const editor = useApiKeyEditor()
  const [confirmDelete, setConfirmDelete] = useState(false)
  return (
    <>
      <Card>
        <ProfileSettings />
      </Card>
      <Card>
        <ApiKeyField
          editor={editor}
          onDelete={editor.apiKey ? () => setConfirmDelete(true) : undefined}
        />
      </Card>
      <Card>
        <BalanceSetting />
        <RechargeSetting />
      </Card>
      <div className={styles.hint}>{t('settingsApiKeyStored')}</div>
      <ApiKeyConfirm editor={editor} />
      {confirmDelete ? (
        <Modal
          title={t('settingsApiKeyDeleteConfirmTitle')}
          onClose={() => setConfirmDelete(false)}
          footer={
            <>
              <Button variant="outlined" onClick={() => setConfirmDelete(false)}>
                {t('cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setApiKey(null)
                  setConfirmDelete(false)
                  showToast({ key: 'settingsApiKeyDeleted' })
                }}
              >
                {t('delete')}
              </Button>
            </>
          }
        >
          {t('settingsApiKeyDeleteConfirmDescription')}
        </Modal>
      ) : null}
    </>
  )
}

/** 昵称与头像：只保存在本机，与 API Key 无关 */
const ProfileSettings = () => {
  const t = useTranslate()
  const profileName = useSettings((state) => state.profileName)
  const profileAvatar = useSettings((state) => state.profileAvatar)
  const inputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(profileName)

  const onPick = async (file: File) => {
    try {
      setProfileAvatar(await readAvatarFile(file))
      showToast({ key: 'settingsProfileAvatarUpdated' })
    } catch {
      showToast({ key: 'settingsProfileAvatarFailed', type: 'error' })
    }
  }

  const displayName = profileName || t('localAccount')
  const initial = (displayName.trim().slice(0, 1) || 'A').toUpperCase()

  return (
    <div className={styles.profile}>
      <button
        type="button"
        className={styles.profileAvatar}
        aria-label={t('settingsProfileAvatar')}
        onClick={() => inputRef.current?.click()}
      >
        {profileAvatar ? (
          <img className={styles.profileAvatarImage} src={profileAvatar} alt="" />
        ) : (
          <span className={styles.profileAvatarInitial}>{initial}</span>
        )}
        <span className={styles.profileAvatarEdit}>
          <IconCameraOutline16 />
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) {
            void onPick(file)
          }
        }}
      />
      <div className={styles.profileFields}>
        <label className={styles.label} htmlFor="profile-name-input">
          {t('settingsProfileName')}
        </label>
        <input
          id="profile-name-input"
          className={styles.profileInput}
          value={name}
          maxLength={24}
          placeholder={t('settingsProfileNamePlaceholder')}
          autoComplete="off"
          onChange={(event) => {
            setName(event.target.value)
            setProfileName(event.target.value)
          }}
        />
        {profileAvatar ? (
          <button
            type="button"
            className={styles.profileReset}
            onClick={() => setProfileAvatar(null)}
          >
            {t('settingsProfileAvatarReset')}
          </button>
        ) : null}
      </div>
    </div>
  )
}

const DataPage = () => {
  const t = useTranslate()
  const historyImport = useHistoryImport()
  const historyDelete = useHistoryDelete()
  const replacingHistory = useChatStore((state) => state.importingHistory)
  const historyBusy = historyImport.busy || historyDelete.busy || replacingHistory
  return (
    <>
      <Card>
        <ImportHistory historyImport={historyImport} disabled={historyBusy} />
        <ExportHistory disabled={historyBusy} />
        <SettingCell
          label={t('deleteAllSessions')}
          status={null}
          action={
            <Button
              variant="dangerOutlined"
              size="m"
              className={styles.cellButton}
              disabled={historyBusy}
              onClick={historyDelete.open}
            >
              {t('delete')}
            </Button>
          }
        />
      </Card>
      {historyImport.file ? <ImportConfirm historyImport={historyImport} /> : null}
      {historyDelete.opened ? <DeleteAllConfirm historyDelete={historyDelete} /> : null}
    </>
  )
}

const LanguagePage = () => (
  <Card>
    <LocaleSetting />
  </Card>
)

const AppearancePage = () => (
  <Card>
    <ThemeSetting />
  </Card>
)

const FontPage = () => {
  const t = useTranslate()
  return (
    <>
      <Card>
        <FontSizeSetting />
      </Card>
      <div className={styles.fontPreview} style={{ fontSize: 'var(--chat-font-size, 16px)' }}>
        {t('welcomeMessageChat250808')}
      </div>
    </>
  )
}

const PersonalizePage = () => {
  const t = useTranslate()
  return (
    <>
      <Card>
        <AutoReadAloudSetting />
        <NotifyOnCompleteSetting />
        <LocationSetting />
      </Card>
      <Card standalone>
        <div className={styles.cell}>
          <div className={styles.text}>
            <div className={styles.label}>{t('settingsPermissions')}</div>
            <div className={styles.description}>{t('settingsPermissionsDescription')}</div>
          </div>
        </div>
      </Card>
    </>
  )
}

const VoicePage = () => (
  <Card>
    <TtsVoiceSetting />
  </Card>
)

const AboutPage = () => {
  const t = useTranslate()
  const locale = useSettings((state) => state.locale)
  const termsUrl =
    locale === 'zh-CN'
      ? 'https://cdn.deepseek.com/policies/zh-CN/deepseek-terms-of-use.html'
      : 'https://cdn.deepseek.com/policies/en-US/deepseek-terms-of-use.html'
  return (
    <Card>
      <SettingCell
        label={t('settingsVersion')}
        description={APP_VERSION}
        status={null}
        action={
          <Button
            variant="outlined"
            size="m"
            className={styles.cellButton}
            onClick={() => showToast({ key: 'settingsUpToDate' })}
          >
            {t('settingsCheckUpdate')}
          </Button>
        }
      />
      <SettingCell
        label={t('settingsTerms')}
        status={null}
        action={
          <Button
            variant="outlined"
            size="m"
            className={styles.cellButton}
            onClick={() => void openExternal(termsUrl)}
          >
            {t('settingsRechargeOpen')}
          </Button>
        }
      />
    </Card>
  )
}

/** 删除确认保留在设置之上；失败可重试，成功只关闭确认弹窗。 */
const DeleteAllConfirm = ({
  historyDelete,
}: {
  historyDelete: ReturnType<typeof useHistoryDelete>
}) => {
  const t = useTranslate()
  return (
    <Modal
      title={t('deleteAllSessionsModalTitle')}
      className={styles.deleteConfirm}
      onClose={historyDelete.cancel}
      footer={
        <div className={styles.deleteActions} aria-busy={historyDelete.busy}>
          <Button
            variant="outlined"
            autoFocus
            disabled={historyDelete.busy}
            onClick={historyDelete.cancel}
          >
            {t('cancel')}
          </Button>
          <Button
            variant="danger"
            disabled={historyDelete.busy}
            onClick={() => void historyDelete.confirm()}
          >
            {t(historyDelete.busy ? 'historyDeleting' : 'deleteAllSessions')}
          </Button>
        </div>
      }
    >
      {t('deleteAllSessionsModalDescription')}
    </Modal>
  )
}

const useHistoryDelete = () => {
  const [opened, setOpened] = useState(false)
  const [busy, setBusy] = useState(false)
  const deleting = useRef(false)

  const confirm = async () => {
    if (deleting.current) {
      return
    }
    deleting.current = true
    setBusy(true)
    try {
      await clearHistory()
      setOpened(false)
      showToast({ key: 'historyDeleted' })
    } catch {
      showToast({ key: 'historyDeleteFailed', type: 'error' })
    } finally {
      deleting.current = false
      setBusy(false)
    }
  }

  return {
    opened,
    busy,
    open: () => setOpened(true),
    cancel: () => {
      if (!deleting.current) {
        setOpened(false)
      }
    },
    confirm,
  }
}

const LocationSetting = () => {
  const t = useTranslate()
  const locale = useSettings((state) => state.locale)
  const location = useSettings((state) => state.location)
  const province =
    location?.region === 'CN'
      ? provinces.find((item) => item.code === location.province)
      : undefined

  return (
    <SettingCell
      label={t('settingsLocation')}
      status={null}
      className={styles.locationCell}
      action={
        <div className={styles.locationSelectors}>
          {isChineseBrowser() ? (
            <>
              <Select
                ariaLabel={t('settingsLocationProvince')}
                className={styles.provinceSelect}
                value={province?.code ?? ''}
                placeholder={t('settingsLocationProvince')}
                options={provinces.map((item) => ({ value: item.code, label: item.name }))}
                onChange={(value) => {
                  if (value !== province?.code) {
                    setLocation({ region: 'CN', province: value })
                  }
                }}
              />
              <Select
                ariaLabel={t('settingsLocationCity')}
                className={styles.citySelect}
                value={province ? (location?.city ?? '') : ''}
                disabled={!province?.cities.length}
                placeholder={t('settingsLocationCity')}
                options={
                  province?.cities.map((item) => ({ value: item.code, label: item.name })) ?? []
                }
                onChange={(value) => {
                  if (province) {
                    setLocation({ region: 'CN', province: province.code, city: value })
                  }
                }}
              />
            </>
          ) : (
            <Select
              ariaLabel={t('settingsLocationRegion')}
              className={styles.regionSelect}
              value={location?.region ?? ''}
              placeholder={t('settingsLocationRegion')}
              options={regionCodes
                .map((code) => ({ value: code, label: getRegionName(code, locale) }))
                .sort((a, b) => a.label.localeCompare(b.label, locale))}
              onChange={(value) => setLocation({ region: value })}
            />
          )}
        </div>
      }
    />
  )
}

const LocaleSetting = () => {
  const t = useTranslate()
  const locale = useSettings((state) => state.locale)
  return (
    <SettingCell
      label={t('settingsLocalePreference')}
      status={null}
      action={
        <Select
          ariaLabel={t('settingsLocalePreference')}
          value={locale}
          options={[
            { value: 'zh-CN', label: t('settingsLocaleZhCN'), lang: 'zh-CN' },
            { value: 'en-US', label: t('settingsLocaleEnUS'), lang: 'en' },
          ]}
          onChange={setLocale}
        />
      }
    />
  )
}

/** 朗读音色：stella（海星，女声）/ tide（暗潮，男声） */
const TtsVoiceSetting = () => {
  const t = useTranslate()
  const ttsVoice = useSettings((state) => state.ttsVoice)
  return (
    <SettingCell
      label={t('settingsTtsVoice')}
      status={null}
      action={
        <Select
          ariaLabel={t('settingsTtsVoice')}
          value={ttsVoice}
          options={[
            { value: 'stella', label: t('settingsTtsVoiceStella') },
            { value: 'tide', label: t('settingsTtsVoiceTide') },
          ]}
          onChange={setTtsVoice}
        />
      }
    />
  )
}

/** 余额查询结果缓存：同一次打开设置、同一个 Key 不重复请求 */
const balanceCache = new Map<string, { at: number; balance: UserBalance }>()
const BALANCE_CACHE_MS = 60_000

const formatAmount = (value: string, currency: string, locale: string): string => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(Number(value))
  } catch {
    return `${value} ${currency}`
  }
}

/** 账户余额：GET /user/balance，查询不消耗额度 */
const BalanceSetting = () => {
  const t = useTranslate()
  const apiKey = useSettings((state) => state.apiKey)
  const locale = useSettings((state) => state.locale)
  const [state, setState] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; balance: UserBalance }
    | { status: 'error'; message: string }
  >({ status: 'idle' })
  const controller = useRef<AbortController | null>(null)

  const refresh = async () => {
    if (!apiKey) {
      return
    }
    const cached = balanceCache.get(apiKey)
    if (cached && Date.now() - cached.at < BALANCE_CACHE_MS) {
      setState({ status: 'success', balance: cached.balance })
      return
    }
    controller.current?.abort()
    const next = new AbortController()
    controller.current = next
    setState({ status: 'loading' })
    try {
      const balance = await fetchUserBalance(apiKey, next.signal)
      if (next.signal.aborted) {
        return
      }
      balanceCache.set(apiKey, { at: Date.now(), balance })
      setState({ status: 'success', balance })
    } catch (error) {
      if (next.signal.aborted) {
        return
      }
      const condition = classifyApiError(error)
      const message =
        condition === 'unauthorized'
          ? t('apiKeyInvalid')
          : condition === 'network'
            ? t('commonNetworkErrorToast')
            : error instanceof Error
              ? error.message
              : String(error)
      setState({ status: 'error', message })
    }
  }

  useEffect(() => () => controller.current?.abort(), [])

  const balance = state.status === 'success' ? state.balance : null
  const details =
    balance?.balance_infos
      .map((info) =>
        t('settingsBalanceDetail', {
          total: formatAmount(info.total_balance, info.currency, locale),
          granted: formatAmount(info.granted_balance, info.currency, locale),
          toppedUp: formatAmount(info.topped_up_balance, info.currency, locale),
        })
      )
      .join(' · ') ?? ''
  const description =
    state.status === 'loading'
      ? t('settingsBalanceQuerying')
      : state.status === 'error'
        ? state.message
        : balance
          ? `${balance.is_available ? t('settingsBalanceAvailable') : t('settingsBalanceUnavailable')}${details ? ` · ${details}` : ''}`
          : t('settingsBalanceDescription')

  return (
    <SettingCell
      label={t('settingsBalance')}
      description={description}
      status={state.status === 'error' ? { key: 'settingsBalanceFailed', params: { message: state.message }, error: true } : null}
      action={
        <Button
          variant="outlined"
          size="m"
          className={styles.cellButton}
          disabled={!apiKey || state.status === 'loading'}
          onClick={() => void refresh()}
        >
          {t(state.status === 'loading' ? 'settingsBalanceQuerying' : 'settingsBalanceQuery')}
        </Button>
      }
    />
  )
}

/** 用量与充值：跳转 DeepSeek 开放平台 */
const RechargeSetting = () => {
  const t = useTranslate()
  return (
    <SettingCell
      label={t('settingsRecharge')}
      description={t('settingsRechargeDescription')}
      status={null}
      action={
        <Button
          variant="outlined"
          size="m"
          className={styles.cellButton}
          onClick={() => void openExternal('https://platform.deepseek.com/usage')}
        >
          {t('settingsRechargeOpen')}
        </Button>
      }
    />
  )
}

/** 字号：范围输入，即时作用于消息区 */
const FontSizeSetting = () => {
  const t = useTranslate()
  const fontSize = useSettings((state) => state.fontSize)
  return (
    <SettingCell
      label={t('settingsFontSize')}
      description={t('settingsFontSizeDescription')}
      status={null}
      action={
        <div className={styles.fontSizeControl}>
          <input
            aria-label={t('settingsFontSize')}
            className={styles.range}
            type="range"
            min={FONT_SIZE_MIN}
            max={FONT_SIZE_MAX}
            step={1}
            value={fontSize}
            onChange={(event) => setFontSize(Number(event.target.value))}
          />
          <span className={styles.rangeValue}>{fontSize}</span>
        </div>
      }
    />
  )
}

/** 自动朗读：回复完成后调用现有 TTS */
const AutoReadAloudSetting = () => {
  const t = useTranslate()
  const autoReadAloud = useSettings((state) => state.autoReadAloud)
  return (
    <SettingCell
      label={t('settingsAutoReadAloud')}
      description={t('settingsAutoReadAloudDescription')}
      status={null}
      action={
        <Button
          variant={autoReadAloud ? 'primary' : 'outlined'}
          size="s"
          aria-pressed={autoReadAloud}
          onClick={() => setAutoReadAloud(!autoReadAloud)}
        >
          {t(autoReadAloud ? 'settingsToggleOn' : 'settingsToggleOff')}
        </Button>
      }
    />
  )
}

/** 回复完成通知：开启时先请求系统通知权限 */
const NotifyOnCompleteSetting = () => {
  const t = useTranslate()
  const notifyOnComplete = useSettings((state) => state.notifyOnComplete)
  const toggle = async () => {
    if (notifyOnComplete) {
      setNotifyOnComplete(false)
      return
    }
    if (await ensureNotificationPermission()) {
      setNotifyOnComplete(true)
    } else {
      showToast({ key: 'notificationPermissionDenied', type: 'error' })
    }
  }
  return (
    <SettingCell
      label={t('settingsNotifyOnComplete')}
      description={t('settingsNotifyOnCompleteDescription')}
      status={null}
      action={
        <Button
          variant={notifyOnComplete ? 'primary' : 'outlined'}
          size="s"
          aria-pressed={notifyOnComplete}
          onClick={() => void toggle()}
        >
          {t(notifyOnComplete ? 'settingsToggleOn' : 'settingsToggleOff')}
        </Button>
      }
    />
  )
}

/** 覆盖导入的二次确认，叠在设置弹窗上 */
const ImportConfirm = ({
  historyImport,
}: {
  historyImport: ReturnType<typeof useHistoryImport>
}) => {
  const t = useTranslate()
  return (
    <Modal
      title={t('historyImportConfirmTitle')}
      className={styles.importConfirm}
      onClose={historyImport.cancel}
      footer={
        <>
          <Button variant="outlined" size="m" autoFocus onClick={historyImport.cancel}>
            {t('cancel')}
          </Button>
          <Button variant="dangerOutlined" size="m" onClick={() => void historyImport.confirm()}>
            {t('historyImportConfirm')}
          </Button>
        </>
      }
    >
      <div className={styles.importConfirmText}>{t('historyImportConfirmDescription')}</div>
    </Modal>
  )
}

const themeOptions: { value: ThemePreference; label: TranslationKey; icon: ReactNode }[] = [
  {
    value: 'light',
    label: 'avatarMenuSettingsDialogThemeSelectLightOption',
    icon: <IconLightOutline16 />,
  },
  {
    value: 'dark',
    label: 'avatarMenuSettingsDialogThemeSelectDarkOption',
    icon: <IconDarkOutline16 />,
  },
  {
    value: 'system',
    label: 'avatarMenuSettingsDialogThemeSelectSystemOption',
    icon: <IconFollowsystemOutline16 />,
  },
]

/**
 * 主题项：标题下方浅色 / 深色 / 跟随系统三个选块。
 * 与下方语言选项连续排列。
 */
const ThemeSetting = () => {
  const t = useTranslate()
  const themePreference = useSettings((state) => state.themePreference)
  const label = t('avatarMenuSettingsDialogThemeItemLabel')
  return (
    <div className={styles.theme}>
      {label}
      <div role="radiogroup" aria-label={label} className={styles.themeOptions}>
        {themeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={themePreference === option.value}
            className={clsx(
              styles.themeOption,
              themePreference === option.value && styles.themeOptionSelected
            )}
            onClick={() => setThemePreference(option.value)}
          >
            {option.icon}
            {t(option.label)}
          </button>
        ))}
      </div>
    </div>
  )
}

/** `reason` 为失败原因的文案 key，展示时按当前语言翻译后填入 `message` 参数。 */
type Status = (TranslationMessage & { error?: boolean; reason?: TranslationKey }) | null

/** 导出失败附带原因：预期的错误用对应文案作原因，其他错误用错误信息。 */
const errorStatus = (key: TranslationKey, error: unknown): Status => ({
  key,
  ...(error instanceof BackupError
    ? { reason: error.key }
    : { params: { message: error instanceof Error ? error.message : String(error) } }),
  error: true,
})

const SettingCell = ({
  label,
  description,
  status,
  action,
  className,
}: {
  label: string
  description?: string
  status: Status
  action: ReactNode
  className?: string
}) => {
  const t = useTranslate()
  return (
    <div className={clsx(styles.cell, styles.row, className)}>
      <div className={styles.text}>
        <div className={styles.label}>{label}</div>
        {status || description ? (
          <div className={clsx(styles.description, status?.error && styles.error)}>
            {status
              ? t(status.key, status.reason ? { message: t(status.reason) } : status.params)
              : description}
          </div>
        ) : null}
      </div>
      {action}
    </div>
  )
}

/** 选文件后先提示覆盖；确认后才检查文件并执行导入，任何错误都提示导入失败。 */
const useHistoryImport = () => {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>(null)
  const importing = useRef(false)

  const confirm = async () => {
    if (!file || importing.current) {
      return
    }
    importing.current = true
    setFile(null)
    setBusy(true)
    setStatus(null)
    try {
      const count = await importHistory(file)
      setStatus({ key: count === 1 ? 'historyImportedOne' : 'historyImported', params: { count } })
    } catch {
      setStatus({ key: 'historyImportFailed', error: true })
    } finally {
      importing.current = false
      setBusy(false)
    }
  }

  return { file, busy, status, select: setFile, cancel: () => setFile(null), confirm }
}

/** 导入 = 覆盖：用选中文件替换本地全部会话与附件。 */
const ImportHistory = ({
  historyImport,
  disabled,
}: {
  historyImport: ReturnType<typeof useHistoryImport>
  disabled: boolean
}) => {
  const t = useTranslate()
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <SettingCell
      label={t('historyImport')}
      description={t('historyImportDescription')}
      status={historyImport.status}
      action={
        <>
          <Button
            variant="outlined"
            size="m"
            className={clsx(styles.cellButton, styles.uploadButton)}
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <IconUploadOutline14 />
            {t('upload')}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) {
                historyImport.select(file)
              }
            }}
          />
        </>
      }
    />
  )
}

/** 将全部会话及图片导出为 ZIP 文件并下载 */
const ExportHistory = ({ disabled }: { disabled: boolean }) => {
  const t = useTranslate()
  const empty = useChatStore((state) => state.sessions.length === 0)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>(null)

  const onExport = async () => {
    setBusy(true)
    setStatus(null)
    try {
      const { name, blob } = await exportHistory()
      const result = await saveBlobToDownloads(blob, name, 'application/zip')
      setStatus(
        result === 'downloaded'
          ? { key: 'historyExportSaved', params: { name } }
          : { key: 'historyExportShared' }
      )
    } catch (error) {
      setStatus(errorStatus('historyExportFailed', error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingCell
      label={t('exportAllLabel')}
      description={t('historyExportDescription')}
      status={status}
      action={
        <Button
          variant="outlined"
          size="m"
          className={styles.cellButton}
          disabled={disabled || busy || empty}
          onClick={() => void onExport()}
        >
          <IconDownloadOutline16 />
          {t('exportAllDownload')}
        </Button>
      }
    />
  )
}
