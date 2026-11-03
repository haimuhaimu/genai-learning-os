import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { tsImport } from 'tsx/esm/api'

const { default: UnifiedMap } = await tsImport('./UnifiedMap.tsx', {
  parentURL: import.meta.url,
  tsconfig: fileURLToPath(new URL('../../../tsconfig.app.json', import.meta.url)),
})

function renderHome(progress = {}) {
  const storage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  try {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: { getItem: (key) => key === 'genai-learning-progress-v1' ? JSON.stringify(progress) : null },
    })
    return renderToStaticMarkup(createElement(UnifiedMap, { go: () => {} }))
  } finally {
    if (storage) Object.defineProperty(globalThis, 'localStorage', storage)
    else delete globalThis.localStorage
  }
}

// Extract a rendered region without assuming that its nested divs are flat.
function region(html, className, tag = 'div') {
  const opening = new RegExp(`<${tag}\\b[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>`).exec(html)
  assert.ok(opening, `Missing rendered ${tag}.${className}`)
  const tags = new RegExp(`</?${tag}\\b[^>]*>`, 'g')
  tags.lastIndex = opening.index
  let depth = 0
  for (let match = tags.exec(html); match; match = tags.exec(html)) {
    depth += match[0].startsWith('</') ? -1 : 1
    if (depth === 0) return html.slice(opening.index, tags.lastIndex)
  }
  assert.fail(`Unclosed rendered ${tag}.${className}`)
}

test('home hero presents a real, accessible showcase image with reserved dimensions', () => {
  const hero = region(renderHome(), 'lo-home-hero')
  const showcase = region(hero, 'lo-model-showcase', 'figure')
  const image = /<img\b[^>]*>/.exec(showcase)?.[0]
  assert.ok(image, 'The hero must render an image asset, not a simulated interactive panel')
  const attribute = (name) => new RegExp(`\\b${name}="([^"]*)"`).exec(image)?.[1] ?? ''
  assert.ok(attribute('src').trim(), 'The showcase must reference an actual asset')
  assert.ok(attribute('alt').trim(), 'The showcase must describe its visual content')
  assert.doesNotMatch(attribute('alt').trim(), /^(image|picture|placeholder|图片|占位图)$/i)
  assert.ok(Number(attribute('width')) > 0 && Number(attribute('height')) > 0, 'Reserve the image aspect ratio before loading')
  assert.doesNotMatch(showcase, /<(?:button|a)\b|role="button"/)
  assert.equal((hero.match(/<button\b/g) ?? []).length, 2, 'Keep both hero course entry actions')
  assert.match(hero, /<h1\b[^>]*>.+?<\/h1>/)
  assert.match(hero, /<p\b[^>]*>.+?<\/p>/)
})

test('the six-step model roadmap follows the hero and reflects saved learning progress', () => {
  const html = renderHome({ 'k3:concept:goal': 4, 'k3:concept:runtime': 4, 'k3:concept:model': 2 })
  const hero = region(html, 'lo-home-hero')
  const roadmap = region(html, 'lo-model-roadmap', 'section')
  assert.ok(html.indexOf(roadmap) >= html.indexOf(hero) + hero.length, 'The learning roadmap belongs below, not inside, the image hero')
  const learningCard = region(roadmap, 'lo-hero-path', 'aside')
  const steps = region(learningCard, 'lo-hero-path-list')
  assert.match(learningCard, /aria-label="个人模型搭建进度 2\/6"/)
  assert.equal((steps.match(/<button\b/g) ?? []).length, 6)
  assert.equal((steps.match(/aria-label="已完成"/g) ?? []).length, 2)
  assert.match(learningCard, /<footer>.+?<button\b[^>]*>[^<]+<\/button><\/footer>/)
})

test('the image-led home retains course, persona, progress and advanced learning entry points', () => {
  const html = renderHome()
  const mainline = region(html, 'lo-mainline')
  for (const label of ['算法基础', 'AI 决策数学', 'LLM 系统', 'Agent 系统', 'Agent Book', '模型蒸馏']) {
    assert.ok(mainline.includes(`<b>${label}</b>`), `Missing course entry: ${label}`)
  }
  assert.match(region(html, 'lo-image-branch', 'button'), /图像生成/)
  const personas = region(html, 'lo-persona-grid')
  assert.equal((personas.match(/role="listitem"/g) ?? []).length, 4)
  assert.match(personas, /class="is-selected"/)
  const dashboard = region(html, 'lo-dashboard', 'section')
  assert.ok(region(dashboard, 'lo-next-step', 'article'))
  assert.ok(region(dashboard, 'lo-progress-overview', 'article'))
  assert.match(dashboard, /aria-label="算法基础进度 0%"/)
  assert.equal((html.match(/<section\b[^>]*class="lo-book-feature"/g) ?? []).length, 2)
  assert.match(html, /CASE ACADEMY/)
  assert.match(html, /进入 Agent Book/)
})
