import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, BadgeCheck, BarChart3, CheckCircle2, ClipboardCheck, Coins, Gauge, LockKeyhole, Palette, RotateCcw, ShieldCheck, Sparkles, Timer } from 'lucide-react'

const dimensions = [
  { key: 'quality', label: '质量', icon: Sparkles, color: '#d2644f' },
  { key: 'latency', label: '延迟', icon: Timer, color: '#6571cf' },
  { key: 'cost', label: '成本', icon: Coins, color: '#b08a3e' },
  { key: 'safety', label: '安全', icon: ShieldCheck, color: '#39866b' },
] as const

type Budgets = Record<typeof dimensions[number]['key'], number>
const initial: Budgets = { quality: 30, latency: 25, cost: 20, safety: 25 }

export default function ReviewSandbox() {
  const [budgets, setBudgets] = useState<Budgets>(initial)
  const [traffic, setTraffic] = useState(12000)
  const [identity, setIdentity] = useState(true)
  const total = Object.values(budgets).reduce((sum, value) => sum + value, 0)
  const result = useMemo(() => {
    const fast = budgets.latency >= 30
    const quality = budgets.quality >= 30
    const safe = budgets.safety >= 28
    const economical = budgets.cost >= 28
    const stages = [
      'Prompt rewrite / intent schema',
      quality ? 'Planner + 20–28 step high-quality base' : fast ? '4–8 step distilled / flow base' : '12–16 step balanced base',
      identity ? 'IP-Adapter identity + pose ControlNet' : '按需 ControlNet / img2img',
      quality ? '局部 refiner + deterministic text renderer' : '失败样本定向 inpaint',
      'Upscaler（仅命中高分候选）',
      safe ? '输入/输出双重 safety + DLP + 人审抽样' : '基础 safety checker + 高风险拦截',
    ]
    const p95 = fast ? 1.4 : quality ? 3.2 : 2.1
    const cost = economical ? .035 : quality ? .085 : .055
    return {
      stages, p95, cost,
      concurrency: Math.ceil(traffic / 3600 * p95 * 1.35),
      metrics: ['单位有效图成本', '端到端 p95', 'prompt adherence', identity ? 'identity similarity' : 'composition success', 'OCR exact match', 'safety leak / over-block', 'stage retry rate'],
      risks: [
        quality ? '多阶段 refiner 可能修坏身份，需阶段回放与 identity gate' : '低步数在复杂构图上可能出现灾难样本',
        fast ? 'p95 目标激进，必须限制候选数并避免整链重试' : '尾延迟可能影响创作交互节奏',
        economical ? '成本预算高意味着强约束：需按质量路由而非所有请求同配' : '多候选与精修可能推高单位有效图成本',
        safe ? '严格安全策略可能误杀艺术风格，必须监控 over-block' : '安全预算偏低，高风险输入应降低自治程度',
      ],
    }
  }, [budgets, traffic, identity])

  return <section className='review-sandbox' id='review-sandbox'>
    <div className='review-hero'><div><span>LAB G · LAUNCH REVIEW</span><h1>AI 创作助手<br />上线评审沙盘</h1><p>场景：面向品牌与设计师的图文创作助手，支持人物参考、海报构图与局部编辑。请分配 100 点上线预算。</p></div><div className='case-stamp'><Palette /><b>CASE 07</b><span>CREATIVE COPILOT</span></div></div>
    <div className='review-context'>
      <label><span>峰值请求 / 小时</span><input type='range' min='1000' max='80000' step='1000' value={traffic} onChange={(e) => setTraffic(+e.target.value)} /><b>{traffic.toLocaleString()}</b></label>
      <label className='identity-toggle'><input type='checkbox' checked={identity} onChange={(e) => setIdentity(e.target.checked)} /><span><LockKeyhole />必须保持人物身份一致</span></label>
    </div>
    <div className='budget-workbench'>
      <div className='budget-panel'>
        <header><div><span>资源分配</span><b className={total === 100 ? 'valid' : 'invalid'}>{total} / 100</b></div><button onClick={() => setBudgets(initial)}><RotateCcw />重置</button></header>
        <div className='budget-sliders'>{dimensions.map(({ key, label, icon: Icon, color }) => <label key={key}><span><i style={{ background: color }}><Icon /></i>{label}<b>{budgets[key]} 点</b></span><input type='range' min='10' max='50' value={budgets[key]} onChange={(e) => setBudgets({ ...budgets, [key]: +e.target.value })} style={{ accentColor: color }} /></label>)}</div>
        <div className={`budget-status ${total === 100 ? 'good' : 'bad'}`}>{total === 100 ? <CheckCircle2 /> : <AlertTriangle />}<span>{total === 100 ? '预算闭合，可以进行架构评审。' : total > 100 ? `超支 ${total - 100} 点：必须明确牺牲项。` : `仍有 ${100 - total} 点未分配：架构目标不完整。`}</span></div>
      </div>
      <div className='budget-radar'>
        <div className='radar-shape'>{dimensions.map(({ key }, index) => <i key={key} style={{ '--angle': `${index * 90}deg`, '--size': `${budgets[key] * 2}%` } as React.CSSProperties} />)}<span className='radar-label radar-right'>质量</span><span className='radar-label radar-bottom'>延迟</span><span className='radar-label radar-left'>成本</span><span className='radar-label radar-top'>安全</span><b>TRADE<br />SPACE</b></div>
        <p>预算不是模型参数，而是决策优先级。每增加一项，必须说明牺牲了什么。</p>
      </div>
    </div>

    <div className={`review-output ${total !== 100 ? 'locked' : ''}`}>
      {total !== 100 && <div className='output-lock'><LockKeyhole /><b>先把预算调到 100 点</b></div>}
      <section className='architecture-output'><header><BadgeCheck /><span>建议架构</span></header><div className='architecture-flow'>{result.stages.map((stage, index) => <div key={stage}><i>{String(index + 1).padStart(2, '0')}</i><b>{stage}</b>{index < result.stages.length - 1 && <ArrowRight />}</div>)}</div></section>
      <section className='sla-output'><header><Gauge /><span>建议 SLA / 容量</span></header><div><article><small>端到端 p95</small><b>≤ {result.p95.toFixed(1)}s</b></article><article><small>单次教学成本上限</small><b>${result.cost.toFixed(3)}</b></article><article><small>最低并发槽位*</small><b>{result.concurrency}</b></article><article><small>安全泄漏率</small><b>&lt; 0.1%</b></article></div><p>* 按峰值均匀到达、p95 服务时间、35% 余量的 Little’s Law 教学估算；未计突发与失败重试。</p></section>
      <section className='metrics-output'><header><BarChart3 /><span>核心指标</span></header><div>{result.metrics.map((metric) => <span key={metric}>{metric}</span>)}</div></section>
      <section className='risk-output'><header><ClipboardCheck /><span>评审风险清单</span></header><ul>{result.risks.map((risk) => <li key={risk}><AlertTriangle />{risk}</li>)}</ul></section>
    </div>
    <div className='launch-gate'><CheckCircle2 /><div><b>建议上线闸门</b><p>离线关键切片全部通过；端到端压测满足 p95；1% shadow 验证 trace 与安全；5% 灰度观察单位有效图成本和失败 taxonomy；护栏越界自动回退到低风险工作流。</p></div></div>
  </section>
}
