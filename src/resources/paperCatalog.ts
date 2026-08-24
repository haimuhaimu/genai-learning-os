import { caseIds, routeIds, type CaseId } from '../components/strategy/caseCatalog.ts'
import type { RouteId } from '../components/strategy/types.ts'

export type PaperArea = '推荐系统' | 'Transformer / LLM' | '扩散 / 多模态' | 'Agent / Harness' | '自我改进 / 世界模型'
export type PaperLevel = '入门' | '进阶'
export type PaperKind = '奠基论文' | '方法论文' | '系统论文' | '评估基准'

export type PaperResource = {
  id: string
  title: string
  authors: string
  year: number
  area: PaperArea
  level: PaperLevel
  kind: PaperKind
  url: string
  relatedCaseIds: CaseId[]
  relatedRouteIds: RouteId[]
  oneLine: string
  problem: string
  mechanism: string
  productLens: string
  readQuestion: string
  readingMinutes: number
}

type PaperReferences = { caseIds: readonly string[]; routeIds: readonly string[] }
const areas: readonly PaperArea[] = ['推荐系统', 'Transformer / LLM', '扩散 / 多模态', 'Agent / Harness', '自我改进 / 世界模型']
const levels: readonly PaperLevel[] = ['入门', '进阶']
const kinds: readonly PaperKind[] = ['奠基论文', '方法论文', '系统论文', '评估基准']

export function validatePaperCatalog(
  papers: readonly PaperResource[],
  references: PaperReferences = { caseIds, routeIds },
) {
  const errors: string[] = []
  const ids = new Set<string>()
  const urls = new Set<string>()
  const validCases = new Set(references.caseIds)
  const validRoutes = new Set(references.routeIds)
  const textFields: Array<keyof Pick<PaperResource, 'id' | 'title' | 'authors' | 'url' | 'oneLine' | 'problem' | 'mechanism' | 'productLens' | 'readQuestion'>> = [
    'id', 'title', 'authors', 'url', 'oneLine', 'problem', 'mechanism', 'productLens', 'readQuestion',
  ]

  papers.forEach((paper, index) => {
    const label = paper.id || `第 ${index + 1} 篇论文`
    textFields.forEach((field) => {
      if (typeof paper[field] !== 'string' || !paper[field].trim()) errors.push(`${label} 的 ${field} 不能为空`)
    })
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(paper.id)) errors.push(`${label} 的 id 必须为 kebab-case`)
    if (ids.has(paper.id)) errors.push(`重复 id：${paper.id}`)
    ids.add(paper.id)
    if (urls.has(paper.url)) errors.push(`重复 URL：${paper.url}`)
    urls.add(paper.url)

    let parsedUrl: URL | undefined
    try { parsedUrl = new URL(paper.url) } catch { errors.push(`${label} 的 URL 无效`) }
    if (parsedUrl?.protocol !== 'https:') errors.push(`${label} 的 URL 必须使用 HTTPS`)
    const hostname = parsedUrl?.hostname.toLowerCase()
    if (hostname && hostname !== 'arxiv.org' && !hostname.endsWith('.arxiv.org')) errors.push(`${label} 的 URL 必须使用 arxiv.org 域名`)

    if (!Number.isInteger(paper.year) || paper.year < 2010 || paper.year > 2030) errors.push(`${label} 的 year 必须是 2010–2030 的整数`)
    if (!Number.isInteger(paper.readingMinutes) || paper.readingMinutes < 10 || paper.readingMinutes > 180) errors.push(`${label} 的 readingMinutes 必须是 10–180 的整数`)
    if (!areas.includes(paper.area)) errors.push(`${label} 的 area 无效`)
    if (!levels.includes(paper.level)) errors.push(`${label} 的 level 无效`)
    if (!kinds.includes(paper.kind)) errors.push(`${label} 的 kind 无效`)
    if (!paper.relatedCaseIds.length && !paper.relatedRouteIds.length) errors.push(`${label} 至少关联一个 case 或 route`)
    paper.relatedCaseIds.forEach((caseId) => { if (!validCases.has(caseId)) errors.push(`${label} 引用了不存在的 case：${caseId}`) })
    paper.relatedRouteIds.forEach((routeId) => { if (!validRoutes.has(routeId)) errors.push(`${label} 引用了不存在的 route：${routeId}`) })
  })

  if (errors.length) throw new Error(`论文 Catalog 校验失败：\n- ${errors.join('\n- ')}`)
  return papers
}

