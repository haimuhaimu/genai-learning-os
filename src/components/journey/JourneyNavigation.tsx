import { ArrowRight, Route } from 'lucide-react'
import { journeyDestination, journeyLabel, journeyTitle } from '../../journeyResume'
import { useJourneyResume } from './useJourneyResume'

type Go = (page: string, options?: Record<string, string>) => void
export function JourneyEntry({ go }: { go: Go }) {
  const { current, needsChoice, status, temporary } = useJourneyResume()
  const other = current === 'model-learning' ? 'bayes-learning' : 'model-learning'
  return <aside className='lo-journey-entry' aria-label='完整学习路径入口'>
    <Route aria-hidden='true' />
    <div><span>{current ? '接着上次选择，继续走' : '从一个问题，走完一次闭环'}</span>
      <h2>{current ? journeyTitle(current) : needsChoice ? '选择继续哪条路线' : '从模型或贝叶斯，开始完整路径'}</h2>
      <p>{needsChoice ? '两条路线都有记录。选一次，首页以后就跟着你的选择走。' : '先看机制，去游乐场亲手试，再带回真实记录复盘。'}</p>
      {current && <small>已记录 {status.steps.filter(Boolean).length}/3 步 · 不代表能力认证</small>}
      {temporary && <p role='status'>本次选择未能保存，刷新后会回到原来的选择；学习记录没有改变。</p>}
    </div>
    {current ? <>
      <button type='button' onClick={() => go('routes', journeyDestination(current))}>{status.complete ? '回顾' : '继续'}{journeyLabel(current)}<ArrowRight aria-hidden='true' /></button>
      <button type='button' onClick={() => go('routes', journeyDestination(other))}>换到{journeyLabel(other)}</button>
    </> : <>
      <button type='button' onClick={() => go('routes', journeyDestination('model-learning'))}>选择模型路线<ArrowRight aria-hidden='true' /></button>
      <button type='button' onClick={() => go('routes', journeyDestination('bayes-learning'))}>选择贝叶斯路线<ArrowRight aria-hidden='true' /></button>
    </>}
  </aside>
}

export function JourneyReturnBar({ page, go }: { page: string; node?: string; go: Go }) {
  const { current, temporary } = useJourneyResume()
  if (!current || page !== 'foundation') return null
  return <aside className='lo-journey-return' aria-label='当前完整学习路径'>
    <span>当前路径：{journeyTitle(current)}<small>{temporary ? '本次选择未能保存，刷新后会回到原来的选择。' : '看完机制后，回到路径继续动手与复盘。'}</small></span>
    <button type='button' onClick={() => go('routes', journeyDestination(current))}>{current === 'model-learning' ? '回到这条路径' : '回到贝叶斯路线'}<ArrowRight aria-hidden='true' /></button>
  </aside>
}
