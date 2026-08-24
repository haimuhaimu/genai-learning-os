import { lazy, type LazyExoticComponent, type ComponentType } from 'react'

export type PaperLabDefinition = {
  paperId: string
  shortTitle: string
  eyebrow: string
  objective: string
  conclusion: string
  component: LazyExoticComponent<ComponentType>
}

export const paperLabs = [
  { paperId: 'attention-is-all-you-need', shortTitle: 'Transformer 注意力', eyebrow: 'TOKEN INFORMATION ROUTING', objective: '观察缩放点积注意力如何按相关性路由信息，以及因果遮罩如何阻断未来 token。', conclusion: '把“窗口够长”拆成“证据是否被正确关注”的可验证问题。', component: lazy(() => import('./transformer/TransformerLab')) },
  { paperId: 'wide-and-deep', shortTitle: 'Wide & Deep 推荐', eyebrow: 'MEMORIZATION + GENERALIZATION', objective: '拆解记忆分支、泛化分支与联合分数在热门、冷启动和长尾切片上的差异。', conclusion: '平均收益不是验收终点；推荐策略必须看分群贡献。', component: lazy(() => import('./recsys/WideDeepLab')) },
  { paperId: 'ddpm', shortTitle: 'DDPM 去噪', eyebrow: 'FORWARD NOISE + REVERSE ESTIMATE', objective: '用固定种子观察时间步、噪声日程与预测误差如何改变信噪比和重建误差。', conclusion: '质量、步数、延迟和可用率需要放进同一张决策表。', component: lazy(() => import('./diffusion/DdpmLab')) },
  { paperId: 'react', shortTitle: 'ReAct 轨迹', eyebrow: 'REASON + ACT + OBSERVE', objective: '比较 Direct、CoT-only 与 ReAct，并定位冲突、工具限制和预算中的失败位置。', conclusion: 'Agent 可靠性来自工具契约、可观察轨迹与明确停止条件。', component: lazy(() => import('./agent/ReActLab')) },
  { paperId: 'dreamerv3', shortTitle: 'DreamerV3 世界模型', eyebrow: 'REAL VS IMAGINED ROLLOUT', objective: '比较真实交互与想象 rollout 的回报，并观察模型误差如何随长度累积。', conclusion: '模拟提升样本效率，但必须持续回到真实环境校验偏差。', component: lazy(() => import('./worldModel/DreamerLab')) },
] as const satisfies readonly PaperLabDefinition[]

export const defaultPaperLab = paperLabs[0]
export function getPaperLab(paperId: string | undefined) {
  return paperLabs.find((lab) => lab.paperId === paperId) ?? defaultPaperLab
}
export function hasPaperLab(paperId: string) {
  return paperLabs.some((lab) => lab.paperId === paperId)
}
