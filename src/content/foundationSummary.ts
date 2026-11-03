// Shared metadata only: the home and progress routes must not load full lessons.
export const foundationNodeSummaries = [
  { id: 'probability', code: 'F01', title: '概率与分布', phase: 'A', next: 'softmax' },
  { id: 'softmax', code: 'F02', title: 'Logits / Softmax', phase: 'A', prerequisite: 'probability', next: 'cross-entropy' },
  { id: 'cross-entropy', code: 'F03', title: '交叉熵', phase: 'A', prerequisite: 'softmax', next: 'kl-divergence' },
  { id: 'kl-divergence', code: 'F04', title: 'KL / JS / Reverse-KL', phase: 'A', prerequisite: 'cross-entropy', next: 'gradient-descent' },
  { id: 'gradient-descent', code: 'F05', title: '梯度下降与反向传播', phase: 'B', prerequisite: 'kl-divergence', next: 'linear-layer' },
  { id: 'linear-layer', code: 'F06', title: '线性层与矩阵乘', phase: 'B', prerequisite: 'gradient-descent', next: 'activation' },
  { id: 'activation', code: 'F07', title: 'ReLU / GELU / SiLU', phase: 'B', prerequisite: 'linear-layer', next: 'mlp' },
  { id: 'mlp', code: 'F08', title: 'MLP / FFN', phase: 'B', prerequisite: 'activation', next: 'transformer-block' },
  { id: 'transformer-block', code: 'F09', title: 'Transformer Block', phase: 'C', prerequisite: 'mlp', next: 'moe' },
  { id: 'moe', code: 'F10', title: 'MoE', phase: 'C', prerequisite: 'transformer-block', next: 'distillation' },
  { id: 'distillation', code: 'F11', title: '蒸馏', phase: 'D', prerequisite: 'moe' },
] as const

export type FoundationNodeId = typeof foundationNodeSummaries[number]['id']

export function resolveFoundationNodeId(id?: string): FoundationNodeId | undefined {
  if (!id) return 'probability'
  // The old home advertised a standalone Attention node that never existed.
  if (id === 'attention') return 'transformer-block'
  return foundationNodeSummaries.find((node) => node.id === id)?.id
}

export const foundationProgressIds = foundationNodeSummaries.map((node) => node.id)
