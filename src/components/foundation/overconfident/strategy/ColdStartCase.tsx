import { ArrowLeft } from 'lucide-react'
import DecisionSummary from './DecisionSummary'
import FeedbackMixBar from './FeedbackMixBar'
import ImpactMetrics from './ImpactMetrics'
import { ChoiceControl, DataSummary, ExplanationCard, RangeControl, ToggleControl } from './StrategyControls'
import { COLD_START_BUCKETS, calculateColdStart, type ColdStartControls } from './strategyMath'

type Props = {
  controls: ColdStartControls
  onChange: (controls: ColdStartControls) => void
  onExplore: () => void
  onForm: (summary: string) => void
  onExit: () => void
}

const integer = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 })
const decimal = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 })

export default function ColdStartCase({ controls, onChange, onExplore, onForm, onExit }: Props) {
  const result = calculateColdStart(controls)
  const set = (patch: Partial<ColdStartControls>) => { onChange({ ...controls, ...patch }); onExplore() }
  const summary = `扩量阈值设为 ${controls.threshold.toFixed(1)}，探索流量 ${controls.exploration * 100}%，基础保底${controls.guarantee ? '开启' : '关闭'}。预计发现 ${decimal.format(result.found)} 条潜力内容、错过 ${decimal.format(result.missed)} 条；反馈中 ${result.midLowFeedbackShare.toFixed(1)}% 来自中低分内容。该策略在短期流量效率与后续可学习样本覆盖之间取舍。`

  return (
    <div className='strategy-case'>
      <header className='case-header'>
        <p>冷启动流量分配</p>
        <h2>有限流量先给谁？</h2>
        <span>新内容没有历史反馈。你要在有限流量里，同时找到潜力内容，也避免把流量只给“看起来最稳”的少数内容。</span>
      </header>

      <section className='strategy-controls' aria-label='冷启动策略控件'>
        <RangeControl id='cold-threshold' label='扩量阈值' value={controls.threshold} min={0.3} max={0.9} step={0.1} format={(value) => value.toFixed(1)} onChange={(threshold) => set({ threshold })} />
        <ChoiceControl label='探索流量' value={controls.exploration} choices={[{ value: 0, label: '0%' }, { value: 0.1, label: '10%' }, { value: 0.2, label: '20%' }]} onChange={(exploration) => set({ exploration })} />
        <ToggleControl label='基础保底' checked={controls.guarantee} detail='给所有未扩量内容分配总预算 15% 的保底曝光' onChange={(guarantee) => set({ guarantee })} />
      </section>

      <DataSummary>
        <ul className='bucket-summary'>
          {COLD_START_BUCKETS.map((bucket) => <li key={bucket.score}><b>{bucket.score.toFixed(1)} 分</b><span>{integer.format(bucket.count)} 条</span><span>高质率 {(bucket.rate * 100).toFixed(0)}%</span></li>)}
        </ul>
      </DataSummary>

      <ImpactMetrics metrics={[
        { label: '发现潜力内容', value: `${decimal.format(result.found)} 条`, hint: '按固定高质率计算', emphasis: true },
        { label: '错过潜力内容', value: `${decimal.format(result.missed)} 条` },
        { label: '浪费流量', value: `${decimal.format(result.wasted)} 次`, hint: '曝光给低质内容' },
        { label: '中低分样本占反馈比例', value: `${result.midLowFeedbackShare.toFixed(1)}%` },
      ]} />

      <div className='explanation-grid'>
        <ExplanationCard title='为什么准确率会误导'>
          <p>在约 5% 正例下，全部判低质也有约 95% 准确率，但一条潜力内容也发现不了。</p>
          <p>当前阈值的分类准确率约 <b>{result.thresholdAccuracy.toFixed(1)}%</b>，仍会错过 <b>{decimal.format(result.opportunityCost)}</b> 条潜力内容。机会成本不会自动体现在准确率里。</p>
        </ExplanationCard>
        <ExplanationCard title='这会让模型看到什么'>
          <p>高阈值、低探索会让反馈集中在高分桶，线上可见交叉熵可能更好看，但不代表中间分数学得更好。</p>
          <FeedbackMixBar title='反馈样本来源' parts={result.feedbackMix} />
        </ExplanationCard>
      </div>

      <DecisionSummary summary={summary} onForm={onForm} />
      <footer className='scene-footer'><button type='button' className='course-link' onClick={onExit}><ArrowLeft aria-hidden='true' />到这里就好</button></footer>
    </div>
  )
}
