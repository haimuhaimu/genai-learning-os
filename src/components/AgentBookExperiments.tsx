import { useEffect, useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import { ArrowRight, BookOpen, CheckCircle2, FlaskConical, Lightbulb, SlidersHorizontal, Target } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { AgentBookChapterId, AgentBookLabId } from '../agentBookData'
import {
  agentBookDisclaimer,
  agentBookLabProgressKey,
  agentBookLabIds,
  chapterProgressKey,
} from '../agentBookData'
import { markProgress, readProgress, stageLabels } from '../progress'

type Props = {
  initialExperiment?: string
  go: (page: string, options?: { chapter?: string; experiment?: string }) => void
}

type LabMeta = {
  id: AgentBookLabId
  title: string
  subtitle: string
  relatedChapters: AgentBookChapterId[]
}

const labs: LabMeta[] = [
  {
    id: 'harness-diagnose',
    title: 'Lab-B1 Harness 五要素诊断',
    subtitle: '给定失败症状 → 归因到 Context/Tools/Constrain/Verify/Correct，并输出修补路径。',
    relatedChapters: ['ch1', 'ch5', 'ch9'],
  },
  {
    id: 'kv-cache',
    title: 'Lab-B2 KV Cache 反模式模拟',
    subtitle: '切换四种策略，实时估算命中率、TTFT、成本（可解释公式）。',
    relatedChapters: ['ch2'],
  },
  {
    id: 'status-bar',
    title: 'Lab-B3 Agent Status Bar 沙盘',
    subtitle: '编辑 status bar 长度与更新策略（替换 vs 追加），观察缓存与成本示意曲线。',
    relatedChapters: ['ch2', 'ch10'],
  },
  {
    id: 'pass-at-k',
    title: 'Lab-B4 Pass@k 与 Pass^k 计算器',
    subtitle: '同一个 p 与 k，为什么“技术奇观”和“业务可靠”会给出完全不同的结论。',
    relatedChapters: ['ch7'],
  },
  {
    id: 'new-info-criterion',
    title: 'Lab-B5 多 Agent 新信息判据',
    subtitle: '勾选协作场景是否引入“生成时不可获得的新信息”，系统给出判据反馈。',
    relatedChapters: ['ch10', 'ch6'],
  },
  {
    id: 'evolution-router',
    title: 'Lab-B6 持续进化更新路由',
    subtitle: '给定失败案例：选择更新载体，并输出三层验证 + 边界集/保留集 + 回滚建议。',
    relatedChapters: ['ch9'],
  },
]

function toLabId(raw?: string): AgentBookLabId {
  const v = raw as AgentBookLabId | undefined
  return (agentBookLabIds as readonly AgentBookLabId[]).includes(v ?? ('harness-diagnose' as AgentBookLabId)) ? (v ?? 'harness-diagnose') : 'harness-diagnose'
}

function stageLabel(stage: number) {
  return stageLabels[Math.max(0, Math.min(4, stage)) as 0 | 1 | 2 | 3 | 4]
}

function updateQueryExperiment(experiment: AgentBookLabId) {
  const url = new URL(window.location.href)
  url.searchParams.set('experiment', experiment)
  window.history.replaceState({}, '', `${url.pathname}?${url.searchParams.toString()}${url.hash}`)
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function pct(n: number) {
  return `${Math.round(n * 1000) / 10}%`
}

function money(n: number) {
  return `¥${(Math.round(n * 100) / 100).toFixed(2)}`
}

function toNumber(v: unknown) {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return Number(v)
  return 0
}

function markLabDone(labId: AgentBookLabId, relatedChapters: AgentBookChapterId[]) {
  markProgress(agentBookLabProgressKey(labId), 3)
  for (const ch of relatedChapters) markProgress(chapterProgressKey(ch), 3)
}

function SectionTitle({ icon: Icon, title }: { icon: ComponentType<{ size?: string | number }>; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          background: 'rgba(16,185,129,0.12)',
          border: '1px solid rgba(16,185,129,0.22)',
          display: 'grid',
          placeItems: 'center',
          color: 'rgba(15,23,42,0.85)',
        }}
      >
        <Icon size={18} />
      </span>
      <div>
        <b style={{ fontSize: 14 }}>{title}</b>
      </div>
    </div>
  )
}

