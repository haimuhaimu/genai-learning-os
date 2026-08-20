import { DEFAULT_COLD_START, DEFAULT_REACH, DEFAULT_RISK, type ColdStartControls, type ReachControls, type RiskControls } from './strategy/strategyMath.ts'

export const LEGACY_CASE_STATE_KEY = 'case:overconfident:v1:state'
export const LEGACY_EXPERIMENT_STATE_KEY = 'probability:trust:v1:state'
export const EXPERIMENT_STATE_KEY = 'probability:strategy:v3:state'

export type StrategyCaseId = 'coldStart' | 'monetization' | 'risk'

export type StrategyExperimentState = {
  schemaVersion: 3
  activeTab: StrategyCaseId
  exploredCases: StrategyCaseId[]
  coldStart: ColdStartControls
  monetization: ReachControls
  risk: RiskControls
}

export type StorageReader = Pick<Storage, 'getItem'>
export type StorageWriter = Pick<Storage, 'setItem'>

const CASE_IDS: StrategyCaseId[] = ['coldStart', 'monetization', 'risk']
const OLD_SCENE_MAP: Record<string, StrategyCaseId> = {
  weather: 'coldStart',
  diagnosis: 'monetization',
  nextToken: 'risk',
  reco: 'risk',
}

export const initialStrategyState = (): StrategyExperimentState => ({
  schemaVersion: 3,
  activeTab: 'coldStart',
  exploredCases: [],
  coldStart: { ...DEFAULT_COLD_START },
  monetization: { ...DEFAULT_REACH },
  risk: { ...DEFAULT_RISK },
})

function isCaseId(value: unknown): value is StrategyCaseId {
  return typeof value === 'string' && (CASE_IDS as string[]).includes(value)
}

function stepped(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  const rounded = Math.round(value * 10) / 10
  return rounded >= min && rounded <= max ? rounded : fallback
}

function sanitizeColdStart(value: unknown): ColdStartControls {
  if (!value || typeof value !== 'object') return { ...DEFAULT_COLD_START }
  const raw = value as Record<string, unknown>
  return {
    threshold: stepped(raw.threshold, DEFAULT_COLD_START.threshold, 0.3, 0.9),
    exploration: raw.exploration === 0 || raw.exploration === 0.1 || raw.exploration === 0.2 ? raw.exploration : DEFAULT_COLD_START.exploration,
    guarantee: typeof raw.guarantee === 'boolean' ? raw.guarantee : DEFAULT_COLD_START.guarantee,
  }
}

function sanitizeReach(value: unknown): ReachControls {
  if (!value || typeof value !== 'object') return { ...DEFAULT_REACH }
  const raw = value as Record<string, unknown>
  return {
    threshold: stepped(raw.threshold, DEFAULT_REACH.threshold, 0.3, 0.9),
    frequency: raw.frequency === 1 || raw.frequency === 2 ? raw.frequency : DEFAULT_REACH.frequency,
    newAuthorQuota: raw.newAuthorQuota === 0.2 || raw.newAuthorQuota === 0.4 ? raw.newAuthorQuota : DEFAULT_REACH.newAuthorQuota,
  }
}

function sanitizeRisk(value: unknown): RiskControls {
  if (!value || typeof value !== 'object') return { ...DEFAULT_RISK }
  const raw = value as Record<string, unknown>
  const reviewStart = stepped(raw.reviewStart, DEFAULT_RISK.reviewStart, 0.3, 0.7)
  let directLimit = stepped(raw.directLimit, DEFAULT_RISK.directLimit, 0.7, 0.9)
  if (directLimit <= reviewStart) directLimit = Math.min(0.9, Math.round((reviewStart + 0.1) * 10) / 10)
  return {
    reviewStart,
    directLimit,
    reviewBudget: raw.reviewBudget === 200 || raw.reviewBudget === 500 ? raw.reviewBudget : DEFAULT_RISK.reviewBudget,
    softProtection: typeof raw.softProtection === 'boolean' ? raw.softProtection : DEFAULT_RISK.softProtection,
  }
}

function migrateLegacy(raw: Record<string, unknown>): StrategyExperimentState {
  const base = initialStrategyState()
  if (raw.schemaVersion === 1) {
    return { ...base, exploredCases: raw.explored === true ? ['coldStart'] : [] }
  }
  if (raw.schemaVersion === 2) {
    const activeTab = typeof raw.activeTab === 'string' ? OLD_SCENE_MAP[raw.activeTab] ?? 'coldStart' : 'coldStart'
    const explored = Array.isArray(raw.exploredScenes) ? raw.exploredScenes : []
    const exploredCases = [...new Set(explored.map((scene) => typeof scene === 'string' ? OLD_SCENE_MAP[scene] : undefined).filter((scene): scene is StrategyCaseId => Boolean(scene)))]
    return { ...base, activeTab, exploredCases }
  }
  return base
}

function parse(rawValue: string | null): Record<string, unknown> | null {
  if (!rawValue) return null
  const value: unknown = JSON.parse(rawValue)
  return value && typeof value === 'object' ? value as Record<string, unknown> : null
}

export function readStrategyState(storage: StorageReader): StrategyExperimentState {
  const fallback = initialStrategyState()
  try {
    const current = parse(storage.getItem(EXPERIMENT_STATE_KEY))
    if (current?.schemaVersion === 3) {
      const activeTab = isCaseId(current.activeTab) ? current.activeTab : fallback.activeTab
      const exploredRaw = Array.isArray(current.exploredCases) ? current.exploredCases : []
      const exploredCases = [...new Set(exploredRaw.filter(isCaseId))]
      return {
        schemaVersion: 3,
        activeTab,
        exploredCases,
        coldStart: sanitizeColdStart(current.coldStart),
        monetization: sanitizeReach(current.monetization),
        risk: sanitizeRisk(current.risk),
      }
    }
    const legacy = parse(storage.getItem(LEGACY_EXPERIMENT_STATE_KEY)) ?? parse(storage.getItem(LEGACY_CASE_STATE_KEY))
    return legacy ? migrateLegacy(legacy) : fallback
  } catch {
    return fallback
  }
}

export function writeStrategyState(storage: StorageWriter, state: StrategyExperimentState): boolean {
  try {
    storage.setItem(EXPERIMENT_STATE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}
