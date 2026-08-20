import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateRag, DEFAULT_RAG } from './ragCase.ts'
import { calculateImage, DEFAULT_IMAGE } from './imageCase.ts'
import { calculateAgent, DEFAULT_AGENT } from './agentCase.ts'
import { calculateAgentBook, DEFAULT_AGENT_BOOK } from './agentBookCase.ts'
import { calculateDistill, DEFAULT_DISTILL } from './distillCase.ts'
import { calculateEvaluatorTrust, DEFAULT_EVALUATOR_TRUST, summarizeEvaluatorTrust } from './evaluatorTrustCase.ts'
import { calculateWorldModel, DEFAULT_SIMULATOR_VS_REALITY, summarizeWorldModel } from './worldModelCase.ts'

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
  assert.deepEqual(calculateEvaluatorTrust(DEFAULT_EVALUATOR_TRUST).metrics.map((item) => item.display), ['3.1%', '94.6%', '50 / 千次', '236 人次 / 千次'])
  assert.deepEqual(calculateWorldModel(DEFAULT_SIMULATOR_VS_REALITY).metrics.map((item) => item.display), ['49.7%', '461 等价样本', '31.4 / 100', '1.2 天'])
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
    calculateEvaluatorTrust({ focus: 'cold-start-traffic', calibrationStrength: 0, policyCorrelation: 0, auditRate: .05, stopThreshold: 10 }),
    calculateEvaluatorTrust({ focus: 'moderation-policy', calibrationStrength: 1, policyCorrelation: 1, auditRate: .5, stopThreshold: 200 }),
    calculateEvaluatorTrust({ focus: 'unknown', calibrationStrength: -99, policyCorrelation: 99, auditRate: -1, stopThreshold: Infinity }),
    calculateWorldModel({ channel: 'real-ab', minimumEffect: 1, sampleSize: 200, simulationReliability: .4, rollbackCost: 10 }),
    calculateWorldModel({ channel: 'world-model', minimumEffect: 10, sampleSize: 5000, simulationReliability: .95, rollbackCost: 100 }),
    calculateWorldModel({ channel: 'unknown', minimumEffect: -1, sampleSize: Infinity, simulationReliability: 99, rollbackCost: -1 }),
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

test('Self-Evolving：校准、独立性与审计形成预期方向', () => {
  const weakCalibration = calculateEvaluatorTrust({ ...DEFAULT_EVALUATOR_TRUST, calibrationStrength: 0 })
  const strongCalibration = calculateEvaluatorTrust({ ...DEFAULT_EVALUATOR_TRUST, calibrationStrength: 1 })
  const independent = calculateEvaluatorTrust({ ...DEFAULT_EVALUATOR_TRUST, policyCorrelation: 0 })
  const correlated = calculateEvaluatorTrust({ ...DEFAULT_EVALUATOR_TRUST, policyCorrelation: 1 })
  const lowAudit = calculateEvaluatorTrust({ ...DEFAULT_EVALUATOR_TRUST, auditRate: .05 })
  const highAudit = calculateEvaluatorTrust({ ...DEFAULT_EVALUATOR_TRUST, auditRate: .5 })

  assert.ok(metric(strongCalibration, 'ece') < metric(weakCalibration, 'ece'))
  assert.ok(metric(strongCalibration, 'agreement') > metric(weakCalibration, 'agreement'))
  assert.ok(metric(strongCalibration, 'auditCost') > metric(weakCalibration, 'auditCost'))
  assert.ok(metric(correlated, 'ece') > metric(independent, 'ece'))
  assert.ok(metric(correlated, 'missedRisk') > metric(independent, 'missedRisk'))
  assert.ok(metric(highAudit, 'missedRisk') < metric(lowAudit, 'missedRisk'))
  assert.ok(metric(highAudit, 'auditCost') > metric(lowAudit, 'auditCost'))
})

test('Self-Evolving：摘要明确证据、停手条件与下一轮采样', () => {
  const safeControls = { ...DEFAULT_EVALUATOR_TRUST, stopThreshold: 200 }
  const riskyControls = { ...DEFAULT_EVALUATOR_TRUST, focus: 'moderation-policy', policyCorrelation: 1, auditRate: .05, stopThreshold: 10 }
  const safe = summarizeEvaluatorTrust(safeControls, calculateEvaluatorTrust(safeControls))
  const risky = summarizeEvaluatorTrust(riskyControls, calculateEvaluatorTrust(riskyControls))

  assert.match(safe.text, /证据可信度/)
  assert.match(safe.text, /未触发/)
  assert.match(risky.text, /已触发/)
  assert.match(risky.text, /下一轮采样动作/)
})

