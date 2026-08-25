import { canonicalPages, routeKeys } from '../routeConfig'
import type { ContentEntry } from './types'
import { contentLevels, contentStatuses, contentTags } from './vocabulary'

export type RegistryIssueCode =
  | 'duplicate-id' | 'invalid-page' | 'invalid-route-key' | 'invalid-tag'
  | 'invalid-level' | 'invalid-status' | 'missing-field' | 'missing-relation' | 'wrong-relation-type'

export type RegistryIssue = {
  code: RegistryIssueCode
  entryId: string
  field: string
  message: string
}

type UnknownEntry = ContentEntry & Record<string, unknown>

export function validateRegistry(entries: readonly ContentEntry[]): RegistryIssue[] {
  const issues: RegistryIssue[] = []
  const byId = new Map<string, ContentEntry>()
  const seen = new Set<string>()
  const pages = new Set<string>(canonicalPages)
  const keys = new Set<string>(routeKeys)
  const tags = new Set<string>(contentTags)
  const levels = new Set<string>(contentLevels)
  const statuses = new Set<string>(contentStatuses)

  for (const entry of entries as readonly UnknownEntry[]) {
    const id = typeof entry.id === 'string' && entry.id ? entry.id : '<unknown>'
    if (seen.has(id)) issues.push({ code: 'duplicate-id', entryId: id, field: 'id', message: `${id} 存在重复 ID` })
    seen.add(id)
    if (!byId.has(id)) byId.set(id, entry)
    if (!entry.title?.trim()) issues.push({ code: 'missing-field', entryId: id, field: 'title', message: `${id} 缺少标题` })
    if (!entry.route || !pages.has(String(entry.route.page))) issues.push({ code: 'invalid-page', entryId: id, field: 'route.page', message: `${id} 的入口页面无效` })
    for (const key of Object.keys(entry.route?.options ?? {})) {
      if (!keys.has(key)) issues.push({ code: 'invalid-route-key', entryId: id, field: `route.options.${key}`, message: `${id} 使用了非法路由参数 ${key}` })
    }
    for (const tag of entry.tags ?? []) {
      if (!tags.has(String(tag))) issues.push({ code: 'invalid-tag', entryId: id, field: 'tags', message: `${id} 使用了非法标签 ${tag}` })
    }
    if (!levels.has(String(entry.level))) issues.push({ code: 'invalid-level', entryId: id, field: 'level', message: `${id} 的层级无效` })
    if (!statuses.has(String(entry.status))) issues.push({ code: 'invalid-status', entryId: id, field: 'status', message: `${id} 的状态无效` })
  }

  for (const entry of entries) {
    for (const targetId of entry.relatedLabIds ?? []) {
      const target = byId.get(targetId)
      if (!target) issues.push({ code: 'missing-relation', entryId: entry.id, field: 'relatedLabIds', message: `${entry.id} 关联的实验 ${targetId} 不存在` })
      else if (target.type !== 'lab') issues.push({ code: 'wrong-relation-type', entryId: entry.id, field: 'relatedLabIds', message: `${entry.id} 的实验关联 ${targetId} 类型错误` })
    }
    for (const targetId of entry.relatedCaseIds ?? []) {
      const target = byId.get(targetId)
      if (!target) issues.push({ code: 'missing-relation', entryId: entry.id, field: 'relatedCaseIds', message: `${entry.id} 关联的案例 ${targetId} 不存在` })
      else if (target.type !== 'case') issues.push({ code: 'wrong-relation-type', entryId: entry.id, field: 'relatedCaseIds', message: `${entry.id} 的案例关联 ${targetId} 类型错误` })
    }
  }
  return issues
}

export function partitionValidEntries(entries: readonly ContentEntry[]) {
  const issues = validateRegistry(entries)
  const invalidIds = new Set(issues.map((issue) => issue.entryId))
  const validEntries = entries.filter((entry) => !invalidIds.has(entry.id))
  return { validEntries, invalidEntries: entries.filter((entry) => invalidIds.has(entry.id)), issues }
}
