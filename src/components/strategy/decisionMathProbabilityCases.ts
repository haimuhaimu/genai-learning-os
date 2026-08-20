import { defineStrategyCase } from './defineStrategyCase.ts'
import type { ControlValues, DecisionEvidence, DecisionSummary } from './types'

const calibrationQuestion = '我们是在提高置信度，还是在提高置信度的可信度？'
const calibrationPlans = {
  raw: { label: '原始概率统一阈值', falseRelease: 13.8, falseBlock: 3.6, review: 0, ece: 9.3, risk: '¥13.8 / 百次', upkeep: '2 人时 / 月' },
  temperature: { label: '温度校准后阈值', falseRelease: 8.1, falseBlock: 5.9, review: 9, ece: 4.8, risk: '¥8.1 / 百次', upkeep: '8 人时 / 月' },
  segmented: { label: '分场景校准 + 低置信转人工', falseRelease: 4.3, falseBlock: 7.4, review: 24, ece: 2.1, risk: '¥4.3 / 百次', upkeep: '18 人时 / 月' },
} as const
export const DEFAULT_CALIBRATION = { policy: 'temperature' } as const
export function calculateCalibration(controls: ControlValues): DecisionEvidence {
  const plan = calibrationPlans[String(controls.policy) as keyof typeof calibrationPlans] ?? calibrationPlans.temperature
  return {
    metrics: [
      { id: 'falseRelease', label: '误放率', value: plan.falseRelease, display: `${plan.falseRelease}%`, emphasis: true },
      { id: 'falseBlock', label: '误伤率', value: plan.falseBlock, display: `${plan.falseBlock}%` },
      { id: 'manualReview', label: '人工审核量', value: plan.review, display: `${plan.review} / 百次` },
      { id: 'ece', label: '校准误差 ECE', value: plan.ece, display: `${plan.ece}%`, hint: '越低表示置信度更可信' },
    ],
    costs: [
      { label: '用户风险', value: plan.risk, note: '误放造成的教学风险指数' },
      { label: '审核成本', value: `${plan.review} 单 / 百次` },
      { label: '校准集维护', value: plan.upkeep },
    ],
    feedbackSource: '固定回放集记录预测概率、真实结果与场景；转人工样本还会留下复核标签。',
    feedbackSignals: [`高置信桶仍有 ${100 - 72}% 错误`, `当前 ECE 为 ${plan.ece}%`],
    nextTrainingAction: plan === calibrationPlans.segmented ? '补齐高风险场景校准集，并监控人工队列漂移' : '按场景重算可靠性图，优先补标高置信错误',
    caution: '阈值不会让原始概率自动可信；ECE 是分桶教学估算，也不能替代逐场景风险评审。',
  }
}
export function summarizeCalibration(controls: ControlValues, evidence: DecisionEvidence): DecisionSummary {
  const plan = calibrationPlans[String(controls.policy) as keyof typeof calibrationPlans] ?? calibrationPlans.temperature
  const metric = Object.fromEntries(evidence.metrics.map((item) => [item.id, item.display]))
  const text = `校准策略：采用“${plan.label}”，ECE ${metric.ece}、误放率 ${metric.falseRelease}、人工审核 ${metric.manualReview}。代价是审核与校准集维护；下一轮：${evidence.nextTrainingAction}。复盘问题：${calibrationQuestion}`
  return { text, nextAction: evidence.nextTrainingAction }
}
export const calibrationSpec = defineStrategyCase({
  id: 'calibration-threshold', routeId: 'ai-decision-math', routeLabel: 'AI 决策数学', title: '置信度 90%，真的代表九成会发生吗？', question: calibrationQuestion, duration: '预计 3–5 分钟',
  background: '一个风险分类器把高置信结果直接放行，但离线可靠性图显示它在高置信区明显过度自信。你要选择上线校准与转人工策略。',
  feedback: '反馈来自固定回放集与人工复核；未复核的放行结果可能延迟暴露错误。',
  controls: [{ id: 'policy', label: '校准与放行策略', type: 'choice', options: Object.entries(calibrationPlans).map(([value, item]) => ({ value, label: item.label })) }],
  defaults: DEFAULT_CALIBRATION,
  fixedDataTitle: '固定可靠性分桶（预测置信 / 真实正确率 / 样本量）',
  fixedDataRows: ['0.55 / 0.54 / n=200', '0.70 / 0.62 / n=180', '0.85 / 0.69 / n=120', '0.95 / 0.72 / n=80'],
  compute: calculateCalibration, summarize: summarizeCalibration,
})

