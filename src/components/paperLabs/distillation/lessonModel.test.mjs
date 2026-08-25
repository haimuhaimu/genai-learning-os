import assert from 'node:assert/strict'
import test from 'node:test'
import {
  FINAL_PRINCIPLE,
  LESSON_STEPS,
  evaluateHesitation,
  getGuessFeedback,
  getRuleFeedback,
  nextLessonStep,
} from './lessonModel.ts'

test('蒸馏黄金课按统一五关推进且不会越界', () => {
  assert.deepEqual(LESSON_STEPS, ['先猜', '看 AI 犯错', '只改一个人话变量', '自己总结规律', '揭示论文术语与最小公式'])
  assert.equal(nextLessonStep(1), 2)
  assert.equal(nextLessonStep(4), 5)
  assert.equal(nextLessonStep(5), 5)
})

test('中间区间可通关，低温和高温均不能通关', () => {
  assert.equal(evaluateHesitation(0.5).pass, false)
  assert.equal(evaluateHesitation(0.5).gate.label, '学到了答案')
  assert.equal(evaluateHesitation(2).pass, true)
  assert.equal(evaluateHesitation(2).gate.label, '学到了边界')
  assert.equal(evaluateHesitation(8).pass, false)
  assert.equal(evaluateHesitation(8).gate.label, '信号摊得太平')
  const reachable = Array.from({ length: 16 }, (_, index) => evaluateHesitation(0.5 + index * 0.5)).filter(({ pass }) => pass)
  assert.ok(reachable.length > 1)
  assert.ok(reachable.every(({ spread }) => spread > 0.5 && spread < 8))
})

test('猜题和规律题都有明确正误反馈', () => {
  assert.equal(getGuessFeedback(1).correct, true)
  assert.equal(getGuessFeedback(0).correct, false)
  assert.equal(getRuleFeedback('boundary').correct, true)
  assert.equal(getRuleFeedback('bigger').correct, false)
  assert.match(getRuleFeedback('boundary').detail, /中间档/)
  assert.match(FINAL_PRINCIPLE, /太尖或太平/)
})
