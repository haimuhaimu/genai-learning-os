import type { ContentEntry, ContentType } from './types'
import type { ContentLevel, ContentStatus, ContentTag } from './vocabulary'

export type ContentQuery = {
  types?: readonly ContentType[]
  tags?: readonly ContentTag[]
  levels?: readonly ContentLevel[]
  statuses?: readonly ContentStatus[]
  relatedCaseId?: string
  relatedLabId?: string
}

export function selectContent(entries: readonly ContentEntry[], query: ContentQuery = {}): ContentEntry[] {
  const statuses = query.statuses ?? ['published']
  return entries.filter((entry) => {
    if (!statuses.includes(entry.status)) return false
    if (query.types?.length && !query.types.includes(entry.type)) return false
    if (query.tags?.length && !query.tags.every((tag) => entry.tags.includes(tag))) return false
    if (query.levels?.length && !query.levels.includes(entry.level)) return false
    if (query.relatedCaseId && !entry.relatedCaseIds?.includes(query.relatedCaseId)) return false
    if (query.relatedLabId && !entry.relatedLabIds?.includes(query.relatedLabId)) return false
    return true
  })
}

export const selectCourses = (entries: readonly ContentEntry[], query: Omit<ContentQuery, 'types'> = {}) => selectContent(entries, { ...query, types: ['course'] })
export const selectLabs = (entries: readonly ContentEntry[], query: Omit<ContentQuery, 'types'> = {}) => selectContent(entries, { ...query, types: ['lab'] })
export const selectResources = (entries: readonly ContentEntry[], query: Omit<ContentQuery, 'types'> & { types?: readonly ('video' | 'paper')[] } = {}) => selectContent(entries, { ...query, types: query.types ?? ['video', 'paper'] })
