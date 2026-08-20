import { useMemo, useState } from 'react'
import { AlertTriangle, CircleStop, FastForward, Play, RotateCcw, ShieldCheck, StepForward, Wrench } from 'lucide-react'

type TraceRow = { stage: string; detail: string; tokens: number; latency: number; cost: number; tone?: string }
const tasks = {
  '竞品调研': ['解析调研目标与证据标准', '检索公开资料', '交叉核验冲突证据', '输出带来源结论'],
  '退款审批': ['读取订单和退款规则', '校验额度与订单状态', '请求确认并创建退款', '查询退款单验证状态'],
  '内容运营诊断': ['读取指标摘要', '定位异常切片', '生成修复计划', '校验建议与权限边界'],
  '会议行动项': ['提取结构化行动项', '绑定负责人和截止日', '请求确认', '创建任务并核验'],
}
const faultLabels: Record<string, string> = { none: '不注入', timeout: 'Tool timeout', denied: 'Permission denied', dirty: 'Dirty result', conflict: 'Conflicting evidence' }

export function LoopSimulator() {
  const [task, setTask] = useState<keyof typeof tasks>('竞品调研')
  const [maxSteps, setMaxSteps] = useState(7)
  const [tokenBudget, setTokenBudget] = useState(4200)
  const [toolBudget, setToolBudget] = useState(4)
  const [wallClock, setWallClock] = useState(20)
  const [retry, setRetry] = useState(1)
  const [stopPolicy, setStopPolicy] = useState('外部验证通过')
  const [checkpoint, setCheckpoint] = useState(true)
  const [fault, setFault] = useState('none')
  const [trace, setTrace] = useState<TraceRow[]>([])

  const generated = useMemo(() => {
    const base: TraceRow[] = [
      { stage: 'OBSERVE', detail: `接收“${task}”，加载策略、预算与任务验收条件`, tokens: 180, latency: 180, cost: .002 },
      { stage: 'PLAN', detail: tasks[task][0], tokens: 460, latency: 520, cost: .008 },
      { stage: 'ACT', detail: `提议调用 ${task === '退款审批' ? 'get_order' : task === '会议行动项' ? 'extract_actions' : 'search_docs'}；系统完成 schema 与 ACL 校验`, tokens: 210, latency: 260, cost: .003 },
    ]
    if (fault === 'timeout') base.push({ stage: 'RESULT', detail: '工具超时；执行状态未知，不把 timeout 当作未执行', tokens: 40, latency: 4200, cost: .001, tone: 'warn' }, { stage: 'REPLAN', detail: retry > 0 ? '查询幂等键状态后有限重试；重试预算 −1' : '无重试预算，降级为待人工确认', tokens: 330, latency: 420, cost: .006, tone: 'warn' })
    if (fault === 'denied') base.push({ stage: 'RESULT', detail: 'Policy deny：当前 actor 无资源权限；不允许模型自行扩权', tokens: 35, latency: 90, cost: 0, tone: 'bad' }, { stage: 'REPLAN', detail: '移除越权动作，生成只读建议并升级给有权限审批人', tokens: 280, latency: 360, cost: .005, tone: 'warn' })
    if (fault === 'dirty') base.push({ stage: 'RESULT', detail: '结果缺少 checksum / 来源版本，被标记为 dirty evidence', tokens: 90, latency: 630, cost: .002, tone: 'bad' }, { stage: 'REPLAN', detail: '丢弃脏结果，切换可信只读源；保留原结果哈希用于审计', tokens: 320, latency: 410, cost: .006, tone: 'warn' })
    if (fault === 'conflict') base.push({ stage: 'RESULT', detail: '两条证据在有效日期上冲突，禁止直接汇总为事实', tokens: 160, latency: 760, cost: .003, tone: 'bad' }, { stage: 'REPLAN', detail: '插入来源优先级与时效核验步骤，收窄结论置信度', tokens: 390, latency: 470, cost: .007, tone: 'warn' })
    if (fault === 'none') base.push({ stage: 'RESULT', detail: '工具返回结构合法，来源、版本、checksum 完整', tokens: 120, latency: 680, cost: .002, tone: 'good' })
    base.push({ stage: 'VERIFY', detail: fault === 'none' ? tasks[task][3] : '验证降级结果：没有产生未授权副作用，证据缺口已显式标记', tokens: 350, latency: 460, cost: .006, tone: 'good' })
    const usedTokens = base.reduce((sum, row) => sum + row.tokens, 0)
    const usedTools = base.filter((row) => row.stage === 'ACT' || row.stage === 'RESULT').length - 1
    const hardStop = base.length >= maxSteps || usedTokens > tokenBudget || usedTools > toolBudget || base.reduce((s, r) => s + r.latency, 0) > wallClock * 1000
    base.push({ stage: 'STOP', detail: hardStop ? 'BUDGET_EXHAUSTED：硬预算先于模型决定终止' : fault === 'none' ? 'VERIFIED_SUCCESS：外部状态/证据验收通过' : 'SAFE_DEGRADED：故障已隔离，任务未伪装完成', tokens: 60, latency: 40, cost: .001, tone: hardStop ? 'bad' : 'good' })
    return base
  }, [task, fault, retry, maxSteps, tokenBudget, toolBudget, wallClock])

  const total = trace.reduce((acc, row) => ({ tokens: acc.tokens + row.tokens, latency: acc.latency + row.latency, cost: acc.cost + row.cost }), { tokens: 0, latency: 0, cost: 0 })
  const run = () => setTrace(generated.slice(0, maxSteps))
  const step = () => setTrace((current) => current.length >= generated.length ? current : [...current, generated[current.length]])

  return <div className='agent-lab-panel'>
    <LabHead kicker='LAB 01 · CONTROL LOOP' title='Loop Simulator' desc='逐步观察状态迁移、预算消耗、故障治理与终止原因；全部为机制级教学估算。' icon={<FastForward />} />
    <div className='agent-control-grid four'>
      <SelectControl label='任务' value={task} options={Object.keys(tasks)} onChange={(v) => { setTask(v as keyof typeof tasks); setTrace([]) }} />
      <RangeControl label='Max steps' value={maxSteps} min={4} max={12} step={1} suffix='' onChange={setMaxSteps} />
      <RangeControl label='Token budget' value={tokenBudget} min={1200} max={8000} step={200} suffix=' tok' onChange={setTokenBudget} />
      <RangeControl label='Tool budget' value={toolBudget} min={1} max={8} step={1} suffix=' calls' onChange={setToolBudget} />
      <RangeControl label='Wall-clock' value={wallClock} min={3} max={60} step={1} suffix='s' onChange={setWallClock} />
      <RangeControl label='Retry' value={retry} min={0} max={3} step={1} suffix='' onChange={setRetry} />
      <SelectControl label='Stop policy' value={stopPolicy} options={['模型自报成功', '外部验证通过', '证据+副作用核验']} onChange={setStopPolicy} />
      <label className='agent-toggle'><span>Checkpoint</span><input type='checkbox' checked={checkpoint} onChange={(e) => setCheckpoint(e.target.checked)} /><b>{checkpoint ? '副作用前保存' : '关闭'}</b></label>
    </div>
    <div className='fault-strip'><b>故障注入</b>{Object.entries(faultLabels).map(([id, label]) => <button key={id} className={fault === id ? 'active' : ''} onClick={() => { setFault(id); setTrace([]) }}>{label}</button>)}</div>
    <div className='run-actions'><button onClick={run}><Play />运行</button><button onClick={step}><StepForward />单步执行</button><button className='secondary' onClick={() => setTrace([])}><RotateCcw />重置</button><span>{checkpoint ? 'Checkpoint ON' : 'No checkpoint'} · {stopPolicy}</span></div>
    <div className='trace-layout'>
      <div className='agent-trace'>{trace.length ? trace.map((row, index) => <div className={row.tone ?? ''} key={`${row.stage}-${index}`}><i>{index + 1}</i><b>{row.stage}</b><p>{row.detail}</p><span>{row.tokens} tok<br />{row.latency} ms<br />${row.cost.toFixed(3)}</span></div>) : <div className='empty-trace'>点击“运行”或“单步执行”开始状态迁移。</div>}</div>
      <aside className='trace-summary'><span>RUN BUDGET</span><strong>{total.tokens}</strong><small>/ {tokenBudget} tokens</small><div><b>{(total.latency / 1000).toFixed(2)}s</b><small>wall-clock</small></div><div><b>${total.cost.toFixed(3)}</b><small>教学成本</small></div><div className='termination'><CircleStop /><p><small>TERMINATION REASON</small><b>{trace.at(-1)?.stage === 'STOP' ? trace.at(-1)?.detail.split('：')[0] : 'RUNNING / NOT STARTED'}</b></p></div></aside>
    </div>
    <div className={`verification-compare ${stopPolicy === '模型自报成功' ? 'risky' : ''}`}><AlertTriangle /><div><b>“模型说完成了” ≠ Verified Success</b><p>普通自报只证明生成了完成陈述；Verified Success 需要外部状态、证据 checksum 或副作用回读通过。当前策略：<strong>{stopPolicy}</strong>。</p></div></div>
  </div>
}

