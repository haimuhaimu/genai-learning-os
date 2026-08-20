import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Database, GitBranch, GitCompareArrows, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react'
import { LabHead, RangeControl, SelectControl, Toggle } from './LoopAndToolLabs'

const baseSteps = [
  { id: 'S1', label: '解析目标与验收条件', deps: '—', risk: '低' },
  { id: 'S2', label: '检索来源 A / B', deps: 'S1', risk: '低' },
  { id: 'S3', label: '核验关键证据', deps: 'S2', risk: '低' },
  { id: 'S4', label: '创建运营任务', deps: 'S3', risk: '高' },
  { id: 'S5', label: '回读状态并汇总', deps: 'S4', risk: '中' },
]

export function PlannerExecutorLab() {
  const [mode, setMode] = useState<'static' | 'dynamic'>('dynamic')
  const [failure, setFailure] = useState('证据冲突')
  const [sideEffect, setSideEffect] = useState(true)
  const delta = failure === '无故障' ? 0 : failure === '步骤失败' ? 1 : 2
  const metrics = mode === 'static'
    ? { success: 88 - delta * 19, steps: 5, cost: .048, risk: sideEffect ? 31 + delta * 11 : 10, replans: 0 }
    : { success: 91 - delta * 5, steps: 5 + delta, cost: .056 + delta * .009, risk: sideEffect ? 15 + delta * 4 : 7, replans: delta }
  const plan = useMemo(() => {
    if (mode === 'static' || failure === '无故障') return baseSteps
    if (failure === '步骤失败') return [...baseSteps.slice(0, 3), { id: 'S3b', label: '切换备用来源并验证', deps: 'S3', risk: '低' }, ...baseSteps.slice(3)]
    if (failure === '证据冲突') return [...baseSteps.slice(0, 3), { id: 'S3b', label: '比较时效与来源优先级', deps: 'S2', risk: '中' }, { id: 'S3c', label: '收窄结论与标记置信度', deps: 'S3b', risk: '低' }, ...baseSteps.slice(3)]
    return [...baseSteps.slice(0, 3), { id: 'S3b', label: '冻结旧目标 / plan v1', deps: 'S2', risk: '中' }, { id: 'S3c', label: '按新目标生成 plan v2', deps: 'S3b', risk: '低' }, ...baseSteps.slice(3)]
  }, [mode, failure])

  return <div className='agent-lab-panel'>
    <LabHead kicker='LAB 03 · PLAN CONTROL' title='Planner / Executor Failure Lab' desc='对比静态计划与动态重规划：成功率收益必须扣除步骤、成本和副作用风险。' icon={<GitBranch />} />
    <div className='planner-toolbar'><div className='mode-switch'><button className={mode === 'static' ? 'active' : ''} onClick={() => setMode('static')}>Static plan</button><button className={mode === 'dynamic' ? 'active' : ''} onClick={() => setMode('dynamic')}>Dynamic replan</button></div><SelectControl label='注入事件' value={failure} options={['无故障', '步骤失败', '证据冲突', '目标变化']} onChange={setFailure} /><Toggle label='包含副作用步骤' checked={sideEffect} onChange={setSideEffect} /></div>
    <div className='dag-board'>
      {plan.map((step, index) => <div key={`${step.id}-${step.label}`} className={step.id.includes('b') || step.id.includes('c') ? 'inserted' : ''}><span>{step.id}</span><b>{step.label}</b><small>依赖 {step.deps} · 风险 {step.risk}</small>{index < plan.length - 1 && <i>→</i>}</div>)}
    </div>
    <div className='planner-results'>
      <MetricCard label='教学成功率' value={`${metrics.success}%`} good={metrics.success >= 80} /><MetricCard label='步骤数' value={`${metrics.steps}`} /><MetricCard label='总成本' value={`$${metrics.cost.toFixed(3)}`} /><MetricCard label='副作用风险' value={`${metrics.risk}%`} good={metrics.risk < 20} /><MetricCard label='Replan' value={`${metrics.replans}`} />
    </div>
    <div className='compare-table'><div><b>策略</b><b>故障处理</b><b>优势</b><b>主要代价</b></div><div className={mode === 'static' ? 'selected' : ''}><strong>Static</strong><span>按原计划继续或整单失败</span><span>可预测、便宜、易测试</span><span>证据/目标变化适应差</span></div><div className={mode === 'dynamic' ? 'selected' : ''}><strong>Dynamic</strong><span>冻结已完成副作用，局部插入节点</span><span>故障恢复与冲突处理更强</span><span>更多 token、步骤与行为方差</span></div></div>
    <div className='agent-insight'><GitCompareArrows /><p><b>决策摘要</b>{mode === 'dynamic' && failure !== '无故障' ? `已将“${failure}”转换为局部 plan patch；已完成副作用不会被重复执行，executor 仍需幂等。` : `当前策略不插入新步骤；若“${failure}”改变事实或目标，必须接受成功率下降或转人工。`}</p></div>
  </div>
}

