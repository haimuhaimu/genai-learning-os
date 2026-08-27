import type { Page } from './routeConfig'

export type PrimarySectionId = 'home' | 'academy' | 'cases' | 'labs' | 'toolbox'
export type PrimarySection = { id: PrimarySectionId; label: string; page: Page }

export const primarySections = [
  { id: 'home', label: '首页', page: 'unified-map' },
  { id: 'academy', label: '学堂', page: 'routes' },
  { id: 'cases', label: '案例', page: 'strategy-cases' },
  { id: 'labs', label: '实验室', page: 'labs' },
  { id: 'toolbox', label: '工具箱', page: 'toolbox' },
] as const satisfies readonly PrimarySection[]

export const pageSectionMap: Record<Page, PrimarySectionId> = {
  'unified-map': 'home',
  progress: 'home',
  routes: 'academy',
  'math-primer': 'academy',
  'decision-math': 'academy',
  reviews: 'academy',
  review: 'academy',
  evaluation: 'academy',
  foundation: 'academy',
  'distill-course': 'academy',
  'expert-map': 'academy',
  'expert-llm': 'academy',
  'expert-image': 'academy',
  'expert-agent': 'academy',
  'agent-book': 'academy',
  'agent-book-review': 'academy',
  llm: 'academy',
  image: 'academy',
  'strategy-cases': 'cases',
  'strategy-case': 'cases',
  labs: 'labs',
  lab: 'labs',
  'foundation-lab': 'labs',
  'distill-lab': 'labs',
  'expert-lab': 'labs',
  'k3-build-lab': 'labs',
  'agent-lab': 'labs',
  'agent-book-lab': 'labs',
  'paper-lab': 'labs',
  toolbox: 'toolbox',
  videos: 'toolbox',
  papers: 'toolbox',
  handbook: 'toolbox',
  'co-build': 'toolbox',
}

export function primarySectionForPage(page: Page): PrimarySectionId {
  return pageSectionMap[page]
}
