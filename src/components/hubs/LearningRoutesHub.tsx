import { useMemo, useState } from 'react'
import { ArrowRight, Target } from 'lucide-react'
import { applicationScenarioEntries, contentEntries, registryIssues, visibleContentEntries } from '../../content/registry'
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
    <header className='registry-hub-intro'><span>结构化学习路径</span><h1>从基础机制，走向可靠系统</h1><p>先从一个具体工作问题进入短案例，或按学习顺序、主题和层级浏览完整课程。</p><button type='button' onClick={() => go('strategy-cases')}>进入案例中心<ArrowRight aria-hidden='true' /></button></header>
    <section className='registry-hub-intro' aria-label='按工作问题选择案例'>
      <div className='content-grid' role='list'>
        {applicationScenarioEntries.map(({ id, role, question, entry }) => (
          <article role='listitem' className='content-card is-case' key={id}>
            <header><Target aria-hidden='true' /><span>{role}</span></header>
            <h2>{question}</h2>
            <p>{entry.title}</p>
            <footer><button type='button' onClick={() => go(entry.route.page, entry.route.options)}>进入案例<ArrowRight aria-hidden='true' /></button></footer>
          </article>
        ))}
      </div>
    </section>
    <ContentFilters value={filters} onChange={setFilters} resultCount={results.length} tags={tags} />
    {results.length ? <ContentGrid entries={results} go={go} /> : <ContentEmptyState onClear={() => setFilters(emptyFilters)} />}
  </section>
}
