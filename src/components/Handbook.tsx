import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, BarChart3, BookOpen, Calculator, Compass, Search, Sigma, Video } from 'lucide-react'

const formulas = [
  { group: 'LLM 架构', name: '训练计算量', formula: 'FLOPs ≈ 6ND', variables: 'N：参数量；D：训练 token', use: '预训练预算一级估算、比较参数与数据分配', boundary: '不含数据处理、后训练、通信与失败重跑；常数依架构而变。' },
  { group: 'LLM 架构', name: '注意力 FLOPs', formula: '≈ 4T²d per layer', variables: 'T：序列长度；d：hidden size', use: '解释全注意力随上下文二次增长', boundary: '教学近似，未含投影/MLP；FlashAttention 降 IO，不消除该计算项。' },
  { group: 'LLM 服务', name: 'KV Cache', formula: '2LTHkvDhB·bytes', variables: 'L：层；T：序列；Hkv：KV heads；Dh：head dim；B：并发', use: '容量规划、比较 MHA/GQA/MQA 与 KV 量化', boundary: '不含权重、激活、allocator 碎片与 workspace。' },
  { group: 'LLM 训练', name: 'Perplexity', formula: 'PPL = exp(−1/T Σ log p(xₜ|x<t))', variables: '按目标 token 平均负 log-likelihood', use: '同 tokenizer / 数据分布下比较语言建模拟合', boundary: '不能跨 tokenizer 直接比，也不等价于任务成功或事实性。' },
  { group: '评估', name: '二项比例置信区间', formula: 'p̂ ± 1.96√(p̂(1−p̂)/n)', variables: 'p̂：观测比例；n：样本量', use: '大样本下快速判断成功率不确定性', boundary: '极端比例/小样本用 Wilson 或 bootstrap；非独立样本需聚类处理。' },
  { group: '图像生成', name: '前向加噪 / SNR', formula: 'xₜ=αₜx₀+σₜε；SNR=αₜ²/σₜ²', variables: 'α：信号系数；σ：噪声系数', use: '理解 schedule、prediction target 与 loss weighting', boundary: '具体参数化和时间定义依训练实现。' },
  { group: '图像生成', name: 'Classifier-Free Guidance', formula: 'ε̂=εu+s(εc−εu)', variables: 's：guidance；c/u：有/无条件预测', use: '分析提示遵循与多样性/过饱和权衡', boundary: '高 s 不保证更好；不同模型范围不可直接照搬。' },
  { group: '图像控制', name: 'LoRA', formula: 'W′=W+BA, rank(BA)=r≪d', variables: 'A/B：低秩矩阵；r：rank', use: '估算轻量微调参数与多资产切换', boundary: '低 rank 不自动保证身份或风格质量；仍依赖数据与注入层。' },
  { group: '图像生成', name: 'Flow Matching', formula: 'dx/dt=vθ(x,t)', variables: 'vθ：学习的时间相关速度场', use: '理解从噪声分布到数据分布的连续输运', boundary: '更直路径不等于固定步数下必然更优。' },
  { group: '生产经济学', name: '单位有效结果成本', formula: '(生成+重试+审核+后处理)/通过数', variables: '通过数必须按统一质量闸门统计', use: '跨模型、候选数和工作流比较真实成本', boundary: '不能只报单次 API/算力价格；分母需包含全部请求。' },
  { group: 'Agent 控制', name: '循环预算', formula: 'Bₜ₊₁=Bₜ−tokensₜ−λ·toolsₜ；stop if B≤0 ∨ deadline', variables: 'B：剩余预算；λ：工具调用成本权重', use: '设计 loop 的 token、tool、wall-clock 硬终止', boundary: '教学抽象；三类预算在生产系统中应分别计量，不应用单一分数替代。' },
  { group: 'Agent 评估', name: 'Verified Success', formula: '外部验收通过任务数 / 总任务数', variables: '外部验收包括业务对象状态、证据 checksum 或人工 rubric', use: '区分模型自报完成与真实任务完成', boundary: '验证器本身需版本化、校准与审计；tool 2xx 不等于 verified success。' },
  { group: 'Agent 成本', name: 'Cost per Verified Completion', formula: 'total cost / verified completions', variables: 'total cost 含模型、工具、重试、人审和补偿', use: '比较路由、缓存、并行与终止策略的真实经济性', boundary: 'verified completions 为 0 时不可计算；不能只用调用单价代替。' },
  { group: '算法基础', name: 'Softmax', formula: 'pᵢ=exp(zᵢ/T)/Σⱼexp(zⱼ/T)', variables: 'z：logit；T：温度；p：概率', use: '看采样锐度、分类置信度与蒸馏软标签', boundary: 'T 必须大于 0；logit 需减最大值做数值稳定。' },
  { group: '算法基础', name: 'Cross-Entropy', formula: 'CE(y,p)=−Σᵢyᵢlog pᵢ', variables: 'y：标签分布；p：预测分布', use: '训练损失、难例与分类错误分析', boundary: '低 CE 不等于业务成功、事实性或良好校准。' },
  { group: '算法基础', name: 'Entropy', formula: 'H(P)=−Σᵢpᵢlog pᵢ', variables: 'P：离散概率分布', use: '判断输出、路由或教师分布的确定性', boundary: '高熵好坏取决于任务；必须结合正确率与覆盖。' },
  { group: '算法基础', name: 'KL Divergence', formula: 'KL(P‖Q)=ΣᵢPᵢlog(Pᵢ/Qᵢ)', variables: 'P：参考分布；Q：近似分布', use: '分布对齐、蒸馏、漂移与多样性评审', boundary: '不对称且不是距离；必须说明方向。' },
  { group: '算法基础', name: 'Gradient Update', formula: 'θₜ₊₁=θₜ−η∇θL', variables: 'η：学习率；∇L：梯度', use: '诊断收敛、震荡、发散与梯度爆炸', boundary: '局部梯度不保证全局最优；结合 grad_norm。' },
  { group: '算法基础', name: 'Linear / MLP 参数量', formula: 'Linear=d_in·d_out+d_out；FFN≈2d·d_ff', variables: 'd：模型宽度；d_ff：FFN 宽度', use: '快速估算参数、显存与模型容量', boundary: '是否带 bias、门控 FFN 与权重共享会改变常数。' },
  { group: '算法基础', name: 'MLP FLOPs', formula: 'FLOPs≈4·T·d·d_ff per block', variables: 'T：token 数；d/d_ff：宽度', use: '比较 FFN 宽度与推理成本', boundary: '教学估算，未含激活、IO、量化与 kernel 效率。' },
  { group: 'MoE / 蒸馏', name: 'MoE Load Balance', formula: 'L_lb≈E·Σᵢfᵢ·pᵢ', variables: 'fᵢ：token 负载；pᵢ：Router 概率', use: '检查专家负载和路由坍缩', boundary: '权重过高会损害专家专门化与任务质量。' },
  { group: 'MoE / 蒸馏', name: 'Routing Entropy', formula: 'H_router=−Σᵢpᵢlog pᵢ', variables: 'pᵢ：Router 对专家 i 的概率', use: '识别路由过尖、过平和坍缩', boundary: '高熵不自动代表负载均衡，需结合 expert_load。' },
  { group: 'MoE / 蒸馏', name: 'Capacity Factor', formula: 'capacity≈CF·tokens·Top-k/E', variables: 'CF：容量因子；E：专家数', use: '规划 expert buffer 与 overflow/drop', boundary: '跨设备通信与 padding 会改变实际容量成本。' },
  { group: 'MoE / 蒸馏', name: 'KD Loss', formula: 'L=α·CE+(1−α)·T²·KL(p_t^T‖p_s^T)', variables: 'α：硬标签权重；T：温度', use: '同时使用真实标签与教师软标签时', boundary: '一致率不等于正确率；教师系统性错误会被迁移。' },
]

