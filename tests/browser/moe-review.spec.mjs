import { test, expect } from '@playwright/test'

async function selectPrediction(radio) {
  await radio.click()
  // Selection is immediate; durable-save assertions below separately wait for acknowledgement.
  await expect(radio).toBeChecked()
}

async function completeMoe(page) {
  await page.goto('/?page=paper-lab&paper=switch-transformers')
  await selectPrediction(page.getByRole('radio').first())
  await page.getByRole('button', { name: '进入下一关', exact: true }).click()
  await page.getByRole('button', { name: '定位错误节点', exact: true }).click()
  await page.getByRole('button', { name: '进入下一关', exact: true }).click()
  const slider = page.getByRole('slider')
  for (let i = 0; i < 5; i++) await slider.press('ArrowRight')
  await page.getByRole('button', { name: '用这个中间区间继续', exact: true }).click()
  await page.getByRole('button', { name: '既要防爆仓，也不能把请求硬塞给不擅长的人', exact: true }).click()
  await page.getByRole('button', { name: '揭晓背后的论文原理', exact: true }).click()
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('genai-moe-experiment-notebook-v1') ?? '{}').lastCompleted?.step)).toBe(5)
}

test('MoE review preserves the actual concern5 Go ledger after catalog return and refresh', async ({ page }) => {
  await completeMoe(page)
  await expect(page.getByText('本次 λ=5，约束分流别持续扎堆。', { exact: true })).toBeVisible()
  await expect(page.locator('.golden-min-formula')).toContainText('漏接 0.0%')
  await page.getByRole('button', { name: '返回案例课程目录', exact: true }).last().click()
  await page.getByRole('button', { name: '复习', exact: true }).click()
  await expect(page.getByText('本次 λ=5，约束分流别持续扎堆。', { exact: true })).toBeVisible()
  await expect(page.locator('.golden-min-formula')).toContainText('漏接 0.0%')
  await expect(page.locator('.golden-min-formula')).not.toContainText('No-Go')
  await page.reload()
  await expect(page.getByText('本次 λ=5，约束分流别持续扎堆。', { exact: true })).toBeVisible()
  await expect(page.getByLabel('本轮实验记录', { exact: true })).toContainText('全部交给最常被选中的专席')
})

test('legacy completion honestly omits missing parameters without changing saved learning records', async ({ page }) => {
  const legacy = '{"switch-transformers":{"step":5,"completed":true},"ddpm":{"step":3,"completed":false}}'
  await page.addInitScript(value => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('genai-paper-lesson-progress-v1', value)
      localStorage.setItem('genai-learning-progress-v1', '{"probability":1}')
      sessionStorage.setItem('seeded', 'yes')
    }
  }, legacy)
  await page.goto('/?page=paper-lab&paper=switch-transformers')
  await expect(page.getByLabel('本轮实验记录', { exact: true })).toContainText('参数未保存，不能还原当时实验')
  await expect(page.getByText(/本次 λ=/)).toHaveCount(0)
  await expect(page.getByText(/当前账本：/)).toHaveCount(0)
  await page.reload()
  expect(await page.evaluate(() => localStorage.getItem('genai-paper-lesson-progress-v1'))).toBe(legacy)
  expect(await page.evaluate(() => localStorage.getItem('genai-learning-progress-v1'))).toBe('{"probability":1}')
})

test('an unfinished retry keeps the last complete result and can be resumed explicitly', async ({ page }) => {
  await completeMoe(page)
  await page.getByRole('button', { name: '重新挑战', exact: true }).click()
  await selectPrediction(page.getByRole('radio').last())
  await page.getByRole('button', { name: '进入下一关', exact: true }).click()
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('genai-moe-experiment-notebook-v1') ?? '{}').draft?.step)).toBe(2)
  await page.reload()
  await expect(page.getByText('本次 λ=5，约束分流别持续扎堆。', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '继续未完成的一轮', exact: true }).click()
  await expect(page.getByRole('button', { name: '定位错误节点', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '查看上次完整实验', exact: true }).click()
  await expect(page.getByText('本次 λ=5，约束分流别持续扎堆。', { exact: true })).toBeVisible()
})

