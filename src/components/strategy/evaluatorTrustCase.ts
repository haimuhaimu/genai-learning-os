import { defineStrategyCase } from './defineStrategyCase.ts'
import type { ControlValues, DecisionEvidence, DecisionSummary } from './types'

type CalibrationBucket = {
  label: string
  sample: number
  judgeConfidence: number
  humanAccuracy: number
}

type FocusProfile = {
  focus: 'cold-start-traffic' | 'monetization-recommendation' | 'moderation-policy'
  label: string
  baseAgreement: number
  correlationPenalty: number
  correlationEcePenalty: number
  severityWeight: number
  calibrationAuditCases: number
  buckets: readonly CalibrationBucket[]
  evidenceNote: string
  nextSample: string
}

export const FOCUS_DATA: readonly FocusProfile[] = [
  {
    focus: 'cold-start-traffic',
    label: '冷启动流量分配',
    baseAgreement: 94,
    correlationPenalty: 8,
    correlationEcePenalty: 5,
    severityWeight: .8,
    calibrationAuditCases: 60,
    buckets: [
      { label: '60%–74%', sample: 30, judgeConfidence: .68, humanAccuracy: .70 },
      { label: '75%–89%', sample: 40, judgeConfidence: .82, humanAccuracy: .80 },
      { label: '90%–100%', sample: 30, judgeConfidence: .94, humanAccuracy: .90 },
    ],
    evidenceNote: '短期结果可由日志复核，但仍要防止只优化点击而伤害长期留存。',
    nextSample: '按新老用户各抽取一半，并补看 7 日留存',
  },
  {
    focus: 'monetization-recommendation',
    label: '作者变现路径推荐',
    baseAgreement: 86,
    correlationPenalty: 12,
    correlationEcePenalty: 10,
    severityWeight: 1,
    calibrationAuditCases: 90,
    buckets: [
      { label: '60%–74%', sample: 25, judgeConfidence: .68, humanAccuracy: .60 },
      { label: '75%–89%', sample: 45, judgeConfidence: .82, humanAccuracy: .76 },
      { label: '90%–100%', sample: 30, judgeConfidence: .94, humanAccuracy: .86 },
    ],
    evidenceNote: '订单反馈可核对，作者留存和内容多样性仍需人工判断。',
    nextSample: '按作者规模分层抽样，并追踪 14 日留存与内容多样性',
  },
  {
    focus: 'moderation-policy',
    label: '违规内容边界判定',
    baseAgreement: 75,
    correlationPenalty: 18,
    correlationEcePenalty: 16,
    severityWeight: 1.3,
    calibrationAuditCases: 140,
    buckets: [
      { label: '60%–74%', sample: 30, judgeConfidence: .68, humanAccuracy: .52 },
      { label: '75%–89%', sample: 40, judgeConfidence: .82, humanAccuracy: .65 },
      { label: '90%–100%', sample: 30, judgeConfidence: .94, humanAccuracy: .72 },
    ],
    evidenceNote: '规则会变化且错误代价不对称，模型只能筛选候选，不能独立改规则。',
    nextSample: '按风险等级分桶，优先双人复核高风险与模型分歧样本',
  },
]

export const DEFAULT_EVALUATOR_TRUST = {
  focus: 'cold-start-traffic',
  calibrationStrength: .6,
  policyCorrelation: .3,
  auditRate: .2,
  stopThreshold: 60,
} as const

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const rounded = (value: number, digits = 1) => Number(value.toFixed(digits))

function boundedControl(controls: ControlValues, id: string, fallback: number, min: number, max: number) {
  const value = Number(controls[id])
  return clamp(Number.isFinite(value) ? value : fallback, min, max)
}

function expectedCalibrationError(profile: FocusProfile) {
  const total = profile.buckets.reduce((sum, bucket) => sum + bucket.sample, 0)
  if (total <= 0) return 0
  return profile.buckets.reduce((sum, bucket) => sum + bucket.sample * Math.abs(bucket.judgeConfidence - bucket.humanAccuracy), 0) / total * 100
}

function selectedProfile(controls: ControlValues) {
  const focusId = String(controls.focus)
  return FOCUS_DATA.find((item) => item.focus === focusId) ?? FOCUS_DATA[0]
}

