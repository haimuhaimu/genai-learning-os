import type { ControlSchema, ControlValue, ControlValues, DecisionEvidence, MissionGate, MissionSnapshot, MissionStressPreset, MissionStressRecord, StrategyCaseSpec } from './types'

export type GateResult = MissionGate & { value?: number; display: string; passed: boolean; reason: string }
export type MissionEvaluation = { passed: boolean; gates: GateResult[] }
export type MissionDelta = { gate: MissionGate; from?: number; to?: number; delta?: number; display: string; meaning: '改善' | '恶化' | '不变' | '无法比较' }
export type StressResult = { presetId: string; controls: ControlValues; evidence: DecisionEvidence; evaluation: MissionEvaluation; failedControlIds: string[] }
export type MissionPhase = 'draft' | 'prediction-locked' | 'exploring' | 'stress-pass' | 'stress-fail' | 'debrief'
export type StressFreshness = { fresh: true } | { fresh: false; reason: 'legacy-unbound' | 'controls-changed' | 'invalid-controls' }
export type MissionCompletionGate = { ready: boolean; missing: Array<'prediction' | 'fresh-stress'>; stressFreshness: StressFreshness }
export type LockedMissionPrediction = { text: string; lockedAt: string }

const metricValue = (evidence: Pick<DecisionEvidence, 'metrics'>, id: string) => evidence.metrics.find((item) => item.id === id)?.value
const metricDisplay = (evidence: Pick<DecisionEvidence, 'metrics'>, id: string) => evidence.metrics.find((item) => item.id === id)?.display
const number = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
const validDate = (value: string) => !Number.isNaN(Date.parse(value))

function isValidControlValue(control: ControlSchema, value: ControlValue | undefined): value is ControlValue {
  if (control.type === 'toggle') return typeof value === 'boolean'
  if (control.type === 'range') return typeof value === 'number' && Number.isFinite(value) && value >= control.min && value <= control.max
  return control.options.some((option) => Object.is(option.value, value))
}

function hasValidSchemaControls(schema: readonly ControlSchema[], controls: ControlValues) {
  return schema.every((control) => isValidControlValue(control, controls[control.id]))
}

export function compareStressToCurrent(schema: readonly ControlSchema[], current: ControlValues, stress?: MissionStressRecord): StressFreshness {
  if (!stress?.baseControls || !stress.effectiveControls) return { fresh: false, reason: 'legacy-unbound' }
  if (!hasValidSchemaControls(schema, current) || !hasValidSchemaControls(schema, stress.baseControls) || !hasValidSchemaControls(schema, stress.effectiveControls)) return { fresh: false, reason: 'invalid-controls' }
  return schema.every((control) => Object.is(current[control.id], stress.baseControls?.[control.id]))
    ? { fresh: true }
    : { fresh: false, reason: 'controls-changed' }
}

export function getMissionCompletionGate(input: {
  prediction?: LockedMissionPrediction
  schema: readonly ControlSchema[]
  currentControls: ControlValues
  stress?: MissionStressRecord
}): MissionCompletionGate {
  const predictionReady = Boolean(input.prediction?.text.trim() && input.prediction?.lockedAt && validDate(input.prediction.lockedAt))
  let stressFreshness = compareStressToCurrent(input.schema, input.currentControls, input.stress)
  if (stressFreshness.fresh && input.prediction && (!input.stress || !validDate(input.stress.ranAt) || Date.parse(input.stress.ranAt) < Date.parse(input.prediction.lockedAt))) stressFreshness = { fresh: false, reason: 'legacy-unbound' }
  const missing: MissionCompletionGate['missing'] = []
  if (!predictionReady) missing.push('prediction')
  if (!stressFreshness.fresh) missing.push('fresh-stress')
  return { ready: missing.length === 0, missing, stressFreshness }
}

