import { feedbackRouteKeys, normalizePage, pages } from '../routeConfig'

export const MAX_ROUTE_VALUE_LENGTH = 120
export type FeedbackRouteContext = Partial<Record<(typeof feedbackRouteKeys)[number], string>>

function cleanRouteValue(value: string) {
  const withoutControls = [...value]
    .map((character) => {
      const code = character.charCodeAt(0)
      return code <= 31 || code === 127 ? ' ' : character
    })
    .join('')
  return withoutControls.replace(/\s+/g, ' ').trim().slice(0, MAX_ROUTE_VALUE_LENGTH)
}

export function readFeedbackRouteContext(search: string): FeedbackRouteContext {
  const params = new URLSearchParams(search)
  const context: FeedbackRouteContext = {}

  for (const key of feedbackRouteKeys) {
    const raw = params.get(key)
    if (!raw) continue
    const value = cleanRouteValue(raw)
    if (!value) continue
    if (key === 'page') {
      if (!pages.has(value)) continue
      context.page = normalizePage(value)
    } else {
      context[key] = value
    }
  }

  return context
}

export function routeContextEntries(context: FeedbackRouteContext) {
  return feedbackRouteKeys.flatMap((key) => context[key] ? [[key, context[key]] as const] : [])
}
