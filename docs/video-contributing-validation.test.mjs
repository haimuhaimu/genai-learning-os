import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const doc = await readFile(new URL('./VIDEO_CONTRIBUTING.md', import.meta.url), 'utf8')

test('VIDEO_CONTRIBUTING 校验命令不应建议裸 node --test（会在本仓库失败）', () => {
  assert.doesNotMatch(doc, /^\s*node\s+--test\b/m)
})

test('VIDEO_CONTRIBUTING 应指向仓库标准门禁（pnpm test / pnpm ci:check）', () => {
  assert.ok(
    /pnpm\s+(test|ci:check)/.test(doc),
    'Expected VIDEO_CONTRIBUTING.md to mention `pnpm test` or `pnpm ci:check`.'
  )
})
