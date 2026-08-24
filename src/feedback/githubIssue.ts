import { routeContextEntries, type FeedbackRouteContext } from './routeContext'

export const GITHUB_ISSUE_URL = 'https://github.com/haimuhaimu/genai-learning-os/issues/new'
export const MAX_FEEDBACK_TEXT_LENGTH = 1200

export type FeedbackDraft = {
  learningGain: '' | '1' | '2' | '3' | '4' | '5'
  depth: '' | 'too-shallow' | 'right' | 'too-deep'
  workTransfer: '' | 'no' | 'unsure' | 'yes'
  blocker: string
  suggestion: string
}

export const emptyFeedbackDraft: FeedbackDraft = {
  learningGain: '',
  depth: '',
  workTransfer: '',
  blocker: '',
  suggestion: '',
}

const depthLabels: Record<FeedbackDraft['depth'], string> = {
  '': '未选择',
  'too-shallow': '偏浅',
  right: '合适',
  'too-deep': '偏深',
}
const transferLabels: Record<FeedbackDraft['workTransfer'], string> = {
  '': '未选择',
  no: '暂时不能',
  unsure: '还不确定',
  yes: '可以',
}

export function clipFeedbackText(value: string, maxLength = MAX_FEEDBACK_TEXT_LENGTH) {
  const normalized = value.replace(/\r\n?/g, '\n').trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

function answer(value: string) {
  return clipFeedbackText(value) || '未填写'
}

export function buildFeedbackMarkdown(draft: FeedbackDraft, routeContext?: FeedbackRouteContext) {
  const gain = draft.learningGain ? `${draft.learningGain} / 5` : '未选择'
  const routeLines = routeContext
    ? routeContextEntries(routeContext).map(([key, value]) => `- ${key}: ${value}`)
    : []

  return [
    '# 学习反馈',
    '',
    '## 快速评价',
    `- 收获程度：${gain}`,
    `- 难度 / 深度：${depthLabels[draft.depth]}`,
    `- 能否迁移到工作：${transferLabels[draft.workTransfer]}`,
    '',
    '## 最大卡点',
    answer(draft.blocker),
    '',
    '## 建议',
    answer(draft.suggestion),
    '',
    '## 页面上下文（可选）',
    ...(routeLines.length ? routeLines : ['未附带页面上下文。']),
    '',
    '> 隐私说明：本反馈不包含本地学习进度、策略摘要、浏览器 UA 或其他 localStorage 数据。',
  ].join('\n')
}

export function buildGitHubIssueUrl(draft: FeedbackDraft, routeContext?: FeedbackRouteContext) {
  const url = new URL(GITHUB_ISSUE_URL)
  url.searchParams.set('title', '学习反馈：帮助我们改进 GenAI Learning OS')
  url.searchParams.set('body', buildFeedbackMarkdown(draft, routeContext))
  return url.toString()
}
