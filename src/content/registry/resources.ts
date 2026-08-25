import { paperResources } from '../../resources/paperCatalog'
import { videoResources } from '../../resources/videoCatalog'
import type { PaperEntry, VideoEntry } from '../types'
import type { ContentLevel, ContentTag } from '../vocabulary'

function routeTag(routeIds: readonly string[]): ContentTag {
  const first = routeIds[0]
  if (first === 'ai-decision-math') return 'math'
  if (first === 'agent-book') return 'agent-book'
  if (first === 'distill') return 'distillation'
  if (first === 'self-evolving' || first === 'world-model') return 'frontier'
  if (first === 'image') return 'image'
  if (first === 'agent') return 'agent'
  if (first === 'llm') return 'llm'
  return 'foundation'
}

const levelFor = (level: '入门' | '进阶'): ContentLevel => level === '入门' ? 'beginner' : 'intermediate'

export const videoEntries: readonly VideoEntry[] = videoResources.map((resource) => ({
  id: `video:${resource.id}`,
  type: 'video',
  title: resource.title,
  summary: resource.whyWorthWatching,
  route: { page: 'videos' },
  tags: ['resource', routeTag(resource.relatedRouteIds)],
  level: levelFor(resource.level),
  status: 'published',
  relatedCaseIds: resource.relatedCaseIds.map((id) => `case:${id}`),
  resource,
  externalUrl: resource.url,
}))

export const paperEntries: readonly PaperEntry[] = paperResources.map((resource) => ({
  id: `paper:${resource.id}`,
  type: 'paper',
  title: resource.title,
  summary: resource.oneLine,
  route: { page: 'papers' },
  tags: ['resource', routeTag(resource.relatedRouteIds)],
  level: levelFor(resource.level),
  status: 'published',
  relatedCaseIds: resource.relatedCaseIds.map((id) => `case:${id}`),
  resource,
  externalUrl: resource.url,
}))

export const resourceEntries = [...videoEntries, ...paperEntries] as const
