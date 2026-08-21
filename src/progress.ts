export type LearningStage = 0 | 1 | 2 | 3 | 4
export type ProgressMap = Record<string, LearningStage>

const KEY = 'genai-learning-progress-v1'
const PERSONA_KEY = 'genai-learning-persona-v1'
const PERSONA_CHANGE_EVENT = 'genai-persona-change'
const MAX_IMPORT_LENGTH = 1_000_000
const MAX_PROGRESS_ENTRIES = 2_000
const MAX_KEY_LENGTH = 160
const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
const PERSONAS = new Set(['strategy', 'product', 'engineering', 'beginner'])

export const stageLabels = ['未开始', '已浏览', '已手算', '已进入实验', '已评审'] as const

export type LearningDataExport = {
  schemaVersion: 1
  exportedAt: string
  progress: ProgressMap
  persona?: string
}

export type ImportLearningResult =
  | { ok: true; imported: number; advanced: number; unchanged: number; personaImported: boolean; progress: ProgressMap }
  | { ok: false; error: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasOwn(value: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function validateProgress(value: unknown): { ok: true; value: ProgressMap } | { ok: false; error: string } {
  if (!isRecord(value)) return { ok: false, error: '进度数据必须是 JSON 对象。' }
  const entries = Object.entries(value)
  if (entries.length > MAX_PROGRESS_ENTRIES) return { ok: false, error: `进度条目不能超过 ${MAX_PROGRESS_ENTRIES} 条。` }
  const progress: ProgressMap = Object.create(null) as ProgressMap
  for (const [key, stage] of entries) {
    if (!key || key.length > MAX_KEY_LENGTH) return { ok: false, error: `进度 key 必须是 1～${MAX_KEY_LENGTH} 个字符。` }
    if (BLOCKED_KEYS.has(key)) return { ok: false, error: `检测到不安全的进度 key：${key}。` }
    if (!Number.isInteger(stage) || typeof stage !== 'number' || stage < 0 || stage > 4) {
      return { ok: false, error: `“${key}”的 stage 必须是 0～4 的整数。` }
    }
    progress[key] = stage as LearningStage
  }
  return { ok: true, value: progress }
}

export function readProgress(): ProgressMap {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    const validated = validateProgress(parsed)
    return validated.ok ? validated.value : {}
  } catch {
    return {}
  }
}

export function markProgress(nodeId: string, stage: LearningStage): ProgressMap {
  const current = readProgress()
  if ((current[nodeId] ?? 0) >= stage) return current

  const next: ProgressMap = {
    ...current,
    [nodeId]: stage,
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    console.warn('学习进度暂时无法保存到本机存储。')
    return current
  }
  window.dispatchEvent(new CustomEvent('genai-progress-change'))
  return next
}

export function clearProgress(): boolean {
  try {
    localStorage.removeItem(KEY)
  } catch {
    console.warn('学习进度暂时无法从本机存储清除。')
    return false
  }
  window.dispatchEvent(new CustomEvent('genai-progress-change'))
  return true
}

export function exportLearningData(): string {
  const data: LearningDataExport = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    progress: readProgress(),
  }
  try {
    const persona = localStorage.getItem(PERSONA_KEY)
    if (persona && PERSONAS.has(persona)) data.persona = persona
  } catch {
    // Export progress even if persona storage is unavailable.
  }
  return JSON.stringify(data, null, 2)
}

export function importLearningData(text: string): ImportLearningResult {
  if (typeof text !== 'string' || !text.trim()) return { ok: false, error: '请粘贴非空的 JSON 文本。' }
  if (text.length > MAX_IMPORT_LENGTH) return { ok: false, error: '导入文本过大，不能超过 1 MB。' }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'JSON 格式无效，请检查括号、引号和逗号。' }
  }
  if (!isRecord(parsed)) return { ok: false, error: '导入内容必须是 JSON 对象。' }
  for (const key of Object.keys(parsed)) {
    if (BLOCKED_KEYS.has(key)) return { ok: false, error: `检测到不安全的顶层 key：${key}。` }
  }

  const isVersioned = hasOwn(parsed, 'schemaVersion')
  let incoming: unknown = parsed
  let persona: unknown
  if (isVersioned) {
    if (parsed.schemaVersion !== 1) return { ok: false, error: '不支持此备份版本，目前仅支持 schemaVersion 1。' }
    if (!hasOwn(parsed, 'progress')) return { ok: false, error: '版本化备份缺少 progress 对象。' }
    incoming = parsed.progress
    persona = parsed.persona
    if (persona !== undefined && persona !== null && (typeof persona !== 'string' || !PERSONAS.has(persona))) {
      return { ok: false, error: 'persona 值无效。' }
    }
  }

  const validated = validateProgress(incoming)
  if (!validated.ok) return validated
  const existing = readProgress()
  const merged: ProgressMap = { ...existing }
  let advanced = 0
  let unchanged = 0
  for (const [key, stage] of Object.entries(validated.value)) {
    const previous = existing[key] ?? 0
    const next = Math.max(previous, stage) as LearningStage
    merged[key] = next
    if (next > previous) advanced += 1
    else unchanged += 1
  }

  let personaImported = false
  try {
    localStorage.setItem(KEY, JSON.stringify(merged))
    if (typeof persona === 'string' && !localStorage.getItem(PERSONA_KEY)) {
      localStorage.setItem(PERSONA_KEY, persona)
      personaImported = true
      window.dispatchEvent(new CustomEvent(PERSONA_CHANGE_EVENT))
    }
  } catch {
    return { ok: false, error: '浏览器无法写入本机存储，请检查隐私模式或存储空间。' }
  }
  window.dispatchEvent(new CustomEvent('genai-progress-change'))
  return { ok: true, imported: Object.keys(validated.value).length, advanced, unchanged, personaImported, progress: merged }
}

export function progressPercent(progress: ProgressMap, ids: string[]) {
  if (!ids.length) return 0
  return Math.round(ids.reduce((sum, id) => sum + (progress[id] ?? 0), 0) / (ids.length * 4) * 100)
}
