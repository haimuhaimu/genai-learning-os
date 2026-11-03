import { ArrowRight, Compass } from 'lucide-react'
import { getNextStep, type PersonaId } from '../../learningPath'
import type { ProgressMap } from '../../progress'
import { journeyDestination, journeyLabel, journeyTitle } from '../../journeyResume'
import { useJourneyResume } from '../journey/useJourneyResume'

type Go = (page: string, options?: Record<string, string>) => void

type Props = {
  progress: ProgressMap
  persona: PersonaId
  go: Go
  compact?: boolean
}

export default function NextStepCard({ progress, persona, go, compact = false }: Props) {
  const next = getNextStep(progress, persona)
  const { current, needsChoice, status, temporary } = useJourneyResume()
  const title = current ? journeyTitle(current) : needsChoice ? '选择继续哪条路线' : next.title
  const resume = () => current ? go('routes', journeyDestination(current)) : needsChoice ? go('routes', { section: 'choose-journey' }) : go(next.page, next.options)
  return (
    <article className={`lo-next-step ${compact ? 'is-compact' : ''}`}>
      <div className='lo-next-icon'><Compass aria-hidden='true' /></div>
      <div className='lo-next-copy'>
        <span>{current || needsChoice ? '继续学习' : '下一步建议'}</span>
        <h2>{title}</h2>
        <p>{current ? <>已记录 {status.steps.filter(Boolean).length}/3 步。{status.complete ? '可以回顾实操与复盘；记录不代表能力认证。' : '回到这条路线，接着看机制、动手和复盘。'}</> : needsChoice ? '两条路线都有记录；先选想继续的一条，不按完成度替你决定。' : <><b>{next.eyebrow}</b>{next.description}</>}</p>
        {temporary && <p role='status'>本次选择未能保存，刷新后会回到原来的选择；学习记录没有改变。</p>}
      </div>
      <button type='button' onClick={resume}>
        {current ? `${status.complete ? '回顾' : '继续'}${journeyLabel(current)}` : needsChoice ? '选择学习路线' : '继续下一步'}<ArrowRight aria-hidden='true' />
      </button>
    </article>
  )
}
