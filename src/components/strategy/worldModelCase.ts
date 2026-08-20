import { defineStrategyCase } from './defineStrategyCase.ts'
import type { ControlValues, DecisionEvidence, DecisionSummary } from './types'

type ChannelProfile = {
  channel: 'real-ab' | 'llm-sim' | 'world-model'
  label: string
  cost: number
  reality: number
  scalability: number
  costLine: string
  realityLine: string
  scalabilityLine: string
  costNote: string
  boundary: string
  nextAction: string
}

export const CHANNEL_DATA: readonly ChannelProfile[] = [
  {
    channel: 'real-ab',
    label: '真实用户 A/B',
    cost: 90,
    reality: 95,
    scalability: 30,
    costLine: '成本：高（用户流失、GMV 波动都要承担）',
    realityLine: '真实性：最高（拿到最真实反馈）',
    scalabilityLine: '可扩展性：弱（受用户容量与业务节奏限制）',
    costNote: '反馈最真、代价最高。',
    boundary: '一旦决策错，代价直接落在真实用户和业务。',
    nextAction: '只在最后一步用于验证，前期尽量用其他通道筛掉明显差的方案。',
  },
  {
    channel: 'llm-sim',
    label: 'LLM + 工具 逻辑推演',
    cost: 25,
    reality: 55,
    scalability: 75,
    costLine: '成本：低（几次 LLM 调用即可）',
    realityLine: '真实性：中（只能覆盖"模型见过的模式"，物理约束弱）',
    scalabilityLine: '可扩展性：强（可批量生成候选）',
    costNote: '短期最划算，但推理只能覆盖"模型见过的模式"，物理约束弱。',
    boundary: 'LLM 推演容易漏掉与真实用户行为、平台机制强相关的约束。',
    nextAction: '把 LLM 推演当"廉价筛选器"，再把入围方案交给真实 A/B。',
  },
  {
    channel: 'world-model',
    label: '轻量世界模型',
    cost: 65,
    reality: 78,
    scalability: 88,
    costLine: '成本：中（需要初始数据与工程能力）',
    realityLine: '真实性：较高（能学到部分动力学，比 LLM 更贴近环境）',
    scalabilityLine: '可扩展性：强（一旦建成可反复模拟）',
    costNote: '长期收益大，需团队能建 evaluator 和仿真环境。',
    boundary: 'Genie 2 目前的可交互世界一致性仅约数十秒，长时预测仍有明显偏差。',
    nextAction: '先在一个闭合场景（单一作者×单一商品域）验证世界模型再推广。',
  },
]

export const DEFAULT_SIMULATOR_VS_REALITY = { channel: 'llm-sim' } as const

export function calculateWorldModel(controls: ControlValues): DecisionEvidence {
  const channelId = String(controls.channel)
  const profile = CHANNEL_DATA.find((item) => item.channel === channelId) ?? CHANNEL_DATA[0]
  return {
    metrics: [
      { id: 'reality', label: '反馈真实性', value: profile.reality, display: `${profile.reality} / 100`, emphasis: true },
      { id: 'cost', label: '总体成本', value: profile.cost, display: `${profile.cost} / 100` },
      { id: 'scalability', label: '可扩展性', value: profile.scalability, display: `${profile.scalability} / 100` },
    ],
    costs: CHANNEL_DATA.map((item) => ({
      label: item.label,
      value: `成本 ${item.cost} · 真实性 ${item.reality} · 可扩展性 ${item.scalability}`,
      note: item.costNote,
    })),
    feedbackSource: '固定证据：Ha & Schmidhuber 证明在想象中训练策略可以大幅减少真实环境交互；LeCun 指出仅靠 token 预测的模型缺乏可配置的预测性世界模型；DreamerV3 用一套超参在 150+ 环境达 SOTA，但仍需环境交互数据；Genie 2 的可交互世界一致性目前仅约数十秒。',
    feedbackSignals: CHANNEL_DATA.map((item) => `${item.label}：${item.costLine} / ${item.realityLine} / ${item.scalabilityLine}`),
    nextTrainingAction: `Next 3 步：① 明确"物理一致性 / 长时预测"是不是这次决策的关键 → ② 决定是否值得建世界模型（若 LLM+工具能覆盖，就先不建） → ③ 若需要，先在闭合场景验证：${profile.nextAction}`,
    caution: '当前方向仍在早期，任何自动闭环上线前请先设计人工兜底和停手条件。',
  }
}

export function summarizeWorldModel(controls: ControlValues, evidence: DecisionEvidence): DecisionSummary {
  const channelId = String(controls.channel)
  const profile = CHANNEL_DATA.find((item) => item.channel === channelId) ?? CHANNEL_DATA[0]
  const metric = Object.fromEntries(evidence.metrics.map((item) => [item.id, item.display]))
  const text = `世界模型策略：本轮选择"${profile.label}"通道。反馈真实性 ${metric.reality}，总体成本 ${metric.cost}，可扩展性 ${metric.scalability}。边界：${profile.boundary} 反思模板问题：如果这个决策错了，谁来承担代价？下一轮：${evidence.nextTrainingAction}`
  return { text, nextAction: evidence.nextTrainingAction }
}

export const worldModelSpec = defineStrategyCase({
  id: 'simulator-vs-reality',
  routeId: 'world-model',
  routeLabel: 'World Model',
  title: '先在世界模型里跑，还是直接上真实用户？',
  question: '给某个头部作者做变现路径实验，要不要先用世界模型仿真，再决定真实 A/B？',
  duration: '预计 3–5 分钟',
  background: '给某个头部作者做变现路径实验，团队争论要不要先用一套世界模型做仿真，再决定真实 A/B。你要在真实、LLM 模拟与世界模型三种通道之间做选择，并对成本、真实性与可扩展性做出取舍。',
  feedback: '反馈来自三种通道的真实性、成本与可扩展性；LLM 推演便宜但物理一致性弱，世界模型需要初始数据与工程能力。',
  controls: [
    {
      id: 'channel',
      label: '本次决策使用哪种通道',
      type: 'choice',
      options: [
        { value: 'real-ab', label: '真实用户 A/B' },
        { value: 'llm-sim', label: 'LLM+工具 推演' },
        { value: 'world-model', label: '轻量世界模型' },
      ],
    },
  ],
  defaults: DEFAULT_SIMULATOR_VS_REALITY,
  fixedDataTitle: '三条通道的静态评估',
  fixedDataRows: [
    '真实 A/B：反馈最真、代价最高',
    'LLM 推演：短期最划算，但只能覆盖模型见过的模式',
    '世界模型：长期收益大，需团队能建 evaluator 与仿真环境',
    '固定证据来自 Ha & Schmidhuber、LeCun JEPA、DreamerV3、Genie 2 等公开材料',
  ],
  compute: calculateWorldModel,
  summarize: summarizeWorldModel,
})
