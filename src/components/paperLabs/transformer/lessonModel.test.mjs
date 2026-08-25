import assert from 'node:assert/strict'
import test from 'node:test'
import {
  FINAL_PRINCIPLE,
  LESSON_STEPS,
  PRINCIPLE_MAPPING,
  evaluateEvidenceBalance,
  getGuessFeedback,
  getRuleFeedback,
  nextLessonStep,
} from './lessonModel.ts'

test('黄金样板课按五关顺序推进且不会越过终点', () => {
  assert.deepEqual(LESSON_STEPS, ['先猜', '看 AI 犯错', '只改一个人话变量', '自己总结规律', '揭示论文术语与最小公式'])
  assert.equal(nextLessonStep(1), 2)
  assert.equal(nextLessonStep(4), 5)
  assert.equal(nextLessonStep(5), 5)
})

test('证据选择对正确与错误答案提供明确即时反馈', () => {
  assert.equal(getGuessFeedback(1).correct, true)
  assert.match(getGuessFeedback(1).detail, /支付系统记录/)
  assert.equal(getGuessFeedback(0).correct, false)
  assert.match(getGuessFeedback(0).title, /不能单独证明/)
})

test('规律选择对正确与错误答案均给出解释并允许继续', () => {
  assert.equal(getRuleFeedback('focus').correct, true)
  assert.match(getRuleFeedback('focus').detail, /四句话一直都在输入里/)
  assert.equal(getRuleFeedback('context').correct, false)
  assert.match(getRuleFeedback('context').detail, /上下文已经包含支付流水/)
})

test('旋钮两端产生不同关注句与退款结果', () => {
  const focused = evaluateEvidenceBalance(0)
  const broad = evaluateEvidenceBalance(100)
  assert.equal(focused.computeInput.queryPosition, broad.computeInput.queryPosition)
  assert.equal(focused.computeInput.scaleDivisor, 0.5)
  assert.equal(broad.computeInput.scaleDivisor, 3)
  assert.equal(focused.attentionIndex, 1)
  assert.equal(focused.approvesRefund, true)
  assert.equal(broad.attentionIndex, 0)
  assert.equal(broad.approvesRefund, false)
  assert.notEqual(focused.decision, broad.decision)
})

test('最终规律完整映射到 Query、Key、Value', () => {
  assert.equal(FINAL_PRINCIPLE, 'Attention 不是让模型看到更多，而是围绕当前问题选择更重要的证据。')
  assert.deepEqual(PRINCIPLE_MAPPING.map(({ term, chinese }) => [term, chinese]), [
    ['Query', '当前问题'],
    ['Key', '候选证据'],
    ['Value', '证据内容'],
  ])
})

test('第 3 关存在可达的关注证据通关状态', () => {
  const reachable = Array.from({ length: 101 }, (_, balance) => evaluateEvidenceBalance(balance)).find((result) => result.approvesRefund)
  assert.ok(reachable)
  assert.equal(reachable.attentionIndex, 1)
})
