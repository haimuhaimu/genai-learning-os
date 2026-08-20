import { ArrowRight, BookOpen, BrainCircuit, Calculator, Compass, FlaskConical, GitBranch, Image, Network, Sigma, Sparkles } from 'lucide-react'

type Go = (page: string, options?: Record<string, string>) => void

const routes = [
  { title: '算法基础', tag: '入门', icon: Sigma, page: 'foundation', who: '需要补齐最小数学与机制直觉的人', gain: '看懂分布、优化、Transformer 与 MoE', lab: 'Softmax / CE 实验', labPage: 'foundation-lab', experiment: 'softmax-ce' },
  { title: 'AI 决策数学', tag: '数学底座', icon: Calculator, page: 'decision-math', who: '需要用数字支持策略判断的产品与运营', gain: '把概率、优化、因果与序贯决策变成 8 次短练习', lab: '开始概率校准', labPage: 'strategy-case', experiment: 'calibration-threshold' },
  { title: 'LLM 系统', tag: '进阶', icon: BrainCircuit, page: 'expert-llm', who: 'LLM 产品、研发与系统架构师', gain: '连接训练、推理、服务和评估决策', lab: 'KV / 服务成本', labPage: 'expert-lab', experiment: 'kv-cost' },
  { title: '图像生成', tag: '进阶', icon: Image, page: 'expert-image', who: '图像产品、内容与创作工具团队', gain: '理解扩散、控制与生产评估', lab: 'Diffusion / Flow', labPage: 'expert-lab', experiment: 'diffusion-flow', branch: true },
  { title: 'Agent 系统', tag: '进阶', icon: Network, page: 'expert-agent', who: '正在把模型接入工具和业务流程的人', gain: '掌握 Loop、工具、记忆、安全与上线', lab: 'Loop Simulator', labPage: 'agent-lab', experiment: 'loop-simulator' },
  { title: 'Agent Book', tag: '硬核', icon: BookOpen, page: 'agent-book', who: '需要系统化 Agent 工程方法的实践者', gain: '掌握 Context、Harness 与持续进化', lab: 'Pass@k vs Pass^k', labPage: 'agent-book-lab', experiment: 'pass-at-k' },
  { title: '模型蒸馏', tag: '硬核', icon: FlaskConical, page: 'distill-course', who: '关注能力保持、成本与部署的人', gain: '设计教师、数据、损失与上线闸门', lab: 'Launch Gate', labPage: 'distill-lab', experiment: 'launch-gate' },
]

const frontierRoutes = [
  {
    title: '自进化', tag: '前沿探索', icon: Sparkles,
    page: 'strategy-case', options: { case: 'evaluator-trust' } as Record<string, string>,
    subtitle: '什么场景可以让 AI 自己出题、自己评分、自动迭代？什么场景必须停手？',
    who: '策略产品与 Agent 工程负责人', gain: '判断 evaluator 是否可信，识别 judge 与 policy 的同步漂移',
    ctaLabel: '进入 Evaluator Trust',
  },
  {
    title: '世界模型', tag: '前沿探索', icon: GitBranch,
    page: 'strategy-case', options: { case: 'simulator-vs-reality' } as Record<string, string>,
    subtitle: '什么时候值得建一套内部模拟器，什么时候 LLM+工具就够了？',
    who: '关心仿真、规划与新方向的团队', gain: '在真实 A/B、LLM 推演与轻量世界模型之间做出取舍',
    ctaLabel: '进入 Simulator vs Reality',
  },
]

export default function LearningRoutesHub({ go }: { go: Go }) {
  const mainline = routes.filter((route) => !route.branch)
  const branch = routes.find((route) => route.branch)!
  const BranchIcon = branch.icon

  return (
    <section className='lo-hub-page lo-routes-page'>
      <header className='lo-routes-intro'>
        <div><span>学习路线</span><h1>先选方向，<br /><em>再进入内容</em></h1></div>
        <p>七条基础与应用路线覆盖算法机制、AI 决策数学、生成模型与 Agent 工程；另有两条前沿探索路线。每条路线都连接课程、实验和评审，不需要在二十多个页面里猜入口。</p>
        <button type='button' className='strategy-route-entry' onClick={() => go('strategy-cases')}>进入策略案例地图<ArrowRight /></button>
      </header>
      <div className='lo-routes-layout'>
        <section className='lo-route-mainline' aria-label='建议学习主线'>
          <header><div><span>建议主线</span><h2>从算法基础到模型蒸馏</h2></div><p>按章节推进，也可以根据工作目标跳读。</p></header>
          <div>
            {mainline.map(({ icon: Icon, ...route }, index) => (
              <article key={route.title} className='lo-route-chapter'>
                <div className='lo-route-index'><span>第 {index + 1} 章</span><Icon aria-hidden='true' /></div>
                <div className='lo-route-copy'><header><h3>{route.title}</h3><i>{route.tag}</i></header><dl><div><dt>适合谁</dt><dd>{route.who}</dd></div><div><dt>你将获得</dt><dd>{route.gain}</dd></div></dl></div>
                <footer><button type='button' onClick={() => go(route.page)}>进入路线<ArrowRight /></button><button type='button' className='is-quiet' onClick={() => go(route.labPage, route.labPage === 'strategy-case' ? { case: route.experiment } : { experiment: route.experiment })}>{route.lab}</button></footer>
              </article>
            ))}
          </div>
        </section>
        <aside className='lo-route-branch'>
          <header><span>并行支线</span><BranchIcon aria-hidden='true' /></header>
          <h2>{branch.title}</h2>
          <p>完成算法基础后，可随时进入生成视觉方向，不打断系统主线。</p>
          <dl><div><dt>适合谁</dt><dd>{branch.who}</dd></div><div><dt>你将获得</dt><dd>{branch.gain}</dd></div></dl>
          <button type='button' onClick={() => go(branch.page)}>进入路线<ArrowRight /></button>
          <button type='button' className='is-quiet' onClick={() => go(branch.labPage, { experiment: branch.experiment })}>{branch.lab}</button>
        </aside>
      </div>
      <section className='lo-frontier-routes' aria-labelledby='lo-frontier-title'>
        <header>
          <span><Compass aria-hidden='true' />前沿探索</span>
          <h2 id='lo-frontier-title'>前沿探索：值得追但仍在早期</h2>
          <p>以下方向仍不稳定，先做决策，再理解算法。任何自动闭环上线前，请先设计人工兜底与停手条件。</p>
        </header>
        <div className='lo-frontier-grid'>
          {frontierRoutes.map(({ icon: Icon, ...route }) => (
            <article key={route.title} className='lo-frontier-card'>
              <header><Icon aria-hidden='true' /><h3>{route.title}</h3><i>{route.tag}</i></header>
              <p>{route.subtitle}</p>
              <dl><div><dt>适合谁</dt><dd>{route.who}</dd></div><div><dt>你将获得</dt><dd>{route.gain}</dd></div></dl>
              <footer><button type='button' onClick={() => go(route.page, route.options)}>{route.ctaLabel}<ArrowRight aria-hidden='true' /></button></footer>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}
