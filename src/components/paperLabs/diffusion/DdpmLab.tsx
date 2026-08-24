import { useMemo, useState } from 'react'
import { ddpmCompute, type NoiseSchedule } from './compute'

export default function DdpmLab() {
  const [timestep, setTimestep] = useState(40)
  const [schedule, setSchedule] = useState<NoiseSchedule>('linear')
  const [predictionError, setPredictionError] = useState(0.1)
  const result = useMemo(() => ddpmCompute({ timestep, totalSteps: 100, schedule, predictionError, seed: 2026 }), [timestep, schedule, predictionError])
  return (
    <div className='paper-experiment'>
      <fieldset className='paper-lab-controls'><legend>可调变量</legend><label>时间步 <output>{timestep}/100</output><input type='range' min='1' max='100' value={timestep} onChange={(event) => setTimestep(Number(event.target.value))} /></label><label>噪声日程<select value={schedule} onChange={(event) => setSchedule(event.target.value as NoiseSchedule)}><option value='linear'>线性（教学近似）</option><option value='cosine'>余弦</option></select></label><label>噪声预测误差 <output>{predictionError.toFixed(2)}</output><input type='range' min='0' max='0.5' step='0.01' value={predictionError} onChange={(event) => setPredictionError(Number(event.target.value))} /></label></fieldset>
      <section className='paper-lab-results' aria-live='polite'><h3>前向加噪与教学版反向重建</h3><div className='paper-result-grid'><article><span>带噪样本</span><strong>[{result.noisySample.join(', ')}]</strong><small>固定种子 2026；相同设置始终相同</small></article><article><span>信噪比 SNR</span><strong>{result.signalToNoise}</strong><small>时间步越后通常信号越弱</small></article><article><span>重建均方误差</span><strong>{result.reconstructionError}</strong><small>预测误差会被反向过程放大</small></article></div></section>
      <section className='paper-lab-explain'><article><h3>机制解释</h3><p>前向过程按累计 α 混合干净样本与固定高斯噪声；反向示例用预测噪声估计原样本。</p></article><article><h3>产品 / 策略结论</h3><p>采样步数、预测误差与单张可用图成本要联合评估，不能只比较视觉观感。</p></article><article><h3>简化边界</h3><p>一维 4 点信号和闭式教学重建，不包含神经网络训练、逐步采样、条件引导或图像空间。</p></article></section>
    </div>
  )
}
