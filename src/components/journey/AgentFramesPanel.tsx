import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { AGENT_RECORD_MAX_BYTES, readAgentHandoff, removeAgentHandoff } from '../../agentJourney'
import {
  FRAMES_JOURNEY_EVENT, FRAMES_JOURNEY_KEY, FRAMES_JOURNEY_SECTION, FRAMES_REFLECTIONS, deriveFramesStatus,
  parseFramesImport, readFramesJourney, recordFramesPractice, saveFramesReflection, startFramesLaunch,
  summarizeFramesRun, verifyFramesRecord, writeFramesJourney, type FramesJourneyState, type FramesReflection, type FramesRound,
} from '../../agentFramesJourney'
import { PUBLIC_PLAYGROUND_BASE, type ReceiptVerifier } from '../../learningJourney'
import { replayPlaygroundReceipt } from '../../playgroundReplay'

type Candidate = Awaited<ReturnType<typeof verifyFramesRecord>>
const errorMessage = (error: unknown) => error instanceof Error ? error.message : '暂时不能核对，原有记录没有改变。'
const choices: Record<FramesReflection, string> = {
  'trust-spoken-clearance': '按口头的“可以了”直接放行',
  'treat-as-denial': '把看不清门牌记为禁止卸货',
  'request-clear-frame': '先不放行，请求一张当前门牌的清晰画面',
}
const feedback: Record<FramesReflection, string> = {
  'trust-spoken-clearance': '还不能放行。现场流程要求核对门牌，“可以了”不能替代看清门牌。请先请求一张清晰画面。',
  'treat-as-denial': '看不清不等于禁止。先标记证据不足，请求一张当前门牌的清晰画面。',
  'request-clear-frame': '对。先不放行，也不记成禁止；等看清当前门牌，再按证据更新判断。',
}
const frameLabel = (frame: number) => `#${String(frame).padStart(2, '0')} · ${frame} 秒`
function focusHeading(node: HTMLHeadingElement | null) {
  node?.focus({ preventScroll: true })
  node?.scrollIntoView({ block: 'start', behavior: 'instant' })
}

export function FramesEvidence({ fixed, manual }: { fixed: FramesRound | null; manual: FramesRound | null }) {
  const rounds = [{ title: '第 1 轮 · 固定抽帧', data: fixed }, { title: '第 2 轮 · 手动抽帧', data: manual }]
  return <div className='journey-evidence journey-questions'>
    {rounds.map(({ title, data }) => <div key={title}>
      <span>{title}</span>
      {data ? <>
        <strong>{data.conclusion === 'clear-to-unload' ? '允许卸货' : '证据不足'}</strong>
        <p>保留三帧：{data.frameIds.map(frameLabel).join(' / ')}</p>
        <small>{data.signFrame === null ? '没拍到清晰的门牌，不能判断能不能卸货。' : `门牌证据：${frameLabel(data.signFrame)}，读到「允许卸货」。`}</small>
      </> : <p>这轮没有完成有效的三帧抽样。</p>}
    </div>)}
  </div>
}