const metrics = [
  { group: 'LLM 服务', name: 'TTFT', definition: 'Time To First Token，从请求进入服务到首 token 返回。', when: '长输入、交互首响应、prefill 排队与 prefix cache 优化。', abnormal: 'p95 升高常指向输入变长、prefill 队列、cache miss 或 admission 拥塞。', log: 'queue_ms, prefill_ms, input_tokens, cache_hit, batch_size' },
  { group: 'LLM 服务', name: 'TPOT', definition: 'Time Per Output Token，输出阶段相邻 token 的平均耗时。', when: '衡量持续生成速度，区分 prefill 与 decode。', abnormal: '升高常见于 decode batch 变大、KV 读带宽、序列变长或调度干扰。', log: 'decode_ms, output_tokens, active_sequences, kv_blocks' },
  { group: 'LLM 服务', name: 'ITL', definition: 'Inter-Token Latency，逐 token 间隔的分布。', when: '流式体验与卡顿；TPOT 平均值可能掩盖抖动。', abnormal: '长尾尖峰说明抢占、GC、网络 backpressure 或大 prefill 干扰 decode。', log: 'token_timestamp, scheduler_event, network_flush' },
  { group: 'LLM 服务', name: 'TPS', definition: 'Tokens Per Second；必须标明是单请求还是集群、输入还是输出。', when: '容量和成本对比。', abnormal: 'TPS 高但 p95 变差，可能只是用更大 batch 牺牲用户等待。', log: 'input_tps, output_tps, request_tps, concurrency' },
  { group: 'LLM 服务', name: 'goodput', definition: '满足质量与 SLO 的有效工作量 / 时间。', when: '过载、批处理和调度策略评审，比裸 throughput 更接近业务。', abnormal: 'throughput 上升而 goodput 下降，说明超时、失败或质量护栏吞掉收益。', log: 'slo_pass, quality_pass, completed_tokens, timeout' },
  { group: '缓存', name: 'cache hit', definition: '请求在 prefix / KV / semantic / result cache 命中的比例。', when: '评估缓存是否真正降低 prefill 或调用成本。', abnormal: '骤降常见于 key 变更、版本失效、租户隔离或流量结构变化；过高也需检查错误复用。', log: 'cache_type, key_version, hit, saved_tokens, tenant' },
  { group: '成本', name: 'tokens/$', definition: '单位货币可处理/生成的 token 数，需说明输入/输出与 SLO。', when: '量化、蒸馏、调度和供应方案的经济性对比。', abnormal: '上升但任务成功率下降是假优化；应配合 goodput 与单位有效任务成本。', log: 'cost, billable_tokens, valid_tokens, model_version' },
  { group: '可靠性', name: 'OOM', definition: 'Out Of Memory，显存/内存申请失败或被系统驱逐。', when: '长上下文、并发、KV 池、图像高分辨率与 batch 变更。', abnormal: '通常说明长度×并发联合尾部、碎片或 workspace 峰值未纳入容量模型。', log: 'allocated, reserved, kv_util, request_shape, kernel' },
  { group: '系统', name: 'utilization', definition: 'GPU/加速器计算或内存带宽利用率；不是业务效率本身。', when: '判断设备是否饥饿、受计算还是带宽限制。', abnormal: '高 utilization + 低 goodput 表示忙在无效/超时工作；低值可能是小 batch、排队或 CPU 瓶颈。', log: 'sm_util, memory_bw, power, batch_occupancy, queue' },
  { group: 'RAG', name: 'Recall@k', definition: '前 k 个召回结果中是否覆盖相关证据。', when: '定位检索上限；在 rerank/generation 前先测。', abnormal: '下降指向 embedding、chunk、索引新鲜度、query rewrite 或权限过滤。', log: 'query, doc_ids, rank, index_version, ACL' },
  { group: 'RAG', name: 'citation precision', definition: '引用中真正支持对应 claim 的比例。', when: '带引用问答、合规和可追溯场景。', abnormal: '低值可能来自相关但不支持的 chunk、span 绑定错位或生成过度推断。', log: 'claim_id, citation_span, entailment, chunk_id' },
  { group: 'Agent 循环', name: 'loop depth', definition: '一次任务从 observe 到 stop 经历的循环/状态迁移深度。', when: '长链任务、故障恢复、成本和终止策略评审。', abnormal: '长尾升高通常指向无效重试、证据冲突、终止判定失效或工具不稳定。', log: 'trace_id, state, step_index, retry, remaining_budget' },
  { group: 'Agent 循环', name: 'termination reason', definition: '任务停止的结构化原因，如 verified_success、budget_exhausted、policy_denied、escalated。', when: '判断任务是完成、降级、失败还是被安全阻断。', abnormal: 'unknown/模型自由文本比例高说明控制面不可观测，无法可靠归因。', log: 'trace_id, termination_reason, verifier, budget_snapshot, policy_rule' },
  { group: 'Agent 计划', name: 'replan rate', definition: '发生动态重规划的任务数 / 总任务数，或每任务平均 replan 次数。', when: '比较静态工作流与动态 Agent 的适应性和成本。', abnormal: '升高可能是目标不清、工具不稳、证据冲突或计划粒度错误。', log: 'plan_version, trigger, invalidated_nodes, preserved_side_effects' },
  { group: 'Agent 工具', name: 'tool call success', definition: '模型提议通过 schema 与 policy、进入执行器的比例。', when: '定位 proposal、schema、权限和参数层问题。', abnormal: '低值意味着契约不清、模型路由错误、ACL 拒绝或越权参数增多。', log: 'tool_name, schema_version, validation_error, policy_decision, args_hash' },
  { group: 'Agent 工具', name: 'tool execution success', definition: '进入执行器后获得明确业务结果的调用比例。', when: '区分“允许调用”与下游真实执行可靠性。', abnormal: '下降常由 timeout、限流、业务错误或结果绑定失败造成；timeout 可能状态未知。', log: 'call_id, idempotency_key, error_class, latency, result_checksum' },
  { group: 'Agent 工具', name: 'side-effect correctness', definition: '副作用在正确对象、正确参数、正确次数发生且可核验的比例。', when: '退款、审批、创建任务、发消息、删除等写操作上线闸门。', abnormal: '低于门槛应立即停写；常见根因是重复执行、越权资源、参数漂移或补偿失败。', log: 'actor, tenant, object_id, before_after, idempotency_key, confirmation_id' },
  { group: 'Agent 评估', name: 'verified success', definition: '由外部状态、证据或统一 rubric 验证通过的完成任务比例。', when: '任何端到端 Agent 成功率与上线决策。', abnormal: '与模型自报成功差距大，说明验证缺失、工具假成功或任务定义不清。', log: 'task_id, verifier_version, expected_state, observed_state, evidence_checksum' },
  { group: 'Agent 安全', name: 'injection ASR', definition: '攻击样本中成功绕过控制并达成攻击目标的比例。', when: '检索注入、工具越权、跨租户和诱导泄露红队评估。', abnormal: '上升需定位隔离、allowlist、参数验证、ACL、DLP 或确认门的具体缺口。', log: 'attack_class, payload_hash, blocking_control, policy_rule, outcome' },
  { group: 'Agent 安全', name: 'over-refusal', definition: '本应允许且可完成的正常任务被错误拒绝/升级的比例。', when: '安全策略改动、权限收紧与用户体验护栏。', abnormal: '升高说明策略过宽、ACL 标签错误或 DLP/分类器阈值过严。', log: 'task_slice, decision, rule_id, expected_allow, appeal_result' },
  { group: 'Agent 记忆', name: 'memory stale rate', definition: '被召回记忆中已过期、被新版本替代或事实失效的比例。', when: '长期个性化、偏好、事实与流程记忆治理。', abnormal: '升高说明 TTL、版本失效、索引同步或事实更新链路失效。', log: 'memory_id, type, version, valid_time, ttl, index_version' },
  { group: 'Agent 成本', name: 'cost per verified completion', definition: '模型、工具、重试、人审和补偿总成本 / verified completions。', when: '比较模型路由、缓存、并行度、终止和多 Agent 策略。', abnormal: '升高可能是验证率下降、循环加深、工具重试或人审增加；调用单价下降也可能反升。', log: 'task_id, model_cost, tool_cost, retry_cost, review_cost, verified' },
  { group: 'Agent 运营', name: 'human escalation rate', definition: '任务因权限、风险、不确定性或故障升级人工的比例。', when: '评估自治范围、运营容量和安全闸门摩擦。', abnormal: '过高表示自动化收益不足或策略过严；过低也可能是该升级的高风险任务未被识别。', log: 'task_slice, escalation_reason, risk_level, queue_time, human_outcome' },
  { group: '图像评估', name: 'FID', definition: '真实与生成图像特征分布的 Fréchet 距离，越低通常越近。', when: '集合级、同特征提取器和同数据协议下比较分布。', abnormal: '升高表示分布/质量偏移，但不能定位单图失败，也可能被样本量和预处理影响。', log: 'dataset_version, sample_count, extractor, resolution' },
  { group: '图像评估', name: 'CLIPScore', definition: '图像与文本表征的相似度近似。', when: '快速筛查 prompt adherence 与语义一致。', abnormal: '低值可能是漏主体/关系；高值仍可能构图差、文字错或通过关键词投机。', log: 'prompt, score, language, prompt_slice' },
  { group: '图像评估', name: 'LPIPS', definition: '基于深层特征的感知距离。', when: 'VAE 重建、编辑保真与候选多样性。', abnormal: '重建场景升高表示感知偏离；多样性场景过低可能是模式坍缩，方向需结合任务。', log: 'reference_id, pair_type, crop, resolution' },
  { group: '算法基础', name: 'Softmax / Entropy', definition: '把 logits 归一化为概率，并用熵描述分布锐度。', when: '采样、分类校准、教师软标签和路由诊断。', abnormal: '熵骤低可能过度自信或坍缩；骤高可能温度过大、信号变弱。', log: 'logit_max, temperature, max_prob, entropy' },
  { group: '算法基础', name: 'Cross-Entropy', definition: '正确标签在预测分布下的负对数似然。', when: '训练曲线、难例和数据切片诊断。', abnormal: 'CE 下降但成功率不涨，常见于目标错位、标签噪声或分布偏移。', log: 'loss_ce, label, p_target, task_slice' },
  { group: '算法基础', name: 'KL / Reverse-KL', definition: '有方向的分布差异，正向偏覆盖，反向偏寻峰。', when: '蒸馏、对齐、漂移与多样性权衡。', abnormal: '反向 KL 高权重可能 mode collapse；正向 KL 过强可能输出过平。', log: 'forward_kl, reverse_kl, mode_count, self_bleu' },
  { group: '算法基础', name: 'Gradient Norm', definition: '参数梯度向量的范数，用于判断更新规模。', when: '不收敛、震荡、NaN 与梯度爆炸排查。', abnormal: '骤增提示爆炸/异常 batch；长期接近 0 提示饱和或断梯度。', log: 'grad_norm, lr, loss_scale, first_bad_layer' },
  { group: '算法基础', name: '参数量 / MLP FLOPs', definition: '线性层参数与前向乘加的教学估算。', when: '宽度、层数、激活与部署成本评审。', abnormal: '参数不变但 FLOPs/延迟变化大，需检查序列长度、稀疏性与 kernel。', log: 'd_model, d_ff, layer_count, active_params, gemm_shape' },
  { group: 'MoE / 蒸馏', name: 'MoE Load Balance', definition: '各专家接收 token 的相对均衡程度。', when: 'Router 训练、吞吐、overflow 与专家专门化评审。', abnormal: '单专家负载尖峰通常是路由坍缩；过度均匀也可能损害专门化。', log: 'expert_load, load_balance_loss, top_k, overflow_count' },
  { group: 'MoE / 蒸馏', name: 'Routing Entropy', definition: 'Router 专家概率分布的熵。', when: '判断路由过尖、过平与坍缩。', abnormal: '接近 0 且负载集中提示坍缩；过高且质量差提示缺少专门化。', log: 'routing_entropy, router_logits, expert_id, token_slice' },
  { group: 'MoE / 蒸馏', name: 'Capacity Factor', definition: '专家容量相对平均负载的冗余系数。', when: '设置 expert buffer、跨卡通信与 drop 门槛。', abnormal: '过低导致 overflow/drop；过高造成 padding、显存和通信浪费。', log: 'capacity_factor, expert_capacity, overflow_count, all_to_all_ms' },
  { group: 'MoE / 蒸馏', name: 'KD Loss', definition: '硬标签 CE 与温度缩放软标签 KL 的混合。', when: '有教师分布与真实标签的知识蒸馏。', abnormal: 'KL/CE 数量级差过大提示 T²、α 或 reduction 配置错误。', log: 'loss_ce, loss_kl_t2, alpha, temperature, teacher_entropy' },
]

