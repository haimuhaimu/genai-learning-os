import type { ProgressMap } from './progress'

export const MODEL_JOURNEY_ID = 'model-learning'
export const JOURNEY_KEY = 'genai-model-learning-journey-v1'
export const JOURNEY_EVENT = 'genai-learning-journey-change'
export const PUBLIC_PLAYGROUND_BASE = 'https://haimuhaimu.github.io/algorithm-playground/'
const MAX_BYTES = 65536
type JsonObject = Record<string, unknown>
export type LearningReceipt = JsonObject
export type JourneyReflection = { change: 'points' | 'parameters'; evaluation: 'practice' | 'unseen' }
export type JourneyState = {
  schemaVersion: 1
  active: boolean
  pendingRequest?: string
  practice?: { receipt: LearningReceipt; checksum: string; selfDeclared: true; savedAt: string }
  reflection?: JourneyReflection
}
type StorageReader = Pick<Storage, 'getItem'>
type StorageWriter = Pick<Storage, 'setItem'>
export type LearningRunSummary = {
  complete: boolean; producer: 'agent' | 'browser-session'; trainingBefore: number; trainingAfter: number
  trainingSteps: number; gradientSteps: number; gradientBefore: number; gradientAfter: number; rate: number
  trainCorrect: number | null; trainTotal: number | null; testCorrect: number | null; testTotal: number | null
  stepGuess: unknown; testGuess: unknown; actionCount: number
}

function object(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('记录结构不完整，请重新生成。')
  return value as JsonObject
}
function finite(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw Error('记录中的数值无效。')
  return value
}
function safeTree(value: unknown, depth = 0, count = { value: 0 }) {
  if (depth > 20 || ++count.value > 12000) throw Error('记录过于复杂，无法安全核对。')
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) throw Error('记录含有不安全字段。')
      safeTree(item, depth + 1, count)
    }
  }
}
function checkedReceipt(value: unknown): LearningReceipt {
  const r = object(value)
  if (r.format !== 'algorithm-playground/learning-run' || r.schemaVersion !== 1 || r.experimentId !== 'learning-route' || r.engineVersion !== 'learning-route-v1') throw Error('这条路径目前只接收「AI 怎么从例子里学会」v1 的实操记录。')
  if (!['browser-session', 'agent'].includes(String(r.producer))) throw Error('记录缺少可识别的操作渠道。')
  if (!Array.isArray(r.actions) || r.actions.length > 256) throw Error('操作记录超出支持范围。')
  object(r.result)
  return r
}

export function parseJourneyImport(text: string, expectedRequest?: string): LearningReceipt {
  if (!text.trim() || new TextEncoder().encode(text).length > MAX_BYTES) throw Error('请选择或粘贴不超过 64 KiB 的实验记录。')
  let parsed: unknown
  try { parsed = JSON.parse(text) } catch { throw Error('这不是有效的 JSON 记录；原有学习记录没有改变。') }
  safeTree(parsed)
  const value = object(parsed)
  if (value.format === 'genai-learning-os/playground-handoff') {
    if (Object.keys(value).some(key => !['format', 'schemaVersion', 'journeyId', 'requestId', 'receipt'].includes(key)) || value.schemaVersion !== 1 || value.journeyId !== MODEL_JOURNEY_ID) throw Error('这份返程记录不属于当前学习路径。')
    if (!expectedRequest || value.requestId !== expectedRequest) throw Error('这不是本轮打开的实验记录。原记录已保留；也可主动粘贴原始 JSON 手动核对。')
    return checkedReceipt(value.receipt)
  }
  return checkedReceipt(value)
}

