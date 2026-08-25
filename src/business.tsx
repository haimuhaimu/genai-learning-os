import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { BookOpen, Route } from 'lucide-react'
import FeedbackCenterModal from './components/feedback/FeedbackCenterModal'
import FeedbackNudgeToast from './components/feedback/FeedbackNudgeToast'
import useFeedbackNudge from './components/feedback/useFeedbackNudge'
import CommandPalette from './components/shell/CommandPalette'
import PageLoadErrorBoundary from './components/shell/PageLoadErrorBoundary'
import PageLoading from './components/shell/PageLoading'
import ProductHeader from './components/shell/ProductHeader'
import { PageRenderer } from './pageRegistry'
import { normalizePage, pages, routeKeys, type GoOptions, type Page, type RouteState } from './routeConfig'
import './styles/shell.css'
import './components/feedback/feedback.css'

type GuestUser = { name?: string }
type BusinessProps = { user: GuestUser | null }
export type { Page } from './routeConfig'

function readRoute(): RouteState {
  const params = new URLSearchParams(window.location.search)
  return { page: normalizePage(params.get('page')), module: params.get('module') || undefined, experiment: params.get('experiment') || undefined, node: params.get('node') || undefined, section: params.get('section') || undefined, chapter: params.get('chapter') || undefined, card: params.get('card') || undefined, case: params.get('case') || undefined, paper: params.get('paper') || undefined }
}

export default function Business({ user }: BusinessProps) {
  const [route, setRoute] = useState<RouteState>(() => readRoute())
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [paletteTrigger, setPaletteTrigger] = useState<HTMLElement | null>(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackTrigger, setFeedbackTrigger] = useState<HTMLElement | null>(null)
  const { nudgeVisible, dismissNudge } = useFeedbackNudge()
  const searchButtonRef = useRef<HTMLButtonElement>(null)
  const mainContentRef = useRef<HTMLElement>(null)
  const routeRef = useRef(route)
  const pendingPageNavigation = useRef<Page | null>(null)

  const writeRoute = useCallback((next: RouteState, replace = false) => {
    const url = new URL(window.location.href)
    url.searchParams.set('page', next.page)
    routeKeys.forEach((key) => { const value = next[key]; if (value) url.searchParams.set(key, value); else url.searchParams.delete(key) })
    const search = url.searchParams.toString()
    window.history[replace ? 'replaceState' : 'pushState']({}, '', `${url.pathname}${search ? `?${search}` : ''}${url.hash}`)
  }, [])

  useEffect(() => {
    const initial = readRoute(); routeRef.current = initial; setRoute(initial); writeRoute(initial, true)
    const onPop = () => { const next = readRoute(); pendingPageNavigation.current = null; routeRef.current = next; setRoute(next) }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [writeRoute])

  useEffect(() => {
    if (pendingPageNavigation.current !== route.page) return
    pendingPageNavigation.current = null
    const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    const frame = window.requestAnimationFrame(() => { mainContentRef.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior }) })
    return () => window.cancelAnimationFrame(frame)
  }, [route.page])

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && paletteOpen) { event.preventDefault(); setPaletteOpen(false); requestAnimationFrame(() => paletteTrigger?.focus()); return }
      if (feedbackOpen) return
      if (event.key.toLocaleLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); setPaletteTrigger(searchButtonRef.current); setPaletteOpen(true) }
    }
    window.addEventListener('keydown', onShortcut)
    return () => window.removeEventListener('keydown', onShortcut)
  }, [feedbackOpen, paletteOpen, paletteTrigger])

  const go = useCallback((rawPage: string, options: GoOptions = {}) => {
    if (!pages.has(rawPage)) return
    const page = normalizePage(rawPage)
    const next: RouteState = { page, ...options }
    if (page !== routeRef.current.page) pendingPageNavigation.current = page
    routeRef.current = next; setRoute(next); writeRoute(next)
  }, [writeRoute])

  const openFeedback = (trigger: HTMLButtonElement) => { setPaletteOpen(false); setFeedbackTrigger(trigger); setFeedbackOpen(true) }
  return <div className='model-lab expert-edition unified-edition learning-os-shell'>
    <a className='lo-skip-link' href='#main-content'>跳到主要内容</a>
    <ProductHeader page={route.page} go={go} searchButtonRef={searchButtonRef} onSearch={(trigger) => { setFeedbackOpen(false); setPaletteTrigger(trigger); setPaletteOpen(true) }} onFeedback={openFeedback} />
    <main ref={mainContentRef} className='lab-main' id='main-content' tabIndex={-1}><PageLoadErrorBoundary page={route.page} onHome={() => go('unified-map')}><Suspense fallback={<PageLoading />}><PageRenderer route={route} go={go} onFeedback={openFeedback} /></Suspense></PageLoadErrorBoundary></main>
    <footer className='lo-footer'><div><BookOpen /><span><b>GenAI Learning OS</b><small>算法基础 / AI 决策数学 / LLM / 图像生成 / Agent / 蒸馏</small></span></div><p>{user?.name ? `${user.name}，` : ''}把学习变成一条可验证、可继续的路径。</p><button type='button' className='lo-footer-co-build' onClick={() => go('co-build')}>参与共建</button><button type='button' onClick={() => go('routes')}><Route />查看学习路线</button></footer>
    <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} go={go} returnFocus={paletteTrigger} />
    <FeedbackCenterModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} returnFocus={feedbackTrigger} />
    <FeedbackNudgeToast visible={nudgeVisible && !feedbackOpen} onDismiss={dismissNudge} onOpen={(trigger) => { dismissNudge(); setFeedbackTrigger(trigger); setFeedbackOpen(true) }} />
  </div>
}
