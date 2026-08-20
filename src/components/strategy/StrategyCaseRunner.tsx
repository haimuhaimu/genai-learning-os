import { useState } from 'react'
import { saveStrategyEvidence } from '../../strategyEvidence'
import { getCaseVideoSelection } from '../../resources/videoCatalog'
import { getStrategyCase, strategyCaseRegistry } from './caseRegistry'
import DecisionSummaryPanel from './DecisionSummaryPanel'
import EvidencePanel from './EvidencePanel'
import StrategyCaseShell from './StrategyCaseShell'
import StrategyControlsPanel from './StrategyControlsPanel'
import StrategyVideoPanel from './StrategyVideoPanel'
import type { CaseId } from './caseCatalog'
import type { ControlValue, ControlValues, RouteId } from './types'

type Go = (page: string, options?: Record<string, string>) => void

type Props = { caseId?: string; go: Go }

const routePages: Record<RouteId, string> = {
  foundation: 'foundation',
  'ai-decision-math': 'decision-math',
  llm: 'expert-llm',
  image: 'expert-image',
  agent: 'expert-agent',
  'agent-book': 'agent-book',
  distill: 'distill-course',
  'self-evolving': 'routes',
  'world-model': 'routes',
}

export default function StrategyCaseRunner({ caseId, go }: Props) {
  const spec = getStrategyCase(caseId)
  const [controls, setControls] = useState<ControlValues>(() => ({ ...(spec?.defaults ?? {}) }))

  if (!spec) return <section className='strategy-not-found'><span>策略案例（Case）</span><h1>没有找到这个案例</h1><p>案例 ID 可能已失效，请从策略案例中心重新进入。</p><button type='button' onClick={() => go('strategy-cases')}>返回案例中心</button></section>
  const evidence = spec.compute(controls)
  const summary = spec.summarize(controls, evidence)
  const metrics = evidence.metrics.map(({ id, label, display, value }) => ({ id, label, display, value }))
  const videoSelection = getCaseVideoSelection(spec.id as CaseId)
  const routeCases = strategyCaseRegistry.filter((item) => item.routeId === spec.routeId && item.spec)
  const currentCaseIndex = routeCases.findIndex((item) => item.id === spec.id)
  const nextCase = currentCaseIndex >= 0 ? routeCases[currentCaseIndex + 1] : undefined
  const fallbackRoutePage = routePages[spec.routeId]
  const nextAction = nextCase
    ? { label: `继续同路线：${nextCase.title}`, onClick: () => go(nextCase.page, nextCase.options) }
    : {
        label: fallbackRoutePage === 'routes' ? '返回学习路线总览' : `返回${spec.routeLabel}路线`,
        onClick: () => go(fallbackRoutePage),
      }

  const update = (id: string, value: ControlValue) => {
    const next = { ...controls, [id]: value }
    const nextEvidence = spec.compute(next)
    setControls(next)
    saveStrategyEvidence({
      caseId: spec.id, routeId: spec.routeId, level: 1, controls: next,
      metrics: nextEvidence.metrics.map(({ id: metricId, label, display, value: metricValue }) => ({ id: metricId, label, display, value: metricValue })),
      summaryText: '', updatedAt: new Date().toISOString(),
    })
  }

  const saveSummary = (summaryText: string) => saveStrategyEvidence({
    caseId: spec.id, routeId: spec.routeId, level: 2, controls, metrics, summaryText, updatedAt: new Date().toISOString(),
  })

  return (
    <StrategyCaseShell spec={spec} onExit={() => go(spec.routeId === 'ai-decision-math' ? 'decision-math' : 'strategy-cases')} exitLabel={spec.routeId === 'ai-decision-math' ? '返回数学路线' : undefined}>
      <StrategyControlsPanel schema={spec.controls} values={controls} onChange={update} />
      <EvidencePanel fixedDataTitle={spec.fixedDataTitle} fixedDataRows={spec.fixedDataRows} evidence={evidence} />
      <DecisionSummaryPanel summary={summary} onSave={saveSummary} onBackToCenter={() => go('strategy-cases')} nextAction={nextAction} />
      <StrategyVideoPanel videos={videoSelection.videos} remaining={videoSelection.remaining} onViewAll={() => go('videos')} />
    </StrategyCaseShell>
  )
}
