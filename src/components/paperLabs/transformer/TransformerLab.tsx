import { useMemo, useState } from 'react'
import { attentionCompute } from './compute'

export default function TransformerLab() {
  const [queryPosition, setQueryPosition] = useState(2)
  const [scaleDivisor, setScaleDivisor] = useState(Math.sqrt(3))
  const [causal, setCausal] = useState(true)
  const result = useMemo(() => attentionCompute({ queryPosition, scaleDivisor, causal }), [queryPosition, scaleDivisor, causal])
  return (
    <div className='paper-experiment'>
      <fieldset className='paper-lab-controls'><legend>可调变量</legend>
        <label>查询 token<select value={queryPosition} onChange={(event) => setQueryPosition(Number(event.target.value))}>{result.tokens.map((token, index) => <option key={`${token}-${index}`} value={index}>{index + 1} · {token}</option>)}</select></label>
        <label>缩放除数 <output>{scaleDivisor.toFixed(2)}</output><input type='range' min='0.5' max='3' step='0.1' value={scaleDivisor} onChange={(event) => setScaleDivisor(Number(event.target.value))} /></label>
        <label className='paper-lab-check'><input type='checkbox' checked={causal} onChange={(event) => setCausal(event.target.checked)} />开启 causal mask（因果遮罩）</label>
      </fieldset>
      <section className='paper-lab-results' aria-live='polite'><h3>注意力权重</h3><p>查询“{result.tokens[result.queryPosition]}”如何把信息路由到各 token：</p><div className='attention-bars'>{result.tokens.map((token, index) => <div key={`${token}-${index}`}><span>{token}</span><i style={{ width: `${result.weights[index] * 100}%` }} /><strong>{(result.weights[index] * 100).toFixed(1)}%</strong></div>)}</div><small>权重和：{result.weights.reduce((sum, value) => sum + value, 0).toFixed(4)} · 输出向量 [{result.output.join(', ')}]</small></section>
      <section className='paper-lab-explain'><article><h3>机制解释</h3><p>先计算 Q·K，再除以缩放因子、应用遮罩并做 Softmax，最后按权重汇聚 V。因果遮罩让当前位置看不到未来 token。</p></article><article><h3>产品 / 策略结论</h3><p>上下文长度不等于证据利用率；应检查关键证据实际获得的注意力与任务结果。</p></article><article><h3>简化边界</h3><p>固定 4 个 token、单头和小矩阵，不包含位置编码、残差、FFN、训练或真实模型行为。</p></article></section>
    </div>
  )
}
