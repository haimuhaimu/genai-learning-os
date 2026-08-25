import type { ReactNode } from 'react'
import { AlertTriangle, ArrowRight, Bot, Check, Gauge, RotateCcw, Sparkles, Target, TrendingDown } from 'lucide-react'
import { AccessibleRadioGroup } from './AccessibleRadioGroup'
import { ContinueButton } from './GoldenLessonShell'

type Feedback = { correct: boolean; title: string; detail: string }
type Choice = { label: string; value: string | number }
type Mapping = { term: string; chinese: string; example: string }

function FeedbackBox({ feedback }: { feedback: Feedback }) {
  return (
    <div className={feedback.correct ? 'golden-feedback is-correct' : 'golden-feedback is-wrong'} role='status'>
      {feedback.correct ? <Check aria-hidden='true' /> : <AlertTriangle aria-hidden='true' />}
      <div><strong>{feedback.title}</strong><p>{feedback.detail}</p></div>
    </div>
  )
}

export function GuessStep({ title, prompt, choices, selected, onSelect, feedback, onNext }: {
  title: string
  prompt: string
  choices: readonly Choice[]
  selected: string | number | null
  onSelect: (value: string | number) => void
  feedback: Feedback | null
  onNext: () => void
}) {
  return (
    <section aria-labelledby='golden-step-1'>
      <span className='golden-kicker'>第 1 关 · 先猜</span>
      <h2 id='golden-step-1'>{title}</h2>
      <p className='golden-prompt'>{prompt}</p>
      <AccessibleRadioGroup
        ariaLabel={title}
        className='golden-choice-list'
        options={choices.map((choice) => ({ key: choice.value, value: choice.value }))}
        selected={selected}
        onSelect={onSelect}
        getOptionClassName={(_, isSelected) => isSelected ? 'golden-choice is-selected' : 'golden-choice'}
        renderOption={(_, index) => (
          <><span>{String(index + 1).padStart(2, '0')}</span><strong>{choices[index].label}</strong></>
        )}
      />
      {feedback ? <FeedbackBox feedback={feedback} /> : null}
      <ContinueButton disabled={selected === null} onClick={onNext} />
    </section>
  )
}

export function MistakeStep({ title, decision, reason, consequence, revealTitle, revealDetail, takeaway, revealed, onReveal, onNext }: {
  title: string
  decision: string
  reason: string
  consequence: string
  revealTitle: string
  revealDetail: string
  takeaway: string
  revealed: boolean
  onReveal: () => void
  onNext: () => void
}) {
  return (
    <section aria-labelledby='golden-step-2'>
      <span className='golden-kicker'>第 2 关 · 看 AI 犯错</span>
      <h2 id='golden-step-2'>{title}</h2>
      <div className='golden-decision-flow'>
        <article><span><Bot aria-hidden='true' />AI 决策</span><strong>{decision}</strong></article>
        <ArrowRight aria-hidden='true' />
        <article><span><Gauge aria-hidden='true' />判断依据</span><p>“{reason}”</p></article>
        <ArrowRight aria-hidden='true' />
        <article className='is-impact'><span><TrendingDown aria-hidden='true' />业务后果</span><strong>{consequence}</strong></article>
      </div>
      {!revealed ? (
        <button className='golden-reveal-button' type='button' onClick={onReveal}>定位错误节点<ArrowRight aria-hidden='true' /></button>
      ) : (
        <>
          <div className='golden-focus-reveal' role='status'><AlertTriangle aria-hidden='true' /><div><span>错误原因</span><strong>{revealTitle}</strong><p>{revealDetail}</p></div></div>
          <p className='golden-takeaway'><b>{takeaway}</b></p>
        </>
      )}
      <ContinueButton disabled={!revealed} onClick={onNext} />
    </section>
  )
}

export function RuleStep({ title, prompt, choices, selected, onSelect, feedback, onNext }: {
  title: string
  prompt: string
  choices: readonly Choice[]
  selected: string | null
  onSelect: (value: string) => void
  feedback: Feedback | null
  onNext: () => void
}) {
  return (
    <section aria-labelledby='golden-step-4'>
      <span className='golden-kicker'>第 4 关 · 自己总结规律</span>
      <h2 id='golden-step-4'>{title}</h2>
      <p className='golden-prompt'>{prompt}</p>
      <div className='golden-rule-choices'>
        {choices.map((choice) => <button type='button' aria-pressed={selected === choice.value} key={choice.value} onClick={() => onSelect(String(choice.value))}>{choice.label}</button>)}
      </div>
      {feedback ? <FeedbackBox feedback={feedback} /> : null}
      <ContinueButton disabled={selected === null} onClick={onNext}>揭晓背后的论文原理</ContinueButton>
    </section>
  )
}

export function PaperRevealStep({ principle, source, mappings, formulaTitle, formula, deepDive, boundary, onRestart, note }: {
  principle: string
  source: string
  mappings: readonly Mapping[]
  formulaTitle: string
  formula: string
  deepDive: ReactNode
  boundary: string
  onRestart: () => void
  note?: string
}) {
  return (
    <section aria-labelledby='golden-step-5'>
      <span className='golden-kicker'>第 5 关 · 揭示论文术语与最小公式</span>
      <h2 id='golden-step-5'>把刚才的规律翻译成论文语言</h2>
      <blockquote className='golden-principle'><Sparkles aria-hidden='true' /><p>{principle}</p></blockquote>
      <p className='golden-paper-source'>{source}</p>
      <div className='golden-mapping' aria-label='论文术语与刚才操作的对应关系'>
        {mappings.map((item, index) => <article key={item.term}><i aria-hidden='true'>{String(index + 1).padStart(2, '0')}</i><span>{item.term}</span><strong>{item.chinese}</strong><p>{item.example}</p></article>)}
      </div>
      <div className='golden-min-formula'><span>最小公式 · {formulaTitle}</span><code>{formula}</code>{note ? <p>{note}</p> : null}</div>
      <details className='golden-deep-dive'>
        <summary>我想继续深入</summary>
        <div>{deepDive}<p className='golden-boundary'>教学边界：{boundary}</p></div>
      </details>
      <button className='golden-restart-button' type='button' onClick={onRestart}><RotateCcw aria-hidden='true' />重新挑战</button>
      <div className='golden-complete'><Target aria-hidden='true' /><span><b>通关</b> 现在试着不看页面，用自己的话复述上面的规律。</span></div>
    </section>
  )
}
