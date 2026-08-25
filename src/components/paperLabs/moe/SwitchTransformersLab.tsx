import { useMemo, useRef, useState } from 'react'
import { ContinueButton, GoldenLessonShell } from '../shared/GoldenLessonShell'
import { GuessStep, MistakeStep, PaperRevealStep, RuleStep } from '../shared/GoldenLessonSteps'
import { usePaperLesson } from '../shared/PaperLessonContext'
import type { LessonStep } from '../shared/goldenLessonModel'
import { FINAL_PRINCIPLE, LAUNCH_CHOICES, evaluateBalanceConcern, getGuessFeedback, getRuleFeedback, nextLessonStep, type RuleChoice } from './lessonModel'

const percent = (value: number) => `${(value * 100).toFixed(1)}%`

export default function SwitchTransformersLab() {
  const { initialStep } = usePaperLesson()
  const [step, setStep] = useState<LessonStep>(initialStep)
  const [guess, setGuess] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [concern, setConcern] = useState(0)
  const [sliderTouched, setSliderTouched] = useState(false)
  const [rule, setRule] = useState<RuleChoice | null>(null)
  const lessonTop = useRef<HTMLDivElement>(null)
  const result = useMemo(() => evaluateBalanceConcern(concern), [concern])

  const goNext = () => {
    setStep((current) => nextLessonStep(current))
    requestAnimationFrame(() => lessonTop.current?.focus())
  }
  const restart = () => {
    setStep(1); setGuess(null); setRevealed(false); setConcern(0); setSliderTouched(false); setRule(null)
    requestAnimationFrame(() => lessonTop.current?.focus())
  }

  return (
    <GoldenLessonShell step={step} eyebrow='四专席分流挑战' title='让每类请求找到对的人，也别让热门专席爆仓' lessonRef={lessonTop}>
      {step === 1 ? <GuessStep
        title='12 条请求同时到来，怎样判断这套分流能否上线？'
        prompt='退款、政策、代码、检索请求要分给四个专席；每个专席最多接 3 条。'
        choices={LAUNCH_CHOICES.map((label, value) => ({ label, value }))}
        selected={guess}
        onSelect={(value) => setGuess(Number(value))}
        feedback={guess === null ? null : getGuessFeedback(guess)}
        onNext={goNext}
      /> : null}

      {step === 2 ? <MistakeStep
        title='AI 总选看起来最靠谱的退款专席，三条之后就爆仓了'
        decision='把后续退款请求继续塞给热门专席'
        reason='这个专席对退款请求的固定匹配分最高。'
        consequence='后果：12 条固定请求中有 3 条被漏接，冷门专席却仍有空位。'
        revealTitle='它只看每条请求当前最匹配谁，没有计算这个人已经多忙'
        revealDetail='局部最优不断叠加，会把热门专席挤爆。空闲专席并不能补回已经漏掉的请求。'
        takeaway='分得准还不够，必须同时看到每个专席的承载边界。'
        revealed={revealed}
        onReveal={() => setRevealed(true)}
        onNext={goNext}
      /> : null}

      {step === 3 ? <section aria-labelledby='golden-step-3'>
        <span className='golden-kicker'>第 3 关 · 只改一个人话变量</span>
        <h2 id='golden-step-3'>只调“分流器有多在乎别挤爆热门专席”</h2>
        <p className='golden-prompt'>12 条请求、每条的四项固定分数和每人最多 3 条都不变。找到既不漏接、又不乱分的区间。</p>
        <label className='golden-slider'>
          <span><b>只在乎最匹配</b><b>极度在乎别拥堵</b></span>
          <input aria-describedby='moe-slider-hint' min='0' max='10' step='1' value={concern} type='range' onChange={(event) => { setConcern(Number(event.target.value)); setSliderTouched(true) }} />
          <small id='moe-slider-hint'>唯一旋钮：分流器有多在乎别挤爆热门专席。当前 {concern}/10，可用方向键微调。</small>
        </label>
        <div className={`golden-feedback ${result.pass ? 'is-correct' : 'is-wrong'}`} role='status'><div><strong>{result.gate}</strong><p>{result.feedback}</p></div></div>
        <div className={`golden-live-result ${result.pass ? 'is-correct' : 'is-wrong'}`} aria-label='当前分流指标'>
          <Metric label='正确处理率' value={percent(result.qualityHitRate)} /><Metric label='漏接率' value={percent(result.dropRate)} />
          <Metric label='P95 等待' value={`${result.p95Latency} ms`} /><Metric label='每千次成本' value={`¥${result.costPer1k.toFixed(2)}`} />
        </div>
        <div className='golden-weight-list' aria-label='各专席利用率'>{result.utilization.map((item) => <div key={item.expertId}><span>{item.label}</span><i><b style={{ width: `${item.rate * 100}%` }} /></i><strong>{item.count}/3</strong></div>)}</div>
        <p className='golden-live-feedback'>漏接一律按质量错误计；因此正确处理率的分母始终是全部 12 条。</p>
        <ContinueButton disabled={!sliderTouched || !result.pass} onClick={goNext}>用这个中间区间继续</ContinueButton>
      </section> : null}

      {step === 4 ? <RuleStep
        title='为什么旋钮两端都不能上线？'
        prompt='请求、分数和每人最多处理量始终不变。请选择更准确的规律。'
        choices={[{ value: 'even', label: '四个人一样忙，就一定是最好结果' }, { value: 'tradeoff', label: '既要防爆仓，也不能把请求硬塞给不擅长的人' }]}
        selected={rule}
        onSelect={(value) => setRule(value as RuleChoice)}
        feedback={rule ? getRuleFeedback(rule) : null}
        onNext={goNext}
      /> : null}

      {step === 5 ? <PaperRevealStep
        principle={FINAL_PRINCIPLE}
        source='这对应 Switch Transformers 用稀疏路由激活少量专家，并用负载约束改善专家使用分布的核心取舍。'
        mappings={[
          { term: 'Router', chinese: '分流员', example: '根据每条请求的固定分数选择去向。' },
          { term: 'Expert', chinese: '专门处理一类请求的专家', example: '退款、政策、代码、检索四个专家。' },
          { term: 'Top-k routing', chinese: '只选得分最高的少数专家', example: '本课使用 Top-1，每条请求只去一个专家。' },
          { term: 'Load balancing', chinese: '避免忙闲悬殊', example: '旋钮越大，已拥堵专家越不容易继续被选。' },
          { term: 'Auxiliary loss', chinese: '平衡附加损失', example: `本次 λ=${result.lambda.toFixed(0)}，约束分流别持续扎堆。` },
          { term: 'Capacity', chinese: '专家容量', example: '本课固定每位专家最多处理 3 条。' },
        ]}
        formulaTitle='任务质量 + 负载均衡'
        formula='L = L_task + λ·L_balance'
        note={`当前账本：质量 ${percent(result.qualityHitRate)} · 漏接 ${percent(result.dropRate)} · P95 ${result.p95Latency} ms · ¥${result.costPer1k.toFixed(2)}/千次 · ${result.gate}`}
        deepDive={<MoeLedger />}
        boundary='固定 12 条请求、固定分数、Top-1 与硬容量的确定性教学；不模拟训练、token 级路由、通信开销、专家并行或真实服务价格。'
        onRestart={restart}
      /> : null}
    </GoldenLessonShell>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>
}

function MoeLedger() {
  return <><h3>成本—延迟—质量账本与上线闸门</h3><div className='moe-ledger' role='table' aria-label='混合专家上线闸门'>
    <div role='row'><b role='columnheader'>结论</b><b role='columnheader'>质量</b><b role='columnheader'>漏接</b><b role='columnheader'>解释</b></div>
    <div role='row'><span role='cell'>Go</span><span role='cell'>≥ 64%</span><span role='cell'>0%</span><span role='cell'>质量、容量、延迟与成本一起过线</span></div>
    <div role='row'><span role='cell'>Hold</span><span role='cell'>继续观察</span><span role='cell'>0%～16%</span><span role='cell'>只做可回退小流量</span></div>
    <div role='row'><span role='cell'>No-Go</span><span role='cell'>&lt; 64%</span><span role='cell'>&gt; 16%</span><span role='cell'>低 λ 爆仓或高 λ 低质量</span></div>
  </div><p>成本包含已处理请求的专家调用费；漏接按固定兜底费计入。P95 把漏接视为 1000 ms 超时，确保容量失败不会在延迟指标中消失。</p></>
}
