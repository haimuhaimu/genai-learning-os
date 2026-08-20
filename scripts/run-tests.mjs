import { readdir } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ignoredDirectories = new Set(['.git', 'dist', 'node_modules'])

async function findTests(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries
    .filter((entry) => entry.isDirectory() && !ignoredDirectories.has(entry.name))
    .map((entry) => findTests(resolve(directory, entry.name))))
  const local = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.test.mjs'))
    .map((entry) => resolve(directory, entry.name))
  return [...local, ...nested.flat()]
}

const tests = (await findTests(root)).sort()
if (!tests.length) {
  console.error('未发现任何 *.test.mjs 测试文件。')
  process.exit(1)
}

console.log(`发现 ${tests.length} 个测试文件，使用 Node test runner 统一执行。`)
const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...tests], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
})

if (result.error) {
  console.error(`测试进程启动失败：${result.error.message}`)
  process.exit(1)
}
process.exit(result.status ?? 1)
