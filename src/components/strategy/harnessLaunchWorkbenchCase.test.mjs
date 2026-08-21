import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assessHarnessLaunch,
  calculateHarnessLaunch,
  DEFAULT_HARNESS_LAUNCH,
  summarizeHarnessLaunch,
} from './harnessLaunchWorkbenchCase.ts'

const controls = (overrides = {}) => ({ ...DEFAULT_HARNESS_LAUNCH, ...overrides })

function metric(evidence, id) {
  return evidence.metrics.find((item) => item.id === id)
}

test('缺自动验证时直接 NO-GO，硬 veto 优先于高分', () => {
  const input = controls({ automaticVerification: false })
  const result = assessHarnessLaunch(input)

  assert.equal(result.decision, 'NO-GO')
  assert.ok(result.score >= 85)
  assert.deepEqual(result.vetoes, ['缺少可自动执行的结果验证'])
  assert.match(result.nextAction, /先解除硬否决/)
})

test('缺回滚路径时直接 NO-GO', () => {
  const result = assessHarnessLaunch(controls({ rollbackReady: false }))

  assert.equal(result.decision, 'NO-GO')
  assert.deepEqual(result.vetoes, ['缺少已演练的回滚路径'])
  assert.match(result.nextAction, /回滚路径/)
})

test('高风险且证据不足时触发证据硬 veto', () => {
  const input = controls({ riskLevel: 'high', evidenceCount: 100 })
  const result = assessHarnessLaunch(input)
  const evidence = calculateHarnessLaunch(input)

  assert.equal(result.decision, 'NO-GO')
  assert.deepEqual(result.vetoes, ['高风险场景证据不足 120 条'])
  assert.equal(metric(evidence, 'decision').display, 'NO-GO')
  assert.equal(metric(evidence, 'evidence').display, '100 / 120 条')
})

test('闭环全部齐备时给出 GO 和可执行下一步', () => {
  const result = assessHarnessLaunch(DEFAULT_HARNESS_LAUNCH)
  const evidence = calculateHarnessLaunch(DEFAULT_HARNESS_LAUNCH)

  assert.deepEqual(result, {
    decision: 'GO',
    score: 100,
    vetoes: [],
    requiredEvidence: 120,
    nextAction: '按5% 可回滚流量启动，持续运行自动验证；任一硬否决条件触发时立即回滚并由纠偏责任人复盘。',
  })
  assert.equal(metric(evidence, 'closedSteps').display, '6 / 6')
})

test('无硬 veto 但就绪分不足时 HOLD，且策略摘要稳定可复制', () => {
  const input = controls({ goalQuality: 'directional', contextQuality: 'partial', toolContract: 'basic' })
  const first = summarizeHarnessLaunch(input, calculateHarnessLaunch(input))
  const second = summarizeHarnessLaunch({ ...input }, calculateHarnessLaunch({ ...input }))

  assert.equal(assessHarnessLaunch(input).decision, 'HOLD')
  assert.deepEqual(first, second)
  assert.equal(first.text, `Harness 上线策略｜决策：HOLD（就绪分 79/100；硬 veto 优先）
Goal：只有方向性目标。
Context：高风险；只覆盖主流程。
Tools：只有基础输入输出约定。
Constrain：首发范围为5% 可回滚流量。
Verify：自动验证已配置；固定证据 120/120 条。
Correct：回滚已演练；纠偏责任人已指定。
硬 veto：无。
下一步：保持在沙箱，不扩大流量；优先把 Goal 改成可度量指标与阈值；补齐 Context 的边界与失败场景；完善 Tools 的权限、超时与幂等契约，再重新评分。`)
})
