import assert from 'node:assert/strict'
import test from 'node:test'
import { centerCaseCatalog, strategyCaseCatalog } from './caseCatalog.ts'
import {
  calculateContextWindow,
  calculateRagChunking,
  DEFAULT_CONTEXT_WINDOW,
  DEFAULT_RAG_CHUNKING,
} from './mechanismCases.ts'

const metric = (result, id) => result.metrics.find((item) => item.id === id).value
const assertFiniteNonNegative = (result) => result.metrics.forEach((item) => {
  assert.ok(Number.isFinite(item.value), `${item.id} 应为有限数`)
  assert.ok(item.value >= 0, `${item.id} 应为非负数`)
})

test('两个机制案例默认快照稳定', () => {
  assert.deepEqual(calculateContextWindow(DEFAULT_CONTEXT_WINDOW).metrics.map((item) => item.display), ['8 / 8', '0.0%', '8120', '5.6 / 100', '¥0.186 / 次'])
  assert.deepEqual(calculateRagChunking(DEFAULT_RAG_CHUNKING).metrics.map((item) => item.display), ['100%', '74.4%', '12 块', '1280', '288 ms'])
})

test('两个机制案例相同输入完全确定', () => {
  assert.deepEqual(calculateContextWindow(DEFAULT_CONTEXT_WINDOW), calculateContextWindow({ ...DEFAULT_CONTEXT_WINDOW }))
  assert.deepEqual(calculateRagChunking(DEFAULT_RAG_CHUNKING), calculateRagChunking({ ...DEFAULT_RAG_CHUNKING }))
})

test('两个机制案例边界输出有限且非负', () => {
  const results = [
    calculateContextWindow({ window: 8000, systemTokens: 1800, historyTurns: 12, retrievalK: 10, answerMode: '带引用' }),
    calculateContextWindow({ window: 32000, systemTokens: 200, historyTurns: 0, retrievalK: 0, answerMode: '短答' }),
    calculateRagChunking({ chunkSize: 128, overlap: 0, splitter: '固定长度', topK: 3, contextCap: 2000 }),
    calculateRagChunking({ chunkSize: 800, overlap: .5, splitter: '句子', topK: 10, contextCap: 8000 }),
  ]
  results.forEach(assertFiniteNonNegative)
})

test('窗口增大不提高截断率', () => {
  const rates = [8000, 16000, 32000].map((window) => metric(calculateContextWindow({ ...DEFAULT_CONTEXT_WINDOW, window }), 'truncation'))
  assert.ok(rates[1] <= rates[0])
  assert.ok(rates[2] <= rates[1])
})

test('chunkSize 增大不增加索引块数', () => {
  const sizes = [128, 256, 512, 800].map((chunkSize) => metric(calculateRagChunking({ ...DEFAULT_RAG_CHUNKING, chunkSize }), 'indexSize'))
  for (let index = 1; index < sizes.length; index += 1) assert.ok(sizes[index] <= sizes[index - 1])
})

test('案例目录更新为 19 个，其中 11 个在中心可见', () => {
  assert.equal(strategyCaseCatalog.length, 19)
  assert.equal(centerCaseCatalog.length, 11)
  assert.ok(centerCaseCatalog.some((item) => item.id === 'context-window-budget' && item.routeId === 'llm'))
  assert.ok(centerCaseCatalog.some((item) => item.id === 'rag-chunking' && item.routeId === 'llm'))
})
