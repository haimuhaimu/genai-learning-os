export type RouteId = 'foundation' | 'ai-decision-math' | 'llm' | 'image' | 'agent' | 'agent-book' | 'distill' | 'self-evolving' | 'world-model'
export type ControlValue = string | number | boolean
export type ControlValues = Record<string, ControlValue>

export type ControlOption = { value: string | number; label: string }
export type ControlSchema = {
  id: string
  label: string
  detail?: string
} & (
  | { type: 'range'; min: number; max: number; step: number; format?: 'decimal' | 'percent' | 'integer' }
  | { type: 'select' | 'choice'; options: ControlOption[] }
  | { type: 'toggle' }
)

export type Metric = { id: string; label: string; value: number; display: string; hint?: string; emphasis?: boolean }
export type CostItem = { label: string; value: string; note?: string }
export type DecisionEvidence = {
  metrics: Metric[]
  costs: CostItem[]
  feedbackSource: string
  feedbackSignals: string[]
  nextTrainingAction: string
  caution?: string
}
export type DecisionSummary = { text: string; nextAction: string }

export const missionCapabilities = ['budget-allocation', 'evidence-retrieval', 'tradeoff-reasoning', 'robustness-testing', 'transfer-explanation'] as const
export type MissionCapability = typeof missionCapabilities[number]
export type MissionGate = {
  id: string
  metricId: string
  operator: '>=' | '<='
  target: number
  label: string
  returnControlId: string
}
export type MissionStressPreset = { id: string; label: string; description: string; overrides: Partial<ControlValues> }
export type MissionSpec = {
  id: string
  role: string
  objective: string
  gates: readonly [MissionGate, MissionGate] | readonly [MissionGate, MissionGate, MissionGate]
  stressPresets: readonly MissionStressPreset[]
  capabilities: readonly MissionCapability[]
  transferQuestion: string
}
export type MissionMetricSnapshot = { id: string; label: string; display: string; value: number }
export type MissionSnapshot = { controls: ControlValues; metrics: MissionMetricSnapshot[]; savedAt: string }
export type MissionStressRecord = { presetId: string; passed: boolean; metrics: MissionMetricSnapshot[]; ranAt: string }
export type MissionAttempt = { snapshot?: MissionSnapshot; lastStress?: MissionStressRecord }

export type MechanismSegment = { id: string; label: string; requested: number; retained: number }
export type TokenBudgetMechanismData = {
  kind: 'token-budget'; ariaLabel: string; summary: string; capacity: number; used: number; overflow: number
  retainedTasks: string[]; droppedTasks: string[]; segments: MechanismSegment[]
}
export type ChunkSimulationItem = {
  id: string; documentTitle: string; rangeLabel: string; preview: string; tokenCount: number; hitLabels: string[]; selected: boolean
}
export type ChunkSimulationMechanismData = {
  kind: 'chunk-simulation'; ariaLabel: string; summary: string; query: string; chunks: ChunkSimulationItem[]; selectedCount: number
}
export type MechanismData = TokenBudgetMechanismData | ChunkSimulationMechanismData
export type MechanismSpec = { title: string; description: string; build: (controls: ControlValues, evidence: DecisionEvidence) => MechanismData }

export type StrategyCaseSpec = {
  id: string
  routeId: Exclude<RouteId, 'foundation'>
  routeLabel: string
  title: string
  question: string
  duration: string
  background: string
  feedback: string
  controls: ControlSchema[]
  defaults: ControlValues
  fixedDataTitle: string
  fixedDataRows: string[]
  mechanism?: MechanismSpec
  mission?: MissionSpec
  compute: (controls: ControlValues) => DecisionEvidence
  summarize: (controls: ControlValues, evidence: DecisionEvidence) => DecisionSummary
}
