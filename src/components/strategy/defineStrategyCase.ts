import type { ControlSchema, ControlValue, StrategyCaseSpec } from './types'

const REQUIRED_TEXT_FIELDS = ['id', 'routeId', 'routeLabel', 'title', 'question', 'duration', 'background', 'fixedDataTitle', 'feedback'] as const

function assertDefault(control: ControlSchema, value: ControlValue | undefined) {
  if (value === undefined) throw new Error(`Strategy Case control "${control.id}" is missing a default value`)
  if (control.type === 'toggle' && typeof value !== 'boolean') throw new Error(`Default for "${control.id}" must be boolean`)
  if (control.type === 'range') {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < control.min || value > control.max) {
      throw new Error(`Default for "${control.id}" must be within ${control.min}–${control.max}`)
    }
    const steps = (value - control.min) / control.step
    if (!Number.isFinite(control.step) || control.step <= 0 || Math.abs(steps - Math.round(steps)) > 1e-8) {
      throw new Error(`Default for "${control.id}" must align with step ${control.step}`)
    }
  }
  if ((control.type === 'select' || control.type === 'choice') && !control.options.some((option) => option.value === value)) {
    throw new Error(`Default for "${control.id}" must match an available option`)
  }
}

export function defineStrategyCase<const TSpec extends StrategyCaseSpec>(input: TSpec): TSpec {
  const spec = input as StrategyCaseSpec
  if (!spec || typeof spec !== 'object') throw new Error('Strategy Case spec must be an object')
  for (const field of REQUIRED_TEXT_FIELDS) {
    if (typeof spec[field] !== 'string' || !spec[field].trim()) throw new Error(`Strategy Case field "${field}" is required`)
  }
  if (!/^[a-z][a-z0-9-]*$/.test(spec.id)) throw new Error('Strategy Case id must use lowercase kebab-case')
  if (!Array.isArray(spec.controls) || spec.controls.length === 0) throw new Error('Strategy Case controls are required')
  if (!spec.defaults || typeof spec.defaults !== 'object') throw new Error('Strategy Case defaults are required')
  if (!Array.isArray(spec.fixedDataRows) || spec.fixedDataRows.length === 0) throw new Error('Strategy Case fixedDataRows are required')
  if (typeof spec.compute !== 'function') throw new Error('Strategy Case compute() is required')
  if (typeof spec.summarize !== 'function') throw new Error('Strategy Case summarize() is required')

  const controlIds = new Set<string>()
  for (const control of spec.controls) {
    if (!control.id || !control.label) throw new Error('Every Strategy Case control needs an id and label')
    if (controlIds.has(control.id)) throw new Error(`Duplicate Strategy Case control id: ${control.id}`)
    controlIds.add(control.id)
    assertDefault(control, spec.defaults[control.id])
  }
  for (const key of Object.keys(spec.defaults)) {
    if (!controlIds.has(key)) throw new Error(`Default "${key}" has no matching control`)
  }
  return input
}
