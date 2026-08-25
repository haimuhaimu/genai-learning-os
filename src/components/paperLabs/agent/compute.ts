export type ReactMode = 'direct' | 'cot' | 'react'
export type ReactInput = { mode: ReactMode; conflict: boolean; toolsAvailable: boolean; budget: number }
export type TrajectoryStep = { kind: 'thought' | 'action' | 'observation' | 'answer' | 'stop'; text: string }
export type ReactResolution = 'completed' | 'manual-review' | 'blocked' | 'unsafe'
export type ReactResult = { steps: TrajectoryStep[]; success: boolean; resolution: ReactResolution; failureAt: string }

export function reactCompute(input: ReactInput): ReactResult {
  const budget = Math.max(1, Math.min(6, Math.round(input.budget)))
  const steps: TrajectoryStep[] = []
  if (input.mode === 'direct') {
    steps.push({ kind: 'answer', text: '直接依据记忆回答：订单可退款。' })
    return {
      steps,
      success: !input.conflict,
      resolution: input.conflict ? 'unsafe' : 'completed',
      failureAt: input.conflict ? '停止条件：未获取外部观察就输出答案。' : '',
    }
  }
  steps.push({ kind: 'thought', text: '先判断退款资格与订单状态。' })
  if (input.mode === 'cot') {
    steps.push({ kind: 'thought', text: '在内部推理中假设订单状态正常。' }, { kind: 'answer', text: '给出退款建议，但没有工具证据。' })
    const success = !input.conflict && budget >= 3
    return { steps: steps.slice(0, budget), success, resolution: success ? 'completed' : 'blocked', failureAt: '工具：CoT-only 没有调用订单查询工具。' }
  }
  if (!input.toolsAvailable) {
    steps.push({ kind: 'stop', text: '订单工具不可用，转人工而不是猜测。' })
    return { steps: steps.slice(0, budget), success: false, resolution: 'manual-review', failureAt: '工具：查询能力受限，安全停止。' }
  }
  steps.push({ kind: 'action', text: '调用 order.lookup(orderId)' })
  if (budget < 3) return { steps: steps.slice(0, budget), success: false, resolution: 'blocked', failureAt: '预算：观察返回前已达到行动上限。' }
  steps.push({ kind: 'observation', text: input.conflict ? '观察冲突：支付记录成功，但履约记录显示已退款。' : '观察一致：已支付、未履约、未退款。' })
  if (input.conflict) {
    if (budget < 5) return { steps: steps.slice(0, budget), success: false, resolution: 'blocked', failureAt: '顺序：发现冲突但预算不足以核验后再回答。' }
    steps.push({ kind: 'thought', text: '冲突观察不能直接采用，进入核验分支。' })
    steps.push({ kind: 'action', text: '调用 payment.verify(orderId)' })
    if (budget < 6) return { steps: steps.slice(0, budget), success: false, resolution: 'blocked', failureAt: '停止条件：核验后仍需保守转人工。' }
    steps.push({ kind: 'stop', text: '状态冲突，暂停自动退款并转人工核验。' })
    return { steps: steps.slice(0, budget), success: true, resolution: 'manual-review', failureAt: '' }
  }
  steps.push({ kind: 'answer', text: '证据一致，进入有确认门的退款流程。' })
  const success = budget >= 4
  return { steps: steps.slice(0, budget), success, resolution: success ? 'completed' : 'blocked', failureAt: success ? '' : '预算：最终答案前停止。' }
}
