import { useState, type ReactNode } from 'react'
import { Play } from 'lucide-react'
import { ExperimentFrame } from '../course/ConceptExperiments'
import { conceptExperimentStyles as styles } from '../course/conceptExperimentStyles.mts'
import { calculateTeacherDataCoverage, calculateTeacherGap, compareAlignmentOrder, compareDistillationSignal, compareSequenceSupervision, evaluateRetentionGate, type DistillationSignal } from './distillConceptMath'

type ExperimentProps = { onRun?: () => void }

function RangeControl({ id, label, value, display, min, max, step, onChange, onRun, action }: { id: string; label: string; value: number; display: string; min: number; max: number; step: number; onChange: (value: number) => void; onRun: () => void; action: string }) {
  return <div style={styles.control}><div style={styles.controlTop}><label htmlFor={id}>{label}</label><b>{display}</b></div><input id={id} aria-label={label} style={styles.range} type='range' min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /><button type='button' style={styles.run} onClick={onRun}><Play size={15} />{action}</button></div>
}

function Metrics({ children }: { children: ReactNode }) {
  return <div style={styles.metricGrid}>{children}</div>
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return <span style={styles.metric}><small>{label}</small><b>{value}</b></span>
}

function TeacherGapReadout({ teacherScore }: { teacherScore: number }) {
  const result = calculateTeacherGap(teacherScore)
  return <Metrics><Metric label='学生基线' value={`${result.studentBaseline} 分`} /><Metric label='教师能力' value={`${result.teacherScore} 分`} /><Metric label='预期学生' value={`${result.expectedStudent} 分`} /></Metrics>
}

export function TeacherGapExperiment({ onRun }: ExperimentProps) {
  const [teacherScore, setTeacherScore] = useState(90)
  const [ran, setRan] = useState(false)
  const result = calculateTeacherGap(teacherScore)
  const update = (value: number) => { setTeacherScore(value); setRan(false) }
  const control = <RangeControl id='teacher-gap' label='教师任务得分' value={teacherScore} display={`${teacherScore} 分`} min={65} max={98} step={1} onChange={update} onRun={() => { setRan(true); onRun?.() }} action='评估蒸馏价值' />
  return <ExperimentFrame intro='学生基线固定为 65 分。只更换能力不同的教师，看看“老师更贵”是否真的意味着值得蒸馏。' control={control} before={<><b>能力接近：教师 72 分</b><TeacherGapReadout teacherScore={72} /></>} after={ran ? <><b>你的教师选择</b><TeacherGapReadout teacherScore={teacherScore} /></> : <p>调整教师能力，再评估迁移空间。</p>} conclusion={ran ? result.worthwhile ? `教师领先 ${result.gap} 分，存在明显迁移空间；下一步仍要确认它是否覆盖学生真正需要的任务。` : `教师只领先 ${result.gap} 分，蒸馏收益可能不够抵消数据、训练和评测成本。` : undefined} details={<><p>这是教师选择的教学估算。真实项目还要比较错误结构、许可、稳定性和教师调用成本。</p><code style={styles.code}>expectedGain depends on teacherScore - studentBaseline</code></>} />
}

function SignalReadout({ signal }: { signal: DistillationSignal }) {
  const result = compareDistillationSignal(signal)
  return <Metrics><Metric label='跨结构兼容' value={`${result.compatibility}%`} /><Metric label='训练成本指数' value={result.trainingCost} /><Metric label='专用知识迁移' value={`${result.specialization}%`} /></Metrics>
}

export function DistillationSignalExperiment({ onRun }: ExperimentProps) {
  const [signal, setSignal] = useState<DistillationSignal>('hidden')
  const [ran, setRan] = useState(false)
  const options: { id: DistillationSignal; label: string }[] = [{ id: 'logit', label: '只学输出 Logit' }, { id: 'hidden', label: '追加 Hidden' }, { id: 'attention', label: '追加 Attention' }]
  return <ExperimentFrame intro='固定教师和学生，只改变要模仿哪一层信号。更深入不一定更通用，也不一定更便宜。' control={<div style={styles.control}><div style={styles.choiceRow}>{options.map((option) => <button key={option.id} type='button' aria-pressed={signal === option.id} style={{ ...styles.choice, ...(signal === option.id ? styles.activeChoice : {}) }} onClick={() => { setSignal(option.id); setRan(false) }}>{option.label}</button>)}</div><button type='button' style={styles.run} onClick={() => { setRan(true); onRun?.() }}><Play size={15} />比较迁移信号</button></div>} before={<><b>通用基线：Logit</b><SignalReadout signal='logit' /></>} after={ran ? <><b>你的信号选择</b><SignalReadout signal={signal} /></> : <p>选择一种信号，再比较兼容性与成本。</p>} conclusion={ran ? signal === 'logit' ? 'Logit 最容易跨不同模型结构复用，适合作为第一版基线。' : '中间信号可能迁移更多专用知识，但需要层映射或投影器，也会增加训练显存和调试成本。' : undefined} details={<><p>指标用于展示方向，不是通用跑分。任何新增损失项都应单独消融，证明它确实带来收益。</p><code style={styles.code}>totalLoss = logitLoss + weight * representationLoss</code></>} />
}

