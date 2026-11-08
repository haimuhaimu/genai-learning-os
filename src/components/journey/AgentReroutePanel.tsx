import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { AGENT_JOURNEY_SECTION, AGENT_RECORD_MAX_BYTES, readAgentHandoff, removeAgentHandoff } from '../../agentJourney'
import { FRAMES_JOURNEY_SECTION } from '../../agentFramesJourney'
import {
  REROUTE_JOURNEY_EVENT, REROUTE_JOURNEY_KEY, REROUTE_JOURNEY_SECTION, deriveRerouteStatus,
  parseRerouteImport, readRerouteJourney, recordReroutePractice, saveRerouteReflection,
  startRerouteLaunch, summarizeRerouteRun, verifyRerouteRecord, writeRerouteJourney,
  type RerouteJourneyState, type RerouteReflection, type RerouteSummary,
} from '../../agentRerouteJourney'
import { PUBLIC_PLAYGROUND_BASE, type ReceiptVerifier } from '../../learningJourney'
import { replayPlaygroundReceipt } from '../../playgroundReplay'

type Go = (page: string, options?: Record<string, string>) => void
type Candidate = Awaited<ReturnType<typeof verifyRerouteRecord>>
const errorMessage = (error: unknown) => error instanceof Error ? error.message : '暂时不能核对，原有记录没有改变。'
const outcomes = {
  'in-progress': '改派还没有结束',
  misattributed: '错认旧回执，08 号未核验',
  unverified: '主动停止，08 号未核验',
  verified: '08 号已核验送达',
}
const chronology = {
  'correction-start': ['听到指令片段', '“等等，改送……”——指令还没说完，目标仍是 07。'],
  'correction-confirmed': ['听到完整指令', '“改送 08 号站”——最新确认的目标切换到 08。'],
  'reroute-accepted': ['派出 08 号新单', '派单已受理，还不等于送达；07 号旧单没有被撤销。'],
  'kept-old': ['暂时沿用旧任务', '07 号旧单继续在途，尚未派出 08 号新单。'],
  'old-receipt': ['旧回执迟到', '收到 SUP-07 的 07 号签收，与最新目标 08 不匹配。'],
  'old-receipt-misattributed': ['误把旧回执算给新单', 'SUP-07 只能证明 07 已签收；没有证据证明 08 已收到。'],
  'new-receipt-verified': ['核对新单签收', 'SUP-08 和 08 号站匹配，才确认当前任务送达。'],
  'stopped-unverified': ['结束并标为未核验', '保留旧回执，但不声称当前任务已送达。'],
}
function focusHeading(node: HTMLHeadingElement | null) {
  node?.focus({ preventScroll: true })
  node?.scrollIntoView({ block: 'start', behavior: 'instant' })
}

export function AgentLevelNavigation({ go, reroute = false, frames = false }: { go: Go; reroute?: boolean; frames?: boolean }) {
  return <nav className='lo-learning-journey journey-choice' id='agent-level-picker' tabIndex={-1} aria-label='Agent 实战关卡'>
    <button type='button' aria-pressed={!reroute && !frames} aria-label='第 1 关：显示成功，补给真的到了吗？' onClick={() => go('routes', { section: AGENT_JOURNEY_SECTION })}><span className='journey-kicker'>第 1 关</span><br /><strong>显示成功，补给真的到了吗？</strong></button>
    <button type='button' aria-pressed={reroute} aria-label='第 2 关：新指令来了，旧任务还该继续吗？' onClick={() => go('routes', { section: REROUTE_JOURNEY_SECTION })}><span className='journey-kicker'>第 2 关</span><br /><strong>新指令来了，旧任务还该继续吗？</strong></button>
    <button type='button' aria-pressed={frames} aria-label='第 3 关：只留三帧，你会留下哪一帧？' onClick={() => go('routes', { section: FRAMES_JOURNEY_SECTION })}><span className='journey-kicker'>第 3 关</span><br /><strong>只留三帧，你会留下哪一帧？</strong></button>
  </nav>
}

export function RerouteEvidence({ summary }: { summary: RerouteSummary }) {
  return <>
    <div className='journey-evidence journey-questions'>
      <div><span>当前任务结论</span><strong>{outcomes[summary.outcome]}</strong><small>最新确认目标：{summary.activeTarget} 号站 · {summary.dispatched08 ? '已派出 08 号新单' : '尚未派出 08 号新单'}</small></div>
      <div><span>签收证据</span><p>旧单：{summary.oldReceipt ? `${summary.oldReceipt.orderId} · ${summary.oldReceipt.station} 号站` : '尚未收到旧回执'}</p><p>新单：{summary.newReceipt ? `${summary.newReceipt.orderId} · ${summary.newReceipt.station} 号站` : '没有 08 号签收'}</p></div>
    </div>
    <h4>按发生顺序回放</h4>
    <ol>{summary.steps.map((step, index) => <li key={index}><b>{chronology[step.event][0]}</b><small>{chronology[step.event][1]}</small></li>)}</ol>
  </>
}

