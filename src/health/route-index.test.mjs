import assert from 'node:assert/strict'
import test from 'node:test'
import { canonicalPages, defaultPage, normalizePage, pageAliases, pages, routeKeys } from '../routeConfig.ts'
import { pageLoaders } from '../pageRegistry.tsx'
import { strategyCaseCatalog } from '../components/strategy/caseCatalog.ts'
import { paperResources } from '../resources/paperCatalog.ts'
import { getPaperLab, goldenPaperLabs, paperLabs, resolvePaperLabRoute } from '../components/paperLabs/paperLabsRegistry.ts'
import { searchIndex } from '../searchIndex.ts'

const aliases = Object.keys(pageAliases)
const canonicalPageSet = new Set(canonicalPages)
const dispatchedPages = new Set(Object.keys(pageLoaders))

test('页面白名单、路由参数与懒加载分发保持一致', () => {
  assert.deepEqual(pages, new Set([...canonicalPages, ...aliases]))
  assert.deepEqual(dispatchedPages, canonicalPageSet)
  assert.deepEqual(routeKeys, ['module', 'experiment', 'node', 'section', 'chapter', 'card', 'case', 'paper'])
  assert.equal(typeof pageLoaders['unified-map'], 'function', '渲染分发必须有安全首页')
})

test('searchIndex 的 page 目标全部可渲染且不使用历史别名', () => {
  const destinations = new Set(searchIndex.map((entry) => entry.page))
  assert.deepEqual([...destinations].filter((page) => !canonicalPageSet.has(page)), [])
  for (const alias of aliases) assert.ok(!destinations.has(alias), `搜索索引不得继续生成历史 ${alias} 入口`)
  assert.equal(new Set(searchIndex.map((entry) => entry.id)).size, searchIndex.length)
  for (const item of strategyCaseCatalog) assert.deepEqual(searchIndex.find((entry) => entry.id === `strategy-${item.id}`)?.options, item.options)
})

test('共建中心、论文库与工具箱都有可渲染入口', () => {
  for (const page of ['co-build', 'papers', 'toolbox']) {
    assert.ok(canonicalPageSet.has(page))
    assert.ok(dispatchedPages.has(page))
  }
  const coBuild = searchIndex.find((entry) => entry.page === 'co-build')
  const searchable = [coBuild?.title, coBuild?.subtitle, ...(coBuild?.keywords ?? [])].join(' ')
  for (const keyword of ['共建', '贡献', 'good first issue', 'Strategy Case']) assert.ok(searchable.includes(keyword))
  for (const paper of paperResources) {
    const entry = searchIndex.find((candidate) => candidate.id === `paper-${paper.id}`)
    assert.equal(entry?.page, 'papers')
    const text = [entry?.title, entry?.subtitle, ...(entry?.keywords ?? [])].join(' ')
    for (const expected of [paper.title, paper.authors, paper.area, paper.oneLine, paper.problem, paper.mechanism, paper.productLens, paper.readQuestion]) assert.ok(text.includes(expected), `${paper.id} 搜索索引缺少：${expected}`)
  }
})

test('论文实验深链、注册表和未知 ID 回退保持健康', () => {
  assert.ok(canonicalPageSet.has('paper-lab'))
  assert.ok(dispatchedPages.has('paper-lab'))
  assert.equal(paperLabs.length, 7)
  assert.equal(goldenPaperLabs.length, 7)
  assert.deepEqual(goldenPaperLabs.map((lab) => lab.order), [1, 2, 3, 4, 5, 6, 7])
  for (const lab of paperLabs) {
    assert.ok(paperResources.some((paper) => paper.id === lab.paperId))
    assert.deepEqual(searchIndex.find((entry) => entry.id === `paper-lab-${lab.paperId}`)?.options, { paper: lab.paperId })
  }
  assert.equal(getPaperLab('unknown-paper').paperId, paperLabs[0].paperId)
  assert.deepEqual(resolvePaperLabRoute(undefined), { kind: 'hub' })
  assert.equal(resolvePaperLabRoute('unknown-paper').unknown, true)
})

test('历史别名和未知 page 通过共享配置统一归一化', () => {
  for (const [alias, target] of Object.entries(pageAliases)) assert.equal(normalizePage(alias), target)
  for (const page of canonicalPages) assert.equal(normalizePage(page), page)
  assert.equal(normalizePage('unknown-page'), defaultPage)
  assert.equal(normalizePage('toString'), defaultPage)
  assert.equal(normalizePage(null), defaultPage)
})
