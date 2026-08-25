import { useMemo, useRef, useState } from 'react'
import { ContinueButton, GoldenLessonShell } from '../shared/GoldenLessonShell'
import { GuessStep, MistakeStep, PaperRevealStep, RuleStep } from '../shared/GoldenLessonSteps'
import type { LessonStep } from '../shared/goldenLessonModel'
import {
  FINAL_PRINCIPLE,
  INTENT_LABELS,
  LAUNCH_CHOICES,
  evaluateHesitation,
  getGuessFeedback,
  getRuleFeedback,
  nextLessonStep,
  type RuleChoice,
} from './lessonModel'

const asPercent = (value: number) => `${(value * 100).toFixed(1)}%`
const asNumber = (value: number) => value.toFixed(4)

export default function DistillationLab() {
  const [step, setStep] = useState<LessonStep>(1)
  const [guess, setGuess] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [spread, setSpread] = useState(0.5)
  const [sliderTouched, setSliderTouched] = useState(false)
  const [rule, setRule] = useState<RuleChoice | null>(null)
  const lessonTop = useRef<HTMLDivElement>(null)
  const result = useMemo(() => evaluateHesitation(spread), [spread])

  function goNext() {
    setStep((current) => nextLessonStep(current))
    requestAnimationFrame(() => lessonTop.current?.focus())
  }

  function restart() {
    setStep(1); setGuess(null); setRevealed(false); setSpread(0.5); setSliderTouched(false); setRule(null)
    requestAnimationFrame(() => lessonTop.current?.focus())
  }

  return (
    <GoldenLessonShell step={step} eyebrow='70B → 3B 线上迁移挑战' title='把昂贵大模型装进低成本小模型' lessonRef={lessonTop}>
      {step === 1 ? <GuessStep
        title='3B 模型平均表现很像 70B，就能直接接管客服与审核吗？'
        prompt='目标是降低每千次请求成本与延迟，同时守住高风险边界。请先选择上线动作。'
        choices={LAUNCH_CHOICES.map((label, value) => ({ label, value }))}
        selected={guess}
        onSelect={(value) => setGuess(Number(value))}
        feedback={guess === null ? null : getGuessFeedback(guess)}
        onNext={goNext}
      /> : null}

      {step === 2 ? <MistakeStep
        title='AI 只盯平均一致率，放量后把边界请求答得过于肯定'
        decision='让 3B 模型直接接管全部客服与审核请求'
        reason='常见问题的答案已经很像 70B，成本降到约十分之一，延迟也更低。'
        consequence='后果：退款承诺与疑似违规等相近选项被混在一起，高风险请求没有及时进入人工复核。'
        revealTitle='它只学“哪个答案赢了”，没学“第一名只领先一点”'
        revealDetail='常见请求看起来正确，但接近分界线的请求最容易过度自信；平均一致率把这类风险藏住了。'
        takeaway='低成本与低延迟是收益，边界错判和人工兜底是必须同时记账的代价。'
        revealed={revealed}
        onReveal={() => setRevealed(true)}
        onNext={goNext}
      /> : null}

      {step === 3 ? (
        <section aria-labelledby='golden-step-3'>
          <span className='golden-kicker'>第 3 关 · 只改一个人话变量</span>
          <h2 id='golden-step-3'>只调“老师把犹豫摊开多少”</h2>
          <p className='golden-prompt'>70B 与 3B 的四个固定分数、正确答案和混合比例都不变。找到既保留答案、又看得见边界的区间。</p>
          <label className='golden-slider'>
            <span><b>几乎只说答案</b><b>把差异摊得很平</b></span>
            <input aria-describedby='distill-slider-hint' min='0.5' max='8' step='0.5' value={spread} type='range' onChange={(event) => { setSpread(Number(event.target.value)); setSliderTouched(true) }} />
            <small id='distill-slider-hint'>唯一旋钮：老师把犹豫摊开多少。当前档位 {spread.toFixed(1)}。</small>
          </label>
          <div className={`golden-feedback ${result.pass ? 'is-correct' : 'is-wrong'}`} role='status'>
            <div><strong>{result.gate.label}</strong><p>{result.gate.feedback}</p></div>
          </div>
          <div className={`golden-live-result ${result.pass ? 'is-correct' : 'is-wrong'}`} aria-label='四种处理方式的信号分布'>
            <Distribution title='70B 给出的线索' values={result.teacherDistribution} />
            <Distribution title='3B 当前学到的线索' values={result.studentDistribution} />
          </div>
          <ContinueButton disabled={!sliderTouched || !result.pass} onClick={goNext}>用这个中间区间继续</ContinueButton>
        </section>
      ) : null}

      {step === 4 ? <RuleStep
        title='为什么中间档比两端更适合迁移边界？'
        prompt='四组固定分数始终没变，只有线索被摊开的程度改变。请选择更准确的规律。'
        choices={[
          { value: 'bigger', label: '摊得越开越好，四种答案最好一样重要' },
          { value: 'boundary', label: '中间档既保留优先答案，也暴露相近选项的差距' },
        ]}
        selected={rule}
        onSelect={(value) => setRule(value as RuleChoice)}
        feedback={rule ? getRuleFeedback(rule) : null}
        onNext={goNext}
      /> : null}

      {step === 5 ? <PaperRevealStep
        principle={FINAL_PRINCIPLE}
        source='这对应 Hinton、Vinyals 与 Dean 在 Distilling the Knowledge in a Neural Network 中用软化后的类别分布迁移知识。'
        mappings={[
          { term: 'Teacher model', chinese: '提供知识的 70B 模型', example: '固定 logits：[3.2, 2.8, -0.5, -1.2]。' },
          { term: 'Student model', chinese: '承接能力的 3B 模型', example: '固定 logits：[2.9, 3.1, -0.4, -1.0]。' },
          { term: 'Hard label', chinese: '唯一正确答案', example: '本课固定为类别 0。' },
          { term: 'Soft label', chinese: '各候选的相对可能性', example: '第 3 关看到的四项分布。' },
          { term: 'Temperature', chinese: '把犹豫摊开的程度', example: `本次通关值 T=${result.temperature.toFixed(1)}。` },
          { term: 'Cross-Entropy', chinese: '用 T=1 的学生分布对正确答案计罚', example: `本次 hard-label CE=${asNumber(result.crossEntropy)}。` },
          { term: 'Raw KL divergence', chinese: '老师软分布到学生软分布的原始差异', example: `本次 KL(teacher_T ‖ student_T)=${asNumber(result.rawKl)}。` },
          { term: 'Scaled KD term', chinese: '进入混合损失前按 T² 缩放的蒸馏项', example: `本次 T²·raw KL=${asNumber(result.scaledKdTerm)}。` },
        ]}
        formulaTitle='硬答案与软边界的混合损失'
        formula='L = α·CE(y,p_s^(1)) + (1−α)·T²·KL(p_t^(T)‖p_s^(T))'
        note={`固定 α=0.5，本次 total loss=${asNumber(result.totalLoss)}；Teacher entropy=${asNumber(result.entropy.teacher)}，Student entropy=${asNumber(result.entropy.student)}。`}
        deepDive={<DistillationLedger temperature={result.temperature} rawKl={result.rawKl} scaledKdTerm={result.scaledKdTerm} />}
        boundary='这是固定 logits 的机制教学，所有计算在浏览器中确定性完成，无随机、无后端；不代表真实 70B/3B 线上模型参数、成本、延迟或能力。'
        onRestart={restart}
      /> : null}
    </GoldenLessonShell>
  )
}

