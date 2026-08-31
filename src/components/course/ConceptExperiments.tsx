import { useState, type ReactNode } from 'react'
import { ArrowRight, Play, RotateCcw } from 'lucide-react'
import { applyActivation, blendDistillationTargets, calculateApiSamplingBudget, calculateAttentionDilution, calculateCfgEffect, calculateDenoiseRetention, calculateDiffusionNoise, calculateEffectiveImageCost, calculateEmbeddingChunks, calculateKvCacheUsage, calculateMlpSize, calculateNegativeSuppression, calculatePromptTruncation, calculateReplayRetention, calculateSamplingTradeoff, calculateVaeCompression, compareCompressionOrder, compareKLDirections, compareScalingAllocation, crossEntropyLoss, estimateTokenCount, simulateGradientDescent, simulateMoeRouting, simulateResidualSignal, softmaxAtTemperature, type ActivationName, type LabeledValue } from './conceptExperimentMath'
import { conceptExperimentStyles as styles } from './conceptExperimentStyles.mts'

type ExperimentProps = { onRun?: () => void }

function Bars({ items }: { items: LabeledValue[] }) {
  return <div style={styles.bars}>{items.map((item) => <div key={item.label} style={styles.barRow}><b>{item.label}</b><i style={styles.barTrack}><span style={{ ...styles.barFill, width: `${item.value}%` }} /></i><strong>{item.value}%</strong></div>)}</div>
}

function ExperimentFrame({ intro, control, before, after, conclusion, details }: { intro: string; control: ReactNode; before: ReactNode; after: ReactNode; conclusion?: string; details: ReactNode }) {
  return <div style={styles.shell}><p style={styles.intro}>{intro}</p>{control}<div style={styles.compare}><section style={styles.compareCard}><small style={styles.label}>操作前</small>{before}</section><ArrowRight aria-hidden='true' style={styles.arrow} /><section style={{ ...styles.compareCard, ...styles.afterCard }}><small style={styles.label}>操作后</small>{after}</section></div>{conclusion ? <p style={styles.result}><b>一句话带走：</b><span>{conclusion}</span></p> : null}<details style={styles.details}><summary style={styles.summary}>为什么会这样？查看实现与数学</summary>{details}</details></div>
}

export function SoftmaxTemperatureExperiment({ onRun }: ExperimentProps) {
  const labels = ['靠谱', '一般', '离题']
  const [temperature, setTemperature] = useState(1.8)
  const [ran, setRan] = useState(false)
  const baseline = softmaxAtTemperature([3, 1, 0.2], 1).map((value, index) => ({ label: labels[index], value }))
  const changed = softmaxAtTemperature([3, 1, 0.2], temperature).map((value, index) => ({ label: labels[index], value }))
  const run = () => { setRan(true); onRun?.() }
  return <ExperimentFrame intro='先别背 Softmax 公式。保持三个候选词分数不变，只调温度，看看概率会发生什么。' control={<div style={styles.control}><div style={styles.controlTop}><label htmlFor='softmax-temperature'>温度 T</label><b>{temperature.toFixed(1)}</b></div><input id='softmax-temperature' aria-label='Softmax 温度' style={styles.range} type='range' min='0.5' max='2.5' step='0.1' value={temperature} onChange={(event) => { setTemperature(Number(event.target.value)); setRan(false) }} /><button type='button' style={styles.run} onClick={run}><Play size={15} />运行一次</button></div>} before={<><b>T = 1.0</b><Bars items={baseline} /></>} after={ran ? <><b>T = {temperature.toFixed(1)}</b><Bars items={changed} /></> : <p>调一个温度，再运行观察。</p>} conclusion={ran ? temperature > 1 ? '温度升高，候选词之间的概率差距变小，模型更愿意考虑其他答案。' : temperature < 1 ? '温度降低，最高分答案更突出，但模型能力并没有变强。' : '温度没变，所以概率分布也不会改变。' : undefined} details={<><p>Softmax 先把 logit 除以温度，再转成总和为 100% 的概率。温度改变的是输出分布的锐度，不会改变原始知识。</p><code style={styles.code}>probability = softmax(logits / temperature)</code></>} />
}

export function GradientDescentExperiment({ onRun }: ExperimentProps) {
  const [learningRate, setLearningRate] = useState(0.8)
  const [ran, setRan] = useState(false)
  const stable = simulateGradientDescent(0.1)
  const changed = simulateGradientDescent(learningRate)
  const renderSteps = (points: typeof stable) => <div style={styles.steps}>{points.map((point) => <span key={point.step} style={styles.step}>第 {point.step} 步<b style={styles.stepValue}>θ={point.position}</b><small>损失 {point.loss}</small></span>)}</div>
  const run = () => { setRan(true); onRun?.() }
  const conclusion = learningRate > 1 ? '步子超过山谷宽度，参数越走越远，训练会发散。' : learningRate >= 0.5 ? '步子偏大，参数会在最低点两侧来回跳，收敛变得不稳定。' : '步子较小，参数会稳定接近最低点，只是需要更多轮。'
  return <ExperimentFrame intro='把训练想成蒙眼下山。方向由坡度告诉你，学习率只决定每一步迈多大。' control={<div style={styles.control}><div style={styles.controlTop}><label htmlFor='gradient-rate'>学习率</label><b>{learningRate.toFixed(1)}</b></div><input id='gradient-rate' aria-label='梯度下降学习率' style={styles.range} type='range' min='0.1' max='1.2' step='0.1' value={learningRate} onChange={(event) => { setLearningRate(Number(event.target.value)); setRan(false) }} /><button type='button' style={styles.run} onClick={run}><Play size={15} />走 6 步</button></div>} before={<><b>小步走：学习率 0.1</b>{renderSteps(stable)}</>} after={ran ? <><b>你选择：学习率 {learningRate.toFixed(1)}</b>{renderSteps(changed)}</> : <p>改变步子大小，再看看落点。</p>} conclusion={ran ? conclusion : undefined} details={<><p>示例损失是 (θ - 3)²，最低点在 θ=3。每一步都用 θ = θ - 学习率 × 梯度更新。</p><code style={styles.code}>theta = theta - learningRate * gradient</code></>} />
}

