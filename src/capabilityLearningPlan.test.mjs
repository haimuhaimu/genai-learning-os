import assert from 'node:assert/strict'
import test from 'node:test'
import { getCapabilityLearningPlan } from './capabilityLearningPlan.ts'

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
