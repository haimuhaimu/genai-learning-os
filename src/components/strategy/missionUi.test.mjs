import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (name) => readFile(new URL(name, import.meta.url), 'utf8')
const [runner, prediction, comparison, stress, debrief, controls] = await Promise.all([
  read('./StrategyCaseRunner.tsx'), read('./StrategyPredictionPanel.tsx'), read('./MissionComparisonPanel.tsx'), read('./MissionStressPanel.tsx'), read('./MissionDebriefCard.tsx'), read('./StrategyControlsPanel.tsx'),
])

test('无 mission 分支保持预测、控件、机制、证据、摘要与资源顺序', () => {
  const shared = runner.slice(runner.indexOf('const shared'), runner.indexOf('const shellProps'))
  const branch = runner.slice(runner.indexOf('if (!spec.mission)'), runner.lastIndexOf('const phase'))
  const ordered = ['StrategyPredictionPanel', 'StrategyControlsPanel', 'MechanismSandboxPanel', 'EvidencePanel']
  let cursor = -1
  for (const item of ordered) { const next = shared.indexOf(item, cursor + 1); assert.ok(next > cursor, `${item} 应保持旧顺序`); cursor = next }
  assert.match(branch, /shared.*DecisionSummaryPanel.*resources/)
  assert.doesNotMatch(branch, /MissionBrief|MissionComparisonPanel|MissionStressPanel|MissionDebriefCard/)
})

test('mission runner 编排完整显式任务流', () => {
  for (const component of ['MissionBrief', 'MissionComparisonPanel', 'MissionStressPanel', 'MissionDebriefCard']) assert.match(runner, new RegExp(`<${component}`))
  assert.match(runner, /predictionLocked/); assert.match(runner, /deriveMissionPhase/); assert.match(runner, /onFormed/)
})

test('预测锁定、重开确认与取消焦点契约存在', () => {
  assert.match(prediction, /prediction-locked/); assert.match(prediction, /role='alertdialog'/)
  assert.match(prediction, /确认重开/); assert.match(prediction, /triggerRef\.current\?\.focus/); assert.match(prediction, /inputRef\.current\?\.focus/)
})

test('快照明确替换、压力返回稳定控件、复盘复制降级均可达', () => {
  assert.match(comparison, /替换快照/); assert.match(comparison, /saveMissionSnapshot/)
  assert.match(stress, /runStressPreset/); assert.match(stress, /strategy-\$\{id\}/); assert.match(stress, /未通过/)
  assert.match(debrief, /navigator\.clipboard/); assert.match(debrief, /textRef\.current\?\.select/); assert.match(debrief, /形成策略摘要后解锁/)
  assert.match(controls, /fieldset id=\{`strategy-\$\{control\.id\}`\}/)
})
