import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateRag, DEFAULT_RAG } from './ragCase.ts'
import { calculateImage, DEFAULT_IMAGE } from './imageCase.ts'
import { calculateAgent, DEFAULT_AGENT } from './agentCase.ts'
import { calculateAgentBook, DEFAULT_AGENT_BOOK } from './agentBookCase.ts'
import { calculateDistill, DEFAULT_DISTILL } from './distillCase.ts'
import { calculateEvaluatorTrust, DEFAULT_EVALUATOR_TRUST } from './evaluatorTrustCase.ts'
import { calculateWorldModel, DEFAULT_SIMULATOR_VS_REALITY } from './worldModelCase.ts'

const calculators = [calculateRag, calculateImage, calculateAgent, calculateAgentBook, calculateDistill, calculateEvaluatorTrust, calculateWorldModel]
const defaults = [DEFAULT_RAG, DEFAULT_IMAGE, DEFAULT_AGENT, DEFAULT_AGENT_BOOK, DEFAULT_DISTILL, DEFAULT_EVALUATOR_TRUST, DEFAULT_SIMULATOR_VS_REALITY]
const metric = (result, id) => result.metrics.find((item) => item.id === id).value

function assertFiniteNonNegative(value) {
  for (const item of value.metrics) assert.ok(Number.isFinite(item.value) && item.value >= 0, `${item.id} 应为有限非负数`)
}

test('五案例默认策略快照稳定', () => {
  assert.deepEqual(calculateRag(DEFAULT_RAG).metrics.map((item) => item.display), ['80%', '33.3%', '1060', '480 ms', '¥0.031 / query'])
  assert.deepEqual(calculateImage(DEFAULT_IMAGE).metrics.map((item) => item.display), ['86.1%', '1.28', '¥0.268', '6.3 秒', '28.0%'])
  assert.deepEqual(calculateAgent(DEFAULT_AGENT).metrics.map((item) => item.display), ['11.76 单', '6.1 单', '16.0%', '28.1 秒', '¥4173'])
  assert.deepEqual(calculateAgentBook(DEFAULT_AGENT_BOOK).metrics.map((item) => item.display), ['70.1%', '891 / task', '1584 ms', '6.0%', '¥0.025'])
  assert.deepEqual(calculateDistill(DEFAULT_DISTILL).metrics.map((item) => item.display), ['83.6%', '85.3%', '推理 81.5%', '1.33×', '36 / 100'])
})

test('前沿探索案例默认快照稳定', () => {
  assert.deepEqual(calculateEvaluatorTrust(DEFAULT_EVALUATOR_TRUST).metrics.map((item) => item.display), ['85%', '22 / 100', '15%'])
  assert.deepEqual(calculateWorldModel(DEFAULT_SIMULATOR_VS_REALITY).metrics.map((item) => item.display), ['55 / 100', '25 / 100', '75 / 100'])
})

test('相同输入得到完全相同结果', () => {
  calculators.forEach((calculate, index) => assert.deepEqual(calculate(defaults[index]), calculate({ ...defaults[index] })))
})

test('边界组合输出有限且非负', () => {
  const results = [
    calculateRag({ k: 3, threshold: .8, mode: '摘录回答' }), calculateRag({ k: 20, threshold: .3, mode: '带引用生成' }),
    calculateImage({ resolution: 512, steps: 20, redraw: false }), calculateImage({ resolution: 1024, steps: 50, redraw: true }),
    calculateAgent({ gate: 'none', threshold: .3, explain: false }), calculateAgent({ gate: 'double', threshold: .9, explain: true }),
    calculateAgentBook({ topology: 'single', rounds: 1, verifier: 'none' }), calculateAgentBook({ topology: 'debate', rounds: 4, verifier: 'tool' }),
    calculateDistill({ temperature: 1, alpha: 0, preset: '均衡' }), calculateDistill({ temperature: 8, alpha: 1, preset: '推理优先' }),
    calculateEvaluatorTrust({ focus: 'cold-start-traffic' }), calculateEvaluatorTrust({ focus: 'moderation-policy' }),
    calculateWorldModel({ channel: 'real-ab' }), calculateWorldModel({ channel: 'world-model' }),
  ]
  results.forEach(assertFiniteNonNegative)
})

