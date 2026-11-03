import { foundationNodeSummaries } from './content/foundationSummary'
import type { LearningCapabilityId, LearningStage, ProgressMap } from './progress'

type CourseGroup = 'foundation' | 'llm' | 'image' | 'agent'
export type CapabilityCourseItem = {
  id: string
  title: string
  group: CourseGroup
  coverageTargets: readonly LearningStage[]
  page: string
  options?: Record<string, string>
}
export type CapabilityRecord = CapabilityCourseItem & { stage: LearningStage }

// Keep shared progress independent of lesson bodies. Only canonical course keys
// are assessed here; all other saved records remain untouched.
const llmSummaries = [
  ['llm-token', '分词（Tokenization）与词表'], ['llm-embed', '向量嵌入（Embedding）与位置编码'],
  ['llm-attention', 'Transformer（变换器）与自注意力'], ['llm-pretrain', '下一个 Token 预训练与交叉熵'],
  ['llm-decode', '解码策略'], ['llm-context', '上下文、键值缓存与检索增强生成'],
  ['llm-align', '监督微调、偏好对齐、评估与安全'],
]
const imageSummaries = [
  ['img-space', '生成模型、像素与潜空间'], ['img-text', '文本编码器与交叉注意力'],
  ['img-diffusion', '前向加噪与反向去噪'], ['img-sample', '采样器、步数、随机种子与引导强度'],
  ['img-prompt', '提示词与负向提示'], ['img-control', '图生图、重绘、结构控制与低秩适配'],
  ['img-eval', '评估、一致性、安全与成本'],
]
const agentChapterTitles = [
  'AI Agent 入门', '上下文工程（全书最关键章）', '用户记忆和知识库', '工具', 'Coding Agent 与通用 Agent',
  '交互：观察与动作空间的扩展', 'Agent 的评估', '模型后训练', 'Agent 的持续进化', '多 Agent 协作',
]
const agentLabSummaries = [
  ['harness-diagnose', 'Harness 五要素诊断'], ['kv-cache', 'KV Cache 反模式模拟'],
  ['status-bar', 'Status Bar 沙盘'], ['pass-at-k', 'Pass@k vs Pass^k'],
  ['new-info-criterion', '多 Agent 新信息判据'], ['evolution-router', '持续进化更新路由'],
]
const agentReviewSummaries = [
  ['refund-rubric', '退款 Rubric + veto'], ['coding-min-tools', 'Coding 最小工具集'],
  ['multi-agent-topology', '多 Agent 拓扑选择'], ['kv-cache-scan', 'KV Cache 违规扫描'],
  ['post-training-shape', '后训练：先形后神'],
]

const catalog: CapabilityCourseItem[] = [
  ...foundationNodeSummaries.map((node) => ({ id: node.id, title: `${node.code} · ${node.title}`, group: 'foundation' as const, coverageTargets: [1, 2, 3, 4] as const, page: 'foundation', options: { node: node.id } })),
  ...llmSummaries.map(([id, title], index) => ({ id, title: `LLM ${String(index + 1).padStart(2, '0')} · ${title}`, group: 'llm' as const, coverageTargets: [1, 2, 3, 4] as const, page: 'llm', options: { chapter: id } })),
  ...imageSummaries.map(([id, title], index) => ({ id, title: `图像 ${String(index + 1).padStart(2, '0')} · ${title}`, group: 'image' as const, coverageTargets: [1, 2, 3, 4] as const, page: 'image', options: { chapter: id } })),
  // Chapter stages may be linked from cards; count direct card records once instead.
  ...agentChapterTitles.map((title, index) => ({ id: `agent-book-ch${index + 1}`, title: `CH${index + 1} · ${title}`, group: 'agent' as const, coverageTargets: [1] as const, page: 'agent-book', options: { chapter: `ch${index + 1}` } })),
  ...agentLabSummaries.map(([id, title]) => ({ id: `agent-book-lab-${id}`, title, group: 'agent' as const, coverageTargets: [1, 3] as const, page: 'agent-book-lab', options: { experiment: id } })),
  ...agentReviewSummaries.map(([id, title]) => ({ id: `agent-book-review-${id}`, title, group: 'agent' as const, coverageTargets: [1, 4] as const, page: 'agent-book-review', options: { card: id } })),
]