export default function AgentFramesPanel({ verify = replayPlaygroundReceipt }: { verify?: ReceiptVerifier }) {
  const id = useId()
  const [state, setState] = useState(readFramesJourney)
  const [answer, setAnswer] = useState<FramesReflection | ''>(() => state.reflection ?? '')
  const [incoming] = useState(() => readAgentHandoff(parseFramesImport, readFramesJourney().pendingRequest))
  const [handoffPending, setHandoffPending] = useState(incoming.text !== null)
  const [text, setText] = useState('')
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [busy, setBusy] = useState(false)
  const [declared, setDeclared] = useState(false)
  const [recapError, setRecapError] = useState('')
  const [notice, setNotice] = useState({ message: '', error: false })
  const generation = useRef(0)
  const review = useRef<HTMLHeadingElement>(null), recap = useRef<HTMLHeadingElement>(null)
  const status = deriveFramesStatus(state)
  const pending = busy || handoffPending || candidate !== null
  const summary = candidate?.summary ?? (state.practice ? summarizeFramesRun(state.practice.receipt) : null)
  const canSave = candidate?.summary.complete && candidate.summary.producer === 'browser-session'
  const tell = (message: string, error = false) => setNotice({ message, error })

  const check = useCallback(async (source: string, requireHandoff = false) => {
    const current = ++generation.current
    setBusy(true); setCandidate(null); setDeclared(false)
    setNotice({ message: '正在重放两轮抽帧操作……', error: false })
    try {
      const result = await verifyFramesRecord(source, verify, { expectedRequest: readFramesJourney().pendingRequest, requireHandoff })
      if (current !== generation.current) return
      parseFramesImport(source, { expectedRequest: readFramesJourney().pendingRequest, requireHandoff })
      setCandidate(result)
      const message = result.summary.producer === 'agent'
        ? 'AI 代跑记录重放一致，只作参考，不能计入你的实操。'
        : result.summary.complete ? '两轮抽帧重放一致。先看证据，再决定是否保存。' : '轨迹重放一致，但还没有两轮有效对照，不能保存为实操。'
      setNotice({ message, error: false })
    } catch (error) {
      if (current === generation.current) setNotice({ message: errorMessage(error), error: true })
    } finally { if (current === generation.current) setBusy(false) }
  }, [verify])

  useEffect(() => {
    const sync = () => { const next = readFramesJourney(); setState(next); setAnswer(next.reflection ?? ''); setRecapError('') }
    const storage = (event: StorageEvent) => { if (event.key === FRAMES_JOURNEY_KEY || event.key === null) sync() }
    window.addEventListener(FRAMES_JOURNEY_EVENT, sync)
    window.addEventListener('storage', storage)
    return () => { window.removeEventListener(FRAMES_JOURNEY_EVENT, sync); window.removeEventListener('storage', storage) }
  }, [])
  useEffect(() => {
    if (incoming.text) void check(incoming.text, true)
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

  function commit(next: FramesJourneyState) {
    if (!writeFramesJourney(next)) { tell('浏览器暂时无法保存，已保存的记录没有改变。', true); return false }
    setState(next); setAnswer(next.reflection ?? ''); return true
  }
  function launch() {
    if (pending) return
    try {
      const base = import.meta.env?.VITE_PLAYGROUND_BASE_URL ?? PUBLIC_PLAYGROUND_BASE
      const next = startFramesLaunch(readFramesJourney(), base, window.location.href, window.crypto.randomUUID())
      if (commit(next.state)) window.location.assign(next.url)
    } catch (error) { tell(errorMessage(error), true) }
  }
  function clearCandidate(message = '') {
    generation.current += 1; setCandidate(null); setDeclared(false); setBusy(false); tell(message)
  }
  function finishPreview(message: string) {
    if (handoffPending) { removeAgentHandoff(incoming.hash); setHandoffPending(false) }
    setText(''); clearCandidate(message)
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
      parseFramesImport(source, { expectedRequest: readFramesJourney().pendingRequest })
      setText(source); void check(source)
    } catch (error) {
      if (current === generation.current) tell(errorMessage(error), true)
    } finally { if (current === generation.current) setBusy(false) }
  }
  function save() {
    if (!candidate || busy) return
    try {
      if (commit(recordFramesPractice(readFramesJourney(), candidate, declared))) {
        finishPreview('第三关实操已保存。其他关卡与课程进度不变。')
        requestAnimationFrame(() => focusHeading(recap.current))
      }
    } catch (error) { tell(errorMessage(error), true) }
  }
  function reflect() {
    if (!answer || pending) return
    setRecapError('')
    try {
      if (!commit(saveFramesReflection(readFramesJourney(), answer))) setRecapError('浏览器暂时无法保存这次作答，可以重试。')
    } catch (error) { setRecapError(errorMessage(error)) }
  }

  return <section className='lo-learning-journey' id={FRAMES_JOURNEY_SECTION} tabIndex={-1} aria-labelledby={`${id}-title`}>
    <header><div><span className='journey-kicker'>Agent 实战 · 第 3 关</span><h2 id={`${id}-title`}>只留三帧，你会留下哪一帧？</h2><p>同一段 08 号站画面，两轮各留三帧。只换中间一帧，看看留下的证据够不够放行。</p></div><strong className='journey-count'>{Number(status.practiced) + Number(status.reflected)} / 2<small>实操与复盘记录</small></strong></header>
    <ol className='journey-steps'>
      <li><span>01 · 先看固定抽帧</span><h3>三帧够看清门牌吗？</h3><p>固定留开头、中间、结尾。没拍到门牌，不等于禁止卸货。</p></li>
      <li data-done={status.practiced}><span>02 · 亲手试</span><h3>只换中间一帧</h3><p>画面一帧帧到达；留哪一帧，由你决定。不拼手速。</p><button type='button' className='is-primary' onClick={launch} disabled={pending}>去游乐场挑三帧</button></li>
      <li data-done={status.reflected}><span>03 · 换个场景</span><h3>声音和画面对不上</h3><p>把这次对照带回来，再判断新场景里还缺什么证据。</p><button type='button' disabled={!state.practice || pending} onClick={() => focusHeading(recap.current)}>看结果并复盘</button></li>
    </ol>
    <div className='journey-message' role='status' aria-live='polite' data-error={notice.error}>{notice.message}</div>
    {!handoffPending && <details className='journey-import'>
      <summary>没有自动带回？手动选择或粘贴实验记录</summary>
      <p>只核对第三关的三帧实验 JSON。在浏览器内用公开模块重放，不上传记录。</p>
      <label htmlFor={`${id}-file`}>选择三帧实验 JSON<input id={`${id}-file`} type='file' accept='.json,application/json' onChange={readFile} /></label>
      <textarea aria-label='三帧实验记录 JSON' rows={4} value={text} onChange={event => { setText(event.target.value); clearCandidate() }} spellCheck={false} />
      <button type='button' disabled={!text.trim() || busy} onClick={() => void check(text)}>重新计算并核对记录</button>
    </details>}
    {handoffPending && notice.error && !candidate && incoming.text && <button type='button' disabled={busy} onClick={() => void check(incoming.text!, true)}>重新计算并核对记录</button>}
    {pending && <button type='button' onClick={() => finishPreview('已取消本次预览，已保存的记录没有改变。')}>取消新记录预览</button>}
    {summary && <section className='journey-record' aria-labelledby={`${id}-record`}>
      <header><span className='journey-kicker'>{candidate ? '新记录 · 尚未保存' : '已保存的实操'}</span><h3 id={`${id}-record`} ref={review} tabIndex={-1}>同一段画面，两轮留了什么？</h3><p>08 号站 · 各留三帧。记录渠道：{summary.producer === 'agent' ? 'AI 代跑' : '网页实操'}。重放只核对操作与结果，不认证操作者。</p></header>
      <FramesEvidence fixed={summary.fixed} manual={summary.manual} />
      {candidate && <div className='journey-confirm'>
        {state.practice && <p>已有的第三关实操与复盘保留到你确认替换。</p>}
        {canSave ? <><label><input type='checkbox' checked={declared} onChange={event => setDeclared(event.target.checked)} />这是我刚才亲手操作的记录</label><button type='button' className='is-primary' disabled={!declared || busy} onClick={save}>确认保存到第三关</button></>
          : <p>{summary.producer === 'agent' ? 'AI 代跑只作参考，不会推进个人记录。' : '请在游乐场完成两轮，再带回完整记录。'}</p>}
      </div>}
    </section>}
    <section className='journey-recap' aria-labelledby={`${id}-recap`}>
      <h3 id={`${id}-recap`} ref={recap} tabIndex={-1}>听到“可以了”，就能放行吗？</h3>
      <p>{pending ? '先保存或取消这次预览，再用已保存的轨迹作答。' : state.practice ? '看上面的两轮对照：留帧能改变你掌握的证据，却不能补出没拍到的事实。' : '先保存第三关的亲手实操，再复盘。'}</p>
      <fieldset disabled={!state.practice || pending}>
        <legend>这次应该怎么做？</legend>
        <p>换到另一个站点。对讲里有人说“可以了”，但摄像画面看不清门牌；现场流程要求看清门牌才可放行。</p>
        {FRAMES_REFLECTIONS.map(choice => <label key={choice}><input type='radio' name={`${id}-answer`} checked={answer === choice} onChange={() => { setAnswer(choice); setRecapError('') }} />{choices[choice]}</label>)}
      </fieldset>
      <p><button type='button' className='is-primary' disabled={!state.practice || pending || !answer} onClick={reflect}>核对我的理解</button></p>
      <p className='journey-message' data-error={Boolean(recapError) || Boolean(state.reflection && !status.reflected)} role='status'>{pending ? '' : recapError || (state.reflection ? feedback[state.reflection] : '')}</p>
    </section>
    {status.complete && !pending && <footer className='journey-finish'><div><span className='journey-kicker'>这次复盘已完成</span><h3>先拿到当前的证据，再更新判断。</h3><p>这里只记录两轮实操与一次作答，不代表掌握，也不影响前两关或课程进度。</p></div></footer>}
    <p className='journey-boundary'>固定教学模拟：不用摄像头或麦克风，不调用模型，也不操作真实门禁。</p>
  </section>
}
