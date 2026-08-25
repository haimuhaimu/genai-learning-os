import { Box, CheckCircle2, Layers3 } from 'lucide-react'
import type { MechanismData, MechanismSpec } from './types'

const palette = ['var(--lo-accent)', '#4d74ce', '#7d98d5', '#a9b9de', '#d1d9eb']

function TokenBudgetView({ data }: { data: Extract<MechanismData, { kind: 'token-budget' }> }) {
  return (
    <>
      <div className='mechanism-budget-track' role='img' aria-label={data.ariaLabel}>
        {data.segments.filter((segment) => segment.retained > 0).map((segment, index) => (
          <span key={segment.id} style={{ width: `${segment.retained / data.capacity * 100}%`, background: palette[index] }} title={`${segment.label}: ${segment.retained} token`} />
        ))}
      </div>
      <div className='mechanism-legend'>{data.segments.map((segment, index) => <span key={segment.id}><i style={{ background: palette[index] }} aria-hidden='true' />{segment.label}<b>{segment.retained}/{segment.requested}</b></span>)}</div>
      <div className='mechanism-budget-status'>
        <strong>{data.used.toFixed(0)} / {data.capacity.toFixed(0)} token</strong>
        <span className={data.overflow ? 'is-warning' : ''}>{data.overflow ? `overflow ${data.overflow.toFixed(0)}` : '无 overflow'}</span>
      </div>
      <div className='mechanism-task-grid' aria-label='8 项固定任务保留情况'>
        {data.retainedTasks.map((task) => <span className='is-kept' key={task}><CheckCircle2 aria-hidden='true' />{task}</span>)}
        {data.droppedTasks.map((task) => <span key={task}>{task}</span>)}
      </div>
    </>
  )
}

function ChunkSimulationView({ data }: { data: Extract<MechanismData, { kind: 'chunk-simulation' }> }) {
  const documents = [...new Set(data.chunks.map((chunk) => chunk.documentTitle))]
  return (
    <>
      <div className='mechanism-query'><b>Query</b><span>{data.query}</span></div>
      <div className='mechanism-documents' role='img' aria-label={data.ariaLabel}>
        {documents.map((title) => (
          <section key={title}>
            <header><b>{title}</b><small>{data.chunks.filter((chunk) => chunk.documentTitle === title).length} 块</small></header>
            <div>{data.chunks.filter((chunk) => chunk.documentTitle === title).map((chunk) => (
              <article key={chunk.id} className={`${chunk.selected ? 'is-selected' : ''} ${chunk.hitLabels.length ? 'has-hit' : ''}`} aria-label={`${chunk.rangeLabel} token，${chunk.preview}${chunk.selected ? '，已进入上下文' : ''}`}>
                <span>{chunk.rangeLabel}</span><b>{chunk.preview}</b>{chunk.hitLabels.length ? <small>{chunk.hitLabels.join('、')}</small> : null}
              </article>
            ))}</div>
          </section>
        ))}
      </div>
      <p className='mechanism-selection-count'><Box aria-hidden='true' />TopK 实际装入 {data.selectedCount} 块</p>
    </>
  )
}

export default function MechanismSandboxPanel({ spec, data }: { spec: MechanismSpec; data: MechanismData }) {
  return (
    <section className='mechanism-sandbox-panel strategy-evidence-panel strategy-summary-panel' aria-labelledby='mechanism-sandbox-title'>
      <header><Layers3 aria-hidden='true' /><div><span>再解释</span><h2 id='mechanism-sandbox-title'>{spec.title}</h2><p>{spec.description}</p></div></header>
      <div className='mechanism-stage'>
        {data.kind === 'token-budget' ? <TokenBudgetView data={data} /> : <ChunkSimulationView data={data} />}
      </div>
      <p className='mechanism-live-summary' aria-live='polite'>{data.summary}</p>
    </section>
  )
}
