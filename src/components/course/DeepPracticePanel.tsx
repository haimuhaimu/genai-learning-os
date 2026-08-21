import { useEffect, useMemo, useState } from 'react'
import { Calculator, Check, Clipboard, ClipboardCheck, RotateCcw, ShieldCheck } from 'lucide-react'
import type { Chapter } from '../../courseData'
import { markProgress } from '../../progress'
import { canCompleteHandCalculation } from './practiceProgress'

type Props = {
  chapter: Chapter
}

export default function DeepPracticePanel({ chapter }: Props) {
  const [checked, setChecked] = useState<boolean[]>(() => chapter.prerequisites.map(() => false))
  const [rawAnswer, setRawAnswer] = useState('')
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [reviewConfirmed, setReviewConfirmed] = useState(false)
  const [reviewed, setReviewed] = useState(false)

  const prerequisitesReady = checked.every(Boolean)
  const answer = Number(rawAnswer)
  const hasAnswer = rawAnswer.trim() !== '' && Number.isFinite(answer)
  const isCorrect = hasAnswer && Math.abs(answer - chapter.microExercise.standardAnswer) <= chapter.microExercise.tolerance
  const answerRange = useMemo(() => {
    const { standardAnswer, tolerance } = chapter.microExercise
    if (tolerance === 0) return `${standardAnswer}`
    return `${standardAnswer - tolerance} ～ ${standardAnswer + tolerance}`
  }, [chapter.microExercise])

  useEffect(() => {
    if (canCompleteHandCalculation(prerequisitesReady, isCorrect)) markProgress(chapter.id, 2)
  }, [chapter.id, isCorrect, prerequisitesReady])

  const togglePrerequisite = (index: number) => {
    setChecked((current) => current.map((value, itemIndex) => itemIndex === index ? !value : value))
  }

  const copyTemplate = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable')
      await navigator.clipboard.writeText(chapter.transferPrompt.template)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('failed')
    }
  }

  const confirmReview = () => {
    if (!isCorrect || !reviewConfirmed) return
    markProgress(chapter.id, 4)
    setReviewed(true)
  }

  const feedback = hasAnswer
    ? isCorrect
      ? { tone: 'correct', title: '计算正确，已推进到“已手算”', detail: chapter.microExercise.productConnection }
      : answer < chapter.microExercise.standardAnswer
        ? { tone: 'incorrect', title: '结果偏低，再算一次', detail: chapter.microExercise.lowHint }
        : { tone: 'incorrect', title: '结果偏高，再算一次', detail: chapter.microExercise.highHint }
    : null

  return (
    <details className='deep-practice'>
      <summary>
        <span><Calculator size={18} />深度练习</span>
        <strong>先修检查 → 算一遍 → 迁移模板</strong>
        <small>默认收起，约 6 分钟</small>
      </summary>

      <div className='deep-practice-body'>
        <section className='deep-step prerequisite-step' aria-labelledby={`${chapter.id}-prerequisite`}>
          <header><span>01</span><div><h3 id={`${chapter.id}-prerequisite`}>先修检查</h3><p>逐项确认后解锁手算，不把“看过”当作“会用”。</p></div><b>{checked.filter(Boolean).length}/{checked.length}</b></header>
          <div className='prerequisite-list'>
            {chapter.prerequisites.map((item, index) => (
              <label key={item}>
                <input type='checkbox' checked={checked[index]} onChange={() => togglePrerequisite(index)} />
                <span>{item}</span>
              </label>
            ))}
          </div>
          <p className='unlock-note'>学习进度只增不减：已完成的“已手算”记录不会因之后取消勾选而倒退。</p>
        </section>

        <section className='deep-step worked-step' aria-labelledby={`${chapter.id}-worked`}>
          <header><span>02</span><div><h3 id={`${chapter.id}-worked`}>跟着算一遍</h3><p>{chapter.workedExample.scenario}</p></div></header>
          <ol>{chapter.workedExample.steps.map((step) => <li key={step}>{step}</li>)}</ol>
          <div className='worked-result'><strong>结果</strong><span>{chapter.workedExample.result}</span></div>
          <p className='product-link'><b>连接产品决策</b>{chapter.workedExample.productDecision}</p>
        </section>

        <section className={`deep-step exercise-step ${!prerequisitesReady ? 'is-locked' : ''}`} aria-labelledby={`${chapter.id}-exercise`}>
          <header><span>03</span><div><h3 id={`${chapter.id}-exercise`}>轮到你手算</h3><p>{chapter.microExercise.prompt}</p></div></header>
          {!prerequisitesReady && <p className='unlock-note'>请先完成上方 {checked.length} 项先修确认。</p>}
          <div className='answer-row'>
            <label htmlFor={`${chapter.id}-answer`}>你的答案</label>
            <div><input id={`${chapter.id}-answer`} type='number' inputMode='decimal' step='any' value={rawAnswer} disabled={!prerequisitesReady} onChange={(event) => setRawAnswer(event.target.value)} /><span>{chapter.microExercise.unit}</span></div>
            <button type='button' disabled={!rawAnswer} onClick={() => setRawAnswer('')}><RotateCcw size={15} />重新作答</button>
          </div>
          {feedback ? <div className={`exercise-feedback ${feedback.tone}`} role='status' aria-live='polite'><strong>{feedback.title}</strong><p>{feedback.detail}</p><small>标准答案：{chapter.microExercise.standardAnswer}{chapter.microExercise.unit}；可接受范围：{answerRange}{chapter.microExercise.unit}</small></div> : null}
        </section>

        <section className='deep-step transfer-step' aria-labelledby={`${chapter.id}-transfer`}>
          <header><span>04</span><div><h3 id={`${chapter.id}-transfer`}>迁移到你的项目</h3><p>{chapter.transferPrompt.title}</p></div></header>
          <textarea readOnly value={chapter.transferPrompt.template} aria-label={`${chapter.transferPrompt.title}内容`} />
          <div className='transfer-actions'>
            <button type='button' onClick={copyTemplate}>{copyStatus === 'copied' ? <ClipboardCheck size={16} /> : <Clipboard size={16} />}{copyStatus === 'copied' ? '已复制' : '复制模板'}</button>
            <span className={copyStatus} role='status' aria-live='polite'>{copyStatus === 'failed' ? '复制失败，请长按或全选上方文本手动复制。' : copyStatus === 'copied' ? '模板已复制，可粘贴到需求或评审文档。' : '填写真实参数后再做决策。'}</span>
          </div>
          <div className='review-confirm'>
            <label><input type='checkbox' checked={reviewConfirmed} disabled={!isCorrect || reviewed} onChange={(event) => setReviewConfirmed(event.target.checked)} /><span>我已用真实项目参数填写模板，并检查了假设、风险与兜底。</span></label>
            <button type='button' disabled={!isCorrect || !reviewConfirmed || reviewed} onClick={confirmReview}><ShieldCheck size={16} />{reviewed ? '已评审' : '完成自检，标记已评审'}</button>
            {!isCorrect && <small>手算正确后开放评审自检。</small>}
            {reviewed ? <small className='reviewed-note'><Check size={14} />已明确自检，进度已推进到“已评审”。</small> : null}
          </div>
        </section>
      </div>
    </details>
  )
}
