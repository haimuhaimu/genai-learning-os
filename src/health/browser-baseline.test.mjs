import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { tsImport } from 'tsx/esm/api'

const root = fileURLToPath(new URL('../../', import.meta.url))

test('浏览器代码在声明的 ES2020 环境中通过类型检查，不借用 Node 全局类型', () => {
  const config = ts.readConfigFile(`${root}tsconfig.app.json`, ts.sys.readFile)
  assert.equal(config.error, undefined)
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root, {
    types: ['vite/client'],
  })
  const program = ts.createProgram(parsed.fileNames, parsed.options)
  const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)]
  assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics, {
    getCanonicalFileName: (file) => file,
    getCurrentDirectory: () => root,
    getNewLine: () => '\n',
  }))
})

test('缺少 Array.prototype.at 时仍能初始化搜索索引', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(Array.prototype, 'at')
  try {
    Object.defineProperty(Array.prototype, 'at', { ...descriptor, value: undefined })
    const { searchIndex } = await import('../searchIndex.ts')
    assert.ok(searchIndex.some((entry) => entry.page === 'papers'))
    assert.equal(new Set(searchIndex.map((entry) => entry.id)).size, searchIndex.length)
  } finally {
    Object.defineProperty(Array.prototype, 'at', descriptor)
  }
})

test('缺少 Array.prototype.at 时空运行轨迹仍可渲染', async () => {
  const { LoopSimulator } = await tsImport('../components/agent/LoopAndToolLabs.tsx', {
    parentURL: import.meta.url,
    tsconfig: `${root}tsconfig.app.json`,
  })
  const descriptor = Object.getOwnPropertyDescriptor(Array.prototype, 'at')
  try {
    Object.defineProperty(Array.prototype, 'at', { ...descriptor, value: undefined })
    const html = renderToStaticMarkup(createElement(LoopSimulator))
    assert.ok(html.includes('RUNNING / NOT STARTED'))
    assert.ok(html.includes('点击“运行”或“单步执行”开始状态迁移。'))
  } finally {
    Object.defineProperty(Array.prototype, 'at', descriptor)
  }
})
