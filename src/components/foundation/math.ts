export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min))

export function softmax(values: number[], temperature = 1) {
  const safeT = clamp(temperature, 0.1, 10)
  const safe = values.map((value) => clamp(value, -100, 100) / safeT)
  const max = Math.max(...safe)
  const exps = safe.map((value) => Math.exp(value - max))
  const sum = exps.reduce((acc, value) => acc + value, 0) || 1
  return exps.map((value) => value / sum)
}

export function entropy(values: number[]) {
  return -values.reduce((sum, value) => sum + (value > 0 ? value * Math.log(value) : 0), 0)
}

export function kl(p: number[], q: number[]) {
  return p.reduce((sum, value, index) => {
    const pi = Math.max(1e-9, value)
    const qi = Math.max(1e-9, q[index] ?? 1e-9)
    return sum + pi * Math.log(pi / qi)
  }, 0)
}

export function normalize(values: number[]) {
  const safe = values.map((value) => Math.max(0.001, Number.isFinite(value) ? value : 0.001))
  const sum = safe.reduce((acc, value) => acc + value, 0) || 1
  return safe.map((value) => value / sum)
}

export function hashNoise(...values: (number | string | boolean)[]) {
  let hash = 2166136261
  for (const char of values.join('|')) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return ((hash >>> 0) % 1000) / 1000
}

export const pct = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`
