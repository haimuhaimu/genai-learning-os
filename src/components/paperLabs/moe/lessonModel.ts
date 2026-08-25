import { GOLDEN_LESSON_STEPS, nextLessonStep } from '../shared/goldenLessonModel.ts'
import { moeCompute } from './compute.ts'

export { nextLessonStep }
export const LESSON_STEPS = GOLDEN_LESSON_STEPS
export type RuleChoice = 'even' | 'tradeoff'

export const LAUNCH_CHOICES = [
  '全部交给最常被选中的专席，平均质量最高就上线',
  '同时验收匹配质量、漏接率、等待时间与各专席忙闲程度',
  '强制四个专席每人处理完全相同数量，不看擅长方向',
] as const

export function getGuessFeedback(choice: number) {
  return choice === 1
    ? { correct: true, title: '选得稳：平均分配和准确处理都不是单独目标', detail: '必须把匹配质量、爆仓漏接、等待和成本放进同一张上线账本。' }
    : { correct: false, title: '单看一个平均数会藏住失败', detail: '热门专席可能爆仓；强行平均又可能把请求交给不擅长的人。' }
}

export function getRuleFeedback(choice: RuleChoice) {
  return choice === 'tradeoff'
    ? { correct: true, title: '规律正确：要找可验收的中间区间', detail: '太不在乎拥堵会漏接，太在乎平均会牺牲匹配质量。' }
    : { correct: false, title: '平均不是终点', detail: '每个专席一样忙并不保证请求被正确处理，还要守住匹配质量。' }
}

export function evaluateBalanceConcern(value: number) {
  const result = moeCompute(value)
  return { ...result, pass: result.gate === 'Go' }
}

export const FINAL_PRINCIPLE = '好的分流不是把请求平均摊开，而是在专长匹配与承载能力之间找到可验收的中间区间。'
