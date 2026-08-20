import { useMemo, useState } from 'react'
import { Play, RotateCcw, StepForward } from 'lucide-react'
import { markProgress } from '../../progress'
import { clamp } from './math'

export function GradientDescentLab({ nodeId }: { nodeId?: string }) {
  const [lr, setLr] = useState(.25)
  const [momentum, setMomentum] = useState(.2)
  const [initial, setInitial] = useState(4)
  const [explode, setExplode] = useState(false)
  const [points, setPoints] = useState<number[]>([4])
  const [velocity, setVelocity] = useState(0)
  const x = points[points.length - 1]
  const gradient = 2 * x * (explode ? 8 : 1)
  const status = Math.abs(x) < .08 ? '收敛' : Math.abs(x) > 20 ? '发散' : points.length > 4 && Math.sign(points.at(-1) ?? 0) !== Math.sign(points.at(-2) ?? 0) ? '震荡' : '迭代中'
  const step = () => { const nextVelocity = momentum * velocity + gradient; const next = clamp(x - lr * nextVelocity, -50, 50); setVelocity(nextVelocity); setPoints((old) => [...old, next].slice(-24)); if (nodeId) markProgress(nodeId, 3) }
  const runSix = () => {
    let nextX = x
    let nextVelocity = velocity
    const added: number[] = []
    for (let i = 0; i < 6; i += 1) {
      const nextGradient = 2 * nextX * (explode ? 8 : 1)
      nextVelocity = momentum * nextVelocity + nextGradient
      nextX = clamp(nextX - lr * nextVelocity, -50, 50)
      added.push(nextX)
    }
    setVelocity(nextVelocity)
    setPoints((old) => [...old, ...added].slice(-24))
    if (nodeId) markProgress(nodeId, 3)
  }
  const reset = () => { setPoints([initial]); setVelocity(0) }
  return <div className='foundation-console two-col'><section className='control-panel'><h3>优化器旋钮</h3><label>学习率 η <b>{lr.toFixed(2)}</b><input type='range' min='.01' max='1.5' step='.01' value={lr} onChange={(event) => setLr(Number(event.target.value))} /></label><label>动量 β <b>{momentum.toFixed(2)}</b><input type='range' min='0' max='.95' step='.05' value={momentum} onChange={(event) => setMomentum(Number(event.target.value))} /></label><label>初始点 <b>{initial.toFixed(1)}</b><input type='range' min='-6' max='6' step='.2' value={initial} onChange={(event) => { setInitial(Number(event.target.value)); setPoints([Number(event.target.value)]); setVelocity(0) }} /></label><label className='toggle-row'><input type='checkbox' checked={explode} onChange={(event) => setExplode(event.target.checked)} />注入梯度爆炸 ×8</label><div className='console-actions'><button onClick={step}><StepForward />单步</button><button onClick={runSix}><Play />运行 6 步</button><button className='secondary' onClick={reset}><RotateCcw />重置</button></div></section><section className='output-panel'><div className={`status-banner ${status === '收敛' ? 'pass' : status === '发散' ? 'fail' : 'warn'}`}><b>{status}</b><span>x={x.toFixed(4)} · |grad|={Math.abs(gradient).toFixed(3)}</span></div><div className='loss-curve' aria-label='一维损失曲线'>{points.map((value, index) => <i key={`point-${value}`} style={{ left: `${index / Math.max(1, points.length - 1) * 96 + 2}%`, bottom: `${Math.min(92, value * value / 36 * 90 + 4)}%` }} title={`step ${index}: x=${value.toFixed(3)}`} />)}</div><div className='step-log'>{points.slice(-8).map((value, index) => <span key={`step-${value}`}><b>{points.length - Math.min(8, points.length) + index}</b>x={value.toFixed(3)} · L={(value * value).toFixed(3)}</span>)}</div><div className='diagnostic-callout'>{status === '发散' ? '学习率或梯度规模过大：先检查 grad_norm，再降学习率或做 gradient clipping。' : status === '震荡' ? '跨越最优点：降低学习率或动量；观察符号反复变化。' : '同参数与相同步数得到相同轨迹；这是确定性教学计算。'}</div></section></div>
}

