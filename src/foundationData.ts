export interface FoundationNode {
  id: string
  code: string
  title: string
  phase: 'A' | 'B' | 'C' | 'D'
  prerequisite?: string
  next?: string
  intuition: string
  decision: string
  formula: string
  variables: string[]
  misconception: string
  handCalc: { question: string; hint: string; answer: number; tolerance: number; steps: string[] }
  experiment: string
  expected: string
  diagnosis: { symptom: string; cause: string; inspect: string; verify: string }
  review: string
  rubric: string[]
  related: string[]
  distillModule?: string
}

export const foundationNodes: FoundationNode[] = [
  {
    id: 'probability', code: 'F01', title: '概率与分布', phase: 'A', next: 'softmax',
    intuition: '概率分布是模型对多个可能结果分配的有限信任预算。', decision: '判断输出是高置信、犹豫还是分布漂移，而不是只看 Top-1。',
    formula: 'Σᵢ pᵢ = 1，且 0 ≤ pᵢ ≤ 1；H(P) = −Σᵢ pᵢ log pᵢ',
    variables: ['pᵢ：第 i 个结果的概率，标量', 'P：长度为 K 的类别分布', 'H：熵，单位取决于 log 底数'], misconception: '概率不是“真实性”；高置信也可能稳定地错。',
    handCalc: { question: '分布 [0.5, 0.3, 0.2] 中，前两类概率之和是多少？', hint: '把对应概率直接相加。', answer: 0.8, tolerance: 0.001, steps: ['定位前两类：0.5 与 0.3', '相加：0.5 + 0.3', '得到 0.8，且总和仍不超过 1'] },
    experiment: 'softmax-ce', expected: 'logits 差距缩小时，分布更平、熵更高。',
    diagnosis: { symptom: '线上置信度突然整体升高', cause: '温度、校准或数据分布变化', inspect: '对比 entropy、max_prob、校准曲线与版本', verify: '固定样本回放后分布恢复且 ECE 下降' },
    review: '方案只报 Top-1 准确率，是否足以支持高风险自动决策？', rubric: ['指出置信度不等于正确率', '要求分桶校准与关键切片', '给出阈值、拒答或人工兜底'], related: ['LLM', 'Agent', '蒸馏'],
  },
  {
    id: 'softmax', code: 'F02', title: 'Logits / Softmax', phase: 'A', prerequisite: 'probability', next: 'cross-entropy',
    intuition: 'logits 是未归一化分数，Softmax 把相对差距变成概率竞争。', decision: '理解温度、采样和分类阈值到底改变了什么。',
    formula: 'pᵢ = exp(zᵢ/T) / Σⱼ exp(zⱼ/T)', variables: ['zᵢ：类别 i 的 logit', 'T：温度，必须 > 0', 'pᵢ：归一化概率'], misconception: '给所有 logits 加同一常数不会改变 Softmax；logit 本身不是概率。',
    handCalc: { question: '两个 logits 都是 0，T=1 时第一类概率是多少？', hint: 'exp(0)=1，两项完全相同。', answer: 0.5, tolerance: 0.001, steps: ['计算 exp(0)=1', '分母为 1+1=2', '第一类概率为 1/2=0.5'] },
    experiment: 'softmax-ce', expected: 'T 升高会压平概率但不改变 argmax。', diagnosis: { symptom: '概率出现 NaN', cause: '直接 exp 大 logit 溢出或 T 接近 0', inspect: '检查 max-logit 稳定化与 T clamp', verify: '极端 logits 下概率有限且总和为 1' },
    review: '为什么“把温度从 1 调到 0.2”不等于模型能力提升？', rubric: ['说明只改变分布锐度', '区分排序与校准', '要求任务成功率和风险切片验证'], related: ['LLM', 'Agent', '蒸馏'], distillModule: 'loss-and-temperature',
  },
  {
    id: 'cross-entropy', code: 'F03', title: '交叉熵', phase: 'A', prerequisite: 'softmax', next: 'kl-divergence',
    intuition: '交叉熵是给正确答案分配低概率时付出的对数罚款。', decision: '看懂训练 loss、难例权重与“loss 降但业务不涨”。',
    formula: 'CE(y,p) = −Σᵢ yᵢ log pᵢ；单标签时 = −log p_y', variables: ['y：真实标签分布，维度 K', 'p：预测概率分布，维度 K', 'p_y：正确类别概率'], misconception: 'CE 可跨数据集比较的前提很苛刻；低 CE 不自动代表事实性或体验好。',
    handCalc: { question: '正确类概率 p_y=0.5，使用自然对数时 CE 约是多少？', hint: '计算 −ln(0.5)。', answer: 0.693, tolerance: 0.01, steps: ['写出 CE=−ln(p_y)', '代入 p_y=0.5', '−ln(0.5)=ln2≈0.693'] },
    experiment: 'softmax-ce', expected: '正确类概率减半时 CE 不是线性增加，而是按对数变化。', diagnosis: { symptom: '训练 CE 降、关键任务成功率不涨', cause: '标签/训练分布与业务目标错位', inspect: '按任务切片对齐 loss、成功率与样本权重', verify: '重配数据后关键切片与总体指标同步改善' },
    review: '团队用平均 CE 作为唯一上线指标，你会追问什么？', rubric: ['要求切片与业务成功率', '检查标签噪声和类不平衡', '给出离线到在线闸门'], related: ['LLM', 'Agent', '蒸馏'], distillModule: 'loss-and-temperature',
  },
  {
    id: 'kl-divergence', code: 'F04', title: 'KL / JS / Reverse-KL', phase: 'A', prerequisite: 'cross-entropy', next: 'gradient-descent',
    intuition: 'KL 衡量用 Q 近似 P 多付出的信息代价，而且方向不同问题不同。', decision: '评审对齐、蒸馏、分布漂移与多样性取舍。',
    formula: 'KL(P‖Q)=ΣᵢPᵢlog(Pᵢ/Qᵢ)；JS=½KL(P‖M)+½KL(Q‖M)', variables: ['P：参考/教师分布', 'Q：近似/学生分布', 'M=(P+Q)/2'], misconception: 'KL 不对称且不是距离；P 有质量而 Q≈0 时惩罚会很大。',
    handCalc: { question: '当 P 与 Q 完全相同时，KL(P‖Q) 是多少？', hint: '每一项的比值都是 1。', answer: 0, tolerance: 0.001, steps: ['Pᵢ/Qᵢ=1', 'log(1)=0', '所有项求和仍为 0'] },
    experiment: 'kl-divergence', expected: '交换 P/Q 后 KL 通常改变；JS 保持对称且有界。', diagnosis: { symptom: '反向 KL 后输出多样性坍缩', cause: 'mode-seeking 过强', inspect: '看 routing/output entropy、mode count、self-BLEU', verify: '降低权重或混入正向 KL 后覆盖恢复' },
    review: '生成任务为什么不能只说“用了 KL”，而要说明方向？', rubric: ['解释 mode-covering / seeking', '结合任务多样性目标', '要求消融和熵指标'], related: ['LLM', 'Agent', '蒸馏'], distillModule: 'loss-and-temperature',
  },
  {
    id: 'gradient-descent', code: 'F05', title: '梯度下降与反向传播', phase: 'B', prerequisite: 'kl-divergence', next: 'linear-layer',
    intuition: '梯度给出局部最陡上升方向，优化器沿反方向小步更新参数。', decision: '诊断不收敛、震荡、发散与梯度爆炸。',
    formula: 'θₜ₊₁ = θₜ − η·∇θL；vₜ=βvₜ₋₁+∇L', variables: ['θ：参数向量', 'η：学习率', '∇L：与 θ 同维梯度', 'β：动量系数'], misconception: '梯度小不一定接近全局最优，也可能是饱和或断梯度。',
    handCalc: { question: 'θ=2，梯度=3，学习率 η=0.1，一步后 θ 是多少？', hint: 'θ_new=θ−η×梯度。', answer: 1.7, tolerance: 0.001, steps: ['更新量=0.1×3=0.3', '沿梯度反方向更新', '2−0.3=1.7'] },
    experiment: 'gradient-descent', expected: '学习率过大导致震荡或发散；动量可加速也会过冲。', diagnosis: { symptom: 'loss 突然变为 NaN', cause: '学习率过大、梯度爆炸或数值溢出', inspect: '看 grad_norm、loss_scale、首个异常层', verify: 'clip/降学习率后固定 seed 可稳定复现收敛' },
    review: '团队只说“训练不稳定”，你要求补哪三条日志？', rubric: ['grad norm 与分层统计', '学习率/优化器状态', 'loss scale 与异常 batch'], related: ['LLM', 'Agent', '蒸馏'],
  },
  {
    id: 'linear-layer', code: 'F06', title: '线性层与矩阵乘', phase: 'B', prerequisite: 'gradient-descent', next: 'activation',
    intuition: '线性层把输入通道按权重混合成新的通道，是网络容量的基本账本。', decision: '快速核对维度、参数量、显存与算力估算。',
    formula: 'Y=XW+b；X∈R^{B×d_in}, W∈R^{d_in×d_out}', variables: ['B：样本/token 数', 'd_in/d_out：输入/输出维', '参数量=d_in×d_out+d_out'], misconception: '矩阵维度顺序不可凭名称猜；以实际张量布局为准。',
    handCalc: { question: 'd_in=3、d_out=2，带 bias 的线性层参数量是多少？', hint: '权重 3×2，再加 2 个 bias。', answer: 8, tolerance: 0.001, steps: ['W 参数=3×2=6', 'bias 参数=2', '总计 6+2=8'] },
    experiment: 'mlp-forward', expected: '宽度翻倍会近似平方增加 FFN 中两层权重。', diagnosis: { symptom: '矩阵乘维度报错', cause: 'batch/sequence/channel 轴错位', inspect: '逐层打印 shape 与约定', verify: '加入 shape assertion 后所有路径通过' },
    review: '一个“隐藏维翻倍”的方案为何不能只报层数不变？', rubric: ['计算参数量变化', '估算 FLOPs/显存', '连接吞吐和收益验证'], related: ['LLM', 'Agent', '蒸馏'],
  },
  {
    id: 'activation', code: 'F07', title: 'ReLU / GELU / SiLU', phase: 'B', prerequisite: 'linear-layer', next: 'mlp',
    intuition: '激活函数打破纯线性叠加，让网络能表达弯曲决策边界。', decision: '理解死神经元、饱和和激活选择对稳定性的影响。',
    formula: 'ReLU(x)=max(0,x)；SiLU(x)=x·σ(x)', variables: ['x：逐元素输入，shape 不变', 'σ：Sigmoid', 'GELU：按高斯门控的平滑近似'], misconception: '多层线性若没有非线性，整体仍可合并成一层线性。',
    handCalc: { question: 'ReLU([-2, 0, 3]) 的元素和是多少？', hint: '负数变 0，正数保留。', answer: 3, tolerance: 0.001, steps: ['−2→0', '0→0，3→3', '相加得到 3'] },
    experiment: 'mlp-forward', expected: '输入偏负时 ReLU 死神经元比例上升，SiLU/GELU 更平滑。', diagnosis: { symptom: '大量神经元长期输出 0', cause: 'ReLU 死区、偏置或学习率问题', inspect: '看 activation_zero_rate 与分层直方图', verify: '调整初始化/激活后零率下降且验证集改善' },
    review: '替换激活函数的评审不能只看平均 loss，还要看什么？', rubric: ['激活/梯度分布', '吞吐与 kernel 支持', '关键切片与回归'], related: ['LLM', '蒸馏'],
  },
  {
    id: 'mlp', code: 'F08', title: 'MLP / FFN', phase: 'B', prerequisite: 'activation', next: 'transformer-block',
    intuition: 'MLP 在每个 token 内混合通道，通常承担 Transformer 大部分参数。', decision: '评估宽度、激活、参数/FLOPs 与效果的交换。',
    formula: 'FFN(X)=φ(XW₁+b₁)W₂+b₂', variables: ['X：[tokens,d_model]', 'W₁：[d_model,d_ff]', 'W₂：[d_ff,d_model]'], misconception: 'MLP 不直接做 token 间混合；那是 Attention 的职责。',
    handCalc: { question: '忽略 bias，d_model=4、d_ff=8 的两层 FFN 参数量是多少？', hint: '两张矩阵：4×8 与 8×4。', answer: 64, tolerance: 0.001, steps: ['第一层 4×8=32', '第二层 8×4=32', '总计 64'] },
    experiment: 'mlp-forward', expected: '层数/宽度提高增加参数；去掉激活后深层线性表达不增加。', diagnosis: { symptom: 'FFN 占时异常高', cause: 'd_ff 过宽、kernel/量化不匹配', inspect: '看 layer latency、GEMM shape、utilization', verify: '缩宽或融合后 TPOT 降且质量门槛通过' },
    review: 'FFN 宽度从 4d 改 8d，产品评审要补什么证据？', rubric: ['参数与 FLOPs 估算', '质量收益分切片', '延迟/显存/成本闸门'], related: ['LLM', 'Agent', '蒸馏'],
  },
  {
    id: 'transformer-block', code: 'F09', title: 'Transformer Block', phase: 'C', prerequisite: 'mlp', next: 'moe',
    intuition: 'Attention 混合 token，MLP 混合通道，残差和归一化让深层训练可行。', decision: '评审 Pre-LN/Post-LN、宽度、上下文成本和稳定性。',
    formula: 'X′=X+Attn(LN(X)); Y=X′+MLP(LN(X′))', variables: ['X：[B,T,d]', 'Attention：token mixing', 'MLP：channel mixing', 'Residual：同 shape 相加'], misconception: 'FlashAttention 改善 IO，不会把理论 T² 注意力计算变成常数。',
    handCalc: { question: '序列长度从 4 翻倍到 8，T² 注意力项放大多少倍？', hint: '比较 8² 与 4²。', answer: 4, tolerance: 0.001, steps: ['原项 4²=16', '新项 8²=64', '64/16=4 倍'] },
    experiment: 'transformer-block', expected: 'Post-LN 或关闭残差会提高深层稳定性风险；长序列推高 Attention 成本。', diagnosis: { symptom: '加深层数后训练变差', cause: '归一化位置、残差尺度或初始化不稳', inspect: '看分层 grad/activation norm', verify: '切换 Pre-LN/残差缩放后深层曲线稳定' },
    review: '“上下文翻倍只多一点成本”的说法哪里危险？', rubric: ['区分 Attention T² 与 MLP T', '纳入 KV cache/并发', '要求真实 shape 压测'], related: ['LLM', 'Agent', '蒸馏'],
  },
  {
    id: 'moe', code: 'F10', title: 'MoE', phase: 'C', prerequisite: 'transformer-block', next: 'distillation',
    intuition: 'Router 为每个 token 只激活少数专家，用稀疏计算换取更大总容量。', decision: '评审负载均衡、容量、丢 token、通信与激活参数。',
    formula: 'y=Σ_{i∈Top-k} gᵢ(x)Eᵢ(x)；capacity≈CF·tokens·k/E', variables: ['E：专家数', 'k：每 token 激活专家数', 'gᵢ：Router 概率', 'CF：capacity factor'], misconception: '总参数大不等于单 token 激活参数大；MoE 也不是免费容量。',
    handCalc: { question: '8 个专家、Top-2，每个 token 激活几个专家？', hint: 'Top-k 的 k 就是激活数量。', answer: 2, tolerance: 0.001, steps: ['识别 k=2', 'Router 选择概率最高的 2 个专家', '每 token 激活 2 个专家'] },
    experiment: 'moe-router', expected: '低 capacity 或路由坍缩会造成 overflow/drop；均衡损失可改善但可能伤专门化。', diagnosis: { symptom: '一个专家负载远高于其他专家', cause: 'Router 坍缩或均衡权重过低', inspect: '看 expert_load、routing_entropy、overflow', verify: '调权重/噪声后负载均衡且成功率不退化' },
    review: 'MoE 方案只报“总参数 8×”为什么不完整？', rubric: ['报告激活参数与 Top-k', '报告负载/overflow/通信', '给出 Dense 基线与成本'], related: ['LLM', 'Agent', '蒸馏'], distillModule: 'moe-and-stack',
  },
  {
    id: 'distillation', code: 'F11', title: '蒸馏', phase: 'D', prerequisite: 'moe',
    intuition: '学生不仅学硬标签，还学习教师分布、表示或行为轨迹中的“暗知识”。', decision: '把质量、成本、许可、能力保留和上线闸门放进同一方案。',
    formula: 'L=α·CE+(1−α)·T²·KL(p_t^T‖p_s^T)', variables: ['α：硬标签权重 [0,1]', 'T：蒸馏温度 >0', 'p_t/p_s：教师/学生分布'], misconception: '蒸馏不是无损压缩；学生容量、数据和教师错误都决定上限。',
    handCalc: { question: 'α=0.4 时，软标签 KD 项的混合权重 1−α 是多少？', hint: '用 1 减去 α。', answer: 0.6, tolerance: 0.001, steps: ['总混合权重为 1', '软项权重=1−0.4', '得到 0.6'] },
    experiment: 'softmax-ce', expected: 'T 提高暴露更多暗知识，但过高会让信号变弱。', diagnosis: { symptom: '学生像教师但任务正确率下降', cause: '教师系统性错误或 α/T 配置不当', inspect: '分开看一致率、正确率、教师错误切片', verify: '加硬标签/过滤后正确率恢复且保留度过闸门' },
    review: '蒸馏项目立项前必须写清哪五类门槛？', rubric: ['能力保留与关键切片', '幻觉/安全', '延迟/显存/成本', '数据和教师许可', 'shadow/canary/回滚'], related: ['LLM', 'Agent', '蒸馏'], distillModule: 'why-distill',
  },
]

export const phaseNames = { A: '概率与信息', B: '优化与模块', C: '现代架构', D: '压缩与上线' } as const
export const foundationIds = foundationNodes.map((node) => node.id)