export function decodeJourneyHash(hash: string): string | null {
  if (!hash.startsWith('#playground=')) return null
  const data = hash.slice('#playground='.length)
  if (!data || data.length > 90000 || !/^[A-Za-z0-9_-]+$/.test(data)) throw Error('返程记录无法读取；请回到游乐场重新带回，或手动导入 JSON。')
  try {
    const bytes = Uint8Array.from(atob(data.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
    if (bytes.length > MAX_BYTES) throw Error('too large')
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch { throw Error('返程记录已损坏或过大；原有进度没有改变。') }
}

function safeBase(raw: string, kind: 'playground' | 'genai'): URL {
  const u = new URL(raw)
  const path = kind === 'playground' ? '/algorithm-playground/' : '/genai-learning-os/'
  const official = u.protocol === 'https:' && u.hostname === 'haimuhaimu.github.io' && !u.port && u.pathname === path
  const local = u.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(u.hostname) && Number(u.port) >= 1024 && u.pathname === '/'
  if (u.username || u.password || (!official && !local)) throw Error('学习入口地址不在受支持的站点范围内。')
  u.search = ''; u.hash = ''
  return u
}

export function startJourneyLaunch(state: JourneyState, base: string, returnURL: string, requestId: string) {
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(requestId)) throw Error('无法建立本轮学习记录，请重试。')
  const target = safeBase(returnURL, 'genai')
  target.search = '?page=routes&section=journey'
  const experiment = new URL('learn.html', safeBase(base, 'playground'))
  experiment.searchParams.set('genaiReturn', target.href)
  experiment.searchParams.set('genaiRequest', requestId)
  experiment.searchParams.set('genaiJourney', MODEL_JOURNEY_ID)
  return { state: { ...state, active: true, pendingRequest: requestId }, url: experiment.href }
}

export function summarizeLearningRun(value: unknown): LearningRunSummary {
  const r = checkedReceipt(value), result = object(r.result), e = object(result.evidence)
  const guide = object(e.guide), gradient = object(e.gradient), test = object(e.test)
  const score = (value: unknown, key: string) => value == null ? null : finite(object(value)[key])
  if (!Array.isArray(guide.mistakesBefore) || !Array.isArray(guide.mistakesNow)) throw Error('缺少前后对照证据。')
  const complete = result.workflowComplete === true && e.stage === 'summary' && Array.isArray(e.completed) && e.completed.length === 3 && e.completed.every(v => v === true)
  const trainingSteps = finite(guide.steps), gradientSteps = finite(gradient.steps)
  const gradientBefore = finite(gradient.lossBefore), gradientAfter = finite(gradient.lossAfter), rate = finite(gradient.rate)
  const trainCorrect = score(test.train, 'correct'), trainTotal = score(test.train, 'total'), testCorrect = score(test.test, 'correct'), testTotal = score(test.test, 'total')
  if ([trainingSteps, gradientSteps, gradientBefore, gradientAfter, rate].some(n => n < 0)) throw Error('记录中的训练结果已损坏。')
  if (complete && (trainingSteps !== 120 || gradientSteps !== 1 || test.steps !== 120 || test.frozen !== true || trainTotal !== 6 || testTotal !== 16 || trainCorrect === null || testCorrect === null || !Number.isInteger(trainCorrect) || !Number.isInteger(testCorrect) || trainCorrect < 0 || trainCorrect > 6 || testCorrect < 0 || testCorrect > 16)) throw Error('完成记录缺少完整的新题检验证据。')
  return {
    complete,
    producer: r.producer as 'agent' | 'browser-session', trainingBefore: guide.mistakesBefore.length, trainingAfter: guide.mistakesNow.length,
    trainingSteps, gradientSteps, gradientBefore, gradientAfter, rate,
    trainCorrect, trainTotal, testCorrect, testTotal,
    stepGuess: e.stepGuess, testGuess: test.guess, actionCount: (r.actions as unknown[]).length,
  }
}

export type ReceiptVerifier = (receipt: LearningReceipt) => unknown | Promise<unknown>
export async function verifyPlaygroundRecord(text: string, verify: ReceiptVerifier, expectedRequest?: string) {
  const incoming = parseJourneyImport(text, expectedRequest)
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const result = object(await Promise.race([
      Promise.resolve(verify(incoming)),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(Error('核对等待超时。记录仍在这里，可以联网后重试；原有进度没有改变。')), 12000) }),
    ]))
    if (result.matches !== true || result.authenticatesUser !== false) throw Error('重放未能核对这份记录，尚未保存或推进路径。')
    const receipt = checkedReceipt(result.receipt)
    return { receipt, summary: summarizeLearningRun(receipt) }
  } finally { if (timer !== undefined) clearTimeout(timer) }
}

