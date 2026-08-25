import { useCallback, useState } from 'react'
import { saveStrategyEvidence } from '../../strategyEvidence'
import { getCaseVideoSelection } from '../../resources/videoCatalog'
import { getPapersForCase, type PaperResource } from '../../resources/paperCatalog'
import { readResourceLoop, touchResource } from '../../resourceLoop'
import { getStrategyCase, strategyCaseRegistry } from './caseRegistry'
import DecisionSummaryPanel from './DecisionSummaryPanel'
import EvidencePanel from './EvidencePanel'
import StrategyCaseShell from './StrategyCaseShell'
import StrategyControlsPanel from './StrategyControlsPanel'
import StrategyVideoPanel from './StrategyVideoPanel'
import StrategyPaperPanel from './StrategyPaperPanel'
import ResourceLearningLoop from './ResourceLearningLoop'
import StrategyPredictionPanel from './StrategyPredictionPanel'
import MechanismSandboxPanel from './MechanismSandboxPanel'
import MissionBrief from './MissionBrief'
import MissionComparisonPanel from './MissionComparisonPanel'
import MissionStressPanel from './MissionStressPanel'
import MissionDebriefCard from './MissionDebriefCard'
import { deriveMissionPhase } from './missionEngine'
import type { CaseId } from './caseCatalog'
import type { ControlValue, ControlValues, MissionSnapshot, MissionStressRecord, RouteId } from './types'

type Go = (page: string, options?: Record<string, string>) => void
type Props = { caseId?: string; go: Go }
const routePages: Record<RouteId, string> = { foundation: 'foundation', 'ai-decision-math': 'decision-math', llm: 'expert-llm', image: 'expert-image', agent: 'expert-agent', 'agent-book': 'agent-book', distill: 'distill-course', 'self-evolving': 'routes', 'world-model': 'routes' }
const phaseLabels = { draft: '待预测', 'prediction-locked': '预测已锁定', exploring: '策略探索与比较', 'stress-pass': '压力测试通过', 'stress-fail': '压力测试待调整', debrief: '已形成策略与复盘' } as const

