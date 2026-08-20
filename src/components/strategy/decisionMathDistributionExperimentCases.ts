import { defineStrategyCase } from './defineStrategyCase.ts'
import type { ControlValues, DecisionEvidence, DecisionSummary } from './types'

const entropyQuestion = '模型的确定性，来自更懂，还是来自更少表达？'
const REFERENCE_DISTRIBUTION = [.4, .25, .15, .12, .08]
const entropyPlans = {
  sharp: { label: '低熵尖锐', q: [.74, .17, .06, .02, .01], coverage: 2, tailRecall: 24, quality: 91, volatility: 8, collapse: 68 },
  balanced: { label: '中熵平衡', q: [.47, .25, .14, .09, .05], coverage: 4, tailRecall: 62, quality: 88, volatility: 13, collapse: 22 },
  explore: { label: '高熵探索', q: [.33, .25, .18, .14, .1], coverage: 5, tailRecall: 84, quality: 81, volatility: 24, collapse: 8 },
} as const
export const DEFAULT_ENTROPY_KL = { distribution: 'balanced' } as const
export function calculateEntropyKl(controls: ControlValues): DecisionEvidence {
  const plan = entropyPlans[String(controls.distribution) as keyof typeof entropyPlans] ?? entropyPlans.balanced
  const entropy = -plan.q.reduce((sum, probability) => sum + probability * Math.log(probability), 0)
  const kl = REFERENCE_DISTRIBUTION.reduce((sum, probability, index) => sum + probability * Math.log(probability / plan.q[index]), 0)
  return {
    metrics: [
      { id: 'entropy', label: 'Entropy H(Q)', value: entropy, display: entropy.toFixed(2) },
      { id: 'kl', label: 'KL(P‖Q)', value: kl, display: kl.toFixed(2), hint: '方向固定为覆盖 P' },
      { id: 'coverage', label: '模式覆盖', value: plan.coverage, display: `${plan.coverage} / 5`, emphasis: true },
      { id: 'tailRecall', label: '尾部召回', value: plan.tailRecall, display: `${plan.tailRecall}%` },
      { id: 'quality', label: '主任务质量', value: plan.quality, display: `${plan.quality}%` },
      { id: 'volatility', label: '输出波动', value: plan.volatility, display: `${plan.volatility} / 100` },
      { id: 'collapseRisk', label: '坍塌风险', value: plan.collapse, display: `${plan.collapse} / 100` },
    ],
    costs: [
      { label: '主任务质量', value: `${plan.quality}%` },
      { label: '探索波动', value: `${plan.volatility} / 100` },
      { label: '覆盖债务', value: `${5 - plan.coverage} 个模式` },
    ],
    feedbackSource: '固定参考分布 P 与候选分布 Q 记录全量模式；线上只看 top-1 会遮蔽尾部消失。',
    feedbackSignals: [`覆盖 ${plan.coverage}/5 个模式`, `尾部召回 ${plan.tailRecall}%`],
    nextTrainingAction: plan.coverage < 4 ? '增加尾部模式样本与覆盖约束，检查反向 KL 权重' : '保留覆盖切片，同时监控主任务质量',
    caution: '熵只描述分布锐度；KL(P‖Q) 与 KL(Q‖P) 方向不同，不能互换。',
  }
}
export function summarizeEntropyKl(controls: ControlValues, evidence: DecisionEvidence): DecisionSummary {
  const plan = entropyPlans[String(controls.distribution) as keyof typeof entropyPlans] ?? entropyPlans.balanced
  const metric = Object.fromEntries(evidence.metrics.map((item) => [item.id, item.display]))
  return { text: `分布策略：采用“${plan.label}”，Entropy ${metric.entropy}、KL(P‖Q) ${metric.kl}、模式覆盖 ${metric.coverage}、主任务质量 ${metric.quality}。下一轮：${evidence.nextTrainingAction}。复盘问题：${entropyQuestion}`, nextAction: evidence.nextTrainingAction }
}
export const entropyKlSpec = defineStrategyCase({
  id: 'entropy-kl-tradeoff', routeId: 'ai-decision-math', routeLabel: 'AI 决策数学', title: '模型更确定了，为什么覆盖能力下降？', question: entropyQuestion, duration: '预计 3–5 分钟',
  background: '候选模型在主任务上更确定，但尾部表达逐渐消失。你要在尖锐、平衡与探索分布之间选择。',
  feedback: '反馈来自固定模式全集与尾部切片；只看平均主任务质量会漏掉模式坍塌。',
  controls: [{ id: 'distribution', label: '输出分布策略', type: 'choice', options: Object.entries(entropyPlans).map(([value, item]) => ({ value, label: item.label })) }],
  defaults: DEFAULT_ENTROPY_KL,
  fixedDataTitle: '固定参考分布 P 与候选分布 Q',
  fixedDataRows: ['P = [0.40, 0.25, 0.15, 0.12, 0.08]', '低熵 Q = [0.74, 0.17, 0.06, 0.02, 0.01]', '中熵 Q = [0.47, 0.25, 0.14, 0.09, 0.05]', '高熵 Q = [0.33, 0.25, 0.18, 0.14, 0.10]'],
  compute: calculateEntropyKl, summarize: summarizeEntropyKl,
})

