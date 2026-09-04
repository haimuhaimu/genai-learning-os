import assert from 'node:assert/strict'
import test from 'node:test'
import { computeExample } from './exampleCase.ts'

const controls = { reviewRate: 20, policy: 'balanced', explain: true }

function metric(evidence, id) {
  const item = evidence.metrics.find((candidate) => candidate.id === id)
  assert.ok(item, `缺少 ${id} 指标`)
  return item.value
}

test('提高复核率时收益与处理代价同时增加', () => {
  const baseline = computeExample(controls)
  const expanded = computeExample({ ...controls, reviewRate: 40 })

  assert.ok(metric(expanded, 'prevented-loss') > metric(baseline, 'prevented-loss'))
  assert.ok(metric(expanded, 'handling-cost') > metric(baseline, 'handling-cost'))
})

test('处理成本达到避免损失时触发停手动作', () => {
  const sustainable = computeExample({ ...controls, reviewRate: 40 })
  const excessive = computeExample({ ...controls, reviewRate: 80 })

  assert.doesNotMatch(sustainable.nextTrainingAction, /^停止/)
  assert.match(excessive.nextTrainingAction, /^停止/)
  assert.match(excessive.caution ?? '', /处理成本/)
})

test('复核率继续提高不保证净价值单调改善', () => {
  const balanced = computeExample({ ...controls, reviewRate: 40 })
  const saturated = computeExample({ ...controls, reviewRate: 80 })

  assert.ok(
    metric(saturated, 'prevented-loss') > metric(balanced, 'prevented-loss'),
    '扩大复核仍应多避免一些损失',
  )
  assert.ok(
    metric(saturated, 'net-value') < metric(balanced, 'net-value'),
    '边际收益饱和后，扩大复核应降低净价值',
  )
})
