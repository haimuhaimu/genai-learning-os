import {
  agentBookChapters,
  agentBookLabProgressKey,
  agentBookReviewProgressKey,
  chapterProgressKey,
  type AgentBookLabId,
  type AgentBookReviewId,
} from './agentBookData'
import { imageChapters, llmChapters } from './courseData'
import { foundationNodes } from './foundationData'
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

type CatalogItem = Omit<CapabilityLearningStep, 'stage' | 'target' | 'reason'> & { group: 'foundation' | 'llm' | 'image' | 'agent' }
type PlanRule = { basis: string; target: LearningStage; candidates: string[]; reason: string }

const agentLabTitles: Record<AgentBookLabId, string> = {
  'harness-diagnose': 'Harness 五要素诊断',
  'kv-cache': 'KV Cache 反模式模拟',
  'status-bar': 'Status Bar 沙盘',
  'pass-at-k': 'Pass@k vs Pass^k',
  'new-info-criterion': '多 Agent 新信息判据',
  'evolution-router': '持续进化更新路由',
}

const agentReviewTitles: Record<AgentBookReviewId, string> = {
  'refund-rubric': '退款 Rubric + veto',
  'coding-min-tools': 'Coding 最小工具集',
  'multi-agent-topology': '多 Agent 拓扑选择',
  'kv-cache-scan': 'KV Cache 违规扫描',
  'post-training-shape': '后训练：先形后神',
}

const catalog: CatalogItem[] = [
  ...foundationNodes.map((node) => ({ id: node.id, title: `${node.code} · ${node.title}`, group: 'foundation' as const, page: 'foundation', options: { node: node.id } })),
  ...llmChapters.map((chapter) => ({ id: chapter.id, title: `LLM ${chapter.no} · ${chapter.title}`, group: 'llm' as const, page: 'llm', options: { chapter: chapter.id } })),
  ...imageChapters.map((chapter) => ({ id: chapter.id, title: `图像 ${chapter.no} · ${chapter.title}`, group: 'image' as const, page: 'image', options: { chapter: chapter.id } })),
  ...agentBookChapters.map((chapter) => ({ id: chapterProgressKey(chapter.id), title: `${chapter.id.toUpperCase()} · ${chapter.titleZh}`, group: 'agent' as const, page: 'agent-book', options: { chapter: chapter.id } })),
  ...Object.entries(agentLabTitles).map(([id, title]) => ({ id: agentBookLabProgressKey(id as AgentBookLabId), title, group: 'agent' as const, page: 'agent-book-lab', options: { experiment: id } })),
  ...Object.entries(agentReviewTitles).map(([id, title]) => ({ id: agentBookReviewProgressKey(id as AgentBookReviewId), title, group: 'agent' as const, page: 'agent-book-review' })),
]

const catalogById = new Map(catalog.map((item) => [item.id, item]))

const rules: Record<LearningCapabilityId, PlanRule> = {
  mechanism: {
    basis: '完成手算或更深阶段，说明你不只浏览过概念，还能用一次具体结果解释机制。',
    target: 2,
    candidates: ['probability', 'softmax', 'llm-token', 'llm-attention', 'img-space'],
    reason: '补一个最小机制练习，建立可复述的因果直觉。',
  },
  experiment: {
    basis: '进入实验阶段才计入证据；只有阅读或手算不会被当作实验能力。',
    target: 3,
    candidates: ['softmax', 'llm-attention', 'img-diffusion', agentBookLabProgressKey('harness-diagnose')],
    reason: '亲手改变一个变量，观察结果并解释变化。',
  },
  judgment: {
    basis: '完成评审与决策自检才计入证据，强调阈值、风险和上线判断。',
    target: 4,
    candidates: ['probability', 'llm-align', 'img-eval', agentBookReviewProgressKey('refund-rubric')],
    reason: '把观察结果转成带门槛和兜底的决策。',
  },
  engineering: {
    basis: 'Agent 章节、机制实验与评审记录共同证明工程严谨度。',
    target: 3,
    candidates: [chapterProgressKey('ch1'), chapterProgressKey('ch2'), agentBookLabProgressKey('harness-diagnose'), agentBookLabProgressKey('kv-cache'), agentBookReviewProgressKey('coding-min-tools')],
    reason: '补齐上下文、工具、验证和可靠性中的一个工程动作。',
  },
  breadth: {
    basis: '在不同核心路线留下真实学习记录，证明不是只熟悉单一主题。',
    target: 1,
    candidates: ['probability', 'llm-token', 'img-space', chapterProgressKey('ch1')],
    reason: '进入一条尚未覆盖的核心路线，完成第一个可追踪节点。',
  },
}

function toStep(item: CatalogItem, progress: ProgressMap, target: LearningStage, reason: string): CapabilityLearningStep {
  return { ...item, stage: progress[item.id] ?? 0, target, reason }
}

function supportsCapability(item: CatalogItem, capabilityId: LearningCapabilityId, stage: LearningStage) {
  if (capabilityId === 'mechanism') return item.group !== 'agent' && stage >= 2
  if (capabilityId === 'experiment') return stage >= 3
  if (capabilityId === 'judgment') return stage >= 4
  if (capabilityId === 'engineering') return item.group === 'agent' && stage > 0
  return stage > 0
}

export function getCapabilityLearningPlan(progress: ProgressMap, capabilityId: LearningCapabilityId): CapabilityLearningPlan {
  const rule = rules[capabilityId]
  const evidence = catalog
    .filter((item) => supportsCapability(item, capabilityId, progress[item.id] ?? 0))
    .map((item) => toStep(item, progress, rule.target, `${stageLabels[progress[item.id] ?? 0]}，达到该能力的证据门槛。`))
    .sort((left, right) => right.stage - left.stage)

  const nextSteps = rule.candidates
    .map((id) => catalogById.get(id))
    .filter((item): item is CatalogItem => Boolean(item))
    .map((item) => toStep(item, progress, rule.target, rule.reason))
    .filter((item) => item.stage < item.target)
    .sort((left, right) => Number(right.stage > 0) - Number(left.stage > 0))
    .slice(0, 4)

  return { id: capabilityId, basis: rule.basis, evidence, nextSteps }
}
