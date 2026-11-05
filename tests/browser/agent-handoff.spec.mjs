import { test, expect } from '@playwright/test'

const request = 'agent-handoff-request-1234'
const common = { format: 'algorithm-playground/learning-run', schemaVersion: 1, producer: 'browser-session' }
const firstSteps = [
  { action: 'stop', trial: 1, remaining: 3, observation: 'stopped' },
  { action: 'restart', trial: 2, remaining: 3, observation: 'restarted' },
  { action: 'stop', trial: 2, remaining: 3, observation: 'stopped' },
]
const secondSteps = [
  { action: 'advance', phase: 'partial', event: 'correction-start' },
  { action: 'advance', phase: 'decision', event: 'correction-confirmed' },
  { action: 'reroute', phase: 'await-old', event: 'reroute-accepted' },
  { action: 'advance', phase: 'review', event: 'old-receipt' },
  { action: 'verify-new', phase: 'done', event: 'new-receipt-verified' },
]
const completed = { stage: 'done', workflowComplete: true, mastery: 'not-assessed', availableActions: [] }
const levels = [
  {
    section: 'agent-journey', journey: 'agent-learning', save: '确认保存到这条路径',
    receipt: {
      ...common, experimentId: 'agent-tool-loop', engineVersion: 'agent-tool-loop-v1', numericFormat: 'integer-events',
      fixture: { id: 'supply-receipt-v1', toolBudget: 3, initialToolStatus: 'accepted' },
      steps: firstSteps, actions: firstSteps.map(({ action }) => ({ action })),
      result: { ...completed, evidence: { trials: [1, 2].map(number => ({ number, outcome: 'stopped', toolCalls: 0, receipt: 'unknown', backupDispatched: false })) } },
    },
  },
  {
    section: 'agent-reroute-journey', journey: 'agent-reroute', save: '确认保存到第二关',
    receipt: {
      ...common, experimentId: 'agent-reroute', engineVersion: 'agent-reroute-v1', numericFormat: 'integer-events',
      fixture: { id: 'reroute-07-to-08-v1', from: '07', to: '08' },
      steps: secondSteps, actions: secondSteps.map(({ action }) => ({ action })),
      result: { ...completed, evidence: { activeTarget: '08', dispatched08: true, oldReceipt: { orderId: 'SUP-07', station: '07' }, newReceipt: { orderId: 'SUP-08', station: '08' }, outcome: 'verified' } },
    },
  },
]
const key = level => 'genai-' + level.journey + '-journey-v1'
const hash = (level, journeyId = level.journey) => '#playground=' + Buffer.from(JSON.stringify({
  format: 'genai-learning-os/playground-handoff', schemaVersion: 1, journeyId, requestId: request, receipt: level.receipt,
})).toString('base64url')
const routeURL = level => '/?page=routes&section=' + level.section
const fragment = page => new URL(page.url()).hash

async function seed(page, level) {
  await page.goto('/')
  await page.evaluate(({ storageKey, pendingRequest }) => localStorage.setItem(storageKey, JSON.stringify({ schemaVersion: 1, pendingRequest })), {
    storageKey: key(level), pendingRequest: request,
  })
}

for (const level of levels) {
  test(level.section + ' keeps unconfirmed returns across refresh and a failed save', async ({ page }) => {
    // Replace only the remote replay module, not the app's URL, storage or UI.
    await page.route(/learning-tool\.mjs\?v=agent-/, route => route.fulfill({
      status: 200, contentType: 'application/javascript', headers: { 'Access-Control-Allow-Origin': '*' },
      body: 'export function replayLearningReceipt(receipt) { return {matches:true,authenticatesUser:false,receipt} }',
    }))
    await seed(page, level)
    await page.goto(routeURL(level) + hash(level))
    const consent = page.getByRole('checkbox', { name: '这是我刚才亲手操作的记录', exact: true })
    const save = page.getByRole('button', { name: level.save, exact: true })
    await expect(consent).toBeVisible()
    expect(fragment(page)).toBe(hash(level))
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).practice, key(level))).toBeUndefined()
    await page.reload()
    await consent.check()
    await page.evaluate(storageKey => {
      const write = Storage.prototype.setItem
      Storage.prototype.setItem = function(key, value) {
        if (key === storageKey) throw new Error('Storage unavailable')
        return write.call(this, key, value)
      }
    }, key(level))
    await save.click()
    await expect(page.getByText(/浏览器暂时无法保存，已保存的记录没有改变/)).toBeVisible()
    expect(fragment(page)).toBe(hash(level))
    await page.reload()
    await consent.check()
    await save.click()
    expect(fragment(page)).toBe('')
    expect(await page.evaluate(key => Boolean(JSON.parse(localStorage.getItem(key)).practice), key(level))).toBe(true)
    await page.reload()
    await expect(consent).toHaveCount(0)
  })
}

test('a replay failure is recoverable until discarded; foreign and malformed returns do not persist', async ({ page }) => {
  const level = levels[1]
  await page.route(/learning-tool\.mjs\?v=agent-/, route => route.abort())
  await seed(page, level)
  await page.goto(routeURL(level) + hash(level))
  await expect(page.getByText(/暂时无法载入游乐场的公开核对模块/)).toBeVisible()
  expect(fragment(page)).toBe(hash(level))
  await page.getByRole('button', { name: '取消新记录预览' }).click()
  expect(fragment(page)).toBe('')
  await page.goto(routeURL(level) + '&case=foreign' + hash(level, 'agent-learning'))
  await expect(page.getByText(/返程记录不属于/)).toBeVisible()
  expect(fragment(page)).toBe('')
  await page.goto(routeURL(level) + '&case=malformed#playground=%')
  await expect(page.getByText(/返程记录无法读取/)).toBeVisible()
  expect(fragment(page)).toBe('')
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).practice, key(level))).toBeUndefined()
})
