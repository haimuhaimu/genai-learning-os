export type TeachingTaskState = {
  baselineReady: boolean
  changedKnob: boolean
  inspectedResult: boolean
}

export type BaselineComparison = {
  baseline: number
  current: number
  delta: number
  direction: 'up' | 'down' | 'same'
}

export function getTeachingTaskCompletion(state: TeachingTaskState) {
  const steps = [state.baselineReady, state.changedKnob, state.inspectedResult]
  const completed = steps.filter(Boolean).length
  return { completed, total: steps.length, done: completed === steps.length, steps }
}

export function compareBaseline(baseline: number, current: number): BaselineComparison {
  const delta = current - baseline
  return {
    baseline,
    current,
    delta,
    direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'same',
  }
}

export function becauseTherefore(reason: string, outcome: string) {
  return `因为${reason}，所以${outcome}。`
}
