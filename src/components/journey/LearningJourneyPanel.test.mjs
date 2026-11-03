import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { tsImport } from 'tsx/esm/api'
import { recordPersonalPractice } from '../../learningJourney.ts'

const api = await tsImport('./LearningJourneyPanel.tsx', {
  parentURL: import.meta.url,
  tsconfig: fileURLToPath(new URL('../../../tsconfig.app.json', import.meta.url)),
}).catch(() => ({}))
const receipt = JSON.parse(readFileSync(new URL('../../fixtures/playground-learning-run.json', import.meta.url), 'utf8'))
const practice = recordPersonalPractice({ schemaVersion: 1, active: false }, receipt, true).practice

function render(journey = { schemaVersion: 1, active: false }, progress = {}) {
  assert.equal(typeof api.default, 'function', 'the real learner journey panel must exist')
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const writes = []
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      getItem(key) {
        if (key === 'genai-model-learning-journey-v1') return JSON.stringify(journey)
        if (key === 'genai-learning-progress-v1') return JSON.stringify(progress)
        throw Error('must not read other project drafts')
      },
      setItem(key, value) { writes.push({ key, value }) },
    } })
    const html = renderToStaticMarkup(createElement(api.default, { go: () => {}, playgroundBase: 'http://127.0.0.1:3103/' }))
    assert.equal(writes.length, 0, 'rendering a path must not mark any progress')
    return html
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous)
    else delete globalThis.localStorage
  }
}

test('empty journey offers a clear course, real practice and local import without fake completion', () => {
  const html = render()
  assert.match(html, /模型怎么从例子里学会/)
  assert.match(html, /0\s*\/\s*3/)
  assert.match(html, />打开梯度下降课程</)
  assert.match(html, />去游乐场亲手试</)
  assert.match(html, /type="file"[^>]*accept="[^"]*json/)
  assert.match(html, /<textarea[^>]*aria-label="实验记录 JSON"/)
  assert.doesNotMatch(html, /这一轮路径已完成/)
  assert.match(html, /<button[^>]*disabled=""[^>]*>核对我的理解<\/button>/)
  assert.match(html, /模型学习路线 · AI 陪练任务包/)
  assert.match(html, /没有接通任何 AI 服务/)
})

test('a viewed course is shown honestly and cannot stand in for personal practice', () => {
  const html = render({ schemaVersion: 1, active: true }, { 'gradient-descent': 1 })
  assert.match(html, /1\s*\/\s*3/)
  assert.match(html, /已浏览，不代表已掌握/)
  assert.doesNotMatch(html, /这一轮路径已完成/)
})

test('saved personal practice exposes real changes and original wrong predictions', () => {
  const html = render({ schemaVersion: 1, active: true, practice }, { 'gradient-descent': 1 })
  assert.match(html, /2\s*\/\s*3/)
  assert.match(html, /2\s*→\s*0/)
  assert.match(html, /0\.666\s*→\s*0\.647/)
  assert.match(html, /13\s*\/\s*16/)
  assert.match(html, /你当时猜：点会移动/)
  assert.match(html, /你当时猜：新题全对/)
  assert.match(html, /固定教学样例，不是现实准确率/)
  assert.match(html, /本人自报的网页操作/)
  assert.doesNotMatch(html, /这一轮路径已完成/)
  assert.match(html, /给我一个观察提示/)
  assert.match(html, /本地提示，不是 AI 回答/)
})

test('wrong recap stays incomplete and correct recap leads to a real next lesson without mastery claims', () => {
  const wrong = render({ schemaVersion: 1, active: true, practice, reflection: { change: 'points', evaluation: 'practice' } }, { 'gradient-descent': 1 })
  assert.match(wrong, /2\s*\/\s*3/)
  assert.match(wrong, /点的位置没有改变/)
  assert.doesNotMatch(wrong, /这一轮路径已完成/)
  const correct = render({ schemaVersion: 1, active: true, practice, reflection: { change: 'parameters', evaluation: 'unseen' } }, { 'gradient-descent': 1 })
  assert.match(correct, /3\s*\/\s*3/)
  assert.match(correct, /这一轮路径已完成/)
  assert.match(correct, /继续：线性层与矩阵乘/)
  assert.match(correct, /不代表已掌握，也不会替你完成原课程/)
})

test('a new record preview cannot answer or submit the recap attached to an older saved record', () => {
  assert.equal(typeof api.JourneyRecap, 'function')
  const props = { id: 'review', practice: true, pending: true, answers: { change: 'parameters', evaluation: 'unseen' }, onAnswers: () => {}, onReflect: () => {} }
  const blocked = renderToStaticMarkup(createElement(api.JourneyRecap, props))
  assert.equal((blocked.match(/disabled=""/g) ?? []).length, 3, 'both answer groups and submit must be disabled')
  assert.match(blocked, /先保存或取消新记录预览/)
  const restored = renderToStaticMarkup(createElement(api.JourneyRecap, { ...props, pending: false }))
  assert.doesNotMatch(restored, /disabled=""/)
})
