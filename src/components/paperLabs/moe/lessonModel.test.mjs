import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { FINAL_PRINCIPLE, LESSON_STEPS, evaluateBalanceConcern, getGuessFeedback, getRuleFeedback, nextLessonStep } from './lessonModel.ts'

test('MoE 黄金课按统一五关推进且不会越界', () => {
  assert.equal(LESSON_STEPS.length, 5)
  assert.equal(nextLessonStep(1), 2)
  assert.equal(nextLessonStep(4), 5)
  assert.equal(nextLessonStep(5), 5)
})

test('旋钮范围内存在可达 Go，低高两端失败', () => {
  assert.equal(evaluateBalanceConcern(0).pass, false)
  assert.equal(evaluateBalanceConcern(5).pass, true)
  assert.equal(evaluateBalanceConcern(10).pass, false)
  assert.ok(Array.from({ length: 11 }, (_, value) => evaluateBalanceConcern(value)).some(({ pass }) => pass))
})

test('猜题与规律题提供明确正误反馈', () => {
  assert.equal(getGuessFeedback(1).correct, true)
  assert.equal(getGuessFeedback(0).correct, false)
  assert.equal(getRuleFeedback('tradeoff').correct, true)
  assert.equal(getRuleFeedback('even').correct, false)
  assert.match(FINAL_PRINCIPLE, /中间区间/)
})

test('前四关延迟论文术语，到第五关才揭示', async () => {
  const source = await readFile(new URL('./SwitchTransformersLab.tsx', import.meta.url), 'utf8')
  const revealAt = source.indexOf('{step === 5')
  assert.ok(revealAt > 0, '必须保留第五关论文揭示边界')
  const earlyStages = source.slice(0, revealAt)
  const revealStage = source.slice(revealAt)
  for (const term of ['Router', 'Expert', 'Top-k', 'Top-1', 'Load balancing', 'Auxiliary loss', 'Capacity']) {
    assert.doesNotMatch(earlyStages, new RegExp(`\\b${term}\\b`, 'i'), `前四关不应出现论文术语 ${term}`)
  }
  for (const term of ['Router', 'Expert', 'Top-k routing', 'Load balancing', 'Auxiliary loss', 'Capacity']) {
    assert.match(revealStage, new RegExp(term, 'i'), `第五关应揭示论文术语 ${term}`)
  }
  assert.match(earlyStages, /分流器有多在乎别挤爆热门专席/)
})
