export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function round(value: number, digits = 4) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-value))
}

export function softmax(values: readonly number[]) {
  if (!values.length) return []
  const maximum = Math.max(...values)
  const exponents = values.map((value) => Math.exp(value - maximum))
  const total = exponents.reduce((sum, value) => sum + value, 0)
  return exponents.map((value) => value / total)
}

export function dot(left: readonly number[], right: readonly number[]) {
  return left.reduce((sum, value, index) => sum + value * (right[index] ?? 0), 0)
}
