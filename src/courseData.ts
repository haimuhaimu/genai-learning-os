export type Track = 'llm' | 'image'

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
}

export const llmChapters: Chapter[] = [
  {
    id: 'llm-token', no: '01', title: 'Tokenization 与词表', subtitle: '模型读到的不是“字”和“词”，而是一串离散 ID',
    concept: '分词器把文本映射为 token ID。词表是模型训练前确定的接口，同一段文本在不同分词器下长度可能不同；中文、代码、罕见字符的压缩率尤其不同。',
    formula: 'text → [t₁, t₂, …, tₙ]，占用率 = n / context_window',
    controls: ['分词器 / 模型版本', '输入语言与格式', '最大输入长度', '截断策略'],
    questions: ['线上计费按字符还是 token？', '中英混输、Emoji、代码的 token 基准测试做了吗？', '截断发生在系统提示、历史还是用户输入？'],
    failures: ['字符数估算 token 导致超窗', '升级模型却沿用旧分词统计', '截断关键指令或 JSON 边界'],
    quiz: { statement: '同样 100 个汉字，在所有 LLM 中都会得到相同数量的 token。', answer: false, explanation: '错误。token 数由具体词表与分词算法决定；模型/版本、语言和文本结构都会改变切分。' },
  },
  {
    id: 'llm-embed', no: '02', title: 'Embedding 与位置编码', subtitle: '把离散 ID 放进连续空间，并保留顺序',
    concept: 'Embedding 是可学习的向量查表；相近用法可能形成相近表示，但它不是固定的人类语义字典。位置编码向模型提供先后、距离或相对位置信息。',
    formula: 'xᵢ = E[tokenᵢ] + P(i)  （示意；具体架构可能采用旋转/相对位置）',
    controls: ['Embedding 模型与维度', '相似度阈值', '切块粒度', '位置外推长度'],
    questions: ['检索向量和生成模型是否语义匹配？', '长文位置性能是否实测？', '相似度阈值如何按场景校准？'],
    failures: ['把向量相似等同事实一致', '切块过大导致主题混杂', '超过训练长度后效果突降'],
    quiz: { statement: 'Embedding 距离近，意味着两段话陈述的事实一定相同。', answer: false, explanation: '错误。向量接近通常只说明表示上的相关或相似，不保证事实、立场或时间一致。' },
  },
  {
    id: 'llm-attention', no: '03', title: 'Transformer 与自注意力', subtitle: 'Q 找什么、K 提供索引、V 携带内容',
    concept: '每个位置产生 Query、Key、Value。Q 与所有 K 的匹配决定权重，再对 V 加权汇总。多头机制可并行学习不同关系；注意力权重不是完整的因果解释。',
    formula: 'Attention(Q,K,V) = softmax(QKᵀ / √dₖ)V',
    controls: ['上下文内容与顺序', '注意力掩码', '模型规模 / 架构', '长上下文策略'],
    questions: ['关键约束离答案有多远？', '是否需要结构化分隔和重复锚点？', '能否用测试集验证长距离依赖？'],
    failures: ['中段信息被忽略', '把热力图当作严格可解释性', '无关上下文稀释关键线索'],
    quiz: { statement: '注意力权重最高的 token，就是模型做出答案的唯一原因。', answer: false, explanation: '错误。权重只是一次信息混合的局部信号，残差、MLP、多层多头共同影响输出。' },
  },
  {
    id: 'llm-pretrain', no: '04', title: 'Next Token 预训练与交叉熵', subtitle: '学习条件概率，而非读取世界真相',
    concept: '自回归预训练反复预测下一个 token，通过海量序列学习统计结构。训练阶段更新参数；推理阶段参数通常固定，只做前向计算与采样。',
    formula: 'L = −Σₜ log pθ(xₜ | x<ₜ)',
    controls: ['训练数据配比', '学习率与批次', '训练 token 数', '推理提示上下文'],
    questions: ['目标能力在训练数据中是否可学习？', '训练、推理配置是否被混为一谈？', '领域知识的新鲜度到哪天？'],
    failures: ['流畅被误判为真实', '数据偏差进入输出', '知识陈旧仍高置信表达'],
    quiz: { statement: '交叉熵更低通常表示模型对训练目标的下一个 token 预测更好。', answer: true, explanation: '正确，但它不自动等于产品任务更好；仍需任务成功率、事实性和安全评估。' },
  },
  {
    id: 'llm-decode', no: '05', title: '解码策略', subtitle: '在“最可能”与“有变化”之间做产品选择',
    concept: 'Temperature 改变分布陡峭度；top-k 只留最高 k 个；top-p 留累计概率达到 p 的最小集合；重复惩罚改变已出现 token 的得分。它们发生在推理采样，不会更新模型。',
    formula: 'pᵢ(T) = exp(zᵢ/T) / Σⱼexp(zⱼ/T)',
    controls: ['temperature', 'top-k / top-p', '重复惩罚', '停止词 / 最大输出'],
    questions: ['场景要确定性还是创意宽度？', '参数组合是否固定并版本化？', '结构化输出失败时如何重试？'],
    failures: ['高温度产生跑题与虚构', '低温度陷入模板化', '强重复惩罚破坏术语和代码'],
    quiz: { statement: '把 temperature 调到 0.2 会让模型获得更多外部知识。', answer: false, explanation: '错误。它只改变已有 logits 的采样分布，不添加训练知识、上下文或检索结果。' },
  },
  {
    id: 'llm-context', no: '06', title: '上下文、KV Cache、RAG 与工具', subtitle: '把有限窗口分给指令、证据、历史和答案',
    concept: '上下文窗口容纳输入和输出。KV Cache 复用已计算的注意力 K/V 以加速自回归推理，但占显存。RAG 把外部文档放入上下文；工具调用让系统执行检索、计算或动作。',
    formula: 'system + history + RAG + user + output ≤ context window',
    controls: ['窗口与输出预算', '切块 / 召回数 / 重排', '缓存策略', '工具 schema 与超时'],
    questions: ['证据如何溯源和过期？', '工具失败、重复调用怎样兜底？', '历史压缩会丢掉哪些约束？'],
    failures: ['召回相关但不支持结论', '工具参数幻觉', 'KV Cache 占用导致并发下降'],
    quiz: { statement: 'RAG 会把检索到的知识永久写进模型参数。', answer: false, explanation: '错误。典型 RAG 在推理时注入外部文本，不更新模型参数；会话结束后也不会自动保留。' },
  },
  {
    id: 'llm-align', no: '07', title: 'SFT、偏好对齐、评估与安全', subtitle: '把“会续写”塑造成“按产品目标行动”',
    concept: 'SFT 用示范学习任务格式；偏好对齐利用人类或模型偏好信号优化行为。离线指标必须配合盲评、红队和线上观测。幻觉是概率生成与证据约束不足的系统性风险。',
    formula: '产品质量 ≠ 单一 loss；需覆盖 helpfulness × factuality × safety × latency',
    controls: ['训练样本与 rubric', '拒答边界', '事实核验 / 引用', '评测集与灰度策略'],
    questions: ['基线、切片和置信区间是什么？', '安全拒答是否误伤正常需求？', '数据闭环会不会放大偏差？'],
    failures: ['只看平均分掩盖长尾', '对齐后能力回退', '评测集污染或与线上错位'],
    quiz: { statement: 'SFT 能保证模型在所有新问题上都不产生幻觉。', answer: false, explanation: '错误。SFT 可改善格式和行为，但无法给开放世界事实性作绝对保证，需要检索、核验和风险治理。' },
  },
]

