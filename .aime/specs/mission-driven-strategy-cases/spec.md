# mission-driven-strategy-cases Specification

## Purpose
TBD - created by archiving change mission-driven-learning. Update Purpose after archive.
## Requirements
### Requirement: 可选且可校验的 Mission schema
系统 SHALL 为 `StrategyCaseSpec` 提供可选 `mission` 元数据，至少表达角色、一句话目标、2–3 个引用现有指标的可计算门槛、一个或多个确定性压力测试 preset，以及来自 4–6 维受控词表的能力标签；每个门槛 MUST 声明指标 ID、比较符、目标值和失败时建议返回的 control ID，每个 preset MUST 只使用该案例已有 control ID 与合法取值。mission 校验 MUST 拒绝重复 ID、未知指标/控件、非法比较符、越界 preset 和词表外能力标签，并返回可定位字段的错误；`mission` 缺失时 MUST 保持旧案例的原渲染、计算、摘要和存储行为。

#### Scenario: 合法 mission 通过 schema 校验
- **WHEN** 一个 Strategy Case 配置角色、目标、2–3 个合法门槛、合法确定性 preset 和受控能力标签
- **THEN** `defineStrategyCase` 的 mission 校验通过
- **AND** 通用 runner 可直接消费该配置而无需按案例 ID 分支

#### Scenario: 非法门槛或 preset 被拒绝
- **WHEN** mission 引用不存在的 metric/control、使用非法比较符、配置少于 2 或多于 3 个门槛，或 preset 值不符合 control schema
- **THEN** schema 校验失败
- **AND** 错误信息包含案例 ID、mission 字段路径和失败原因

#### Scenario: 旧案例没有 mission
- **WHEN** runner 打开未声明 `mission` 的既有 Strategy Case
- **THEN** 系统按变更前顺序展示预测、控件、机制、证据、摘要与资源闭环
- **AND** 不渲染空 MissionBrief、影子策略、压力测试或复盘卡占位

### Requirement: 任务简报与实时目标状态
对带 mission 的案例，系统 SHALL 在案例顶部显示 MissionBrief/Status，包含角色、一句话任务、2–3 个目标门槛、有限预算/约束的当前状态及“达标/未达标”总状态；状态 MUST 由当前 `compute` 结果和门槛纯函数即时推导。任务简报和未执行阶段的状态 MUST NOT 暴露推荐 control 组合、压力 preset 覆盖值或所谓正确答案。

#### Scenario: 初次进入 mission 案例
- **WHEN** 学习者打开一个带 mission 的案例且尚未调整策略
- **THEN** 顶部显示角色、任务、门槛和默认策略的预算/目标状态
- **AND** 页面不显示能够直接复制的推荐参数或隐藏压力条件

#### Scenario: 调整旋钮后状态更新
- **WHEN** 学习者改变任一 control 且计算指标跨越门槛
- **THEN** 对应门槛和任务总状态立即按同一纯函数更新
- **AND** 达标信息同时使用文本或图标表达而非只改变颜色

### Requirement: 通用任务状态流
所有带 mission 的 Strategy Case SHALL 复用同一状态流：`待预测 → 预测已锁定 → 策略调整/比较 → 压力测试 → 已形成策略/复盘`；系统 MUST 根据可见行为推进状态，不得因仅打开页面、仅调整 control 或仅查看资源而宣称完成任务。未带 mission 的案例 MUST NOT 被强制进入该状态流。

#### Scenario: 未预测时探索
- **WHEN** 学习者尚未保存预测但调整 controls
- **THEN** 系统可以继续提供即时因果反馈
- **AND** 明确提示先下注才能形成完整任务证据，不伪造锁定预测

#### Scenario: 形成可复盘任务
- **WHEN** 学习者已锁定预测、运行至少一次压力测试并点击“形成策略摘要”
- **THEN** 系统进入可生成复盘卡的状态
- **AND** 仅调整 controls 不会被记为“已形成策略”或“已通过压力测试”

