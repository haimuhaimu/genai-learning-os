import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  canonicalPages,
  defaultPage,
  normalizePage,
  pageAliases,
  pages,
  routeKeys,
} from '../routeConfig.ts'
import { strategyCaseCatalog } from '../components/strategy/caseCatalog.ts'
import { paperResources } from '../resources/paperCatalog.ts'
import { getPaperLab, paperLabs } from '../components/paperLabs/paperLabsRegistry.ts'
import { searchIndex } from '../searchIndex.ts'

const businessSource = await readFile(new URL('../business.tsx', import.meta.url), 'utf8')
const dispatchedPages = new Set(
  [...businessSource.matchAll(/route\.page\s*===\s*(['"])([^'"]+)\1/g)].map((match) => match[2]),
)
const aliases = Object.keys(pageAliases)
const canonicalPageSet = new Set(canonicalPages)

test('页面白名单、路由参数与渲染分发保持一致', () => {
  assert.deepEqual(pages, new Set([...canonicalPages, ...aliases]))
  assert.deepEqual(dispatchedPages, canonicalPageSet)
  assert.deepEqual(routeKeys, ['module', 'experiment', 'node', 'section', 'chapter', 'card', 'case', 'paper'])
  assert.match(
    businessSource,
    /return\s*<UnifiedMap\b[^>]*\bgo\s*=\s*\{\s*go\s*\}[^>]*\/\s*>/,
    '渲染分发必须有安全 fallback',
  )
})

test('searchIndex 的 page 目标全部可渲染且不使用历史别名', () => {
  const destinations = new Set(searchIndex.map((entry) => entry.page))
  const unknown = [...destinations].filter((page) => !canonicalPageSet.has(page))
  assert.deepEqual(unknown, [])
  for (const alias of aliases) assert.ok(!destinations.has(alias), `搜索索引不得继续生成历史 ${alias} 入口`)
  assert.equal(new Set(searchIndex.map((entry) => entry.id)).size, searchIndex.length, '搜索索引 id 必须唯一')
  for (const item of strategyCaseCatalog) {
    const entry = searchIndex.find((candidate) => candidate.id === `strategy-${item.id}`)
    assert.deepEqual(entry?.options, item.options, `${item.id} 必须自动进入搜索并保留入口参数`)
  }
})

test('共建中心已接入顶级路由、渲染分发与搜索关键词', () => {
  assert.ok(canonicalPageSet.has('co-build'))
  assert.ok(dispatchedPages.has('co-build'))
  const entry = searchIndex.find((candidate) => candidate.page === 'co-build')
  assert.ok(entry, '共建中心必须进入搜索索引')
  const searchable = [entry.title, entry.subtitle, ...entry.keywords].join(' ')
  for (const keyword of ['共建', '贡献', 'good first issue', 'Strategy Case']) {
    assert.ok(searchable.includes(keyword), `共建中心必须可通过“${keyword}”搜索`)
  }
})

test('论文讲解库已接入路由，且每篇论文的标题、作者、方向和中文讲解均可搜索', () => {
  assert.ok(canonicalPageSet.has('papers'))
  assert.ok(dispatchedPages.has('papers'))
  const topEntry = searchIndex.find((candidate) => candidate.id === 'top-papers')
  assert.equal(topEntry?.page, 'papers')
  for (const paper of paperResources) {
    const entry = searchIndex.find((candidate) => candidate.id === `paper-${paper.id}`)
    assert.equal(entry?.page, 'papers', `${paper.id} 必须跳转论文页`)
    const searchable = [entry?.title, entry?.subtitle, ...(entry?.keywords ?? [])].join(' ')
    for (const expected of [paper.title, paper.authors, paper.area, paper.oneLine, paper.problem, paper.mechanism, paper.productLens, paper.readQuestion]) {
      assert.ok(searchable.includes(expected), `${paper.id} 搜索索引缺少：${expected}`)
    }
  }
})

test('论文实验深链、注册表和未知 ID 回退保持健康', () => {
  assert.ok(canonicalPageSet.has('paper-lab'))
  assert.ok(dispatchedPages.has('paper-lab'))
  assert.equal(paperLabs.length, 5)
  for (const lab of paperLabs) {
    assert.ok(paperResources.some((paper) => paper.id === lab.paperId), `${lab.paperId} 必须对应 Catalog 论文`)
    const entry = searchIndex.find((candidate) => candidate.id === `paper-lab-${lab.paperId}`)
    assert.deepEqual(entry?.options, { paper: lab.paperId })
  }
  assert.equal(getPaperLab('unknown-paper').paperId, paperLabs[0].paperId)
})

test('历史别名和未知 page 通过共享配置统一归一化', () => {
  for (const [alias, target] of Object.entries(pageAliases)) {
    assert.equal(normalizePage(alias), target)
  }
  for (const page of canonicalPages) assert.equal(normalizePage(page), page)
  assert.equal(normalizePage('unknown-page'), defaultPage)
  assert.equal(normalizePage('toString'), defaultPage)
  assert.equal(normalizePage(null), defaultPage)
})