export function MLPForwardLab({ nodeId }: { nodeId?: string }) {
  const [inputDim, setInputDim] = useState(4); const [hidden, setHidden] = useState(8); const [layers, setLayers] = useState(2); const [activation, setActivation] = useState<'ReLU' | 'GELU' | 'SiLU'>('ReLU'); const [input, setInput] = useState(-.4); const [run, setRun] = useState(false)
  const result = useMemo(() => { let value = input; let dead = 0; const values: number[] = []; for (let i = 0; i < layers; i += 1) { const linear = value * (.7 + i * .08) - .05; value = activation === 'ReLU' ? Math.max(0, linear) : activation === 'GELU' ? .5 * linear * (1 + Math.tanh(.797884 * (linear + .044715 * linear ** 3))) : linear / (1 + Math.exp(-linear)); if (value === 0) dead += 1; values.push(value) } const params = inputDim * hidden + hidden + Math.max(0, layers - 1) * (hidden * hidden + hidden) + hidden * inputDim + inputDim; return { value, dead: dead / layers, values, params, flops: params * 2 } }, [inputDim, hidden, layers, activation, input])
  return <div className='foundation-console two-col'><section className='control-panel'><h3>MLP 结构</h3><label>输入维度 <b>{inputDim}</b><input type='range' min='2' max='16' value={inputDim} onChange={(event) => { setInputDim(Number(event.target.value)); setRun(false) }} /></label><label>隐藏维度 <b>{hidden}</b><input type='range' min='2' max='32' value={hidden} onChange={(event) => { setHidden(Number(event.target.value)); setRun(false) }} /></label><label>层数 <b>{layers}</b><input type='range' min='1' max='6' value={layers} onChange={(event) => { setLayers(Number(event.target.value)); setRun(false) }} /></label><label>激活函数<select value={activation} onChange={(event) => { setActivation(event.target.value as typeof activation); setRun(false) }}><option>ReLU</option><option>GELU</option><option>SiLU</option></select></label><label>示例输入 <b>{input.toFixed(1)}</b><input type='range' min='-2' max='2' step='.1' value={input} onChange={(event) => { setInput(Number(event.target.value)); setRun(false) }} /></label><div className='console-actions'><button onClick={() => { setRun(true); if (nodeId) markProgress(nodeId, 3) }}><Play />运行前向</button><button className='secondary' onClick={() => { setInputDim(4); setHidden(8); setLayers(2); setActivation('ReLU'); setInput(-.4); setRun(false) }}><RotateCcw />重置</button></div></section><section className='output-panel'><div className='dimension-flow'><span>[B,{inputDim}]</span><b>× W₁</b><span>[B,{hidden}]</span>{Array.from({ length: Math.max(0, layers - 1) }, (_, index) => ({ id: `hidden-${index + 1}` })).map((layer) => <span key={layer.id}>φ → [{hidden}]</span>)}<b>× W₂</b><span>[B,{inputDim}]</span></div><div className='metric-row-foundation'><div><span>参数量</span><b>{run ? result.params.toLocaleString() : '—'}</b></div><div><span>FLOPs 估算</span><b>{run ? result.flops.toLocaleString() : '—'}</b></div><div><span>死神经元比例</span><b>{run ? `${(result.dead * 100).toFixed(0)}%` : '—'}</b></div><div><span>前向值</span><b>{run ? result.value.toFixed(4) : '—'}</b></div></div><div className='activation-trace'>{result.values.map((value, index) => ({ value, id: `activation-${index + 1}`, label: index + 1 })).map((item) => <i key={item.id} style={{ height: run ? `${Math.min(100, Math.abs(item.value) * 100 + 5)}%` : '5%' }}><span>L{item.label}<br />{run ? item.value.toFixed(2) : '?'}</span></i>)}</div><div className='diagnostic-callout'>{activation === 'ReLU' && input < 0 ? '负输入可能进入 ReLU 死区；观察死神经元比例。' : 'GELU/SiLU 是平滑门控，仍需结合 kernel、吞吐和验证集评审。'} 无激活时，多层线性可合并为一层，表达能力不会因堆层自动增加。</div></section></div>
}
