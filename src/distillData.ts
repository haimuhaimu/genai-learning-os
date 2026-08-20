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
}

export const distillModules: DistillModule[] = [
  { id: 'why-distill', code: 'D01', title: '为什么蒸馏：与量化、剪枝、结构改造的取舍', lead: '先把问题、上线约束和成本函数讲清，再决定压缩栈中哪一层由蒸馏承担。', mechanism: ['蒸馏让 student 学 teacher 的输出分布、中间表示或行为轨迹。', '量化压缩权重/激活位宽；剪枝移除冗余；结构改造等价于换模型。'], constraints: ['明确 p95/TTFT/TPOT、显存、并发与能力覆盖矩阵。', '教师许可、数据许可与产物再分发授权必须归档。'], tradeoffs: ['量化投入低、收益中；蒸馏投入高、能力迁移灵活。', '结构改造上限高，但时间和回归成本最高。'], checklist: ['是否有必须保留/允许下降的能力清单？', '蒸馏是否被证明优于更好 Prompt 或同尺寸 SFT？'], caseStudy: '端侧 3B 助手：70B 教师→3B Dense→INT8；核心是代码与工具切片下降不超过 3pp。', labs: ['teacher-budget-lab', 'stack-lab'] },
  { id: 'loss-and-temperature', code: 'D02', title: 'Soft Target、温度 T 与 KL(T²) 缩放', lead: '把温度和 KL 权重变成可操作的手感。', mechanism: ['高 T 暴露类别相似性的暗知识；α 越高越依赖硬标签。', '正向 KL 倾向 mode-covering，反向 KL 倾向 mode-seeking。'], formula: 'p_t=softmax(z_t/T)\np_s=softmax(z_s/T)\nL=α·CE+(1−α)·T²·KL(p_t‖p_s)', constraints: ['使用 log_softmax、detach 教师梯度并固定 teacher eval mode。', '至少做 3 个温度点的 sweep。'], tradeoffs: ['高 T+低 α 暗知识多但易继承教师错误。', '低 T+高 α 稳定，但蒸馏收益接近 SFT。'], checklist: ['是否同时记录 teacher_entropy、student_entropy、KL(T²)？', '一致率和任务正确率是否分开报告？'], caseStudy: '5 类分类中 T=4 让前两类接近，学生学到“相似类别”而不只学 argmax。', labs: ['temperature-lab', 'loss-mix-lab'], foundation: 'kl-divergence' },
  { id: 'kd-forms', code: 'D03', title: 'Logit / Hidden / Attention / 关系蒸馏', lead: '输出、中间层、注意力和样本关系分别迁移不同知识。', mechanism: ['Logit 跨结构最通用；Hidden 需要层映射和 projector。', 'Attention 对长上下文有效；关系蒸馏对齐样本几何。'], formula: 'L_hidden=Σₗwₗ·(1−cos(h_sˡ,Pₗ(h_t^{π(l)})))', constraints: ['跨结构先以 Logit 为主。', '缓存教师中间态并计入训练显存。'], tradeoffs: ['Hidden 提升结构迁移但训练慢 20%~40%。', 'Attention 短任务收益有限。'], checklist: ['每个损失项是否做独立消融？', 'projector 参数与显存是否入账？'], caseStudy: '32 层教师到 12 层学生采用等距层映射，Hidden 权重从 0.05 逐步升至 0.15。', labs: ['loss-mix-lab'] },
  { id: 'seq-vs-token-kd', code: 'D04', title: 'Sequence-Level KD 与 Token-Level KD', lead: 'Token 更细但有暴露偏差；Sequence 更便宜但采样方差大。', mechanism: ['Token-KD 在教师前缀上逐位置对齐。', 'Seq-KD 用教师完整生成做 SFT；On-policy 用学生前缀再询问教师。'], formula: 'L_token=ΣₜKL(p_t(·|y*_<t)‖p_s(·|y*_<t))\nL_seq=−log p_s(y*|x)', constraints: ['生成温度、top-p、束宽必须版本化。', 'On-policy 需要 rollout 池、回放与 KL clip。'], tradeoffs: ['Token 稳但易复读；Seq 便宜但可复现性差。', 'On-policy 泛化好但成本最高。'], checklist: ['是否有 self-BLEU/n-gram overlap？', '生产解码和数据生成配置是否一致？'], caseStudy: '客服 Agent 混入 5% on-policy 后，回复长度和复读下降，任务满意度提升。', labs: ['seq-vs-token-lab'] },
  { id: 'data-recipe', code: 'D05', title: 'On/Off-Policy 数据与数据配方', lead: '教师生成、学生 rollout、真人和开源数据的配比是最大变量。', mechanism: ['Off-policy 便宜可控；On-policy 缓解暴露偏差。', '真人校准关键切片，开源数据拓宽分布。'], constraints: ['全局去重、质量过滤、许可标签与 Prompt 覆盖矩阵。', 'Replay 建议保留 5%~15%。'], tradeoffs: ['教师比例高更像教师但长尾差。', '真人比例高质量好但成本非线性上涨。'], checklist: ['四类数据绝对量和去重残留是否有表？', '稀疏 Prompt 切片是否补齐？'], caseStudy: '客服配方 55% 教师+20% rollout+10% 真人+15% 开源，比全教师方案成功率更高。', labs: ['data-recipe-lab'] },
  { id: 'cot-distill', code: 'D06', title: 'CoT / Rationale 蒸馏', lead: '迁移推理能力，不等于让学生复读推理表面形式。', mechanism: ['可用 rationale SFT、step-wise KD、self-consistency。', '训练给 rationale、推理只答答案可降低 token 成本。'], constraints: ['过滤答案错误的 rationale。', '明确推理时是否展示结构化过程；不要求私有 chain-of-thought。'], tradeoffs: ['长 rationale 成本高且可能带幻觉。', 'Self-consistency 更贵但数学推理更稳。'], checklist: ['关掉 rationale 后成功率如何？', '是否检测教师原文复读？'], caseStudy: '数学任务通过多采样投票与步骤级监督提升答案正确率，同时不展示私有思维链。', labs: ['seq-vs-token-lab'] },
  { id: 'blackbox-vs-whitebox', code: 'D07', title: '白盒 vs 黑盒 API 蒸馏', lead: '黑盒 API 常见，但许可、成本、隐私与供应商依赖是四类红线。', mechanism: ['白盒可取 logits/hidden/attention。', '黑盒通常只有文本或 top-k logprobs，接近 Seq-KD。'], constraints: ['缓存原始输出、供应商版本和许可标签。', 'PII 脱敏、moderation 与退出机制。'], tradeoffs: ['黑盒快但迁移信号少。', '白盒自由度高但托管成本大。'], checklist: ['ToS 条款版本和法务签字是否归档？', '教师停服 fallback 是否演练？'], caseStudy: '10 万样本的黑盒采样费用由输入/输出 token、CoT 和过滤复采样共同决定。', labs: ['blackbox-api-lab'] },
  { id: 'capability-retention', code: 'D08', title: '任务专用 vs 通用能力保持', lead: '专用蒸馏必须用能力保留矩阵防止灾难性遗忘。', mechanism: ['任务×版本矩阵覆盖目标域、通用、安全和拒答。', 'Replay 数据维持正交能力。'], constraints: ['至少 3 个 held-out 任务集。', '安全和能力由不同闸门评审。'], tradeoffs: ['Replay 多则保留好但目标域收益可能下降。', '多学生专家方案能力专一但运维复杂。'], checklist: ['是否带前三版本对比？', '安全回归是否独立签字？'], caseStudy: '客服专用训练加入通用、代码和数学 replay 后，把正交任务下降控制在 5pp 内。', labs: ['data-recipe-lab', 'launch-gate'] },
  { id: 'teacher-selection', code: 'D09', title: '教师选择与多教师集成', lead: '教师质量决定上限，多教师降低单点错误但引入不一致和费用。', mechanism: ['能力 gap 至少约 10pp 才有迁移空间。', '按任务路由教师或用一致性过滤难例。'], constraints: ['记录教师置信度、错误结构和版本。', '低置信样本降权或进入人工池。'], tradeoffs: ['多教师质量高、成本 2~3×。', '单教师便宜但系统性错误会被放大。'], checklist: ['教师错误是随机还是系统性？', '季度升级回归是否计划？'], caseStudy: '通用、代码、中文推理三教师按任务路由，提高满意度但采样成本约 2.4×。', labs: ['teacher-budget-lab'] },
  { id: 'kd-and-alignment', code: 'D10', title: '蒸馏与 SFT / DPO / RLHF 的顺序', lead: '顺序取决于要保留能力还是对齐偏好。', mechanism: ['主流：Pretrain→SFT+KD→DPO/RLHF。', '也可 KD→SFT→DPO，让蒸馏只负责能力迁移。'], constraints: ['DPO 的参考模型通常是学生 SFT 版本。', 'Reward model 偏差需独立评估。'], tradeoffs: ['串行流程稳但慢。', '并行消融快但版本治理复杂。'], checklist: ['helpful/harmless/honest 是否分报？', '对齐后是否重跑能力保留？'], caseStudy: '客服学生先 SFT+KD，再 DPO 提升语气一致性并保持任务成功率。', labs: ['launch-gate'] },
  { id: 'moe-and-stack', code: 'D11', title: 'MoE → Dense 与组合压缩栈', lead: '把稀疏专家合成为 Dense 学生，并按正确顺序叠加量化与推测解码。', mechanism: ['MoE 教师一次只激活少数专家；Dense 学生固定容量、部署简单。', '推荐顺序：蒸馏→量化→推测解码。'], constraints: ['报告专家利用率、路由熵和长尾能力。', '校准集覆盖代码/数学/长上下文。'], tradeoffs: ['MoE→Dense 长尾最易掉。', 'INT4 显存低但幻觉风险更高。'], checklist: ['激活专家与负载是否记录？', 'draft acceptance rate 是否≥0.6？'], caseStudy: '8×7B MoE→3B Dense→INT8→0.5B draft，成本下降但幻觉小幅上升。', labs: ['stack-lab'], foundation: 'moe' },
  { id: 'launch-and-eval', code: 'D12', title: '评估与上线闸门', lead: '能力、幻觉与安全、延迟、成本构成四道上线闸门。', mechanism: ['Shadow 只观测；Canary 小流量；A/B 比较基线。', '任一安全或核心切片红线触发 kill-switch。'], formula: 'Go = retention pass ∧ safety pass ∧ latency pass ∧ cost pass', constraints: ['阈值与 SLO 对齐并版本化。', '评估集与训练集隔离。'], tradeoffs: ['门槛严上线慢但事故少。', '灰度短需要更强实时熔断。'], checklist: ['每道闸门是否有数字和负责人？', '回滚是否近期演练？'], caseStudy: '能力保留 96%、幻觉 +0.4pp、安全通过且成本 -55%，经 Shadow/Canary 后全量。', labs: ['launch-gate'] },
]

export const distillExperiments = [
  ['temperature-lab', 'L01', '温度与软标签'], ['loss-mix-lab', 'L02', 'KD 损失配比'], ['data-recipe-lab', 'L03', '数据配方'], ['seq-vs-token-lab', 'L04', 'Sequence 与 Token KD'], ['teacher-budget-lab', 'L05', '教师与算力预算'], ['blackbox-api-lab', 'L06', '黑盒 API 蒸馏'], ['stack-lab', 'L07', '压缩组合栈'], ['launch-gate', 'L08', '上线闸门'],
] as const
