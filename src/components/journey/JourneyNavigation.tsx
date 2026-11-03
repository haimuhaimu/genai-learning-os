import { useEffect, useState } from 'react'
import { ArrowRight, Route } from 'lucide-react'
import { JOURNEY_EVENT, JOURNEY_KEY, deriveJourneyStatus, readJourney } from '../../learningJourney'
import { PROGRESS_CHANGE_EVENT, readProgress } from '../../progress'
import { BAYES_JOURNEY_EVENT, BAYES_JOURNEY_KEY, readBayesJourney } from '../../bayesJourney'

type Go = (page: string, options?: Record<string, string>) => void
function useJourneySnapshot() {
  const [snapshot, setSnapshot] = useState(() => ({ journey: readJourney(), progress: readProgress() }))
  useEffect(() => {
    const sync = () => setSnapshot({ journey: readJourney(), progress: readProgress() })
    const crossTab = (event: StorageEvent) => { if (event.key === JOURNEY_KEY || event.key === 'genai-learning-progress-v1' || event.key === null) sync() }
    window.addEventListener(JOURNEY_EVENT, sync)
    window.addEventListener(PROGRESS_CHANGE_EVENT, sync)
    window.addEventListener('storage', crossTab)
    return () => { window.removeEventListener(JOURNEY_EVENT, sync); window.removeEventListener(PROGRESS_CHANGE_EVENT, sync); window.removeEventListener('storage', crossTab) }
  }, [])
  return { ...snapshot, status: deriveJourneyStatus(snapshot.progress, snapshot.journey) }
}

export function JourneyEntry({ go }: { go: Go }) {
  const { journey, status } = useJourneySnapshot()
  return <aside className='lo-journey-entry' aria-label='完整学习路径入口'>
    <Route aria-hidden='true' />
    <div><span>从一个问题，走完一次闭环</span><h2>模型怎样从例子里学会？</h2><p>先看机制，去游乐场亲手试，再带回真实记录复盘。</p>{journey.active && <small>已记录 {status.steps.filter(Boolean).length}/3 步 · 不代表能力认证</small>}</div>
    <button type='button' onClick={() => go('routes', { section: 'journey' })}>{journey.active ? '继续这条路径' : '开始完整路径'}<ArrowRight aria-hidden='true' /></button>
  </aside>
}

export function JourneyReturnBar({ page, node, go }: { page: string; node?: string; go: Go }) {
  const { journey } = useJourneySnapshot()
  const [bayes, setBayes] = useState(readBayesJourney)
  useEffect(() => {
    const sync = () => setBayes(readBayesJourney())
    const storage = (event: StorageEvent) => { if (event.key === BAYES_JOURNEY_KEY || event.key === null) sync() }
    window.addEventListener(BAYES_JOURNEY_EVENT, sync); window.addEventListener('storage', storage)
    return () => { window.removeEventListener(BAYES_JOURNEY_EVENT, sync); window.removeEventListener('storage', storage) }
  }, [])
  if (bayes.active && page === 'foundation' && node === 'probability') return <aside className='lo-journey-return' aria-label='当前完整学习路径'>
    <span>当前路径：新线索来了，怎样改判断？<small>看完机制后，回到贝叶斯路径亲手试。</small></span>
    <button type='button' onClick={() => go('routes', { section: 'bayes-journey' })}>回到贝叶斯路径<ArrowRight aria-hidden='true' /></button>
  </aside>
  if (!journey.active || page !== 'foundation') return null
  return <aside className='lo-journey-return' aria-label='当前完整学习路径'>
    <span>当前路径：模型怎样从例子里学会？<small>看完机制后，回到路径继续动手与复盘。</small></span>
    <button type='button' onClick={() => go('routes', { section: 'journey' })}>回到这条路径<ArrowRight aria-hidden='true' /></button>
  </aside>
}
