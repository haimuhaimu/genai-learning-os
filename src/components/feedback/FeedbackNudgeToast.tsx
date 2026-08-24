import { useEffect, useRef } from 'react'
import { MessageCircle, X } from 'lucide-react'

export default function FeedbackNudgeToast({ visible, onDismiss, onOpen }: {
  visible: boolean
  onDismiss: () => void
  onOpen: (trigger: HTMLButtonElement) => void
}) {
  const timerRef = useRef<number>()

  useEffect(() => {
    if (!visible) return
    timerRef.current = window.setTimeout(onDismiss, 9000)
    return () => window.clearTimeout(timerRef.current)
  }, [onDismiss, visible])

  if (!visible) return null
  return (
    <aside className='lo-feedback-nudge' role='status' aria-live='polite' aria-label='学习反馈提醒'>
      <MessageCircle aria-hidden='true' />
      <div><b>这一段对你有帮助吗？</b><span>用一分钟反馈，帮助我们改进学习体验。</span></div>
      <button type='button' className='lo-feedback-nudge-action' onClick={(event) => onOpen(event.currentTarget)}>给反馈</button>
      <button type='button' className='lo-feedback-nudge-close' aria-label='关闭反馈提醒' onClick={onDismiss}><X aria-hidden='true' /></button>
    </aside>
  )
}
