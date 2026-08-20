export type ImpactMetric = {
  label: string
  value: string
  hint?: string
  emphasis?: boolean
}

type Props = { metrics: ImpactMetric[]; label?: string }

export default function ImpactMetrics({ metrics, label = '即时结果' }: Props) {
  return (
    <section className='strategy-results' aria-label={label} aria-live='polite'>
      <h3>{label}</h3>
      <div className='strategy-metric-grid'>
        {metrics.map((metric) => (
          <div className={metric.emphasis ? 'strategy-metric is-emphasis' : 'strategy-metric'} key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            {metric.hint && <small>{metric.hint}</small>}
          </div>
        ))}
      </div>
    </section>
  )
}
