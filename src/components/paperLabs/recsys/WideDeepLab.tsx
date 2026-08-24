import { useMemo, useState } from 'react'
import { wideDeepCompute, type WideDeepMode } from './compute'

export default function WideDeepLab() {
  const [mode, setMode] = useState<WideDeepMode>('joint')
  const [deepWeight, setDeepWeight] = useState(1)
  const result = useMemo(() => wideDeepCompute({ mode, deepWeight }), [mode, deepWeight])
  return (
    <div className='paper-experiment'>
      <fieldset className='paper-lab-controls'><legend>可调变量</legend><label>推荐分支<select value={mode} onChange={(event) => setMode(event.target.value as WideDeepMode)}><option value='wide'>wide-only</option><option value='deep'>deep-only</option><option value='joint'>wide + deep</option></select></label><label>Deep 分支权重 <output>{deepWeight.toFixed(1)}</output><input type='range' min='0' max='2' step='0.1' value={deepWeight} onChange={(event) => setDeepWeight(Number(event.target.value))} /></label></fieldset>
      <section className='paper-lab-results' aria-live='polite'><h3>分支贡献与切片结果</h3><div className='paper-result-grid'>{result.rows.map((row) => <article key={row.id}><span>{row.slice} · {row.label}</span><strong>{(row.probability * 100).toFixed(1)}%</strong><small>Wide {row.wideContribution.toFixed(2)} · Deep {row.deepContribution.toFixed(2)} · {row.probability >= 0.5 ? '通过推荐门槛' : '未通过门槛'}</small></article>)}</div></section>
      <section className='paper-lab-explain'><article><h3>机制解释</h3><p>Wide 分支记忆已出现的稀疏组合，Deep 分支把特征映射到连续表示以泛化，联合 logit 经 Sigmoid 得到概率。</p></article><article><h3>产品 / 策略结论</h3><p>热门、冷启动与长尾应分切片验收；总 CTR 可能掩盖 deep 泛化对冷启动的价值。</p></article><article><h3>简化边界</h3><p>仅使用 3 个固定样本和固定参数，没有训练、embedding 学习、负样本或线上校准。</p></article></section>
    </div>
  )
}
