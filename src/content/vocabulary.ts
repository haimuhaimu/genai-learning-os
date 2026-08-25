export const contentStatuses = ['published', 'draft', 'archived'] as const
export type ContentStatus = typeof contentStatuses[number]

export const contentLevels = ['beginner', 'intermediate', 'advanced', 'reference'] as const
export type ContentLevel = typeof contentLevels[number]

export const contentTags = [
  'foundation', 'math', 'llm', 'image', 'agent', 'agent-book', 'distillation',
  'frontier', 'reliability', 'recommendation', 'multimodal', 'resource',
] as const
export type ContentTag = typeof contentTags[number]

export const contentTypeLabels = {
  course: '课程',
  case: '案例',
  lab: '实验',
  video: '视频',
  paper: '论文',
} as const

export const contentLevelLabels: Record<ContentLevel, string> = {
  beginner: '入门',
  intermediate: '进阶',
  advanced: '深入',
  reference: '参考',
}

export const contentStatusLabels: Record<ContentStatus, string> = {
  published: '已发布',
  draft: '草稿',
  archived: '已归档',
}