type CapabilityRule = {
  label: string
  description: string
  route: string
  basis: string
  target: LearningStage
  candidates: string[]
  reason: string
}

export const capabilityRules: Record<LearningCapabilityId, CapabilityRule> = {
  mechanism: {
    label: '机制直觉', description: '达到手算记录门槛的课程节点覆盖', route: 'foundation',
    basis: '分母为算法基础、LLM 与图像课程的全部节点；已标记为手算或后续阶段的节点计入。这里只统计学习记录，不验证理解程度。',
    target: 2, candidates: ['probability', 'softmax', 'llm-token', 'llm-attention', 'img-space'],
    reason: '完成一次手算并记录结果，为机制理解留下学习记录。',
  },
  experiment: {
    label: '实验能力', description: '标记进入实验或后续阶段的节点覆盖', route: 'labs',
    basis: '分母为算法基础、LLM、图像节点与 6 张 Agent 实验卡；标记为进入实验或后续阶段才计入。联动章节不重复计数，记录不代表实验已通过。',
    target: 3, candidates: ['softmax', 'llm-attention', 'img-diffusion', 'agent-book-lab-harness-diagnose'],
    reason: '进入实验，改变一个变量并记录观察结果。',
  },
  judgment: {
    label: '评审判断', description: '标记为已评审的课程节点覆盖', route: 'reviews',
    basis: '分母为算法基础、LLM、图像节点与 5 张 Agent 评审卡；只计入标记为已评审的记录。联动章节不重复计数，自检不等于独立评审通过。',
    target: 4, candidates: ['probability', 'llm-align', 'img-eval', 'agent-book-review-refund-rubric'],
    reason: '完成课程评审自检，记录门槛、风险与决策依据。',
  },
  engineering: {
    label: '工程严谨', description: 'Agent 路线已开始的课程节点覆盖', route: 'agent-book',
    basis: '分母为 Agent 的全部章节、实验与评审节点；有学习记录即计入。浏览只表示已开始，不证明工程熟练度。',
    target: 1, candidates: ['agent-book-ch1', 'agent-book-ch2', 'agent-book-lab-harness-diagnose', 'agent-book-lab-kv-cache', 'agent-book-review-coding-min-tools'],
    reason: '开始一个 Agent 课程节点，了解上下文、工具或可靠性实践。',
  },
  breadth: {
    label: '学习广度', description: '算法基础、LLM、图像与 Agent 路线覆盖', route: 'routes',
    basis: '分母固定为算法基础、LLM、图像与 Agent 四条路线；每条路线有任一正式节点记录即计一次，下方每条证据代表一条路线。',
    target: 1, candidates: ['probability', 'llm-token', 'img-space', 'agent-book-ch1'],
    reason: '开始一条尚无正式课程记录的路线。',
  },
}

export function getCapabilityCoverage(progress: ProgressMap, capabilityId: LearningCapabilityId) {
  const rule = capabilityRules[capabilityId]
  const eligible = catalog.filter((item) => item.coverageTargets.includes(rule.target) &&
    (capabilityId === 'mechanism' ? item.group !== 'agent' : capabilityId === 'engineering' ? item.group === 'agent' : true))
  const records: CapabilityRecord[] = eligible.map((item) => ({ ...item, stage: progress[item.id] ?? 0 }))
  const evidence = records.filter((item) => item.stage >= rule.target).sort((left, right) => right.stage - left.stage)
  const priority = new Map(rule.candidates.map((id, index) => [id, index]))
  const pending = records.filter((item) => item.stage < rule.target).sort((left, right) =>
    Number(right.stage > 0) - Number(left.stage > 0) || (priority.get(left.id) ?? Infinity) - (priority.get(right.id) ?? Infinity))

  if (capabilityId === 'breadth') {
    const groups = [...new Set(eligible.map((item) => item.group))]
    const routeEvidence = groups.flatMap((group) => evidence.find((item) => item.group === group) ?? [])
    const missingGroups = groups.filter((group) => !routeEvidence.some((item) => item.group === group))
    const routePending = missingGroups.flatMap((group) => pending.find((item) => item.group === group) ?? [])
    return { evidence: routeEvidence, pending: routePending, covered: routeEvidence.length, total: groups.length, unit: '路线' as const }
  }
  return { evidence, pending, covered: evidence.length, total: eligible.length, unit: '节点' as const }
}
