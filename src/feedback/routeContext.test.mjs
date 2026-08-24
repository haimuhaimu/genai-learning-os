import assert from 'node:assert/strict'
import test from 'node:test'
import { MAX_ROUTE_VALUE_LENGTH, readFeedbackRouteContext, routeContextEntries } from './routeContext.ts'

test('页面上下文只保留 routeConfig 白名单并规范化页面别名', () => {
  const context = readFeedbackRouteContext('?page=map&module=rag&case=budget&token=secret&utm_source=mail')
  assert.deepEqual(context, { page: 'unified-map', module: 'rag', case: 'budget' })
  assert.deepEqual(routeContextEntries(context), [['page', 'unified-map'], ['module', 'rag'], ['case', 'budget']])
})

test('非法页面不会进入反馈，路由值按上限裁剪', () => {
  const context = readFeedbackRouteContext(`?page=private&node=${'x'.repeat(MAX_ROUTE_VALUE_LENGTH + 30)}&section=%0Aunsafe&other=value`)
  assert.equal(context.page, undefined)
  assert.equal(context.node.length, MAX_ROUTE_VALUE_LENGTH)
  assert.equal(context.section, 'unsafe')
  assert.deepEqual(Object.keys(context), ['node', 'section'])
})
