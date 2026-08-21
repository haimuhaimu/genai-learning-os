import { readdir, stat } from 'node:fs/promises'
import { relative, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')
const baseline = {
  js: 1_172_125,
  css: 256_886,
  chunk: 404_083,
}
const headroom = 1.25
const budgets = {
  js: Math.ceil(baseline.js * headroom),
  css: Math.ceil(baseline.css * headroom),
  chunk: Math.ceil(baseline.chunk * headroom),
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`
}

async function collectAssets(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) return collectAssets(path)
    if (!entry.isFile() || !/\.(?:js|css)$/.test(entry.name)) return []
    return [{ path, bytes: (await stat(path)).size, extension: entry.name.endsWith('.js') ? 'js' : 'css' }]
  }))
  return nested.flat()
}

let assets
try {
  assets = await collectAssets(dist)
} catch (error) {
  console.error(`Bundle 检查失败：无法读取 dist。请先运行 pnpm build。\n${error.message}`)
  process.exit(1)
}

if (!assets.length) {
  console.error('Bundle 检查失败：dist 中没有 JS/CSS 产物。')
  process.exit(1)
}

const totals = {
  js: assets.filter((asset) => asset.extension === 'js').reduce((sum, asset) => sum + asset.bytes, 0),
  css: assets.filter((asset) => asset.extension === 'css').reduce((sum, asset) => sum + asset.bytes, 0),
}
const largest = assets.reduce((current, asset) => asset.bytes > current.bytes ? asset : current)

console.log('Bundle raw 体积（原始、未压缩；预算为当前基线 +25%）：')
console.log(`- JS 总计 raw：${formatBytes(totals.js)} / 基线 ${formatBytes(baseline.js)} / 预算 ${formatBytes(budgets.js)}`)
console.log(`- CSS 总计 raw：${formatBytes(totals.css)} / 基线 ${formatBytes(baseline.css)} / 预算 ${formatBytes(budgets.css)}`)
console.log(`- JS + CSS raw：${formatBytes(totals.js + totals.css)}`)
console.log(`- 最大 chunk raw：${relative(root, largest.path)}，${formatBytes(largest.bytes)} / 基线 ${formatBytes(baseline.chunk)} / 预算 ${formatBytes(budgets.chunk)}`)

const failures = []
if (totals.js > budgets.js) failures.push(`JS 总体积超出预算 ${formatBytes(totals.js - budgets.js)}`)
if (totals.css > budgets.css) failures.push(`CSS 总体积超出预算 ${formatBytes(totals.css - budgets.css)}`)
if (largest.bytes > budgets.chunk) failures.push(`最大 chunk 超出预算 ${formatBytes(largest.bytes - budgets.chunk)}`)

if (failures.length) {
  console.error(`Bundle 预算检查失败：\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
console.log('Bundle 预算检查通过。')
