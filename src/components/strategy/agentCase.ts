import { defineStrategyCase } from './defineStrategyCase.ts'
import type { ControlValues, DecisionEvidence, DecisionSummary } from './types'

type TicketBucket = { risk: number; count: number; eligible: number; amount: number; evidence: number }
export const REFUND_DATA: TicketBucket[] = [
  { risk: .15, count: 180, eligible: .96, amount: 28, evidence: .98 },
  { risk: .35, count: 130, eligible: .90, amount: 52, evidence: .91 },
  { risk: .55, count: 85, eligible: .79, amount: 96, evidence: .80 },
  { risk: .75, count: 50, eligible: .62, amount: 180, evidence: .67 },
  { risk: .92, count: 25, eligible: .38, amount: 420, evidence: .48 },
]
export const DEFAULT_AGENT = { gate: 'threshold', threshold: .6, explain: true } as const

export function calculateAgent(controls: ControlValues): DecisionEvidence {
  const gate = String(controls.gate)
  const threshold = Number(controls.threshold)
  const explain = Boolean(controls.explain)
  let falseRefunds = 0
  let delayed = 0
  let manual = 0
  let totalDuration = 0
  let total = 0
  let businessCost = 0
  for (const bucket of REFUND_DATA) {
    const needsGate = gate === 'double' || (gate === 'threshold' && bucket.risk >= threshold)
    const confirmationReduction = gate === 'double' ? .75 : needsGate ? .52 : 0
    const baseFalse = bucket.count * (1 - bucket.eligible) * (1 - bucket.evidence) * (1 - confirmationReduction)
    const delayedCount = needsGate ? bucket.count * bucket.eligible * (gate === 'double' ? .09 : .045) : bucket.count * bucket.eligible * .012
    const duration = 18 + (needsGate ? gate === 'double' ? 60 : 32 : 0) + (explain ? 5 : 0)
    falseRefunds += baseFalse
    delayed += delayedCount
    manual += needsGate ? bucket.count : 0
    totalDuration += duration * bucket.count
    total += bucket.count
    businessCost += baseFalse * bucket.amount * 1.5 + delayedCount * 8 + (needsGate ? bucket.count * 2 : 0)
  }
  const complaintRisk = falseRefunds * (explain ? .8 : 1)
  businessCost += complaintRisk * 12
  const action = falseRefunds > 2 ? '补工具调用、证据完整性与幂等轨迹标注' : '保留门策略，并补高风险拒绝与确认 trace'
  return {
    metrics: [
      { id: 'falseRefunds', label: '预计误退', value: falseRefunds, display: `${falseRefunds.toFixed(2)} 单`, emphasis: true },
      { id: 'delayed', label: '漏退 / 延迟', value: delayed, display: `${delayed.toFixed(1)} 单` },
      { id: 'manual', label: '人工介入率', value: manual / total * 100, display: `${(manual / total * 100).toFixed(1)}%` },
      { id: 'duration', label: '平均处理时长', value: totalDuration / total, display: `${(totalDuration / total).toFixed(1)} 秒` },
      { id: 'cost', label: '综合业务成本', value: businessCost, display: `¥${businessCost.toFixed(0)}` },
    ],
    costs: [
      { label: '误退成本', value: `¥${(businessCost - delayed * 8 - manual * 2).toFixed(0)}`, note: '按退款额 × 1.5，并计入客诉风险' },
      { label: '人工确认', value: `¥${(manual * 2).toFixed(0)}` },
      { label: '延迟成本', value: `¥${(delayed * 8).toFixed(0)}` },
    ],
    feedbackSource: '工具 trace 记录资格证据、确认结果、幂等键与退款副作用；只看模型建议无法发现重复执行。',
    feedbackSignals: [`${manual.toFixed(0)} 单经过确认`, `解释开关使客诉风险${explain ? '下降 20%' : '保持基线'}`],
    nextTrainingAction: action,
    caution: '确认门治理的是工具副作用正确性，不等同于提升模型建议正确率；幂等与规则不能只靠换模型解决。',
  }
}

export function summarizeAgent(controls: ControlValues, evidence: DecisionEvidence): DecisionSummary {
  const metric = Object.fromEntries(evidence.metrics.map((item) => [item.id, item.display]))
  return { text: `退款工具策略：确认门采用 ${controls.gate}，风险阈值 ${Number(controls.threshold).toFixed(1)}，先解释后行动${controls.explain ? '开启' : '关闭'}。综合成本 ${metric.cost}，平均处理 ${metric.duration}。下一轮补充：${evidence.nextTrainingAction}，并把规则与幂等结果保留在 trace。`, nextAction: evidence.nextTrainingAction }
}

export const agentSpec = defineStrategyCase({
  id: 'refund-gate', routeId: 'agent', routeLabel: 'Agent', title: '退款工具：什么时候必须经过确认门？', question: '自动退款的速度，值得承担多大的工具副作用风险？', duration: '预计 3–5 分钟',
  background: '自动退款能缩短处理时间，但一次重复退款或证据不足的误退，可能比多等一次确认更贵。',
  feedback: '反馈来自工具 trace、资格证据、确认结果与幂等键；模型建议本身不足以证明副作用正确。',
  controls: [
    { id: 'gate', label: '确认门', type: 'choice', options: [{ value: 'none', label: 'none' }, { value: 'threshold', label: 'threshold' }, { value: 'double', label: 'double' }] },
    { id: 'threshold', label: '风险阈值', type: 'range', min: .3, max: .9, step: .1, format: 'decimal' },
    { id: 'explain', label: '先解释后行动', type: 'toggle', detail: '客诉风险降低 20%，处理增加 5 秒' },
  ], defaults: DEFAULT_AGENT, fixedDataTitle: '20 类工单的 5 桶聚合',
  fixedDataRows: ['低风险 180 单：资格率 96%，证据完整率 98%', '中风险 215 单：平均金额 ¥52–96', '高风险 75 单：资格率 38%–62%，平均金额 ¥180–420'],
  compute: calculateAgent, summarize: summarizeAgent,
})
