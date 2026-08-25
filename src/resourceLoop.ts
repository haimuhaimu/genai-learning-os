import { caseIds, type CaseId } from './components/strategy/caseCatalog.ts'
import type { ControlValue, MissionAttempt, MissionMetricSnapshot, MissionSnapshot, MissionStressRecord } from './components/strategy/types'

export const RESOURCE_LOOP_KEY = 'genai-resource-loop-v1'
export const RESOURCE_LOOP_EVENT = 'genai-resource-loop-change'
export type ResourceKind = 'video' | 'paper'
export type TouchedResource = { type: ResourceKind; id: string; touchedAt: string }
export type ResourceLoopRecord = {
  caseId: CaseId; initialJudgment: string; initialUpdatedAt?: string; reviewJudgment: string; reviewUpdatedAt?: string
  resources: TouchedResource[]; updatedAt: string; missionAttempt?: MissionAttempt
}
export type ResourceLoopState = Record<string, ResourceLoopRecord>
export type ResourceLoopStorage = Pick<Storage, 'getItem' | 'setItem'>
export type ResourceLoopChangeDetail = { caseId: CaseId; reason: 'initial' | 'resource' | 'review' | 'mission' | 'reopen' | 'clear' }

const MAX_TEXT_LENGTH = 4000
const MAX_RESOURCES = 100
const validCaseIds = new Set<string>(caseIds)
const sessionRecords = new Map<CaseId, ResourceLoopRecord | null>()
const validId = (value: unknown): value is string => typeof value === 'string' && /^[a-z][a-zA-Z0-9-]{0,49}$/.test(value)
const validDate = (value: unknown): value is string => typeof value === 'string' && !Number.isNaN(Date.parse(value))
const cleanText = (value: unknown) => typeof value === 'string' ? value.trim().slice(0, MAX_TEXT_LENGTH) : ''

function cleanControls(raw: unknown) {
  const result: Record<string, ControlValue> = Object.create(null)
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return result
  for (const [id, value] of Object.entries(raw)) if (validId(id) && ((typeof value === 'number' && Number.isFinite(value)) || typeof value === 'boolean' || (typeof value === 'string' && value.length <= 120))) result[id] = value
  return result
}
function cleanMetrics(raw: unknown): MissionMetricSnapshot[] {
  if (!Array.isArray(raw)) return []
  return raw.slice(0, 12).flatMap((item): MissionMetricSnapshot[] => {
    if (!item || typeof item !== 'object') return []
    const id = Reflect.get(item, 'id'), label = Reflect.get(item, 'label'), display = Reflect.get(item, 'display'), value = Reflect.get(item, 'value')
    return validId(id) && typeof label === 'string' && typeof display === 'string' && typeof value === 'number' && Number.isFinite(value)
      ? [{ id, label: label.slice(0, 80), display: display.slice(0, 80), value }] : []
  })
}
function cleanMissionAttempt(raw: unknown): MissionAttempt | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const snapshotRaw = Reflect.get(raw, 'snapshot')
  const stressRaw = Reflect.get(raw, 'lastStress')
  let snapshot: MissionSnapshot | undefined
  let lastStress: MissionStressRecord | undefined
  if (snapshotRaw && typeof snapshotRaw === 'object' && !Array.isArray(snapshotRaw)) {
    const savedAt = Reflect.get(snapshotRaw, 'savedAt'), metrics = cleanMetrics(Reflect.get(snapshotRaw, 'metrics')), controls = cleanControls(Reflect.get(snapshotRaw, 'controls'))
    if (validDate(savedAt) && metrics.length && Object.keys(controls).length) snapshot = { savedAt, metrics, controls }
  }
  if (stressRaw && typeof stressRaw === 'object' && !Array.isArray(stressRaw)) {
    const presetId = Reflect.get(stressRaw, 'presetId'), passed = Reflect.get(stressRaw, 'passed'), ranAt = Reflect.get(stressRaw, 'ranAt'), metrics = cleanMetrics(Reflect.get(stressRaw, 'metrics'))
    if (validId(presetId) && typeof passed === 'boolean' && validDate(ranAt) && metrics.length) lastStress = { presetId, passed, ranAt, metrics }
  }
  return snapshot || lastStress ? { snapshot, lastStress } : undefined
}

