/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { markProgress } from '../../../progress'
import type { LessonStep } from './goldenLessonModel'
import { lessonStepToLearningStage, readPaperLessonProgress, savePaperLessonStep } from './paperLessonProgress'

type Go = (page: string, options?: Record<string, string>) => void

type PaperLessonContextValue = {
  paperId: string
  initialStep: LessonStep
  nextPaperId?: string
  goToNext: () => void
  goToHub: () => void
}

const PaperLessonContext = createContext<PaperLessonContextValue | null>(null)

export function PaperLessonProvider({ paperId, nextPaperId, go, children }: {
  paperId: string
  nextPaperId?: string
  go: Go
  children: ReactNode
}) {
  const value = useMemo<PaperLessonContextValue>(() => ({
    paperId,
    nextPaperId,
    initialStep: readPaperLessonProgress()[paperId]?.step ?? 1,
    goToNext: () => nextPaperId ? go('paper-lab', { paper: nextPaperId }) : go('paper-lab'),
    goToHub: () => go('paper-lab'),
  }), [go, nextPaperId, paperId])
  return <PaperLessonContext.Provider value={value}>{children}</PaperLessonContext.Provider>
}

export function usePaperLesson() {
  const context = useContext(PaperLessonContext)
  if (!context) throw new Error('usePaperLesson 必须在 PaperLessonProvider 内使用')
  return context
}

export function usePaperLessonProgress(step: LessonStep) {
  const { paperId } = usePaperLesson()
  useEffect(() => {
    const completed = step === 5
    savePaperLessonStep(paperId, step, completed)
    markProgress(`paper-lab:${paperId}`, lessonStepToLearningStage(step))
  }, [paperId, step])
}
