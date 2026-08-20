import { useCallback, useEffect, useRef, useState } from 'react'
import { markProgress } from '../../../progress'
import { saveStrategyEvidence } from '../../../strategyEvidence'
import { getCaseVideoSelection } from '../../../resources/videoCatalog'
import StrategyVideoPanel from '../../strategy/StrategyVideoPanel'
import { advanceCrossEntropyInsight } from './experimentProgress'
import {
  initialStrategyState,
  readStrategyState,
  writeStrategyState,
  type StrategyCaseId,
  type StrategyExperimentState,
} from './caseStorage'
import ColdStartCase from './strategy/ColdStartCase'
import MonetizationReachCase from './strategy/MonetizationReachCase'
import RiskGovernanceCase from './strategy/RiskGovernanceCase'
import UnifiedInsight from './UnifiedInsight'

type Go = (page: string, options?: Record<string, string>) => void
type Props = { go: Go; initialScene?: string }

const TABS: Array<{ id: StrategyCaseId; title: string }> = [
  { id: 'coldStart', title: '冷启动' },
  { id: 'monetization', title: '作者触达' },
  { id: 'risk', title: '风险治理' },
]
const VALID_CASES = new Set<StrategyCaseId>(TABS.map((tab) => tab.id))

function initialState(initialScene?: string): StrategyExperimentState {
  const base = typeof localStorage === 'undefined' ? initialStrategyState() : readStrategyState(localStorage)
  if (initialScene && VALID_CASES.has(initialScene as StrategyCaseId)) return { ...base, activeTab: initialScene as StrategyCaseId }
  return base
}

export default function OverconfidentCase({ go, initialScene }: Props) {
  const [state, setState] = useState<StrategyExperimentState>(() => initialState(initialScene))
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    if (initialScene && VALID_CASES.has(initialScene as StrategyCaseId)) {
      setState((current) => ({ ...current, activeTab: initialScene as StrategyCaseId }))
    }
  }, [initialScene])

  useEffect(() => {
    const previousTitle = document.title
    document.title = '一次上线策略，如何改变模型学到什么？'
    return () => { document.title = previousTitle }
  }, [])

  useEffect(() => { writeStrategyState(localStorage, state) }, [state])

  const markExplored = useCallback((caseId: StrategyCaseId) => {
    saveStrategyEvidence({ caseId: 'foundation-feedback-loop', routeId: 'foundation', level: 1, controls: { scene: caseId }, metrics: [], summaryText: '', updatedAt: new Date().toISOString() })
    setState((current) => {
      if (current.exploredCases.includes(caseId)) return current
      advanceCrossEntropyInsight(markProgress)
      return { ...current, exploredCases: [...current.exploredCases, caseId] }
    })
  }, [])

  const markFormed = useCallback((caseId: StrategyCaseId, summaryText: string) => {
    saveStrategyEvidence({ caseId: 'foundation-feedback-loop', routeId: 'foundation', level: 2, controls: { scene: caseId }, metrics: [], summaryText, updatedAt: new Date().toISOString() })
  }, [])

  const setActiveTab = (activeTab: StrategyCaseId) => setState((current) => ({ ...current, activeTab }))
  const handleTabKey = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    let nextIndex = index
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % TABS.length
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + TABS.length) % TABS.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = TABS.length - 1
    setActiveTab(TABS[nextIndex].id)
    tabRefs.current[nextIndex]?.focus()
  }
  const exit = () => go('foundation-lab')
  const videoSelection = getCaseVideoSelection('foundation-feedback-loop')

  return (
    <main className='probability-experiment'>
      <header className='overconfident-shell-head'>
        <p className='trust-kicker'>三个上线策略案例</p>
        <h1>一次上线策略，如何改变模型学到什么？</h1>
        <span>先做业务决策，再看它留下了哪些反馈。</span>
      </header>

      <nav className='overconfident-tabs' role='tablist' aria-label='选择策略案例'>
        {TABS.map((tab, index) => (
          <button
            key={tab.id}
            ref={(element) => { tabRefs.current[index] = element }}
            type='button'
            role='tab'
            id={`tab-${tab.id}`}
            aria-controls={`panel-${tab.id}`}
            aria-selected={state.activeTab === tab.id}
            tabIndex={state.activeTab === tab.id ? 0 : -1}
            className={state.activeTab === tab.id ? 'is-active' : ''}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(event) => handleTabKey(event, index)}
          >
            {tab.title}
          </button>
        ))}
      </nav>

      <section className='overconfident-panel' role='tabpanel' id={`panel-${state.activeTab}`} aria-labelledby={`tab-${state.activeTab}`}>
        {state.activeTab === 'coldStart' && (
          <ColdStartCase controls={state.coldStart} onChange={(coldStart) => setState((current) => ({ ...current, coldStart }))} onExplore={() => markExplored('coldStart')} onForm={(summary) => markFormed('coldStart', summary)} onExit={exit} />
        )}
        {state.activeTab === 'monetization' && (
          <MonetizationReachCase controls={state.monetization} onChange={(monetization) => setState((current) => ({ ...current, monetization }))} onExplore={() => markExplored('monetization')} onForm={(summary) => markFormed('monetization', summary)} onExit={exit} />
        )}
        {state.activeTab === 'risk' && (
          <RiskGovernanceCase controls={state.risk} onChange={(risk) => setState((current) => ({ ...current, risk }))} onExplore={() => markExplored('risk')} onForm={(summary) => markFormed('risk', summary)} onExit={exit} />
        )}
      </section>

      <UnifiedInsight />
      <StrategyVideoPanel videos={videoSelection.videos} remaining={videoSelection.remaining} onViewAll={() => go('videos')} />
    </main>
  )
}
