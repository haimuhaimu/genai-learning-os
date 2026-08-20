export type AgentBookChapterId = `ch${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}`

export type AgentBookLearningModeId = 'concept-card' | 'formula-handbook' | 'review-rubric' | 'diagnosis-card' | 'experiment-preview'

export type AgentBookLearningMode = {
  id: AgentBookLearningModeId
  title: string
  bullets: string[]
}

export type AgentBookFormula = {
  title: string
  content: string
  note?: string
}

export type AgentBookExperimentRef = {
  /** 书内编号，例如 2-3 */
  code: string
  /** 仓库内目录名（不复制代码，仅引用入口） */
  directory: string
  /** 为什么要做 / 你在验证什么 */
  intent: string
  difficulty?: '★' | '★★' | '★★★'
}

export type AgentBookChapter = {
  id: AgentBookChapterId
  titleZh: string
  titleEn: string
  theme: string
  oneLiner: string
  coreConcepts: string[]
  /** 允许概念性引用，不整段复制原文 */
  stances: string[]
  formulas: AgentBookFormula[]
  /** 经验数字 / 结论性指标（来自书中叙述的“可操作数字/量级/对比”） */
  heuristics: string[]
  experiments: AgentBookExperimentRef[]
  learningModes: AgentBookLearningMode[]
  /** 章章互链：同标签可在页面里一键跳转到关联章节 */
  tags: string[]
  /** 可选：用于“已手算”阶段的微型练习（教学自检，不等同于原书实验） */
  microCalc?: {
    question: string
    answer: number
    tolerance: number
    hint: string
    steps: string[]
  }
}

export const agentBookKeyTags = [
  'context-engineering',
  'kv-cache',
  'prompt-cache',
  'stable-prefix',
  'chat-template',
  'status-bar',
  'harness',
  'proposer-reviewer',
  'progressive-disclosure',
  'append-only',
  'boundary-set',
  'retention-set',
  'minimal-diff',
  'reversible',
  'pass-at-k',
  'pass-k',
  'veto',
  'coding-agent-core',
  'seven-tools',
  'filesystem-hub',
  'new-info-criterion',
  'three-layer-verify',
  'observation-space',
  'action-space',
  'event-driven',
  'post-training',
  'shape-then-spirit',
] as const

