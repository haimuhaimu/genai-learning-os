import type { ProgressMap } from '../progress'

export const K3_STEP_IDS = ['goal', 'runtime', 'model', 'infer', 'api', 'evaluate'] as const
export type K3StepId = typeof K3_STEP_IDS[number]

export const K3_COURSE_STEPS = [
  { id: 'goal', title: 'Token 化', lead: '先输入一句话，亲手把它拆成模型能接收的小块。' },
  { id: 'runtime', title: '预测下一个 Token', lead: '给模型一句没说完的话，看它怎样给几个下一步排队。' },
  { id: 'model', title: '训练前后对比', lead: '让一个只会乱猜的小模型看几轮正确答案，观察它的选择怎样移动。' },
  { id: 'infer', title: '上下文影响', lead: '同一个问题，只加一小段上文，看看回答会不会改变。' },
  { id: 'api', title: '续写变聊天', lead: '把一段普通续写，装进“谁说了什么”的消息结构里。' },
  { id: 'evaluate', title: '回看 K3', lead: '把一个 Token 送进 K3 的“专家团队”，看它如何只叫一小组人上场。' },
] as const satisfies readonly { id: K3StepId; title: string; lead: string }[]

export const k3ProgressKey = (id: K3StepId) => `k3:concept:${id}`
// Old build:* keys described a different worksheet. Keep them, but do not
// reinterpret a task-definition worksheet as completion of Token 化.
export const k3StepStage = (progress: ProgressMap, id: K3StepId) => progress[k3ProgressKey(id)] ?? 0
export const isK3StepDone = (progress: ProgressMap, id: K3StepId) => k3StepStage(progress, id) >= 4

export function isK3StepUnlocked(progress: ProgressMap, id: K3StepId) {
  return isK3StepDone(progress, id) || K3_STEP_IDS.slice(0, K3_STEP_IDS.indexOf(id)).every((previous) => isK3StepDone(progress, previous))
}

export function getK3Entry(progress: ProgressMap, requested?: string): { step: K3StepId; notice: string } {
  const next = K3_STEP_IDS.find((id) => !isK3StepDone(progress, id)) ?? 'evaluate'
  if (!requested) return { step: next, notice: '' }
  const step = K3_STEP_IDS.find((id) => id === requested)
  if (!step) return { step: next, notice: '这个实验入口已失效，已打开当前可继续的一关。' }
  if (isK3StepUnlocked(progress, step)) return { step, notice: '' }
  const prerequisite = K3_COURSE_STEPS.find((item) => item.id === next)!
  return { step: next, notice: `「${K3_COURSE_STEPS.find((item) => item.id === step)!.title}」尚未解锁。请先完成「${prerequisite.title}」。` }
}
