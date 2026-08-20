import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Search, X } from 'lucide-react'
import { searchIndex, type SearchDestination } from '../../searchIndex'

type Go = (page: string, options?: Record<string, string>) => void

type CommandPaletteProps = {
  open: boolean
  onClose: () => void
  go: Go
  returnFocus: HTMLElement | null
}

const normalize = (value: string) => value.trim().toLocaleLowerCase()

export default function CommandPalette({ open, onClose, go, returnFocus }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const results = useMemo(() => {
    const needle = normalize(query)
    if (!needle) return searchIndex.slice(0, 12)
    return searchIndex.filter((item) => normalize([item.title, item.subtitle, ...item.keywords].join(' ')).includes(needle)).slice(0, 20)
  }, [query])

  useEffect(() => setActiveIndex(0), [query])
  useEffect(() => {
    if (!open) return
    setQuery('')
    setActiveIndex(0)
    const frame = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open])

  const close = () => {
    onClose()
    requestAnimationFrame(() => returnFocus?.focus())
  }

  const choose = (item: SearchDestination) => {
    go(item.page, item.options)
    close()
  }

  const trapFocus = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => results.length ? (current + 1) % results.length : 0)
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => results.length ? (current - 1 + results.length) % results.length : 0)
      return
    }
    if (event.key === 'Enter' && !event.nativeEvent.isComposing && results[activeIndex]) {
      event.preventDefault()
      choose(results[activeIndex])
      return
    }
    if (event.key !== 'Tab' || !panelRef.current) return
    const focusable = [...panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  if (!open) return null

  return (
    <div className='lo-command-backdrop' onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
      <div className='lo-command-panel' ref={panelRef} role='dialog' aria-modal='true' aria-labelledby='lo-command-title' onKeyDown={trapFocus}>
        <header>
          <div><span>全局导航</span><h2 id='lo-command-title'>搜索课程、实验与评审</h2></div>
          <button type='button' onClick={close} aria-label='关闭搜索'><X aria-hidden='true' /></button>
        </header>
        <div className='lo-command-input'>
          <Search aria-hidden='true' />
          <input
            ref={inputRef}
            role='combobox'
            aria-expanded='true'
            aria-controls='lo-command-results'
            aria-activedescendant={results[activeIndex] ? `lo-command-option-${results[activeIndex].id}` : undefined}
            aria-autocomplete='list'
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='试试“交叉熵”“Pass@k”“KV Cache”“蒸馏”'
          />
          <kbd>ESC</kbd>
        </div>
        <p className='lo-command-count' role='status' aria-live='polite'>{query ? `找到 ${results.length} 个结果` : '推荐入口'}</p>
        <div className='lo-command-results' id='lo-command-results' role='listbox' aria-label='搜索结果'>
          {results.map((item, index) => (
            <button
              type='button'
              role='option'
              aria-selected={index === activeIndex}
              id={`lo-command-option-${item.id}`}
              key={item.id}
              className={index === activeIndex ? 'is-active' : ''}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(item)}
              tabIndex={-1}
            >
              <span><small>{item.group}</small><b>{item.title}</b><em>{item.subtitle}</em></span><ArrowRight aria-hidden='true' />
            </button>
          ))}
          {!results.length ? <div className='lo-command-empty'><b>没有匹配结果</b><span>换一个课程名、实验名或技术关键词试试。</span></div> : null}
        </div>
        <footer><span><kbd>↑</kbd><kbd>↓</kbd> 移动</span><span><kbd>↵</kbd> 打开</span><span><kbd>ESC</kbd> 关闭</span></footer>
      </div>
    </div>
  )
}
