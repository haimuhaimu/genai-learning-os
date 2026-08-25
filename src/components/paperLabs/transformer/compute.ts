import { dot, round, softmax } from '../shared/math.ts'

export type AttentionInput = { queryPosition: number; scaleDivisor: number; causal: boolean }

const tokens = ['退款问题', '扣款未到账', '是否退款', '重复扣款'] as const
const embeddings = [[1, 0, 1], [0, 1, 1], [1, 1, 0], [0.2, 0.2, 0.2]]
const queryWeights = [[1, 0, 0], [0, 0.8, 0], [0, 0, 1]]
const keyWeights = [[0.8, 0, 0.2], [0, 1, 0], [0.2, 0, 0.8]]
const valueWeights = [[1, 0.2, 0], [0, 1, 0.2], [0.2, 0, 1]]

function multiply(vector: readonly number[], matrix: readonly number[][]) {
  return matrix[0].map((_, column) => matrix.reduce((sum, row, index) => sum + row[column] * (vector[index] ?? 0), 0))
}

export function attentionCompute(input: AttentionInput) {
  const queryPosition = Math.max(0, Math.min(tokens.length - 1, Math.round(input.queryPosition)))
  const divisor = Math.max(0.25, input.scaleDivisor)
  const queries = embeddings.map((embedding) => multiply(embedding, queryWeights))
  const keys = embeddings.map((embedding) => multiply(embedding, keyWeights))
  const values = embeddings.map((embedding) => multiply(embedding, valueWeights))
  const rawScores = keys.map((key, index) => input.causal && index > queryPosition ? Number.NEGATIVE_INFINITY : dot(queries[queryPosition], key) / divisor)
  const visibleScores = rawScores.map((score) => Number.isFinite(score) ? score : -1e9)
  const weights = softmax(visibleScores)
  const output = values[0].map((_, dimension) => weights.reduce((sum, weight, index) => sum + weight * values[index][dimension], 0))
  return {
    tokens,
    queryPosition,
    scores: rawScores.map((value) => Number.isFinite(value) ? round(value) : null),
    weights: weights.map((value) => round(value, 6)),
    output: output.map((value) => round(value)),
  }
}
