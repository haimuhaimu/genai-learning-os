import { test, expect } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

const fixture = fileURLToPath(new URL('../../src/fixtures/playground-learning-run.json', import.meta.url))
const fixtureText = readFileSync(fixture, 'utf8')

async function openPath(page) {
  // Stub only the remote replay-service boundary for deterministic UI acceptance.
  // This does not test the external algorithm; real cross-project replay is
  // verified separately against the public engine with an actual browser run.
  await page.route('**/learning-tool.mjs', route => route.fulfill({
    status: 200, contentType: 'application/javascript',
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: 'export function replayLearningReceipt(receipt) { return {matches:true,authenticatesUser:false,receipt} }',
  }))
  await page.goto('/?page=routes&section=journey')
  await expect(page.locator('#learning-journey')).toBeVisible()
}
async function importFixture(page) {
  await page.getByText('没有自动带回？手动选择或粘贴实验记录', { exact: true }).click()
  await page.locator('input[type=file]').setInputFiles(fixture)
  await expect(page.getByText('新带回的记录 · 尚未保存', { exact: true })).toBeVisible()
}
async function savePractice(page) {
  await page.getByRole('checkbox', { name: '这是我刚才亲手操作的记录', exact: true }).check()
  await page.getByRole('button', { name: '确认保存到这条路径', exact: true }).click()
}

