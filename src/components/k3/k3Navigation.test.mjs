import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { tsImport } from 'tsx/esm/api'
import { fileURLToPath } from 'node:url'

const options = { parentURL: import.meta.url, tsconfig: fileURLToPath(new URL('../../../tsconfig.app.json', import.meta.url)) }
const { default: Workshop } = await tsImport('./K3BuildWorkshop.tsx', options)
const { default: UnifiedMap } = await tsImport('../foundation/UnifiedMap.tsx', options)

function renderWorkshop(progress, initialStep) {
  return renderToStaticMarkup(createElement(Workshop, { progress, initialStep, onProgress: () => {} }))
}
function opened(html) {
  return [...html.matchAll(/aria-expanded="true"[^>]*aria-controls="k3-experiment-([^"]+)"/g)].map((match) => match[1])
}

test('requested completed K3 lesson opens for review instead of the first unfinished lesson', () => {
  assert.deepEqual(opened(renderWorkshop({ 'k3:concept:goal': 4, 'k3:concept:runtime': 4 }, 'goal')), ['goal'])
})

test('all-done K3 deep link still opens exactly the requested lesson', () => {
  const progress = Object.fromEntries(['goal', 'runtime', 'model', 'infer', 'api', 'evaluate'].map((id) => [`k3:concept:${id}`, 4]))
  assert.deepEqual(opened(renderWorkshop(progress, 'runtime')), ['runtime'])
})

test('locked K3 deep link explains prerequisite and keeps the first available lesson open', () => {
  const html = renderWorkshop({}, 'model')
  assert.deepEqual(opened(html), ['goal'])
  assert.ok(html.includes('请先完成「Token 化」'), 'Explain why the requested lesson is locked')
})

test('K3 saved completed lesson remains reviewable even with a legacy gap before it', () => {
  assert.deepEqual(opened(renderWorkshop({ 'k3:concept:model': 4 }, 'model')), ['model'])
})

test('home roadmap uses the six real K3 experiments and continues unfinished work', () => {
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key) => key === 'genai-learning-progress-v1' ? JSON.stringify({ 'k3:concept:goal': 4 }) : null } })
    const html = renderToStaticMarkup(createElement(UnifiedMap, { go: () => {} }))
    const roadmap = html.slice(html.indexOf('class="lo-hero-path"'), html.indexOf('</aside>'))
    for (const title of ['Token 化', '预测下一个 Token', '训练前后对比', '上下文影响', '续写变聊天', '回看 K3']) assert.ok(roadmap.includes(`<b>${title}</b>`), `Missing real experiment ${title}`)
    assert.ok(roadmap.includes('继续第 2 关'), 'Partial completion is continue, not all-course review')
    assert.ok(!roadmap.includes('复习知识'))
  } finally {
    if (saved) Object.defineProperty(globalThis, 'localStorage', saved)
    else delete globalThis.localStorage
  }
})
