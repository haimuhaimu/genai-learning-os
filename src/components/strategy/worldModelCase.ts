import { defineStrategyCase } from './defineStrategyCase.ts'
import type { ControlValues, DecisionEvidence, DecisionSummary } from './types'

type ChannelProfile = {
  channel: 'real-ab' | 'llm-sim' | 'world-model'
  label: string
  pilotMatches: number
  pilotTotal: number
  realValidationWeight: number
  baseDelayDays: number
  dailyThroughput: number
  errorExposure: number
  boundary: string
  nextSample: string
}

export const CHANNEL_DATA: readonly ChannelProfile[] = [
  {
    channel: 'real-ab',
    label: '真实用户 A/B（对照实验）',
    pilotMatches: 47,
    pilotTotal: 50,
    realValidationWeight: 1,
    baseDelayDays: 7,
    dailyThroughput: 240,
    errorExposure: .7,
    boundary: '反馈最接近真实结果，但每个样本都占用真实流量，错误会直接影响用户。',
    nextSample: '只开放 5% 流量，按新老作者分层并预留同期对照组',
  },
  {
    channel: 'llm-sim',
    label: 'LLM（大语言模型）+ 工具推演',
    pilotMatches: 29,
    pilotTotal: 50,
    realValidationWeight: .08,
    baseDelayDays: .2,
    dailyThroughput: 1200,
    errorExposure: 1.25,
    boundary: '适合快速淘汰明显差的候选，但历史回测显示它会漏掉真实用户和平台约束。',
    nextSample: '补采模型最不确定的失败样本，并把入围方案交给小流量真实对照实验',
  },
  {
    channel: 'world-model',
    label: '轻量世界模型',
    pilotMatches: 39,
    pilotTotal: 50,
    realValidationWeight: .22,
    baseDelayDays: 2,
    dailyThroughput: 600,
    errorExposure: .95,
    boundary: '能重复仿真，但只在训练数据覆盖的闭合场景内可信，外推仍需真实验证。',
    nextSample: '在单一作者×单一商品域补采状态转移，并留出一组从未训练过的真实轨迹',
  },
]

export const DEFAULT_SIMULATOR_VS_REALITY = {
  channel: 'llm-sim',
  minimumEffect: 5,
  sampleSize: 1200,
  simulationReliability: .7,
  rollbackCost: 50,
} as const

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const rounded = (value: number, digits = 1) => Number(value.toFixed(digits))

function boundedControl(controls: ControlValues, id: string, fallback: number, min: number, max: number) {
  const value = Number(controls[id])
  return clamp(Number.isFinite(value) ? value : fallback, min, max)
}

function selectedProfile(controls: ControlValues) {
  const channelId = String(controls.channel)
  return CHANNEL_DATA.find((item) => item.channel === channelId) ?? CHANNEL_DATA[0]
}

function requiredSample(minimumEffect: number) {
  return Math.ceil(clamp(2 * (100 / minimumEffect) ** 2, 200, 20000))
}

