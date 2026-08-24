import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { BookOpen, Route } from 'lucide-react'
import FeedbackCenterModal from './components/feedback/FeedbackCenterModal'
import FeedbackNudgeToast from './components/feedback/FeedbackNudgeToast'
import useFeedbackNudge from './components/feedback/useFeedbackNudge'
import UnifiedMap from './components/foundation/UnifiedMap'
import CommandPalette from './components/shell/CommandPalette'
import PageLoading from './components/shell/PageLoading'
import ProductHeader from './components/shell/ProductHeader'
import { imageChapters, llmChapters } from './courseData'
import { expertImageModules, expertLLMModules } from './expertData'
import { normalizePage, pages, routeKeys, type GoOptions, type Page, type RouteState } from './routeConfig'
import './lab.css'
import './expert.css'
import './agent.css'
import './foundation.css'
import './overconfident-case.css'
import './distill.css'
import './agent-book.css'
import './learning-os.css'
import './components/strategy/strategyCases.css'
import './components/feedback/feedback.css'
import './decisionMath.css'
import './mathPrimer.css'
import './videoLibrary.css'

const CourseTrack = lazy(() => import('./components/CourseTrack'))
const Experiments = lazy(() => import('./components/Experiments'))
const AgentExpertCourse = lazy(() => import('./components/AgentExpertCourse'))
const AgentExperiments = lazy(() => import('./components/AgentExperiments'))
const AgentBookCourse = lazy(() => import('./components/AgentBookCourse'))
const AgentBookExperiments = lazy(() => import('./components/AgentBookExperiments'))
const AgentBookReview = lazy(() => import('./components/AgentBookReview'))
const ExpertCourse = lazy(() => import('./components/ExpertCourse'))
const ExpertExperiments = lazy(() => import('./components/ExpertExperiments'))
const ExpertHome = lazy(() => import('./components/ExpertHome'))
const Handbook = lazy(() => import('./components/Handbook'))
const ProductEvaluation = lazy(() => import('./components/ProductEvaluation'))
const ReviewSandbox = lazy(() => import('./components/ReviewSandbox'))
const FoundationCourse = lazy(() => import('./components/foundation/FoundationCourse'))
const FoundationLabs = lazy(() => import('./components/foundation/FoundationLabs'))
const ProgressPage = lazy(() => import('./components/foundation/ProgressPage'))
const DistillCourse = lazy(() => import('./components/distill/DistillCourse'))
const DistillLabs = lazy(() => import('./components/distill/DistillLabs'))
const DecisionMathHub = lazy(() => import('./components/hubs/DecisionMathHub'))
const MathPrimer = lazy(() => import('./components/MathPrimer'))
const LearningRoutesHub = lazy(() => import('./components/hubs/LearningRoutesHub'))
const LabsHub = lazy(() => import('./components/hubs/LabsHub'))
const ReviewsHub = lazy(() => import('./components/hubs/ReviewsHub'))
const StrategyCaseCenter = lazy(() => import('./components/strategy/StrategyCaseCenter'))
const StrategyCaseRunner = lazy(() => import('./components/strategy/StrategyCaseRunner'))
const LegacyStrategyNotice = lazy(() => import('./components/strategy/LegacyStrategyNotice'))
const VideoLibrary = lazy(() => import('./components/resources/VideoLibrary'))

type GuestUser = { name?: string }

type BusinessProps = { user: GuestUser | null }
export type { Page } from './routeConfig'