// An accidental-corruption check, not a signature or identity proof.
export function receiptFingerprint(receipt: unknown): string {
  let value = 2166136261
  for (const byte of new TextEncoder().encode(JSON.stringify(receipt))) value = Math.imul(value ^ byte, 16777619)
  return (value >>> 0).toString(16).padStart(8, '0')
}

export function recordPersonalPractice(state: JourneyState, receipt: LearningReceipt, declared: boolean): JourneyState {
  const summary = summarizeLearningRun(receipt)
  if (!declared || summary.producer !== 'browser-session' || !summary.complete) throw Error('只有完成三站的网页实操，且由你确认亲手操作，才能记入这条路径。AI 记录可看，但不替你通关。')
  if (state.practice && JSON.stringify(state.practice.receipt) === JSON.stringify(receipt)) return state
  return { schemaVersion: 1, active: true, ...(state.pendingRequest ? { pendingRequest: state.pendingRequest } : {}), practice: { receipt, checksum: receiptFingerprint(receipt), selfDeclared: true, savedAt: new Date().toISOString() } }
}

export function saveJourneyReflection(state: JourneyState, answers: JourneyReflection): JourneyState {
  if (!state.practice || !['points', 'parameters'].includes(answers.change) || !['practice', 'unseen'].includes(answers.evaluation)) throw Error('请先保存自己的实操记录，再根据结果复盘。')
  return { ...state, reflection: { ...answers } }
}

export function deriveJourneyStatus(progress: ProgressMap, state: JourneyState) {
  const steps = [Number(progress['gradient-descent'] ?? 0) >= 1, Boolean(state.practice?.selfDeclared && summarizeLearningRun(state.practice.receipt).complete), state.reflection?.change === 'parameters' && state.reflection?.evaluation === 'unseen']
  return { steps, complete: steps.every(Boolean), mastery: 'not-assessed' as const, next: steps.findIndex(v => !v) }
}

const empty = (): JourneyState => ({ schemaVersion: 1, active: false })
export function readJourney(storage?: StorageReader): JourneyState {
  try {
    const text = (storage ?? localStorage).getItem(JOURNEY_KEY)
    if (!text || text.length > 100000) return empty()
    const s = object(JSON.parse(text)); safeTree(s)
    if (s.schemaVersion !== 1 || typeof s.active !== 'boolean') return empty()
    if (s.pendingRequest !== undefined && (typeof s.pendingRequest !== 'string' || !/^[A-Za-z0-9_-]{16,80}$/.test(s.pendingRequest))) return empty()
    if (s.practice) {
      const p = object(s.practice)
      if (p.selfDeclared !== true || typeof p.savedAt !== 'string' || p.checksum !== receiptFingerprint(p.receipt) || summarizeLearningRun(p.receipt).producer !== 'browser-session' || !summarizeLearningRun(p.receipt).complete) return empty()
    }
    if (s.reflection) {
      const r = object(s.reflection)
      if (!s.practice || !['points', 'parameters'].includes(String(r.change)) || !['practice', 'unseen'].includes(String(r.evaluation))) return empty()
    }
    return s as JourneyState
  } catch { return empty() }
}

export function writeJourney(state: JourneyState, storage?: StorageWriter): boolean {
  try { (storage ?? localStorage).setItem(JOURNEY_KEY, JSON.stringify(state)) } catch { return false }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(JOURNEY_EVENT))
  return true
}
