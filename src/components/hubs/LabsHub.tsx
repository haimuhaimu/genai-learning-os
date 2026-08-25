import { useMemo, useState } from 'react'
import { contentEntries, registryIssues, visibleContentEntries } from '../../content/registry'
import { selectLabs } from '../../content/selectors'
import type { ContentLevel, ContentTag } from '../../content/vocabulary'
import ContentEmptyState from '../content/ContentEmptyState'
import ContentFilters, { emptyFilters } from '../content/ContentFilters'
import ContentGrid from '../content/ContentGrid'
import RegistryFallback from '../content/RegistryFallback'
import '../../styles/hubs.css'

type Go = (page: string, options?: Record<string, string>) => void
const tags: readonly { value: ContentTag; label: string }[] = [
  { value: 'foundation', label: '算法基础' }, { value: 'llm', label: 'LLM 与图像' },
  { value: 'agent', label: '智能体' }, { value: 'agent-book', label: 'Agent Book' },
  { value: 'distillation', label: '模型蒸馏' }, { value: 'resource', label: '论文机制' },
]

export default function LabsHub({ go }: { go: Go }) {
  const [filters, setFilters] = useState(emptyFilters)
  const results = useMemo(() => selectLabs(visibleContentEntries, {
    tags: filters.tag === 'all' ? undefined : [filters.tag],
    levels: filters.level === 'all' ? undefined : [filters.level as ContentLevel],
  }), [filters])
  if (!results.length && !contentEntries.length) return <section className='lo-hub-page'><RegistryFallback go={go} /></section>
  return <section className='lo-hub-page registry-hub lo-labs-page'>
    {registryIssues.length ? <RegistryFallback go={go} partial /> : null}
    <header className='registry-hub-intro'><span>统一实验目录</span><h1>改变变量，让结果回答问题</h1><p>从算法基础到论文机制，全部实验都从同一目录进入，并保留原有深链参数。</p></header>
    <ContentFilters value={filters} onChange={setFilters} resultCount={results.length} tags={tags} />
    {results.length ? <ContentGrid entries={results} go={go} /> : <ContentEmptyState onClear={() => setFilters(emptyFilters)} />}
  </section>
}
