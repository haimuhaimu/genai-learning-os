import { useMemo, useState } from 'react'
import { ArrowRight, BookOpen, Video } from 'lucide-react'
import { contentEntries, registryIssues, visibleContentEntries } from '../../content/registry'
import { selectResources } from '../../content/selectors'
import type { ContentLevel, ContentTag } from '../../content/vocabulary'
import ContentEmptyState from '../content/ContentEmptyState'
import ContentFilters, { emptyFilters } from '../content/ContentFilters'
import ContentGrid from '../content/ContentGrid'
import RegistryFallback from '../content/RegistryFallback'
import '../../videoLibrary.css'
import '../../paperLibrary.css'
import '../../styles/hubs.css'
import '../../styles/toolbox.css'

type Go = (page: string, options?: Record<string, string>) => void
const tags: readonly { value: ContentTag; label: string }[] = [
  { value: 'foundation', label: '算法基础' }, { value: 'math', label: '决策数学' },
  { value: 'llm', label: 'LLM' }, { value: 'image', label: '图像与多模态' },
  { value: 'agent', label: '智能体' }, { value: 'distillation', label: '模型蒸馏' }, { value: 'frontier', label: '前沿探索' },
]
const types = [{ value: 'video', label: '视频' }, { value: 'paper', label: '论文' }] as const

export default function ResourcesHub({ go }: { go: Go }) {
  const [filters, setFilters] = useState(emptyFilters)
  const results = useMemo(() => selectResources(visibleContentEntries, {
    types: filters.type === 'video' || filters.type === 'paper' ? [filters.type] : undefined,
    tags: filters.tag === 'all' ? undefined : [filters.tag],
    levels: filters.level === 'all' ? undefined : [filters.level as ContentLevel],
  }), [filters])
  if (!results.length && !contentEntries.length) return <section className='toolbox-page'><RegistryFallback go={go} /></section>
  return <section className='toolbox-page registry-hub'>
    {registryIssues.length ? <RegistryFallback go={go} partial /> : null}
    <header className='toolbox-hero'><span>视频与论文</span><h1>需要时，再深入机制</h1><p>在同一资源区筛选参考视频与核心论文。原视频库和论文库仍可直接访问。</p><div><button type='button' onClick={() => go('videos')}><Video aria-hidden='true' />打开视频库<ArrowRight aria-hidden='true' /></button><button type='button' className='is-quiet' onClick={() => go('papers')}><BookOpen aria-hidden='true' />打开论文库</button></div></header>
    <ContentFilters value={filters} onChange={setFilters} resultCount={results.length} types={types} tags={tags} />
    {results.length ? <ContentGrid entries={results} go={go} variant='resources' /> : <ContentEmptyState onClear={() => setFilters(emptyFilters)} />}
  </section>
}
