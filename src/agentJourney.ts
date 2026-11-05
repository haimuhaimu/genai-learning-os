import { decodeJourneyHash, receiptFingerprint, type LearningReceipt, type ReceiptVerifier } from './learningJourney'

export const AGENT_JOURNEY_ID = 'agent-learning'
export const AGENT_JOURNEY_SECTION = 'agent-journey'
export const AGENT_JOURNEY_KEY = 'genai-agent-learning-journey-v1'
export const AGENT_JOURNEY_EVENT = 'genai-agent-learning-journey-change'
export const AGENT_RECORD_MAX_BYTES = 65536
export const AGENT_REQUEST_ID = /^[A-Za-z0-9_-]{16,80}$/
const HANDOFF = 'genai-learning-os/playground-handoff'
const ACTIONS = ['check', 'retry', 'stop', 'restart'] as const
const OBSERVATIONS = ['not-delivered', 'retry-accepted', 'signed', 'stopped', 'restarted'] as const
const OUTCOMES = ['in-progress', 'verified', 'stopped', 'budget-exhausted'] as const
const RECEIPTS = ['unknown', 'not-delivered', 'delivered'] as const
const REFLECTIONS = ['accepted', 'signed', 'stopped'] as const
type AgentAction = typeof ACTIONS[number]
type AgentStep = { action: AgentAction; trial: number; remaining: number; observation: typeof OBSERVATIONS[number] }
type AgentTrial = { number: number; outcome: typeof OUTCOMES[number]; toolCalls: number; receipt: typeof RECEIPTS[number]; backupDispatched: boolean }
export type AgentReflection = typeof REFLECTIONS[number]
export type AgentRunSummary = { complete: boolean; producer: 'browser-session' | 'agent'; steps: AgentStep[]; trials: AgentTrial[] }
export type AgentJourneyState = {
  schemaVersion: 1
  pendingRequest?: string
  practice?: { receipt: LearningReceipt; checksum: string; selfDeclared: true; savedAt: string }
  reflection?: AgentReflection
}
export type AgentImportOptions = { expectedRequest?: string; requireHandoff?: boolean }

const empty = (): AgentJourneyState => ({ schemaVersion: 1 })
const has = <T extends string>(options: readonly T[], value: unknown): value is T => typeof value === 'string' && options.some(option => option === value)
const integer = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
export function agentObject(value: unknown): LearningReceipt {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Agent 记录结构不完整，请重新生成。')
  return value as LearningReceipt
}
export function checkAgentRecordTree(value: unknown, depth = 0, count = { value: 0 }) {
  if (depth > 16 || ++count.value > 4096) throw Error('记录过于复杂，无法安全核对。')
  if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) throw Error('记录含有不安全字段。')
    checkAgentRecordTree(item, depth + 1, count)
  }
}
const object = agentObject
function checkedReceipt(value: unknown) {
  const r = object(value)
  if (r.format !== 'algorithm-playground/learning-run' || r.schemaVersion !== 1 || r.experimentId !== 'agent-tool-loop' || r.engineVersion !== 'agent-tool-loop-v1') throw Error('这条路径只接收 Agent 补给任务 v1 的实验记录。')
  if (!has(['browser-session', 'agent'], r.producer) || !Array.isArray(r.actions) || r.actions.length > 9) throw Error('记录的操作渠道或动作范围不受支持。')
  for (const item of r.actions) {
    const action = object(item)
    if (Object.keys(action).length !== 1 || !has(ACTIONS, action.action)) throw Error('Agent 实验动作或参数不受支持。')
  }
  return { receipt: r, producer: r.producer, actions: r.actions as { action: AgentAction }[] }
}
export function unwrapAgentImport(text: string, journeyId: string, { expectedRequest, requireHandoff }: AgentImportOptions = {}): unknown {
  if (!text.trim() || text.length > AGENT_RECORD_MAX_BYTES || new TextEncoder().encode(text).length > AGENT_RECORD_MAX_BYTES) throw Error('请选择或粘贴不超过 64 KiB 的 Agent 实验记录。')
  let parsed: unknown
  try { parsed = JSON.parse(text) } catch { throw Error('这不是有效的 JSON；已保存的记录没有改变。') }
  checkAgentRecordTree(parsed)
  const value = object(parsed)
  if (value.format === HANDOFF) {
    if (Object.keys(value).some(key => !['format', 'schemaVersion', 'journeyId', 'requestId', 'receipt'].includes(key)) || value.schemaVersion !== 1 || value.journeyId !== journeyId) throw Error('这份返程记录不属于 Agent 学习路径。')
    if (!expectedRequest || !AGENT_REQUEST_ID.test(expectedRequest) || value.requestId !== expectedRequest) throw Error('这不是本轮打开的实验记录。可主动粘贴原始 JSON 手动核对；已保存的记录没有改变。')
    return value.receipt
  }
  if (requireHandoff) throw Error('返程需要与本轮请求匹配的记录；原始 JSON 请用手动核对。')
  return value
}
export function parseAgentImport(text: string, options?: AgentImportOptions): LearningReceipt {
  return checkedReceipt(unwrapAgentImport(text, AGENT_JOURNEY_ID, options)).receipt
}

