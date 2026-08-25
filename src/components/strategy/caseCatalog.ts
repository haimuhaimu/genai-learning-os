import { agentBookSpec } from './agentBookCase.ts'
import { agentSpec } from './agentCase.ts'
import { bayesRolloutSpec, calibrationSpec } from './decisionMathProbabilityCases.ts'
import { entropyKlSpec, causalDesignSpec } from './decisionMathDistributionExperimentCases.ts'
import { optimizerStabilitySpec, similarityGatingSpec } from './decisionMathRetrievalOptimizationCases.ts'
import { errorPropagationSpec, rewardPolicySpec } from './decisionMathSequentialCases.ts'
import { distillSpec } from './distillCase.ts'
import { evaluatorTrustSpec } from './evaluatorTrustCase.ts'
import { harnessLaunchWorkbenchSpec } from './harnessLaunchWorkbenchCase.ts'
import { imageSpec } from './imageCase.ts'
import { ragSpec } from './ragCase.ts'
import { contextWindowBudgetSpec, ragChunkingSpec } from './mechanismCases.ts'
import { worldModelSpec } from './worldModelCase.ts'
import type { RouteId, StrategyCaseSpec } from './types'

export type CaseVisibility = 'center' | 'hub-only'
export type CaseCatalogItem<TId extends string = string> = {
  id: TId
  routeId: RouteId
  routeLabel: string
  title: string
  question: string
  duration: string
  page: 'foundation-lab' | 'strategy-case'
  options: Record<string, string>
  spec?: StrategyCaseSpec
  frontier?: boolean
  visibility?: CaseVisibility
}

const foundationCase = {
  id: 'foundation-feedback-loop', routeId: 'foundation', routeLabel: '算法基础',
  title: '上线策略如何改变模型学到什么？', question: '流量、触达与复核策略，会留下怎样的训练反馈？',
  duration: '预计 3–5 分钟', page: 'foundation-lab', options: { experiment: 'case-overconfident' }, spec: undefined,
} as const satisfies CaseCatalogItem

function fromSpec<const TSpec extends StrategyCaseSpec>(spec: TSpec, extra: { frontier?: boolean; visibility?: CaseVisibility } = {}) {
  return {
    id: spec.id, routeId: spec.routeId, routeLabel: spec.routeLabel, title: spec.title, question: spec.question,
    duration: spec.duration, page: 'strategy-case' as const, options: { case: spec.id }, spec, ...extra,
  }
}

export const strategyCaseCatalog = [
  foundationCase,
  fromSpec(ragSpec), fromSpec(contextWindowBudgetSpec), fromSpec(ragChunkingSpec), fromSpec(imageSpec), fromSpec(agentSpec), fromSpec(agentBookSpec), fromSpec(harnessLaunchWorkbenchSpec), fromSpec(distillSpec),
  fromSpec(evaluatorTrustSpec, { frontier: true }), fromSpec(worldModelSpec, { frontier: true }),
  fromSpec(calibrationSpec, { visibility: 'hub-only' }), fromSpec(bayesRolloutSpec, { visibility: 'hub-only' }),
  fromSpec(similarityGatingSpec, { visibility: 'hub-only' }), fromSpec(optimizerStabilitySpec, { visibility: 'hub-only' }),
  fromSpec(entropyKlSpec, { visibility: 'hub-only' }), fromSpec(causalDesignSpec, { visibility: 'hub-only' }),
  fromSpec(rewardPolicySpec, { visibility: 'hub-only' }), fromSpec(errorPropagationSpec, { visibility: 'hub-only' }),
] as const

export type CaseId = (typeof strategyCaseCatalog)[number]['id']
export const caseIds: readonly CaseId[] = strategyCaseCatalog.map((item) => item.id)
export const routeIds: readonly RouteId[] = [...new Set(strategyCaseCatalog.map((item) => item.routeId))]
export const caseRouteMap = new Map<CaseId, RouteId>(strategyCaseCatalog.map((item) => [item.id, item.routeId]))
export const flagshipCaseIds = new Set<CaseId>(['foundation-feedback-loop', 'rag-budget', 'image-unit-cost', 'refund-gate', 'new-information', 'distill-retention'])
export const frontierCaseIds = new Set<CaseId>(strategyCaseCatalog.filter((item) => 'frontier' in item && item.frontier).map((item) => item.id))
export const frontierRouteIds = new Set<RouteId>(strategyCaseCatalog.filter((item) => 'frontier' in item && item.frontier).map((item) => item.routeId))
export const decisionMathCaseIds = new Set<CaseId>(strategyCaseCatalog.filter((item) => item.routeId === 'ai-decision-math').map((item) => item.id))
export const centerCaseCatalog = strategyCaseCatalog.filter((item) => !('visibility' in item) || item.visibility !== 'hub-only')
export const decisionMathCaseCatalog = strategyCaseCatalog.filter((item) => decisionMathCaseIds.has(item.id))
