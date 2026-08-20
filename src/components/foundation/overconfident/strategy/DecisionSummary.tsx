import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'

type Props = { summary: string; onForm: (summary: string) => void }

export default function DecisionSummary({ summary, onForm }: Props) {
  const [formed, setFormed] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setFormed(false)
    setCopied(false)
  }, [summary])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className='decision-summary' aria-live='polite'>
      <button type='button' className='primary-quiet-button' onClick={() => { setFormed(true); onForm(summary) }}>
        形成策略摘要
      </button>
      {formed && (
        <div className='decision-summary-output'>
          <p>{summary}</p>
          <button type='button' className='copy-button' onClick={copy} aria-label='复制策略摘要'>
            {copied ? <Check aria-hidden='true' /> : <Copy aria-hidden='true' />}
            {copied ? '已复制' : '复制'}
          </button>
        </div>
      )}
    </section>
  )
}
