import { useEffect, useRef, useState } from 'react'
import { Check, Sparkles } from 'lucide-react'
import { readResourceLoop, reopenMissionAttempt, RESOURCE_LOOP_EVENT, saveInitialJudgment } from '../../resourceLoop'
import type { CaseId } from './caseCatalog'

type Props = { caseId: CaseId; question: string; mission?: boolean; onLockChange?: (locked: boolean) => void }
export default function StrategyPredictionPanel({ caseId, question, mission, onLockChange }: Props) {
  const initial = readResourceLoop(caseId)?.initialJudgment ?? ''
  const [text, setText] = useState(initial), [saved, setSaved] = useState(Boolean(initial)), [confirming, setConfirming] = useState(false), [status, setStatus] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null), inputRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const refresh = () => { const value = readResourceLoop(caseId)?.initialJudgment ?? ''; setText(value); setSaved(Boolean(value)); onLockChange?.(Boolean(value)) }
    window.addEventListener(RESOURCE_LOOP_EVENT, refresh); return () => window.removeEventListener(RESOURCE_LOOP_EVENT, refresh)
  }, [caseId, onLockChange])
  const save = () => {
    if (!text.trim()) return
    const record = saveInitialJudgment(caseId, text); setText(record.initialJudgment); setSaved(Boolean(record.initialJudgment)); setStatus('预测已锁定。'); onLockChange?.(true)
  }
  const reopen = () => {
    reopenMissionAttempt(caseId); setText(''); setSaved(false); setConfirming(false); setStatus('任务已重开，请记录新的预测。'); onLockChange?.(false)
    requestAnimationFrame(() => inputRef.current?.focus())
  }
  const cancel = () => { setConfirming(false); setStatus('已取消重开。'); requestAnimationFrame(() => triggerRef.current?.focus()) }
  return <section className='strategy-prediction-panel strategy-controls-panel strategy-summary-panel' aria-labelledby={`prediction-${caseId}`}>
    <header><Sparkles aria-hidden='true' /><div><span>先预测</span><h2 id={`prediction-${caseId}`} tabIndex={-1}>操作前，先押一个结果</h2></div></header>
    <p>{question}</p><label htmlFor={`prediction-input-${caseId}`}>你的初始判断</label>
    {saved ? <div className='prediction-locked strategy-summary-output'><p>{text}</p><strong><Check aria-hidden='true' />预测已锁定</strong>{mission ? <button className='strategy-form-button' ref={triggerRef} type='button' onClick={() => setConfirming(true)}>重开任务</button> : null}</div> : <div className='strategy-prediction-input strategy-summary-output'><textarea ref={inputRef} id={`prediction-input-${caseId}`} value={text} maxLength={4000} onChange={(event) => setText(event.target.value)} placeholder='哪项指标会先变？代价会落在哪里？' /><button className='strategy-form-button' type='button' disabled={!text.trim()} onClick={save}>保存预测</button></div>}
    {confirming ? <div className='mission-confirm strategy-summary-output' role='alertdialog' aria-labelledby={`reopen-title-${caseId}`}><b id={`reopen-title-${caseId}`}>确认重开当前任务？</b><p>只会清除本案例的预测、快照和最近压力结果。已形成策略、资源记录和其他案例不受影响。</p><div><button className='strategy-form-button' type='button' onClick={reopen}>确认重开</button><button className='strategy-form-button is-secondary' type='button' onClick={cancel}>取消</button></div></div> : null}
    <small>预测保存在当前浏览器。锁定后可继续实验，但不会被调参覆盖。</small><span className='sr-only' role='status' aria-live='polite'>{status}</span>
  </section>
}
