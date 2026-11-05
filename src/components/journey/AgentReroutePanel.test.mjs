import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { tsImport } from 'tsx/esm/api'

const api = await tsImport('./AgentReroutePanel.tsx', {
  parentURL: import.meta.url,
  tsconfig: fileURLToPath(new URL('../../../tsconfig.app.json', import.meta.url)),
}).catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND' && error.message.includes('/AgentReroutePanel.tsx')) return {}
  throw error
})
const show = (Component, props = {}) => renderToStaticMarkup(createElement(Component, props))

test('level navigation shows all three distinct Agent levels and marks the open level', () => {
  assert.equal(typeof api.AgentLevelNavigation, 'function')
  const html = show(api.AgentLevelNavigation, { reroute: true, go: () => {} })
  assert.match(html, /<nav[^>]+aria-label="Agent 实战关卡"/)
  assert.match(html, /aria-pressed="false"[^>]+aria-label="第 1 关：显示成功，补给真的到了吗？"/)
  assert.match(html, /aria-pressed="true"[^>]+aria-label="第 2 关：新指令来了，旧任务还该继续吗？"/)
  assert.match(html, /aria-pressed="false"[^>]+aria-label="第 3 关：只留三帧，你会留下哪一帧？"/)
  const third = show(api.AgentLevelNavigation, { frames: true, go: () => {} })
  assert.match(third, /aria-pressed="true"[^>]+aria-label="第 3 关：只留三帧，你会留下哪一帧？"/)
  assert.equal([...third.matchAll(/aria-pressed="true"/g)].length, 1)
})

test('empty level two exposes launch and manual fallback without counting or enabling reflection', () => {
  assert.equal(typeof api.default, 'function')
  const html = show(api.default)
  assert.match(html, /去游乐场改派补给/)
  assert.match(html, /aria-label="改派实验记录 JSON"/)
  assert.match(html, /0 \/ 2/)
  assert.match(html, /<button[^>]*disabled=""[^>]*>核对我的理解<\/button>/)
  assert.doesNotMatch(html, /这次复盘已完成/)
})

test('evidence renders chronology in order and never labels a wrong attribution as delivery', () => {
  assert.equal(typeof api.RerouteEvidence, 'function')
  const summary = {
    complete: true, producer: 'browser-session', activeTarget: '08', dispatched08: true, outcome: 'misattributed',
    oldReceipt: { orderId: 'SUP-07', station: '07' }, newReceipt: null,
    steps: [
      { action: 'advance', phase: 'partial', event: 'correction-start' },
      { action: 'advance', phase: 'decision', event: 'correction-confirmed' },
      { action: 'reroute', phase: 'await-old', event: 'reroute-accepted' },
      { action: 'advance', phase: 'review', event: 'old-receipt' },
      { action: 'accept-old', phase: 'done', event: 'old-receipt-misattributed' },
    ],
  }
  const html = show(api.RerouteEvidence, { summary })
  assert.match(html, /错认旧回执，08 号未核验/)
  assert.match(html, /SUP-07 · 07 号站/)
  assert.match(html, /没有 08 号签收/)
  assert.match(html, /指令还没说完[\s\S]*改送 08 号站[\s\S]*派单已受理[\s\S]*旧回执迟到[\s\S]*误把旧回执/)
  assert.doesNotMatch(html, /已核验送达/)
  const verified = show(api.RerouteEvidence, { summary: { ...summary, outcome: 'verified', newReceipt: { orderId: 'SUP-08', station: '08' } } })
  assert.match(verified, /08 号已核验送达/)
  assert.match(verified, /SUP-08 · 08 号站/)
})