### Requirement: 影子策略与单个自定义快照
系统 SHALL 使用相同 `compute` 函数并排比较 spec 默认基线与当前策略的指标 delta，并 SHALL 允许每个案例保存恰好一个自定义策略快照用于 A/B 比较；再次保存 MUST 明确替换该快照。比较结果 MUST 对每项关键指标给出基线值、对比值、带正负方向的 delta 和自然语言含义，并 MUST NOT 使用 Recharts 或其他图表库。

#### Scenario: 默认基线对比当前策略
- **WHEN** 学习者调整任一 control
- **THEN** 系统以 `spec.defaults` 重新计算默认基线并与当前结果比较
- **AND** 每个 delta 同时显示数值方向和“改善/恶化/不变或需结合门槛判断”的文本解释

#### Scenario: 保存并替换自定义快照
- **WHEN** 学习者保存当前策略为快照，之后改变 controls 并再次保存
- **THEN** 系统最多保留当前案例一个自定义快照
- **AND** 第二次保存明确替换第一次快照且 A/B 比较立即使用新快照

#### Scenario: 指标缺失时安全降级
- **WHEN** 基线、快照或当前结果中缺少被比较的指标，或值不是有限数
- **THEN** 系统将该项标记为“无法比较”并提供文字原因
- **AND** 其他合法指标仍可比较且页面不崩溃

### Requirement: 确定性压力测试
系统 SHALL 仅使用当前案例 mission 中声明的 preset 与现有纯计算函数执行压力测试，不使用随机数、网络请求、真实模型或真实服务。结果 MUST 展示总通过/失败、每个门槛的当前值与目标、失败原因，以及 spec 声明的应返回调整的旋钮；重复输入 MUST 产生完全一致的结果。

#### Scenario: 重复运行同一压力 preset
- **WHEN** 学习者以相同当前策略连续运行同一 preset
- **THEN** 两次使用相同 controls 覆盖规则和门槛计算
- **AND** 指标、通过状态、失败原因与旋钮建议完全一致

#### Scenario: 压力测试失败
- **WHEN** preset 计算结果未满足一个或多个门槛
- **THEN** 系统显示“未通过”及每个失败门槛的当前值、比较关系与目标值
- **AND** 为每个失败项提供可聚焦或可定位的 control 名称，而不是直接给出推荐取值

#### Scenario: 压力测试通过
- **WHEN** preset 结果满足全部门槛
- **THEN** 系统显示“通过”及逐项文本证据
- **AND** 通过仅被记录为该 preset 的可见行为证据，不被表述为真实服务验证

### Requirement: 完成后的可复制复盘卡
系统 SHALL 仅在学习者形成策略摘要后生成复盘卡；复盘卡 MUST 聚合锁定预测、最终 control 策略、默认基线到最终策略的关键 delta、最近压力测试结果与一个迁移问题，并 SHALL 支持复制为可读纯文本。系统 MUST NOT 为复制或分享新增后端。

#### Scenario: 摘要形成前
- **WHEN** 学习者尚未点击“形成策略摘要”
- **THEN** 系统不把当前临时 controls 生成或保存为完成态复盘卡
- **AND** 明确说明还缺少的可见步骤

#### Scenario: 生成并复制完整复盘卡
- **WHEN** 学习者已锁定预测、运行压力测试并形成策略摘要
- **THEN** 复盘卡展示预测、最终策略、关键 delta、压力结果和迁移问题
- **AND** 点击复制时写入相同语义的纯文本，Clipboard API 不可用时提供可选中文本的降级路径

#### Scenario: 部分证据缺失
- **WHEN** 学习者形成摘要但没有预测或尚未运行压力测试
- **THEN** 复盘卡对缺失项明确标注“未记录”或“未执行”
- **AND** 不推测结果、不把缺失项显示为通过

