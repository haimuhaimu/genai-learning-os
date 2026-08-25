import { lazy, type LazyExoticComponent, type ComponentType } from 'react'

export type PaperLabVisual = 'evidence' | 'distillation' | 'recommendation' | 'diffusion' | 'agent' | 'world' | 'experts'
export type PaperLabTone = 'coral' | 'amber' | 'blue' | 'violet' | 'mint' | 'cyan' | 'rose'

export type PaperLabDefinition = {
  paperId: string
  order: number
  shortTitle: string
  eyebrow: string
  objective: string
  ability: string
  conclusion: string
  layout: 'golden' | 'scaffold'
  visual: PaperLabVisual
  tone: PaperLabTone
  cardSummary: string
  signal: string
  outcome: string
  skills: readonly string[]
  component: LazyExoticComponent<ComponentType>
}

export const paperLabs = [
  { paperId: 'attention-is-all-you-need', order: 1, shortTitle: '找到退款证据', eyebrow: '退款证据挑战', objective: '在五个逐步解锁的关卡中，先判断证据，再观察 AI 犯错、调节关注重点，并用自己的话总结规律。', ability: '从长上下文中识别真正影响决策的证据。', conclusion: 'Attention 不是让模型看到更多，而是围绕当前问题选择更重要的证据。', layout: 'golden', visual: 'evidence', tone: 'coral', cardSummary: '从一段混乱对话里，找出真正影响退款判断的那句话。', signal: '证据关注度', outcome: '判断更准确', skills: ['证据识别', '注意力机制'], component: lazy(() => import('./transformer/TransformerLab')) },
  { paperId: 'distilling-the-knowledge-in-a-neural-network', order: 2, shortTitle: '把大模型装进小模型', eyebrow: '70B → 3B 能力迁移挑战', objective: '先判断 3B 模型能否上线，再观察边界错误，只调“老师把犹豫摊开多少”，最后建立成本、延迟、能力与风险闸门。', ability: '判断模型压缩何时省钱、何时损害边界能力。', conclusion: '能力迁移既要教最可能的答案，也要保留相近答案之间的差距；中间区间比一味增大更可靠。', layout: 'golden', visual: 'distillation', tone: 'amber', cardSummary: '让 3B 小模型学会 70B 大模型的犹豫，而不只是抄答案。', signal: '老师的温度', outcome: '更低成本上线', skills: ['模型压缩', '风险闸门'], component: lazy(() => import('./distillation/DistillationLab')) },
  { paperId: 'wide-and-deep', order: 3, shortTitle: '给新内容一次机会', eyebrow: '记忆与泛化 · MEMORIZATION + GENERALIZATION', objective: '从新内容与新商家冷启动出发，对比记忆规则和相似性泛化如何让热门、冷启动、长尾跨过门槛。', ability: '平衡历史规则与新对象的探索机会。', conclusion: '平均收益不是验收终点；推荐策略必须看谁先跨过门槛，以及泛化带来的误推荐代价。', layout: 'golden', visual: 'recommendation', tone: 'blue', cardSummary: '历史规则偏爱老选手，怎样让优质新内容跨过推荐门槛？', signal: '泛化强度', outcome: '冷启动破局', skills: ['推荐系统', '记忆与泛化'], component: lazy(() => import('./recsys/WideDeepLab')) },
  { paperId: 'ddpm', order: 4, shortTitle: '从噪点还原图片', eyebrow: '加噪与反推 · FORWARD NOISE + REVERSE ESTIMATE', objective: '从 AI 生成内容（AIGC）图片质量、延迟与成本取舍出发，沿干净、带噪、重建链路读懂信噪比与重建误差。', ability: '把生成质量、采样延迟和单位成本放进同一决策。', conclusion: '可用图率、采样延迟和单张可用图成本需要放进同一张决策表。', layout: 'golden', visual: 'diffusion', tone: 'violet', cardSummary: 'AI 如何从一屏噪点，一步步“猜”回清晰图片？', signal: '去噪步数', outcome: '质量成本平衡', skills: ['图像生成', '扩散模型'], component: lazy(() => import('./diffusion/DdpmLab')) },
  { paperId: 'react', order: 5, shortTitle: '阻止 Agent 自信犯错', eyebrow: '推理、行动与观察 · REASON + ACT + OBSERVE', objective: '从退款自动化避免“自信地错”出发，比较是否查证、工具、冲突与步数预算造成的关键分叉。', ability: '为高风险 Agent 设计查证与停止条件。', conclusion: 'Agent 可靠性来自外部查证、可观察轨迹、冲突核验与明确停止条件。', layout: 'golden', visual: 'agent', tone: 'mint', cardSummary: '面对退款请求，Agent 什么时候该查证，什么时候必须停手？', signal: '行动预算', outcome: '可靠地完成任务', skills: ['Agent', '停止条件'], component: lazy(() => import('./agent/ReActLab')) },
  { paperId: 'dreamerv3', order: 6, shortTitle: '在想象中训练决策', eyebrow: '真实与想象推演 · REAL VS IMAGINED ROLLOUT', objective: '从仿真投入产出比（ROI）很高但线上回撤出发，逐步观察模拟误差累积，并判断何时必须回真实小流量验证。', ability: '识别仿真误差累积并设置真实验证护栏。', conclusion: '模拟提升样本效率，但长推演必须设置真实小流量校验与回退边界。', layout: 'golden', visual: 'world', tone: 'cyan', cardSummary: '仿真里表现完美的策略，为什么一上线就可能失灵？', signal: '想象步数', outcome: '守住真实收益', skills: ['世界模型', '仿真偏差'], component: lazy(() => import('./worldModel/DreamerLab')) },
  { paperId: 'switch-transformers', order: 7, shortTitle: '让四位专家不爆仓', eyebrow: '四专家分流与爆仓挑战', objective: '把退款、政策、代码、检索请求分给四个专家，同时避免热门专家爆仓和冷门专家闲置。', ability: '在质量、容量、延迟与成本之间找到可上线的分流强度。', conclusion: '分流既要尊重任务匹配，也要防止负载倾斜；过弱会爆仓，过强会牺牲质量。', layout: 'golden', visual: 'experts', tone: 'rose', cardSummary: '把 12 条请求分给四位专家：既要专业匹配，也不能有人爆仓。', signal: '分流平衡度', outcome: '专家高效协作', skills: ['MoE', '负载均衡'], component: lazy(() => import('./moe/SwitchTransformersLab')) },
] as const satisfies readonly PaperLabDefinition[]

export const goldenPaperLabs = paperLabs.filter((lab) => lab.layout === 'golden').sort((a, b) => a.order - b.order)
export const defaultPaperLab = goldenPaperLabs[0]
export function getPaperLab(paperId: string | undefined) {
  return paperLabs.find((lab) => lab.paperId === paperId) ?? defaultPaperLab
}
export function resolvePaperLabRoute(paperId: string | undefined) {
  if (!paperId) return { kind: 'hub' } as const
  const lab = getPaperLab(paperId)
  return { kind: 'lesson', lab, unknown: paperId !== lab.paperId } as const
}
export function hasPaperLab(paperId: string) {
  return paperLabs.some((lab) => lab.paperId === paperId)
}
export function getNextPaperLab(paperId: string) {
  const index = goldenPaperLabs.findIndex((lab) => lab.paperId === paperId)
  return index >= 0 ? goldenPaperLabs[index + 1] : undefined
}
