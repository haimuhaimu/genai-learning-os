import { useEffect, useState } from 'react'
import { Activity, BrainCircuit, CircleDot, GitBranch, Network, Sigma, Workflow } from 'lucide-react'
import { markProgress } from '../../progress'
import { MoERouterLab, TransformerBlockLab } from './ArchitectureLabs'
import { GradientDescentLab, MLPForwardLab } from './OptimizationLabs'
import { KLDivergenceLab, SoftmaxCELab } from './ProbabilityLabs'
import OverconfidentCase from './overconfident/OverconfidentCase'

const labs = [
  { id: 'softmax-ce', code: 'A01', title: 'Softmax & Cross-Entropy', desc: 'logits、温度、概率、entropy 与 CE 手算', icon: Sigma, nodes: ['softmax', 'cross-entropy', 'probability'] },
  { id: 'kl-divergence', code: 'A02', title: 'KL / JS 分布比较', desc: '方向性、mode-covering 与 mode-seeking', icon: GitBranch, nodes: ['kl-divergence'] },
  { id: 'gradient-descent', code: 'A03', title: '梯度下降轨迹', desc: '收敛、震荡、发散与梯度爆炸', icon: Activity, nodes: ['gradient-descent'] },
  { id: 'mlp-forward', code: 'A04', title: 'MLP 前向与维度流', desc: '激活、参数量、死神经元与 FLOPs', icon: Workflow, nodes: ['linear-layer', 'activation', 'mlp'] },
  { id: 'transformer-block', code: 'A05', title: 'Transformer Block', desc: 'Pre/Post-LN、残差、token/channel mixing', icon: BrainCircuit, nodes: ['transformer-block'] },
  { id: 'moe-router', code: 'A06', title: 'MoE Router', desc: 'Top-k、capacity、负载、overflow 与通信', icon: Network, nodes: ['moe'] },
  { id: 'case-overconfident', code: 'A07', title: '一次上线策略，如何改变模型学到什么？', desc: '冷启动、作者触达与风险治理中的策略、反馈和训练数据', icon: CircleDot, nodes: [] },
]

type Go = (page: string, options?: Record<string, string>) => void

type Props = { initialExperiment?: string; initialCard?: string; nodeId?: string; go: Go }

export default function FoundationLabs({ initialExperiment, initialCard, nodeId, go }: Props) {
  const [active, setActive] = useState(initialExperiment && labs.some((lab) => lab.id === initialExperiment) ? initialExperiment : 'softmax-ce')
  useEffect(() => { if (initialExperiment && labs.some((lab) => lab.id === initialExperiment)) setActive(initialExperiment) }, [initialExperiment])
  const select = (id: string) => { setActive(id); go('foundation-lab', { experiment: id }) }
  const meta = labs.find((lab) => lab.id === active) ?? labs[0]
  useEffect(() => { meta.nodes.forEach((id) => { if (nodeId === id) markProgress(id, 3) }) }, [active, meta.nodes, nodeId])
  if (active === 'case-overconfident') return <OverconfidentCase go={go} initialScene={initialCard} />
  return (
    <section className='foundation-labs-page'>
      <header className='foundation-labs-head'><div><span>DETERMINISTIC ALGORITHM LAB</span><h1>算法训练实验室</h1><p>7 个真正互动实验：预测、动手、看结果，每次只解决一个问题。</p></div><aside><b>7 / 7</b><span>可运行实验</span></aside></header>
      <nav className='foundation-lab-tabs'>{labs.map(({ icon: Icon, ...lab }) => <button key={lab.id} className={active === lab.id ? 'active' : ''} onClick={() => select(lab.id)}><Icon /><span><small>{lab.code}</small><b>{lab.title}</b></span></button>)}</nav>
      <div className='foundation-lab-shell'>
        <header><div><span>{meta.code} · {meta.id}</span><h2>{meta.title}</h2><p>{meta.desc}</p></div><b className='deterministic-pill'>DETERMINISTIC</b></header>
        {active === 'softmax-ce' && <SoftmaxCELab nodeId={nodeId} />}
        {active === 'kl-divergence' && <KLDivergenceLab go={go} nodeId={nodeId} />}
        {active === 'gradient-descent' && <GradientDescentLab nodeId={nodeId} />}
        {active === 'mlp-forward' && <MLPForwardLab nodeId={nodeId} />}
        {active === 'transformer-block' && <TransformerBlockLab nodeId={nodeId} />}
        {active === 'moe-router' && <MoERouterLab go={go} nodeId={nodeId} />}
      </div>
      <div className='simulation-note'>机制级教学仿真 · 边界参数已校验 · 不代表任何商业模型内部实现或线上参数。</div>
    </section>
  )
}
