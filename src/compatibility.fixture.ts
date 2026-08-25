export const legacyCanonicalPages = [
  'unified-map', 'routes', 'math-primer', 'decision-math', 'labs', 'reviews', 'co-build',
  'strategy-cases', 'strategy-case', 'videos', 'papers', 'paper-lab', 'foundation',
  'foundation-lab', 'distill-course', 'distill-lab', 'progress', 'expert-map', 'expert-llm',
  'expert-image', 'expert-agent', 'expert-lab', 'agent-lab', 'agent-book', 'agent-book-lab',
  'agent-book-review', 'handbook', 'review', 'llm', 'image', 'lab', 'evaluation',
] as const
export const legacyAliases = { map: 'unified-map' } as const
export const legacyRouteKeys = ['module', 'experiment', 'node', 'section', 'chapter', 'card', 'case', 'paper'] as const
export const legacyProgressValues = {
  'foundation:probability': 2,
  'case:context-window-budget': 3,
  'agent-book:ch2': 1,
} as const
export const legacyStorageKeys = [
  'genai-learning-progress-v1', 'genai-learning-persona-v1', 'genai-paper-lesson-progress-v1',
  'genai-resource-loop-v1', 'genai-strategy-evidence-v2', 'case:overconfident:v1:state',
  'probability:trust:v1:state', 'probability:strategy:v3:state',
] as const
