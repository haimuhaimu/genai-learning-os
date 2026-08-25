import { useEffect, useRef, useState, type RefObject } from 'react'
import { ArrowUpRight, Beaker, Home, Menu, MessageCircle, Route, Search, Target, TrendingUp, Wrench, X } from 'lucide-react'
import { primarySectionForPage, primarySections } from '../../navigation'
import type { GoOptions, Page } from '../../routeConfig'
import ShareButton from './ShareButton'

type Go = (page: string, options?: GoOptions) => void
const icons = { home: Home, academy: Route, cases: Target, labs: Beaker, toolbox: Wrench }

export default function ProductHeader({ page, go, onSearch, onFeedback, searchButtonRef }: {
  page: Page
  go: Go
  onSearch: (trigger: HTMLButtonElement) => void
  onFeedback: (trigger: HTMLButtonElement) => void
  searchButtonRef: RefObject<HTMLButtonElement>
}) {
  const [open, setOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const current = primarySectionForPage(page)
  useEffect(() => setOpen(false), [page])
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false); requestAnimationFrame(() => menuButtonRef.current?.focus()) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])
  const navigate = (target: string) => { setOpen(false); go(target) }
  return <header className='lo-product-header'>
    <button className='lo-brand' type='button' onClick={() => navigate('unified-map')} aria-label='返回 GenAI Learning OS 首页'><span className='lo-brand-mark' aria-hidden='true'>G</span><span><b>GenAI Learning OS</b><small>从机制理解到可靠决策</small></span></button>
    <nav className={`lo-primary-nav ${open ? 'is-open' : ''}`} id='lo-primary-navigation' aria-label='主导航'>
      {primarySections.map(({ id, label, page: target }) => { const Icon = icons[id]; return <button key={id} type='button' data-nav-id={id} className={current === id ? 'is-active' : ''} aria-current={current === id ? 'page' : undefined} onClick={() => navigate(target)}><Icon aria-hidden='true' /><span>{label}</span></button> })}
      <button type='button' className='lo-mobile-search' onClick={(event) => { setOpen(false); onSearch(event.currentTarget) }}><Search aria-hidden='true' /><span>搜索</span></button>
      <button type='button' className='lo-mobile-feedback' onClick={(event) => { setOpen(false); onFeedback(event.currentTarget) }}><MessageCircle aria-hidden='true' /><span>反馈</span></button>
      <ShareButton className='lo-mobile-share' ariaLabel='复制当前页面链接' />
      <button type='button' className='lo-mobile-progress' onClick={() => navigate('progress')}><TrendingUp aria-hidden='true' /><span>我的进度</span></button>
    </nav>
    <div className='lo-header-tools'>
      <button ref={searchButtonRef} className='lo-search-trigger' type='button' onClick={(event) => onSearch(event.currentTarget)} aria-label='搜索课程、案例、实验与资源'><Search aria-hidden='true' /><span>搜索</span><kbd>⌘K / Ctrl K</kbd></button>
      <ShareButton className='lo-header-share' label='复制链接' ariaLabel='复制当前页面链接' />
      <button className='lo-feedback-trigger' type='button' onClick={(event) => onFeedback(event.currentTarget)}><MessageCircle aria-hidden='true' /><span>反馈</span></button>
      <button className='lo-progress-shortcut' type='button' onClick={() => navigate('progress')} aria-label='打开学习进度'><TrendingUp aria-hidden='true' /><span>我的进度</span><ArrowUpRight aria-hidden='true' /></button>
    </div>
    <button ref={menuButtonRef} className='lo-menu-toggle' type='button' aria-controls='lo-primary-navigation' onClick={() => setOpen((value) => !value)} aria-label={open ? '收起导航' : '展开导航'} aria-expanded={open}>{open ? <X aria-hidden='true' /> : <Menu aria-hidden='true' />}</button>
  </header>
}
