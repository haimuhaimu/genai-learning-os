import { ArrowRight, BarChart3, Bot, BrainCircuit, CheckCircle2, Cpu, FlaskConical, Image, Network, Radar, ShieldCheck, Sigma, Workflow } from 'lucide-react'
import { expertImageModules, expertLLMModules } from '../expertData'
import { agentExpertModules } from '../agentExpertData'

type ExpertPage = 'expert-llm' | 'expert-image' | 'expert-agent' | 'expert-lab' | 'agent-lab' | 'handbook' | 'review'

type Props = { go: (page: ExpertPage, options?: { module?: string; experiment?: string }) => void }

const roadmap = [
  { stage: '01', title: '预算与架构', detail: 'Scaling、Dense/MoE、U-Net/DiT、VAE', icon: Cpu },
  { stage: '02', title: '训练与控制', detail: '对齐、位置外推、预测目标、条件控制', icon: BrainCircuit },
  { stage: '03', title: '推理与服务', detail: 'KV、批处理、量化、采样器与蒸馏', icon: Network },
  { stage: '04', title: '评估与上线', detail: 'SLO、故障归因、安全、实验与回滚', icon: Radar },
]

export default function ExpertHome({ go }: Props) {
  return <div className='expert-home'>
    <section className='expert-hero'>
      <div className='expert-grid-bg' />
      <div className='expert-hero-copy'>
        <div className='expert-label'><span>默认推荐</span>EXPERT SYSTEMS COURSE · 2026</div>
        <h1>生成模型<br /><em>生产系统手册</em></h1>
        <p>面向资深策略产品与模型产品：不背术语，直接围绕架构取舍、成本公式、指标日志、故障归因和上线决策训练评审能力。</p>
        <div className='expert-hero-actions'>
          <button onClick={() => go('expert-llm')}><Bot />进入 LLM 专家轨<ArrowRight /></button>
          <button className='violet' onClick={() => go('expert-image')}><Image />进入图像专家轨</button>
          <button className='agent-cta' onClick={() => go('expert-agent')}><Workflow />进入 Agent 系统轨</button>
          <button className='ghost' onClick={() => go('agent-lab')}><FlaskConical />打开 Agent Lab</button>
        </div>
        <div className='expert-proof'>
          <span><CheckCircle2 />31 个系统模块</span><span><CheckCircle2 />14 个互动实验</span><span><CheckCircle2 />全部估算标注假设</span>
        </div>
      </div>
      <div className='ops-console' aria-label='专家课程系统状态'>
        <header><span>MODEL SYSTEM REVIEW / LIVE</span><i /></header>
        <div className='ops-score'><small>READINESS INDEX</small><strong>86</strong><span>/ 100</span></div>
        <div className='ops-metrics'>
          <div><span>QUALITY</span><b>0.82</b><i style={{ width: '82%' }} /></div>
          <div><span>P95 TTFT</span><b>1.4s</b><i style={{ width: '65%' }} /></div>
          <div><span>TOKENS / $</span><b>+31%</b><i style={{ width: '74%' }} /></div>
          <div><span>SAFETY PASS</span><b>99.7%</b><i style={{ width: '92%' }} /></div>
        </div>
        <div className='ops-alert'><ShieldCheck /><span><b>上线闸门</b>质量置信区间通过；RAG 引用准确率仍需按长文切片复核。</span></div>
      </div>
    </section>

    <section className='expert-roadmap'>
      <div className='expert-section-title'><span>LEARNING MAP</span><h2>从模型机制，走到上线签字</h2><p>每个模块统一回答八个问题：公式是什么、系统怎么搭、约束在哪里、产品如何选、该看什么指标、如何失败、评审追问什么、案例怎样推演。</p></div>
      <div className='roadmap-line'>{roadmap.map(({ stage, title, detail, icon: Icon }) => <article key={stage}><i><Icon /></i><span>{stage}</span><h3>{title}</h3><p>{detail}</p></article>)}</div>
    </section>

    <section className='expert-tracks'>
      <article className='expert-track llm-track'>
        <header><div><Bot /><span>TRACK 01</span></div><b>{expertLLMModules.length} MODULES</b></header>
        <h2>LLM 系统架构与服务</h2><p>从 compute-optimal、MoE、长上下文到 KV/服务栈、后训练、RAG Agent、评估和安全。</p>
        <div className='module-matrix'>{expertLLMModules.map((item) => <button key={item.id} onClick={() => go('expert-llm', { module: item.id })}><span>{item.no}</span><b>{item.title}</b><ArrowRight /></button>)}</div>
        <button className='track-enter' onClick={() => go('expert-llm')}>打开 LLM 专家课程<ArrowRight /></button>
      </article>
      <article className='expert-track image-track'>
        <header><div><Image /><span>TRACK 02</span></div><b>{expertImageModules.length} MODULES</b></header>
        <h2>图像生成架构与生产链</h2><p>从 VAE、DiT、预测目标和 solver，到控制资产、高速生成、评估与多阶段工作流。</p>
        <div className='module-matrix'>{expertImageModules.map((item) => <button key={item.id} onClick={() => go('expert-image', { module: item.id })}><span>{item.no}</span><b>{item.title}</b><ArrowRight /></button>)}</div>
        <button className='track-enter' onClick={() => go('expert-image')}>打开图像专家课程<ArrowRight /></button>
      </article>
      <article className='expert-track agent-track'>
        <header><div><Workflow /><span>TRACK 03 · PREREQUISITE: LLM/RAG</span></div><b>{agentExpertModules.length} MODULES</b></header>
        <h2>Agent 系统：控制面、权限与上线</h2><p>建议先修 LLM 推理与 RAG。再进入状态机、工具契约、计划执行、记忆治理、安全、可观测性和上线闸门。</p>
        <div className='module-matrix'>{agentExpertModules.map((item) => <button key={item.id} onClick={() => go('expert-agent', { module: item.id })}><span>{item.no}</span><b>{item.title}</b><ArrowRight /></button>)}</div>
        <button className='track-enter' onClick={() => go('expert-agent')}>打开 Agent 系统课程<ArrowRight /></button>
      </article>
    </section>

    <section className='expert-assets'>
      <div className='asset-card lab-asset'><FlaskConical /><span>14 / LIVE LABS</span><h3>不是阅读题，是可操作的系统台</h3><p>除模型系统实验外，新增 8 个 Agent Lab：状态机、契约、计划、记忆、安全、拓扑、trace 与上线闸门。</p><button onClick={() => go('agent-lab')}>进入 Agent Lab<ArrowRight /></button></div>
      <div className='asset-card'><Sigma /><span>FORMULA HANDBOOK</span><h3>公式手册</h3><p>每条公式带变量、假设、使用时机与不能推出的结论。</p><button onClick={() => go('handbook')}>查公式<ArrowRight /></button></div>
      <div className='asset-card'><BarChart3 /><span>METRIC DICTIONARY</span><h3>生产指标词典</h3><p>不仅定义 TTFT、TPOT、goodput、FID 等，还说明异常意味着什么。</p><button onClick={() => go('handbook')}>查指标<ArrowRight /></button></div>
      <div className='asset-card'><Workflow /><span>LAUNCH REVIEW</span><h3>AI 创作助手沙盘</h3><p>分配质量、延迟、成本和安全预算，得到架构、SLA 与风险建议。</p><button onClick={() => go('review')}>开始评审<ArrowRight /></button></div>
    </section>

    <section className='expert-disclaimer'><ShieldCheck /><div><b>适用边界</b><p>全部内容讲解通用架构与教学估算，不代表任何具体商业模型的内部实现。性能估算取决于硬件、kernel、调度、模型实现与流量分布；上线前必须以真实模型、真实数据和真实压测复核。</p></div></section>
  </div>
}
