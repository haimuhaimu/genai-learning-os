import { defineStrategyCase } from './defineStrategyCase.ts'
import type {
  ChunkSimulationItem,
  ControlValues,
  DecisionEvidence,
  DecisionSummary,
  TokenBudgetMechanismData,
} from './types'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
const metricMap = (evidence: DecisionEvidence) => Object.fromEntries(evidence.metrics.map((item) => [item.id, item.display]))

const TASKS = ['遵循系统格式', '保持角色边界', '记住用户约束', '承接历史指代', '找到退款时限', '找到例外条件', '调用价格工具', '给出带依据回答']
const BUDGET_ORDER = [
  { id: 'system', label: 'System' },
  { id: 'history', label: 'History' },
  { id: 'retrieval', label: 'Retrieval' },
  { id: 'tool', label: 'Tool' },
  { id: 'answer', label: 'Answer' },
] as const

export const DEFAULT_CONTEXT_WINDOW = { window: 16000, systemTokens: 800, historyTurns: 6, retrievalK: 5, answerMode: '带引用' } as const

export function calculateContextWindow(controls: ControlValues): DecisionEvidence {
  const window = clamp(Number(controls.window), 8000, 32000)
  const system = clamp(Number(controls.systemTokens), 200, 1800)
  const historyTurns = clamp(Number(controls.historyTurns), 0, 12)
  const retrievalK = clamp(Number(controls.retrievalK), 0, 10)
  const cited = controls.answerMode === '带引用'
  const requested = {
    system,
    history: historyTurns * 560,
    retrieval: retrievalK * 680,
    tool: 420 + retrievalK * 28,
    answer: cited ? 960 : 420,
  }
  const requestedTotal = Object.values(requested).reduce((sum, value) => sum + value, 0)
  const overflow = Math.max(0, requestedTotal - window)
  const truncationRate = requestedTotal ? overflow / requestedTotal * 100 : 0
  const retainedEvidence = Math.min(requested.retrieval, Math.max(0, window - requested.system - requested.tool - requested.answer))
  const retainedHistory = Math.min(requested.history, Math.max(0, window - requested.system - requested.tool - requested.answer - retainedEvidence))
  const retainedSignal = system + retainedEvidence + retainedHistory + requested.tool + requested.answer
  const retrievalCoverage = retrievalK === 0 ? 0 : Math.min(1, retrievalK / 5)
  const contextCoverage = requested.history + requested.retrieval === 0 ? 1 : (retainedHistory + retainedEvidence) / (requested.history + requested.retrieval)
  const taskCount = clamp(Math.floor(3 + retrievalCoverage * 3 + contextCoverage * 2), 0, TASKS.length)
  const instructionRisk = clamp((system / window) * 28 + truncationRate * .62 + historyTurns * .7 + (cited ? 0 : 4), 0, 100)
  const totalCost = retainedSignal * .000018 + truncationRate * .012 + instructionRisk * .004
  const action = truncationRate > 0
    ? '回放被截断任务，先压缩历史与检索证据'
    : instructionRisk > 12
      ? '采集长系统提示下的指令冲突样本'
      : '保留配置，补测长历史与工具返回边界'

  return {
    metrics: [
      { id: 'coverage', label: '8 项任务保留', value: taskCount / TASKS.length * 100, display: `${taskCount} / 8`, emphasis: true },
      { id: 'truncation', label: '截断率', value: truncationRate, display: `${truncationRate.toFixed(1)}%` },
      { id: 'promptTokens', label: 'Prompt token', value: requestedTotal - requested.answer, display: `${(requestedTotal - requested.answer).toFixed(0)}` },
      { id: 'instructionRisk', label: '丢指令风险', value: instructionRisk, display: `${instructionRisk.toFixed(1)} / 100` },
      { id: 'cost', label: '综合代价', value: totalCost, display: `¥${totalCost.toFixed(3)} / 次` },
    ],
    costs: [
      { label: '请求预算', value: `${requestedTotal.toFixed(0)} / ${window.toFixed(0)} token` },
      { label: '溢出', value: `${overflow.toFixed(0)} token`, note: '优先保留 system、tool 与 answer，再保留检索和历史' },
      { label: '可用上下文', value: `${retainedSignal.toFixed(0)} token` },
    ],
    feedbackSource: '固定 8 项任务回放记录 system、history、retrieval、tool 与 answer 的请求和保留 token。',
    feedbackSignals: [`保留 ${taskCount} 项任务`, overflow ? `${overflow.toFixed(0)} token 未进入窗口` : '没有发生窗口截断'],
    nextTrainingAction: action,
    caution: '窗口容量不等于模型一定利用全部信息。这里仅模拟预算分配与截断，不代表真实模型准确率。',
  }
}

