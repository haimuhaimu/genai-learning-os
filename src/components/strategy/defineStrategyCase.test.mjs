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
