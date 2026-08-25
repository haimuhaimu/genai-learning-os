import { useEffect, useState, type ReactNode } from 'react'
import { CheckCircle2, RotateCcw, ShieldCheck } from 'lucide-react'
import {
  clearResourceLoop,
  isResourceLoopComplete,
  readResourceLoop,
  RESOURCE_LOOP_EVENT,
  saveInitialJudgment,
  saveReviewJudgment,
  type ResourceLoopRecord,
} from '../../resourceLoop'
import type { CaseId } from './caseCatalog'

type Props = { caseId: CaseId; question: string; children: ReactNode; hideInitialStep?: boolean }

export default function ResourceLearningLoop({ caseId, question, children, hideInitialStep = false }: Props) {
  const [record, setRecord] = useState<ResourceLoopRecord | undefined>(() => readResourceLoop(caseId))
  const [initial, setInitial] = useState(record?.initialJudgment ?? '')
  const [review, setReview] = useState(record?.reviewJudgment ?? '')
  const complete = isResourceLoopComplete(record)

  useEffect(() => {
    const refresh = () => setRecord(readResourceLoop(caseId))
    window.addEventListener(RESOURCE_LOOP_EVENT, refresh)
    return () => window.removeEventListener(RESOURCE_LOOP_EVENT, refresh)
  }, [caseId])

  const saveInitial = () => {
    if (!initial.trim()) return
    setRecord(saveInitialJudgment(caseId, initial))
  }
  const saveReview = () => {
    if (!review.trim()) return
    setRecord(saveReviewJudgment(caseId, review))
  }
  const clear = () => {
    if (!window.confirm('仅清除当前案例的首次判断、复盘判断和资源触达记录？')) return
    clearResourceLoop(caseId)
    setRecord(undefined)
    setInitial('')
    setReview('')
  }

  return (
    <section className='resource-learning-loop' aria-labelledby={`resource-loop-${caseId}`}>
      <header>
        <span>资源学习闭环 · 仅保存在当前浏览器</span>
        <h2 id={`resource-loop-${caseId}`}>先判断，再带着问题触达资源，最后复盘</h2>
        <p><ShieldCheck aria-hidden='true' />回答不会上传。资源“已触达”仅表示你主动打开过，不代表已经看完或学会。</p>
      </header>

      {!hideInitialStep ? (
        <section className='resource-loop-step'>
          <div className='resource-loop-step-title'><b>1</b><span><strong>首次判断</strong><small>{question}</small></span></div>
          <label htmlFor={`initial-${caseId}`}>写下查看补充资源前的判断</label>
          <textarea id={`initial-${caseId}`} value={initial} maxLength={4000} onChange={(event) => setInitial(event.target.value)} placeholder='我现在会如何决策？依据和不确定性是什么？' />
          <button type='button' disabled={!initial.trim()} onClick={saveInitial}>{record?.initialJudgment ? '更新首次判断' : '保存首次判断'}</button>
        </section>
      ) : null}

      <section className='resource-loop-resources' aria-labelledby={`resources-${caseId}`}>
        <div className='resource-loop-step-title'><b>2</b><span><strong id={`resources-${caseId}`}>主动打开补充资源</strong><small>打开动作会记录在本机；请看完后回到这里继续复盘。</small></span></div>
        {children}
        <p className='resource-touch-status' aria-live='polite'>已触达 {record?.resources.length ?? 0} 项资源（不等于完成学习）</p>
      </section>

      <section className='resource-loop-step'>
        <div className='resource-loop-step-title'><b>3</b><span><strong>复盘判断</strong><small>首次判断保存后即可复盘；未触达资源时也允许保存，但不会标记完整闭环。</small></span></div>
        <label htmlFor={`review-${caseId}`}>写下补充资源后的判断与变化</label>
        <textarea id={`review-${caseId}`} value={review} maxLength={4000} disabled={!record?.initialJudgment} onChange={(event) => setReview(event.target.value)} placeholder='哪些判断保持不变？哪些依据、边界或下一步发生了变化？' />
        <button type='button' disabled={!record?.initialJudgment || !review.trim()} onClick={saveReview}>{record?.reviewJudgment ? '更新复盘判断' : '保存复盘判断'}</button>
        {record?.reviewJudgment && !record.resources.length ? <p className='resource-loop-warning' role='status'>复盘已保存，但尚未主动打开关联资源，因此还未形成完整资源闭环。</p> : null}
      </section>

      {record?.initialJudgment && record.reviewJudgment ? (
        <section className='resource-loop-comparison' aria-labelledby={`compare-${caseId}`}>
          <header><CheckCircle2 aria-hidden='true' /><div><h3 id={`compare-${caseId}`}>前后判断对比</h3><p>{complete ? '已完成一次资源学习闭环' : '已完成前后复盘；触达至少一项资源后形成完整闭环'}</p></div></header>
          <div><article><span>首次判断</span><p>{record.initialJudgment}</p></article><article><span>复盘判断</span><p>{record.reviewJudgment}</p></article></div>
          <strong>{record.initialJudgment === record.reviewJudgment ? '变化提示：两次表述相同，可以继续补充依据或边界。' : '变化提示：判断已发生变化，请关注新增的依据、风险与下一步验证。'}</strong>
        </section>
      ) : null}

      {record ? <button type='button' className='resource-loop-clear' onClick={clear}><RotateCcw aria-hidden='true' />清除当前案例记录</button> : null}
    </section>
  )
}
