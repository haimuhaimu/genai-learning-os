import type { StrategyEvidenceRecord } from '../../strategyEvidence'
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

export function deriveCapabilityEvidence(records: readonly StrategyEvidenceRecord[], specs: readonly StrategyCaseSpec[]): CapabilityEvidence[] {
  const specById = new Map(specs.filter((spec) => spec.mission).map((spec) => [spec.id, spec]))
  return (Object.keys(capabilityLabels) as MissionCapability[]).map((id) => {
    const sources = records.flatMap((record): CapabilitySource[] => {
      const spec = specById.get(record.caseId)
      if (!spec?.mission?.capabilities.includes(id)) return []
      const strategyFormed = record.level >= 2 && Boolean(record.summaryText)
      const stressPassed = (record.missionEvidence?.passedStressPresetIds.length ?? 0) > 0
      return strategyFormed || stressPassed ? [{ caseId: record.caseId, title: spec.title, strategyFormed, stressPassed }] : []
    })
    const hasStrategy = sources.some((source) => source.strategyFormed), hasStress = sources.some((source) => source.stressPassed)
    const pending = [...(!hasStrategy ? ['形成一份策略摘要'] : []), ...(!hasStress ? ['通过一次确定性压力测试'] : [])]
    return { id, label: capabilityLabels[id], sources, pending }
  })
}