export default function StrategyCaseRunner({ caseId, go }: Props) {
  const spec = getStrategyCase(caseId)
  const [controls, setControls] = useState<ControlValues>(() => ({ ...(spec?.defaults ?? {}) }))
  const record = spec ? readResourceLoop(spec.id as CaseId) : undefined
  const [predictionLocked, setPredictionLocked] = useState(Boolean(record?.initialJudgment))
  const [explored, setExplored] = useState(false), [snapshot, setSnapshot] = useState<MissionSnapshot | undefined>(record?.missionAttempt?.snapshot)
  const [stress, setStress] = useState<MissionStressRecord | undefined>(record?.missionAttempt?.lastStress), [formedSummary, setFormedSummary] = useState('')
  const onLockChange = useCallback((locked: boolean) => { setPredictionLocked(locked); if (!locked) { setSnapshot(undefined); setStress(undefined); setFormedSummary('') } }, [])
  if (!spec) return <section className='strategy-not-found'><span>策略案例（Case）</span><h1>没有找到这个案例</h1><p>案例 ID 可能已失效，请从策略案例中心重新进入。</p><button type='button' onClick={() => go('strategy-cases')}>返回案例中心</button></section>
  const evidence = spec.compute(controls), baseline = spec.compute(spec.defaults), summary = spec.summarize(controls, evidence)
  const metrics = evidence.metrics.map(({ id, label, display, value }) => ({ id, label, display, value }))
  const caseKey = spec.id as CaseId, videoSelection = getCaseVideoSelection(caseKey), papers = getPapersForCase(caseKey).slice(0, 3)
  const recordPaperTouch = (paper: PaperResource) => touchResource(caseKey, { type: 'paper', id: paper.id })
  const routeCases = strategyCaseRegistry.filter((item) => item.routeId === spec.routeId && item.spec), currentCaseIndex = routeCases.findIndex((item) => item.id === spec.id), nextCase = currentCaseIndex >= 0 ? routeCases[currentCaseIndex + 1] : undefined
  const fallbackRoutePage = routePages[spec.routeId]
  const nextAction = nextCase ? { label: `继续同路线：${nextCase.title}`, onClick: () => go(nextCase.page, nextCase.options) } : { label: fallbackRoutePage === 'routes' ? '返回学习路线总览' : `返回${spec.routeLabel}路线`, onClick: () => go(fallbackRoutePage) }
  const update = (id: string, value: ControlValue) => {
    const next = { ...controls, [id]: value }, nextEvidence = spec.compute(next)
    setControls(next); setExplored(true)
    saveStrategyEvidence({ caseId: spec.id, routeId: spec.routeId, level: 1, controls: next, metrics: nextEvidence.metrics.map(({ id: metricId, label, display, value: metricValue }) => ({ id: metricId, label, display, value: metricValue })), summaryText: '', updatedAt: new Date().toISOString() })
  }
  const saveSummary = (text: string) => saveStrategyEvidence({ caseId: spec.id, routeId: spec.routeId, level: 2, controls, metrics, summaryText: text, updatedAt: new Date().toISOString() })
  const resources = <ResourceLearningLoop caseId={caseKey} question={spec.question} hideInitialStep><StrategyVideoPanel videos={videoSelection.videos} remaining={videoSelection.remaining} onViewAll={() => go('videos')} onOpen={(video) => touchResource(caseKey, { type: 'video', id: video.id })} /><StrategyPaperPanel papers={papers} onOpen={recordPaperTouch} onOpenLab={(paper) => { recordPaperTouch(paper); go('paper-lab', { paper: paper.id }) }} onViewAll={() => go('papers')} /></ResourceLearningLoop>
  const shared = <><StrategyPredictionPanel caseId={caseKey} question={spec.question} mission={Boolean(spec.mission)} onLockChange={onLockChange} /><StrategyControlsPanel schema={spec.controls} values={controls} onChange={update} />{spec.mechanism ? <MechanismSandboxPanel spec={spec.mechanism} data={spec.mechanism.build(controls, evidence)} /> : null}<EvidencePanel fixedDataTitle={spec.fixedDataTitle} fixedDataRows={spec.fixedDataRows} evidence={evidence} /></>
  const shellProps = { spec, onExit: () => go(spec.routeId === 'ai-decision-math' ? 'decision-math' : 'strategy-cases'), exitLabel: spec.routeId === 'ai-decision-math' ? '返回数学路线' : undefined }
  if (!spec.mission) return <StrategyCaseShell {...shellProps}>{shared}<DecisionSummaryPanel summary={summary} onSave={saveSummary} onBackToCenter={() => go('strategy-cases')} nextAction={nextAction} />{resources}</StrategyCaseShell>
  const phase = deriveMissionPhase({ predictionLocked, explored, snapshot, lastStress: stress, formed: Boolean(formedSummary) })
  return <StrategyCaseShell {...shellProps}>
    <MissionBrief mission={spec.mission} evidence={evidence} />
    <p className='mission-phase' aria-label='当前任务阶段'>当前阶段：<b>{phaseLabels[phase]}</b></p>
    {shared}
    {!predictionLocked ? <p className='mission-evidence-note'>你可以先探索，但锁定预测后才能形成完整任务证据。</p> : null}
    <MissionComparisonPanel caseId={caseKey} mission={spec.mission} controls={controls} baseline={baseline} current={evidence} snapshot={snapshot} onSnapshot={setSnapshot} />
    <MissionStressPanel caseId={caseKey} spec={spec} controls={controls} result={stress} onResult={setStress} />
    <DecisionSummaryPanel summary={summary} onSave={saveSummary} onFormed={setFormedSummary} onBackToCenter={() => go('strategy-cases')} nextAction={nextAction} />
    <MissionDebriefCard title={spec.title} mission={spec.mission} prediction={readResourceLoop(caseKey)?.initialJudgment} controls={controls} baseline={baseline} current={evidence} stress={stress} summary={formedSummary} formed={Boolean(formedSummary)} />
    {resources}
  </StrategyCaseShell>
}
