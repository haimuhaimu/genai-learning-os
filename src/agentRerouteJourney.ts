import {
  AGENT_RECORD_MAX_BYTES, AGENT_REQUEST_ID, agentLaunchURL, agentObject, checkAgentRecordTree,
  recomputeAgentReceipt, unwrapAgentImport, type AgentImportOptions,
} from './agentJourney'
import { receiptFingerprint, type LearningReceipt, type ReceiptVerifier } from './learningJourney'

export const REROUTE_JOURNEY_ID = 'agent-reroute'
export const REROUTE_JOURNEY_SECTION = 'agent-reroute-journey'
export const REROUTE_JOURNEY_KEY = 'genai-agent-reroute-journey-v1'
export const REROUTE_JOURNEY_EVENT = 'genai-agent-reroute-journey-change'
const actions = ['advance', 'reroute', 'keep-old', 'accept-old', 'verify-new', 'stop'] as const
const phases = ['original', 'partial', 'decision', 'await-old', 'review', 'done'] as const
const events = ['correction-start', 'correction-confirmed', 'reroute-accepted', 'kept-old', 'old-receipt', 'old-receipt-misattributed', 'new-receipt-verified', 'stopped-unverified'] as const
const outcomes = ['in-progress', 'misattributed', 'unverified', 'verified'] as const
const orders = ['SUP-07', 'SUP-08'] as const
type Station = '07' | '08'
type OrderReceipt = { orderId: typeof orders[number]; station: Station }
type RerouteStep = { action: typeof actions[number]; phase: typeof phases[number]; event: typeof events[number] }
export type RerouteReflection = typeof orders[number]
export type RerouteSummary = {
  complete: boolean; producer: 'browser-session' | 'agent'; activeTarget: Station; dispatched08: boolean
  oldReceipt: OrderReceipt | null; newReceipt: OrderReceipt | null; outcome: typeof outcomes[number]; steps: RerouteStep[]
}
export type RerouteJourneyState = {
  schemaVersion: 1; pendingRequest?: string
  practice?: { receipt: LearningReceipt; checksum: string; selfDeclared: true; savedAt: string }
  reflection?: RerouteReflection
}
type CheckedRun = { summary: RerouteSummary }
const checkedRuns = new WeakMap<CheckedRun, { source: string; requireHandoff?: boolean; receipt: LearningReceipt }>()
const has = <T extends string>(values: readonly T[], value: unknown): value is T => typeof value === 'string' && values.some(item => item === value)
const empty = (): RerouteJourneyState => ({ schemaVersion: 1 })

function checkedReceipt(value: unknown) {
  const receipt = agentObject(value)
  if (receipt.format !== 'algorithm-playground/learning-run' || receipt.schemaVersion !== 1 || receipt.experimentId !== REROUTE_JOURNEY_ID || receipt.engineVersion !== 'agent-reroute-v1' || receipt.numericFormat !== 'integer-events') throw Error('第二关只接收 Agent 改派任务 v1 的实验记录。')
  if (!has(['browser-session', 'agent'], receipt.producer) || !Array.isArray(receipt.actions) || receipt.actions.length > 8) throw Error('记录的操作渠道或动作范围不受支持。')
  const journal = receipt.actions.map(item => {
    const action = agentObject(item)
    if (Object.keys(action).length !== 1 || !has(actions, action.action)) throw Error('改派实验动作或参数不受支持。')
    return action.action
  })
  return { receipt, producer: receipt.producer, journal }
}
export function parseRerouteImport(text: string, options?: AgentImportOptions): LearningReceipt {
  return checkedReceipt(unwrapAgentImport(text, REROUTE_JOURNEY_ID, options)).receipt
}
export function startRerouteLaunch(state: RerouteJourneyState, base: string, returnURL: string, requestId: string) {
  const url = agentLaunchURL(base, returnURL, requestId, { section: REROUTE_JOURNEY_SECTION, entry: 'agent-reroute.html#mission', journeyId: REROUTE_JOURNEY_ID })
  return { state: { ...state, pendingRequest: requestId }, url }
}

function orderReceipt(value: unknown, station: Station): OrderReceipt | null {
  if (value === null) return null
  const receipt = agentObject(value), orderId = `SUP-${station}` as const
  if (receipt.station !== station || receipt.orderId !== orderId) throw Error('工单号与签收站点不匹配。')
  return { orderId, station }
}
export function summarizeRerouteRun(value: unknown): RerouteSummary {
  const { receipt, journal, producer } = checkedReceipt(value)
  const fixture = agentObject(receipt.fixture), result = agentObject(receipt.result), e = agentObject(result.evidence)
  if (fixture.id !== 'reroute-07-to-08-v1' || fixture.from !== '07' || fixture.to !== '08') throw Error('不是本关的固定改派任务。')
  if (!has(phases, result.stage) || result.workflowComplete !== (result.stage === 'done') || result.mastery !== 'not-assessed') throw Error('改派实验阶段不受支持。')
  const { activeTarget, dispatched08, outcome } = e
  if (!has(['07', '08'], activeTarget) || typeof dispatched08 !== 'boolean' || !has(outcomes, outcome)) throw Error('改派证据缺失或损坏。')
  const oldReceipt = orderReceipt(e.oldReceipt, '07'), newReceipt = orderReceipt(e.newReceipt, '08')
  const complete = result.stage === 'done'
  if (complete !== (outcome !== 'in-progress') || (complete && (activeTarget !== '08' || !oldReceipt)) || Boolean(newReceipt) !== (outcome === 'verified') || (newReceipt && !dispatched08)) throw Error('改派结论与签收证据不一致。')
  if (!Array.isArray(receipt.steps) || receipt.steps.length !== journal.length) throw Error('缺少逐步操作证据。')
  const steps = receipt.steps.map((item, index) => {
    const step = agentObject(item), action = journal[index]
    if (step.action !== action || !has(phases, step.phase) || !has(events, step.event)) throw Error('逐步操作记录已损坏。')
    return { action, phase: step.phase, event: step.event }
  })
  return { complete, producer, activeTarget, dispatched08, oldReceipt, newReceipt, outcome, steps }
}

