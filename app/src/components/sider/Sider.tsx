import clsx from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import { useTranslate } from '../../i18n/index.js'
import {
  IconCloseFill14,
  IconEllipsisOutline16,
  IconSearchOutline16,
  IconSettingsOutline16,
} from '../base/icons.js'
import { groupSessions } from '../../services/chat/sessionGroups.js'
import { newChat, removeSession, useChatStore } from '../../services/chat/store.js'
import { loadAllSessions } from '../../services/chat/db.js'
import { useSettings } from '../../services/settings.js'
import { toSessionSummary, type Session, type SessionSummary } from '../../services/chat/types.js'
import { Button } from '../base/Button.js'
import { IconButton } from '../base/IconButton.js'
import { Menu } from '../base/Menu.js'
import { Modal } from '../base/Modal.js'
import { showToast } from '../base/toastState.js'
import { openSettings } from '../settings/settingsDialogState.js'
import { closeMobileSider, useMobileSider } from './mobileSiderState.js'
import { SessionItem } from './SessionItem.js'
import styles from './Sider.module.css'

const sessionMatches = (session: Session, query: string): boolean => {
  if (session.title.toLowerCase().includes(query)) {
    return true
  }
  return session.messages.some((message) => {
    if (message.role === 'user') {
      return message.content.toLowerCase().includes(query)
    }
    return message.blocks.some(
      (block) => block.type === 'text' && block.text.toLowerCase().includes(query)
    )
  })
}

/** 侧边栏：搜索、会话列表/空状态、底部账号入口；移动端放在抽屉里 */
export const Sider = ({ mobile = false }: { mobile?: boolean }) => {
  const t = useTranslate()
  const sessions = useChatStore((state) => state.sessions)
  const activeId = useChatStore((state) => state.activeId)
  const profileName = useSettings((state) => state.profileName)
  const profileAvatar = useSettings((state) => state.profileAvatar)
  const [now, setNow] = useState(Date.now)
  const [deleting, setDeleting] = useState<SessionSummary | null>(null)
  const [deletePending, setDeletePending] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SessionSummary[] | null>(null)
  const [searching, setSearching] = useState(false)

  const searchList = results ?? sessions
  const groups = useMemo(() => groupSessions(searchList, now, t), [searchList, now, t])
  const showEmpty = query.trim() === '' && sessions.length === 0
  const showNewChat = query.trim() === '' && sessions.length > 0

  useEffect(() => {
    const value = query.trim().toLowerCase()
    if (!value) {
      setResults(null)
      setSearching(false)
      return
    }
    let cancelled = false
    setSearching(true)
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const all = await loadAllSessions()
          if (cancelled) {
            return
          }
          const matches = all
            .filter((session) => sessionMatches(session, value))
            .map(toSessionSummary)
          setResults(matches)
        } catch {
          if (!cancelled) {
            setResults([])
          }
        } finally {
          if (!cancelled) {
            setSearching(false)
          }
        }
      })()
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const refresh = () => {
      clearTimeout(timer)
      const time = Date.now()
      setNow(time)
      const midnight = new Date(time).setHours(24, 0, 0, 0)
      timer = setTimeout(refresh, midnight - time)
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh()
      }
    }
    refresh()
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', refresh)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  const startNewChat = () => {
    newChat()
    closeMobileSider()
  }

  return (
    <div className={clsx(styles.sider, mobile && styles.mobile)}>
      <div className={styles.search}>
        <IconSearchOutline16 />
        <input
          className={styles.searchInput}
          value={query}
          placeholder={t('searchChatsPlaceholder')}
          aria-label={t('searchChatsPlaceholder')}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query ? (
          <button
            type="button"
            className={styles.searchClear}
            aria-label={t('close')}
            onClick={() => setQuery('')}
          >
            <IconCloseFill14 />
          </button>
        ) : null}
      </div>

      {showEmpty ? (
        <div className={styles.empty}>
          <div className={styles.emptyTitle}>{t('noSessionsTitle')}</div>
          <div className={styles.emptyDescription}>{t('noSessionsDescription')}</div>
          <button type="button" className={styles.newChatPrimary} onClick={startNewChat}>
            {t('newChat')}
          </button>
        </div>
      ) : (
        <>
          {showNewChat ? (
            <button type="button" className={styles.newChatPrimary} onClick={startNewChat}>
              {t('newChat')}
            </button>
          ) : null}
          <div className={styles.listWrap}>
            <div className={styles.list}>
              {searching && results === null ? (
                <div className={styles.searchEmpty}>{t('searchChatsSearching')}</div>
              ) : null}
              {!searching && results !== null && results.length === 0 ? (
                <div className={styles.searchEmpty}>{t('searchChatsNoResult')}</div>
              ) : null}
              {groups.map((group) => (
                <div key={group.key} className={styles.section}>
                  <div className={styles.sectionHeader}>{group.label}</div>
                  {group.sessions.map((session) => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      active={session.id === activeId}
                      onDelete={() => setDeleting(session)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className={styles.bottom}>
        <button type="button" className={styles.account} onClick={() => openSettings('main')}>
          <span className={styles.avatar}>
            {profileAvatar ? (
              <img className={styles.avatarImage} src={profileAvatar} alt="" />
            ) : (
              (profileName || t('localAccount')).slice(0, 1).toUpperCase()
            )}
          </span>
          <span className={styles.accountName}>{profileName || t('localAccount')}</span>
        </button>
        <Menu
          options={[
            {
              key: 'settings',
              label: t('settings'),
              icon: <IconSettingsOutline16 />,
              onSelect: () => openSettings('main'),
            },
          ]}
        >
          {({ toggle }) => (
            <IconButton icon={<IconEllipsisOutline16 />} tooltip={t('settings')} onClick={toggle} />
          )}
        </Menu>
      </div>

      {deleting ? (
        <Modal
          title={t('deleteSessionModalContentTitle')}
          onClose={() => {
            if (!deletePending) {
              setDeleting(null)
            }
          }}
          footer={
            <>
              <Button variant="outlined" disabled={deletePending} onClick={() => setDeleting(null)}>
                {t('cancel')}
              </Button>
              <Button
                variant="danger"
                disabled={deletePending}
                onClick={async () => {
                  setDeletePending(true)
                  try {
                    if (await removeSession(deleting.id)) {
                      setDeleting(null)
                    } else {
                      showToast({ key: 'sessionDeleteFailed', type: 'error' })
                    }
                  } finally {
                    setDeletePending(false)
                  }
                }}
              >
                {t('delete')}
              </Button>
            </>
          }
        >
          {t('deleteSessionWithFilesDescription')}
        </Modal>
      ) : null}
    </div>
  )
}

/** 页面回位动画结束后再卸载抽屉，避免滑回时下方出现空白 */
const DRAWER_EXIT_MS = 320

/** 移动端抽屉：压在页面下方，打开时由页面右移露出；点页面任意位置关闭 */
export const MobileSider = () => {
  const open = useMobileSider((state) => state.open)
  const [mounted, setMounted] = useState(open)

  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    if (!mounted) {
      return
    }
    const timer = window.setTimeout(() => setMounted(false), DRAWER_EXIT_MS)
    return () => window.clearTimeout(timer)
  }, [open, mounted])

  return mounted ? (
    <div className={styles.drawer}>
      <Sider mobile />
    </div>
  ) : null
}
