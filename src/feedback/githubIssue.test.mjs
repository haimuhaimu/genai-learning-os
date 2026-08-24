import assert from 'node:assert/strict'
import test from 'node:test'
import { buildFeedbackMarkdown, buildGitHubIssueUrl, clipFeedbackText, MAX_FEEDBACK_TEXT_LENGTH } from './githubIssue.ts'

const draft = {
  learningGain: '4',
  depth: 'right',
  workTransfer: 'yes',
  blocker: '公式里的 ? 与 # 不好理解',
  suggestion: '增加中文例子 / 对照表',
}

test('Issue URL 正确编码中文和 URL 特殊字符', () => {
  const markdown = buildFeedbackMarkdown(draft, { page: 'foundation', section: 'hand-calc' })
  const issueUrl = buildGitHubIssueUrl(draft, { page: 'foundation', section: 'hand-calc' })
  const url = new URL(issueUrl)
  assert.equal(url.origin + url.pathname, 'https://github.com/haimuhaimu/genai-learning-os/issues/new')
  assert.match(issueUrl, /%3F/)
  assert.match(issueUrl, /%23/)
  assert.doesNotMatch(issueUrl, /公式里的/)
  assert.equal(url.searchParams.get('body'), markdown)
  assert.match(url.searchParams.get('title'), /学习反馈/)
  assert.match(markdown, /公式里的 \? 与 # 不好理解/)
})

test('反馈文本规范化、裁剪且输出稳定', () => {
  const oversized = `  第一行\r\n${'学'.repeat(MAX_FEEDBACK_TEXT_LENGTH)}  `
  const clipped = clipFeedbackText(oversized)
  assert.equal(clipped.length, MAX_FEEDBACK_TEXT_LENGTH)
  assert.ok(clipped.startsWith('第一行\n'))
  assert.ok(clipped.endsWith('…'))
  assert.equal(buildFeedbackMarkdown(draft), buildFeedbackMarkdown({ ...draft }))
  assert.doesNotMatch(buildFeedbackMarkdown(draft), /page: foundation/)
})
