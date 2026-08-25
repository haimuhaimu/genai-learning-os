import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolve } from 'node:path'
import { collectManifestFiles, referencesBuildOutput, resolveBuildOutput } from './bundle-output.mjs'

test('只收集本次 manifest 声明的 JS/CSS 产物并去重', () => {
  const manifest = {
    'index.html': {
      file: 'assets/index-new.js',
      css: ['assets/index-new.css'],
      isEntry: true,
    },
    shared: {
      file: 'assets/shared.js',
      css: ['assets/index-new.css'],
    },
  }

  assert.deepEqual(collectManifestFiles(manifest), [
    'assets/index-new.js',
    'assets/index-new.css',
    'assets/shared.js',
  ])
  assert.ok(!collectManifestFiles(manifest).includes('assets/index-old.js'))
})

test('manifest 相对路径始终解析到 dist 内，不拼接部署 base', () => {
  const dist = resolve('/repo', 'dist')

  assert.equal(resolveBuildOutput(dist, 'assets/index-new.js'), resolve(dist, 'assets/index-new.js'))
  assert.throws(() => resolveBuildOutput(dist, '../index-old.js'), /路径越界/)
  assert.throws(() => resolveBuildOutput(dist, '/tmp/index-old.js'), /路径越界/)
})

test('HTML 可使用 GitHub Pages base 引用 manifest 产物', () => {
  assert.equal(referencesBuildOutput('/genai-learning-os/assets/index-new.js', 'assets/index-new.js'), true)
  assert.equal(referencesBuildOutput('/assets/index-new.js', 'assets/index-new.js'), true)
  assert.equal(referencesBuildOutput('/genai-learning-os/assets/index-old.js', 'assets/index-new.js'), false)
})