export function sanitizeResourceLoopRecord(raw: unknown): ResourceLoopRecord | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const caseId = Reflect.get(raw, 'caseId') as CaseId
  if (!validCaseIds.has(caseId)) return null
  const initialJudgment = cleanText(Reflect.get(raw, 'initialJudgment')), reviewJudgment = cleanText(Reflect.get(raw, 'reviewJudgment'))
  const byResource = new Map<string, TouchedResource>(), resourcesRaw = Reflect.get(raw, 'resources')
  if (Array.isArray(resourcesRaw)) for (const item of resourcesRaw.slice(0, MAX_RESOURCES * 2)) {
    if (!item || typeof item !== 'object') continue
    const type = Reflect.get(item, 'type'), id = Reflect.get(item, 'id'), touchedAt = Reflect.get(item, 'touchedAt')
    if ((type !== 'video' && type !== 'paper') || !validId(id) || !validDate(touchedAt)) continue
    const key = `${type}:${id}`, previous = byResource.get(key)
    if (!previous || touchedAt > previous.touchedAt) byResource.set(key, { type, id, touchedAt })
  }
  const initialUpdatedAt = Reflect.get(raw, 'initialUpdatedAt'), reviewUpdatedAt = Reflect.get(raw, 'reviewUpdatedAt'), updatedAt = Reflect.get(raw, 'updatedAt')
  return {
    caseId, initialJudgment, initialUpdatedAt: initialJudgment && validDate(initialUpdatedAt) ? initialUpdatedAt : undefined,
    reviewJudgment, reviewUpdatedAt: reviewJudgment && validDate(reviewUpdatedAt) ? reviewUpdatedAt : undefined,
    resources: [...byResource.values()].sort((a, b) => b.touchedAt.localeCompare(a.touchedAt)).slice(0, MAX_RESOURCES),
    updatedAt: validDate(updatedAt) ? updatedAt : new Date(0).toISOString(), missionAttempt: cleanMissionAttempt(Reflect.get(raw, 'missionAttempt')),
  }
}

