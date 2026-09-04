import { caseIds, routeIds, type CaseId } from './components/strategy/caseCatalog.ts'
import type { ControlValue, MissionCompletionEvidence, RouteId } from './components/strategy/types'
import { STRATEGY_EVIDENCE_EVENT, type StrategyEvidenceChangeDetail } from './strategyEvidenceEvent'
export { STRATEGY_EVIDENCE_EVENT, type StrategyEvidenceChangeDetail }

export const STRATEGY_EVIDENCE_KEY = 'genai-strategy-evidence-v2'
export type EvidenceLevel = 0 | 1 | 2 | 3
export type StoredMetric = { id: string; label: string; display: string; value: number }
export type MissionEvidence = { passedStressPresetIds: string[]; lastStressAt?: string }
export type StrategyEvidenceRecord = {
  caseId: CaseId; routeId: RouteId; level: EvidenceLevel; controls: Record<string, ControlValue>
  metrics: StoredMetric[]; summaryText: string; updatedAt: string; missionEvidence?: MissionEvidence
  missionCompletion?: MissionCompletionEvidence
}
export type EvidenceStorage = Pick<Storage, 'getItem' | 'setItem'>
const MAX_RECORDS = 50
const MAX_TEXT_LENGTH = 4000
const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor'])
const validCaseIds = new Set<string>(caseIds), validRouteIds = new Set<string>(routeIds)
const validId = (value: unknown): value is string => typeof value === 'string' && /^[a-z][a-zA-Z0-9-]{0,49}$/.test(value)
const validDate = (value: unknown): value is string => typeof value === 'string' && !Number.isNaN(Date.parse(value))

