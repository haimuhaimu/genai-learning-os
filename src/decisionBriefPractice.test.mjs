import assert from 'node:assert/strict'
import test from 'node:test'
import { expertImageModules, expertLLMModules } from './expertData.ts'
import { agentExpertModules } from './agentExpertData.ts'
import { distillModules } from './distillData.ts'
import { buildDecisionBrief, computeDecisionBriefAnswer } from './components/course/decisionBriefMath.ts'

const practices = [...expertLLMModules, ...expertImageModules, ...agentExpertModules, ...distillModules]
  .map((module) => module.practice)
  .filter(Boolean)

const expectedAnswers = {
  'llm-kv-capacity': 156.25,
  'llm-serving-goodput': 75,
  'llm-evaluation-ci': 2.7833,
  'llm-safety-residual-risk': 20,
  'image-effective-cost': 2.5,
  'image-pipeline-yield': 83.08244,
  'agent-tool-idempotency': 90,
  'agent-security-asr': 1.5,
  'agent-trace-completeness': 75,
  'agent-cost-per-verified': 3,
  'distill-kd-loss': 0.68,
  'distill-data-recipe': 100,
  'distill-launch-cost': 55,
}

test('Decision Brief 覆盖至少 8 个高价值模块且标识唯一', () => {
  assert.ok(practices.length >= 8)
  assert.equal(practices.length, 13)
  assert.equal(new Set(practices.map((practice) => practice.id)).size, practices.length)
  const covered = new Set(practices.map((practice) => practice.id))
  Object.keys(expectedAnswers).forEach((id) => assert.ok(covered.has(id), `${id} 应被覆盖`))
})

test('每个练习具备业务输入、计算字段、四段模板、rubric 与修复动作', () => {
  practices.forEach((practice) => {
    assert.ok(practice.businessInput.length >= 20, `${practice.id} 缺少有效业务输入`)
    assert.ok(practice.facts.length >= 3, `${practice.id} 至少需要 3 条事实`)
    assert.ok(practice.calculation.question && practice.calculation.formula)
    assert.ok(practice.calculation.values.length >= 2)
    assert.ok(Number.isFinite(practice.calculation.tolerance) && practice.calculation.tolerance >= 0)
    assert.deepEqual(Object.keys(practice.template).sort(), ['decision', 'gate', 'metrics', 'nextStep'])
    Object.values(practice.template).forEach((value) => assert.ok(value.trim().length >= 12))
    assert.ok(practice.rubric.length >= 3, `${practice.id} rubric 不完整`)
    assert.ok(practice.pitfalls.length >= 2, `${practice.id} 常见错误不足`)
    practice.pitfalls.forEach((item) => {
      assert.ok(item.mistake.trim())
      assert.ok(item.fix.trim())
    })
  })
})

test('所有计算题默认答案确定且在容差内', () => {
  practices.forEach((practice) => {
    const actual = computeDecisionBriefAnswer(practice.calculation)
    const expected = expectedAnswers[practice.id]
    assert.ok(Number.isFinite(actual), `${practice.id} 结果应为有限数`)
    assert.ok(expected !== undefined, `${practice.id} 缺少独立答案断言`)
    assert.ok(Math.abs(actual - expected) <= Math.max(practice.calculation.tolerance, 0.0001), `${practice.id} 计算结果 ${actual} 不正确`)
  })
})

test('rubric 覆盖决策、指标、闸门与下一步交付', () => {
  practices.forEach((practice) => {
    const text = practice.rubric.join('')
    for (const keyword of ['决策', '指标', '闸门', '下一步']) {
      assert.match(text, new RegExp(keyword), `${practice.id} rubric 应包含${keyword}`)
    }
  })
})


test('kd-loss 使用显式蒸馏损失分支', () => {
  const answer = computeDecisionBriefAnswer({
    method: 'kd-loss',
    values: [0.4, 0.8, 2, 0.15],
  })
  assert.equal(answer, 0.68)
})

test('未知计算方法抛出包含方法名的明确错误', () => {
  assert.throws(
    () => computeDecisionBriefAnswer({ method: 'mystery-method', values: [1, 2] }),
    /未知 Decision Brief 计算方法：mystery-method/,
  )
})


test('复制简报内容使用用户当前数值答案而非参考答案', () => {
  const practice = practices.find((item) => item.id === 'distill-kd-loss')
  const brief = buildDecisionBrief(practice, practice.template, 0.689)

  assert.match(brief, /计算：.+ = 0\.69/)
  assert.doesNotMatch(brief, /计算：.+ = 0\.68/)
})