export function readAgentHandoff(parse: typeof parseAgentImport, expectedRequest?: string) {
  const hash = typeof window === 'undefined' ? '' : window.location.hash
  try {
    const text = decodeJourneyHash(hash)
    if (text !== null) parse(text, { expectedRequest, requireHandoff: true })
    return { hash, text, error: '' }
  } catch (error) {
    return { hash, text: null, error: error instanceof Error ? error.message : '返程记录无法读取。' }
  }
}

export function removeAgentHandoff(hash: string) {
  if (hash.startsWith('#playground=') && window.location.hash === hash) {
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
  }
}

function safeBase(raw: string, site: 'genai-learning-os' | 'algorithm-playground') {
  const url = new URL(raw)
  const official = url.protocol === 'https:' && url.hostname === 'haimuhaimu.github.io' && !url.port && url.pathname === `/${site}/`
  const local = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname) && Number(url.port) >= 1024 && url.pathname === '/'
  if (url.username || url.password || (!official && !local)) throw Error('学习入口地址不在受支持的站点范围内。')
  url.search = ''; url.hash = ''
  return url
}
export function agentLaunchURL(base: string, returnURL: string, requestId: string, destination: { section: string; entry: string; journeyId: string }) {
  if (!AGENT_REQUEST_ID.test(requestId)) throw Error('无法建立本轮学习记录，请重试。')
  const target = safeBase(returnURL, 'genai-learning-os')
  target.search = `?page=routes&section=${destination.section}`
  const url = new URL(destination.entry, safeBase(base, 'algorithm-playground'))
  url.searchParams.set('genaiReturn', target.href)
  url.searchParams.set('genaiRequest', requestId)
  url.searchParams.set('genaiJourney', destination.journeyId)
  return url.href
}
export function startAgentLaunch(state: AgentJourneyState, base: string, returnURL: string, requestId: string) {
  return { state: { ...state, pendingRequest: requestId }, url: agentLaunchURL(base, returnURL, requestId, { section: AGENT_JOURNEY_SECTION, entry: 'agent-mission.html#mission', journeyId: AGENT_JOURNEY_ID }) }
}

export function summarizeAgentRun(value: unknown): AgentRunSummary {
  const { receipt, actions, producer } = checkedReceipt(value)
  const fixture = object(receipt.fixture), result = object(receipt.result), evidence = object(result.evidence)
  if (fixture.id !== 'supply-receipt-v1' || fixture.toolBudget !== 3 || fixture.initialToolStatus !== 'accepted') throw Error('不是同一起点的补给任务。')
  if (!has(['mission', 'done'], result.stage) || result.workflowComplete !== (result.stage === 'done') || result.mastery !== 'not-assessed') throw Error('Agent 实验阶段不受支持。')
  if (!Array.isArray(evidence.trials) || !integer(evidence.trials.length, 1, 2)) throw Error('缺少实验对照结果。')
  const trials: AgentTrial[] = evidence.trials.map((item, index) => {
    const t = object(item)
    if (t.number !== index + 1 || !has(OUTCOMES, t.outcome) || !has(RECEIPTS, t.receipt) || !integer(t.toolCalls, 0, 3) || typeof t.backupDispatched !== 'boolean') throw Error('实验对照结果已损坏。')
    if ((t.outcome === 'verified') !== (t.receipt === 'delivered')) throw Error('确认送达必须有签收证据。')
    return { number: index + 1, outcome: t.outcome, toolCalls: t.toolCalls, receipt: t.receipt, backupDispatched: t.backupDispatched }
  })
  const complete = result.stage === 'done'
  if (complete && (trials.length !== 2 || trials.some(trial => trial.outcome === 'in-progress'))) throw Error('必须结束两轮才能形成完整对照。')
  if (!Array.isArray(receipt.steps) || receipt.steps.length !== actions.length) throw Error('缺少逐步操作证据。')
  const steps: AgentStep[] = receipt.steps.map((item, index) => {
    const s = object(item), action = actions[index].action
    if (s.action !== action || !integer(s.trial, 1, trials.length) || !integer(s.remaining, 0, 3) || !has(OBSERVATIONS, s.observation)) throw Error('逐步操作记录已损坏。')
    return { action, trial: s.trial, remaining: s.remaining, observation: s.observation }
  })
  return { complete, producer, steps, trials }
}

