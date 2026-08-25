import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { legacyAliases, legacyCanonicalPages, legacyCaseDeepLinks, legacyEvidenceRecord, legacyPrimaryNavigation, legacyProgressValues, legacyResourceRecord, legacyRouteKeys, legacyStorageKeys } from './compatibility.fixture.ts'
import { primarySections } from './navigation.ts'
import { sanitizeResourceLoopRecord } from './resourceLoop.ts'
import { sanitizeEvidenceRecord } from './strategyEvidence.ts'
import { readProgress } from './progress.ts'
import { canonicalPages, normalizePage, pageAliases, routeKeys } from './routeConfig.ts'

const sourceFiles = await Promise.all([
  'progress.ts', 'learningPath.ts', 'resourceLoop.ts', 'strategyEvidence.ts',
  'components/foundation/overconfident/caseStorage.ts',
  'components/paperLabs/shared/paperLessonProgress.ts',
].map((path) => readFile(new URL(path, import.meta.url), 'utf8')))
const allStorageSource = sourceFiles.join('\n')

test('变更前 33 个 canonical 页面、五入口、map 别名与八类深链参数保持不变', () => {
  assert.equal(legacyCanonicalPages.length, 33)
  assert.deepEqual(canonicalPages, legacyCanonicalPages)
  assert.deepEqual(primarySections.map(({ label, page }) => [label, page]), legacyPrimaryNavigation)
  assert.deepEqual(pageAliases, legacyAliases)
  assert.deepEqual(routeKeys, legacyRouteKeys)
  assert.equal(normalizePage('map'), 'unified-map')
  assert.deepEqual(legacyCaseDeepLinks.map((caseId) => `?page=strategy-case&case=${caseId}`), ['?page=strategy-case&case=context-window-budget', '?page=strategy-case&case=rag-chunking'])
})

test('变更前本机存储键原样保留且没有清库迁移', () => {
  for (const key of legacyStorageKeys) assert.match(allStorageSource, new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.doesNotMatch(allStorageSource, /localStorage\.clear\s*\(/)
})


test('首页、详情页与聚合页读取同一份变更前进度值', () => {
  const storage = new Map([['genai-learning-progress-v1', JSON.stringify(legacyProgressValues)]])
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
    clear: () => storage.clear(),
    key: (index) => [...storage.keys()][index] ?? null,
    get length() { return storage.size },
  }
  const homeRead = readProgress()
  const detailRead = readProgress()
  const aggregateRead = readProgress()
  assert.deepEqual({ ...homeRead }, legacyProgressValues)
  assert.deepEqual({ ...detailRead }, legacyProgressValues)
  assert.deepEqual({ ...aggregateRead }, legacyProgressValues)
})


test('旧资源闭环与策略证据记录无需迁移即可读取', () => {
  assert.equal(sanitizeResourceLoopRecord(legacyResourceRecord).initialJudgment, '先控制输入')
  assert.equal(sanitizeEvidenceRecord(legacyEvidenceRecord).summaryText, '旧策略')
})
