import { IconMenuOutline20, IconNewChatOutline20, IconVolumeOffOutline20, IconVolumeOnOutline20 } from '../base/icons.js'
import { useTranslate } from '../../i18n/index.js'
import { newChat } from '../../services/chat/store.js'
import { setAutoReadAloud, useSettings } from '../../services/settings.js'
import { IconButton } from '../base/IconButton.js'
import { openMobileSider } from '../sider/mobileSiderState.js'
import styles from './MobileHeader.module.css'

/** 移动端顶栏：首页左侧菜单、右侧自动朗读与新建；会话页显示标题与新建 */
export const MobileHeader = ({ title }: { title?: string }) => {
  const t = useTranslate()
  const autoReadAloud = useSettings((state) => state.autoReadAloud)
  return (
    <div className={styles.header}>
      <IconButton
        size="xl"
        tone="primary"
        icon={<IconMenuOutline20 />}
        aria-label={t('expandSiderbarButton')}
        onClick={openMobileSider}
      />
      {title === undefined ? (
        <>
          <div className={styles.spacer} />
          <div className={styles.right}>
            <IconButton
              size="xl"
              tone="primary"
              icon={autoReadAloud ? <IconVolumeOnOutline20 /> : <IconVolumeOffOutline20 />}
              tooltip={t('settingsAutoReadAloud')}
              onClick={() => setAutoReadAloud(!autoReadAloud)}
            />
            <IconButton
              size="xl"
              tone="primary"
              icon={<IconNewChatOutline20 />}
              tooltip={t('newChat')}
              onClick={newChat}
            />
          </div>
        </>
      ) : (
        <>
          <div className={styles.title}>{title}</div>
          <IconButton
            size="xl"
            tone="primary"
            icon={<IconNewChatOutline20 />}
            tooltip={t('newChat')}
            onClick={newChat}
          />
        </>
      )}
    </div>
  )
}
