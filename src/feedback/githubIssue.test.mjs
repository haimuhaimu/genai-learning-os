import assert from 'node:assert/strict'
import test from 'node:test'
import { buildFeedbackIssueTitle, buildFeedbackMarkdown, buildGitHubIssueUrl, clipFeedbackText, MAX_FEEDBACK_TEXT_LENGTH } from './githubIssue.ts'

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

test('Issue 标题用固定评价信号帮助分流且不暴露自由文本', () => {
  const lowSignalDraft = {
    learningGain: '2',
    depth: 'too-shallow',
    workTransfer: 'unsure',
    blocker: '包含不应进入标题的自由文本',
    suggestion: '',
  }
  const expectedTitle = '学习反馈：2/5 · 偏浅 · 工作迁移：还不确定'

  assert.equal(buildFeedbackIssueTitle(lowSignalDraft), expectedTitle)
  assert.equal(new URL(buildGitHubIssueUrl(lowSignalDraft)).searchParams.get('title'), expectedTitle)
  assert.doesNotMatch(buildFeedbackIssueTitle(lowSignalDraft), /自由文本/)
  assert.equal(buildFeedbackIssueTitle({ ...lowSignalDraft, learningGain: '', depth: '', workTransfer: '' }), '学习反馈：帮助我们改进 GenAI Learning OS')
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
