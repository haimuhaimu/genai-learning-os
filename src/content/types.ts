import type { GoOptions, Page } from '../routeConfig'
import type { PaperResource } from '../resources/paperCatalog'
import type { VideoResource } from '../resources/videoCatalog'
import type { ContentLevel, ContentStatus, ContentTag } from './vocabulary'

export type ContentType = 'course' | 'case' | 'lab' | 'video' | 'paper'
export type RouteTarget = { page: Page; options?: GoOptions }

type ContentBase = {
  id: string
  type: ContentType
  title: string
  summary: string
  route: RouteTarget
  tags: readonly ContentTag[]
  level: ContentLevel
  status: ContentStatus
  relatedLabIds?: readonly string[]
  relatedCaseIds?: readonly string[]
}

export type CourseEntry = ContentBase & {
  type: 'course'
  order: number
  audience: string
  outcome: string
  labRoute?: RouteTarget
  routeKind?: 'main' | 'branch' | 'frontier'
}

export type CaseEntry = ContentBase & {
  type: 'case'
  legacyId: string
}

export type LabEntry = ContentBase & {
  type: 'lab'
  family: 'foundation' | 'legacy' | 'expert' | 'agent' | 'agent-book' | 'distill' | 'paper'
  legacyId: string
}

export type VideoEntry = ContentBase & {
  type: 'video'
  resource: VideoResource
  externalUrl: string
}

export type PaperEntry = ContentBase & {
  type: 'paper'
  resource: PaperResource
  externalUrl: string
}

export type ContentEntry = CourseEntry | CaseEntry | LabEntry | VideoEntry | PaperEntry