export const paperResources = validatePaperCatalog([
  {
    id: 'wide-and-deep', title: 'Wide & Deep Learning for Recommender Systems', authors: 'Heng-Tze Cheng et al.', year: 2016,
    area: '推荐系统', level: '入门', kind: '奠基论文', url: 'https://arxiv.org/pdf/1606.07792v1', readingMinutes: 35,
    relatedCaseIds: ['foundation-feedback-loop'], relatedRouteIds: ['foundation'],
    oneLine: '把 wide 的记忆能力和 deep 的泛化能力放进同一个推荐模型。',
    problem: '稀疏特征组合需要被记住，但系统也要泛化到从未出现的新组合。',
    mechanism: 'Wide 部分用交叉特征记忆高频规则，Deep 部分用 embedding 学习低维表示；联合训练让两种信号共同服务排序目标。',
    productLens: '冷启动、长尾覆盖与热门内容记忆并非同一目标，上线时要分切片看收益。',
    readQuestion: '如果目标是改善冷启动，我会增加哪类 deep 信号，又如何防止热门记忆退化？',
  },
  {
    id: 'deepfm', title: 'DeepFM: A Factorization-Machine based Neural Network for CTR Prediction', authors: 'Huifeng Guo et al.', year: 2017,
    area: '推荐系统', level: '进阶', kind: '方法论文', url: 'https://arxiv.org/abs/1703.04247v1', readingMinutes: 40,
    relatedCaseIds: ['foundation-feedback-loop'], relatedRouteIds: ['foundation'],
    oneLine: '用共享输入同时学习低阶与高阶特征交互，减少手工组合。',
    problem: 'CTR 预估既需要稳定的低阶交互，也需要难以手工穷举的高阶组合。',
    mechanism: 'FM 分支建模一阶和二阶交互，深度分支学习高阶表示，两者共享 embedding 并端到端联合优化。',
    productLens: '结构更复杂不自动等于业务更好，应对照特征新鲜度、延迟和分群校准。',
    readQuestion: '什么业务信号能证明高阶交互值得增加在线复杂度？',
  },
  {
    id: 'attention-is-all-you-need', title: 'Attention Is All You Need', authors: 'Ashish Vaswani et al.', year: 2017,
    area: 'Transformer / LLM', level: '入门', kind: '奠基论文', url: 'https://arxiv.org/abs/1706.03762', readingMinutes: 55,
    relatedCaseIds: ['rag-budget'], relatedRouteIds: ['foundation', 'llm'],
    oneLine: '用注意力完成序列信息路由，不再依赖循环或卷积。',
    problem: '循环网络难并行、长距离信息路径长，限制训练效率与依赖建模。',
    mechanism: '多头自注意力让 token 直接聚合相关上下文，位置编码补入顺序，FFN 负责逐 token 变换。',
    productLens: '上下文窗口只是容量边界，真正可用性还取决于注意力是否找到证据。',
    readQuestion: 'Self-Attention、FFN 与位置编码分别解决什么约束？',
  },
  {
    id: 'instructgpt', title: 'Training language models to follow instructions with human feedback', authors: 'Long Ouyang et al.', year: 2022,
    area: 'Transformer / LLM', level: '进阶', kind: '方法论文', url: 'https://arxiv.org/abs/2203.02155', readingMinutes: 65,
    relatedCaseIds: ['rag-budget'], relatedRouteIds: ['llm'],
    oneLine: '把人类偏好变成训练信号，让语言模型更贴近用户意图。',
    problem: '更低的预训练损失并不保证回答有用、诚实或遵循指令。',
    mechanism: '先做监督微调，再用排序偏好训练奖励模型，最后以强化学习优化策略，同时约束偏离基础模型。',
    productLens: '偏好标签会携带标注人群与任务分布偏差，必须与真实业务指标交叉验证。',
    readQuestion: '我的偏好数据在哪些切片上可能系统性代表错用户？',
  },
  {
    id: 'flashattention', title: 'FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness', authors: 'Tri Dao et al.', year: 2022,
    area: 'Transformer / LLM', level: '进阶', kind: '系统论文', url: 'https://arxiv.org/abs/2205.14135', readingMinutes: 50,
    relatedCaseIds: ['rag-budget'], relatedRouteIds: ['llm'],
    oneLine: '通过 IO-aware tiling 减少显存读写，在不近似注意力的前提下提速。',
    problem: '注意力不只受 FLOPs 限制，大量 HBM 与片上 SRAM 往返同样会拖慢训练。',
    mechanism: '把计算分块放入更快的片上存储，在线维护归一化统计，避免完整注意力矩阵反复写回显存。',
    productLens: '模型架构不变也能改变成本曲线；评估应同时看序列长度、显存峰值和吞吐。',
    readQuestion: '序列变长时，瓶颈是计算还是内存访问？我会怎样压测？',
  },
  {
    id: 'speculative-decoding', title: 'Fast Inference from Transformers via Speculative Decoding', authors: 'Yaniv Leviathan et al.', year: 2022,
    area: 'Transformer / LLM', level: '进阶', kind: '系统论文', url: 'https://arxiv.org/abs/2211.17192', readingMinutes: 45,
    relatedCaseIds: ['rag-budget'], relatedRouteIds: ['llm'],
    oneLine: '让小模型先起草多个 token，再由大模型并行验证以降低串行等待。',
    problem: '自回归生成一次只确认一个 token，难以充分利用并行硬件。',
    mechanism: '草稿模型提出候选序列，目标模型一次验证多个位置，并用接受规则保持原输出分布。',
    productLens: '收益取决于草稿命中率、验证批量与模型成本差，不能只看单次延迟。',
    readQuestion: '草稿命中率降到什么程度时，加速收益会被验证成本吃掉？',
  },
  {
    id: 'pagedattention-vllm', title: 'Efficient Memory Management for Large Language Model Serving with PagedAttention', authors: 'Woosuk Kwon et al.', year: 2023,
    area: 'Transformer / LLM', level: '进阶', kind: '系统论文', url: 'https://arxiv.org/abs/2309.06180', readingMinutes: 55,
    relatedCaseIds: ['rag-budget'], relatedRouteIds: ['llm'],
    oneLine: '借鉴操作系统分页管理 KV cache，减少碎片并提高并发吞吐。',
    problem: '请求长度动态变化导致 KV cache 预留、碎片与复制浪费，限制服务批量。',
    mechanism: 'PagedAttention 把连续逻辑序列映射到非连续物理块，并支持块级共享与按需分配。',
    productLens: '框架选择应基于请求长度分布、并发、SLO 与显存，而不是只比较峰值吞吐。',
    readQuestion: '我要记录哪些 workload 分布，才能判断 PagedAttention 是否值得？',
  },
  {
    id: 'ddpm', title: 'Denoising Diffusion Probabilistic Models', authors: 'Jonathan Ho et al.', year: 2020,
    area: '扩散 / 多模态', level: '入门', kind: '奠基论文', url: 'https://arxiv.org/abs/2006.11239', readingMinutes: 60,
    relatedCaseIds: ['image-unit-cost'], relatedRouteIds: ['image'],
    oneLine: '学习逐步逆转加噪过程，从随机噪声生成高质量图像。',
    problem: '生成模型需要同时兼顾稳定训练、样本质量与可计算的学习目标。',
    mechanism: '前向过程逐步加高斯噪声，网络学习每个时刻的去噪方向，采样时按时间反向迭代。',
    productLens: '更多采样步可能改善质量，却直接增加延迟与单张可用图成本。',
    readQuestion: '我如何把去噪误差、采样步数和最终可用率放在同一张评估表？',
  },
  {
    id: 'improved-ddpm', title: 'Improved Denoising Diffusion Probabilistic Models', authors: 'Alex Nichol, Prafulla Dhariwal', year: 2021,
    area: '扩散 / 多模态', level: '进阶', kind: '方法论文', url: 'https://arxiv.org/abs/2102.09672', readingMinutes: 45,
    relatedCaseIds: ['image-unit-cost'], relatedRouteIds: ['image'],
    oneLine: '用少量训练与方差设计改进，让样本质量和似然不必二选一。',
    problem: '原始扩散模型的对数似然和采样效率仍有改进空间。',
    mechanism: '学习反向过程方差、使用混合目标并分析噪声调度，使更少采样步也能保持质量。',
    productLens: '观感、覆盖与似然可能给出不同排序，产品必须预先定义主指标。',
    readQuestion: '质量指标冲突时，哪个指标最接近我的用户任务？',
  },
  {
    id: 'latent-diffusion', title: 'High-Resolution Image Synthesis with Latent Diffusion Models', authors: 'Robin Rombach et al.', year: 2021,
    area: '扩散 / 多模态', level: '进阶', kind: '方法论文', url: 'https://arxiv.org/abs/2112.10752', readingMinutes: 65,
    relatedCaseIds: ['image-unit-cost'], relatedRouteIds: ['image'],
    oneLine: '把扩散搬到压缩潜空间，在生成质量和计算成本之间取得实用平衡。',
    problem: '直接在像素空间做扩散，分辨率越高计算与内存成本越大。',
    mechanism: '先用自编码器压缩图像，再在潜变量上去噪，并通过交叉注意力接入文本等条件。',
    productLens: '压缩降低成本也可能损失细节；要按文字、纹理、结构等失败类型评估。',
    readQuestion: '潜空间压缩最可能伤害哪类业务素材，我怎样设计切片测试？',
  },
  {
    id: 'controlnet', title: 'Adding Conditional Control to Text-to-Image Diffusion Models', authors: 'Lvmin Zhang et al.', year: 2023,
    area: '扩散 / 多模态', level: '进阶', kind: '方法论文', url: 'https://arxiv.org/abs/2302.05543', readingMinutes: 50,
    relatedCaseIds: ['image-unit-cost'], relatedRouteIds: ['image'],
    oneLine: '为预训练文生图模型增加边缘、姿态、深度等空间条件控制。',
    problem: '文本难以精确表达构图和姿态，生成结果常不满足结构约束。',
    mechanism: '复制并锁定预训练骨干，通过零卷积连接可训练分支，让条件控制逐步注入且不破坏原能力。',
    productLens: '控制成功和审美质量是两个指标，应分别标注与设定重试策略。',
    readQuestion: '用户给出草图时，我会怎样量化结构遵循而不是只看好不好看？',
  },
  {
    id: 'clip', title: 'Learning Transferable Visual Models From Natural Language Supervision', authors: 'Alec Radford et al.', year: 2021,
    area: '扩散 / 多模态', level: '入门', kind: '奠基论文', url: 'https://arxiv.org/abs/2103.00020', readingMinutes: 55,
    relatedCaseIds: ['image-unit-cost'], relatedRouteIds: ['image'],
    oneLine: '用大规模图文对比学习把视觉与语言映射到共享语义空间。',
    problem: '传统视觉分类依赖固定标签，迁移到新任务时需要重新收集数据和训练。',
    mechanism: '图像编码器和文本编码器在批内做对比学习，让匹配图文靠近、不匹配样本远离。',
    productLens: '共享空间非常适合检索与打分，但会继承训练图文中的偏差与语义盲区。',
    readQuestion: '我会用哪些困难负例发现图文检索的偏差？',
  },
  {
    id: 'blip-2', title: 'BLIP-2: Bootstrapping Language-Image Pre-training with Frozen Image Encoders and Large Language Models', authors: 'Junnan Li et al.', year: 2023,
    area: '扩散 / 多模态', level: '进阶', kind: '方法论文', url: 'https://arxiv.org/abs/2301.12597', readingMinutes: 55,
    relatedCaseIds: ['image-unit-cost'], relatedRouteIds: ['image', 'llm'],
    oneLine: '用轻量桥接模块连接冻结视觉编码器与冻结 LLM，降低多模态训练成本。',
    problem: '端到端训练大型视觉语言模型成本高，也容易遗忘已有单模态能力。',
    mechanism: 'Q-Former 先从冻结视觉特征抽取与文本相关的信息，再把表示投影给冻结语言模型。',
    productLens: '冻结组件降低训练成本，却把能力上限压在桥接模块和两端表征兼容性上。',
    readQuestion: '出现视觉幻觉时，我如何判断瓶颈在视觉端、桥接层还是语言端？',
  },
  {
    id: 'react', title: 'ReAct: Synergizing Reasoning and Acting in Language Models', authors: 'Shunyu Yao et al.', year: 2022,
    area: 'Agent / Harness', level: '入门', kind: '奠基论文', url: 'https://arxiv.org/abs/2210.03629', readingMinutes: 50,
    relatedCaseIds: ['refund-gate'], relatedRouteIds: ['agent'],
    oneLine: '让语言模型交替生成推理轨迹和环境动作，以观察结果修正下一步。',
    problem: '只推理缺少外部事实，只行动又缺少可解释的任务分解与纠错。',
    mechanism: 'Thought、Action、Observation 循环把语言推理与工具反馈交织，直到形成最终答案。',
    productLens: '可靠性来自工具契约、可观察轨迹与停止条件，不来自更长的思考文本。',
    readQuestion: '一次失败是工具选错、参数错误、顺序错误，还是观察未被利用？',
  },
  {
    id: 'toolformer', title: 'Toolformer: Language Models Can Teach Themselves to Use Tools', authors: 'Timo Schick et al.', year: 2023,
    area: 'Agent / Harness', level: '进阶', kind: '方法论文', url: 'https://arxiv.org/abs/2302.04761', readingMinutes: 55,
    relatedCaseIds: ['refund-gate'], relatedRouteIds: ['agent'],
    oneLine: '让模型从少量示例自举出工具调用数据，并学习何时、如何调用。',
    problem: '工具调用训练数据昂贵，规则式调用也难覆盖开放任务。',
    mechanism: '模型提出 API 调用候选，仅保留能降低后续语言建模损失的调用，再用增强语料微调。',
    productLens: '能调用不等于可授权；副作用工具仍需要权限、幂等、确认与审计边界。',
    readQuestion: '哪些工具适合让模型学习，哪些必须由确定性规则约束？',
  },
  {
    id: 'agentbench', title: 'AgentBench: Evaluating LLMs as Agents', authors: 'Xiao Liu et al.', year: 2023,
    area: 'Agent / Harness', level: '进阶', kind: '评估基准', url: 'https://arxiv.org/abs/2308.03688', readingMinutes: 50,
    relatedCaseIds: ['harness-launch-workbench'], relatedRouteIds: ['agent', 'agent-book'],
    oneLine: '用八类环境多维评估 LLM 作为 Agent 的推理与决策能力。',
    problem: '单一聊天任务无法暴露 Agent 在交互、工具和长期决策中的不同失败。',
    mechanism: '统一接入操作系统、数据库、游戏等环境，以任务成功和交互轨迹比较不同模型。',
    productLens: '公共榜单不能替代业务基准，环境、工具与风险分布必须贴近真实工作流。',
    readQuestion: '我的业务基准需要哪些环境维度，才能覆盖上线风险？',
  },
  {
    id: 'traject-bench', title: 'TRAJECT-Bench: A Trajectory-Aware Benchmark for Evaluating Agentic Tool Use', authors: 'He et al.', year: 2025,
    area: 'Agent / Harness', level: '进阶', kind: '评估基准', url: 'https://arxiv.org/html/2510.04550v1', readingMinutes: 45,
    relatedCaseIds: ['harness-launch-workbench'], relatedRouteIds: ['agent', 'agent-book'],
    oneLine: '越过最终答案，逐步诊断工具选择、参数和依赖顺序。',
    problem: '只看最终正确率会掩盖侥幸成功，也无法定位 Agent 工具轨迹中的具体错误。',
    mechanism: '为轨迹定义细粒度断言，分别衡量工具选择、参数正确性及依赖与顺序满足度。',
    productLens: '轨迹断言可直接成为回归测试，帮助把 Harness 可靠性从观感变成门禁。',
    readQuestion: '我能否为一条真实流程写出工具、参数和顺序三类断言？',
  },
  {
    id: 'reflexion', title: 'Reflexion: Language Agents with Verbal Reinforcement Learning', authors: 'Noah Shinn et al.', year: 2023,
    area: '自我改进 / 世界模型', level: '入门', kind: '方法论文', url: 'https://arxiv.org/abs/2303.11366', readingMinutes: 50,
    relatedCaseIds: ['evaluator-trust'], relatedRouteIds: ['self-evolving', 'agent'],
    oneLine: '不更新权重，而是把失败反思写入记忆来改善后续尝试。',
    problem: '在线更新模型昂贵且风险高，但 Agent 仍需要从任务反馈中吸取经验。',
    mechanism: '根据环境反馈生成语言反思，存入 episodic memory，并在下一次决策时作为上下文使用。',
    productLens: '反思只有在反馈可信、可检索且不会累积错误时才会形成正向闭环。',
    readQuestion: '我如何证明一条反思减少了特定失败，而不是让提示词更长？',
  },
  {
    id: 'self-refine', title: 'Self-Refine: Iterative Refinement with Self-Feedback', authors: 'Aman Madaan et al.', year: 2023,
    area: '自我改进 / 世界模型', level: '入门', kind: '方法论文', url: 'https://arxiv.org/abs/2303.17651', readingMinutes: 45,
    relatedCaseIds: ['evaluator-trust'], relatedRouteIds: ['self-evolving'],
    oneLine: '让同一个 LLM 循环执行生成、反馈与精炼，不依赖额外训练。',
    problem: '初次生成常有可修复缺陷，但监督数据和模型更新并非随时可得。',
    mechanism: '模型先产出初稿，再以任务相关反馈批评，随后基于反馈迭代，直到达到停止条件。',
    productLens: '迭代会增加成本，也可能放大自评盲点；必须配置外部验收与最大轮数。',
    readQuestion: '什么失败信号触发继续精炼，什么门槛要求立即停止？',
  },
  {
    id: 'voyager', title: 'Voyager: An Open-Ended Embodied Agent with Large Language Models', authors: 'Guanzhi Wang et al.', year: 2023,
    area: '自我改进 / 世界模型', level: '进阶', kind: '方法论文', url: 'https://arxiv.org/abs/2305.16291', readingMinutes: 65,
    relatedCaseIds: ['new-information'], relatedRouteIds: ['agent-book', 'self-evolving'],
    oneLine: '通过自动课程、可增长技能库与反馈迭代实现开放世界终身学习。',
    problem: '具身 Agent 需要持续探索、积累技能并把失败转成下一次可用的经验。',
    mechanism: '自动课程选择下一目标，代码技能库存储可复用行为，迭代提示利用执行错误与自验证修正程序。',
    productLens: '业务技能库需要明确粒度、检索、权限、版本和淘汰机制，否则经验会变成技术债。',
    readQuestion: '一个可复用技能的最小契约应包含哪些输入、输出和验证？',
  },
  {
    id: 'dreamerv3', title: 'Mastering Diverse Domains through World Models', authors: 'Danijar Hafner et al.', year: 2023,
    area: '自我改进 / 世界模型', level: '进阶', kind: '方法论文', url: 'https://ar5iv.labs.arxiv.org/html/2301.04104', readingMinutes: 70,
    relatedCaseIds: ['simulator-vs-reality'], relatedRouteIds: ['world-model'],
    oneLine: '用统一的世界模型算法和固定超参数跨多类环境学习策略。',
    problem: '强化学习算法常依赖领域调参，真实交互又昂贵且反馈稀疏。',
    mechanism: '学习环境动态的潜变量模型，在想象轨迹中训练 actor 与 critic，并用归一化等设计稳定跨域训练。',
    productLens: '模拟收益来自样本效率，但前提是模型误差不会在长轨迹中累积到误导决策。',
    readQuestion: '我会用什么真实对照实验测量模拟器偏差与可接受的使用边界？',
  },
] satisfies PaperResource[])
