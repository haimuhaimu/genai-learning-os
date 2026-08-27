import { agentBookLabIds } from '../../agentBookData'
import { distillExperiments } from '../../distillData'
import { paperLabs } from '../../components/paperLabs/paperLabsRegistry'
import type { LabEntry } from '../types'

const foundationLabs = [
  ['softmax-ce', 'Softmax 与交叉熵'], ['kl-divergence', 'KL 与 JS 分布比较'],
  ['gradient-descent', '梯度下降轨迹'], ['mlp-forward', 'MLP 前向与维度流'],
  ['transformer-block', 'Transformer Block'], ['moe-router', 'MoE Router'],
  ['case-overconfident', '上线策略与训练反馈'],
] as const
const expertLabs = [
  ['kv-cost', 'KV 与服务成本'], ['attention-scale', 'Attention 复杂度'], ['alignment', '对齐方法'],
  ['rag-doctor', 'RAG 诊断'], ['diffusion-flow', 'Diffusion 与 Flow'], ['control-selector', '可控生成选型'],
] as const
const agentLabs = [
  ['loop-simulator', 'Loop Simulator'], ['tool-contract', 'Tool Contract'],
  ['planner-executor', 'Planner 与 Executor'], ['memory-governance', 'Memory Governance'],
  ['security-gate', 'Security Gate'], ['multi-agent', 'Multi-Agent'],
  ['observability', 'Observability'], ['launch-gate', 'Launch Gate'],
] as const
const agentBookTitles: Record<(typeof agentBookLabIds)[number], string> = {
  'harness-diagnose': 'Harness 五要素诊断',
  'kv-cache': 'KV Cache 反模式模拟',
  'status-bar': 'Agent Status Bar 沙盘',
  'pass-at-k': 'Pass@k 与 Pass^k 计算器',
  'new-info-criterion': '多 Agent 新信息判据',
  'evolution-router': '持续进化更新路由',
}

function createLabs(
  family: LabEntry['family'],
  page: LabEntry['route']['page'],
  tags: LabEntry['tags'],
  items: readonly (readonly [string, string])[],
  level: LabEntry['level'],
): LabEntry[] {
  return items.map(([legacyId, title]) => ({
    id: `lab:${family}:${legacyId}`,
    legacyId,
    type: 'lab',
    family,
    title,
    summary: `打开${title}，调整变量并观察机制结果。`,
    route: { page, options: family === 'paper' ? { paper: legacyId } : { experiment: legacyId } },
    tags,
    level,
    status: 'published',
  }))
}

export const labEntries: readonly LabEntry[] = [
  ...createLabs('foundation', 'foundation-lab', ['foundation'], foundationLabs, 'beginner'),
  ...createLabs('expert', 'expert-lab', ['llm'], expertLabs, 'intermediate'),
  { id: 'lab:expert:k3-build-lab', legacyId: 'k3-build-lab', type: 'lab', family: 'expert', title: 'K3 架构与显存实验', summary: '拆解 Kimi K3 的稀疏激活，并估算个人模型的权重显存。', route: { page: 'k3-build-lab', options: { section: 'lab' } }, tags: ['llm'], level: 'beginner', status: 'published' },
  ...createLabs('agent', 'agent-lab', ['agent'], agentLabs, 'intermediate'),
  ...createLabs('agent-book', 'agent-book-lab', ['agent', 'agent-book'], agentBookLabIds.map((id) => [id, agentBookTitles[id]]), 'advanced'),
  ...createLabs('distill', 'distill-lab', ['distillation'], distillExperiments.map(([id, , title]) => [id, title]), 'advanced'),
  ...createLabs('paper', 'paper-lab', ['resource'], paperLabs.map((lab) => [lab.paperId, lab.shortTitle]), 'intermediate'),
]