export function buildContextWindowMechanism(controls: ControlValues): TokenBudgetMechanismData {
  const evidence = calculateContextWindow(controls)
  const window = clamp(Number(controls.window), 8000, 32000)
  const requestedById: Record<string, number> = {
    system: clamp(Number(controls.systemTokens), 200, 1800),
    history: clamp(Number(controls.historyTurns), 0, 12) * 560,
    retrieval: clamp(Number(controls.retrievalK), 0, 10) * 680,
    tool: 420 + clamp(Number(controls.retrievalK), 0, 10) * 28,
    answer: controls.answerMode === '带引用' ? 960 : 420,
  }
  const retainedById: Record<string, number> = { system: 0, history: 0, retrieval: 0, tool: 0, answer: 0 }
  let remaining = window
  for (const id of ['system', 'tool', 'answer', 'retrieval', 'history']) {
    retainedById[id] = Math.min(requestedById[id], remaining)
    remaining -= retainedById[id]
  }
  const requestedTotal = Object.values(requestedById).reduce((sum, value) => sum + value, 0)
  const retainedCount = Math.round(evidence.metrics.find((item) => item.id === 'coverage')!.value / 100 * TASKS.length)
  return {
    kind: 'token-budget',
    ariaLabel: `${window / 1000}k 窗口预算图，请求 ${requestedTotal} token，溢出 ${Math.max(0, requestedTotal - window)} token`,
    summary: Math.max(0, requestedTotal - window) > 0 ? '窗口已满，历史与检索证据被截断。' : '全部预算进入窗口，仍需验证信息利用。',
    capacity: window,
    used: Math.min(window, requestedTotal),
    overflow: Math.max(0, requestedTotal - window),
    retainedTasks: TASKS.slice(0, retainedCount),
    droppedTasks: TASKS.slice(retainedCount),
    segments: BUDGET_ORDER.map(({ id, label }) => ({ id, label, requested: requestedById[id], retained: retainedById[id] })),
  }
}

export function summarizeContextWindow(controls: ControlValues, evidence: DecisionEvidence): DecisionSummary {
  const metric = metricMap(evidence)
  return {
    text: `上下文策略：${Number(controls.window) / 1000}k 窗口，system ${controls.systemTokens} token，历史 ${controls.historyTurns} 轮，检索 k=${controls.retrievalK}，采用${controls.answerMode}。任务保留 ${metric.coverage}，截断率 ${metric.truncation}，丢指令风险 ${metric.instructionRisk}。下一轮：${evidence.nextTrainingAction}。`,
    nextAction: evidence.nextTrainingAction,
  }
}

export const contextWindowBudgetSpec = defineStrategyCase({
  id: 'context-window-budget', routeId: 'llm', routeLabel: 'LLM', title: '上下文窗口：谁该留在预算里？',
  question: '窗口有限时，系统指令、历史、检索、工具和回答如何分配？', duration: '预计 4 分钟',
  background: '更长的上下文能减少截断，也会增加输入成本。先预测，再调预算观察任务保留。',
  feedback: '固定任务回放只改变预算分配，不引入随机抽样。',
  controls: [
    { id: 'window', label: '窗口', type: 'choice', options: [8000, 16000, 32000].map((value) => ({ value, label: `${value / 1000}k` })) },
    { id: 'systemTokens', label: '系统提示 token', type: 'range', min: 200, max: 1800, step: 200, format: 'integer' },
    { id: 'historyTurns', label: '历史轮次', type: 'choice', options: [0, 2, 6, 12].map((value) => ({ value, label: String(value) })) },
    { id: 'retrievalK', label: '检索 k', type: 'choice', options: [0, 3, 5, 10].map((value) => ({ value, label: String(value) })) },
    { id: 'answerMode', label: '回答模式', type: 'choice', options: ['短答', '带引用'].map((value) => ({ value, label: value })) },
  ],
  defaults: DEFAULT_CONTEXT_WINDOW,
  fixedDataTitle: '8 项固定任务',
  fixedDataRows: ['角色与格式约束 2 项', '历史承接 2 项', '检索证据 2 项', '工具与回答 2 项'],
  mechanism: { title: '窗口预算堆叠', description: '比较每类 token 的请求量与实际保留量。', build: buildContextWindowMechanism },
  compute: calculateContextWindow,
  summarize: summarizeContextWindow,
})

