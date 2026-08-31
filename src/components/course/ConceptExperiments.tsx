import { useState, type ReactNode } from 'react'
import { ArrowRight, Play, RotateCcw } from 'lucide-react'
import { blendDistillationTargets, simulateGradientDescent, softmaxAtTemperature, type LabeledValue } from './conceptExperimentMath'
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
