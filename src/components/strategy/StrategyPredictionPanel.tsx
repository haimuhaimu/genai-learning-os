import { useEffect, useState } from 'react'
import { Check, Sparkles } from 'lucide-react'
import { readResourceLoop, RESOURCE_LOOP_EVENT, saveInitialJudgment } from '../../resourceLoop'
import type { CaseId } from './caseCatalog'

type Props = { caseId: CaseId; question: string }

export default function StrategyPredictionPanel({ caseId, question }: Props) {
  const [text, setText] = useState(() => readResourceLoop(caseId)?.initialJudgment ?? '')
  const [saved, setSaved] = useState(Boolean(readResourceLoop(caseId)?.initialJudgment))

  useEffect(() => {
    const refresh = () => {
      const initialJudgment = readResourceLoop(caseId)?.initialJudgment ?? ''
      setText(initialJudgment)
      setSaved(Boolean(initialJudgment))
    }
    window.addEventListener(RESOURCE_LOOP_EVENT, refresh)
    return () => window.removeEventListener(RESOURCE_LOOP_EVENT, refresh)
  }, [caseId])

  const save = () => {
    if (!text.trim()) return
    saveInitialJudgment(caseId, text)
    setSaved(true)
  }

  return (
    <section className='strategy-prediction-panel strategy-controls-panel strategy-summary-panel' aria-labelledby={`prediction-${caseId}`}>
      <header><Sparkles aria-hidden='true' /><div><span>先预测</span><h2 id={`prediction-${caseId}`}>操作前，先押一个结果</h2></div></header>
      <p>{question}</p>
      <label htmlFor={`prediction-input-${caseId}`}>你的初始判断</label>
      <div className='strategy-prediction-input strategy-summary-output'>
        <textarea id={`prediction-input-${caseId}`} value={text} maxLength={4000} onChange={(event) => { setText(event.target.value); setSaved(false) }} placeholder='哪项指标会先变？代价会落在哪里？' />
        <button className='strategy-form-button' type='button' disabled={!text.trim()} onClick={save}>{saved ? <Check aria-hidden='true' /> : null}{saved ? '已保存' : '保存预测'}</button>
      </div>
      <small>仅保存在当前浏览器。底部复盘会直接使用这份预测。</small>
    </section>
  )
}
