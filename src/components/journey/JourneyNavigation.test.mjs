import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { fileURLToPath } from 'node:url'
import { tsImport } from 'tsx/esm/api'
const api = await tsImport('./JourneyNavigation.tsx', { parentURL: import.meta.url, tsconfig: fileURLToPath(new URL('../../../tsconfig.app.json', import.meta.url)) })

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