function HarnessDiagnoseLab({ onDone }: { onDone: () => void }) {
  const [symptoms, setSymptoms] = useState<Record<string, boolean>>({
    '看不到关键事实/上下文缺字段': false,
    '工具 schema 与实际不一致（字段名/类型变化）': false,
    '工具调用参数畸形（日期/金额/单位）': false,
    '拿到工具结果但没有引用/没有核对': false,
    '违反边界（越权/敏感信息/不该执行的操作）': false,
    '失败后重复同一种修复动作（死循环）': false,
    '没有终止条件/预算上限（成本失控）': false,
  })
  const [traceRound, setTraceRound] = useState(3)
  const [risk, setRisk] = useState(2)

  const scores = useMemo(() => {
    const s = { Context: 0, Tools: 0, Constrain: 0, Verify: 0, Correct: 0 }
    if (symptoms['看不到关键事实/上下文缺字段']) s.Context += 3
    if (symptoms['工具 schema 与实际不一致（字段名/类型变化）']) s.Tools += 3
    if (symptoms['工具调用参数畸形（日期/金额/单位）']) s.Tools += 2
    if (symptoms['拿到工具结果但没有引用/没有核对']) s.Verify += 3
    if (symptoms['违反边界（越权/敏感信息/不该执行的操作）']) s.Constrain += 3
    if (symptoms['失败后重复同一种修复动作（死循环）']) s.Correct += 3
    if (symptoms['没有终止条件/预算上限（成本失控）']) s.Correct += 2

    // round 与 risk 用于给一点“症状强度”
    if (traceRound >= 4) s.Context += 1
    if (risk >= 4) s.Constrain += 1

    const entries = Object.entries(s)
    const winner = entries.sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Context'
    return { s, winner }
  }, [risk, symptoms, traceRound])

  const advice = useMemo(() => {
    const w = scores.winner
    if (w === 'Context') {
      return [
        '把“关键事实”做成结构化字段，并放在稳定位置（例如 status bar 或 fixed slots），避免散落在长历史里。',
        '减少动态 system/tools 的改写，保持字节级稳定，动态信息追加到末尾。',
        '加入“缺字段澄清”策略：未满足输入契约时必须提问，而不是猜。',
      ]
    }
    if (w === 'Tools') {
      return [
        '先做 tool contract：参数 schema、样例、反例、错误码，确保“参数保真”。',
        '对 tool result 做结构化解析与兜底：缺字段/类型错误要显式报错喂回模型。',
        '工具多时用“索引→按需发现”减少 schema 膨胀，并记录选择理由。',
      ]
    }
    if (w === 'Constrain') {
      return [
        '把边界写成可执行门禁（程序/规则），而不是仅写在 prompt 里。',
        '加 veto：一旦触发越权/敏感项，直接终止并要求人工确认。',
        '把权限信息显式化（例如 status bar 里声明当前 token/账号的权限范围）。',
      ]
    }
    if (w === 'Verify') {
      return [
        '把“完成”从模型宣称改成验证器证明：对关键字段做一致性核对。',
        '要求输出“证据指针”（引用 tool result 的字段/行），否则视为未完成。',
        '把验证拆成三层：结果真值 → 过程一致性 → 质量 Rubric。',
      ]
    }
    return [
      '加入“最小 diff + 可回滚”修复策略：一次只改一个变量，失败能回退。',
      '加入熔断：同指纹错误 N 次即停止，转人工/换策略/降级。',
      '把修复路径写进 Harness：错误分类→对应纠错工具/策略，而不是每次临场发挥。',
    ]
  }, [scores.winner])

  return (
    <div>
      <SectionTitle icon={SlidersHorizontal} title='输入：失败症状（静态模拟）' />
      <div className='agent-book-grid'>
        <section className='agent-book-card'>
          <h3>症状勾选</h3>
          <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
            {Object.keys(symptoms).map((k) => (
              <li key={k} style={{ marginTop: 8 }}>
                <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input
                    type='checkbox'
                    checked={symptoms[k]}
                    onChange={(e) => setSymptoms((prev) => ({ ...prev, [k]: e.target.checked }))}
                    style={{ marginTop: 3 }}
                  />
                  <span style={{ lineHeight: 1.45, color: 'rgba(31,39,50,.84)' }}>{k}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
        <section className='agent-book-card'>
          <h3>轨迹强度</h3>
          <label style={{ display: 'block', marginTop: 10, fontSize: 12, color: 'rgba(31,39,50,.72)' }}>
            失败发生在第几轮（1–6）：<b style={{ marginLeft: 8 }}>{traceRound}</b>
          </label>
          <input type='range' min={1} max={6} value={traceRound} onChange={(e) => setTraceRound(Number(e.target.value))} style={{ width: '100%' }} />

          <label style={{ display: 'block', marginTop: 12, fontSize: 12, color: 'rgba(31,39,50,.72)' }}>
            风险等级（1–5）：<b style={{ marginLeft: 8 }}>{risk}</b>
          </label>
          <input type='range' min={1} max={5} value={risk} onChange={(e) => setRisk(Number(e.target.value))} style={{ width: '100%' }} />

          <div className='agent-book-footnote'>
            这里的“强度”只用于把诊断从纯规则变成“更像真实轨迹”的连续信号，不代表真实线上指标。
          </div>
        </section>
      </div>

      <hr className='agent-book-divider' />

      <SectionTitle icon={Target} title='输出：最可能的 Harness 断点' />
      <div className='agent-book-grid'>
        <section className='agent-book-card'>
          <h3>诊断结果</h3>
          <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6 }}>
            归因建议：<b>{scores.winner}</b>
            <div className='agent-book-footnote'>
              解释口径：Context/Tools/Constrain/Verify/Correct 不是“谁背锅”，而是“下一步应该修哪一环”。
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            {Object.entries(scores.s).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <b style={{ width: 78, fontSize: 12, color: 'rgba(31,39,50,.72)' }}>{k}</b>
                <div style={{ flex: 1, height: 10, borderRadius: 999, background: 'rgba(15,23,42,0.08)', overflow: 'hidden' }}>
                  <div style={{ width: `${clamp(v / 6, 0, 1) * 100}%`, height: '100%', background: 'rgba(16,185,129,0.55)' }} />
                </div>
                <span style={{ width: 26, textAlign: 'right', fontSize: 12, color: 'rgba(31,39,50,.64)' }}>{v}</span>
              </div>
            ))}
          </div>
        </section>

        <section className='agent-book-card'>
          <h3>建议的修补路径（最小 diff）</h3>
          <ul>
            {advice.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <button className='agent-book-action-btn primary' onClick={onDone} style={{ marginTop: 10 }}>
            <CheckCircle2 size={16} />
            标记：我已完成该实验
          </button>
        </section>
      </div>
    </div>
  )
}

