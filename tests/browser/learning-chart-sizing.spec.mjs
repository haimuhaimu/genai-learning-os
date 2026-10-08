import { test, expect } from '@playwright/test'

const charts = [
  { experiment: 'attention-scale', name: '折线图', height: 310, mark: 'polyline', count: 2 },
  { experiment: 'kv-cost', name: '面积图', height: 220, mark: 'polygon', count: 2 },
  { experiment: 'diffusion-flow', name: '柱状图', height: 240, mark: 'rect:has(title)', count: 5 },
]

async function expectChartToFit(chart, height) {
  await expect(chart).toBeVisible()
  await expect.poll(() => chart.evaluate((svg) => {
    const container = svg.closest('.recharts-responsive-container')
    return Math.abs(svg.getBoundingClientRect().width - container.getBoundingClientRect().width)
  })).toBeLessThanOrEqual(1)
  const size = await chart.evaluate((svg) => ({
    width: svg.getBoundingClientRect().width,
    height: svg.getBoundingClientRect().height,
    viewWidth: svg.viewBox.baseVal.width,
    viewHeight: svg.viewBox.baseVal.height,
  }))
  expect(size.width).toBeGreaterThan(0)
  expect(size.height).toBe(height)
  expect(size.viewHeight).toBe(height)
  // A CSS-only shrink must not leave the plot geometry at its 640px fallback.
  expect(Math.abs(size.viewWidth - size.width)).toBeLessThanOrEqual(1)
}

for (const { experiment, name, height, mark, count } of charts) {
  for (const width of [320, 390, 768, 1280]) {
    test(`${experiment} chart uses its measured width at ${width}px`, async ({ page }, testInfo) => {
      const errors = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.setViewportSize({ width, height: 800 })
      await page.goto(`/?page=expert-lab&experiment=${experiment}`)
      const chart = page.getByRole('img', { name, exact: true })
      await expectChartToFit(chart, height)
      await expect(chart.locator(mark)).toHaveCount(count)
      await expect.poll(() => page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )).toBeLessThanOrEqual(1)
      await page.screenshot({ path: testInfo.outputPath('chart.png'), fullPage: true })
      expect(errors).toEqual([])
    })
  }
}

test('chart follows viewport and container-only resizes without reloading', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/?page=expert-lab&experiment=attention-scale')
  const chart = page.getByRole('img', { name: '折线图', exact: true })
  await expectChartToFit(chart, 310)
  for (const width of [320, 768, 390, 1280]) {
    await page.setViewportSize({ width, height: 800 })
    await expectChartToFit(chart, 310)
  }
  // Exercise actual ResizeObserver notifications, without faking its callback.
  for (const width of [250, 800]) {
    await page.locator('.chart-card').evaluate((card, width) => {
      card.style.width = `${width}px`
    }, width)
    await expectChartToFit(chart, 310)
  }
  await page.locator('.chart-card').evaluate((card) => { card.style.display = 'none' })
  // Wait for the observer to process zero size, not just CSS visibility.
  await expect(chart).toHaveCount(0)
  await page.locator('.chart-card').evaluate((card) => {
    card.style.removeProperty('display')
    card.style.removeProperty('width')
  })
  await expectChartToFit(chart, 310)
})

test('sized chart still updates data when the learner changes model parameters', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await page.goto('/?page=expert-lab&experiment=attention-scale')
  const chart = page.getByRole('img', { name: '折线图', exact: true })
  await expectChartToFit(chart, 310)
  const point = chart.locator('circle title').first()
  const before = await point.textContent()
  await page.getByRole('slider', { name: /Hidden size/ }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(point).not.toHaveText(before)
  await expectChartToFit(chart, 310)
})
