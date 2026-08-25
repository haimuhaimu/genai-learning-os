export const legacyCanonicalPages = [
  'unified-map', 'routes', 'math-primer', 'decision-math', 'labs', 'reviews', 'co-build',
  'strategy-cases', 'strategy-case', 'videos', 'papers', 'paper-lab', 'foundation',
  'foundation-lab', 'distill-course', 'distill-lab', 'progress', 'expert-map', 'expert-llm',
  'expert-image', 'expert-agent', 'expert-lab', 'agent-lab', 'agent-book', 'agent-book-lab',
  'agent-book-review', 'handbook', 'review', 'llm', 'image', 'lab', 'evaluation', 'toolbox',
] as const
export const legacyPrimaryNavigation = [
  ['首页', 'unified-map'], ['学堂', 'routes'], ['案例', 'strategy-cases'], ['实验室', 'labs'], ['工具箱', 'toolbox'],
] as const
export const legacyAliases = { map: 'unified-map' } as const
export const legacyRouteKeys = ['module', 'experiment', 'node', 'section', 'chapter', 'card', 'case', 'paper'] as const
export const legacyCaseDeepLinks = ['context-window-budget', 'rag-chunking'] as const
export const legacyProgressValues = { 'foundation:probability': 2, 'case:context-window-budget': 3, 'agent-book:ch2': 1 } as const
export const legacyResourceRecord = { caseId: 'context-window-budget', initialJudgment: '先控制输入', reviewJudgment: '再核对证据', resources: [], updatedAt: '2026-08-25T01:00:00.000Z' } as const
export const legacyEvidenceRecord = { caseId: 'context-window-budget', routeId: 'llm', level: 2, controls: { window: 16000 }, metrics: [], summaryText: '旧策略', updatedAt: '2026-08-25T01:00:00.000Z' } as const
export const legacyStorageKeys = [
  'genai-learning-progress-v1', 'genai-learning-persona-v1', 'genai-paper-lesson-progress-v1',
  'genai-resource-loop-v1', 'genai-strategy-evidence-v2', 'case:overconfident:v1:state',
  'probability:trust:v1:state', 'probability:strategy:v3:state',
] as const
