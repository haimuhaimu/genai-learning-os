import type { ReactNode, Ref } from 'react'
import { ChevronRight, Library } from 'lucide-react'
import { GOLDEN_LESSON_STEPS, type LessonStep } from './goldenLessonModel'
import { usePaperLesson, usePaperLessonProgress } from './PaperLessonContext'

export function StepHeader({ step, eyebrow, title }: { step: LessonStep; eyebrow: string; title: string }) {
  return (
    <header className='golden-lesson-header'>
      <div className='golden-lesson-meta'><span>{step}/5 · {GOLDEN_LESSON_STEPS[step - 1]}</span><span>约 5 分钟</span></div>
      <div className='golden-progress' aria-label={`课程进度：第 ${step} 关，共 5 关`}>
        {GOLDEN_LESSON_STEPS.map((label, index) => <i aria-hidden='true' key={label} className={index < step ? 'is-active' : ''} />)}
      </div>
      <p>{eyebrow}</p><h1>{title}</h1>
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
