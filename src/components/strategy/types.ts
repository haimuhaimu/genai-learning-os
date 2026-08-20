export type RouteId = 'foundation' | 'llm' | 'image' | 'agent' | 'agent-book' | 'distill' | 'self-evolving' | 'world-model'
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

export type Metric = {
  id: string
  label: string
  value: number
  display: string
  hint?: string
  emphasis?: boolean
}

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
  compute: (controls: ControlValues) => DecisionEvidence
  summarize: (controls: ControlValues, evidence: DecisionEvidence) => DecisionSummary
}
