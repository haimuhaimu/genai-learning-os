export type DecisionBriefCalculation = {
  label: string
  question: string
  formula: string
  values: number[]
  method: 'multiply' | 'divide' | 'subtract' | 'sum' | 'kd-loss' | 'percent-reduction'
  unit: string
  precision: number
  tolerance: number
}

export function computeDecisionBriefAnswer(calculation: DecisionBriefCalculation) {
  const { method, values } = calculation
  if (method === 'multiply') return values.reduce((total, value) => total * value, 1)
  if (method === 'divide') return values.slice(1).reduce((total, value) => total / value, values[0] ?? 0)
  if (method === 'subtract') return values.slice(1).reduce((total, value) => total - value, values[0] ?? 0)
  if (method === 'sum') return values.reduce((total, value) => total + value, 0)
  if (method === 'kd-loss') {
    const [alpha = 0, crossEntropy = 0, temperature = 0, kl = 0] = values
    return alpha * crossEntropy + (1 - alpha) * temperature ** 2 * kl
  }
  if (method === 'percent-reduction') {
    const [baseline = 0, current = 0] = values
    return baseline === 0 ? 0 : ((baseline - current) / baseline) * 100
  }
  throw new Error(`未知 Decision Brief 计算方法：${String(method)}`)
}

export type DecisionBriefTemplate = {
  decision: string
  metrics: string
  gate: string
  nextStep: string
}

export function buildDecisionBrief(
  practice: { id: string; businessInput: string; calculation: Pick<DecisionBriefCalculation, 'precision' | 'unit' | 'label'> },
  draft: DecisionBriefTemplate,
  answer: number,
) {
  return [
    `# Decision Brief｜${practice.id}`,
    `业务输入：${practice.businessInput}`,
    `计算：${practice.calculation.label} = ${answer.toFixed(practice.calculation.precision)}${practice.calculation.unit}`,
    `决策：${draft.decision}`,
    `指标：${draft.metrics}`,
    `闸门：${draft.gate}`,
    `下一步：${draft.nextStep}`,
  ].join('\n')
}
