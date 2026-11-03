import type { ProgressMap } from './progress'
import { receiptFingerprint, type LearningReceipt, type ReceiptVerifier } from './learningJourney'

export const BAYES_JOURNEY_ID = 'bayes-learning'
export const BAYES_JOURNEY_KEY = 'genai-bayes-learning-journey-v1'
export const BAYES_JOURNEY_EVENT = 'genai-bayes-learning-journey-change'
export type BayesReflection = { update: 'evidence' | 'planet'; certainty: 'uncertain' | 'zero' }
export type BayesJourneyState = {
  schemaVersion: 1; active: boolean; pendingRequest?: string
  practice?: { receipt: LearningReceipt; checksum: string; selfDeclared: true; savedAt: string }
  reflection?: BayesReflection
}
export type BayesEvidenceRow = { id: string; successes: number; failures: number; mean: number | null; interval: [number, number] | null }
export type BayesRunSummary = {
  complete: boolean; producer: 'agent' | 'browser-session'; baseline: BayesEvidenceRow[]
  after: BayesEvidenceRow[] | null; transfer: BayesEvidenceRow[] | null; guess: string | null
  changeGuess: string | null; attempts: string[]; firstAttemptCorrect: boolean | null; actionCount: number
}
type JsonObject = Record<string, unknown>
type StorageReader = Pick<Storage, 'getItem'>
type StorageWriter = Pick<Storage, 'setItem'>
const REQUEST = /^[A-Za-z0-9_-]{16,80}$/
const guesses = ['little', 'many', 'same']
const answers = ['never', 'evidence', 'guarantee']
const phases = ['predict', 'compare', 'updated', 'done']
const empty = (): BayesJourneyState => ({ schemaVersion: 1, active: false })

function object(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('贝叶斯记录结构不完整，请重新生成。')
  return value as JsonObject
}
function safeTree(value: unknown, depth = 0, count = { value: 0 }) {
  if (depth > 20 || ++count.value > 12000) throw Error('记录过于复杂，无法安全核对。')
  if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) throw Error('记录含有不安全字段。')
    safeTree(item, depth + 1, count)
  }
}
function checkedReceipt(value: unknown): LearningReceipt {
  const r = object(value)
  if (r.format !== 'algorithm-playground/learning-run' || r.schemaVersion !== 1 || r.experimentId !== 'bayes-update' || r.engineVersion !== 'bayes-update-v1') throw Error('这条路径只接收「贝叶斯更新小课」v1 的实验记录。')
  if (!['browser-session', 'agent'].includes(String(r.producer)) || !Array.isArray(r.actions) || r.actions.length > 256) throw Error('记录的操作渠道或动作范围不受支持。')
  object(r.result)
  return r
}

export function parseBayesImport(text: string, expectedRequest?: string): LearningReceipt {
  if (!text.trim() || new TextEncoder().encode(text).length > 65536) throw Error('请选择或粘贴不超过 64 KiB 的贝叶斯实验记录。')
  let parsed: unknown
  try { parsed = JSON.parse(text) } catch { throw Error('这不是有效的 JSON 记录；原有学习记录没有改变。') }
  safeTree(parsed)
  const value = object(parsed)
  if (value.format === 'genai-learning-os/playground-handoff') {
    if (Object.keys(value).some(key => !['format', 'schemaVersion', 'journeyId', 'requestId', 'receipt'].includes(key)) || value.schemaVersion !== 1 || value.journeyId !== BAYES_JOURNEY_ID) throw Error('这份返程记录不属于贝叶斯学习路径。')
    if (!expectedRequest || value.requestId !== expectedRequest) throw Error('这不是本轮打开的实验记录。原记录已保留；也可主动粘贴原始 JSON 手动核对。')
    return checkedReceipt(value.receipt)
  }
  return checkedReceipt(value)
}