function SequenceReadout({ onPolicy }: { onPolicy: boolean }) {
  const result = compareSequenceSupervision(onPolicy)
  return <Metrics><Metric label='训练方式' value={result.mode} /><Metric label='生产场景匹配' value={`${result.productionMatch}%`} /><Metric label='相对成本' value={`${result.relativeCost}%`} /></Metrics>
}

export function SequenceSupervisionExperiment({ onRun }: ExperimentProps) {
  const [onPolicy, setOnPolicy] = useState(true)
  const [ran, setRan] = useState(false)
  return <ExperimentFrame intro='固定任务与教师，只改变训练时的问题来自谁：直接抄教师答案，还是先让学生暴露自己的错误再纠正。' control={<div style={styles.control}><div style={styles.choiceRow}><button type='button' aria-pressed={!onPolicy} style={{ ...styles.choice, ...(!onPolicy ? styles.activeChoice : {}) }} onClick={() => { setOnPolicy(false); setRan(false) }}>直接学教师答案</button><button type='button' aria-pressed={onPolicy} style={{ ...styles.choice, ...(onPolicy ? styles.activeChoice : {}) }} onClick={() => { setOnPolicy(true); setRan(false) }}>学生先答再纠正</button></div><button type='button' style={styles.run} onClick={() => { setRan(true); onRun?.() }}><Play size={15} />执行训练方案</button></div>} before={<><b>离线教师答案</b><SequenceReadout onPolicy={false} /></>} after={ran ? <><b>你的监督方式</b><SequenceReadout onPolicy={onPolicy} /></> : <p>选择监督方式，再观察匹配度和成本。</p>} conclusion={ran ? onPolicy ? '学生先回答会暴露它在生产中真正会犯的错，教师纠正更有针对性，但调用与训练成本更高。' : '直接学习教师答案便宜稳定，却可能没有覆盖学生自己生成时遇到的错误前缀。' : undefined} details={<><p>这解释了 exposure bias：训练时只见过正确前缀，生产时却必须继续处理自己已经写错的前缀。</p><code style={styles.code}>onPolicy: student rollout → teacher correction → replay</code></>} />
}

function DataCoverageReadout({ teacherShare }: { teacherShare: number }) {
  const result = calculateTeacherDataCoverage(teacherShare)
  return <Metrics><Metric label='目标任务得分' value={`${result.targetScore} 分`} /><Metric label='长尾覆盖' value={`${result.longTailScore} 分`} /><Metric label='数据成本指数' value={result.dataCost} /></Metrics>
}

export function TeacherDataCoverageExperiment({ onRun }: ExperimentProps) {
  const [teacherShare, setTeacherShare] = useState(100)
  const [ran, setRan] = useState(false)
  const result = calculateTeacherDataCoverage(teacherShare)
  const update = (value: number) => { setTeacherShare(value); setRan(false) }
  const control = <RangeControl id='teacher-data-share' label='教师生成数据占比' value={teacherShare} display={`${teacherShare}%`} min={20} max={100} step={5} onChange={update} onRun={() => { setRan(true); onRun?.() }} action='生成训练配方' />
  return <ExperimentFrame intro='固定总数据量，只提高教师生成数据占比。观察学生越来越像教师时，长尾覆盖和成本发生什么。' control={control} before={<><b>混合配方：教师 55%</b><DataCoverageReadout teacherShare={55} /></>} after={ran ? <><b>你的数据配方</b><DataCoverageReadout teacherShare={teacherShare} /></> : <p>调整教师数据占比，再比较目标与长尾。</p>} conclusion={ran ? result.teacherShare > 80 ? '全靠教师数据会抬高目标任务分，却缩窄长尾覆盖并放大教师偏差；训练集需要学生 rollout、真人和开源数据补位。' : '混合来源牺牲少量目标分，却能覆盖更多真实输入与长尾问题。' : undefined} details={<><p>这是配方方向实验。生产中还要同时记录各来源绝对量、去重率、许可和质量过滤结果。</p><code style={styles.code}>dataset = teacher + studentRollout + human + replay</code></>} />
}

