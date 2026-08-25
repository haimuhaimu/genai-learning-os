import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, Calculator, CheckCircle2, Database, Gauge, Info, Search, Server, Sigma, Stethoscope } from 'lucide-react'
import LazyLearningChart from './charts/LazyLearningChart'

const formatBytes = (bytes: number) => bytes >= 1024 ** 4 ? `${(bytes / 1024 ** 4).toFixed(2)} TiB` : bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(2)} GiB` : `${(bytes / 1024 ** 2).toFixed(1)} MiB`
const formatNumber = (value: number) => value >= 1e12 ? `${(value / 1e12).toFixed(2)}T` : value >= 1e9 ? `${(value / 1e9).toFixed(2)}B` : value >= 1e6 ? `${(value / 1e6).toFixed(2)}M` : value.toFixed(0)

export function KVServiceLab() {
  const [layers, setLayers] = useState(32)
  const [hidden, setHidden] = useState(4096)
  const [kvHeads, setKvHeads] = useState(8)
  const [headDim, setHeadDim] = useState(128)
  const [context, setContext] = useState(16384)
  const [concurrency, setConcurrency] = useState(32)
  const [dtype, setDtype] = useState(2)
  const [output, setOutput] = useState(1024)
  const [queryHeads, setQueryHeads] = useState(32)
  const sequence = context + output
  const kvBytes = 2 * layers * sequence * kvHeads * headDim * concurrency * dtype
  const perRequest = kvBytes / concurrency
  const mhaBytes = 2 * layers * sequence * queryHeads * headDim * concurrency * dtype
  const pressure = Math.max(1, sequence / 8192)
  const precisionFactor = dtype === 1 ? 1.18 : dtype === 2 ? 1 : .88
  const prefillRate = 120000 * precisionFactor / Math.pow(pressure, .32)
  const ttft = .12 + context * Math.min(concurrency, 8) / prefillRate
  const aggregateDecode = 2400 * precisionFactor / Math.pow(pressure, .18)
  const tpot = 1000 * concurrency / aggregateDecode
  const requestSeconds = ttft + output * tpot / 1000
  const throughput = concurrency * output / requestSeconds
  const grouping = queryHeads / kvHeads

  return <div className='expert-lab-panel' id='kv-service-lab'>
    <header className='lab-console-head'><div><span>LAB A · SERVING ECONOMICS</span><h2>KV Cache / 服务成本计算器</h2><p>把架构参数映射到缓存显存与 SLO。所有性能结果是教学估算，不是硬件承诺。</p></div><Calculator /></header>
    <div className='kv-layout'>
      <div className='expert-controls-grid'>
        <NumberField label='Layers' value={layers} min={8} max={120} step={4} onChange={setLayers} />
        <NumberField label='Hidden size' value={hidden} min={1024} max={16384} step={512} onChange={setHidden} />
        <NumberField label='Query heads' value={queryHeads} min={1} max={128} step={1} onChange={setQueryHeads} />
        <NumberField label='KV heads' value={kvHeads} min={1} max={128} step={1} onChange={setKvHeads} />
        <NumberField label='Head dim' value={headDim} min={32} max={256} step={32} onChange={setHeadDim} />
        <NumberField label='Input context' value={context} min={1024} max={131072} step={1024} onChange={setContext} />
        <NumberField label='Output tokens' value={output} min={64} max={8192} step={64} onChange={setOutput} />
        <NumberField label='Concurrency' value={concurrency} min={1} max={256} step={1} onChange={setConcurrency} />
        <label className='number-field'><span>KV dtype</span><select value={dtype} onChange={(e) => setDtype(+e.target.value)}><option value={2}>BF16 / FP16 · 2B</option><option value={1}>INT8 · 1B</option><option value={.5}>INT4 · 0.5B</option></select></label>
      </div>
      <div className='kv-readout'>
        <div className='primary-readout'><span>峰值 KV CACHE</span><strong>{formatBytes(kvBytes)}</strong><small>{formatBytes(perRequest)} / request</small></div>
        <div className='readout-grid'>
          <div><span>教学 TTFT</span><b>{ttft.toFixed(2)}s</b></div>
          <div><span>教学 TPOT</span><b>{tpot.toFixed(1)}ms</b></div>
          <div><span>输出吞吐</span><b>{throughput.toFixed(0)} tok/s</b></div>
          <div><span>序列总长</span><b>{formatNumber(sequence)}</b></div>
        </div>
        <div className='architecture-callout'><Server /><p><b>{kvHeads === queryHeads ? 'MHA' : kvHeads === 1 ? 'MQA' : `GQA · ${grouping.toFixed(1)}:1`}</b><span>相对同 query heads 的 MHA，KV 体积减少 {((1 - kvBytes / mhaBytes) * 100).toFixed(0)}%。这不包含模型权重、激活、allocator 碎片和运行时 workspace。</span></p></div>
      </div>
    </div>
    <div className='formula-block'><Sigma /><code>2(K,V) × L × (Tinput+Toutput) × Hkv × Dhead × concurrency × dtype_bytes</code><p>假设：每个已生成位置都保留 K/V；无 prefix cache 共享；序列均达到设定长度。TTFT 假设 aggregate prefill 基线 120k tok/s，TPOT 假设 8K 序列 aggregate decode 基线 2.4k tok/s，再按序列压力与 dtype 做透明缩放。真实值必须以目标硬件与 serving stack 压测。</p></div>
    {hidden !== queryHeads * headDim && <div className='warning-inline'><AlertTriangle />当前 hidden size ≠ query heads × head dim。某些架构允许投影维度不同，但评审时必须确认真实配置。</div>}
  </div>
}

function NumberField({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return <label className='number-field'><span>{label}<b>{formatNumber(value)}</b></span><input type='range' min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} /></label>
}

export function AttentionComplexityLab() {
  const [hidden, setHidden] = useState(4096)
  const [layers, setLayers] = useState(32)
  const [dtype, setDtype] = useState(2)
  const points = [4096, 8192, 16384, 32768, 65536, 131072].map((t) => {
    const attention = 4 * t * t * hidden * layers
    const linear = 32 * t * hidden * hidden * layers
    const scoreMemory = 2 * 32 * t * t * dtype
    return { context: `${t / 1024}K`, tokens: t, attention, linear, attentionT: attention / 1e12, linearT: linear / 1e12, scoreMemory }
  })
  const crossover = 8 * hidden
  return <div className='expert-lab-panel'>
    <header className='lab-console-head'><div><span>LAB B · LONG CONTEXT</span><h2>Attention 复杂度实验</h2><p>同时看二次 attention 与线性层成本；长上下文昂贵不只因为一个 O(n²) 标签。</p></div><Gauge /></header>
    <div className='compact-controls'><NumberField label='Hidden size' value={hidden} min={1024} max={8192} step={512} onChange={setHidden} /><NumberField label='Layers' value={layers} min={8} max={80} step={4} onChange={setLayers} /><label className='number-field'><span>Score dtype</span><select value={dtype} onChange={(e) => setDtype(+e.target.value)}><option value={2}>BF16 · 2B</option><option value={1}>INT8 · 1B</option></select></label></div>
    <div className='chart-card'>
      <LazyLearningChart data={points} kind='line' xKey='context' height={310} valueFormat='tflops' series={[{ key: 'attentionT', name: 'Attention（全层）', color: '#d1644f' }, { key: 'linearT', name: '线性/MLP（全层）', color: '#5968c5' }]} />
    </div>
    <div className='complexity-table'><div><b>Context</b><b>Attention FLOPs</b><b>线性 FLOPs</b><b>朴素 score/prob 内存*</b></div>{points.map((point) => <div key={point.context}><strong>{point.context}</strong><span>{formatNumber(point.attention)}</span><span>{formatNumber(point.linear)}</span><span>{formatBytes(point.scoreMemory)}</span></div>)}</div>
    <div className='insight-row'><Info /><p><b>交叉直觉：T ≈ 8d = {formatNumber(crossover)} tokens。</b><span>按本教学公式，超过该长度后 attention FLOPs 超过线性/MLP。FlashAttention 可避免物化完整 score/prob 矩阵并降低 HBM IO，但不会把全注意力计算复杂度变成线性。*内存列按 32 heads、score 与 probability 各一份估算，实际 kernel 差异很大。</span></p></div>
  </div>
}

const alignmentMethods = {
  SFT: { data: '高质量指令-回答示范', stability: 92, cost: 35, control: 72, best: '建立格式、风格和基础任务能力', failure: '模仿偏差、覆盖不足、灾难性遗忘', advice: '所有路线的常见起点；数据少但 rubric 清晰时先做 SFT。' },
  DPO: { data: '同 prompt 的 chosen / rejected 偏好对', stability: 82, cost: 48, control: 78, best: '离线偏好明确、希望训练稳定', failure: '偏好支持域窄、长度偏差、β 错配', advice: '偏好对稳定且预算有限时优先；必须校正长度与位置偏差。' },
  RLHF: { data: '偏好数据 + reward model + 在线采样', stability: 52, cost: 92, control: 86, best: '需要在线探索复杂偏好', failure: 'reward hacking、KL 失控、训练震荡', advice: '只有奖励模型可靠、基础设施成熟且探索价值高时采用。' },
  GRPO: { data: '每个 prompt 的成组回答 + 可比较奖励', stability: 64, cost: 74, control: 83, best: '可验证任务、组内相对奖励有效', failure: '组内方差低、奖励投机、模式坍缩', advice: '数学/代码等可验证奖励更合适；开放审美任务慎用单一 reward。' },
}

export function AlignmentWorkbench() {
  const [method, setMethod] = useState<keyof typeof alignmentMethods>('DPO')
  const item = alignmentMethods[method]
  return <div className='expert-lab-panel'>
    <header className='lab-console-head'><div><span>LAB C · POST-TRAINING</span><h2>对齐方法对照台</h2><p>不是“新方法替代旧方法”，而是按数据形态、稳定性和可验证性选训练路径。</p></div><CheckCircle2 /></header>
    <div className='method-tabs'>{Object.keys(alignmentMethods).map((name) => <button className={method === name ? 'active' : ''} key={name} onClick={() => setMethod(name as keyof typeof alignmentMethods)}>{name}</button>)}</div>
    <div className='alignment-layout'>
      <div className='method-brief'><span>推荐场景</span><h3>{item.best}</h3><p>{item.advice}</p><div><small>所需数据</small><b>{item.data}</b></div><div className='failure-note'><AlertTriangle /><span><small>首要失败模式</small><b>{item.failure}</b></span></div></div>
      <div className='score-stack'><ScoreBar label='训练稳定性' value={item.stability} good /><ScoreBar label='训练成本' value={item.cost} /><ScoreBar label='行为可控性' value={item.control} good /></div>
    </div>
    <div className='selection-matrix'>{Object.entries(alignmentMethods).map(([name, value]) => <button type='button' aria-pressed={method === name} className={method === name ? 'selected' : ''} key={name} onClick={() => setMethod(name as keyof typeof alignmentMethods)}><b>{name}</b><span>{value.data}</span><small>{value.failure}</small></button>)}</div>
    <div className='formula-block'><Sigma /><code>方法选择 = f(示范数据, 偏好对, 奖励可验证性, 探索价值, 基础设施成熟度)</code><p>上线前统一检查：pairwise win rate 的置信区间、reward 与长度相关性、KL/多样性、能力回归、过度拒答和风险切片。</p></div>
  </div>
}

function ScoreBar({ label, value, good = false }: { label: string; value: number; good?: boolean }) {
  return <div className={`score-bar ${good ? 'good' : ''}`}><span>{label}<b>{value}/100</b></span><i><em style={{ width: `${value}%` }} /></i></div>
}

const diagnoses: Record<string, { stage: string; causes: string[]; metrics: string[]; experiments: string[] }> = {
  '答错': { stage: 'Recall → Rerank → Context → Generation', causes: ['目标文档未召回', '高相关但不支持结论的 chunk 被置顶', '证据冲突或被截断', '模型未忠于证据'], metrics: ['Recall@20', 'NDCG@10', 'evidence coverage', 'groundedness'], experiments: ['Oracle context：直接给正确证据', 'Oracle retrieval：固定召回只替换生成', '按 query 类型切片回放 trace'] },
  '拒答': { stage: 'Context → Policy → Generation', causes: ['证据门槛过高', '权限过滤误杀', '安全策略过严', '无答案训练偏置'], metrics: ['retrieval confidence', 'ACL filter rate', 'over-refusal rate', 'answerability calibration'], experiments: ['移除 policy 的 shadow 对照', '有答案/无答案校准集', '权限过滤前后召回差异'] },
  '过时': { stage: 'Ingestion → Index → Cache', causes: ['抓取或切块未更新', '索引延迟', '旧版本与新版本并存', 'answer/prefix cache 未失效'], metrics: ['freshness lag', 'index version', 'cache age/hit', 'document effective time'], experiments: ['按文档版本强制检索', '关闭 cache 对照', 'CDC 到可搜索端到端延迟测试'] },
  '引用不准': { stage: 'Context packing → Citation binding', causes: ['chunk 只有相关背景无支持句', '重排改变 chunk ID', '生成后引用匹配错误', '答案合并多段证据'], metrics: ['citation precision/recall', 'span entailment', 'chunk ID trace', 'unsupported claim rate'], experiments: ['句子级 claim-evidence 对齐', '强制引用原文 span', '只用单一证据的最小复现'] },
  '延迟高': { stage: 'Recall → Rerank → Prefill → Decode', causes: ['多路召回串行', 'rerank 候选过多', '上下文过长拉高 TTFT', '工具/模型队列拥塞'], metrics: ['stage p50/p95', 'candidate count', 'input tokens', 'TTFT/TPOT', 'queue wait'], experiments: ['逐阶段 bypass', 'k 与质量/延迟 sweep', '压缩上下文与 chunked prefill'] },
}

export function RAGDoctor() {
  const [symptom, setSymptom] = useState('答错')
  const [detail, setDetail] = useState('用户问题有明确答案，但系统给出流畅且错误的结论。')
  const result = diagnoses[symptom]
  return <div className='expert-lab-panel' id='rag-doctor'>
    <header className='lab-console-head'><div><span>LAB D · FAILURE TRACE</span><h2>RAG 故障诊断器</h2><p>先定位阶段，再看指标；禁止一遇到答错就“换更大的模型”。</p></div><Stethoscope /></header>
    <div className='doctor-input'><div><label>故障症状</label><div>{Object.keys(diagnoses).map((name) => <button className={symptom === name ? 'active' : ''} key={name} onClick={() => setSymptom(name)}>{name}</button>)}</div></div><label>现场描述<textarea value={detail} onChange={(e) => setDetail(e.target.value)} /></label></div>
    <div className='pipeline-trace'>{['Recall', 'Rerank', 'Context', 'Generation'].map((stage, index) => <div key={stage}><span>{index + 1}</span><b>{stage}</b>{index < 3 && <ArrowRight />}</div>)}</div>
    <div className='diagnosis-grid'>
      <section><header><Search />优先检查路径</header><h3>{result.stage}</h3><ul>{result.causes.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section><header><Gauge />应查指标 / 日志</header><div className='metric-tags'>{result.metrics.map((item) => <span key={item}>{item}</span>)}</div><small>共同维度：query 类型、租户/权限、索引版本、模型版本、input tokens、trace ID。</small></section>
      <section><header><Database />最小归因实验</header><ol>{result.experiments.map((item, index) => <li key={item}><b>{index + 1}</b>{item}</li>)}</ol></section>
    </div>
    <div className='diagnosis-output'><Info /><p><b>诊断摘要</b><span>症状“{symptom}”优先从 {result.stage} 建立可回放 trace。当前现场：{detail || '未补充'}。只有 Oracle context 仍失败时，才应把生成阶段列为首因。</span></p></div>
  </div>
}

export function TrafficCurve() {
  const data = useMemo(() => [1, 4, 8, 16, 32, 64, 96].map((c) => ({ concurrency: c, throughput: Math.min(2500, c * 108), p95: 130 + Math.pow(c, 1.42) * 3.2, goodput: Math.min(2250, c * 103) * (c > 64 ? .72 : 1) })), [])
  return <div className='mini-chart-panel'><header><span>吞吐不是 goodput</span><b>教学排队曲线</b></header><LazyLearningChart data={data} kind='area' xKey='concurrency' height={220} series={[{ key: 'throughput', name: 'throughput tok/s', color: '#5968c5' }, { key: 'goodput', name: 'SLO goodput tok/s', color: '#d1644f' }]} /></div>
}
