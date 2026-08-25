import { isAbsolute, relative, resolve, sep } from 'node:path'

export function collectManifestFiles(manifest) {
  const files = new Set()
  for (const chunk of Object.values(manifest)) {
    if (/\.(?:js|css)$/.test(chunk.file ?? '')) files.add(chunk.file)
    for (const css of chunk.css ?? []) files.add(css)
  }
  return [...files]
}

export function resolveBuildOutput(dist, file) {
  if (typeof file !== 'string' || !file) throw new Error('构建产物路径不能为空')

  const outputPath = resolve(dist, file)
  const relativePath = relative(dist, outputPath)
  if (!relativePath || relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    throw new Error(`构建产物路径越界：${file}`)
  }
  return outputPath
}

export function referencesBuildOutput(url, file) {
  const pathname = url.split(/[?#]/, 1)[0]
  return pathname === file || pathname.endsWith(`/${file}`)
}
