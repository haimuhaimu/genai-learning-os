import { useState } from 'react'
import { saveMissionStress } from '../../resourceLoop'
import type { CaseId } from './caseCatalog'
import { evaluateMission, runStressPreset, type StressFreshness } from './missionEngine'
import type { ControlValues, MissionStressRecord, StrategyCaseSpec } from './types'

export default function MissionStressPanel({ caseId, spec, controls, result, freshness, onResult }: { caseId: CaseId; spec: StrategyCaseSpec; controls: ControlValues; result?: MissionStressRecord; freshness?: StressFreshness; onResult: (result: MissionStressRecord) => void }) {
  const mission = spec.mission!
  const [status, setStatus] = useState('')
  const evaluation = result ? evaluateMission(mission.gates, { metrics: result.metrics }) : undefined
  const stale = Boolean(result && freshness && !freshness.fresh)
  const run = (presetId: string) => {
    const preset = mission.stressPresets.find((item) => item.id === presetId)!
    const next = runStressPreset(spec, controls, preset), now = new Date().toISOString()
    const record = {
      presetId,
      passed: next.evaluation.passed,
      baseControls: { ...controls },
      effectiveControls: { ...next.controls },
      ranAt: now,
      metrics: next.evidence.metrics.map(({ id, label, display, value }) => ({ id, label, display, value })),
    }
    saveMissionStress(caseId, record)
    setStatus(`压力测试完成：${next.evaluation.passed ? '通过' : '未通过'}。`); onResult(record)
  }
  const focusControl = (id: string) => { const target = document.getElementById(`strategy-${id}`); target?.focus({ preventScroll: true }); target?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }) }
  return <section className='strategy-controls-panel mission-stress' aria-labelledby={`stress-${caseId}`}>
    <header><div><span>压力挑战</span><h2 id={`stress-${caseId}`}>策略在约束变化后还成立吗？</h2></div></header>
    <p>测试使用固定输入和当前策略，仅用于教学回放，不会改写上方旋钮。</p>
    <div className='strategy-evidence-grid'>{mission.stressPresets.map((preset) => <article key={preset.id}><h3>{preset.label}</h3><p>{preset.description}</p><button className='strategy-form-button' type='button' onClick={() => run(preset.id)}>运行测试</button></article>)}</div>
    {evaluation ? <div className='strategy-evidence-grid'><article><h3>{stale ? '历史压力结果' : evaluation.passed ? '测试通过' : '测试未通过'}</h3>{stale ? <p><b>压力结果已过期，请按当前策略重跑。</b><small>历史结果仍保留，但不能用于当前任务完成。</small></p> : null}{evaluation.gates.map((gate) => { const label = spec.controls.find((item) => item.id === gate.returnControlId)?.label ?? gate.returnControlId; return <p key={gate.id}><b>{gate.passed ? '通过' : '未通过'}：{gate.label}</b><small>{gate.reason}</small>{!gate.passed ? <button className='strategy-form-button' type='button' onClick={() => focusControl(gate.returnControlId)}>返回调整“{label}”</button> : null}</p> })}</article></div> : <p>尚未执行压力测试。结果只会在你主动运行后记录。</p>}
    <span className='sr-only' role='status' aria-live='polite'>{status}</span>
  </section>
}
