import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { primarySectionForPage, primarySections } from './navigation.ts'
import { canonicalPages } from './routeConfig.ts'

const headerSource = await readFile(new URL('components/shell/ProductHeader.tsx', import.meta.url), 'utf8')

test('导航渲染五入口配置，工具操作不混入主入口配置', () => {
  assert.equal(primarySections.length, 5)
  assert.match(headerSource, /primarySections\.map/)
  for (const tool of ['搜索', '反馈', '复制链接', '我的进度']) assert.match(headerSource, new RegExp(tool))
})

test('移动菜单声明展开状态，展开后进入视觉顺序，并在 Escape 后将焦点还给触发器', () => {
  assert.match(headerSource, /aria-expanded=\{open\}/)
  assert.match(headerSource, /firstNavItemRef\.current\?\.focus\(\)/)
  assert.match(headerSource, /index === 0 \? firstNavItemRef/)
  assert.match(headerSource, /event\.key === 'Escape'/)
  assert.match(headerSource, /menuButtonRef\.current\?\.focus\(\)/)
  assert.match(headerSource, /aria-controls='lo-primary-navigation'/)
})

test('课程、案例、实验与资源旧页分别高亮正确五入口分区', () => {
  const expected = {
    foundation: 'academy',
    'strategy-case': 'cases',
    'agent-book-lab': 'labs',
    videos: 'toolbox',
    papers: 'toolbox',
    progress: 'home',
  }
  for (const [page, section] of Object.entries(expected)) assert.equal(primarySectionForPage(page), section)
  for (const page of canonicalPages) assert.notEqual(primarySectionForPage(page), undefined)
})
