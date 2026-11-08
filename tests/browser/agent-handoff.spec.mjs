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
const framesSteps = [
  ...Array.from({ length: 8 }, (_, i) => ({ action: 'advance', phase: i === 7 ? 'baseline-done' : 'baseline', frame: i + 1 })),
  { action: 'start-manual', phase: 'manual', frame: 0 },
  ...Array.from({ length: 8 }, (_, i) => {
    const frame = i + 1
    const advance = { action: 'advance', phase: frame === 8 ? 'done' : 'manual', frame }
    return frame === 4 ? [advance, { action: 'pin', phase: 'manual', frame }] : [advance]
  }).flat(),
]
const completed = { stage: 'done', workflowComplete: true, mastery: 'not-assessed', availableActions: [] }
const missedRound = { frameIds: [0, 4, 8], signFrame: null, conclusion: 'insufficient-evidence' }
const levels = [
  {
    section: 'agent-journey', journey: 'agent-learning', save: '确认保存到这条路径', launch: '去游乐场执行任务',
    receipt: {
      ...common, experimentId: 'agent-tool-loop', engineVersion: 'agent-tool-loop-v1', numericFormat: 'integer-events',
      fixture: { id: 'supply-receipt-v1', toolBudget: 3, initialToolStatus: 'accepted' },
      steps: firstSteps, actions: firstSteps.map(({ action }) => ({ action })),
      result: { ...completed, evidence: { trials: [1, 2].map(number => ({ number, outcome: 'stopped', toolCalls: 0, receipt: 'unknown', backupDispatched: false })) } },
    },
  },
  {
    section: 'agent-reroute-journey', journey: 'agent-reroute', save: '确认保存到第二关', launch: '去游乐场改派补给',
    receipt: {
      ...common, experimentId: 'agent-reroute', engineVersion: 'agent-reroute-v1', numericFormat: 'integer-events',
      fixture: { id: 'reroute-07-to-08-v1', from: '07', to: '08' },
      steps: secondSteps, actions: secondSteps.map(({ action }) => ({ action })),
      result: { ...completed, evidence: { activeTarget: '08', dispatched08: true, oldReceipt: { orderId: 'SUP-07', station: '07' }, newReceipt: { orderId: 'SUP-08', station: '08' }, outcome: 'verified' } },
    },
  },
  {
    section: 'agent-frames-journey', journey: 'agent-frames', save: '确认保存到第三关', launch: '去游乐场挑三帧',
    receipt: {
      ...common, experimentId: 'agent-frames', engineVersion: 'agent-frames-v1', numericFormat: 'integer-events',
      fixture: { id: 'station-08-stream-v1', station: '08', frameCount: 9, budget: 3, fixedFrames: [0, 4, 8] },
      steps: framesSteps, actions: framesSteps.map(({ action }) => ({ action })),
      result: { ...completed, evidence: { frame: 8, manualPick: 4, fixed: missedRound, manual: missedRound } },
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
    await expect(page.getByRole('button', { name: level.launch, exact: true })).toBeDisabled()
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
    if (level.journey === 'agent-frames') {
      await expect(page.getByText('证据不足', { exact: true })).toHaveCount(2)
      const submit = page.getByRole('button', { name: '核对我的理解' })
      await expect(submit).toBeDisabled()
      await page.getByRole('radio', { name: '把看不清门牌记为禁止卸货' }).check()
      await submit.click()
      await expect(page.getByText(/看不清不等于禁止/)).toBeVisible()
      await expect(page.getByText('这次复盘已完成')).toHaveCount(0)
      await page.getByRole('radio', { name: '先不放行，请求一张当前门牌的清晰画面' }).check()
      await submit.click()
      await expect(page.getByText('这次复盘已完成')).toBeVisible()
    }
    await page.reload()
    await expect(consent).toHaveCount(0)
    if (level.journey === 'agent-frames') await expect(page.getByText('这次复盘已完成')).toBeVisible()
  })
}