export function calculateWorldModel(controls: ControlValues): DecisionEvidence {
  const profile = selectedProfile(controls)
  const minimumEffect = boundedControl(controls, 'minimumEffect', DEFAULT_SIMULATOR_VS_REALITY.minimumEffect, 1, 10)
  const sampleSize = boundedControl(controls, 'sampleSize', DEFAULT_SIMULATOR_VS_REALITY.sampleSize, 200, 5000)
  const simulationReliability = boundedControl(controls, 'simulationReliability', DEFAULT_SIMULATOR_VS_REALITY.simulationReliability, .4, .95)
  const rollbackCost = boundedControl(controls, 'rollbackCost', DEFAULT_SIMULATOR_VS_REALITY.rollbackCost, 10, 100)
  const pilotReliability = profile.pilotMatches / profile.pilotTotal
  const effectiveReliability = profile.channel === 'real-ab'
    ? pilotReliability
    : clamp((pilotReliability + simulationReliability) / 2, 0, 1)
  const targetSample = requiredSample(minimumEffect)
  const sampleCoverage = clamp(1 - Math.exp(-sampleSize / targetSample), 0, 1)
  const confidence = rounded(clamp(effectiveReliability * sampleCoverage * 100, 0, 99))
  const confidenceGap = Math.max(0, 70 - confidence)
  const realValidationCost = Math.round(clamp(sampleSize * profile.realValidationWeight + confidenceGap * 18, 0, 10000))
  const misjudgmentCost = rounded(clamp(rollbackCost * (1 - confidence / 100) * profile.errorExposure, 0, 200))
  const feedbackDelay = rounded(clamp(profile.baseDelayDays + sampleSize / profile.dailyThroughput, 0, 60))
  const shouldStop = confidence < 70 || misjudgmentCost >= 30
  const reliabilityPercent = rounded(effectiveReliability * 100)

  let additionalSample: string
  if (effectiveReliability <= .7) {
    additionalSample = '仅加仿真样本无法达到 70% 置信度；先补真实轨迹或更换验证通道'
  } else {
    const needed = Math.ceil(-targetSample * Math.log(1 - .7 / effectiveReliability))
    const additional = Math.max(0, needed - sampleSize)
    additionalSample = additional === 0 ? '当前样本量已覆盖 70% 置信线，转向独立真实留出集' : `至少再采 ${Math.min(5000, additional)} 条；若仍不足则转真实验证`
  }

  return {
    metrics: [
      { id: 'confidence', label: '决策置信度（教学近似）', value: confidence, display: `${confidence.toFixed(1)}%`, hint: '教学近似 = 通道有效可信度 × [1 − e^(−样本量 / 教学所需样本)]；不是成功概率，也不是正式统计功效分析。', emphasis: true },
      { id: 'realValidationCost', label: '等价真实验证折算量', value: realValidationCost, display: `${realValidationCost} 等价样本`, hint: `规划代理量 = 本轮样本 × 通道折算系数 ${profile.realValidationWeight} + 低于 70% 的置信缺口百分点 × 18；不等同于直接触达的真实用户数。` },
      { id: 'misjudgmentCost', label: '误判代价', value: misjudgmentCost, display: `${misjudgmentCost.toFixed(1)} / 100`, hint: '回滚代价乘以剩余不确定性和通道暴露系数。' },
      { id: 'feedbackDelay', label: '反馈延迟', value: feedbackDelay, display: `${feedbackDelay.toFixed(1)} 天`, hint: '通道准备时间加上处理本轮样本所需时间。' },
    ],
    costs: [
      { label: '闭环决策', value: shouldStop ? '停手：不得直接扩大真实流量' : '可继续：仅限预设小流量' },
      { label: '停手条件', value: `置信度低于 70%，或误判代价达到 30 / 100；当前${shouldStop ? '已触发' : '未触发'}` },
      { label: '教学近似基线', value: `所需样本 = ceil[2 × (100 / MDE百分数)^2]，再限制在 200–20000；检测 ${minimumEffect.toFixed(1)}% 效果约折算 ${targetSample} 条，当前通道有效可信度 ${reliabilityPercent.toFixed(1)}%。这不是正式 power analysis（统计功效分析）。` },
    ],
    feedbackSource: `固定证据是 50 个历史决策的小样本回放：“${profile.label}”预测与后续真实结果一致 ${profile.pilotMatches} / ${profile.pilotTotal}。它只校验已发生场景，不能证明新场景可靠。`,
    feedbackSignals: [
      `效果门槛：教学所需样本用 2 × (100 / MDE百分数)^2 近似，系数 2 是课堂缩放系数，100 用于把百分数口径归一到整百分比尺度，结果限制在 200–20000；未使用基线率、显著性或统计功效参数。`,
      `仿真可信度：当前与历史回测折中后为 ${reliabilityPercent.toFixed(1)}%；教学置信度再乘指数样本覆盖，它只用于课堂决策尺。`,
      `样本与时延：更多样本提升覆盖，但会增加处理时间；等价真实验证折算量按通道系数 ${profile.realValidationWeight} 与置信缺口 × 18 估算，不代表直接用户人数。`,
      `人话结论：${shouldStop ? '证据还不够，先停在验证环节，不把模拟结论当上线许可。' : '证据越过门槛，但仍只做可回滚的小流量验证。'}`,
    ],
    nextTrainingAction: `下一轮采样动作：${profile.nextSample}；${additionalSample}。`,
    caution: `证据可信度受 50 个历史案例和场景覆盖限制。${profile.boundary}`,
  }
}