test('World Model：样本、可信度与回滚代价形成预期方向', () => {
  const small = calculateWorldModel({ ...DEFAULT_SIMULATOR_VS_REALITY, channel: 'world-model', sampleSize: 200 })
  const large = calculateWorldModel({ ...DEFAULT_SIMULATOR_VS_REALITY, channel: 'world-model', sampleSize: 5000 })
  const weakSimulation = calculateWorldModel({ ...DEFAULT_SIMULATOR_VS_REALITY, channel: 'world-model', simulationReliability: .4 })
  const strongSimulation = calculateWorldModel({ ...DEFAULT_SIMULATOR_VS_REALITY, channel: 'world-model', simulationReliability: .95 })
  const cheapRollback = calculateWorldModel({ ...DEFAULT_SIMULATOR_VS_REALITY, channel: 'world-model', rollbackCost: 10 })
  const costlyRollback = calculateWorldModel({ ...DEFAULT_SIMULATOR_VS_REALITY, channel: 'world-model', rollbackCost: 100 })

  assert.ok(metric(large, 'confidence') > metric(small, 'confidence'))
  assert.ok(metric(large, 'feedbackDelay') > metric(small, 'feedbackDelay'))
  assert.ok(metric(strongSimulation, 'confidence') > metric(weakSimulation, 'confidence'))
  assert.ok(metric(strongSimulation, 'misjudgmentCost') < metric(weakSimulation, 'misjudgmentCost'))
  assert.ok(metric(costlyRollback, 'misjudgmentCost') > metric(cheapRollback, 'misjudgmentCost'))
})

test('World Model：摘要在门槛两侧给出明确停手动作', () => {
  const riskyControls = { ...DEFAULT_SIMULATOR_VS_REALITY, channel: 'llm-sim', sampleSize: 200, simulationReliability: .4, rollbackCost: 100 }
  const safeControls = { ...DEFAULT_SIMULATOR_VS_REALITY, channel: 'real-ab', minimumEffect: 10, sampleSize: 5000, rollbackCost: 10 }
  const risky = summarizeWorldModel(riskyControls, calculateWorldModel(riskyControls))
  const safe = summarizeWorldModel(safeControls, calculateWorldModel(safeControls))

  assert.match(risky.text, /已触发，禁止扩大真实流量/)
  assert.match(safe.text, /未触发，仅进入可回滚小流量验证/)
  assert.match(safe.text, /证据可信度/)
  assert.match(safe.text, /下一轮采样动作/)
})


test('Self-Evolving：停手原因同时展示当前值、阈值与具体触发项', () => {
  const missedOnly = calculateEvaluatorTrust({ ...DEFAULT_EVALUATOR_TRUST, stopThreshold: 10 })
  const eceOnly = calculateEvaluatorTrust({
    ...DEFAULT_EVALUATOR_TRUST,
    focus: 'monetization-recommendation',
    calibrationStrength: 0,
    policyCorrelation: .5,
    auditRate: .5,
    stopThreshold: 200,
  })
  const missedReason = missedOnly.costs.find((item) => item.label === '停手条件').value
  const eceReason = eceOnly.costs.find((item) => item.label === '停手条件').value

  assert.match(missedReason, /已触发（漏错风险）/)
  assert.match(missedReason, /当前漏错风险 .+阈值 10 \/ 千次，已达到/)
  assert.match(missedReason, /当前 ECE .+阈值 10\.0%，未达到/)
  assert.match(eceReason, /已触发（ECE）/)
  assert.match(eceReason, /当前漏错风险 .+阈值 200 \/ 千次，未达到/)
  assert.match(eceReason, /当前 ECE .+阈值 10\.0%，已达到/)
})

test('Self-Evolving：明确区分 ECE 实样本与一致率教学估计来源', () => {
  const evidence = calculateEvaluatorTrust(DEFAULT_EVALUATOR_TRUST)
  const ece = evidence.metrics.find((item) => item.id === 'ece')
  const agreement = evidence.metrics.find((item) => item.id === 'agreement')

  assert.match(ece.hint, /100 条.+分桶.+人工复核样本/)
  assert.match(agreement.hint, /课堂教学估计/)
  assert.match(agreement.hint, /不是.+直接实测值/)
  assert.match(evidence.feedbackSource, /ECE 证据来源/)
  assert.match(evidence.feedbackSource, /一致率来源/)
})

test('World Model：披露教学近似与等价真实验证折算口径', () => {
  const evidence = calculateWorldModel(DEFAULT_SIMULATOR_VS_REALITY)
  const confidence = evidence.metrics.find((item) => item.id === 'confidence')
  const validation = evidence.metrics.find((item) => item.id === 'realValidationCost')
  const baseline = evidence.costs.find((item) => item.label === '教学近似基线')

  assert.match(confidence.label, /教学近似/)
  assert.match(confidence.hint, /不是.+正式统计功效分析/)
  assert.equal(validation.label, '等价真实验证折算量')
  assert.match(validation.display, /等价样本/)
  assert.match(validation.hint, /不等同于直接触达的真实用户数/)
  assert.match(baseline.value, /2 × \(100 \/ MDE百分数\)\^2/)
  assert.match(baseline.value, /不是正式 power analysis/)
})
