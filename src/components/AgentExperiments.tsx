import { useEffect, useState } from 'react'
import { Activity, BrainCircuit, GitBranch, MemoryStick, Network, Radar, Rocket, ShieldCheck, Workflow, Wrench } from 'lucide-react'
import { LoopSimulator, ToolContractLab } from './agent/LoopAndToolLabs'
import { MemoryGovernanceLab, PlannerExecutorLab } from './agent/PlannerMemoryLabs'
import { MultiAgentLab, SecurityGateLab } from './agent/SecurityMultiLabs'
import { LaunchGateLab, ObservabilityLab } from './agent/ObservabilityLaunchLabs'

const agentLabs = [
  { id: 'loop-simulator', label: 'Loop Simulator', category: 'STATE MACHINE', icon: Workflow },
  { id: 'tool-contract', label: 'Tool Contract', category: 'TOOL GATEWAY', icon: Wrench },
  { id: 'planner-executor', label: 'Planner / Executor', category: 'PLAN CONTROL', icon: GitBranch },
  { id: 'memory-governance', label: 'Memory Governance', category: 'MEMORY', icon: MemoryStick },
  { id: 'security-gate', label: 'Security Gate', category: 'ZERO TRUST', icon: ShieldCheck },
  { id: 'multi-agent', label: 'Multi-Agent', category: 'TOPOLOGY', icon: Network },
  { id: 'observability', label: 'Observability', category: 'TRACE', icon: Activity },
  { id: 'launch-gate', label: 'Launch Gate', category: 'RELEASE', icon: Rocket },
]

export default function AgentExperiments({ initialExperiment }: { initialExperiment?: string }) {
  const valid = initialExperiment && agentLabs.some((item) => item.id === initialExperiment) ? initialExperiment : 'loop-simulator'
  const [active, setActive] = useState(valid)

  useEffect(() => {
    if (initialExperiment && agentLabs.some((item) => item.id === initialExperiment)) setActive(initialExperiment)
  }, [initialExperiment])

  const open = (id: string) => {
    setActive(id)
    const url = new URL(window.location.href)
    url.searchParams.set('experiment', id)
    url.searchParams.delete('module')
    window.history.replaceState({}, '', url)
    window.scrollTo({ top: 140, behavior: 'smooth' })
  }

  return <section className='agent-labs-page'>
    <div className='agent-labs-hero'>
      <div><span>AGENT SYSTEMS · INTERACTIVE LAB</span><h1>从“会调用工具”<br />到<strong>可控地完成任务</strong></h1><p>8 个机制级系统实验，覆盖状态机、契约、计划、记忆、安全、多 Agent、可观测性与上线。所有结果均为前端规则计算，不调用真实模型或工具。</p></div>
      <div className='agent-lab-status'><Radar /><span><b>8 / 8</b> LABS ONLINE</span><i /></div>
    </div>
    <div className='agent-lab-shell'>
      <aside className='agent-lab-nav'><header><BrainCircuit /><span><b>AGENT CONTROL PLANE</b><small>选择实验 · 支持 URL 深链</small></span></header>{agentLabs.map(({ id, label, category, icon: Icon }, index) => <button key={id} className={active === id ? 'active' : ''} onClick={() => open(id)}><i>{String(index + 1).padStart(2, '0')}</i><Icon /><span><small>{category}</small><b>{label}</b></span></button>)}</aside>
      <main className='agent-lab-content'>
        {active === 'loop-simulator' && <LoopSimulator />}
        {active === 'tool-contract' && <ToolContractLab />}
        {active === 'planner-executor' && <PlannerExecutorLab />}
        {active === 'memory-governance' && <MemoryGovernanceLab />}
        {active === 'security-gate' && <SecurityGateLab />}
        {active === 'multi-agent' && <MultiAgentLab />}
        {active === 'observability' && <ObservabilityLab />}
        {active === 'launch-gate' && <LaunchGateLab />}
      </main>
    </div>
    <div className='agent-lab-boundary'><ShieldCheck /><div><b>实验边界</b><p>不执行用户输入，不调用真实模型、外部协议或业务工具，不代表任何商业 Agent 的内部实现。页面只展示结构化计划、动作、观察、验证、终止原因与决策摘要；数值用于机制教学，生产上线必须用真实系统回放与压测复核。</p></div></div>
  </section>
}
