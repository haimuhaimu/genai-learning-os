import assert from 'node:assert/strict'
import test from 'node:test'
import { pageSectionMap, primarySectionForPage, primarySections } from './navigation.ts'
import { canonicalPages } from './routeConfig.ts'

test('主导航仅有五个稳定入口且顺序和目标正确', () => {
  assert.deepEqual(primarySections.map(({ label }) => label), ['首页', '学堂', '案例', '实验室', '工具箱'])
  assert.deepEqual(primarySections.map(({ page }) => page), ['unified-map', 'routes', 'strategy-cases', 'labs', 'toolbox'])
})

test('每个 canonical page 都有且只有一个兼容高亮分区', () => {
  assert.equal(Object.keys(pageSectionMap).length, canonicalPages.length)
  for (const page of canonicalPages) assert.ok(['home', 'academy', 'cases', 'labs', 'toolbox'].includes(primarySectionForPage(page)))
  assert.equal(primarySectionForPage('strategy-case'), 'cases')
  assert.equal(primarySectionForPage('videos'), 'toolbox')
  assert.equal(primarySectionForPage('paper-lab'), 'labs')
})
