import { readFile, stat } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { collectManifestFiles, referencesBuildOutput, resolveBuildOutput } from './bundle-output.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')

// Frozen from an unmodified production build of commit 15e3cdb with this repository's
// Node 20+/pnpm 10/Vite toolchain. Budgets must not be increased to make CI pass.
const baseline = Object.freeze({
  js: 1_413_471,
  css: 321_108,
  total: 1_734_579,
  largestChunk: 404_116,
  entryJs: 364_266,
  entryCss: 310_316,
})
const limits = Object.freeze({
  ...baseline,
  entryJs: Math.floor(baseline.entryJs * 0.8),
  entryCss: Math.floor(baseline.entryCss * 0.65),
})

const formatBytes = (bytes) => `${bytes.toLocaleString('en-US')} B (${(bytes / 1024).toFixed(1)} KiB)`
const signed = (bytes) => `${bytes > 0 ? '+' : ''}${bytes.toLocaleString('en-US')} B`
const percent = (value, reference) => `${((value / reference - 1) * 100).toFixed(2)}%`

async function inspectAsset(file) {
  const path = resolveBuildOutput(dist, file)
  return { file, path, bytes: (await stat(path)).size, extension: file.endsWith('.js') ? 'js' : 'css' }
}

let assets
let html
let manifest
try {
  [html, manifest] = await Promise.all([
    readFile(resolve(dist, 'index.html'), 'utf8'),
    readFile(resolve(dist, '.vite/manifest.json'), 'utf8').then(JSON.parse),
  ])
  assets = await Promise.all(collectManifestFiles(manifest).map(inspectAsset))
} catch (error) {
  console.error(`Bundle 检查失败：无法读取本次构建的 dist manifest 及其产物。请先运行 pnpm build。\n${error.message}`)
  process.exit(1)
}

const entry = manifest['index.html']
if (!entry?.isEntry || !entry.file?.endsWith('.js')) {
  console.error('Bundle 检查失败：manifest 中没有有效的 index.html JS 入口。')
  process.exit(1)
}

const assetByFile = new Map(assets.map((asset) => [asset.file, asset]))
const entryJsFiles = [entry.file]
const entryCssFiles = entry.css ?? []
const sumBytes = (files) => files.reduce((sum, file) => sum + (assetByFile.get(file)?.bytes ?? 0), 0)
const scriptUrls = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+\.js)["']/g)].map((match) => match[1])
const styleUrls = [...html.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+\.css)["']/g)].map((match) => match[1])
const totals = {
  js: assets.filter((asset) => asset.extension === 'js').reduce((sum, asset) => sum + asset.bytes, 0),
  css: assets.filter((asset) => asset.extension === 'css').reduce((sum, asset) => sum + asset.bytes, 0),
}
totals.total = totals.js + totals.css
const largest = assets.reduce((current, asset) => asset.bytes > current.bytes ? asset : current)
const entryJs = sumBytes(entryJsFiles)
const entryCss = sumBytes(entryCssFiles)
const metrics = { js: totals.js, css: totals.css, total: totals.total, largestChunk: largest.bytes, entryJs, entryCss }

console.log('Bundle raw 精确体积（原始、未压缩）：')
for (const [key, label] of [['js', 'JS 总量'], ['css', 'CSS 总量'], ['total', 'JS + CSS 总量'], ['entryJs', '入口 JS'], ['entryCss', '首屏 CSS']]) {
  console.log(`- ${label}：${formatBytes(metrics[key])}；基线 ${formatBytes(baseline[key])}；变化 ${signed(metrics[key] - baseline[key])}（${percent(metrics[key], baseline[key])}）`)
}
console.log(`- 最大 chunk：${relative(root, largest.path)}，${formatBytes(largest.bytes)}；基线 ${formatBytes(baseline.largestChunk)}；变化 ${signed(largest.bytes - baseline.largestChunk)}（${percent(largest.bytes, baseline.largestChunk)}）`)
console.log(`- 入口资源：JS ${scriptUrls.join(', ') || '无'}；CSS ${styleUrls.join(', ') || '无'}`)

const failures = []
for (const key of ['js', 'css', 'total', 'largestChunk', 'entryJs', 'entryCss']) {
  if (metrics[key] > limits[key]) failures.push(`${key} 超出上限 ${formatBytes(metrics[key] - limits[key])}（当前 ${formatBytes(metrics[key])}，上限 ${formatBytes(limits[key])}）`)
}
if (!scriptUrls.some((url) => referencesBuildOutput(url, entry.file))) failures.push(`HTML 未引用 manifest 入口 ${entry.file}`)
if (!entryCssFiles.length) failures.push('manifest 入口没有首屏 CSS')
for (const file of entryCssFiles) {
  if (!styleUrls.some((url) => referencesBuildOutput(url, file))) failures.push(`HTML 未引用 manifest 首屏 CSS ${file}`)
}

if (failures.length) {
  console.error(`Bundle 预算检查失败：\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
console.log(`Bundle 预算检查通过：入口 JS ${percent(entryJs, baseline.entryJs)}（要求 ≤ -20%），首屏 CSS ${percent(entryCss, baseline.entryCss)}（要求 ≤ -35%）。`)
