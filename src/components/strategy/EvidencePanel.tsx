import { CircleDollarSign, Database, Eye, RotateCcw } from 'lucide-react'
import type { DecisionEvidence } from './types'

type Props = { fixedDataTitle: string; fixedDataRows: string[]; evidence: DecisionEvidence }

export default function EvidencePanel({ fixedDataTitle, fixedDataRows, evidence }: Props) {
  return (
    <section className='strategy-evidence-panel' aria-live='polite' aria-labelledby='evidence-title'>
      <header><span>固定证据与代价</span><h2 id='evidence-title'>结果不是抽样运气</h2></header>
      <div className='strategy-fixed-data'><Database aria-hidden='true' /><div><h3>{fixedDataTitle}</h3><ul>{fixedDataRows.map((row) => <li key={row}>{row}</li>)}</ul></div></div>
      <div className='strategy-metrics'>{evidence.metrics.map((metric) => <article key={metric.id} className={metric.emphasis ? 'is-emphasis' : ''}><span>{metric.label}</span><strong>{metric.display}</strong>{metric.hint ? <small>{metric.hint}</small> : null}</article>)}</div>
      <div className='strategy-evidence-grid'>
        <article><header><CircleDollarSign aria-hidden='true' /><h3>代价账本</h3></header><dl>{evidence.costs.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}{item.note ? <small>{item.note}</small> : null}</dd></div>)}</dl></article>
        <article><header><Eye aria-hidden='true' /><h3>反馈可见性</h3></header><p>{evidence.feedbackSource}</p><ul>{evidence.feedbackSignals.map((signal) => <li key={signal}>{signal}</li>)}</ul></article>
        <article><header><RotateCcw aria-hidden='true' /><h3>下一轮训练</h3></header><p className='strategy-next-action'>{evidence.nextTrainingAction}</p>{evidence.caution ? <aside>{evidence.caution}</aside> : null}</article>
      </div>
    </section>
  )
}
