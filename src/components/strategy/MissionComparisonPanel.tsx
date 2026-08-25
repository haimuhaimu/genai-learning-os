import { useState } from 'react'
import { saveMissionSnapshot } from '../../resourceLoop'
import type { CaseId } from './caseCatalog'
import { compareEvidence } from './missionEngine'
import type { ControlValues, DecisionEvidence, MissionSpec, MissionSnapshot } from './types'

const asEvidence = (snapshot: MissionSnapshot): DecisionEvidence => ({ metrics: snapshot.metrics, costs: [], feedbackSource: '', feedbackSignals: [], nextTrainingAction: '' })
export default function MissionComparisonPanel({ caseId, mission, controls, baseline, current, snapshot, onSnapshot }: { caseId: CaseId; mission: MissionSpec; controls: ControlValues; baseline: DecisionEvidence; current: DecisionEvidence; snapshot?: MissionSnapshot; onSnapshot: (snapshot: MissionSnapshot) => void }) {
  const [status, setStatus] = useState('')
  const reference = snapshot ? asEvidence(snapshot) : baseline
  const deltas = compareEvidence(reference, current, mission.gates)
  const save = () => {
    const next = { controls: { ...controls }, metrics: current.metrics.map(({ id, label, display, value }) => ({ id, label, display, value })), savedAt: new Date().toISOString() }
    saveMissionSnapshot(caseId, next); onSnapshot(next); setStatus(snapshot ? '自定义快照已替换。' : '自定义快照已保存。')
  }
  return <section className='strategy-controls-panel mission-comparison' aria-labelledby={`comparison-${caseId}`}>
    <header><div><span>反事实比较</span><h2 id={`comparison-${caseId}`}>{snapshot ? '自定义快照 / 当前策略' : '默认基线 / 当前策略'}</h2></div><button className='strategy-form-button' type='button' onClick={save}>{snapshot ? '替换快照' : '保存快照'}</button></header>
    <p>快照最多保留一个。带正负号的变化按门槛方向解释，不代表方案整体优劣。</p>
    <div className='strategy-evidence-grid'>{deltas.map((item) => <article key={item.gate.id}><h3>{item.gate.label}</h3><p>{item.from === undefined ? '缺失' : item.from.toFixed(3)} → {item.to === undefined ? '缺失' : item.to.toFixed(3)}</p><strong>{item.display}，{item.meaning}</strong></article>)}</div>
    <span className='sr-only' role='status' aria-live='polite'>{status}</span>
  </section>
}
