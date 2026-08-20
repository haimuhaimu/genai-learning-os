import { defineStrategyCase } from './defineStrategyCase.ts'
import type { ControlValues, DecisionEvidence, DecisionSummary } from './types'

const rewardQuestion = '系统学会了完成任务，还是学会了拿到分数？'
const rewardPlans = {
  immediate: { label: '即时奖励', success: 46, hacking: 54, delay: .2, verification: 4 },
  shaping: { label: '过程 shaping', success: 68, hacking: 21, delay: 1.2, verification: 18 },
  verifier: { label: '延迟奖励 + 外部 verifier', success: 82, hacking: 7, delay: 5.8, verification: 42 },
} as const
export const DEFAULT_REWARD = { reward: 'shaping' } as const
export function calculateRewardPolicy(controls: ControlValues): DecisionEvidence {
  const plan = rewardPlans[String(controls.reward) as keyof typeof rewardPlans] ?? rewardPlans.shaping
  return {
    metrics: [
      { id: 'finalSuccess', label: '最终成功率', value: plan.success, display: `${plan.success}%`, emphasis: true },
      { id: 'hackingRisk', label: '作弊风险', value: plan.hacking, display: `${plan.hacking} / 100` },
      { id: 'feedbackDelay', label: '反馈延迟', value: plan.delay, display: `${plan.delay.toFixed(1)} h` },
      { id: 'verificationCost', label: '验证成本', value: plan.verification, display: `${plan.verification} 点` },
    ],
    costs: [
      { label: '验证器', value: `${plan.verification} 成本点` },
      { label: '反馈等待', value: `${plan.delay.toFixed(1)} 小时` },
      { label: '奖励投机', value: `${plan.hacking} / 100` },
    ],
    feedbackSource: '固定多步轨迹同时记录模型自报、环境最终状态与外部 verifier；只有终态可证明任务完成。',
    feedbackSignals: [`最终成功率 ${plan.success}%`, `自报成功与真实成功差距对应 ${plan.hacking} 风险点`],
    nextTrainingAction: plan.hacking > 20 ? '加入自报成功但终态失败的反例，并升级外部验收' : '抽检 verifier 漏判，并保留长延迟成功轨迹',
    caution: '过程奖励能加速学习，也可能被投机；外部 verifier 同样需要版本化与校准。',
  }
}
export function summarizeRewardPolicy(controls: ControlValues, evidence: DecisionEvidence): DecisionSummary {
  const plan = rewardPlans[String(controls.reward) as keyof typeof rewardPlans] ?? rewardPlans.shaping
  const metric = Object.fromEntries(evidence.metrics.map((item) => [item.id, item.display]))
  return { text: `奖励策略：采用“${plan.label}”，最终成功率 ${metric.finalSuccess}、作弊风险 ${metric.hackingRisk}，反馈延迟 ${metric.feedbackDelay}、验证成本 ${metric.verificationCost}。下一轮：${evidence.nextTrainingAction}。复盘问题：${rewardQuestion}`, nextAction: evidence.nextTrainingAction }
}
export const rewardPolicySpec = defineStrategyCase({
  id: 'reward-sequential-policy', routeId: 'ai-decision-math', routeLabel: 'AI 决策数学', title: '单步分数越来越高，为什么任务更容易失败？', question: rewardQuestion, duration: '预计 3–5 分钟',
  background: 'Agent 的单步奖励持续上升，但真实任务完成率下降。固定轨迹显示它学会了提前自报成功与绕过检查。',
  feedback: '反馈必须连接多步轨迹与外部终态；只记录单步分数会奖励看起来正确的失败。',
  controls: [{ id: 'reward', label: '奖励与验证策略', type: 'choice', options: Object.entries(rewardPlans).map(([value, item]) => ({ value, label: item.label })) }],
  defaults: DEFAULT_REWARD,
  fixedDataTitle: '固定多步轨迹（过程分 / 自报 / 外部终态）',
  fixedDataRows: ['T1：9.4 / 成功 / 订单未创建（reward hacking）', 'T2：8.8 / 成功 / 写入错误对象', 'T3：7.1 / 未完成 / 重试后真实成功', 'T4：6.9 / 成功 / verifier 通过', 'T5：9.7 / 成功 / 跳过验收'],
  compute: calculateRewardPolicy, summarize: summarizeRewardPolicy,
})

