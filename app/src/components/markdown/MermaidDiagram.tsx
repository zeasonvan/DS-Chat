import { useTranslate } from '../../i18n/index.js'
import { memo, useEffect, useRef, useState } from 'react'
import { useTheme } from '../../app/theme.js'
import { renderMermaid } from '../../services/markdown/mermaid.js'
import { saveAndShareBlob } from '../../services/native/files.js'
import { toPng } from 'html-to-image'
import { showToast } from '../base/toastState.js'

/** 流式绘制最新内容、保留上次有效图；回答结束后才显示渲染错误。 */
export const MermaidDiagram = memo(function MermaidDiagram({
  code,
  loading,
}: {
  code: string
  loading: boolean
}) {
  const t = useTranslate()
  const dark = useTheme() === 'dark'
  const [result, setResult] = useState({ svg: '', failedCode: null as string | null })
  const containerRef = useRef<HTMLDivElement>(null)
  const latestCodeRef = useRef(code)
  latestCodeRef.current = code
  // 流式阶段从 ref 取最新文本，避免每个片段都取消绘制；结束后立即绘制完整内容。
  const finalCode = loading ? null : code

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let previousCode: string | undefined
    let displayedCode: string | undefined

    const draw = async (input: string) => {
      if (input === displayedCode || cancelled) {
        return
      }
      const svg = await renderMermaid(input, dark, () => cancelled)
      if (svg && !cancelled) {
        displayedCode = input
        setResult({ svg, failedCode: null })
      }
    }

    const renderLatest = async () => {
      const input = latestCodeRef.current
      if (input !== previousCode) {
        previousCode = input
        try {
          await draw(input)
        } catch {
          if (!cancelled) {
            if (loading) {
              // 流式片段的末行可能包含未完成的节点，仅绘制前面的完整行。
              const text = input.trimEnd()
              const lineEnd = Math.max(text.lastIndexOf('\n'), text.lastIndexOf('\r'))
              const prefix = text.slice(0, Math.max(0, lineEnd))
              // 已显示的内容覆盖当前前缀时保持图形。
              if (prefix && !displayedCode?.startsWith(prefix)) {
                try {
                  await draw(prefix)
                } catch {
                  // 前缀也可能尚未构成完整语法，保留已有图。
                }
              }
            } else {
              setResult({ svg: '', failedCode: input })
            }
          }
        }
      }
      // 当前帧结束后绘制最新片段，连续输入合并为一次绘制。
      if (!cancelled && loading) {
        timer = setTimeout(renderLatest, 100)
      }
    }

    void renderLatest()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [dark, loading, finalCode])

  if (!code.trim() || !result.svg) {
    return (
      <div className="md-mermaid-status" role="status">
        {!loading && !code.trim()
          ? t('mermaidEmpty')
          : !loading && result.failedCode === code
            ? t('mermaidRenderFail')
            : t('mermaidLoading')}
      </div>
    )
  }

  const saveDiagram = async () => {
    const svg = containerRef.current?.querySelector('svg')
    if (!svg) {
      return
    }
    const text = new XMLSerializer().serializeToString(svg)
    const source = new Blob([text], { type: 'image/svg+xml;charset=utf-8' })
    const node = containerRef.current
    if (!node) {
      return
    }
    try {
      // html-to-image 能处理 Mermaid 生成的 foreignObject，直接栅格化可见容器
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        filter: (child) =>
          !(child instanceof HTMLElement && child.dataset.noCapture === 'true'),
      })
      const png = await (await fetch(dataUrl)).blob()
      await saveAndShareBlob(png, 'mermaid-diagram.png')
      showToast({ key: 'imageShared' })
    } catch {
      // 极端情况下退回矢量 SVG，至少保证图表可保存
      await saveAndShareBlob(source, 'mermaid-diagram.svg')
    }
  }

  return (
    <div className="md-mermaid-wrap">
      <div
        ref={containerRef}
        className="md-mermaid-diagram"
        dangerouslySetInnerHTML={{ __html: result.svg }}
      />
      <button
        type="button"
        className="md-mermaid-save"
        data-no-capture="true"
        onClick={() => void saveDiagram()}
      >
        {t('saveDiagram')}
      </button>
    </div>
  )
})
