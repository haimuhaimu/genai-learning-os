import { useState } from 'react'
import { ArrowRight, Bot, Boxes, Check, Database, GitBranch, Image, SlidersHorizontal, Sparkles, Target, Wrench } from 'lucide-react'

type Solution = { name: string; icon: typeof Bot; use: string; avoid: string; scores: [number, number, number, number] }

const llmSolutions: Solution[] = [
  { name: '纯 LLM', icon: Bot, use: '开放写作、总结、改写；知识已在上下文或无需强事实性', avoid: '实时私域事实、确定性动作链', scores: [1, 4, 2, 2] },
  { name: 'RAG', icon: Database, use: '知识频繁更新、答案需引用、企业文档问答', avoid: '知识不可检索或任务主要是风格迁移', scores: [2, 3, 3, 4] },
  { name: '微调', icon: SlidersHorizontal, use: '稳定格式、专有行为/术语、规模化降低长提示', avoid: '只为补几条易变事实', scores: [4, 4, 4, 3] },
  { name: 'Agent', icon: Wrench, use: '需要规划、调用工具、跨系统完成多步任务', avoid: '低风险单轮问答或无法提供动作审计', scores: [4, 1, 2, 5] },
]
const imageSolutions: Solution[] = [
  { name: '文生图', icon: Sparkles, use: '从零探索创意、批量概念草图、构图约束较松', avoid: '必须复刻既有版式或姿态', scores: [1, 3, 1, 2] },
  { name: 'img2img', icon: Image, use: '保留原图大意后重绘、风格化、草图细化', avoid: '没有参考图或需严格结构锁定', scores: [2, 3, 3, 3] },
  { name: 'ControlNet', icon: GitBranch, use: '边缘、深度、姿态、构图必须可控', avoid: '只有风格一致性诉求', scores: [3, 2, 4, 5] },
  { name: 'LoRA', icon: Boxes, use: '可复用主体/风格资产，需规模化一致输出', avoid: '一次性需求或缺少合格训练素材', scores: [4, 3, 5, 4] },
]
const dimensions = ['成本', '延迟', '一致性', '可控性']

function ScoreDots({ value }: { value: number }) {
  return <div className='score-dots' aria-label={`${value} / 5`}>{[1, 2, 3, 4, 5].map((n) => <i className={n <= value ? 'on' : ''} key={n} />)}</div>
}

export default function ProductEvaluation() {
  const [track, setTrack] = useState<'llm' | 'image'>('llm')
  const solutions = track === 'llm' ? llmSolutions : imageSolutions
  return <section className='evaluation-page'>
    <div className='section-heading'><span className='eyebrow'>PRODUCT EVALUATION</span><h1>先选问题结构，再选模型方案</h1><p>以下分数是相对决策启发：成本 / 延迟分数越高代表负担越大；一致性 / 可控性越高代表能力越强。最终以你的流量、SLA 和样本评测为准。</p></div>
    <div className='evaluation-switch'><button className={track === 'llm' ? 'active llm' : ''} onClick={() => setTrack('llm')}><Bot />语言任务</button><button className={track === 'image' ? 'active image' : ''} onClick={() => setTrack('image')}><Image />图像任务</button></div>
    <div className={`decision-guide ${track}`}>
      <div className='decision-question'><Target /><div><small>第一问</small><strong>{track === 'llm' ? '任务需要“知道事实”还是“执行动作”？' : '需求要“探索画面”还是“锁定结构”？'}</strong></div></div>
      <ArrowRight />
      <div className='decision-branches'>
        {track === 'llm' ? <><span>仅生成 → 纯 LLM</span><span>外部知识 → RAG</span><span>稳定行为 → 微调</span><span>跨系统动作 → Agent</span></> : <><span>从零探索 → 文生图</span><span>参考重绘 → img2img</span><span>锁定结构 → ControlNet</span><span>沉淀风格 → LoRA</span></>}
      </div>
    </div>
    <div className={`comparison-table ${track}`}>
      <div className='comparison-head'><span>方案与适用边界</span>{dimensions.map((item) => <b key={item}>{item}</b>)}</div>
      {solutions.map(({ name, icon: Icon, use, avoid, scores }) => <div className='comparison-row' key={name}>
        <div className='solution-name'><i><Icon size={20} /></i><div><strong>{name}</strong><p><span><Check size={13} />适合</span>{use}</p><p><span className='avoid'>× 避免</span>{avoid}</p></div></div>
        {scores.map((score, i) => <div className='score-cell' key={dimensions[i]}><small>{dimensions[i]}</small><ScoreDots value={score} /></div>)}
      </div>)}
    </div>
    <div className='review-checklist'>
      <div><span className='eyebrow'>REVIEW CARD</span><h2>立项评审前的 8 个硬问题</h2><p>如果答不清，先不要讨论“换更大的模型”。</p></div>
      <ol>
        <li><b>01</b><span>成功标准是什么？</span><small>任务成功率、质量 rubric 与失败阈值</small></li>
        <li><b>02</b><span>知识从哪里来？</span><small>参数、上下文、RAG 还是工具返回</small></li>
        <li><b>03</b><span>哪类控制最关键？</span><small>提示、结构输入、权重或工作流</small></li>
        <li><b>04</b><span>失败如何被发现？</span><small>自动检测、人审、引用与可观测性</small></li>
        <li><b>05</b><span>P95 延迟预算？</span><small>首 token、总耗时、采样步数与工具链</small></li>
        <li><b>06</b><span>单位有效结果成本？</span><small>单次调用 × 重试 + 审核 / 后处理</small></li>
        <li><b>07</b><span>版本变更如何回归？</span><small>固定评测集、切片、灰度与回滚</small></li>
        <li><b>08</b><span>风险责任在哪里？</span><small>隐私、安全、版权、肖像与动作权限</small></li>
      </ol>
    </div>
  </section>
}
