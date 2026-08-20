import { useMemo, useState } from 'react'
import { Check, Eye, RotateCcw } from 'lucide-react'
import { markProgress } from '../../progress'
import { clamp, entropy, kl, normalize, pct, softmax } from './math'

export function SoftmaxCELab({ nodeId }: { nodeId?: string }) {
  const [text, setText] = useState('2, 1, 0')
  const [temperature, setTemperature] = useState(1)
  const [target, setTarget] = useState(0)
  const [prediction, setPrediction] = useState<'sharper' | 'flatter' | ''>('')
  const [revealed, setRevealed] = useState(false)
  const [manual, setManual] = useState('')
  const values = useMemo(() => {
    const parsed = text.split(/[ ,]+/).map(Number).filter(Number.isFinite).slice(0, 5).map((value) => clamp(value, -30, 30))
    return parsed.length >= 3 ? parsed : [2, 1, 0]
  }, [text])
  const probs = softmax(values, temperature)
  const safeTarget = Math.min(target, probs.length - 1)
  const ce = -Math.log(Math.max(1e-9, probs[safeTarget]))
  const manualPass = Math.abs(Number(manual) - ce) < 0.02
  const reveal = () => { setRevealed(true); if (nodeId) markProgress(nodeId, 3) }
  return <div className='foundation-console two-col'>
    <section className='control-panel'><h3>输入与预测</h3><label>3–5 个 logits<input value={text} onChange={(event) => setText(event.target.value)} /></label><label>温度 T <b>{temperature.toFixed(1)}</b><input type='range' min='.1' max='5' step='.1' value={temperature} onChange={(event) => { setTemperature(clamp(Number(event.target.value), .1, 5)); setRevealed(false) }} /></label><label>正确类别<select value={safeTarget} onChange={(event) => setTarget(Number(event.target.value))}>{probs.map((_, index) => <option key={`class-${['zero','one','two','three','four'][index]}`} value={index}>类别 {index}</option>)}</select></label><div className='prediction-box'><b>调高 T 后概率会？</b><button className={prediction === 'sharper' ? 'active' : ''} onClick={() => setPrediction('sharper')}>更尖锐</button><button className={prediction === 'flatter' ? 'active' : ''} onClick={() => setPrediction('flatter')}>更平滑</button></div><div className='console-actions'><button onClick={reveal}><Eye />揭晓</button><button className='secondary' onClick={() => { setText('2, 1, 0'); setTemperature(1); setTarget(0); setPrediction(''); setRevealed(false); setManual('') }}><RotateCcw />重置</button></div></section>
    <section className='output-panel'><div className='metric-row-foundation'><div><span>Entropy</span><b>{revealed ? entropy(probs).toFixed(3) : '—'}</b></div><div><span>CE = −log pᵧ</span><b>{revealed ? ce.toFixed(3) : '—'}</b></div><div><span>pᵧ</span><b>{revealed ? pct(probs[safeTarget]) : '—'}</b></div></div><div className='prob-bars'>{probs.map((value, index) => <div key={`prob-${['zero','one','two','three','four'][index]}`}><span>c{index}{index === safeTarget ? ' · y' : ''}</span><i><em style={{ width: revealed ? `${value * 100}%` : '0%' }} /></i><b>{revealed ? pct(value) : '?'}</b></div>)}</div><div className={`prediction-result ${revealed && prediction === 'flatter' ? 'pass' : revealed ? 'warn' : ''}`}>{revealed ? prediction ? prediction === 'flatter' ? '预测正确：T 越大，分布通常越平、熵越高。' : '方向相反：T 在分母，升高会缩小 logits 相对差距。' : '你跳过了趋势预测；先预测再实验能强化因果直觉。' : '结果已隐藏。先预测趋势，再点击揭晓。'}</div><div className='manual-check'><label>手算 CE（误差 ±0.02）<input type='number' step='.001' value={manual} onChange={(event) => setManual(event.target.value)} /></label><span className={manualPass ? 'pass' : ''}>{manual ? manualPass ? <><Check />通过</> : '继续检查 −ln(pᵧ)' : '等待输入'}</span></div></section>
  </div>
}

export function KLDivergenceLab({ go, nodeId }: { go: (page: string, options?: Record<string, string>) => void; nodeId?: string }) {
  const [teacher, setTeacher] = useState([0.65, 0.25, 0.1])
  const [student, setStudent] = useState([0.4, 0.4, 0.2])
  const [ran, setRan] = useState(false)
  const p = normalize(teacher); const q = normalize(student); const m = p.map((value, index) => (value + q[index]) / 2)
  const forward = kl(p, q); const reverse = kl(q, p); const js = .5 * kl(p, m) + .5 * kl(q, m)
  const update = (kind: 'p' | 'q', index: number, value: number) => { const next = [...(kind === 'p' ? teacher : student)]; next[index] = clamp(value, .01, .98); if (kind === 'p') setTeacher(next); else setStudent(next); setRan(false) }
  const run = () => { setRan(true); if (nodeId) markProgress(nodeId, 3) }
  return <div className='foundation-console'><section className='distribution-workbench'><div className='distribution-editor'><h3>Teacher P</h3>{['mode-0', 'mode-1', 'mode-2'].map((mode, index) => <label key={`teacher-${mode}`}>mode {index}<input type='range' min='.01' max='.98' step='.01' value={teacher[index]} onChange={(event) => update('p', index, Number(event.target.value))} /><b>{pct(p[index])}</b></label>)}</div><div className='distribution-editor'><h3>Student Q</h3>{['mode-0', 'mode-1', 'mode-2'].map((mode, index) => <label key={`student-${mode}`}>mode {index}<input type='range' min='.01' max='.98' step='.01' value={student[index]} onChange={(event) => update('q', index, Number(event.target.value))} /><b>{pct(q[index])}</b></label>)}</div></section><div className='console-actions'><button onClick={run}>运行比较</button><button className='secondary' onClick={() => { setTeacher([.65,.25,.1]); setStudent([.4,.4,.2]); setRan(false) }}><RotateCcw />重置</button><button className='secondary' onClick={() => go('distill-lab', { experiment: 'temperature-lab' })}>直链蒸馏温度实验</button></div><section className='kl-results'><div><span>KL(P‖Q)</span><b>{ran ? forward.toFixed(4) : '—'}</b><small>mode-covering：遗漏 P 的 mode 代价高</small></div><div><span>KL(Q‖P)</span><b>{ran ? reverse.toFixed(4) : '—'}</b><small>mode-seeking：更偏向 Q 的尖峰</small></div><div><span>JS(P,Q)</span><b>{ran ? js.toFixed(4) : '—'}</b><small>对称、有界，适合稳定比较</small></div></section><div className='diagnostic-callout'>交换 P/Q 后 KL 通常不同；JS 不变。把 Q 的某个 mode 拉到接近 0，观察正向 KL 如何快速上升。</div></div>
}
