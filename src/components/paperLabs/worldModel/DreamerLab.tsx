import { useMemo, useState } from 'react'
import { dreamerCompute } from './compute'

export default function DreamerLab() {
  const [accuracy, setAccuracy] = useState(0.8)
  const [imaginationLength, setImaginationLength] = useState(8)
  const result = useMemo(() => dreamerCompute({ accuracy, imaginationLength, discount: 0.95 }), [accuracy, imaginationLength])
  return (
    <div className='paper-experiment'>
      <fieldset className='paper-lab-controls'><legend>可调变量</legend><label>世界模型准确率 <output>{Math.round(accuracy * 100)}%</output><input type='range' min='0.5' max='1' step='0.05' value={accuracy} onChange={(event) => setAccuracy(Number(event.target.value))} /></label><label>想象 rollout 长度 <output>{imaginationLength} 步</output><input type='range' min='1' max='12' value={imaginationLength} onChange={(event) => setImaginationLength(Number(event.target.value))} /></label></fieldset>
      <section className='paper-lab-results' aria-live='polite'><h3>真实交互 vs 想象 rollout</h3><div className='paper-result-grid'><article><span>真实折扣回报</span><strong>{result.realReturn}</strong></article><article><span>想象折扣回报</span><strong>{result.imaginedReturn}</strong><small>偏差 {result.returnBias >= 0 ? '+' : ''}{result.returnBias}</small></article><article><span>累计模型误差</span><strong>{result.accumulatedError}</strong><small>{result.length} 步 rollout</small></article></div>{result.needsRealValidation ? <p className='lab-boundary'>想象较长且模型并不完美：需要回到真实环境做短周期对照验证。</p> : null}</section>
      <section className='paper-lab-explain'><article><h3>机制解释</h3><p>世界模型预测未来奖励，策略在想象轨迹中学习；每步小误差会随 rollout 长度累积并改变回报估计。</p></article><article><h3>产品 / 策略结论</h3><p>想象可节省真实样本，但 rollout 越长越需要真实对照、偏差监控与回退边界。</p></article><article><h3>简化边界</h3><p>固定奖励序列与显式误差函数，不含潜变量、actor-critic、训练或多环境泛化。</p></article></section>
    </div>
  )
}
