import { useEffect, useState } from 'react'
import { ArrowRight, BookOpen, BrainCircuit, Calculator, CheckCircle2, Cpu, FlaskConical, Image as ImageIcon, Network, Sparkles } from 'lucide-react'
import { foundationNodeSummaries, foundationProgressIds } from '../../content/foundationSummary'
import { getK3Entry, isK3StepDone, isK3StepUnlocked, K3_COURSE_STEPS } from '../../content/k3Summary'
import { getPersona, personas, readPersona, savePersona, type PersonaId } from '../../learningPath'
import { progressPercent, PROGRESS_CHANGE_EVENT, readProgress, stageLabels, type ProgressMap } from '../../progress'
import { goldenPaperLabs } from '../paperLabs/paperLabsRegistry'
import { getPaperLessonSummary } from '../paperLabs/shared/paperLessonProgress'
import { usePaperLessonProgressMap } from '../paperLabs/shared/usePaperLessonProgressMap'
import NextStepCard from './NextStepCard'
import { JourneyEntry } from '../journey/JourneyNavigation'

const modelShowcase = new URL('../../assets/genai-model-blue-v1.png', import.meta.url).href

type Go = (page: string, options?: Record<string, string>) => void

const routes = [
  { label: '算法基础', page: 'foundation', icon: Sparkles, note: '11 个机制节点' },
  { label: 'AI 决策数学', page: 'decision-math', icon: Calculator, note: '8 个策略练习' },
  { label: 'LLM 系统', page: 'expert-llm', icon: BrainCircuit, note: '架构到服务' },
  { label: 'Agent 系统', page: 'expert-agent', icon: Network, note: '可控任务闭环' },
  { label: 'Agent Book', page: 'agent-book', icon: BookOpen, note: '硬核工程路线' },
  { label: '模型蒸馏', page: 'distill-course', icon: FlaskConical, note: '能力到部署' },
]

const k3Icons = [BrainCircuit, Cpu, Calculator, Sparkles, Network, FlaskConical]

function K3HeroCard({ progress, go }: { progress: ProgressMap; go: Go }) {
  const completed = K3_COURSE_STEPS.filter(({ id }) => isK3StepDone(progress, id)).length
  const next = getK3Entry(progress).step
  const nextIndex = K3_COURSE_STEPS.findIndex(({ id }) => id === next)
  return (
    <aside className='lo-hero-path' aria-label={`个人模型搭建进度 ${completed}/6`}>
      <header>
        <span>K3 BUILD LAB</span>
        <b>{completed === 6 ? '六关操作已记录' : '看懂模型工作的六个小实验'}</b>
      </header>
      <div className='lo-hero-path-list'>
        {K3_COURSE_STEPS.map(({ id, title, lead }, index) => {
          const done = isK3StepDone(progress, id)
          const unlocked = isK3StepUnlocked(progress, id)
          const Icon = k3Icons[index]
          return <button key={id} type='button' aria-label={`${title}：${done ? '已完成操作，可复习' : unlocked ? '可开始' : '待解锁，查看前置关卡'}`} onClick={() => go('k3-build-lab', { section: 'build', experiment: id })}><i>{done ? <CheckCircle2 aria-label='已完成' /> : index + 1}</i><Icon aria-hidden='true' /><span><b>{title}</b><small>{unlocked ? lead : '待解锁 · 先完成前面的实验'}</small></span><ArrowRight aria-hidden='true' /></button>
        })}
      </div>
      <footer><span>{completed === 6 ? '记录完成 ≠ 通过能力评测' : `下一关：${K3_COURSE_STEPS[nextIndex].title}`}</span><button type='button' onClick={() => go('k3-build-lab', { section: 'build', experiment: next })}>{completed === 6 ? '复习六关' : completed ? `继续第 ${nextIndex + 1} 关` : '开始第 1 关'}</button></footer>
    </aside>
  )
}

