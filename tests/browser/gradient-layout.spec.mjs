import { test, expect } from '@playwright/test'

// Exercise real layout: reverting the narrow-screen grid sizing must make
// the document overflow after the trajectory grows, while initial load fits.
for (const width of [320, 390, 768, 1280]) {
  test(`gradient controls and trajectory remain usable at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 800 })
    await page.goto('/?page=foundation-lab&experiment=gradient-descent&node=gradient-descent')
    const run = page.getByRole('button', { name: '运行 6 步', exact: true })
    const reset = page.getByRole('button', { name: '重置', exact: true })
    const history = page.locator('.step-log')
    const expectPageToFit = async () => {
      await expect.poll(() => page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )).toBeLessThanOrEqual(1)
    }

    await expect(run).toBeVisible()
    await expectPageToFit()
    await run.click()
    await expect(history.locator('span')).toHaveCount(7)
    await expect(page.locator('.status-banner')).toContainText('收敛')
    await expectPageToFit()

    // Grow beyond the eight displayed entries and the 24-point trace window.
    for (let batch = 0; batch < 4; batch += 1) await run.click()
    await expect(history.locator('span')).toHaveCount(8)
    await expect(page.locator('.loss-curve i')).toHaveCount(24)
    await expectPageToFit()
    await expect(history.locator('span').last()).toContainText('23')

    const overflow = await history.evaluate((element) => element.scrollWidth > element.clientWidth)
    if (overflow) {
      await history.hover()
      await page.mouse.wheel(2000, 0)
      await expect.poll(() => history.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0)
      await expect(history.locator('span').last()).toBeInViewport()
    }

    // All controls stay within the horizontal viewport, not merely clipped.
    for (const control of [run, reset, ...await page.getByRole('slider').all()]) {
      const bounds = await control.boundingBox()
      expect(bounds).not.toBeNull()
      expect(bounds.x).toBeGreaterThanOrEqual(0)
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1)
    }
    await page.screenshot({ path: testInfo.outputPath('trajectory.png'), fullPage: true })
    await reset.click()
    await expect(history.locator('span')).toHaveCount(1)
    await expect(page.locator('.status-banner')).toContainText('x=4.0000')
    await expectPageToFit()
  })
}

// These experiments share the same two-column container and mobile override.
for (const experiment of ['softmax-ce', 'mlp-forward', 'transformer-block']) {
  test(`shared ${experiment} panels stay inside a 320px viewport`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 })
    await page.goto(`/?page=foundation-lab&experiment=${experiment}`)
    await expect(page.locator('.foundation-console.two-col')).toBeVisible()
    for (const panel of await page.locator('.foundation-console > section').all()) {
      const bounds = await panel.boundingBox()
      expect(bounds).not.toBeNull()
      expect(bounds.x).toBeGreaterThanOrEqual(0)
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(321)
    }
  })
}
