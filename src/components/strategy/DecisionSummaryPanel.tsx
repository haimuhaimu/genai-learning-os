import { Check, ClipboardCopy, FileText } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { DecisionSummary } from './types'

type Props = { summary: DecisionSummary; onSave: (text: string) => void }

export default function DecisionSummaryPanel({ summary, onSave }: Props) {
  const [formed, setFormed] = useState(false)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'fallback'>('idle')
  const textRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { setFormed(false); setCopyStatus('idle') }, [summary.text])

  const form = () => { setFormed(true); onSave(summary.text) }
  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable')
      await navigator.clipboard.writeText(summary.text)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('fallback')
      requestAnimationFrame(() => { textRef.current?.focus(); textRef.current?.select() })
    }
  }

  return (
    <section className='strategy-summary-panel' aria-live='polite'>
      <header><FileText aria-hidden='true' /><div><span>策略摘要</span><h2>把取舍变成可复用决策</h2></div></header>
      <button type='button' className='strategy-form-button' onClick={form}>形成策略摘要</button>
      {formed ? <div className='strategy-summary-output'><textarea ref={textRef} readOnly value={summary.text} aria-label='策略摘要文本' /><div><button type='button' onClick={copy}><ClipboardCopy aria-hidden='true' />复制摘要</button><span role='status'>{copyStatus === 'copied' ? <><Check aria-hidden='true' />已复制</> : copyStatus === 'fallback' ? '无法自动复制，文本已选中，请使用 Ctrl/Cmd+C。' : '证据已保存为“已形成策略”。'}</span></div></div> : <p>只有点击“形成策略摘要”才会保存 level 2；调整控件只记录 level 1。</p>}
    </section>
  )
}