const toolSchemas = {
  search_docs: { required: ['query', 'tenant'], properties: { query: 'string', tenant: 'string', top_k: 'number' }, risk: 'read' },
  create_refund: { required: ['order_id', 'amount', 'reason'], properties: { order_id: 'string', amount: 'number', reason: 'string', idempotency_key: 'string' }, risk: 'write' },
  send_message: { required: ['channel_id', 'content'], properties: { channel_id: 'string', content: 'string', tenant: 'string', idempotency_key: 'string' }, risk: 'write' },
}
const makeSample = (tool: keyof typeof toolSchemas, kind: string) => {
  const legal = tool === 'search_docs' ? { query: '退款政策', tenant: 'tenant-a', top_k: 5 } : tool === 'create_refund' ? { order_id: 'O-2088', amount: 199, reason: '重复扣款', idempotency_key: 'refund-O-2088-v1' } : { channel_id: 'ops-internal', content: '请复核本周行动项', tenant: 'tenant-a', idempotency_key: 'msg-2088-v1' }
  if (kind === 'missing') { const copy = { ...legal }; delete copy[Object.keys(copy)[0] as keyof typeof copy]; return copy }
  if (kind === 'type') return { ...legal, [Object.keys(legal)[1]]: 999 }
  if (kind === 'privilege') return { ...legal, tenant: 'tenant-b', admin_override: true }
  if (kind === 'duplicate') return { ...legal, idempotency_key: 'already-executed-001' }
  return legal
}