export default function UnifiedMap({ go }: { go: Go }) {
  const [persona, setPersona] = useState<PersonaId>(() => readPersona())
  const [progress, setProgress] = useState<ProgressMap>(() => readProgress())
  const profile = getPersona(persona)
  const total = progressPercent(progress, foundationProgressIds)
  const caseProgress = usePaperLessonProgressMap()
  const caseSummary = getPaperLessonSummary(caseProgress, goldenPaperLabs.map((lab) => lab.paperId))
  const nextCase = goldenPaperLabs.find((lab) => lab.paperId === caseSummary.nextId) ?? goldenPaperLabs[0]

  useEffect(() => {
    const sync = () => setProgress(readProgress())
    window.addEventListener(PROGRESS_CHANGE_EVENT, sync)
    return () => window.removeEventListener(PROGRESS_CHANGE_EVENT, sync)
  }, [])

  const choosePersona = (id: PersonaId) => {
    setPersona(id)
    savePersona(id)
  }

  return (
    <section className='lo-home'>
      <div className='lo-home-hero'>
        <div className='lo-hero-copy'>
          <h1>从读懂 2.8T，<br /><em>到搭出自己的模型</em></h1>
          <p>以 Kimi K3 真实参数为起点，跑通架构、显存、推理、API 与评测。</p>
          <div className='lo-hero-actions'>
            <button type='button' onClick={() => go('k3-build-lab')}><Cpu />开始搭建<ArrowRight /></button>
            <button type='button' className='is-secondary' onClick={() => go('routes')}>浏览全部路线</button>
          </div>
        </div>
        <figure className='lo-model-showcase'>
          <img src={modelShowcase} width={2020} height={779} alt='蓝白像素方块组成的模型模块示意，不代表真实 K3 架构' decoding='async' />
          <figcaption>模型搭建的像素示意</figcaption>
        </figure>
      </div>

      <section className='lo-model-roadmap' aria-label='模型搭建学习路线'>
        <K3HeroCard progress={progress} go={go} />
      </section>

      <JourneyEntry go={go} />

      <section className='lo-persona-section'>
        <header><div><span>按角色开始</span><h2>选择你的起点</h2></div><p>不改变课程内容，只改变你看到的第一步。选择会保存在本机。</p></header>
        <div className='lo-persona-grid' role='list'>
          {personas.map((item) => <button key={item.id} type='button' role='listitem' className={persona === item.id ? 'is-selected' : ''} onClick={() => choosePersona(item.id)}><span>{persona === item.id ? <CheckCircle2 /> : <i />}</span><b>{item.label}</b><small>{item.description}</small></button>)}
        </div>
        <div className='lo-persona-result'><span>为你推荐</span><p>{profile.startReason}</p><button type='button' onClick={() => go('foundation', { node: profile.startNode })}>从这里开始<ArrowRight /></button></div>
      </section>

      <section className='lo-mainline-section'>
        <header><div><span>章节式主线</span><h2>一条主线，一条并行支线</h2></div><button type='button' onClick={() => go('routes')}>查看全部路线<ArrowRight /></button></header>
        <div className='lo-mainline'>
          {routes.map(({ icon: Icon, ...route }, index) => <button type='button' key={route.page} onClick={() => go(route.page)}><i>第 {index + 1} 章</i><Icon /><span><b>{route.label}</b><small>{route.note}</small></span>{index < routes.length - 1 && <em>→</em>}</button>)}
        </div>
        <button type='button' className='lo-image-branch' onClick={() => go('expert-image')}><ImageIcon /><span><b>并行支线：图像生成</b><small>扩散、控制与生产评估，可在算法基础后随时进入</small></span><ArrowRight /></button>
      </section>

      <section className='lo-dashboard'>
        <div className='lo-dashboard-head'><span>你的学习桌面</span><h2>继续学习，不必重新找入口</h2></div>
        <NextStepCard progress={progress} persona={persona} go={go} />
        <article className='lo-progress-overview'>
          <header><div><span>算法基础进度</span><strong>{total}%</strong></div><button type='button' onClick={() => go('progress')}>查看完整进度<ArrowRight /></button></header>
          <div className='lo-progress-bar' aria-label={`算法基础进度 ${total}%`}><i style={{ width: `${total}%` }} /></div>
          <div className='lo-node-row'>{foundationNodeSummaries.map((node) => { const stage = progress[node.id] ?? 0; return <button type='button' key={node.id} className={`stage-${stage}`} title={`${node.code} ${node.title}：${stageLabels[stage]}`} onClick={() => go('foundation', { node: node.id })}><span>{node.code}</span><i /></button> })}</div>
        </article>
      </section>

      <section className='lo-loop-section'>
        <header><span>四步学习闭环</span><h2>我们不只讲概念</h2><p>每个核心节点都要经过四次转换，才从“知道”变成“会判断”。</p></header>
        <div>{[
          ['1', '浏览', '建立机制直觉与边界'],
          ['2', '手算', '算清关键变量与量级'],
          ['3', '进入实验', '改变参数并观察结果'],
          ['4', '评审', '用证据做上线判断'],
        ].map(([index, title, text]) => <article key={index}><span>{index}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className='lo-book-feature'>
        <div><span>CASE ACADEMY</span><h2>通过 Case 学 AI</h2><p>七门五关黄金课：先做业务判断，再用一个旋钮找到规律，最后才揭示论文术语。</p><button type='button' onClick={() => go('paper-lab', caseSummary.completed === caseSummary.total ? {} : { paper: nextCase.paperId })}>{caseSummary.completed === caseSummary.total ? '回目录复习' : caseSummary.completed || caseProgress[nextCase.paperId] ? '继续学习' : '开始第一课'}<ArrowRight /></button></div>
        <aside><BookOpen aria-hidden='true' /><b>{caseSummary.completed}/{caseSummary.total}</b><span>已通关</span><i /><p>支持刷新续学和通关复习</p></aside>
      </section>

      <section className='lo-book-feature'>
        <div><span>深入专题</span><h2>从会用 Agent，<br />到会设计可靠系统</h2><p>深入 Context Engineering、Harness、评估口径与持续进化，让 Agent 工程判断可验证、可回滚。</p><button type='button' onClick={() => go('agent-book')}>进入 Agent Book<ArrowRight /></button></div>
        <aside><BookOpen /><b>10</b><span>章系统路线</span><i /><p>课程 · 6 个实验 · 5 张评审卡</p></aside>
      </section>

      <p className='lo-boundary-note'>所有公式、估算和实验结果均为机制级教学仿真，不代表任何商业模型实现；生产判断请以目标模型、真实日志与压测为准。</p>
    </section>
  )
}