test('failed snapshot writes keep legacy completion intact and tell the learner work is temporary', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('genai-paper-lesson-progress-v1', '{"switch-transformers":{"step":5,"completed":true}}')
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) { if (key === 'genai-moe-experiment-notebook-v1') throw Error('quota'); return original.call(this, key, value) }
  })
  await page.goto('/?page=paper-lab&paper=switch-transformers')
  await page.getByRole('button', { name: '重新挑战', exact: true }).click()
  await selectPrediction(page.getByRole('radio').first())
  await expect(page.getByRole('status').filter({ hasText: '未能确认保存' })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('genai-paper-lesson-progress-v1'))).toBe('{"switch-transformers":{"step":5,"completed":true}}')
})

test('an incomplete first experiment restores its prediction and non-passing knob without inventing completion', async ({ page }) => {
  await page.goto('/?page=paper-lab&paper=switch-transformers')
  await selectPrediction(page.getByRole('radio').last())
  await page.getByRole('button', { name: '进入下一关', exact: true }).click()
  await page.getByRole('button', { name: '定位错误节点', exact: true }).click()
  await page.getByRole('button', { name: '进入下一关', exact: true }).click()
  await page.getByRole('slider').press('End')
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('genai-moe-experiment-notebook-v1') ?? '{}').draft?.concern)).toBe(10)
  await page.reload()
  await expect(page.getByRole('slider')).toHaveValue('10')
  await expect(page.getByLabel('当前分流指标')).toContainText('0.0%')
  await expect(page.getByRole('button', { name: '用这个中间区间继续', exact: true })).toBeDisabled()
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('genai-moe-experiment-notebook-v1')))
  expect(saved.draft.guess).toBe(2)
  expect(saved.draft.result.gate).toBe('No-Go')
  expect(saved.lastCompleted).toBeUndefined()
})

test('an unsupported experiment is kept intact and never shown with default numerical results', async ({ page }) => {
  const raw = '{"schemaVersion":999,"lastCompleted":{"concern":5}}'
  await page.addInitScript(value => {
    localStorage.setItem('genai-moe-experiment-notebook-v1', value)
    localStorage.setItem('genai-paper-lesson-progress-v1', '{"switch-transformers":{"step":5,"completed":true}}')
  }, raw)
  await page.goto('/?page=paper-lab&paper=switch-transformers')
  await expect(page.getByLabel('本轮实验记录')).toContainText('无法可靠读取')
  await expect(page.getByText(/本次 λ=/)).toHaveCount(0)
  await page.getByRole('button', { name: '重新挑战', exact: true }).click()
  await selectPrediction(page.getByRole('radio').first())
  await expect(page.getByRole('status').filter({ hasText: '未能确认保存' })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('genai-moe-experiment-notebook-v1'))).toBe(raw)
})

test('a stale tab cannot overwrite a newer experiment and can explicitly load it', async ({ page, context }) => {
  await completeMoe(page)
  const other = await context.newPage()
  await other.goto('/?page=paper-lab&paper=switch-transformers')
  await other.getByRole('button', { name: '重新挑战', exact: true }).click()
  await selectPrediction(other.getByRole('radio').last())
  await expect.poll(() => other.evaluate(() => JSON.parse(localStorage.getItem('genai-moe-experiment-notebook-v1') ?? '{}').draft?.guess)).toBe(2)
  const newer = await other.evaluate(() => localStorage.getItem('genai-moe-experiment-notebook-v1'))
  await expect(page.getByRole('status').filter({ hasText: '另一页面更新' })).toBeVisible()
  await page.getByRole('button', { name: '重新挑战', exact: true }).click()
  expect(await page.evaluate(() => localStorage.getItem('genai-moe-experiment-notebook-v1'))).toBe(newer)
  await page.getByRole('button', { name: '查看最新保存记录', exact: true }).click()
  await page.getByRole('button', { name: '继续未完成的一轮', exact: true }).click()
  await expect(page.getByRole('radio').last()).toBeChecked()
  await other.close()
})

