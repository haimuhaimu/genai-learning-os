import { evaluateMission } from './missionEngine'
import type { DecisionEvidence, MissionSpec } from './types'

const target = (operator: string, value: number) => `${operator} ${Number.isInteger(value) ? value : value.toFixed(2)}`
export default function MissionBrief({ mission, evidence }: { mission: MissionSpec; evidence: DecisionEvidence }) {
  const result = evaluateMission(mission.gates, evidence)
  return <section className='strategy-controls-panel mission-brief' aria-labelledby={`mission-${mission.id}`}>
    <header><div><span>你的业务角色</span><h2 id={`mission-${mission.id}`}>{mission.role}</h2></div><strong>{result.passed ? '当前达标' : '当前未达标'}</strong></header>
    <p>{mission.objective}</p>
    <div className='strategy-metrics' role='list'>{result.gates.map((gate) => <article className={gate.passed ? 'is-emphasis' : ''} role='listitem' key={gate.id}><span>{gate.passed ? '通过' : '未通过'}</span><strong>{gate.label}</strong><small>当前 {gate.display}，目标 {target(gate.operator, gate.target)}</small></article>)}</div>
    <small>目标状态来自固定教学数据。请先记录判断，再通过调整与压力测试验证策略。</small>
  </section>
}
