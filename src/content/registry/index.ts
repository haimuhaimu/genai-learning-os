import type { ContentEntry } from '../types'
import { partitionValidEntries } from '../validateRegistry'
import { caseEntries } from './cases'
import { courseEntries } from './courses'
import { labEntries } from './labs'
import { resourceEntries } from './resources'

export const contentEntries: readonly ContentEntry[] = [
  ...courseEntries,
  ...caseEntries,
  ...labEntries,
  ...resourceEntries,
]

const partition = partitionValidEntries(contentEntries)

if (import.meta.env?.DEV && partition.issues.length) {
  for (const issue of partition.issues) console.error(`[content-registry] ${issue.entryId}.${issue.field}: ${issue.message}`)
}

export const visibleContentEntries = partition.validEntries
export const contentById: ReadonlyMap<string, ContentEntry> = new Map(visibleContentEntries.map((entry) => [entry.id, entry]))
export const registryIssues = partition.issues
