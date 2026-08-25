import type { ControlSchema, ControlValue, ControlValues } from './types'

type Props = { schema: ControlSchema[]; values: ControlValues; onChange: (id: string, value: ControlValue) => void }
const formatValue = (control: Extract<ControlSchema, { type: 'range' }>, value: number) => control.format === 'percent' ? `${Math.round(value * 100)}%` : control.format === 'integer' ? value.toFixed(0) : value.toFixed(2)

export default function StrategyControlsPanel({ schema, values, onChange }: Props) {
  return (
    <section className='strategy-controls-panel' aria-labelledby='strategy-controls-title'>
      <header><span>再操控</span><h2 id='strategy-controls-title'>改变机制参数</h2><p>每次调整都用同一份固定数据重新计算。</p></header>
      <div className='strategy-control-grid'>
        {schema.map((control) => {
          const value = values[control.id]
          if (control.type === 'range') return <label className='strategy-range' key={control.id} htmlFor={`strategy-${control.id}`}><span><b>{control.label}</b><output>{formatValue(control, Number(value))}</output></span><input id={`strategy-${control.id}`} type='range' min={control.min} max={control.max} step={control.step} value={Number(value)} onChange={(event) => onChange(control.id, Number(event.target.value))} />{control.detail ? <small>{control.detail}</small> : null}</label>
          if (control.type === 'toggle') return <label className='strategy-toggle' key={control.id}><span><b>{control.label}</b>{control.detail ? <small>{control.detail}</small> : null}</span><input type='checkbox' checked={Boolean(value)} onChange={(event) => onChange(control.id, event.target.checked)} /><i aria-hidden='true' /></label>
          if (control.type === 'select') return <label className='strategy-select' key={control.id} htmlFor={`strategy-${control.id}`}><b>{control.label}</b><select id={`strategy-${control.id}`} value={String(value)} onChange={(event) => { const option = control.options.find((item) => String(item.value) === event.target.value); onChange(control.id, option?.value ?? event.target.value) }}>{control.options.map((option) => <option key={String(option.value)} value={String(option.value)}>{option.label}</option>)}</select>{control.detail ? <small>{control.detail}</small> : null}</label>
          return <fieldset className='strategy-choice' key={control.id}><legend>{control.label}</legend><div>{control.options.map((option) => <button type='button' key={String(option.value)} className={value === option.value ? 'is-active' : ''} aria-pressed={value === option.value} onClick={() => onChange(control.id, option.value)}>{option.label}</button>)}</div>{control.detail ? <small>{control.detail}</small> : null}</fieldset>
        })}
      </div>
    </section>
  )
}
