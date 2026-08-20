import { defineStrategyCase } from './defineStrategyCase.ts'
import type { ControlValues, DecisionEvidence, DecisionSummary } from './types'

type FocusProfile = {
  focus: 'cold-start-traffic' | 'monetization-recommendation' | 'moderation-policy'
  label: string
  evaluator: string
  driftRisk: number
  humanFallback: number
  autoRatio: number
  costNote: string
  stopCondition: string
  nextAction: string
  driftLine: string
  fallbackLine: string
  stopLine: string
}

export const FOCUS_DATA: readonly FocusProfile[] = [
  {
    focus: 'cold-start-traffic',
    label: '冷启动流量分配',
    evaluator: '点击率、留存、下单等指标可自动落表；evaluator 有 ground-truth，reward hacking 风险较低。',
    driftRisk: 22,
    humanFallback: 15,
    autoRatio: 85,
    costNote: '迭代成本可控；主要风险是过拟合到短期指标。',
    stopCondition: '短期指标反转或长期留存下滑，就停手。',
    nextAction: '先在这里跑限量闭环，并把 evaluator 漂移监控接到看板。',
    driftLine: '有 ground-truth 的 evaluator，漂移可被日志与实验发现。',
    fallbackLine: '人工兜底比例低，但仍需保留 kill switch。',
    stopLine: '当短期指标反转或长期留存下滑时立即停手。',
  },
  {
    focus: 'monetization-recommendation',
    label: '作者变现路径推荐',
    evaluator: '部分反馈（GMV、订单）可量化；长期作者留存、内容生态健康度需要人工评估。',
    driftRisk: 48,
    humanFallback: 55,
    autoRatio: 45,
    costNote: '需要人工混合审核，节奏会慢，但可积累"半自动"经验。',
    stopCondition: '当作者留存或内容多样性开始下滑时停手。',
    nextAction: '在选项 1 有稳定观测后再放开半自动闭环，保留人工混合评分。',
    driftLine: '短期指标能自动打分，长期评价必须留人工。',
    fallbackLine: '需要人工兜底以覆盖长期与生态指标。',
    stopLine: '作者留存或内容多样性下滑到阈值时停手。',
  },
  {
    focus: 'moderation-policy',
    label: '违规内容边界判定',
    evaluator: '评分主观、随社会环境漂移；让模型自评容易加速 evaluator drift。',
    driftRisk: 78,
    humanFallback: 90,
    autoRatio: 10,
    costNote: '短期看能省人力，长期会让治理边界失控，代价由业务承担。',
    stopCondition: '任何一次策略调整都必须先经人工评审。',
    nextAction: '不建议进入自动闭环；保留人工评审、模型只做候选筛选。',
    driftLine: '缺少 ground-truth，evaluator 会与 policy 同步漂移。',
    fallbackLine: '必须以人工为主，模型只在 recall 阶段辅助。',
    stopLine: '任一策略调整都必须先经过人工评审。',
  },
]

export const DEFAULT_EVALUATOR_TRUST = { focus: 'cold-start-traffic' } as const

export function calculateEvaluatorTrust(controls: ControlValues): DecisionEvidence {
  const focusId = String(controls.focus)
  const profile = FOCUS_DATA.find((item) => item.focus === focusId) ?? FOCUS_DATA[0]
  return {
    metrics: [
      { id: 'autoRatio', label: '可自动闭环比例', value: profile.autoRatio, display: `${profile.autoRatio}%`, emphasis: true },
      { id: 'driftRisk', label: 'Evaluator 漂移风险', value: profile.driftRisk, display: `${profile.driftRisk} / 100` },
      { id: 'humanFallback', label: '需人工兜底比例', value: profile.humanFallback, display: `${profile.humanFallback}%` },
    ],
    costs: [
      { label: '业务代价', value: profile.costNote },
      { label: 'Evaluator 结构', value: profile.evaluator },
      { label: '停手条件', value: profile.stopCondition },
    ],
    feedbackSource: '固定证据：AlphaEvolve 只在有可执行 evaluator 的问题上工作；Self-Rewarding 论文承认 judge 与 policy 可能同步偏移；Princeton 团队指出 AI 能做工程活，不代表能做研究判断；无 ground-truth 的场景，越自动闭环，越可能"自我欺骗"。',
    feedbackSignals: [
      `是否可自动验证：${profile.driftLine}`,
      `是否需人工兜底：${profile.fallbackLine}`,
      `何时停手：${profile.stopLine}`,
    ],
    nextTrainingAction: `Next 3 步：① ${profile.nextAction} ② 建立 evaluator 漂移监控（judge 与 policy 分开打分） ③ 只有前两步稳定后，才把闭环推进到下一档业务。`,
    caution: '当前方向仍在早期，任何自动闭环上线前请先设计人工兜底和停手条件。',
  }
}

export function summarizeEvaluatorTrust(controls: ControlValues, evidence: DecisionEvidence): DecisionSummary {
  const focusId = String(controls.focus)
  const profile = FOCUS_DATA.find((item) => item.focus === focusId) ?? FOCUS_DATA[0]
  const metric = Object.fromEntries(evidence.metrics.map((item) => [item.id, item.display]))
  const text = `自评闭环策略：先在"${profile.label}"这一象限试跑。可自动闭环比例 ${metric.autoRatio}，evaluator 漂移风险 ${metric.driftRisk}，需人工兜底 ${metric.humanFallback}。停手条件：${profile.stopCondition} 反思模板问题：我们是在补证据，还是在制造回声？下一轮：${evidence.nextTrainingAction}`
  return { text, nextAction: evidence.nextTrainingAction }
}

export const evaluatorTrustSpec = defineStrategyCase({
  id: 'evaluator-trust',
  routeId: 'self-evolving',
  routeLabel: 'Self-Evolving',
  title: '让 AI 自己评分：哪种业务先跑闭环？',
  question: '搭一条"AI 出题 → AI 打分 → 自动微调"的闭环，先在哪个方向开跑最稳？',
  duration: '预计 3–5 分钟',
  background: '团队想搭一条"AI 自己出题 → AI 自己打分 → 自动微调"的闭环，先在哪个方向开跑最稳？你要决定哪种业务的 evaluator 可信到足以让模型自我训练，哪种业务应该继续保留人工。',
  feedback: '反馈来自 evaluator 是否有 ground-truth、judge 与 policy 的漂移监控、以及人工兜底的记录；只看"模型自评通过率"会让 evaluator drift 更快。',
  controls: [
    {
      id: 'focus',
      label: '先在哪个方向跑闭环',
      type: 'choice',
      options: [
        { value: 'cold-start-traffic', label: '冷启动流量分配' },
        { value: 'monetization-recommendation', label: '作者变现路径推荐' },
        { value: 'moderation-policy', label: '违规内容边界判定' },
      ],
    },
  ],
  defaults: DEFAULT_EVALUATOR_TRUST,
  fixedDataTitle: '三个方向的 evaluator 结构',
  fixedDataRows: [
    '冷启动流量分配：evaluator 有 ground-truth，reward hacking 风险低',
    '作者变现路径推荐：短期反馈可量化，长期价值需人工评估',
    '违规内容边界判定：评分主观、随社会环境漂移，容易加速 evaluator drift',
    '固定证据来自 AlphaEvolve、Self-Rewarding LM、MIT Technology Review 等公开材料',
  ],
  compute: calculateEvaluatorTrust,
  summarize: summarizeEvaluatorTrust,
})