export function evaluateMission(gates: readonly MissionGate[], evidence: Pick<DecisionEvidence, 'metrics'>): MissionEvaluation {
  const results = gates.map((gate): GateResult => {
    const value = metricValue(evidence, gate.metricId)
    if (!Number.isFinite(value)) return { ...gate, value: undefined, display: '无法计算', passed: false, reason: `${gate.label}无法计算，缺少有效指标。` }
    const passed = gate.operator === '>=' ? value! >= gate.target : value! <= gate.target
    return { ...gate, value, display: metricDisplay(evidence, gate.metricId) ?? number(value!), passed, reason: `${gate.label}${passed ? '通过' : '未通过'}：当前 ${number(value!)}，目标 ${gate.operator} ${number(gate.target)}。` }
  })
  return { passed: results.every((item) => item.passed), gates: results }
}

export function compareEvidence(reference: Pick<DecisionEvidence, 'metrics'>, candidate: Pick<DecisionEvidence, 'metrics'>, gates: readonly MissionGate[]): MissionDelta[] {
  return gates.map((gate) => {
    const from = metricValue(reference, gate.metricId)
    const to = metricValue(candidate, gate.metricId)
    if (!Number.isFinite(from) || !Number.isFinite(to)) return { gate, from, to, display: '无法比较：缺少有效指标', meaning: '无法比较' }
    const delta = to! - from!
    const direction = gate.operator === '>=' ? delta : -delta
    const meaning = direction > 0 ? '改善' : direction < 0 ? '恶化' : '不变'
    return { gate, from, to, delta, display: `${delta! > 0 ? '+' : ''}${number(delta!)}`, meaning }
  })
}

export function runStressPreset(spec: StrategyCaseSpec, currentControls: ControlValues, preset: MissionStressPreset): StressResult {
  if (!spec.mission || !spec.mission.stressPresets.some((item) => item.id === preset.id)) throw new Error(`Strategy Case "${spec.id}" 未声明压力 preset ${preset.id}`)
  const controls = { ...currentControls, ...preset.overrides } as ControlValues
  const evidence = spec.compute(controls)
  const evaluation = evaluateMission(spec.mission.gates, evidence)
  return { presetId: preset.id, controls, evidence, evaluation, failedControlIds: [...new Set(evaluation.gates.filter((item) => !item.passed).map((item) => item.returnControlId))] }
}

export function deriveMissionPhase(state: { predictionLocked: boolean; explored?: boolean; snapshot?: MissionSnapshot; lastStress?: MissionStressRecord; formed?: boolean; completionGate: MissionCompletionGate }): MissionPhase {
  if (!state.predictionLocked) return 'draft'
  if (state.formed && state.completionGate.ready) return 'debrief'
  if (state.completionGate.stressFreshness.fresh && state.lastStress) return state.lastStress.passed ? 'stress-pass' : 'stress-fail'
  if (state.explored || state.snapshot) return 'exploring'
  return 'prediction-locked'
}

export function buildDebriefText(input: {
  title: string
  prediction?: string
  controls: ControlValues
  summary: string
  deltas: MissionDelta[]
  stress?: { label: string; evaluation: MissionEvaluation }
  transferQuestion: string
}) {
  const controls = Object.entries(input.controls).map(([key, value]) => `${key}=${String(value)}`).join('，')
  const deltas = input.deltas.map((item) => `${item.gate.label}：${item.display}（${item.meaning}）`).join('；') || '无可比较指标'
  const stress = input.stress ? `${input.stress.label}：${input.stress.evaluation.passed ? '通过' : '未通过'}。${input.stress.evaluation.gates.map((gate) => gate.reason).join('')}` : '未执行'
  const conclusion = input.stress ? (input.stress.evaluation.passed ? 'Go，可以迁移并继续验证' : 'No-Go / 待调整') : '证据不足'
  return [`任务复盘：${input.title}`, `锁定预测：${input.prediction?.trim() || '未记录'}`, `最终策略：${controls || '未记录'}`, `策略摘要：${input.summary || '未形成'}`, `相对默认基线：${deltas}`, `最近压力测试：${stress}`, `复盘结论：${conclusion}`, `迁移问题：${input.transferQuestion}`].join('\n')
}
