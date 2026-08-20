import { ArrowRight, Calculator, CheckCircle2, Circle, Target } from 'lucide-react'
import { useEffect, useState } from 'react'
import { evidenceLevelLabels, readStrategyEvidence, STRATEGY_EVIDENCE_EVENT, type EvidenceLevel } from '../../strategyEvidence'
import { centerCaseCatalog, decisionMathCaseIds } from '../strategy/caseRegistry'

type Go = (page: string, options?: Record<string, string>) => void

export default function StrategyEvidenceSection({ go }: { go: Go }) {
  const [records, setRecords] = useState(() => readStrategyEvidence())
  useEffect(() => {
    const sync = () => setRecords(readStrategyEvidence())
    window.addEventListener(STRATEGY_EVIDENCE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => { window.removeEventListener(STRATEGY_EVIDENCE_EVENT, sync); window.removeEventListener('storage', sync) }
  }, [])
  const latest = records.filter((item) => item.summaryText && !decisionMathCaseIds.has(item.caseId)).slice(0, 6)
  const mathFormed = records.filter((item) => decisionMathCaseIds.has(item.caseId) && item.level >= 2).length
  const mathExperimented = records.filter((item) => decisionMathCaseIds.has(item.caseId) && item.level >= 1).length

  return (
    <section className='strategy-progress-section' aria-labelledby='strategy-progress-title'>
      <header><div><span>策略证据</span><h2 id='strategy-progress-title'>8 个代表案例 + 8 个数学练习</h2></div><button type='button' onClick={() => go('strategy-cases')}>进入策略案例地图<ArrowRight /></button></header>
      <p className='strategy-progress-explainer'>旧进度记录你看过什么；策略证据记录你做过什么决定。</p>
      <div className='strategy-progress-grid'>
        {centerCaseCatalog.map((item) => {
          const record = records.find((entry) => entry.caseId === item.id)
          const level = (record?.level ?? 0) as EvidenceLevel
          return <button type='button' key={item.id} onClick={() => go(item.page, item.options)}><span>{item.routeLabel}</span><b>{item.title}</b><small className={`level-${level}`}>{level ? <CheckCircle2 /> : <Circle />}{evidenceLevelLabels[level]}</small></button>
        })}
        <button type='button' className='strategy-math-progress' onClick={() => go('decision-math')}><span><Calculator />AI 决策数学</span><b>数学路线汇总</b><strong>{mathFormed}<small>/ 8 已形成策略</small></strong><em>{mathExperimented}/8 已实验 · 进入 Hub 查看逐项状态</em></button>
      </div>
      <div className='strategy-recent-summaries'>
        <header><Target aria-hidden='true' /><div><span>最近策略摘要</span><h3>从已形成的判断继续</h3></div></header>
        {latest.length ? <ul>{latest.map((record) => {
          const item = centerCaseCatalog.find((entry) => entry.id === record.caseId)
          if (!item) return null
          return <li key={record.caseId}><button type='button' onClick={() => go(item.page, item.options)}><span>{item.routeLabel}</span><p>{record.summaryText}</p><ArrowRight aria-hidden='true' /></button></li>
        })}</ul> : <p>尚未形成策略摘要。调整控件后，点击“形成策略摘要”才会出现在这里。</p>}
      </div>
    </section>
  )
}
