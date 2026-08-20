import { useMemo, useState } from 'react'
import { Calculator, Check, CheckCircle2, ChevronDown, Clipboard, ClipboardCheck, TriangleAlert, Wrench } from 'lucide-react'
import { buildDecisionBrief, computeDecisionBriefAnswer, type DecisionBriefCalculation, type DecisionBriefTemplate } from './decisionBriefMath'
import './DecisionBriefPractice.css'

export type { DecisionBriefCalculation } from './decisionBriefMath'

export type DecisionBriefPracticeData = {
  id: string
  businessInput: string
  facts: string[]
  calculation: DecisionBriefCalculation
  template: DecisionBriefTemplate
  rubric: string[]
  pitfalls: Array<{ mistake: string; fix: string }>
}


export default function DecisionBriefPractice({ practice }: { practice: DecisionBriefPracticeData }) {
  const [rawAnswer, setRawAnswer] = useState('')
  const [draft, setDraft] = useState(practice.template)
  const [checked, setChecked] = useState(() => practice.rubric.map(() => false))
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [completed, setCompleted] = useState(false)
  const expected = useMemo(() => computeDecisionBriefAnswer(practice.calculation), [practice.calculation])
  const numericAnswer = Number(rawAnswer)
  const hasAnswer = rawAnswer.trim() !== '' && Number.isFinite(numericAnswer)
  const isCorrect = hasAnswer && Math.abs(numericAnswer - expected) <= practice.calculation.tolerance
  const rubricReady = checked.length > 0 && checked.every(Boolean)

  const updateDraft = (field: keyof typeof draft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }))
    setCopyStatus('idle')
    setCompleted(false)
  }

  const updateAnswer = (value: string) => {
    setRawAnswer(value)
    setCopyStatus('idle')
    setCompleted(false)
  }

  const copyBrief = async () => {
    if (!isCorrect) return
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable')
      await navigator.clipboard.writeText(buildDecisionBrief(practice, draft, numericAnswer))
      setCopyStatus('copied')
    } catch {
      setCopyStatus('failed')
    }
  }

  const copyHint = !hasAnswer
    ? '请先填写数值答案；计算正确后才能复制完整简报。'
    : !isCorrect
      ? '当前计算结果不正确；请修正数值答案后再复制。'
      : copyStatus === 'failed'
        ? '复制失败：浏览器未授权剪贴板。请选中各字段手动复制。'
        : copyStatus === 'copied'
          ? '已复制当前数值答案与模板内容，可粘贴到评审文档。'
          : '复制将使用你的当前数值答案，并包含业务输入与四段输出。'

  return (
    <details className='decision-brief-practice'>
      <summary>
        <span className='brief-summary-icon'><Calculator size={18} /></span>
        <span><b>做一遍：Decision Brief（决策简报）</b><small>业务输入 → 手算 → 决策 / 指标 / 闸门 / 下一步</small></span>
        {completed ? <em><Check size={14} />本次已完成</em> : <em>约 8 分钟</em>}
        <ChevronDown className='brief-chevron' size={18} />
      </summary>
      <div className='decision-brief-body'>
        <section className='brief-context'>
          <header><span>01</span><h3>小型业务输入</h3></header>
          <p>{practice.businessInput}</p>
          <ul>{practice.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
        </section>

        <section className='brief-calculation'>
          <header><span>02</span><h3>可计算字段</h3></header>
          <p>{practice.calculation.question}</p>
          <code>{practice.calculation.formula}</code>
          <label htmlFor={`${practice.id}-answer`}>
            <span>{practice.calculation.label}</span>
            <span className='brief-answer-input'><input id={`${practice.id}-answer`} type='number' inputMode='decimal' step='any' value={rawAnswer} onChange={(event) => updateAnswer(event.target.value)} /><b>{practice.calculation.unit}</b></span>
          </label>
          {hasAnswer ? <div className={`brief-feedback ${isCorrect ? 'correct' : 'incorrect'}`} role='status' aria-live='polite'>
            <strong>{isCorrect ? '计算正确，可以进入决策。' : numericAnswer < expected ? '结果偏低，请检查单位、分母或漏乘项。' : '结果偏高，请检查百分比换算或重复计数。'}</strong>
            <span>参考答案：{expected.toFixed(practice.calculation.precision)}{practice.calculation.unit}</span>
          </div> : <small>输入结果后立即校验；允许误差 ±{practice.calculation.tolerance}{practice.calculation.unit}。</small>}
        </section>

        <section className='brief-template'>
          <header><span>03</span><h3>结构化输出模板</h3></header>
          {(Object.keys(draft) as Array<keyof typeof draft>).map((field) => {
            const labels = { decision: '决策', metrics: '指标', gate: '闸门', nextStep: '下一步' }
            return <label key={field}><span>{labels[field]}</span><textarea value={draft[field]} onChange={(event) => updateDraft(field, event.target.value)} /></label>
          })}
          <div className='brief-copy-row'>
            <button type='button' disabled={!isCorrect} aria-describedby={`${practice.id}-copy-status`} onClick={copyBrief}>{copyStatus === 'copied' ? <ClipboardCheck size={16} /> : <Clipboard size={16} />}{copyStatus === 'copied' ? '已复制简报' : '复制完整简报'}</button>
            <span id={`${practice.id}-copy-status`} className={copyStatus} role='status' aria-live='polite'>{copyHint}</span>
          </div>
        </section>

        <section className='brief-review'>
          <header><span>04</span><h3>自检 Rubric（评分规准）</h3></header>
          <div className='brief-rubric'>{practice.rubric.map((item, index) => <label key={item}><input type='checkbox' checked={checked[index]} onChange={() => { setChecked((current) => current.map((value, itemIndex) => itemIndex === index ? !value : value)); setCompleted(false) }} /><span>{item}</span></label>)}</div>
          <button type='button' disabled={!isCorrect || !rubricReady} onClick={() => setCompleted(true)}><CheckCircle2 size={16} />{completed ? '本次练习已完成' : '完成自检'}</button>
          {!isCorrect || !rubricReady ? <small>需先算对，并勾选全部自检项；完成状态仅保留在本次页面会话。</small> : null}
        </section>

        <section className='brief-pitfalls'>
          <header><span>05</span><h3>常见错误与修复动作</h3></header>
          {practice.pitfalls.map((item) => <article key={item.mistake}><TriangleAlert size={16} /><p><b>{item.mistake}</b><span><Wrench size={13} />{item.fix}</span></p></article>)}
        </section>
      </div>
    </details>
  )
}
