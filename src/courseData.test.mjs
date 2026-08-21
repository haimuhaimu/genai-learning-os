import assert from 'node:assert/strict'
import test from 'node:test'
import { imageChapters, llmChapters } from './courseData.ts'

const chapters = [...llmChapters, ...imageChapters]

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0

test('LLM 与图像课程每章都有完整深度练习字段', () => {
  assert.ok(chapters.length > 0)
  for (const chapter of chapters) {
    for (const field of ['id', 'no', 'title', 'subtitle', 'concept', 'formula']) {
      assert.ok(isNonEmptyString(chapter[field]), `${chapter.id || '未知章节'} 缺少 ${field}`)
    }
    for (const field of ['controls', 'questions', 'failures']) {
      assert.ok(Array.isArray(chapter[field]) && chapter[field].length > 0, `${chapter.id} 缺少 ${field}`)
      assert.ok(chapter[field].every(isNonEmptyString), `${chapter.id} 的 ${field} 存在空值`)
    }
    assert.equal(typeof chapter.quiz?.answer, 'boolean', `${chapter.id} 缺少 quiz.answer`)
    assert.ok(isNonEmptyString(chapter.quiz?.statement), `${chapter.id} 缺少 quiz.statement`)
    assert.ok(isNonEmptyString(chapter.quiz?.explanation), `${chapter.id} 缺少 quiz.explanation`)

    assert.ok(Array.isArray(chapter.prerequisites) && chapter.prerequisites.length > 0, `${chapter.id} 缺少 prerequisites`)
    assert.ok(chapter.prerequisites.every(isNonEmptyString), `${chapter.id} 的 prerequisites 存在空值`)

    assert.ok(isNonEmptyString(chapter.workedExample?.scenario), `${chapter.id} 缺少 workedExample.scenario`)
    assert.ok(Array.isArray(chapter.workedExample?.steps) && chapter.workedExample.steps.length > 0, `${chapter.id} 缺少 workedExample.steps`)
    assert.ok(chapter.workedExample.steps.every(isNonEmptyString), `${chapter.id} 的 workedExample.steps 存在空值`)
    assert.ok(isNonEmptyString(chapter.workedExample?.result), `${chapter.id} 缺少 workedExample.result`)
    assert.ok(isNonEmptyString(chapter.workedExample?.productDecision), `${chapter.id} 缺少 workedExample.productDecision`)

    assert.ok(isNonEmptyString(chapter.microExercise?.prompt), `${chapter.id} 缺少 microExercise.prompt`)
    assert.ok(isNonEmptyString(chapter.microExercise?.lowHint), `${chapter.id} 缺少偏低错误提示`)
    assert.ok(isNonEmptyString(chapter.microExercise?.highHint), `${chapter.id} 缺少偏高错误提示`)
    assert.ok(isNonEmptyString(chapter.microExercise?.productConnection), `${chapter.id} 缺少产品决策联系`)

    assert.ok(isNonEmptyString(chapter.transferPrompt?.title), `${chapter.id} 缺少 transferPrompt.title`)
    assert.ok(isNonEmptyString(chapter.transferPrompt?.template), `${chapter.id} 缺少 transferPrompt.template`)
  }
})

test('每章标准答案有限且误差为非负有限数', () => {
  for (const chapter of chapters) {
    assert.ok(Number.isFinite(chapter.microExercise.standardAnswer), `${chapter.id} 的答案必须有限`)
    assert.ok(Number.isFinite(chapter.microExercise.tolerance), `${chapter.id} 的误差必须有限`)
    assert.ok(chapter.microExercise.tolerance >= 0, `${chapter.id} 的误差不能为负`)
  }
})