export default function AgentReroutePanel({ playgroundBase, verify = replayPlaygroundReceipt }: { playgroundBase?: string; verify?: ReceiptVerifier }) {
  const id = useId()
  const [state, setState] = useState(readRerouteJourney)
  const [answer, setAnswer] = useState<RerouteReflection | ''>(() => state.reflection ?? '')
  const [text, setText] = useState('')
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [busy, setBusy] = useState(false)
  const [declared, setDeclared] = useState(false)
  const [recapError, setRecapError] = useState('')
  const [notice, setNotice] = useState({ message: '', error: false })
  const [incoming] = useState(() => readAgentHandoff(parseRerouteImport, readRerouteJourney().pendingRequest))
  const [handoffPending, setHandoffPending] = useState(incoming.text !== null)
  const generation = useRef(0)
  const review = useRef<HTMLHeadingElement>(null), recap = useRef<HTMLHeadingElement>(null)
  const status = deriveRerouteStatus(state)
  const pending = busy || handoffPending || candidate !== null
  const summary = candidate?.summary ?? (state.practice ? summarizeRerouteRun(state.practice.receipt) : null)
  const canSave = candidate?.summary.complete && candidate.summary.producer === 'browser-session'
  const base = playgroundBase ?? import.meta.env?.VITE_PLAYGROUND_BASE_URL ?? PUBLIC_PLAYGROUND_BASE
  const tell = (message: string, error = false) => setNotice({ message, error })
  const recapMessage = recapError || (state.reflection === 'SUP-08'
    ? (summary?.outcome === 'verified' ? '对。SUP-08 对应最新指令，且这次拿到了 08 号签收。' : '对。SUP-08 对应最新指令；这次没有拿到 08 号签收，所以仍不能说已送达。')
    : state.reflection ? '再核对一次：SUP-07 的签收只对应 07 号站，不能用来确认最新指令的 08 号站。' : '')

  const check = useCallback(async (source: string, requireHandoff = false) => {
    const current = ++generation.current
    setBusy(true); setCandidate(null); setDeclared(false)
    setNotice({ message: '正在用原始动作重放改派任务……', error: false })
    try {
      const result = await verifyRerouteRecord(source, verify, { expectedRequest: readRerouteJourney().pendingRequest, requireHandoff })
      if (current !== generation.current) return
      parseRerouteImport(source, { expectedRequest: readRerouteJourney().pendingRequest, requireHandoff })
      setCandidate(result)
      const message = result.summary.producer === 'agent'
        ? 'AI 代跑记录重放一致，只作参考，不能计入你的实操。'
        : result.summary.complete ? '改派轨迹重放一致。先看证据，再决定是否保存。' : '轨迹重放一致，但任务尚未结束，不能保存为实操。'
      setNotice({ message, error: false })
    } catch (error) {
      if (current === generation.current) setNotice({ message: errorMessage(error), error: true })
    } finally { if (current === generation.current) setBusy(false) }
  }, [verify])

  useEffect(() => {
    const sync = () => { const next = readRerouteJourney(); setState(next); setAnswer(next.reflection ?? ''); setRecapError('') }
    const storage = (event: StorageEvent) => { if (event.key === REROUTE_JOURNEY_KEY || event.key === null) sync() }
    window.addEventListener(REROUTE_JOURNEY_EVENT, sync)
    window.addEventListener('storage', storage)
    return () => { window.removeEventListener(REROUTE_JOURNEY_EVENT, sync); window.removeEventListener('storage', storage) }
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

  function commit(next: RerouteJourneyState) {
    if (!writeRerouteJourney(next)) { tell('浏览器暂时无法保存，已保存的记录没有改变。', true); return false }
    setState(next); setAnswer(next.reflection ?? ''); return true
  }
  function launch() {
    if (pending) return
    try {
      const next = startRerouteLaunch(readRerouteJourney(), base, window.location.href, window.crypto.randomUUID())
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
    setBusy(true); setCandidate(null); setDeclared(false)
    try {
      if (file.size > AGENT_RECORD_MAX_BYTES) throw Error('文件超过 64 KiB，旧文本和记录均保留。')
      const source = await file.text()
      if (current !== generation.current) return
      parseRerouteImport(source, { expectedRequest: readRerouteJourney().pendingRequest })
      setText(source); void check(source)
    } catch (error) {
      if (current === generation.current) tell(errorMessage(error), true)
    } finally { if (current === generation.current) setBusy(false) }
  }
  function save() {
    if (!candidate || busy) return
    try {
      if (commit(recordReroutePractice(readRerouteJourney(), candidate, declared))) {
        finishPreview('第二关实操已保存。第一关不受影响。')
        requestAnimationFrame(() => focusHeading(recap.current))
      }
    } catch (error) { tell(errorMessage(error), true) }
  }
  function reflect() {
    if (!answer || pending) return
    setRecapError('')
    try {
      if (!commit(saveRerouteReflection(readRerouteJourney(), answer))) setRecapError('浏览器暂时无法保存这次作答，可以重试。')
    } catch (error) { setRecapError(errorMessage(error)) }
  }

  return <section className='lo-learning-journey' id={REROUTE_JOURNEY_SECTION} tabIndex={-1} aria-labelledby={`${id}-title`}>
    <header><div><span className='journey-kicker'>Agent 实战 · 第 2 关</span><h2 id={`${id}-title`}>新指令来了，旧任务还该继续吗？</h2><p>07 号补给还在路上，指令改成了 08。你可以改派，也可以等等。等旧回执到了，看看它能证明什么。</p></div><strong className='journey-count'>{Number(status.practiced) + Number(status.reflected)} / 2<small>实操与复盘记录</small></strong></header>
    <ol className='journey-steps'>
      <li><span>01 · 听完指令</span><h3>字幕会分两次出现</h3><p>先看指令什么时候说完。固定字幕，不用麦克风。</p></li>
      <li data-done={status.practiced}><span>02 · 亲手试</span><h3>判断旧回执</h3><p>改派不会撤销旧任务。等签收回来，看看它对应哪张工单。</p><button type='button' className='is-primary' onClick={launch} disabled={pending}>去游乐场改派补给</button></li>
      <li data-done={status.reflected}><span>03 · 用结果解释</span><h3>哪张工单对得上？</h3><p>保留这次实操轨迹，再核对最新指令与签收。</p><button type='button' disabled={!state.practice || pending} onClick={() => focusHeading(recap.current)}>看结果并复盘</button></li>
    </ol>
    <div className='journey-message' role='status' aria-live='polite' data-error={notice.error}>{notice.message}</div>
    <details className='journey-import'>
      <summary>没有自动带回？手动选择或粘贴实验记录</summary>
      <p>只核对第二关的改派 JSON。加载公开计算模块后在浏览器内重放，不上传记录。</p>
      <label htmlFor={`${id}-file`}>选择改派实验 JSON<input id={`${id}-file`} type='file' accept='.json,application/json' onChange={readFile} /></label>
      <textarea aria-label='改派实验记录 JSON' rows={4} value={text} onChange={event => { setText(event.target.value); clearCandidate() }} spellCheck={false} />
      <button type='button' disabled={!text.trim() || busy} onClick={() => void check(text, handoffPending && text === incoming.text)}>重新计算并核对记录</button>
    </details>
    {(pending || handoffPending) && <button type='button' onClick={() => finishPreview('已取消本次预览，已保存的记录没有改变。')}>取消新记录预览</button>}
    {summary && <section className='journey-record' aria-labelledby={`${id}-record`}>
      <header><span className='journey-kicker'>{candidate ? '新记录 · 尚未保存' : '已保存的实操'}</span><h3 id={`${id}-record`} ref={review} tabIndex={-1}>改派记录发生了什么？</h3><p>记录声明的渠道：{summary.producer === 'agent' ? 'AI 代跑' : '网页实操'}。这是重放证据，不是操作者身份认证。</p></header>
      <RerouteEvidence summary={summary} />
      {candidate && <div className='journey-confirm'>
        {state.practice && <p>已有的第二关实操与复盘保留到你确认替换。</p>}
        {canSave ? <><label><input type='checkbox' checked={declared} onChange={event => setDeclared(event.target.checked)} />这是我刚才亲手操作的记录</label><button type='button' className='is-primary' disabled={!declared || busy} onClick={save}>确认保存到第二关</button></>
          : <p>{summary.producer === 'agent' ? 'AI 代跑只作参考，不会推进个人记录。' : '请在游乐场结束改派，再把完整记录带回来。'}</p>}
      </div>}
    </section>}
    <section className='journey-recap' aria-labelledby={`${id}-recap`}>
      <h3 id={`${id}-recap`} ref={recap} tabIndex={-1}>哪张工单对应最新指令？</h3>
      <p>{pending ? '先保存或取消这次预览，再用已保存的轨迹作答。' : state.practice ? '对照上面的指令与签收。工单对应当前目标，不等于已经拿到签收。' : '先保存第二关的亲手实操，再复盘。'}</p>
      <fieldset disabled={!state.practice || pending}><legend>哪张工单对应最新确认的指令？</legend>
        {(['SUP-07', 'SUP-08'] as const).map((order, index) => <label key={order}><input type='radio' name={`${id}-answer`} checked={answer === order} onChange={() => setAnswer(order)} />{order} · 0{index + 7} 号站</label>)}
      </fieldset>
      <p><button type='button' className='is-primary' disabled={!state.practice || pending || !answer} onClick={reflect}>核对我的理解</button></p>
      <p className='journey-message' data-error={Boolean(recapError) || state.reflection === 'SUP-07'} role='status'>{pending ? '' : recapMessage}</p>
    </section>
    {status.complete && !pending && <footer className='journey-finish'><div><span className='journey-kicker'>这次复盘已完成</span><h3>签收能不能用，要看它对应哪张工单。</h3><p>这里只记录这次实操与复盘，不改动第一关或课程进度。</p></div></footer>}
    <p className='journey-boundary'>固定教学模拟：不用麦克风，不调用付费模型，也不投递真实补给。</p>
  </section>
}
