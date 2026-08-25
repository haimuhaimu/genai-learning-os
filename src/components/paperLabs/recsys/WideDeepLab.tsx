import { useMemo, useRef, useState } from 'react'
import { GoldenLessonShell, ContinueButton } from '../shared/GoldenLessonShell'
import { GuessStep, MistakeStep, PaperRevealStep, RuleStep } from '../shared/GoldenLessonSteps'
import type { LessonStep } from '../shared/goldenLessonModel'
import {
  FINAL_PRINCIPLE,
  LAUNCH_CHOICES,
  evaluateExploration,
  getGuessFeedback,
  getRuleFeedback,
  nextLessonStep,
  type RuleChoice,
} from './lessonModel'

export default function WideDeepLab() {
  const [step, setStep] = useState<LessonStep>(1)
  const [guess, setGuess] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [exploration, setExploration] = useState(0)
  const [sliderTouched, setSliderTouched] = useState(false)
  const [rule, setRule] = useState<RuleChoice | null>(null)
  const lessonTop = useRef<HTMLDivElement>(null)
  const result = useMemo(() => evaluateExploration(exploration), [exploration])

  function goNext() {
    setStep((current) => nextLessonStep(current))
    requestAnimationFrame(() => lessonTop.current?.focus())
  }

  function restart() {
    setStep(1); setGuess(null); setRevealed(false); setExploration(0); setSliderTouched(false); setRule(null)
    requestAnimationFrame(() => lessonTop.current?.focus())
  }

  return (
    <GoldenLessonShell step={step} eyebrow='新作者首发挑战' title='该给新作者第一批流量吗？' lessonRef={lessonTop}>
      {step === 1 ? <GuessStep
        title='一个从未发过内容的新作者来了，你会怎么分流量？'
        prompt='旧作者点击率稳定，新作者没有任何历史成绩。请先凭直觉选一个首发策略。'
        choices={LAUNCH_CHOICES.map((label, value) => ({ label, value }))}
        selected={guess}
        onSelect={(value) => setGuess(Number(value))}
        feedback={guess === null ? null : getGuessFeedback(guess)}
        onNext={goNext}
      /> : null}

      {step === 2 ? <MistakeStep
        title='AI 选择了“最稳”的旧作者，新人却永远没有数据'
        decision='不给新作者流量'
        reason='新作者历史点击为 0，预计收益低于老作者。'
        consequence='后果：新作者持续零曝光，系统也永远收不到判断其质量的新证据。'
        revealTitle='它把“没有历史”误当成“内容不好”'
        revealDetail='历史规则擅长重复已经成功的组合，却无法凭空认识新作者；零曝光又会制造新的零数据。'
        takeaway='只相信过去，可能让值得推荐的新内容永远没有第一次。'
        revealed={revealed}
        onReveal={() => setRevealed(true)}
        onNext={goNext}
      /> : null}

      {step === 3 ? (
        <section aria-labelledby='golden-step-3'>
          <span className='golden-kicker'>第 3 关 · 只改一个人话变量</span>
          <h2 id='golden-step-3'>只调“探索力度”，看看新人能否获得首发机会</h2>
          <p className='golden-prompt'>候选内容、用户和门槛都不变。向右移动会更多参考“相似内容曾受欢迎”这一线索。</p>
          <label className='golden-slider'>
            <span><b>完全沿用旧成绩</b><b>更多尝试相似新人</b></span>
            <input aria-describedby='wide-slider-hint' min='0' max='100' value={exploration} type='range' onChange={(event) => { setExploration(Number(event.target.value)); setSliderTouched(true) }} />
            <small id='wide-slider-hint'>唯一旋钮：探索力度。不是直接全量，而是决定新人能否跨过首发门槛。</small>
          </label>
          <div className={result.launchesNewAuthor ? 'golden-live-result is-correct' : 'golden-live-result is-wrong'}>
            <div><span>新作者获得机会</span><strong>{(result.coldProbability * 100).toFixed(1)}%</strong><small>达到 50% 才进入小流量首发</small></div>
            <div><span>当前决定</span><strong>{result.decision}</strong><small>{result.consequence}</small></div>
          </div>
          <p className='golden-live-feedback' role='status'>{result.feedback}</p>
          <ContinueButton disabled={!sliderTouched || !result.launchesNewAuthor} onClick={goNext} />
        </section>
      ) : null}

      {step === 4 ? <RuleStep
        title='刚才为什么能让新人跨过门槛？'
        prompt='候选人和历史记录都没变。请选择更准确的规律。'
        choices={[{ value: 'history', label: '永远押注历史冠军最安全' }, { value: 'balanced', label: '旧经验与新机会要平衡' }]}
        selected={rule}
        onSelect={(value) => setRule(value as RuleChoice)}
        feedback={rule ? getRuleFeedback(rule) : null}
        onNext={goNext}
      /> : null}

      {step === 5 ? <PaperRevealStep
        principle={FINAL_PRINCIPLE}
        source='这正是 Wide & Deep Learning for Recommender Systems 中“记忆 + 泛化”的核心取舍。'
        mappings={[
          { term: 'Wide', chinese: '记忆旧组合', example: '老作者 + 老用户这类历史上见过的强规则。' },
          { term: 'Deep', chinese: '泛化到相似新人', example: '把相似内容的经验迁移给没有历史的新作者。' },
          { term: 'Logit', chinese: '门槛前总分', example: '两路贡献相加后、还没变成概率的分数。' },
          { term: 'Sigmoid', chinese: '转成 0～1', example: '把总分压成可与首发门槛比较的概率。' },
        ]}
        formulaTitle='联合打分'
        formula='p = Sigmoid(Logit) = Sigmoid(wide + deep)'
        deepDive={<><h3>为什么不是“新人优先”？</h3><p>Deep 路径只是让新组合能借到相似经验，并不保证它一定优质。真实系统仍需小流量反馈、切片指标与回退规则。</p></>}
        boundary='固定 3 个样本和固定参数，不包含训练、Embedding 学习、负样本、校准或线上竞价。'
        onRestart={restart}
      /> : null}
    </GoldenLessonShell>
  )
}