test('existing two-click progress clearing removes the notebook only after confirmation', async ({ page }) => {
  await completeMoe(page)
  await page.goto('/?page=progress')
  await page.getByRole('button', { name: '开始清空', exact: true }).click()
  await page.getByRole('button', { name: '取消', exact: true }).click()
  expect(await page.evaluate(() => localStorage.getItem('genai-moe-experiment-notebook-v1'))).not.toBeNull()
  await page.getByRole('button', { name: '开始清空', exact: true }).click()
  await page.getByRole('button', { name: '再次点击，确认清空', exact: true }).click()
  await expect(page.getByRole('button', { name: '开始清空', exact: true })).toBeVisible()
  const reset = await page.evaluate(() => JSON.parse(localStorage.getItem('genai-moe-experiment-notebook-v1')))
  expect(reset.lastCompleted).toBeUndefined()
  expect(reset.draft).toBeUndefined()
  expect(reset.resetToken).toBeTruthy()
  await page.goto('/?page=paper-lab&paper=switch-transformers')
  await expect(page.getByRole('radio').first()).toBeVisible()
  await expect(page.getByText(/本次 λ=/)).toHaveCount(0)
})

test('reviewing a saved completion after a failed retry does not mark the saved result as temporary', async ({ page }) => {
  await completeMoe(page)
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) { if (key === 'genai-moe-experiment-notebook-v1') throw Error('quota'); return original.call(this, key, value) }
  })
  await page.getByRole('button', { name: '重新挑战', exact: true }).click()
  await selectPrediction(page.getByRole('radio').last())
  await page.getByRole('button', { name: '查看上次完整实验', exact: true }).click()
  await expect(page.getByLabel('本轮实验记录')).toContainText('按这次完整实验复习')
  await expect(page.locator('.golden-complete')).not.toContainText('未确认保存')
  await page.getByRole('button', { name: '继续未完成的一轮', exact: true }).click()
  await expect(page.getByRole('radio').last()).toBeChecked()
  await expect(page.getByRole('status').filter({ hasText: '未能确认保存' })).toBeVisible()
})

test('simultaneous tabs retain the completed experiment and reject one stale retry', async ({ page, context }) => {
  await completeMoe(page)
  const other = await context.newPage()
  await other.goto('/?page=paper-lab&paper=switch-transformers')
  await Promise.all([page.getByRole('button', { name: '重新挑战', exact: true }).click(), other.getByRole('button', { name: '重新挑战', exact: true }).click()])
  await expect.poll(async () => (await page.getByRole('status').filter({ hasText: /未能确认保存|另一页面更新/ }).count()) + (await other.getByRole('status').filter({ hasText: /未能确认保存|另一页面更新/ }).count())).toBeGreaterThan(0)
  const notebook = await page.evaluate(() => JSON.parse(localStorage.getItem('genai-moe-experiment-notebook-v1')))
  expect(notebook.lastCompleted.concern).toBe(5)
  expect(notebook.lastCompleted.result.gate).toBe('Go')
  expect(notebook.draft.step).toBe(1)
  await other.close()
})

test('when exclusive browser saving is unavailable the lesson stays usable but truthfully temporary', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, 'locks', { value: undefined }) })
  await page.goto('/?page=paper-lab&paper=switch-transformers')
  await selectPrediction(page.getByRole('radio').first())
  await expect(page.getByRole('status').filter({ hasText: '未能确认保存' })).toBeVisible()
  await page.getByRole('button', { name: '进入下一关', exact: true }).click()
  await expect(page.getByRole('button', { name: '定位错误节点', exact: true })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('genai-moe-experiment-notebook-v1'))).toBeNull()
})

test('prediction and rapid knob input respond immediately while safe saving is queued', async ({ page }) => {
  await page.goto('/?page=paper-lab&paper=switch-transformers')
  await page.evaluate(() => { void navigator.locks.request('genai-moe-experiment-notebook-v1', () => new Promise(resolve => { window.releaseMoeTestLock = resolve })) })
  await expect.poll(() => page.evaluate(() => typeof window.releaseMoeTestLock)).toBe('function')
  await page.getByRole('radio').first().check()
  await page.getByRole('button', { name: '进入下一关', exact: true }).click()
  await page.getByRole('button', { name: '定位错误节点', exact: true }).click()
  await page.getByRole('button', { name: '进入下一关', exact: true }).click()
  for (let i = 0; i < 5; i++) await page.getByRole('slider').press('ArrowRight')
  await expect(page.getByRole('slider')).toHaveValue('5')
  expect(await page.evaluate(() => localStorage.getItem('genai-moe-experiment-notebook-v1'))).toBeNull()
  await page.evaluate(() => window.releaseMoeTestLock())
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('genai-moe-experiment-notebook-v1') ?? '{}').draft?.concern)).toBe(5)
})

