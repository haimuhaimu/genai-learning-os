import { useEffect, useState } from 'react'
import { AlertTriangle, Check, ChevronLeft, ChevronRight, CircleHelp, FlaskConical, Gauge, MessageSquareText, Sigma, SlidersHorizontal, X } from 'lucide-react'
import type { Chapter } from '../courseData'

type Props = {
  chapters: Chapter[]
  tone: 'llm' | 'image'
  onOpenLab: () => void
}

export default function CourseTrack({ chapters, tone, onOpenLab }: Props) {
  const [active, setActive] = useState(0)
  const [answer, setAnswer] = useState<boolean | null>(null)
  const chapter = chapters[active]

  useEffect(() => {
    setAnswer(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [active])

  return (
    <section className={`course-shell ${tone}`} aria-label={`${tone === 'llm' ? 'LLM' : '图像生成'}课程`}>
      <aside className='chapter-rail'>
        <div className='rail-head'>
          <span className='eyebrow'>{tone === 'llm' ? 'TRACK A' : 'TRACK B'}</span>
          <h2>{tone === 'llm' ? 'LLM 系统课' : '图像生成系统课'}</h2>
          <p>7 章 · 概念、公式、参数、评审与失败模式</p>
        </div>
        <div className='rail-list'>
          {chapters.map((item, index) => (
            <button key={item.id} className={index === active ? 'active' : ''} onClick={() => setActive(index)}>
              <span>{item.no}</span>
              <div><strong>{item.title}</strong><small>{index < active ? '已浏览' : index === active ? '正在学习' : '待学习'}</small></div>
              {index < active && <Check size={15} />}
            </button>
          ))}
        </div>
      </aside>

      <article className='chapter-content'>
        <div className='chapter-hero'>
          <div>
            <span className='chapter-index'>CHAPTER {chapter.no} / 07</span>
            <h1>{chapter.title}</h1>
            <p>{chapter.subtitle}</p>
          </div>
          <div className='chapter-orbit' aria-hidden='true'>
            <span>{tone === 'llm' ? 'P(t)' : 'zₜ'}</span>
            <i />
          </div>
        </div>

        <div className='lesson-grid'>
          <section className='lesson-card concept-card'>
            <div className='lesson-title'><FlaskConical size={18} /><span>核心概念</span></div>
            <p>{chapter.concept}</p>
          </section>
          <section className='lesson-card formula-card'>
            <div className='lesson-title'><Sigma size={18} /><span>最小必要公式</span></div>
            <code>{chapter.formula}</code>
            <small>公式用于建立参数直觉，不要求手工推导。</small>
          </section>
          <section className='lesson-card'>
            <div className='lesson-title'><SlidersHorizontal size={18} /><span>产品可控参数</span></div>
            <div className='tag-cloud'>{chapter.controls.map((item) => <span key={item}>{item}</span>)}</div>
          </section>
          <section className='lesson-card'>
            <div className='lesson-title'><MessageSquareText size={18} /><span>需求 / 评审追问</span></div>
            <ul className='check-list'>{chapter.questions.map((item) => <li key={item}><CircleHelp size={15} />{item}</li>)}</ul>
          </section>
          <section className='lesson-card failure-card'>
            <div className='lesson-title'><AlertTriangle size={18} /><span>常见失败模式</span></div>
            <ul>{chapter.failures.map((item, index) => <li key={item}><b>0{index + 1}</b>{item}</li>)}</ul>
          </section>
          <section className='lesson-card quiz-card'>
            <div className='lesson-title'><Gauge size={18} /><span>即时判断</span></div>
            <p className='quiz-statement'>{chapter.quiz.statement}</p>
            <div className='quiz-actions'>
              <button onClick={() => setAnswer(true)}><Check size={16} />正确</button>
              <button onClick={() => setAnswer(false)}><X size={16} />错误</button>
            </div>
            {answer !== null && (
              <div className={`quiz-result ${answer === chapter.quiz.answer ? 'correct' : 'incorrect'}`} role='status'>
                <strong>{answer === chapter.quiz.answer ? '判断正确' : '再想一步'}</strong>
                <span>{chapter.quiz.explanation}</span>
              </div>
            )}
          </section>
        </div>

        <div className='chapter-footer'>
          <button disabled={active === 0} onClick={() => setActive((v) => v - 1)}><ChevronLeft size={17} />上一章</button>
          <button className='lab-jump' onClick={onOpenLab}>去互动实验室 <FlaskConical size={17} /></button>
          <button disabled={active === chapters.length - 1} onClick={() => setActive((v) => v + 1)}>下一章<ChevronRight size={17} /></button>
        </div>
      </article>
    </section>
  )
}
