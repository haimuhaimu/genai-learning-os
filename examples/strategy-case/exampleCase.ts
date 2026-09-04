import { defineStrategyCase } from '../../src/components/strategy/defineStrategyCase'
import type { ControlValues, DecisionEvidence, DecisionSummary } from '../../src/components/strategy/types'

const DEFAULTS = { reviewRate: 20, policy: 'balanced', explain: true } as const

export function computeExample(controls: ControlValues): DecisionEvidence {
  const reviewRate = Number(controls.reviewRate)
  const policy = String(controls.policy)
  const explain = Boolean(controls.explain)
  const highValueReviewRate = Math.min(reviewRate, 40)
  const marginalReviewRate = Math.max(0, reviewRate - 40)
  const preventedLoss = highValueReviewRate * (policy === 'safe' ? 3.2 : 2.4)
    + marginalReviewRate * (policy === 'safe' ? 1.1 : 0.8)
  const handlingCost = reviewRate * 1.5 + (explain ? 8 : 0)
  const netValue = Math.max(0, preventedLoss - handlingCost)
  const shouldStopExpanding = reviewRate > 40 && handlingCost >= preventedLoss

  return {
    metrics: [
      { id: 'prevented-loss', label: '避免损失', value: preventedLoss, display: `¥${preventedLoss.toFixed(0)}`, emphasis: true },
      { id: 'handling-cost', label: '处理成本', value: handlingCost, display: `¥${handlingCost.toFixed(0)}` },
      { id: 'net-value', label: '净价值', value: netValue, display: `¥${netValue.toFixed(0)}` },
    ],
    costs: [{ label: '人工复核', value: `${reviewRate}%` }],
    feedbackSource: '固定工单样本中的复核结果与原因标签。',
    feedbackSignals: [`${reviewRate}% 的工单产生人工反馈`],
    nextTrainingAction: shouldStopExpanding
      ? '停止扩大复核，先降低单次处理成本'
      : reviewRate < 20
        ? '提高高风险切片采样率'
        : '补充复核原因标签',
    caution: shouldStopExpanding
      ? '处理成本已达到避免损失；教学阈值不代表生产收益。'
      : '教学估算不代表生产收益。',
  }
}

export function summarizeExample(controls: ControlValues, evidence: DecisionEvidence): DecisionSummary {
  const netValue = evidence.metrics.find((metric) => metric.id === 'net-value')?.display ?? '未知'
  return {
    text: `采用 ${controls.policy} 策略，复核 ${controls.reviewRate}% 工单，净价值 ${netValue}。下一轮：${evidence.nextTrainingAction}。`,
    nextAction: evidence.nextTrainingAction,
  }
}

export const exampleCase = defineStrategyCase({
  id: 'example-review-budget',
  routeId: 'agent',
  routeLabel: 'Agent',
  title: '复核预算应该放在哪里？',
  question: '有限人工预算应覆盖多少高风险工单？',
  duration: '预计 3 分钟',
  background: '更高复核率降低错误损失，也增加人工处理成本。',
  feedback: '只有被复核工单会留下人工原因标签。',
  controls: [
    { id: 'reviewRate', label: '复核率', type: 'range', min: 0, max: 100, step: 10, format: 'percent' },
    { id: 'policy', label: '策略', type: 'choice', options: [{ value: 'balanced', label: '均衡' }, { value: 'safe', label: '稳健' }] },
    { id: 'explain', label: '记录解释', type: 'toggle' },
  ],
  defaults: DEFAULTS,
  fixedDataTitle: '固定工单切片',
  fixedDataRows: ['100 个公开教学工单', '高风险工单损失权重更高'],
  compute: computeExample,
  summarize: summarizeExample,
})