test('confirmed clearing waits for queued saves instead of letting them resurrect a deleted notebook', async ({ page, context }) => {
  const holder = await context.newPage()
  await holder.goto('/?page=paper-lab&paper=switch-transformers')
  await holder.evaluate(() => { void navigator.locks.request('genai-moe-experiment-notebook-v1', () => new Promise(resolve => { window.releaseMoeTestLock = resolve })) })
  await expect.poll(() => holder.evaluate(() => typeof window.releaseMoeTestLock)).toBe('function')
  await page.goto('/?page=paper-lab&paper=switch-transformers')
  await page.getByRole('radio').first().check()
  await page.getByRole('button', { name: '展开导航', exact: true }).click()
  await page.getByRole('button', { name: '我的进度', exact: true }).click()
  await page.getByRole('button', { name: '开始清空', exact: true }).click()
  await page.getByRole('button', { name: '再次点击，确认清空', exact: true }).click()
  await holder.evaluate(() => window.releaseMoeTestLock())
  await expect(page.getByRole('button', { name: '开始清空', exact: true })).toBeVisible()
  await expect.poll(() => holder.evaluate(async () => { const q = await navigator.locks.query(); return q.held.length + q.pending.length })).toBe(0)
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('genai-moe-experiment-notebook-v1') ?? '{}').resetToken)).toBeTruthy()
  const reset = await page.evaluate(() => JSON.parse(localStorage.getItem('genai-moe-experiment-notebook-v1')))
  expect(reset.lastCompleted).toBeUndefined()
  expect(reset.draft).toBeUndefined()
  expect(await page.evaluate(() => localStorage.getItem('genai-learning-progress-v1'))).toBeNull()
  await holder.close()
})

test('background save acknowledgements do not roll rapid keyboard changes back', async ({ page }) => {
  await page.goto('/?page=paper-lab&paper=switch-transformers')
  await selectPrediction(page.getByRole('radio').first())
  await page.getByRole('button', { name: '进入下一关', exact: true }).click()
  await page.getByRole('button', { name: '定位错误节点', exact: true }).click()
  await page.getByRole('button', { name: '进入下一关', exact: true }).click()
  const slider = page.getByRole('slider')
  for (let round = 0; round < 5; round++) {
    await slider.press('Home')
    for (let i = 0; i < 5; i++) await slider.press('ArrowRight')
    await expect(slider).toHaveValue('5')
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('genai-moe-experiment-notebook-v1') ?? '{}').draft?.concern)).toBe(5)
  }
})

test('a recovered save syncs an earlier completed experiment into directory progress', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem
    window.rejectMoeCompletion = true
    Storage.prototype.setItem = function (key, value) { if (key === 'genai-moe-experiment-notebook-v1' && window.rejectMoeCompletion && JSON.parse(value).lastCompleted) throw Error('quota'); return original.call(this, key, value) }
  })
  await page.goto('/?page=paper-lab&paper=switch-transformers')
  await selectPrediction(page.getByRole('radio').first())
  await page.getByRole('button', { name: '进入下一关', exact: true }).click()
  await page.getByRole('button', { name: '定位错误节点', exact: true }).click()
  await page.getByRole('button', { name: '进入下一关', exact: true }).click()
  for (let i = 0; i < 5; i++) await page.getByRole('slider').press('ArrowRight')
  await page.getByRole('button', { name: '用这个中间区间继续', exact: true }).click()
  await page.getByRole('button', { name: '既要防爆仓，也不能把请求硬塞给不擅长的人', exact: true }).click()
  await page.getByRole('button', { name: '揭晓背后的论文原理', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: '未能确认保存' })).toBeVisible()
  await page.evaluate(() => { window.rejectMoeCompletion = false })
  await page.getByRole('button', { name: '重新挑战', exact: true }).click()
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('genai-moe-experiment-notebook-v1') ?? '{}').draft?.step)).toBe(1)
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('genai-paper-lesson-progress-v1'))['switch-transformers'].completed)).toBe(true)
})
