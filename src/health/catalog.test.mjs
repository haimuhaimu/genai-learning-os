import assert from 'node:assert/strict'
import test from 'node:test'
import {
  caseIds,
  decisionMathCaseIds,
  flagshipCaseIds,
  frontierCaseIds,
  routeIds,
  strategyCaseCatalog,
} from '../components/strategy/caseCatalog.ts'
import { strategyCaseRegistry, strategyCaseSpecs } from '../components/strategy/caseRegistry.ts'
import { caseEntries } from '../content/registry/cases.ts'
import { labEntries } from '../content/registry/labs.ts'
import { paperEntries, videoEntries } from '../content/registry/resources.ts'
import { paperResources } from '../resources/paperCatalog.ts'
import { validateVideoCatalog, videoResources } from '../resources/videoCatalog.ts'

const expectedRoutes = new Set(['foundation', 'ai-decision-math', 'llm', 'image', 'agent', 'agent-book', 'distill', 'self-evolving', 'world-model'])
const routesRequiringVideos = [...expectedRoutes].filter((routeId) => routeId !== 'ai-decision-math')

test('策略案例 catalog 与 registry 无重复、无丢失且入口参数自洽', () => {
  assert.strictEqual(strategyCaseRegistry, strategyCaseCatalog)
  assert.equal(new Set(caseIds).size, strategyCaseCatalog.length)
  assert.equal(strategyCaseSpecs.size, strategyCaseCatalog.filter((item) => item.spec).length)

  for (const item of strategyCaseCatalog) {
    if (item.page === 'strategy-case') {
      assert.equal(item.options.case, item.id, `${item.id} 的 case 入口不一致`)
      assert.strictEqual(strategyCaseSpecs.get(item.id), item.spec, `${item.id} 未进入 registry`)
    } else {
      assert.equal(item.id, 'foundation-feedback-loop')
      assert.equal(item.page, 'foundation-lab')
      assert.equal(item.options.experiment, 'case-overconfident')
    }
  }
})

test('九条路线保留高价值案例结构与关键覆盖', () => {
  assert.deepEqual(new Set(routeIds), expectedRoutes)
  for (const routeId of expectedRoutes) {
    assert.ok(strategyCaseCatalog.some((item) => item.routeId === routeId), `${routeId} 缺少策略案例`)
  }
  assert.equal(flagshipCaseIds.size, 6, '代表案例应保持六条主干覆盖')
  assert.equal(frontierCaseIds.size, 2, '前沿探索应同时覆盖自进化与世界模型')
  assert.equal(decisionMathCaseIds.size, 8, 'AI 决策数学应保持八个短案例')
  assert.deepEqual(new Set([...frontierCaseIds].map((id) => strategyCaseCatalog.find((item) => item.id === id)?.routeId)), new Set(['self-evolving', 'world-model']))
})

test('视频 catalog 合法，并覆盖所有非数学内容路线与旗舰案例', () => {
  assert.strictEqual(validateVideoCatalog(videoResources), videoResources)
  assert.equal(new Set(videoResources.map((video) => video.id)).size, videoResources.length)

  for (const routeId of routesRequiringVideos) {
    assert.ok(videoResources.some((video) => video.relatedRouteIds.includes(routeId)), `${routeId} 缺少视频资源`)
  }
  for (const caseId of flagshipCaseIds) {
    const related = videoResources.filter((video) => video.relatedCaseIds.includes(caseId))
    assert.ok(related.length >= 2, `${caseId} 至少需要两条视频资源`)
  }
})


test('统一 registry 与案例、实验、视频、论文 catalog 双向投影无遗漏或漂移', () => {
  assert.deepEqual(new Set(caseEntries.map((entry) => entry.legacyId)), new Set(strategyCaseCatalog.map((entry) => entry.id)))
  assert.deepEqual(new Set(videoEntries.map((entry) => entry.resource.id)), new Set(videoResources.map((entry) => entry.id)))
  assert.deepEqual(new Set(paperEntries.map((entry) => entry.resource.id)), new Set(paperResources.map((entry) => entry.id)))
  assert.ok(labEntries.some((entry) => entry.family === 'foundation'))
  assert.ok(labEntries.some((entry) => entry.family === 'expert'))
  assert.ok(labEntries.some((entry) => entry.family === 'agent'))
  assert.ok(labEntries.some((entry) => entry.family === 'agent-book'))
  assert.ok(labEntries.some((entry) => entry.family === 'distill'))
  assert.ok(labEntries.some((entry) => entry.family === 'paper'))
  for (const entry of caseEntries) {
    const original = strategyCaseCatalog.find((item) => item.id === entry.legacyId)
    assert.deepEqual(entry.route, { page: original.page, options: original.options })
  }
})
