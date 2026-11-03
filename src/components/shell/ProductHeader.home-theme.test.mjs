import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { tsImport } from 'tsx/esm/api'

const { default: ProductHeader } = await tsImport('./ProductHeader.tsx', {
  parentURL: import.meta.url,
  tsconfig: fileURLToPath(new URL('../../../tsconfig.app.json', import.meta.url)),
})

function renderHeader(appearance = {}) {
  return renderToStaticMarkup(createElement(ProductHeader, {
    page: 'unified-map',
    go: () => {},
    onSearch: () => {},
    onFeedback: () => {},
    searchButtonRef: { current: null },
    ...appearance,
  }))
}

function button(html, className) {
  return new RegExp(`<button\\b[^>]*class="${className}"[^>]*>`).exec(html)?.[0]
}

test('homepage appearance control is opt-in and names the action for each current theme', () => {
  for (const homeDark of [false, true]) {
    assert.equal(button(renderHeader({ homeDark }), 'lo-home-theme-toggle'), undefined)
  }
  for (const [homeDark, action] of [[false, '切换首页深色外观'], [true, '切换首页浅色外观']]) {
    const toggle = button(renderHeader({ homeDark, onToggleHomeTheme: () => {} }), 'lo-home-theme-toggle')
    assert.ok(toggle, 'Supplying the appearance callback exposes its control')
    assert.match(toggle, /type="button"/)
    assert.ok(toggle.includes(`aria-label="${action}"`))
  }
})

test('appearance control preserves primary navigation, search and mobile menu semantics', () => {
  for (const appearance of [{}, { homeDark: true, onToggleHomeTheme: () => {} }]) {
    const html = renderHeader(appearance)
    const nav = /<nav\b[^>]*>.*?<\/nav>/.exec(html)?.[0]
    assert.ok(nav)
    assert.match(nav, /id="lo-primary-navigation"/)
    assert.match(nav, /aria-label="主导航"/)
    assert.deepEqual([...nav.matchAll(/data-nav-id="([^"]+)"/g)].map((match) => match[1]), ['home', 'academy', 'cases', 'labs', 'toolbox'])
    assert.match(nav, /<button\b[^>]*data-nav-id="home"[^>]*aria-current="page"/)
    assert.equal((nav.match(/aria-current="page"/g) ?? []).length, 1)
    assert.match(button(html, 'lo-search-trigger'), /aria-label="搜索课程、案例、实验与资源"/)
    const menu = button(html, 'lo-menu-toggle')
    assert.match(menu, /aria-controls="lo-primary-navigation"/)
    assert.match(menu, /aria-expanded="false"/)
    assert.match(menu, /aria-label="展开导航"/)
  }
})