export async function verifyRerouteRecord(source: string, verify: ReceiptVerifier, options?: AgentImportOptions): Promise<CheckedRun> {
  const incoming = parseRerouteImport(source, options)
  const replayed = checkedReceipt(await recomputeAgentReceipt(incoming, verify))
  if (replayed.producer !== incoming.producer || JSON.stringify(replayed.journal) !== JSON.stringify(checkedReceipt(incoming).journal)) throw Error('重放返回了不同操作渠道或动作的记录，尚未保存。')
  const receipt = structuredClone(replayed.receipt)
  const checked = { summary: summarizeRerouteRun(receipt) }
  checkedRuns.set(checked, { source, requireHandoff: options?.requireHandoff, receipt })
  return checked
}

export function recordReroutePractice(state: RerouteJourneyState, candidate: CheckedRun, declared: boolean): RerouteJourneyState {
  const run = checkedRuns.get(candidate)
  if (!run) throw Error('请先重新计算并核对这份记录。')
  parseRerouteImport(run.source, { expectedRequest: state.pendingRequest, requireHandoff: run.requireHandoff })
  const { complete, producer } = summarizeRerouteRun(run.receipt)
  if (!declared || !complete || producer !== 'browser-session') throw Error('只有已结束的网页记录，且由你确认亲手操作，才能保存。AI 代跑只作参考。')
  if (JSON.stringify(state.practice?.receipt) === JSON.stringify(run.receipt)) return state
  const receipt = structuredClone(run.receipt)
  return { schemaVersion: 1, ...(state.pendingRequest ? { pendingRequest: state.pendingRequest } : {}), practice: { receipt, checksum: receiptFingerprint(receipt), selfDeclared: true, savedAt: new Date().toISOString() } }
}
export function saveRerouteReflection(state: RerouteJourneyState, reflection: RerouteReflection): RerouteJourneyState {
  if (!state.practice || !has(orders, reflection)) throw Error('先保存实操，再根据最新确认的指令作答。')
  return { ...state, reflection }
}
export function deriveRerouteStatus(state: RerouteJourneyState) {
  const practiced = Boolean(state.practice?.selfDeclared)
  const reflected = practiced && state.reflection === 'SUP-08'
  return { practiced, reflected, complete: practiced && reflected, mastery: 'not-assessed' as const }
}
export function readRerouteJourney(storage?: Pick<Storage, 'getItem'>): RerouteJourneyState {
  try {
    const text = (storage ?? localStorage).getItem(REROUTE_JOURNEY_KEY)
    if (!text || text.length > AGENT_RECORD_MAX_BYTES + 1024) return empty()
    const raw = agentObject(JSON.parse(text)); checkAgentRecordTree(raw)
    if (raw.schemaVersion !== 1 || (raw.pendingRequest !== undefined && (typeof raw.pendingRequest !== 'string' || !AGENT_REQUEST_ID.test(raw.pendingRequest)))) return empty()
    const state: RerouteJourneyState = { schemaVersion: 1, ...(typeof raw.pendingRequest === 'string' ? { pendingRequest: raw.pendingRequest } : {}) }
    if (raw.practice !== undefined) {
      const p = agentObject(raw.practice), receipt = agentObject(p.receipt), summary = summarizeRerouteRun(receipt)
      if (p.selfDeclared !== true || typeof p.savedAt !== 'string' || p.checksum !== receiptFingerprint(receipt) || summary.producer !== 'browser-session' || !summary.complete) return empty()
      state.practice = { receipt, checksum: p.checksum, selfDeclared: true, savedAt: p.savedAt }
    }
    if (raw.reflection !== undefined) {
      if (!state.practice || !has(orders, raw.reflection)) return empty()
      state.reflection = raw.reflection
    }
    return state
  } catch { return empty() }
}
export function writeRerouteJourney(state: RerouteJourneyState, storage?: Pick<Storage, 'setItem'>): boolean {
  try { (storage ?? localStorage).setItem(REROUTE_JOURNEY_KEY, JSON.stringify(state)) } catch { return false }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(REROUTE_JOURNEY_EVENT))
  return true
}
