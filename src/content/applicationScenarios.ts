import type { CaseId } from '../components/strategy/caseCatalog'
import type { CaseEntry } from './types'
import { caseEntries } from './registry/cases'

type ScenarioSeed = {
  id: string
  role: string
  question: string
  caseId: CaseId
}

export type ApplicationScenarioEntry = Omit<ScenarioSeed, 'caseId'> & { entry: CaseEntry }

const scenarioSeeds: readonly ScenarioSeed[] = [
  { id: 'knowledge-base', role: '客服知识库负责人', question: '知识库能召回内容，为什么答案仍然缺证据？', caseId: 'rag-chunking' },
  { id: 'refund-agent', role: '客服自动化负责人', question: '退款 Agent 什么时候必须停下来让人确认？', caseId: 'refund-gate' },
  { id: 'image-production', role: '图像产品负责人', question: '生成质量提高了，单位成本还能控制吗？', caseId: 'image-unit-cost' },
  { id: 'model-deployment', role: '模型部署负责人', question: '蒸馏一致率更高，为什么关键能力反而下降？', caseId: 'distill-retention' },
]

const caseById = new Map(caseEntries.map((entry) => [entry.legacyId, entry]))

function requirePublishedCase(caseId: CaseId): CaseEntry {
  const entry = caseById.get(caseId)
  if (!entry || entry.status !== 'published') throw new Error(`Application scenario target is unavailable: ${caseId}`)
  return entry
}

export const applicationScenarioEntries: readonly ApplicationScenarioEntry[] = scenarioSeeds.map(({ caseId, ...scenario }) => ({
  ...scenario,
  entry: requirePublishedCase(caseId),
}))
