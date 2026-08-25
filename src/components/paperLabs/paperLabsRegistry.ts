import { lazy, type LazyExoticComponent, type ComponentType } from 'react'

export type PaperLabDefinition = {
  paperId: string
  shortTitle: string
  eyebrow: string
  objective: string
  conclusion: string
  layout: 'golden' | 'scaffold'
  component: LazyExoticComponent<ComponentType>
}

export const paperLabs = [
  { paperId: 'attention-is-all-you-need', shortTitle: '找到退款证据', eyebrow: '退款证据挑战', objective: '在五个逐步解锁的关卡中，先判断证据，再观察 AI 犯错、调节关注重点，并用自己的话总结规律。', conclusion: 'Attention 不是让模型看到更多，而是围绕当前问题选择更重要的证据。', layout: 'golden', component: lazy(() => import('./transformer/TransformerLab')) },
  { paperId: 'distilling-the-knowledge-in-a-neural-network', shortTitle: '把昂贵大模型装进低成本小模型', eyebrow: '70B → 3B 能力迁移挑战', objective: '先判断 3B 模型能否上线，再观察边界错误，只调“老师把犹豫摊开多少”，最后建立成本、延迟、能力与风险闸门。', conclusion: '能力迁移既要教最可能的答案，也要保留相近答案之间的差距；中间区间比一味增大更可靠。', layout: 'golden', component: lazy(() => import('./distillation/DistillationLab')) },
  { paperId: 'wide-and-deep', shortTitle: 'Wide & Deep（记忆与泛化）', eyebrow: '记忆与泛化 · MEMORIZATION + GENERALIZATION', objective: '从新内容与新商家冷启动出发，对比记忆规则和相似性泛化如何让热门、冷启动、长尾跨过门槛。', conclusion: '平均收益不是验收终点；推荐策略必须看谁先跨过门槛，以及泛化带来的误推荐代价。', layout: 'golden', component: lazy(() => import('./recsys/WideDeepLab')) },
  { paperId: 'ddpm', shortTitle: 'DDPM（扩散去噪）', eyebrow: '加噪与反推 · FORWARD NOISE + REVERSE ESTIMATE', objective: '从 AI 生成内容（AIGC）图片质量、延迟与成本取舍出发，沿干净、带噪、重建链路读懂信噪比与重建误差。', conclusion: '可用图率、采样延迟和单张可用图成本需要放进同一张决策表。', layout: 'golden', component: lazy(() => import('./diffusion/DdpmLab')) },
  { paperId: 'react', shortTitle: 'ReAct（推理—行动—观察）', eyebrow: '推理、行动与观察 · REASON + ACT + OBSERVE', objective: '从退款自动化避免“自信地错”出发，比较是否查证、工具、冲突与步数预算造成的关键分叉。', conclusion: 'Agent 可靠性来自外部查证、可观察轨迹、冲突核验与明确停止条件。', layout: 'golden', component: lazy(() => import('./agent/ReActLab')) },
  { paperId: 'dreamerv3', shortTitle: 'DreamerV3（世界模型）', eyebrow: '真实与想象推演 · REAL VS IMAGINED ROLLOUT', objective: '从仿真投入产出比（ROI）很高但线上回撤出发，逐步观察模拟误差累积，并判断何时必须回真实小流量验证。', conclusion: '模拟提升样本效率，但长推演必须设置真实小流量校验与回退边界。', layout: 'golden', component: lazy(() => import('./worldModel/DreamerLab')) },
] as const satisfies readonly PaperLabDefinition[]

export const defaultPaperLab = paperLabs[0]
export function getPaperLab(paperId: string | undefined) {
  return paperLabs.find((lab) => lab.paperId === paperId) ?? defaultPaperLab
}
export function hasPaperLab(paperId: string) {
  return paperLabs.some((lab) => lab.paperId === paperId)
}
