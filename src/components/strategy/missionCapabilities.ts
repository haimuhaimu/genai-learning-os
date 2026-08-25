import type { StrategyEvidenceRecord } from '../../strategyEvidence'
import { compareStressToCurrent } from './missionEngine'
import type { MissionCapability, StrategyCaseSpec } from './types'

export const capabilityLabels: Record<MissionCapability, string> = {
  'budget-allocation': '预算配置',
  'evidence-retrieval': '证据检索',
  'tradeoff-reasoning': '取舍推理',
  'robustness-testing': '压力验证',
  'transfer-explanation': '迁移解释',
}
export type CapabilitySource = { caseId: string; title: string; strategyFormed: boolean; stressPassed: boolean }
export type CapabilityEvidence = { id: MissionCapability; label: string; sources: CapabilitySource[]; pending: string[] }

function hasCompleteMissionEvidence(record: StrategyEvidenceRecord, spec: StrategyCaseSpec) {
  const completion = record.missionCompletion
  if (!completion || record.level < 2 || !record.summaryText || !completion.prediction.trim()) return false
  if (!spec.mission?.stressPresets.some((preset) => preset.id === completion.stress.presetId)) return false
  if (Date.parse(completion.stress.ranAt) < Date.parse(completion.attemptStartedAt) || Date.parse(completion.formedAt) < Date.parse(completion.stress.ranAt)) return false
  return compareStressToCurrent(spec.controls, completion.finalControls, {
    ...completion.stress,
    effectiveControls: completion.finalControls,
    metrics: [],
  }).fresh
}

export function deriveCapabilityEvidence(records: readonly StrategyEvidenceRecord[], specs: readonly StrategyCaseSpec[]): CapabilityEvidence[] {
  const specById = new Map(specs.filter((spec) => spec.mission).map((spec) => [spec.id, spec]))
  return (Object.keys(capabilityLabels) as MissionCapability[]).map((id) => {
    const sources = records.flatMap((record): CapabilitySource[] => {
      const spec = specById.get(record.caseId)
      if (!spec?.mission?.capabilities.includes(id) || !hasCompleteMissionEvidence(record, spec)) return []
      return [{ caseId: record.caseId, title: spec.title, strategyFormed: true, stressPassed: record.missionCompletion!.stress.passed }]
    })
    const hasStrategy = sources.some((source) => source.strategyFormed), hasStress = sources.some((source) => source.stressPassed)
    const pending = [...(!hasStrategy ? ['形成一份策略摘要'] : []), ...(!hasStress ? ['通过一次确定性压力测试'] : [])]
    return { id, label: capabilityLabels[id], sources, pending }
  })
}