export function DistillationTargetExperiment({ onRun }: ExperimentProps) {
  const labels = ['体育', '财经', '科技']
  const [alpha, setAlpha] = useState(0.4)
  const [ran, setRan] = useState(false)
  const hard = labels.map((label, index) => ({ label, value: index === 0 ? 100 : 0 }))
  const blended = blendDistillationTargets(alpha).map((value, index) => ({ label: labels[index], value }))
  const run = () => { setRan(true); onRun?.() }
  return <ExperimentFrame intro='教师认为答案最像体育，但也有一点财经意味。只学标准答案时，这些相似性会全部丢失。' control={<div style={styles.control}><p style={styles.teacher}>教师软答案：体育 68%，财经 24%，科技 8%</p><div style={styles.controlTop}><label htmlFor='distill-alpha'>硬标签权重 α</label><b>{alpha.toFixed(1)}</b></div><input id='distill-alpha' aria-label='蒸馏硬标签权重' style={styles.range} type='range' min='0' max='1' step='0.1' value={alpha} onChange={(event) => { setAlpha(Number(event.target.value)); setRan(false) }} /><button type='button' style={styles.run} onClick={run}><RotateCcw size={15} />混合学习信号</button></div>} before={<><b>只学标准答案</b><Bars items={hard} /></>} after={ran ? <><b>硬标签 {Math.round(alpha * 100)}% + 教师 {Math.round((1 - alpha) * 100)}%</b><Bars items={blended} /></> : <p>调整权重，再混合两个信号。</p>} conclusion={ran ? alpha === 1 ? '只用硬标签时，学生只知道谁对，不知道其他答案有多相似。' : '软答案把类别之间的相似性也交给学生，这就是蒸馏常说的暗知识。' : undefined} details={<><p>α 控制硬标签，1-α 控制教师软答案。真实训练还会使用温度与 KL，但先理解两个监督信号如何混合就够了。</p><code style={styles.code}>target = alpha * hardLabel + (1 - alpha) * teacherDistribution</code></>} />
}

export function CrossEntropyExperiment({ onRun }: ExperimentProps) {
  const [probability, setProbability] = useState(0.2)
  const [ran, setRan] = useState(false)
  const run = () => { setRan(true); onRun?.() }
  return <ExperimentFrame intro='模型给正确答案多少把握，会直接决定这次犯错要付多大代价。只改正确答案的概率，观察损失。' control={<div style={styles.control}><div style={styles.controlTop}><label htmlFor='correct-probability'>正确答案概率</label><b>{Math.round(probability * 100)}%</b></div><input id='correct-probability' aria-label='正确答案概率' style={styles.range} type='range' min='0.05' max='0.95' step='0.05' value={probability} onChange={(event) => { setProbability(Number(event.target.value)); setRan(false) }} /><button type='button' style={styles.run} onClick={run}><Play size={15} />计算犯错代价</button></div>} before={<div style={styles.metricGrid}><span style={styles.metric}><small>正确答案概率</small><b>90%</b></span><span style={styles.metric}><small>损失</small><b>{crossEntropyLoss(0.9)}</b></span></div>} after={ran ? <div style={styles.metricGrid}><span style={styles.metric}><small>正确答案概率</small><b>{Math.round(probability * 100)}%</b></span><span style={styles.metric}><small>损失</small><b>{crossEntropyLoss(probability)}</b></span></div> : <p>选择一个概率，再计算损失。</p>} conclusion={ran ? probability < 0.5 ? '正确答案得到的概率越低，惩罚上升得越快，训练会更用力纠正这类错误。' : '正确答案已经拿到较高概率，因此这次错误的惩罚较小。' : undefined} details={<><p>交叉熵只看正确答案得到的概率，并取负对数。它会放大“非常自信但猜错”的问题。</p><code style={styles.code}>loss = -log(correctAnswerProbability)</code></>} />
}

function SignalValues({ inputs, outputs }: { inputs: number[]; outputs: number[] }) {
  return <div style={styles.steps}>{inputs.map((input, index) => <span key={input} style={styles.step}><small>输入 {input}</small><b style={styles.stepValue}>输出 {outputs[index]}</b></span>)}</div>
}

export function ActivationExperiment({ onRun }: ExperimentProps) {
  const inputs = [-2, -0.5, 0.5, 2]
  const [activation, setActivation] = useState<ActivationName>('relu')
  const [ran, setRan] = useState(false)
  const run = () => { setRan(true); onRun?.() }
  return <ExperimentFrame intro='先给网络四个信号。保持输入不变，只切换滤网，看看哪些信息被保留。' control={<div style={styles.control}><div style={styles.choiceRow}>{(['relu', 'silu'] as const).map((name) => <button key={name} type='button' aria-pressed={activation === name} style={{ ...styles.choice, ...(activation === name ? styles.activeChoice : {}) }} onClick={() => { setActivation(name); setRan(false) }}>{name === 'relu' ? 'ReLU：直接截断' : 'SiLU：平滑通过'}</button>)}</div><button type='button' style={styles.run} onClick={run}><Play size={15} />让信号通过</button></div>} before={<><b>没有激活函数</b><SignalValues inputs={inputs} outputs={inputs} /></>} after={ran ? <><b>{activation === 'relu' ? 'ReLU' : 'SiLU'} 处理后</b><SignalValues inputs={inputs} outputs={applyActivation(inputs, activation)} /></> : <p>选择滤网，再观察输出。</p>} conclusion={ran ? activation === 'relu' ? 'ReLU 把负信号直接归零，简单高效，但可能让部分神经元再也没有输出。' : 'SiLU 不会把负信号一刀切掉，变化更平滑，也保留了少量信息。' : undefined} details={<><p>没有激活函数，多层线性变换仍可合并成一层。非线性让网络能够描述弯曲、复杂的关系。</p><code style={styles.code}>{activation === 'relu' ? 'output = max(0, input)' : 'output = input * sigmoid(input)'}</code></>} />
}

function MlpReadout({ multiplier }: { multiplier: number }) {
  const result = calculateMlpSize(1024, multiplier)
  return <div style={styles.metricGrid}><span style={styles.metric}><small>中间宽度</small><b>{result.hiddenWidth}</b></span><span style={styles.metric}><small>参数量</small><b>{(result.parameters / 1e6).toFixed(1)}M</b></span><span style={styles.metric}><small>FP16 权重</small><b>{result.memoryMb} MB</b></span></div>
}

export function MlpWidthExperiment({ onRun }: ExperimentProps) {
  const [multiplier, setMultiplier] = useState(8)
  const [ran, setRan] = useState(false)
  const run = () => { setRan(true); onRun?.() }
  return <ExperimentFrame intro='MLP 像每个 Token 都会经过的知识加工区。固定模型宽度，只扩大中间层，观察成本怎样增长。' control={<div style={styles.control}><div style={styles.controlTop}><label htmlFor='mlp-multiplier'>中间层宽度倍率</label><b>{multiplier} 倍</b></div><input id='mlp-multiplier' aria-label='MLP 中间层宽度倍率' style={styles.range} type='range' min='2' max='8' step='1' value={multiplier} onChange={(event) => { setMultiplier(Number(event.target.value)); setRan(false) }} /><button type='button' style={styles.run} onClick={run}><Play size={15} />扩大 MLP</button></div>} before={<><b>常见基线：4 倍</b><MlpReadout multiplier={4} /></>} after={ran ? <><b>你的选择：{multiplier} 倍</b><MlpReadout multiplier={multiplier} /></> : <p>调整宽度，再计算参数账单。</p>} conclusion={ran ? multiplier > 4 ? '中间层越宽，能够容纳更多变换，但参数、显存和计算也会按比例增加。' : '缩窄中间层能降低成本，但也可能限制模型处理复杂模式的容量。' : undefined} details={<><p>示例固定模型宽度为 1024，忽略偏置。两张矩阵分别负责升维和降维。</p><code style={styles.code}>parameters = 2 * modelWidth * hiddenWidth</code></>} />
}