export function calculateEvaluatorTrust(controls: ControlValues): DecisionEvidence {
  const profile = selectedProfile(controls)
  const calibrationStrength = boundedControl(controls, 'calibrationStrength', DEFAULT_EVALUATOR_TRUST.calibrationStrength, 0, 1)
  const policyCorrelation = boundedControl(controls, 'policyCorrelation', DEFAULT_EVALUATOR_TRUST.policyCorrelation, 0, 1)
  const auditRate = boundedControl(controls, 'auditRate', DEFAULT_EVALUATOR_TRUST.auditRate, .05, .5)
  const stopThreshold = boundedControl(controls, 'stopThreshold', DEFAULT_EVALUATOR_TRUST.stopThreshold, 10, 200)
  const baseEce = expectedCalibrationError(profile)
  const ece = rounded(clamp(baseEce * (1 - .65 * calibrationStrength) + policyCorrelation * profile.correlationEcePenalty, 0, 100))
  const agreement = rounded(clamp(profile.baseAgreement + calibrationStrength * 5 - policyCorrelation * profile.correlationPenalty, 0, 100))
  const missedRisk = Math.round(clamp((1 - agreement / 100) * 1000 * (1 - auditRate) * (1 + 1.5 * policyCorrelation) * profile.severityWeight, 0, 1000))
  const auditCost = Math.round(clamp(auditRate * 1000 + calibrationStrength * profile.calibrationAuditCases, 0, 1500))
  const missedRiskTriggered = missedRisk >= stopThreshold
  const eceTriggered = ece >= 10
  const shouldStop = missedRiskTriggered || eceTriggered
  const triggeredBy = [missedRiskTriggered ? '漏错风险' : '', eceTriggered ? 'ECE' : ''].filter(Boolean).join('与')
  const stopReason = `${shouldStop ? `已触发（${triggeredBy}）` : '未触发'}：当前漏错风险 ${missedRisk} / 千次（阈值 ${Math.round(stopThreshold)} / 千次，${missedRiskTriggered ? '已达到' : '未达到'}）；当前 ECE ${ece.toFixed(1)}%（阈值 10.0%，${eceTriggered ? '已达到' : '未达到'}）。`

  return {
    metrics: [
      { id: 'ece', label: 'ECE（期望校准误差）', value: ece, display: `${ece.toFixed(1)}%`, hint: '来源：100 条按 Judge 置信度分桶的人工复核样本；计算各桶置信度与人工准确率的加权差距。', emphasis: true },
      { id: 'agreement', label: 'Judge–人工一致率', value: agreement, display: `${agreement.toFixed(1)}%`, hint: '来源：课堂教学估计，由方向基线叠加校准与相关性系数得到；不是上述分桶复核样本直接实测值。' },
      { id: 'missedRisk', label: '未审漏错风险', value: missedRisk, display: `${missedRisk} / 千次`, hint: '预计每一千次决策中，绕过人工审计且判断错误的次数。' },
      { id: 'auditCost', label: '审核成本', value: auditCost, display: `${auditCost} 人次 / 千次`, hint: '常规抽审人次加上校准所需的额外复核人次。' },
    ],
    costs: [
      { label: '闭环决策', value: shouldStop ? '停手，保持人工主导' : '可进入限量自动闭环' },
      { label: '停手条件', value: stopReason },
      { label: '证据边界', value: profile.evidenceNote },
    ],
    feedbackSource: `ECE 证据来源：当前方向“${profile.label}”的 100 条按 Judge 置信度分桶人工复核小样本，原始 ECE 为 ${baseEce.toFixed(1)}%。一致率来源：方向基线叠加校准强度与策略相关性后的课堂教学估计，并非这 100 条样本直接实测；两者都不是全量真相。`,
    feedbackSignals: [
      `校准：强度每提高一档，会压低分桶置信度偏差，但增加 ${profile.calibrationAuditCases} × 校准强度的人审成本。`,
      `相关性：judge 与被评策略共享数据或偏好越多，一致率越低、共同漏错越难被发现。`,
      `审计：提高人工审计率会降低未审漏错风险，但会线性增加审核人次。`,
      `人话结论：${stopReason}。`,
    ],
    nextTrainingAction: `下一轮采样动作：${profile.nextSample}；至少复核 ${Math.max(50, Math.ceil(auditRate * 500))} 条，再重算 ECE、一致率与漏错风险。`,
    caution: '这是小样本决策尺，不是安全证明；触发任一停手条件时，不得用模型自评覆盖人工结论。',
  }
}

