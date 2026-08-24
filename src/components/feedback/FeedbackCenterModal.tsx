import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ClipboardCopy, ExternalLink, MessageCircle, ShieldCheck, X } from 'lucide-react'
import { buildFeedbackMarkdown, buildGitHubIssueUrl, emptyFeedbackDraft } from '../../feedback/githubIssue'
import { readFeedbackRouteContext } from '../../feedback/routeContext'
import FeedbackForm from './FeedbackForm'

async function copyFeedback(text: string) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable')
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      return document.execCommand('copy')
    } catch {
      return false
    } finally {
      textarea.remove()
    }
  }
}

export default function FeedbackCenterModal({ open, onClose, returnFocus }: {
  open: boolean
  onClose: () => void
  returnFocus: HTMLElement | null
}) {
  const [draft, setDraft] = useState(emptyFeedbackDraft)
  const [includeRoute, setIncludeRoute] = useState(false)
  const [routeContext, setRouteContext] = useState(() => readFeedbackRouteContext(''))
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'manual'>('idle')
  const panelRef = useRef<HTMLDivElement>(null)
  const firstFieldRef = useRef<HTMLSelectElement | null>(null)
  const manualRef = useRef<HTMLTextAreaElement>(null)
  const context = includeRoute ? routeContext : undefined
  const markdown = useMemo(() => buildFeedbackMarkdown(draft, context), [context, draft])
  const issueUrl = useMemo(() => buildGitHubIssueUrl(draft, context), [context, draft])

  useEffect(() => {
    if (!open) return
    setRouteContext(readFeedbackRouteContext(window.location.search))
    setIncludeRoute(false)
    setCopyStatus('idle')
    const frame = requestAnimationFrame(() => {
      firstFieldRef.current = panelRef.current?.querySelector<HTMLSelectElement>('select') ?? null
      firstFieldRef.current?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [open])

  const close = () => {
    const fallback = [...document.querySelectorAll<HTMLElement>('.lo-feedback-trigger, .lo-mobile-feedback, .lo-menu-toggle')]
      .find((element) => element.offsetParent !== null)
    onClose()
    requestAnimationFrame(() => (returnFocus?.isConnected && returnFocus.offsetParent !== null ? returnFocus : fallback)?.focus())
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }
    if (event.key !== 'Tab' || !panelRef.current) return
    const focusable = [...panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus()
    }
  }

  const copy = async () => {
    const copied = await copyFeedback(markdown)
    setCopyStatus(copied ? 'copied' : 'manual')
    if (!copied) requestAnimationFrame(() => { manualRef.current?.focus(); manualRef.current?.select() })
  }

  if (!open) return null
  return (
    <div className='lo-feedback-backdrop' onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
      <div className='lo-feedback-modal' ref={panelRef} role='dialog' aria-modal='true' aria-labelledby='lo-feedback-title' aria-describedby='lo-feedback-privacy' onKeyDown={onKeyDown}>
        <header>
          <div><span><MessageCircle aria-hidden='true' />学习反馈中心</span><h2 id='lo-feedback-title'>告诉我们，哪里真正帮到了你</h2></div>
          <button type='button' onClick={close} aria-label='关闭反馈中心'><X aria-hidden='true' /></button>
        </header>
        <div className='lo-feedback-scroll'>
          <p className='lo-feedback-intro'>无需登录。你可以提交结构化反馈，也可以只复制 Markdown 后自行保存。</p>
          <FeedbackForm value={draft} onChange={setDraft} />
          <section className='lo-feedback-privacy' id='lo-feedback-privacy'>
            <ShieldCheck aria-hidden='true' />
            <div><b>默认最小化上下文</b><p>不会读取或发送 localStorage、学习进度、策略摘要或浏览器 UA。</p></div>
            <label><input type='checkbox' checked={includeRoute} onChange={(event) => setIncludeRoute(event.target.checked)} /><span>附带当前白名单路由</span></label>
          </section>
          {copyStatus === 'manual' ? <label className='lo-feedback-manual' htmlFor='lo-feedback-markdown'><span>自动复制不可用，请全选并手动复制：</span><textarea id='lo-feedback-markdown' ref={manualRef} readOnly value={markdown} rows={8} /></label> : null}
        </div>
        <footer>
          <span className='lo-feedback-copy-status' role='status' aria-live='polite'>{copyStatus === 'copied' ? <><Check aria-hidden='true' />Markdown 已复制</> : copyStatus === 'manual' ? '文本已选中，请按 Ctrl/Cmd+C。' : '提交前可在 GitHub 中继续编辑。'}</span>
          <button type='button' className='is-secondary' onClick={copy}><ClipboardCopy aria-hidden='true' />复制 Markdown</button>
          <a href={issueUrl} target='_blank' rel='noopener noreferrer'>生成 GitHub Issue<ExternalLink aria-hidden='true' /></a>
        </footer>
      </div>
    </div>
  )
}
