import assert from 'node:assert/strict'
import test from 'node:test'
import { getCaseVideoSelection, validateVideoCatalog, videoResources } from './videoCatalog.ts'

const references = { caseIds: ['example-case'], routeIds: ['llm'] }
const validResource = (overrides = {}) => ({
  id: 'example-video',
  title: '示例课程',
  org: 'DeepLearning.AI',
  language: 'en',
  sourceType: 'course',
  contentOrigin: '海外原版',
  url: 'https://www.deeplearning.ai/courses/example',
  relatedCaseIds: ['example-case'],
  relatedRouteIds: ['llm'],
  whyWorthWatching: '补足一个明确的机制卡点。',
  returnQuestion: '回到案例再看：这改变了哪个决策？',
  level: '入门',
  ...overrides,
})

test('正式视频 Catalog 合法且在原 31 条基础上新增至少 10 条资源', () => {
  assert.equal(validateVideoCatalog(videoResources), videoResources)
  assert.ok(videoResources.length >= 41)
  const ids = new Set(videoResources.map(({ id }) => id))
  for (const id of ['3blue1brown-backprop-calculus', 'statquest-video-index', 'd2l-chinese-textbook', 'hungyi-lee-genai-2024', 'openbmb-llm-open-course', 'hugging-face-diffusion-course', 'mit-practical-diffusion-2026', 'deeplearning-ai-nemo-agent-reliability', 'google-recommendation-systems']) {
    assert.ok(ids.has(id), `缺少新增重点资源：${id}`)
  }
  assert.deepEqual(new Set(videoResources.map(({ sourceType }) => sourceType)), new Set(['youtube', 'bilibili', 'course', 'paper', 'blog', 'report']))
  assert.deepEqual(new Set(videoResources.map(({ contentOrigin }) => contentOrigin)), new Set(['中文原创', '中文译制', '海外原版']))
})

test('合法 Catalog 通过校验', () => {
  const resources = [validResource()]
  assert.equal(validateVideoCatalog(resources, references), resources)
})

test('拒绝重复 id 和重复主 URL', () => {
  const duplicate = validResource({ title: '另一条资源' })
  assert.throws(() => validateVideoCatalog([validResource(), duplicate], references), /重复 id.*重复 URL/s)
})

test('拒绝非法 sourceType 和 contentOrigin', () => {
  assert.throws(() => validateVideoCatalog([validResource({ sourceType: 'short-video' })], references), /sourceType 无效/)
  assert.throws(() => validateVideoCatalog([validResource({ contentOrigin: undefined })], references), /contentOrigin 无效/)
})

test('拒绝非法协议和不允许的域名', () => {
  assert.throws(() => validateVideoCatalog([validResource({ url: 'http://www.youtube.com/watch?v=example' })], references), /HTTPS/)
  assert.throws(() => validateVideoCatalog([validResource({ url: 'https://video.example.com/watch/example' })], references), /不允许的域名/)
})

test('paper / blog / report 不允许写 durationLabel', () => {
  const paper = validResource({
    id: 'paper-video',
    sourceType: 'paper',
    url: 'https://arxiv.org/abs/2401.00000',
    durationLabel: '约 20 分钟',
  })
  assert.throws(() => validateVideoCatalog([paper], references), /不允许写 durationLabel/)
  const blog = validResource({
    id: 'blog-video',
    sourceType: 'blog',
    url: 'https://lilianweng.github.io/posts/2024-01-01-demo/',
    durationLabel: '约 10 分钟',
  })
  assert.throws(() => validateVideoCatalog([blog], references), /不允许写 durationLabel/)
  const report = validResource({
    id: 'report-video',
    sourceType: 'report',
    url: 'https://www.technologyreview.com/2024/01/01/demo/',
    durationLabel: '约 8 分钟',
  })
  assert.throws(() => validateVideoCatalog([report], references), /不允许写 durationLabel/)
})

