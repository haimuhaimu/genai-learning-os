import { ArrowRight, CheckCircle2, Circle, FlaskConical, FunctionSquare, GitBranch, ShieldCheck, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { evidenceLevelLabels, readStrategyEvidence, STRATEGY_EVIDENCE_EVENT, type EvidenceLevel } from '../../strategyEvidence'
import { decisionMathCaseCatalog } from '../strategy/caseRegistry'

const tools: Record<string, string> = {
  'calibration-threshold': '可靠性图 · ECE',
  'bayes-rollout': 'Beta 后验 · 可信区间',
  'similarity-gating': 'Cosine · Recall / Precision',
  'optimizer-stability': '梯度范数 · Clip / Warmup',
  'entropy-kl-tradeoff': 'Entropy · KL(P‖Q)',
  'ab-causal-design': '分层随机 · Switchback',
  'reward-sequential-policy': 'Reward shaping · Verifier',
  'error-propagation': '状态转移 · 复合成功率',
}
const layers = [
  { title: '证据可信', range: '01–03', icon: ShieldCheck, intro: '先判断概率、先验与相似度是否真的支持行动。', ids: ['calibration-threshold', 'bayes-rollout', 'similarity-gating'] },
  { title: '优化与分布', range: '04–05', icon: FunctionSquare, intro: '把下降速度、稳定性、确定性与覆盖放进同一张账本。', ids: ['optimizer-stability', 'entropy-kl-tradeoff'] },
  { title: '实验与长期决策', range: '06–08', icon: GitBranch, intro: '从单次指标走向因果、多步奖励与端到端可靠性。', ids: ['ab-causal-design', 'reward-sequential-policy', 'error-propagation'] },
]
type Go = (page: string, options?: Record<string, string>) => void

export default function DecisionMathHub({ go }: { go: Go }) {
  const [records, setRecords] = useState(() => readStrategyEvidence())
  useEffect(() => {
    const sync = () => setRecords(readStrategyEvidence())
    window.addEventListener(STRATEGY_EVIDENCE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => { window.removeEventListener(STRATEGY_EVIDENCE_EVENT, sync); window.removeEventListener('storage', sync) }
  }, [])
  const levels = useMemo(() => new Map(records.map((record) => [record.caseId, record.level])), [records])
  const formed = decisionMathCaseCatalog.filter((item) => (levels.get(item.id) ?? 0) >= 2).length
  const indexById = new Map(decisionMathCaseCatalog.map((item, index) => [item.id, index + 1]))

  return (
    <section className='decision-math-hub'>
      <header className='decision-math-hero'>
        <div>
          <span>STRATEGY-FIRST · MATHEMATICAL JUDGMENT</span>
          <h1>AI 决策数学</h1>
          <p>不从证明开始，从“这个数字够不够支持决策”开始。</p>
          <small>这是面向策略产品与运营的数学底座。8 个 Case 均可独立完成，但建议按顺序建立判断链。</small>
          <button type='button' onClick={() => go('strategy-case', { case: decisionMathCaseCatalog[0].id })}>从第一个 Case 开始<ArrowRight aria-hidden='true' /></button>
        </div>
        <aside aria-label={`已形成策略 ${formed} / 8`}>
          <Sparkles aria-hidden='true' />
          <span>完成概览</span>
          <strong>{formed}<i>/ 8</i></strong>
          <p>以“已形成策略”为完成，不以打开页面计数。</p>
          <div>{decisionMathCaseCatalog.map((item) => <i key={item.id} className={(levels.get(item.id) ?? 0) >= 2 ? 'is-formed' : ''} />)}</div>
        </aside>
      </header>

      <div className='decision-math-layers'>
        {layers.map(({ icon: Icon, ...layer }) => (
          <section key={layer.title} aria-labelledby={`math-layer-${layer.range}`}>
            <header><div><Icon aria-hidden='true' /><span>{layer.range}</span></div><h2 id={`math-layer-${layer.range}`}>{layer.title}</h2><p>{layer.intro}</p></header>
            <div>
              {layer.ids.map((id) => {
                const item = decisionMathCaseCatalog.find((candidate) => candidate.id === id)!
                const level = (levels.get(item.id) ?? 0) as EvidenceLevel
                const index = indexById.get(item.id)!
                return (
                  <article key={item.id}>
                    <header><span>CASE {String(index).padStart(2, '0')}</span><small>预计 3–5 分钟</small></header>
                    <h3>{item.title}</h3>
                    <dl><dt>核心数学工具</dt><dd>{tools[item.id]}</dd></dl>
                    <footer>
                      <span className={`level-${level}`}>{level ? <CheckCircle2 aria-hidden='true' /> : <Circle aria-hidden='true' />}{evidenceLevelLabels[level]}</span>
                      <button type='button' onClick={() => go(item.page, item.options)}>{level ? '继续判断' : '开始 Case'}<ArrowRight aria-hidden='true' /></button>
                    </footer>
                  </article>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <section className='decision-math-frontier'>
        <div><FlaskConical aria-hidden='true' /><span>从数学底座走向前沿判断</span><h2>Evaluator 与 simulation，都需要先回答“证据可信吗？”</h2><p>校准、因果与序贯奖励支撑 evaluator 可信度判断；贝叶斯、状态转移与误差传播帮助识别 simulation 何时能替代真实反馈、何时必须停手。</p></div>
        <div><button type='button' onClick={() => go('strategy-case', { case: 'evaluator-trust' })}>连接 Self-Evolving<ArrowRight /></button><button type='button' onClick={() => go('strategy-case', { case: 'simulator-vs-reality' })}>连接 World Model<ArrowRight /></button></div>
      </section>
    </section>
  )
}
