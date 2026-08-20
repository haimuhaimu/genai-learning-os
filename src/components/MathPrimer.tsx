import { useState, type MouseEvent } from 'react'
import { ArrowDown, ArrowRight, BrainCircuit, Check, CircleHelp, RotateCcw, Sparkles } from 'lucide-react'

type Concept = {
  id: string
  title: string
  symbol: string
  plain: string
  ai: string
  mistake: string
  example: string
}

type ConceptGroup = {
  id: string
  step: string
  title: string
  intro: string
  concepts: Concept[]
}

const quickTerms = [
  { term: '人工智能（Artificial Intelligence，AI）', plain: '让机器完成识别、生成、判断等原本需要人来做的任务。' },
  { term: '数学入门（Math Primer）', plain: '只补继续学习所需的最少数学直觉，不是完整数学课。' },
  { term: '文本单位（token）', plain: '模型读写文字时切分出的基本小块，可能是字、词或词的一部分。' },
  { term: '概率归一化函数（Softmax）', plain: '把一组分数变成总和为 1 的候选概率。' },
  { term: "自然常数（Euler's number，e）", plain: '约等于 2.718，是指数增长和概率公式里的常用底数。' },
  { term: '学习率（learning rate，η）', plain: '控制模型每次根据错误调整参数的步子有多大。' },
  { term: '查询向量 / 键向量（Query / Key，Q/K）', plain: 'Q 会和 K 匹配，判断当前该关注谁。这里的“注意力机制”，就是模型计算哪些信息更值得关注的方式。' },
  { term: '损失函数（Loss）', plain: '把模型错得多严重压成一个可比较、可优化的数字。' },
  { term: 'KL 散度（Kullback–Leibler divergence，KL）', plain: '衡量两份概率分布有多不一样，而且交换方向后结果可能不同。' },
  { term: '人类反馈强化学习（Reinforcement Learning from Human Feedback，RLHF）', plain: '把人的偏好反馈变成训练信号，让模型回答更符合期待。' },
  { term: '知识蒸馏（Knowledge Distillation，KD）', plain: '让较小的学生模型模仿较大的教师模型，以降低使用成本。' },
]

