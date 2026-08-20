import { useMemo, useState } from 'react'
import { AlertCircle, ArrowRight, BrainCircuit, CheckCircle2, Dices, Eye, Focus, Image as ImageIcon, Layers3, Lightbulb, Network, RefreshCw, ScanLine, Sparkles } from 'lucide-react'

const labItems = [
  { id: 'token', label: 'Token 切分', icon: ScanLine },
  { id: 'sample', label: '采样策略', icon: Dices },
  { id: 'attention', label: 'Attention', icon: Network },
  { id: 'context', label: '上下文预算', icon: Layers3 },
  { id: 'diffusion', label: '扩散去噪', icon: Sparkles },
  { id: 'image', label: '图像参数', icon: ImageIcon },
]

function approximateTokens(text: string) {
  const chunks = text.match(/[\u3400-\u9fff]|[A-Za-z]+(?:'[A-Za-z]+)?|\d+|[^\s]/g) ?? []
  return chunks.flatMap((chunk) => {
    if (/^[A-Za-z]/.test(chunk) && chunk.length > 7) return [chunk.slice(0, 5), `##${chunk.slice(5)}`]
    if (/^\d{5,}$/.test(chunk)) return chunk.match(/.{1,3}/g) ?? [chunk]
    return [chunk]
  })
}

function TokenLab() {
  const [text, setText] = useState('策略产品经理 designs reliable AI systems.')
  const tokens = useMemo(() => approximateTokens(text), [text])
  const context = 4096
  return <div className='lab-panel token-lab'>
    <header><div><span className='lab-kicker'>LLM · INPUT LENS</span><h2>概念级 Token 切分</h2></div><span className='concept-badge'>教学近似</span></header>
    <p className='lab-intro'>观察字符如何变成模型接口中的离散单元。真实结果必须以具体模型的 tokenizer 为准。</p>
    <label className='field-label'>输入中文或英文</label>
    <textarea value={text} maxLength={280} onChange={(e) => setText(e.target.value)} />
    <div className='token-stage'>{tokens.length ? tokens.map((token, i) => <span key={`${token}-${i}`} style={{ '--i': i } as React.CSSProperties}>{token}</span>) : <em>输入内容后查看切分</em>}</div>
    <div className='metric-strip'>
      <div><small>近似 TOKEN</small><strong>{tokens.length}</strong></div>
      <div><small>字符数</small><strong>{text.length}</strong></div>
      <div><small>4K 窗口占用</small><strong>{((tokens.length / context) * 100).toFixed(2)}%</strong></div>
      <div className='meter'><i style={{ width: `${Math.max(1, tokens.length / context * 100)}%` }} /></div>
    </div>
    <div className='lab-note'><AlertCircle size={16} /><span><b>边界：</b>这不是任何商业模型的真实词表。空格、罕见词、代码和数字在实际 tokenizer 中可能完全不同。</span></div>
  </div>
}

const candidates = [
  { token: '方案', logit: 3.6 }, { token: '评估', logit: 3.1 }, { token: '实验', logit: 2.65 },
  { token: '系统', logit: 2.25 }, { token: '流程', logit: 1.85 }, { token: '故事', logit: 0.9 },
]

function SamplingLab() {
  const [temperature, setTemperature] = useState(0.8)
  const [topP, setTopP] = useState(0.9)
  const probs = useMemo(() => {
    const exps = candidates.map((c) => Math.exp(c.logit / temperature))
    const sum = exps.reduce((a, b) => a + b, 0)
    const raw = candidates.map((c, i) => ({ ...c, p: exps[i] / sum })).sort((a, b) => b.p - a.p)
    let cumulative = 0
    let reached = false
    const kept = raw.map((item) => {
      const keep = !reached
      if (keep) { cumulative += item.p; if (cumulative >= topP) reached = true }
      return { ...item, keep }
    })
    const keptSum = kept.filter((x) => x.keep).reduce((acc, x) => acc + x.p, 0)
    return kept.map((x) => ({ ...x, normalized: x.keep ? x.p / keptSum : 0 }))
  }, [temperature, topP])
  return <div className='lab-panel sample-lab'>
    <header><div><span className='lab-kicker'>LLM · OUTPUT SCOPE</span><h2>下一 Token 采样台</h2></div><span className='live-dot'>实时归一化</span></header>
    <p className='lab-intro'>上下文：“我们下一步需要做产品___”。调节分布，而不是给模型增加知识。</p>
    <div className='control-row'>
      <label><span>Temperature <b>{temperature.toFixed(1)}</b></span><input type='range' min='.2' max='1.6' step='.1' value={temperature} onChange={(e) => setTemperature(+e.target.value)} /></label>
      <label><span>Top-p <b>{topP.toFixed(2)}</b></span><input type='range' min='.35' max='1' step='.05' value={topP} onChange={(e) => setTopP(+e.target.value)} /></label>
    </div>
    <div className='prob-chart'>{probs.map((item) => <div className={`prob-row ${item.keep ? '' : 'cut'}`} key={item.token}>
      <span>{item.token}</span><div><i style={{ width: `${item.normalized * 100}%` }} /></div><b>{(item.normalized * 100).toFixed(1)}%</b><small>{item.keep ? '候选' : '截断'}</small>
    </div>)}</div>
    <div className='insight-card'><Lightbulb size={18} /><p><b>{temperature < .6 ? '高确定性' : temperature > 1.1 ? '高多样性' : '平衡区间'}</b>：{temperature < .6 ? '头部候选被明显放大，适合稳定格式，但可能模板化。' : temperature > 1.1 ? '尾部概率被抬高，创意增加，同时跑题风险上升。' : '保留一定变化，仍以高分候选为主。'} Top-p 再决定参与抽样的最小累计概率集合。</p></div>
  </div>
}

const attentionTokens = ['策略', '产品', '需要', '验证', '模型', '输出']
const attentionMatrix = [
  [1, .62, .15, .18, .26, .12], [.7, 1, .24, .36, .42, .2], [.18, .26, 1, .65, .35, .24],
  [.2, .33, .72, 1, .55, .68], [.28, .46, .32, .58, 1, .76], [.16, .25, .2, .7, .82, 1],
]

function AttentionLab() {
  const [selected, setSelected] = useState(3)
  return <div className='lab-panel attention-lab'>
    <header><div><span className='lab-kicker'>LLM · RELATION SCOPE</span><h2>Attention 关系显微镜</h2></div><Network size={24} /></header>
    <p className='lab-intro'>点击一个 token，把它当作 Query；横向观察它与各 Key 的教学热力。颜色越深表示本例权重越高。</p>
    <div className='attention-sentence'>{attentionTokens.map((token, i) => <button key={token} className={selected === i ? 'active' : ''} onClick={() => setSelected(i)}>{token}</button>)}</div>
    <div className='qkv-strip'><span><b>Q</b>“{attentionTokens[selected]}”正在找什么？</span><ArrowRight size={16} /><span><b>K</b>每个位置提供匹配索引</span><ArrowRight size={16} /><span><b>V</b>按权重汇总内容</span></div>
    <div className='heat-row'>{attentionTokens.map((token, i) => <div key={token} style={{ '--heat': attentionMatrix[selected][i] } as React.CSSProperties}><i /><b>{token}</b><span>{Math.round(attentionMatrix[selected][i] * 100)}</span></div>)}</div>
    <div className='lab-note'><AlertCircle size={16} /><span>此矩阵为概念演示，不来自真实模型；注意力权重也不等同于完整因果解释。</span></div>
  </div>
}

function ContextLab() {
  const [windowSize, setWindowSize] = useState(8192)
  const [budget, setBudget] = useState({ system: 1200, history: 2600, rag: 2800, output: 1600 })
  const total = Object.values(budget).reduce((a, b) => a + b, 0)
  const over = total > windowSize
  const labels: Record<string, string> = { system: '系统提示', history: '历史对话', rag: 'RAG 文档', output: '输出预算' }
  const colors: Record<string, string> = { system: '#ef7a62', history: '#f4aa72', rag: '#6d7ce8', output: '#9a72d8' }
  return <div className='lab-panel context-lab'>
    <header><div><span className='lab-kicker'>LLM · BUDGET SCOPE</span><h2>上下文预算分配器</h2></div><span className={over ? 'danger-pill' : 'safe-pill'}>{over ? `超出 ${total - windowSize}` : `余量 ${windowSize - total}`} tokens</span></header>
    <div className='window-switch'><span>Context window</span>{[4096, 8192, 16384].map((v) => <button className={windowSize === v ? 'active' : ''} key={v} onClick={() => setWindowSize(v)}>{v / 1024}K</button>)}</div>
    <div className={`budget-bar ${over ? 'over' : ''}`}>{Object.entries(budget).map(([key, value]) => <i key={key} style={{ width: `${value / windowSize * 100}%`, background: colors[key] }} title={labels[key]} />)}</div>
    <div className='budget-controls'>{Object.entries(budget).map(([key, value]) => <label key={key}><span><i style={{ background: colors[key] }} />{labels[key]}<b>{value}</b></span><input type='range' min='200' max='6000' step='100' value={value} onChange={(e) => setBudget({ ...budget, [key]: +e.target.value })} /></label>)}</div>
    <div className={`budget-feedback ${over ? 'error' : ''}`}>{over ? <AlertCircle /> : <CheckCircle2 />}<p><b>{over ? '窗口已超限，不能“挤进去再说”' : '预算可执行'}</b><span>{over ? '减少历史 / RAG 召回、压缩系统提示或下调输出上限；截断策略必须显式。' : '仍需为用户输入、工具结果和 tokenizer 偏差保留安全余量。'}</span></p></div>
  </div>
}

function seeded(seed: number, i: number) { const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453; return x - Math.floor(x) }

function DiffusionLab() {
  const [timestep, setTimestep] = useState(38)
  const clarity = 100 - timestep
  return <div className='lab-panel diffusion-lab'>
    <header><div><span className='lab-kicker'>IMAGE · DENOISE SCOPE</span><h2>从噪声到图像：概念模拟</h2></div><span className='concept-badge'>非真实 AI 输出</span></header>
    <p className='lab-intro'>拖动时间步：t 越大越接近随机噪声，t 越小结构越清晰。本可视化只表达过程直觉。</p>
    <div className='diffusion-workbench'>
      <div className='simulated-image' style={{ '--noise-opacity': timestep / 100, '--scene-blur': `${timestep / 16}px` } as React.CSSProperties}>
        <div className='sim-sun' /><div className='sim-mountain m1' /><div className='sim-mountain m2' /><div className='sim-ground' /><div className='sim-river' />
        <div className='noise-grid'>{Array.from({ length: 160 }, (_, i) => <i key={i} style={{ background: `hsl(${190 + seeded(17, i) * 100} 22% ${20 + seeded(31, i) * 70}%)`, opacity: seeded(49, i) }} />)}</div>
        <span>概念模拟 · t={timestep}</span>
      </div>
      <div className='diffusion-readout'><div><small>STRUCTURE</small><strong>{clarity}%</strong></div><div><small>NOISE</small><strong>{timestep}%</strong></div><p>{timestep > 70 ? '高噪声区：仅保留弱统计信号，尚无稳定构图。' : timestep > 30 ? '中间态：大结构出现，纹理与边缘仍在反复修正。' : '低噪声区：结构基本稳定，主要补充边缘与局部细节。'}</p></div>
    </div>
    <label className='time-slider'><span>清晰端 t=0</span><input type='range' min='0' max='100' value={timestep} onChange={(e) => setTimestep(+e.target.value)} /><span>噪声端 t=100</span></label>
    <div className='phase-row'><span className={timestep > 66 ? 'active' : ''}>01 随机起点</span><span className={timestep <= 66 && timestep > 25 ? 'active' : ''}>02 结构成形</span><span className={timestep <= 25 ? 'active' : ''}>03 细节收敛</span></div>
  </div>
}

function ImageParameterLab() {
  const [steps, setSteps] = useState(28)
  const [cfg, setCfg] = useState(7)
  const [seed, setSeed] = useState(42)
  const [denoise, setDenoise] = useState(.55)
  const [parts, setParts] = useState({ subject: true, scene: true, composition: true, style: true })
  const randomize = () => setSeed((current) => (current * 73 + 41) % 10000)
  const composition = seed % 3
  const warnings = [steps < 14 && '步数偏低：速度快，但边缘与纹理可能未收敛。', steps > 46 && '步数偏高：边际收益很小，延迟与成本继续上升。', cfg < 4 && 'CFG 偏低：画面更自由，但提示遵循度可能不足。', cfg > 12 && 'CFG 偏高：容易过饱和、轮廓僵硬或出现伪影。', denoise > .75 && '重绘强度高：原图结构和身份更容易漂移。'].filter(Boolean)
  return <div className='lab-panel image-param-lab'>
    <header><div><span className='lab-kicker'>IMAGE · CONTROL DECK</span><h2>图像参数驾驶舱</h2></div><button className='icon-button' onClick={randomize}><RefreshCw size={16} />换 Seed</button></header>
    <div className='image-deck'>
      <div className={`composition-card comp-${composition}`}>
        <div className='poster-sun' /><div className='poster-object'><Eye /></div><div className='poster-shadow' />
        <div className='poster-copy'><small>SEED / {seed}</small><strong>{parts.subject ? '未来感研究仪器' : '未指定主体'}</strong><span>{parts.scene ? '静置于明亮实验室' : '开放场景'} · {parts.style ? '编辑插画' : '默认风格'}</span></div>
        <i className='grain' style={{ opacity: Math.max(0, .3 - steps / 200) }} />
      </div>
      <div className='parameter-stack'>
        <label><span>Steps <b>{steps}</b></span><input type='range' min='6' max='60' value={steps} onChange={(e) => setSteps(+e.target.value)} /></label>
        <label><span>CFG <b>{cfg.toFixed(1)}</b></span><input type='range' min='1' max='18' step='.5' value={cfg} onChange={(e) => setCfg(+e.target.value)} /></label>
        <label><span>Seed <b>{seed}</b></span><input type='range' min='1' max='9999' value={seed} onChange={(e) => setSeed(+e.target.value)} /></label>
        <label><span>Denoise strength <b>{denoise.toFixed(2)}</b></span><input type='range' min='0' max='1' step='.05' value={denoise} onChange={(e) => setDenoise(+e.target.value)} /></label>
      </div>
    </div>
    <div className='prompt-builder'><span>Prompt 结构</span>{Object.entries(parts).map(([key, value]) => <button className={value ? 'active' : ''} key={key} onClick={() => setParts({ ...parts, [key]: !value })}>{({ subject: '主体', scene: '场景', composition: '构图', style: '风格' } as Record<string, string>)[key]}</button>)}</div>
    <div className='state-explainer'>{warnings.length ? warnings.map((text) => <p key={String(text)}><AlertCircle size={15} />{text}</p>) : <p className='good'><CheckCircle2 size={15} />当前参数处于常用探索区间；仍需按具体模型与业务样本评测。</p>}</div>
    <div className='lab-note'><Focus size={16} /><span>不同 Seed 会改变模拟卡片的构图位置；真实生产复现还需固定模型、采样器、尺寸与软件版本。</span></div>
  </div>
}

export default function Experiments() {
  const requestedLab = new URLSearchParams(window.location.search).get('experiment')
  const [active, setActive] = useState(labItems.some((item) => item.id === requestedLab) ? requestedLab! : 'token')
  const openLab = (id: string) => {
    setActive(id)
    const url = new URL(window.location.href)
    url.searchParams.set('experiment', id)
    window.history.replaceState({}, '', url)
  }
  return <section className='experiments-page'>
    <div className='section-heading'><span className='eyebrow'>INTERACTIVE LAB</span><h1>把参数直觉，变成可操作的判断</h1><p>所有实验都在浏览器本地运行，不调用模型服务。它们用于建立产品心智，不代替具体模型压测。</p></div>
    <div className='lab-tabs'>{labItems.map(({ id, label, icon: Icon }) => <button key={id} className={active === id ? 'active' : ''} onClick={() => openLab(id)}><Icon size={17} />{label}</button>)}</div>
    {active === 'token' && <TokenLab />}{active === 'sample' && <SamplingLab />}{active === 'attention' && <AttentionLab />}{active === 'context' && <ContextLab />}{active === 'diffusion' && <DiffusionLab />}{active === 'image' && <ImageParameterLab />}
    <div className='lab-boundary'><BrainCircuit size={22} /><p><b>实验边界</b><span>此处的 token、注意力、概率与去噪图均为通用教学模拟，不对应任何商业模型内部实现。训练会更新参数；这些实验模拟的是推理阶段的输入、控制与可视化。</span></p></div>
  </section>
}