export function summarizeEvaluatorTrust(controls: ControlValues, evidence: DecisionEvidence): DecisionSummary {
  const profile = selectedProfile(controls)
  const stopThreshold = boundedControl(controls, 'stopThreshold', DEFAULT_EVALUATOR_TRUST.stopThreshold, 10, 200)
  const values = Object.fromEntries(evidence.metrics.map((item) => [item.id, item]))
  const shouldStop = values.missedRisk.value >= stopThreshold || values.ece.value >= 10
  const text = `自评闭环策略：在“${profile.label}”限量试跑。证据可信度：ECE（期望校准误差）${values.ece.display} 来自 100 条分桶人工复核；Judge–人工一致率 ${values.agreement.display} 是由方向基线、校准与相关性系数得到的课堂教学估计，并非同一批样本的直接实测，小样本结论只可用于决定下一轮。风险与成本：未审漏错 ${values.missedRisk.display}，审核成本 ${values.auditCost.display}。停手条件：${shouldStop ? '已触发，保持人工主导' : '未触发，可继续限量试跑'}；当前漏错风险 ${values.missedRisk.display}（阈值 ${Math.round(stopThreshold)} / 千次），当前 ECE ${values.ece.display}（阈值 10.0%），任一达到阈值即停止自动更新。下一轮采样动作：${evidence.nextTrainingAction}`
  return { text, nextAction: evidence.nextTrainingAction }
}

export const evaluatorTrustSpec = defineStrategyCase({
  id: 'evaluator-trust',
  routeId: 'self-evolving',
  routeLabel: 'Self-Evolving',
  title: '让 AI（人工智能）自己评分：何时可以继续闭环？',
  question: '校准 judge（模型评审器）、设置独立审计与停手线后，哪种业务可以进入下一轮自我训练？',
  duration: '预计 5–8 分钟',
  background: '团队要搭“模型出题 → judge 打分 → 自动微调”的闭环。你不只要选择业务，还要调节 judge 校准强度、judge 与被评策略的相关性、人工审计率和停止阈值，再用可核对的小样本决定继续或停手。',
  feedback: '反馈由分桶校准误差、独立人工一致率、未审漏错和审核成本共同形成；只看模型自评通过率会制造回声。',
  controls: [
    {
      id: 'focus',
      label: '先在哪个方向跑闭环',
      type: 'choice',
      options: [
        { value: 'cold-start-traffic', label: '冷启动流量分配' },
        { value: 'monetization-recommendation', label: '作者变现路径推荐' },
        { value: 'moderation-policy', label: '违规内容边界判定' },
      ],
    },
    { id: 'calibrationStrength', label: 'Judge 校准强度', detail: '0% 表示不新增校准；100% 表示完整执行本轮分桶复核。', type: 'range', min: 0, max: 1, step: .1, format: 'percent' },
    { id: 'policyCorrelation', label: 'Judge 与被评策略相关性', detail: '共享训练数据、模型或奖励越多，相关性越高，共同犯错越难发现。', type: 'range', min: 0, max: 1, step: .1, format: 'percent' },
    { id: 'auditRate', label: '独立人工审计率', detail: '每轮随机交给未参与训练的人复核。', type: 'range', min: .05, max: .5, step: .05, format: 'percent' },
    { id: 'stopThreshold', label: '漏错停止阈值（每千次）', detail: '达到该值就停止自动更新，范围限制在 10–200。', type: 'range', min: 10, max: 200, step: 10, format: 'integer' },
  ],
  defaults: DEFAULT_EVALUATOR_TRUST,
  fixedDataTitle: '100 条人工复核小样本（置信度桶：样本数 / judge 置信度 / 人工准确率）',
  fixedDataRows: [
    '冷启动：60%–74%：30 / 68% / 70%；75%–89%：40 / 82% / 80%；90%–100%：30 / 94% / 90%',
    '作者变现：60%–74%：25 / 68% / 60%；75%–89%：45 / 82% / 76%；90%–100%：30 / 94% / 86%',
    '内容治理：60%–74%：30 / 68% / 52%；75%–89%：40 / 82% / 65%；90%–100%：30 / 94% / 72%',
    '计算口径：ECE（期望校准误差）= 各桶 |judge 置信度 − 人工准确率| 按样本数加权；样本仅用于课堂决策。',
  ],
  compute: calculateEvaluatorTrust,
  summarize: summarizeEvaluatorTrust,
})
