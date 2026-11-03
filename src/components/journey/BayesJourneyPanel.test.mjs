import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { tsImport } from 'tsx/esm/api'
import { fileURLToPath } from 'node:url'

const api = await tsImport('./BayesJourneyPanel.tsx', { parentURL: import.meta.url, tsconfig: fileURLToPath(new URL('../../../tsconfig.app.json', import.meta.url)) }).catch(() => ({}))
function render(progress = {}) {
  assert.equal(typeof api.default, 'function', 'Bayesian route must be a real learner-facing component')
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const reads = [], writes = []
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      getItem(key) { reads.push(key); return key === 'genai-learning-progress-v1' ? JSON.stringify(progress) : null },
      setItem(key, value) { writes.push([key, value]) },
    } })
    const html = renderToStaticMarkup(createElement(api.default, { go() {} }))
    assert.equal(writes.length, 0, 'viewing the route cannot write progress')
    assert.equal(reads.some(key => !['genai-bayes-learning-journey-v1', 'genai-learning-progress-v1'].includes(key)), false, 'Bayesian route must not inspect other records or drafts')
    return html
  } finally { if (previous) Object.defineProperty(globalThis, 'localStorage', previous); else delete globalThis.localStorage }
}
test('Bayesian route starts at zero and offers a real lesson without silently sharing results', () => {
  const html = render()
  assert.match(html, /同一条线索，为什么有人改得更多/)
  assert.match(html, /0\s*\/\s*3/)
  assert.match(html, />打开概率基础课程</)
  assert.match(html, /去盲盒探矿亲手试/)
  assert.match(html, /贝叶斯学习路线 · AI 陪练任务包/)
  assert.match(html, /<button[^>]*disabled=""[^>]*>核对我的理解<\/button>/)
  assert.doesNotMatch(html, /这一轮路径已完成|<textarea[^>]*readonly/)
})
test('opening probability only marks the viewed step, not personal practice or mastery', () => {
  const html = render({ probability: 1 })
  assert.match(html, /1\s*\/\s*3/)
  assert.match(html, /已浏览，不代表已掌握/)
  assert.doesNotMatch(html, /这一轮路径已完成/)
})
