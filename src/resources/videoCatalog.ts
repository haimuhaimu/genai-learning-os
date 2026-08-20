import { caseIds, routeIds, type CaseId } from '../components/strategy/caseCatalog.ts'
import type { RouteId } from '../components/strategy/types.ts'

export type ContentOrigin = '中文原创' | '中文译制' | '海外原版'
export type VideoSourceType = 'youtube' | 'bilibili' | 'course' | 'paper' | 'blog' | 'report'

export type VideoResource = {
  id: string
  title: string
  org: string
  speaker?: string
  language: 'zh' | 'en'
  sourceType: VideoSourceType
  contentOrigin: ContentOrigin
  durationLabel?: string
  url: string
  originalSourceUrl?: string
  relatedCaseIds: CaseId[]
  relatedRouteIds: RouteId[]
  whyWorthWatching: string
  returnQuestion: string
  level: '入门' | '进阶'
  casePriority?: number
}

type VideoReferences = {
  caseIds: readonly string[]
  routeIds: readonly string[]
}

const allowedHosts = [
  'youtube.com',
  'bilibili.com',
  'karpathy.ai',
  '3blue1brown.com',
  'courses.d2l.ai',
  'deeplearning.ai',
  'learn.deeplearning.ai',
  'corporate.deeplearning.ai',
  'huggingface.co',
  'kaggle.com',
  'arxiv.org',
  'openreview.net',
  'deepmind.google',
  'ai.meta.com',
  'technologyreview.com',
  'hub.baai.ac.cn',
  'nature.com',
  'sakana.ai',
  'lilianweng.github.io',
  'worldmodels.github.io',
  'github.com',
] as const

const sourceTypes: readonly VideoSourceType[] = ['youtube', 'bilibili', 'course', 'paper', 'blog', 'report']
const nonDurationSources: readonly VideoSourceType[] = ['paper', 'blog', 'report']

function isAllowedHost(hostname: string) {
  return allowedHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))
}

function validateTrustedUrl(url: string, label: string, fieldLabel: string, errors: string[]) {
  let parsedUrl: URL | undefined
  try {
    parsedUrl = new URL(url)
  } catch {
    errors.push(`${label} 的 ${fieldLabel} 无效`)
  }
  if (!parsedUrl) return
  if (parsedUrl.protocol !== 'https:') errors.push(`${label} 的 ${fieldLabel} 必须使用 HTTPS`)
  if (!isAllowedHost(parsedUrl.hostname.toLowerCase())) errors.push(`${label} 的 ${fieldLabel} 使用了不允许的域名：${parsedUrl.hostname}`)
}

