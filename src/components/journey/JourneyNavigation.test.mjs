import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { fileURLToPath } from 'node:url'
import { tsImport } from 'tsx/esm/api'
import { readFileSync } from 'node:fs'
const api = await tsImport('./JourneyNavigation.tsx', { parentURL: import.meta.url, tsconfig: fileURLToPath(new URL('../../../tsconfig.app.json', import.meta.url)) })
const { default: NextStepCard } = await tsImport('../foundation/NextStepCard.tsx', { parentURL: import.meta.url, tsconfig: fileURLToPath(new URL('../../../tsconfig.app.json', import.meta.url)) })
const journeyApi = await tsImport('../../learningJourney.ts', { parentURL: import.meta.url, tsconfig: fileURLToPath(new URL('../../../tsconfig.app.json', import.meta.url)) })

function withRecords(records, run) {
  const old = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => records[key] ?? null, setItem() { throw new Error('render must not write') } } })
  try { run() } finally { if (old) Object.defineProperty(globalThis, 'localStorage', old); else delete globalThis.localStorage }
}

test('both homepage entry points follow the explicitly selected Bayes journey', () => withRecords({
  'genai-current-learning-journey-v1': '{"schemaVersion":1,"journeyId":"bayes-learning"}',
  'genai-model-learning-journey-v1': '{"schemaVersion":1,"active":true}',
}, () => {
  const top = renderToStaticMarkup(createElement(api.JourneyEntry, { go() {} }))
  const desk = renderToStaticMarkup(createElement(NextStepCard, { progress: {}, persona: 'beginner', go() {} }))
  for (const html of [top, desk]) { assert.match(html, /新线索来了，怎样改判断/); assert.match(html, /继续贝叶斯路线/); assert.doesNotMatch(html, /已掌握|100%/) }
}))

test('two legacy active journeys ask for a choice on both homepage surfaces', () => withRecords({
  'genai-model-learning-journey-v1': '{"schemaVersion":1,"active":true}',
  'genai-bayes-learning-journey-v1': '{"schemaVersion":1,"active":true}',
}, () => {
  for (const Component of [api.JourneyEntry, NextStepCard]) {
    const html = renderToStaticMarkup(createElement(Component, { progress: {}, persona: 'beginner', go() {} }))
    assert.match(html, /选择继续哪条路线/)
    assert.doesNotMatch(html, /继续这条路径/)
  }
}))

test('foundation return follows the selected journey, not the current lesson topic', () => withRecords({
  'genai-current-learning-journey-v1': '{"schemaVersion":1,"journeyId":"bayes-learning"}',
  'genai-model-learning-journey-v1': '{"schemaVersion":1,"active":true}',
}, () => assert.match(renderToStaticMarkup(createElement(api.JourneyReturnBar, { page: 'foundation', node: 'gradient-descent', go() {} })), /回到贝叶斯路线/)))

test('a selected completed model route remains available for review instead of switching routes', () => {
  const receipt = JSON.parse(readFileSync(new URL('../../fixtures/playground-learning-run.json', import.meta.url), 'utf8'))
  const model = journeyApi.saveJourneyReflection(journeyApi.recordPersonalPractice({ schemaVersion: 1, active: true }, receipt, true), { change: 'parameters', evaluation: 'unseen' })
  withRecords({
    'genai-current-learning-journey-v1': '{"schemaVersion":1,"journeyId":"model-learning"}',
    'genai-model-learning-journey-v1': JSON.stringify(model),
    'genai-bayes-learning-journey-v1': '{"schemaVersion":1,"active":true}',
    'genai-learning-progress-v1': '{"gradient-descent":1}',
  }, () => {
    for (const Component of [api.JourneyEntry, NextStepCard]) {
      const html = renderToStaticMarkup(createElement(Component, { progress: {}, persona: 'beginner', go() {} }))
      assert.match(html, /回顾模型路线/); assert.match(html, /3\/3/); assert.doesNotMatch(html, /已掌握|100%/)
    }
  })
})

test('a fresh learner has a direct complete-path entrance, no invented progress', () => {
  assert.equal(typeof api.JourneyEntry, 'function')
  const html = renderToStaticMarkup(createElement(api.JourneyEntry, { go() {} }))
  assert.match(html, /先看机制/)
  assert.match(html, /开始完整路径/)
  assert.doesNotMatch(html, /已掌握|已完成|100%/)
})

test('no active path means no interruption of existing lesson pages', () => {
  assert.equal(typeof api.JourneyReturnBar, 'function')
  assert.equal(renderToStaticMarkup(createElement(api.JourneyReturnBar, { page: 'foundation', go() {} })), '')
})

test('the active path offers a return without claiming the viewed lesson is learned', () => {
  assert.equal(typeof api.JourneyReturnBar, 'function')
  const old = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => key === 'genai-model-learning-journey-v1' ? '{"schemaVersion":1,"active":true}' : '{}' } })
  try {
    const html = renderToStaticMarkup(createElement(api.JourneyReturnBar, { page: 'foundation', go() {} }))
    assert.match(html, /回到这条路径/)
    assert.match(html, /模型怎样从例子里学会/)
    assert.doesNotMatch(html, /已掌握|已完成/)
    assert.equal(renderToStaticMarkup(createElement(api.JourneyReturnBar, { page: 'routes', go() {} })), '')
  } finally { if (old) Object.defineProperty(globalThis, 'localStorage', old); else delete globalThis.localStorage }
})