for (const level of levels) {
  test(level.section + ' requires explicit cancellation before navigation can drop an unconfirmed return', async ({ page }) => {
    await page.route(/learning-tool\.mjs\?v=agent-/, route => route.fulfill({
      status: 200, contentType: 'application/javascript', headers: { 'Access-Control-Allow-Origin': '*' },
      body: 'export function replayLearningReceipt(receipt) { return {matches:true,authenticatesUser:false,receipt} }',
    }))
    await seed(page, level)
    await page.goto(routeURL(level) + hash(level))
    const consent = page.getByRole('checkbox', { name: '这是我刚才亲手操作的记录', exact: true })
    await expect(consent).toBeVisible()
    const before = await page.evaluate(k => localStorage.getItem(k), key(level))
    const other = level.journey === 'agent-learning' ? 2 : 1
    const target = page.getByRole('button', { name: new RegExp('^第 ' + other + ' 关：') })
    const prompts = []
    const stay = async dialog => { prompts.push(dialog.message()); await dialog.dismiss() }
    page.on('dialog', stay)
    await target.click()
    expect(prompts).toEqual(['这次带回的实操还没有确认保存。离开会取消这次预览，已保存的学习记录不会改变。确定离开吗？'])
    expect(fragment(page)).toBe(hash(level))
    await expect(consent).toBeVisible()
    expect(await page.evaluate(k => localStorage.getItem(k), key(level))).toBe(before)
    page.off('dialog', stay)
    page.once('dialog', dialog => dialog.accept())
    await target.click()
    await expect(page).toHaveURL(new RegExp('section=' + levels[other - 1].section + '$'))
    expect(fragment(page)).toBe('')
    expect(await page.evaluate(k => localStorage.getItem(k), key(level))).toBe(before)
  })

  test(level.section + ' blocks relaunch and old recap until a failed return is saved or explicitly cancelled', async ({ page }) => {
    const answer = level.journey === 'agent-learning' ? '查到签收记录，才能确认送达'
      : level.journey === 'agent-reroute' ? 'SUP-08 · 08 号站' : '先不放行，请求一张当前门牌的清晰画面'
    await page.route(/learning-tool\.mjs\?v=agent-/, route => route.fulfill({
      status: 200, contentType: 'application/javascript', headers: { 'Access-Control-Allow-Origin': '*' },
      body: 'export function replayLearningReceipt(receipt) { return {matches:true,authenticatesUser:false,receipt} }',
    }))
    await seed(page, level)
    await page.goto(routeURL(level) + hash(level))
    await page.getByRole('checkbox', { name: '这是我刚才亲手操作的记录', exact: true }).check()
    await page.getByRole('button', { name: level.save, exact: true }).click()
    await page.getByRole('radio', { name: answer, exact: true }).check()
    await page.getByRole('button', { name: '核对我的理解', exact: true }).click()
    await expect(page.getByText('这次复盘已完成', { exact: true })).toBeVisible()
    const before = await page.evaluate(k => localStorage.getItem(k), key(level))
    await page.unroute(/learning-tool\.mjs\?v=agent-/)
    await page.route(/learning-tool\.mjs\?v=agent-/, route => route.abort())
    await page.goto(routeURL(level) + '&retry=1' + hash(level))
    await expect(page.getByText(/暂时无法载入游乐场的公开核对模块/)).toBeVisible()
    await expect(page.getByRole('button', { name: level.launch, exact: true })).toBeDisabled()
    await expect(page.getByRole('button', { name: '核对我的理解', exact: true })).toBeDisabled()
    expect(fragment(page)).toBe(hash(level))
    expect(await page.evaluate(k => localStorage.getItem(k), key(level))).toBe(before)
    await page.getByRole('button', { name: '取消新记录预览', exact: true }).click()
    await expect(page.getByRole('button', { name: level.launch, exact: true })).toBeEnabled()
    await expect(page.getByRole('button', { name: '核对我的理解', exact: true })).toBeEnabled()
    expect(fragment(page)).toBe('')
    expect(await page.evaluate(k => localStorage.getItem(k), key(level))).toBe(before)
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
