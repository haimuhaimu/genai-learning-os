import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight, BarChart3, BookOpenCheck, Bot, Boxes, CircleHelp, FlaskConical, Gauge, GitBranch, GitCompareArrows, ScrollText, Sigma } from 'lucide-react'
import { agentExpertModules } from '../agentExpertData'
import DecisionBriefPractice from './course/DecisionBriefPractice'

export default function AgentExpertCourse({ initialModule, onOpenLab, onOpenStrategyCase, onGoToAgentBook }: { initialModule?: string; onOpenLab: (experiment: string) => void; onOpenStrategyCase: () => void; onGoToAgentBook?: () => void }) {
  const initialIndex = Math.max(0, agentExpertModules.findIndex((item) => item.id === initialModule))
  const [active, setActive] = useState(initialIndex)
  const module = agentExpertModules[active]

  useEffect(() => {
    const index = agentExpertModules.findIndex((item) => item.id === initialModule)
    if (index >= 0) setActive(index)
  }, [initialModule])

  const changeModule = (index: number) => {
    setActive(index)
    const url = new URL(window.location.href)
    url.searchParams.set('module', agentExpertModules[index].id)
    url.searchParams.delete('experiment')
    window.history.replaceState({}, '', url)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return <section className='expert-course agent'>
    <aside className='expert-rail'>
      <div className='expert-rail-head'>
        <span>EXPERT TRACK · AGENT SYSTEMS</span>
        <h2>Agent 控制与治理</h2>
        <p>12 个决策模块 · 先修 LLM 推理 / RAG</p>
        <button type='button' className='strategy-route-entry' onClick={onOpenStrategyCase}>该路线策略案例<ArrowRight /></button>
        {onGoToAgentBook ? <button className='text-button' onClick={onGoToAgentBook}>更硬核 → 前往 Agent Book 路线</button> : null}
      </div>
      <div className='expert-module-list'>
        {agentExpertModules.map((item, index) => <button key={item.id} className={index === active ? 'active' : ''} onClick={() => changeModule(index)}>
          <i>{item.no}</i><span><b>{item.title}</b><small>{item.subtitle}</small></span>
        </button>)}
      </div>
      <button className='rail-lab-entry agent-entry' onClick={() => onOpenLab(module.experiment)}><FlaskConical />进入本模块 Agent Lab</button>
    </aside>

    <article className='expert-lesson'>
      <header className='expert-lesson-hero'>
        <div><span>{module.no} · AGENT SYSTEM REVIEW</span><h1>{module.title}</h1><p>{module.subtitle}</p></div>
        <div className='system-glyph'><Bot /><b>{active + 1}/{agentExpertModules.length}</b></div>
      </header>
      <div className='decision-ribbon agent-ribbon'>
        <div><small>控制面</small><b>状态 · 权限 · 预算 · 终止 · 上线闸门</b></div><ArrowRight />
        <div><small>数据面</small><b>模型 · 检索 · 记忆 · 工具 · 可验证结果</b></div>
      </div>
      <div className='agent-scope-note'>机制级教学估算 · 不调用真实模型或外部工具 · 不执行用户输入 · 仅展示结构化决策摘要，不展示私有 chain-of-thought{onGoToAgentBook ? <span style={{ marginLeft: 10 }}>· <button className='text-button' onClick={onGoToAgentBook}>更硬核 → 前往 Agent Book 路线</button></span> : null}</div>

      <div className='expert-card-grid'>
        <section className='expert-card architecture-card'><header><Boxes /><span>核心机制与系统边界</span></header><p>{module.architecture}</p></section>
        <section className='expert-card agent-state-card'><header><GitBranch /><span>状态机 / 控制流</span></header><code>{module.state}</code></section>
        <section className='expert-card formula-expert-card'><header><Sigma /><span>状态 / 公式</span></header><code>{module.formula}</code><p>{module.formulaNote}</p></section>
        <section className='expert-card constraint-card'><header><Gauge /><span>工程约束</span></header><ul>{module.constraints.map((item) => <li key={item}>{item}</li>)}</ul></section>
        <section className='expert-card decision-card'><header><BookOpenCheck /><span>产品决策</span></header><strong>{module.decision}</strong><div className='tradeoff-box'><GitCompareArrows /><p><b>Trade-off</b>{module.tradeoff}</p></div></section>
        <section className='expert-card metric-card'><header><BarChart3 /><span>关键指标 / 日志</span></header><div>{module.metrics.map((item) => <span key={item}>{item}</span>)}</div><small>按任务风险、租户、工具、模型/策略版本与 termination reason 切片；副作用事件全量审计。</small></section>
        <section className='expert-card failure-expert-card'><header><AlertTriangle /><span>典型失败</span></header><ol>{module.failures.map((item, index) => <li key={item}><b>{String(index + 1).padStart(2, '0')}</b>{item}</li>)}</ol></section>
        <section className='expert-card review-card'><header><CircleHelp /><span>评审 Checklist / 追问</span></header><ul>{module.review.map((item) => <li key={item}>{item}</li>)}</ul></section>
        <section className='expert-card case-card'><header><ScrollText /><span>案例推演</span></header><p>{module.caseStudy}</p><button onClick={() => onOpenLab(module.experiment)}>进入相关实验<ArrowRight /></button></section>
        {module.practice ? <DecisionBriefPractice key={module.practice.id} practice={module.practice} /> : null}
      </div>
    </article>
  </section>
}