function safeBase(raw: string, kind: 'playground' | 'genai'): URL {
  const u = new URL(raw)
  const path = kind === 'playground' ? '/algorithm-playground/' : '/genai-learning-os/'
  const official = u.protocol === 'https:' && u.hostname === 'haimuhaimu.github.io' && !u.port && u.pathname === path
  const local = u.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(u.hostname) && Number(u.port) >= 1024 && u.pathname === '/'
  if (u.username || u.password || (!official && !local)) throw Error('学习入口地址不在受支持的站点范围内。')
  u.search = ''; u.hash = ''; return u
}
export function startBayesLaunch(state: BayesJourneyState, base: string, returnURL: string, requestId: string) {
  if (!REQUEST.test(requestId)) throw Error('无法建立本轮学习记录，请重试。')
  const target = safeBase(returnURL, 'genai'); target.search = '?page=routes&section=bayes-journey'
  const experiment = new URL('mining.html', safeBase(base, 'playground'))
  experiment.searchParams.set('genaiReturn', target.href)
  experiment.searchParams.set('genaiRequest', requestId)
  experiment.searchParams.set('genaiJourney', BAYES_JOURNEY_ID)
  experiment.hash = 'bayes-lesson'
  return { state: { ...state, active: true, pendingRequest: requestId }, url: experiment.href }
}

function probability(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) throw Error('记录中的概率或区间无效。')
  return value
}
function rows(value: unknown, ids: string[]): BayesEvidenceRow[] {
  if (!Array.isArray(value) || value.length !== ids.length) throw Error('缺少完整的前后对照证据。')
  return value.map((item, index) => {
    const r = object(item)
    if (r.id !== ids[index] || !Number.isInteger(r.successes) || !Number.isInteger(r.failures) || Number(r.successes) < 0 || Number(r.failures) < 0 || Number(r.successes) + Number(r.failures) > 200) throw Error('实验观察计数已损坏。')
    let mean: number | null = null, interval: [number, number] | null = null
    if (r.belief !== null) {
      const b = object(r.belief)
      mean = probability(b.mean)
      if (!Array.isArray(b.interval) || b.interval.length !== 2) throw Error('缺少完整的不确定性区间。')
      interval = [probability(b.interval[0]), probability(b.interval[1])]
      if (interval[0] > interval[1]) throw Error('记录中的区间顺序无效。')
    }
    return { id: String(r.id), successes: Number(r.successes), failures: Number(r.failures), mean, interval }
  })
}
function hasCounts(items: BayesEvidenceRow[], counts: number[][]) {
  return items.every((r, i) => r.successes === counts[i][0] && r.failures === counts[i][1] && r.mean !== null && r.interval !== null)
}
export function summarizeBayesRun(value: unknown): BayesRunSummary {
  const receipt = checkedReceipt(value), result = object(receipt.result), e = object(result.evidence)
  if (!phases.includes(String(e.phase)) || result.stage !== e.phase || result.mastery !== 'not-assessed') throw Error('贝叶斯实验阶段不受支持。')
  if ((e.guess !== null && !guesses.includes(String(e.guess))) || (e.changeGuess !== null && !guesses.includes(String(e.changeGuess))) || !Array.isArray(e.attempts) || e.attempts.length > 256 || e.attempts.some(value => !answers.includes(String(value)))) throw Error('实验中的预测或解释已损坏。')
  const baseline = rows(e.baseline, ['little', 'many'])
  const after = e.after === null ? null : rows(e.after, ['little', 'many'])
  const transfer = e.transfer === null ? null : rows(e.transfer, ['one', 'ten'])
  const complete = result.workflowComplete === true && result.stage === 'done'
  const ending = e.ending === null ? null : object(e.ending)
  if (complete && (!hasCounts(baseline, [[3, 2], [18, 12]]) || !after || !hasCounts(after, [[3, 3], [18, 13]]) || !transfer || !hasCounts(transfer, [[0, 1], [0, 10]]) || e.guess === null || e.changeGuess === null || !ending || !e.attempts.length || e.attempts[e.attempts.length - 1] !== 'evidence' || ending.attemptsCount !== e.attempts.length || ending.firstAttemptCorrect !== (e.attempts[0] === 'evidence'))) throw Error('完成记录缺少真实更新与迁移判断证据。')
  return { complete, producer: receipt.producer as BayesRunSummary['producer'], baseline, after, transfer, guess: e.guess as string | null, changeGuess: e.changeGuess as string | null, attempts: [...e.attempts] as string[], firstAttemptCorrect: e.attempts.length ? e.attempts[0] === 'evidence' : null, actionCount: (receipt.actions as unknown[]).length }
}

