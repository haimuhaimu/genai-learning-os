import { test, expect } from '@playwright/test'

const MODEL = 'genai-model-learning-journey-v1', BAYES = 'genai-bayes-learning-journey-v1'
const CURRENT = 'genai-current-learning-journey-v1', PROGRESS = 'genai-learning-progress-v1'
const active = JSON.stringify({ schemaVersion: 1, active: true })
const legacy = { [MODEL]: active, [BAYES]: active, [PROGRESS]: '{"gradient-descent":1,"probability":1}' }
async function seed(page, records) {
  await page.addInitScript(records => {
    if (!sessionStorage.getItem('resume-test-seeded')) {
      Object.entries(records).forEach(([key, value]) => localStorage.setItem(key, value))
      sessionStorage.setItem('resume-test-seeded', 'yes')
    }
  }, records)
}
const top = page => page.getByRole('complementary', { name: '完整学习路径入口', exact: true })
const desk = page => page.locator('.lo-dashboard .lo-next-step')
const records = page => page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), [MODEL, BAYES, PROGRESS])

for (const width of [320, 1280]) {
  test(`both homepage entries resume the last explicit route and preserve records at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 800 }); await seed(page, legacy); await page.goto('/')
    const before = await records(page)
    await expect(top(page)).toContainText('选择继续哪条路线')
    await expect(desk(page)).toContainText('选择继续哪条路线')
    await desk(page).getByRole('button', { name: '选择学习路线', exact: true }).click()
    await expect(page.locator('#journey-picker')).toBeFocused()
    await expect(page.locator('#journey-picker [aria-pressed=true]')).toHaveCount(0)
    await page.locator('#journey-picker').getByRole('button', { name: /贝叶斯更新/ }).click()
    await expect(page.locator('#bayes-learning-journey')).toBeFocused()
    await page.goto('/')
    for (const entry of [top(page), desk(page)]) await expect(entry.getByRole('button', { name: '继续贝叶斯路线', exact: true })).toBeVisible()
    await page.reload()
    await desk(page).getByRole('button', { name: '继续贝叶斯路线', exact: true }).click()
    await expect(page.locator('#bayes-learning-journey')).toBeFocused()
    await page.goto('/')
    await top(page).getByRole('button', { name: '换到模型路线', exact: true }).click()
    await expect(page.locator('#learning-journey')).toBeFocused()
    await page.goto('/')
    for (const entry of [top(page), desk(page)]) await expect(entry.getByRole('button', { name: '继续模型路线', exact: true })).toBeVisible()
    expect(await records(page)).toEqual(before)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
    await top(page).scrollIntoViewIfNeeded()
    await page.screenshot({ path: testInfo.outputPath('home-resume.png') })
  })
}

test('opening a direct link does not replace the chosen route, but an explicit course action does', async ({ page }) => {
  await seed(page, { ...legacy, [CURRENT]: '{"schemaVersion":1,"journeyId":"model-learning"}' })
  await page.goto('/?page=routes&section=bayes-journey')
  expect(await page.evaluate(key => localStorage.getItem(key), CURRENT)).toContain('model-learning')
  await page.getByRole('button', { name: '打开概率基础课程', exact: true }).click()
  await expect(page.getByRole('button', { name: '回到贝叶斯路线', exact: true })).toBeVisible()
  await page.goto('/')
  await expect(top(page).getByRole('button', { name: '继续贝叶斯路线', exact: true })).toBeVisible()
})

test('a choice in another tab updates both homepage entry points', async ({ page, context }) => {
  await seed(page, legacy); await page.goto('/')
  const before = await records(page)
  const other = await context.newPage(); await other.goto('/')
  await top(other).getByRole('button', { name: '选择贝叶斯路线', exact: true }).click()
  for (const entry of [top(page), desk(page)]) await expect(entry).toContainText('继续贝叶斯路线')
  expect(await records(page)).toEqual(before)
})

test('corrupt navigation metadata keeps legacy records and offers an honest choice', async ({ page }) => {
  await seed(page, { ...legacy, [CURRENT]: '{not valid json' }); await page.goto('/')
  await expect(top(page)).toContainText('选择继续哪条路线')
  expect(await records(page)).toEqual(legacy)
})

test('blocked preference writes do not block navigation or change learning records', async ({ page }) => {
  await seed(page, legacy)
  await page.addInitScript(key => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (k, value) { if (k === key) throw Error('blocked preference'); return original.call(this, k, value) }
  }, CURRENT)
  await page.goto('/')
  await top(page).getByRole('button', { name: '选择贝叶斯路线', exact: true }).click()
  await expect(page.locator('#bayes-learning-journey')).toBeFocused()
  expect(await records(page)).toEqual(legacy)
})

test('failed preference save follows the new choice for this visit and explains refresh limits', async ({ page }) => {
  await seed(page, { ...legacy, [CURRENT]: '{"schemaVersion":1,"journeyId":"model-learning"}' })
  await page.addInitScript(key => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (k, value) { if (k === key) throw Error('quota'); return original.call(this, k, value) }
  }, CURRENT)
  await page.goto('/')
  await top(page).getByRole('button', { name: '换到贝叶斯路线', exact: true }).click()
  await page.getByRole('button', { name: '打开概率基础课程', exact: true }).click()
  await expect(page.getByRole('button', { name: '回到贝叶斯路线', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '返回 GenAI Learning OS 首页', exact: true }).click()
  for (const entry of [top(page), desk(page)]) {
    await expect(entry.getByRole('button', { name: '继续贝叶斯路线', exact: true })).toBeVisible()
    await expect(entry).toContainText('本次选择未能保存')
  }
  expect(await records(page)).toEqual(legacy)
  await page.reload()
  await expect(top(page).getByRole('button', { name: '继续模型路线', exact: true })).toBeVisible()
})
