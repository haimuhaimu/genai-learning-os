export type JourneyId = 'model-learning' | 'bayes-learning'
export const CURRENT_JOURNEY_KEY = 'genai-current-learning-journey-v1'
export const CURRENT_JOURNEY_EVENT = 'genai-current-learning-journey-change'
let temporaryJourney: JourneyId | null = null
export const readTemporaryJourney = () => temporaryJourney
export const clearTemporaryJourney = () => { temporaryJourney = null }

function isJourneyId(value: unknown): value is JourneyId {
  return value === 'model-learning' || value === 'bayes-learning'
}

export function readCurrentJourney(storage?: Pick<Storage, 'getItem'>): JourneyId | null {
  try {
    const raw = (storage ?? localStorage).getItem(CURRENT_JOURNEY_KEY)
    if (!raw || raw.length > 256) return null
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object') return null
    const data = value as Record<string, unknown>
    return data.schemaVersion === 1 && isJourneyId(data.journeyId) ? data.journeyId : null
  } catch { return null }
}

// Navigation preference only: never migrate or update course/practice records.
export function rememberCurrentJourney(journeyId: JourneyId, storage?: Pick<Storage, 'setItem'>): boolean {
  if (!isJourneyId(journeyId)) return false
  try {
    ;(storage ?? localStorage).setItem(CURRENT_JOURNEY_KEY, JSON.stringify({ schemaVersion: 1, journeyId }))
    if (!storage) temporaryJourney = null
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(CURRENT_JOURNEY_EVENT))
    return true
  } catch {
    // Keep this visit coherent even if browser storage is full/disabled.
    // This is deliberately not a learning record and does not survive refresh.
    if (!storage && typeof window !== 'undefined') {
      temporaryJourney = journeyId
      window.dispatchEvent(new Event(CURRENT_JOURNEY_EVENT))
    }
    return false
  }
}

export function resolveJourneyResume(preferred: JourneyId | null, model: { active: boolean }, bayes: { active: boolean }) {
  if (preferred) return { current: preferred, needsChoice: false }
  if (model.active && bayes.active) return { current: null, needsChoice: true }
  return { current: model.active ? 'model-learning' as const : bayes.active ? 'bayes-learning' as const : null, needsChoice: false }
}

export function journeyForSection(section?: string): JourneyId | null {
  return section === 'journey' ? 'model-learning' : section === 'bayes-journey' ? 'bayes-learning' : null
}

export const journeyDestination = (id: JourneyId) => ({ section: id === 'model-learning' ? 'journey' : 'bayes-journey' })
export const journeyTitle = (id: JourneyId) => id === 'model-learning' ? '模型怎样从例子里学会？' : '新线索来了，怎样改判断？'
export const journeyLabel = (id: JourneyId) => id === 'model-learning' ? '模型路线' : '贝叶斯路线'