function KVCacheLab({ onDone }: { onDone: () => void }) {
  const [prefixTokens, setPrefixTokens] = useState(1800)
  const [rounds, setRounds] = useState(8)
  const [baseHit, setBaseHit] = useState(0.78)
  const [pricePer1k, setPricePer1k] = useState(0.008)
  const [prefillSpeed, setPrefillSpeed] = useState(2200) // tokens per second
  const [baseTTFT, setBaseTTFT] = useState(220) // ms

  const [dynamicSystem, setDynamicSystem] = useState(false)
  const [dynamicToolOrder, setDynamicToolOrder] = useState(false)
  const [slidingWindow, setSlidingWindow] = useState(false)
  const [appendStatusBar, setAppendStatusBar] = useState(true)

  const model = useMemo(() => {
    let effectiveHit = clamp(baseHit, 0, 0.98)
    if (dynamicSystem) effectiveHit *= 0.15
    if (dynamicToolOrder) effectiveHit *= 0.35

    const prefix = slidingWindow ? Math.round(prefixTokens * 0.55) : prefixTokens

    // status bar 追加会让每轮多一些 tokens，但不破坏稳定前缀；相反会让“稳定前缀占比更大”
    const statusBarTokensPerRound = appendStatusBar ? 80 : 0

    const points = [] as { round: number; hit: number; ttft: number; cost: number; cumCost: number }[]
    let cumCost = 0
    for (let r = 1; r <= rounds; r++) {
      // 教学公式：prefill 约等于未命中的前缀 token
      const prefill = Math.round((1 - effectiveHit) * prefix)
      const ttft = baseTTFT + (prefill / prefillSpeed) * 1000
      const totalTokens = prefix + statusBarTokensPerRound * r
      const cost = (totalTokens / 1000) * pricePer1k
      cumCost += cost
      points.push({ round: r, hit: effectiveHit, ttft, cost, cumCost })
    }

    return { effectiveHit, prefix, statusBarTokensPerRound, points }
  }, [appendStatusBar, baseHit, baseTTFT, dynamicSystem, dynamicToolOrder, prefillSpeed, prefixTokens, pricePer1k, rounds, slidingWindow])

  return (
    <div>
      <SectionTitle icon={Lightbulb} title='策略开关：四种常见“缓存击穿”与一个好习惯' />
      <div className='agent-book-grid'>
        <section className='agent-book-card'>
          <h3>策略选择</h3>
          <ul style={{ paddingLeft: 0, listStyle: 'none', marginTop: 10 }}>
            {[{
              k: '动态 system prompt（反模式）',
              v: dynamicSystem,
              set: setDynamicSystem,
              note: 'system 每轮改写 → 前缀字节不一致 → 命中率断崖下降。',
            }, {
              k: '动态工具排序（反模式）',
              v: dynamicToolOrder,
              set: setDynamicToolOrder,
              note: 'tools 列表顺序改变也会改变字节序列，缓存仍会失效。',
            }, {
              k: '滑动窗口（反模式/权衡）',
              v: slidingWindow,
              set: setSlidingWindow,
              note: '省长度但破坏“长期稳定前缀”，对 cache 复用不友好。',
            }, {
              k: '尾部追加 status bar（推荐）',
              v: appendStatusBar,
              set: setAppendStatusBar,
              note: '把动态状态放末尾；前缀稳定，新增 token 只在尾部增长。',
            }].map((item) => (
              <li key={item.k} style={{ marginTop: 10 }}>
                <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input type='checkbox' checked={item.v} onChange={(e) => item.set(e.target.checked)} style={{ marginTop: 3 }} />
                  <span>
                    <b style={{ fontSize: 13 }}>{item.k}</b>
                    <div style={{ marginTop: 4, color: 'rgba(31,39,50,.72)', lineHeight: 1.5 }}>{item.note}</div>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section className='agent-book-card'>
          <h3>可解释参数</h3>
          <label className='agent-book-footnote'>前缀 tokens（system+tools 等稳定部分）</label>
          <input className='agent-book-input' type='number' value={prefixTokens} min={200} max={8000} onChange={(e) => setPrefixTokens(Number(e.target.value))} />

          <label className='agent-book-footnote'>基础命中率 hit_ratio（无反模式时）</label>
          <input className='agent-book-input' type='number' value={baseHit} step={0.01} min={0} max={0.98} onChange={(e) => setBaseHit(Number(e.target.value))} />

          <label className='agent-book-footnote'>轮数 rounds（绘图范围）</label>
          <input className='agent-book-input' type='number' value={rounds} min={2} max={20} onChange={(e) => setRounds(Number(e.target.value))} />

          <label className='agent-book-footnote'>prefill 速度 tokens/s（教学参数）</label>
          <input className='agent-book-input' type='number' value={prefillSpeed} min={400} max={8000} onChange={(e) => setPrefillSpeed(Number(e.target.value))} />

          <label className='agent-book-footnote'>基础 TTFT（ms）</label>
          <input className='agent-book-input' type='number' value={baseTTFT} min={50} max={1200} onChange={(e) => setBaseTTFT(Number(e.target.value))} />

          <label className='agent-book-footnote'>单价（¥ / 1k tokens）</label>
          <input className='agent-book-input' type='number' value={pricePer1k} step={0.001} min={0.001} max={1} onChange={(e) => setPricePer1k(Number(e.target.value))} />
        </section>
      </div>

      <hr className='agent-book-divider' />

      <SectionTitle icon={Target} title='结果：命中率、TTFT、成本（示意）' />
      <div className='agent-book-grid'>
        <section className='agent-book-card' style={{ gridColumn: 'span 12' }}>
          <h3>核心读数</h3>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10 }}>
            <span className='agent-book-pill'>
              <b>effective hit</b> {pct(model.effectiveHit)}
            </span>
            <span className='agent-book-pill'>
              <b>prefix</b> {model.prefix} tokens
            </span>
            <span className='agent-book-pill'>
              <b>累计成本</b> {money(model.points[model.points.length - 1]?.cumCost ?? 0)}
            </span>
          </div>
          <div className='agent-book-footnote' style={{ marginTop: 10 }}>
            教学提醒：这里不是对任何线上系统的真实性能声明，只是把“前缀稳定性→缓存命中→延迟/成本”的因果链显式化。
          </div>
        </section>

        <section className='agent-book-card' style={{ gridColumn: 'span 12' }}>
          <h3>TTFT（ms）随轮数变化</h3>
          <div style={{ width: '100%', height: 280, marginTop: 12 }}>
            <ResponsiveContainer>
              <LineChart data={model.points} margin={{ left: 8, right: 18, top: 10, bottom: 8 }}>
                <CartesianGrid strokeDasharray='4 4' stroke='rgba(15,23,42,0.12)' />
                <XAxis dataKey='round' tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(15,23,42,0.12)' }} />
                <Legend />
                <Line type='monotone' dataKey='ttft' name='TTFT(ms)' stroke='rgba(16,185,129,0.85)' strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className='agent-book-card' style={{ gridColumn: 'span 12' }}>
          <h3>累计成本（¥）随轮数变化</h3>
          <div style={{ width: '100%', height: 260, marginTop: 12 }}>
            <ResponsiveContainer>
              <AreaChart data={model.points} margin={{ left: 8, right: 18, top: 10, bottom: 8 }}>
                <CartesianGrid strokeDasharray='4 4' stroke='rgba(15,23,42,0.12)' />
                <XAxis dataKey='round' tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(15,23,42,0.12)' }} />
                <Area type='monotone' dataKey='cumCost' name='累计成本(¥)' stroke='rgba(59,130,246,0.85)' fill='rgba(59,130,246,0.20)' />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <button className='agent-book-action-btn primary' onClick={onDone} style={{ marginTop: 10 }}>
            <CheckCircle2 size={16} />
            标记：我已完成该实验
          </button>
        </section>
      </div>
    </div>
  )
}

function StatusBarLab({ onDone }: { onDone: () => void }) {
  const [steps, setSteps] = useState(10)
  const [baseContextTokens, setBaseContextTokens] = useState(1200)
  const [statusBarTokens, setStatusBarTokens] = useState(90)
  const [strategy, setStrategy] = useState<'replace' | 'append'>('append')

  const model = useMemo(() => {
    const points = [] as { step: number; context: number; extraPrefill: number; statusShare: number }[]
    for (let i = 1; i <= steps; i++) {
      const status = strategy === 'append' ? statusBarTokens * i : statusBarTokens
      const context = baseContextTokens + status

      // 示意：replace 会导致从 status bar 开始发生 token 分歧 → 每轮至少多 prefill statusBarTokens
      // append 只在末尾新增 token → extra prefill 约等于“新增那部分”
      const extraPrefill = strategy === 'append' ? statusBarTokens : statusBarTokens
      const statusShare = status / context
      points.push({ step: i, context, extraPrefill, statusShare })
    }
    return { points }
  }, [baseContextTokens, statusBarTokens, steps, strategy])

  return (
    <div>
      <SectionTitle icon={SlidersHorizontal} title='设置：status bar 内容长度与更新策略' />
      <div className='agent-book-grid'>
        <section className='agent-book-card'>
          <h3>参数</h3>
          <label className='agent-book-footnote'>基础上下文 tokens（不含 status bar）</label>
          <input className='agent-book-input' type='number' min={200} max={8000} value={baseContextTokens} onChange={(e) => setBaseContextTokens(Number(e.target.value))} />

          <label className='agent-book-footnote'>status bar tokens（每次更新新增/替换的量级）</label>
          <input className='agent-book-input' type='number' min={10} max={600} value={statusBarTokens} onChange={(e) => setStatusBarTokens(Number(e.target.value))} />

          <label className='agent-book-footnote'>步数（模拟轮次）</label>
          <input className='agent-book-input' type='number' min={5} max={30} value={steps} onChange={(e) => setSteps(Number(e.target.value))} />

          <label className='agent-book-footnote'>更新策略</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
            <button className={`agent-book-action-btn ${strategy === 'append' ? 'primary' : ''}`} onClick={() => setStrategy('append')}>
              追加（append-only）
            </button>
            <button className={`agent-book-action-btn ${strategy === 'replace' ? 'primary' : ''}`} onClick={() => setStrategy('replace')}>
              替换（rewrite tail）
            </button>
          </div>
        </section>

        <section className='agent-book-card'>
          <h3>解释口径</h3>
          <ul>
            <li>
              <b>追加</b>：让 token 分歧发生在最末尾，缓存更容易复用；代价是上下文会越变越长。
            </li>
            <li>
              <b>替换</b>：上下文长度稳定，但如果你反复改写同一段尾部内容，会让“从该段开始”的 KV 无法复用。
            </li>
          </ul>
          <div className='agent-book-footnote'>这里用“示意曲线”强化直觉：你真正关心的是“分歧点在哪里”。</div>
        </section>
      </div>

      <hr className='agent-book-divider' />

      <SectionTitle icon={Target} title='曲线：上下文长度与 status 占比（示意）' />
      <div className='agent-book-grid'>
        <section className='agent-book-card' style={{ gridColumn: 'span 12' }}>
          <h3>上下文 tokens</h3>
          <div style={{ width: '100%', height: 280, marginTop: 12 }}>
            <ResponsiveContainer>
              <LineChart data={model.points} margin={{ left: 8, right: 18, top: 10, bottom: 8 }}>
                <CartesianGrid strokeDasharray='4 4' stroke='rgba(15,23,42,0.12)' />
                <XAxis dataKey='step' tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(15,23,42,0.12)' }} />
                <Legend />
                <Line type='monotone' dataKey='context' name='context tokens' stroke='rgba(16,185,129,0.85)' strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className='agent-book-card' style={{ gridColumn: 'span 12' }}>
          <h3>status 占比（status / context）</h3>
          <div style={{ width: '100%', height: 260, marginTop: 12 }}>
            <ResponsiveContainer>
              <AreaChart data={model.points} margin={{ left: 8, right: 18, top: 10, bottom: 8 }}>
                <CartesianGrid strokeDasharray='4 4' stroke='rgba(15,23,42,0.12)' />
                <XAxis dataKey='step' tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => `${Math.round(v * 100)}%`} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(15,23,42,0.12)' }} formatter={(v: unknown) => pct(toNumber(v))} />
                <Area type='monotone' dataKey='statusShare' name='status share' stroke='rgba(245,158,11,0.9)' fill='rgba(245,158,11,0.18)' />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <button className='agent-book-action-btn primary' onClick={onDone} style={{ marginTop: 10 }}>
            <CheckCircle2 size={16} />
            标记：我已完成该实验
          </button>
        </section>
      </div>
    </div>
  )
}

