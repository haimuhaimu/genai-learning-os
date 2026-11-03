import assert from 'node:assert/strict'
import test from 'node:test'
import { getCapabilityLearningPlan } from './capabilityLearningPlan.ts'
import { calculateLearningCapabilities } from './progress.ts'
import { foundationNodes } from './foundationData.ts'
import { llmChapters, imageChapters } from './courseData.ts'
import { agentBookChapters, chapterProgressKey, agentBookLabIds, agentBookLabProgressKey, agentBookReviewIds, agentBookReviewProgressKey } from './agentBookData.ts'

test('实验能力只把进入实验阶段的节点作为证据', () => {
  const plan = getCapabilityLearningPlan({ softmax: 3, 'llm-attention': 2, 'img-diffusion': 4 }, 'experiment')
  assert.deepEqual(plan.evidence.map((item) => item.id), ['img-diffusion', 'softmax'])
  assert.ok(plan.nextSteps.some((item) => item.id === 'llm-attention'))
  assert.ok(plan.nextSteps.every((item) => item.stage < item.target))
})

test('工程严谨只使用 Agent 章节、实验与评审作为证据', () => {
  const plan = getCapabilityLearningPlan({ softmax: 4, 'agent-book-ch1': 2, 'agent-book-lab-kv-cache': 3 }, 'engineering')
  assert.deepEqual(new Set(plan.evidence.map((item) => item.id)), new Set(['agent-book-ch1', 'agent-book-lab-kv-cache']))
  assert.ok(plan.evidence.every((item) => item.page.startsWith('agent-book')))
})

test('空进度仍返回最多四步可执行补课路径', () => {
  const plan = getCapabilityLearningPlan({}, 'mechanism')
  assert.equal(plan.evidence.length, 0)
  assert.equal(plan.nextSteps.length, 4)
  assert.deepEqual(plan.nextSteps[0].options, { node: 'probability' })
})

test('分数分子与展示证据同源，路线广度每条路线只计一次', () => {
  const progress = { probability: 4, softmax: 4, 'llm-token': 2, 'img-space': 1, 'agent-book-ch1': 1, 'made-up': 4 }
  for (const capability of calculateLearningCapabilities(progress)) {
    const plan = getCapabilityLearningPlan(progress, capability.id)
    assert.equal(capability.covered, plan.evidence.length, capability.id)
    assert.equal(capability.score, Math.round(capability.covered / capability.total * 100), capability.id)
  }
  const breadth = getCapabilityLearningPlan(progress, 'breadth')
  assert.equal(breadth.evidence.length, 4)
  assert.equal(breadth.nextSteps.length, 0)
})

test('补课建议覆盖整个正式课程分母，优先候选完成后不出现虚假完成', () => {
  const plan = getCapabilityLearningPlan({ probability: 4, softmax: 4, 'llm-token': 4, 'llm-attention': 4, 'img-space': 4 }, 'mechanism')
  assert.equal(plan.nextSteps.length, 4)
  assert.ok(plan.nextSteps.some((item) => item.id === 'cross-entropy'))
  assert.ok(plan.nextSteps.every((item) => item.stage < item.target))
})

test('路线广度只建议尚未覆盖的路线，不要求已覆盖路线重复开始', () => {
  const plan = getCapabilityLearningPlan({ probability: 1, softmax: 4, 'llm-token': 1 }, 'breadth')
  assert.deepEqual(plan.nextSteps.map((item) => item.page), ['image', 'agent-book'])
})

test('正式课程每个已记录节点都可追溯，范围外记录不会抬高覆盖', () => {
  const ids = [
    ...foundationNodes.map((item) => item.id), ...llmChapters.map((item) => item.id), ...imageChapters.map((item) => item.id),
    ...agentBookChapters.map((item) => chapterProgressKey(item.id)), ...agentBookLabIds.map(agentBookLabProgressKey), ...agentBookReviewIds.map(agentBookReviewProgressKey),
  ]
  assert.equal(ids.length, 46)
  const progress = Object.fromEntries(ids.map((id) => [id, 4]))
  for (const capability of calculateLearningCapabilities(progress)) {
    const plan = getCapabilityLearningPlan(progress, capability.id)
    assert.equal(capability.score, 100, capability.id)
    assert.equal(capability.covered, plan.evidence.length, capability.id)
    assert.equal(plan.nextSteps.length, 0, capability.id)
    assert.ok(plan.evidence.every((item) => ids.includes(item.id)))
  }
  const outside = { 'paper-lab:attention-is-all-you-need': 4, 'k3:concept:goal': 4, 'k3:build:goal': 4 }
  for (const capability of calculateLearningCapabilities(outside)) {
    assert.equal(capability.score, 0)
    assert.deepEqual(getCapabilityLearningPlan(outside, capability.id).evidence, [])
  }
})

test('Agent 实验和评审只计直接卡片记录，不把联动章节或不支持的阶段重复计入', () => {
  const progress = { 'agent-book-ch1': 4, 'agent-book-lab-kv-cache': 3, 'agent-book-review-refund-rubric': 4 }
  assert.deepEqual(getCapabilityLearningPlan(progress, 'experiment').evidence.map((item) => item.id), ['agent-book-lab-kv-cache'])
  assert.deepEqual(getCapabilityLearningPlan(progress, 'judgment').evidence.map((item) => item.id), ['agent-book-review-refund-rubric'])
  const capabilities = calculateLearningCapabilities(progress)
  assert.equal(capabilities.find((item) => item.id === 'experiment').total, 31)
  assert.equal(capabilities.find((item) => item.id === 'judgment').total, 30)
  assert.ok(getCapabilityLearningPlan({}, 'experiment').nextSteps.every((item) => item.page !== 'agent-book-review'))
  assert.ok(getCapabilityLearningPlan({}, 'judgment').nextSteps.every((item) => item.page !== 'agent-book-lab'))
})

test('Agent 评审记录保留精确卡片深链，不把非默认卡片带回退款评审', () => {
  const plan = getCapabilityLearningPlan({ 'agent-book-review-coding-min-tools': 4 }, 'judgment')
  assert.deepEqual(plan.evidence[0].options, { card: 'coding-min-tools' })
})
