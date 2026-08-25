import { ArrowRight, BookOpenCheck, CheckCircle2, RotateCcw } from 'lucide-react'
import { goldenPaperLabs } from './paperLabsRegistry'
import { getPaperLessonCta, getPaperLessonHubCta, getPaperLessonSummary } from './shared/paperLessonProgress'
import { usePaperLessonProgressMap } from './shared/usePaperLessonProgressMap'

type Go = (page: string, options?: Record<string, string>) => void

export default function CaseAcademyHub({ go }: { go: Go }) {
  const progress = usePaperLessonProgressMap()
  const ids = goldenPaperLabs.map((lab) => lab.paperId)
  const summary = getPaperLessonSummary(progress, ids)
  const mainCta = getPaperLessonHubCta(progress, ids)
  const openMainline = () => go('paper-lab', mainCta.paperId ? { paper: mainCta.paperId } : {})

  return (
    <section className='paper-labs-page' aria-labelledby='case-academy-title'>
      <header className='paper-lab-hero'>
        <span><BookOpenCheck aria-hidden='true' />CASE ACADEMY · 案例课程</span>
        <h1 id='case-academy-title'>通过 Case 学 AI</h1>
        <p>不先背术语。每课从一次业务判断开始，经历错误、单变量实验与规律总结，第 5 关再揭示论文语言。</p>
        <div>
          <b>{summary.completed}/{summary.total}</b><span>门课程已通关</span>
          <button type='button' onClick={openMainline}>{mainCta.label}<ArrowRight aria-hidden='true' /></button>
        </div>
      </header>

      <section className='paper-teaching-flow' aria-labelledby='case-academy-path-title'>
        <section className='paper-operation-card'>
          <span className='paper-section-kicker'>推荐顺序</span>
          <h2 id='case-academy-path-title'>七门黄金课，一条可续学主线</h2>
          <p className='golden-prompt'>顺序与课程元数据来自注册表；以后新增黄金课会自动出现在这里。</p>
          <ol className='paper-task-list'>
            {goldenPaperLabs.map((lab) => {
              const record = progress[lab.paperId]
              const status = record?.completed ? '已通关' : record ? `第 ${record.step} 关` : '未开始'
              return (
                <li key={lab.paperId} className={record?.completed ? 'is-done' : ''}>
                  {record?.completed ? <CheckCircle2 aria-hidden='true' /> : <ArrowRight aria-hidden='true' />}
                  <div>
                    <span className='task-progress'>{String(lab.order).padStart(2, '0')} · {status}</span>
                    <h3>{lab.shortTitle}</h3>
                    <p>{lab.objective}</p>
                    <strong>能力目标：{lab.ability}</strong>
                    <div className='paper-resource-actions'><button type='button' onClick={() => go('paper-lab', { paper: lab.paperId })}>{record?.completed ? <RotateCcw aria-hidden='true' /> : <ArrowRight aria-hidden='true' />}{getPaperLessonCta(record)}</button></div>
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      </section>
    </section>
  )
}
