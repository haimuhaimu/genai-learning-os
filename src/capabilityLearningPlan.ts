import { capabilityRules, getCapabilityCoverage, type CapabilityRecord } from './capabilityEvidence'
import { stageLabels, type LearningCapabilityId, type LearningStage, type ProgressMap } from './progress'

export type CapabilityLearningStep = {
  id: string
  title: string
  stage: LearningStage
  target: LearningStage
  page: string
  options?: Record<string, string>
  reason: string
}

export type CapabilityLearningPlan = {
  id: LearningCapabilityId
  basis: string
  evidence: CapabilityLearningStep[]
  nextSteps: CapabilityLearningStep[]
}

function toStep(item: CapabilityRecord, target: LearningStage, reason: string): CapabilityLearningStep {
  const { id, title, stage, page, options } = item
  return { id, title, stage, page, options, target, reason }
}

export function getCapabilityLearningPlan(progress: ProgressMap, capabilityId: LearningCapabilityId): CapabilityLearningPlan {
  const rule = capabilityRules[capabilityId]
  const coverage = getCapabilityCoverage(progress, capabilityId)
  const evidence = coverage.evidence.map((item) => toStep(item, rule.target, `${stageLabels[item.stage]}，达到此处的记录门槛；不代表独立验证通过。`))
  const nextSteps = coverage.pending.slice(0, 4).map((item) => toStep(item, rule.target, rule.reason))
  return { id: capabilityId, basis: rule.basis, evidence, nextSteps }
}
