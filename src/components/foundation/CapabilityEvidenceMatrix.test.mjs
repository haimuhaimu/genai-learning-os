import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const [page, matrix, css, registry] = await Promise.all([
  readFile(new URL('./ProgressPage.tsx', import.meta.url), 'utf8'),
  readFile(new URL('./CapabilityEvidenceMatrix.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../../styles/progress.css', import.meta.url), 'utf8'),
  readFile(new URL('../../pageRegistry.tsx', import.meta.url), 'utf8'),
])

test('进度页接入能力矩阵并提供案例深链', () => {
  assert.match(page, /<CapabilityEvidenceMatrix go=\{go\}/)
  assert.match(matrix, /go\('strategy-case', \{ case: source\.caseId \}\)/)
  assert.match(matrix, /证据覆盖不等于能力认证/)
})

test('能力矩阵不展示虚荣分数、排名、签到或徽章', () => {
  assert.doesNotMatch(matrix, /总分|排名|签到|徽章|能力等级/)
  assert.match(matrix, /策略形成/); assert.match(matrix, /压力通过/); assert.match(matrix, /待补/)
})

test('进度样式只由 progress lazy route 加载且移动端无横向表格', () => {
  const line = registry.split('\n').find((item) => item.includes('progress: async'))
  assert.match(line, /styles\/progress\.css/)
  assert.match(css, /@media\(max-width:760px\)/)
  assert.doesNotMatch(css, /min-width:\s*[5-9]\d\dpx/)
})
