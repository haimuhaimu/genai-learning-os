import { test, expect } from '@playwright/test'

const cases = [
  ['attention-is-all-you-need', '找到退款证据', 'home', '没有关注正确证据', 'distilling-the-knowledge-in-a-neural-network'],
  ['distilling-the-knowledge-in-a-neural-network', '把大模型装进小模型', 'temperature', '中间档既保留优先答案，也暴露相近选项的差距', 'wide-and-deep'],
  ['wide-and-deep', '给新内容一次机会', 'end', '旧经验与新机会要平衡', 'ddpm'],
  ['ddpm', '从噪点还原图片', 'end', '先估准杂点，才能保住结构', 'react'],
  ['react', '阻止 Agent 自信犯错', 'end', '动作前查证，冲突时停止', 'dreamerv3'],
  ['dreamerv3', '在想象中训练决策', 'end', '推得越远，越要防小错累积', 'switch-transformers'],
]
for (const [paper, title, control, rule, next] of cases) {
  test(`existing ${title} still completes, restarts without dropping completion, and opens next lesson`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(`/?page=paper-lab&paper=${paper}`)
    await page.getByRole('radio').nth(1).check()
    await page.locator('.golden-primary-button').click()
    await page.getByRole('button', { name: control === 'home' ? '查看它最关注了哪句话' : '定位错误节点', exact: true }).click()
    await page.locator('.golden-primary-button').click()
    const slider = page.getByRole('slider')
    await slider.press('Home')
    if (control === 'end') await slider.press('End')
    if (control === 'temperature') for (let i = 0; i < 3; i++) await slider.press('ArrowRight')
    await expect(page.locator('.golden-primary-button')).toBeEnabled()
    await page.locator('.golden-primary-button').click()
    await page.getByRole('button', { name: rule, exact: true }).click()
    await page.locator('.golden-primary-button').click()
    await expect(page.locator('.golden-complete')).toContainText('通关')
    expect(await page.evaluate(id => JSON.parse(localStorage.getItem('genai-paper-lesson-progress-v1'))[id].completed, paper)).toBe(true)
    expect(await page.evaluate(() => localStorage.getItem('genai-moe-experiment-notebook-v1'))).toBeNull()
    await page.getByRole('button', { name: '重新挑战', exact: true }).click()
    await expect(page.getByRole('radio').first()).toBeVisible()
    const after = await page.evaluate(id => JSON.parse(localStorage.getItem('genai-paper-lesson-progress-v1'))[id], paper)
    expect(after).toEqual({ step: 1, completed: true })
    // Existing courses intentionally keep step-only replay in this MoE-scoped change.
    await page.goto(`/?page=paper-lab&paper=${paper}`)
    await page.getByRole('radio').nth(1).check()
    await page.locator('.golden-primary-button').click()
    await page.getByRole('button', { name: control === 'home' ? '查看它最关注了哪句话' : '定位错误节点', exact: true }).click()
    await page.locator('.golden-primary-button').click()
    await slider.press(control === 'home' ? 'Home' : 'End')
    if (control === 'temperature') { await slider.press('Home'); for (let i = 0; i < 3; i++) await slider.press('ArrowRight') }
    await page.locator('.golden-primary-button').click()
    await page.getByRole('button', { name: rule, exact: true }).click()
    await page.locator('.golden-primary-button').click()
    await page.getByRole('button', { name: '下一课', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`paper=${next}`))
  })
}
