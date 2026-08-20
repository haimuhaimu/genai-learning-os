import { defineStrategyCase } from './defineStrategyCase.ts'
import type { ControlValues, DecisionEvidence, DecisionSummary } from './types'

const similarityQuestion = '我们优化的是相似，还是可用于回答的证据？'
const retrievalPlans = {
  high: { label: '高阈值少召回', recall: 33, precision: 33, tokens: 520, latency: 210, citationRisk: 42 },
  balanced: { label: '中阈值平衡', recall: 67, precision: 50, tokens: 860, latency: 340, citationRisk: 25 },
  rerank: { label: '低阈值多召回 + rerank', recall: 100, precision: 75, tokens: 1480, latency: 570, citationRisk: 12 },
} as const
export const DEFAULT_SIMILARITY = { retrieval: 'balanced' } as const
export function calculateSimilarityGating(controls: ControlValues): DecisionEvidence {
  const plan = retrievalPlans[String(controls.retrieval) as keyof typeof retrievalPlans] ?? retrievalPlans.balanced
  return {
    metrics: [
      { id: 'recall', label: 'Recall', value: plan.recall, display: `${plan.recall}%`, emphasis: true },
      { id: 'precision', label: 'Precision', value: plan.precision, display: `${plan.precision}%` },
      { id: 'tokens', label: 'token 成本', value: plan.tokens, display: `${plan.tokens} / query` },
      { id: 'latency', label: '延迟', value: plan.latency, display: `${plan.latency} ms` },
      { id: 'citationRisk', label: '错误引用风险', value: plan.citationRisk, display: `${plan.citationRisk} / 100` },
    ],
    costs: [
      { label: '上下文', value: `${plan.tokens} token` },
      { label: '等待', value: `${plan.latency} ms` },
      { label: '引用复核', value: `${plan.citationRisk} 风险点` },
    ],
    feedbackSource: '固定候选块同时标注 cosine 相似度与是否支持答案；rerank 会留下二阶段排序证据。',
    feedbackSignals: [`关键例外块的 cosine 仅 0.69`, `当前证据召回 ${plan.recall}%`],
    nextTrainingAction: plan.recall < 80 ? '把低相似但支持答案的块加入检索 hard positives' : '把高相似但不支持的块加入 rerank hard negatives',
    caution: 'cosine 只衡量表征方向接近，不等于事实蕴含、时效性或可引用性。',
  }
}
export function summarizeSimilarityGating(controls: ControlValues, evidence: DecisionEvidence): DecisionSummary {
  const plan = retrievalPlans[String(controls.retrieval) as keyof typeof retrievalPlans] ?? retrievalPlans.balanced
  const metric = Object.fromEntries(evidence.metrics.map((item) => [item.id, item.display]))
  return { text: `检索门控：采用“${plan.label}”，Recall ${metric.recall}、Precision ${metric.precision}，成本 ${metric.tokens}、延迟 ${metric.latency}。下一轮：${evidence.nextTrainingAction}。复盘问题：${similarityQuestion}`, nextAction: evidence.nextTrainingAction }
}
export const similarityGatingSpec = defineStrategyCase({
  id: 'similarity-gating', routeId: 'ai-decision-math', routeLabel: 'AI 决策数学', title: '相似度提高了，为什么 RAG 反而答错？', question: similarityQuestion, duration: '预计 3–5 分钟',
  background: 'RAG 召回结果看起来更相似，却把措辞接近但不支持结论的内容放在前面。你要决定阈值与 rerank 策略。',
  feedback: '反馈需要同时记录相似度与证据支持标签，否则只能学会“像”，无法学会“能回答”。',
  controls: [{ id: 'retrieval', label: '召回门控策略', type: 'choice', options: Object.entries(retrievalPlans).map(([value, item]) => ({ value, label: item.label })) }],
  defaults: DEFAULT_SIMILARITY,
  fixedDataTitle: '6 个固定候选块（cosine / 证据作用）',
  fixedDataRows: ['A 0.93：措辞相似，不支持', 'B 0.88：旧政策，不支持', 'C 0.81：部分支持', 'D 0.69：关键例外，支持', 'E 0.58：审计证据，支持', 'F 0.52：背景噪声'],
  compute: calculateSimilarityGating, summarize: summarizeSimilarityGating,
})

