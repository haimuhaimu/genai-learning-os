import assert from 'node:assert/strict'
import test from 'node:test'
import { applyK3Guide, checkK3Answer, emptyK3Draft, estimateWeightMemory, sanitizeK3Draft, validateK3Step } from './k3BuildLearning.ts'

test('K3 任务定义必须包含输入输出与两条失败标准', () => {
  const draft = emptyK3Draft()
  assert.ok(validateK3Step('goal', draft).length >= 2)
  draft.goal = { task: '为运营同学总结一篇长文并输出结构化结论', input: '一段需要处理的中文长文本', output: '包含摘要和风险判断的 JSON', failure: '遗漏核心结论\n输出格式错误' }
  assert.deepEqual(validateK3Step('goal', draft), [])
})

test('K3 模型选择必须预留运行空间', () => {
  const draft = emptyK3Draft()
  draft.model = { parameters: '7', bits: '16', capacity: '8' }
  assert.equal(validateK3Step('model', draft).length, 1)
  draft.model = { parameters: '3', bits: '4', capacity: '8' }
  assert.deepEqual(validateK3Step('model', draft), [])
  assert.ok(estimateWeightMemory('3', '4') > 1)
})

test('K3 API 合同校验 JSON 结构', () => {
  const draft = emptyK3Draft()
  draft.api = { request: '{"prompt":"你好"}', response: '{"text":"你好"}', contract: '超时十秒，最大输出五百字，失败时返回明确错误码。' }
  assert.deepEqual(validateK3Step('api', draft), [])
  draft.api.request = 'not json'
  assert.equal(validateK3Step('api', draft).length, 1)
})

test('K3 评测至少需要十条样本和复盘', () => {
  const draft = emptyK3Draft()
  draft.evaluate = { samples: Array.from({ length: 10 }, (_, index) => `问题${index + 1}\t预期${index + 1}`).join('\n'), review: '格式通过，但拒答边界仍需补充高风险样本，并继续记录每次调用的耗时和成本。' }
  assert.deepEqual(validateK3Step('evaluate', draft), [])
})

test('K3 草稿只保留白名单字符串字段', () => {
  const clean = sanitizeK3Draft({ goal: { task: '任务', unknown: '忽略' }, api: 'bad', __proto__: { polluted: true } })
  assert.equal(clean.goal.task, '任务')
  assert.equal('unknown' in clean.goal, false)
  assert.deepEqual(clean.api, { request: '', response: '', contract: '' })
})

test('引导模式能为非技术用户生成可直接继续的步骤', () => {
  let draft = emptyK3Draft()
  const choices = { scenario: 'summary', device: 'mac', focus: 'format' }
  for (const id of ['goal', 'runtime', 'model', 'infer', 'api', 'evaluate']) {
    draft = applyK3Guide(id, draft, choices)
    assert.deepEqual(validateK3Step(id, draft), [])
  }
  assert.match(draft.goal.task, /运营同学/)
  assert.equal(draft.runtime.stack, 'Ollama')
  assert.equal(draft.evaluate.samples.split('\n').length, 10)
})

test('六关问题都有唯一正确答案', () => {
  const answers = {
    goal: 'goal', runtime: 'runner', model: 'no',
    infer: 'metric', api: 'contract', evaluate: 'compare'
  }
  for (const [id, answer] of Object.entries(answers)) {
    assert.equal(checkK3Answer(id, answer), true)
    assert.equal(checkK3Answer(id, 'wrong'), false)
  }
})