function PassAtKLab({ onDone }: { onDone: () => void }) {
  const [p, setP] = useState(0.6)
  const [k, setK] = useState(5)
  const [question, setQuestion] = useState<'business' | 'demo' | null>(null)

  const points = useMemo(() => {
    const pts = [] as { k: number; passAtK: number; passPowK: number }[]
    for (let i = 1; i <= 20; i++) {
      const passAtK = 1 - Math.pow(1 - clamp(p, 0, 0.999), i)
      const passPowK = Math.pow(clamp(p, 0, 0.999), i)
      pts.push({ k: i, passAtK, passPowK })
    }
    return pts
  }, [p])

  const passAtK = 1 - Math.pow(1 - clamp(p, 0, 0.999), k)
  const passPowK = Math.pow(clamp(p, 0, 0.999), k)

  const feedback = useMemo(() => {
    if (!question) return null
    if (question === 'demo') {
      return {
        ok: true,
        text: '展示“上限能力/技术奇观”更适合看 Pass@k：采样多次，总有一次成功。',
      }
    }
    return {
      ok: true,
      text: '线上连续可靠更接近 Pass^k：你需要连续 k 次都成功，而不是“试到成功为止”。',
    }
  }, [question])

  return (
    <div>
      <SectionTitle icon={SlidersHorizontal} title='输入：单步成功率 p 与步数 k' />
      <div className='agent-book-grid'>
        <section className='agent-book-card'>
          <h3>参数</h3>
          <div className='agent-book-fields'>
            <label className='agent-book-field'>
              <span>p（单步成功率 0~1）</span>
              <input className='agent-book-input' type='number' min={0.01} max={0.99} step={0.01} value={p} onChange={(e) => setP(Number(e.target.value))} />
            </label>
            <label className='agent-book-field'>
              <span>k（步数/轮数）</span>
              <input className='agent-book-input' type='number' min={1} max={20} value={k} onChange={(e) => setK(Number(e.target.value))} />
            </label>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
            <span className='agent-book-pill'>
              <b>Pass@k</b> {pct(passAtK)}
            </span>
            <span className='agent-book-pill'>
              <b>Pass^k</b> {pct(passPowK)}
            </span>
          </div>
        </section>

        <section className='agent-book-card'>
          <h3>公式</h3>
          <div className='agent-book-formula'>Pass@k = 1 - (1 - p)^k<br />Pass^k = p^k</div>
          <div className='agent-book-footnote'>对比直觉：p 不变时，Pass@k 会很快接近 100%，但 Pass^k 会指数下降。</div>
        </section>
      </div>

      <hr className='agent-book-divider' />

      <SectionTitle icon={Target} title='曲线：k 增大后的两种“成功观”' />
      <section className='agent-book-card' style={{ gridColumn: 'span 12' }}>
        <h3>Pass@k vs Pass^k</h3>
        <div style={{ width: '100%', height: 300, marginTop: 12 }}>
          <ResponsiveContainer>
            <LineChart data={points} margin={{ left: 8, right: 18, top: 10, bottom: 8 }}>
              <CartesianGrid strokeDasharray='4 4' stroke='rgba(15,23,42,0.12)' />
              <XAxis dataKey='k' tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => `${Math.round(v * 100)}%`} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(15,23,42,0.12)' }} formatter={(v: unknown) => pct(toNumber(v))} />
              <Legend />
              <Line type='monotone' dataKey='passAtK' name='Pass@k（奇观）' stroke='rgba(59,130,246,0.88)' strokeWidth={2} dot={false} />
              <Line type='monotone' dataKey='passPowK' name='Pass^k（可靠）' stroke='rgba(16,185,129,0.88)' strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className='agent-book-grid'>
        <section className='agent-book-card'>
          <h3>评审题：你会用哪个指标？</h3>
          <div style={{ marginTop: 10, lineHeight: 1.65, color: 'rgba(31,39,50,.82)' }}>
            选择一个场景并解释：
            <div style={{ marginTop: 8, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className='agent-book-action-btn' onClick={() => setQuestion('demo')}>
                展示“能力上限”（技术奇观）
              </button>
              <button className='agent-book-action-btn' onClick={() => setQuestion('business')}>
                线上“连续成功”（业务可靠）
              </button>
            </div>
          </div>
          {feedback ? (
            <div className='agent-book-callout' style={{ marginTop: 12 }}>
              <b>反馈：</b>
              {feedback.text}
              <div className='agent-book-footnote' style={{ marginTop: 6 }}>
                书中强调：veto（一票否决）要独立出来，不能被“高分”掩盖。
              </div>
            </div>
          ) : null}
        </section>

        <section className='agent-book-card'>
          <h3>完成</h3>
          <ul>
            <li>我能解释 Pass@k 与 Pass^k 的差别。</li>
            <li>我能说清“展示上限”和“线上可靠”用不同指标。</li>
            <li>我知道必须加 veto。</li>
          </ul>
          <button className='agent-book-action-btn primary' onClick={onDone} style={{ marginTop: 10 }}>
            <CheckCircle2 size={16} />
            标记：我已完成该实验
          </button>
        </section>
      </div>
    </div>
  )
}

function NewInfoCriterionLab({ onDone }: { onDone: () => void }) {
  const scenarios = useMemo(() => {
    return [
      {
        id: 'self-debate',
        title: '自审辩论（同上下文 proposer vs reviewer）',
        truth: false,
        why: '如果 reviewer 只看同一上下文，往往没有新信息；更像“多想几步”。',
      },
      {
        id: 'exec-feedback',
        title: '代码执行反馈（编译/测试/运行报错）',
        truth: true,
        why: '执行结果在生成时不存在，属于环境反馈的新信息。',
      },
      {
        id: 'vision-verify',
        title: '视觉验证（截图/DOM 对比/渲染结果）',
        truth: true,
        why: '视觉反馈把“屏幕状态”带进上下文，属于新信息。',
      },
      {
        id: 'parallel-research',
        title: '并行研究总线（多个 worker 拉取不同来源）',
        truth: true,
        why: '不同工具/不同页面返回的内容是新信息，且可被引用与交叉验证。',
      },
      {
        id: 'voice-werewolf',
        title: '语音狼人杀（裁判/玩家隔离，回合状态机）',
        truth: true,
        why: '多角色的私有视角 + 裁判验证会带来新信息与新约束。',
      },
    ]
  }, [])

  const [choices, setChoices] = useState<Record<string, boolean>>(() => Object.fromEntries(scenarios.map((s) => [s.id, false])))

  const score = useMemo(() => {
    let correct = 0
    for (const s of scenarios) {
      if ((choices[s.id] ?? false) === s.truth) correct += 1
    }
    return { correct, total: scenarios.length }
  }, [choices, scenarios])

  return (
    <div>
      <SectionTitle icon={Target} title='判据：是否引入“生成时不可获得的新信息”？' />
      <div className='agent-book-grid'>
        <section className='agent-book-card'>
          <h3>勾选：你认为“引入新信息”的场景</h3>
          <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
            {scenarios.map((s) => (
              <li key={s.id} style={{ marginTop: 10 }}>
                <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input
                    type='checkbox'
                    checked={choices[s.id] ?? false}
                    onChange={(e) => setChoices((prev) => ({ ...prev, [s.id]: e.target.checked }))}
                    style={{ marginTop: 3 }}
                  />
                  <span style={{ lineHeight: 1.45 }}>
                    <b>{s.title}</b>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className='agent-book-footnote'>提示：不是“多一个人看一遍”就叫新信息，新信息通常来自环境/工具/感知反馈。</div>
        </section>

        <section className='agent-book-card'>
          <h3>反馈</h3>
          <div style={{ marginTop: 10 }}>
            <span className='agent-book-pill'>
              <b>正确</b> {score.correct}/{score.total}
            </span>
          </div>
          <ul style={{ marginTop: 10 }}>
            {scenarios.map((s) => {
              const picked = choices[s.id] ?? false
              const ok = picked === s.truth
              return (
                <li key={s.id} style={{ marginTop: 10 }}>
                  <b style={{ color: ok ? 'rgba(16,185,129,0.92)' : 'rgba(239,68,68,0.9)' }}>{ok ? '✔' : '✘'}</b> {s.title}
                  <div style={{ marginTop: 4, color: 'rgba(31,39,50,.74)' }}>{s.why}</div>
                </li>
              )
            })}
          </ul>
          <button className='agent-book-action-btn primary' onClick={onDone} style={{ marginTop: 10 }}>
            <CheckCircle2 size={16} />
            标记：我已完成该实验
          </button>
        </section>
      </div>
    </div>
  )
}

function EvolutionRouterLab({ onDone }: { onDone: () => void }) {
  const cases = useMemo(() => {
    return [
      {
        id: 'hallucination',
        title: '案例 A：客服退款时编造不存在的订单状态（触发 veto）',
        recommended: '程序&Harness',
        why: '底线问题应优先用门禁/验证器兜住：先挡住错，再谈优化。',
      },
      {
        id: 'missing-rule',
        title: '案例 B：策略可语言化但执行不稳定（缺少明确规则与步骤）',
        recommended: 'Prompt&Skill',
        why: '可语言化流程优先写进 Skill，并配最小 diff 回归集验证。',
      },
      {
        id: 'knowledge-fact',
        title: '案例 C：经常记错用户的偏好/事实（需要可更新事实源）',
        recommended: '经验知识库',
        why: '事实类信息优先进入结构化知识库/记忆存储，而不是堆 prompt。',
      },
      {
        id: 'hard-generalization',
        title: '案例 D：跨域泛化能力弱（示例之外表现差）',
        recommended: '模型参数',
        why: '当问题不再是规则/知识，而是高维策略泛化，才考虑训练写入参数。',
      },
    ]
  }, [])

  const [selectedCase, setSelectedCase] = useState(cases[0].id)
  const [choice, setChoice] = useState<'经验知识库' | 'Prompt&Skill' | '程序&Harness' | '模型参数'>('程序&Harness')

  const c = cases.find((x) => x.id === selectedCase) ?? cases[0]
  const ok = choice === c.recommended

  const plan = useMemo(() => {
    const base = {
      verify: ['结果验证：能否用真值/工具返回证明“真的改对了”', '过程验证：是否遵守权限/步骤/工具契约', '质量验证：用 Rubric 看表达与策略是否达标'],
      sets: ['边界集：这类失败必须被修好（分数要上升）', '保留集：历史不许退化（否则必须回滚）'],
      rollback: ['最小 diff：一次只改一个变量', '回滚开关：一键切回上版本（Prompt/Skill/代码/模型）'],
    }

    const extra: Record<string, string[]> = {
      '经验知识库': ['把事实写成结构化条目（带来源/时间/置信度）', '冲突处理优先在检索排序阶段，避免不可逆覆盖'],
      'Prompt&Skill': ['把流程写成可复用 Skill：输入/输出/边界/反例', '更新必须带回归：边界集+保留集'],
      '程序&Harness': ['把 veto/门禁写成代码：结构化校验 + 显式拒绝', '验证器与修改者隔离，保证可信根'],
      '模型参数': ['先保证数据与环境可信：奖励与仿真不能骗人', '训练后必须回归到保留集，并可灰度'],
    }

    return { ...base, extra: extra[choice] ?? [] }
  }, [choice])

  return (
    <div>
      <SectionTitle icon={SlidersHorizontal} title='选择：失败案例与更新载体' />
      <div className='agent-book-grid'>
        <section className='agent-book-card'>
          <h3>失败案例</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
            {cases.map((x) => (
              <button key={x.id} className={`agent-book-action-btn ${x.id === selectedCase ? 'primary' : ''}`} onClick={() => setSelectedCase(x.id)}>
                {x.title.split('：')[0]}
              </button>
            ))}
          </div>
          <div className='agent-book-callout'>
            <b>{c.title}</b>
            <div style={{ marginTop: 6, color: 'rgba(31,39,50,.78)' }}>推荐更新载体：{c.recommended}</div>
            <div className='agent-book-footnote' style={{ marginTop: 6 }}>{c.why}</div>
          </div>
        </section>

        <section className='agent-book-card'>
          <h3>你选择的更新载体</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
            {(['经验知识库', 'Prompt&Skill', '程序&Harness', '模型参数'] as const).map((t) => (
              <button key={t} className={`agent-book-action-btn ${t === choice ? 'primary' : ''}`} onClick={() => setChoice(t)}>
                {t}
              </button>
            ))}
          </div>
          <div className='agent-book-footnote'>提示：这是“路由”练习，真实项目可能组合多种载体，但必须能解释“先后顺序”。</div>

          <div className='agent-book-callout' style={{ marginTop: 12, borderColor: ok ? 'rgba(16,185,129,0.26)' : 'rgba(245,158,11,0.26)', background: ok ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)' }}>
            <b>判定：</b>
            {ok ? '符合书中推荐路由。' : '与推荐路由不同，但只要你能用三层验证 + 回滚证明有效，仍可能成立。'}
          </div>
        </section>
      </div>

      <hr className='agent-book-divider' />

      <SectionTitle icon={Target} title='输出：三层验证 + 集合策略 + 回滚建议' />
      <div className='agent-book-grid'>
        <section className='agent-book-card'>
          <h3>三层验证</h3>
          <ul>{plan.verify.map((x) => <li key={x}>{x}</li>)}</ul>
        </section>
        <section className='agent-book-card'>
          <h3>边界集 / 保留集</h3>
          <ul>{plan.sets.map((x) => <li key={x}>{x}</li>)}</ul>
        </section>
        <section className='agent-book-card'>
          <h3>回滚与发布纪律</h3>
          <ul>{plan.rollback.map((x) => <li key={x}>{x}</li>)}</ul>
        </section>
        <section className='agent-book-card'>
          <h3>载体特有建议</h3>
          <ul>{plan.extra.map((x) => <li key={x}>{x}</li>)}</ul>
          <button className='agent-book-action-btn primary' onClick={onDone} style={{ marginTop: 10 }}>
            <CheckCircle2 size={16} />
            标记：我已完成该实验
          </button>
        </section>
      </div>
    </div>
  )
}

export default function AgentBookExperiments({ initialExperiment, go }: Props) {
  const [active, setActive] = useState<AgentBookLabId>(() => toLabId(initialExperiment))
  const [progress, setProgress] = useState(() => readProgress())

  useEffect(() => {
    setActive(toLabId(initialExperiment))
  }, [initialExperiment])

  useEffect(() => {
    updateQueryExperiment(active)
  }, [active])

  useEffect(() => {
    const onChange = () => setProgress(readProgress())
    window.addEventListener('genai-progress-change', onChange)
    return () => window.removeEventListener('genai-progress-change', onChange)
  }, [])

  const meta = labs.find((l) => l.id === active) ?? labs[0]

  const onDone = () => {
    markLabDone(active, meta.relatedChapters)
    setProgress(readProgress())
  }

  return (
    <div className='agent-book-scope'>
      <header className='agent-book-hero'>
        <div>
          <h1>Agent Book · 实验（浏览器内机制模拟）</h1>
          <p>
            这些实验都是“机制/公式/策略”的静态仿真：不做任何外部网络调用，不触碰真实模型或业务系统。
          </p>
        </div>
        <div className='agent-book-hero-actions'>
          <span className='agent-book-pill'>
            <FlaskConical size={16} />
            <b>6</b> 个实验
          </span>
          <button className='agent-book-action-btn' onClick={() => go('agent-book')}>
            <BookOpen size={16} />
            返回课程
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      <div className='agent-book-callout'>
        <b>引用声明：</b>
        {agentBookDisclaimer}
      </div>

      <div className='agent-book-shell' style={{ marginTop: 14 }}>
        <aside className='agent-book-rail'>
          <h2>实验目录</h2>
          <div className='agent-book-rail-sub'>支持深链：?page=agent-book-lab&experiment=kv-cache</div>
          <nav>
            {labs.map((l) => {
              const stage = progress[agentBookLabProgressKey(l.id)] ?? 0
              return (
                <button key={l.id} className={`agent-book-nav-btn ${l.id === active ? 'active' : ''}`} onClick={() => setActive(l.id)}>
                  <span className='left'>
                    <b>{l.id}</b>
                    <span>{l.title}</span>
                  </span>
                  <span className='right'>
                    <span className='agent-book-stage'>{stageLabel(stage)}</span>
                  </span>
                </button>
              )
            })}
          </nav>
        </aside>

        <article className='agent-book-main'>
          <div className='agent-book-main-header'>
            <div>
              <h2>{meta.title}</h2>
              <div className='agent-book-subtitle'>{meta.subtitle}</div>
              <div className='agent-book-footnote'>关联章节：{meta.relatedChapters.join('、')}（完成实验会把这些章节标记为“已进入实验”）</div>
            </div>
            <div className='agent-book-actions'>
              <button className='agent-book-action-btn primary' onClick={onDone}>
                <CheckCircle2 size={16} />
                标记完成
              </button>
              <button className='agent-book-action-btn' onClick={() => go('agent-book-review')}>
                <BookOpen size={16} />
                去做评审卡
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          <hr className='agent-book-divider' />

          {active === 'harness-diagnose' && <HarnessDiagnoseLab onDone={onDone} />}
          {active === 'kv-cache' && <KVCacheLab onDone={onDone} />}
          {active === 'status-bar' && <StatusBarLab onDone={onDone} />}
          {active === 'pass-at-k' && <PassAtKLab onDone={onDone} />}
          {active === 'new-info-criterion' && <NewInfoCriterionLab onDone={onDone} />}
          {active === 'evolution-router' && <EvolutionRouterLab onDone={onDone} />}

          <div className='agent-book-footnote' style={{ marginTop: 14 }}>
            实验深链示例：
            <code style={{ marginLeft: 8 }}>?page=agent-book-lab&amp;experiment={active}</code>
          </div>
        </article>
      </div>
    </div>
  )
}
