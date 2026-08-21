import { ArrowLeft, Clock3 } from 'lucide-react'
import type { ReactNode } from 'react'
import type { StrategyCaseSpec } from './types'

const protocol = ['业务目标', '策略动作', '固定证据', '代价账本', '反馈可见性', '下一轮训练', '策略摘要']

type Props = { spec: StrategyCaseSpec; onExit: () => void; exitLabel?: string; children: ReactNode }

export default function StrategyCaseShell({ spec, onExit, exitLabel = '返回案例中心', children }: Props) {
  return (
    <section className='strategy-runner-page'>
      <header className='strategy-shell-head'>
        <button type='button' className='strategy-back' onClick={onExit}><ArrowLeft aria-hidden='true' />{exitLabel}</button>
        <div><span>{spec.routeLabel} · STRATEGY CASE</span><h1>{spec.title}</h1><p>{spec.background}</p></div>
        <small><Clock3 aria-hidden='true' />{spec.duration}</small>
      </header>
      <ol className='strategy-protocol' aria-label='策略学习结构'>{protocol.map((item, index) => <li key={item}><span>{item}</span>{index < protocol.length - 1 ? <i aria-hidden='true'>→</i> : null}</li>)}</ol>
      <section className='strategy-business-context'><span>业务决策问题</span><h2>{spec.question}</h2><p>以下结果来自固定教学数据；参数只改变策略选择、业务代价与可见反馈，不改变同一离线全集的模型指标。{spec.feedback}</p></section>
      {children}
    </section>
  )
}
