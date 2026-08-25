import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { contentEntries, registryIssues, visibleContentEntries } from './registry/index.ts'
import { selectCourses, selectLabs, selectResources } from './selectors.ts'
import { partitionValidEntries } from './validateRegistry.ts'

const hubSources = await Promise.all([
  '../components/hubs/LearningRoutesHub.tsx',
  '../components/hubs/LabsHub.tsx',
  '../components/hubs/ResourcesHub.tsx',
].map((path) => readFile(new URL(path, import.meta.url), 'utf8')))
const [routesSource, labsSource, resourcesSource] = hubSources

const courseIds = new Set(contentEntries.filter((entry) => entry.type === 'course').map((entry) => entry.id))
const labIds = new Set(contentEntries.filter((entry) => entry.type === 'lab').map((entry) => entry.id))
const caseIds = new Set(contentEntries.filter((entry) => entry.type === 'case').map((entry) => entry.id))

test('三个聚合页使用统一 registry 与 selector，不维护平行入口数组', () => {
  for (const source of hubSources) {
    assert.match(source, /content\/registry/)
    assert.match(source, /ContentFilters/)
    assert.match(source, /ContentEmptyState/)
    assert.match(source, /RegistryFallback/)
  }
  assert.match(routesSource, /selectCourses\(visibleContentEntries/)
  assert.match(labsSource, /selectLabs\(visibleContentEntries/)
  assert.match(resourcesSource, /selectResources\(visibleContentEntries/)
})

test('学堂、实验室和工具箱聚合完整覆盖各自公开类型', () => {
  assert.equal(registryIssues.length, 0)
  assert.equal(selectCourses(visibleContentEntries).length, courseIds.size)
  assert.equal(selectLabs(visibleContentEntries).length, labIds.size)
  assert.equal(selectResources(visibleContentEntries).length, contentEntries.filter((entry) => entry.type === 'video' || entry.type === 'paper').length)
})

test('全部 registry 卡片入口合法且关联对象可解析到正确类型', () => {
  for (const entry of visibleContentEntries) {
    assert.ok(entry.route.page)
    for (const id of entry.relatedLabIds ?? []) assert.ok(labIds.has(id), `${entry.id} 的实验关联 ${id} 不存在`)
    for (const id of entry.relatedCaseIds ?? []) assert.ok(caseIds.has(id), `${entry.id} 的案例关联 ${id} 不存在`)
  }
})

test('坏条目被隔离；全部失效时可进入整体兜底，组合筛选可产生空状态', () => {
  const valid = visibleContentEntries[0]
  const invalid = { ...valid, id: 'broken:item', route: { page: 'missing' } }
  const partial = partitionValidEntries([valid, invalid])
  assert.deepEqual(partial.validEntries.map((entry) => entry.id), [valid.id])
  assert.deepEqual(partial.invalidEntries.map((entry) => entry.id), ['broken:item'])
  assert.equal(partitionValidEntries([invalid]).validEntries.length, 0)
  assert.deepEqual(selectCourses(visibleContentEntries, { tags: ['resource'] }), [])
})
