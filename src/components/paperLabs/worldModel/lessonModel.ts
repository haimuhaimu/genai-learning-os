import { dreamerCompute } from './compute.ts'
import { GOLDEN_LESSON_STEPS, nextLessonStep } from '../shared/goldenLessonModel.ts'

export { nextLessonStep }
export const LESSON_STEPS = GOLDEN_LESSON_STEPS
export type RuleChoice = 'scale' | 'validate'

const BASE_INPUT = { accuracy: 0.8, discount: 0.95 }

export const ROI_CHOICES = [
  '仿真 ROI 很高，立刻全量放大',
  '先用 1% 真实流量验证，再决定是否加量',
  '继续只跑更长的仿真，直到结果稳定',
] as const

export function getGuessFeedback(choice: number) {
  if (choice === 1) return {
    correct: true,
    title: '选得稳：仿真负责筛选，真实小流量负责验收',
    detail: '模拟环境每一步只差一点，连续推演后也可能高估收益；先小流量能控制回撤。',
  }
  return {
    correct: false,
    title: choice === 0 ? '太快了：高 ROI 可能来自误差累积' : '跑得更长，不会自动让模拟更接近真实',
    detail: '更稳妥的是先用仿真筛方案，再用可回退的真实小流量确认。',
  }
}

export function getRuleFeedback(choice: RuleChoice) {
  if (choice === 'validate') return {
    correct: true,
    title: '找到了：推得越远，越要警惕小错累积',
    detail: '短期看似准确的小偏差会沿后续步骤叠加；真实验证是上线护栏。',
  }
  return {
    correct: false,
    title: '单看模拟收益，容易忽略它是怎样算出来的',
    detail: '当推演变长，模型自己的小偏差会参与下一步预测，漂亮结果也可能越来越不可靠。',
  }
}

export function evaluateRolloutLength(length: number) {
  const normalized = Math.max(1, Math.min(12, Math.round(length)))
  const computeInput = { ...BASE_INPUT, imaginationLength: normalized }
  const result = dreamerCompute(computeInput)
  return {
    length: normalized,
    computeInput,
    imaginedReturn: result.imaginedReturn,
    realReturn: result.realReturn,
    returnBias: result.returnBias,
    accumulatedError: result.accumulatedError,
    needsRealValidation: result.needsRealValidation,
    decision: result.needsRealValidation ? '先做 1% 真实流量验证' : '可继续短距离筛选方案',
    feedback: result.needsRealValidation ? '推演已到第 6 步之后：按产品护栏，不能直接放量。' : '当前只做短距离筛选；真正上线前仍需真实验证。',
  }
}

export const FINAL_PRINCIPLE = '模型可以在内部模拟未来来筛选行动，但推演越长，小偏差越可能累积；模拟收益必须与真实验证分工。'
