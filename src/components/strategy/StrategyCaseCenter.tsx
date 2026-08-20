import { ArrowRight, CheckCircle2, Circle, Clock3, Compass, ExternalLink, Filter, Video } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { evidenceLevelLabels, readStrategyEvidence, STRATEGY_EVIDENCE_EVENT, type EvidenceLevel } from '../../strategyEvidence'
import { flagshipCaseIds, frontierCaseIds, strategyCaseRegistry } from './caseRegistry'
import type { RouteId } from './types'

type Go = (page: string, options?: Record<string, string>) => void
const routeFilters: Array<{ id: 'all' | RouteId; label: string }> = [
  { id: 'all', label: '全部路线' }, { id: 'foundation', label: '算法基础' }, { id: 'llm', label: 'LLM' },
  { id: 'image', label: '图像生成' }, { id: 'agent', label: 'Agent' }, { id: 'agent-book', label: 'Agent Book' }, { id: 'distill', label: '模型蒸馏' },
  { id: 'self-evolving', label: 'Self-Evolving' }, { id: 'world-model', label: 'World Model' },
]

export default function StrategyCaseCenter({ go }: { go: Go }) {
  const [filter, setFilter] = useState<'all' | RouteId>('all')
  const [evidence, setEvidence] = useState(() => readStrategyEvidence())
  useEffect(() => {
    const sync = () => setEvidence(readStrategyEvidence())
    window.addEventListener(STRATEGY_EVIDENCE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => { window.removeEventListener(STRATEGY_EVIDENCE_EVENT, sync); window.removeEventListener('storage', sync) }
  }, [])
  const visible = useMemo(() => strategyCaseRegistry.filter((item) => filter === 'all' || item.routeId === filter), [filter])
  const mainCases = useMemo(() => visible.filter((item) => !frontierCaseIds.has(item.id)), [visible])
  const frontierCases = useMemo(() => visible.filter((item) => frontierCaseIds.has(item.id)), [visible])
  const status = (caseId: string) => evidence.find((item) => item.caseId === caseId)?.level ?? 0

  const renderCard = (item: (typeof visible)[number]) => {
    const level = status(item.id) as EvidenceLevel
    const isFlagship = flagshipCaseIds.has(item.id)
    const isFrontier = frontierCaseIds.has(item.id)
    return (
      <article key={item.id} className={isFrontier ? 'is-frontier' : ''}>
        <header>
          <span>
            {item.routeLabel}
            {isFrontier ? <em className='frontier-badge'>前沿探索</em> : isFlagship ? <em>精选案例</em> : null}
          </span>
          <small><Clock3 aria-hidden='true' />{item.duration}</small>
        </header>
        <h2>{item.title}</h2>
        <p><b>决策问题</b>{item.question}</p>
        <footer>
          <span className={`strategy-status level-${level}`}>{level > 0 ? <CheckCircle2 aria-hidden='true' /> : <Circle aria-hidden='true' />}{evidenceLevelLabels[level]}</span>
          <button type='button' onClick={() => go(item.page, item.options)}>进入 Case<ArrowRight aria-hidden='true' /></button>
        </footer>
      </article>
    )
  }

  return (
    <section className='strategy-center'>
      <header className='strategy-center-hero'><span>Strategy-first · 策略案例地图</span><h1>先做决策，再理解算法</h1><p>每个案例都从业务目标开始。你要选择策略、承担代价，并说明下一轮模型该学什么。</p><a href='https://github.com/haimuhaimu/genai-learning-os/blob/main/docs/CASE_AUTHORING.md' target='_blank' rel='noopener noreferrer' aria-label='在 GitHub 打开策略 Case 作者指南（打开新窗口）'>你也可以贡献一个策略 Case<ExternalLink aria-hidden='true' /></a><aside><b>统一学习协议</b><small>目标 → 动作 → 证据 → 代价 → 反馈 → 训练 → 摘要</small></aside></header>
      <nav className='strategy-filters' aria-label='按路线筛选'><Filter aria-hidden='true' />{routeFilters.map((item) => <button type='button' key={item.id} aria-pressed={filter === item.id} className={filter === item.id ? 'is-active' : ''} onClick={() => setFilter(item.id)}>{item.label}</button>)}</nav>
      {mainCases.length ? <div className='strategy-case-grid'>{mainCases.map(renderCard)}</div> : null}
      {frontierCases.length ? (
        <section className='strategy-frontier-section' aria-labelledby='strategy-frontier-title'>
          <header>
            <span><Compass aria-hidden='true' />前沿探索</span>
            <h2 id='strategy-frontier-title'>前沿探索：值得追但仍在早期</h2>
            <p>以下方向仍不稳定，先做决策，再理解算法。任何自动闭环上线前请先设计人工兜底与停手条件。</p>
          </header>
          <div className='strategy-case-grid'>{frontierCases.map(renderCard)}</div>
        </section>
      ) : null}
      {!mainCases.length && !frontierCases.length ? <p className='strategy-center-empty'>当前筛选下没有案例。</p> : null}
      <button type='button' className='strategy-video-entry' onClick={() => go('videos')}><Video aria-hidden='true' />按卡点找参考视频</button>
      <p className='strategy-center-note'>状态只由可见行为推进：首次调整策略为"已实验"，形成摘要为"已形成策略"；本轮不伪造通用评审状态。</p>
    </section>
  )
}
