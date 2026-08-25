import { useMemo, useState } from 'react'
import { ddpmCompute, type NoiseSchedule } from './compute'
import { ComparisonGrid, ComparisonMetric, MechanismChain, TeachingScaffold } from '../shared/TeachingScaffold'
import { becauseTherefore } from '../shared/teaching'

const baselineInput = { timestep: 40, totalSteps: 100, schedule: 'linear' as const, predictionError: 0.1, seed: 2026 }

function signal(values: readonly number[]) {
  return `[${values.map((value) => value.toFixed(2)).join(', ')}]`
}

export default function DdpmLab() {
  const [timestep, setTimestep] = useState(baselineInput.timestep)
  const [schedule, setSchedule] = useState<NoiseSchedule>(baselineInput.schedule)
  const [predictionError, setPredictionError] = useState(baselineInput.predictionError)
  const baseline = useMemo(() => ddpmCompute(baselineInput), [])
  const result = useMemo(() => ddpmCompute({ ...baselineInput, timestep, schedule, predictionError }), [timestep, schedule, predictionError])
  const changed = timestep !== baselineInput.timestep || schedule !== baselineInput.schedule || predictionError !== baselineInput.predictionError
  const snrReading = result.signalToNoise >= 1 ? '信号仍强于噪声' : '噪声已经强于信号'
  const qualityReading = result.reconstructionError <= baseline.reconstructionError ? '重建误差不高于基线' : '重建误差高于基线'
  const explanation = becauseTherefore(
    `噪声阶段走到第 ${timestep} 步，${schedule === 'linear' ? '线性教学日程' : '余弦日程'}把当前信噪比变为 ${result.signalToNoise}，同时模型估错程度为 ${predictionError.toFixed(2)}`,
    `${snrReading}，反推干净信号时${qualityReading}（均方误差 ${result.reconstructionError}）；更晚的阶段与更大估错会让恢复难度上升，而真实产品增加去噪步数又会抬高延迟和单图成本`,
  )

  return (
    <TeachingScaffold
      story={{
        actor: 'AI 生成内容（AIGC）图片产品负责人正在决定默认生成档位',
        challenge: '用户要更清晰的图，但更多去噪步骤会增加等待和算力成本；模型一旦估错噪声，最终图还可能出现结构破损。',
        question: '当前噪声阶段与模型估错程度，怎样共同改变重建质量，并提示什么成本取舍？',
      }}
      tasks={['先固定第 40 步、线性噪声分配、0.10 估错程度作为基线。', '只改“噪声阶段”或“模型估错程度”，先不要同时改三个控件。', '沿着干净 → 带噪 → 重建看信号，再读信噪比与均方误差。']}
      taskState={{ baselineReady: true, changedKnob: changed }}
      terms={[
        { term: 'Timestep（噪声阶段）', meaning: '当前走到加噪过程的第几步。', direction: '通常越后噪声越多、恢复越难。' },
        { term: 'Schedule（噪声分配方式）', meaning: '噪声在各阶段如何分配。', direction: '不同方式会让同一阶段保留不同信号量。' },
        { term: 'Prediction error（模型估错程度）', meaning: '模型预测的噪声与真实噪声相差多少。', direction: '越大 = 去噪方向越不准。' },
        { term: 'SNR（信噪比）', meaning: '信号强度相对噪声强度。', direction: '大于 1 表示信号更强；小于 1 表示噪声占主导。' },
        { term: 'MSE（均方误差）', meaning: '重建结果偏离干净样本的平均平方距离。', direction: '越低越接近原样本。' },
      ]}
      controls={
        <fieldset className='paper-lab-controls'><legend>本轮旋钮</legend>
          <label>Timestep（噪声阶段）<output>{timestep}/100</output><input type='range' min='1' max='100' value={timestep} onChange={(event) => setTimestep(Number(event.target.value))} /><small>调大表示观察更靠后的高噪声阶段。</small></label>
          <label>Schedule（噪声分配方式）<select value={schedule} onChange={(event) => setSchedule(event.target.value as NoiseSchedule)}><option value='linear'>线性（教学近似）</option><option value='cosine'>余弦</option></select><small>切换后比较同一步的信噪比。</small></label>
          <label>Prediction error（模型估错程度）<output>{predictionError.toFixed(2)}</output><input type='range' min='0' max='0.5' step='0.01' value={predictionError} onChange={(event) => setPredictionError(Number(event.target.value))} /><small>调大表示模型对噪声判断更不准。</small></label>
        </fieldset>
      }
      results={
        <>
          <MechanismChain steps={[
            { label: 'Clean · 干净信号', value: signal(result.cleanSample), tone: 'is-clean' },
            { label: 'Noisy · 带噪信号', value: signal(result.noisySample), tone: 'is-noisy' },
            { label: 'Reconstructed · 重建信号', value: signal(result.reconstructed), tone: 'is-reconstructed' },
          ]} />
          <ComparisonGrid>
            <ComparisonMetric label='SNR · 信噪比' baseline={String(baseline.signalToNoise)} current={String(result.signalToNoise)} delta={snrReading} hint='不是越大越“有创意”；它只表示此刻还剩多少可辨认信号。' />
            <ComparisonMetric label='MSE · 重建均方误差' baseline={String(baseline.reconstructionError)} current={String(result.reconstructionError)} delta={`${result.reconstructionError >= baseline.reconstructionError ? '+' : ''}${(result.reconstructionError - baseline.reconstructionError).toFixed(4)}`} hint='越低越接近干净样本；0 表示这个教学例子中完全重建。' />
            <ComparisonMetric label='噪声阶段' baseline={`${baseline.timestep}/100`} current={`${result.timestep}/100`} delta={schedule === baselineInput.schedule ? '分配方式未变' : '已切换分配方式'} hint='阶段不是线上采样延迟本身，但帮助理解去噪任务在不同噪声强度下的难度。' />
          </ComparisonGrid>
        </>
      }
      explanation={<p className='paper-dynamic-explanation'>{explanation}</p>}
      transfer={{
        metric: '可用图率 / P95 生成延迟 / 单张可用图成本三项并列。',
        guardrail: '按人像、文字、复杂构图切片；结构错误率与超时率任一越线即停。',
        action: '先灰度低流量质量档；延迟或成本超预算就回退默认步数，失败切片转入重试或保守模型。',
      }}
      boundary='一维 4 点信号和闭式教学重建，不含神经网络训练、真实逐步采样、条件引导或图像空间。'
    />
  )
}
