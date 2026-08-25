export const GOLDEN_LESSON_STEPS = [
  '先猜',
  '看 AI 犯错',
  '只改一个人话变量',
  '自己总结规律',
  '揭示论文术语与最小公式',
] as const

export type LessonStep = 1 | 2 | 3 | 4 | 5

export function nextLessonStep(step: LessonStep): LessonStep {
  return Math.min(5, step + 1) as LessonStep
}
