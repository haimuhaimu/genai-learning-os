import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { tsImport } from 'tsx/esm/api'
import { recordPersonalPractice } from '../../learningJourney.ts'

const api = await tsImport('./ModelCoachPanel.tsx', {
  parentURL: import.meta.url,
  tsconfig: fileURLToPath(new URL('../../../tsconfig.app.json', import.meta.url)),
}).catch(() => ({}))
const receipt = JSON.parse(readFileSync(new URL('../../fixtures/playground-learning-run.json', import.meta.url), 'utf8'))
const practice = recordPersonalPractice({ schemaVersion: 1, active: false }, receipt, true).practice

function render(props = {}) {
  assert.equal(typeof api.default, 'function', 'the coach handoff must be a real learner-facing component')
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw Error('coach panel must not read browser drafts or write course progress') } })
    return renderToStaticMarkup(createElement(api.default, { pending: false, ...props, runtime: {
      replay() { throw Error('opening a panel must not run or share a saved record') },
      inspect() { throw Error('opening a panel must not load trial evidence') },
    } }))
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous)
    else delete globalThis.localStorage
  }
}

test('starter provides a complete human-to-AI-to-recap handoff without pretending AI is connected', () => {
  const html = render()
  assert.match(html, /AI 陪练任务包/)
  assert.match(html, /先去亲手试/)
  assert.match(html, /交给自己的 AI/)
  assert.match(html, /回本页核对理解/)
  assert.match(html, /没有接通.*AI/)
  assert.match(html, /不会自动发送/)
  assert.match(html, /<button[^>]*>生成陪练任务包<\/button>/)
  assert.doesNotMatch(html, /<textarea/)
})

test('no saved practice disables the evidence checkbox but still permits a starter package', () => {
  const html = render()
  assert.match(html, /<input[^>]*type="checkbox"[^>]*disabled=""/)
  assert.doesNotMatch(html, /checked=""/)
  assert.doesNotMatch(html, /<button[^>]*disabled=""[^>]*>生成陪练任务包<\/button>/)
})

test('saved practice remains explicitly unselected and its results are not disclosed on initial render', () => {
  const html = render({ practice, reflection: { change: 'points', evaluation: 'practice' } })
  assert.match(html, /加入这次已保存的实操和复盘/)
  assert.doesNotMatch(html, /checked=""/)
  assert.doesNotMatch(html, /0\.647|13\s*\/\s*16|"actions"|"stepGuess"/)
  assert.doesNotMatch(html, /<textarea/)
})

test('a pending replacement prevents sharing the old record while keeping the starter available', () => {
  const html = render({ practice, pending: true })
  assert.match(html, /<input[^>]*type="checkbox"[^>]*disabled=""/)
  assert.match(html, /先保存或取消新记录预览/)
  assert.doesNotMatch(html, /<button[^>]*disabled=""[^>]*>生成陪练任务包<\/button>/)
})
