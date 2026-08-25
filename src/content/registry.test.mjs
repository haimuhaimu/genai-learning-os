import assert from 'node:assert/strict'
import test from 'node:test'
import { contentEntries } from './registry/index.ts'
import { validateRegistry } from './validateRegistry.ts'

const base = contentEntries.find((entry) => entry.type === 'course')
const clone = (patch) => ({ ...base, id: 'course:test', ...patch })

test('完整内容 registry 通过全部完整性校验', () => {
  assert.deepEqual(validateRegistry(contentEntries), [])
  assert.equal(new Set(contentEntries.map((entry) => entry.id)).size, contentEntries.length)
})

test('校验器报告重复 ID、非法路由、参数、标签和词表字段', () => {
  const entries = [base, clone({ id: base.id, route: { page: 'missing', options: { bad: 'x' } }, tags: ['bad'], level: 'bad', status: 'bad' })]
  const codes = new Set(validateRegistry(entries).map((issue) => issue.code))
  for (const code of ['duplicate-id', 'invalid-page', 'invalid-route-key', 'invalid-tag', 'invalid-level', 'invalid-status']) assert.ok(codes.has(code), `缺少 ${code}`)
})

test('校验器报告悬空关联与错型关联', () => {
  const entries = [base, clone({ relatedLabIds: ['lab:missing', base.id], relatedCaseIds: ['case:missing', base.id] })]
  const issues = validateRegistry(entries)
  assert.ok(issues.some((issue) => issue.code === 'missing-relation' && issue.field === 'relatedLabIds'))
  assert.ok(issues.some((issue) => issue.code === 'wrong-relation-type' && issue.field === 'relatedLabIds'))
  assert.ok(issues.some((issue) => issue.code === 'missing-relation' && issue.field === 'relatedCaseIds'))
  assert.ok(issues.some((issue) => issue.code === 'wrong-relation-type' && issue.field === 'relatedCaseIds'))
})
