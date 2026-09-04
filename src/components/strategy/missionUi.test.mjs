import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { contextWindowBudgetSpec } from './mechanismCases.ts'
import { deriveMissionPhase, getMissionCompletionGate } from './missionEngine.ts'

const read = (name) => readFile(new URL(name, import.meta.url), 'utf8')
const [runner, prediction, comparison, stressSource, debrief, controls, summarySource] = await Promise.all([
  read('./StrategyCaseRunner.tsx'), read('./StrategyPredictionPanel.tsx'), read('./MissionComparisonPanel.tsx'), read('./MissionStressPanel.tsx'), read('./MissionDebriefCard.tsx'), read('./StrategyControlsPanel.tsx'), read('./DecisionSummaryPanel.tsx'),
])

const schema = contextWindowBudgetSpec.controls
const currentControls = { ...contextWindowBudgetSpec.defaults }
const predictionEvidence = { text: '先保留系统约束', lockedAt: '2026-08-26T01:00:00.000Z' }
const stress = (passed) => ({
  presetId: 'eight-k-window', passed,
  baseControls: { ...currentControls },
  effectiveControls: { ...currentControls, window: 8000 },
  metrics: [], ranAt: '2026-08-26T02:00:00.000Z',
})

test('无 mission 分支保持预测、控件、机制、证据、摘要与资源顺序', () => {
  const shared = runner.slice(runner.indexOf('const shared'), runner.indexOf('const shellProps'))
  const branch = runner.slice(runner.indexOf('if (!spec.mission)'), runner.indexOf('const completionGate'))
  const ordered = ['StrategyPredictionPanel', 'StrategyControlsPanel', 'MechanismSandboxPanel', 'EvidencePanel']
  let cursor = -1
  for (const item of ordered) { const next = shared.indexOf(item, cursor + 1); assert.ok(next > cursor, `${item} 应保持旧顺序`); cursor = next }
  assert.match(branch, /shared.*DecisionSummaryPanel.*resources/)
  assert.doesNotMatch(branch, /MissionBrief|MissionComparisonPanel|MissionStressPanel|MissionDebriefCard/)
  assert.match(branch, /if \(!spec\.mission\)/)
})

test('mission runner 共享完成门槛且保存回调再次校验', () => {
  for (const component of ['MissionBrief', 'MissionComparisonPanel', 'MissionStressPanel', 'MissionDebriefCard']) assert.match(runner, new RegExp(`<${component}`))
  assert.match(runner, /getMissionCompletionGate/)
  assert.match(runner, /if \(!gate\.ready/)
  assert.match(runner, /formationGate=\{completionGate\}/)
  assert.match(runner, /freshness=\{completionGate\.stressFreshness\}/)
  assert.match(summarySource, /formationGate && !formationGate\.ready/)
  assert.match(summarySource, /disabled=\{formationGate \? !formationGate\.ready : false\}/)
})

test('五条 Mission 路径按行为证据推进而非源码存在性', () => {
  const noPrediction = getMissionCompletionGate({ schema, currentControls, stress: stress(true) })
  assert.equal(noPrediction.ready, false)
  assert.equal(deriveMissionPhase({ predictionLocked: false, lastStress: stress(true), formed: true, completionGate: noPrediction }), 'draft')

  const noStress = getMissionCompletionGate({ prediction: predictionEvidence, schema, currentControls })
  assert.equal(noStress.ready, false)
  assert.equal(deriveMissionPhase({ predictionLocked: true, formed: true, completionGate: noStress }), 'prediction-locked')

  const changed = getMissionCompletionGate({ prediction: predictionEvidence, schema, currentControls: { ...currentControls, retrievalK: 10 }, stress: stress(true) })
  assert.equal(changed.ready, false)
  assert.equal(deriveMissionPhase({ predictionLocked: true, explored: true, lastStress: stress(true), formed: true, completionGate: changed }), 'exploring')

  const failed = getMissionCompletionGate({ prediction: predictionEvidence, schema, currentControls, stress: stress(false) })
  assert.equal(failed.ready, true)
  assert.equal(deriveMissionPhase({ predictionLocked: true, lastStress: stress(false), formed: true, completionGate: failed }), 'debrief')

  const passed = getMissionCompletionGate({ prediction: predictionEvidence, schema, currentControls, stress: stress(true) })
  assert.equal(passed.ready, true)
  assert.equal(deriveMissionPhase({ predictionLocked: true, lastStress: stress(true), formed: true, completionGate: passed }), 'debrief')
})

test('预测锁定、重开确认与取消焦点契约存在', () => {
  assert.match(prediction, /prediction-locked/); assert.match(prediction, /role='alertdialog'/)
  assert.match(prediction, /确认重开/); assert.match(prediction, /triggerRef\.current\?\.focus/); assert.match(prediction, /inputRef\.current\?\.focus/)
})

test('快照替换、压力过期、停止提前写证据与复盘复制降级均可达', () => {
  assert.match(comparison, /替换快照/); assert.match(comparison, /saveMissionSnapshot/)
  assert.match(stressSource, /baseControls/); assert.match(stressSource, /effectiveControls/); assert.match(stressSource, /压力结果已过期，请按当前策略重跑/)
  assert.doesNotMatch(stressSource, /saveStrategyEvidence/)
  assert.match(debrief, /navigator\.clipboard/); assert.match(debrief, /textRef\.current\?\.select/); assert.match(debrief, /形成策略摘要后解锁/)
  assert.match(controls, /fieldset id=\{`strategy-\$\{control\.id\}`\}/)
})
