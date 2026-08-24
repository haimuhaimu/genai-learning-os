export function hashSeed(seed: string | number) {
  const text = String(seed)
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function seededRandom(seed: string | number) {
  let state = hashSeed(seed)
  return () => {
    state += 0x6D2B79F5
    let value = state
    value = Math.imul(value ^ value >>> 15, value | 1)
    value ^= value + Math.imul(value ^ value >>> 7, value | 61)
    return ((value ^ value >>> 14) >>> 0) / 4294967296
  }
}

export function seededNormal(seed: string | number) {
  const random = seededRandom(seed)
  return () => {
    const first = Math.max(random(), Number.EPSILON)
    const second = random()
    return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second)
  }
}
