import type { ReactNode, Ref } from 'react'
import { BrainCircuit, Check, ChevronRight, FlaskConical, Library, Lightbulb, Sparkles, Target } from 'lucide-react'
import { GOLDEN_LESSON_STEPS, type LessonStep } from './goldenLessonModel'
import { usePaperLesson, usePaperLessonProgress } from './PaperLessonContext'

const stepIcons = [Target, BrainCircuit, FlaskConical, Lightbulb, Sparkles]
const shortLabels = ['先猜', '看犯错', '动旋钮', '找规律', '懂论文']

export function StepHeader({ step, eyebrow, title }: { step: LessonStep; eyebrow: string; title: string }) {
  return (
    <header className='golden-lesson-header'>
      <div className='golden-lesson-meta'><span>CASE MODE · 第 {step} 关</span><span>约 5 分钟</span></div>
      <ol className='golden-progress' aria-label={`课程进度：第 ${step} 关，共 5 关`}>
        {GOLDEN_LESSON_STEPS.map((label, index) => {
          const Icon = stepIcons[index]
          const state = index + 1 < step ? 'is-complete' : index + 1 === step ? 'is-current' : ''
          return (
            <li key={label} className={state} aria-current={index + 1 === step ? 'step' : undefined}>
              <span>{index + 1 < step ? <Check aria-hidden='true' /> : <Icon aria-hidden='true' />}</span>
              <small>{shortLabels[index]}</small>
            </li>
          )
        })}
      </ol>
      <div className='golden-title-lockup'><span>{eyebrow}</span><h1>{title}</h1></div>
    </header>
  )
}

export function ContinueButton({ onClick, disabled = false, children = '进入下一关' }: { onClick: () => void; disabled?: boolean; children?: ReactNode }) {
  return <button className='golden-primary-button' type='button' onClick={onClick} disabled={disabled}>{children}<ChevronRight aria-hidden='true' /></button>
}

export function GoldenLessonShell({ step, eyebrow, title, lessonRef, children }: {
  step: LessonStep
  eyebrow: string
  title: string
  lessonRef?: Ref<HTMLDivElement>
  children: ReactNode
}) {
  const { nextPaperId, goToNext, goToHub } = usePaperLesson()
  usePaperLessonProgress(step)
  return (
    <div className='golden-lesson' ref={lessonRef} tabIndex={-1}>
      <StepHeader step={step} eyebrow={eyebrow} title={title} />
      <main className='golden-stage' aria-live='polite'>
        {children}
        {step === 5 ? <nav className='paper-resource-actions' aria-label='课程完成后的下一步'>
          {nextPaperId ? <button type='button' onClick={goToNext}>下一课<ChevronRight aria-hidden='true' /></button> : null}
          <button type='button' onClick={goToHub}><Library aria-hidden='true' />返回案例课程目录</button>
        </nav> : null}
      </main>
    </div>
  )
}
