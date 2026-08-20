import { useMemo, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, CircleDollarSign, Eye, FileCheck2, Rocket, ShieldCheck, XCircle } from 'lucide-react'
import { LabHead, SelectControl } from './LoopAndToolLabs'

const traceFields = [
  ['traceId/spanId', '复盘,归因,回放'], ['prompt version', '复盘,归因'], ['model route', '归因,计费'], ['tool args hash', '审计,回放'], ['ACL decision', '审计'], ['latency', '归因,计费'], ['token', '计费'], ['cost', '计费'], ['retry', '复盘,归因'], ['termination reason', '复盘,归因'], ['result checksum', '审计,回放'],
] as const
const capabilityNeeds: Record<string, string[]> = {
  '复盘': ['traceId/spanId', 'prompt version', 'retry', 'termination reason'],
  '归因': ['traceId/spanId', 'model route', 'latency', 'termination reason'],
  '审计': ['traceId/spanId', 'tool args hash', 'ACL decision', 'result checksum'],
  '计费': ['traceId/spanId', 'model route', 'token', 'cost'],
  '回放': ['traceId/spanId', 'prompt version', 'tool args hash', 'result checksum'],
}

export function ObservabilityLab() {
  const [selected, setSelected] = useState<Record<string, boolean>>(() => Object.fromEntries(traceFields.map(([name]) => [name, !['prompt version', 'ACL decision', 'result checksum'].includes(name)])))
  const capabilities = Object.entries(capabilityNeeds).map(([name, needs]) => ({ name, missing: needs.filter((field) => !selected[field]) }))
  const completeness = Math.round(Object.values(selected).filter(Boolean).length / traceFields.length * 100)
  const spans = [
    { name: 'agent.loop', start: 0, width: 100, ms: 2840 }, { name: 'retrieval.search', start: 4, width: 25, ms: 710 }, { name: 'model.plan', start: 31, width: 20, ms: 560 }, { name: 'tool.policy', start: 53, width: 7, ms: 190 }, { name: 'tool.execute', start: 61, width: 28, ms: 790 }, { name: 'verify.result', start: 90, width: 9, ms: 250 },
  ]

  return <div className='agent-lab-panel'>
    <LabHead kicker='LAB 07 · TRACE & REPLAY' title='Observability Trace Lab' desc='选择结构化字段，实时判断能否复盘、归因、审计、计费与安全回放。' icon={<Activity />} />
    <div className='observability-grid'>
      <section className='field-picker'><header>STRUCTURED EVENT FIELDS <b>{completeness}% 完整</b></header>{traceFields.map(([name]) => <label key={name}><input type='checkbox' checked={selected[name]} onChange={(e) => setSelected((old) => ({ ...old, [name]: e.target.checked }))} /><span>{name}</span><small>{traceFields.find(([n]) => n === name)?.[1]}</small></label>)}</section>
      <section className='capability-board'><header>DIAGNOSTIC READINESS</header>{capabilities.map((item) => <div key={item.name} className={item.missing.length ? 'missing' : 'ready'}>{item.missing.length ? <XCircle /> : <CheckCircle2 />}<p><b>{item.name}</b><small>{item.missing.length ? `缺少：${item.missing.join('、')}` : '字段充分，可以建立最小证据链'}</small></p></div>)}</section>
    </div>
    <section className='waterfall'><header><span>TRACE WATERFALL · trace_demo_8d21</span><b>2,840 ms</b></header>{spans.map((span, index) => <div key={span.name}><span>{span.name}</span><i><em style={{ marginLeft: `${span.start}%`, width: `${span.width}%` }} className={`tone-${index}`} /></i><b>{span.ms} ms</b></div>)}</section>
    <div className='event-table'><div><b>timestamp</b><b>spanId</b><b>node</b><b>decision / result</b><b>tokens</b><b>cost</b></div>{[
      ['10:00:01.042', 'sp-01', 'retrieval', '8 docs / ACL filtered 2', '—', '$0.002'],
      ['10:00:01.774', 'sp-02', 'model.plan', 'plan_v3 / 4 nodes', '812', '$0.014'],
      ['10:00:02.341', 'sp-03', 'tool.policy', selected['ACL decision'] ? 'ALLOW rule_17' : '字段缺失', '—', '$0.000'],
      ['10:00:03.118', 'sp-04', 'verify', selected['result checksum'] ? 'checksum OK' : '无法绑定结果', '126', '$0.002'],
    ].map((row) => <div key={row[1]}>{row.map((cell, i) => <span key={i}>{cell}</span>)}</div>)}</div>
    <div className='agent-insight'><Eye /><p><b>隐私边界</b>工具参数记录 hash 与脱敏结构，不记录凭证、完整 PII 或模型私有思维链。副作用回放必须走 sandbox / dry-run，不能重放真实发送或退款。</p></div>
  </div>
}

