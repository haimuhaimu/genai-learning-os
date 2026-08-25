import { useMemo, useRef, useState } from 'react'
import { GoldenLessonShell, ContinueButton } from '../shared/GoldenLessonShell'
import { GuessStep, MistakeStep, PaperRevealStep, RuleStep } from '../shared/GoldenLessonSteps'
import type { LessonStep } from '../shared/goldenLessonModel'
import {
  FINAL_PRINCIPLE,
  REFUND_CHOICES,
  evaluateVerification,
  getGuessFeedback,
  getRuleFeedback,
  nextLessonStep,
  type RuleChoice,
} from './lessonModel'

const kindLabels = { thought: '先判断', action: '去查询', observation: '读结果', answer: '做决定', stop: '停止' } as const

export default function ReActLab() {
  const [step, setStep] = useState<LessonStep>(1)
  const [guess, setGuess] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [strictness, setStrictness] = useState(0)
  const [sliderTouched, setSliderTouched] = useState(false)
  const [rule, setRule] = useState<RuleChoice | null>(null)
  const lessonTop = useRef<HTMLDivElement>(null)
  const result = useMemo(() => evaluateVerification(strictness), [strictness])

  function goNext() {
    setStep((current) => nextLessonStep(current))
    requestAnimationFrame(() => lessonTop.current?.focus())
  }

  function restart() {
    setStep(1); setGuess(null); setRevealed(false); setStrictness(0); setSliderTouched(false); setRule(null)
    requestAnimationFrame(() => lessonTop.current?.focus())
  }

  return (
    <GoldenLessonShell step={step} eyebrow='退款安全挑战' title='怎样避免同一订单被退两次？' lessonRef={lessonTop}>
      {step === 1 ? <GuessStep
        title='顾客说“钱没到账”，但客服备注写着“已处理”，你让 AI 怎么做？'
        prompt='退款一旦重复执行就很难追回。请先选一个最稳的处理方式。'
        choices={REFUND_CHOICES.map((label, value) => ({ label, value }))}
        selected={guess}
        onSelect={(value) => setGuess(Number(value))}
        feedback={guess === null ? null : getGuessFeedback(guess)}
        onNext={goNext}
      /> : null}

      {step === 2 ? <MistakeStep
        title='AI 很快答应退款，却把同一笔钱退了第二次'
        decision='立即再次退款 199 元'
        reason='顾客截图可信，而且快速解决能提升满意度。'
        consequence='后果：支付系统其实已退款，商家多损失 199 元。'
        revealTitle='它把“说得通”当成了“查证过”'
        revealDetail='顾客截图和旧备注都可能滞后。AI 没读取当前订单、支付状态，也没有在信息冲突时停下。'
        takeaway='关键动作前不查事实，再流畅的回答也可能造成真实损失。'
        revealed={revealed}
        onReveal={() => setRevealed(true)}
        onNext={goNext}
      /> : null}

      {step === 3 ? (
        <section aria-labelledby='golden-step-3'>
          <span className='golden-kicker'>第 3 关 · 只改一个人话变量</span>
          <h2 id='golden-step-3'>只调“查证严格度”，看流程会走到哪里</h2>
          <p className='golden-prompt'>订单仍然存在冲突、系统也都可用。向右移动，让 AI 在退款前完成更多查证。</p>
          <label className='golden-slider'>
            <span><b>直接相信并执行</b><b>冲突时核验并停止</b></span>
            <input aria-describedby='react-slider-hint' min='0' max='100' value={strictness} type='range' onChange={(event) => { setStrictness(Number(event.target.value)); setSliderTouched(true) }} />
            <small id='react-slider-hint'>唯一旋钮：查证严格度。可靠不是步骤越多，而是关键动作前拿到证据并知道何时停。</small>
          </label>
          <ol className='golden-plain-trajectory' aria-label='当前退款处理轨迹'>
            {result.steps.map((item, index) => <li key={`${item.kind}-${index}`}><span>{kindLabels[item.kind]}</span><p>{item.text}</p></li>)}
          </ol>
          <div className={result.safe ? 'golden-live-result is-correct' : 'golden-live-result is-wrong'}>
            <div><span>当前决定</span><strong>{result.decision}</strong><small>{result.steps.length} 个处理步骤</small></div>
            <div><span>是否安全闭环</span><strong>{result.safe ? '是' : '否'}</strong><small>{result.feedback}</small></div>
          </div>
          <ContinueButton disabled={!sliderTouched || !result.safe} onClick={goNext} />
        </section>
      ) : null}

      {step === 4 ? <RuleStep
        title='什么让这次退款不再重复？'
        prompt='退款条件和系统事实都没变。请选择更准确的规律。'
        choices={[{ value: 'confidence', label: '让 AI 回答得更自信' }, { value: 'verify', label: '动作前查证，冲突时停止' }]}
        selected={rule}
        onSelect={(value) => setRule(value as RuleChoice)}
        feedback={rule ? getRuleFeedback(rule) : null}
        onNext={goNext}
      /> : null}

      {step === 5 ? <PaperRevealStep
        principle={FINAL_PRINCIPLE}
        source='这正是 ReAct 将推理与行动交错组织的核心：每次外部结果都会影响下一步。'
        mappings={[
          { term: 'Thought', chinese: '形成下一步判断', example: '先判断需要核对退款资格和状态。' },
          { term: 'Act', chinese: '执行外部动作', example: '调用订单或支付查询。' },
          { term: 'Observation', chinese: '读取外部结果', example: '看到“支付成功但记录已退款”的冲突。' },
          { term: 'Stop', chinese: '明确停止', example: '证据冲突时不再自动退款，转人工。' },
        ]}
        formulaTitle='最小控制循环'
        formula='Thought → Act → Observation → … → Stop'
        deepDive={<><h3>为什么 Observation 重要？</h3><p>Thought 只是模型内部形成的判断；Observation 才是工具返回的外部事实。生产系统还要限制工具权限、记录参数和返回值，并设置步数与停止条件。</p></>}
        boundary='固定退款环境和规则表，不调用语言模型或真实工具；轨迹只说明控制流与停止条件。'
        onRestart={restart}
      /> : null}
    </GoldenLessonShell>
  )
}
