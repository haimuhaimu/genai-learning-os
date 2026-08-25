import assert from 'node:assert/strict'
import test from 'node:test'
import { LESSON_STEPS, evaluateExploration, getGuessFeedback, getRuleFeedback, nextLessonStep } from './lessonModel.ts'

test('Wide & Deep 黄金课按统一五关推进且不越界', () => {
  assert.deepEqual(LESSON_STEPS, ['先猜', '看 AI 犯错', '只改一个人话变量', '自己总结规律', '揭示论文术语与最小公式'])
  assert.equal(nextLessonStep(1), 2)
  assert.equal(nextLessonStep(4), 5)
  assert.equal(nextLessonStep(5), 5)
})

test('新作者首发猜题与规律题均返回正误反馈', () => {
  assert.equal(getGuessFeedback(1).correct, true)
  assert.equal(getGuessFeedback(0).correct, false)
  assert.match(getGuessFeedback(2).detail, /有限机会/)
  assert.equal(getRuleFeedback('balanced').correct, true)
  assert.equal(getRuleFeedback('history').correct, false)
})

test('探索力度两端通过原有计算产生不同的新作者首发决定', () => {
  const low = evaluateExploration(0)
  const high = evaluateExploration(100)
  assert.equal(low.computeInput.deepWeight, 0)
  assert.equal(high.computeInput.deepWeight, 2)
  assert.equal(low.launchesNewAuthor, false)
  assert.equal(high.launchesNewAuthor, true)
  assert.ok(high.coldProbability > low.coldProbability)
  assert.notEqual(low.decision, high.decision)
})

test('第 3 关存在可达的新作者首发通关状态', () => {
  const reachable = Array.from({ length: 101 }, (_, exploration) => evaluateExploration(exploration)).find((result) => result.launchesNewAuthor)
  assert.ok(reachable)
  assert.ok(reachable.coldProbability >= 0.5)
})