type GateKey = 'verified' | 'tool' | 'sideEffect' | 'asr' | 'refusal' | 'p95' | 'unitCost'
type GateMetric = { key: GateKey; label: string; unit: string; higher: boolean; min: number; max: number; step: number }
const gateMetrics: GateMetric[] = [
  { key: 'verified', label: 'Verified success', unit: '%', higher: true, min: 50, max: 100, step: 1 },
  { key: 'tool', label: 'Tool success', unit: '%', higher: true, min: 70, max: 100, step: 1 },
  { key: 'sideEffect', label: 'Side-effect correctness', unit: '%', higher: true, min: 80, max: 100, step: 1 },
  { key: 'asr', label: 'Injection ASR', unit: '%', higher: false, min: 0, max: 30, step: 1 },
  { key: 'refusal', label: 'Over-refusal', unit: '%', higher: false, min: 0, max: 30, step: 1 },
  { key: 'p95', label: 'p95 latency', unit: 's', higher: false, min: 1, max: 30, step: .5 },
  { key: 'unitCost', label: 'Unit cost', unit: '$', higher: false, min: .1, max: 8, step: .1 },
]
const defaults = {
  threshold: { verified: 85, tool: 96, sideEffect: 99, asr: 5, refusal: 12, p95: 8, unitCost: 2.8 },
  current: { verified: 82, tool: 97, sideEffect: 98, asr: 4, refusal: 9, p95: 7.5, unitCost: 2.4 },
}
const taskProfiles = {
  '高频低风险': { multiplier: 1, strategy: '先 shadow 全量，再按 5% → 25% → 50% canary；读工具可自动化。' },
  '低频高风险': { multiplier: .55, strategy: 'No side effect in shadow；canary 限内部账号、低额度，并保持逐次人审。' },
  '长链研究': { multiplier: .72, strategy: '按 loop depth 与工具失败切片；先放开只读工具，输出显式证据缺口。' },
}

export function LaunchGateLab() {
  const [task, setTask] = useState<keyof typeof taskProfiles>('低频高风险')
  const [threshold, setThreshold] = useState<Record<GateKey, number>>(defaults.threshold)
  const [current, setCurrent] = useState<Record<GateKey, number>>(defaults.current)
  const verdict = useMemo(() => {
    const rows = gateMetrics.map((metric) => {
      const pass = metric.higher ? current[metric.key] >= threshold[metric.key] : current[metric.key] <= threshold[metric.key]
      const gap = metric.higher ? current[metric.key] - threshold[metric.key] : threshold[metric.key] - current[metric.key]
      return { ...metric, pass, gap }
    })
    const failed = rows.filter((row) => !row.pass)
    const severe = rows.some((row) => !row.pass && (row.key === 'sideEffect' || row.key === 'asr') && Math.abs(row.gap) > 3)
    return { rows, failed, status: failed.length === 0 ? 'GO' : severe || failed.length >= 4 ? 'NO-GO' : 'HOLD' }
  }, [threshold, current])
  const profile = taskProfiles[task]
  const totalTasks = 1000
  const verifiedCompletions = Math.round(totalTasks * current.verified / 100 * profile.multiplier)
  const totalCost = totalTasks * current.unitCost * profile.multiplier
  const calculatedCost = totalCost / Math.max(1, verifiedCompletions)
  const weakest = [...verdict.rows].sort((a, b) => a.gap - b.gap)[0]

  return <div className='agent-lab-panel'>
    <LabHead kicker='LAB 08 · RELEASE CONTROL' title='Agent Launch Gate' desc='把成功、安全、副作用、延迟与成本同时放进上线闸门，而不是用单一平均分签字。' icon={<Rocket />} />
    <div className='launch-toolbar'><SelectControl label='任务分布' value={task} options={Object.keys(taskProfiles)} onChange={(v) => setTask(v as keyof typeof taskProfiles)} /><div className={`verdict ${verdict.status.toLowerCase()}`}>{verdict.status === 'GO' ? <CheckCircle2 /> : verdict.status === 'HOLD' ? <AlertTriangle /> : <XCircle />}<p><small>LAUNCH DECISION</small><b>{verdict.status}</b></p></div></div>
    <div className='gate-table'><div><b>指标</b><b>上线门槛</b><b>当前值</b><b>判定</b></div>{verdict.rows.map((metric) => <div key={metric.key}><strong>{metric.label}</strong><label><input type='range' min={metric.min} max={metric.max} step={metric.step} value={threshold[metric.key]} onChange={(e) => setThreshold((old) => ({ ...old, [metric.key]: +e.target.value }))} /><span>{threshold[metric.key]}{metric.unit}</span></label><label><input type='range' min={metric.min} max={metric.max} step={metric.step} value={current[metric.key]} onChange={(e) => setCurrent((old) => ({ ...old, [metric.key]: +e.target.value }))} /><span>{current[metric.key]}{metric.unit}</span></label><i className={metric.pass ? 'pass' : 'fail'}>{metric.pass ? 'PASS' : 'FAIL'}</i></div>)}</div>
    <div className='launch-analysis'>
      <section><header><FileCheck2 />最薄弱切片</header><strong>{weakest.label}</strong><p>{weakest.pass ? `已过线，但安全裕度最小（gap ${weakest.gap.toFixed(1)}）。` : `未过线，gap ${Math.abs(weakest.gap).toFixed(1)}${weakest.unit}；优先修复并重放对应切片。`}</p></section>
      <section><header><ShieldCheck />发布策略</header><strong>{task}</strong><p>{profile.strategy}</p></section>
      <section><header><CircleDollarSign />单位有效完成成本</header><strong>${calculatedCost.toFixed(2)}</strong><p>${totalCost.toFixed(0)} total cost / {verifiedCompletions} verified completions。失败、重试和人审进入分子。</p></section>
    </div>
    <div className={`launch-final ${verdict.status.toLowerCase()}`}>{verdict.status === 'GO' ? <CheckCircle2 /> : <AlertTriangle />}<div><b>{verdict.status === 'GO' ? '可进入受限 Canary，不等于全量发布' : verdict.status === 'HOLD' ? '暂缓放量：先修复失败指标并重跑 Shadow' : '禁止上线：安全或副作用正确性存在严重缺口'}</b><p>运营 Agent 创建任务、发消息、审批等有副作用动作始终启用确认门、幂等键、结果回读与全量审计；模型提议不等于系统授权。</p></div></div>
  </div>
}
