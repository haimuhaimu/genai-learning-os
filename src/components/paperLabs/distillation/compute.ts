import { clamp, softmax } from '../shared/math.ts'

export const TEACHER_LOGITS = [3.2, 2.8, -0.5, -1.2] as const
export const STUDENT_LOGITS = [2.9, 3.1, -0.4, -1.0] as const
export const HARD_LABEL = 0
export const ALPHA = 0.5
export const MIN_TEMPERATURE = 0.5
export const MAX_TEMPERATURE = 8

export type DistillationGate = {
  status: 'learned-answer' | 'learned-boundary' | 'signal-too-flat'
  label: '学到了答案' | '学到了边界' | '信号摊得太平'
  canPass: boolean
  feedback: string
}

function entropy(distribution: readonly number[]) {
  return -distribution.reduce((sum, probability) => sum + probability * Math.log(probability), 0)
}

function klDivergence(reference: readonly number[], candidate: readonly number[]) {
  const value = reference.reduce((sum, probability, index) => (
    sum + probability * Math.log(probability / candidate[index])
  ), 0)
  return Math.max(0, value)
}

function getGate(temperature: number): DistillationGate {
  if (temperature < 1.5) return {
    status: 'learned-answer',
    label: '学到了答案',
    canPass: false,
    feedback: '先别上线：只强调最可能的答案，客服与审核边界仍不够清楚。',
  }
  if (temperature <= 3) return {
    status: 'learned-boundary',
    label: '学到了边界',
    canPass: true,
    feedback: '通关：答案优先级仍清楚，相近选项的边界也被保留下来。',
  }
  return {
    status: 'signal-too-flat',
    label: '信号摊得太平',
    canPass: false,
    feedback: '先别上线：选项差异被摊得太平，高风险请求应继续人工复核。',
  }
}

export function distillationCompute(input: { temperature: number }) {
  const finiteTemperature = Number.isFinite(input.temperature) ? input.temperature : 2
  const temperature = clamp(finiteTemperature, MIN_TEMPERATURE, MAX_TEMPERATURE)
  const teacherDistribution = softmax(TEACHER_LOGITS.map((logit) => logit / temperature))
  const studentDistribution = softmax(STUDENT_LOGITS.map((logit) => logit / temperature))
  const hardStudentDistribution = softmax(STUDENT_LOGITS)
  const crossEntropy = -Math.log(hardStudentDistribution[HARD_LABEL])
  const rawKl = klDivergence(teacherDistribution, studentDistribution)
  const scaledKdTerm = temperature ** 2 * rawKl
  const totalLoss = ALPHA * crossEntropy + (1 - ALPHA) * scaledKdTerm

  return {
    temperature,
    teacherLogits: TEACHER_LOGITS,
    studentLogits: STUDENT_LOGITS,
    hardLabel: HARD_LABEL,
    alpha: ALPHA,
    teacherDistribution,
    studentDistribution,
    entropy: {
      teacher: entropy(teacherDistribution),
      student: entropy(studentDistribution),
    },
    crossEntropy,
    rawKl,
    scaledKdTerm,
    totalLoss,
    gate: getGate(temperature),
  }
}