export function validateVideoCatalog(
  resources: readonly VideoResource[],
  references: VideoReferences = { caseIds, routeIds },
) {
  const errors: string[] = []
  const ids = new Set<string>()
  const urls = new Set<string>()
  const validCases = new Set(references.caseIds)
  const validRoutes = new Set(references.routeIds)
  const requiredTextFields: Array<keyof Pick<VideoResource, 'id' | 'title' | 'org' | 'url' | 'whyWorthWatching' | 'returnQuestion'>> = [
    'id', 'title', 'org', 'url', 'whyWorthWatching', 'returnQuestion',
  ]

  resources.forEach((resource, index) => {
    const label = resource.id || `第 ${index + 1} 条资源`
    requiredTextFields.forEach((field) => {
      if (typeof resource[field] !== 'string' || !resource[field].trim()) errors.push(`${label} 的 ${field} 不能为空`)
    })
    if (!['zh', 'en'].includes(resource.language)) errors.push(`${label} 的 language 无效`)
    if (!sourceTypes.includes(resource.sourceType)) errors.push(`${label} 的 sourceType 无效`)
    if (!['中文原创', '中文译制', '海外原版'].includes(resource.contentOrigin)) errors.push(`${label} 的 contentOrigin 无效`)
    if (!['入门', '进阶'].includes(resource.level)) errors.push(`${label} 的 level 无效`)
    if (resource.durationLabel !== undefined) {
      if (typeof resource.durationLabel !== 'string' || !resource.durationLabel.trim()) errors.push(`${label} 的 durationLabel 不能为空字符串`)
      if (nonDurationSources.includes(resource.sourceType)) errors.push(`${label} 的 sourceType 为 ${resource.sourceType} 时不允许写 durationLabel`)
    }
    if (resource.speaker !== undefined && (typeof resource.speaker !== 'string' || !resource.speaker.trim())) errors.push(`${label} 的 speaker 不能为空字符串`)
    if (resource.originalSourceUrl !== undefined && (typeof resource.originalSourceUrl !== 'string' || !resource.originalSourceUrl.trim())) errors.push(`${label} 的 originalSourceUrl 不能为空字符串`)
    if (resource.casePriority !== undefined && (!Number.isFinite(resource.casePriority) || resource.casePriority < 0)) errors.push(`${label} 的 casePriority 必须是非负有限数值`)
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(resource.id)) errors.push(`${label} 的 id 必须为 kebab-case`)
    if (ids.has(resource.id)) errors.push(`重复 id：${resource.id}`)
    ids.add(resource.id)

    validateTrustedUrl(resource.url, label, 'URL', errors)
    if (urls.has(resource.url)) errors.push(`重复 URL：${resource.url}`)
    urls.add(resource.url)

    if (resource.originalSourceUrl) {
      validateTrustedUrl(resource.originalSourceUrl, label, 'originalSourceUrl', errors)
      if (resource.originalSourceUrl === resource.url) errors.push(`${label} 的 originalSourceUrl 不能与主 URL 相同`)
    }

    if (!resource.relatedCaseIds.length && !resource.relatedRouteIds.length) errors.push(`${label} 至少关联一个 case 或 route`)
    resource.relatedCaseIds.forEach((caseId) => {
      if (!validCases.has(caseId)) errors.push(`${label} 引用了不存在的 case：${caseId}`)
    })
    resource.relatedRouteIds.forEach((routeId) => {
      if (!validRoutes.has(routeId)) errors.push(`${label} 引用了不存在的 route：${routeId}`)
    })
  })

  if (errors.length) throw new Error(`视频 Catalog 校验失败：\n- ${errors.join('\n- ')}`)
  return resources
}

