export const canonicalPages = [
  'unified-map',
  'routes',
  'math-primer',
  'decision-math',
  'labs',
  'reviews',
  'co-build',
  'strategy-cases',
  'strategy-case',
  'videos',
  'papers',
  'foundation',
  'foundation-lab',
  'distill-course',
  'distill-lab',
  'progress',
  'expert-map',
  'expert-llm',
  'expert-image',
  'expert-agent',
  'expert-lab',
  'agent-lab',
  'agent-book',
  'agent-book-lab',
  'agent-book-review',
  'handbook',
  'review',
  'llm',
  'image',
  'lab',
  'evaluation',
] as const

export type Page = typeof canonicalPages[number]

export const pageAliases = {
  map: 'unified-map',
} as const satisfies Record<string, Page>

export type PageAlias = keyof typeof pageAliases
export type PageInput = Page | PageAlias

export const pages: ReadonlySet<string> = new Set([
  ...canonicalPages,
  ...Object.keys(pageAliases),
])

const canonicalPageSet: ReadonlySet<string> = new Set(canonicalPages)

export const routeKeys = ['module', 'experiment', 'node', 'section', 'chapter', 'card', 'case'] as const
export const feedbackRouteKeys = ['page', ...routeKeys] as const
export type RouteKey = typeof routeKeys[number]
export type GoOptions = Partial<Record<RouteKey, string>>
export type RouteState = GoOptions & { page: Page }

export const defaultPage: Page = 'unified-map'

export function normalizePage(rawPage: string | null | undefined): Page {
  if (!rawPage) return defaultPage
  if (Object.prototype.hasOwnProperty.call(pageAliases, rawPage)) return pageAliases[rawPage as PageAlias]
  return canonicalPageSet.has(rawPage) ? rawPage as Page : defaultPage
}
