export const foundationNodeSummaries = [
  ['probability', 'F01', '概率与分布'], ['softmax', 'F02', 'Softmax'], ['cross-entropy', 'F03', '交叉熵'],
  ['kl-divergence', 'F04', 'KL 散度'], ['gradient-descent', 'F05', '梯度下降'], ['linear-layer', 'F06', '线性层'],
  ['activation', 'F07', '激活函数'], ['mlp', 'F08', 'MLP'], ['transformer-block', 'F09', 'Transformer Block'],
  ['attention', 'F10', 'Attention'], ['moe', 'F11', 'MoE'],
].map(([id, code, title]) => ({ id, code, title }))

export const foundationProgressIds = foundationNodeSummaries.map((node) => node.id)
