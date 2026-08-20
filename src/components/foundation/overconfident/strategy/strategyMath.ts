export type MixPart = { label: string; value: number }

export type ColdStartControls = {
  threshold: number
  exploration: 0 | 0.1 | 0.2
  guarantee: boolean
}

export type ReachControls = {
  threshold: number
  frequency: 1 | 2
  newAuthorQuota: 0.2 | 0.4
}

export type RiskControls = {
  reviewStart: number
  directLimit: number
  reviewBudget: 200 | 500
  softProtection: boolean
}

type RateBucket = { score: number; count: number; rate: number }

type ReachBucket = RateBucket & { newAuthorShare: number }
type RiskBucket = RateBucket & { highValueShare: number }

export const COLD_START_BUCKETS: RateBucket[] = [
  { score: 0.9, count: 20, rate: 0.6 },
  { score: 0.7, count: 80, rate: 0.25 },
  { score: 0.5, count: 200, rate: 0.06 },
  { score: 0.3, count: 300, rate: 0.03 },
  { score: 0.1, count: 400, rate: 0.01 },
]

export const REACH_BUCKETS: ReachBucket[] = [
  { score: 0.95, count: 500, rate: 0.18, newAuthorShare: 0.2 },
  { score: 0.8, count: 2500, rate: 0.06, newAuthorShare: 0.35 },
  { score: 0.6, count: 8000, rate: 0.02, newAuthorShare: 0.5 },
  { score: 0.4, count: 14000, rate: 0.01, newAuthorShare: 0.65 },
  { score: 0.15, count: 25000, rate: 0.004, newAuthorShare: 0.75 },
]

export const RISK_BUCKETS: RiskBucket[] = [
  { score: 0.95, count: 50, rate: 0.4, highValueShare: 0.1 },
  { score: 0.8, count: 200, rate: 0.12, highValueShare: 0.2 },
  { score: 0.6, count: 800, rate: 0.02, highValueShare: 0.3 },
  { score: 0.4, count: 2000, rate: 0.008, highValueShare: 0.4 },
  { score: 0.15, count: 6950, rate: 0.002, highValueShare: 0.5 },
]

export const DEFAULT_COLD_START: ColdStartControls = { threshold: 0.7, exploration: 0.1, guarantee: true }
export const DEFAULT_REACH: ReachControls = { threshold: 0.7, frequency: 1, newAuthorQuota: 0.2 }
export const DEFAULT_RISK: RiskControls = { reviewStart: 0.5, directLimit: 0.8, reviewBudget: 200, softProtection: true }

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)
const round = (value: number) => Math.round(value * 100) / 100

export function offlineBinaryCrossEntropy(buckets: RateBucket[]) {
  const total = sum(buckets.map((bucket) => bucket.count))
  return sum(buckets.map((bucket) => {
    const probability = Math.min(1 - 1e-9, Math.max(1e-9, bucket.score))
    return -bucket.count * (bucket.rate * Math.log(probability) + (1 - bucket.rate) * Math.log(1 - probability))
  })) / total
}

export function calculateColdStart(controls: ColdStartControls) {
  const expandedCount = sum(COLD_START_BUCKETS.filter((bucket) => bucket.score >= controls.threshold).map((bucket) => bucket.count))
  const unexpandedCount = 1000 - expandedCount
  const guaranteeCoverage = controls.guarantee && unexpandedCount > 0 ? Math.min(1, 150 / unexpandedCount) : 0
  const unexpandedCoverage = Math.min(1, controls.exploration + guaranteeCoverage)
  let exposed = 0
  let found = 0
  let expandedQuality = 0
  const feedbackByBand = { high: 0, middle: 0, low: 0 }

  for (const bucket of COLD_START_BUCKETS) {
    const expanded = bucket.score >= controls.threshold
    const coverage = expanded ? 1 : unexpandedCoverage
    const bucketExposed = bucket.count * coverage
    const bucketQuality = bucketExposed * bucket.rate
    exposed += bucketExposed
    found += bucketQuality
    if (expanded) expandedQuality += bucket.count * bucket.rate
    if (bucket.score >= 0.7) feedbackByBand.high += bucketExposed
    else if (bucket.score >= 0.3) feedbackByBand.middle += bucketExposed
    else feedbackByBand.low += bucketExposed
  }

  const totalQuality = sum(COLD_START_BUCKETS.map((bucket) => bucket.count * bucket.rate))
  const unexpandedLowQuality = unexpandedCount - (totalQuality - expandedQuality)
  return {
    expandedCount,
    exposed: round(exposed),
    found: round(found),
    missed: round(totalQuality - found),
    wasted: round(exposed - found),
    midLowFeedbackShare: round(((feedbackByBand.middle + feedbackByBand.low) / exposed) * 100),
    thresholdAccuracy: round(((expandedQuality + unexpandedLowQuality) / 1000) * 100),
    opportunityCost: round(totalQuality - found),
    feedbackMix: [
      { label: '高分（0.7+）', value: feedbackByBand.high },
      { label: '中分（0.3–0.5）', value: feedbackByBand.middle },
      { label: '低分（0.1）', value: feedbackByBand.low },
    ] satisfies MixPart[],
  }
}

type ReachSelection = { bucket: ReachBucket; newAuthors: number; matureAuthors: number }

