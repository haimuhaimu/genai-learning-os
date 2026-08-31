import { useEffect, useState } from 'react'
import { AlertTriangle, Check, ChevronLeft, ChevronRight, CircleHelp, FlaskConical, Gauge, MessageSquareText, Sigma, SlidersHorizontal, X } from 'lucide-react'
import type { Chapter } from '../courseData'
import { markProgress } from '../progress'
import DeepPracticePanel from './course/DeepPracticePanel'
import { AttentionDilutionExperiment, ContextWindowExperiment, TokenFormatExperiment } from './course/ConceptExperiments'
import './CourseTrack.css'

type Props = {
  chapters: Chapter[]
  tone: 'llm' | 'image'
  initialChapter?: string
  onOpenLab: () => void
}

export default function CourseTrack({ chapters, tone, initialChapter, onOpenLab }: Props) {
  const initialIndex = Math.max(0, chapters.findIndex((item) => item.id === initialChapter))
  const [active, setActive] = useState(initialIndex)
  const [answer, setAnswer] = useState<boolean | null>(null)
  const chapter = chapters[active]

  useEffect(() => {
    const requested = chapters.findIndex((item) => item.id === initialChapter)
    if (requested >= 0) setActive(requested)
  }, [chapters, initialChapter])

  useEffect(() => {
    setAnswer(null)
    markProgress(chapter.id, 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [chapter.id])

  const goChapter = (next: number) => {
    const safeIndex = Math.max(0, Math.min(chapters.length - 1, next))
    setActive(safeIndex)
    const url = new URL(window.location.href)
    url.searchParams.set('chapter', chapters[safeIndex].id)
    window.history.replaceState({}, '', url)
  }

  return (
    <section className={`course-shell ${tone}`} aria-label={`${tone === 'llm' ? '大语言模型（LLM）' : '图像生成'}课程`}>
      <aside className='chapter-rail'>
        <div className='rail-head'>
          <span className='eyebrow'>{tone === 'llm' ? 'TRACK A' : 'TRACK B'}</span>
          <h2>{tone === 'llm' ? '大语言模型（LLM）系统课' : '图像生成系统课'}</h2>
          <p>{chapters.length} 章 · 概念、手算、迁移与评审</p>
        </div>
        <div className='rail-list'>
          {chapters.map((item, index) => (
            <button key={item.id} className={index === active ? 'active' : ''} onClick={() => goChapter(index)}>
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
            <span className='chapter-index'>CHAPTER {chapter.no} / {String(chapters.length).padStart(2, '0')}</span>
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
          {tone === 'llm' && chapter.id === 'llm-token' ? <section className='lesson-card experiment-card' style={{ gridColumn: '1 / -1' }}><div className='lesson-title'><FlaskConical size={18} /><span>先做实验，再解释</span></div><TokenFormatExperiment onRun={() => markProgress(chapter.id, 3)} /></section> : null}
          {tone === 'llm' && chapter.id === 'llm-attention' ? <section className='lesson-card experiment-card' style={{ gridColumn: '1 / -1' }}><div className='lesson-title'><FlaskConical size={18} /><span>先做实验，再解释</span></div><AttentionDilutionExperiment onRun={() => markProgress(chapter.id, 3)} /></section> : null}
          {tone === 'llm' && chapter.id === 'llm-context' ? <section className='lesson-card experiment-card' style={{ gridColumn: '1 / -1' }}><div className='lesson-title'><FlaskConical size={18} /><span>先做实验，再解释</span></div><ContextWindowExperiment onRun={() => markProgress(chapter.id, 3)} /></section> : null}
          <section className='lesson-card formula-card'>
            <div className='lesson-title'><Sigma size={18} /><span>最小必要公式</span></div>
            <code>{chapter.formula}</code>
            <small>先建立参数直觉，再在下方深度练习中亲手计算。</small>
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

        <DeepPracticePanel key={chapter.id} chapter={chapter} />

        <div className='chapter-footer'>
          <button disabled={active === 0} onClick={() => goChapter(active - 1)}><ChevronLeft size={17} />上一章</button>
          <button className='lab-jump' onClick={onOpenLab}>去互动实验室 <FlaskConical size={17} /></button>
          <button disabled={active === chapters.length - 1} onClick={() => goChapter(active + 1)}>下一章<ChevronRight size={17} /></button>
        </div>
      </article>
    </section>
  )
}
