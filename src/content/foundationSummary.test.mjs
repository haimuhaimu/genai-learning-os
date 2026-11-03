import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { tsImport } from 'tsx/esm/api'
import { fileURLToPath } from 'node:url'
import { foundationNodeSummaries, foundationProgressIds } from './foundationSummary.ts'
import { foundationNodes } from '../foundationData.ts'
import { getNextStep } from '../learningPath.ts'
import { progressPercent } from '../progress.ts'

const { default: FoundationCourse } = await tsImport('../components/foundation/FoundationCourse.tsx', {
  parentURL: import.meta.url,
  tsconfig: fileURLToPath(new URL('../../tsconfig.app.json', import.meta.url)),
})

function renderLesson(initialNode) {
  const storage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null } })
    return renderToStaticMarkup(createElement(FoundationCourse, { initialNode, go: () => {} }))
  } finally {
    if (storage) Object.defineProperty(globalThis, 'localStorage', storage)
    else delete globalThis.localStorage
  }
}

test('every homepage foundation entrance names the actual lesson it opens', () => {
  assert.deepEqual(foundationNodeSummaries.map(({ id, code, title }) => ({ id, code, title })), foundationNodes.map(({ id, code, title }) => ({ id, code, title })))
  assert.deepEqual(foundationProgressIds.slice(-2), ['moe', 'distillation'])
})

test('completing the eleven real foundation lessons reaches 100% and leaves no phantom next step', () => {
  const progress = Object.fromEntries(foundationNodes.map(({ id }) => [id, 4]))
  assert.equal(progressPercent(progress, foundationProgressIds), 100)
  assert.equal(getNextStep(progress, 'beginner').page, 'expert-agent')
})

test('legacy Attention entrance opens its related Transformer lesson, not probability', () => {
  const html = renderLesson('attention')
  assert.match(html, /<h1>Transformer Block<\/h1>/)
  assert.match(html, /旧入口/)
})

test('unknown foundation entrance explains the invalid link instead of silently starting another lesson', () => {
  const html = renderLesson('missing-lesson')
  assert.match(html, /课程入口未找到/)
  assert.doesNotMatch(html, /<h1>概率与分布<\/h1>/)
})
