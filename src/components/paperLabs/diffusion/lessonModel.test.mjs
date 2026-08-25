import assert from 'node:assert/strict'
import test from 'node:test'
import { LESSON_STEPS, evaluateNoiseAccuracy, getGuessFeedback, getRuleFeedback, nextLessonStep } from './lessonModel.ts'

test('DDPM 黄金课按统一五关推进且不越界', () => {
  assert.deepEqual(LESSON_STEPS, ['先猜', '看 AI 犯错', '只改一个人话变量', '自己总结规律', '揭示论文术语与最小公式'])
  assert.equal(nextLessonStep(1), 2)
  assert.equal(nextLessonStep(4), 5)
  assert.equal(nextLessonStep(5), 5)
})

test('图片修复猜题与规律题均返回正误反馈', () => {
  assert.equal(getGuessFeedback(1).correct, true)
  assert.equal(getGuessFeedback(0).correct, false)
  assert.match(getGuessFeedback(2).detail, /估计干扰/)
  assert.equal(getRuleFeedback('estimate').correct, true)
  assert.equal(getRuleFeedback('erase').correct, false)
})

test('估噪准确度两端复用 DDPM 计算并产生不同修复质量', () => {
  const low = evaluateNoiseAccuracy(0)
  const high = evaluateNoiseAccuracy(100)
  assert.equal(low.computeInput.predictionError, 0.5)
  assert.equal(high.computeInput.predictionError, 0)
  assert.deepEqual(low.noisySample, high.noisySample)
  assert.equal(low.repaired, false)
  assert.equal(high.repaired, true)
  assert.ok(high.reconstructionError < low.reconstructionError)
})

test('第 3 关存在可达的修复通关状态', () => {
  const reachable = Array.from({ length: 101 }, (_, accuracy) => evaluateNoiseAccuracy(accuracy)).find((result) => result.repaired)
  assert.ok(reachable)
  assert.ok(reachable.reconstructionError <= 0.02)
})