type EvidenceSpan = { start: number; end: number; label: string }
type MiniDocument = { id: string; title: string; tokens: number; evidence: EvidenceSpan[] }
type SimulatedChunk = ChunkSimulationItem & { score: number; evidenceTokens: number }

export const CHUNK_DOCUMENTS: MiniDocument[] = [
  { id: 'policy', title: '企业退款规则', tokens: 980, evidence: [{ start: 172, end: 238, label: '申请时限' }, { start: 646, end: 726, label: '不受理情形' }] },
  { id: 'guide', title: '退款材料指南', tokens: 760, evidence: [{ start: 402, end: 492, label: '所需材料' }] },
  { id: 'faq', title: '账单常见问题', tokens: 560, evidence: [] },
]
const REQUIRED_SPANS = ['申请时限', '不受理情形', '所需材料']
export const DEFAULT_RAG_CHUNKING = { chunkSize: 256, overlap: .2, splitter: '句子', topK: 5, contextCap: 4000 } as const

function makeDocumentChunks(document: MiniDocument, chunkSize: number, overlap: number, splitter: string) {
  const chunks: SimulatedChunk[] = []
  const rawStep = Math.max(1, Math.round(chunkSize * (1 - overlap)))
  const step = splitter === '句子' ? Math.max(48, Math.round(rawStep / 48) * 48) : rawStep
  for (let start = 0, index = 0; start < document.tokens; start += step, index += 1) {
    const end = Math.min(document.tokens, start + chunkSize)
    const hits = document.evidence.filter((span) => span.start < end && span.end > start)
    const evidenceTokens = hits.reduce((total, span) => total + Math.max(0, Math.min(end, span.end) - Math.max(start, span.start)), 0)
    chunks.push({
      id: `${document.id}-${index + 1}`,
      documentTitle: document.title,
      rangeLabel: `${start}-${end}`,
      preview: hits.length ? hits.map((span) => span.label).join('、') : '背景信息',
      tokenCount: end - start,
      hitLabels: hits.map((span) => span.label),
      selected: false,
      score: hits.length * 100 + evidenceTokens / Math.max(1, end - start) * 30 - index * .01,
      evidenceTokens,
    })
    if (end === document.tokens) break
  }
  return chunks
}

export function simulateRagChunking(controls: ControlValues) {
  const chunkSize = clamp(Number(controls.chunkSize), 128, 800)
  const overlap = clamp(Number(controls.overlap), 0, .5)
  const splitter = controls.splitter === '固定长度' ? '固定长度' : '句子'
  const topK = clamp(Number(controls.topK), 3, 10)
  const contextCap = clamp(Number(controls.contextCap), 2000, 8000)
  const chunks = CHUNK_DOCUMENTS.flatMap((document) => makeDocumentChunks(document, chunkSize, overlap, splitter))
  const ranked = [...chunks].sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
  const selectedIds = new Set<string>()
  let contextTokens = 0
  for (const chunk of ranked.slice(0, topK)) {
    if (contextTokens + chunk.tokenCount > contextCap) continue
    selectedIds.add(chunk.id)
    contextTokens += chunk.tokenCount
  }
  const visible = chunks.map((chunk) => ({ ...chunk, selected: selectedIds.has(chunk.id) }))
  const selected = visible.filter((chunk) => chunk.selected)
  const covered = new Set(selected.flatMap((chunk) => chunk.hitLabels))
  const answerable = covered.size / REQUIRED_SPANS.length * 100
  const evidenceTokens = selected.reduce((sum, chunk) => sum + chunk.evidenceTokens, 0)
  const noise = contextTokens ? Math.max(0, (contextTokens - evidenceTokens) / contextTokens * 100) : 0
  const latency = 110 + chunks.length * 3.5 + contextTokens * .075 + topK * 8
  return { chunks: visible, selected, answerable, noise, contextTokens, latency }
}