const conceptGroups: ConceptGroup[] = [
  {
    id: 'numbers', step: '01', title: '先认数：数字也有“收纳盒”', intro: '先知道一个数大概属于哪一类，不需要背严格证明。',
    concepts: [
      { id: 'number-line', title: '数轴', symbol: '← −2 −1 0 1 2 →', plain: '把数放在一条线上：越往右越大，距离表示相差多少。', ai: '看损失升降、参数变化、概率阈值时，都在用这条“大小与距离”的直觉。', mistake: '数轴不是只能放整数；小数、负数、π 都能找到位置。', example: '−1 在 2 左边，两者相差 3。' },
      { id: 'natural', title: '自然数', symbol: 'ℕ = 0, 1, 2, …', plain: '拿来计数的数；这里把 0 也算进去。', ai: 'token 个数、层数、样本数、训练步数通常都是自然数。', mistake: '不同教材可能从 1 开始；看到 ℕ 时先确认是否包含 0。', example: '一句话有 8 个 token，8 ∈ ℕ。' },
      { id: 'integer', title: '整数', symbol: 'ℤ = …, −1, 0, 1, …', plain: '自然数加上它们的负数，没有小数部分。', ai: '类别编号、位置索引、量化后的整数权重里常见。', mistake: '整数不等于正数；−3 和 0 都是整数。', example: '索引从 0 到 3：0, 1, 2, 3。' },
      { id: 'rational', title: '有理数', symbol: 'ℚ: a / b', plain: '能写成两个整数之比的数，有限小数和循环小数都属于它。', ai: '学习率、采样比例、准确率的手算例子经常用有理数。', mistake: '“有理”不是“讲道理”；关键是能否写成分数。', example: '0.75 = 3/4，所以是有理数。' },
      { id: 'irrational', title: '无理数', symbol: 'π, √2, e', plain: '不能写成整数比的小数，会无限延伸且不循环。', ai: '指数、对数和正态分布公式里常见 e；几何里常见 π。', mistake: '无理数不是无法计算，只是通常用近似值。', example: '√2 ≈ 1.414，但不等于 1.414。' },
      { id: 'real', title: '实数', symbol: 'ℝ', plain: '数轴上所有数的总集合，包含有理数和无理数。', ai: '模型的参数、向量元素、损失值通常先被当作实数讨论。', mistake: '计算机实际存的是有限精度近似，并没有真的存下任意实数。', example: '−2、0.5、π 都属于 ℝ。' },
    ],
  },
  {
    id: 'formula', step: '02', title: '再读公式：字母是在替数字占位', intro: '公式不是暗号，而是一句压缩过的操作说明。',
    concepts: [
      { id: 'variable', title: '变量', symbol: 'x, y, θ', plain: '一个可以改变、或暂时还不知道具体值的占位名字。', ai: 'x 常表示输入，y 表示答案，θ 常表示模型参数。', mistake: '字母本身没有固定含义；含义由当前公式定义。', example: 'x = 3 时，x + 2 = 5。' },
      { id: 'function', title: '函数', symbol: 'y = f(x)', plain: '一台规则固定的机器：放进 x，按规则吐出一个结果。', ai: '神经网络整体就是一个很大的函数：输入文字，输出概率或文字。', mistake: '函数不一定是一条公式，也可以是一段程序或一张查找表。', example: 'f(x)=x+1；放入 2，得到 3。' },
      { id: 'exponent', title: '指数', symbol: 'aⁿ', plain: '表示同一个数连续乘自己多少次。', ai: '指数函数用于 Softmax；参数量、搜索空间也常出现指数增长。', mistake: 'a³ 是 a×a×a，不是 a×3。', example: '2³ = 2×2×2 = 8。' },
      { id: 'logarithm', title: '对数', symbol: 'log₂8 = 3', plain: '指数的反问句：“底数要乘自己几次，才得到这个数？”', ai: '交叉熵、似然、困惑度里常见 log，它把连乘变成相加。', mistake: 'log 不是“把数变小”的装饰；底数与输入范围都重要。', example: '因为 2³=8，所以 log₂8=3。' },
      { id: 'sigma', title: 'Σ（求和）', symbol: 'Σᵢ xᵢ', plain: '把一串数按顺序全部加起来的缩写。', ai: '总损失、注意力加权、均值、方差与概率归一化里随处可见。', mistake: 'Σ 不是一个未知数；上下标会说明从哪里加到哪里。', example: 'Σᵢ₌₁³ i = 1+2+3 = 6。' },
      { id: 'mean', title: '平均值', symbol: 'x̄ = Σxᵢ / n', plain: '把已经看到的一批数加起来，再除以数量。', ai: '平均 loss、平均延迟、数据特征的中心位置。', mistake: '平均值会被极端值拉动，也不代表每个样本都接近它。', example: '2, 4, 6 的平均值是 4。' },
      { id: 'expectation', title: '期望', symbol: 'E[X]', plain: '如果同一件随机的事重复很多次，长期平均大概会落在哪里。', ai: '期望损失、期望奖励和强化学习目标中常见。', mistake: '期望不一定是某次真的会出现的结果。', example: '公平骰子的期望是 3.5，但掷不出 3.5。' },
      { id: 'variance', title: '方差', symbol: 'Var(X)', plain: '衡量一批数离平均位置有多散；先算距离，再平方、再平均。', ai: '看训练是否波动、数据是否稳定、初始化是否合适。', mistake: '方差大不等于平均值大；它说的是分散程度。', example: '4,4,4 的方差为 0；2,4,6 的方差更大。' },
      { id: 'probability', title: '概率', symbol: 'P(A)', plain: '在明确条件下，一件事发生可能性的数值，范围是 0 到 1。', ai: '分类概率、下一个 token 的概率、风险估计。', mistake: '模型输出 0.9 不保证十次一定中九次，还要检查是否校准。', example: 'P(正面)=0.5，表示长期约一半是正面。' },
      { id: 'conditional-probability', title: '条件概率', symbol: 'P(A | B)', plain: '已经知道 B 发生后，再看 A 有多可能；竖线读作“在……条件下”。', ai: '语言模型计算“已有上文时，下一个 token 的概率”。', mistake: 'P(A|B) 通常不等于 P(B|A)，方向不能交换。', example: 'P(下雨|有乌云) 与 P(有乌云|下雨) 是两问。' },
    ],
  },
  {
    id: 'shapes', step: '03', title: '看懂形状：一排数、几排数，以及它们的配合', intro: '向量和矩阵可以先当作整理数字的容器。',
    concepts: [
      { id: 'vector', title: '向量', symbol: 'x = [2, −1, 3]', plain: '一排有顺序的数，可以表示一个对象的多个特征，也可以表示方向。', ai: '词向量、图片特征、用户表示、梯度都是向量。', mistake: '向量不只是“一串数”；顺序和每一维代表什么都重要。', example: '[身高, 年龄] = [170, 25]。' },
      { id: 'matrix', title: '矩阵', symbol: 'A = [[1,2],[3,4]]', plain: '按行和列排成的数字表，也可看作批量变换向量的机器。', ai: '神经网络权重、注意力分数、批量数据常以矩阵出现。', mistake: '矩阵乘法不是对应位置直接相乘，形状必须先对得上。', example: '2×3 矩阵有 2 行、3 列。' },
      { id: 'dot-product', title: '点积', symbol: 'a · b = Σaᵢbᵢ', plain: '两排数对应相乘再相加，得到一个数；可粗略表示“有多同向”。', ai: '注意力 Q·K、向量相似度、线性层打分。', mistake: '点积大可能只是向量更长；比较方向时常需先归一化。', example: '[1,2]·[3,4] = 1×3+2×4 = 11。' },
    ],
  },
  {
    id: 'learning', step: '04', title: '理解学习：看哪里错，再把旋钮拧一点', intro: '训练模型，本质上是反复衡量错误并调整大量参数。',
    concepts: [
      { id: 'derivative', title: '导数', symbol: 'dy / dx', plain: '只把一个输入轻轻动一点，看输出会往哪边、以多快速度变化。', ai: '反向传播用导数追踪每一步对 Loss 的影响。', mistake: '导数描述当前位置附近的趋势，不保证远处也一样。', example: 'y=x²，在 x=2 时，x 增 0.01，y 约增 0.04。' },
      { id: 'gradient', title: '梯度', symbol: '∇L', plain: '变量很多时，把每个方向的导数收成一支“最陡上坡箭头”。', ai: '训练时通常朝梯度反方向更新参数，让 Loss 下降。', mistake: '梯度不是参数本身，也不保证一步就到全局最好。', example: '∇L=[2,−1]：在当前位置附近，第二个变量沿正方向移动时 L 会下降；第一个则会上升。' },
      { id: 'parameters', title: '参数 / 权重', symbol: 'θ, W, b', plain: '模型内部可调的旋钮；权重是最常见的一类参数。', ai: '训练就是不断调整这些数，让输入更容易得到目标输出。', mistake: '参数多不自动等于更聪明，还取决于数据、结构与训练。', example: 'y=Wx+b 中，W 和 b 都是参数。' },
      { id: 'loss', title: 'Loss（损失）', symbol: 'L(预测, 答案)', plain: '把“模型错得有多离谱”压成一个可优化的数字。', ai: '每轮训练先算 Loss，再用梯度决定参数怎么改。', mistake: '训练 Loss 更低不一定业务更好，可能过拟合或目标写错。', example: '答案是 1，预测 0.8；可用 (1−0.8)²=0.04。' },
    ],
  },
  {
    id: 'uncertainty', step: '05', title: '面对不确定：别只盯一个最高分', intro: '分布讲“可能性怎么铺开”，熵与 KL 再从不同角度读它。',
    concepts: [
      { id: 'distribution', title: '分布', symbol: 'P(x)', plain: '把可能结果和各自的概率放在一起看，是一张“可能性地图”。', ai: '下一个 token 的候选概率、数据分布、模型输出分布。', mistake: '分布不是只有平均值；两个分布平均相同，形状也可完全不同。', example: '猫 0.7、狗 0.2、鸟 0.1，合计为 1。' },
      { id: 'entropy', title: '熵', symbol: 'H(P)=−Σp log p', plain: '衡量一份概率分布有多犹豫：越平均，通常越不确定。', ai: '观察输出确定性、采样多样性和路由是否坍缩。', mistake: '熵高不一定坏、熵低不一定对；自信也可能自信地错。', example: '[0.5,0.5] 比 [0.99,0.01] 熵更高。' },
      { id: 'kl', title: 'KL 散度', symbol: 'KL(P ‖ Q)', plain: '用 P 的视角，衡量拿 Q 来近似 P 会付出多少信息代价。', ai: '知识蒸馏、分布对齐、RLHF 约束和漂移监测。', mistake: 'KL 有方向且不是普通距离：KL(P‖Q) 通常不等于 KL(Q‖P)。', example: '老师分布 P 与学生分布 Q 越接近，KL 通常越小。' },
    ],
  },
]

