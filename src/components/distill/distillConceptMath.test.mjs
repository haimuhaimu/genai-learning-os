import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateTeacherDataCoverage, calculateTeacherGap, compareAlignmentOrder, compareDistillationSignal, compareSequenceSupervision, evaluateRetentionGate } from './distillConceptMath.ts'

test('教师与学生差距不足时蒸馏收益有限', () => {
  assert.equal(calculateTeacherGap(72).worthwhile, false)
  assert.equal(calculateTeacherGap(90).worthwhile, true)
  assert.ok(calculateTeacherGap(90).expectedStudent > calculateTeacherGap(72).expectedStudent)
})

test('中间层信号更专用但兼容性和成本更差', () => {
  const logit = compareDistillationSignal('logit')
  const hidden = compareDistillationSignal('hidden')
  assert.ok(hidden.specialization > logit.specialization)
  assert.ok(hidden.compatibility < logit.compatibility)
  assert.ok(hidden.trainingCost > logit.trainingCost)
})

test('On-policy 更接近生产输入但成本更高', () => {
  const teacherAnswer = compareSequenceSupervision(false)
  const onPolicy = compareSequenceSupervision(true)
  assert.ok(onPolicy.productionMatch > teacherAnswer.productionMatch)
  assert.ok(onPolicy.exposureRisk < teacherAnswer.exposureRisk)
  assert.ok(onPolicy.relativeCost > teacherAnswer.relativeCost)
})

test('全教师数据提高目标分但伤害长尾覆盖', () => {
  const balanced = calculateTeacherDataCoverage(55)
  const allTeacher = calculateTeacherDataCoverage(100)
  assert.ok(allTeacher.targetScore > balanced.targetScore)
  assert.ok(allTeacher.longTailScore < balanced.longTailScore)
  assert.ok(allTeacher.dataCost > balanced.dataCost)
})

test('先蒸馏再对齐保留更多能力且减少返工', () => {
  const recommended = compareAlignmentOrder(false)
  const reversed = compareAlignmentOrder(true)
  assert.ok(recommended.capabilityRetention > reversed.capabilityRetention)
  assert.ok(recommended.toneConsistency > reversed.toneConsistency)
  assert.ok(recommended.reworkRounds < reversed.reworkRounds)
})

test('核心能力低于九十分时上线闸门拒绝放行', () => {
  assert.equal(evaluateRetentionGate(89).verdict, 'No-Go')
  assert.equal(evaluateRetentionGate(90).verdict, 'Go')
})
