import { strategyCaseCatalog } from '../../components/strategy/caseCatalog'
import type { CaseEntry } from '../types'
import type { ContentTag } from '../vocabulary'

const routeTags: Record<string, ContentTag> = {
  foundation: 'foundation',
  'ai-decision-math': 'math',
  llm: 'llm',
  image: 'image',
  agent: 'agent',
  'agent-book': 'agent-book',
  distill: 'distillation',
  'self-evolving': 'frontier',
  'world-model': 'frontier',
}

export const caseEntries: readonly CaseEntry[] = strategyCaseCatalog.map((item) => ({
  id: `case:${item.id}`,
  legacyId: item.id,
  type: 'case',
  title: item.title,
  summary: item.question,
  route: { page: item.page, options: item.options },
  tags: [routeTags[item.routeId], 'reliability'],
  level: 'intermediate',
  status: 'published',
}))
