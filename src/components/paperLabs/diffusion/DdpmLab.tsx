import { useMemo, useRef, useState } from 'react'
import { GoldenLessonShell, ContinueButton } from '../shared/GoldenLessonShell'
import { usePaperLesson } from '../shared/PaperLessonContext'
import { GuessStep, MistakeStep, PaperRevealStep, RuleStep } from '../shared/GoldenLessonSteps'
import type { LessonStep } from '../shared/goldenLessonModel'
import {
  FINAL_PRINCIPLE,
  REPAIR_CHOICES,
  evaluateNoiseAccuracy,
  getGuessFeedback,
  getRuleFeedback,
  nextLessonStep,
  type RuleChoice,
} from './lessonModel'

function points(values: readonly number[]) {
  return values.map((value) => value.toFixed(2)).join(' · ')
}

export default function DdpmLab() {
  const { initialStep } = usePaperLesson()
  const [step, setStep] = useState<LessonStep>(initialStep)
  const [guess, setGuess] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [accuracy, setAccuracy] = useState(0)
  const [sliderTouched, setSliderTouched] = useState(false)
  const [rule, setRule] = useState<RuleChoice | null>(null)
  const lessonTop = useRef<HTMLDivElement>(null)
  const result = useMemo(() => evaluateNoiseAccuracy(accuracy), [accuracy])

  function goNext() {
    setStep((current) => nextLessonStep(current))
    requestAnimationFrame(() => lessonTop.current?.focus())
  }

  function restart() {
    setStep(1); setGuess(null); setRevealed(false); setAccuracy(0); setSliderTouched(false); setRule(null)
    requestAnimationFrame(() => lessonTop.current?.focus())
  }

  return (
    <GoldenLessonShell step={step} eyebrow='受污染图片修复挑战' title='怎样救回一张满是杂点的图？' lessonRef={lessonTop}>
      {step === 1 ? <GuessStep
        title='原图轮廓被随机杂点盖住，第一步该做什么？'
        prompt='目标是恢复图案，同时别把真实边缘一起擦掉。请先选你认为最稳的办法。'
        choices={REPAIR_CHOICES.map((label, value) => ({ label, value }))}
        selected={guess}
        onSelect={(value) => setGuess(Number(value))}
        feedback={guess === null ? null : getGuessFeedback(guess)}
        onNext={goNext}
      /> : null}

      {step === 2 ? <MistakeStep
        title='AI 用力抹平所有颗粒，连图案边缘也没了'
        decision='输出一张平滑但变形的图'
        reason='杂点越少，图片就一定越接近原图。'
        consequence='后果：背景看起来更干净，但主体轮廓被误删，图片不可用。'
        revealTitle='它没有分清“原图结构”和“后来混入的杂点”'
        revealDetail='无差别平滑只能减少变化；如果判断错哪些是干扰，就会把原本要保留的结构一起扣掉。'
        takeaway='修复不是擦得越多越好，而是要猜准该擦掉什么。'
        revealed={revealed}
        onReveal={() => setRevealed(true)}
        onNext={goNext}
      /> : null}

      {step === 3 ? (
        <section aria-labelledby='golden-step-3'>
          <span className='golden-kicker'>第 3 关 · 只改一个人话变量</span>
          <h2 id='golden-step-3'>只调“估噪准确度”，观察轮廓能否回来</h2>
          <p className='golden-prompt'>受污染的输入、随机杂点和修复阶段都固定，只改变 AI 对杂点的估计有多准。</p>
          <label className='golden-slider'>
            <span><b>估得很偏</b><b>估得准确</b></span>
            <input aria-describedby='ddpm-slider-hint' min='0' max='100' value={accuracy} type='range' onChange={(event) => { setAccuracy(Number(event.target.value)); setSliderTouched(true) }} />
            <small id='ddpm-slider-hint'>唯一旋钮：估噪准确度。向右移动，估计与实际混入的杂点更接近。</small>
          </label>
          <div className={result.repaired ? 'golden-live-result is-correct' : 'golden-live-result is-wrong'}>
            <div><span>受污染的四个点</span><strong>{points(result.noisySample)}</strong><small>输入保持不变</small></div>
            <div><span>修复结果</span><strong>{result.decision}</strong><small>偏离原图：{result.reconstructionError.toFixed(4)}</small></div>
          </div>
          <p className='golden-live-feedback' role='status'>{result.feedback}</p>
          <ContinueButton disabled={!sliderTouched || !result.repaired} onClick={goNext} />
        </section>
      ) : null}

      {step === 4 ? <RuleStep
        title='刚才真正改善图片的是什么？'
        prompt='污染程度没有变，只动了一个旋钮。请选择更准确的规律。'
        choices={[{ value: 'erase', label: '只要擦得更多，图片就更好' }, { value: 'estimate', label: '先估准杂点，才能保住结构' }]}
        selected={rule}
        onSelect={(value) => setRule(value as RuleChoice)}
        feedback={rule ? getRuleFeedback(rule) : null}
        onNext={goNext}
      /> : null}

      {step === 5 ? <PaperRevealStep
        principle={FINAL_PRINCIPLE}
        source='这正是 DDPM 的核心思路：定义 Forward（加噪）过程，并学习 Reverse（反向去噪）过程。'
        mappings={[
          { term: 'Forward', chinese: '逐步加噪', example: '把干净图逐步变成更难辨认的输入。' },
          { term: 'Reverse', chinese: '逐步还原', example: '每一步先估噪，再向更干净的方向移动。' },
          { term: 'ε (epsilon)', chinese: '混入的噪声', example: '第 3 关里 AI 努力估准的“杂点”。' },
          { term: 'SNR', chinese: '信噪比', example: '可辨认信号相对噪声还剩多少。' },
        ]}
        formulaTitle='一次加噪'
        formula='xₜ = √ᾱₜ · x₀ + √(1 − ᾱₜ) · ε'
        deepDive={<><h3>模型到底学什么？</h3><p>常见训练目标是让模型预测 ε，并最小化真实噪声与预测噪声的差：L = ‖ε − εθ(xₜ, t)‖²。预测越准，反向恢复方向越可靠。</p></>}
        boundary='一维 4 点信号和闭式重建，不包含神经网络训练、真实逐步采样、条件引导或图像空间。'
        onRestart={restart}
      /> : null}
    </GoldenLessonShell>
  )
}
