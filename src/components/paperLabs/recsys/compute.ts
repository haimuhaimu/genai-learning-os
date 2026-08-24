import { round, sigmoid } from '../shared/math.ts'

export type WideDeepMode = 'wide' | 'deep' | 'joint'
export type WideDeepInput = { mode: WideDeepMode; deepWeight: number }

const samples = [
  { id: 'popular', label: '热门重复组合', slice: '热门', wide: 2.1, deep: 0.5, target: 1 },
  { id: 'cold', label: '冷启动新组合', slice: '冷启动', wide: -0.4, deep: 1.5, target: 1 },
  { id: 'tail', label: '长尾相似兴趣', slice: '长尾', wide: 0.2, deep: 1.1, target: 1 },
] as const

export function wideDeepCompute(input: WideDeepInput) {
  const deepWeight = Math.max(0, Math.min(2, input.deepWeight))
  const rows = samples.map((sample) => {
    const wideContribution = input.mode === 'deep' ? 0 : sample.wide
    const deepContribution = input.mode === 'wide' ? 0 : sample.deep * deepWeight
    const logit = wideContribution + deepContribution - 1
    return { ...sample, wideContribution: round(wideContribution), deepContribution: round(deepContribution), probability: round(sigmoid(logit), 6) }
  })
  const slices = rows.map((row) => ({ slice: row.slice, probability: row.probability, passesGate: row.probability >= 0.5 }))
  return { mode: input.mode, deepWeight: round(deepWeight), rows, slices }
}
