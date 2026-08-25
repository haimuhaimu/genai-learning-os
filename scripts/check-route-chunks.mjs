import { readFile, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')
const manifestPath = resolve(dist, '.vite/manifest.json')
const routeEntries = [
  'src/components/foundation/UnifiedMap.tsx',
  'src/components/hubs/LearningRoutesHub.tsx',
  'src/components/hubs/LabsHub.tsx',
  'src/components/hubs/ResourcesHub.tsx',
  'src/components/strategy/StrategyCaseRunner.tsx',
  'src/components/foundation/ProgressPage.tsx',
]
const pageStyles = [
  'src/learning-os.css',
  'src/styles/hubs.css',
  'src/components/strategy/strategyCases.css',
  'src/styles/progress.css',
]

let manifest
let html
try {
  [manifest, html] = await Promise.all([
    readFile(manifestPath, 'utf8').then(JSON.parse),
    readFile(resolve(dist, 'index.html'), 'utf8'),
  ])
} catch (error) {
  console.error(`路由 chunk 检查失败：请先运行 pnpm build。\n${error.message}`)
  process.exit(1)
}

const failures = []
const entry = manifest['index.html']
if (!entry?.isEntry) failures.push('manifest 缺少 index.html 入口')

for (const source of routeEntries) {
  const chunk = manifest[source]
  if (!chunk?.isDynamicEntry || !chunk.file?.endsWith('.js')) failures.push(`${source} 没有独立异步 JS 产物`)
  else {
    try { if ((await stat(resolve(dist, chunk.file))).size === 0) failures.push(`${chunk.file} 是空文件`) } catch { failures.push(`${chunk.file} 不存在`) }
  }
}

const routeFiles = routeEntries.map((source) => manifest[source]?.file).filter(Boolean)
for (const file of routeFiles) {
  if (html.includes(file)) failures.push(`入口 HTML 同步引用了路由 chunk ${file}`)
}

const entryCss = new Set(entry?.css ?? [])
for (const source of pageStyles) {
  const css = manifest[source]?.file
  if (!css?.endsWith('.css')) failures.push(`${source} 没有 CSS 产物`)
  else if (entryCss.has(css)) failures.push(`页面 CSS ${css} 被汇入入口 CSS`)
}
for (const source of routeEntries.slice(1, 4)) {
  const css = manifest[source]?.css ?? []
  if (!css.length) failures.push(`${source} 没有关联的按需 CSS`)
  if (css.some((file) => entryCss.has(file))) failures.push(`${source} 的页面 CSS 被汇入入口 CSS`)
}

const chart = manifest['src/components/charts/LearningChart.tsx']
if (!chart?.isDynamicEntry) failures.push('LearningChart 不是异步入口')
const recharts = Object.values(manifest).find((chunk) => chunk.name === 'recharts')
if (!recharts?.file?.endsWith('.js')) failures.push('Recharts 没有独立共享 chunk')
if (recharts && (entry?.imports ?? []).some((key) => manifest[key]?.file === recharts.file)) failures.push('入口静态依赖 Recharts chunk')
for (const source of routeEntries.slice(0, 4)) {
  const imports = manifest[source]?.imports ?? []
  if (recharts && imports.some((key) => manifest[key]?.file === recharts.file)) failures.push(`${source} 静态依赖 Recharts`)
}

const missionFiles = ['MissionBrief.tsx', 'MissionComparisonPanel.tsx', 'MissionStressPanel.tsx', 'MissionDebriefCard.tsx', 'missionEngine.ts']
const missionSource = (await Promise.all(missionFiles.map((file) => readFile(resolve(root, 'src/components/strategy', file), 'utf8')))).join('\n')
if (/from ['"]recharts|import\(['"]recharts/.test(missionSource)) failures.push('Mission UI 依赖了 Recharts')
const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
const expectedDependencies = ['lucide-react', 'react', 'react-dom', 'recharts']
if (JSON.stringify(Object.keys(packageJson.dependencies).sort()) !== JSON.stringify(expectedDependencies.sort())) failures.push('package.json dependencies 相对冻结清单发生变化')
const strategyChunk = manifest['src/components/strategy/StrategyCaseRunner.tsx']?.file
const progressChunk = manifest['src/components/foundation/ProgressPage.tsx']?.file
for (const source of routeEntries.slice(0, 4)) {
  const file = manifest[source]?.file
  if (!file) continue
  const output = await readFile(resolve(dist, file), 'utf8')
  if (/压力挑战|任务复盘/.test(output)) failures.push(`${source} 包含案例 Mission UI`)
}
if (entry?.file) {
  const output = await readFile(resolve(dist, entry.file), 'utf8')
  if (/压力挑战|任务复盘|任务能力证据覆盖/.test(output)) failures.push('入口 JS 包含 Mission 实现')
}
if (!strategyChunk || !progressChunk) failures.push('Mission 使用路由缺少独立 chunk')

if (failures.length) {
  console.error(`路由 chunk 检查失败：\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
console.log(`路由 chunk 检查通过：${routeEntries.length} 个关键路由均为异步 JS；${pageStyles.length} 组页面 CSS 未汇入入口；Recharts/LearningChart 保持独立且首页、学堂、实验室、工具箱均不静态依赖图表。`)
