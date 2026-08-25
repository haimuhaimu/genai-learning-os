export const MIN_BALANCE_CONCERN = 0
export const MAX_BALANCE_CONCERN = 10
export const EXPERT_CAPACITY = 3

export const EXPERTS = [
  { id: 'refund', label: '退款专席', baseLatency: 120, unitCost: 0.010 },
  { id: 'policy', label: '政策专席', baseLatency: 135, unitCost: 0.011 },
  { id: 'code', label: '代码专席', baseLatency: 150, unitCost: 0.014 },
  { id: 'search', label: '检索专席', baseLatency: 110, unitCost: 0.009 },
] as const

export const REQUESTS = [
  ['R01', 0, [.95, .68, .42, .55]], ['R02', 1, [.42, .94, .38, .62]],
  ['R03', 0, [.94, .70, .40, .58]], ['R04', 2, [.40, .52, .96, .60]],
  ['R05', 0, [.93, .72, .38, .62]], ['R06', 3, [.36, .58, .55, .95]],
  ['R07', 0, [.92, .71, .50, .64]], ['R08', 1, [.45, .93, .48, .61]],
  ['R09', 0, [.91, .69, .55, .66]], ['R10', 2, [.43, .50, .94, .63]],
  ['R11', 0, [.90, .73, .52, .67]], ['R12', 1, [.46, .92, .44, .65]],
] as const

export type Assignment = {
  requestId: string
  expectedExpert: number
  expertIndex: number | null
  dropped: boolean
  qualityHit: boolean
  latency: number
}

export type MoeGate = 'Go' | 'Hold' | 'No-Go'

const clamp = (value: number) => Math.max(MIN_BALANCE_CONCERN, Math.min(MAX_BALANCE_CONCERN, Number.isFinite(value) ? value : 0))

export function moeCompute(balanceConcern: number) {
  const lambda = clamp(balanceConcern)
  const loads = EXPERTS.map(() => 0)
  const assignments: Assignment[] = REQUESTS.map(([requestId, expectedExpert, scores]) => {
    const adjusted = scores.map((score, index) => score - lambda * 0.15 * ((loads[index] + 1) / EXPERT_CAPACITY) ** 2)
    const expertIndex = adjusted.indexOf(Math.max(...adjusted))
    if (loads[expertIndex] >= EXPERT_CAPACITY) {
      return { requestId, expectedExpert, expertIndex: null, dropped: true, qualityHit: false, latency: 1000 }
    }
    loads[expertIndex] += 1
    return {
      requestId,
      expectedExpert,
      expertIndex,
      dropped: false,
      qualityHit: expertIndex === expectedExpert,
      latency: EXPERTS[expertIndex].baseLatency + (loads[expertIndex] - 1) * 55,
    }
  })
  const dropped = assignments.filter((item) => item.dropped).length
  const qualityHits = assignments.filter((item) => item.qualityHit).length
  const latencies = assignments.map((item) => item.latency).sort((a, b) => a - b)
  const qualityHitRate = qualityHits / REQUESTS.length
  const dropRate = dropped / REQUESTS.length
  const utilization = loads.map((load, index) => ({ expertId: EXPERTS[index].id, label: EXPERTS[index].label, count: load, rate: load / EXPERT_CAPACITY }))
  const p95Latency = latencies[Math.ceil(latencies.length * 0.95) - 1]
  const costPer1k = assignments.reduce((sum, item) => sum + (item.dropped ? 0.02 : EXPERTS[item.expertIndex ?? 0].unitCost), 0) / REQUESTS.length * 1000
  let gate: MoeGate = 'Go'
  let feedback = '请求全部接住，匹配质量、时延和成本同时过线。'
  if (dropRate > 0.16) {
    gate = 'No-Go'; feedback = '热门专席爆仓，漏接请求超过上线红线。'
  } else if (dropRate > 0) {
    gate = 'Hold'; feedback = '仍有请求漏接，只能继续小流量调整。'
  } else if (qualityHitRate < 0.64) {
    gate = 'No-Go'; feedback = '虽然分得很平均，但太多请求去了不擅长的专席。'
  }
  return { lambda, assignments, qualityHitRate, dropRate, utilization, p95Latency, costPer1k, gate, feedback }
}
