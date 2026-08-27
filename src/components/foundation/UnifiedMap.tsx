import { useEffect, useState } from 'react'
import { ArrowRight, BookOpen, BrainCircuit, Calculator, CheckCircle2, Cpu, FlaskConical, Image as ImageIcon, Network, Sparkles } from 'lucide-react'
import { foundationNodeSummaries, foundationProgressIds } from '../../content/foundationSummary'
import { getPersona, personas, readPersona, savePersona, type PersonaId } from '../../learningPath'
import { progressPercent, PROGRESS_CHANGE_EVENT, readProgress, stageLabels, type ProgressMap } from '../../progress'
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

const k3BuildSteps = [
  ['goal', '写清任务', '定义输入、输出和失败标准', BrainCircuit],
  ['runtime', '准备环境', '安装 Python 与推理框架', Cpu],
  ['model', '选择模型', '从 0.5B 到 7B 起步', Calculator],
  ['infer', '完成推理', '记录输出、耗时与内存', Sparkles],
  ['api', '封装 API', '把模型变成可调用接口', Network],
  ['evaluate', '建立评测', '用 10 条样本检查结果', FlaskConical],
] as const

function K3HeroCard({ progress, go }: { progress: ProgressMap; go: Go }) {
  const completed = k3BuildSteps.filter(([id]) => (progress[`k3:build:${id}`] ?? 0) >= 4).length
  const nextStep = k3BuildSteps.find(([id]) => (progress[`k3:build:${id}`] ?? 0) < 4)?.[1]
  return (
    <aside className='lo-hero-path' aria-label={`个人模型搭建进度 ${completed}/6`}>
      <header>
        <span>K3 BUILD LAB</span>
        <b>{completed === 6 ? '你的模型闭环已经跑通' : '搭出你的第一台模型'}</b>
      </header>
      <div className='lo-hero-path-list'>
        {k3BuildSteps.map(([id, label, note, Icon], index) => {
          const done = (progress[`k3:build:${id}`] ?? 0) >= 4
          return <button key={id} type='button' onClick={() => go('k3-build-lab', { section: 'build' })}><i>{done ? <CheckCircle2 aria-label='已完成' /> : index + 1}</i><Icon aria-hidden='true' /><span><b>{label}</b><small>{note}</small></span><ArrowRight aria-hidden='true' /></button>
        })}
      </div>
      <footer><span>{completed === 6 ? '成果：模型闭环已跑通' : `下一步：${nextStep}`}</span><button type='button' onClick={() => go('k3-build-lab')}>{completed ? '继续搭建' : '开始搭建'}</button></footer>
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
        <K3HeroCard progress={progress} go={go} />
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
