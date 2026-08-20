import { ArrowRight, Compass } from 'lucide-react'
import { getNextStep, type PersonaId } from '../../learningPath'
import type { ProgressMap } from '../../progress'

type Go = (page: string, options?: Record<string, string>) => void

type Props = {
  progress: ProgressMap
  persona: PersonaId
  go: Go
  compact?: boolean
}

export default function NextStepCard({ progress, persona, go, compact = false }: Props) {
  const next = getNextStep(progress, persona)
  return (
    <article className={`lo-next-step ${compact ? 'is-compact' : ''}`}>
      <div className='lo-next-icon'><Compass aria-hidden='true' /></div>
      <div className='lo-next-copy'>
        <span>下一步建议</span>
        <h2>{next.title}</h2>
        <p><b>{next.eyebrow}</b>{next.description}</p>
      </div>
      <button type='button' onClick={() => go(next.page, next.options)}>
        继续下一步<ArrowRight aria-hidden='true' />
      </button>
    </article>
  )
}
