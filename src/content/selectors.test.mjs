import assert from 'node:assert/strict'
import test from 'node:test'
import { selectContent, selectCourses, selectResources } from './selectors.ts'

const entries = [
  { id: 'course:a', type: 'course', title: 'A', summary: 'A', route: { page: 'routes' }, tags: ['foundation'], level: 'beginner', status: 'published', relatedLabIds: ['lab:a'] },
  { id: 'course:draft', type: 'course', title: 'D', summary: 'D', route: { page: 'routes' }, tags: ['foundation'], level: 'beginner', status: 'draft' },
  { id: 'video:a', type: 'video', title: 'V', summary: 'V', route: { page: 'videos' }, tags: ['resource', 'llm'], level: 'intermediate', status: 'published', externalUrl: 'https://example.com', resource: {} },
  { id: 'paper:a', type: 'paper', title: 'P', summary: 'P', route: { page: 'papers' }, tags: ['resource', 'llm'], level: 'advanced', status: 'published', externalUrl: 'https://example.com', resource: {} },
]

test('默认查询隐藏非公开条目并支持组合筛选', () => {
  assert.deepEqual(selectCourses(entries).map((entry) => entry.id), ['course:a'])
  assert.deepEqual(selectContent(entries, { types: ['course'], tags: ['foundation'], levels: ['beginner'], relatedLabId: 'lab:a' }).map((entry) => entry.id), ['course:a'])
})

test('资源 selector 支持全部、视频、论文和无结果查询', () => {
  assert.deepEqual(selectResources(entries).map((entry) => entry.type), ['video', 'paper'])
  assert.deepEqual(selectResources(entries, { types: ['video'] }).map((entry) => entry.type), ['video'])
  assert.deepEqual(selectResources(entries, { types: ['paper'] }).map((entry) => entry.type), ['paper'])
  assert.deepEqual(selectResources(entries, { tags: ['image'] }), [])
})
