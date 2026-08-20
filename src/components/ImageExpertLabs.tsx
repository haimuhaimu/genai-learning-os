import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, GitBranch, Image, Info, Layers3, Sigma, SlidersHorizontal, Sparkles, Timer, WandSparkles } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const samplerConfig = {
  DDPM: { speed: .55, quality: .88, lowStep: .45, stochastic: true },
  DDIM: { speed: .82, quality: .82, lowStep: .66, stochastic: false },
  Euler: { speed: .9, quality: .84, lowStep: .72, stochastic: false },
  'DPM-Solver': { speed: .96, quality: .91, lowStep: .92, stochastic: false },
  'Rectified Flow': { speed: 1, quality: .9, lowStep: .95, stochastic: false },
}
const schedules: Record<string, { quality: number; stability: number }> = { Linear: { quality: .82, stability: .76 }, Cosine: { quality: .9, stability: .88 }, Karras: { quality: .92, stability: .91 } }
const targets: Record<string, { quality: number; detail: number }> = { 'ε-pred': { quality: .84, detail: .82 }, 'v-pred': { quality: .91, detail: .88 }, 'x0-pred': { quality: .87, detail: .94 } }

export function DiffusionFlowLab() {
  const [sampler, setSampler] = useState<keyof typeof samplerConfig>('DPM-Solver')
  const [schedule, setSchedule] = useState('Karras')
  const [target, setTarget] = useState('v-pred')
  const [steps, setSteps] = useState(20)
  const [cfg, setCfg] = useState(7)
  const sample = samplerConfig[sampler]
  const stepSaturation = 1 - Math.exp(-steps / (sample.lowStep * 16 + 5))
  const cfgAdherence = 1 - Math.exp(-cfg / 4)
  const cfgPenalty = Math.max(0, cfg - 10) * .035
  const quality = Math.max(20, Math.min(98, 100 * sample.quality * schedules[schedule].quality * targets[target].quality * (.55 + .5 * stepSaturation) - cfgPenalty * 100))
  const speed = Math.max(.25, 1000 / (steps * (sampler === 'DDPM' ? 58 : sampler === 'DPM-Solver' ? 43 : 48)))
  const stability = Math.max(25, Math.min(98, 100 * schedules[schedule].stability * (.68 + .34 * stepSaturation) - cfgPenalty * 75))
  const diversity = Math.max(18, Math.min(96, 90 - cfg * 3 + (sample.stochastic ? 12 : 0)))
  const artifact = Math.max(3, Math.min(78, 46 * (1 - stepSaturation) + Math.max(0, cfg - 9) * 4 + (target === 'x0-pred' && steps < 10 ? 10 : 0)))
  const chartData = [
    { name: '质量', score: quality }, { name: '稳定性', score: stability }, { name: '提示遵循', score: cfgAdherence * 100 }, { name: '多样性', score: diversity }, { name: '伪影风险', score: artifact },
  ]
  return <div className='expert-lab-panel' id='diffusion-flow-lab'>
    <header className='lab-console-head'><div><span>LAB E · DIFFUSION / FLOW</span><h2>采样路径与质量-速度实验</h2><p>动态观察 sampler、schedule、prediction target、steps 与 CFG 的联合作用。</p></div><Sparkles /></header>
    <div className='diffusion-console'>
      <div className='diffusion-controls'>
        <SelectField label='Sampler / path' value={sampler} values={Object.keys(samplerConfig)} onChange={(v) => setSampler(v as keyof typeof samplerConfig)} />
        <SelectField label='Noise schedule' value={schedule} values={Object.keys(schedules)} onChange={setSchedule} />
        <SelectField label='Prediction target' value={target} values={Object.keys(targets)} onChange={setTarget} />
        <RangeField label='Steps / NFE（近似）' value={steps} min={2} max={60} step={1} onChange={setSteps} />
        <RangeField label='CFG guidance' value={cfg} min={1} max={18} step={.5} onChange={setCfg} />
        <div className='path-summary'><GitBranch /><p><b>{sampler}</b><span>{sample.stochastic ? '含随机采样路径，探索性更强。' : '当前设定按确定性路径教学近似。'} {steps < 8 ? '极低步数，误差与伪影风险显著。' : steps > 40 ? '步数较高，边际收益通常有限。' : '处于常见生产探索区间。'}</span></p></div>
      </div>
      <div className='generation-readout'>
        <div className='concept-image' style={{ '--artifact': artifact / 100, '--saturation': 1 + Math.max(0, cfg - 7) / 18, '--detail': Math.min(1, stepSaturation + .1) } as React.CSSProperties}>
          <div className='flow-orb one' /><div className='flow-orb two' /><div className='flow-object'><WandSparkles /></div><i className='artifact-grid' /><span>概念输出 · 非真实生成</span>
        </div>
        <div className='generation-kpis'><div><small>质量指数</small><b>{quality.toFixed(0)}</b></div><div><small>教学延迟</small><b>{speed.toFixed(2)}s</b></div><div><small>稳定性</small><b>{stability.toFixed(0)}</b></div><div><small>伪影风险</small><b>{artifact.toFixed(0)}%</b></div></div>
      </div>
    </div>
    <div className='chart-card compact-chart'><ResponsiveContainer width='100%' height={240}><BarChart data={chartData}><CartesianGrid strokeDasharray='3 3' /><XAxis dataKey='name' /><YAxis domain={[0, 100]} /><Tooltip /><Legend /><Bar name='概念指数' dataKey='score' fill='#6875d8' radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
    <div className='formula-block'><Sigma /><code>xₜ=αₜx₀+σₜε；CFG: ε̂=εu+s(εc−εu)；ODE Euler: xₜ₋Δ=xₜ−Δ·vθ(xₜ,t)</code><p>概念估算假设：每步 43–58ms，质量随步数指数饱和；CFG&gt;10 逐步增加伪影并降低多样性。分值仅用于展示趋势，不代表任何商业模型；prediction target 与 sampler 的真实兼容性必须查看具体模型文档。</p></div>
    {(cfg > 11 || steps < 8) && <div className='warning-inline'><AlertTriangle />{cfg > 11 ? 'CFG 过高：过饱和、硬轮廓与多样性下降风险正在上升。' : '步数过低：数值积分误差可能主导结果。'}</div>}
  </div>
}

