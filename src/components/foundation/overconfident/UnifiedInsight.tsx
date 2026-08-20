import { useState } from 'react'

export default function UnifiedInsight() {
  const [showMath, setShowMath] = useState(false)

  return (
    <section className='unified-insight' aria-labelledby='unified-insight-title'>
      <header>
        <p>统一关系</p>
        <h2 id='unified-insight-title'>模型好不好，与策略怎么用，是两件事</h2>
      </header>

      <ol className='feedback-loop' aria-label='模型、策略、反馈与训练的关系'>
        <li><span>01</span><b>模型给概率</b><small>对结果发生可能性的估计</small></li>
        <li><span>02</span><b>策略决定动作</b><small>阈值、流量、预算与保护边界</small></li>
        <li><span>03</span><b>真实反馈被观察</b><small>只有被曝光、触达或复核的样本产生标签</small></li>
        <li><span>04</span><b>下一轮训练</b><small>可见样本进入后续训练与评估</small></li>
      </ol>

      <ul className='insight-points'>
        <li><b>交叉熵关心：</b>真实发生的结果，你提前给了多少概率。</li>
        <li><b>策略关心：</b>不同错误的业务代价、预算与保护边界。</li>
        <li><b>策略还会决定</b>哪些反馈能被看见，这会影响下一轮模型。</li>
      </ul>

      <p className='offline-note'>改变策略不会直接改变同一离线全集上的交叉熵；它会改变线上哪些样本留下反馈，以及下一轮训练数据与可见误差。</p>

      <button type='button' className='quiet-button formula-toggle' aria-expanded={showMath} aria-controls='strategy-formulas' onClick={() => setShowMath((current) => !current)}>
        看看公式 <span aria-hidden='true'>{showMath ? '−' : '+'}</span>
      </button>

      {showMath && (
        <div className='math-note' id='strategy-formulas' role='region' aria-label='指标与业务成本公式'>
          <p><b>离线交叉熵</b> = <code>-平均[y ln p + (1-y) ln(1-p)]</code></p>
          <p><b>业务成本</b> = <code>漏判成本 + 误判成本 + 资源成本</code></p>
          <small>前者是训练 / 评估层指标，后者是策略层决策依据。二者相关，但不能混为同一个目标。</small>
        </div>
      )}
    </section>
  )
}
