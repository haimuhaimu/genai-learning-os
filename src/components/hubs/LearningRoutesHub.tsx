import { ArrowRight, BookOpen, BookOpenText, BrainCircuit, Calculator, Compass, FlaskConical, GitBranch, Home, Image, Network, RefreshCw, Sigma, Sparkles } from 'lucide-react'
import { goldenPaperLabs } from '../paperLabs/paperLabsRegistry'
import { getPaperLessonSummary } from '../paperLabs/shared/paperLessonProgress'
import { usePaperLessonProgressMap } from '../paperLabs/shared/usePaperLessonProgressMap'

type Go = (page: string, options?: Record<string, string>) => void

const primerRoute = {
  title: '数学零层（Math Primer）', tag: '符号扫盲', icon: BookOpenText, page: 'math-primer',
  who: '第一次看人工智能（Artificial Intelligence，AI）公式，或想先补齐符号直觉的人', gain: '用人话看懂求和符号 Σ、概率、向量、梯度、损失函数（Loss）、熵与 KL 散度',
  terms: '先把英文和缩写换成中文，再学习它们如何影响业务判断。',
}

const routes = [
  { title: '算法基础', tag: '入门', icon: Sigma, page: 'foundation', who: '需要补齐最小数学与机制直觉的人', gain: '看懂转换器架构（Transformer）与混合专家模型（Mixture of Experts，MoE）', terms: '概率归一化函数（Softmax）把分数变成概率；交叉熵（Cross-Entropy，CE）衡量预测和答案的差距。', lab: 'Softmax / CE 实验', labPage: 'foundation-lab', experiment: 'softmax-ce' },
  { title: 'AI 决策数学', tag: '数学底座', icon: Calculator, page: 'decision-math', who: '需要用数字支持策略判断的产品与运营', gain: '把概率、优化、因果与序贯决策变成 8 次短练习', terms: '用概率和实验回答“这个数字够不够支持行动”。', lab: '开始概率校准', labPage: 'strategy-case', experiment: 'calibration-threshold' },
  { title: '大语言模型系统', tag: '进阶', icon: BrainCircuit, page: 'expert-llm', who: '大语言模型（Large Language Model，LLM）产品、研发与系统架构师', gain: '连接训练、推理、服务和评估决策', terms: '键值缓存（Key-Value Cache，KV Cache）会保存模型已经算过的“哪些信息值得关注”的结果，用内存换生成速度。', lab: 'KV / 服务成本', labPage: 'expert-lab', experiment: 'kv-cost' },
  { title: '图像生成', tag: '进阶', icon: Image, page: 'expert-image', who: '图像产品、内容与创作工具团队', gain: '理解扩散、控制与生产评估', terms: '扩散模型（Diffusion）逐步去噪成图；流匹配（Flow Matching，Flow）学习从噪声到图片的变化路径。', lab: 'Diffusion / Flow', labPage: 'expert-lab', experiment: 'diffusion-flow', branch: true },
  { title: '智能体系统', tag: '进阶', icon: Network, page: 'expert-agent', who: '正在把模型接入工具和业务流程的人', gain: '掌握循环执行、工具、记忆、安全与上线', terms: '智能体（AI Agent）会在循环执行（Loop）中反复观察、行动和检查结果。', lab: 'Loop Simulator', labPage: 'agent-lab', experiment: 'loop-simulator' },
  { title: '智能体工程手册', tag: '硬核', icon: BookOpen, page: 'agent-book', who: '需要系统化智能体工程方法的实践者', gain: '掌握上下文、运行框架与持续进化', terms: '上下文（Context）是模型当前可见的信息；智能体运行框架（Agent Harness）负责组织工具和流程；模型上下文协议（Model Context Protocol，MCP）统一连接外部工具；k 次尝试至少一次通过率（Pass at k，Pass@k）衡量多次尝试的成功机会。', lab: 'Pass@k vs Pass^k', labPage: 'agent-book-lab', experiment: 'pass-at-k' },
  { title: '模型蒸馏', tag: '硬核', icon: FlaskConical, page: 'distill-course', who: '关注能力保持、成本与部署的人', gain: '设计教师、数据、损失与上线闸门', terms: '知识蒸馏（Knowledge Distillation，KD）让小模型模仿大模型；上线闸门（Launch Gate）规定达到哪些指标才可发布。', lab: 'Launch Gate', labPage: 'distill-lab', experiment: 'launch-gate' },
]

