import { defineStrategyCase } from './defineStrategyCase.ts'
import type { ControlValues, DecisionEvidence, DecisionSummary } from './types'

type ImageRow = { resolution: number; steps: number; cost: number; latency: number; passRate: number; failures: [number, number, number, number] }
export const IMAGE_DATA: ImageRow[] = [
  { resolution: 512, steps: 20, cost: .08, latency: 2.4, passRate: .56, failures: [38, 27, 16, 19] },
  { resolution: 512, steps: 30, cost: .10, latency: 3.1, passRate: .62, failures: [36, 25, 15, 24] },
  { resolution: 512, steps: 50, cost: .15, latency: 4.8, passRate: .65, failures: [35, 24, 14, 27] },
  { resolution: 768, steps: 20, cost: .14, latency: 3.8, passRate: .64, failures: [32, 29, 18, 21] },
  { resolution: 768, steps: 30, cost: .18, latency: 4.9, passRate: .72, failures: [30, 27, 17, 26] },
  { resolution: 768, steps: 50, cost: .27, latency: 7.5, passRate: .76, failures: [29, 25, 16, 30] },
  { resolution: 1024, steps: 20, cost: .25, latency: 6.6, passRate: .68, failures: [29, 31, 22, 18] },
  { resolution: 1024, steps: 30, cost: .33, latency: 8.4, passRate: .78, failures: [27, 29, 21, 23] },
  { resolution: 1024, steps: 50, cost: .50, latency: 12.8, passRate: .82, failures: [26, 27, 20, 27] },
]
export const DEFAULT_IMAGE = { resolution: 768, steps: 30, redraw: true } as const
const failureNames = ['文字错', '构图偏', '身份漂', '伪影']

export function calculateImage(controls: ControlValues): DecisionEvidence {
  const resolution = Number(controls.resolution)
  const steps = Number(controls.steps)
  const redraw = Boolean(controls.redraw)
  const row = IMAGE_DATA.find((item) => item.resolution === resolution && item.steps === steps) ?? IMAGE_DATA[4]
  const secondPass = row.passRate * .7
  const finalPass = redraw ? row.passRate + (1 - row.passRate) * secondPass : row.passRate
  const attempts = redraw ? 1 + (1 - row.passRate) : 1
  const expectedCost = row.cost * attempts
  const unitCost = expectedCost / Math.max(.01, finalPass)
  const latency = row.latency * attempts
  const mainFailureIndex = row.failures.indexOf(Math.max(...row.failures))
  const mainFailure = failureNames[mainFailureIndex]
  const actionMap: Record<string, string> = { 文字错: '补文字渲染样本与 OCR 约束', 构图偏: '补构图标注并调整控制条件', 身份漂: '补身份一致性切片与参考控制', 伪影: '补伪影负例并优化后处理门禁' }
  return {
    metrics: [
      { id: 'pass', label: '最终可用率', value: finalPass * 100, display: `${(finalPass * 100).toFixed(1)}%`, emphasis: true },
      { id: 'attempts', label: '平均尝试次数', value: attempts, display: attempts.toFixed(2) },
      { id: 'unitCost', label: '单位可用图成本', value: unitCost, display: `¥${unitCost.toFixed(3)}` },
      { id: 'latency', label: '平均耗时', value: latency, display: `${latency.toFixed(1)} 秒` },
      { id: 'rework', label: '返工率', value: redraw ? (1 - row.passRate) * 100 : 0, display: `${(redraw ? (1 - row.passRate) * 100 : 0).toFixed(1)}%` },
    ],
    costs: [
      { label: '单次生成成本', value: `¥${row.cost.toFixed(2)}` },
      { label: '每个请求期望成本', value: `¥${expectedCost.toFixed(3)}`, note: '重绘只发生在首轮失败样本' },
      { label: '单位可用图成本', value: `¥${unitCost.toFixed(3)}`, note: '不能与单次成本混为一谈' },
    ],
    feedbackSource: '质检门记录首轮与重绘结果；失败按文字、构图、身份与伪影四类归因。',
    feedbackSignals: row.failures.map((share, index) => `${failureNames[index]} ${share}%`),
    nextTrainingAction: `${actionMap[mainFailure]}，而不是继续盲加 steps`,
    caution: `当前主要失败是“${mainFailure}”。更高 steps 不会等比例修复所有失败类型。`,
  }
}

export function summarizeImage(controls: ControlValues, evidence: DecisionEvidence): DecisionSummary {
  const metric = Object.fromEntries(evidence.metrics.map((item) => [item.id, item.display]))
  const main = evidence.feedbackSignals.reduce((best, item) => Number(item.match(/\d+/)?.[0]) > Number(best.match(/\d+/)?.[0]) ? item : best)
  return { text: `图像交付策略：${controls.resolution}px、${controls.steps} steps，二次重绘${controls.redraw ? '开启' : '关闭'}。预计单位可用图成本 ${metric.unitCost}，最终可用率 ${metric.pass}；主要失败为 ${main}。下一轮：${evidence.nextTrainingAction}。`, nextAction: evidence.nextTrainingAction }
}

export const imageSpec = defineStrategyCase({
  id: 'image-unit-cost', routeId: 'image', routeLabel: '图像生成', title: '单张可用图：质量提升是否抵得过重试成本？', question: '分辨率、采样步数与重绘怎样共同决定交付成本？', duration: '预计 3–5 分钟',
  background: '更高分辨率、更多采样步数和重绘，会提高可用率，也会让每张最终交付图更贵。',
  feedback: '反馈来自质检门与失败类型归因，用来决定补哪类数据，而不是只继续增加采样步数。',
  controls: [
    { id: 'resolution', label: '分辨率', type: 'choice', options: [512, 768, 1024].map((value) => ({ value, label: `${value}px` })) },
    { id: 'steps', label: '采样步数', type: 'choice', options: [20, 30, 50].map((value) => ({ value, label: String(value) })) },
    { id: 'redraw', label: '失败后仅重绘一次', type: 'toggle', detail: '第二次通过率固定为原首轮通过率的 70%' },
  ], defaults: DEFAULT_IMAGE, fixedDataTitle: '9 组固定生成配置',
  fixedDataRows: ['512px：单次 ¥0.08–0.15，可用率 56%–65%', '768px：单次 ¥0.14–0.27，可用率 64%–76%', '1024px：单次 ¥0.25–0.50，可用率 68%–82%'],
  compute: calculateImage, summarize: summarizeImage,
})
