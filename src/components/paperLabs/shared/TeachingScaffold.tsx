import { useState, type ReactNode } from 'react'
import { ArrowRight, BriefcaseBusiness, Check, Circle, Info, Lightbulb, ListChecks } from 'lucide-react'
import { getTeachingTaskCompletion, type TeachingTaskState } from './teaching'

export type TeachingTerm = {
  term: string
  meaning: string
  direction?: string
}

type Props = {
  story: { actor: string; challenge: string; question: string }
  tasks: [string, string, string]
  taskState: Omit<TeachingTaskState, 'inspectedResult'>
  terms: TeachingTerm[]
  controls: ReactNode
  results: ReactNode
  explanation: ReactNode
  transfer: { metric: string; guardrail: string; action: string }
  boundary: string
}

export function TeachingScaffold({ story, tasks, taskState, terms, controls, results, explanation, transfer, boundary }: Props) {
  const [inspectedResult, setInspectedResult] = useState(false)
  const completion = getTeachingTaskCompletion({ ...taskState, inspectedResult })
  return (
    <div className='paper-teaching-flow'>
      <section className='paper-story-card' aria-labelledby='paper-story-title'>
        <span className='paper-section-kicker'>先故事 · 30 秒业务情境</span>
        <h2 id='paper-story-title'>{story.actor}</h2>
        <p>{story.challenge}</p>
        <strong>这次只回答一个问题：{story.question}</strong>
      </section>

      <section className='paper-operation-card' aria-labelledby='paper-operation-title'>
        <div className='paper-section-heading'>
          <div><span className='paper-section-kicker'>再操作</span><h2 id='paper-operation-title'>照着 3 步做，不用先懂公式</h2></div>
          <span className={completion.done ? 'task-progress is-done' : 'task-progress'}>{completion.completed}/{completion.total} 步完成</span>
        </div>
        <ol className='paper-task-list'>{tasks.map((task, index) => {
          const done = completion.steps[index]
          return <li className={done ? 'is-done' : ''} key={task}>{done ? <Check aria-hidden='true' /> : <Circle aria-hidden='true' />}<span><b>{index + 1}</b>{task}</span></li>
        })}</ol>
        <aside className='paper-term-card' aria-label='术语卡'>
          <div><Info aria-hidden='true' /><strong>术语卡 · 控件人话翻译</strong></div>
          <dl>{terms.map((item) => <div key={item.term}><dt>{item.term}</dt><dd>{item.meaning}{item.direction ? <small>{item.direction}</small> : null}</dd></div>)}</dl>
        </aside>
        {controls}
      </section>

      <section className='paper-change-card' aria-labelledby='paper-change-title'>
        <div className='paper-section-heading'>
          <div><span className='paper-section-kicker'>看变化</span><h2 id='paper-change-title'>基线 vs 当前：旋钮到底改变了什么</h2></div>
          <button type='button' className={inspectedResult ? 'paper-inspect-button is-done' : 'paper-inspect-button'} disabled={!taskState.changedKnob} onClick={() => setInspectedResult(true)}>{inspectedResult ? <Check aria-hidden='true' /> : null}{inspectedResult ? '已看完对比' : '我看完对比了'}</button>
        </div>
        {results}
      </section>

      <section className='paper-why-card' aria-labelledby='paper-why-title'>
        <div><Lightbulb aria-hidden='true' /><span><span className='paper-section-kicker'>解释为什么</span><h2 id='paper-why-title'>把结果连成“因为…所以…”</h2></span></div>
        {explanation}
      </section>

      <section className='paper-transfer-card' aria-labelledby='paper-transfer-title'>
        <div><BriefcaseBusiness aria-hidden='true' /><span><span className='paper-section-kicker'>带回业务</span><h2 id='paper-transfer-title'>先写上线模板，再谈放量</h2></span></div>
        <div className='paper-transfer-grid'>
          <article><span>主指标</span><p>{transfer.metric}</p></article>
          <article><span>切片 / 守护规则</span><p>{transfer.guardrail}</p></article>
          <article><span>灰度 / 回退动作</span><p>{transfer.action}</p></article>
        </div>
      </section>

      <aside className='paper-simplification-boundary'><Info aria-hidden='true' /><p><b>边界提示：</b>{boundary} 这是机制教学简化，不等于完整训练复现，也不代表生产性能。</p></aside>
    </div>
  )
}

export function ComparisonGrid({ children }: { children: ReactNode }) {
  return <div className='paper-comparison-grid'>{children}</div>
}

type ComparisonProps = {
  label: string
  baseline: string
  current: string
  delta?: string
  hint?: string
}

export function ComparisonMetric({ label, baseline, current, delta, hint }: ComparisonProps) {
  return (
    <article className='paper-comparison-metric'>
      <span>{label}</span>
      <div><small>基线</small><strong>{baseline}</strong><ArrowRight aria-hidden='true' /><small>当前</small><strong>{current}</strong></div>
      {delta ? <em>{delta}</em> : null}
      {hint ? <p>{hint}</p> : null}
    </article>
  )
}

export function MechanismChain({ steps }: { steps: { label: string; value: ReactNode; tone?: string }[] }) {
  return <div className='paper-mechanism-chain'>{steps.map((step, index) => <div className={step.tone ?? ''} key={step.label}><span>{step.label}</span><strong>{step.value}</strong>{index < steps.length - 1 ? <ArrowRight aria-hidden='true' /> : null}</div>)}</div>
}

export function TrajectoryStatus({ children }: { children: ReactNode }) {
  return <div className='paper-trajectory-status'><ListChecks aria-hidden='true' />{children}</div>
}
