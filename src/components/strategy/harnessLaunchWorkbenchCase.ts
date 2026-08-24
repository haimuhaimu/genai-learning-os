import { defineStrategyCase } from './defineStrategyCase.ts'
import type { ControlValues, DecisionEvidence, DecisionSummary } from './types'

export type HarnessLaunchDecision = 'GO' | 'HOLD' | 'NO-GO'

type RiskLevel = 'low' | 'medium' | 'high'
type GoalQuality = 'measurable' | 'directional' | 'unclear'
type ContextQuality = 'complete' | 'partial' | 'missing'
type ToolContract = 'strict' | 'basic' | 'implicit'
type LaunchScope = 'sandbox' | 'five-percent' | 'twenty-percent' | 'full'

export type HarnessLaunchAssessment = {
  decision: HarnessLaunchDecision
  score: number
  vetoes: string[]
  requiredEvidence: number
  nextAction: string
}

export const DEFAULT_HARNESS_LAUNCH = {
  goalQuality: 'measurable',
  contextQuality: 'complete',
  toolContract: 'strict',
  riskLevel: 'high',
  launchScope: 'five-percent',
  automaticVerification: true,
  evidenceCount: 120,
  rollbackReady: true,
  correctionOwner: true,
} as const

const riskLabels: Record<RiskLevel, string> = { low: '低风险', medium: '中风险', high: '高风险' }
const goalLabels: Record<GoalQuality, string> = { measurable: '目标、指标和阈值可度量', directional: '只有方向性目标', unclear: '目标尚未定义' }
const contextLabels: Record<ContextQuality, string> = { complete: '关键输入、用户边界与失败场景齐备', partial: '只覆盖主流程', missing: '关键上下文缺失' }
const toolLabels: Record<ToolContract, string> = { strict: '输入、输出、权限、超时与幂等均明确', basic: '只有基础输入输出约定', implicit: '依赖提示词中的隐式约定' }
const scopeLabels: Record<LaunchScope, string> = { sandbox: '仅沙箱', 'five-percent': '5% 可回滚流量', 'twenty-percent': '20% 流量', full: '直接全量' }
const evidenceThresholds: Record<RiskLevel, number> = { low: 20, medium: 60, high: 120 }

function enumValue<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  return values.includes(value as T) ? value as T : fallback
}

function numberValue(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value)
  return Math.min(max, Math.max(min, Number.isFinite(parsed) ? parsed : fallback))
}

function normalizedControls(controls: ControlValues) {
  return {
    goalQuality: enumValue(controls.goalQuality, ['measurable', 'directional', 'unclear'], DEFAULT_HARNESS_LAUNCH.goalQuality),
    contextQuality: enumValue(controls.contextQuality, ['complete', 'partial', 'missing'], DEFAULT_HARNESS_LAUNCH.contextQuality),
    toolContract: enumValue(controls.toolContract, ['strict', 'basic', 'implicit'], DEFAULT_HARNESS_LAUNCH.toolContract),
    riskLevel: enumValue(controls.riskLevel, ['low', 'medium', 'high'], DEFAULT_HARNESS_LAUNCH.riskLevel),
    launchScope: enumValue(controls.launchScope, ['sandbox', 'five-percent', 'twenty-percent', 'full'], DEFAULT_HARNESS_LAUNCH.launchScope),
    automaticVerification: Boolean(controls.automaticVerification),
    evidenceCount: Math.round(numberValue(controls.evidenceCount, DEFAULT_HARNESS_LAUNCH.evidenceCount, 0, 200)),
    rollbackReady: Boolean(controls.rollbackReady),
    correctionOwner: Boolean(controls.correctionOwner),
  }
}