export function calculateRagChunking(controls: ControlValues): DecisionEvidence {
  const simulation = simulateRagChunking(controls)
  const action = simulation.answerable < 100
    ? '补采未命中证据 span 的 query 与正例 chunk'
    : simulation.noise > 75
      ? '把入选背景段加入重排 hard negatives'
      : '保留切块策略，回放跨 chunk 证据问题'
  return {
    metrics: [
      { id: 'answerable', label: 'Answerable@k', value: simulation.answerable, display: `${simulation.answerable.toFixed(0)}%`, emphasis: true },
      { id: 'noise', label: 'Noise@k', value: simulation.noise, display: `${simulation.noise.toFixed(1)}%` },
      { id: 'indexSize', label: 'IndexSize', value: simulation.chunks.length, display: `${simulation.chunks.length} 块` },
      { id: 'contextTokens', label: 'ContextTokens', value: simulation.contextTokens, display: `${simulation.contextTokens}` },
      { id: 'latency', label: 'Latency', value: simulation.latency, display: `${simulation.latency.toFixed(0)} ms` },
    ],
    costs: [
      { label: '索引块数', value: `${simulation.chunks.length} 块` },
      { label: '入选上下文', value: `${simulation.selected.length} 块 / ${simulation.contextTokens} token` },
      { label: '证据覆盖', value: `${simulation.answerable.toFixed(0)}%`, note: '按 3 个固定证据 span 是否进入上下文计算' },
    ],
    feedbackSource: '固定 query 与三篇小文档逐块回放，记录证据 span 命中、排序和上下文装箱结果。',
    feedbackSignals: [`TopK 实际装入 ${simulation.selected.length} 块`, `噪声占比 ${simulation.noise.toFixed(1)}%`],
    nextTrainingAction: action,
    caution: 'Answerable@k 只表示必要证据进入上下文，不表示生成答案一定正确。',
  }
}

export function summarizeRagChunking(controls: ControlValues, evidence: DecisionEvidence): DecisionSummary {
  const metric = metricMap(evidence)
  return {
    text: `RAG 切块策略：${controls.splitter}，chunkSize ${controls.chunkSize}，overlap ${Math.round(Number(controls.overlap) * 100)}%，topK ${controls.topK}，contextCap ${Number(controls.contextCap) / 1000}k。Answerable@k ${metric.answerable}，Noise@k ${metric.noise}，索引 ${metric.indexSize}，上下文 ${metric.contextTokens} token。下一轮：${evidence.nextTrainingAction}。`,
    nextAction: evidence.nextTrainingAction,
  }
}

export const ragChunkingSpec = defineStrategyCase({
  id: 'rag-chunking', routeId: 'llm', routeLabel: 'LLM', title: 'RAG 切块：证据该切多大？',
  question: '切块大小、重叠与上下文上限如何改变证据命中和噪声？', duration: '预计 4 分钟',
  background: '小块便于精确命中，却会扩大索引。大块保留邻近语境，也可能携带更多噪声。',
  feedback: '固定文档与 query 让每次切块、排序和装箱结果完全可复现。',
  controls: [
    { id: 'chunkSize', label: 'chunkSize', type: 'choice', options: [128, 256, 512, 800].map((value) => ({ value, label: String(value) })) },
    { id: 'overlap', label: 'overlap', type: 'range', min: 0, max: .5, step: .1, format: 'percent' },
    { id: 'splitter', label: 'splitter', type: 'choice', options: ['句子', '固定长度'].map((value) => ({ value, label: value })) },
    { id: 'topK', label: 'topK', type: 'choice', options: [3, 5, 10].map((value) => ({ value, label: String(value) })) },
    { id: 'contextCap', label: 'contextCap', type: 'choice', options: [2000, 4000, 8000].map((value) => ({ value, label: `${value / 1000}k` })) },
  ],
  defaults: DEFAULT_RAG_CHUNKING,
  fixedDataTitle: '1 个 query，3 篇固定文档，3 个必要证据 span',
  fixedDataRows: ['Query：误扣费后多久内申请，需要哪些材料，哪些情况不受理', '企业退款规则：980 token，含时限与例外', '退款材料指南：760 token，含材料清单', '账单常见问题：560 token，无必要证据'],
  mechanism: {
    title: '切块与证据命中',
    description: '蓝色块进入上下文，描边块命中必要证据。',
    build: (controls) => {
      const simulation = simulateRagChunking(controls)
      return {
        kind: 'chunk-simulation' as const,
        ariaLabel: `RAG 切块图，共 ${simulation.chunks.length} 块，选中 ${simulation.selected.length} 块，必要证据覆盖 ${simulation.answerable.toFixed(0)}%`,
        summary: simulation.answerable === 100 ? '必要证据已进入上下文，继续观察噪声。' : '仍有必要证据未进入上下文。',
        query: '误扣费后多久内申请，需要哪些材料，哪些情况不受理？',
        chunks: simulation.chunks,
        selectedCount: simulation.selected.length,
      }
    },
  },
  compute: calculateRagChunking,
  summarize: summarizeRagChunking,
})