const initialMemories = [
  { id: 1, text: '用户偏好每周一收到摘要', type: 'semantic', ttl: 90, confidence: 88, sensitive: '低', write: true, version: 1 },
  { id: 2, text: '本轮退款审批临时订单号 O-2088', type: 'working', ttl: 7, confidence: 98, sensitive: '中', write: true, version: 1 },
  { id: 3, text: '模型推测用户可能准备离职', type: 'episodic', ttl: 30, confidence: 32, sensitive: '高', write: false, version: 1 },
  { id: 4, text: '操作流程：发送消息前必须确认', type: 'procedural', ttl: 90, confidence: 100, sensitive: '低', write: true, version: 3 },
]
type Memory = typeof initialMemories[number]

export function MemoryGovernanceLab() {
  const [memories, setMemories] = useState<Memory[]>(initialMemories)
  const [days, setDays] = useState(30)
  const [compressed, setCompressed] = useState(false)
  const update = (id: number, patch: Partial<Memory>) => setMemories((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item))
  const written = memories.filter((m) => m.write)
  const stale = written.filter((m) => days > m.ttl).length
  const risky = written.filter((m) => m.sensitive === '高' || m.confidence < 50).length
  const staleRate = written.length ? stale / written.length * 100 : 0
  const precision = Math.max(42, 96 - staleRate * .55 - risky * 13 + (compressed ? -3 : 0))
  const pollution = Math.min(100, stale * 18 + risky * 32 + (compressed ? 5 : 0))

  return <div className='agent-lab-panel'>
    <LabHead kicker='LAB 04 · MEMORY LIFECYCLE' title='Memory Governance Lab' desc='决定什么值得写入、保存多久、如何更新与遗忘；不展示模型 scratchpad 或私有思维链。' icon={<Database />} />
    <div className='memory-toolbar'><div className='horizon-tabs'>{[7, 30, 90].map((v) => <button key={v} className={days === v ? 'active' : ''} onClick={() => setDays(v)}>模拟 {v} 天后</button>)}</div><Toggle label='摘要压缩' checked={compressed} onChange={setCompressed} /><button className='version-button' onClick={() => update(1, { text: '用户更新偏好：仅每月收到摘要', version: memories[0].version + 1, ttl: 90 })}><RefreshCw />更新偏好版本</button></div>
    <div className='memory-candidates'>
      {memories.map((item) => <article key={item.id} className={!item.write ? 'rejected' : days > item.ttl ? 'stale' : ''}>
        <header><label><input type='checkbox' checked={item.write} onChange={(e) => update(item.id, { write: e.target.checked })} />{item.write ? '允许写入' : '拒绝写入'}</label><span>v{item.version}</span></header>
        <p>{compressed && item.write ? `摘要：${item.text.slice(0, 18)}…（保留约束与来源）` : item.text}</p>
        <div><SelectControl label='类型' value={item.type} options={['working', 'episodic', 'semantic', 'procedural']} onChange={(type) => update(item.id, { type })} /><SelectControl label='TTL' value={`${item.ttl}`} options={['7', '30', '90']} onChange={(ttl) => update(item.id, { ttl: +ttl })} /></div>
        <RangeControl label='置信度' value={item.confidence} min={0} max={100} step={1} suffix='%' onChange={(confidence) => update(item.id, { confidence })} />
        <SelectControl label='敏感级别' value={item.sensitive} options={['低', '中', '高']} onChange={(sensitive) => update(item.id, { sensitive })} />
        <footer>{!item.write ? <><Trash2 />不进入长期检索</> : days > item.ttl ? <><AlertTriangle />TTL 已过期，检索前删除/失效</> : <><CheckCircle2 />可检索，仍需 ACL 与新鲜度复核</>}</footer>
      </article>)}
    </div>
    <div className='memory-results'><MetricCard label='Memory stale rate' value={`${staleRate.toFixed(0)}%`} good={staleRate < 10} /><MetricCard label='Retrieval precision' value={`${precision.toFixed(0)}%`} good={precision >= 85} /><MetricCard label='Privacy risk' value={`${Math.min(100, risky * 34)} / 100`} good={risky === 0} /><MetricCard label='污染扩散' value={`${pollution.toFixed(0)} / 100`} good={pollution < 20} /></div>
    <div className='agent-insight warning'><ShieldAlert /><p><b>治理判断</b>{stale ? `${stale} 条记忆在 ${days} 天后过期，必须从主存、向量索引和缓存同步失效。` : `当前 ${days} 天窗口内无 TTL 过期。`} {risky ? `仍有 ${risky} 条高敏/低置信候选被写入，可能放大隐私与污染。` : '高敏和低置信候选已在写入门拦截。'}</p></div>
  </div>
}

function MetricCard({ label, value, good = false }: { label: string; value: string; good?: boolean }) {
  return <div className={good ? 'good' : ''}><span>{label}</span><b>{value}</b></div>
}
