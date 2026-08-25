import { distillationCompute } from './compute.ts'
import { GOLDEN_LESSON_STEPS, nextLessonStep } from '../shared/goldenLessonModel.ts'

export { nextLessonStep }
export const LESSON_STEPS = GOLDEN_LESSON_STEPS
export type RuleChoice = 'bigger' | 'boundary'

export const LAUNCH_CHOICES = [
  '只要平均一致率高，就把 3B 模型全部上线',
  '先检查高风险边界，并保留人工复核后小流量验证',
  '继续追求更像 70B 的单一答案，不看边界切片',
] as const

export const INTENT_LABELS = ['正常咨询', '可能违规', '信息不足', '必须复核'] as const

export function getGuessFeedback(choice: number) {
  if (choice === 1) return {
    correct: true,
    title: '选得稳：省成本不能拿边界风险换',
    detail: '70B 能力迁到 3B 后，成本和延迟会下降，但客服承诺与审核边界仍要单独验收并保留人工复核。',
  }
  return {
    correct: false,
    title: '平均像，不等于边界也学会了',
    detail: '小模型可能答对常见请求，却在相近选项和高风险切片上过度自信；上线前要检查边界。',
  }
}

export function getRuleFeedback(choice: RuleChoice) {
  if (choice === 'boundary') return {
    correct: true,
    title: '规律正确：中间区间同时保留答案与边界',
    detail: '摊开太少只剩赢家，摊开太多又抹平差异；中间档才能让 3B 模型看见“第一名为什么只比第二名更像”。',
  }
  return {
    correct: false,
    title: '不是越大越好',
    detail: '过度摊开会让四种处理方式越来越像，边界风险反而难分；应寻找可验收的中间区间。',
  }
}

export function evaluateHesitation(spread: number) {
  const result = distillationCompute({ temperature: spread })
  return {
    ...result,
    spread: result.temperature,
    pass: result.gate.canPass,
  }
}

export const FINAL_PRINCIPLE = '迁移能力时，既要教最可能的答案，也要保留相近答案之间的差距；信号太尖或太平都会丢掉边界。'
