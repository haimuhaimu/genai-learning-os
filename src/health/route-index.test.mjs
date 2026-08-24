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
  assert.deepEqual(routeKeys, ['module', 'experiment', 'node', 'section', 'chapter', 'card', 'case'])
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

test('历史别名和未知 page 通过共享配置统一归一化', () => {
  for (const [alias, target] of Object.entries(pageAliases)) {
    assert.equal(normalizePage(alias), target)
  }
  for (const page of canonicalPages) assert.equal(normalizePage(page), page)
  assert.equal(normalizePage('unknown-page'), defaultPage)
  assert.equal(normalizePage('toString'), defaultPage)
  assert.equal(normalizePage(null), defaultPage)
})
