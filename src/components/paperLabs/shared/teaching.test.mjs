import assert from 'node:assert/strict'
import test from 'node:test'
import { becauseTherefore, compareBaseline, getTeachingTaskCompletion } from './teaching.ts'
import { attentionCompute } from '../transformer/compute.ts'
import { dreamerCompute } from '../worldModel/compute.ts'


test('教学任务必须按基线、改旋钮、看结果三步全部完成', () => {
  assert.deepEqual(getTeachingTaskCompletion({ baselineReady: true, changedKnob: false, inspectedResult: false }), {
    completed: 1,
    total: 3,
    done: false,
    steps: [true, false, false],
  })
  assert.equal(getTeachingTaskCompletion({ baselineReady: true, changedKnob: true, inspectedResult: true }).done, true)
})

test('基线比较返回变化量和变化方向', () => {
  assert.deepEqual(compareBaseline(0.4, 0.55), { baseline: 0.4, current: 0.55, delta: 0.15000000000000002, direction: 'up' })
  assert.equal(compareBaseline(3, 1).direction, 'down')
  assert.equal(compareBaseline(2, 2).direction, 'same')
})

test('动态解释固定使用因为所以结构', () => {
  assert.equal(becauseTherefore('关键证据权重上升', '摘要更依赖该证据'), '因为关键证据权重上升，所以摘要更依赖该证据。')
})

test('关键教学关系保持确定：遮罩阻断未来，长推演累积更多误差', () => {
  const masked = attentionCompute({ queryPosition: 2, scaleDivisor: Math.sqrt(3), causal: true })
  const unmasked = attentionCompute({ queryPosition: 2, scaleDivisor: Math.sqrt(3), causal: false })
  assert.equal(masked.weights[3], 0)
  assert.ok(unmasked.weights[3] > 0)

  const short = dreamerCompute({ accuracy: 0.8, imaginationLength: 3, discount: 0.95 })
  const long = dreamerCompute({ accuracy: 0.8, imaginationLength: 8, discount: 0.95 })
  assert.ok(long.accumulatedError > short.accumulatedError)
  assert.equal(long.needsRealValidation, true)
})