export function calculateReach(controls: ReachControls) {
  const selected: ReachSelection[] = REACH_BUCKETS
    .filter((bucket) => bucket.score >= controls.threshold)
    .map((bucket) => ({
      bucket,
      newAuthors: bucket.count * bucket.newAuthorShare,
      matureAuthors: bucket.count * (1 - bucket.newAuthorShare),
    }))
  const reached = sum(selected.map((item) => item.newAuthors + item.matureAuthors))
  let newAuthors = sum(selected.map((item) => item.newAuthors))
  let replacements = Math.max(0, reached * controls.newAuthorQuota - newAuthors)

  const sources = REACH_BUCKETS.filter((bucket) => bucket.score < controls.threshold)
  const matureTargets = [...selected].sort((a, b) => a.bucket.score - b.bucket.score)
  for (const source of sources) {
    let availableNew = source.count * source.newAuthorShare
    for (const target of matureTargets) {
      if (replacements <= 0 || availableNew <= 0) break
      const moved = Math.min(replacements, availableNew, target.matureAuthors)
      if (moved <= 0) continue
      target.matureAuthors -= moved
      selected.push({ bucket: source, newAuthors: moved, matureAuthors: 0 })
      newAuthors += moved
      replacements -= moved
      availableNew -= moved
    }
  }

  const firstConversions = sum(selected.map((item) => (item.newAuthors + item.matureAuthors) * item.bucket.rate))
  const expectedConversions = firstConversions * (controls.frequency === 2 ? 1.3 : 1)
  const contactCost = reached * controls.frequency
  const netRevenue = expectedConversions * 80 - contactCost
  const actualNewAuthors = sum(selected.map((item) => item.newAuthors))
  const matureAuthors = reached - actualNewAuthors

  return {
    reached: round(reached),
    expectedConversions: round(expectedConversions),
    netRevenue: round(netRevenue),
    newAuthors: round(actualNewAuthors),
    newAuthorShare: round((actualNewAuthors / reached) * 100),
    frequencyCost: round(contactCost),
    feedbackMix: [
      { label: '新作者', value: actualNewAuthors },
      { label: '成熟作者', value: matureAuthors },
    ] satisfies MixPart[],
  }
}

export function normalizeRiskControls(controls: RiskControls): RiskControls {
  const reviewStart = Math.min(0.7, Math.max(0.3, round(controls.reviewStart)))
  const directLimit = Math.min(0.9, Math.max(round(reviewStart + 0.1), round(controls.directLimit)))
  return { ...controls, reviewStart, directLimit }
}

export function calculateRisk(input: RiskControls) {
  const controls = normalizeRiskControls(input)
  const direct = RISK_BUCKETS.filter((bucket) => bucket.score >= controls.directLimit)
  const reviewCandidates = RISK_BUCKETS.filter((bucket) => bucket.score >= controls.reviewStart && bucket.score < controls.directLimit)
  let budget = controls.reviewBudget
  const reviewed = reviewCandidates.map((bucket) => {
    const count = Math.min(bucket.count, budget)
    budget -= count
    return { bucket, count }
  })

  const directCount = sum(direct.map((bucket) => bucket.count))
  const reviewCount = sum(reviewed.map((item) => item.count))
  const directRisk = sum(direct.map((bucket) => bucket.count * bucket.rate))
  const reviewedRisk = sum(reviewed.map((item) => item.count * item.bucket.rate))
  const totalRisk = sum(RISK_BUCKETS.map((bucket) => bucket.count * bucket.rate))
  const allowedRisk = totalRisk - directRisk - reviewedRisk / 2

  let falseLimitCost = 0
  let highValueHarm = 0
  let protectionResourceCost = 0
  for (const bucket of direct) {
    const normal = bucket.count * (1 - bucket.rate)
    const highValueNormal = normal * bucket.highValueShare
    const ordinaryNormal = normal - highValueNormal
    falseLimitCost += ordinaryNormal * 30 + highValueNormal * (controls.softProtection ? 30 : 60)
    highValueHarm += highValueNormal
    if (controls.softProtection) protectionResourceCost += highValueNormal
  }

  let reviewFalseLimitCost = 0
  for (const item of reviewed) {
    const normalErrors = item.count * (1 - item.bucket.rate) / 2
    const highValueErrors = normalErrors * item.bucket.highValueShare
    reviewFalseLimitCost += (normalErrors - highValueErrors) * 30 + highValueErrors * 60
    highValueHarm += highValueErrors
  }

  const reviewResourceCost = reviewCount * 2
  const totalCost = allowedRisk * 100 + falseLimitCost + reviewFalseLimitCost + reviewResourceCost + protectionResourceCost
  const releasedRisk = totalRisk - directRisk - reviewedRisk
  const expectedErrors = releasedRisk + sum(direct.map((bucket) => bucket.count * (1 - bucket.rate))) +
    sum(reviewed.map((item) => item.count / 2))

  return {
    controls,
    directCount: round(directCount),
    reviewCount: round(reviewCount),
    allowedRisk: round(allowedRisk),
    totalCost: round(totalCost),
    highValueHarm: round(highValueHarm),
    accuracy: round((1 - expectedErrors / 10000) * 100),
    feedbackMix: reviewed.filter((item) => item.count > 0).map((item) => ({
      label: `${item.bucket.score.toFixed(1)} 分桶`,
      value: item.count,
    })) satisfies MixPart[],
  }
}
