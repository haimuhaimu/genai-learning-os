import { useMemo, useState } from 'react'
import { reactCompute, type ReactMode } from './compute'

export default function ReActLab() {
  const [mode, setMode] = useState<ReactMode>('react')
  const [conflict, setConflict] = useState(true)
  const [toolsAvailable, setToolsAvailable] = useState(true)
  const [budget, setBudget] = useState(6)
  const result = useMemo(() => reactCompute({ mode, conflict, toolsAvailable, budget }), [mode, conflict, toolsAvailable, budget])
  return (
    <div className='paper-experiment'>
      <fieldset className='paper-lab-controls'><legend>可调变量</legend><label>执行模式<select value={mode} onChange={(event) => setMode(event.target.value as ReactMode)}><option value='direct'>Direct</option><option value='cot'>CoT-only</option><option value='react'>ReAct</option></select></label><label>预算上限 <output>{budget} 步</output><input type='range' min='1' max='6' value={budget} onChange={(event) => setBudget(Number(event.target.value))} /></label><label className='paper-lab-check'><input type='checkbox' checked={conflict} onChange={(event) => setConflict(event.target.checked)} />注入冲突观察</label><label className='paper-lab-check'><input type='checkbox' checked={toolsAvailable} onChange={(event) => setToolsAvailable(event.target.checked)} />允许工具调用</label></fieldset>
      <section className='paper-lab-results' aria-live='polite'><h3>确定性行动轨迹</h3><ol className='react-trajectory'>{result.steps.map((step, index) => <li key={`${step.kind}-${index}`}><span>{step.kind}</span><p>{step.text}</p></li>)}</ol><p className={result.success ? 'lab-success' : 'lab-boundary'}>{result.success ? '轨迹达到安全结果。' : result.failureAt}</p></section>
      <section className='paper-lab-explain'><article><h3>机制解释</h3><p>ReAct 让 Thought、Action、Observation 交替；冲突观察会触发核验，而不是被更长的内部推理覆盖。</p></article><article><h3>产品 / 策略结论</h3><p>可靠性应定位到工具、参数、顺序和停止条件；预算不足时应安全停止或转人工。</p></article><article><h3>简化边界</h3><p>固定退款环境和规则表，不调用模型或真实工具；轨迹只用于说明控制流。</p></article></section>
    </div>
  )
}