const optimizerQuestion = '我们是在追求更快下降，还是可持续地学到东西？'
const optimizerPlans = {
  sprint: { label: '大 LR 直冲', lossDrop: 64, validSteps: 720, reruns: 4, cost: 188, risk: 72 },
  guarded: { label: 'warmup + clip', lossDrop: 48, validSteps: 940, reruns: 1, cost: 142, risk: 18 },
  slow: { label: '小 LR 慢训', lossDrop: 31, validSteps: 990, reruns: 0, cost: 176, risk: 9 },
} as const
export const DEFAULT_OPTIMIZER = { schedule: 'guarded' } as const
export function calculateOptimizerStability(controls: ControlValues): DecisionEvidence {
  const plan = optimizerPlans[String(controls.schedule) as keyof typeof optimizerPlans] ?? optimizerPlans.guarded
  return {
    metrics: [
      { id: 'lossDrop', label: '前段 Loss 降幅', value: plan.lossDrop, display: `${plan.lossDrop}%`, emphasis: true },
      { id: 'validSteps', label: '有效训练步', value: plan.validSteps, display: `${plan.validSteps} / 1000` },
      { id: 'reruns', label: '失败重跑', value: plan.reruns, display: `${plan.reruns} 次` },
      { id: 'estimatedCost', label: '预计成本', value: plan.cost, display: `${plan.cost} GPU·h` },
      { id: 'stabilityRisk', label: '稳定性风险', value: plan.risk, display: `${plan.risk} / 100` },
    ],
    costs: [
      { label: '有效算力', value: `${plan.cost} GPU·h` },
      { label: '失败重跑', value: `${plan.reruns} 次` },
      { label: '稳定性债务', value: `${plan.risk} / 100` },
    ],
    feedbackSource: '固定训练片段记录 loss、grad_norm、NaN 与重跑；失败步不应从成本账本中消失。',
    feedbackSignals: [`前段 Loss 降幅 ${plan.lossDrop}%`, `${plan.reruns} 次失败重跑`],
    nextTrainingAction: plan.risk > 30 ? '保留坏 batch，启用 warmup 与 grad clipping 后复跑' : '继续按异常 batch 切片监控 grad_norm',
    caution: '短窗口 Loss 下降更快不代表最终泛化更好；教学成本含失败重跑。',
  }
}
export function summarizeOptimizerStability(controls: ControlValues, evidence: DecisionEvidence): DecisionSummary {
  const plan = optimizerPlans[String(controls.schedule) as keyof typeof optimizerPlans] ?? optimizerPlans.guarded
  const metric = Object.fromEntries(evidence.metrics.map((item) => [item.id, item.display]))
  return { text: `训练策略：采用“${plan.label}”，前段 Loss 降幅 ${metric.lossDrop}，有效步 ${metric.validSteps}，重跑 ${metric.reruns}，稳定性风险 ${metric.stabilityRisk}。下一轮：${evidence.nextTrainingAction}。复盘问题：${optimizerQuestion}`, nextAction: evidence.nextTrainingAction }
}
export const optimizerStabilitySpec = defineStrategyCase({
  id: 'optimizer-stability', routeId: 'ai-decision-math', routeLabel: 'AI 决策数学', title: 'Loss 降得最快的训练方案，为什么最先崩？', question: optimizerQuestion, duration: '预计 3–5 分钟',
  background: '三个训练方案使用同一固定 batch 序列。大学习率前段下降最快，却出现梯度爆炸、NaN 与重跑。',
  feedback: '反馈来自逐步 loss、grad_norm 与失败原因；只保留成功 run 会系统性低估风险。',
  controls: [{ id: 'schedule', label: '优化策略', type: 'choice', options: Object.entries(optimizerPlans).map(([value, item]) => ({ value, label: item.label })) }],
  defaults: DEFAULT_OPTIMIZER,
  fixedDataTitle: '固定训练片段（step / loss / grad_norm / 事件）',
  fixedDataRows: ['100 / 2.10 / 3.2 / 正常', '240 / 1.42 / 8.7 / 震荡', '410 / 1.08 / 31.4 / clip 候选', '430 / NaN / ∞ / 重跑', '760 / 0.96 / 4.1 / 恢复'],
  compute: calculateOptimizerStability, summarize: summarizeOptimizerStability,
})
