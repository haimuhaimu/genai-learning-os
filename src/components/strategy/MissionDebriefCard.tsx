import { useMemo, useRef, useState } from 'react'
import { buildDebriefText, compareEvidence, evaluateMission } from './missionEngine'
import type { ControlValues, DecisionEvidence, MissionSpec, MissionStressRecord } from './types'

export default function MissionDebriefCard({ title, mission, prediction, controls, baseline, current, stress, summary, formed }: { title: string; mission: MissionSpec; prediction?: string; controls: ControlValues; baseline: DecisionEvidence; current: DecisionEvidence; stress?: MissionStressRecord; summary: string; formed: boolean }) {
  const [status, setStatus] = useState(''), textRef = useRef<HTMLTextAreaElement>(null)
  const text = useMemo(() => buildDebriefText({ title, prediction, controls, summary, deltas: compareEvidence(baseline, current, mission.gates), stress: stress ? { label: mission.stressPresets.find((item) => item.id === stress.presetId)?.label ?? stress.presetId, evaluation: evaluateMission(mission.gates, { metrics: stress.metrics }) } : undefined, transferQuestion: mission.transferQuestion }), [baseline, controls, current, mission, prediction, stress, summary, title])
  const copy = async () => {
    try { if (!navigator.clipboard?.writeText) throw new Error(); await navigator.clipboard.writeText(text); setStatus('复盘卡已复制。') }
    catch { setStatus('无法自动复制，文本已选中，请使用 Ctrl/Cmd+C。'); requestAnimationFrame(() => { textRef.current?.focus(); textRef.current?.select() }) }
  }
  return <section className='strategy-summary-panel mission-debrief' aria-labelledby={`debrief-${mission.id}`}><header><div><span>迁移复盘</span><h2 id={`debrief-${mission.id}`}>把本次选择带到下一个场景</h2></div></header>
    {!formed ? <p>形成策略摘要后解锁复盘卡。建议先锁定预测并至少运行一次压力测试。</p> : <div className='strategy-summary-output'><textarea ref={textRef} readOnly value={text} aria-label='任务复盘卡文本' /><button type='button' onClick={copy}>复制复盘卡</button></div>}
    <span role='status' aria-live='polite'>{status}</span>
  </section>
}
