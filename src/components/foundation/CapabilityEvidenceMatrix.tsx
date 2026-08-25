import { useEffect, useMemo, useState } from 'react'
import { readStrategyEvidence, STRATEGY_EVIDENCE_EVENT } from '../../strategyEvidence'
import { strategyCaseSpecs } from '../strategy/caseRegistry'
import { deriveCapabilityEvidence } from '../strategy/missionCapabilities'

type Go = (page: string, options?: Record<string, string>) => void
export default function CapabilityEvidenceMatrix({ go }: { go: Go }) {
  const [records, setRecords] = useState(() => readStrategyEvidence())
  useEffect(() => { const sync = () => setRecords(readStrategyEvidence()); window.addEventListener(STRATEGY_EVIDENCE_EVENT, sync); window.addEventListener('storage', sync); return () => { window.removeEventListener(STRATEGY_EVIDENCE_EVENT, sync); window.removeEventListener('storage', sync) } }, [])
  const rows = useMemo(() => deriveCapabilityEvidence(records, [...strategyCaseSpecs.values()]), [records])
  return <section className='capability-matrix' aria-labelledby='capability-matrix-title'>
    <header><h2 id='capability-matrix-title'>任务能力证据覆盖</h2><p>只汇总已形成策略与已通过压力测试的可见行为。证据覆盖不等于能力认证。</p></header>
    <div className='capability-matrix-grid' role='list'>{rows.map((row) => <article key={row.id} role='listitem'><h3>{row.label}</h3>{row.sources.length ? <ul>{row.sources.map((source) => <li key={source.caseId}><button type='button' onClick={() => go('strategy-case', { case: source.caseId })}>{source.title}</button><span>{[source.strategyFormed && '策略形成', source.stressPassed && '压力通过'].filter(Boolean).join(' + ')}</span></li>)}</ul> : <p>尚无证据来源</p>}<footer>{row.pending.length ? <>待补：{row.pending.join('；')}</> : '两类行为证据均已有来源'}</footer></article>)}</div>
  </section>
}
