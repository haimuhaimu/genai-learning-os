import { useMemo, useRef, useState } from 'react'
import { GoldenLessonShell, ContinueButton } from '../shared/GoldenLessonShell'
import { usePaperLesson } from '../shared/PaperLessonContext'
import { GuessStep, MistakeStep, PaperRevealStep, RuleStep } from '../shared/GoldenLessonSteps'
import type { LessonStep } from '../shared/goldenLessonModel'
import {
  FINAL_PRINCIPLE,
  ROI_CHOICES,
  evaluateRolloutLength,
  getGuessFeedback,
  getRuleFeedback,
  nextLessonStep,
  type RuleChoice,
} from './lessonModel'

export default function DreamerLab() {
  const { initialStep } = usePaperLesson()
  const [step, setStep] = useState<LessonStep>(initialStep)
  const [guess, setGuess] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [length, setLength] = useState(1)
  const [sliderTouched, setSliderTouched] = useState(false)
  const [rule, setRule] = useState<RuleChoice | null>(null)
  const lessonTop = useRef<HTMLDivElement>(null)
  const result = useMemo(() => evaluateRolloutLength(length), [length])

  function goNext() {
    setStep((current) => nextLessonStep(current))
    requestAnimationFrame(() => lessonTop.current?.focus())
  }

  function restart() {
    setStep(1); setGuess(null); setRevealed(false); setLength(1); setSliderTouched(false); setRule(null)
    requestAnimationFrame(() => lessonTop.current?.focus())
  }

  return (
    <GoldenLessonShell step={step} eyebrow='仿真放量挑战' title='仿真 ROI 很高，能直接全量吗？' lessonRef={lessonTop}>
      {step === 1 ? <GuessStep
        title='新策略在仿真里收益大涨 30%，下一步怎么做？'
        prompt='仿真器单步大约有八成可信，但真实用户尚未接触策略。请先选一个上线动作。'
        choices={ROI_CHOICES.map((label, value) => ({ label, value }))}
        selected={guess}
        onSelect={(value) => setGuess(Number(value))}
        feedback={guess === null ? null : getGuessFeedback(guess)}
        onNext={goNext}
      /> : null}

      {step === 2 ? <MistakeStep
        title='AI 相信漂亮的仿真 ROI，直接全量后却出现回撤'
        decision='把新策略扩大到 100% 流量'
        reason='连续十二步仿真都赚钱，说明策略已经稳定。'
        consequence='后果：真实用户行为与仿真有偏差，长链路把小错放大，线上 ROI 转负。'
        revealTitle='它忽略了“下一步预测建立在上一步预测之上”'
        revealDetail='每一步只偏一点看似无害，但后续继续拿带偏的状态做预测，累计结果可能越来越乐观。'
        takeaway='模拟得更远能看到长期结果，也给了小错更多累积机会。'
        revealed={revealed}
        onReveal={() => setRevealed(true)}
        onNext={goNext}
      /> : null}

      {step === 3 ? (
        <section aria-labelledby='golden-step-3'>
          <span className='golden-kicker'>第 3 关 · 只改一个人话变量</span>
          <h2 id='golden-step-3'>只调“推演长度”，看何时不能直接相信仿真</h2>
          <p className='golden-prompt'>模拟器可信度与收益序列都固定，只改变连续向未来推演几步。</p>
          <label className='golden-slider'>
            <span><b>只看下一步</b><b>连续看十二步</b></span>
            <input aria-describedby='dreamer-slider-hint' min='1' max='12' value={length} type='range' onChange={(event) => { setLength(Number(event.target.value)); setSliderTouched(true) }} />
            <small id='dreamer-slider-hint'>唯一旋钮：推演长度。第 6 步触发真实验证是本课的产品护栏，不是论文定理。</small>
          </label>
          <div className={result.needsRealValidation ? 'golden-live-result is-correct' : 'golden-live-result is-wrong'}>
            <div><span>累计模拟误差</span><strong>{result.accumulatedError.toFixed(3)}</strong><small>想象收益偏差 {result.returnBias >= 0 ? '+' : ''}{result.returnBias.toFixed(3)}</small></div>
            <div><span>当前动作</span><strong>{result.decision}</strong><small>{result.feedback}</small></div>
          </div>
          <div className='golden-step-dots' aria-label={`正在推演 ${result.length} 步`}>{Array.from({ length: 12 }, (_, index) => <i className={index < result.length ? 'is-active' : ''} key={index} />)}</div>
          <ContinueButton disabled={!sliderTouched || !result.needsRealValidation} onClick={goNext} />
        </section>
      ) : null}

      {step === 4 ? <RuleStep
        title='刚才为什么越往后越不该直接放量？'
        prompt='模拟器本身没有改变，只增加了连续推演的长度。请选择更准确的规律。'
        choices={[{ value: 'scale', label: '仿真收益高就能直接全量' }, { value: 'validate', label: '推得越远，越要防小错累积' }]}
        selected={rule}
        onSelect={(value) => setRule(value as RuleChoice)}
        feedback={rule ? getRuleFeedback(rule) : null}
        onNext={goNext}
      /> : null}

      {step === 5 ? <PaperRevealStep
        principle={FINAL_PRINCIPLE}
        source='这对应 DreamerV3 用学习到的 World Model 在潜在空间做 Imagination Rollout，并据此优化策略。'
        mappings={[
          { term: 'World Model', chinese: '学到的环境模型', example: '根据当前状态和动作预测下一步。' },
          { term: 'Imagination Rollout', chinese: '在模型里连续推演', example: '第 3 关从 1 步拉到 12 步的过程。' },
          { term: 'Discounted Return', chinese: '折扣累计回报', example: '越远的未来奖励权重通常越小。' },
        ]}
        formulaTitle='折扣累计回报'
        formula='Gₜ = rₜ + γrₜ₊₁ + γ²rₜ₊₂ + …'
        note='重要边界：第 6 步真实验证是本课程为上线决策设置的产品护栏，不是 DreamerV3 论文定理。'
        deepDive={<><h3>论文机制与上线护栏要分开</h3><p>DreamerV3 的贡献包括学习世界模型、在想象轨迹中训练行为。真实流量验证、1% 灰度和“第 6 步”阈值是产品风险控制设计。</p></>}
        boundary='固定奖励序列与显式误差函数，不包含潜变量、Actor-Critic、训练、多环境泛化或真实线上 ROI。'
        onRestart={restart}
      /> : null}
    </GoldenLessonShell>
  )
}
