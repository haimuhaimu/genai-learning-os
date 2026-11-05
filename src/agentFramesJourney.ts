import {
  AGENT_RECORD_MAX_BYTES, AGENT_REQUEST_ID, agentLaunchURL, agentObject, checkAgentRecordTree,
  recomputeAgentReceipt, unwrapAgentImport, type AgentImportOptions,
} from './agentJourney'
import { receiptFingerprint, type LearningReceipt, type ReceiptVerifier } from './learningJourney'

export const FRAMES_JOURNEY_ID = 'agent-frames'
export const FRAMES_JOURNEY_SECTION = 'agent-frames-journey'
export const FRAMES_JOURNEY_KEY = 'genai-agent-frames-journey-v1'
export const FRAMES_JOURNEY_EVENT = 'genai-agent-frames-journey-change'
export const FRAMES_REFLECTIONS = ['trust-spoken-clearance', 'treat-as-denial', 'request-clear-frame'] as const
const actions = ['advance', 'start-manual', 'pin'] as const
const phases = ['baseline', 'baseline-done', 'manual', 'manual-empty', 'done'] as const
const has = <T extends string>(values: readonly T[], value: unknown): value is T => typeof value === 'string' && values.some(item => item === value)
const frameIn = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
export type FramesReflection = typeof FRAMES_REFLECTIONS[number]
export type FramesRound = { frameIds: [number, number, number]; signFrame: number | null; conclusion: 'clear-to-unload' | 'insufficient-evidence' }
type FramesSummary = { complete: boolean; producer: 'browser-session' | 'agent'; fixed: FramesRound | null; manual: FramesRound | null }
export type FramesJourneyState = {
  schemaVersion: 1; pendingRequest?: string
  practice?: { receipt: LearningReceipt; checksum: string; selfDeclared: true; savedAt: string }
  reflection?: FramesReflection
}
type CheckedRun = { summary: FramesSummary }
const checkedRuns = new WeakMap<CheckedRun, { source: string; requireHandoff?: boolean; receipt: LearningReceipt }>()
const empty = (): FramesJourneyState => ({ schemaVersion: 1 })

function checkedReceipt(value: unknown) {
  const receipt = agentObject(value)
  if (receipt.format !== 'algorithm-playground/learning-run' || receipt.schemaVersion !== 1 || receipt.experimentId !== FRAMES_JOURNEY_ID || receipt.engineVersion !== 'agent-frames-v1' || receipt.numericFormat !== 'integer-events') throw Error('第三关只接收三帧实验 v1 的记录。')
  if (!has(['browser-session', 'agent'], receipt.producer) || !Array.isArray(receipt.actions) || receipt.actions.length > 18) throw Error('记录的操作渠道或动作范围不受支持。')
  const journal = receipt.actions.map(item => {
    const action = agentObject(item)
    if (Object.keys(action).length !== 1 || !has(actions, action.action)) throw Error('三帧实验动作或参数不受支持。')
    return action.action
  })
  return { receipt, producer: receipt.producer, journal }
}
export function parseFramesImport(text: string, options?: AgentImportOptions): LearningReceipt {
  const { receipt } = checkedReceipt(unwrapAgentImport(text, FRAMES_JOURNEY_ID, options))
  if (options?.requireHandoff && agentObject(receipt.result).stage !== 'done') throw Error('请完成两轮抽帧后再带回记录。')
  return receipt
}
export function startFramesLaunch(state: FramesJourneyState, base: string, returnURL: string, requestId: string) {
  const url = agentLaunchURL(base, returnURL, requestId, { section: FRAMES_JOURNEY_SECTION, entry: 'agent-frames.html#mission', journeyId: FRAMES_JOURNEY_ID })
  return { state: { ...state, pendingRequest: requestId }, url }
}

function checkedRound(value: unknown, middle: number): FramesRound {
  const round = agentObject(value)
  const signFrame = middle === 5 ? 5 : null
  const conclusion = signFrame === null ? 'insufficient-evidence' : 'clear-to-unload'
  if (JSON.stringify(round.frameIds) !== JSON.stringify([0, middle, 8]) || round.signFrame !== signFrame || round.conclusion !== conclusion) throw Error('保留帧和门牌证据不一致。')
  return { frameIds: [0, middle, 8], signFrame, conclusion }
}
export function summarizeFramesRun(value: unknown): FramesSummary {
  const { receipt, producer, journal } = checkedReceipt(value)
  const fixture = agentObject(receipt.fixture), result = agentObject(receipt.result), evidence = agentObject(result.evidence)
  if (fixture.id !== 'station-08-stream-v1' || fixture.station !== '08' || fixture.frameCount !== 9 || fixture.budget !== 3 || JSON.stringify(fixture.fixedFrames) !== '[0,4,8]') throw Error('不是本关固定的 08 号站画面。')
  if (!has(phases, result.stage) || result.workflowComplete !== (result.stage === 'done') || result.mastery !== 'not-assessed') throw Error('三帧实验阶段不受支持。')
  const complete = result.stage === 'done', { frame, manualPick } = evidence
  if (!frameIn(frame, 0, 8) || (manualPick !== null && !frameIn(manualPick, 1, 7))) throw Error('三帧实验的留帧证据不完整。')
  if (!Array.isArray(receipt.steps) || receipt.steps.length !== journal.length || receipt.steps.some((value, index) => {
    const step = agentObject(value)
    return step.action !== journal[index] || !has(phases, step.phase) || !frameIn(step.frame, 0, 8)
  })) throw Error('缺少逐步操作证据。')
  if (complete && (frame !== 8 || !frameIn(manualPick, 1, 7) || !receipt.steps.some(value => {
    const step = agentObject(value)
    return step.action === 'pin' && step.phase === 'manual' && step.frame === manualPick
  }))) throw Error('缺少手动保留帧的证据。')
  return { complete, producer,
    fixed: result.stage === 'baseline' ? null : checkedRound(evidence.fixed, 4),
    manual: complete && typeof manualPick === 'number' ? checkedRound(evidence.manual, manualPick) : null,
  }
}

