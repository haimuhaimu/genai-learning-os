import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent, type RefObject } from 'react'
import {
  JOURNEY_EVENT, JOURNEY_KEY, PUBLIC_PLAYGROUND_BASE, decodeJourneyHash, deriveJourneyStatus, parseJourneyImport,
  readJourney, recordPersonalPractice, saveJourneyReflection, startJourneyLaunch, summarizeLearningRun,
  verifyPlaygroundRecord, writeJourney, type JourneyReflection, type JourneyState, type LearningRunSummary, type ReceiptVerifier,
} from '../../learningJourney'
import { PROGRESS_CHANGE_EVENT, readProgress } from '../../progress'
import { replayPlaygroundReceipt } from '../../playgroundReplay'
import { rememberCurrentJourney } from '../../journeyResume'
import ModelCoachPanel from './ModelCoachPanel'

type Go = (page: string, options?: Record<string, string>) => void
type Candidate = Awaited<ReturnType<typeof verifyPlaygroundRecord>> & { source: string }
type Answers = { change: JourneyReflection['change'] | ''; evaluation: JourneyReflection['evaluation'] | '' }
const blankAnswers = (): Answers => ({ change: '', evaluation: '' })
const failure = (error: unknown) => error instanceof Error ? error.message : '暂时没能完成这一步；原有记录仍保留，请重试。'

function Evidence({ summary }: { summary: LearningRunSummary }) {
  return <div className='journey-evidence'>
    <div><span>教过的例子，分错几个？</span><strong>{summary.trainingBefore} → {summary.trainingAfter}</strong><small>真实训练 {summary.trainingSteps} 步，点的位置和标签不变。</small></div>
    <div><span>拆开一次更新，误差怎样变？</span><strong>{summary.gradientBefore.toFixed(3)} → {summary.gradientAfter.toFixed(3)}</strong><small>步长 {summary.rate}，更新 {summary.gradientSteps} 步。你当时猜：{summary.stepGuess === 'points' ? '点会移动' : summary.stepGuess === 'parameters' ? '分界线会变' : '尚未预测'}。</small></div>
    <div><span>没教过的新题，答对几个？</span><strong>{summary.testCorrect ?? '—'} / {summary.testTotal ?? '—'}</strong><small>你当时猜：{summary.testGuess === 'all' ? '新题全对' : summary.testGuess === 'not-all' ? '不一定全对' : '尚未预测'}。固定教学样例，不是现实准确率。</small></div>
  </div>
}

export function JourneyRecap({ id, practice, pending, answers, reflection, headingRef, onAnswers, onReflect }: {
  id: string; practice: boolean; pending: boolean; answers: Answers; reflection?: JourneyReflection
  headingRef?: RefObject<HTMLHeadingElement>; onAnswers: (value: Answers) => void; onReflect: () => void
}) {
  const blocked = !practice || pending
  return <section className='journey-recap' aria-labelledby={`${id}-recap`}><h3 id={`${id}-recap`} ref={headingRef} tabIndex={-1}>用两次判断，把这轮讲明白</h3><p>{pending ? '你正在核对或查看另一份记录。先保存或取消新记录预览，再对照当前保存的实操作答。' : practice ? '不考术语。对照你刚才的实操结果作答，选错也可以再想。' : '先亲手完成三站并保存记录，这里的判断才有自己的结果可以对照。'}</p>
    <div className='journey-questions'>
      <fieldset disabled={blocked}><legend>走一步时，算法究竟改了什么？</legend><label><input type='radio' name={`${id}-change`} value='points' checked={answers.change === 'points'} onChange={() => onAnswers({ ...answers, change: 'points' })} />把例子挪到正确的位置</label><label><input type='radio' name={`${id}-change`} value='parameters' checked={answers.change === 'parameters'} onChange={() => onAnswers({ ...answers, change: 'parameters' })} />点没动，改了分界线的参数</label>{reflection && !pending && <p className='journey-feedback'>{reflection.change === 'parameters' ? '对。点的位置没有改变，更新的是决定分界线的参数；步长控制改多少。' : '点的位置没有改变。看看实线和虚线，真正改变的是分界线的参数。'}</p>}</fieldset>
      <fieldset disabled={blocked}><legend>练习题全对，就能说新题也全对吗？</legend><label><input type='radio' name={`${id}-evaluation`} value='practice' checked={answers.evaluation === 'practice'} onChange={() => onAnswers({ ...answers, evaluation: 'practice' })} />练习全对，已经可以下结论</label><label><input type='radio' name={`${id}-evaluation`} value='unseen' checked={answers.evaluation === 'unseen'} onChange={() => onAnswers({ ...answers, evaluation: 'unseen' })} />还要拿没参加训练的新题来检验</label>{reflection && !pending && <p className='journey-feedback'>{reflection.evaluation === 'unseen' ? '对。揭开新题是在评估冻结的模型，不是继续训练；固定样例成绩也不是现实准确率。' : '练习题参与过训练，不能替代新题。你的记录保留了两份不同的结果。'}</p>}</fieldset>
    </div>
    {!blocked && <details><summary>给我一个观察提示</summary><p>本地提示，不是 AI 回答：先盯住同一个编号，比较它的位置、形状和两条分界；再把练习题与新题的成绩分开看。可以回游乐场退回同一起点，换一个步长再试，前一次的结果会保留作对照。</p></details>}
    <button type='button' className='is-primary' disabled={blocked || !answers.change || !answers.evaluation} onClick={onReflect}>核对我的理解</button>
  </section>
}