export function ScalingAllocationExperiment({ onRun }: ExperimentProps) {
  const [multiplier, setMultiplier] = useState(4)
  const [ran, setRan] = useState(false)
  const result = compareScalingAllocation(multiplier)
  const readout = (item: typeof result.balanced) => <div style={styles.metricGrid}><span style={styles.metric}><small>参数量</small><b>{item.parametersB}B</b></span><span style={styles.metric}><small>训练数据</small><b>{item.tokensB}B</b></span><span style={styles.metric}><small>FP16 权重显存</small><b>{item.weightMemoryGb} GB</b></span></div>
  const run = () => { setRan(true); onRun?.() }
  return <ExperimentFrame intro='假设起点是 7B 参数和 140B Token。算力增加后，别急着把预算全塞进参数，先比较两种分法。' control={<div style={styles.control}><div style={styles.controlTop}><label htmlFor='compute-budget'>训练算力预算</label><b>{multiplier} 倍</b></div><input id='compute-budget' aria-label='训练算力预算倍率' style={styles.range} type='range' min='1' max='16' step='1' value={multiplier} onChange={(event) => { setMultiplier(Number(event.target.value)); setRan(false) }} /><button type='button' style={styles.run} onClick={run}><Play size={15} />比较预算分法</button></div>} before={<><b>只扩大参数</b>{readout(result.modelOnly)}</>} after={ran ? <><b>参数与数据一起扩大</b>{readout(result.balanced)}</> : <p>选择算力预算，再比较两种分法。</p>} conclusion={ran ? '在相同训练算力下，同时增加参数和数据，能避免模型变大却没吃够数据，也显著减轻推理显存压力。' : undefined} details={<><p>这是教学近似，不是跨架构定律。因为训练计算量近似与参数量 N 和数据量 D 的乘积成正比，两者一起扩展时，各自约按算力平方根增长。</p><code style={styles.code}>compute ≈ 6 * parameters * tokens</code></>} />
}

const tokenSamples = [
  { id: 'plain', label: '自然语言', text: 'status shipped' },
  { id: 'json', label: 'JSON', text: '{"status":"shipped"}' },
  { id: 'code', label: '代码', text: 'const status = "shipped";' },
  { id: 'emoji', label: '表情', text: '状态：已发布 🚀✅' },
]

function TokenReadout({ text }: { text: string }) {
  const result = estimateTokenCount(text)
  return <><code style={styles.code}>{text}</code><div style={styles.metricGrid}><span style={styles.metric}><small>字符数</small><b>{result.characters}</b></span><span style={styles.metric}><small>估算 Token</small><b>{result.estimatedTokens}</b></span><span style={styles.metric}><small>字符 / Token</small><b>{(result.characters / result.estimatedTokens).toFixed(1)}</b></span></div></>
}

export function TokenFormatExperiment({ onRun }: ExperimentProps) {
  const [sampleId, setSampleId] = useState('json')
  const [ran, setRan] = useState(false)
  const selected = tokenSamples.find((sample) => sample.id === sampleId) ?? tokenSamples[0]
  const run = () => { setRan(true); onRun?.() }
  return <ExperimentFrame intro='模型按 Token 处理和计费，不按你看到的字符数。保持信息含义接近，只改变表达格式。' control={<div style={styles.control}><div style={styles.choiceRow}>{tokenSamples.slice(1).map((sample) => <button key={sample.id} type='button' aria-pressed={sampleId === sample.id} style={{ ...styles.choice, ...(sampleId === sample.id ? styles.activeChoice : {}) }} onClick={() => { setSampleId(sample.id); setRan(false) }}>{sample.label}</button>)}</div><button type='button' style={styles.run} onClick={run}><Play size={15} />重新分词</button></div>} before={<><b>自然语言基线</b><TokenReadout text={tokenSamples[0].text} /></>} after={ran ? <><b>{selected.label} 表达</b><TokenReadout text={selected.text} /></> : <p>选择一种表达格式，再观察 Token 账单。</p>} conclusion={ran ? '信息意思接近，不代表 Token 数相同。结构符号、代码和罕见字符都可能改变上下文占用与成本。' : undefined} details={<><p>这里使用可解释的教学估算，不代表任何商业模型的真实分词器。生产评估必须调用目标模型对应的 tokenizer。</p><code style={styles.code}>cost and context usage depend on token count</code></>} />
}

function KvReadout({ contextTokens }: { contextTokens: number }) {
  const result = calculateKvCacheUsage(contextTokens)
  return <div style={styles.metricGrid}><span style={styles.metric}><small>上下文</small><b>{Math.round(result.contextTokens / 1024)}K</b></span><span style={styles.metric}><small>KV Cache</small><b>{result.kvGb} GB</b></span><span style={styles.metric}><small>10 GB 预算</small><b style={{ color: result.oomRisk ? '#9e3f43' : '#2d654f' }}>{result.oomRisk ? `超出 ${Math.abs(result.remainingGb)} GB` : `剩余 ${result.remainingGb} GB`}</b></span></div>
}

export function ContextWindowExperiment({ onRun }: ExperimentProps) {
  const [contextTokens, setContextTokens] = useState(65536)
  const [ran, setRan] = useState(false)
  const result = calculateKvCacheUsage(contextTokens)
  const run = () => { setRan(true); onRun?.() }
  return <ExperimentFrame intro='上下文越长，模型要保留的历史状态越多。固定模型和并发，只扩大窗口，观察显存怎样增长。' control={<div style={styles.control}><div style={styles.controlTop}><label htmlFor='context-window'>上下文长度</label><b>{Math.round(contextTokens / 1024)}K Token</b></div><input id='context-window' aria-label='上下文长度' style={styles.range} type='range' min='4096' max='131072' step='4096' value={contextTokens} onChange={(event) => { setContextTokens(Number(event.target.value)); setRan(false) }} /><button type='button' style={styles.run} onClick={run}><Play size={15} />计算显存账单</button></div>} before={<><b>短上下文基线</b><KvReadout contextTokens={4096} /></>} after={ran ? <><b>你的窗口配置</b><KvReadout contextTokens={contextTokens} /></> : <p>拖动窗口，再计算 KV Cache。</p>} conclusion={ran ? result.oomRisk ? '窗口变长不会免费获得更好答案。KV Cache 已超过预算，并发量会下降或直接显存溢出。' : '当前窗口仍在预算内，但长度每翻倍，单会话 KV Cache 也近似翻倍。' : undefined} details={<><p>示例固定 32 层、8 个 KV Head、每个 Head 128 维、FP16，并只计算单条请求的 K/V 存储。</p><code style={styles.code}>bytes = 2 * layers * kvHeads * headDim * tokens * 2</code></>} />
}

function MoeReadout({ concentration }: { concentration: number }) {
  const result = simulateMoeRouting(concentration)
  const items = result.loadPercentages.map((value, index) => ({ label: `专家 ${index + 1}`, value }))
  return <><Bars items={items} /><div style={styles.metricGrid}><span style={styles.metric}><small>单专家容量</small><b>{result.capacityPerExpert} 次</b></span><span style={styles.metric}><small>溢出路由</small><b>{result.overflowRoutes}</b></span><span style={styles.metric}><small>丢弃 Token</small><b style={{ color: result.droppedTokens ? '#9e3f43' : '#2d654f' }}>{result.droppedTokens}</b></span></div></>
}

