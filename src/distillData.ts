import type { DecisionBriefPracticeData } from './components/course/DecisionBriefPractice'

export interface DistillModule {
  id: string
  code: string
  title: string
  lead: string
  mechanism: string[]
  formula?: string
  constraints: string[]
  tradeoffs: string[]
  checklist: string[]
  caseStudy: string
  labs: string[]
  foundation?: string
  practice?: DecisionBriefPracticeData
}

const distillRubric = [
  '决策说明 student（学生模型）适用任务与不适用切片，并与同尺寸基线比较。',
  '指标同时覆盖能力保持、安全、延迟与单位有效成本。',
  '闸门给出数字阈值、负责人与失败后的回滚版本。',
  '下一步包含消融、held-out（留出）样本或灰度证据，而不是继续盲目训练。',
]

const distillPractices: Record<string, DecisionBriefPracticeData> = {
  'loss-and-temperature': {
    id: 'distill-kd-loss',
    businessInput: '分类 student 使用 α=0.4、CE（交叉熵）=0.8、温度 T=2、KL（相对熵）=0.15 的蒸馏配方。',
    facts: ['教师处于 eval（评估）模式', 'KL 使用 T² 缩放', '同尺寸 SFT（监督微调）基线损失：0.70'],
    calculation: { label: '总 KD（知识蒸馏）损失', question: '计算 α·CE + (1−α)·T²·KL。', formula: '0.4 × 0.8 + (1 − 0.4) × 2² × 0.15', values: [0.4, 0.8, 2, 0.15], method: 'kd-loss', unit: '', precision: 2, tolerance: 0.01 },
    template: { decision: 'Hold：损失 0.68 仅说明目标函数值，需通过消融证明优于同尺寸 SFT。', metrics: '任务正确率、teacher/student entropy（熵）、KL(T²)、关键切片回归。', gate: '目标域较 SFT +2pp（百分点），通用/安全切片下降≤1pp，三次种子稳定后 Go。', nextStep: '训练负责人运行 T=1/2/4 与去除 T² 的消融，提交 held-out 结果。' },
    rubric: distillRubric,
    pitfalls: [{ mistake: '遗漏 T²，导致温度变化同时改变梯度尺度。', fix: '显式记录未缩放 KL 与 KL(T²)，并做温度 sweep（扫描）。' }, { mistake: '只看训练损失较低。', fix: '与同尺寸 SFT 在独立业务切片上比较。' }],
  },
  'data-recipe': {
    id: 'distill-data-recipe',
    businessInput: '客服蒸馏配方为教师生成 55%、student rollout（学生采样）20%、真人 10%、开源数据 15%。',
    facts: ['总训练量：200,000 条', '全局去重残留上限：2%', 'Replay（回放）最低要求：10%'],
    calculation: { label: '配方总占比', question: '相加四类数据占比，检查是否构成完整配方。', formula: '55 + 20 + 10 + 15', values: [55, 20, 10, 15], method: 'sum', unit: '%', precision: 0, tolerance: 0 },
    template: { decision: 'Go（进入小规模训练）：配方合计 100%，且 rollout 与真人数据覆盖学生失败域。', metrics: '去重残留、Prompt（提示词）切片覆盖、教师错误率、任务成功率、Replay 保持率。', gate: '配方=100%、去重残留≤2%、许可标签=100%、稀疏切片无空洞才开训。', nextStep: '数据负责人将 20 万条按来源与切片出具 manifest（清单），抽检教师错误和许可。' },
    rubric: distillRubric,
    pitfalls: [{ mistake: '只给百分比，不给绝对量与去重后数量。', fix: '输出来源×任务切片矩阵和去重前后计数。' }, { mistake: '教师样本占满训练集。', fix: '加入学生失败轨迹、真人校准与 Replay 保持数据。' }],
  },
  'launch-and-eval': {
    id: 'distill-launch-cost',
    businessInput: '蒸馏前每千次可验证完成的全成本为 10 元，student（学生模型）灰度后为 4.5 元；能力保持率 96%，幻觉上升 0.4pp（百分点）。',
    facts: ['p95（第 95 百分位）延迟下降 42%', '安全集全部通过', '核心切片最低保持率要求：95%'],
    calculation: { label: '成本降幅', question: '计算单位可验证完成成本的下降比例。', formula: '(10 − 4.5) ÷ 10 × 100', values: [10, 4.5], method: 'percent-reduction', unit: '%', precision: 1, tolerance: 0.1 },
    template: { decision: 'Go（限量 canary，小流量灰度）：成本下降 55%，能力、安全与延迟当前满足闸门。', metrics: '能力保持率、幻觉/安全、p95、cost per verified completion（单位可验证完成成本）。', gate: '保持率≥95%、幻觉增幅≤0.5pp、安全零红线、成本降幅≥50% 才逐级放量。', nextStep: '发布负责人先做 5% canary，观察 48 小时；任一红线触发 kill-switch（紧急停止）回滚。' },
    rubric: distillRubric,
    pitfalls: [{ mistake: '只算调用单价，忽略重试与人审。', fix: '用全成本除以可验证完成数，并与基线同口径比较。' }, { mistake: '总体保持率掩盖核心切片。', fix: '同时设置总体与最差关键切片闸门。' }],
  },
}