export async function recomputeAgentReceipt(incoming: LearningReceipt, verify: ReceiptVerifier) {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const result = object(await Promise.race([
      Promise.resolve(verify(incoming)),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(Error('核对等待超时，可以重试；原有记录没有改变。')), 12000) }),
    ]))
    if (result.matches !== true || result.authenticatesUser !== false) throw Error('重放未能核对这份记录，尚未保存。')
    return result.receipt
  } finally { if (timer !== undefined) clearTimeout(timer) }
}
export async function verifyAgentRecord(text: string, verify: ReceiptVerifier, options?: AgentImportOptions) {
  const incoming = parseAgentImport(text, options)
  const receipt = checkedReceipt(await recomputeAgentReceipt(incoming, verify)).receipt
  if (receipt.producer !== incoming.producer) throw Error('重放返回了不同操作渠道的记录，尚未保存。')
  return { receipt, summary: summarizeAgentRun(receipt) }
}

export function recordAgentPractice(state: AgentJourneyState, receipt: LearningReceipt, declared: boolean): AgentJourneyState {
  const { complete, producer } = summarizeAgentRun(receipt)
  if (!declared || producer !== 'browser-session' || !complete) throw Error('只有完成两轮的网页记录，且由你确认亲手操作，才能保存。AI 代跑只能作参考。')
  if (JSON.stringify(state.practice?.receipt) === JSON.stringify(receipt)) return state
  const snapshot = structuredClone(receipt)
  return { schemaVersion: 1, ...(state.pendingRequest ? { pendingRequest: state.pendingRequest } : {}), practice: { receipt: snapshot, checksum: receiptFingerprint(snapshot), selfDeclared: true, savedAt: new Date().toISOString() } }
}
export function saveAgentReflection(state: AgentJourneyState, reflection: AgentReflection): AgentJourneyState {
  if (!state.practice || !has(REFLECTIONS, reflection)) throw Error('先保存实操，再根据这次的签收证据复盘。')
  return { ...state, reflection }
}
export function deriveAgentStatus(state: AgentJourneyState) {
  const practiced = Boolean(state.practice?.selfDeclared)
  const reflected = practiced && state.reflection === 'signed'
  return { practiced, reflected, complete: practiced && reflected, mastery: 'not-assessed' as const }
}
export function readAgentJourney(storage?: Pick<Storage, 'getItem'>): AgentJourneyState {
  try {
    const text = (storage ?? localStorage).getItem(AGENT_JOURNEY_KEY)
    if (!text || text.length > AGENT_RECORD_MAX_BYTES + 1024) return empty()
    const raw = object(JSON.parse(text)); checkAgentRecordTree(raw)
    if (raw.schemaVersion !== 1 || (raw.pendingRequest !== undefined && (typeof raw.pendingRequest !== 'string' || !AGENT_REQUEST_ID.test(raw.pendingRequest)))) return empty()
    const state: AgentJourneyState = { schemaVersion: 1, ...(typeof raw.pendingRequest === 'string' ? { pendingRequest: raw.pendingRequest } : {}) }
    if (raw.practice !== undefined) {
      const p = object(raw.practice), receipt = object(p.receipt), summary = summarizeAgentRun(receipt)
      if (p.selfDeclared !== true || typeof p.savedAt !== 'string' || p.checksum !== receiptFingerprint(receipt) || summary.producer !== 'browser-session' || !summary.complete) return empty()
      state.practice = { receipt, selfDeclared: true, checksum: p.checksum, savedAt: p.savedAt }
    }
    if (raw.reflection !== undefined) {
      if (!state.practice || !has(REFLECTIONS, raw.reflection)) return empty()
      state.reflection = raw.reflection
    }
    return state
  } catch { return empty() }
}
export function writeAgentJourney(state: AgentJourneyState, storage?: Pick<Storage, 'setItem'>): boolean {
  try { (storage ?? localStorage).setItem(AGENT_JOURNEY_KEY, JSON.stringify(state)) } catch { return false }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(AGENT_JOURNEY_EVENT))
  return true
}
