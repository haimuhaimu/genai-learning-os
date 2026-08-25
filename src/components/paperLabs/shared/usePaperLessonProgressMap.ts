import { useEffect, useState } from 'react'
import { PAPER_LESSON_PROGRESS_EVENT, readPaperLessonProgress, type PaperLessonProgress } from './paperLessonProgress'

export function usePaperLessonProgressMap() {
  const [progress, setProgress] = useState<PaperLessonProgress>(() => readPaperLessonProgress())
  useEffect(() => {
    const sync = () => setProgress(readPaperLessonProgress())
    window.addEventListener(PAPER_LESSON_PROGRESS_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(PAPER_LESSON_PROGRESS_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  return progress
}
