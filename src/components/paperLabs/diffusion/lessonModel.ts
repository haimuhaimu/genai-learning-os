import { ddpmCompute } from './compute.ts'
import { GOLDEN_LESSON_STEPS, nextLessonStep } from '../shared/goldenLessonModel.ts'

export { nextLessonStep }
export const LESSON_STEPS = GOLDEN_LESSON_STEPS
export type RuleChoice = 'erase' | 'estimate'

const BASE_INPUT = { timestep: 40, totalSteps: 100, schedule: 'linear' as const, seed: 2026 }

export const REPAIR_CHOICES = [
  '把所有颗粒都擦掉，越干净越好',
  '先估计混进来的杂点，再按估计结果修复',
  '只把整张图调亮，不处理杂点',
] as const

export function getGuessFeedback(choice: number) {
  if (choice === 1) return {
    correct: true,
    title: '方向对了：先判断哪些是杂点',
    detail: '直接抹平会连同轮廓一起删掉；修复的关键是尽量猜准混进来的干扰。',
  }
  return {
    correct: false,
    title: choice === 0 ? '擦得太狠，真实轮廓也会一起消失' : '调亮改变了亮度，却没有分开图案和杂点',
    detail: '更可靠的方向是先估计干扰，再从受污染的图中扣除它。',
  }
}

export function getRuleFeedback(choice: RuleChoice) {
  if (choice === 'estimate') return {
    correct: true,
    title: '找到了：修得好不好，取决于杂点估得准不准',
    detail: '输入图和污染程度都没变；只提高估计准确度，重建就更接近原图。',
  }
  return {
    correct: false,
    title: '不是“擦得越多越好”',
    detail: '把轮廓误当成杂点会损坏内容。关键是估准，而不是无差别清除。',
  }
}

export function evaluateNoiseAccuracy(accuracy: number) {
  const normalized = Math.max(0, Math.min(100, accuracy))
  const predictionError = (100 - normalized) / 200
  const result = ddpmCompute({ ...BASE_INPUT, predictionError })
  const repaired = result.reconstructionError <= 0.02
  return {
    accuracy: normalized,
    computeInput: { ...BASE_INPUT, predictionError },
    noisySample: result.noisySample,
    reconstructed: result.reconstructed,
    reconstructionError: result.reconstructionError,
    repaired,
    decision: repaired ? '轮廓基本恢复' : '轮廓仍有明显变形',
    feedback: repaired ? '估计足够接近，扣除干扰后保住了原来的结构。' : '估计偏差仍大：有些杂点没扣掉，也可能误伤轮廓。',
  }
}

export const FINAL_PRINCIPLE = '先把干净图逐步变成受污染的图，再学习反向估计每一步混入的噪声，才能一步步还原结构。'
