import { ArrowRight, Check, ClipboardCopy, FileText, LayoutGrid } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { DecisionSummary } from './types'

export type SummaryFormationGate = { ready: boolean; missing: Array<'prediction' | 'fresh-stress'> }
type NextAction = { label: string; onClick: () => void }
type Props = {
  summary: DecisionSummary
  onSave: (text: string) => boolean | void
  onFormed?: (text: string) => void
  formationGate?: SummaryFormationGate
  onBackToCenter: () => void
  nextAction: NextAction
}
const missingLabels = { prediction: '锁定预测', 'fresh-stress': '对当前策略运行压力测试' } as const

export default function DecisionSummaryPanel({ summary, onSave, onFormed, formationGate, onBackToCenter, nextAction }: Props) {
  const [formed, setFormed] = useState(false)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'fallback'>('idle')
  const textRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { setFormed(false); setCopyStatus('idle') }, [summary.text])

  const form = () => {
    if (formationGate && !formationGate.ready) return
    if (onSave(summary.text) === false) return
    setFormed(true)
    onFormed?.(summary.text)
  }
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
      <header><FileText aria-hidden='true' /><div><span>最后迁移</span><h2>把取舍变成可复用决策</h2></div></header>
      <button type='button' className='strategy-form-button' onClick={form} disabled={formationGate ? !formationGate.ready : false}>形成策略摘要</button>
      {formationGate && !formationGate.ready ? <div className='mission-evidence-note'><p>形成完整任务证据前还需要：</p><ul>{formationGate.missing.map((item) => <li key={item}>{missingLabels[item]}</li>)}</ul></div> : null}
      {formed ? <><div className='strategy-summary-output'><textarea ref={textRef} readOnly value={summary.text} aria-label='策略摘要文本' /><div><button type='button' onClick={copy}><ClipboardCopy aria-hidden='true' />复制摘要</button><span role='status'>{copyStatus === 'copied' ? <><Check aria-hidden='true' />已复制</> : copyStatus === 'fallback' ? '无法自动复制，文本已选中，请使用 Ctrl/Cmd+C。' : '证据已保存为“已形成策略”。'}</span></div></div><nav className='strategy-summary-next' aria-label='策略案例下一步'><span>下一步</span><div><button type='button' className='is-secondary' onClick={onBackToCenter}><LayoutGrid aria-hidden='true' />回案例中心</button><button type='button' onClick={nextAction.onClick}>{nextAction.label}<ArrowRight aria-hidden='true' /></button></div></nav></> : formationGate ? <p>满足以上条件后，可形成与本次尝试绑定的策略摘要。</p> : <p>只有点击“形成策略摘要”才会保存 level 2；调整控件只记录 level 1。</p>}
    </section>
  )
}