function readRoute(): RouteState {
  const params = new URLSearchParams(window.location.search)
  return {
    page: normalizePage(params.get('page')),
    module: params.get('module') || undefined,
    experiment: params.get('experiment') || undefined,
    node: params.get('node') || undefined,
    section: params.get('section') || undefined,
    chapter: params.get('chapter') || undefined,
    card: params.get('card') || undefined,
    case: params.get('case') || undefined,
  }
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
    routeKeys.forEach((key) => {
      const value = next[key]
      if (value) url.searchParams.set(key, value)
      else url.searchParams.delete(key)
    })
    const search = url.searchParams.toString()
    window.history[replace ? 'replaceState' : 'pushState']({}, '', `${url.pathname}${search ? `?${search}` : ''}${url.hash}`)
  }, [])

  useEffect(() => {
    const initial = readRoute()
    routeRef.current = initial
    setRoute(initial)
    writeRoute(initial, true)
    const onPop = () => {
      const next = readRoute()
      pendingPageNavigation.current = null
      routeRef.current = next
      setRoute(next)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [writeRoute])

  useEffect(() => {
    if (pendingPageNavigation.current !== route.page) return
    pendingPageNavigation.current = null
    const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    const frame = window.requestAnimationFrame(() => {
      mainContentRef.current?.focus({ preventScroll: true })
      window.scrollTo({ top: 0, behavior })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [route.page])

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && paletteOpen) {
        event.preventDefault()
        setPaletteOpen(false)
        requestAnimationFrame(() => paletteTrigger?.focus())
        return
      }
      if (feedbackOpen) return
      if (event.key.toLocaleLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setPaletteTrigger(searchButtonRef.current)
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onShortcut)
    return () => window.removeEventListener('keydown', onShortcut)
  }, [feedbackOpen, paletteOpen, paletteTrigger])

  const go = useCallback((rawPage: string, options: GoOptions = {}) => {
    if (!pages.has(rawPage)) return
    const page = normalizePage(rawPage)
    const next: RouteState = { page, ...options }
    if (page !== routeRef.current.page) pendingPageNavigation.current = page
    routeRef.current = next
    setRoute(next)
    writeRoute(next)
  }, [writeRoute])

  const content = (() => {
    if (route.page === 'unified-map') return <UnifiedMap go={go} />
    if (route.page === 'routes') return <LearningRoutesHub go={go} />
    if (route.page === 'math-primer') return <MathPrimer />
    if (route.page === 'decision-math') return <DecisionMathHub go={go} />
    if (route.page === 'labs') return <LabsHub go={go} />
    if (route.page === 'reviews') return <ReviewsHub go={go} />
    if (route.page === 'strategy-cases') return <StrategyCaseCenter go={go} />
    if (route.page === 'strategy-case') return <StrategyCaseRunner key={route.case} caseId={route.case} go={go} />
    if (route.page === 'videos') return <VideoLibrary />
    if (route.page === 'foundation') return <FoundationCourse initialNode={route.node} initialSection={route.section} go={go} />
    if (route.page === 'foundation-lab') return <FoundationLabs initialExperiment={route.experiment} initialCard={route.card} nodeId={route.node} go={go} />
    if (route.page === 'distill-course') return <DistillCourse initialModule={route.module} go={go} />
    if (route.page === 'distill-lab') return <DistillLabs initialExperiment={route.experiment} go={go} />
    if (route.page === 'progress') return <ProgressPage go={go} />
    if (route.page === 'expert-map') return <ExpertHome go={go} />
    if (route.page === 'expert-llm') return <ExpertCourse modules={expertLLMModules} track='llm' initialModule={route.module} onOpenLab={(experiment) => go('expert-lab', { experiment })} onOpenStrategyCase={() => go('strategy-case', { case: 'rag-budget' })} />
    if (route.page === 'expert-image') return <ExpertCourse modules={expertImageModules} track='image' initialModule={route.module} onOpenLab={(experiment) => go('expert-lab', { experiment })} onOpenStrategyCase={() => go('strategy-case', { case: 'image-unit-cost' })} />
    if (route.page === 'expert-agent') return <AgentExpertCourse initialModule={route.module} onOpenLab={(experiment) => go('agent-lab', { experiment })} onOpenStrategyCase={() => go('strategy-case', { case: 'refund-gate' })} onGoToAgentBook={() => go('agent-book')} />
    if (route.page === 'agent-book') return <AgentBookCourse initialChapter={route.chapter} go={go} />
    if (route.page === 'agent-book-lab') return <AgentBookExperiments initialExperiment={route.experiment} go={go} />
    if (route.page === 'agent-book-review') return <AgentBookReview go={go} />
    if (route.page === 'expert-lab') return <ExpertExperiments initialExperiment={route.experiment} onOpenReview={() => go('review')} />
    if (route.page === 'agent-lab') return <AgentExperiments initialExperiment={route.experiment} />
    if (route.page === 'handbook') return <Handbook go={go} />
    if (route.page === 'review') return <ReviewSandbox />
    if (route.page === 'llm') return <><LegacyStrategyNotice go={go} /><CourseTrack chapters={llmChapters} tone='llm' onOpenLab={() => go('lab')} /></>
    if (route.page === 'image') return <><LegacyStrategyNotice go={go} /><CourseTrack chapters={imageChapters} tone='image' onOpenLab={() => go('lab')} /></>
    if (route.page === 'lab') return <><LegacyStrategyNotice go={go} /><Experiments /></>
    if (route.page === 'evaluation') return <ProductEvaluation />
    return <UnifiedMap go={go} />
  })()

  return (
    <div className='model-lab expert-edition unified-edition learning-os-shell'>
      <a className='lo-skip-link' href='#main-content'>跳到主要内容</a>
      <ProductHeader
        page={route.page}
        go={go}
        searchButtonRef={searchButtonRef}
        onSearch={(trigger) => { setFeedbackOpen(false); setPaletteTrigger(trigger); setPaletteOpen(true) }}
        onFeedback={(trigger) => { setPaletteOpen(false); setFeedbackTrigger(trigger); setFeedbackOpen(true) }}
      />
      <main ref={mainContentRef} className='lab-main' id='main-content' tabIndex={-1}><Suspense fallback={<PageLoading />}>{content}</Suspense></main>
      <footer className='lo-footer'><div><BookOpen /><span><b>GenAI Learning OS</b><small>算法基础 · AI 决策数学 · LLM · 图像生成 · Agent · Agent Book · 蒸馏 · 自进化 · 世界模型</small></span></div><p>{user?.name ? `${user.name}，` : ''}把学习变成一条可验证、可继续的路径。</p><button onClick={() => go('routes')}><Route />查看学习路线</button></footer>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} go={go} returnFocus={paletteTrigger} />
      <FeedbackCenterModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} returnFocus={feedbackTrigger} />
      <FeedbackNudgeToast
        visible={nudgeVisible && !feedbackOpen}
        onDismiss={dismissNudge}
        onOpen={(trigger) => { dismissNudge(); setFeedbackTrigger(trigger); setFeedbackOpen(true) }}
      />
    </div>
  )
}
