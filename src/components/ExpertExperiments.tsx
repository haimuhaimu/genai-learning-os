import { useEffect, useState } from 'react'
import { Activity, BrainCircuit, Calculator, GitCompareArrows, Image, Network, Rocket, SlidersHorizontal, Stethoscope } from 'lucide-react'
import { AlignmentWorkbench, AttentionComplexityLab, KVServiceLab, RAGDoctor, TrafficCurve } from './LLMExpertLabs'
import { ControlSelector, DiffusionFlowLab, ImagePipelineSummary } from './ImageExpertLabs'

const labs = [
  { id: 'kv-cost', label: 'KV / 服务成本', category: 'LLM SERVING', icon: Calculator },
  { id: 'attention-scale', label: 'Attention 复杂度', category: 'LLM ARCH', icon: Network },
  { id: 'alignment', label: '对齐方法', category: 'POST-TRAIN', icon: GitCompareArrows },
  { id: 'rag-doctor', label: 'RAG 诊断', category: 'RAG / AGENT', icon: Stethoscope },
  { id: 'diffusion-flow', label: 'Diffusion / Flow', category: 'IMAGE MODEL', icon: Image },
  { id: 'control-selector', label: '可控生成选型', category: 'IMAGE CONTROL', icon: SlidersHorizontal },
]

export default function ExpertExperiments({ initialExperiment, onOpenReview }: { initialExperiment?: string; onOpenReview: () => void }) {
  const validInitial = initialExperiment && labs.some((item) => item.id === initialExperiment) ? initialExperiment : 'kv-cost'
  const [active, setActive] = useState(validInitial)

  useEffect(() => {
    if (initialExperiment && labs.some((item) => item.id === initialExperiment)) setActive(initialExperiment)
  }, [initialExperiment])

  const open = (id: string) => {
    setActive(id)
    const url = new URL(window.location.href)
    url.searchParams.set('experiment', id)
    window.history.replaceState({}, '', url)
    window.scrollTo({ top: 160, behavior: 'smooth' })
  }

  return <section className='expert-labs-page'>
    <div className='expert-labs-hero'>
      <div><span>EXPERT INTERACTIVE LABS</span><h1>系统决策控制台</h1><p>输入架构参数、故障症状或业务约束，获得实时公式、指标和评审建议。估算均显式标注假设。</p></div>
      <div className='lab-health'><Activity /><span><b>6</b> LIVE LABS</span><i /></div>
    </div>
    <div className='expert-lab-nav'>{labs.map(({ id, label, category, icon: Icon }) => <button key={id} className={active === id ? 'active' : ''} onClick={() => open(id)}><Icon /><span><small>{category}</small><b>{label}</b></span></button>)}<button className='review-tab' onClick={onOpenReview}><Rocket /><span><small>LAUNCH REVIEW</small><b>上线沙盘</b></span></button></div>
    {active === 'kv-cost' && <><KVServiceLab /><TrafficCurve /></>}
    {active === 'attention-scale' && <AttentionComplexityLab />}
    {active === 'alignment' && <AlignmentWorkbench />}
    {active === 'rag-doctor' && <RAGDoctor />}
    {active === 'diffusion-flow' && <><DiffusionFlowLab /><ImagePipelineSummary /></>}
    {active === 'control-selector' && <ControlSelector />}
    <div className='expert-lab-boundary'><BrainCircuit /><div><b>教学估算边界</b><p>实验不调用真实模型，也不代表任何具体商业模型实现。公式用于建立数量级和 trade-off 直觉；性能、质量与成本必须用目标模型、硬件、流量分布和业务评测集复核。</p></div></div>
  </section>
}