function Distribution({ title, values }: { title: string; values: readonly number[] }) {
  return <div><span>{title}</span><strong>{values.map(asPercent).join(' / ')}</strong><small>{INTENT_LABELS.join(' / ')}</small></div>
}

function DistillationLedger({ temperature, rawKl, scaledKdTerm }: { temperature: number; rawKl: number; scaledKdTerm: number }) {
  return <><h3>损失口径：原始差异与缩放项分开看</h3>
    <p>Hard-label CE 始终读取 T=1 的学生分布。raw KL 的方向固定为 KL(teacher_T ‖ student_T)={asNumber(rawKl)}；scaled KD term 是进入总损失的 T²·raw KL={temperature.toFixed(1)}²×{asNumber(rawKl)}={asNumber(scaledKdTerm)}，它不是 KL divergence 本身。</p>
    <h3>每 1000 次请求的成本—延迟—能力保持—风险账本</h3>
    <div className='dreamer-error-table' role='table' aria-label='每千次请求上线账本' tabIndex={0}>
      <div role='row'><span role='columnheader'>方案</span><span role='columnheader'>成本</span><span role='columnheader'>P95 延迟</span><span role='columnheader'>能力保持</span><span role='columnheader'>边界风险 / 人工复核</span></div>
      <div role='row'><span role='cell'>70B</span><span role='cell'>¥120</span><span role='cell'>1800 ms</span><span role='cell'>100%</span><span role='cell'>关键漏判 0.3% / 60 单</span></div>
      <div role='row'><span role='cell'>3B</span><span role='cell'>¥9</span><span role='cell'>240 ms</span><span role='cell'>88%</span><span role='cell'>关键漏判 1.1% / 90 单</span></div>
    </div>
    <h3>Go / Hold / No-Go 闸门</h3>
    <ul className='golden-plain-trajectory'>
      <li><b>Go</b><p>能力保持 ≥90%、关键漏判 ≤0.5%，且人工复核容量充足。</p></li>
      <li><b>Hold</b><p>能力保持 85%–90% 或关键漏判 0.5%–1.5%；只做可回退灰度并补边界样本。</p></li>
      <li><b>No-Go</b><p>能力保持 &lt;85%、关键漏判 &gt;1.5%，或人工复核队列超容量。</p></li>
    </ul>
    <p>上表是教学账本示例。当前 3B 方案为 <b>Hold</b>：成本与延迟达标，但能力和风险未过 Go 门槛。</p>
  </>
}