export function MoeRoutingExperiment({ onRun }: ExperimentProps) {
  const [concentration, setConcentration] = useState(0.8)
  const [ran, setRan] = useState(false)
  const result = simulateMoeRouting(concentration)
  const run = () => { setRan(true); onRun?.() }
  return <ExperimentFrame intro='MoE 像专家团队。总人数再多，如果路由总找同一个人，热门专家仍会排队并丢任务。' control={<div style={styles.control}><div style={styles.controlTop}><label htmlFor='routing-concentration'>路由偏科程度</label><b>{Math.round(concentration * 100)}%</b></div><input id='routing-concentration' aria-label='MoE 路由偏科程度' style={styles.range} type='range' min='0' max='1' step='0.1' value={concentration} onChange={(event) => { setConcentration(Number(event.target.value)); setRan(false) }} /><button type='button' style={styles.run} onClick={run}><Play size={15} />分配 128 个 Token</button></div>} before={<><b>均衡路由</b><MoeReadout concentration={0} /></>} after={ran ? <><b>你的路由分布</b><MoeReadout concentration={concentration} /></> : <p>调整偏科程度，再观察专家负载。</p>} conclusion={ran ? result.droppedTokens > 0 ? '路由过度集中时，热门专家超过容量，多余任务会溢出，部分 Token 可能被丢弃。' : '负载仍在容量内。均衡路由能提高吞吐，但也要保留专家分工。' : undefined} details={<><p>示例有 8 个专家、Top-2 路由和 128 个 Token，因此共有 256 次专家分配。每位专家最多处理 40 次。</p><code style={styles.code}>overflow = sum(max(0, expertLoad - capacity))</code></>} />
}

function AttentionReadout({ noiseItems }: { noiseItems: number }) {
  const result = calculateAttentionDilution(noiseItems)
  return <><Bars items={[{ label: '关键证据', value: result.relevant }, { label: '噪声合计', value: result.noise }]} /><div style={styles.metricGrid}><span style={styles.metric}><small>噪声条数</small><b>{result.noiseItems}</b></span><span style={styles.metric}><small>关键证据权重</small><b>{result.relevant}%</b></span></div></>
}

export function AttentionDilutionExperiment({ onRun }: ExperimentProps) {
  const [noiseItems, setNoiseItems] = useState(8)
  const [ran, setRan] = useState(false)
  const result = calculateAttentionDilution(noiseItems)
  const run = () => { setRan(true); onRun?.() }
  return <ExperimentFrame intro='关键证据的匹配分数不变，只把更多无关内容塞进上下文，看看它还能拿到多少注意力。' control={<div style={styles.control}><div style={styles.controlTop}><label htmlFor='attention-noise'>无关证据数量</label><b>{noiseItems} 条</b></div><input id='attention-noise' aria-label='无关证据数量' style={styles.range} type='range' min='1' max='12' step='1' value={noiseItems} onChange={(event) => { setNoiseItems(Number(event.target.value)); setRan(false) }} /><button type='button' style={styles.run} onClick={run}><Play size={15} />加入上下文</button></div>} before={<><b>只有 1 条噪声</b><AttentionReadout noiseItems={1} /></>} after={ran ? <><b>加入 {noiseItems} 条噪声</b><AttentionReadout noiseItems={noiseItems} /></> : <p>增加无关证据，再观察权重变化。</p>} conclusion={ran ? result.relevant < 50 ? '关键证据没有变差，但竞争者变多后，它得到的注意力已不足一半。更长的上下文不等于更可靠。' : '噪声较少时，关键证据仍占主要权重。RAG 应先提高相关性，再增加召回量。' : undefined} details={<><p>这是单层、单查询的教学模拟。关键证据分数固定为 3，每条噪声分数固定为 1，再一起经过 Softmax。</p><code style={styles.code}>keyWeight = exp(3) / (exp(3) + noiseCount * exp(1))</code></>} />
}

function KLReadout({ concentration }: { concentration: number }) {
  const result = compareKLDirections(concentration)
  const labels = ['主要答案', '次优答案', '少数答案']
  return <><Bars items={result.student.map((value, index) => ({ label: labels[index], value }))} /><div style={styles.metricGrid}><span style={styles.metric}><small>正向 KL</small><b>{result.forward}</b></span><span style={styles.metric}><small>反向 KL</small><b>{result.reverse}</b></span></div></>
}

export function KLDivergenceExperiment({ onRun }: ExperimentProps) {
  const [concentration, setConcentration] = useState(0.8)
  const [ran, setRan] = useState(false)
  const run = () => { setRan(true); onRun?.() }
  return <ExperimentFrame intro='教师保留多个合理答案。只让学生越来越相信第一名，观察两个 KL 方向为何给出不同惩罚。' control={<div style={styles.control}><div style={styles.controlTop}><label htmlFor='kl-concentration'>学生答案集中度</label><b>{Math.round(concentration * 100)}%</b></div><input id='kl-concentration' aria-label='学生答案集中度' style={styles.range} type='range' min='0' max='1' step='0.1' value={concentration} onChange={(event) => { setConcentration(Number(event.target.value)); setRan(false) }} /><button type='button' style={styles.run} onClick={run}><Play size={15} />比较两个方向</button></div>} before={<><b>教师分布</b><Bars items={[{ label: '主要答案', value: 70 }, { label: '次优答案', value: 20 }, { label: '少数答案', value: 10 }]} /></>} after={ran ? <><b>学生分布</b><KLReadout concentration={concentration} /></> : <p>让学生分布变窄，再比较 KL。</p>} conclusion={ran ? concentration > 0.5 ? '学生只追第一名时，会丢掉教师保留的其他合理答案。KL 的方向决定系统更怕漏答案，还是更怕出现低概率答案。' : '学生仍覆盖教师的主要分布，两种方向的惩罚都较小。' : undefined} details={<><p>正向 KL 用教师分布作为参考，更重视覆盖教师认可的答案；反向 KL 用学生分布作为参考，更容易集中到高概率模式。</p><code style={styles.code}>forward = KL(teacher || student)
reverse = KL(student || teacher)</code></>} />
}

function ResidualReadout({ layers }: { layers: number }) {
  const result = simulateResidualSignal(layers)
  return <div style={styles.metricGrid}><span style={styles.metric}><small>网络深度</small><b>{result.layers} 层</b></span><span style={styles.metric}><small>无残差信号</small><b>{result.withoutResidual}%</b></span><span style={styles.metric}><small>有残差信号</small><b>{result.withResidual}%</b></span></div>
}

