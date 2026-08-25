import { foundationNodeSummaries } from './content/foundationSummary'
import type { ProgressMap } from './progress'

export const PERSONA_KEY = 'genai-learning-persona-v1'
export const PERSONA_CHANGE_EVENT = 'genai-persona-change'

export type PersonaId = 'strategy' | 'product' | 'engineering' | 'beginner'

export type Persona = {
  id: PersonaId
  label: string
  description: string
  startNode: string
  startReason: string
}

export type NextStep = {
  eyebrow: string
  title: string
  description: string
  page: string
  options?: Record<string, string>
}

export const personas: Persona[] = [
  { id: 'strategy', label: '策略产品 / 运营', description: '需要判断方案、指标与上线风险', startNode: 'probability', startReason: '先建立概率、分布与评估口径，再进入系统评审。' },
  { id: 'product', label: 'AI 应用产品', description: '正在设计 LLM 或 Agent 产品', startNode: 'softmax', startReason: '从输出分布和温度入手，快速连接模型行为与产品决策。' },
  { id: 'engineering', label: '研发 / 架构', description: '关注机制、性能与可靠性', startNode: 'transformer-block', startReason: '从 Transformer 结构切入，再补齐训练与分布基础。' },
  { id: 'beginner', label: '纯新手', description: '想建立完整而不绕路的认知', startNode: 'probability', startReason: '从最小数学直觉开始，按先修关系逐步推进。' },
]

export function readPersona(): PersonaId {
  try {
    const value = localStorage.getItem(PERSONA_KEY) as PersonaId | null
    return personas.some((persona) => persona.id === value) ? value! : 'beginner'
  } catch {
    return 'beginner'
  }
}

export function savePersona(persona: PersonaId) {
  try {
    localStorage.setItem(PERSONA_KEY, persona)
    window.dispatchEvent(new CustomEvent(PERSONA_CHANGE_EVENT))
  } catch {
    // localStorage may be unavailable in privacy-restricted contexts.
  }
}

export function getPersona(persona: PersonaId) {
  return personas.find((item) => item.id === persona) ?? personas[3]
}

export function getNextStep(progress: ProgressMap, persona: PersonaId): NextStep {
  const profile = getPersona(persona)
  const preferred = foundationNodeSummaries.find((node) => node.id === profile.startNode)
  if (preferred && (progress[preferred.id] ?? 0) === 0) {
    return {
      eyebrow: `${profile.label} · 推荐起点`,
      title: `${preferred.code} · ${preferred.title}`,
      description: profile.startReason,
      page: 'foundation',
      options: { node: preferred.id },
    }
  }

  const inProgress = foundationNodeSummaries.find((node) => (progress[node.id] ?? 0) > 0 && (progress[node.id] ?? 0) < 4)
  if (inProgress) {
    return {
      eyebrow: '继续完成学习闭环',
      title: `${inProgress.code} · ${inProgress.title}`,
      description: '你已经开始这个节点，继续完成手算、实验与评审，避免知识停在“看懂”。',
      page: 'foundation',
      options: { node: inProgress.id },
    }
  }

  const nextFoundation = foundationNodeSummaries.find((node) => (progress[node.id] ?? 0) < 4)
  if (nextFoundation) {
    return {
      eyebrow: '建议主线 · 算法基础',
      title: `${nextFoundation.code} · ${nextFoundation.title}`,
      description: '沿先修关系推进一个节点，完成理解、手算、实验、评审四阶段闭环。',
      page: 'foundation',
      options: { node: nextFoundation.id },
    }
  }

  const destination = persona === 'engineering' ? 'expert-llm' : 'expert-agent'
  return {
    eyebrow: '基础路线已完成',
    title: persona === 'engineering' ? '进入 LLM 系统路线' : '进入 Agent 系统路线',
    description: '把算法机制放进完整系统中，继续学习架构、诊断与上线判断。',
    page: destination,
  }
}
