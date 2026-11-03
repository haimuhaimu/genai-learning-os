import { evaluateBalanceConcern, type RuleChoice } from './lessonModel.ts'
import type { LessonStep } from '../shared/goldenLessonModel.ts'
import { MOE_NOTEBOOK_KEY } from '../shared/paperLessonProgress.ts'

export { MOE_NOTEBOOK_KEY }
const ENGINE = 'moe-case-v1'
export type MoeControls = { step: LessonStep; guess: number | null; revealed: boolean; concern: number; touched: boolean; rule: RuleChoice | null }
export type MoeLedger = { lambda: number; qualityHitRate: number; dropRate: number; p95Latency: number; costPer1k: number; gate: 'Go' | 'Hold' | 'No-Go' }
export type MoeAttempt = MoeControls & { engineVersion: typeof ENGINE; result: MoeLedger }
export type MoeNotebook = { schemaVersion: 1; lastCompleted?: MoeAttempt; draft?: MoeAttempt }
export type MoeLoad = { kind: 'empty' | 'ready' | 'invalid' | 'unsupported' | 'unavailable'; raw: string | null; notebook: MoeNotebook }
const empty = (): MoeNotebook => ({ schemaVersion: 1 })
function ledger(concern: number): MoeLedger {
  const r = evaluateBalanceConcern(concern)
  return { lambda: r.lambda, qualityHitRate: r.qualityHitRate, dropRate: r.dropRate, p95Latency: r.p95Latency, costPer1k: r.costPer1k, gate: r.gate }
}
export function makeMoeAttempt(value: MoeControls): MoeAttempt {
  const { step, guess, revealed, concern, touched, rule } = value
  if (!Number.isInteger(step) || step < 1 || step > 5 || !(guess === null || Number.isInteger(guess) && guess >= 0 && guess <= 2) || typeof revealed !== 'boolean' || !Number.isInteger(concern) || concern < 0 || concern > 10 || typeof touched !== 'boolean' || ![null, 'even', 'tradeoff'].includes(rule)) throw Error('实验参数无效')
  const result = ledger(concern)
  if (step >= 2 && guess === null || step >= 3 && !revealed || step >= 4 && (!touched || result.gate !== 'Go') || step === 5 && rule === null) throw Error('实验步骤与记录不一致')
  return { step, guess, revealed, concern, touched, rule, engineVersion: ENGINE, result }
}
export const freshMoeAttempt = () => makeMoeAttempt({ step: 1, guess: null, revealed: false, concern: 0, touched: false, rule: null })
export function nextMoeNotebook(previous: MoeNotebook, attempt: MoeAttempt): MoeNotebook {
  return attempt.step === 5 ? { schemaVersion: 1, lastCompleted: attempt } : { schemaVersion: 1, lastCompleted: previous.lastCompleted, draft: attempt }
}
function cleanAttempt(value: unknown): MoeAttempt {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('invalid')
  const v = value as Record<string, unknown>
  if (v.engineVersion !== ENGINE) throw Error('unsupported')
  const a = makeMoeAttempt(v as unknown as MoeControls)
  if (!v.result || typeof v.result !== 'object' || Array.isArray(v.result)) throw Error('invalid')
  const saved = v.result as Record<string, unknown>
  // Validate against the pinned engine, but never substitute computed defaults for a saved result.
  for (const key of Object.keys(a.result) as (keyof MoeLedger)[]) if (saved[key] !== a.result[key]) throw Error('invalid')
  return { ...a, result: { ...a.result } }
}
function parse(raw: string | null): MoeLoad {
  if (raw === null) return { kind: 'empty', raw, notebook: empty() }
  try {
    if (raw.length > 64000) throw Error('invalid')
    const value = JSON.parse(raw)
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('invalid')
    if (value.schemaVersion !== 1) throw Error('unsupported')
    const notebook = empty()
    if (value.lastCompleted !== undefined) {
      notebook.lastCompleted = cleanAttempt(value.lastCompleted)
      if (notebook.lastCompleted.step !== 5) throw Error('invalid')
    }
    if (value.draft !== undefined) {
      notebook.draft = cleanAttempt(value.draft)
      if (notebook.draft.step === 5) throw Error('invalid')
    }
    return { kind: 'ready', raw, notebook }
  } catch (error) { return { kind: error instanceof Error && error.message === 'unsupported' ? 'unsupported' : 'invalid', raw, notebook: empty() } }
}
export function readMoeNotebook(storage?: Pick<Storage, 'getItem'>): MoeLoad {
  try { return parse((storage ?? localStorage).getItem(MOE_NOTEBOOK_KEY)) }
  catch { return { kind: 'unavailable', raw: null, notebook: empty() } }
}
export function writeMoeNotebook(notebook: MoeNotebook, expectedRaw: string | null, storage?: Pick<Storage, 'getItem' | 'setItem'>): { ok: true; raw: string } | { ok: false; reason: 'changed' | 'invalid' | 'unavailable' } {
  try {
    const s = storage ?? localStorage
    const current = readMoeNotebook(s)
    if (!['empty', 'ready'].includes(current.kind)) return { ok: false, reason: current.kind === 'unavailable' ? 'unavailable' : 'invalid' }
    if (current.raw !== expectedRaw) return { ok: false, reason: 'changed' }
    const checked = parse(JSON.stringify(notebook))
    if (checked.kind !== 'ready') return { ok: false, reason: 'invalid' }
    const raw = JSON.stringify(checked.notebook)
    s.setItem(MOE_NOTEBOOK_KEY, raw)
    if (s.getItem(MOE_NOTEBOOK_KEY) !== raw) return { ok: false, reason: 'unavailable' }
    return { ok: true, raw }
  } catch { return { ok: false, reason: 'unavailable' } }
}

// Browser writers share a Web Lock: localStorage's read/compare/write is not atomic by itself.
export async function persistMoeNotebook(notebook: MoeNotebook, expectedRaw: string | null, storage?: Pick<Storage, 'getItem' | 'setItem'>, locks?: Pick<LockManager, 'request'>, stillCurrent = () => true, onSaved = () => {}): Promise<ReturnType<typeof writeMoeNotebook>> {
  try {
    const manager = locks ?? (typeof navigator === 'undefined' ? undefined : navigator.locks)
    if (!manager) return { ok: false, reason: 'unavailable' }
    return await manager.request(MOE_NOTEBOOK_KEY, () => {
      if (!stillCurrent()) return { ok: false, reason: 'changed' }
      const saved = writeMoeNotebook(notebook, expectedRaw, storage)
      if (saved.ok) onSaved()
      return saved
    })
  } catch { return { ok: false, reason: 'unavailable' } }
}
