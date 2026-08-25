import { useEffect, useState } from 'react'
import { ArrowRight, BookOpen, BrainCircuit, Calculator, CheckCircle2, FlaskConical, Image as ImageIcon, Network, Sparkles } from 'lucide-react'
import { foundationNodes } from '../../foundationData'
import { getNextStep, getPersona, personas, readPersona, savePersona, type PersonaId } from '../../learningPath'
import { progressPercent, readProgress, stageLabels, type ProgressMap } from '../../progress'
import { goldenPaperLabs } from '../paperLabs/paperLabsRegistry'
import { getPaperLessonSummary } from '../paperLabs/shared/paperLessonProgress'
import { usePaperLessonProgressMap } from '../paperLabs/shared/usePaperLessonProgressMap'
import NextStepCard from './NextStepCard'

type Go = (page: string, options?: Record<string, string>) => void

const routes = [
  { label: '算法基础', page: 'foundation', icon: Sparkles, note: '11 个机制节点' },
  { label: 'AI 决策数学', page: 'decision-math', icon: Calculator, note: '8 个策略练习' },
  { label: 'LLM 系统', page: 'expert-llm', icon: BrainCircuit, note: '架构到服务' },
  { label: 'Agent 系统', page: 'expert-agent', icon: Network, note: '可控任务闭环' },
  { label: 'Agent Book', page: 'agent-book', icon: BookOpen, note: '硬核工程路线' },
  { label: '模型蒸馏', page: 'distill-course', icon: FlaskConical, note: '能力到部署' },
]

function HeroRouteMap({ go }: { go: Go }) {
  return (
    <aside className='lo-hero-path' aria-label='可交互学习路径'>
      <header>
        <span>建议学习顺序</span>
        <b>从机制基础走向可靠系统</b>
      </header>
      <div className='lo-hero-path-list'>
        {routes.map(({ icon: Icon, ...route }, index) => (
          <button key={route.page} type='button' onClick={() => go(route.page)}>
            <i>{index + 1}</i>
            <Icon aria-hidden='true' />
            <span><b>{route.label}</b><small>{route.note}</small></span>
            <ArrowRight aria-hidden='true' />
          </button>
        ))}
      </div>
      <button className='lo-hero-branch' type='button' onClick={() => go('expert-image')}>
        <ImageIcon aria-hidden='true' />
        <span><b>并行支线：图像生成</b><small>算法基础后可随时进入</small></span>
        <ArrowRight aria-hidden='true' />
      </button>
      <footer><span>九条路线按能力目标组织</span><button type='button' onClick={() => go('routes')}>查看路线全图</button></footer>
    </aside>
  )
}

export default function UnifiedMap({ go }: { go: Go }) {
  const [persona, setPersona] = useState<PersonaId>(() => readPersona())
  const [progress, setProgress] = useState<ProgressMap>(() => readProgress())
  const profile = getPersona(persona)
  const total = progressPercent(progress, foundationNodes.map((node) => node.id))
  const next = getNextStep(progress, persona)
  const caseProgress = usePaperLessonProgressMap()
  const caseSummary = getPaperLessonSummary(caseProgress, goldenPaperLabs.map((lab) => lab.paperId))
  const nextCase = goldenPaperLabs.find((lab) => lab.paperId === caseSummary.nextId) ?? goldenPaperLabs[0]

  useEffect(() => {
    const sync = () => setProgress(readProgress())
    window.addEventListener('genai-progress-change', sync)
    return () => window.removeEventListener('genai-progress-change', sync)
  }, [])

  const choosePersona = (id: PersonaId) => {
    setPersona(id)
    savePersona(id)
  }

  return (
    <section className='lo-home'>
      <div className='lo-home-hero'>
        <div className='lo-hero-copy'>
          <h1>通过产品决策，<br /><em>学会理解 AI</em></h1>
          <p>Strategy-first AI Learning：先选择策略、权衡业务代价，再回到算法机制与反馈闭环。</p>
          <div className='lo-hero-actions'>
            <button type='button' onClick={() => go('strategy-cases')}>进入策略案例（Case）中心<ArrowRight /></button>
            <button type='button' className='is-secondary' onClick={() => go('routes')}>选择学习路线</button>
            <button type='button' className='is-secondary' onClick={() => go(next.page, next.options)}>继续上次学习</button>
          </div>
          <p className='lo-hero-facts'>做决策 → 看证据 → 算代价 → 找反馈；九条路线共用同一套 Strategy Case 协议。</p>
        </div>
        <HeroRouteMap go={go} />
      </div>

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
          <div className='lo-node-row'>{foundationNodes.map((node) => { const stage = progress[node.id] ?? 0; return <button type='button' key={node.id} className={`stage-${stage}`} title={`${node.code} ${node.title}：${stageLabels[stage]}`} onClick={() => go('foundation', { node: node.id })}><span>{node.code}</span><i /></button> })}</div>
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
