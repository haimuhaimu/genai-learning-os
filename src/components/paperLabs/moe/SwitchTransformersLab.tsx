import { useLayoutEffect, useMemo, useRef } from 'react'
import { ContinueButton, GoldenLessonShell } from '../shared/GoldenLessonShell'
import { GuessStep, MistakeStep, PaperRevealStep, RuleStep } from '../shared/GoldenLessonSteps'
import { usePaperLesson } from '../shared/PaperLessonContext'
import { FINAL_PRINCIPLE, LAUNCH_CHOICES, evaluateBalanceConcern, getGuessFeedback, getRuleFeedback, nextLessonStep, type RuleChoice } from './lessonModel'
import { useMoeExperiment } from './useMoeExperiment'

const percent = (value: number) => `${(value * 100).toFixed(1)}%`

export default function SwitchTransformersLab() {
  const { initialStep } = usePaperLesson()
  const session = useMoeExperiment(initialStep)
  const { attempt, view, notebook, notice, unsaved, update } = session
  const step = attempt?.step ?? session.legacyStep
  const { guess = null, revealed = false, concern = 0, touched: sliderTouched = false, rule = null } = attempt ?? {}
  const lessonTop = useRef<HTMLDivElement>(null)
  const result = useMemo(() => evaluateBalanceConcern(concern), [concern])
  const recorded = attempt?.result
  const legacy = view === 'legacy'
  // Focus during the committed step change, not in a later frame that can steal a slider keypress.
  useLayoutEffect(() => { lessonTop.current?.focus() }, [step])

  const goNext = () => {
    update({ step: nextLessonStep(step) })
  }
  const restart = () => {
    session.startRound()
  }

  return (
    <GoldenLessonShell step={step} eyebrow='四专席分流挑战' title='让每类请求找到对的人，也别让热门专席爆仓' lessonRef={lessonTop} trackProgress={false}>
      <section className={`golden-feedback ${legacy ? 'is-wrong' : 'is-correct'}`} aria-label='本轮实验记录'>
        <div><strong>{legacy ? '历史学习记录：参数未保存，不能还原当时实验。' : view === 'review' ? unsaved ? '本轮结果暂未确认保存' : '按这次完整实验复习' : '正在记录这一轮实验'}</strong>
          {legacy ? <p>{['invalid', 'unsupported', 'unavailable'].includes(session.load.kind) ? '实验存档暂时无法可靠读取，没有用默认参数替代旧结果。' : '旧记录只保存了学习进度，没有保存预测、参数和结果。原有完成标记保留，不补造“本次”数据。'}</p> : <>
            {guess !== null && <p>最初预测：{LAUNCH_CHOICES[guess]}。{getGuessFeedback(guess).correct ? '当时的判断方向正确。' : '这是当时的原选择，后续反馈不会替你改写它。'}</p>}
            {rule && <p>当时选择的规律：{rule === 'tradeoff' ? '既要防爆仓，也不能把请求硬塞给不擅长的人' : '四个人一样忙，就一定是最好结果'}。{getRuleFeedback(rule).correct ? '' : '这个选择仍需修正；看过解释不代表已经掌握。'}</p>}
            <p>{view === 'review' ? '下面的参数和账本对应这一轮。未完成的新实验，不会替换这份完整记录。' : '操作只保存在当前浏览器；保存做过什么，不认证已经掌握。'}</p>
          </>}
          {view === 'review' && notebook.draft && <button type='button' className='golden-restart-button' onClick={restart}>继续未完成的一轮</button>}
          {view === 'draft' && notebook.lastCompleted && <button type='button' className='golden-restart-button' onClick={session.showCompleted}>查看上次完整实验</button>}
        </div>
      </section>
      {notice && <div className='golden-feedback is-wrong' role='status'><div><p>{notice}</p><button type='button' className='golden-restart-button' onClick={session.reloadRecords}>查看最新保存记录</button></div></div>}
      {legacy && step !== 5 ? <section><h2>旧记录停在第 {step} 关</h2><p>参数未保存，不能还原当时实验。可以保留旧进度，从预测开始一轮新实验。</p><button type='button' className='golden-primary-button' onClick={restart}>重新挑战</button></section> : null}
      {!legacy && step === 1 ? <GuessStep
        title='12 条请求同时到来，怎样判断这套分流能否上线？'
        prompt='退款、政策、代码、检索请求要分给四个专席；每个专席最多接 3 条。'
        choices={LAUNCH_CHOICES.map((label, value) => ({ label, value }))}
        selected={guess}
        onSelect={(value) => update({ guess: Number(value) })}
        feedback={guess === null ? null : getGuessFeedback(guess)}
        onNext={goNext}
      /> : null}

      {!legacy && step === 2 ? <MistakeStep
        title='AI 总选看起来最靠谱的退款专席，三条之后就爆仓了'
        decision='把后续退款请求继续塞给热门专席'
        reason='这个专席对退款请求的固定匹配分最高。'
        consequence='后果：12 条固定请求中有 3 条被漏接，冷门专席却仍有空位。'
        revealTitle='它只看每条请求当前最匹配谁，没有计算这个人已经多忙'
        revealDetail='局部最优不断叠加，会把热门专席挤爆。空闲专席并不能补回已经漏掉的请求。'
        takeaway='分得准还不够，必须同时看到每个专席的承载边界。'
        revealed={revealed}
        onReveal={() => update({ revealed: true })}
        onNext={goNext}
      /> : null}

      {!legacy && step === 3 ? <section aria-labelledby='golden-step-3'>
        <span className='golden-kicker'>第 3 关 · 只改一个人话变量</span>
        <h2 id='golden-step-3'>只调“分流器有多在乎别挤爆热门专席”</h2>
        <p className='golden-prompt'>12 条请求、每条的四项固定分数和每人最多 3 条都不变。找到既不漏接、又不乱分的区间。</p>
        <label className='golden-slider'>
          <span><b>只在乎最匹配</b><b>极度在乎别拥堵</b></span>
          <input aria-describedby='moe-slider-hint' min='0' max='10' step='1' value={concern} type='range' onChange={(event) => update({ concern: Number(event.target.value), touched: true })} />
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

      {!legacy && step === 4 ? <RuleStep
        title='为什么旋钮两端都不能上线？'
        prompt='请求、分数和每人最多处理量始终不变。请选择更准确的规律。'
        choices={[{ value: 'even', label: '四个人一样忙，就一定是最好结果' }, { value: 'tradeoff', label: '既要防爆仓，也不能把请求硬塞给不擅长的人' }]}
        selected={rule}
        onSelect={(value) => update({ rule: value as RuleChoice })}
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
          { term: 'Auxiliary loss', chinese: '平衡附加损失', example: recorded ? `本次 λ=${recorded.lambda.toFixed(0)}，约束分流别持续扎堆。` : '平衡约束影响分流；这条旧记录没有保存当时的数值。' },
          { term: 'Capacity', chinese: '专家容量', example: '本课固定每位专家最多处理 3 条。' },
        ]}
        formulaTitle='任务质量 + 负载均衡'
        formula='L = L_task + λ·L_balance'
        note={recorded ? `当前账本：质量 ${percent(recorded.qualityHitRate)} · 漏接 ${percent(recorded.dropRate)} · P95 ${recorded.p95Latency} ms · ¥${recorded.costPer1k.toFixed(2)}/千次 · ${recorded.gate}` : undefined}
        completionLabel={legacy ? '历史学习记录' : unsaved ? '本轮操作已完成（未确认保存）' : '通关'}
        completionHint={legacy ? '参数未保存，不能还原当时实验；原有进度保留。' : '这轮结果不是能力认证。可用自己的话解释取舍，或重新挑战；新一轮完成后成为最近的完整记录。'}
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
