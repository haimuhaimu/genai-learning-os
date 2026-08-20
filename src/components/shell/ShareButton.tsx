import { useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'

async function copyWithFallback(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()
  if (!copied) throw new Error('copy unavailable')
}

export default function ShareButton({ label = '复制当前链接', ariaLabel, url, className = '' }: {
  label?: string
  ariaLabel?: string
  url?: string | (() => string)
  className?: string
}) {
  const [status, setStatus] = useState('')
  const timerRef = useRef<number>()

  const copy = async () => {
    const target = typeof url === 'function' ? url() : url ?? window.location.href
    try {
      await copyWithFallback(target)
      setStatus('链接已复制')
    } catch {
      setStatus('复制失败，请从浏览器地址栏复制')
    }
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setStatus(''), 2600)
  }

  return (
    <span className={`lo-share-control ${className}`.trim()}>
      <button type='button' onClick={copy} aria-label={ariaLabel ?? label}>{status === '链接已复制' ? <Check aria-hidden='true' /> : <Copy aria-hidden='true' />}<span>{label}</span></button>
      <span className='lo-share-status' role='status' aria-live='polite'>{status}</span>
    </span>
  )
}
