import { ArrowLeft } from 'lucide-react'
import DecisionSummary from './DecisionSummary'
import FeedbackMixBar from './FeedbackMixBar'
import ImpactMetrics from './ImpactMetrics'
import { ChoiceControl, DataSummary, ExplanationCard, RangeControl, ToggleControl } from './StrategyControls'
import { RISK_BUCKETS, calculateRisk, normalizeRiskControls, type RiskControls } from './strategyMath'

type Props = {
  controls: RiskControls
  onChange: (controls: RiskControls) => void
  onExplore: () => void
  onForm: (summary: string) => void
  onExit: () => void
}

const integer = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 })
const money = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 })

export default function RiskGovernanceCase({ controls, onChange, onExplore, onForm, onExit }: Props) {
  const safeControls = normalizeRiskControls(controls)
  const result = calculateRisk(safeControls)
  const set = (patch: Partial<RiskControls>) => { onChange(normalizeRiskControls({ ...safeControls, ...patch })); onExplore() }
  const summary = `复核区间设为 ${safeControls.reviewStart.toFixed(1)} 至 ${safeControls.directLimit.toFixed(1)}，人工预算 ${safeControls.reviewBudget} 人，柔性保护${safeControls.softProtection ? '开启' : '关闭'}。预计直接限制 ${integer.format(result.directCount)} 人、复核 ${integer.format(result.reviewCount)} 人、放过 ${result.allowedRisk.toFixed(1)} 个风险主体，总业务成本约 ¥${money.format(result.totalCost)}。预算优先覆盖高分难例，中间分数段标签覆盖仍需持续观察。`

  return (
    <div className='strategy-case'>
      <header className='case-header'>
        <p>风险治理与人工复核</p>
        <h2>限制、复核，还是先放行？</h2>
        <span>风险主体只占少数。你要决定谁直接限制、谁进入复核，以及要为误伤留下多少缓冲。</span>
      </header>

      <section className='strategy-controls' aria-label='风险治理策略控件'>
        <RangeControl id='review-start' label='复核起点 a' value={safeControls.reviewStart} min={0.3} max={0.7} step={0.1} format={(value) => value.toFixed(1)} onChange={(reviewStart) => set({ reviewStart })} />
        <RangeControl id='direct-limit' label='直接限制 b' value={safeControls.directLimit} min={0.7} max={0.9} step={0.1} format={(value) => value.toFixed(1)} onChange={(directLimit) => set({ directLimit })} />
        <ChoiceControl label='人工预算' value={safeControls.reviewBudget} choices={[{ value: 200, label: '200 人' }, { value: 500, label: '500 人' }]} onChange={(reviewBudget) => set({ reviewBudget })} />
        <ToggleControl label='柔性保护' checked={safeControls.softProtection} detail='高价值正常主体误伤成本减半，资源成本 +1 / 人' onChange={(softProtection) => set({ softProtection })} />
      </section>

      <DataSummary>
        <ul className='bucket-summary'>
          {RISK_BUCKETS.map((bucket) => <li key={bucket.score}><b>{bucket.score.toFixed(2)} 分</b><span>{integer.format(bucket.count)} 人</span><span>风险率 {(bucket.rate * 100).toFixed(1)}% · 高价值 {(bucket.highValueShare * 100).toFixed(0)}%</span></li>)}
        </ul>
      </DataSummary>

      <ImpactMetrics metrics={[
        { label: '直接限制', value: `${integer.format(result.directCount)} 人` },
        { label: '进入复核', value: `${integer.format(result.reviewCount)} 人` },
        { label: '放过风险', value: `${result.allowedRisk.toFixed(1)} 人` },
        { label: '总业务成本', value: `¥${money.format(result.totalCost)}`, emphasis: true },
        { label: '高价值误伤', value: `${result.highValueHarm.toFixed(1)} 人`, hint: '直接限制与复核后的期望值' },
      ]} />

      <div className='explanation-grid'>
        <ExplanationCard title='为什么准确率会误导'>
          <p>全部放行接近 99% 准确，但会把风险成本完整留在业务里。</p>
          <p>当前策略准确率约 <b>{result.accuracy.toFixed(2)}%</b>。即使准确率变化不大，总业务成本也会显著变化，因为漏判、误伤和资源的单价不同。</p>
        </ExplanationCard>
        <ExplanationCard title='这会让模型看到什么'>
          <p>复核样本是高质量难例标签来源；预算只放在最高分区间时，中间分数段长期缺少干净标签。</p>
          <FeedbackMixBar title='复核样本分数段比例' parts={result.feedbackMix} note={result.reviewCount === 0 ? '当前没有样本进入复核。' : undefined} />
        </ExplanationCard>
      </div>

      <DecisionSummary summary={summary} onForm={onForm} />
      <footer className='scene-footer'><button type='button' className='course-link' onClick={onExit}><ArrowLeft aria-hidden='true' />到这里就好</button></footer>
    </div>
  )
}