export default function Handbook({ go }: { go: (page: string, options?: Record<string, string>) => void }) {
  const [tab, setTab] = useState<'formula' | 'metric'>('metric')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('全部')
  const records = tab === 'formula' ? formulas : metrics
  const categories = useMemo(() => ['全部', ...Array.from(new Set(records.map((item) => item.group)))], [records])
  const filtered = useMemo(() => records.filter((item) => (category === '全部' || item.group === category) && JSON.stringify(item).toLowerCase().includes(query.toLowerCase())), [records, query, category])
  return <section className='handbook-page'>
    <div className='handbook-hero'><span>PRODUCTION REFERENCE</span><h1>公式手册 × 生产指标词典</h1><p>不是定义集：每一项都说明什么时候看、异常意味着什么，以及不能从它推出什么。</p><button type='button' className='handbook-video-entry' onClick={() => go('videos')}><Video aria-hidden='true' />打开视频参考库</button></div>
    <aside className='handbook-frontier'>
      <header><Compass aria-hidden='true' /><span>前沿探索</span></header>
      <h2>自进化与世界模型：先做决策，再理解算法</h2>
      <p>把"AI 自己评分"和"内部世界模型"放在一起，是因为它们共享同一个门槛：evaluator 是否可信、动力学是否可预测。看似不同的方向，其实都在追问同一个问题——什么场景可以让模型自主迭代，什么场景必须停手。手册暂不给公式与指标，先在两条前沿路线里做一次真实决策，再回来判断需要补哪一格。</p>
      <div>
        <button type='button' onClick={() => go('strategy-case', { case: 'evaluator-trust' })}>进入 Self-Evolving 案例<ArrowRight aria-hidden='true' /></button>
        <button type='button' onClick={() => go('strategy-case', { case: 'simulator-vs-reality' })}>进入 World Model 案例<ArrowRight aria-hidden='true' /></button>
      </div>
    </aside>
    <div className='handbook-tools'><div><button className={tab === 'formula' ? 'active' : ''} onClick={() => { setTab('formula'); setCategory('全部') }}><Sigma />公式手册</button><button className={tab === 'metric' ? 'active' : ''} onClick={() => { setTab('metric'); setCategory('全部') }}><BarChart3 />生产指标</button></div><select aria-label='按分类筛选' value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select><label><Search /><input placeholder='搜索 Softmax、KL、routing entropy、TTFT…' value={query} onChange={(e) => setQuery(e.target.value)} /></label></div>
    <div className='handbook-count'>{filtered.length} ITEMS · 所有公式与指标均需结合具体实现、数据分布与业务 SLO</div>
    {tab === 'formula' ? <div className='formula-catalog'>{(filtered as typeof formulas).map((item) => <article key={item.name}><header><span>{item.group}</span><Calculator /></header><h2>{item.name}</h2><code>{item.formula}</code><dl><div><dt>变量</dt><dd>{item.variables}</dd></div><div><dt>何时使用</dt><dd>{item.use}</dd></div><div className='boundary'><dt>边界</dt><dd>{item.boundary}</dd></div></dl></article>)}</div> : <div className='metric-catalog'>{(filtered as typeof metrics).map((item) => <article key={item.name}><div className='metric-name'><span>{item.group}</span><h2>{item.name}</h2></div><p>{item.definition}</p><div><b><BookOpen />产品何时看</b><span>{item.when}</span></div><div className='abnormal'><b><AlertTriangle />异常说明</b><span>{item.abnormal}</span></div><code>{item.log}</code></article>)}</div>}
    {!filtered.length && <div className='no-result'>没有匹配项，请尝试更短的关键词。</div>}
  </section>
}