const frontierRoutes = [
  {
    title: '自进化', tag: '前沿探索', icon: Sparkles,
    page: 'strategy-case', options: { case: 'evaluator-trust' } as Record<string, string>,
    subtitle: '什么场景可以让 AI 自己出题、自己评分、自动迭代？什么场景必须停手？',
    who: '策略产品与 Agent 工程负责人', gain: '判断 evaluator 是否可信，识别 judge 与 policy 的同步漂移',
    ctaLabel: '进入评估器可信度（Evaluator Trust）',
  },
  {
    title: '世界模型', tag: '前沿探索', icon: GitBranch,
    page: 'strategy-case', options: { case: 'simulator-vs-reality' } as Record<string, string>,
    subtitle: '什么时候值得建一套内部模拟器，什么时候 LLM+工具就够了？',
    who: '关心仿真、规划与新方向的团队', gain: '在真实 A/B、LLM 推演与轻量世界模型之间做出取舍',
    ctaLabel: '进入模拟与现实（Simulator vs Reality）',
  },
]

export default function LearningRoutesHub({ go }: { go: Go }) {
  const caseProgress = usePaperLessonProgressMap()
  const caseSummary = getPaperLessonSummary(caseProgress, goldenPaperLabs.map((lab) => lab.paperId))
  const nextCase = goldenPaperLabs.find((lab) => lab.paperId === caseSummary.nextId) ?? goldenPaperLabs[0]
  const mainline = routes.filter((route) => !route.branch)
  const branch = routes.find((route) => route.branch)
  if (!branch) {
    return (
      <section className='lo-hub-page lo-routes-page'>
        <div className='lo-routes-fallback' role='alert'>
          <Compass aria-hidden='true' />
          <span>学习路线暂不可用</span>
          <h1>路线数据没有完整加载</h1>
          <p>你可以先回到首页选择其他入口，或刷新页面重新载入路线数据。</p>
          <div><button type='button' onClick={() => go('unified-map')}><Home aria-hidden='true' />回到首页</button><button type='button' className='is-quiet' onClick={() => window.location.reload()}><RefreshCw aria-hidden='true' />刷新页面</button></div>
        </div>
      </section>
    )
  }

  const BranchIcon = branch.icon
  const PrimerIcon = primerRoute.icon

  return (
    <section className='lo-hub-page lo-routes-page'>
      <header className='lo-routes-intro'>
        <div><span>学习路线</span><h1>先选方向，<br /><em>再进入内容</em></h1></div>
        <p>七条基础与应用路线覆盖算法机制、AI 决策数学、生成模型与智能体（AI Agent）工程；另有两条前沿探索路线。每条路线都连接课程、实验和评审，不需要在二十多个页面里猜入口。</p>
        <button type='button' className='strategy-route-entry' onClick={() => go('strategy-cases')}>进入策略案例（Case）中心<ArrowRight /></button>
      </header>
      <section className='lo-routes-fallback' aria-labelledby='case-route-title'>
        <BookOpen aria-hidden='true' /><span>案例课程主线 · {caseSummary.completed}/{caseSummary.total} 已通关</span><h1 id='case-route-title'>通过 Case 学 AI</h1><p>七门黄金课串起 Attention、蒸馏、推荐、扩散、Agent、世界模型与 MoE；支持刷新续学和通关复习。</p>
        <div><button type='button' onClick={() => go('paper-lab', caseSummary.completed === caseSummary.total ? {} : { paper: nextCase.paperId })}>{caseSummary.completed === caseSummary.total ? '回目录复习' : '继续案例主线'}<ArrowRight aria-hidden='true' /></button></div>
      </section>
      <div className='lo-routes-layout'>
        <section className='lo-route-mainline' aria-label='建议学习主线'>
          <header><div><span>建议主线</span><h2>从数学零层到模型蒸馏</h2></div><p>第一次看公式，可以先扫盲；也可以根据工作目标跳读。</p></header>
          <div>
            <article className='lo-route-chapter'>
              <div className='lo-route-index'><span>{primerRoute.tag}</span><PrimerIcon aria-hidden='true' /></div>
              <div className='lo-route-copy'><header><h3>{primerRoute.title}</h3><i>建议起点</i></header><dl><div><dt>适合谁</dt><dd>{primerRoute.who}</dd></div><div><dt>你将获得</dt><dd>{primerRoute.gain}</dd></div></dl><p className='lo-route-terms'><b>黑话翻译</b>{primerRoute.terms}</p></div>
              <footer><button type='button' aria-label='进入数学零层（Math Primer）' onClick={() => go(primerRoute.page)}>先扫盲<ArrowRight aria-hidden='true' /></button></footer>
            </article>
            {mainline.map(({ icon: Icon, ...route }, index) => (
              <article key={route.title} className='lo-route-chapter'>
                <div className='lo-route-index'><span>第 {index + 1} 章</span><Icon aria-hidden='true' /></div>
                <div className='lo-route-copy'><header><h3>{route.title}</h3><i>{route.tag}</i></header><dl><div><dt>适合谁</dt><dd>{route.who}</dd></div><div><dt>你将获得</dt><dd>{route.gain}</dd></div></dl><p className='lo-route-terms'><b>黑话翻译</b>{route.terms}</p></div>
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
          <p className='lo-route-terms'><b>黑话翻译</b>{branch.terms}</p>
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
