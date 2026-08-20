import { ArrowRight, Beaker, BookOpen, Boxes, BrainCircuit, FlaskConical } from 'lucide-react'

type Go = (page: string, options?: Record<string, string>) => void

const groups = [
  { title: '算法基础实验', count: 7, icon: Beaker, target: '把分布、优化与网络结构变成可操作直觉；从三分钟概率实验开始', page: 'foundation-lab', samples: [['上线策略与训练反馈', 'case-overconfident'], ['Softmax & CE', 'softmax-ce'], ['MoE Router', 'moe-router']] },
  { title: '专家模型实验', count: 6, icon: BrainCircuit, target: '估算 LLM 服务成本、诊断 RAG 与图像生成链路', page: 'expert-lab', samples: [['KV / 服务成本', 'kv-cost'], ['RAG 诊断', 'rag-doctor'], ['Diffusion / Flow', 'diffusion-flow']] },
  { title: 'Agent 系统实验', count: 8, icon: Boxes, target: '搭建可控 Loop、工具契约、记忆、安全与上线门禁', page: 'agent-lab', samples: [['Loop Simulator', 'loop-simulator'], ['Security Gate', 'security-gate'], ['Launch Gate', 'launch-gate']] },
  { title: 'Agent Book 实验', count: 6, icon: BookOpen, target: '验证 Context Engineering、Harness 与可靠性口径', page: 'agent-book-lab', samples: [['Harness 诊断', 'harness-diagnose'], ['Pass@k vs Pass^k', 'pass-at-k'], ['新信息判据', 'new-info-criterion']] },
  { title: '蒸馏实验', count: 8, icon: FlaskConical, target: '权衡温度、数据、教师预算、成本与上线标准', page: 'distill-lab', samples: [['温度实验', 'temperature-lab'], ['教师预算', 'teacher-budget-lab'], ['Launch Gate', 'launch-gate']] },
] as const

export default function LabsHub({ go }: { go: Go }) {
  return (
    <section className='lo-hub-page lo-labs-page'>
      <header className='lo-labs-intro'>
        <div><span>实验目录</span><h1>把变量交给你，<br /><em>让结果回答问题</em></h1></div>
        <aside><b>五类实验工作台</b><p>共 35 个互动实验。先写下预测，再改变参数，最后解释结果。</p><small>所有结果均为机制级教学计算。</small><button type='button' className='strategy-route-entry' onClick={() => go('strategy-cases')}>策略案例中心<ArrowRight /></button></aside>
      </header>
      <div className='lo-lab-index' role='table' aria-label='互动实验目录'>
        <div className='lo-lab-index-head' role='row'><span>实验组</span><span>能力目标</span><span>代表实验</span><span>入口</span></div>
        {groups.map(({ icon: Icon, ...group }, index) => (
          <article key={group.title} role='row'>
            <header><span>实验组 {index + 1}</span><Icon aria-hidden='true' /><div><h2>{group.title}</h2><small>{group.count} 个实验</small></div></header>
            <p>{group.target}</p>
            <ul>{group.samples.map(([label, experiment]) => <li key={experiment}><button type='button' onClick={() => go(group.page, { experiment })}>{label}<ArrowRight /></button></li>)}</ul>
            <button type='button' className='lo-full-entry' onClick={() => go(group.page)}>进入完整实验室<ArrowRight /></button>
          </article>
        ))}
      </div>
    </section>
  )
}
