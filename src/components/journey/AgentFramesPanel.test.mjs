import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { tsImport } from 'tsx/esm/api'

const api = await tsImport('./AgentFramesPanel.tsx', {
  parentURL: import.meta.url, tsconfig: fileURLToPath(new URL('../../../tsconfig.app.json', import.meta.url)),
}).catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND' && error.message.includes('/AgentFramesPanel.tsx')) return {}
  throw error
})

test('new learner can launch or import, but cannot submit the transfer question without saved evidence', () => {
  assert.equal(typeof api.default, 'function')
  const html = renderToStaticMarkup(createElement(api.default))
  assert.match(html, /去游乐场挑三帧/)
  assert.match(html, /aria-label="三帧实验记录 JSON"/)
  assert.match(html, /<fieldset disabled=""/)
  assert.match(html, /<button[^>]*disabled=""[^>]*>核对我的理解<\/button>/)
  assert.doesNotMatch(html, /这次复盘已完成/)
})

test('the rendered comparison shows each round’s frame provenance and does not call a miss a denial', () => {
  assert.equal(typeof api.FramesEvidence, 'function')
  const fixed = { frameIds: [0, 4, 8], signFrame: null, conclusion: 'insufficient-evidence' }
  const manual = { frameIds: [0, 5, 8], signFrame: 5, conclusion: 'clear-to-unload' }
  const html = renderToStaticMarkup(createElement(api.FramesEvidence, { fixed, manual }))
  assert.match(html, /固定抽帧[\s\S]*证据不足[\s\S]*#00 · 0 秒[\s\S]*#04 · 4 秒[\s\S]*#08 · 8 秒/)
  assert.match(html, /手动抽帧[\s\S]*允许卸货[\s\S]*#05 · 5 秒[\s\S]*读到「允许卸货」/)
  const miss = renderToStaticMarkup(createElement(api.FramesEvidence, { fixed, manual: fixed }))
  assert.equal([...miss.matchAll(/没拍到清晰的门牌/g)].length, 2)
  assert.doesNotMatch(miss, /禁止卸货|允许卸货/)
})
