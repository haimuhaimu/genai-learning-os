import type { MixPart } from './strategyMath'

type Props = { title: string; parts: MixPart[]; note?: string }

const COLORS = ['mix-blue', 'mix-ochre', 'mix-slate', 'mix-sand', 'mix-pale']

export default function FeedbackMixBar({ title, parts, note }: Props) {
  const total = parts.reduce((sum, part) => sum + part.value, 0)
  return (
    <figure className='feedback-mix'>
      <figcaption>{title}</figcaption>
      <div className='feedback-track' aria-label={`${title}比例`}>
        {parts.map((part, index) => {
          const percent = total > 0 ? (part.value / total) * 100 : 0
          return (
            <span
              className={COLORS[index % COLORS.length]}
              key={part.label}
              style={{ width: `${percent}%` }}
              title={`${part.label} ${percent.toFixed(1)}%`}
            />
          )
        })}
      </div>
      <ul className='feedback-legend'>
        {parts.map((part, index) => {
          const percent = total > 0 ? (part.value / total) * 100 : 0
          return <li key={part.label}><i className={COLORS[index % COLORS.length]} />{part.label}<b>{percent.toFixed(1)}%</b></li>
        })}
      </ul>
      {note && <p>{note}</p>}
    </figure>
  )
}