export function ResidualPathExperiment({ onRun }: ExperimentProps) {
  const [layers, setLayers] = useState(32)
  const [ran, setRan] = useState(false)
  const result = simulateResidualSignal(layers)
  const run = () => { setRan(true); onRun?.() }
  return <ExperimentFrame intro='把信息连续传过很多层。每层都会有少量损耗，只改变网络深度，观察残差通道能保留多少原始信号。' control={<div style={styles.control}><div style={styles.controlTop}><label htmlFor='transformer-layers'>Transformer 深度</label><b>{layers} 层</b></div><input id='transformer-layers' aria-label='Transformer 网络深度' style={styles.range} type='range' min='2' max='48' step='2' value={layers} onChange={(event) => { setLayers(Number(event.target.value)); setRan(false) }} /><button type='button' style={styles.run} onClick={run}><Play size={15} />让信号穿过网络</button></div>} before={<><b>浅层基线</b><ResidualReadout layers={4} /></>} after={ran ? <><b>你的深度配置</b><ResidualReadout layers={layers} /></> : <p>增加网络深度，再观察信号。</p>} conclusion={ran ? result.withoutResidual < 20 ? '网络变深后，普通路径里的信号快速衰减；残差连接提供捷径，让深层网络仍能保留和更新信息。' : '浅层网络的信号损耗还不明显，继续加深后残差连接的重要性会快速上升。' : undefined} details={<><p>这是展示累积效应的教学模型，不代表真实梯度数值。示例假设普通路径每层保留 93%，残差路径每层保留 99.5%。</p><code style={styles.code}>remainingSignal = retentionPerLayer ^ layerCount</code></>} />
}

function ChunkReadout({ overlap }: { overlap: number }) {
  const result = calculateEmbeddingChunks(1800, 400, overlap)
  const repeatedTokens = result.indexedTokens - result.totalTokens
  return <div style={styles.metricGrid}><span style={styles.metric}><small>切块数量</small><b>{result.count} 块</b></span><span style={styles.metric}><small>每次前进</small><b>{result.step} Token</b></span><span style={styles.metric}><small>重复索引</small><b>{repeatedTokens} Token</b></span></div>
}

export function EmbeddingChunkingExperiment({ onRun }: ExperimentProps) {
  const [overlap, setOverlap] = useState(100)
  const [ran, setRan] = useState(false)
  const result = calculateEmbeddingChunks(1800, 400, overlap)
  const run = () => { setRan(true); onRun?.() }
  return <ExperimentFrame intro='把一篇 1800 Token 文档固定切成 400 Token 大小，只调整相邻块的重叠，观察召回连续性要付出的索引成本。' control={<div style={styles.control}><div style={styles.controlTop}><label htmlFor='chunk-overlap'>相邻块重叠</label><b>{overlap} Token</b></div><input id='chunk-overlap' aria-label='文档切块重叠大小' style={styles.range} type='range' min='0' max='300' step='50' value={overlap} onChange={(event) => { setOverlap(Number(event.target.value)); setRan(false) }} /><button type='button' style={styles.run} onClick={run}><Play size={15} />重新切块</button></div>} before={<><b>完全不重叠</b><ChunkReadout overlap={0} /></>} after={ran ? <><b>重叠 {overlap} Token</b><ChunkReadout overlap={overlap} /></> : <p>调整重叠大小，再观察块数和重复索引。</p>} conclusion={ran ? overlap === 0 ? '不重叠最省索引成本，但一句话落在边界时，前后信息可能被拆开。' : result.count >= 12 ? '重叠过大时，同一内容被反复索引，召回重复、存储和计算成本都会上升。' : '适度重叠能保留跨边界语义，但要用真实召回效果验证这部分额外成本。' : undefined} details={<><p>每块固定 400 Token，有效步长等于块大小减去重叠。最后不足一整块的内容也需要单独建立索引。</p><code style={styles.code}>count = 1 + ceil((totalTokens - chunkSize) / (chunkSize - overlap))</code></>} />
}

function VaeReadout({ factor }: { factor: number }) {
  const result = calculateVaeCompression(512, 512, factor)
  return <div style={styles.metricGrid}><span style={styles.metric}><small>像素空间</small><b>512 × 512 × 3</b></span><span style={styles.metric}><small>潜空间</small><b>{result.latentWidth} × {result.latentHeight} × 4</b></span><span style={styles.metric}><small>数值压缩</small><b>{result.ratio} 倍</b></span></div>
}

export function VaeCompressionExperiment({ onRun }: ExperimentProps) {
  const [factor, setFactor] = useState(8)
  const [ran, setRan] = useState(false)
  const result = calculateVaeCompression(512, 512, factor)
  const run = () => { setRan(true); onRun?.() }
  return <ExperimentFrame intro='不要先背潜空间。固定一张 512×512 图片，只调 VAE 的边长压缩倍率，看看去噪网络实际处理多大的数据。' control={<div style={styles.control}><div style={styles.controlTop}><label htmlFor='vae-factor'>边长压缩倍率</label><b>{factor} 倍</b></div><input id='vae-factor' aria-label='VAE 边长压缩倍率' style={styles.range} type='range' min='2' max='16' step='2' value={factor} onChange={(event) => { setFactor(Number(event.target.value)); setRan(false) }} /><button type='button' style={styles.run} onClick={run}><Play size={15} />压进潜空间</button></div>} before={<><b>直接处理 RGB 像素</b><div style={styles.metricGrid}><span style={styles.metric}><small>图片形状</small><b>512 × 512 × 3</b></span><span style={styles.metric}><small>待处理数值</small><b>786,432</b></span><span style={styles.metric}><small>计算负担</small><b>100%</b></span></div></>} after={ran ? <><b>边长压缩 {factor} 倍后</b><VaeReadout factor={factor} /></> : <p>选择压缩倍率，再观察数据规模。</p>} conclusion={ran ? result.ratio >= 48 ? '边长只缩小 8 倍，去噪网络处理的数值量就少约 48 倍；潜空间扩散因此能显著降低生成成本。' : '压缩已经减少计算量，但保留的潜变量仍较多，细节与成本之间需要继续权衡。' : undefined} details={<><p>示例把 RGB 图片编码为 4 通道潜变量。这里比较数值总量，不代表真实速度一定严格按同比例提升。</p><code style={styles.code}>compression = (width * height * 3) / (latentWidth * latentHeight * 4)</code></>} />
}

function DiffusionReadout({ timestep }: { timestep: number }) {
  const result = calculateDiffusionNoise(timestep)
  return <><Bars items={[{ label: '原图信号', value: result.signal }, { label: '随机噪声', value: result.noise }]} /><div style={styles.metricGrid}><span style={styles.metric}><small>时间步</small><b>t = {result.timestep}</b></span><span style={styles.metric}><small>还能看见原图</small><b>{result.signal}%</b></span></div></>
}

