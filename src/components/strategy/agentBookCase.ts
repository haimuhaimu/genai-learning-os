import { defineStrategyCase } from './defineStrategyCase.ts'
import type { ControlValues, DecisionEvidence, DecisionSummary } from './types'

type TaskRow = { type: string; share: number; single: number; gainWithSignal: number; token: number; latency: number; signal: 'none' | 'tool' | 'visual' | 'fact' }
export const NEW_INFO_DATA: TaskRow[] = [
  { type: '纯文本改写', share: .35, single: .91, gainWithSignal: .005, token: 700, latency: 620, signal: 'none' },
  { type: '需执行工具', share: .30, single: .66, gainWithSignal: .18, token: 1050, latency: 1200, signal: 'tool' },
  { type: '需视觉输入', share: .15, single: .48, gainWithSignal: .27, token: 900, latency: 1500, signal: 'visual' },
  { type: '需事实核验', share: .20, single: .62, gainWithSignal: .21, token: 980, latency: 1100, signal: 'fact' },
]
export const DEFAULT_AGENT_BOOK = { topology: 'single', rounds: 2, verifier: 'rule' } as const

export function calculateAgentBook(controls: ControlValues): DecisionEvidence {
  const topology = String(controls.topology)
  const rounds = Number(controls.rounds)
  const verifier = String(controls.verifier)
  const topologyFactor = topology === 'single' ? 0 : topology === 'parallel' ? .78 : .9
  const roundFactor = rounds === 1 ? .72 : rounds === 2 ? 1 : 1.08
  let success = 0
  let tokens = 0
  let weightedLatency = 0
  let duplicate = 0
  for (const task of NEW_INFO_DATA) {
    const verifierMatches = verifier === 'tool' && task.signal !== 'none' ? 1 : verifier === 'rule' && task.signal === 'none' ? .6 : verifier === 'none' ? 0 : .25
    const newSignal = task.signal === 'none' ? 0 : verifierMatches
    const gain = task.gainWithSignal * topologyFactor * roundFactor * newSignal
    const verifiedPenalty = verifier === 'none' ? .035 : verifier === 'rule' && task.signal !== 'none' ? .018 : 0
    success += task.share * Math.max(0, task.single + gain - verifiedPenalty)
    const multiplier = topology === 'single' ? 1 : topology === 'parallel' ? 1.75 + rounds * .12 : 2.1 + rounds * .32
    tokens += task.share * task.token * multiplier
    weightedLatency += task.share * task.latency * (topology === 'single' ? 1 : topology === 'parallel' ? 1.35 : 1.6 + rounds * .22)
    duplicate += task.share * (task.signal === 'none' && topology !== 'single' ? topology === 'debate' ? .72 : .54 : topology === 'single' ? .06 : .18)
  }
  const p95 = weightedLatency * 1.55
  const completionCost = tokens * .00002 / Math.max(.01, success)
  const keepMulti = topology !== 'single' && success >= .74 && duplicate < .35
  return {
    metrics: [
      { id: 'success', label: 'verified success', value: success * 100, display: `${(success * 100).toFixed(1)}%`, emphasis: true },
      { id: 'tokens', label: 'token 成本', value: tokens, display: `${tokens.toFixed(0)} / task` },
      { id: 'latency', label: 'p95 延迟', value: p95, display: `${p95.toFixed(0)} ms` },
      { id: 'duplicate', label: '重复判断率', value: duplicate * 100, display: `${(duplicate * 100).toFixed(1)}%` },
      { id: 'unitCost', label: '单位有效完成成本', value: completionCost, display: `¥${completionCost.toFixed(3)}` },
    ],
    costs: [
      { label: '每任务 token', value: tokens.toFixed(0) },
      { label: 'p95 等待', value: `${p95.toFixed(0)} ms` },
      { label: '拓扑结论', value: keepMulti ? '保留多 Agent' : '退回单 Agent + verify' },
    ],
    feedbackSource: '记录每个角色看到的 observation、调用工具返回的新信号与验证结果；角色名本身不算新信息。',
    feedbackSignals: NEW_INFO_DATA.map((task) => `${task.type}：${task.signal === 'none' ? '无外部新信号' : `可引入 ${task.signal} 信号`}`),
    nextTrainingAction: keepMulti ? '保留产生新信息的工具轨迹，补 Harness 与路由规则' : '退回单 Agent + verify，把预算留给真正带来新信号的任务',
    caution: topology === 'debate' ? '纯文本 debate 几乎不增加新信息，却会显著增加 token 与延迟。' : '并行采样增加候选，不等于引入了新的 observation。',
  }
}

export function summarizeAgentBook(controls: ControlValues, evidence: DecisionEvidence): DecisionSummary {
  const metric = Object.fromEntries(evidence.metrics.map((item) => [item.id, item.display]))
  const decision = evidence.costs.find((item) => item.label === '拓扑结论')?.value
  return { text: `多 Agent 策略：${controls.topology} 拓扑，最多 ${controls.rounds} 轮，验证器 ${controls.verifier}。verified success ${metric.success}，重复判断 ${metric.duplicate}，单位有效完成成本 ${metric.unitCost}。结论：${decision}；下一轮 ${evidence.nextTrainingAction}。`, nextAction: evidence.nextTrainingAction }
}

export const agentBookSpec = defineStrategyCase({
  id: 'new-information', routeId: 'agent-book', routeLabel: 'Agent Book', title: '多 Agent：什么时候真的带来新信息？', question: '增加角色是在获得新 observation，还是重复相同判断？', duration: '预计 3–5 分钟',
  background: '多一个 Agent 只有在引入新信息时才有价值。单纯增加角色，往往只会重复相同判断。',
  feedback: '反馈必须记录 observation、工具返回的新信号与验证结果；角色名称或重复意见不算新信息。',
  controls: [
    { id: 'topology', label: '协作拓扑', type: 'choice', options: ['single', 'parallel', 'debate'].map((value) => ({ value, label: value })) },
    { id: 'rounds', label: '最大轮数', type: 'choice', options: [1, 2, 4].map((value) => ({ value, label: String(value) })) },
    { id: 'verifier', label: '验证器', type: 'select', options: ['none', 'rule', 'tool'].map((value) => ({ value, label: value })) },
  ], defaults: DEFAULT_AGENT_BOOK, fixedDataTitle: '4 类固定任务结构',
  fixedDataRows: ['纯文本改写 35%：无外部新信号', '工具 / 视觉任务 45%：只有接入 observation 才有增益', '事实核验 20%：验证器决定成功是否可证实'],
  compute: calculateAgentBook, summarize: summarizeAgentBook,
})
