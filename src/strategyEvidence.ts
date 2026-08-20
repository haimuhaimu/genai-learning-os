import { caseIds, routeIds, type CaseId } from './components/strategy/caseCatalog.ts'
import type { ControlValue, RouteId } from './components/strategy/types'

export const STRATEGY_EVIDENCE_KEY = 'genai-strategy-evidence-v2'
export const STRATEGY_EVIDENCE_EVENT = 'genai-strategy-evidence-change'
const MAX_RECORDS = 50
const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor'])

export type EvidenceLevel = 0 | 1 | 2 | 3
export type StoredMetric = { id: string; label: string; display: string; value: number }
export type StrategyEvidenceRecord = {
  caseId: CaseId
  routeId: RouteId
  level: EvidenceLevel
  controls: Record<string, ControlValue>
  metrics: StoredMetric[]
  summaryText: string
  updatedAt: string
}
export type EvidenceStorage = Pick<Storage, 'getItem' | 'setItem'>

const validCaseIds = new Set<string>(caseIds)
const validRouteIds = new Set<string>(routeIds)

function safeControls(raw: unknown): Record<string, ControlValue> {
  const result: Record<string, ControlValue> = Object.create(null)
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return result
  for (const [key, value] of Object.entries(raw)) {
    if (DANGEROUS_KEYS.has(key) || !/^[a-z][a-zA-Z0-9-]{0,39}$/.test(key)) continue
    if (typeof value === 'string' && value.length <= 120) result[key] = value
    if (typeof value === 'number' && Number.isFinite(value)) result[key] = value
    if (typeof value === 'boolean') result[key] = value
  }
  return result
}

function safeMetrics(raw: unknown): StoredMetric[] {
  if (!Array.isArray(raw)) return []
  return raw.slice(0, 12).flatMap((item): StoredMetric[] => {
    if (!item || typeof item !== 'object') return []
    const value = Number(Reflect.get(item, 'value'))
    const id = Reflect.get(item, 'id')
    const label = Reflect.get(item, 'label')
    const display = Reflect.get(item, 'display')
    if (!Number.isFinite(value) || value < 0 || typeof id !== 'string' || typeof label !== 'string' || typeof display !== 'string') return []
    return [{ id: id.slice(0, 50), label: label.slice(0, 80), display: display.slice(0, 80), value }]
  })
}

export function sanitizeEvidenceRecord(raw: unknown): StrategyEvidenceRecord | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const caseId = Reflect.get(raw, 'caseId') as CaseId
  const routeId = Reflect.get(raw, 'routeId') as RouteId
  const levelRaw = Number(Reflect.get(raw, 'level'))
  if (!validCaseIds.has(caseId) || !validRouteIds.has(routeId) || !Number.isInteger(levelRaw) || levelRaw < 0 || levelRaw > 3) return null
  const updatedAt = Reflect.get(raw, 'updatedAt')
  const summaryText = Reflect.get(raw, 'summaryText')
  return {
    caseId,
    routeId,
    level: levelRaw as EvidenceLevel,
    controls: safeControls(Reflect.get(raw, 'controls')),
    metrics: safeMetrics(Reflect.get(raw, 'metrics')),
    summaryText: typeof summaryText === 'string' ? summaryText.slice(0, 2000) : '',
    updatedAt: typeof updatedAt === 'string' && !Number.isNaN(Date.parse(updatedAt)) ? updatedAt : new Date(0).toISOString(),
  }
}

export function readStrategyEvidence(storage: Pick<Storage, 'getItem'> = localStorage): StrategyEvidenceRecord[] {
  try {
    const parsed = JSON.parse(storage.getItem(STRATEGY_EVIDENCE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    const byCase = new Map<CaseId, StrategyEvidenceRecord>()
    for (const item of parsed.slice(0, MAX_RECORDS * 2)) {
      const safe = sanitizeEvidenceRecord(item)
      if (!safe) continue
      const previous = byCase.get(safe.caseId)
      if (!previous || safe.level > previous.level || (safe.level === previous.level && safe.updatedAt > previous.updatedAt)) byCase.set(safe.caseId, safe)
    }
    return [...byCase.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, MAX_RECORDS)
  } catch {
    return []
  }
}

export function mergeStrategyEvidence(records: StrategyEvidenceRecord[], incoming: StrategyEvidenceRecord): StrategyEvidenceRecord[] {
  const safe = sanitizeEvidenceRecord(incoming)
  if (!safe) return records.slice(0, MAX_RECORDS)
  const previous = records.find((item) => item.caseId === safe.caseId)
  const merged = previous ? {
    ...previous,
    ...safe,
    level: Math.max(previous.level, safe.level) as EvidenceLevel,
    summaryText: safe.summaryText || previous.summaryText,
    controls: Object.keys(safe.controls).length ? safe.controls : previous.controls,
    metrics: safe.metrics.length ? safe.metrics : previous.metrics,
  } : safe
  return [merged, ...records.filter((item) => item.caseId !== safe.caseId)]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, MAX_RECORDS)
}

export function saveStrategyEvidence(record: StrategyEvidenceRecord, storage: EvidenceStorage = localStorage) {
  try {
    const next = mergeStrategyEvidence(readStrategyEvidence(storage), record)
    storage.setItem(STRATEGY_EVIDENCE_KEY, JSON.stringify(next))
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(STRATEGY_EVIDENCE_EVENT))
    return next
  } catch {
    return []
  }
}

export const evidenceLevelLabels: Record<EvidenceLevel, string> = { 0: '未开始', 1: '已实验', 2: '已形成策略', 3: '已评审' }
