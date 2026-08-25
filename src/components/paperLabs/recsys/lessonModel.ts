import { wideDeepCompute } from './compute.ts'
import { GOLDEN_LESSON_STEPS, nextLessonStep } from '../shared/goldenLessonModel.ts'

export { nextLessonStep }
export const LESSON_STEPS = GOLDEN_LESSON_STEPS
export type RuleChoice = 'history' | 'balanced'

export const LAUNCH_CHOICES = [
  '没有历史数据，先不给流量',
  '先给一小批探索流量，再看真实反馈',
  '仿照热门作者，直接全量推荐',
] as const

export function getGuessFeedback(choice: number) {
  if (choice === 1) return {
    correct: true,
    title: '选得稳：先给机会，再用反馈决定下一步',
    detail: '新作者没有旧成绩，不等于内容一定差；一小批流量既能收集证据，也能控制误推成本。',
  }
  return {
    correct: false,
    title: choice === 0 ? '过于保守：会把新人永远困在零数据里' : '过于激进：相似不代表一定适合全量用户',
    detail: '更稳妥的做法是先给有限机会，再依据真实互动决定加量或回退。',
  }
}

export function getRuleFeedback(choice: RuleChoice) {
  if (choice === 'balanced') return {
    correct: true,
    title: '找到了：旧经验与新机会要一起用',
    detail: '只复用历史会饿死新人；只追求新鲜会放大误推。探索力度决定两者的取舍。',
  }
  return {
    correct: false,
    title: '再想一步：历史冠军不能代表所有新内容',
    detail: '如果永远只按旧成绩分流量，新作者没有机会产生第一批可用反馈。',
  }
}

export function evaluateExploration(exploration: number) {
  const normalized = Math.max(0, Math.min(100, exploration))
  const deepWeight = normalized / 50
  const result = wideDeepCompute({ mode: 'joint', deepWeight })
  const cold = result.rows.find((row) => row.id === 'cold')!
  const popular = result.rows.find((row) => row.id === 'popular')!
  const launchesNewAuthor = cold.probability >= 0.5
  return {
    exploration: normalized,
    computeInput: { mode: 'joint' as const, deepWeight },
    coldProbability: cold.probability,
    popularProbability: popular.probability,
    launchesNewAuthor,
    decision: launchesNewAuthor ? '给新作者一小批首发流量' : '流量继续集中给老作者',
    consequence: launchesNewAuthor ? '新人获得验证机会，同时仍保留热门内容。' : '短期点击更稳，但新人一直没有数据。',
    feedback: launchesNewAuthor ? '已跨过首发门槛；继续观察真实互动，而不是直接全量。' : '探索还不够，新作者仍然拿不到第一批反馈。',
  }
}

export const FINAL_PRINCIPLE = '推荐既要记住过去有效的组合，也要把经验迁移给相似的新内容；探索力度决定新人能否获得第一批验证机会。'