export const videoResources = validateVideoCatalog([
  {
    id: '3blue1brown-cross-entropy',
    title: 'But what is Cross-Entropy? | Compression is Intelligence Part 2',
    org: '3Blue1Brown', language: 'en', sourceType: 'course', contentOrigin: '海外原版',
    url: 'https://www.3blue1brown.com/lessons/cross-entropy/',
    relatedCaseIds: ['foundation-feedback-loop'], relatedRouteIds: ['foundation'], level: '入门', casePriority: 10,
    whyWorthWatching: '从"错误概率模型会多付多少编码代价"理解交叉熵，补上策略案例背后的信息论直觉。',
    returnQuestion: '回到案例再看：高置信错误为什么会被放大？',
  },
  {
    id: 'statquest-cross-entropy',
    title: 'Neural Networks Part 6: Cross Entropy',
    org: 'StatQuest', language: 'en', sourceType: 'youtube', contentOrigin: '海外原版',
    url: 'https://www.youtube.com/watch?v=6ArSys5qHAU',
    relatedCaseIds: ['foundation-feedback-loop'], relatedRouteIds: ['foundation'], level: '入门', casePriority: 40,
    whyWorthWatching: '把分类训练中的交叉熵拆成可视化步骤，适合在形成策略摘要后补公式直觉。',
    returnQuestion: '回到案例再看：模型指标和业务代价分别在衡量什么？',
  },
  {
    id: 'd2l-softmax-loss',
    title: 'Softmax 回归与损失函数',
    org: '动手学深度学习', language: 'zh', sourceType: 'course', contentOrigin: '中文原创',
    url: 'https://courses.d2l.ai/zh-v2/',
    relatedCaseIds: ['foundation-feedback-loop'], relatedRouteIds: ['foundation'], level: '进阶', casePriority: 20,
    whyWorthWatching: '中文系统课程，补足 Softmax、损失函数与代码实现之间的联系。',
    returnQuestion: '回到案例再看：概率输出如何变成训练信号？',
  },
  {
    id: 'ibm-rag-overview',
    title: 'What is Retrieval-Augmented Generation (RAG)?',
    org: 'IBM Technology', language: 'en', sourceType: 'youtube', contentOrigin: '海外原版',
    url: 'https://www.youtube.com/watch?v=T-D1OfcDW1M',
    relatedCaseIds: ['rag-budget'], relatedRouteIds: ['llm'], level: '入门', casePriority: 10,
    whyWorthWatching: '快速建立检索、增强与生成的整体关系，再理解为什么增加 k 不等于答案一定更好。',
    returnQuestion: '回到案例再看：你增加的文档是在补证据，还是在制造噪声？',
  },
  {
    id: 'deeplearning-ai-rag',
    title: 'Retrieval Augmented Generation (RAG)',
    org: 'DeepLearning.AI', language: 'en', sourceType: 'course', contentOrigin: '海外原版',
    url: 'https://www.deeplearning.ai/courses/retrieval-augmented-generation',
    relatedCaseIds: ['rag-budget'], relatedRouteIds: ['llm'], level: '进阶', casePriority: 30,
    whyWorthWatching: '系统覆盖检索、语义搜索、重排与生成，适合深入理解 RAG 各阶段的责任边界。',
    returnQuestion: '回到案例再看：低覆盖应该改召回，还是改重排？',
  },
  {
    id: 'hugging-face-diffusion-introduction',
    title: 'Diffusion Course: An Introduction to Diffusion Models',
    org: 'Hugging Face', language: 'en', sourceType: 'course', contentOrigin: '海外原版',
    url: 'https://huggingface.co/learn/diffusion-course/unit1/1',
    relatedCaseIds: ['image-unit-cost'], relatedRouteIds: ['image'], level: '入门', casePriority: 10,
    whyWorthWatching: '从扩散过程进入训练与采样，帮助理解 steps、质量和计算成本为何联动。',
    returnQuestion: '回到案例再看：增加 steps 解决的是哪类失败？',
  },
  {
    id: 'deeplearning-ai-diffusion-models',
    title: 'How Diffusion Models Work',
    org: 'DeepLearning.AI', language: 'en', sourceType: 'course', contentOrigin: '海外原版',
    url: 'https://corporate.deeplearning.ai/courses/diffusion-models/lesson/xb8aa/introduction',
    relatedCaseIds: ['image-unit-cost'], relatedRouteIds: ['image'], level: '进阶', casePriority: 30,
    whyWorthWatching: '用短单元串起采样、训练、控制与加速，适合把"可用图成本"拆到具体环节。',
    returnQuestion: '回到案例再看：该加算力、加控制，还是改失败回退？',
  },
  {
    id: 'langgraph-human-in-the-loop',
    title: 'AI Agents in LangGraph: Human in the loop',
    org: 'DeepLearning.AI', language: 'en', sourceType: 'course', contentOrigin: '海外原版', durationLabel: '约 14 分钟单元',
    url: 'https://learn.deeplearning.ai/courses/ai-agents-in-langgraph/lesson/k87e1/human-in-the-loop',
    relatedCaseIds: ['refund-gate'], relatedRouteIds: ['agent'], level: '入门', casePriority: 10,
    whyWorthWatching: '直接对应高风险工具执行前的人类确认，补足确认门如何进入 Agent 工作流。',
    returnQuestion: '回到案例再看：哪些退款动作必须被打断并等待确认？',
  },
  {
    id: 'google-kaggle-agents-intensive',
    title: '5-Day AI Agents Intensive',
    org: 'Google × Kaggle', language: 'en', sourceType: 'course', contentOrigin: '海外原版',
    url: 'https://www.kaggle.com/learn-guide/5-day-agents',
    relatedCaseIds: ['refund-gate'], relatedRouteIds: ['agent'], level: '进阶', casePriority: 30,
    whyWorthWatching: '系统覆盖模型、工具、编排、记忆与评估，帮助判断副作用问题究竟属于模型还是 Harness。',
    returnQuestion: '回到案例再看：误退应靠换模型，还是靠幂等与权限边界？',
  },
  {
    id: 'crewai-multi-agent-systems',
    title: 'Multi AI Agent Systems with crewAI',
    org: 'DeepLearning.AI', language: 'en', sourceType: 'course', contentOrigin: '海外原版',
    url: 'https://learn.deeplearning.ai/courses/multi-ai-agent-systems-with-crewai/lesson/wwou5/introduction',
    relatedCaseIds: ['new-information'], relatedRouteIds: ['agent-book'], level: '入门', casePriority: 10,
    whyWorthWatching: '通过协作案例理解角色分工，但也便于反思"多一个角色"是否真的带来新证据。',
    returnQuestion: '回到案例再看：每个 Agent 新增了什么信息源？',
  },
  {
    id: 'crewai-production-multi-agent-systems',
    title: 'Design, Develop, and Deploy Multi-Agent Systems with CrewAI',
    org: 'DeepLearning.AI', language: 'en', sourceType: 'course', contentOrigin: '海外原版',
    url: 'https://www.deeplearning.ai/courses/design-develop-and-deploy-multi-agent-systems-with-crewai',
    relatedCaseIds: ['new-information'], relatedRouteIds: ['agent-book'], level: '进阶', casePriority: 30,
    whyWorthWatching: '把工具、记忆、护栏与执行钩子放进生产系统，适合检验多 Agent 的额外复杂度是否值得。',
    returnQuestion: '回到案例再看：净增益是否覆盖了延迟、token 与治理成本？',
  },
  {
    id: 'mit-han-lab-knowledge-distillation',
    title: 'EfficientML.ai Lecture 9: Knowledge Distillation',
    org: 'MIT HAN Lab', language: 'en', sourceType: 'youtube', contentOrigin: '海外原版', durationLabel: '约 58 分钟',
    url: 'https://www.youtube.com/watch?v=EkjVHToId7U',
    relatedCaseIds: ['distill-retention'], relatedRouteIds: ['distill'], level: '进阶', casePriority: 10,
    whyWorthWatching: '系统讲解温度、软标签与知识迁移，适合深入理解"一致率高但能力保留低"的原因。',
    returnQuestion: '回到案例再看：你是在保留暗知识，还是复制教师偏差？',
  },
  {
    id: 'karpathy-zero-to-hero-official',
    title: 'Neural Networks: Zero to Hero',
    speaker: 'Andrej Karpathy', org: 'Andrej Karpathy', language: 'en', sourceType: 'course', contentOrigin: '海外原版',
    url: 'https://karpathy.ai/zero-to-hero.html',
    relatedCaseIds: [], relatedRouteIds: ['foundation', 'llm'], level: '进阶',
    whyWorthWatching: '从反向传播、micrograd 和 makemore 一路手写到 GPT，是理解神经网络底层机制最完整的第一性原理路线之一。',
    returnQuestion: '回到案例再看：模型给出的概率，究竟经过了怎样的前向计算与反向更新？',
  },
  {
    id: 'karpathy-zero-to-hero-bilibili',
    title: '从零构建 GPT：Neural Networks Zero to Hero（中英）',
    speaker: 'Andrej Karpathy', org: 'B站译制', language: 'zh', sourceType: 'bilibili', contentOrigin: '中文译制',
    url: 'https://www.bilibili.com/video/BV1mqrTBvEaf/',
    originalSourceUrl: 'https://www.youtube.com/playlist?list=PLAqhIrjkxbuWI23v9cThsA9GvCAUhRvKZ',
    relatedCaseIds: ['foundation-feedback-loop'], relatedRouteIds: ['foundation', 'llm'], level: '进阶', casePriority: 15,
    whyWorthWatching: 'Karpathy 课程的中英版本，保留从 micrograd、makemore、MLP 到 GPT 的完整学习顺序。',
    returnQuestion: '回到案例再看：高置信输出是在哪一层被逐步推高的？',
  },
  {
    id: 'karpathy-reproduce-gpt2-bilibili',
    title: '让我们重现 GPT-2（中英精校）',
    speaker: 'Andrej Karpathy', org: 'Web3天空之城译制', language: 'zh', sourceType: 'bilibili', contentOrigin: '中文译制', durationLabel: '约 4 小时',
    url: 'https://www.bilibili.com/video/BV12s421u7sZ/',
    relatedCaseIds: ['rag-budget'], relatedRouteIds: ['llm'], level: '进阶', casePriority: 50,
    whyWorthWatching: '从数据、训练循环到 GPT-2 复现，帮助把"大模型能力"还原成可检查的工程与训练环节。',
    returnQuestion: '回到案例再看：RAG 的问题来自检索链路，还是底座模型自身能力边界？',
  },
  {
    id: 'karpathy-llm-deep-dive-bilibili',
    title: '深入探索像 ChatGPT 这样的大语言模型（中文）',
    speaker: 'Andrej Karpathy', org: 'KrillinAI小林译制', language: 'zh', sourceType: 'bilibili', contentOrigin: '中文译制',
    url: 'https://www.bilibili.com/video/BV16cNEeXEer/',
    originalSourceUrl: 'https://www.youtube.com/watch?v=7xTGNNLPyMI',
    relatedCaseIds: ['rag-budget'], relatedRouteIds: ['llm'], level: '入门', casePriority: 15,
    whyWorthWatching: '用系统视角解释预训练、微调、推理与 LLM OS，适合策略产品建立模型能力边界。',
    returnQuestion: '回到案例再看：哪些问题应该交给模型，哪些问题必须交给检索与产品约束？',
  },
  {
    id: 'limu-transformer-paper-bilibili',
    title: 'Transformer 论文逐段精读',
    speaker: '李沐', org: '跟李沐学AI', language: 'zh', sourceType: 'bilibili', contentOrigin: '中文原创',
    url: 'https://www.bilibili.com/video/BV1pu411o7BE/',
    relatedCaseIds: ['rag-budget'], relatedRouteIds: ['llm'], level: '进阶', casePriority: 40,
    whyWorthWatching: '从论文结构、注意力机制和计算路径理解 Transformer，为判断模型边界补足架构基础。',
    returnQuestion: '回到案例再看：上下文变长时，信息利用能力和检索覆盖是同一个问题吗？',
  },
  {
    id: 'andrew-ng-advanced-rag-bilibili',
    title: '构建和评估高级 RAG 应用（中英字幕）',
    speaker: 'Andrew Ng / Jerry Liu', org: 'B站字幕版', language: 'zh', sourceType: 'bilibili', contentOrigin: '中文译制',
    url: 'https://www.bilibili.com/video/BV1494y1E7H9/',
    originalSourceUrl: 'https://www.deeplearning.ai/short-courses/building-evaluating-advanced-rag/',
    relatedCaseIds: ['rag-budget'], relatedRouteIds: ['llm'], level: '进阶', casePriority: 20,
    whyWorthWatching: '直接讲高级检索与 RAG 评估，把"多召回一些"升级成可分阶段测量的系统问题。',
    returnQuestion: '回到案例再看：当前失败来自上下文相关性、事实性，还是回答相关性？',
  },
  {
    id: 'hungyi-lee-diffusion-bilibili',
    title: '扩散模型 Diffusion Model',
    speaker: '李宏毅', org: '李宏毅课程中文版本', language: 'zh', sourceType: 'bilibili', contentOrigin: '中文原创',
    url: 'https://www.bilibili.com/video/BV14c411J7f2/',
    relatedCaseIds: ['image-unit-cost'], relatedRouteIds: ['image'], level: '入门', casePriority: 20,
    whyWorthWatching: '用中文解释加噪、去噪和生成过程，帮助建立采样步数与质量成本的机制直觉。',
    returnQuestion: '回到案例再看：减少采样步数牺牲的是哪一部分生成质量？',
  },
  {
    id: 'hungyi-lee-agent-principles-bilibili',
    title: '一堂课搞懂 AI Agent 的原理',
    speaker: '李宏毅', org: '李宏毅课程中文版本', language: 'zh', sourceType: 'bilibili', contentOrigin: '中文原创',
    url: 'https://www.bilibili.com/video/BV1BWRhYFE8y/',
    relatedCaseIds: ['refund-gate', 'new-information'], relatedRouteIds: ['agent', 'agent-book'], level: '入门', casePriority: 20,
    whyWorthWatching: '从工具使用、行为调整和任务执行解释 Agent，适合非工程背景用户建立完整系统图。',
    returnQuestion: '回到案例再看：哪些步骤可以自治，哪些步骤必须经过确认门？',
  },
  {
    id: 'zihao-kd-paper-bilibili',
    title: '知识蒸馏经典论文精读与 PyTorch 实战',
    speaker: '同济子豪兄', org: '同济子豪兄', language: 'zh', sourceType: 'bilibili', contentOrigin: '中文原创',
    url: 'https://www.bilibili.com/video/BV1gS4y1k7vj/',
    relatedCaseIds: ['distill-retention'], relatedRouteIds: ['distill'], level: '进阶', casePriority: 20,
    whyWorthWatching: '从 Hinton 经典论文、软标签到 PyTorch 实作，连接蒸馏机制、评估与部署。',
    returnQuestion: '回到案例再看：温度和软标签保留了什么，又会复制什么偏差？',
  },
  {
    id: 'harness-self-improvement',
    title: 'Why We Think · How Much Can We Actually Harness Self-Improvement?',
    speaker: 'Lilian Weng', org: 'OpenAI', language: 'en', sourceType: 'blog', contentOrigin: '海外原版',
    url: 'https://lilianweng.github.io/posts/2026-07-04-harness/',
    relatedCaseIds: ['evaluator-trust'], relatedRouteIds: ['self-evolving'], level: '入门', casePriority: 20,
    whyWorthWatching: "把 RSI 从'模型重写自身权重'的科幻叙事拉回 harness 工程现实，理解短期真实能做的部分。",
    returnQuestion: '我们的自动化闭环，哪一部分其实还是外围调度、哪一部分才是模型自我更新？',
  },
  {
    id: 'self-rewarding-lm',
    title: 'Self-Rewarding Language Models',
    speaker: 'Weizhe Yuan 等', org: 'Meta AI', language: 'en', sourceType: 'paper', contentOrigin: '海外原版',
    url: 'https://arxiv.org/abs/2401.10020',
    relatedCaseIds: ['evaluator-trust'], relatedRouteIds: ['self-evolving'], level: '进阶', casePriority: 40,
    whyWorthWatching: '用 LLM 自己当 judge，看清楚 evaluator 和 policy 可能同步漂移这一核心风险。',
    returnQuestion: '我们让模型自评时，如何检测评估者漂移？',
  },
  {
    id: 'alphaevolve-blog',
    title: 'AlphaEvolve: A Gemini-powered coding agent for designing advanced algorithms',
    speaker: 'AlphaEvolve 团队', org: 'Google DeepMind', language: 'en', sourceType: 'blog', contentOrigin: '海外原版',
    url: 'https://deepmind.google/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/',
    relatedCaseIds: ['evaluator-trust'], relatedRouteIds: ['self-evolving'], level: '入门', casePriority: 30,
    whyWorthWatching: "工业界最接近'可部署 RSI'的案例，明确只在可执行 evaluator 的场景下生效。",
    returnQuestion: '我业务里哪些决策有确定性 evaluator，哪些没有？',
  },
  {
    id: 'rsi-risks-mit',
    title: 'What is AI recursive self-improvement?',
    speaker: 'MIT Technology Review', org: 'MIT Technology Review', language: 'en', sourceType: 'report', contentOrigin: '海外原版',
    url: 'https://www.technologyreview.com/2026/08/18/1142188/ai-recursive-self-improvement/',
    relatedCaseIds: ['evaluator-trust'], relatedRouteIds: ['self-evolving'], level: '入门', casePriority: 50,
    whyWorthWatching: '补充批评视角：AI 可以跑实验，但研究判断力仍然是瓶颈。',
    returnQuestion: "我们的自动化，把'工程执行'和'策略判断'混在一起了吗？",
  },
  {
    id: 'self-evolution-survey-cn',
    title: 'A Survey on Self-Evolution of Large Language Models',
    speaker: '阿里通义 & 北大团队', org: '阿里通义实验室', language: 'en', sourceType: 'paper', contentOrigin: '中文原创',
    url: 'https://arxiv.org/abs/2404.14387',
    originalSourceUrl: 'https://hub.baai.ac.cn/view/48026',
    relatedCaseIds: ['evaluator-trust'], relatedRouteIds: ['self-evolving'], level: '入门', casePriority: 10,
    whyWorthWatching: "把'自进化'的多种做法用四维框架统一归类，减少术语噪声。",
    returnQuestion: '我的场景在这四个象限的哪一格？该选哪条路径？',
  },
  {
    id: 'world-models-ha',
    title: 'World Models',
    speaker: 'David Ha, Jürgen Schmidhuber', org: 'Google Brain / NNAISENSE', language: 'en', sourceType: 'paper', contentOrigin: '海外原版',
    url: 'https://worldmodels.github.io/',
    originalSourceUrl: 'https://arxiv.org/abs/1803.10122',
    relatedCaseIds: ['simulator-vs-reality'], relatedRouteIds: ['world-model'], level: '入门', casePriority: 20,
    whyWorthWatching: "世界模型的奠基工作，讲清'在梦中训练策略'的基本范式，且带可交互演示。",
    returnQuestion: "我们的策略系统，有没有可能做一个'内部小模拟器'？",
  },
  {
    id: 'lecun-jepa-vision',
    title: 'A Path Towards Autonomous Machine Intelligence',
    speaker: 'Yann LeCun', org: 'Meta AI', language: 'en', sourceType: 'paper', contentOrigin: '海外原版',
    url: 'https://openreview.net/pdf?id=BZ5a1r-kVsf',
    relatedCaseIds: ['simulator-vs-reality'], relatedRouteIds: ['world-model'], level: '进阶', casePriority: 40,
    whyWorthWatching: "LeCun 关于'为什么 LLM 不够'的核心论证，帮助判断 LLM 规划的可靠边界。",
    returnQuestion: '我们让 LLM 做多步规划时，它到底在预测什么？',
  },
  {
    id: 'dreamerv3-paper',
    title: 'Mastering Diverse Domains through World Models (DreamerV3)',
    speaker: 'Danijar Hafner 等', org: 'Google DeepMind', language: 'en', sourceType: 'paper', contentOrigin: '海外原版',
    url: 'https://arxiv.org/abs/2301.04104',
    originalSourceUrl: 'https://www.nature.com/articles/s41586-025-08744-2',
    relatedCaseIds: ['simulator-vs-reality'], relatedRouteIds: ['world-model'], level: '进阶', casePriority: 50,
    whyWorthWatching: "单一超参在 150+ 环境达 SOTA，代表'世界模型 + 想象训练'的通用性上限。",
    returnQuestion: '我们业务的动态是否稳定到可以被世界模型学到？',
  },
  {
    id: 'world-model-survey-thu',
    title: 'Understanding World or Predicting Future? A Comprehensive Survey of World Models',
    speaker: '丁璟韬 等', org: '清华大学', language: 'en', sourceType: 'paper', contentOrigin: '中文原创',
    url: 'https://arxiv.org/abs/2411.14499',
    originalSourceUrl: 'https://github.com/tsinghua-fib-lab/World-Model',
    relatedCaseIds: ['simulator-vs-reality'], relatedRouteIds: ['world-model'], level: '入门', casePriority: 30,
    whyWorthWatching: "把世界模型明确拆成'理解'与'预测'两大功能方向，减少概念混淆。",
    returnQuestion: "我要的是'理解型'还是'预测型'世界模型？",
  },
  {
    id: 'world-model-cn-video',
    title: '世界模型：定义、路线与真实进展（硅谷101）',
    speaker: '硅谷101', org: '硅谷101', language: 'zh', sourceType: 'bilibili', contentOrigin: '中文原创',
    url: 'https://www.bilibili.com/video/BV11LPWzNEkm/',
    relatedCaseIds: ['simulator-vs-reality'], relatedRouteIds: ['world-model'], level: '入门', casePriority: 10,
    whyWorthWatching: '中文系统拆解世界模型的定义与三条技术路线，适合快速建全局图。',
    returnQuestion: '我最先应该关注的是 RL、视频生成还是 JEPA 路线？',
  },
] satisfies VideoResource[])

function compareCasePriority(left: VideoResource, right: VideoResource) {
  return (left.casePriority ?? Number.MAX_SAFE_INTEGER) - (right.casePriority ?? Number.MAX_SAFE_INTEGER)
    || left.id.localeCompare(right.id)
}

export function getVideosForCase(caseId: CaseId) {
  return videoResources.filter((resource) => resource.relatedCaseIds.includes(caseId)).sort(compareCasePriority)
}

export function getCaseVideoSelection(caseId: CaseId, limit = 3) {
  const related = getVideosForCase(caseId)
  const videos = related.slice(0, Math.max(0, limit))
  return { videos, total: related.length, remaining: Math.max(0, related.length - videos.length) }
}

export function getVideosForRoute(routeId: RouteId) {
  return videoResources.filter((resource) => resource.relatedRouteIds.includes(routeId))
}
