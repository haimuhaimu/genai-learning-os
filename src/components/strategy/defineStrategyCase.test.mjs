import assert from 'node:assert/strict'
import test from 'node:test'
import { defineStrategyCase } from './defineStrategyCase.ts'

const validSpec = () => ({
  id: 'example-case', routeId: 'llm', routeLabel: 'LLM', title: '示例案例', question: '如何做选择？', duration: '预计 3 分钟',
  background: '固定背景。', feedback: '记录可见反馈。',
  controls: [
    { id: 'budget', label: '预算', type: 'range', min: 0, max: 10, step: 1 },
    { id: 'mode', label: '模式', type: 'choice', options: [{ value: 'safe', label: '稳健' }] },
    { id: 'enabled', label: '开启', type: 'toggle' },
  ],
  defaults: { budget: 5, mode: 'safe', enabled: true },
  fixedDataTitle: '固定数据', fixedDataRows: ['样本 A'],
  compute: () => ({ metrics: [], costs: [], feedbackSource: '日志', feedbackSignals: [], nextTrainingAction: '复核' }),
  summarize: () => ({ text: '摘要', nextAction: '复核' }),
})

test('defineStrategyCase 接受字段完整且默认值合法的 spec', () => {
  const spec = validSpec()
  assert.equal(defineStrategyCase(spec), spec)
})

test('defineStrategyCase 拒绝缺少必填字段', () => {
  const spec = validSpec()
  delete spec.background
  assert.throws(() => defineStrategyCase(spec), /background/)
})

test('defineStrategyCase 拒绝重复 control id', () => {
  const spec = validSpec()
  spec.controls.push({ ...spec.controls[0] })
  assert.throws(() => defineStrategyCase(spec), /Duplicate.*budget/)
})

test('defineStrategyCase 拒绝越界或不在选项中的默认值', () => {
  assert.throws(() => defineStrategyCase({ ...validSpec(), defaults: { budget: 11, mode: 'safe', enabled: true } }), /budget/)
  assert.throws(() => defineStrategyCase({ ...validSpec(), defaults: { budget: 5, mode: 'fast', enabled: true } }), /mode/)
})


test('defineStrategyCase 接受合法 mission，且无 mission 旧 spec 保持可用', () => {
  const legacy = validSpec()
  assert.equal(defineStrategyCase(legacy), legacy)
  const spec = validSpec()
  spec.compute = () => ({ metrics: [{ id: 'quality', label: '质量', value: 8, display: '8' }], costs: [], feedbackSource: '日志', feedbackSignals: [], nextTrainingAction: '复核' })
  spec.mission = { id: 'quality-mission', role: '负责人', objective: '控制质量与预算。', gates: [
    { id: 'quality', metricId: 'quality', operator: '>=', target: 8, label: '质量', returnControlId: 'budget' },
    { id: 'budget', metricId: 'quality', operator: '<=', target: 10, label: '预算', returnControlId: 'mode' },
  ], stressPresets: [{ id: 'tight-budget', label: '紧预算', description: '固定约束', overrides: { budget: 4 } }], capabilities: ['tradeoff-reasoning'], transferQuestion: '如何迁移？' }
  assert.equal(defineStrategyCase(spec), spec)
})

test('mission 校验错误包含案例 ID 与字段路径', () => {
  const mission = { id: 'bad', role: '负责人', objective: '目标', gates: [
    { id: 'a', metricId: 'missing', operator: '>=', target: 1, label: 'A', returnControlId: 'budget' },
    { id: 'b', metricId: 'missing', operator: '<=', target: 1, label: 'B', returnControlId: 'missing' },
  ], stressPresets: [{ id: 'stress', label: '压力', description: '固定', overrides: { budget: 99 } }], capabilities: ['tradeoff-reasoning'], transferQuestion: '迁移？' }
  assert.throws(() => defineStrategyCase({ ...validSpec(), mission }), /example-case.*mission\.gates\[0\]\.metricId/)
  const withMetric = { ...validSpec(), compute: () => ({ metrics: [{ id: 'quality', label: '质量', value: 1, display: '1' }], costs: [], feedbackSource: '', feedbackSignals: [], nextTrainingAction: '' }) }
  assert.throws(() => defineStrategyCase({ ...withMetric, mission: { ...mission, gates: mission.gates.map((gate) => ({ ...gate, metricId: 'quality' })) } }), /mission\.gates\[1\]\.returnControlId/)
  assert.throws(() => defineStrategyCase({ ...withMetric, mission: { ...mission, gates: mission.gates.slice(0, 1) } }), /mission\.gates/)
  assert.throws(() => defineStrategyCase({ ...withMetric, mission: { ...mission, gates: mission.gates.map((gate) => ({ ...gate, metricId: 'quality', returnControlId: 'budget' })), stressPresets: [{ ...mission.stressPresets[0], overrides: { budget: 99 } }] } }), /overrides\.budget/)
  assert.throws(() => defineStrategyCase({ ...withMetric, mission: { ...mission, gates: mission.gates.map((gate) => ({ ...gate, metricId: 'quality', returnControlId: 'budget' })), stressPresets: [{ ...mission.stressPresets[0], overrides: {} }], capabilities: ['score'] } }), /mission\.capabilities/)
})
