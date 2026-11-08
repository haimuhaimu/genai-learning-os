import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { PUBLIC_PLAYGROUND_BASE, type ReceiptVerifier } from '../../learningJourney'
import { readAgentHandoff, removeAgentHandoff } from '../../agentJourney'
import {
  AGENT_JOURNEY_EVENT, AGENT_JOURNEY_KEY, AGENT_RECORD_MAX_BYTES, deriveAgentStatus,
  parseAgentImport, readAgentJourney, recordAgentPractice, saveAgentReflection,
  startAgentLaunch, summarizeAgentRun, verifyAgentRecord, writeAgentJourney,
  type AgentJourneyState, type AgentReflection, type AgentRunSummary,
} from '../../agentJourney'
import { replayPlaygroundReceipt } from '../../playgroundReplay'

type Go = (page: string, options?: Record<string, string>) => void
type Candidate = Awaited<ReturnType<typeof verifyAgentRecord>> & { source: string; returned: boolean }
const errorMessage = (error: unknown) => error instanceof Error ? error.message : '暂时不能核对，原有记录没有改变。'
const outcomes = {
  'in-progress': '本轮还未结束', verified: '已核验送达',
  stopped: '主动停止，未核验', 'budget-exhausted': '预算耗尽，未核验',
}
const actions = { check: '查签收', retry: '重试', stop: '停止', restart: '同起点重开' }
const observations = {
  'not-delivered': '未查到签收', 'retry-accepted': '备用线已受理，尚未查到签收',
  signed: '查到签收，确认送达', stopped: '结束本轮，不把未核验说成完成', restarted: '同一起点，工具机会恢复为 3 次',
}
const receiptLabels = { unknown: '没有签收证据', 'not-delivered': '查过，未签收', delivered: '查到签收记录' }
const focusHeading = (node: HTMLHeadingElement | null) => {
  node?.focus({ preventScroll: true })
  node?.scrollIntoView({ block: 'start', behavior: 'instant' })
}

export function AgentEvidence({ summary }: { summary: AgentRunSummary }) {
  return <div className='journey-evidence journey-questions'>
    {summary.trials.map(trial => <div key={trial.number}>
      <span>第 {trial.number} 轮 · 相同起点</span>
      <strong>{outcomes[trial.outcome]}</strong>
      <small>工具用掉 {trial.toolCalls} / 3 次 · {receiptLabels[trial.receipt]}</small>
      {summary.steps.filter(step => step.trial === trial.number).map((step, index) => <p key={index}>
        <b>{index + 1}. {actions[step.action]}</b><small>{observations[step.observation]} · 剩 {step.remaining} 次</small>
      </p>)}
    </div>)}
  </div>
}

