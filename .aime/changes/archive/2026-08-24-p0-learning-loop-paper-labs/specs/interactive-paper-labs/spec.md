## ADDED Requirements

### Requirement: 论文复现实验室路由
系统 SHALL 提供 `page=paper-lab&paper=<paperId>` 深链，并 SHALL 对未知论文 ID 安全回退到默认可用实验。

#### Scenario: 从论文卡片进入实验
- **WHEN** 学习者点击一篇已配置实验的论文卡片上的“交互复现”
- **THEN** 系统打开与该论文 ID 对应的实验页面
- **AND** 页面显示论文目标、可调变量、实时结果和学习结论

#### Scenario: 未配置实验的论文
- **WHEN** 论文没有对应的交互实验
- **THEN** 论文卡片不显示误导性的实验入口

### Requirement: Transformer 注意力实验
系统 SHALL 使用固定 token、embedding 与权重矩阵计算缩放点积注意力，并允许学习者调整缩放、因果遮罩和查询位置。

#### Scenario: 开启因果遮罩
- **WHEN** 学习者开启 causal mask
- **THEN** 当前查询位置对未来 token 的注意力权重为零
- **AND** 每行可见注意力权重之和为一

### Requirement: Wide & Deep 推荐实验
系统 SHALL 使用固定样本与参数拆解 wide 记忆分支、deep 泛化分支和联合分数，并按热门、冷启动与长尾切片展示结果。

#### Scenario: 比较推荐分支
- **WHEN** 学习者切换 wide-only、deep-only 和 wide+deep
- **THEN** 系统展示各分支对典型样本的贡献与切片指标
- **AND** 输出概率始终位于零到一之间

### Requirement: DDPM 去噪实验
系统 SHALL 使用固定种子模拟前向加噪、信噪比和教学版反向去噪，并允许调整步数、噪声日程和预测误差。

#### Scenario: 调整去噪条件
- **WHEN** 学习者调整时间步或预测误差
- **THEN** 系统实时展示带噪样本、重建误差和信噪比变化
- **AND** 同一输入与种子始终产生相同输出

### Requirement: ReAct 轨迹实验
系统 SHALL 在固定环境中比较 Direct、CoT-only 与 ReAct 的行动轨迹，并允许注入观察冲突、工具限制和预算上限。

#### Scenario: 观察发生冲突
- **WHEN** ReAct 模式收到冲突观察且仍有预算
- **THEN** 轨迹进入核验分支
- **AND** 页面解释工具、参数、顺序或停止条件中的失败位置

### Requirement: DreamerV3 世界模型实验
系统 SHALL 使用固定小型环境展示真实交互与想象 rollout 的回报估计，并允许调整模型准确率和想象长度。

#### Scenario: 增加想象长度
- **WHEN** 模型准确率低于一且学习者增加想象长度
- **THEN** 系统展示误差累积与回报偏差的变化
- **AND** 给出需要回到真实环境验证的边界提示

### Requirement: 可访问性与响应式
系统 SHALL 支持键盘操作、语义化表单标签和移动端单列布局，且不得引入新的第三方运行时依赖。

#### Scenario: 移动端访问实验
- **WHEN** 页面宽度不足以展示多列布局
- **THEN** 控件、图表和结果卡片切换为不溢出的单列布局
