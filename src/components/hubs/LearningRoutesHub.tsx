import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Target } from 'lucide-react'
import { applicationScenarioEntries, contentEntries, registryIssues, visibleContentEntries } from '../../content/registry'
import { selectCourses } from '../../content/selectors'
import type { ContentLevel, ContentTag } from '../../content/vocabulary'
import ContentEmptyState from '../content/ContentEmptyState'
import ContentFilters, { emptyFilters } from '../content/ContentFilters'
import ContentGrid from '../content/ContentGrid'
import RegistryFallback from '../content/RegistryFallback'
import LearningJourneyPanel from '../journey/LearningJourneyPanel'
import BayesJourneyPanel from '../journey/BayesJourneyPanel'
import '../journey/journey.css'
import '../../styles/hubs.css'

type Go = (page: string, options?: Record<string, string>) => void
const tags: readonly { value: ContentTag; label: string }[] = [
  { value: 'foundation', label: '算法基础' }, { value: 'math', label: '决策数学' },
  { value: 'llm', label: 'LLM' }, { value: 'image', label: '图像生成' },
  { value: 'agent', label: '智能体' }, { value: 'distillation', label: '模型蒸馏' }, { value: 'frontier', label: '前沿探索' },
]

export default function LearningRoutesHub({ go, initialSection }: { go: Go; initialSection?: string }) {
  const [filters, setFilters] = useState(emptyFilters)
  const bayes = initialSection === 'bayes-journey'
  useEffect(() => {
    if (!['journey', 'bayes-journey'].includes(initialSection ?? '')) return
    const frame = requestAnimationFrame(() => {
      const panel = document.getElementById(initialSection === 'bayes-journey' ? 'bayes-learning-journey' : 'learning-journey')
      panel?.scrollIntoView({ block: 'start', behavior: 'instant' })
      panel?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [initialSection])
  const results = useMemo(() => selectCourses(visibleContentEntries, {
    tags: filters.tag === 'all' ? undefined : [filters.tag],
    levels: filters.level === 'all' ? undefined : [filters.level as ContentLevel],
  }).sort((a, b) => a.type === 'course' && b.type === 'course' ? a.order - b.order : 0), [filters])
  if (!results.length && !contentEntries.length) return <section className='lo-hub-page'><RegistryFallback go={go} /></section>
  return <section className='lo-hub-page registry-hub lo-routes-page'>
    {registryIssues.length ? <RegistryFallback go={go} partial /> : null}
    <header className='registry-hub-intro'><span>结构化学习路径</span><h1>从基础机制，走向可靠系统</h1><p>先从一个具体工作问题进入短案例，或按学习顺序、主题和层级浏览完整课程。</p><button type='button' onClick={() => go('strategy-cases')}>进入案例中心<ArrowRight aria-hidden='true' /></button></header>
    <nav className='lo-learning-journey journey-choice' aria-label='选择一条完整学习路径'>
      <button type='button' aria-pressed={!bayes} onClick={() => go('routes', { section: 'journey' })}><span className='journey-kicker'>01 · 模型学习</span><br /><strong>模型怎样从例子里学会？</strong></button>
      <button type='button' aria-pressed={bayes} onClick={() => go('routes', { section: 'bayes-journey' })}><span className='journey-kicker'>02 · 贝叶斯更新</span><br /><strong>新线索来了，怎样改判断？</strong></button>
    </nav>
    {bayes ? <BayesJourneyPanel go={go} /> : <LearningJourneyPanel go={go} />}
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