export function DiffusionNoiseExperiment({ onRun }: ExperimentProps) {
  const [timestep, setTimestep] = useState(700)
  const [ran, setRan] = useState(false)
  const result = calculateDiffusionNoise(timestep)
  const run = () => { setRan(true); onRun?.() }
  return <ExperimentFrame intro='训练时不是让模型凭空画图，而是先把真实图片逐步弄脏。只改变时间步，观察学习任务怎样变化。' control={<div style={styles.control}><div style={styles.controlTop}><label htmlFor='diffusion-timestep'>加噪时间步</label><b>t = {timestep}</b></div><input id='diffusion-timestep' aria-label='扩散加噪时间步' style={styles.range} type='range' min='0' max='1000' step='50' value={timestep} onChange={(event) => { setTimestep(Number(event.target.value)); setRan(false) }} /><button type='button' style={styles.run} onClick={run}><Play size={15} />加入这一档噪声</button></div>} before={<><b>原始图片：t = 0</b><DiffusionReadout timestep={0} /></>} after={ran ? <><b>加噪后的训练样本</b><DiffusionReadout timestep={timestep} /></> : <p>选择时间步，再观察信号与噪声。</p>} conclusion={ran ? result.signal < 30 ? '后期时间步几乎看不见原图，模型必须靠学到的数据规律猜回结构；推理就是从这个方向逐步去噪。' : '前期时间步仍保留较多原图，模型主要学习修复局部噪点和细节。' : undefined} details={<><p>这里用线性比例帮助建立直觉；真实扩散模型使用噪声调度计算信号系数，通常并不是线性变化。</p><code style={styles.code}>noisyImage = signalCoefficient * image + noiseCoefficient * randomNoise</code></>} />
}

function CfgReadout({ scale }: { scale: number }) {
  const result = calculateCfgEffect(3, 1, scale)
  const adherence = Math.min(100, Math.round(36 + scale * 8))
  const naturalness = Math.max(18, Math.round(100 - Math.max(0, scale - 5) * 9))
  return <div style={styles.metricGrid}><span style={styles.metric}><small>条件差值放大</small><b>+{result.offset}</b></span><span style={styles.metric}><small>提示遵循</small><b>{adherence}%</b></span><span style={styles.metric}><small>自然度</small><b>{naturalness}%</b></span></div>
}

export function CfgGuidanceExperiment({ onRun }: ExperimentProps) {
  const [scale, setScale] = useState(9)
  const [ran, setRan] = useState(false)
  const run = () => { setRan(true); onRun?.() }
  return <ExperimentFrame intro='固定模型、提示词和随机种子，只调 CFG。它不是“画质按钮”，而是在放大有提示和无提示预测的差值。' control={<div style={styles.control}><div style={styles.controlTop}><label htmlFor='cfg-scale'>CFG 引导强度</label><b>{scale.toFixed(1)}</b></div><input id='cfg-scale' aria-label='CFG 引导强度' style={styles.range} type='range' min='0' max='15' step='0.5' value={scale} onChange={(event) => { setScale(Number(event.target.value)); setRan(false) }} /><button type='button' style={styles.run} onClick={run}><Play size={15} />应用提示引导</button></div>} before={<><b>温和引导：CFG 3</b><CfgReadout scale={3} /></>} after={ran ? <><b>你的设置：CFG {scale.toFixed(1)}</b><CfgReadout scale={scale} /></> : <p>调整 CFG，再观察遵循度与自然度。</p>} conclusion={ran ? scale > 8 ? 'CFG 太高会让提示特征被过度放大：更“听话”，却可能出现过饱和、轮廓发硬和伪影。' : scale < 3 ? 'CFG 太低时画面更自然，但提示词对结果的控制变弱。' : '中等 CFG 通常能在提示遵循和自然度之间取得更稳妥的平衡。' : undefined} details={<><p>遵循度和自然度是教学指标，不是通用质量分。真正效果受模型、采样器和提示词共同影响。</p><code style={styles.code}>guided = unconditioned + scale * (conditioned - unconditioned)</code></>} />
}

function SamplingReadout({ steps }: { steps: number }) {
  const result = calculateSamplingTradeoff(steps, 200)
  return <div style={styles.metricGrid}><span style={styles.metric}><small>采样步数</small><b>{result.steps} 步</b></span><span style={styles.metric}><small>单图延迟</small><b>{result.latency} 秒</b></span><span style={styles.metric}><small>教学质量指数</small><b>{result.quality}</b></span></div>
}

export function SamplingStepsExperiment({ onRun }: ExperimentProps) {
  const [steps, setSteps] = useState(40)
  const [ran, setRan] = useState(false)
  const result = calculateSamplingTradeoff(steps, 200)
  const baseline = calculateSamplingTradeoff(20, 200)
  const run = () => { setRan(true); onRun?.() }
  return <ExperimentFrame intro='固定其他设置，每一步耗时 200ms。只增加采样步数，看看等待时间和质量收益是不是一起线性增长。' control={<div style={styles.control}><div style={styles.controlTop}><label htmlFor='sampling-steps'>采样步数</label><b>{steps} 步</b></div><input id='sampling-steps' aria-label='图像采样步数' style={styles.range} type='range' min='5' max='60' step='5' value={steps} onChange={(event) => { setSteps(Number(event.target.value)); setRan(false) }} /><button type='button' style={styles.run} onClick={run}><Play size={15} />开始采样</button></div>} before={<><b>20 步基线</b><SamplingReadout steps={20} /></>} after={ran ? <><b>你的采样预算</b><SamplingReadout steps={steps} /></> : <p>调整步数，再比较延迟与质量。</p>} conclusion={ran ? steps > 30 ? `比 20 步多等 ${(result.latency - baseline.latency).toFixed(1)} 秒，但质量指数只增加 ${result.quality - baseline.quality}；采样步数越多，边际收益越小。` : '低步数能快速出候选图，适合探索阶段；确定方向后再增加步数做最终交付。' : undefined} details={<><p>质量指数使用饱和曲线演示边际收益，不对应具体模型跑分。真实最佳步数要按模型、采样器和业务标准实测。</p><code style={styles.code}>latency = steps * timePerStep; qualityGain gradually saturates</code></>} />
}

function PromptLimitReadout({ tokenCount }: { tokenCount: number }) {
  const result = calculatePromptTruncation(tokenCount)
  return <><Bars items={[{ label: '编码器能看到', value: result.usage }, { label: '未用容量', value: 100 - result.usage }]} /><div style={styles.metricGrid}><span style={styles.metric}><small>提示 Token</small><b>{result.tokenCount}</b></span><span style={styles.metric}><small>进入编码器</small><b>{result.visibleTokens}</b></span><span style={styles.metric}><small>被截断</small><b style={{ color: result.isTruncated ? '#9e3f43' : '#2d654f' }}>{result.ignoredTokens}</b></span></div></>
}

export function PromptTruncationExperiment({ onRun }: ExperimentProps) {
  const [tokenCount, setTokenCount] = useState(100)
  const [ran, setRan] = useState(false)
  const result = calculatePromptTruncation(tokenCount)
  const run = () => { setRan(true); onRun?.() }
  return <ExperimentFrame intro='以常见的 77 Token 文本编码上限为例。固定模型，只把提示词越写越长，看看后面的描述是否真的进入模型。' control={<div style={styles.control}><div style={styles.controlTop}><label htmlFor='prompt-token-count'>提示词长度</label><b>{tokenCount} Token</b></div><input id='prompt-token-count' aria-label='图像提示词 Token 数量' style={styles.range} type='range' min='20' max='120' step='5' value={tokenCount} onChange={(event) => { setTokenCount(Number(event.target.value)); setRan(false) }} /><button type='button' style={styles.run} onClick={run}><Play size={15} />送入文本编码器</button></div>} before={<><b>精简提示：60 Token</b><PromptLimitReadout tokenCount={60} /></>} after={ran ? <><b>你的提示长度</b><PromptLimitReadout tokenCount={tokenCount} /></> : <p>增加描述长度，再观察模型真正能看到多少。</p>} conclusion={ran ? result.isTruncated ? `最后 ${result.ignoredTokens} 个 Token 没有进入编码器。把关键主体和关系放在前面，比无止境堆风格词更可靠。` : '当前提示仍在编码窗口内；继续增加文字不一定更好，还要避免概念彼此冲突。' : undefined} details={<><p>77 Token 是部分 CLIP 配置的典型上限，不是所有图像模型的统一限制。生产中应读取目标模型对应文本编码器的真实上限。</p><code style={styles.code}>visibleTokens = min(promptTokens, encoderLimit)</code></>} />
}

