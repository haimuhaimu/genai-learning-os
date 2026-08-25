import { ArrowRight, BookOpenCheck, BrainCircuit, FlaskConical, Lightbulb, Sparkles, Target } from 'lucide-react'
import PaperLabCard from './PaperLabCard'
import { goldenPaperLabs } from './paperLabsRegistry'
import { getPaperLessonHubCta, getPaperLessonSummary } from './shared/paperLessonProgress'
import { usePaperLessonProgressMap } from './shared/usePaperLessonProgressMap'

type Go = (page: string, options?: Record<string, string>) => void

const journey = [
  { label: '先猜', icon: Target },
  { label: '看犯错', icon: BrainCircuit },
  { label: '动旋钮', icon: FlaskConical },
  { label: '找规律', icon: Lightbulb },
  { label: '懂论文', icon: Sparkles },
]

export default function CaseAcademyHub({ go }: { go: Go }) {
  const progress = usePaperLessonProgressMap()
  const ids = goldenPaperLabs.map((lab) => lab.paperId)
  const summary = getPaperLessonSummary(progress, ids)
  const mainCta = getPaperLessonHubCta(progress, ids)
  const completion = summary.total ? Math.round((summary.completed / summary.total) * 100) : 0
  const openMainline = () => go('paper-lab', mainCta.paperId ? { paper: mainCta.paperId } : {})

  return (
    <section className='paper-labs-page case-academy' aria-labelledby='case-academy-title'>
      <header className='case-academy-hero'>
        <div className='case-academy-hero-copy'>
          <span className='case-academy-eyebrow'><BookOpenCheck aria-hidden='true' />CASE ACADEMY · 案例课程</span>
          <h1 id='case-academy-title'>别背概念，<em>先破一个案。</em></h1>
          <p>每课只做一次业务判断、观察一次 AI 犯错、调一个变量。五关之后，你自然说出背后的算法。</p>
          <button type='button' onClick={openMainline}>{mainCta.label}<ArrowRight aria-hidden='true' /></button>
        </div>
        <div className='case-academy-score' aria-label={`学习进度：已通关 ${summary.completed} 门，共 ${summary.total} 门`}>
          <span>你的案例档案</span>
          <strong>{summary.completed}<small>/{summary.total}</small></strong>
          <div><i style={{ width: `${completion}%` }} /></div>
          <small>{completion === 100 ? '全部完成，随时回来复盘' : `再完成 ${summary.total - summary.completed} 个案例`}</small>
        </div>
      </header>

      <ol className='case-journey' aria-label='每门课的五关学习路径'>
        {journey.map(({ label, icon: Icon }, index) => (
          <li key={label}><span>{index + 1}</span><Icon aria-hidden='true' /><strong>{label}</strong></li>
        ))}
      </ol>

      <section className='case-academy-catalog' aria-labelledby='case-academy-path-title'>
        <div className='case-catalog-heading'>
          <div><span>7 个真实决策现场</span><h2 id='case-academy-path-title'>选择你的下一个案件</h2></div>
          <p>每门约 5 分钟 · 自动保存进度</p>
        </div>
        <ol className='case-course-grid'>
          {goldenPaperLabs.map((lab) => (
            <PaperLabCard
              key={lab.paperId}
              lab={lab}
              record={progress[lab.paperId]}
              onOpen={() => go('paper-lab', { paper: lab.paperId })}
            />
          ))}
        </ol>
      </section>
    </section>
  )
}
