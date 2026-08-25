import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowRight, Check, RotateCcw, Sparkles, Target } from 'lucide-react'
import { AccessibleRadioGroup } from '../shared/AccessibleRadioGroup'
import { ContinueButton, GoldenLessonShell } from '../shared/GoldenLessonShell'
import {
  FINAL_PRINCIPLE,
  PRINCIPLE_MAPPING,
  REFUND_EVIDENCE,
  evaluateEvidenceBalance,
  getGuessFeedback,
  getRuleFeedback,
  nextLessonStep,
  type LessonStep,
  type RuleChoice,
} from './lessonModel'

export default function TransformerLab() {
  const [step, setStep] = useState<LessonStep>(1)
  const [guess, setGuess] = useState<number | null>(null)
  const [mistakeRevealed, setMistakeRevealed] = useState(false)
  const [balance, setBalance] = useState(100)
  const [sliderTouched, setSliderTouched] = useState(false)
  const [ruleChoice, setRuleChoice] = useState<RuleChoice | null>(null)
  const lessonTop = useRef<HTMLDivElement>(null)
  const evidenceResult = useMemo(() => evaluateEvidenceBalance(balance), [balance])
  const deepResult = useMemo(() => evaluateEvidenceBalance(0), [])

  function goNext() {
    setStep((current) => nextLessonStep(current))
    requestAnimationFrame(() => lessonTop.current?.focus())
  }

  function restart() {
    setStep(1)
    setGuess(null)
    setMistakeRevealed(false)
    setBalance(100)
    setSliderTouched(false)
    setRuleChoice(null)
    requestAnimationFrame(() => lessonTop.current?.focus())
  }

  return (
    <GoldenLessonShell step={step} eyebrow='退款审核微挑战' title='帮 AI 找到真正的退款证据' lessonRef={lessonTop}>
        {step === 1 ? (
          <section aria-labelledby='golden-step-1'>
            <span className='golden-kicker'>第 1 关 · 先猜</span>
            <h2 id='golden-step-1'>哪句话最能证明“应该退款”？</h2>
            <p className='golden-prompt'>顾客说自己只买了一件，却被扣了两次。请先选最关键的一条证据。</p>
            <AccessibleRadioGroup
              ariaLabel='选择最关键的退款证据'
              className='golden-evidence-list'
              options={REFUND_EVIDENCE.map((item, value) => ({ key: item.text, value }))}
              selected={guess}
              onSelect={setGuess}
              getOptionClassName={(_, isSelected) => isSelected ? 'golden-evidence is-selected' : 'golden-evidence'}
              renderOption={(_, index) => (
                <><span>{REFUND_EVIDENCE[index].speaker}</span><strong>“{REFUND_EVIDENCE[index].text}”</strong></>
              )}
            />
            {guess !== null ? (
              <div className={getGuessFeedback(guess).correct ? 'golden-feedback is-correct' : 'golden-feedback is-wrong'} role='status'>
                {getGuessFeedback(guess).correct ? <Check aria-hidden='true' /> : <AlertTriangle aria-hidden='true' />}
                <div><strong>{getGuessFeedback(guess).title}</strong><p>{getGuessFeedback(guess).detail}</p></div>
              </div>
            ) : null}
            <ContinueButton disabled={guess === null} onClick={goNext} />
          </section>
        ) : null}

        {step === 2 ? (
          <section aria-labelledby='golden-step-2'>
            <span className='golden-kicker'>第 2 关 · 看 AI 犯错</span>
            <h2 id='golden-step-2'>四句话都读到了，它却暂缓退款</h2>
            <div className='golden-ai-decision is-wrong'>
              <span>AI 的退款结论</span>
              <strong>暂缓退款，转人工等待</strong>
              <p>“顾客情绪激烈，但目前缺少可核验的重复扣款证据。”</p>
              <small>后果：重复扣款没有被处理，顾客至少多等 24 小时。</small>
            </div>
            {!mistakeRevealed ? (
              <button className='golden-reveal-button' type='button' onClick={() => setMistakeRevealed(true)}>查看它最关注了哪句话<ArrowRight aria-hidden='true' /></button>
            ) : (
              <>
                <div className='golden-focus-reveal' role='status'>
                  <AlertTriangle aria-hidden='true' />
                  <div><span>错误关注</span><strong>“我快急疯了，马上给我退钱！”</strong><p>它用情绪强度替代了交易事实。支付系统记录明明也在输入里。</p></div>
                </div>
                <p className='golden-takeaway'><b>看到了全部，不等于关注对了。</b></p>
              </>
            )}
            <ContinueButton disabled={!mistakeRevealed} onClick={goNext} />
          </section>
        ) : null}

        {step === 3 ? (
          <section aria-labelledby='golden-step-3'>
            <span className='golden-kicker'>第 3 关 · 只改一个人话变量</span>
            <h2 id='golden-step-3'>把关注点从“声量”拉回“证据”</h2>
            <p className='golden-prompt'>四句话保持不变。只移动这个旋钮，观察 AI 最关注的话和退款结论。</p>
            <label className='golden-slider'>
              <span><b>更集中关键证据</b><b>综合更多信息</b></span>
              <input
                aria-describedby='golden-slider-hint'
                max='100'
                min='0'
                onChange={(event) => { setBalance(Number(event.target.value)); setSliderTouched(true) }}
                type='range'
                value={balance}
              />
              <small id='golden-slider-hint'>可用方向键微调。向左移动，更集中于与退款问题直接相关的事实。</small>
            </label>
            <div className={evidenceResult.approvesRefund ? 'golden-live-result is-correct' : 'golden-live-result is-wrong'}>
              <div><span>AI 当前最关注</span><strong>“{evidenceResult.focus.text}”</strong><small>{evidenceResult.focus.role}</small></div>
              <div><span>退款结论</span><strong>{evidenceResult.decision}</strong><small>{evidenceResult.consequence}</small></div>
            </div>
            <p className='golden-live-feedback' role='status'>{evidenceResult.feedback}</p>
            <ContinueButton disabled={!sliderTouched || !evidenceResult.approvesRefund} onClick={goNext} />
          </section>
        ) : null}

        {step === 4 ? (
          <section aria-labelledby='golden-step-4'>
            <span className='golden-kicker'>第 4 关 · 自己总结规律</span>
            <h2 id='golden-step-4'>刚才真正修复了什么？</h2>
            <p className='golden-prompt'>四句话始终都在。请选择更准确的解释。</p>
            <div className='golden-rule-choices'>
              <button type='button' aria-pressed={ruleChoice === 'context'} onClick={() => setRuleChoice('context')}>上下文不够长</button>
              <button type='button' aria-pressed={ruleChoice === 'focus'} onClick={() => setRuleChoice('focus')}>没有关注正确证据</button>
            </div>
            {ruleChoice ? (
              <div className={getRuleFeedback(ruleChoice).correct ? 'golden-feedback is-correct' : 'golden-feedback is-wrong'} role='status'>
                {getRuleFeedback(ruleChoice).correct ? <Check aria-hidden='true' /> : <AlertTriangle aria-hidden='true' />}
                <div><strong>{getRuleFeedback(ruleChoice).title}</strong><p>{getRuleFeedback(ruleChoice).detail}</p></div>
              </div>
            ) : null}
            <ContinueButton disabled={!ruleChoice} onClick={goNext}>揭晓背后的原理</ContinueButton>
          </section>
        ) : null}

        {step === 5 ? (
          <section aria-labelledby='golden-step-5'>
            <span className='golden-kicker'>第 5 关 · 揭示论文术语与最小公式</span>
            <h2 id='golden-step-5'>你刚刚发现的规律</h2>
            <blockquote className='golden-principle'><Sparkles aria-hidden='true' /><p>{FINAL_PRINCIPLE}</p></blockquote>
            <p className='golden-paper-source'>这正是 Transformer 论文《Attention Is All You Need》中的核心机制之一。</p>
            <div className='golden-mapping' aria-label='Attention 术语与刚才操作的对应关系'>
              {PRINCIPLE_MAPPING.map((item) => <article key={item.term}><span>{item.term}</span><strong>{item.chinese}</strong><p>{item.example}</p></article>)}
            </div>
            <div className='golden-min-formula'><span>最小公式 · 注意力</span><code>Attention(Q, K, V) = Softmax(QKᵀ / √dₖ)V</code></div>
            <details className='golden-deep-dive'>
              <summary>我想继续深入</summary>
              <div>
                <h3>完整 Attention（注意力）计算</h3>
                <p><b>Softmax（归一化）</b>把相关性分数变成总和为 100% 的权重，再用这些权重汇总 Value（证据内容）。</p>
                <code>Attention(Q, K, V) = Softmax(QKᵀ / √dₖ)V</code>
                <div className='golden-weight-list'>
                  {REFUND_EVIDENCE.map((item, index) => <div key={item.text}><span>{item.speaker} · {item.text}</span><i><b style={{ width: `${deepResult.weights[index] * 100}%` }} /></i><strong>{(deepResult.weights[index] * 100).toFixed(1)}%</strong></div>)}
                </div>
                <p className='golden-boundary'>教学边界：这是固定四句话、单头、小矩阵的确定性演示；注意力权重能展示信息分配，但不等于完整因果解释，也不代表生产模型表现。</p>
              </div>
            </details>
            <button className='golden-restart-button' type='button' onClick={restart}><RotateCcw aria-hidden='true' />重新挑战</button>
            <div className='golden-complete'><Target aria-hidden='true' /><span><b>通关</b> 现在试着不看页面，用自己的话复述上面的规律。</span></div>
          </section>
        ) : null}
    </GoldenLessonShell>
  )
}
