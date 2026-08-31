import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight, BarChart3, BookOpenCheck, Boxes, CircleHelp, FlaskConical, Gauge, GitCompareArrows, ScrollText, Sigma } from 'lucide-react'
import type { ExpertModule, ExpertTrack } from '../expertData'
import DecisionBriefPractice from './course/DecisionBriefPractice'
import { ScalingAllocationExperiment } from './course/ConceptExperiments'

const icons = [Boxes, GitCompareArrows, Sigma, BarChart3]

type Props = {
  modules: ExpertModule[]
  track: ExpertTrack
  initialModule?: string
  onOpenLab: (experiment?: string) => void
  onOpenStrategyCase: () => void
}

export default function ExpertCourse({ modules, track, initialModule, onOpenLab, onOpenStrategyCase }: Props) {
  const initialIndex = Math.max(0, modules.findIndex((item) => item.id === initialModule))
  const [active, setActive] = useState(initialIndex)
  const module = modules[active]
  const ToneIcon = icons[active % icons.length]

  useEffect(() => {
    if (!initialModule) return
    const index = modules.findIndex((item) => item.id === initialModule)
    if (index >= 0) setActive(index)
  }, [initialModule, modules])

  const changeModule = (index: number) => {
    setActive(index)
    const url = new URL(window.location.href)
    url.searchParams.set('module', modules[index].id)
    window.history.replaceState({}, '', url)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return <section className={`expert-course ${track}`}>
    <aside className='expert-rail'>
      <div className='expert-rail-head'>
        <span>{track === 'llm' ? 'EXPERT TRACK · LLM' : 'EXPERT TRACK · IMAGE'}</span>
        <h2>{track === 'llm' ? '模型系统架构' : '生成系统架构'}</h2>
        <p>{modules.length} 个决策模块 · 生产级评审框架</p>
        <button type='button' className='strategy-route-entry' onClick={onOpenStrategyCase}>该路线策略案例<ArrowRight /></button>
      </div>
      <div className='expert-module-list'>
        {modules.map((item, index) => <button key={item.id} className={index === active ? 'active' : ''} onClick={() => changeModule(index)}>
          <i>{item.no}</i><span><b>{item.title}</b><small>{item.subtitle}</small></span>
        </button>)}
      </div>
      <button className='rail-lab-entry' onClick={() => onOpenLab(track === 'llm' ? 'kv-cost' : 'diffusion-flow')}><FlaskConical />打开对应专家实验</button>
    </aside>

    <article className='expert-lesson'>
      <header className='expert-lesson-hero'>
        <div><span>{module.no} · DECISION BRIEF</span><h1>{module.title}</h1><p>{module.subtitle}</p></div>
        <div className='system-glyph'><ToneIcon /><b>{active + 1}/{modules.length}</b></div>
      </header>

      <div className='decision-ribbon'>
        <div><small>本节输出</small><b>架构取舍 → 指标证据 → 上线决策</b></div>
        <ArrowRight />
        <div><small>评审标准</small><b>能算、能测、能归因、能回滚</b></div>
      </div>

      <div className='expert-card-grid'>
        {track === 'llm' && module.id === 'scaling' ? <section className='expert-card' style={{ gridColumn: '1 / -1' }}><header><FlaskConical /><span>先做实验，再解释</span></header><ScalingAllocationExperiment /></section> : null}
        <section className='expert-card architecture-card'>
          <header><Boxes /><span>架构机制</span></header><p>{module.architecture}</p>
        </section>
        <section className='expert-card formula-expert-card'>
          <header><Sigma /><span>关键公式</span></header><code>{module.formula}</code><p>{module.formulaNote}</p>
        </section>
        <section className='expert-card constraint-card'>
          <header><Gauge /><span>工程约束</span></header><ul>{module.constraints.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
        <section className='expert-card decision-card'>
          <header><BookOpenCheck /><span>产品决策</span></header><strong>{module.decision}</strong>
          <div className='tradeoff-box'><GitCompareArrows /><p><b>Trade-off</b>{module.tradeoff}</p></div>
        </section>
        <section className='expert-card metric-card'>
          <header><BarChart3 /><span>上线指标与日志</span></header>
          <div>{module.metrics.map((item) => <span key={item}>{item}</span>)}</div>
          <small>要求：按版本、流量类型、输入长度与风险切片留存，支持端到端 trace 回放。</small>
        </section>
        <section className='expert-card failure-expert-card'>
          <header><AlertTriangle /><span>典型失败</span></header>
          <ol>{module.failures.map((item, index) => <li key={item}><b>{String(index + 1).padStart(2, '0')}</b>{item}</li>)}</ol>
        </section>
        <section className='expert-card review-card'>
          <header><CircleHelp /><span>评审追问</span></header>
          <ul>{module.review.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
        <section className='expert-card case-card'>
          <header><ScrollText /><span>案例推演</span></header><p>{module.caseStudy}</p>
          <button onClick={() => onOpenLab(track === 'llm' ? (module.id === 'rag-agent' ? 'rag-doctor' : module.id === 'alignment' ? 'alignment' : 'kv-cost') : (module.id === 'control' ? 'control-selector' : 'diffusion-flow'))}>进入可操作实验<ArrowRight /></button>
        </section>
        {module.practice ? <DecisionBriefPractice key={module.practice.id} practice={module.practice} /> : null}
      </div>
    </article>
  </section>
}
