import type { LucideIcon } from 'lucide-react'
import { ArrowRight, Bot, CheckCircle2, Image, Network, Orbit, PackageOpen, RotateCcw, Search, Shuffle } from 'lucide-react'
import type { PaperLabDefinition, PaperLabVisual } from './paperLabsRegistry'
import { getPaperLessonCta, type PaperLessonRecord } from './shared/paperLessonProgress'

const visualIcons: Record<PaperLabVisual, LucideIcon> = {
  evidence: Search,
  distillation: PackageOpen,
  recommendation: Shuffle,
  diffusion: Image,
  agent: Bot,
  world: Orbit,
  experts: Network,
}

type Props = {
  lab: PaperLabDefinition
  record?: PaperLessonRecord
  onOpen: () => void
}

export default function PaperLabCard({ lab, record, onOpen }: Props) {
  const Icon = visualIcons[lab.visual]
  const completed = record?.completed === true
  const status = completed ? '已通关' : record ? `进行到 ${record.step}/5` : '未开始'

  return (
    <li className={completed ? 'case-course-card is-done' : 'case-course-card'} data-tone={lab.tone}>
      <div className='case-course-visual' aria-hidden='true'>
        <Icon />
        <span><i /><i /><i /></span>
      </div>
      <div className='case-course-content'>
        <header>
          <span className='case-course-number'>CASE {String(lab.order).padStart(2, '0')}</span>
          <span className='case-course-status'>{completed ? <CheckCircle2 aria-hidden='true' /> : null}{status}</span>
        </header>
        <h3>{lab.shortTitle}</h3>
        <p>{lab.cardSummary}</p>
        <div className='case-course-mechanic' aria-label={`本课只调${lab.signal}，目标是${lab.outcome}`}>
          <span>{lab.signal}</span><ArrowRight aria-hidden='true' /><strong>{lab.outcome}</strong>
        </div>
        <ul className='case-course-skills' aria-label='本课能力标签'>
          {lab.skills.map((skill) => <li key={skill}>{skill}</li>)}
        </ul>
        <button type='button' onClick={onOpen}>
          {completed ? <RotateCcw aria-hidden='true' /> : <ArrowRight aria-hidden='true' />}
          {getPaperLessonCta(record)}
        </button>
      </div>
    </li>
  )
}
