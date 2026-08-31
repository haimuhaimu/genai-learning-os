import assert from 'node:assert/strict'
import test from 'node:test'
import { answerWithContext, applyK3Guide, buildChatMessages, emptyK3Draft, estimateWeightMemory, K3_EXPERIMENTS, predictNextToken, routeK3Token, sanitizeK3Draft, tokenizeForLearning, trainingPrediction, validateK3Step } from './k3BuildLearning.ts'

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

test('六关实验保持旧 id，并按指定主题排列', () => {
  assert.deepEqual(K3_EXPERIMENTS.map(({ id }) => id), ['goal', 'runtime', 'model', 'infer', 'api', 'evaluate'])
  assert.deepEqual(K3_EXPERIMENTS.map(({ title }) => title), ['Token 化', '预测下一个 Token', '训练前后对比', '上下文影响', '续写变聊天', '回看 K3'])
  assert.ok(K3_EXPERIMENTS.every(({ conclusion, details }) => conclusion.length > 10 && details.length > 10))
})

test('Token 化与下一个 Token 预测给出稳定、可观察的结果', () => {
  assert.deepEqual(tokenizeForLearning('AI 很有趣！'), ['AI', '很', '有', '趣', '！'])
  const candidates = predictNextToken('今天的天气很')
  assert.equal(candidates[0].token, '好')
  assert.equal(candidates.reduce((sum, item) => sum + item.score, 0), 100)
})

test('训练轮次会提高正确答案的分数', () => {
  const before = trainingPrediction(0)
  const after = trainingPrediction(10)
  assert.ok(after[0].score > before[0].score)
  assert.equal(after.reduce((sum, item) => sum + item.score, 0), 100)
})

test('上下文和消息角色会改变展示结果', () => {
  assert.notEqual(answerWithContext(false), answerWithContext(true))
  const brief = buildChatMessages('brief')
  const friendly = buildChatMessages('friendly')
  assert.deepEqual(brief.map(({ role }) => role), ['system', 'user', 'assistant'])
  assert.notEqual(brief[2].content, friendly[2].content)
})

test('K3 路由每次只选择 896 位专家中的 16 位', () => {
  const experts = routeK3Token('代码', 1)
  assert.equal(experts.length, 16)
  assert.equal(new Set(experts).size, 16)
  assert.ok(experts.every((id) => id >= 1 && id <= 896))
})