function safeControls(raw: unknown): Record<string, ControlValue> {
  const result: Record<string, ControlValue> = Object.create(null)
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return result
  for (const [key, value] of Object.entries(raw)) {
    if (DANGEROUS_KEYS.has(key) || !/^[a-z][a-zA-Z0-9-]{0,39}$/.test(key)) continue
    if ((typeof value === 'string' && value.length <= 120) || (typeof value === 'number' && Number.isFinite(value)) || typeof value === 'boolean') result[key] = value
  }
  return result
}
function safeMetrics(raw: unknown): StoredMetric[] {
  if (!Array.isArray(raw)) return []
  return raw.slice(0, 12).flatMap((item): StoredMetric[] => {
    if (!item || typeof item !== 'object') return []
    const value = Number(Reflect.get(item, 'value')), id = Reflect.get(item, 'id'), label = Reflect.get(item, 'label'), display = Reflect.get(item, 'display')
    return Number.isFinite(value) && value >= 0 && validId(id) && typeof label === 'string' && typeof display === 'string' ? [{ id, label: label.slice(0, 80), display: display.slice(0, 80), value }] : []
  })
}
function sameControls(left: Record<string, ControlValue>, right: Record<string, ControlValue>) {
  const keys = Object.keys(left)
  return keys.length === Object.keys(right).length && keys.every((key) => Object.prototype.hasOwnProperty.call(right, key) && Object.is(left[key], right[key]))
}
function safeMissionEvidence(raw: unknown): MissionEvidence | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const ids = Reflect.get(raw, 'passedStressPresetIds'), lastStressAt = Reflect.get(raw, 'lastStressAt')
  const passedStressPresetIds = Array.isArray(ids) ? [...new Set(ids.filter(validId))].slice(0, 20) : []
  return passedStressPresetIds.length || validDate(lastStressAt) ? { passedStressPresetIds, lastStressAt: validDate(lastStressAt) ? lastStressAt : undefined } : undefined
}
function safeMissionCompletion(raw: unknown): MissionCompletionEvidence | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const attemptStartedAt = Reflect.get(raw, 'attemptStartedAt'), formedAt = Reflect.get(raw, 'formedAt'), predictionRaw = Reflect.get(raw, 'prediction')
  const stressRaw = Reflect.get(raw, 'stress')
  if (!validDate(attemptStartedAt) || !validDate(formedAt) || typeof predictionRaw !== 'string' || !predictionRaw.trim() || !stressRaw || typeof stressRaw !== 'object' || Array.isArray(stressRaw)) return undefined
  const finalControls = safeControls(Reflect.get(raw, 'finalControls')), baseControls = safeControls(Reflect.get(stressRaw, 'baseControls'))
  const presetId = Reflect.get(stressRaw, 'presetId'), passed = Reflect.get(stressRaw, 'passed'), ranAt = Reflect.get(stressRaw, 'ranAt')
  if (!Object.keys(finalControls).length || !sameControls(finalControls, baseControls) || !validId(presetId) || typeof passed !== 'boolean' || !validDate(ranAt) || Date.parse(ranAt) < Date.parse(attemptStartedAt) || Date.parse(formedAt) < Date.parse(ranAt)) return undefined
  return {
    attemptStartedAt,
    formedAt,
    prediction: predictionRaw.trim().slice(0, MAX_TEXT_LENGTH),
    finalControls,
    stress: { presetId, passed, baseControls, ranAt },
  }
}
export function sanitizeEvidenceRecord(raw: unknown): StrategyEvidenceRecord | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const caseId = Reflect.get(raw, 'caseId') as CaseId, routeId = Reflect.get(raw, 'routeId') as RouteId, level = Number(Reflect.get(raw, 'level'))
  if (!validCaseIds.has(caseId) || !validRouteIds.has(routeId) || !Number.isInteger(level) || level < 0 || level > 3) return null
  const updatedAt = Reflect.get(raw, 'updatedAt'), summaryText = Reflect.get(raw, 'summaryText')
  return {
    caseId, routeId, level: level as EvidenceLevel, controls: safeControls(Reflect.get(raw, 'controls')), metrics: safeMetrics(Reflect.get(raw, 'metrics')),
    summaryText: typeof summaryText === 'string' ? summaryText.slice(0, 2000) : '', updatedAt: validDate(updatedAt) ? updatedAt : new Date(0).toISOString(),
    missionEvidence: safeMissionEvidence(Reflect.get(raw, 'missionEvidence')),
    missionCompletion: safeMissionCompletion(Reflect.get(raw, 'missionCompletion')),
  }
}
export function readStrategyEvidence(storage: Pick<Storage, 'getItem'> = localStorage): StrategyEvidenceRecord[] {
  try {
    const parsed = JSON.parse(storage.getItem(STRATEGY_EVIDENCE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    const byCase = new Map<CaseId, StrategyEvidenceRecord>()
    for (const item of parsed.slice(0, MAX_RECORDS * 2)) {
      const safe = sanitizeEvidenceRecord(item); if (!safe) continue
      const previous = byCase.get(safe.caseId)
      if (!previous) byCase.set(safe.caseId, safe)
      else byCase.set(safe.caseId, mergeStrategyEvidence([previous], safe)[0])
    }
    return [...byCase.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, MAX_RECORDS)
  } catch { return [] }
}
export function mergeStrategyEvidence(records: StrategyEvidenceRecord[], incoming: StrategyEvidenceRecord): StrategyEvidenceRecord[] {
  const safe = sanitizeEvidenceRecord(incoming)
  if (!safe) return records.slice(0, MAX_RECORDS)
  const previous = records.find((item) => item.caseId === safe.caseId)
  const passedStressPresetIds = [...new Set([...(previous?.missionEvidence?.passedStressPresetIds ?? []), ...(safe.missionEvidence?.passedStressPresetIds ?? [])])]
  const missionEvidence = passedStressPresetIds.length ? { passedStressPresetIds, lastStressAt: safe.missionEvidence?.lastStressAt ?? previous?.missionEvidence?.lastStressAt } : undefined
  const missionCompletion = safe.missionCompletion ?? previous?.missionCompletion
  const summaryText = previous?.missionCompletion && !safe.missionCompletion ? previous.summaryText : safe.summaryText || previous?.summaryText || ''
  const merged = previous ? {
    ...previous, ...safe, level: Math.max(previous.level, safe.level) as EvidenceLevel,
    summaryText,
    controls: Object.keys(safe.controls).length ? safe.controls : previous.controls,
    metrics: safe.metrics.length ? safe.metrics : previous.metrics, missionEvidence, missionCompletion,
  } : { ...safe, missionEvidence, missionCompletion }
  return [merged, ...records.filter((item) => item.caseId !== safe.caseId)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, MAX_RECORDS)
}
export function saveStrategyEvidence(record: StrategyEvidenceRecord, storage: EvidenceStorage = localStorage) {
  try {
    const next = mergeStrategyEvidence(readStrategyEvidence(storage), record)
    storage.setItem(STRATEGY_EVIDENCE_KEY, JSON.stringify(next))
    if (typeof window !== 'undefined') {
      const saved = next.find((item) => item.caseId === record.caseId)
      if (saved) window.dispatchEvent(new CustomEvent<StrategyEvidenceChangeDetail>(STRATEGY_EVIDENCE_EVENT, { detail: { caseId: saved.caseId, level: saved.level, summarySaved: record.level >= 2 && Boolean(record.summaryText) } }))
    }
    return next
  } catch { return [] }
}
export const evidenceLevelLabels: Record<EvidenceLevel, string> = { 0: '未开始', 1: '已实验', 2: '已形成策略', 3: '已评审' }