const quizzes = [
  { id: 'q1', prompt: 'Σᵢ₌₁³ i 最接近哪句人话？', options: ['把 1、2、3 加起来', '把 3 乘自己 1 次', '只取第 3 个数'], correct: 0, explanation: 'Σ 是“按指定范围求和”的缩写，这里就是 1+2+3。', concept: 'sigma' },
  { id: 'q2', prompt: 'P(答案正确 | 已知检索命中) 中的 “|” 表示什么？', options: ['除以', '在右侧事情已知的条件下', '两个事件一样'], correct: 1, explanation: '竖线读作“在……条件下”，右边是已经知道的信息。', concept: 'conditional-probability' },
  { id: 'q3', prompt: 'E[骰子点数] = 3.5 应该怎么理解？', options: ['能掷出 3.5 点', '下一次一定大于 3', '重复很多次后的长期平均约为 3.5'], correct: 2, explanation: '期望是长期平均位置，不要求它是某一次可出现的结果。', concept: 'expectation' },
  { id: 'q4', prompt: 'a · b 在注意力公式里通常在做什么？', options: ['把两排数对应相乘再求和', '把 a 写在 b 上面', '计算两个数的平均值'], correct: 0, explanation: '点积把两个向量压成一个分数，可用于粗略衡量匹配程度。', concept: 'dot-product' },
  { id: 'q5', prompt: '训练里看到 θ ← θ − η∇L，最朴素的意思是？', options: ['把所有参数清零', '沿 Loss 上升最快方向走', '把参数朝 Loss 下降的方向挪一点'], correct: 2, explanation: '梯度指向最陡上坡，前面的减号表示朝反方向更新。', concept: 'gradient' },
  { id: 'q6', prompt: 'H(P) 很高，最安全的人话翻译是？', options: ['模型一定正确', '概率铺得较开、比较犹豫', '模型参数一定很多'], correct: 1, explanation: '高熵通常表示分布更平、更不确定，但不直接判断对错。', concept: 'entropy' },
  { id: 'q7', prompt: 'KL(P‖Q) 与 KL(Q‖P) 的关系通常是？', options: ['完全相等', '方向不同，结果可能不同', '两者都只能是 1'], correct: 1, explanation: 'KL 是有方向的分布差异，交换 P、Q 会改变关注和惩罚。', concept: 'kl' },
  { id: 'q8', prompt: 'Loss 从 0.8 降到 0.4，能直接推出什么？', options: ['训练目标上的错误变小了，但仍需看业务指标', '产品一定成功', '模型绝不会过拟合'], correct: 0, explanation: 'Loss 只衡量被写进目标函数的误差，不能独自代表真实效果。', concept: 'loss' },
  { id: 'q9', prompt: '向量 [1, 2, 3] 最朴素可以看成什么？', options: ['一个只能表示方向的箭头', '一排有顺序的数', '三个互不相关的公式'], correct: 1, explanation: '先把向量理解成有顺序的一排数，就足够继续读大多数 AI 入门公式。', concept: 'vector' },
  { id: 'q10', prompt: 'log₂8 = 3 在问什么？', options: ['2 加几次得到 8', '2 乘自己几次得到 8', '8 除以 3 是否等于 2'], correct: 1, explanation: '对数是指数的反问：2 的 3 次方等于 8。', concept: 'logarithm' },
]

