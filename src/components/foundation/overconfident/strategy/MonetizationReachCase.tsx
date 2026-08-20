import { ArrowLeft } from 'lucide-react'
import DecisionSummary from './DecisionSummary'
import FeedbackMixBar from './FeedbackMixBar'
import ImpactMetrics from './ImpactMetrics'
import { ChoiceControl, DataSummary, ExplanationCard, RangeControl } from './StrategyControls'
import { REACH_BUCKETS, calculateReach, type ReachControls } from './strategyMath'

type Props = {
  controls: ReachControls
  onChange: (controls: ReachControls) => void
  onExplore: () => void
  onForm: (summary: string) => void
  onExit: () => void
}

const integer = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 })
const money = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 })

export default function MonetizationReachCase({ controls, onChange, onExplore, onForm, onExit }: Props) {
  const result = calculateReach(controls)
  const set = (patch: Partial<ReachControls>) => { onChange({ ...controls, ...patch }); onExplore() }
  const summary = `触达阈值设为 ${controls.threshold.toFixed(1)}，频控为 7 天 ${controls.frequency} 次，新作者最低占比 ${controls.newAuthorQuota * 100}%。预计触达 ${integer.format(result.reached)} 位作者、带来 ${result.expectedConversions.toFixed(1)} 次转化，净收益约 ¥${money.format(result.netRevenue)}；新作者占反馈 ${result.newAuthorShare.toFixed(1)}%。配额以部分短期效率换取新作者需求的可见性。`

  return (
    <div className='strategy-case'>
      <header className='case-header'>
        <p>作者变现机会触达</p>
        <h2>把机会告诉哪些作者？</h2>
        <span>你要找到可能使用变现工具的作者。触达会打扰作者，但过于保守，也会错过真实需求。</span>
      </header>

      <section className='strategy-controls' aria-label='作者触达策略控件'>
        <RangeControl id='reach-threshold' label='触达阈值' value={controls.threshold} min={0.3} max={0.9} step={0.1} format={(value) => value.toFixed(1)} onChange={(threshold) => set({ threshold })} />
        <ChoiceControl label='触达频控' value={controls.frequency} choices={[{ value: 1, label: '7 天 1 次' }, { value: 2, label: '7 天 2 次' }]} onChange={(frequency) => set({ frequency })} />
        <ChoiceControl label='新作者最低占比' value={controls.newAuthorQuota} choices={[{ value: 0.2, label: '20%' }, { value: 0.4, label: '40%' }]} onChange={(newAuthorQuota) => set({ newAuthorQuota })} />
      </section>

      <DataSummary>
        <ul className='bucket-summary'>
          {REACH_BUCKETS.map((bucket) => <li key={bucket.score}><b>{bucket.score.toFixed(2)} 分</b><span>{integer.format(bucket.count)} 人</span><span>转化率 {(bucket.rate * 100).toFixed(1)}% · 新作者 {(bucket.newAuthorShare * 100).toFixed(0)}%</span></li>)}
        </ul>
      </DataSummary>

      <ImpactMetrics metrics={[
        { label: '触达作者', value: `${integer.format(result.reached)} 人` },
        { label: '预期转化', value: `${result.expectedConversions.toFixed(1)} 次`, emphasis: true },
        { label: '净收益', value: `¥${money.format(result.netRevenue)}`, hint: `触达成本 ¥${money.format(result.frequencyCost)}` },
        { label: '新作者覆盖', value: `${integer.format(result.newAuthors)} 人`, hint: `占触达 ${result.newAuthorShare.toFixed(1)}%` },
      ]} />

      <div className='explanation-grid'>
        <ExplanationCard title='为什么准确率会误导'>
          <p>“永远预测不转化”约有 98% 准确率，但不会触达任何作者，净收益为 0。</p>
          <p>当前策略预计净收益为 <b>¥{money.format(result.netRevenue)}</b>。是否值得触达，需要比较转化收益与打扰成本，而不是只看多数类准确率。</p>
        </ExplanationCard>
        <ExplanationCard title='这会让模型看到什么'>
          <p>只触达最高分作者会让反馈高度集中，低分新作者是否有需求永远不可见；配额是在用部分短期效率换反馈覆盖。</p>
          <FeedbackMixBar title='新 / 成熟作者反馈比例' parts={result.feedbackMix} />
        </ExplanationCard>
      </div>

      <DecisionSummary summary={summary} onForm={onForm} />
      <footer className='scene-footer'><button type='button' className='course-link' onClick={onExit}><ArrowLeft aria-hidden='true' />到这里就好</button></footer>
    </div>
  )
}