export const agentBookChapters: AgentBookChapter[] = [
  {
    id: 'ch1',
    titleZh: 'AI Agent 入门',
    titleEn: 'Introduction to AI Agents',
    theme: '用一个可执行的框架把“对话”升级为“闭环做事”。',
    oneLiner: '用“Agent = LLM + 上下文 + 工具”把系统边界说清楚，再用 Model–Harness 把工程责任分清。',
    coreConcepts: [
      'Agent = LLM + 上下文 + 工具',
      'Agent = Model + Harness（Harness 包含：Context + Tools + Constrain + Verify + Correct）',
      '观察空间 / 动作空间（Observation/Action Space）',
      'ReAct：思考→行动→观察→…',
      '轨迹（trajectory）与静态前缀（stable prefix）',
      '消融实验（ablation）定位“哪块不可替代”',
      '工作流 → 半自主 → 自主 Agent 的编排光谱',
    ],
    stances: [
      '“Agent = LLM + 上下文 + 工具”不是口号，而是工程边界；缺一不可。',
      '评估一个 Agent 不是只看模型能力，而是看 Model 与 Harness 的组合体。',
      '在模型会越来越强的前提下，Harness 的价值在于：把不稳定能力变成可控系统，并且随模型一层层“被吃掉”地迁移。',
    ],
    formulas: [
      { title: '核心公式（工程视角）', content: 'Agent = LLM + Context + Tools' },
      { title: '核心循环伪代码（ReAct skeleton）', content: [
        'trajectory = [user_request]',
        'repeat:',
        '  context = stable_prefix + trajectory',
        '  decision = Model(context)',
        '  trajectory.append(decision)',
        '  if decision has no tool call: return decision.answer',
        '  for call in decision.tool_calls:  # independent calls may run in parallel',
        '    validated = Harness.validate(call)',
        '    obs = Environment.execute(validated)',
        '    trajectory.append(obs)',
      ].join('\n') },
      { title: '上下文五要素（概念框架）', content: 'system + tools + user + assistant + tool_result' },
    ],
    heuristics: [
      '“消融”比“调参”更早：先做去组件对照，确认问题真在那一层。',
      '把“完成”从模型宣称，变成验证器证明：这条原则贯穿后续章节。',
    ],
    experiments: [
      { code: '1-1', directory: 'chapter1/context', intent: '做系统性消融：去掉 tool definition、tool result、历史等，看行为如何退化', difficulty: '★★' },
      { code: '1-2', directory: 'chapter1/web-search-agent', intent: '体验“模型即 Agent”的多轮搜索闭环：反复检索→综合→引用', difficulty: '★★' },
      { code: '1-3', directory: 'chapter1/search-codegen', intent: '把“搜索 + 代码执行”做成 Deep Research 闭环：先澄清意图再跑', difficulty: '★★' },
    ],
    learningModes: [
      { id: 'concept-card', title: '概念卡：把 Agent 画成边界清晰的系统', bullets: ['三件事：看到什么（Context）、能做什么（Tools）、如何决策（LLM）', '两层责任：Model 负责决策；Harness 负责治理与可靠性交付'] },
      { id: 'formula-handbook', title: '公式手册：从“消息列表”理解上下文', bullets: ['上下文不是一段 prompt，而是一组消息 + tools schema', '轨迹（trajectory）是“只增不改”的事件流，适合调试与审计'] },
      { id: 'experiment-preview', title: '实验预告：消融与闭环', bullets: ['先做 1-1 消融建立直觉：哪些组件缺了会直接“跑不动”', '再做 1-2/1-3 看“多轮 + 工具 + 产物”如何形成能力'] },
    ],
    tags: ['harness', 'append-only', 'observation-space', 'action-space', 'proposer-reviewer'],
    microCalc: {
      question: '假设一个任务跑了 5 轮 ReAct（每轮都调用一次模型），轨迹里至少会新增多少条 assistant 消息？',
      answer: 5,
      tolerance: 0,
      hint: '每次模型调用都会产生一条 assistant message（无论是否调用工具）。',
      steps: ['每轮 = 1 次 Model(context) → 1 条 assistant 消息', '5 轮 → 5 条 assistant 消息'],
    },
  },
  {
    id: 'ch2',
    titleZh: '上下文工程（全书最关键章）',
    titleEn: 'Context Engineering',
    theme: '上下文不是“更长更好”，而是“更稳定、更结构化、更可缓存”。',
    oneLiner: '把 KV Cache / Prompt Cache 当作架构约束：system+tools 要字节级稳定，动态信息追加到末尾，并遵循 Chat Template。',
    coreConcepts: [
      '消息角色：system / user / assistant / tool',
      'KV Cache：复用历史计算结果的底层机制',
      '稳定前缀（system + tools）与缓存命中',
      'Agent Skills：按需加载，渐进式披露（progressive disclosure）',
      'Agent Status Bar：把隐式状态显式化，注入上下文尾部',
      '提示注入攻防（Prompt Injection）',
      '上下文压缩（Context Compression）与门控',
      'Chat Template / 格式一致性',
    ],
    stances: [
      '上下文工程决定 Agent 能力上限；模型再强，缺上下文也会像“永远的新员工”。',
      '把 KV Cache 当作硬约束：前缀越稳定，越能用缓存换时间与钱。',
      '动态信息优先“追加到末尾”而不是“改写前缀”；Status Bar 是把状态注入末尾的标准做法。',
    ],
    formulas: [
      { title: '上下文等式', content: 'Context = stable_prefix(system+tools) + trajectory(user/assistant/tool_result)' },
      { title: '缓存直觉（教学公式）', content: 'prefill_cost ≈ (1 - hit_ratio) × prefix_tokens', note: '前缀越稳定、命中率越高，TTFT 越低；反之，动态 system / 动态工具排序会“击穿缓存”。' },
      { title: 'Status Bar 放置规则（可审计口径）', content: '把“当前环境/时间/预算/进度”等状态，写成短条目并追加在上下文尾部', note: '目的是让模型“看到它本来感知不到的隐式状态”。' },
    ],
    heuristics: [
      'system+tools 要“字节级稳定”（包括顺序、空格、引号风格等），否则缓存被动失效。',
      '工具规模化时，“工具定义索引 + 按需加载定义”优于一次性塞进上下文。',
      '压缩不是省事：要门控、要可回放、要能解释“丢了什么”。',
    ],
    experiments: [
      { code: '2-3', directory: 'chapter2/kv-cache', intent: '对照不同上下文管理模式对 KV Cache 的影响，复现“破坏前缀→成本上升”', difficulty: '★★' },
      { code: '2-10', directory: 'chapter2/context-compression', intent: '实现多种压缩策略并对比：摘要、关键信息提取、语义压缩', difficulty: '★★' },
      { code: '2-5', directory: 'chapter2/prompt-injection', intent: '3 种攻击 × 4 种防御配置：逐层叠加防御后注入成功率下降', difficulty: '★★★' },
      { code: '2-6', directory: 'chapter2/agent-skills-ppt', intent: '体验 Skill 的按需加载与渐进式披露：少量通用工具 + Skill 文档覆盖复杂能力', difficulty: '★★' },
    ],
    learningModes: [
      { id: 'concept-card', title: '概念卡：为什么这是全书最关键章', bullets: ['Agent 的“眼睛”= 上下文；看不到就等于不存在', '上下文工程同时解决：信息供给、缓存友好、安全注入对抗'] },
      { id: 'formula-handbook', title: '公式手册：KV Cache / 前缀稳定性', bullets: ['把前缀当作“不可随意改动的 ABI”', '动态信息追加在末尾；替换（rewrite）会引入额外 prefill'] },
      { id: 'diagnosis-card', title: '诊断卡：常见上下文反模式', bullets: ['动态 system prompt：命中率从高到低瞬间归零', '动态工具排序：看似无害，实际改变字节序列', '滑动窗口：省长度但破坏缓存复用', '把状态写进历史中段：等于每轮都要重算'] },
      { id: 'experiment-preview', title: '实验预告：KV Cache 与压缩门控', bullets: ['先跑 2-3 建立缓存直觉', '再跑 2-10：压缩必须可回放并受门控'] },
    ],
    tags: ['context-engineering', 'kv-cache', 'prompt-cache', 'stable-prefix', 'chat-template', 'status-bar', 'progressive-disclosure', 'append-only'],
    microCalc: {
      question: '前缀 2000 tokens，缓存命中率 70%。按教学公式估算“需要重新 prefill 的前缀 token 数”？',
      answer: 600,
      tolerance: 1,
      hint: 'prefill_cost ≈ (1 - hit_ratio) × prefix_tokens',
      steps: ['1-hit_ratio = 0.3', '0.3 × 2000 = 600'],
    },
  },
  {
    id: 'ch3',
    titleZh: '用户记忆和知识库',
    titleEn: 'User Memory & Knowledge Base',
    theme: '把“记住”做成跨会话、可更新、可检索、可评估的系统。',
    oneLiner: '轨迹（只增不改）负责可追溯，长期记忆负责可变提炼；评估先于方案。',
    coreConcepts: [
      '轨迹（append-only） vs 长期记忆（可变）',
      '用户记忆：选择性 / 抽象化 / 结构化',
      '记忆三层评估框架：基础回忆 / 多会话检索 / 主动服务',
      '四种记忆格式：Simple Notes / Enhanced Notes / JSON Cards / Advanced JSON Cards',
      'RAG 全栈：稠密/稀疏检索 + 重排 + 融合',
      'Agentic RAG：让 Agent 决定何时检索、检索什么',
      '上下文感知检索（Contextual Retrieval）',
    ],
    stances: [
      '记忆系统必须先有“评估标尺”，否则无法判断一次改动是进步还是运气。',
      '轨迹用于审计与复盘，应“只增不改”；长期记忆用于未来服务，允许更新与淘汰。',
      '把记忆写得越结构化，越容易在多会话与多实体场景里避免混淆与冲突。',
    ],
    formulas: [
      { title: '记忆生命周期（概念伪代码）', content: [
        'on_conversation_end:',
        '  candidates = LLM.extract_facts(trajectory)',
        '  reviewed = LLM.review(candidates, policy)',
        '  memory_store.upsert(reviewed)',
        'on_query:',
        '  hits = retrieval.search(query, memory_store + kb)',
        '  context.append(hits)',
      ].join('\n') },
      { title: '三层记忆评估（从“能记住”到“能主动服务”）', content: 'L1 基础回忆 → L2 多会话检索 → L3 主动服务' },
    ],
    heuristics: [
      'LoCoMo：平均约 300 轮对话、最多 35 个会话，用来测长期对话记忆。',
      'Mem0 v3 选择“只追加写入”，把冲突处理移到检索/排序阶段，减少不可逆 UPDATE/DELETE 风险。',
      '混合检索（BM25 + 向量 + 实体/时间信号）通常比单一路径更稳。',
    ],
    experiments: [
      { code: '3-1/3-2', directory: 'chapter3/user-memory', intent: '在统一接口下对比四种记忆格式，并在三层评估集上对照得分', difficulty: '★★' },
      { code: '3-6', directory: 'chapter3/retrieval-pipeline', intent: '搭建稠密+稀疏+重排的完整检索流水线，并做融合/排序对照', difficulty: '★★' },
      { code: '3-8', directory: 'chapter3/agentic-rag', intent: '对比 Non-Agentic 与 Agentic RAG：让 Agent 主导迭代检索', difficulty: '★★' },
      { code: '3-10', directory: 'chapter3/contextual-retrieval', intent: '为 chunk 生成上下文前缀摘要，降低检索失败率', difficulty: '★★' },
    ],
    learningModes: [
      { id: 'concept-card', title: '概念卡：记忆不是“把聊天存起来”', bullets: ['保存经历 ≠ 从经历中学习（第九章会进一步强化）', '轨迹（证据）与记忆（可变提炼）要分层'] },
      { id: 'formula-handbook', title: '公式手册：三层评估框架', bullets: ['L1：能精确回忆用户提供的事实', 'L2：能跨会话综合检索并澄清歧义', 'L3：能从历史中联想并主动提醒/预警'] },
      { id: 'diagnosis-card', title: '诊断卡：记忆系统常见坑', bullets: ['冲突更新不可逆：一次错误 UPDATE 会让历史证据丢失', '只用语义检索会忽略时间与实体消歧', '记忆太“散”：需要结构化卡片来承载关系与来源'] },
    ],
    tags: ['append-only', 'progressive-disclosure', 'three-layer-verify'],
    microCalc: {
      question: '三层记忆评估里，“主动服务”属于第几层？（填 1/2/3）',
      answer: 3,
      tolerance: 0,
      hint: '书里把记忆能力分解为递进三层，最高层才叫“主动服务”。',
      steps: ['L1 基础回忆', 'L2 多会话检索', 'L3 主动服务'],
    },
  },
  {
    id: 'ch4',
    titleZh: '工具',
    titleEn: 'Tools',
    theme: '工具是 Agent 的“手脚”，规模化后要解决选择、保真与安全。',
    oneLiner: '工具生态（MCP）让“接入”容易，但可靠性来自：边界清晰、参数保真、安全门禁与按需发现。',
    coreConcepts: [
      '五类工具：感知 / 执行 / 协作 / 事件触发 / 用户沟通',
      'MCP：工具互操作标准（tools/resources/prompts）',
      '专用工具 vs Skill + 通用执行器（能力表达形态）',
      '工具描述的艺术：什么时候用、什么时候不用、边界与反例',
      '参数保真性：禁止静默转换与静默注入',
      '动态工具发现：索引 → 按需加载 schema',
      '执行工具安全：输入校验、权限控制、提议者-审核者',
    ],
    stances: [
      '工具描述里“做不到什么”往往比“能做什么”更重要。',
      '工具层不能“偷偷帮模型改输入”：静默转换会制造模型无法诊断的系统性故障。',
      '工具数量上百时，必须渐进式披露与主动发现，否则上下文被工具 schema 吃空。',
    ],
    formulas: [
      { title: '工具分类（方向 × 作用对象）', content: 'Agent 主动调用：感知/执行/协作/用户沟通；外部触发：事件触发' },
      { title: '能力表达三维决策', content: '专用工具 vs Skill+执行器 = f(参数复杂度, 变更频率, 模型能力)', note: '参数越复杂/风险越高越偏专用工具；流程多变更偏 Skill。' },
    ],
    heuristics: [
      '当工具 > 100 时，“工具选择”会成为性能瓶颈：要用层次化组织 + 按需发现。',
      'MCP 带来新风险：工具描述投毒、同名遮蔽、供应链与凭证边界。',
      '安全机制要分层：输入验证 → 权限控制 → 审核者/门禁。',
    ],
    experiments: [
      { code: '4-1', directory: 'chapter4/perception-tools', intent: '构建感知工具 MCP：搜索/文档提取/文件系统/公开数据源', difficulty: '★★' },
      { code: '4-3', directory: 'chapter4/execution-tools', intent: '执行工具 MCP：schema 校验、风险分类、结果验证与门禁', difficulty: '★★★' },
      { code: '4-5', directory: 'chapter4/active-tool-discovery', intent: '对照“全量暴露 schema” vs “按需发现”在成本/延迟上的差异', difficulty: '★★' },
    ],
    learningModes: [
      { id: 'concept-card', title: '概念卡：工具不是“越多越强”', bullets: ['接入能力容易，选择与治理更难', '规模化后的关键是：索引化、分层、按需加载'] },
      { id: 'diagnosis-card', title: '诊断卡：工具故障怎么归因', bullets: ['先检查工具描述与边界：模型选错工具往往是描述问题', '再检查参数保真：是否存在静默转码/注入', '最后才考虑“换模型”'] },
      { id: 'experiment-preview', title: '实验预告：工具安全与主动发现', bullets: ['先跑 4-3 建立安全门禁直觉', '再跑 4-5 体验“索引 → 发现 → 调用”的流程'] },
    ],
    tags: ['harness', 'progressive-disclosure', 'minimal-diff', 'reversible'],
    microCalc: {
      question: '五类工具里，哪一类是“Agent 注册、外部触发”？（填 1=感知 2=执行 3=协作 4=事件触发 5=用户沟通）',
      answer: 4,
      tolerance: 0,
      hint: '事件触发工具的关键是：外部世界主动唤醒 Agent。',
      steps: ['感知/执行/协作/用户沟通：Agent 主动调用', '事件触发：Agent 注册 → 外部触发回调'],
    },
  },
  {
    id: 'ch5',
    titleZh: 'Coding Agent 与通用 Agent',
    titleEn: 'Coding Agent & General Agents',
    theme: '代码是“能创造新工具的工具”，文件系统是信息流的中枢。',
    oneLiner: 'Coding Agent + 文件系统把“探索→验证→修复→沉淀”变成可重复工程流程。',
    coreConcepts: [
      'Coding 是通用 Agent 的基础能力',
      '七个最小工具：code interpreter / bash / read / write / edit / glob / grep',
      '文件系统作为中枢：记忆、产物、日志、回滚',
      'Harness 在 Coding 场景的四件套：约束 / 验证 / 反馈 / 回退',
      '四层故障：API / 工具 / 上下文 / 控制流',
      '“约束优于指导”：能用程序强制就别写成 prompt 建议',
    ],
    stances: [
      'Coding Agent 不只是写代码，而是把问题“形式化 + 可执行化 + 可验证化”。',
      '通用 Agent 的核心不是工具清单，而是：最小工具集 + 文件系统 + 可回滚的工作流。',
      '可靠性来自“快速反馈 + 自动验证 + 可逆操作”，而不是一次生成就完美。',
    ],
    formulas: [
      { title: '七个最小工具（通用 Agent 核心）', content: 'code_interpreter / bash / read / write / edit / glob / grep' },
      { title: '四层故障分类（用于恢复策略映射）', content: 'API 层 / 工具层 / 上下文层 / 控制流层' },
      { title: '任务象限（目标清晰度 × 验证自动化）', content: '目标明确+可自动验证 = 最适合 Agent；验证越自动化，越能扩吞吐', note: 'Coding 天然有测试/类型检查/CI，因而是 Harness 工程收益最高场景。' },
    ],
    heuristics: [
      '并行工具调用 + 流式执行可以显著降低端到端延迟（参数一完整就开跑）。',
      '错误处理“先分类再计数”：不可重试错误重试一万次也没用。',
      '终止条件必须有上限：真实案例里某条恢复路径曾无效重试数千次。',
    ],
    experiments: [
      { code: '5-1', directory: 'chapter5/code-for-math', intent: '同任务对照：代码执行 vs 纯思考，理解“验证比生成容易”的结构优势', difficulty: '★★' },
      { code: '5-7', directory: 'chapter5/adaptive-log-parser', intent: '遇到新格式→生成 parse 函数→测试通过→热更新：体验“程序化经验”', difficulty: '★★' },
      { code: '5-11', directory: 'chapter5/conversational-ui', intent: '自然语言提 UI 需求，Agent 改 React 源码借 HMR 验证', difficulty: '★★' },
    ],
    learningModes: [
      { id: 'concept-card', title: '概念卡：为什么 Coding Agent 是通用 Agent 的核心', bullets: ['代码把含糊规则变成无歧义逻辑', '执行结果提供客观对错，天然适配 Harness 的 Verify/Correct'] },
      { id: 'review-rubric', title: '评审 Rubric：你的 Coding Agent 是否“可控”', bullets: ['是否有最小工具集（而不是上百专用工具）', '是否有自动验证（测试/类型检查/静态检查）', '是否可回滚（Git/快照/工作区隔离）'] },
      { id: 'diagnosis-card', title: '诊断卡：四层故障与恢复', bullets: ['API 层：限流/超时→指数退避', '工具层：参数畸形/不存在→结构化报错喂回模型', '上下文层：溢出/结构损坏→压缩/修复配对', '控制流层：死循环→指纹+计数器熔断'] },
    ],
    tags: ['coding-agent-core', 'seven-tools', 'filesystem-hub', 'harness', 'three-layer-verify', 'minimal-diff', 'reversible'],
    microCalc: {
      question: '七个最小工具里，“搜索文件内容”是哪一个？（填 1=glob 2=grep）',
      answer: 2,
      tolerance: 0,
      hint: 'glob 找文件名；grep 找文件内容。',
      steps: ['glob：按文件名模式定位', 'grep：按内容模式定位'],
    },
  },
  {
    id: 'ch6',
    titleZh: '交互：观察与动作空间的扩展',
    titleEn: 'Interaction: Expanding Observation & Action Space',
    theme: '撤掉“轮流发言”的训练假设：异步、语音、GUI、机器人。',
    oneLiner: '模型固定时，最大杠杆往往是重新定义观察空间与动作空间；并用事件驱动把世界“推”进来。',
    coreConcepts: [
      '回合制是训练留下的假设，不是环境性质',
      '事件驱动与异步：世界主动唤醒 Agent',
      '三种事件处理策略：取消式 / 队列式 / 并行式',
      '安全点（safe point）：可中断、可恢复的边界',
      '虚拟身份与隔离执行环境（虚拟电脑/虚拟手机）',
      'Computer Use：观察→动作→再观察的视觉闭环',
      '四个时间尺度：秒-天（异步）/ 10ms-1s（语音）/ 亚秒-秒（GUI）/ 毫秒（机器人）',
    ],
    stances: [
      '真正的“主动服务”不只是定时轮询，而是世界能实时通知 Agent。',
      '同步格式与异步世界冲突时：常态保持同步轨迹，打断时用占位符修复格式。',
      '取消与抢占必须发生在安全点；未完成工具要用显式占位符，而不是伪造成功。',
    ],
    formulas: [
      { title: '事件循环骨架（概念伪代码）', content: [
        'for ever:',
        '  events = queue.take()',
        '  trajectory.append(events)',
        '  decision = Model(stable_prefix + trajectory)',
        '  dispatch(decision.tool_calls)',
        '  wait(tool_results or interrupts)',
      ].join('\n') },
      { title: '三种策略（对应不同紧急度）', content: '取消式（紧急） / 队列式（常规） / 并行式（独立轻查询）' },
    ],
    heuristics: [
      '“训练同步 / 部署异步”的矛盾，是事件驱动 Agent 的核心工程难点。',
      '结构化事件信封：来源/渠道/内容/上下文 → 让路由更可控。',
      '快慢分离：实时交互与深度思考往往需要不同模型或不同 loop。',
    ],
    experiments: [
      { code: '6-2', directory: 'chapter6/async-agent', intent: '事件队列、紧急度分派、运行中打断、异步工具并行', difficulty: '★★★' },
      { code: '6-3', directory: 'chapter6/live-audio', intent: '级联语音管线：VAD→ASR→LLM→TTS，理解端到端与级联权衡', difficulty: '★★' },
      { code: '6-8', directory: 'chapter6/computer-use-open-model', intent: '开放模型 Computer Use：截图/动作/验证闭环，理解“视觉反馈=新信息”', difficulty: '★★★' },
    ],
    learningModes: [
      { id: 'concept-card', title: '概念卡：观察/动作空间是最大杠杆', bullets: ['看不到=不存在；做不到=只能建议', '扩展空间要同时考虑：模态与触发时机'] },
      { id: 'diagnosis-card', title: '诊断卡：异步系统最易炸的三处', bullets: ['打断时轨迹格式破坏（tool_call 没有 result）', '长任务静默卡死（需要 watchdog）', '事件洪泛（需要过滤规则与优先级）'] },
      { id: 'experiment-preview', title: '实验预告：事件驱动到视觉闭环', bullets: ['先做 6-2 理解事件循环', '再做 6-8 体验“视觉验证”如何提升可靠性'] },
    ],
    tags: ['observation-space', 'action-space', 'event-driven', 'proposer-reviewer', 'new-info-criterion'],
    microCalc: {
      question: '三种事件处理策略中，用于“紧急打断”的是哪一种？（填 1=取消式 2=队列式 3=并行式）',
      answer: 1,
      tolerance: 0,
      hint: '紧急事件要提前制造安全点。',
      steps: ['取消式：立即停止当前步骤并消费紧急事件', '队列式：等自然安全点再批处理', '并行式：另起会话处理独立小问题'],
    },
  },
  {
    id: 'ch7',
    titleZh: 'Agent 的评估',
    titleEn: 'Evaluation',
    theme: '把表现变成可比较信号：指标口径、环境、判定与决策闭环。',
    oneLiner: '区分 Pass@k（上限奇观）与 Pass^k（业务可靠）；并用 veto 把“底线”从分数中分离出来。',
    coreConcepts: [
      '评估对象：Model + Harness',
      '消融实验 vs 模型替换实验（model swap）',
      'Pass@k vs Pass^k（连续可靠）',
      'Rubric 与 veto（一票否决项）',
      '工具调用型 vs 人机交互型评估环境',
      '渐进式信息透露（progressive disclosure）',
      '轨迹（trajectory） vs 最终结果（outcome）双重验证',
    ],
    stances: [
      '没有评估，就没有进步；评估是 Harness 的“Verify”核心。',
      '业务上线更关心 Pass^k，而不是“跑很多次总有一次成功”的 Pass@k。',
      '幻觉/安全/合规是 veto：不能被高分“抵消”。',
    ],
    formulas: [
      { title: '两类可靠性指标', content: ['Pass@k = 1 - (1 - p)^k', 'Pass^k = p^k'].join('\n') },
      { title: '口径提醒', content: '必须明确 k 的含义：同任务多次采样，还是生产连续 k 个任务；副作用操作必须在可回滚环境采样。' },
    ],
    heuristics: [
      'p=0.6, k=5 时：Pass@5≈99%，但 Pass^5≈7.8%（“奇观”≠“可靠”）。',
      '评估既要看结果，也要看过程：说“完成”不等于状态真的改变。',
      '用户模拟要渐进式透露信息，否则评估会被“猜答案”污染。',
    ],
    experiments: [
      { code: '7-1', directory: 'chapter7/tau2-bench-eval', intent: '运行人机交互型评估：用户模拟 + 双控环境 + 结果验证', difficulty: '★★' },
      { code: '7-3/7-4', directory: 'chapter7/user-memory-system-evaluation', intent: '多维 Rubric + 逐维证据输出 + 幻觉一票否决', difficulty: '★★' },
      { code: '7-7', directory: 'chapter7/elo-leaderboard', intent: '把大量对战偏好记录变成可比较排名：统计与置信度', difficulty: '★★' },
    ],
    learningModes: [
      { id: 'formula-handbook', title: '公式手册：Pass@k vs Pass^k', bullets: ['Pass@k 适合探索与展示上限（技术奇观）', 'Pass^k 才接近“业务连续可靠”', 'veto 是上线底线：一次违规就否决'] },
      { id: 'review-rubric', title: '评审 Rubric：客服退款任务（带 veto）', bullets: ['操作正确性：金额/订单号', '政策合规性：是否在规则内', '信息完整性：金额/到账时间/编号', 'veto：是否编造不存在的信息'] },
      { id: 'diagnosis-card', title: '诊断卡：先改 Harness 还是先换模型？', bullets: ['换强模型分数不涨：瓶颈在 Harness', '消融某组件分数大跌：该组件不可替代', '把差异转成可回放的最小归因实验'] },
    ],
    tags: ['pass-at-k', 'pass-k', 'veto', 'progressive-disclosure', 'three-layer-verify'],
    microCalc: {
      question: '单次成功率 p=0.8，k=3。Pass^k = p^k 约等于多少？（填小数，保留 3 位）',
      answer: 0.512,
      tolerance: 0.001,
      hint: '0.8×0.8×0.8',
      steps: ['0.8^2 = 0.64', '0.64×0.8 = 0.512'],
    },
  },
  {
    id: 'ch8',
    titleZh: '模型后训练',
    titleEn: 'Post-training',
    theme: '优化“大脑”：SFT / RL 如何把能力写进参数。',
    oneLiner: '在书的实验条件下总结为“SFT 记忆，RL 泛化”；更重要的是“数据与环境比算法重要”，并强调先形后神。',
    coreConcepts: [
      '三阶段：预训练 / SFT / RL',
      'SFT：仍是 next-token prediction（loss masking）',
      'RL：最大化期望奖励（可验证任务更占优）',
      'SFT 记忆 vs RL 泛化（书内对照实验口径）',
      '数据与环境 > 算法（工业经验）',
      '奖励设计：结果奖励/过程奖励/验证路径惩罚（RLVP）',
      '先形后神：先用 SFT 立“格式与协议”，再用 RL 追“策略与泛化”',
    ],
    stances: [
      'SFT 与预训练在数学上是同一个任务：预测下一个词；差别主要在数据与损失屏蔽。',
      'RL 的价值在于：用环境反馈强化示范之外的可迁移策略，但样本效率与稳定性更难。',
      '“先形后神”：严格结构化输出时，先用 SFT 把输出立稳，RL 才能有效学习。',
    ],
    formulas: [
      { title: 'RL 基本递归直觉（Bellman 样式）', content: 'Q*(s,a) = r + γ max_{a\'} Q*(s\',a\')' },
      { title: '三阶段对照（记忆点）', content: '预训练：知识地基；SFT：协议与格式；RL：策略与泛化' },
    ],
    heuristics: [
      'SFT 常用 LoRA：参数量约为原模型 1%–5% 的“补丁”，更易部署与多租户。',
      '在书的对照实验里：SFT 更容易复现示范（记忆倾向），RL 在分布变化下更容易学到策略（泛化倾向）。',
      '调算法很容易上头，但真正的瓶颈往往是：仿真环境是否可信、奖励是否忠实。',
    ],
    experiments: [
      { code: '8-8', directory: 'chapter8/prompt-distillation', intent: '把教师模型的行为蒸馏进小模型：理解“用数据写入参数”', difficulty: '★★' },
      { code: '8-17', directory: 'chapter8/premature-completion-dpo', intent: '从“过早结束”bad case 到偏好对/DPO 修复与回归集验证', difficulty: '★★★' },
      { code: '8-18', directory: 'chapter8/curly-quote-sft', intent: '作用域保真 bad case → 合成数据 → LoRA SFT → 回归验证', difficulty: '★★' },
    ],
    learningModes: [
      { id: 'concept-card', title: '概念卡：训练到底在改什么', bullets: ['训练本质是调整“输出分布”', 'SFT 直接提高示范 token 概率；RL 提高高奖励轨迹概率'] },
      { id: 'review-rubric', title: '评审 Rubric：是否该上 RL？', bullets: ['有没有可信评估与仿真环境？', '奖励能否客观验证？会不会 reward hacking？', '是否先用 SFT 把“形”立起来？'] },
      { id: 'diagnosis-card', title: '诊断卡：SFT/RL 失败的常见原因', bullets: ['SFT：覆盖不足导致过拟合', 'RL：奖励不忠实导致投机', '环境：不可复现导致训练噪声'] },
    ],
    tags: ['post-training', 'shape-then-spirit', 'three-layer-verify'],
    microCalc: {
      question: '“先形后神”里，“形”更接近哪一步？（填 1=预训练 2=SFT 3=RL）',
      answer: 2,
      tolerance: 0,
      hint: '书里用 SFT 把输出格式与协议立稳。',
      steps: ['预训练：知识地基', 'SFT：格式/风格/协议（形）', 'RL：策略/泛化（神）'],
    },
  },
  {
    id: 'ch9',
    titleZh: 'Agent 的持续进化',
    titleEn: 'Continual Improvement',
    theme: '把运行经验变成下一版能力：评价、归因、路由、验证、发布、回滚。',
    oneLiner: '保存经历≠从经历中学习；用三层验证与四种更新载体，配合边界集/保留集与最小 diff 回滚。',
    coreConcepts: [
      '保存经历 ≠ 从经历中学习',
      '三层验证：结果 / 过程 / 质量（Rubric）',
      '四种更新载体：经验知识库 / Prompt&Skill / 程序&Harness / 模型参数',
      '边界集（要修）+ 保留集（不能退化）',
      '最小 diff + 可回滚（reversible）',
      '从失败轨迹提取“首个错误步骤”，做可证伪变更契约',
    ],
    stances: [
      '学习必须从“评价”开始：没有可信信号的反思只是猜测。',
      '更新不是“把建议追加进 prompt”，而是路由到最合适载体，并通过回归与灰度门。',
      '所有更新都必须可回滚：用最小 diff 限定影响面。',
    ],
    formulas: [
      { title: '三层验证（从真值到 Rubric）', content: 'Outcome verifier（结果） → Process verifier（过程） → Quality verifier（质量）' },
      { title: '更新路由（载体选择）', content: 'UpdateTarget ∈ {知识库, Prompt/Skill, 程序/Harness, 参数}', note: '同一能力可拆到多个载体：事实→知识库；规则→Skill；硬约束→程序；高维能力→参数。' },
      { title: '发布纪律（口径）', content: '边界集必须改善；保留集不得退化；失败可一键回滚到上版', note: '这是“最小 diff + 可回滚”模式的工程化落地。' },
    ],
    heuristics: [
      '持续进化的输入不是一句抱怨，而是“轨迹+结果+证据”。',
      '验证器不应被修改者触及：安全可信根必须独立。',
      '把经验写成程序（例如门禁/重试策略）通常比继续堆 prompt 更稳定。',
    ],
    experiments: [
      { code: '9-1', directory: 'chapter9/trajectory-verifier', intent: '为轨迹输出结构化诊断：结论+证据+置信度，含幻觉 veto', difficulty: '★★' },
      { code: '9-6', directory: 'chapter9/self-modifying-agent', intent: '失败轨迹触发补丁提案→回归→灰度→回滚：体验“可审计自我修改”', difficulty: '★★★' },
      { code: '9-7', directory: 'chapter9/harness-safety-gate', intent: '用户反馈触发高风险确认门禁提案，安全门独立拒绝/接受', difficulty: '★★★' },
    ],
    learningModes: [
      { id: 'concept-card', title: '概念卡：持续进化不是“反思一次就追加”', bullets: ['先评价，再归因，再路由载体，再验证发布', '边界集+保留集：修 bug 不能把正常功能打碎'] },
      { id: 'review-rubric', title: '评审 Rubric：一次更新是否有发布资格', bullets: ['是否有可回放证据？', '是否声明了最小 diff 与影响预测？', '是否通过边界集+保留集+回滚演练？'] },
      { id: 'diagnosis-card', title: '诊断卡：更新该写在哪一层', bullets: ['事实与例外→经验知识库', '可语言化策略→Prompt/Skill', '可确定执行的约束→程序/Harness', '高维感知与风格→模型参数'] },
    ],
    tags: ['three-layer-verify', 'boundary-set', 'retention-set', 'minimal-diff', 'reversible', 'harness'],
    microCalc: {
      question: '三层验证中，最底层“结果验证”更依赖什么？（填 1=环境真值/工具结果 2=LLM 打分）',
      answer: 1,
      tolerance: 0,
      hint: '越靠下越应依赖确定性真值，只有难以形式化的部分才交给 LLM Rubric。',
      steps: ['结果验证：读数据库/测试/工具返回', '过程验证：检查动作/权限/规则', '质量验证：Rubric 评价表达与策略'],
    },
  },
  {
    id: 'ch10',
    titleZh: '多 Agent 协作',
    titleEn: 'Multi-Agent Collaboration',
    theme: '协作不是“多叫几个人自审”，而是引入新信息与可验证反馈。',
    oneLiner: '多 Agent 的有效性判据：协作过程是否引入单 Agent 生成时无法获得的新信息（执行反馈/视觉反馈/工具验证）。',
    coreConcepts: [
      '两大维度：上下文共享 vs 不共享',
      '三种拓扑：对等协作 / 管理者编排 / 去中心化',
      '通信范式：共享文件系统（共享内存）/ 消息传递（消息总线/参数）',
      '新信息判据（反对同上下文自审神话）',
      '预算与成本：更多步骤/更多 Agent 不自动带来更好结果',
      'Loop 工程：验证器决定是否可以停',
    ],
    stances: [
      '多 Agent 的价值不在“更吵”，而在“引入真实反馈”。',
      '同一上下文里自我审查/辩论通常不引入新信息，等计算量下收益有限。',
      '不共享上下文时，文件系统是数据平面；消息/调度是控制平面（类比操作系统）。',
    ],
    formulas: [
      { title: '多 Agent 有效性判据（一句话）', content: '如果协作没有引入新信息，则效果通常不优于单 Agent 的更长推理。' },
      { title: '协作分类（速记）', content: '共享/隔离 × 对等/管理者/去中心化 = 架构选择矩阵' },
    ],
    heuristics: [
      '“执行反馈/视觉反馈/工具验证”是最常见的新信息来源。',
      '当预算扩大但性能不涨时，往往缺“预算意识”与验证器，而不是缺步骤。',
      '多 Agent 会放大成本：收益必须覆盖额外 token 与工具开销。',
    ],
    experiments: [
      { code: '10-4', directory: 'chapter10/parallel-web-research', intent: '并行研究总线：多 worker 并发抓取，并用验证与级联终止收敛', difficulty: '★★' },
      { code: '10-1', directory: 'chapter10/multi-role-transfer', intent: '共享上下文下：system prompt 切换 vs Skill 追加，对比缓存与权限边界', difficulty: '★★' },
      { code: '10-6', directory: 'chapter10/voice-werewolf', intent: '语音狼人杀：信息权限隔离 + 角色状态机 + 裁判验证', difficulty: '★★★' },
    ],
    learningModes: [
      { id: 'concept-card', title: '概念卡：什么时候真的需要多 Agent', bullets: ['判据：是否引入新信息', '否则：更像“同一个人多想几秒”'] },
      { id: 'review-rubric', title: '评审 Rubric：选拓扑，而不是选“人数”', bullets: ['是否需要中心化调度（Manager）？', '上下文是否必须隔离（权限/成本/并发）？', '验证信号来自哪里（执行/视觉/工具/用户）？'] },
      { id: 'diagnosis-card', title: '诊断卡：多 Agent 失败三件套', bullets: ['信息不同步：缺共享产物或统一状态', '没有验证器：讨论再多也无法判定完成', '成本失控：并发没有预算与终止'] },
    ],
    tags: ['new-info-criterion', 'proposer-reviewer', 'progressive-disclosure', 'append-only', 'filesystem-hub', 'harness'],
    microCalc: {
      question: '“新信息判据”里，“代码执行反馈”算不算新信息？（填 1=算 0=不算）',
      answer: 1,
      tolerance: 0,
      hint: '执行结果在生成代码时不存在，属于环境反馈的新信息。',
      steps: ['生成时没有：编译错误/测试失败/运行时异常', '执行后获得：这就是“新信息”'],
    },
  },
]

export const agentBookDisclaimer = '内容基于李博杰《AI Agent 手册》(github.com/bojieli/ai-agent-book) 的公开章节，仅用于个人学习提炼，不代表原书全部观点。'

export function chapterProgressKey(chapterId: AgentBookChapterId) {
  return `agent-book-${chapterId}`
}

export const agentBookLabIds = [
  'harness-diagnose',
  'kv-cache',
  'status-bar',
  'pass-at-k',
  'new-info-criterion',
  'evolution-router',
] as const

export type AgentBookLabId = typeof agentBookLabIds[number]

export function agentBookLabProgressKey(labId: AgentBookLabId) {
  return `agent-book-lab-${labId}`
}

export const agentBookReviewIds = [
  'refund-rubric',
  'coding-min-tools',
  'multi-agent-topology',
  'kv-cache-scan',
  'post-training-shape',
] as const

export type AgentBookReviewId = typeof agentBookReviewIds[number]

export function agentBookReviewProgressKey(reviewId: AgentBookReviewId) {
  return `agent-book-review-${reviewId}`
}
