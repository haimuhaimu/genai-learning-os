import type { LearningStage } from '../../../progress.ts'
import type { LessonStep } from './goldenLessonModel.ts'

export const PAPER_LESSON_PROGRESS_KEY = 'genai-paper-lesson-progress-v1'
export const PAPER_LESSON_PROGRESS_EVENT = 'genai-paper-lesson-progress-change'
const MAX_ENTRIES = 100
const PAPER_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export type PaperLessonRecord = { step: LessonStep; completed: boolean }
export type PaperLessonProgress = Record<string, PaperLessonRecord>

function cleanRecord(value: unknown): PaperLessonRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const candidate = value as Record<string, unknown>
  if (!Number.isInteger(candidate.step) || Number(candidate.step) < 1 || Number(candidate.step) > 5) return null
  return { step: candidate.step as LessonStep, completed: candidate.completed === true }
}

export function cleanPaperLessonProgress(value: unknown): PaperLessonProgress {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const clean: PaperLessonProgress = Object.create(null) as PaperLessonProgress
  for (const [paperId, record] of Object.entries(value).slice(0, MAX_ENTRIES)) {
    if (!PAPER_ID_PATTERN.test(paperId)) continue
    const valid = cleanRecord(record)
    if (valid) clean[paperId] = valid
  }
  return clean
}

export function readPaperLessonProgress(): PaperLessonProgress {
  try {
    return cleanPaperLessonProgress(JSON.parse(localStorage.getItem(PAPER_LESSON_PROGRESS_KEY) ?? '{}'))
  } catch {
    return {}
  }
}

export function savePaperLessonStep(paperId: string, step: LessonStep, completed = false): PaperLessonRecord {
  const safeId = PAPER_ID_PATTERN.test(paperId) ? paperId : ''
  const safeStep = Math.max(1, Math.min(5, Number.isInteger(step) ? step : 1)) as LessonStep
  const previous = readPaperLessonProgress()[safeId]
  const record = { step: safeStep, completed: completed || previous?.completed === true }
  if (!safeId) return record
  try {
    const next = { ...readPaperLessonProgress(), [safeId]: record }
    localStorage.setItem(PAPER_LESSON_PROGRESS_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent(PAPER_LESSON_PROGRESS_EVENT, { detail: { paperId, ...record } }))
  } catch {
    console.warn('案例课程进度暂时无法保存到本机存储。')
  }
  return record
}

export function clearPaperLessonProgress(): boolean {
  try {
    localStorage.removeItem(PAPER_LESSON_PROGRESS_KEY)
    window.dispatchEvent(new CustomEvent(PAPER_LESSON_PROGRESS_EVENT, { detail: { reason: 'clear' } }))
    return true
  } catch {
    console.warn('案例课程进度暂时无法从本机存储清除。')
    return false
  }
}

export function lessonStepToLearningStage(step: LessonStep): LearningStage {
  if (step >= 5) return 4
  if (step >= 3) return 3
  return 1
}

export function getPaperLessonCta(record: PaperLessonRecord | undefined) {
  if (record?.completed) return '复习'
  if (record) return `继续第 ${record.step} 关`
  return '开始'
}

export function getPaperLessonSummary(progress: PaperLessonProgress, paperIds: readonly string[]) {
  const completed = paperIds.filter((id) => progress[id]?.completed).length
  const activeId = paperIds.find((id) => progress[id] && !progress[id].completed)
  const nextId = activeId ?? paperIds.find((id) => !progress[id]?.completed)
  return { completed, total: paperIds.length, nextId }
}

export function getPaperLessonHubCta(progress: PaperLessonProgress, paperIds: readonly string[]) {
  const summary = getPaperLessonSummary(progress, paperIds)
  if (summary.total > 0 && summary.completed === summary.total) return { label: '复习课程', paperId: undefined }
  const started = paperIds.some((id) => Boolean(progress[id]))
  return { label: started ? '继续主线' : '开始主线', paperId: summary.nextId }
}
