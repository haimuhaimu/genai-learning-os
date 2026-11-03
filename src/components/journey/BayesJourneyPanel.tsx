import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { decodeJourneyHash, PUBLIC_PLAYGROUND_BASE, type ReceiptVerifier } from '../../learningJourney'
import {
  BAYES_JOURNEY_KEY, BAYES_JOURNEY_EVENT, readBayesJourney, writeBayesJourney,
  startBayesLaunch, parseBayesImport, verifyBayesRecord, summarizeBayesRun,
  recordBayesPractice, saveBayesReflection, deriveBayesStatus,
  type BayesJourneyState, type BayesReflection, type BayesRunSummary,
} from '../../bayesJourney'
import { PROGRESS_CHANGE_EVENT, readProgress } from '../../progress'
import { replayPlaygroundReceipt } from '../../playgroundReplay'
import { rememberCurrentJourney } from '../../journeyResume'
import BayesCoachPanel from './BayesCoachPanel'

type Go = (page: string, options?: Record<string, string>) => void
type Answers = { update: BayesReflection['update'] | ''; certainty: BayesReflection['certainty'] | '' }
type Candidate = Awaited<ReturnType<typeof verifyBayesRecord>> & { source: string }
const blank = (): Answers => ({ update: '', certainty: '' })
const failure = (error: unknown) => error instanceof Error ? error.message : '暂时没能完成这一步，原有记录仍保留。'
const percent = (value: number | null) => value == null ? '尚未揭晓' : `${(value * 100).toFixed(1)}%`
const guesses: Record<string, string> = { little: 'A · 少样本', many: 'B · 多样本', same: '一样' }

function BayesEvidence({ summary }: { summary: BayesRunSummary }) {
  return <div className='journey-evidence'>
    {summary.baseline.map((before, index) => {
      const after = summary.after?.[index]
      return <div key={before.id}><span>{index === 0 ? 'A · 原来挖中 3 / 5 次' : 'B · 原来挖中 18 / 30 次'}</span><strong>{percent(before.mean)} → {percent(after?.mean ?? null)}</strong><small>这是模型对下一次命中的预测，不是星球的真实成功率。加的是同一次“没挖中”。</small>{after?.interval && <small>更新后 90% 可信区间：{percent(after.interval[0])}–{percent(after.interval[1])}。</small>}</div>
    })}
    <div><span>有限次空手，能断言永远没矿吗？</span><strong>{summary.transfer ? `${percent(summary.transfer[0].mean)} / ${percent(summary.transfer[1].mean)}` : '尚未揭晓'}</strong><small>依次是 0/1 与 0/10 后的下一次命中预测。更多空手支持低概率，但不是证明为零。</small><small>你的首次解释：{summary.firstAttemptCorrect === null ? '尚未作答' : summary.firstAttemptCorrect ? '保留不确定性' : summary.complete ? '看对照后修正' : '判断还需修正'}。</small></div>
  </div>
}

