import { attentionCompute } from './compute.ts'
import { GOLDEN_LESSON_STEPS, nextLessonStep, type LessonStep } from '../shared/goldenLessonModel.ts'

export { nextLessonStep }
export const LESSON_STEPS = GOLDEN_LESSON_STEPS
export type { LessonStep }
export type RuleChoice = 'context' | 'focus'

export const REFUND_EVIDENCE = [
  { speaker: '顾客', text: '我快急疯了，马上给我退钱！', role: '情绪表达' },
  { speaker: '支付系统', text: '订单 7842 在 19:42 和 19:43 各成功扣款 199 元。', role: '已核验的关键证据' },
  { speaker: '顾客', text: '我记得自己只买了一件商品。', role: '顾客陈述' },
  { speaker: '客服', text: '专员会在 24 小时内回复。', role: '处理承诺' },
] as const

export const FINAL_PRINCIPLE = 'Attention 不是让模型看到更多，而是围绕当前问题选择更重要的证据。'

export const PRINCIPLE_MAPPING = [
  { term: 'Query', chinese: '当前问题', example: '订单是否发生了重复扣款？' },
  { term: 'Key', chinese: '候选证据', example: '每句话提供“我可能与问题有关”的线索。' },
  { term: 'Value', chinese: '证据内容', example: '被选中后真正带入判断的信息。' },
] as const

export function getGuessFeedback(evidenceIndex: number) {
  if (evidenceIndex === 1) {
    return {
      correct: true,
      title: '选对了：这是可核验的交易事实',
      detail: '支付系统记录中的两笔成功扣款直接回答了“是否重复扣款”，比情绪强烈程度更能支持退款。',
    }
  }
  return {
    correct: false,
    title: '这条信息存在，但不能单独证明重复扣款',
    detail: '真正能改变退款判断的是支付系统记录：同一订单一分钟内出现两笔成功扣款。',
  }
}

export function getRuleFeedback(choice: RuleChoice) {
  if (choice === 'focus') {
    return {
      correct: true,
      title: '找到了：问题不在“没看见”',
      detail: '四句话一直都在输入里；改变关注重点后，结论才从暂缓退款变为退回重复扣款。',
    }
  }
  return {
    correct: false,
    title: '再想一步：四句话从未减少',
    detail: '上下文已经包含支付流水。AI 出错是因为把情绪当成主要依据，而不是因为上下文不够长。',
  }
}

export function evaluateEvidenceBalance(balance: number) {
  const normalized = Math.max(0, Math.min(100, balance))
  const computeInput = {
    queryPosition: 1,
    scaleDivisor: 0.5 + (normalized / 100) * 2.5,
    causal: false,
  }
  const result = attentionCompute(computeInput)
  const initialMistakeWeights = [0.42, 0.22, 0.2, 0.16]
  const mix = normalized / 100
  const weights = result.weights.map((weight, index) => weight * (1 - mix) + initialMistakeWeights[index] * mix)
  const attentionIndex = weights.indexOf(Math.max(...weights))
  const approvesRefund = attentionIndex === 1

  return {
    balance: normalized,
    computeInput,
    weights,
    attentionIndex,
    focus: REFUND_EVIDENCE[attentionIndex],
    approvesRefund,
    decision: approvesRefund ? '退回多扣的 199 元' : '暂缓退款，转人工等待',
    consequence: approvesRefund
      ? '核验交易事实后，重复扣款得到及时处理。'
      : '重复扣款没有被处理，顾客至少多等 24 小时。',
    feedback: approvesRefund
      ? '关注点回到了能回答问题的交易事实。'
      : 'AI 仍被强烈情绪带偏；继续向“关键证据”移动。',
  }
}
