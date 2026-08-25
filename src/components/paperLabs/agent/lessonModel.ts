import { reactCompute } from './compute.ts'
import { GOLDEN_LESSON_STEPS, nextLessonStep } from '../shared/goldenLessonModel.ts'

export { nextLessonStep }
export const LESSON_STEPS = GOLDEN_LESSON_STEPS
export type RuleChoice = 'confidence' | 'verify'

export const REFUND_CHOICES = [
  '相信顾客截图，立刻再退一次',
  '同时查订单与支付记录，有冲突就停下转人工',
  '只看客服之前写的备注',
] as const

export function getGuessFeedback(choice: number) {
  if (choice === 1) return {
    correct: true,
    title: '选得稳：先查事实，再决定是否执行',
    detail: '退款是不可随便重复的动作；两个系统冲突时，停下比猜一个答案更安全。',
  }
  return {
    correct: false,
    title: '这条依据不够：可能造成重复退款',
    detail: '截图或旧备注都不能代表当前支付状态，应该查订单与支付记录并处理冲突。',
  }
}

export function getRuleFeedback(choice: RuleChoice) {
  if (choice === 'verify') return {
    correct: true,
    title: '找到了：可靠性来自查证与及时停止',
    detail: '回答更自信并不会让事实更真；关键动作前要读取外部记录，冲突时不能继续自动执行。',
  }
  return {
    correct: false,
    title: '自信不是外部证据',
    detail: '即使说得很确定，只要没查当前订单状态，就仍可能把已退款订单再退一次。',
  }
}

export function evaluateVerification(strictness: number) {
  const normalized = Math.max(0, Math.min(100, strictness))
  const computeInput = normalized < 34
    ? { mode: 'direct' as const, conflict: true, toolsAvailable: true, budget: 1 }
    : normalized < 67
      ? { mode: 'react' as const, conflict: true, toolsAvailable: true, budget: 4 }
      : { mode: 'react' as const, conflict: true, toolsAvailable: true, budget: 6 }
  const result = reactCompute(computeInput)
  const safe = result.success && result.resolution === 'manual-review'
  return {
    strictness: normalized,
    computeInput,
    steps: result.steps,
    resolution: result.resolution,
    safe,
    decision: safe ? '暂停自动退款，转人工核验' : normalized < 34 ? '直接再次退款' : '查到冲突，但流程中途停住',
    feedback: safe ? '关键动作前完成查证；发现冲突后明确停止。' : normalized < 34 ? '还没有查系统，重复退款风险最高。' : '已经看到冲突，但还缺少进一步核验和明确停止。',
  }
}

export const FINAL_PRINCIPLE = '先形成下一步判断，再执行查询并读取结果；证据不足或相互冲突时，必须明确停止，而不是继续猜。'
