import { missionCapabilities, type ControlSchema, type ControlValue, type StrategyCaseSpec } from './types'

const REQUIRED_TEXT_FIELDS = ['id', 'routeId', 'routeLabel', 'title', 'question', 'duration', 'background', 'fixedDataTitle', 'feedback'] as const
const ID = /^[a-z][a-z0-9-]*$/

function validControlValue(control: ControlSchema, value: ControlValue | undefined) {
  if (value === undefined) return false
  if (control.type === 'toggle') return typeof value === 'boolean'
  if (control.type === 'range') {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < control.min || value > control.max || !Number.isFinite(control.step) || control.step <= 0) return false
    return Math.abs((value - control.min) / control.step - Math.round((value - control.min) / control.step)) <= 1e-8
  }
  return control.options.some((option) => option.value === value)
}

function fail(caseId: string, path: string, reason: string): never {
  throw new Error(`Strategy Case "${caseId}" ${path}: ${reason}`)
}

export function defineStrategyCase<const TSpec extends StrategyCaseSpec>(input: TSpec): TSpec {
  const spec = input as StrategyCaseSpec
  if (!spec || typeof spec !== 'object') throw new Error('Strategy Case spec must be an object')
  for (const field of REQUIRED_TEXT_FIELDS) if (typeof spec[field] !== 'string' || !spec[field].trim()) throw new Error(`Strategy Case field "${field}" is required`)
  if (!ID.test(spec.id)) throw new Error('Strategy Case id must use lowercase kebab-case')
  if (!Array.isArray(spec.controls) || !spec.controls.length) throw new Error('Strategy Case controls are required')
  if (!spec.defaults || typeof spec.defaults !== 'object') throw new Error('Strategy Case defaults are required')
  if (!Array.isArray(spec.fixedDataRows) || !spec.fixedDataRows.length) throw new Error('Strategy Case fixedDataRows are required')
  if (typeof spec.compute !== 'function') throw new Error('Strategy Case compute() is required')
  if (typeof spec.summarize !== 'function') throw new Error('Strategy Case summarize() is required')
  if (spec.mechanism && (!spec.mechanism.title?.trim() || !spec.mechanism.description?.trim() || typeof spec.mechanism.build !== 'function')) throw new Error('Strategy Case mechanism requires title, description and build()')

  const controls = new Map<string, ControlSchema>()
  for (const control of spec.controls) {
    if (!control.id || !control.label) throw new Error('Every Strategy Case control needs an id and label')
    if (controls.has(control.id)) throw new Error(`Duplicate Strategy Case control id: ${control.id}`)
    controls.set(control.id, control)
    if (!validControlValue(control, spec.defaults[control.id])) throw new Error(`Default for "${control.id}" is invalid for its control schema`)
  }
  for (const key of Object.keys(spec.defaults)) if (!controls.has(key)) throw new Error(`Default "${key}" has no matching control`)

  const mission = spec.mission
  if (!mission) return input
  const textFields = ['id', 'role', 'objective', 'transferQuestion'] as const
  for (const field of textFields) if (!mission[field]?.trim()) fail(spec.id, `mission.${field}`, '必须是非空文本')
  if (!ID.test(mission.id)) fail(spec.id, 'mission.id', '必须使用小写 kebab-case')
  if (mission.gates.length < 2 || mission.gates.length > 3) fail(spec.id, 'mission.gates', '必须包含 2-3 个门槛')
  const evidence = spec.compute(spec.defaults)
  const metricIds = new Set(evidence.metrics.filter((item) => Number.isFinite(item.value)).map((item) => item.id))
  const gateIds = new Set<string>()
  mission.gates.forEach((gate, index) => {
    const path = `mission.gates[${index}]`
    if (!ID.test(gate.id)) fail(spec.id, `${path}.id`, '必须使用小写 kebab-case')
    if (gateIds.has(gate.id)) fail(spec.id, `${path}.id`, '不能重复')
    gateIds.add(gate.id)
    if (!metricIds.has(gate.metricId)) fail(spec.id, `${path}.metricId`, `未知或非有限指标 ${gate.metricId}`)
    if (!controls.has(gate.returnControlId)) fail(spec.id, `${path}.returnControlId`, `未知控件 ${gate.returnControlId}`)
    if (gate.operator !== '>=' && gate.operator !== '<=') fail(spec.id, `${path}.operator`, '只支持 >= 或 <=')
    if (!Number.isFinite(gate.target)) fail(spec.id, `${path}.target`, '必须是有限数')
    if (!gate.label?.trim()) fail(spec.id, `${path}.label`, '必须是非空文本')
  })
  if (!mission.stressPresets.length) fail(spec.id, 'mission.stressPresets', '至少需要一个确定性 preset')
  const presetIds = new Set<string>()
  mission.stressPresets.forEach((preset, index) => {
    const path = `mission.stressPresets[${index}]`
    if (!ID.test(preset.id) || presetIds.has(preset.id)) fail(spec.id, `${path}.id`, '必须唯一且使用小写 kebab-case')
    presetIds.add(preset.id)
    if (!preset.label?.trim() || !preset.description?.trim()) fail(spec.id, path, 'label 与 description 不能为空')
    for (const [id, value] of Object.entries(preset.overrides)) {
      const control = controls.get(id)
      if (!control) fail(spec.id, `${path}.overrides.${id}`, '引用了未知控件')
      if (!validControlValue(control, value)) fail(spec.id, `${path}.overrides.${id}`, '取值不符合控件范围或选项')
    }
  })
  if (!mission.capabilities.length) fail(spec.id, 'mission.capabilities', '至少需要一个能力标签')
  const allowed = new Set<string>(missionCapabilities)
  mission.capabilities.forEach((capability, index) => { if (!allowed.has(capability)) fail(spec.id, `mission.capabilities[${index}]`, `未知能力 ${capability}`) })
  return input
}