const bayesQuestion = '这次结论来自新证据，还是来自我们原本的相信？'
const bayesPlans = {
  conservative: { label: '保守先验', alpha: 4, beta: 6, sampleCost: 34, risk: 12 },
  neutral: { label: '中性先验', alpha: 1, beta: 1, sampleCost: 24, risk: 24 },
  aggressive: { label: '激进先验', alpha: 8, beta: 2, sampleCost: 16, risk: 43 },
} as const
export const DEFAULT_BAYES = { prior: 'neutral' } as const
export function calculateBayesRollout(controls: ControlValues): DecisionEvidence {
  const plan = bayesPlans[String(controls.prior) as keyof typeof bayesPlans] ?? bayesPlans.neutral
  const alpha = plan.alpha + 28
  const beta = plan.beta + 12
  const mean = alpha / (alpha + beta)
  const variance = alpha * beta / ((alpha + beta) ** 2 * (alpha + beta + 1))
  const lower = Math.max(0, mean - 1.28 * Math.sqrt(variance))
  const upper = Math.min(1, mean + 1.28 * Math.sqrt(variance))
  return {
    metrics: [
      { id: 'posteriorMean', label: '后验均值', value: mean * 100, display: `${(mean * 100).toFixed(1)}%`, emphasis: true },
      { id: 'credibleLower', label: '可信下界（教学近似）', value: lower * 100, display: `${(lower * 100).toFixed(1)}%` },
      { id: 'credibleWidth', label: '近似区间宽度', value: (upper - lower) * 100, display: `${(lower * 100).toFixed(1)}%–${(upper * 100).toFixed(1)}%` },
      { id: 'samplingCost', label: '继续采样成本', value: plan.sampleCost, display: `${plan.sampleCost} 点` },
      { id: 'scaleRisk', label: '错放大风险', value: plan.risk, display: `${plan.risk} / 100` },
    ],
    costs: [
      { label: '先验承诺', value: `Beta(${plan.alpha}, ${plan.beta})` },
      { label: '继续采样', value: `${plan.sampleCost} 成本点` },
      { label: '错放大', value: `${plan.risk} / 100` },
    ],
    feedbackSource: '固定小流量观测为 40 次：28 次成功、12 次失败；先验由策略选择显式记录。',
    feedbackSignals: [`后验参数 Beta(${alpha}, ${beta})`, `40 个样本下先验仍会移动结论`],
    nextTrainingAction: lower < .62 ? '继续收集至少 40 个分层样本，再评估放量' : '仅扩大一档流量，并保留停止门',
    caution: '区间用正态近似仅作教学展示，不声称严格统计精度；真实实验需检查独立性与分层。',
  }
}
export function summarizeBayesRollout(controls: ControlValues, evidence: DecisionEvidence): DecisionSummary {
  const plan = bayesPlans[String(controls.prior) as keyof typeof bayesPlans] ?? bayesPlans.neutral
  const metric = Object.fromEntries(evidence.metrics.map((item) => [item.id, item.display]))
  const text = `放量判断：采用${plan.label} Beta(${plan.alpha}, ${plan.beta})，结合 28/40 个成功，后验均值 ${metric.posteriorMean}，近似可信下界 ${metric.credibleLower}。下一轮：${evidence.nextTrainingAction}。复盘问题：${bayesQuestion}`
  return { text, nextAction: evidence.nextTrainingAction }
}
export const bayesRolloutSpec = defineStrategyCase({
  id: 'bayes-rollout', routeId: 'ai-decision-math', routeLabel: 'AI 决策数学', title: '小流量只跑了 40 个样本，要不要继续放量？', question: bayesQuestion, duration: '预计 3–5 分钟',
  background: '新策略只获得 40 个固定观测。你需要把团队原有判断写成 Beta 先验，再看新证据如何改变放量结论。',
  feedback: '新样本更新后验，但先验不会消失；小样本阶段尤其要说明结论由哪部分驱动。',
  controls: [{ id: 'prior', label: '放量先验', type: 'choice', options: Object.entries(bayesPlans).map(([value, item]) => ({ value, label: `${item.label} · Beta(${item.alpha},${item.beta})` })) }],
  defaults: DEFAULT_BAYES,
  fixedDataTitle: '固定先验与 40 个观测',
  fixedDataRows: ['保守先验 Beta(4,6)', '中性先验 Beta(1,1)', '激进先验 Beta(8,2)', '固定观测：成功 28 / 失败 12'],
  compute: calculateBayesRollout, summarize: summarizeBayesRollout,
})
