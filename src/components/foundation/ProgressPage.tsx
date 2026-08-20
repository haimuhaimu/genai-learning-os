import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Home, RotateCcw, Route, TrendingUp, TriangleAlert } from 'lucide-react'
import { foundationNodes, phaseNames, type FoundationNode } from '../../foundationData'
import type { AgentBookLabId, AgentBookReviewId } from '../../agentBookData'
import {
  agentBookChapters,
  agentBookLabIds,
  agentBookReviewIds,
  agentBookLabProgressKey,
  agentBookReviewProgressKey,
  chapterProgressKey,
} from '../../agentBookData'
import { PERSONA_CHANGE_EVENT, readPersona, type PersonaId } from '../../learningPath'
import { clearProgress, progressPercent, readProgress, stageLabels, type LearningStage, type ProgressMap } from '../../progress'
import NextStepCard from './NextStepCard'
import ProgressTransfer from './ProgressTransfer'
import StrategyEvidenceSection from './StrategyEvidenceSection'

type Go = (page: string, options?: Record<string, string>) => void

function countDone(progress: ProgressMap, ids: string[], threshold: LearningStage) {
  return ids.filter((id) => (progress[id] ?? 0) >= threshold).length
}

export default function ProgressPage({ go }: { go: Go }) {
  const [progress, setProgress] = useState<ProgressMap>(() => readProgress())
  const [persona, setPersona] = useState<PersonaId>(() => readPersona())
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    const sync = () => setProgress(readProgress())
    const syncPersona = () => setPersona(readPersona())
    window.addEventListener('genai-progress-change', sync)
    window.addEventListener(PERSONA_CHANGE_EVENT, syncPersona)
    return () => {
      window.removeEventListener('genai-progress-change', sync)
      window.removeEventListener(PERSONA_CHANGE_EVENT, syncPersona)
    }
  }, [])

  const foundationTotal = progressPercent(progress, foundationNodes.map((node) => node.id))
  const weak = foundationNodes.filter((node) => (progress[node.id] ?? 0) > 0 && (progress[node.id] ?? 0) < 3)
  const phases = (Object.keys(phaseNames) as FoundationNode['phase'][]).map((phase) => {
    const nodes = foundationNodes.filter((node) => node.phase === phase)
    return { phase, nodes, percent: progressPercent(progress, nodes.map((node) => node.id)) }
  })

  const agentBookChapterKeys = useMemo(() => agentBookChapters.map((chapter) => chapterProgressKey(chapter.id)), [])
  const agentBookTotal = progressPercent(progress, agentBookChapterKeys)
  const agentBookNext = agentBookChapters.find((chapter) => (progress[chapterProgressKey(chapter.id)] ?? 0) < 4)
  const labKeys = useMemo(() => agentBookLabIds.map((id) => agentBookLabProgressKey(id as AgentBookLabId)), [])
  const reviewKeys = useMemo(() => agentBookReviewIds.map((id) => agentBookReviewProgressKey(id as AgentBookReviewId)), [])
  const labDone = countDone(progress, labKeys, 3)
  const reviewDone = countDone(progress, reviewKeys, 4)

  const reset = () => {
    if (!confirming) {
      setConfirming(true)
      return
    }
    if (!clearProgress()) {
      setConfirming(false)
      return
    }
    setProgress({})
    setConfirming(false)
  }

  const agentBookLabs = [
    { id: 'harness-diagnose', title: 'Harness 五要素诊断' },
    { id: 'kv-cache', title: 'KV Cache 反模式模拟' },
    { id: 'status-bar', title: 'Status Bar 沙盘' },
    { id: 'pass-at-k', title: 'Pass@k vs Pass^k' },
    { id: 'new-info-criterion', title: '多 Agent 新信息判据' },
    { id: 'evolution-router', title: '持续进化更新路由' },
  ]

  const agentBookReviews = [
    { id: 'refund-rubric', title: '退款 Rubric + veto' },
    { id: 'coding-min-tools', title: 'Coding 最小工具集' },
    { id: 'multi-agent-topology', title: '多 Agent 拓扑选择' },
    { id: 'kv-cache-scan', title: 'KV Cache 违规扫描' },
    { id: 'post-training-shape', title: '后训练：先形后神' },
  ]

  return (
    <section className='progress-page lo-progress-page'>
      <header className='lo-progress-heading'>
        <div><span>本机学习记录</span><h1>我的学习进度</h1><p>所有状态仅保存在本机 localStorage，由浏览内容、手算通过、进入实验与评审自检事件驱动。</p></div>
        <div className='lo-progress-actions'><button type='button' onClick={() => go('unified-map')}><Home />返回首页</button><button type='button' onClick={() => go('routes')}><Route />查看路线</button></div>
      </header>

      <NextStepCard progress={progress} persona={persona} go={go} compact />
      <StrategyEvidenceSection go={go} />

      <section className='lo-total-summary' aria-label='算法基础整体进度'>
        <div><span>整体进度</span><strong>{foundationTotal}%</strong></div>
        <p>算法基础路线共有 {foundationNodes.length} 个机制节点。每个节点依次浏览内容、通过手算、进入实验并完成评审。</p>
        <div className='lo-progress-stages' aria-hidden='true'>{[25, 50, 75, 100].map((mark) => <i key={mark} className={foundationTotal >= mark ? 'is-done' : ''} />)}</div>
      </section>

      <section className='lo-route-progress'>
        <header><span>路线进度</span><h2>算法基础分阶段记录</h2></header>
        <div className='phase-grid'>
          {phases.map((item) => (
            <article key={item.phase}>
              <span>阶段 {item.phase}</span><h2>{phaseNames[item.phase]}</h2><strong>{item.percent}%</strong>
              <i aria-hidden='true'><em style={{ width: `${item.percent}%` }} /></i>
              <div>{item.nodes.map((node) => <button type='button' key={node.id} onClick={() => go('foundation', { node: node.id })}><b>{node.code}</b><span>{node.title}</span><small>{stageLabels[(progress[node.id] ?? 0) as LearningStage]}</small></button>)}</div>
            </article>
          ))}
        </div>
      </section>

      <div className='progress-insights'>
        <article><TriangleAlert /><div><span>薄弱节点</span><h2>{weak.length ? `${weak.length} 个待补齐` : '暂无已识别薄弱项'}</h2><p>{weak.length ? weak.map((node) => node.title).join('、') : '开始节点学习后，系统会按阶段差距给出建议。'}</p></div></article>
        <article><TrendingUp /><div><span>状态规则</span><h2>浏览 → 手算 → 进入实验 → 评审</h2><p>状态只前进不倒退；可通过本地 JSON 手动迁移，无需后端。</p></div></article>
        <article><TrendingUp /><div><span>Agent Book</span><h2>硬核工程路线</h2><p>章节完成率：{agentBookTotal}% · 实验完成：{labDone}/{agentBookLabs.length} · 评审通过：{reviewDone}/{agentBookReviews.length}</p><button type='button' onClick={() => go('agent-book')}>进入 Agent Book<ArrowRight /></button></div></article>
      </div>

      <section className='lo-agent-progress'>
        <header><span>专题进度</span><h2>Agent Book 学习记录</h2></header>
        <div className='phase-grid lo-agent-grid'>
          <article><span>章节路线</span><h2>十章主线</h2><strong>{agentBookTotal}%</strong><i><em style={{ width: `${agentBookTotal}%` }} /></i><div>{agentBookChapters.map((chapter, index) => <button type='button' key={chapter.id} onClick={() => go('agent-book', { chapter: chapter.id })}><b>CH{index + 1}</b><span>{chapter.titleZh}</span><small>{stageLabels[(progress[chapterProgressKey(chapter.id)] ?? 0) as LearningStage]}</small></button>)}</div></article>
          <article><span>机制模拟</span><h2>实验</h2><strong>{labDone}/{agentBookLabs.length}</strong><i><em style={{ width: `${Math.round((labDone / agentBookLabs.length) * 100)}%` }} /></i><div>{agentBookLabs.map((lab) => <button type='button' key={lab.id} onClick={() => go('agent-book-lab', { experiment: lab.id })}><b>LAB</b><span>{lab.title}</span><small>{stageLabels[(progress[agentBookLabProgressKey(lab.id as AgentBookLabId)] ?? 0) as LearningStage]}</small></button>)}</div></article>
          <article><span>决策检查</span><h2>评审卡</h2><strong>{reviewDone}/{agentBookReviews.length}</strong><i><em style={{ width: `${Math.round((reviewDone / agentBookReviews.length) * 100)}%` }} /></i><div>{agentBookReviews.map((review) => <button type='button' key={review.id} onClick={() => go('agent-book-review')}><b>REV</b><span>{review.title}</span><small>{stageLabels[(progress[agentBookReviewProgressKey(review.id as AgentBookReviewId)] ?? 0) as LearningStage]}</small></button>)}</div></article>
          <article><span>下一章建议</span><h2>继续主线</h2><strong>{agentBookNext ? agentBookNext.id.toUpperCase() : 'OK'}</strong><i><em style={{ width: `${agentBookNext ? 45 : 100}%` }} /></i><div><button type='button' onClick={() => (agentBookNext ? go('agent-book', { chapter: agentBookNext.id }) : go('agent-book-review'))}><b>NEXT</b><span>{agentBookNext ? agentBookNext.titleZh : '去补齐评审卡'}</span><small>{agentBookNext ? '先读主张、概念、公式，再做实验' : '让章节达到“已评审”'}</small></button><button type='button' onClick={() => go('agent-book-lab', { experiment: 'kv-cache' })}><b>HOT</b><span>直接做：KV Cache 反模式模拟</span><small>Context Engineering 是全书最关键章</small></button></div></article>
        </div>
      </section>

      <ProgressTransfer />

      <div className={`reset-zone ${confirming ? 'confirming' : ''}`}><div><RotateCcw /><span><b>{confirming ? '确认清空全部本地进度？' : '清空本机进度'}</b><small>{confirming ? '此操作不可撤销。再次点击确认清空。' : '需要二次确认，避免误触。'}</small></span></div><button type='button' onClick={reset}>{confirming ? '再次点击，确认清空' : '开始清空'}</button>{confirming ? <button type='button' className='cancel' onClick={() => setConfirming(false)}>取消</button> : null}</div>
    </section>
  )
}
