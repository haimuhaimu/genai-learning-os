import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { pageLoaders } from './pageRegistry.tsx'
import { canonicalPages } from './routeConfig.ts'

const [registrySource, businessSource, loadingSource, errorSource, chartSource, llmSource, imageSource, agentBookSource] = await Promise.all([
  'pageRegistry.tsx',
  'business.tsx',
  'components/shell/PageLoading.tsx',
  'components/shell/PageLoadErrorBoundary.tsx',
  'components/charts/LazyLearningChart.tsx',
  'components/LLMExpertLabs.tsx',
  'components/ImageExpertLabs.tsx',
  'components/AgentBookExperiments.tsx',
].map((path) => readFile(new URL(path, import.meta.url), 'utf8')))

test('全部 canonical page 都通过异步 importer 注册', () => {
  assert.deepEqual(new Set(Object.keys(pageLoaders)), new Set(canonicalPages))
  for (const page of canonicalPages) assert.equal(typeof pageLoaders[page], 'function')
  assert.doesNotMatch(registrySource, /^import .*components\//m)
  assert.match(registrySource, /import\('\.\/components\/foundation\/UnifiedMap'\)/)
})

test('页面加载与 chunk 失败都有非空且可恢复的语义反馈', () => {
  assert.match(loadingSource, /role='status'/)
  assert.match(loadingSource, /正在打开学习空间/)
  assert.match(errorSource, /页面暂时无法打开/)
  assert.match(errorSource, /重新加载/)
  assert.match(errorSource, /返回首页/)
  assert.match(businessSource, /<Suspense fallback={<PageLoading \/>}>/)
  assert.match(businessSource, /PageLoadErrorBoundary/)
})

test('页面切换尊重 reduced motion 且保留焦点恢复', () => {
  assert.match(businessSource, /prefers-reduced-motion: reduce/)
  assert.match(businessSource, /behavior.*'auto'.*'smooth'/)
  assert.match(businessSource, /focus\(\{ preventScroll: true \}\)/)
})

test('所有静态 Recharts 引用收口到二级 lazy 图表边界', () => {
  assert.match(chartSource, /lazy\(\(\) => import\('\.\/LearningChart'\)\)/)
  for (const source of [llmSource, imageSource, agentBookSource]) {
    assert.doesNotMatch(source, /from ['"]recharts['"]/)
    assert.match(source, /LazyLearningChart/)
  }
})