test('RAG 增加 k 提高覆盖但不保证证据精度', () => {
  const small = calculateRag({ ...DEFAULT_RAG, k: 3 })
  const large = calculateRag({ ...DEFAULT_RAG, k: 20 })
  assert.ok(metric(large, 'answerable') >= metric(small, 'answerable'))
  assert.ok(metric(large, 'precision') < metric(small, 'precision'))
  assert.ok(metric(large, 'tokens') > metric(small, 'tokens'))
})

test('图像重绘提高可用率，也增加请求成本和耗时', () => {
  const off = calculateImage({ ...DEFAULT_IMAGE, redraw: false })
  const on = calculateImage({ ...DEFAULT_IMAGE, redraw: true })
  assert.ok(metric(on, 'pass') > metric(off, 'pass'))
  assert.ok(metric(on, 'attempts') > metric(off, 'attempts'))
  assert.ok(metric(on, 'latency') > metric(off, 'latency'))
  assert.ok(Number(on.costs[1].value.slice(1)) > Number(off.costs[1].value.slice(1)))
})

test('Agent 双确认降低误退，但增加人工与时延', () => {
  const none = calculateAgent({ ...DEFAULT_AGENT, gate: 'none' })
  const double = calculateAgent({ ...DEFAULT_AGENT, gate: 'double' })
  assert.ok(metric(double, 'falseRefunds') < metric(none, 'falseRefunds'))
  assert.ok(metric(double, 'manual') > metric(none, 'manual'))
  assert.ok(metric(double, 'duration') > metric(none, 'duration'))
})

test('没有新信息时多 Agent 主要增加成本而非显著增加成功', () => {
  const single = calculateAgentBook({ topology: 'single', rounds: 2, verifier: 'rule' })
  const debate = calculateAgentBook({ topology: 'debate', rounds: 4, verifier: 'rule' })
  assert.ok(metric(debate, 'tokens') > metric(single, 'tokens'))
  assert.ok(metric(debate, 'latency') > metric(single, 'latency'))
  assert.ok(metric(debate, 'success') - metric(single, 'success') < 4)
  assert.ok(metric(debate, 'duplicate') > metric(single, 'duplicate'))
})

test('蒸馏教师一致率最高的组合不保证最差能力最高', () => {
  const highAgreement = calculateDistill({ temperature: 2, alpha: 1, preset: '均衡' })
  const balanced = calculateDistill({ temperature: 4, alpha: .5, preset: '均衡' })
  assert.ok(metric(highAgreement, 'consistency') > metric(balanced, 'consistency'))
  assert.ok(metric(highAgreement, 'worst') < metric(balanced, 'worst'))
})

test('Self-Evolving：主观越强的 evaluator 越难自动闭环', () => {
  const cold = calculateEvaluatorTrust({ focus: 'cold-start-traffic' })
  const moderation = calculateEvaluatorTrust({ focus: 'moderation-policy' })
  assert.ok(metric(cold, 'autoRatio') > metric(moderation, 'autoRatio'))
  assert.ok(metric(cold, 'driftRisk') < metric(moderation, 'driftRisk'))
  assert.ok(metric(cold, 'humanFallback') < metric(moderation, 'humanFallback'))
  assert.match(cold.caution ?? '', /早期/)
})

test('World Model：LLM 模拟便宜但真实性弱，真实 A/B 反过来', () => {
  const llm = calculateWorldModel({ channel: 'llm-sim' })
  const real = calculateWorldModel({ channel: 'real-ab' })
  assert.ok(metric(real, 'reality') > metric(llm, 'reality'))
  assert.ok(metric(real, 'cost') > metric(llm, 'cost'))
  assert.ok(metric(llm, 'scalability') > metric(real, 'scalability'))
  assert.match(llm.caution ?? '', /早期/)
})
