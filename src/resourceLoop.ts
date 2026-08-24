import { caseIds, type CaseId } from './components/strategy/caseCatalog.ts'

export const RESOURCE_LOOP_KEY = 'genai-resource-loop-v1'
export const RESOURCE_LOOP_EVENT = 'genai-resource-loop-change'

export type ResourceKind = 'video' | 'paper'
export type TouchedResource = { type: ResourceKind; id: string; touchedAt: string }
export type ResourceLoopRecord = {
  caseId: CaseId
  initialJudgment: string
  initialUpdatedAt?: string
  reviewJudgment: string
  reviewUpdatedAt?: string
  resources: TouchedResource[]
  updatedAt: string
}
export type ResourceLoopState = Record<string, ResourceLoopRecord>
export type ResourceLoopStorage = Pick<Storage, 'getItem' | 'setItem'>
export type ResourceLoopChangeDetail = { caseId: CaseId; reason: 'initial' | 'resource' | 'review' | 'clear' }

const MAX_TEXT_LENGTH = 4000
const MAX_RESOURCES = 100
const validCaseIds = new Set<string>(caseIds)
const sessionRecords = new Map<CaseId, ResourceLoopRecord | null>()

function validDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, MAX_TEXT_LENGTH) : ''
}

export function sanitizeResourceLoopRecord(raw: unknown): ResourceLoopRecord | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const caseId = Reflect.get(raw, 'caseId') as CaseId
  if (!validCaseIds.has(caseId)) return null
  const initialJudgment = cleanText(Reflect.get(raw, 'initialJudgment'))
  const reviewJudgment = cleanText(Reflect.get(raw, 'reviewJudgment'))
  const resourcesRaw = Reflect.get(raw, 'resources')
  const byResource = new Map<string, TouchedResource>()
  if (Array.isArray(resourcesRaw)) {
    for (const item of resourcesRaw.slice(0, MAX_RESOURCES * 2)) {
      if (!item || typeof item !== 'object') continue
      const type = Reflect.get(item, 'type')
      const id = Reflect.get(item, 'id')
      const touchedAt = Reflect.get(item, 'touchedAt')
      if ((type !== 'video' && type !== 'paper') || typeof id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || !validDate(touchedAt)) continue
      const key = `${type}:${id}`
      const previous = byResource.get(key)
      if (!previous || touchedAt > previous.touchedAt) byResource.set(key, { type, id, touchedAt })
    }
  }
  const initialUpdatedAt = Reflect.get(raw, 'initialUpdatedAt')
  const reviewUpdatedAt = Reflect.get(raw, 'reviewUpdatedAt')
  const updatedAt = Reflect.get(raw, 'updatedAt')
  return {
    caseId,
    initialJudgment,
    initialUpdatedAt: initialJudgment && validDate(initialUpdatedAt) ? initialUpdatedAt : undefined,
    reviewJudgment,
    reviewUpdatedAt: reviewJudgment && validDate(reviewUpdatedAt) ? reviewUpdatedAt : undefined,
    resources: [...byResource.values()].sort((a, b) => b.touchedAt.localeCompare(a.touchedAt)).slice(0, MAX_RESOURCES),
    updatedAt: validDate(updatedAt) ? updatedAt : new Date(0).toISOString(),
  }
}

export function readResourceLoops(storage: Pick<Storage, 'getItem'> = localStorage): ResourceLoopState {
  const state: ResourceLoopState = Object.create(null)
  try {
    const parsed: unknown = JSON.parse(storage.getItem(RESOURCE_LOOP_KEY) ?? '{}')
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const rawCases = Reflect.get(parsed, 'cases')
      if (Reflect.get(parsed, 'schemaVersion') === 1 && rawCases && typeof rawCases === 'object' && !Array.isArray(rawCases)) {
        for (const raw of Object.values(rawCases)) {
          const safe = sanitizeResourceLoopRecord(raw)
          if (safe) state[safe.caseId] = safe
        }
      }
    }
  } catch {
    // Corrupt or unavailable storage safely falls back to this session.
  }
  for (const [caseId, sessionRecord] of sessionRecords) {
    if (sessionRecord) state[caseId] = sessionRecord
    else delete state[caseId]
  }
  return state
}

export function emptyResourceLoop(caseId: CaseId, now = new Date().toISOString()): ResourceLoopRecord {
  return { caseId, initialJudgment: '', reviewJudgment: '', resources: [], updatedAt: now }
}

export function isResourceLoopComplete(record: ResourceLoopRecord | undefined) {
  return Boolean(record?.initialJudgment && record.reviewJudgment && record.resources.length)
}

export function mergeTouchedResource(record: ResourceLoopRecord, resource: Omit<TouchedResource, 'touchedAt'>, now: string): ResourceLoopRecord {
  const touched = { ...resource, touchedAt: now }
  return {
    ...record,
    resources: [touched, ...record.resources.filter((item) => item.type !== resource.type || item.id !== resource.id)],
    updatedAt: now,
  }
}

function dispatch(caseId: CaseId, reason: ResourceLoopChangeDetail['reason']) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent<ResourceLoopChangeDetail>(RESOURCE_LOOP_EVENT, { detail: { caseId, reason } }))
}

function persist(record: ResourceLoopRecord, reason: ResourceLoopChangeDetail['reason'], storage: ResourceLoopStorage) {
  const current = readResourceLoops(storage)
  current[record.caseId] = record
  try {
    storage.setItem(RESOURCE_LOOP_KEY, JSON.stringify({ schemaVersion: 1, cases: current }))
    sessionRecords.delete(record.caseId)
  } catch {
    sessionRecords.set(record.caseId, record)
  }
  dispatch(record.caseId, reason)
  return record
}

export function saveInitialJudgment(caseId: CaseId, text: string, storage: ResourceLoopStorage = localStorage, now = new Date().toISOString()) {
  const current = readResourceLoops(storage)[caseId] ?? emptyResourceLoop(caseId, now)
  return persist({ ...current, initialJudgment: cleanText(text), initialUpdatedAt: now, updatedAt: now }, 'initial', storage)
}

export function saveReviewJudgment(caseId: CaseId, text: string, storage: ResourceLoopStorage = localStorage, now = new Date().toISOString()) {
  const current = readResourceLoops(storage)[caseId] ?? emptyResourceLoop(caseId, now)
  return persist({ ...current, reviewJudgment: cleanText(text), reviewUpdatedAt: now, updatedAt: now }, 'review', storage)
}

export function touchResource(caseId: CaseId, resource: Omit<TouchedResource, 'touchedAt'>, storage: ResourceLoopStorage = localStorage, now = new Date().toISOString()) {
  const current = readResourceLoops(storage)[caseId] ?? emptyResourceLoop(caseId, now)
  return persist(mergeTouchedResource(current, resource, now), 'resource', storage)
}

export function clearResourceLoop(caseId: CaseId, storage: ResourceLoopStorage = localStorage) {
  const current = readResourceLoops(storage)
  delete current[caseId]
  try {
    storage.setItem(RESOURCE_LOOP_KEY, JSON.stringify({ schemaVersion: 1, cases: current }))
    sessionRecords.delete(caseId)
  } catch {
    sessionRecords.set(caseId, null)
  }
  dispatch(caseId, 'clear')
  return true
}

export function readResourceLoop(caseId: CaseId, storage: Pick<Storage, 'getItem'> = localStorage) {
  return readResourceLoops(storage)[caseId]
}