function SelectField({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }) {
  return <label className='select-field'><span>{label}</span><select value={value} onChange={(e) => onChange(e.target.value)}>{values.map((item) => <option key={item}>{item}</option>)}</select></label>
}
function RangeField({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return <label className='range-field'><span>{label}<b>{value}</b></span><input type='range' value={value} min={min} max={max} step={step} onChange={(e) => onChange(+e.target.value)} /></label>
}

const needs = [
  { id: 'identity', label: '身份一致', icon: Image },
  { id: 'pose', label: '姿态 / 结构', icon: GitBranch },
  { id: 'style', label: '风格迁移', icon: Sparkles },
  { id: 'edit', label: '局部编辑', icon: Layers3 },
  { id: 'cheap', label: '低成本微调', icon: Timer },
] as const

type Need = typeof needs[number]['id']
const strategy: Record<Need, { primary: string; combine: string[]; data: string; cost: string; why: string; risks: string[] }> = {
  identity: { primary: 'IP-Adapter', combine: ['LoRA（长期资产）', 'Face/ID 检测', 'inpaint 修复'], data: '1–5 张参考图可零训练起步；长期一致性建议 10–30 张清洗素材训练 LoRA', cost: '低 → 中', why: '图像提示直接提供参考身份；LoRA 用于沉淀可复用主体表示。', risks: ['身份与姿态/背景耦合', '侧脸与遮挡切片漂移', '参考图权限和隐私'] },
  pose: { primary: 'ControlNet', combine: ['OpenPose / Depth', 'img2img', 'IP-Adapter（身份）'], data: '运行时结构图；通常无需为单个需求训练', cost: '中', why: '显式注入空间条件，比文本提示更适合姿态、深度和边缘约束。', risks: ['控制权重过高导致僵硬', '条件图噪声传入', '与身份控制冲突'] },
  style: { primary: 'LoRA', combine: ['IP-Adapter style', '低 CFG', '风格分类回归'], data: '约 20–100 张高一致、去重且有授权的风格素材（任务相关范围）', cost: '中', why: '低秩权重便于复用、组合和版本化，适合规模化风格资产。', risks: ['内容泄漏与过拟合', '多 LoRA 冲突', 'base 升级不兼容'] },
  edit: { primary: 'inpaint / img2img', combine: ['语义 mask', 'ControlNet', '低 denoise strength'], data: '原图 + mask；无需训练即可起步', cost: '低', why: '编辑需求首先要保留非编辑区域，局部重绘比全图再生成更可控。', risks: ['mask 边缘接缝', '高 denoise 改坏身份', '光照与纹理不连续'] },
  cheap: { primary: 'LoRA', combine: ['数据清洗', 'rank sweep', 'base + adapter 版本锁定'], data: '通常几十到数百张任务素材；质量比数量更关键', cost: '低 → 中', why: '只训练低秩增量，存储与切换成本低，适合多租户/多风格。', risks: ['小数据记忆化', '触发词污染', '量化 base 上训练/合并偏差'] },
}

export function ControlSelector() {
  const [need, setNeed] = useState<Need>('identity')
  const [strict, setStrict] = useState(75)
  const item = strategy[need]
  const additional = strict > 80 ? '建议增加自动检测 + 失败重试 + 人工确认；单一生成方法不能提供硬保证。' : strict < 45 ? '可先使用零训练适配器快速验证，无需立刻沉淀权重资产。' : '先做小样本基准，再决定是否训练长期资产。'
  return <div className='expert-lab-panel' id='control-selector'>
    <header className='lab-console-head'><div><span>LAB F · CONTROL ROUTER</span><h2>可控生成选型器</h2><p>先说清控制对象，再选择结构条件、图像提示、权重适配或局部重绘。</p></div><SlidersHorizontal /></header>
    <div className='need-selector'>{needs.map(({ id, label, icon: Icon }) => <button key={id} className={need === id ? 'active' : ''} onClick={() => setNeed(id)}><Icon />{label}</button>)}</div>
    <div className='strict-control'><RangeField label='控制严格度' value={strict} min={10} max={100} step={5} onChange={setStrict} /><span>{strict > 80 ? '接近硬约束' : strict > 55 ? '生产可控' : '创意探索'}</span></div>
    <div className='selector-result'>
      <div className='primary-strategy'><small>PRIMARY</small><strong>{item.primary}</strong><p>{item.why}</p><div><span>成本级别</span><b>{item.cost}</b></div><div><span>数据要求</span><b>{item.data}</b></div></div>
      <div className='combination-stack'><span>推荐组合</span>{item.combine.map((name, index) => <div key={name}><i>{index + 1}</i><b>{name}</b>{index < item.combine.length - 1 && <em>+</em>}</div>)}</div>
      <div className='risk-stack'><span>失败与评审</span>{item.risks.map((risk) => <p key={risk}><AlertTriangle />{risk}</p>)}<div className='selection-advice'><Info />{additional}</div></div>
    </div>
    <div className='boundary-comparison'><article><b>ControlNet</b><span>空间结构 / 姿态 / 深度</span></article><article><b>IP-Adapter</b><span>参考图语义 / 身份</span></article><article><b>LoRA / DreamBooth</b><span>可复用权重资产</span></article><article><b>img2img / inpaint</b><span>保留原图 / 局部编辑</span></article></div>
  </div>
}

export function ImagePipelineSummary() {
  const stages = useMemo(() => [{ name: 'rewrite', latency: 90 }, { name: 'planner', latency: 140 }, { name: 'base', latency: 920 }, { name: 'refiner', latency: 480 }, { name: 'upscale', latency: 260 }, { name: 'safety', latency: 110 }], [])
  const total = stages.reduce((sum, item) => sum + item.latency, 0)
  return <div className='pipeline-summary'><header><WandSparkles /><div><span>多阶段系统</span><b>总教学延迟 {total}ms + queue</b></div></header><div>{stages.map((item) => <span key={item.name}><b>{item.name}</b><small>{item.latency}ms</small></span>)}</div><p><CheckCircle2 />按阶段记录输入、输出、版本、延迟和失败码，才能避免“整链重试”放大成本。</p></div>
}