test('paper / blog / report 允许在白名单域名下不写 durationLabel 通过校验', () => {
  const resources = [
    validResource({ id: 'paper-ok', sourceType: 'paper', url: 'https://arxiv.org/abs/2404.00000' }),
    validResource({ id: 'blog-ok', sourceType: 'blog', url: 'https://deepmind.google/blog/example/' }),
    validResource({ id: 'report-ok', sourceType: 'report', url: 'https://www.technologyreview.com/2026/08/18/demo/' }),
  ]
  assert.equal(validateVideoCatalog(resources, references).length, 3)
})

test('校验原始来源 URL，但不把它计入主 URL 唯一冲突', () => {
  const official = validResource({ id: 'official-video', url: 'https://www.youtube.com/watch?v=official' })
  const translated = validResource({
    id: 'translated-video',
    sourceType: 'bilibili',
    contentOrigin: '中文译制',
    url: 'https://www.bilibili.com/video/BV1example/',
    originalSourceUrl: official.url,
  })
  assert.equal(validateVideoCatalog([official, translated], references).length, 2)
  assert.throws(() => validateVideoCatalog([validResource({ originalSourceUrl: 'http://www.youtube.com/watch?v=source' })], references), /originalSourceUrl 必须使用 HTTPS/)
  assert.throws(() => validateVideoCatalog([validResource({ originalSourceUrl: 'https://video.example.com/source' })], references), /originalSourceUrl 使用了不允许的域名/)
  assert.throws(() => validateVideoCatalog([validResource({ originalSourceUrl: 'https://www.deeplearning.ai/courses/example' })], references), /不能与主 URL 相同/)
})

test('拒绝空关联', () => {
  assert.throws(() => validateVideoCatalog([validResource({ relatedCaseIds: [], relatedRouteIds: [] })], references), /至少关联一个/)
})

test('拒绝不存在的 case 或 route 关联', () => {
  assert.throws(() => validateVideoCatalog([validResource({ relatedCaseIds: ['missing-case'] })], references), /不存在的 case/)
  assert.throws(() => validateVideoCatalog([validResource({ relatedRouteIds: ['missing-route'] })], references), /不存在的 route/)
})

test('Case 视频 selector 按显式优先级排序且最多返回 3 条', () => {
  const foundation = getCaseVideoSelection('foundation-feedback-loop')
  assert.equal(foundation.videos.length, 3)
  assert.equal(foundation.remaining, 1)
  assert.ok(foundation.videos.some(({ id }) => id === 'karpathy-zero-to-hero-bilibili'))
  assert.deepEqual(foundation.videos.map(({ casePriority }) => casePriority), [10, 15, 20])

  const rag = getCaseVideoSelection('rag-budget')
  assert.equal(rag.videos.length, 3)
  assert.equal(rag.remaining, 3)
  assert.ok(rag.videos.some(({ id }) => ['karpathy-llm-deep-dive-bilibili', 'andrew-ng-advanced-rag-bilibili'].includes(id)))
})

test('Image、Agent 与 Distill 的 Case 前三条包含本轮中文原创', () => {
  for (const caseId of ['image-unit-cost', 'refund-gate', 'new-information', 'distill-retention']) {
    const { videos } = getCaseVideoSelection(caseId)
    assert.ok(videos.some(({ contentOrigin }) => contentOrigin === '中文原创'), `${caseId} 缺少中文原创资源`)
    assert.ok(videos.length <= 3)
  }
})

test('前沿探索 case 至少有 3 条资源，且前三条包含 1 条中文', () => {
  for (const caseId of ['evaluator-trust', 'simulator-vs-reality']) {
    const { videos, total } = getCaseVideoSelection(caseId)
    assert.ok(total >= 3, `${caseId} 前沿资源不足 3 条`)
    assert.equal(videos.length, 3)
    assert.ok(videos.some(({ contentOrigin }) => contentOrigin === '中文原创'), `${caseId} 前三条缺少中文原创`)
  }
})