export async function verifyBayesRecord(text: string, verify: ReceiptVerifier, expectedRequest?: string) {
  const incoming = parseBayesImport(text, expectedRequest)
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const result = object(await Promise.race([Promise.resolve(verify(incoming)), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(Error('核对等待超时。记录仍在这里，可以联网后重试；原有进度没有改变。')), 12000) })]))
    if (result.matches !== true || result.authenticatesUser !== false) throw Error('重放未能核对这份记录，尚未保存或推进路径。')
    const receipt = checkedReceipt(result.receipt)
    return { receipt, summary: summarizeBayesRun(receipt) }
  } finally { if (timer !== undefined) clearTimeout(timer) }
}

export function recordBayesPractice(state: BayesJourneyState, receipt: LearningReceipt, declared: boolean): BayesJourneyState {
  const summary = summarizeBayesRun(receipt)
  if (!declared || summary.producer !== 'browser-session' || !summary.complete) throw Error('只有完成小课的网页实操，且由你确认亲手操作，才能记入这条路径。AI 记录可看，但不替你通关。')
  if (state.practice && JSON.stringify(state.practice.receipt) === JSON.stringify(receipt)) return state
  const snapshot = structuredClone(receipt)
  return { schemaVersion: 1, active: true, ...(state.pendingRequest ? { pendingRequest: state.pendingRequest } : {}), practice: { receipt: snapshot, checksum: receiptFingerprint(snapshot), selfDeclared: true, savedAt: new Date().toISOString() } }
}
function reflection(value: unknown): BayesReflection {
  const r = object(value)
  if (!['evidence', 'planet'].includes(String(r.update)) || !['uncertain', 'zero'].includes(String(r.certainty))) throw Error('请选择两次判断，再核对理解。')
  return { update: r.update as BayesReflection['update'], certainty: r.certainty as BayesReflection['certainty'] }
}
export function saveBayesReflection(state: BayesJourneyState, value: BayesReflection): BayesJourneyState {
  if (!state.practice || !summarizeBayesRun(state.practice.receipt).complete) throw Error('请先保存自己的实操记录，再根据结果复盘。')
  return { ...state, reflection: reflection(value) }
}
export function deriveBayesStatus(progress: ProgressMap, state: BayesJourneyState) {
  let practiced = false
  try { practiced = Boolean(state.practice?.selfDeclared && summarizeBayesRun(state.practice.receipt).complete) } catch { /* Corrupt evidence cannot count as progress. */ }
  const steps = [Number(progress.probability ?? 0) >= 1, practiced, practiced && state.reflection?.update === 'evidence' && state.reflection?.certainty === 'uncertain']
  return { steps, complete: steps.every(Boolean), mastery: 'not-assessed' as const, next: steps.findIndex(value => !value) }
}
export function readBayesJourney(storage?: StorageReader): BayesJourneyState {
  try {
    const text = (storage ?? localStorage).getItem(BAYES_JOURNEY_KEY)
    if (!text || text.length > 100000) return empty()
    const raw = object(JSON.parse(text)); safeTree(raw)
    if (raw.schemaVersion !== 1 || typeof raw.active !== 'boolean') return empty()
    if (raw.pendingRequest !== undefined && (typeof raw.pendingRequest !== 'string' || !REQUEST.test(raw.pendingRequest))) return empty()
    const state: BayesJourneyState = { schemaVersion: 1, active: raw.active, ...(raw.pendingRequest ? { pendingRequest: String(raw.pendingRequest) } : {}) }
    if (raw.practice) {
      const p = object(raw.practice), receipt = checkedReceipt(p.receipt), summary = summarizeBayesRun(receipt)
      if (p.selfDeclared !== true || typeof p.savedAt !== 'string' || p.checksum !== receiptFingerprint(receipt) || summary.producer !== 'browser-session' || !summary.complete) return empty()
      state.practice = { receipt, selfDeclared: true, savedAt: p.savedAt, checksum: String(p.checksum) }
    }
    if (raw.reflection) { if (!state.practice) return empty(); state.reflection = reflection(raw.reflection) }
    return state
  } catch { return empty() }
}
export function writeBayesJourney(state: BayesJourneyState, storage?: StorageWriter): boolean {
  try { (storage ?? localStorage).setItem(BAYES_JOURNEY_KEY, JSON.stringify(state)) } catch { return false }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(BAYES_JOURNEY_EVENT))
  return true
}
