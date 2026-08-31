/* eslint-disable react-refresh/only-export-components */
import { lazy, type ComponentType } from 'react'
import type { GoOptions, Page, RouteState } from './routeConfig'

export type Go = (page: string, options?: GoOptions) => void
export type PageViewProps = { route: RouteState; go: Go; onFeedback: (trigger: HTMLButtonElement) => void }

type PageModule = { default: ComponentType<PageViewProps> }
type Loader = () => Promise<PageModule>

function page(loader: Loader) { return lazy(loader) }
function simple(load: () => Promise<{ default: ComponentType }>, css: readonly (() => Promise<unknown>)[] = []): Loader {
  return async () => {
    const [module] = await Promise.all([load(), ...css.map((item) => item())])
    const Component = module.default
    return { default: () => <Component /> }
  }
}

export const pageLoaders: Record<Page, Loader> = {
  'unified-map': async () => { const [module] = await Promise.all([import('./components/foundation/UnifiedMap'), import('./learning-os.css'), import('./styles/home.css')]); return { default: ({ go }) => <module.default go={go} /> } },
  routes: async () => { const [module] = await Promise.all([import('./components/hubs/LearningRoutesHub'), import('./learning-os.css')]); return { default: ({ go }) => <module.default go={go} /> } },
  'math-primer': simple(() => import('./components/MathPrimer'), [() => import('./mathPrimer.css')]),
  'decision-math': async () => { const [module] = await Promise.all([import('./components/hubs/DecisionMathHub'), import('./decisionMath.css')]); return { default: ({ go }) => <module.default go={go} /> } },
  labs: async () => { const [module] = await Promise.all([import('./components/hubs/LabsHub'), import('./learning-os.css')]); return { default: ({ go }) => <module.default go={go} /> } },
  reviews: async () => { const [module] = await Promise.all([import('./components/hubs/ReviewsHub'), import('./learning-os.css'), import('./styles/hubs.css')]); return { default: ({ go }) => <module.default go={go} /> } },
  'co-build': async () => { const [module] = await Promise.all([import('./components/hubs/CoBuildHub'), import('./components/hubs/coBuildHub.css')]); return { default: ({ onFeedback }) => <module.default onFeedback={onFeedback} /> } },
  'strategy-cases': async () => { const [module] = await Promise.all([import('./components/strategy/StrategyCaseCenter'), import('./components/strategy/strategyCases.css')]); return { default: ({ go }) => <module.default go={go} /> } },
  'strategy-case': async () => { const [module] = await Promise.all([import('./components/strategy/StrategyCaseRunner'), import('./components/strategy/strategyCases.css'), import('./foundation.css'), import('./overconfident-case.css')]); return { default: ({ route, go }) => <module.default key={route.case} caseId={route.case} go={go} /> } },
  videos: simple(() => import('./components/resources/VideoLibrary'), [() => import('./videoLibrary.css'), () => import('./resourceLearningLoop.css')]),
  papers: async () => { const [module] = await Promise.all([import('./components/resources/PaperLibrary'), import('./paperLibrary.css'), import('./resourceLearningLoop.css')]); return { default: ({ go }) => <module.default go={go} /> } },
  'paper-lab': async () => { const [module] = await Promise.all([import('./components/paperLabs/PaperLabsPage'), import('./paperLabs.css')]); return { default: ({ route, go }) => <module.default paperId={route.paper} go={go} /> } },
  foundation: async () => { const [module] = await Promise.all([import('./components/foundation/FoundationCourse'), import('./foundation.css')]); return { default: ({ route, go }) => <module.default initialNode={route.node} initialSection={route.section} go={go} /> } },
  'foundation-lab': async () => { const [module] = await Promise.all([import('./components/foundation/FoundationLabs'), import('./foundation.css'), import('./overconfident-case.css')]); return { default: ({ route, go }) => <module.default initialExperiment={route.experiment} initialCard={route.card} nodeId={route.node} go={go} /> } },
  'distill-course': async () => { const [module] = await Promise.all([import('./components/distill/DistillCourse'), import('./distill.css')]); return { default: ({ route, go }) => <module.default initialModule={route.module} go={go} /> } },
  'distill-lab': async () => { const [module] = await Promise.all([import('./components/distill/DistillLabs'), import('./distill.css')]); return { default: ({ route, go }) => <module.default initialExperiment={route.experiment} go={go} /> } },
  progress: async () => { const [module] = await Promise.all([import('./components/foundation/ProgressPage'), import('./learning-os.css'), import('./styles/progress.css')]); return { default: ({ go }) => <module.default go={go} /> } },
  'expert-map': async () => { const [module] = await Promise.all([import('./components/ExpertHome'), import('./expert.css')]); return { default: ({ go }) => <module.default go={go} /> } },
  'expert-llm': async () => { const [{ default: Component }, { expertLLMModules }] = await Promise.all([import('./components/ExpertCourse'), import('./expertData'), import('./expert.css')]); return { default: ({ route, go }) => <Component modules={expertLLMModules} track='llm' initialModule={route.module} onOpenLab={(experiment) => go('expert-lab', { experiment })} onOpenStrategyCase={() => go('strategy-case', { case: 'rag-budget' })} /> } },
  'expert-image': async () => { const [{ default: Component }, { expertImageModules }] = await Promise.all([import('./components/ExpertCourse'), import('./expertData'), import('./expert.css')]); return { default: ({ route, go }) => <Component modules={expertImageModules} track='image' initialModule={route.module} onOpenLab={(experiment) => go('expert-lab', { experiment })} onOpenStrategyCase={() => go('strategy-case', { case: 'image-unit-cost' })} /> } },
  'expert-agent': async () => { const [module] = await Promise.all([import('./components/AgentExpertCourse'), import('./agent.css')]); return { default: ({ route, go }) => <module.default initialModule={route.module} onOpenLab={(experiment) => go('agent-lab', { experiment })} onOpenStrategyCase={() => go('strategy-case', { case: 'refund-gate' })} onGoToAgentBook={() => go('agent-book')} /> } },
  'expert-lab': async () => { const [module] = await Promise.all([import('./components/ExpertExperiments'), import('./expert.css')]); return { default: ({ route, go }) => <module.default initialExperiment={route.experiment} onOpenReview={() => go('review')} /> } },
  'k3-build-lab': async () => { const [module] = await Promise.all([import('./components/k3/K3BuildLabPage'), import('./components/k3/k3-build-lab.css')]); return { default: ({ route, go }) => <module.default route={route} go={go} /> } },
  'agent-lab': async () => { const [module] = await Promise.all([import('./components/AgentExperiments'), import('./agent.css')]); return { default: ({ route }) => <module.default initialExperiment={route.experiment} /> } },
  'agent-book': async () => { const [module] = await Promise.all([import('./components/AgentBookCourse'), import('./agent-book.css')]); return { default: ({ route, go }) => <module.default initialChapter={route.chapter} go={go} /> } },
  'agent-book-lab': async () => { const [module] = await Promise.all([import('./components/AgentBookExperiments'), import('./agent-book.css')]); return { default: ({ route, go }) => <module.default initialExperiment={route.experiment} go={go} /> } },
  'agent-book-review': async () => { const [module] = await Promise.all([import('./components/AgentBookReview'), import('./agent-book.css')]); return { default: ({ go }) => <module.default go={go} /> } },
  handbook: async () => { const [module] = await Promise.all([import('./components/Handbook'), import('./learning-os.css'), import('./styles/hubs.css')]); return { default: ({ go }) => <module.default go={go} /> } },
  review: simple(() => import('./components/ReviewSandbox'), [() => import('./lab.css')]),
  llm: async () => { const [{ default: Notice }, { default: Track }, { llmChapters }] = await Promise.all([import('./components/strategy/LegacyStrategyNotice'), import('./components/CourseTrack'), import('./courseData'), import('./lab.css')]); return { default: ({ route, go }) => <><Notice go={go} /><Track chapters={llmChapters} tone='llm' initialChapter={route.chapter} onOpenLab={() => go('lab')} /></> } },
  image: async () => { const [{ default: Notice }, { default: Track }, { imageChapters }] = await Promise.all([import('./components/strategy/LegacyStrategyNotice'), import('./components/CourseTrack'), import('./courseData'), import('./lab.css')]); return { default: ({ route, go }) => <><Notice go={go} /><Track chapters={imageChapters} tone='image' initialChapter={route.chapter} onOpenLab={() => go('lab')} /></> } },
  lab: async () => { const [{ default: Notice }, { default: Experiments }] = await Promise.all([import('./components/strategy/LegacyStrategyNotice'), import('./components/Experiments'), import('./lab.css')]); return { default: ({ go }) => <><Notice go={go} /><Experiments /></> } },
  evaluation: simple(() => import('./components/ProductEvaluation'), [() => import('./lab.css')]),
  toolbox: async () => { const [module] = await Promise.all([import('./components/hubs/ResourcesHub'), import('./learning-os.css')]); return { default: ({ go }) => <module.default go={go} /> } },
}

export const pageRegistry: Record<Page, ReturnType<typeof page>> = Object.fromEntries(Object.entries(pageLoaders).map(([key, loader]) => [key, page(loader)])) as Record<Page, ReturnType<typeof page>>

export function PageRenderer(props: PageViewProps) {
  const Component = pageRegistry[props.route.page] ?? pageRegistry['unified-map']
  return <Component {...props} />
}