function NegativePromptReadout({ count }: { count: number }) {
  const result = calculateNegativeSuppression(count)
  return <div style={styles.metricGrid}><span style={styles.metric}><small>负向约束数量</small><b>{result.count} 条</b></span><span style={styles.metric}><small>错误特征概率</small><b>{result.errorProbability}%</b></span><span style={styles.metric}><small>是否绝对禁止</small><b>否</b></span></div>
}

export function NegativePromptExperiment({ onRun }: ExperimentProps) {
  const [count, setCount] = useState(5)
  const [ran, setRan] = useState(false)
  const result = calculateNegativeSuppression(count)
  const run = () => { setRan(true); onRun?.() }
  return <ExperimentFrame intro='固定模型、正向提示和随机种子，只增加负向提示。观察“不想要的特征”是被删除了，还是只变得更少见。' control={<div style={styles.control}><div style={styles.controlTop}><label htmlFor='negative-prompt-count'>负向提示数量</label><b>{count} 条</b></div><input id='negative-prompt-count' aria-label='负向提示词数量' style={styles.range} type='range' min='0' max='10' step='1' value={count} onChange={(event) => { setCount(Number(event.target.value)); setRan(false) }} /><button type='button' style={styles.run} onClick={run}><Play size={15} />应用负向提示</button></div>} before={<><b>不使用负向提示</b><NegativePromptReadout count={0} /></>} after={ran ? <><b>加入 {count} 条负向约束</b><NegativePromptReadout count={count} /></> : <p>增加负向提示，再观察错误概率。</p>} conclusion={ran ? result.errorProbability <= 5 ? '错误特征明显减少，却没有变成 0%。负向提示是概率上的软引导，不是程序里的硬删除。' : '少量负向提示只能轻微压低错误概率；结构性问题通常还需要模型、控制条件或后处理解决。' : undefined} details={<><p>概率曲线是教学模拟。负向提示过多还可能互相冲突或损伤正常画面，不能把所有失败词都无限追加。</p><code style={styles.code}>errorProbability = baseProbability * exp(-constraintCount * strength)</code></>} />
}

function DenoiseReadout({ strength }: { strength: number }) {
  const result = calculateDenoiseRetention(strength)
  return <><Bars items={[{ label: '原图结构保留', value: result.retention }, { label: '模型重构空间', value: result.variability }]} /><div style={styles.metricGrid}><span style={styles.metric}><small>重绘强度</small><b>{result.strength.toFixed(1)}</b></span><span style={styles.metric}><small>原图保留</small><b>{result.retention}%</b></span></div></>
}

export function DenoiseStrengthExperiment({ onRun }: ExperimentProps) {
  const [strength, setStrength] = useState(0.8)
  const [ran, setRan] = useState(false)
  const result = calculateDenoiseRetention(strength)
  const run = () => { setRan(true); onRun?.() }
  return <ExperimentFrame intro='图生图不是简单加滤镜。固定原图和提示词，只调重绘强度，观察模型自由发挥与保留原图之间的交换。' control={<div style={styles.control}><div style={styles.controlTop}><label htmlFor='denoise-strength'>重绘强度</label><b>{strength.toFixed(1)}</b></div><input id='denoise-strength' aria-label='图生图重绘强度' style={styles.range} type='range' min='0' max='1' step='0.1' value={strength} onChange={(event) => { setStrength(Number(event.target.value)); setRan(false) }} /><button type='button' style={styles.run} onClick={run}><Play size={15} />重新绘制图片</button></div>} before={<><b>轻微修改：强度 0.2</b><DenoiseReadout strength={0.2} /></>} after={ran ? <><b>你的重绘设置</b><DenoiseReadout strength={strength} /></> : <p>调整强度，再观察保留与重构。</p>} conclusion={ran ? result.retention < 40 ? '高强度给模型更多重构空间，但主体、构图和身份特征都可能偏离原图。' : '低到中等强度更适合修饰细节；如果目标是换构图，需要主动提高重绘强度。' : undefined} details={<><p>这是建立参数方向感的教学映射。真实保留程度还受采样器、提示词、ControlNet 和模型能力影响。</p><code style={styles.code}>structureRetention ≈ 1 - denoiseStrength</code></>} />
}

function CostReadout({ successRate }: { successRate: number }) {
  const result = calculateEffectiveImageCost(successRate)
  return <div style={styles.metricGrid}><span style={styles.metric}><small>业务成功率</small><b>{Math.round(result.successRate * 100)}%</b></span><span style={styles.metric}><small>平均尝试次数</small><b>{result.attempts} 次</b></span><span style={styles.metric}><small>单位有效图成本</small><b>¥{result.totalUnitCost}</b></span></div>
}

export function EffectiveImageCostExperiment({ onRun }: ExperimentProps) {
  const [successRate, setSuccessRate] = useState(0.8)
  const [ran, setRan] = useState(false)
  const result = calculateEffectiveImageCost(successRate)
  const run = () => { setRan(true); onRun?.() }
  return <ExperimentFrame intro='单次生成只要 ¥0.16，看起来很便宜。但交付成本取决于多少张候选里才有一张真正可用。' control={<div style={styles.control}><div style={styles.controlTop}><label htmlFor='image-success-rate'>有效图片成功率</label><b>{Math.round(successRate * 100)}%</b></div><input id='image-success-rate' aria-label='有效图片成功率' style={styles.range} type='range' min='0.1' max='0.9' step='0.1' value={successRate} onChange={(event) => { setSuccessRate(Number(event.target.value)); setRan(false) }} /><button type='button' style={styles.run} onClick={run}><Play size={15} />计算真实交付成本</button></div>} before={<><b>低成功率：20%</b><CostReadout successRate={0.2} /></>} after={ran ? <><b>你的生产成功率</b><CostReadout successRate={successRate} /></> : <p>调整成功率，再计算一张有效图的成本。</p>} conclusion={ran ? result.totalUnitCost < 0.4 ? '成功率提升后，废片和重试一起减少。生产优化不能只盯单次推理价格，更要提升首次可用率。' : '大量废片把便宜的单次生成放大成昂贵的交付成本；提示、模型和审核链路都需要优化。' : undefined} details={<><p>教学假设每次生成 ¥0.16，每张最终有效图另有 ¥0.12 审核成本，暂不计人工返工和后处理。</p><code style={styles.code}>effectiveCost = generationCost / successRate + auditCost</code></>} />
}

