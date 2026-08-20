import { ArrowRight, CheckCircle2, Circle, Target } from 'lucide-react'
import { useEffect, useState } from 'react'
import { evidenceLevelLabels, readStrategyEvidence, STRATEGY_EVIDENCE_EVENT, type EvidenceLevel } from '../../strategyEvidence'
import { strategyCaseRegistry } from '../strategy/caseRegistry'

type Go = (page: string, options?: Record<string, string>) => void

export default function StrategyEvidenceSection({ go }: { go: Go }) {
  const [records, setRecords] = useState(() => readStrategyEvidence())
  useEffect(() => {
    const sync = () => setRecords(readStrategyEvidence())
    window.addEventListener(STRATEGY_EVIDENCE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => { window.removeEventListener(STRATEGY_EVIDENCE_EVENT, sync); window.removeEventListener('storage', sync) }
  }, [])
  const latest = records.filter((item) => item.summaryText).slice(0, 6)

  return (
    <section className='strategy-progress-section' aria-labelledby='strategy-progress-title'>
      <header><div><span>策略证据</span><h2 id='strategy-progress-title'>八条路线，八个可复用决策</h2></div><button type='button' onClick={() => go('strategy-cases')}>进入策略案例地图<ArrowRight /></button></header>
      <p className='strategy-progress-explainer'>旧进度记录你看过什么；策略证据记录你做过什么决定。</p>
      <div className='strategy-progress-grid'>
        {strategyCaseRegistry.map((item) => {
          const record = records.find((entry) => entry.caseId === item.id)
          const level = (record?.level ?? 0) as EvidenceLevel
          return <button type='button' key={item.id} onClick={() => go(item.page, item.options)}><span>{item.routeLabel}</span><b>{item.title}</b><small className={`level-${level}`}>{level ? <CheckCircle2 /> : <Circle />}{evidenceLevelLabels[level]}</small></button>
        })}
      </div>
      <div className='strategy-recent-summaries'>
        <header><Target aria-hidden='true' /><div><span>最近策略摘要</span><h3>从已形成的判断继续</h3></div></header>
        {latest.length ? <ul>{latest.map((record) => {
          const item = strategyCaseRegistry.find((entry) => entry.id === record.caseId)
          if (!item) return null
          return <li key={record.caseId}><button type='button' onClick={() => go(item.page, item.options)}><span>{item.routeLabel}</span><p>{record.summaryText}</p><ArrowRight aria-hidden='true' /></button></li>
        })}</ul> : <p>尚未形成策略摘要。调整控件后，点击“形成策略摘要”才会出现在这里。</p>}
      </div>
    </section>
  )
}
