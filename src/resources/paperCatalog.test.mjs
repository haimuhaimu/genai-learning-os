import assert from 'node:assert/strict'
import test from 'node:test'
import { paperResources, validatePaperCatalog } from './paperCatalog.ts'

const references = { caseIds: ['example-case'], routeIds: ['llm'] }
const validPaper = (overrides = {}) => ({
  id: 'example-paper',
  title: 'Example Paper',
  authors: 'A. Researcher et al.',
  year: 2024,
  area: 'Transformer / LLM',
  level: '入门',
  kind: '方法论文',
  url: 'https://arxiv.org/abs/2401.00001',
  relatedCaseIds: ['example-case'],
  relatedRouteIds: ['llm'],
  oneLine: '一句话解释论文解决的问题。',
  problem: '明确说明此前方案的核心失败。',
  mechanism: '解释方法为何能够修复这个失败。',
  productLens: '说明上线时需要观察的代价与边界。',
  readQuestion: '我能否设计一个实验验证论文的核心主张？',
  readingMinutes: 30,
  ...overrides,
})

test('正式论文 Catalog 合法且覆盖核心方向与代表作', () => {
  assert.equal(validatePaperCatalog(paperResources), paperResources)
  assert.ok(paperResources.length >= 20)
  assert.deepEqual(new Set(paperResources.map(({ area }) => area)), new Set([
    '推荐系统', 'Transformer / LLM', '扩散 / 多模态', 'Agent / Harness', '自我改进 / 世界模型',
  ]))
  const ids = new Set(paperResources.map(({ id }) => id))
  for (const id of ['wide-and-deep', 'attention-is-all-you-need', 'distilling-the-knowledge-in-a-neural-network', 'flashattention', 'ddpm', 'clip', 'react', 'traject-bench', 'reflexion', 'dreamerv3']) {
    assert.ok(ids.has(id), `缺少关键代表作：${id}`)
  }
  const distillation = paperResources.find(({ id }) => id === 'distilling-the-knowledge-in-a-neural-network')
  assert.deepEqual(distillation?.relatedCaseIds, ['distill-retention'])
  assert.deepEqual(distillation?.relatedRouteIds, ['distill'])
  assert.equal(distillation?.url, 'https://arxiv.org/abs/1503.02531')
})

test('合法论文通过强校验', () => {
  const papers = [validPaper()]
  assert.equal(validatePaperCatalog(papers, references), papers)
})

test('拒绝重复 id、重复 URL 与非 kebab-case id', () => {
  assert.throws(() => validatePaperCatalog([validPaper(), validPaper({ title: 'Duplicate' })], references), /重复 id.*重复 URL/s)
  assert.throws(() => validatePaperCatalog([validPaper({ id: 'Bad Paper' })], references), /kebab-case/)
})

test('只允许 HTTPS arxiv 论文入口', () => {
  assert.throws(() => validatePaperCatalog([validPaper({ url: 'http://arxiv.org/abs/2401.00001' })], references), /HTTPS/)
  assert.throws(() => validatePaperCatalog([validPaper({ url: 'https://example.com/paper' })], references), /arxiv.org/)
  assert.equal(validatePaperCatalog([validPaper({ url: 'https://ar5iv.labs.arxiv.org/html/2401.00001' })], references).length, 1)
})

test('拒绝非法年份、阅读时长、枚举与空讲解', () => {
  assert.throws(() => validatePaperCatalog([validPaper({ year: 2009 })], references), /year/)
  assert.throws(() => validatePaperCatalog([validPaper({ readingMinutes: 9 })], references), /readingMinutes/)
  assert.throws(() => validatePaperCatalog([validPaper({ area: '未知方向' })], references), /area 无效/)
  assert.throws(() => validatePaperCatalog([validPaper({ mechanism: '   ' })], references), /mechanism 不能为空/)
})

test('拒绝空关联或不存在的 case / route', () => {
  assert.throws(() => validatePaperCatalog([validPaper({ relatedCaseIds: [], relatedRouteIds: [] })], references), /至少关联一个/)
  assert.throws(() => validatePaperCatalog([validPaper({ relatedCaseIds: ['missing-case'] })], references), /不存在的 case/)
  assert.throws(() => validatePaperCatalog([validPaper({ relatedRouteIds: ['missing-route'] })], references), /不存在的 route/)
})

test('每篇论文都具备可读讲解、合理年份与阅读时长', () => {
  for (const paper of paperResources) {
    assert.match(paper.url, /^https:\/\/(?:[^/]+\.)?arxiv\.org\//)
    assert.ok(paper.year >= 2010 && paper.year <= 2030)
    assert.ok(paper.readingMinutes >= 10 && paper.readingMinutes <= 180)
    for (const field of ['oneLine', 'problem', 'mechanism', 'productLens', 'readQuestion']) assert.ok(paper[field].trim(), `${paper.id}.${field} 不能为空`)
  }
})