function sameData(left: unknown, right: unknown): boolean {
  if (!left || typeof left !== 'object') return left === right
  if (!right || typeof right !== 'object' || Array.isArray(left) !== Array.isArray(right)) return false
  const entries = Object.entries(left)
  return entries.length === Object.keys(right).length && entries.every(([key, value]) => Object.prototype.hasOwnProperty.call(right, key) && sameData(value, (right as Record<string, unknown>)[key]))
}
export async function verifyFramesRecord(source: string, verify: ReceiptVerifier, options?: AgentImportOptions): Promise<CheckedRun> {
  const incoming = parseFramesImport(source, options)
  const receipt = structuredClone(agentObject(await recomputeAgentReceipt(incoming, verify)))
  if (!sameData(receipt, parseFramesImport(source, options))) throw Error('重放结果与收到的记录不一致，尚未保存。')
  const checked = { summary: summarizeFramesRun(receipt) }
  checkedRuns.set(checked, { source, requireHandoff: options?.requireHandoff, receipt })
  return checked
}
export function recordFramesPractice(state: FramesJourneyState, candidate: CheckedRun, declared: boolean): FramesJourneyState {
  const run = checkedRuns.get(candidate)
  if (!run) throw Error('请先重新计算并核对这份记录。')
  parseFramesImport(run.source, { expectedRequest: state.pendingRequest, requireHandoff: run.requireHandoff })
  const { complete, producer } = summarizeFramesRun(run.receipt)
  if (!declared || !complete || producer !== 'browser-session') throw Error('只有完成两轮的网页记录，且由你确认亲手操作，才能保存。AI 代跑只作参考。')
  if (sameData(state.practice?.receipt, run.receipt)) return state
  const receipt = structuredClone(run.receipt)
  return { schemaVersion: 1, ...(state.pendingRequest ? { pendingRequest: state.pendingRequest } : {}), practice: { receipt, checksum: receiptFingerprint(receipt), selfDeclared: true, savedAt: new Date().toISOString() } }
}
export function saveFramesReflection(state: FramesJourneyState, reflection: FramesReflection): FramesJourneyState {
  if (!state.practice || !has(FRAMES_REFLECTIONS, reflection)) throw Error('先保存两轮实操，再回答迁移题。')
  return { ...state, reflection }
}
export function deriveFramesStatus(state: FramesJourneyState) {
  const practiced = Boolean(state.practice?.selfDeclared)
  const reflected = practiced && state.reflection === 'request-clear-frame'
  return { practiced, reflected, complete: practiced && reflected, mastery: 'not-assessed' as const }
}
export function readFramesJourney(storage?: Pick<Storage, 'getItem'>): FramesJourneyState {
  try {
    const text = (storage ?? localStorage).getItem(FRAMES_JOURNEY_KEY)
    if (!text || text.length > AGENT_RECORD_MAX_BYTES + 1024) return empty()
    const raw = agentObject(JSON.parse(text)); checkAgentRecordTree(raw)
    if (raw.schemaVersion !== 1 || (raw.pendingRequest !== undefined && (typeof raw.pendingRequest !== 'string' || !AGENT_REQUEST_ID.test(raw.pendingRequest)))) return empty()
    const state: FramesJourneyState = { schemaVersion: 1, ...(typeof raw.pendingRequest === 'string' ? { pendingRequest: raw.pendingRequest } : {}) }
    if (raw.practice !== undefined) {
      const p = agentObject(raw.practice), receipt = agentObject(p.receipt), summary = summarizeFramesRun(receipt)
      if (p.selfDeclared !== true || typeof p.savedAt !== 'string' || p.checksum !== receiptFingerprint(receipt) || summary.producer !== 'browser-session' || !summary.complete) return empty()
      state.practice = { receipt, checksum: p.checksum, selfDeclared: true, savedAt: p.savedAt }
    }
    if (raw.reflection !== undefined) {
      if (!state.practice || !has(FRAMES_REFLECTIONS, raw.reflection)) return empty()
      state.reflection = raw.reflection
    }
    return state
  } catch { return empty() }
}
export function writeFramesJourney(state: FramesJourneyState, storage?: Pick<Storage, 'setItem'>): boolean {
  try { (storage ?? localStorage).setItem(FRAMES_JOURNEY_KEY, JSON.stringify(state)) } catch { return false }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(FRAMES_JOURNEY_EVENT))
  return true
}
