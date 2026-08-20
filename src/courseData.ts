export type Track = 'llm' | 'image'

export type WorkedExample = {
  scenario: string
  steps: string[]
  result: string
  productDecision: string
}

export type MicroExercise = {
  prompt: string
  standardAnswer: number
  tolerance: number
  unit: string
  lowHint: string
  highHint: string
  productConnection: string
}

export type TransferPrompt = {
  title: string
  template: string
}

export type Chapter = {
  id: string
  no: string
  title: string
  subtitle: string
  concept: string
  formula: string
  controls: string[]
  questions: string[]
  failures: string[]
  quiz: { statement: string; answer: boolean; explanation: string }
  prerequisites: string[]
  workedExample: WorkedExample
  microExercise: MicroExercise
  transferPrompt: TransferPrompt
}

export const llmChapters: Chapter[] = [
  {
    id: 'llm-token', no: '01', title: '分词（Tokenization）与词表', subtitle: '模型读到的不是“字”和“词”，而是一串离散 ID（标识符）',
    concept: '分词器把文本映射为 token（模型处理的最小文本单元）ID。词表是模型训练前确定的接口，同一段文本在不同分词器下长度可能不同；中文、代码、罕见字符的压缩率尤其不同。',
    formula: 'text → [t₁, t₂, …, tₙ]，占用率 = n / context_window',
    controls: ['分词器 / 模型版本', '输入语言与格式', '最大输入长度', '截断策略'],
    questions: ['线上计费按字符还是 token？', '中英混输、Emoji（表情符号）、代码的 token 基准测试做了吗？', '截断发生在系统提示、历史还是用户输入？'],
    failures: ['字符数估算 token 导致超窗', '升级模型却沿用旧分词统计', '截断关键指令或 JSON（结构化数据格式）边界'],
    quiz: { statement: '同样 100 个汉字，在所有大语言模型（LLM）中都会得到相同数量的 token。', answer: false, explanation: '错误。token 数由具体词表与分词算法决定；模型/版本、语言和文本结构都会改变切分。' },
    prerequisites: ['能区分字符、token 与 token ID', '知道上下文窗口同时容纳输入和输出', '能计算“已用量 ÷ 总容量”的百分比'],
    workedExample: { scenario: '客服摘要请求含 1,240 个输入 token，预留 760 个输出 token，窗口为 4,096。', steps: ['总占用 = 1,240 + 760 = 2,000 token', '占用率 = 2,000 ÷ 4,096 × 100%', '结果约为 48.8%'], result: '仍余 2,096 token，可容纳检索证据或历史。', productDecision: '不要按字符预算；按目标模型的真实分词结果设置截断与告警。' },
    microExercise: { prompt: '窗口 4,096 token，输入 1,536，预留输出 512。总占用率是多少？', standardAnswer: 50, tolerance: 0.1, unit: '%', lowHint: '结果偏低：检查是否漏加输出预算，或忘记乘 100%。', highHint: '结果偏高：分母应是完整上下文窗口 4,096。', productConnection: '占用率决定还能注入多少历史与检索证据，也决定何时触发压缩或截断。' },
    transferPrompt: { title: '上下文预算评审模板', template: '【场景】\n目标模型/分词器版本：___\nP50（中位数）/ P95（第 95 百分位）token：___ / ___\n预留输出 token：___\n上下文窗口：___\n占用率与安全余量：___\n截断优先级（系统/历史/证据/用户）：___\n超窗时的产品兜底：___' },
  },
  {
    id: 'llm-embed', no: '02', title: '向量嵌入（Embedding）与位置编码', subtitle: '把离散 ID 放进连续空间，并保留顺序',
    concept: '向量嵌入是可学习的向量查表；相近用法可能形成相近表示，但它不是固定的人类语义字典。位置编码向模型提供先后、距离或相对位置信息。',
    formula: 'xᵢ = E[tokenᵢ] + P(i)（示意；具体架构可能采用旋转/相对位置）',
    controls: ['Embedding 模型与维度', '相似度阈值', '切块粒度', '位置外推长度'],
    questions: ['检索向量和生成模型是否语义匹配？', '长文位置性能是否实测？', '相似度阈值如何按场景校准？'],
    failures: ['把向量相似等同事实一致', '切块过大导致主题混杂', '超过训练长度后效果突降'],
    quiz: { statement: '向量嵌入距离近，意味着两段话陈述的事实一定相同。', answer: false, explanation: '错误。向量接近通常只说明表示上的相关或相似，不保证事实、立场或时间一致。' },
    prerequisites: ['知道向量可用于表示文本', '理解切块会影响检索粒度', '会使用向上取整处理不足一整块的尾部'],
    workedExample: { scenario: '1,300 token 文档按 400 token 切块，相邻块重叠 100 token。', steps: ['有效步长 = 400 − 100 = 300', '块数 = ⌈(1,300 − 400) ÷ 300⌉ + 1', '块数 = 4'], result: '索引产生 4 个向量块。', productDecision: '重叠能保留边界语义，但会增加索引量、召回重复和成本。' },
    microExercise: { prompt: '1,800 token 文档按 400 token 切块，重叠 100 token，需要多少块？', standardAnswer: 6, tolerance: 0, unit: '块', lowHint: '结果偏低：尾部不足 400 token 仍需要单独一块，请向上取整。', highHint: '结果偏高：第一块覆盖 400 token，之后每块只向前推进 300 token。', productConnection: '块数直接影响向量存储、召回延迟与重复证据比例。' },
    transferPrompt: { title: '检索切块迁移模板', template: '【知识库】___\n文档长度分布：___\n块大小 / 重叠：___ / ___\n预计每文档块数：___\nEmbedding（向量嵌入）模型与版本：___\n相似度阈值校准集：___\n产品取舍（召回/延迟/成本）：___' },
  },
  {
    id: 'llm-attention', no: '03', title: 'Transformer（变换器）与自注意力', subtitle: 'Q（查询）找什么、K（键）提供索引、V（值）携带内容',
    concept: '每个位置产生 Query（查询）、Key（键）、Value（值）。Q 与所有 K 的匹配决定权重，再对 V 加权汇总。多头机制可并行学习不同关系；注意力权重不是完整的因果解释。',
    formula: 'Attention(Q,K,V) = softmax(QKᵀ / √dₖ)V',
    controls: ['上下文内容与顺序', '注意力掩码', '模型规模 / 架构', '长上下文策略'],
    questions: ['关键约束离答案有多远？', '是否需要结构化分隔和重复锚点？', '能否用测试集验证长距离依赖？'],
    failures: ['中段信息被忽略', '把热力图当作严格可解释性', '无关上下文稀释关键线索'],
    quiz: { statement: '注意力权重最高的 token，就是模型做出答案的唯一原因。', answer: false, explanation: '错误。权重只是一次信息混合的局部信号，残差、多层感知机（MLP）、多层多头共同影响输出。' },
    prerequisites: ['理解分数越大通常代表匹配越强', '知道 softmax（归一化指数函数）把分数变成概率', '会计算指数与百分比'],
    workedExample: { scenario: '某查询对两条证据的缩放后分数为 2 和 1。', steps: ['高分证据权重 = e² ÷ (e² + e¹)', '约等于 7.39 ÷ 10.11', '权重约为 73.1%'], result: '高分证据占主要权重，但低分证据仍贡献约 26.9%。', productDecision: '无关上下文并非完全无影响；应减少噪声证据而非只堆窗口。' },
    microExercise: { prompt: '两条证据的缩放后分数为 3 和 1，高分证据的 softmax 权重是多少？', standardAnswer: 88.1, tolerance: 0.2, unit: '%', lowHint: '结果偏低：请用 e³/(e³+e¹)，不要直接算 3/(3+1)。', highHint: '结果偏高：另一条证据权重不为零，分母需要包含两项。', productConnection: '权重集中度帮助判断检索噪声是否会稀释关键指令，但不能当作因果解释。' },
    transferPrompt: { title: '上下文降噪评审模板', template: '【任务】___\n必须关注的约束：___\n可能竞争注意力的内容：___\n证据排序与分隔方式：___\n长距离依赖测试：___\n失败切片：中段遗漏 / 指令冲突 / 噪声稀释\n上线决策：___' },
  },
  {
    id: 'llm-pretrain', no: '04', title: '下一个 Token 预训练与交叉熵', subtitle: '学习条件概率，而非读取世界真相',
    concept: '自回归预训练反复预测下一个 token，通过海量序列学习统计结构。训练阶段更新参数；推理阶段参数通常固定，只做前向计算与采样。',
    formula: 'L = −Σₜ log pθ(xₜ | x<ₜ)',
    controls: ['训练数据配比', '学习率与批次', '训练 token 数', '推理提示上下文'],
    questions: ['目标能力在训练数据中是否可学习？', '训练、推理配置是否被混为一谈？', '领域知识的新鲜度到哪天？'],
    failures: ['流畅被误判为真实', '数据偏差进入输出', '知识陈旧仍高置信表达'],
    quiz: { statement: '交叉熵更低通常表示模型对训练目标的下一个 token 预测更好。', answer: true, explanation: '正确，但它不自动等于产品任务更好；仍需任务成功率、事实性和安全评估。' },
    prerequisites: ['知道概率在 0 到 1 之间', '理解损失越低通常越贴近训练目标', '会用 e 的幂计算困惑度'],
    workedExample: { scenario: '验证集平均交叉熵为 0.69。', steps: ['困惑度 = exp(交叉熵)', 'exp(0.69) ≈ 1.99', '可近似理解为每步在约 2 个等概率选项中选择'], result: '困惑度约为 2.0。', productDecision: '困惑度只能比较同分词口径下的语言建模表现，不能替代业务评测。' },
    microExercise: { prompt: '验证集平均交叉熵为 1.10，困惑度 exp(1.10) 约是多少？', standardAnswer: 3, tolerance: 0.05, unit: '', lowHint: '结果偏低：这里使用自然指数 exp(L)，不是直接取损失值。', highHint: '结果偏高：确认没有使用 10 为底的指数。', productConnection: '模型选择不能只按训练损失排序，还要同时验证事实性、成功率与延迟。' },
    transferPrompt: { title: '训练指标到产品指标模板', template: '【模型/版本】___\n训练目标：___\n验证交叉熵 / 困惑度：___ / ___\n同口径基线：___\n业务成功率：___\n事实性 / 安全切片：___\n是否上线及理由：___' },
  },
  {
    id: 'llm-decode', no: '05', title: '解码策略', subtitle: '在“最可能”与“有变化”之间做产品选择',
    concept: 'Temperature（温度）改变分布陡峭度；top-k（最高 k 项）只留最高 k 个；top-p（累计概率阈值）留累计概率达到 p 的最小集合；重复惩罚改变已出现 token 的得分。它们发生在推理采样，不会更新模型。',
    formula: 'pᵢ(T) = exp(zᵢ/T) / Σⱼexp(zⱼ/T)',
    controls: ['temperature', 'top-k / top-p', '重复惩罚', '停止词 / 最大输出'],
    questions: ['场景要确定性还是创意宽度？', '参数组合是否固定并版本化？', '结构化输出失败时如何重试？'],
    failures: ['高温度产生跑题与虚构', '低温度陷入模板化', '强重复惩罚破坏术语和代码'],
    quiz: { statement: '把 temperature 调到 0.2 会让模型获得更多外部知识。', answer: false, explanation: '错误。它只改变已有 logits（未归一化分数）的采样分布，不添加训练知识、上下文或检索结果。' },
    prerequisites: ['知道 logits 是采样前的模型分数', '理解温度缩放发生在 softmax 之前', '会计算两项概率的优势比'],
    workedExample: { scenario: '两个候选 token 的 logit 差为 1，温度 T=0.5。', steps: ['缩放后的分数差 = 1 ÷ 0.5 = 2', '优势比 = exp(2)', '优势比约为 7.39 : 1'], result: '降温后高分 token 更占优势，输出更稳定。', productDecision: '事实问答优先低随机性；创意场景可提高温度，但需配套筛选与重试预算。' },
    microExercise: { prompt: '两个 token 的 logit 差为 0.8，温度 T=0.4，高分 token 的优势比约是多少？', standardAnswer: 7.39, tolerance: 0.05, unit: ':1', lowHint: '结果偏低：先算 0.8 ÷ 0.4，再对结果取 exp。', highHint: '结果偏高：不要把温度乘到 logit 差上。', productConnection: '优势比变化说明温度是稳定性与多样性的产品旋钮，而不是知识开关。' },
    transferPrompt: { title: '解码参数决策模板', template: '【场景】___\n确定性要求：高 / 中 / 低\ntemperature / top-p / top-k：___ / ___ / ___\n结构化输出约束：___\n失败重试规则：___\n质量、延迟与成本观测：___\n参数版本：___' },
  },
  {
    id: 'llm-context', no: '06', title: '上下文、键值缓存与检索增强生成', subtitle: '把有限窗口分给指令、证据、历史和答案',
    concept: '键值缓存（KV Cache）复用已计算的注意力 K/V 以加速自回归推理，但占显存。检索增强生成（RAG）把外部文档放入上下文；工具调用让系统执行检索、计算或动作。',
    formula: 'system + history + RAG + user + output ≤ context window',
    controls: ['窗口与输出预算', '切块 / 召回数 / 重排', '缓存策略', '工具 schema（结构定义）与超时'],
    questions: ['证据如何溯源和过期？', '工具失败、重复调用怎样兜底？', '历史压缩会丢掉哪些约束？'],
    failures: ['召回相关但不支持结论', '工具参数幻觉', 'KV Cache 占用导致并发下降'],
    quiz: { statement: 'RAG 会把检索到的知识永久写进模型参数。', answer: false, explanation: '错误。典型 RAG 在推理时注入外部文本，不更新模型参数；会话结束后也不会自动保留。' },
    prerequisites: ['能列出系统提示、历史、证据、用户输入和输出预算', '知道上下文窗口是共享总预算', '会做整数加减'],
    workedExample: { scenario: '8,192 token 窗口中，系统提示 900、历史 2,400、证据 2,000、输出预留 1,000。', steps: ['已承诺预算 = 900 + 2,400 + 2,000 + 1,000', '总计 6,300 token', '剩余 = 8,192 − 6,300 = 1,892 token'], result: '用户输入与安全余量合计最多 1,892 token。', productDecision: '必须先分配输出和安全余量，再决定召回数量，避免证据挤掉用户问题。' },
    microExercise: { prompt: '8,192 token 窗口，系统 900、历史 2,200、证据 1,800、输出 1,000，还剩多少 token？', standardAnswer: 2292, tolerance: 0, unit: 'token', lowHint: '结果偏低：检查是否重复扣除了某一项。', highHint: '结果偏高：系统、历史、证据和输出预留都要从窗口扣除。', productConnection: '剩余预算决定用户输入上限、召回数和是否需要压缩历史。' },
    transferPrompt: { title: 'RAG 上下文配额模板', template: '【窗口总量】___\n系统提示：___\n对话历史：___\nRAG（检索增强生成）证据：___\n用户输入 P95：___\n输出预留：___\n安全余量：___\n超限时压缩/截断顺序：___' },
  },
  {
    id: 'llm-align', no: '07', title: '监督微调、偏好对齐、评估与安全', subtitle: '把“会续写”塑造成“按产品目标行动”',
    concept: '监督微调（SFT）用示范学习任务格式；偏好对齐利用人类或模型偏好信号优化行为。离线指标必须配合盲评、红队和线上观测。幻觉是概率生成与证据约束不足的系统性风险。',
    formula: '产品质量 ≠ 单一 loss；需覆盖 helpfulness × factuality × safety × latency',
    controls: ['训练样本与 rubric（评分规则）', '拒答边界', '事实核验 / 引用', '评测集与灰度策略'],
    questions: ['基线、切片和置信区间是什么？', '安全拒答是否误伤正常需求？', '数据闭环会不会放大偏差？'],
    failures: ['只看平均分掩盖长尾', '对齐后能力回退', '评测集污染或与线上错位'],
    quiz: { statement: 'SFT 能保证模型在所有新问题上都不产生幻觉。', answer: false, explanation: '错误。SFT 可改善格式和行为，但无法给开放世界事实性作绝对保证，需要检索、核验和风险治理。' },
    prerequisites: ['能区分训练指标与业务指标', '知道通过率 = 通过样本数 ÷ 总样本数', '理解评测必须按风险切片'],
    workedExample: { scenario: '500 条盲评中 420 条通过，其中高风险切片仅 36/50 通过。', steps: ['总体通过率 = 420 ÷ 500 = 84%', '高风险通过率 = 36 ÷ 50 = 72%', '切片比总体低 12 个百分点'], result: '平均分合格，但高风险场景明显落后。', productDecision: '上线门槛应包含高风险切片否决条件，不能只看总体平均。' },
    microExercise: { prompt: '400 条盲评中 342 条通过，总体通过率是多少？', standardAnswer: 85.5, tolerance: 0.1, unit: '%', lowHint: '结果偏低：计算 342 ÷ 400 后要乘 100%。', highHint: '结果偏高：分母应包含全部 400 条样本，而非只含失败之外的子集。', productConnection: '通过率是上线基线，还应搭配高风险切片、置信区间和安全否决项。' },
    transferPrompt: { title: '模型上线评审模板', template: '【版本】___\n总体通过率与样本量：___\n关键切片通过率：___\n事实性 / 安全 / 延迟：___\n相对基线变化：___\n否决阈值与回滚条件：___\n评审人结论：___' },
  },
]