for (const width of [320, 1280]) {
  test(`journey returns to the requested section and moves focus through evidence at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 800 })
    await openPath(page)
    await page.getByRole('button', { name: '打开梯度下降课程', exact: true }).click()
    await expect(page.getByRole('heading', { name: '梯度下降与反向传播', exact: true })).toBeVisible()
    await page.getByRole('button', { name: '回到这条路径', exact: true }).click()
    await expect(page.locator('#learning-journey')).toBeFocused()
    await importFixture(page)
    await expect(page.getByRole('heading', { name: '这一次，真实发生了什么？', exact: true })).toBeFocused()
    await savePractice(page)
    await expect(page.getByRole('heading', { name: '用两次判断，把这轮讲明白', exact: true })).toBeFocused()
    await page.getByRole('radio', { name: '点没动，改了分界线的参数', exact: true }).check()
    await page.getByRole('radio', { name: '还要拿没参加训练的新题来检验', exact: true }).check()
    await page.getByRole('button', { name: '核对我的理解', exact: true }).click()
    await expect(page.getByRole('heading', { name: '训练改规则，新题检验规则。', exact: true })).toBeFocused()
    await expect(page.getByLabel('路径记录 3 / 3', { exact: true })).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
    await page.screenshot({ path: testInfo.outputPath('journey-complete.png'), fullPage: true })
    await page.reload()
    await expect(page.getByLabel('路径记录 3 / 3', { exact: true })).toBeVisible()
  })
}

test('clearing this isolated browser profile in another tab removes stale saved evidence', async ({ page, context }) => {
  await openPath(page)
  await importFixture(page)
  await savePractice(page)
  await expect(page.getByText('已保存的实操', { exact: true })).toBeVisible()
  const other = await context.newPage()
  await other.goto('/')
  await other.evaluate(() => localStorage.clear())
  await expect(page.getByText('已保存的实操', { exact: true })).toHaveCount(0)
  await expect(page.getByLabel('路径记录 0 / 3', { exact: true })).toBeVisible()
})

test('coach cancellation cannot resurrect a stuck generation after another receipt preview is cancelled', async ({ page }) => {
  await openPath(page); await importFixture(page); await savePractice(page)
  let release
  const blocked = new Promise(resolve => { release = resolve })
  await page.route('**/learning-route-trials.mjs', async route => {
    await blocked
    await route.fulfill({ status: 200, contentType: 'application/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: 'export function inspectLearningRouteTrials(){throw Error("late result")}' })
  })
  await page.getByRole('checkbox', { name: '加入这次已保存的实操和复盘', exact: true }).check()
  await page.getByRole('button', { name: '生成陪练任务包', exact: true }).click()
  await expect(page.getByRole('button', { name: '正在生成……', exact: true })).toBeDisabled()
  await page.getByLabel('实验记录 JSON', { exact: true }).fill(fixtureText)
  await page.getByRole('button', { name: '重新计算并核对记录', exact: true }).click()
  await expect(page.getByText('新带回的记录 · 尚未保存', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '取消新记录预览', exact: true }).click()
  try {
    await expect(page.getByRole('button', { name: '生成陪练任务包', exact: true })).toBeEnabled()
  } finally { release() }
  await page.getByRole('checkbox', { name: '加入这次已保存的实操和复盘', exact: true }).uncheck()
  await page.getByRole('button', { name: '生成陪练任务包', exact: true }).click()
  await expect(page.getByRole('heading', { name: '只有课程说明的陪练任务包', exact: true })).toBeVisible()
  await expect(page.getByLabel('AI 陪练任务包内容', { exact: true })).toContainText('"record": null')
})

test('coach cancellation cannot resurrect a stuck copy after another receipt preview is cancelled', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => new Promise(resolve => { window.resolveCoachCopy = resolve }) } })
  })
  await openPath(page); await importFixture(page); await savePractice(page)
  await page.getByRole('button', { name: '生成陪练任务包', exact: true }).click()
  await page.getByRole('button', { name: '复制给我的 AI', exact: true }).click()
  await expect(page.getByRole('button', { name: '正在复制……', exact: true })).toBeDisabled()
  await page.getByLabel('实验记录 JSON', { exact: true }).fill(fixtureText)
  await page.getByRole('button', { name: '重新计算并核对记录', exact: true }).click()
  await expect(page.getByText('新带回的记录 · 尚未保存', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '取消新记录预览', exact: true }).click()
  try {
    await expect(page.getByRole('button', { name: '复制给我的 AI', exact: true })).toBeEnabled()
  } finally { await page.evaluate(() => window.resolveCoachCopy?.()) }
  await expect(page.getByText('已复制。请主动粘贴给自己的 AI；对话后再回本页，用真实结果核对理解。', { exact: true })).toHaveCount(0)
})

test('denied clipboard leaves the complete starter selected without changing saved practice', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw Error('denied') } } })
  })
  await openPath(page); await importFixture(page); await savePractice(page)
  const before = await page.evaluate(() => localStorage.getItem('genai-model-learning-journey-v1'))
  await page.getByRole('button', { name: '生成陪练任务包', exact: true }).click()
  const textarea = page.getByLabel('AI 陪练任务包内容', { exact: true })
  await page.getByRole('button', { name: '复制给我的 AI', exact: true }).click()
  await expect(page.getByText('浏览器没有允许自动复制。任务包仍在下面，请手动全选、复制；没有发送给任何 AI。', { exact: true })).toBeVisible()
  await expect(textarea).toBeFocused()
  expect(await textarea.evaluate(el => el.selectionEnd - el.selectionStart)).toBe(await textarea.inputValue().then(text => text.length))
  expect(await page.evaluate(() => localStorage.getItem('genai-model-learning-journey-v1'))).toBe(before)
})

test('unavailable coach inspector leaves saved evidence intact and permits course-only fallback', async ({ page }) => {
  await openPath(page); await importFixture(page); await savePractice(page)
  await page.route('**/learning-route-trials.mjs', route => route.fulfill({ status: 200, contentType: 'application/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: 'export function inspectLearningRouteTrials(){throw Error("inspector unavailable")}' }))
  const before = await page.evaluate(() => localStorage.getItem('genai-model-learning-journey-v1'))
  await page.getByRole('checkbox', { name: '加入这次已保存的实操和复盘', exact: true }).check()
  await page.getByRole('button', { name: '生成陪练任务包', exact: true }).click()
  await expect(page.getByText(/已保存的实操和复盘没有改变/)).toBeVisible()
  await expect(page.getByLabel('AI 陪练任务包内容', { exact: true })).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('genai-model-learning-journey-v1'))).toBe(before)
  await page.getByRole('checkbox', { name: '加入这次已保存的实操和复盘', exact: true }).uncheck()
  await page.getByRole('button', { name: '生成陪练任务包', exact: true }).click()
  await expect(page.getByRole('heading', { name: '只有课程说明的陪练任务包', exact: true })).toBeVisible()
  const prompt = await page.getByLabel('AI 陪练任务包内容', { exact: true }).inputValue()
  const starter = JSON.parse(prompt.slice(prompt.indexOf('{')))
  expect(starter.record).toBeNull()
})
