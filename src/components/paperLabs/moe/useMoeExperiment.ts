import { useEffect, useRef, useState } from 'react'
import { markProgress } from '../../../progress'
import { lessonStepToLearningStage, readPaperLessonProgress, savePaperLessonStep } from '../shared/paperLessonProgress'
import type { LessonStep } from '../shared/goldenLessonModel'
import { MOE_NOTEBOOK_KEY, freshMoeAttempt, makeMoeAttempt, nextMoeNotebook, readMoeNotebook, persistMoeNotebook, type MoeAttempt, type MoeControls, type MoeLoad, type MoeNotebook } from './moeLessonAttempt'

type Session = { load: MoeLoad; notebook: MoeNotebook; attempt: MoeAttempt | null; view: 'draft' | 'review' | 'legacy'; legacyStep: LessonStep; notice: string; unsaved: boolean }
function loadSession(initialStep: LessonStep): Session {
  const load = readMoeNotebook(), old = readPaperLessonProgress()['switch-transformers']
  const base = { load, notebook: load.notebook, legacyStep: old?.step ?? initialStep, notice: '', unsaved: false }
  if (load.notebook.lastCompleted) return { ...base, attempt: load.notebook.lastCompleted, view: 'review' }
  if (load.notebook.draft) return { ...base, attempt: load.notebook.draft, view: 'draft' }
  if (old || !['empty', 'ready'].includes(load.kind)) return { ...base, attempt: null, view: 'legacy' }
  return { ...base, attempt: freshMoeAttempt(), view: 'draft' }
}
function selectedIsSaved(session: Session, load = session.load) {
  const saved = session.view === 'review' ? load.notebook.lastCompleted : load.notebook.draft
  return JSON.stringify(session.attempt) === JSON.stringify(saved)
}

export function useMoeExperiment(initialStep: LessonStep) {
  const [session, setSession] = useState(() => loadSession(initialStep))
  const current = useRef(session)
  const queue = useRef(Promise.resolve())
  const generation = useRef(0)
  // A lower-priority save acknowledgement must never replay stale controls over a newer input.
  const replace = (next: Session) => { current.current = next; setSession(() => current.current) }
  const enqueue = (operation: () => void | Promise<void>) => {
    queue.current = queue.current.then(operation).catch(() => replace({ ...current.current, notice: '本轮操作未能确认保存，请查看最新保存记录后继续。', unsaved: true }))
  }
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== MOE_NOTEBOOK_KEY && event.key !== null) return
      const before = current.current
      replace({ ...before, notice: '另一页面更新了实验记录。请查看最新保存记录后继续。' })
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  function commit(attempt: MoeAttempt) {
    const before = current.current
    const notebook = nextMoeNotebook(before.notebook, attempt)
    const ticket = generation.current
    // Controls respond synchronously; only durable writes wait for the exclusive lock.
    replace({ ...before, notebook, attempt, view: attempt.step === 5 ? 'review' : 'draft', notice: '', unsaved: true })
    enqueue(async () => {
      if (ticket !== generation.current) return
      let directoryFailed = false
      const saved = await persistMoeNotebook(notebook, current.current.load.raw, undefined, undefined, () => ticket === generation.current, () => {
        savePaperLessonStep('switch-transformers', attempt.step, Boolean(notebook.lastCompleted))
        markProgress('paper-lab:switch-transformers', lessonStepToLearningStage(notebook.lastCompleted ? 5 : attempt.step))
        directoryFailed = readPaperLessonProgress()['switch-transformers']?.step !== attempt.step
      })
      if (ticket !== generation.current) return
      const live = current.current
      const load: MoeLoad = saved.ok ? { kind: 'ready', raw: saved.raw, notebook } : live.load
      const unsaved = !selectedIsSaved(live, load)
      let notice = saved.ok ? '' : saved.reason === 'changed'
        ? '另一页面更新了实验记录。本页的新操作未能确认保存，请查看最新保存记录；原数据没有被覆盖。'
        : '本轮操作未能确认保存，暂时只在本页保留；刷新后可能无法恢复，原有学习记录没有改变。'
      if (!saved.ok && live.view === 'review' && !unsaved) notice = '未完成的新一轮未能确认保存；下面是上次已保存的完整实验。刷新可能丢失新一轮的操作。'
      if (directoryFailed) notice = '实验记录已保存，但目录进度暂时未能更新；重开本课仍可查看实验。'
      replace({ ...live, load, notice, unsaved })
    })
  }
  function update(patch: Partial<MoeControls>) {
    const before = current.current
    if (before.view !== 'draft' || !before.attempt) return
    commit(makeMoeAttempt({ ...before.attempt, ...patch }))
  }
  function selectAttempt(attempt: MoeAttempt, view: 'draft' | 'review') {
    const before = current.current
    const unsaved = !selectedIsSaved({ ...before, attempt, view })
    const notice = !before.notice ? '' : unsaved ? '这轮操作未能确认保存，暂时只在本页保留；刷新后可能无法恢复。'
      : before.unsaved ? '未完成的新一轮未能确认保存；下面是上次已保存的完整实验。刷新可能丢失新一轮的操作。' : before.notice
    replace({ ...before, attempt, view, unsaved, notice })
  }
  const startRound = () => {
    const before = current.current
    if (before.notebook.draft) { selectAttempt(before.notebook.draft, 'draft'); return }
    commit(freshMoeAttempt())
  }
  const showCompleted = () => {
    const before = current.current
    if (before.notebook.lastCompleted) selectAttempt(before.notebook.lastCompleted, 'review')
  }
  const reloadRecords = () => { generation.current++; replace(loadSession(initialStep)) }
  return { ...session, update, startRound, showCompleted, reloadRecords }
}