export const imageChapters: Chapter[] = [
  {
    id: 'img-space', no: '01', title: '生成模型、像素与潜空间', subtitle: '把高维图像压到更可计算的表示中',
    concept: '扩散类生成模型学习从噪声分布逐步得到数据分布。潜空间扩散先由编码器压缩图像，在较低维 latent（潜变量）中去噪，再解码为像素，通常更省算力。',
    formula: 'image x ↔ latent z；生成：z_T ~ N(0,I) → … → z₀ → x̂',
    controls: ['分辨率 / 宽高比', '变分自编码器（VAE）/ 表示空间', '基础模型', '批量与精度'],
    questions: ['需求重视纹理还是结构？', '目标分辨率是否位于模型舒适区？', '潜空间压缩会损失什么？'],
    failures: ['高频细节模糊', '超大分辨率构图破碎', '编码解码产生色偏'],
    quiz: { statement: '潜空间扩散通常直接在每个 RGB（红绿蓝）像素上完成全部去噪。', answer: false, explanation: '错误。它通常在压缩后的 latent 上去噪，最终再解码到像素空间。' },
    prerequisites: ['知道彩色图像通常有红绿蓝三个通道', '能计算张量元素数量', '理解压缩比 = 原元素数 ÷ 压缩后元素数'],
    workedExample: { scenario: '1,024×1,024×3 的像素张量压缩为 128×128×4 的潜变量。', steps: ['像素元素 = 1,024² × 3 = 3,145,728', '潜变量元素 = 128² × 4 = 65,536', '压缩比 = 3,145,728 ÷ 65,536 = 48'], result: '表示元素数量约缩小 48 倍。', productDecision: '潜空间显著节省计算，但小字、纹理等高频细节可能成为质量短板。' },
    microExercise: { prompt: '768×768×3 压缩为 96×96×4，元素数量压缩比是多少？', standardAnswer: 48, tolerance: 0, unit: '倍', lowHint: '结果偏低：分子需要包含三个 RGB 通道。', highHint: '结果偏高：潜变量也有 4 个通道，不能只算空间尺寸。', productConnection: '压缩比帮助估算算力收益，也提示哪些细节需要放大、修复或像素空间后处理。' },
    transferPrompt: { title: '图像表示选型模板', template: '【目标画面】___\n输出尺寸 / 宽高比：___\n像素元素量：___\n潜变量尺寸与通道：___\n压缩比：___\n不可损失的细节：___\n放大/后处理方案：___' },
  },
  {
    id: 'img-text', no: '02', title: '文本编码器与交叉注意力', subtitle: '让图像特征在去噪时参考文本条件',
    concept: '文本编码器把提示词变成序列表示；交叉注意力（Cross Attention）让图像 latent 的查询与文本键值交互。词语权重、位置和编码器能力会影响条件，但不是精确的场景编译器。',
    formula: 'CrossAttn(Q_image, K_text, V_text)',
    controls: ['提示词内容 / 顺序', '文本编码器长度', '词权重', '无分类器引导（CFG）条件强度'],
    questions: ['主体、关系和风格是否冲突？', '提示是否超过编码长度？', '关键条件能否被结构控制替代？'],
    failures: ['属性绑定错位', '多主体关系混淆', '长提示后半段弱化'],
    quiz: { statement: '交叉注意力能保证每个提示词都被像素级准确执行。', answer: false, explanation: '错误。它提供条件关联，不保证组合关系、数量和局部位置精确。' },
    prerequisites: ['知道文本编码器有最大 token 长度', '理解超出上限的内容可能被截断或弱化', '会计算使用率百分比'],
    workedExample: { scenario: '文本编码器上限 77 token，提示词占 60 token。', steps: ['使用率 = 60 ÷ 77 × 100%', '使用率约为 77.9%', '剩余容量 = 77 − 60 = 17 token'], result: '仍有 17 token 余量，但继续堆词会增加条件冲突。', productDecision: '先保留主体、关系和构图；弱价值风格词应删减，而非占满编码长度。' },
    microExercise: { prompt: '上限 77 token，提示词使用 68 token，使用率是多少？', standardAnswer: 88.3, tolerance: 0.2, unit: '%', lowHint: '结果偏低：请用 68 ÷ 77，而不是用剩余 9 token 作分子。', highHint: '结果偏高：分母是编码器上限 77。', productConnection: '高使用率会缩小关键约束的表达空间，应通过结构控制替代冗长描述。' },
    transferPrompt: { title: '提示条件审查模板', template: '【目标】___\n主体：___\n关系/动作：___\n构图：___\n风格/光线：___\n已用 token / 上限：___ / ___\n冲突或弱价值词：___\n可改用结构控制的条件：___' },
  },
  {
    id: 'img-diffusion', no: '03', title: '前向加噪与反向去噪', subtitle: '训练学会预测噪声，推理从噪声开始',
    concept: '训练时对真实样本按时间步加噪，模型学习估计噪声或等价目标；推理时从随机噪声迭代去噪。训练和推理方向相关，但不是同一次过程的倒放。',
    formula: 'xₜ = √ᾱₜ x₀ + √(1−ᾱₜ) ε，ε ~ N(0,I)',
    controls: ['噪声调度', '预测目标', '采样时间步', '初始噪声'],
    questions: ['概念演示还是生产采样？', '训练目标与采样器是否兼容？', '低步数下质量如何退化？'],
    failures: ['早停导致噪点与结构未收敛', '过度去噪损失原图特征', '把演示动画当真实模型输出'],
    quiz: { statement: '推理生成一张图时，模型必须重新训练参数。', answer: false, explanation: '错误。常规推理固定参数，从随机噪声通过多步前向计算得到图像。' },
    prerequisites: ['知道 ᾱ 表示累计信号保留比例', '会计算平方根', '能区分训练加噪与推理去噪'],
    workedExample: { scenario: '某时间步 ᾱₜ = 0.64。', steps: ['信号系数 = √0.64 = 0.8', '噪声系数 = √(1−0.64) = √0.36', '噪声系数 = 0.6'], result: '该步按系数 0.8 混合原信号、0.6 混合噪声。', productDecision: '时间步与噪声调度决定学习难度；产品侧要关注采样器兼容性与低步数退化。' },
    microExercise: { prompt: '若 ᾱₜ = 0.81，噪声系数 √(1−ᾱₜ) 是多少百分比？', standardAnswer: 43.6, tolerance: 0.2, unit: '%', lowHint: '结果偏低：先算 1−0.81=0.19，再开平方，不是直接使用 19%。', highHint: '结果偏高：需要对 0.19 开平方，而不是对 0.81 开平方。', productConnection: '噪声强度影响原结构保留和生成自由度，是重绘与采样策略的基础。' },
    transferPrompt: { title: '扩散过程实验模板', template: '【模型/任务】___\n噪声调度：___\n采样时间步：___\n信号/噪声系数：___ / ___\n低步数质量变化：___\n结构保留要求：___\n可接受延迟：___' },
  },
  {
    id: 'img-sample', no: '04', title: '采样器、步数、随机种子与引导强度', subtitle: '速度、遵循度与自然度的四方权衡',
    concept: '采样器定义反向路径的数值更新方式；步数不是越多越好。随机种子（Seed）固定初始噪声，利于复现但不保证跨版本一致。无分类器引导（CFG）放大有条件与无条件预测之差。',
    formula: 'ε̂ = ε_uncond + s(ε_cond − ε_uncond)',
    controls: ['sampler（采样器）', 'steps（步数）', 'seed', 'CFG scale（引导强度）'],
    questions: ['固定哪些软件与硬件条件才算可复现？', '质量收益是否值得延迟？', '高 CFG 的伪影阈值在哪？'],
    failures: ['高 CFG 过饱和 / 轮廓僵硬', '低步数细节不足', '只固定 seed 却更换模型版本'],
    quiz: { statement: '固定 seed 后，即使更换模型和采样器也一定得到相同图像。', answer: false, explanation: '错误。Seed 只固定随机起点；模型、采样器、尺寸和实现变化都可能改变结果。' },
    prerequisites: ['理解步数通常近似线性影响延迟', '知道固定 seed 只控制随机起点', '会做小数乘法'],
    workedExample: { scenario: '单步耗时 0.18 秒，采样 24 步。', steps: ['采样延迟 = 单步耗时 × 步数', '0.18 × 24 = 4.32 秒', '尚未包含解码、审核和传输'], result: '纯采样延迟约 4.32 秒。', productDecision: '增加步数前应验证质量边际收益；交互产品还需为解码和安全审核留预算。' },
    microExercise: { prompt: '单步耗时 0.18 秒，采样 28 步，纯采样延迟是多少？', standardAnswer: 5.04, tolerance: 0.01, unit: '秒', lowHint: '结果偏低：确认使用了全部 28 步，而不是沿用示例的 24 步。', highHint: '结果偏高：这里只计算纯采样，不额外加入未提供的固定耗时。', productConnection: '步数换来的质量必须与首屏等待、超时率和单位生成成本一起评审。' },
    transferPrompt: { title: '采样配置决策模板', template: '【模型/采样器版本】___\nsteps / CFG / seed：___ / ___ / ___\n单步耗时 / 总采样耗时：___ / ___\n质量边际收益：___\n高 CFG 伪影阈值：___\n复现所需完整环境：___' },
  },
  {
    id: 'img-prompt', no: '05', title: '提示词与负向提示', subtitle: '先写内容关系，再写视觉语言与约束',
    concept: '有效提示通常包含主体、动作/关系、场景、构图、媒介/风格、光线与质量约束。负向提示用于降低某些特征概率，不是绝对禁止规则。',
    formula: 'prompt = subject + relation + scene + composition + style + light',
    controls: ['正 / 负提示', '关键词权重', '提示模板', '参考样例'],
    questions: ['是缺内容还是关系错？', '负向词是否和正向目标冲突？', '能否把关键约束转成结构输入？'],
    failures: ['形容词堆砌稀释主体', '否定词造成整体风格偏移', '自然语言歧义导致属性串位'],
    quiz: { statement: '负向提示中写“不出现文字”，就能 100% 杜绝图中文字。', answer: false, explanation: '错误。负向提示只是软条件，不能提供硬约束；需要检测、重试或后处理。' },
    prerequisites: ['能把提示拆为主体、关系、场景与风格', '知道负向提示是概率约束而非硬规则', '会用比例估算批量失败数'],
    workedExample: { scenario: '20 条提示，每条生成 4 个候选；含错误文字的比例为 15%。', steps: ['候选总数 = 20 × 4 = 80', '预计错误数 = 80 × 15%', '预计为 12 张'], result: '仅靠负向提示仍可能产生约 12 张错误候选。', productDecision: '对文字等硬约束应增加检测、重试，或把文字交给排版工具。' },
    microExercise: { prompt: '30 条提示，每条 3 个候选，预计 20% 属性绑定错误，约有多少张错误候选？', standardAnswer: 18, tolerance: 0, unit: '张', lowHint: '结果偏低：先计算 30×3=90 张总候选，再乘失败率。', highHint: '结果偏高：20% 应换算为 0.2，而不是乘 20。', productConnection: '预计失败量决定审核工作量，也决定是否应从软提示升级为结构控制。' },
    transferPrompt: { title: '批量提示质量模板', template: '【批次目标】___\n主体 / 关系 / 场景：___\n构图 / 风格 / 光线：___\n负向提示：___\n候选总数：___\n历史失败率 / 预计失败量：___ / ___\n检测、重试或后处理：___' },
  },
  {
    id: 'img-control', no: '06', title: '图生图、重绘、结构控制与低秩适配', subtitle: '从软提示升级到图像、区域、结构和风格控制',
    concept: '图生图（img2img）用原图 latent 加噪后重绘；局部重绘配合 mask（遮罩）；ControlNet（结构条件控制网络）引入边缘、姿态等条件；低秩适配（LoRA）以低秩增量适配风格/主体。不同方案控制对象不同。',
    formula: 'W′ = W + ΔW，LoRA 常用 ΔW = BA（低秩）',
    controls: ['denoise strength（重绘强度）', 'mask / feather（遮罩 / 羽化）', '控制权重', 'LoRA 权重 / 触发词'],
    questions: ['要保留像素、结构还是身份风格？', '控制条件是否相互打架？', 'LoRA 数据授权与泛化如何？'],
    failures: ['高重绘强度偏离原图', '控制权重过高画面僵硬', '多个 LoRA 风格冲突'],
    quiz: { statement: 'ControlNet 与 LoRA 完全等价，都只是给提示词加几个关键词。', answer: false, explanation: '错误。前者通常注入结构条件，后者修改/附加模型权重表示；输入、资产和控制边界不同。' },
    prerequisites: ['知道重绘强度越高通常改动越大', '能区分像素、区域、结构和风格控制', '会计算剩余比例'],
    workedExample: { scenario: '图生图重绘强度设为 0.40，用 1−强度估算原结构保留。', steps: ['估算保留率 = 1 − 0.40', '保留率 = 0.60', '换算为 60%'], result: '粗略预期保留约 60% 原结构。', productDecision: '这是参数直觉而非质量保证；身份或版式等硬要求仍需结构条件与评测。' },
    microExercise: { prompt: '重绘强度为 0.65，按 1−强度粗略估算原结构保留率是多少？', standardAnswer: 35, tolerance: 0.1, unit: '%', lowHint: '结果偏低：先算 1−0.65，再换算百分比。', highHint: '结果偏高：题目问保留率，不是重绘强度本身。', productConnection: '保留率直觉帮助选择 img2img、局部重绘或结构控制，避免只靠提示词反复抽卡。' },
    transferPrompt: { title: '图像控制选型模板', template: '【必须保持】像素 / 区域 / 结构 / 身份 / 风格\n输入资产：___\n选择：img2img / 重绘 / ControlNet / LoRA\n强度或权重：___\n估算保留率：___\n冲突控制项：___\n授权与失败兜底：___' },
  },
  {
    id: 'img-eval', no: '07', title: '评估、一致性、安全与成本', subtitle: '好看只是门槛，交付还要可控、合规、可重复',
    concept: '图像评估要拆为文本遵循、感知质量、身份/风格一致性、文字准确率、安全与业务转化。自动指标不能完全替代人评。光学字符识别（OCR）可检查文字，但仍需按业务治理来源、授权和审核链路。',
    formula: '单位有效图成本 = 单次成本 ÷ 成功率 + 审核 / 后处理成本',
    controls: ['候选数与重试', '一致性资产', 'OCR / 安全审核', '缓存与分辨率'],
    questions: ['失败样本按什么 taxonomy（分类体系）归因？', '文字是否应交给排版工具？', '来源、授权、审核链路是否可追溯？'],
    failures: ['只挑成功图造成幸存者偏差', '角色跨镜头漂移', '文字乱码、手部异常、审核漏检'],
    quiz: { statement: '只要单张图审美评分高，就足以证明批量生产方案可用。', answer: false, explanation: '错误。生产还需衡量一致性、可控性、合规、延迟、平均尝试数与单位有效图成本。' },
    prerequisites: ['理解成功率决定平均重试次数', '会用单次成本 ÷ 成功率估算有效产出成本', '知道审核和后处理也计入成本'],
    workedExample: { scenario: '单次生成 0.12 元，成功率 25%，每张有效图审核与后处理 0.18 元。', steps: ['平均生成成本 = 0.12 ÷ 0.25 = 0.48 元', '加审核后处理 0.18 元', '单位有效图成本 = 0.66 元'], result: '每张可交付图片平均成本 0.66 元。', productDecision: '提升一次成功率往往比单纯压低单次推理价格更能降低总成本。' },
    microExercise: { prompt: '单次生成 0.16 元，成功率 40%，审核后处理 0.12 元，单位有效图成本是多少？', standardAnswer: 0.52, tolerance: 0.01, unit: '元', lowHint: '结果偏低：生成成本要除以成功率，再加审核后处理成本。', highHint: '结果偏高：40% 应换算为 0.4，不是 0.04。', productConnection: '单位有效图成本把模型价格、失败率和人工链路统一到可比较的产品指标。' },
    transferPrompt: { title: '批量图像交付评审模板', template: '【批量场景】___\n单次成本 / 成功率：___ / ___\n平均生成成本：___\n审核与后处理成本：___\n单位有效图成本：___\n质量/一致性/文字/安全门槛：___\n上线、灰度或回滚结论：___' },
  },
]