const causalQuestion = '我们看到的是增量，还是人群和时间结构变化？'
const experimentPlans = {
  plain: { label: '普通 A/B', lift: 4.3, confounding: 72, days: 7, engineering: 8 },
  stratified: { label: '分层随机', lift: 1, confounding: 18, days: 12, engineering: 24 },
  switchback: { label: 'switchback 时间交替', lift: .8, confounding: 9, days: 21, engineering: 46 },
} as const
export const DEFAULT_CAUSAL = { design: 'stratified' } as const
export function calculateCausalDesign(controls: ControlValues): DecisionEvidence {
  const plan = experimentPlans[String(controls.design) as keyof typeof experimentPlans] ?? experimentPlans.stratified
  return {
    metrics: [
      { id: 'estimatedLift', label: '估计增量', value: plan.lift, display: `+${plan.lift}%`, emphasis: true },
      { id: 'confoundingRisk', label: '混杂风险', value: plan.confounding, display: `${plan.confounding} / 100` },
      { id: 'duration', label: '实验周期', value: plan.days, display: `${plan.days} 天` },
      { id: 'engineeringCost', label: '工程成本', value: plan.engineering, display: `${plan.engineering} 点` },
    ],
    costs: [
      { label: '实验时长', value: `${plan.days} 天` },
      { label: '工程实现', value: `${plan.engineering} 点` },
      { label: '混杂债务', value: `${plan.confounding} / 100` },
    ],
    feedbackSource: '固定转化表同时记录渠道、新老用户与时间段；随机单元决定哪些差异可归因。',
    feedbackSignals: ['表面整体绝对提升约 +4.3 个百分点', `控制结构后估计增量 +${plan.lift}%`],
    nextTrainingAction: plan.confounding > 30 ? '按渠道与新老用户重新随机，补齐分层样本' : '预注册分层口径，并复核时间携带效应',
    caution: '该固定表用于展示 Simpson 悖论与混杂，不代表真实业务效果。',
  }
}
export function summarizeCausalDesign(controls: ControlValues, evidence: DecisionEvidence): DecisionSummary {
  const plan = experimentPlans[String(controls.design) as keyof typeof experimentPlans] ?? experimentPlans.stratified
  const metric = Object.fromEntries(evidence.metrics.map((item) => [item.id, item.display]))
  return { text: `因果设计：采用“${plan.label}”，估计增量 ${metric.estimatedLift}、混杂风险 ${metric.confoundingRisk}，周期 ${metric.duration}、工程成本 ${metric.engineeringCost}。下一轮：${evidence.nextTrainingAction}。复盘问题：${causalQuestion}`, nextAction: evidence.nextTrainingAction }
}
export const causalDesignSpec = defineStrategyCase({
  id: 'ab-causal-design', routeId: 'ai-decision-math', routeLabel: 'AI 决策数学', title: '整体转化涨了，真的是新策略带来的吗？', question: causalQuestion, duration: '预计 3–5 分钟',
  background: '新策略组整体转化更高，但它获得了更多高意向渠道与新用户流量。你要选择能识别增量的实验设计。',
  feedback: '反馈来自分层转化与时间窗口；不记录流量结构，就无法区分策略增量与样本变化。',
  controls: [{ id: 'design', label: '实验设计', type: 'choice', options: Object.entries(experimentPlans).map(([value, item]) => ({ value, label: item.label })) }],
  defaults: DEFAULT_CAUSAL,
  fixedDataTitle: '固定分层转化表（对照 → 策略）',
  fixedDataRows: ['自然渠道·老用户：18% → 19%（对照 200 / 策略 600）', '自然渠道·新用户：10% → 11%（各 500）', '广告渠道·老用户：8% → 9%（各 500）', '广告渠道·新用户：3% → 4%（对照 600 / 策略 200）', '策略组流量结构更偏高转化人群，整体数产生 Simpson 式误导'],
  compute: calculateCausalDesign, summarize: summarizeCausalDesign,
})
