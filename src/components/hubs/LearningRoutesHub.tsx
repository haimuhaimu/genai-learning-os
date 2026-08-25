import { useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { contentEntries, registryIssues, visibleContentEntries } from '../../content/registry'
import { selectCourses } from '../../content/selectors'
import type { ContentLevel, ContentTag } from '../../content/vocabulary'
import ContentEmptyState from '../content/ContentEmptyState'
import ContentFilters, { emptyFilters } from '../content/ContentFilters'
import ContentGrid from '../content/ContentGrid'
import RegistryFallback from '../content/RegistryFallback'
import '../../styles/hubs.css'

type Go = (page: string, options?: Record<string, string>) => void
const tags: readonly { value: ContentTag; label: string }[] = [
  { value: 'foundation', label: '算法基础' }, { value: 'math', label: '决策数学' },
  { value: 'llm', label: 'LLM' }, { value: 'image', label: '图像生成' },
  { value: 'agent', label: '智能体' }, { value: 'distillation', label: '模型蒸馏' }, { value: 'frontier', label: '前沿探索' },
]

export default function LearningRoutesHub({ go }: { go: Go }) {
  const [filters, setFilters] = useState(emptyFilters)
  const results = useMemo(() => selectCourses(visibleContentEntries, {
    tags: filters.tag === 'all' ? undefined : [filters.tag],
    levels: filters.level === 'all' ? undefined : [filters.level as ContentLevel],
  }).sort((a, b) => a.type === 'course' && b.type === 'course' ? a.order - b.order : 0), [filters])
  if (!results.length && !contentEntries.length) return <section className='lo-hub-page'><RegistryFallback go={go} /></section>
  return <section className='lo-hub-page registry-hub lo-routes-page'>
    {registryIssues.length ? <RegistryFallback go={go} partial /> : null}
    <header className='registry-hub-intro'><span>结构化学习路径</span><h1>从基础机制，走向可靠系统</h1><p>按学习顺序浏览课程，或用主题与层级缩小范围。每条路线连接原有课程、实验和案例。</p><button type='button' onClick={() => go('strategy-cases')}>进入案例中心<ArrowRight aria-hidden='true' /></button></header>
    <ContentFilters value={filters} onChange={setFilters} resultCount={results.length} tags={tags} />
    {results.length ? <ContentGrid entries={results} go={go} /> : <ContentEmptyState onClear={() => setFilters(emptyFilters)} />}
  </section>
}
