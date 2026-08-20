import type { ReactNode } from 'react'

type RangeProps = {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  format?: (value: number) => string
}

export function RangeControl({ id, label, value, min, max, step, onChange, format = String }: RangeProps) {
  return (
    <label className='strategy-control range-control' htmlFor={id}>
      <span>{label}<output htmlFor={id}>{format(value)}</output></span>
      <input id={id} type='range' min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <small><span>{format(min)}</span><span>{format(max)}</span></small>
    </label>
  )
}

type Choice<T extends string | number> = { value: T; label: string }
type ChoiceProps<T extends string | number> = {
  label: string
  value: T
  choices: Choice<T>[]
  onChange: (value: T) => void
}

export function ChoiceControl<T extends string | number>({ label, value, choices, onChange }: ChoiceProps<T>) {
  return (
    <fieldset className='strategy-control choice-control'>
      <legend>{label}</legend>
      <div>
        {choices.map((choice) => (
          <label key={choice.value}>
            <input type='radio' name={label} value={choice.value} checked={value === choice.value} onChange={() => onChange(choice.value)} />
            <span>{choice.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

type ToggleProps = { label: string; checked: boolean; detail: string; onChange: (checked: boolean) => void }

export function ToggleControl({ label, checked, detail, onChange }: ToggleProps) {
  return (
    <label className='strategy-control toggle-control'>
      <span><b>{label}</b><small>{detail}</small></span>
      <input type='checkbox' checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <i aria-hidden='true' />
      <em>{checked ? '开' : '关'}</em>
    </label>
  )
}

export function DataSummary({ children }: { children: ReactNode }) {
  return <section className='fixed-data' aria-label='固定数据摘要'><h3>固定数据摘要</h3>{children}</section>
}

export function ExplanationCard({ title, children }: { title: string; children: ReactNode }) {
  return <article className='explanation-card'><h3>{title}</h3>{children}</article>
}
