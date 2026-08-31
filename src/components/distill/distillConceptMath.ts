export type DistillationSignal = 'logit' | 'hidden' | 'attention'

export function calculateTeacherGap(teacherScore: number) {
  const studentBaseline = 65
  const safeTeacher = Math.min(98, Math.max(studentBaseline, Math.round(teacherScore)))
  const gap = safeTeacher - studentBaseline
  const expectedStudent = Math.min(safeTeacher - 2, studentBaseline + Math.round(gap * 0.6))
  return { teacherScore: safeTeacher, studentBaseline, gap, expectedStudent, worthwhile: gap >= 10 }
}

export function compareDistillationSignal(signal: DistillationSignal) {
  const options = {
    logit: { compatibility: 95, trainingCost: 100, specialization: 65 },
    hidden: { compatibility: 60, trainingCost: 135, specialization: 88 },
    attention: { compatibility: 45, trainingCost: 150, specialization: 82 },
  }
  return { signal, ...options[signal] }
}

export function compareSequenceSupervision(onPolicy: boolean) {
  return onPolicy
    ? { mode: '学生先回答，再请教师纠正', productionMatch: 85, exposureRisk: 15, relativeCost: 230 }
    : { mode: '直接学习教师完整答案', productionMatch: 55, exposureRisk: 55, relativeCost: 100 }
}

export function calculateTeacherDataCoverage(teacherShare: number) {
  const safeShare = Math.min(100, Math.max(0, Math.round(teacherShare)))
  return {
    teacherShare: safeShare,
    targetScore: Math.round(60 + safeShare * 0.3),
    longTailScore: Math.round(88 - safeShare * 0.5),
    dataCost: Math.round(40 + safeShare * 0.8),
  }
}

export function compareAlignmentOrder(alignmentFirst: boolean) {
  return alignmentFirst
    ? { order: '先偏好对齐 → 再蒸馏', capabilityRetention: 82, toneConsistency: 86, reworkRounds: 3 }
    : { order: '先能力蒸馏 → 再偏好对齐', capabilityRetention: 95, toneConsistency: 92, reworkRounds: 1 }
}

export function evaluateRetentionGate(retention: number) {
  const safeRetention = Math.min(99, Math.max(70, Math.round(retention)))
  return { retention: safeRetention, threshold: 90, verdict: safeRetention >= 90 ? 'Go' : 'No-Go', gap: safeRetention - 90 }
}