export const distillModules: DistillModule[] = [
  { id: 'why-distill', code: 'D01', title: '为什么蒸馏：与量化、剪枝、结构改造的取舍', lead: '先把问题、上线约束和成本函数讲清，再决定压缩栈中哪一层由蒸馏承担。', mechanism: ['蒸馏让 student 学 teacher 的输出分布、中间表示或行为轨迹。', '量化压缩权重/激活位宽；剪枝移除冗余；结构改造等价于换模型。'], constraints: ['明确 p95/TTFT/TPOT、显存、并发与能力覆盖矩阵。', '教师许可、数据许可与产物再分发授权必须归档。'], tradeoffs: ['量化投入低、收益中；蒸馏投入高、能力迁移灵活。', '结构改造上限高，但时间和回归成本最高。'], checklist: ['是否有必须保留/允许下降的能力清单？', '蒸馏是否被证明优于更好 Prompt 或同尺寸 SFT？'], caseStudy: '端侧 3B 助手：70B 教师→3B Dense→INT8；核心是代码与工具切片下降不超过 3pp。', labs: ['teacher-budget-lab', 'stack-lab'] },
  { id: 'loss-and-temperature', code: 'D02', title: 'Soft Target、温度 T 与 KL(T²) 缩放', lead: '把温度和 KL 权重变成可操作的手感。', mechanism: ['高 T 暴露类别相似性的暗知识；α 越高越依赖硬标签。', '正向 KL 倾向 mode-covering，反向 KL 倾向 mode-seeking。'], formula: 'p_t=softmax(z_t/T)\np_s=softmax(z_s/T)\nL=α·CE+(1−α)·T²·KL(p_t‖p_s)', constraints: ['使用 log_softmax、detach 教师梯度并固定 teacher eval mode。', '至少做 3 个温度点的 sweep。'], tradeoffs: ['高 T+低 α 暗知识多但易继承教师错误。', '低 T+高 α 稳定，但蒸馏收益接近 SFT。'], checklist: ['是否同时记录 teacher_entropy、student_entropy、KL(T²)？', '一致率和任务正确率是否分开报告？'], caseStudy: '5 类分类中 T=4 让前两类接近，学生学到“相似类别”而不只学 argmax。', labs: ['temperature-lab', 'loss-mix-lab'], foundation: 'kl-divergence', practice: distillPractices['loss-and-temperature'] },
  { id: 'kd-forms', code: 'D03', title: 'Logit / Hidden / Attention / 关系蒸馏', lead: '输出、中间层、注意力和样本关系分别迁移不同知识。', mechanism: ['Logit 跨结构最通用；Hidden 需要层映射和 projector。', 'Attention 对长上下文有效；关系蒸馏对齐样本几何。'], formula: 'L_hidden=Σₗwₗ·(1−cos(h_sˡ,Pₗ(h_t^{π(l)})))', constraints: ['跨结构先以 Logit 为主。', '缓存教师中间态并计入训练显存。'], tradeoffs: ['Hidden 提升结构迁移但训练慢 20%~40%。', 'Attention 短任务收益有限。'], checklist: ['每个损失项是否做独立消融？', 'projector 参数与显存是否入账？'], caseStudy: '32 层教师到 12 层学生采用等距层映射，Hidden 权重从 0.05 逐步升至 0.15。', labs: ['loss-mix-lab'] },
  { id: 'seq-vs-token-kd', code: 'D04', title: 'Sequence-Level KD 与 Token-Level KD', lead: 'Token 更细但有暴露偏差；Sequence 更便宜但采样方差大。', mechanism: ['Token-KD 在教师前缀上逐位置对齐。', 'Seq-KD 用教师完整生成做 SFT；On-policy 用学生前缀再询问教师。'], formula: 'L_token=ΣₜKL(p_t(·|y*_<t)‖p_s(·|y*_<t))\nL_seq=−log p_s(y*|x)', constraints: ['生成温度、top-p、束宽必须版本化。', 'On-policy 需要 rollout 池、回放与 KL clip。'], tradeoffs: ['Token 稳但易复读；Seq 便宜但可复现性差。', 'On-policy 泛化好但成本最高。'], checklist: ['是否有 self-BLEU/n-gram overlap？', '生产解码和数据生成配置是否一致？'], caseStudy: '客服 Agent 混入 5% on-policy 后，回复长度和复读下降，任务满意度提升。', labs: ['seq-vs-token-lab'] },
  { id: 'data-recipe', code: 'D05', title: 'On/Off-Policy 数据与数据配方', lead: '教师生成、学生 rollout、真人和开源数据的配比是最大变量。', mechanism: ['Off-policy 便宜可控；On-policy 缓解暴露偏差。', '真人校准关键切片，开源数据拓宽分布。'], constraints: ['全局去重、质量过滤、许可标签与 Prompt 覆盖矩阵。', 'Replay 建议保留 5%~15%。'], tradeoffs: ['教师比例高更像教师但长尾差。', '真人比例高质量好但成本非线性上涨。'], checklist: ['四类数据绝对量和去重残留是否有表？', '稀疏 Prompt 切片是否补齐？'], caseStudy: '客服配方 55% 教师+20% rollout+10% 真人+15% 开源，比全教师方案成功率更高。', labs: ['data-recipe-lab'], practice: distillPractices['data-recipe'] },
  { id: 'cot-distill', code: 'D06', title: 'CoT / Rationale 蒸馏', lead: '迁移推理能力，不等于让学生复读推理表面形式。', mechanism: ['可用 rationale SFT、step-wise KD、self-consistency。', '训练给 rationale、推理只答答案可降低 token 成本。'], constraints: ['过滤答案错误的 rationale。', '明确推理时是否展示结构化过程；不要求私有 chain-of-thought。'], tradeoffs: ['长 rationale 成本高且可能带幻觉。', 'Self-consistency 更贵但数学推理更稳。'], checklist: ['关掉 rationale 后成功率如何？', '是否检测教师原文复读？'], caseStudy: '数学任务通过多采样投票与步骤级监督提升答案正确率，同时不展示私有思维链。', labs: ['seq-vs-token-lab'] },
  { id: 'blackbox-vs-whitebox', code: 'D07', title: '白盒 vs 黑盒 API 蒸馏', lead: '黑盒 API 常见，但许可、成本、隐私与供应商依赖是四类红线。', mechanism: ['白盒可取 logits/hidden/attention。', '黑盒通常只有文本或 top-k logprobs，接近 Seq-KD。'], constraints: ['缓存原始输出、供应商版本和许可标签。', 'PII 脱敏、moderation 与退出机制。'], tradeoffs: ['黑盒快但迁移信号少。', '白盒自由度高但托管成本大。'], checklist: ['ToS 条款版本和法务签字是否归档？', '教师停服 fallback 是否演练？'], caseStudy: '10 万样本的黑盒采样费用由输入/输出 token、CoT 和过滤复采样共同决定。', labs: ['blackbox-api-lab'] },
  { id: 'capability-retention', code: 'D08', title: '任务专用 vs 通用能力保持', lead: '专用蒸馏必须用能力保留矩阵防止灾难性遗忘。', mechanism: ['任务×版本矩阵覆盖目标域、通用、安全和拒答。', 'Replay 数据维持正交能力。'], constraints: ['至少 3 个 held-out 任务集。', '安全和能力由不同闸门评审。'], tradeoffs: ['Replay 多则保留好但目标域收益可能下降。', '多学生专家方案能力专一但运维复杂。'], checklist: ['是否带前三版本对比？', '安全回归是否独立签字？'], caseStudy: '客服专用训练加入通用、代码和数学 replay 后，把正交任务下降控制在 5pp 内。', labs: ['data-recipe-lab', 'launch-gate'] },
  { id: 'teacher-selection', code: 'D09', title: '教师选择与多教师集成', lead: '教师质量决定上限，多教师降低单点错误但引入不一致和费用。', mechanism: ['能力 gap 至少约 10pp 才有迁移空间。', '按任务路由教师或用一致性过滤难例。'], constraints: ['记录教师置信度、错误结构和版本。', '低置信样本降权或进入人工池。'], tradeoffs: ['多教师质量高、成本 2~3×。', '单教师便宜但系统性错误会被放大。'], checklist: ['教师错误是随机还是系统性？', '季度升级回归是否计划？'], caseStudy: '通用、代码、中文推理三教师按任务路由，提高满意度但采样成本约 2.4×。', labs: ['teacher-budget-lab'] },
  { id: 'kd-and-alignment', code: 'D10', title: '蒸馏与 SFT / DPO / RLHF 的顺序', lead: '顺序取决于要保留能力还是对齐偏好。', mechanism: ['主流：Pretrain→SFT+KD→DPO/RLHF。', '也可 KD→SFT→DPO，让蒸馏只负责能力迁移。'], constraints: ['DPO 的参考模型通常是学生 SFT 版本。', 'Reward model 偏差需独立评估。'], tradeoffs: ['串行流程稳但慢。', '并行消融快但版本治理复杂。'], checklist: ['helpful/harmless/honest 是否分报？', '对齐后是否重跑能力保留？'], caseStudy: '客服学生先 SFT+KD，再 DPO 提升语气一致性并保持任务成功率。', labs: ['launch-gate'] },
  { id: 'moe-and-stack', code: 'D11', title: 'MoE → Dense 与组合压缩栈', lead: '把稀疏专家合成为 Dense 学生，并按正确顺序叠加量化与推测解码。', mechanism: ['MoE 教师一次只激活少数专家；Dense 学生固定容量、部署简单。', '推荐顺序：蒸馏→量化→推测解码。'], constraints: ['报告专家利用率、路由熵和长尾能力。', '校准集覆盖代码/数学/长上下文。'], tradeoffs: ['MoE→Dense 长尾最易掉。', 'INT4 显存低但幻觉风险更高。'], checklist: ['激活专家与负载是否记录？', 'draft acceptance rate 是否≥0.6？'], caseStudy: '8×7B MoE→3B Dense→INT8→0.5B draft，成本下降但幻觉小幅上升。', labs: ['stack-lab'], foundation: 'moe' },
  { id: 'launch-and-eval', code: 'D12', title: '评估与上线闸门', lead: '能力、幻觉与安全、延迟、成本构成四道上线闸门。', mechanism: ['Shadow 只观测；Canary 小流量；A/B 比较基线。', '任一安全或核心切片红线触发 kill-switch。'], formula: 'Go = retention pass ∧ safety pass ∧ latency pass ∧ cost pass', constraints: ['阈值与 SLO 对齐并版本化。', '评估集与训练集隔离。'], tradeoffs: ['门槛严上线慢但事故少。', '灰度短需要更强实时熔断。'], checklist: ['每道闸门是否有数字和负责人？', '回滚是否近期演练？'], caseStudy: '能力保留 96%、幻觉 +0.4pp、安全通过且成本 -55%，经 Shadow/Canary 后全量。', labs: ['launch-gate'], practice: distillPractices['launch-and-eval'] },
]

export const distillExperiments = [
  ['temperature-lab', 'L01', '温度与软标签'], ['loss-mix-lab', 'L02', 'KD 损失配比'], ['data-recipe-lab', 'L03', '数据配方'], ['seq-vs-token-lab', 'L04', 'Sequence 与 Token KD'], ['teacher-budget-lab', 'L05', '教师与算力预算'], ['blackbox-api-lab', 'L06', '黑盒 API 蒸馏'], ['stack-lab', 'L07', '压缩组合栈'], ['launch-gate', 'L08', '上线闸门'],
] as const
