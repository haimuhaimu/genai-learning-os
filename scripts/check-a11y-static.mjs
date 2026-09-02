import { readdir, readFile } from 'node:fs/promises'
import { relative, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = resolve(root, 'src')
const nonInteractiveTags = new Set(['article', 'div', 'span', 'li'])
const extensions = new Set(['.tsx', '.jsx', '.html'])

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map((entry) => {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) return collectFiles(path)
    const extension = entry.name.slice(entry.name.lastIndexOf('.'))
    return entry.isFile() && extensions.has(extension) ? [path] : []
  }))
  return nested.flat()
}

function openingTags(source) {
  const tags = []
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] !== '<' || !/[A-Za-z]/.test(source[index + 1] ?? '')) continue
    const start = index
    let quote = ''
    let braces = 0
    for (index += 1; index < source.length; index += 1) {
      const char = source[index]
      const previous = source[index - 1]
      if (quote) {
        if (char === quote && previous !== '\\') quote = ''
        continue
      }
      if (char === '"' || char === "'") {
        quote = char
        continue
      }
      if (char === '{') braces += 1
      else if (char === '}') braces = Math.max(0, braces - 1)
      else if (char === '>' && braces === 0) {
        const raw = source.slice(start, index + 1)
        const name = raw.match(/^<([A-Za-z][\w.-]*)/)?.[1]
        if (name) tags.push({ name: name.toLowerCase(), raw, start })
        break
      }
    }
  }
  return tags
}

function lineAt(source, offset) {
  return source.slice(0, offset).split('\n').length
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(['"])(.*?)\\1`, 's'))
  return match?.[2]
}

const failures = []
const files = [...await collectFiles(sourceRoot), resolve(root, 'index.html')]
for (const file of files) {
  const source = await readFile(file, 'utf8')
  const fileName = relative(root, file)
  for (const tag of openingTags(source)) {
    const location = `${fileName}:${lineAt(source, tag.start)}`
    if (nonInteractiveTags.has(tag.name) && /\bonClick\s*=/.test(tag.raw)) {
      failures.push(`${location}：<${tag.name}> 不能直接绑定 onClick；请使用 button/a，或实现完整键盘语义`)
    }
    if (tag.name === 'a' && attribute(tag.raw, 'target') === '_blank') {
      const rel = new Set((attribute(tag.raw, 'rel') ?? '').split(/\s+/).filter(Boolean))
      const requiredRel = ['noopener', 'noreferrer']
      if (requiredRel.some((token) => !rel.has(token))) {
        failures.push(`${location}：target="_blank" 必须包含 rel="noopener noreferrer"`)
      }
    }
  }
}

const businessPath = resolve(sourceRoot, 'business.tsx')
const business = await readFile(businessPath, 'utf8')
const hasSkipLink = /<a\b[^>]*className=['"][^'"]*lo-skip-link[^'"]*['"][^>]*href=['"]#main-content['"][^>]*>/.test(business)
  || /<a\b[^>]*href=['"]#main-content['"][^>]*className=['"][^'"]*lo-skip-link[^'"]*['"][^>]*>/.test(business)
const hasMainTarget = /<main\b[^>]*id=['"]main-content['"][^>]*>/.test(business)
if (!hasSkipLink) failures.push('src/business.tsx：缺少指向 #main-content 的 lo-skip-link')
if (!hasMainTarget) failures.push('src/business.tsx：缺少 id="main-content" 的 main 地标')

const missionSources = await Promise.all([
  'components/strategy/StrategyPredictionPanel.tsx',
  'components/strategy/StrategyControlsPanel.tsx',
  'components/strategy/MissionStressPanel.tsx',
  'components/strategy/MissionDebriefCard.tsx',
].map((path) => readFile(resolve(sourceRoot, path), 'utf8')))
const [prediction, controls, stress, debrief] = missionSources
if (!/role='alertdialog'/.test(prediction) || !/确认重开/.test(prediction) || !/取消/.test(prediction)) failures.push('Mission 重开缺少原生确认/取消语义')
if (!/triggerRef\.current\?\.focus/.test(prediction) || !/inputRef\.current\?\.focus/.test(prediction)) failures.push('Mission 重开缺少焦点返回或输入焦点目标')
if (!/<label/.test(controls) || !/<fieldset/.test(controls) || !/<legend/.test(controls)) failures.push('策略控件缺少 label/fieldset/legend 原生语义')
if (!/document\.getElementById\(`strategy-\$\{id\}`\)/.test(stress)) failures.push('压力失败缺少稳定 control 焦点目标')
if (!/aria-live='polite'/.test(prediction + stress + debrief)) failures.push('Mission 提交状态缺少克制的 polite live region')
const strategyCss = await readFile(resolve(sourceRoot, 'components/strategy/strategyCases.css'), 'utf8')
const progressCss = await readFile(resolve(sourceRoot, 'styles/progress.css'), 'utf8')
if (!strategyCss.includes('@media(prefers-reduced-motion:reduce)') || !progressCss.includes('@media(prefers-reduced-motion:reduce)')) failures.push('Mission 或能力矩阵缺少 reduced-motion 契约')
if (!/通过|未通过/.test(stress)) failures.push('压力结果必须提供非颜色文本状态')

if (failures.length) {
  console.error(`静态 a11y 检查失败：\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
console.log('静态 a11y 检查通过：非交互 onClick、新窗口 noopener/noreferrer、skip link/main-content 契约均正常。')
