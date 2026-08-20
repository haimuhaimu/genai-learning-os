import { ArrowRight, BookCheck, ClipboardCheck, Gauge, Rocket, ShieldCheck } from 'lucide-react'

type Go = (page: string, options?: Record<string, string>) => void
type ReviewScenario = { index: string; title: string; description: string; action: string; page: string; options?: Record<string, string>; icon: typeof ClipboardCheck }

const scenarios: ReviewScenario[] = [
  { index: '01', title: '方案是否值得做', description: '用目标、能力边界、成本与评测证据，替代“模型看起来很聪明”。', action: '打开方案评估', page: 'evaluation', icon: ClipboardCheck },
  { index: '02', title: '系统是否可以上线', description: '检查可靠性、安全、可观测、回滚与预算，形成明确 Launch Gate。', action: '进入 Launch Gate', page: 'distill-lab', options: { experiment: 'launch-gate' }, icon: Rocket },
  { index: '03', title: 'Agent 是否真的可靠', description: '用 Rubric + veto 评审工具、拓扑、KV Cache 与后训练方案。', action: '打开评审卡', page: 'agent-book-review', options: { card: 'kv-cache-scan' }, icon: BookCheck },
]

export default function ReviewsHub({ go }: { go: Go }) {
  return (
    <section className='lo-hub-page lo-reviews-page'>
      <header className='lo-reviews-intro'>
        <div><span>评审中心</span><h1>让结论经得起<br /><em>真实约束</em></h1></div>
        <div className='lo-review-thesis'><ShieldCheck aria-hidden='true' /><p>评审不是最后一张表，而是把成功标准、风险底线、证据指针和回滚条件写进决策。</p></div>
      </header>
      <div className='lo-reviews-layout'>
        <section className='lo-review-scenarios' aria-label='真实评审情境'>
          <header><span>真实评审情境</span><h2>从问题出发，不从工具出发</h2></header>
          {scenarios.map(({ icon: Icon, ...scenario }) => (
            <article key={scenario.index}>
              <div className='lo-review-number'><span>{scenario.index}</span><Icon aria-hidden='true' /></div>
              <div><h3>{scenario.title}</h3><p>{scenario.description}</p></div>
              <button type='button' onClick={() => go(scenario.page, scenario.options)}>{scenario.action}<ArrowRight /></button>
            </article>
          ))}
        </section>
        <aside className='lo-review-gates'>
          <section><span>门禁原则</span><h2>证据优先，否决项先行</h2><ol><li><b>成功标准</b><small>明确什么结果才算值得继续。</small></li><li><b>证据指针</b><small>让每个判断都能回到数据和实验。</small></li><li><b>风险底线</b><small>先检查安全、预算和不可接受后果。</small></li><li><b>回滚条件</b><small>上线前写清何时停止和如何恢复。</small></li></ol></section>
          <section className='lo-review-tools'><header><Gauge aria-hidden='true' /><div><b>更多评审工具</b><small>上线沙盘与统一指标手册</small></div></header><button type='button' onClick={() => go('review')}>方案评审沙盘<ArrowRight /></button><button type='button' onClick={() => go('agent-lab', { experiment: 'launch-gate' })}>Agent Launch Gate<ArrowRight /></button><button type='button' onClick={() => go('handbook')}>公式与指标手册<ArrowRight /></button></section>
        </aside>
      </div>
    </section>
  )
}
