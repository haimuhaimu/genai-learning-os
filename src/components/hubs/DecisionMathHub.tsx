import { ArrowRight, BookOpenText, CheckCircle2, Circle, FlaskConical, FunctionSquare, GitBranch, ShieldCheck, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { evidenceLevelLabels, readStrategyEvidence, STRATEGY_EVIDENCE_EVENT, type EvidenceLevel } from '../../strategyEvidence'
import { decisionMathCaseCatalog } from '../strategy/caseRegistry'

const tools: Record<string, { label: string; plain: string }> = {
  'calibration-threshold': { label: '期望校准误差（Expected Calibration Error，ECE）', plain: '检查模型说的置信度，和实际正确率是否对得上。' },
  'bayes-rollout': { label: '贝塔后验分布（Beta posterior）· 可信区间（credible interval）', plain: '结合已有经验和新数据，给真实效果圈出一段可信范围。' },
  'similarity-gating': { label: '余弦相似度（Cosine similarity）· 召回率（Recall）/ 精确率（Precision）', plain: '同时看内容有多像、该找的找回多少、找回的有多少是真的。' },
  'optimizer-stability': { label: '梯度裁剪（Gradient Clipping，Clip）· 预热（Warmup）', plain: '限制过大的更新，并让训练步子从小到大逐渐升温。' },
  'entropy-kl-tradeoff': { label: '熵（Entropy）· KL 散度（Kullback–Leibler divergence，KL）', plain: '前者看概率有多犹豫，后者看两份概率分布差多远。' },
  'ab-causal-design': { label: 'A/B 对照实验（A/B test）· 交替切换实验（Switchback）', plain: '用对照或按时段交替，尽量分清变化是否真由策略造成。' },
  'reward-sequential-policy': { label: '奖励塑形（Reward shaping）· 验证器（Verifier）', plain: '把过程目标写进奖励，再用规则或模型检查结果是否合格。' },
  'error-propagation': { label: '状态转移 · 复合成功率', plain: '把每一步的成功与失败串起来，看端到端结果是否可靠。' },
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
      <aside className='decision-math-primer-entry'>
        <div><BookOpenText aria-hidden='true' /><span>第一次看公式？</span><p><b>数学零层</b>不讲证明，先把 Σ、概率、向量、梯度、损失函数（Loss）、熵与 KL 散度（Kullback–Leibler divergence，KL）翻译成人话。</p></div>
        <button type='button' onClick={() => go('math-primer')}>先扫盲，再做案例（Case）<ArrowRight aria-hidden='true' /></button>
      </aside>
      <header className='decision-math-hero'>
        <div>
          <span>人工智能（Artificial Intelligence，AI）· 策略优先 · 数学判断</span>
          <h1>AI 决策数学</h1>
          <p>不从证明开始，从“这个数字够不够支持决策”开始。</p>
          <small>这是面向策略产品与运营的数学底座。8 个案例均可独立完成，但建议按顺序建立判断链。</small>
          <button type='button' onClick={() => go('strategy-case', { case: decisionMathCaseCatalog[0].id })}>从第一个案例开始<ArrowRight aria-hidden='true' /></button>
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
                const item = decisionMathCaseCatalog.find((candidate) => candidate.id === id)
                if (!item) return null

                const level = (levels.get(item.id) ?? 0) as EvidenceLevel
                const index = indexById.get(item.id)
                if (index === undefined) return null

                return (
                  <article key={item.id}>
                    <header><span>案例（Case） {String(index).padStart(2, '0')}</span><small>预计 3–5 分钟</small></header>
                    <h3>{item.title}</h3>
                    <dl><dt>核心数学工具</dt><dd>{tools[item.id].label}<small>{tools[item.id].plain}</small></dd></dl>
                    <footer>
                      <span className={`level-${level}`}>{level ? <CheckCircle2 aria-hidden='true' /> : <Circle aria-hidden='true' />}{evidenceLevelLabels[level]}</span>
                      <button type='button' onClick={() => go(item.page, item.options)}>{level ? '继续判断' : '开始案例练习'}<ArrowRight aria-hidden='true' /></button>
                    </footer>
                  </article>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <section className='decision-math-frontier'>
        <div><FlaskConical aria-hidden='true' /><span>从数学底座走向前沿判断</span><h2>评估器（Evaluator）与模拟实验（simulation），都需要先回答“证据可信吗？”</h2><p>校准、因果与序贯奖励支撑评估器可信度判断；贝叶斯、状态转移与误差传播帮助识别模拟实验何时能替代真实反馈、何时必须停手。</p><p className='decision-math-frontier-terms'><b>黑话翻译：</b>自进化（Self-Evolving）是让系统利用反馈持续改进；世界模型（World Model）是让系统学习环境如何变化，用来预测和规划。</p></div>
        <div><button type='button' onClick={() => go('strategy-case', { case: 'evaluator-trust' })}>连接自进化（Self-Evolving）<ArrowRight /></button><button type='button' onClick={() => go('strategy-case', { case: 'simulator-vs-reality' })}>连接世界模型（World Model）<ArrowRight /></button></div>
      </section>
    </section>
  )
}