function ApiBudgetReadout({ cacheRate }: { cacheRate: number }) {
  const result = calculateApiSamplingBudget(1000, 1, cacheRate)
  return <div style={styles.metricGrid}><span style={styles.metric}><small>付费教师调用</small><b>{result.paidCalls.toLocaleString()}</b></span><span style={styles.metric}><small>可处理请求</small><b>{result.processedRequests.toLocaleString()}</b></span><span style={styles.metric}><small>缓存命中</small><b>{result.cacheHits.toLocaleString()}</b></span></div>
}

export function ApiSamplingBudgetExperiment({ onRun }: ExperimentProps) {
  const [cacheRate, setCacheRate] = useState(0.8)
  const [ran, setRan] = useState(false)
  const result = calculateApiSamplingBudget(1000, 1, cacheRate)
  const run = () => { setRan(true); onRun?.() }
  return <ExperimentFrame intro='假设教师 API 每次调用 ¥1、总预算 ¥1000。只调整可复用请求的缓存率，看看同样预算能覆盖多少数据。' control={<div style={styles.control}><div style={styles.controlTop}><label htmlFor='api-cache-rate'>缓存复用率</label><b>{Math.round(cacheRate * 100)}%</b></div><input id='api-cache-rate' aria-label='教师 API 缓存复用率' style={styles.range} type='range' min='0' max='0.8' step='0.1' value={cacheRate} onChange={(event) => { setCacheRate(Number(event.target.value)); setRan(false) }} /><button type='button' style={styles.run} onClick={run}><Play size={15} />花掉这笔预算</button></div>} before={<><b>每条请求都重新付费</b><ApiBudgetReadout cacheRate={0} /></>} after={ran ? <><b>复用相同教师输出</b><ApiBudgetReadout cacheRate={cacheRate} /></> : <p>调整缓存率，再观察预算覆盖量。</p>} conclusion={ran ? result.cacheHits > 0 ? `缓存让 ${result.cacheHits.toLocaleString()} 条重复请求不必再次调用教师。同样预算覆盖更多数据，但新问题的教师调用量并没有凭空增加。` : '没有缓存时，重复请求也会再次付费。先去重并版本化缓存，再决定是否扩大采样。' : undefined} details={<><p>这是预算直觉实验。真实成本还包括 Token 长度、失败重试、过滤、人审以及教师版本变化导致的缓存失效。</p><code style={styles.code}>processedRequests = paidCalls / (1 - cacheRate)</code></>} />
}

function ReplayReadout({ replayRate }: { replayRate: number }) {
  const result = calculateReplayRetention(replayRate)
  return <div style={styles.metricGrid}><span style={styles.metric}><small>医疗专用能力</small><b>{result.specialistScore} 分</b></span><span style={styles.metric}><small>通用能力</small><b>{result.generalScore} 分</b></span><span style={styles.metric}><small>安全拒答</small><b>{result.safetyScore} 分</b></span></div>
}

export function ReplayRetentionExperiment({ onRun }: ExperimentProps) {
  const [replayRate, setReplayRate] = useState(0.15)
  const [ran, setRan] = useState(false)
  const result = calculateReplayRetention(replayRate)
  const run = () => { setRan(true); onRun?.() }
  return <ExperimentFrame intro='把学生训练成医疗专用助手。固定训练量，只调整旧通用数据的 Replay 比例，观察“新本事”和“老能力”怎样交换。' control={<div style={styles.control}><div style={styles.controlTop}><label htmlFor='replay-rate'>通用数据 Replay</label><b>{Math.round(replayRate * 100)}%</b></div><input id='replay-rate' aria-label='通用数据回放比例' style={styles.range} type='range' min='0' max='0.3' step='0.05' value={replayRate} onChange={(event) => { setReplayRate(Number(event.target.value)); setRan(false) }} /><button type='button' style={styles.run} onClick={run}><Play size={15} />重新训练学生</button></div>} before={<><b>只练医疗任务：Replay 0%</b><ReplayReadout replayRate={0} /></>} after={ran ? <><b>加入 {Math.round(replayRate * 100)}% 旧数据</b><ReplayReadout replayRate={replayRate} /></> : <p>调整 Replay，再比较三种能力。</p>} conclusion={ran ? replayRate >= 0.1 && replayRate <= 0.2 ? '少量旧数据像定期复习：专用能力只让渡一点，通用和安全能力却大幅恢复。' : result.specialistScore < 94 ? 'Replay 过多时，老能力保住了，但有限训练预算被分走，专用能力开始下降。' : 'Replay 太少，学生学会新任务的同时仍可能忘掉常识和安全边界。' : undefined} details={<><p>分数是展示灾难性遗忘方向的教学模拟。生产中必须用目标域、通用、安全和拒答等独立评测集验证。</p><code style={styles.code}>trainingMix = specialistData + replayData</code></>} />
}

function CompressionOrderReadout({ quantizeFirst }: { quantizeFirst: boolean }) {
  const result = compareCompressionOrder(quantizeFirst)
  return <div style={styles.metricGrid}><span style={styles.metric}><small>执行顺序</small><b>{result.order}</b></span><span style={styles.metric}><small>质量保留</small><b>{result.qualityRetention}%</b></span><span style={styles.metric}><small>返工轮次</small><b>{result.reworkRounds}</b></span></div>
}

export function CompressionOrderExperiment({ onRun }: ExperimentProps) {
  const [quantizeFirst, setQuantizeFirst] = useState(true)
  const [ran, setRan] = useState(false)
  const result = compareCompressionOrder(quantizeFirst)
  const run = () => { setRan(true); onRun?.() }
  return <ExperimentFrame intro='蒸馏和量化都能压缩模型，但顺序不能随便换。保持模型与目标一致，只选择谁先做。' control={<div style={styles.control}><div style={styles.choiceRow}><button type='button' aria-pressed={!quantizeFirst} style={{ ...styles.choice, ...(!quantizeFirst ? styles.activeChoice : {}) }} onClick={() => { setQuantizeFirst(false); setRan(false) }}>先蒸馏，再量化</button><button type='button' aria-pressed={quantizeFirst} style={{ ...styles.choice, ...(quantizeFirst ? styles.activeChoice : {}) }} onClick={() => { setQuantizeFirst(true); setRan(false) }}>先量化，再蒸馏</button></div><button type='button' style={styles.run} onClick={run}><Play size={15} />执行压缩流程</button></div>} before={<><b>推荐基线</b><CompressionOrderReadout quantizeFirst={false} /></>} after={ran ? <><b>你的执行顺序</b><CompressionOrderReadout quantizeFirst={quantizeFirst} /></> : <p>选择顺序，再观察质量和返工。</p>} conclusion={ran ? result.qualityRetention < 90 ? '先量化会先损失教师信号和训练精度，再做蒸馏更难补回来；速度相同，质量和返工却更差。' : '先完成能力迁移，再量化部署权重，通常更容易分别定位质量损失并回滚。' : undefined} details={<><p>数值是教学对比，不是跨模型保证。生产流程仍需为每一步保留独立基线、校准集和回归结果。</p><code style={styles.code}>recommended stack: distill → quantize → speculative decoding</code></>} />
}