const conceptTitle = new Map(conceptGroups.flatMap((group) => group.concepts.map((concept) => [concept.id, concept.title])))

export default function MathPrimer() {
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const answeredCount = Object.keys(answers).length
  const correctCount = quizzes.filter((quiz) => answers[quiz.id] === quiz.correct).length

  const reviewConcept = (event: MouseEvent<HTMLAnchorElement>, conceptId: string) => {
    event.preventDefault()
    const target = document.getElementById(`concept-${conceptId}`)
    if (!target) return

    window.history.replaceState(null, '', `#${target.id}`)
    target.focus({ preventScroll: true })
    target.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  return (
    <section className='math-primer-page'>
      <header className='math-primer-hero'>
        <div className='math-primer-hero-copy'>
          <span><Sparkles aria-hidden='true' />人工智能（Artificial Intelligence，AI）· 数学入门（Math Primer）</span>
          <h1>不是数学课，<br />是把 <em>AI 公式</em>翻译成人话。</h1>
          <p>不证明、不考试、不默认你记得中学数学。先认识公式里的常客，再带着直觉继续学 AI。</p>
          <div><a href='#primer-start'>从数轴开始<ArrowDown aria-hidden='true' /></a><a className='is-secondary' href='#primer-quiz'>直接试试翻译<ArrowRight aria-hidden='true' /></a></div>
        </div>
        <aside aria-label='阅读方式'>
          <BrainCircuit aria-hidden='true' />
          <span>每张卡只回答 4 件事</span>
          <ol><li>它在说什么</li><li>AI 里在哪见</li><li>最容易误会什么</li><li>一个极短例子</li></ol>
          <small>可以跳读。看懂六七成，就足够继续。</small>
        </aside>
      </header>

      <section className='math-primer-terms' aria-labelledby='math-primer-terms-title'>
        <header>
          <div><span>术语速查</span><h2 id='math-primer-terms-title'>看到英文别慌</h2></div>
          <p>缩写只是长名字的简称。先抓住中文和一句人话，后面再看到缩写就知道它在做什么。</p>
        </header>
        <div>
          {quickTerms.map((item) => <article key={item.term}><strong>{item.term}</strong><span>{item.plain}</span></article>)}
        </div>
      </section>

      <nav className='math-primer-jump' aria-label='概念分组快捷入口'>
        {conceptGroups.map((group) => <a key={group.id} href={`#group-${group.id}`}><span>{group.step}</span>{group.title.split('：')[0]}</a>)}
      </nav>

      <div className='math-primer-groups' id='primer-start'>
        {conceptGroups.map((group) => (
          <section className='math-primer-group' id={`group-${group.id}`} key={group.id} aria-labelledby={`title-${group.id}`}>
            <header><span>{group.step}</span><div><h2 id={`title-${group.id}`}>{group.title}</h2><p>{group.intro}</p></div></header>
            <div className='math-primer-grid'>
              {group.concepts.map((concept) => (
                <article
                  className='math-concept-card'
                  id={`concept-${concept.id}`}
                  key={concept.id}
                  tabIndex={-1}
                  aria-labelledby={`concept-title-${concept.id}`}
                  aria-describedby={`concept-plain-${concept.id}`}
                >
                  <header><h3 id={`concept-title-${concept.id}`}>{concept.title}</h3><code>{concept.symbol}</code></header>
                  <dl>
                    <div className='is-plain'><dt>人话解释</dt><dd id={`concept-plain-${concept.id}`}>{concept.plain}</dd></div>
                    <div><dt>AI 里在哪见</dt><dd>{concept.ai}</dd></div>
                    <div className='is-warning'><dt>常见误解</dt><dd>{concept.mistake}</dd></div>
                  </dl>
                  <p><span>极短例子</span>{concept.example}</p>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className='math-primer-quiz' id='primer-quiz' aria-labelledby='primer-quiz-title'>
        <header>
          <div><span><CircleHelp aria-hidden='true' />轻交互 · 不计成绩</span><h2 id='primer-quiz-title'>把符号翻译成人话</h2><p>选完立刻看解析。答错不是退步，只是发现该回看哪张卡。</p></div>
          <aside aria-live='polite'><strong>{answeredCount}<small>/ {quizzes.length}</small></strong><span>已作答{answeredCount > 0 ? ` · 答对 ${correctCount}` : ''}</span>{answeredCount > 0 && <button type='button' aria-label='重新开始数学符号小测' onClick={() => setAnswers({})}><RotateCcw aria-hidden='true' />重新来</button>}</aside>
        </header>
        <div className='math-quiz-list'>
          {quizzes.map((quiz, index) => {
            const selected = answers[quiz.id]
            const answered = selected !== undefined
            const isCorrect = selected === quiz.correct
            return (
              <article className='math-quiz-card' key={quiz.id}>
                <fieldset>
                  <legend><span>{String(index + 1).padStart(2, '0')}</span><strong>{quiz.prompt}</strong></legend>
                  <div className='math-quiz-options'>
                    {quiz.options.map((option, optionIndex) => {
                      const optionCorrect = optionIndex === quiz.correct
                      const selectedWrong = answered && selected === optionIndex && !optionCorrect
                      return (
                        <label key={option} className={`${selected === optionIndex ? 'is-selected' : ''} ${answered && optionCorrect ? 'is-correct' : ''} ${selectedWrong ? 'is-wrong' : ''}`}>
                          <input
                            type='radio'
                            name={`answer-${quiz.id}`}
                            value={optionIndex}
                            checked={selected === optionIndex}
                            onChange={() => setAnswers((current) => ({ ...current, [quiz.id]: optionIndex }))}
                          />
                          <i aria-hidden='true'>{String.fromCharCode(65 + optionIndex)}</i>
                          <span>{answered && optionCorrect ? <span className='math-primer-visually-hidden'>正确答案：</span> : null}{option}</span>
                          {answered && optionCorrect ? <Check aria-hidden='true' /> : null}
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
                {answered ? <div className={`math-quiz-explanation ${isCorrect ? 'is-correct' : 'is-wrong'}`} role='status'><b>{isCorrect ? '翻译对了' : '没关系，看这句'}</b><p>{quiz.explanation}</p><a href={`#concept-${quiz.concept}`} aria-label={`回看概念：${conceptTitle.get(quiz.concept)}`} onClick={(event) => reviewConcept(event, quiz.concept)}>回看「{conceptTitle.get(quiz.concept)}」<ArrowRight aria-hidden='true' /></a></div> : null}
              </article>
            )
          })}
        </div>
      </section>
    </section>
  )
}