export function summarizeWorldModel(controls: ControlValues, evidence: DecisionEvidence): DecisionSummary {
  const profile = selectedProfile(controls)
  const values = Object.fromEntries(evidence.metrics.map((item) => [item.id, item]))
  const shouldStop = values.confidence.value < 70 || values.misjudgmentCost.value >= 30
  const text = `世界模型策略：本轮选择“${profile.label}”。证据可信度：50 个历史决策回放为 ${profile.pilotMatches} / ${profile.pilotTotal}，结合当前样本后的决策置信度（教学近似）为 ${values.confidence.display}；它按通道有效可信度 × 指数样本覆盖计算，不是成功概率或正式 power analysis。成本与风险：等价真实验证折算量 ${values.realValidationCost.display}（规划代理量，不等于直接用户人数），误判代价 ${values.misjudgmentCost.display}，反馈延迟 ${values.feedbackDelay.display}。停手条件：置信度低于 70% 或误判代价达到 30 / 100；当前${shouldStop ? '已触发，禁止扩大真实流量' : '未触发，仅进入可回滚小流量验证'}。下一轮采样动作：${evidence.nextTrainingAction}`
  return { text, nextAction: evidence.nextTrainingAction }
}

export const worldModelSpec = defineStrategyCase({
  id: 'simulator-vs-reality',
  routeId: 'world-model',
  routeLabel: 'World Model',
  title: '先在世界模型里跑，还是直接上真实用户？',
  question: '给作者变现路径做实验时，怎样用效果门槛、样本量、仿真可信度和回滚代价决定继续或停手？',
  duration: '预计 5–8 分钟',
  background: '团队要在真实对照实验、大语言模型推演和轻量世界模型之间选择。你需要设置最小可检测效果、样本量、仿真可信度和回滚代价，用可计算的置信度与停手线决定下一步。',
  feedback: '反馈由历史小样本回放、当前样本覆盖、真实验证成本、误判代价和反馈延迟共同形成；仿真结论不能直接替代真实验证。',
  controls: [
    {
      id: 'channel',
      label: '本次决策使用哪种通道',
      type: 'choice',
      options: [
        { value: 'real-ab', label: '真实用户 A/B（对照实验）' },
        { value: 'llm-sim', label: 'LLM（大语言模型）+ 工具推演' },
        { value: 'world-model', label: '轻量世界模型' },
      ],
    },
    { id: 'minimumEffect', label: 'MDE（最小可检测效果）', detail: '教学近似中希望识别的最小相对变化；越小，平方反比折算的样本越多。这不是正式功效分析。', type: 'range', min: 1, max: 10, step: 1, format: 'integer' },
    { id: 'sampleSize', label: '本轮样本量', detail: '仿真轨迹或真实用户样本总数，限制在 200–5000。', type: 'range', min: 200, max: 5000, step: 200, format: 'integer' },
    { id: 'simulationReliability', label: '仿真可信度', detail: '留出集上与真实结果一致的估计；真实对照通道使用固定回测值。', type: 'range', min: .4, max: .95, step: .05, format: 'percent' },
    { id: 'rollbackCost', label: '回滚代价', detail: '把用户影响、收入损失和工程恢复合并为 10–100 的有限分值。', type: 'range', min: 10, max: 100, step: 10, format: 'integer' },
  ],
  defaults: DEFAULT_SIMULATOR_VS_REALITY,
  fixedDataTitle: '50 个历史决策回放（预测与后续真实结果一致数）',
  fixedDataRows: [
    '真实用户 A/B（对照实验）：47 / 50；等价真实验证折算系数 1.00；准备期 7 天',
    'LLM（大语言模型）+ 工具推演：29 / 50；等价真实验证折算系数 0.08；准备期 0.2 天',
    '轻量世界模型：39 / 50；等价真实验证折算系数 0.22；准备期 2 天',
    '教学近似口径：所需样本 = ceil[2 × (100 / MDE百分数)^2]，限制在 200–20000；2 是课堂缩放系数，100 是整百分比尺度。置信度 = 通道有效可信度 × [1 − e^(−样本量 / 所需样本)]。未纳入基线率、显著性与统计功效，因此不是正式 power analysis。',
    '折算量口径：本轮样本 × 通道折算系数 + 低于 70% 的置信缺口百分点 × 18；这是教学规划代理量，不等于直接真实用户样本数。',
  ],
  compute: calculateWorldModel,
  summarize: summarizeWorldModel,
})