export function assessHarnessLaunch(controls: ControlValues): HarnessLaunchAssessment {
  const values = normalizedControls(controls)
  const requiredEvidence = evidenceThresholds[values.riskLevel]
  const vetoes = [
    !values.automaticVerification ? '缺少可自动执行的结果验证' : '',
    !values.rollbackReady ? '缺少已演练的回滚路径' : '',
    values.riskLevel === 'high' && values.evidenceCount < requiredEvidence ? `高风险场景证据不足 ${requiredEvidence} 条` : '',
    values.riskLevel === 'high' && !['sandbox', 'five-percent'].includes(values.launchScope) ? '高风险场景首发范围超过 5%' : '',
  ].filter(Boolean)

  const goalScore = { measurable: 15, directional: 8, unclear: 0 }[values.goalQuality]
  const contextScore = { complete: 15, partial: 8, missing: 0 }[values.contextQuality]
  const toolScore = { strict: 15, basic: 8, implicit: 0 }[values.toolContract]
  const constrainScore = { sandbox: 15, 'five-percent': 15, 'twenty-percent': 8, full: 0 }[values.launchScope]
  const verifyScore = (values.automaticVerification ? 10 : 0) + Math.round(Math.min(1, values.evidenceCount / requiredEvidence) * 20)
  const correctScore = (values.rollbackReady ? 5 : 0) + (values.correctionOwner ? 5 : 0)
  const score = goalScore + contextScore + toolScore + constrainScore + verifyScore + correctScore
  const decision: HarnessLaunchDecision = vetoes.length ? 'NO-GO' : score >= 85 ? 'GO' : 'HOLD'

  const improvements = [
    values.goalQuality !== 'measurable' ? '把 Goal 改成可度量指标与阈值' : '',
    values.contextQuality !== 'complete' ? '补齐 Context 的边界与失败场景' : '',
    values.toolContract !== 'strict' ? '完善 Tools 的权限、超时与幂等契约' : '',
    ['twenty-percent', 'full'].includes(values.launchScope) ? '缩小 Constrain 首发范围' : '',
    values.evidenceCount < requiredEvidence ? `把 Verify 证据补到 ${requiredEvidence} 条` : '',
    !values.correctionOwner ? '为 Correct 指定纠偏责任人' : '',
  ].filter(Boolean)

  const nextAction = decision === 'NO-GO'
    ? `先解除硬否决：${vetoes.join('；')}；完成后重新评审。`
    : decision === 'HOLD'
      ? `保持在沙箱，不扩大流量；优先${improvements.join('；')}，再重新评分。`
      : `按${scopeLabels[values.launchScope]}启动，持续运行自动验证；任一硬否决条件触发时立即回滚并由纠偏责任人复盘。`

  return { decision, score, vetoes, requiredEvidence, nextAction }
}

export function calculateHarnessLaunch(controls: ControlValues): DecisionEvidence {
  const values = normalizedControls(controls)
  const assessment = assessHarnessLaunch(controls)
  const closedSteps = [
    values.goalQuality === 'measurable',
    values.contextQuality === 'complete',
    values.toolContract === 'strict',
    ['sandbox', 'five-percent'].includes(values.launchScope),
    values.automaticVerification && values.evidenceCount >= assessment.requiredEvidence,
    values.rollbackReady && values.correctionOwner,
  ].filter(Boolean).length

  return {
    metrics: [
      { id: 'decision', label: '确定性上线决策', value: { 'NO-GO': 0, HOLD: 1, GO: 2 }[assessment.decision], display: assessment.decision, hint: '先执行硬否决，再看 85 分就绪门槛；相同输入始终得到相同决策。', emphasis: true },
      { id: 'readiness', label: '闭环就绪分', value: assessment.score, display: `${assessment.score} / 100`, hint: '分数不能覆盖硬否决。' },
      { id: 'closedSteps', label: '完整环节', value: closedSteps, display: `${closedSteps} / 6`, hint: 'Goal + Context / Tools / Constrain / Verify / Correct。' },
      { id: 'evidence', label: '验证证据', value: values.evidenceCount, display: `${values.evidenceCount} / ${assessment.requiredEvidence} 条`, hint: `${riskLabels[values.riskLevel]}所需的最小固定证据量。` },
    ],
    costs: [
      { label: '硬 veto', value: assessment.vetoes.length ? `已触发：${assessment.vetoes.join('；')}` : '未触发：硬否决检查通过', note: '硬否决优先于就绪分。' },
      { label: '评分门槛', value: `当前 ${assessment.score} / 100；无硬否决且达到 85 分才是 GO` },
      { label: '首发边界', value: `${riskLabels[values.riskLevel]} · ${scopeLabels[values.launchScope]}` },
      { label: '下一步动作', value: assessment.nextAction },
    ],
    feedbackSource: '固定证据来自上线前验收样本、工具执行 trace、自动断言结果和回滚演练记录；模型自述“已完成”不算验证证据。',
    feedbackSignals: [
      `Goal：${goalLabels[values.goalQuality]}`,
      `Context：${contextLabels[values.contextQuality]}`,
      `Tools：${toolLabels[values.toolContract]}`,
      `Constrain：${scopeLabels[values.launchScope]}`,
      `Verify：自动验证${values.automaticVerification ? '已配置' : '缺失'}，证据 ${values.evidenceCount} / ${assessment.requiredEvidence} 条`,
      `Correct：回滚${values.rollbackReady ? '已演练' : '缺失'}，纠偏责任人${values.correctionOwner ? '已指定' : '未指定'}`,
    ],
    nextTrainingAction: assessment.nextAction,
    caution: '这是教学用上线闸门。真实上线仍需使用目标系统的真实日志、权限审查、压测和组织规范；任何硬否决都不能靠加分抵消。',
  }
}

