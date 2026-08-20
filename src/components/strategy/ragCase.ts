import { defineStrategyCase } from './defineStrategyCase.ts'
import type { ControlValues, DecisionEvidence, DecisionSummary } from './types'

type RagRow = { id: string; relevant: [number, number, number, number]; relevantScores: number[]; noiseScores: number[] }
export const RAG_DATA: RagRow[] = [
  { id: 'Q1', relevant: [1, 1, 2, 2], relevantScores: [.82, .69], noiseScores: [.62, .54, .42, .31] },
  { id: 'Q2', relevant: [0, 1, 1, 2], relevantScores: [.74, .58], noiseScores: [.71, .56, .48, .36] },
  { id: 'Q3', relevant: [1, 1, 1, 1], relevantScores: [.66], noiseScores: [.64, .52, .44, .29] },
  { id: 'Q4', relevant: [0, 0, 1, 1], relevantScores: [.61], noiseScores: [.68, .59, .47, .33] },
  { id: 'Q5', relevant: [1, 2, 2, 3], relevantScores: [.88, .72, .51], noiseScores: [.65, .57, .43, .28] },
  { id: 'Q6', relevant: [0, 1, 1, 1], relevantScores: [.57], noiseScores: [.63, .55, .46, .35] },
  { id: 'Q7', relevant: [1, 1, 2, 2], relevantScores: [.79, .60], noiseScores: [.70, .53, .41, .27] },
  { id: 'Q8', relevant: [0, 0, 0, 1], relevantScores: [.49], noiseScores: [.67, .58, .45, .34] },
  { id: 'Q9', relevant: [1, 1, 1, 2], relevantScores: [.76, .55], noiseScores: [.61, .50, .39, .25] },
  { id: 'Q10', relevant: [0, 1, 2, 2], relevantScores: [.70, .52], noiseScores: [.66, .56, .40, .30] },
]

const K_VALUES = [3, 5, 10, 20]
const number = (value: ControlValues[string]) => Number(value)
export const DEFAULT_RAG = { k: 5, threshold: .55, mode: '带引用生成' } as const

export function calculateRag(controls: ControlValues): DecisionEvidence {
  const k = number(controls.k)
  const threshold = number(controls.threshold)
  const mode = String(controls.mode)
  const kIndex = Math.max(0, K_VALUES.indexOf(k))
  let answerable = 0
  let keptRelevant = 0
  let keptTotal = 0
  for (const row of RAG_DATA) {
    const relevantCount = row.relevant[kIndex]
    if (relevantCount > 0) answerable += 1
    const relevantScores = row.relevantScores.slice(0, relevantCount)
    const noiseCount = Math.max(0, k - relevantCount)
    const repeatedNoise = Array.from({ length: noiseCount }, (_, index) => row.noiseScores[index % row.noiseScores.length] - Math.floor(index / row.noiseScores.length) * .03)
    keptRelevant += relevantScores.filter((score) => score >= threshold).length
    keptTotal += relevantScores.filter((score) => score >= threshold).length + repeatedNoise.filter((score) => score >= threshold).length
  }
  const answerableRate = answerable * 10
  const precision = keptTotal ? keptRelevant / keptTotal * 100 : 0
  const tokens = 290 + k * 118 + (mode === '带引用生成' ? 180 : 70)
  const latency = 210 + k * 24 + (mode === '带引用生成' ? 150 : 65) + Math.max(0, .55 - threshold) * 180
  const totalCost = tokens * .000018 + latency * .000025
  const action = answerableRate < 80 ? '补采低召回 query 的召回难例' : precision < 70 ? '把高分噪声补成重排 hard negatives' : '保留当前策略，并审查被阈值挡掉的证据'
  return {
    metrics: [
      { id: 'answerable', label: 'Answerable@k', value: answerableRate, display: `${answerableRate.toFixed(0)}%`, emphasis: true },
      { id: 'precision', label: '保留证据准确率', value: precision, display: `${precision.toFixed(1)}%` },
      { id: 'tokens', label: 'token / query', value: tokens, display: tokens.toFixed(0) },
      { id: 'latency', label: '估算延迟', value: latency, display: `${latency.toFixed(0)} ms` },
      { id: 'cost', label: '综合代价', value: totalCost, display: `¥${totalCost.toFixed(3)} / query` },
    ],
    costs: [
      { label: '上下文成本', value: `${tokens} token`, note: '只受进入回答的检索规模与回答模式影响' },
      { label: '响应等待', value: `${latency.toFixed(0)} ms` },
      { label: '被记录证据', value: `${keptTotal} 段 / 10 query`, note: '策略决定哪些文档进入回答与日志' },
    ],
    feedbackSource: '回答日志中的 query、保留文档、引用与重排分数；未召回文档不会自动变成训练证据。',
    feedbackSignals: [`${10 - answerable} 个 query 没有召回可用证据`, `阈值后保留 ${keptRelevant}/${keptTotal} 段相关证据`],
    nextTrainingAction: action,
    caution: 'Answerable@k 衡量召回覆盖；保留证据准确率衡量阈值后的重排结果，两者不能合并成一个“模型准确率”。',
  }
}

export function summarizeRag(controls: ControlValues, evidence: DecisionEvidence): DecisionSummary {
  const metric = Object.fromEntries(evidence.metrics.map((item) => [item.id, item.display]))
  const text = `RAG 上线策略：k=${controls.k}，重排阈值 ${Number(controls.threshold).toFixed(2)}，采用“${controls.mode}”。预计回答覆盖 ${metric.answerable}，保留证据准确率 ${metric.precision}，延迟 ${metric.latency}。下一轮采集：${evidence.nextTrainingAction}。`
  return { text, nextAction: evidence.nextTrainingAction }
}

export const ragSpec = defineStrategyCase({
  id: 'rag-budget', routeId: 'llm', routeLabel: 'LLM', title: 'RAG：多召回一点，值得多花多少？', question: '召回覆盖、证据精度与响应预算如何取舍？', duration: '预计 3–5 分钟',
  background: '召回更多文档可能找回证据，也会增加噪声、上下文长度和响应时间。你需要确定一套上线检索策略。',
  feedback: '反馈来自 query、引用与重排日志；未召回文档不会自动成为训练证据。',
  controls: [
    { id: 'k', label: '召回文档数 k', type: 'choice', options: [3, 5, 10, 20].map((value) => ({ value, label: String(value) })) },
    { id: 'threshold', label: 'rerank threshold', type: 'range', min: .3, max: .8, step: .05, format: 'decimal' },
    { id: 'mode', label: '回答模式', type: 'select', options: ['摘录回答', '带引用生成'].map((value) => ({ value, label: value })) },
  ], defaults: DEFAULT_RAG, fixedDataTitle: '10 个固定 query 的候选摘要',
  fixedDataRows: ['k=3 / 5 / 10 / 20 均记录 relevantCount', '相关段 rerank 均分约 0.66；噪声段均分约 0.49', '困难 query Q8 仅在 k=20 出现可用证据'],
  compute: calculateRag, summarize: summarizeRag,
})
