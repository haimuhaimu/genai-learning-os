import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { tsImport } from 'tsx/esm/api'

const api = await tsImport('./AgentJourneyPanel.tsx', {
  parentURL: import.meta.url,
  tsconfig: fileURLToPath(new URL('../../../tsconfig.app.json', import.meta.url)),
}).catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND' && error.message.includes('/AgentJourneyPanel.tsx')) return {}
  throw error
})

test('empty Agent route gives a playable entry and manual fallback without counting practice', () => {
  assert.equal(typeof api.default, 'function')
  const html = renderToStaticMarkup(createElement(api.default, { go: () => {} }))
  assert.match(html, /去游乐场执行任务/)
  assert.match(html, /aria-label="Agent 实验记录 JSON"/)
  assert.match(html, /0 \/ 2/)
  assert.match(html, /<button[^>]*disabled=""[^>]*>核对我的理解<\/button>/)
  assert.doesNotMatch(html, /这次复盘已完成/)
})

test('Agent evidence view distinguishes stop, exhausted and verified from a retry acknowledgement', () => {
  assert.equal(typeof api.AgentEvidence, 'function')
  const summary = {
    complete: true, producer: 'browser-session',
    trials: [
      { number: 1, outcome: 'budget-exhausted', receipt: 'not-delivered', toolCalls: 3, backupDispatched: false },
      { number: 2, outcome: 'verified', receipt: 'delivered', toolCalls: 2, backupDispatched: true },
    ],
    steps: [
      { trial: 2, action: 'retry', remaining: 2, observation: 'retry-accepted' },
      { trial: 2, action: 'check', remaining: 1, observation: 'signed' },
    ],
  }
  const show = value => renderToStaticMarkup(createElement(api.AgentEvidence, { summary: value }))
  const html = show(summary)
  assert.match(html, /预算耗尽，未核验/)
  assert.match(html, /备用线已受理，尚未查到签收/)
  assert.match(html, /查到签收，确认送达/)
  const stopped = { ...summary, trials: [{ number: 1, outcome: 'stopped', receipt: 'unknown', toolCalls: 0, backupDispatched: false }], steps: [{ trial: 1, action: 'stop', remaining: 3, observation: 'stopped' }] }
  assert.match(show(stopped), /主动停止，未核验/)
  assert.doesNotMatch(show(stopped), /已核验送达/)
})