function AlignmentReadout({ alignmentFirst }: { alignmentFirst: boolean }) {
  const result = compareAlignmentOrder(alignmentFirst)
  return <Metrics><Metric label='执行顺序' value={result.order} /><Metric label='能力保留' value={`${result.capabilityRetention}%`} /><Metric label='语气一致' value={`${result.toneConsistency}%`} /><Metric label='返工轮次' value={result.reworkRounds} /></Metrics>
}

export function AlignmentOrderExperiment({ onRun }: ExperimentProps) {
  const [alignmentFirst, setAlignmentFirst] = useState(true)
  const [ran, setRan] = useState(false)
  return <ExperimentFrame intro='能力蒸馏负责“会不会”，偏好对齐负责“怎么说”。固定数据和模型，只交换两步的顺序。' control={<div style={styles.control}><div style={styles.choiceRow}><button type='button' aria-pressed={!alignmentFirst} style={{ ...styles.choice, ...(!alignmentFirst ? styles.activeChoice : {}) }} onClick={() => { setAlignmentFirst(false); setRan(false) }}>先蒸馏，再对齐</button><button type='button' aria-pressed={alignmentFirst} style={{ ...styles.choice, ...(alignmentFirst ? styles.activeChoice : {}) }} onClick={() => { setAlignmentFirst(true); setRan(false) }}>先对齐，再蒸馏</button></div><button type='button' style={styles.run} onClick={() => { setRan(true); onRun?.() }}><Play size={15} />执行训练顺序</button></div>} before={<><b>推荐基线</b><AlignmentReadout alignmentFirst={false} /></>} after={ran ? <><b>你的训练顺序</b><AlignmentReadout alignmentFirst={alignmentFirst} /></> : <p>选择顺序，再比较能力与语气。</p>} conclusion={ran ? alignmentFirst ? '先对齐出的语气可能被后续蒸馏冲淡，能力迁移也会重新改变输出分布，常常需要返工。' : '先迁移能力、再塑造偏好，更容易分别验证“会不会”和“怎么说”。' : undefined} details={<><p>推荐顺序不是绝对定律，但每一步都必须保存独立基线，并在对齐后重跑能力和安全回归。</p><code style={styles.code}>pretrain → SFT + KD → preference alignment</code></>} />
}

function GateReadout({ retention }: { retention: number }) {
  const result = evaluateRetentionGate(retention)
  return <Metrics><Metric label='核心能力保留' value={`${result.retention}%`} /><Metric label='上线门槛' value={`≥ ${result.threshold}%`} /><Metric label='闸门结论' value={result.verdict} /></Metrics>
}

export function RetentionGateExperiment({ onRun }: ExperimentProps) {
  const [retention, setRetention] = useState(89)
  const [ran, setRan] = useState(false)
  const result = evaluateRetentionGate(retention)
  const update = (value: number) => { setRetention(value); setRan(false) }
  const control = <RangeControl id='retention-gate' label='核心能力保留率' value={retention} display={`${retention}%`} min={70} max={99} step={1} onChange={update} onRun={() => { setRan(true); onRun?.() }} action='执行上线闸门' />
  return <ExperimentFrame intro='先只看一条不可妥协的核心能力闸门：保留率必须达到 90%。拖动实测结果，亲手做 Go / No-Go 决策。' control={control} before={<><b>擦线失败：89%</b><GateReadout retention={89} /></>} after={ran ? <><b>你的实测结果</b><GateReadout retention={retention} /></> : <p>调整保留率，再执行上线判断。</p>} conclusion={ran ? result.verdict === 'Go' ? `通过核心能力闸门，高出门槛 ${result.gap} 个百分点；仍需继续检查安全、延迟和成本。` : `低于门槛 ${Math.abs(result.gap)} 个百分点，即使平均分和成本很好也不能上线。` : undefined} details={<><p>完整上线决策还包含幻觉、安全、p95 和成本。这里故意一次只观察一个硬闸门，避免总体平均掩盖核心退化。</p><code style={styles.code}>Go only if every hard gate passes</code></>} />
}
