import { useEffect, useRef, useState, type RefObject } from 'react'
import { ArrowUpRight, BookOpen, FlaskConical, Home, Menu, MessageCircle, Route, Search, ShieldCheck, Target, TrendingUp, Video, X } from 'lucide-react'
import ShareButton from './ShareButton'

export type HeaderPage = 'unified-map' | 'routes' | 'labs' | 'reviews' | 'strategy-cases' | 'videos' | 'progress' | 'handbook'
type Go = (page: string, options?: Record<string, string>) => void

const navItems = [
  { id: 'unified-map', label: '首页', icon: Home },
  { id: 'routes', label: '学习路线', icon: Route },
  { id: 'strategy-cases', label: '策略案例（Case）', icon: Target },
  { id: 'videos', label: '参考视频库（可选）', icon: Video },
  { id: 'labs', label: '实验室', icon: FlaskConical },
  { id: 'reviews', label: '评审', icon: ShieldCheck },
  { id: 'progress', label: '进度', icon: TrendingUp },
  { id: 'handbook', label: '手册', icon: BookOpen },
] as const

function navSection(page: string): HeaderPage {
  if (page === 'strategy-case') return 'strategy-cases'
  if (['foundation-lab', 'expert-lab', 'agent-lab', 'agent-book-lab', 'distill-lab', 'lab'].includes(page)) return 'labs'
  if (['review', 'evaluation', 'agent-book-review'].includes(page)) return 'reviews'
  if (['foundation', 'math-primer', 'decision-math', 'distill-course', 'expert-map', 'expert-llm', 'expert-image', 'expert-agent', 'agent-book', 'llm', 'image'].includes(page)) return 'routes'
  return navItems.some((item) => item.id === page) ? page as HeaderPage : 'unified-map'
}

export default function ProductHeader({ page, go, onSearch, onFeedback, searchButtonRef }: {
  page: string
  go: Go
  onSearch: (trigger: HTMLButtonElement) => void
  onFeedback: (trigger: HTMLButtonElement) => void
  searchButtonRef: RefObject<HTMLButtonElement>
}) {
  const [open, setOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const current = navSection(page)

  useEffect(() => setOpen(false), [page])
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        setOpen(false)
        headerRef.current?.querySelector<HTMLButtonElement>('.lo-menu-toggle')?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  const navigate = (target: string) => {
    setOpen(false)
    go(target)
  }

  return (
    <header className='lo-product-header' ref={headerRef}>
      <button className='lo-brand' type='button' onClick={() => navigate('unified-map')} aria-label='返回 GenAI Learning OS 首页'>
        <span className='lo-brand-mark' aria-hidden='true'>G</span>
        <span><b>GenAI Learning OS</b><small>从机制理解到可靠决策</small></span>
      </button>
      <nav className={`lo-primary-nav ${open ? 'is-open' : ''}`} aria-label='主导航'>
        {navItems.map(({ id, label, icon: Icon }) => (
          <button key={id} type='button' className={current === id ? 'is-active' : ''} aria-current={current === id ? 'page' : undefined} onClick={() => navigate(id)}>
            <Icon aria-hidden='true' /><span>{label}</span>
          </button>
        ))}
        <button type='button' className='lo-mobile-search' onClick={(event) => { setOpen(false); onSearch(event.currentTarget) }} aria-label='搜索课程、实验与评审'><Search aria-hidden='true' /><span>搜索</span></button>
        <button type='button' className='lo-mobile-feedback' onClick={(event) => { setOpen(false); onFeedback(event.currentTarget) }}><MessageCircle aria-hidden='true' /><span>反馈</span></button>
        <ShareButton className='lo-mobile-share' ariaLabel='复制当前页面链接' />
      </nav>
      <div className='lo-header-tools'>
        <button ref={searchButtonRef} className='lo-search-trigger' type='button' onClick={(event) => onSearch(event.currentTarget)} aria-label='搜索课程、实验与评审'>
          <Search aria-hidden='true' /><span>搜索</span><kbd>⌘K / Ctrl K</kbd>
        </button>
        <ShareButton className='lo-header-share' label='复制链接' ariaLabel='复制当前页面链接' />
        <button className='lo-feedback-trigger' type='button' onClick={(event) => onFeedback(event.currentTarget)}><MessageCircle aria-hidden='true' /><span>反馈</span></button>
        <button className='lo-progress-shortcut' type='button' onClick={() => navigate('progress')} aria-label='打开学习进度'>
          <TrendingUp aria-hidden='true' /><span>我的进度</span><ArrowUpRight aria-hidden='true' />
        </button>
      </div>
      <span className='lo-platform-safe-space' aria-hidden='true' />
      <button className='lo-menu-toggle' type='button' onClick={() => setOpen((value) => !value)} aria-label={open ? '收起导航' : '展开导航'} aria-expanded={open}>
        {open ? <X aria-hidden='true' /> : <Menu aria-hidden='true' />}
      </button>
    </header>
  )
}