export const imageChapters: Chapter[] = [
  {
    id: 'img-space', no: '01', title: '生成模型、像素与潜空间', subtitle: '把高维图像压到更可计算的表示中',
    concept: '扩散类生成模型学习从噪声分布逐步得到数据分布。潜空间扩散先由编码器压缩图像，在较低维 latent 中去噪，再解码为像素，通常更省算力。',
    formula: 'image x ↔ latent z；生成：z_T ~ N(0,I) → … → z₀ → x̂',
    controls: ['分辨率 / 宽高比', 'VAE / 表示空间', '基础模型', '批量与精度'],
    questions: ['需求重视纹理还是结构？', '目标分辨率是否位于模型舒适区？', '潜空间压缩会损失什么？'],
    failures: ['高频细节模糊', '超大分辨率构图破碎', '编码解码产生色偏'],
    quiz: { statement: '潜空间扩散通常直接在每个 RGB 像素上完成全部去噪。', answer: false, explanation: '错误。它通常在压缩后的 latent 上去噪，最终再解码到像素空间。' },
  },
  {
    id: 'img-text', no: '02', title: '文本编码器与 Cross Attention', subtitle: '让图像特征在去噪时参考文本条件',
    concept: '文本编码器把提示词变成序列表示；Cross Attention 让图像 latent 的查询与文本键值交互。词语权重、位置和编码器能力会影响条件，但不是精确的场景编译器。',
    formula: 'CrossAttn(Q_image, K_text, V_text)',
    controls: ['提示词内容 / 顺序', '文本编码器长度', '词权重', 'CFG 条件强度'],
    questions: ['主体、关系和风格是否冲突？', '提示是否超过编码长度？', '关键条件能否被结构控制替代？'],
    failures: ['属性绑定错位', '多主体关系混淆', '长提示后半段弱化'],
    quiz: { statement: 'Cross Attention 能保证每个提示词都被像素级准确执行。', answer: false, explanation: '错误。它提供条件关联，不保证组合关系、数量和局部位置精确。' },
  },
  {
    id: 'img-diffusion', no: '03', title: '前向加噪与反向去噪', subtitle: '训练学会预测噪声，推理从噪声开始',
    concept: '训练时对真实样本按时间步加噪，模型学习估计噪声或等价目标；推理时从随机噪声迭代去噪。训练和推理方向相关，但不是同一次过程的倒放。',
    formula: 'xₜ = √ᾱₜ x₀ + √(1−ᾱₜ) ε，ε ~ N(0,I)',
    controls: ['噪声调度', '预测目标', '采样时间步', '初始噪声'],
    questions: ['概念演示还是生产采样？', '训练目标与采样器是否兼容？', '低步数下质量如何退化？'],
    failures: ['早停导致噪点与结构未收敛', '过度去噪损失原图特征', '把演示动画当真实模型输出'],
    quiz: { statement: '推理生成一张图时，模型必须重新训练参数。', answer: false, explanation: '错误。常规推理固定参数，从随机噪声通过多步前向计算得到图像。' },
  },
  {
    id: 'img-sample', no: '04', title: '采样器、步数、Seed 与 CFG', subtitle: '速度、遵循度与自然度的四方权衡',
    concept: '采样器定义反向路径的数值更新方式；步数不是越多越好。Seed 固定初始噪声，利于复现但不保证跨版本一致。CFG 放大有条件与无条件预测之差。',
    formula: 'ε̂ = ε_uncond + s(ε_cond − ε_uncond)',
    controls: ['sampler', 'steps', 'seed', 'CFG scale'],
    questions: ['固定哪些软件与硬件条件才算可复现？', '质量收益是否值得延迟？', '高 CFG 的伪影阈值在哪？'],
    failures: ['高 CFG 过饱和 / 轮廓僵硬', '低步数细节不足', '只固定 seed 却更换模型版本'],
    quiz: { statement: '固定 seed 后，即使更换模型和采样器也一定得到相同图像。', answer: false, explanation: '错误。Seed 只固定随机起点；模型、采样器、尺寸和实现变化都可能改变结果。' },
  },
  {
    id: 'img-prompt', no: '05', title: '提示词与负向提示', subtitle: '先写内容关系，再写视觉语言与约束',
    concept: '有效提示通常包含主体、动作/关系、场景、构图、媒介/风格、光线与质量约束。负向提示用于降低某些特征概率，不是绝对禁止规则。',
    formula: 'prompt = subject + relation + scene + composition + style + light',
    controls: ['正 / 负提示', '关键词权重', '提示模板', '参考样例'],
    questions: ['是缺内容还是关系错？', '负向词是否和正向目标冲突？', '能否把关键约束转成结构输入？'],
    failures: ['形容词堆砌稀释主体', '否定词造成整体风格偏移', '自然语言歧义导致属性串位'],
    quiz: { statement: '负向提示中写“不出现文字”，就能 100% 杜绝图中文字。', answer: false, explanation: '错误。负向提示只是软条件，不能提供硬约束；需要检测、重试或后处理。' },
  },
  {
    id: 'img-control', no: '06', title: 'img2img、重绘、ControlNet 与 LoRA', subtitle: '从软提示升级到图像、区域、结构和风格控制',
    concept: 'img2img 用原图 latent 加噪后重绘；局部重绘配合 mask；ControlNet 类方法引入边缘、姿态等结构条件；LoRA 以低秩增量适配风格/主体。不同方案控制对象不同。',
    formula: 'W′ = W + ΔW，LoRA 常用 ΔW = BA（低秩）',
    controls: ['denoise strength', 'mask / feather', '控制权重', 'LoRA 权重 / 触发词'],
    questions: ['要保留像素、结构还是身份风格？', '控制条件是否相互打架？', 'LoRA 数据授权与泛化如何？'],
    failures: ['高重绘强度偏离原图', '控制权重过高画面僵硬', '多个 LoRA 风格冲突'],
    quiz: { statement: 'ControlNet 与 LoRA 完全等价，都只是给提示词加几个关键词。', answer: false, explanation: '错误。前者通常注入结构条件，后者修改/附加模型权重表示；输入、资产和控制边界不同。' },
  },
  {
    id: 'img-eval', no: '07', title: '评估、一致性、安全与成本', subtitle: '好看只是门槛，交付还要可控、合规、可重复',
    concept: '图像评估要拆为文本遵循、感知质量、身份/风格一致性、文字准确率、安全与业务转化。自动指标不能完全替代人评。版权、肖像、训练数据与输出使用边界需按业务治理。',
    formula: '单位有效图成本 = 单次成本 × 平均尝试数 + 审核 / 后处理成本',
    controls: ['候选数与重试', '一致性资产', 'OCR / 安全审核', '缓存与分辨率'],
    questions: ['失败样本按什么 taxonomy 归因？', '文字是否应交给排版工具？', '来源、授权、审核链路是否可追溯？'],
    failures: ['只挑成功图造成幸存者偏差', '角色跨镜头漂移', '文字乱码、手部异常、审核漏检'],
    quiz: { statement: '只要单张图审美评分高，就足以证明批量生产方案可用。', answer: false, explanation: '错误。生产还需衡量一致性、可控性、合规、延迟、平均尝试数与单位有效图成本。' },
  },
]