export function ToolContractLab() {
  const [tool, setTool] = useState<keyof typeof toolSchemas>('create_refund')
  const [sample, setSample] = useState('legal')
  const [confirm, setConfirm] = useState(true)
  const [dryRun, setDryRun] = useState(true)
  const [idempotency, setIdempotency] = useState(true)
  const proposal = makeSample(tool, sample)
  const schema = toolSchemas[tool]
  const errors = schema.required.filter((key) => !(key in proposal)).map((key) => `缺少必填字段 ${key}`)
  Object.entries(proposal).forEach(([key, value]) => {
    if (!(key in schema.properties) && key !== 'tenant') errors.push(`未知/越权参数 ${key}`)
    const expected = (schema.properties as Record<string, string>)[key]
    if (expected && typeof value !== expected) errors.push(`${key} 应为 ${expected}，实际为 ${typeof value}`)
  })
  if ('tenant' in proposal && proposal.tenant === 'tenant-b') errors.push('ACL 拒绝跨租户 tenant-b')
  const duplicate = proposal.idempotency_key === 'already-executed-001'
  const policyPass = errors.length === 0 && (!duplicate || idempotency) && (schema.risk === 'read' || confirm)
  const result = !policyPass ? 'REJECTED' : dryRun ? 'DRY_RUN_VALIDATED' : duplicate ? 'DEDUPLICATED_NOOP' : 'EXECUTED_AND_VERIFIED'

  return <div className='agent-lab-panel'>
    <LabHead kicker='LAB 02 · TOOL GATEWAY' title='Tool Contract Lab' desc='实时拆开模型提议、系统策略判定与执行结果；不会调用真实工具。' icon={<Wrench />} />
    <div className='contract-toolbar'><SelectControl label='工具 Schema' value={tool} options={Object.keys(toolSchemas)} onChange={(v) => { setTool(v as keyof typeof toolSchemas); setSample('legal') }} /><div className='sample-tabs'>{[['legal', '合法'], ['missing', '缺字段'], ['type', '类型错误'], ['privilege', '越权参数'], ['duplicate', '重复副作用']].map(([id, label]) => <button className={sample === id ? 'active' : ''} key={id} onClick={() => setSample(id)}>{label}</button>)}</div></div>
    <div className='schema-banner'><code>{tool}({Object.entries(schema.properties).map(([k, v]) => `${k}${schema.required.includes(k) ? '*' : '?'}: ${v}`).join(', ')})</code><span>{schema.risk.toUpperCase()} · JSON Schema v1.2</span></div>
    <div className='contract-columns'>
      <section><header>01 · MODEL PROPOSAL</header><pre>{JSON.stringify({ tool, arguments: proposal }, null, 2)}</pre><small>模型只能建议调用，不持有执行凭证。</small></section>
      <section className={policyPass ? 'pass' : 'deny'}><header>02 · POLICY DECISION</header><strong>{policyPass ? 'ALLOW' : 'DENY'}</strong>{errors.length ? <ul>{errors.map((e) => <li key={e}>{e}</li>)}</ul> : <p>Schema、类型、ACL 与参数范围通过。</p>}<div className='audit-fields'>actor=course-user<br />tenant=tenant-a<br />ruleId={policyPass ? 'tool-write-confirmed' : 'contract-deny-17'}<br />argsHash=sha256:8f0…c12</div></section>
      <section className={policyPass ? 'pass' : 'deny'}><header>03 · EXECUTION RESULT</header><strong>{result}</strong><p>{dryRun ? 'Dry-run 仅返回预计影响，不产生副作用。' : result === 'EXECUTED_AND_VERIFIED' ? '执行后通过业务对象回读验证。' : result === 'DEDUPLICATED_NOOP' ? '幂等存储命中，未重复执行。' : '请求未进入执行器。'}</p><small>callId=call_demo_2088 · resultChecksum=demo:72ac</small></section>
    </div>
    <div className='gate-switches'><Toggle label='幂等 Key' checked={idempotency} onChange={setIdempotency} /><Toggle label='确认门' checked={confirm} onChange={setConfirm} /><Toggle label='Dry-run' checked={dryRun} onChange={setDryRun} /></div>
    <div className='audit-note'><ShieldCheck /><p><b>审计要求</b> proposal、schemaVersion、actor、tenant、policy rule、args hash、idempotency key、confirmation、callId、result checksum 与时间戳分开记录。</p></div>
  </div>
}

export function LabHead({ kicker, title, desc, icon }: { kicker: string; title: string; desc: string; icon: React.ReactNode }) {
  return <header className='agent-lab-head'><div><span>{kicker}</span><h2>{title}</h2><p>{desc}</p></div>{icon}</header>
}
export function RangeControl({ label, value, min, max, step, suffix, onChange }: { label: string; value: number; min: number; max: number; step: number; suffix: string; onChange: (n: number) => void }) {
  return <label className='agent-range'><span>{label}<b>{value}{suffix}</b></span><input type='range' value={value} min={min} max={max} step={step} onChange={(e) => onChange(+e.target.value)} /></label>
}
export function SelectControl({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return <label className='agent-select'><span>{label}</span><select value={value} onChange={(e) => onChange(e.target.value)}>{options.map((v) => <option key={v}>{v}</option>)}</select></label>
}
export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className='agent-toggle compact'><span>{label}</span><input type='checkbox' checked={checked} onChange={(e) => onChange(e.target.checked)} /><b>{checked ? 'ON' : 'OFF'}</b></label>
}
