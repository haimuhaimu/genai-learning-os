import type { CaseId } from './components/strategy/caseCatalog'
import type { EvidenceLevel } from './strategyEvidence'

export const STRATEGY_EVIDENCE_EVENT = 'genai-strategy-evidence-change'
export type StrategyEvidenceChangeDetail = { caseId: CaseId; level: EvidenceLevel; summarySaved: boolean }