### Requirement: 能力证据覆盖矩阵
系统 SHALL 在现有首页或进度页展示 4–6 个受控能力维度的轻量矩阵，并仅从已保存的“已形成策略”和“压力测试通过”两类可见行为推导证据覆盖。矩阵 MUST 显示证据类型、来源案例和待补证据，不提供综合分、排名、等级、连续签到或徽章，并 MUST 明确声明“证据覆盖不等于能力认证”。

#### Scenario: 没有任务证据
- **WHEN** 本机没有已形成策略或通过压力测试的记录
- **THEN** 每个能力维度显示待补证据及可执行的下一步
- **AND** 系统不显示零分、失败等级或能力不足结论

#### Scenario: 形成策略但未通过压力测试
- **WHEN** 某案例已保存策略摘要且其 mission 标注某能力，但没有通过压力测试
- **THEN** 对应维度仅显示“策略形成”证据与来源案例
- **AND** 压力验证证据仍标为待补

#### Scenario: 形成策略且通过压力测试
- **WHEN** 某案例同时存在已形成策略记录和确定性压力测试通过记录
- **THEN** 对应能力维度展示两类证据及可返回的案例来源
- **AND** 文案仍保持“证据覆盖”而非认证、分数或保证

### Requirement: 两个完整示范案例
首期 SHALL 仅为既有 `context-window-budget` 与 `rag-chunking` 补齐端到端 mission 配置；两个案例 MUST 各有角色、目标、2–3 个基于既有 `compute` 指标的门槛、至少一个合法确定性压力 preset、失败旋钮映射、迁移问题和能力标签。其余案例不要求在本期补内容，但通用组件 MUST 能在未来仅增加 spec 元数据后启用任务模式。

#### Scenario: 上下文预算示范
- **WHEN** 打开 `case=context-window-budget`
- **THEN** 任务围绕有限窗口预算、任务保留、截断/指令风险与代价展示完整任务循环
- **AND** 压力结果只来自固定任务回放与 `calculateContextWindow`

#### Scenario: RAG 切块示范
- **WHEN** 打开 `case=rag-chunking`
- **THEN** 任务围绕证据覆盖、噪声、上下文 token 与延迟展示完整任务循环
- **AND** 压力结果只来自固定 query/文档、preset 与 `calculateRagChunking`

#### Scenario: 其他 Strategy Case 保持兼容
- **WHEN** 打开任一未配置 mission 的 Strategy Case
- **THEN** 原预测、调参、机制、证据、摘要、资源和导航流程继续可用
- **AND** 无须伪造 mission 元数据或复制案例专用 UI

### Requirement: 任务交互可访问且响应式
MissionBrief、状态、预测锁定/重开、快照、delta、压力测试、复盘卡与能力矩阵 MUST 可通过键盘操作，具有可见焦点和语义化名称；动态播报 SHALL 仅对保存、重开、压力测试完成和复制结果等明确提交事件使用克制的 `aria-live="polite"`，不得在每次滑块输入时连续播报整页。颜色 MUST NOT 是达标、delta 或测试结果的唯一反馈，布局 MUST 在移动端无水平溢出，动效 MUST 尊重 `prefers-reduced-motion`。

#### Scenario: 键盘完成任务关键路径
- **WHEN** 键盘用户保存预测、调整 controls、保存/替换快照、运行压力测试、形成并复制复盘卡
- **THEN** 所有操作均可完成且焦点顺序与视觉顺序一致
- **AND** 确认或结果出现后焦点/状态提示可被感知

#### Scenario: 避免过度播报
- **WHEN** 学习者连续操作 range 或 choice controls
- **THEN** 页面更新可见状态但不逐次向 live region 播报全部指标
- **AND** 仅在显式保存或测试完成后播报简短结果

#### Scenario: 移动端与减少动态效果
- **WHEN** 在窄视口或 `prefers-reduced-motion: reduce` 下使用任务模式
- **THEN** 比较、压力结果和能力矩阵重排为可读且无横向溢出的布局
- **AND** 状态理解不依赖位移动画、颜色或 hover