export default function LearningJourneyPanel({ go, playgroundBase, verify = replayPlaygroundReceipt }: {
  go: Go
  playgroundBase?: string
  verify?: ReceiptVerifier
}) {
  const [state, setState] = useState(readJourney)
  const [progress, setProgress] = useState(readProgress)
  const [text, setText] = useState('')
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [declared, setDeclared] = useState(false)
  const [answers, setAnswers] = useState<Answers>(() => readJourney().reflection ?? blankAnswers())
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState({ text: '', error: false })
  // Keep the incoming text through StrictMode's setup/cleanup/setup cycle.
  const [returned] = useState(() => {
    if (typeof window === 'undefined') return { source: null, error: '' }
    try { return { source: decodeJourneyHash(window.location.hash), error: '' } }
    catch (error) { return { source: null, error: failure(error) } }
  })
  const generation = useRef(0)
  const id = useId()
  const recapRef = useRef<HTMLHeadingElement>(null)
  const recordRef = useRef<HTMLHeadingElement>(null)
  const finishRef = useRef<HTMLHeadingElement>(null)
  const status = deriveJourneyStatus(progress, state)
  const summary = candidate?.summary ?? (state.practice ? summarizeLearningRun(state.practice.receipt) : null)
  const canSave = candidate?.summary.producer === 'browser-session' && candidate.summary.complete
  const base = playgroundBase ?? import.meta.env?.VITE_PLAYGROUND_BASE_URL ?? PUBLIC_PLAYGROUND_BASE
  const tell = (message: string, error = false) => setNotice({ text: message, error })

  const check = useCallback(async (source: string) => {
    const current = ++generation.current
    setBusy(true); setCandidate(null); setDeclared(false)
    setNotice({ text: '正在按这份操作记录重新计算，核对前后结果……', error: false })
    try {
      const result = await verifyPlaygroundRecord(source, verify, readJourney().pendingRequest)
      if (current !== generation.current) return
      // A newer launch in another tab must not make this old return current again.
      parseJourneyImport(source, readJourney().pendingRequest)
      setCandidate({ ...result, source })
      setNotice({ text: result.summary.producer === 'agent'
        ? '这是 AI 代跑的参考记录。可以看结果，但不能替你完成亲手实操。'
        : result.summary.complete ? '结果已重新计算并核对一致。先看看变化，再由你决定是否保存。' : '记录核对一致，但三站尚未做完；先回游乐场继续，不能用它完成这条路径。', error: false })
    } catch (error) {
      if (current === generation.current) setNotice({ text: failure(error), error: true })
    } finally { if (current === generation.current) setBusy(false) }
  }, [verify])

  useEffect(() => {
    const syncJourney = () => {
      const next = readJourney(); setState(next); setAnswers(next.reflection ?? blankAnswers())
    }
    const syncProgress = () => setProgress(readProgress())
    const syncStorage = (event: StorageEvent) => {
      if (event.key === JOURNEY_KEY || event.key === null) syncJourney()
      if (event.key === 'genai-learning-progress-v1' || event.key === null) syncProgress()
    }
    window.addEventListener(JOURNEY_EVENT, syncJourney)
    window.addEventListener(PROGRESS_CHANGE_EVENT, syncProgress)
    window.addEventListener('storage', syncStorage)
    return () => {
      window.removeEventListener(JOURNEY_EVENT, syncJourney)
      window.removeEventListener(PROGRESS_CHANGE_EVENT, syncProgress)
      window.removeEventListener('storage', syncStorage)
    }
  }, [])

  useEffect(() => {
    if (window.location.hash.startsWith('#playground=')) {
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
    }
    if (returned.source) { setText(returned.source); void check(returned.source) }
    else if (returned.error) setNotice({ text: returned.error, error: true })
    return () => { generation.current += 1 }
  }, [check, returned])

  useEffect(() => {
    if (!candidate) return
    const frame = requestAnimationFrame(() => {
      recordRef.current?.focus({ preventScroll: true })
      recordRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
    })
    return () => cancelAnimationFrame(frame)
  }, [candidate])

  function commit(next: JourneyState) {
    if (!writeJourney(next)) { tell('浏览器暂时不能保存。当前结果仍在页面里，原有记录没有改变；请检查存储空间后再试。', true); return false }
    rememberCurrentJourney('model-learning')
    setState(next); setAnswers(next.reflection ?? blankAnswers()); return true
  }

  function openCourse() {
    if (commit({ ...readJourney(), active: true })) go('foundation', { node: 'gradient-descent' })
  }
  function openPlayground() {
    try {
      const launch = startJourneyLaunch(readJourney(), base, window.location.href, window.crypto.randomUUID())
      if (commit(launch.state)) window.location.assign(launch.url)
    } catch (error) { tell(failure(error), true) }
  }
  function changeText(value: string) {
    generation.current += 1; setText(value); setCandidate(null); setDeclared(false); setBusy(false); tell('')
  }
  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    const current = ++generation.current
    setBusy(true)
    try {
      if (file.size > 65536) throw Error('文件超过 64 KiB。旧文本和已保存记录仍保留，请选择本轮实验 JSON。')
      const source = await file.text()
      if (current !== generation.current) return
      parseJourneyImport(source, readJourney().pendingRequest)
      setText(source); setCandidate(null); setDeclared(false)
      void check(source)
    } catch (error) {
      if (current === generation.current) tell('没能读取这份文件。' + failure(error), true)
    } finally { if (current === generation.current) setBusy(false) }
  }
  function savePractice() {
    if (!candidate) return
    try {
      parseJourneyImport(candidate.source, readJourney().pendingRequest)
      const next = recordPersonalPractice(readJourney(), candidate.receipt, declared)
      if (commit(next)) {
        setCandidate(null); setDeclared(false); tell('实操记录已保存在这条路径。下面用两次判断说清楚你看到了什么。')
        requestAnimationFrame(() => { recapRef.current?.focus({ preventScroll: true }); recapRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' }) })
      }
    } catch (error) { tell(failure(error), true) }
  }
  function reflect() {
    if (candidate || busy || !answers.change || !answers.evaluation) return
    try {
      const next = saveJourneyReflection(readJourney(), { change: answers.change, evaluation: answers.evaluation })
      if (commit(next)) {
        const correct = answers.change === 'parameters' && answers.evaluation === 'unseen'
        tell(correct ? '这两次判断解释了记录里的变化。还可以回实验换步长，再看同一个点。' : '先对照下面的解释，再想一次。答错不会抹掉你的实操。')
        if (correct) requestAnimationFrame(() => { finishRef.current?.focus({ preventScroll: true }); finishRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' }) })
      }
    } catch (error) { tell(failure(error), true) }
  }
  function cancelPreview() {
    generation.current += 1; setCandidate(null); setBusy(false); setDeclared(false)
    tell(state.practice ? '已回到上一次保存的实操。新文本仍保留，没有替换旧记录。' : '新记录预览已取消，文本仍保留，没有保存或推进路径。')
  }

  return <section className='lo-learning-journey' id='learning-journey' tabIndex={-1} aria-labelledby={`${id}-title`}>
    <header><div><span className='journey-kicker'>一条完整的学习路径</span><h2 id={`${id}-title`}>模型怎么从例子里学会？</h2><p>先看清一次更新，再亲手试，最后带着结果回来解释。先完整走通这一条，不必一次学完所有课程。</p></div><strong className='journey-count' aria-label={`路径记录 ${status.steps.filter(Boolean).length} / 3`}>{status.steps.filter(Boolean).length} / 3<small>已留下的路径记录</small></strong></header>
    <ol className='journey-steps'>
      <li data-done={status.steps[0]}><span>01 · 看机制</span><h3>学习究竟改了什么？</h3><p>{status.steps[0] ? '已浏览，不代表已掌握。可以随时回去核对公式。' : '打开 F05，先看参数怎样沿着梯度更新。'}</p><button type='button' onClick={openCourse}>打开梯度下降课程</button></li>
      <li data-done={status.steps[1]}><span>02 · 亲手试</span><h3>让分界线真的动一次</h3><p>去游乐场完成分类、走一步、新题检验三站。结束后点“带回 GenAI OS 复盘”。</p><button type='button' className='is-primary' onClick={openPlayground}>去游乐场亲手试</button></li>
      <li data-done={status.steps[2]}><span>03 · 带结果回来</span><h3>说清发生了什么</h3><p>{state.practice ? '实操已保存。用下面两个判断，把训练和新题检验分开。' : '只有点过链接还不算。带回真实操作记录，再根据结果复盘。'}</p><button type='button' disabled={!state.practice || Boolean(candidate) || busy} onClick={() => { recapRef.current?.focus(); recapRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' }) }}>看结果并复盘</button></li>
    </ol>

    <div className='journey-message' role='status' aria-live='polite' data-error={notice.error}>{notice.text}</div>
    <details className='journey-import'><summary>没有自动带回？手动选择或粘贴实验记录</summary><p>只接收这条固定三站路线的 JSON，不读取自由画布或草稿。核对时会加载游乐场的公开计算模块；记录只在浏览器里重算，不会上传。</p><label htmlFor={`${id}-file`}>选择实验 JSON<input id={`${id}-file`} type='file' accept='.json,application/json' onChange={selectFile} /></label><textarea aria-label='实验记录 JSON' rows={4} value={text} onChange={event => changeText(event.target.value)} spellCheck={false} /><button type='button' disabled={!text.trim() || busy} onClick={() => void check(text)}>{busy ? '正在核对……' : '重新计算并核对记录'}</button></details>
    {(candidate || busy) && <button type='button' onClick={cancelPreview}>取消新记录预览</button>}

    {summary && <section className='journey-record' aria-labelledby={`${id}-record`}><header><span className='journey-kicker'>{candidate ? '新带回的记录 · 尚未保存' : '已保存的实操'}</span><h3 id={`${id}-record`} ref={recordRef} tabIndex={-1}>这一次，真实发生了什么？</h3><p>{candidate ? '核对只说明操作与计算结果一致，不认证是谁操作，也不证明已经学会。' : '本人自报的网页操作，已在保存前重放核对；不是身份认证。'}</p></header><Evidence summary={summary} />
      {candidate && <div className='journey-confirm'>
        {state.practice && <p>上一次的实操和复盘仍保留。只有你确认保存，才会替换。</p>}
        {canSave ? <label><input type='checkbox' checked={declared} onChange={event => setDeclared(event.target.checked)} />这是我刚才亲手操作的记录</label> : <p>{summary.producer === 'agent' ? 'AI 代跑只作参考，不能计作你的亲手实操。' : '这份记录尚未完成三站，不能完成实操步骤。'}</p>}
        <button type='button' className='is-primary' disabled={!canSave || !declared || busy} onClick={savePractice}>确认保存到这条路径</button>
      </div>}
    </section>}

    <ModelCoachPanel practice={state.practice} reflection={state.reflection} pending={Boolean(candidate) || busy} />
    <JourneyRecap id={id} practice={Boolean(state.practice)} pending={Boolean(candidate) || busy} answers={answers} reflection={state.reflection} headingRef={recapRef} onAnswers={setAnswers} onReflect={reflect} />
    {status.complete && !candidate && !busy && <footer className='journey-finish'><div><span className='journey-kicker'>这一轮路径已完成</span><h3 ref={finishRef} tabIndex={-1}>训练改规则，新题检验规则。</h3><p>你留下了课程浏览、亲手实操和两次复盘判断。不代表已掌握，也不会替你完成原课程。</p></div><button type='button' onClick={() => go('foundation', { node: 'linear-layer' })}>继续：线性层与矩阵乘</button></footer>}
    <p className='journey-boundary'>这条路径独立记录“做过什么”，不增加原课程完成度或能力覆盖率；其他学习路线、实验和草稿都保留。</p>
  </section>
}