export default function AgentJourneyPanel({ go, playgroundBase, verify = replayPlaygroundReceipt }: { go: Go; playgroundBase?: string; verify?: ReceiptVerifier }) {
  const id = useId()
  const [state, setState] = useState(readAgentJourney)
  const [answer, setAnswer] = useState<AgentReflection | ''>(() => state.reflection ?? '')
  const [text, setText] = useState('')
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [busy, setBusy] = useState(false)
  const [declared, setDeclared] = useState(false)
  const [recapError, setRecapError] = useState('')
  const [notice, setNotice] = useState({ message: '', error: false })
  const [incoming] = useState(() => readAgentHandoff(parseAgentImport, readAgentJourney().pendingRequest))
  const [handoffPending, setHandoffPending] = useState(incoming.text !== null)
  const generation = useRef(0)
  const review = useRef<HTMLHeadingElement>(null), recap = useRef<HTMLHeadingElement>(null)
  const status = deriveAgentStatus(state)
  const pending = busy || handoffPending || candidate !== null
  const summary = candidate?.summary ?? (state.practice ? summarizeAgentRun(state.practice.receipt) : null)
  const hasSignature = !candidate && summary?.trials.some(trial => trial.receipt === 'delivered')
  const recapMessage = recapError || (state.reflection === 'signed'
    ? '对。受理是工具响应，签收才是结果证据。'
    : state.reflection ? '再对照轨迹：收到“受理”或结束本轮时，拿到签收了吗？' : '')
  const canSave = candidate?.summary.complete && candidate.summary.producer === 'browser-session'
  const base = playgroundBase ?? import.meta.env?.VITE_PLAYGROUND_BASE_URL ?? PUBLIC_PLAYGROUND_BASE
  const tell = (message: string, error = false) => setNotice({ message, error })

  const check = useCallback(async (source: string, returned = false) => {
    const current = ++generation.current
    setBusy(true); setCandidate(null); setDeclared(false)
    setNotice({ message: '正在用原始动作重放两轮实验……', error: false })
    try {
      const result = await verifyAgentRecord(source, verify, { expectedRequest: readAgentJourney().pendingRequest, requireHandoff: returned })
      if (current !== generation.current) return
      parseAgentImport(source, { expectedRequest: readAgentJourney().pendingRequest, requireHandoff: returned })
      setCandidate({ ...result, source, returned })
      const message = result.summary.producer === 'agent'
        ? 'AI 代跑记录重放一致，只作参考，不能计入你的实操。'
        : result.summary.complete ? '两轮结果重放一致。先看每一步的证据，再决定是否保存。' : '记录重放一致，但两轮尚未结束，不能保存为完整实操。'
      setNotice({ message, error: false })
    } catch (error) {
      if (current === generation.current) setNotice({ message: errorMessage(error), error: true })
    } finally { if (current === generation.current) setBusy(false) }
  }, [verify])

  useEffect(() => {
    const sync = () => { const next = readAgentJourney(); setState(next); setAnswer(next.reflection ?? '') }
    const storage = (event: StorageEvent) => { if (event.key === AGENT_JOURNEY_KEY || event.key === null) sync() }
    window.addEventListener(AGENT_JOURNEY_EVENT, sync)
    window.addEventListener('storage', storage)
    return () => { window.removeEventListener(AGENT_JOURNEY_EVENT, sync); window.removeEventListener('storage', storage) }
  }, [])
  useEffect(() => {
    if (incoming.text) { setText(incoming.text); void check(incoming.text, true) }
    else if (incoming.error) {
      removeAgentHandoff(incoming.hash)
      setNotice({ message: incoming.error, error: true })
    }
    return () => { generation.current += 1 }
  }, [check, incoming])
  useEffect(() => {
    if (!candidate) return
    const frame = requestAnimationFrame(() => focusHeading(review.current))
    return () => cancelAnimationFrame(frame)
  }, [candidate])

  function commit(next: AgentJourneyState) {
    if (!writeAgentJourney(next)) { tell('浏览器暂时无法保存，已保存的记录没有改变。', true); return false }
    setState(next); setAnswer(next.reflection ?? ''); return true
  }
  function launch() {
    if (pending) return
    try {
      const next = startAgentLaunch(readAgentJourney(), base, window.location.href, window.crypto.randomUUID())
      if (commit(next.state)) window.location.assign(next.url)
    } catch (error) { tell(errorMessage(error), true) }
  }
  function clearCandidate(message = '') {
    generation.current += 1; setCandidate(null); setDeclared(false); setBusy(false); tell(message)
  }
  function finishPreview(message: string) {
    if (handoffPending) {
      removeAgentHandoff(incoming.hash)
      setHandoffPending(false)
      if (text === incoming.text) setText('')
    }
    clearCandidate(message)
  }
  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''
    if (!file) return
    const current = ++generation.current
    setBusy(true)
    try {
      if (file.size > AGENT_RECORD_MAX_BYTES) throw Error('文件超过 64 KiB，旧文本和记录均保留。')
      const source = await file.text()
      if (current !== generation.current) return
      parseAgentImport(source, { expectedRequest: readAgentJourney().pendingRequest })
      setText(source); void check(source)
    } catch (error) {
      if (current === generation.current) tell(errorMessage(error), true)
    } finally { if (current === generation.current) setBusy(false) }
  }
  function save() {
    if (!candidate || busy) return
    try {
      const current = readAgentJourney()
      parseAgentImport(candidate.source, { expectedRequest: current.pendingRequest, requireHandoff: candidate.returned })
      if (commit(recordAgentPractice(current, candidate.receipt, declared))) {
        finishPreview('两轮实操已保存。接下来对照两轮轨迹，再作答。')
        requestAnimationFrame(() => focusHeading(recap.current))
      }
    } catch (error) { tell(errorMessage(error), true) }
  }
  function reflect() {
    if (!answer || pending) return
    setRecapError('')
    try {
      if (!commit(saveAgentReflection(readAgentJourney(), answer))) setRecapError('浏览器暂时无法保存这次作答，可以重试。')
    } catch (error) { setRecapError(errorMessage(error)) }
  }

  return <section className='lo-learning-journey' id='agent-learning-journey' tabIndex={-1} aria-labelledby={`${id}-title`}>
    <header><div><span className='journey-kicker'>第三条完整学习路径 · Agent 实战</span><h2 id={`${id}-title`}>显示成功，补给真的到了吗？</h2><p>工具显示“已受理”，主线路却卡住了。三次机会，你会查签收、重试，还是停止？从同一个起点试两轮，把真实操作带回来。</p></div><strong className='journey-count'>{Number(status.practiced) + Number(status.reflected)} / 2<small>实操与复盘记录</small></strong></header>
    <ol className='journey-steps'>
      <li><span>01 · 看机制</span><h3>Agent 什么情况下该停？</h3><p>认识观察、行动和停止。课程可随时回看。</p><button type='button' onClick={() => go('expert-agent', { module: 'agent-loop' })}>打开 Agent Loop 课程</button></li>
      <li data-done={status.practiced}><span>02 · 亲手试</span><h3>相同起点，再试一轮</h3><p>查签收和重试都会消耗机会，停止不代表送达。</p><button type='button' className='is-primary' onClick={launch} disabled={pending}>去游乐场执行任务</button></li>
      <li data-done={status.reflected}><span>03 · 用结果解释</span><h3>哪一步才算确认送达？</h3><p>保留两轮实际动作，比较真正拿到的证据。</p><button type='button' disabled={!state.practice || pending} onClick={() => focusHeading(recap.current)}>看结果并复盘</button></li>
    </ol>
    <div className='journey-message' role='status' aria-live='polite' data-error={notice.error}>{notice.message}</div>
    <details className='journey-import'>
      <summary>没有自动带回？手动选择或粘贴实验记录</summary>
      <p>只核对固定补给任务的 JSON。加载公开计算模块后在浏览器内重放，不上传记录。</p>
      <label htmlFor={`${id}-file`}>选择 Agent 实验 JSON<input id={`${id}-file`} type='file' accept='.json,application/json' onChange={readFile} /></label>
      <textarea aria-label='Agent 实验记录 JSON' rows={4} value={text} onChange={event => { setText(event.target.value); clearCandidate() }} spellCheck={false} />
      <button type='button' disabled={!text.trim() || busy} onClick={() => void check(text, handoffPending && text === incoming.text)}>重新计算并核对记录</button>
    </details>
    {(pending || handoffPending) && <button type='button' onClick={() => finishPreview('已取消本次预览，已保存的记录没有改变。')}>取消新记录预览</button>}
    {summary && <section className='journey-record' aria-labelledby={`${id}-record`}>
      <header><span className='journey-kicker'>{candidate ? '新记录 · 尚未保存' : '已保存的实操'}</span><h3 id={`${id}-record`} ref={review} tabIndex={-1}>同一起点，两轮发生了什么？</h3><p>这些是重放后的结果。计算一致不等于认证操作者身份。</p></header>
      <AgentEvidence summary={summary} />
      {candidate && <div className='journey-confirm'>
        {state.practice && <p>已有实操与复盘保留到你确认替换。</p>}
        {canSave ? <><label><input type='checkbox' checked={declared} onChange={event => setDeclared(event.target.checked)} />这是我刚才亲手操作的记录</label><button type='button' className='is-primary' disabled={!declared || busy} onClick={save}>确认保存到这条路径</button></>
          : <p>{summary.producer === 'agent' ? 'AI 代跑只作参考，不会推进个人记录。' : '请在游乐场结束两轮，再把完整对照带回来。'}</p>}
      </div>}
    </section>}
    <section className='journey-recap' aria-labelledby={`${id}-recap`}>
      <h3 id={`${id}-recap`} ref={recap} tabIndex={-1}>什么证据才说明补给到了？</h3>
      <p>{pending ? '先保存或取消这次预览，再用已保存的轨迹作答。' : state.practice ? (hasSignature ? '对照上面两轮：哪一步只是收到响应，哪一步拿到了签收？' : '这两轮都没有查到签收。对照上面的轨迹，你还需要什么证据？') : '先保存两轮亲手实操，再复盘。'}</p>
      <fieldset disabled={!state.practice || pending}><legend>什么时候可以说“补给已送达”？</legend>
        <label><input type='radio' name={`${id}-answer`} checked={answer === 'accepted'} onChange={() => setAnswer('accepted')} />重试返回“已受理”时，就能确认送达</label>
        <label><input type='radio' name={`${id}-answer`} checked={answer === 'signed'} onChange={() => setAnswer('signed')} />查到签收记录，才能确认送达</label>
        <label><input type='radio' name={`${id}-answer`} checked={answer === 'stopped'} onChange={() => setAnswer('stopped')} />本轮停止或机会用完，就能确认送达</label>
      </fieldset>
      <p><button type='button' className='is-primary' disabled={!state.practice || pending || !answer} onClick={reflect}>核对我的理解</button></p>
      <p role='status'>{pending ? '' : recapMessage}</p>
    </section>
    {status.complete && !pending && <footer className='journey-finish'><div><span className='journey-kicker'>这次复盘已完成</span><h3>工具接受了请求，不代表任务完成。</h3><p>这是一次教学练习的实操和复盘记录，不代表已掌握，也不修改原课程进度。</p></div><button type='button' onClick={() => go('expert-agent', { module: 'tool-contract' })}>继续：工具调用与执行契约</button></footer>}
    <p className='journey-boundary'>固定教学模拟，不调用真实工具，也不投递真实补给。记录只反映这两轮，不代表真实 Agent 的成功率。</p>
  </section>
}
