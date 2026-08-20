import { defineStrategyCase } from './defineStrategyCase.ts'
import type { ControlValues, DecisionEvidence, DecisionSummary } from './types'

export const TEACHER_CAPABILITY = { fact: 92, reasoning: 88, style: 84 } as const
export const DEFAULT_DISTILL = { temperature: 2, alpha: .5, preset: '均衡' } as const
const weights: Record<string, [number, number, number]> = {
  均衡: [.34, .33, .33], 事实优先: [.55, .25, .20], 推理优先: [.22, .58, .20], 风格优先: [.22, .23, .55],
}

export function calculateDistill(controls: ControlValues): DecisionEvidence {
  const temperature = Number(controls.temperature)
  const alpha = Number(controls.alpha)
  const preset = String(controls.preset)
  const tempSweet = Math.exp(-Math.pow(Math.log2(temperature) - 1.35, 2) / 3.2)
  const darkKnowledge = alpha === 0 ? 0 : .9 + 4.8 * tempSweet * Math.sqrt(alpha)
  const overSmooth = temperature >= 8 ? 4.5 : temperature >= 4 ? 1.3 : 0
  const biasCopy = alpha * alpha * (temperature <= 2 ? 4.2 : 2.8)
  const fact = Math.max(0, 83 + darkKnowledge - overSmooth * .45 - biasCopy * .35)
  const reasoning = Math.max(0, 76 + darkKnowledge * 1.45 - overSmooth * 1.15 - biasCopy * .5)
  const style = Math.max(0, 80 + darkKnowledge * .9 - overSmooth * .55 - biasCopy * 1.35)
  const capability = [fact, reasoning, style]
  const selectedWeights = weights[preset] ?? weights.均衡
  const retention = capability.reduce((sum, value, index) => sum + value * selectedWeights[index], 0)
  const consistency = Math.min(98, 72 + alpha * 19 + tempSweet * 4 - overSmooth * .35)
  const trainingCost = 1 + temperature * .08 + alpha * .35
  const biasRisk = Math.min(100, 12 + alpha * 48 + (temperature === 1 ? 8 : 0) + (temperature === 8 ? 5 : 0))
  const labels = ['事实', '推理', '风格']
  const worstIndex = capability.indexOf(Math.min(...capability))
  const worst = labels[worstIndex]
  const action = `提高“${worst}”切片的数据配比，并保留独立能力评测`
  return {
    metrics: [
      { id: 'retention', label: '加权能力保留', value: retention, display: `${retention.toFixed(1)}%`, emphasis: true },
      { id: 'consistency', label: '教师一致率', value: consistency, display: `${consistency.toFixed(1)}%` },
      { id: 'worst', label: '最差能力', value: capability[worstIndex], display: `${worst} ${capability[worstIndex].toFixed(1)}%` },
      { id: 'cost', label: '训练成本', value: trainingCost, display: `${trainingCost.toFixed(2)}×` },
      { id: 'risk', label: '偏置放大风险', value: biasRisk, display: `${biasRisk.toFixed(0)} / 100` },
    ],
    costs: [
      { label: '事实 / 推理 / 风格', value: capability.map((value) => value.toFixed(1)).join(' / ') },
      { label: '教师基线', value: `${TEACHER_CAPABILITY.fact} / ${TEACHER_CAPABILITY.reasoning} / ${TEACHER_CAPABILITY.style}` },
      { label: '训练成本倍率', value: `${trainingCost.toFixed(2)}×` },
    ],
    feedbackSource: '固定能力切片分别记录事实、推理与风格保留；教师一致只描述平均模仿，不替代切片评测。',
    feedbackSignals: labels.map((label, index) => `${label}保留 ${capability[index].toFixed(1)}%`),
    nextTrainingAction: action,
    caution: consistency >= 90 && capability[worstIndex] < 82 ? '平均一致不等于关键能力保留：当前一致率较高，但最差能力仍明显落后。' : '温度过高会过度平滑；alpha 过高会复制教师偏差，alpha=0 则会丢失暗知识。',
  }
}

export function summarizeDistill(controls: ControlValues, evidence: DecisionEvidence): DecisionSummary {
  const metric = Object.fromEntries(evidence.metrics.map((item) => [item.id, item.display]))
  return { text: `蒸馏策略：T=${controls.temperature}，软标签权重 alpha=${Number(controls.alpha).toFixed(2)}，采用“${controls.preset}”能力权重。加权能力保留 ${metric.retention}，最差切片为 ${metric.worst}，教师一致率 ${metric.consistency}。下一轮：${evidence.nextTrainingAction}。`, nextAction: evidence.nextTrainingAction }
}

export const distillSpec = defineStrategyCase({
  id: 'distill-retention', routeId: 'distill', routeLabel: '模型蒸馏', title: '蒸馏：一致率提高，为什么能力反而下降？', question: '怎样同时看教师一致、关键能力保留与偏置风险？', duration: '预计 3–5 分钟',
  background: '学生越像老师，不代表关键能力保留得越好。温度与软硬标签权重会改变学生学到什么。',
  feedback: '反馈来自事实、推理与风格的独立能力切片；平均教师一致率不能替代切片评测。',
  controls: [
    { id: 'temperature', label: '温度 T', type: 'choice', options: [1, 2, 4, 8].map((value) => ({ value, label: String(value) })) },
    { id: 'alpha', label: '软标签权重 alpha', type: 'choice', options: [0, .25, .5, .75, 1].map((value) => ({ value, label: String(value) })) },
    { id: 'preset', label: '能力权重预设', type: 'select', options: ['均衡', '事实优先', '推理优先', '风格优先'].map((value) => ({ value, label: value })) },
  ], defaults: DEFAULT_DISTILL, fixedDataTitle: '教师与学生固定能力切片',
  fixedDataRows: ['教师：事实 92 / 推理 88 / 风格 84', 'alpha=0 只用硬标签，会丢失暗知识', 'T 过高会过度平滑；alpha 过高可能复制偏差'],
  compute: calculateDistill, summarize: summarizeDistill,
})