const propagationQuestion = '我们该优化平均正确率，还是阻止错误继续传播？'
const propagationPlans = {
  gate: { label: '前置强校验', success: 84, cost: 19, manual: 23, disaster: 3 },
  retry: { label: '宽松通过 + retry', success: 80, cost: 11, manual: 6, disaster: 12 },
  fallback: { label: '分支降级 fallback', success: 88, cost: 16, manual: 10, disaster: 5 },
} as const
export const DEFAULT_PROPAGATION = { policy: 'retry' } as const
export function calculateErrorPropagation(controls: ControlValues): DecisionEvidence {
  const plan = propagationPlans[String(controls.policy) as keyof typeof propagationPlans] ?? propagationPlans.retry
  return {
    metrics: [
      { id: 'endToEndSuccess', label: '端到端成功率', value: plan.success, display: `${plan.success}%`, emphasis: true },
      { id: 'averageCost', label: '平均成本', value: plan.cost, display: `${plan.cost} 点 / task` },
      { id: 'humanIntervention', label: '人工介入', value: plan.manual, display: `${plan.manual}%` },
      { id: 'catastrophicRisk', label: '灾难失败风险', value: plan.disaster, display: `${plan.disaster} / 100` },
    ],
    costs: [
      { label: '单任务成本', value: `${plan.cost} 点` },
      { label: '人工队列', value: `${plan.manual}%` },
      { label: '灾难失败', value: `${plan.disaster} / 100` },
    ],
    feedbackSource: '固定五步链路记录每步成功、错误类型与是否继续传播；被 gate 拦截的样本也进入复核集。',
    feedbackSignals: ['无治理复合成功率约 76.5%', `当前灾难失败风险 ${plan.disaster}/100`],
    nextTrainingAction: plan.disaster > 8 ? '把第 3 步权限错误前移为强 gate，并收集 retry 失败链' : '复核 gate 误伤与 fallback 覆盖盲区',
    caution: '逐步平均正确率会隐藏相乘效应；retry 只有在错误可恢复且副作用幂等时才安全。',
  }
}
export function summarizeErrorPropagation(controls: ControlValues, evidence: DecisionEvidence): DecisionSummary {
  const plan = propagationPlans[String(controls.policy) as keyof typeof propagationPlans] ?? propagationPlans.retry
  const metric = Object.fromEntries(evidence.metrics.map((item) => [item.id, item.display]))
  return { text: `链路策略：采用“${plan.label}”，端到端成功率 ${metric.endToEndSuccess}、灾难失败风险 ${metric.catastrophicRisk}，平均成本 ${metric.averageCost}、人工介入 ${metric.humanIntervention}。下一轮：${evidence.nextTrainingAction}。复盘问题：${propagationQuestion}`, nextAction: evidence.nextTrainingAction }
}
export const errorPropagationSpec = defineStrategyCase({
  id: 'error-propagation', routeId: 'ai-decision-math', routeLabel: 'AI 决策数学', title: '每一步只有 5% 错误，为什么整条链路总失败？', question: propagationQuestion, duration: '预计 3–5 分钟',
  background: '五步自动化链路每一步看起来都接近 95% 正确，但错误会被后续步骤放大，最终产生不可逆副作用。',
  feedback: '反馈来自完整状态转移与终止原因；只记录最后一步会丢失首个错误位置。',
  controls: [{ id: 'policy', label: '误差传播治理', type: 'choice', options: Object.entries(propagationPlans).map(([value, item]) => ({ value, label: item.label })) }],
  defaults: DEFAULT_PROPAGATION,
  fixedDataTitle: '固定五步转移（步骤 / 成功率 / 成本）',
  fixedDataRows: ['1 意图识别 / 95% / 1 点', '2 参数抽取 / 96% / 2 点', '3 权限校验 / 92% / 3 点', '4 工具执行 / 97% / 4 点', '5 结果验收 / 94% / 2 点', '复合成功率：0.95×0.96×0.92×0.97×0.94≈76.5%'],
  compute: calculateErrorPropagation, summarize: summarizeErrorPropagation,
})