export function summarizeHarnessLaunch(controls: ControlValues): DecisionSummary {
  const values = normalizedControls(controls)
  const assessment = assessHarnessLaunch(controls)
  const vetoSummary = assessment.vetoes.length ? assessment.vetoes.join('；') : '无'
  const text = [
    `Harness 上线策略｜决策：${assessment.decision}（就绪分 ${assessment.score}/100；硬 veto 优先）`,
    `Goal：${goalLabels[values.goalQuality]}。`,
    `Context：${riskLabels[values.riskLevel]}；${contextLabels[values.contextQuality]}。`,
    `Tools：${toolLabels[values.toolContract]}。`,
    `Constrain：首发范围为${scopeLabels[values.launchScope]}。`,
    `Verify：自动验证${values.automaticVerification ? '已配置' : '缺失'}；固定证据 ${values.evidenceCount}/${assessment.requiredEvidence} 条。`,
    `Correct：回滚${values.rollbackReady ? '已演练' : '缺失'}；纠偏责任人${values.correctionOwner ? '已指定' : '未指定'}。`,
    `硬 veto：${vetoSummary}。`,
    `下一步：${assessment.nextAction}`,
  ].join('\n')
  return { text, nextAction: assessment.nextAction }
}

export const harnessLaunchWorkbenchSpec = defineStrategyCase({
  id: 'harness-launch-workbench',
  routeId: 'agent-book',
  routeLabel: 'Agent Book',
  title: 'Harness 上线闭环：现在能放量吗？',
  question: '目标、工具约束、自动验证和失败纠正准备到什么程度，才能得到 GO、HOLD 或 NO-GO？',
  duration: '预计 5–8 分钟',
  background: '你负责一个会调用工具的 AI 工作流，不需要调整模型算法。请用 Goal + Context / Tools / Constrain / Verify / Correct 检查外围系统，决定能否从验收环境进入真实流量。',
  feedback: '反馈来自可重复的自动断言、工具 trace、固定验收样本和回滚演练；分数只用于排序改进项，不能覆盖硬否决。',
  controls: [
    { id: 'goalQuality', label: 'Goal · 目标定义', type: 'choice', options: [{ value: 'measurable', label: '指标与阈值明确' }, { value: 'directional', label: '只有方向目标' }, { value: 'unclear', label: '尚未定义' }] },
    { id: 'contextQuality', label: 'Context · 上下文覆盖', type: 'choice', options: [{ value: 'complete', label: '边界与失败场景齐备' }, { value: 'partial', label: '只覆盖主流程' }, { value: 'missing', label: '关键上下文缺失' }] },
    { id: 'toolContract', label: 'Tools · 工具契约', type: 'choice', options: [{ value: 'strict', label: '权限、超时、幂等齐备' }, { value: 'basic', label: '只有输入输出' }, { value: 'implicit', label: '依赖隐式约定' }] },
    { id: 'riskLevel', label: 'Context · 失败风险', type: 'choice', options: [{ value: 'low', label: '低风险' }, { value: 'medium', label: '中风险' }, { value: 'high', label: '高风险' }] },
    { id: 'launchScope', label: 'Constrain · 首发范围', type: 'choice', options: [{ value: 'sandbox', label: '仅沙箱' }, { value: 'five-percent', label: '5% 可回滚流量' }, { value: 'twenty-percent', label: '20% 流量' }, { value: 'full', label: '直接全量' }] },
    { id: 'automaticVerification', label: 'Verify · 自动验证', type: 'toggle', detail: '必须能根据外部结果自动判定成功或失败；模型自述不算。' },
    { id: 'evidenceCount', label: 'Verify · 固定验收样本数', type: 'range', min: 0, max: 200, step: 20, format: 'integer', detail: '低 / 中 / 高风险分别至少需要 20 / 60 / 120 条。' },
    { id: 'rollbackReady', label: 'Correct · 回滚已演练', type: 'toggle', detail: '缺少回滚路径会直接触发 NO-GO。' },
    { id: 'correctionOwner', label: 'Correct · 纠偏责任人已指定', type: 'toggle', detail: '明确失败后由谁停流量、复盘并修正策略。' },
  ],
  defaults: DEFAULT_HARNESS_LAUNCH,
  fixedDataTitle: '上线闸门的固定判定口径',
  fixedDataRows: [
    '硬 veto：缺自动验证、缺已演练回滚，均直接 NO-GO，不能靠总分抵消。',
    '高风险附加 veto：固定证据少于 120 条，或首发范围超过 5%，直接 NO-GO。',
    '无硬 veto 时：就绪分达到 85 为 GO，否则为 HOLD；HOLD 只可留在沙箱补证据。',
    '固定证据只计算外部断言、工具 trace 与人工验收结果，不计算模型自评。',
  ],
  compute: calculateHarnessLaunch,
  summarize: summarizeHarnessLaunch,
})