export function readResourceLoops(storage: Pick<Storage, 'getItem'> = localStorage): ResourceLoopState {
  const state: ResourceLoopState = Object.create(null)
  try {
    const parsed: unknown = JSON.parse(storage.getItem(RESOURCE_LOOP_KEY) ?? '{}')
    const safeRoot = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
    const rawCases = safeRoot ? Reflect.get(safeRoot, 'cases') : null
    if (safeRoot && Reflect.get(safeRoot, 'schemaVersion') === 1 && rawCases && typeof rawCases === 'object' && !Array.isArray(rawCases)) for (const raw of Object.values(rawCases)) {
      const safe = sanitizeResourceLoopRecord(raw); if (safe) state[safe.caseId] = safe
    }
  } catch { /* Fall back to this session. */ }
  for (const [caseId, record] of sessionRecords) if (record) state[caseId] = record; else delete state[caseId]
  return state
}
export function emptyResourceLoop(caseId: CaseId, now = new Date().toISOString()): ResourceLoopRecord { return { caseId, initialJudgment: '', reviewJudgment: '', resources: [], updatedAt: now } }
export const isResourceLoopComplete = (record: ResourceLoopRecord | undefined) => Boolean(record?.initialJudgment && record.reviewJudgment && record.resources.length)
export function mergeTouchedResource(record: ResourceLoopRecord, resource: Omit<TouchedResource, 'touchedAt'>, now: string): ResourceLoopRecord {
  return { ...record, resources: [{ ...resource, touchedAt: now }, ...record.resources.filter((item) => item.type !== resource.type || item.id !== resource.id)], updatedAt: now }
}
function dispatch(caseId: CaseId, reason: ResourceLoopChangeDetail['reason']) { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent<ResourceLoopChangeDetail>(RESOURCE_LOOP_EVENT, { detail: { caseId, reason } })) }
function persist(record: ResourceLoopRecord, reason: ResourceLoopChangeDetail['reason'], storage: ResourceLoopStorage) {
  const current = readResourceLoops(storage); current[record.caseId] = record
  try { storage.setItem(RESOURCE_LOOP_KEY, JSON.stringify({ schemaVersion: 1, cases: current })); sessionRecords.delete(record.caseId) } catch { sessionRecords.set(record.caseId, record) }
  dispatch(record.caseId, reason); return record
}
export function saveInitialJudgment(caseId: CaseId, text: string, storage: ResourceLoopStorage = localStorage, now = new Date().toISOString()) {
  const current = readResourceLoops(storage)[caseId] ?? emptyResourceLoop(caseId, now)
  if (current.initialJudgment) return current
  const initialJudgment = cleanText(text)
  return initialJudgment ? persist({ ...current, initialJudgment, initialUpdatedAt: now, updatedAt: now }, 'initial', storage) : current
}
export function saveReviewJudgment(caseId: CaseId, text: string, storage: ResourceLoopStorage = localStorage, now = new Date().toISOString()) {
  const current = readResourceLoops(storage)[caseId] ?? emptyResourceLoop(caseId, now)
  return persist({ ...current, reviewJudgment: cleanText(text), reviewUpdatedAt: now, updatedAt: now }, 'review', storage)
}
export function touchResource(caseId: CaseId, resource: Omit<TouchedResource, 'touchedAt'>, storage: ResourceLoopStorage = localStorage, now = new Date().toISOString()) {
  return persist(mergeTouchedResource(readResourceLoops(storage)[caseId] ?? emptyResourceLoop(caseId, now), resource, now), 'resource', storage)
}
export function saveMissionSnapshot(caseId: CaseId, snapshot: MissionSnapshot, storage: ResourceLoopStorage = localStorage, now = snapshot.savedAt) {
  const current = readResourceLoops(storage)[caseId] ?? emptyResourceLoop(caseId, now)
  return persist({ ...current, missionAttempt: { ...current.missionAttempt, snapshot }, updatedAt: now }, 'mission', storage)
}
export function saveMissionStress(caseId: CaseId, lastStress: MissionStressRecord, storage: ResourceLoopStorage = localStorage, now = lastStress.ranAt) {
  const current = readResourceLoops(storage)[caseId] ?? emptyResourceLoop(caseId, now)
  return persist({ ...current, missionAttempt: { ...current.missionAttempt, lastStress }, updatedAt: now }, 'mission', storage)
}
export function reopenMissionAttempt(caseId: CaseId, storage: ResourceLoopStorage = localStorage, now = new Date().toISOString()) {
  const current = readResourceLoops(storage)[caseId] ?? emptyResourceLoop(caseId, now)
  return persist({ ...current, initialJudgment: '', initialUpdatedAt: undefined, missionAttempt: undefined, updatedAt: now }, 'reopen', storage)
}
export function clearResourceLoop(caseId: CaseId, storage: ResourceLoopStorage = localStorage) {
  const current = readResourceLoops(storage); delete current[caseId]
  try { storage.setItem(RESOURCE_LOOP_KEY, JSON.stringify({ schemaVersion: 1, cases: current })); sessionRecords.delete(caseId) } catch { sessionRecords.set(caseId, null) }
  dispatch(caseId, 'clear'); return true
}
export const readResourceLoop = (caseId: CaseId, storage: Pick<Storage, 'getItem'> = localStorage) => readResourceLoops(storage)[caseId]