export default function BayesJourneyPanel({ go, playgroundBase, verify = replayPlaygroundReceipt }: { go: Go; playgroundBase?: string; verify?: ReceiptVerifier }) {
  const [state, setState] = useState(readBayesJourney)
  const [progress, setProgress] = useState(readProgress)
  const [text, setText] = useState('')
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [declared, setDeclared] = useState(false)
  const [answers, setAnswers] = useState<Answers>(() => readBayesJourney().reflection ?? blank())
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState({ text: '', error: false })
  const [returned] = useState(() => {
    if (typeof window === 'undefined') return { source: null, error: '' }
    try { return { source: decodeJourneyHash(window.location.hash), error: '' } }
    catch (error) { return { source: null, error: failure(error) } }
  })
  const generation = useRef(0), id = useId()
  const recordRef = useRef<HTMLHeadingElement>(null), recapRef = useRef<HTMLHeadingElement>(null), finishRef = useRef<HTMLHeadingElement>(null)
  const status = deriveBayesStatus(progress, state)
  const pending = busy || Boolean(candidate)
  const summary = candidate?.summary ?? (state.practice ? summarizeBayesRun(state.practice.receipt) : null)
  const canSave = candidate?.summary.complete && candidate.summary.producer === 'browser-session'
  const base = playgroundBase ?? import.meta.env?.VITE_PLAYGROUND_BASE_URL ?? PUBLIC_PLAYGROUND_BASE
  const tell = (message: string, error = false) => setNotice({ text: message, error })
  const focus = (ref: typeof recordRef) => requestAnimationFrame(() => { ref.current?.focus({ preventScroll: true }); ref.current?.scrollIntoView({ block: 'start', behavior: 'instant' }) })

  const check = useCallback(async (source: string) => {
    const current = ++generation.current
    setBusy(true); setCandidate(null); setDeclared(false)
    setNotice({ text: '正在按原始动作重新计算，核对这一次的判断变化……', error: false })
    try {
      const result = await verifyBayesRecord(source, verify, readBayesJourney().pendingRequest)
      if (current !== generation.current) return
      parseBayesImport(source, readBayesJourney().pendingRequest)
      setCandidate({ ...result, source })
      setNotice({ text: result.summary.producer === 'agent' ? '这是 AI 代跑的参考记录，可以看，但不能替你完成亲手实操。' : result.summary.complete ? '结果已重新计算并核对一致。先看变化，再由你决定是否保存。' : '记录核对一致，但小课还没有做完；原来的记录没有改变。', error: false })
    } catch (error) { if (current === generation.current) setNotice({ text: failure(error), error: true }) }
    finally { if (current === generation.current) setBusy(false) }
  }, [verify])

  useEffect(() => {
    const sync = () => { const next = readBayesJourney(); setState(next); setAnswers(next.reflection ?? blank()) }
    const syncProgress = () => setProgress(readProgress())
    const storage = (event: StorageEvent) => {
      if (event.key === BAYES_JOURNEY_KEY || event.key === null) sync()
      if (event.key === 'genai-learning-progress-v1' || event.key === null) syncProgress()
    }
    window.addEventListener(BAYES_JOURNEY_EVENT, sync); window.addEventListener(PROGRESS_CHANGE_EVENT, syncProgress); window.addEventListener('storage', storage)
    return () => { window.removeEventListener(BAYES_JOURNEY_EVENT, sync); window.removeEventListener(PROGRESS_CHANGE_EVENT, syncProgress); window.removeEventListener('storage', storage) }
  }, [])
  useEffect(() => {
    if (window.location.hash.startsWith('#playground=')) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
    if (returned.source) { setText(returned.source); void check(returned.source) }
    else if (returned.error) setNotice({ text: returned.error, error: true })
    return () => { generation.current += 1 }
  }, [check, returned])
  useEffect(() => {
    if (!candidate) return
    const frame = requestAnimationFrame(() => { recordRef.current?.focus({ preventScroll: true }); recordRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' }) })
    return () => cancelAnimationFrame(frame)
  }, [candidate])

  function commit(next: BayesJourneyState) {
    if (!writeBayesJourney(next)) { tell('浏览器暂时不能保存，当前结果仍在页面里；原有记录没有改变。', true); return false }
    rememberCurrentJourney('bayes-learning')
    setState(next); setAnswers(next.reflection ?? blank()); return true
  }
  function openCourse() { if (commit({ ...readBayesJourney(), active: true })) go('foundation', { node: 'probability' }) }
  function openPlayground() {
    try { const launch = startBayesLaunch(readBayesJourney(), base, window.location.href, window.crypto.randomUUID()); if (commit(launch.state)) window.location.assign(launch.url) }
    catch (error) { tell(failure(error), true) }
  }
  function changeText(value: string) { generation.current += 1; setText(value); setCandidate(null); setDeclared(false); setBusy(false); tell('') }
  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (!file) return
    const current = ++generation.current; setBusy(true)
    try {
      if (file.size > 65536) throw Error('文件超过 64 KiB，旧文本与已保存记录都保留。')
      const source = await file.text(); if (current !== generation.current) return
      parseBayesImport(source, readBayesJourney().pendingRequest)
      setText(source); setCandidate(null); setDeclared(false); void check(source)
    } catch (error) { if (current === generation.current) tell('没能读取这份文件。' + failure(error), true) }
    finally { if (current === generation.current) setBusy(false) }
  }
  function savePractice() {
    if (!candidate) return
    try {
      parseBayesImport(candidate.source, readBayesJourney().pendingRequest)
      if (commit(recordBayesPractice(readBayesJourney(), candidate.receipt, declared))) { setCandidate(null); setDeclared(false); tell('实操已保存。接下来用两个判断，说清楚你看到了什么。'); focus(recapRef) }
    } catch (error) { tell(failure(error), true) }
  }
  function reflect() {
    if (pending || !answers.update || !answers.certainty) return
    try {
      if (commit(saveBayesReflection(readBayesJourney(), { update: answers.update, certainty: answers.certainty }))) {
        const correct = answers.update === 'evidence' && answers.certainty === 'uncertain'
        tell(correct ? '你已用这次结果区分了判断更新和真实环境变化。完成路径不代表已掌握。' : '先对照解释，再想一次；答错不会抹掉你的实操。')
        if (correct) focus(finishRef)
      }
    } catch (error) { tell(failure(error), true) }
  }
  function cancelPreview() { generation.current += 1; setCandidate(null); setDeclared(false); setBusy(false); tell('新预览已取消，文本仍保留，没有替换已保存记录。') }

  return <section className='lo-learning-journey' id='bayes-learning-journey' tabIndex={-1} aria-labelledby={`${id}-title`}>
    <header><div><span className='journey-kicker'>第二条完整学习路径 · 贝叶斯更新</span><h2 id={`${id}-title`}>同一条线索，为什么有人改得更多？</h2><p>两份日志都是 60% 命中，再来一次空手。先猜谁会改得更多，亲手揭晓，再带着真实结果回来解释。</p></div><strong className='journey-count' aria-label={`贝叶斯路径记录 ${status.steps.filter(Boolean).length} / 3`}>{status.steps.filter(Boolean).length} / 3<small>已留下的路径记录</small></strong></header>
    <ol className='journey-steps'>
      <li data-done={status.steps[0]}><span>01 · 看机制</span><h3>先分清概率与保证</h3><p>{status.steps[0] ? '已浏览，不代表已掌握。可以回去核对概率基础。' : '先看现有概率基础；贝叶斯更新的前后变化，在下一步小课里亲手试。'}</p><button type='button' onClick={openCourse}>打开概率基础课程</button></li>
      <li data-done={status.steps[1]}><span>02 · 亲手试</span><h3>同样空手一次，谁改得更多？</h3><p>完成猜测、对比、加入一次空手和最后解释。小课结束后带回记录，原探矿玩法不变。</p><button type='button' className='is-primary' onClick={openPlayground}>去盲盒探矿亲手试</button></li>
      <li data-done={status.steps[2]}><span>03 · 带结果回来</span><h3>变的是判断，还是星球？</h3><p>带回的是实际做过的动作，不是访问次数。先确认保存，再用自己的结果复盘。</p><button type='button' disabled={!state.practice || pending} onClick={() => focus(recapRef)}>看结果并复盘</button></li>
    </ol>
    <div className='journey-message' role='status' aria-live='polite' data-error={notice.error}>{notice.text}</div>
    <details className='journey-import'><summary>没有自动带回？手动选择或粘贴实验记录</summary><p>只接收贝叶斯固定小课的 JSON，不读取自由探矿或其他草稿。核对会加载公开计算模块，在浏览器内重放，不上传记录。</p><label htmlFor={`${id}-file`}>选择贝叶斯实验 JSON<input id={`${id}-file`} type='file' accept='.json,application/json' onChange={selectFile} /></label><textarea aria-label='贝叶斯实验记录 JSON' rows={4} value={text} onChange={event => changeText(event.target.value)} spellCheck={false} /><button type='button' disabled={!text.trim() || busy} onClick={() => void check(text)}>{busy ? '正在核对……' : '重新计算并核对记录'}</button></details>
    {pending && <button type='button' onClick={cancelPreview}>取消新记录预览</button>}
    {summary && <section className='journey-record' aria-labelledby={`${id}-record`}><header><span className='journey-kicker'>{candidate ? '新带回的记录 · 尚未保存' : '已保存的实操'}</span><h3 id={`${id}-record`} ref={recordRef} tabIndex={-1}>这一次，判断真的怎样变了？</h3><p>核对只说明动作与计算一致，不认证是谁操作。你原先猜：{guesses[summary.guess ?? ''] ?? '尚未预测'} 的判断更集中；一次空手后，{guesses[summary.changeGuess ?? ''] ?? '尚未预测'} 变化更多。</p></header><BayesEvidence summary={summary} />
      {candidate && <div className='journey-confirm'>{state.practice && <p>旧实操与复盘仍保留，确认后才会替换。</p>}{canSave ? <label><input type='checkbox' checked={declared} onChange={event => setDeclared(event.target.checked)} />这是我刚才亲手操作的记录</label> : <p>{summary.producer === 'agent' ? 'AI 代跑只作参考，不能计作你的亲手实操。' : '这份小课还没有完成，不能记作完整实操。'}</p>}<button type='button' className='is-primary' disabled={!canSave || !declared || busy} onClick={savePractice}>确认保存到这条路径</button></div>}
    </section>}
    <BayesCoachPanel practice={state.practice} reflection={state.reflection} pending={pending} verify={verify} />
    <section className='journey-recap' aria-labelledby={`${id}-recap`}><h3 id={`${id}-recap`} ref={recapRef} tabIndex={-1}>用两个判断，把这次更新讲明白</h3><p>{pending ? '先保存或取消新记录预览，再对照已保存的实操作答。' : state.practice ? '不考术语。对照上面的前后结果，选错也可以再想。' : '先完成小课并保存亲手实操，再用自己的结果解释。'}</p>
      <div className='journey-questions'><fieldset disabled={!state.practice || pending}><legend>加一次空手之后，真正更新的是什么？</legend><label><input type='radio' name={`${id}-update`} checked={answers.update === 'planet'} onChange={() => setAnswers({ ...answers, update: 'planet' })} />星球被这次空手改变了，矿变少了</label><label><input type='radio' name={`${id}-update`} checked={answers.update === 'evidence'} onChange={() => setAnswers({ ...answers, update: 'evidence' })} />加入新证据后，我们对未知成功率的判断变了</label>{state.reflection && !pending && <p className='journey-feedback'>{state.reflection.update === 'evidence' ? '对。这个小课假设真实成功率不变，改变的是我们根据观察作出的判断。' : '小课没有模拟矿被挖少。它假设成功率固定，用新观察更新判断。'}</p>}</fieldset>
      <fieldset disabled={!state.practice || pending}><legend>连续 10 次空手，能断言成功率为零吗？</legend><label><input type='radio' name={`${id}-certainty`} checked={answers.certainty === 'zero'} onChange={() => setAnswers({ ...answers, certainty: 'zero' })} />能，没挖中就说明永远没有</label><label><input type='radio' name={`${id}-certainty`} checked={answers.certainty === 'uncertain'} onChange={() => setAnswers({ ...answers, certainty: 'uncertain' })} />更支持低概率，但有限观察还不能证明为零</label>{state.reflection && !pending && <p className='journey-feedback'>{state.reflection.certainty === 'uncertain' ? '对。0/10 比 0/1 提供更多低概率证据，既不是零概率证明，也不保证下一次该命中。' : '看看 0/1 和 0/10 的预测：它们不一样，但都不是零；更多空手也不保证下一次中奖。'}</p>}</fieldset></div>
      {state.practice && !pending && <details><summary>给我一个观察提示</summary><p>本地提示，不是 AI 回答：同一次新反馈，在 5 次旧记录和 30 次旧记录里分量一样吗？再分清“下一次的预测”和“保证下一次发生”。</p></details>}
      <button type='button' className='is-primary' disabled={!state.practice || pending || !answers.update || !answers.certainty} onClick={reflect}>核对我的理解</button>
    </section>
    {status.complete && !pending && <footer className='journey-finish'><div><span className='journey-kicker'>这一轮路径已完成</span><h3 ref={finishRef} tabIndex={-1}>新证据改判断，不替世界下保证。</h3><p>你留下了课程浏览、实操与复盘。它们不是身份认证或掌握证明，也不增加原课程完成度和能力覆盖率。</p></div><button type='button' onClick={openPlayground}>换个猜测，再试一次</button></footer>}
    <p className='journey-boundary'>固定教学条件：相同 Beta(1,1) 先验，成功率不变、给定成功率后各次观察独立。此小课不是原探矿游戏的生成机制，也不能直接套用到真实采矿。</p>
  </section>
}
